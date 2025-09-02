import { NextRequest, NextResponse } from 'next/server'
import { YahooFinanceService } from '@/lib/services/yahoo-finance.service'

export async function GET(
  req: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') as '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y' || '3mo'
    const { symbol } = params

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      )
    }

    console.log(`[API] Fetching ${period} historical data for ${symbol}`)
    
    // Fetch historical data using the service
    const historicalData = await YahooFinanceService.getHistoricalData(symbol.toUpperCase(), period)
    
    if (!historicalData || historicalData.length === 0) {
      console.log(`[API] No historical data found for ${symbol}`)
      return NextResponse.json(
        { error: 'No historical data available' },
        { status: 404 }
      )
    }

    console.log(`[API] Successfully fetched ${historicalData.length} data points for ${symbol}`)
    
    // Transform data to ensure proper format for the chart
    const transformedData = historicalData.map(item => ({
      date: item.date instanceof Date ? item.date.toISOString() : item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
      adjustedClose: item.adjustedClose
    }))

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      period,
      data: transformedData,
      count: transformedData.length
    })
  } catch (error) {
    console.error('[API] Error fetching historical data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch historical data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
