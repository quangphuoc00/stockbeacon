import { useEffect, useState, useCallback } from 'react'
import stockWebSocket, { StockUpdate, ScoreUpdate } from '@/lib/websocket/stock-updates'

interface UseRealtimeStockOptions {
  enabled?: boolean
  onPriceUpdate?: (update: StockUpdate) => void
  onScoreUpdate?: (update: ScoreUpdate) => void
}

export function useRealtimeStock(
  symbol: string,
  options: UseRealtimeStockOptions = {}
) {
  const { enabled = true, onPriceUpdate, onScoreUpdate } = options
  const [latestPrice, setLatestPrice] = useState<StockUpdate | null>(null)
  const [latestScore, setLatestScore] = useState<ScoreUpdate | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!enabled || !symbol) return

    // Subscribe to price updates
    const unsubscribePrice = stockWebSocket.subscribeToStock(symbol, (update) => {
      setLatestPrice(update)
      setIsConnected(true)
      onPriceUpdate?.(update)
    })

    // Subscribe to score updates
    const unsubscribeScore = stockWebSocket.subscribeToScore(symbol, (update) => {
      setLatestScore(update)
      onScoreUpdate?.(update)
    })

    // Cleanup
    return () => {
      unsubscribePrice()
      unsubscribeScore()
    }
  }, [symbol, enabled, onPriceUpdate, onScoreUpdate])

  return {
    latestPrice,
    latestScore,
    isConnected,
  }
}

// Hook for multiple stocks (useful for dashboard)
export function useRealtimeStocks(
  symbols: string[],
  options: UseRealtimeStockOptions = {}
) {
  const { enabled = true } = options
  const [prices, setPrices] = useState<Map<string, StockUpdate>>(new Map())
  const [scores, setScores] = useState<Map<string, ScoreUpdate>>(new Map())
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!enabled || symbols.length === 0) return

    const unsubscribers: (() => void)[] = []

    symbols.forEach(symbol => {
      // Subscribe to price updates
      const unsubPrice = stockWebSocket.subscribeToStock(symbol, (update) => {
        setPrices(prev => {
          const newMap = new Map(prev)
          newMap.set(symbol, update)
          return newMap
        })
        setIsConnected(true)
      })

      // Subscribe to score updates
      const unsubScore = stockWebSocket.subscribeToScore(symbol, (update) => {
        setScores(prev => {
          const newMap = new Map(prev)
          newMap.set(symbol, update)
          return newMap
        })
      })

      unsubscribers.push(unsubPrice, unsubScore)
    })

    // Start simulation in development
    if (process.env.NODE_ENV === 'development') {
      stockWebSocket.startSimulation(symbols)
    }

    // Cleanup
    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, [symbols.join(','), enabled])

  return {
    prices,
    scores,
    isConnected,
  }
}
