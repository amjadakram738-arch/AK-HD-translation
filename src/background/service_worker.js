/**
 * service_worker.js - Background Service Worker
 * Responsibilities: Session management, offscreen document creation for audio processing,
 * communication with proxy, and passing results to content scripts.
 * Also handles all extension commands, context menus, and advanced features.
 */

const PROXY_WS_URL = 'wss://api.yourproxy.com/v1/stt-streaming';

// State management
const sessions = new Map(); // tabId -> { startedAt: number, frameId?: number, config: object }
let offscreenReady = false;
let offscreenReadyWaiters = [];
let activeTabId = null;
let isProcessing = false;

// Supported languages (ISO 639-1 codes)
const SUPPORTED_LANGUAGES = [
  'ar', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja',
  'ko', 'hi', 'tr', 'fa', 'el', 'he', 'th', 'vi', 'id', 'ms',
  'pl', 'sv', 'no', 'da', 'fi', 'cs', 'hu', 'ro', 'bg', 'hr',
  'sr', 'uk', 'nl', 'nl', 'af', 'sq', 'am', 'hy', 'az', 'eu',
  'be', 'bn', 'bs', 'ca', 'ceb', 'co', 'cy', 'eo', 'et', 'gl',
  'gu', 'ha', 'haw', 'hmn', 'ht', 'ig', 'is', 'jw', 'ka', 'kk',
  'km', 'kn', 'ku', 'ky', 'la', 'lb', 'lo', 'lt', 'lv', 'mg',
  'mi', 'mk', 'ml', 'mn', 'mr', 'mt', 'my', 'ne', 'ny', 'pa',
  'ps', 'sm', 'sd', 'si', 'sk', 'sl', 'sn', 'so', 'st', 'su',
  'sw', 'ta', 'te', 'tg', 'tl', 'tn', 'to', 'tt', 'ug', 'uk',
  'ur', 'uz', 'xh', 'yi', 'yo', 'zu'
];

// Operating modes
const OPERATING_MODES = {
  'auto': { name: 'Auto Mode', description: 'Automatically selects best settings' },
  'manual': { name: 'Manual Mode', description: 'Full user control' },
  'economy': { name: 'Economy Mode', description: 'Reduces CPU/memory usage' },
  'high-accuracy': { name: 'High Accuracy Mode', description: 'Best translation quality' },
  'silent': { name: 'Silent Mode', description: 'No audio output' },
  'interactive': { name: 'Interactive Mode', description: 'Allows text editing' },
  'normal': { name: 'Normal Mode', description: 'Balanced performance' },
  'fast': { name: 'Fast Mode', description: 'Lower quality, faster results' },
  'beta': { name: 'Beta Mode', description: 'Test new features' },
  'cloud': { name: 'Cloud Mode', description: 'Offload processing to servers' },
  'shared': { name: 'Shared Mode', description: 'Synchronized subtitles for groups' }
};

// Audio capture methods
const AUDIO_CAPTURE_METHODS = {
  'direct': { name: 'Direct Capture', priority: 1 },
  'microphone': { name: 'Microphone Capture', priority: 2 },
  'hybrid': { name: 'Hybrid Capture', priority: 3 },
  'api': { name: 'API Capture', priority: 4 },
  'upload': { name: 'Manual Upload', priority: 5 }
};

// Translation engines
const TRANSLATION_ENGINES = {
  'google': { name: 'Google Translate', type: 'cloud', requiresInternet: true },
  'deepl': { name: 'DeepL', type: 'cloud', requiresInternet: true },
  'whisper': { name: 'OpenAI Whisper', type: 'cloud', requiresInternet: true },
  'libre': { name: 'LibreTranslate', type: 'cloud', requiresInternet: true },
  'local-whisper': { name: 'Local Whisper.cpp', type: 'local', requiresInternet: false }
};

// Audio servers
const AUDIO_SERVERS = {
  'webAudio': { name: 'Web Audio API', type: 'browser' },
  'ffmpeg': { name: 'FFmpeg.wasm', type: 'wasm' },
  'mediaRecorder': { name: 'MediaRecorder', type: 'browser' },
  'audioWorklet': { name: 'AudioWorklet', type: 'browser' }
};

// Initialize extension
function initializeExtension() {
  setupContextMenus();
  setupCommands();
  setupTabListeners();
  setupMessageListeners();
  
  console.log('Video Translate AI extension initialized');
}

// Setup context menus
function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'translate-video',
      title: 'Translate Video',
      contexts: ['video', 'audio']
    });
    
    chrome.contextMenus.create({
      id: 'translate-page',
      title: 'Translate Page Audio',
      contexts: ['page']
    });
    
    chrome.contextMenus.create({
      id: 'options',
      title: 'Video Translate AI Options',
      contexts: ['browser_action']
    });
  });
}

// Setup commands
function setupCommands() {
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-translation') {
      toggleTranslationForActiveTab();
    } else if (command === 'show-options') {
      chrome.runtime.openOptionsPage();
    }
  });
}

// Setup tab listeners
function setupTabListeners() {
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
}

// Setup message listeners
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message?.action) return;
    
    handleMessage(message, sender, sendResponse);
    return true; // Keep message port open for async responses
  });
}

// Main message handler
async function handleMessage(message, sender, sendResponse) {
  try {
    switch (message.action) {
      case 'OFFSCREEN_READY':
        markOffscreenReady();
        break;
      
      case 'OFFSCREEN_SUBTITLE':
        handleOffscreenSubtitle(message);
        break;
      
      case 'OFFSCREEN_ERROR':
        handleOffscreenError(message);
        break;
      
      case 'GET_TRANSLATION_STATUS':
        await handleGetTranslationStatus(message, sendResponse);
        break;
      
      case 'UPDATE_SETTINGS':
        handleUpdateSettings(message);
        break;
      
      case 'UPDATE_ADVANCED_SETTINGS':
        handleUpdateAdvancedSettings(message);
        break;
      
      case 'AUDIO_DATA':
        handleAudioData(message);
        break;
      
      case 'START_TRANSLATION':
        await handleStartTranslation(message, sender);
        sendResponse({ ok: true });
        break;
      
      case 'STOP_TRANSLATION':
        await handleStopTranslation(message.tabId ?? sender?.tab?.id);
        sendResponse({ ok: true });
        break;
      
      case 'TOGGLE_TRANSLATION':
        await handleToggleTranslation(message, sender);
        sendResponse({ ok: true });
        break;
      
      case 'GET_SUPPORTED_LANGUAGES':
        sendResponse({ languages: SUPPORTED_LANGUAGES });
        break;
      
      case 'GET_OPERATING_MODES':
        sendResponse({ modes: OPERATING_MODES });
        break;
      
      case 'GET_AUDIO_CAPTURE_METHODS':
        sendResponse({ methods: AUDIO_CAPTURE_METHODS });
        break;
      
      case 'GET_TRANSLATION_ENGINES':
        sendResponse({ engines: TRANSLATION_ENGINES });
        break;
      
      case 'GET_AUDIO_SERVERS':
        sendResponse({ servers: AUDIO_SERVERS });
        break;
      
      case 'DETECT_DRM':
        await handleDetectDRM(message, sendResponse);
        break;
      
      case 'EXPORT_SUBTITLES':
        await handleExportSubtitles(message, sendResponse);
        break;
      
      case 'TEST_AUDIO_CAPTURE':
        await handleTestAudioCapture(message, sendResponse);
        break;
      
      case 'GET_EXTENSION_STATE':
        sendResponse(getExtensionState());
        break;
      
      default:
        console.warn('Unknown message action:', message.action);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ error: error.message });
  }
}

// Offscreen document management
function markOffscreenReady() {
  offscreenReady = true;
  offscreenReadyWaiters.forEach(resolve => resolve());
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
      url: chrome.runtime.getURL('offscreen/offscreen.html'),
      reasons: ['AUDIO_PLAYBACK', 'USER_MEDIA'],
      justification: 'Process tab audio for real-time speech-to-text streaming and translation'
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

// Session management
function sendToTabFrame(tabId, frameId, payload) {
  const options = typeof frameId === 'number' ? { frameId } : undefined;
  chrome.tabs.sendMessage(tabId, payload, options)
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
  const settings = await getAllSettings();
  const pageLang = await detectTabLanguage(tabId);
  
  return {
    targetLang: settings.targetLang || 'ar',
    sourceLang: settings.sourceLang || 'auto',
    engine: settings.engine || 'google',
    subtitleMode: settings.subtitleMode || 'translated',
    subtitleSize: settings.subtitleSize || 'medium',
    subtitlePosition: settings.subtitlePosition || 'bottom',
    pageLang,
    hints: hints || null,
    proxyWsUrl: PROXY_WS_URL,
    operatingMode: settings.operatingMode || 'normal',
    audioCaptureMethod: settings.audioCaptureMethod || 'direct',
    performanceMode: settings.performanceMode || 'balance',
    enableGPU: settings.enableGPU || false,
    maxMemory: settings.maxMemory || 200
  };
}

// Translation control
async function handleStartTranslation(message, sender) {
  const tabId = message.tabId ?? sender?.tab?.id;
  const frameId = message.frameId ?? sender?.frameId;
  
  if (!tabId) return;
  
  // Check for DRM
  const hasDRM = await detectDRMInTab(tabId);
  if (hasDRM) {
    sendToTabFrame(tabId, frameId, {
      action: 'DRM_DETECTED',
      warning: 'DRM protected content detected. Some features may be limited.'
    });
  }
  
  await ensureOffscreenDocument();
  
  const streamId = await getTabCaptureStreamId(tabId);
  if (!streamId) {
    notifyTabStatus(tabId, false, frameId);
    sendToTabFrame(tabId, frameId, {
      action: 'TRANSLATION_ERROR',
      error: 'Failed to capture audio (tabCapture)'
    });
    return;
  }
  
  const settings = await buildConfigForTab(tabId, message.hints);
  
  sessions.set(tabId, { startedAt: Date.now(), frameId, config: settings });
  setProcessingState();
  
  chrome.runtime.sendMessage({
    action: 'OFFSCREEN_START',
    tabId,
    streamId,
    settings
  });
  
  notifyTabStatus(tabId, true, frameId);
}

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

async function handleToggleTranslation(message, sender) {
  const tabId = message.tabId ?? sender?.tab?.id;
  if (!tabId) return;
  
  if (sessions.has(tabId)) {
    await handleStopTranslation(tabId);
  } else {
    await handleStartTranslation(message, sender);
  }
}

// Message handlers
function handleOffscreenSubtitle(message) {
  const session = sessions.get(message.tabId);
  const frameId = session?.frameId;
  
  sendToTabFrame(message.tabId, frameId, {
    action: 'NEW_SUBTITLE',
    text: message.translatedText,
    isFinal: message.isFinal,
    originalText: message.originalText,
    detectedLang: message.detectedLang
  });
}

function handleOffscreenError(message) {
  const session = sessions.get(message.tabId);
  const frameId = session?.frameId;
  
  sendToTabFrame(message.tabId, frameId, {
    action: 'TRANSLATION_ERROR',
    error: message.error || 'Unknown error'
  });
}

async function handleGetTranslationStatus(message, sendResponse) {
  const tabId = message.tabId ?? sender?.tab?.id;
  const translating = tabId ? sessions.has(tabId) : isProcessing;
  sendResponse({ isTranslating: translating, activeTabId });
}

function handleUpdateSettings(message) {
  const settings = message.settings || {};
  chrome.runtime.sendMessage({
    action: 'OFFSCREEN_UPDATE_CONFIG',
    settings
  });
}

function handleUpdateAdvancedSettings(message) {
  // Update advanced settings in storage
  chrome.storage.sync.set(message.settings || {});
}

function handleAudioData(message) {
  // Forward audio data to proxy
  sendToProxy(message.data);
}

// Utility functions
async function getAllSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (result) => {
      resolve(result || {});
    });
  });
}

async function detectTabLanguage(tabId) {
  return new Promise((resolve) => {
    if (!chrome.tabs?.detectLanguage) return resolve(null);
    chrome.tabs.detectLanguage(tabId, (lang) => {
      if (chrome.runtime.lastError) return resolve(null);
      resolve(lang || null);
    });
  });
}

async function getTabCaptureStreamId(tabId) {
  return new Promise((resolve) => {
    if (!chrome.tabCapture?.getMediaStreamId) return resolve(null);
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
      if (chrome.runtime.lastError) return resolve(null);
      resolve(streamId || null);
    });
  });
}

async function detectDRMInTab(tabId) {
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: detectDRM,
      args: []
    });
    return result?.[0]?.result || false;
  } catch (error) {
    console.warn('DRM detection failed:', error);
    return false;
  }
}

function detectDRM() {
  const videos = document.getElementsByTagName('video');
  for (const video of videos) {
    if (detectDRMInVideo(video)) {
      return true;
    }
  }
  return false;
}

function detectDRMInVideo(video) {
  try {
    // Check for common DRM attributes
    if (video.hasAttribute('data-drm') || video.hasAttribute('drm-protected')) {
      return true;
    }
    
    // Check if video has encrypted media extensions
    if (video.webkitKeys || video.msKeys) {
      return true;
    }
    
    // Check video sources for DRM
    const sources = video.querySelectorAll('source');
    for (const source of sources) {
      const src = source.getAttribute('src') || '';
      if (src.includes('.m3u8') || src.includes('.mpd') || 
          src.includes('widevine') || src.includes('playready')) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

async function handleDetectDRM(message, sendResponse) {
  const tabId = message.tabId;
  if (!tabId) {
    sendResponse({ error: 'No tabId provided' });
    return;
  }
  
  const hasDRM = await detectDRMInTab(tabId);
  sendResponse({ hasDRM });
}

async function handleExportSubtitles(message, sendResponse) {
  const { format, subtitles } = message;
  
  if (!subtitles || !Array.isArray(subtitles)) {
    sendResponse({ error: 'Invalid subtitles data' });
    return;
  }
  
  let content = '';
  
  if (format === 'srt') {
    content = generateSRT(subtitles);
  } else if (format === 'vtt') {
    content = generateVTT(subtitles);
  } else if (format === 'txt') {
    content = generateTXT(subtitles);
  } else {
    sendResponse({ error: 'Unsupported format' });
    return;
  }
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  sendResponse({ url, format });
}

function generateSRT(subtitles) {
  let content = '';
  subtitles.forEach((subtitle, index) => {
    const startTime = formatTime(subtitle.startTime || 0);
    const endTime = formatTime(subtitle.endTime || subtitle.startTime + 3);
    content += `${index + 1}\n${startTime} --> ${endTime}\n${subtitle.text}\n\n`;
  });
  return content;
}

function generateVTT(subtitles) {
  let content = 'WEBVTT\n\n';
  subtitles.forEach((subtitle, index) => {
    const startTime = formatTime(subtitle.startTime || 0);
    const endTime = formatTime(subtitle.endTime || subtitle.startTime + 3);
    content += `${index + 1}\n${startTime} --> ${endTime}\n${subtitle.text}\n\n`;
  });
  return content;
}

function generateTXT(subtitles) {
  return subtitles.map(s => s.text).join('\n\n');
}

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

async function handleTestAudioCapture(message, sendResponse) {
  const tabId = message.tabId;
  if (!tabId) {
    sendResponse({ error: 'No tabId provided' });
    return;
  }
  
  try {
    const streamId = await getTabCaptureStreamId(tabId);
    if (!streamId) {
      sendResponse({ success: false, error: 'Failed to get audio stream' });
      return;
    }
    
    sendResponse({ success: true, streamId });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

function getExtensionState() {
  return {
    isTranslating: isProcessing,
    activeTabId,
    sessionCount: sessions.size,
    offscreenReady
  };
}

function toggleTranslationForActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const tabId = tabs[0].id;
      if (sessions.has(tabId)) {
        handleStopTranslation(tabId);
      } else {
        chrome.tabs.sendMessage(tabId, { action: 'TOGGLE_TRANSLATION' });
      }
    }
  });
}

// Legacy fallback functions for compatibility
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
      chrome.tabs.sendMessage(tabId, {
        action: 'NEW_SUBTITLE',
        text: result.translatedText,
        isFinal: result.isFinal,
        originalText: result.originalText
      }).catch(() => {});
    } catch (_) {}
  };
  
  socket.onerror = () => {
    chrome.tabs.sendMessage(tabId, {
      action: 'TRANSLATION_ERROR',
      error: 'Failed to connect to translation server'
    });
  };
}

async function sendToProxy(audioChunk) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(audioChunk);
  }
}

// Initialize the extension when service worker starts
initializeExtension();

console.log('Video Translate AI Service Worker loaded');