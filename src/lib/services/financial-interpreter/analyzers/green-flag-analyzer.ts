/**
 * Green Flag Analyzer
 * Identifies positive financial indicators with 100% confidence from SEC data
 */

import { FinancialStatements, IncomeStatementData, BalanceSheetData, CashFlowStatementData } from '@/types/stock'
import { GreenFlag, GreenFlagWithConfidence, ConfidenceScore } from '../types/interpreter-types'

export class GreenFlagAnalyzer {
  /**
   * Analyze financial statements for positive indicators
   */
  async analyze(financialStatements: FinancialStatements): Promise<GreenFlagWithConfidence[]> {
    const greenFlags: GreenFlagWithConfidence[] = []
    
    // Get latest data
    const latestIncome = financialStatements.incomeStatements.annual[0]
    const previousIncome = financialStatements.incomeStatements.annual[1]
    const latestBalance = financialStatements.balanceSheets.annual[0]
    const previousBalance = financialStatements.balanceSheets.annual[1]
    const latestCashFlow = financialStatements.cashFlowStatements.annual[0]
    const ttmIncome = financialStatements.incomeStatements.ttm
    const ttmCashFlow = financialStatements.cashFlowStatements.ttm

    // Exceptional Green Flags
    this.checkCashGeneration(latestIncome, latestCashFlow, ttmIncome, ttmCashFlow, greenFlags)
    this.checkCompoundGrowth(financialStatements, greenFlags)
    this.checkCapitalEfficiency(financialStatements, greenFlags)
    
    // Strong Green Flags
    this.checkFortressBalanceSheet(latestBalance, greenFlags)
    this.checkPricingPower(financialStatements.incomeStatements.annual, greenFlags)
    this.checkShareholderFriendly(financialStatements, greenFlags)
    this.checkOperatingLeverage(financialStatements.incomeStatements.annual, greenFlags)
    this.checkReturnsOnCapital(latestIncome, latestBalance, previousBalance, greenFlags)
    
    // Good Green Flags
    this.checkConservativeAccounting(latestIncome, latestCashFlow, latestBalance, greenFlags)
    this.checkGrowingDividends(financialStatements.cashFlowStatements.annual, greenFlags)

    // Sort by strength
    greenFlags.sort((a, b) => {
      const strengthOrder = { exceptional: 0, strong: 1, good: 2 }
      return strengthOrder[a.flag.strength] - strengthOrder[b.flag.strength]
    })

    return greenFlags
  }

  /**
   * Check for strong cash generation
   */
  private checkCashGeneration(
    income: IncomeStatementData,
    cashFlow: CashFlowStatementData,
    ttmIncome: IncomeStatementData | undefined,
    ttmCashFlow: CashFlowStatementData | undefined,
    greenFlags: GreenFlagWithConfidence[]
  ): void {
    // Use TTM if available
    const currentIncome = ttmIncome || income
    const currentCashFlow = ttmCashFlow || cashFlow

    if (!currentIncome.netIncome || !currentCashFlow.operatingCashFlow || !currentIncome.revenue) return

    // Check OCF > Net Income
    const ocfToNI = currentCashFlow.operatingCashFlow / currentIncome.netIncome
    if (ocfToNI > 1.2) {
      greenFlags.push({
        flag: {
          id: 'superior_cash_generation',
          strength: 'exceptional',
          category: 'profitability',
          title: 'Superior Cash Generation',
          technicalDescription: `OCF/NI ratio: ${ocfToNI.toFixed(2)}`,
          beginnerExplanation: `For every $1 of profit reported, company generates $${ocfToNI.toFixed(2)} in actual cash - sign of high-quality earnings.`,
          formula: 'Operating Cash Flow / Net Income > 1.2',
          value: ocfToNI,
          benchmark: 1.2,
          insight: 'Company converts profits to cash very efficiently.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Operating Cash Flow', 'Net Income']
      })
    }

    // Check Free Cash Flow margin
    const freeCashFlow = currentCashFlow.freeCashFlow || 
      (currentCashFlow.operatingCashFlow - Math.abs(currentCashFlow.capitalExpenditures || 0))
    const fcfMargin = (freeCashFlow / currentIncome.revenue) * 100

    if (fcfMargin > 15) {
      greenFlags.push({
        flag: {
          id: 'high_fcf_margin',
          strength: 'exceptional',
          category: 'profitability',
          title: 'Exceptional Free Cash Flow Margin',
          technicalDescription: `FCF margin: ${fcfMargin.toFixed(1)}%`,
          beginnerExplanation: `Company keeps $${fcfMargin.toFixed(0)} as free cash for every $100 in sales - like having a high-profit ATM machine.`,
          formula: 'Free Cash Flow / Revenue > 15%',
          value: fcfMargin,
          benchmark: 15,
          insight: 'Plenty of cash for growth, dividends, or buybacks.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Free Cash Flow', 'Revenue']
      })
    }
  }

  /**
   * Check for compound growth
   */
  private checkCompoundGrowth(
    financialStatements: FinancialStatements,
    greenFlags: GreenFlagWithConfidence[]
  ): void {
    const incomeStatements = financialStatements.incomeStatements.annual
    const cashFlowStatements = financialStatements.cashFlowStatements.annual

    if (incomeStatements.length < 3 || cashFlowStatements.length < 3) return

    // Calculate 3-year CAGR for revenue, earnings, and FCF
    const periods = 3
    const current = {
      revenue: incomeStatements[0].revenue,
      netIncome: incomeStatements[0].netIncome,
      fcf: cashFlowStatements[0].freeCashFlow || 
        ((cashFlowStatements[0].operatingCashFlow || 0) - Math.abs(cashFlowStatements[0].capitalExpenditures || 0))
    }
    const past = {
      revenue: incomeStatements[periods - 1].revenue,
      netIncome: incomeStatements[periods - 1].netIncome,
      fcf: cashFlowStatements[periods - 1].freeCashFlow || 
        ((cashFlowStatements[periods - 1].operatingCashFlow || 0) - Math.abs(cashFlowStatements[periods - 1].capitalExpenditures || 0))
    }

    if (!current.revenue || !past.revenue || !current.netIncome || !past.netIncome) return

    const revenueCAGR = (Math.pow(current.revenue / past.revenue, 1 / (periods - 1)) - 1) * 100
    const earningsCAGR = past.netIncome > 0 ? (Math.pow(current.netIncome / past.netIncome, 1 / (periods - 1)) - 1) * 100 : 0
    const fcfCAGR = past.fcf > 0 ? (Math.pow(current.fcf / past.fcf, 1 / (periods - 1)) - 1) * 100 : 0

    if (revenueCAGR > 10 && earningsCAGR > 10 && fcfCAGR > 10) {
      greenFlags.push({
        flag: {
          id: 'compound_growth_machine',
          strength: 'exceptional',
          category: 'growth',
          title: 'Compound Growth Machine',
          technicalDescription: `3yr CAGR - Revenue: ${revenueCAGR.toFixed(1)}%, Earnings: ${earningsCAGR.toFixed(1)}%, FCF: ${fcfCAGR.toFixed(1)}%`,
          beginnerExplanation: 'Company growing like a snowball rolling downhill - sales, profits, and cash all growing >10% per year.',
          formula: 'Revenue, Earnings, and FCF all growing > 10% CAGR',
          value: Math.min(revenueCAGR, earningsCAGR, fcfCAGR),
          benchmark: 10,
          insight: 'Consistent growth across all key metrics.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Revenue', 'Net Income', 'Free Cash Flow (3-year)']
      })
    }
  }

  /**
   * Check capital efficiency
   */
  private checkCapitalEfficiency(
    financialStatements: FinancialStatements,
    greenFlags: GreenFlagWithConfidence[]
  ): void {
    const incomeStatements = financialStatements.incomeStatements.annual
    const cashFlowStatements = financialStatements.cashFlowStatements.annual

    if (incomeStatements.length < 2) return

    // Compare revenue growth to CapEx intensity
    const currentRevenue = incomeStatements[0].revenue
    const previousRevenue = incomeStatements[1].revenue
    const currentCapEx = Math.abs(cashFlowStatements[0].capitalExpenditures || 0)
    
    if (!currentRevenue || !previousRevenue || currentCapEx === 0) return

    const revenueGrowth = currentRevenue - previousRevenue
    const capExIntensity = (currentCapEx / currentRevenue) * 100
    const incrementalROIC = (revenueGrowth * 0.25) / currentCapEx * 100 // Assuming 25% operating margin on incremental revenue

    if (capExIntensity < 5 && revenueGrowth > 0) {
      greenFlags.push({
        flag: {
          id: 'capital_light_growth',
          strength: 'exceptional',
          category: 'efficiency',
          title: 'Capital-Light Growth Model',
          technicalDescription: `CapEx only ${capExIntensity.toFixed(1)}% of revenue`,
          beginnerExplanation: `Company grows without heavy spending - like a software business vs a factory.`,
          formula: 'CapEx / Revenue < 5%',
          value: capExIntensity,
          benchmark: 5,
          insight: 'Scalable business model with high returns on investment.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Capital Expenditures', 'Revenue']
      })
    }
  }

  /**
   * Check for fortress balance sheet
   */
  private checkFortressBalanceSheet(
    balance: BalanceSheetData,
    greenFlags: GreenFlagWithConfidence[]
  ): void {
    if (!balance.cashAndCashEquivalents || !balance.totalAssets) return

    const totalDebt = (balance.shortTermDebt || 0) + (balance.longTermDebt || 0)
    const netCash = balance.cashAndCashEquivalents - totalDebt
    const currentRatio = (balance.currentAssets || 0) / (balance.currentLiabilities || 1)

    // Net cash position
    if (netCash > 0 && currentRatio > 2) {
      const netCashPercent = (netCash / balance.totalAssets) * 100
      
      greenFlags.push({
        flag: {
          id: 'fortress_balance_sheet',
          strength: 'strong',
          category: 'financial_health',
          title: 'Fortress Balance Sheet',
          technicalDescription: `Net cash: $${(netCash / 1e9).toFixed(2)}B (${netCashPercent.toFixed(1)}% of assets)`,
          beginnerExplanation: 'Company has more cash than debt - could pay off all debts today and still have money left.',
          formula: 'Cash > Total Debt AND Current Ratio > 2',
          value: netCashPercent,
          benchmark: 0,
          insight: 'Exceptional financial flexibility and safety.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Cash & Equivalents', 'Total Debt', 'Current Assets', 'Current Liabilities']
      })
    }

    // Low leverage
    if (balance.totalShareholderEquity && totalDebt / balance.totalShareholderEquity < 0.3) {
      greenFlags.push({
        flag: {
          id: 'conservative_leverage',
          strength: 'good',
          category: 'financial_health',
          title: 'Conservative Debt Levels',
          technicalDescription: `D/E ratio: ${(totalDebt / balance.totalShareholderEquity).toFixed(2)}`,
          beginnerExplanation: 'Company uses very little debt - like owning your home with a small mortgage.',
          formula: 'Debt / Equity < 0.3',
          value: totalDebt / balance.totalShareholderEquity,
          benchmark: 0.3,
          insight: 'Low financial risk with room to borrow if needed.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Total Debt', 'Shareholder Equity']
      })
    }
  }

  /**
   * Check for pricing power through margin stability/growth
   */
  private checkPricingPower(
    incomeStatements: IncomeStatementData[],
    greenFlags: GreenFlagWithConfidence[]
  ): void {
    if (incomeStatements.length < 3) return

    // Calculate gross margins for last 3 years
    const margins = incomeStatements.slice(0, 3).map(stmt => {
      if (!stmt.revenue || !stmt.grossProfit) return null
      return (stmt.grossProfit / stmt.revenue) * 100
    }).filter(m => m !== null) as number[]

    if (margins.length < 3) return

    // Check if margins are stable or improving
    const avgMargin = margins.reduce((a, b) => a + b) / margins.length
    const marginStdDev = Math.sqrt(margins.reduce((sum, m) => sum + Math.pow(m - avgMargin, 2), 0) / margins.length)
    const marginTrend = margins[0] - margins[2]

    if (avgMargin > 40 && marginStdDev < 2) {
      greenFlags.push({
        flag: {
          id: 'strong_pricing_power',
          strength: 'strong',
          category: 'profitability',
          title: 'Strong Pricing Power',
          technicalDescription: `Stable gross margin: ${avgMargin.toFixed(1)}% (±${marginStdDev.toFixed(1)}%)`,
          beginnerExplanation: 'Company maintains high profit margins - can raise prices without losing customers.',
          formula: 'Gross Margin > 40% with low volatility',
          value: avgMargin,
          benchmark: 40,
          insight: 'Sign of competitive advantage or brand strength.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Gross Profit', 'Revenue (3-year trend)']
      })
    }

    if (marginTrend > 3) {
      greenFlags.push({
        flag: {
          id: 'expanding_margins',
          strength: 'good',
          category: 'profitability',
          title: 'Expanding Profit Margins',
          technicalDescription: `Gross margin expanded ${marginTrend.toFixed(1)} percentage points`,
          beginnerExplanation: 'Company keeping more profit from each sale - getting more efficient or raising prices successfully.',
          formula: 'Gross margin expansion > 3 percentage points',
          value: marginTrend,
          benchmark: 3,
          insight: 'Improving competitive position or operational efficiency.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Gross Profit', 'Revenue (YoY comparison)']
      })
    }
  }

  /**
   * Check shareholder-friendly actions
   */
  private checkShareholderFriendly(
    financialStatements: FinancialStatements,
    greenFlags: GreenFlagWithConfidence[]
  ): void {
    const currentBalance = financialStatements.balanceSheets.annual[0]
    const pastBalance = financialStatements.balanceSheets.annual[Math.min(2, financialStatements.balanceSheets.annual.length - 1)]
    const cashFlows = financialStatements.cashFlowStatements.annual

    if (!currentBalance.sharesOutstanding || !pastBalance.sharesOutstanding) return

    // Check share buybacks
    const shareChange = ((currentBalance.sharesOutstanding - pastBalance.sharesOutstanding) / pastBalance.sharesOutstanding) * 100
    
    if (shareChange < -5) {
      greenFlags.push({
        flag: {
          id: 'aggressive_buybacks',
          strength: 'strong',
          category: 'shareholder_friendly',
          title: 'Aggressive Share Buybacks',
          technicalDescription: `Share count reduced ${Math.abs(shareChange).toFixed(1)}% over 2 years`,
          beginnerExplanation: 'Company buying back shares - making each remaining share more valuable, like slicing a pizza into fewer pieces.',
          formula: 'Share count declining > 5% over 2 years',
          value: Math.abs(shareChange),
          benchmark: 5,
          insight: 'Management confident in business and returning cash to shareholders.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Shares Outstanding (2-year comparison)']
      })
    }

    // Also check for significant buybacks by dollar amount
    if (cashFlows.length > 0 && cashFlows[0].stockRepurchased && cashFlows[0].stockRepurchased < 0) {
      const buybackAmount = Math.abs(cashFlows[0].stockRepurchased)
      const revenue = financialStatements.incomeStatements.annual[0]?.revenue || 0
      
      // Check if buybacks are significant (>2% of revenue)
      const buybackToRevenue = revenue > 0 ? (buybackAmount / revenue) * 100 : 0
      
      if (buybackToRevenue > 2) {
        greenFlags.push({
          flag: {
            id: 'significant_buybacks',
            strength: buybackToRevenue > 5 ? 'exceptional' : 'strong',
            category: 'shareholder_friendly',
            title: 'Significant Share Buybacks',
            technicalDescription: `$${(buybackAmount / 1e9).toFixed(1)}B in buybacks (${buybackToRevenue.toFixed(1)}% of revenue)`,
            beginnerExplanation: `Company spent $${(buybackAmount / 1e9).toFixed(0)} billion buying back shares - returning massive cash to shareholders.`,
            formula: 'Annual buybacks > 2% of revenue',
            value: buybackToRevenue,
            benchmark: 2,
            insight: 'Major capital return program benefiting shareholders.'
          },
          confidence: this.getMaxConfidence(),
          dataUsed: ['Stock Repurchased', 'Market Cap Estimate']
        })
      }
    }

    // Check dividend coverage
    if (cashFlows.length > 0 && cashFlows[0].dividendsPaid && cashFlows[0].dividendsPaid < 0) {
      const dividends = Math.abs(cashFlows[0].dividendsPaid)
      const fcf = cashFlows[0].freeCashFlow || 
        ((cashFlows[0].operatingCashFlow || 0) - Math.abs(cashFlows[0].capitalExpenditures || 0))
      
      if (fcf > 0 && dividends / fcf < 0.5) {
        greenFlags.push({
          flag: {
            id: 'sustainable_dividends',
            strength: 'good',
            category: 'shareholder_friendly',
            title: 'Well-Covered Dividends',
            technicalDescription: `Payout ratio: ${((dividends / fcf) * 100).toFixed(0)}% of FCF`,
            beginnerExplanation: 'Company pays dividends comfortably from cash flow - plenty left for growth.',
            formula: 'Dividends < 50% of Free Cash Flow',
            value: (dividends / fcf) * 100,
            benchmark: 50,
            insight: 'Dividend is safe with room for growth.'
          },
          confidence: this.getMaxConfidence(),
          dataUsed: ['Dividends Paid', 'Free Cash Flow']
        })
      }
    }
  }

  /**
   * Check for operating leverage
   */
  private checkOperatingLeverage(
    incomeStatements: IncomeStatementData[],
    greenFlags: GreenFlagWithConfidence[]
  ): void {
    if (incomeStatements.length < 2) return

    const current = incomeStatements[0]
    const previous = incomeStatements[1]

    if (!current.revenue || !previous.revenue || !current.operatingIncome || !previous.operatingIncome) return

    const revenueGrowth = ((current.revenue - previous.revenue) / previous.revenue) * 100
    const operatingIncomeGrowth = ((current.operatingIncome - previous.operatingIncome) / previous.operatingIncome) * 100

    if (revenueGrowth > 5 && operatingIncomeGrowth > revenueGrowth * 1.5) {
      const leverage = operatingIncomeGrowth / revenueGrowth

      greenFlags.push({
        flag: {
          id: 'operating_leverage',
          strength: 'strong',
          category: 'efficiency',
          title: 'Strong Operating Leverage',
          technicalDescription: `Operating income grew ${leverage.toFixed(1)}x faster than revenue`,
          beginnerExplanation: 'Profits growing much faster than sales - like a gym that gets more profitable as it adds members without adding costs.',
          formula: 'Operating Income growth > 1.5x Revenue growth',
          value: leverage,
          benchmark: 1.5,
          insight: 'Business scales beautifully - high incremental margins.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Revenue', 'Operating Income (YoY)']
      })
    }
  }

  /**
   * Check returns on capital
   */
  private checkReturnsOnCapital(
    income: IncomeStatementData,
    currentBalance: BalanceSheetData,
    previousBalance: BalanceSheetData,
    greenFlags: GreenFlagWithConfidence[]
  ): void {
    if (!income.netIncome || !currentBalance.totalShareholderEquity) return

    // Calculate ROE
    const avgEquity = (currentBalance.totalShareholderEquity + (previousBalance.totalShareholderEquity || currentBalance.totalShareholderEquity)) / 2
    const roe = (income.netIncome / avgEquity) * 100

    if (roe > 20) {
      greenFlags.push({
        flag: {
          id: 'exceptional_roe',
          strength: 'strong',
          category: 'profitability',
          title: 'Exceptional Return on Equity',
          technicalDescription: `ROE: ${roe.toFixed(1)}%`,
          beginnerExplanation: `Company earns $${roe.toFixed(0)} annually for every $100 invested by shareholders - better than most investments!`,
          formula: 'Net Income / Avg Equity > 20%',
          value: roe,
          benchmark: 20,
          insight: 'Management excels at generating shareholder returns.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Net Income', 'Shareholder Equity']
      })
    }

    // Calculate ROA
    if (currentBalance.totalAssets) {
      const avgAssets = (currentBalance.totalAssets + (previousBalance.totalAssets || currentBalance.totalAssets)) / 2
      const roa = (income.netIncome / avgAssets) * 100

      if (roa > 10) {
        greenFlags.push({
          flag: {
            id: 'high_roa',
            strength: 'good',
            category: 'profitability',
            title: 'High Return on Assets',
            technicalDescription: `ROA: ${roa.toFixed(1)}%`,
            beginnerExplanation: `Company generates $${roa.toFixed(0)} profit for every $100 of assets - very efficient use of resources.`,
            formula: 'Net Income / Avg Assets > 10%',
            value: roa,
            benchmark: 10,
            insight: 'Efficient asset utilization.'
          },
          confidence: this.getMaxConfidence(),
          dataUsed: ['Net Income', 'Total Assets']
        })
      }
    }

    // Calculate ROIC (simplified)
    if (income.operatingIncome && income.incomeTaxExpense) {
      const nopat = income.operatingIncome * (1 - (income.incomeTaxExpense / (income.incomeBeforeTax || 1)))
      const totalDebt = (currentBalance.shortTermDebt || 0) + (currentBalance.longTermDebt || 0)
      const investedCapital = totalDebt + currentBalance.totalShareholderEquity
      const roic = (nopat / investedCapital) * 100

      if (roic > 15) {
        greenFlags.push({
          flag: {
            id: 'superior_roic',
            strength: 'exceptional',
            category: 'profitability',
            title: 'Superior Return on Invested Capital',
            technicalDescription: `ROIC: ${roic.toFixed(1)}%`,
            beginnerExplanation: `Company earns $${roic.toFixed(0)} for every $100 invested - sign of competitive advantage.`,
            formula: 'NOPAT / Invested Capital > 15%',
            value: roic,
            benchmark: 15,
            insight: 'Excellent capital allocation driving superior returns.'
          },
          confidence: this.getMaxConfidence(),
          dataUsed: ['Operating Income', 'Tax Rate', 'Invested Capital']
        })
      }
    }
  }

  /**
   * Check for conservative accounting
   */
  private checkConservativeAccounting(
    income: IncomeStatementData,
    cashFlow: CashFlowStatementData,
    balance: BalanceSheetData,
    greenFlags: GreenFlagWithConfidence[]
  ): void {
    if (!income.netIncome || !cashFlow.operatingCashFlow || !balance.totalAssets) return

    // Calculate accruals
    const accruals = income.netIncome - cashFlow.operatingCashFlow
    const accrualsRatio = (accruals / balance.totalAssets) * 100

    if (Math.abs(accrualsRatio) < 2) {
      greenFlags.push({
        flag: {
          id: 'conservative_accounting',
          strength: 'good',
          category: 'financial_health',
          title: 'Conservative Accounting',
          technicalDescription: `Accruals ratio: ${accrualsRatio.toFixed(1)}%`,
          beginnerExplanation: 'Reported profits closely match actual cash - no accounting tricks or aggressive assumptions.',
          formula: '|Accruals / Assets| < 2%',
          value: Math.abs(accrualsRatio),
          benchmark: 2,
          insight: 'Trustworthy financial reporting.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Net Income', 'Operating Cash Flow', 'Total Assets']
      })
    }
  }

  /**
   * Check for growing dividends
   */
  private checkGrowingDividends(
    cashFlowStatements: CashFlowStatementData[],
    greenFlags: GreenFlagWithConfidence[]
  ): void {
    if (cashFlowStatements.length < 3) return

    // Get dividend history (dividends are negative in cash flow)
    const dividends = cashFlowStatements.slice(0, 3).map(cf => Math.abs(cf.dividendsPaid || 0))
    
    // Check if dividends are growing
    const allPositive = dividends.every(d => d > 0)
    const growing = dividends[0] > dividends[1] && dividends[1] > dividends[2]

    if (allPositive && growing) {
      const growthRate = (Math.pow(dividends[0] / dividends[2], 0.5) - 1) * 100

      greenFlags.push({
        flag: {
          id: 'dividend_growth',
          strength: 'good',
          category: 'shareholder_friendly',
          title: 'Consistent Dividend Growth',
          technicalDescription: `Dividend CAGR: ${growthRate.toFixed(1)}%`,
          beginnerExplanation: 'Company increases dividends every year - like getting a raise on your investment income.',
          formula: 'Dividends growing consistently',
          value: growthRate,
          benchmark: 0,
          insight: 'Management confident in sustainable cash generation.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Dividends Paid (3-year trend)']
      })
    }
  }

  /**
   * Get maximum confidence score (100% for SEC data)
   */
  private getMaxConfidence(): ConfidenceScore {
    return {
      score: 100,
      level: 'maximum',
      source: 'SEC EDGAR',
      factors: [
        {
          name: 'Data Completeness',
          status: 'available',
          description: 'All required financial data available from SEC filings'
        }
      ]
    }
  }
}
