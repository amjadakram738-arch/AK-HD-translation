/* global chrome */

/**
 * contentScript.js
 * المسؤوليات: اكتشاف الفيديو، إضافة الأيقونة العائمة، وعرض الترجمة.
 */

const videos = new Set();
const iconsByVideo = new WeakMap();

let subtitleOverlay = null;
let overlayTranslatedEl = null;
let overlayOriginalEl = null;

let isTranslating = false;
let activeVideo = null;

let settingsCache = {
  targetLang: 'ar',
  sourceLang: 'auto',
  engine: 'google',
  subtitleMode: 'translated',
  subtitleSize: 'medium',
  subtitlePosition: 'bottom'
};

function isRtlLang(lang) {
  const code = (lang || '').toLowerCase();
  return code === 'ar' || code === 'fa' || code === 'he' || code === 'ur';
}

function applyOverlayStyle() {
  if (!subtitleOverlay) return;

  subtitleOverlay.classList.toggle('size-small', settingsCache.subtitleSize === 'small');
  subtitleOverlay.classList.toggle('size-medium', settingsCache.subtitleSize === 'medium');
  subtitleOverlay.classList.toggle('size-large', settingsCache.subtitleSize === 'large');

  subtitleOverlay.classList.toggle('pos-top', settingsCache.subtitlePosition === 'top');
  subtitleOverlay.classList.toggle('pos-middle', settingsCache.subtitlePosition === 'middle');
  subtitleOverlay.classList.toggle('pos-bottom', settingsCache.subtitlePosition === 'bottom');

  const rtl = isRtlLang(settingsCache.targetLang);
  subtitleOverlay.dir = rtl ? 'rtl' : 'ltr';
}

function loadSettings() {
  chrome.storage.sync.get(
    ['targetLang', 'sourceLang', 'engine', 'subtitleMode', 'subtitleSize', 'subtitlePosition'],
    (result) => {
      settingsCache = {
        ...settingsCache,
        ...(result || {})
      };
      applyOverlayStyle();
    }
  );
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;

  const next = { ...settingsCache };
  for (const [key, change] of Object.entries(changes)) {
    next[key] = change.newValue;
  }
  settingsCache = next;
  applyOverlayStyle();
});

function getVideoLangHints(video) {
  const hints = {
    elementLang: null,
    audioTrackLang: null,
    captionTrackLangs: []
  };

  try {
    hints.elementLang = video.getAttribute('lang') || video.closest('[lang]')?.getAttribute('lang') || null;
  } catch (_) {
    // ignore
  }

  try {
    if (video.audioTracks && video.audioTracks.length > 0) {
      hints.audioTrackLang = video.audioTracks[0].language || null;
    }
  } catch (_) {
    // ignore
  }

  try {
    const tracks = video.querySelectorAll('track[kind="subtitles"], track[kind="captions"], track[kind="metadata"]');
    for (const t of tracks) {
      const lang = t.getAttribute('srclang');
      if (lang) hints.captionTrackLangs.push(lang);
    }
  } catch (_) {
    // ignore
  }

  return hints;
}

function getBestVideoForOverlay() {
  const visible = [...videos]
    .filter((v) => v.isConnected)
    .map((v) => ({ v, rect: v.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width >= 200 && rect.height >= 120)
    .filter(({ rect }) => rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth)
    .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height);

  return visible[0]?.v || [...videos][0] || null;
}

/**
 * 1. اكتشاف الفيديوهات تلقائياً عند تحميل الصفحة
 */
function initVideoDetection() {
  loadSettings();

  scanTreeForVideos(document);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        scanTreeForVideos(node);
      }
    }
    scheduleUiUpdate();
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true
  });

  window.addEventListener('scroll', scheduleUiUpdate, { passive: true });
  window.addEventListener('resize', scheduleUiUpdate);
  document.addEventListener('fullscreenchange', scheduleUiUpdate);

  scheduleUiUpdate();
}

function scanTreeForVideos(root) {
  if (!root) return;

  if (root.nodeType === Node.ELEMENT_NODE && root.tagName === 'VIDEO') {
    attachFloatingIcon(root);
  }

  if (root.querySelectorAll) {
    const found = root.querySelectorAll('video');
    for (const v of found) attachFloatingIcon(v);
  }

  if (root.nodeType === Node.ELEMENT_NODE && root.shadowRoot) {
    scanTreeForVideos(root.shadowRoot);
  }

  if (root.nodeType === Node.DOCUMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let current = walker.currentNode;
    while (current) {
      if (current.tagName === 'VIDEO') attachFloatingIcon(current);
      if (current.shadowRoot) scanTreeForVideos(current.shadowRoot);
      current = walker.nextNode();
    }
  }
}

/**
 * 2. إضافة الأيقونة العائمة بجانب الفيديو
 */
function attachFloatingIcon(video) {
  if (!video || video.dataset.hasTranslateIcon) return;

  const icon = document.createElement('div');
  icon.className = 'v-translate-icon';
  icon.innerHTML = '<span>文</span>';
  icon.title = 'بدء/إيقاف الترجمة الفورية';

  icon.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTranslation(video);
  });

  document.body.appendChild(icon);

  iconsByVideo.set(video, icon);
  videos.add(video);
  video.dataset.hasTranslateIcon = 'true';
}

/**
 * 3. تفعيل/إيقاف الترجمة
 */
function toggleTranslation(video) {
  if (!video) return;

  if (isTranslating && activeVideo === video) {
    isTranslating = false;
    activeVideo = null;
    updateIconsState();
    removeSubtitleOverlay();
    chrome.runtime.sendMessage({ action: 'STOP_TRANSLATION' });
    return;
  }

  isTranslating = true;
  activeVideo = video;
  updateIconsState();
  createSubtitleOverlay(video);

  const hints = getVideoLangHints(video);
  chrome.runtime.sendMessage({ action: 'START_TRANSLATION', hints });
}

function updateIconsState() {
  for (const v of videos) {
    const icon = iconsByVideo.get(v);
    if (!icon) continue;
    icon.classList.toggle('active', isTranslating && v === activeVideo);
  }
  scheduleUiUpdate();
}

/**
 * 4. عرض الترجمة (Overlay)
 */
function createSubtitleOverlay(video) {
  if (subtitleOverlay) return;

  subtitleOverlay = document.createElement('div');
  subtitleOverlay.className = 'v-translate-overlay size-medium pos-bottom';

  overlayTranslatedEl = document.createElement('div');
  overlayTranslatedEl.className = 'v-translate-line v-translate-translated';

  overlayOriginalEl = document.createElement('div');
  overlayOriginalEl.className = 'v-translate-line v-translate-original';

  subtitleOverlay.appendChild(overlayTranslatedEl);
  subtitleOverlay.appendChild(overlayOriginalEl);

  overlayTranslatedEl.textContent = 'جاري بدء الترجمة...';
  overlayOriginalEl.textContent = '';

  document.body.appendChild(subtitleOverlay);
  applyOverlayStyle();
  scheduleUiUpdate();
}

function removeSubtitleOverlay() {
  if (!subtitleOverlay) return;
  subtitleOverlay.remove();
  subtitleOverlay = null;
  overlayTranslatedEl = null;
  overlayOriginalEl = null;
}

function renderSubtitle({ translatedText, originalText, isFinal }) {
  if (!subtitleOverlay || !overlayTranslatedEl || !overlayOriginalEl) return;

  subtitleOverlay.classList.toggle('partial', !isFinal);

  const mode = settingsCache.subtitleMode || 'translated';

  if (mode === 'original') {
    overlayTranslatedEl.textContent = originalText || '';
    overlayOriginalEl.textContent = '';
    overlayOriginalEl.style.display = 'none';
    return;
  }

  if (mode === 'both') {
    overlayTranslatedEl.textContent = translatedText || '';
    overlayOriginalEl.textContent = originalText || '';
    overlayOriginalEl.style.display = '';
    return;
  }

  overlayTranslatedEl.textContent = translatedText || '';
  overlayOriginalEl.textContent = '';
  overlayOriginalEl.style.display = 'none';
}

let uiUpdateScheduled = false;
function scheduleUiUpdate() {
  if (uiUpdateScheduled) return;
  uiUpdateScheduled = true;
  requestAnimationFrame(() => {
    uiUpdateScheduled = false;
    updateUiPositions();
  });
}

function updateUiPositions() {
  for (const video of [...videos]) {
    if (!video.isConnected) {
      const icon = iconsByVideo.get(video);
      if (icon) icon.remove();
      videos.delete(video);
      continue;
    }

    const icon = iconsByVideo.get(video);
    if (!icon) continue;

    const rect = video.getBoundingClientRect();

    const visible =
      rect.width >= 160 &&
      rect.height >= 90 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth;

    if (!visible) {
      icon.style.display = 'none';
      continue;
    }

    icon.style.display = 'flex';
    icon.style.top = `${Math.max(8, rect.top + 10)}px`;
    icon.style.left = `${Math.max(8, rect.left + 10)}px`;
  }

  if (subtitleOverlay && (activeVideo?.isConnected || isTranslating)) {
    const video = activeVideo?.isConnected ? activeVideo : getBestVideoForOverlay();
    if (!activeVideo && video) activeVideo = video;

    if (activeVideo) {
      const rect = activeVideo.getBoundingClientRect();
      const x = rect.left + rect.width / 2;

      let y;
      if (settingsCache.subtitlePosition === 'top') y = rect.top + rect.height * 0.18;
      else if (settingsCache.subtitlePosition === 'middle') y = rect.top + rect.height * 0.65;
      else y = rect.top + rect.height * 0.88;

      subtitleOverlay.style.left = `${x}px`;
      subtitleOverlay.style.top = `${y}px`;
      subtitleOverlay.style.maxWidth = `${Math.min(rect.width * 0.92, 900)}px`;
    }
  }
}

// الاستماع للترجمات القادمة من Background
chrome.runtime.onMessage.addListener((message) => {
  if (!message?.action) return;

  if (message.action === 'NEW_SUBTITLE') {
    if (!subtitleOverlay) {
      if (!activeVideo) activeVideo = getBestVideoForOverlay();
      if (activeVideo) createSubtitleOverlay(activeVideo);
    }

    renderSubtitle({
      translatedText: message.text,
      originalText: message.originalText,
      isFinal: message.isFinal
    });

    scheduleUiUpdate();
  }

  if (message.action === 'TRANSLATION_ERROR') {
    if (!subtitleOverlay) {
      if (!activeVideo) activeVideo = getBestVideoForOverlay();
      if (activeVideo) createSubtitleOverlay(activeVideo);
    }

    if (!subtitleOverlay || !overlayTranslatedEl || !overlayOriginalEl) return;

    overlayTranslatedEl.textContent = `خطأ: ${message.error}`;
    overlayOriginalEl.textContent = '';
    subtitleOverlay.classList.remove('partial');

    setTimeout(() => {
      isTranslating = false;
      activeVideo = null;
      updateIconsState();
      removeSubtitleOverlay();
    }, 2500);
  }

  if (message.action === 'TRANSLATION_STATUS_CHANGED') {
    isTranslating = Boolean(message.isTranslating);
    if (!isTranslating) {
      activeVideo = null;
      updateIconsState();
      removeSubtitleOverlay();
    } else {
      updateIconsState();
      if (activeVideo && !subtitleOverlay) {
        createSubtitleOverlay(activeVideo);
      }
    }
  }
});

initVideoDetection();
