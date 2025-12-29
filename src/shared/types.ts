// TypeScript interfaces for the Video Translate AI extension

export interface TranslationSettings {
  targetLang: string;
  sourceLang: string;
  engine: string;
  subtitleMode: 'translated' | 'both' | 'original';
  subtitleSize: 'small' | 'medium' | 'large';
  subtitlePosition: 'top' | 'middle' | 'bottom';
  pageLang: string | null;
  hints: any | null;
  proxyWsUrl: string;
}

export interface SubtitleData {
  text: string;
  originalText?: string;
  isFinal: boolean;
  detectedLang?: string;
}

export interface AudioCaptureMethod {
  type: 'direct' | 'microphone' | 'hybrid' | 'api' | 'upload';
  priority: number;
  enabled: boolean;
}

export interface OperatingMode {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  settings: Record<string, any>;
}

export interface TranslationEngine {
  id: string;
  name: string;
  type: 'cloud' | 'local';
  requiresInternet: boolean;
  supportsLanguages: string[];
}

export interface AudioServer {
  id: string;
  name: string;
  type: 'browser' | 'wasm' | 'cloud';
  requiresInternet: boolean;
}

export interface ExtensionState {
  isTranslating: boolean;
  activeTabId: number | null;
  currentMode: string;
  audioCaptureMethod: string;
  translationEngine: string;
  error: string | null;
}

export interface StorageSchema {
  settings: TranslationSettings;
  advanced: {
    operatingMode: string;
    audioCaptureMethod: string;
    translationEngine: string;
    audioServer: string;
    offlineMode: boolean;
    drmWarningShown: boolean;
    performanceMode: 'speed' | 'quality' | 'balance';
  };
  ui: {
    theme: 'system' | 'light' | 'dark';
    language: string;
  };
}