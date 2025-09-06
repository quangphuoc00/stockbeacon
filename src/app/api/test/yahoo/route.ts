import { NextRequest, NextResponse } from 'next/server'
import yahooFinance from 'yahoo-finance2'

// Test Yahoo Finance directly
export async function GET(request: NextRequest) {
  try {
    console.log('Testing Yahoo Finance...')
    
    // Test 1: Simple quote
    console.log('Fetching AAPL quote...')
    const quote = await yahooFinance.quote('AAPL')
    console.log('Quote result:', quote)
    
    // Test 2: Check if we get basic data
    const basicData = {
      symbol: quote.symbol,
      price: quote.regularMarketPrice,
      name: quote.longName || quote.shortName,
      marketCap: quote.marketCap,
      hasData: !!quote.regularMarketPrice
    }
    
    return NextResponse.json({
      success: true,
      test: 'Yahoo Finance API',
      result: basicData,
      fullQuote: quote
    })
    
  } catch (error: any) {
    console.error('Yahoo Finance test error:', error)
    
    return NextResponse.json(
      {
        error: 'Yahoo Finance test failed',
        message: error.message || 'Unknown error',
        code: error.code,
        details: error.result || error
      },
      { status: 500 }
    )
  }
}
