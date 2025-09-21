#!/usr/bin/env node

// Multiple ways to convert Stock Symbol to CIK

async function convertSymbolToCIK(symbol) {
  console.log(`Converting ${symbol} to CIK...\n`);
  
  // Method 1: SEC's own company tickers JSON (BEST METHOD)
  console.log('Method 1: SEC Company Tickers JSON');
  console.log('===================================');
  try {
    const response = await fetch(
      'https://www.sec.gov/files/company_tickers.json',
      { headers: { 'User-Agent': 'StockBeacon/1.0' } }
    );
    const data = await response.json();
    
    // Find the company by ticker
    const company = Object.values(data).find(
      company => company.ticker === symbol.toUpperCase()
    );
    
    if (company) {
      // Pad CIK with zeros to make it 10 digits
      const cik = String(company.cik_str).padStart(10, '0');
      console.log(`✅ Found: ${company.title}`);
      console.log(`   Ticker: ${company.ticker}`);
      console.log(`   CIK: ${cik}`);
      console.log(`   Raw CIK: ${company.cik_str}`);
      return cik;
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n');
  
  // Method 2: SEC submissions endpoint
  console.log('Method 2: Search SEC Submissions');
  console.log('=================================');
  console.log('You can also search: https://www.sec.gov/edgar/searchedgar/companysearch');
  
  return null;
}

// Test with popular symbols
async function testConversions() {
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META'];
  
  console.log('Testing Symbol to CIK Conversion');
  console.log('================================\n');
  
  // First, let's see how many companies are in the database
  const response = await fetch(
    'https://www.sec.gov/files/company_tickers.json',
    { headers: { 'User-Agent': 'StockBeacon/1.0' } }
  );
  const allCompanies = await response.json();
  console.log(`Total companies in SEC database: ${Object.keys(allCompanies).length}\n`);
  
  // Show first 10 companies as example
  console.log('Example companies in database:');
  Object.values(allCompanies).slice(0, 10).forEach(company => {
    console.log(`- ${company.ticker}: ${company.title} (CIK: ${company.cik_str})`);
  });
  
  console.log('\n---\n');
  
  // Convert each symbol
  for (const symbol of symbols) {
    await convertSymbolToCIK(symbol);
    console.log('---\n');
  }
  
  // Create a mapping function example
  console.log('Implementation Example:');
  console.log('======================');
  console.log(`
class SECService {
  private static cikCache = new Map();
  
  static async loadCIKMapping() {
    const response = await fetch(
      'https://www.sec.gov/files/company_tickers.json',
      { headers: { 'User-Agent': 'StockBeacon/1.0' } }
    );
    const data = await response.json();
    
    // Create a map for fast lookups
    Object.values(data).forEach(company => {
      this.cikCache.set(
        company.ticker, 
        String(company.cik_str).padStart(10, '0')
      );
    });
    
    console.log(\`Loaded \${this.cikCache.size} symbol->CIK mappings\`);
  }
  
  static getCIK(symbol) {
    return this.cikCache.get(symbol.toUpperCase());
  }
}
  `);
}

testConversions().catch(console.error);
