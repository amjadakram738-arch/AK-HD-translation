/**
 * offscreen.js - Offscreen Document Audio Processor
 * Handles audio capture, processing, and communication with translation services
 */

const DEFAULT_PROXY_WS_URL = 'wss://api.yourproxy.com/v1/stt-streaming';

// Session management
const sessions = new Map();

// Safe messaging functions
function safeSendMessage(payload) {
  try {
    chrome.runtime.sendMessage(payload);
  } catch (_) {
    // ignore
  }
}

function safeCloseWebSocket(session) {
  if (!session.socket) return;
  
  try {
    session.socket.onopen = null;
    session.socket.onmessage = null;
    session.socket.onerror = null;
    session.socket.onclose = null;
    session.socket.close();
  } catch (_) {
    // ignore
  }
  
  session.socket = null;
}

function stopMediaStream(session) {
  if (session.mediaStream) {
    for (const t of session.mediaStream.getTracks()) {
      try {
        t.stop();
      } catch (_) {
        // ignore
      }
    }
  }
  session.mediaStream = null;
}

async function stopAudioGraph(session) {
  try {
    if (session.processor) {
      session.processor.disconnect();
      session.processor.onaudioprocess = null;
    }
  } catch (_) {
    // ignore
  }
  session.processor = null;
  
  try {
    if (session.workletNode) {
      session.workletNode.port.onmessage = null;
      session.workletNode.disconnect();
    }
  } catch (_) {
    // ignore
  }
  session.workletNode = null;
  
  try {
    if (session.gainNode) {
      session.gainNode.disconnect();
    }
  } catch (_) {
    // ignore
  }
  session.gainNode = null;
  
  try {
    if (session.mediaStreamSource) {
      session.mediaStreamSource.disconnect();
    }
  } catch (_) {
    // ignore
  }
  session.mediaStreamSource = null;
  
  if (session.audioContext) {
    try {
      await session.audioContext.close();
    } catch (_) {
      // ignore
    }
  }
  session.audioContext = null;
}

// Audio processing functions
function convertFloat32ToInt16(buffer) {
  const l = buffer.length;
  const buf = new Int16Array(l);
  
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  
  return buf.buffer;
}

function sendAudioChunkToProxy(session, arrayBuffer) {
  if (!session.isRunning) return;
  if (!session.socket || session.socket.readyState !== WebSocket.OPEN) return;
  
  try {
    session.socket.send(arrayBuffer);
  } catch (err) {
    safeSendMessage({
      action: 'OFFSCREEN_ERROR',
      tabId: session.tabId,
      error: err?.message || 'Failed to send audio data'
    });
  }
}

function sendConfigToProxy(session) {
  if (!session.socket || session.socket.readyState !== WebSocket.OPEN) return;
  
  const payload = {
    action: 'CONFIGURE',
    targetLang: session.config.targetLang,
    sourceLang: session.config.sourceLang,
    engine: session.config.engine,
    pageLang: session.config.pageLang,
    hints: session.config.hints,
    subtitleMode: session.config.subtitleMode,
    operatingMode: session.config.operatingMode,
    audioCaptureMethod: session.config.audioCaptureMethod,
    performanceMode: session.config.performanceMode
  };
  
  try {
    session.socket.send(JSON.stringify(payload));
  } catch (_) {
    // ignore
  }
}

function scheduleReconnect(session) {
  if (!session.isRunning) return;
  if (session.reconnectTimer) return;
  
  session.reconnectAttempt += 1;
  const backoffMs = Math.min(30000, 1000 * 2 ** Math.min(5, session.reconnectAttempt));
  
  session.reconnectTimer = setTimeout(() => {
    session.reconnectTimer = null;
    connectWebSocket(session);
  }, backoffMs);
}

function connectWebSocket(session) {
  if (!session.isRunning) return;
  
  safeCloseWebSocket(session);
  
  const url = session.config.proxyWsUrl || DEFAULT_PROXY_WS_URL;
  session.socket = new WebSocket(url);
  session.socket.binaryType = 'arraybuffer';
  
  session.socket.onopen = () => {
    session.reconnectAttempt = 0;
    sendConfigToProxy(session);
  };
  
  session.socket.onmessage = (event) => {
    try {
      const result = JSON.parse(event.data);
      safeSendMessage({
        action: 'OFFSCREEN_SUBTITLE',
        tabId: session.tabId,
        ...result
      });
    } catch (_) {
      safeSendMessage({
        action: 'OFFSCREEN_ERROR',
        tabId: session.tabId,
        error: 'Failed to parse server message'
      });
    }
  };
  
  session.socket.onerror = () => {
    safeSendMessage({
      action: 'OFFSCREEN_ERROR',
      tabId: session.tabId,
      error: 'Failed to connect to translation server'
    });
  };
  
  session.socket.onclose = () => {
    scheduleReconnect(session);
  };
}

// Audio pipeline setup
async function setupAudioWorkletGraph(session) {
  session.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  session.mediaStreamSource = session.audioContext.createMediaStreamSource(session.mediaStream);
  
  try {
    await session.audioContext.audioWorklet.addModule(
      chrome.runtime.getURL('workers/audio_processor.worklet.js')
    );
  } catch (error) {
    console.warn('AudioWorklet failed, falling back to ScriptProcessor:', error);
    throw error;
  }
  
  session.workletNode = new AudioWorkletNode(session.audioContext, 'audio-processor');
  session.workletNode.port.onmessage = (event) => {
    if (event?.data?.type === 'audioChunk') {
      sendAudioChunkToProxy(session, event.data.chunk);
    }
  };
  
  session.gainNode = session.audioContext.createGain();
  session.gainNode.gain.value = 0; // Mute audio to prevent feedback
  
  session.mediaStreamSource.connect(session.workletNode);
  session.workletNode.connect(session.gainNode);
  session.gainNode.connect(session.audioContext.destination);
}

async function setupScriptProcessorGraph(session) {
  session.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  session.mediaStreamSource = session.audioContext.createMediaStreamSource(session.mediaStream);
  
  session.processor = session.audioContext.createScriptProcessor(4096, 1, 1);
  session.gainNode = session.audioContext.createGain();
  session.gainNode.gain.value = 0; // Mute audio to prevent feedback
  
  session.mediaStreamSource.connect(session.processor);
  session.processor.connect(session.gainNode);
  session.gainNode.connect(session.audioContext.destination);
  
  session.processor.onaudioprocess = (e) => {
    if (!session.isRunning) return;
    const inputData = e.inputBuffer.getChannelData(0);
    sendAudioChunkToProxy(session, convertFloat32ToInt16(inputData));
  };
}

async function setupAudioPipeline(session, streamId) {
  const constraints = {
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    },
    video: false
  };
  
  try {
    session.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    console.error('Failed to get media stream:', error);
    throw error;
  }
  
  // Try AudioWorklet first (better performance), fall back to ScriptProcessor
  try {
    await setupAudioWorkletGraph(session);
  } catch (_) {
    await stopAudioGraph(session);
    await setupScriptProcessorGraph(session);
  }
}

// Session management
function createDefaultConfig() {
  return {
    targetLang: 'ar',
    sourceLang: 'auto',
    engine: 'google',
    subtitleMode: 'translated',
    subtitleSize: 'medium',
    subtitlePosition: 'bottom',
    pageLang: null,
    hints: null,
    proxyWsUrl: DEFAULT_PROXY_WS_URL,
    operatingMode: 'normal',
    audioCaptureMethod: 'direct',
    performanceMode: 'balance'
  };
}

async function startSession({ tabId, streamId, settings }) {
  await stopSession(tabId);
  
  const session = {
    tabId,
    isRunning: true,
    config: { ...createDefaultConfig(), ...(settings || {}) },
    socket: null,
    reconnectTimer: null,
    reconnectAttempt: 0,
    audioContext: null,
    mediaStream: null,
    mediaStreamSource: null,
    processor: null,
    workletNode: null,
    gainNode: null
  };
  
  sessions.set(tabId, session);
  
  try {
    await setupAudioPipeline(session, streamId);
  } catch (err) {
    session.isRunning = false;
    stopMediaStream(session);
    await stopAudioGraph(session);
    sessions.delete(tabId);
    
    safeSendMessage({
      action: 'OFFSCREEN_ERROR',
      tabId,
      error: err?.message || 'Failed to setup audio capture/processing'
    });
    return;
  }
  
  connectWebSocket(session);
}

async function stopSession(tabId) {
  const session = sessions.get(tabId);
  if (!session) return;
  
  session.isRunning = false;
  
  if (session.reconnectTimer) {
    clearTimeout(session.reconnectTimer);
    session.reconnectTimer = null;
  }
  
  safeCloseWebSocket(session);
  stopMediaStream(session);
  await stopAudioGraph(session);
  
  sessions.delete(tabId);
}

async function stopAllSessions() {
  const tabIds = [...sessions.keys()];
  for (const tabId of tabIds) {
    await stopSession(tabId);
  }
}

function updateConfigForAll(settings) {
  for (const session of sessions.values()) {
    session.config = {
      ...session.config,
      ...(settings || {})
    };
    sendConfigToProxy(session);
  }
}

function updateConfigForTab(tabId, settings) {
  const session = sessions.get(tabId);
  if (!session) return;
  
  session.config = {
    ...session.config,
    ...(settings || {})
  };
  
  sendConfigToProxy(session);
}

// Message handling
chrome.runtime.onMessage.addListener((message) => {
  if (!message?.action) return;
  
  switch (message.action) {
    case 'OFFSCREEN_PING':
      safeSendMessage({ action: 'OFFSCREEN_READY' });
      break;
    
    case 'OFFSCREEN_START':
      startSession(message);
      break;
    
    case 'OFFSCREEN_STOP':
      if (message.tabId) {
        stopSession(message.tabId);
      } else {
        stopAllSessions();
      }
      break;
    
    case 'OFFSCREEN_UPDATE_CONFIG':
      if (message.tabId) {
        updateConfigForTab(message.tabId, message.settings);
      } else {
        updateConfigForAll(message.settings);
      }
      break;
  }
});

// Initialize offscreen document
safeSendMessage({ action: 'OFFSCREEN_READY' });

console.log('Video Translate AI Offscreen Document loaded');