/**
 * Script to fix Row Level Security policies for watchlists table
 * Run this script to enable users to add items to their watchlist
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Need service role key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.log('Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file')
  console.log('You can find it in your Supabase dashboard under Settings > API')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
})

async function applyRLSPolicies() {
  console.log('🔧 Applying RLS policies for watchlists table...')
  
  try {
    // Drop existing policies if they exist (to avoid conflicts)
    const dropPolicies = [
      'DROP POLICY IF EXISTS watchlists_select_own ON public.watchlists',
      'DROP POLICY IF EXISTS watchlists_insert_own ON public.watchlists',
      'DROP POLICY IF EXISTS watchlists_update_own ON public.watchlists',
      'DROP POLICY IF EXISTS watchlists_delete_own ON public.watchlists'
    ]
    
    for (const sql of dropPolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error && !error.message.includes('does not exist')) {
        console.error('Error dropping policy:', error)
      }
    }
    
    // Create new policies
    const createPolicies = [
      // Enable RLS
      'ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY',
      
      // Select policy
      `CREATE POLICY watchlists_select_own ON public.watchlists
        FOR SELECT USING (auth.uid() = user_id)`,
      
      // Insert policy
      `CREATE POLICY watchlists_insert_own ON public.watchlists
        FOR INSERT WITH CHECK (auth.uid() = user_id)`,
      
      // Update policy
      `CREATE POLICY watchlists_update_own ON public.watchlists
        FOR UPDATE USING (auth.uid() = user_id)`,
      
      // Delete policy
      `CREATE POLICY watchlists_delete_own ON public.watchlists
        FOR DELETE USING (auth.uid() = user_id)`
    ]
    
    for (const sql of createPolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) {
        console.error('Error creating policy:', error)
        throw error
      }
    }
    
    console.log('✅ RLS policies applied successfully!')
    console.log('Users can now add stocks to their watchlist.')
    
  } catch (error) {
    console.error('❌ Failed to apply RLS policies:', error)
    console.log('\n📝 Manual Fix Instructions:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to the SQL Editor')
    console.log('3. Run the following SQL:')
    console.log('----------------------------------------')
    console.log(`
-- Enable RLS on watchlists table
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

-- Users can only see their own watchlist items
CREATE POLICY watchlists_select_own ON public.watchlists
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert into their own watchlist
CREATE POLICY watchlists_insert_own ON public.watchlists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own watchlist items
CREATE POLICY watchlists_update_own ON public.watchlists
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own watchlist items
CREATE POLICY watchlists_delete_own ON public.watchlists
    FOR DELETE USING (auth.uid() = user_id);
    `)
    console.log('----------------------------------------')
  }
}

// Check if exec_sql function exists, if not create it
async function setupExecSqlFunction() {
  const createFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
  `
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' })
    if (error) {
      // Function doesn't exist, provide manual instructions
      throw new Error('exec_sql function not available')
    }
  } catch (error) {
    console.log('\n⚠️  Cannot automatically apply policies.')
    console.log('\n📝 Please run this SQL in your Supabase dashboard:')
    console.log('----------------------------------------')
    console.log(`
-- Enable RLS on watchlists table
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

-- Users can only see their own watchlist items
CREATE POLICY watchlists_select_own ON public.watchlists
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert into their own watchlist
CREATE POLICY watchlists_insert_own ON public.watchlists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own watchlist items
CREATE POLICY watchlists_update_own ON public.watchlists
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own watchlist items
CREATE POLICY watchlists_delete_own ON public.watchlists
    FOR DELETE USING (auth.uid() = user_id);
    `)
    console.log('----------------------------------------')
    process.exit(0)
  }
}

// Run the script
setupExecSqlFunction().then(() => applyRLSPolicies())
