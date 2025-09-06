import { NextRequest, NextResponse } from 'next/server'
import { AlertCheckerService } from '@/lib/services/alert-checker.service'
import { headers } from 'next/headers'

// This endpoint should be called by a cron job every 15 minutes during market hours
// to check if any watchlist alerts should be triggered

export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Check if market is open (optional - you may want to check alerts 24/7)
    const isMarketOpen = checkMarketHours()
    
    if (!isMarketOpen) {
      console.log('Market is closed, skipping alert check')
      return NextResponse.json({
        success: true,
        message: 'Market is closed, alert check skipped',
        timestamp: new Date().toISOString()
      })
    }
    
    console.log('🔔 Starting scheduled alert check...')
    const startTime = Date.now()
    
    // Run the alert check
    await AlertCheckerService.checkAllAlerts()
    
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      message: 'Alert check completed',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Alert check cron error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to check alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint for manual testing (dev only)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }
  
  try {
    console.log('🔔 Manual alert check triggered...')
    const startTime = Date.now()
    
    // Run the alert check
    await AlertCheckerService.checkAllAlerts()
    
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      message: 'Manual alert check completed',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Alert check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Check if market is currently open
 * US Market Hours: 9:30 AM - 4:00 PM EST (Mon-Fri)
 */
function checkMarketHours(): boolean {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday, 6 = Saturday
  
  // Skip weekends
  if (day === 0 || day === 6) {
    return false
  }
  
  // Convert to EST/EDT
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
  const hours = easternTime.getHours()
  const minutes = easternTime.getMinutes()
  const timeInMinutes = hours * 60 + minutes
  
  // Market hours: 9:30 AM (570 minutes) to 4:00 PM (960 minutes)
  const marketOpen = 9 * 60 + 30  // 570
  const marketClose = 16 * 60      // 960
  
  return timeInMinutes >= marketOpen && timeInMinutes <= marketClose
}

// Add after-hours check option
async function checkAlertsWithOptions(includeAfterHours: boolean = false) {
  if (!includeAfterHours && !checkMarketHours()) {
    return {
      success: false,
      message: 'Market is closed'
    }
  }
  
  await AlertCheckerService.checkAllAlerts()
  
  return {
    success: true,
    message: 'Alerts checked'
  }
}
