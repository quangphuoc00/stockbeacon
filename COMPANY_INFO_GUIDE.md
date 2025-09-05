# Company Information Guide

## Overview

This guide explains how to retrieve company information using Yahoo Finance and alternative APIs in the StockBeacon application.

## Current Implementation

### 1. Yahoo Finance Company Profile

We've added a new method `getCompanyProfile` to the Yahoo Finance service that retrieves:

- **Business Summary**: Detailed company description
- **Sector & Industry**: Company classification
- **Contact Information**: Address, phone, website
- **Employee Count**: Full-time employees
- **Key Executives**: Names, titles, and compensation

#### Usage Example:

```typescript
import { YahooFinanceService } from '@/lib/services/yahoo-finance.service'

// Get company profile
const profile = await YahooFinanceService.getCompanyProfile('AAPL')

console.log(profile.businessSummary) // "Apple Inc. designs, manufactures..."
console.log(profile.sector)          // "Technology"
console.log(profile.industry)        // "Consumer Electronics"
console.log(profile.fullTimeEmployees) // 164000
```

#### API Endpoint:

```bash
GET /api/stocks/{symbol}/profile
```

### 2. SEC EDGAR Integration (Already Implemented)

Your application already has SEC EDGAR integration for official company filings:

```typescript
import { SECEdgarService } from '@/lib/services/sec-edgar.service'

// Get company overview from SEC
const overview = await SECEdgarService.getCompanyOverview('AAPL')
const filings = await SECEdgarService.getRecentFilings('AAPL')
```

## Yahoo Finance Modules Available

The `yahoo-finance2` library provides these modules through `quoteSummary`:

1. **assetProfile**: Company description, sector, industry, officers
2. **summaryProfile**: Additional profile information
3. **summaryDetail**: Price data, valuation metrics
4. **defaultKeyStatistics**: Key financial statistics
5. **financialData**: Financial health metrics
6. **calendarEvents**: Earnings dates, dividends
7. **recommendationTrend**: Analyst recommendations
8. **upgradeDowngradeHistory**: Rating changes
9. **earnings**: Historical earnings
10. **earningsHistory**: Earnings surprises
11. **earningsTrend**: Future earnings estimates
12. **industryTrend**: Industry comparison

### Example: Get Multiple Data Points

```typescript
const data = await yahooFinance.quoteSummary('AAPL', {
  modules: ['assetProfile', 'financialData', 'recommendationTrend']
})
```

## Alternative APIs for Company Information

### 1. Alpha Vantage (Free Tier Available)

```bash
npm install alpha-vantage
```

```typescript
const alpha = require('alphavantage')({ key: 'YOUR_API_KEY' });

alpha.fundamental.company_overview('AAPL').then(data => {
  console.log(data['Description']);
  console.log(data['Sector']);
  console.log(data['MarketCapitalization']);
});
```

### 2. IEX Cloud (50k messages/month free)

```bash
npm install iexcloud
```

```typescript
import { IEXCloudClient } from 'iexcloud';

const iex = new IEXCloudClient('YOUR_TOKEN');
const company = await iex.company('AAPL');
console.log(company.description);
```

### 3. Finnhub (60 calls/minute free)

```bash
npm install finnhub
```

```typescript
const finnhub = require('finnhub');
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = "YOUR_API_KEY";
const finnhubClient = new finnhub.DefaultApi();

finnhubClient.companyProfile2({'symbol': 'AAPL'}, (error, data) => {
  console.log(data.name);
  console.log(data.finnhubIndustry);
  console.log(data.marketCapitalization);
});
```

### 4. Polygon.io (5 calls/minute free)

```bash
npm install @polygon.io/client-js
```

```typescript
import { restClient } from '@polygon.io/client-js';

const rest = restClient('YOUR_API_KEY');
const ticker = await rest.reference.tickerDetails('AAPL');
console.log(ticker.results.description);
```

## Comparison Table

| Feature | Yahoo Finance | Alpha Vantage | IEX Cloud | Finnhub | Polygon |
|---------|--------------|---------------|-----------|---------|---------|
| Business Description | ✓ | ✓ | ✓ | ✓ | ✓ |
| Sector/Industry | ✓ | ✓ | ✓ | ✓ | ✓ |
| Employee Count | ✓ | ✓ | ✓ | ✗ | ✓ |
| Key Executives | ✓ | ✗ | ✓ | ✗ | ✗ |
| Contact Info | ✓ | ✓ | ✓ | ✓ | ✓ |
| Free Tier | ✓ | ✓ | ✓ | ✓ | ✓ |
| Rate Limits | Moderate | 5/min | 50k/month | 60/min | 5/min |
| API Key Required | ✗ | ✓ | ✓ | ✓ | ✓ |

## Implementation Recommendations

1. **Primary Source**: Use Yahoo Finance (already implemented) for basic company info
2. **Fallback**: Use SEC EDGAR (already implemented) for detailed business descriptions
3. **Enhanced Data**: Consider adding one paid API for production (IEX Cloud or Polygon)
4. **Caching**: Always cache company profiles (already implemented with 1-hour TTL)

## Testing the Implementation

Run the test script to see Yahoo Finance company data:

```bash
node test-company-info.js
```

Or test the API endpoint:

```bash
curl http://localhost:3000/api/stocks/AAPL/profile
```

## Next Steps

1. Add company profile display to the stock detail page
2. Consider implementing a fallback mechanism between data sources
3. Add company logo support (available from IEX Cloud or Finnhub)
4. Implement company news aggregation from multiple sources
