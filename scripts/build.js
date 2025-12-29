/**
 * build.js - Build Script
 * 
 * المسؤوليات:
 * 1. تجميع ملفات الإضافة
 * 2. التحقق من الملفات المطلوبة
 * 3. إنشاء مجلد dist/
 */

const fs = require('fs-extra');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '../src');
const DIST_DIR = path.join(__dirname, '../dist');

const REQUIRED_FILES = [
  'manifest.json',
  'background/service_worker.js',
  'content/content_script.js',
  'overlay/overlay_styles.css',
  'ui/popup/popup.html',
  'ui/popup/popup.js'
];

const OPTIONAL_FILES = [
  'offscreen/offscreen.html',
  'offscreen/offscreen.js',
  'workers/audio_processor.worker.js',
  'workers/audio_processor.worklet.js',
  'ai_adapters/stt/mock_stt.js',
  'ai_adapters/translation/mock_translation.js',
  'shared/types.ts',
  'shared/utils.ts',
  'shared/storage.ts'
];

async function build() {
  console.log('🚀 بدء بناء الإضافة...\n');

  try {
    // إنشاء مجلد dist
    await fs.ensureDir(DIST_DIR);

    // التحقق من الملفات المطلوبة
    console.log('📁 التحقق من الملفات المطلوبة...');
    for (const file of REQUIRED_FILES) {
      const filePath = path.join(SOURCE_DIR, file);
      if (!await fs.pathExists(filePath)) {
        throw new Error(`الملف المفقود: ${file}`);
      }
      console.log(`  ✅ ${file}`);
    }

    // نسخ الملفات الإلزامية
    console.log('\n📦 نسخ الملفات الإلزامية...');
    for (const file of REQUIRED_FILES) {
      const src = path.join(SOURCE_DIR, file);
      const dest = path.join(DIST_DIR, file);
      await fs.ensureDir(path.dirname(dest));
      await fs.copy(src, dest);
      console.log(`  ✅ ${file}`);
    }

    // نسخ الملفات الاختيارية إن وجدت
    console.log('\n📦 نسخ الملفات الاختيارية...');
    for (const file of OPTIONAL_FILES) {
      const src = path.join(SOURCE_DIR, file);
      if (await fs.pathExists(src)) {
        const dest = path.join(DIST_DIR, file);
        await fs.ensureDir(path.dirname(dest));
        await fs.copy(src, dest);
        console.log(`  ✅ ${file}`);
      } else {
        console.log(`  ⏭️  ${file} (غير موجود)`);
      }
    }

    // نسخ الأيقونات
    console.log('\n🎨 نسخ الأيقونات...');
    const iconsSrc = path.join(__dirname, '../icons');
    const iconsDest = path.join(DIST_DIR, 'icons');
    if (await fs.pathExists(iconsSrc)) {
      await fs.copy(iconsSrc, iconsDest);
      console.log('  ✅ icons/');
    }

    // إنشاء ملف البناء
    const buildInfo = {
      version: '1.0.0',
      buildDate: new Date().toISOString(),
      files: [...REQUIRED_FILES, ...OPTIONAL_FILES.filter(f => fs.existsSync(path.join(SOURCE_DIR, f)))]
    };
    await fs.writeJson(path.join(DIST_DIR, 'build.json'), buildInfo, { spaces: 2 });

    console.log('\n✅ تم بناء الإضافة بنجاح!');
    console.log(`📁 موقع الإضافة: ${DIST_DIR}`);
    console.log('\n📝 للاختبار:');
    console.log('   1. افتح chrome://extensions/');
    console.log('   2. فعّل وضع المطور');
    console.log('   3. اضغط "تحميل إضافة غير محزومة"');
    console.log(`   4. اختر مجلد: ${DIST_DIR}`);
    
  } catch (error) {
    console.error('\n❌ خطأ في البناء:', error.message);
    process.exit(1);
  }
}

// تشغيل البناء
build();
