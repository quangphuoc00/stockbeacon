import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WatchlistService } from '@/lib/services/watchlist.service'
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

    // Get user's watchlist
    const watchlist = await WatchlistService.getUserWatchlist(supabase, user.id)

    // Enrich with current market data
    const enrichedWatchlist = await Promise.all(
      watchlist.map(async (item) => {
        try {
          // Get current stock data
          const stockData = await StockDataService.getStockData(item.symbol)
          
          return {
            ...item,
            currentPrice: stockData.quote?.price || 0,
            change: stockData.quote?.change || 0,
            changePercent: stockData.quote?.changePercent || 0,
            score: stockData.score?.score || 0,
            timingScore: stockData.score?.timingScore || 0,
            name: stockData.quote?.name || item.stock?.company_name || item.symbol,
          }
        } catch (error) {
          console.error(`Error enriching watchlist item ${item.symbol}:`, error)
          return {
            ...item,
            currentPrice: 0,
            change: 0,
            changePercent: 0,
            score: 0,
            timingScore: 0,
            name: item.stock?.company_name || item.symbol,
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: enrichedWatchlist,
      count: enrichedWatchlist.length,
    })
  } catch (error: any) {
    console.error('Error fetching watchlist:', error)
    return NextResponse.json(
      { error: 'Failed to fetch watchlist', message: error.message },
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
    const { symbol, targetPrice, notes, buyTriggers } = body

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      )
    }

    // Add to watchlist
    const watchlistItem = await WatchlistService.addToWatchlist(
      supabase,
      user.id,
      symbol.toUpperCase(),
      targetPrice,
      notes,
      buyTriggers
    )
    
    // Enrich the watchlist item with current market data
    let enrichedItem = { ...watchlistItem }
    
    try {
      const stockData = await StockDataService.getStockData(symbol.toUpperCase())
      
      // Update stock info in database
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
          
        // Add real-time data to response
        enrichedItem = {
          ...watchlistItem,
          currentPrice: stockData.quote.price || 0,
          change: stockData.quote.change || 0,
          changePercent: stockData.quote.changePercent || 0,
          score: stockData.score?.score || 0,
          timingScore: stockData.score?.timingScore || 0,
          // Include name separately for frontend
          name: stockData.quote.name || symbol.toUpperCase(),
        } as any
      }
    } catch (error) {
      console.log('Could not enrich stock data:', error)
      // Not critical - return basic data
    }

    return NextResponse.json({
      success: true,
      data: enrichedItem,
    })
  } catch (error: any) {
    console.error('Error adding to watchlist:', error)
    
    if (error.message === 'Stock already in watchlist') {
      return NextResponse.json(
        { error: 'Stock already in watchlist' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to add to watchlist', message: error.message },
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
    const watchlistId = searchParams.get('id')

    if (!watchlistId) {
      return NextResponse.json(
        { error: 'Watchlist ID is required' },
        { status: 400 }
      )
    }

    // Remove from watchlist
    await WatchlistService.removeFromWatchlist(supabase, user.id, watchlistId)

    return NextResponse.json({
      success: true,
      message: 'Removed from watchlist',
    })
  } catch (error: any) {
    console.error('Error removing from watchlist:', error)
    return NextResponse.json(
      { error: 'Failed to remove from watchlist', message: error.message },
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
    const { id, updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Watchlist ID is required' },
        { status: 400 }
      )
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Updates object is required' },
        { status: 400 }
      )
    }

    // Validate alert settings if provided
    if (updates.buy_triggers) {
      const { minScore, minTimingScore } = updates.buy_triggers
      
      // Validate scores are within range
      if (minScore !== null && minScore !== undefined) {
        if (typeof minScore !== 'number' || minScore < 0 || minScore > 100) {
          return NextResponse.json(
            { error: 'Business Quality Score must be between 0 and 100' },
            { status: 400 }
          )
        }
      }
      
      if (minTimingScore !== null && minTimingScore !== undefined) {
        if (typeof minTimingScore !== 'number' || minTimingScore < 0 || minTimingScore > 100) {
          return NextResponse.json(
            { error: 'Time to Buy Score must be between 0 and 100' },
            { status: 400 }
          )
        }
      }
    }

    // Validate target price if provided
    if (updates.target_price !== null && updates.target_price !== undefined) {
      if (typeof updates.target_price !== 'number' || updates.target_price < 0) {
        return NextResponse.json(
          { error: 'Target price must be a positive number' },
          { status: 400 }
        )
      }
    }

    // If buy_triggers are being updated, ensure alerts are enabled
    if (updates.buy_triggers && updates.buy_triggers.enabled !== false) {
      updates.alert_enabled = true
    }
    
    console.log(`Updating watchlist item ${id} with:`, JSON.stringify(updates, null, 2))

    // Update watchlist item
    const updated = await WatchlistService.updateWatchlistItem(
      supabase,
      user.id,
      id,
      updates
    )

    console.log(`Successfully updated watchlist item ${id}`)

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error: any) {
    console.error('Error updating watchlist:', error)
    return NextResponse.json(
      { error: 'Failed to update watchlist', message: error.message },
      { status: 500 }
    )
  }
}
