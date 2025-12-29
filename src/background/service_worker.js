/**
 * service_worker.js - Background Service Worker
 * 
 * المسؤوليات الرئيسية:
 * 1. إدارة جلسات الترجمة والالتقاط
 * 2. إنشاء وإدارة Offscreen Document لمعالجة الصوت
 * 3. التنسيق بين Content Scripts و Workers
 * 4. إدارة الإعدادات والخصوصية
 * 5. التعامل مع DRM وتنبيهات المحتوى المحمي
 */

const PROXY_WS_URL = 'wss://api.yourproxy.com/v1/stt-streaming';

// إعدادات افتراضية
const DEFAULT_CONFIG = {
  targetLang: 'ar',
  sourceLang: 'auto',
  engine: 'google',
  subtitleMode: 'translated',
  subtitleSize: 'medium',
  subtitlePosition: 'bottom',
  vadEnabled: true,
  chunkSize: 8000,
  overlapSize: 500,
  privacyMode: 'balanced',
  autoDeleteTranscripts: true,
  telemetryEnabled: false
};

// إدارة الجلسات
const sessions = new Map();
const activeStreams = new Map();

// حالة المعالجة
let offscreenReady = false;
let offscreenReadyWaiters = [];
let isProcessing = false;
let activeTabId = null;

// =============================================================================
// دوال مساعدة للأحداث والانتظار
// =============================================================================

function markOffscreenReady() {
  offscreenReady = true;
  for (const resolve of offscreenReadyWaiters) resolve();
  offscreenReadyWaiters = [];
}

function waitForOffscreenReady(timeoutMs = 5000) {
  if (offscreenReady) return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(), timeoutMs);
    offscreenReadyWaiters.push(() => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function setProcessingState() {
  isProcessing = sessions.size > 0;
  activeTabId = isProcessing ? [...sessions.keys()][sessions.size - 1] : null;
  
  // تحديث أيقونة الإضافة
  chrome.action.setBadgeText({
    text: isProcessing ? 'ON' : '',
    tabId: activeTabId
  });
  
  chrome.action.setBadgeBackgroundColor({
    color: '#4CAF50',
    tabId: activeTabId
  });
}

// =============================================================================
// دوال إدارة التخزين
// =============================================================================

async function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, (result) => resolve(result || {}));
  });
}

async function storageSet(data) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(data, () => resolve());
  });
}

async function getSettings() {
  const stored = await storageGet(Object.keys(DEFAULT_CONFIG));
  return { ...DEFAULT_CONFIG, ...stored };
}

// =============================================================================
// دوال إدارة التبويبات
// =============================================================================

async function tabsDetectLanguage(tabId) {
  return new Promise((resolve) => {
    if (!chrome.tabs?.detectLanguage) return resolve(null);
    chrome.tabs.detectLanguage(tabId, (lang) => {
      if (chrome.runtime.lastError) return resolve(null);
      resolve(lang || null);
    });
  });
}

async function tabCaptureGetMediaStreamId(tabId) {
  return new Promise((resolve) => {
    if (!chrome.tabCapture?.getMediaStreamId) return resolve(null);
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
      if (chrome.runtime.lastError) return resolve(null);
      resolve(streamId || null);
    });
  });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// =============================================================================
// دوال Offscreen Document
// =============================================================================

async function hasOffscreenDocument() {
  if (!chrome.offscreen?.hasDocument) return false;
  try {
    return await chrome.offscreen.hasDocument();
  } catch {
    return false;
  }
}

async function ensureOffscreenDocument() {
  if (!chrome.offscreen?.createDocument) {
    console.warn('Offscreen Documents غير مدعوم في هذا المتصفح');
    return false;
  }

  const exists = await hasOffscreenDocument();
  if (!exists) {
    offscreenReady = false;
    try {
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('src/offscreen/offscreen.html'),
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Process tab audio for real-time speech-to-text streaming'
      });
    } catch (error) {
      console.error('فشل في إنشاء Offscreen Document:', error);
      return false;
    }
  }

  // انتظار جاهزية Offscreen
  try {
    await chrome.runtime.sendMessage({ action: 'OFFSCREEN_PING' });
    await waitForOffscreenReady();
  } catch {
    // تجاهل الأخطاء
  }
  
  return true;
}

async function closeOffscreenDocumentIfIdle() {
  if (!chrome.offscreen?.closeDocument) return;
  if (sessions.size > 0) return;

  try {
    const exists = await hasOffscreenDocument();
    if (exists) {
      await chrome.offscreen.closeDocument();
      offscreenReady = false;
    }
  } catch {
    // تجاهل الأخطاء
  }
}

// =============================================================================
// دوال إرسال الرسائل
// =============================================================================

function sendToTabFrame(tabId, frameId, payload) {
  const options = typeof frameId === 'number' ? { frameId } : undefined;
  chrome.tabs
    .sendMessage(tabId, payload, options)
    .catch(() => {
      // تجاهل أخطاء الإرسال
    });
}

function notifyTabStatus(tabId, translating, frameId) {
  sendToTabFrame(tabId, frameId, {
    action: 'TRANSLATION_STATUS_CHANGED',
    isTranslating: translating,
    tabId
  });
}

async function buildConfigForTab(tabId, hints = null) {
  const settings = await getSettings();
  const pageLang = await tabsDetectLanguage(tabId);

  return {
    targetLang: settings.targetLang || 'ar',
    sourceLang: settings.sourceLang || 'auto',
    engine: settings.engine || 'google',
    subtitleMode: settings.subtitleMode || 'translated',
    subtitleSize: settings.subtitleSize || 'medium',
    subtitlePosition: settings.subtitlePosition || 'bottom',
    vadEnabled: settings.vadEnabled,
    chunkSize: settings.chunkSize,
    overlapSize: settings.overlapSize,
    privacyMode: settings.privacyMode,
    pageLang,
    hints: hints || null,
    proxyWsUrl: PROXY_WS_URL,
    isDRMProtected: false // سيتم تحديده لاحقاً
  };
}

// =============================================================================
// التحقق من DRM والمحتوى المحمي
// =============================================================================

async function checkDRMProtection(tabId) {
  // التحقق مما إذا كان المحتوى محمياً بـ DRM
  // ملاحظة: لا نحاول أبداً تجاوز DRM - هذا للسلامة القانونية فقط
  try {
    const tab = await chrome.tabs.get(tabId);
    const url = new URL(tab.url);
    
    // قائمة بالمواقع المعروفة بتطبيق DRM
    const drmDomains = [
      'netflix.com',
      'hbo.com',
      'hulu.com',
      'disneyplus.com',
      'amazon.com/video',
      'spotify.com',
      'apple.com/tv',
      'vimeo.com',
      'primevideo.com'
    ];
    
    return drmDomains.some(domain => url.hostname.includes(domain));
  } catch {
    return false;
  }
}

// =============================================================================
// إدارة الجلسات
// =============================================================================

async function handleStartTranslation(tabId, hints, frameId) {
  if (!tabId) {
    console.error('معرف التبويب غير صالح');
    return { success: false, error: 'معرف التبويب غير صالح' };
  }

  // التحقق من DRM
  const isDRMProtected = await checkDRMProtection(tabId);
  if (isDRMProtected) {
    notifyTabStatus(tabId, false, frameId);
    sendToTabFrame(tabId, frameId, {
      action: 'TRANSLATION_ERROR',
      error: 'VIDEO_DRM_PROTECTED',
      message: 'هذا الفيديو محمي بتقنية DRM ولا يمكن التقاط صوته. يرجى استخدام مصادر غير محمية أو طلب الوصول الرسمي.',
      canRetry: false
    });
    return { success: false, error: 'DRM_PROTECTED' };
  }

  // إنشاء Offscreen Document
  const offscreenReady = await ensureOffscreenDocument();
  if (!offscreenReady) {
    notifyTabStatus(tabId, false, frameId);
    sendToTabFrame(tabId, frameId, {
      action: 'TRANSLATION_ERROR',
      error: 'OFFSCREEN_CREATION_FAILED',
      message: 'فشل في إنشاء بيئة معالجة الصوت. يرجى إعادة تحميل الصفحة.',
      canRetry: true
    });
    return { success: false, error: 'OFFSCREEN_FAILED' };
  }

  // الحصول على stream ID
  const streamId = await tabCaptureGetMediaStreamId(tabId);
  if (!streamId) {
    notifyTabStatus(tabId, false, frameId);
    sendToTabFrame(tabId, frameId, {
      action: 'TRANSLATION_ERROR',
      error: 'CAPTURE_FAILED',
      message: 'فشل في التقاط صوت الفيديو. تأكد من منح الإذن للوصول إلى صوت التبويب.',
      canRetry: true,
      userActionRequired: true
    });
    return { success: false, error: 'CAPTURE_FAILED' };
  }

  // بناء الإعدادات
  const settings = await buildConfigForTab(tabId, hints);

  // إنشاء الجلسة
  const session = {
    tabId,
    frameId,
    startedAt: Date.now(),
    settings,
    status: 'capturing'
  };
  
  sessions.set(tabId, session);
  setProcessingState();

  // بدء المعالجة في Offscreen
  try {
    chrome.runtime.sendMessage({
      action: 'OFFSCREEN_START',
      tabId,
      streamId,
      settings
    });
  } catch (error) {
    console.error('خطأ في إرسال رسالة البدء:', error);
  }

  notifyTabStatus(tabId, true, frameId);
  
  // إرسال حالة البدء إلى التبويب
  sendToTabFrame(tabId, frameId, {
    action: 'TRANSLATION_STARTED',
    sessionId: tabId,
    settings
  });

  return { success: true, sessionId: tabId };
}

async function handleStopTranslation(tabId) {
  const resolvedTabId = tabId || activeTabId;
  if (!resolvedTabId) return { success: false, error: 'NO_ACTIVE_SESSION' };

  const session = sessions.get(resolvedTabId);
  const frameId = session?.frameId;

  sessions.delete(resolvedTabId);
  setProcessingState();

  // إيقاف المعالجة في Offscreen
  try {
    chrome.runtime.sendMessage({
      action: 'OFFSCREEN_STOP',
      tabId: resolvedTabId
    });
  } catch {
    // تجاهل الأخطاء
  }

  notifyTabStatus(resolvedTabId, false, frameId);
  
  sendToTabFrame(resolvedTabId, frameId, {
    action: 'TRANSLATION_STOPPED',
    sessionId: resolvedTabId
  });

  await closeOffscreenDocumentIfIdle();
  
  return { success: true };
}

// =============================================================================
// تصدير واستيراد الترجمات
// =============================================================================

async function handleExportSession(tabId, format = 'srt') {
  const session = sessions.get(tabId);
  if (!session) {
    return { success: false, error: 'SESSION_NOT_FOUND' };
  }

  // إرسال طلب التصدير إلى Offscreen
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'OFFSCREEN_EXPORT',
      tabId,
      format
    });
    return response;
  } catch {
    return { success: false, error: 'EXPORT_FAILED' };
  }
}

// =============================================================================
// لوحة الأوامر (Commands)
// =============================================================================

chrome.commands.onCommand.addListener(async (command) => {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  switch (command) {
    case 'toggle-translation':
      chrome.runtime.sendMessage({ action: 'TOGGLE_TRANSLATION', tabId: tab.id });
      break;
    case 'toggle-subtitles':
      chrome.runtime.sendMessage({ action: 'TOGGLE_SUBTITLES', tabId: tab.id });
      break;
    case 'change-language':
      chrome.runtime.sendMessage({ action: 'CYCLE_LANGUAGE', tabId: tab.id });
      break;
  }
});

// =============================================================================
// قائمة السياق (Context Menu)
// =============================================================================

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translate-video',
    title: 'ترجمة هذا الفيديو',
    contexts: ['video']
  });

  chrome.contextMenus.create({
    id: 'export-subtitles',
    title: 'تصدير الترجمات',
    contexts: ['video']
  });

  chrome.contextMenus.create({
    id: 'extension-options',
    title: 'إعدادات الإضافة',
    contexts: ['action']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  switch (info.menuItemId) {
    case 'translate-video':
      chrome.runtime.sendMessage({ action: 'START_TRANSLATION', tabId: tab.id });
      break;
    case 'export-subtitles':
      chrome.runtime.sendMessage({ action: 'EXPORT_SUBTITLES', tabId: tab.id });
      break;
    case 'extension-options':
      chrome.runtime.openOptionsPage();
      break;
  }
});

// =============================================================================
// الاستماع للرسائل
// =============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message?.action) return;

  // معالجة رسائل_OFFSCREEN
  if (message.action === 'OFFSCREEN_READY') {
    markOffscreenReady();
    return;
  }

  if (message.action === 'OFFSCREEN_SUBTITLE') {
    const session = sessions.get(message.tabId);
    const frameId = session?.frameId;

    sendToTabFrame(message.tabId, frameId, {
      action: 'NEW_SUBTITLE',
      text: message.translatedText,
      isFinal: message.isFinal,
      originalText: message.originalText,
      detectedLang: message.detectedLang,
      confidence: message.confidence,
      timestamp: message.timestamp
    });
    return;
  }

  if (message.action === 'OFFSCREEN_ERROR') {
    const session = sessions.get(message.tabId);
    const frameId = session?.frameId;

    sendToTabFrame(message.tabId, frameId, {
      action: 'TRANSLATION_ERROR',
      error: message.error,
      message: message.message,
      canRetry: message.canRetry || false,
      userActionRequired: message.userActionRequired || false
    });
    return;
  }

  if (message.action === 'OFFSCREEN_SESSION_ENDED') {
    const session = sessions.get(message.tabId);
    const frameId = session?.frameId;

    sessions.delete(message.tabId);
    setProcessingState();

    sendToTabFrame(message.tabId, frameId, {
      action: 'TRANSLATION_ENDED',
      reason: message.reason
    });

    closeOffscreenDocumentIfIdle();
    return;
  }

  // استعلامات الحالة
  if (message.action === 'GET_TRANSLATION_STATUS') {
    const tabId = message.tabId ?? sender?.tab?.id;
    const session = tabId ? sessions.get(tabId) : null;
    sendResponse({
      isTranslating: !!session,
      activeTabId,
      sessionData: session ? {
        startedAt: session.startedAt,
        status: session.status
      } : null
    });
    return true;
  }

  // طلب الحصول على الإعدادات
  if (message.action === 'GET_SETTINGS') {
    getSettings().then(settings => {
      sendResponse({ settings });
    });
    return true;
  }

  // تحديث الإعدادات
  if (message.action === 'UPDATE_SETTINGS') {
    storageSet(message.settings).then(() => {
      // إرسال التحديث إلى جميع المكونات النشطة
      chrome.runtime.sendMessage({
        action: 'SETTINGS_UPDATED',
        settings: message.settings
      });
      sendResponse({ success: true });
    });
    return true;
  }

  // طلبات البدء/الإيقاف
  if (message.action === 'START_TRANSLATION') {
    const tabId = message.tabId ?? sender?.tab?.id;
    const frameId = message.frameId ?? sender?.frameId;
    
    handleStartTranslation(tabId, message.hints, frameId).then(result => {
      sendResponse(result);
    });
    return true;
  }

  if (message.action === 'STOP_TRANSLATION') {
    const tabId = message.tabId ?? sender?.tab?.id;
    
    handleStopTranslation(tabId).then(result => {
      sendResponse(result);
    });
    return true;
  }

  // طلب التصدير
  if (message.action === 'EXPORT_SESSION') {
    const tabId = message.tabId ?? sender?.tab?.id;
    
    handleExportSession(tabId, message.format).then(result => {
      sendResponse(result);
    });
    return true;
  }
});

// =============================================================================
// أحداث التبويبات
// =============================================================================

chrome.tabs.onRemoved.addListener((tabId) => {
  if (sessions.has(tabId)) {
    handleStopTranslation(tabId);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!sessions.has(tabId)) return;
  if (changeInfo.status === 'loading') {
    handleStopTranslation(tabId);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  // تحديث حالة الأيقونة عند تنشيط تبويب مختلف
  if (sessions.has(activeInfo.tabId)) {
    chrome.action.setBadgeText({
      text: 'ON',
      tabId: activeInfo.tabId
    });
  }
});

// =============================================================================
// تهيئة الخدمة
// =============================================================================

async function initialize() {
  console.log('Video Translate AI - Service Worker Started');
  
  // تحميل الإعدادات
  const settings = await getSettings();
  console.log('الإعدادات المحملة:', settings);
  
  // التحقق من دعم Offscreen
  if (!chrome.offscreen) {
    console.warn('Offscreen Documents غير مدعوم - سيتم استخدام fallback');
  }
}

// بدء التهيئة
initialize();
