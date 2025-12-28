# stt-test-template.test.ts

<!-- Metadata -->
**النوع:** قالب كود
**المرحلة:** 11
**المسار:** المرحلة-11-الاختبارات-والجودة-الشاملة/stt-test-template.test.ts
**التبعيات:** PERFORMANCE_BENCHMARKS.md

## 🎯 الغرض والهدف
توفير قالب كود لاختبارات الوحدة والتكامل الخاصة بنظام التعرف على الكلام (STT) باستخدام إطار عمل Jest.

```typescript
import { SttService } from '../src/stt/stt.service';
import { AudioFile, SttResult } from '../src/stt/stt.types';
import { loadAudioFile, calculateWER } from '../src/utils/test-utils';

describe('STT Service - Core Functionality', () => {
  let sttService: SttService;

  beforeAll(() => {
    // تهيئة الخدمة مع تكوين وهمي (Mock Configuration)
    sttService = new SttService(/* mock config */);
  });

  it('يجب أن يقوم بتحويل ملف صوتي نظيف إلى نص بدقة عالية (WER < 5%)', async () => {
    // تحميل ملف صوتي نظيف ونص مرجعي
    const cleanAudio: AudioFile = loadAudioFile('clean_speech.wav');
    const referenceText = 'هذا اختبار بسيط لجودة التعرف على الكلام.';

    // تنفيذ التحويل
    const result: SttResult = await sttService.transcribe(cleanAudio, 'ar-SA');

    // التحقق من أن النتيجة ليست فارغة
    expect(result.text).toBeDefined();
    
    // حساب معدل خطأ الكلمات (WER)
    const wer = calculateWER(referenceText, result.text);
    
    // التحقق من أن WER أقل من المعيار المحدد
    expect(wer).toBeLessThan(0.05); // 5%
  });

  it('يجب أن يتعامل مع ضجيج الخلفية ويحافظ على WER مقبول (WER < 15%)', async () => {
    const noisyAudio: AudioFile = loadAudioFile('noisy_speech.wav');
    const referenceText = 'الاجتماع سيبدأ في تمام الساعة العاشرة صباحًا.';

    const result: SttResult = await sttService.transcribe(noisyAudio, 'ar-SA');
    const wer = calculateWER(referenceText, result.text);

    // التحقق من أن WER أقل من المعيار المحدد للضوضاء
    expect(wer).toBeLessThan(0.15); // 15%
  });

  it('يجب أن يكون زمن الاستجابة أقل من 200 مللي ثانية', async () => {
    const shortAudio: AudioFile = loadAudioFile('short_clip.wav');
    const startTime = Date.now();

    await sttService.transcribe(shortAudio, 'en-US');
    const endTime = Date.now();
    const latency = endTime - startTime;

    // التحقق من أن زمن الاستجابة يفي بالمعيار
    expect(latency).toBeLessThan(200);
  });

  // اختبارات إضافية:
  // - اختبار اللهجات المختلفة
  // - اختبار التمييز بين المتحدثين (Diarization)
  // - اختبار الأخطاء (مثل ملف صوتي تالف)
});
```
---
**ملاحظات الجودة:**
- [ ] تم التحقق من الهيكل
- [ ] تم التحقق من الروابط
- [ ] تم مراجعة المحتوى
- [ ] تم تحقيق الترابط
