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
    } else if (message.action === "GET_TRANSLATION_STATUS") {
        sendResponse({ isTranslating: isProcessing });
    }
});

// متغيرات حالة عالمية
let socket = null;
let audioContext = null;
let mediaStreamSource = null;
let processor = null;
let activeTabId = null;
let isProcessing = false;

/**
 * بدء عملية التقاط الصوت للتبويب المحدد
 */
async function handleStartTranslation(tabId) {
    try {
        // التحقق من وجود جلسة نشطة بالفعل
        if (isProcessing) {
            console.log("هناك جلسة ترجمة نشطة بالفعل. إيقافها أولاً...");
            handleStopTranslation(activeTabId);
        }

        console.log("بدء عملية التقاط الصوت للتبويب:", tabId);
        activeTabId = tabId;
        isProcessing = true;

        // استخدام tabCapture للحصول على تيار الصوت
        // ملاحظة: يجب استدعاء هذا استجابة لتفاعل مستخدم (تم في contentScript)
        chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
            if (!stream) {
                console.error("فشل التقاط الصوت:", chrome.runtime.lastError);
                isProcessing = false;
                return;
            }
            
            console.log("تم التقاط تيار الصوت بنجاح:", stream);
            
            // إعداد اتصال WebSocket أولاً
            setupStreamingProxy(tabId);
            
            // ثم إعداد معالجة الصوت
            setupAudioProcessing(stream, tabId);
        });
    } catch (error) {
        console.error("خطأ في بدء الترجمة:", error);
        isProcessing = false;
    }
}

/**
 * إعداد اتصال WebSocket مع الخادم الوسيط
 */
function setupStreamingProxy(tabId) {
    const PROXY_WS_URL = "wss://api.yourproxy.com/v1/stt-streaming";
    
    // إغلاق اتصال سابق إذا كان موجوداً
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
    }
    
    socket = new WebSocket(PROXY_WS_URL);

    socket.onopen = () => {
        console.log("تم الاتصال بخادم التدفق بنجاح");
        
        // إرسال معلومات التكوين الأولية
        chrome.storage.sync.get(['targetLang', 'engine'], (settings) => {
            const config = {
                action: "CONFIGURE",
                targetLang: settings.targetLang || 'ar',
                engine: settings.engine || 'google'
            };
            socket.send(JSON.stringify(config));
        });
    };

    socket.onmessage = (event) => {
        try {
            const result = JSON.parse(event.data);
            console.log("استلام نتيجة من الخادم:", result);
            
            // إرسال النتائج (الجزئية والنهائية) إلى Content Script فور وصولها
            chrome.tabs.sendMessage(tabId, {
                action: "NEW_SUBTITLE",
                text: result.translatedText,
                isFinal: result.isFinal,
                originalText: result.originalText
            }).catch(error => {
                console.error("فشل في إرسال الرسالة إلى Content Script:", error);
            });
        } catch (error) {
            console.error("فشل في تحليل رسالة WebSocket:", error);
        }
    };

    socket.onerror = (error) => {
        console.error("خطأ في اتصال التدفق:", error);
        chrome.tabs.sendMessage(tabId, {
            action: "TRANSLATION_ERROR",
            error: "فشل في الاتصال بخادم الترجمة"
        });
    };

    socket.onclose = () => {
        console.log("تم إغلاق اتصال WebSocket");
        if (isProcessing) {
            // إعادة الاتصال تلقائياً
            setTimeout(() => setupStreamingProxy(tabId), 5000);
        }
    };
}

/**
 * إرسال البيانات الصوتية إلى الخادم الوسيط (Proxy)
 */
async function sendToProxy(audioChunk) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        try {
            socket.send(audioChunk);
        } catch (error) {
            console.error("فشل في إرسال البيانات الصوتية:", error);
        }
    } else {
        console.warn("WebSocket غير متصل. تجاهل البيانات الصوتية.");
    }
}

/**
 * إيقاف عملية الترجمة وتنظيف الموارد
 */
function handleStopTranslation(tabId) {
    console.log("إيقاف الترجمة للتبويب:", tabId);
    
    // إغلاق اتصال WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
    }
    
    // تنظيف موارد AudioContext
    if (processor) {
        processor.disconnect();
        processor = null;
    }
    
    if (mediaStreamSource) {
        mediaStreamSource.disconnect();
        mediaStreamSource = null;
    }
    
    if (audioContext) {
        audioContext.close().then(() => {
            console.log("تم إغلاق AudioContext بنجاح");
        });
        audioContext = null;
    }
    
    isProcessing = false;
    activeTabId = null;
}

/**
 * إعداد معالجة الصوت باستخدام AudioContext
 */
function setupAudioProcessing(stream, tabId) {
    try {
        // إنشاء AudioContext جديد
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        
        // استخدام ScriptProcessorNode لمعالجة الصوت (ملاحظة: قد يكون deprecated في بعض المتصفحات)
        // بديل حديث: AudioWorkletNode
        processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        // توصيل العقد
        mediaStreamSource.connect(processor);
        processor.connect(audioContext.destination);
        
        // إعداد معالج الصوت
        processor.onaudioprocess = (e) => {
            if (!isProcessing) return;
            
            // الحصول على البيانات الصوتية من القناة اليسرى (mono)
            const inputData = e.inputBuffer.getChannelData(0);
            const audioChunk = convertFloat32ToInt16(inputData);
            
            // إرسال البيانات الصوتية إلى الخادم الوسيط
            sendToProxy(audioChunk);
        };
        
        console.log("تم إعداد معالجة الصوت بنجاح");
        
    } catch (error) {
        console.error("فشل في إعداد معالجة الصوت:", error);
        handleStopTranslation(tabId);
        
        // محاولة استخدام AudioWorklet كبديل
        try {
            setupAudioWorkletProcessing(stream, tabId);
        } catch (workletError) {
            console.error("فشل في إعداد AudioWorklet أيضاً:", workletError);
        }
    }
}

/**
 * إعداد معالجة الصوت باستخدام AudioWorklet (طريقة حديثة)
 */
async function setupAudioWorkletProcessing(stream, tabId) {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        
        // تسجيل AudioWorklet Processor
        await audioContext.audioWorklet.addModule('audio-processor.js');
        
        const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
        mediaStreamSource.connect(workletNode);
        workletNode.connect(audioContext.destination);
        
        // إعداد معالج الأحداث
        workletNode.port.onmessage = (event) => {
            if (event.data.type === 'audioChunk') {
                sendToProxy(event.data.chunk);
            }
        };
        
        console.log("تم إعداد AudioWorklet بنجاح");
        
    } catch (error) {
        console.error("فشل في إعداد AudioWorklet:", error);
        handleStopTranslation(tabId);
    }
}

/**
 * تحويل بيانات Float32 إلى Int16 (تنسيق شائع في معالجة الصوت)
 */
function convertFloat32ToInt16(buffer) {
    const l = buffer.length;
    const buf = new Int16Array(l);
    
    for (let i = 0; i < l; i++) {
        const s = Math.max(-1, Math.min(1, buffer[i]));
        buf[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    return buf.buffer;
}

// الاستماع لتغييرات التبويب لإدارة حالة الترجمة
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === activeTabId) {
        handleStopTranslation(tabId);
    }
});

// الاستماع لأخطاء التصفح
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tabId === activeTabId && changeInfo.status === 'complete' && !tab.url.startsWith('http')) {
        handleStopTranslation(tabId);
    }
});
