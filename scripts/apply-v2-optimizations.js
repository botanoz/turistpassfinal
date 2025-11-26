#!/usr/bin/env node

/**
 * Script to apply V2 performance optimizations
 * Run: node scripts/apply-v2-optimizations.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, '..', filePath));
}

function backupFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  const backupPath = fullPath.replace(/(\.\w+)$/, '.backup$1');

  if (fs.existsSync(fullPath)) {
    fs.copyFileSync(fullPath, backupPath);
    log(`✓ Backed up ${filePath} → ${path.basename(backupPath)}`, 'green');
    return true;
  }
  return false;
}

function copyFile(source, destination) {
  const sourcePath = path.join(__dirname, '..', source);
  const destPath = path.join(__dirname, '..', destination);

  if (!fs.existsSync(sourcePath)) {
    log(`✗ Source file not found: ${source}`, 'red');
    return false;
  }

  fs.copyFileSync(sourcePath, destPath);
  log(`✓ Copied ${source} → ${destination}`, 'green');
  return true;
}

function ensureImportInLayout() {
  const layoutPath = path.join(__dirname, '..', 'app', 'layout.tsx');

  if (!fs.existsSync(layoutPath)) {
    log('✗ app/layout.tsx not found', 'red');
    return false;
  }

  const content = fs.readFileSync(layoutPath, 'utf8');

  if (content.includes("import './admin-performance.css'")) {
    log('✓ admin-performance.css already imported in app/layout.tsx', 'yellow');
    return true;
  }

  // Find the position after other CSS imports
  const importRegex = /import\s+['"].*\.css['"]/g;
  const matches = [...content.matchAll(importRegex)];

  if (matches.length > 0) {
    const lastImport = matches[matches.length - 1];
    const insertPosition = lastImport.index + lastImport[0].length;

    const newContent =
      content.slice(0, insertPosition) +
      "\nimport './admin-performance.css'" +
      content.slice(insertPosition);

    fs.writeFileSync(layoutPath, newContent, 'utf8');
    log("✓ Added import './admin-performance.css' to app/layout.tsx", 'green');
    return true;
  } else {
    log('⚠ Could not find CSS imports in app/layout.tsx. Please add manually:', 'yellow');
    log("  import './admin-performance.css'", 'blue');
    return false;
  }
}

function addCacheVersionMigration() {
  const layoutPath = path.join(__dirname, '..', 'components', 'admin', 'AdminLayout.tsx');

  if (!fs.existsSync(layoutPath)) {
    log('✗ components/admin/AdminLayout.tsx not found', 'red');
    return false;
  }

  const content = fs.readFileSync(layoutPath, 'utf8');

  if (content.includes('admin_cache_version')) {
    log('✓ Cache version migration already exists', 'yellow');
    return true;
  }

  // Find useEffect section or add after imports
  const migrationCode = `
  // One-time cache migration
  useEffect(() => {
    try {
      const cacheVersion = sessionStorage.getItem('admin_cache_version');
      if (cacheVersion !== '2') {
        sessionStorage.removeItem('admin_profile');
        sessionStorage.removeItem('admin_cache_time');
        sessionStorage.setItem('admin_cache_version', '2');
      }
    } catch (error) {
      console.error('Cache migration error:', error);
    }
  }, []);
`;

  // Try to insert after first useEffect or at component start
  const useEffectMatch = content.match(/useEffect\(\(\) => \{/);

  if (useEffectMatch) {
    const insertPosition = content.indexOf(useEffectMatch[0]) + useEffectMatch[0].length;
    const newContent =
      content.slice(0, insertPosition) +
      migrationCode +
      content.slice(insertPosition);

    fs.writeFileSync(layoutPath, newContent, 'utf8');
    log('✓ Added cache version migration to AdminLayout.tsx', 'green');
    return true;
  } else {
    log('⚠ Could not automatically add cache migration. Please add manually.', 'yellow');
    return false;
  }
}

async function main() {
  log('\n========================================', 'blue');
  log('  V2 Performance Optimizations Setup', 'blue');
  log('========================================\n', 'blue');

  // Step 1: Check required files exist
  log('Step 1: Checking required files...', 'blue');
  const requiredFiles = [
    'components/admin/AdminLayout.v2.tsx',
    'app/admin-performance.css',
    'next.config.optimized.js',
  ];

  let allFilesExist = true;
  for (const file of requiredFiles) {
    if (fileExists(file)) {
      log(`✓ Found ${file}`, 'green');
    } else {
      log(`✗ Missing ${file}`, 'red');
      allFilesExist = false;
    }
  }

  if (!allFilesExist) {
    log('\n✗ Some required files are missing. Aborting.', 'red');
    process.exit(1);
  }

  log('\n✓ All required files found\n', 'green');

  // Step 2: Create backups
  log('Step 2: Creating backups...', 'blue');
  backupFile('components/admin/AdminLayout.tsx');
  backupFile('next.config.js');
  log('');

  // Step 3: Apply optimizations
  log('Step 3: Applying optimizations...', 'blue');

  const success =
    copyFile('components/admin/AdminLayout.v2.tsx', 'components/admin/AdminLayout.tsx') &&
    copyFile('next.config.optimized.js', 'next.config.js');

  if (!success) {
    log('\n✗ Failed to copy files. Check errors above.', 'red');
    process.exit(1);
  }

  log('');

  // Step 4: Add CSS import
  log('Step 4: Adding CSS import to layout...', 'blue');
  ensureImportInLayout();
  log('');

  // Step 5: Add cache migration
  log('Step 5: Adding cache version migration...', 'blue');
  addCacheVersionMigration();
  log('');

  // Step 6: Instructions
  log('========================================', 'blue');
  log('  Next Steps', 'blue');
  log('========================================\n', 'blue');

  log('1. Rebuild the application:', 'yellow');
  log('   npm run build\n', 'blue');

  log('2. Clear browser cache and test:', 'yellow');
  log('   - Open Chrome DevTools', 'blue');
  log('   - Go to Application → Storage → Clear site data', 'blue');
  log('   - Navigate admin panel and check INP metrics\n', 'blue');

  log('3. If you encounter issues, rollback:', 'yellow');
  log('   cp components/admin/AdminLayout.backup.tsx components/admin/AdminLayout.tsx', 'blue');
  log('   cp next.config.backup.js next.config.js', 'blue');
  log('   npm run build\n', 'blue');

  log('4. Read full documentation:', 'yellow');
  log('   See APPLY_V2_OPTIMIZATIONS.md for complete guide\n', 'blue');

  log('========================================', 'green');
  log('  Optimizations Applied Successfully!', 'green');
  log('========================================\n', 'green');
}

main().catch((error) => {
  log(`\n✗ Error: ${error.message}`, 'red');
  process.exit(1);
});
