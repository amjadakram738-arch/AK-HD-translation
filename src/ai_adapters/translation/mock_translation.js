/**
 * mock_translation.js - Mock Translation Adapter
 * 
 * محول ترجمة وهمي للاختبار والتطوير
 * يحاكي استجابة الترجمة الحقيقية
 */

const MOCK_TRANSLATIONS = {
  'en->ar': {
    'hello': 'مرحبا',
    'welcome': 'أهلاً بك',
    'thank you': 'شكراً لك',
    'this is a test': 'هذا اختبار',
    'good morning': 'صباح الخير',
    'good evening': 'مساء الخير',
    'how are you': 'كيف حالك',
    'i am fine': 'أنا بخير',
    'the quick brown fox': 'الثعلب البني السريع',
    'jumps over': 'يقفز فوق',
    'the lazy dog': 'الكسلان الكلب'
  },
  'ar->en': {
    'مرحبا': 'hello',
    'أهلاً بك': 'welcome',
    'شكراً لك': 'thank you',
    'هذا اختبار': 'this is a test',
    'صباح الخير': 'good morning',
    'مساء الخير': 'good evening',
    'كيف حالك': 'how are you',
    'أنا بخير': 'i am fine'
  }
};

const ARABIC_NUMBERS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const ENGLISH_NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * محول ترجمة وهمي
 */
class MockTranslationAdapter {
  constructor() {
    this.isInitialized = false;
    this.config = {};
    this.cache = new Map();
  }

  /**
   * تهيئة المحول
   */
  async initialize(config = {}) {
    this.config = {
      sourceLang: config.sourceLang || 'en',
      targetLang: config.targetLang || 'ar',
      ...config
    };
    
    this.isInitialized = true;
    
    return {
      success: true,
      sourceLang: this.config.sourceLang,
      targetLang: this.config.targetLang,
      capabilities: {
        batchTranslation: true,
        contextSupport: true,
        glossarySupport: false
      }
    };
  }

  /**
   * إيقاف المحول
   */
  async shutdown() {
    this.isInitialized = false;
    this.cache.clear();
    return { success: true };
  }

  /**
   * ترجمة نص
   */
  async translateText(sourceLang, targetLang, text, context = {}) {
    if (!this.isInitialized) {
      throw new Error('المحول لم يتم تهيئته');
    }

    if (!text || text.trim().length === 0) {
      return {
        translatedText: '',
        qualityScore: 1.0
      };
    }

    // إنشاء مفتاح التخزين المؤقت
    const cacheKey = `${sourceLang}->${targetLang}:${text}`;
    
    // التحقق من التخزين المؤقت
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // محاكاة تأخير الشبكة
    await this._simulateNetworkDelay(50, 150);

    // إجراء الترجمة
    const translatedText = this._mockTranslate(sourceLang, targetLang, text);

    // إنشاء النتيجة
    const result = {
      translatedText,
      sourceLang,
      targetLang,
      qualityScore: 0.9 + Math.random() * 0.1,
      cached: false
    };

    // تخزين في الكاش
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * ترجمة عدة نصوص دفعة واحدة
   */
  async translateBatch(sourceLang, targetLang, texts, context = {}) {
    if (!this.isInitialized) {
      throw new Error('المحول لم يتم تهيئته');
    }

    const results = await Promise.all(
      texts.map(text => this.translateText(sourceLang, targetLang, text, context))
    );

    return {
      translations: results.map(r => r.translatedText),
      details: results,
      totalProcessed: texts.length
    };
  }

  /**
   * الحصول على أزواج اللغات المدعومة
   */
  getSupportedLanguagePairs() {
    return [
      { source: 'en', target: 'ar' },
      { source: 'ar', target: 'en' },
      { source: 'en', target: 'fr' },
      { source: 'fr', target: 'en' },
      { source: 'en', target: 'es' },
      { source: 'es', target: 'en' },
      { source: 'en', target: 'de' },
      { source: 'en', target: 'it' },
      { source: 'en', target: 'pt' },
      { source: 'en', target: 'ru' },
      { source: 'en', target: 'zh' },
      { source: 'en', target: 'ja' },
      { source: 'en', target: 'ko' }
    ];
  }

  /**
   * الحصول على اللغات المدعومة
   */
  getSupportedLanguages() {
    return ['en', 'ar', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'];
  }

  /**
   * محاكاة الترجمة
   */
  _mockTranslate(sourceLang, targetLang, text) {
    // التحقق من الترجمة المباشرة
    const key = `${sourceLang}->${targetLang}`;
    const directMap = MOCK_TRANSLATIONS[key];
    
    if (directMap) {
      for (const [en, ar] of Object.entries(directMap)) {
        if (text.toLowerCase().includes(en.toLowerCase())) {
          return text.replace(new RegExp(en, 'gi'), ar);
        }
      }
    }

    // إذا لم نجد ترجمة مباشرة، نعيد النص مع علامة
    if (targetLang === 'ar') {
      // تحويل الأرقام الإنجليزية إلى عربية
      let translated = text;
      for (let i = 0; i < ENGLISH_NUMBERS.length; i++) {
        translated = translated.replace(new RegExp(ENGLISH_NUMBERS[i], 'g'), ARABIC_NUMBERS[i]);
      }
      return `[AR] ${translated}`;
    } else if (targetLang === 'en') {
      return `[EN] ${text}`;
    }

    return `[${targetLang.toUpperCase()}] ${text}`;
  }

  /**
   * محاكاة تأخير الشبكة
   */
  _simulateNetworkDelay(min, max) {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * مسح التخزين المؤقت
   */
  clearCache() {
    this.cache.clear();
  }
}

// تصدير كلاسيك Module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MockTranslationAdapter };
}
