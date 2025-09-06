import { NextRequest, NextResponse } from 'next/server'
import { SP500GitHubService } from '@/lib/services/sp500-github.service'
import { RedisCacheService } from '@/lib/services/redis-cache.service'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

// Admin endpoints for managing S&P 500 constituents

// Force refresh from GitHub
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    // Simple auth check - in production use proper admin authentication
    const adminSecret = process.env.ADMIN_SECRET
    if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.log('Admin: Force refreshing S&P 500 list')
    
    // Force refresh (clears cache first)
    const stocks = await SP500GitHubService.forceRefresh()
    
    return NextResponse.json({
      success: true,
      message: 'S&P 500 list refreshed successfully',
      data: {
        count: stocks.length,
        symbols: stocks.map(s => s.symbol).slice(0, 10), // First 10 as preview
        lastUpdated: new Date().toISOString()
      }
    })
  } catch (error: any) {
    console.error('Admin S&P 500 refresh error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to refresh S&P 500 list',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Clear cache
export async function DELETE(request: NextRequest) {
  try {
    // Check authorization
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    const adminSecret = process.env.ADMIN_SECRET
    if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.log('Admin: Clearing S&P 500 cache')
    
    // Clear Redis cache
    await RedisCacheService.delete('sp500:constituents')
    
    return NextResponse.json({
      success: true,
      message: 'S&P 500 cache cleared successfully'
    })
  } catch (error: any) {
    console.error('Admin cache clear error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to clear cache',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Manual add/remove for special rebalances
export async function PUT(request: NextRequest) {
  try {
    // Check authorization
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    const adminSecret = process.env.ADMIN_SECRET
    if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { additions = [], removals = [] } = body
    
    if (!Array.isArray(additions) || !Array.isArray(removals)) {
      return NextResponse.json(
        { error: 'Invalid request. Provide arrays for additions and removals.' },
        { status: 400 }
      )
    }
    
    console.log('Admin: Manual S&P 500 update', { additions, removals })
    
    const supabase = await createClient()
    
    // Process removals
    if (removals.length > 0) {
      const { error: removeError } = await supabase
        .from('sp500_constituents')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('symbol', removals)
      
      if (removeError) {
        throw new Error(`Failed to remove stocks: ${removeError.message}`)
      }
    }
    
    // Process additions (would need more data in real implementation)
    if (additions.length > 0) {
      const newConstituents = additions.map(symbol => ({
        symbol,
        company_name: `${symbol} Company`, // Would need real company name
        sector: 'Unknown', // Would need real sector
        is_active: true,
        updated_at: new Date().toISOString()
      }))
      
      const { error: addError } = await supabase
        .from('sp500_constituents')
        .upsert(newConstituents, {
          onConflict: 'symbol',
          ignoreDuplicates: false
        })
      
      if (addError) {
        throw new Error(`Failed to add stocks: ${addError.message}`)
      }
    }
    
    // Clear cache to force refresh
    await RedisCacheService.delete('sp500:constituents')
    
    return NextResponse.json({
      success: true,
      message: 'S&P 500 list updated successfully',
      changes: {
        added: additions,
        removed: removals
      }
    })
  } catch (error: any) {
    console.error('Admin manual update error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to update S&P 500 list',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Check data freshness and status
export async function GET(request: NextRequest) {
  try {
    // This endpoint can be public - no auth required
    
    // Check cache status
    const cached = await RedisCacheService.get('sp500:constituents')
    const cacheExists = !!cached
    
    // Get database status
    const supabase = await createClient()
    const { data: dbCount, error } = await supabase
      .from('sp500_constituents')
      .select('symbol', { count: 'exact', head: true })
      .eq('is_active', true)
    
    const { data: lastUpdate } = await supabase
      .from('sp500_constituents')
      .select('updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    
    return NextResponse.json({
      success: true,
      status: {
        cache: {
          exists: cacheExists,
          ttl: cacheExists ? '2 days' : null
        },
        database: {
          activeCount: dbCount || 0,
          lastUpdated: lastUpdate?.updated_at || null
        },
        health: cacheExists ? 'healthy' : 'cache_miss'
      }
    })
  } catch (error: any) {
    console.error('Admin status check error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to check status',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
