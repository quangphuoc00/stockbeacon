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
