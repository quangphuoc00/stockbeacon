/**
 * Insight Generator
 * Generates actionable recommendations based on analysis
 */

import { FinancialStatements } from '@/types/stock'
import {
  HealthScore,
  RedFlagWithConfidence,
  GreenFlagWithConfidence,
  TrendAnalysis,
  Recommendation
} from '../types/interpreter-types'

interface InsightInput {
  healthScore: HealthScore
  redFlags: RedFlagWithConfidence[]
  greenFlags: GreenFlagWithConfidence[]
  trends: TrendAnalysis[]
  financialStatements: FinancialStatements
}

export class InsightGenerator {
  /**
   * Generate actionable recommendations
   */
  generateRecommendations(input: InsightInput): Recommendation[] {
    const recommendations: Recommendation[] = []

    // Add critical recommendations first
    this.addCriticalRecommendations(input, recommendations)

    // Add risk management recommendations
    this.addRiskRecommendations(input, recommendations)

    // Add opportunity recommendations
    this.addOpportunityRecommendations(input, recommendations)

    // Add monitoring recommendations
    this.addMonitoringRecommendations(input, recommendations)

    // Sort by priority and limit to most important
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    return recommendations.slice(0, 8)
  }

  /**
   * Add critical recommendations for immediate issues
   */
  private addCriticalRecommendations(input: InsightInput, recommendations: Recommendation[]): void {
    const { redFlags, healthScore } = input

    // Check for insolvency risk
    const insolvencyFlag = redFlags.find(f => f.flag.id === 'insolvency_risk')
    if (insolvencyFlag) {
      recommendations.push({
        type: 'action',
        priority: 'high',
        title: 'Critical: Insolvency Risk',
        description: 'Company has negative equity - liabilities exceed assets.',
        rationale: 'This indicates severe financial distress and potential bankruptcy risk.',
        timeframe: 'Immediate'
      })
    }

    // Check for liquidity crisis
    const liquidityFlag = redFlags.find(f => f.flag.id === 'liquidity_crisis')
    if (liquidityFlag) {
      recommendations.push({
        type: 'action',
        priority: 'high',
        title: 'Urgent: Liquidity Crisis',
        description: 'Company cannot meet short-term obligations without external financing.',
        rationale: 'May need to sell assets or raise emergency funding to avoid default.',
        timeframe: 'Next 3-6 months'
      })
    }

    // Check for cash burn with leverage
    const cashBurnFlag = redFlags.find(f => f.flag.id === 'cash_burn_leveraged')
    if (cashBurnFlag) {
      recommendations.push({
        type: 'action',
        priority: 'high',
        title: 'High Risk: Cash Burn + High Debt',
        description: 'Company is losing money while carrying significant debt.',
        rationale: 'Limited runway before requiring refinancing or restructuring.',
        timeframe: 'Monitor monthly'
      })
    }

    // General poor health recommendation
    if (healthScore.overall < 50 && recommendations.length === 0) {
      recommendations.push({
        type: 'action',
        priority: 'high',
        title: 'Poor Financial Health',
        description: 'Multiple red flags indicate significant financial weakness.',
        rationale: 'High risk of value destruction - consider exiting or avoiding position.',
        timeframe: 'Immediate review'
      })
    }
  }

  /**
   * Add risk management recommendations
   */
  private addRiskRecommendations(input: InsightInput, recommendations: Recommendation[]): void {
    const { redFlags, trends } = input

    // Debt service concerns
    const debtServiceFlag = redFlags.find(f => f.flag.id === 'unsustainable_debt_service')
    if (debtServiceFlag) {
      recommendations.push({
        type: 'monitor',
        priority: 'high',
        title: 'Monitor Debt Refinancing',
        description: 'Track upcoming debt maturities and refinancing options.',
        rationale: 'Current cash flow insufficient to service debt - refinancing critical.',
        timeframe: 'Quarterly'
      })
    }

    // Margin compression
    const marginFlags = redFlags.filter(f => 
      f.flag.id === 'gross_margin_compression' || f.flag.id === 'margin_compression_trend'
    )
    const marginTrends = trends.filter(t => 
      t.metric.includes('Margin') && t.direction === 'deteriorating'
    )

    if (marginFlags.length > 0 || marginTrends.length > 0) {
      recommendations.push({
        type: 'investigate',
        priority: 'medium',
        title: 'Investigate Margin Pressure',
        description: 'Analyze competitive dynamics and cost structure.',
        rationale: 'Declining margins indicate pricing pressure or rising costs.',
        timeframe: 'Next earnings call'
      })
    }

    // Working capital issues
    const workingCapitalFlags = redFlags.filter(f => 
      f.flag.id === 'receivables_quality_issue' || f.flag.id === 'inventory_buildup'
    )

    if (workingCapitalFlags.length > 0) {
      recommendations.push({
        type: 'monitor',
        priority: 'medium',
        title: 'Track Working Capital',
        description: 'Monitor cash conversion cycle and collection periods.',
        rationale: 'Working capital deterioration can lead to liquidity issues.',
        timeframe: 'Monthly'
      })
    }

    // Dividend sustainability
    const dividendFlag = redFlags.find(f => f.flag.id === 'unsustainable_dividend')
    if (dividendFlag) {
      recommendations.push({
        type: 'action',
        priority: 'medium',
        title: 'Expect Dividend Cut',
        description: 'Dividend exceeds free cash flow - cut likely.',
        rationale: 'Company borrowing to pay dividends is unsustainable.',
        timeframe: 'Next 1-2 quarters'
      })
    }

    // Revenue decline
    const revenueTrend = trends.find(t => t.metric === 'Revenue' && t.direction === 'deteriorating')
    if (revenueTrend) {
      recommendations.push({
        type: 'investigate',
        priority: 'medium',
        title: 'Analyze Revenue Decline',
        description: 'Understand whether decline is cyclical or structural.',
        rationale: 'Falling revenue often precedes broader financial issues.',
        timeframe: 'Immediate'
      })
    }
  }

  /**
   * Add opportunity recommendations
   */
  private addOpportunityRecommendations(input: InsightInput, recommendations: Recommendation[]): void {
    const { greenFlags, healthScore, trends } = input

    // Strong financial health opportunities
    if (healthScore.overall >= 80) {
      recommendations.push({
        type: 'action',
        priority: 'medium',
        title: 'Strong Buy Candidate',
        description: 'Excellent financial health with multiple competitive advantages.',
        rationale: 'High-quality companies often outperform over long term.',
        timeframe: 'Consider for core holding'
      })
    }

    // Compound growth opportunity
    const growthFlag = greenFlags.find(f => f.flag.id === 'compound_growth_machine')
    if (growthFlag) {
      recommendations.push({
        type: 'action',
        priority: 'medium',
        title: 'Growth Investment Opportunity',
        description: 'Revenue, earnings, and cash flow all growing >10% annually.',
        rationale: 'Compound growth creates significant long-term value.',
        timeframe: 'Long-term hold (3-5 years)'
      })
    }

    // Capital efficiency opportunity
    const capitalLightFlag = greenFlags.find(f => f.flag.id === 'capital_light_growth')
    const roicFlag = greenFlags.find(f => f.flag.id === 'superior_roic')
    
    if (capitalLightFlag || roicFlag) {
      recommendations.push({
        type: 'action',
        priority: 'low',
        title: 'Efficient Capital Allocator',
        description: 'Company generates high returns with minimal capital needs.',
        rationale: 'Capital efficiency enables faster growth and higher returns.',
        timeframe: 'Accumulate on dips'
      })
    }

    // Shareholder returns opportunity
    const buybackFlag = greenFlags.find(f => f.flag.id === 'aggressive_buybacks')
    const dividendGrowthFlag = greenFlags.find(f => f.flag.id === 'dividend_growth')
    
    if (buybackFlag || dividendGrowthFlag) {
      recommendations.push({
        type: 'action',
        priority: 'low',
        title: 'Shareholder-Friendly Management',
        description: 'Consistent capital returns through buybacks and/or dividends.',
        rationale: 'Direct value creation for shareholders.',
        timeframe: 'Hold for income/appreciation'
      })
    }

    // Improving trends opportunity
    const improvingMargins = trends.filter(t => 
      t.metric.includes('Margin') && t.direction === 'improving'
    )
    if (improvingMargins.length > 0) {
      recommendations.push({
        type: 'monitor',
        priority: 'low',
        title: 'Margin Expansion Story',
        description: 'Profitability improving - operational leverage kicking in.',
        rationale: 'Margin expansion often leads to multiple expansion.',
        timeframe: 'Track quarterly progress'
      })
    }
  }

  /**
   * Add monitoring recommendations
   */
  private addMonitoringRecommendations(input: InsightInput, recommendations: Recommendation[]): void {
    const { healthScore, trends, redFlags, greenFlags } = input

    // General monitoring for moderate health
    if (healthScore.overall >= 60 && healthScore.overall < 75) {
      recommendations.push({
        type: 'monitor',
        priority: 'medium',
        title: 'Regular Monitoring Required',
        description: 'Company has both strengths and weaknesses to track.',
        rationale: 'Mixed signals require ongoing assessment.',
        timeframe: 'Quarterly reviews'
      })
    }

    // Cash flow monitoring
    const cashFlowQuality = greenFlags.find(f => f.flag.id === 'superior_cash_generation')
    const poorEarningsQuality = redFlags.find(f => f.flag.id === 'poor_earnings_quality')
    
    if (!cashFlowQuality && !poorEarningsQuality) {
      recommendations.push({
        type: 'monitor',
        priority: 'low',
        title: 'Track Cash Flow Quality',
        description: 'Monitor operating cash flow vs net income ratio.',
        rationale: 'Cash flow quality indicates earnings sustainability.',
        timeframe: 'Each earnings report'
      })
    }

    // Debt monitoring
    const debtTrend = trends.find(t => t.metric === 'Debt-to-Equity Ratio')
    if (debtTrend && debtTrend.direction === 'deteriorating') {
      recommendations.push({
        type: 'monitor',
        priority: 'medium',
        title: 'Watch Leverage Levels',
        description: 'Debt increasing - monitor covenant compliance.',
        rationale: 'Rising leverage reduces financial flexibility.',
        timeframe: 'Quarterly'
      })
    }

    // Competition monitoring
    if (healthScore.categories.find(c => c.name === 'growth')?.score < 60) {
      recommendations.push({
        type: 'investigate',
        priority: 'low',
        title: 'Assess Competitive Position',
        description: 'Compare growth rates with industry peers.',
        rationale: 'Lagging growth may indicate market share loss.',
        timeframe: 'Annual review'
      })
    }

    // Valuation monitoring for strong companies
    if (healthScore.overall >= 75) {
      recommendations.push({
        type: 'monitor',
        priority: 'low',
        title: 'Track Valuation Levels',
        description: 'Monitor price relative to intrinsic value.',
        rationale: 'Even great companies can become overvalued.',
        timeframe: 'Monthly'
      })
    }
  }
}
