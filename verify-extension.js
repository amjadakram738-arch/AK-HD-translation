/**
 * نص التحقق النهائي لإضافة Video Translate AI
 * هذا الملف يتحقق من أن جميع الملفات والمكونات جاهزة للإنتاج
 */

const fs = require('fs');
const path = require('path');

// قائمة الملفات المطلوبة
const requiredFiles = [
    'manifest.json',
    'background.js',
    'contentScript.js',
    'popup.html',
    'popup.js',
    'styles.css',
    'audio-processor.js',
    'offscreen.html',
    'offscreen.js',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png'
];

// قائمة الدوال المطلوبة في background.js
const requiredBackgroundFunctions = [
    'handleStartTranslation',
    'handleStopTranslation',
    'setupStreamingProxy',
    'sendToProxy',
    'setupAudioProcessing',
    'setupAudioWorkletProcessing',
    'convertFloat32ToInt16'
];

// قائمة الدوال المطلوبة في contentScript.js
const requiredContentScriptFunctions = [
    'initVideoDetection',
    'attachFloatingIcon',
    'toggleTranslation',
    'createSubtitleOverlay',
    'removeSubtitleOverlay'
];

// قائمة الدوال المطلوبة في popup.js
const requiredPopupFunctions = [
    'loadSettings',
    'saveSettings',
    'checkTranslationStatus',
    'updateStatusDisplay',
    'setTranslationStatus',
    'toggleTranslation'
];

// قائمة الرسائل المطلوبة
const requiredMessages = [
    'START_TRANSLATION',
    'STOP_TRANSLATION',
    'AUDIO_DATA',
    'NEW_SUBTITLE',
    'TRANSLATION_ERROR',
    'GET_TRANSLATION_STATUS'
];

// قائمة الأذونات المطلوبة
const requiredPermissions = [
    'tabs',
    'activeTab',
    'storage',
    'tabCapture',
    'scripting',
    'offscreen'
];

// قائمة الموارد القابلة للوصول من الويب
const requiredWebAccessibleResources = [
    'styles.css',
    'icons/*',
    'audio-processor.js'
];

// التحقق من وجود جميع الملفات
function verifyFiles() {
    console.log("📁 التحقق من وجود جميع الملفات المطلوبة...");
    
    let allFilesExist = true;
    requiredFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            console.log(`   ✓ ${file}`);
        } else {
            console.log(`   ✗ ${file} - مفقود`);
            allFilesExist = false;
        }
    });
    
    return allFilesExist;
}

// التحقق من manifest.json
function verifyManifest() {
    console.log("\n📋 التحقق من manifest.json...");
    
    try {
        const manifestPath = path.join(__dirname, 'manifest.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // التحقق من الإصدار
        if (manifest.manifest_version === 3) {
            console.log("   ✓ Manifest V3");
        } else {
            console.log("   ✗ إصدار Manifest غير صحيح");
            return false;
        }
        
        // التحقق من الأذونات
        let allPermissionsPresent = true;
        requiredPermissions.forEach(permission => {
            if (manifest.permissions.includes(permission)) {
                console.log(`   ✓ إذن: ${permission}`);
            } else {
                console.log(`   ✗ إذن مفقود: ${permission}`);
                allPermissionsPresent = false;
            }
        });
        
        // التحقق من الموارد القابلة للوصول من الويب
        let allResourcesPresent = true;
        requiredWebAccessibleResources.forEach(resource => {
            const resourceFound = manifest.web_accessible_resources.some(
                res => res.resources.includes(resource)
            );
            if (resourceFound) {
                console.log(`   ✓ مورد قابل للوصول: ${resource}`);
            } else {
                console.log(`   ✗ مورد قابل للوصول مفقود: ${resource}`);
                allResourcesPresent = false;
            }
        });
        
        return allPermissionsPresent && allResourcesPresent;
        
    } catch (error) {
        console.log("   ✗ خطأ في قراءة manifest.json:", error.message);
        return false;
    }
}

// التحقق من background.js
function verifyBackgroundJS() {
    console.log("\n🔧 التحقق من background.js...");
    
    try {
        const backgroundPath = path.join(__dirname, 'background.js');
        const backgroundContent = fs.readFileSync(backgroundPath, 'utf8');
        
        // التحقق من الدوال
        let allFunctionsPresent = true;
        requiredBackgroundFunctions.forEach(func => {
            if (backgroundContent.includes(`function ${func}`)) {
                console.log(`   ✓ دالة: ${func}`);
            } else {
                console.log(`   ✗ دالة مفقودة: ${func}`);
                allFunctionsPresent = false;
            }
        });
        
        // التحقق من الرسائل
        let allMessagesPresent = true;
        requiredMessages.forEach(message => {
            const dq = `"${message}"`;
            const sq = `'${message}'`;
            if (backgroundContent.includes(dq) || backgroundContent.includes(sq)) {
                console.log(`   ✓ رسالة: ${message}`);
            } else {
                console.log(`   ✗ رسالة مفقودة: ${message}`);
                allMessagesPresent = false;
            }
        });
        
        // التحقق من المتغيرات العالمية
        const requiredVariables = ['socket', 'audioContext', 'mediaStreamSource', 'processor', 'activeTabId', 'isProcessing'];
        let allVariablesPresent = true;
        requiredVariables.forEach(variable => {
            if (backgroundContent.includes(`let ${variable}`) || backgroundContent.includes(`const ${variable}`)) {
                console.log(`   ✓ متغير: ${variable}`);
            } else {
                console.log(`   ✗ متغير مفقود: ${variable}`);
                allVariablesPresent = false;
            }
        });
        
        return allFunctionsPresent && allMessagesPresent && allVariablesPresent;
        
    } catch (error) {
        console.log("   ✗ خطأ في قراءة background.js:", error.message);
        return false;
    }
}

// التحقق من contentScript.js
function verifyContentScriptJS() {
    console.log("\n📽 التحقق من contentScript.js...");
    
    try {
        const contentScriptPath = path.join(__dirname, 'contentScript.js');
        const contentScriptContent = fs.readFileSync(contentScriptPath, 'utf8');
        
        // التحقق من الدوال
        let allFunctionsPresent = true;
        requiredContentScriptFunctions.forEach(func => {
            if (contentScriptContent.includes(`function ${func}`)) {
                console.log(`   ✓ دالة: ${func}`);
            } else {
                console.log(`   ✗ دالة مفقودة: ${func}`);
                allFunctionsPresent = false;
            }
        });
        
        // التحقق من الرسائل (فقط الرسائل ذات الصلة بـ contentScript)
        const contentScriptMessages = ['START_TRANSLATION', 'STOP_TRANSLATION', 'NEW_SUBTITLE', 'TRANSLATION_ERROR'];
        let allMessagesPresent = true;
        contentScriptMessages.forEach(message => {
            const dq = `"${message}"`;
            const sq = `'${message}'`;
            if (contentScriptContent.includes(dq) || contentScriptContent.includes(sq)) {
                console.log(`   ✓ رسالة: ${message}`);
            } else {
                console.log(`   ✗ رسالة مفقودة: ${message}`);
                allMessagesPresent = false;
            }
        });
        
        return allFunctionsPresent && allMessagesPresent;
        
    } catch (error) {
        console.log("   ✗ خطأ في قراءة contentScript.js:", error.message);
        return false;
    }
}

// التحقق من popup.js
function verifyPopupJS() {
    console.log("\n🎛 التحقق من popup.js...");
    
    try {
        const popupPath = path.join(__dirname, 'popup.js');
        const popupContent = fs.readFileSync(popupPath, 'utf8');
        
        // التحقق من الدوال
        let allFunctionsPresent = true;
        requiredPopupFunctions.forEach(func => {
            if (popupContent.includes(`function ${func}`)) {
                console.log(`   ✓ دالة: ${func}`);
            } else {
                console.log(`   ✗ دالة مفقودة: ${func}`);
                allFunctionsPresent = false;
            }
        });
        
        // التحقق من عناصر DOM
        const requiredElements = ['target-lang', 'engine', 'save-settings', 'status', 'toggle-translation'];
        let allElementsPresent = true;
        requiredElements.forEach(element => {
            if (popupContent.includes(`'${element}'`) || popupContent.includes(`"${element}"`)) {
                console.log(`   ✓ عنصر DOM: ${element}`);
            } else {
                console.log(`   ✗ عنصر DOM مفقود: ${element}`);
                allElementsPresent = false;
            }
        });
        
        return allFunctionsPresent && allElementsPresent;
        
    } catch (error) {
        console.log("   ✗ خطأ في قراءة popup.js:", error.message);
        return false;
    }
}

// التحقق من styles.css
function verifyStylesCSS() {
    console.log("\n🎨 التحقق من styles.css...");
    
    try {
        const stylesPath = path.join(__dirname, 'styles.css');
        const stylesContent = fs.readFileSync(stylesPath, 'utf8');
        
        // التحقق من الفئات الرئيسية
        const requiredClasses = [
            '.v-translate-icon',
            '.v-translate-overlay',
            '.popup-container',
            '.toggle-btn',
            '.status-on',
            '.status-off'
        ];
        
        let allClassesPresent = true;
        requiredClasses.forEach(className => {
            if (stylesContent.includes(className)) {
                console.log(`   ✓ فئة CSS: ${className}`);
            } else {
                console.log(`   ✗ فئة CSS مفقودة: ${className}`);
                allClassesPresent = false;
            }
        });
        
        return allClassesPresent;
        
    } catch (error) {
        console.log("   ✗ خطأ في قراءة styles.css:", error.message);
        return false;
    }
}

// التحقق من audio-processor.js
function verifyAudioProcessor() {
    console.log("\n🔊 التحقق من audio-processor.js...");
    
    try {
        const audioProcessorPath = path.join(__dirname, 'audio-processor.js');
        const audioProcessorContent = fs.readFileSync(audioProcessorPath, 'utf8');
        
        // التحقق من الفئات والدوال الأساسية
        const requiredItems = [
            'class AudioProcessor',
            'extends AudioWorkletProcessor',
            'process(inputs, outputs, parameters)',
            'sendAudioChunk()',
            'registerProcessor'
        ];
        
        let allItemsPresent = true;
        requiredItems.forEach(item => {
            if (audioProcessorContent.includes(item)) {
                console.log(`   ✓ عنصر: ${item}`);
            } else {
                console.log(`   ✗ عنصر مفقود: ${item}`);
                allItemsPresent = false;
            }
        });
        
        return allItemsPresent;
        
    } catch (error) {
        console.log("   ✗ خطأ في قراءة audio-processor.js:", error.message);
        return false;
    }
}

// التحقق من popup.html
function verifyPopupHTML() {
    console.log("\n📄 التحقق من popup.html...");
    
    try {
        const popupHTMLPath = path.join(__dirname, 'popup.html');
        const popupHTMLContent = fs.readFileSync(popupHTMLPath, 'utf8');
        
        // التحقق من العناصر الأساسية
        const requiredElements = [
            '<!DOCTYPE html>',
            '<html lang="ar"',
            'id="target-lang"',
            'id="engine"',
            'id="save-settings"',
            'id="toggle-translation"',
            'id="status"'
        ];
        
        let allElementsPresent = true;
        requiredElements.forEach(element => {
            if (popupHTMLContent.includes(element)) {
                console.log(`   ✓ عنصر HTML: ${element}`);
            } else {
                console.log(`   ✗ عنصر HTML مفقود: ${element}`);
                allElementsPresent = false;
            }
        });
        
        return allElementsPresent;
        
    } catch (error) {
        console.log("   ✗ خطأ في قراءة popup.html:", error.message);
        return false;
    }
}

// التحقق من أيقونات الإضافة
function verifyIcons() {
    console.log("\n🖼 التحقق من أيقونات الإضافة...");
    
    const iconFiles = ['icon16.png', 'icon48.png', 'icon128.png'];
    let allIconsPresent = true;
    
    iconFiles.forEach(icon => {
        const iconPath = path.join(__dirname, 'icons', icon);
        if (fs.existsSync(iconPath)) {
            console.log(`   ✓ أيقونة: ${icon}`);
        } else {
            console.log(`   ✗ أيقونة مفقودة: ${icon}`);
            allIconsPresent = false;
        }
    });
    
    return allIconsPresent;
}

// التحقق من التوثيق
function verifyDocumentation() {
    console.log("\n📚 التحقق من التوثيق...");
    
    const docFiles = [
        'README.md',
        'USAGE_GUIDE.md',
        'المرحلة-2-التصميم-المعماري.md',
        'SecurityBoundary.md - حدود الأمان ومعمارية الوكيل (Proxy Architecture).md'
    ];
    
    let allDocsPresent = true;
    docFiles.forEach(doc => {
        const docPath = path.join(__dirname, doc);
        if (fs.existsSync(docPath)) {
            console.log(`   ✓ توثيق: ${doc}`);
        } else {
            console.log(`   ✗ توثيق مفقود: ${doc}`);
            allDocsPresent = false;
        }
    });
    
    return allDocsPresent;
}

// التحقق من اختبارات النظام
function verifyTests() {
    console.log("\n🧪 التحقق من اختبارات النظام...");
    
    const testFiles = [
        'test-extension.js',
        'integration-test.js',
        'verify-extension.js'
    ];
    
    let allTestsPresent = true;
    testFiles.forEach(test => {
        const testPath = path.join(__dirname, test);
        if (fs.existsSync(testPath)) {
            console.log(`   ✓ اختبار: ${test}`);
        } else {
            console.log(`   ✗ اختبار مفقود: ${test}`);
            allTestsPresent = false;
        }
    });
    
    return allTestsPresent;
}

// التحقق من الجاهزية للإنتاج
function verifyProductionReadiness() {
    console.log("\n🚀 التحقق من الجاهزية للإنتاج...");
    
    const checks = [
        { name: "جميع الملفات موجودة", func: verifyFiles },
        { name: "manifest.json صحيح", func: verifyManifest },
        { name: "background.js كامل", func: verifyBackgroundJS },
        { name: "contentScript.js كامل", func: verifyContentScriptJS },
        { name: "popup.js كامل", func: verifyPopupJS },
        { name: "styles.css كامل", func: verifyStylesCSS },
        { name: "audio-processor.js كامل", func: verifyAudioProcessor },
        { name: "popup.html كامل", func: verifyPopupHTML },
        { name: "جميع الأيقونات موجودة", func: verifyIcons },
        { name: "التوثيق كامل", func: verifyDocumentation },
        { name: "جميع الاختبارات موجودة", func: verifyTests }
    ];
    
    let allChecksPassed = true;
    const results = [];
    
    checks.forEach(check => {
        try {
            const result = check.func();
            results.push({ name: check.name, passed: result });
            if (!result) {
                allChecksPassed = false;
            }
        } catch (error) {
            console.log(`   ✗ خطأ في التحقق ${check.name}:`, error.message);
            results.push({ name: check.name, passed: false });
            allChecksPassed = false;
        }
    });
    
    console.log("\n" + "=".repeat(50));
    console.log("📊 نتائج التحقق النهائية:");
    console.log("=".repeat(50));
    
    results.forEach(result => {
        const status = result.passed ? "✓ اجتاز" : "✗ فشل";
        console.log(`${status} ${result.name}`);
    });
    
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const successRate = ((passedCount / totalCount) * 100).toFixed(1);
    
    console.log("\n" + "=".repeat(50));
    console.log(`📈 الإحصائيات: ${passedCount}/${totalCount} (${successRate}%)`);
    console.log("=".repeat(50));
    
    if (allChecksPassed) {
        console.log("\n🎉 مبروك! الإضافة جاهزة للإنتاج! 🎉");
        console.log("✅ جميع التحققات اجتازت بنجاح");
        console.log("✅ يمكن تحميل الإضافة في Chrome");
        console.log("✅ يمكن نشر الإضافة إلى متجر Chrome Web Store");
    } else {
        console.log("\n⚠️ هناك بعض المشكلات التي تحتاج إلى إصلاح");
        console.log("⚠️ يرجى مراجعة الفحوصات الفاشلة أعلاه");
        console.log("⚠️ الإضافة ليست جاهزة للإنتاج بعد");
    }
    
    return allChecksPassed;
}

// تشغيل جميع التحققات
console.log("╔════════════════════════════════════════════════════════╗");
console.log("║  التحقق النهائي من إضافة Video Translate AI           ║");
console.log("╚════════════════════════════════════════════════════════╝");
console.log("");

const isProductionReady = verifyProductionReadiness();

// تعريض الدوال للاختبار
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        verifyFiles,
        verifyManifest,
        verifyBackgroundJS,
        verifyContentScriptJS,
        verifyPopupJS,
        verifyStylesCSS,
        verifyAudioProcessor,
        verifyPopupHTML,
        verifyIcons,
        verifyDocumentation,
        verifyTests,
        verifyProductionReadiness
    };
}

process.exit(isProductionReady ? 0 : 1);