import { FinancialStatements } from '@/types/stock'
import { getRedisInstance } from '@/lib/utils/redis'
import { SECEdgarHelpers, SECFact } from './sec-edgar-helpers'
import fallbackCIKCache from './sec-cik-cache.json'

interface CompanyTicker {
  cik_str: number
  ticker: string
  title: string
}

export class SECEdgarService {
  private static readonly BASE_URL = 'https://data.sec.gov'
  private static readonly USER_AGENT = 'StockBeacon/1.0 (contact@stockbeacon.com)'
  private static cikCache = new Map<string, string>()
  private static cikMappingLoaded = false
  private static lastFetchAttempt = 0
  private static fetchRetryDelay = 60000 // Start with 1 minute

  /**
   * Load symbol to CIK mapping from SEC
   */
  private static async loadCIKMapping(): Promise<void> {
    if (this.cikMappingLoaded) return

    try {
      // Try to load from Redis cache first
      const redis = getRedisInstance()
      if (redis) {
        try {
          const cached = await redis.get('sec:cik:mapping')
          if (cached && typeof cached === 'string') {
            const mapping = JSON.parse(cached)
            Object.entries(mapping).forEach(([ticker, cik]) => {
              this.cikCache.set(ticker, cik as string)
            })
            this.cikMappingLoaded = true
            console.log(`[SEC] Loaded ${this.cikCache.size} CIK mappings from cache`)
            return
          }
        } catch (redisError) {
          console.log('[SEC] Redis not available, will try other sources')
        }
      }

      // Check if we should retry fetching from SEC (rate limit backoff)
      const now = Date.now()
      if (this.lastFetchAttempt && (now - this.lastFetchAttempt) < this.fetchRetryDelay) {
        console.log(`[SEC] Rate limited, using fallback cache. Next retry in ${Math.round((this.fetchRetryDelay - (now - this.lastFetchAttempt)) / 1000)}s`)
        this.loadFallbackCache()
        return
      }

      // Fetch from SEC
      this.lastFetchAttempt = now
      const response = await fetch(
        'https://www.sec.gov/files/company_tickers.json',
        { 
          headers: { 'User-Agent': this.USER_AGENT },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        }
      )

      if (!response.ok) {
        if (response.status === 429 || response.status === 503) {
          // Rate limited - exponential backoff
          this.fetchRetryDelay = Math.min(this.fetchRetryDelay * 2, 3600000) // Max 1 hour
          console.log(`[SEC] Rate limited (${response.status}), next retry delay: ${this.fetchRetryDelay / 1000}s`)
          this.loadFallbackCache()
          return
        }
        throw new Error(`Failed to fetch CIK mapping: ${response.status}`)
      }

      // Reset retry delay on success
      this.fetchRetryDelay = 60000

      const data = await response.json()
      const mapping: Record<string, string> = {}

      // Process all companies
      Object.values(data as Record<string, CompanyTicker>).forEach(company => {
        const cik = String(company.cik_str).padStart(10, '0')
        this.cikCache.set(company.ticker, cik)
        mapping[company.ticker] = cik
      })

      // Cache in Redis for 7 days (increased from 24 hours)
      if (redis) {
        try {
          await redis.setex('sec:cik:mapping', 604800, JSON.stringify(mapping))
        } catch (redisError) {
          console.log('[SEC] Could not cache CIK mapping in Redis')
        }
      }

      this.cikMappingLoaded = true
      console.log(`[SEC] Loaded ${this.cikCache.size} CIK mappings from SEC API`)
    } catch (error) {
      console.error('[SEC] Failed to load CIK mapping:', error)
      // Fall back to static cache
      this.loadFallbackCache()
    }
  }

  /**
   * Load CIK mappings from fallback cache
   */
  private static loadFallbackCache(): void {
    try {
      const fallbackMappings = fallbackCIKCache.mappings as Record<string, string>
      Object.entries(fallbackMappings).forEach(([ticker, cik]) => {
        this.cikCache.set(ticker, cik)
      })
      this.cikMappingLoaded = true
      console.log(`[SEC] Loaded ${this.cikCache.size} CIK mappings from fallback cache`)
    } catch (error) {
      console.error('[SEC] Failed to load fallback cache:', error)
    }
  }

  /**
   * Get CIK from stock symbol
   */
  static async getCIK(symbol: string): Promise<string | null> {
    try {
      await this.loadCIKMapping()
    } catch (error) {
      console.error('[SEC] Error loading CIK mapping:', error)
    }
    
    const cik = this.cikCache.get(symbol.toUpperCase())
    return cik || null
  }

  /**
   * Fetch financial statements from SEC EDGAR
   */
  static async getFinancialStatements(symbol: string): Promise<FinancialStatements | null> {
    try {
      // Get CIK for symbol
      const cik = await this.getCIK(symbol)
      if (!cik) {
        console.warn(`[SEC] No CIK found for symbol: ${symbol}`)
        return null
      }

      console.log(`[SEC] Fetching financial data for ${symbol} (CIK: ${cik})`)

      // Fetch company facts from SEC
      const response = await fetch(
        `${this.BASE_URL}/api/xbrl/companyfacts/CIK${cik}.json`,
        { headers: { 'User-Agent': this.USER_AGENT } }
      )

      if (!response.ok) {
        throw new Error(`SEC API error: ${response.status}`)
      }

      const data = await response.json()
      const facts = data.facts['us-gaap'] as Record<string, SECFact>

      // Process financial statements
      const incomeStatements = SECEdgarHelpers.extractIncomeStatements(facts)
      const balanceSheets = SECEdgarHelpers.extractBalanceSheets(facts)
      const cashFlowStatements = SECEdgarHelpers.extractCashFlowStatements(facts)

      // Calculate TTM
      const ttmIncome = SECEdgarHelpers.calculateTTMIncomeStatement(incomeStatements.quarterly)
      const ttmCashFlow = SECEdgarHelpers.calculateTTMCashFlow(cashFlowStatements.quarterly)

      return {
        symbol,
        incomeStatements: {
          annual: incomeStatements.annual,
          quarterly: incomeStatements.quarterly,
          ttm: ttmIncome || undefined
        },
        balanceSheets: {
          annual: balanceSheets.annual,
          quarterly: balanceSheets.quarterly
        },
        cashFlowStatements: {
          annual: cashFlowStatements.annual,
          quarterly: cashFlowStatements.quarterly,
          ttm: ttmCashFlow || undefined
        },
        updatedAt: new Date()
      }
    } catch (error) {
      console.error(`[SEC] Failed to fetch financial statements for ${symbol}:`, error)
      return null
    }
  }

}