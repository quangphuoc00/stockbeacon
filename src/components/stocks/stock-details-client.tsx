'use client'

import { useState, useEffect, useRef } from 'react'
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
  TrendingUp as Scale,
  Building
} from 'lucide-react'
import { formatCurrency, formatPercentage, getScoreColor, getScoreBgColor, formatLargeNumber } from '@/lib/utils'
import Link from 'next/link'
import { useStockSubscription } from '@/lib/hooks'
import { NewsFeed } from '@/components/stocks/news-feed'
import { ValuationChart } from '@/components/stocks/valuation-chart'
import { ChartWrapper } from '@/components/stocks/chart-wrapper'
import { type ComprehensiveValuation } from '@/lib/services/valuation.service'
import { type NewsAnalysis } from '@/lib/services/news-analysis.service'
import { type MoatAnalysis } from '@/lib/services/ai-moat.service'

interface StockDetailsClientProps {
  symbol: string
  initialStockData: any
  initialMoatAnalysis: any
  initialCompanyProfile: any
}

export function StockDetailsClient({ 
  symbol, 
  initialStockData, 
  initialMoatAnalysis,
  initialCompanyProfile 
}: StockDetailsClientProps) {
  const [stockData, setStockData] = useState(initialStockData)
  const [moatAnalysis, setMoatAnalysis] = useState<MoatAnalysis | null>(initialMoatAnalysis)
  const [loadingMoat, setLoadingMoat] = useState(false)
  const [moatError, setMoatError] = useState<string | null>(null)
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
  const [companyProfile, setCompanyProfile] = useState<any>(initialCompanyProfile)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [missingFields, setMissingFields] = useState<any>(null)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [hasLoadedMoat, setHasLoadedMoat] = useState(false)
  const [manualInputs, setManualInputs] = useState<{
    operatingCashflow?: number
    shareholderEquity?: number
    pegRatio?: number
    earningsGrowth?: number
  }>({})
  const [showManualInputs, setShowManualInputs] = useState(false)
  
  // Ref to prevent concurrent valuation loads
  const isLoadingValuationRef = useRef(false)
  
  // Real-time stock updates - disabled to prevent re-render issues
  // const realtimeData = useStockSubscription(symbol)
  const realtimeData: any = null
  
  

  // Update page title with stock symbol and real-time price
  useEffect(() => {
    // Use real-time price if available, otherwise use static price
    const price = realtimeData?.price || 
                  stockData?.quote?.price || 
                  stockData?.quote?.regularMarketPrice || 
                  0
    
    const newTitle = price > 0 
      ? `${symbol} • ${formatCurrency(price)}`
      : stockData?.quote
      ? `${symbol} • ${formatCurrency(0)}`
      : `${symbol} • Loading...`
    
    document.title = newTitle
  }, [symbol, stockData?.quote?.price, stockData?.quote?.regularMarketPrice, realtimeData?.price])

  // Track if we've initiated valuation load for current symbol
  const valuationLoadedForSymbolRef = useRef<string>('')
  
  // Load valuation when stock data is available and valuation tab is selected
  useEffect(() => {
    // Skip if not on valuation tab
    if (selectedTab !== 'valuation') {
      return
    }
    
    // Skip if we don't have required data
    if (!stockData?.quote || !stockData?.financials) {
      return
    }
    
    // Skip if we've already initiated load for this symbol
    if (valuationLoadedForSymbolRef.current === symbol) {
      return
    }
    
    // Skip if currently loading
    if (isLoadingValuationRef.current) {
      return
    }
    
    // Load valuation
    valuationLoadedForSymbolRef.current = symbol
    loadValuation()
  }, [selectedTab, symbol, !!stockData?.quote, !!stockData?.financials]) // Include data availability in deps
  
  // Load company profile when component mounts
  useEffect(() => {
    if (symbol) {
      loadCompanyProfile()
      // Clear valuation when symbol changes
      setValuation(null)
      // Reset the loaded flag for new symbol
      valuationLoadedForSymbolRef.current = ''
    }
  }, [symbol])
  
  // Auto-load moat analysis when analysis tab is selected for the first time
  useEffect(() => {
    if (selectedTab === 'analysis' && !hasLoadedMoat && !moatAnalysis && !loadingMoat) {
      setHasLoadedMoat(true)
      loadMoatAnalysis()
    }
  }, [selectedTab, hasLoadedMoat, moatAnalysis, loadingMoat])
  
  // Auto-load news analysis when needed
  useEffect(() => {
    if (selectedTab === 'valuation' && !newsAnalysis && !loadingNewsAnalysis && valuation) {
      analyzeNews()
    }
  }, [selectedTab, valuation]) // Depend on tab and valuation availability
  
  // Manual inputs are now handled client-side in ValuationChart with instant feedback
  // Server sync happens on blur via handleRecalculateValuation

  const loadMoatAnalysis = async () => {
    setLoadingMoat(true)
    setMoatError(null)
    
    try {
      const response = await fetch(`/api/stocks/${symbol}/moat`)
        const data = await response.json()
      
      if (response.ok) {
        setMoatAnalysis(data.moatAnalysis)
      } else {
        // Handle error response
        if (response.status === 503 && data.fallbackAnalysis) {
          setMoatError('AI moat analysis is temporarily unavailable. Please ensure XAI_API_KEY is configured.')
        } else {
          setMoatError(data.error || 'Failed to generate moat analysis')
        }
      }
    } catch (error) {
      console.error('Error loading moat analysis:', error)
      setMoatError('Network error: Unable to connect to the moat analysis service')
    } finally {
      setLoadingMoat(false)
    }
  }

  const loadCompanyProfile = async () => {
    setLoadingProfile(true)
    
    try {
      const response = await fetch(`/api/stocks/${symbol}/profile`)
      if (response.ok) {
        const data = await response.json()
        setCompanyProfile(data)
      }
    } catch (error) {
      console.error('Error loading company profile:', error)
    } finally {
      setLoadingProfile(false)
    }
  }

  const loadValuation = async () => {
    // Prevent concurrent loads
    if (isLoadingValuationRef.current) {
      return
    }
    
    isLoadingValuationRef.current = true
    setLoadingValuation(true)
    
    try {
      const response = await fetch(`/api/stocks/${symbol}/valuation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockData,
          manualInputs
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setValuation(data.valuation)
      } else {
        console.error('Failed to calculate valuation')
      }
    } catch (error) {
      console.error('Error loading valuation:', error)
    } finally {
      setLoadingValuation(false)
      isLoadingValuationRef.current = false
    }
  }

  const analyzeNews = async () => {
    setLoadingNewsAnalysis(true)
    
    try {
      const response = await fetch(`/api/stocks/${symbol}/news?limit=10&analyze=true`)
      if (response.ok) {
        const data = await response.json()
        if (data.analysis) {
          setNewsAnalysis(data.analysis)
        }
      }
    } catch (error) {
      console.error('Error analyzing news:', error)
    } finally {
      setLoadingNewsAnalysis(false)
    }
  }

  const handleWatchlistToggle = async () => {
    try {
      const method = isWatching ? 'DELETE' : 'POST'
      const response = await fetch('/api/watchlist', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      })
      
      if (response.ok) {
        setIsWatching(!isWatching)
      }
    } catch (error) {
      console.error('Error updating watchlist:', error)
    }
  }

  const handleShare = async () => {
    const quote = stockData?.quote
    if (!quote) return
    
    const shareTitle = `${symbol} - ${quote?.name || quote?.longName || 'Stock Details'}`
    const shareText = `Check out ${symbol} on StockBeacon. Current price: ${formatCurrency(quote?.price || quote?.regularMarketPrice || 0)} (${(quote?.changePercent || quote?.regularMarketChangePercent || 0) >= 0 ? '+' : ''}${formatPercentage(quote?.changePercent || quote?.regularMarketChangePercent || 0)})`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.href
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`)
      setShareMessage('Link copied to clipboard!')
      setTimeout(() => setShareMessage(null), 3000)
    }
  }

  const handleAddToPortfolio = async () => {
    setAddingToPortfolio(true)
    
    try {
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          quantity: parseFloat(portfolioForm.quantity),
          purchasePrice: parseFloat(portfolioForm.price),
          purchasedAt: portfolioForm.purchasedAt
        })
      })
      
      if (response.ok) {
        setPortfolioDialogOpen(false)
        setPortfolioForm({
          quantity: '',
          price: '',
          purchasedAt: new Date().toISOString().split('T')[0]
        })
      }
    } catch (error) {
      console.error('Error adding to portfolio:', error)
    } finally {
      setAddingToPortfolio(false)
    }
  }

  const getRecommendation = () => {
    const score = stockData?.stockbeaconScore?.overall || 0
    if (score >= 80) return { action: 'Strong Buy', color: 'text-green-600' }
    if (score >= 60) return { action: 'Buy', color: 'text-green-500' }
    if (score >= 40) return { action: 'Hold', color: 'text-yellow-600' }
    if (score >= 20) return { action: 'Sell', color: 'text-red-500' }
    return { action: 'Strong Sell', color: 'text-red-600' }
  }

  const getMoatColor = (moatStrength: string) => {
    switch (moatStrength) {
      case 'Strong':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'Moderate':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'Weak':
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const handleRecalculateValuation = () => {
    // Prevent recalculation if already loading
    if (!isLoadingValuationRef.current) {
      loadValuation()
    }
  }

  // Get the quote and other data
  const quote = realtimeData || stockData?.quote
  const score = stockData?.stockbeaconScore
  const financials = stockData?.financials
  const historical = stockData?.historical

  if (!stockData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Stock data not available</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const recommendation = getRecommendation()

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
                  {moatAnalysis?.strength && (
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
            <div className="flex items-center gap-3 mt-2">
              {quote.exchange && <span className="text-sm text-muted-foreground">{quote.exchange}</span>}
              {quote.sector && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {quote.sector}
                </Badge>
              )}
              {quote.industry && (
                <Badge variant="outline" className="text-xs">
                  {quote.industry}
                </Badge>
              )}
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
              onClick={handleWatchlistToggle}
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
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">Current Price</p>
                      {realtimeData && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-xs text-green-600">Live</span>
                        </div>
                      )}
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(realtimeData?.price || quote.price || quote.regularMarketPrice || 0)}</p>
                    <div className={`flex items-center gap-1 mt-1 ${(realtimeData?.changePercent || quote.changePercent || quote.regularMarketChangePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(realtimeData?.changePercent || quote.changePercent || quote.regularMarketChangePercent || 0) >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      <span className="font-semibold">
                        {formatCurrency(Math.abs(realtimeData?.change || quote.change || quote.regularMarketChange || 0))} ({formatPercentage(Math.abs(realtimeData?.changePercent || quote.changePercent || quote.regularMarketChangePercent || 0))})
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
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Business Quality</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${score.businessQualityScore >= 35 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {score.businessQualityScore >= 35 ? '✓' : '○'} Strong Financials
                          </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${score.businessQualityScore >= 45 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {score.businessQualityScore >= 45 ? '✓' : '○'} Competitive Moat
                        </span>
                  </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${score.businessQualityScore >= 55 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {score.businessQualityScore >= 55 ? '✓' : '○'} Growth Potential
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Time to Buy</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${score.timingScore >= 25 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {score.timingScore >= 25 ? '✓' : '○'} Fair Valuation
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${score.timingScore >= 35 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {score.timingScore >= 35 ? '✓' : '○'} Positive Momentum
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${(score.businessQualityScore + score.timingScore) >= 70 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {(score.businessQualityScore + score.timingScore) >= 70 ? '✓' : '○'} Buy Signal
                        </span>
                      </div>
                    </div>
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
      <Tabs defaultValue="overview" value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">Moat Analysis</TabsTrigger>
          <TabsTrigger value="valuation">Intrinsic Value</TabsTrigger>
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

          {/* Company Profile */}
          {loadingProfile ? (
            <Card>
              <CardHeader>
                <CardTitle>Company Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent animate-spin"></div>
                      <div className="absolute inset-2 rounded-full bg-gradient-to-bl from-primary/10 via-transparent to-primary/10 animate-spin-reverse"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Building className="w-6 h-6 text-primary animate-pulse-subtle" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <span className="text-sm text-muted-foreground">Loading company information</span>
                      <span className="flex gap-1">
                        <span className="w-1 h-1 bg-primary rounded-full animate-bounce-dot" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1 h-1 bg-primary rounded-full animate-bounce-dot" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1 h-1 bg-primary rounded-full animate-bounce-dot" style={{ animationDelay: '300ms' }}></span>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : companyProfile ? (
            <Card>
              <CardHeader>
                <CardTitle>Company Profile</CardTitle>
                {companyProfile.sector && companyProfile.industry && (
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline">{companyProfile.sector}</Badge>
                    <Badge variant="outline">{companyProfile.industry}</Badge>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Business Description */}
                  {companyProfile.businessSummary && (
                    <div>
                      <h4 className="font-semibold mb-2 text-sm">About {quote.name}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {companyProfile.businessSummary}
                      </p>
                    </div>
                  )}

                  {/* Company Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    {companyProfile.website && (
                      <div>
                        <p className="text-sm text-muted-foreground">Website</p>
                        <a 
                          href={companyProfile.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {companyProfile.website}
                        </a>
                      </div>
                    )}
                    
                    {companyProfile.fullTimeEmployees && (
                      <div>
                        <p className="text-sm text-muted-foreground">Employees</p>
                        <p className="text-sm font-medium">
                          {companyProfile.fullTimeEmployees.toLocaleString()}
                        </p>
                      </div>
                    )}
                    
                    {companyProfile.address && (
                      <div>
                        <p className="text-sm text-muted-foreground">Headquarters</p>
                        <p className="text-sm">
                          {companyProfile.city}{companyProfile.state && `, ${companyProfile.state}`}
                          {companyProfile.country && `, ${companyProfile.country}`}
                        </p>
                      </div>
                    )}
                    
                    {companyProfile.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="text-sm">{companyProfile.phone}</p>
                      </div>
                    )}
                  </div>

                  {/* Key Executives */}
                  {companyProfile.companyOfficers && companyProfile.companyOfficers.length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-3 text-sm">Key Executives</h4>
                      <div className="space-y-2">
                        {/* Header row for clarity */}
                        <div className="flex justify-between items-center text-xs text-muted-foreground pb-1 border-b">
                          <span>Name & Title</span>
                          <span>Annual Compensation</span>
                        </div>
                        {companyProfile.companyOfficers.slice(0, 5).map((officer: any, index: number) => (
                          <div key={index} className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium">{officer.name}</p>
                              <p className="text-xs text-muted-foreground">{officer.title}</p>
                            </div>
                            {officer.totalPay && (
                              <p className="text-sm text-muted-foreground">
                                ${(officer.totalPay / 1000000).toFixed(1)}M
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
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
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent animate-spin" />
                      <div className="absolute inset-2 rounded-full bg-gradient-to-bl from-primary/10 via-transparent to-primary/10 animate-spin-reverse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Shield className="w-10 h-10 text-primary animate-pulse-subtle" />
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm text-muted-foreground">Analyzing competitive moat</span>
                        <span className="flex gap-1">
                          <span className="w-1 h-1 bg-primary rounded-full animate-bounce-dot" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 bg-primary rounded-full animate-bounce-dot" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 bg-primary rounded-full animate-bounce-dot" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : moatAnalysis ? (
                <div className="space-y-6">
                  {/* Overall Moat Score */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Overall Moat Type</p>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold">{moatAnalysis.overallScore}/100</span>
                        <Badge className={`${getMoatColor(moatAnalysis.strength)}`}>
                          {moatAnalysis.strength} Moat
                        </Badge>
                      </div>
                    </div>
                    <Shield className={`h-12 w-12 ${
                      moatAnalysis.strength === 'Strong' ? 'text-green-500' :
                      moatAnalysis.strength === 'Moderate' ? 'text-yellow-500' :
                      'text-gray-500'
                    }`} />
                  </div>

                  {/* Moat Dimensions */}
                  {moatAnalysis.dimensions && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        Moat Dimensions
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(moatAnalysis.dimensions).map(([key, dimension]: [string, any]) => (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              <span className="text-sm font-bold">{dimension.score}/25</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{dimension.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {moatAnalysis.summary && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <h4 className="font-medium mb-2">Moat Analysis Summary</h4>
                      <p className="text-sm leading-relaxed">{moatAnalysis.summary}</p>
                    </div>
                  )}

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
              ) : moatError ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <p className="text-destructive font-medium mb-2">Error Loading Analysis</p>
                  <p className="text-sm text-muted-foreground mb-4">{moatError}</p>
                  <Button onClick={() => loadMoatAnalysis()} variant="outline">
                    Try Again
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="valuation" className="space-y-4">
          <div key={`valuation-${symbol}`}>
            
            <ValuationChart 
              valuation={valuation} 
              loading={loadingValuation} 
              onRecalculate={handleRecalculateValuation}
              missingFields={missingFields || {}}
              manualInputs={manualInputs}
              onManualInputChange={setManualInputs}
            />
          </div>
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
                <CardTitle>Technical Analysis</CardTitle>
                <CardDescription>Long-term trend and key price levels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Market Trend Section */}
                <div className="border-b pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Long-Term Market Trend</h3>
                      <div className="flex items-center gap-3">
                        <p className={`text-2xl font-bold capitalize ${
                          score.technicalIndicators.trend === 'bullish' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {score.technicalIndicators.trend}
                        </p>
                        <div className={`text-3xl ${
                          score.technicalIndicators.trend === 'bullish' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {score.technicalIndicators.trend === 'bullish' ? '↗' : '↘'}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {score.technicalIndicators.sma200 === 0 ? 
                         `Based on Price ${score.technicalIndicators.trend === 'bullish' ? '>' : '<'} MA50` :
                         score.technicalIndicators.trend === 'bullish' ? 'Price > MA50 > MA200' :
                         'Price < MA50 < MA200'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Key Levels */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Key Price Levels</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                      <div className="w-full">
                        <p className="text-sm text-muted-foreground mb-1">Next Support</p>
                        <p className="text-xl font-bold text-green-600">${score.technicalIndicators.support.toFixed(2)}</p>
                        <p className="text-sm text-green-600 mt-1">
                          {quote.price && score.technicalIndicators.support ? 
                            `${Math.abs((score.technicalIndicators.support - quote.price) / quote.price * 100).toFixed(1)}% below current price` : 
                            'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                      <div className="w-full">
                        <p className="text-sm text-muted-foreground mb-1">Next Resistance</p>
                        <p className="text-xl font-bold text-red-600">${score.technicalIndicators.resistance.toFixed(2)}</p>
                        <p className="text-sm text-red-600 mt-1">
                          {quote.price && score.technicalIndicators.resistance ? 
                            `${Math.abs((score.technicalIndicators.resistance - quote.price) / quote.price * 100).toFixed(1)}% above current price` : 
                            'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="news" className="space-y-4">
          {/* News Summary Section */}
          {newsAnalysis ? (
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
                    {newsAnalysis.summary}
                  </p>
                </div>

                {/* Impact Statistics */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Sentiment Distribution</p>
                    <div className="flex gap-2">
                      {newsAnalysis.sentimentCounts.positive > 0 && (
                        <Badge className="bg-green-500 text-white text-xs">{newsAnalysis.sentimentCounts.positive} Positive</Badge>
                      )}
                      {newsAnalysis.sentimentCounts.neutral > 0 && (
                        <Badge className="bg-gray-500 text-white text-xs">{newsAnalysis.sentimentCounts.neutral} Neutral</Badge>
                      )}
                      {newsAnalysis.sentimentCounts.negative > 0 && (
                        <Badge className="bg-red-500 text-white text-xs">{newsAnalysis.sentimentCounts.negative} Negative</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Key Highlights</p>
                    <div className="flex flex-wrap gap-2">
                      {newsAnalysis.keyHighlights.map((highlight, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{highlight}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">News Velocity</p>
                    <Badge 
                      variant={
                        newsAnalysis.newsVelocity === 'high' ? 'default' :
                        newsAnalysis.newsVelocity === 'low' ? 'secondary' :
                        'outline'
                      }
                    >
                      {newsAnalysis.newsVelocity} activity
                    </Badge>
                  </div>
                </div>

                {/* Last Updated */}
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Analysis based on {newsAnalysis.totalArticles} news sources
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : loadingNewsAnalysis ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex items-center justify-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent animate-spin" />
                      <div className="absolute inset-2 rounded-full bg-gradient-to-bl from-primary/10 via-transparent to-primary/10 animate-spin-reverse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Activity className="w-10 h-10 text-primary animate-pulse-subtle" />
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm text-muted-foreground">Analyzing news sentiment</span>
                        <span className="flex gap-1">
                          <span className="w-1 h-1 bg-primary rounded-full animate-bounce-dot" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 bg-primary rounded-full animate-bounce-dot" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 bg-primary rounded-full animate-bounce-dot" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Original News Feed */}
          <NewsFeed symbol={symbol} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
