/**
 * mock_stt.js - Mock STT Adapter
 * 
 * محول وهمي للتعرف على الكلام للاختبار والتطوير
 * يحاكي استجابة STT حقيقية مع نص عشوائي
 */

const MOCK_TRANSCRIPTS = {
  'en': [
    'Hello, welcome to our presentation today.',
    'We\'re going to discuss the latest developments in AI technology.',
    'This is a sample transcript for testing purposes.',
    'The audio processing system is working correctly.',
    'Thank you for your attention.',
    'Let me explain how the system works.',
    'First, we capture the audio from the video.',
    'Then, we process it through the speech recognition engine.',
    'Finally, we translate the text to the target language.'
  ],
  'ar': [
    'مرحباً، أهلاً بكم في عرضنا التقديمي اليوم.',
    'سنناقش أحدث التطورات في تكنولوجيا الذكاء الاصطناعي.',
    'هذه نسخة تجريبية من النص للاختبار.',
    'نظام معالجة الصوت يعمل بشكل صحيح.',
    'شكراً لاهتمامكم.',
    'دعني أشرح لكم كيف يعمل النظام.',
    'أولاً، نلتقط الصوت من الفيديو.',
    'ثم نعالجه عبر محرك التعرف على الكلام.',
    'أخيراً، نترجم النص إلى اللغة المطلوبة.'
  ],
  'fr': [
    'Bonjour, bienvenue à notre présentation aujourd\'hui.',
    'Nous allons discuter des derniers développements en matière d\'IA.',
    'Ceci est un exemple de transcription pour les tests.',
    'Le système de traitement audio fonctionne correctement.',
    'Merci pour votre attention.'
  ],
  'es': [
    'Hola, bienvenidos a nuestra presentación de hoy.',
    'Vamos a discutir los últimos desarrollos en tecnología de IA.',
    'Esta es una transcripción de ejemplo para pruebas.',
    'El sistema de procesamiento de audio está funcionando correctamente.',
    'Gracias por su atención.'
  ]
};

/**
 * Mock STT Adapter
 */
class MockSTTAdapter {
  constructor() {
    this.isInitialized = false;
    this.config = {};
    this.currentTranscriptIndex = 0;
  }

  /**
   * تهيئة المحول
   */
  async initialize(config = {}) {
    this.config = {
      language: config.language || 'en',
      ...config
    };
    
    this.isInitialized = true;
    
    return {
      success: true,
      language: this.config.language,
      capabilities: {
        streaming: true,
        interimResults: true,
        vocabulary: true
      }
    };
  }

  /**
   * إيقاف المحول
   */
  async shutdown() {
    this.isInitialized = false;
    return { success: true };
  }

  /**
   * نسخ مقطع صوتي
   */
  async transcribeChunk(audioData, options = {}) {
    if (!this.isInitialized) {
      throw new Error('المحول لم يتم تهيئته');
    }

    // محاكاة تأخير الشبكة
    await this._simulateNetworkDelay(100, 300);

    // الحصول على نص عشوائي
    const lang = options.language || this.config.language || 'en';
    const transcripts = MOCK_TRANSCRIPTS[lang] || MOCK_TRANSCRIPTS['en'];
    
    // اختيار نص بالتناوب
    const text = transcripts[this.currentTranscriptIndex % transcripts.length];
    this.currentTranscriptIndex++;

    // إنشاء نتيجة عشوائية
    const isFinal = options.isFinal !== false;
    const confidence = 0.85 + Math.random() * 0.14; // 0.85-0.99

    return {
      text,
      isFinal,
      language: lang,
      confidence,
      segments: isFinal ? [{
        start: 0,
        end: options.duration || 3.0,
        text,
        confidence
      }] : [],
      timestamp: Date.now()
    };
  }

  /**
   * الحصول على اللغات المدعومة
   */
  getSupportedLanguages() {
    return ['en', 'ar', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'];
  }

  /**
   * محاكاة تأخير الشبكة
   */
  _simulateNetworkDelay(min, max) {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

// تصدير كلاسيك Module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MockSTTAdapter };
}
