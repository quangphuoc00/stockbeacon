# Current Financial Data Sources

## 🎯 What We're Actually Using

### Primary Source: SEC EDGAR API (FREE)
- **Used for**: All US-listed companies
- **Data quality**: Complete financial statements with 15-20 fields per statement
- **Cost**: 100% FREE, no API keys required
- **Rate limits**: None

### Fallback Source: Yahoo Finance
- **Used for**: Non-US companies or when SEC data isn't available
- **Data quality**: Basic data (~5 fields: revenue, net income, eps)
- **Cost**: FREE
- **Rate limits**: Minimal

## ❌ What We're NOT Using

### Financial Modeling Prep (FMP)
- **Status**: Code exists but NOT ACTIVE
- **Reason**: We switched to SEC EDGAR which is free and more reliable
- **The FMP keys you provided were for legacy endpoints no longer available on free tier

## 📊 How to Verify

Test with a US company (uses SEC):
```bash
curl "http://localhost:3000/api/stocks/AAPL/financial-statements" | jq '.incomeStatements.annual[0]'
```

You'll see comprehensive data:
- ✅ Revenue: $383.29B
- ✅ Cost of Revenue: $214.14B
- ✅ Gross Profit: $169.15B
- ✅ Operating Income: $114.30B
- ✅ R&D: $29.92B
- ✅ And 10+ more fields...

Test with a non-US company (uses Yahoo):
```bash
curl "http://localhost:3000/api/stocks/TSM/financial-statements" | jq '.incomeStatements.annual[0]'
```

You'll see limited data (mostly nulls except revenue and net income).

## 🔧 UI Messages Updated

The financial statements table now correctly shows:
- **For US companies**: "Displaying comprehensive financial statements from SEC EDGAR"
- **For non-US companies**: "Financial data is limited for this company"

No more mentions of Financial Modeling Prep!
