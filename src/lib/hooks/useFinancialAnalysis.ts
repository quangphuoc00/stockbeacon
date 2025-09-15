import { useState, useEffect, useCallback } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const STORAGE_PREFIX = 'stockbeacon_analysis_'

export function useFinancialAnalysis<T>(
  symbol: string,
  endpoint: string
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get cache key
  const cacheKey = `${STORAGE_PREFIX}${symbol}_${endpoint}`

  // Load from cache
  const loadFromCache = useCallback((): T | null => {
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached)
        const now = Date.now()
        
        // Check if cache is still valid
        if (now - entry.timestamp < CACHE_DURATION) {
          console.log(`[Cache] Using cached data for ${symbol}/${endpoint}`)
          return entry.data
        } else {
          // Remove stale cache
          sessionStorage.removeItem(cacheKey)
        }
      }
    } catch (err) {
      console.error('[Cache] Error loading from cache:', err)
    }
    return null
  }, [cacheKey, symbol, endpoint])

  // Save to cache
  const saveToCache = useCallback((data: T) => {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now()
      }
      sessionStorage.setItem(cacheKey, JSON.stringify(entry))
      console.log(`[Cache] Saved data for ${symbol}/${endpoint}`)
    } catch (err) {
      console.error('[Cache] Error saving to cache:', err)
    }
  }, [cacheKey, symbol, endpoint])

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/stocks/${symbol}/${endpoint}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch data')
      }
      
      const responseData = await response.json()
      setData(responseData)
      setError(null)
      
      // Save to cache
      saveToCache(responseData)
      
      return responseData
    } catch (err) {
      console.error(`[API] Error fetching ${endpoint} for ${symbol}:`, err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
      throw err
    } finally {
      setLoading(false)
    }
  }, [symbol, endpoint, saveToCache])

  // Refresh data (bypasses cache)
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    // Clear cache
    sessionStorage.removeItem(cacheKey)
    
    // Fetch fresh data
    return fetchData()
  }, [cacheKey, fetchData])

  useEffect(() => {
    // Try to load from cache first
    const cachedData = loadFromCache()
    if (cachedData) {
      setData(cachedData)
      setLoading(false)
      setError(null)
      
      // Prefetch fresh data in background for next time
      // This ensures data is fresh while showing cached version immediately
      fetchData().catch(err => {
        console.log('[Background] Error prefetching fresh data:', err)
      })
    } else {
      // No cache, fetch fresh data
      fetchData()
    }
  }, [symbol, endpoint]) // Removed fetchData and loadFromCache from deps to prevent loops

  return {
    data,
    loading,
    error,
    refresh
  }
}

// Prefetch function to warm up cache
export async function prefetchAnalysis(symbol: string) {
  try {
    const response = await fetch(`/api/stocks/${symbol}/analysis`)
    if (response.ok) {
      const data = await response.json()
      const cacheKey = `${STORAGE_PREFIX}${symbol}_analysis`
      const entry: CacheEntry<any> = {
        data,
        timestamp: Date.now()
      }
      sessionStorage.setItem(cacheKey, JSON.stringify(entry))
      console.log(`[Prefetch] Cached analysis for ${symbol}`)
    }
  } catch (err) {
    console.error(`[Prefetch] Error prefetching ${symbol}:`, err)
  }
}

// Clear old cache entries
export function clearOldCache() {
  const now = Date.now()
  const keysToRemove: string[] = []
  
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key && key.startsWith(STORAGE_PREFIX)) {
      try {
        const cached = sessionStorage.getItem(key)
        if (cached) {
          const entry: CacheEntry<any> = JSON.parse(cached)
          if (now - entry.timestamp > CACHE_DURATION) {
            keysToRemove.push(key)
          }
        }
      } catch (err) {
        keysToRemove.push(key!)
      }
    }
  }
  
  keysToRemove.forEach(key => sessionStorage.removeItem(key))
  if (keysToRemove.length > 0) {
    console.log(`[Cache] Cleared ${keysToRemove.length} stale entries`)
  }
}
