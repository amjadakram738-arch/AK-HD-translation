/**
 * popup.js - Popup Script
 * 
 * المسؤوليات:
 * 1. تحميل وعرض الإعدادات الحالية
 * 2. حفظ التغييرات في chrome.storage
 * 3. التواصل مع Service Worker
 * 4. إدارة عناصر واجهة المستخدم
 */

(function() {
  'use strict';

  // عناصر DOM
  const elements = {
    targetLang: document.getElementById('targetLang'),
    engine: document.getElementById('engine'),
    statusIndicator: document.getElementById('statusIndicator'),
    statusText: document.getElementById('statusText'),
    showOriginalToggle: document.getElementById('showOriginalToggle'),
    vadToggle: document.getElementById('vadToggle'),
    toggleBtn: document.getElementById('toggleBtn'),
    optionsBtn: document.getElementById('optionsBtn'),
    helpLink: document.getElementById('helpLink'),
    privacyLink: document.getElementById('privacyLink')
  };

  // الإعدادات الحالية
  let settings = {
    targetLang: 'ar',
    engine: 'google',
    showOriginal: false,
    vadEnabled: true
  };

  let isTranslating = false;

  // =============================================================================
  // دوال مساعدة
  // =============================================================================

  /**
   * حفظ الإعدادات
   */
  function saveSettings() {
    chrome.storage.sync.set({
      targetLang: settings.targetLang,
      engine: settings.engine,
      showOriginal: settings.showOriginal,
      vadEnabled: settings.vadEnabled
    }, () => {
      // إرسال التحديثات للنشطة
      chrome.runtime.sendMessage({
        action: 'UPDATE_SETTINGS',
        settings
      });
    });
  }

  /**
   * تحديث واجهة المستخدم
   */
  function updateUI() {
    elements.targetLang.value = settings.targetLang;
    elements.engine.value = settings.engine;
    
    elements.showOriginalToggle.classList.toggle('active', settings.showOriginal);
    elements.vadToggle.classList.toggle('active', settings.vadEnabled);
  }

  /**
   * تحديث حالة الترجمة
   */
  async function updateTranslationStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_TRANSLATION_STATUS' });
      
      isTranslating = response?.isTranslating || false;
      
      elements.statusIndicator.classList.toggle('active', isTranslating);
      elements.statusText.textContent = isTranslating ? 'نشط' : 'غير نشط';
      elements.toggleBtn.textContent = isTranslating ? 'إيقاف الترجمة' : 'بدء الترجمة';
      
      // تحديث نص الزر
      if (isTranslating) {
        elements.toggleBtn.classList.remove('btn-secondary');
        elements.toggleBtn.classList.add('btn-primary');
      } else {
        elements.toggleBtn.classList.add('btn-secondary');
        elements.toggleBtn.classList.remove('btn-primary');
      }
    } catch (error) {
      console.error('فشل في الحصول على حالة الترجمة:', error);
    }
  }

  // =============================================================================
  // معالجات الأحداث
  // =============================================================================

  // تغيير لغة الترجمة
  elements.targetLang.addEventListener('change', () => {
    settings.targetLang = elements.targetLang.value;
    saveSettings();
  });

  // تغيير محرك الترجمة
  elements.engine.addEventListener('change', () => {
    settings.engine = elements.engine.value;
    saveSettings();
  });

  // تبديل عرض النص الأصلي
  elements.showOriginalToggle.addEventListener('click', () => {
    settings.showOriginal = !settings.showOriginal;
    elements.showOriginalToggle.classList.toggle('active', settings.showOriginal);
    saveSettings();
  });

  // تبديل VAD
  elements.vadToggle.addEventListener('click', () => {
    settings.vadEnabled = !settings.vadEnabled;
    elements.vadToggle.classList.toggle('active', settings.vadEnabled);
    saveSettings();
  });

  // زر التبديل
  elements.toggleBtn.addEventListener('click', async () => {
    try {
      if (isTranslating) {
        await chrome.runtime.sendMessage({ action: 'STOP_TRANSLATION' });
      } else {
        await chrome.runtime.sendMessage({ action: 'START_TRANSLATION' });
      }
      updateTranslationStatus();
    } catch (error) {
      console.error('فشل في تبديل الترجمة:', error);
    }
  });

  // زر الإعدادات
  elements.optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // روابط المساعدة والخصوصية
  elements.helpLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/amjadakram738-arch/AK-HD-translation' });
  });

  elements.privacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/amjadakram738-arch/AK-HD-translation#privacy' });
  });

  // =============================================================================
  // الاستماع للرسائل
  // =============================================================================

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'TRANSLATION_STATUS_CHANGED') {
      isTranslating = message.isTranslating;
      updateTranslationStatus();
    }
  });

  // =============================================================================
  // التهيئة
  // =============================================================================

  async function initialize() {
    try {
      // تحميل الإعدادات
      const stored = await new Promise((resolve) => {
        chrome.storage.sync.get(
          ['targetLang', 'engine', 'showOriginal', 'vadEnabled'],
          resolve
        );
      });

      settings = {
        targetLang: stored.targetLang || 'ar',
        engine: stored.engine || 'google',
        showOriginal: stored.showOriginal || false,
        vadEnabled: stored.vadEnabled !== false
      };

      updateUI();
      await updateTranslationStatus();

      // تحديث دوري للحالة
      setInterval(updateTranslationStatus, 2000);
    } catch (error) {
      console.error('فشل في تهيئة Popup:', error);
    }
  }

  // بدء التهيئة
  initialize();
})();
