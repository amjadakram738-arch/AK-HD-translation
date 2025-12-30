// Storage management for Video Translate AI extension

export const DEFAULT_SETTINGS = {
  targetLang: 'ar',
  sourceLang: 'auto',
  engine: 'google',
  subtitleMode: 'translated',
  subtitleSize: 'medium',
  subtitlePosition: 'bottom',
  performanceMode: 'balance',
  operatingMode: 'normal',
  audioCaptureMethod: 'direct',
  translationEngine: 'google',
  audioServer: 'webAudio',
  offlineMode: false,
  drmWarningShown: false,
  theme: 'system',
  language: 'auto'
};

export async function getStorage<T extends keyof chrome.storage.StorageArea>(area: T, keys: string | string[] | object): Promise<any> {
  return new Promise((resolve) => {
    chrome.storage[area].get(keys, (result) => {
      resolve(result || {});
    });
  });
}

export async function setStorage<T extends keyof chrome.storage.StorageArea>(area: T, items: object): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage[area].set(items, () => {
      resolve();
    });
  });
}

export async function removeStorage<T extends keyof chrome.storage.StorageArea>(area: T, keys: string | string[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage[area].remove(keys, () => {
      resolve();
    });
  });
}

export async function clearStorage<T extends keyof chrome.storage.StorageArea>(area: T): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage[area].clear(() => {
      resolve();
    });
  });
}

export async function getAllSettings(): Promise<any> {
  const syncData = await getStorage('sync', null);
  const localData = await getStorage('local', null);
  return { ...DEFAULT_SETTINGS, ...syncData, ...localData };
}

export async function saveSettings(settings: Partial<typeof DEFAULT_SETTINGS>): Promise<void> {
  const syncSettings = {
    targetLang: settings.targetLang,
    sourceLang: settings.sourceLang,
    engine: settings.engine,
    subtitleMode: settings.subtitleMode,
    subtitleSize: settings.subtitleSize,
    subtitlePosition: settings.subtitlePosition,
    performanceMode: settings.performanceMode,
    operatingMode: settings.operatingMode,
    audioCaptureMethod: settings.audioCaptureMethod,
    translationEngine: settings.translationEngine,
    audioServer: settings.audioServer
  };
  
  const localSettings = {
    offlineMode: settings.offlineMode,
    drmWarningShown: settings.drmWarningShown,
    theme: settings.theme,
    language: settings.language
  };
  
  await setStorage('sync', syncSettings);
  await setStorage('local', localSettings);
}

export async function resetSettings(): Promise<void> {
  await clearStorage('sync');
  await clearStorage('local');
  await setStorage('sync', DEFAULT_SETTINGS);
}

export async function exportSettings(): Promise<string> {
  const settings = await getAllSettings();
  return JSON.stringify(settings, null, 2);
}

export async function importSettings(jsonString: string): Promise<void> {
  try {
    const settings = JSON.parse(jsonString);
    await saveSettings(settings);
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(new Error('Invalid settings JSON'));
  }
}

export function onStorageChanged(callback: (changes: Record<string, chrome.storage.StorageChange>, area: string) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    callback(changes, area);
  });
}