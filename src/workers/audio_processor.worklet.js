/**
 * audio_processor.worklet.js - AudioWorklet Processor
 * 
 * هذا الملف يعمل في سياق AudioWorklet منفصل عن الرئيسي
 * المسؤوليات:
 * 1. معالجة البيانات الصوتية بأداء عالٍ
 * 2. تحويل العينات إلى التنسيق المطلوب
 * 3. إرسال البيانات المعالجة إلىメイン Thread
 */

// حجم العينة: 4096 عينة
const SAMPLE_BUFFER_SIZE = 4096;

// حجم الخطوة للدفع
const PUSH_INTERVAL = 1600; // ~100ms عند 16kHz

/**
 * معالج الصوت الرئيسي
 */
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    this.buffer = new Float32Array(SAMPLE_BUFFER_SIZE * 2); // مخزن مؤقت مزدوج
    this.bufferIndex = 0;
    this.pushTimer = 0;
    
    // الاستماع للرسائل من الرئيسي
    this.port.onmessage = (event) => {
      if (event.data.type === 'setVadThreshold') {
        this.vadThreshold = event.data.value;
      }
    };
    
    // عتبة VAD الافتراضية
    this.vadThreshold = 0.02;
  }

  /**
   * معالجة البيانات الصوتية الواردة
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (!input || input.length === 0) {
      return true;
    }

    const channelData = input[0];
    
    if (!channelData) {
      return true;
    }

    // نسخ البيانات إلى المخزن المؤقت
    const availableSpace = this.buffer.length - this.bufferIndex;
    const toCopy = Math.min(channelData.length, availableSpace);
    
    this.buffer.set(channelData.subarray(0, toCopy), this.bufferIndex);
    this.bufferIndex += toCopy;

    // إذا امتلأ المخزن المؤقت، إرساله
    if (this.bufferIndex >= SAMPLE_BUFFER_SIZE) {
      // إرسال البيانات
      this.port.postMessage({
        type: 'audioChunk',
        buffer: this.buffer.slice(0, SAMPLE_BUFFER_SIZE),
        timestamp: currentTime || Date.now() / 1000
      });

      // تحريك البيانات المتبقية
      const remaining = this.bufferIndex - SAMPLE_BUFFER_SIZE;
      if (remaining > 0) {
        this.buffer.set(this.buffer.subarray(SAMPLE_BUFFER_SIZE, SAMPLE_BUFFER_SIZE + remaining), 0);
      }
      this.bufferIndex = remaining;
    }

    // يجب أن تعود true للحفاظ على تشغيل المعالج
    return true;
  }

  /**
   * حساب مستوى الصوت
   */
  calculateLevel(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }
}

// تسجيل المعالج
registerProcessor('audio-processor', AudioProcessor);
