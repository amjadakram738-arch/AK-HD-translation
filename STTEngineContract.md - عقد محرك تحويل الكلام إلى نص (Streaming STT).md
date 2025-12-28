# STTEngineContract.md - عقد محرك تحويل الكلام إلى نص (Streaming STT)

## الهدف
تحديد العقد (Interface) الذي يجب أن يلتزم به أي محرك لتحويل الكلام إلى نص (STT) لدعم نمط التدفق المستمر (Streaming)، لضمان قابلية التبديل بين المحركات المختلفة (Google, Azure, Whisper).

## النطاق الوظيفي
1.  **استقبال التدفق:** استلام المقاطع الصوتية المتتالية (Audio Chunks) من `AudioCaptureManager` عبر `Background.js`.
2.  **التواصل مع Proxy:** إرسال التدفق الصوتي إلى نقطة نهاية STT الآمنة على الخادم الوسيط (Proxy).
3.  **إدارة الجلسة:** الحفاظ على جلسة اتصال مستمرة (WebSocket) مع الخادم الوسيط طوال مدة الترجمة.
4.  **إرجاع النتائج:** إرجاع النتائج الجزئية (Interim) والنهائية (Final) للنص المعترف به، بما في ذلك بيانات التوقيت (Timestamps).

## المسؤوليات
| المسؤولية | الوصف |
| :--- | :--- |
| **`IStreamingSTTEngine` Interface** | يجب أن يحدد العقد وظائف مثل `connect(sessionId)`, `send(chunk)`, `disconnect()`. |
| **إدارة WebSocket** | إنشاء وإدارة اتصال WebSocket مستمر مع الخادم الوسيط لتقليل زمن الاستجابة. |
| **تضمين التوقيتات** | التأكد من أن كل نتيجة نهائية للنص المعترف به تتضمن توقيتات البدء والانتهاء (Word-level Timestamps) اللازمة للمزامنة. |
| **التعامل مع الأخطاء** | معالجة أخطاء الاتصال أو أخطاء المحرك السحابي وإرسال إشعار إلى `Background.js`. |

## ما لا يقع ضمن مسؤوليته
*   التقاط الصوت (مسؤولية `AudioCaptureManager`).
*   الترجمة الفعلية للنص (مسؤولية `TranslationEngineContract`).
*   دمج النص المترجم مع التوقيتات (مسؤولية `SubtitleSynchronizer`).

## واجهة العقد المقترحة (Conceptual Interface)

```typescript
interface STTResult {
    text: string;
    isFinal: boolean;
    startTime: number; // بالمللي ثانية
    endTime: number;   // بالمللي ثانية
    sessionId: string;
}

interface IStreamingSTTEngine {
    /**
     * يبدأ جلسة اتصال جديدة مع محرك STT عبر Proxy.
     * @param sessionId معرف الجلسة الفريد.
     * @param language لغة الكلام المتوقع.
     */
    connect(sessionId: string, language: string): Promise<void>;

    /**
     * يرسل مقطع صوتي ثنائي إلى المحرك.
     * @param audioChunk البيانات الصوتية الثنائية.
     */
    send(audioChunk: ArrayBuffer): void;

    /**
     * ينهي جلسة الاتصال.
     */
    disconnect(): void;

    /**
     * حدث لاستقبال النتائج من المحرك.
     */
    onResult(callback: (result: STTResult) => void): void;
}
```
