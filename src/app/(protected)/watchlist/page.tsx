'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { 
  Bell, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
  XCircle,
  Settings,
  Info,
  ArrowUp,
  ArrowDown,
  Star,
  Zap
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
import { Switch } from '@/components/ui/switch'
import Link from 'next/link'

interface WatchlistItem {
  id?: string
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  score: number
  targetPrice?: number
  alertPrice?: number
  reason: string
  waitingFor: {
    priceTarget: boolean
    betterScore: boolean
    technicalSignal: boolean
    earningsReport: boolean
  }
  progress: number // 0-100 how close to trigger
  recommendation: string
  addedDate: Date
  triggerConditions: {
    minScore?: number
    maxPrice?: number
    minRSI?: number
    maxRSI?: number
  }
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [searchSymbol, setSearchSymbol] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedStock, setSelectedStock] = useState<WatchlistItem | null>(null)
  const [alertSettings, setAlertSettings] = useState({
    priceAlerts: true,
    scoreAlerts: true,
    technicalAlerts: true,
    emailAlerts: false,
    pushAlerts: true
  })

  useEffect(() => {
    loadWatchlist()
  }, [])

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
          targetPrice: item.target_price,
          alertPrice: item.target_price,
          reason: item.notes || 'Monitoring for opportunity',
          waitingFor: {
            priceTarget: item.target_price ? item.currentPrice > item.target_price : false,
            betterScore: item.buy_triggers?.minScore ? item.score < item.buy_triggers.minScore : false,
            technicalSignal: false,
            earningsReport: false
          },
          progress: item.target_price 
            ? Math.max(0, Math.min(100, ((item.target_price - item.currentPrice) / (item.target_price - item.currentPrice * 1.2)) * 100))
            : 0,
          recommendation: item.score >= 70 ? 'buy' : item.score >= 50 ? 'hold' : 'sell',
          addedDate: new Date(item.created_at),
          triggerConditions: item.buy_triggers || {}
        }))
        
        setWatchlist(transformedWatchlist)
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
    
    try {
      // First check if user is authenticated
      const authCheck = await fetch('/api/auth/check')
      const authData = await authCheck.json()
      
      if (!authData.authenticated) {
        console.error('User not authenticated:', authData)
        alert('Please log in to add stocks to your watchlist')
        window.location.href = '/login'
        return
      }
      
      // Ensure user profile exists
      const profileFix = await fetch('/api/auth/fix-profile', {
        method: 'POST',
        credentials: 'include'
      })
      const profileData = await profileFix.json()
      
      if (!profileData.success && profileData.error !== 'Profile already exists') {
        console.error('Failed to ensure user profile:', profileData)
      }
      
      // Add to watchlist via API
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({
          symbol: searchSymbol.toUpperCase(),
          notes: 'Monitoring for opportunity'
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        // Reload watchlist to get updated data
        await loadWatchlist()
        setSearchSymbol('')
      } else if (response.status === 409 || data.error === 'Stock already in watchlist') {
        alert('This stock is already in your watchlist')
      } else {
        console.error('Failed to add to watchlist:', data.error, data.message)
        // Show the actual error message without duplication
        const errorMessage = data.message || data.error || 'Unknown error'
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error)
      alert('An error occurred while adding to watchlist')
    }
  }

  const removeFromWatchlist = async (id: string) => {
    try {
      const response = await fetch(`/api/watchlist?id=${id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Update local state immediately for better UX
        setWatchlist(watchlist.filter(item => item.id !== id))
      } else {
        console.error('Failed to remove from watchlist:', data.error)
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error)
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 60) return 'bg-yellow-500'
    if (progress >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getWaitingReasons = (item: WatchlistItem) => {
    const reasons = []
    if (item.waitingFor.priceTarget) reasons.push('Price Target')
    if (item.waitingFor.betterScore) reasons.push('Better Score')
    if (item.waitingFor.technicalSignal) reasons.push('Technical Signal')
    if (item.waitingFor.earningsReport) reasons.push('Earnings Report')
    return reasons
  }

  const getPerfectStormStocks = () => {
    return watchlist.filter(item => item.progress >= 80)
  }

  const perfectStormStocks = getPerfectStormStocks()

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Stock to Watchlist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter stock symbol (e.g., AAPL)"
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && addToWatchlist()}
            />
            <Button onClick={addToWatchlist}>
              <Plus className="h-4 w-4 mr-1" />
              Add to Watchlist
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-1" />
                  Alert Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alert Preferences</DialogTitle>
                  <DialogDescription>
                    Configure how you want to be notified
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="price-alerts">Price Alerts</Label>
                    <Switch
                      id="price-alerts"
                      checked={alertSettings.priceAlerts}
                      onCheckedChange={(checked: boolean) => 
                        setAlertSettings({...alertSettings, priceAlerts: checked})
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="score-alerts">Score Change Alerts</Label>
                    <Switch
                      id="score-alerts"
                      checked={alertSettings.scoreAlerts}
                      onCheckedChange={(checked: boolean) => 
                        setAlertSettings({...alertSettings, scoreAlerts: checked})
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="technical-alerts">Technical Signal Alerts</Label>
                    <Switch
                      id="technical-alerts"
                      checked={alertSettings.technicalAlerts}
                      onCheckedChange={(checked: boolean) => 
                        setAlertSettings({...alertSettings, technicalAlerts: checked})
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-alerts">Email Notifications</Label>
                    <Switch
                      id="email-alerts"
                      checked={alertSettings.emailAlerts}
                      onCheckedChange={(checked: boolean) => 
                        setAlertSettings({...alertSettings, emailAlerts: checked})
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-alerts">Push Notifications</Label>
                    <Switch
                      id="push-alerts"
                      checked={alertSettings.pushAlerts}
                      onCheckedChange={(checked: boolean) => 
                        setAlertSettings({...alertSettings, pushAlerts: checked})
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Save Preferences</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Watchlist Items */}
      {loading ? (
        <div className="text-center py-8">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading watchlist...</p>
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
            <Card key={item.symbol} className={item.progress >= 80 ? 'border-green-500' : ''}>
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
                    <p className="text-sm text-muted-foreground italic">"{item.reason}"</p>
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

                {/* Progress to Buy Signal */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">Buy Signal Progress</span>
                    <span className="text-sm font-bold">{item.progress}%</span>
                  </div>
                  <Progress value={item.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.progress >= 80 ? 'All conditions nearly met - consider buying!' :
                     item.progress >= 60 ? 'Getting closer to ideal entry point' :
                     item.progress >= 40 ? 'Some conditions met, keep watching' :
                     'Patience - waiting for better conditions'}
                  </p>
                </div>

                {/* Waiting For Indicators */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    {item.waitingFor.priceTarget ? (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Price Target</p>
                      <p className="text-sm font-semibold">
                        {item.targetPrice ? `< ${formatCurrency(item.targetPrice)}` : 'Not set'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.waitingFor.betterScore ? (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Min Score</p>
                      <p className="text-sm font-semibold">
                        {item.triggerConditions.minScore || 'Any'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.waitingFor.technicalSignal ? (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Technical</p>
                      <p className="text-sm font-semibold">
                        {item.triggerConditions.maxRSI ? `RSI < ${item.triggerConditions.maxRSI}` : 'Good'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.waitingFor.earningsReport ? (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Earnings</p>
                      <p className="text-sm font-semibold">After ER</p>
                    </div>
                  </div>
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
                          Set Triggers
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Configure Buy Triggers for {item.symbol}</DialogTitle>
                          <DialogDescription>
                            Set the conditions that will alert you to buy
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label>Target Price (Buy below)</Label>
                            <Input 
                              type="number" 
                              placeholder={item.targetPrice?.toString() || 'Enter price'}
                            />
                          </div>
                          <div>
                            <Label>Minimum Score Required</Label>
                            <Input 
                              type="number" 
                              placeholder={item.triggerConditions.minScore?.toString() || '0-100'}
                            />
                          </div>
                          <div>
                            <Label>Maximum RSI (Oversold)</Label>
                            <Input 
                              type="number" 
                              placeholder={item.triggerConditions.maxRSI?.toString() || '30'}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">Save Triggers</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => item.id && removeFromWatchlist(item.id)}
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
