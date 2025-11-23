/**
 * Script to remove old adminAuthService usage from admin components
 * Replaces old auth checks with comment since AdminLayout handles auth
 */

const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '../components/admin');
const files = [
  'AdminAnalytics.tsx',
  'AdminBusinesses.tsx',
  'AdminBusinessesWorking.tsx',
  'AdminCustomers.tsx',
  'AdminOrders.tsx',
  'AdminPasses.tsx',
  'AdminPassesWorking.tsx',
  'AdminSettings.tsx',
  'AdminSupport.tsx'
];

files.forEach(filename => {
  const filePath = path.join(componentsDir, filename);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${filename} (not found)`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Remove adminAuthService import
  if (content.includes('import { adminAuthService }')) {
    content = content.replace(/import\s+{\s*adminAuthService\s*}\s+from\s+['"]@\/lib\/services\/adminAuthService['"];\s*\n/g, '');
    modified = true;
  }

  // Remove useRouter import if only used for auth redirect
  const hasOtherRouterUsage = content.includes('router.push') && !content.includes('router.push("/admin/dashboard")') && !content.includes('router.push("/admin/login")');
  if (!hasOtherRouterUsage && content.includes('import { useRouter }')) {
    content = content.replace(/,\s*useRouter/g, '');
    content = content.replace(/useRouter,\s*/g, '');
    content = content.replace(/import\s+{\s*useRouter\s*}\s+from\s+['"]next\/navigation['"];\s*\n/g, '');
    modified = true;
  }

  // Remove router declaration
  if (content.includes('const router = useRouter();')) {
    content = content.replace(/\s*const\s+router\s*=\s*useRouter\(\);\s*\n/g, '');
    modified = true;
  }

  // Remove useEffect auth check
  const authCheckPattern = /\s*useEffect\(\(\)\s*=>\s*{\s*if\s*\(!adminAuthService\.isAuthenticated\(\).*?\}\s*,\s*\[router\]\);\s*\n/gs;
  if (authCheckPattern.test(content)) {
    content = content.replace(authCheckPattern, '\n  // Auth is handled by AdminLayout wrapper\n');
    modified = true;
  }

  // Alternative pattern with hasPermission
  const permissionCheckPattern = /\s*useEffect\(\(\)\s*=>\s*{\s*if\s*\(!adminAuthService\.isAuthenticated\(\)\s*\|\|\s*!adminAuthService\.hasPermission.*?\}\s*,\s*\[router\]\);\s*\n/gs;
  if (permissionCheckPattern.test(content)) {
    content = content.replace(permissionCheckPattern, '\n  // Auth and permissions are handled by AdminLayout wrapper\n');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${filename}`);
  } else {
    console.log(`ℹ️  No changes needed for ${filename}`);
  }
});

console.log('\n✨ All admin components updated!');
