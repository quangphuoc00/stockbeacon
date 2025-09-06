import { NextRequest, NextResponse } from 'next/server'
import { AlpacaDataService } from '@/lib/services/alpaca-data.service'
import { StockBeaconScoreService } from '@/lib/services/stockbeacon-score.service'
import { ScorePersistenceService } from '@/lib/services/score-persistence.service'

// Test endpoint to calculate score using Alpaca data
export async function POST(request: NextRequest) {
  try {
    const { symbol = 'AAPL' } = await request.json().catch(() => ({}))
    
    console.log(`\n🦙 ALPACA TEST: Calculating score for ${symbol}...`)
    
    // Check if Alpaca is configured
    if (!AlpacaDataService.isConfigured()) {
      throw new Error('Alpaca API not configured')
    }
    
    // Step 1: Fetch data from Alpaca
    console.log('1. Fetching Alpaca quote...')
    const quote = await AlpacaDataService.getQuote(symbol)
    if (!quote) throw new Error('Failed to fetch quote from Alpaca')
    console.log(`   ✅ Price: $${quote.price}`)
    
    console.log('2. Getting financials (mock data)...')
    const financials = await AlpacaDataService.getFinancials(symbol)
    if (!financials) throw new Error('Failed to get financials')
    console.log(`   ✅ Got financials (using defaults)`)
    
    console.log('3. Fetching historical data from Alpaca...')
    const historical = await AlpacaDataService.getHistoricalData(symbol, '3mo')
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
      dataSource: 'Alpaca Markets',
      symbol,
      score: score.score,
      businessQualityScore: score.businessQualityScore,
      timingScore: score.timingScore,
      recommendation: score.recommendation,
      price: quote.price,
      message: `Successfully calculated score for ${symbol} using Alpaca data`
    })
    
  } catch (error) {
    console.error('❌ Alpaca test error:', error)
    
    return NextResponse.json(
      {
        error: 'Alpaca test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    )
  }
}
