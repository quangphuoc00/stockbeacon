import { NextRequest, NextResponse } from 'next/server'
import { FMPKeyManagerService } from '@/lib/services/fmp-key-manager.service'

// GET /api/admin/fmp-keys - Get key statistics
export async function GET() {
  try {
    const stats = await FMPKeyManagerService.getKeyStats()
    const keys = await FMPKeyManagerService.getActiveKeys()
    
    return NextResponse.json({
      stats,
      activeKeys: keys.map(k => ({
        id: k.id,
        key: k.key.substring(0, 8) + '...',
        tries: k.tries,
        failures: k.number_failures,
        blacklisted: k.blacklist,
        lastUsed: k.last_used_at
      }))
    })
  } catch (error) {
    console.error('Error fetching FMP key stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch key statistics' },
      { status: 500 }
    )
  }
}

// POST /api/admin/fmp-keys - Add new keys
export async function POST(request: NextRequest) {
  try {
    const { keys } = await request.json()
    
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Provide an array of keys.' },
        { status: 400 }
      )
    }
    
    await FMPKeyManagerService.addKeys(keys)
    
    return NextResponse.json({ 
      message: `Successfully added ${keys.length} keys`,
      stats: await FMPKeyManagerService.getKeyStats()
    })
  } catch (error) {
    console.error('Error adding FMP keys:', error)
    return NextResponse.json(
      { error: 'Failed to add keys' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/fmp-keys - Reset key failures
export async function PUT(request: NextRequest) {
  try {
    const { key, action } = await request.json()
    
    if (!key || !action) {
      return NextResponse.json(
        { error: 'Invalid request. Provide key and action.' },
        { status: 400 }
      )
    }
    
    if (action === 'reset') {
      await FMPKeyManagerService.resetKeyFailures(key)
      return NextResponse.json({ message: 'Key failures reset successfully' })
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Supported actions: reset' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating FMP key:', error)
    return NextResponse.json(
      { error: 'Failed to update key' },
      { status: 500 }
    )
  }
}
