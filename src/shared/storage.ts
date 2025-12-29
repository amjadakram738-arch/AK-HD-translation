/**
 * storage.ts - إدارة التخزين
 * 
 * المسؤوليات:
 * 1. إدارة الإعدادات في chrome.storage
 * 2. إدارة جلسات الترجمة
 * 3. تخزين واسترجاع البيانات المحلية
 */

const STORAGE_KEYS = {
  // الإعدادات
  SETTINGS: 'video_translate_settings',
  
  // الجلسات
  SESSIONS: 'video_translate_sessions',
  
  // التاريخ
  HISTORY: 'video_translate_history',
  
  // مفاتيح API
  API_KEYS: 'video_translate_api_keys',
  
  // الخصوصية
  PRIVACY: 'video_translate_privacy',
  
  // حالة الإضافة
  STATE: 'video_translate_state'
};

// =============================================================================
// الإعدادات
// =============================================================================

export interface ExtensionSettings {
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

const DEFAULT_SETTINGS: ExtensionSettings = {
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

export async function getSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEYS.SETTINGS, (result) => {
      const settings = result[STORAGE_KEYS.SETTINGS];
      resolve({ ...DEFAULT_SETTINGS, ...settings });
    });
  });
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEYS.SETTINGS, (result) => {
      const current = result[STORAGE_KEYS.SETTINGS] || {};
      const updated = { ...current, ...settings };
      
      chrome.storage.sync.set({
        [STORAGE_KEYS.SETTINGS]: updated
      }, () => resolve());
    });
  });
}

// =============================================================================
// الخصوصية
// =============================================================================

export interface PrivacySettings {
  mode: 'local' | 'balanced' | 'cloud';
  autoDeleteTranscripts: boolean;
  telemetryEnabled: boolean;
  consentGiven: boolean;
  lastConsentDate?: number;
  perSiteConsent?: Record<string, boolean>;
}

export async function getPrivacySettings(): Promise<PrivacySettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEYS.PRIVACY, (result) => {
      const privacy = result[STORAGE_KEYS.PRIVACY] || {};
      resolve({
        mode: privacy.mode || 'balanced',
        autoDeleteTranscripts: privacy.autoDeleteTranscripts ?? true,
        telemetryEnabled: privacy.telemetryEnabled ?? false,
        consentGiven: privacy.consentGiven ?? false,
        lastConsentDate: privacy.lastConsentDate
      };
    });
  });
}

export async function savePrivacySettings(settings: Partial<PrivacySettings>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEYS.PRIVACY, (result) => {
      const current = result[STORAGE_KEYS.PRIVACY] || {};
      const updated = { ...current, ...settings };
      
      chrome.storage.sync.set({
        [STORAGE_KEYS.PRIVACY]: updated
      }, () => resolve());
    });
  });
}

// =============================================================================
// مفاتيح API
// =============================================================================

export interface APIKeys {
  google?: string;
  deepL?: string;
  openai?: string;
  azure?: string;
  custom?: Record<string, string>;
}

export async function getAPIKeys(): Promise<APIKeys> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEYS.API_KEYS, (result) => {
      resolve(result[STORAGE_KEYS.API_KEYS] || {});
    });
  });
}

export async function saveAPIKey(provider: string, key: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEYS.API_KEYS, (result) => {
      const keys = result[STORAGE_KEYS.API_KEYS] || {};
      keys[provider] = key;
      
      chrome.storage.sync.set({
        [STORAGE_KEYS.API_KEYS]: keys
      }, () => resolve());
    });
  });
}

export async function deleteAPIKey(provider: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEYS.API_KEYS, (result) => {
      const keys = result[STORAGE_KEYS.API_KEYS] || {};
      delete keys[provider];
      
      chrome.storage.sync.set({
        [STORAGE_KEYS.API_KEYS]: keys
      }, () => resolve());
    });
  });
}

// =============================================================================
// الجلسات
// =============================================================================

export interface SessionRecord {
  id: string;
  tabId: number;
  url: string;
  startedAt: number;
  endedAt?: number;
  targetLang: string;
  segments: Array<{
    start: number;
    end: number;
    original: string;
    translated: string;
    confidence?: number;
  }>;
}

export async function getSessionHistory(): Promise<SessionRecord[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.HISTORY, (result) => {
      resolve(result[STORAGE_KEYS.HISTORY] || []);
    });
  });
}

export async function saveSession(session: SessionRecord): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.HISTORY, (result) => {
      const history = result[STORAGE_KEYS.HISTORY] || [];
      history.push(session);
      
      // الاحتفاظ بآخر 100 جلسة فقط
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }
      
      chrome.storage.local.set({
        [STORAGE_KEYS.HISTORY]: history
      }, () => resolve());
    });
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.HISTORY, (result) => {
      const history = result[STORAGE_KEYS.HISTORY] || [];
      const filtered = history.filter(s => s.id !== sessionId);
      
      chrome.storage.local.set({
        [STORAGE_KEYS.HISTORY]: filtered
      }, () => resolve());
    });
  });
}

export async function clearAllSessions(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({
      [STORAGE_KEYS.HISTORY]: []
    }, () => resolve());
  });
}

// =============================================================================
// حالة الإضافة
// =============================================================================

export interface ExtensionState {
  activeSessionTabId?: number;
  lastActiveTabId?: number;
  installDate?: number;
  version?: string;
  stats?: {
    totalSessions: number;
    totalMinutes: number;
    totalCharacters: number;
  };
}

export async function getState(): Promise<ExtensionState> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.STATE, (result) => {
      resolve(result[STORAGE_KEYS.STATE] || {});
    });
  });
}

export async function saveState(state: Partial<ExtensionState>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.STATE, (result) => {
      const current = result[STORAGE_KEYS.STATE] || {};
      const updated = { ...current, ...state };
      
      chrome.storage.local.set({
        [STORAGE_KEYS.STATE]: updated
      }, () => resolve());
    });
  });
}

// =============================================================================
// مسح جميع البيانات
// =============================================================================

export async function clearAllData(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.clear();
    chrome.storage.local.clear();
    resolve();
  });
}

// =============================================================================
// تصدير/استيراد الإعدادات
// =============================================================================

export async function exportSettings(): Promise<string> {
  const data = {
    settings: await getSettings(),
    privacy: await getPrivacySettings(),
    apiKeys: await getAPIKeys()
  };
  
  return JSON.stringify(data, null, 2);
}

export async function importSettings(jsonData: string): Promise<{ success: boolean; error?: string }> {
  try {
    const data = JSON.parse(jsonData);
    
    if (data.settings) {
      await saveSettings(data.settings);
    }
    if (data.privacy) {
      await savePrivacySettings(data.privacy);
    }
    if (data.apiKeys) {
      for (const [provider, key] of Object.entries(data.apiKeys)) {
        await saveAPIKey(provider, key as string);
      }
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
