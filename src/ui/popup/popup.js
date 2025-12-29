/**
 * popup.js - Main Popup Interface
 * Handles all user interactions with the extension popup
 */

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
    updateStatus();
});

// Load settings from storage
function loadSettings() {
    chrome.storage.sync.get([
        'targetLang', 'sourceLang', 'engine', 'subtitleMode',
        'subtitleSize', 'subtitlePosition', 'operatingMode', 'audioCaptureMethod'
    ], (result) => {
        // Set target language
        if (result.targetLang) {
            document.getElementById('target-lang').value = result.targetLang;
        }
        
        // Set source language
        if (result.sourceLang) {
            document.getElementById('source-lang').value = result.sourceLang;
        }
        
        // Set translation engine
        if (result.engine) {
            document.getElementById('engine').value = result.engine;
        }
        
        // Set subtitle mode
        if (result.subtitleMode) {
            document.getElementById('subtitle-mode').value = result.subtitleMode;
        }
        
        // Set subtitle size
        if (result.subtitleSize) {
            document.getElementById('subtitle-size').value = result.subtitleSize;
        }
        
        // Set subtitle position
        if (result.subtitlePosition) {
            document.getElementById('subtitle-position').value = result.subtitlePosition;
        }
        
        // Set operating mode
        if (result.operatingMode) {
            document.getElementById('operating-mode').value = result.operatingMode;
        }
        
        // Set audio capture method
        if (result.audioCaptureMethod) {
            document.getElementById('audio-capture').value = result.audioCaptureMethod;
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Toggle translation button
    document.getElementById('toggle-translation').addEventListener('click', toggleTranslation);
    
    // Advanced options button
    document.getElementById('advanced-options').addEventListener('click', openAdvancedOptions);
    
    // Export subtitles button
    document.getElementById('export-subtitles').addEventListener('click', exportSubtitles);
    
    // Test capture button
    document.getElementById('test-capture').addEventListener('click', testAudioCapture);
    
    // Help button
    document.getElementById('help').addEventListener('click', showHelp);
    
    // Save settings when any select changes
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        select.addEventListener('change', saveSettings);
    });
}

// Toggle translation
function toggleTranslation() {
    const button = document.getElementById('toggle-translation');
    const isActive = button.classList.contains('active');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'TOGGLE_TRANSLATION' }, (response) => {
                if (response?.ok) {
                    updateStatus(!isActive);
                    button.classList.toggle('active', !isActive);
                    button.textContent = isActive ? 'Start Translation' : 'Stop Translation';
                }
            });
        }
    });
}

// Open advanced options
function openAdvancedOptions() {
    chrome.runtime.openOptionsPage();
    window.close();
}

// Export subtitles
function exportSubtitles() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'EXPORT_SUBTITLES' });
        }
    });
}

// Test audio capture
function testAudioCapture() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.runtime.sendMessage({
                action: 'TEST_AUDIO_CAPTURE',
                tabId: tabs[0].id
            }, (response) => {
                if (response?.success) {
                    showNotification('Audio capture test successful!');
                } else {
                    showNotification(`Test failed: ${response?.error || 'Unknown error'}`);
                }
            });
        }
    });
}

// Show help
function showHelp() {
    const helpMessage = `
Video Translate AI Help:

1. Click the floating icon on any video to start translation
2. Use popup to change settings
3. Advanced options available in the options page
4. Export subtitles for offline use
5. Test audio capture to verify functionality

Supported sites: YouTube, Vimeo, Dailymotion, Twitch, and most video sites.
`;
    
    alert(helpMessage);
}

// Save settings
function saveSettings() {
    const settings = {
        targetLang: document.getElementById('target-lang').value,
        sourceLang: document.getElementById('source-lang').value,
        engine: document.getElementById('engine').value,
        subtitleMode: document.getElementById('subtitle-mode').value,
        subtitleSize: document.getElementById('subtitle-size').value,
        subtitlePosition: document.getElementById('subtitle-position').value,
        operatingMode: document.getElementById('operating-mode').value,
        audioCaptureMethod: document.getElementById('audio-capture').value
    };
    
    chrome.storage.sync.set(settings, () => {
        // Send settings to background for immediate application
        chrome.runtime.sendMessage({
            action: 'UPDATE_SETTINGS',
            settings: settings
        });
        
        // Show save confirmation
        const saveBtn = document.getElementById('advanced-options');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✓ Saved';
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
        }, 2000);
    });
}

// Update translation status
function updateStatus(translating = false) {
    const statusEl = document.getElementById('status');
    const toggleBtn = document.getElementById('toggle-translation');
    
    if (translating) {
        statusEl.textContent = 'Translating';
        statusEl.className = 'status-on';
        toggleBtn.textContent = 'Stop Translation';
        toggleBtn.classList.add('active');
    } else {
        statusEl.textContent = 'Stopped';
        statusEl.className = 'status-off';
        toggleBtn.textContent = 'Start Translation';
        toggleBtn.classList.remove('active');
    }
}

// Show notification in popup
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Check translation status periodically
setInterval(() => {
    chrome.runtime.sendMessage({ action: 'GET_TRANSLATION_STATUS' }, (response) => {
        if (response?.isTranslating !== undefined) {
            updateStatus(response.isTranslating);
        }
    });
}, 1000);

// Add CSS for notification
const style = document.createElement('style');
style.textContent = `
.notification {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #333;
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 9999;
    font-size: 0.9rem;
}
`;
document.head.appendChild(style);