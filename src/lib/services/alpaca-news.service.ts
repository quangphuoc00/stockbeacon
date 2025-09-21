/**
 * Alpaca Markets news service
 * Requires ALPACA_API_KEY and ALPACA_API_SECRET in environment
 */

export interface AlpacaNewsItem {
  id: string
  author: string
  created_at: string
  headline: string
  summary: string
  content: string
  images?: Array<{
    size: string
    url: string
  }>
  symbols: string[]
  updated_at: string
  url: string
}

export interface AlpacaNewsResponse {
  news: AlpacaNewsItem[]
  next_page_token?: string
}

export interface TransformedNewsItem {
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

export class AlpacaNewsService {
  private static readonly BASE_URL = 'https://data.alpaca.markets/v1beta1/news'
  
  private static getHeaders() {
    const apiKey = process.env.ALPACA_API_KEY
    const apiSecret = process.env.ALPACA_API_SECRET
    
    if (!apiKey || !apiSecret) {
      throw new Error('Alpaca API credentials not configured')
    }
    
    return {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': apiSecret,
      'Content-Type': 'application/json'
    }
  }

  /**
   * Fetch news for a specific stock symbol
   */
  static async getStockNews(symbol: string, limit: number = 10): Promise<TransformedNewsItem[]> {
    try {
      console.log(`Fetching news for ${symbol} from Alpaca...`)
      
      const params = new URLSearchParams({
        symbols: symbol,
        limit: limit.toString(),
        sort: 'desc',
        include_content: 'false' // We don't need full content for the feed
      })
      
      const response = await fetch(`${this.BASE_URL}?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      })
      
      if (!response.ok) {
        throw new Error(`Alpaca API error: ${response.status}`)
      }
      
      const data: AlpacaNewsResponse = await response.json()
      
      if (!data.news || data.news.length === 0) {
        console.log(`No news found for ${symbol}`)
        return []
      }
      
      // Transform Alpaca news format to our format
      return data.news.map(item => this.transformNewsItem(item))
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error)
      throw error
    }
  }
  
  /**
   * Fetch general market news
   */
  static async getMarketNews(limit: number = 10): Promise<TransformedNewsItem[]> {
    try {
      console.log('Fetching market news from Alpaca...')
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        sort: 'desc',
        include_content: 'false'
      })
      
      const response = await fetch(`${this.BASE_URL}?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      })
      
      if (!response.ok) {
        throw new Error(`Alpaca API error: ${response.status}`)
      }
      
      const data: AlpacaNewsResponse = await response.json()
      
      if (!data.news || data.news.length === 0) {
        return []
      }
      
      return data.news.map(item => this.transformNewsItem(item))
    } catch (error) {
      console.error('Error fetching market news:', error)
      throw error
    }
  }
  
  /**
   * Transform Alpaca news item to our standard format
   */
  private static transformNewsItem(item: AlpacaNewsItem): TransformedNewsItem {
    // Extract thumbnail from images if available
    let thumbnail = undefined
    if (item.images && item.images.length > 0) {
      // Alpaca provides different sizes, let's use the first one
      const image = item.images[0]
      thumbnail = {
        resolutions: [{
          url: image.url,
          width: 200, // Default width as Alpaca doesn't provide dimensions
          height: 150  // Default height
        }]
      }
    }
    
    return {
      uuid: item.id,
      title: item.headline,
      publisher: item.author || 'Unknown',
      link: item.url,
      providerPublishTime: new Date(item.created_at),
      type: 'STORY', // Alpaca doesn't provide article types
      thumbnail,
      relatedTickers: item.symbols,
      summary: item.summary
    }
  }
  
  /**
   * Check if Alpaca API is configured
   */
  static isConfigured(): boolean {
    return !!(process.env.ALPACA_API_KEY && process.env.ALPACA_API_SECRET)
  }
  
  /**
   * Format time ago for display (copied from news.service.ts)
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
