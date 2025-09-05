import { NextRequest, NextResponse } from 'next/server'
import { NewsService } from '@/lib/services/news.service'
import { NewsAnalysisService } from '@/lib/services/news-analysis.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10')
    const analyze = request.nextUrl.searchParams.get('analyze') === 'true'

    // Fetch news
    const news = await NewsService.getStockNews(symbol, limit)
    
    // Optionally analyze the news
    let analysis = null
    if (analyze && news && news.length > 0) {
      analysis = await NewsAnalysisService.analyzeNews(symbol, news)
    }

    return NextResponse.json({
      news,
      analysis,
      success: true
    })
  } catch (error) {
    console.error('Error fetching news:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news', success: false },
      { status: 500 }
    )
  }
}