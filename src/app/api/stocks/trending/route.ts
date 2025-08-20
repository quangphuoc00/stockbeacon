import { NextResponse } from 'next/server'
import { StockDataService } from '@/lib/services/stock-data.service'

export async function GET() {
  try {
    // Get trending stocks (already filtered for non-crypto)
    const trending = await StockDataService.getTrendingStocks()
    
    // Get quotes for trending stocks
    const quotes = await StockDataService.getMultipleQuotes(trending.slice(0, 10))
    
    // Convert Map to array and ensure proper structure
    const stocks = Array.from(quotes.entries()).map(([symbol, quote]) => ({
      symbol,
      name: quote.name || symbol,
      price: quote.price || 0,
      change: quote.change || 0,
      changePercent: quote.changePercent || 0,
      volume: quote.volume || 0,
      marketCap: quote.marketCap || 0,
      dayHigh: quote.dayHigh || 0,
      dayLow: quote.dayLow || 0,
      ...quote,
    }))
    
    return NextResponse.json({
      success: true,
      data: stocks,
      count: stocks.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error fetching trending stocks:', error)
    
    // Return empty data on error rather than failing completely
    return NextResponse.json({
      success: false,
      data: [],
      count: 0,
      error: 'Failed to fetch trending stocks',
      message: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    })
  }
}
