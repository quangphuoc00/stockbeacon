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
      const quote = await yahooFinance.quote(symbol)
      
      if (!quote) return null

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

      const historical = await yahooFinance.historical(symbol, {
        period1: startDate,
        period2: endDate,
        interval: period === '1d' || period === '5d' ? '5m' : '1d',
      })

      return historical.map(data => ({
        date: data.date,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.volume,
        adjustedClose: data.adjClose,
      }))
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error)
      return []
    }
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
