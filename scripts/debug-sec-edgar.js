#!/usr/bin/env node

// Debug SEC EDGAR data mapping

async function debugSECEdgar() {
  const symbol = 'AAPL';
  const cik = '0000320193';
  
  console.log('Fetching SEC EDGAR data for', symbol, '...\n');
  
  try {
    const response = await fetch(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
      { headers: { 'User-Agent': 'StockBeacon/1.0' } }
    );
    
    const data = await response.json();
    const facts = data.facts['us-gaap'];
    
    console.log('1. Looking for Revenue tags:');
    console.log('=============================');
    const revenueKeys = Object.keys(facts).filter(key => 
      key.toLowerCase().includes('revenue') || 
      key.toLowerCase().includes('sales')
    );
    console.log('Found revenue-related tags:', revenueKeys);
    
    // Check each revenue tag
    revenueKeys.forEach(key => {
      const latestData = facts[key]?.units?.USD?.slice(-1)[0];
      if (latestData) {
        console.log(`  ${key}: $${(latestData.val / 1e9).toFixed(2)}B (${latestData.fy} ${latestData.fp})`);
      }
    });
    
    console.log('\n2. Looking for Cost/Expense tags:');
    console.log('==================================');
    const costKeys = Object.keys(facts).filter(key => 
      key.toLowerCase().includes('cost') || 
      key.toLowerCase().includes('expense')
    );
    console.log('Found cost-related tags:', costKeys.slice(0, 10), '...');
    
    console.log('\n3. Looking for Gross Profit:');
    console.log('=============================');
    const grossProfitKeys = Object.keys(facts).filter(key => 
      key.toLowerCase().includes('gross') && key.toLowerCase().includes('profit')
    );
    console.log('Found gross profit tags:', grossProfitKeys);
    
    grossProfitKeys.forEach(key => {
      const latestData = facts[key]?.units?.USD?.slice(-1)[0];
      if (latestData) {
        console.log(`  ${key}: $${(latestData.val / 1e9).toFixed(2)}B (${latestData.fy} ${latestData.fp})`);
      }
    });
    
    console.log('\n4. Checking specific XBRL tags we use:');
    console.log('=======================================');
    const tagsToCheck = [
      'Revenues',
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'SalesRevenueNet',
      'CostOfRevenue',
      'CostOfGoodsAndServicesSold',
      'GrossProfit',
      'OperatingExpenses',
      'SellingGeneralAndAdministrativeExpense',
      'ResearchAndDevelopmentExpense',
      'OperatingIncomeLoss'
    ];
    
    tagsToCheck.forEach(tag => {
      const exists = facts[tag] ? '✅' : '❌';
      const latestData = facts[tag]?.units?.USD?.slice(-1)[0];
      if (latestData) {
        console.log(`${exists} ${tag}: $${(latestData.val / 1e9).toFixed(2)}B (${latestData.fy} ${latestData.fp})`);
      } else {
        console.log(`${exists} ${tag}: Not found`);
      }
    });
    
    console.log('\n5. Sample of latest 10-K data:');
    console.log('===============================');
    // Find a 10-K entry
    const revenue = facts.RevenueFromContractWithCustomerExcludingAssessedTax?.units?.USD || [];
    const latestAnnual = revenue.filter(r => r.form === '10-K').slice(-1)[0];
    
    if (latestAnnual) {
      console.log(`Latest 10-K: ${latestAnnual.end} (FY ${latestAnnual.fy})`);
      console.log('Looking for data from this date...');
      
      // Find other metrics for the same date
      const endDate = latestAnnual.end;
      const metricsToShow = ['CostOfGoodsAndServicesSold', 'GrossProfit', 'ResearchAndDevelopmentExpense', 'OperatingIncomeLoss'];
      
      metricsToShow.forEach(metric => {
        const metricData = facts[metric]?.units?.USD?.find(d => d.end === endDate);
        if (metricData) {
          console.log(`  ${metric}: $${(metricData.val / 1e9).toFixed(2)}B`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugSECEdgar();
