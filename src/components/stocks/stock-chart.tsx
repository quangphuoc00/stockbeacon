'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  BarChart3,
  LineChart,
  CandlestickChart,
  Loader2,
  Info
} from 'lucide-react'
import { formatCurrency, formatPercentage, formatLargeNumber } from '@/lib/utils'
import { StockHistorical } from '@/types/stock'

interface StockChartProps {
  symbol: string
  historicalData: StockHistorical[]
  currentPrice?: number
}

type ChartType = 'candlestick' | 'line' | 'area'
type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y' | 'ALL'

interface TechnicalIndicators {
  ma20: number[]
  ma50: number[]
  ma200: number[]
  rsi: number[]
  supportLevels: number[]
  resistanceLevels: number[]
}

export function StockChart({ symbol, historicalData, currentPrice }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const seriesRef = useRef<any>(null)
  const volumeSeriesRef = useRef<any>(null)

  const [chartType, setChartType] = useState<ChartType>('candlestick')
  const [timeRange, setTimeRange] = useState<TimeRange>('3M')
  const [showVolume, setShowVolume] = useState(true)
  const [showMA, setShowMA] = useState(true)
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate technical indicators
  const calculateIndicators = (data: StockHistorical[]): TechnicalIndicators => {
    const prices = data.map(d => d.close)
    
    // Moving Averages
    const calculateMA = (period: number) => {
      return prices.map((_, index) => {
        if (index < period - 1) return 0
        const sum = prices.slice(index - period + 1, index + 1).reduce((a, b) => a + b, 0)
        return sum / period
      })
    }

    // RSI Calculation
    const calculateRSI = (period: number = 14) => {
      const rsi: number[] = []
      let gains = 0
      let losses = 0

      for (let i = 1; i < prices.length; i++) {
        const difference = prices[i] - prices[i - 1]
        if (i <= period) {
          if (difference >= 0) gains += difference
          else losses -= difference
        } else {
          if (difference >= 0) {
            gains = (gains * (period - 1) + difference) / period
            losses = (losses * (period - 1)) / period
          } else {
            gains = (gains * (period - 1)) / period
            losses = (losses * (period - 1) - difference) / period
          }
        }

        if (i >= period) {
          const rs = gains / losses
          rsi.push(100 - 100 / (1 + rs))
        } else {
          rsi.push(50)
        }
      }
      return rsi
    }

    // Support and Resistance Levels
    const calculateSupportResistance = () => {
      const highs = data.map(d => d.high)
      const lows = data.map(d => d.low)
      
      const resistance: number[] = []
      const support: number[] = []
      
      for (let i = 10; i < highs.length - 10; i++) {
        const localHigh = highs.slice(i - 10, i + 11).reduce((max, val) => Math.max(max, val), 0)
        const localLow = lows.slice(i - 10, i + 11).reduce((min, val) => Math.min(min, val), Infinity)
        
        if (highs[i] === localHigh && !resistance.includes(highs[i])) {
          resistance.push(highs[i])
        }
        if (lows[i] === localLow && !support.includes(lows[i])) {
          support.push(lows[i])
        }
      }
      
      resistance.sort((a, b) => b - a).slice(0, 3)
      support.sort((a, b) => a - b).slice(0, 3)
      
      return { support, resistance }
    }

    const { support, resistance } = calculateSupportResistance()

    return {
      ma20: calculateMA(20),
      ma50: calculateMA(50),
      ma200: calculateMA(200),
      rsi: calculateRSI(),
      supportLevels: support,
      resistanceLevels: resistance,
    }
  }

  // Filter data based on time range
  const filterDataByTimeRange = (data: StockHistorical[], range: TimeRange): StockHistorical[] => {
    const now = new Date()
    let startDate: Date

    switch (range) {
      case '1D':
        startDate = new Date(now.setDate(now.getDate() - 1))
        break
      case '1W':
        startDate = new Date(now.setDate(now.getDate() - 7))
        break
      case '1M':
        startDate = new Date(now.setMonth(now.getMonth() - 1))
        break
      case '3M':
        startDate = new Date(now.setMonth(now.getMonth() - 3))
        break
      case '1Y':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1))
        break
      case '5Y':
        startDate = new Date(now.setFullYear(now.getFullYear() - 5))
        break
      case 'ALL':
      default:
        return data
    }

    return data.filter(d => new Date(d.date) >= startDate)
  }

  // Initialize and update chart
  useEffect(() => {
    const initChart = async () => {
      if (!chartContainerRef.current || !historicalData || historicalData.length === 0) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Dynamically import lightweight-charts to avoid SSR issues
        const { createChart, ColorType } = await import('lightweight-charts')

        // Clear existing chart
        if (chartRef.current) {
          chartRef.current.remove()
        }

        // Create new chart
        const chart = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: 500,
          layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: '#9ca3af',
          },
          grid: {
            vertLines: { color: '#1f2937' },
            horzLines: { color: '#1f2937' },
          },
          crosshair: {
            mode: 1,
            vertLine: {
              width: 1,
              color: '#6b7280',
              style: 2,
            },
            horzLine: {
              width: 1,
              color: '#6b7280',
              style: 2,
            },
          },
          rightPriceScale: {
            borderColor: '#1f2937',
            scaleMargins: {
              top: 0.1,
              bottom: showVolume ? 0.25 : 0.1,
            },
          },
          timeScale: {
            borderColor: '#1f2937',
            timeVisible: true,
            secondsVisible: false,
          },
        })

        chartRef.current = chart

        // Filter data by time range
        const filteredData = filterDataByTimeRange(historicalData, timeRange)
        
        // Calculate indicators
        const calculatedIndicators = calculateIndicators(filteredData)
        setIndicators(calculatedIndicators)

        // Add price series based on chart type
        let series: any
        
        if (chartType === 'candlestick') {
          series = chart.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderUpColor: '#10b981',
            borderDownColor: '#ef4444',
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
          })

          const candleData = filteredData.map(d => ({
            time: new Date(d.date).getTime() / 1000,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }))

          series.setData(candleData)
        } else if (chartType === 'line') {
          series = chart.addLineSeries({
            color: '#3b82f6',
            lineWidth: 2,
          })

          const lineData = filteredData.map(d => ({
            time: new Date(d.date).getTime() / 1000,
            value: d.close,
          }))

          series.setData(lineData)
        } else if (chartType === 'area') {
          series = chart.addAreaSeries({
            lineColor: '#3b82f6',
            topColor: 'rgba(59, 130, 246, 0.4)',
            bottomColor: 'rgba(59, 130, 246, 0)',
            lineWidth: 2,
          })

          const areaData = filteredData.map(d => ({
            time: new Date(d.date).getTime() / 1000,
            value: d.close,
          }))

          series.setData(areaData)
        }

        seriesRef.current = series

        // Add volume bars if enabled
        if (showVolume) {
          const volumeSeries = chart.addHistogramSeries({
            color: '#6366f1',
            priceFormat: {
              type: 'volume',
            },
            priceScaleId: '',
            scaleMargins: {
              top: 0.8,
              bottom: 0,
            },
          })

          const volumeData = filteredData.map((d) => ({
            time: new Date(d.date).getTime() / 1000,
            value: d.volume,
            color: d.close >= d.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
          }))

          volumeSeries.setData(volumeData)
          volumeSeriesRef.current = volumeSeries
        }

        // Add moving averages if enabled
        if (showMA && calculatedIndicators) {
          // MA20
          const ma20Series = chart.addLineSeries({
            color: '#f59e0b',
            lineWidth: 1,
            lineStyle: 2,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
          })

          const ma20Data = filteredData
            .map((d, i) => ({
              time: new Date(d.date).getTime() / 1000,
              value: calculatedIndicators.ma20[i],
            }))
            .filter(d => d.value > 0)

          ma20Series.setData(ma20Data)

          // MA50
          const ma50Series = chart.addLineSeries({
            color: '#8b5cf6',
            lineWidth: 1,
            lineStyle: 2,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
          })

          const ma50Data = filteredData
            .map((d, i) => ({
              time: new Date(d.date).getTime() / 1000,
              value: calculatedIndicators.ma50[i],
            }))
            .filter(d => d.value > 0)

          ma50Series.setData(ma50Data)

          // MA200
          const ma200Series = chart.addLineSeries({
            color: '#ec4899',
            lineWidth: 1,
            lineStyle: 2,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
          })

          const ma200Data = filteredData
            .map((d, i) => ({
              time: new Date(d.date).getTime() / 1000,
              value: calculatedIndicators.ma200[i],
            }))
            .filter(d => d.value > 0)

          ma200Series.setData(ma200Data)
        }

        // Add support and resistance levels
        if (indicators && seriesRef.current) {
          indicators.resistanceLevels.forEach((level, index) => {
            seriesRef.current.createPriceLine({
              price: level,
              color: '#ef4444',
              lineWidth: 1,
              lineStyle: 2,
              axisLabelVisible: true,
              title: `R${index + 1}`,
            })
          })

          indicators.supportLevels.forEach((level, index) => {
            seriesRef.current.createPriceLine({
              price: level,
              color: '#10b981',
              lineWidth: 1,
              lineStyle: 2,
              axisLabelVisible: true,
              title: `S${index + 1}`,
            })
          })
        }

        // Fit content
        chart.timeScale().fitContent()

        // Handle resize
        const handleResize = () => {
          if (chart && chartContainerRef.current) {
            chart.applyOptions({
              width: chartContainerRef.current.clientWidth,
            })
          }
        }
        window.addEventListener('resize', handleResize)

        setLoading(false)

        return () => {
          window.removeEventListener('resize', handleResize)
          if (chart) {
            chart.remove()
          }
        }
      } catch (err) {
        console.error('Error initializing chart:', err)
        setError('Failed to load chart. Please try again.')
        setLoading(false)
      }
    }

    initChart()
  }, [chartType, timeRange, showVolume, showMA, historicalData])

  // Calculate price change
  const priceChange = historicalData && historicalData.length > 0 && currentPrice
    ? currentPrice - historicalData[historicalData.length - 1].close
    : 0
  const priceChangePercent = historicalData && historicalData.length > 0 && currentPrice
    ? ((currentPrice - historicalData[historicalData.length - 1].close) / historicalData[historicalData.length - 1].close) * 100
    : 0

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">{symbol} Chart</CardTitle>
            {currentPrice && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-3xl font-bold">{formatCurrency(currentPrice)}</span>
                <Badge className={priceChange >= 0 ? 'bg-green-500' : 'bg-red-500'}>
                  {priceChange >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  {formatCurrency(Math.abs(priceChange))} ({formatPercentage(priceChangePercent)})
                </Badge>
              </div>
            )}
          </div>
          
          {/* Chart Type Selector */}
          <Tabs value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
            <TabsList>
              <TabsTrigger value="candlestick" title="Candlestick Chart">
                <CandlestickChart className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="line" title="Line Chart">
                <LineChart className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="area" title="Area Chart">
                <BarChart3 className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1">
            {(['1D', '1W', '1M', '3M', '1Y', '5Y', 'ALL'] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>

          {/* Indicator Toggles */}
          <div className="flex gap-2">
            <Button
              variant={showVolume ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowVolume(!showVolume)}
            >
              Volume
            </Button>
            <Button
              variant={showMA ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowMA(!showMA)}
            >
              MA
            </Button>
          </div>
        </div>

        {/* Legend */}
        {showMA && (
          <div className="flex gap-4 mt-2 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-amber-500"></div>
              <span className="text-muted-foreground">MA20</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-violet-500"></div>
              <span className="text-muted-foreground">MA50</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-pink-500"></div>
              <span className="text-muted-foreground">MA200</span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {/* Chart Container */}
        {loading ? (
          <div className="h-[500px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="h-[500px] flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : (
          <div ref={chartContainerRef} className="w-full" />
        )}

        {/* Support/Resistance Levels */}
        {indicators && !loading && !error && (
          <div className="px-6 py-4 border-t">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-red-500" />
                  Resistance Levels
                </h4>
                <div className="flex gap-2 mt-1">
                  {indicators.resistanceLevels.map((level, index) => (
                    <Badge key={index} variant="outline" className="text-red-500 border-red-500">
                      R{index + 1}: {formatCurrency(level)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-green-500" />
                  Support Levels
                </h4>
                <div className="flex gap-2 mt-1">
                  {indicators.supportLevels.map((level, index) => (
                    <Badge key={index} variant="outline" className="text-green-500 border-green-500">
                      S{index + 1}: {formatCurrency(level)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RSI Indicator */}
        {indicators && indicators.rsi.length > 0 && !loading && !error && (
          <div className="px-6 py-3 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">RSI (14)</span>
              </div>
              <Badge 
                className={
                  indicators.rsi[indicators.rsi.length - 1] > 70 ? 'bg-red-500' :
                  indicators.rsi[indicators.rsi.length - 1] < 30 ? 'bg-green-500' :
                  'bg-gray-500'
                }
              >
                {indicators.rsi[indicators.rsi.length - 1].toFixed(2)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {indicators.rsi[indicators.rsi.length - 1] > 70 ? 'Overbought' :
                 indicators.rsi[indicators.rsi.length - 1] < 30 ? 'Oversold' :
                 'Neutral'}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}