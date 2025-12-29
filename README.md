# Video Translate AI - Chrome Extension

<div align="center">

![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![Manifest](https://img.shields.io/badge/Manifest-V3-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

**ترجمة فورية للفيديوهات باستخدام الذكاء الاصطناعي**

[English](#english) | [العربية](#العربية)

</div>

---

## Executive Summary

Video Translate AI is a Chrome extension that provides real-time video translation capabilities. It automatically detects video elements on any webpage, captures audio, converts speech to text using AI, translates the text between 100+ languages, and displays synchronized subtitles or pop-up translations directly on the page.

### Key Features

- 🎥 **Automatic Video Detection** - Detects all video elements including iframes and dynamic content
- 🎙️ **Audio Capture & Processing** - Captures tab audio with configurable chunking and VAD
- 🤖 **AI-Powered STT** - Speech-to-text with support for multiple providers
- 🌐 **100+ Language Support** - Translation between virtually all world languages
- 📝 **Synchronized Subtitles** - Real-time overlay with customizable styles
- 🔒 **Privacy-First Design** - User consent required, local processing option
- ⚡ **Performance Optimized** - Web Workers for CPU-heavy tasks

### Limitations

- Cannot bypass DRM-protected content
- Requires explicit user permission for audio capture
- May not work on cross-origin iframes without permission
- Cloud features require internet connection
- Quality depends on STT provider accuracy

---

## 📦 Installation

### Quick Install (Development)

1. Clone the repository:
```bash
git clone https://github.com/amjadakram738-arch/AK-HD-translation.git
cd AK-HD-translation
```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (top right corner)

4. Click **Load unpacked** and select the `/home/engine/project/src` folder

### Production Install

1. Build the extension:
```bash
cd /home/engine/project
npm run build
```

2. Load the extension from `/home/engine/project/dist/`

---

## ⚙️ Configuration

### Basic Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Target Language | Language to translate to | Arabic (ar) |
| Source Language | Original language (auto-detect if unset) | Auto |
| Translation Engine | STT/Translation provider | Google |
| Subtitle Mode | translated/original/both | translated |
| Subtitle Size | small/medium/large | medium |
| Subtitle Position | top/middle/bottom | bottom |

### Advanced Settings

| Setting | Description | Default |
|---------|-------------|---------|
| VAD Threshold | Voice Activity Detection sensitivity | 0.02 |
| Chunk Duration | Audio chunk size in ms | 8000 |
| Overlap Duration | Overlap between chunks in ms | 500 |
| Privacy Mode | local/balanced/cloud | balanced |

---

## 🔧 Development

### Project Structure

```
/home/engine/project/src/
├── manifest.json              # Extension manifest
├── background/
│   └── service_worker.js      # Background service worker
├── content/
│   └── content_script.js      # Content script for page injection
├── overlay/
│   ├── overlay_styles.css     # Subtitle overlay styles
│   └── overlay_renderer.js    # Overlay rendering logic
├── ui/
│   ├── popup/                 # Extension popup UI
│   └── options/               # Options page
├── workers/
│   ├── audio_processor.worker.js    # Audio processing worker
│   └── audio_processor.worklet.js   # AudioWorklet processor
├── ai_adapters/
│   ├── stt/                   # Speech-to-text adapters
│   └── translation/           # Translation adapters
└── shared/
    ├── types.ts               # TypeScript type definitions
    ├── utils.ts               # Utility functions
    └── storage.ts             # Storage management
```

### Build Commands

```bash
# Install dependencies
npm install

# Development build
npm run dev

# Production build
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Package extension
npm run pack
```

---

## 🔐 Privacy & Security

### Data Collection

- **Audio**: Captured only with user permission, never stored permanently
- **Text**: Transcripts can be optionally saved to local storage
- **Settings**: Stored in Chrome sync storage

### Privacy Modes

| Mode | Behavior |
|------|----------|
| **Local** | All processing on-device (requires WASM models) |
| **Balanced** | Local STT + Cloud translation |
| **Cloud** | Full cloud processing |

### Legal Notice

This extension does **NOT**:
- Bypass DRM or content protection
- Intercept encrypted streams
- Violate terms of service of websites
- Store user data without consent

---

## 📄 API Contracts

### Message Protocol

```typescript
// Content Script → Background
interface ContentToBackground {
  action: 'START_TRANSLATION' | 'STOP_TRANSLATION' | 'UPDATE_SETTINGS';
  tabId?: number;
  hints?: LanguageHints;
  settings?: Partial<TranslationConfig>;
}

// Background → Content Script
interface BackgroundToContent {
  action: 'NEW_SUBTITLE' | 'TRANSLATION_ERROR' | 'TRANSLATION_STATUS_CHANGED';
  text?: string;
  isFinal?: boolean;
  error?: string;
  isTranslating?: boolean;
}
```

### STT Adapter Interface

```typescript
interface STTAdapter {
  initialize(config: STTConfig): Promise<STTInitResult>;
  shutdown(): Promise<void>;
  transcribeChunk(audio: ArrayBuffer): Promise<STTResult>;
  getSupportedLanguages(): string[];
}
```

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Audio capture fails | Check tab capture permission |
| Subtitles not appearing | Reload page, check console |
| DRM protected content | Use official APIs, cannot bypass |
| High latency | Reduce chunk size, enable VAD |

### Debug Mode

Enable debug logging by setting `telemetryEnabled: true` in settings.

---

## 📚 Documentation

- [Architecture](ARCHITECTURE.md)
- [API Contracts](API_CONTRACTS.md)
- [Privacy Policy](PRIVACY.md)
- [DRM Policy](DRM_POLICY.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Roadmap](ROADMAP.md)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Google Chrome Extensions Team
- Web Audio API Contributors
- Open Source STT/Translation Projects

---

<div id="english">

## English Version

Video Translate AI is a comprehensive Chrome extension for real-time video translation. It provides:

- **Universal Video Detection**: Works on any website with video content
- **Privacy-First Architecture**: User consent required, configurable data handling
- **Extensible Design**: Plugin system for STT and translation providers
- **Production Ready**: Full source code, tests, and documentation

### Supported Languages

100+ languages including: English, Arabic, French, Spanish, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, and many more.

### Quick Start

```bash
# Clone and setup
git clone https://github.com/amjadakram738-arch/AK-HD-translation.git
cd AK-HD-translation

# Load in Chrome
# 1. Go to chrome://extensions/
# 2. Enable Developer mode
# 3. Load unpacked -> select src/ folder
```

</div>

<div id="العربية">

## النسخة العربية

Video Translate AI هي إضافة Chrome شاملة للترجمة الفورية للفيديو. توفر:

- **اكتشاف فيديو عالمي**: تعمل على أي موقع يحتوي على محتوى فيديو
- **معمارية الخصوصية أولاً**: موافقة المستخدم مطلوبة، معالجة بيانات قابلة للتكوين
- **قابلة للتوسع**: نظام إضافات لموفري STT والترجمة
- **جاهزة للإنتاج**: كود كامل، اختبارات، وتوثيق

### اللغات المدعومة

أكثر من 100 لغة تشمل: الإنجليزية، العربية، الفرنسية، الإسبانية، الألمانية، الإيطالية، البرتغالية، الروسية، الصينية، اليابانية، الكورية، وغيرها.

### بدء الاستخدام

```bash
# استنساخ وإعداد
git clone https://github.com/amjadakram738-arch/AK-HD-translation.git
cd AK-HD-translation

# تحميل في Chrome
# 1. اذهب إلى chrome://extensions/
# 2. فعّل وضع المطور
# 3. تحميل غير محزوم -> اختر مجلد src/
```

</div>
