'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Info, TrendingUp, TrendingDown } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { cn } from '@/lib/utils'

interface ValuationMetric {
  key: string
  name: string
  value: number
  color: string
  correlation?: number
}

interface ChartDataPoint {
  date: string
  marketCap: number
  [key: string]: number | string
}

interface ValuationDriverChartProps {
  symbol: string
  historicalData?: any[]
  financialData?: any
  currentMarketCap?: number
}

const VALUATION_METRICS: ValuationMetric[] = [
  { key: 'fcf', name: 'Free Cash Flow', value: 0, color: '#10b981' },
  { key: 'netIncome', name: 'Net Income', value: 0, color: '#3b82f6' },
  { key: 'revenue', name: 'Revenue', value: 0, color: '#f59e0b' },
  { key: 'operatingCashFlow', name: 'Operating Cash Flow', value: 0, color: '#8b5cf6' },
  { key: 'ebitda', name: 'EBITDA', value: 0, color: '#06b6d4' }
]

export function ValuationDriverChart({ 
  symbol, 
  historicalData = [], 
  financialData,
  currentMarketCap = 0
}: ValuationDriverChartProps) {
  const selectedPeriod = '10Y' // Fixed to 10 years
  const [selectedMetrics, setSelectedMetrics] = useState(['fcf', 'netIncome', 'revenue'])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [originalData, setOriginalData] = useState<ChartDataPoint[]>([])
  const [correlations, setCorrelations] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  // Normalize data to 0-100% range for each metric
  const normalizeData = (data: ChartDataPoint[]): ChartDataPoint[] => {
    if (data.length === 0) return []
    
    // Get all metric keys (excluding date)
    const metricKeys = Object.keys(data[0]).filter(key => key !== 'date')
    
    // Find min and max for each metric
    const ranges: Record<string, { min: number; max: number }> = {}
    metricKeys.forEach(key => {
      const values = data.map(d => d[key] as number)
      ranges[key] = {
        min: Math.min(...values),
        max: Math.max(...values)
      }
    })
    
    // Normalize each data point
    return data.map(point => {
      const normalized: any = { date: point.date }
      
      metricKeys.forEach(key => {
        const value = point[key] as number
        const { min, max } = ranges[key]
        const range = max - min
        
        // Avoid division by zero
        if (range === 0) {
          normalized[key] = 50 // Middle of the range if all values are the same
        } else {
          normalized[key] = ((value - min) / range) * 100
        }
      })
      
      return normalized as ChartDataPoint
    })
  }

  // Calculate correlation coefficient
  const calculateCorrelation = (data: ChartDataPoint[], metric: string): number => {
    if (data.length < 2) return 0
    
    const marketCaps = data.map(d => d.marketCap as number)
    const metricValues = data.map(d => d[metric] as number)
    
    const n = marketCaps.length
    const sumX = marketCaps.reduce((a, b) => a + b, 0)
    const sumY = metricValues.reduce((a, b) => a + b, 0)
    const sumXY = marketCaps.reduce((sum, x, i) => sum + x * metricValues[i], 0)
    const sumX2 = marketCaps.reduce((sum, x) => sum + x * x, 0)
    const sumY2 = metricValues.reduce((sum, y) => sum + y * y, 0)
    
    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
    
    if (denominator === 0) return 0
    return Math.abs(numerator / denominator)
  }

  // Generate mock data for demonstration
  useEffect(() => {
    // In real implementation, this would fetch actual historical data
    const generateMockData = () => {
      const numPoints = 10 // 10 years of annual data
      const data: ChartDataPoint[] = []
      
      const baseMarketCap = currentMarketCap || 100000000000 // $100B default
      const today = new Date()
      
      for (let i = numPoints; i >= 0; i--) {
        const date = new Date(today)
        date.setFullYear(date.getFullYear() - i)
        
        const growthFactor = 1 + (0.15 * (numPoints - i) / numPoints) // 15% growth over period
        const volatility = 0.9 + Math.random() * 0.2 // ±10% volatility
        
        const marketCap = baseMarketCap * growthFactor * volatility
        
        // Generate correlated metrics
        const dataPoint: ChartDataPoint = {
          date: date.toISOString().split('T')[0],
          marketCap: marketCap,
          fcf: marketCap / 25 * (0.9 + Math.random() * 0.2), // ~P/FCF of 25
          netIncome: marketCap / 30 * (0.85 + Math.random() * 0.3), // ~P/E of 30
          revenue: marketCap / 5 * (0.95 + Math.random() * 0.1), // ~P/S of 5
          operatingCashFlow: marketCap / 20 * (0.9 + Math.random() * 0.2), // ~P/OCF of 20
          ebitda: marketCap / 15 * (0.88 + Math.random() * 0.24) // ~EV/EBITDA of 15
        }
        
        data.push(dataPoint)
      }
      
      // Normalize each metric to 0-100% based on its own min/max
      const normalizedData = normalizeData(data)
      setChartData(normalizedData)
      
      // Store original data for tooltips
      setOriginalData(data)
      
      // Calculate correlations using normalized data
      const newCorrelations: Record<string, number> = {}
      VALUATION_METRICS.forEach(metric => {
        newCorrelations[metric.key] = calculateCorrelation(normalizedData, metric.key)
      })
      setCorrelations(newCorrelations)
      setLoading(false)
    }
    
    generateMockData()
  }, [currentMarketCap])

  const formatDollarValue = (value: number) => {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(1)} Trillion`
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(1)} Billion`
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)} Million`
    }
    return `$${value.toFixed(0)}`
  }

  const formatTooltipValue = (value: number, name: string, props: any) => {
    // Find the original value from the date
    const date = props?.payload?.date
    const originalPoint = originalData.find(d => d.date === date)
    
    if (originalPoint && name) {
      const metricKey = VALUATION_METRICS.find(m => m.name === name)?.key || 
                       (name === 'Market Cap' ? 'marketCap' : '')
      
      if (metricKey && originalPoint[metricKey]) {
        const originalValue = originalPoint[metricKey] as number
        return `${value.toFixed(1)}% (${formatDollarValue(originalValue)})`
      }
    }
    
    return `${value.toFixed(1)}%`
  }
  
  const formatYAxisTick = (value: number) => {
    return `${value}%`
  }

  const getCorrelationBadgeColor = (correlation: number) => {
    if (correlation >= 0.9) return 'bg-green-100 text-green-800'
    if (correlation >= 0.7) return 'bg-blue-100 text-blue-800'
    if (correlation >= 0.5) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getTopValuationDriver = () => {
    const sortedMetrics = Object.entries(correlations)
      .sort(([, a], [, b]) => b - a)
      .map(([key, correlation]) => ({
        metric: VALUATION_METRICS.find(m => m.key === key),
        correlation
      }))
    
    return sortedMetrics[0]
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const topDriver = getTopValuationDriver()

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Valuation Driver Analysis</CardTitle>
          <CardDescription>
            Each metric normalized to its 10-year range (0% = lowest, 100% = highest)
          </CardDescription>
        </div>
        
        {/* Key Insight */}
        {topDriver && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium">Best Valuation Metric:</span>
              <span className="text-blue-700 dark:text-blue-300 font-semibold">
                {topDriver.metric?.name} (correlation: {topDriver.correlation.toFixed(2)})
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Use <strong>{topDriver.metric?.name === 'Free Cash Flow' ? 'P/FCF' : 
                         topDriver.metric?.name === 'Net Income' ? 'P/E' :
                         topDriver.metric?.name === 'Revenue' ? 'P/S' :
                         topDriver.metric?.name === 'Operating Cash Flow' ? 'P/OCF' :
                         'EV/EBITDA'} ratio</strong> to value {symbol} - this metric drives {Math.round(topDriver.correlation * 100)}% of price movements
            </p>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {/* Correlation Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {VALUATION_METRICS.map(metric => {
            const correlation = correlations[metric.key] || 0
            const isSelected = selectedMetrics.includes(metric.key)
            
            return (
              <button
                key={metric.key}
                onClick={() => {
                  if (isSelected && selectedMetrics.length > 1) {
                    setSelectedMetrics(selectedMetrics.filter(m => m !== metric.key))
                  } else if (!isSelected && selectedMetrics.length < 4) {
                    setSelectedMetrics([...selectedMetrics, metric.key])
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
                  isSelected 
                    ? "border-primary bg-primary/10" 
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: metric.color }}
                />
                <span className="text-sm font-medium">{metric.name}</span>
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs px-1.5", getCorrelationBadgeColor(correlation))}
                >
                  {(correlation).toFixed(2)}
                </Badge>
                {correlation === Math.max(...VALUATION_METRICS.map(m => correlations[m.key] || 0)) && correlation > 0 && (
                  <span className="text-[10px] font-bold text-green-600 ml-1">★ BEST</span>
                )}
              </button>
            )
          })}
        </div>
        
        {/* Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(date) => {
                  const d = new Date(date)
                  return d.getFullYear().toString()
                }}
                interval={1} // Show every other year to avoid crowding
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={formatYAxisTick}
                domain={[0, 100]}
                label={{ value: 'Relative Position (0-100%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={formatTooltipValue}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Legend 
                formatter={(value) => <span style={{ fontSize: '12px' }}>{value}</span>}
              />
              
              {/* Market Cap line - always shown */}
              <Line
                type="monotone"
                dataKey="marketCap"
                name="Market Cap"
                stroke="#000000"
                strokeWidth={2.5}
                dot={false}
              />
              
              {/* Selected metric lines */}
              {selectedMetrics.map(metricKey => {
                const metric = VALUATION_METRICS.find(m => m.key === metricKey)
                if (!metric) return null
                
                return (
                  <Line
                    key={metric.key}
                    type="monotone"
                    dataKey={metric.key}
                    name={metric.name}
                    stroke={metric.color}
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray={correlations[metric.key] < 0.7 ? "5 5" : undefined}
                  />
                )
              })}
              
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="mt-4 text-xs text-muted-foreground">
          <p>• <strong>Find your valuation metric:</strong> The colored line that moves most like Market Cap (black) is what investors use to value this stock</p>
          <p>• <strong>Check correlation badges:</strong> 0.9+ = Strong driver, 0.7-0.9 = Good driver, &lt;0.7 = Weak driver</p>
          <p>• <strong>Spot opportunities:</strong> If your key metric is low (20%) but Market Cap is high (80%), stock may be overvalued</p>
          <p>• <strong>Example:</strong> If FCF has 0.95 correlation, use P/FCF ratio as your primary valuation tool for {symbol}</p>
        </div>
      </CardContent>
    </Card>
  )
}
