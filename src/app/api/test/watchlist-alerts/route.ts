import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WatchlistService } from '@/lib/services/watchlist.service'

// Test endpoint to verify alert settings are saved correctly
// Only available in development
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

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

    // Get watchlist with raw database values
    const { data: watchlistItems, error } = await supabase
      .from('watchlists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch watchlist', message: error.message },
        { status: 500 }
      )
    }

    // Return raw database values to verify alert settings are saved
    return NextResponse.json({
      success: true,
      userId: user.id,
      count: watchlistItems?.length || 0,
      items: watchlistItems?.map(item => ({
        id: item.id,
        symbol: item.symbol,
        target_price: item.target_price,
        alert_enabled: item.alert_enabled,
        buy_triggers: item.buy_triggers,
        notes: item.notes,
        created_at: item.created_at,
        updated_at: item.updated_at
      }))
    })
  } catch (error: any) {
    console.error('Error in test endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
