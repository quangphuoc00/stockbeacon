import { StockQuote, StockFinancials, StockHistorical, StockScore, TechnicalIndicators } from '@/types/stock'
import { MoatAnalysis } from './ai-moat.service'

export class StockBeaconScoreService {
  /**
   * Calculate the complete StockBeacon Score (0-100)
   * Business Quality: 60% weight
   * Timing Opportunity: 40% weight
   */
  static calculateScore(
    quote: StockQuote,
    financials: StockFinancials,
    historical: StockHistorical[],
    aiMoatAnalysis?: MoatAnalysis
  ): StockScore {
    // Calculate business quality components
    const financialHealthScore = this.calculateFinancialHealth(financials)
    const moatScore = aiMoatAnalysis 
      ? this.calculateMoatScoreFromAI(aiMoatAnalysis)
      : this.estimateMoatScore(financials)
    const growthScore = this.calculateGrowthScore(financials)
    
    // Calculate timing components
    const valuationScore = this.calculateValuationScore(quote, financials)
    const technicalIndicators = this.calculateTechnicalIndicators(historical)
    const technicalScore = this.calculateTechnicalScore(technicalIndicators, quote, historical)
    
    // Aggregate scores
    const businessQualityScore = Math.round(financialHealthScore + moatScore + growthScore)
    const timingScore = Math.round(valuationScore + technicalScore)
    const totalScore = Math.round(businessQualityScore + timingScore)
    
    // Generate recommendation
    const recommendation = this.getRecommendation(totalScore, businessQualityScore, timingScore)
    
    // Generate explanation and insights
    const { explanation, strengths, weaknesses } = this.generateInsights(
      quote,
      financials,
      totalScore,
      businessQualityScore,
      timingScore,
      technicalIndicators
    )
    
    return {
      symbol: quote.symbol,
      score: totalScore,
      businessQualityScore,
      timingScore,
      financialHealthScore,
      moatScore,
      growthScore,
      valuationScore,
      technicalScore,
      recommendation,
      explanation,
      strengths,
      weaknesses,
      calculatedAt: new Date(),
      technicalIndicators,
    }
  }

  /**
   * Calculate Financial Health Score (0-25 points)
   */
  private static calculateFinancialHealth(financials: StockFinancials): number {
    let score = 0
    const maxScore = 25
    
    // ROE (Return on Equity) - 8 points
    if (financials.returnOnEquity) {
      if (financials.returnOnEquity >= 0.20) score += 8      // Excellent (≥20%)
      else if (financials.returnOnEquity >= 0.15) score += 6 // Good (15-20%)
      else if (financials.returnOnEquity >= 0.10) score += 4 // Fair (10-15%)
      else if (financials.returnOnEquity >= 0.05) score += 2 // Poor (5-10%)
    }
    
    // ROA (Return on Assets) - 5 points
    if (financials.returnOnAssets) {
      if (financials.returnOnAssets >= 0.10) score += 5      // Excellent (≥10%)
      else if (financials.returnOnAssets >= 0.07) score += 4 // Good (7-10%)
      else if (financials.returnOnAssets >= 0.05) score += 3 // Fair (5-7%)
      else if (financials.returnOnAssets >= 0.03) score += 1 // Poor (3-5%)
    }
    
    // Debt to Equity - 6 points
    if (financials.debtToEquity !== null) {
      if (financials.debtToEquity < 0.3) score += 6         // Excellent (<30%)
      else if (financials.debtToEquity < 0.5) score += 5    // Good (30-50%)
      else if (financials.debtToEquity < 1.0) score += 3    // Fair (50-100%)
      else if (financials.debtToEquity < 1.5) score += 1    // Poor (100-150%)
    }
    
    // Current Ratio - 3 points
    if (financials.currentRatio) {
      if (financials.currentRatio >= 2.0) score += 3        // Strong liquidity
      else if (financials.currentRatio >= 1.5) score += 2   // Good liquidity
      else if (financials.currentRatio >= 1.0) score += 1   // Adequate liquidity
    }
    
    // Profit Margin - 3 points
    if (financials.profitMargin) {
      if (financials.profitMargin >= 0.20) score += 3       // Excellent (≥20%)
      else if (financials.profitMargin >= 0.10) score += 2  // Good (10-20%)
      else if (financials.profitMargin >= 0.05) score += 1  // Fair (5-10%)
    }
    
    return Math.min(score, maxScore)
  }

  /**
   * Calculate Moat Score from AI Analysis (0-20 points)
   * Converts the 0-100 AI moat score to our 0-20 scale
   */
  private static calculateMoatScoreFromAI(moatAnalysis: MoatAnalysis): number {
    // AI moat score is 0-100, we need 0-20
    // Simply scale it down proportionally
    return Math.round((moatAnalysis.overallScore / 100) * 20)
  }

  /**
   * Estimate Moat Score without AI (0-20 points)
   * This is a simplified version - the AI version will be more sophisticated
   */
  private static estimateMoatScore(financials: StockFinancials): number {
    let score = 0
    const maxScore = 20
    
    // High margins indicate pricing power (8 points)
    if (financials.grossMargin) {
      if (financials.grossMargin >= 0.50) score += 8        // Excellent (≥50%)
      else if (financials.grossMargin >= 0.40) score += 6   // Good (40-50%)
      else if (financials.grossMargin >= 0.30) score += 4   // Fair (30-40%)
      else if (financials.grossMargin >= 0.20) score += 2   // Poor (20-30%)
    }
    
    // Operating margin consistency (6 points)
    if (financials.operatingMargin) {
      if (financials.operatingMargin >= 0.25) score += 6    // Excellent (≥25%)
      else if (financials.operatingMargin >= 0.15) score += 4 // Good (15-25%)
      else if (financials.operatingMargin >= 0.10) score += 2 // Fair (10-15%)
    }
    
    // Free cash flow generation (6 points)
    if (financials.freeCashflow && financials.revenue) {
      const fcfMargin = financials.freeCashflow / financials.revenue
      if (fcfMargin >= 0.20) score += 6                     // Excellent FCF
      else if (fcfMargin >= 0.15) score += 4                // Good FCF
      else if (fcfMargin >= 0.10) score += 2                // Fair FCF
    }
    
    return Math.min(score, maxScore)
  }

  /**
   * Calculate Growth Score (0-15 points)
   */
  private static calculateGrowthScore(financials: StockFinancials): number {
    let score = 0
    const maxScore = 15
    
    // Revenue Growth (8 points)
    if (financials.revenueGrowth) {
      if (financials.revenueGrowth >= 0.20) score += 8      // High growth (≥20%)
      else if (financials.revenueGrowth >= 0.15) score += 6 // Good growth (15-20%)
      else if (financials.revenueGrowth >= 0.10) score += 4 // Moderate (10-15%)
      else if (financials.revenueGrowth >= 0.05) score += 2 // Low (5-10%)
    }
    
    // Earnings Growth (7 points)
    if (financials.earningsGrowth) {
      if (financials.earningsGrowth >= 0.25) score += 7     // High growth (≥25%)
      else if (financials.earningsGrowth >= 0.15) score += 5 // Good growth (15-25%)
      else if (financials.earningsGrowth >= 0.10) score += 3 // Moderate (10-15%)
      else if (financials.earningsGrowth >= 0.05) score += 1 // Low (5-10%)
    }
    
    return Math.min(score, maxScore)
  }

  /**
   * Calculate Valuation Score (0-20 points)
   */
  private static calculateValuationScore(quote: StockQuote, financials: StockFinancials): number {
    let score = 0
    const maxScore = 20
    
    // P/E Ratio (8 points)
    if (quote.peRatio) {
      if (quote.peRatio < 15) score += 8                    // Very attractive
      else if (quote.peRatio < 20) score += 6               // Attractive
      else if (quote.peRatio < 25) score += 4               // Fair
      else if (quote.peRatio < 30) score += 2               // Expensive
    }
    
    // PEG Ratio (6 points)
    if (financials.pegRatio) {
      if (financials.pegRatio < 1.0) score += 6             // Undervalued
      else if (financials.pegRatio < 1.5) score += 4        // Fair value
      else if (financials.pegRatio < 2.0) score += 2        // Slightly overvalued
    }
    
    // Price to Book (3 points)
    if (financials.priceToBook) {
      if (financials.priceToBook < 1.5) score += 3          // Attractive
      else if (financials.priceToBook < 3.0) score += 2     // Fair
      else if (financials.priceToBook < 5.0) score += 1     // Expensive
    }
    
    // 52-week position (3 points)
    if (quote.week52High && quote.week52Low && quote.price) {
      const range = quote.week52High - quote.week52Low
      const position = (quote.price - quote.week52Low) / range
      
      if (position < 0.3) score += 3                        // Near 52-week low
      else if (position < 0.5) score += 2                   // Below midpoint
      else if (position < 0.7) score += 1                   // Above midpoint
    }
    
    return Math.min(score, maxScore)
  }

  /**
   * Calculate Technical Indicators
   */
  private static calculateTechnicalIndicators(historical: StockHistorical[]): TechnicalIndicators {
    if (historical.length < 20) {
      // Not enough data for technical analysis
      return {
        sma20: 0,
        sma50: 0,
        sma200: 0,
        rsi: 50,
        macd: { value: 0, signal: 0, histogram: 0 },
        bollinger: { upper: 0, middle: 0, lower: 0 },
        support: 0,
        resistance: 0,
        trend: 'neutral',
        volatility: 0,
      }
    }

    const prices = historical.map(h => h.close)
    
    // Simple Moving Averages
    const sma20 = this.calculateSMA(prices, 20)
    const sma50 = this.calculateSMA(prices, Math.min(50, prices.length))
    const sma200 = this.calculateSMA(prices, Math.min(200, prices.length))
    
    // RSI (Relative Strength Index)
    const rsi = this.calculateRSI(prices, 14)
    
    // MACD
    const macd = this.calculateMACD(prices)
    
    // Bollinger Bands
    const bollinger = this.calculateBollingerBands(prices, 20)
    
    // Support and Resistance
    const { support, resistance } = this.calculateSupportResistance(historical)
    
    // Trend determination
    const currentPrice = prices[prices.length - 1]
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (currentPrice > sma20 && sma20 > sma50) trend = 'bullish'
    else if (currentPrice < sma20 && sma20 < sma50) trend = 'bearish'
    
    // Volatility (standard deviation)
    const volatility = this.calculateVolatility(prices)
    
    return {
      sma20,
      sma50,
      sma200,
      rsi,
      macd,
      bollinger,
      support,
      resistance,
      trend,
      volatility,
    }
  }

  /**
   * Calculate Technical Score (0-20 points)
   */
  private static calculateTechnicalScore(
    indicators: TechnicalIndicators,
    quote: StockQuote,
    historical: StockHistorical[]
  ): number {
    let score = 0
    const maxScore = 20
    
    // Trend strength (8 points)
    if (indicators.trend === 'bullish') {
      score += 8
    } else if (indicators.trend === 'neutral') {
      score += 4
    }
    
    // RSI (4 points)
    if (indicators.rsi > 30 && indicators.rsi < 70) {
      score += 4 // Not overbought or oversold
    } else if (indicators.rsi <= 30) {
      score += 2 // Oversold (potential bounce)
    }
    
    // Support proximity (4 points)
    if (indicators.support > 0 && quote.price) {
      const distanceToSupport = (quote.price - indicators.support) / quote.price
      if (distanceToSupport < 0.05) score += 4      // Very close to support
      else if (distanceToSupport < 0.10) score += 2 // Near support
    }
    
    // Volatility penalty (4 points)
    if (indicators.volatility < 0.02) score += 4    // Low volatility
    else if (indicators.volatility < 0.04) score += 2 // Moderate volatility
    
    return Math.min(score, maxScore)
  }

  /**
   * Get recommendation based on scores
   */
  private static getRecommendation(
    totalScore: number,
    businessQuality: number,
    timing: number
  ): 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' {
    if (totalScore >= 80 && businessQuality >= 45) return 'strong_buy'
    if (totalScore >= 70 && businessQuality >= 40) return 'buy'
    if (totalScore >= 50) return 'hold'
    if (totalScore >= 30) return 'sell'
    return 'strong_sell'
  }

  /**
   * Generate human-readable insights
   */
  private static generateInsights(
    quote: StockQuote,
    financials: StockFinancials,
    totalScore: number,
    businessQuality: number,
    timing: number,
    indicators: TechnicalIndicators
  ): { explanation: string; strengths: string[]; weaknesses: string[] } {
    const strengths: string[] = []
    const weaknesses: string[] = []
    
    // Analyze strengths
    if (financials.returnOnEquity && financials.returnOnEquity >= 0.15) {
      strengths.push(`Strong ROE of ${(financials.returnOnEquity * 100).toFixed(1)}%`)
    }
    if (financials.debtToEquity && financials.debtToEquity < 0.5) {
      strengths.push('Low debt levels provide financial flexibility')
    }
    if (financials.revenueGrowth && financials.revenueGrowth >= 0.15) {
      strengths.push(`Revenue growing at ${(financials.revenueGrowth * 100).toFixed(1)}% annually`)
    }
    if (indicators.trend === 'bullish') {
      strengths.push('Strong upward price momentum')
    }
    if (quote.peRatio && quote.peRatio < 20) {
      strengths.push(`Attractive valuation with P/E of ${quote.peRatio.toFixed(1)}`)
    }
    
    // Analyze weaknesses
    if (financials.returnOnEquity && financials.returnOnEquity < 0.10) {
      weaknesses.push('Below-average return on equity')
    }
    if (financials.debtToEquity && financials.debtToEquity > 1.0) {
      weaknesses.push('High debt levels may limit flexibility')
    }
    if (financials.revenueGrowth && financials.revenueGrowth < 0.05) {
      weaknesses.push('Slow revenue growth')
    }
    if (indicators.trend === 'bearish') {
      weaknesses.push('Negative price momentum')
    }
    if (quote.peRatio && quote.peRatio > 30) {
      weaknesses.push('Premium valuation may limit upside')
    }
    
    // Generate explanation
    let explanation = `${quote.name} scores ${totalScore}/100 on the StockBeacon Scale. `
    
    if (totalScore >= 80) {
      explanation += 'This is an exceptional opportunity with strong fundamentals and favorable timing. '
    } else if (totalScore >= 70) {
      explanation += 'This stock shows solid potential with good business quality and reasonable entry timing. '
    } else if (totalScore >= 50) {
      explanation += 'This stock has mixed signals - some positive attributes but also notable concerns. '
    } else {
      explanation += 'This stock currently shows significant weaknesses that warrant caution. '
    }
    
    explanation += `Business quality scores ${businessQuality}/60 while timing opportunity scores ${timing}/40.`
    
    return { explanation, strengths, weaknesses }
  }

  // Technical indicator calculation helpers
  private static calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return 0
    const relevantPrices = prices.slice(-period)
    return relevantPrices.reduce((a, b) => a + b, 0) / period
  }

  private static calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50
    
    let gains = 0
    let losses = 0
    
    for (let i = prices.length - period; i < prices.length; i++) {
      const difference = prices[i] - prices[i - 1]
      if (difference > 0) gains += difference
      else losses -= difference
    }
    
    const avgGain = gains / period
    const avgLoss = losses / period
    
    if (avgLoss === 0) return 100
    
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  private static calculateMACD(prices: number[]) {
    const ema12 = this.calculateEMA(prices, 12)
    const ema26 = this.calculateEMA(prices, 26)
    const macdLine = ema12 - ema26
    const signal = this.calculateEMA([macdLine], 9)
    
    return {
      value: macdLine,
      signal: signal,
      histogram: macdLine - signal,
    }
  }

  private static calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0
    
    const multiplier = 2 / (period + 1)
    let ema = prices[0]
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
    }
    
    return ema
  }

  private static calculateBollingerBands(prices: number[], period: number = 20) {
    const sma = this.calculateSMA(prices, period)
    const stdDev = this.calculateStandardDeviation(prices.slice(-period))
    
    return {
      upper: sma + (stdDev * 2),
      middle: sma,
      lower: sma - (stdDev * 2),
    }
  }

  private static calculateVolatility(prices: number[]): number {
    return this.calculateStandardDeviation(prices) / this.calculateSMA(prices, prices.length)
  }

  private static calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length
    return Math.sqrt(avgSquaredDiff)
  }

  private static calculateSupportResistance(historical: StockHistorical[]) {
    const lows = historical.map(h => h.low).sort((a, b) => a - b)
    const highs = historical.map(h => h.high).sort((a, b) => b - a)
    
    // Simple support: 10th percentile of lows
    const support = lows[Math.floor(lows.length * 0.1)]
    
    // Simple resistance: 90th percentile of highs
    const resistance = highs[Math.floor(highs.length * 0.1)]
    
    return { support, resistance }
  }
}
