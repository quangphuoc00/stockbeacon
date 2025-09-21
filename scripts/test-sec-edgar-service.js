#!/usr/bin/env node

// Test SEC EDGAR Service directly

async function testSECEdgar() {
  console.log('Testing SEC EDGAR Service...\n');
  
  // Test 1: CIK Mapping
  console.log('1. Testing CIK Mapping');
  console.log('=======================');
  
  const testSymbols = ['AAPL', 'MSFT', 'GOOGL'];
  
  for (const symbol of testSymbols) {
    try {
      // Load CIK mapping
      const response = await fetch('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': 'StockBeacon/1.0' }
      });
      
      const data = await response.json();
      const company = Object.values(data).find(c => c.ticker === symbol);
      
      if (company) {
        const cik = String(company.cik_str).padStart(10, '0');
        console.log(`✅ ${symbol}: ${company.title} (CIK: ${cik})`);
      } else {
        console.log(`❌ ${symbol}: Not found`);
      }
    } catch (error) {
      console.error(`Error fetching CIK for ${symbol}:`, error.message);
    }
  }
  
  console.log('\n2. Testing Financial Data Fetch');
  console.log('================================');
  
  // Test with Apple
  const appleCik = '0000320193';
  
  try {
    const response = await fetch(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${appleCik}.json`,
      { headers: { 'User-Agent': 'StockBeacon/1.0' } }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const facts = data.facts['us-gaap'];
    
    // Check for key financial metrics
    const metrics = [
      'Revenues',
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'GrossProfit',
      'OperatingIncomeLoss',
      'NetIncomeLoss',
      'Assets',
      'StockholdersEquity'
    ];
    
    console.log('Available Financial Metrics:');
    metrics.forEach(metric => {
      if (facts[metric]) {
        const latestValue = facts[metric].units?.USD?.[facts[metric].units.USD.length - 1];
        if (latestValue) {
          console.log(`✅ ${metric}: $${(latestValue.val / 1e9).toFixed(2)}B (${latestValue.fy} ${latestValue.fp})`);
        }
      } else {
        console.log(`❌ ${metric}: Not found`);
      }
    });
    
    console.log(`\nTotal available metrics: ${Object.keys(facts).length}`);
    
  } catch (error) {
    console.error('Error fetching financial data:', error);
  }
}

testSECEdgar().catch(console.error);
