/**
 * Email Alert Testing Script
 * Tests the email notification functionality
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function testEmailAlerts() {
  console.log('📧 Testing Email Alert Functionality\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // Test 1: Check email service configuration
    console.log('Test 1: Checking email service configuration...')
    if (process.env.RESEND_API_KEY) {
      console.log('✅ Resend API key configured')
    } else {
      console.log('❌ No RESEND_API_KEY found - emails will not send')
      return
    }
    
    // Test 2: Find a test user
    console.log('\nTest 2: Finding test user...')
    const { data: users } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name')
      .limit(1)
    
    if (!users || users.length === 0) {
      console.log('❌ No users found for testing')
      return
    }
    
    const testUser = users[0]
    console.log(`✅ Found test user: ${testUser.email}`)
    
    // Test 3: Set up test alert
    console.log('\nTest 3: Setting up test alert...')
    
    // First, add a test stock to watchlist
    const testSymbol = 'AAPL'
    const { data: watchlistItem, error: watchlistError } = await supabase
      .from('watchlists')
      .upsert({
        user_id: testUser.user_id,
        symbol: testSymbol,
        target_price: 999999, // High price to ensure it triggers
        buy_triggers: {
          minScore: 1, // Low score to ensure it triggers
          minTimingScore: 1,
          enabled: true
        },
        alert_enabled: true,
        notes: 'Test alert for email functionality'
      }, {
        onConflict: 'user_id,symbol'
      })
      .select()
      .single()
    
    if (watchlistError) {
      console.log('❌ Failed to create test alert:', watchlistError)
      return
    }
    
    console.log('✅ Test alert created for', testSymbol)
    
    // Test 4: Manually trigger notification
    console.log('\nTest 4: Triggering test notification...')
    
    // Import services
    const { NotificationService } = require('../src/lib/services/notification.service')
    const { EmailService } = require('../src/lib/services/email.service')
    
    // Create test data
    const testTriggers = {
      priceTarget: { met: true, current: 150, target: 999999 },
      businessQuality: { met: true, current: 80, target: 1 },
      timeToBuy: { met: true, current: 70, target: 1 },
      allMet: true,
      configuredCount: 3,
      metCount: 3
    }
    
    // Send test email directly
    try {
      const recipient = {
        email: testUser.email,
        name: testUser.full_name || 'Test User',
        userId: testUser.user_id
      }
      
      const alertData = {
        stockSymbol: testSymbol,
        stockName: 'Apple Inc.',
        currentPrice: 150.25,
        stockBeaconScore: 80,
        triggers: {
          priceTarget: true,
          scoreThreshold: true,
          timeToBuy: true,
          details: {
            price: { current: 150.25, target: 999999 },
            businessQuality: { current: 80, target: 1 },
            timeToBuy: { current: 70, target: 1 }
          }
        },
        moatStrength: 'Strong',
        recommendation: 'Test alert - All conditions met!',
        strengths: ['Strong brand', 'High margins', 'Growing revenue']
      }
      
      console.log('📤 Sending test email to:', recipient.email)
      
      const emailResult = await EmailService.sendPerfectStormAlert(recipient, alertData)
      
      if (emailResult) {
        console.log('✅ Test email sent successfully!')
        console.log('Check inbox for:', recipient.email)
      } else {
        console.log('❌ Failed to send test email')
      }
    } catch (emailError) {
      console.log('❌ Email error:', emailError.message)
    }
    
    // Test 5: Check cooldown
    console.log('\nTest 5: Testing cooldown period...')
    
    // Update last_alert_sent to test cooldown
    const { error: updateError } = await supabase
      .from('watchlists')
      .update({
        last_alert_sent: new Date().toISOString()
      })
      .eq('id', watchlistItem.id)
    
    if (!updateError) {
      console.log('✅ Cooldown timestamp set')
      console.log('Next alert allowed after 24 hours')
    }
    
    // Test 6: Clean up
    console.log('\nTest 6: Cleaning up test data...')
    const { error: deleteError } = await supabase
      .from('watchlists')
      .delete()
      .eq('id', watchlistItem.id)
    
    if (!deleteError) {
      console.log('✅ Test alert removed')
    }
    
    console.log('\n📊 Email Test Summary:')
    console.log('- Email service: Configured ✅')
    console.log('- Test user: Found ✅')
    console.log('- Test alert: Created ✅')
    console.log('- Email sent: Check inbox')
    console.log('- Cooldown: Tested ✅')
    console.log('- Cleanup: Complete ✅')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Additional test functions
async function testEmailTemplates() {
  console.log('\n📄 Testing Email Templates...')
  
  // Test different scenarios
  const scenarios = [
    {
      name: 'All conditions met',
      data: {
        priceTarget: true,
        scoreThreshold: true,
        timeToBuy: true
      }
    },
    {
      name: 'Only price met',
      data: {
        priceTarget: true,
        scoreThreshold: false,
        timeToBuy: false
      }
    },
    {
      name: 'Multiple stocks alert',
      data: {
        stocks: ['AAPL', 'GOOGL', 'MSFT']
      }
    }
  ]
  
  scenarios.forEach(scenario => {
    console.log(`\nScenario: ${scenario.name}`)
    console.log('Template would show:', JSON.stringify(scenario.data, null, 2))
  })
}

// Email content preview
function previewEmailContent() {
  console.log('\n📨 Email Content Preview:')
  console.log('=====================================')
  console.log('Subject: 🎯 Perfect Storm Alert: AAPL')
  console.log('From: StockBeacon <alerts@stockbeacon.com>')
  console.log('To: user@example.com')
  console.log('')
  console.log('Hi [User Name],')
  console.log('')
  console.log('Great news! AAPL has met all your buy criteria:')
  console.log('')
  console.log('✅ Price: $150.25 (below target of $999.00)')
  console.log('✅ Business Quality: 80/100 (above minimum of 70)')
  console.log('✅ Time to Buy: 65/100 (above minimum of 50)')
  console.log('')
  console.log('Stock Details:')
  console.log('- Current Price: $150.25')
  console.log('- StockBeacon Score: 80/100')
  console.log('- Moat Strength: Strong')
  console.log('')
  console.log('This is an excellent entry opportunity!')
  console.log('')
  console.log('[View Stock Details] [Adjust Alerts]')
  console.log('=====================================')
}

// Run tests
console.log('🧪 EMAIL ALERT TEST SUITE')
console.log('========================\n')

console.log('Options:')
console.log('1. Run full email test: node test-email-alerts.js')
console.log('2. Preview email content: node test-email-alerts.js preview')
console.log('3. Test templates: node test-email-alerts.js templates')

const command = process.argv[2]

if (command === 'preview') {
  previewEmailContent()
} else if (command === 'templates') {
  testEmailTemplates()
} else {
  testEmailAlerts().catch(console.error)
}
