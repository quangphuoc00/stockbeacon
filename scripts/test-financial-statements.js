#!/usr/bin/env node

// Test script for financial statements functionality
const { YahooFinanceService } = require('../src/lib/services/yahoo-finance.service')

async function testFinancialStatements() {
  console.log('Testing Financial Statements Functionality\n')
  
  const testSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN']
  
  for (const symbol of testSymbols) {
    console.log(`\n📊 Testing ${symbol}...`)
    console.log('='.repeat(50))
    
    try {
      const statements = await YahooFinanceService.getFinancialStatements(symbol)
      
      if (!statements) {
        console.log(`❌ No financial statements available for ${symbol}`)
        continue
      }
      
      // Check Income Statement
      console.log('\n📈 Income Statement:')
      console.log(`  - Annual periods: ${statements.incomeStatements.annual.length}`)
      console.log(`  - Quarterly periods: ${statements.incomeStatements.quarterly.length}`)
      console.log(`  - Has TTM: ${statements.incomeStatements.ttm ? 'Yes' : 'No'}`)
      
      if (statements.incomeStatements.annual.length > 0) {
        const latest = statements.incomeStatements.annual[0]
        console.log(`  - Latest Annual (${new Date(latest.date).getFullYear()}):`)
        console.log(`    Revenue: $${(latest.revenue / 1e9).toFixed(2)}B`)
        console.log(`    Net Income: $${(latest.netIncome / 1e9).toFixed(2)}B`)
        console.log(`    EPS: $${latest.eps?.toFixed(2) || 'N/A'}`)
      }
      
      // Check Balance Sheet
      console.log('\n💰 Balance Sheet:')
      console.log(`  - Annual periods: ${statements.balanceSheets.annual.length}`)
      console.log(`  - Quarterly periods: ${statements.balanceSheets.quarterly.length}`)
      
      if (statements.balanceSheets.annual.length > 0) {
        const latest = statements.balanceSheets.annual[0]
        console.log(`  - Latest Annual (${new Date(latest.date).getFullYear()}):`)
        console.log(`    Total Assets: $${(latest.totalAssets / 1e9).toFixed(2)}B`)
        console.log(`    Total Liabilities: $${(latest.totalLiabilities / 1e9).toFixed(2)}B`)
        console.log(`    Shareholder Equity: $${(latest.totalShareholderEquity / 1e9).toFixed(2)}B`)
      }
      
      // Check Cash Flow Statement
      console.log('\n💸 Cash Flow Statement:')
      console.log(`  - Annual periods: ${statements.cashFlowStatements.annual.length}`)
      console.log(`  - Quarterly periods: ${statements.cashFlowStatements.quarterly.length}`)
      console.log(`  - Has TTM: ${statements.cashFlowStatements.ttm ? 'Yes' : 'No'}`)
      
      if (statements.cashFlowStatements.annual.length > 0) {
        const latest = statements.cashFlowStatements.annual[0]
        console.log(`  - Latest Annual (${new Date(latest.date).getFullYear()}):`)
        console.log(`    Operating Cash Flow: $${(latest.operatingCashFlow / 1e9).toFixed(2)}B`)
        console.log(`    Free Cash Flow: $${(latest.freeCashFlow / 1e9).toFixed(2)}B`)
        console.log(`    Capital Expenditures: $${(latest.capitalExpenditures / 1e9).toFixed(2)}B`)
      }
      
      // Data completeness check
      console.log('\n✅ Data Completeness Check:')
      const incomeFields = statements.incomeStatements.annual[0] || {}
      const balanceFields = statements.balanceSheets.annual[0] || {}
      const cashFlowFields = statements.cashFlowStatements.annual[0] || {}
      
      const incomeNonNull = Object.values(incomeFields).filter(v => v !== null).length
      const balanceNonNull = Object.values(balanceFields).filter(v => v !== null).length
      const cashFlowNonNull = Object.values(cashFlowFields).filter(v => v !== null).length
      
      console.log(`  - Income Statement: ${incomeNonNull}/${Object.keys(incomeFields).length} fields populated`)
      console.log(`  - Balance Sheet: ${balanceNonNull}/${Object.keys(balanceFields).length} fields populated`)
      console.log(`  - Cash Flow: ${cashFlowNonNull}/${Object.keys(cashFlowFields).length} fields populated`)
      
    } catch (error) {
      console.error(`❌ Error testing ${symbol}:`, error.message)
    }
  }
  
  console.log('\n\n✅ Financial statements test completed!')
}

// Run the test
testFinancialStatements().catch(console.error)
