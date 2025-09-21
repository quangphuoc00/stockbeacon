# Financial Flags Thresholds Reference

This document outlines all the specific numerical thresholds and criteria used to generate financial flags in the StockBeacon analysis system.

## 🔴 Red Flags (Warning Signs)

### Critical Severity

1. **Insolvency Risk**
   - **Threshold**: Total Liabilities > Total Assets
   - **Formula**: `Total Liabilities > Total Assets`
   - **Example**: If assets = $100B and liabilities = $120B → Flag triggered

2. **Severe Liquidity Crisis**
   - **Threshold**: Current Ratio < 1.0
   - **Formula**: `Current Assets / Current Liabilities < 1`
   - **Additional Check**: Operating Cash Flow cannot cover working capital deficit
   - **Example**: If current assets = $5B, current liabilities = $6B → Ratio = 0.83 → Flag triggered

3. **Cash Burn with High Debt**
   - **Threshold**: Operating Cash Flow < 0 AND Debt/Equity > 2.0
   - **Formula**: `OCF < 0 AND (Total Debt / Total Equity) > 2`
   - **Example**: Losing $100M/month with D/E ratio of 3.5 → Flag triggered

4. **Negative Gross Margin**
   - **Threshold**: Gross Margin < 0%
   - **Formula**: `(Gross Profit / Revenue) < 0`
   - **Example**: Revenue = $1B, Cost of Goods = $1.1B → Margin = -10% → Flag triggered

### High Severity

1. **Unsustainable Debt Service**
   - **Threshold**: Debt Service Coverage < 1.0
   - **Formula**: `Operating Cash Flow / (Interest + Principal Repayment) < 1`
   - **Example**: OCF = $500M, Total debt service = $600M → Coverage = 0.83 → Flag triggered

2. **Severe Margin Compression**
   - **Threshold**: Gross Margin decline > 5 percentage points YoY
   - **Formula**: `Previous Year Margin - Current Year Margin > 5`
   - **Example**: Last year 45%, this year 38% → 7pp decline → Flag triggered

3. **Working Capital Crisis**
   - **Threshold**: Days Sales Outstanding (DSO) > 90 days
   - **Formula**: `(Accounts Receivable / Revenue) * 365 > 90`
   - **Example**: AR = $300M, Annual Revenue = $1B → DSO = 109 days → Flag triggered

### Medium Severity

1. **Tight Liquidity**
   - **Threshold**: Current Ratio < 1.2
   - **Formula**: `Current Assets / Current Liabilities < 1.2`
   - **Example**: Current assets = $6B, Current liabilities = $5.5B → Ratio = 1.09 → Flag triggered

2. **Weak Interest Coverage**
   - **Threshold**: Interest Coverage < 2.0
   - **Formula**: `Operating Income / Interest Expense < 2`
   - **Example**: Operating income = $150M, Interest = $80M → Coverage = 1.88 → Flag triggered

3. **Rising Inventory Levels**
   - **Threshold**: Inventory Days > 90 AND increased > 20% YoY
   - **Formula**: `(Inventory / COGS) * 365 > 90 AND YoY increase > 20%`

4. **Shareholder Dilution**
   - **Threshold**: Share count increase > 5% annually for 2+ years
   - **Formula**: `(Current Shares - Previous Shares) / Previous Shares > 0.05`

## 🟢 Green Flags (Positive Signs)

### Exceptional Strength

1. **Superior Cash Generation**
   - **Threshold**: Free Cash Flow Margin > 15%
   - **Formula**: `Free Cash Flow / Revenue > 0.15`
   - **Example**: FCF = $20B, Revenue = $100B → FCF Margin = 20% → Flag triggered

2. **Compound Growth Machine**
   - **Threshold**: Revenue, Earnings, and FCF all growing > 10% CAGR (3-year)
   - **Formula**: All three metrics > 10% compound annual growth
   - **Example**: Revenue CAGR = 15%, Earnings CAGR = 18%, FCF CAGR = 12% → Flag triggered

3. **Capital-Light Growth**
   - **Threshold**: CapEx/Revenue < 5%
   - **Formula**: `Capital Expenditures / Revenue < 0.05`
   - **Example**: CapEx = $2B, Revenue = $100B → Intensity = 2% → Flag triggered

4. **Exceptional ROE**
   - **Threshold**: Return on Equity > 30%
   - **Formula**: `Net Income / Shareholder Equity > 0.30`
   - **Example**: Net Income = $15B, Equity = $40B → ROE = 37.5% → Flag triggered

### Strong

1. **Fortress Balance Sheet**
   - **Threshold**: Net Cash > 0 AND Current Ratio > 2.0
   - **Formula**: `(Cash - Total Debt) > 0 AND (Current Assets / Current Liabilities) > 2`
   - **Example**: Cash = $50B, Debt = $20B, Current Ratio = 2.5 → Flag triggered

2. **Operating Leverage**
   - **Threshold**: Operating Margin expansion > 2pp with revenue growth > 5%
   - **Formula**: `Operating Margin increase > 2 AND Revenue Growth > 5%`

3. **Superior ROIC**
   - **Threshold**: Return on Invested Capital > 15%
   - **Formula**: `NOPAT / (Debt + Equity - Cash) > 0.15`

### Good

1. **Conservative Leverage**
   - **Threshold**: Debt/Equity < 0.3
   - **Formula**: `Total Debt / Total Equity < 0.3`
   - **Example**: Debt = $10B, Equity = $50B → D/E = 0.2 → Flag triggered

2. **Consistent Profitability**
   - **Threshold**: Positive net income for 5+ consecutive years
   - **Formula**: `Net Income > 0 for last 5 years`

3. **Strong Cash Conversion**
   - **Threshold**: OCF/Net Income > 1.2
   - **Formula**: `Operating Cash Flow / Net Income > 1.2`
   - **Example**: OCF = $15B, Net Income = $10B → Ratio = 1.5 → Flag triggered

## 📊 Key Ratio Benchmarks

### Liquidity Ratios
- **Current Ratio**: 
  - Excellent: > 2.0
  - Good: 1.5 - 2.0
  - Acceptable: 1.2 - 1.5
  - Concerning: 1.0 - 1.2
  - Critical: < 1.0

- **Quick Ratio**:
  - Excellent: > 1.5
  - Good: 1.0 - 1.5
  - Concerning: < 1.0

### Profitability Margins
- **Gross Margin**:
  - Decline > 5pp YoY = Red flag
  - Negative = Critical red flag
  - Stable/Improving = Positive

- **Operating Margin**:
  - Expansion > 2pp = Green flag
  - Compression > 3pp = Red flag

### Leverage Ratios
- **Debt/Equity**:
  - Conservative: < 0.3
  - Moderate: 0.3 - 1.0
  - High: 1.0 - 2.0
  - Excessive: > 2.0

- **Interest Coverage**:
  - Strong: > 5.0
  - Adequate: 2.0 - 5.0
  - Weak: < 2.0
  - Critical: < 1.0

### Efficiency Metrics
- **Cash Conversion Cycle**:
  - Excellent: < 30 days
  - Good: 30 - 60 days
  - Concerning: > 90 days

- **Inventory Turnover**:
  - High turnover + decreasing days = Green flag
  - Days > 90 + increasing = Red flag

## 💡 Important Notes

1. **Context Matters**: These thresholds are general guidelines. Industry-specific norms should be considered.

2. **Trend Analysis**: Many flags consider both absolute values and trends over time.

3. **Combination Effects**: Multiple flags together paint a more complete picture than individual metrics.

4. **Data Completeness**: All calculations require sufficient data. Missing data points reduce confidence scores.

5. **Dynamic Thresholds**: Some thresholds adjust based on company size, industry, or market conditions.

## 🔄 Updates

This document reflects the thresholds as implemented in the financial interpreter system. Any changes to these values should be documented here and in the corresponding analyzer files.
