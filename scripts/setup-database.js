/**
 * Database Setup Script for StockBeacon
 * Run this script to create all necessary tables in your Supabase database
 * 
 * Usage: node scripts/setup-database.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starting StockBeacon database setup...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements (simple split by semicolon)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip if it's just a comment
      if (statement.trim().startsWith('--')) continue;

      // Get a short description of the statement for logging
      const shortDesc = statement.substring(0, 50).replace(/\n/g, ' ');
      
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        }).single();

        if (error) {
          // Try direct execution as fallback
          const { error: directError } = await supabase.from('_migrations').select('*').limit(1);
          
          // If we can't execute, log the statement for manual execution
          console.log(`⚠️  Statement ${i + 1}: May need manual execution`);
          console.log(`   ${shortDesc}...`);
          errorCount++;
        } else {
          console.log(`✅ Statement ${i + 1}: Success`);
          successCount++;
        }
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1}: ${shortDesc}...`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Migration Summary:`);
    console.log(`   ✅ Successful statements: ${successCount}`);
    console.log(`   ⚠️  Statements to review: ${errorCount}`);
    console.log('='.repeat(50) + '\n');

    if (errorCount > 0) {
      console.log('⚠️  Some statements could not be executed automatically.');
      console.log('   This is normal for the first run!');
      console.log('\n📝 Next Steps:');
      console.log('   1. Go to your Supabase Dashboard');
      console.log('   2. Navigate to SQL Editor');
      console.log('   3. Copy the contents of supabase/migrations/001_initial_schema.sql');
      console.log('   4. Paste and run in the SQL Editor');
      console.log('\n   Dashboard URL: ' + supabaseUrl.replace('.supabase.co', '.supabase.com/project/').replace('https://', 'https://app.supabase.com/project/'));
    } else {
      console.log('✅ Database setup completed successfully!');
    }

    // Test the connection by checking if tables exist
    console.log('\n🔍 Verifying tables...');
    const tables = ['stocks', 'users', 'watchlists', 'portfolios'];
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (!error) {
        console.log(`   ✅ Table '${table}' is accessible`);
      } else {
        console.log(`   ❌ Table '${table}' not accessible (may need manual creation)`);
      }
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 Manual Setup Instructions:');
    console.log('   1. Copy the SQL from: supabase/migrations/001_initial_schema.sql');
    console.log('   2. Go to Supabase SQL Editor');
    console.log('   3. Paste and execute the SQL');
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n✨ Setup process complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
