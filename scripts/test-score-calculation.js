// Test script to calculate scores for a few stocks
// Run with: node scripts/test-score-calculation.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testScoreCalculation() {
  console.log('Testing score calculation for a few stocks...\n')
  
  // Test with just 5 popular stocks
  const testStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']
  
  try {
    const response = await fetch('http://localhost:3002/api/stocks/scores/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbols: testStocks })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result = await response.json()
    console.log('Score calculation triggered!')
    console.log('Result:', result)
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

// For quick testing, let's directly call the background calculator
async function directTest() {
  console.log('Direct test of background calculator...\n')
  
  // Dynamic import to use ES modules in CommonJS
  const { BackgroundScoreCalculator } = await import('../src/lib/services/background-score-calculator.js')
  const { ScorePersistenceService } = await import('../src/lib/services/score-persistence.service.js')
  
  // Just calculate scores for a few test stocks
  const testSymbols = ['AAPL', 'MSFT', 'GOOGL']
  console.log(`Calculating scores for: ${testSymbols.join(', ')}\n`)
  
  await BackgroundScoreCalculator.calculateScoresInBatches(testSymbols, 3)
  
  console.log('\nDone! Check the scores in your database.')
}

// Simple approach - just call the cron endpoint
async function callCronEndpoint() {
  console.log('Calling cron endpoint to start full S&P 500 calculation...\n')
  console.log('This will take 20-30 minutes for all 500 stocks.')
  console.log('Watch the server logs for detailed progress.\n')
  
  try {
    const response = await fetch('http://localhost:3002/api/cron/update-scores', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'test-secret'}`
      }
    })
    
    const text = await response.text()
    console.log('Response status:', response.status)
    console.log('Response:', text)
    
    if (response.ok) {
      console.log('\n✅ Score calculation started! Check your server logs for progress.')
    } else {
      console.log('\n❌ Failed to start calculation.')
    }
    
  } catch (error) {
    console.error('Error calling cron endpoint:', error.message)
    console.log('\nMake sure your Next.js server is running on port 3002')
  }
}

// Run the simple cron call
callCronEndpoint()
