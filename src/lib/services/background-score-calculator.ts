import { SP500GitHubService } from './sp500-github.service'
import { ScorePersistenceService } from './score-persistence.service'
import { YahooFinanceService } from './yahoo-finance.service'
import { AlpacaDataService } from './alpaca-data.service'
import { StockBeaconScoreService } from './stockbeacon-score.service'
import { AIMoatAnalysisService } from './ai-moat.service'
import { RedisCacheService } from './redis-cache.service'
import { StockScore } from '@/types/stock'

interface CalculationProgress {
  total: number
  completed: number
  failed: number
  currentSymbol?: string
  startTime: Date
  errors: Array<{ symbol: string; error: string }>
}

export class BackgroundScoreCalculator {
  private static readonly BATCH_SIZE = 5 // Increased from 2 for better throughput
  private static readonly RATE_LIMIT_DELAY = 2000 // 2 seconds between batches (1 stock/second average)
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 5000 // 5 seconds
  
  private static progress: CalculationProgress | null = null
  
  /**
   * Calculate scores for all S&P 500 stocks
   */
  static async calculateAllSP500Scores(): Promise<void> {
    console.log('\n🚀 ========== S&P 500 SCORE CALCULATION STARTED ==========')
    console.log(`📅 Start time: ${new Date().toLocaleString()}`)
    const startTime = new Date()
    
    try {
      // Get S&P 500 constituents
      console.log('\n📋 Fetching S&P 500 constituents...')
      const sp500Stocks = await SP500GitHubService.getConstituents()
      const symbols = sp500Stocks.map(s => s.symbol)
      
      console.log(`✅ Found ${symbols.length} S&P 500 stocks`)
      
      // Get stale scores (older than 24 hours or missing)
      console.log('\n🔍 Checking for stale scores...')
      const staleSymbols = await ScorePersistenceService.getStaleScores(symbols, 24)
      
      if (staleSymbols.length === 0) {
        console.log('✨ All scores are up to date! No calculation needed.')
        return
      }
      
      console.log(`📊 ${staleSymbols.length} stocks need score updates`)
      console.log(`⏱️  Estimated time: ${(staleSymbols.length * 2).toFixed(0)}-${(staleSymbols.length * 3).toFixed(0)} seconds`)
      
      // Initialize progress tracking
      this.progress = {
        total: staleSymbols.length,
        completed: 0,
        failed: 0,
        startTime,
        errors: []
      }
      
      // Calculate scores in batches
      await this.calculateScoresInBatches(staleSymbols)
      
      // Log final results
      const duration = (Date.now() - startTime.getTime()) / 1000 / 60 // minutes
      console.log('\n🎉 ========== CALCULATION COMPLETED ==========')
      console.log(`⏱️  Total time: ${duration.toFixed(2)} minutes`)
      console.log(`✅ Success: ${this.progress.completed} stocks`)
      console.log(`❌ Failed: ${this.progress.failed} stocks`)
      console.log(`📊 Success rate: ${((this.progress.completed / this.progress.total) * 100).toFixed(1)}%`)
      
      if (this.progress.errors.length > 0) {
        console.log('\n⚠️  Errors occurred for the following symbols:')
        this.progress.errors.forEach(({ symbol, error }) => {
          console.error(`   - ${symbol}: ${error}`)
        })
      }
      
      console.log('\n✨ Score calculation process finished!')
      
    } catch (error) {
      console.error('Fatal error in score calculation:', error)
      throw error
    } finally {
      this.progress = null
    }
  }
  
  /**
   * Calculate scores in batches with rate limiting
   */
  private static async calculateScoresInBatches(
    symbols: string[],
    batchSize: number = this.BATCH_SIZE
  ): Promise<void> {
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize)
      
      // Log batch start
      console.log(`\n📊 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(symbols.length / batchSize)}`)
      console.log(`   Symbols: ${batch.join(', ')}`)
      
      // Process batch concurrently
      const promises = batch.map(symbol => this.calculateSingleScore(symbol))
      await Promise.allSettled(promises)
      
      // Update progress
      if (this.progress) {
        const completed = Math.min(i + batchSize, symbols.length)
        const percentage = ((completed / symbols.length) * 100).toFixed(1)
        const elapsed = (Date.now() - this.progress.startTime.getTime()) / 1000 / 60 // minutes
        const rate = completed / elapsed // stocks per minute
        const remaining = (symbols.length - completed) / rate // minutes
        
        console.log(`\n✅ Progress: ${completed}/${symbols.length} (${percentage}%)`)
        console.log(`   Success: ${this.progress.completed}, Failed: ${this.progress.failed}`)
        console.log(`   Elapsed: ${elapsed.toFixed(1)} min, Rate: ${rate.toFixed(1)} stocks/min`)
        console.log(`   Est. remaining: ${remaining.toFixed(1)} minutes`)
        console.log(`   ----------------------------------------`)
      }
      
      // Rate limiting delay (except for last batch)
      if (i + batchSize < symbols.length) {
        await this.delay(this.RATE_LIMIT_DELAY)
      }
    }
  }
  
  /**
   * Calculate score for a single stock with retries
   */
  private static async calculateSingleScore(
    symbol: string,
    attempt: number = 1
  ): Promise<void> {
    if (this.progress) {
      this.progress.currentSymbol = symbol
    }
    
    try {
      // Only log on first attempt to reduce noise
      if (attempt === 1) {
        console.log(`   📈 ${symbol}: Fetching data...`)
      }
      
      // Use Alpaca for crawler to avoid Yahoo Finance rate limits
      let quote, financials, historical
      
      if (AlpacaDataService.isConfigured()) {
        // Use Alpaca if configured
        [quote, financials, historical] = await Promise.all([
          AlpacaDataService.getQuote(symbol),
          AlpacaDataService.getFinancials(symbol),
          AlpacaDataService.getHistoricalData(symbol, '3mo')
        ])
      } else {
        // Fallback to Yahoo Finance
        console.log(`   ⚠️  Alpaca not configured, using Yahoo Finance (may hit rate limits)`)
        ;[quote, financials, historical] = await Promise.all([
          YahooFinanceService.getQuote(symbol),
          YahooFinanceService.getFinancials(symbol),
          YahooFinanceService.getHistoricalData(symbol, '3mo')
        ])
      }
      
      if (!quote || !financials) {
        throw new Error(`Missing data`)
      }
      
      // Get AI moat analysis if available (don't fail if not)
      let aiMoatAnalysis = null
      try {
        // Check if we have a recent moat analysis in cache
        const cachedMoat = await RedisCacheService.get(`moat:${symbol}`)
        if (cachedMoat) {
          aiMoatAnalysis = JSON.parse(cachedMoat)
        } else {
          // Skip AI analysis for now to avoid rate limits
          // This can be enabled later with proper rate limiting
          // aiMoatAnalysis = await AIMoatService.analyzeMoat(symbol, financials)
        }
      } catch (moatError) {
        console.warn(`Failed to get moat analysis for ${symbol}:`, moatError)
      }
      
      // Calculate score
      const score = StockBeaconScoreService.calculateScore(
        quote,
        financials,
        historical,
        aiMoatAnalysis
      )
      
      // Save to database
      await ScorePersistenceService.saveScore(score)
      
      // Update Redis cache
      await RedisCacheService.setScore(symbol, score)
      
      if (this.progress) {
        this.progress.completed++
      }
      
      console.log(`   ✅ ${symbol}: Score ${score.score} | B:${score.businessQualityScore} T:${score.timingScore} | ${score.recommendation}`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Retry logic with exponential backoff for rate limits
      if (attempt < this.MAX_RETRIES) {
        let retryDelay = this.RETRY_DELAY
        
        // Exponential backoff for rate limit errors
        if (errorMessage.includes('Too Many Requests') || errorMessage.includes('429') || errorMessage.includes('Edge:')) {
          retryDelay = this.RETRY_DELAY * Math.pow(2, attempt - 1) // 5s, 10s, 20s
          console.log(`   ⏳ ${symbol}: Rate limited - waiting ${retryDelay/1000}s before retry (attempt ${attempt}/${this.MAX_RETRIES})`)
        } else {
          console.log(`   ⚠️  ${symbol}: ${errorMessage} - Retrying in ${retryDelay/1000}s (${attempt}/${this.MAX_RETRIES})...`)
        }
        
        await this.delay(retryDelay)
        return this.calculateSingleScore(symbol, attempt + 1)
      }
      
      console.error(`   ❌ ${symbol}: Failed after ${attempt} attempts - ${errorMessage}`)
      
      // Record failure after all retries
      if (this.progress) {
        this.progress.failed++
        this.progress.errors.push({ symbol, error: errorMessage })
      }
    }
  }
  
  /**
   * Get current calculation progress
   */
  static getProgress(): CalculationProgress | null {
    return this.progress
  }
  
  /**
   * Retry failed calculations
   */
  static async retryFailedCalculations(): Promise<void> {
    if (!this.progress || this.progress.errors.length === 0) {
      console.log('No failed calculations to retry')
      return
    }
    
    const failedSymbols = this.progress.errors.map(e => e.symbol)
    console.log(`Retrying ${failedSymbols.length} failed calculations`)
    
    // Clear errors for retry
    this.progress.errors = []
    this.progress.failed = 0
    
    await this.calculateScoresInBatches(failedSymbols)
  }
  
  /**
   * Utility function for delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
