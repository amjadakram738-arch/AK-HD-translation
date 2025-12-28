# TranslationEngineContract.md - عقد محرك الترجمة

## الهدف
تحديد العقد (Interface) الذي يجب أن يلتزم به أي محرك ترجمة، لضمان قابلية التبديل بين محركات الترجمة المختلفة (Google, DeepL, إلخ) والعمل بكفاءة ضمن نظام التدفق المستمر.

## النطاق الوظيفي
1.  **استقبال النصوص:** استقبال النصوص المعترف بها (STT Results) من `STTEngineContract` عبر الخادم الوسيط (Proxy).
2.  **تنفيذ الترجمة:** استدعاء محرك الترجمة السحابي المناسب.
3.  **إرجاع النتائج:** إرجاع النص المترجم إلى `SubtitleSynchronizer` مع الحفاظ على بيانات التوقيت الأصلية.
4.  **إدارة التخزين المؤقت:** التحقق من وجود الترجمة في الذاكرة المؤقتة (Cache) قبل استدعاء المحرك السحابي لتقليل التكاليف وزمن الاستجابة.

## المسؤوليات
| المسؤولية | الوصف |
| :--- | :--- |
| **`ITranslationEngine` Interface** | يجب أن يحدد العقد وظيفة `translate(request: TranslationRequest)`. |
| **التخزين المؤقت (Cache)** | يجب أن يكون المحرك قادراً على التحقق من `Translation Cache` (المخزن على الخادم الوسيط) قبل إجراء طلب ترجمة جديد. |
| **الحفاظ على التوقيت** | يجب أن يضمن المحرك أن النص المترجم يعود مصحوباً ببيانات التوقيت الأصلية التي جاءت من STT. |
| **التعامل مع الأخطاء** | معالجة أخطاء API للترجمة وإرسال إشعار إلى `Background.js`. |

## ما لا يقع ضمن مسؤوليته
*   التقاط الصوت أو تحويله إلى نص (مسؤولية `AudioCaptureManager` و `STTEngineContract`).
*   تحديد أفضل محرك ترجمة (مسؤولية `Translation Orchestrator` على الخادم الوسيط).
*   عرض الترجمة أو مزامنتها (مسؤولية `SubtitleSynchronizer`).

## واجهة العقد المقترحة (Conceptual Interface)

```typescript
interface TranslationRequest {
    sourceText: string;
    sourceLang: string;
    targetLang: string;
    sessionId: string;
    sttTimestamps: { startTime: number, endTime: number }; // بيانات التوقيت من STT
}

interface TranslationResult {
    translatedText: string;
    engineId: string;
    latency: number;
    sttTimestamps: { startTime: number, endTime: number }; // إعادة بيانات التوقيت
}

interface ITranslationEngine {
    /**
     * ترجمة نص وإرجاع النتيجة مع بيانات التوقيت.
     * @param request طلب الترجمة.
     * @returns وعد بنتيجة الترجمة.
     */
    translate(request: TranslationRequest): Promise<TranslationResult>;
}
```
**ملاحظة هامة:** يجب أن يتم تنفيذ هذا العقد بالكامل على **الخادم الوسيط (Proxy)** لضمان أمان مفاتيح API ولإدارة التخزين المؤقت بكفاءة.
