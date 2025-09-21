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
  // Enhanced AI features
  executiveSummary?: string
  smartAlerts?: Array<{
    type: 'risk' | 'opportunity' | 'unusual' | 'catalyst'
    title: string
    description: string
    urgency: 'high' | 'medium' | 'low'
    icon: string
  }>
  aiRecommendation?: {
    action: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'WATCH'
    reasoning: string
    confidence: number
  }
  mostImportantNews?: {
    title: string
    reason: string
    expectedImpact: string
    link?: string
  }
  relevantNews?: Array<{
    title: string
    link: string
    providerPublishTime: Date
    category: string
  }>
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
    if (news.length === 0) return 'low'
    
    // Check if all news is from the same day
    const dates = news.map(item => {
      const d = new Date(item.providerPublishTime)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })
    const uniqueDates = new Set(dates)
    
    if (uniqueDates.size === 1) {
      // All news from same day - base velocity on count
      if (news.length >= 8) return 'high'
      if (news.length >= 4) return 'medium'
      return 'low'
    } else {
      // Multiple days - use original logic
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      
      const recentArticles = news.filter(item => 
        new Date(item.providerPublishTime) > oneDayAgo
      ).length
      
      if (recentArticles >= 5) return 'high'
      if (recentArticles >= 2) return 'medium'
      return 'low'
    }
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

  /**
   * Generate executive summary (2-3 sentences) and collect relevant news
   */
  private static generateExecutiveSummary(
    symbol: string,
    news: NewsItem[],
    sentimentCounts: NewsAnalysis['sentimentCounts']
  ): { summary: string; relevantNews: NewsAnalysis['relevantNews'] } {
    if (news.length === 0) {
      return {
        summary: `No recent news for ${symbol}. Monitor for upcoming earnings or product announcements.`,
        relevantNews: []
      }
    }

    // Map common symbols to company names for better matching
    const companyMap: { [key: string]: string[] } = {
      'AAPL': ['apple', 'iphone', 'ipad', 'mac', 'tim cook', 'app store', 'ios'],
      'MSFT': ['microsoft', 'windows', 'azure', 'xbox', 'satya nadella', 'office', 'teams'],
      'GOOGL': ['google', 'alphabet', 'android', 'youtube', 'search', 'chrome', 'pixel'],
      'GOOG': ['google', 'alphabet', 'android', 'youtube', 'search', 'chrome', 'pixel'],
      'AMZN': ['amazon', 'aws', 'prime', 'alexa', 'bezos', 'jassy', 'e-commerce'],
      'META': ['meta', 'facebook', 'instagram', 'whatsapp', 'zuckerberg', 'oculus', 'reality labs'],
      'TSLA': ['tesla', 'model', 'elon musk', 'electric vehicle', 'ev', 'autopilot', 'battery'],
      'NVDA': ['nvidia', 'gpu', 'geforce', 'jensen huang', 'ai chip', 'cuda', 'datacenter']
    }

    const companyTerms = companyMap[symbol] || [symbol.toLowerCase()]

    // Categorize news by relevance and type
    const categories = {
      earnings: [] as NewsItem[],
      product: [] as NewsItem[],
      legal: [] as NewsItem[],
      analyst: [] as NewsItem[],
      strategic: [] as NewsItem[],
      market: [] as NewsItem[],
      other: [] as NewsItem[]
    }

    // Categorize each news item
    news.forEach(item => {
      const titleLower = item.title.toLowerCase()
      const isRelevant = companyTerms.some(term => titleLower.includes(term)) || 
                        (item.relatedTickers && item.relatedTickers.includes(symbol))

      if (!isRelevant) {
        categories.other.push(item)
        return
      }

      if (titleLower.match(/earnings|revenue|profit|eps|guidance|quarter/)) {
        categories.earnings.push(item)
      } else if (titleLower.match(/product|launch|release|announce|unveil|introduce/)) {
        categories.product.push(item)
      } else if (titleLower.match(/lawsuit|legal|court|investigation|regulatory|fine/)) {
        categories.legal.push(item)
      } else if (titleLower.match(/analyst|upgrade|downgrade|price target|rating/)) {
        categories.analyst.push(item)
      } else if (titleLower.match(/acquisition|merger|partnership|deal|buyout|invest/)) {
        categories.strategic.push(item)
      } else if (titleLower.match(/market|stock|shares|trading|investor/)) {
        categories.market.push(item)
      } else {
        categories.other.push(item)
      }
    })

    // Build relevant news array
    const relevantNewsItems: NewsAnalysis['relevantNews'] = []
    
    // Helper function to add categorized news to relevant list
    const addToRelevantNews = (items: NewsItem[], category: string) => {
      items.forEach(item => {
        relevantNewsItems.push({
          title: item.title,
          link: item.link,
          providerPublishTime: item.providerPublishTime,
          category
        })
      })
    }
    
    // Add all categorized news (except 'other')
    addToRelevantNews(categories.earnings, 'Earnings')
    addToRelevantNews(categories.product, 'Product')
    addToRelevantNews(categories.legal, 'Legal')
    addToRelevantNews(categories.analyst, 'Analyst')
    addToRelevantNews(categories.strategic, 'Strategic')
    addToRelevantNews(categories.market, 'Market')
    
    // Sort by date (newest first)
    relevantNewsItems.sort((a, b) => 
      new Date(b.providerPublishTime).getTime() - new Date(a.providerPublishTime).getTime()
    )

    // Build summary based on most important categories
    const parts: string[] = []
    
    // Count relevant vs irrelevant news
    const relevantCount = relevantNewsItems.length
    const timeDesc = relevantCount > 0 
      ? `${relevantCount} relevant news item${relevantCount !== 1 ? 's' : ''} (${news.length} total)`
      : `${news.length} news items with limited direct relevance`

    parts.push(`${symbol}: ${timeDesc}.`)

    // Add key insights based on categories
    if (categories.earnings.length > 0) {
      parts.push(`Earnings focus with ${categories.earnings.length} report${categories.earnings.length > 1 ? 's' : ''}.`)
    }
    if (categories.legal.length > 0) {
      parts.push(`Legal concerns require attention (${categories.legal.length} item${categories.legal.length > 1 ? 's' : ''}).`)
    }
    if (categories.product.length > 0) {
      parts.push(`Product developments signal innovation momentum.`)
    }
    if (categories.analyst.length > 0) {
      const sentiment = sentimentCounts.positive > sentimentCounts.negative ? 'positive' : 
                       sentimentCounts.negative > sentimentCounts.positive ? 'negative' : 'mixed'
      parts.push(`Analyst sentiment ${sentiment}.`)
    }

    // If mostly irrelevant news, be honest about it
    if (categories.other.length > news.length * 0.7) {
      return {
        summary: `${symbol}: Limited company-specific news in ${news.length} recent articles. Most coverage is tangential or market-wide. Check back during earnings season for more relevant updates.`,
        relevantNews: relevantNewsItems
      }
    }

    // Add actionable insight
    if (sentimentCounts.negative > sentimentCounts.positive && categories.legal.length > 0) {
      parts.push(`Monitor legal developments closely.`)
    } else if (categories.earnings.length > 0 || categories.product.length > 0) {
      parts.push(`Watch for market reaction to company developments.`)
    } else if (relevantCount < 3) {
      parts.push(`Low news volume suggests waiting for catalyst.`)
    }

    return {
      summary: parts.slice(0, 3).join(' '),
      relevantNews: relevantNewsItems
    }
  }

  /**
   * Generate smart alerts based on news patterns
   */
  private static generateSmartAlerts(
    symbol: string,
    news: NewsItem[],
    sentimentCounts: NewsAnalysis['sentimentCounts'],
    newsVelocity: 'high' | 'medium' | 'low'
  ): NewsAnalysis['smartAlerts'] {
    const alerts: NewsAnalysis['smartAlerts'] = []

    // High news velocity alert
    if (newsVelocity === 'high') {
      alerts.push({
        type: 'unusual',
        title: 'Unusual News Activity',
        description: `High news volume detected (${news.length} recent articles). Something significant may be developing.`,
        urgency: 'high',
        icon: '⚡'
      })
    }

    // Negative news clustering
    if (sentimentCounts.negative >= 3) {
      alerts.push({
        type: 'risk',
        title: 'Multiple Risk Factors',
        description: `${sentimentCounts.negative} negative news items detected. Consider reviewing your position.`,
        urgency: 'high',
        icon: '⚠️'
      })
    }

    // Positive catalyst detection
    const catalystNews = news.find(item => 
      item.title.toLowerCase().includes('beat') ||
      item.title.toLowerCase().includes('upgrade') ||
      item.title.toLowerCase().includes('breakthrough')
    )
    if (catalystNews) {
      alerts.push({
        type: 'catalyst',
        title: 'Positive Catalyst Detected',
        description: catalystNews.title.substring(0, 80) + '...',
        urgency: 'medium',
        icon: '🚀'
      })
    }

    // Legal/regulatory alert
    const legalNews = news.find(item => 
      item.title.toLowerCase().includes('lawsuit') ||
      item.title.toLowerCase().includes('investigation') ||
      item.title.toLowerCase().includes('regulatory')
    )
    if (legalNews) {
      alerts.push({
        type: 'risk',
        title: 'Legal/Regulatory Concern',
        description: 'New legal or regulatory development requires attention.',
        urgency: 'high',
        icon: '⚖️'
      })
    }

    // Opportunity detection
    if (sentimentCounts.positive >= 3 && news.some(item => 
      item.title.toLowerCase().includes('partnership') ||
      item.title.toLowerCase().includes('contract') ||
      item.title.toLowerCase().includes('expansion')
    )) {
      alerts.push({
        type: 'opportunity',
        title: 'Growth Opportunity',
        description: 'Multiple positive developments suggest potential upside.',
        urgency: 'medium',
        icon: '📈'
      })
    }

    return alerts.slice(0, 3) // Return top 3 most relevant alerts
  }

  /**
   * Generate AI recommendation based on news
   */
  private static generateAIRecommendation(
    sentimentCounts: NewsAnalysis['sentimentCounts'],
    impactCounts: NewsAnalysis['impactCounts'],
    newsVelocity: 'high' | 'medium' | 'low'
  ): NewsAnalysis['aiRecommendation'] {
    const sentimentScore = (sentimentCounts.positive - sentimentCounts.negative) / 
                          (sentimentCounts.positive + sentimentCounts.negative + sentimentCounts.neutral || 1)
    
    let action: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'WATCH'
    let reasoning: string
    let confidence: number

    if (sentimentScore > 0.5 && newsVelocity === 'high') {
      action = 'STRONG_BUY'
      reasoning = 'Strong positive sentiment with high news activity suggests building momentum.'
      confidence = 0.85
    } else if (sentimentScore > 0.3) {
      action = 'BUY'
      reasoning = 'Positive sentiment outweighs concerns, indicating favorable conditions.'
      confidence = 0.75
    } else if (sentimentScore < -0.5) {
      action = 'SELL'
      reasoning = 'Significant negative sentiment suggests elevated risks.'
      confidence = 0.8
    } else if (newsVelocity === 'high' && Math.abs(sentimentScore) < 0.2) {
      action = 'WATCH'
      reasoning = 'High news activity with mixed sentiment - wait for clarity.'
      confidence = 0.7
    } else {
      action = 'HOLD'
      reasoning = 'Balanced sentiment suggests maintaining current position.'
      confidence = 0.65
    }

    // Adjust confidence based on data quality
    if (sentimentCounts.positive + sentimentCounts.negative + sentimentCounts.neutral < 3) {
      confidence *= 0.7 // Lower confidence with limited data
    }

    return { action, reasoning, confidence }
  }

  /**
   * Identify most important news item
   */
  private static identifyMostImportantNews(
    symbol: string,
    news: NewsItem[]
  ): NewsAnalysis['mostImportantNews'] | undefined {
    if (news.length === 0) return undefined
    
    // Map symbols to company names for relevance checking
    const companyMap: { [key: string]: string[] } = {
      'AAPL': ['apple', 'iphone', 'ipad', 'mac', 'tim cook', 'app store', 'ios'],
      'MSFT': ['microsoft', 'windows', 'azure', 'xbox', 'satya nadella', 'office'],
      'GOOGL': ['google', 'alphabet', 'android', 'youtube', 'search', 'chrome'],
      'GOOG': ['google', 'alphabet', 'android', 'youtube', 'search', 'chrome'],
      'AMZN': ['amazon', 'aws', 'prime', 'alexa', 'bezos', 'jassy'],
      'META': ['meta', 'facebook', 'instagram', 'whatsapp', 'zuckerberg'],
      'TSLA': ['tesla', 'model', 'elon musk', 'electric vehicle', 'ev'],
      'NVDA': ['nvidia', 'gpu', 'geforce', 'jensen huang', 'ai chip']
    }

    const companyTerms = companyMap[symbol] || [symbol.toLowerCase()]

    // Priority order for news types
    const priorities = [
      { keywords: ['earnings', 'revenue', 'beat', 'miss', 'eps', 'quarterly'], impact: 'Can move stock 5-10%', category: 'Earnings Report' },
      { keywords: ['lawsuit', 'investigation', 'regulatory', 'court', 'legal'], impact: 'Potential long-term liability', category: 'Legal Risk' },
      { keywords: ['merger', 'acquisition', 'buyout', 'acquire'], impact: 'Fundamental value change', category: 'M&A Activity' },
      { keywords: ['product', 'launch', 'announce', 'unveil', 'release'], impact: 'Growth catalyst', category: 'Product News' },
      { keywords: ['partnership', 'contract', 'deal', 'agreement'], impact: 'Revenue opportunity', category: 'Strategic Deal' },
      { keywords: ['upgrade', 'downgrade', 'analyst', 'price target'], impact: 'Institutional sentiment', category: 'Analyst Action' }
    ]

    // First, try to find relevant news that matches priority keywords
    for (const priority of priorities) {
      const importantNews = news.find(item => {
        const titleLower = item.title.toLowerCase()
        const isRelevant = companyTerms.some(term => titleLower.includes(term)) || 
                          (item.relatedTickers && item.relatedTickers.includes(symbol))
        const hasKeyword = priority.keywords.some(keyword => titleLower.includes(keyword))
        
        return isRelevant && hasKeyword
      })

      if (importantNews) {
        return {
          title: importantNews.title,
          reason: priority.category,
          expectedImpact: priority.impact,
          link: importantNews.link
        }
      }
    }

    // If no priority matches, find the most relevant news
    const relevantNews = news.find(item => {
      const titleLower = item.title.toLowerCase()
      return companyTerms.some(term => titleLower.includes(term)) || 
             (item.relatedTickers && item.relatedTickers.includes(symbol))
    })

    if (relevantNews) {
      return {
        title: relevantNews.title,
        reason: 'Company-specific news',
        expectedImpact: 'Monitor for developments',
        link: relevantNews.link
      }
    }

    // If no relevant news found, be transparent about it
    return {
      title: news[0].title,
      reason: 'Limited direct relevance',
      expectedImpact: 'Tangential market news',
      link: news[0].link
    }
  }

  // Cache key prefix and TTL
  private static readonly NEWS_ANALYSIS_PREFIX = 'news:analysis:'
  private static readonly NEWS_ANALYSIS_TTL = 3600 // 1 hour

  /**
   * Analyze news with caching
   */
  static async analyzeNews(symbol: string, news: NewsItem[], bypassCache: boolean = false): Promise<NewsAnalysis> {
    // Generate cache key
    const cacheKey = this.generateCacheKey(symbol, news)
    const redisKey = `${this.NEWS_ANALYSIS_PREFIX}${cacheKey}`
    
    // Check Redis cache unless bypassed
    if (!bypassCache) {
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
    } else {
      console.log(`Bypassing cache for ${symbol} news analysis`)
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
    
    // Generate enhanced AI features
    const { summary: executiveSummary, relevantNews } = this.generateExecutiveSummary(symbol, news, sentimentCounts)
    const smartAlerts = this.generateSmartAlerts(symbol, news, sentimentCounts, newsVelocity)
    const aiRecommendation = this.generateAIRecommendation(sentimentCounts, impactCounts, newsVelocity)
    const mostImportantNews = this.identifyMostImportantNews(symbol, news)
    
    // Create analysis object
    const analysis: NewsAnalysis = {
      summary,
      sentimentCounts,
      impactCounts,
      newsVelocity,
      totalArticles: news.length,
      keyHighlights,
      lastUpdated: new Date(),
      cacheKey,
      executiveSummary,
      smartAlerts,
      aiRecommendation,
      mostImportantNews,
      relevantNews
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
