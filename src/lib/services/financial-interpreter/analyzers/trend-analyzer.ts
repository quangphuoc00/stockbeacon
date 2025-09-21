/**
 * Trend Analyzer
 * Analyzes multi-year financial trends with visual indicators
 */

import { FinancialStatements, IncomeStatementData, BalanceSheetData, CashFlowStatementData } from '@/types/stock'
import { TrendAnalysis, TrendPeriod } from '../types/interpreter-types'

export class TrendAnalyzer {
  /**
   * Analyze financial trends across multiple periods
   */
  async analyze(financialStatements: FinancialStatements): Promise<TrendAnalysis[]> {
    const trends: TrendAnalysis[] = []
    
    // Analyze various trends
    this.analyzeRevenueTrend(financialStatements.incomeStatements.annual, trends)
    this.analyzeEarningsTrend(financialStatements.incomeStatements.annual, trends)
    this.analyzeCashFlowTrend(financialStatements.cashFlowStatements.annual, trends)
    this.analyzeMarginTrends(financialStatements.incomeStatements.annual, trends)
    this.analyzeDebtTrend(financialStatements.balanceSheets.annual, trends)
    this.analyzeEfficiencyTrends(financialStatements, trends)
    this.analyzeShareholderValueTrends(financialStatements, trends)

    return trends
  }

  /**
   * Analyze revenue growth trend
   */
  private analyzeRevenueTrend(incomeStatements: IncomeStatementData[], trends: TrendAnalysis[]): void {
    const revenueData = this.extractMetricData(incomeStatements, 'revenue')
    if (revenueData.length < 2) return

    const analysis = this.performTrendAnalysis(revenueData, 'Revenue')
    
    trends.push({
      ...analysis,
      beginnerInsight: this.getRevenueInsight(analysis)
    })
  }

  /**
   * Analyze earnings trend
   */
  private analyzeEarningsTrend(incomeStatements: IncomeStatementData[], trends: TrendAnalysis[]): void {
    const earningsData = this.extractMetricData(incomeStatements, 'netIncome')
    if (earningsData.length < 2) return

    const analysis = this.performTrendAnalysis(earningsData, 'Net Income')
    
    trends.push({
      ...analysis,
      beginnerInsight: this.getEarningsInsight(analysis)
    })

    // Also analyze EPS trend
    const epsData = incomeStatements
      .filter(stmt => stmt.epsDiluted !== null && stmt.epsDiluted !== undefined)
      .map(stmt => ({
        date: typeof stmt.date === 'string' ? stmt.date : stmt.date.toISOString(),
        value: stmt.epsDiluted!
      }))
      .reverse()

    if (epsData.length >= 2) {
      const epsAnalysis = this.performTrendAnalysis(epsData, 'Earnings Per Share')
      trends.push({
        ...epsAnalysis,
        beginnerInsight: this.getEPSInsight(epsAnalysis)
      })
    }
  }

  /**
   * Analyze cash flow trends
   */
  private analyzeCashFlowTrend(cashFlowStatements: CashFlowStatementData[], trends: TrendAnalysis[]): void {
    // Operating Cash Flow
    const ocfData = this.extractCFMetricData(cashFlowStatements, 'operatingCashFlow')
    if (ocfData.length >= 2) {
      const analysis = this.performTrendAnalysis(ocfData, 'Operating Cash Flow')
      trends.push({
        ...analysis,
        beginnerInsight: this.getCashFlowInsight(analysis, 'operating')
      })
    }

    // Free Cash Flow
    const fcfData = cashFlowStatements
      .filter(cf => cf.operatingCashFlow !== null && cf.capitalExpenditures !== null)
      .map(cf => ({
        date: typeof cf.date === 'string' ? cf.date : cf.date.toISOString(),
        value: (cf.freeCashFlow || (cf.operatingCashFlow! - Math.abs(cf.capitalExpenditures!)))
      }))
      .reverse()

    if (fcfData.length >= 2) {
      const analysis = this.performTrendAnalysis(fcfData, 'Free Cash Flow')
      trends.push({
        ...analysis,
        beginnerInsight: this.getCashFlowInsight(analysis, 'free')
      })
    }
  }

  /**
   * Analyze margin trends
   */
  private analyzeMarginTrends(incomeStatements: IncomeStatementData[], trends: TrendAnalysis[]): void {
    // Gross Margin
    const grossMarginData = incomeStatements
      .filter(stmt => stmt.revenue && stmt.grossProfit !== null)
      .map(stmt => ({
        date: stmt.date,
        value: (stmt.grossProfit! / stmt.revenue!) * 100
      }))
      .reverse()

    if (grossMarginData.length >= 2) {
      const analysis = this.performTrendAnalysis(grossMarginData, 'Gross Margin %', true)
      trends.push({
        ...analysis,
        beginnerInsight: this.getMarginInsight(analysis, 'gross')
      })
    }

    // Operating Margin
    const opMarginData = incomeStatements
      .filter(stmt => stmt.revenue && stmt.operatingIncome)
      .map(stmt => ({
        date: stmt.date,
        value: (stmt.operatingIncome! / stmt.revenue!) * 100
      }))
      .reverse()

    if (opMarginData.length >= 2) {
      const analysis = this.performTrendAnalysis(opMarginData, 'Operating Margin %', true)
      trends.push({
        ...analysis,
        beginnerInsight: this.getMarginInsight(analysis, 'operating')
      })
    }

    // Net Margin
    const netMarginData = incomeStatements
      .filter(stmt => stmt.revenue && stmt.netIncome)
      .map(stmt => ({
        date: stmt.date,
        value: (stmt.netIncome! / stmt.revenue!) * 100
      }))
      .reverse()

    if (netMarginData.length >= 2) {
      const analysis = this.performTrendAnalysis(netMarginData, 'Net Margin %', true)
      trends.push({
        ...analysis,
        beginnerInsight: this.getMarginInsight(analysis, 'net')
      })
    }
  }

  /**
   * Analyze debt trends
   */
  private analyzeDebtTrend(balanceSheets: BalanceSheetData[], trends: TrendAnalysis[]): void {
    // Total Debt
    const debtData = balanceSheets
      .map(bs => ({
        date: bs.date,
        value: (bs.shortTermDebt || 0) + (bs.longTermDebt || 0)
      }))
      .reverse()

    if (debtData.length >= 2) {
      const analysis = this.performTrendAnalysis(debtData, 'Total Debt')
      trends.push({
        ...analysis,
        beginnerInsight: this.getDebtInsight(analysis)
      })
    }

    // Debt to Equity Ratio
    const debtToEquityData = balanceSheets
      .filter(bs => bs.totalShareholderEquity && bs.totalShareholderEquity > 0)
      .map(bs => ({
        date: bs.date,
        value: ((bs.shortTermDebt || 0) + (bs.longTermDebt || 0)) / bs.totalShareholderEquity!
      }))
      .reverse()

    if (debtToEquityData.length >= 2) {
      const analysis = this.performTrendAnalysis(debtToEquityData, 'Debt-to-Equity Ratio', true)
      trends.push({
        ...analysis,
        beginnerInsight: this.getDebtRatioInsight(analysis)
      })
    }
  }

  /**
   * Analyze efficiency trends
   */
  private analyzeEfficiencyTrends(financialStatements: FinancialStatements, trends: TrendAnalysis[]): void {
    const incomeStatements = financialStatements.incomeStatements.annual
    const balanceSheets = financialStatements.balanceSheets.annual

    // ROE Trend
    const roeData: TrendPeriod[] = []
    for (let i = 0; i < Math.min(incomeStatements.length, balanceSheets.length); i++) {
      const income = incomeStatements[i]
      const balance = balanceSheets[i]
      
      if (income.netIncome && balance.totalShareholderEquity && balance.totalShareholderEquity > 0) {
        roeData.unshift({
          date: income.date,
          value: (income.netIncome / balance.totalShareholderEquity) * 100
        })
      }
    }

    if (roeData.length >= 2) {
      const analysis = this.performTrendAnalysis(roeData, 'Return on Equity %', true)
      trends.push({
        ...analysis,
        beginnerInsight: this.getROEInsight(analysis)
      })
    }

    // Asset Turnover Trend
    const assetTurnoverData: TrendPeriod[] = []
    for (let i = 0; i < Math.min(incomeStatements.length, balanceSheets.length - 1); i++) {
      const income = incomeStatements[i]
      const currentBalance = balanceSheets[i]
      const previousBalance = balanceSheets[i + 1]
      
      if (income.revenue && currentBalance.totalAssets && previousBalance.totalAssets) {
        const avgAssets = (currentBalance.totalAssets + previousBalance.totalAssets) / 2
        assetTurnoverData.unshift({
          date: income.date,
          value: income.revenue / avgAssets
        })
      }
    }

    if (assetTurnoverData.length >= 2) {
      const analysis = this.performTrendAnalysis(assetTurnoverData, 'Asset Turnover', true)
      trends.push({
        ...analysis,
        beginnerInsight: this.getAssetTurnoverInsight(analysis)
      })
    }
  }

  /**
   * Analyze shareholder value trends
   */
  private analyzeShareholderValueTrends(financialStatements: FinancialStatements, trends: TrendAnalysis[]): void {
    const balanceSheets = financialStatements.balanceSheets.annual
    const cashFlows = financialStatements.cashFlowStatements.annual

    // Share Count Trend
    const shareData = balanceSheets
      .filter(bs => bs.sharesOutstanding)
      .map(bs => ({
        date: bs.date,
        value: bs.sharesOutstanding!
      }))
      .reverse()

    if (shareData.length >= 2) {
      const analysis = this.performTrendAnalysis(shareData, 'Shares Outstanding')
      trends.push({
        ...analysis,
        beginnerInsight: this.getShareCountInsight(analysis)
      })
    }

    // Dividend Trend
    const dividendData = cashFlows
      .filter(cf => cf.dividendsPaid && cf.dividendsPaid < 0)
      .map(cf => ({
        date: cf.date,
        value: Math.abs(cf.dividendsPaid!)
      }))
      .reverse()

    if (dividendData.length >= 2) {
      const analysis = this.performTrendAnalysis(dividendData, 'Dividends Paid')
      trends.push({
        ...analysis,
        beginnerInsight: this.getDividendInsight(analysis)
      })
    }
  }

  /**
   * Perform trend analysis on time series data
   */
  private performTrendAnalysis(
    data: TrendPeriod[], 
    metricName: string,
    isPercentage: boolean = false
  ): Omit<TrendAnalysis, 'beginnerInsight'> {
    // Calculate year-over-year changes
    const periods = data.map((period, index) => {
      if (index === 0) return period
      
      const previousValue = data[index - 1].value
      const percentageChange = previousValue !== 0 ? 
        ((period.value - previousValue) / Math.abs(previousValue)) * 100 : 0
      
      return {
        ...period,
        percentageChange
      }
    })

    // Calculate CAGR if we have 5+ years for more reliable trends
    let cagr: number | undefined
    if (data.length >= 5) {
      const years = data.length - 1
      const startValue = data[0].value
      const endValue = data[data.length - 1].value
      
      if (startValue > 0 && endValue > 0) {
        cagr = (Math.pow(endValue / startValue, 1 / years) - 1) * 100
      }
    } else if (data.length >= 3) {
      // Fallback to 3+ years if less data available, but note it's less reliable
      const years = data.length - 1
      const startValue = data[0].value
      const endValue = data[data.length - 1].value
      
      if (startValue > 0 && endValue > 0) {
        cagr = (Math.pow(endValue / startValue, 1 / years) - 1) * 100
      }
    }

    // Calculate volatility (standard deviation of % changes)
    const changes = periods.slice(1).map(p => p.percentageChange || 0)
    const avgChange = changes.length > 0 ? 
      changes.reduce((a, b) => a + b, 0) / changes.length : 0
    const volatility = changes.length > 0 ?
      Math.sqrt(changes.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / changes.length) : 0

    // Determine direction
    const direction = this.determineDirection(periods, volatility)
    const visualIndicator = this.getVisualIndicator(direction)

    return {
      metric: metricName,
      periods,
      direction,
      cagr,
      volatility,
      visualIndicator
    }
  }

  /**
   * Determine trend direction
   */
  private determineDirection(
    periods: TrendPeriod[], 
    volatility: number
  ): 'improving' | 'stable' | 'deteriorating' | 'volatile' {
    if (volatility > 50) return 'volatile'
    
    if (periods.length < 2) return 'stable'
    
    // Check if consistently improving or deteriorating
    const changes = periods.slice(1).map(p => p.percentageChange || 0)
    const positiveCount = changes.filter(c => c > 5).length
    const negativeCount = changes.filter(c => c < -5).length
    
    if (positiveCount >= changes.length * 0.7) return 'improving'
    if (negativeCount >= changes.length * 0.7) return 'deteriorating'
    
    // Check overall trend
    const firstValue = periods[0].value
    const lastValue = periods[periods.length - 1].value
    const overallChange = ((lastValue - firstValue) / Math.abs(firstValue)) * 100
    
    if (overallChange > 10) return 'improving'
    if (overallChange < -10) return 'deteriorating'
    
    return 'stable'
  }

  /**
   * Get visual indicator for trend
   */
  private getVisualIndicator(direction: string): '📈' | '📊' | '📉' | '🎢' {
    switch (direction) {
      case 'improving': return '📈'
      case 'stable': return '📊'
      case 'deteriorating': return '📉'
      case 'volatile': return '🎢'
      default: return '📊'
    }
  }

  /**
   * Extract metric data from income statements
   */
  private extractMetricData(
    statements: IncomeStatementData[], 
    metric: keyof IncomeStatementData
  ): TrendPeriod[] {
    return statements
      .filter(stmt => stmt[metric] !== null && stmt[metric] !== undefined)
      .map(stmt => ({
        date: typeof stmt.date === 'string' ? stmt.date : stmt.date.toISOString(),
        value: stmt[metric] as number
      }))
      .reverse()
  }

  /**
   * Extract metric data from cash flow statements
   */
  private extractCFMetricData(
    statements: CashFlowStatementData[], 
    metric: keyof CashFlowStatementData
  ): TrendPeriod[] {
    return statements
      .filter(stmt => stmt[metric] !== null && stmt[metric] !== undefined)
      .map(stmt => ({
        date: typeof stmt.date === 'string' ? stmt.date : stmt.date.toISOString(),
        value: stmt[metric] as number
      }))
      .reverse()
  }

  // Insight generation methods
  private getRevenueInsight(analysis: Omit<TrendAnalysis, 'beginnerInsight'>): string {
    const latestChange = analysis.periods[analysis.periods.length - 1]?.percentageChange || 0
    const cagr = analysis.cagr || 0

    if (analysis.direction === 'improving') {
      return `Sales growing steadily at ${cagr.toFixed(1)}% per year - business expanding like a growing tree.`
    } else if (analysis.direction === 'deteriorating') {
      return `Sales declining ${Math.abs(cagr).toFixed(1)}% annually - business shrinking, needs new growth strategy.`
    } else if (analysis.direction === 'volatile') {
      return 'Sales jumping up and down unpredictably - business lacks stability.'
    } else {
      return `Sales relatively flat (${latestChange.toFixed(1)}% change) - mature business or growth stalled.`
    }
  }

  private getEarningsInsight(analysis: Omit<TrendAnalysis, 'beginnerInsight'>): string {
    const cagr = analysis.cagr || 0

    if (analysis.direction === 'improving' && cagr > 15) {
      return `Profits growing ${cagr.toFixed(1)}% annually - excellent wealth creation for shareholders.`
    } else if (analysis.direction === 'improving') {
      return `Profits growing steadily at ${cagr.toFixed(1)}% per year - healthy business performance.`
    } else if (analysis.direction === 'deteriorating') {
      return 'Profits declining - company struggling to maintain profitability.'
    } else if (analysis.direction === 'volatile') {
      return 'Profits very inconsistent - hard to predict future earnings.'
    } else {
      return 'Profits stable but not growing - consider growth initiatives.'
    }
  }

  private getEPSInsight(analysis: Omit<TrendAnalysis, 'beginnerInsight'>): string {
    if (analysis.direction === 'improving') {
      return 'Earnings per share growing - each share becoming more valuable over time.'
    } else if (analysis.direction === 'deteriorating') {
      return 'Earnings per share declining - watch for dilution or profit pressure.'
    } else {
      return 'Earnings per share stable - consistent value for shareholders.'
    }
  }

  private getCashFlowInsight(analysis: Omit<TrendAnalysis, 'beginnerInsight'>, type: string): string {
    if (type === 'operating') {
      if (analysis.direction === 'improving') {
        return 'Cash from operations growing - business generating more real money each year.'
      } else if (analysis.direction === 'deteriorating') {
        return 'Operating cash flow declining - concerning trend for business health.'
      } else {
        return 'Operating cash flow stable - consistent cash generation.'
      }
    } else {
      if (analysis.direction === 'improving') {
        return 'Free cash flow growing - more money available for dividends, buybacks, or growth.'
      } else if (analysis.direction === 'deteriorating') {
        return 'Free cash flow declining - less money for shareholders or investments.'
      } else {
        return 'Free cash flow stable - predictable cash available.'
      }
    }
  }

  private getMarginInsight(analysis: Omit<TrendAnalysis, 'beginnerInsight'>, type: string): string {
    const latestValue = analysis.periods[analysis.periods.length - 1]?.value || 0
    
    if (analysis.direction === 'improving') {
      return `${type.charAt(0).toUpperCase() + type.slice(1)} margins expanding - keeping more profit from each sale.`
    } else if (analysis.direction === 'deteriorating') {
      return `${type.charAt(0).toUpperCase() + type.slice(1)} margins shrinking - competitive pressure or rising costs eating profits.`
    } else {
      return `${type.charAt(0).toUpperCase() + type.slice(1)} margins stable at ${latestValue.toFixed(1)}% - consistent profitability.`
    }
  }

  private getDebtInsight(analysis: Omit<TrendAnalysis, 'beginnerInsight'>): string {
    if (analysis.direction === 'improving') {
      return 'Debt decreasing - company paying down obligations and reducing financial risk.'
    } else if (analysis.direction === 'deteriorating') {
      return 'Debt increasing - monitor leverage and ability to service growing obligations.'
    } else {
      return 'Debt levels stable - maintaining consistent capital structure.'
    }
  }

  private getDebtRatioInsight(analysis: Omit<TrendAnalysis, 'beginnerInsight'>): string {
    const latestValue = analysis.periods[analysis.periods.length - 1]?.value || 0
    
    if (analysis.direction === 'improving' && latestValue < 1) {
      return 'Leverage decreasing - becoming more financially conservative and safe.'
    } else if (analysis.direction === 'deteriorating' && latestValue > 2) {
      return 'Leverage increasing dangerously - high financial risk developing.'
    } else if (analysis.direction === 'deteriorating') {
      return 'Taking on more debt relative to equity - monitor borrowing levels.'
    } else {
      return `Debt-to-equity stable at ${latestValue.toFixed(2)}x - consistent capital structure.`
    }
  }

  private getROEInsight(analysis: Omit<TrendAnalysis, 'beginnerInsight'>): string {
    const latestValue = analysis.periods[analysis.periods.length - 1]?.value || 0
    
    if (analysis.direction === 'improving' && latestValue > 15) {
      return `Return on equity improving to ${latestValue.toFixed(1)}% - management creating more value for shareholders.`
    } else if (analysis.direction === 'deteriorating') {
      return 'Return on equity declining - less profitable use of shareholder money.'
    } else {
      return `Return on equity stable at ${latestValue.toFixed(1)}% - consistent shareholder returns.`
    }
  }

  private getAssetTurnoverInsight(analysis: Omit<TrendAnalysis, 'beginnerInsight'>): string {
    if (analysis.direction === 'improving') {
      return 'Asset efficiency improving - generating more sales from existing assets.'
    } else if (analysis.direction === 'deteriorating') {
      return 'Asset efficiency declining - assets becoming less productive.'
    } else {
      return 'Asset utilization stable - consistent operational efficiency.'
    }
  }

  private getShareCountInsight(analysis: Omit<TrendAnalysis, 'beginnerInsight'>): string {
    if (analysis.direction === 'improving') {
      return 'Share count decreasing through buybacks - each remaining share worth more of the company.'
    } else if (analysis.direction === 'deteriorating') {
      return 'Share count increasing - watch for dilution reducing per-share value.'
    } else {
      return 'Share count stable - no significant dilution or buybacks.'
    }
  }

  private getDividendInsight(analysis: Omit<TrendAnalysis, 'beginnerInsight'>): string {
    const cagr = analysis.cagr || 0
    
    if (analysis.direction === 'improving' && cagr > 5) {
      return `Dividends growing ${cagr.toFixed(1)}% annually - increasing income for shareholders.`
    } else if (analysis.direction === 'deteriorating') {
      return 'Dividends declining - possible cash flow concerns or strategic shift.'
    } else if (analysis.direction === 'volatile') {
      return 'Dividend payments inconsistent - unpredictable income stream.'
    } else {
      return 'Dividends stable - reliable income for shareholders.'
    }
  }
}
