/* global chrome */

/**
 * background.js - Service Worker
 * المسؤوليات: إدارة الجلسات، إنشاء Offscreen Document لمعالجة الصوت، التواصل مع Proxy، وتمرير النتائج إلى Content Script.
 */

const PROXY_WS_URL = 'wss://api.yourproxy.com/v1/stt-streaming';

// متغيرات متوافقة مع ملفات التحقق/الاختبارات القديمة
let socket = null;
let audioContext = null;
let mediaStreamSource = null;
let processor = null;
let activeTabId = null;
let isProcessing = false;

const sessions = new Map(); // tabId -> { startedAt: number, frameId?: number }
let offscreenReady = false;
let offscreenReadyWaiters = [];

function markOffscreenReady() {
  offscreenReady = true;
  for (const resolve of offscreenReadyWaiters) resolve();
  offscreenReadyWaiters = [];
}

function waitForOffscreenReady(timeoutMs = 2000) {
  if (offscreenReady) return Promise.resolve();
  return new Promise((resolve) => {
    offscreenReadyWaiters.push(resolve);
    setTimeout(resolve, timeoutMs);
  });
}

function setProcessingState() {
  isProcessing = sessions.size > 0;
  activeTabId = isProcessing ? [...sessions.keys()][sessions.size - 1] : null;
}

function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, (result) => resolve(result || {}));
  });
}

function tabsDetectLanguage(tabId) {
  return new Promise((resolve) => {
    if (!chrome.tabs?.detectLanguage) return resolve(null);
    chrome.tabs.detectLanguage(tabId, (lang) => {
      if (chrome.runtime.lastError) return resolve(null);
      resolve(lang || null);
    });
  });
}

function tabCaptureGetMediaStreamId(tabId) {
  return new Promise((resolve) => {
    if (!chrome.tabCapture?.getMediaStreamId) return resolve(null);
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
      if (chrome.runtime.lastError) return resolve(null);
      resolve(streamId || null);
    });
  });
}

async function hasOffscreenDocument() {
  if (!chrome.offscreen?.hasDocument) return false;
  try {
    return await chrome.offscreen.hasDocument();
  } catch (_) {
    return false;
  }
}

async function ensureOffscreenDocument() {
  if (!chrome.offscreen?.createDocument) return;

  const exists = await hasOffscreenDocument();
  if (!exists) {
    offscreenReady = false;
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen.html'),
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Process tab audio for real-time speech-to-text streaming'
    });
  }

  chrome.runtime.sendMessage({ action: 'OFFSCREEN_PING' });
  await waitForOffscreenReady();
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
  } catch (_) {
    // ignore
  }
}

function sendToTabFrame(tabId, frameId, payload) {
  const options = typeof frameId === 'number' ? { frameId } : undefined;
  chrome.tabs
    .sendMessage(tabId, payload, options)
    .catch(() => {
      // ignore
    });
}

function notifyTabStatus(tabId, translating, frameId) {
  sendToTabFrame(tabId, frameId, {
    action: 'TRANSLATION_STATUS_CHANGED',
    isTranslating: translating
  });
}

async function buildConfigForTab(tabId, hints) {
  const settings = await storageGet([
    'targetLang',
    'sourceLang',
    'engine',
    'subtitleMode',
    'subtitleSize',
    'subtitlePosition'
  ]);

  const pageLang = await tabsDetectLanguage(tabId);

  return {
    targetLang: settings.targetLang || 'ar',
    sourceLang: settings.sourceLang || 'auto',
    engine: settings.engine || 'google',
    subtitleMode: settings.subtitleMode || 'translated',
    subtitleSize: settings.subtitleSize || 'medium',
    subtitlePosition: settings.subtitlePosition || 'bottom',
    pageLang,
    hints: hints || null,
    proxyWsUrl: PROXY_WS_URL
  };
}

// 1. الاستماع لرسائل من جميع السياقات (Content Script / Popup / Offscreen)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message?.action) return;

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
      detectedLang: message.detectedLang
    });
    return;
  }

  if (message.action === 'OFFSCREEN_ERROR') {
    const session = sessions.get(message.tabId);
    const frameId = session?.frameId;

    sendToTabFrame(message.tabId, frameId, {
      action: 'TRANSLATION_ERROR',
      error: message.error || 'خطأ غير معروف'
    });
    return;
  }

  if (message.action === 'GET_TRANSLATION_STATUS') {
    const tabId = message.tabId ?? sender?.tab?.id;
    const translating = tabId ? sessions.has(tabId) : isProcessing;
    sendResponse({ isTranslating: translating, activeTabId });
    return;
  }

  if (message.action === 'UPDATE_SETTINGS') {
    const settings = message.settings || {};
    chrome.runtime.sendMessage({
      action: 'OFFSCREEN_UPDATE_CONFIG',
      settings
    });
    return;
  }

  if (message.action === 'AUDIO_DATA') {
    sendToProxy(message.data);
    return;
  }

  if (message.action === 'START_TRANSLATION') {
    const tabId = message.tabId ?? sender?.tab?.id;
    const frameId = message.frameId ?? sender?.frameId;
    handleStartTranslation(tabId, message.hints, frameId).finally(() => {
      if (sendResponse) sendResponse({ ok: true });
    });
    return true;
  }

  if (message.action === 'STOP_TRANSLATION') {
    const tabId = message.tabId ?? sender?.tab?.id;
    handleStopTranslation(tabId).finally(() => {
      if (sendResponse) sendResponse({ ok: true });
    });
    return true;
  }
});

// 2. بدء عملية التقاط الصوت للتبويب المحدد
async function handleStartTranslation(tabId, hints, frameId) {
  if (!tabId) return;

  await ensureOffscreenDocument();

  const streamId = await tabCaptureGetMediaStreamId(tabId);
  if (!streamId) {
    notifyTabStatus(tabId, false, frameId);
    sendToTabFrame(tabId, frameId, {
      action: 'TRANSLATION_ERROR',
      error: 'فشل في التقاط الصوت (tabCapture)'
    });
    return;
  }

  const settings = await buildConfigForTab(tabId, hints);

  sessions.set(tabId, { startedAt: Date.now(), frameId });
  setProcessingState();

  chrome.runtime.sendMessage({
    action: 'OFFSCREEN_START',
    tabId,
    streamId,
    settings
  });

  notifyTabStatus(tabId, true, frameId);
}

// 3. إيقاف عملية الترجمة لتنظيف الموارد
async function handleStopTranslation(tabId) {
  const resolvedTabId = tabId ?? activeTabId;
  if (!resolvedTabId) return;

  const session = sessions.get(resolvedTabId);
  const frameId = session?.frameId;

  sessions.delete(resolvedTabId);
  setProcessingState();

  chrome.runtime.sendMessage({
    action: 'OFFSCREEN_STOP',
    tabId: resolvedTabId
  });

  notifyTabStatus(resolvedTabId, false, frameId);
  await closeOffscreenDocumentIfIdle();
}

// ---------------------------------------------------------------------------------
// الدوال التالية موجودة لتوافق ملفات التحقق/الاختبارات القديمة (Fallback Legacy)
// ---------------------------------------------------------------------------------

function setupStreamingProxy(tabId) {
  const url = PROXY_WS_URL;

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
  }

  socket = new WebSocket(url);

  socket.onopen = () => {
    chrome.storage.sync.get(['targetLang', 'engine'], (settings) => {
      const config = {
        action: 'CONFIGURE',
        targetLang: settings.targetLang || 'ar',
        engine: settings.engine || 'google'
      };
      socket.send(JSON.stringify(config));
    });
  };

  socket.onmessage = (event) => {
    try {
      const result = JSON.parse(event.data);
      chrome.tabs
        .sendMessage(tabId, {
          action: 'NEW_SUBTITLE',
          text: result.translatedText,
          isFinal: result.isFinal,
          originalText: result.originalText
        })
        .catch(() => {
          // ignore
        });
    } catch (_) {
      // ignore
    }
  };

  socket.onerror = () => {
    chrome.tabs.sendMessage(tabId, {
      action: 'TRANSLATION_ERROR',
      error: 'فشل في الاتصال بخادم الترجمة'
    });
  };

  socket.onclose = () => {
    // noop
  };
}

async function sendToProxy(audioChunk) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(audioChunk);
  }
}

function setupAudioProcessing(stream) {
  if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
    throw new Error('AudioContext غير متاح في هذا السياق');
  }

  audioContext = new (AudioContext || webkitAudioContext)();
  mediaStreamSource = audioContext.createMediaStreamSource(stream);
  processor = audioContext.createScriptProcessor(4096, 1, 1);

  mediaStreamSource.connect(processor);
  processor.connect(audioContext.destination);

  processor.onaudioprocess = (e) => {
    const inputData = e.inputBuffer.getChannelData(0);
    sendToProxy(convertFloat32ToInt16(inputData));
  };
}

async function setupAudioWorkletProcessing(stream) {
  if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
    throw new Error('AudioContext غير متاح في هذا السياق');
  }

  audioContext = new (AudioContext || webkitAudioContext)();
  mediaStreamSource = audioContext.createMediaStreamSource(stream);

  await audioContext.audioWorklet.addModule(chrome.runtime.getURL('audio-processor.js'));

  const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
  mediaStreamSource.connect(workletNode);
  workletNode.connect(audioContext.destination);

  workletNode.port.onmessage = (event) => {
    if (event.data.type === 'audioChunk') {
      sendToProxy(event.data.chunk);
    }
  };
}

function convertFloat32ToInt16(buffer) {
  const l = buffer.length;
  const buf = new Int16Array(l);

  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  return buf.buffer;
}

// إيقاف تلقائي عند إغلاق التبويب أو تغيير الصفحة
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
