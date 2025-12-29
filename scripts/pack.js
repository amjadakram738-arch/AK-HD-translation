/**
 * pack.js - Packaging Script
 * 
 * المسؤوليات:
 * 1. إنشاء ملف ZIP للإضافة
 * 2. التحقق من صحة البناء
 */

const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

const SOURCE_DIR = path.join(__dirname, '../dist');
const OUTPUT_DIR = path.join(__dirname, '../build');

async function pack() {
  console.log('📦 بدء تجميع الإضافة...\n');

  try {
    // التحقق من وجود مجلد البناء
    if (!await fs.pathExists(SOURCE_DIR)) {
      throw new Error('لم يتم العثور على مجلد البناء. شغل npm run build أولاً.');
    }

    // إنشاء مجلد الإخراج
    await fs.ensureDir(OUTPUT_DIR);

    // اسم الملف
    const version = '1.0.0';
    const zipName = `video-translate-ai-v${version}.zip`;
    const zipPath = path.join(OUTPUT_DIR, zipName);

    // إنشاء_archive
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    // إنشاء تدفق الإخراج
    const output = fs.createWriteStream(zipPath);
    
    // معالجة الأحداث
    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    // إضافة مجلد dist إلى_archive
    archive.directory(SOURCE_DIR, false);

    // إنهاء_archive
    await archive.finalize();

    // الحصول على حجم الملف
    const stats = await fs.stat(zipPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('✅ تم تجميع الإضافة بنجاح!');
    console.log(`📁 الملف: ${zipPath}`);
    console.log(`📊 الحجم: ${sizeMB} MB`);
    console.log('\n📝 لنشر الإضافة:');
    console.log('   1. اذهب إلى Chrome Web Store Developer Dashboard');
    console.log('   2. ارفع ملف ZIP');
    console.log('   3. أكمل بيانات النشر');
    
  } catch (error) {
    console.error('\n❌ خطأ في التجميع:', error.message);
    process.exit(1);
  }
}

// تشغيل التجميع
pack();
