// Ensure URLSearchParams is available in Node.js environment
import { URLSearchParams as NodeURLSearchParams } from 'url'

// Apply polyfill if needed
if (typeof globalThis.URLSearchParams === 'undefined') {
  (globalThis as any).URLSearchParams = NodeURLSearchParams
}

import { StockQuote, StockFinancials, StockHistorical } from '@/types/stock'
import yahooFinance from 'yahoo-finance2'

export interface ValuationResult {
  method: string
  value: number
  description: string
  definition: string
  whenToUse: string
  confidence: 'high' | 'medium' | 'low'
  color: string
  missingData?: string
  calculationData?: {
    formula: string
    inputs: Record<string, {
      value: number
      source: 'yahoo-finance' | 'hardcoded' | 'calculated'
    }>
    steps: Array<{
      description: string
      calculation: string
      result: number
    }>
  }
}

export interface ComprehensiveValuation {
  currentPrice: number
  averageIntrinsicValue: number
  upside: number
  valuations: ValuationResult[]
  recommendation: 'undervalued' | 'fair' | 'overvalued'
  calculatedAt: Date
}

export type ValuationLevel = 
  | 'highly_undervalued'   // < -20%
  | 'undervalued'          // -20% to -10%
  | 'fairly_valued'        // -10% to +10%
  | 'overvalued'           // +10% to +20%
  | 'highly_overvalued'    // > +20%

export interface ValuationCategory {
  level: ValuationLevel
  discountPremium: number // Percentage from fair value (-25 means 25% undervalued)
  confidence: 'high' | 'medium' | 'low'
  fairValue: number
  currentPrice: number
}

export class ValuationService {
  private static readonly DISCOUNT_RATE = 0.10 // 10% default discount rate
  private static readonly TERMINAL_GROWTH = 0.03 // 3% perpetual growth
  private static readonly RISK_FREE_RATE = 0.04 // 4% risk-free rate (10-year treasury)
  private static readonly MARKET_RETURN = 0.10 // 10% historical market return

  /**
   * Get missing data fields that can be manually input
   */
  static async getMissingDataFields(
    symbol: string,
    quote: StockQuote,
    financials: StockFinancials
  ): Promise<{
    operatingCashflow?: { needed: boolean; description: string; currentValue?: number }
    shareholderEquity?: { needed: boolean; description: string; currentValue?: number }
    pegRatio?: { needed: boolean; description: string; currentValue?: number }
    earningsGrowth?: { needed: boolean; description: string; currentValue?: number }
  }> {
    const [detailedFinancials] = await Promise.all([
      this.getDetailedFinancials(symbol)
    ])
    
    const missingFields: any = {}
    
    // Check for operating cash flow (needed for DCF-20)
    const hasOperatingCashflow = detailedFinancials.operatingCashflow || 
      (financials.freeCashflow && detailedFinancials.capitalExpenditures)
    
    if (!hasOperatingCashflow) {
      missingFields.operatingCashflow = {
        needed: true,
        description: 'Operating Cash Flow (needed for DCF-20)',
        currentValue: financials.freeCashflow || undefined
      }
    }
    
    // Check for shareholder equity (needed for Mean P/B)
    if (!financials.shareholderEquity && financials.priceToBook) {
      missingFields.shareholderEquity = {
        needed: true,
        description: 'Shareholder Equity / Book Value (needed for Mean P/B)',
        currentValue: undefined
      }
    }
    
    // Check for PEG ratio or earnings growth (needed for PEG Ratio)
    const hasEarningsGrowth = detailedFinancials.earningsGrowth && detailedFinancials.earningsGrowth > 0
    const hasPegRatio = financials.pegRatio
    
    if (quote.peRatio && !hasPegRatio && !hasEarningsGrowth) {
      missingFields.earningsGrowth = {
        needed: true,
        description: 'Earnings Growth Rate % (needed for PEG Ratio)',
        currentValue: undefined
      }
    }
    
    return missingFields
  }

  /**
   * Calculate comprehensive valuation using multiple methods
   */
  static async calculateValuation(
    symbol: string,
    quote: StockQuote,
    financials: StockFinancials,
    customGrowthRates?: {
      growthRate1to5?: number
      growthRate6to10?: number
      growthRate11to20?: number
      discountRate?: number
    },
    manualInputs?: {
      operatingCashflow?: number
      shareholderEquity?: number
      pegRatio?: number
      earningsGrowth?: number
    }
  ): Promise<ComprehensiveValuation> {
    const valuations: ValuationResult[] = []
    
    // Get additional data needed for calculations
    const [historicalData, detailedFinancials] = await Promise.all([
      this.getHistoricalFinancials(symbol),
      this.getDetailedFinancials(symbol)
    ])

    const currentPrice = quote.price
    const sharesOutstanding = quote.sharesOutstanding || 1

    // 1. DCF 20 - Discounted Cash Flow
    // Note: Can also use free cash flow + capex as an approximation if operating cash flow is missing
    const operatingCashflowAvailable = manualInputs?.operatingCashflow ||
      detailedFinancials.operatingCashflow || 
      (financials.freeCashflow && detailedFinancials.capitalExpenditures 
        ? financials.freeCashflow + Math.abs(detailedFinancials.capitalExpenditures) 
        : 0) // Default to 0 to show method with placeholder
    
    // Always show DCF-20
    {
      const operatingCashflow = operatingCashflowAvailable
      const historicalGrowth = detailedFinancials.cashflowGrowth || 0.05
      
      // Set up 3-period growth model
      const growthRate1to5 = Math.min(Math.max(historicalGrowth, -0.50), 0.50)
      const growthRate6to10 = growthRate1to5 * 0.75
      const growthRate11to20 = 0.04
      
      const dcfValue = this.calculateDCF(
        operatingCashflow,
        growthRate1to5,
        growthRate6to10,
        growthRate11to20,
        sharesOutstanding
      )
      
      // Calculate intermediate values for the calculation breakdown
      const year5CF = operatingCashflow * Math.pow(1 + growthRate1to5, 5)
      const year10CF = year5CF * Math.pow(1 + growthRate6to10, 5)
      const year20CF = year10CF * Math.pow(1 + growthRate11to20, 10)
      const terminalValue = (year20CF * (1 + growthRate11to20)) / (this.DISCOUNT_RATE - growthRate11to20)
      
      valuations.push({
        method: 'DCF-20',
        value: dcfValue,
        description: 'Discounted Cash Flow 20-year',
        definition: 'Projects future operating cash flows for 20 years and discounts them to present value using a required rate of return.',
        whenToUse: 'Best for mature companies with stable cash flows.',
        confidence: operatingCashflowAvailable === 0 ? 'low' : 'high',
        color: operatingCashflowAvailable === 0 ? '#6b7280' : (dcfValue > currentPrice ? '#10b981' : '#ef4444'),
        missingData: operatingCashflowAvailable === 0 ? 'Operating Cash Flow required' : undefined,
        calculationData: {
          formula: 'DCF = Σ(CF₍ₜ₎/(1+r)ᵗ) + Terminal Value/(1+r)²⁰',
          inputs: {
            'Operating Cash Flow': {
              value: operatingCashflow,
              source: 'yahoo-finance'
            },
            'Growth Rate (Year 1-5)': {
              value: growthRate1to5,
              source: historicalGrowth !== 0.05 ? 'calculated' : 'hardcoded'
            },
            'Growth Rate (Year 6-10)': {
              value: growthRate6to10,
              source: 'calculated'
            },
            'Growth Rate (Year 11-20)': {
              value: growthRate11to20,
              source: 'hardcoded'
            },
            'Discount Rate': {
              value: this.DISCOUNT_RATE,
              source: 'hardcoded'
            },
            'Shares Outstanding': {
              value: sharesOutstanding,
              source: 'yahoo-finance'
            }
          },
          steps: [
            {
              description: 'Years 1-5: High growth phase',
              calculation: `CF × (1 + ${(growthRate1to5 * 100).toFixed(1)}%)^5`,
              result: year5CF
            },
            {
              description: 'Years 6-10: Moderate growth',
              calculation: `Year 5 CF × (1 + ${(growthRate6to10 * 100).toFixed(1)}%)^5`,
              result: year10CF
            },
            {
              description: 'Years 11-20: Mature growth',
              calculation: `Year 10 CF × (1 + ${(growthRate11to20 * 100).toFixed(1)}%)^10`,
              result: year20CF
            },
            {
              description: 'Terminal Value (Year 20)',
              calculation: `(Year 20 CF × (1 + ${(this.TERMINAL_GROWTH * 100).toFixed(1)}%)) / (${(this.DISCOUNT_RATE * 100).toFixed(1)}% - ${(this.TERMINAL_GROWTH * 100).toFixed(1)}%)`,
              result: terminalValue
            },
            {
              description: 'Per Share Value',
              calculation: `Total Present Value / ${sharesOutstanding.toLocaleString()} shares`,
              result: dcfValue
            }
          ]
        }
      })
    }

    // 2. DFCF 20 - Discounted Free Cash Flow
    if (financials.freeCashflow) {
      const freeCashflow = financials.freeCashflow
      const totalDebt = financials.totalDebt || 0
      const totalCash = financials.totalCash || 0
      
      // Calculate growth rates based on historical data or use defaults
      const historicalGrowth = detailedFinancials.fcfGrowth || 0.10
      
      // Set up 3-period growth model
      // Use custom rates if provided, otherwise calculate defaults
      const growthRate1to5 = customGrowthRates?.growthRate1to5 !== undefined 
        ? customGrowthRates.growthRate1to5
        : Math.min(Math.max(historicalGrowth, -0.50), 0.50) // Cap between -50% and 50%
      
      const growthRate6to10 = customGrowthRates?.growthRate6to10 !== undefined
        ? customGrowthRates.growthRate6to10
        : growthRate1to5 * 0.75 // Moderate decay to ~75% of initial rate
      
      const growthRate11to20 = customGrowthRates?.growthRate11to20 !== undefined
        ? customGrowthRates.growthRate11to20
        : 0.04 // Long-term GDP-like growth (3-4%)
      
      const discountRate = customGrowthRates?.discountRate !== undefined
        ? customGrowthRates.discountRate
        : this.DISCOUNT_RATE
      
      const dfcfValue = this.calculateDCF(
        freeCashflow,
        growthRate1to5,
        growthRate6to10,
        growthRate11to20,
        sharesOutstanding,
        totalDebt,
        totalCash,
        discountRate
      )
      
      valuations.push({
        method: 'DFCF-20',
        value: dfcfValue,
        description: 'Discounted Free Cash Flow 20-year',
        definition: 'Uses free cash flow (cash after capital expenditures) projected over 20 years, discounted to present value.',
        whenToUse: 'Gold standard. Best for profitable companies with strong cash generation.',
        confidence: 'high',
        color: dfcfValue > currentPrice ? '#10b981' : '#ef4444',
        calculationData: {
          formula: 'Equity Value = (Σ(FCF₍ₜ₎/(1+r)ᵗ) - Total Debt + Cash) / Shares',
          inputs: {
            'Free Cash Flow': {
              value: freeCashflow,
              source: 'yahoo-finance'
            },
            'Total Debt': {
              value: totalDebt,
              source: 'yahoo-finance'
            },
            'Cash & ST Investments': {
              value: totalCash,
              source: 'yahoo-finance'
            },
            'Discount Rate': {
              value: discountRate,
              source: customGrowthRates?.discountRate !== undefined ? 'calculated' : 'hardcoded'
            },
            'Shares Outstanding': {
              value: sharesOutstanding,
              source: 'yahoo-finance'
            },
            'Growth Rate (Year 1-5)': {
              value: growthRate1to5,
              source: historicalGrowth !== 0.10 ? 'calculated' : 'hardcoded'
            },
            'Growth Rate (Year 6-10)': {
              value: growthRate6to10,
              source: 'calculated'
            },
            'Growth Rate (Year 11-20)': {
              value: growthRate11to20,
              source: 'hardcoded'
            }
          },
          steps: [
            {
              description: 'Current Free Cash Flow',
              calculation: 'Operating Cash Flow - Capital Expenditures',
              result: freeCashflow
            },
            {
              description: 'Year 5 FCF Projection',
              calculation: `FCF × (1 + ${(growthRate1to5 * 100).toFixed(1)}%)^5`,
              result: freeCashflow * Math.pow(1 + growthRate1to5, 5)
            },
            {
              description: 'Year 10 FCF Projection',
              calculation: `Year 5 FCF × (1 + ${(growthRate6to10 * 100).toFixed(1)}%)^5`,
              result: freeCashflow * Math.pow(1 + growthRate1to5, 5) * Math.pow(1 + growthRate6to10, 5)
            },
            {
              description: 'Year 20 FCF Projection',
              calculation: `Year 10 FCF × (1 + ${(growthRate11to20 * 100).toFixed(1)}%)^10`,
              result: freeCashflow * Math.pow(1 + growthRate1to5, 5) * Math.pow(1 + growthRate6to10, 5) * Math.pow(1 + growthRate11to20, 10)
            },
            {
              description: 'Enterprise Value (PV of FCFs)',
              calculation: `Sum of 20 years discounted at ${(discountRate * 100).toFixed(1)}%`,
              result: (dfcfValue * sharesOutstanding + totalDebt - totalCash)
            },
            {
              description: 'Less: Total Debt',
              calculation: 'Debt holders have priority claim',
              result: -totalDebt
            },
            {
              description: 'Plus: Cash & Investments',
              calculation: 'Net asset to equity holders',
              result: totalCash
            },
            {
              description: 'Equity Value',
              calculation: 'Enterprise Value - Debt + Cash',
              result: (dfcfValue * sharesOutstanding)
            },
            {
              description: 'Per Share Value',
              calculation: `Equity Value / ${sharesOutstanding.toLocaleString()} shares`,
              result: dfcfValue
            }
          ]
        }
      })
    }

    // 3. DNI 20 - Discounted Net Income
    if (financials.netIncome) {
      const netIncome = financials.netIncome
      const historicalGrowth = financials.earningsGrowth || 0.05
      
      // Set up 3-period growth model
      const growthRate1to5 = Math.min(Math.max(historicalGrowth, -0.50), 0.50)
      const growthRate6to10 = growthRate1to5 * 0.75
      const growthRate11to20 = 0.04
      
      const dniValue = this.calculateDCF(
        netIncome,
        growthRate1to5,
        growthRate6to10,
        growthRate11to20,
        sharesOutstanding
      )
      
      valuations.push({
        method: 'DNI-20',
        value: dniValue,
        description: 'Discounted Net Income 20-year',
        definition: 'Projects net income (bottom-line earnings) for 20 years and discounts to present value.',
        whenToUse: 'Use for banks and financials where earnings matter more than cash flow.',
        confidence: 'medium',
        color: dniValue > currentPrice ? '#10b981' : '#ef4444',
        calculationData: {
          formula: 'DNI = Σ(NI₍ₜ₎/(1+r)ᵗ) + Terminal Value/(1+r)²⁰',
          inputs: {
            'Net Income': {
              value: netIncome,
              source: 'yahoo-finance'
            },
            'Growth Rate (Year 1-5)': {
              value: growthRate1to5,
              source: historicalGrowth !== 0.05 ? 'calculated' : 'hardcoded'
            },
            'Growth Rate (Year 6-10)': {
              value: growthRate6to10,
              source: 'calculated'
            },
            'Growth Rate (Year 11-20)': {
              value: growthRate11to20,
              source: 'hardcoded'
            },
            'Discount Rate': {
              value: this.DISCOUNT_RATE,
              source: 'hardcoded'
            },
            'Shares Outstanding': {
              value: sharesOutstanding,
              source: 'yahoo-finance'
            }
          },
          steps: [
            {
              description: 'Current Net Income',
              calculation: 'Annual bottom-line earnings',
              result: netIncome
            },
            {
              description: 'Year 5 Projected Income',
              calculation: `NI × (1 + ${(growthRate1to5 * 100).toFixed(1)}%)^5`,
              result: netIncome * Math.pow(1 + growthRate1to5, 5)
            },
            {
              description: 'Year 20 Terminal Income',
              calculation: `With 3-period growth model`,
              result: netIncome * Math.pow(1 + growthRate1to5, 5) * Math.pow(1 + growthRate6to10, 5) * Math.pow(1 + growthRate11to20, 10)
            },
            {
              description: 'Present Value',
              calculation: `Discounted at ${(this.DISCOUNT_RATE * 100).toFixed(1)}%`,
              result: dniValue * sharesOutstanding
            },
            {
              description: 'Per Share Value',
              calculation: `Total PV / ${sharesOutstanding.toLocaleString()} shares`,
              result: dniValue
            }
          ]
        }
      })
    }

    // 4. DFCF-Terminal - With terminal value only
    if (financials.freeCashflow) {
      const freeCashflow = financials.freeCashflow
      const historicalGrowth = detailedFinancials.fcfGrowth || 0.10
      const fcfGrowthRate = Math.min(Math.max(historicalGrowth, -0.50), 0.50)
      const terminalGrowthRate = 0.04 // Long-term GDP-like growth
      const totalDebt = financials.totalDebt || 0
      const totalCash = financials.totalCash || 0
      const terminalValue = this.calculateTerminalValue(
        freeCashflow,
        fcfGrowthRate,
        terminalGrowthRate,
        sharesOutstanding,
        totalDebt,
        totalCash
      )
      
      const year5FCF = freeCashflow * Math.pow(1 + fcfGrowthRate, 5)
      const terminalValueTotal = (year5FCF * (1 + terminalGrowthRate)) / (this.DISCOUNT_RATE - terminalGrowthRate)
      
      valuations.push({
        method: 'DFCF-Terminal',
        value: terminalValue,
        description: 'Discounted FCF Terminal Value',
        definition: 'Estimates company value based on perpetual growth assumption after 5 years using Gordon Growth Model.',
        whenToUse: 'Quick check for stable, mature businesses.',
        confidence: 'medium',
        color: terminalValue > currentPrice ? '#10b981' : '#ef4444',
        calculationData: {
          formula: 'Equity Value = ((FCF₅ × (1 + g)) / (r - g) - Total Debt + Cash) / Shares',
          inputs: {
            'Current Free Cash Flow': {
              value: freeCashflow,
              source: 'yahoo-finance'
            },
            'FCF Growth Rate (5 years)': {
              value: fcfGrowthRate,
              source: 'hardcoded'
            },
            'Terminal Growth Rate (g)': {
              value: this.TERMINAL_GROWTH,
              source: 'hardcoded'
            },
            'Discount Rate (r)': {
              value: this.DISCOUNT_RATE,
              source: 'hardcoded'
            },
            'Total Debt': {
              value: totalDebt,
              source: 'yahoo-finance'
            },
            'Cash & ST Investments': {
              value: totalCash,
              source: 'yahoo-finance'
            },
            'Shares Outstanding': {
              value: sharesOutstanding,
              source: 'yahoo-finance'
            }
          },
          steps: [
            {
              description: 'Year 5 FCF Projection',
              calculation: `FCF × (1 + ${(fcfGrowthRate * 100).toFixed(1)}%)^5`,
              result: year5FCF
            },
            {
              description: 'Terminal Value (Year 6+)',
              calculation: `(Year 5 FCF × (1 + ${(this.TERMINAL_GROWTH * 100).toFixed(1)}%)) / (${(this.DISCOUNT_RATE * 100).toFixed(1)}% - ${(this.TERMINAL_GROWTH * 100).toFixed(1)}%)`,
              result: terminalValueTotal
            },
            {
              description: 'Present Value (Enterprise)',
              calculation: `Terminal Value / (1 + ${(this.DISCOUNT_RATE * 100).toFixed(1)}%)^5`,
              result: terminalValueTotal / Math.pow(1 + this.DISCOUNT_RATE, 5)
            },
            {
              description: 'Less: Total Debt',
              calculation: 'Debt holders claim',
              result: -totalDebt
            },
            {
              description: 'Plus: Cash & Investments',
              calculation: 'Net asset to equity',
              result: totalCash
            },
            {
              description: 'Equity Value',
              calculation: 'Enterprise Value - Debt + Cash',
              result: (terminalValue * sharesOutstanding)
            },
            {
              description: 'Per Share Value',
              calculation: `Equity Value / ${sharesOutstanding.toLocaleString()} shares`,
              result: terminalValue
            }
          ]
        }
      })
    }

    // 5. Mean P/S Ratio
    if (financials.priceToSales && financials.revenue) {
      const currentPS = financials.priceToSales
      const historicalPS = historicalData.averagePS || financials.priceToSales
      const psValue = this.calculateMultipleValuation(
        historicalPS,
        financials.revenue,
        sharesOutstanding
      )
      
      valuations.push({
        method: 'Mean P/S',
        value: psValue,
        description: 'Mean Price to Sales Ratio',
        definition: 'Values company based on historical average Price-to-Sales ratio multiplied by current revenue.',
        whenToUse: 'Best for unprofitable growth companies or SaaS businesses.',
        confidence: 'medium',
        color: psValue > currentPrice ? '#eab308' : '#ef4444',
        calculationData: {
          formula: 'Fair Value = (Historical P/S × Revenue) / Shares Outstanding',
          inputs: {
            'Total Revenue': {
              value: financials.revenue,
              source: 'yahoo-finance'
            },
            'Current P/S Ratio': {
              value: currentPS,
              source: 'yahoo-finance'
            },
            'Historical Average P/S': {
              value: historicalPS,
              source: historicalData.averagePS ? 'calculated' : 'hardcoded'
            },
            'Shares Outstanding': {
              value: sharesOutstanding,
              source: 'yahoo-finance'
            }
          },
          steps: [
            {
              description: 'Revenue Per Share',
              calculation: `Revenue / ${sharesOutstanding.toLocaleString()} shares`,
              result: financials.revenue / sharesOutstanding
            },
            {
              description: 'Current Market Cap',
              calculation: `Current P/S × Revenue = ${currentPS.toFixed(1)} × ${financials.revenue.toLocaleString()}`,
              result: currentPS * financials.revenue
            },
            {
              description: 'Fair Market Cap',
              calculation: `Historical P/S × Revenue = ${historicalPS.toFixed(1)} × ${financials.revenue.toLocaleString()}`,
              result: historicalPS * financials.revenue
            },
            {
              description: 'Fair Value Per Share',
              calculation: `Fair Market Cap / ${sharesOutstanding.toLocaleString()} shares`,
              result: psValue
            }
          ]
        }
      })
    }

    // 6. Mean P/E Ratio
    if (quote.peRatio && financials.netIncome) {
      const historicalPE = historicalData.averagePE || Math.min(quote.peRatio, 30)
      const currentPE = quote.peRatio
      const peValue = this.calculateMultipleValuation(
        historicalPE,
        financials.netIncome,
        sharesOutstanding
      )
      
      valuations.push({
        method: 'Mean P/E',
        value: peValue,
        description: 'Mean Price to Earnings Ratio',
        definition: 'Uses historical average P/E ratio multiplied by current earnings to estimate fair value.',
        whenToUse: 'Most common metric. Best for profitable companies, compare within industry.',
        confidence: 'high',
        color: peValue > currentPrice ? '#10b981' : '#ef4444',
        calculationData: {
          formula: 'Fair Value = (Historical P/E × Net Income) / Shares Outstanding',
          inputs: {
            'Net Income': {
              value: financials.netIncome,
              source: 'yahoo-finance'
            },
            'Current P/E Ratio': {
              value: currentPE,
              source: 'yahoo-finance'
            },
            'Historical Average P/E': {
              value: historicalPE,
              source: 'hardcoded'
            },
            'Shares Outstanding': {
              value: sharesOutstanding,
              source: 'yahoo-finance'
            }
          },
          steps: [
            {
              description: 'Earnings Per Share (EPS)',
              calculation: `Net Income / ${sharesOutstanding.toLocaleString()} shares`,
              result: financials.netIncome / sharesOutstanding
            },
            {
              description: 'Current Valuation',
              calculation: `Current P/E × EPS = ${currentPE.toFixed(1)} × ${(financials.netIncome / sharesOutstanding).toFixed(2)}`,
              result: currentPE * (financials.netIncome / sharesOutstanding)
            },
            {
              description: 'Fair Valuation',
              calculation: `Historical P/E × EPS = ${historicalPE.toFixed(1)} × ${(financials.netIncome / sharesOutstanding).toFixed(2)}`,
              result: peValue
            },
            {
              description: 'Implied Market Cap',
              calculation: `${historicalPE.toFixed(1)} × ${financials.netIncome.toLocaleString()}`,
              result: historicalPE * financials.netIncome
            }
          ]
        }
      })
    }

    // 7. Mean P/B Ratio
    // Use shareholderEquity as book value
    const bookValueAvailable = manualInputs?.shareholderEquity || financials.shareholderEquity || 0
      
    // Always show P/B if we have the ratio
    if (financials.priceToBook) {
      const currentPB = financials.priceToBook
      const historicalPB = historicalData.averagePB || financials.priceToBook
      const pbValue = this.calculateMultipleValuation(
        historicalPB,
        bookValueAvailable,
        sharesOutstanding
      )
      
      valuations.push({
        method: 'Mean P/B',
        value: pbValue,
        description: 'Mean Price to Book Ratio',
        definition: 'Values company based on historical P/B ratio times current book value (net assets).',
        whenToUse: 'Best for banks, real estate, and asset-heavy businesses.',
        confidence: bookValueAvailable === 0 ? 'low' : 'medium',
        color: bookValueAvailable === 0 ? '#6b7280' : (pbValue > currentPrice ? '#10b981' : '#ef4444'),
        missingData: bookValueAvailable === 0 ? 'Shareholder Equity required' : undefined,
        calculationData: {
          formula: 'Fair Value = (Historical P/B × Shareholder Equity) / Shares Outstanding',
          inputs: {
            'Shareholder Equity': {
              value: bookValueAvailable,
              source: 'yahoo-finance'
            },
            'Current P/B Ratio': {
              value: currentPB,
              source: 'yahoo-finance'
            },
            'Historical Average P/B': {
              value: historicalPB,
              source: historicalData.averagePB ? 'calculated' : 'hardcoded'
            },
            'Shares Outstanding': {
              value: sharesOutstanding,
              source: 'yahoo-finance'
            }
          },
          steps: [
            {
              description: 'Book Value Per Share',
              calculation: `Equity / ${sharesOutstanding.toLocaleString()} shares`,
              result: bookValueAvailable / sharesOutstanding
            },
            {
              description: 'Current Valuation',
              calculation: `Current P/B × Book Value = ${currentPB.toFixed(1)} × ${(bookValueAvailable / sharesOutstanding).toFixed(2)}`,
              result: currentPB * (bookValueAvailable / sharesOutstanding)
            },
            {
              description: 'Fair Valuation',
              calculation: `Historical P/B × Book Value = ${historicalPB.toFixed(1)} × ${(bookValueAvailable / sharesOutstanding).toFixed(2)}`,
              result: pbValue
            },
            {
              description: 'Implied Market Cap',
              calculation: `${historicalPB.toFixed(1)} × ${bookValueAvailable.toLocaleString()}`,
              result: historicalPB * bookValueAvailable
            }
          ]
        }
      })
    }

    // 8. PSG Ratio - Price to Sales Growth
    if (financials.priceToSales && financials.revenueGrowth) {
      const psgRatio = financials.priceToSales / (financials.revenueGrowth * 100)
      const fairPSG = 1.0 // Fair value when PSG = 1
      const impliedPS = fairPSG * (financials.revenueGrowth * 100)
      const psgValue = (impliedPS / financials.priceToSales) * currentPrice
      
      valuations.push({
        method: 'PSG Ratio',
        value: psgValue,
        description: 'Price to Sales Growth Ratio',
        definition: 'Compares P/S ratio to revenue growth rate. Fair value when ratio equals 1.0.',
        whenToUse: 'For high-growth companies, especially unprofitable ones.',
        confidence: 'low',
        color: psgValue > currentPrice ? '#eab308' : '#ef4444',
        calculationData: {
          formula: 'PSG = P/S Ratio / Revenue Growth Rate',
          inputs: {
            'Current Price': {
              value: currentPrice,
              source: 'yahoo-finance'
            },
            'P/S Ratio': {
              value: financials.priceToSales,
              source: 'yahoo-finance'
            },
            'Revenue Growth Rate': {
              value: financials.revenueGrowth,
              source: 'yahoo-finance'
            },
            'Fair PSG Ratio': {
              value: fairPSG,
              source: 'hardcoded'
            }
          },
          steps: [
            {
              description: 'Current PSG Ratio',
              calculation: `P/S / (Growth × 100) = ${financials.priceToSales.toFixed(1)} / ${(financials.revenueGrowth * 100).toFixed(1)}`,
              result: psgRatio
            },
            {
              description: 'Fair P/S Ratio',
              calculation: `Fair PSG × Growth × 100 = ${fairPSG} × ${(financials.revenueGrowth * 100).toFixed(1)}`,
              result: impliedPS
            },
            {
              description: 'Valuation Adjustment',
              calculation: `Fair P/S / Current P/S = ${impliedPS.toFixed(1)} / ${financials.priceToSales.toFixed(1)}`,
              result: impliedPS / financials.priceToSales
            },
            {
              description: 'Fair Value',
              calculation: `Current Price × Adjustment = $${currentPrice.toFixed(2)} × ${(impliedPS / financials.priceToSales).toFixed(2)}`,
              result: psgValue
            }
          ]
        }
      })
    }

    // 9. PEG Ratio - Price to Earnings Growth
    // Calculate PEG if not available but we have P/E and earnings growth
    const earningsGrowthAvailable = manualInputs?.earningsGrowth || detailedFinancials.earningsGrowth || 0
    const pegRatioAvailable = manualInputs?.pegRatio || financials.pegRatio || 
      (quote.peRatio && earningsGrowthAvailable && earningsGrowthAvailable > 0
        ? quote.peRatio / (earningsGrowthAvailable * 100)
        : 1.0) // Default to 1.0 (fair value)
    
    // Always show PEG if we have P/E
    if (quote.peRatio) {
      const fairPEG = 1.0 // Fair value when PEG = 1
      const pegValue = (fairPEG / pegRatioAvailable) * currentPrice
      const impliedGrowthRate = quote.peRatio / pegRatioAvailable
      
      valuations.push({
        method: 'PEG Ratio',
        value: pegValue,
        description: 'Price to Earnings Growth Ratio',
        definition: 'P/E ratio divided by earnings growth rate. PEG of 1.0 suggests fair value, below 1.0 is undervalued.',
        whenToUse: 'Peter Lynch\'s favorite. Great for finding growth at reasonable price.',
        confidence: earningsGrowthAvailable === 0 ? 'low' : 'medium',
        color: earningsGrowthAvailable === 0 ? '#6b7280' : (pegValue > currentPrice ? '#eab308' : '#ef4444'),
        missingData: earningsGrowthAvailable === 0 ? 'Earnings Growth Rate required' : undefined,
        calculationData: {
          formula: 'PEG = P/E Ratio / Earnings Growth Rate',
          inputs: {
            'Current Price': {
              value: currentPrice,
              source: 'yahoo-finance'
            },
            'P/E Ratio': {
              value: quote.peRatio,
              source: 'yahoo-finance'
            },
            'Current PEG Ratio': {
              value: pegRatioAvailable,
              source: financials.pegRatio ? 'yahoo-finance' : 'calculated'
            },
            'Fair PEG Ratio': {
              value: fairPEG,
              source: 'hardcoded'
            }
          },
          steps: [
            {
              description: 'Implied Growth Rate',
              calculation: `P/E / PEG = ${quote.peRatio.toFixed(1)} / ${pegRatioAvailable.toFixed(2)}`,
              result: impliedGrowthRate
            },
            {
              description: 'Fair P/E Ratio',
              calculation: `Fair PEG × Growth = ${fairPEG} × ${impliedGrowthRate.toFixed(1)}`,
              result: fairPEG * impliedGrowthRate
            },
            {
              description: 'Valuation Adjustment',
              calculation: `Fair PEG / Current PEG = ${fairPEG} / ${pegRatioAvailable.toFixed(2)}`,
              result: fairPEG / pegRatioAvailable
            },
            {
              description: 'Fair Value',
              calculation: `Current Price × Adjustment = $${currentPrice.toFixed(2)} × ${(fairPEG / pegRatioAvailable).toFixed(2)}`,
              result: pegValue
            }
          ]
        }
      })
    }

    // Calculate average intrinsic value (weighted by confidence)
    const weights = { high: 3, medium: 2, low: 1 }
    const weightedSum = valuations.reduce((sum, v) => sum + v.value * weights[v.confidence], 0)
    const totalWeight = valuations.reduce((sum, v) => sum + weights[v.confidence], 0)
    const averageIntrinsicValue = totalWeight > 0 ? weightedSum / totalWeight : currentPrice

    const upside = ((averageIntrinsicValue - currentPrice) / currentPrice) * 100

    return {
      currentPrice,
      averageIntrinsicValue,
      upside,
      valuations,
      recommendation: upside > 20 ? 'undervalued' : upside < -20 ? 'overvalued' : 'fair',
      calculatedAt: new Date()
    }
  }

  /**
   * Calculate DCF value for 20 years with enterprise to equity value conversion
   */
  private static calculateDCF(
    currentCashflow: number,
    growthRate1to5: number,
    growthRate6to10: number,
    growthRate11to20: number,
    sharesOutstanding: number,
    totalDebt: number = 0,
    totalCash: number = 0,
    discountRate: number = this.DISCOUNT_RATE
  ): number {
    let totalPV = 0
    
    // Years 1-5: Initial growth phase
    for (let year = 1; year <= 5; year++) {
      const futureCF = currentCashflow * Math.pow(1 + growthRate1to5, year)
      const presentValue = futureCF / Math.pow(1 + discountRate, year)
      totalPV += presentValue
    }

    // Years 6-10: Moderate growth phase
    const year5CF = currentCashflow * Math.pow(1 + growthRate1to5, 5)
    for (let year = 6; year <= 10; year++) {
      const futureCF = year5CF * Math.pow(1 + growthRate6to10, year - 5)
      const presentValue = futureCF / Math.pow(1 + discountRate, year)
      totalPV += presentValue
    }

    // Years 11-20: Mature growth phase
    const year10CF = year5CF * Math.pow(1 + growthRate6to10, 5)
    for (let year = 11; year <= 20; year++) {
      const futureCF = year10CF * Math.pow(1 + growthRate11to20, year - 10)
      const presentValue = futureCF / Math.pow(1 + discountRate, year)
      totalPV += presentValue
    }

    // No terminal value for standard 20-year DCF
    // The value is based only on the 20 years of projected cash flows

    // Convert Enterprise Value to Equity Value
    const enterpriseValue = totalPV
    const equityValue = enterpriseValue - totalDebt + totalCash
    
    return equityValue / sharesOutstanding
  }

  /**
   * Calculate terminal value using perpetual growth model with enterprise to equity conversion
   */
  private static calculateTerminalValue(
    currentCashflow: number,
    growthRate: number,
    terminalGrowthRate: number,
    sharesOutstanding: number,
    totalDebt: number = 0,
    totalCash: number = 0
  ): number {
    // Project cashflow 5 years out
    const projectedCF = currentCashflow * Math.pow(1 + growthRate, 5)
    
    // Calculate terminal value using Gordon Growth Model
    const terminalValue = (projectedCF * (1 + terminalGrowthRate)) / 
                         (this.DISCOUNT_RATE - terminalGrowthRate)
    
    // Discount back to present value
    const presentValue = terminalValue / Math.pow(1 + this.DISCOUNT_RATE, 5)
    
    // Convert Enterprise Value to Equity Value
    const enterpriseValue = presentValue
    const equityValue = enterpriseValue - totalDebt + totalCash
    
    return equityValue / sharesOutstanding
  }

  /**
   * Calculate valuation based on historical multiples
   */
  private static calculateMultipleValuation(
    multiple: number,
    metric: number,
    sharesOutstanding: number
  ): number {
    return (multiple * metric) / sharesOutstanding
  }

  /**
   * Get historical financial data and calculate averages
   */
  private static async getHistoricalFinancials(symbol: string): Promise<any> {
    try {
      // This would ideally fetch 3-5 years of historical data
      // For now, return estimated values
      return {
        averagePE: 25, // Industry average
        averagePS: 5,
        averagePB: 3,
        cashflowGrowth: 0.08,
        fcfGrowth: 0.07
      }
    } catch (error) {
      console.error('Error fetching historical financials:', error)
      return {}
    }
  }

  /**
   * Get detailed financial metrics from Yahoo Finance
   */
  private static async getDetailedFinancials(symbol: string): Promise<any> {
    try {
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ['financialData', 'cashflowStatementHistory']
      }).catch(() => null)

      if (!result) {
        console.warn(`Could not fetch detailed financials for ${symbol}`)
        return {
          operatingCashflow: 0,
          capitalExpenditures: 0,
          cashflowGrowth: 0.08,
          fcfGrowth: 0.07,
          beta: 1.0
        }
      }

      const cashflow = result.cashflowStatementHistory?.cashflowStatements?.[0]
      const financialData = result.financialData

      return {
        operatingCashflow: cashflow?.totalCashFromOperatingActivities || 0,
        capitalExpenditures: cashflow?.capitalExpenditures || 0,
        cashflowGrowth: 0.08, // Default estimate
        fcfGrowth: 0.07, // Default estimate
        beta: 1.0 // Default market beta
      }
    } catch (error) {
      console.error('Error fetching detailed financials:', error)
      return {
        operatingCashflow: 0,
        capitalExpenditures: 0,
        cashflowGrowth: 0.08,
        fcfGrowth: 0.07,
        beta: 1.0
      }
    }
  }

  /**
   * Calculate WACC (Weighted Average Cost of Capital)
   */
  static calculateWACC(
    beta: number,
    debtToEquity: number,
    taxRate: number = 0.21
  ): number {
    // Cost of Equity using CAPM
    const costOfEquity = this.RISK_FREE_RATE + beta * (this.MARKET_RETURN - this.RISK_FREE_RATE)
    
    // Simplified WACC calculation
    const equityWeight = 1 / (1 + debtToEquity)
    const debtWeight = debtToEquity / (1 + debtToEquity)
    const costOfDebt = 0.04 // Assumed corporate bond rate
    
    return equityWeight * costOfEquity + debtWeight * costOfDebt * (1 - taxRate)
  }

  /**
   * Calculate composite fair value using weighted average of multiple methods
   */
  static calculateCompositeFairValue(
    valuations: ValuationResult[],
    currentPrice: number
  ): { fairValue: number; confidence: 'high' | 'medium' | 'low' } {
    // Filter out methods with missing data
    const validValuations = valuations.filter(v => !v.missingData)
    
    if (validValuations.length === 0) {
      return { fairValue: currentPrice, confidence: 'low' }
    }
    
    // Weight by confidence level
    const weights = {
      high: 3,
      medium: 2,
      low: 1
    }
    
    let totalWeight = 0
    let weightedSum = 0
    
    validValuations.forEach(valuation => {
      const weight = weights[valuation.confidence]
      totalWeight += weight
      weightedSum += valuation.value * weight
    })
    
    const fairValue = weightedSum / totalWeight
    
    // Determine overall confidence based on number and quality of valuations
    let confidence: 'high' | 'medium' | 'low'
    const highConfidenceCount = validValuations.filter(v => v.confidence === 'high').length
    
    if (validValuations.length >= 4 && highConfidenceCount >= 2) {
      confidence = 'high'
    } else if (validValuations.length >= 2) {
      confidence = 'medium'
    } else {
      confidence = 'low'
    }
    
    return { fairValue, confidence }
  }

  /**
   * Calculate sector-relative valuation
   */
  static async calculateSectorRelativeValue(
    symbol: string,
    currentPE: number | null,
    sector: string | null
  ): Promise<{ sectorMedianPE: number; relativeValue: number } | null> {
    if (!currentPE || !sector) return null
    
    try {
      // In a real implementation, this would fetch sector data
      // For now, use hardcoded sector medians based on typical values
      const sectorMedianPEs: Record<string, number> = {
        'Technology': 25,
        'Financials': 12,
        'Healthcare': 20,
        'Consumer Discretionary': 18,
        'Consumer Staples': 22,
        'Energy': 14,
        'Materials': 16,
        'Industrials': 18,
        'Utilities': 17,
        'Real Estate': 19,
        'Communication Services': 20
      }
      
      const sectorMedianPE = sectorMedianPEs[sector] || 18 // Default market P/E
      const relativeValue = (currentPE / sectorMedianPE) * 100 // 100 = fairly valued relative to sector
      
      return {
        sectorMedianPE,
        relativeValue
      }
    } catch (error) {
      console.error('Error calculating sector relative value:', error)
      return null
    }
  }

  /**
   * Categorize stock by valuation level
   */
  static getValuationCategory(
    currentPrice: number,
    fairValue: number,
    confidence: 'high' | 'medium' | 'low'
  ): ValuationCategory {
    const discountPremium = ((currentPrice - fairValue) / fairValue) * 100
    
    let level: ValuationLevel
    if (discountPremium < -20) {
      level = 'highly_undervalued'
    } else if (discountPremium < -10) {
      level = 'undervalued'
    } else if (discountPremium <= 10) {
      level = 'fairly_valued'
    } else if (discountPremium <= 20) {
      level = 'overvalued'
    } else {
      level = 'highly_overvalued'
    }
    
    return {
      level,
      discountPremium,
      confidence,
      fairValue,
      currentPrice
    }
  }

  /**
   * Calculate confidence score for valuation
   */
  static calculateConfidenceScore(
    financials: StockFinancials,
    hasAIMoatAnalysis: boolean = false
  ): 'high' | 'medium' | 'low' {
    let score = 0
    
    // Check data completeness
    if (financials.freeCashflow) score += 2
    if (financials.revenue) score += 1
    if (financials.netIncome) score += 1
    if (financials.shareholderEquity) score += 1
    if (financials.operatingCashflow) score += 2
    if (financials.returnOnEquity) score += 1
    if (financials.debtToEquity !== null) score += 1
    if (hasAIMoatAnalysis) score += 2
    
    // Data quality checks
    if (financials.profitMargin && financials.profitMargin > 0) score += 1
    if (financials.currentRatio && financials.currentRatio > 1) score += 1
    
    if (score >= 10) return 'high'
    if (score >= 6) return 'medium'
    return 'low'
  }

  /**
   * Get valuation category with all supporting data
   */
  static async getStockValuationCategory(
    symbol: string,
    quote: StockQuote,
    financials: StockFinancials,
    historical: StockHistorical[],
    hasAIMoatAnalysis: boolean = false
  ): Promise<ValuationCategory | null> {
    try {
      // Calculate comprehensive valuation
      const comprehensiveValuation = await this.calculateValuation(
        symbol,
        quote,
        financials,
        {} // customGrowthRates
      )
      
      // Calculate composite fair value
      const { fairValue, confidence } = this.calculateCompositeFairValue(
        comprehensiveValuation.valuations,
        quote.price
      )
      
      // Get valuation category
      return this.getValuationCategory(quote.price, fairValue, confidence)
    } catch (error) {
      console.error('Error calculating valuation category:', error)
      return null
    }
  }
}
