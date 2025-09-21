// Test SEC Integration in isolation

// Import the services
import { SECEdgarService } from '../src/lib/services/sec-edgar.service.js';

async function testSEC() {
  console.log('Testing SEC EDGAR Service...\n');
  
  try {
    // Test CIK lookup
    const cik = await SECEdgarService.getCIK('AAPL');
    console.log('CIK for AAPL:', cik);
    
    // Test financial statements
    console.log('\nFetching financial statements...');
    const statements = await SECEdgarService.getFinancialStatements('AAPL');
    
    if (statements) {
      console.log('\nSEC Data Retrieved:');
      console.log('Symbol:', statements.symbol);
      console.log('Annual statements:', statements.incomeStatements.annual.length);
      console.log('Quarterly statements:', statements.incomeStatements.quarterly.length);
      
      if (statements.incomeStatements.annual[0]) {
        const latest = statements.incomeStatements.annual[0];
        console.log('\nLatest Annual (Income Statement):');
        console.log('  Date:', latest.date);
        console.log('  Revenue:', latest.revenue ? `$${(latest.revenue / 1e9).toFixed(2)}B` : 'null');
        console.log('  Cost of Revenue:', latest.costOfRevenue ? `$${(latest.costOfRevenue / 1e9).toFixed(2)}B` : 'null');
        console.log('  Gross Profit:', latest.grossProfit ? `$${(latest.grossProfit / 1e9).toFixed(2)}B` : 'null');
        console.log('  Operating Income:', latest.operatingIncome ? `$${(latest.operatingIncome / 1e9).toFixed(2)}B` : 'null');
      }
    } else {
      console.log('No data returned from SEC');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testSEC();
