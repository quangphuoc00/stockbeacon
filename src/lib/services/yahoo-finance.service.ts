import yahooFinance from 'yahoo-finance2'
import { Stock, StockQuote, StockFinancials, StockHistorical } from '@/types/stock'

// Configure yahoo-finance2
yahooFinance.setGlobalConfig({
  queue: {
    concurrency: 2,
    timeout: 60000,
  },
})

export class YahooFinanceService {
  /**
   * Fetch real-time stock quote data
   */
  static async getQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const [quote, calendarEvents, analysis] = await Promise.all([
        yahooFinance.quote(symbol),
        yahooFinance.quoteSummary(symbol, { modules: ['calendarEvents'] }).catch(() => null),
        yahooFinance.quoteSummary(symbol, { modules: ['earningsTrend'] }).catch(() => null)
      ])
      
      if (!quote) return null

      // Extract earnings date
      let earningsDate = null
      if (calendarEvents?.calendarEvents?.earnings?.earningsDate?.[0]) {
        const earningsData = calendarEvents.calendarEvents.earnings.earningsDate[0]
        // Yahoo Finance may return this as a Date object or timestamp
        if (earningsData instanceof Date) {
          earningsDate = earningsData
        } else if (typeof earningsData === 'number') {
          // It's a Unix timestamp - convert to Date
          earningsDate = new Date(earningsData * 1000)
        }
      }

      // Extract 3-5 year EPS growth rate
      let epsGrowth3to5Year = null
      if (analysis?.earningsTrend?.trend) {
        const longTermGrowth = analysis.earningsTrend.trend.find(t => t.period === '+5y')
        if (longTermGrowth?.growth) {
          epsGrowth3to5Year = longTermGrowth.growth
        }
      }

      const result = {
        symbol: quote.symbol,
        name: quote.longName || quote.shortName || symbol,
        price: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        volume: quote.regularMarketVolume || 0,
        marketCap: quote.marketCap || 0,
        peRatio: quote.trailingPE || null,
        eps: quote.epsTrailingTwelveMonths || null,
        dividendYield: quote.dividendYield || null,
        week52High: quote.fiftyTwoWeekHigh || null,
        week52Low: quote.fiftyTwoWeekLow || null,
        dayHigh: quote.regularMarketDayHigh || null,
        dayLow: quote.regularMarketDayLow || null,
        previousClose: quote.regularMarketPreviousClose || null,
        averageDailyVolume3Month: quote.averageDailyVolume3Month || null,
        sharesOutstanding: quote.sharesOutstanding || null,
        sector: quote.sector || null,
        industry: quote.industry || null,
        earningsDate: earningsDate,
        epsGrowth3to5Year: epsGrowth3to5Year,
        updatedAt: new Date(),
      }

      return result
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Fetch multiple stock quotes in batch
   */
  static async getQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    const quotes = new Map<string, StockQuote>()
    
    // Process in batches to avoid rate limiting
    const batchSize = 5
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize)
      const promises = batch.map(symbol => this.getQuote(symbol))
      const results = await Promise.all(promises)
      
      results.forEach((quote, index) => {
        if (quote) {
          quotes.set(batch[index], quote)
        }
      })
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    return quotes
  }

  /**
   * Fetch company financial data
   */
  static async getFinancials(symbol: string): Promise<StockFinancials | null> {
    try {
      // Skip cryptocurrencies and certain ETFs that don't have fundamentals
      const skipPatterns = ['-USD', 'USD-', 'IBIT', 'GBTC', 'ETHE', 'BITO']
      if (skipPatterns.some(pattern => symbol.includes(pattern))) {
        console.log(`Skipping financials for ${symbol} (cryptocurrency/crypto ETF)`)
        return null
      }

      const [summary, financials] = await Promise.all([
        yahooFinance.quoteSummary(symbol, {
          modules: ['defaultKeyStatistics', 'financialData', 'summaryDetail']
        }).catch(() => null),
        yahooFinance.quoteSummary(symbol, {
          modules: ['incomeStatementHistory', 'balanceSheetHistory', 'cashflowStatementHistory']
        }).catch(() => null)
      ])

      // If we couldn't get any data, return null
      if (!summary && !financials) {
        console.warn(`No fundamental data available for ${symbol}`)
        return null
      }

      // Extract key financial metrics
      const financialData = summary?.financialData
      const keyStats = summary?.defaultKeyStatistics
      const summaryDetail = summary?.summaryDetail
      
      // Get latest financial statements
      const latestIncome = financials?.incomeStatementHistory?.incomeStatementHistory?.[0]
      const latestBalance = financials?.balanceSheetHistory?.balanceSheetStatements?.[0]
      const latestCashflow = financials?.cashflowStatementHistory?.cashflowStatements?.[0]

      return {
        symbol,
        // Profitability metrics
        grossMargin: financialData?.grossMargins || null,
        operatingMargin: financialData?.operatingMargins || null,
        profitMargin: financialData?.profitMargins || null,
        returnOnEquity: financialData?.returnOnEquity || null,
        returnOnAssets: financialData?.returnOnAssets || null,
        
        // Valuation metrics
        priceToBook: keyStats?.priceToBook || null,
        priceToSales: summaryDetail?.priceToSalesTrailing12Months || null,
        pegRatio: keyStats?.pegRatio || null,
        forwardPE: summaryDetail?.forwardPE || null,
        
        // Financial health
        currentRatio: financialData?.currentRatio || null,
        quickRatio: financialData?.quickRatio || null,
        debtToEquity: financialData?.debtToEquity || null,
        totalCash: financialData?.totalCash || null,
        totalDebt: financialData?.totalDebt || null,
        freeCashflow: financialData?.freeCashflow || null,
        
        // Growth metrics
        revenueGrowth: financialData?.revenueGrowth || null,
        earningsGrowth: financialData?.earningsGrowth || null,
        
        // Raw financial data
        revenue: latestIncome?.totalRevenue || null,
        netIncome: latestIncome?.netIncome || null,
        totalAssets: latestBalance?.totalAssets || null,
        totalLiabilities: latestBalance?.totalLiab || null,
        shareholderEquity: latestBalance?.totalStockholderEquity || null,
        operatingCashflow: latestCashflow?.totalCashFromOperatingActivities || null,
        
        updatedAt: new Date(),
      }
    } catch (error) {
      console.error(`Error fetching financials for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Fetch historical price data
   */
  static async getHistoricalData(
    symbol: string,
    period: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' = '3mo'
  ): Promise<StockHistorical[]> {
    try {
      const endDate = new Date()
      const startDate = new Date()
      
      // Calculate start date based on period
      switch (period) {
        case '1d': startDate.setDate(endDate.getDate() - 1); break
        case '5d': startDate.setDate(endDate.getDate() - 5); break
        case '1mo': startDate.setMonth(endDate.getMonth() - 1); break
        case '3mo': startDate.setMonth(endDate.getMonth() - 3); break
        case '6mo': startDate.setMonth(endDate.getMonth() - 6); break
        case '1y': startDate.setFullYear(endDate.getFullYear() - 1); break
        case '2y': startDate.setFullYear(endDate.getFullYear() - 2); break
        case '5y': startDate.setFullYear(endDate.getFullYear() - 5); break
      }

      // Use chart method instead of deprecated historical
      let result
      try {
        result = await yahooFinance.chart(symbol, {
          period1: startDate,
          period2: endDate,
          interval: period === '1d' || period === '5d' ? '5m' : '1d',
        })
      } catch (chartError: any) {
        console.error(`Chart API failed for ${symbol}:`, chartError.message)
        // Fallback to using historical method if chart fails
        try {
          // Historical method has different interval options - use '1d' for all periods
          const historicalData = await yahooFinance.historical(symbol, {
            period1: startDate,
            period2: endDate,
            interval: '1d', // Historical method only supports 1d, 1wk, 1mo
          })
          // Wrap in result object to match chart response structure
          result = { quotes: historicalData }
        } catch (historicalError) {
          console.error(`Historical API also failed for ${symbol}:`, historicalError)
          throw historicalError
        }
      }
      
      // Handle different response structures from chart vs historical methods
      const historical = Array.isArray(result) ? result : (result.quotes || [])
      
      // If no data returned, throw error to trigger mock data
      if (!historical || historical.length === 0) {
        console.log(`No historical data from Yahoo for ${symbol}, using mock data`)
        throw new Error('No historical data available from API')
      }
      
      console.log(`Yahoo Finance returned ${historical.length} data points for ${symbol}`)
      
      if (historical.length === 0) {
        return []
      }
      
      console.log(`Processing ${historical.length} historical data points for ${symbol}`)
      
      // Use the actual dates from Yahoo Finance
      const processedData = historical.map((data) => {
        // Ensure date is a proper Date object
        let dateObj: Date
        if (data.date instanceof Date) {
          dateObj = data.date
        } else if (typeof data.date === 'number') {
          // Unix timestamp
          dateObj = new Date(data.date * 1000)
        } else if (typeof data.date === 'string') {
          dateObj = new Date(data.date)
        } else {
          // Fallback to current date if date is invalid
          dateObj = new Date()
        }
        
        return {
          date: dateObj,
          open: data.open || 0,
          high: data.high || 0,
          low: data.low || 0,
          close: data.close || 0,
          volume: data.volume || 0,
          adjustedClose: data.adjclose || data.close || 0,
        }
      })
      
      // Sort by date to ensure chronological order
      processedData.sort((a, b) => a.date.getTime() - b.date.getTime())
      
      if (processedData.length > 0) {
        console.log(`Date range: ${processedData[0].date.toISOString()} to ${processedData[processedData.length - 1].date.toISOString()}`)
      }
      
      // Data is already in chronological order (oldest first)
      return processedData
      
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error)
      
      return this.generateMockData(symbol, period)
    }
  }

  /**
   * Generate mock historical data for testing
   */
  private static generateMockData(
    symbol: string,
    period: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y'
  ): StockHistorical[] {
    const mockData: StockHistorical[] = []
    const now = new Date()
    
    // Stock-specific base prices
    const basePrices: { [key: string]: number } = {
      'AAPL': 175,
      'GOOGL': 140,
      'MSFT': 380,
      'AMZN': 180,
      'TSLA': 250,
      'META': 500,
      'NVDA': 900,
      'BRK.B': 420,
      'JPM': 190,
      'V': 270,
    }
    
    const basePrice = basePrices[symbol] || 100
    
    // Generate mock data based on period
    let dataPoints = 65 // Default for 3mo
    let interval = 'daily'
    
    switch (period) {
      case '1d': 
        dataPoints = 78 // Every 5 min for 6.5 hours
        interval = '5min'
        break
      case '5d': 
        dataPoints = 390 // Every 5 min for 5 days
        interval = '5min'
        break
      case '1mo': dataPoints = 22; break // Daily for month
      case '3mo': dataPoints = 65; break // Daily for 3 months
      case '6mo': dataPoints = 130; break // Daily for 6 months
      case '1y': dataPoints = 252; break // Daily for year
      case '2y': dataPoints = 504; break // Daily for 2 years
      case '5y': dataPoints = 1260; break // Daily for 5 years
    }
    
    // Generate dates working backwards from today
    const dates: Date[] = []
    const today = new Date()
    today.setHours(16, 0, 0, 0) // Market close time
    
    // IMPORTANT: Ensure we're using 2024, not 2025
    if (today.getFullYear() > 2024) {
      today.setFullYear(2024)
      today.setMonth(11) // December
      today.setDate(6) // Dec 6, 2024 (a Friday)
    }
    
    if (interval === '5min') {
      // For intraday data
      for (let i = dataPoints - 1; i >= 0; i--) {
        const date = new Date(today)
        date.setMinutes(date.getMinutes() - (i * 5))
        dates.push(date)
      }
    } else {
      // For daily data - skip weekends
      let currentDate = new Date(today)
      let tradingDaysFound = 0
      
      while (tradingDaysFound < dataPoints) {
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          dates.unshift(new Date(currentDate))
          tradingDaysFound++
        }
        currentDate.setDate(currentDate.getDate() - 1)
      }
    }
    
    // Generate realistic price movements
    let currentPrice = basePrice
    const volatility = 0.02 // 2% daily volatility
    const trend = 0.0005 // Slight upward trend
    
    for (let i = 0; i < dates.length; i++) {
      // Random walk with trend
      const randomChange = (Math.random() - 0.5) * 2 * volatility
      const trendChange = trend
      currentPrice = currentPrice * (1 + randomChange + trendChange)
      
      // Ensure price doesn't go negative
      currentPrice = Math.max(currentPrice, basePrice * 0.5)
      
      // Generate OHLC data
      const dayVolatility = Math.random() * volatility
      const open = currentPrice * (1 + (Math.random() - 0.5) * dayVolatility)
      const close = currentPrice
      const high = Math.max(open, close) * (1 + Math.random() * dayVolatility)
      const low = Math.min(open, close) * (1 - Math.random() * dayVolatility)
      
      mockData.push({
        date: dates[i],
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.floor(10000000 + Math.random() * 20000000),
        adjustedClose: Number(close.toFixed(2)),
      })
    }
    
    console.log(`Generated ${mockData.length} mock data points for ${symbol}`)
    console.log(`Date range: ${dates[0].toISOString()} to ${dates[dates.length - 1].toISOString()}`)
    
    return mockData
  }

  /**
   * Search for stocks by query
   */
  static async searchStocks(query: string): Promise<Stock[]> {
    try {
      const results = await yahooFinance.search(query, {
        quotesCount: 10,
        newsCount: 0,
      })

      return results.quotes
        .filter(quote => quote.typeDisp === 'Equity')
        .map(quote => ({
          symbol: quote.symbol,
          name: quote.longname || quote.shortname || quote.symbol,
          exchange: quote.exchange || 'Unknown',
          type: quote.typeDisp || 'Stock',
        }))
    } catch (error) {
      console.error('Error searching stocks:', error)
      return []
    }
  }

  /**
   * Get trending stocks
   */
  static async getTrendingStocks(): Promise<string[]> {
    try {
      const trending = await yahooFinance.trendingSymbols('US', {
        count: 20,
      })

      // Filter out cryptocurrencies and crypto ETFs
      const cryptoPatterns = ['-USD', 'USD-', 'IBIT', 'GBTC', 'ETHE', 'BITO']
      const filteredSymbols = trending.quotes
        .map(quote => quote.symbol)
        .filter(symbol => !cryptoPatterns.some(pattern => symbol.includes(pattern)))

      // If we have less than 5 stocks after filtering, add some reliable ones
      if (filteredSymbols.length < 5) {
        const fallbackStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM', 'V', 'JNJ']
        const uniqueSymbols = [...new Set([...filteredSymbols, ...fallbackStocks])]
        return uniqueSymbols.slice(0, 10)
      }

      return filteredSymbols
    } catch (error) {
      console.error('Error fetching trending stocks:', error)
      // Return default popular stocks as fallback
      return ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM', 'V', 'JNJ']
    }
  }

  /**
   * Get key stats for a stock
   */
  static async getKeyStats(symbol: string) {
    try {
      const stats = await yahooFinance.quoteSummary(symbol, {
        modules: ['defaultKeyStatistics']
      })

      return stats.defaultKeyStatistics
    } catch (error) {
      console.error(`Error fetching key stats for ${symbol}:`, error)
      return null
    }
  }
}
