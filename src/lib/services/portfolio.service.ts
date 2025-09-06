import { Database } from '@/types/database'
import { SupabaseClient } from '@supabase/supabase-js'

type PortfolioRow = Database['public']['Tables']['portfolios']['Row']
type PortfolioInsert = Database['public']['Tables']['portfolios']['Insert']
type PortfolioUpdate = Database['public']['Tables']['portfolios']['Update']

export interface PortfolioPosition extends PortfolioRow {
  stock?: {
    symbol: string
    company_name: string
    sector?: string
  }
  currentScore?: number
  dayChange?: number
  dayChangePercent?: number
}

export interface PortfolioStats {
  totalValue: number
  totalCost: number
  totalGain: number
  totalGainPercent: number
  dayGain: number
  dayGainPercent: number
  positions: number
  winners: number
  losers: number
}

export class PortfolioService {
  /**
   * Get user's portfolio positions
   */
  static async getUserPortfolio(supabase: SupabaseClient<Database>, userId: string): Promise<PortfolioPosition[]> {
    
    const { data, error } = await supabase
      .from('portfolios')
      .select(`
        *,
        stocks (
          symbol,
          company_name,
          sector
        )
      `)
      .eq('user_id', userId)
      .order('total_value', { ascending: false })

    if (error) {
      console.error('Error fetching portfolio:', error)
      throw error
    }

    // @ts-ignore - Supabase types don't handle joins well
    return data || []
  }

  /**
   * Add position to portfolio
   */
  static async addPosition(
    supabase: SupabaseClient<Database>,
    userId: string,
    symbol: string,
    quantity: number,
    price: number,
    purchasedAt?: Date
  ): Promise<PortfolioPosition> {

    // Ensure stock exists
    await this.ensureStockExists(supabase, symbol)

    // Check if position already exists
    const existingResult = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .eq('symbol', symbol)
      .maybeSingle()

    if (existingResult.data) {
      const existing: PortfolioRow = existingResult.data
      // Update existing position (average cost calculation)
      const totalCost = (existing.quantity * existing.average_price) + (quantity * price)
      const newQuantity = existing.quantity + quantity
      const newAvgPrice = totalCost / newQuantity

      return this.updatePosition(supabase, userId, existing.id, {
        quantity: newQuantity,
        average_price: newAvgPrice,
      })
    }

    // Get current stock score
    let purchaseScore = 0
    try {
      const scoreResult: any = await supabase
        .from('stock_scores')
        .select('score')
        .eq('symbol', symbol)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (scoreResult?.data) {
        purchaseScore = scoreResult.data.score || 0
      }
    } catch (error) {
      console.log('Could not fetch stock score:', error)
    }

    // Create new position
    const portfolioData: PortfolioInsert = {
      user_id: userId,
      symbol,
      quantity,
      average_price: price,
      current_price: price,
      total_value: quantity * price,
      gain_loss: 0,
      gain_loss_percent: 0,
      purchased_at: purchasedAt?.toISOString() || new Date().toISOString(),
      // purchase_score: purchaseScore, // TODO: Add after migration
    }

    const { data, error: insertError } = await (supabase
      .from('portfolios') as any)
      .insert(portfolioData)
      .select()
      .single()

    if (insertError) {
      console.error('Error adding position:', insertError)
      throw insertError
    }

    return data
  }

  /**
   * Update position
   */
  static async updatePosition(
    supabase: SupabaseClient<Database>,
    userId: string,
    positionId: string,
    updates: PortfolioUpdate
  ): Promise<PortfolioPosition> {

    // If updating quantity or price, recalculate values
    if (updates.quantity !== undefined || updates.current_price !== undefined) {
      const currentResult = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', positionId)
        .eq('user_id', userId)
        .maybeSingle()

      if (currentResult.data) {
        const current: PortfolioRow = currentResult.data
        const quantity = updates.quantity || current.quantity
        const currentPrice = updates.current_price || current.current_price || current.average_price
        const avgPrice = updates.average_price || current.average_price

        updates.total_value = quantity * currentPrice
        updates.gain_loss = (currentPrice - avgPrice) * quantity
        updates.gain_loss_percent = ((currentPrice - avgPrice) / avgPrice) * 100
      }
    }

    const { data, error } = await (supabase
      .from('portfolios') as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', positionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating position:', error)
      throw error
    }

    return data
  }

  /**
   * Remove position (sell all)
   */
  static async removePosition(
    supabase: SupabaseClient<Database>,
    userId: string,
    positionId: string
  ): Promise<void> {

    const { error } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', positionId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing position:', error)
      throw error
    }
  }

  /**
   * Sell partial position
   */
  static async sellPartial(
    supabase: SupabaseClient<Database>,
    userId: string,
    positionId: string,
    quantityToSell: number,
    sellPrice: number
  ): Promise<PortfolioPosition | null> {

    // Get current position
    const positionResult = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', positionId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!positionResult.data) {
      throw new Error('Position not found')
    }

    const position: PortfolioRow = positionResult.data
    if (quantityToSell >= position.quantity) {
      // Selling all, remove position
      await this.removePosition(supabase, userId, positionId)
      return null
    }

    // Update remaining position
    const newQuantity = position.quantity - quantityToSell
    return this.updatePosition(supabase, userId, positionId, {
      quantity: newQuantity,
      current_price: sellPrice,
    })
  }

  /**
   * Update all portfolio prices
   */
  static async updatePortfolioPrices(supabase: SupabaseClient<Database>, userId: string): Promise<void> {

    // Get all positions
    const positionsResult = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)

    const positions: PortfolioRow[] = positionsResult.data || []
    
    if (positions.length === 0) return

    // Fetch current prices for all symbols
    const symbols = positions.map(p => p.symbol)
    const pricePromises = symbols.map(async (symbol) => {
      try {
        const response = await fetch(`/api/stocks/${symbol}`)
        const data = await response.json()
        return { symbol, price: data.data?.quote?.price || 0 }
      } catch {
        return { symbol, price: 0 }
      }
    })

    const prices = await Promise.all(pricePromises)
    const priceMap = new Map(prices.map(p => [p.symbol, p.price]))

    // Update each position with new price
    const updatePromises = positions.map(position => {
      const currentPrice = priceMap.get(position.symbol) || position.current_price
      return this.updatePosition(supabase, userId, position.id, {
        current_price: currentPrice,
      })
    })

    await Promise.all(updatePromises)
  }

  /**
   * Get portfolio statistics
   */
  static async getPortfolioStats(supabase: SupabaseClient<Database>, userId: string): Promise<PortfolioStats> {

    const positionsResult = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)

    const positions: PortfolioRow[] = positionsResult.data || []
    
    if (positions.length === 0) {
      return {
        totalValue: 0,
        totalCost: 0,
        totalGain: 0,
        totalGainPercent: 0,
        dayGain: 0,
        dayGainPercent: 0,
        positions: 0,
        winners: 0,
        losers: 0,
      }
    }

    const totalValue = positions.reduce((sum, p) => sum + (p.total_value || 0), 0)
    const totalCost = positions.reduce((sum, p) => sum + (p.quantity * p.average_price), 0)
    const totalGain = totalValue - totalCost
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

    // Note: Day gain would require storing previous day's close price
    // For now, we'll estimate it as a percentage of total gain
    const dayGain = totalGain * 0.01 // Placeholder
    const dayGainPercent = totalValue > 0 ? (dayGain / totalValue) * 100 : 0

    const winners = positions.filter(p => (p.gain_loss || 0) > 0).length
    const losers = positions.filter(p => (p.gain_loss || 0) < 0).length

    return {
      totalValue,
      totalCost,
      totalGain,
      totalGainPercent,
      dayGain,
      dayGainPercent,
      positions: positions.length,
      winners,
      losers,
    }
  }

  /**
   * Ensure stock exists in stocks table
   */
  private static async ensureStockExists(supabase: SupabaseClient<Database>, symbol: string): Promise<void> {

    const { data: existingStock } = await supabase
      .from('stocks')
      .select('symbol')
      .eq('symbol', symbol)
      .single()

    if (!existingStock) {
      // If stock doesn't exist, create it with basic info
      try {
        const { error } = await (supabase
          .from('stocks') as any)
          .insert({
            symbol: symbol.toUpperCase(),
            company_name: symbol.toUpperCase(), // Will be updated with real data later
            sector: null,
            industry: null,
            market_cap: null,
          })
        
        if (error) {
          console.error('Error creating stock entry:', error)
          throw error
        }
      } catch (error) {
        console.error('Error ensuring stock exists:', error)
        throw error
      }
    }
  }
}
