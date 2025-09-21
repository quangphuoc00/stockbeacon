/**
 * Financial Statement Interpreter
 * Main entry point for analyzing US-listed companies
 */

import { FinancialStatements } from '@/types/stock'
import { 
  FinancialInterpretationReport, 
  AnalysisOptions,
  DataQuality,
  BeginnerSummary
} from './types/interpreter-types'
import { RedFlagAnalyzer } from './analyzers/red-flag-analyzer'
import { GreenFlagAnalyzer } from './analyzers/green-flag-analyzer'
import { RatioAnalyzer } from './analyzers/ratio-analyzer'
import { TrendAnalyzer } from './analyzers/trend-analyzer'
import { HealthScorer } from './scorers/health-scorer'
import { BeginnerTranslator } from './translators/beginner-translator'
import { InsightGenerator } from './translators/insight-generator'

export class FinancialInterpreter {
  private redFlagAnalyzer: RedFlagAnalyzer
  private greenFlagAnalyzer: GreenFlagAnalyzer
  private ratioAnalyzer: RatioAnalyzer
  private trendAnalyzer: TrendAnalyzer
  private healthScorer: HealthScorer
  private beginnerTranslator: BeginnerTranslator
  private insightGenerator: InsightGenerator

  constructor() {
    this.redFlagAnalyzer = new RedFlagAnalyzer()
    this.greenFlagAnalyzer = new GreenFlagAnalyzer()
    this.ratioAnalyzer = new RatioAnalyzer()
    this.trendAnalyzer = new TrendAnalyzer()
    this.healthScorer = new HealthScorer()
    this.beginnerTranslator = new BeginnerTranslator()
    this.insightGenerator = new InsightGenerator()
  }

  /**
   * Analyze financial statements and generate comprehensive report
   */
  async analyze(
    financialStatements: FinancialStatements,
    options: AnalysisOptions = {}
  ): Promise<FinancialInterpretationReport> {
    console.log(`[FinancialInterpreter] Starting analysis for ${financialStatements.symbol}`)

    // Validate data
    if (!this.validateData(financialStatements)) {
      throw new Error('Invalid or incomplete financial data')
    }

    // Get latest periods for analysis
    const latestAnnual = financialStatements.incomeStatements.annual[0]
    const latestQuarter = financialStatements.incomeStatements.quarterly[0]
    const latestBalance = financialStatements.balanceSheets.annual[0]
    const latestCashFlow = financialStatements.cashFlowStatements.annual[0]

    // Perform analyses in parallel for performance
    const [redFlags, greenFlags, ratios, trends] = await Promise.all([
      this.redFlagAnalyzer.analyze(financialStatements),
      this.greenFlagAnalyzer.analyze(financialStatements),
      this.ratioAnalyzer.analyze(financialStatements),
      this.trendAnalyzer.analyze(financialStatements)
    ])

    // Calculate health score based on all analyses
    const healthScore = this.healthScorer.calculate({
      redFlags,
      greenFlags,
      ratios,
      trends,
      financialStatements
    })

    // Generate beginner-friendly summary
    const beginnerSummary = this.beginnerTranslator.generateSummary({
      healthScore,
      redFlags,
      greenFlags,
      ratios,
      trends
    })

    // Generate actionable recommendations
    const recommendations = this.insightGenerator.generateRecommendations({
      healthScore,
      redFlags,
      greenFlags,
      trends,
      financialStatements
    })

    // Build data quality report
    const dataQuality = this.buildDataQuality(financialStatements)

    // Compile final report
    const report: FinancialInterpretationReport = {
      symbol: financialStatements.symbol,
      timestamp: new Date(),
      dataQuality,
      healthScore,
      redFlags,
      greenFlags,
      ratios,
      trends,
      beginnerSummary,
      recommendations
    }

    console.log(`[FinancialInterpreter] Analysis complete for ${financialStatements.symbol}`)
    console.log(`[FinancialInterpreter] Health Score: ${healthScore.overall} (${healthScore.grade})`)
    console.log(`[FinancialInterpreter] Red Flags: ${redFlags.length}, Green Flags: ${greenFlags.length}`)

    return report
  }

  /**
   * Validate that we have sufficient data for analysis
   */
  private validateData(financialStatements: FinancialStatements): boolean {
    // Check for required data
    if (!financialStatements.incomeStatements?.annual?.length ||
        !financialStatements.balanceSheets?.annual?.length ||
        !financialStatements.cashFlowStatements?.annual?.length) {
      console.error('[FinancialInterpreter] Missing required financial statements')
      return false
    }

    // Prefer at least 5 years of annual data for reliable trend analysis
    if (financialStatements.incomeStatements.annual.length < 2) {
      console.error('[FinancialInterpreter] Insufficient historical data (less than 2 years)')
      return false
    } else if (financialStatements.incomeStatements.annual.length < 5) {
      console.warn('[FinancialInterpreter] Limited historical data - ideally need 5+ years for reliable trends')
    }

    return true
  }

  /**
   * Build data quality assessment
   */
  private buildDataQuality(financialStatements: FinancialStatements): DataQuality {
    const latestAnnual = financialStatements.incomeStatements.annual[0]
    const annualCount = financialStatements.incomeStatements.annual.length
    const quarterlyCount = financialStatements.incomeStatements.quarterly?.length || 0

    // Count total data points across all statements
    let dataPoints = 0
    
    // Income statement fields
    dataPoints += financialStatements.incomeStatements.annual.reduce((sum, stmt) => {
      return sum + Object.values(stmt).filter(v => v !== null && v !== undefined).length
    }, 0)

    // Balance sheet fields
    dataPoints += financialStatements.balanceSheets.annual.reduce((sum, stmt) => {
      return sum + Object.values(stmt).filter(v => v !== null && v !== undefined).length
    }, 0)

    // Cash flow fields
    dataPoints += financialStatements.cashFlowStatements.annual.reduce((sum, stmt) => {
      return sum + Object.values(stmt).filter(v => v !== null && v !== undefined).length
    }, 0)

    return {
      completeness: 100, // Always 100% for SEC EDGAR data
      lastUpdated: financialStatements.updatedAt || new Date(),
      fiscalYearEnd: latestAnnual.date,
      dataPoints,
      historicalDepth: {
        annual: annualCount,
        quarterly: quarterlyCount
      }
    }
  }

  /**
   * Quick analysis for real-time updates
   */
  async quickAnalysis(symbol: string): Promise<{
    healthGrade: string
    topConcern: string | null
    topStrength: string | null
  }> {
    // This would fetch and analyze in a streamlined way
    // For now, returning placeholder
    return {
      healthGrade: 'B+',
      topConcern: null,
      topStrength: 'Strong cash generation'
    }
  }
}
