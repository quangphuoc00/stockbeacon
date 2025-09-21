# SEC Data Options Comparison

## 1. **SEC EDGAR API** (data.sec.gov) - Official & FREE ✅

### Overview
- **Official SEC API** - Direct from the government
- **100% FREE** - No API key required
- **No rate limits** (just be respectful with User-Agent)
- **Complete financial data** from all SEC filings

### How to Access
```bash
# Company facts endpoint (all financial data)
curl "https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json" \
  -H "User-Agent: StockBeacon/1.0"

# Submissions endpoint (all filings)
curl "https://data.sec.gov/submissions/CIK0000320193.json" \
  -H "User-Agent: StockBeacon/1.0"
```

### Data Format Example
```json
{
  "facts": {
    "us-gaap": {
      "Revenue": {
        "units": {
          "USD": [
            {
              "end": "2023-09-30",
              "val": 383285000000,
              "fy": 2023,
              "fp": "FY",
              "form": "10-K",
              "filed": "2023-11-03"
            }
          ]
        }
      },
      "NetIncome": {
        "units": {
          "USD": [...]
        }
      }
      // ... hundreds of financial metrics
    }
  }
}
```

### Pros
- ✅ Completely free forever
- ✅ No API limits
- ✅ Most accurate (source data)
- ✅ All financial metrics available
- ✅ Historical data back to 1990s

### Cons
- ❌ Requires CIK lookup (not symbol)
- ❌ Complex JSON structure
- ❌ Need to map XBRL tags to friendly names
- ❌ US companies only

---

## 2. **SEC-API.io** - Third-party Service 💰

### Overview
- **Third-party service** that simplifies SEC data
- **NOT FREE** - Paid service with limited free tier
- Provides easier access to SEC data

### Pricing (as of 2024)
- Free tier: **100 requests/month** (very limited)
- Starter: $99/month for 10,000 requests
- Professional: $299/month for 50,000 requests

### Example Endpoints
```bash
# Requires API key
curl "https://api.sec-api.io/financial-statements?ticker=AAPL&type=10-K" \
  -H "Authorization: YOUR_API_KEY"
```

### Pros
- ✅ Easier to use than raw SEC data
- ✅ Works with stock symbols
- ✅ Pre-processed data

### Cons
- ❌ Expensive for production use
- ❌ Very limited free tier (100 calls/month)
- ❌ Still need to pay for meaningful usage

---

## 📊 Comparison for StockBeacon

| Feature | SEC EDGAR API | SEC-API.io |
|---------|--------------|------------|
| Cost | FREE | $99+/month |
| API Calls | Unlimited | 100/month free |
| Data Quality | Raw/Complete | Processed |
| Complexity | High | Low |
| Stock Symbol Support | No (needs CIK) | Yes |

---

## 🎯 Recommendation

For StockBeacon, I recommend using the **official SEC EDGAR API** because:

1. **It's completely free** with unlimited calls
2. **Most comprehensive data** available
3. **No vendor lock-in** or API key management
4. **Future-proof** (government service)

### Implementation Strategy

I can build a service that:
1. Converts stock symbols to CIK numbers
2. Fetches data from SEC EDGAR API
3. Transforms XBRL data to your existing format
4. Caches processed results

This gives you:
- ✅ Unlimited free financial data
- ✅ All companies filing with SEC
- ✅ Complete financial statements
- ✅ No API key hassles

Would you like me to implement the SEC EDGAR API integration? It's more work initially but will save you money and API limitations forever.
