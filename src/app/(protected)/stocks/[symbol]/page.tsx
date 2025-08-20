'use client'

import { useState, useEffect, use } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Star,
  Bell,
  Share2,
  ArrowUp,
  ArrowDown,
  Activity,
  DollarSign,
  BarChart3,
  Info,
  Clock,
  Calendar,
  Target,
  AlertCircle,
  Shield,
  Zap,
  Users,
  TrendingUp as Scale
} from 'lucide-react'
import { formatCurrency, formatPercentage, getScoreColor, getScoreBgColor, formatLargeNumber } from '@/lib/utils'
import Link from 'next/link'
import { useStockSubscription } from '@/lib/hooks'
import { ChartWrapper } from '@/components/stocks/chart-wrapper'
import { NewsFeed } from '@/components/stocks/news-feed'

interface StockPageProps {
  params: Promise<{ symbol: string }>
}

interface StockData {
  quote: any
  financials: any
  historical: any[]
  score: any
}

interface MoatAnalysis {
  symbol: string
  overallScore: number
  dimensions: {
    brandLoyalty: { score: number; explanation: string }
    switchingCosts: { score: number; explanation: string }
    networkEffects: { score: number; explanation: string }
    scaleAdvantages: { score: number; explanation: string }
  }
  summary: string
  strength: 'Strong' | 'Moderate' | 'Weak'
  lastUpdated: Date
}

export default function StockDetailPage({ params }: StockPageProps) {
  const resolvedParams = use(params)
  const symbol = resolvedParams.symbol.toUpperCase()
  
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [moatAnalysis, setMoatAnalysis] = useState<MoatAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMoat, setLoadingMoat] = useState(false)
  const [isWatching, setIsWatching] = useState(false)
  const [alertsEnabled, setAlertsEnabled] = useState(false)
  
  // Real-time stock updates (temporarily disabled)
  // const realtimeData = useStockSubscription(symbol)
  const realtimeData = null

  useEffect(() => {
    loadStockData()
    loadMoatAnalysis()
  }, [symbol])

  const loadStockData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/stocks/${symbol}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        setStockData(data.data)
      }
    } catch (error) {
      console.error('Error loading stock data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMoatAnalysis = async () => {
    try {
      setLoadingMoat(true)
      const response = await fetch(`/api/stocks/${symbol}/moat`)
      const data = await response.json()
      
      if (data.moatAnalysis) {
        setMoatAnalysis(data.moatAnalysis)
      }
    } catch (error) {
      console.error('Error loading moat analysis:', error)
    } finally {
      setLoadingMoat(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading {symbol} data...</p>
        </div>
      </div>
    )
  }

  if (!stockData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold">Unable to load data for {symbol}</p>
            <p className="text-muted-foreground mt-2">Please try again later or search for another stock.</p>
            <Link href="/dashboard">
              <Button className="mt-4">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { quote, financials, score, historical } = stockData
  
  console.log('StockDetailPage: Rendering chart with historical data:', {
    hasHistorical: !!historical,
    historicalLength: historical?.length,
    currentPrice: quote?.price || quote?.regularMarketPrice,
    symbol
  })

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{quote.symbol}</h1>
              {score && (
                <Badge className={`${getScoreBgColor(score.score)} text-gray-900 text-lg font-bold px-3 py-1`}>
                  Score: {score.score}
                </Badge>
              )}
            </div>
            <p className="text-lg text-muted-foreground">{quote.name || quote.longName || quote.shortName || ''}</p>
            <div className="flex items-center gap-4 mt-2">
              {quote.exchange && <span className="text-sm text-muted-foreground">{quote.exchange}</span>}
              {quote.sector && <span className="text-sm text-muted-foreground">{quote.sector}</span>}
              {quote.industry && <span className="text-sm text-muted-foreground">{quote.industry}</span>}
              {quote.marketState && (
                <Badge variant={quote.marketState === 'REGULAR' ? 'default' : 'secondary'}>
                  {quote.marketState}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={isWatching ? 'default' : 'outline'}
              onClick={() => setIsWatching(!isWatching)}
            >
              <Star className={`h-4 w-4 mr-1 ${isWatching ? 'fill-current' : ''}`} />
              {isWatching ? 'Watching' : 'Watch'}
            </Button>
            <Button
              variant={alertsEnabled ? 'default' : 'outline'}
              onClick={() => setAlertsEnabled(!alertsEnabled)}
            >
              <Bell className={`h-4 w-4 mr-1 ${alertsEnabled ? 'fill-current' : ''}`} />
              Alerts
            </Button>
            <Button variant="outline">
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </div>

        {/* Price Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Current Price</p>
                <p className="text-3xl font-bold">{formatCurrency(quote.price || quote.regularMarketPrice || 0)}</p>
                <div className={`flex items-center gap-1 mt-1 ${(quote.changePercent || quote.regularMarketChangePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(quote.changePercent || quote.regularMarketChangePercent || 0) >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  <span className="font-semibold">
                    {formatCurrency(Math.abs(quote.change || quote.regularMarketChange || 0))} ({formatPercentage(Math.abs(quote.changePercent || quote.regularMarketChangePercent || 0))})
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Day Range</p>
                <p className="font-semibold">
                  {formatCurrency(quote.dayLow || quote.regularMarketDayLow || 0)} - {formatCurrency(quote.dayHigh || quote.regularMarketDayHigh || 0)}
                </p>
                <div className="text-sm text-muted-foreground mt-1">
                  Volume: {formatLargeNumber(quote.volume || quote.regularMarketVolume || 0)}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">52 Week Range</p>
                <p className="font-semibold">
                  {formatCurrency(quote.week52Low || quote.fiftyTwoWeekLow || 0)} - {formatCurrency(quote.week52High || quote.fiftyTwoWeekHigh || 0)}
                </p>
                <div className="text-sm text-muted-foreground mt-1">
                  Avg Volume: {formatLargeNumber(quote.averageDailyVolume3Month || 0)}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Market Cap</p>
                <p className="font-semibold">{formatLargeNumber(quote.marketCap || 0)}</p>
                <div className="text-sm text-muted-foreground mt-1">
                  Shares: {formatLargeNumber(quote.sharesOutstanding || 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="technicals">Technicals</TabsTrigger>
          <TabsTrigger value="news">News & Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* StockBeacon Score Breakdown */}
            {score && (
              <Card>
                <CardHeader>
                  <CardTitle>StockBeacon Score Analysis</CardTitle>
                  <CardDescription>AI-powered investment signal</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Overall Score</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getScoreColor(score.score)}`}
                            style={{ width: `${score.score}%` }}
                          />
                        </div>
                        <span className="font-bold">{score.score}/100</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Business Quality</p>
                        <p className="text-lg font-semibold">{score.businessQualityScore}/60</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Timing Score</p>
                        <p className="text-lg font-semibold">{score.timingScore}/40</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Badge 
                        className="mb-3"
                        variant={
                          score.recommendation === 'strong_buy' ? 'default' :
                          score.recommendation === 'buy' ? 'secondary' :
                          score.recommendation === 'hold' ? 'outline' :
                          'destructive'
                        }
                      >
                        {score.recommendation.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <p className="text-sm text-muted-foreground">{score.explanation}</p>
                    </div>

                    {score.strengths && score.strengths.length > 0 && (
                      <div className="pt-2">
                        <p className="text-sm font-semibold text-green-600 mb-1">Strengths:</p>
                        <ul className="text-sm space-y-1">
                          {score.strengths.map((strength: string, i: number) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-green-600">•</span>
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {score.weaknesses && score.weaknesses.length > 0 && (
                      <div className="pt-2">
                        <p className="text-sm font-semibold text-red-600 mb-1">Weaknesses:</p>
                        <ul className="text-sm space-y-1">
                          {score.weaknesses.map((weakness: string, i: number) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-red-600">•</span>
                              <span>{weakness}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Key Statistics</CardTitle>
                <CardDescription>Important metrics at a glance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">P/E Ratio</span>
                    <span className="font-medium">{quote.peRatio ? quote.peRatio.toFixed(2) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">EPS</span>
                    <span className="font-medium">{quote.eps ? formatCurrency(quote.eps) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Market Cap</span>
                    <span className="font-medium">{quote.marketCap ? formatLargeNumber(quote.marketCap) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Volume</span>
                    <span className="font-medium">{quote.volume ? formatLargeNumber(quote.volume) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">52W High</span>
                    <span className="font-medium">{quote.week52High ? formatCurrency(quote.week52High) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">52W Low</span>
                    <span className="font-medium">{quote.week52Low ? formatCurrency(quote.week52Low) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Previous Close</span>
                    <span className="font-medium">{quote.previousClose ? formatCurrency(quote.previousClose) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Day Range</span>
                    <span className="font-medium">
                      {quote.dayLow && quote.dayHigh ? 
                        `${formatCurrency(quote.dayLow)} - ${formatCurrency(quote.dayHigh)}` : 
                        'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Price Chart */}
          {historical && historical.length > 0 ? (
            <ChartWrapper 
              symbol={symbol}
              historicalData={historical}
              currentPrice={quote?.price || quote?.regularMarketPrice}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Price History</CardTitle>
                <CardDescription>Loading chart data...</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted rounded">
                  <div className="animate-pulse">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading historical data...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          {/* AI Moat Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                AI Competitive Moat Analysis
              </CardTitle>
              <CardDescription>
                Powered by AI to identify sustainable competitive advantages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMoat ? (
                <div className="flex items-center justify-center py-8">
                  <Activity className="h-6 w-6 animate-spin mr-2" />
                  <span className="text-muted-foreground">Analyzing competitive moat...</span>
                </div>
              ) : moatAnalysis ? (
                <div className="space-y-6">
                  {/* Overall Moat Score */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Overall Moat Strength</p>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold">{moatAnalysis.overallScore}/100</span>
                        <Badge className={`${
                          moatAnalysis.strength === 'Strong' ? 'bg-green-500' :
                          moatAnalysis.strength === 'Moderate' ? 'bg-yellow-500' :
                          'bg-red-500'
                        } text-white`}>
                          {moatAnalysis.strength} Moat
                        </Badge>
                      </div>
                    </div>
                    <Shield className={`h-12 w-12 ${
                      moatAnalysis.strength === 'Strong' ? 'text-green-500' :
                      moatAnalysis.strength === 'Moderate' ? 'text-yellow-500' :
                      'text-red-500'
                    }`} />
                  </div>

                  {/* Moat Dimensions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Brand Loyalty</span>
                      </div>
                      <Progress value={(moatAnalysis.dimensions.brandLoyalty.score / 25) * 100} className="h-2" />
                      <p className="text-sm text-muted-foreground">
                        {moatAnalysis.dimensions.brandLoyalty.explanation}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Switching Costs</span>
                      </div>
                      <Progress value={(moatAnalysis.dimensions.switchingCosts.score / 25) * 100} className="h-2" />
                      <p className="text-sm text-muted-foreground">
                        {moatAnalysis.dimensions.switchingCosts.explanation}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Network Effects</span>
                      </div>
                      <Progress value={(moatAnalysis.dimensions.networkEffects.score / 25) * 100} className="h-2" />
                      <p className="text-sm text-muted-foreground">
                        {moatAnalysis.dimensions.networkEffects.explanation}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Scale Advantages</span>
                      </div>
                      <Progress value={(moatAnalysis.dimensions.scaleAdvantages.score / 25) * 100} className="h-2" />
                      <p className="text-sm text-muted-foreground">
                        {moatAnalysis.dimensions.scaleAdvantages.explanation}
                      </p>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <h4 className="font-medium mb-2">Summary</h4>
                    <p className="text-sm leading-relaxed">{moatAnalysis.summary}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      AI analysis powered by advanced language models
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => loadMoatAnalysis()}
                    >
                      Refresh Analysis
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Moat analysis not available</p>
                  <Button onClick={() => loadMoatAnalysis()}>
                    Generate AI Analysis
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analyst Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Analyst Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Analyst consensus data coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financials" className="space-y-4">
          {financials && (
            <Card>
              <CardHeader>
                <CardTitle>Financial Metrics</CardTitle>
                <CardDescription>Key financial indicators and ratios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue (TTM)</p>
                    <p className="text-lg font-semibold">{formatLargeNumber(financials.revenue || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gross Profit</p>
                    <p className="text-lg font-semibold">{formatLargeNumber((financials.revenue || 0) * (financials.grossMargin || 0))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Operating Margin</p>
                    <p className="text-lg font-semibold">{formatPercentage(financials.operatingMargin * 100)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Profit Margin</p>
                    <p className="text-lg font-semibold">{formatPercentage(financials.profitMargin * 100)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ROE</p>
                    <p className="text-lg font-semibold">{formatPercentage(financials.returnOnEquity * 100)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ROA</p>
                    <p className="text-lg font-semibold">{formatPercentage(financials.returnOnAssets * 100)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Debt/Equity</p>
                    <p className="text-lg font-semibold">{financials.debtToEquity?.toFixed(2) || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Ratio</p>
                    <p className="text-lg font-semibold">{financials.currentRatio?.toFixed(2) || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="technicals" className="space-y-4">
          {score?.technicalIndicators && (
            <Card>
              <CardHeader>
                <CardTitle>Technical Indicators</CardTitle>
                <CardDescription>Real-time technical analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">RSI (14)</p>
                    <p className="text-lg font-semibold">
                      {score.technicalIndicators.rsi.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {score.technicalIndicators.rsi > 70 ? 'Overbought' : 
                       score.technicalIndicators.rsi < 30 ? 'Oversold' : 'Neutral'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trend</p>
                    <p className={`text-lg font-semibold capitalize ${
                      score.technicalIndicators.trend === 'bullish' ? 'text-green-600' :
                      score.technicalIndicators.trend === 'bearish' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {score.technicalIndicators.trend}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Support</p>
                    <p className="text-lg font-semibold">
                      ${score.technicalIndicators.support.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Resistance</p>
                    <p className="text-lg font-semibold">
                      ${score.technicalIndicators.resistance.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="news" className="space-y-4">
          <NewsFeed symbol={symbol} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
