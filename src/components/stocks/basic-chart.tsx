'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown,
  Loader2,
} from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { StockHistorical } from '@/types/stock'

interface BasicChartProps {
  symbol: string
  historicalData: StockHistorical[]
  currentPrice?: number
}

type TimeRange = '1W' | '1M' | '3M' | '1Y' | 'ALL'

export default function BasicChart({ symbol, historicalData, currentPrice }: BasicChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('3M')
  const [chartInstance, setChartInstance] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Filter data based on time range
  const filterDataByTimeRange = (data: StockHistorical[], range: TimeRange): StockHistorical[] => {
    if (!data || data.length === 0) return []
    
    const now = new Date()
    const startDate = new Date()

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
    if (!chartContainerRef.current || !historicalData || historicalData.length === 0) {
      console.log('BasicChart: No container or data')
      setIsLoading(false)
      return
    }

    const loadChart = async () => {
      try {
        console.log('BasicChart: Starting to load lightweight-charts')
        const LightweightCharts = await import('lightweight-charts')
        console.log('BasicChart: Lightweight-charts loaded')

        // Remove existing chart
        if (chartInstance) {
          chartInstance.remove()
        }

        // Create chart
        const chart = LightweightCharts.createChart(chartContainerRef.current!, {
          width: chartContainerRef.current!.clientWidth,
          height: 400,
          layout: {
            background: { type: LightweightCharts.ColorType.Solid, color: '#ffffff' },
            textColor: '#333',
          },
          grid: {
            vertLines: { color: '#e0e0e0' },
            horzLines: { color: '#e0e0e0' },
          },
        })

        // Add line series
        const lineSeries = chart.addLineSeries({
          color: '#3b82f6',
          lineWidth: 2,
        })

        // Filter and prepare data
        const filteredData = filterDataByTimeRange(historicalData, timeRange)
        const chartData = filteredData
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map(d => ({
            time: new Date(d.date).toISOString().split('T')[0],
            value: d.close,
          }))

        console.log('BasicChart: Setting data, points:', chartData.length)
        lineSeries.setData(chartData)
        
        // Fit content
        chart.timeScale().fitContent()
        
        setChartInstance(chart)
        setIsLoading(false)

        // Handle resize
        const handleResize = () => {
          if (chartContainerRef.current) {
            chart.applyOptions({
              width: chartContainerRef.current.clientWidth,
            })
          }
        }
        
        window.addEventListener('resize', handleResize)
        
        return () => {
          window.removeEventListener('resize', handleResize)
          chart.remove()
        }
      } catch (error) {
        console.error('BasicChart: Error loading chart:', error)
        setIsLoading(false)
      }
    }

    loadChart()
  }, [timeRange, historicalData])

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
            <CardTitle className="text-2xl font-bold">{symbol} Price Chart</CardTitle>
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

      <CardContent>
        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Loading chart...</p>
            </div>
          </div>
        ) : historicalData && historicalData.length > 0 ? (
          <div ref={chartContainerRef} className="w-full" />
        ) : (
          <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded">
            <p className="text-gray-500">No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
