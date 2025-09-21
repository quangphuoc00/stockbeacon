import { NextRequest, NextResponse } from 'next/server'
import { NewsService } from '@/lib/services/news.service'
import { AlpacaNewsService } from '@/lib/services/alpaca-news.service'
import { NewsAnalysisService } from '@/lib/services/news-analysis.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10')
    const analyze = request.nextUrl.searchParams.get('analyze') === 'true'
    const todayOnly = request.nextUrl.searchParams.get('todayOnly') === 'true'
    const forDisplay = request.nextUrl.searchParams.get('forDisplay') === 'true'
    const bypassCache = request.nextUrl.searchParams.get('bypassCache') === 'true'

    // Fetch news - try Alpaca first, fallback to Yahoo Finance
    let news
    try {
      if (AlpacaNewsService.isConfigured()) {
        console.log(`Using Alpaca for news: ${symbol}`)
        // Fetch more articles initially if we need to filter by date or ensure minimum
        const fetchLimit = (todayOnly || forDisplay) ? 50 : limit
        news = await AlpacaNewsService.getStockNews(symbol, fetchLimit)
      } else {
        console.log(`Alpaca not configured, falling back to Yahoo Finance for news: ${symbol}`)
        const fetchLimit = (todayOnly || forDisplay) ? 50 : limit
        news = await NewsService.getStockNews(symbol, fetchLimit)
      }
    } catch (alpacaError) {
      console.error('Alpaca news fetch failed, falling back to Yahoo Finance:', alpacaError)
      const fetchLimit = (todayOnly || forDisplay) ? 50 : limit
      news = await NewsService.getStockNews(symbol, fetchLimit)
    }
    
    // If forDisplay is true, replicate NewsFeed logic
    if (forDisplay && news && news.length > 0) {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      // First try to get today's news
      let todayNews = news.filter((item: any) => 
        new Date(item.providerPublishTime) >= todayStart
      )
      
      // If no news today, get the latest day that has news
      if (todayNews.length === 0) {
        const latestDate = new Date(news[0].providerPublishTime)
        const latestDayStart = new Date(latestDate.getFullYear(), latestDate.getMonth(), latestDate.getDate())
        const latestDayEnd = new Date(latestDayStart)
        latestDayEnd.setDate(latestDayEnd.getDate() + 1)
        
        todayNews = news.filter((item: any) => {
          const itemDate = new Date(item.providerPublishTime)
          return itemDate >= latestDayStart && itemDate < latestDayEnd
        })
      }
      
      // If we have less than 10 articles, include more recent articles
      if (todayNews.length < 10) {
        const allNews = [...todayNews]
        const existingUrls = new Set(todayNews.map((n: any) => n.link))
        
        for (const item of news) {
          if (!existingUrls.has(item.link)) {
            allNews.push(item)
            if (allNews.length >= 10) break
          }
        }
        
        news = allNews
      } else {
        news = todayNews
      }
    } else if (todayOnly && news && news.length > 0) {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      // First try to get today's news
      let filteredNews = news.filter((item: any) => 
        new Date(item.providerPublishTime) >= todayStart
      )
      
      // If no news today, get the latest day that has news
      if (filteredNews.length === 0) {
        // Find the latest news date
        const latestDate = new Date(news[0].providerPublishTime)
        const latestDayStart = new Date(latestDate.getFullYear(), latestDate.getMonth(), latestDate.getDate())
        const latestDayEnd = new Date(latestDayStart)
        latestDayEnd.setDate(latestDayEnd.getDate() + 1)
        
        filteredNews = news.filter((item: any) => {
          const itemDate = new Date(item.providerPublishTime)
          return itemDate >= latestDayStart && itemDate < latestDayEnd
        })
      }
      
      news = filteredNews
    } else if (!todayOnly && !forDisplay && limit) {
      // Apply the original limit if not filtering by date
      news = news.slice(0, limit)
    }
    
    // Optionally analyze the news
    let analysis = null
    if (analyze && news && news.length > 0) {
      analysis = await NewsAnalysisService.analyzeNews(symbol, news, bypassCache)
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const body = await request.json()
    const { news } = body
    
    if (!news || !Array.isArray(news)) {
      return NextResponse.json(
        { error: 'Invalid news data', success: false },
        { status: 400 }
      )
    }
    
    // Analyze the provided news
    const analysis = await NewsAnalysisService.analyzeNews(symbol, news)
    
    return NextResponse.json({
      analysis,
      success: true
    })
  } catch (error) {
    console.error('Error analyzing news:', error)
    return NextResponse.json(
      { error: 'Failed to analyze news', success: false },
      { status: 500 }
    )
  }
}