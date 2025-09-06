import { NextRequest, NextResponse } from 'next/server'
import { RedisCacheService } from '@/lib/services/redis-cache.service'
import { getRedisInstance } from '@/lib/utils/redis'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const symbolUpper = symbol.toUpperCase()
    
    console.log(`[Clear Score Cache] Clearing cached score for ${symbolUpper}`)
    
    // Clear the cached score
    const redis = getRedisInstance()
    const scoreKey = `score:${symbolUpper}`
    await redis.del(scoreKey)
    
    console.log(`[Clear Score Cache] Successfully cleared score cache for ${symbolUpper}`)
    
    return NextResponse.json({
      success: true,
      message: `Score cache cleared for ${symbolUpper}`
    })
  } catch (error: any) {
    console.error('Error clearing score cache:', error)
    return NextResponse.json(
      { error: 'Failed to clear score cache', message: error.message },
      { status: 500 }
    )
  }
}
