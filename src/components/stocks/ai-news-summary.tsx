'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Brain, 
  AlertCircle, 
  TrendingUp, 
  Zap, 
  Shield, 
  Target,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Info,
  ExternalLink,
  Newspaper
} from 'lucide-react'
import { NewsAnalysis } from '@/lib/services/news-analysis.service'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface AINewsSummaryProps {
  symbol: string
  analysis: NewsAnalysis | null
  loading?: boolean
  onRefresh?: () => void
}

export function AINewsSummary({ symbol, analysis, loading, onRefresh }: AINewsSummaryProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true)
      await onRefresh()
      setIsRefreshing(false)
    }
  }

  // Get icon for alert type
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'risk': return <AlertCircle className="h-4 w-4" />
      case 'opportunity': return <TrendingUp className="h-4 w-4" />
      case 'unusual': return <Zap className="h-4 w-4" />
      case 'catalyst': return <Target className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  // Get relevant news for a specific alert
  const getRelevantNewsForAlert = (alert: any, relevantNews: any[]) => {
    // Match news to alert types based on category and keywords
    return relevantNews.filter(news => {
      const titleLower = news.title.toLowerCase()
      const alertTitleLower = alert.title.toLowerCase()
      
      // Match based on alert type
      if (alert.type === 'risk' && (news.category === 'Legal' || news.category === 'Analyst' && titleLower.includes('downgrade'))) {
        return true
      }
      if (alert.type === 'opportunity' && (news.category === 'Product' || news.category === 'Strategic' || news.category === 'Analyst' && titleLower.includes('upgrade'))) {
        return true
      }
      if (alert.type === 'catalyst' && (news.category === 'Earnings' || news.category === 'Product')) {
        return true
      }
      if (alert.type === 'unusual' && news.category === 'Market') {
        return true
      }
      
      // Also match if alert description mentions keywords from the news
      const alertKeywords = alertTitleLower.split(' ').filter((word: string) => word.length > 4)
      return alertKeywords.some((keyword: string) => titleLower.includes(keyword))
    })
  }

  // Get color for alert urgency
  const getAlertColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'border-red-500 bg-red-50 dark:bg-red-950/20'
      case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
      case 'low': return 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
      default: return 'border-gray-500 bg-gray-50 dark:bg-gray-950/20'
    }
  }

  // Get color for recommendation
  const getRecommendationColor = (action: string) => {
    switch (action) {
      case 'STRONG_BUY': return 'bg-green-600 text-white'
      case 'BUY': return 'bg-green-500 text-white'
      case 'HOLD': return 'bg-yellow-500 text-white'
      case 'SELL': return 'bg-red-500 text-white'
      case 'WATCH': return 'bg-blue-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  if (loading) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse" />
            <span>AI News Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analysis || !analysis.executiveSummary) {
    return null
  }

  return (
    <Card className="mb-4 border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <span>AI News Intelligence</span>
            <Badge variant="secondary" className="ml-2">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Powered
            </Badge>
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Executive Summary */}
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm leading-relaxed">
            {analysis.executiveSummary}
          </p>
        </div>


        {/* Smart Alerts with Relevant News */}
        {analysis.smartAlerts && analysis.smartAlerts.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Smart Alerts
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {analysis.smartAlerts.map((alert, index) => {
                const relevantNewsForAlert = analysis.relevantNews ? getRelevantNewsForAlert(alert, analysis.relevantNews) : []
                return (
                  <div
                    key={index}
                    className={`p-3 border-l-4 rounded-r-lg ${getAlertColor(alert.urgency)}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{alert.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getAlertIcon(alert.type)}
                          <h5 className="font-medium text-sm">{alert.title}</h5>
                        </div>
                        {/* Check if description is a news title and make it clickable */}
                        {alert.description.endsWith('...') && analysis.relevantNews ? (
                          (() => {
                            // Try to find the matching news item
                            const matchingNews = analysis.relevantNews.find(news => {
                              // Remove "..." from description for comparison
                              const cleanDesc = alert.description.replace('...', '').trim()
                              // Check if description contains significant part of the news title
                              return news.title.toLowerCase().includes(cleanDesc.toLowerCase().substring(0, 30)) ||
                                     cleanDesc.toLowerCase().includes(news.title.toLowerCase().substring(0, 30))
                            })
                            if (matchingNews) {
                              return (
                                <a
                                  href={matchingNews.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 line-clamp-2 flex items-start gap-1 group underline decoration-dotted underline-offset-2"
                                >
                                  <span className="flex-1">{alert.description}</span>
                                  <ExternalLink className="h-3 w-3 flex-shrink-0 mt-0.5 opacity-60 group-hover:opacity-100" />
                                </a>
                              )
                            }
                            return (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {alert.description}
                              </p>
                            )
                          })()
                        ) : (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {alert.description}
                          </p>
                        )}
                        {/* Add additional relevant news links */}
                        {relevantNewsForAlert.length > 0 && !alert.description.endsWith('...') && (
                          <div className="mt-2 space-y-1">
                            {relevantNewsForAlert.slice(0, 2).map((news, idx) => (
                              <a
                                key={idx}
                                href={news.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline truncate"
                              >
                                → {news.title}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          // Show relevant news when there are no alerts
          analysis.relevantNews && analysis.relevantNews.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Newspaper className="h-4 w-4" />
                Key News
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {analysis.relevantNews.slice(0, 4).map((news, index) => (
                  <div
                    key={index}
                    className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <a
                      href={news.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      <div className="font-medium line-clamp-2 mb-1">{news.title}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {news.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(news.providerPublishTime).toLocaleDateString()}
                        </span>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Most Important News */}
        {analysis.mostImportantNews && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium mb-1">Must Read</h4>
                {analysis.mostImportantNews.link ? (
                  <a
                    href={analysis.mostImportantNews.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm line-clamp-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline decoration-dotted underline-offset-2 flex items-start gap-1 group"
                  >
                    <span className="flex-1">{analysis.mostImportantNews.title}</span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0 mt-0.5 opacity-60 group-hover:opacity-100" />
                  </a>
                ) : (
                  <p className="text-sm line-clamp-2">{analysis.mostImportantNews.title}</p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-muted-foreground">
                    {analysis.mostImportantNews.reason}
                  </span>
                  <span className="text-xs text-primary font-medium">
                    {analysis.mostImportantNews.expectedImpact}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Quick Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>
            Analyzed {analysis.totalArticles} {analysis.totalArticles === 1 ? 'article' : 'articles'} • 
            {' '}News velocity: <Badge variant="outline" className="ml-1">
              {analysis.newsVelocity}
            </Badge>
          </span>
          <span>
            Updated: {new Date(analysis.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
