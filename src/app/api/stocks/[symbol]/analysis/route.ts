import { NextRequest, NextResponse } from 'next/server'
import { SECEdgarService } from '@/lib/services/sec-edgar.service'
import { FinancialInterpreter } from '@/lib/services/financial-interpreter'
import { getRedisInstance } from '@/lib/utils/redis'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params
  const symbol = rawSymbol.toUpperCase()
  
  try {
    // Check Redis cache first
    const redis = getRedisInstance()
    const cacheKey = `financial_analysis:${symbol}`
    
    try {
      const cachedData = await redis.get(cacheKey)
      if (cachedData && typeof cachedData === 'string') {
        console.log(`[Analysis API] Returning cached analysis for ${symbol}`)
        const response = NextResponse.json(JSON.parse(cachedData))
        // Add cache headers for browser caching (2 hours)
        response.headers.set('Cache-Control', 'public, max-age=7200, stale-while-revalidate=14400')
        response.headers.set('X-Cache-Status', 'HIT')
        return response
      }
    } catch (cacheError) {
      console.error('[Analysis API] Redis cache error:', cacheError)
      // Continue without cache
    }
    
    // Check if this is a US-listed company
    const cik = await SECEdgarService.getCIK(symbol)
    if (!cik) {
      console.log(`[Analysis API] Symbol ${symbol} is not a US-listed company`)
      return NextResponse.json(
        { 
          error: 'Not a US-listed company',
          message: 'Financial analysis is available for US-listed companies only (NYSE, NASDAQ, etc.)',
          symbol: symbol
        },
        { status: 404 }
      )
    }
    
    // Try to get cached financial statements first
    let financialStatements = null
    const statementsKey = `financial_statements:${symbol}`
    
    try {
      const cachedStatements = await redis.get(statementsKey)
      if (cachedStatements && typeof cachedStatements === 'string') {
        console.log(`[Analysis API] Using cached financial statements for ${symbol}`)
        financialStatements = JSON.parse(cachedStatements)
      }
    } catch (error) {
      console.error('[Analysis API] Error reading cached statements:', error)
    }
    
    // If not cached, fetch from SEC EDGAR
    if (!financialStatements) {
      console.log(`[Analysis API] Fetching fresh financial statements for ${symbol} (CIK: ${cik})`)
      financialStatements = await SECEdgarService.getFinancialStatements(symbol)
      
      // Cache the statements for 2 days (48 hours)
      if (financialStatements) {
        try {
          await redis.setex(statementsKey, 172800, JSON.stringify(financialStatements))
        } catch (error) {
          console.error('[Analysis API] Error caching statements:', error)
        }
      }
    }
    
    if (!financialStatements) {
      console.error(`[Analysis API] Failed to retrieve financial statements for ${symbol}`)
      return NextResponse.json(
        { 
          error: 'Failed to retrieve financial data',
          message: 'Unable to fetch data from SEC EDGAR. Please try again later.',
          symbol: symbol
        },
        { status: 500 }
      )
    }
    
    // Perform comprehensive financial analysis
    console.log(`[Analysis API] Performing financial analysis for ${symbol}`)
    const interpreter = new FinancialInterpreter()
    const analysis = await interpreter.analyze(financialStatements)
    
    // Create response with analysis and metadata
    const response = {
      symbol,
      companyName: analysis.companyName,
      analysisDate: new Date().toISOString(),
      dataSource: 'SEC EDGAR',
      confidence: 100, // Always 100% for SEC data
      
      // Health Score
      healthScore: {
        overall: analysis.healthScore.overall,
        grade: analysis.healthScore.grade,
        summary: analysis.healthScore.summary,
        categories: analysis.healthScore.categories.map(cat => ({
          name: cat.name,
          score: cat.score,
          weight: cat.weight
        }))
      },
      
      // Beginner Summary
      summary: {
        oneLineSummary: analysis.beginnerSummary.oneLineSummary,
        healthDescription: analysis.beginnerSummary.healthDescription,
        simpleRating: analysis.beginnerSummary.simpleRating,
        investmentSuitability: analysis.beginnerSummary.investmentSuitability
      },
      
      // Key Findings
      keyStrengths: analysis.healthScore.keyStrengths,
      keyWeaknesses: analysis.healthScore.keyWeaknesses,
      
      // All Flags with full details
      redFlagsCount: analysis.redFlags.length,
      greenFlagsCount: analysis.greenFlags.length,
      redFlags: analysis.redFlags.map(f => ({
        severity: f.flag.severity,
        title: f.flag.title,
        explanation: f.flag.beginnerExplanation,
        technicalDescription: f.flag.technicalDescription,
        formula: f.flag.formula,
        value: f.flag.value,
        threshold: f.flag.threshold,
        recommendation: f.flag.recommendation,
        confidence: f.confidence.score
      })),
      greenFlags: analysis.greenFlags.map(f => ({
        strength: f.flag.strength,
        title: f.flag.title,
        explanation: f.flag.beginnerExplanation,
        technicalDescription: f.flag.technicalDescription,
        value: f.flag.value,
        benchmark: f.flag.benchmark,
        metrics: f.flag.metrics,
        trend: f.flag.trend,
        recommendation: f.flag.recommendation,
        confidence: f.confidence.score
      })),
      
      // Key Ratios with full details
      keyRatios: analysis.ratios
        .filter(r => ['current_ratio', 'debt_to_equity', 'roe', 'net_margin', 'fcf_margin'].includes(r.id))
        .map(r => ({
          name: r.name,
          value: r.value,
          formula: r.formula,
          interpretation: r.interpretation.beginnerExplanation,
          score: r.interpretation.score,
          benchmark: r.interpretation.benchmark,
          actualValues: r.actualValues,
          trend: r.trend
        })),
      
      // Trends with full data for charts
      keyTrends: analysis.trends
        .filter(t => ['Revenue', 'Net Income', 'Free Cash Flow', 'Shares Outstanding', 'Dividends Paid'].includes(t.metric))
        .map(t => ({
          metric: t.metric,
          direction: t.direction,
          visualIndicator: t.visualIndicator,
          insight: t.beginnerInsight,
          periods: t.periods,
          cagr: t.cagr
        })),
      
      // Recommendations
      recommendations: analysis.recommendations.slice(0, 5).map(r => ({
        type: r.type,
        priority: r.priority,
        title: r.title,
        description: r.description
      })),
      
      // Data Quality
      dataQuality: {
        lastUpdated: analysis.dataQuality.lastUpdated,
        fiscalYearEnd: analysis.dataQuality.fiscalYearEnd,
        historicalDepth: analysis.dataQuality.historicalDepth
      },
      
      // Include financial statements for components that need raw data
      financialStatements: financialStatements
    }
    
    // Cache the analysis for 2 days (48 hours)
    try {
      await redis.setex(cacheKey, 172800, JSON.stringify(response))
      console.log(`[Analysis API] Cached analysis for ${symbol} (2 days)`)
    } catch (cacheError) {
      console.error('[Analysis API] Failed to cache analysis:', cacheError)
      // Continue without caching
    }
    
    const jsonResponse = NextResponse.json(response)
    // Add cache headers for browser caching (2 hours)
    jsonResponse.headers.set('Cache-Control', 'public, max-age=7200, stale-while-revalidate=14400')
    jsonResponse.headers.set('X-Cache-Status', 'MISS')
    return jsonResponse
  } catch (error) {
    console.error(`[Analysis API] Error analyzing ${symbol}:`, error)
    return NextResponse.json(
      { 
        error: 'Analysis failed',
        message: 'An error occurred while analyzing the financial data',
        symbol: symbol
      },
      { status: 500 }
    )
  }
}
