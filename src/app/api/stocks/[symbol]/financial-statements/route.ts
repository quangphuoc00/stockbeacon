import { NextRequest, NextResponse } from 'next/server'
import { SECEdgarService } from '@/lib/services/sec-edgar.service'
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
    const cacheKey = `financial_statements:${symbol}`
    
    try {
      const cachedData = await redis.get(cacheKey)
      if (cachedData && typeof cachedData === 'string') {
        console.log(`[API] Returning cached financial statements for ${symbol}`)
        const response = NextResponse.json(JSON.parse(cachedData))
        response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200')
        response.headers.set('X-Cache-Status', 'HIT')
        return response
      }
    } catch (cacheError) {
      console.error('[API] Redis cache error:', cacheError)
      // Continue without cache
    }
    
    // Check if this is a US-listed company
    const cik = await SECEdgarService.getCIK(symbol)
    if (!cik) {
      console.log(`[API] Symbol ${symbol} is not a US-listed company`)
      return NextResponse.json(
        { 
          error: 'Not a US-listed company',
          message: 'StockBeacon currently supports US-listed companies only (NYSE, NASDAQ, etc.)',
          symbol: symbol
        },
        { status: 404 }
      )
    }
    
    // Fetch from SEC EDGAR (US companies only)
    console.log(`[API] Fetching financial statements from SEC EDGAR for ${symbol} (CIK: ${cik})`)
    const statements = await SECEdgarService.getFinancialStatements(symbol)
    
    if (!statements) {
      console.error(`[API] Failed to retrieve financial statements for ${symbol}`)
      return NextResponse.json(
        { 
          error: 'Failed to retrieve financial statements',
          message: 'Unable to fetch data from SEC EDGAR. Please try again later.',
          symbol: symbol
        },
        { status: 500 }
      )
    }
    
    // Cache the results for 1 day
    try {
      await redis.setex(cacheKey, 86400, JSON.stringify(statements))
      console.log(`[API] Cached financial statements for ${symbol}`)
    } catch (cacheError) {
      console.error('[API] Failed to cache financial statements:', cacheError)
      // Continue without caching
    }
    
    const response = NextResponse.json(statements)
    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200')
    response.headers.set('X-Cache-Status', 'MISS')
    return response
  } catch (error) {
    console.error(`[API] Error fetching financial statements for ${symbol}:`, error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching financial statements',
        symbol: symbol
      },
      { status: 500 }
    )
  }
}
