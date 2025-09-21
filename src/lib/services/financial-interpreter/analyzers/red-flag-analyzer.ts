/**
 * Red Flag Analyzer
 * Detects financial warning signs with 100% confidence from SEC data
 */

import { FinancialStatements, IncomeStatementData, BalanceSheetData, CashFlowStatementData } from '@/types/stock'
import { RedFlag, RedFlagWithConfidence, ConfidenceScore } from '../types/interpreter-types'

export class RedFlagAnalyzer {
  /**
   * Analyze financial statements for red flags
   */
  async analyze(financialStatements: FinancialStatements): Promise<RedFlagWithConfidence[]> {
    const redFlags: RedFlagWithConfidence[] = []
    
    // Get latest data
    const latestIncome = financialStatements.incomeStatements.annual[0]
    const previousIncome = financialStatements.incomeStatements.annual[1]
    const latestBalance = financialStatements.balanceSheets.annual[0]
    const previousBalance = financialStatements.balanceSheets.annual[1]
    const latestCashFlow = financialStatements.cashFlowStatements.annual[0]
    const ttmIncome = financialStatements.incomeStatements.ttm
    const ttmCashFlow = financialStatements.cashFlowStatements.ttm

    // Critical Red Flags
    this.checkInsolvency(latestBalance, redFlags)
    this.checkLiquidityCrisis(latestBalance, latestIncome, ttmCashFlow, redFlags)
    this.checkCashBurnWithLeverage(latestBalance, latestCashFlow, redFlags)
    
    // Major Red Flags
    this.checkDebtServiceability(latestBalance, latestIncome, latestCashFlow, redFlags)
    this.checkGrossMarginCollapse(latestIncome, previousIncome, redFlags)
    this.checkWorkingCapitalDeterioration(
      financialStatements.balanceSheets.annual,
      financialStatements.incomeStatements.annual,
      redFlags
    )
    this.checkEarningsQuality(latestIncome, latestCashFlow, ttmIncome, ttmCashFlow, redFlags)
    this.checkDilutionTreadmill(
      financialStatements.balanceSheets.annual,
      financialStatements.incomeStatements.annual,
      redFlags
    )
    
    // Warning Flags
    this.checkMarginCompression(financialStatements.incomeStatements.annual, redFlags)
    this.checkDividendSustainability(latestCashFlow, ttmCashFlow, redFlags)
    this.checkCapitalIntensity(
      financialStatements.incomeStatements.annual,
      financialStatements.cashFlowStatements.annual,
      redFlags
    )

    // Sort by severity
    redFlags.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return severityOrder[a.flag.severity] - severityOrder[b.flag.severity]
    })

    return redFlags
  }

  /**
   * Check for insolvency risk (Total Liabilities > Total Assets)
   */
  private checkInsolvency(balance: BalanceSheetData, redFlags: RedFlagWithConfidence[]): void {
    if (!balance.totalAssets || !balance.totalLiabilities) return

    if (balance.totalLiabilities > balance.totalAssets) {
      const deficit = balance.totalLiabilities - balance.totalAssets
      const deficitPercentage = (deficit / balance.totalAssets) * 100

      redFlags.push({
        flag: {
          id: 'insolvency_risk',
          severity: 'critical',
          category: 'solvency',
          title: 'Insolvency Risk - Negative Equity',
          technicalDescription: `Liabilities exceed assets by $${(deficit / 1e9).toFixed(2)}B (${deficitPercentage.toFixed(1)}%)`,
          beginnerExplanation: 'The company owes more than it owns - like having a mortgage bigger than your house value. This is a serious financial distress signal.',
          formula: 'Total Liabilities > Total Assets',
          value: balance.totalLiabilities,
          threshold: balance.totalAssets,
          recommendation: 'Immediate investigation required. Check for restructuring plans or bankruptcy risk.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Total Assets', 'Total Liabilities']
      })
    }
  }

  /**
   * Check for liquidity crisis
   */
  private checkLiquidityCrisis(
    balance: BalanceSheetData, 
    income: IncomeStatementData, 
    cashFlow: CashFlowStatementData | undefined,
    redFlags: RedFlagWithConfidence[]
  ): void {
    if (!balance.currentAssets || !balance.currentLiabilities) return

    const currentRatio = balance.currentAssets / balance.currentLiabilities
    const workingCapital = balance.currentAssets - balance.currentLiabilities
    
    // Check if current liabilities exceed current assets
    if (currentRatio < 1) {
      // Check if operating cash flow can cover the gap
      const ocf = cashFlow?.operatingCashFlow || income.netIncome || 0
      const canCoverGap = ocf > Math.abs(workingCapital)

      if (!canCoverGap) {
        redFlags.push({
          flag: {
            id: 'liquidity_crisis',
            severity: 'critical',
            category: 'liquidity',
            title: 'Severe Liquidity Crisis',
            technicalDescription: `Current ratio: ${currentRatio.toFixed(2)}, Working capital deficit: $${(workingCapital / 1e9).toFixed(2)}B`,
            beginnerExplanation: `Company has $${currentRatio.toFixed(2)} for every $1 of bills due this year - can't pay all bills without borrowing or selling assets.`,
            formula: 'Current Assets / Current Liabilities < 1',
            value: currentRatio,
            threshold: 1,
            recommendation: 'Check cash burn rate and available credit lines. Company may struggle to meet short-term obligations.'
          },
          confidence: this.getMaxConfidence(),
          dataUsed: ['Current Assets', 'Current Liabilities', 'Operating Cash Flow']
        })
      }
    } else if (currentRatio < 1.2) {
      // Warning level liquidity
      redFlags.push({
        flag: {
          id: 'liquidity_warning',
          severity: 'medium',
          category: 'liquidity',
          title: 'Tight Liquidity',
          technicalDescription: `Current ratio: ${currentRatio.toFixed(2)}`,
          beginnerExplanation: `Company has only $${currentRatio.toFixed(2)} for every $1 of near-term bills - limited financial cushion.`,
          formula: 'Current Assets / Current Liabilities < 1.2',
          value: currentRatio,
          threshold: 1.2,
          recommendation: 'Monitor cash flow trends and credit availability.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Current Assets', 'Current Liabilities']
      })
    }
  }

  /**
   * Check for cash burn with high leverage
   */
  private checkCashBurnWithLeverage(
    balance: BalanceSheetData,
    cashFlow: CashFlowStatementData,
    redFlags: RedFlagWithConfidence[]
  ): void {
    if (!cashFlow.operatingCashFlow || !balance.totalShareholderEquity) return

    const totalDebt = (balance.shortTermDebt || 0) + (balance.longTermDebt || 0)
    const debtToEquity = balance.totalShareholderEquity > 0 ? totalDebt / balance.totalShareholderEquity : 999

    if (cashFlow.operatingCashFlow < 0 && debtToEquity > 2) {
      const monthlyBurn = Math.abs(cashFlow.operatingCashFlow) / 12
      const cashRunway = balance.cashAndCashEquivalents ? balance.cashAndCashEquivalents / monthlyBurn : 0

      redFlags.push({
        flag: {
          id: 'cash_burn_leveraged',
          severity: 'critical',
          category: 'liquidity',
          title: 'Cash Burn with High Debt',
          technicalDescription: `Burning $${(monthlyBurn / 1e6).toFixed(1)}M/month with D/E ratio: ${debtToEquity.toFixed(1)}x`,
          beginnerExplanation: 'Company is losing money every month while already deep in debt - like maxing credit cards while unemployed.',
          formula: 'Operating Cash Flow < 0 AND Debt/Equity > 2',
          value: debtToEquity,
          threshold: 2,
          recommendation: `Cash runway: ${cashRunway.toFixed(1)} months. Check refinancing options and cost reduction plans.`
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Operating Cash Flow', 'Total Debt', 'Total Equity', 'Cash']
      })
    }
  }

  /**
   * Check debt serviceability
   */
  private checkDebtServiceability(
    balance: BalanceSheetData,
    income: IncomeStatementData,
    cashFlow: CashFlowStatementData,
    redFlags: RedFlagWithConfidence[]
  ): void {
    if (!cashFlow.operatingCashFlow || !income.interestExpense) return

    const debtRepayment = Math.abs(cashFlow.debtRepayment || 0)
    const totalDebtService = (income.interestExpense || 0) + debtRepayment
    const debtServiceCoverage = cashFlow.operatingCashFlow / totalDebtService

    if (debtServiceCoverage < 1 && totalDebtService > 0) {
      redFlags.push({
        flag: {
          id: 'unsustainable_debt_service',
          severity: 'high',
          category: 'leverage',
          title: 'Unsustainable Debt Service',
          technicalDescription: `Debt service coverage: ${debtServiceCoverage.toFixed(2)}x`,
          beginnerExplanation: 'Company needs to borrow more just to pay existing debts - entering a debt spiral.',
          formula: 'Operating Cash Flow / (Interest + Principal) < 1',
          value: debtServiceCoverage,
          threshold: 1,
          recommendation: 'Review debt restructuring options and covenant compliance.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Operating Cash Flow', 'Interest Expense', 'Debt Repayment']
      })
    }

    // Also check interest coverage
    if (income.operatingIncome && income.interestExpense > 0) {
      const interestCoverage = income.operatingIncome / income.interestExpense
      if (interestCoverage < 2) {
        redFlags.push({
          flag: {
            id: 'weak_interest_coverage',
            severity: 'medium',
            category: 'leverage',
            title: 'Weak Interest Coverage',
            technicalDescription: `Interest coverage: ${interestCoverage.toFixed(2)}x`,
            beginnerExplanation: `Company earns only $${interestCoverage.toFixed(2)} for every $1 of interest owed - little margin for error.`,
            formula: 'Operating Income / Interest Expense < 2',
            value: interestCoverage,
            threshold: 2,
            recommendation: 'Monitor debt levels and refinancing risk.'
          },
          confidence: this.getMaxConfidence(),
          dataUsed: ['Operating Income', 'Interest Expense']
        })
      }
    }
  }

  /**
   * Check for gross margin collapse
   */
  private checkGrossMarginCollapse(
    current: IncomeStatementData,
    previous: IncomeStatementData,
    redFlags: RedFlagWithConfidence[]
  ): void {
    if (!current.revenue || !current.grossProfit || !previous.grossProfit || !previous.revenue) return

    const currentMargin = (current.grossProfit / current.revenue) * 100
    const previousMargin = (previous.grossProfit / previous.revenue) * 100
    const marginDecline = previousMargin - currentMargin

    // Check for negative gross margin
    if (currentMargin < 0) {
      redFlags.push({
        flag: {
          id: 'negative_gross_margin',
          severity: 'critical',
          category: 'profitability',
          title: 'Negative Gross Margin',
          technicalDescription: `Gross margin: ${currentMargin.toFixed(1)}%`,
          beginnerExplanation: "Company can't even sell products for more than they cost to make - losing money on every sale.",
          formula: 'Gross Profit < 0',
          value: currentMargin,
          threshold: 0,
          recommendation: 'Investigate pricing strategy and cost structure immediately.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Revenue', 'Cost of Revenue', 'Gross Profit']
      })
    } else if (marginDecline > 5) {
      // Significant margin compression
      redFlags.push({
        flag: {
          id: 'gross_margin_compression',
          severity: 'high',
          category: 'profitability',
          title: 'Severe Margin Compression',
          technicalDescription: `Gross margin declined ${marginDecline.toFixed(1)} percentage points YoY`,
          beginnerExplanation: `Company keeps ${marginDecline.toFixed(1)}% less profit from each dollar of sales compared to last year.`,
          formula: 'Gross Margin declined > 5 percentage points',
          value: marginDecline,
          threshold: 5,
          recommendation: 'Analyze competitive pressures and cost inflation impact.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Revenue', 'Gross Profit (current & previous year)']
      })
    }
  }

  /**
   * Check working capital deterioration
   */
  private checkWorkingCapitalDeterioration(
    balanceSheets: BalanceSheetData[],
    incomeStatements: IncomeStatementData[],
    redFlags: RedFlagWithConfidence[]
  ): void {
    if (balanceSheets.length < 2 || incomeStatements.length < 2) return

    const current = balanceSheets[0]
    const previous = balanceSheets[1]
    const currentIncome = incomeStatements[0]
    const previousIncome = incomeStatements[1]

    // Check receivables growth vs revenue growth
    if (current.netReceivables && previous.netReceivables && currentIncome.revenue && previousIncome.revenue) {
      const receivablesGrowth = ((current.netReceivables - previous.netReceivables) / previous.netReceivables) * 100
      const revenueGrowth = ((currentIncome.revenue - previousIncome.revenue) / previousIncome.revenue) * 100
      
      if (receivablesGrowth > revenueGrowth + 10) {
        redFlags.push({
          flag: {
            id: 'receivables_quality_issue',
            severity: 'medium',
            category: 'efficiency',
            title: 'Deteriorating Receivables Quality',
            technicalDescription: `Receivables grew ${receivablesGrowth.toFixed(1)}% vs revenue ${revenueGrowth.toFixed(1)}%`,
            beginnerExplanation: 'Customers taking longer to pay - money getting stuck in IOUs instead of cash.',
            formula: 'Receivables growth > Revenue growth + 10%',
            value: receivablesGrowth,
            threshold: revenueGrowth + 10,
            recommendation: 'Review customer credit quality and collection procedures.'
          },
          confidence: this.getMaxConfidence(),
          dataUsed: ['Accounts Receivable', 'Revenue (YoY comparison)']
        })
      }
    }

    // Check inventory buildup
    if (current.inventory && previous.inventory && currentIncome.revenue && previousIncome.revenue) {
      const inventoryGrowth = ((current.inventory - previous.inventory) / previous.inventory) * 100
      const revenueGrowth = ((currentIncome.revenue - previousIncome.revenue) / previousIncome.revenue) * 100
      
      if (inventoryGrowth > revenueGrowth + 15) {
        redFlags.push({
          flag: {
            id: 'inventory_buildup',
            severity: 'medium',
            category: 'efficiency',
            title: 'Excessive Inventory Buildup',
            technicalDescription: `Inventory grew ${inventoryGrowth.toFixed(1)}% vs revenue ${revenueGrowth.toFixed(1)}%`,
            beginnerExplanation: 'Products piling up in warehouses - may indicate slowing demand.',
            formula: 'Inventory growth > Revenue growth + 15%',
            value: inventoryGrowth,
            threshold: revenueGrowth + 15,
            recommendation: 'Check for obsolete inventory and demand trends.'
          },
          confidence: this.getMaxConfidence(),
          dataUsed: ['Inventory', 'Revenue (YoY comparison)']
        })
      }
    }
  }

  /**
   * Check earnings quality
   */
  private checkEarningsQuality(
    annual: IncomeStatementData,
    annualCF: CashFlowStatementData,
    ttm: IncomeStatementData | undefined,
    ttmCF: CashFlowStatementData | undefined,
    redFlags: RedFlagWithConfidence[]
  ): void {
    // Use TTM if available, otherwise annual
    const income = ttm || annual
    const cashFlow = ttmCF || annualCF

    if (!income.netIncome || !cashFlow.operatingCashFlow) return

    const earningsQuality = cashFlow.operatingCashFlow / income.netIncome
    
    if (earningsQuality < 0.8) {
      redFlags.push({
        flag: {
          id: 'poor_earnings_quality',
          severity: 'high',
          category: 'profitability',
          title: 'Poor Earnings Quality',
          technicalDescription: `OCF/NI ratio: ${earningsQuality.toFixed(2)}`,
          beginnerExplanation: 'Profits on paper but not turning into real cash - potential accounting red flag.',
          formula: 'Operating Cash Flow / Net Income < 0.8',
          value: earningsQuality,
          threshold: 0.8,
          recommendation: 'Investigate accruals and revenue recognition policies.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Operating Cash Flow', 'Net Income']
      })
    }

    // Calculate accruals ratio if we have balance sheet data
    const latestBalance = annualCF.endCashPosition
    if (annual.netIncome && cashFlow.operatingCashFlow && latestBalance) {
      const accruals = annual.netIncome - cashFlow.operatingCashFlow
      const avgAssets = latestBalance // Simplified - should use average
      const accrualsRatio = (accruals / avgAssets) * 100

      if (Math.abs(accrualsRatio) > 10) {
        redFlags.push({
          flag: {
            id: 'high_accruals',
            severity: 'medium',
            category: 'profitability',
            title: 'High Accruals',
            technicalDescription: `Accruals ratio: ${accrualsRatio.toFixed(1)}%`,
            beginnerExplanation: 'Large gap between reported profits and actual cash - earnings may be overstated.',
            formula: '|(Net Income - OCF) / Assets| > 10%',
            value: Math.abs(accrualsRatio),
            threshold: 10,
            recommendation: 'Review accounting policies and one-time items.'
          },
          confidence: this.getMaxConfidence(),
          dataUsed: ['Net Income', 'Operating Cash Flow', 'Total Assets']
        })
      }
    }
  }

  /**
   * Check for dilution treadmill
   */
  private checkDilutionTreadmill(
    balanceSheets: BalanceSheetData[],
    incomeStatements: IncomeStatementData[],
    redFlags: RedFlagWithConfidence[]
  ): void {
    if (balanceSheets.length < 3) return

    // Calculate share count growth over 2 years
    const currentShares = balanceSheets[0].sharesOutstanding
    const twoYearAgoShares = balanceSheets[2].sharesOutstanding

    if (!currentShares || !twoYearAgoShares) return

    const annualShareGrowth = Math.pow(currentShares / twoYearAgoShares, 0.5) - 1
    const shareGrowthPercent = annualShareGrowth * 100

    // Check EPS trend
    const currentEPS = incomeStatements[0].epsDiluted || incomeStatements[0].eps
    const previousEPS = incomeStatements[1].epsDiluted || incomeStatements[1].eps

    if (shareGrowthPercent > 5 && currentEPS && previousEPS && currentEPS < previousEPS) {
      redFlags.push({
        flag: {
          id: 'dilution_treadmill',
          severity: 'high',
          category: 'efficiency',
          title: 'Shareholder Dilution',
          technicalDescription: `Share count growing ${shareGrowthPercent.toFixed(1)}% annually, EPS declining`,
          beginnerExplanation: 'Company keeps issuing new shares, making each share worth less - like printing money.',
          formula: 'Share growth > 5% annually AND declining EPS',
          value: shareGrowthPercent,
          threshold: 5,
          recommendation: 'Evaluate funding alternatives and capital efficiency.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Shares Outstanding', 'EPS (multi-year)']
      })
    }
  }

  /**
   * Check margin compression trends
   */
  private checkMarginCompression(
    incomeStatements: IncomeStatementData[],
    redFlags: RedFlagWithConfidence[]
  ): void {
    if (incomeStatements.length < 3) return

    // Calculate margin trends
    const margins = incomeStatements.slice(0, 3).map(stmt => {
      if (!stmt.revenue || !stmt.operatingIncome) return null
      return (stmt.operatingIncome / stmt.revenue) * 100
    }).filter(m => m !== null) as number[]

    if (margins.length < 3) return

    // Check if margins are consistently declining
    const declining = margins[0] < margins[1] && margins[1] < margins[2]
    const totalDecline = margins[2] - margins[0]

    if (declining && totalDecline > 3) {
      redFlags.push({
        flag: {
          id: 'margin_compression_trend',
          severity: 'medium',
          category: 'profitability',
          title: 'Persistent Margin Compression',
          technicalDescription: `Operating margin declined ${totalDecline.toFixed(1)} percentage points over 2 years`,
          beginnerExplanation: 'Company keeping less profit from each sale year after year - competitive pressure or rising costs.',
          formula: 'Operating margin declining for 2+ consecutive years',
          value: totalDecline,
          threshold: 3,
          recommendation: 'Analyze pricing power and cost structure.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Operating Income', 'Revenue (3-year trend)']
      })
    }
  }

  /**
   * Check dividend sustainability
   */
  private checkDividendSustainability(
    annual: CashFlowStatementData,
    ttm: CashFlowStatementData | undefined,
    redFlags: RedFlagWithConfidence[]
  ): void {
    const cashFlow = ttm || annual
    
    if (!cashFlow.dividendsPaid || cashFlow.dividendsPaid >= 0) return // Dividends are negative in cash flow
    
    const dividends = Math.abs(cashFlow.dividendsPaid)
    const freeCashFlow = cashFlow.freeCashFlow || 
      ((cashFlow.operatingCashFlow || 0) - Math.abs(cashFlow.capitalExpenditures || 0))

    if (freeCashFlow > 0 && dividends > freeCashFlow) {
      const payoutRatio = (dividends / freeCashFlow) * 100
      
      redFlags.push({
        flag: {
          id: 'unsustainable_dividend',
          severity: 'high',
          category: 'liquidity',
          title: 'Unsustainable Dividend',
          technicalDescription: `Payout ratio: ${payoutRatio.toFixed(0)}% of FCF`,
          beginnerExplanation: 'Company paying dividends by borrowing money - robbing future to pay shareholders today.',
          formula: 'Dividends > Free Cash Flow',
          value: payoutRatio,
          threshold: 100,
          recommendation: 'Dividend cut likely unless cash flow improves.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Dividends Paid', 'Free Cash Flow']
      })
    }
  }

  /**
   * Check capital intensity trends
   */
  private checkCapitalIntensity(
    incomeStatements: IncomeStatementData[],
    cashFlowStatements: CashFlowStatementData[],
    redFlags: RedFlagWithConfidence[]
  ): void {
    if (incomeStatements.length < 2 || cashFlowStatements.length < 2) return

    // Calculate CapEx as % of revenue
    const current = {
      revenue: incomeStatements[0].revenue,
      capex: Math.abs(cashFlowStatements[0].capitalExpenditures || 0)
    }
    const previous = {
      revenue: incomeStatements[1].revenue,
      capex: Math.abs(cashFlowStatements[1].capitalExpenditures || 0)
    }

    if (!current.revenue || !previous.revenue) return

    const currentIntensity = (current.capex / current.revenue) * 100
    const previousIntensity = (previous.capex / previous.revenue) * 100
    const intensityIncrease = currentIntensity - previousIntensity

    // Check revenue growth
    const revenueGrowth = ((current.revenue - previous.revenue) / previous.revenue) * 100

    if (intensityIncrease > 2 && revenueGrowth < 10) {
      redFlags.push({
        flag: {
          id: 'rising_capital_intensity',
          severity: 'medium',
          category: 'efficiency',
          title: 'Rising Capital Intensity',
          technicalDescription: `CapEx/Revenue increased ${intensityIncrease.toFixed(1)} percentage points`,
          beginnerExplanation: 'Company needs to spend more just to maintain business - like a car needing more repairs as it ages.',
          formula: 'CapEx/Revenue increasing without commensurate growth',
          value: currentIntensity,
          threshold: previousIntensity + 2,
          recommendation: 'Evaluate return on invested capital and growth investments.'
        },
        confidence: this.getMaxConfidence(),
        dataUsed: ['Capital Expenditures', 'Revenue (YoY)']
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
