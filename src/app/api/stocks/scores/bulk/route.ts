import { NextRequest, NextResponse } from 'next/server'
import { ScorePersistenceService } from '@/lib/services/score-persistence.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbols = [], minScore } = body
    
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid symbols array' },
        { status: 400 }
      )
    }
    
    if (symbols.length > 100) {
      return NextResponse.json(
        { error: 'Too many symbols. Maximum 100 allowed per request.' },
        { status: 400 }
      )
    }
    
    // Fetch scores for specified symbols
    const scoresMap = await ScorePersistenceService.getScoresBulk(symbols)
    
    // Convert map to array
    const scores = Array.from(scoresMap.values())
    
    // Filter by minimum score if specified
    const filteredScores = minScore 
      ? scores.filter(score => score.score >= minScore)
      : scores
    
    return NextResponse.json({
      success: true,
      scores: filteredScores,
      requested: symbols.length,
      found: filteredScores.length
    })
  } catch (error: any) {
    console.error('Error fetching bulk scores:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch scores',
        message: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbolsParam = searchParams.get('symbols')
    
    if (!symbolsParam) {
      return NextResponse.json(
        { error: 'Missing symbols parameter' },
        { status: 400 }
      )
    }
    
    // Parse symbols from comma-separated list
    const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase())
    
    if (symbols.length === 0) {
      return NextResponse.json(
        { error: 'No symbols provided' },
        { status: 400 }
      )
    }
    
    if (symbols.length > 100) {
      return NextResponse.json(
        { error: 'Too many symbols. Maximum 100 allowed per request.' },
        { status: 400 }
      )
    }
    
    // Fetch scores in bulk
    const scoreMap = await ScorePersistenceService.getScoresBulk(symbols)
    
    // Convert Map to object for JSON serialization
    const scores: Record<string, any> = {}
    scoreMap.forEach((score, symbol) => {
      scores[symbol] = {
        symbol: score.symbol,
        score: score.score,
        businessQualityScore: score.businessQualityScore,
        timingScore: score.timingScore,
        financialHealthScore: score.financialHealthScore,
        moatScore: score.moatScore,
        growthScore: score.growthScore,
        valuationScore: score.valuationScore,
        technicalScore: score.technicalScore,
        recommendation: score.recommendation,
        explanation: score.explanation,
        calculatedAt: score.calculatedAt,
        // Check if score is fresh (less than 24 hours old)
        isFresh: ScorePersistenceService.isScoreFresh(score, 24)
      }
    })
    
    // Find symbols that don't have scores
    const missingSymbols = symbols.filter(symbol => !scoreMap.has(symbol))
    
    return NextResponse.json({
      success: true,
      data: {
        scores,
        requested: symbols.length,
        found: scoreMap.size,
        missing: missingSymbols
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error fetching bulk scores:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch scores',
        message: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
