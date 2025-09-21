import { NextRequest, NextResponse } from 'next/server'
import { YahooFinanceService } from '@/lib/services/yahoo-finance.service'
import { getRedisInstance } from '@/lib/utils/redis'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params
  const symbol = rawSymbol.toUpperCase()
  
  try {
    // Check Redis cache first
    const redis = getRedisInstance()
    const cacheKey = `market_cap_history:${symbol}`
    
    try {
      const cachedData = await redis.get(cacheKey)
      if (cachedData && typeof cachedData === 'string') {
        console.log(`[API] Returning cached market cap history for ${symbol}`)
        const response = NextResponse.json(JSON.parse(cachedData))
        response.headers.set('Cache-Control', 'public, max-age=3600')
        response.headers.set('X-Cache-Status', 'HIT')
        return response
      }
    } catch (cacheError) {
      console.error('[API] Redis cache error:', cacheError)
    }
    
    // Get current quote to get shares outstanding
    const quote = await YahooFinanceService.getQuote(symbol)
    if (!quote) {
      return NextResponse.json(
        { 
          error: 'Symbol not found',
          message: `Unable to find data for symbol ${symbol}`,
          symbol: symbol
        },
        { status: 404 }
      )
    }
    
    // Get 10 years of monthly historical price data
    const endDate = new Date()
    const startDate = new Date()
    startDate.setFullYear(endDate.getFullYear() - 10)
    
    // Fetch monthly data (approximately 120 data points)
    const historicalData = await YahooFinanceService.getHistoricalDataByDateRange(
      symbol,
      startDate,
      endDate,
      '1d' // Daily data that we'll sample monthly
    )
    
    if (!historicalData || historicalData.length === 0) {
      return NextResponse.json(
        { 
          error: 'No historical data available',
          message: `Unable to fetch historical data for ${symbol}`,
          symbol: symbol
        },
        { status: 404 }
      )
    }
    
    // Use current shares outstanding for all historical calculations
    // This is a reasonable approximation for most companies
    const sharesOutstanding = quote.sharesOutstanding || 0
    
    // Sample monthly data points
    const monthlyData = []
    let lastMonth = -1
    let lastYear = -1
    
    for (const point of historicalData) {
      const date = new Date(point.date)
      const month = date.getMonth()
      const year = date.getFullYear()
      
      // Take the first data point of each month
      if (month !== lastMonth || year !== lastYear) {
        monthlyData.push({
          date: date.toISOString().split('T')[0],
          price: point.close,
          marketCap: point.close * sharesOutstanding
        })
        lastMonth = month
        lastYear = year
      }
    }
    
    const result = {
      symbol: symbol,
      currentMarketCap: quote.marketCap,
      sharesOutstanding: sharesOutstanding,
      dataPoints: monthlyData.length,
      history: monthlyData,
      note: 'Historical market cap calculated using current shares outstanding × historical price'
    }
    
    // Cache for 1 day
    try {
      await redis.setex(cacheKey, 86400, JSON.stringify(result))
      console.log(`[API] Cached market cap history for ${symbol}`)
    } catch (cacheError) {
      console.error('[API] Failed to cache market cap history:', cacheError)
    }
    
    const response = NextResponse.json(result)
    response.headers.set('Cache-Control', 'public, max-age=3600')
    response.headers.set('X-Cache-Status', 'MISS')
    return response
  } catch (error) {
    console.error(`[API] Error fetching market cap history for ${symbol}:`, error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching market cap history',
        symbol: symbol
      },
      { status: 500 }
    )
  }
}
