import { NextRequest, NextResponse } from 'next/server'
import { AlpacaDataService } from '@/lib/services/alpaca-data.service'

// Test Alpaca API connection and data fetching
export async function GET(request: NextRequest) {
  try {
    // Check if configured
    const isConfigured = AlpacaDataService.isConfigured()
    
    if (!isConfigured) {
      return NextResponse.json({
        error: 'Alpaca not configured',
        message: 'Please set ALPACA_API_KEY and ALPACA_API_SECRET in your .env.local file',
        instructions: {
          1: 'Sign up for free at https://alpaca.markets',
          2: 'Go to your dashboard and generate API keys',
          3: 'Add to .env.local:',
          env: [
            'ALPACA_API_KEY=your-api-key',
            'ALPACA_API_SECRET=your-api-secret'
          ]
        }
      }, { status: 400 })
    }
    
    // Test single quote
    console.log('Testing Alpaca quote for AAPL...')
    const quote = await AlpacaDataService.getQuote('AAPL')
    
    if (!quote) {
      throw new Error('Failed to fetch quote from Alpaca')
    }
    
    // Test bulk quotes
    console.log('Testing Alpaca bulk quotes...')
    const bulkQuotes = await AlpacaDataService.getBulkQuotes(['AAPL', 'MSFT', 'GOOGL'])
    
    // Test historical data
    console.log('Testing Alpaca historical data...')
    const historical = await AlpacaDataService.getHistoricalData('AAPL', '1mo')
    
    return NextResponse.json({
      success: true,
      configured: true,
      test: 'Alpaca API',
      results: {
        singleQuote: {
          symbol: quote.symbol,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent
        },
        bulkQuotes: {
          count: bulkQuotes.size,
          symbols: Array.from(bulkQuotes.keys())
        },
        historical: {
          dataPoints: historical.length,
          firstDate: historical[0]?.date,
          lastDate: historical[historical.length - 1]?.date
        }
      },
      message: 'Alpaca API is working correctly!'
    })
    
  } catch (error: any) {
    console.error('Alpaca test error:', error)
    
    return NextResponse.json(
      {
        error: 'Alpaca test failed',
        message: error.message || 'Unknown error',
        details: error.response?.data || error
      },
      { status: 500 }
    )
  }
}
