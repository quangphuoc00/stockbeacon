import { createClient } from '@/lib/supabase/server'
import { StockDataService } from './stock-data.service'
import { NotificationService } from './notification.service'
import { Database } from '@/types/database'

type WatchlistRow = Database['public']['Tables']['watchlists']['Row']

interface AlertCheckResult {
  watchlistId: string
  userId: string
  symbol: string
  triggered: boolean
  conditions: {
    priceTarget: { target: number | null; current: number; met: boolean }
    businessQuality: { target: number | null; current: number; met: boolean }
    timeToBuy: { target: number | null; current: number; met: boolean }
  }
  allConditionsMet: boolean
}

export class AlertCheckerService {
  /**
   * Check all active watchlist alerts
   */
  static async checkAllAlerts(): Promise<void> {
    console.log('🔔 Starting alert check...')
    const startTime = Date.now()
    
    try {
      const supabase = await createClient()
      
      // Get all watchlist items with alerts enabled
      const { data: watchlistItems, error } = await supabase
        .from('watchlists')
        .select('*')
        .eq('alert_enabled', true)
        .not('buy_triggers', 'is', null)
      
      if (error) {
        console.error('Error fetching watchlist items:', error)
        return
      }
      
      if (!watchlistItems || watchlistItems.length === 0) {
        console.log('No active alerts to check')
        return
      }
      
      console.log(`Checking ${watchlistItems.length} active alerts...`)
      
      // Group by symbol to minimize API calls
      const symbolGroups = this.groupBySymbol(watchlistItems)
      
      // Check each symbol
      for (const [symbol, items] of Object.entries(symbolGroups)) {
        await this.checkSymbolAlerts(symbol, items)
      }
      
      const duration = Date.now() - startTime
      console.log(`✅ Alert check completed in ${duration}ms`)
      
    } catch (error) {
      console.error('Error in alert checker:', error)
    }
  }
  
  /**
   * Check alerts for a specific symbol
   */
  private static async checkSymbolAlerts(
    symbol: string, 
    watchlistItems: WatchlistRow[]
  ): Promise<void> {
    try {
      // Get current stock data
      const stockData = await StockDataService.getStockData(symbol)
      
      if (!stockData.quote || !stockData.score) {
        console.log(`⚠️ No data available for ${symbol}`)
        return
      }
      
      const currentPrice = stockData.quote.price
      const currentScore = stockData.score.score
      const currentTimingScore = stockData.score.timingScore
      
      // Check each watchlist item for this symbol
      for (const item of watchlistItems) {
        const result = await this.evaluateAlertConditions(
          item,
          currentPrice,
          currentScore,
          currentTimingScore
        )
        
        if (result.allConditionsMet) {
          await this.handleTriggeredAlert(result, stockData)
        }
      }
      
    } catch (error) {
      console.error(`Error checking alerts for ${symbol}:`, error)
    }
  }
  
  /**
   * Evaluate if alert conditions are met
   */
  private static evaluateAlertConditions(
    item: WatchlistRow,
    currentPrice: number,
    currentScore: number,
    currentTimingScore: number
  ): AlertCheckResult {
    const buyTriggers = item.buy_triggers as any || {}
    
    // Check price target
    const priceTargetMet = !item.target_price || currentPrice <= item.target_price
    
    // Check business quality score
    const minScore = buyTriggers.minScore
    const scoreTargetMet = !minScore || currentScore >= minScore
    
    // Check time to buy score (convert from 0-40 to 0-100 scale)
    const minTimingScore = buyTriggers.minTimingScore
    const timingScorePercent = Math.round((currentTimingScore / 40) * 100)
    const timingTargetMet = !minTimingScore || timingScorePercent >= minTimingScore
    
    const allConditionsMet = priceTargetMet && scoreTargetMet && timingTargetMet
    
    return {
      watchlistId: item.id,
      userId: item.user_id,
      symbol: item.symbol,
      triggered: allConditionsMet,
      conditions: {
        priceTarget: {
          target: item.target_price,
          current: currentPrice,
          met: priceTargetMet
        },
        businessQuality: {
          target: minScore,
          current: currentScore,
          met: scoreTargetMet
        },
        timeToBuy: {
          target: minTimingScore,
          current: timingScorePercent,
          met: timingTargetMet
        }
      },
      allConditionsMet
    }
  }
  
  /**
   * Handle a triggered alert
   */
  private static async handleTriggeredAlert(
    result: AlertCheckResult,
    stockData: any
  ): Promise<void> {
    console.log(`🎯 Alert triggered for ${result.symbol}!`)
    
    try {
      const supabase = await createClient()
      
      // Check cooldown period (if implemented)
      const shouldSendAlert = await this.checkCooldownPeriod(
        result.watchlistId,
        result.userId
      )
      
      if (!shouldSendAlert) {
        console.log(`Skipping alert for ${result.symbol} - cooldown period active`)
        return
      }
      
      // Send notification
      await NotificationService.checkWatchlistTriggers(
        result.symbol,
        result.conditions.priceTarget.current,
        result.conditions.businessQuality.current,
        stockData.score.timingScore
      )
      
      // Update last alert sent timestamp
      await this.updateLastAlertSent(result.watchlistId)
      
      console.log(`✅ Alert sent for ${result.symbol}`)
      
    } catch (error) {
      console.error(`Error handling alert for ${result.symbol}:`, error)
    }
  }
  
  /**
   * Check if we should send an alert based on cooldown period
   */
  private static async checkCooldownPeriod(
    watchlistId: string,
    userId: string
  ): Promise<boolean> {
    // For now, always return true
    // TODO: Implement cooldown logic when last_alert_sent column is added
    return true
  }
  
  /**
   * Update the last alert sent timestamp
   */
  private static async updateLastAlertSent(watchlistId: string): Promise<void> {
    try {
      const supabase = await createClient()
      
      // This will fail until we add the column, but that's OK for now
      await supabase
        .from('watchlists')
        .update({
          // last_alert_sent: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', watchlistId)
        
    } catch (error) {
      // Ignore for now - column doesn't exist yet
    }
  }
  
  /**
   * Group watchlist items by symbol
   */
  private static groupBySymbol(items: WatchlistRow[]): Record<string, WatchlistRow[]> {
    return items.reduce((groups, item) => {
      const symbol = item.symbol
      if (!groups[symbol]) {
        groups[symbol] = []
      }
      groups[symbol].push(item)
      return groups
    }, {} as Record<string, WatchlistRow[]>)
  }
  
  /**
   * Check alerts for a specific user (useful for testing)
   */
  static async checkUserAlerts(userId: string): Promise<void> {
    console.log(`Checking alerts for user ${userId}...`)
    
    try {
      const supabase = await createClient()
      
      const { data: watchlistItems, error } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', userId)
        .eq('alert_enabled', true)
        .not('buy_triggers', 'is', null)
      
      if (error || !watchlistItems || watchlistItems.length === 0) {
        console.log('No active alerts for user')
        return
      }
      
      const symbolGroups = this.groupBySymbol(watchlistItems)
      
      for (const [symbol, items] of Object.entries(symbolGroups)) {
        await this.checkSymbolAlerts(symbol, items)
      }
      
    } catch (error) {
      console.error('Error checking user alerts:', error)
    }
  }
}
