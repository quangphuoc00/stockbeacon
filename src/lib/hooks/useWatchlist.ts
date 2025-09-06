import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'

interface WatchlistItem {
  id: string
  symbol: string
  target_price?: number
  notes?: string
  created_at: string
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      loadWatchlist()
    }
  }, [user])

  const loadWatchlist = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', user.id)

      if (!error && data) {
        setWatchlist(data)
      }
    } catch (error) {
      console.error('Error loading watchlist:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToWatchlist = useCallback(async (symbol: string, targetPrice?: number, notes?: string) => {
    if (!user) return

    setLoading(true)
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          targetPrice,
          notes,
        }),
      })

      if (response.ok) {
        await loadWatchlist()
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  const removeFromWatchlist = useCallback(async (symbol: string) => {
    if (!user) return

    const item = watchlist.find(w => w.symbol === symbol)
    if (!item) return

    setLoading(true)
    try {
      const response = await fetch(`/api/watchlist?id=${item.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadWatchlist()
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error)
    } finally {
      setLoading(false)
    }
  }, [user, watchlist])

  const isInWatchlist = useCallback((symbol: string) => {
    return watchlist.some(item => item.symbol === symbol)
  }, [watchlist])

  return {
    watchlist,
    loading,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    reload: loadWatchlist,
  }
}
