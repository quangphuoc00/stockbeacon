import { NextRequest, NextResponse } from 'next/server'
import { StockDataService } from '@/lib/services/stock-data.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const symbolUpper = symbol.toUpperCase()
    
    // Get comprehensive stock data
    const data = await StockDataService.getStockData(symbolUpper)
    
    if (!data.quote) {
      return NextResponse.json(
        { error: `Stock ${symbolUpper} not found` },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: {
        quote: data.quote,
        financials: data.financials,
        score: data.score,
        historical: data.historical || [],
        fromCache: data.fromCache,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error fetching stock data:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch stock data',
        message: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
