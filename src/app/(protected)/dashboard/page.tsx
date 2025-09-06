'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Target, 
  TrendingUp, 
  AlertCircle, 
  Zap, 
  Brain,
  ChevronRight,
  Activity,
  Eye,
  Sparkles,
  Bell,
  Lightbulb,
  AlertTriangle,
  Search
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatPercentage } from '@/lib/utils'

// Import new components
import { SmartMarketPulse } from '@/components/dashboard/smart-market-pulse'
import { InteractiveWatchlistWidget } from '@/components/dashboard/interactive-watchlist-widget'

// Types
interface Mission {
  id: number
  priority: 'high' | 'medium' | 'info'
  icon: string
  title: string
  action: string
  actionUrl: string
  reason: string
  color: string
}

interface AIInsight {
  type: 'opportunity' | 'risk' | 'education'
  emoji: string
  message: string
  action: string
  actionUrl: string
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [missions, setMissions] = useState<Mission[]>([])
  const [portfolioHealth, setPortfolioHealth] = useState({
    score: 82,
    breakdown: {
      diversification: { score: 9, max: 10, status: 'excellent' },
      quality: { score: 85, max: 100, status: 'strong' },
      risk: { level: 'Moderate', status: 'balanced' },
      cash: { percent: 15, status: 'ready' }
    }
  })
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])

  useEffect(() => {
    // Simulate loading real data
    setTimeout(() => {
      // Set missions based on user data
      setMissions([
        {
          id: 1,
          priority: 'high',
          icon: '🔴',
          title: 'NVDA hit your $450 alert',
          action: 'Review entry strategy',
          actionUrl: '/stocks/NVDA',
          reason: 'Score: 95, RSI oversold, support bounce',
          color: 'bg-red-50 border-red-200'
        },
        {
          id: 2,
          priority: 'medium',
          icon: '⚠️',
          title: 'TSLA down 15% from purchase',
          action: 'Consider stop loss',
          actionUrl: '/portfolio',
          reason: 'Score dropped to 65, below 50-day MA',
          color: 'bg-yellow-50 border-yellow-200'
        },
        {
          id: 3,
          priority: 'info',
          icon: '💡',
          title: '3 stocks match your criteria',
          action: 'View opportunities',
          actionUrl: '/hidden-gems',
          reason: 'All have scores >85 and recent pullbacks',
          color: 'bg-blue-50 border-blue-200'
        }
      ])

      // Set AI insights
      setAiInsights([
        {
          type: 'opportunity',
          emoji: '🤖',
          message: 'AAPL is forming a similar pattern to your successful MSFT trade from March. Score just hit 90.',
          action: 'See comparison',
          actionUrl: '/stocks/AAPL'
        },
        {
          type: 'risk',
          emoji: '⚡',
          message: 'Your tech allocation is 65%. Consider diversifying into healthcare (3 stocks with scores >85).',
          action: 'View suggestions',
          actionUrl: '/hidden-gems?sector=healthcare'
        },
        {
          type: 'education',
          emoji: '📚',
          message: 'You tend to sell winners too early. Your GOOGL exit left 23% gains on the table.',
          action: 'Learn patience strategies',
          actionUrl: '#'
        }
      ])

      setLoading(false)
    }, 1000)
  }, [])

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Your Investment Command Center</h1>
          <p className="text-muted-foreground mt-1">
            Personalized insights and actions for today
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Activity className="h-3 w-3" />
          Live Updates
        </Badge>
      </div>

      {/* Top Section: Missions and Health */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daily Missions - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle>Today's Focus</CardTitle>
              </div>
              <CardDescription>Your personalized action items for today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                missions.map((mission) => (
                  <div
                    key={mission.id}
                    className={`p-4 rounded-lg border ${mission.color} transition-all hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{mission.icon}</span>
                          <h3 className="font-semibold">{mission.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{mission.reason}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="gap-1" asChild>
                        <Link href={mission.actionUrl}>
                          {mission.action}
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Health Score */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Main Score */}
              <div className="text-center">
                <div className={`text-5xl font-bold ${getHealthScoreColor(portfolioHealth.score)}`}>
                  {portfolioHealth.score}
                </div>
                <div className="text-sm text-muted-foreground">out of 100</div>
                <Progress value={portfolioHealth.score} className="h-3 mt-3" />
              </div>

              {/* Breakdown */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Diversification</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {portfolioHealth.breakdown.diversification.score}/10
                    </span>
                    <Badge variant="outline" className="text-xs bg-green-50">
                      {portfolioHealth.breakdown.diversification.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average Quality</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {portfolioHealth.breakdown.quality.score}
                    </span>
                    <Badge variant="outline" className="text-xs bg-blue-50">
                      {portfolioHealth.breakdown.quality.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Risk Level</span>
                  <Badge variant="outline" className="text-xs bg-yellow-50">
                    {portfolioHealth.breakdown.risk.level}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Cash Position</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {portfolioHealth.breakdown.cash.percent}%
                    </span>
                    <Badge variant="outline" className="text-xs bg-green-50">
                      {portfolioHealth.breakdown.cash.status}
                    </Badge>
                  </div>
                </div>
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href="/portfolio">
                      View Full Analysis
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>AI Insights for You</CardTitle>
          </div>
          <CardDescription>Personalized opportunities and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {aiInsights.map((insight, idx) => (
              <div
                key={idx}
                className="flex gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="text-2xl flex-shrink-0">{insight.emoji}</div>
                <div className="flex-1">
                  <p className="text-sm mb-2">{insight.message}</p>
                  <Button size="sm" variant="link" className="p-0 h-auto text-xs" asChild>
                    <Link href={insight.actionUrl}>
                      {insight.action} →
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Perfect Storm Tracker */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <CardTitle>Perfect Storm Tracker</CardTitle>
          </div>
          <CardDescription>Stocks approaching all your buy criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* AMZN */}
            <div className="space-y-2 p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">AMZN</div>
                  <div className="text-xs text-muted-foreground">Amazon</div>
                </div>
                <Badge className="bg-green-100 text-green-800">92%</Badge>
              </div>
              <Progress value={92} className="h-2" />
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Price: $142.50</span>
                  <span className="text-green-600">→ $140 ✓</span>
                </div>
                <div className="flex justify-between">
                  <span>Score: 91</span>
                  <span className="text-green-600">→ 85 ✓</span>
                </div>
                <div className="flex justify-between">
                  <span>Timing: 75</span>
                  <span className="text-green-600">→ 70 ✓</span>
                </div>
              </div>
              <p className="text-xs font-medium text-green-600">
                Price $2.50 away from perfect entry!
              </p>
            </div>

            {/* META */}
            <div className="space-y-2 p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">META</div>
                  <div className="text-xs text-muted-foreground">Meta Platforms</div>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">68%</Badge>
              </div>
              <Progress value={68} className="h-2" />
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Price: $485.20</span>
                  <span className="text-red-600">→ $475 ✗</span>
                </div>
                <div className="flex justify-between">
                  <span>Score: 82</span>
                  <span className="text-red-600">→ 85 ✗</span>
                </div>
                <div className="flex justify-between">
                  <span>Timing: 55</span>
                  <span className="text-red-600">→ 60 ✗</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Score needs +3 points
              </p>
            </div>

            {/* GOOGL */}
            <div className="space-y-2 p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">GOOGL</div>
                  <div className="text-xs text-muted-foreground">Alphabet</div>
                </div>
                <Badge className="bg-gray-100 text-gray-800">45%</Badge>
              </div>
              <Progress value={45} className="h-2" />
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Price: $138.90</span>
                  <span className="text-red-600">→ $135 ✗</span>
                </div>
                <div className="flex justify-between">
                  <span>Score: 88</span>
                  <span className="text-red-600">→ 90 ✗</span>
                </div>
                <div className="text-xs text-muted-foreground pt-1">
                  Multiple conditions pending
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" asChild>
              <Link href="/watchlist">
                <Bell className="h-4 w-4 mr-2" />
                Manage All Alerts
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Market Pulse and Watchlist Side by Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Smart Market Pulse */}
        <SmartMarketPulse />
        
        {/* Interactive Watchlist */}
        <InteractiveWatchlistWidget />
      </div>
    </div>
  )
}