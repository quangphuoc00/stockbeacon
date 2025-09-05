import { NextRequest, NextResponse } from 'next/server'
import { YahooFinanceService } from '@/lib/services/yahoo-finance.service'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true'

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      )
    }

    // Check cache first (30 days TTL for company profiles - this data rarely changes)
    const cacheKey = `company-profile:${symbol}`
    const CACHE_TTL = 30 * 24 * 60 * 60 // 30 days in seconds
    
    if (!forceRefresh) {
      try {
        const cachedProfile = await redis.get(cacheKey)
        if (cachedProfile) {
          return NextResponse.json(cachedProfile)
        }
      } catch (error) {
        console.error('Cache read error:', error)
      }
    }

    // Fetch company profile from Yahoo Finance
    const profile = await YahooFinanceService.getCompanyProfile(symbol.toUpperCase())

    if (!profile) {
      return NextResponse.json(
        { error: 'Company profile not found' },
        { status: 404 }
      )
    }

    // Cache the result
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(profile)) // 30 days TTL
    } catch (error) {
      console.error('Cache write error:', error)
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Company profile error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company profile' },
      { status: 500 }
    )
  }
}
