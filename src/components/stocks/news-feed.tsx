'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Clock, Newspaper, AlertCircle, Loader2, TrendingUp, Zap } from 'lucide-react'
import { NewsService, NewsItem } from '@/lib/services/news.service'
import { NewsItemShimmer } from '@/components/ui/shimmer'

interface NewsFeedProps {
  symbol: string
}

// Mock sentiment analysis (in production, this would use AI/NLP)
function analyzeSentiment(title: string, summary?: string): 'positive' | 'negative' | 'neutral' {
  const text = `${title} ${summary || ''}`.toLowerCase()
  
  const positiveKeywords = ['beat', 'exceed', 'surpass', 'growth', 'profit', 'gain', 'up', 'high', 
    'strong', 'boost', 'rise', 'surge', 'improve', 'upgrade', 'success', 'win', 'expand', 'record']
  const negativeKeywords = ['miss', 'loss', 'decline', 'fall', 'drop', 'down', 'weak', 'cut', 
    'reduce', 'concern', 'worry', 'risk', 'threat', 'lawsuit', 'investigation', 'recall', 'delay']
  
  const positiveScore = positiveKeywords.filter(word => text.includes(word)).length
  const negativeScore = negativeKeywords.filter(word => text.includes(word)).length
  
  if (positiveScore > negativeScore) return 'positive'
  if (negativeScore > positiveScore) return 'negative'
  return 'neutral'
}

// Mock impact analysis (in production, this would use more sophisticated logic)
function analyzeImpact(title: string, summary?: string): 'short-term' | 'long-term' {
  const text = `${title} ${summary || ''}`.toLowerCase()
  
  const longTermKeywords = ['strategic', 'partnership', 'acquisition', 'merger', 'expansion', 
    'investment', 'development', 'future', 'years', 'long-term', 'growth strategy', 'innovation']
  const shortTermKeywords = ['quarterly', 'earnings', 'today', 'immediate', 'temporary', 
    'short-term', 'weekly', 'daily', 'current', 'q1', 'q2', 'q3', 'q4']
  
  const longTermScore = longTermKeywords.filter(word => text.includes(word)).length
  const shortTermScore = shortTermKeywords.filter(word => text.includes(word)).length
  
  return longTermScore > shortTermScore ? 'long-term' : 'short-term'
}

export function NewsFeed({ symbol }: NewsFeedProps) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadNews()
  }, [symbol])

  const loadNews = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // First try to load today's news or latest day with news
      const todayResponse = await fetch(`/api/stocks/${symbol}/news?todayOnly=true&limit=50`)
      const todayData = await todayResponse.json()
      
      if (todayData.success && todayData.news) {
        // Convert date strings back to Date objects
        let newsWithDates = todayData.news.map((item: any) => ({
          ...item,
          providerPublishTime: new Date(item.providerPublishTime)
        }))
        
        // If we have less than 10 articles from today, fetch more recent articles
        if (newsWithDates.length < 10) {
          const moreResponse = await fetch(`/api/stocks/${symbol}/news?limit=${Math.max(10, newsWithDates.length + 5)}`)
          const moreData = await moreResponse.json()
          
          if (moreData.success && moreData.news) {
            const additionalNews = moreData.news.map((item: any) => ({
              ...item,
              providerPublishTime: new Date(item.providerPublishTime)
            }))
            
            // Merge and deduplicate by URL
            const allNews = [...newsWithDates]
            const existingUrls = new Set(newsWithDates.map((n: NewsItem) => n.link))
            
            for (const item of additionalNews) {
              if (!existingUrls.has(item.link)) {
                allNews.push(item)
              }
            }
            
            newsWithDates = allNews
          }
        }
        
        setNews(newsWithDates)
      } else {
        setError(todayData.error || 'Failed to load news')
      }
    } catch (err) {
      console.error('Error loading news:', err)
      setError('Failed to load news')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Latest News & Events
          </CardTitle>
          <CardDescription>Loading news for {symbol}...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <NewsItemShimmer key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Latest News & Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={loadNews} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (news.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Latest News & Events
          </CardTitle>
          <CardDescription>Recent news and updates for {symbol}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Newspaper className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No recent news available for {symbol}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="h-5 w-5" />
          Latest News & Events
        </CardTitle>
        <CardDescription>
          {news.length >= 10 ? (
            news.filter(item => {
              const today = new Date()
              const newsDate = new Date(item.providerPublishTime)
              return newsDate.toDateString() === today.toDateString()
            }).length > 0 
              ? `Today's news and recent articles for ${symbol}` 
              : `${news.length} recent articles for ${symbol}`
          ) : (
            `${news.length} recent article${news.length !== 1 ? 's' : ''} for ${symbol}`
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {news.map((item, index) => {
            const sentiment = analyzeSentiment(item.title, item.summary)
            const impact = analyzeImpact(item.title, item.summary)
            
            const borderColor = sentiment === 'positive' ? 'border-green-500' : 
                               sentiment === 'negative' ? 'border-red-500' : 
                               'border-yellow-500'
            
            return (
              <div
                key={item.uuid || index}
                className={`border-l-4 ${borderColor} pl-4 pb-4 last:pb-0`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium line-clamp-2 mb-2">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors"
                      >
                        {item.title}
                      </a>
                    </h4>
                    
                    <div className="flex gap-2 mb-2">
                      <Badge className={`${
                        sentiment === 'positive' ? 'bg-green-500' :
                        sentiment === 'negative' ? 'bg-red-500' :
                        'bg-gray-500'
                      } text-white text-xs`}>
                        {sentiment === 'positive' ? 'Positive' :
                         sentiment === 'negative' ? 'Negative' :
                         'Neutral'}
                      </Badge>
                      {impact === 'long-term' ? (
                        <Badge className="bg-blue-500 text-white text-xs flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Long-term
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-500 text-white text-xs flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Short-term
                        </Badge>
                      )}
                    </div>
                    
                    {item.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                        {item.summary}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-medium">{item.publisher}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {NewsService.formatTimeAgo(item.providerPublishTime)}
                      </span>
                      {item.type && item.type !== 'STORY' && (
                        <Badge variant="secondary" className="text-xs">
                          {item.type}
                        </Badge>
                      )}
                    </div>
                    
                    {item.relatedTickers && item.relatedTickers.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        {item.relatedTickers.slice(0, 3).map(ticker => (
                          <Badge key={ticker} variant="outline" className="text-xs">
                            {ticker}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {item.thumbnail?.resolutions?.[0] && (
                    <img
                      src={item.thumbnail.resolutions[0].url}
                      alt=""
                      className="w-20 h-20 object-cover rounded flex-shrink-0"
                    />
                  )}
                  
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                  >
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
