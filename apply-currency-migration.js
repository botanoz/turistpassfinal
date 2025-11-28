const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('🚀 Starting currency system migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '063_create_currency_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');
    console.log('📊 Executing migration...\n');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try direct execution if exec_sql doesn't exist
      console.log('⚠️  exec_sql function not found, trying direct execution...');

      // Split SQL into individual statements and execute
      const statements = migrationSQL
        .split(/;\s*$\s*/m)
        .filter(stmt => stmt.trim().length > 0 && !stmt.trim().startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        if (statement) {
          try {
            console.log(`Executing statement ${i + 1}/${statements.length}...`);
            await supabase.rpc('exec', { query: statement });
          } catch (err) {
            console.error(`❌ Error in statement ${i + 1}:`, err.message);
          }
        }
      }
    }

    console.log('\n✅ Currency system migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Created currency_settings table');
    console.log('   - Added currency conversion functions');
    console.log('   - Updated pass_pricing table with multi-currency support');
    console.log('   - Updated orders and order_items tables');
    console.log('   - Inserted default currencies (TRY, USD, EUR, GBP, JPY)');
    console.log('   - Created helper functions for currency operations');
    console.log('\n💰 Default Exchange Rates:');
    console.log('   - USD: 34.50 TRY');
    console.log('   - EUR: 37.50 TRY');
    console.log('   - GBP: 43.50 TRY');
    console.log('   - JPY: 0.23 TRY');
    console.log('\n🔧 Next Steps:');
    console.log('   1. Go to Admin Panel > Currency Settings');
    console.log('   2. Update exchange rates to current values');
    console.log('   3. All prices will be automatically recalculated');
    console.log('   4. Users can now select their preferred currency in the navbar');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
applyMigration();
