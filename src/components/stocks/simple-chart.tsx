'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown,
  LineChart,
  CandlestickChart,
  BarChart3,
  Loader2,
} from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { StockHistorical } from '@/types/stock'

interface StockChartProps {
  symbol: string
  historicalData: StockHistorical[]
  currentPrice?: number
}

type ChartType = 'line' | 'candlestick' | 'area'
type TimeRange = '1W' | '1M' | '3M' | '1Y' | 'ALL'

export function SimpleChart({ symbol, historicalData, currentPrice }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<any>(null)
  const [chartType, setChartType] = useState<ChartType>('line')
  const [timeRange, setTimeRange] = useState<TimeRange>('3M')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter data based on time range
  const filterDataByTimeRange = (data: StockHistorical[], range: TimeRange): StockHistorical[] => {
    if (!data || data.length === 0) return []
    
    const now = new Date()
    let startDate: Date = new Date()

    switch (range) {
      case '1W':
        startDate.setDate(now.getDate() - 7)
        break
      case '1M':
        startDate.setMonth(now.getMonth() - 1)
        break
      case '3M':
        startDate.setMonth(now.getMonth() - 3)
        break
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case 'ALL':
        return data
    }

    return data.filter(d => new Date(d.date) >= startDate)
  }

  useEffect(() => {
    let chartInstance: any = null
    
    const initChart = async () => {
      // Check if we have the container and data
      if (!chartContainerRef.current) {
        console.log('No chart container')
        return
      }

      if (!historicalData || historicalData.length === 0) {
        console.log('No historical data')
        setError('No historical data available')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Dynamically import lightweight-charts
        const LightweightCharts = await import('lightweight-charts')
        
        // Remove existing chart if any
        if (chartInstanceRef.current) {
          chartInstanceRef.current.remove()
          chartInstanceRef.current = null
        }

        // Create new chart
        chartInstance = LightweightCharts.createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: 400,
          layout: {
            background: { type: LightweightCharts.ColorType.Solid, color: 'transparent' },
            textColor: '#9ca3af',
          },
          grid: {
            vertLines: { color: '#e5e7eb' },
            horzLines: { color: '#e5e7eb' },
          },
          rightPriceScale: {
            borderColor: '#e5e7eb',
          },
          timeScale: {
            borderColor: '#e5e7eb',
            timeVisible: true,
            secondsVisible: false,
          },
          crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
          },
        })

        // Filter and prepare data
        const filteredData = filterDataByTimeRange(historicalData, timeRange)
        
        if (filteredData.length === 0) {
          setError('No data for selected time range')
          setLoading(false)
          return
        }

        // Sort data by date (oldest first)
        const sortedData = [...filteredData].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        )

        // Create series based on chart type
        let series: any
        
        if (chartType === 'candlestick') {
          series = chartInstance.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderUpColor: '#10b981',
            borderDownColor: '#ef4444',
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
          })

          const candleData = sortedData.map(d => ({
            time: Math.floor(new Date(d.date).getTime() / 1000) as any,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }))

          series.setData(candleData)
        } else if (chartType === 'area') {
          series = chartInstance.addAreaSeries({
            lineColor: '#3b82f6',
            topColor: 'rgba(59, 130, 246, 0.4)',
            bottomColor: 'rgba(59, 130, 246, 0.01)',
            lineWidth: 2,
          })

          const areaData = sortedData.map(d => ({
            time: Math.floor(new Date(d.date).getTime() / 1000) as any,
            value: d.close,
          }))

          series.setData(areaData)
        } else {
          // Line chart (default)
          series = chartInstance.addLineSeries({
            color: '#3b82f6',
            lineWidth: 2,
          })

          const lineData = sortedData.map(d => ({
            time: Math.floor(new Date(d.date).getTime() / 1000) as any,
            value: d.close,
          }))

          series.setData(lineData)
        }

        // Add volume bars
        const volumeSeries = chartInstance.addHistogramSeries({
          color: '#9ca3af',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '',
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
        })

        const volumeData = sortedData.map(d => ({
          time: Math.floor(new Date(d.date).getTime() / 1000) as any,
          value: d.volume,
          color: d.close >= d.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
        }))

        volumeSeries.setData(volumeData)

        // Fit content
        chartInstance.timeScale().fitContent()

        // Store chart instance
        chartInstanceRef.current = chartInstance

        // Handle resize
        const handleResize = () => {
          if (chartContainerRef.current && chartInstance) {
            chartInstance.applyOptions({
              width: chartContainerRef.current.clientWidth,
            })
          }
        }
        
        window.addEventListener('resize', handleResize)
        
        setLoading(false)

        // Cleanup function
        return () => {
          window.removeEventListener('resize', handleResize)
          if (chartInstance) {
            chartInstance.remove()
          }
        }
      } catch (err) {
        console.error('Chart initialization error:', err)
        setError(`Failed to initialize chart: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setLoading(false)
      }
    }

    // Initialize chart
    initChart()

    // Cleanup on unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove()
        chartInstanceRef.current = null
      }
    }
  }, [chartType, timeRange, historicalData])

  // Calculate price change
  const priceChange = historicalData && historicalData.length > 0 && currentPrice
    ? currentPrice - historicalData[historicalData.length - 1].close
    : 0
  const priceChangePercent = historicalData && historicalData.length > 0 && currentPrice
    ? ((currentPrice - historicalData[historicalData.length - 1].close) / historicalData[historicalData.length - 1].close) * 100
    : 0

  return (
    <Card>
      <CardHeader>
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
              <TabsTrigger value="line" title="Line Chart">
                <LineChart className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="candlestick" title="Candlestick Chart">
                <CandlestickChart className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="area" title="Area Chart">
                <BarChart3 className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1 mt-4">
          {(['1W', '1M', '3M', '1Y', 'ALL'] as TimeRange[]).map((range) => (
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
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="h-[400px] flex items-center justify-center bg-muted/10 m-6 rounded">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading chart...</p>
            </div>
          </div>
        ) : error ? (
          <div className="h-[400px] flex items-center justify-center bg-muted/10 m-6 rounded">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">{error}</p>
              <p className="text-xs text-muted-foreground mt-2">Please try refreshing the page</p>
            </div>
          </div>
        ) : (
          <div ref={chartContainerRef} className="w-full px-6 pb-6" />
        )}
      </CardContent>
    </Card>
  )
}