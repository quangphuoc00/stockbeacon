#!/usr/bin/env node

/**
 * Test script for Financial Statement Interpreter
 * Tests all components with real financial data
 */

const fetch = require('node-fetch');
global.fetch = fetch;

// Test configuration
const TEST_SYMBOLS = ['AAPL', 'MSFT', 'TSLA', 'BAC', 'WMT'];
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Import the interpreter modules (adjust paths as needed)
async function runTests() {
  console.log('🧪 Testing Financial Statement Interpreter...\n');

  for (const symbol of TEST_SYMBOLS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Testing ${symbol}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      // Fetch financial statements
      console.log(`📥 Fetching financial statements for ${symbol}...`);
      const response = await fetch(`${API_BASE_URL}/api/stocks/${symbol}/financial-statements`);
      
      if (!response.ok) {
        const error = await response.json();
        console.error(`❌ Failed to fetch data: ${error.message || error.error}`);
        continue;
      }

      const financialStatements = await response.json();
      console.log(`✅ Received financial data`);
      console.log(`   - Annual periods: ${financialStatements.incomeStatements.annual.length}`);
      console.log(`   - Quarterly periods: ${financialStatements.incomeStatements.quarterly.length}`);

      // Test data completeness
      testDataCompleteness(financialStatements);
      
      // Test basic calculations
      testBasicCalculations(financialStatements);
      
      // Test red flag detection
      testRedFlagDetection(financialStatements);
      
      // Test green flag detection
      testGreenFlagDetection(financialStatements);
      
      // Test ratio calculations
      testRatioCalculations(financialStatements);
      
      // Test trend analysis
      testTrendAnalysis(financialStatements);

    } catch (error) {
      console.error(`❌ Error testing ${symbol}:`, error.message);
    }
  }

  console.log('\n✅ All tests completed!');
}

/**
 * Test data completeness from SEC EDGAR
 */
function testDataCompleteness(statements) {
  console.log('\n📋 Testing Data Completeness:');
  
  const latestIncome = statements.incomeStatements.annual[0];
  const latestBalance = statements.balanceSheets.annual[0];
  const latestCashFlow = statements.cashFlowStatements.annual[0];

  // Check income statement fields
  const incomeFields = [
    'revenue', 'costOfRevenue', 'grossProfit', 'operatingExpenses',
    'operatingIncome', 'netIncome', 'eps', 'ebitda'
  ];
  
  let completeFields = 0;
  incomeFields.forEach(field => {
    if (latestIncome[field] !== null && latestIncome[field] !== undefined) {
      completeFields++;
    }
  });
  
  console.log(`   ✅ Income Statement: ${completeFields}/${incomeFields.length} fields complete`);

  // Check balance sheet fields
  const balanceFields = [
    'totalAssets', 'currentAssets', 'totalLiabilities', 'currentLiabilities',
    'totalShareholderEquity', 'cashAndCashEquivalents', 'longTermDebt'
  ];
  
  completeFields = 0;
  balanceFields.forEach(field => {
    if (latestBalance[field] !== null && latestBalance[field] !== undefined) {
      completeFields++;
    }
  });
  
  console.log(`   ✅ Balance Sheet: ${completeFields}/${balanceFields.length} fields complete`);

  // Check cash flow fields
  const cashFlowFields = [
    'operatingCashFlow', 'capitalExpenditures', 'freeCashFlow',
    'dividendsPaid', 'stockRepurchased'
  ];
  
  completeFields = 0;
  cashFlowFields.forEach(field => {
    if (latestCashFlow[field] !== null && latestCashFlow[field] !== undefined) {
      completeFields++;
    }
  });
  
  console.log(`   ✅ Cash Flow: ${completeFields}/${cashFlowFields.length} fields complete`);
}

/**
 * Test basic financial calculations
 */
function testBasicCalculations(statements) {
  console.log('\n🧮 Testing Basic Calculations:');
  
  const latestIncome = statements.incomeStatements.annual[0];
  const latestBalance = statements.balanceSheets.annual[0];
  const latestCashFlow = statements.cashFlowStatements.annual[0];

  // Current Ratio
  if (latestBalance.currentAssets && latestBalance.currentLiabilities) {
    const currentRatio = latestBalance.currentAssets / latestBalance.currentLiabilities;
    console.log(`   📊 Current Ratio: ${currentRatio.toFixed(2)}`);
  }

  // Debt to Equity
  if (latestBalance.totalShareholderEquity) {
    const totalDebt = (latestBalance.shortTermDebt || 0) + (latestBalance.longTermDebt || 0);
    const debtToEquity = totalDebt / latestBalance.totalShareholderEquity;
    console.log(`   📊 Debt-to-Equity: ${debtToEquity.toFixed(2)}`);
  }

  // Gross Margin
  if (latestIncome.revenue && latestIncome.grossProfit) {
    const grossMargin = (latestIncome.grossProfit / latestIncome.revenue) * 100;
    console.log(`   📊 Gross Margin: ${grossMargin.toFixed(1)}%`);
  }

  // Free Cash Flow Margin
  if (latestIncome.revenue && latestCashFlow.operatingCashFlow && latestCashFlow.capitalExpenditures) {
    const fcf = latestCashFlow.freeCashFlow || 
      (latestCashFlow.operatingCashFlow - Math.abs(latestCashFlow.capitalExpenditures));
    const fcfMargin = (fcf / latestIncome.revenue) * 100;
    console.log(`   📊 FCF Margin: ${fcfMargin.toFixed(1)}%`);
  }
}

/**
 * Test red flag detection logic
 */
function testRedFlagDetection(statements) {
  console.log('\n🚩 Testing Red Flag Detection:');
  
  const latestIncome = statements.incomeStatements.annual[0];
  const latestBalance = statements.balanceSheets.annual[0];
  const latestCashFlow = statements.cashFlowStatements.annual[0];
  
  let redFlagsFound = 0;

  // Test insolvency
  if (latestBalance.totalLiabilities > latestBalance.totalAssets) {
    console.log('   🔴 CRITICAL: Insolvency risk detected!');
    redFlagsFound++;
  }

  // Test liquidity
  if (latestBalance.currentAssets && latestBalance.currentLiabilities) {
    const currentRatio = latestBalance.currentAssets / latestBalance.currentLiabilities;
    if (currentRatio < 1) {
      console.log(`   🔴 Liquidity concern: Current ratio ${currentRatio.toFixed(2)}`);
      redFlagsFound++;
    }
  }

  // Test cash burn
  if (latestCashFlow.operatingCashFlow < 0) {
    console.log(`   🔴 Cash burn: Negative OCF of $${(latestCashFlow.operatingCashFlow / 1e9).toFixed(2)}B`);
    redFlagsFound++;
  }

  // Test earnings quality
  if (latestIncome.netIncome && latestCashFlow.operatingCashFlow) {
    const earningsQuality = latestCashFlow.operatingCashFlow / latestIncome.netIncome;
    if (earningsQuality < 0.8) {
      console.log(`   🟡 Poor earnings quality: OCF/NI = ${earningsQuality.toFixed(2)}`);
      redFlagsFound++;
    }
  }

  if (redFlagsFound === 0) {
    console.log('   ✅ No major red flags detected');
  } else {
    console.log(`   📊 Total red flags: ${redFlagsFound}`);
  }
}

/**
 * Test green flag detection logic
 */
function testGreenFlagDetection(statements) {
  console.log('\n✅ Testing Green Flag Detection:');
  
  const latestIncome = statements.incomeStatements.annual[0];
  const latestBalance = statements.balanceSheets.annual[0];
  const latestCashFlow = statements.cashFlowStatements.annual[0];
  
  let greenFlagsFound = 0;

  // Test cash generation
  if (latestIncome.netIncome && latestCashFlow.operatingCashFlow) {
    const ocfToNI = latestCashFlow.operatingCashFlow / latestIncome.netIncome;
    if (ocfToNI > 1.2) {
      console.log(`   🟢 Superior cash generation: OCF/NI = ${ocfToNI.toFixed(2)}`);
      greenFlagsFound++;
    }
  }

  // Test FCF margin
  if (latestIncome.revenue && latestCashFlow.operatingCashFlow && latestCashFlow.capitalExpenditures) {
    const fcf = latestCashFlow.freeCashFlow || 
      (latestCashFlow.operatingCashFlow - Math.abs(latestCashFlow.capitalExpenditures));
    const fcfMargin = (fcf / latestIncome.revenue) * 100;
    if (fcfMargin > 15) {
      console.log(`   🟢 High FCF margin: ${fcfMargin.toFixed(1)}%`);
      greenFlagsFound++;
    }
  }

  // Test fortress balance sheet
  const totalDebt = (latestBalance.shortTermDebt || 0) + (latestBalance.longTermDebt || 0);
  if (latestBalance.cashAndCashEquivalents > totalDebt) {
    console.log(`   🟢 Net cash position: More cash than debt`);
    greenFlagsFound++;
  }

  // Test ROE
  if (latestIncome.netIncome && latestBalance.totalShareholderEquity) {
    const roe = (latestIncome.netIncome / latestBalance.totalShareholderEquity) * 100;
    if (roe > 20) {
      console.log(`   🟢 Exceptional ROE: ${roe.toFixed(1)}%`);
      greenFlagsFound++;
    }
  }

  console.log(`   📊 Total green flags: ${greenFlagsFound}`);
}

/**
 * Test ratio calculations
 */
function testRatioCalculations(statements) {
  console.log('\n📈 Testing Ratio Calculations:');
  
  const latestIncome = statements.incomeStatements.annual[0];
  const latestBalance = statements.balanceSheets.annual[0];
  
  const ratios = {};

  // Liquidity ratios
  if (latestBalance.currentAssets && latestBalance.currentLiabilities) {
    ratios.currentRatio = latestBalance.currentAssets / latestBalance.currentLiabilities;
    ratios.quickRatio = (latestBalance.currentAssets - (latestBalance.inventory || 0)) / latestBalance.currentLiabilities;
  }

  // Profitability ratios
  if (latestIncome.revenue) {
    if (latestIncome.grossProfit) {
      ratios.grossMargin = (latestIncome.grossProfit / latestIncome.revenue) * 100;
    }
    if (latestIncome.operatingIncome) {
      ratios.operatingMargin = (latestIncome.operatingIncome / latestIncome.revenue) * 100;
    }
    if (latestIncome.netIncome) {
      ratios.netMargin = (latestIncome.netIncome / latestIncome.revenue) * 100;
    }
  }

  // Leverage ratios
  if (latestBalance.totalShareholderEquity) {
    const totalDebt = (latestBalance.shortTermDebt || 0) + (latestBalance.longTermDebt || 0);
    ratios.debtToEquity = totalDebt / latestBalance.totalShareholderEquity;
  }

  // Display ratios
  Object.entries(ratios).forEach(([name, value]) => {
    const formatted = typeof value === 'number' ? value.toFixed(2) : 'N/A';
    console.log(`   📊 ${name}: ${formatted}${name.includes('Margin') ? '%' : ''}`);
  });
}

/**
 * Test trend analysis
 */
function testTrendAnalysis(statements) {
  console.log('\n📊 Testing Trend Analysis:');
  
  const incomeStatements = statements.incomeStatements.annual;
  
  // Revenue trend
  if (incomeStatements.length >= 3) {
    const revenues = incomeStatements.slice(0, 3).map(s => s.revenue).filter(r => r);
    if (revenues.length === 3) {
      const cagr = (Math.pow(revenues[0] / revenues[2], 1/2) - 1) * 100;
      console.log(`   📈 Revenue 3yr CAGR: ${cagr.toFixed(1)}%`);
      
      if (cagr > 10) {
        console.log('      🟢 Strong revenue growth');
      } else if (cagr > 5) {
        console.log('      🟡 Moderate revenue growth');
      } else if (cagr < 0) {
        console.log('      🔴 Revenue declining');
      }
    }
  }

  // Margin trend
  const margins = incomeStatements.slice(0, 3).map(s => {
    if (s.revenue && s.operatingIncome) {
      return (s.operatingIncome / s.revenue) * 100;
    }
    return null;
  }).filter(m => m !== null);

  if (margins.length >= 2) {
    const marginChange = margins[0] - margins[margins.length - 1];
    console.log(`   📊 Operating margin change: ${marginChange > 0 ? '+' : ''}${marginChange.toFixed(1)} pp`);
    
    if (marginChange > 2) {
      console.log('      🟢 Margin expansion');
    } else if (marginChange < -2) {
      console.log('      🔴 Margin compression');
    }
  }
}

// Run the tests
runTests().catch(console.error);
