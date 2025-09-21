// Debug script to check Yahoo Finance data structure
import yahooFinance from 'yahoo-finance2';

async function debugYahooFinance() {
  try {
    const symbol = 'AAPL';
    console.log(`Fetching financial data for ${symbol}...\n`);
    
    // Fetch income statement data
    const incomeData = await yahooFinance.quoteSummary(symbol, {
      modules: ['incomeStatementHistory', 'incomeStatementHistoryQuarterly']
    });
    
    console.log('Income Statement Fields:');
    console.log('=======================');
    
    if (incomeData?.incomeStatementHistory?.incomeStatementHistory?.[0]) {
      const statement = incomeData.incomeStatementHistory.incomeStatementHistory[0];
      console.log('Available fields:', Object.keys(statement));
      console.log('\nSample values:');
      Object.entries(statement).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          console.log(`  ${key}: ${JSON.stringify(value)}`);
        }
      });
    }
    
    // Fetch balance sheet data
    console.log('\n\nBalance Sheet Fields:');
    console.log('====================');
    
    const balanceData = await yahooFinance.quoteSummary(symbol, {
      modules: ['balanceSheetHistory', 'balanceSheetHistoryQuarterly']
    });
    
    if (balanceData?.balanceSheetHistory?.balanceSheetStatements?.[0]) {
      const statement = balanceData.balanceSheetHistory.balanceSheetStatements[0];
      console.log('Available fields:', Object.keys(statement));
      console.log('\nSample values:');
      Object.entries(statement).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          console.log(`  ${key}: ${JSON.stringify(value)}`);
        }
      });
    }
    
    // Fetch cash flow data
    console.log('\n\nCash Flow Statement Fields:');
    console.log('===========================');
    
    const cashFlowData = await yahooFinance.quoteSummary(symbol, {
      modules: ['cashflowStatementHistory', 'cashflowStatementHistoryQuarterly']
    });
    
    if (cashFlowData?.cashflowStatementHistory?.cashflowStatements?.[0]) {
      const statement = cashFlowData.cashflowStatementHistory.cashflowStatements[0];
      console.log('Available fields:', Object.keys(statement));
      console.log('\nSample values:');
      Object.entries(statement).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          console.log(`  ${key}: ${JSON.stringify(value)}`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugYahooFinance();
