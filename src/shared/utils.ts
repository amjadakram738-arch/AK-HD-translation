// Utility functions for Video Translate AI extension

export function isRtlLang(lang: string): boolean {
  const code = (lang || '').toLowerCase();
  return code === 'ar' || code === 'fa' || code === 'he' || code === 'ur' || code === 'yi';
}

export function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  return function(...args: Parameters<T>): void {
    if (timeout) clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let lastFunc: number | null = null;
  let lastRan: number | null = null;
  return function(...args: Parameters<T>): void {
    if (!lastRan) {
      func(...args);
      lastRan = Date.now();
    } else {
      if (lastFunc) clearTimeout(lastFunc);
      lastFunc = window.setTimeout(() => {
        if (Date.now() - lastRan! >= limit) {
          func(...args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan!));
    }
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getBrowserLanguage(): string {
  if (typeof chrome !== 'undefined' && chrome.i18n) {
    return chrome.i18n.getUILanguage() || navigator.language;
  }
  return navigator.language || 'en';
}

export function getClosestSupportedLanguage(lang: string, supported: string[]): string {
  const baseLang = lang.split('-')[0].toLowerCase();
  const exactMatch = supported.find(l => l.toLowerCase() === lang.toLowerCase());
  if (exactMatch) return exactMatch;
  
  const baseMatch = supported.find(l => l.toLowerCase().split('-')[0] === baseLang);
  if (baseMatch) return baseMatch;
  
  return supported.includes('en') ? 'en' : supported[0];
}

export function convertFloat32ToInt16(buffer: Float32Array): Int16Array {
  const l = buffer.length;
  const buf = new Int16Array(l);
  
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  
  return buf;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function createSRTSubtitle(text: string, startTime: number, endTime: number, index: number): string {
  return `${index}\n${formatTime(startTime)} --> ${formatTime(endTime)}\n${text}\n\n`;
}

export function createVTTSubtitle(text: string, startTime: number, endTime: number, index: number): string {
  return `${index}\n${formatTime(startTime)} --> ${formatTime(endTime)}\n${text}\n\n`;
}

export function detectDRM(video: HTMLVideoElement): boolean {
  try {
    if (!video) return false;
    
    // Check for common DRM attributes
    if (video.hasAttribute('data-drm') || video.hasAttribute('drm-protected')) {
      return true;
    }
    
    // Check if video has encrypted media extensions
    if (video.webkitKeys || video.msKeys) {
      return true;
    }
    
    // Check video sources for DRM
    const sources = video.querySelectorAll('source');
    for (const source of sources) {
      const src = source.getAttribute('src') || '';
      if (src.includes('.m3u8') || src.includes('.mpd') || src.includes('widevine') || src.includes('playready')) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.warn('DRM detection error:', error);
    return false;
  }
}

export function isVideoVisible(video: HTMLVideoElement): boolean {
  try {
    const rect = video.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth
    );
  } catch (error) {
    return false;
  }
}

export function getVideoInfo(video: HTMLVideoElement): {
  width: number;
  height: number;
  duration: number;
  currentTime: number;
  paused: boolean;
  muted: boolean;
  volume: number;
  playbackRate: number;
} {
  return {
    width: video.videoWidth || video.clientWidth,
    height: video.videoHeight || video.clientHeight,
    duration: video.duration || 0,
    currentTime: video.currentTime || 0,
    paused: video.paused,
    muted: video.muted,
    volume: video.volume,
    playbackRate: video.playbackRate
  };
}