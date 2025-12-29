# Troubleshooting Guide - Video Translate AI

## Common Issues

### Audio Capture Failed

**Symptom**: Error message "فشل في التقاط الصوت" (Audio capture failed)

**Causes**:
1. Permission not granted
2. Tab capture API not available
3. Cross-origin restrictions

**Solutions**:
1. Check browser permissions for tab capture
2. Ensure Chrome version supports `chrome.tabCapture`
3. Try refreshing the page
4. Check console for specific error messages

**Debug Steps**:
```javascript
// Check if tabCapture is available
console.log('tabCapture available:', !!chrome.tabCapture);

// Check active tab
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
console.log('Active tab:', tab?.id);
```

### Subtitles Not Appearing

**Symptom**: Translation started but no subtitles displayed

**Causes**:
1. Overlay not created
2. Video element not detected
3. Z-index issues with page styling

**Solutions**:
1. Check console for errors
2. Verify video element exists
3. Inspect overlay element in DevTools
4. Try different video on the page

**Debug Steps**:
```javascript
// Check if overlay exists
document.querySelector('.v-translate-overlay');

// Check if video was detected
document.querySelectorAll('video').length;
```

### DRM Protected Content

**Symptom**: Error "VIDEO_DRM_PROTECTED"

**Cause**: Content is protected by DRM (Netflix, Disney+, etc.)

**Solution**:
- This is expected behavior
- Cannot be bypassed
- Use official subtitle features on the platform

### High Latency

**Symptom**: Subtitles appear with significant delay

**Causes**:
1. Large chunk size
2. Slow network
3. Cloud API rate limiting

**Solutions**:
1. Reduce chunk size in settings (3000-5000ms)
2. Check internet connection
3. Try different STT provider
4. Enable VAD to skip silent segments

### Extension Not Working on Specific Sites

**Symptom**: Extension doesn't detect video on some sites

**Causes**:
1. Video in iframe (cross-origin)
2. Video created dynamically by JavaScript
3. Shadow DOM encapsulation

**Solutions**:
1. Right-click extension icon → "Translate this video"
2. Check if page uses modern player frameworks
3. Report site to developers

### Performance Issues

**Symptom**: Page slow when extension is active

**Solutions**:
1. Disable unused features
2. Reduce subtitle update frequency
3. Use local processing mode
4. Check for memory leaks in console

## Error Codes

| Code | Message | Solution |
|------|---------|----------|
| CAPTURE_FAILED | فشل في التقاط الصوت | Check permissions |
| OFFSCREEN_CREATION_FAILED | فشل في إنشاء Offscreen | Reload page |
| DRM_PROTECTED | محتوى محمي بـ DRM | Cannot bypass |
| CONNECTION_LOST | فقد الاتصال | Check network |
| RATE_LIMITED | تم تجاوز الحد | Wait and retry |
| AUTH_FAILED | فشل في التحقق | Check API keys |
| TIMEOUT | انتهى الوقت | Increase timeout |

## Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| tabCapture | ✅ | ✅ | ❌ | ❌ |
| Offscreen Docs | ✅ 109+ | ✅ 109+ | ❌ | ❌ |
| AudioWorklet | ✅ | ✅ | ✅ | ✅ |
| MediaRecorder | ✅ | ✅ | ✅ | ✅ |

## Logging and Debugging

### Enable Debug Mode

1. Open extension options
2. Enable "Debug Mode"
3. Check background script console

### View Logs

```bash
# Open Chrome logs
chrome://extensions/ → Background page → Console

# View content script logs
DevTools → Console (on any page with video)
```

### Export Debug Info

1. Open extension options
2. Go to "About" section
3. Click "Export Debug Info"

## Known Limitations

### Cannot Translate

- DRM-protected streams
- Audio-only content without video
- Autoplay videos with no audio track
- Videos in background tabs

### Performance Impact

- May increase CPU usage during capture
- Memory usage proportional to session length
- Battery impact on laptops

### Platform Limitations

- Requires active tab
- Cannot capture system audio
- Limited to Chromium-based browsers
