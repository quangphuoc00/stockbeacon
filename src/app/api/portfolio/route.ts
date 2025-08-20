import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PortfolioService } from '@/lib/services/portfolio.service'
import { StockDataService } from '@/lib/services/stock-data.service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's portfolio
    const positions = await PortfolioService.getUserPortfolio(supabase, user.id)

    // Enrich with current market data
    const enrichedPositions = await Promise.all(
      positions.map(async (position) => {
        try {
          // Get current stock data
          const stockData = await StockDataService.getStockData(position.symbol)
          const currentPrice = stockData.quote?.price || position.current_price || position.average_price
          
          // Calculate gains
          const totalValue = position.quantity * currentPrice
          const totalCost = position.quantity * position.average_price
          const gainLoss = totalValue - totalCost
          const gainLossPercent = (gainLoss / totalCost) * 100

          return {
            ...position,
            name: stockData.quote?.name || position.stock?.company_name || position.symbol,
            currentPrice,
            currentScore: stockData.score?.score || 0,
            dayChange: stockData.quote?.change || 0,
            dayChangePercent: stockData.quote?.changePercent || 0,
            totalValue,
            gainLoss,
            gainLossPercent,
          }
        } catch (error) {
          console.error(`Error enriching portfolio position ${position.symbol}:`, error)
          return {
            ...position,
            name: position.stock?.company_name || position.symbol,
            currentPrice: position.current_price || position.average_price,
            currentScore: 0,
            dayChange: 0,
            dayChangePercent: 0,
          }
        }
      })
    )

    // Calculate portfolio stats
    const stats = await PortfolioService.getPortfolioStats(supabase, user.id)

    return NextResponse.json({
      success: true,
      data: {
        positions: enrichedPositions,
        stats,
      },
      count: enrichedPositions.length,
    })
  } catch (error: any) {
    console.error('Error fetching portfolio:', error)
    return NextResponse.json(
      { error: 'Failed to fetch portfolio', message: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { symbol, quantity, price, purchasedAt } = body

    if (!symbol || !quantity || !price) {
      return NextResponse.json(
        { error: 'Symbol, quantity, and price are required' },
        { status: 400 }
      )
    }

    // Add position
    const position = await PortfolioService.addPosition(
      supabase,
      user.id,
      symbol.toUpperCase(),
      parseFloat(quantity),
      parseFloat(price),
      purchasedAt ? new Date(purchasedAt) : undefined
    )
    
    // After successfully adding position, fetch and update stock info
    try {
      const stockData = await StockDataService.getStockData(symbol.toUpperCase())
      if (stockData.quote) {
        await supabase
          .from('stocks')
          .update({
            company_name: stockData.quote.name || symbol.toUpperCase(),
            sector: stockData.quote.sector,
            industry: stockData.quote.industry,
            market_cap: stockData.quote.marketCap,
          })
          .eq('symbol', symbol.toUpperCase())
      }
    } catch (error) {
      console.log('Could not update stock info:', error)
      // Not critical - continue
    }

    return NextResponse.json({
      success: true,
      data: position,
    })
  } catch (error: any) {
    console.error('Error adding position:', error)
    return NextResponse.json(
      { error: 'Failed to add position', message: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Position ID is required' },
        { status: 400 }
      )
    }

    // Update position
    const updated = await PortfolioService.updatePosition(
      supabase,
      user.id,
      id,
      updates
    )

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error: any) {
    console.error('Error updating position:', error)
    return NextResponse.json(
      { error: 'Failed to update position', message: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const positionId = searchParams.get('id')
    const quantityToSell = searchParams.get('quantity')
    const sellPrice = searchParams.get('price')

    if (!positionId) {
      return NextResponse.json(
        { error: 'Position ID is required' },
        { status: 400 }
      )
    }

    if (quantityToSell && sellPrice) {
      // Partial sell
      const remaining = await PortfolioService.sellPartial(
        supabase,
        user.id,
        positionId,
        parseFloat(quantityToSell),
        parseFloat(sellPrice)
      )

      return NextResponse.json({
        success: true,
        data: remaining,
        message: remaining ? 'Partial position sold' : 'Position closed',
      })
    } else {
      // Sell all
      await PortfolioService.removePosition(supabase, user.id, positionId)

      return NextResponse.json({
        success: true,
        message: 'Position closed',
      })
    }
  } catch (error: any) {
    console.error('Error selling position:', error)
    return NextResponse.json(
      { error: 'Failed to sell position', message: error.message },
      { status: 500 }
    )
  }
}
