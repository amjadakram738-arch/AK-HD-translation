# Privacy Policy - Video Translate AI

**Last Updated**: December 2024  
**Version**: 1.0.0

## Overview

Video Translate AI is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights regarding your data.

## Data Collection

### Information We Collect

| Data Type | Collection Method | Purpose | Storage |
|-----------|------------------|---------|---------|
| **Settings** | User input | Personalization | Chrome Sync |
| **API Keys** | User input | Authentication | Encrypted local |
| **Transcripts** | Auto-generated | User history | Local (optional) |
| **Usage Stats** | Auto-generated | Analytics | Local (opt-in) |

### Information We DO NOT Collect

- ❌ Audio data from videos
- ❌ Video playback history
- ❌ Personal information
- ❌ Browsing history
- ❌ User credentials (except API keys)
- ❌ Data transmitted to third parties

## Data Storage

### Local Storage

All data is stored locally on your device:

```javascript
// Storage locations
chrome.storage.sync  // Settings (encrypted by Chrome)
chrome.storage.local // Session data, transcripts
```

### Data Retention

| Data Type | Retention Period | Auto-Delete |
|-----------|-----------------|-------------|
| Settings | Until changed | No |
| API Keys | Until deleted | No |
| Transcripts | Configurable | Optional |
| Usage Stats | 30 days | Yes (if enabled) |

## Your Rights

### Right to Access

You can access your data at any time:

```javascript
// Export all data
const settings = await chrome.storage.sync.get();
const local = await chrome.storage.local.get();
```

### Right to Delete

You can delete all data:

```javascript
// Clear all data
chrome.storage.sync.clear();
chrome.storage.local.clear();
```

Or use the extension's "Clear Data" option in Settings.

### Right to Export

Export your settings and transcripts:

1. Open extension settings
2. Go to "Privacy" tab
3. Click "Export Data"

## Privacy Modes

### Local Mode (Most Private)
- All processing on-device
- Requires WASM models
- No internet connection needed
- Limited language support

### Balanced Mode (Default)
- Local STT + Cloud translation
- Minimal data sharing
- Optimal performance
- Recommended for most users

### Cloud Mode
- Full cloud processing
- Best accuracy
- Requires internet
- Maximum data sharing

## Third-Party Services

### Cloud Providers

When using cloud translation/STT services:

| Provider | Data Sent | Privacy Policy |
|----------|-----------|----------------|
| Google | Audio/text | Google Cloud Privacy |
| DeepL | Text only | DeepL Privacy |
| OpenAI | Text only | OpenAI Privacy |

**Note**: We do not control third-party privacy practices. Review their policies before use.

### No Data Selling

We do NOT sell, trade, or rent your personal information to anyone.

## Security Measures

### Data Protection

1. **Encryption**: API keys stored using Chrome's encryption
2. **HTTPS**: All cloud communications use HTTPS
3. **No Logging**: Sensitive data not logged or monitored

### User Consent

Explicit consent is required:

- [ ] Before audio capture
- [ ] Before cloud processing
- [ ] Before telemetry collection
- [ ] Before data export

## Children’s Privacy

This extension is not intended for use by children under 13. We do not knowingly collect information from children.

## Changes to This Policy

We may update this policy. Changes will be:

1. Posted in the extension repository
2. Noted in extension update notes
3. Effective immediately for material changes

## Contact Us

For privacy questions:

- **Email**: privacy@example.com
- **Repository**: https://github.com/amjadakram738-arch/AK-HD-translation
- **Issues**: Report privacy concerns via GitHub Issues

## Compliance

This extension complies with:

- [ ] GDPR (EU data protection)
- [ ] CCPA (California privacy rights)
- [ ] Chrome Web Store Privacy Policy
- [ ] Chrome Extension Privacy Best Practices

---

**Translation Note**: This document is also available in Arabic. In case of discrepancy, the English version prevails.
