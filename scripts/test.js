/**
 * test.js - Test Runner
 * 
 * المسؤوليات:
 * 1. تشغيل اختبارات الوحدة
 * 2. التحقق من بنية الملفات
 */

const fs = require('fs-extra');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '../src');

async function runTests() {
  console.log('🧪 بدء الاختبارات...\n');

  let passed = 0;
  let failed = 0;
  const errors = [];

  try {
    // 1. اختبار وجود الملفات
    console.log('📁 اختبار وجود الملفات...');
    const requiredFiles = [
      'manifest.json',
      'background/service_worker.js',
      'content/content_script.js',
      'overlay/overlay_styles.css',
      'ui/popup/popup.html',
      'ui/popup/popup.js'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(SOURCE_DIR, file);
      if (await fs.pathExists(filePath)) {
        console.log(`  ✅ ${file}`);
        passed++;
      } else {
        console.log(`  ❌ ${file} - غير موجود`);
        errors.push(`Missing file: ${file}`);
        failed++;
      }
    }

    // 2. اختبار صحة JSON
    console.log('\n📋 اختبار صحة JSON...');
    const jsonFiles = ['manifest.json'];
    
    for (const file of jsonFiles) {
      const filePath = path.join(SOURCE_DIR, file);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        JSON.parse(content);
        console.log(`  ✅ ${file}`);
        passed++;
      } catch (e) {
        console.log(`  ❌ ${file} - ${e.message}`);
        errors.push(`Invalid JSON in ${file}: ${e.message}`);
        failed++;
      }
    }

    // 3. اختبار بنية manifest
    console.log('\n📝 اختبار بنية manifest...');
    const manifestPath = path.join(SOURCE_DIR, 'manifest.json');
    try {
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      
      const requiredFields = ['manifest_version', 'name', 'version', 'permissions', 'background', 'content_scripts'];
      const manifestErrors = [];

      for (const field of requiredFields) {
        if (manifest[field]) {
          console.log(`  ✅ manifest.${field}`);
          passed++;
        } else {
          console.log(`  ❌ manifest.${field} - حقل مطلوب`);
          manifestErrors.push(`Missing manifest field: ${field}`);
          failed++;
        }
      }

      errors.push(...manifestErrors);
    } catch (e) {
      console.log(`  ❌ ${e.message}`);
      failed++;
    }

    // 4. اختبار بناء الجملة JavaScript
    console.log('\n🔍 اختبار بناء الجملة JavaScript...');
    const jsFiles = [
      'background/service_worker.js',
      'content/content_script.js',
      'ui/popup/popup.js',
      'offscreen/offscreen.js'
    ];

    for (const file of jsFiles) {
      const filePath = path.join(SOURCE_DIR, file);
      if (await fs.pathExists(filePath)) {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          // استخدام Function للتحقق من بناء الجملة
          new Function(content);
          console.log(`  ✅ ${file}`);
          passed++;
        } catch (e) {
          console.log(`  ❌ ${file} - ${e.message}`);
          errors.push(`JS syntax error in ${file}: ${e.message}`);
          failed++;
        }
      }
    }

    // 5. اختبار وجود الأيقونات
    console.log('\n🎨 اختبار الأيقونات...');
    const icons = ['icon16.png', 'icon48.png', 'icon128.png'];
    
    for (const icon of icons) {
      const iconPath = path.join(SOURCE_DIR, '..', 'icons', icon);
      if (await fs.pathExists(iconPath)) {
        console.log(`  ✅ ${icon}`);
        passed++;
      } else {
        console.log(`  ⚠️ ${icon} - غير موجود (اختياري)`);
      }
    }

    // ملخص الاختبارات
    console.log('\n' + '='.repeat(50));
    console.log('📊 ملخص الاختبارات');
    console.log('='.repeat(50));
    console.log(`✅ نجح: ${passed}`);
    console.log(`❌ فشل: ${failed}`);
    console.log(`📋 المجموع: ${passed + failed}`);

    if (errors.length > 0) {
      console.log('\n⚠️ الأخطاء:');
      errors.forEach(e => console.log(`   - ${e}`));
    }

    if (failed > 0) {
      console.log('\n❌ بعض الاختبارات فشلت!');
      process.exit(1);
    } else {
      console.log('\n✅ جميع الاختبارات نجحت!');
    }

  } catch (error) {
    console.error('\n❌ خطأ في تشغيل الاختبارات:', error.message);
    process.exit(1);
  }
}

// تشغيل الاختبارات
runTests();
