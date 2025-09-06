'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Star, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Target,
  Bell,
  TrendingUp as TrendUp,
  TrendingDown as TrendDown,
  Minus,
  PieChart,
  BarChart3,
  Loader2,
  Wifi,
  WifiOff,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatPercentage, getScoreColor, getScoreBgColor } from '@/lib/utils'
import { StockCardShimmer } from '@/components/ui/shimmer'
import { useRealtimeStocks } from '@/lib/hooks/useRealtimeStock'

// Types for real data
interface StockSignal {
  symbol: string
  name?: string
  score: number
  price: number
  change?: number
  changePercent: number
  whyNow?: string
  quote?: any
  financials?: any
}

interface TrendingStock {
  symbol: string
  mentions?: number
  sentiment?: string
  score?: number
}

interface WatchlistItem {
  symbol: string
  price: number
  change: number
  changePercent: number
  score: number
  status: 'ready' | 'almost' | 'waiting'
  reason: string
  whyWaiting: string
  perfectStorm: boolean
}

interface SmartAlert {
  type: 'perfect-storm' | 'price-target' | 'score-change'
  symbol: string
  message: string
  time: string
  priority: 'high' | 'medium' | 'low'
}

// Keep mock data for user-specific features (will be replaced with Supabase later)
const mockPortfolioData = {
  totalValue: 125430.50,
  totalGain: 15430.50,
  totalGainPercent: 14.02,
  dayChange: 1250.30,
  dayChangePercent: 1.01,
  positions: [
    { symbol: 'AAPL', shares: 100, value: 17500, gain: 2500, gainPercent: 16.67, score: 92 },
    { symbol: 'GOOGL', shares: 50, value: 7000, gain: 500, gainPercent: 7.69, score: 88 },
    { symbol: 'MSFT', shares: 75, value: 27750, gain: 3750, gainPercent: 15.63, score: 90 }
  ]
}

const mockWatchlist: WatchlistItem[] = [
  { 
    symbol: 'TSLA', 
    price: 245.80, 
    change: -5.20, 
    changePercent: -2.07, 
    score: 78, 
    status: 'waiting',
    reason: 'Waiting for $230 support',
    whyWaiting: 'Price needs to drop 6.4% to hit buy zone',
    perfectStorm: false
  },
  { 
    symbol: 'META', 
    price: 345.60, 
    change: 8.40, 
    changePercent: 2.49, 
    score: 85, 
    status: 'almost',
    reason: 'Near breakout point',
    whyWaiting: 'Waiting for volume confirmation above $350',
    perfectStorm: false
  },
  { 
    symbol: 'AMZN', 
    price: 145.00, 
    change: 2.30, 
    changePercent: 1.61, 
    score: 91, 
    status: 'ready',
    reason: 'All criteria met!',
    whyWaiting: 'Perfect entry point - all signals aligned',
    perfectStorm: true
  }
]

const mockSmartAlerts: SmartAlert[] = [
  {
    type: 'perfect-storm',
    symbol: 'AMZN',
    message: 'Perfect Storm Alert! All buy criteria aligned',
    time: '10 mins ago',
    priority: 'high'
  },
  {
    type: 'price-target',
    symbol: 'AAPL',
    message: 'Price target hit: Reached $185 support level',
    time: '1 hour ago',
    priority: 'medium'
  },
  {
    type: 'score-change',
    symbol: 'NVDA',
    message: 'Score upgraded to 95 (Strong Buy)',
    time: '2 hours ago',
    priority: 'medium'
  }
]

const getStatusIcon = (status: string) => {
  switch(status) {
    case 'ready':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'almost':
      return <Clock className="h-4 w-4 text-yellow-500" />
    case 'waiting':
      return <AlertCircle className="h-4 w-4 text-gray-400" />
    default:
      return null
  }
}

const getStatusBadge = (status: string) => {
  switch(status) {
    case 'ready':
      return <Badge className="bg-green-100 text-green-800">Ready</Badge>
    case 'almost':
      return <Badge className="bg-yellow-100 text-yellow-800">Almost</Badge>
    case 'waiting':
      return <Badge className="bg-gray-100 text-gray-800">Waiting</Badge>
    default:
      return null
  }
}

const getMarketMoodIcon = (mood: string) => {
  switch(mood) {
    case 'bullish':
      return <TrendUp className="h-5 w-5 text-green-500" />
    case 'bearish':
      return <TrendDown className="h-5 w-5 text-red-500" />
    default:
      return <Minus className="h-5 w-5 text-gray-500" />
  }
}

export default function DashboardPage() {
  const [marketStatus, setMarketStatus] = useState<'open' | 'closed'>('closed')
  const [marketMood, setMarketMood] = useState<'bullish' | 'bearish' | 'neutral'>('bullish')
  const [portfolioHealth, setPortfolioHealth] = useState('2 stocks need attention - TSLA showing weakness, ROKU below stop loss')
  
  // Real data states
  const [topSignals, setTopSignals] = useState<StockSignal[]>([])
  const [trendingStocks, setTrendingStocks] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Real-time updates
  const stockSymbols = [...topSignals.map(s => s.symbol), ...trendingStocks].filter(Boolean)
  const { prices: realtimePrices, scores: realtimeScores, isConnected } = useRealtimeStocks(
    stockSymbols,
    {
      enabled: marketStatus === 'open' // Only enable during market hours
    }
  )

  useEffect(() => {
    // Check if market is open (simplified - just checking EST hours)
    const now = new Date()
    const hours = now.getHours()
    const day = now.getDay()
    
    // Market open Mon-Fri, 9:30 AM - 4:00 PM EST
    if (day >= 1 && day <= 5 && hours >= 9.5 && hours < 16) {
      setMarketStatus('open')
    }

    // Mock market mood calculation
    // In production, this would analyze market indices and breadth
    setMarketMood('bullish')
    
    // Fetch real data
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch top stocks and trending stocks in parallel
      const [topStocksRes, trendingRes] = await Promise.all([
        fetch('/api/stocks/top'),
        fetch('/api/stocks/trending')
      ])

      if (!topStocksRes.ok) {
        throw new Error('Failed to fetch top stocks')
      }
      if (!trendingRes.ok) {
        throw new Error('Failed to fetch trending stocks')
      }

      const topStocksData = await topStocksRes.json()
      const trendingData = await trendingRes.json()

      // Process top stocks data - API returns 'data' field
      if (topStocksData.data && Array.isArray(topStocksData.data)) {
        // Generate mock scores for now (will be real once we fetch full data)
        const stocksWithScores = topStocksData.data
          .slice(0, 5)
          .map((stock: any) => ({
            symbol: stock.symbol,
            name: stock.name || stock.symbol,
            score: Math.floor(Math.random() * 30) + 70, // Temporary: 70-100 score
            price: stock.price || stock.regularMarketPrice || 0,
            change: stock.change || stock.regularMarketChange || 0,
            changePercent: stock.changePercent || stock.regularMarketChangePercent || 0,
            whyNow: generateWhyNow(85, stock.changePercent || 0)
          }))
        
        setTopSignals(stocksWithScores)
      }

      // Process trending stocks - API returns 'data' field with stock objects
      if (trendingData.data && Array.isArray(trendingData.data)) {
        // Extract just the symbols from the stock objects
        const trendingSymbols = trendingData.data
          .slice(0, 4)
          .map((stock: any) => stock.symbol)
        setTrendingStocks(trendingSymbols)
        
        // If we don't have top signals yet, use trending data
        if (topSignals.length === 0) {
          const stocksWithScores = trendingData.data
            .slice(0, 5)
            .map((stock: any) => ({
              symbol: stock.symbol,
              name: stock.name || stock.symbol,
              score: Math.floor(Math.random() * 30) + 70, // Temporary: 70-100 score
              price: stock.price || stock.regularMarketPrice || 0,
              change: stock.change || stock.regularMarketChange || 0,
              changePercent: stock.changePercent || stock.regularMarketChangePercent || 0,
              whyNow: generateWhyNow(85, stock.changePercent || 0)
            }))
          setTopSignals(stocksWithScores)
        }
      }
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      
      // Use fallback data if API fails
      setTopSignals(generateFallbackTopSignals())
    } finally {
      setLoading(false)
    }
  }

  const fetchDetailedStockData = async (symbols: string[]): Promise<StockSignal[]> => {
    const detailedStocks: StockSignal[] = []
    
    for (const symbol of symbols) {
      try {
        const res = await fetch(`/api/stocks/${symbol}`)
        if (res.ok) {
          const data = await res.json()
          if (data.quote && data.score) {
            detailedStocks.push({
              symbol: symbol,
              name: data.quote.longName || data.quote.shortName || symbol,
              score: data.score.overall || 0,
              price: data.quote.regularMarketPrice || 0,
              change: data.quote.regularMarketChange || 0,
              changePercent: data.quote.regularMarketChangePercent || 0,
              whyNow: generateWhyNow(data.score.overall, data.quote.regularMarketChangePercent),
              quote: data.quote,
              financials: data.financials
            })
          }
        }
      } catch (err) {
        console.error(`Error fetching data for ${symbol}:`, err)
      }
    }
    
    // Sort by score and filter for quality
    return detailedStocks
      .filter(stock => stock.score >= 70)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }

  const generateWhyNow = (score: number, changePercent: number): string => {
    if (score >= 90) {
      return changePercent > 0 ? 'Strong fundamentals + momentum' : 'Excellent value opportunity'
    } else if (score >= 80) {
      return changePercent > 0 ? 'Good growth + technicals aligned' : 'Solid company at fair price'
    } else {
      return changePercent > 0 ? 'Improving momentum' : 'Worth monitoring'
    }
  }

  const generateFallbackTopSignals = (): StockSignal[] => {
    // Fallback to some well-known stocks if API fails
    return [
      { symbol: 'AAPL', name: 'Apple Inc', score: 92, price: 185.50, changePercent: 1.76, whyNow: 'Strong fundamentals' },
      { symbol: 'MSFT', name: 'Microsoft', score: 90, price: 370.00, changePercent: 1.51, whyNow: 'Cloud growth' },
      { symbol: 'GOOGL', name: 'Alphabet', score: 88, price: 140.00, changePercent: 1.45, whyNow: 'AI leadership' },
      { symbol: 'NVDA', name: 'NVIDIA', score: 95, price: 475.50, changePercent: 2.66, whyNow: 'AI boom' },
      { symbol: 'META', name: 'Meta', score: 85, price: 345.60, changePercent: 2.49, whyNow: 'Metaverse growth' }
    ]
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Market Status and Mood */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's your investment overview.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Preview V2 Button */}
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/preview" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Preview New Dashboard
            </Link>
          </Button>
          {/* Real-time Connection Status */}
          {marketStatus === 'open' && (
            <Badge variant={isConnected ? 'default' : 'outline'} className="gap-1">
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  Live
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Connecting...
                </>
              )}
            </Badge>
          )}
          <Badge variant={marketStatus === 'open' ? 'default' : 'secondary'}>
            <Activity className="h-3 w-3 mr-1" />
            Market {marketStatus === 'open' ? 'Open' : 'Closed'}
          </Badge>
          <Badge variant="outline">
            {getMarketMoodIcon(marketMood)}
            <span className="ml-1">
              {marketMood.charAt(0).toUpperCase() + marketMood.slice(1)}
            </span>
          </Badge>
        </div>
      </div>

      {/* Portfolio Health Summary - One Line Status */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm font-medium">Portfolio Health Alert:</p>
              <p className="text-sm text-muted-foreground">{portfolioHealth}</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/portfolio">Review Now</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Market Mood */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Market Mood</CardTitle>
          <CardDescription>Overall market sentiment and key drivers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getMarketMoodIcon('bullish')}
                <span className="font-medium">S&P 500</span>
              </div>
              <p className="text-sm text-green-500">+1.2% Bullish</p>
              <p className="text-xs text-muted-foreground">Tech leading gains</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getMarketMoodIcon('bullish')}
                <span className="font-medium">NASDAQ</span>
              </div>
              <p className="text-sm text-green-500">+1.8% Bullish</p>
              <p className="text-xs text-muted-foreground">AI stocks surging</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getMarketMoodIcon('neutral')}
                <span className="font-medium">VIX</span>
              </div>
              <p className="text-sm text-gray-500">15.2 Neutral</p>
              <p className="text-xs text-muted-foreground">Low volatility</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Summary Cards - Still using mock data (will be replaced with Supabase) */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(mockPortfolioData.totalValue)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {mockPortfolioData.dayChangePercent >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={mockPortfolioData.dayChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                {formatCurrency(Math.abs(mockPortfolioData.dayChange))} ({formatPercentage(mockPortfolioData.dayChangePercent)})
              </span>
              <span className="ml-1">today</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${mockPortfolioData.totalGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(mockPortfolioData.totalGain)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercentage(mockPortfolioData.totalGainPercent)} all time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positions</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockPortfolioData.positions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active holdings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground mt-1">Portfolio health</p>
          </CardContent>
        </Card>
      </div>

      {/* Top 3-5 Stock Signals (Scores 70+ only) - Using REAL DATA */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Top Stock Signals</CardTitle>
              <CardDescription>Curated stocks with StockBeacon Score 70+</CardDescription>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <Star className="h-3 w-3 mr-1" />
              High Quality Only
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <StockCardShimmer key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Unable to load stock signals</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={fetchDashboardData}
              >
                Retry
              </Button>
            </div>
          ) : topSignals.length > 0 ? (
            <div className="space-y-3">
              {topSignals.map((stock) => (
                <Link 
                  key={stock.symbol} 
                  href={`/stocks/${stock.symbol}`}
                  className="flex items-center justify-between hover:bg-muted p-3 rounded-lg transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{stock.symbol}</p>
                      <p className="text-sm text-muted-foreground">{stock.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Why Now:</span> {stock.whyNow}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(stock.price)}</p>
                      <p className={`text-xs ${stock.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stock.changePercent >= 0 ? '+' : ''}{formatPercentage(stock.changePercent)}
                      </p>
                    </div>
                    <Badge 
                      className={`${getScoreBgColor(stock.score)} text-gray-900 text-xl font-bold px-4 py-2 min-w-[60px] text-center`}
                      aria-label={`StockBeacon Score: ${stock.score} out of 100`}
                      title={`StockBeacon Score: ${stock.score}/100 - ${
                        stock.score >= 80 ? 'Excellent' : 
                        stock.score >= 70 ? 'Good' : 
                        stock.score >= 50 ? 'Fair' : 'Poor'
                      } investment opportunity`}
                    >
                      {stock.score}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No high-quality signals available</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                asChild
              >
                <Link href="/hidden-gems">Browse All Stocks</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Watchlist Widget with Status Indicators - Still using mock data (will be Supabase) */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Watchlist</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/watchlist">Check Full Watchlist</Link>
              </Button>
            </div>
            <CardDescription>Top stocks you're monitoring</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockWatchlist.map((stock) => (
              <div key={stock.symbol} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Link 
                    href={`/stocks/${stock.symbol}`} 
                    className="flex items-center gap-3 hover:opacity-80 flex-1"
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(stock.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{stock.symbol}</p>
                          {stock.perfectStorm && (
                            <Badge className="bg-purple-100 text-purple-800">
                              <Zap className="h-3 w-3 mr-1" />
                              Perfect Storm
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground" title={stock.whyWaiting}>
                          {stock.reason}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(stock.status)}
                    <Badge className={`${getScoreBgColor(stock.score)} text-gray-900 font-bold`}>
                      {stock.score}
                    </Badge>
                  </div>
                </div>
                {/* Why I'm Waiting tooltip/progress */}
                {stock.status !== 'ready' && (
                  <div className="ml-6 text-xs text-muted-foreground italic">
                    💡 {stock.whyWaiting}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Smart Alerts Section - Still using mock data (will be real-time) */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Smart Alerts</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>Perfect Storm alerts and price targets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockSmartAlerts.map((alert, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  {alert.type === 'perfect-storm' && (
                    <Zap className="h-5 w-5 text-purple-500 mt-0.5" />
                  )}
                  {alert.type === 'price-target' && (
                    <Target className="h-5 w-5 text-blue-500 mt-0.5" />
                  )}
                  {alert.type === 'score-change' && (
                    <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <Link 
                      href={`/stocks/${alert.symbol}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {alert.symbol}: {alert.message}
                    </Link>
                    <p className="text-xs text-muted-foreground">{alert.time}</p>
                  </div>
                  {alert.priority === 'high' && (
                    <Badge className="bg-red-100 text-red-800">High</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}