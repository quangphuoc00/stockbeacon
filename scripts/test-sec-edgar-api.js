#!/usr/bin/env node

// Example: Getting Financial Statements from SEC EDGAR API (FREE)

const SYMBOL = 'AAPL';
const CIK = '0000320193'; // Apple's CIK

async function getFinancialData() {
  console.log('Fetching financial data from SEC EDGAR API (FREE)...\n');
  
  const response = await fetch(
    `https://data.sec.gov/api/xbrl/companyfacts/CIK${CIK}.json`,
    { headers: { 'User-Agent': 'StockBeacon/1.0' } }
  );
  
  const data = await response.json();
  const facts = data.facts['us-gaap'];
  
  // Get latest Revenue data
  const revenue = facts.Revenues?.units?.USD || facts.RevenueFromContractWithCustomerExcludingAssessedTax?.units?.USD;
  const latestRevenue = revenue?.[revenue.length - 1];
  
  // Get latest Net Income data
  const netIncome = facts.NetIncomeLoss?.units?.USD;
  const latestNetIncome = netIncome?.[netIncome.length - 1];
  
  // Get latest Total Assets
  const assets = facts.Assets?.units?.USD;
  const latestAssets = assets?.[assets.length - 1];
  
  // Get latest Cash
  const cash = facts.CashAndCashEquivalentsAtCarryingValue?.units?.USD;
  const latestCash = cash?.[cash.length - 1];
  
  console.log('Latest Financial Data for', SYMBOL);
  console.log('================================');
  console.log(`Revenue: $${(latestRevenue?.val / 1e9).toFixed(2)}B (${latestRevenue?.fy} ${latestRevenue?.fp})`);
  console.log(`Net Income: $${(latestNetIncome?.val / 1e9).toFixed(2)}B`);
  console.log(`Total Assets: $${(latestAssets?.val / 1e9).toFixed(2)}B`);
  console.log(`Cash: $${(latestCash?.val / 1e9).toFixed(2)}B`);
  
  console.log('\nAvailable Financial Metrics:');
  console.log('============================');
  const metrics = Object.keys(facts).filter(key => 
    key.includes('Revenue') || 
    key.includes('Income') || 
    key.includes('Asset') || 
    key.includes('Profit') ||
    key.includes('Expense') ||
    key.includes('CashFlow')
  ).slice(0, 20);
  
  metrics.forEach(metric => console.log(`- ${metric}`));
  
  console.log(`\n... and ${Object.keys(facts).length - 20} more metrics available!`);
  console.log('\n✅ All this data is FREE with no API limits!');
}

getFinancialData().catch(console.error);
