/* global chrome */

/**
 * popup.js
 * المسؤوليات: إدارة واجهة الإعدادات وحفظ تفضيلات المستخدم + التحكم في بدء/إيقاف الترجمة.
 */

let currentStatus = 'off';

const LANGUAGES = [
  { code: 'ar', name: 'العربية' },
  { code: 'en', name: 'الإنجليزية' },
  { code: 'fr', name: 'الفرنسية' },
  { code: 'es', name: 'الإسبانية' },
  { code: 'de', name: 'الألمانية' },
  { code: 'it', name: 'الإيطالية' },
  { code: 'pt', name: 'البرتغالية' },
  { code: 'ru', name: 'الروسية' },
  { code: 'uk', name: 'الأوكرانية' },
  { code: 'pl', name: 'البولندية' },
  { code: 'nl', name: 'الهولندية' },
  { code: 'sv', name: 'السويدية' },
  { code: 'no', name: 'النرويجية' },
  { code: 'da', name: 'الدنماركية' },
  { code: 'fi', name: 'الفنلندية' },
  { code: 'cs', name: 'التشيكية' },
  { code: 'sk', name: 'السلوفاكية' },
  { code: 'hu', name: 'الهنغارية' },
  { code: 'ro', name: 'الرومانية' },
  { code: 'bg', name: 'البلغارية' },
  { code: 'el', name: 'اليونانية' },
  { code: 'tr', name: 'التركية' },
  { code: 'fa', name: 'الفارسية' },
  { code: 'he', name: 'العبرية' },
  { code: 'ur', name: 'الأردية' },
  { code: 'hi', name: 'الهندية' },
  { code: 'bn', name: 'البنغالية' },
  { code: 'ta', name: 'التاميلية' },
  { code: 'te', name: 'التيلجو' },
  { code: 'id', name: 'الإندونيسية' },
  { code: 'ms', name: 'الماليزية' },
  { code: 'th', name: 'التايلاندية' },
  { code: 'vi', name: 'الفيتنامية' },
  { code: 'fil', name: 'الفلبينية' },
  { code: 'zh', name: 'الصينية' },
  { code: 'ja', name: 'اليابانية' },
  { code: 'ko', name: 'الكورية' },
  { code: 'sr', name: 'الصربية' },
  { code: 'hr', name: 'الكرواتية' },
  { code: 'sl', name: 'السلوفينية' },
  { code: 'lt', name: 'الليتوانية' },
  { code: 'lv', name: 'اللاتفية' },
  { code: 'et', name: 'الإستونية' },
  { code: 'ca', name: 'الكتالونية' },
  { code: 'eu', name: 'الباسكية' },
  { code: 'gl', name: 'الجاليكية' }
];

function getDefaultTargetLang() {
  const uiLang = (chrome.i18n?.getUILanguage?.() || navigator.language || 'en').toLowerCase();
  if (uiLang.startsWith('ar')) return 'ar';
  if (uiLang.startsWith('fr')) return 'fr';
  if (uiLang.startsWith('es')) return 'es';
  return 'en';
}

function populateLanguageSelect(selectEl, { includeAuto } = { includeAuto: false }) {
  selectEl.innerHTML = '';

  if (includeAuto) {
    const autoOpt = document.createElement('option');
    autoOpt.value = 'auto';
    autoOpt.textContent = 'تلقائي (اكتشاف اللغة)';
    selectEl.appendChild(autoOpt);
  }

  for (const lang of LANGUAGES) {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = lang.name;
    selectEl.appendChild(opt);
  }
}

function getActiveTabId() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs?.[0]?.id || null);
    });
  });
}

function updateToggleButton() {
  const toggleButton = document.getElementById('toggle-translation');
  const isOn = currentStatus === 'on';
  toggleButton.textContent = isOn ? 'إيقاف الترجمة' : 'بدء الترجمة';
  toggleButton.classList.toggle('active', isOn);
}

// تحميل الإعدادات المحفوظة عند فتح النافذة
document.addEventListener('DOMContentLoaded', async () => {
  populateLanguageSelect(document.getElementById('source-lang'), { includeAuto: true });
  populateLanguageSelect(document.getElementById('target-lang'), { includeAuto: false });

  loadSettings();
  updateStatusDisplay();
  updateToggleButton();

  document.getElementById('save-settings').addEventListener('click', saveSettings);
  document.getElementById('toggle-translation').addEventListener('click', toggleTranslation);

  checkTranslationStatus();
});

/**
 * تحميل الإعدادات من chrome.storage
 */
function loadSettings() {
  chrome.storage.sync.get(
    ['targetLang', 'sourceLang', 'engine', 'subtitleMode', 'subtitleSize', 'subtitlePosition'],
    (result) => {
      const targetLang = result.targetLang || getDefaultTargetLang();
      const sourceLang = result.sourceLang || 'auto';

      document.getElementById('target-lang').value = targetLang;
      document.getElementById('source-lang').value = sourceLang;

      if (result.engine) document.getElementById('engine').value = result.engine;
      if (result.subtitleMode) document.getElementById('subtitle-mode').value = result.subtitleMode;
      if (result.subtitleSize) document.getElementById('subtitle-size').value = result.subtitleSize;
      if (result.subtitlePosition) document.getElementById('subtitle-position').value = result.subtitlePosition;
    }
  );
}

/**
 * حفظ الإعدادات في chrome.storage
 */
function saveSettings() {
  const targetLang = document.getElementById('target-lang').value;
  const sourceLang = document.getElementById('source-lang').value;
  const engine = document.getElementById('engine').value;
  const subtitleMode = document.getElementById('subtitle-mode').value;
  const subtitleSize = document.getElementById('subtitle-size').value;
  const subtitlePosition = document.getElementById('subtitle-position').value;

  const settings = {
    targetLang,
    sourceLang,
    engine,
    subtitleMode,
    subtitleSize,
    subtitlePosition
  };

  chrome.storage.sync.set(settings, () => {
    chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings });

    const button = document.getElementById('save-settings');
    const originalText = button.textContent;
    button.textContent = '✓ تم الحفظ';
    button.style.backgroundColor = '#28a745';

    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = '#007bff';
    }, 1200);
  });
}

/**
 * التحقق من حالة الترجمة الحالية
 */
async function checkTranslationStatus() {
  const tabId = await getActiveTabId();
  if (!tabId) return;

  chrome.runtime.sendMessage({ action: 'GET_TRANSLATION_STATUS', tabId }, (response) => {
    if (response && response.isTranslating) {
      currentStatus = 'on';
    } else {
      currentStatus = 'off';
    }
    updateStatusDisplay();
    updateToggleButton();
  });
}

/**
 * تحديث عرض الحالة في الواجهة
 */
function updateStatusDisplay() {
  const statusElement = document.getElementById('status');
  if (currentStatus === 'on') {
    statusElement.textContent = 'نشط';
    statusElement.className = 'status-on';
  } else {
    statusElement.textContent = 'متوقف';
    statusElement.className = 'status-off';
  }
}

/**
 * تحديث حالة الترجمة
 */
async function setTranslationStatus(isTranslating) {
  currentStatus = isTranslating ? 'on' : 'off';
  updateStatusDisplay();
  updateToggleButton();

  const tabId = await getActiveTabId();
  if (!tabId) return;

  chrome.runtime.sendMessage({
    action: isTranslating ? 'START_TRANSLATION' : 'STOP_TRANSLATION',
    tabId
  });
}

/**
 * تبديل حالة الترجمة
 */
function toggleTranslation() {
  const newStatus = currentStatus === 'off' ? 'on' : 'off';
  setTranslationStatus(newStatus === 'on');
}

// تعريض الدوال للاختبار
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadSettings,
    saveSettings,
    checkTranslationStatus,
    updateStatusDisplay,
    setTranslationStatus,
    toggleTranslation
  };
}
