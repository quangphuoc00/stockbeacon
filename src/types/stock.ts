export interface Stock {
  symbol: string
  name: string
  exchange?: string
  type?: string
  sector?: string | null
  industry?: string | null
}

export interface StockQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  peRatio: number | null
  eps: number | null
  dividendYield: number | null
  week52High: number | null
  week52Low: number | null
  dayHigh: number | null
  dayLow: number | null
  previousClose: number | null
  averageDailyVolume3Month: number | null
  sharesOutstanding: number | null
  sector: string | null
  industry: string | null
  earningsDate: Date | null
  isEarningsDateEstimate: boolean | null
  epsGrowth3to5Year: number | null
  updatedAt: Date
}

export interface StockFinancials {
  symbol: string
  // Profitability metrics
  grossMargin: number | null
  operatingMargin: number | null
  profitMargin: number | null
  returnOnEquity: number | null
  returnOnAssets: number | null
  
  // Valuation metrics
  priceToBook: number | null
  priceToSales: number | null
  pegRatio: number | null
  forwardPE: number | null
  
  // Financial health
  currentRatio: number | null
  quickRatio: number | null
  debtToEquity: number | null
  totalCash: number | null
  totalDebt: number | null
  freeCashflow: number | null
  
  // Growth metrics
  revenueGrowth: number | null
  earningsGrowth: number | null
  
  // Raw financial data
  revenue: number | null
  netIncome: number | null
  totalAssets: number | null
  totalLiabilities: number | null
  shareholderEquity: number | null
  operatingCashflow: number | null
  
  updatedAt: Date
}

export interface StockHistorical {
  date: Date | string  // Can be Date object or ISO string
  open: number
  high: number
  low: number
  close: number
  volume: number
  adjustedClose?: number
}

export interface StockScore {
  symbol: string
  score: number // 0-100
  businessQualityScore: number // 0-60
  timingScore: number // 0-40
  
  // Business Quality Components (60 points total)
  financialHealthScore: number // 0-25
  moatScore: number // 0-20
  growthScore: number // 0-15
  
  // Timing Components (40 points total)
  valuationScore: number // 0-20
  technicalScore: number // 0-20
  
  // Technical Analysis Data
  technicalIndicators?: TechnicalIndicators
  
  // Analysis
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
  explanation: string
  strengths: string[]
  weaknesses: string[]
  
  calculatedAt: Date
}

export interface TechnicalIndicators {
  sma20: number
  sma50: number
  sma150: number
  sma200: number
  rsi: number
  macd: {
    value: number
    signal: number
    histogram: number
  }
  bollinger: {
    upper: number
    middle: number
    lower: number
  }
  support: number
  resistance: number
  trend: 'bullish' | 'bearish' | 'neutral'
  volatility: number
}

// Financial Statement Types
export interface FinancialPeriod {
  date: Date | string
  endDate: Date | string
  fiscalYear?: number
  fiscalQuarter?: number
}

export interface IncomeStatementData extends FinancialPeriod {
  // Revenue
  revenue: number | null
  costOfRevenue: number | null
  grossProfit: number | null
  
  // Operating Expenses
  operatingExpenses: number | null
  sellingGeneralAdministrative: number | null
  researchDevelopment: number | null
  otherOperatingExpenses: number | null
  
  // Operating Income
  operatingIncome: number | null
  
  // Other Income/Expense
  interestExpense: number | null
  interestIncome: number | null
  otherNonOperatingIncome: number | null
  
  // Pre-tax Income
  incomeBeforeTax: number | null
  incomeTaxExpense: number | null
  
  // Net Income
  netIncome: number | null
  netIncomeFromContinuingOps: number | null
  
  // Per Share Data
  eps: number | null
  epsDiluted: number | null
  
  // Additional Items
  ebit: number | null
  ebitda: number | null
  exceptionalItems: number | null
}

export interface BalanceSheetData extends FinancialPeriod {
  // Assets
  totalAssets: number | null
  currentAssets: number | null
  cashAndCashEquivalents: number | null
  cashAndShortTermInvestments: number | null
  netReceivables: number | null
  inventory: number | null
  otherCurrentAssets: number | null
  
  // Non-current Assets
  propertyPlantEquipment: number | null
  goodwill: number | null
  intangibleAssets: number | null
  longTermInvestments: number | null
  otherNonCurrentAssets: number | null
  
  // Liabilities
  totalLiabilities: number | null
  currentLiabilities: number | null
  accountsPayable: number | null
  shortTermDebt: number | null
  currentPortionLongTermDebt: number | null
  otherCurrentLiabilities: number | null
  
  // Non-current Liabilities
  longTermDebt: number | null
  deferredTaxLiabilities: number | null
  otherNonCurrentLiabilities: number | null
  
  // Equity
  totalShareholderEquity: number | null
  commonStock: number | null
  retainedEarnings: number | null
  treasuryStock: number | null
  otherShareholderEquity: number | null
  minorityInterest: number | null
  
  // Shares
  sharesOutstanding: number | null
  sharesOutstandingDiluted: number | null
  preferredSharesOutstanding: number | null
}

export interface CashFlowStatementData extends FinancialPeriod {
  // Operating Activities
  operatingCashFlow: number | null
  netIncome: number | null
  depreciation: number | null
  stockBasedCompensation: number | null
  deferredIncomeTaxes: number | null
  changeInWorkingCapital: number | null
  changeInReceivables: number | null
  changeInInventory: number | null
  changeInPayables: number | null
  otherOperatingActivities: number | null
  
  // Investing Activities
  investingCashFlow: number | null
  capitalExpenditures: number | null
  investments: number | null
  acquisitionsNet: number | null
  otherInvestingActivities: number | null
  
  // Financing Activities
  financingCashFlow: number | null
  dividendsPaid: number | null
  stockRepurchased: number | null
  debtRepayment: number | null
  debtIssuance: number | null
  otherFinancingActivities: number | null
  
  // Net Change
  netChangeInCash: number | null
  foreignCurrencyEffect: number | null
  freeCashFlow: number | null
  
  // Beginning/Ending Cash
  beginCashPosition: number | null
  endCashPosition: number | null
  
  // Supplemental
  cashInterestPaid: number | null
  cashTaxesPaid: number | null
}

export interface FinancialStatements {
  symbol: string
  incomeStatements: {
    annual: IncomeStatementData[]
    quarterly: IncomeStatementData[]
    ttm?: IncomeStatementData
  }
  balanceSheets: {
    annual: BalanceSheetData[]
    quarterly: BalanceSheetData[]
  }
  cashFlowStatements: {
    annual: CashFlowStatementData[]
    quarterly: CashFlowStatementData[]
    ttm?: CashFlowStatementData
  }
  updatedAt: Date
}
