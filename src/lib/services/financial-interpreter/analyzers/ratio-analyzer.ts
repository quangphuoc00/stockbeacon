/**
 * Financial Ratio Analyzer
 * Calculates key financial ratios with beginner-friendly explanations
 */

import { FinancialStatements, IncomeStatementData, BalanceSheetData, CashFlowStatementData } from '@/types/stock'
import { FinancialRatio, RatioInterpretation } from '../types/interpreter-types'

export class RatioAnalyzer {
  /**
   * Calculate all financial ratios
   */
  async analyze(financialStatements: FinancialStatements): Promise<FinancialRatio[]> {
    const ratios: FinancialRatio[] = []
    
    // Get latest data and previous year for averages
    const latestIncome = financialStatements.incomeStatements.annual[0]
    const previousIncome = financialStatements.incomeStatements.annual[1]
    const latestBalance = financialStatements.balanceSheets.annual[0]
    const previousBalance = financialStatements.balanceSheets.annual[1]
    const latestCashFlow = financialStatements.cashFlowStatements.annual[0]
    
    // TTM data if available
    const ttmIncome = financialStatements.incomeStatements.ttm || latestIncome
    const ttmCashFlow = financialStatements.cashFlowStatements.ttm || latestCashFlow

    // Calculate ratios by category
    this.calculateLiquidityRatios(latestBalance, ratios)
    this.calculateProfitabilityRatios(ttmIncome, latestBalance, previousBalance, ratios)
    this.calculateEfficiencyRatios(ttmIncome, latestBalance, previousBalance, ratios)
    this.calculateLeverageRatios(ttmIncome, latestBalance, ratios)
    this.calculateCashFlowRatios(ttmIncome, ttmCashFlow, latestBalance, ratios)

    return ratios
  }

  /**
   * Calculate liquidity ratios
   */
  private calculateLiquidityRatios(balance: BalanceSheetData, ratios: FinancialRatio[]): void {
    // Current Ratio
    if (balance.currentAssets && balance.currentLiabilities && balance.currentLiabilities > 0) {
      const currentRatio = balance.currentAssets / balance.currentLiabilities
      
      ratios.push({
        id: 'current_ratio',
        name: 'Current Ratio',
        category: 'liquidity',
        value: currentRatio,
        formula: 'Current Assets / Current Liabilities',
        formulaDescription: 'Measures ability to pay short-term obligations',
        interpretation: this.interpretCurrentRatio(currentRatio)
      })
    }

    // Quick Ratio
    if (balance.currentAssets && balance.inventory !== null && balance.currentLiabilities && balance.currentLiabilities > 0) {
      const quickRatio = (balance.currentAssets - (balance.inventory || 0)) / balance.currentLiabilities
      
      ratios.push({
        id: 'quick_ratio',
        name: 'Quick Ratio (Acid Test)',
        category: 'liquidity',
        value: quickRatio,
        formula: '(Current Assets - Inventory) / Current Liabilities',
        formulaDescription: 'Measures immediate liquidity without selling inventory',
        interpretation: this.interpretQuickRatio(quickRatio)
      })
    }

    // Cash Ratio
    if (balance.cashAndCashEquivalents && balance.currentLiabilities && balance.currentLiabilities > 0) {
      const cashRatio = balance.cashAndCashEquivalents / balance.currentLiabilities
      
      ratios.push({
        id: 'cash_ratio',
        name: 'Cash Ratio',
        category: 'liquidity',
        value: cashRatio,
        formula: 'Cash & Equivalents / Current Liabilities',
        formulaDescription: 'Most conservative liquidity measure',
        interpretation: this.interpretCashRatio(cashRatio)
      })
    }

    // Working Capital
    if (balance.currentAssets && balance.currentLiabilities) {
      const workingCapital = balance.currentAssets - balance.currentLiabilities
      const workingCapitalRatio = balance.currentLiabilities > 0 ? 
        (workingCapital / balance.currentLiabilities) * 100 : 0
      
      ratios.push({
        id: 'working_capital_ratio',
        name: 'Working Capital Coverage',
        category: 'liquidity',
        value: workingCapitalRatio,
        formula: '(Current Assets - Current Liabilities) / Current Liabilities × 100',
        formulaDescription: 'Excess liquidity as % of short-term obligations',
        interpretation: this.interpretWorkingCapital(workingCapitalRatio)
      })
    }
  }

  /**
   * Calculate profitability ratios
   */
  private calculateProfitabilityRatios(
    income: IncomeStatementData,
    currentBalance: BalanceSheetData,
    previousBalance: BalanceSheetData | undefined,
    ratios: FinancialRatio[]
  ): void {
    // Gross Margin
    if (income.revenue && income.grossProfit !== null) {
      const grossMargin = (income.grossProfit / income.revenue) * 100
      
      ratios.push({
        id: 'gross_margin',
        name: 'Gross Profit Margin',
        category: 'profitability',
        value: grossMargin,
        formula: 'Gross Profit / Revenue × 100',
        formulaDescription: 'Profit after direct costs',
        interpretation: this.interpretGrossMargin(grossMargin),
        actualValues: {
          numerator: income.grossProfit,
          denominator: income.revenue
        }
      })
    }

    // Operating Margin
    if (income.revenue && income.operatingIncome) {
      const operatingMargin = (income.operatingIncome / income.revenue) * 100
      
      ratios.push({
        id: 'operating_margin',
        name: 'Operating Margin',
        category: 'profitability',
        value: operatingMargin,
        formula: 'Operating Income / Revenue × 100',
        formulaDescription: 'Profit from core business operations',
        interpretation: this.interpretOperatingMargin(operatingMargin)
      })
    }

    // Net Margin
    if (income.revenue && income.netIncome) {
      const netMargin = (income.netIncome / income.revenue) * 100
      
      ratios.push({
        id: 'net_margin',
        name: 'Net Profit Margin',
        category: 'profitability',
        value: netMargin,
        formula: 'Net Income / Revenue × 100',
        formulaDescription: 'Final profit after all expenses',
        interpretation: this.interpretNetMargin(netMargin)
      })
    }

    // ROE
    if (income.netIncome && currentBalance.totalShareholderEquity) {
      const avgEquity = previousBalance?.totalShareholderEquity ? 
        (currentBalance.totalShareholderEquity + previousBalance.totalShareholderEquity) / 2 :
        currentBalance.totalShareholderEquity
      
      const roe = avgEquity > 0 ? (income.netIncome / avgEquity) * 100 : null
      
      if (roe !== null) {
        ratios.push({
          id: 'roe',
          name: 'Return on Equity (ROE)',
          category: 'profitability',
          value: roe,
          formula: 'Net Income / Average Shareholders Equity × 100',
          formulaDescription: 'Return generated for shareholders',
          interpretation: this.interpretROE(roe)
        })
      }
    }

    // ROA
    if (income.netIncome && currentBalance.totalAssets) {
      const avgAssets = previousBalance?.totalAssets ? 
        (currentBalance.totalAssets + previousBalance.totalAssets) / 2 :
        currentBalance.totalAssets
      
      const roa = (income.netIncome / avgAssets) * 100
      
      ratios.push({
        id: 'roa',
        name: 'Return on Assets (ROA)',
        category: 'profitability',
        value: roa,
        formula: 'Net Income / Average Total Assets × 100',
        formulaDescription: 'How efficiently assets generate profit',
        interpretation: this.interpretROA(roa)
      })
    }

    // ROIC - Return on Invested Capital
    if (income.operatingIncome && income.incomeTaxExpense && income.incomeBeforeTax && 
        currentBalance.totalShareholderEquity && currentBalance.cashAndCashEquivalents !== null) {
      // Calculate NOPAT (Net Operating Profit After Tax)
      const taxRate = income.incomeBeforeTax > 0 ? income.incomeTaxExpense / income.incomeBeforeTax : 0.21 // Default to 21% if no tax data
      const nopat = income.operatingIncome * (1 - taxRate)
      
      // Calculate Invested Capital
      const totalDebt = (currentBalance.shortTermDebt || 0) + (currentBalance.longTermDebt || 0)
      const investedCapital = totalDebt + currentBalance.totalShareholderEquity - (currentBalance.cashAndCashEquivalents || 0)
      
      if (investedCapital > 0) {
        const roic = (nopat / investedCapital) * 100
        
        ratios.push({
          id: 'roic',
          name: 'Return on Invested Capital (ROIC)',
          category: 'profitability',
          value: roic,
          formula: 'NOPAT / (Debt + Equity - Cash) × 100',
          formulaDescription: 'True returns on ALL investor capital',
          interpretation: this.interpretROIC(roic),
          actualValues: {
            numerator: nopat,
            denominator: investedCapital
          }
        })
      }
    }
  }

  /**
   * Calculate efficiency ratios
   */
  private calculateEfficiencyRatios(
    income: IncomeStatementData,
    currentBalance: BalanceSheetData,
    previousBalance: BalanceSheetData | undefined,
    ratios: FinancialRatio[]
  ): void {
    // Asset Turnover
    if (income.revenue && currentBalance.totalAssets) {
      const avgAssets = previousBalance?.totalAssets ? 
        (currentBalance.totalAssets + previousBalance.totalAssets) / 2 :
        currentBalance.totalAssets
      
      const assetTurnover = income.revenue / avgAssets
      
      ratios.push({
        id: 'asset_turnover',
        name: 'Asset Turnover',
        category: 'efficiency',
        value: assetTurnover,
        formula: 'Revenue / Average Total Assets',
        formulaDescription: 'Revenue generated per dollar of assets',
        interpretation: this.interpretAssetTurnover(assetTurnover)
      })
    }

    // Inventory Turnover
    if (income.costOfRevenue && currentBalance.inventory && currentBalance.inventory > 0) {
      const avgInventory = previousBalance?.inventory ? 
        (currentBalance.inventory + previousBalance.inventory) / 2 :
        currentBalance.inventory
      
      const inventoryTurnover = Math.abs(income.costOfRevenue) / avgInventory
      const daysSales = 365 / inventoryTurnover
      
      ratios.push({
        id: 'inventory_turnover',
        name: 'Inventory Turnover',
        category: 'efficiency',
        value: inventoryTurnover,
        formula: 'Cost of Goods Sold / Average Inventory',
        formulaDescription: 'How quickly inventory sells',
        interpretation: this.interpretInventoryTurnover(inventoryTurnover, daysSales)
      })
    }

    // Receivables Turnover
    if (income.revenue && currentBalance.netReceivables && currentBalance.netReceivables > 0) {
      const avgReceivables = previousBalance?.netReceivables ? 
        (currentBalance.netReceivables + previousBalance.netReceivables) / 2 :
        currentBalance.netReceivables
      
      const receivablesTurnover = income.revenue / avgReceivables
      const daysSales = 365 / receivablesTurnover
      
      ratios.push({
        id: 'receivables_turnover',
        name: 'Receivables Turnover',
        category: 'efficiency',
        value: receivablesTurnover,
        formula: 'Revenue / Average Accounts Receivable',
        formulaDescription: 'How quickly customers pay',
        interpretation: this.interpretReceivablesTurnover(receivablesTurnover, daysSales)
      })
    }
  }

  /**
   * Calculate leverage ratios
   */
  private calculateLeverageRatios(
    income: IncomeStatementData,
    balance: BalanceSheetData,
    ratios: FinancialRatio[]
  ): void {
    const totalDebt = (balance.shortTermDebt || 0) + (balance.longTermDebt || 0)

    // Debt to Equity
    if (balance.totalShareholderEquity && balance.totalShareholderEquity > 0) {
      const debtToEquity = totalDebt / balance.totalShareholderEquity
      
      ratios.push({
        id: 'debt_to_equity',
        name: 'Debt-to-Equity Ratio',
        category: 'leverage',
        value: debtToEquity,
        formula: 'Total Debt / Total Equity',
        formulaDescription: 'Financial leverage level',
        interpretation: this.interpretDebtToEquity(debtToEquity)
      })
    }

    // Debt to Assets
    if (balance.totalAssets && balance.totalAssets > 0) {
      const debtToAssets = totalDebt / balance.totalAssets
      
      ratios.push({
        id: 'debt_to_assets',
        name: 'Debt-to-Assets Ratio',
        category: 'leverage',
        value: debtToAssets,
        formula: 'Total Debt / Total Assets',
        formulaDescription: 'Portion of assets financed by debt',
        interpretation: this.interpretDebtToAssets(debtToAssets)
      })
    }

    // Interest Coverage
    if (income.operatingIncome && income.interestExpense && income.interestExpense > 0) {
      const interestCoverage = income.operatingIncome / income.interestExpense
      
      ratios.push({
        id: 'interest_coverage',
        name: 'Interest Coverage Ratio',
        category: 'leverage',
        value: interestCoverage,
        formula: 'Operating Income / Interest Expense',
        formulaDescription: 'Ability to pay interest obligations',
        interpretation: this.interpretInterestCoverage(interestCoverage)
      })
    }

    // Equity Multiplier
    if (balance.totalAssets && balance.totalShareholderEquity && balance.totalShareholderEquity > 0) {
      const equityMultiplier = balance.totalAssets / balance.totalShareholderEquity
      
      ratios.push({
        id: 'equity_multiplier',
        name: 'Equity Multiplier',
        category: 'leverage',
        value: equityMultiplier,
        formula: 'Total Assets / Total Equity',
        formulaDescription: 'Assets per dollar of equity',
        interpretation: this.interpretEquityMultiplier(equityMultiplier)
      })
    }
  }

  /**
   * Calculate cash flow ratios
   */
  private calculateCashFlowRatios(
    income: IncomeStatementData,
    cashFlow: CashFlowStatementData,
    balance: BalanceSheetData,
    ratios: FinancialRatio[]
  ): void {
    // Operating Cash Flow Ratio
    if (cashFlow.operatingCashFlow && balance.currentLiabilities && balance.currentLiabilities > 0) {
      const ocfRatio = cashFlow.operatingCashFlow / balance.currentLiabilities
      
      ratios.push({
        id: 'operating_cash_flow_ratio',
        name: 'Operating Cash Flow Ratio',
        category: 'liquidity',
        value: ocfRatio,
        formula: 'Operating Cash Flow / Current Liabilities',
        formulaDescription: 'Cash generated vs short-term obligations',
        interpretation: this.interpretOCFRatio(ocfRatio)
      })
    }

    // Free Cash Flow Yield
    if (income.revenue && cashFlow.operatingCashFlow && cashFlow.capitalExpenditures) {
      const fcf = cashFlow.freeCashFlow || 
        (cashFlow.operatingCashFlow - Math.abs(cashFlow.capitalExpenditures))
      const fcfMargin = (fcf / income.revenue) * 100
      
      ratios.push({
        id: 'fcf_margin',
        name: 'Free Cash Flow Margin',
        category: 'profitability',
        value: fcfMargin,
        formula: 'Free Cash Flow / Revenue × 100',
        formulaDescription: 'Cash available after reinvestment',
        interpretation: this.interpretFCFMargin(fcfMargin)
      })
    }

    // Cash Flow to Net Income
    if (cashFlow.operatingCashFlow && income.netIncome && income.netIncome !== 0) {
      const cfToNI = cashFlow.operatingCashFlow / income.netIncome
      
      ratios.push({
        id: 'cash_flow_to_net_income',
        name: 'OCF/Net Income (Earnings Quality)',
        category: 'profitability',
        value: cfToNI,
        formula: 'Operating Cash Flow / Net Income',
        formulaDescription: 'Quality of earnings',
        interpretation: this.interpretCashFlowQuality(cfToNI),
        actualValues: {
          numerator: cashFlow.operatingCashFlow,
          denominator: income.netIncome
        }
      })
    }
  }

  // Interpretation methods for each ratio
  private interpretCurrentRatio(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value >= 2) score = 'excellent'
    else if (value >= 1.5) score = 'good'
    else if (value >= 1) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Company has $${value.toFixed(2)} in current assets for every $1 of short-term debt. ${
        value >= 1.5 ? 'Healthy cushion for paying bills.' :
        value >= 1 ? 'Can pay bills but limited cushion.' :
        'May struggle to pay short-term obligations.'
      }`,
      benchmark: { excellent: 2, good: 1.5, fair: 1, poor: 0.5 },
      industryContext: 'Retail and manufacturing typically need higher ratios than service companies.'
    }
  }

  private interpretQuickRatio(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value >= 1.5) score = 'excellent'
    else if (value >= 1) score = 'good'
    else if (value >= 0.5) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Without selling inventory, company has $${value.toFixed(2)} for every $1 of near-term bills. ${
        value >= 1 ? 'Can meet obligations without inventory sales.' :
        'Would need to sell inventory to pay all bills.'
      }`,
      benchmark: { excellent: 1.5, good: 1, fair: 0.5, poor: 0.25 }
    }
  }

  private interpretCashRatio(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value >= 1) score = 'excellent'
    else if (value >= 0.5) score = 'good'
    else if (value >= 0.2) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Company can immediately pay ${(value * 100).toFixed(0)}% of short-term debts with cash on hand. ${
        value >= 0.5 ? 'Strong cash position.' :
        'Limited immediate liquidity.'
      }`,
      benchmark: { excellent: 1, good: 0.5, fair: 0.2, poor: 0.1 }
    }
  }

  private interpretWorkingCapital(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value >= 100) score = 'excellent'
    else if (value >= 50) score = 'good'
    else if (value >= 0) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: value >= 0 ? 
        `Company has ${value.toFixed(0)}% extra liquidity beyond immediate needs.` :
        `Working capital deficit - needs external funding for operations.`,
      benchmark: { excellent: 100, good: 50, fair: 0, poor: -50 }
    }
  }

  private interpretGrossMargin(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value >= 40) score = 'excellent'
    else if (value >= 30) score = 'good'
    else if (value >= 20) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Company keeps $${value.toFixed(0)} as gross profit for every $100 in sales. ${
        value >= 40 ? 'Strong pricing power or low production costs.' :
        value >= 20 ? 'Reasonable profit after direct costs.' :
        'Low profitability - competitive pressure or high costs.'
      }`,
      benchmark: { excellent: 40, good: 30, fair: 20, poor: 10 },
      industryContext: 'Software: 70-80%, Retail: 25-35%, Manufacturing: 20-30%'
    }
  }

  private interpretOperatingMargin(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value >= 20) score = 'excellent'
    else if (value >= 15) score = 'good'
    else if (value >= 10) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Company earns $${value.toFixed(1)} in operating profit per $100 of sales. ${
        value >= 15 ? 'Efficiently run operations.' :
        value >= 10 ? 'Decent operational efficiency.' :
        value >= 0 ? 'Low operational efficiency.' :
        'Losing money on operations.'
      }`,
      benchmark: { excellent: 20, good: 15, fair: 10, poor: 5 }
    }
  }

  private interpretNetMargin(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value >= 15) score = 'excellent'
    else if (value >= 10) score = 'good'
    else if (value >= 5) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Company keeps $${value.toFixed(1)} as final profit for every $100 in sales. ${
        value >= 10 ? 'Strong bottom-line profitability.' :
        value >= 5 ? 'Reasonable final margins.' :
        value >= 0 ? 'Thin profit margins.' :
        'Losing money overall.'
      }`,
      benchmark: { excellent: 15, good: 10, fair: 5, poor: 0 }
    }
  }

  private interpretROE(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value >= 20) score = 'excellent'
    else if (value >= 15) score = 'good'
    else if (value >= 10) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Shareholders earn ${value.toFixed(1)}% annual return on their investment. ${
        value >= 20 ? 'Exceptional returns - better than most investments!' :
        value >= 15 ? 'Good returns for shareholders.' :
        value >= 10 ? 'Adequate returns.' :
        'Poor returns - consider alternatives.'
      }`,
      benchmark: { excellent: 20, good: 15, fair: 10, poor: 5 },
      industryContext: 'Compare to S&P 500 average of ~14%'
    }
  }

  private interpretROA(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value >= 10) score = 'excellent'
    else if (value >= 7) score = 'good'
    else if (value >= 5) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Company generates $${value.toFixed(1)} profit annually per $100 of assets. ${
        value >= 7 ? 'Efficient use of assets.' :
        value >= 5 ? 'Adequate asset productivity.' :
        'Poor asset utilization.'
      }`,
      benchmark: { excellent: 10, good: 7, fair: 5, poor: 2 }
    }
  }

  private interpretROIC(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value >= 20) score = 'excellent'
    else if (value >= 15) score = 'good'
    else if (value >= 10) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Company generates $${value.toFixed(1)} profit annually per $100 of total investor capital. ${
        value >= 20 ? 'Exceptional returns - likely has strong competitive advantage.' :
        value >= 15 ? 'Great capital efficiency - well-managed business.' :
        value >= 10 ? 'Acceptable returns - verify it exceeds cost of capital.' :
        'Poor returns - may be destroying shareholder value.'
      }`,
      benchmark: { excellent: 20, good: 15, fair: 10, poor: 5 }
    }
  }

  private interpretAssetTurnover(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value >= 2) score = 'excellent'
    else if (value >= 1.5) score = 'good'
    else if (value >= 1) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Company generates $${value.toFixed(2)} in sales for every $1 of assets. ${
        value >= 1.5 ? 'Very efficient asset use.' :
        value >= 1 ? 'Reasonable asset efficiency.' :
        'Assets underutilized.'
      }`,
      benchmark: { excellent: 2, good: 1.5, fair: 1, poor: 0.5 },
      industryContext: 'Retail: 2-3x, Manufacturing: 1-2x, Utilities: 0.3-0.5x'
    }
  }

  private interpretInventoryTurnover(value: number, days: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value >= 12) score = 'excellent'
    else if (value >= 6) score = 'good'
    else if (value >= 4) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Inventory sells ${value.toFixed(1)} times per year (every ${days.toFixed(0)} days). ${
        value >= 8 ? 'Fast-moving inventory - fresh products.' :
        value >= 4 ? 'Good inventory management.' :
        'Slow inventory - risk of obsolescence.'
      }`,
      benchmark: { excellent: 12, good: 6, fair: 4, poor: 2 },
      industryContext: 'Grocery: 12-15x, Electronics: 5-6x, Luxury goods: 1-2x'
    }
  }

  private interpretReceivablesTurnover(value: number, days: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (days <= 30) score = 'excellent'
    else if (days <= 45) score = 'good'
    else if (days <= 60) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Customers pay within ${days.toFixed(0)} days on average. ${
        days <= 30 ? 'Excellent collection - strong customer relationships.' :
        days <= 45 ? 'Good payment collection.' :
        days <= 60 ? 'Acceptable collection period.' :
        'Slow collections - cash flow impact.'
      }`,
      benchmark: { excellent: 12, good: 8, fair: 6, poor: 4 },
      industryContext: 'Net 30 is standard for most industries'
    }
  }

  private interpretDebtToEquity(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value <= 0.5) score = 'excellent'
    else if (value <= 1) score = 'good'
    else if (value <= 2) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Company has $${value.toFixed(2)} of debt for every $1 of equity. ${
        value <= 0.5 ? 'Conservative financing - low risk.' :
        value <= 1 ? 'Balanced debt levels.' :
        value <= 2 ? 'Significant leverage - monitor closely.' :
        'High financial risk.'
      }`,
      benchmark: { excellent: 0.5, good: 1, fair: 2, poor: 3 },
      industryContext: 'Utilities and real estate typically have higher ratios'
    }
  }

  private interpretDebtToAssets(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value <= 0.3) score = 'excellent'
    else if (value <= 0.5) score = 'good'
    else if (value <= 0.7) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `${(value * 100).toFixed(0)}% of assets are financed by debt. ${
        value <= 0.3 ? 'Most assets owned outright - very safe.' :
        value <= 0.5 ? 'Reasonable debt financing.' :
        'High debt dependency.'
      }`,
      benchmark: { excellent: 0.3, good: 0.5, fair: 0.7, poor: 0.8 }
    }
  }

  private interpretInterestCoverage(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value >= 5) score = 'excellent'
    else if (value >= 3) score = 'good'
    else if (value >= 2) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Company earns ${value.toFixed(1)}x its interest payments. ${
        value >= 3 ? 'Comfortable interest coverage.' :
        value >= 2 ? 'Adequate coverage but limited cushion.' :
        value >= 1 ? 'Barely covering interest - risky.' :
        'Cannot cover interest from operations.'
      }`,
      benchmark: { excellent: 5, good: 3, fair: 2, poor: 1 }
    }
  }

  private interpretEquityMultiplier(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value <= 2) score = 'excellent'
    else if (value <= 3) score = 'good'
    else if (value <= 4) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Company controls $${value.toFixed(2)} of assets per $1 of equity. ${
        value <= 2 ? 'Conservative leverage.' :
        value <= 3 ? 'Moderate leverage use.' :
        'High leverage - amplifies both gains and losses.'
      }`,
      benchmark: { excellent: 2, good: 3, fair: 4, poor: 5 }
    }
  }

  private interpretOCFRatio(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value >= 1) score = 'excellent'
    else if (value >= 0.5) score = 'good'
    else if (value >= 0.2) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Operating cash covers ${(value * 100).toFixed(0)}% of short-term debts. ${
        value >= 1 ? 'Can pay all short-term debts from operations.' :
        value >= 0.5 ? 'Good cash generation vs obligations.' :
        'Limited cash coverage.'
      }`,
      benchmark: { excellent: 1, good: 0.5, fair: 0.2, poor: 0.1 }
    }
  }

  private interpretFCFMargin(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value >= 15) score = 'excellent'
    else if (value >= 10) score = 'good'
    else if (value >= 5) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Company converts ${value.toFixed(1)}% of sales into free cash. ${
        value >= 15 ? 'Exceptional cash generation!' :
        value >= 10 ? 'Strong free cash flow.' :
        value >= 5 ? 'Decent cash generation.' :
        value >= 0 ? 'Limited free cash.' :
        'Burning cash.'
      }`,
      benchmark: { excellent: 15, good: 10, fair: 5, poor: 0 }
    }
  }

  private interpretCashFlowQuality(value: number): RatioInterpretation {
    let score: 'excellent' | 'good' | 'fair' | 'poor'
    if (value >= 1.2) score = 'excellent'
    else if (value >= 1) score = 'good'
    else if (value >= 0.8) score = 'fair'
    else score = 'poor'

    return {
      score,
      beginnerExplanation: `Cash flow is ${value.toFixed(2)}x reported profits. ${
        value >= 1.2 ? 'High-quality earnings backed by cash.' :
        value >= 1 ? 'Earnings converting well to cash.' :
        value >= 0.8 ? 'Some earnings not yet collected.' :
        'Earnings quality concern - profits not becoming cash.'
      }`,
      benchmark: { excellent: 1.2, good: 1, fair: 0.8, poor: 0.5 }
    }
  }
}
