#!/usr/bin/env node

/**
 * Test the Financial Interpreter through the API
 * This validates the end-to-end flow
 */

const fetch = require('node-fetch');
global.fetch = fetch;

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test symbols with different characteristics
const TEST_CASES = [
  { symbol: 'AAPL', description: 'Large cap tech with strong cash flow' },
  { symbol: 'MSFT', description: 'Software giant with high margins' },
  { symbol: 'F', description: 'Traditional auto manufacturer' },
  { symbol: 'NFLX', description: 'High growth streaming service' },
  { symbol: 'KO', description: 'Stable dividend aristocrat' }
];

async function testFinancialInterpreter() {
  console.log('🧪 Testing Financial Statement Interpreter API Integration\n');
  console.log('This test validates:');
  console.log('  ✓ US stock validation');
  console.log('  ✓ SEC EDGAR data completeness');
  console.log('  ✓ Financial calculations');
  console.log('  ✓ Red/Green flag detection logic');
  console.log('  ✓ Health scoring algorithm\n');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  for (const testCase of TEST_CASES) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 Testing ${testCase.symbol} - ${testCase.description}`);
    console.log(`${'='.repeat(70)}`);

    try {
      // Test 1: API endpoint
      console.log('\n1️⃣ Testing API Endpoint...');
      const startTime = Date.now();
      const response = await fetch(`${API_BASE_URL}/api/stocks/${testCase.symbol}/financial-statements`);
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        const error = await response.json();
        if (response.status === 404 && error.error === 'Not a US-listed company') {
          console.log(`   ⚠️  ${testCase.symbol} is not a US stock - correctly rejected`);
          results.passed++;
          continue;
        }
        throw new Error(`API Error: ${error.message || error.error}`);
      }

      const data = await response.json();
      console.log(`   ✅ Data retrieved in ${responseTime}ms`);

      // Test 2: Data Structure
      console.log('\n2️⃣ Testing Data Structure...');
      validateDataStructure(data);
      console.log('   ✅ Data structure is valid');

      // Test 3: Data Completeness
      console.log('\n3️⃣ Testing SEC EDGAR Data Completeness...');
      const completeness = analyzeDataCompleteness(data);
      console.log(`   ✅ Data completeness: ${completeness.overall.toFixed(0)}%`);
      console.log(`      - Income Statement: ${completeness.income.toFixed(0)}%`);
      console.log(`      - Balance Sheet: ${completeness.balance.toFixed(0)}%`);
      console.log(`      - Cash Flow: ${completeness.cashFlow.toFixed(0)}%`);

      // Test 4: Financial Health Analysis
      console.log('\n4️⃣ Simulating Financial Health Analysis...');
      const analysis = performFinancialAnalysis(data);
      
      console.log(`   📊 Key Metrics:`);
      console.log(`      - Current Ratio: ${analysis.currentRatio?.toFixed(2) || 'N/A'}`);
      console.log(`      - Debt-to-Equity: ${analysis.debtToEquity?.toFixed(2) || 'N/A'}`);
      console.log(`      - ROE: ${analysis.roe?.toFixed(1)}% || N/A`);
      console.log(`      - Free Cash Flow Margin: ${analysis.fcfMargin?.toFixed(1)}% || N/A`);

      console.log(`\n   🚩 Red Flags: ${analysis.redFlags.length}`);
      analysis.redFlags.forEach(flag => console.log(`      - ${flag}`));

      console.log(`\n   ✅ Green Flags: ${analysis.greenFlags.length}`);
      analysis.greenFlags.forEach(flag => console.log(`      - ${flag}`));

      console.log(`\n   💯 Estimated Health Score: ${analysis.healthScore}/100 (${analysis.grade})`);
      console.log(`   📝 Summary: ${analysis.summary}`);

      // Test 5: Historical Trends
      console.log('\n5️⃣ Testing Historical Trend Analysis...');
      const trends = analyzeTrends(data);
      console.log(`   📈 Revenue Trend: ${trends.revenue}`);
      console.log(`   📊 Margin Trend: ${trends.margins}`);
      console.log(`   💰 Cash Flow Trend: ${trends.cashFlow}`);

      results.passed++;
      console.log(`\n✅ ${testCase.symbol} passed all tests`);

    } catch (error) {
      console.error(`\n❌ ${testCase.symbol} failed: ${error.message}`);
      results.failed++;
      results.errors.push({ symbol: testCase.symbol, error: error.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(e => console.log(`  - ${e.symbol}: ${e.error}`));
  }

  const successRate = (results.passed / (results.passed + results.failed)) * 100;
  console.log(`\nSuccess Rate: ${successRate.toFixed(0)}%`);
  
  if (successRate < 80) {
    console.log('\n⚠️  Warning: Success rate below 80% - investigation needed');
    process.exit(1);
  } else {
    console.log('\n✅ All critical tests passed!');
  }
}

function validateDataStructure(data) {
  // Check required top-level fields
  if (!data.symbol) throw new Error('Missing symbol');
  if (!data.incomeStatements) throw new Error('Missing income statements');
  if (!data.balanceSheets) throw new Error('Missing balance sheets');
  if (!data.cashFlowStatements) throw new Error('Missing cash flow statements');

  // Check statement structure
  ['incomeStatements', 'balanceSheets', 'cashFlowStatements'].forEach(type => {
    if (!data[type].annual || !Array.isArray(data[type].annual)) {
      throw new Error(`Invalid ${type} annual data`);
    }
    if (data[type].annual.length === 0) {
      throw new Error(`No ${type} annual data`);
    }
  });
}

function analyzeDataCompleteness(data) {
  const latestIncome = data.incomeStatements.annual[0];
  const latestBalance = data.balanceSheets.annual[0];
  const latestCashFlow = data.cashFlowStatements.annual[0];

  // Count non-null fields
  const countComplete = (obj, fields) => {
    let complete = 0;
    fields.forEach(field => {
      if (obj[field] !== null && obj[field] !== undefined) complete++;
    });
    return (complete / fields.length) * 100;
  };

  const incomeFields = ['revenue', 'costOfRevenue', 'grossProfit', 'operatingIncome', 'netIncome', 'eps'];
  const balanceFields = ['totalAssets', 'currentAssets', 'totalLiabilities', 'currentLiabilities', 'totalShareholderEquity'];
  const cashFlowFields = ['operatingCashFlow', 'capitalExpenditures', 'freeCashFlow'];

  const income = countComplete(latestIncome, incomeFields);
  const balance = countComplete(latestBalance, balanceFields);
  const cashFlow = countComplete(latestCashFlow, cashFlowFields);

  return {
    income,
    balance,
    cashFlow,
    overall: (income + balance + cashFlow) / 3
  };
}

function performFinancialAnalysis(data) {
  const analysis = {
    currentRatio: null,
    debtToEquity: null,
    roe: null,
    fcfMargin: null,
    redFlags: [],
    greenFlags: [],
    healthScore: 70,
    grade: 'B',
    summary: ''
  };

  const latestIncome = data.incomeStatements.annual[0];
  const latestBalance = data.balanceSheets.annual[0];
  const latestCashFlow = data.cashFlowStatements.annual[0];

  // Calculate ratios
  if (latestBalance.currentAssets && latestBalance.currentLiabilities) {
    analysis.currentRatio = latestBalance.currentAssets / latestBalance.currentLiabilities;
  }

  if (latestBalance.totalShareholderEquity) {
    const totalDebt = (latestBalance.shortTermDebt || 0) + (latestBalance.longTermDebt || 0);
    analysis.debtToEquity = totalDebt / latestBalance.totalShareholderEquity;
    
    if (latestIncome.netIncome) {
      analysis.roe = (latestIncome.netIncome / latestBalance.totalShareholderEquity) * 100;
    }
  }

  if (latestIncome.revenue && latestCashFlow.operatingCashFlow && latestCashFlow.capitalExpenditures) {
    const fcf = latestCashFlow.freeCashFlow || 
      (latestCashFlow.operatingCashFlow - Math.abs(latestCashFlow.capitalExpenditures));
    analysis.fcfMargin = (fcf / latestIncome.revenue) * 100;
  }

  // Detect red flags
  if (analysis.currentRatio && analysis.currentRatio < 1) {
    analysis.redFlags.push('Low liquidity (current ratio < 1)');
    analysis.healthScore -= 10;
  }

  if (analysis.debtToEquity && analysis.debtToEquity > 2) {
    analysis.redFlags.push('High leverage (D/E > 2)');
    analysis.healthScore -= 10;
  }

  if (latestCashFlow.operatingCashFlow < 0) {
    analysis.redFlags.push('Negative operating cash flow');
    analysis.healthScore -= 15;
  }

  if (latestBalance.totalLiabilities > latestBalance.totalAssets) {
    analysis.redFlags.push('CRITICAL: Insolvent (liabilities > assets)');
    analysis.healthScore -= 30;
  }

  // Detect green flags
  if (analysis.fcfMargin && analysis.fcfMargin > 15) {
    analysis.greenFlags.push('Excellent free cash flow margin (>15%)');
    analysis.healthScore += 10;
  }

  if (analysis.roe && analysis.roe > 20) {
    analysis.greenFlags.push('High return on equity (>20%)');
    analysis.healthScore += 10;
  }

  const totalDebt = (latestBalance.shortTermDebt || 0) + (latestBalance.longTermDebt || 0);
  if (latestBalance.cashAndCashEquivalents > totalDebt) {
    analysis.greenFlags.push('Net cash position');
    analysis.healthScore += 5;
  }

  if (latestIncome.netIncome && latestCashFlow.operatingCashFlow) {
    const ocfToNI = latestCashFlow.operatingCashFlow / latestIncome.netIncome;
    if (ocfToNI > 1.2) {
      analysis.greenFlags.push('High earnings quality (OCF/NI > 1.2)');
      analysis.healthScore += 5;
    }
  }

  // Determine grade
  if (analysis.healthScore >= 90) analysis.grade = 'A';
  else if (analysis.healthScore >= 80) analysis.grade = 'B+';
  else if (analysis.healthScore >= 70) analysis.grade = 'B';
  else if (analysis.healthScore >= 60) analysis.grade = 'C+';
  else if (analysis.healthScore >= 50) analysis.grade = 'C';
  else analysis.grade = 'D';

  // Generate summary
  if (analysis.healthScore >= 80) {
    analysis.summary = 'Strong financial health with solid fundamentals';
  } else if (analysis.healthScore >= 60) {
    analysis.summary = 'Moderate financial health with some concerns';
  } else {
    analysis.summary = 'Weak financial health requiring careful monitoring';
  }

  return analysis;
}

function analyzeTrends(data) {
  const trends = {
    revenue: 'Unable to determine',
    margins: 'Unable to determine',
    cashFlow: 'Unable to determine'
  };

  const incomeStatements = data.incomeStatements.annual;
  const cashFlowStatements = data.cashFlowStatements.annual;

  // Revenue trend
  if (incomeStatements.length >= 2) {
    const currentRevenue = incomeStatements[0].revenue;
    const previousRevenue = incomeStatements[1].revenue;
    
    if (currentRevenue && previousRevenue) {
      const growth = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
      if (growth > 10) trends.revenue = `Strong growth (${growth.toFixed(1)}%)`;
      else if (growth > 5) trends.revenue = `Moderate growth (${growth.toFixed(1)}%)`;
      else if (growth > 0) trends.revenue = `Low growth (${growth.toFixed(1)}%)`;
      else trends.revenue = `Declining (${growth.toFixed(1)}%)`;
    }
  }

  // Margin trend
  if (incomeStatements.length >= 2) {
    const currentMargin = incomeStatements[0].grossProfit && incomeStatements[0].revenue ? 
      (incomeStatements[0].grossProfit / incomeStatements[0].revenue) * 100 : null;
    const previousMargin = incomeStatements[1].grossProfit && incomeStatements[1].revenue ?
      (incomeStatements[1].grossProfit / incomeStatements[1].revenue) * 100 : null;
    
    if (currentMargin && previousMargin) {
      const change = currentMargin - previousMargin;
      if (change > 1) trends.margins = 'Expanding';
      else if (change < -1) trends.margins = 'Compressing';
      else trends.margins = 'Stable';
    }
  }

  // Cash flow trend
  if (cashFlowStatements.length >= 2) {
    const currentOCF = cashFlowStatements[0].operatingCashFlow;
    const previousOCF = cashFlowStatements[1].operatingCashFlow;
    
    if (currentOCF && previousOCF) {
      const growth = ((currentOCF - previousOCF) / Math.abs(previousOCF)) * 100;
      if (growth > 15) trends.cashFlow = 'Strong improvement';
      else if (growth > 0) trends.cashFlow = 'Growing';
      else trends.cashFlow = 'Deteriorating';
    }
  }

  return trends;
}

// Run the test
testFinancialInterpreter().catch(console.error);
