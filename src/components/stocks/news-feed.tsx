'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Clock, Newspaper, AlertCircle, Loader2 } from 'lucide-react'
import { NewsService, NewsItem } from '@/lib/services/news.service'

interface NewsFeedProps {
  symbol: string
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
      
      const response = await fetch(`/api/stocks/${symbol}/news`)
      const data = await response.json()
      
      if (data.success && data.news) {
        // Convert date strings back to Date objects
        const newsWithDates = data.news.map((item: any) => ({
          ...item,
          providerPublishTime: new Date(item.providerPublishTime)
        }))
        setNews(newsWithDates)
      } else {
        setError(data.error || 'Failed to load news')
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
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
          {news.length} recent article{news.length !== 1 ? 's' : ''} for {symbol}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {news.map((item, index) => (
            <div
              key={item.uuid || index}
              className="border-b last:border-0 pb-4 last:pb-0"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium line-clamp-2 mb-1">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      {item.title}
                    </a>
                  </h4>
                  
                  {item.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
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
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
