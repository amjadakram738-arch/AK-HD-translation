/**
 * Mock Translation Adapter for testing
 * Simulates translation functionality without requiring actual API calls
 */

class MockTranslation {
  constructor(config = {}) {
    this.config = {
      targetLanguage: 'ar',
      sourceLanguage: 'auto',
      engine: 'google',
      ...config
    };
    
    // Simple translation dictionary for testing
    this.translationDict = {
      'en': {
        'ar': {
          'Hello': 'مرحبا',
          'welcome': 'مرحبًا بكم',
          'test': 'اختبار',
          'video': 'فيديو',
          'translation': 'ترجمة',
          'system': 'نظام',
          'audio': 'صوت',
          'language': 'لغة',
          'different': 'مختلفة'
        },
        'es': {
          'Hello': 'Hola',
          'welcome': 'bienvenidos',
          'test': 'prueba',
          'video': 'video',
          'translation': 'traducción',
          'system': 'sistema',
          'audio': 'audio',
          'language': 'idioma',
          'different': 'diferentes'
        }
      },
      'ar': {
        'en': {
          'مرحبا': 'Hello',
          'مرحبًا': 'Welcome',
          'اختبار': 'test',
          'فيديو': 'video',
          'ترجمة': 'translation',
          'نظام': 'system',
          'صوت': 'audio',
          'لغة': 'language',
          'مختلفة': 'different'
        }
      }
    };
  }
  
  translate(text) {
    if (!text || typeof text !== 'string') {
      return Promise.resolve({ translatedText: '', originalText: text, detectedLanguage: 'unknown' });
    }
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const sourceLang = this.config.sourceLanguage === 'auto' ? this.detectLanguage(text) : this.config.sourceLanguage;
        const targetLang = this.config.targetLanguage;
        
        let translatedText = text;
        
        // Try to translate using our simple dictionary
        if (this.translationDict[sourceLang] && this.translationDict[sourceLang][targetLang]) {
          const words = text.split(/\s+/);
          translatedText = words.map(word => {
            const cleanWord = word.toLowerCase().replace(/[^\w\s]/g, '');
            return this.translationDict[sourceLang][targetLang][cleanWord] || word;
          }).join(' ');
        } else {
          // Fallback: just append [TRANSLATED] to simulate translation
          translatedText = `[TRANSLATED to ${targetLang}] ${text}`;
        }
        
        resolve({
          translatedText: translatedText,
          originalText: text,
          detectedLanguage: sourceLang,
          confidence: 0.9,
          engine: this.config.engine
        });
      }, 100 + Math.random() * 200); // Simulate network delay
    });
  }
  
  detectLanguage(text) {
    // Simple language detection based on common words
    if (!text) return 'unknown';
    
    const arabicChars = /[\u0600-\u06FF]/;
    const englishChars = /[a-zA-Z]/;
    
    if (arabicChars.test(text)) return 'ar';
    if (englishChars.test(text)) return 'en';
    
    return 'auto';
  }
  
  setConfig(config) {
    this.config = { ...this.config, ...config };
    console.log('Mock Translation config updated:', this.config);
  }
  
  getSupportedLanguages() {
    return [
      'ar', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja',
      'ko', 'hi', 'tr', 'fa', 'el', 'he', 'th', 'vi', 'id', 'ms'
    ];
  }
}

// Export for use in the extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MockTranslation;
} else if (typeof window !== 'undefined') {
  window.MockTranslation = MockTranslation;
}