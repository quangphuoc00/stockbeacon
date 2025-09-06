'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { TradingViewChart } from './tradingview-chart'
import { Button } from '@/components/ui/button'

import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Loader2,
  GitBranch,
  TrendingUp as TrendingUpIcon
} from 'lucide-react'

interface ChartWrapperProps {
  symbol: string
  currentPrice?: number
  priceChange?: number
  priceChangePercent?: number
}



export function ChartWrapper({ 
  symbol, 
  currentPrice = 0,
  priceChange = 0,
  priceChangePercent = 0 
}: ChartWrapperProps) {
  const [chartType] = useState<'candlestick' | 'line' | 'area'>('candlestick')
  const [showVolume, setShowVolume] = useState(false)
  const [showSupportResistance, setShowSupportResistance] = useState(false)
  const [showMA, setShowMA] = useState(false)
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadingMoreRef = useRef(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    // Fetch 5 years of historical data to ensure all MAs have sufficient data
    const fetchHistoricalData = async () => {
      setLoading(true)
      
      try {
        // Default to 5 years of data to ensure enough data points for all MAs
        console.log(`Fetching 5 years historical data for ${symbol}`)
        
        // Call our API route with 5y period to get sufficient data for MA200
        const response = await fetch(`/api/stocks/${symbol}/historical?period=5y`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`)
        }
        
        const result = await response.json()
        
        if (result.data && result.data.length > 0) {
          // Transform data to the format expected by TradingView chart
          const transformedData = result.data.map((item: any) => {
            // Use YYYY-MM-DD format for daily data (1Y default)
            const timeValue = item.date 
              ? new Date(item.date).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0]
            
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
            return new Date(a.time).getTime() - new Date(b.time).getTime()
          })
          
          // Remove any duplicates (keep the last one for each timestamp)
          const uniqueData = transformedData.filter((item: any, index: number, array: any[]) => {
            if (index === array.length - 1) return true
            return item.time !== array[index + 1].time
          })
          
          console.log(`Received ${uniqueData.length} unique data points for ${symbol} (from ${transformedData.length} total)`)
          setChartData(uniqueData)
          setIsInitialLoad(true)
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
  }, [symbol])

  // Handle visible range changes to load more data
  const handleVisibleRangeChanged = useCallback(async (from: Date, to: Date) => {
    // Prevent multiple simultaneous loads
    if (loadingMoreRef.current || isLoadingMore) return
    
    loadingMoreRef.current = true
    setIsLoadingMore(true)
    
    try {
      // Get the earliest date we currently have
      const earliestDate = chartData.length > 0 
        ? new Date(chartData[0].time)
        : new Date()
      
      // Calculate date 2 years before our earliest data
      const newStartDate = new Date(earliestDate)
      newStartDate.setFullYear(newStartDate.getFullYear() - 2)
      
      console.log(`Loading more historical data from ${newStartDate.toISOString()} to ${earliestDate.toISOString()}`)
      
      // Fetch additional historical data
      const response = await fetch(
        `/api/stocks/${symbol}/historical?startDate=${newStartDate.toISOString()}&endDate=${earliestDate.toISOString()}&interval=1d`
      )
      
      if (!response.ok) {
        // If we get a 404, it means no data is available for this date range
        if (response.status === 404) {
          console.log('No additional historical data available for this date range')
          loadingMoreRef.current = false
          setIsLoadingMore(false)
          return
        }
        // Only throw for non-404 errors
        console.warn(`Failed to fetch additional data: ${response.status} ${response.statusText}`)
        loadingMoreRef.current = false
        setIsLoadingMore(false)
        return
      }
      
      const result = await response.json()
      
      if (result.data && result.data.length > 0) {
        // Transform the new data
        const transformedData = result.data.map((item: any) => {
          const timeValue = item.date 
            ? new Date(item.date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
          
          return {
            time: timeValue,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume
          }
        })
        
        // Sort new data
        transformedData.sort((a: any, b: any) => {
          return new Date(a.time).getTime() - new Date(b.time).getTime()
        })
        
        // Remove duplicates and merge with existing data
        const existingTimes = new Set(chartData.map(d => d.time))
        const newUniqueData = transformedData.filter((item: any) => !existingTimes.has(item.time))
        
        if (newUniqueData.length > 0) {
          // Prepend new data to existing data
          const mergedData = [...newUniqueData, ...chartData]
          console.log(`Added ${newUniqueData.length} new historical data points`)
          setIsInitialLoad(false) // This is not an initial load
          setChartData(mergedData)
        }
      }
    } catch (error) {
      // Don't log 404 errors as they're expected when no more data is available
      if (error instanceof Error && !error.message.includes('Not Found')) {
        console.error('Error loading more historical data:', error)
      }
    } finally {
      loadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }, [chartData, symbol, isLoadingMore])

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

          {/* Support/Resistance Toggle */}
          <Button
            size="sm"
            variant={showSupportResistance ? 'secondary' : 'outline'}
            className="h-9"
            onClick={() => setShowSupportResistance(!showSupportResistance)}
          >
            <GitBranch className="h-4 w-4 mr-1" />
            Support/Resistance Levels
          </Button>

          {/* MA Lines Toggle */}
          <Button
            size="sm"
            variant={showMA ? 'secondary' : 'outline'}
            className="h-9"
            onClick={() => setShowMA(!showMA)}
          >
            <TrendingUpIcon className="h-4 w-4 mr-1" />
            MA Lines
          </Button>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-[500px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="relative">
          {isLoadingMore && (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-background/90 backdrop-blur px-3 py-1.5 rounded-md border">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading more data...</span>
            </div>
          )}
          <TradingViewChart
            symbol={symbol}
            data={chartData}
            chartType="candlestick"
            showVolume={showVolume}
            showSupportResistance={showSupportResistance}
            showMA={showMA}
            height={600}
            onVisibleRangeChanged={handleVisibleRangeChanged}
            initialZoom={isInitialLoad}
          />
        </div>
      )}
    </div>
  )
}
