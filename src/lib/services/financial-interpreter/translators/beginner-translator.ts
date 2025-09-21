/**
 * Beginner Translator
 * Converts financial analysis into plain English
 */

import { 
  HealthScore,
  RedFlagWithConfidence,
  GreenFlagWithConfidence,
  FinancialRatio,
  TrendAnalysis,
  BeginnerSummary
} from '../types/interpreter-types'

interface TranslatorInput {
  healthScore: HealthScore
  redFlags: RedFlagWithConfidence[]
  greenFlags: GreenFlagWithConfidence[]
  ratios: FinancialRatio[]
  trends: TrendAnalysis[]
}

export class BeginnerTranslator {
  /**
   * Generate beginner-friendly summary
   */
  generateSummary(input: TranslatorInput): BeginnerSummary {
    // Generate one-line summary
    const oneLineSummary = this.generateOneLineSummary(input.healthScore)
    
    // Generate health description
    const healthDescription = this.generateHealthDescription(input)
    
    // Get top strengths and concerns
    const topThreeStrengths = this.getTopStrengths(input)
    const topThreeConcerns = this.getTopConcerns(input)
    
    // Determine simple rating
    const simpleRating = this.getSimpleRating(input.healthScore.overall)
    
    // Determine investment suitability
    const investmentSuitability = this.determineInvestmentSuitability(input)

    return {
      oneLineSummary,
      healthDescription,
      topThreeStrengths,
      topThreeConcerns,
      simpleRating,
      investmentSuitability
    }
  }

  /**
   * Generate one-line summary based on health score
   */
  private generateOneLineSummary(healthScore: HealthScore): string {
    const score = healthScore.overall
    const grade = healthScore.grade

    if (score >= 90) {
      return `Exceptional company (${grade}) - Like finding a star athlete in peak condition.`
    } else if (score >= 80) {
      return `Very healthy company (${grade}) - Like a well-maintained car that runs smoothly.`
    } else if (score >= 70) {
      return `Good company with minor issues (${grade}) - Like a solid house that needs some repairs.`
    } else if (score >= 60) {
      return `Average company with notable weaknesses (${grade}) - Like a car that runs but needs work.`
    } else if (score >= 50) {
      return `Struggling company (${grade}) - Like a business barely staying afloat.`
    } else {
      return `Company in serious trouble (${grade}) - Like a sinking ship that needs rescue.`
    }
  }

  /**
   * Generate detailed health description
   */
  private generateHealthDescription(input: TranslatorInput): string {
    const { healthScore, redFlags, greenFlags } = input
    
    // Count flags by severity/strength
    const criticalIssues = redFlags.filter(f => f.flag.severity === 'critical').length
    const majorIssues = redFlags.filter(f => f.flag.severity === 'high').length
    const exceptionalStrengths = greenFlags.filter(f => f.flag.strength === 'exceptional').length
    const strongPoints = greenFlags.filter(f => f.flag.strength === 'strong').length

    let description = ''

    // Start with overall assessment
    if (healthScore.overall >= 80) {
      description = 'This company is financially strong and well-managed. '
    } else if (healthScore.overall >= 65) {
      description = 'This company has solid fundamentals but some areas need attention. '
    } else if (healthScore.overall >= 50) {
      description = 'This company faces significant challenges that create investment risk. '
    } else {
      description = 'This company is in poor financial health with serious problems. '
    }

    // Add specific details
    if (criticalIssues > 0) {
      description += `There ${criticalIssues === 1 ? 'is' : 'are'} ${criticalIssues} critical issue${criticalIssues > 1 ? 's' : ''} requiring immediate attention. `
    }

    if (exceptionalStrengths > 0) {
      description += `The company excels in ${exceptionalStrengths} key area${exceptionalStrengths > 1 ? 's' : ''}, showing competitive advantages. `
    }

    // Add category-specific insights
    const bestCategory = healthScore.categories.reduce((a, b) => 
      (a.score * a.weight) > (b.score * b.weight) ? a : b
    )
    const worstCategory = healthScore.categories.reduce((a, b) => 
      (a.score * a.weight) < (b.score * b.weight) ? a : b
    )

    if (bestCategory.score >= 80) {
      description += `${this.getCategoryDescription(bestCategory.name)} is particularly strong. `
    }

    if (worstCategory.score < 50) {
      description += `${this.getCategoryDescription(worstCategory.name)} needs significant improvement. `
    }

    return description.trim()
  }

  /**
   * Get top strengths in plain English
   */
  private getTopStrengths(input: TranslatorInput): string[] {
    const strengths: string[] = []

    // Add exceptional green flags first
    const exceptionalFlags = input.greenFlags
      .filter(f => f.flag.strength === 'exceptional')
      .slice(0, 3)

    exceptionalFlags.forEach(flag => {
      strengths.push(this.translateGreenFlag(flag.flag))
    })

    // Add excellent ratios if space
    if (strengths.length < 3) {
      const excellentRatios = input.ratios
        .filter(r => r.interpretation.score === 'excellent' && r.value !== null)
        .slice(0, 3 - strengths.length)

      excellentRatios.forEach(ratio => {
        strengths.push(this.translateExcellentRatio(ratio))
      })
    }

    // Add positive trends if space
    if (strengths.length < 3) {
      const positiveTrends = input.trends
        .filter(t => t.direction === 'improving' && t.cagr && t.cagr > 10)
        .slice(0, 3 - strengths.length)

      positiveTrends.forEach(trend => {
        strengths.push(this.translatePositiveTrend(trend))
      })
    }

    return strengths
  }

  /**
   * Get top concerns in plain English
   */
  private getTopConcerns(input: TranslatorInput): string[] {
    const concerns: string[] = []

    // Add critical red flags first
    const criticalFlags = input.redFlags
      .filter(f => f.flag.severity === 'critical')
      .slice(0, 3)

    criticalFlags.forEach(flag => {
      concerns.push(this.translateRedFlag(flag.flag))
    })

    // Add high severity flags if space
    if (concerns.length < 3) {
      const highFlags = input.redFlags
        .filter(f => f.flag.severity === 'high')
        .slice(0, 3 - concerns.length)

      highFlags.forEach(flag => {
        concerns.push(this.translateRedFlag(flag.flag))
      })
    }

    // Add poor ratios if space
    if (concerns.length < 3) {
      const poorRatios = input.ratios
        .filter(r => r.interpretation.score === 'poor' && r.value !== null)
        .slice(0, 3 - concerns.length)

      poorRatios.forEach(ratio => {
        concerns.push(this.translatePoorRatio(ratio))
      })
    }

    // If no major concerns, add minor ones
    if (concerns.length === 0) {
      concerns.push('No major financial concerns identified')
    }

    return concerns
  }

  /**
   * Get simple rating with emoji
   */
  private getSimpleRating(score: number): BeginnerSummary['simpleRating'] {
    if (score >= 80) return '🟢 Excellent'
    if (score >= 70) return '🟢 Good'
    if (score >= 55) return '🟡 Fair'
    return '🔴 Poor'
  }

  /**
   * Determine investment suitability
   */
  private determineInvestmentSuitability(input: TranslatorInput): BeginnerSummary['investmentSuitability'] {
    const { healthScore, redFlags, greenFlags, trends } = input

    // Conservative suitability
    const hasStrongBalance = greenFlags.some(f => f.flag.id === 'fortress_balance_sheet')
    const hasStableDividends = greenFlags.some(f => f.flag.id === 'sustainable_dividends')
    const hasCriticalIssues = redFlags.some(f => f.flag.severity === 'critical')
    const hasStableMargins = trends.some(t => 
      t.metric.includes('Margin') && (t.direction === 'stable' || t.direction === 'improving')
    )

    const conservative = healthScore.overall >= 70 && 
      !hasCriticalIssues && 
      (hasStrongBalance || hasStableDividends || hasStableMargins)

    // Growth suitability
    const hasGrowth = greenFlags.some(f => 
      f.flag.id === 'compound_growth_machine' || f.flag.id === 'operating_leverage'
    )
    const hasGrowthTrends = trends.some(t => 
      (t.metric === 'Revenue' || t.metric === 'Net Income') && 
      t.direction === 'improving' && 
      t.cagr && t.cagr > 10
    )

    const growth = healthScore.overall >= 65 && (hasGrowth || hasGrowthTrends)

    // Value suitability
    const hasStrongReturns = greenFlags.some(f => 
      f.flag.id === 'exceptional_roe' || f.flag.id === 'superior_roic'
    )
    const hasCashGeneration = greenFlags.some(f => 
      f.flag.id === 'superior_cash_generation' || f.flag.id === 'high_fcf_margin'
    )

    const value = healthScore.overall >= 60 && 
      (hasStrongReturns || hasCashGeneration) &&
      !hasCriticalIssues

    // Income suitability
    const hasDividends = greenFlags.some(f => 
      f.flag.id === 'dividend_growth' || f.flag.id === 'sustainable_dividends'
    )
    const hasDividendTrend = trends.some(t => 
      t.metric === 'Dividends Paid' && t.direction === 'improving'
    )

    const income = healthScore.overall >= 65 && 
      (hasDividends || hasDividendTrend) &&
      !redFlags.some(f => f.flag.id === 'unsustainable_dividend')

    return { conservative, growth, value, income }
  }

  /**
   * Translate green flag to plain English
   */
  private translateGreenFlag(flag: GreenFlag): string {
    const translations: Record<string, string> = {
      'superior_cash_generation': 'Turns profits into real cash very efficiently',
      'compound_growth_machine': 'Growing rapidly year after year like a snowball',
      'capital_light_growth': 'Grows without needing heavy investment',
      'fortress_balance_sheet': 'Has more cash than debt - very safe',
      'strong_pricing_power': 'Can raise prices without losing customers',
      'aggressive_buybacks': 'Buying back shares to increase value',
      'operating_leverage': 'Profits growing faster than sales',
      'exceptional_roe': 'Generates exceptional returns for shareholders',
      'superior_roic': 'Makes excellent use of invested money',
      'conservative_accounting': 'Reports honest, reliable numbers',
      'dividend_growth': 'Increases dividend payments every year'
    }

    return translations[flag.id] || flag.beginnerExplanation
  }

  /**
   * Translate red flag to plain English
   */
  private translateRedFlag(flag: RedFlag): string {
    const translations: Record<string, string> = {
      'insolvency_risk': 'Owes more than it owns - bankruptcy risk',
      'liquidity_crisis': "Can't pay bills coming due soon",
      'cash_burn_leveraged': 'Losing money while deep in debt',
      'unsustainable_debt_service': 'Struggling to pay debt obligations',
      'negative_gross_margin': "Can't sell products for profit",
      'gross_margin_compression': 'Profit margins shrinking rapidly',
      'receivables_quality_issue': 'Customers not paying on time',
      'inventory_buildup': 'Products not selling, piling up',
      'poor_earnings_quality': 'Profits not backed by real cash',
      'dilution_treadmill': 'Issuing shares, diluting ownership',
      'margin_compression_trend': 'Becoming less profitable over time',
      'unsustainable_dividend': 'Paying dividends it cannot afford',
      'rising_capital_intensity': 'Needs more spending to maintain business'
    }

    return translations[flag.id] || flag.beginnerExplanation
  }

  /**
   * Translate excellent ratio to plain English
   */
  private translateExcellentRatio(ratio: FinancialRatio): string {
    const value = ratio.value?.toFixed(1) || 'N/A'
    
    const translations: Record<string, string> = {
      'current_ratio': `Strong liquidity with ${value}x coverage of short-term bills`,
      'roe': `Excellent ${value}% return for shareholders`,
      'roa': `Very efficient with ${value}% return on assets`,
      'net_margin': `Keeps ${value}% of revenue as profit - very profitable`,
      'fcf_margin': `Converts ${value}% of sales to free cash - exceptional`,
      'debt_to_equity': `Very low debt at ${value}x equity - conservative`,
      'interest_coverage': `Earns ${value}x interest payments - very safe`
    }

    return translations[ratio.id] || `Strong ${ratio.name}: ${value}`
  }

  /**
   * Translate poor ratio to plain English
   */
  private translatePoorRatio(ratio: FinancialRatio): string {
    const value = ratio.value?.toFixed(1) || 'N/A'
    
    const translations: Record<string, string> = {
      'current_ratio': `Weak liquidity - only ${value}x coverage of bills`,
      'roe': `Poor ${value}% return for shareholders`,
      'roa': `Inefficient with only ${value}% return on assets`,
      'net_margin': `Only ${value}% profit margin - very thin`,
      'fcf_margin': `Poor cash conversion at ${value}%`,
      'debt_to_equity': `High debt at ${value}x equity - risky`,
      'interest_coverage': `Only ${value}x interest coverage - dangerous`
    }

    return translations[ratio.id] || `Weak ${ratio.name}: ${value}`
  }

  /**
   * Translate positive trend to plain English
   */
  private translatePositiveTrend(trend: TrendAnalysis): string {
    const growth = trend.cagr?.toFixed(1) || 'N/A'
    
    const translations: Record<string, string> = {
      'Revenue': `Sales growing ${growth}% per year`,
      'Net Income': `Profits growing ${growth}% annually`,
      'Free Cash Flow': `Cash generation improving ${growth}% yearly`,
      'Gross Margin %': 'Profit margins expanding',
      'Operating Margin %': 'Operating efficiency improving',
      'Return on Equity %': 'Shareholder returns increasing'
    }

    return translations[trend.metric] || `${trend.metric} improving strongly`
  }

  /**
   * Get category description
   */
  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'profitability': 'Profit generation',
      'growth': 'Business growth',
      'financial_stability': 'Financial safety',
      'efficiency': 'Operational efficiency',
      'shareholder_value': 'Shareholder returns'
    }

    return descriptions[category] || category
  }
}
