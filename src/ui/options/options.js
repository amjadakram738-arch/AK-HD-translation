/**
 * options.js - Advanced Options Management
 * Handles all advanced settings and configuration for the extension
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize tab functionality
    initTabs();
    
    // Load saved settings
    loadSettings();
    
    // Set up event listeners
    setupEventListeners();
});

function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and content
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

function loadSettings() {
    // Load settings from chrome.storage
    chrome.storage.sync.get(null, (settings) => {
        // General settings
        if (settings.defaultLanguage) {
            document.getElementById('default-language').value = settings.defaultLanguage;
        }
        if (settings.theme) {
            document.getElementById('theme').value = settings.theme;
        }
        if (settings.showNotifications !== undefined) {
            document.getElementById('show-notifications').checked = settings.showNotifications;
        }
        
        // Operating modes
        if (settings.operatingMode) {
            document.getElementById('operating-mode').value = settings.operatingMode;
        }
        if (settings.enableAutoMode !== undefined) {
            document.getElementById('enable-auto-mode').checked = settings.enableAutoMode;
        }
        if (settings.minSpeedThreshold) {
            document.getElementById('min-speed-threshold').value = settings.minSpeedThreshold;
        }
        
        // Audio capture
        if (settings.audioCaptureMethod) {
            document.getElementById('audio-capture-method').value = settings.audioCaptureMethod;
        }
        if (settings.enableNoiseReduction !== undefined) {
            document.getElementById('enable-noise-reduction').checked = settings.enableNoiseReduction;
        }
        if (settings.noiseFilterLevel) {
            document.getElementById('noise-filter-level').value = settings.noiseFilterLevel;
        }
        
        // Performance
        if (settings.performanceMode) {
            document.getElementById('performance-mode').value = settings.performanceMode;
        }
        if (settings.enableGPU !== undefined) {
            document.getElementById('enable-gpu').checked = settings.enableGPU;
        }
        if (settings.maxMemory) {
            document.getElementById('max-memory').value = settings.maxMemory;
        }
        
        // Privacy
        if (settings.localOnlyMode !== undefined) {
            document.getElementById('local-only-mode').checked = settings.localOnlyMode;
        }
        if (settings.autoDelete !== undefined) {
            document.getElementById('auto-delete').checked = settings.autoDelete;
        }
        if (settings.anonymousMode !== undefined) {
            document.getElementById('anonymous-mode').checked = settings.anonymousMode;
        }
        
        // UI
        if (settings.fontSize) {
            document.getElementById('font-size').value = settings.fontSize;
        }
        if (settings.fontType) {
            document.getElementById('font-type').value = settings.fontType;
        }
        if (settings.textColor) {
            document.getElementById('text-color').value = settings.textColor;
        }
        
        // Advanced
        if (settings.enableOffline !== undefined) {
            document.getElementById('enable-offline').checked = settings.enableOffline;
        }
        if (settings.enableDRMWarnings !== undefined) {
            document.getElementById('enable-drm-warnings').checked = settings.enableDRMWarnings;
        }
        if (settings.enableDebug !== undefined) {
            document.getElementById('enable-debug').checked = settings.enableDebug;
        }
    });
}

function setupEventListeners() {
    // Save button
    document.getElementById('save-options').addEventListener('click', saveSettings);
    
    // Reset button
    document.getElementById('reset-options').addEventListener('click', resetSettings);
    
    // Export button
    document.getElementById('export-options').addEventListener('click', exportSettings);
    
    // Import button
    document.getElementById('import-options').addEventListener('click', importSettings);
}

function saveSettings() {
    const settings = {
        // General settings
        defaultLanguage: document.getElementById('default-language').value,
        theme: document.getElementById('theme').value,
        showNotifications: document.getElementById('show-notifications').checked,
        
        // Operating modes
        operatingMode: document.getElementById('operating-mode').value,
        enableAutoMode: document.getElementById('enable-auto-mode').checked,
        minSpeedThreshold: parseInt(document.getElementById('min-speed-threshold').value),
        
        // Audio capture
        audioCaptureMethod: document.getElementById('audio-capture-method').value,
        enableNoiseReduction: document.getElementById('enable-noise-reduction').checked,
        noiseFilterLevel: document.getElementById('noise-filter-level').value,
        
        // Performance
        performanceMode: document.getElementById('performance-mode').value,
        enableGPU: document.getElementById('enable-gpu').checked,
        maxMemory: parseInt(document.getElementById('max-memory').value),
        
        // Privacy
        localOnlyMode: document.getElementById('local-only-mode').checked,
        autoDelete: document.getElementById('auto-delete').checked,
        anonymousMode: document.getElementById('anonymous-mode').checked,
        
        // UI
        fontSize: document.getElementById('font-size').value,
        fontType: document.getElementById('font-type').value,
        textColor: document.getElementById('text-color').value,
        
        // Advanced
        enableOffline: document.getElementById('enable-offline').checked,
        enableDRMWarnings: document.getElementById('enable-drm-warnings').checked,
        enableDebug: document.getElementById('enable-debug').checked
    };
    
    // Save to chrome.storage
    chrome.storage.sync.set(settings, () => {
        // Show success message
        const saveBtn = document.getElementById('save-options');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✓ Saved';
        saveBtn.style.backgroundColor = '#4CAF50';
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.backgroundColor = '#1a73e8';
        }, 2000);
        
        // Send message to background to update settings
        chrome.runtime.sendMessage({
            action: 'UPDATE_ADVANCED_SETTINGS',
            settings: settings
        });
    });
}

function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
        // Reset all form elements to default values
        document.getElementById('default-language').value = 'auto';
        document.getElementById('theme').value = 'system';
        document.getElementById('show-notifications').checked = true;
        
        document.getElementById('operating-mode').value = 'normal';
        document.getElementById('enable-auto-mode').checked = false;
        document.getElementById('min-speed-threshold').value = '5';
        
        document.getElementById('audio-capture-method').value = 'direct';
        document.getElementById('enable-noise-reduction').checked = true;
        document.getElementById('noise-filter-level').value = 'medium';
        
        document.getElementById('performance-mode').value = 'balance';
        document.getElementById('enable-gpu').checked = true;
        document.getElementById('max-memory').value = '200';
        
        document.getElementById('local-only-mode').checked = false;
        document.getElementById('auto-delete').checked = true;
        document.getElementById('anonymous-mode').checked = false;
        
        document.getElementById('font-size').value = 'medium';
        document.getElementById('font-type').value = 'sans';
        document.getElementById('text-color').value = '#FFFFFF';
        
        document.getElementById('enable-offline').checked = false;
        document.getElementById('enable-drm-warnings').checked = true;
        document.getElementById('enable-debug').checked = false;
        
        // Clear storage and reload
        chrome.storage.sync.clear(() => {
            alert('Settings have been reset to defaults.');
            loadSettings();
        });
    }
}

function exportSettings() {
    chrome.storage.sync.get(null, (settings) => {
        const dataStr = JSON.stringify(settings, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'video-translate-ai-settings.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    });
}

function importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const settings = JSON.parse(e.target?.result as string);
                
                // Validate and import settings
                chrome.storage.sync.set(settings, () => {
                    alert('Settings imported successfully!');
                    loadSettings();
                });
            } catch (error) {
                alert('Error importing settings: Invalid JSON file');
            }
        };
        
        reader.readAsText(file);
    });
    
    input.click();
}