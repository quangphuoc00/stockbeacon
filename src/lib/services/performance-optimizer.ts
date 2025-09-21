/**
 * Performance optimization utilities for StockBeacon
 */

import { getRedisInstance } from '@/lib/utils/redis'

export class PerformanceOptimizer {
  /**
   * Batch pre-cache financial data for multiple symbols
   * Used during off-peak hours to warm up cache
   */
  static async preCacheFinancialData(symbols: string[]) {
    const redis = getRedisInstance()
    if (!redis) return
    
    console.log(`[Cache Warmer] Pre-caching data for ${symbols.length} symbols`)
    
    for (const symbol of symbols) {
      try {
        // Check if already cached
        const cacheKey = `financial_statements:${symbol}`
        const cached = await redis.get(cacheKey)
        
        if (!cached) {
          console.log(`[Cache Warmer] Fetching ${symbol}...`)
          
          // Trigger the API to cache the data
          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/stocks/${symbol}/financial-statements`)
          
          if (response.ok) {
            console.log(`[Cache Warmer] Cached ${symbol} successfully`)
          } else {
            console.error(`[Cache Warmer] Failed to cache ${symbol}: ${response.status}`)
          }
          
          // Rate limit to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (error) {
        console.error(`[Cache Warmer] Error caching ${symbol}:`, error)
      }
    }
    
    console.log('[Cache Warmer] Pre-caching complete')
  }
  
  /**
   * Get popular stocks to pre-cache
   * These are commonly viewed stocks that benefit from pre-caching
   */
  static getPopularStocks(): string[] {
    return [
      // Mega caps
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B',
      
      // Popular tech
      'AMD', 'INTC', 'NFLX', 'CRM', 'ORCL', 'ADBE', 'PYPL', 'SQ',
      
      // Financial
      'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC',
      
      // Healthcare
      'JNJ', 'UNH', 'PFE', 'ABBV', 'TMO', 'ABT', 'CVS', 'LLY',
      
      // Consumer
      'WMT', 'HD', 'PG', 'KO', 'PEP', 'MCD', 'NKE', 'SBUX',
      
      // Industrial
      'BA', 'CAT', 'GE', 'MMM', 'HON', 'UPS', 'RTX', 'LMT'
    ]
  }
  
  /**
   * Optimize Redis memory usage by cleaning old cache entries
   */
  static async cleanupOldCache(daysOld: number = 7) {
    const redis = getRedisInstance()
    if (!redis) return
    
    try {
      // Get all keys with pattern
      const keys = await redis.keys('financial_*')
      
      console.log(`[Cache Cleanup] Found ${keys.length} financial cache entries`)
      
      let deleted = 0
      for (const key of keys) {
        try {
          // Check TTL
          const ttl = await redis.ttl(key)
          
          // If TTL is -1 (no expiry) or very long, delete old entries
          if (ttl === -1 || ttl > daysOld * 24 * 60 * 60) {
            await redis.del(key)
            deleted++
          }
        } catch (error) {
          console.error(`[Cache Cleanup] Error checking key ${key}:`, error)
        }
      }
      
      console.log(`[Cache Cleanup] Deleted ${deleted} old cache entries`)
    } catch (error) {
      console.error('[Cache Cleanup] Error during cleanup:', error)
    }
  }
  
  /**
   * Get cache statistics
   */
  static async getCacheStats() {
    const redis = getRedisInstance()
    if (!redis) return null
    
    try {
      const info = await redis.info('memory')
      const dbSize = await redis.dbsize()
      
      const stats = {
        totalKeys: dbSize,
        memoryUsage: info,
        financialKeys: 0,
        analysisKeys: 0
      }
      
      // Count different key types
      const keys = await redis.keys('*')
      for (const key of keys) {
        if (key.startsWith('financial_statements:')) stats.financialKeys++
        if (key.startsWith('financial_analysis:')) stats.analysisKeys++
      }
      
      return stats
    } catch (error) {
      console.error('[Cache Stats] Error getting stats:', error)
      return null
    }
  }
}
