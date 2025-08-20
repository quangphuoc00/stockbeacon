import { NextRequest, NextResponse } from 'next/server'
import { StockDataService } from '@/lib/services/stock-data.service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Parse query parameters
    const criteria = {
      minScore: searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!) : undefined,
      maxScore: searchParams.get('maxScore') ? parseInt(searchParams.get('maxScore')!) : undefined,
      sector: searchParams.get('sector') || undefined,
      minMarketCap: searchParams.get('minMarketCap') ? parseFloat(searchParams.get('minMarketCap')!) : undefined,
      maxPE: searchParams.get('maxPE') ? parseFloat(searchParams.get('maxPE')!) : undefined,
      riskLevel: searchParams.get('riskLevel') as 'conservative' | 'balanced' | 'growth' | undefined,
    }
    
    // Get screener results
    const stocks = await StockDataService.getScreenerStocks(criteria)
    
    // Limit to top 10 for now
    const limitedStocks = stocks.slice(0, 10)
    
    return NextResponse.json({
      success: true,
      data: limitedStocks,
      count: limitedStocks.length,
      criteria,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error in stock screener:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to screen stocks',
        message: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
