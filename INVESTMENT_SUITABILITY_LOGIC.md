# Investment Suitability Logic in StockBeacon

## Overview
Investment Suitability identifies which types of investors would be best suited for a particular stock based on comprehensive financial analysis. The system evaluates four investor profiles: Conservative, Growth, Value, and Income.

## How It Works

The system analyzes the company's financial health score, specific green flags (positive indicators), red flags (warning signs), and financial trends to determine suitability for each investor type.

## 1. Conservative Investors 🛡️
**Profile**: Prioritize capital preservation, stability, and predictable returns

### Requirements:
- **Health Score**: ≥ 70 (Strong financial health)
- **No Critical Issues**: Must not have any critical red flags
- **Must Have ONE of**:
  - **Fortress Balance Sheet**: Strong cash position, low debt
  - **Stable Dividends**: Consistent, sustainable dividend payments
  - **Stable Margins**: Profit margins that are stable or improving

### What It Means:
- Low risk of significant losses
- Predictable business performance
- Strong financial cushion for downturns
- Suitable for risk-averse investors or retirees

## 2. Growth Investors 🚀
**Profile**: Seek companies with high growth potential, willing to accept more volatility

### Requirements:
- **Health Score**: ≥ 65 (Good financial health)
- **Growth Indicators**:
  - **Compound Growth Machine**: All key metrics growing >10% annually
  - **Operating Leverage**: Revenue growing faster than costs
  - **OR Strong Growth Trends**: Revenue/Net Income improving with >10% CAGR

### What It Means:
- High potential for capital appreciation
- Company reinvesting for growth
- Market share expansion
- Suitable for long-term investors with higher risk tolerance

## 3. Value Investors 💎
**Profile**: Look for undervalued companies with strong fundamentals

### Requirements:
- **Health Score**: ≥ 60 (Decent financial health)
- **No Critical Issues**: Must not have critical red flags
- **Strong Returns OR Cash Generation**:
  - **Exceptional ROE**: Return on Equity > 20%
  - **Superior ROIC**: Return on Invested Capital > 15%
  - **Superior Cash Generation**: FCF/Revenue > 15%
  - **High FCF Margin**: Strong free cash flow margins

### What It Means:
- Company efficiently uses capital
- Generates strong returns for shareholders
- May be undervalued by the market
- Suitable for patient investors seeking quality at fair prices

## 4. Income Investors 💰
**Profile**: Seek regular income through dividends

### Requirements:
- **Health Score**: ≥ 65 (Good financial health)
- **No Unsustainable Dividends**: Must not have dividend sustainability issues
- **Dividend Indicators**:
  - **Dividend Growth**: Increasing dividends over time
  - **Sustainable Dividends**: Dividends well-covered by earnings/FCF
  - **OR Improving Dividend Trends**: Positive dividend payment patterns

### What It Means:
- Regular income stream
- Dividend growth potential
- Financial strength to maintain payments
- Suitable for investors seeking passive income

## Real-World Examples

### Apple (AAPL) - Example Analysis
```
Health Score: 85
✅ Conservative: Yes (Fortress balance sheet, stable margins)
✅ Growth: Yes (Operating leverage, strong revenue growth)
✅ Value: Yes (Exceptional ROE of 147%, superior cash generation)
✅ Income: Yes (Growing dividends, well-covered by FCF)
```

### Struggling Retailer - Example Analysis
```
Health Score: 45
❌ Conservative: No (Critical debt issues, declining margins)
❌ Growth: No (Revenue declining, negative trends)
❌ Value: No (Poor returns on capital)
❌ Income: No (Dividend cut risk)
```

## Implementation Code Reference

The logic is implemented in:
```typescript
// src/lib/services/financial-interpreter/translators/beginner-translator.ts
private determineInvestmentSuitability(input: TranslatorInput): BeginnerSummary['investmentSuitability'] {
  // Conservative: Safety-first approach
  const conservative = healthScore.overall >= 70 && 
    !hasCriticalIssues && 
    (hasStrongBalance || hasStableDividends || hasStableMargins)
  
  // Growth: High growth potential
  const growth = healthScore.overall >= 65 && 
    (hasGrowth || hasGrowthTrends)
  
  // Value: Strong fundamentals, efficient capital use
  const value = healthScore.overall >= 60 && 
    (hasStrongReturns || hasCashGeneration) &&
    !hasCriticalIssues
  
  // Income: Reliable dividend payer
  const income = healthScore.overall >= 65 && 
    (hasDividends || hasDividendTrend) &&
    !hasUnsustainableDividend
}
```

## Visual Indicators in UI

The system displays suitability as badges:
- 🟢 **Suitable**: Meets all criteria for this investor type
- 🔴 **Not Suitable**: Doesn't meet minimum requirements

This helps investors quickly identify stocks that match their investment style and risk tolerance.
