import { Redis } from '@upstash/redis'
import { StockQuote, StockFinancials, StockScore, StockHistorical } from '@/types/stock'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export class RedisBatchService {
  /**
   * Get multiple cache entries in a single call
   */
  static async getBatchStockData(symbol: string) {
    const keys = [
      `quote:${symbol}`,
      `financials:${symbol}`,
      `score:${symbol}`,
      `historical:${symbol}:3mo`
    ]
    
    try {
      // Use MGET for batch retrieval
      const results = await redis.mget<(string | null)[]>(...keys)
      
      return {
        quote: results[0] ? (typeof results[0] === 'string' ? JSON.parse(results[0]) : results[0]) as StockQuote : null,
        financials: results[1] ? (typeof results[1] === 'string' ? JSON.parse(results[1]) : results[1]) as StockFinancials : null,
        score: results[2] ? (typeof results[2] === 'string' ? JSON.parse(results[2]) : results[2]) as StockScore : null,
        historical: results[3] ? (typeof results[3] === 'string' ? JSON.parse(results[3]) : results[3]) as StockHistorical[] : null,
      }
    } catch (error) {
      console.error('Redis batch read error:', error)
      return {
        quote: null,
        financials: null,
        score: null,
        historical: null,
      }
    }
  }
  
  /**
   * Set multiple cache entries with pipeline
   */
  static async setBatchStockData(
    symbol: string,
    data: {
      quote?: StockQuote,
      financials?: StockFinancials,
      score?: StockScore,
      historical?: StockHistorical[]
    },
    ttls: {
      quote?: number,
      financials?: number,
      score?: number,
      historical?: number
    } = {}
  ) {
    const pipeline = redis.pipeline()
    
    if (data.quote) {
      pipeline.setex(
        `quote:${symbol}`,
        ttls.quote || 300,
        JSON.stringify(data.quote)
      )
    }
    
    if (data.financials) {
      pipeline.setex(
        `financials:${symbol}`,
        ttls.financials || 3600,
        JSON.stringify(data.financials)
      )
    }
    
    if (data.score) {
      pipeline.setex(
        `score:${symbol}`,
        ttls.score || 3600,
        JSON.stringify(data.score)
      )
    }
    
    if (data.historical) {
      pipeline.setex(
        `historical:${symbol}:3mo`,
        ttls.historical || 3600,
        JSON.stringify(data.historical)
      )
    }
    
    try {
      await pipeline.exec()
    } catch (error) {
      console.error('Redis batch write error:', error)
    }
  }
}
