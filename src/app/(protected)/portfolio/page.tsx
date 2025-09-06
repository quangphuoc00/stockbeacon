'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  PieChart,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Plus,
  Minus,
  Edit,
  Trash2,
  Info,
  Target,
  Shield,
  Activity,
  Calendar,
  FileText,
  Download,
  Eye,
  EyeOff
} from 'lucide-react'
import { formatCurrency, formatPercentage, getScoreColor, getScoreBgColor } from '@/lib/utils'
import { PortfolioPositionShimmer, Shimmer } from '@/components/ui/shimmer'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'

interface Position {
  id: string
  symbol: string
  name: string
  quantity: number
  avgCost: number
  currentPrice: number
  currentValue: number
  totalGain: number
  totalGainPercent: number
  dayGain: number
  dayGainPercent: number
  purchaseDate: Date
  purchaseScore: number
  currentScore: number
  exitSignal: 'none' | 'warning' | 'consider' | 'urgent'
  exitReason?: string
  sector: string
  allocation: number // percentage of portfolio
}

interface PortfolioStats {
  totalValue: number
  totalCost: number
  totalGain: number
  totalGainPercent: number
  dayGain: number
  dayGainPercent: number
  cashBalance: number
  buyingPower: number
  positions: number
  winners: number
  losers: number
  bestPerformer: string
  worstPerformer: string
  riskScore: number // 0-100
}

interface MonthlyReport {
  month: string
  startValue: number
  endValue: number
  monthlyReturn: number
  monthlyReturnPercent: number
  trades: number
  winners: number
  losers: number
  bestTrade: string
  worstTrade: string
  lessons: string[]
}

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null)
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [showValues, setShowValues] = useState(true)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [isAddingPosition, setIsAddingPosition] = useState(false)
  const [addPositionData, setAddPositionData] = useState({
    symbol: '',
    quantity: '',
    price: '',
    purchaseDate: new Date().toISOString().split('T')[0]
  })
  const [stockSuggestions, setStockSuggestions] = useState<{ symbol: string; name: string }[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    loadPortfolio()
  }, [])

  const loadPortfolio = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/portfolio')
      
      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Portfolio API error:', response.status, errorText)
        throw new Error(`Failed to load portfolio: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        // Transform API data to match our Position interface
        const transformedPositions: Position[] = result.data.positions.map((pos: any) => {
          // Calculate allocation based on total portfolio value
          const totalValue = result.data.stats?.totalValue || 1
          const allocation = (pos.totalValue / totalValue) * 100
          
          // Determine exit signal based on score change
          let exitSignal: 'none' | 'warning' | 'consider' | 'urgent' = 'none'
          let exitReason = undefined
          
          const scoreDecline = pos.purchase_score - pos.currentScore
          if (scoreDecline > 30) {
            exitSignal = 'urgent'
            exitReason = 'Score declined significantly - consider selling'
          } else if (scoreDecline > 20) {
            exitSignal = 'consider'
            exitReason = 'Score showing weakness'
          } else if (scoreDecline > 10) {
            exitSignal = 'warning'
            exitReason = 'Monitor closely - score declining'
          }
          
          return {
            id: pos.id,
            symbol: pos.symbol,
            name: pos.name,
            quantity: pos.quantity,
            avgCost: pos.average_price,
            currentPrice: pos.currentPrice,
            currentValue: pos.totalValue,
            totalGain: pos.gainLoss,
            totalGainPercent: pos.gainLossPercent,
            dayGain: pos.dayChange * pos.quantity,
            dayGainPercent: pos.dayChangePercent,
            purchaseDate: new Date(pos.purchased_at),
            purchaseScore: 0, // TODO: Use pos.purchase_score after migration
            currentScore: pos.currentScore || 0,
            exitSignal,
            exitReason,
            sector: pos.stock?.sector || 'Unknown',
            allocation
          }
        })
        
        setPositions(transformedPositions)
        
        // Transform stats
        let transformedStats: PortfolioStats | null = null
        if (result.data.stats) {
          const stats = result.data.stats
          transformedStats = {
            ...stats,
            cashBalance: 0, // TODO: Implement cash balance tracking
            buyingPower: 0, // TODO: Implement buying power tracking
            bestPerformer: transformedPositions.reduce((best, pos) => 
              pos.totalGainPercent > (transformedPositions.find(p => p.symbol === best)?.totalGainPercent || -Infinity) 
                ? pos.symbol : best, 
              transformedPositions[0]?.symbol || ''
            ),
            worstPerformer: transformedPositions.reduce((worst, pos) => 
              pos.totalGainPercent < (transformedPositions.find(p => p.symbol === worst)?.totalGainPercent || Infinity) 
                ? pos.symbol : worst, 
              transformedPositions[0]?.symbol || ''
            ),
            riskScore: calculateRiskScore(transformedPositions)
          }
          setPortfolioStats(transformedStats)
          
          // Generate performance chart data
          setChartLoading(true)
          const perfData = await generatePerformanceData(transformedPositions, transformedStats)
          setPerformanceData(perfData)
          setChartLoading(false)
        }
        
        // Generate monthly report (for now, use calculated data)
        generateMonthlyReport(transformedPositions, result.data.stats)
      }
    } catch (error) {
      console.error('Error loading portfolio:', error)
      // Don't show error for initial load as it might just be an empty portfolio
      if (positions.length > 0) {
        setApiError(error instanceof Error ? error.message : 'Failed to load portfolio')
      }
    } finally {
      setLoading(false)
    }
  }
  
  const calculateRiskScore = (positions: Position[]): number => {
    if (positions.length === 0) return 0
    
    // Calculate risk based on:
    // 1. Concentration risk (how much is in single positions)
    // 2. Sector concentration
    // 3. Losing positions
    // 4. Score deterioration
    
    let riskScore = 0
    
    // Concentration risk
    const maxAllocation = Math.max(...positions.map(p => p.allocation))
    if (maxAllocation > 30) riskScore += 20
    if (maxAllocation > 40) riskScore += 20
    
    // Sector concentration
    const sectorAllocations = positions.reduce((acc, pos) => {
      acc[pos.sector] = (acc[pos.sector] || 0) + pos.allocation
      return acc
    }, {} as Record<string, number>)
    const maxSectorAllocation = Math.max(...Object.values(sectorAllocations))
    if (maxSectorAllocation > 50) riskScore += 20
    
    // Losing positions
    const losingPositions = positions.filter(p => p.totalGainPercent < 0).length
    const losingRatio = losingPositions / positions.length
    riskScore += losingRatio * 20
    
    // Score deterioration
    const avgScoreDecline = positions.reduce((sum, p) => sum + Math.max(0, p.purchaseScore - p.currentScore), 0) / positions.length
    if (avgScoreDecline > 15) riskScore += 20
    
    return Math.min(100, Math.round(riskScore))
  }
  
  const generateMonthlyReport = (positions: Position[], stats: any) => {
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    
    // Filter positions bought this month
    const monthlyPositions = positions.filter(p => p.purchaseDate >= monthStart)
    
    const report: MonthlyReport = {
      month: currentMonth,
      startValue: stats?.totalCost || 0,
      endValue: stats?.totalValue || 0,
      monthlyReturn: stats?.totalGain || 0,
      monthlyReturnPercent: stats?.totalGainPercent || 0,
      trades: monthlyPositions.length,
      winners: positions.filter(p => p.totalGainPercent > 0).length,
      losers: positions.filter(p => p.totalGainPercent < 0).length,
      bestTrade: positions.length > 0 
        ? `${stats?.bestPerformer} +${positions.find(p => p.symbol === stats?.bestPerformer)?.totalGainPercent.toFixed(1)}%`
        : 'N/A',
      worstTrade: positions.length > 0
        ? `${stats?.worstPerformer} ${positions.find(p => p.symbol === stats?.worstPerformer)?.totalGainPercent.toFixed(1)}%`
        : 'N/A',
      lessons: generateLessons(positions)
    }
    
    setMonthlyReport(report)
  }
  
  const generateLessons = (positions: Position[]): string[] => {
    const lessons: string[] = []
    
    if (positions.length === 0) return ['Start building your portfolio to track insights']
    
    // Analyze performance patterns
    const techPositions = positions.filter(p => p.sector === 'Technology')
    if (techPositions.length > 0) {
      const avgTechReturn = techPositions.reduce((sum, p) => sum + p.totalGainPercent, 0) / techPositions.length
      if (avgTechReturn > 10) lessons.push('Technology sector showing strong performance')
      else if (avgTechReturn < -5) lessons.push('Technology sector underperforming')
    }
    
    // Exit signals
    const urgentExits = positions.filter(p => p.exitSignal === 'urgent').length
    if (urgentExits > 0) lessons.push(`${urgentExits} position(s) need immediate attention`)
    
    // Winners vs losers
    const winRate = positions.filter(p => p.totalGainPercent > 0).length / positions.length
    if (winRate > 0.7) lessons.push('Strong win rate - strategy working well')
    else if (winRate < 0.4) lessons.push('Consider reviewing entry criteria')
    
    // Score analysis
    const avgScoreDecline = positions.reduce((sum, p) => sum + Math.max(0, p.purchaseScore - p.currentScore), 0) / positions.length
    if (avgScoreDecline > 10) lessons.push('Monitor positions closely - scores declining')
    
    return lessons.length > 0 ? lessons : ['Continue monitoring portfolio performance']
  }

  const generatePerformanceData = async (positions: Position[], stats: PortfolioStats | null) => {
    if (!positions.length || !stats) return []

    try {
      // NOTE: This shows how current positions would have performed over the last 30 days
      // For true portfolio performance history, we'd need to track portfolio value changes over time
      
      // Fetch historical data for each position
      const historicalPromises = positions.map(async (position) => {
        try {
          const response = await fetch(`/api/stocks/${position.symbol}/historical?period=1mo`)
          
          // Check if response is ok before parsing JSON
          if (!response.ok) {
            console.error(`Historical data API error for ${position.symbol}:`, response.status)
            return {
              symbol: position.symbol,
              quantity: position.quantity,
              purchaseDate: position.purchaseDate,
              historical: []
            }
          }
          
          const data = await response.json()
          return {
            symbol: position.symbol,
            quantity: position.quantity,
            purchaseDate: position.purchaseDate,
            historical: data.data || []
          }
        } catch (error) {
          console.error(`Error fetching historical data for ${position.symbol}:`, error)
          return {
            symbol: position.symbol,
            quantity: position.quantity,
            purchaseDate: position.purchaseDate,
            historical: []
          }
        }
      })

      const historicalData = await Promise.all(historicalPromises)
      
      // Debug: Log what we received
      console.log('Historical data received:', historicalData.map(d => ({
        symbol: d.symbol,
        dataPoints: d.historical.length
      })))
      
      // Find common dates across all positions
      const allDates = new Set<string>()
      historicalData.forEach(stock => {
        if (!stock.historical || !Array.isArray(stock.historical)) {
          console.warn(`No historical array for ${stock.symbol}`)
          return
        }
        stock.historical.forEach((day: any) => {
          if (day && day.date) {
            allDates.add(day.date)
          }
        })
      })
      
      // Sort dates chronologically
      const sortedDates = Array.from(allDates).sort((a, b) => 
        new Date(a).getTime() - new Date(b).getTime()
      ).slice(-30) // Last 30 days
      
      console.log(`Found ${sortedDates.length} dates with data`)
      
      if (sortedDates.length === 0) {
        console.log('No historical data available for any positions')
        return []
      }
      
      // Calculate portfolio value for each date
      const performanceData = sortedDates.map(date => {
        let dayValue = 0
        let dayCost = 0
        let validPositions = 0
        
        positions.forEach(position => {
          const stockData = historicalData.find(h => h.symbol === position.symbol)
          if (stockData) {
            // Only include position if it was purchased before this date
            const positionPurchaseDate = new Date(position.purchaseDate)
            const currentDate = new Date(date)
            
            if (positionPurchaseDate <= currentDate) {
              const dayPrice = stockData.historical.find((d: any) => d.date === date)
              if (dayPrice && dayPrice.close) {
                dayValue += position.quantity * dayPrice.close
                dayCost += position.quantity * position.avgCost
                validPositions++
              }
            }
          }
        })
        
        // If no valid price data for this date, skip
        if (validPositions === 0) return null
        
        const dayGain = dayValue - dayCost
        const dayGainPercent = dayCost > 0 ? (dayGain / dayCost) * 100 : 0
        
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: dayValue,
          gain: dayGain,
          gainPercent: dayGainPercent,
        }
      }).filter(Boolean) // Remove null entries
      
      // Always add current day with real-time data
      if (stats && positions.length > 0) {
        // If we have no historical data points, at least show today
        if (performanceData.length === 0) {
          // Add yesterday's estimate (same as cost)
          performanceData.push({
            date: 'Start',
            value: stats.totalCost,
            gain: 0,
            gainPercent: 0,
          })
        }
        
        performanceData.push({
          date: 'Today',
          value: stats.totalValue,
          gain: stats.totalGain,
          gainPercent: stats.totalGainPercent,
        })
      }
      
      console.log(`Returning ${performanceData.length} data points for chart`)
      return performanceData
    } catch (error) {
      console.error('Error generating performance data:', error)
      return []
    }
  }

  const getRiskColor = (score: number) => {
    if (score <= 30) return 'text-green-600'
    if (score <= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getExitSignalColor = (signal: string) => {
    switch(signal) {
      case 'urgent': return 'bg-red-500'
      case 'consider': return 'bg-orange-500'
      case 'warning': return 'bg-yellow-500'
      default: return 'bg-green-500'
    }
  }

  const calculateDiversification = () => {
    const sectors = positions.reduce((acc, pos) => {
      acc[pos.sector] = (acc[pos.sector] || 0) + pos.allocation
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(sectors).map(([sector, allocation]) => ({
      sector,
      allocation
    }))
  }

  // Search for stock suggestions
  const searchStocks = useCallback(async (query: string) => {
    if (query.length < 1) {
      setStockSuggestions([])
      setShowSuggestions(false)
      return
    }

    setLoadingSuggestions(true)
    try {
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`)
      
      if (!response.ok) {
        console.error('Search API error:', response.status, response.statusText)
        setStockSuggestions([])
        setShowSuggestions(false)
        return
      }
      
      const data = await response.json()
      setStockSuggestions(data.data || [])
      setShowSuggestions(true)
    } catch (error) {
      console.error('Search error:', error)
      setStockSuggestions([])
      setShowSuggestions(false)
    } finally {
      setLoadingSuggestions(false)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    // Only search if there's actually a symbol to search for
    if (addPositionData.symbol.trim().length > 0) {
      const timer = setTimeout(() => {
        searchStocks(addPositionData.symbol)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      // Clear suggestions if input is empty
      setStockSuggestions([])
      setShowSuggestions(false)
    }
  }, [addPositionData.symbol, searchStocks])

  const handleSelectStock = (symbol: string, name: string) => {
    setAddPositionData(prev => ({ ...prev, symbol }))
    setShowSuggestions(false)
    setStockSuggestions([])
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('#symbol') && !target.closest('.stock-suggestions')) {
        setShowSuggestions(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddPosition = async () => {
    if (!addPositionData.symbol || !addPositionData.quantity || !addPositionData.price) {
      return
    }

    setApiError(null) // Clear any previous errors
    
    try {
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: addPositionData.symbol.toUpperCase(),
          quantity: parseFloat(addPositionData.quantity),
          price: parseFloat(addPositionData.price),
          purchasedAt: addPositionData.purchaseDate,
        }),
      })

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Portfolio API error:', response.status, errorText)
        throw new Error(`Failed to add position: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        // Reload portfolio and regenerate performance data
        await loadPortfolio()
        setIsAddingPosition(false)
        setAddPositionData({
          symbol: '',
          quantity: '',
          price: '',
          purchaseDate: new Date().toISOString().split('T')[0],
        })
        setStockSuggestions([])
        setShowSuggestions(false)
      } else {
        console.error('Failed to add position:', result.error)
        setApiError(result.error || 'Failed to add position')
      }
    } catch (error) {
      console.error('Error adding position:', error)
      setApiError(error instanceof Error ? error.message : 'Failed to add position. Please try again.')
    }
  }

  const handleUpdatePosition = async (positionId: string, action: 'add' | 'remove' | 'delete') => {
    try {
      if (action === 'delete') {
        const response = await fetch(`/api/portfolio?id=${positionId}`, {
          method: 'DELETE',
        })

        const result = await response.json()
        if (result.success) {
          await loadPortfolio()
        }
      } else {
        // For add/remove shares, we'd need to show a dialog to get quantity
        // For now, just reload
        console.log('Action not implemented yet:', action)
      }
    } catch (error) {
      console.error('Error updating position:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Shimmer */}
        <div className="mb-8">
          <Shimmer className="h-8 w-48 mb-2" />
          <Shimmer className="h-4 w-96" />
        </div>

        {/* Stats Cards Shimmer */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <Shimmer className="h-4 w-24 mb-2" />
              <Shimmer className="h-8 w-32 mb-1" />
              <Shimmer className="h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Main Content Shimmer */}
        <div className="border rounded-lg">
          <div className="border-b p-4">
            <div className="flex gap-2">
              <Shimmer className="h-10 w-24 rounded" />
              <Shimmer className="h-10 w-24 rounded" />
              <Shimmer className="h-10 w-32 rounded" />
            </div>
          </div>
          
          <div className="divide-y">
            {[...Array(5)].map((_, i) => (
              <PortfolioPositionShimmer key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Portfolio</h1>
            <p className="text-muted-foreground">
              Track your investments and monitor performance
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowValues(!showValues)}
            >
              {showValues ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showValues ? 'Hide' : 'Show'} Values
            </Button>
            <Button onClick={() => setIsAddingPosition(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Position
            </Button>
          </div>
        </div>
      </div>

      {/* Portfolio Stats */}
      {portfolioStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {showValues ? formatCurrency(portfolioStats.totalValue) : '••••••'}
              </div>
              <div className={`text-sm flex items-center gap-1 ${
                portfolioStats.totalGainPercent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {portfolioStats.totalGainPercent >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {showValues ? formatCurrency(Math.abs(portfolioStats.totalGain)) : '••••'} 
                ({formatPercentage(Math.abs(portfolioStats.totalGainPercent))})
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Day's Change</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                portfolioStats.dayGain >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {portfolioStats.dayGain >= 0 ? '+' : ''}
                {showValues ? formatCurrency(portfolioStats.dayGain) : '••••'}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatPercentage(Math.abs(portfolioStats.dayGainPercent))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Positions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{portfolioStats.positions}</div>
              <div className="text-sm text-muted-foreground">
                {portfolioStats.winners}W / {portfolioStats.losers}L
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Portfolio Risk</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getRiskColor(portfolioStats.riskScore)}`}>
                {portfolioStats.riskScore}/100
              </div>
              <div className="text-sm text-muted-foreground">
                {portfolioStats.riskScore <= 30 ? 'Low Risk' :
                 portfolioStats.riskScore <= 60 ? 'Moderate' : 'High Risk'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Exit Radar Alert */}
      {positions.filter(p => p.exitSignal !== 'none').length > 0 && (
        <Card className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Exit Radar Alert
            </CardTitle>
            <CardDescription>
              These positions may need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {positions
                .filter(p => p.exitSignal !== 'none')
                .map(pos => (
                  <div key={pos.id} className="flex items-center justify-between p-2 bg-background rounded">
                    <div className="flex items-center gap-3">
                      <Badge className={getExitSignalColor(pos.exitSignal)}>
                        {pos.exitSignal.toUpperCase()}
                      </Badge>
                      <span className="font-semibold">{pos.symbol}</span>
                      <span className="text-sm text-muted-foreground">{pos.exitReason}</span>
                    </div>
                    <Link href={`/stocks/${pos.symbol}`}>
                      <Button size="sm" variant="outline">Review</Button>
                    </Link>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Analysis - Show when at least one position */}
      {positions.length >= 1 && portfolioStats && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Performance Analysis</CardTitle>
            <CardDescription>Track your investment returns over time</CardDescription>
          </CardHeader>
            <CardContent>
              <div className="h-64">
                {chartLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Activity className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Loading historical data...</p>
                    </div>
                  </div>
                ) : performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorValueNegative" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        className="text-xs"
                        tick={{ fill: 'currentColor' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'currentColor' }}
                        tickFormatter={(value) => showValues ? formatCurrency(value) : ''}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: any, name: string) => {
                          if (name === 'Portfolio Value') {
                            return showValues ? formatCurrency(value) : '••••'
                          }
                          return value
                        }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-background border rounded-md p-3 shadow-lg">
                                <p className="font-medium">{label}</p>
                                <p className="text-sm">
                                  Value: {showValues ? formatCurrency(data.value) : '••••'}
                                </p>
                                <p className={`text-sm ${data.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {data.gain >= 0 ? '+' : ''}{showValues ? formatCurrency(data.gain) : '••••'} ({formatPercentage(data.gainPercent)})
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={performanceData[performanceData.length - 1]?.gain >= 0 ? "#10b981" : "#ef4444"}
                        fill={performanceData[performanceData.length - 1]?.gain >= 0 ? "url(#colorValue)" : "url(#colorValueNegative)"}
                        strokeWidth={2}
                        name="Portfolio Value"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-muted rounded">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">
                        {positions.length === 0 
                          ? "Add positions to see performance" 
                          : loading 
                            ? "Loading portfolio data..."
                            : "Loading performance history..."}
                      </p>
                      {positions.length > 0 && !loading && !chartLoading && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={async () => {
                            setChartLoading(true)
                            const perfData = await generatePerformanceData(positions, portfolioStats)
                            setPerformanceData(perfData)
                            setChartLoading(false)
                          }}
                        >
                          Retry Loading Chart
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div>
                <p className="text-sm text-muted-foreground">Best Performer</p>
                <p className="text-lg font-semibold text-green-600">
                  {portfolioStats.bestPerformer}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Worst Performer</p>
                <p className="text-lg font-semibold text-red-600">
                  {portfolioStats.worstPerformer}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">All Time P&L</p>
                <p className={`text-lg font-semibold ${portfolioStats.totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {showValues 
                    ? `${portfolioStats.totalGain >= 0 ? '+' : ''}${formatCurrency(portfolioStats.totalGain)}`
                    : '••••'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unrealized P&L</p>
                <p className={`text-lg font-semibold ${portfolioStats.totalGainPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {showValues 
                    ? `${portfolioStats.totalGainPercent >= 0 ? '+' : ''}${portfolioStats.totalGainPercent.toFixed(2)}%`
                    : '••••'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="report">Monthly Report</TabsTrigger>
        </TabsList>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Positions</CardTitle>
              <CardDescription>
                Your active stock holdings and their performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <div className="text-center py-8">
                  <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-2">No positions yet</p>
                  <p className="text-muted-foreground mb-4">
                    Start building your portfolio by adding your first position
                  </p>
                  <Button onClick={() => setIsAddingPosition(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Position
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Symbol</th>
                        <th className="text-right p-2">Shares</th>
                        <th className="text-right p-2">Avg Cost</th>
                        <th className="text-right p-2">Current</th>
                        <th className="text-right p-2">Value</th>
                        <th className="text-right p-2">Gain/Loss</th>
                        <th className="text-right p-2">Day Change</th>
                        <th className="text-center p-2">Score</th>
                        <th className="text-center p-2">Signal</th>
                        <th className="text-center p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((position) => (
                        <tr key={position.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <Link href={`/stocks/${position.symbol}`}>
                              <div className="cursor-pointer hover:underline">
                                <div className="font-semibold">{position.symbol}</div>
                                <div className="text-sm text-muted-foreground">{position.name}</div>
                              </div>
                            </Link>
                          </td>
                          <td className="text-right p-2">{position.quantity}</td>
                          <td className="text-right p-2">
                            {showValues ? formatCurrency(position.avgCost) : '•••'}
                          </td>
                          <td className="text-right p-2 font-medium">
                            {formatCurrency(position.currentPrice)}
                          </td>
                          <td className="text-right p-2 font-medium">
                            {showValues ? formatCurrency(position.currentValue) : '••••'}
                          </td>
                          <td className="text-right p-2">
                            <div className={position.totalGainPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {showValues ? formatCurrency(position.totalGain) : '•••'}
                              <div className="text-sm">
                                {formatPercentage(position.totalGainPercent)}
                              </div>
                            </div>
                          </td>
                          <td className="text-right p-2">
                            <div className={position.dayGainPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatPercentage(position.dayGainPercent)}
                            </div>
                          </td>
                          <td className="text-center p-2">
                            <div className="flex flex-col items-center">
                              <Badge className={`${getScoreBgColor(position.currentScore)} text-gray-900 font-bold`}>
                                {position.currentScore}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                was {position.purchaseScore}
                              </span>
                            </div>
                          </td>
                          <td className="text-center p-2">
                            <Badge 
                              variant="outline"
                              className={position.exitSignal === 'urgent' ? 'border-red-500 text-red-500' :
                                        position.exitSignal === 'consider' ? 'border-orange-500 text-orange-500' :
                                        position.exitSignal === 'warning' ? 'border-yellow-500 text-yellow-500' :
                                        'border-green-500 text-green-500'}
                            >
                              {position.exitSignal === 'none' ? 'HOLD' : position.exitSignal.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="text-center p-2">
                            <div className="flex gap-1 justify-center">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleUpdatePosition(position.id, 'add')}
                                title="Add shares"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleUpdatePosition(position.id, 'remove')}
                                title="Remove shares"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to remove ${position.symbol} from your portfolio?`)) {
                                    handleUpdatePosition(position.id, 'delete')
                                  }
                                }}
                                title="Remove position"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Allocation Tab */}
        <TabsContent value="allocation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Allocation</CardTitle>
              <CardDescription>Diversification across sectors and positions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {calculateDiversification().map(({ sector, allocation }) => (
                  <div key={sector}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{sector}</span>
                      <span className="text-sm font-bold">{allocation.toFixed(1)}%</span>
                    </div>
                    <Progress value={allocation} className="h-2" />
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-muted rounded">
                <h4 className="font-semibold mb-2">Diversification Analysis</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Portfolio spread across {calculateDiversification().length} sectors
                  </li>
                  {calculateDiversification().some(d => d.allocation > 40) && (
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      High concentration in some sectors
                    </li>
                  )}
                  {portfolioStats && portfolioStats.cashBalance > 0 && (
                    <li className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      {formatCurrency(portfolioStats.cashBalance)} in cash available
                    </li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Report Tab */}
        <TabsContent value="report" className="space-y-4">
          {monthlyReport && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {monthlyReport.month} Report Card
                </CardTitle>
                <CardDescription>
                  Your monthly performance summary and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {formatPercentage(monthlyReport.monthlyReturnPercent)}
                      </div>
                      <p className="text-sm text-muted-foreground">Monthly Return</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {monthlyReport.winners}/{monthlyReport.trades}
                      </div>
                      <p className="text-sm text-muted-foreground">Winning Trades</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {showValues ? formatCurrency(monthlyReport.monthlyReturn) : '••••'}
                      </div>
                      <p className="text-sm text-muted-foreground">Net Gain/Loss</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Performance Highlights</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded">
                        <p className="text-sm text-muted-foreground">Best Trade</p>
                        <p className="font-semibold text-green-600">{monthlyReport.bestTrade}</p>
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded">
                        <p className="text-sm text-muted-foreground">Worst Trade</p>
                        <p className="font-semibold text-red-600">{monthlyReport.worstTrade}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Key Lessons Learned</h4>
                    <ul className="space-y-2">
                      {monthlyReport.lessons.map((lesson, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                          <span className="text-sm">{lesson}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      Download Full Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Position Dialog */}
      <Dialog open={isAddingPosition} onOpenChange={(open) => {
        setIsAddingPosition(open)
        if (!open) {
          setApiError(null) // Clear error when closing
          // Reset form data when closing
          setAddPositionData({
            symbol: '',
            quantity: '',
            price: '',
            purchaseDate: new Date().toISOString().split('T')[0]
          })
          setStockSuggestions([])
          setShowSuggestions(false)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Position</DialogTitle>
            <DialogDescription>
              Enter the details of your stock purchase
            </DialogDescription>
          </DialogHeader>
          {apiError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded-md text-sm">
              {apiError}
            </div>
          )}
          <div className="space-y-4 py-4">
            <div className="relative">
              <Label htmlFor="symbol">Stock Symbol</Label>
              <Input 
                id="symbol"
                placeholder="e.g., AAPL" 
                value={addPositionData.symbol}
                onChange={(e) => setAddPositionData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions && addPositionData.symbol && (
                <div className="stock-suggestions absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover p-1 shadow-md">
                  {loadingSuggestions ? (
                    <div className="flex items-center justify-center py-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  ) : stockSuggestions.length > 0 ? (
                    stockSuggestions.map((stock) => (
                      <button
                        key={stock.symbol}
                        className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleSelectStock(stock.symbol, stock.name)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{stock.symbol}</div>
                          <div className="text-xs text-muted-foreground">{stock.name}</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="py-2 text-center text-sm text-muted-foreground">
                      No stocks found
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input 
                  id="quantity"
                  type="number" 
                  placeholder="Number of shares" 
                  value={addPositionData.quantity}
                  onChange={(e) => setAddPositionData(prev => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="price">Purchase Price</Label>
                <Input 
                  id="price"
                  type="number" 
                  placeholder="Price per share" 
                  step="0.01"
                  value={addPositionData.price}
                  onChange={(e) => setAddPositionData(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input 
                id="purchaseDate"
                type="date" 
                value={addPositionData.purchaseDate}
                onChange={(e) => setAddPositionData(prev => ({ ...prev, purchaseDate: e.target.value }))}
              />
            </div>
            {addPositionData.symbol && addPositionData.quantity && addPositionData.price && (
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="text-sm text-muted-foreground">Position Summary</div>
                <div className="text-sm">
                  <span className="font-medium">{addPositionData.quantity} shares of {addPositionData.symbol.toUpperCase()}</span>
                </div>
                <div className="text-sm">
                  Total Cost: <span className="font-medium">
                    {formatCurrency(parseFloat(addPositionData.quantity) * parseFloat(addPositionData.price) || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddingPosition(false)
                setAddPositionData({
                  symbol: '',
                  quantity: '',
                  price: '',
                  purchaseDate: new Date().toISOString().split('T')[0],
                })
                setStockSuggestions([])
                setShowSuggestions(false)
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddPosition}
              disabled={!addPositionData.symbol || !addPositionData.quantity || !addPositionData.price}
            >
              Add Position
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
