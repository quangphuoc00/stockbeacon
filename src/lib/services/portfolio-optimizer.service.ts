import { StockDataService } from './stock-data.service'

export class PortfolioOptimizerService {
  /**
   * Batch fetch stock data for multiple symbols with optimizations
   */
  static async batchFetchStockData(symbols: string[]) {
    // Deduplicate and clean symbols
    const cleanSymbols = [...new Set(symbols.map(s => s.toUpperCase().trim()))]
    
    // Fix common typos
    const fixedSymbols = cleanSymbols.map(symbol => {
      if (symbol === 'APPL') return 'AAPL'
      return symbol
    })
    
    // Check cache first for all symbols
    const cachePromises = fixedSymbols.map(async symbol => {
      const cached = await StockDataService.getStockData(symbol)
      return { symbol, cached }
    })
    
    const cacheResults = await Promise.all(cachePromises)
    
    // Separate cached vs uncached
    const cachedData = new Map<string, any>()
    const uncachedSymbols: string[] = []
    
    cacheResults.forEach(({ symbol, cached }) => {
      if (cached?.quote && cached?.financials) {
        cachedData.set(symbol, cached)
      } else {
        uncachedSymbols.push(symbol)
      }
    })
    
    // Fetch uncached data in parallel with rate limiting
    const BATCH_SIZE = 5 // Process 5 symbols at a time
    const uncachedData = new Map<string, any>()
    
    for (let i = 0; i < uncachedSymbols.length; i += BATCH_SIZE) {
      const batch = uncachedSymbols.slice(i, i + BATCH_SIZE)
      const batchPromises = batch.map(async symbol => {
        try {
          const data = await StockDataService.getStockData(symbol)
          return { symbol, data }
        } catch (error) {
          console.error(`Failed to fetch data for ${symbol}:`, error)
          return { symbol, data: null }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      batchResults.forEach(({ symbol, data }) => {
        if (data) {
          uncachedData.set(symbol, data)
        }
      })
      
      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < uncachedSymbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    // Combine all results
    const allData = new Map([...cachedData, ...uncachedData])
    
    // Return original symbols mapped to data (handling typos)
    return symbols.map(originalSymbol => {
      const fixedSymbol = originalSymbol === 'APPL' ? 'AAPL' : originalSymbol.toUpperCase()
      return {
        originalSymbol,
        data: allData.get(fixedSymbol) || null
      }
    })
  }
  
  /**
   * Pre-warm cache for portfolio symbols
   */
  static async prewarmCache(symbols: string[]) {
    const results = await this.batchFetchStockData(symbols)
    console.log(`Pre-warmed cache for ${results.filter(r => r.data).length}/${symbols.length} symbols`)
  }
}
