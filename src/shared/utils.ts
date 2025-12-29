/**
 * utils.ts - دوال مساعدة مشتركة
 * 
 * دوال مساعدة مستخدمة في جميع أنحاء الإضافة
 */

// =============================================================================
// دوال اللغة
// =============================================================================

/**
 * التحقق من RTL languages
 */
export const RTL_LANGUAGES = ['ar', 'fa', 'he', 'ur', 'ku', 'ps', 'sd', 'div'];

/**
 * التحقق إذا كانت اللغة RTL
 */
export function isRTL(lang: string): boolean {
  if (!lang) return false;
  return RTL_LANGUAGES.includes(lang.toLowerCase());
}

/**
 * الحصول على اسم اللغة
 */
export function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    'en': 'English',
    'ar': 'العربية',
    'fr': 'Français',
    'es': 'Español',
    'de': 'Deutsch',
    'it': 'Italiano',
    'pt': 'Português',
    'ru': 'Русский',
    'zh': '中文',
    'ja': '日本語',
    'ko': '한국어',
    'hi': 'हिन्दी',
    'tr': 'Türkçe',
    'nl': 'Nederlands',
    'pl': 'Polski',
    'uk': 'Українська',
    'vi': 'Tiếng Việt',
    'th': 'ไทย',
    'id': 'Bahasa Indonesia',
    'ms': 'Bahasa Melayu',
    'fa': 'فارسی',
    'he': 'עברית',
    'ur': 'اردو'
  };
  
  return names[code.toLowerCase()] || code;
}

/**
 * الحصول على جميع اللغات المدعومة
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(getLanguageName('').split(',').reduce((acc, name) => {
    // إرجاع قائمة مبسطة
    return acc;
  }, {} as Record<string, string>));
}

// =============================================================================
// دوال التاريخ والوقت
// =============================================================================

/**
 * تحويل الثواني إلى تنسيق SRT
 */
export function secondsToSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(ms, 3)}`;
}

/**
 * تحويل الثواني إلى تنسيق VTT
 */
export function secondsToVTTTime(seconds: number): string {
  return secondsToSRTTime(seconds).replace(',', '.');
}

/**
 * إضافة padding للأرقام
 */
export function pad(num: number, size: number = 2): string {
  const str = num.toString();
  return str.padStart(size, '0');
}

/**
 * تحويل وقت SRT إلى ثوانٍ
 */
export function srtTimeToSeconds(time: string): number {
  const [timePart, msPart] = time.split(',');
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + (parseInt(msPart) || 0) / 1000;
}

// =============================================================================
// دوال التصدير
// =============================================================================

/**
 * إنشاء محتوى SRT
 */
export function createSRTContent(
  segments: Array<{
    start: number;
    end: number;
    text: string;
    translated?: string;
  }>,
  options: { includeOriginal: boolean } = { includeOriginal: true }
): string {
  return segments.map((segment, index) => {
    let content = `${index + 1}\n`;
    content += `${secondsToSRTTime(segment.start)} --> ${secondsToSRTTime(segment.end)}\n`;
    
    if (options.includeOriginal && segment.translated) {
      content += `${segment.text}\n${segment.translated}\n`;
    } else {
      content += `${segment.translated || segment.text}\n`;
    }
    
    return content;
  }).join('\n');
}

/**
 * إنشاء محتوى VTT
 */
export function createVTTContent(
  segments: Array<{
    start: number;
    end: number;
    text: string;
    translated?: string;
  }>,
  options: { includeOriginal: boolean } = { includeOriginal: true }
): string {
  let content = 'WEBVTT\n\n';
  
  segments.forEach((segment, index) => {
    content += `${index + 1}\n`;
    content += `${secondsToVTTTime(segment.start)} --> ${secondsToVTTTime(segment.end)}\n`;
    
    if (options.includeOriginal && segment.translated) {
      content += `${segment.text}\n${segment.translated}\n`;
    } else {
      content += `${segment.translated || segment.text}\n`;
    }
    
    content += '\n';
  });
  
  return content;
}

/**
 * إنشاء محتوى JSON
 */
export function createJSONContent(
  segments: Array<{
    start: number;
    end: number;
    text: string;
    translated?: string;
    confidence?: number;
  }>,
  metadata: Record<string, unknown> = {}
): string {
  return JSON.stringify({
    metadata: {
      createdAt: new Date().toISOString(),
      ...metadata
    },
    segments: segments.map(s => ({
      start: s.start,
      end: s.end,
      original: s.text,
      translated: s.translated,
      confidence: s.confidence
    }))
  }, null, 2);
}

// =============================================================================
// دوال التشفير والتخزين
// =============================================================================

/**
 * إنشاء مفتاح فريد
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * تشفير البيانات (أساسي - للعرض فقط)
 */
export function simpleEncrypt(text: string, key: string = 'default'): string {
  // تحذير: هذا ليس تشفيراً آمناً - للعرض فقط
  // في الإنتاج، استخدم Web Crypto API
  return btoa(unescape(encodeURIComponent(text)));
}

/**
 * فك تشفير البيانات
 */
export function simpleDecrypt(encrypted: string, key: string = 'default'): string {
  try {
    return decodeURIComponent(escape(atob(encrypted)));
  } catch {
    return '';
  }
}

// =============================================================================
// دوال التحقق
// =============================================================================

/**
 * التحقق من صحة URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * التحقق من صحة لغة
 */
export function isValidLanguage(lang: string): boolean {
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(lang);
}

// =============================================================================
// دوال الأداء
// =============================================================================

/**
 * قياس وقت التنفيذ
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; time: number }> {
  const start = performance.now();
  const result = await fn();
  const time = performance.now() - start;
  return { result, time };
}

/**
 * تأخير بسيط
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// دوال معالجة الأخطاء
// =============================================================================

/**
 * إنشاء خطأ مخصص
 */
export class ExtensionError extends Error {
  constructor(
    message: string,
    public code: string,
    public canRetry: boolean = true,
    public userActionRequired: boolean = false
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}

/**
 * التعامل مع الأخطاء بشكل آمن
 */
export function safeExecute<T>(
  fn: () => T,
  fallback: T
): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// =============================================================================
// دوال DOM
// =============================================================================

/**
 * إضافة عنصر بشكل آمن
 */
export function safeInsertAfter(
  newElement: Element,
  referenceElement: Element
): void {
  const parent = referenceElement.parentNode;
  if (parent) {
    const nextSibling = referenceElement.nextSibling;
    if (nextSibling) {
      parent.insertBefore(newElement, nextSibling);
    } else {
      parent.appendChild(newElement);
    }
  }
}

/**
 * إزالة جميع الأطفال
 */
export function clearElement(element: Element): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

// =============================================================================
// دوال التخزين المؤقت
// =============================================================================

/**
 * تخزين مؤقت بسيط مع TTL
 */
export class SimpleCache<T> {
  private cache = new Map<string, { value: T; expires: number }>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    this.defaultTTL = defaultTTL;
  }

  set(key: string, value: T, ttl?: number): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + (ttl || this.defaultTTL)
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
