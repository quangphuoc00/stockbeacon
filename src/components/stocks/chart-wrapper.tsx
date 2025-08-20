'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, BarChart3 } from 'lucide-react'
import { StockHistorical } from '@/types/stock'

// Dynamically import the chart component with no SSR
const DynamicChart = dynamic(
  () => import('./simple-chart').then(mod => ({ default: mod.SimpleChart })),
  { 
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
          <CardDescription>Loading chart...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center bg-muted/10 rounded">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Preparing chart...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    ),
  }
)

interface ChartWrapperProps {
  symbol: string
  historicalData: StockHistorical[]
  currentPrice?: number
}

export function ChartWrapper({ symbol, historicalData, currentPrice }: ChartWrapperProps) {
  // Validate data before rendering
  if (!historicalData || historicalData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center bg-muted/10 rounded">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No historical data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <DynamicChart 
      symbol={symbol}
      historicalData={historicalData}
      currentPrice={currentPrice}
    />
  )
}
