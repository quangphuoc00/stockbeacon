#!/usr/bin/env node

// Test SEC EDGAR service directly

async function testSECService() {
  console.log('Testing SEC EDGAR Service Integration...\n');
  
  // First test the SEC API directly
  const symbol = 'AAPL';
  const cik = '0000320193';
  
  console.log('1. Testing Direct SEC API');
  console.log('=========================');
  
  try {
    const response = await fetch(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
      { headers: { 'User-Agent': 'StockBeacon/1.0' } }
    );
    
    const data = await response.json();
    const facts = data.facts['us-gaap'];
    
    // Find latest 10-K revenue
    const revenue = facts.RevenueFromContractWithCustomerExcludingAssessedTax?.units?.USD || [];
    const latest10K = revenue.filter(r => r.form === '10-K' && !r.frame).slice(-1)[0];
    
    if (latest10K) {
      console.log(`✅ Found latest 10-K: ${latest10K.end} (FY ${latest10K.fy})`);
      console.log(`   Revenue: $${(latest10K.val / 1e9).toFixed(2)}B`);
      
      // Find matching data for same date
      const endDate = latest10K.end;
      console.log(`\n   Looking for data with end date: ${endDate}`);
      
      // Cost of revenue
      const costOfRevenue = facts.CostOfGoodsAndServicesSold?.units?.USD?.find(d => d.end === endDate && d.form === '10-K');
      console.log(`   Cost of Revenue: ${costOfRevenue ? '$' + (costOfRevenue.val / 1e9).toFixed(2) + 'B' : 'NOT FOUND'}`);
      
      // Gross profit
      const grossProfit = facts.GrossProfit?.units?.USD?.find(d => d.end === endDate && d.form === '10-K');
      console.log(`   Gross Profit: ${grossProfit ? '$' + (grossProfit.val / 1e9).toFixed(2) + 'B' : 'NOT FOUND'}`);
      
      // Operating income
      const opIncome = facts.OperatingIncomeLoss?.units?.USD?.find(d => d.end === endDate && d.form === '10-K');
      console.log(`   Operating Income: ${opIncome ? '$' + (opIncome.val / 1e9).toFixed(2) + 'B' : 'NOT FOUND'}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
  
  console.log('\n2. Testing via API Route');
  console.log('========================');
  
  try {
    const response = await fetch(`http://localhost:3000/api/stocks/${symbol}/financial-statements`);
    const data = await response.json();
    
    if (data.incomeStatements?.annual?.[0]) {
      const latest = data.incomeStatements.annual[0];
      console.log(`Latest Annual Statement (${latest.date}):`);
      console.log(`  Revenue: ${latest.revenue ? '$' + (latest.revenue / 1e9).toFixed(2) + 'B' : 'null'}`);
      console.log(`  Cost of Revenue: ${latest.costOfRevenue ? '$' + (latest.costOfRevenue / 1e9).toFixed(2) + 'B' : 'null'}`);
      console.log(`  Gross Profit: ${latest.grossProfit ? '$' + (latest.grossProfit / 1e9).toFixed(2) + 'B' : 'null'}`);
      console.log(`  Operating Income: ${latest.operatingIncome ? '$' + (latest.operatingIncome / 1e9).toFixed(2) + 'B' : 'null'}`);
      console.log(`  Net Income: ${latest.netIncome ? '$' + (latest.netIncome / 1e9).toFixed(2) + 'B' : 'null'}`);
      
      // Check if this is SEC data or Yahoo data
      const hasDetailedData = latest.grossProfit !== null || latest.operatingIncome !== null;
      console.log(`\n  Data Source: ${hasDetailedData ? 'SEC EDGAR (Detailed)' : 'Yahoo Finance (Limited)'}`);
    }
  } catch (error) {
    console.error('API Error:', error);
  }
}

testSECService();
