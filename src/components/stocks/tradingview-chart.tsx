'use client'

import { useEffect, useRef } from 'react'
import { calculateSupportResistance, formatSupportResistancePrice } from '@/lib/utils/support-resistance'

interface TradingViewChartProps {
  symbol: string
  data: any[]
  chartType?: 'candlestick' | 'line' | 'area'
  showVolume?: boolean
  showSupportResistance?: boolean
  showMA?: boolean
  height?: number
  onVisibleRangeChanged?: (from: Date, to: Date) => void
  initialZoom?: boolean
}

export function TradingViewChart({
  symbol,
  data,
  chartType = 'candlestick',
  showVolume = false,
  showSupportResistance = false,
  showMA = false,
  height = 500,
  onVisibleRangeChanged,
  initialZoom = true,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<any>(null)
  const resizeHandlerRef = useRef<any>(null)
  const isInitializingRef = useRef<boolean>(false)
  const seriesRef = useRef<any>({})
  const currentVisibleRangeRef = useRef<any>(null)
  const previousDataLengthRef = useRef<number>(0)
  const isFirstDataRef = useRef<boolean>(true)
  const hasInitializedRef = useRef<boolean>(false)

  // Cleanup function to remove existing chart
  const cleanupChart = () => {
    if (resizeHandlerRef.current) {
      window.removeEventListener('resize', resizeHandlerRef.current)
      resizeHandlerRef.current = null
    }
    if (chartInstanceRef.current) {
      try {
        chartInstanceRef.current.remove()
      } catch (e) {
        console.error('Error removing chart:', e)
      }
      chartInstanceRef.current = null
    }
    isInitializingRef.current = false
  }

  useEffect(() => {
    // Prevent multiple simultaneous initializations
    if (isInitializingRef.current) {
      console.log('Chart already initializing, skipping...')
      return
    }

    // Clean up any existing chart first
    cleanupChart()

    // Don't create chart if no container or data
    if (!chartContainerRef.current || !data || data.length === 0) return

    // Mark as initializing
    isInitializingRef.current = true

    const initChart = async () => {
      try {
        console.log('Initializing chart for', symbol)
        
        // Dynamically import lightweight-charts to avoid SSR issues
        const LightweightCharts = await import('lightweight-charts')
        const { createChart, ColorType, CrosshairMode } = LightweightCharts
        
        // Double-check container still exists (in case component unmounted during async import)
        if (!chartContainerRef.current) {
          console.log('Container not found, aborting chart creation')
          isInitializingRef.current = false
          return
        }

        // Clear any existing content in the container
        chartContainerRef.current.innerHTML = ''

        console.log('Creating chart instance...')
        // Create chart with professional styling
        const chart = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: height,
          layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: '#9ca3af',
            fontSize: 12,
          },
          grid: {
            vertLines: {
              color: 'rgba(42, 46, 57, 0.2)',
            },
            horzLines: {
              color: 'rgba(42, 46, 57, 0.2)',
            },
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: {
              width: 1,
              color: '#758696',
              style: 3,
              labelBackgroundColor: '#2B2B43',
            },
            horzLine: {
              width: 1,
              color: '#758696',
              style: 3,
              labelBackgroundColor: '#2B2B43',
            },
          },
          rightPriceScale: {
            borderColor: 'rgba(42, 46, 57, 0.2)',
            scaleMargins: {
              top: 0.1,
              bottom: showVolume ? 0.3 : 0.1,
            },
          },
          timeScale: {
            borderColor: 'rgba(42, 46, 57, 0.2)',
            timeVisible: true,
            secondsVisible: false,
          },
        })

        console.log('Chart created successfully:', chart)
        
        // Store chart instance in ref for cleanup
        chartInstanceRef.current = chart
        
        // Subscribe to visible range changes to track current view
        chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
          currentVisibleRangeRef.current = range
          // Also store time range for more accurate restoration
          if (chart && chart.timeScale) {
            const timeRange = chart.timeScale().getVisibleRange()
            if (timeRange) {
              currentVisibleRangeRef.current = { ...range, timeRange }
            }
          }
        })

        // Add main price series based on chart type
        let mainSeries: any = null
        
        try {
          if (chartType === 'candlestick') {
            const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
              upColor: '#26a69a',
              downColor: '#ef5350',
              borderVisible: false,
              wickUpColor: '#26a69a',
              wickDownColor: '#ef5350',
            })
            mainSeries = candleSeries

            // Transform and set candlestick data
            const candleData = data.map((d: any) => ({
              time: d.time,
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
            }))
            candleSeries.setData(candleData)
            seriesRef.current = { main: candleSeries }

            // Add moving averages with progressive thickness and color intensity
            if (showMA) {
              const ma20Series = chart.addSeries(LightweightCharts.LineSeries, {
                color: '#60A5FA',  // Lightest blue (blue-400)
                lineWidth: 1,
                title: 'MA20',
                crosshairMarkerVisible: false,
                lastValueVisible: false,
                priceLineVisible: false,
              })

              const ma50Series = chart.addSeries(LightweightCharts.LineSeries, {
                color: '#3B82F6',  // Light blue (blue-500)
                lineWidth: 2,
                title: 'MA50',
                crosshairMarkerVisible: false,
                lastValueVisible: false,
                priceLineVisible: false,
              })

              const ma150Series = chart.addSeries(LightweightCharts.LineSeries, {
                color: '#2563EB',  // Medium blue (blue-600)
                lineWidth: 3,
                title: 'MA150',
                crosshairMarkerVisible: false,
                lastValueVisible: false,
                priceLineVisible: false,
              })

              const ma200Series = chart.addSeries(LightweightCharts.LineSeries, {
                color: '#1D4ED8',  // Darkest blue (blue-700)
                lineWidth: 4,
                title: 'MA200',
                crosshairMarkerVisible: false,
                lastValueVisible: false,
                priceLineVisible: false,
              })

              // Calculate and set moving averages
              const ma20Data = calculateMA(data, 20)
              const ma50Data = calculateMA(data, 50)
              const ma150Data = calculateMA(data, 150)
              const ma200Data = calculateMA(data, 200)
              
              ma20Series.setData(ma20Data)
              ma50Series.setData(ma50Data)
              ma150Series.setData(ma150Data)
              ma200Series.setData(ma200Data)
              
              // Store MA series references
              seriesRef.current.ma20 = ma20Series
              seriesRef.current.ma50 = ma50Series
              seriesRef.current.ma150 = ma150Series
              seriesRef.current.ma200 = ma200Series
            }

          } else if (chartType === 'line') {
            const lineSeries = chart.addSeries(LightweightCharts.LineSeries, {
              color: '#2962FF',
              lineWidth: 2,
              crosshairMarkerVisible: true,
              lastValueVisible: true,
              priceLineVisible: true,
            })
            mainSeries = lineSeries

            const lineData = data.map((d: any) => ({
              time: d.time,
              value: d.close,
            }))
            lineSeries.setData(lineData)
            seriesRef.current = { main: lineSeries }

          } else if (chartType === 'area') {
            const areaSeries = chart.addSeries(LightweightCharts.AreaSeries, {
              topColor: 'rgba(41, 98, 255, 0.5)',
              bottomColor: 'rgba(41, 98, 255, 0.1)',
              lineColor: '#2962FF',
              lineWidth: 2,
            })
            mainSeries = areaSeries

            const areaData = data.map((d: any) => ({
              time: d.time,
              value: d.close,
            }))
            areaSeries.setData(areaData)
            seriesRef.current = { main: areaSeries }
          }

          // Add volume if enabled
          if (showVolume && data[0]?.volume) {
            const volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
              color: '#26a69a',
              priceFormat: {
                type: 'volume',
              },
              priceScaleId: '',
            })

            volumeSeries.priceScale().applyOptions({
              scaleMargins: {
                top: 0.8,
                bottom: 0,
              },
            })

            const volumeData = data.map((d: any) => ({
              time: d.time,
              value: d.volume,
              color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
            }))
            volumeSeries.setData(volumeData)
            
            // Store volume series reference
            if (seriesRef.current) {
              seriesRef.current.volume = volumeSeries
            }
          }

          // Add support and resistance levels
          if (showSupportResistance && chartType === 'candlestick' && mainSeries) {
            const supportResistanceLevels = calculateSupportResistance(data)
            
            // Filter to only show the strongest levels (strength 3)
            const strongestLevels = supportResistanceLevels.filter(level => level.strength === 3)
            
            // Add price lines for each strong level
            strongestLevels.forEach((level) => {
              const lineColor = level.type === 'resistance' 
                ? 'rgba(239, 83, 80, 0.8)'  // Red for resistance
                : 'rgba(38, 166, 154, 0.8)' // Green for support
              
              mainSeries.createPriceLine({
                price: level.price,
                color: lineColor,
                lineWidth: 2,
                lineStyle: 0, // Solid line for strongest levels
                axisLabelVisible: true,
                title: level.type === 'resistance' ? 'R' : 'S',
              })
            })
          }

          // Set initial visible range to last 6 months (only on initial load)
          if (chart && chart.timeScale) {
            // First fit all content to establish the full range
            chart.timeScale().fitContent()
            
            // Apply initial 6-month zoom
            if (data.length > 0) {
              const latestDate = new Date(data[data.length - 1].time)
              const sixMonthsAgo = new Date(latestDate)
              sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
              
              let startIndex = 0
              for (let i = data.length - 1; i >= 0; i--) {
                const dataDate = new Date(data[i].time)
                if (dataDate <= sixMonthsAgo) {
                  startIndex = i
                  break
                }
              }
              
              const padding = 5
              setTimeout(() => {
                if (chart && chart.timeScale) {
                  chart.timeScale().setVisibleLogicalRange({
                    from: Math.max(0, startIndex - padding),
                    to: Math.min(data.length - 1 + padding, data.length + padding)
                  })
                }
              }, 0)
            }
            
            // Subscribe to visible range changes
            if (onVisibleRangeChanged) {
              chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
                if (logicalRange) {
                  const visibleData = data.slice(
                    Math.max(0, Math.floor(logicalRange.from)),
                    Math.min(data.length, Math.ceil(logicalRange.to))
                  )
                  
                  if (visibleData.length > 0) {
                    const fromDate = new Date(visibleData[0].time)
                    const toDate = new Date(visibleData[visibleData.length - 1].time)
                    
                    // Check if we're near the beginning of our data
                    if (Math.floor(logicalRange.from) <= 10 && data.length > 0) {
                      // User is scrolling to earlier dates, need to load more historical data
                      const earliestDate = new Date(data[0].time)
                      onVisibleRangeChanged(earliestDate, toDate)
                    }
                  }
                }
              })
            }
          }

          // Handle resize
          const handleResize = () => {
            if (chartContainerRef.current && chartInstanceRef.current) {
              chartInstanceRef.current.applyOptions({
                width: chartContainerRef.current.clientWidth,
              })
            }
          }
          resizeHandlerRef.current = handleResize
          window.addEventListener('resize', handleResize)

          // Successfully initialized
          isInitializingRef.current = false

        } catch (error: any) {
          console.error('Error initializing chart:', error)
          console.error('Error message:', error?.message)
          console.error('Error stack:', error?.stack)
          console.error('Chart container:', chartContainerRef.current)
          isInitializingRef.current = false
        }
      } catch (error: any) {
        console.error('Error creating chart:', error)
        console.error('Error message:', error?.message)
        console.error('Error stack:', error?.stack)
        isInitializingRef.current = false
      }
    }

    // Initialize chart
    initChart()

    // Mark as initialized after first run
    hasInitializedRef.current = true
    
    // Cleanup on unmount or dependency change
    return cleanupChart
  }, [chartType, showVolume, showSupportResistance, showMA, height, symbol, onVisibleRangeChanged])  // Remove 'data' and 'initialZoom' from dependencies

  // Handle data updates without changing the visible range
  useEffect(() => {
    if (!chartInstanceRef.current || !data || data.length === 0) return
    
    // Skip if chart is still initializing or hasn't been created yet
    if (isInitializingRef.current || !hasInitializedRef.current) return
    
    // Skip if no series are created yet
    if (!seriesRef.current.main) return
    
    // This is a data update after initial load
    // Save the exact visible time range before updating
    const timeScale = chartInstanceRef.current.timeScale()
    const visibleRange = timeScale.getVisibleRange()
    
    if (!visibleRange) return
    
    // Update data based on chart type
    if (chartType === 'candlestick' && seriesRef.current.main) {
      const candleData = data.map((d: any) => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))
      seriesRef.current.main.setData(candleData)
      
      // Update moving averages if they exist
      if (seriesRef.current.ma20) {
        const ma20Data = calculateMA(data, 20)
        seriesRef.current.ma20.setData(ma20Data)
      }
      if (seriesRef.current.ma50) {
        const ma50Data = calculateMA(data, 50)
        seriesRef.current.ma50.setData(ma50Data)
      }
      if (seriesRef.current.ma150) {
        const ma150Data = calculateMA(data, 150)
        seriesRef.current.ma150.setData(ma150Data)
      }
      if (seriesRef.current.ma200) {
        const ma200Data = calculateMA(data, 200)
        seriesRef.current.ma200.setData(ma200Data)
      }
    } else if (chartType === 'line' && seriesRef.current.main) {
      const lineData = data.map((d: any) => ({
        time: d.time,
        value: d.close,
      }))
      seriesRef.current.main.setData(lineData)
    } else if (chartType === 'area' && seriesRef.current.main) {
      const areaData = data.map((d: any) => ({
        time: d.time,
        value: d.close,
      }))
      seriesRef.current.main.setData(areaData)
    }
    
    // Update volume if enabled
    if (showVolume && seriesRef.current.volume) {
      const volumeData = data.map((d: any) => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
      }))
      seriesRef.current.volume.setData(volumeData)
    }
    
    // Force restore the exact time range after data update
    // This prevents any jumping or view changes
    requestAnimationFrame(() => {
      if (chartInstanceRef.current && chartInstanceRef.current.timeScale && visibleRange) {
        chartInstanceRef.current.timeScale().setVisibleRange(visibleRange)
      }
    })
  }, [data])  // Only depend on data changes

  return (
    <div className="relative w-full">
      <div
        ref={chartContainerRef}
        id={`tradingview-chart-${symbol}`}
        className="w-full bg-background rounded-lg border"
        style={{ minHeight: height }}
      />
      {/* Chart Legend */}
      <div className="absolute top-4 left-4 flex flex-wrap gap-4 text-xs">
        {showMA && (
          <>
            <div className="flex items-center gap-1">
              <div className="w-3 h-[1px] bg-[#60A5FA]" />
              <span className="text-muted-foreground">MA20</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-[2px] bg-[#3B82F6]" />
              <span className="text-muted-foreground">MA50</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-[3px] bg-[#2563EB]" />
              <span className="text-muted-foreground">MA150</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-[4px] bg-[#1D4ED8]" />
              <span className="text-muted-foreground">MA200</span>
            </div>
          </>
        )}
        {showVolume && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-[#26a69a]/50" />
            <span className="text-muted-foreground">Volume</span>
          </div>
        )}
        {showSupportResistance && (
          <>
            <div className="flex items-center gap-1">
              <div className="w-3 h-[2px] bg-[#ef5350]/80" />
              <span className="text-muted-foreground">Strong Resistance</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-[2px] bg-[#26a69a]/80" />
              <span className="text-muted-foreground">Strong Support</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Helper function to calculate moving average
function calculateMA(data: any[], period: number): any[] {
  const result: any[] = []
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close
    }
    result.push({
      time: data[i].time,
      value: sum / period,
    })
  }
  return result
}