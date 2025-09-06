import { NextRequest, NextResponse } from 'next/server'
import { BackgroundScoreCalculator } from '@/lib/services/background-score-calculator'
import { SP500GitHubService } from '@/lib/services/sp500-github.service'
import { ScorePersistenceService } from '@/lib/services/score-persistence.service'

// Test endpoint to calculate scores for just a few stocks
export async function POST(request: NextRequest) {
  try {
    console.log('\n🧪 TEST: Calculating scores for a few stocks...')
    
    // Get S&P 500 constituents
    const sp500Stocks = await SP500GitHubService.getConstituents()
    
    // Take first 10 stocks for testing
    const testStocks = sp500Stocks.slice(0, 10).map(s => s.symbol)
    console.log(`Test stocks: ${testStocks.join(', ')}`)
    
    // Check which ones need updates
    const staleSymbols = await ScorePersistenceService.getStaleScores(testStocks, 24)
    
    if (staleSymbols.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All test stocks already have fresh scores',
        stocks: testStocks
      })
    }
    
    console.log(`${staleSymbols.length} stocks need updates: ${staleSymbols.join(', ')}`)
    
    // Calculate in smaller batch for testing
    const calculator = BackgroundScoreCalculator as any
    await calculator.calculateScoresInBatches(staleSymbols, 2)
    
    return NextResponse.json({
      success: true,
      message: `Started calculation for ${staleSymbols.length} stocks`,
      stocks: staleSymbols,
      note: 'Check server logs for progress'
    })
    
  } catch (error) {
    console.error('Test calculation error:', error)
    
    return NextResponse.json(
      {
        error: 'Test calculation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
