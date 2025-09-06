'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { QualityStockCard } from './quality-stock-card'
import { cn } from '@/lib/utils'

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

interface ValuationSectionProps {
  title: string
  description: string
  stocks: StockWithValuation[]
  level: 'highly_undervalued' | 'undervalued' | 'fairly_valued' | 'overvalued' | 'highly_overvalued'
  defaultCollapsed?: boolean
}

export function ValuationSection({
  title,
  description,
  stocks,
  level,
  defaultCollapsed = false
}: ValuationSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  
  const getBorderColor = () => {
    switch (level) {
      case 'highly_undervalued':
        return 'border-green-600'
      case 'undervalued':
        return 'border-green-500'
      case 'fairly_valued':
        return 'border-gray-400'
      case 'overvalued':
        return 'border-orange-500'
      case 'highly_overvalued':
        return 'border-red-500'
    }
  }
  
  const getHeaderBgColor = () => {
    switch (level) {
      case 'highly_undervalued':
        return 'bg-green-50 dark:bg-green-950'
      case 'undervalued':
        return 'bg-green-50 dark:bg-green-950'
      case 'fairly_valued':
        return 'bg-gray-50 dark:bg-gray-900'
      case 'overvalued':
        return 'bg-orange-50 dark:bg-orange-950'
      case 'highly_overvalued':
        return 'bg-red-50 dark:bg-red-950'
    }
  }
  
  return (
    <Card className={cn('overflow-hidden', getBorderColor())}>
      <CardHeader 
        className={cn(
          'cursor-pointer transition-colors',
          getHeaderBgColor()
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              {title}
              <Badge variant={stocks.length === 0 ? "outline" : "secondary"} className="ml-2">
                {stocks.length} {stocks.length === 1 ? 'stock' : 'stocks'}
              </Badge>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="p-0">
          {stocks.length === 0 ? (
            // Empty state - just text, no placeholder cards
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm">No stocks found in this category</p>
              <p className="text-xs mt-1">Stocks will appear here when they meet the criteria</p>
            </div>
          ) : (
            <>
              {/* Desktop Grid */}
              <div className="hidden lg:block">
                <div className="grid grid-cols-12 gap-4 p-4 text-sm font-medium text-muted-foreground border-b">
                  <div className="col-span-3">Company</div>
                  <div className="col-span-1 text-right">Price</div>
                  <div className="col-span-1 text-right">Change</div>
                  <div className="col-span-1 text-right">Score</div>
                  <div className="col-span-1 text-right">Quality</div>
                  <div className="col-span-1 text-right">Timing</div>
                  <div className="col-span-1 text-right">Discount</div>
                  <div className="col-span-1 text-right">P/E</div>
                  <div className="col-span-2">Recommendation</div>
                </div>
                
                <div className="divide-y">
                  {stocks.map((stock) => (
                    <QualityStockCard
                      key={stock.symbol}
                      stock={stock}
                      view="grid"
                    />
                  ))}
                </div>
              </div>
              
              {/* Mobile Stack */}
              <div className="lg:hidden divide-y">
                {stocks.map((stock) => (
                  <QualityStockCard
                    key={stock.symbol}
                    stock={stock}
                    view="card"
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
