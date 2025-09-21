import { createClient } from '@supabase/supabase-js'

interface FMPKey {
  id: string
  key: string
  number_failures: number
  tries: number
  blacklist: boolean
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export class FMPKeyManagerService {
  private static supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  /**
   * Get all active (non-blacklisted) keys
   */
  static async getActiveKeys(): Promise<FMPKey[]> {
    const { data, error } = await this.supabase
      .from('fmp_keys')
      .select('*')
      .eq('blacklist', false)
      .order('tries', { ascending: true }) // Prioritize least used keys

    if (error) {
      console.error('Error fetching FMP keys:', error)
      return []
    }

    return data || []
  }

  /**
   * Get the next available key (least used, non-blacklisted)
   */
  static async getNextKey(): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('fmp_keys')
      .select('*')
      .eq('blacklist', false)
      .order('tries', { ascending: true })
      .order('last_used_at', { ascending: true, nullsFirst: true })
      .limit(1)
      .single()

    if (error || !data) {
      console.error('Error getting next FMP key:', error)
      return null
    }

    // Update the key usage
    await this.incrementKeyUsage(data.id)

    return data.key
  }

  /**
   * Increment key usage count
   */
  static async incrementKeyUsage(keyId: string): Promise<void> {
    const { error } = await this.supabase
      .from('fmp_keys')
      .update({
        tries: this.supabase.sql`tries + 1`,
        last_used_at: new Date().toISOString()
      })
      .eq('id', keyId)

    if (error) {
      console.error('Error updating key usage:', error)
    }
  }

  /**
   * Record a key failure
   */
  static async recordKeyFailure(key: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('fmp_keys')
      .select('id, number_failures')
      .eq('key', key)
      .single()

    if (error || !data) {
      console.error('Error finding key for failure recording:', error)
      return
    }

    const newFailureCount = data.number_failures + 1
    const shouldBlacklist = newFailureCount >= 3 // Blacklist after 3 failures

    const { error: updateError } = await this.supabase
      .from('fmp_keys')
      .update({
        number_failures: newFailureCount,
        blacklist: shouldBlacklist
      })
      .eq('id', data.id)

    if (updateError) {
      console.error('Error recording key failure:', error)
    }

    if (shouldBlacklist) {
      console.warn(`FMP key ${key.substring(0, 8)}... has been blacklisted after ${newFailureCount} failures`)
    }
  }

  /**
   * Add a new key to the database
   */
  static async addKey(key: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('fmp_keys')
      .insert({ key })

    if (error) {
      if (error.code === '23505') { // Unique violation
        console.log('Key already exists in database')
      } else {
        console.error('Error adding FMP key:', error)
      }
      return false
    }

    return true
  }

  /**
   * Add multiple keys
   */
  static async addKeys(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.addKey(key)
    }
  }

  /**
   * Reset failure count for a key
   */
  static async resetKeyFailures(key: string): Promise<void> {
    const { error } = await this.supabase
      .from('fmp_keys')
      .update({
        number_failures: 0,
        blacklist: false
      })
      .eq('key', key)

    if (error) {
      console.error('Error resetting key failures:', error)
    }
  }

  /**
   * Get key statistics
   */
  static async getKeyStats(): Promise<{
    total: number
    active: number
    blacklisted: number
    totalTries: number
  }> {
    const { data, error } = await this.supabase
      .from('fmp_keys')
      .select('blacklist, tries')

    if (error || !data) {
      console.error('Error fetching key stats:', error)
      return { total: 0, active: 0, blacklisted: 0, totalTries: 0 }
    }

    const stats = data.reduce(
      (acc, key) => ({
        total: acc.total + 1,
        active: acc.active + (key.blacklist ? 0 : 1),
        blacklisted: acc.blacklisted + (key.blacklist ? 1 : 0),
        totalTries: acc.totalTries + key.tries
      }),
      { total: 0, active: 0, blacklisted: 0, totalTries: 0 }
    )

    return stats
  }

  /**
   * Initialize keys from environment variable (migration helper)
   */
  static async initializeFromEnv(): Promise<void> {
    const envKeys = process.env.FMP_API_KEYS || process.env.FMP_API_KEY || ''
    if (!envKeys) return

    const keys = envKeys.split(',').map(k => k.trim()).filter(k => k.length > 0)
    
    if (keys.length > 0) {
      console.log(`Initializing ${keys.length} FMP keys from environment...`)
      await this.addKeys(keys)
    }
  }
}
