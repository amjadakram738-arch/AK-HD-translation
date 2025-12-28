// database-model-template.ts

/**
 * @fileoverview قالب لكائنات قاعدة البيانات (Data Models)
 * يستخدم لإنشاء نماذج البيانات المتوافقة مع مخطط قاعدة البيانات.
 * يعتمد على مواصفات DATA_MODEL_SPECIFICATIONS.md
 */

import { LanguageCode, EngineType } from './types'; // افتراض وجود ملف أنواع موحدة

// 1. نموذج إعدادات المستخدم
export interface UserSettingsModel {
  user_id: string;
  settings_json: string; // يجب أن يكون مشفراً
  last_updated: number; // طابع زمني
}

// 2. نموذج التخزين المؤقت للترجمة
export interface TranslationCacheModel {
  source_hash: string;
  target_text: string;
  engine_used: EngineType;
  source_lang: LanguageCode;
  target_lang: LanguageCode;
  expiry_date: number;
}

// 3. نموذج التخزين المؤقت للتعرف على الكلام
export interface STTCacheModel {
  audio_hash: string;
  recognized_text: string;
  engine_used: EngineType;
  language_code: LanguageCode;
  expiry_date: number;
}

// 4. نموذج المصطلحات المخصصة
export interface CustomTermsModel {
  term_id: number;
  user_id: string;
  source_term: string;
  target_term: string;
  context: string | null;
}

// 5. نموذج سجلات الأخطاء (للتخزين المحلي/السحابي)
export interface ErrorLogModel {
  log_id: number;
  error_code: string;
  details_json: string;
  timestamp: number;
  is_synced: boolean; // هل تم مزامنته مع السحابة
}

// مثال على كيفية استخدام النماذج
const exampleSettings: UserSettingsModel = {
  user_id: 'user-123',
  settings_json: '{"theme": "dark", "default_lang": "ar"}',
  last_updated: Date.now(),
};

console.log('Example User Settings Model:', exampleSettings);
