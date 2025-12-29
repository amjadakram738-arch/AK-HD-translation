# API Contracts - Video Translate AI

## Message Protocol

### Content Script → Service Worker

```typescript
// Start translation session
interface StartTranslationRequest {
  action: 'START_TRANSLATION';
  tabId?: number;
  frameId?: number;
  hints?: LanguageHints;
}

// Stop translation session
interface StopTranslationRequest {
  action: 'STOP_TRANSLATION';
  tabId?: number;
}

// Update settings
interface UpdateSettingsRequest {
  action: 'UPDATE_SETTINGS';
  settings: Partial<TranslationConfig>;
}

// Get translation status
interface GetStatusRequest {
  action: 'GET_TRANSLATION_STATUS';
  tabId?: number;
}

// Export session data
interface ExportRequest {
  action: 'EXPORT_SESSION';
  tabId?: number;
  format: 'srt' | 'vtt' | 'txt' | 'json';
}
```

### Service Worker → Content Script

```typescript
// New subtitle received
interface NewSubtitleMessage {
  action: 'NEW_SUBTITLE';
  text: string;
  originalText?: string;
  isFinal: boolean;
  detectedLang?: string;
  confidence?: number;
  timestamp: number;
}

// Translation error
interface ErrorMessage {
  action: 'TRANSLATION_ERROR';
  error: string;
  message?: string;
  canRetry?: boolean;
  userActionRequired?: boolean;
}

// Status changed
interface StatusChangedMessage {
  action: 'TRANSLATION_STATUS_CHANGED';
  isTranslating: boolean;
  tabId?: number;
}

// Translation started
interface StartedMessage {
  action: 'TRANSLATION_STARTED';
  sessionId: number;
  settings: TranslationConfig;
}

// Translation stopped
interface StoppedMessage {
  action: 'TRANSLATION_STOPPED';
  sessionId: number;
  reason?: string;
}
```

### Offscreen → Service Worker

```typescript
// Offscreen ready
interface OffscreenReadyMessage {
  action: 'OFFSCREEN_READY';
}

// New subtitle from proxy
interface OffscreenSubtitleMessage {
  action: 'OFFSCREEN_SUBTITLE';
  tabId: number;
  translatedText: string;
  originalText: string;
  isFinal: boolean;
  detectedLang?: string;
  confidence?: number;
}

// Error occurred
interface OffscreenErrorMessage {
  action: 'OFFSCREEN_ERROR';
  tabId: number;
  error: string;
  message?: string;
}

// Session ended
interface SessionEndedMessage {
  action: 'OFFSCREEN_SESSION_ENDED';
  tabId: number;
  reason?: string;
}
```

### Service Worker → Offscreen

```typescript
// Ping to check readiness
interface OffscreenPingMessage {
  action: 'OFFSCREEN_PING';
}

// Start capture
interface OffscreenStartMessage {
  action: 'OFFSCREEN_START';
  tabId: number;
  streamId: string;
  settings: TranslationConfig;
}

// Stop capture
interface OffscreenStopMessage {
  action: 'OFFSCREEN_STOP';
  tabId?: number;
}

// Update configuration
interface OffscreenUpdateConfigMessage {
  action: 'OFFSCREEN_UPDATE_CONFIG';
  tabId?: number;
  settings: Partial<TranslationConfig>;
}

// Export session
interface OffscreenExportMessage {
  action: 'OFFSCREEN_EXPORT';
  tabId: number;
  format: string;
}
```

## STT Adapter Contract

### Interface

```typescript
interface STTAdapter {
  /**
   * Initialize the adapter with configuration
   */
  initialize(config: STTConfig): Promise<STTInitResult>;

  /**
   * Shutdown and cleanup resources
   */
  shutdown(): Promise<void>;

  /**
   * Transcribe a single audio chunk
   */
  transcribeChunk(
    audioData: ArrayBuffer,
    options?: STTTranscribeOptions
  ): Promise<STTResult>;

  /**
   * Get list of supported languages
   */
  getSupportedLanguages(): string[];
}
```

### Configuration

```typescript
interface STTConfig {
  language?: string;        // BCP-47 language code
  enableInterim?: boolean;  // Return interim results
  vocabulary?: string[];    // Custom vocabulary
  model?: string;           // Specific model variant
}
```

### Result

```typescript
interface STTResult {
  text: string;                    // Transcribed text
  isFinal: boolean;                // Final or interim
  language: string;                // Detected language
  confidence: number;              // 0-1 confidence score
  segments: Segment[];             // Time-aligned segments
  timestamp: number;               // Processing timestamp
}

interface Segment {
  start: number;                   // Start time in seconds
  end: number;                     // End time in seconds
  text: string;                    // Segment text
  confidence: number;              // Segment confidence
}
```

### HTTP Request Example (Cloud Adapter)

```http
POST https://speech.googleapis.com/v1/speech:recognize
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "config": {
    "encoding": "LINEAR16",
    "sampleRateHertz": 16000,
    "languageCode": "en-US",
    "enableAutomaticLanguageDetection": true,
    "enableWordTimeOffsets": true,
    "model": "latest_long"
  },
  "audio": {
    "content": "BASE64_ENCODED_AUDIO..."
  }
}
```

### HTTP Response Example

```json
{
  "results": [
    {
      "alternatives": [
        {
          "transcript": "Hello world",
          "confidence": 0.95,
          "words": [
            {
              "startTime": "0s",
              "endTime": "0.5s",
              "word": "Hello"
            },
            {
              "startTime": "0.5s",
              "endTime": "1.0s",
              "word": "world"
            }
          ]
        }
      ],
      "isFinal": true,
      "languageCode": "en-US"
    }
  ]
}
```

## Translation Adapter Contract

### Interface

```typescript
interface TranslationAdapter {
  /**
   * Initialize the adapter
   */
  initialize(config: TranslationAdapterConfig): Promise<TranslationInitResult>;

  /**
   * Shutdown and cleanup
   */
  shutdown(): Promise<void>;

  /**
   * Translate single text
   */
  translateText(
    sourceLang: string,
    targetLang: string,
    text: string,
    context?: TranslationContext
  ): Promise<TranslationResult>;

  /**
   * Translate batch of texts
   */
  translateBatch(
    sourceLang: string,
    targetLang: string,
    texts: string[],
    context?: TranslationContext
  ): Promise<BatchTranslationResult>;

  /**
   * Get supported language pairs
   */
  getSupportedLanguagePairs(): LanguagePair[];

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): string[];
}
```

### Configuration

```typescript
interface TranslationAdapterConfig {
  apiKey?: string;           // Provider API key
  sourceLang?: string;       // Default source language
  targetLang?: string;       // Default target language
  formality?: 'default' | 'more' | 'less';
  glossary?: string;         // Glossary ID
  region?: string;           // Regional variant
}
```

### Result

```typescript
interface TranslationResult {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  qualityScore: number;      // 0-1 quality estimation
  cached: boolean;           // From cache
  detectedSourceLang?: string;
}

interface BatchTranslationResult {
  translations: string[];
  details: TranslationResult[];
  totalProcessed: number;
}
```

### HTTP Request Example (DeepL)

```http
POST https://api-free.deepl.com/v2/translate
Content-Type: application/json
Authorization: DeepL-Auth-KEY YOUR_API_KEY

{
  "text": ["Hello world"],
  "source_lang": "EN",
  "target_lang": "AR",
  "formality": "default"
}
```

### HTTP Response Example

```json
{
  "translations": [
    {
      "detected_source_language": "EN",
      "text": "مرحبا بالعالم"
    }
  ]
}
```

## Storage Schema

### Settings (chrome.storage.sync)

```typescript
interface ExtensionSettings {
  // Core settings
  targetLang: string;              // 'ar'
  sourceLang: string;             // 'auto'
  engine: string;                 // 'google'
  
  // Display settings
  subtitleMode: 'translated' | 'original' | 'both';
  subtitleSize: 'small' | 'medium' | 'large';
  subtitlePosition: 'top' | 'middle' | 'bottom';
  
  // Processing settings
  vadEnabled: boolean;            // true
  chunkSize: number;              // 8000 (ms)
  overlapSize: number;            // 500 (ms)
  
  // Privacy settings
  privacyMode: 'local' | 'balanced' | 'cloud';
  autoDeleteTranscripts: boolean; // true
  telemetryEnabled: boolean;      // false
}
```

### History (chrome.storage.local)

```typescript
interface SessionRecord {
  id: string;                     // Unique session ID
  tabId: number;
  url: string;
  startedAt: number;              // Unix timestamp
  endedAt?: number;
  targetLang: string;
  segments: {
    start: number;
    end: number;
    original: string;
    translated: string;
    confidence?: number;
  }[];
}
```

### API Keys (chrome.storage.sync, encrypted)

```typescript
interface APIKeys {
  google?: string;
  deepL?: string;
  openai?: string;
  azure?: string;
}
```

## Export Formats

### SRT Format

```
1
00:00:01,000 --> 00:00:04,000
مرحبا بالعالم

2
00:00:05,000 --> 00:00:08,000
هذا نص تجريبي
```

### VTT Format

```
WEBVTT

00:01.000 --> 00:04.000
مرحبا بالعالم

00:05.000 --> 00:08.000
هذا نص تجريبي
```

### JSON Format

```json
{
  "metadata": {
    "createdAt": "2024-12-29T10:00:00Z",
    "targetLang": "ar"
  },
  "segments": [
    {
      "start": 1.0,
      "end": 4.0,
      "original": "Hello world",
      "translated": "مرحبا بالعالم",
      "confidence": 0.95
    }
  ]
}
```
