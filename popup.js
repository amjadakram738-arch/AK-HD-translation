/**
 * popup.js
 * المسؤوليات: إدارة واجهة الإعدادات وحفظ تفضيلات المستخدم
 */

// تحميل الإعدادات المحفوظة عند فتح النافذة
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    
    // إضافة مستمع لحفظ الإعدادات
    document.getElementById('save-settings').addEventListener('click', saveSettings);
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
