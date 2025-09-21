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
  fiscalQuarter?: number
  fiscalYear?: number
  [key: string]: number | string | undefined
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
  const selectedPeriod = '10Y' // Display 10 years of quarterly data
  const [selectedMetrics, setSelectedMetrics] = useState(['fcf', 'netIncome', 'revenue'])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [originalData, setOriginalData] = useState<ChartDataPoint[]>([])
  const [correlations, setCorrelations] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [marketCapHistory, setMarketCapHistory] = useState<any[]>([])

  // Normalize data to 0-100% range for each metric
  const normalizeData = (data: ChartDataPoint[]): ChartDataPoint[] => {
    if (data.length === 0) return []
    
    // Get all metric keys (excluding non-metric fields)
    const metricKeys = Object.keys(data[0]).filter(key => 
      key !== 'date' && key !== 'fiscalQuarter' && key !== 'fiscalYear'
    )
    
    // Find min and max for each metric
    const ranges: Record<string, { min: number; max: number }> = {}
    metricKeys.forEach(key => {
      const values = data.map(d => d[key] as number).filter(v => v !== undefined)
      ranges[key] = {
        min: Math.min(...values),
        max: Math.max(...values)
      }
    })
    
    // Normalize each data point
    return data.map(point => {
      const normalized: any = { 
        date: point.date,
        fiscalQuarter: point.fiscalQuarter,
        fiscalYear: point.fiscalYear
      }
      
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

  // Fetch market cap history and process financial data
  useEffect(() => {
    const fetchAndProcessData = async () => {
      try {
        // Fetch historical market cap data
        const marketCapResponse = await fetch(`/api/stocks/${symbol}/market-cap-history`)
        if (!marketCapResponse.ok) {
          console.error(`[ValuationDriverChart] Failed to fetch market cap history for ${symbol}`)
          // Continue without market cap data
        }
        const marketCapData = await marketCapResponse.json()
        setMarketCapHistory(marketCapData.history || [])
        
        // Check if we have financial statements in the data
        if (!financialData?.financialStatements) {
          console.log(`[ValuationDriverChart] No financial statements available for ${symbol}`)
          console.log(`[ValuationDriverChart] financialData keys:`, Object.keys(financialData || {}))
          console.log(`[ValuationDriverChart] Is this from analysis endpoint?`, !!financialData?.analysisDate)
          setChartData([])
          setOriginalData([])
          setCorrelations({})
          setLoading(false)
          return
        }

        const { incomeStatements, cashFlowStatements } = financialData.financialStatements
        const data: ChartDataPoint[] = []
        
        // Process quarterly data
        const quarterlyIncome = incomeStatements.quarterly || []
        const quarterlyCashFlow = cashFlowStatements.quarterly || []
        
        console.log(`[ValuationDriverChart] Processing ${quarterlyIncome.length} quarters of financial data for ${symbol}`)
        console.log(`[ValuationDriverChart] Market cap history has ${marketCapData.history?.length || 0} data points`)
        
        // Create a map of quarter to financial data (using date as key)
        const financialDataByQuarter = new Map()
        
        // Process the most recent quarters (limit to last 40 quarters for 10 years)
        const recentQuarters = quarterlyIncome.slice(0, 40)
        
        for (let i = 0; i < recentQuarters.length; i++) {
          const income = recentQuarters[i]
          const cashFlow = quarterlyCashFlow.find((cf: any) => cf.date === income.date)
          
          if (income && cashFlow) {
            const quarterKey = income.date // Use the date directly as key
            
            // EBITDA might be null, so let's calculate it if needed
            const ebitda = income.ebitda || 
              (income.operatingIncome && cashFlow.depreciation ? 
                income.operatingIncome + cashFlow.depreciation : 0)
            
            // Free Cash Flow might be null, so calculate it if needed
            const fcf = cashFlow.freeCashFlow || 
              (cashFlow.operatingCashFlow && cashFlow.capitalExpenditures ? 
                cashFlow.operatingCashFlow - Math.abs(cashFlow.capitalExpenditures) : 0)
            
            financialDataByQuarter.set(quarterKey, {
              date: income.date,
              fiscalQuarter: income.fiscalQuarter,
              fiscalYear: income.fiscalYear,
              revenue: income.revenue || 0,
              netIncome: income.netIncome || 0,
              fcf: fcf,
              operatingCashFlow: cashFlow.operatingCashFlow || 0,
              ebitda: ebitda
            })
          }
        }
        
        // For quarterly data, we'll match each quarter with the closest market cap
        // from the historical data. This provides accurate historical context for
        // understanding which financial metrics best correlate with valuation changes
        
        // Helper function to find the closest market cap for a given date
        const findClosestMarketCap = (targetDate: string, marketCapHistory: any[]): number => {
          if (!marketCapHistory || marketCapHistory.length === 0) {
            return currentMarketCap || 0
          }
          
          const target = new Date(targetDate).getTime()
          let closestCap = marketCapHistory[0].marketCap
          let closestDiff = Math.abs(new Date(marketCapHistory[0].date).getTime() - target)
          
          for (const point of marketCapHistory) {
            const diff = Math.abs(new Date(point.date).getTime() - target)
            if (diff < closestDiff) {
              closestDiff = diff
              closestCap = point.marketCap
            }
          }
          
          return closestCap
        }
        
        // Convert quarterly data to chart data points
        for (const [quarterKey, financials] of financialDataByQuarter) {
          // Find the closest market cap from historical data for this quarter
          const quarterMarketCap = findClosestMarketCap(financials.date, marketCapData.history || [])
          
          data.push({
            date: financials.date,
            marketCap: quarterMarketCap,
            revenue: financials.revenue,
            netIncome: financials.netIncome,
            fcf: financials.fcf,
            operatingCashFlow: financials.operatingCashFlow,
            ebitda: financials.ebitda,
            // Store fiscal quarter info for proper labeling
            fiscalQuarter: financials.fiscalQuarter,
            fiscalYear: financials.fiscalYear
          })
        }
        
        // Sort by date (oldest first)
        data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        console.log(`[ValuationDriverChart] Generated ${data.length} combined data points`)
        console.log(`[ValuationDriverChart] Market cap variation check:`)
        const marketCaps = data.map(d => d.marketCap)
        const minMarketCap = Math.min(...marketCaps)
        const maxMarketCap = Math.max(...marketCaps)
        const marketCapRange = maxMarketCap - minMarketCap
        console.log(`  Min: ${formatDollarValue(minMarketCap)}, Max: ${formatDollarValue(maxMarketCap)}, Range: ${formatDollarValue(marketCapRange)}`)
        console.log(`[ValuationDriverChart] First few quarters:`, data.slice(0, 5).map(d => ({
          date: d.date,
          fiscalQuarter: d.fiscalQuarter,
          fiscalYear: d.fiscalYear,
          revenue: d.revenue,
          marketCap: formatDollarValue(d.marketCap)
        })))
        
        // Log the most recent quarters for validation
        console.log(`[ValuationDriverChart] Most recent quarters for validation:`)
        const recentData = data.slice(-5).reverse() // Get last 5 quarters, most recent first
        recentData.forEach(d => {
          const revenueInB = typeof d.revenue === 'number' ? (d.revenue / 1e9).toFixed(2) : '0'
          const netIncomeInB = typeof d.netIncome === 'number' ? (d.netIncome / 1e9).toFixed(2) : '0'
          const fcfInB = typeof d.fcf === 'number' ? (d.fcf / 1e9).toFixed(2) : '0'
          const opCFInB = typeof d.operatingCashFlow === 'number' ? (d.operatingCashFlow / 1e9).toFixed(2) : '0'
          const ebitdaInB = typeof d.ebitda === 'number' ? (d.ebitda / 1e9).toFixed(2) : '0'
          
          console.log(`  Q${d.fiscalQuarter} ${d.fiscalYear}: Revenue=$${revenueInB}B, NetIncome=$${netIncomeInB}B, FCF=$${fcfInB}B, OpCF=$${opCFInB}B, EBITDA=$${ebitdaInB}B`)
        })
        
        // Also log raw quarterly data from income statements for comparison
        console.log(`[ValuationDriverChart] Raw quarterly income data (first 5):`)
        quarterlyIncome.slice(0, 5).forEach((q: any) => {
          const revenueInB = q.revenue ? (q.revenue / 1e9).toFixed(2) : '0'
          const netIncomeInB = q.netIncome ? (q.netIncome / 1e9).toFixed(2) : '0'
          console.log(`  Q${q.fiscalQuarter} ${q.fiscalYear}: Revenue=$${revenueInB}B, NetIncome=$${netIncomeInB}B, Date=${q.date}`)
        })
        
        // Check for Q4 values specifically
        console.log(`[ValuationDriverChart] Q4 values check:`)
        const q4Values = quarterlyIncome.filter((q: any) => q.fiscalQuarter === 4).slice(0, 3)
        q4Values.forEach((q: any) => {
          const revenueInB = q.revenue ? (q.revenue / 1e9).toFixed(2) : '0'
          console.log(`  Q4 ${q.fiscalYear}: Revenue=$${revenueInB}B (${q.revenue})`)
        })
        
        // Compare with Q1-Q3 of same year
        console.log(`[ValuationDriverChart] Full year comparison:`)
        const years = [...new Set(quarterlyIncome.map((q: any) => q.fiscalYear))].slice(0, 2)
        years.forEach((year: any) => {
          const yearQuarters = quarterlyIncome.filter((q: any) => q.fiscalYear === year)
          console.log(`  Year ${year}:`)
          yearQuarters.forEach((q: any) => {
            const revenueInB = q.revenue ? (q.revenue / 1e9).toFixed(2) : '0'
            console.log(`    Q${q.fiscalQuarter}: Revenue=$${revenueInB}B`)
          })
          // Sum all quarters
          const totalRevenue = yearQuarters.reduce((sum: number, q: any) => sum + (q.revenue || 0), 0)
          console.log(`    Total: $${(totalRevenue / 1e9).toFixed(2)}B`)
        })
        
        // Check if financial data is from analysis endpoint
        console.log(`[ValuationDriverChart] Data source check:`)
        console.log(`  Has financialStatements: ${!!financialData.financialStatements}`)
        console.log(`  Has analysisDate: ${!!financialData.analysisDate}`)
        console.log(`  Has healthScore: ${!!financialData.healthScore}`)
        console.log(`  Is from analysis endpoint: ${!!financialData.analysisDate && !!financialData.healthScore}`)
        
        if (data.length >= 4) { // Need at least 4 quarters of data
          // Normalize data and calculate correlations
          const normalizedData = normalizeData(data)
          setChartData(normalizedData)
          setOriginalData(data)
          
          // Calculate correlations
          const newCorrelations: Record<string, number> = {}
          VALUATION_METRICS.forEach(metric => {
            newCorrelations[metric.key] = calculateCorrelation(normalizedData, metric.key)
          })
          setCorrelations(newCorrelations)
        } else {
          setChartData([])
          setOriginalData([])
          setCorrelations({})
        }
        
        setLoading(false)
      } catch (error) {
        console.error('[ValuationDriverChart] Error processing data:', error)
        setChartData([])
        setOriginalData([])
        setCorrelations({})
        setLoading(false)
      }
    }
    
    fetchAndProcessData()
  }, [symbol, financialData, currentMarketCap])

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
        return formatDollarValue(originalValue)
      }
    }
    
    return '-'
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

  // Show message when no data is available
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Valuation Driver Analysis</CardTitle>
          <CardDescription>
            10-year quarterly financial metrics trend analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-4">
            <div className="p-4 bg-muted rounded-lg max-w-md">
              <h3 className="font-semibold mb-2">Building Historical Data</h3>
              <p className="text-sm text-muted-foreground">
                We're combining {symbol}'s market cap history with financial statements to show 
                which fundamentals best correlate with valuation changes.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This requires at least 12 months of overlapping market and financial data.
              </p>
            </div>
          </div>
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
            10-year quarterly metrics normalized to their range (0% = lowest, 100% = highest)
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
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                tickFormatter={(date) => {
                  // Show only year
                  const d = new Date(date)
                  return d.getFullYear().toString()
                }}
                ticks={(() => {
                  // Show one tick per year
                  const customTicks = []
                  const yearsSeen = new Set<number>()
                  
                  if (chartData.length > 0) {
                    // Go through data and pick first quarter of each year
                    for (const point of chartData) {
                      const year = new Date(point.date).getFullYear()
                      if (!yearsSeen.has(year)) {
                        yearsSeen.add(year)
                        customTicks.push(point.date)
                      }
                    }
                  }
                  
                  return customTicks
                })()}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={formatYAxisTick}
                domain={[0, 100]}
                label={{ value: 'Relative Position (0-100%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={formatTooltipValue}
                labelFormatter={(date) => {
                  // Find the data point for this date to get fiscal quarter info
                  const dataPoint = chartData.find(d => d.date === date)
                  if (dataPoint && dataPoint.fiscalQuarter && dataPoint.fiscalYear) {
                    return `Q${dataPoint.fiscalQuarter} ${dataPoint.fiscalYear}`
                  }
                  
                  // Fallback to date-based quarter calculation
                  const d = new Date(date)
                  const year = d.getFullYear()
                  const month = d.getMonth() + 1 // 1-12
                  
                  // Determine quarter based on month
                  let quarter
                  if (month <= 3) quarter = 'Q1'
                  else if (month <= 6) quarter = 'Q2'
                  else if (month <= 9) quarter = 'Q3'
                  else quarter = 'Q4'
                  
                  return `${quarter} ${year}`
                }}
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
                activeDot={{ r: 4 }}
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
                    activeDot={{ r: 3 }}
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
