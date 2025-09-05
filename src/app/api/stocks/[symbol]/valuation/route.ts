import { NextRequest, NextResponse } from 'next/server'
import { ValuationService } from '@/lib/services/valuation.service'
import { StockDataService } from '@/lib/services/stock-data.service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    
    const body = await request.json()
    const { stockData, manualInputs = {} } = body

    // If stockData is not provided, fetch it
    let data = stockData
    if (!data) {
      data = await StockDataService.getStockData(symbol)
      if (!data || !data.quote) {
        return NextResponse.json(
          { error: 'Failed to fetch stock data' },
          { status: 404 }
        )
      }
    }

    // Calculate valuation
    const valuationData = await ValuationService.calculateValuation(
      symbol,
      data.quote,
      data.financials,
      {}, // customGrowthRates
      manualInputs
    )

    return NextResponse.json({
      valuation: valuationData,
      success: true
    })
  } catch (error) {
    console.error('Valuation calculation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to calculate valuation'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
