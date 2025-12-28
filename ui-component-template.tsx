# 01-تنفيذ-واجهة-محرك-الترجمة

<!-- Metadata -->
**النوع:** تنفيذ
**المرحلة:** 4
**المسار:** المرحلة-4-نظام-الترجمة-متعدد-المحركات/01-تنفيذ-واجهة-محرك-الترجمة.md
**التبعيات:** المرحلة-3-النواة-الأساسية/SUCCESS_METRICS_PHASE3.md

## 🎯 الغرض والهدف
تنفيذ واجهة `ITranslationEngine` الموحدة التي تم تعريفها في المرحلة 3، والتي ستكون العقد البرمجي لجميع محركات الترجمة السحابية والمحلية.

## 📋 المتطلبات الأساسية
قبول تسليمات المرحلة 3، ووجود الأنواع الموحدة في `src/types/common.ts`.

## 🔗 العلاقات والترابط
### الملفات السابقة
- `المرحلة-3-النواة-الأساسية/SUCCESS_METRICS_PHASE3.md` - يمثل نقطة البداية للمرحلة 4.
- `المرحلة-3-النواة-الأساسية/03-تهيئة-نظام-الأنواع-الموحدة.md` - يحتوي على تعريف `ITranslationEngine`.

### الملفات اللاحقة  
- `02-تنفيذ-محول-Google-Translate.md` - أول محرك سيتم تنفيذه.
- `03-تنفيذ-محول-DeepL.md` - ثاني محرك سيتم تنفيذه.

## 🏗 البنية التفصيلية
### 1. مراجعة واجهة `ITranslationEngine`
**الوصف:** التأكد من أن الواجهة تغطي جميع المتطلبات الوظيفية (FR2.0) وغير الوظيفية (NFR1.0) المتعلقة بالترجمة.

```typescript
// src/types/common.ts (مقتطف)
export interface ITranslationEngine {
  id: string; // معرف المحرك (مثل 'google', 'deepl')
  name: string; // اسم المحرك (مثل 'Google Translate')
  translate(request: TranslationRequest): Promise<TranslationResult>;
}

export interface TranslationRequest {
  text: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  requestId: string;
  engineId: string; // تم إضافته ليكون جزءًا من الطلب
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  engineId: string;
  latency: number; // زمن الاستجابة (NFR1.0)
}
```

### 2. إنشاء مجلد المحولات (Adapters)
**الوصف:** إنشاء مجلد `src/core/adapters` لوضع جميع تطبيقات `ITranslationEngine` فيه.

### 3. تطبيق الواجهة الأساسي
**الوصف:** إنشاء فئة أساسية مجردة (Abstract Base Class) لتسهيل تنفيذ المحولات الأخرى.

```typescript
// src/core/adapters/BaseTranslationAdapter.ts
import { ITranslationEngine, TranslationRequest, TranslationResult } from '../../types/common';

export abstract class BaseTranslationAdapter implements ITranslationEngine {
  abstract id: string;
  abstract name: string;

  // يجب على كل محول تنفيذ هذه الدالة
  abstract translate(request: TranslationRequest): Promise<TranslationResult>;

  protected async fetchTranslation(url: string, options: RequestInit): Promise<TranslationResult> {
    const startTime = Date.now();
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const endTime = Date.now();
      
      // يجب على كل محول استخراج النص المترجم من الرد
      const translatedText = this.extractTranslatedText(data); 

      return {
        originalText: '', // سيتم تعيينه لاحقًا
        translatedText: translatedText,
        engineId: this.id,
        latency: endTime - startTime,
      };
    } catch (error) {
      // استخدام ErrorManager
      throw error;
    }
  }

  protected abstract extractTranslatedText(data: any): string;
}
```

## ⚙️ آلية العمل
يتم استخدام هذه الواجهة والفئة الأساسية لضمان أن جميع محركات الترجمة تتبع نفس العقد البرمجي، مما يسهل على `TranslationOrchestrator` التبديل بينها.

## 🔍 حالات الاستخدام
*   **حالة 1:** `TranslationOrchestrator` يستدعي `engine.translate(request)` دون الحاجة لمعرفة تفاصيل المحرك الداخلي.
*   **حالة 2:** يتم إضافة محرك ترجمة جديد، ويتم تنفيذه عن طريق وراثة `BaseTranslationAdapter`.

---
**ملاحظات الجودة:**
- [ ] تم التحقق من الهيكل
- [ ] تم التحقق من الروابط
- [ ] تم مراجعة المحتوى
- [ ] تم تحقيق الترابط
