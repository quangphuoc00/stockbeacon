import { RedisCacheService } from './redis-cache.service'
import { createClient } from '@/lib/supabase/server'

export interface SP500Stock {
  symbol: string
  companyName: string
  sector: string
  marketCapTier?: 'mega' | 'large' | 'mid'
}

export class SP500GitHubService {
  private static readonly GITHUB_CSV_URL = 
    'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv'
  private static readonly CACHE_KEY = 'sp500:constituents'
  private static readonly CACHE_TTL = 2 * 24 * 60 * 60 // 2 days in seconds
  
  /**
   * Get S&P 500 constituents with caching
   */
  static async getConstituents(): Promise<SP500Stock[]> {
    try {
      // Step 1: Check Redis cache first (1-5ms)
      const cached = await RedisCacheService.get(this.CACHE_KEY)
      if (cached) {
        console.log('S&P 500 list served from cache')
        try {
          return JSON.parse(cached)
        } catch (e) {
          console.error('Failed to parse cached S&P 500 data:', e)
          // Continue to fetch fresh data
        }
      }
      
      // Step 2: Cache miss - fetch from GitHub (200-500ms)
      console.log('Fetching fresh S&P 500 list from GitHub')
      const stocks = await this.fetchFromGitHub()
      
      // Step 3: Cache in Redis with 2-day TTL
      try {
        await RedisCacheService.set(
          this.CACHE_KEY, 
          JSON.stringify(stocks),
          this.CACHE_TTL
        )
        console.log(`Cached ${stocks.length} S&P 500 stocks for 2 days`)
      } catch (cacheError) {
        console.error('Failed to cache S&P 500 data:', cacheError)
        // Continue even if caching fails
      }
      
      // Step 4: Persist to database as backup
      await this.persistToDatabase(stocks)
      
      return stocks
    } catch (error) {
      // If all fails, try to get from database as last resort
      console.error('Failed to get S&P 500 list from GitHub:', error)
      const dbStocks = await this.getFromDatabase()
      if (dbStocks.length > 0) {
        console.log('Serving S&P 500 list from database fallback')
        return dbStocks
      }
      throw error
    }
  }
  
  /**
   * Force refresh the S&P 500 list (admin function)
   */
  static async forceRefresh(): Promise<SP500Stock[]> {
    console.log('Force refreshing S&P 500 list')
    
    // Clear cache
    await RedisCacheService.delete(this.CACHE_KEY)
    
    // Fetch fresh data
    return this.getConstituents()
  }
  
  /**
   * Fetch S&P 500 list from GitHub
   */
  private static async fetchFromGitHub(): Promise<SP500Stock[]> {
    const response = await fetch(this.GITHUB_CSV_URL)
    
    if (!response.ok) {
      throw new Error(`GitHub fetch failed: ${response.status} ${response.statusText}`)
    }
    
    const csvText = await response.text()
    const stocks = this.parseCSV(csvText)
    
    // Validate data quality
    if (!this.validateData(stocks)) {
      throw new Error('Invalid S&P 500 data from GitHub')
    }
    
    return stocks
  }
  
  /**
   * Parse CSV data into structured format
   */
  private static parseCSV(csvText: string): SP500Stock[] {
    const lines = csvText.split('\n')
    const headers = lines[0]?.toLowerCase().split(',') || []
    
    // Find column indices
    const symbolIndex = headers.findIndex(h => h.includes('symbol'))
    const nameIndex = headers.findIndex(h => h.includes('security') || h.includes('name') || h.includes('company'))
    const sectorIndex = headers.findIndex(h => h.includes('sector'))
    
    if (symbolIndex === -1) {
      throw new Error('Could not find symbol column in CSV')
    }
    
    // Parse data rows
    return lines
      .slice(1) // Skip header
      .filter(line => line.trim()) // Skip empty lines
      .map(line => {
        // Handle CSV with potential commas in company names
        const parts = this.parseCSVLine(line)
        
        return {
          symbol: this.cleanCSVValue(parts[symbolIndex] || ''),
          companyName: this.cleanCSVValue(parts[nameIndex] || ''),
          sector: this.cleanCSVValue(parts[sectorIndex] || ''),
          marketCapTier: this.inferMarketCapTier(parts[symbolIndex] || '')
        }
      })
      .filter(stock => stock.symbol) // Remove invalid entries
  }
  
  /**
   * Parse a CSV line handling quoted values
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current) // Add last field
    return result
  }
  
  /**
   * Clean CSV value by removing quotes and trimming
   */
  private static cleanCSVValue(value: string): string {
    return value
      .trim()
      .replace(/^"/, '')
      .replace(/"$/, '')
      .replace(/""/g, '"') // Unescape doubled quotes
  }
  
  /**
   * Validate the fetched data
   */
  private static validateData(stocks: SP500Stock[]): boolean {
    // Should have approximately 500 stocks (some variance for dual-class shares)
    if (stocks.length < 495 || stocks.length > 510) {
      console.error(`Invalid stock count: ${stocks.length}`)
      return false
    }
    
    // Must include major companies
    const requiredStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']
    const symbols = stocks.map(s => s.symbol)
    const hasRequired = requiredStocks.every(req => symbols.includes(req))
    
    if (!hasRequired) {
      console.error('Missing required stocks:', requiredStocks.filter(req => !symbols.includes(req)))
      return false
    }
    
    return true
  }
  
  /**
   * Infer market cap tier based on common knowledge
   * This is a simple heuristic - could be enhanced with actual market cap data
   */
  private static inferMarketCapTier(symbol: string): 'mega' | 'large' | 'mid' {
    const megaCaps = ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'BRK.A']
    
    if (megaCaps.includes(symbol)) {
      return 'mega'
    }
    
    // Default to large for most S&P 500 stocks
    return 'large'
  }
  
  /**
   * Persist S&P 500 list to database for fallback
   */
  private static async persistToDatabase(stocks: SP500Stock[]): Promise<void> {
    try {
      const supabase = await createClient()
      
      // First, mark all existing as inactive
      await supabase
        .from('sp500_constituents')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('is_active', true)
      
      // Then upsert the current list
      const constituents = stocks.map(stock => ({
        symbol: stock.symbol,
        company_name: stock.companyName,
        sector: stock.sector,
        market_cap_tier: stock.marketCapTier,
        is_active: true,
        updated_at: new Date().toISOString()
      }))
      
      const { error } = await supabase
        .from('sp500_constituents')
        .upsert(constituents, {
          onConflict: 'symbol',
          ignoreDuplicates: false
        })
      
      if (error) {
        console.error('Failed to persist S&P 500 to database:', error)
      } else {
        console.log('Persisted S&P 500 list to database')
      }
    } catch (error) {
      console.error('Error persisting to database:', error)
      // Don't throw - this is just a backup
    }
  }
  
  /**
   * Get S&P 500 list from database (fallback)
   */
  private static async getFromDatabase(): Promise<SP500Stock[]> {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('sp500_constituents')
        .select('symbol, company_name, sector, market_cap_tier')
        .eq('is_active', true)
      
      if (error) {
        console.error('Failed to fetch from database:', error)
        return []
      }
      
      return (data || []).map(row => ({
        symbol: row.symbol,
        companyName: row.company_name,
        sector: row.sector || '',
        marketCapTier: row.market_cap_tier as SP500Stock['marketCapTier']
      }))
    } catch (error) {
      console.error('Error fetching from database:', error)
      return []
    }
  }
}
