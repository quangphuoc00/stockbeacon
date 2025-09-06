import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AlertCheckerService } from '@/lib/services/alert-checker.service'

// Test endpoint to manually check alerts for the current user
// Only available in development

export async function POST(request: NextRequest) {
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

    console.log(`🔔 Manually checking alerts for user ${user.id}...`)
    
    // Get user's watchlist to show what will be checked
    const { data: watchlistItems } = await supabase
      .from('watchlists')
      .select('*')
      .eq('user_id', user.id)
      .eq('alert_enabled', true)
      .not('buy_triggers', 'is', null)
    
    const alertCount = watchlistItems?.length || 0
    
    if (alertCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active alerts configured',
        userId: user.id,
        alertsChecked: 0
      })
    }
    
    // Log what we're checking
    console.log(`Found ${alertCount} active alerts to check:`)
    watchlistItems?.forEach(item => {
      const triggers = item.buy_triggers as any
      console.log(`- ${item.symbol}: Price < $${item.target_price || 'Any'}, Score >= ${triggers?.minScore || 'Any'}, Timing >= ${triggers?.minTimingScore || 'Any'}`)
    })
    
    // Run the check
    const startTime = Date.now()
    await AlertCheckerService.checkUserAlerts(user.id)
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      message: `Checked ${alertCount} alerts`,
      userId: user.id,
      alertsChecked: alertCount,
      duration: `${duration}ms`,
      alerts: watchlistItems?.map(item => ({
        symbol: item.symbol,
        conditions: {
          targetPrice: item.target_price,
          minScore: (item.buy_triggers as any)?.minScore,
          minTimingScore: (item.buy_triggers as any)?.minTimingScore
        }
      }))
    })
    
  } catch (error: any) {
    console.error('Error checking alerts:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check alerts', 
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// GET endpoint to see current alert configuration
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

    // Get user's active alerts
    const { data: watchlistItems } = await supabase
      .from('watchlists')
      .select('*')
      .eq('user_id', user.id)
      .eq('alert_enabled', true)
      .not('buy_triggers', 'is', null)
      .order('created_at', { ascending: false })
    
    return NextResponse.json({
      success: true,
      userId: user.id,
      activeAlerts: watchlistItems?.length || 0,
      alerts: watchlistItems?.map(item => ({
        id: item.id,
        symbol: item.symbol,
        targetPrice: item.target_price,
        buyTriggers: item.buy_triggers,
        notes: item.notes,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }))
    })
    
  } catch (error: any) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts', message: error.message },
      { status: 500 }
    )
  }
}
