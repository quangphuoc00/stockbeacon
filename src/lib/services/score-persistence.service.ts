import { createClient } from '@/lib/supabase/server'
import { StockScore, TechnicalIndicators } from '@/types/stock'
import { Database } from '@/types/database'

type StockScoreRow = Database['public']['Tables']['stock_scores']['Row']
type StockScoreInsert = Database['public']['Tables']['stock_scores']['Insert']

export class ScorePersistenceService {
  /**
   * Save a calculated score to the database
   */
  static async saveScore(score: StockScore): Promise<void> {
    const supabase = await createClient()
    
    const scoreData: StockScoreInsert = {
      symbol: score.symbol,
      score: score.score,
      business_quality_score: score.businessQualityScore,
      timing_score: score.timingScore,
      financial_health_score: score.financialHealthScore,
      growth_score: score.growthScore,
      valuation_score: score.valuationScore,
      technical_score: score.technicalScore,
      ai_moat_score: score.moatScore, // Using moatScore as ai_moat_score
      explanation: score.explanation,
      recommendation: score.recommendation,
    }
    
    // First, try to delete existing score for this symbol
    await supabase
      .from('stock_scores')
      .delete()
      .eq('symbol', score.symbol)
    
    // Then insert the new score
    const { error } = await supabase
      .from('stock_scores')
      .insert(scoreData)
    
    if (error) {
      console.error('Error saving score:', error)
      throw new Error(`Failed to save score for ${score.symbol}: ${error.message}`)
    }
  }

  /**
   * Save multiple scores in bulk (more efficient for batch operations)
   */
  static async saveScoresBulk(scores: StockScore[]): Promise<void> {
    const supabase = await createClient()
    
    const scoreData: StockScoreInsert[] = scores.map(score => ({
      symbol: score.symbol,
      score: score.score,
      business_quality_score: score.businessQualityScore,
      timing_score: score.timingScore,
      financial_health_score: score.financialHealthScore,
      growth_score: score.growthScore,
      valuation_score: score.valuationScore,
      technical_score: score.technicalScore,
      ai_moat_score: score.moatScore,
      explanation: score.explanation,
      recommendation: score.recommendation,
    }))
    
    // Delete existing scores for these symbols
    const symbols = scores.map(s => s.symbol)
    await supabase
      .from('stock_scores')
      .delete()
      .in('symbol', symbols)
    
    // Then insert the new scores
    const { error } = await supabase
      .from('stock_scores')
      .insert(scoreData)
    
    if (error) {
      console.error('Error saving scores in bulk:', error)
      throw new Error(`Failed to save scores: ${error.message}`)
    }
  }

  /**
   * Get score for a single stock
   */
  static async getScore(symbol: string): Promise<StockScore | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('stock_scores')
      .select('*')
      .eq('symbol', symbol)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No score found
        return null
      }
      console.error('Error fetching score:', error)
      throw new Error(`Failed to fetch score for ${symbol}: ${error.message}`)
    }
    
    return this.mapRowToStockScore(data)
  }

  /**
   * Get scores for multiple stocks
   */
  static async getScoresBulk(symbols: string[]): Promise<Map<string, StockScore>> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('stock_scores')
      .select('*')
      .in('symbol', symbols)
    
    if (error) {
      console.error('Error fetching scores:', error)
      throw new Error(`Failed to fetch scores: ${error.message}`)
    }
    
    const scoreMap = new Map<string, StockScore>()
    data?.forEach(row => {
      const score = this.mapRowToStockScore(row)
      scoreMap.set(score.symbol, score)
    })
    
    return scoreMap
  }

  /**
   * Get all quality stocks (business score >= threshold)
   */
  static async getQualityStocks(
    minBusinessScore: number = 42 // 70% of 60
  ): Promise<StockScore[]> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('stock_scores')
      .select('*')
      .gte('business_quality_score', minBusinessScore)
      .order('score', { ascending: false })
    
    if (error) {
      console.error('Error fetching quality stocks:', error)
      throw new Error(`Failed to fetch quality stocks: ${error.message}`)
    }
    
    return (data || []).map(row => this.mapRowToStockScore(row))
  }

  /**
   * Get scores for S&P 500 stocks with quality filter
   */
  static async getSP500QualityStocks(
    sp500Symbols: string[],
    minBusinessScore: number = 42
  ): Promise<StockScore[]> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('stock_scores')
      .select('*')
      .in('symbol', sp500Symbols)
      .gte('business_quality_score', minBusinessScore)
      .order('score', { ascending: false })
    
    if (error) {
      console.error('Error fetching S&P 500 quality stocks:', error)
      throw new Error(`Failed to fetch S&P 500 quality stocks: ${error.message}`)
    }
    
    return (data || []).map(row => this.mapRowToStockScore(row))
  }

  /**
   * Check if a score is fresh (less than maxAgeHours old)
   */
  static isScoreFresh(score: StockScore, maxAgeHours: number = 24): boolean {
    const scoreAge = Date.now() - new Date(score.calculatedAt).getTime()
    const maxAge = maxAgeHours * 60 * 60 * 1000
    return scoreAge < maxAge
  }

  /**
   * Get stale scores that need updating
   */
  static async getStaleScores(
    symbols: string[],
    maxAgeHours: number = 24
  ): Promise<string[]> {
    const supabase = await createClient()
    
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours)
    
    const { data, error } = await supabase
      .from('stock_scores')
      .select('symbol, updated_at')
      .in('symbol', symbols)
      .lt('updated_at', cutoffDate.toISOString())
    
    if (error) {
      console.error('Error fetching stale scores:', error)
      throw new Error(`Failed to fetch stale scores: ${error.message}`)
    }
    
    // Also include symbols that don't have scores yet
    const existingSymbols = new Set((data || []).map(row => row.symbol))
    const missingSymbols = symbols.filter(symbol => !existingSymbols.has(symbol))
    const staleSymbols = (data || []).map(row => row.symbol)
    
    return [...staleSymbols, ...missingSymbols]
  }

  /**
   * Delete scores older than a certain date (for cleanup)
   */
  static async deleteOldScores(olderThanDays: number = 30): Promise<number> {
    const supabase = await createClient()
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
    
    const { data, error } = await supabase
      .from('stock_scores')
      .delete()
      .lt('updated_at', cutoffDate.toISOString())
      .select('symbol')
    
    if (error) {
      console.error('Error deleting old scores:', error)
      throw new Error(`Failed to delete old scores: ${error.message}`)
    }
    
    return data?.length || 0
  }

  /**
   * Map database row to StockScore type
   */
  private static mapRowToStockScore(row: StockScoreRow): StockScore {
    // Handle technical indicators - for now we'll return a default structure
    // This can be enhanced later to store/retrieve actual technical data
    const defaultTechnicalIndicators: TechnicalIndicators = {
      sma20: 0,
      sma50: 0,
      sma150: 0,
      sma200: 0,
      rsi: 50,
      macd: { value: 0, signal: 0, histogram: 0 },
      bollinger: { upper: 0, middle: 0, lower: 0 },
      support: 0,
      resistance: 0,
      trend: 'neutral',
      volatility: 0,
    }
    
    return {
      symbol: row.symbol,
      score: row.score,
      businessQualityScore: row.business_quality_score,
      timingScore: row.timing_score,
      financialHealthScore: row.financial_health_score,
      moatScore: row.ai_moat_score || 0,
      growthScore: row.growth_score,
      valuationScore: row.valuation_score,
      technicalScore: row.technical_score,
      recommendation: row.recommendation as StockScore['recommendation'],
      explanation: row.explanation || '',
      strengths: [], // These could be stored as JSONB in database
      weaknesses: [], // These could be stored as JSONB in database
      calculatedAt: new Date(row.updated_at),
      technicalIndicators: defaultTechnicalIndicators,
    }
  }
}
