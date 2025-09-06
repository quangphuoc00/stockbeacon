/**
 * Dashboard V2 Mockup - Example components for the redesigned dashboard
 * This shows how the new dashboard could look and feel
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Target, 
  TrendingUp, 
  AlertCircle, 
  Zap, 
  Brain,
  ChevronRight,
  DollarSign,
  BookOpen,
  Calculator,
  Bell
} from 'lucide-react'

// Daily Mission Component
export function DailyMissions() {
  const missions = [
    {
      id: 1,
      priority: 'high',
      icon: '🔴',
      title: 'NVDA hit your $450 alert',
      action: 'Review entry strategy',
      reason: 'Score: 95, RSI oversold, support bounce',
      color: 'bg-red-50 border-red-200'
    },
    {
      id: 2,
      priority: 'medium',
      icon: '⚠️',
      title: 'TSLA down 15% from purchase',
      action: 'Consider stop loss',
      reason: 'Score dropped to 65, below 50-day MA',
      color: 'bg-yellow-50 border-yellow-200'
    },
    {
      id: 3,
      priority: 'info',
      icon: '💡',
      title: '3 stocks match your criteria',
      action: 'View opportunities',
      reason: 'All have scores >85 and recent pullbacks',
      color: 'bg-blue-50 border-blue-200'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Today's Mission</CardTitle>
          </div>
        </div>
        <CardDescription>Your personalized action items for today</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {missions.map((mission) => (
          <div
            key={mission.id}
            className={`p-4 rounded-lg border ${mission.color} transition-all hover:shadow-md cursor-pointer`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{mission.icon}</span>
                  <h3 className="font-semibold">{mission.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{mission.reason}</p>
              </div>
              <Button size="sm" variant="ghost" className="gap-1">
                {mission.action}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Portfolio Health Gauge
export function PortfolioHealthGauge() {
  const healthScore = 82
  const breakdown = {
    diversification: { score: 9, max: 10, status: 'excellent' },
    quality: { score: 85, max: 100, status: 'strong' },
    risk: { level: 'Moderate', status: 'balanced' },
    cash: { percent: 15, status: 'ready' }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Gauge */}
          <div className="relative">
            <div className="text-center mb-2">
              <div className="text-4xl font-bold">{healthScore}</div>
              <div className="text-sm text-muted-foreground">out of 100</div>
            </div>
            <Progress value={healthScore} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Poor</span>
              <span>Fair</span>
              <span>Good</span>
              <span>Excellent</span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm">Diversification</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{breakdown.diversification.score}/10</span>
                <Badge variant="outline" className="text-xs bg-green-50">Excellent</Badge>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Average Quality</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{breakdown.quality.score}</span>
                <Badge variant="outline" className="text-xs bg-blue-50">Strong</Badge>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Risk Level</span>
              <Badge variant="outline" className="text-xs bg-yellow-50">{breakdown.risk.level}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Cash Position</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{breakdown.cash.percent}%</span>
                <Badge variant="outline" className="text-xs bg-green-50">Ready</Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// AI Insights Component
export function AIInsights() {
  const insights = [
    {
      type: 'opportunity',
      icon: <Brain className="h-5 w-5 text-blue-500" />,
      message: 'AAPL is forming a similar pattern to your successful MSFT trade from March. Score just hit 90.',
      action: 'See comparison',
      emoji: '🤖'
    },
    {
      type: 'risk',
      icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
      message: 'Your tech allocation is 65%. Consider diversifying into healthcare (3 stocks with scores >85).',
      action: 'View suggestions',
      emoji: '⚡'
    },
    {
      type: 'education',
      icon: <BookOpen className="h-5 w-5 text-purple-500" />,
      message: 'You tend to sell winners too early. Your GOOGL exit left 23% gains on the table.',
      action: 'Learn strategies',
      emoji: '📚'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <CardTitle>AI Insights for You</CardTitle>
        </div>
        <CardDescription>Personalized opportunities and recommendations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, idx) => (
          <div key={idx} className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <div className="text-2xl">{insight.emoji}</div>
            <div className="flex-1">
              <p className="text-sm mb-2">{insight.message}</p>
              <Button size="sm" variant="link" className="p-0 h-auto text-xs">
                {insight.action} →
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Perfect Storm Tracker
export function PerfectStormTracker() {
  const trackedStocks = [
    { symbol: 'AMZN', progress: 85, current: '$142', target: '$140', status: 'Price almost there!' },
    { symbol: 'META', progress: 70, current: 'Score 82', target: 'Score 85', status: '2/3 conditions met' },
    { symbol: 'GOOGL', progress: 55, current: '2/3 met', target: 'All conditions', status: 'Watching closely' }
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <CardTitle>Perfect Storm Tracker</CardTitle>
        </div>
        <CardDescription>Stocks approaching your buy criteria</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {trackedStocks.map((stock) => (
          <div key={stock.symbol} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="font-medium">{stock.symbol}</div>
              <div className="text-sm text-muted-foreground">{stock.progress}%</div>
            </div>
            <Progress value={stock.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{stock.current}</span>
              <span>{stock.status}</span>
              <span>{stock.target}</span>
            </div>
          </div>
        ))}
        <Button variant="outline" className="w-full mt-2" size="sm">
          <Bell className="h-4 w-4 mr-2" />
          Set up more alerts
        </Button>
      </CardContent>
    </Card>
  )
}

// Quick Actions FAB
export function QuickActionsFAB() {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2">
      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg"
        title="Quick actions"
      >
        <Calculator className="h-6 w-6" />
      </Button>
      <div className="flex flex-col gap-2 opacity-0 hover:opacity-100 transition-opacity">
        <Button size="sm" variant="secondary" className="rounded-full">
          Find similar stocks
        </Button>
        <Button size="sm" variant="secondary" className="rounded-full">
          Set price alert
        </Button>
        <Button size="sm" variant="secondary" className="rounded-full">
          Position calculator
        </Button>
      </div>
    </div>
  )
}


// Example of how to use these in the main dashboard
export function DashboardV2Preview() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Mission Control Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DailyMissions />
        </div>
        <div>
          <PortfolioHealthGauge />
        </div>
      </div>

      {/* Insights and Tracking */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AIInsights />
        <PerfectStormTracker />
      </div>

      {/* Floating Elements */}
      <QuickActionsFAB />
    </div>
  )
}
