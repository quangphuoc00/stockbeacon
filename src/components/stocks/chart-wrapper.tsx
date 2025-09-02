'use client'

import { useState, useEffect } from 'react'
import { TradingViewChart } from './tradingview-chart'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3,
  LineChart,
  AreaChart,
  Loader2
} from 'lucide-react'

interface ChartWrapperProps {
  symbol: string
  currentPrice?: number
  priceChange?: number
  priceChangePercent?: number
}

// Map UI period labels to Yahoo Finance API format
function mapPeriodToYahoo(period: string): '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y' {
  const periodMap: Record<string, '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y'> = {
    '1D': '1d',
    '5D': '5d',
    '1M': '1mo',
    '3M': '3mo',
    '6M': '6mo',
    '1Y': '1y',
    '5Y': '5y'
  }
  return periodMap[period] || '3mo'
}

export function ChartWrapper({ 
  symbol, 
  currentPrice = 0,
  priceChange = 0,
  priceChangePercent = 0 
}: ChartWrapperProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('3M')
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('candlestick')
  const [showVolume, setShowVolume] = useState(true)
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const periods = ['1D', '5D', '1M', '3M', '6M', '1Y', '5Y']

  useEffect(() => {
    // Fetch real historical data from API route
    const fetchHistoricalData = async () => {
      setLoading(true)
      
      try {
        const yahooPeriod = mapPeriodToYahoo(selectedPeriod)
        console.log(`Fetching ${yahooPeriod} historical data for ${symbol}`)
        
        // Call our API route instead of the service directly
        const response = await fetch(`/api/stocks/${symbol}/historical?period=${yahooPeriod}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`)
        }
        
        const result = await response.json()
        
        if (result.data && result.data.length > 0) {
          // Transform data to the format expected by TradingView chart
          const transformedData = result.data.map((item: any) => {
            // For intraday data (1D, 5D), use Unix timestamp to preserve time
            // For daily data (1M+), use date string
            const isIntraday = selectedPeriod === '1D' || selectedPeriod === '5D'
            
            let timeValue
            if (isIntraday) {
              // Use Unix timestamp (in seconds) for intraday data
              timeValue = Math.floor(new Date(item.date).getTime() / 1000)
            } else {
              // Use YYYY-MM-DD format for daily data
              timeValue = item.date 
                ? new Date(item.date).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0]
            }
            
            return {
              time: timeValue,
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
              volume: item.volume
            }
          })
          
          // Sort data by time in ascending order
          transformedData.sort((a: any, b: any) => {
            if (typeof a.time === 'number' && typeof b.time === 'number') {
              return a.time - b.time
            } else {
              return new Date(a.time).getTime() - new Date(b.time).getTime()
            }
          })
          
          // Remove any duplicates (keep the last one for each timestamp)
          const uniqueData = transformedData.filter((item: any, index: number, array: any[]) => {
            if (index === array.length - 1) return true
            return item.time !== array[index + 1].time
          })
          
          console.log(`Received ${uniqueData.length} unique data points for ${symbol} (from ${transformedData.length} total)`)
          setChartData(uniqueData)
        } else {
          console.log(`No historical data available for ${symbol}`)
          setChartData([])
        }
      } catch (error) {
        console.error(`Error fetching historical data for ${symbol}:`, error)
        setChartData([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchHistoricalData()
  }, [selectedPeriod, symbol])

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              ${currentPrice.toFixed(2)}
            </span>
            <div className={`flex items-center gap-1 ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {priceChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="font-medium">
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Chart Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Selector */}
          <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <TabsList className="grid grid-cols-7 h-9">
              {periods.map(period => (
                <TabsTrigger 
                  key={period} 
                  value={period}
                  className="px-3 text-xs"
                >
                  {period}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Chart Type Selector */}
          <div className="flex gap-1 border rounded-md p-1">
            <Button
              size="sm"
              variant={chartType === 'line' ? 'secondary' : 'ghost'}
              className="h-7 px-2"
              onClick={() => setChartType('line')}
            >
              <LineChart className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={chartType === 'candlestick' ? 'secondary' : 'ghost'}
              className="h-7 px-2"
              onClick={() => setChartType('candlestick')}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={chartType === 'area' ? 'secondary' : 'ghost'}
              className="h-7 px-2"
              onClick={() => setChartType('area')}
            >
              <AreaChart className="h-4 w-4" />
            </Button>
          </div>

          {/* Volume Toggle */}
          <Button
            size="sm"
            variant={showVolume ? 'secondary' : 'outline'}
            className="h-9"
            onClick={() => setShowVolume(!showVolume)}
          >
            <Activity className="h-4 w-4 mr-1" />
            Volume
          </Button>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-[500px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <TradingViewChart
          symbol={symbol}
          data={chartData}
          chartType={chartType}
          showVolume={showVolume}
          height={500}
        />
      )}
    </div>
  )
}
