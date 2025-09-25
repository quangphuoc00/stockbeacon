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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
  Building,
  HelpCircle,
  ChevronRight
} from 'lucide-react'
import { formatCurrency, formatPercentage, getScoreColor, getScoreBgColor, formatLargeNumber } from '@/lib/utils'
import Link from 'next/link'
import { useStockSubscription } from '@/lib/hooks'
import { NewsFeed } from '@/components/stocks/news-feed'
import { AINewsSummary } from '@/components/stocks/ai-news-summary'
import { NewsEducationGuide } from '@/components/stocks/news-education-guide'
import { ValuationChart } from '@/components/stocks/valuation-chart'
import { ChartWrapper } from '@/components/stocks/chart-wrapper'
import { type ComprehensiveValuation } from '@/lib/services/valuation.service'
import { type NewsAnalysis } from '@/lib/services/news-analysis.service'
import { type MoatAnalysis } from '@/lib/services/ai-moat.service'
import { CompanyProfileShimmer, MoatAnalysisShimmer } from '@/components/ui/shimmer'
import { FinancialStatementTable } from '@/components/stocks/financial-statement-table'
import { FinancialAnalysisDashboard } from '@/components/stocks/financial-analysis-dashboard'
import { type FinancialStatements } from '@/types/stock'

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
  console.log(`[StockDetailsClient] Initializing for ${symbol}`)
  console.log(`  - Initial moat analysis: ${initialMoatAnalysis ? `Yes (${initialMoatAnalysis.overallScore}/100)` : 'No'}`)
  console.log(`  - Initial score: ${initialStockData?.stockbeaconScore?.score || 'N/A'} (moat: ${initialStockData?.stockbeaconScore?.moatScore || 'N/A'}/20)`)
  
  const [stockData, setStockData] = useState(initialStockData)
  const [moatAnalysis, setMoatAnalysis] = useState<MoatAnalysis | null>(initialMoatAnalysis)
  const [loadingMoat, setLoadingMoat] = useState(false) // Don't auto-start loading
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
  const [manualInputs, setManualInputs] = useState<{
    operatingCashflow?: number
    shareholderEquity?: number
    pegRatio?: number
    earningsGrowth?: number
  }>({})
  const [showManualInputs, setShowManualInputs] = useState(false)
  const [financialStatements, setFinancialStatements] = useState<FinancialStatements | null>(null)
  const [loadingFinancialStatements, setLoadingFinancialStatements] = useState(false)
  const [showFinancialStatements, setShowFinancialStatements] = useState(false)
  const [aiEvaluation, setAIEvaluation] = useState<any>(null)
  const [loadingAIEvaluation, setLoadingAIEvaluation] = useState(false)
  const [showFullAIAnalysis, setShowFullAIAnalysis] = useState(false)
  
  // Ref to prevent concurrent valuation loads
  const isLoadingValuationRef = useRef(false)
  
  // Ref for tabs section for smooth scrolling
  const tabsRef = useRef<HTMLDivElement>(null)
  
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

  // Load moat analysis immediately on page load if not available
  useEffect(() => {
    if (!moatAnalysis && !moatError) {
      console.log('[StockDetailsClient] Loading moat analysis on mount...')
      loadMoatAnalysis()
    }
  }, []) // Only run on mount

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
      console.log(`[StockDetailsClient] Symbol changed to ${symbol}, loading company profile and resetting state`)
      loadCompanyProfile()
      // Clear valuation when symbol changes
      setValuation(null)
      // Reset the loaded flag for new symbol
      valuationLoadedForSymbolRef.current = ''
    }
  }, [symbol])
  
  // Financial statements now load on demand when user clicks "Show Statements"
  // useEffect(() => {
  //   if (selectedTab === 'financials' && !financialStatements && !loadingFinancialStatements) {
  //     loadFinancialStatements()
  //   }
  // }, [selectedTab, symbol])
  
  // No longer needed - moat loads on mount
  // useEffect(() => {
  //   if (selectedTab === 'analysis' && !moatAnalysis && !loadingMoat && !moatError) {
  //     loadMoatAnalysis()
  //   }
  // }, [selectedTab, moatAnalysis, loadingMoat, moatError])
  
  // Auto-load news analysis when needed
  useEffect(() => {
    if ((selectedTab === 'valuation' && valuation) || selectedTab === 'news') {
      if (!newsAnalysis && !loadingNewsAnalysis) {
        console.log(`[StockDetailsClient] Auto-loading news analysis for ${symbol} - tab: ${selectedTab}, has valuation: ${!!valuation}`)
        analyzeNews()
      }
    }
  }, [selectedTab, valuation]) // Depend on tab and valuation availability
  
  // Manual inputs are now handled client-side in ValuationChart with instant feedback
  // Server sync happens on blur via handleRecalculateValuation

  const loadMoatAnalysis = async () => {
    const startTime = Date.now()
    console.log(`[StockDetailsClient] Starting moat analysis load for ${symbol} at ${new Date().toISOString()}`)
    setLoadingMoat(true)
    setMoatError(null)
    
    try {
      // Add timeout to prevent infinite loading
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log(`[StockDetailsClient] Moat analysis timeout for ${symbol} after 30 seconds`)
        controller.abort()
      }, 30000) // 30 second timeout
      
      console.log(`[StockDetailsClient] Fetching moat analysis from /api/stocks/${symbol}/moat`)
      const response = await fetch(`/api/stocks/${symbol}/moat`, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      const fetchTime = Date.now() - startTime
      console.log(`[StockDetailsClient] Moat analysis response received for ${symbol} in ${fetchTime}ms - status: ${response.status}`)
      
      const data = await response.json()
      
      if (response.ok) {
        console.log(`[StockDetailsClient] Moat analysis data for ${symbol}:`, {
          hasAnalysis: !!data.moatAnalysis,
          overallScore: data.moatAnalysis?.overallScore,
          strengthsCount: data.moatAnalysis?.strengths?.length,
          risksCount: data.moatAnalysis?.risks?.length,
          source: data.source || 'unknown'
        })
        setMoatAnalysis(data.moatAnalysis)
        
        // Recalculate score with the new moat analysis
        console.log(`[StockDetailsClient] Moat analysis loaded, recalculating score for ${symbol}...`)
        const scoreStartTime = Date.now()
        const scoreResponse = await fetch(`/api/stocks/${symbol}/recalculate-score`, {
          method: 'POST'
        })
        const scoreTime = Date.now() - scoreStartTime
        
        if (scoreResponse.ok) {
          const scoreData = await scoreResponse.json()
          console.log(`[StockDetailsClient] Score recalculated for ${symbol} in ${scoreTime}ms:`, {
            oldScore: stockData?.stockbeaconScore?.score,
            newScore: scoreData.score?.score,
            oldMoatScore: stockData?.stockbeaconScore?.moatScore,
            newMoatScore: scoreData.score?.moatScore
          })
          
          // Update stockData with new score
          setStockData((prevData: any) => ({
            ...prevData,
            stockbeaconScore: scoreData.score
          }))
        } else {
          console.error(`[StockDetailsClient] Failed to recalculate score for ${symbol} - status: ${scoreResponse.status}`)
        }
      } else {
        // Handle error response
        console.error(`[StockDetailsClient] Moat analysis error response for ${symbol}:`, {
          status: response.status,
          error: data.error,
          hasFallback: !!data.fallbackAnalysis
        })
        if (response.status === 503 && data.fallbackAnalysis) {
          setMoatError('AI moat analysis is temporarily unavailable. Please ensure XAI_API_KEY is configured.')
        } else {
          setMoatError(data.error || 'Failed to generate moat analysis')
        }
      }
    } catch (error: any) {
      const fetchTime = Date.now() - startTime
      console.error(`[StockDetailsClient] Error loading moat analysis for ${symbol} after ${fetchTime}ms:`, error)
      console.error('[StockDetailsClient] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      if (error.name === 'AbortError') {
        setMoatError('Request timed out. Please try again.')
      } else {
        setMoatError('Network error: Unable to connect to the moat analysis service')
      }
    } finally {
      setLoadingMoat(false)
      const totalTime = Date.now() - startTime
      console.log(`[StockDetailsClient] Moat analysis process completed for ${symbol} in ${totalTime}ms`)
    }
  }

  const loadCompanyProfile = async () => {
    const startTime = Date.now()
    console.log(`[StockDetailsClient] Starting company profile load for ${symbol}`)
    setLoadingProfile(true)
    
    try {
      const response = await fetch(`/api/stocks/${symbol}/profile`)
      const fetchTime = Date.now() - startTime
      
      if (response.ok) {
        const data = await response.json()
        console.log(`[StockDetailsClient] Company profile loaded for ${symbol} in ${fetchTime}ms`, {
          hasProfile: !!data,
          name: data?.businessSummary ? data.businessSummary.substring(0, 50) + '...' : 'N/A',
          sector: data?.sector,
          industry: data?.industry,
          country: data?.country,
          website: data?.website,
          employees: data?.fullTimeEmployees
        })
        setCompanyProfile(data)
      } else {
        console.error(`[StockDetailsClient] Failed to load company profile for ${symbol} - status: ${response.status} after ${fetchTime}ms`)
      }
    } catch (error) {
      const fetchTime = Date.now() - startTime
      console.error(`[StockDetailsClient] Error loading company profile for ${symbol} after ${fetchTime}ms:`, error)
    } finally {
      setLoadingProfile(false)
    }
  }

  const loadValuation = async () => {
    // Prevent concurrent loads
    if (isLoadingValuationRef.current) {
      console.log('[StockDetailsClient] Skipping valuation load - already loading')
      return
    }
    
    const startTime = Date.now()
    console.log(`[StockDetailsClient] Starting valuation load for ${symbol}`)
    console.log('[StockDetailsClient] Valuation request data:', {
      hasStockData: !!stockData,
      hasQuote: !!stockData?.quote,
      hasFinancials: !!stockData?.financials,
      manualInputs: Object.keys(manualInputs || {}).length > 0 ? manualInputs : 'none'
    })
    
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
      
      const fetchTime = Date.now() - startTime
      
      if (response.ok) {
        const data = await response.json()
        console.log(`[StockDetailsClient] Valuation loaded successfully for ${symbol} in ${fetchTime}ms`, {
          fairValue: data.valuation?.fairValue,
          currentPrice: data.valuation?.currentPrice,
          upside: data.valuation?.upside,
          confidence: data.valuation?.confidence
        })
        setValuation(data.valuation)
      } else {
        console.error(`[StockDetailsClient] Failed to calculate valuation for ${symbol} - status: ${response.status} after ${fetchTime}ms`)
        const errorText = await response.text()
        console.error('[StockDetailsClient] Error response:', errorText)
      }
    } catch (error) {
      const fetchTime = Date.now() - startTime
      console.error(`[StockDetailsClient] Error loading valuation for ${symbol} after ${fetchTime}ms:`, error)
      console.error('[StockDetailsClient] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    } finally {
      setLoadingValuation(false)
      isLoadingValuationRef.current = false
      console.log(`[StockDetailsClient] Valuation load completed for ${symbol}`)
    }
  }

  const analyzeNews = async () => {
    const startTime = Date.now()
    console.log(`[StockDetailsClient] Starting news analysis for ${symbol}`)
    setLoadingNewsAnalysis(true)
    
    try {
      // Get news with analysis - this will fetch the same news that NewsFeed displays
      // Add timestamp and bypassCache to ensure fresh data
      const url = `/api/stocks/${symbol}/news?analyze=true&forDisplay=true&bypassCache=true&t=${Date.now()}`
      console.log('[StockDetailsClient] News analysis URL:', url)
      
      const response = await fetch(url)
      const fetchTime = Date.now() - startTime
      
      if (response.ok) {
        const data = await response.json()
        console.log(`[StockDetailsClient] News analysis successful for ${symbol} in ${fetchTime}ms`, {
          hasAnalysis: !!data.analysis,
          sentiment: data.analysis?.overall?.sentiment,
          score: data.analysis?.overall?.score,
          newsCount: data.articles?.length,
          analyzedCount: data.analysis?.articles?.length
        })
        if (data.analysis) {
          setNewsAnalysis(data.analysis)
        }
      } else {
        console.error(`[StockDetailsClient] News analysis failed for ${symbol} - status: ${response.status} after ${fetchTime}ms`)
      }
    } catch (error) {
      const fetchTime = Date.now() - startTime
      console.error(`[StockDetailsClient] Error analyzing news for ${symbol} after ${fetchTime}ms:`, error)
    } finally {
      setLoadingNewsAnalysis(false)
    }
  }

  const loadFinancialStatements = async () => {
    if (loadingFinancialStatements) {
      console.log('[StockDetailsClient] Skipping financial statements load - already loading')
      return
    }
    
    const startTime = Date.now()
    console.log(`[StockDetailsClient] Starting financial statements load for ${symbol}`)
    setLoadingFinancialStatements(true)
    
    try {
      // Add timestamp to bypass cache
      const response = await fetch(`/api/stocks/${symbol}/financial-statements?t=${Date.now()}`)
      const fetchTime = Date.now() - startTime
      
      if (response.ok) {
        const data = await response.json()
        console.log(`[StockDetailsClient] Financial statements loaded for ${symbol} in ${fetchTime}ms`, {
          hasStatements: !!data,
          hasIncomeStatements: !!data?.incomeStatements,
          hasBalanceSheets: !!data?.balanceSheets,
          hasCashFlowStatements: !!data?.cashFlowStatements,
          quarterlyRevenue: data?.incomeStatements?.quarterly?.[0]?.revenue
        })
        setFinancialStatements(data)
      } else {
        console.error(`[StockDetailsClient] Failed to load financial statements for ${symbol} - status: ${response.status} after ${fetchTime}ms`)
      }
    } catch (error) {
      const fetchTime = Date.now() - startTime
      console.error(`[StockDetailsClient] Error loading financial statements for ${symbol} after ${fetchTime}ms:`, error)
    } finally {
      setLoadingFinancialStatements(false)
    }
  }

  const loadAIEvaluation = async () => {
    if (loadingAIEvaluation) {
      console.log('[StockDetailsClient] Skipping AI evaluation - already loading')
      return
    }
    
    const startTime = Date.now()
    console.log(`[StockDetailsClient] Starting AI evaluation for ${symbol}`)
    setLoadingAIEvaluation(true)
    
    try {
      const response = await fetch(`/api/stocks/${symbol}/ai-evaluation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockData,
          financialStatements,
          companyProfile,
          moatAnalysis,
          valuation
        })
      })
      
      const fetchTime = Date.now() - startTime
      
      if (response.ok) {
        const data = await response.json()
        console.log(`[StockDetailsClient] AI evaluation loaded for ${symbol} in ${fetchTime}ms`, {
          hasEvaluation: !!data.evaluation,
          recommendation: data.evaluation?.recommendation
        })
        setAIEvaluation(data.evaluation)
      } else {
        console.error(`[StockDetailsClient] Failed to load AI evaluation for ${symbol} - status: ${response.status} after ${fetchTime}ms`)
      }
    } catch (error) {
      const fetchTime = Date.now() - startTime
      console.error(`[StockDetailsClient] Error loading AI evaluation for ${symbol} after ${fetchTime}ms:`, error)
    } finally {
      setLoadingAIEvaluation(false)
    }
  }

  const handleWatchlistToggle = async () => {
    const startTime = Date.now()
    const action = isWatching ? 'remove from' : 'add to'
    console.log(`[StockDetailsClient] Attempting to ${action} watchlist: ${symbol}`)
    
    try {
      const method = isWatching ? 'DELETE' : 'POST'
      const response = await fetch('/api/watchlist', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      })
      
      const fetchTime = Date.now() - startTime
      
      if (response.ok) {
        console.log(`[StockDetailsClient] Successfully ${action}d watchlist for ${symbol} in ${fetchTime}ms`)
        setIsWatching(!isWatching)
      } else {
        console.error(`[StockDetailsClient] Failed to ${action} watchlist for ${symbol} - status: ${response.status} after ${fetchTime}ms`)
      }
    } catch (error) {
      const fetchTime = Date.now() - startTime
      console.error(`[StockDetailsClient] Error updating watchlist for ${symbol} after ${fetchTime}ms:`, error)
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

  const handleMetricClick = (tabValue: string) => {
    // Smooth scroll to tabs section
    if (tabsRef.current) {
      tabsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    
    // Switch to the appropriate tab after a short delay to allow scrolling
    setTimeout(() => {
      setSelectedTab(tabValue)
    }, 300)
  }

  // Get the quote and other data
  const quote = realtimeData || stockData?.quote
  const score = stockData?.stockbeaconScore
  const financials = stockData?.financials
  const historical = stockData?.historical
  
  // Debug logging
  if (score) {
    console.log(`[UI] Displaying scores - Total: ${score.score}, Moat: ${score.moatScore}/20`)
  }

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
    <TooltipProvider>
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

        {/* Full AI Analysis Dialog */}
        <Dialog open={showFullAIAnalysis} onOpenChange={setShowFullAIAnalysis}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI Stock Evaluation - {symbol}</DialogTitle>
              <DialogDescription>
                Comprehensive analysis using our 7-step investment framework
              </DialogDescription>
            </DialogHeader>
            {aiEvaluation && (
              <div className="space-y-6 py-4">
                {/* Recommendation */}
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">{aiEvaluation.recommendation}</h3>
                  <p className="text-muted-foreground">{aiEvaluation.summary}</p>
                </div>
                
                {/* 7-Step Analysis */}
                {aiEvaluation.steps && (
                  <div className="space-y-4">
                    {Object.entries(aiEvaluation.steps).map(([stepName, stepData]: [string, any]) => (
                      <div key={stepName} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">{stepData.title}</h4>
                        <div className="space-y-2">
                          {stepData.analysis && (
                            <p className="text-sm text-muted-foreground">{stepData.analysis}</p>
                          )}
                          {stepData.metrics && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {Object.entries(stepData.metrics).map(([metric, value]: [string, any]) => (
                                <div key={metric} className="text-sm">
                                  <span className="text-muted-foreground">{metric}:</span>
                                  <span className="ml-2 font-medium">{value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {stepData.score && (
                            <div className="mt-2">
                              <Progress value={stepData.score} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">{stepData.score}%</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Key Risks and Opportunities */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiEvaluation.risks && (
                    <div>
                      <h4 className="font-medium mb-2 text-red-600">Key Risks</h4>
                      <ul className="space-y-1">
                        {aiEvaluation.risks.map((risk: string, idx: number) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <AlertCircle className="h-3 w-3 text-red-500 mt-0.5" />
                            <span className="text-muted-foreground">{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiEvaluation.opportunities && (
                    <div>
                      <h4 className="font-medium mb-2 text-green-600">Opportunities</h4>
                      <ul className="space-y-1">
                        {aiEvaluation.opportunities.map((opp: string, idx: number) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <TrendingUp className="h-3 w-3 text-green-500 mt-0.5" />
                            <span className="text-muted-foreground">{opp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                {/* Timestamp */}
                <div className="text-xs text-muted-foreground text-center pt-4 border-t">
                  Analysis generated on {new Date().toLocaleString()}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

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
                            {loadingMoat || (!moatAnalysis && !moatError) || score.moatScore === 0 ? (
                              <div className="h-3 w-8 bg-muted animate-pulse rounded" />
                            ) : (
                              <span className="text-xs font-medium">{Math.round((score.businessQualityScore/60)*100)}%</span>
                            )}
                          </div>
                          {loadingMoat || (!moatAnalysis && !moatError) || score.moatScore === 0 ? (
                            <div className="h-2 w-full bg-muted animate-pulse rounded" />
                          ) : (
                            <Progress value={(score.businessQualityScore/60)*100} className="h-2" />
                          )}
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
                            {loadingMoat || (!moatAnalysis && !moatError) || score.moatScore === 0 ? (
                              <div className="h-5 w-12 bg-muted animate-pulse rounded" />
                            ) : (
                              <Badge variant={(score.businessQualityScore + score.timingScore) >= 70 ? "default" : (score.businessQualityScore + score.timingScore) >= 50 ? "secondary" : "outline"}>
                                {score.businessQualityScore + score.timingScore}/100
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Business Quality {loadingMoat || (!moatAnalysis && !moatError) || score.moatScore === 0 ? (
                        <span className="inline-block h-4 w-12 bg-muted animate-pulse rounded ml-1" />
                      ) : (
                        <span>({score.businessQualityScore}/60)</span>
                      )}
                    </p>
                    <div className="space-y-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleMetricClick('financials')}
                              className="w-full flex items-center justify-between hover:bg-muted/50 p-1 rounded transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground hover:text-primary">Financial Health</span>
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={`text-xs font-medium ${score.financialHealthScore >= 15 ? 'text-green-600' : score.financialHealthScore >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {score.financialHealthScore}/25
                                </span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Measures ROE, ROA, debt levels, liquidity, and profit margins</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleMetricClick('analysis')}
                              className="w-full flex items-center justify-between hover:bg-muted/50 p-1 rounded transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground hover:text-primary">Competitive Moat</span>
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <div className="flex items-center gap-1">
                                {loadingMoat || (!moatAnalysis && !moatError) || score.moatScore === 0 ? (
                                  <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                                ) : (
                                  <span className={`text-xs font-medium ${score.moatScore >= 15 ? 'text-green-600' : score.moatScore >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {score.moatScore}/20
                                  </span>
                                )}
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">AI-powered analysis of sustainable competitive advantages</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleMetricClick('financials')}
                              className="w-full flex items-center justify-between hover:bg-muted/50 p-1 rounded transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground hover:text-primary">Growth Potential</span>
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={`text-xs font-medium ${score.growthScore >= 10 ? 'text-green-600' : score.growthScore >= 7 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {score.growthScore}/15
                                </span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Revenue and earnings growth rates</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Time to Buy ({score.timingScore}/40)</p>
                    <div className="space-y-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleMetricClick('valuation')}
                              className="w-full flex items-center justify-between hover:bg-muted/50 p-1 rounded transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground hover:text-primary">Valuation</span>
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={`text-xs font-medium ${score.valuationScore >= 15 ? 'text-green-600' : score.valuationScore >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {score.valuationScore}/20
                                </span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">P/E ratio, PEG ratio, price-to-book, and 52-week position</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleMetricClick('technicals')}
                              className="w-full flex items-center justify-between hover:bg-muted/50 p-1 rounded transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground hover:text-primary">Technical Momentum</span>
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={`text-xs font-medium ${score.technicalScore >= 15 ? 'text-green-600' : score.technicalScore >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {score.technicalScore}/20
                                </span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Price trends, moving averages, RSI, and support/resistance levels</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
      <div ref={tabsRef}>
        <Tabs defaultValue="overview" value={selectedTab} onValueChange={(value) => {
          console.log(`[StockDetailsClient] Tab changed from ${selectedTab} to ${value} for ${symbol}`)
          setSelectedTab(value)
        }} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">Moat Analysis</TabsTrigger>
          <TabsTrigger value="valuation">Intrinsic Value</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="technicals">Technicals</TabsTrigger>
          <TabsTrigger value="news">News & Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Company Profile */}
          {loadingProfile ? (
            <Card>
              <CardHeader>
                <CardTitle>Company Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <CompanyProfileShimmer />
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
          
          {/* AI Stock Evaluation */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    AI Stock Evaluation
                  </CardTitle>
                  <CardDescription>
                    Comprehensive analysis using our 7-step investment framework
                  </CardDescription>
                </div>
                <Button
                  variant={aiEvaluation ? "outline" : "default"}
                  onClick={() => loadAIEvaluation()}
                  disabled={loadingAIEvaluation}
                >
                  {loadingAIEvaluation ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      {aiEvaluation ? 'Refresh Analysis' : 'Analyze Stock'}
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAIEvaluation ? (
                <div className="space-y-4">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="h-24 bg-muted animate-pulse rounded" />
                    <div className="h-24 bg-muted animate-pulse rounded" />
                    <div className="h-24 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ) : aiEvaluation ? (
                <div className="space-y-6">
                  {/* Recommendation Badge */}
                  <div className="flex items-center gap-3">
                    <Badge className={`text-lg px-3 py-1 ${
                      aiEvaluation.recommendation === 'Buy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      aiEvaluation.recommendation === 'Hold' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {aiEvaluation.recommendation}
                    </Badge>
                    <p className="text-muted-foreground">{aiEvaluation.summary}</p>
                  </div>

                  {/* Key Points */}
                  <div>
                    <h4 className="font-medium mb-3">Key Investment Points</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {aiEvaluation.keyPoints?.map((point: string, idx: number) => (
                        <div key={idx} className="p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <div className="mt-1">
                              <div className="h-2 w-2 bg-primary rounded-full" />
                            </div>
                            <p className="text-sm">{point}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 7-Step Analysis Summary */}
                  {aiEvaluation.steps && (
                    <div>
                      <h4 className="font-medium mb-3">7-Step Analysis Overview</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(aiEvaluation.steps).slice(0, 4).map(([stepName, stepData]: [string, any]) => (
                          <div key={stepName} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{stepData.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{stepData.analysis?.substring(0, 80)}...</p>
                            </div>
                            {stepData.score && (
                              <div className="ml-4 text-right">
                                <p className={`text-lg font-bold ${
                                  stepData.score >= 80 ? 'text-green-600' :
                                  stepData.score >= 60 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {stepData.score}%
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risks and Opportunities */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {aiEvaluation.risks && aiEvaluation.risks.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          Key Risks
                        </h4>
                        <ul className="space-y-2">
                          {aiEvaluation.risks.slice(0, 3).map((risk: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-red-500 mt-1">•</span>
                              <span className="text-sm">{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiEvaluation.opportunities && aiEvaluation.opportunities.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2 text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          Opportunities
                        </h4>
                        <ul className="space-y-2">
                          {aiEvaluation.opportunities.slice(0, 3).map((opp: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-green-500 mt-1">•</span>
                              <span className="text-sm">{opp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* View Full Analysis Button */}
                  <div className="flex justify-center pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setShowFullAIAnalysis(true)}
                    >
                      View Detailed Analysis
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">No analysis available yet</p>
                  <p className="text-sm text-muted-foreground">
                    Click "Analyze Stock" to get AI-powered insights using our comprehensive 7-step framework
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
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
              {(loadingMoat || (!moatAnalysis && !moatError)) ? (
                <MoatAnalysisShimmer />
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
                        {/* Debug: Expected score conversion */}
                        {(() => {
                          const expectedScore = Math.round((moatAnalysis.overallScore / 100) * 20)
                          const isSync = score && score.moatScore === expectedScore
                          console.log(`[Moat Tab] AI Score: ${moatAnalysis.overallScore}/100 → Should be ${expectedScore}/20 in Overview (Currently: ${score?.moatScore || 'N/A'}/20) ${isSync ? '✓ SYNCED' : '❌ NOT SYNCED'}`)
                          return null
                        })()}
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
          {/* Financial Analysis Dashboard */}
          <FinancialAnalysisDashboard symbol={symbol} />
          
          {/* Financial Statements Toggle */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Financial Statements</CardTitle>
                  <CardDescription>
                    Detailed income statement, balance sheet, and cash flow data
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!showFinancialStatements && !financialStatements) {
                      loadFinancialStatements()
                    }
                    setShowFinancialStatements(!showFinancialStatements)
                  }}
                >
                  {showFinancialStatements ? 'Hide' : 'Show'} Statements
                </Button>
              </div>
            </CardHeader>
            {showFinancialStatements && (
              <CardContent>
                <FinancialStatementTable 
                  statements={financialStatements} 
                  loading={loadingFinancialStatements}
                />
              </CardContent>
            )}
          </Card>
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
          {/* Educational Guide */}
          <NewsEducationGuide />
          
          {/* AI News Summary */}
          <AINewsSummary 
            symbol={symbol} 
            analysis={newsAnalysis} 
            loading={loadingNewsAnalysis}
            onRefresh={analyzeNews}
          />

          {/* News Feed */}
          <NewsFeed symbol={symbol} />
        </TabsContent>
      </Tabs>
      </div>
    </div>
    </TooltipProvider>
  )
}
