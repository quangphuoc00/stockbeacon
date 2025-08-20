import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const symbol = url.searchParams.get('symbol')
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      )
    }
    
    const symbolUpper = symbol.toUpperCase()
    
    // Clear all cache entries for this symbol
    const keys = [
      `stock:quote:${symbolUpper}`,
      `stock:financials:${symbolUpper}`,
      `stock:score:${symbolUpper}`,
      `stock:historical:${symbolUpper}:1d`,
      `stock:historical:${symbolUpper}:5d`,
      `stock:historical:${symbolUpper}:1mo`,
      `stock:historical:${symbolUpper}:3mo`,
      `stock:historical:${symbolUpper}:6mo`,
      `stock:historical:${symbolUpper}:1y`,
      `stock:historical:${symbolUpper}:2y`,
      `stock:historical:${symbolUpper}:5y`,
    ]
    
    const deletedCount = await Promise.all(
      keys.map(key => redis.del(key))
    )
    
    const totalDeleted = deletedCount.reduce((sum, count) => sum + count, 0)
    
    return NextResponse.json({
      success: true,
      symbol: symbolUpper,
      keysDeleted: totalDeleted,
      message: `Cache cleared for ${symbolUpper}`
    })
  } catch (error: any) {
    console.error('Error clearing cache:', error)
    return NextResponse.json(
      { error: 'Failed to clear cache', message: error.message },
      { status: 500 }
    )
  }
}
