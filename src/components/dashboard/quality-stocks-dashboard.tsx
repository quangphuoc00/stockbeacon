'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, TrendingUp, TrendingDown, AlertCircle, Filter } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { StockCardShimmer, Shimmer } from '@/components/ui/shimmer'
import { ValuationSection } from './valuation-section'
import { DashboardFilters } from './dashboard-filters'
import { Button } from '@/components/ui/button'

interface StockWithValuation {
  symbol: string
  companyName: string
  sector: string
  currentPrice: number
  priceChange: number
  priceChangePercent: number
  score: number
  businessQualityScore: number
  timingScore: number
  recommendation: string
  fairValue: number
  discountPremium: number
  peRatio: number | null
  marketCap: number
  calculatedAt: Date
}

interface QualityStocksData {
  highly_undervalued: StockWithValuation[]
  undervalued: StockWithValuation[]
  fairly_valued: StockWithValuation[]
  overvalued: StockWithValuation[]
  highly_overvalued: StockWithValuation[]
  metadata: {
    totalStocks: number
    qualityThreshold: number
    lastUpdated: Date
    fromCache: boolean
  }
}

interface QualityStocksDashboardProps {
  initialData?: QualityStocksData | null
}

export function QualityStocksDashboard({ initialData }: QualityStocksDashboardProps) {
  const [data, setData] = useState<QualityStocksData | null>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    sector: 'all',
    minScore: 70,
    sortBy: 'score' as 'score' | 'discount' | 'marketCap'
  })
  const [showFilters, setShowFilters] = useState(false)
  const [useMockData, setUseMockData] = useState(false)

  useEffect(() => {
    if (!initialData) {
      fetchData()
    }
  }, [])

  const fetchData = async (minScore?: number) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        minScore: String(minScore || filters.minScore)
      })
      
      const response = await fetch(`/api/stocks/sp500/quality?${params}`)
      
      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        const text = await response.text()
        let errorMessage = 'Failed to fetch data'
        try {
          const result = JSON.parse(text)
          errorMessage = result.error || result.message || errorMessage
        } catch {
          errorMessage = `Server error (${response.status}): ${text || response.statusText}`
        }
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      console.error('Error fetching quality stocks:', err)
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Unable to connect to server. Please ensure the server is running.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
    if (newFilters.minScore !== filters.minScore) {
      fetchData(newFilters.minScore)
    }
  }

  // Generate mock data for demonstration
  const loadMockData = () => {
    const stockDetails: Record<string, { name: string, sector: string, price: number, marketCap: number }> = {
      'AAPL': { name: 'Apple Inc.', sector: 'Technology', price: 175.43, marketCap: 2800000000000 },
      'MSFT': { name: 'Microsoft Corporation', sector: 'Technology', price: 378.91, marketCap: 2810000000000 },
      'GOOGL': { name: 'Alphabet Inc.', sector: 'Technology', price: 141.80, marketCap: 1790000000000 },
      'AMZN': { name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', price: 151.94, marketCap: 1580000000000 },
      'NVDA': { name: 'NVIDIA Corporation', sector: 'Technology', price: 495.22, marketCap: 1220000000000 },
      'META': { name: 'Meta Platforms Inc.', sector: 'Technology', price: 352.96, marketCap: 897000000000 },
      'TSLA': { name: 'Tesla Inc.', sector: 'Consumer Discretionary', price: 238.83, marketCap: 760000000000 },
      'BRK.B': { name: 'Berkshire Hathaway', sector: 'Financials', price: 367.49, marketCap: 789000000000 },
      'JPM': { name: 'JPMorgan Chase & Co.', sector: 'Financials', price: 157.65, marketCap: 456000000000 },
      'V': { name: 'Visa Inc.', sector: 'Financials', price: 251.34, marketCap: 521000000000 },
      'JNJ': { name: 'Johnson & Johnson', sector: 'Healthcare', price: 161.35, marketCap: 388000000000 },
      'WMT': { name: 'Walmart Inc.', sector: 'Consumer Staples', price: 167.87, marketCap: 452000000000 },
      'PG': { name: 'Procter & Gamble', sector: 'Consumer Staples', price: 154.89, marketCap: 367000000000 },
      'MA': { name: 'Mastercard Inc.', sector: 'Financials', price: 432.51, marketCap: 407000000000 },
      'HD': { name: 'The Home Depot', sector: 'Consumer Discretionary', price: 348.26, marketCap: 343000000000 },
      'DIS': { name: 'Walt Disney Co.', sector: 'Communication Services', price: 93.54, marketCap: 169000000000 },
      'NFLX': { name: 'Netflix Inc.', sector: 'Communication Services', price: 491.23, marketCap: 213000000000 },
      'CRM': { name: 'Salesforce Inc.', sector: 'Technology', price: 262.79, marketCap: 253000000000 },
      'ADBE': { name: 'Adobe Inc.', sector: 'Technology', price: 567.84, marketCap: 254000000000 },
      'PYPL': { name: 'PayPal Holdings', sector: 'Financials', price: 62.47, marketCap: 65000000000 },
      'NKE': { name: 'Nike Inc.', sector: 'Consumer Discretionary', price: 104.95, marketCap: 158000000000 },
      'BA': { name: 'Boeing Company', sector: 'Industrials', price: 228.76, marketCap: 139000000000 },
      'MCD': { name: 'McDonald\'s Corp.', sector: 'Consumer Discretionary', price: 287.41, marketCap: 207000000000 },
      'ABNB': { name: 'Airbnb Inc.', sector: 'Consumer Discretionary', price: 146.72, marketCap: 94000000000 },
      'SNOW': { name: 'Snowflake Inc.', sector: 'Technology', price: 169.34, marketCap: 55000000000 },
      'NET': { name: 'Cloudflare Inc.', sector: 'Technology', price: 82.15, marketCap: 28000000000 }
    }
    
    const generateStock = (symbol: string, discount: number): StockWithValuation => {
      const details = stockDetails[symbol]
      const currentPrice = details.price
      const fairValue = currentPrice / (1 + discount / 100)
      const priceChangePercent = (Math.random() - 0.5) * 5
      const priceChange = currentPrice * (priceChangePercent / 100)
      
      return {
        symbol,
        companyName: details.name,
        sector: details.sector,
        currentPrice,
        priceChange,
        priceChangePercent,
        score: 70 + Math.floor(Math.random() * 30),
        businessQualityScore: 42 + Math.floor(Math.random() * 18),
        timingScore: 20 + Math.floor(Math.random() * 20),
        recommendation: discount < -15 ? 'strong_buy' : discount < -5 ? 'buy' : discount < 5 ? 'hold' : discount < 15 ? 'sell' : 'strong_sell',
        fairValue,
        discountPremium: discount,
        peRatio: 15 + Math.random() * 25,
        marketCap: details.marketCap,
        calculatedAt: new Date()
      }
    }
    
    const mockData: QualityStocksData = {
      highly_undervalued: [
        generateStock('AAPL', -25), 
        generateStock('MSFT', -22), 
        generateStock('GOOGL', -28),
        generateStock('AMZN', -24), 
        generateStock('NVDA', -21)
      ],
      undervalued: [
        generateStock('META', -15), 
        generateStock('TSLA', -12), 
        generateStock('BRK.B', -18),
        generateStock('JPM', -14), 
        generateStock('V', -11), 
        generateStock('JNJ', -16),
        generateStock('WMT', -13), 
        generateStock('PG', -17)
      ],
      fairly_valued: [
        generateStock('MA', -5), 
        generateStock('HD', 2), 
        generateStock('DIS', -3),
        generateStock('NFLX', 5), 
        generateStock('CRM', -8), 
        generateStock('ADBE', 7)
      ],
      overvalued: [
        generateStock('PYPL', 15), 
        generateStock('NKE', 12), 
        generateStock('BA', 18),
        generateStock('MCD', 14)
      ],
      highly_overvalued: [
        generateStock('ABNB', 25), 
        generateStock('SNOW', 35), 
        generateStock('NET', 28)
      ],
      metadata: {
        totalStocks: 26,
        qualityThreshold: filters.minScore,
        lastUpdated: new Date(),
        fromCache: false
      }
    }
    
    setData(mockData)
    setError(null)
    setLoading(false)
    setUseMockData(true)
  }

  // Filter and sort data based on current filters
  const filterAndSortStocks = (stocks: StockWithValuation[]) => {
    let filtered = stocks

    // Filter by sector
    if (filters.sector !== 'all') {
      filtered = filtered.filter(stock => stock.sector === filters.sector)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'discount':
          return a.discountPremium - b.discountPremium // Most undervalued first
        case 'marketCap':
          return b.marketCap - a.marketCap // Largest first
        default:
          return b.score - a.score // Highest score first
      }
    })

    return filtered
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Hidden Gems Explorer</h1>
            <p className="text-muted-foreground mt-1">
              Discover undervalued quality stocks waiting to be found
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Summary Stats Shimmer */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {['Highly Undervalued', 'Undervalued', 'Fairly Valued', 'Overvalued', 'Highly Overvalued'].map((label, index) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Shimmer className="h-8 w-8 mb-2" />
                <Shimmer className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Valuation sections shimmer */}
        {[
          { title: '🟢 Highly Undervalued', description: 'Trading at more than 20% below fair value' },
          { title: '🟡 Undervalued', description: 'Trading at 10-20% below fair value' },
          { title: '⚪ Fairly Valued', description: 'Trading within 10% of fair value' }
        ].map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  {section.title}
                  <Badge variant="outline" className="ml-2">
                    <Shimmer className="h-4 w-8" />
                  </Badge>
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <StockCardShimmer key={i} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error Loading Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => fetchData()}>
              Try Again
            </Button>
            <Button onClick={() => loadMockData()} variant="outline">
              Load Sample Data
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const allSectors = new Set<string>()
  Object.values(data).forEach(stocks => {
    if (Array.isArray(stocks)) {
      stocks.forEach(stock => allSectors.add(stock.sector))
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hidden Gems Explorer</h1>
          <p className="text-muted-foreground mt-1">
            Discover {data.metadata.totalStocks} undervalued quality stocks waiting to be found
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <DashboardFilters
          filters={filters}
          onFiltersChange={handleFilterChange}
          sectors={Array.from(allSectors).sort()}
        />
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Highly Undervalued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {filterAndSortStocks(data.highly_undervalued).length}
            </p>
            <p className="text-xs text-muted-foreground">&gt; 20% discount</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Undervalued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">
              {filterAndSortStocks(data.undervalued).length}
            </p>
            <p className="text-xs text-muted-foreground">10-20% discount</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fairly Valued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-600">
              {filterAndSortStocks(data.fairly_valued).length}
            </p>
            <p className="text-xs text-muted-foreground">±10% of fair value</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overvalued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-500">
              {filterAndSortStocks(data.overvalued).length}
            </p>
            <p className="text-xs text-muted-foreground">10-20% premium</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Highly Overvalued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">
              {filterAndSortStocks(data.highly_overvalued).length}
            </p>
            <p className="text-xs text-muted-foreground">&gt; 20% premium</p>
          </CardContent>
        </Card>
      </div>

      {/* Valuation Sections */}
      <div className="space-y-6">
        <ValuationSection
          title="🟢 Highly Undervalued"
          description="Trading at more than 20% below fair value"
          stocks={filterAndSortStocks(data.highly_undervalued)}
          level="highly_undervalued"
        />
        
        <ValuationSection
          title="🟡 Undervalued"
          description="Trading at 10-20% below fair value"
          stocks={filterAndSortStocks(data.undervalued)}
          level="undervalued"
        />
        
        <ValuationSection
          title="⚪ Fairly Valued"
          description="Trading within 10% of fair value"
          stocks={filterAndSortStocks(data.fairly_valued)}
          level="fairly_valued"
          defaultCollapsed={true}
        />
        
        <ValuationSection
          title="🟠 Overvalued"
          description="Trading at 10-20% above fair value"
          stocks={filterAndSortStocks(data.overvalued)}
          level="overvalued"
          defaultCollapsed={true}
        />
        
        <ValuationSection
          title="🔴 Highly Overvalued"
          description="Trading at more than 20% above fair value"
          stocks={filterAndSortStocks(data.highly_overvalued)}
          level="highly_overvalued"
          defaultCollapsed={true}
        />
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pt-4 border-t">
        <p>
          Data last updated: {new Date(data.metadata.lastUpdated).toLocaleString()}
          {data.metadata.fromCache && ' (from cache)'}
        </p>
        <p className="mt-1">
          Showing stocks with business quality score ≥ {data.metadata.qualityThreshold}/60 
          ({Math.round((data.metadata.qualityThreshold / 60) * 100)}%)
        </p>
      </div>
    </div>
  )
}
