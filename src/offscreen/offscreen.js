/**
 * offscreen.js - Offscreen Document Audio Processor
 * 
 * المسؤوليات:
 * 1. إدارة جلسات معالجة الصوت
 * 2. إنشاء WebSocket connection للخادم
 * 3. معالجة تدفق الصوت باستخدام AudioContext و AudioWorklet
 * 4. إرسال البيانات الصوتية وتلقي الترجمات
 * 
 * ملاحظة: هذا الملف يعمل في سياق Offscreen Document الذي يسمح بـ AudioContext
 */

(function() {
  'use strict';

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
    proxyWsUrl: PROXY_WS_URL
  };

  // جلسات المعالجة
  const sessions = new Map();

  // حالة الاتصال
  let isReady = false;

  // =============================================================================
  // دوال مساعدة
  // =============================================================================

  /**
   * إرسال رسالة آمنة
   */
  function safeSendMessage(payload) {
    try {
      chrome.runtime.sendMessage(payload);
    } catch (e) {
      log('خطأ في إرسال الرسالة: ' + e.message, 'error');
    }
  }

  /**
   * تسجيل رسائل
   */
  function log(message, type = 'info') {
    const logsEl = document.getElementById('logs');
    const statusEl = document.getElementById('status-text');
    const sessionsEl = document.getElementById('active-sessions');
    
    if (logsEl) {
      const entry = document.createElement('div');
      entry.className = `log-entry log-${type}`;
      entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      logsEl.appendChild(entry);
      logsEl.scrollTop = logsEl.scrollHeight;
    }
    
    if (statusEl && sessions.size > 0) {
      const session = [...sessions.values()][0];
      statusEl.textContent = `معالجة: ${session.config.targetLang}`;
      statusEl.className = 'active';
    }
    
    if (sessionsEl) {
      sessionsEl.textContent = sessions.size;
    }
  }

  /**
   * تحويل Float32 إلى Int16
   */
  function convertFloat32ToInt16(buffer) {
    const l = buffer.length;
    const buf = new Int16Array(l);

    for (let i = 0; i < l; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return buf.buffer;
  }

  /**
   * التحقق من جودة الصوت
   */
  function calculateAudioLevel(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  /**
   * كشف النشاط الصوتي (VAD)
   */
  function isVoiceActivity(buffer, threshold = 0.02) {
    return calculateAudioLevel(buffer) > threshold;
  }

  /**
   * إنشاء الإعدادات الافتراضية
   */
  function createDefaultConfig() {
    return { ...DEFAULT_CONFIG };
  }

  // =============================================================================
  // إدارة جلسات WebSocket
  // =============================================================================

  /**
   * إغلاق WebSocket بشكل آمن
   */
  function safeCloseWebSocket(session) {
    if (!session?.socket) return;

    try {
      session.socket.onopen = null;
      session.socket.onmessage = null;
      session.socket.onerror = null;
      session.socket.onclose = null;
      session.socket.close();
    } catch (e) {
      // تجاهل الأخطاء
    }

    session.socket = null;
  }

  /**
   * إرسال قطعة صوتية للخادم
   */
  function sendAudioChunkToProxy(session, arrayBuffer) {
    if (!session?.isRunning) return;
    if (!session?.socket || session.socket.readyState !== WebSocket.OPEN) return;

    try {
      session.socket.send(arrayBuffer);
    } catch (err) {
      safeSendMessage({
        action: 'OFFSCREEN_ERROR',
        tabId: session.tabId,
        error: err?.message || 'فشل في إرسال البيانات الصوتية'
      });
    }
  }

  /**
   * إرسال الإعدادات للخادم
   */
  function sendConfigToProxy(session) {
    if (!session?.socket || session.socket.readyState !== WebSocket.OPEN) return;

    const payload = {
      action: 'CONFIGURE',
      targetLang: session.config.targetLang,
      sourceLang: session.config.sourceLang,
      engine: session.config.engine,
      pageLang: session.config.pageLang,
      hints: session.config.hints,
      subtitleMode: session.config.subtitleMode
    };

    try {
      session.socket.send(JSON.stringify(payload));
    } catch (e) {
      log('فشل في إرسال الإعدادات: ' + e.message, 'error');
    }
  }

  /**
   * جدولة إعادة الاتصال
   */
  function scheduleReconnect(session) {
    if (!session?.isRunning) return;
    if (session.reconnectTimer) return;

    session.reconnectAttempt += 1;
    const backoffMs = Math.min(30000, 1000 * 2 ** Math.min(5, session.reconnectAttempt));
    
    log(`إعادة المحاولة ${session.reconnectAttempt} خلال ${backoffMs}ms`, 'warn');

    session.reconnectTimer = setTimeout(() => {
      session.reconnectTimer = null;
      connectWebSocket(session);
    }, backoffMs);
  }

  /**
   * إنشاء اتصال WebSocket
   */
  function connectWebSocket(session) {
    if (!session?.isRunning) return;

    safeCloseWebSocket(session);

    const url = session.config.proxyWsUrl || PROXY_WS_URL;
    log(`الاتصال بـ: ${url}`, 'info');

    session.socket = new WebSocket(url);
    session.socket.binaryType = 'arraybuffer';

    session.socket.onopen = () => {
      session.reconnectAttempt = 0;
      log('تم الاتصال بالخادم بنجاح', 'success');
      sendConfigToProxy(session);
    };

    session.socket.onmessage = (event) => {
      try {
        const result = JSON.parse(event.data);
        
        // التحقق من نوع الرسالة
        if (result.type === 'subtitle') {
          safeSendMessage({
            action: 'OFFSCREEN_SUBTITLE',
            tabId: session.tabId,
            translatedText: result.translatedText,
            originalText: result.originalText,
            isFinal: result.isFinal,
            detectedLang: result.detectedLang,
            confidence: result.confidence,
            timestamp: Date.now()
          });
        } else if (result.type === 'heartbeat') {
          // استجابة لل heartbeat
          session.socket.send(JSON.stringify({ action: 'heartbeat_ack' }));
        }
      } catch (e) {
        log('فشل في تحليل رسالة الخادم: ' + e.message, 'error');
        safeSendMessage({
          action: 'OFFSCREEN_ERROR',
          tabId: session.tabId,
          error: 'فشل في تحليل رسالة الخادم'
        });
      }
    };

    session.socket.onerror = () => {
      log('خطأ في اتصال WebSocket', 'error');
      safeSendMessage({
        action: 'OFFSCREEN_ERROR',
        tabId: session.tabId,
        error: 'فشل في الاتصال بخادم الترجمة'
      });
    };

    session.socket.onclose = () => {
      log('تم إغلاق الاتصال', 'warn');
      scheduleReconnect(session);
    };
  }

  // =============================================================================
  // إدارة تدفق الصوت
  // =============================================================================

  /**
   * إيقاف MediaStream
   */
  function stopMediaStream(session) {
    if (session?.mediaStream) {
      try {
        for (const track of session.mediaStream.getTracks()) {
          track.stop();
        }
      } catch (e) {
        // تجاهل الأخطاء
      }
      session.mediaStream = null;
    }
  }

  /**
   * إيقاف الرسم البياني الصوتي
   */
  async function stopAudioGraph(session) {
    try {
      if (session?.processor) {
        session.processor.disconnect();
        session.processor.onaudioprocess = null;
      }
    } catch (e) {
      // تجاهل الأخطاء
    }
    session.processor = null;

    try {
      if (session?.workletNode) {
        session.workletNode.port.onmessage = null;
        session.workletNode.disconnect();
      }
    } catch (e) {
      // تجاهل الأخطاء
    }
    session.workletNode = null;

    try {
      if (session?.gainNode) {
        session.gainNode.disconnect();
      }
    } catch (e) {
      // تجاهل الأخطاء
    }
    session.gainNode = null;

    try {
      if (session?.mediaStreamSource) {
        session.mediaStreamSource.disconnect();
      }
    } catch (e) {
      // تجاهل الأخطاء
    }
    session.mediaStreamSource = null;

    if (session?.audioContext) {
      try {
        await session.audioContext.close();
      } catch (e) {
        // تجاهل الأخطاء
      }
    }
    session.audioContext = null;
  }

  /**
   * إعداد AudioWorklet
   */
  async function setupAudioWorkletGraph(session) {
    session.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // التحقق من دعم AudioWorklet
    if (!session.audioContext.audioWorklet) {
      throw new Error('AudioWorklet غير مدعوم');
    }

    // إضافة وحدة AudioWorklet
    await session.audioContext.audioWorklet.addModule(
      chrome.runtime.getURL('src/workers/audio_processor.worklet.js')
    );

    // إنشاء MediaStreamSource
    session.mediaStreamSource = session.audioContext.createMediaStreamSource(session.mediaStream);

    // إنشاء AudioWorkletNode
    session.workletNode = new AudioWorkletNode(session.audioContext, 'audio-processor');
    
    // معالجة الرسائل من Worklet
    session.workletNode.port.onmessage = (event) => {
      if (event?.data?.type === 'audioChunk') {
        // التحقق من VAD
        if (session.config.vadEnabled) {
          const buffer = event.data.buffer;
          if (isVoiceActivity(buffer, 0.02)) {
            sendAudioChunkToProxy(session, convertFloat32ToInt16(buffer));
          }
        } else {
          sendAudioChunkToProxy(session, convertFloat32ToInt16(event.data.buffer));
        }
      }
    };

    // إنشاء GainNode (للصمت)
    session.gainNode = session.audioContext.createGain();
    session.gainNode.gain.value = 0;

    // توصيل العقد
    session.mediaStreamSource.connect(session.workletNode);
    session.workletNode.connect(session.gainNode);
    session.gainNode.connect(session.audioContext.destination);

    log('AudioWorklet Graph تم إعداده', 'success');
  }

  /**
   * إعداد ScriptProcessor (fallback)
   */
  async function setupScriptProcessorGraph(session) {
    session.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    session.mediaStreamSource = session.audioContext.createMediaStreamSource(session.mediaStream);

    // استخدام ScriptProcessor كـ fallback
    session.processor = session.audioContext.createScriptProcessor(4096, 1, 1);
    
    session.gainNode = session.audioContext.createGain();
    session.gainNode.gain.value = 0;

    // توصيل العقد
    session.mediaStreamSource.connect(session.processor);
    session.processor.connect(session.gainNode);
    session.gainNode.connect(session.audioContext.destination);

    // معالجة البيانات الصوتية
    session.processor.onaudioprocess = (e) => {
      if (!session?.isRunning) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      
      // التحقق من VAD
      if (session.config.vadEnabled) {
        if (isVoiceActivity(inputData, 0.02)) {
          sendAudioChunkToProxy(session, convertFloat32ToInt16(inputData));
        }
      } else {
        sendAudioChunkToProxy(session, convertFloat32ToInt16(inputData));
      }
    };

    log('ScriptProcessor Graph تم إعداده (fallback)', 'success');
  }

  /**
   * إعداد خط أنابيب الصوت
   */
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

    // الحصول على MediaStream
    session.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    log('تم الحصول على MediaStream', 'success');

    // محاولة استخدام AudioWorklet أولاً
    try {
      await setupAudioWorkletGraph(session);
    } catch (error) {
      log('AudioWorklet غير متاح، استخدام ScriptProcessor: ' + error.message, 'warn');
      await stopAudioGraph(session);
      await setupScriptProcessorGraph(session);
    }
  }

  // =============================================================================
  // إدارة الجلسات
  // =============================================================================

  /**
   * بدء جلسة جديدة
   */
  async function startSession({ tabId, streamId, settings }) {
    log(`بدء جلسة للتبويب ${tabId}`, 'info');

    // إيقاف الجلسة السابقة إن وجدت
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
      gainNode: null,
      startedAt: Date.now()
    };

    sessions.set(tabId, session);

    try {
      await setupAudioPipeline(session, streamId);
      connectWebSocket(session);
      
      log(`جلسة ${tabId} بدأت بنجاح`, 'success');
    } catch (error) {
      log(`فشل في بدء الجلسة: ${error.message}`, 'error');
      
      session.isRunning = false;
      stopMediaStream(session);
      await stopAudioGraph(session);
      sessions.delete(tabId);

      safeSendMessage({
        action: 'OFFSCREEN_ERROR',
        tabId,
        error: error?.message || 'فشل في إعداد التقاط/معالجة الصوت'
      });
    }
  }

  /**
   * إيقاف جلسة
   */
  async function stopSession(tabId) {
    const session = sessions.get(tabId);
    if (!session) return;

    log(`إيقاف جلسة ${tabId}`, 'info');

    session.isRunning = false;

    // إلغاء مؤقت إعادة الاتصال
    if (session.reconnectTimer) {
      clearTimeout(session.reconnectTimer);
      session.reconnectTimer = null;
    }

    // إغلاق WebSocket
    safeCloseWebSocket(session);

    // إيقاف MediaStream
    stopMediaStream(session);

    // إيقاف الرسم البياني الصوتي
    await stopAudioGraph(session);

    // حذف الجلسة
    sessions.delete(tabId);

    log(`جلسة ${tabId} تم إيقافها`, 'success');
  }

  /**
   * إيقاف جميع الجلسات
   */
  async function stopAllSessions() {
    const tabIds = [...sessions.keys()];
    for (const tabId of tabIds) {
      await stopSession(tabId);
    }
  }

  /**
   * تحديث الإعدادات لجلسة معينة
   */
  function updateConfigForTab(tabId, settings) {
    const session = sessions.get(tabId);
    if (!session) return;

    session.config = {
      ...session.config,
      ...(settings || {})
    };

    sendConfigToProxy(session);
  }

  /**
   * تحديث الإعدادات لجميع الجلسات
   */
  function updateConfigForAll(settings) {
    for (const session of sessions.values()) {
      session.config = {
        ...session.config,
        ...(settings || {})
      };
      sendConfigToProxy(session);
    }
  }

  /**
   * تصدير الجلسة
   */
  async function exportSession(tabId, format = 'srt') {
    const session = sessions.get(tabId);
    if (!session) {
      return { success: false, error: 'SESSION_NOT_FOUND' };
    }

    // TODO: تنفيذ نظام التصدير
    return { success: true, format, data: '// TODO: تصدير الترجمات' };
  }

  // =============================================================================
  // رسائل Chrome
  // =============================================================================

  chrome.runtime.onMessage.addListener((message) => {
    if (!message?.action) return;

    switch (message.action) {
      case 'OFFSCREEN_PING':
        safeSendMessage({ action: 'OFFSCREEN_READY' });
        isReady = true;
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

      case 'OFFSCREEN_EXPORT':
        exportSession(message.tabId, message.format);
        break;
    }
  });

  // =============================================================================
  // تهيئة الصفحة
  // =============================================================================

  function initialize() {
    log('Offscreen Document تم تهيئته', 'success');
    
    // إرسال إشارة الجاهزية
    safeSendMessage({ action: 'OFFSCREEN_READY' });
    isReady = true;

    // تحديث الحالة
    const statusEl = document.getElementById('status-text');
    if (statusEl) {
      statusEl.textContent = 'جاهز للاستخدام';
      statusEl.className = 'active';
    }
  }

  // بدء التهيئة
  initialize();

  // تنظيف عند إغلاق الصفحة
  window.addEventListener('beforeunload', () => {
    stopAllSessions();
  });
})();
