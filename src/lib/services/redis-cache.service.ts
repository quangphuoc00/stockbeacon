import { Redis } from '@upstash/redis'
import { StockQuote, StockFinancials, StockScore } from '@/types/stock'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export class RedisCacheService {
  // Cache key prefixes
  private static readonly QUOTE_PREFIX = 'quote:'
  private static readonly FINANCIALS_PREFIX = 'financials:'
  private static readonly SCORE_PREFIX = 'score:'
  private static readonly HISTORICAL_PREFIX = 'historical:'
  private static readonly TRENDING_KEY = 'trending:stocks'
  
  // TTL values (in seconds)
  private static readonly QUOTE_TTL = 900 // 15 minutes for quotes
  private static readonly FINANCIALS_TTL = 86400 // 24 hours for financials
  private static readonly SCORE_TTL = 3600 // 1 hour for scores
  private static readonly HISTORICAL_TTL = 3600 // 1 hour for historical data
  private static readonly TRENDING_TTL = 3600 // 1 hour for trending stocks

  /**
   * Generic get method
   */
  static async get(key: string): Promise<string | null> {
    try {
      return await redis.get(key)
    } catch (error) {
      console.error(`Failed to get key ${key}:`, error)
      return null
    }
  }

  /**
   * Generic set method with TTL
   */
  static async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await redis.setex(key, ttl, value)
      } else {
        await redis.set(key, value)
      }
    } catch (error) {
      console.error(`Failed to set key ${key}:`, error)
    }
  }

  /**
   * Generic delete method
   */
  static async delete(key: string): Promise<void> {
    try {
      await redis.del(key)
    } catch (error) {
      console.error(`Failed to delete key ${key}:`, error)
    }
  }

  /**
   * Cache stock quote data
   */
  static async setQuote(symbol: string, quote: StockQuote): Promise<void> {
    try {
      const key = `${this.QUOTE_PREFIX}${symbol}`
      await redis.setex(key, this.QUOTE_TTL, JSON.stringify(quote))
    } catch (error) {
      console.error(`Failed to cache quote for ${symbol}:`, error)
    }
  }

  /**
   * Get cached stock quote
   */
  static async getQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const key = `${this.QUOTE_PREFIX}${symbol}`
      const cached = await redis.get(key)
      
      if (cached) {
        // Upstash Redis might return the object directly or as a string
        if (typeof cached === 'string') {
          return JSON.parse(cached) as StockQuote
        } else {
          return cached as StockQuote
        }
      }
      
      return null
    } catch (error) {
      console.error(`Failed to get cached quote for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Cache financial data
   */
  static async setFinancials(symbol: string, financials: StockFinancials): Promise<void> {
    try {
      const key = `${this.FINANCIALS_PREFIX}${symbol}`
      await redis.setex(key, this.FINANCIALS_TTL, JSON.stringify(financials))
    } catch (error) {
      console.error(`Failed to cache financials for ${symbol}:`, error)
    }
  }

  /**
   * Get cached financial data
   */
  static async getFinancials(symbol: string): Promise<StockFinancials | null> {
    try {
      const key = `${this.FINANCIALS_PREFIX}${symbol}`
      const cached = await redis.get(key)
      
      if (cached) {
        // Upstash Redis might return the object directly or as a string
        if (typeof cached === 'string') {
          return JSON.parse(cached) as StockFinancials
        } else {
          return cached as StockFinancials
        }
      }
      
      return null
    } catch (error) {
      console.error(`Failed to get cached financials for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Cache StockBeacon Score
   */
  static async setScore(symbol: string, score: StockScore): Promise<void> {
    try {
      const key = `${this.SCORE_PREFIX}${symbol}`
      await redis.setex(key, this.SCORE_TTL, JSON.stringify(score))
      
      // Also add to sorted set for ranking
      await redis.zadd('scores:ranking', {
        score: score.score,
        member: symbol,
      })
    } catch (error) {
      console.error(`Failed to cache score for ${symbol}:`, error)
    }
  }

  /**
   * Get cached StockBeacon Score
   */
  static async getScore(symbol: string): Promise<StockScore | null> {
    try {
      const key = `${this.SCORE_PREFIX}${symbol}`
      const cached = await redis.get(key)
      
      if (cached) {
        // Upstash Redis might return the object directly or as a string
        if (typeof cached === 'string') {
          return JSON.parse(cached) as StockScore
        } else {
          return cached as StockScore
        }
      }
      
      return null
    } catch (error) {
      console.error(`Failed to get cached score for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Get top scored stocks
   */
  static async getTopScoredStocks(limit: number = 10): Promise<string[]> {
    try {
      const topStocks = await redis.zrange('scores:ranking', -limit, -1, {
        rev: true,
      })
      
      return topStocks as string[]
    } catch (error) {
      console.error('Failed to get top scored stocks:', error)
      return []
    }
  }

  /**
   * Cache historical data
   */
  static async setHistorical(
    symbol: string,
    period: string,
    data: any[]
  ): Promise<void> {
    try {
      const key = `${this.HISTORICAL_PREFIX}${symbol}:${period}`
      // Ensure we're storing a string
      const dataToStore = typeof data === 'string' ? data : JSON.stringify(data)
      await redis.setex(key, this.HISTORICAL_TTL, dataToStore)
    } catch (error) {
      console.error(`Failed to cache historical data for ${symbol}:`, error)
    }
  }

  /**
   * Get cached historical data
   */
  static async getHistorical(symbol: string, period: string): Promise<any[] | null> {
    try {
      const key = `${this.HISTORICAL_PREFIX}${symbol}:${period}`
      const cached = await redis.get(key)
      
      if (cached) {
        // Check if cached is already an object or needs parsing
        if (typeof cached === 'string') {
          return JSON.parse(cached)
        }
        return cached as any[]
      }
      
      return null
    } catch (error) {
      console.error(`Failed to get cached historical data for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Cache trending stocks
   */
  static async setTrendingStocks(symbols: string[]): Promise<void> {
    try {
      // Filter out cryptocurrencies and ETFs that don't have fundamentals
      const filteredSymbols = symbols.filter(symbol => {
        const cryptoPatterns = ['-USD', 'USD-', 'IBIT', 'GBTC', 'ETHE', 'BITO']
        return !cryptoPatterns.some(pattern => symbol.includes(pattern))
      })
      
      await redis.setex(this.TRENDING_KEY, this.TRENDING_TTL, JSON.stringify(filteredSymbols))
    } catch (error) {
      console.error('Failed to cache trending stocks:', error)
    }
  }

  /**
   * Get cached trending stocks
   */
  static async getTrendingStocks(): Promise<string[] | null> {
    try {
      const cached = await redis.get(this.TRENDING_KEY)
      
      if (cached) {
        // Handle both string array and already parsed data
        if (typeof cached === 'string') {
          try {
            return JSON.parse(cached) as string[]
          } catch (parseError) {
            console.error('Failed to parse cached trending stocks, clearing cache:', parseError)
            await redis.del(this.TRENDING_KEY)
            return null
          }
        } else if (Array.isArray(cached)) {
          return cached as string[]
        }
      }
      
      return null
    } catch (error) {
      console.error('Failed to get cached trending stocks:', error)
      return null
    }
  }

  /**
   * Batch get multiple quotes
   */
  static async getQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    const quotes = new Map<string, StockQuote>()
    
    try {
      const keys = symbols.map(s => `${this.QUOTE_PREFIX}${s}`)
      const results = await redis.mget(...keys)
      
      results.forEach((result, index) => {
        if (result) {
          try {
            // Handle both string and already parsed data
            if (typeof result === 'string') {
              quotes.set(symbols[index], JSON.parse(result) as StockQuote)
            } else if (typeof result === 'object') {
              quotes.set(symbols[index], result as StockQuote)
            }
          } catch (parseError) {
            console.error(`Failed to parse cached quote for ${symbols[index]}:`, parseError)
            // Don't add to map if parsing fails
          }
        }
      })
    } catch (error) {
      console.error('Failed to get cached quotes:', error)
    }
    
    return quotes
  }

  /**
   * Clear cache for a specific stock
   */
  static async clearStockCache(symbol: string): Promise<void> {
    try {
      const keys = [
        `${this.QUOTE_PREFIX}${symbol}`,
        `${this.FINANCIALS_PREFIX}${symbol}`,
        `${this.SCORE_PREFIX}${symbol}`,
      ]
      
      for (const key of keys) {
        await redis.del(key)
      }
    } catch (error) {
      console.error(`Failed to clear cache for ${symbol}:`, error)
    }
  }

  /**
   * Check if data is stale
   */
  static async isStale(key: string): Promise<boolean> {
    try {
      const ttl = await redis.ttl(key)
      return ttl <= 0
    } catch (error) {
      console.error(`Failed to check TTL for ${key}:`, error)
      return true
    }
  }

  /**
   * Cache market status
   */
  static async setMarketStatus(isOpen: boolean, nextOpen?: Date, nextClose?: Date): Promise<void> {
    try {
      await redis.setex(
        'market:status',
        300, // 5 minutes
        JSON.stringify({ isOpen, nextOpen, nextClose })
      )
    } catch (error) {
      console.error('Failed to cache market status:', error)
    }
  }

  /**
   * Get market status
   */
  static async getMarketStatus(): Promise<{ isOpen: boolean; nextOpen?: Date; nextClose?: Date } | null> {
    try {
      const cached = await redis.get('market:status')
      
      if (cached) {
        const data = JSON.parse(cached as string)
        return {
          isOpen: data.isOpen,
          nextOpen: data.nextOpen ? new Date(data.nextOpen) : undefined,
          nextClose: data.nextClose ? new Date(data.nextClose) : undefined,
        }
      }
      
      return null
    } catch (error) {
      console.error('Failed to get market status:', error)
      return null
    }
  }
}
