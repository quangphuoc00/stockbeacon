/**
 * Interactive Watchlist Widget - Engaging watchlist for dashboard
 * Shows progress towards alerts and actionable insights
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Eye,
  Zap,
  TrendingUp,
  TrendingDown,
  Bell,
  ChevronRight,
  Timer,
  Target,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'

interface WatchlistStock {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  score: number
  alertProgress: number
  conditions: {
    price?: { current: number; target: number; direction: 'above' | 'below' }
    score?: { current: number; target: number }
    timeToBuy?: { current: number; target: number }
  }
  nextMilestone: string
  timeToAlert: string
  momentum: 'accelerating' | 'steady' | 'slowing'
}

export function InteractiveWatchlistWidget() {
  const [selectedView, setSelectedView] = useState<'all' | 'ready' | 'soon'>('all')
  
  const watchlistStocks: WatchlistStock[] = [
    {
      symbol: 'AMZN',
      name: 'Amazon',
      price: 142.50,
      change: -1.20,
      changePercent: -0.84,
      score: 91,
      alertProgress: 92,
      conditions: {
        price: { current: 142.50, target: 140, direction: 'below' },
        score: { current: 91, target: 85 },
        timeToBuy: { current: 75, target: 70 }
      },
      nextMilestone: 'Price $2.50 away',
      timeToAlert: '1-2 days',
      momentum: 'accelerating'
    },
    {
      symbol: 'META',
      name: 'Meta Platforms',
      price: 485.20,
      change: 8.40,
      changePercent: 1.76,
      score: 82,
      alertProgress: 68,
      conditions: {
        price: { current: 485.20, target: 475, direction: 'below' },
        score: { current: 82, target: 85 },
        timeToBuy: { current: 55, target: 60 }
      },
      nextMilestone: 'Score needs +3',
      timeToAlert: '5-7 days',
      momentum: 'steady'
    }
  ]

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 60) return 'bg-yellow-500'
    return 'bg-gray-300'
  }

  const getMomentumIcon = (momentum: string) => {
    switch (momentum) {
      case 'accelerating':
        return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'slowing':
        return <TrendingDown className="h-3 w-3 text-red-500" />
      default:
        return <TrendingUp className="h-3 w-3 text-gray-400 rotate-90" />
    }
  }

  const filteredStocks = watchlistStocks.filter(stock => {
    if (selectedView === 'ready') return stock.alertProgress >= 80
    if (selectedView === 'soon') return stock.alertProgress >= 60 && stock.alertProgress < 80
    return true
  })

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <CardTitle>Smart Watchlist</CardTitle>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <a href="/watchlist">View All</a>
          </Button>
        </div>
        <CardDescription>Track progress towards your perfect entry points</CardDescription>
        
        {/* View Filters */}
        <div className="flex gap-2 mt-3">
          <Badge 
            variant={selectedView === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedView('all')}
          >
            All (2)
          </Badge>
          <Badge 
            variant={selectedView === 'ready' ? 'default' : 'outline'}
            className="cursor-pointer bg-green-100 text-green-800 border-green-200"
            onClick={() => setSelectedView('ready')}
          >
            <Zap className="h-3 w-3 mr-1" />
            Ready (1)
          </Badge>
          <Badge 
            variant={selectedView === 'soon' ? 'default' : 'outline'}
            className="cursor-pointer bg-yellow-100 text-yellow-800 border-yellow-200"
            onClick={() => setSelectedView('soon')}
          >
            <Clock className="h-3 w-3 mr-1" />
            Soon (1)
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {filteredStocks.map((stock) => (
          <div 
            key={stock.symbol}
            className="border rounded-lg p-4 hover:bg-muted/50 transition-all cursor-pointer"
          >
            {/* Header Row */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{stock.symbol}</h3>
                  <span className="text-sm text-muted-foreground">{stock.name}</span>
                  {getMomentumIcon(stock.momentum)}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-lg font-medium">${stock.price}</span>
                  <span className={`text-sm ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </span>
                  <Badge className="text-xs" variant="outline">
                    Score: {stock.score}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                {stock.alertProgress >= 80 ? (
                  <Badge className="bg-green-100 text-green-800">
                    <Zap className="h-3 w-3 mr-1" />
                    Ready!
                  </Badge>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <Timer className="h-3 w-3 inline mr-1" />
                    {stock.timeToAlert}
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Alert Progress</span>
                <span className="font-medium">{stock.alertProgress}%</span>
              </div>
              <Progress 
                value={stock.alertProgress} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">{stock.nextMilestone}</p>
            </div>

            {/* Conditions Mini View */}
            <div className="flex gap-2 mt-3">
              {stock.conditions.price && (
                <div className="flex items-center gap-1 text-xs">
                  <Target className="h-3 w-3" />
                  <span>
                    ${stock.conditions.price.current} → ${stock.conditions.price.target}
                  </span>
                  {stock.conditions.price.current <= stock.conditions.price.target ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-gray-400" />
                  )}
                </div>
              )}
              {stock.conditions.score && (
                <div className="flex items-center gap-1 text-xs">
                  <Sparkles className="h-3 w-3" />
                  <span>
                    Score {stock.conditions.score.current} → {stock.conditions.score.target}
                  </span>
                  {stock.conditions.score.current >= stock.conditions.score.target ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-gray-400" />
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            {stock.alertProgress >= 80 && (
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button size="sm" variant="default" className="flex-1">
                  <Zap className="h-4 w-4 mr-1" />
                  View Analysis
                </Button>
                <Button size="sm" variant="outline">
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}

        {/* Add More Alerts CTA */}
        <div className="text-center pt-2">
          <Button variant="outline" className="w-full">
            <Bell className="h-4 w-4 mr-2" />
            Add More Alerts
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Mini version for space-constrained layouts
export function WatchlistQuickView() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Alerts Ready</span>
        <Badge className="bg-green-100 text-green-800">2</Badge>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between p-2 bg-green-50 rounded">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">AMZN</span>
          </div>
          <span className="text-xs text-green-600">92% ready</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium">META</span>
          </div>
          <span className="text-xs text-yellow-600">68% progress</span>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="w-full">
        View all watchlist
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  )
}
