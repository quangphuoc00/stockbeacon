/**
 * Alpaca Markets data service for bulk operations (crawler)
 * Requires ALPACA_API_KEY and ALPACA_API_SECRET in environment
 * 
 * Free plan limits:
 * - Unlimited market data requests
 * - Real-time data for IEX (free tier)
 * - 15-min delayed data for other exchanges
 */

import { StockQuote, StockFinancials, StockHistorical } from '@/types/stock'

interface AlpacaBar {
  t: string // timestamp
  o: number // open
  h: number // high
  l: number // low
  c: number // close
  v: number // volume
}

interface AlpacaSnapshot {
  symbol: string
  latestTrade?: {
    t: string
    p: number // price
    s: number // size
  }
  latestQuote?: {
    t: string
    ap: number // ask price
    bp: number // bid price
    as: number // ask size
    bs: number // bid size
  }
  minuteBar?: AlpacaBar
  dailyBar?: AlpacaBar
  prevDailyBar?: AlpacaBar
}

export class AlpacaDataService {
  private static readonly BASE_URL = 'https://data.alpaca.markets/v2'
  
  private static getHeaders() {
    const apiKey = process.env.ALPACA_API_KEY
    const apiSecret = process.env.ALPACA_API_SECRET
    
    if (!apiKey || !apiSecret) {
      throw new Error('Alpaca API credentials not configured')
    }
    
    return {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': apiSecret,
      'Content-Type': 'application/json'
    }
  }
  
  /**
   * Get stock quote using Alpaca's snapshot endpoint
   */
  static async getQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/stocks/${symbol}/snapshot`,
        { headers: this.getHeaders() }
      )
      
      if (!response.ok) {
        throw new Error(`Alpaca API error: ${response.status}`)
      }
      
      const data: AlpacaSnapshot = await response.json()
      
      const currentPrice = data.latestTrade?.p || data.minuteBar?.c || 0
      const prevClose = data.prevDailyBar?.c || 0
      const priceChange = currentPrice - prevClose
      const priceChangePercent = prevClose > 0 ? (priceChange / prevClose) * 100 : 0
      
      return {
        symbol: symbol,
        name: symbol, // Alpaca doesn't provide company names
        price: currentPrice,
        change: priceChange,
        changePercent: priceChangePercent,
        volume: data.dailyBar?.v || 0,
        marketCap: 0, // Not available from Alpaca
        peRatio: null,
        eps: null,
        dividendYield: null,
        week52High: null, // Would need separate historical query
        week52Low: null,
        dayHigh: data.dailyBar?.h || null,
        dayLow: data.dailyBar?.l || null,
        previousClose: prevClose,
        averageDailyVolume3Month: null,
        sharesOutstanding: null,
        sector: null,
        industry: null,
        earningsDate: null,
        isEarningsDateEstimate: null,
        epsGrowth3to5Year: null,
        updatedAt: new Date()
      } as StockQuote
    } catch (error) {
      console.error(`Alpaca: Failed to fetch quote for ${symbol}:`, error)
      return null
    }
  }
  
  /**
   * Get multiple quotes in a single request (more efficient for crawler)
   */
  static async getBulkQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    const quotes = new Map<string, StockQuote>()
    
    try {
      // Alpaca allows up to 100 symbols per request
      const symbolsParam = symbols.slice(0, 100).join(',')
      
      const response = await fetch(
        `${this.BASE_URL}/stocks/snapshots?symbols=${symbolsParam}`,
        { headers: this.getHeaders() }
      )
      
      if (!response.ok) {
        throw new Error(`Alpaca API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      for (const [symbol, snapshot] of Object.entries(data.snapshots || {})) {
        const snap = snapshot as AlpacaSnapshot
        const currentPrice = snap.latestTrade?.p || snap.minuteBar?.c || 0
        const prevClose = snap.prevDailyBar?.c || 0
        const priceChange = currentPrice - prevClose
        const priceChangePercent = prevClose > 0 ? (priceChange / prevClose) * 100 : 0
        
        quotes.set(symbol, {
          symbol: symbol,
          name: symbol,
          price: currentPrice,
          change: priceChange,
          changePercent: priceChangePercent,
          volume: snap.dailyBar?.v || 0,
          marketCap: 0,
          peRatio: null,
          eps: null,
          dividendYield: null,
          week52High: null,
          week52Low: null,
          dayHigh: snap.dailyBar?.h || null,
          dayLow: snap.dailyBar?.l || null,
          previousClose: prevClose,
          averageDailyVolume3Month: null,
          sharesOutstanding: null,
          sector: null,
          industry: null,
          earningsDate: null,
          isEarningsDateEstimate: null,
          epsGrowth3to5Year: null,
          updatedAt: new Date()
        } as StockQuote)
      }
    } catch (error) {
      console.error('Alpaca: Failed to fetch bulk quotes:', error)
    }
    
    return quotes
  }
  
  /**
   * Get historical price data
   */
  static async getHistoricalData(
    symbol: string, 
    period: string = '3mo'
  ): Promise<StockHistorical[]> {
    try {
      // Calculate date range
      const end = new Date()
      const start = new Date()
      
      switch (period) {
        case '1mo':
          start.setMonth(start.getMonth() - 1)
          break
        case '3mo':
          start.setMonth(start.getMonth() - 3)
          break
        case '6mo':
          start.setMonth(start.getMonth() - 6)
          break
        case '1y':
          start.setFullYear(start.getFullYear() - 1)
          break
        default:
          start.setMonth(start.getMonth() - 3)
      }
      
      const response = await fetch(
        `${this.BASE_URL}/stocks/${symbol}/bars?` +
        `start=${start.toISOString().split('T')[0]}&` +
        `end=${end.toISOString().split('T')[0]}&` +
        `timeframe=1Day&` +
        `page_limit=1000`,
        { headers: this.getHeaders() }
      )
      
      if (!response.ok) {
        throw new Error(`Alpaca API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      return (data.bars || []).map((bar: AlpacaBar) => ({
        date: new Date(bar.t),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
        adjustedClose: bar.c // Alpaca provides adjusted data by default
      }))
    } catch (error) {
      console.error(`Alpaca: Failed to fetch historical for ${symbol}:`, error)
      return []
    }
  }
  
  /**
   * Get basic financials (Alpaca doesn't provide fundamental data)
   * Returns mock data with reasonable defaults for score calculation
   */
  static async getFinancials(symbol: string): Promise<StockFinancials | null> {
    try {
      // Alpaca doesn't provide fundamental data
      // Return reasonable defaults that won't break score calculation
      return {
        symbol: symbol,
        grossMargin: 0.4, // 40% default
        operatingMargin: 0.2, // 20% default
        profitMargin: 0.15, // 15% default
        returnOnEquity: 0.15, // 15% default
        returnOnAssets: 0.08, // 8% default
        priceToBook: 3,
        priceToSales: 5,
        pegRatio: 1.5,
        forwardPE: 20,
        currentRatio: 1.5,
        quickRatio: 1.2,
        debtToEquity: 0.5, // 50% default
        totalCash: 10000000000,
        totalDebt: 5000000000,
        freeCashflow: 1000000000, // $1B default
        revenueGrowth: 0.1, // 10% default
        earningsGrowth: 0.12, // 12% default
        revenue: 10000000000, // $10B default
        netIncome: 2000000000,
        totalAssets: 50000000000,
        totalLiabilities: 20000000000,
        shareholderEquity: 30000000000,
        operatingCashflow: 1500000000,
        updatedAt: new Date()
      }
    } catch (error) {
      console.error(`Alpaca: Failed to create default financials for ${symbol}:`, error)
      return null
    }
  }
  
  /**
   * Check if Alpaca API is configured
   */
  static isConfigured(): boolean {
    return !!(process.env.ALPACA_API_KEY && process.env.ALPACA_API_SECRET)
  }
}

export default AlpacaDataService
