# translation-test-template.test.ts

<!-- Metadata -->
**النوع:** قالب كود
**المرحلة:** 11
**المسار:** المرحلة-11-الاختبارات-والجودة-الشاملة/translation-test-template.test.ts
**التبعيات:** stt-test-template.test.ts

## 🎯 الغرض والهدف
توفير قالب كود لاختبارات الوحدة والتكامل الخاصة بنظام الترجمة، مع التركيز على الدقة اللغوية، السياق، والسرعة.

```typescript
import { TranslationService } from '../src/translation/translation.service';
import { TranslationResult } from '../src/translation/translation.types';
import { calculateBLEU, calculateTER } from '../src/utils/test-utils';

describe('Translation Service - Core Functionality', () => {
  let translationService: TranslationService;

  beforeAll(() => {
    // تهيئة الخدمة مع تكوين وهمي
    translationService = new TranslationService(/* mock config */);
  });

  it('يجب أن يقوم بترجمة جملة بسيطة بدقة عالية (BLEU > 0.9)', async () => {
    const sourceText = 'The quick brown fox jumps over the lazy dog.';
    const targetLang = 'ar';
    const referenceText = 'الثعلب البني السريع يقفز فوق الكلب الكسول.';

    // تنفيذ الترجمة
    const result: TranslationResult = await translationService.translate(sourceText, 'en', targetLang);

    // التحقق من أن النتيجة ليست فارغة
    expect(result.translatedText).toBeDefined();
    
    // حساب درجة BLEU
    const bleuScore = calculateBLEU(referenceText, result.translatedText);
    
    // التحقق من أن BLEU أعلى من المعيار المحدد
    expect(bleuScore).toBeGreaterThan(0.9);
  });

  it('يجب أن يحافظ على السياق في الجمل الطويلة', async () => {
    const sourceText = 'The company announced its new product line, which is expected to revolutionize the market. It will be available next month.';
    const targetLang = 'ar';
    // النص المرجعي يضمن أن الضمير "It" تمت ترجمته بشكل صحيح إلى "سيكون" أو ما يعادله.
    const referenceText = 'أعلنت الشركة عن خط إنتاجها الجديد، والذي من المتوقع أن يحدث ثورة في السوق. سيكون متاحًا الشهر المقبل.';

    const result: TranslationResult = await translationService.translate(sourceText, 'en', targetLang);
    
    // استخدام تقييم بشري آلي (مثل نموذج لغة كبير) للتحقق من السياق
    const contextScore = await translationService.evaluateContext(sourceText, result.translatedText);

    expect(contextScore).toBeGreaterThan(0.8); // 80% للحفاظ على السياق
  });

  it('يجب أن يكون زمن الاستجابة أقل من 150 مللي ثانية', async () => {
    const sourceText = 'This is a test sentence for measuring translation latency.';
    const startTime = Date.now();

    await translationService.translate(sourceText, 'en', 'fr');
    const endTime = Date.now();
    const latency = endTime - startTime;

    // التحقق من أن زمن الاستجابة يفي بالمعيار
    expect(latency).toBeLessThan(150);
  });

  // اختبارات إضافية:
  // - اختبار المصطلحات المخصصة (Custom Terminology)
  // - اختبار النبرة (Tone)
  // - اختبار الأخطاء (مثل لغة غير مدعومة)
});
```
---
**ملاحظات الجودة:**
- [ ] تم التحقق من الهيكل
- [ ] تم التحقق من الروابط
- [ ] تم مراجعة المحتوى
- [ ] تم تحقيق الترابط
