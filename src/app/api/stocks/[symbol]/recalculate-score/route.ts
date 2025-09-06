import { NextRequest, NextResponse } from 'next/server'
import { StockDataService } from '@/lib/services/stock-data.service'
import { StockBeaconScoreService } from '@/lib/services/stockbeacon-score.service'
import { RedisCacheService } from '@/lib/services/redis-cache.service'
import { getRedisInstance } from '@/lib/utils/redis'
import { MoatAnalysis } from '@/lib/services/ai-moat.service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const symbolUpper = symbol.toUpperCase()
    
    console.log(`[Recalculate Score] Starting for ${symbolUpper}`)
    
    // Get current stock data
    const stockData = await StockDataService.getStockData(symbolUpper)
    
    if (!stockData.quote || !stockData.financials) {
      return NextResponse.json(
        { error: 'Insufficient data to calculate score' },
        { status: 400 }
      )
    }
    
    // Check for cached moat analysis
    let moatAnalysis: MoatAnalysis | undefined
    try {
      const redis = getRedisInstance()
      const moatCacheKey = `moat_analysis:${symbolUpper}`
      const cachedMoat = await redis.get(moatCacheKey)
      if (cachedMoat) {
        moatAnalysis = cachedMoat as MoatAnalysis
        console.log(`[Recalculate Score] Found moat analysis: ${moatAnalysis.overallScore}/100`)
      }
    } catch (error) {
      console.error('Error fetching cached moat analysis:', error)
    }
    
    // Recalculate score with moat analysis
    const newScore = StockBeaconScoreService.calculateScore(
      stockData.quote,
      stockData.financials,
      stockData.historical || [],
      moatAnalysis
    )
    
    console.log(`[Recalculate Score] New score for ${symbolUpper}: ${newScore.score} (moat: ${newScore.moatScore}/20)`)
    
    // Update cache
    await RedisCacheService.setScore(symbolUpper, newScore)
    
    return NextResponse.json({
      success: true,
      score: newScore
    })
  } catch (error: any) {
    console.error('Error recalculating score:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate score', message: error.message },
      { status: 500 }
    )
  }
}
