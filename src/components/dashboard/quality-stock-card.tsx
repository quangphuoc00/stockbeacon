'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreBadge } from '@/components/ui/score-badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Plus, 
  ChevronRight,
  Building2,
  DollarSign,
  Target,
  Clock,
  BarChart3
} from 'lucide-react'
import { formatCurrency, formatPercentage, getScoreColor, cn } from '@/lib/utils'
import { useWatchlist } from '@/lib/hooks'

interface StockWithValuation {
  symbol: string
  companyName: string
  sector: string
  currentPrice: number
  priceChange: number
  priceChangePercent: number
  score: number
  businessQualityScore: number
  timingScore: number
  recommendation: string
  fairValue: number
  discountPremium: number
  peRatio: number | null
  marketCap: number
  calculatedAt: Date
}

interface QualityStockCardProps {
  stock: StockWithValuation
  view: 'grid' | 'card'
}

export function QualityStockCard({ stock, view }: QualityStockCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { addToWatchlist, removeFromWatchlist, isInWatchlist, loading } = useWatchlist()
  const inWatchlist = isInWatchlist(stock.symbol)
  
  const getPriceChangeIcon = () => {
    if (stock.priceChangePercent > 0) {
      return <TrendingUp className="h-4 w-4" />
    } else if (stock.priceChangePercent < 0) {
      return <TrendingDown className="h-4 w-4" />
    }
    return <Minus className="h-4 w-4" />
  }
  
  const getPriceChangeColor = () => {
    if (stock.priceChangePercent > 0) return 'text-green-600'
    if (stock.priceChangePercent < 0) return 'text-red-600'
    return 'text-gray-600'
  }
  
  const getRecommendationBadge = () => {
    const variants: Record<string, any> = {
      'strong_buy': { variant: 'default', className: 'bg-green-600' },
      'buy': { variant: 'default', className: 'bg-green-500' },
      'hold': { variant: 'secondary', className: '' },
      'sell': { variant: 'default', className: 'bg-orange-500' },
      'strong_sell': { variant: 'default', className: 'bg-red-600' }
    }
    
    const config = variants[stock.recommendation] || variants.hold
    const label = stock.recommendation.replace('_', ' ').toUpperCase()
    
    return (
      <Badge variant={config.variant as any} className={config.className}>
        {label}
      </Badge>
    )
  }
  
  const handleWatchlistToggle = async () => {
    if (inWatchlist) {
      await removeFromWatchlist(stock.symbol)
    } else {
      await addToWatchlist(stock.symbol, {
        addedPrice: stock.currentPrice,
        notes: `Fair value: ${formatCurrency(stock.fairValue)}`
      })
    }
  }
  
  if (view === 'grid') {
    return (
      <div className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/50 transition-colors items-center">
        <div className="col-span-3">
          <Link 
            href={`/stocks/${stock.symbol}`}
            className="hover:underline"
          >
            <div className="font-medium">{stock.symbol}</div>
            <div className="text-sm text-muted-foreground truncate">
              {stock.companyName}
            </div>
            <Badge variant="outline" className="mt-1 text-xs">
              {stock.sector}
            </Badge>
          </Link>
        </div>
        
        <div className="col-span-1 text-right">
          <div className="font-medium">{formatCurrency(stock.currentPrice)}</div>
        </div>
        
        <div className={cn('col-span-1 text-right flex items-center justify-end gap-1', getPriceChangeColor())}>
          {getPriceChangeIcon()}
          <span className="font-medium">{formatPercentage(Math.abs(stock.priceChangePercent))}</span>
        </div>
        
        <div className="col-span-1 text-right">
          <ScoreBadge score={stock.score} size="sm" />
        </div>
        
        <div className="col-span-1 text-right">
          <div className="text-sm">{stock.businessQualityScore}/60</div>
        </div>
        
        <div className="col-span-1 text-right">
          <div className="text-sm">{stock.timingScore}/40</div>
        </div>
        
        <div className="col-span-1 text-right">
          <div className={cn(
            'font-medium',
            stock.discountPremium < 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {stock.discountPremium > 0 ? '+' : ''}{stock.discountPremium.toFixed(1)}%
          </div>
        </div>
        
        <div className="col-span-1 text-right">
          <div className="text-sm">
            {stock.peRatio ? stock.peRatio.toFixed(1) : '-'}
          </div>
        </div>
        
        <div className="col-span-2 flex items-center gap-2">
          {getRecommendationBadge()}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleWatchlistToggle}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            {inWatchlist ? (
              <Minus className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
          <Link href={`/stocks/${stock.symbol}`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }
  
  // Card view for mobile
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <Link 
            href={`/stocks/${stock.symbol}`}
            className="hover:underline"
          >
            <div className="font-semibold text-lg">{stock.symbol}</div>
            <div className="text-sm text-muted-foreground">
              {stock.companyName}
            </div>
          </Link>
          <Badge variant="outline" className="mt-1 text-xs">
            {stock.sector}
          </Badge>
        </div>
        
        <div className="text-right">
          <div className="font-semibold text-lg">
            {formatCurrency(stock.currentPrice)}
          </div>
          <div className={cn('flex items-center gap-1 text-sm', getPriceChangeColor())}>
            {getPriceChangeIcon()}
            <span>{formatPercentage(Math.abs(stock.priceChangePercent))}</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
        <div>
          <div className="text-xs text-muted-foreground">Overall Score</div>
          <ScoreBadge score={stock.score} size="sm" />
        </div>
        
        <div>
          <div className="text-xs text-muted-foreground">Valuation</div>
          <div className={cn(
            'font-medium',
            stock.discountPremium < 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {stock.discountPremium > 0 ? '+' : ''}{stock.discountPremium.toFixed(1)}%
          </div>
        </div>
        
        <div>
          <div className="text-xs text-muted-foreground">Business/Timing</div>
          <div className="text-sm">
            {stock.businessQualityScore}/{stock.timingScore}
          </div>
        </div>
        
        <div>
          <div className="text-xs text-muted-foreground">P/E Ratio</div>
          <div className="text-sm">
            {stock.peRatio ? stock.peRatio.toFixed(1) : '-'}
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-2">
        {getRecommendationBadge()}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleWatchlistToggle}
            disabled={loading}
          >
            {inWatchlist ? 'Remove' : 'Watch'}
          </Button>
          <Link href={`/stocks/${stock.symbol}`}>
            <Button variant="default" size="sm">
              Details
            </Button>
          </Link>
        </div>
      </div>
      
      {isExpanded && (
        <div className="pt-3 border-t space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fair Value</span>
            <span className="font-medium">{formatCurrency(stock.fairValue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Market Cap</span>
            <span className="font-medium">{formatCurrency(stock.marketCap, 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Updated</span>
            <span className="font-medium">
              {new Date(stock.calculatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
