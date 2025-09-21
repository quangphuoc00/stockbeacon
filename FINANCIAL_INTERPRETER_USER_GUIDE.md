# Financial Statement Interpreter - User Guide

## Quick Start

The Financial Statement Interpreter analyzes US-listed companies and provides comprehensive financial health assessments in plain English.

### Basic Usage

```bash
# Get financial analysis for any US stock
curl http://localhost:3000/api/stocks/AAPL/analysis

# Get raw financial statements (if needed)
curl http://localhost:3000/api/stocks/AAPL/financial-statements
```

## Understanding the Analysis

### Health Score & Grade

- **95-100 (A+)**: Exceptional company - top tier financial health
- **90-94 (A)**: Excellent company - very strong fundamentals  
- **80-89 (B+)**: Very good company - solid investment candidate
- **70-79 (B)**: Good company - some minor concerns
- **60-69 (C+)**: Average company - notable weaknesses
- **50-59 (C)**: Below average - significant concerns
- **< 50 (D/F)**: Poor health - serious financial issues

### Simple Rating System

- 🟢 **Excellent**: Strong buy candidate
- 🟢 **Good**: Solid investment option
- 🟡 **Fair**: Proceed with caution
- 🔴 **Poor**: Avoid or exit position

### Investment Suitability

The system evaluates if a stock fits different investment styles:

- **Conservative**: Low risk, stable companies with strong balance sheets
- **Growth**: High growth potential with expanding revenues/profits
- **Value**: Undervalued with strong fundamentals
- **Income**: Reliable dividend payers

## Key Analysis Components

### 1. Red Flags (Warning Signs)

**Critical Issues** (Immediate concern):
- Insolvency risk (liabilities > assets)
- Liquidity crisis (can't pay near-term bills)
- Cash burn with high debt

**Major Issues** (High priority):
- Unsustainable debt payments
- Negative/collapsing margins
- Poor earnings quality

**Warning Signs** (Monitor closely):
- Margin compression trends
- Rising capital requirements
- Shareholder dilution

### 2. Green Flags (Positive Signs)

**Exceptional Strengths**:
- Superior cash generation
- Compound growth machine
- Capital-light business model

**Strong Points**:
- Fortress balance sheet
- Pricing power
- Shareholder-friendly actions

### 3. Financial Ratios

All ratios come with:
- Current value
- Plain English explanation
- Good/bad benchmarks
- What it means for you

Example: "Current Ratio: 1.5 - Company has $1.50 for every $1 of near-term bills (Good)"

### 4. Trend Analysis

Shows direction over multiple years:
- 📈 Improving (good sign)
- 📊 Stable (neutral)
- 📉 Deteriorating (warning)
- 🎢 Volatile (unpredictable)

### 5. Actionable Recommendations

Each analysis provides specific actions:
- **Action**: What to do immediately
- **Monitor**: What to watch
- **Investigate**: What to research further

## Example Interpretations

### Healthy Company (Score: 85)
```
"Very healthy company (B+) - Like a well-maintained car that runs smoothly."

Strengths:
- Growing revenue and profits
- Strong cash generation
- Low debt levels

Recommendation: Good long-term investment candidate
```

### Struggling Company (Score: 45)
```
"Company in serious trouble (F) - Like a sinking ship that needs rescue."

Weaknesses:
- Burning cash rapidly
- High debt burden
- Declining revenues

Recommendation: Avoid or exit position immediately
```

## API Response Fields

### Core Analysis
- `healthScore.overall`: 0-100 score
- `healthScore.grade`: Letter grade (A+ to F)
- `summary.oneLineSummary`: Plain English summary
- `summary.simpleRating`: Visual rating (🟢/🟡/🔴)

### Detailed Findings
- `keyStrengths[]`: Top 3 positive aspects
- `keyWeaknesses[]`: Top 3 concerns
- `topRedFlags[]`: Most serious warnings
- `topGreenFlags[]`: Best qualities

### Financial Metrics
- `keyRatios[]`: Important ratios with explanations
- `keyTrends[]`: Multi-year performance trends

### Recommendations
- `recommendations[]`: Prioritized action items

## Limitations

1. **US Stocks Only**: International companies return 404
2. **Historical Analysis**: Based on past performance
3. **No Price Analysis**: Doesn't consider stock valuation
4. **No Predictions**: Doesn't forecast future performance

## Best Practices

1. **Regular Monitoring**: Re-analyze quarterly after earnings
2. **Holistic View**: Consider analysis alongside other factors
3. **Risk Tolerance**: Match investments to your risk profile
4. **Diversification**: Don't rely on single stock analysis

## Error Handling

### Common Errors

```json
// Non-US Company
{
  "error": "Not a US-listed company",
  "message": "Financial analysis is available for US-listed companies only"
}

// Invalid Symbol
{
  "error": "Not a US-listed company",
  "message": "Financial analysis is available for US-listed companies only"
}

// Temporary Error
{
  "error": "Analysis failed",
  "message": "An error occurred while analyzing the financial data"
}
```

## Performance Tips

1. **Caching**: Results cached for 4 hours
2. **Batch Requests**: Space out multiple requests
3. **Error Retry**: Wait 30 seconds before retrying failed requests

## Integration Examples

### JavaScript/TypeScript
```typescript
async function analyzeStock(symbol: string) {
  const response = await fetch(`/api/stocks/${symbol}/analysis`);
  
  if (!response.ok) {
    const error = await response.json();
    console.error(`Analysis failed: ${error.message}`);
    return null;
  }
  
  const analysis = await response.json();
  
  // Check investment suitability
  if (analysis.summary.investmentSuitability.conservative) {
    console.log(`${symbol} suitable for conservative investors`);
  }
  
  // Display health score
  console.log(`Health Score: ${analysis.healthScore.overall} (${analysis.healthScore.grade})`);
  
  // Show top recommendation
  if (analysis.recommendations.length > 0) {
    const topRec = analysis.recommendations[0];
    console.log(`Action: ${topRec.title} - ${topRec.description}`);
  }
  
  return analysis;
}
```

### Python
```python
import requests

def analyze_stock(symbol):
    response = requests.get(f'http://localhost:3000/api/stocks/{symbol}/analysis')
    
    if response.status_code == 404:
        print(f"{symbol} is not a US-listed company")
        return None
        
    if response.status_code != 200:
        print(f"Error analyzing {symbol}")
        return None
        
    analysis = response.json()
    
    # Display summary
    print(f"{symbol} Analysis:")
    print(f"Health Score: {analysis['healthScore']['overall']} ({analysis['healthScore']['grade']})")
    print(f"Rating: {analysis['summary']['simpleRating']}")
    print(f"Summary: {analysis['summary']['oneLineSummary']}")
    
    # Check red flags
    if analysis['redFlagsCount'] > 0:
        print(f"\nWarning: {analysis['redFlagsCount']} red flags detected:")
        for flag in analysis['topRedFlags']:
            print(f"- {flag['title']}: {flag['explanation']}")
    
    return analysis
```

## Support

For issues or questions:
1. Check if stock is US-listed (NYSE, NASDAQ)
2. Verify symbol is correct
3. Check API endpoint is accessible
4. Review error messages for guidance

The Financial Statement Interpreter provides professional-grade analysis in a format anyone can understand, helping make informed investment decisions with confidence.
