'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Search, X, TrendingUp, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useStockPreload } from '@/hooks/useStockPreload'

interface StockSuggestion {
  symbol: string
  name: string
  exchange?: string
  type?: string
}

export function StockSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const { preloadStock } = useStockPreload()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [navigating, setNavigating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load recent searches from localStorage and prefetch
  useEffect(() => {
    const saved = localStorage.getItem('recentStockSearches')
    if (saved) {
      const recent = JSON.parse(saved).slice(0, 5)
      setRecentSearches(recent)
      
      // Prefetch recent stocks for instant navigation
      recent.forEach((symbol: string) => {
        router.prefetch(`/stocks/${symbol}`)
      })
    }
    
    // Prefetch popular stocks
    const popularStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']
    popularStocks.forEach(symbol => {
      router.prefetch(`/stocks/${symbol}`)
    })
  }, [router])

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])
  
  // Reset navigating state on route change
  useEffect(() => {
    setNavigating(false)
  }, [pathname])

  // Search for stocks
  const searchStocks = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.data || [])
        
        // Prefetch the top 3 results for faster navigation
        if (data.data && data.data.length > 0) {
          data.data.slice(0, 3).forEach((stock: StockSuggestion) => {
            router.prefetch(`/stocks/${stock.symbol}`)
          })
        }
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchStocks(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, searchStocks])

  // Handle selection
  const handleSelect = async (symbol: string) => {
    // Show loading state immediately
    setNavigating(true)
    
    // Save to recent searches
    const updated = [symbol, ...recentSearches.filter(s => s !== symbol)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recentStockSearches', JSON.stringify(updated))
    
    // Close dialog immediately for better UX
    setOpen(false)
    setSearch('')
    setSuggestions([])
    setSelectedIndex(-1)
    
    // Navigate to stock page
    router.push(`/stocks/${symbol}`)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => {
        const max = suggestions.length > 0 ? suggestions.length - 1 : recentSearches.length - 1
        return prev < max ? prev + 1 : prev
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      if (suggestions.length > 0) {
        handleSelect(suggestions[selectedIndex].symbol)
      } else if (recentSearches.length > 0) {
        handleSelect(recentSearches[selectedIndex])
      }
    }
  }

  const popularStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA']

  return (
    <>
      {/* Loading Overlay */}
      {navigating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading stock details...</p>
          </div>
        </div>
      )}
      
      {/* Desktop Search Button */}
      <Button
        variant="outline"
        className="hidden md:flex items-center gap-2 px-3 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">Search stocks...</span>
        <kbd className="pointer-events-none ml-2 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Mobile Search Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
      >
        <Search className="h-5 w-5" />
      </Button>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 max-w-2xl">
          <DialogTitle className="sr-only">Search Stocks</DialogTitle>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              ref={inputRef}
              placeholder="Search stocks by symbol or name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setSelectedIndex(-1)
              }}
              onKeyDown={handleKeyDown}
              className="flex h-12 w-full rounded-none border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setSearch('')
                  setSuggestions([])
                  setSelectedIndex(-1)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="max-h-[300px] overflow-y-auto overflow-x-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : suggestions.length > 0 ? (
              <div className="p-2">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Search Results</p>
                {suggestions.map((stock, index) => (
                  <button
                    key={stock.symbol}
                    onClick={() => handleSelect(stock.symbol)}
                    onMouseEnter={() => preloadStock(stock.symbol)}
                    className={`flex w-full items-center justify-between rounded-sm px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                      index === selectedIndex ? 'bg-accent text-accent-foreground' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <TrendingUp className="h-4 w-4 shrink-0" />
                      <div>
                        <div className="font-semibold">{stock.symbol}</div>
                        <div className="text-xs text-muted-foreground">{stock.name}</div>
                      </div>
                    </div>
                    {stock.exchange && (
                      <Badge variant="outline" className="text-xs">
                        {stock.exchange}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            ) : search ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No stocks found
              </div>
            ) : (
              <>
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Recent Searches</p>
                    {recentSearches.map((symbol, index) => (
                      <button
                        key={symbol}
                        onClick={() => handleSelect(symbol)}
                        onMouseEnter={() => preloadStock(symbol)}
                        className={`flex w-full items-center gap-3 rounded-sm px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                          index === selectedIndex ? 'bg-accent text-accent-foreground' : ''
                        }`}
                      >
                        <TrendingUp className="h-4 w-4" />
                        <span>{symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Popular Stocks */}
                <div className="p-2">
                  <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Popular Stocks</p>
                  {popularStocks.map((symbol, index) => {
                    const adjustedIndex = recentSearches.length > 0 ? index + recentSearches.length + 1 : index
                    return (
                      <button
                        key={symbol}
                        onClick={() => handleSelect(symbol)}
                        onMouseEnter={() => preloadStock(symbol)}
                        className={`flex w-full items-center gap-3 rounded-sm px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                          adjustedIndex === selectedIndex ? 'bg-accent text-accent-foreground' : ''
                        }`}
                      >
                        <TrendingUp className="h-4 w-4" />
                        <span>{symbol}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
