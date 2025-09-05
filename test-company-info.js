/**
 * Test script to demonstrate company information retrieval methods
 */

const yahooFinance = require('yahoo-finance2').default;

// Test getting company profile information
async function testCompanyProfile() {
  console.log('=== Testing Yahoo Finance Company Profile ===\n');
  
  const symbol = 'AAPL';
  
  try {
    // Method 1: Using assetProfile module (most comprehensive)
    console.log('1. Asset Profile Module:');
    const profileData = await yahooFinance.quoteSummary(symbol, {
      modules: ['assetProfile', 'summaryProfile']
    });
    
    console.log(`Company: ${profileData.assetProfile?.longBusinessSummary?.substring(0, 200)}...`);
    console.log(`Sector: ${profileData.assetProfile?.sector}`);
    console.log(`Industry: ${profileData.assetProfile?.industry}`);
    console.log(`Employees: ${profileData.assetProfile?.fullTimeEmployees?.toLocaleString()}`);
    console.log(`Website: ${profileData.assetProfile?.website}\n`);
    
    // Method 2: Using summaryDetail module (financial summary)
    console.log('2. Summary Detail Module:');
    const summaryData = await yahooFinance.quoteSummary(symbol, {
      modules: ['summaryDetail']
    });
    
    console.log(`Market Cap: $${(summaryData.summaryDetail?.marketCap / 1e9).toFixed(2)}B`);
    console.log(`P/E Ratio: ${summaryData.summaryDetail?.trailingPE?.toFixed(2)}`);
    console.log(`Dividend Yield: ${(summaryData.summaryDetail?.dividendYield * 100)?.toFixed(2)}%\n`);
    
    // Method 3: Using multiple modules at once
    console.log('3. Multiple Modules (Comprehensive):');
    const comprehensiveData = await yahooFinance.quoteSummary(symbol, {
      modules: [
        'assetProfile',       // Company description, sector, industry
        'summaryProfile',     // Additional profile info
        'financialData',      // Financial metrics
        'defaultKeyStatistics', // Key stats
        'calendarEvents',     // Earnings dates
        'recommendationTrend', // Analyst recommendations
        'upgradeDowngradeHistory', // Rating changes
        'earningsTrend',      // Earnings estimates
        'industryTrend'       // Industry comparison
      ]
    });
    
    console.log('Available data modules:');
    Object.keys(comprehensiveData).forEach(module => {
      console.log(`  - ${module}: ${comprehensiveData[module] ? 'Available' : 'Not available'}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Alternative libraries and APIs for company information
async function showAlternatives() {
  console.log('\n=== Alternative APIs for Company Information ===\n');
  
  console.log('1. Alpha Vantage (Free tier available)');
  console.log('   - Company Overview endpoint');
  console.log('   - Provides: description, sector, industry, market cap, P/E, etc.');
  console.log('   - npm: alpha-vantage');
  console.log('   - Example: https://www.alphavantage.co/query?function=OVERVIEW&symbol=AAPL&apikey=demo\n');
  
  console.log('2. IEX Cloud (Free tier: 50k messages/month)');
  console.log('   - Company endpoint: /stock/{symbol}/company');
  console.log('   - Provides: description, CEO, employees, sector, tags');
  console.log('   - npm: iexcloud');
  console.log('   - Docs: https://iexcloud.io/docs/api/\n');
  
  console.log('3. Finnhub (Free tier: 60 calls/minute)');
  console.log('   - Company Profile endpoint');
  console.log('   - Provides: description, industry, market cap, logo');
  console.log('   - npm: finnhub');
  console.log('   - Example usage:');
  console.log(`   
   const finnhub = require('finnhub');
   const api_key = finnhub.ApiClient.instance.authentications['api_key'];
   api_key.apiKey = "YOUR_API_KEY";
   const finnhubClient = new finnhub.DefaultApi();
   
   finnhubClient.companyProfile2({'symbol': 'AAPL'}, (error, data) => {
     console.log(data);
   });\n`);
  
  console.log('4. Polygon.io (Free tier: 5 API calls/minute)');
  console.log('   - Ticker Details endpoint: /v3/reference/tickers/{ticker}');
  console.log('   - Provides: description, homepage, market cap, employees');
  console.log('   - npm: @polygon.io/client-js\n');
  
  console.log('5. SEC EDGAR (Free, no API key required)');
  console.log('   - Official company filings');
  console.log('   - Business descriptions from 10-K/10-Q filings');
  console.log('   - Already implemented in your codebase!\n');
  
  console.log('6. OpenBB SDK (Free, open source)');
  console.log('   - Aggregates multiple data sources');
  console.log('   - npm: @openbb/sdk');
  console.log('   - Comprehensive financial data platform\n');
}

// Run tests
async function main() {
  await testCompanyProfile();
  await showAlternatives();
}

main().catch(console.error);
