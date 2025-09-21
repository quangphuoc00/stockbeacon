// Debug script to check trend rendering

const fetch = require('node-fetch');
global.fetch = fetch;

async function debugTrends() {
  console.log('🔍 Debugging Trend Charts Display\n');
  
  try {
    // 1. Check API response
    console.log('1️⃣ Checking API response for AAPL...');
    const response = await fetch('http://localhost:3000/api/stocks/AAPL/analysis');
    const data = await response.json();
    
    if (!data.keyTrends) {
      console.error('❌ No keyTrends in API response');
      return;
    }
    
    console.log(`✅ Found ${data.keyTrends.length} trends in API response\n`);
    
    // 2. Check each trend's data structure
    console.log('2️⃣ Checking trend data structure:');
    data.keyTrends.forEach((trend, index) => {
      console.log(`\nTrend ${index + 1}: ${trend.metric}`);
      console.log(`  - Direction: ${trend.direction}`);
      console.log(`  - Visual Indicator: ${trend.visualIndicator}`);
      console.log(`  - Has periods: ${trend.periods ? 'YES' : 'NO'}`);
      console.log(`  - Period count: ${trend.periods ? trend.periods.length : 0}`);
      console.log(`  - Has CAGR: ${trend.cagr !== undefined ? 'YES' : 'NO'}`);
      console.log(`  - Insight: ${trend.insight ? trend.insight.substring(0, 50) + '...' : 'None'}`);
      
      if (trend.periods && trend.periods.length > 0) {
        console.log(`  - First period: ${JSON.stringify(trend.periods[0])}`);
        console.log(`  - Last period: ${JSON.stringify(trend.periods[trend.periods.length - 1])}`);
      }
    });
    
    // 3. Check if data is complete for rendering
    console.log('\n3️⃣ Data completeness check:');
    const allHavePeriods = data.keyTrends.every(t => t.periods && t.periods.length > 0);
    const allHaveInsights = data.keyTrends.every(t => t.insight);
    
    console.log(`  - All trends have periods: ${allHavePeriods ? '✅' : '❌'}`);
    console.log(`  - All trends have insights: ${allHaveInsights ? '✅' : '❌'}`);
    
    // 4. Instructions
    console.log('\n4️⃣ Next steps:');
    console.log('  1. Open http://localhost:3000/stocks/AAPL');
    console.log('  2. Click "Financials" tab');
    console.log('  3. Click "Trends" tab');
    console.log('  4. Check browser console (F12) for errors');
    console.log('  5. Look for any React error boundaries');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugTrends();

