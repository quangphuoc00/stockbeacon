import { NextRequest, NextResponse } from 'next/server'
import { YahooFinanceService } from '@/lib/services/yahoo-finance.service'
import { StockBeaconScoreService } from '@/lib/services/stockbeacon-score.service'
import { ScorePersistenceService } from '@/lib/services/score-persistence.service'

// Test endpoint to calculate score for a single stock
export async function POST(request: NextRequest) {
  try {
    const { symbol = 'AAPL' } = await request.json().catch(() => ({}))
    
    console.log(`\n🧪 TEST: Calculating score for ${symbol}...`)
    
    // Step 1: Fetch data
    console.log('1. Fetching quote...')
    const quote = await YahooFinanceService.getQuote(symbol)
    if (!quote) throw new Error('Failed to fetch quote')
    console.log(`   ✅ Price: $${quote.price}`)
    
    console.log('2. Fetching financials...')
    const financials = await YahooFinanceService.getFinancials(symbol)
    if (!financials) throw new Error('Failed to fetch financials')
    console.log(`   ✅ Got financials`)
    
    console.log('3. Fetching historical data...')
    const historical = await YahooFinanceService.getHistoricalData(symbol, '3mo')
    console.log(`   ✅ Got ${historical.length} data points`)
    
    // Step 2: Calculate score
    console.log('4. Calculating score...')
    const score = StockBeaconScoreService.calculateScore(
      quote,
      financials,
      historical
    )
    console.log(`   ✅ Score: ${score.score} (B:${score.businessQualityScore} T:${score.timingScore})`)
    
    // Step 3: Save to database
    console.log('5. Saving to database...')
    await ScorePersistenceService.saveScore(score)
    console.log(`   ✅ Saved successfully`)
    
    return NextResponse.json({
      success: true,
      symbol,
      score: score.score,
      businessQualityScore: score.businessQualityScore,
      timingScore: score.timingScore,
      recommendation: score.recommendation,
      message: `Successfully calculated and saved score for ${symbol}`
    })
    
  } catch (error) {
    console.error('❌ Test error:', error)
    
    return NextResponse.json(
      {
        error: 'Test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    )
  }
}
