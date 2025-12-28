/**
 * background.js - Service Worker
 * المسؤوليات: إدارة الأحداث العامة، التواصل مع Proxy، وإدارة تيار الصوت.
 */

// 1. الاستماع لرسائل من Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "START_TRANSLATION") {
        handleStartTranslation(sender.tab.id);
    } else if (message.action === "STOP_TRANSLATION") {
        handleStopTranslation(sender.tab.id);
    } else if (message.action === "AUDIO_DATA") {
        sendToProxy(message.data, sender.tab.id);
    }
});

/**
 * بدء عملية التقاط الصوت للتبويب المحدد
 */
async function handleStartTranslation(tabId) {
    try {
        // استخدام tabCapture للحصول على تيار الصوت
        // ملاحظة: يجب استدعاء هذا استجابة لتفاعل مستخدم (تم في contentScript)
        chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
            if (!stream) {
                console.error("فشل التقاط الصوت:", chrome.runtime.lastError);
                return;
            }
            // تخزين التيار وإرساله للمعالجة
            setupAudioProcessing(stream, tabId);
        });
    } catch (error) {
        console.error("خطأ في بدء الترجمة:", error);
    }
}

/**
 * إرسال البيانات الصوتية إلى الخادم الوسيط (Proxy)
 */
/**
 * إرسال البيانات الصوتية إلى الخادم الوسيط (Proxy) باستخدام WebSocket للتدفق المستمر
 */
let socket = null;

function setupStreamingProxy(tabId) {
    const PROXY_WS_URL = "wss://api.yourproxy.com/v1/stt-streaming";
    socket = new WebSocket(PROXY_WS_URL);

    socket.onmessage = (event) => {
        const result = JSON.parse(event.data);
        // إرسال النتائج (الجزئية والنهائية) إلى Content Script فور وصولها
        chrome.tabs.sendMessage(tabId, {
            action: "NEW_SUBTITLE",
            text: result.translatedText,
            isFinal: result.isFinal
        });
    };

    socket.onerror = (error) => console.error("خطأ في اتصال التدفق:", error);
}

async function sendToProxy(audioChunk) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(audioChunk);
    }
}

function handleStopTranslation(tabId) {
    // منطق إيقاف التيار وتنظيف الموارد
    console.log("إيقاف الترجمة للتبويب:", tabId);
}

function setupAudioProcessing(stream, tabId) {
    // تحويل MediaStream إلى Chunks وإرسالها عبر sendToProxy
    // يتم استخدام AudioContext و ScriptProcessorNode أو AudioWorklet
}
