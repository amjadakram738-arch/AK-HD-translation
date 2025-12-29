# Architecture Documentation - Video Translate AI

## Overview

This document describes the high-level architecture of the Video Translate AI Chrome Extension, including component responsibilities, data flows, and integration points.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chrome Browser                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Content Script                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │  │
│  │  │ VideoDetector│  │ OverlayRenderer│  │ SettingsManager │ │  │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                    chrome.runtime.sendMessage                    │
│                              │                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Service Worker (Background)              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │  │
│  │  │ SessionManager│  │ CaptureManager│  │ SettingsManager │ │  │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                    chrome.runtime.sendMessage                    │
│                              │                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Offscreen Document                     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │  │
│  │  │ AudioContext │  │ WebSocket    │  │ AudioProcessor  │ │  │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                         WebSocket                                │
│                              │                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Proxy Server (External)               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │  │
│  │  │ STT Service  │  │ Translation  │  │ TTS Service     │ │  │
│  │  │ (Whisper)    │  │ (DeepL/GPT)  │  │ (ElevenLabs)    │ │  │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Content Script (`content_script.js`)

**Responsibilities:**
- Detect and monitor video elements using MutationObserver
- Inject floating control icons over detected videos
- Render subtitle overlays synchronized with video playback
- Handle user interactions (clicks, keyboard shortcuts)
- Communicate with background service worker
- Persist overlay position and style preferences

**Key Features:**
- Shadow DOM traversal for embedded players
- Real-time position updates (requestAnimationFrame)
- RTL language support
- Multiple display modes (overlay, floating panel, injected)

### Service Worker (`service_worker.js`)

**Responsibilities:**
- Manage translation sessions (start/stop)
- Create and manage Offscreen Documents
- Route messages between content scripts and offscreen
- Handle tab lifecycle (remove, update)
- Enforce DRM protection policies
- Manage global settings synchronization

**Key Features:**
- WebSocket connection management
- Exponential backoff for reconnections
- Session state persistence
- Permission handling

### Offscreen Document (`offscreen.js`)

**Responsibilities:**
- Create AudioContext (requires offscreen context)
- Capture tab audio using MediaStream
- Process audio chunks (VAD, resampling)
- Maintain WebSocket connection to proxy
- Send audio data and receive translations

**Key Features:**
- AudioWorklet for low-latency processing
- ScriptProcessor fallback for older browsers
- Voice Activity Detection (VAD)
- Audio chunking with configurable overlap

### AI Adapters

#### STT Adapters (`ai_adapters/stt/`)

```typescript
interface STTAdapter {
  initialize(config: STTConfig): Promise<STTInitResult>;
  shutdown(): Promise<void>;
  transcribeChunk(audioData: ArrayBuffer): Promise<STTResult>;
  getSupportedLanguages(): string[];
}
```

**Implementations:**
- `mock_stt.js` - Testing adapter with predefined responses
- `cloud_stt_adapter.ts` - Cloud provider integration (Google, OpenAI)
- `wasm_stt_adapter.ts` - On-device Whisper/WASM model

#### Translation Adapters (`ai_adapters/translation/`)

```typescript
interface TranslationAdapter {
  initialize(config: TranslationConfig): Promise<InitResult>;
  translateText(sourceLang, targetLang, text): Promise<Result>;
  translateBatch(texts): Promise<BatchResult>;
  getSupportedLanguages(): string[];
}
```

**Implementations:**
- `mock_translation.js` - Testing adapter with sample translations
- `cloud_translation_adapter.ts` - DeepL, Google, OpenAI integration

## Data Flow

### Translation Flow

```
1. User clicks floating icon
   Content Script → START_TRANSLATION → Service Worker

2. Service Worker
   - Validates permissions
   - Checks DRM status
   - Creates Offscreen Document

3. Offscreen Document
   - Captures tab audio
   - Processes with AudioWorklet
   - Sends chunks via WebSocket

4. Proxy Server
   - STT: Whisper/Google STT
   - Translation: DeepL/GPT
   - Returns synchronized results

5. Service Worker
   - Routes results to content script

6. Content Script
   - Renders subtitle overlay
   - Updates position synchronized with video
```

### Message Protocol

```typescript
// Content Script → Service Worker
{ action: 'START_TRANSLATION', hints?: LanguageHints }
{ action: 'STOP_TRANSLATION' }
{ action: 'UPDATE_SETTINGS', settings: Partial<TranslationConfig> }

// Service Worker → Content Script
{ action: 'NEW_SUBTITLE', text: string, isFinal: boolean, originalText?: string }
{ action: 'TRANSLATION_ERROR', error: string, canRetry: boolean }
{ action: 'TRANSLATION_STATUS_CHANGED', isTranslating: boolean }
```

## Privacy & Security

### Security Boundary

```
┌─────────────────────────────────────────┐
│         EXTENSION (Trusted)             │
│  ┌─────────────────────────────────────┐│
│  │ Content Script                      ││
│  │ Service Worker                      ││
│  │ Offscreen Document                  ││
│  └─────────────────────────────────────┘│
│                    │                    │
│         HTTPS/WSS (Encrypted)           │
│                    │                    │
│  ┌─────────────────────────────────────┐│
│  │      Proxy Server (Semi-Trusted)    ││
│  │  - Receives audio chunks            ││
│  │  - Processes STT/Translation        ││
│  │  - Never stores raw audio           ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
         │
         │ HTTPS (API Keys)
         ▼
┌─────────────────────────────────────────┐
│      Cloud Providers (Untrusted)        │
│  - Google Cloud Speech-to-Text          │
│  - DeepL Translation API                │
│  - OpenAI GPT                           │
└─────────────────────────────────────────┘
```

### Key Security Measures

1. **No Secrets in Extension**: API keys stored in proxy, not extension
2. **Explicit Consent**: User must approve audio capture
3. **DRM Detection**: Automatic blocking of protected content
4. **HTTPS Only**: All external communications encrypted
5. **Minimal Permissions**: Only required permissions requested

## Limitations

### Technical Limitations

| Limitation | Description | Workaround |
|------------|-------------|------------|
| Cross-origin iframes | Cannot capture audio from cross-origin frames | User consent injection |
| DRM-protected content | Cannot process protected streams | Official API integration |
| Browser compatibility | Some features require modern browsers | Fallback mechanisms |
| Network latency | Cloud processing adds delay | Local processing mode |

### Platform Limitations

- Chrome/Edge only (Chromium-based browsers)
- Desktop platforms only
- Active tab required for capture

## Performance Considerations

### Latency Targets

| Stage | Target | Maximum |
|-------|--------|---------|
| Audio capture | < 50ms | 100ms |
| Chunk processing | < 20ms | 50ms |
| Network (round-trip) | < 500ms | 2000ms |
| Rendering | < 16ms | 33ms |
| **End-to-end** | **< 2s** | **5s** |

### Optimization Strategies

1. **Web Workers**: Offload CPU-intensive tasks
2. **Audio Chunking**: Configurable sizes for latency/accuracy tradeoff
3. **VAD**: Skip silent segments
4. **Connection Pooling**: Maintain WebSocket connections
5. **Caching**: Translation memory for repeated phrases

## Extensibility

### Adding New STT Provider

1. Create new adapter in `ai_adapters/stt/`
2. Implement `STTAdapter` interface
3. Register in `stt_factory.ts`
4. Add configuration options in settings

### Adding New Translation Provider

1. Create new adapter in `ai_adapters/translation/`
2. Implement `TranslationAdapter` interface
3. Register in `translation_factory.ts`
4. Add API key field in options page

## Testing Strategy

### Unit Tests

- VideoDetector: Element detection, event emission
- AudioProcessor: VAD, resampling, chunking
- Adapters: Response formatting, error handling
- Utils: Time formatting, caching

### Integration Tests

- Full translation flow with mock providers
- DRM detection and blocking
- Permission handling
- Settings persistence

### E2E Tests

- Playwright tests with sample video pages
- Subtitle rendering verification
- Performance benchmarking

## Deployment

### Development

```bash
npm install
npm run build
# Load dist/ folder in Chrome
```

### Production

```bash
npm install
npm run build
npm run pack
# Upload build/*.zip to Chrome Web Store
```

### CI/CD

GitHub Actions workflow:
1. Run linting
2. Run tests
3. Build extension
4. Package ZIP
5. Upload artifacts
