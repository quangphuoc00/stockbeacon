'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    loadPortfolio()
  }, [])

  const loadPortfolio = async () => {
    setLoading(true)
    
    // Mock data for demonstration
    const mockPositions: Position[] = [
      {
        id: '1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        quantity: 50,
        avgCost: 185.50,
        currentPrice: 226.50,
        currentValue: 11325.00,
        totalGain: 2050.00,
        totalGainPercent: 22.10,
        dayGain: 52.00,
        dayGainPercent: 0.46,
        purchaseDate: new Date('2024-01-15'),
        purchaseScore: 72,
        currentScore: 54,
        exitSignal: 'warning',
        exitReason: 'Score declined significantly',
        sector: 'Technology',
        allocation: 25.5
      },
      {
        id: '2',
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        quantity: 30,
        avgCost: 95.00,
        currentPrice: 130.25,
        currentValue: 3907.50,
        totalGain: 1057.50,
        totalGainPercent: 37.11,
        dayGain: 170.10,
        dayGainPercent: 4.55,
        purchaseDate: new Date('2024-02-20'),
        purchaseScore: 65,
        currentScore: 72,
        exitSignal: 'none',
        sector: 'Technology',
        allocation: 8.8
      },
      {
        id: '3',
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        quantity: 25,
        avgCost: 380.00,
        currentPrice: 412.50,
        currentValue: 10312.50,
        totalGain: 812.50,
        totalGainPercent: 8.55,
        dayGain: 30.75,
        dayGainPercent: 0.30,
        purchaseDate: new Date('2024-03-10'),
        purchaseScore: 75,
        currentScore: 78,
        exitSignal: 'none',
        sector: 'Technology',
        allocation: 23.2
      },
      {
        id: '4',
        symbol: 'DIS',
        name: 'Walt Disney Co.',
        quantity: 100,
        avgCost: 120.00,
        currentPrice: 95.50,
        currentValue: 9550.00,
        totalGain: -2450.00,
        totalGainPercent: -20.42,
        dayGain: -150.00,
        dayGainPercent: -1.55,
        purchaseDate: new Date('2024-04-05'),
        purchaseScore: 60,
        currentScore: 38,
        exitSignal: 'urgent',
        exitReason: 'Poor fundamentals, consider cutting losses',
        sector: 'Entertainment',
        allocation: 21.5
      },
      {
        id: '5',
        symbol: 'JPM',
        name: 'JPMorgan Chase',
        quantity: 40,
        avgCost: 145.00,
        currentPrice: 155.75,
        currentValue: 6230.00,
        totalGain: 430.00,
        totalGainPercent: 7.41,
        dayGain: 22.00,
        dayGainPercent: 0.35,
        purchaseDate: new Date('2024-05-12'),
        purchaseScore: 68,
        currentScore: 65,
        exitSignal: 'none',
        sector: 'Finance',
        allocation: 14.0
      }
    ]

    const mockStats: PortfolioStats = {
      totalValue: 44324.50,
      totalCost: 42424.50,
      totalGain: 1900.00,
      totalGainPercent: 4.48,
      dayGain: 124.85,
      dayGainPercent: 0.28,
      cashBalance: 3000.00,
      buyingPower: 3000.00,
      positions: 5,
      winners: 4,
      losers: 1,
      bestPerformer: 'NVDA',
      worstPerformer: 'DIS',
      riskScore: 65
    }

    const mockReport: MonthlyReport = {
      month: 'July 2024',
      startValue: 41500.00,
      endValue: 44324.50,
      monthlyReturn: 2824.50,
      monthlyReturnPercent: 6.81,
      trades: 8,
      winners: 6,
      losers: 2,
      bestTrade: 'NVDA +12.5%',
      worstTrade: 'DIS -8.3%',
      lessons: [
        'Tech stocks outperformed expectations',
        'Entertainment sector struggled',
        'Good entry points on dips worked well',
        'Need to cut losses faster on declining scores'
      ]
    }

    setPositions(mockPositions)
    setPortfolioStats(mockStats)
    setMonthlyReport(mockReport)
    setLoading(false)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading portfolio...</p>
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
            <Button variant="outline">
              <Download className="h-4 w-4 mr-1" />
              Export
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
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
                              <Button size="sm" variant="ghost">
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost">
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost">
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

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analysis</CardTitle>
              <CardDescription>Track your investment returns over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted rounded">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Performance chart coming soon</p>
                </div>
              </div>
              
              {portfolioStats && (
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
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-lg font-semibold">
                      {((portfolioStats.winners / portfolioStats.positions) * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Position Size</p>
                    <p className="text-lg font-semibold">
                      {showValues ? formatCurrency(portfolioStats.totalValue / portfolioStats.positions) : '••••'}
                    </p>
                  </div>
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
      <Dialog open={isAddingPosition} onOpenChange={setIsAddingPosition}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Position</DialogTitle>
            <DialogDescription>
              Enter the details of your stock purchase
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Stock Symbol</Label>
              <Input placeholder="e.g., AAPL" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity</Label>
                <Input type="number" placeholder="Number of shares" />
              </div>
              <div>
                <Label>Purchase Price</Label>
                <Input type="number" placeholder="Price per share" />
              </div>
            </div>
            <div>
              <Label>Purchase Date</Label>
              <Input type="date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingPosition(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Position</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
