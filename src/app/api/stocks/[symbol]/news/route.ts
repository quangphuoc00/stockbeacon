import { NextRequest, NextResponse } from 'next/server'
import { NewsService } from '@/lib/services/news.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const symbolUpper = symbol.toUpperCase()
    
    console.log(`Fetching news for ${symbolUpper}...`)
    
    // Get news for the stock
    const news = await NewsService.getStockNews(symbolUpper, 15)
    
    return NextResponse.json({
      success: true,
      symbol: symbolUpper,
      count: news.length,
      news: news,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error fetching stock news:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch news',
        message: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
