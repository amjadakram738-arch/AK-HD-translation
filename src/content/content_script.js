/**
 * content_script.js - Content Script
 * 
 * المسؤوليات الرئيسية:
 * 1. اكتشاف عناصر الفيديو في الصفحة باستخدام MutationObserver
 * 2. إضافة الأيقونات العائمة فوق الفيديوهات المكتشفة
 * 3. عرض الترجمات المتزامنة (Overlay)
 * 4. التواصل مع Service Worker
 * 5. معالجة إيماءات المستخدم
 */

(function() {
  'use strict';

  // =============================================================================
  // الحالة العامة
  // =============================================================================

  const state = {
    videos: new Map(),
    iconsByVideo: new WeakMap(),
    activeVideo: null,
    isTranslating: false,
    settings: {
      targetLang: 'ar',
      sourceLang: 'auto',
      engine: 'google',
      subtitleMode: 'translated',
      subtitleSize: 'medium',
      subtitlePosition: 'bottom',
      showOriginal: false,
      autoDetect: true
    },
    sessionData: null,
    subtitles: []
  };

  let subtitleOverlay = null;
  let overlayContainer = null;
  let overlayTranslatedEl = null;
  let overlayOriginalEl = null;
  let uiUpdateScheduled = false;

  // =============================================================================
  // دوال مساعدة
  // =============================================================================

  /**
   * التحقق مما إذا كانت اللغة RTL
   */
  function isRtlLang(lang) {
    const code = (lang || '').toLowerCase();
    return ['ar', 'fa', 'he', 'ur', 'ku', 'ps'].includes(code);
  }

  /**
   * تطبيق أنماط Overlay
   */
  function applyOverlayStyle() {
    if (!subtitleOverlay) return;

    // إزالة الكلاسات القديمة
    subtitleOverlay.classList.remove(
      'size-small', 'size-medium', 'size-large',
      'pos-top', 'pos-middle', 'pos-bottom',
      'mode-translated', 'mode-original', 'mode-both'
    );

    // إضافة الكلاسات الجديدة
    subtitleOverlay.classList.add(`size-${state.settings.subtitleSize}`);
    subtitleOverlay.classList.add(`pos-${state.settings.subtitlePosition}`);
    
    const modeMap = {
      'translated': 'mode-translated',
      'original': 'mode-original',
      'both': 'mode-both'
    };
    subtitleOverlay.classList.add(modeMap[state.settings.subtitleMode] || 'mode-translated');

    // اتجاه النص
    const rtl = isRtlLang(state.settings.targetLang);
    subtitleOverlay.dir = rtl ? 'rtl' : 'ltr';

    // تخزين الإعدادات
    try {
      chrome.storage.sync.set({
        subtitleSize: state.settings.subtitleSize,
        subtitlePosition: state.settings.subtitlePosition,
        subtitleMode: state.settings.subtitleMode
      });
    } catch (e) {
      console.warn('فشل في حفظ الإعدادات:', e);
    }
  }

  /**
   * تحميل الإعدادات
   */
  function loadSettings() {
    chrome.storage.sync.get(
      ['targetLang', 'sourceLang', 'engine', 'subtitleMode', 'subtitleSize', 'subtitlePosition', 'showOriginal'],
      (result) => {
        state.settings = {
          ...state.settings,
          ...(result || {})
        };
        applyOverlayStyle();
      }
    );
  }

  /**
   * الاستماع لتغييرات الإعدادات
   */
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;

    const next = { ...state.settings };
    for (const [key, change] of Object.entries(changes)) {
      next[key] = change.newValue;
    }
    state.settings = next;
    applyOverlayStyle();
  });

  /**
   * استخراج تلميحات اللغة من الفيديو
   */
  function getVideoLangHints(video) {
    const hints = {
      elementLang: null,
      audioTrackLang: null,
      captionTrackLangs: [],
      detectedDRM: false
    };

    try {
      // محاولة الحصول على سمة lang
      hints.elementLang = video.getAttribute('lang') || 
        video.closest('[lang]')?.getAttribute('lang') || 
        document.documentElement.lang || 
        null;
    } catch {
      // تجاهل الأخطاء
    }

    try {
      // التحقق من مسارات الصوت
      if (video.audioTracks && video.audioTracks.length > 0) {
        hints.audioTrackLang = video.audioTracks[0].language || null;
      }
    } catch {
      // قد لا تكون مدعومة في جميع المتصفحات
    }

    try {
      // البحث عن مسارات الترجمة
      const tracks = video.querySelectorAll('track[kind="subtitles"], track[kind="captions"], track[kind="metadata"]');
      for (const t of tracks) {
        const lang = t.getAttribute('srclang');
        if (lang) hints.captionTrackLangs.push(lang);
      }
    } catch {
      // تجاهل الأخطاء
    }

    return hints;
  }

  /**
   * الحصول على أفضل فيديو للعرض
   */
  function getBestVideoForOverlay() {
    const visibleVideos = [...state.videos.values()]
      .filter(item => {
        if (!item.video.isConnected) return false;
        
        const rect = item.video.getBoundingClientRect();
        return rect.width >= 200 && 
               rect.height >= 120 &&
               rect.bottom > 0 && 
               rect.right > 0 && 
               rect.top < window.innerHeight && 
               rect.left < window.innerWidth;
      })
      .sort((a, b) => {
        const rectA = a.video.getBoundingClientRect();
        const rectB = b.video.getBoundingClientRect();
        return (rectB.width * rectB.height) - (rectA.width * rectA.height);
      });

    return visibleVideos[0]?.video || null;
  }

  // =============================================================================
  // اكتشاف الفيديوهات
  // =============================================================================

  /**
   * مسح شجرة DOM للعثور على الفيديوهات
   */
  function scanTreeForVideos(root) {
    if (!root) return;

    // التحقق من العنصر نفسه إذا كان فيديو
    if (root.nodeType === Node.ELEMENT_NODE && root.tagName === 'VIDEO') {
      attachFloatingIcon(root);
      return;
    }

    // البحث باستخدام querySelectorAll
    if (root.querySelectorAll) {
      const found = root.querySelectorAll('video');
      for (const v of found) {
        attachFloatingIcon(v);
      }
    }

    // البحث في Shadow DOM
    if (root.nodeType === Node.ELEMENT_NODE && root.shadowRoot) {
      scanTreeForVideos(root.shadowRoot);
    }

    // استخدام TreeWalker للمستندات
    if (root.nodeType === Node.DOCUMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      try {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let current = walker.currentNode;
        while (current) {
          if (current.tagName === 'VIDEO') {
            attachFloatingIcon(current);
          }
          if (current.shadowRoot) {
            scanTreeForVideos(current.shadowRoot);
          }
          current = walker.nextNode();
        }
      } catch (e) {
        console.warn('فشل في استخدام TreeWalker:', e);
      }
    }
  }

  /**
   * إنشاء الأيقونة العائمة وإضافتها
   */
  function attachFloatingIcon(video) {
    if (!video || video.dataset.hasTranslateIcon) return;

    // التحقق من إمكانية التشغيل
    if (video.readyState === 0 && !video.poster && !video.src) {
      // الفيديو ليس جاهزاً بعد، إعادة المحاولة لاحقاً
      const observer = new MutationObserver((mutations, obs) => {
        if (video.readyState > 0 || video.poster || video.src) {
          obs.disconnect();
          attachFloatingIcon(video);
        }
      });
      observer.observe(video, { attributes: true });
      return;
    }

    const icon = document.createElement('div');
    icon.className = 'v-translate-icon';
    icon.innerHTML = '<span class="v-translate-icon-text">文</span>';
    icon.title = 'Video Translate AI - اضغط لبدء الترجمة الفورية';
    icon.setAttribute('role', 'button');
    icon.setAttribute('aria-label', 'بدء الترجمة الفورية');
    icon.setAttribute('tabindex', '0');

    // معالج النقر
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTranslation(video);
    });

    // دعم لوحة المفاتيح
    icon.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleTranslation(video);
      }
    });

    document.body.appendChild(icon);

    // تخزين المراجع
    state.videos.set(video, {
      video,
      icon,
      addedAt: Date.now()
    });
    state.iconsByVideo.set(video, icon);
    video.dataset.hasTranslateIcon = 'true';
  }

  /**
   * إزالة الأيقونة
   */
  function removeIcon(video) {
    const item = state.videos.get(video);
    if (item?.icon) {
      item.icon.remove();
    }
    state.videos.delete(video);
    state.iconsByVideo.delete(video);
    video.dataset.hasTranslateIcon = 'false';
  }

  // =============================================================================
  // إدارة الترجمة
  // =============================================================================

  /**
   * تبديل حالة الترجمة
   */
  function toggleTranslation(video) {
    if (!video) return;

    if (state.isTranslating && state.activeVideo === video) {
      // إيقاف الترجمة
      stopTranslation();
    } else {
      // بدء الترجمة
      startTranslation(video);
    }
  }

  /**
   * بدء الترجمة
   */
  function startTranslation(video) {
    if (state.isTranslating) {
      // إيقاف الترجمة السابقة أولاً
      stopTranslation();
    }

    state.isTranslating = true;
    state.activeVideo = video;
    state.subtitles = [];

    // تحديث حالة الأيقونات
    updateIconsState();

    // إنشاء Overlay
    createSubtitleOverlay(video);

    // استخراج تلميحات اللغة
    const hints = getVideoLangHints(video);

    // إرسال طلب البدء
    chrome.runtime.sendMessage({
      action: 'START_TRANSLATION',
      hints
    }, (response) => {
      if (chrome.runtime.lastError) {
        showError('فشل في الاتصال بالإضافة: ' + chrome.runtime.lastError.message);
        return;
      }
      
      if (!response?.success) {
        showError(response?.message || response?.error || 'فشل في بدء الترجمة');
        stopTranslation();
      }
    });
  }

  /**
   * إيقاف الترجمة
   */
  function stopTranslation() {
    if (!state.isTranslating) return;

    state.isTranslating = false;
    state.activeVideo = null;
    state.subtitles = [];

    // تحديث حالة الأيقونات
    updateIconsState();

    // إزالة Overlay
    removeSubtitleOverlay();

    // إرسال طلب الإيقاف
    chrome.runtime.sendMessage({ action: 'STOP_TRANSLATION' }, () => {
      // تجاهل الأخطاء
    });
  }

  /**
   * تحديث حالة الأيقونات
   */
  function updateIconsState() {
    for (const [video, item] of state.videos) {
      if (!item.icon) continue;
      
      const isActive = state.isTranslating && video === state.activeVideo;
      item.icon.classList.toggle('active', isActive);
      item.icon.classList.toggle('inactive', !isActive);
    }
    scheduleUiUpdate();
  }

  // =============================================================================
  // عرض الترجمات
  // =============================================================================

  /**
   * إنشاء Overlay الترجمات
   */
  function createSubtitleOverlay(video) {
    if (subtitleOverlay) return;

    // إنشاء الحاوية الرئيسية
    subtitleOverlay = document.createElement('div');
    subtitleOverlay.className = 'v-translate-overlay size-medium pos-bottom mode-translated';
    subtitleOverlay.setAttribute('role', 'status');
    subtitleOverlay.setAttribute('aria-live', 'polite');

    // إنشاء عنصر النص المترجم
    overlayTranslatedEl = document.createElement('div');
    overlayTranslatedEl.className = 'v-translate-line v-translate-translated';
    overlayTranslatedEl.setAttribute('data-placeholder', 'جاري الترجمة...');

    // إنشاء عنصر النص الأصلي (اختياري)
    overlayOriginalEl = document.createElement('div');
    overlayOriginalEl.className = 'v-translate-line v-translate-original';
    overlayOriginalEl.style.display = 'none';

    // تجميع العناصر
    overlayContainer = document.createElement('div');
    overlayContainer.className = 'v-translate-container';

    overlayContainer.appendChild(overlayTranslatedEl);
    overlayContainer.appendChild(overlayOriginalEl);
    subtitleOverlay.appendChild(overlayContainer);

    // إضافة نص البداية
    overlayTranslatedEl.textContent = 'جاري تحميل الترجمة...';

    // إضافة Overlay للصفحة
    document.body.appendChild(subtitleOverlay);

    // تطبيق الأنماط
    applyOverlayStyle();
    scheduleUiUpdate();
  }

  /**
   * إزالة Overlay
   */
  function removeSubtitleOverlay() {
    if (subtitleOverlay) {
      subtitleOverlay.remove();
      subtitleOverlay = null;
      overlayContainer = null;
      overlayTranslatedEl = null;
      overlayOriginalEl = null;
    }
  }

  /**
   * عرض الترجمة
   */
  function renderSubtitle(data) {
    if (!subtitleOverlay || !overlayTranslatedEl) return;

    const { translatedText, originalText, isFinal, timestamp } = data;

    // إضافة للذاكرة
    if (translatedText) {
      state.subtitles.push({
        translated: translatedText,
        original: originalText,
        timestamp: timestamp || Date.now(),
        isFinal
      });
    }

    // تحديث الأنماط
    subtitleOverlay.classList.toggle('partial', !isFinal);
    subtitleOverlay.classList.toggle('final', isFinal);

    // تحديد الوضع
    const mode = state.settings.subtitleMode;

    if (mode === 'original') {
      overlayTranslatedEl.textContent = originalText || '';
      overlayOriginalEl.style.display = 'none';
    } else if (mode === 'both') {
      overlayTranslatedEl.textContent = translatedText || '';
      overlayOriginalEl.textContent = originalText || '';
      overlayOriginalEl.style.display = '';
    } else {
      // الوضع الافتراضي: مترجم فقط
      overlayTranslatedEl.textContent = translatedText || '';
      overlayOriginalEl.textContent = '';
      overlayOriginalEl.style.display = 'none';
    }

    // تأثير بصري للتحديث
    if (isFinal) {
      subtitleOverlay.classList.add('updated');
      setTimeout(() => subtitleOverlay?.classList.remove('updated'), 300);
    }

    scheduleUiUpdate();
  }

  /**
   * عرض رسالة خطأ
   */
  function showError(message, duration = 3000) {
    if (!subtitleOverlay) {
      if (state.activeVideo) {
        createSubtitleOverlay(state.activeVideo);
      } else {
        // إنشاء Overlay بسيط للخطأ
        subtitleOverlay = document.createElement('div');
        subtitleOverlay.className = 'v-translate-overlay size-medium pos-bottom';
        document.body.appendChild(subtitleOverlay);
      }
    }

    if (overlayTranslatedEl) {
      overlayTranslatedEl.innerHTML = `<span class="error">خطأ: ${escapeHtml(message)}</span>`;
      overlayOriginalEl.textContent = '';
    }

    if (duration > 0) {
      setTimeout(() => {
        if (state.isTranslating) {
          overlayTranslatedEl.textContent = 'جاري إعادة الاتصال...';
        } else {
          stopTranslation();
        }
      }, duration);
    }
  }

  /**
   * تهريب HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // =============================================================================
  // تحديث المواقع
  // =============================================================================

  function scheduleUiUpdate() {
    if (uiUpdateScheduled) return;
    uiUpdateScheduled = true;
    requestAnimationFrame(() => {
      uiUpdateScheduled = false;
      updateUiPositions();
    });
  }

  function updateUiPositions() {
    // تحديث مواقع الأيقونات
    for (const [video, item] of state.videos) {
      if (!video.isConnected) {
        removeIcon(video);
        continue;
      }

      if (!item.icon) continue;

      const rect = video.getBoundingClientRect();

      // التحقق من الرؤية
      const visible = rect.width >= 160 &&
                      rect.height >= 90 &&
                      rect.bottom > 0 &&
                      rect.right > 0 &&
                      rect.top < window.innerHeight &&
                      rect.left < window.innerWidth;

      if (!visible) {
        item.icon.style.display = 'none';
        continue;
      }

      item.icon.style.display = 'flex';
      item.icon.style.top = `${Math.max(8, rect.top + 10)}px`;
      item.icon.style.left = `${Math.max(8, rect.left + 10)}px`;
    }

    // تحديث موقع Overlay
    if (subtitleOverlay && (state.activeVideo?.isConnected || state.isTranslating)) {
      const video = state.activeVideo?.isConnected ? state.activeVideo : getBestVideoForOverlay();
      
      if (!state.activeVideo && video) {
        state.activeVideo = video;
      }

      if (state.activeVideo) {
        const rect = state.activeVideo.getBoundingClientRect();
        const x = rect.left + rect.width / 2;

        let y;
        if (state.settings.subtitlePosition === 'top') {
          y = rect.top + rect.height * 0.18;
        } else if (state.settings.subtitlePosition === 'middle') {
          y = rect.top + rect.height * 0.65;
        } else {
          y = rect.top + rect.height * 0.88;
        }

        subtitleOverlay.style.left = `${x}px`;
        subtitleOverlay.style.top = `${y}px`;
        subtitleOverlay.style.maxWidth = `${Math.min(rect.width * 0.92, 900)}px`;
      }
    }
  }

  // =============================================================================
  // التعامل مع رسائل الـ Extension
  // =============================================================================

  chrome.runtime.onMessage.addListener((message) => {
    if (!message?.action) return;

    switch (message.action) {
      case 'NEW_SUBTITLE':
        renderSubtitle({
          translatedText: message.text,
          originalText: message.originalText,
          isFinal: message.isFinal,
          timestamp: message.timestamp
        });
        break;

      case 'TRANSLATION_ERROR':
        showError(message.message || message.error);
        stopTranslation();
        break;

      case 'TRANSLATION_STATUS_CHANGED':
        state.isTranslating = Boolean(message.isTranslating);
        if (!state.isTranslating) {
          state.activeVideo = null;
          updateIconsState();
          removeSubtitleOverlay();
        } else {
          updateIconsState();
          if (state.activeVideo && !subtitleOverlay) {
            createSubtitleOverlay(state.activeVideo);
          }
        }
        break;

      case 'TRANSLATION_STARTED':
        state.sessionData = message.sessionData;
        if (state.activeVideo && !subtitleOverlay) {
          createSubtitleOverlay(state.activeVideo);
        }
        if (overlayTranslatedEl) {
          overlayTranslatedEl.textContent = 'جاري الاستماع...';
        }
        break;

      case 'TRANSLATION_STOPPED':
        if (overlayTranslatedEl) {
          overlayTranslatedEl.textContent = 'تم إيقاف الترجمة';
        }
        setTimeout(() => {
          if (!state.isTranslating) {
            stopTranslation();
          }
        }, 1500);
        break;

      case 'SETTINGS_UPDATED':
        state.settings = { ...state.settings, ...message.settings };
        applyOverlayStyle();
        break;

      case 'TOGGLE_TRANSLATION':
        if (state.activeVideo) {
          toggleTranslation(state.activeVideo);
        }
        break;

      case 'TOGGLE_SUBTITLES':
        if (subtitleOverlay) {
          subtitleOverlay.classList.toggle('hidden');
        }
        break;

      case 'CYCLE_LANGUAGE':
        // سيتم تنفيذه لاحقاً
        break;
    }
  });

  // =============================================================================
  // تهيئة المراقبات
  // =============================================================================

  function initObservers() {
    // MutationObserver للتغييرات في DOM
    const observer = new MutationObserver((mutations) => {
      let hasNewNodes = false;
      
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          hasNewNodes = true;
          // تأخير قليل للسماح بإعداد العناصر
          setTimeout(() => scanTreeForVideos(node), 50);
        }
      }

      if (hasNewNodes) {
        scheduleUiUpdate();
      }
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });

    // أحداث النافذة
    window.addEventListener('scroll', scheduleUiUpdate, { passive: true });
    window.addEventListener('resize', scheduleUiUpdate);
    window.addEventListener('fullscreenchange', scheduleUiUpdate);
    document.addEventListener('visibilitychange', scheduleUiUpdate);
  }

  /**
   * التهيئة الرئيسية
   */
  function initialize() {
    console.log('Video Translate AI - Content Script Initialized');

    // تحميل الإعدادات
    loadSettings();

    // مسح الصفحة الحالية للفيديوهات
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          scanTreeForVideos(document);
          initObservers();
        }, 100);
      });
    } else {
      setTimeout(() => {
        scanTreeForVideos(document);
        initObservers();
      }, 100);
    }

    // تحديث دوري للمواقع
    setInterval(() => {
      if (state.videos.size > 0) {
        scheduleUiUpdate();
      }
    }, 1000);
  }

  // بدء التنفيذ
  initialize();
})();
