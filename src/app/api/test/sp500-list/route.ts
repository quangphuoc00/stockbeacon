import { NextRequest, NextResponse } from 'next/server'
import { SP500GitHubService } from '@/lib/services/sp500-github.service'

// Test endpoint to check if S&P 500 list loads correctly
export async function GET(request: NextRequest) {
  try {
    console.log('Testing S&P 500 list fetch...')
    
    const stocks = await SP500GitHubService.getConstituents()
    
    return NextResponse.json({
      success: true,
      count: stocks.length,
      first10: stocks.slice(0, 10).map(s => ({
        symbol: s.symbol,
        name: s.companyName,
        sector: s.sector
      })),
      message: `Successfully loaded ${stocks.length} S&P 500 stocks`
    })
    
  } catch (error) {
    console.error('Error loading S&P 500:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to load S&P 500 list',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    )
  }
}
