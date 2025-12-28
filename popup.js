/**
 * popup.js
 * المسؤوليات: إدارة واجهة الإعدادات وحفظ تفضيلات المستخدم
 */

// متغيرات حالة عالمية
let currentStatus = 'off';

// تحميل الإعدادات المحفوظة عند فتح النافذة
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    updateStatusDisplay();
    
    // إضافة مستمع لحفظ الإعدادات
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    
    // إضافة مستمع لزر التبديل
    document.getElementById('toggle-translation').addEventListener('click', toggleTranslation);
    
    // التحقق من حالة الترجمة الحالية
    checkTranslationStatus();
});

/**
 * تحميل الإعدادات من chrome.storage
 */
function loadSettings() {
    chrome.storage.sync.get(['targetLang', 'engine'], (result) => {
        if (result.targetLang) {
            document.getElementById('target-lang').value = result.targetLang;
        }
        if (result.engine) {
            document.getElementById('engine').value = result.engine;
        }
    });
}

/**
 * حفظ الإعدادات في chrome.storage
 */
function saveSettings() {
    const targetLang = document.getElementById('target-lang').value;
    const engine = document.getElementById('engine').value;
    
    chrome.storage.sync.set({
        targetLang: targetLang,
        engine: engine
    }, () => {
        // تأكيد بصري للحفظ
        const button = document.getElementById('save-settings');
        const originalText = button.textContent;
        button.textContent = '✓ تم الحفظ';
        button.style.backgroundColor = '#28a745';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = '#007bff';
        }, 2000);
    });
}

/**
 * التحقق من حالة الترجمة الحالية
 */
function checkTranslationStatus() {
    chrome.runtime.sendMessage({action: "GET_TRANSLATION_STATUS"}, (response) => {
        if (response && response.isTranslating) {
            currentStatus = 'on';
            updateStatusDisplay();
        }
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
function setTranslationStatus(isTranslating) {
    currentStatus = isTranslating ? 'on' : 'off';
    updateStatusDisplay();
    
    // إرسال حالة إلى background
    if (isTranslating) {
        chrome.runtime.sendMessage({action: "START_TRANSLATION"});
    } else {
        chrome.runtime.sendMessage({action: "STOP_TRANSLATION"});
    }
}

/**
 * تبديل حالة الترجمة
 */
function toggleTranslation() {
    const newStatus = currentStatus === 'off' ? 'on' : 'off';
    setTranslationStatus(newStatus === 'on');
    
    // تحديث نص الزر
    const toggleButton = document.getElementById('toggle-translation');
    toggleButton.textContent = newStatus === 'on' ? 'إيقاف الترجمة' : 'بدء الترجمة';
    toggleButton.classList.toggle('active', newStatus === 'on');
}

// تعريض الدوال للاختبار
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadSettings,
        saveSettings,
        checkTranslationStatus,
        updateStatusDisplay,
        setTranslationStatus
    };
}
