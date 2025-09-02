'use client'

import { useEffect, useRef } from 'react'

interface TradingViewChartProps {
  symbol: string
  data: any[]
  chartType: 'candlestick' | 'line' | 'area'
  showVolume?: boolean
  height?: number
}

export function TradingViewChart({
  symbol,
  data,
  chartType = 'candlestick',
  showVolume = true,
  height = 500,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<any>(null)
  const resizeHandlerRef = useRef<any>(null)
  const isInitializingRef = useRef<boolean>(false)

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

        // Add main price series based on chart type
        try {
          if (chartType === 'candlestick') {
            const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
              upColor: '#26a69a',
              downColor: '#ef5350',
              borderVisible: false,
              wickUpColor: '#26a69a',
              wickDownColor: '#ef5350',
            })

            // Transform and set candlestick data
            const candleData = data.map((d: any) => ({
              time: d.time,
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
            }))
            candleSeries.setData(candleData)

            // Add moving averages
            const ma20Series = chart.addSeries(LightweightCharts.LineSeries, {
              color: '#2962FF',
              lineWidth: 1,
              title: 'MA20',
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
            })

            const ma50Series = chart.addSeries(LightweightCharts.LineSeries, {
              color: '#FF6D00',
              lineWidth: 1,
              title: 'MA50',
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
            })

            // Calculate and set moving averages
            const ma20Data = calculateMA(data, 20)
            const ma50Data = calculateMA(data, 50)
            ma20Series.setData(ma20Data)
            ma50Series.setData(ma50Data)

          } else if (chartType === 'line') {
            const lineSeries = chart.addSeries(LightweightCharts.LineSeries, {
              color: '#2962FF',
              lineWidth: 2,
              crosshairMarkerVisible: true,
              lastValueVisible: true,
              priceLineVisible: true,
            })

            const lineData = data.map((d: any) => ({
              time: d.time,
              value: d.close,
            }))
            lineSeries.setData(lineData)

          } else if (chartType === 'area') {
            const areaSeries = chart.addSeries(LightweightCharts.AreaSeries, {
              topColor: 'rgba(41, 98, 255, 0.5)',
              bottomColor: 'rgba(41, 98, 255, 0.1)',
              lineColor: '#2962FF',
              lineWidth: 2,
            })

            const areaData = data.map((d: any) => ({
              time: d.time,
              value: d.close,
            }))
            areaSeries.setData(areaData)
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
          }

          // Fit content
          if (chart && chart.timeScale) {
            chart.timeScale().fitContent()
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

    // Cleanup on unmount or dependency change
    return cleanupChart
  }, [data, chartType, showVolume, height, symbol])

  return (
    <div className="relative w-full">
      <div
        ref={chartContainerRef}
        id={`tradingview-chart-${symbol}`}
        className="w-full bg-background rounded-lg border"
        style={{ minHeight: height }}
      />
      {/* Chart Legend */}
      <div className="absolute top-4 left-4 flex gap-4 text-xs">
        {chartType === 'candlestick' && (
          <>
            <div className="flex items-center gap-1">
              <div className="w-3 h-[1px] bg-[#2962FF]" />
              <span className="text-muted-foreground">MA20</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-[1px] bg-[#FF6D00]" />
              <span className="text-muted-foreground">MA50</span>
            </div>
          </>
        )}
        {showVolume && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-[#26a69a]/50" />
            <span className="text-muted-foreground">Volume</span>
          </div>
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