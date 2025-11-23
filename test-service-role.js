const fs = require('fs');
const path = require('path');

// Load .env.local
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

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('='.repeat(60));
console.log('TESTING SERVICE ROLE DIRECT ACCESS');
console.log('='.repeat(60));
console.log('');
console.log('URL:', supabaseUrl);
console.log('Service Role Key Length:', serviceRoleKey?.length);
console.log('');

// Decode JWT to see role
if (serviceRoleKey) {
  try {
    const base64Url = serviceRoleKey.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = JSON.parse(Buffer.from(base64, 'base64').toString());
    console.log('JWT Payload:', JSON.stringify(jsonPayload, null, 2));
    console.log('JWT Role:', jsonPayload.role);
    console.log('');
  } catch (e) {
    console.error('Failed to decode JWT:', e.message);
  }
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function test() {
  console.log('Testing SELECT on customer_profiles...');
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('id, email')
    .limit(5);

  if (error) {
    console.error('❌ ERROR:', error);
  } else {
    console.log('✅ SUCCESS! Found', data.length, 'profiles');
    if (data.length > 0) {
      console.log('Sample data:', data[0]);
    }
  }

  console.log('');
  console.log('Testing INSERT on customer_profiles...');
  const testId = '00000000-0000-0000-0000-000000000001';
  const { data: insertData, error: insertError } = await supabase
    .from('customer_profiles')
    .insert({
      id: testId,
      email: 'test@serviceole.com',
      first_name: 'Service',
      last_name: 'Role Test',
      status: 'active'
    })
    .select();

  if (insertError) {
    console.error('❌ INSERT ERROR:', insertError);
  } else {
    console.log('✅ INSERT SUCCESS!', insertData);

    // Clean up
    await supabase.from('customer_profiles').delete().eq('id', testId);
    console.log('Cleanup done');
  }

  console.log('');
  console.log('='.repeat(60));
}

test().catch(console.error);
