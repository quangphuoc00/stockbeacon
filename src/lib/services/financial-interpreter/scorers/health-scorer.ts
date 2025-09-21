/**
 * Health Score Calculator
 * Calculates comprehensive financial health score (0-100)
 */

import { FinancialStatements } from '@/types/stock'
import { 
  HealthScore, 
  HealthScoreCategory,
  RedFlagWithConfidence,
  GreenFlagWithConfidence,
  FinancialRatio,
  TrendAnalysis
} from '../types/interpreter-types'

interface ScoringInput {
  redFlags: RedFlagWithConfidence[]
  greenFlags: GreenFlagWithConfidence[]
  ratios: FinancialRatio[]
  trends: TrendAnalysis[]
  financialStatements: FinancialStatements
}

export class HealthScorer {
  // Category weights (must sum to 100%)
  private readonly CATEGORY_WEIGHTS = {
    profitability: 25,
    growth: 20,
    financial_stability: 25,
    efficiency: 15,
    shareholder_value: 15
  }

  /**
   * Calculate overall health score
   */
  calculate(input: ScoringInput): HealthScore {
    // Calculate scores for each category
    const profitabilityScore = this.calculateProfitabilityScore(input)
    const growthScore = this.calculateGrowthScore(input)
    const stabilityScore = this.calculateFinancialStabilityScore(input)
    const efficiencyScore = this.calculateEfficiencyScore(input)
    const shareholderScore = this.calculateShareholderValueScore(input)

    // Calculate weighted overall score
    const overallScore = 
      (profitabilityScore.score * this.CATEGORY_WEIGHTS.profitability / 100) +
      (growthScore.score * this.CATEGORY_WEIGHTS.growth / 100) +
      (stabilityScore.score * this.CATEGORY_WEIGHTS.financial_stability / 100) +
      (efficiencyScore.score * this.CATEGORY_WEIGHTS.efficiency / 100) +
      (shareholderScore.score * this.CATEGORY_WEIGHTS.shareholder_value / 100)

    // Determine grade
    const grade = this.calculateGrade(overallScore)

    // Compile key strengths and weaknesses
    const keyStrengths = this.identifyKeyStrengths(input)
    const keyWeaknesses = this.identifyKeyWeaknesses(input)

    // Generate summary and insights
    const summary = this.generateSummary(overallScore, grade, input)
    const beginnerInterpretation = this.generateBeginnerInterpretation(overallScore, grade)
    const actionableInsights = this.generateActionableInsights(input, overallScore)

    return {
      overall: Math.round(overallScore),
      grade,
      categories: [
        profitabilityScore,
        growthScore,
        stabilityScore,
        efficiencyScore,
        shareholderScore
      ],
      summary,
      beginnerInterpretation,
      keyStrengths,
      keyWeaknesses,
      actionableInsights
    }
  }

  /**
   * Calculate profitability score
   */
  private calculateProfitabilityScore(input: ScoringInput): HealthScoreCategory {
    let score = 50 // Start at neutral
    const factors: string[] = []

    // Check profitability ratios
    const netMargin = input.ratios.find(r => r.id === 'net_margin')
    const roe = input.ratios.find(r => r.id === 'roe')
    const roic = input.ratios.find(r => r.id === 'roic')
    const fcfMargin = input.ratios.find(r => r.id === 'fcf_margin')

    // Net Margin scoring
    if (netMargin?.value) {
      if (netMargin.value >= 15) {
        score += 15
        factors.push('Excellent net margins')
      } else if (netMargin.value >= 10) {
        score += 10
        factors.push('Good net margins')
      } else if (netMargin.value >= 5) {
        score += 5
        factors.push('Adequate net margins')
      } else if (netMargin.value < 0) {
        score -= 20
        factors.push('Unprofitable')
      }
    }

    // ROE scoring
    if (roe?.value) {
      if (roe.value >= 20) {
        score += 15
        factors.push('Superior ROE')
      } else if (roe.value >= 15) {
        score += 10
        factors.push('Strong ROE')
      } else if (roe.value >= 10) {
        score += 5
        factors.push('Decent ROE')
      } else if (roe.value < 5) {
        score -= 10
        factors.push('Poor ROE')
      }
    }

    // FCF Margin scoring
    if (fcfMargin?.value) {
      if (fcfMargin.value >= 15) {
        score += 10
        factors.push('Excellent cash generation')
      } else if (fcfMargin.value >= 10) {
        score += 5
        factors.push('Good cash generation')
      } else if (fcfMargin.value < 0) {
        score -= 15
        factors.push('Negative free cash flow')
      }
    }

    // Check for profitability green flags
    const cashGenerationFlag = input.greenFlags.find(f => f.flag.id === 'superior_cash_generation')
    if (cashGenerationFlag) {
      score += 10
      factors.push('High-quality earnings')
    }

    // Check for profitability red flags
    const negativeMarginFlag = input.redFlags.find(f => f.flag.id === 'negative_gross_margin')
    if (negativeMarginFlag) {
      score -= 25
      factors.push('Negative gross margins')
    }

    const earningsQualityFlag = input.redFlags.find(f => f.flag.id === 'poor_earnings_quality')
    if (earningsQualityFlag) {
      score -= 10
      factors.push('Poor earnings quality')
    }

    // Check margin trends
    const marginTrends = input.trends.filter(t => t.metric.includes('Margin'))
    marginTrends.forEach(trend => {
      if (trend.direction === 'improving') {
        score += 5
        factors.push(`${trend.metric} improving`)
      } else if (trend.direction === 'deteriorating') {
        score -= 5
        factors.push(`${trend.metric} declining`)
      }
    })

    return {
      name: 'profitability',
      score: Math.max(0, Math.min(100, score)),
      weight: this.CATEGORY_WEIGHTS.profitability,
      factors
    }
  }

  /**
   * Calculate growth score
   */
  private calculateGrowthScore(input: ScoringInput): HealthScoreCategory {
    let score = 50 // Start at neutral
    const factors: string[] = []

    // Check growth trends
    const revenueTrend = input.trends.find(t => t.metric === 'Revenue')
    const earningsTrend = input.trends.find(t => t.metric === 'Net Income')
    const fcfTrend = input.trends.find(t => t.metric === 'Free Cash Flow')

    // Revenue growth scoring
    if (revenueTrend) {
      if (revenueTrend.cagr && revenueTrend.cagr >= 15) {
        score += 20
        factors.push('Strong revenue growth')
      } else if (revenueTrend.cagr && revenueTrend.cagr >= 10) {
        score += 15
        factors.push('Good revenue growth')
      } else if (revenueTrend.cagr && revenueTrend.cagr >= 5) {
        score += 10
        factors.push('Moderate revenue growth')
      } else if (revenueTrend.direction === 'deteriorating') {
        score -= 15
        factors.push('Declining revenue')
      }
    }

    // Earnings growth scoring
    if (earningsTrend) {
      if (earningsTrend.cagr && earningsTrend.cagr >= 15) {
        score += 15
        factors.push('Strong earnings growth')
      } else if (earningsTrend.cagr && earningsTrend.cagr >= 10) {
        score += 10
        factors.push('Good earnings growth')
      } else if (earningsTrend.direction === 'deteriorating') {
        score -= 10
        factors.push('Declining earnings')
      }
    }

    // FCF growth scoring
    if (fcfTrend) {
      if (fcfTrend.direction === 'improving') {
        score += 10
        factors.push('Growing free cash flow')
      } else if (fcfTrend.direction === 'deteriorating') {
        score -= 5
        factors.push('Declining free cash flow')
      }
    }

    // Check for growth green flags
    const compoundGrowthFlag = input.greenFlags.find(f => f.flag.id === 'compound_growth_machine')
    if (compoundGrowthFlag) {
      score += 15
      factors.push('Exceptional compound growth')
    }

    const operatingLeverageFlag = input.greenFlags.find(f => f.flag.id === 'operating_leverage')
    if (operatingLeverageFlag) {
      score += 10
      factors.push('Strong operating leverage')
    }

    // Check for consistency
    if (revenueTrend && earningsTrend && 
        revenueTrend.volatility && revenueTrend.volatility < 20 &&
        earningsTrend.volatility && earningsTrend.volatility < 30) {
      score += 5
      factors.push('Consistent growth')
    }

    return {
      name: 'growth',
      score: Math.max(0, Math.min(100, score)),
      weight: this.CATEGORY_WEIGHTS.growth,
      factors
    }
  }

  /**
   * Calculate financial stability score
   */
  private calculateFinancialStabilityScore(input: ScoringInput): HealthScoreCategory {
    let score = 75 // Start higher for stability
    const factors: string[] = []

    // Check liquidity ratios
    const currentRatio = input.ratios.find(r => r.id === 'current_ratio')
    const debtToEquity = input.ratios.find(r => r.id === 'debt_to_equity')
    const interestCoverage = input.ratios.find(r => r.id === 'interest_coverage')

    // Current ratio scoring
    if (currentRatio?.value) {
      if (currentRatio.value >= 2) {
        score += 10
        factors.push('Strong liquidity')
      } else if (currentRatio.value >= 1.5) {
        score += 5
        factors.push('Good liquidity')
      } else if (currentRatio.value < 1) {
        score -= 20
        factors.push('Liquidity concerns')
      }
    }

    // Debt scoring
    if (debtToEquity?.value) {
      if (debtToEquity.value <= 0.5) {
        score += 10
        factors.push('Conservative leverage')
      } else if (debtToEquity.value <= 1) {
        score += 5
        factors.push('Moderate leverage')
      } else if (debtToEquity.value > 2) {
        score -= 15
        factors.push('High leverage')
      }
    }

    // Interest coverage scoring
    if (interestCoverage?.value) {
      if (interestCoverage.value >= 5) {
        score += 5
        factors.push('Strong interest coverage')
      } else if (interestCoverage.value < 2) {
        score -= 10
        factors.push('Weak interest coverage')
      }
    }

    // Check for stability green flags
    const fortressBalanceFlag = input.greenFlags.find(f => f.flag.id === 'fortress_balance_sheet')
    if (fortressBalanceFlag) {
      score += 15
      factors.push('Fortress balance sheet')
    }

    // Check for critical red flags
    const insolvencyFlag = input.redFlags.find(f => f.flag.id === 'insolvency_risk')
    if (insolvencyFlag) {
      score -= 40
      factors.push('Insolvency risk')
    }

    const liquidityCrisisFlag = input.redFlags.find(f => f.flag.id === 'liquidity_crisis')
    if (liquidityCrisisFlag) {
      score -= 30
      factors.push('Liquidity crisis')
    }

    const cashBurnFlag = input.redFlags.find(f => f.flag.id === 'cash_burn_leveraged')
    if (cashBurnFlag) {
      score -= 25
      factors.push('Cash burn with high debt')
    }

    const debtServiceFlag = input.redFlags.find(f => f.flag.id === 'unsustainable_debt_service')
    if (debtServiceFlag) {
      score -= 20
      factors.push('Unsustainable debt service')
    }

    // Check debt trends
    const debtTrend = input.trends.find(t => t.metric === 'Debt-to-Equity Ratio')
    if (debtTrend) {
      if (debtTrend.direction === 'improving') {
        score += 5
        factors.push('Deleveraging')
      } else if (debtTrend.direction === 'deteriorating') {
        score -= 5
        factors.push('Increasing leverage')
      }
    }

    return {
      name: 'financial_stability',
      score: Math.max(0, Math.min(100, score)),
      weight: this.CATEGORY_WEIGHTS.financial_stability,
      factors
    }
  }

  /**
   * Calculate efficiency score
   */
  private calculateEfficiencyScore(input: ScoringInput): HealthScoreCategory {
    let score = 50 // Start at neutral
    const factors: string[] = []

    // Check efficiency ratios
    const assetTurnover = input.ratios.find(r => r.id === 'asset_turnover')
    const inventoryTurnover = input.ratios.find(r => r.id === 'inventory_turnover')
    const receivablesTurnover = input.ratios.find(r => r.id === 'receivables_turnover')
    const roa = input.ratios.find(r => r.id === 'roa')

    // Asset turnover scoring
    if (assetTurnover?.value) {
      if (assetTurnover.value >= 2) {
        score += 15
        factors.push('Excellent asset efficiency')
      } else if (assetTurnover.value >= 1.5) {
        score += 10
        factors.push('Good asset efficiency')
      } else if (assetTurnover.value >= 1) {
        score += 5
        factors.push('Adequate asset efficiency')
      } else {
        score -= 5
        factors.push('Poor asset utilization')
      }
    }

    // ROA scoring
    if (roa?.value) {
      if (roa.value >= 10) {
        score += 15
        factors.push('Excellent ROA')
      } else if (roa.value >= 7) {
        score += 10
        factors.push('Good ROA')
      } else if (roa.value >= 5) {
        score += 5
        factors.push('Fair ROA')
      } else if (roa.value < 3) {
        score -= 5
        factors.push('Poor ROA')
      }
    }

    // Working capital efficiency
    if (inventoryTurnover?.value && inventoryTurnover.value >= 6) {
      score += 5
      factors.push('Efficient inventory management')
    }

    if (receivablesTurnover?.value && receivablesTurnover.value >= 12) {
      score += 5
      factors.push('Fast collections')
    }

    // Check for efficiency green flags
    const capitalLightFlag = input.greenFlags.find(f => f.flag.id === 'capital_light_growth')
    if (capitalLightFlag) {
      score += 10
      factors.push('Capital-light model')
    }

    // Check for efficiency red flags
    const workingCapitalFlag = input.redFlags.find(f => 
      f.flag.id === 'receivables_quality_issue' || f.flag.id === 'inventory_buildup'
    )
    if (workingCapitalFlag) {
      score -= 10
      factors.push('Working capital issues')
    }

    const capitalIntensityFlag = input.redFlags.find(f => f.flag.id === 'rising_capital_intensity')
    if (capitalIntensityFlag) {
      score -= 10
      factors.push('Rising capital needs')
    }

    // Check efficiency trends
    const assetTurnoverTrend = input.trends.find(t => t.metric === 'Asset Turnover')
    if (assetTurnoverTrend) {
      if (assetTurnoverTrend.direction === 'improving') {
        score += 5
        factors.push('Improving efficiency')
      } else if (assetTurnoverTrend.direction === 'deteriorating') {
        score -= 5
        factors.push('Declining efficiency')
      }
    }

    return {
      name: 'efficiency',
      score: Math.max(0, Math.min(100, score)),
      weight: this.CATEGORY_WEIGHTS.efficiency,
      factors
    }
  }

  /**
   * Calculate shareholder value score
   */
  private calculateShareholderValueScore(input: ScoringInput): HealthScoreCategory {
    let score = 50 // Start at neutral
    const factors: string[] = []

    // Check for shareholder-friendly actions
    const buybacksFlag = input.greenFlags.find(f => f.flag.id === 'aggressive_buybacks')
    if (buybacksFlag) {
      score += 15
      factors.push('Aggressive buybacks')
    }

    const dividendGrowthFlag = input.greenFlags.find(f => f.flag.id === 'dividend_growth')
    if (dividendGrowthFlag) {
      score += 10
      factors.push('Growing dividends')
    }

    const sustainableDividendFlag = input.greenFlags.find(f => f.flag.id === 'sustainable_dividends')
    if (sustainableDividendFlag) {
      score += 10
      factors.push('Well-covered dividends')
    }

    // Check for negative factors
    const dilutionFlag = input.redFlags.find(f => f.flag.id === 'dilution_treadmill')
    if (dilutionFlag) {
      score -= 20
      factors.push('Shareholder dilution')
    }

    const unsustainableDividendFlag = input.redFlags.find(f => f.flag.id === 'unsustainable_dividend')
    if (unsustainableDividendFlag) {
      score -= 15
      factors.push('Unsustainable dividend')
    }

    // Check share count trend
    const shareCountTrend = input.trends.find(t => t.metric === 'Shares Outstanding')
    if (shareCountTrend) {
      if (shareCountTrend.direction === 'improving') {
        score += 10
        factors.push('Declining share count')
      } else if (shareCountTrend.direction === 'deteriorating') {
        score -= 10
        factors.push('Share count increasing')
      }
    }

    // Check dividend trend
    const dividendTrend = input.trends.find(t => t.metric === 'Dividends Paid')
    if (dividendTrend) {
      if (dividendTrend.direction === 'improving' && dividendTrend.cagr && dividendTrend.cagr > 5) {
        score += 10
        factors.push('Strong dividend growth')
      } else if (dividendTrend.direction === 'deteriorating') {
        score -= 5
        factors.push('Dividend cuts')
      }
    }

    // Check EPS trend
    const epsTrend = input.trends.find(t => t.metric === 'Earnings Per Share')
    if (epsTrend) {
      if (epsTrend.direction === 'improving') {
        score += 10
        factors.push('Growing EPS')
      } else if (epsTrend.direction === 'deteriorating') {
        score -= 5
        factors.push('Declining EPS')
      }
    }

    // Check for conservative accounting
    const conservativeAccountingFlag = input.greenFlags.find(f => f.flag.id === 'conservative_accounting')
    if (conservativeAccountingFlag) {
      score += 5
      factors.push('Conservative accounting')
    }

    return {
      name: 'shareholder_value',
      score: Math.max(0, Math.min(100, score)),
      weight: this.CATEGORY_WEIGHTS.shareholder_value,
      factors
    }
  }

  /**
   * Calculate letter grade based on score
   */
  private calculateGrade(score: number): HealthScore['grade'] {
    if (score >= 95) return 'A+'
    if (score >= 90) return 'A'
    if (score >= 85) return 'A-'
    if (score >= 80) return 'B+'
    if (score >= 75) return 'B'
    if (score >= 70) return 'B-'
    if (score >= 65) return 'C+'
    if (score >= 60) return 'C'
    if (score >= 55) return 'C-'
    if (score >= 50) return 'D'
    return 'F'
  }

  /**
   * Identify key strengths
   */
  private identifyKeyStrengths(input: ScoringInput): string[] {
    const strengths: string[] = []

    // Check for exceptional green flags
    const exceptionalFlags = input.greenFlags.filter(f => f.flag.strength === 'exceptional')
    exceptionalFlags.slice(0, 3).forEach(flag => {
      strengths.push(flag.flag.title)
    })

    // Check for excellent ratios
    const excellentRatios = input.ratios.filter(r => r.interpretation.score === 'excellent')
    excellentRatios.slice(0, Math.max(0, 3 - strengths.length)).forEach(ratio => {
      strengths.push(`${ratio.name}: ${ratio.value?.toFixed(1)}`)
    })

    // Check for improving trends
    const improvingTrends = input.trends.filter(t => t.direction === 'improving' && t.cagr && t.cagr > 10)
    improvingTrends.slice(0, Math.max(0, 3 - strengths.length)).forEach(trend => {
      strengths.push(`${trend.metric} growing ${trend.cagr.toFixed(1)}% annually`)
    })

    return strengths.slice(0, 3)
  }

  /**
   * Identify key weaknesses
   */
  private identifyKeyWeaknesses(input: ScoringInput): string[] {
    const weaknesses: string[] = []

    // Check for critical red flags
    const criticalFlags = input.redFlags.filter(f => f.flag.severity === 'critical')
    criticalFlags.slice(0, 3).forEach(flag => {
      weaknesses.push(flag.flag.title)
    })

    // Check for high severity red flags
    if (weaknesses.length < 3) {
      const highFlags = input.redFlags.filter(f => f.flag.severity === 'high')
      highFlags.slice(0, 3 - weaknesses.length).forEach(flag => {
        weaknesses.push(flag.flag.title)
      })
    }

    // Check for poor ratios
    if (weaknesses.length < 3) {
      const poorRatios = input.ratios.filter(r => r.interpretation.score === 'poor')
      poorRatios.slice(0, 3 - weaknesses.length).forEach(ratio => {
        weaknesses.push(`Poor ${ratio.name}: ${ratio.value?.toFixed(1)}`)
      })
    }

    // Check for deteriorating trends
    if (weaknesses.length < 3) {
      const deterioratingTrends = input.trends.filter(t => t.direction === 'deteriorating')
      deterioratingTrends.slice(0, 3 - weaknesses.length).forEach(trend => {
        weaknesses.push(`${trend.metric} declining`)
      })
    }

    return weaknesses.slice(0, 3)
  }

  /**
   * Generate summary
   */
  private generateSummary(score: number, grade: string, input: ScoringInput): string {
    const redFlagCount = input.redFlags.length
    const criticalCount = input.redFlags.filter(f => f.flag.severity === 'critical').length
    const greenFlagCount = input.greenFlags.length
    
    if (score >= 80) {
      return `Strong financial health (Grade: ${grade}) with ${greenFlagCount} positive indicators and ${redFlagCount} minor concerns.`
    } else if (score >= 65) {
      return `Moderate financial health (Grade: ${grade}) with ${greenFlagCount} strengths balanced by ${redFlagCount} areas of concern.`
    } else if (score >= 50) {
      return `Weak financial health (Grade: ${grade}) with ${redFlagCount} warning signs${criticalCount > 0 ? ` including ${criticalCount} critical issues` : ''}.`
    } else {
      return `Poor financial health (Grade: ${grade}) with ${redFlagCount} red flags including ${criticalCount} critical problems requiring immediate attention.`
    }
  }

  /**
   * Generate beginner interpretation
   */
  private generateBeginnerInterpretation(score: number, grade: string): string {
    if (score >= 85) {
      return `This is an A-grade company (${grade}) - like a student who excels in all subjects. Very healthy financially with minimal risks.`
    } else if (score >= 75) {
      return `This is a B-grade company (${grade}) - like a good student with mostly strong marks. Solid investment with some minor areas to watch.`
    } else if (score >= 65) {
      return `This is a C-grade company (${grade}) - passing but with clear weaknesses. Okay for experienced investors who understand the risks.`
    } else if (score >= 50) {
      return `This is a D-grade company (${grade}) - barely passing with serious problems. High risk investment requiring careful monitoring.`
    } else {
      return `This is a failing company (${grade}) - like a student failing multiple classes. Very risky investment that could lose significant value.`
    }
  }

  /**
   * Generate actionable insights
   */
  private generateActionableInsights(input: ScoringInput, score: number): string[] {
    const insights: string[] = []

    // Critical issues first
    const criticalFlags = input.redFlags.filter(f => f.flag.severity === 'critical')
    if (criticalFlags.length > 0) {
      insights.push('⚠️ Address critical financial issues immediately - consider avoiding or reducing position')
    }

    // Score-based recommendations
    if (score >= 80) {
      insights.push('✅ Strong candidate for long-term investment - consider dollar-cost averaging')
      
      const buybackFlag = input.greenFlags.find(f => f.flag.id === 'aggressive_buybacks')
      if (buybackFlag) {
        insights.push('💰 Share buybacks increasing per-share value - good for buy-and-hold')
      }
    } else if (score >= 65) {
      insights.push('📊 Monitor quarterly results for improvement in weak areas')
      
      const debtFlag = input.redFlags.find(f => f.flag.category === 'leverage')
      if (debtFlag) {
        insights.push('💳 Watch debt levels and refinancing schedule closely')
      }
    } else {
      insights.push('🔍 Requires deep analysis before investing - consider safer alternatives')
      
      if (score < 50) {
        insights.push('⛔ High risk - only suitable for speculation or turnaround plays')
      }
    }

    // Trend-based insights
    const revenueTrend = input.trends.find(t => t.metric === 'Revenue')
    if (revenueTrend?.direction === 'deteriorating') {
      insights.push('📉 Revenue declining - investigate competitive position and market trends')
    }

    const marginTrends = input.trends.filter(t => t.metric.includes('Margin') && t.direction === 'deteriorating')
    if (marginTrends.length > 0) {
      insights.push('💸 Margins under pressure - monitor pricing power and cost management')
    }

    // Positive insights
    const compoundGrowth = input.greenFlags.find(f => f.flag.id === 'compound_growth_machine')
    if (compoundGrowth) {
      insights.push('🚀 Exceptional growth profile - suitable for growth-focused portfolios')
    }

    const fortressBalance = input.greenFlags.find(f => f.flag.id === 'fortress_balance_sheet')
    if (fortressBalance) {
      insights.push('🏰 Rock-solid balance sheet - excellent downside protection')
    }

    return insights.slice(0, 5)
  }
}
