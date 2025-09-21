#!/usr/bin/env node

/**
 * Cache warming script for StockBeacon
 * Pre-fetches financial data for popular stocks to improve performance
 */

const popularStocks = [
  // Mega caps
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B',
  
  // Popular tech
  'AMD', 'INTC', 'NFLX', 'CRM', 'ORCL', 'ADBE', 'PYPL', 'SQ',
  
  // Financial
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC',
  
  // Healthcare
  'JNJ', 'UNH', 'PFE', 'ABBV', 'TMO', 'ABT', 'CVS', 'LLY',
  
  // Consumer
  'WMT', 'HD', 'PG', 'KO', 'PEP', 'MCD', 'NKE', 'SBUX'
];

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function warmCache() {
  console.log('🔥 Starting cache warming for popular stocks...\n');
  
  const results = {
    success: 0,
    failed: 0,
    alreadyCached: 0
  };
  
  for (const symbol of popularStocks) {
    process.stdout.write(`📊 ${symbol}: `);
    
    try {
      // Fetch financial statements
      const statementsRes = await fetch(`${BASE_URL}/api/stocks/${symbol}/financial-statements`);
      const cacheStatus = statementsRes.headers.get('X-Cache-Status');
      
      if (cacheStatus === 'HIT') {
        process.stdout.write('✓ (cached) ');
        results.alreadyCached++;
      } else if (statementsRes.ok) {
        process.stdout.write('✓ (fetched) ');
        results.success++;
        
        // Also trigger analysis to cache that too
        const analysisRes = await fetch(`${BASE_URL}/api/stocks/${symbol}/analysis`);
        if (analysisRes.ok) {
          process.stdout.write('+ analysis ');
        }
      } else {
        process.stdout.write(`✗ (${statementsRes.status}) `);
        results.failed++;
      }
      
      console.log('');
      
      // Rate limit to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      process.stdout.write(`✗ (error: ${error.message}) `);
      results.failed++;
      console.log('');
    }
  }
  
  console.log('\n📈 Cache warming complete!');
  console.log(`   ✅ Success: ${results.success}`);
  console.log(`   💾 Already cached: ${results.alreadyCached}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   📊 Total: ${popularStocks.length}`);
}

// Run the script
warmCache().catch(console.error);
