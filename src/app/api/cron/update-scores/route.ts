import { NextRequest, NextResponse } from 'next/server'
import { BackgroundScoreCalculator } from '@/lib/services/background-score-calculator'
import { AlertCheckerService } from '@/lib/services/alert-checker.service'
import { headers } from 'next/headers'

// This endpoint is designed to be called by a cron job service (e.g., Vercel Cron, GitHub Actions, etc.)
// It should run daily at 2 AM EST to update all S&P 500 stock scores

export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized
    // In production, you should use a proper authorization mechanism
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.log('Starting scheduled S&P 500 score update')
    
    // Start the calculation in the background (don't await)
    BackgroundScoreCalculator.calculateAllSP500Scores()
      .then(async () => {
        console.log('✅ Background score calculation completed successfully')
        
        // Check alerts after scores are updated
        console.log('🔔 Checking alerts after score update...')
        try {
          await AlertCheckerService.checkAllAlerts()
          console.log('✅ Alert check completed')
        } catch (error) {
          console.error('❌ Alert check failed:', error)
        }
      })
      .catch((error) => {
        console.error('❌ Background score calculation failed:', error)
      })
    
    // Return immediately
    return NextResponse.json({
      success: true,
      message: 'S&P 500 score calculation started in background',
      note: 'Check server logs for progress',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Cron job error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to update scores',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check the status
export async function GET(request: NextRequest) {
  try {
    const progress = BackgroundScoreCalculator.getProgress()
    
    if (!progress) {
      return NextResponse.json({
        status: 'idle',
        message: 'No calculation in progress'
      })
    }
    
    const elapsed = (Date.now() - progress.startTime.getTime()) / 1000 / 60 // minutes
    const percentComplete = (progress.completed / progress.total) * 100
    
    return NextResponse.json({
      status: 'running',
      progress: {
        total: progress.total,
        completed: progress.completed,
        failed: progress.failed,
        percentComplete: percentComplete.toFixed(1),
        currentSymbol: progress.currentSymbol,
        elapsedMinutes: elapsed.toFixed(2),
        errors: progress.errors.length
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
