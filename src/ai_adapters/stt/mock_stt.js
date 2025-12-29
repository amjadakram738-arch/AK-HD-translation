/**
 * Mock STT Adapter for testing
 * Simulates speech-to-text functionality without requiring actual API calls
 */

class MockSTT {
  constructor(config = {}) {
    this.config = {
      sampleRate: 16000,
      chunkSize: 4096,
      language: 'en',
      ...config
    };
    
    this.sampleTranscripts = {
      en: [
        "Hello, welcome to our video translation demonstration.",
        "This is a test of the automatic speech recognition system.",
        "The extension should be able to detect and translate this audio.",
        "Let's see how well it performs with different languages.",
        "This is the English language sample for testing purposes."
      ],
      ar: [
        "مرحبًا بكم في عرض توضيحي لترجمة الفيديو.",
        "هذا اختبار لنظام التعرف على الكلام التلقائي.",
        "يجب أن تكون الإضافة قادرة على اكتشاف وترجمة هذا الصوت.",
        "لنرى كيف تعمل مع لغات مختلفة.",
        "هذه هي عينة اللغة العربية لأغراض الاختبار."
      ],
      es: [
        "Hola, bienvenidos a nuestra demostración de traducción de video.",
        "Esta es una prueba del sistema de reconocimiento de voz automático.",
        "La extensión debería poder detectar y traducir este audio.",
        "Veamos cómo se desempeña con diferentes idiomas.",
        "Esta es la muestra del idioma español para fines de prueba."
      ],
      fr: [
        "Bonjour, bienvenue dans notre démonstration de traduction vidéo.",
        "Ceci est un test du système de reconnaissance vocale automatique.",
        "L'extension devrait pouvoir détecter et traduire cet audio.",
        "Voyons comment elle performe avec différentes langues.",
        "Ceci est l'échantillon de la langue française à des fins de test."
      ]
    };
    
    this.currentIndex = 0;
    this.isRunning = false;
  }
  
  start() {
    this.isRunning = true;
    this.currentIndex = 0;
    console.log('Mock STT started');
  }
  
  stop() {
    this.isRunning = false;
    console.log('Mock STT stopped');
  }
  
  processAudioChunk(audioData) {
    if (!this.isRunning) return null;
    
    // Simulate processing delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const lang = this.config.language || 'en';
        const transcripts = this.sampleTranscripts[lang] || this.sampleTranscripts.en;
        
        const result = {
          text: transcripts[this.currentIndex % transcripts.length],
          isFinal: Math.random() > 0.3, // 70% chance of being final
          language: lang,
          confidence: 0.95,
          timestamp: Date.now()
        };
        
        this.currentIndex++;
        resolve(result);
      }, 200 + Math.random() * 300); // Random delay 200-500ms
    });
  }
  
  setLanguage(lang) {
    this.config.language = lang;
    console.log(`Mock STT language set to: ${lang}`);
  }
  
  setConfig(config) {
    this.config = { ...this.config, ...config };
    console.log('Mock STT config updated:', this.config);
  }
}

// Export for use in the extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MockSTT;
} else if (typeof window !== 'undefined') {
  window.MockSTT = MockSTT;
}