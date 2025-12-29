# Roadmap - Video Translate AI

## Version 1.0.0 (Current)

### Completed Features

- [x] Basic video detection
- [x] Floating control icons
- [x] Audio capture via tabCapture
- [x] WebSocket communication
- [x] Basic subtitle overlay
- [x] RTL language support
- [x] Settings persistence
- [x] Mock STT/translation adapters
- [x] VAD (Voice Activity Detection)
- [x] Audio chunking with overlap

### Known Issues

- Limited to same-origin iframes
- Requires user permission for cross-origin
- Mock adapters only (no real API integration)

---

## Version 1.1.0 - Options Page

### Planned Features

- [ ] Full options page with React
- [ ] API key management UI
- [ ] Provider selection dropdown
- [ ] Visual theme customization
- [ ] Per-site preferences
- [ ] Keyboard shortcuts configuration
- [ ] Export/import settings

### Technical Changes

- Move from vanilla JS to React for UI
- Implement settings validation
- Add settings migration system

---

## Version 1.2.0 - Cloud Integration

### Planned Features

- [ ] Google Cloud STT integration
- [ ] DeepL translation integration
- [ ] OpenAI Whisper STT integration
- [ ] On-demand API key validation
- [ ] Usage statistics
- [ ] Billing tracking

### Technical Changes

- Add cloud adapter implementations
- Implement API key encryption
- Add rate limiting
- Add request queuing

---

## Version 1.3.0 - On-Device Processing

### Planned Features

- [ ] WebAssembly STT (Whisper.cpp)
- [ ] Offline translation
- [ ] Local processing mode
- [ ] Model download management
- [ ] Resource usage indicators

### Technical Changes

- Add WASM worker implementation
- Implement model caching
- Add disk space management
- Performance optimization

---

## Version 2.0.0 - Full Feature Set

### Planned Features

- [ ] Multi-speaker diarization
- [ ] Custom glossary support
- [ ] Post-edit subtitle UI
- [ ] Session replay
- [ ] Collaborative translation
- [ ] Browser extension ecosystem
- [ ] Mobile companion app

### Advanced Features

- [ ] Real-time translation feedback
- [ ] Quality scoring
- [ ] Automatic language detection improvement
- [ ] Context-aware translation
- [ ] Personalized models

---

## Future Possibilities

### Integrations

- Video player integration (VLC, MPV)
- Desktop audio capture
- Meeting platform integration
- Live stream support
- Podcast transcription

### AI Enhancements

- Speaker identification
- Emotion detection
- Content summarization
- Keyword extraction
- Multi-language search

### Platform Expansion

- Firefox extension
- Safari extension
- Edge extension
- Standalone desktop app
- Web-based interface

---

## Contribution Areas

### High Priority

1. **Real STT Adapters**: Google, Azure, AWS
2. **Real Translation Adapters**: DeepL, LibreTranslate
3. **Testing**: Playwright E2E tests
4. **Documentation**: API examples, tutorials

### Medium Priority

1. Options page UI/UX
2. Performance optimization
3. Accessibility improvements
4. Internationalization (i18n)

### Low Priority

1. New language support
2. Visual themes
3. Advanced export formats
4. Mobile optimization

---

## Release Schedule

| Version | Target | Focus |
|---------|--------|-------|
| 1.0.0 | Dec 2024 | Core functionality |
| 1.1.0 | Q1 2025 | Options & settings |
| 1.2.0 | Q2 2025 | Cloud integration |
| 1.3.0 | Q3 2025 | On-device processing |
| 2.0.0 | Q4 2025 | Full feature set |

---

## Milestones

### Milestone 1: Production Ready ✅

- [x] Core translation pipeline
- [x] Basic UI
- [x] Mock adapters for testing
- [x] Documentation

### Milestone 2: Cloud Ready (Target: Q1 2025)

- [ ] Google STT adapter
- [ ] DeepL translation adapter
- [ ] API key management
- [ ] Usage tracking

### Milestone 3: Privacy First (Target: Q2 2025)

- [ ] WASM STT support
- [ ] Offline mode
- [ ] Local processing options
- [ ] Privacy dashboard

---

## How to Contribute

1. **Pick a task** from the roadmap
2. **Check existing PRs** to avoid duplication
3. **Create feature branch** from develop
4. **Implement** following code standards
5. **Add tests** for new functionality
6. **Update documentation**
7. **Submit PR** for review

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.
