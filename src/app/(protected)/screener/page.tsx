'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { 
  Filter, 
  Search, 
  TrendingUp,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Download,
  Star
} from 'lucide-react'
import { formatCurrency, formatPercentage, getScoreColor, getScoreBgColor } from '@/lib/utils'
import Link from 'next/link'

interface ScreenerFilters {
  minScore: number
  maxScore: number
  minPrice: number
  maxPrice: number
  minMarketCap: number
  maxMarketCap: number
  minVolume: number
  sector: string
  recommendation: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

interface StockResult {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  score: number
  marketCap: number
  volume: number
  pe?: number
  recommendation: string
  sector?: string
}

export default function ScreenerPage() {
  const [filters, setFilters] = useState<ScreenerFilters>({
    minScore: 0,
    maxScore: 100,
    minPrice: 0,
    maxPrice: 10000,
    minMarketCap: 0,
    maxMarketCap: 3000000000000, // 3T
    minVolume: 0,
    sector: 'all',
    recommendation: 'all',
    sortBy: 'score',
    sortOrder: 'desc'
  })

  const [results, setResults] = useState<StockResult[]>([])
  const [loading, setLoading] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Load initial results
    handleScreen()
  }, [])

  const handleScreen = async () => {
    try {
      setLoading(true)
      
      // Build query params
      const params = new URLSearchParams()
      if (filters.minScore > 0) params.append('minScore', filters.minScore.toString())
      if (filters.maxScore < 100) params.append('maxScore', filters.maxScore.toString())
      if (filters.minPrice > 0) params.append('minPrice', filters.minPrice.toString())
      if (filters.maxPrice < 10000) params.append('maxPrice', filters.maxPrice.toString())
      if (filters.sector !== 'all') params.append('sector', filters.sector)
      if (filters.recommendation !== 'all') params.append('recommendation', filters.recommendation)
      params.append('sortBy', filters.sortBy)
      params.append('sortOrder', filters.sortOrder)

      const response = await fetch(`/api/stocks/screener?${params}`)
      const data = await response.json()

      if (data.success && data.data) {
        setResults(data.data)
      }
    } catch (error) {
      console.error('Error screening stocks:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = () => {
    setFilters({
      minScore: 0,
      maxScore: 100,
      minPrice: 0,
      maxPrice: 10000,
      minMarketCap: 0,
      maxMarketCap: 3000000000000,
      minVolume: 0,
      sector: 'all',
      recommendation: 'all',
      sortBy: 'score',
      sortOrder: 'desc'
    })
  }

  const toggleFavorite = (symbol: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(symbol)) {
      newFavorites.delete(symbol)
    } else {
      newFavorites.add(symbol)
    }
    setFavorites(newFavorites)
  }

  const exportResults = () => {
    const csv = [
      ['Symbol', 'Name', 'Score', 'Price', 'Change %', 'Market Cap', 'Volume', 'Recommendation'].join(','),
      ...results.map(stock => [
        stock.symbol,
        stock.name,
        stock.score,
        stock.price,
        stock.changePercent,
        stock.marketCap,
        stock.volume,
        stock.recommendation
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stockbeacon-screener-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Stock Screener</h1>
        <p className="text-muted-foreground">Find stocks that match your investment criteria</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Score Range */}
              <div>
                <Label>StockBeacon Score</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={filters.minScore}
                    onChange={(e) => setFilters({...filters, minScore: parseInt(e.target.value) || 0})}
                    className="w-20"
                    min="0"
                    max="100"
                  />
                  <span>to</span>
                  <Input
                    type="number"
                    value={filters.maxScore}
                    onChange={(e) => setFilters({...filters, maxScore: parseInt(e.target.value) || 100})}
                    className="w-20"
                    min="0"
                    max="100"
                  />
                </div>
                <Slider
                  value={[filters.minScore, filters.maxScore]}
                  onValueChange={([min, max]) => setFilters({...filters, minScore: min, maxScore: max})}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>

              {/* Price Range */}
              <div>
                <Label>Price Range ($)</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({...filters, minPrice: parseFloat(e.target.value) || 0})}
                    className="w-24"
                    min="0"
                  />
                  <span>to</span>
                  <Input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({...filters, maxPrice: parseFloat(e.target.value) || 10000})}
                    className="w-24"
                    min="0"
                  />
                </div>
              </div>

              {/* Sector */}
              <div>
                <Label>Sector</Label>
                <Select value={filters.sector} onValueChange={(value) => setFilters({...filters, sector: value})}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="consumer">Consumer</SelectItem>
                    <SelectItem value="energy">Energy</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recommendation */}
              <div>
                <Label>Recommendation</Label>
                <Select value={filters.recommendation} onValueChange={(value) => setFilters({...filters, recommendation: value})}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="strong_buy">Strong Buy</SelectItem>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="hold">Hold</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                    <SelectItem value="strong_sell">Strong Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div>
                <Label>Sort By</Label>
                <Select value={filters.sortBy} onValueChange={(value) => setFilters({...filters, sortBy: value})}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Score</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="changePercent">% Change</SelectItem>
                    <SelectItem value="marketCap">Market Cap</SelectItem>
                    <SelectItem value="volume">Volume</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button onClick={handleScreen} className="w-full">
                  <Search className="h-4 w-4 mr-2" />
                  Apply Filters
                </Button>
                <Button onClick={resetFilters} variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Results</CardTitle>
                <CardDescription>
                  {loading ? 'Searching...' : `Found ${results.length} stocks matching your criteria`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportResults} variant="outline" size="sm" disabled={results.length === 0}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Screening stocks...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No stocks found matching your criteria</p>
                  <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Symbol</th>
                        <th className="text-left p-2">Score</th>
                        <th className="text-right p-2">Price</th>
                        <th className="text-right p-2">Change</th>
                        <th className="text-right p-2">Market Cap</th>
                        <th className="text-right p-2">Volume</th>
                        <th className="text-center p-2">Signal</th>
                        <th className="text-center p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((stock) => (
                        <tr key={stock.symbol} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <Link href={`/stocks/${stock.symbol}`}>
                              <div className="cursor-pointer hover:underline">
                                <div className="font-semibold">{stock.symbol}</div>
                                <div className="text-sm text-muted-foreground">{stock.name}</div>
                              </div>
                            </Link>
                          </td>
                          <td className="p-2">
                                                <Badge 
                      className={`${getScoreBgColor(stock.score)} text-gray-900 text-lg font-bold px-3 py-1 min-w-[50px] text-center`}
                      aria-label={`StockBeacon Score: ${stock.score} out of 100`}
                      title={`StockBeacon Score: ${stock.score}/100 - ${
                        stock.score >= 80 ? 'Excellent' : 
                        stock.score >= 70 ? 'Good' : 
                        stock.score >= 50 ? 'Fair' : 'Poor'
                      } investment opportunity`}
                    >
                      {stock.score}
                    </Badge>
                          </td>
                          <td className="text-right p-2 font-medium">
                            {formatCurrency(stock.price)}
                          </td>
                          <td className="text-right p-2">
                            <div className={`flex items-center justify-end gap-1 ${stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {stock.changePercent >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                              {formatPercentage(Math.abs(stock.changePercent))}
                            </div>
                          </td>
                          <td className="text-right p-2 text-sm">
                            ${(stock.marketCap / 1000000000).toFixed(1)}B
                          </td>
                          <td className="text-right p-2 text-sm">
                            {(stock.volume / 1000000).toFixed(1)}M
                          </td>
                          <td className="text-center p-2">
                            <Badge 
                              variant={
                                stock.recommendation === 'strong_buy' ? 'default' :
                                stock.recommendation === 'buy' ? 'secondary' :
                                stock.recommendation === 'hold' ? 'outline' :
                                'destructive'
                              }
                            >
                              {stock.recommendation.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </td>
                          <td className="text-center p-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleFavorite(stock.symbol)}
                            >
                              <Star className={`h-4 w-4 ${favorites.has(stock.symbol) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
