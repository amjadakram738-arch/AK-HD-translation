/**
 * audio_processor.worker.js - Audio Processing Web Worker
 * 
 * المسؤوليات:
 * 1. معالجة البيانات الصوتية في خيط منفصل
 * 2. إعادة أخذ العينات (Resampling)
 * 3. كشف النشاط الصوتي (VAD)
 * 4. تجزئة الصوت إلى قطع
 */

// إعدادات المعالجة
const CONFIG = {
  targetSampleRate: 16000,
  chunkDuration: 8000, // 8 ثوانٍ بالمللي ثانية
  overlapDuration: 500, // 0.5 ثانية
  vadThreshold: 0.02,
  vadEnabled: true
};

let audioContext = null;
let resampler = null;
let isProcessing = false;
let audioBuffer = [];
let lastChunkTime = 0;

/**
 * إنشاء AudioContext
 */
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

/**
 * إعادة أخذ العينات (Resampling)
 */
function resample(audioBuffer, fromRate, toRate) {
  if (fromRate === toRate) return audioBuffer;
  
  const ratio = fromRate / toRate;
  const newLength = Math.round(audioBuffer.length / ratio);
  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, audioBuffer.length - 1);
    const t = srcIndex - srcIndexFloor;
    
    // استيفاء خطي
    result[i] = audioBuffer[srcIndexFloor] * (1 - t) + audioBuffer[srcIndexCeil] * t;
  }
  
  return result;
}

/**
 * كشف النشاط الصوتي (VAD)
 */
function detectVoiceActivity(buffer, threshold = CONFIG.vadThreshold) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sum / buffer.length);
  return rms > threshold;
}

/**
 * تحويل Float32 إلى Int16
 */
function float32ToInt16(buffer) {
  const result = new Int16Array(buffer.length);
  
  for (let i = 0; i < buffer.length; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  
  return result;
}

/**
 * معالجة البيانات الصوتية الواردة
 */
function processAudioData(audioData) {
  if (!isProcessing) return;
  
  const now = Date.now();
  
  try {
    // إضافة البيانات إلى المخزن المؤقت
    audioBuffer.push(new Float32Array(audioData));
    
    // التحقق من وقت إرسال آخر قطعة
    const timeSinceLastChunk = now - lastChunkTime;
    
    // إذا مر وقت كافٍ، إرسال قطعة
    if (timeSinceLastChunk >= CONFIG.chunkDuration - CONFIG.overlapDuration) {
      sendChunk();
      lastChunkTime = now;
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message
    });
  }
}

/**
 * إرسال قطعة صوتية
 */
function sendChunk() {
  if (audioBuffer.length === 0) return;
  
  // دمج جميع البيانات
  const totalLength = audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
  const combinedBuffer = new Float32Array(totalLength);
  
  let offset = 0;
  for (const buf of audioBuffer) {
    combinedBuffer.set(buf, offset);
    offset += buf.length;
  }
  
  // إعادة أخذ العينات إذا لزم الأمر
  if (audioContext && audioContext.sampleRate !== CONFIG.targetSampleRate) {
    const resampledBuffer = resample(
      combinedBuffer,
      audioContext.sampleRate,
      CONFIG.targetSampleRate
    );
    
    // تطبيق VAD
    if (CONFIG.vadEnabled) {
      if (!detectVoiceActivity(resampledBuffer)) {
        audioBuffer = [];
        return; // لا إرسال في حالة الصمت
      }
    }
    
    // تحويل إلى Int16
    const int16Data = float32ToInt16(resampledBuffer);
    
    self.postMessage({
      type: 'chunkReady',
      audioData: int16Data.buffer,
      sampleRate: CONFIG.targetSampleRate,
      duration: combinedBuffer.length / CONFIG.targetSampleRate * 1000
    });
  } else {
    // تطبيق VAD
    if (CONFIG.vadEnabled) {
      if (!detectVoiceActivity(combinedBuffer)) {
        audioBuffer = [];
        return; // لا إرسال في حالة الصمت
      }
    }
    
    // تحويل إلى Int16
    const int16Data = float32ToInt16(combinedBuffer);
    
    self.postMessage({
      type: 'chunkReady',
      audioData: int16Data.buffer,
      sampleRate: CONFIG.targetSampleRate,
      duration: combinedBuffer.length / CONFIG.targetSampleRate * 1000
    });
  }
  
  // مسح المخزن المؤقت
  audioBuffer = [];
}

/**
 * بدء المعالجة
 */
function startProcessing() {
  isProcessing = true;
  audioBuffer = [];
  lastChunkTime = Date.now();
  
  initAudioContext();
}

/**
 * إيقاف المعالجة
 */
function stopProcessing() {
  isProcessing = false;
  audioBuffer = [];
  
  // إرسال أي بيانات متبقية
  if (audioBuffer.length > 0) {
    sendChunk();
  }
}

/**
 * تحديث الإعدادات
 */
function updateConfig(newConfig) {
  CONFIG.targetSampleRate = newConfig.targetSampleRate || CONFIG.targetSampleRate;
  CONFIG.chunkDuration = newConfig.chunkDuration || CONFIG.chunkDuration;
  CONFIG.overlapDuration = newConfig.overlapDuration || CONFIG.overlapDuration;
  CONFIG.vadThreshold = newConfig.vadThreshold || CONFIG.vadThreshold;
  CONFIG.vadEnabled = newConfig.vadEnabled !== false;
}

/**
 * معالجة الرسائل الواردة
 */
self.onmessage = function(event) {
  const { type, data } = event.data;
  
  switch (type) {
    case 'init':
      initAudioContext();
      self.postMessage({ type: 'ready' });
      break;
      
    case 'start':
      startProcessing();
      break;
      
    case 'stop':
      stopProcessing();
      break;
      
    case 'audioData':
      processAudioData(data);
      break;
      
    case 'updateConfig':
      updateConfig(data);
      break;
      
    case 'flush':
      sendChunk();
      break;
      
    default:
      self.postMessage({ type: 'error', error: `نوع رسالة غير معروف: ${type}` });
  }
};
