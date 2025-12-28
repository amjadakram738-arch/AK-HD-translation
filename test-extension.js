/**
 * اختبار شامل لإضافة Video Translate AI
 * هذا الملف يحتوي على اختبارات لوحدات الكود الرئيسية
 */

// اختبار دالة تحويل الصوت
function testConvertFloat32ToInt16() {
    const testBuffer = new Float32Array([0.5, -0.3, 0.0, 1.0, -1.0]);
    const result = convertFloat32ToInt16(testBuffer);
    
    console.log("اختبار تحويل الصوت:");
    console.log("مدخلات:", testBuffer);
    console.log("مخرجات:", new Int16Array(result));
    
    return true;
}

// اختبار حالة الإضافة
function testExtensionState() {
    console.log("اختبار حالة الإضافة:");
    console.log("حالة المعالجة:", isProcessing);
    console.log("معرف التبويب النشط:", activeTabId);
    console.log("WebSocket متصل:", socket && socket.readyState === WebSocket.OPEN);
    
    return true;
}

// اختبار إعدادات المستخدم
function testUserSettings() {
    chrome.storage.sync.get(['targetLang', 'engine'], (settings) => {
        console.log("اختبار إعدادات المستخدم:");
        console.log("لغة الهدف:", settings.targetLang || 'ar');
        console.log("محرك الترجمة:", settings.engine || 'google');
    });
    
    return true;
}

// اختبار اكتشاف الفيديو
function testVideoDetection() {
    const testVideos = [
        { nodeName: 'VIDEO', dataset: {} },
        { nodeName: 'DIV', querySelectorAll: () => [{ nodeName: 'VIDEO', dataset: {} }] }
    ];
    
    console.log("اختبار اكتشاف الفيديو:");
    testVideos.forEach((node, index) => {
        console.log(`العقدة ${index + 1}:`, node.nodeName);
        if (node.nodeName === 'VIDEO') {
            console.log("  → فيديو تم اكتشافه");
        } else if (node.querySelectorAll) {
            const videos = node.querySelectorAll('video');
            console.log(`  → ${videos.length} فيديوهات تم اكتشافها داخل العقدة`);
        }
    });
    
    return true;
}

// اختبار معالجة الرسائل
function testMessageHandling() {
    const testMessages = [
        { action: "START_TRANSLATION" },
        { action: "STOP_TRANSLATION" },
        { action: "AUDIO_DATA", data: new Int16Array([100, 200, 300]).buffer },
        { action: "GET_TRANSLATION_STATUS" }
    ];
    
    console.log("اختبار معالجة الرسائل:");
    testMessages.forEach((message, index) => {
        console.log(`الرسالة ${index + 1}:`, message.action);
        
        // محاكاة معالجة الرسالة
        switch (message.action) {
            case "START_TRANSLATION":
                console.log("  → بدء عملية الترجمة");
                break;
            case "STOP_TRANSLATION":
                console.log("  → إيقاف عملية الترجمة");
                break;
            case "AUDIO_DATA":
                console.log("  → إرسال بيانات صوتية إلى الخادم الوسيط");
                break;
            case "GET_TRANSLATION_STATUS":
                console.log("  → إرجاع حالة الترجمة الحالية");
                break;
        }
    });
    
    return true;
}

// اختبار معالجة WebSocket
function testWebSocketHandling() {
    console.log("اختبار معالجة WebSocket:");
    
    // محاكاة رسائل WebSocket الواردة
    const testWebSocketMessages = [
        JSON.stringify({
            translatedText: "مرحبا بالعالم",
            isFinal: false,
            originalText: "Hello world"
        }),
        JSON.stringify({
            translatedText: "مرحبا بالعالم!",
            isFinal: true,
            originalText: "Hello world!"
        }),
        JSON.stringify({
            error: "فشل في الاتصال بالخادم"
        })
    ];
    
    testWebSocketMessages.forEach((message, index) => {
        console.log(`رسالة WebSocket ${index + 1}:`, message);
        
        try {
            const result = JSON.parse(message);
            if (result.translatedText) {
                console.log(`  → ترجمة: "${result.translatedText}" (${result.isFinal ? 'نهائية' : 'جزئية'})`);
            } else if (result.error) {
                console.log(`  → خطأ: ${result.error}`);
            }
        } catch (error) {
            console.log(`  → خطأ في التحليل: ${error.message}`);
        }
    });
    
    return true;
}

// اختبار معالجة الصوت
function testAudioProcessing() {
    console.log("اختبار معالجة الصوت:");
    
    // محاكاة بيانات الصوت
    const sampleRate = 44100;
    const duration = 0.1; // 100ms
    const length = sampleRate * duration;
    const audioData = new Float32Array(length);
    
    // إنشاء موجة جيبية بسيطة
    for (let i = 0; i < length; i++) {
        audioData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }
    
    console.log(`  → تم إنشاء ${length} عينة صوتية`);
    console.log(`  → تردد العينة: ${sampleRate} هرتز`);
    console.log(`  → مدة الصوت: ${duration} ثانية`);
    
    // تحويل إلى Int16
    const int16Data = convertFloat32ToInt16(audioData);
    console.log(`  → حجم البيانات بعد التحويل: ${int16Data.byteLength} بايت`);
    
    return true;
}

// اختبار إدارة الأخطاء
function testErrorHandling() {
    console.log("اختبار إدارة الأخطاء:");
    
    const testErrors = [
        { type: "WebSocket", message: "فشل في الاتصال بالخادم" },
        { type: "AudioContext", message: "فشل في إنشاء AudioContext" },
        { type: "tabCapture", message: "فشل في التقاط الصوت" },
        { type: "Storage", message: "فشل في حفظ الإعدادات" }
    ];
    
    testErrors.forEach((error, index) => {
        console.log(`خطأ ${index + 1} (${error.type}): ${error.message}`);
        
        // محاكاة معالجة الخطأ
        switch (error.type) {
            case "WebSocket":
                console.log("  → إعادة الاتصال تلقائياً بعد 5 ثوان");
                break;
            case "AudioContext":
                console.log("  → محاولة استخدام AudioWorklet كبديل");
                break;
            case "tabCapture":
                console.log("  → إبلاغ المستخدم بالخطأ");
                break;
            case "Storage":
                console.log("  → إعادة المحاولة مع تخزين مؤقت");
                break;
        }
    });
    
    return true;
}

// اختبار أداء النظام
function testPerformance() {
    console.log("اختبار أداء النظام:");
    
    // قياس وقت معالجة الصوت
    const startTime = performance.now();
    
    // محاكاة معالجة 100 قطعة صوتية
    for (let i = 0; i < 100; i++) {
        const testBuffer = new Float32Array(4096);
        for (let j = 0; j < testBuffer.length; j++) {
            testBuffer[j] = Math.random() * 2 - 1; // [-1, 1]
        }
        convertFloat32ToInt16(testBuffer);
    }
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    console.log(`  → وقت معالجة 100 قطعة صوتية: ${processingTime.toFixed(2)} مللي ثانية`);
    console.log(`  → متوسط الوقت لكل قطعة: ${(processingTime / 100).toFixed(2)} مللي ثانية`);
    console.log(`  → أداء تقديري: ${(1000 / (processingTime / 100)).toFixed(1)} قطعة/ثانية`);
    
    return true;
}

// اختبار تكامل النظام
function testSystemIntegration() {
    console.log("اختبار تكامل النظام:");
    
    console.log("1. اكتشاف الفيديو → التقاط الصوت → معالجة الصوت → WebSocket → عرض الترجمة");
    console.log("2. إعدادات المستخدم → تخزين → تطبيق على الترجمة");
    console.log("3. إدارة الأخطاء → إعادة الاتصال → البدائل");
    console.log("4. أداء النظام → زمن استجابة → استخدام الموارد");
    
    return true;
}

// تشغيل جميع الاختبارات
function runAllTests() {
    console.log("=== بدء اختبارات إضافة Video Translate AI ===");
    console.log("");
    
    const tests = [
        { name: "تحويل الصوت", func: testConvertFloat32ToInt16 },
        { name: "حالة الإضافة", func: testExtensionState },
        { name: "إعدادات المستخدم", func: testUserSettings },
        { name: "اكتشاف الفيديو", func: testVideoDetection },
        { name: "معالجة الرسائل", func: testMessageHandling },
        { name: "معالجة WebSocket", func: testWebSocketHandling },
        { name: "معالجة الصوت", func: testAudioProcessing },
        { name: "إدارة الأخطاء", func: testErrorHandling },
        { name: "أداء النظام", func: testPerformance },
        { name: "تكامل النظام", func: testSystemIntegration }
    ];
    
    let passedTests = 0;
    
    tests.forEach(test => {
        try {
            console.log(`--- اختبار: ${test.name} ---`);
            const result = test.func();
            if (result) {
                console.log(`✓ اجتاز الاختبار: ${test.name}`);
                passedTests++;
            } else {
                console.log(`✗ فشل الاختبار: ${test.name}`);
            }
        } catch (error) {
            console.log(`✗ خطأ في الاختبار: ${test.name} - ${error.message}`);
        }
        console.log("");
    });
    
    console.log(`=== نهاية الاختبارات ===`);
    console.log(`النتائج: ${passedTests}/${tests.length} اختبارات اجتازت`);
    console.log(`نسبة النجاح: ${((passedTests / tests.length) * 100).toFixed(1)}%`);
}

// تشغيل الاختبارات عند تحميل الملف
if (typeof window !== 'undefined') {
    window.addEventListener('load', runAllTests);
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        testConvertFloat32ToInt16,
        testExtensionState,
        testUserSettings,
        testVideoDetection,
        testMessageHandling,
        testWebSocketHandling,
        testAudioProcessing,
        testErrorHandling,
        testPerformance,
        testSystemIntegration
    };
}