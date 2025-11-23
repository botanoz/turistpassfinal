const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

console.log('='.repeat(60));
console.log('ENVIRONMENT VARIABLES CHECK');
console.log('='.repeat(60));
console.log('');

console.log('NEXT_PUBLIC_SUPABASE_URL:');
console.log('  Exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('  Value:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('');

console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:');
console.log('  Exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('  Length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0);
console.log('  First 30 chars:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30));
console.log('');

console.log('SUPABASE_SERVICE_ROLE_KEY:');
console.log('  Exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('  Length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
console.log('  First 30 chars:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 30));
console.log('');

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('❌ SERVICE ROLE KEY IS MISSING!');
  console.log('This is why you get "permission denied" errors.');
} else if (process.env.SUPABASE_SERVICE_ROLE_KEY.length < 100) {
  console.log('⚠️  SERVICE ROLE KEY LOOKS TOO SHORT!');
  console.log('Expected ~200+ characters, got:', process.env.SUPABASE_SERVICE_ROLE_KEY.length);
} else {
  console.log('✅ Service role key looks good');
}

console.log('');
console.log('='.repeat(60));
