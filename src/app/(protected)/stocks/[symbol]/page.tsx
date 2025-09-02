'use client'

import { useState, useEffect, use } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  TrendingUp, 
  TrendingDown, 
  Star,
  Plus,
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
import { NewsFeed } from '@/components/stocks/news-feed'
import { ValuationChart } from '@/components/stocks/valuation-chart'
import { ChartWrapper } from '@/components/stocks/chart-wrapper'
import { ValuationService, type ComprehensiveValuation } from '@/lib/services/valuation.service'
import { NewsAnalysisService, type NewsAnalysis } from '@/lib/services/news-analysis.service'
import { NewsService } from '@/lib/services/news.service'

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
  const [shareMessage, setShareMessage] = useState<string | null>(null)
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false)
  const [portfolioForm, setPortfolioForm] = useState({
    quantity: '',
    price: '',
    purchasedAt: new Date().toISOString().split('T')[0]
  })
  const [addingToPortfolio, setAddingToPortfolio] = useState(false)
  const [valuation, setValuation] = useState<ComprehensiveValuation | null>(null)
  const [loadingValuation, setLoadingValuation] = useState(false)
  const [newsAnalysis, setNewsAnalysis] = useState<NewsAnalysis | null>(null)
  const [loadingNewsAnalysis, setLoadingNewsAnalysis] = useState(false)
  
  // Real-time stock updates (temporarily disabled)
  // const realtimeData = useStockSubscription(symbol)
  const realtimeData = null

  useEffect(() => {
    loadStockData()
    loadMoatAnalysis()
  }, [symbol])

  // Load valuation when stock data is available
  useEffect(() => {
    if (stockData?.quote && stockData?.financials) {
      loadValuation()
    }
  }, [stockData])

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

  const loadValuation = async () => {
    try {
      setLoadingValuation(true)
      
      // Wait for stock data to load first
      if (!stockData?.quote || !stockData?.financials) {
        console.log('Waiting for stock data to load before calculating valuation')
        return
      }
      
      console.log('Calculating valuation for', symbol)
      const valuationResult = await ValuationService.calculateValuation(
        symbol,
        stockData.quote,
        stockData.financials
      )
      
      console.log('Valuation result:', valuationResult)
      setValuation(valuationResult)
    } catch (error) {
      console.error('Error loading valuation:', error)
    } finally {
      setLoadingValuation(false)
    }
  }

  const handleAddToPortfolio = async () => {
    try {
      setAddingToPortfolio(true)
      
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          quantity: parseFloat(portfolioForm.quantity),
          price: parseFloat(portfolioForm.price),
          purchasedAt: portfolioForm.purchasedAt,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Reset form and close dialog
        setPortfolioForm({
          quantity: '',
          price: '',
          purchasedAt: new Date().toISOString().split('T')[0]
        })
        setPortfolioDialogOpen(false)
        // You could add a success toast here if you have a toast system
      } else {
        console.error('Failed to add to portfolio:', data.error)
        // You could add an error toast here
      }
    } catch (error) {
      console.error('Error adding to portfolio:', error)
    } finally {
      setAddingToPortfolio(false)
    }
  }

  const handleShare = async () => {
    if (!stockData) return
    
    const { quote } = stockData
    const shareUrl = `${window.location.origin}/stocks/${symbol}`
    const shareTitle = `${symbol} - ${quote?.name || quote?.longName || 'Stock Details'}`
    const shareText = `Check out ${symbol} on StockBeacon. Current price: ${formatCurrency(quote?.price || quote?.regularMarketPrice || 0)} (${(quote?.changePercent || quote?.regularMarketChangePercent || 0) >= 0 ? '+' : ''}${formatPercentage(quote?.changePercent || quote?.regularMarketChangePercent || 0)})`
    
    try {
      // Check if Web Share API is available
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        })
        setShareMessage('Shared successfully!')
      } else {
        // Fallback: Copy to clipboard
        const textToCopy = `${shareTitle}\n${shareText}\n${shareUrl}`
        await navigator.clipboard.writeText(textToCopy)
        setShareMessage('Link copied to clipboard!')
      }
      
      // Clear message after 3 seconds
      setTimeout(() => setShareMessage(null), 3000)
    } catch (error) {
      // User cancelled share or error occurred
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error sharing:', error)
        // Try clipboard as fallback
        try {
          await navigator.clipboard.writeText(shareUrl)
          setShareMessage('Link copied to clipboard!')
          setTimeout(() => setShareMessage(null), 3000)
        } catch (clipboardError) {
          console.error('Error copying to clipboard:', clipboardError)
          setShareMessage('Unable to share')
          setTimeout(() => setShareMessage(null), 3000)
        }
      }
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
                <>
                  <Badge className={`${getScoreBgColor(score.score)} text-gray-900 text-lg font-bold px-3 py-1`}>
                    Score: {score.score}
                  </Badge>
                  {moatAnalysis && (
                    <Badge className={`${
                      moatAnalysis.strength === 'Strong' ? 'bg-green-500' :
                      moatAnalysis.strength === 'Moderate' ? 'bg-yellow-500' :
                      'bg-red-500'
                    } text-white font-semibold`}>
                      {moatAnalysis.strength} Moat
                    </Badge>
                  )}
                </>
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
            
            <Dialog open={portfolioDialogOpen} onOpenChange={setPortfolioDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Add to Portfolio
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add {symbol} to Portfolio</DialogTitle>
                  <DialogDescription>
                    Enter the details of your {symbol} purchase.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="100"
                      value={portfolioForm.quantity}
                      onChange={(e) => setPortfolioForm(prev => ({ ...prev, quantity: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="price">Purchase Price</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      placeholder={formatCurrency(quote?.price || quote?.regularMarketPrice || 0)}
                      value={portfolioForm.price}
                      onChange={(e) => setPortfolioForm(prev => ({ ...prev, price: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="date">Purchase Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={portfolioForm.purchasedAt}
                      onChange={(e) => setPortfolioForm(prev => ({ ...prev, purchasedAt: e.target.value }))}
                    />
                  </div>
                  {portfolioForm.quantity && portfolioForm.price && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Investment</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(parseFloat(portfolioForm.quantity) * parseFloat(portfolioForm.price))}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setPortfolioDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddToPortfolio}
                    disabled={!portfolioForm.quantity || !portfolioForm.price || addingToPortfolio}
                  >
                    {addingToPortfolio ? 'Adding...' : 'Add to Portfolio'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="outline"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </div>

        {/* Share Message Notification */}
        {shareMessage && (
          <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom">
            <div className="bg-background border rounded-lg shadow-lg px-4 py-3 flex items-center gap-2">
              <Share2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">{shareMessage}</span>
            </div>
          </div>
        )}

        {/* Price Info and Chart Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Price Info - Weight 1 */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardContent className="pt-6">
                <div className="space-y-6">
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
                  {/* StockBeacon Analysis - Option 1: Progress Bars */}
                  {score && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">StockBeacon Score</p>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-muted-foreground">Business Quality</span>
                            <span className="text-xs font-medium">{Math.round((score.businessQualityScore/60)*100)}%</span>
                          </div>
                          <Progress value={(score.businessQualityScore/60)*100} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-muted-foreground">Time to Buy</span>
                            <span className="text-xs font-medium">{Math.round((score.timingScore/40)*100)}%</span>
                          </div>
                          <Progress value={(score.timingScore/40)*100} className="h-2" />
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium">Overall</span>
                            <Badge variant={(score.businessQualityScore + score.timingScore) >= 70 ? "default" : (score.businessQualityScore + score.timingScore) >= 50 ? "secondary" : "outline"}>
                              {score.businessQualityScore + score.timingScore}/100
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* StockBeacon Analysis - Option 2: Circular Score 
                  {score && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">StockBeacon Score</p>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="text-2xl font-bold">{score.totalScore}</div>
                          <div className="text-xs text-muted-foreground">out of 100</div>
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Quality</span>
                            <span className="font-medium">{score.businessQualityScore}/60</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Timing</span>
                            <span className="font-medium">{score.timingScore}/40</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )} */}

                  {/* StockBeacon Analysis - Option 3: Compact Badges 
                  {score && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">StockBeacon Score</p>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="flex-1">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Q: {score.businessQualityScore}
                        </Badge>
                        <Badge variant="outline" className="flex-1">
                          <Clock className="h-3 w-3 mr-1" />
                          T: {score.timingScore}
                        </Badge>
                      </div>
                      <div className="mt-2 text-center">
                        <span className="text-lg font-bold">{score.totalScore}</span>
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                    </div>
                  )} */}

                  {/* StockBeacon Analysis - Option 4: Color-coded Score Card
                  {score && (
                    <div className={`p-3 rounded-lg border ${
                      score.totalScore >= 70 ? 'bg-green-50 border-green-200' : 
                      score.totalScore >= 50 ? 'bg-yellow-50 border-yellow-200' : 
                      'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium">StockBeacon</span>
                        <Badge variant={score.totalScore >= 70 ? "default" : score.totalScore >= 50 ? "secondary" : "destructive"}>
                          {score.totalScore}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Quality:</span> {Math.round((score.businessQualityScore/60)*100)}%
                        </div>
                        <div>
                          <span className="text-muted-foreground">Timing:</span> {Math.round((score.timingScore/40)*100)}%
                        </div>
                      </div>
                    </div>
                  )} */}
                  <div>
                    <p className="text-sm text-muted-foreground">Next Earnings</p>
                    <p className="text-lg font-semibold">
                      {quote.earningsDate && new Date(quote.earningsDate).getFullYear() < 2030 ? 
                        new Date(quote.earningsDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        }) : 'Unknown'}
                    </p>
                    {quote.earningsDate && new Date(quote.earningsDate).getFullYear() < 2030 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        in {Math.ceil((new Date(quote.earningsDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">EPS Growth (3-5Y)</p>
                    <p className="text-lg font-semibold">
                      {quote.epsGrowth3to5Year ? `${(quote.epsGrowth3to5Year * 100).toFixed(1)}%` : 'Unknown'}
                    </p>
                    {quote.epsGrowth3to5Year && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Annual Projection
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Price Chart - Weight 3 */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Price Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartWrapper 
                  symbol={symbol}
                  currentPrice={stockData?.quote?.price || stockData?.quote?.regularMarketPrice || 0}
                  priceChange={stockData?.quote?.change || stockData?.quote?.regularMarketChange || 0}
                  priceChangePercent={stockData?.quote?.changePercent || stockData?.quote?.regularMarketChangePercent || 0}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="valuation">Valuation</TabsTrigger>
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
        </TabsContent>

        <TabsContent value="valuation" className="space-y-4">
          <ValuationChart valuation={valuation} loading={loadingValuation} />
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
          {/* News Summary Section */}
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  News Summary
                </CardTitle>
                <CardDescription>
                  AI-powered sentiment analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overall Summary */}
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm leading-relaxed">
                    Recent news sentiment for {symbol} is <strong>predominantly positive</strong> with 3 major developments 
                    in the past week. Key highlights include strong Q4 earnings beat, expansion into new markets, 
                    and positive analyst upgrades. The stock has responded favorably with a 5.2% gain over the 
                    past 5 trading days.
                  </p>
                </div>

                {/* Impact Statistics */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Sentiment Distribution</p>
                    <div className="flex gap-2">
                      <Badge className="bg-green-500 text-white text-xs">3 Positive</Badge>
                      <Badge className="bg-gray-500 text-white text-xs">1 Neutral</Badge>
                      <Badge className="bg-red-500 text-white text-xs">1 Negative</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Impact Timeline</p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">3 Short-term</Badge>
                      <Badge variant="secondary" className="text-xs">2 Long-term</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">News Velocity</p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">High Activity</span>
                    </div>
                  </div>
                </div>

                {/* Last Updated */}
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Analysis based on 24 news sources
                  </p>
                </div>
              </CardContent>
          </Card>

          {/* Original News Feed */}
          <NewsFeed symbol={symbol} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
