import { Database } from '@/types/database'
import { SupabaseClient } from '@supabase/supabase-js'

type WatchlistRow = Database['public']['Tables']['watchlists']['Row']
type WatchlistInsert = Database['public']['Tables']['watchlists']['Insert']
type WatchlistUpdate = Database['public']['Tables']['watchlists']['Update']

export interface WatchlistItem extends WatchlistRow {
  stock?: {
    symbol: string
    company_name: string
    sector?: string
  }
  currentPrice?: number
  change?: number
  changePercent?: number
  score?: number
}

export class WatchlistService {
  /**
   * Get user's watchlist with stock details
   */
  static async getUserWatchlist(supabase: SupabaseClient<Database>, userId: string): Promise<WatchlistItem[]> {
    const { data, error } = await supabase
      .from('watchlists')
      .select(`
        *,
        stocks (
          symbol,
          company_name,
          sector
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching watchlist:', error)
      throw error
    }

    // @ts-ignore - Supabase types don't handle joins well
    return data || []
  }

  /**
   * Add a stock to watchlist
   */
  static async addToWatchlist(
    supabase: SupabaseClient<Database>,
    userId: string,
    symbol: string,
    targetPrice?: number,
    notes?: string,
    buyTriggers?: any
  ): Promise<WatchlistItem> {

    // First, ensure the stock exists in the stocks table
    await this.ensureStockExists(supabase, symbol)

    const watchlistData: WatchlistInsert = {
      user_id: userId,
      symbol,
      target_price: targetPrice,
      notes,
      buy_triggers: buyTriggers,
      alert_enabled: true,
    }

    const { data, error } = await supabase
      .from('watchlists')
      .insert(watchlistData)
      .select()
      .single()

    if (error) {
      // Check if it's a unique constraint violation
      if (error.code === '23505') {
        throw new Error('Stock already in watchlist')
      }
      console.error('Error adding to watchlist:', error)
      throw error
    }

    return data
  }

  /**
   * Update watchlist item
   */
  static async updateWatchlistItem(
    supabase: SupabaseClient<Database>,
    userId: string,
    watchlistId: string,
    updates: WatchlistUpdate
  ): Promise<WatchlistItem> {

    const { data, error } = await supabase
      .from('watchlists')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', watchlistId)
      .eq('user_id', userId) // Ensure user owns this item
      .select()
      .single()

    if (error) {
      console.error('Error updating watchlist item:', error)
      throw error
    }

    return data
  }

  /**
   * Remove from watchlist
   */
  static async removeFromWatchlist(
    supabase: SupabaseClient<Database>,
    userId: string,
    watchlistId: string
  ): Promise<void> {

    const { error } = await supabase
      .from('watchlists')
      .delete()
      .eq('id', watchlistId)
      .eq('user_id', userId) // Ensure user owns this item

    if (error) {
      console.error('Error removing from watchlist:', error)
      throw error
    }
  }

  /**
   * Check if stock is in watchlist
   */
  static async isInWatchlist(
    supabase: SupabaseClient<Database>,
    userId: string,
    symbol: string
  ): Promise<boolean> {

    const { data, error } = await supabase
      .from('watchlists')
      .select('id')
      .eq('user_id', userId)
      .eq('symbol', symbol)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking watchlist:', error)
      throw error
    }

    return !!data
  }

  /**
   * Toggle alert for watchlist item
   */
  static async toggleAlert(
    supabase: SupabaseClient<Database>,
    userId: string,
    watchlistId: string,
    enabled: boolean
  ): Promise<void> {

    const { error } = await supabase
      .from('watchlists')
      .update({ 
        alert_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', watchlistId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error toggling alert:', error)
      throw error
    }
  }

  /**
   * Ensure stock exists in stocks table
   */
  private static async ensureStockExists(supabase: SupabaseClient<Database>, symbol: string): Promise<void> {

    // Check if stock exists
    const { data: existingStock } = await supabase
      .from('stocks')
      .select('symbol')
      .eq('symbol', symbol)
      .single()

    if (!existingStock) {
      // If stock doesn't exist, we need to create it
      // For now, insert with basic info - it will be enriched later
      try {
        const { error } = await supabase
          .from('stocks')
          .insert({
            symbol: symbol.toUpperCase(),
            company_name: symbol.toUpperCase(), // Will be updated when we fetch real data
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

  /**
   * Get watchlist statistics
   */
  static async getWatchlistStats(supabase: SupabaseClient<Database>, userId: string) {

    const { data, error } = await supabase
      .from('watchlists')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching watchlist stats:', error)
      throw error
    }

    return {
      total: data?.length || 0,
      alertsEnabled: data?.filter(item => item.alert_enabled).length || 0,
      withTargetPrice: data?.filter(item => item.target_price).length || 0,
    }
  }
}
