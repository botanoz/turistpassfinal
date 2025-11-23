const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkBusinessImages() {
  try {
    console.log('🔍 Checking business images...\n');

    // Fetch all businesses with business_accounts metadata
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select(`
        id,
        name,
        image_url,
        gallery_images,
        status,
        business_accounts(
          metadata
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching businesses:', error);
      return;
    }

    console.log(`📊 Found ${businesses.length} active businesses\n`);
    console.log('=' .repeat(80));

    businesses.forEach((business, index) => {
      console.log(`\n${index + 1}. ${business.name}`);
      console.log('─'.repeat(80));
      console.log(`   ID: ${business.id}`);
      console.log(`   Image URL: ${business.image_url || '❌ NULL'}`);
      console.log(`   Gallery Images: ${business.gallery_images ? JSON.stringify(business.gallery_images) : '❌ NULL'}`);

      const metadata = business.business_accounts?.[0]?.metadata;
      if (metadata?.profile?.images && metadata.profile.images.length > 0) {
        console.log(`   ✅ Metadata Images: ${JSON.stringify(metadata.profile.images)}`);
      } else {
        console.log(`   ❌ Metadata Images: NULL or empty`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Check complete!');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkBusinessImages();
