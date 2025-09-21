# Alpha Vantage Financial Statements Example

## What You Get with Free API Key (500 calls/day)

### Income Statement Response:
```json
{
  "symbol": "AAPL",
  "annualReports": [
    {
      "fiscalDateEnding": "2023-09-30",
      "reportedCurrency": "USD",
      "grossProfit": "169148000000",
      "totalRevenue": "383285000000",
      "costOfRevenue": "214137000000",
      "costofGoodsAndServicesSold": "214137000000",
      "operatingIncome": "114301000000",
      "sellingGeneralAndAdministrative": "24932000000",
      "researchAndDevelopment": "29915000000",
      "operatingExpenses": "54847000000",
      "netIncome": "96995000000",
      "ebitda": "129183000000",
      "ebit": "114301000000",
      "incomeBeforeTax": "113736000000",
      "incomeTaxExpense": "16741000000",
      "interestIncome": "3750000000",
      "netInterestIncome": "3750000000",
      "interestExpense": "3933000000",
      "depreciationAndAmortization": "14882000000"
    }
  ],
  "quarterlyReports": [
    {
      "fiscalDateEnding": "2024-09-30",
      "reportedCurrency": "USD",
      "grossProfit": "43883000000",
      "totalRevenue": "94930000000",
      "costOfRevenue": "51047000000",
      // ... all fields included
    }
  ]
}
```

### Balance Sheet Response:
```json
{
  "symbol": "AAPL",
  "annualReports": [
    {
      "fiscalDateEnding": "2023-09-30",
      "reportedCurrency": "USD",
      "totalAssets": "352755000000",
      "totalCurrentAssets": "143566000000",
      "cashAndCashEquivalentsAtCarryingValue": "29965000000",
      "cashAndShortTermInvestments": "61555000000",
      "inventory": "6331000000",
      "currentNetReceivables": "60985000000",
      "totalNonCurrentAssets": "209189000000",
      "propertyPlantEquipment": "43715000000",
      "intangibleAssets": "0",
      "goodwill": "0",
      "totalLiabilities": "290437000000",
      "totalCurrentLiabilities": "145308000000",
      "currentAccountsPayable": "62611000000",
      "currentDebt": "15807000000",
      "totalNonCurrentLiabilities": "145129000000",
      "longTermDebt": "106550000000",
      "totalShareholderEquity": "62146000000",
      "commonStock": "73812000000",
      "retainedEarnings": "-214000000"
    }
  ]
}
```

### Cash Flow Statement Response:
```json
{
  "symbol": "AAPL",
  "annualReports": [
    {
      "fiscalDateEnding": "2023-09-30",
      "reportedCurrency": "USD",
      "operatingCashflow": "110543000000",
      "netIncome": "96995000000",
      "depreciationDepletionAndAmortization": "14882000000",
      "capitalExpenditures": "10959000000",
      "changeInInventory": "-1618000000",
      "cashflowFromInvestment": "-3705000000",
      "cashflowFromFinancing": "-108581000000",
      "dividendPayout": "14996000000",
      "freeCashFlow": "99584000000",
      "changeInCashAndCashEquivalents": "-1759000000"
    }
  ]
}
```

## How to Get Started:

1. Sign up for free API key: https://www.alphavantage.co/support/#api-key
2. You'll receive the key instantly via email
3. Use these endpoints:
   - Income Statement: `function=INCOME_STATEMENT`
   - Balance Sheet: `function=BALANCE_SHEET`
   - Cash Flow: `function=CASH_FLOW`

## Implementation Example:

```typescript
// Alpha Vantage Service
class AlphaVantageService {
  private static readonly BASE_URL = 'https://www.alphavantage.co/query'
  private static readonly API_KEY = process.env.ALPHA_VANTAGE_API_KEY
  
  static async getFinancialStatements(symbol: string) {
    const [income, balance, cashflow] = await Promise.all([
      this.fetchData('INCOME_STATEMENT', symbol),
      this.fetchData('BALANCE_SHEET', symbol),
      this.fetchData('CASH_FLOW', symbol)
    ])
    
    return {
      incomeStatements: this.processIncomeStatements(income),
      balanceSheets: this.processBalanceSheets(balance),
      cashFlowStatements: this.processCashFlowStatements(cashflow)
    }
  }
}
```

## Rate Limits:
- **Free Tier**: 5 calls/minute, 500 calls/day
- **Premium**: 60-600 calls/minute depending on plan

This provides MUCH more detailed data than Yahoo Finance!
