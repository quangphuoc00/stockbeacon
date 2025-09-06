import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export function useStockPreload() {
  const router = useRouter()
  
  const preloadStock = useCallback((symbol: string) => {
    // Prefetch the stock page
    router.prefetch(`/stocks/${symbol}`)
    
    // Preload stock data via API
    fetch(`/api/stocks/${symbol}/profile`)
      .then(res => res.json())
      .catch(() => {}) // Ignore errors for preloading
      
    // Preload historical data
    fetch(`/api/stocks/${symbol}/historical?period=5y`)
      .then(res => res.json())
      .catch(() => {}) // Ignore errors for preloading
  }, [router])
  
  return { preloadStock }
}
