import yahooFinance from 'yahoo-finance2'

export interface NewsItem {
  uuid: string
  title: string
  publisher: string
  link: string
  providerPublishTime: Date
  type: string
  thumbnail?: {
    resolutions: Array<{
      url: string
      width: number
      height: number
    }>
  }
  relatedTickers?: string[]
  summary?: string
}

export class NewsService {
  /**
   * Fetch news for a specific stock symbol
   */
  static async getStockNews(symbol: string, limit: number = 10): Promise<NewsItem[]> {
    try {
      console.log(`Fetching news for ${symbol}...`)
      
      // Use Yahoo Finance to get news
      const news = await yahooFinance.search(symbol, {
        quotesCount: 0,
        newsCount: limit,
        enableNavLinks: false,
        enableEnhancedTrivialQuery: true,
      })
      
      if (!news.news || news.news.length === 0) {
        console.log(`No news found for ${symbol}`)
        return []
      }
      
      // Transform the news data
      return news.news.map(item => ({
        uuid: item.uuid || Math.random().toString(36),
        title: item.title || '',
        publisher: item.publisher || 'Unknown',
        link: item.link || '',
        providerPublishTime: new Date(item.providerPublishTime || Date.now()),
        type: item.type || 'STORY',
        thumbnail: item.thumbnail,
        relatedTickers: item.relatedTickers,
        summary: typeof item.summary === 'string' ? item.summary : undefined,
      }))
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error)
      
      // Try alternative method using quoteSummary
      try {
        const quoteSummary = await yahooFinance.quoteSummary(symbol, {
          modules: ['newsData']
        })
        
        // Note: quoteSummary doesn't actually have news, so this is a fallback
        // We'll return empty array if the search method fails
        return []
      } catch (fallbackError) {
        console.error('Fallback news fetch also failed:', fallbackError)
        return []
      }
    }
  }
  
  /**
   * Fetch general market news
   */
  static async getMarketNews(limit: number = 10): Promise<NewsItem[]> {
    try {
      // Search for general market news using SPY (S&P 500 ETF) as a proxy
      const news = await yahooFinance.search('market news', {
        quotesCount: 0,
        newsCount: limit,
        enableNavLinks: false,
      })
      
      if (!news.news || news.news.length === 0) {
        // Fallback to SPY news
        return this.getStockNews('SPY', limit)
      }
      
      return news.news.map(item => ({
        uuid: item.uuid || Math.random().toString(36),
        title: item.title || '',
        publisher: item.publisher || 'Unknown',
        link: item.link || '',
        providerPublishTime: new Date(item.providerPublishTime || Date.now()),
        type: item.type || 'STORY',
        thumbnail: item.thumbnail,
        relatedTickers: item.relatedTickers,
        summary: typeof item.summary === 'string' ? item.summary : undefined,
      }))
    } catch (error) {
      console.error('Error fetching market news:', error)
      return []
    }
  }
  
  /**
   * Format time ago for display
   */
  static formatTimeAgo(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString()
  }
}
