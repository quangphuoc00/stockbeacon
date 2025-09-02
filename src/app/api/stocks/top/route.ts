import { NextRequest, NextResponse } from 'next/server'
import { StockDataService } from '@/lib/services/stock-data.service'
import { RedisCacheService } from '@/lib/services/redis-cache.service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Get top scored stock symbols from cache
    const topSymbols = await RedisCacheService.getTopScoredStocks(limit)
    
    // If we have cached top stocks, fetch their data
    let topStocks = []
    if (topSymbols && topSymbols.length > 0) {
      const quotes = await StockDataService.getMultipleQuotes(topSymbols)
      topStocks = Array.from(quotes.values())
    } else {
      // Fallback to some popular stocks (excluding crypto)
      const fallbackSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM', 'V', 'JNJ']
      const quotes = await StockDataService.getMultipleQuotes(fallbackSymbols.slice(0, limit))
      topStocks = Array.from(quotes.values())
    }
    
    // Ensure proper data structure
    const formattedStocks = topStocks.map(stock => ({
      ...stock,
      name: stock.name || stock.symbol,
      price: stock.price || 0,
      change: stock.change || 0,
      changePercent: stock.changePercent || 0,
      volume: stock.volume || 0,
      marketCap: stock.marketCap || 0
    }))
    
    return NextResponse.json({
      success: true,
      data: formattedStocks,
      count: formattedStocks.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error fetching top stocks:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch top stocks',
        message: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}