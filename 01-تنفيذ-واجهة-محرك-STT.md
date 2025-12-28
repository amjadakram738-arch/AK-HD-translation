
--- START OF FILE: 01-تنفيذ-واجهة-محرك-STT.md ---

# 01-تنفيذ-واجهة-محرك-STT

## 🏗 البنية التفصيلية
### 1. تعريف الواجهة `ISTTEngine`
**الوصف:** تعريف الواجهة `ISTTEngine` لدعم نموذج التدفق المستمر (Streaming).

```typescript
/**
 * واجهة محرك التعرف على الكلام (Speech-to-Text) بنموذج التدفق.
 */
export interface ISTTEngine {
  id: string;
  name: string;
  
  /**
   * بدء تدفق الصوت للمحرك.
   * @param stream تيار الوسائط الملتقط.
   */
  startStream(stream: MediaStream): Promise<void>;

  /**
   * إيقاف تدفق الصوت.
   */
  stopStream(): Promise<void>;

  /**
   * الاستماع لنتائج التعرف على الكلام (الجزئية والنهائية).
   */
  on(event: 'result', listener: (result: STTResult) => void): void;
}
```
(تعديل: تصحيح نموذج STT إلى Streaming لتقليل زمن الاستجابة وتحقيق متطلب الوقت الفعلي).

--- END OF FILE: 01-تنفيذ-واجهة-محرك-STT.md ---

--- START OF FILE: 02-تنفيذ-محول-Google-STT.md ---

# 02-تنفيذ-محول-Google-STT

## 🏗 البنية التفصيلية
### 1. تنفيذ `GoogleSTTAdapter`

```typescript
export class GoogleSTTAdapter extends BaseSTTAdapter {
  // ...
  async startStream(stream: MediaStream): Promise<void> {
    // يتم استدعاء نقطة نهاية آمنة على الخادم الوسيط (Proxy Server) الذي يضيف مفتاح API ويخدم الطلب. 
    // لا يتم فك تشفير المفتاح داخل العميل. (تعديل أمني: منع تسريب مفاتيح API).
    
    const proxyUrl = "https://api.yourproxy.com/v1/google-stt-stream";
    // منطق فتح اتصال WebSocket مع Proxy وتمرير التيار...
  }
}
```

--- END OF FILE: 02-تنفيذ-محول-Google-STT.md ---
