/**
 * contentScript.js
 * المسؤوليات: اكتشاف الفيديو، إضافة الأيقونة العائمة، وعرض الترجمة.
 */

let floatingIcon = null;
let subtitleOverlay = null;
let isTranslating = false;

/**
 * 1. اكتشاف الفيديوهات تلقائياً عند تحميل الصفحة
 */
function initVideoDetection() {
    const videos = document.querySelectorAll('video');
    if (videos.length > 0) {
        videos.forEach(video => attachFloatingIcon(video));
    }

    // مراقبة إضافة فيديوهات جديدة ديناميكياً (مثل YouTube)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeName === 'VIDEO') {
                    attachFloatingIcon(node);
                } else if (node.querySelectorAll) {
                    const vids = node.querySelectorAll('video');
                    vids.forEach(v => attachFloatingIcon(v));
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * 2. إضافة الأيقونة العائمة بجانب الفيديو
 */
function attachFloatingIcon(video) {
    if (video.dataset.hasTranslateIcon) return;

    floatingIcon = document.createElement('div');
    floatingIcon.className = 'v-translate-icon';
    floatingIcon.innerHTML = '<span>文</span>';
    floatingIcon.title = "بدء الترجمة الفورية";

    // تحديد موقع الأيقونة فوق الفيديو
    const updatePosition = () => {
        const rect = video.getBoundingClientRect();
        floatingIcon.style.top = `${rect.top + 10 + window.scrollY}px`;
        floatingIcon.style.left = `${rect.left + 10 + window.scrollX}px`;
    };

    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);
    updatePosition();

    floatingIcon.onclick = (e) => {
        e.stopPropagation();
        toggleTranslation(video);
    };

    document.body.appendChild(floatingIcon);
    video.dataset.hasTranslateIcon = "true";
}

/**
 * 3. تفعيل/إيقاف الترجمة
 */
function toggleTranslation(video) {
    isTranslating = !isTranslating;
    
    if (isTranslating) {
        floatingIcon.classList.add('active');
        createSubtitleOverlay(video);
        chrome.runtime.sendMessage({ action: "START_TRANSLATION" });
    } else {
        floatingIcon.classList.remove('active');
        removeSubtitleOverlay();
        chrome.runtime.sendMessage({ action: "STOP_TRANSLATION" });
    }
}

/**
 * 4. عرض الترجمة (Overlay)
 */
function createSubtitleOverlay(video) {
    if (subtitleOverlay) return;
    subtitleOverlay = document.createElement('div');
    subtitleOverlay.className = 'v-translate-overlay';
    subtitleOverlay.innerText = "جاري بدء الترجمة...";
    
    // إلحاقها بحاوية الفيديو أو الجسم
    video.parentElement.style.position = 'relative';
    video.parentElement.appendChild(subtitleOverlay);
}

function removeSubtitleOverlay() {
    if (subtitleOverlay) {
        subtitleOverlay.remove();
        subtitleOverlay = null;
    }
}

// الاستماع للترجمات القادمة من Background
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "NEW_SUBTITLE" && subtitleOverlay) {
        if (message.isFinal) {
            // نتيجة نهائية - عرضها بشكل عادي
            subtitleOverlay.innerText = message.text;
            subtitleOverlay.style.color = 'white';
        } else {
            // نتيجة جزئية - عرضها بشكل مختلف
            subtitleOverlay.innerText = message.text + '...';
            subtitleOverlay.style.color = '#ccc';
        }
    } else if (message.action === "TRANSLATION_ERROR" && subtitleOverlay) {
        subtitleOverlay.innerText = "خطأ: " + message.error;
        subtitleOverlay.style.color = '#ffcccc';

        // إعادة الحالة إلى غير نشط بعد الخطأ
        setTimeout(() => {
            if (floatingIcon) {
                floatingIcon.classList.remove('active');
            }
            isTranslating = false;
        }, 3000);
    }
});

initVideoDetection();
