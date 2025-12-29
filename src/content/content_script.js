/**
 * content_script.js
 * Responsibilities: Video detection, floating icon rendering, subtitle display,
 * and handling all user interactions with the video translation interface.
 */

const videos = new Set();
const iconsByVideo = new WeakMap();
let subtitleOverlay = null;
let overlayTranslatedEl = null;
let overlayOriginalEl = null;
let isTranslating = false;
let activeVideo = null;
let settingsCache = null;
let subtitlesHistory = [];
let drmWarningShown = false;

// Initialize extension
function initializeExtension() {
  loadSettings();
  initVideoDetection();
  setupEventListeners();
  
  console.log('Video Translate AI content script loaded');
}

// Load settings from storage
async function loadSettings() {
  const settings = await getAllSettings();
  settingsCache = settings;
  applyOverlayStyle();
}

// Get all settings from storage
function getAllSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (result) => {
      resolve(result || {});
    });
  });
}

// Apply overlay styles based on settings
function applyOverlayStyle() {
  if (!subtitleOverlay || !settingsCache) return;
  
  subtitleOverlay.classList.toggle('size-small', settingsCache.subtitleSize === 'small');
  subtitleOverlay.classList.toggle('size-medium', settingsCache.subtitleSize === 'medium');
  subtitleOverlay.classList.toggle('size-large', settingsCache.subtitleSize === 'large');
  
  subtitleOverlay.classList.toggle('pos-top', settingsCache.subtitlePosition === 'top');
  subtitleOverlay.classList.toggle('pos-middle', settingsCache.subtitlePosition === 'middle');
  subtitleOverlay.classList.toggle('pos-bottom', settingsCache.subtitlePosition === 'bottom');
  
  const rtl = isRtlLang(settingsCache.targetLang);
  subtitleOverlay.dir = rtl ? 'rtl' : 'ltr';
}

// Check if language is RTL
function isRtlLang(lang) {
  const code = (lang || '').toLowerCase();
  return code === 'ar' || code === 'fa' || code === 'he' || code === 'ur' || code === 'yi';
}

// Setup event listeners
function setupEventListeners() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    
    const next = { ...settingsCache };
    for (const [key, change] of Object.entries(changes)) {
      next[key] = change.newValue;
    }
    settingsCache = next;
    applyOverlayStyle();
  });
  
  // Listen for messages from background
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
}

// Handle messages from background script
function handleBackgroundMessage(message) {
  if (!message?.action) return;
  
  switch (message.action) {
    case 'NEW_SUBTITLE':
      handleNewSubtitle(message);
      break;
    case 'TRANSLATION_ERROR':
      handleTranslationError(message);
      break;
    case 'TRANSLATION_STATUS_CHANGED':
      handleTranslationStatusChange(message);
      break;
    case 'DRM_DETECTED':
      handleDRMDetected(message);
      break;
    case 'TOGGLE_TRANSLATION':
      toggleTranslationForActiveVideo();
      break;
  }
}

// Handle new subtitle from translation
function handleNewSubtitle(message) {
  if (!subtitleOverlay) {
    if (!activeVideo) activeVideo = getBestVideoForOverlay();
    if (activeVideo) createSubtitleOverlay(activeVideo);
  }
  
  renderSubtitle({
    translatedText: message.text,
    originalText: message.originalText,
    isFinal: message.isFinal,
    detectedLang: message.detectedLang
  });
  
  // Add to history
  if (message.isFinal && message.text) {
    subtitlesHistory.push({
      text: message.text,
      originalText: message.originalText,
      detectedLang: message.detectedLang,
      timestamp: Date.now()
    });
  }
  
  scheduleUiUpdate();
}

// Handle translation error
function handleTranslationError(message) {
  if (!subtitleOverlay) {
    if (!activeVideo) activeVideo = getBestVideoForOverlay();
    if (activeVideo) createSubtitleOverlay(activeVideo);
  }
  
  if (!subtitleOverlay || !overlayTranslatedEl || !overlayOriginalEl) return;
  
  overlayTranslatedEl.textContent = `Error: ${message.error}`;
  overlayOriginalEl.textContent = '';
  subtitleOverlay.classList.remove('partial');
  
  setTimeout(() => {
    isTranslating = false;
    activeVideo = null;
    updateIconsState();
    removeSubtitleOverlay();
  }, 2500);
}

// Handle translation status change
function handleTranslationStatusChange(message) {
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

// Handle DRM detection
function handleDRMDetected(message) {
  if (drmWarningShown) return;
  drmWarningShown = true;
  
  if (!subtitleOverlay) {
    if (!activeVideo) activeVideo = getBestVideoForOverlay();
    if (activeVideo) createSubtitleOverlay(activeVideo);
  }
  
  if (subtitleOverlay && overlayTranslatedEl) {
    overlayTranslatedEl.textContent = message.warning || 'DRM protected content detected';
    overlayTranslatedEl.style.color = '#ffcc00';
    
    setTimeout(() => {
      if (overlayTranslatedEl) {
        overlayTranslatedEl.textContent = '';
        overlayTranslatedEl.style.color = '';
      }
    }, 5000);
  }
}

// Toggle translation for active video
function toggleTranslationForActiveVideo() {
  const video = getBestVideoForOverlay();
  if (video) {
    toggleTranslation(video);
  }
}

// Video detection and management
function initVideoDetection() {
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

// Scan DOM tree for videos
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

// Get video language hints
function getVideoLangHints(video) {
  const hints = {
    elementLang: null,
    audioTrackLang: null,
    captionTrackLangs: []
  };
  
  try {
    hints.elementLang = video.getAttribute('lang') || video.closest('[lang]')?.getAttribute('lang') || null;
  } catch (_) {}
  
  try {
    if (video.audioTracks && video.audioTracks.length > 0) {
      hints.audioTrackLang = video.audioTracks[0].language || null;
    }
  } catch (_) {}
  
  try {
    const tracks = video.querySelectorAll('track[kind="subtitles"], track[kind="captions"], track[kind="metadata"]');
    for (const t of tracks) {
      const lang = t.getAttribute('srclang');
      if (lang) hints.captionTrackLangs.push(lang);
    }
  } catch (_) {}
  
  return hints;
}

// Get best video for overlay
function getBestVideoForOverlay() {
  const visible = [...videos]
    .filter((v) => v.isConnected)
    .map((v) => ({ v, rect: v.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width >= 200 && rect.height >= 120)
    .filter(({ rect }) => rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth)
    .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height);
  
  return visible[0]?.v || [...videos][0] || null;
}

// Attach floating icon to video
function attachFloatingIcon(video) {
  if (!video || video.dataset.hasTranslateIcon) return;
  
  const icon = document.createElement('div');
  icon.className = 'v-translate-icon';
  icon.innerHTML = '<span>文</span>';
  icon.title = 'Toggle Video Translation';
  
  icon.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTranslation(video);
  });
  
  // Add context menu for right-click
  icon.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showIconContextMenu(icon, video, e.clientX, e.clientY);
  });
  
  document.body.appendChild(icon);
  
  iconsByVideo.set(video, icon);
  videos.add(video);
  video.dataset.hasTranslateIcon = 'true';
}

// Show context menu for icon
function showIconContextMenu(icon, video, x, y) {
  // Create context menu
  const menu = document.createElement('div');
  menu.className = 'v-translate-context-menu';
  menu.style.position = 'fixed';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.style.zIndex = '9999999';
  menu.style.backgroundColor = 'white';
  menu.style.border = '1px solid #ccc';
  menu.style.borderRadius = '4px';
  menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  menu.style.padding = '5px 0';
  menu.style.minWidth = '180px';
  
  // Add menu items
  const exportItem = document.createElement('div');
  exportItem.textContent = 'Export Subtitles';
  exportItem.style.padding = '8px 15px';
  exportItem.style.cursor = 'pointer';
  exportItem.addEventListener('click', () => {
    exportSubtitles();
    menu.remove();
  });
  
  const settingsItem = document.createElement('div');
  settingsItem.textContent = 'Translation Settings';
  settingsItem.style.padding = '8px 15px';
  settingsItem.style.cursor = 'pointer';
  settingsItem.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    menu.remove();
  });
  
  const testItem = document.createElement('div');
  testItem.textContent = 'Test Audio Capture';
  testItem.style.padding = '8px 15px';
  testItem.style.cursor = 'pointer';
  testItem.addEventListener('click', () => {
    testAudioCapture();
    menu.remove();
  });
  
  menu.appendChild(exportItem);
  menu.appendChild(settingsItem);
  menu.appendChild(testItem);
  
  document.body.appendChild(menu);
  
  // Remove menu when clicking elsewhere
  const removeMenu = () => menu.remove();
  setTimeout(() => {
    document.addEventListener('click', removeMenu, { once: true });
  }, 100);
}

// Export subtitles
async function exportSubtitles() {
  if (subtitlesHistory.length === 0) {
    alert('No subtitles available to export');
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'EXPORT_SUBTITLES',
      format: 'srt',
      subtitles: subtitlesHistory.map((s, index) => ({
        text: s.text,
        startTime: index * 3,
        endTime: (index + 1) * 3
      }))
    });
    
    if (response.url) {
      const link = document.createElement('a');
      link.href = response.url;
      link.download = `subtitles.${response.format}`;
      link.click();
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(response.url), 100);
    }
  } catch (error) {
    console.error('Export failed:', error);
    alert('Failed to export subtitles');
  }
}

// Test audio capture
async function testAudioCapture() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'TEST_AUDIO_CAPTURE',
      tabId: chrome.devtools.inspectedWindow.tabId
    });
    
    if (response.success) {
      showTestResult('Audio capture test successful!');
    } else {
      showTestResult(`Test failed: ${response.error}`);
    }
  } catch (error) {
    showTestResult(`Test error: ${error.message}`);
  }
}

// Show test result
function showTestResult(message) {
  if (!subtitleOverlay) {
    const video = getBestVideoForOverlay();
    if (video) createSubtitleOverlay(video);
  }
  
  if (subtitleOverlay && overlayTranslatedEl) {
    overlayTranslatedEl.textContent = message;
    overlayTranslatedEl.style.color = message.includes('successful') ? '#4CAF50' : '#f44336';
    
    setTimeout(() => {
      if (overlayTranslatedEl) {
        overlayTranslatedEl.textContent = '';
        overlayTranslatedEl.style.color = '';
      }
    }, 3000);
  }
}

// Toggle translation
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

// Update icons state
function updateIconsState() {
  for (const v of videos) {
    const icon = iconsByVideo.get(v);
    if (!icon) continue;
    icon.classList.toggle('active', isTranslating && v === activeVideo);
  }
  scheduleUiUpdate();
}

// Subtitle overlay management
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
  
  overlayTranslatedEl.textContent = 'Starting translation...';
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

// Render subtitle
function renderSubtitle({ translatedText, originalText, isFinal }) {
  if (!subtitleOverlay || !overlayTranslatedEl || !overlayOriginalEl) return;
  
  subtitleOverlay.classList.toggle('partial', !isFinal);
  
  const mode = settingsCache?.subtitleMode || 'translated';
  
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

// UI positioning and updates
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
      if (settingsCache?.subtitlePosition === 'top') y = rect.top + rect.height * 0.18;
      else if (settingsCache?.subtitlePosition === 'middle') y = rect.top + rect.height * 0.65;
      else y = rect.top + rect.height * 0.88;
      
      subtitleOverlay.style.left = `${x}px`;
      subtitleOverlay.style.top = `${y}px`;
      subtitleOverlay.style.maxWidth = `${Math.min(rect.width * 0.92, 900)}px`;
    }
  }
}

// Initialize the extension
initializeExtension();

console.log('Video Translate AI content script initialized');