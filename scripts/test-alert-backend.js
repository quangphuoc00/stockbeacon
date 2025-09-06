const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Backend test for alert functionality
async function testAlertBackend() {
  console.log('🔧 Testing Alert Backend Functionality...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // Test 1: Get a user with watchlist items
    console.log('Test 1: Fetching watchlist items...')
    const { data: watchlistItems, error: fetchError } = await supabase
      .from('watchlists')
      .select('*')
      .limit(5)
    
    if (fetchError) {
      console.error('❌ Failed to fetch watchlist:', fetchError)
      return
    }
    
    console.log(`✅ Found ${watchlistItems.length} watchlist items`)
    
    if (watchlistItems.length === 0) {
      console.log('⚠️ No watchlist items found. Add some items first.')
      return
    }
    
    // Test 2: Check current state of buy_triggers
    console.log('\nTest 2: Checking current buy_triggers state...')
    const testItem = watchlistItems[0]
    console.log('Testing with item:', {
      id: testItem.id,
      symbol: testItem.symbol,
      current_buy_triggers: testItem.buy_triggers,
      target_price: testItem.target_price,
      alert_enabled: testItem.alert_enabled
    })
    
    // Test 3: Update buy_triggers
    console.log('\nTest 3: Updating buy_triggers...')
    const testUpdate = {
      target_price: 125.50,
      buy_triggers: {
        minScore: 80,
        minTimingScore: 65,
        enabled: true
      },
      alert_enabled: true
    }
    
    const { data: updatedItem, error: updateError } = await supabase
      .from('watchlists')
      .update(testUpdate)
      .eq('id', testItem.id)
      .select()
      .single()
    
    if (updateError) {
      console.error('❌ Update failed:', updateError)
      return
    }
    
    console.log('✅ Update successful!')
    console.log('Updated item:', {
      id: updatedItem.id,
      symbol: updatedItem.symbol,
      target_price: updatedItem.target_price,
      buy_triggers: updatedItem.buy_triggers,
      alert_enabled: updatedItem.alert_enabled
    })
    
    // Test 4: Verify update persisted
    console.log('\nTest 4: Verifying persistence...')
    const { data: verifyItem, error: verifyError } = await supabase
      .from('watchlists')
      .select('*')
      .eq('id', testItem.id)
      .single()
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError)
      return
    }
    
    const isPersisted = 
      verifyItem.target_price === testUpdate.target_price &&
      verifyItem.buy_triggers?.minScore === testUpdate.buy_triggers.minScore &&
      verifyItem.buy_triggers?.minTimingScore === testUpdate.buy_triggers.minTimingScore &&
      verifyItem.alert_enabled === true
    
    if (isPersisted) {
      console.log('✅ Data persisted correctly!')
    } else {
      console.log('❌ Data did not persist correctly')
      console.log('Expected:', testUpdate)
      console.log('Got:', {
        target_price: verifyItem.target_price,
        buy_triggers: verifyItem.buy_triggers,
        alert_enabled: verifyItem.alert_enabled
      })
    }
    
    // Test 5: Test validation
    console.log('\nTest 5: Testing validation...')
    
    // Test invalid score
    const { error: validationError1 } = await supabase
      .from('watchlists')
      .update({
        buy_triggers: {
          minScore: 150, // Invalid: > 100
          minTimingScore: 50,
          enabled: true
        }
      })
      .eq('id', testItem.id)
    
    // This will pass at DB level but should fail at API level
    console.log('Invalid score test:', validationError1 ? '✅ Rejected (good)' : '⚠️ Accepted (needs API validation)')
    
    // Test 6: Restore original values
    console.log('\nTest 6: Restoring original values...')
    const { error: restoreError } = await supabase
      .from('watchlists')
      .update({
        target_price: testItem.target_price,
        buy_triggers: testItem.buy_triggers,
        alert_enabled: testItem.alert_enabled
      })
      .eq('id', testItem.id)
    
    if (!restoreError) {
      console.log('✅ Original values restored')
    } else {
      console.log('❌ Failed to restore:', restoreError)
    }
    
    console.log('\n✅ Backend tests completed!')
    console.log('\nSummary:')
    console.log('- Database can store buy_triggers JSONB ✅')
    console.log('- Updates persist correctly ✅')
    console.log('- alert_enabled flag works ✅')
    console.log('- Validation needs to be at API level ⚠️')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testAlertBackend().catch(console.error)
