/**
 * types.ts - الأنواع المشتركة للـ Extension
 * 
 * تعريفات TypeScript للـ interfaces و types المستخدمة في جميع أجزاء الإضافة
 */

// =============================================================================
// إعدادات الترجمة
// =============================================================================

export interface TranslationConfig {
  targetLang: string;
  sourceLang: string;
  engine: string;
  subtitleMode: 'translated' | 'original' | 'both';
  subtitleSize: 'small' | 'medium' | 'large';
  subtitlePosition: 'top' | 'middle' | 'bottom';
  vadEnabled: boolean;
  chunkSize: number;
  overlapSize: number;
  privacyMode: 'local' | 'balanced' | 'cloud';
  autoDeleteTranscripts: boolean;
  telemetryEnabled: boolean;
}

export const DEFAULT_CONFIG: TranslationConfig = {
  targetLang: 'ar',
  sourceLang: 'auto',
  engine: 'google',
  subtitleMode: 'translated',
  subtitleSize: 'medium',
  subtitlePosition: 'bottom',
  vadEnabled: true,
  chunkSize: 8000,
  overlapSize: 500,
  privacyMode: 'balanced',
  autoDeleteTranscripts: true,
  telemetryEnabled: false
};

// =============================================================================
// إشارات اللغة
// =============================================================================

export interface LanguageHints {
  elementLang: string | null;
  audioTrackLang: string | null;
  captionTrackLangs: string[];
  detectedDRM: boolean;
}

// =============================================================================
// جلسة الترجمة
// =============================================================================

export interface TranslationSession {
  id: string;
  tabId: number;
  frameId?: number;
  startedAt: number;
  status: SessionStatus;
  config: TranslationConfig;
}

export type SessionStatus = 
  | 'init'
  | 'capturing'
  | 'transcribing'
  | 'translating'
  | 'rendering'
  | 'closed';

// =============================================================================
// نتائج الترجمة
// =============================================================================

export interface SubtitleResult {
  translatedText: string;
  originalText?: string;
  isFinal: boolean;
  detectedLang?: string;
  confidence?: number;
  timestamp: number;
}

export interface TranslationSegment {
  start: number;
  end: number;
  text: string;
  translated?: string;
  confidence?: number;
}

// =============================================================================
// STT Adapter
// =============================================================================

export interface STTAdapter {
  initialize(config: STTConfig): Promise<STTInitResult>;
  shutdown(): Promise<void>;
  transcribeChunk(audioData: ArrayBuffer, options?: STTTranscribeOptions): Promise<STTResult>;
  getSupportedLanguages(): string[];
}

export interface STTConfig {
  language?: string;
  enableInterim?: boolean;
  vocabulary?: string[];
}

export interface STTInitResult {
  success: boolean;
  language: string;
  capabilities: {
    streaming: boolean;
    interimResults: boolean;
    vocabulary: boolean;
  };
}

export interface STTTranscribeOptions {
  language?: string;
  isFinal?: boolean;
  duration?: number;
}

export interface STTResult {
  text: string;
  isFinal: boolean;
  language: string;
  confidence: number;
  segments: TranslationSegment[];
  timestamp: number;
}

// =============================================================================
// Translation Adapter
// =============================================================================

export interface TranslationAdapter {
  initialize(config: TranslationAdapterConfig): Promise<TranslationInitResult>;
  shutdown(): Promise<void>;
  translateText(
    sourceLang: string,
    targetLang: string,
    text: string,
    context?: TranslationContext
  ): Promise<TranslationResult>;
  translateBatch(
    sourceLang: string,
    targetLang: string,
    texts: string[],
    context?: TranslationContext
  ): Promise<BatchTranslationResult>;
  getSupportedLanguagePairs(): LanguagePair[];
  getSupportedLanguages(): string[];
}

export interface TranslationAdapterConfig {
  apiKey?: string;
  sourceLang?: string;
  targetLang?: string;
}

export interface TranslationInitResult {
  success: boolean;
  sourceLang: string;
  targetLang: string;
  capabilities: {
    batchTranslation: boolean;
    contextSupport: boolean;
    glossarySupport: boolean;
  };
}

export interface TranslationContext {
  previousText?: string;
  nextText?: string;
  speakerId?: string;
}

export interface TranslationResult {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  qualityScore: number;
  cached: boolean;
}

export interface BatchTranslationResult {
  translations: string[];
  details: TranslationResult[];
  totalProcessed: number;
}

export interface LanguagePair {
  source: string;
  target: string;
}

// =============================================================================
// رسائل Chrome
// =============================================================================

// رسائل من Content Script إلى Background
export interface ContentToBackgroundMessage {
  action: string;
  tabId?: number;
  frameId?: number;
  hints?: LanguageHints;
  settings?: Partial<TranslationConfig>;
}

// رسائل من Background إلى Content Script
export interface BackgroundToContentMessage {
  action: string;
  text?: string;
  isFinal?: boolean;
  originalText?: string;
  detectedLang?: string;
  confidence?: number;
  timestamp?: number;
  error?: string;
  message?: string;
  canRetry?: boolean;
  userActionRequired?: boolean;
  isTranslating?: boolean;
  sessionData?: TranslationSession;
}

// =============================================================================
// أحداث الفيديو
// =============================================================================

export interface VideoEvent {
  type: 'added' | 'removed' | 'play' | 'pause' | 'seek' | 'rate_change';
  video: HTMLVideoElement;
  timestamp: number;
  data?: unknown;
}

// =============================================================================
// تصدير/استيراد
// =============================================================================

export interface ExportOptions {
  format: 'srt' | 'vtt' | 'txt' | 'json';
  includeOriginal: boolean;
  includeTimestamps: boolean;
}

export interface ExportResult {
  success: boolean;
  content: string;
  filename: string;
}

// =============================================================================
// الخصوصية والأمان
// =============================================================================

export interface PrivacySettings {
  mode: 'local' | 'balanced' | 'cloud';
  autoDeleteTranscripts: boolean;
  telemetryEnabled: boolean;
  consentGiven: boolean;
  lastConsentDate?: number;
}

export interface DRMStatus {
  isProtected: boolean;
  source: string;
  reason: string;
  canRetry: boolean;
}
