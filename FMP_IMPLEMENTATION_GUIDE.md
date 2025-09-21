# Financial Modeling Prep Integration Guide

## Overview

StockBeacon now supports Financial Modeling Prep (FMP) for comprehensive financial statement data. This integration provides detailed income statements, balance sheets, and cash flow statements with all line items instead of the limited data from Yahoo Finance.

## Implementation Details

### Architecture
- **Primary Source**: Financial Modeling Prep (when API key is configured)
- **Fallback**: Yahoo Finance (when FMP is not available)
- **Caching**: 24-hour Redis cache for all financial statements

### What's Included

1. **Income Statement**
   - Revenue, Cost of Revenue, Gross Profit
   - Operating Expenses (SG&A, R&D, etc.)
   - Operating Income, EBIT, EBITDA
   - Interest Income/Expense
   - Tax Information
   - Net Income and EPS

2. **Balance Sheet**
   - Current & Non-current Assets
   - Cash, Receivables, Inventory
   - Property, Plant & Equipment
   - Current & Long-term Liabilities
   - Shareholder Equity Components

3. **Cash Flow Statement**
   - Operating Cash Flow with details
   - Investing Activities (CapEx, Acquisitions)
   - Financing Activities (Dividends, Buybacks)
   - Free Cash Flow

### Data Availability
- **Annual Data**: Up to 5 years
- **Quarterly Data**: Up to 8 quarters
- **TTM Calculations**: Automatic for Income & Cash Flow

## Setup Instructions

### 1. Get Your FMP API Key(s)

1. Visit [Financial Modeling Prep](https://financialmodelingprep.com/developer/docs/)
2. Sign up for a free account (or multiple accounts)
3. Copy your API key(s) from the dashboard

### 2. Add Keys to Database

#### Option 1: Via API Endpoint (Recommended)
```bash
curl -X POST "http://localhost:3000/api/admin/fmp-keys" \
  -H "Content-Type: application/json" \
  -d '{"keys": ["key1", "key2", "key3"]}'
```

#### Option 2: Via Environment Variables (Auto-migration)
Add to `.env.local` and keys will be auto-imported on first use:
```bash
# Single key
FMP_API_KEY=your-api-key-here

# Multiple keys
FMP_API_KEYS=key1,key2,key3,key4
```

### 3. Database Key Management

The system now uses a database table to manage API keys with:
- **Automatic rotation**: Round-robin distribution
- **Failure tracking**: Keys are blacklisted after 3 failures
- **Usage statistics**: Track API calls per key
- **Smart retry**: Automatically tries next key on failure

**Benefits:**
- Each free key = 250 calls/day
- 4 keys = 1,000 calls/day
- 10 keys = 2,500 calls/day
- Auto-blacklist invalid keys
- View usage statistics

### 4. Check Key Status

```bash
# View key statistics
curl "http://localhost:3000/api/admin/fmp-keys"

# Reset a blacklisted key
curl -X PUT "http://localhost:3000/api/admin/fmp-keys" \
  -H "Content-Type: application/json" \
  -d '{"key": "your-key", "action": "reset"}'
```

### 4. Verify Integration

Run the test script:

```bash
./scripts/test-fmp-integration.sh
```

## Usage

1. Navigate to any stock page (e.g., `/stocks/AAPL`)
2. Click on the "Financials" tab
3. You'll see:
   - Financial Metrics card (existing)
   - Financial Statements table with full data

### Visual Indicators

- **Green banner**: "Full Data Available" - Using FMP with detailed data
- **Yellow banner**: "Limited Data" - Using Yahoo Finance fallback

## API Limits & Key Rotation

### Free Tier (Per Key)
- 250 API calls per day
- Access to all financial statements
- 5 years of historical data

### With Key Rotation
- **2 keys**: 500 calls/day
- **4 keys**: 1,000 calls/day
- **10 keys**: 2,500 calls/day

### How Key Rotation Works
1. Keys are used in round-robin fashion
2. Each API call uses the next key in sequence
3. If a key hits rate limit, automatically tries next key
4. Console logs show which key is being used

### Monitoring Key Usage
Check console logs to see:
```
Using FMP API key 1 of 4
Using FMP API key 2 of 4
Using FMP API key 3 of 4
Using FMP API key 4 of 4
Using FMP API key 1 of 4 (cycles back)
```

### Paid Tiers
- Higher rate limits (no rotation needed)
- Real-time data
- Additional endpoints

## Troubleshooting

### No Data Showing
1. Check if FMP_API_KEY is set in `.env.local`
2. Verify API key is valid
3. Check console for error messages
4. Clear Redis cache if needed

### Rate Limit Errors
- Free tier: 250 calls/day
- Each stock uses 6 calls (3 statements × 2 periods)
- Data is cached for 24 hours

### Fallback to Yahoo
The system automatically falls back to Yahoo Finance if:
- No FMP API key is configured
- FMP API returns an error
- Rate limit is exceeded

## Technical Details

### Files Modified
- `/src/lib/services/financial-modeling-prep.service.ts` - FMP service implementation
- `/src/app/api/stocks/[symbol]/financial-statements/route.ts` - API endpoint
- `/src/components/stocks/financial-statement-table.tsx` - UI updates
- `/src/components/stocks/stock-details-client.tsx` - Integration

### Data Flow
1. User visits stock page → Financials tab
2. Frontend requests `/api/stocks/[symbol]/financial-statements`
3. API checks Redis cache
4. If not cached:
   - Try FMP API (if configured)
   - Fallback to Yahoo Finance
5. Cache results for 24 hours
6. Return data to frontend

## Benefits

### With FMP
- Complete financial statements
- All line items populated
- Professional-grade data
- TTM calculations
- Historical comparisons

### Without FMP (Yahoo only)
- Limited to revenue & net income
- Most fields show as "-"
- Basic data only

## Future Enhancements

1. **Export Functionality**
   - CSV/Excel export
   - PDF reports

2. **Advanced Analytics**
   - Financial ratios
   - Trend analysis
   - Peer comparisons

3. **Additional Data**
   - Earnings forecasts
   - Analyst estimates
   - Conference call transcripts

## Support

For issues or questions:
1. Check the console for error messages
2. Run the test script
3. Verify API key configuration
4. Check FMP API status
