'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Star,
  Zap,
  AlertCircle
} from 'lucide-react'
import { formatCurrency, formatPercentage, getScoreColor, getScoreBgColor } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { InlineLoadingSpinner } from '@/components/ui/loading-spinner'
import { WatchlistItemShimmer } from '@/components/ui/shimmer'
import Link from 'next/link'

interface WatchlistItem {
  id?: string
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  score: number
  timingScore?: number
  targetPrice?: number
  alertPrice?: number
  reason: string
  waitingFor: {
    priceTarget: boolean
    betterScore: boolean
  }
  progress: number // 0-100 how close to trigger
  recommendation: string
  addedDate: Date
  triggerConditions: {
    minScore?: number
    maxPrice?: number
    minPullback?: number
    minTimingScore?: number
  }
}

interface StockSuggestion {
  symbol: string
  name: string
  exchange: string
  type: string
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [searchSymbol, setSearchSymbol] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedStock, setSelectedStock] = useState<WatchlistItem | null>(null)
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set())
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null)
  const [newlyAddedItems, setNewlyAddedItems] = useState<Set<string>>(new Set())
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [alertSettings, setAlertSettings] = useState<Record<string, {
    targetPrice: string
    minScore: string
    minTimingScore: string
  }>>({})
  const [savingAlerts, setSavingAlerts] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadWatchlist()
    // Ensure user profile exists once when page loads
    ensureUserProfile()
  }, [])
  
  const ensureUserProfile = async () => {
    try {
      const response = await fetch('/api/auth/fix-profile', {
        method: 'POST',
        credentials: 'include'
      })
      const data = await response.json()
      if (!data.success && data.error !== 'Profile already exists') {
        console.error('Failed to ensure user profile:', data)
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error)
    }
  }

  // Search for stock suggestions
  const searchStocks = async (query: string) => {
    if (query.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setSearchLoading(true)
    try {
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      
      if (data.success && data.data.length > 0) {
        setSuggestions(data.data)
        setShowSuggestions(true)
        setSelectedSuggestionIndex(-1)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    } catch (error) {
      console.error('Error searching stocks:', error)
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setSearchLoading(false)
    }
  }

  // Debounce timer
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchSymbol.length > 0) {
        searchStocks(searchSymbol)
      }
    }, 500) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchSymbol])

  const handleSearchInputChange = (value: string) => {
    setSearchSymbol(value.toUpperCase())
  }

  const selectSuggestion = (suggestion: StockSuggestion) => {
    setSearchSymbol(suggestion.symbol)
    setShowSuggestions(false)
    setSuggestions([])
    setSelectedSuggestionIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        addToWatchlist()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedSuggestionIndex])
        } else {
          addToWatchlist()
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
    }
  }

  const loadWatchlist = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/watchlist', {
        credentials: 'include' // Ensure cookies are sent
      })
      
      if (response.status === 401) {
        console.log('User not authenticated, redirecting to login...')
        window.location.href = '/login'
        return
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Transform API data to match our interface
        const transformedWatchlist: WatchlistItem[] = data.data.map((item: any) => ({
          id: item.id,
          symbol: item.symbol,
          name: item.name,
          price: item.currentPrice,
          change: item.change,
          changePercent: item.changePercent,
          score: item.score,
          timingScore: item.timingScore,
          targetPrice: item.target_price,
          alertPrice: item.target_price,
          reason: item.notes || '',
          waitingFor: {
            priceTarget: item.target_price ? item.currentPrice > item.target_price : false,
            betterScore: item.buy_triggers?.minScore ? item.score < item.buy_triggers.minScore : false
          },
          progress: item.target_price 
            ? Math.max(0, Math.min(100, ((item.target_price - item.currentPrice) / (item.target_price - item.currentPrice * 1.2)) * 100))
            : 0,
          recommendation: item.score >= 70 ? 'buy' : item.score >= 50 ? 'hold' : 'sell',
          addedDate: new Date(item.created_at),
          triggerConditions: item.buy_triggers || {}
        }))
        
        setWatchlist(transformedWatchlist)
        
        // Initialize alert settings for each item
        const initialAlertSettings: Record<string, {
          targetPrice: string
          minScore: string
          minTimingScore: string
        }> = {}
        
        transformedWatchlist.forEach(item => {
          if (item.id) {
            initialAlertSettings[item.id] = {
              targetPrice: item.targetPrice?.toString() || '',
              minScore: item.triggerConditions.minScore?.toString() || '70',
              minTimingScore: item.triggerConditions.minTimingScore?.toString() || '50'
            }
          }
        })
        
        setAlertSettings(initialAlertSettings)
      } else {
        console.error('Failed to load watchlist:', data.error)
      }
    } catch (error) {
      console.error('Error loading watchlist:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToWatchlist = async () => {
    if (!searchSymbol) return
    
    // Hide suggestions when adding
    setShowSuggestions(false)
    
    // Start adding animation
    setAddingSymbol(searchSymbol)
    
    try {
      // Add to watchlist via API (skip auth checks - we're already on protected page)
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          symbol: searchSymbol.toUpperCase(),
          notes: ''
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        // Mark the new item for animation
        const newSymbol = searchSymbol
        setNewlyAddedItems(prev => new Set(prev).add(newSymbol))
        
        // Create new watchlist item from the enriched response
        const newItem: WatchlistItem = {
          id: data.data.id,
          symbol: newSymbol,
          name: data.data.name || newSymbol,
          price: data.data.currentPrice || 0,
          change: data.data.change || 0,
          changePercent: data.data.changePercent || 0,
          score: data.data.score || 0,
          timingScore: data.data.timingScore || 0,
          targetPrice: data.data.target_price,
          alertPrice: data.data.target_price,
          reason: data.data.notes || '',
          waitingFor: {
            priceTarget: data.data.target_price ? (data.data.currentPrice || 0) > data.data.target_price : false,
            betterScore: data.data.buy_triggers?.minScore ? (data.data.score || 0) < data.data.buy_triggers.minScore : false
          },
          progress: data.data.target_price 
            ? Math.max(0, Math.min(100, ((data.data.target_price - (data.data.currentPrice || 0)) / (data.data.target_price - (data.data.currentPrice || 0) * 1.2)) * 100))
            : 0,
          recommendation: (data.data.score || 0) >= 70 ? 'buy' : (data.data.score || 0) >= 50 ? 'hold' : 'sell',
          addedDate: new Date(data.data.created_at || new Date()),
          triggerConditions: data.data.buy_triggers || {}
        }
        
        // Add to watchlist immediately (optimistic update) - add to top
        setWatchlist(prev => [newItem, ...prev])
        
        setSearchSymbol('')
        setAddingSymbol(null)
        
        // Show success message
        setSuccessMessage(`${newSymbol} added to watchlist!`)
        setTimeout(() => setSuccessMessage(null), 3000)
        
        // Remove from animation set after animation completes
        setTimeout(() => {
          setNewlyAddedItems(prev => {
            const newSet = new Set(prev)
            newSet.delete(newSymbol)
            return newSet
          })
        }, 600) // Animation duration
      } else if (response.status === 409 || data.error === 'Stock already in watchlist') {
        alert('This stock is already in your watchlist')
        setAddingSymbol(null)
      } else if (response.status === 401) {
        // Only redirect if truly unauthorized
        window.location.href = '/login'
      } else {
        console.error('Failed to add to watchlist:', data.error, data.message)
        const errorMessage = data.message || data.error || 'Unknown error'
        alert(errorMessage)
        setAddingSymbol(null)
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error)
      alert('An error occurred while adding to watchlist')
      setAddingSymbol(null)
    }
  }

  const removeFromWatchlist = async (id: string) => {
    // Start removal animation
    setRemovingItems(prev => new Set(prev).add(id))
    
    // Wait for animation to complete
    setTimeout(async () => {
      try {
        const response = await fetch(`/api/watchlist?id=${id}`, {
          method: 'DELETE'
        })
        
        const data = await response.json()
        
        if (data.success) {
          // Update local state after animation
          setWatchlist(watchlist.filter(item => item.id !== id))
          setRemovingItems(prev => {
            const newSet = new Set(prev)
            newSet.delete(id)
            return newSet
          })
        } else {
          console.error('Failed to remove from watchlist:', data.error)
          // Remove from animating set if failed
          setRemovingItems(prev => {
            const newSet = new Set(prev)
            newSet.delete(id)
            return newSet
          })
        }
      } catch (error) {
        console.error('Error removing from watchlist:', error)
        // Remove from animating set if error
        setRemovingItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })
      }
    }, 300) // Match animation duration
  }


  const getWaitingReasons = (item: WatchlistItem) => {
    const reasons = []
    if (item.waitingFor.priceTarget) reasons.push('Price Target')
    if (item.waitingFor.betterScore) reasons.push('Better Score')
    if (item.triggerConditions.minTimingScore && item.timingScore !== undefined && 
        Math.round((item.timingScore/40)*100) < item.triggerConditions.minTimingScore) {
      reasons.push('Better Timing')
    }
    return reasons
  }

  const handleSaveAlerts = async (itemId: string, symbol: string) => {
    if (!itemId || !alertSettings[itemId]) return
    
    setSavingAlerts(prev => new Set([...prev, itemId]))
    
    try {
      const settings = alertSettings[itemId]
      const payload = {
        target_price: settings.targetPrice ? parseFloat(settings.targetPrice) : null,
        buy_triggers: {
          minScore: settings.minScore ? parseInt(settings.minScore) : null,
          minTimingScore: settings.minTimingScore ? parseInt(settings.minTimingScore) : null,
          enabled: true
        }
      }
      
      const response = await fetch(`/api/watchlist`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id: itemId,
          updates: payload
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Update local watchlist with new trigger conditions
        setWatchlist(prev => prev.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              targetPrice: payload.target_price || undefined,
              triggerConditions: {
                ...item.triggerConditions,
                minScore: payload.buy_triggers.minScore || undefined,
                minTimingScore: payload.buy_triggers.minTimingScore || undefined
              }
            }
          }
          return item
        }))
        
        // Show success message
        setSuccessMessage(`Alert settings saved for ${symbol}`)
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        console.error('Failed to save alert settings:', data.error)
        // You could show an error toast here
      }
    } catch (error) {
      console.error('Error saving alert settings:', error)
    } finally {
      setSavingAlerts(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  const getPerfectStormStocks = () => {
    // Perfect storm: High quality business (score >= 70) with good entry timing (score >= 50)
    return watchlist.filter(item => 
      item.score >= 70 && 
      item.timingScore && Math.round((item.timingScore/40)*100) >= 50
    )
  }

  const perfectStormStocks = getPerfectStormStocks()

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Success Message */}
      {successMessage && (
        <div className={`fixed top-4 right-4 z-50 animate-slide-in-right`}>
          <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Smart Watchlist</h1>
        <p className="text-muted-foreground">
          Track stocks and get notified when the perfect buying opportunity arrives
        </p>
      </div>

      {/* Perfect Storm Alert */}
      {perfectStormStocks.length > 0 && (
        <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Zap className="h-5 w-5" />
              Perfect Storm Alert!
            </CardTitle>
            <CardDescription>
              These stocks are close to meeting all your buy criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {perfectStormStocks.map(stock => (
                <Badge key={stock.symbol} variant="default" className="text-lg py-1 px-3">
                  {stock.symbol} ({stock.progress}% ready)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Watching</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{watchlist.length}</div>
            <p className="text-sm text-muted-foreground">Active stocks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ready to Buy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {watchlist.filter(s => s.progress >= 80).length}
            </div>
            <p className="text-sm text-muted-foreground">Meeting criteria</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Almost Ready</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {watchlist.filter(s => s.progress >= 60 && s.progress < 80).length}
            </div>
            <p className="text-sm text-muted-foreground">60-80% there</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Waiting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {watchlist.filter(s => s.progress < 60).length}
            </div>
            <p className="text-sm text-muted-foreground">Patience needed</p>
          </CardContent>
        </Card>
      </div>

      {/* Add to Watchlist */}
      <Card className="mb-6 overflow-visible">
        <CardHeader>
          <CardTitle>Add Stock to Watchlist</CardTitle>
        </CardHeader>
        <CardContent className="overflow-visible">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="relative">
                <Input
                  placeholder="Enter stock symbol (e.g., AAPL)"
                  value={searchSymbol}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (searchSymbol.length > 0 && suggestions.length > 0) {
                      setShowSuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 200)
                  }}
                  className="pr-8"
                />
                {searchLoading && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <InlineLoadingSpinner className="text-muted-foreground" />
                  </div>
                )}
              </div>
              
              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-[100] max-h-64 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={suggestion.symbol}
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                        index === selectedSuggestionIndex ? 'bg-gray-100 dark:bg-gray-800' : ''
                      }`}
                      onMouseDown={() => selectSuggestion(suggestion)}
                      onMouseEnter={() => setSelectedSuggestionIndex(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{suggestion.symbol}</div>
                          <div className="text-sm text-muted-foreground">{suggestion.name}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{suggestion.exchange}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button 
              onClick={addToWatchlist} 
              disabled={!searchSymbol || !!addingSymbol}
              className="relative"
            >
              {addingSymbol ? (
                <>
                  <InlineLoadingSpinner className="mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add to Watchlist
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Watchlist Items */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <WatchlistItemShimmer key={i} />
          ))}
        </div>
      ) : watchlist.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Your watchlist is empty</p>
            <p className="text-muted-foreground">
              Add stocks you want to monitor for the perfect buying opportunity
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {watchlist.map((item) => (
            <Card 
              key={item.symbol} 
              className={`
                transition-all duration-300 ease-out
                ${item.progress >= 80 ? 'border-green-500' : ''}
                ${item.id && removingItems.has(item.id) 
                  ? 'opacity-0 scale-95 translate-x-full' 
                  : newlyAddedItems.has(item.symbol)
                  ? 'animate-slide-in-left border-green-400 shadow-green-200/50 shadow-lg'
                  : 'opacity-100 scale-100 translate-x-0'
                }
              `}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link href={`/stocks/${item.symbol}`}>
                        <h3 className="text-xl font-bold hover:underline cursor-pointer">
                          {item.symbol}
                        </h3>
                      </Link>
                      <Badge className={`${getScoreBgColor(item.score)} text-gray-900 font-bold`}>
                        Score: {item.score}
                      </Badge>
                      <Badge 
                        variant={
                          item.recommendation === 'strong_buy' ? 'default' :
                          item.recommendation === 'buy' ? 'secondary' :
                          'outline'
                        }
                      >
                        {item.recommendation.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {item.progress >= 80 && (
                        <Badge className="bg-green-500">
                          <Zap className="h-3 w-3 mr-1" />
                          READY
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mb-2">{item.name}</p>
                    {item.reason && (
                      <p className="text-sm text-muted-foreground italic">"{item.reason}"</p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold">{formatCurrency(item.price)}</div>
                    <div className={`flex items-center justify-end gap-1 ${
                      item.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.changePercent >= 0 ? 
                        <ArrowUp className="h-4 w-4" /> : 
                        <ArrowDown className="h-4 w-4" />
                      }
                      {formatCurrency(Math.abs(item.change))} ({formatPercentage(item.changePercent)})
                    </div>
                  </div>
                </div>

                {/* Business Quality & Time to Buy Scores */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Business Quality</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-2xl font-bold ${getScoreColor(item.score)}`}>
                        {item.score}
                      </span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Time to Buy</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-2xl font-bold ${
                        item.timingScore && item.timingScore >= 25 ? 'text-green-600' :
                        item.timingScore && item.timingScore >= 15 ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {item.timingScore ? Math.round((item.timingScore/40)*100) : 'N/A'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.timingScore ? '/100' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Alert Conditions */}
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    Alert When ALL Conditions Met:
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {item.waitingFor.priceTarget ? (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <span className="text-muted-foreground">Price drops below</span>
                      </div>
                      <span className="font-medium">
                        {item.targetPrice ? formatCurrency(item.targetPrice) : 'Any price ✓'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {item.waitingFor.betterScore ? (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <span className="text-muted-foreground">Business Quality reaches</span>
                      </div>
                      <span className="font-medium">
                        {item.triggerConditions.minScore ? `${item.triggerConditions.minScore}+ (now: ${item.score})` : 'Any score ✓'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {item.triggerConditions.minTimingScore && item.timingScore !== undefined && 
                         Math.round((item.timingScore/40)*100) < item.triggerConditions.minTimingScore ? (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <span className="text-muted-foreground">Time to Buy reaches</span>
                      </div>
                      <span className="font-medium">
                        {item.triggerConditions.minTimingScore 
                          ? `${item.triggerConditions.minTimingScore}+ (now: ${item.timingScore !== undefined ? Math.round((item.timingScore/40)*100) : 'N/A'})`
                          : 'Any timing ✓'}
                      </span>
                    </div>
                  </div>
                  
                  {getWaitingReasons(item).length === 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 text-green-600 font-medium">
                        <CheckCircle className="h-5 w-5" />
                        All conditions met - Perfect time to buy!
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Added {new Date(item.addedDate).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Target className="h-4 w-4 mr-1" />
                          Set Alerts
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Configure Buy Alerts for {item.symbol}</DialogTitle>
                          <DialogDescription>
                            Set conditions that will trigger a buy alert
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label>Target Price (Buy below)</Label>
                            <Input 
                              type="number" 
                              placeholder={item.targetPrice?.toString() || 'Enter price'}
                              value={(item.id && alertSettings[item.id]?.targetPrice) || ''}
                              onChange={(e) => {
                                const itemId = item.id
                                if (itemId) {
                                  setAlertSettings(prev => ({
                                    ...prev,
                                    [itemId]: {
                                      ...(prev[itemId] || { targetPrice: '', minScore: '70', minTimingScore: '50' }),
                                      targetPrice: e.target.value
                                    }
                                  }))
                                }
                              }}
                            />
                          </div>
                          <div>
                            <Label>Minimum Business Quality Score</Label>
                            <Input 
                              type="number" 
                              placeholder={item.triggerConditions.minScore?.toString() || '70'}
                              value={(item.id && alertSettings[item.id]?.minScore) || ''}
                              onChange={(e) => {
                                const itemId = item.id
                                if (itemId) {
                                  setAlertSettings(prev => ({
                                    ...prev,
                                    [itemId]: {
                                      ...(prev[itemId] || { targetPrice: '', minScore: '70', minTimingScore: '50' }),
                                      minScore: e.target.value
                                    }
                                  }))
                                }
                              }}
                              min="0"
                              max="100"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Only buy high-quality businesses (70+ recommended)
                            </p>
                          </div>
                          <div>
                            <Label>Minimum Time to Buy Score</Label>
                            <Input 
                              type="number" 
                              placeholder={item.triggerConditions.minTimingScore?.toString() || '50'}
                              value={(item.id && alertSettings[item.id]?.minTimingScore) || ''}
                              onChange={(e) => {
                                const itemId = item.id
                                if (itemId) {
                                  setAlertSettings(prev => ({
                                    ...prev,
                                    [itemId]: {
                                      ...(prev[itemId] || { targetPrice: '', minScore: '70', minTimingScore: '50' }),
                                      minTimingScore: e.target.value
                                    }
                                  }))
                                }
                              }}
                              min="0"
                              max="100"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Wait for favorable valuation and technical conditions (50+ recommended)
                            </p>
                            {item.timingScore !== undefined && (
                              <div className="flex items-center gap-2 text-xs mt-2">
                                <span className="text-muted-foreground">Current:</span>
                                <span className={`font-semibold ${
                                  item.timingScore >= 25 ? 'text-green-600' :
                                  item.timingScore >= 15 ? 'text-yellow-600' :
                                  'text-gray-600'
                                }`}>
                                  {Math.round((item.timingScore/40)*100)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            onClick={() => handleSaveAlerts(item.id || '', item.symbol)}
                            disabled={!!(item.id && savingAlerts.has(item.id))}
                          >
                            {item.id && savingAlerts.has(item.id) ? (
                              <>
                                <InlineLoadingSpinner className="mr-2" />
                                Saving...
                              </>
                            ) : (
                              'Save Alerts'
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (item.id && confirm(`Remove ${item.symbol} from watchlist?`)) {
                          removeFromWatchlist(item.id)
                        }
                      }}
                      className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                      disabled={!!(item.id && removingItems.has(item.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
