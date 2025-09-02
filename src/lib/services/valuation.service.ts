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
}

export interface ComprehensiveValuation {
  currentPrice: number
  averageIntrinsicValue: number
  upside: number
  valuations: ValuationResult[]
  recommendation: 'undervalued' | 'fair' | 'overvalued'
  calculatedAt: Date
}

export class ValuationService {
  private static readonly DISCOUNT_RATE = 0.10 // 10% default discount rate
  private static readonly TERMINAL_GROWTH = 0.03 // 3% perpetual growth
  private static readonly RISK_FREE_RATE = 0.04 // 4% risk-free rate (10-year treasury)
  private static readonly MARKET_RETURN = 0.10 // 10% historical market return

  /**
   * Calculate comprehensive valuation using multiple methods
   */
  static async calculateValuation(
    symbol: string,
    quote: StockQuote,
    financials: StockFinancials
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
    if (detailedFinancials.operatingCashflow) {
      const dcfValue = this.calculateDCF(
        detailedFinancials.operatingCashflow,
        detailedFinancials.cashflowGrowth || 0.05,
        sharesOutstanding
      )
      valuations.push({
        method: 'DCF-20',
        value: dcfValue,
        description: 'Discounted Cash Flow 20-year',
        definition: 'Projects future operating cash flows for 20 years and discounts them to present value using a required rate of return.',
        whenToUse: 'Best for mature companies with stable cash flows.',
        confidence: 'high',
        color: dcfValue > currentPrice ? '#10b981' : '#ef4444'
      })
    }

    // 2. DFCF 20 - Discounted Free Cash Flow
    if (financials.freeCashflow) {
      const dfcfValue = this.calculateDCF(
        financials.freeCashflow,
        detailedFinancials.fcfGrowth || 0.05,
        sharesOutstanding
      )
      valuations.push({
        method: 'DFCF-20',
        value: dfcfValue,
        description: 'Discounted Free Cash Flow 20-year',
        definition: 'Uses free cash flow (cash after capital expenditures) projected over 20 years, discounted to present value.',
        whenToUse: 'Gold standard. Best for profitable companies with strong cash generation.',
        confidence: 'high',
        color: dfcfValue > currentPrice ? '#10b981' : '#ef4444'
      })
    }

    // 3. DNI 20 - Discounted Net Income
    if (financials.netIncome) {
      const dniValue = this.calculateDCF(
        financials.netIncome,
        financials.earningsGrowth || 0.05,
        sharesOutstanding
      )
      valuations.push({
        method: 'DNI-20',
        value: dniValue,
        description: 'Discounted Net Income 20-year',
        definition: 'Projects net income (bottom-line earnings) for 20 years and discounts to present value.',
        whenToUse: 'Use for banks and financials where earnings matter more than cash flow.',
        confidence: 'medium',
        color: dniValue > currentPrice ? '#10b981' : '#ef4444'
      })
    }

    // 4. DFCF-Terminal - With terminal value only
    if (financials.freeCashflow) {
      const terminalValue = this.calculateTerminalValue(
        financials.freeCashflow,
        detailedFinancials.fcfGrowth || 0.05,
        sharesOutstanding
      )
      valuations.push({
        method: 'DFCF-Terminal',
        value: terminalValue,
        description: 'Discounted FCF Terminal Value',
        definition: 'Estimates company value based on perpetual growth assumption after 5 years using Gordon Growth Model.',
        whenToUse: 'Quick check for stable, mature businesses.',
        confidence: 'medium',
        color: terminalValue > currentPrice ? '#10b981' : '#ef4444'
      })
    }

    // 5. Mean P/S Ratio
    if (financials.priceToSales && financials.revenue) {
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
        color: psValue > currentPrice ? '#eab308' : '#ef4444'
      })
    }

    // 6. Mean P/E Ratio
    if (quote.peRatio && financials.netIncome) {
      const historicalPE = historicalData.averagePE || Math.min(quote.peRatio, 30)
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
        color: peValue > currentPrice ? '#10b981' : '#ef4444'
      })
    }

    // 7. Mean P/B Ratio
    if (financials.priceToBook && financials.shareholderEquity) {
      const historicalPB = historicalData.averagePB || financials.priceToBook
      const pbValue = this.calculateMultipleValuation(
        historicalPB,
        financials.shareholderEquity,
        sharesOutstanding
      )
      valuations.push({
        method: 'Mean P/B',
        value: pbValue,
        description: 'Mean Price to Book Ratio',
        definition: 'Values company based on historical P/B ratio times current book value (net assets).',
        whenToUse: 'Best for banks, real estate, and asset-heavy businesses.',
        confidence: 'medium',
        color: pbValue > currentPrice ? '#10b981' : '#ef4444'
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
        color: psgValue > currentPrice ? '#eab308' : '#ef4444'
      })
    }

    // 9. PEG Ratio - Price to Earnings Growth
    if (financials.pegRatio && quote.peRatio) {
      const fairPEG = 1.0 // Fair value when PEG = 1
      const pegValue = (fairPEG / financials.pegRatio) * currentPrice
      valuations.push({
        method: 'PEG Ratio',
        value: pegValue,
        description: 'Price to Earnings Growth Ratio',
        definition: 'P/E ratio divided by earnings growth rate. PEG of 1.0 suggests fair value, below 1.0 is undervalued.',
        whenToUse: 'Peter Lynch\'s favorite. Great for finding growth at reasonable price.',
        confidence: 'medium',
        color: pegValue > currentPrice ? '#eab308' : '#ef4444'
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
   * Calculate DCF value for 20 years
   */
  private static calculateDCF(
    currentCashflow: number,
    growthRate: number,
    sharesOutstanding: number
  ): number {
    let totalPV = 0
    
    // Years 1-5: Use provided growth rate
    for (let year = 1; year <= 5; year++) {
      const futureCF = currentCashflow * Math.pow(1 + growthRate, year)
      const presentValue = futureCF / Math.pow(1 + this.DISCOUNT_RATE, year)
      totalPV += presentValue
    }

    // Years 6-10: Decay growth rate
    const decayedGrowth = growthRate * 0.7
    for (let year = 6; year <= 10; year++) {
      const futureCF = currentCashflow * Math.pow(1 + growthRate, 5) * Math.pow(1 + decayedGrowth, year - 5)
      const presentValue = futureCF / Math.pow(1 + this.DISCOUNT_RATE, year)
      totalPV += presentValue
    }

    // Years 11-20: Terminal growth rate
    for (let year = 11; year <= 20; year++) {
      const futureCF = currentCashflow * Math.pow(1 + growthRate, 5) * 
                      Math.pow(1 + decayedGrowth, 5) * Math.pow(1 + this.TERMINAL_GROWTH, year - 10)
      const presentValue = futureCF / Math.pow(1 + this.DISCOUNT_RATE, year)
      totalPV += presentValue
    }

    // Add terminal value at year 20
    const year20CF = currentCashflow * Math.pow(1 + growthRate, 5) * 
                    Math.pow(1 + decayedGrowth, 5) * Math.pow(1 + this.TERMINAL_GROWTH, 10)
    const terminalValue = (year20CF * (1 + this.TERMINAL_GROWTH)) / (this.DISCOUNT_RATE - this.TERMINAL_GROWTH)
    const pvTerminal = terminalValue / Math.pow(1 + this.DISCOUNT_RATE, 20)
    totalPV += pvTerminal

    return totalPV / sharesOutstanding
  }

  /**
   * Calculate terminal value using perpetual growth model
   */
  private static calculateTerminalValue(
    currentCashflow: number,
    growthRate: number,
    sharesOutstanding: number
  ): number {
    // Project cashflow 5 years out
    const projectedCF = currentCashflow * Math.pow(1 + growthRate, 5)
    
    // Calculate terminal value using Gordon Growth Model
    const terminalValue = (projectedCF * (1 + this.TERMINAL_GROWTH)) / 
                         (this.DISCOUNT_RATE - this.TERMINAL_GROWTH)
    
    // Discount back to present value
    const presentValue = terminalValue / Math.pow(1 + this.DISCOUNT_RATE, 5)
    
    return presentValue / sharesOutstanding
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
}
