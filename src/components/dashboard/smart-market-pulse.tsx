/**
 * Smart Market Pulse - Personalized market overview
 * Shows market data relevant to user's portfolio
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown,
  Activity,
  Eye,
  Lightbulb,
  AlertTriangle,
  ChevronRight,
  Sparkles
} from 'lucide-react'

export function SmartMarketPulse() {
  // This would be calculated based on user's actual holdings
  const marketInsights = {
    portfolioSectors: {
      tech: { weight: 65, performance: '+2.1%', market: '+1.8%', outperforming: true },
      healthcare: { weight: 20, performance: '-0.5%', market: '+0.2%', outperforming: false },
      finance: { weight: 15, performance: '+1.2%', market: '+1.0%', outperforming: true }
    },
    opportunities: {
      oversoldHighScore: 12,
      sectorRotation: 'Tech → Healthcare',
      unusualVolume: ['NVDA', 'AMD', 'INTC']
    },
    risks: {
      weakSectors: ['Energy', 'Real Estate'],
      overvaluedHoldings: ['TSLA'],
      earningsThisWeek: ['AAPL', 'MSFT']
    },
    personalized: {
      similar: 'Your portfolio mirrors ARK Invest (+15% YTD)',
      pattern: 'You perform best in volatile markets',
      suggestion: 'Consider defensive stocks for balance'
    }
  }

  return (
    <div className="space-y-4">
      {/* Market Mood for YOUR Portfolio */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Your Market Pulse</CardTitle>
            </div>
            <Badge variant="outline" className="gap-1">
              <Activity className="h-3 w-3" />
              Live
            </Badge>
          </div>
          <CardDescription>How today's market affects your portfolio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sector Performance vs Market */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Your Sectors vs Market</h3>
            {Object.entries(marketInsights.portfolioSectors).map(([sector, data]) => (
              <div key={sector} className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">{sector}</span>
                    <span className="text-xs text-muted-foreground">({data.weight}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      data.performance.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {data.performance}
                    </span>
                    {data.outperforming ? (
                      <Badge variant="outline" className="text-xs bg-green-50">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Beating market
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-red-50">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Lagging
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={50 + (parseFloat(data.performance) - parseFloat(data.market)) * 10} 
                    className="h-1.5 flex-1"
                  />
                  <span className="text-xs text-muted-foreground">vs {data.market}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Opportunities */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-2 text-green-600">Today's Opportunities</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="text-green-600">🎯</div>
                  <span className="text-sm">{marketInsights.opportunities.oversoldHighScore} stocks hit oversold + high score</span>
                </div>
                <Button size="sm" variant="ghost">View →</Button>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="text-blue-600">🔄</div>
                  <span className="text-sm">Sector rotation: {marketInsights.opportunities.sectorRotation}</span>
                </div>
                <Button size="sm" variant="ghost">Learn →</Button>
              </div>
            </div>
          </div>

          {/* Risks to Watch */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-2 text-yellow-600">Watch Out For</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span>Earnings: {marketInsights.risks.earningsThisWeek.join(', ')} report this week</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span>Avoid: {marketInsights.risks.weakSectors.join(', ')} showing weakness</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}

// Market Opportunities Widget
export function MarketOpportunities() {
  const opportunities = [
    {
      type: 'oversold',
      count: 12,
      examples: ['AAPL', 'MSFT', 'GOOGL'],
      action: 'View all',
      description: 'Quality stocks in oversold territory'
    },
    {
      type: 'breakout',
      count: 5,
      examples: ['NVDA', 'AMD'],
      action: 'Set alerts',
      description: 'Near 52-week high breakouts'
    },
    {
      type: 'insider',
      count: 8,
      examples: ['META', 'CRM'],
      action: 'Research',
      description: 'Recent insider buying activity'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <CardTitle>Market Scanner</CardTitle>
        </div>
        <CardDescription>Opportunities matching your investment style</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {opportunities.map((opp) => (
            <div
              key={opp.type}
              className="p-3 rounded-lg bg-gradient-to-r from-green-50 to-blue-50 hover:from-green-100 hover:to-blue-100 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary">{opp.count}</Badge>
                    <span className="font-medium capitalize">{opp.type} signals</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{opp.description}</p>
                  <p className="text-xs">
                    <span className="font-medium">Examples:</span> {opp.examples.join(', ')}...
                  </p>
                </div>
                <Button size="sm" variant="ghost">
                  {opp.action}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Interactive Market Mood Ring
export function MarketMoodRing() {
  const moods = {
    overall: { score: 72, label: 'Cautiously Optimistic' },
    fear: 35,
    greed: 65,
    momentum: 'positive',
    breadth: '60% advancing'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Mood Ring</CardTitle>
        <CardDescription>Real-time sentiment analysis</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-32 flex items-center justify-center">
          {/* Animated mood ring visual */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-28 w-28 rounded-full bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 animate-pulse opacity-50" />
            <div className="absolute h-20 w-20 rounded-full bg-white flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold">{moods.overall.score}</div>
                <div className="text-xs text-muted-foreground">{moods.overall.label}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fear</span>
            <span className="font-medium">{moods.fear}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Greed</span>
            <span className="font-medium">{moods.greed}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Momentum</span>
            <Badge variant="outline" className="text-xs bg-green-50">
              {moods.momentum}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Breadth</span>
            <span className="font-medium text-xs">{moods.breadth}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
