import { YahooFinanceService } from './yahoo-finance.service'
import { StockBeaconScoreService } from './stockbeacon-score.service'
import { RedisCacheService } from './redis-cache.service'
import { RedisBatchService } from './redis-batch.service'
import { StockQuote, StockFinancials, StockScore, StockHistorical } from '@/types/stock'

export class StockDataService {
  /**
   * Get comprehensive stock data with caching
   */
  static async getStockData(symbol: string) {
    // Use batch operation to get all cached data in one call
    const cachedData = await RedisBatchService.getBatchStockData(symbol)
    
    // If all cached data is fresh, return it
    if (cachedData.quote && cachedData.financials && cachedData.score && cachedData.historical) {
      return {
        quote: cachedData.quote,
        financials: cachedData.financials,
        score: cachedData.score,
        historical: cachedData.historical,
        fromCache: true,
      }
    }
    
    // Fetch fresh data
    
    const [quote, financials, historical] = await Promise.all([
      cachedData.quote || YahooFinanceService.getQuote(symbol),
      cachedData.financials || YahooFinanceService.getFinancials(symbol),
      cachedData.historical || YahooFinanceService.getHistoricalData(symbol, '3mo'),
    ])
    
    if (!quote || !financials) {
      // Check if it's a known invalid symbol
      if (symbol === 'APPL') {
        console.warn(`Invalid symbol ${symbol} - did you mean AAPL?`)
      }
      throw new Error(`Unable to fetch data for ${symbol}`)
    }
    
    // Historical data is optional - use empty array if not available
    const safeHistorical = historical || []
    
    // Calculate fresh score if needed
    let score = cachedData.score
    if (!score && safeHistorical && safeHistorical.length > 0) {
      score = StockBeaconScoreService.calculateScore(quote, financials, safeHistorical as StockHistorical[])
    }
    
    // Use batch operation to cache all fresh data at once
    const dataToCache: any = {}
    const ttls: any = {}
    
    if (!cachedData.quote && quote) {
      dataToCache.quote = quote
      ttls.quote = 300 // 5 minutes
    }
    if (!cachedData.financials && financials) {
      dataToCache.financials = financials
      ttls.financials = 3600 // 1 hour
    }
    if (!cachedData.historical && safeHistorical && safeHistorical.length > 0) {
      dataToCache.historical = safeHistorical
      ttls.historical = 3600 // 1 hour
    }
    if (!cachedData.score && score) {
      dataToCache.score = score
      ttls.score = 3600 // 1 hour
    }
    
    // Batch write to Redis
    if (Object.keys(dataToCache).length > 0) {
      await RedisBatchService.setBatchStockData(symbol, dataToCache, ttls)
    }
    
    return {
      quote,
      financials,
      score,
      historical: safeHistorical,
      fromCache: false,
    }
  }

  /**
   * Get multiple stock quotes efficiently
   */
  static async getMultipleQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    // Check cache for all symbols
    const cachedQuotes = await RedisCacheService.getQuotes(symbols)
    
    // Find symbols that need fresh data
    const symbolsToFetch = symbols.filter(s => !cachedQuotes.has(s))
    
    if (symbolsToFetch.length > 0) {
      // Fetch fresh quotes
      const freshQuotes = await YahooFinanceService.getQuotes(symbolsToFetch)
      
      // Cache fresh quotes
      for (const [symbol, quote] of Array.from(freshQuotes)) {
        await RedisCacheService.setQuote(symbol, quote)
        cachedQuotes.set(symbol, quote)
      }
    }
    
    return cachedQuotes
  }

  /**
   * Get top performing stocks
   */
  static async getTopStocks(limit: number = 10): Promise<Array<{
    symbol: string
    quote: StockQuote
    score: StockScore
  }>> {
    // Get top scored stocks from cache
    let topSymbols = await RedisCacheService.getTopScoredStocks(limit)
    
    // If no cached rankings, use trending stocks
    if (topSymbols.length === 0) {
      const trending = await this.getTrendingStocks()
      topSymbols = trending.slice(0, limit)
    }
    
    // Get data for top stocks
    const results = []
    for (const symbol of topSymbols) {
      try {
        const data = await this.getStockData(symbol)
        if (data.quote && data.score) {
          results.push({
            symbol,
            quote: data.quote,
            score: data.score,
          })
        }
      } catch (error) {
        console.error(`Failed to get data for ${symbol}:`, error)
      }
    }
    
    // Sort by score
    results.sort((a, b) => b.score.score - a.score.score)
    
    return results.slice(0, limit)
  }

  /**
   * Get trending stocks
   */
  static async getTrendingStocks(): Promise<string[]> {
    // Check cache first
    let trending = await RedisCacheService.getTrendingStocks()
    
    if (!trending) {
      // Fetch fresh trending stocks
      trending = await YahooFinanceService.getTrendingStocks()
      
      // Cache them
      await RedisCacheService.setTrendingStocks(trending)
    }
    
    return trending
  }

  /**
   * Search for stocks
   */
  static async searchStocks(query: string) {
    return YahooFinanceService.searchStocks(query)
  }

  /**
   * Get stocks by criteria (for screener)
   */
  static async getScreenerStocks(criteria: {
    minScore?: number
    maxScore?: number
    sector?: string
    minMarketCap?: number
    maxPE?: number
    riskLevel?: 'conservative' | 'balanced' | 'growth'
  }) {
    // For now, start with trending stocks
    const trendingSymbols = await this.getTrendingStocks()
    
    // Filter out crypto symbols to avoid errors
    const cryptoPatterns = ['-USD', 'USD-', 'IBIT', 'GBTC', 'ETHE', 'BITO']
    const symbols = trendingSymbols.filter(symbol => 
      !cryptoPatterns.some(pattern => symbol.includes(pattern))
    )
    
    const results = []
    
    for (const symbol of symbols) {
      try {
        const data = await this.getStockData(symbol)
        
        if (!data.quote || !data.score) continue
        
        // Apply filters
        if (criteria.minScore && data.score.score < criteria.minScore) continue
        if (criteria.maxScore && data.score.score > criteria.maxScore) continue
        if (criteria.sector && data.quote.sector !== criteria.sector) continue
        if (criteria.minMarketCap && data.quote.marketCap < criteria.minMarketCap) continue
        if (criteria.maxPE && data.quote.peRatio && data.quote.peRatio > criteria.maxPE) continue
        
        // Risk level filtering
        if (criteria.riskLevel) {
          const score = data.score.score
          if (criteria.riskLevel === 'conservative' && score < 70) continue
          if (criteria.riskLevel === 'balanced' && (score < 50 || score > 80)) continue
          if (criteria.riskLevel === 'growth' && score > 60) continue
        }
        
        results.push({
          symbol,
          quote: data.quote,
          score: data.score,
          financials: data.financials,
        })
      } catch (error) {
        console.error(`Failed to process ${symbol}:`, error)
      }
    }
    
    // Sort by score
    results.sort((a, b) => b.score.score - a.score.score)
    
    return results
  }

  /**
   * Update stock data (for background jobs)
   */
  static async updateStockData(symbol: string): Promise<void> {
    try {
      // Clear old cache
      await RedisCacheService.clearStockCache(symbol)
      
      // Fetch fresh data
      const [quote, financials, historical] = await Promise.all([
        YahooFinanceService.getQuote(symbol),
        YahooFinanceService.getFinancials(symbol),
        YahooFinanceService.getHistoricalData(symbol, '3mo'),
      ])
      
      if (!quote || !financials || !historical) {
        throw new Error(`Incomplete data for ${symbol}`)
      }
      
      // Calculate fresh score
      const score = StockBeaconScoreService.calculateScore(quote, financials, historical)
      
      // Cache everything
      await Promise.all([
        RedisCacheService.setQuote(symbol, quote),
        RedisCacheService.setFinancials(symbol, financials),
        RedisCacheService.setScore(symbol, score),
        RedisCacheService.setHistorical(symbol, '3mo', historical),
      ])
      
      console.log(`Successfully updated data for ${symbol}`)
    } catch (error) {
      console.error(`Failed to update data for ${symbol}:`, error)
      throw error
    }
  }

  /**
   * Batch update multiple stocks
   */
  static async batchUpdateStocks(symbols: string[]): Promise<void> {
    const batchSize = 3 // Process 3 at a time to avoid rate limits
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize)
      await Promise.all(batch.map(symbol => this.updateStockData(symbol)))
      
      // Delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  /**
   * Check if market is open
   */
  static async isMarketOpen(): Promise<boolean> {
    // Check cached status first
    const cached = await RedisCacheService.getMarketStatus()
    if (cached) {
      return cached.isOpen
    }
    
    // Simple market hours check (NYSE: 9:30 AM - 4:00 PM ET, Mon-Fri)
    const now = new Date()
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
    const day = easternTime.getDay()
    const hour = easternTime.getHours()
    const minute = easternTime.getMinutes()
    
    // Closed on weekends
    if (day === 0 || day === 6) {
      await RedisCacheService.setMarketStatus(false)
      return false
    }
    
    // Market hours: 9:30 AM - 4:00 PM
    const isOpen = (hour === 9 && minute >= 30) || (hour > 9 && hour < 16)
    
    await RedisCacheService.setMarketStatus(isOpen)
    return isOpen
  }
}
