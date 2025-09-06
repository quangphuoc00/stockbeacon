import { NextRequest, NextResponse } from 'next/server'
import { StockDataService } from '@/lib/services/stock-data.service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    
    if (!query || query.length < 1) {
      return NextResponse.json({
        success: true,
        data: [],
        query: query || '',
      })
    }
    
    // Search for stocks
    const results = await StockDataService.searchStocks(query)
    
    // Limit to top 10 results for suggestions
    const suggestions = results.slice(0, 10).map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      exchange: stock.exchange,
      type: stock.type,
    }))
    
    return NextResponse.json({
      success: true,
      data: suggestions,
      query,
      count: suggestions.length,
    })
  } catch (error: any) {
    console.error('Error searching stocks:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to search stocks',
        message: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
