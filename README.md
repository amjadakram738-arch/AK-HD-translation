# Video Translate AI - Chrome Extension

**Automatic video translation tool with AI-powered speech-to-text and translation capabilities**

## 📦 Features

### ✅ Core Functionality
- **Real-time video translation** - Translate videos instantly as they play
- **Multi-language support** - 150+ languages supported
- **Multiple translation engines** - Google, DeepL, Whisper, LibreTranslate, and local models
- **Advanced audio capture** - Direct, microphone, hybrid, and API-based capture methods
- **Customizable subtitles** - Size, position, color, and display modes

### 🎯 Operating Modes
- **Auto Mode** - Automatically selects best settings based on device and network
- **Manual Mode** - Full control over all translation parameters
- **Economy Mode** - Reduces CPU/memory usage for low-end devices
- **High Accuracy Mode** - Best translation quality with more processing
- **Silent Mode** - No audio output, subtitles only
- **Interactive Mode** - Edit translations in real-time
- **Fast Mode** - Lower quality but faster results
- **Beta Mode** - Test experimental features
- **Cloud Mode** - Offload processing to servers
- **Shared Mode** - Synchronized subtitles for group viewing

### 🔊 Audio Capture Methods
- **Direct Capture** - Capture audio directly from video element
- **Microphone Capture** - Use device microphone for external audio
- **Hybrid Capture** - Combine direct and microphone capture
- **API Capture** - Use browser APIs for stable audio access
- **Manual Upload** - Upload audio files for translation
- **Multi-channel Capture** - Separate audio tracks
- **Noise Filtering** - Remove background noise
- **Real-time Capture** - Low-latency processing
- **Buffer Capture** - Buffer audio to prevent word loss
- **Compressed Capture** - Reduce data usage

### 🎨 UI/UX Features
- **Customizable subtitles** - Font, size, color, position, opacity
- **Interactive controls** - Drag-and-drop positioning, zoom gestures
- **Smart mode** - Auto-adjust display based on video content
- **Multi-device support** - Responsive design for phones, tablets, desktops
- **Scenario profiles** - Pre-configured settings for different use cases
- **Display modes** - Simple, cinematic, educational, interactive

### 🚀 Advanced Features
- **Archive system** - Save videos with subtitles for later
- **Interactive learning** - Create personal dictionary and quizzes
- **Retroactive subtitles** - Generate subtitles for videos started mid-way
- **Group subtitles** - Watch with friends using synchronized subtitles
- **Sentiment analysis** - Detect speaker emotions and tone
- **Smart alerts** - Keyword notifications during playback
- **Live streaming support** - Instant translation for live streams
- **Educational mode** - Dual subtitles for language learning
- **Quick test** - Verify audio capture before translation
- **Download & export** - Save subtitles as SRT, VTT, TXT, DOCX

### 🔒 Privacy & Security
- **Local-only mode** - Process everything locally without cloud
- **Auto-delete recordings** - Remove audio data after use
- **Anonymous mode** - No personal data collection
- **File integrity checks** - Verify extension files
- **DRM detection** - Graceful handling of protected content
- **Minimal permissions** - Only request necessary access

### ⚙️ Performance Optimization
- **Multiple performance modes** - Balance speed and quality
- **GPU acceleration** - Use GPU for faster processing
- **Memory management** - Control memory usage limits
- **Battery optimization** - Reduce power consumption
- **Offline mode** - Use local translation models
- **Model management** - Download and manage language models

## 🚀 Installation

### Method 1: Load Unpacked Extension (Development)

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/amjadakram738-arch/AK-HD-translation.git
   cd AK-HD-translation
   ```

2. **Build the extension**
   ```bash
   npm run build
   ```

3. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist/` folder from this project

### Method 2: Install from Chrome Web Store

*Coming soon - extension will be published to Chrome Web Store*

## 📚 Usage

### Basic Usage

1. **Navigate to any video page** (YouTube, Vimeo, Twitch, etc.)
2. **Click the floating icon** (文) that appears on videos
3. **Translation starts automatically** with default settings
4. **Use the popup** to change languages, engines, and other settings

### Advanced Usage

1. **Open extension options** - Click the extension icon → "Advanced Options"
2. **Configure operating modes** - Choose from 11 different modes
3. **Set audio capture method** - Select how audio should be captured
4. **Adjust performance settings** - Balance speed, quality, and resource usage
5. **Customize UI** - Change subtitle appearance and behavior
6. **Manage privacy settings** - Control data handling and permissions

### Keyboard Shortcuts

- **Ctrl+Shift+T** (Windows/Linux) or **Cmd+Shift+T** (Mac) - Toggle translation
- **Ctrl+Shift+O** (Windows/Linux) or **Cmd+Shift+O** (Mac) - Open options

### Context Menu

- Right-click on any video → "Translate Video"
- Right-click on page → "Translate Page Audio"
- Right-click extension icon → "Video Translate AI Options"

## 🎨 Customization

### Subtitle Appearance

- **Size**: Small, Medium, Large
- **Position**: Top, Middle, Bottom of video
- **Display Mode**: Translated only, Original only, Both
- **Font**: Sans Serif, Serif, Monospace
- **Color**: Customizable text and background colors
- **Opacity**: Adjust transparency
- **Effects**: Shadows, borders, etc.

### Translation Settings

- **Source Language**: Auto-detect or manual selection
- **Target Language**: 150+ languages supported
- **Translation Engine**: Google, DeepL, Whisper, LibreTranslate, Local
- **Performance Mode**: Speed, Quality, Balanced
- **Operating Mode**: 11 different modes for various scenarios

## 🔧 Technical Details

### Architecture

```
User Interface (Popup/Options)
        ↓
Background Service Worker
        ↓
Offscreen Document (Audio Processing)
        ↓
Content Script (Video Detection & Overlay)
        ↓
Translation Proxy Server
        ↓
Cloud Translation APIs / Local Models
```

### Supported Browsers

- **Chrome** 109+ (Primary target)
- **Edge** 109+ (Chromium-based)
- **Firefox** 102+ (WebExtensions API)
- **Opera** 95+ (Chromium-based)
- **Brave** 1.45+ (Chromium-based)

### Permissions Required

- `tabs` - Access tab information
- `activeTab` - Interact with current tab
- `storage` - Save user preferences
- `tabCapture` - Capture audio from tabs
- `scripting` - Inject content scripts
- `offscreen` - Create offscreen documents
- `contextMenus` - Add context menu items
- `notifications` - Show notifications
- `microphone` (optional) - Access microphone
- `desktopCapture` (optional) - Capture screen audio
- `<all_urls>` - Work on all websites

## 🛠️ Development

### Requirements

- Node.js 18+
- Chrome/Chromium browser
- Basic understanding of Chrome Extensions

### Development Setup

```bash
# Install dependencies
npm install

# Build extension
npm run build

# Pack for distribution
npm run pack

# Run tests
npm run test

# Lint code
npm run lint
```

### Project Structure

```
src/
├── background/          # Service worker
├── content/             # Content scripts
├── overlay/             # Subtitle styles
├── ui/                  # User interface
│   ├── popup/           # Main popup
│   └── options/         # Advanced options
├── offscreen/           # Offscreen audio processing
├── workers/             # Web workers
├── ai_adapters/         # AI integration
│   ├── stt/             # Speech-to-text
│   └── translation/     # Translation engines
├── shared/              # Shared utilities
└── locales/             # Internationalization
```

## 🌍 Supported Languages

### UI Languages (35+)

Arabic (ar), English (en), Spanish (es), French (fr), German (de), Italian (it), Portuguese (pt), Dutch (nl), Russian (ru), Chinese (zh), Japanese (ja), Korean (ko), Hindi (hi), Turkish (tr), Persian (fa), Greek (el), Hebrew (he), Thai (th), Vietnamese (vi), Indonesian (id), Malay (ms), Polish (pl), Swedish (sv), Norwegian (no), Danish (da), Finnish (fi), Czech (cs), Hungarian (hu), Romanian (ro), Bulgarian (bg), Croatian (hr), Serbian (sr), Ukrainian (uk)

### Translation Languages (150+)

All major world languages supported via ISO 639-1 codes. Full list available in the extension.

## 📋 Roadmap

### Future Features

- **Voice commands** - Control extension with voice
- **Automatic language detection** - Improve accuracy
- **Custom translation models** - Upload your own models
- **Cloud sync** - Sync settings across devices
- **Collaboration features** - Real-time shared translation sessions
- **Advanced analytics** - Translation quality metrics
- **Plugin system** - Extend functionality with plugins
- **Mobile app** - Companion app for iOS/Android

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/your-feature`)
3. **Commit your changes** (`git commit -am 'Add some feature'`)
4. **Push to the branch** (`git push origin feature/your-feature`)
5. **Create a Pull Request**

### Development Guidelines

- Follow existing code style and patterns
- Write clear, commented code
- Include tests for new features
- Update documentation
- Keep changes focused and atomic

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For issues, questions, or feature requests:

- **GitHub Issues**: https://github.com/amjadakram738-arch/AK-HD-translation/issues
- **Email**: support@videotranslate.ai
- **Documentation**: https://docs.videotranslate.ai

## 🔐 Privacy Policy

- **No personal data collection** by default
- **Local processing** available for privacy
- **Transparent data handling** - see PRIVACY.md
- **User control** over all permissions
- **Secure storage** of preferences

## 📝 Changelog

### Version 1.1.0 (Current)
- Complete rewrite with all requested features
- 11 operating modes
- Advanced audio capture methods
- Comprehensive UI/UX improvements
- Full privacy and security controls
- Cross-browser compatibility
- Internationalization support

### Version 1.0.0
- Initial release
- Basic video translation
- Simple UI controls
- Limited language support

## 🎉 Acknowledgements

Special thanks to all contributors, testers, and users who helped make this extension possible!

---

**Video Translate AI** - Breaking language barriers, one video at a time! 🌍🎥💬