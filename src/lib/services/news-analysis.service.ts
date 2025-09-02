import { NewsItem } from './news.service'
import { RedisCacheService } from './redis-cache.service'
import { Redis } from '@upstash/redis'
import crypto from 'crypto'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export interface NewsAnalysis {
  summary: string
  sentimentCounts: {
    positive: number
    negative: number
    neutral: number
  }
  impactCounts: {
    shortTerm: number
    longTerm: number
  }
  newsVelocity: 'high' | 'medium' | 'low'
  totalArticles: number
  keyHighlights: string[]
  lastUpdated: Date
  cacheKey: string
}

export class NewsAnalysisService {
  /**
   * Generate a cache key from news items
   */
  private static generateCacheKey(symbol: string, news: NewsItem[]): string {
    const newsIds = news.map(item => item.uuid || item.link).sort().join(',')
    const hash = crypto.createHash('md5').update(`${symbol}:${newsIds}`).digest('hex')
    return hash
  }

  /**
   * Analyze sentiment of a news item
   */
  private static analyzeSentiment(title: string, summary?: string): 'positive' | 'negative' | 'neutral' {
    const text = `${title} ${summary || ''}`.toLowerCase()
    
    const positiveKeywords = ['beat', 'exceed', 'surpass', 'growth', 'profit', 'gain', 'up', 'high', 
      'strong', 'boost', 'rise', 'surge', 'improve', 'upgrade', 'success', 'win', 'expand', 'record',
      'breakthrough', 'innovative', 'leading', 'outperform']
    const negativeKeywords = ['miss', 'loss', 'decline', 'fall', 'drop', 'down', 'weak', 'cut', 
      'reduce', 'concern', 'worry', 'risk', 'threat', 'lawsuit', 'investigation', 'recall', 'delay',
      'disappointing', 'below', 'struggle', 'challenge']
    
    const positiveScore = positiveKeywords.filter(word => text.includes(word)).length
    const negativeScore = negativeKeywords.filter(word => text.includes(word)).length
    
    if (positiveScore > negativeScore) return 'positive'
    if (negativeScore > positiveScore) return 'negative'
    return 'neutral'
  }

  /**
   * Analyze impact timeline of a news item
   */
  private static analyzeImpact(title: string, summary?: string): 'short-term' | 'long-term' {
    const text = `${title} ${summary || ''}`.toLowerCase()
    
    const longTermKeywords = ['strategic', 'partnership', 'acquisition', 'merger', 'expansion', 
      'investment', 'development', 'future', 'years', 'long-term', 'growth strategy', 'innovation',
      'transformation', 'roadmap', 'vision']
    const shortTermKeywords = ['quarterly', 'earnings', 'today', 'immediate', 'temporary', 
      'short-term', 'weekly', 'daily', 'current', 'q1', 'q2', 'q3', 'q4', 'tomorrow', 'yesterday']
    
    const longTermScore = longTermKeywords.filter(word => text.includes(word)).length
    const shortTermScore = shortTermKeywords.filter(word => text.includes(word)).length
    
    return longTermScore > shortTermScore ? 'long-term' : 'short-term'
  }

  /**
   * Extract key highlights from news
   */
  private static extractKeyHighlights(news: NewsItem[]): string[] {
    const highlights: string[] = []
    
    // Find earnings-related news
    const earningsNews = news.find(item => 
      item.title.toLowerCase().includes('earnings') || 
      item.title.toLowerCase().includes('revenue')
    )
    if (earningsNews) {
      highlights.push('Recent earnings report')
    }
    
    // Find partnership/acquisition news
    const dealNews = news.find(item => 
      item.title.toLowerCase().includes('partnership') || 
      item.title.toLowerCase().includes('acquisition') ||
      item.title.toLowerCase().includes('merger')
    )
    if (dealNews) {
      highlights.push('Strategic partnerships or M&A activity')
    }
    
    // Find product/innovation news
    const productNews = news.find(item => 
      item.title.toLowerCase().includes('product') || 
      item.title.toLowerCase().includes('launch') ||
      item.title.toLowerCase().includes('innovation')
    )
    if (productNews) {
      highlights.push('New product launches or innovations')
    }
    
    // Find analyst coverage
    const analystNews = news.find(item => 
      item.title.toLowerCase().includes('upgrade') || 
      item.title.toLowerCase().includes('downgrade') ||
      item.title.toLowerCase().includes('analyst')
    )
    if (analystNews) {
      highlights.push('Analyst rating changes')
    }
    
    return highlights.slice(0, 3) // Return top 3 highlights
  }

  /**
   * Determine news velocity based on article count and timing
   */
  private static calculateNewsVelocity(news: NewsItem[]): 'high' | 'medium' | 'low' {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    const recentArticles = news.filter(item => 
      new Date(item.providerPublishTime) > oneDayAgo
    ).length
    
    if (recentArticles >= 5) return 'high'
    if (recentArticles >= 2) return 'medium'
    return 'low'
  }

  /**
   * Generate summary text based on analysis
   */
  private static generateSummary(
    symbol: string, 
    sentimentCounts: NewsAnalysis['sentimentCounts'],
    highlights: string[]
  ): string {
    let sentiment = 'mixed'
    if (sentimentCounts.positive > sentimentCounts.negative + sentimentCounts.neutral) {
      sentiment = 'predominantly positive'
    } else if (sentimentCounts.negative > sentimentCounts.positive + sentimentCounts.neutral) {
      sentiment = 'predominantly negative'
    } else if (sentimentCounts.neutral > sentimentCounts.positive + sentimentCounts.negative) {
      sentiment = 'mostly neutral'
    }
    
    const majorDevelopments = sentimentCounts.positive + sentimentCounts.negative + sentimentCounts.neutral
    const highlightText = highlights.length > 0 
      ? `Key highlights include ${highlights.join(', ').toLowerCase()}.`
      : ''
    
    return `Recent news sentiment for ${symbol} is ${sentiment} with ${majorDevelopments} major developments in the past week. ${highlightText}`
  }

  // Cache key prefix and TTL
  private static readonly NEWS_ANALYSIS_PREFIX = 'news:analysis:'
  private static readonly NEWS_ANALYSIS_TTL = 3600 // 1 hour

  /**
   * Analyze news with caching
   */
  static async analyzeNews(symbol: string, news: NewsItem[]): Promise<NewsAnalysis> {
    // Generate cache key
    const cacheKey = this.generateCacheKey(symbol, news)
    const redisKey = `${this.NEWS_ANALYSIS_PREFIX}${cacheKey}`
    
    // Check Redis cache
    try {
      const cached = await redis.get(redisKey)
      if (cached) {
        console.log(`Returning cached analysis for ${symbol}`)
        // Handle both string and object returns from Redis
        if (typeof cached === 'string') {
          return JSON.parse(cached) as NewsAnalysis
        }
        return cached as NewsAnalysis
      }
    } catch (error) {
      console.error(`Failed to get cached analysis for ${symbol}:`, error)
    }
    
    console.log(`Generating new analysis for ${symbol}`)
    
    // Analyze each news item
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 }
    const impactCounts = { shortTerm: 0, longTerm: 0 }
    
    news.forEach(item => {
      const sentiment = this.analyzeSentiment(item.title, item.summary)
      const impact = this.analyzeImpact(item.title, item.summary)
      
      if (sentiment === 'positive') sentimentCounts.positive++
      else if (sentiment === 'negative') sentimentCounts.negative++
      else sentimentCounts.neutral++
      
      if (impact === 'short-term') impactCounts.shortTerm++
      else impactCounts.longTerm++
    })
    
    // Extract key highlights
    const keyHighlights = this.extractKeyHighlights(news)
    
    // Calculate news velocity
    const newsVelocity = this.calculateNewsVelocity(news)
    
    // Generate summary
    const summary = this.generateSummary(symbol, sentimentCounts, keyHighlights)
    
    // Create analysis object
    const analysis: NewsAnalysis = {
      summary,
      sentimentCounts,
      impactCounts,
      newsVelocity,
      totalArticles: news.length,
      keyHighlights,
      lastUpdated: new Date(),
      cacheKey
    }
    
    // Cache the analysis in Redis
    try {
      await redis.setex(redisKey, this.NEWS_ANALYSIS_TTL, JSON.stringify(analysis))
      console.log(`Cached analysis for ${symbol} with key ${redisKey}`)
    } catch (error) {
      console.error(`Failed to cache analysis for ${symbol}:`, error)
    }
    
    return analysis
  }

  /**
   * Clear cache for a specific symbol or all news analysis cache
   */
  static async clearCache(symbol?: string): Promise<void> {
    try {
      if (symbol) {
        // Clear entries for specific symbol by scanning keys
        const pattern = `${this.NEWS_ANALYSIS_PREFIX}*`
        const keys = await redis.keys(pattern)
        
        for (const key of keys) {
          try {
            const cached = await redis.get(key as string)
            if (cached) {
              const analysis = typeof cached === 'string' ? JSON.parse(cached) : cached
              if (analysis.summary && analysis.summary.includes(symbol)) {
                await redis.del(key as string)
                console.log(`Cleared news analysis cache for ${symbol}: ${key}`)
              }
            }
          } catch (error) {
            console.error(`Failed to check/delete key ${key}:`, error)
          }
        }
      } else {
        // Clear all news analysis cache
        const pattern = `${this.NEWS_ANALYSIS_PREFIX}*`
        const keys = await redis.keys(pattern)
        
        for (const key of keys) {
          await redis.del(key as string)
        }
        console.log(`Cleared all news analysis cache (${keys.length} entries)`)
      }
    } catch (error) {
      console.error('Failed to clear news analysis cache:', error)
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    size: number
    entries: Array<{
      key: string
      symbol: string
      lastUpdated: Date
      articles: number
    }>
  }> {
    try {
      const pattern = `${this.NEWS_ANALYSIS_PREFIX}*`
      const keys = await redis.keys(pattern)
      const entries = []
      
      for (const key of keys) {
        try {
          const cached = await redis.get(key as string)
          if (cached) {
            const analysis = typeof cached === 'string' ? JSON.parse(cached) : cached
            entries.push({
              key: key as string,
              symbol: analysis.summary?.match(/for (\w+) is/)?.[1] || 'unknown',
              lastUpdated: new Date(analysis.lastUpdated),
              articles: analysis.totalArticles || 0
            })
          }
        } catch (error) {
          console.error(`Failed to get stats for key ${key}:`, error)
        }
      }
      
      return {
        size: keys.length,
        entries
      }
    } catch (error) {
      console.error('Failed to get cache statistics:', error)
      return { size: 0, entries: [] }
    }
  }
}
