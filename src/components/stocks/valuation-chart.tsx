'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { ComprehensiveValuation } from '@/lib/services/valuation.service'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ValuationChartProps {
  valuation: ComprehensiveValuation | null
  loading?: boolean
}

export function ValuationChart({ valuation, loading }: ValuationChartProps) {
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Intrinsic Value Analysis</CardTitle>
          <CardDescription>Calculating multiple valuation models...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!valuation) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Intrinsic Value Analysis</CardTitle>
          <CardDescription>Unable to calculate valuation metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Insufficient financial data to perform valuation analysis.
          </p>
        </CardContent>
      </Card>
    )
  }

  const maxValue = Math.max(
    valuation.currentPrice * 2,
    ...valuation.valuations.map(v => v.value)
  )

  const getBarWidth = (value: number) => {
    return `${(value / maxValue) * 100}%`
  }

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* All Valuation Methods in Single View */}
      <Card>
        <CardHeader>
          <CardTitle>Valuation Methods</CardTitle>
          <CardDescription>
            Current Price: {formatValue(valuation.currentPrice)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Price Reference Lines */}
          <div className="relative">
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
              style={{ left: `${(valuation.currentPrice / maxValue) * 100}%` }}
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <Badge variant="outline" className="text-xs">
                  Current: {formatValue(valuation.currentPrice)}
                </Badge>
              </div>
            </div>

            {/* Valuation Bars */}
            <div className="space-y-3 mt-8 mb-2">
              {valuation.valuations.map((method, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium min-w-[120px]">{method.method}</span>
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md p-4 space-y-2" sideOffset={5}>
                            <div>
                              <p className="font-semibold text-sm">{method.description}</p>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div>
                                <p className="font-medium text-muted-foreground">Definition:</p>
                                <p>{method.definition}</p>
                              </div>
                              <div>
                                <p className="font-medium text-muted-foreground">When to use:</p>
                                <p>{method.whenToUse}</p>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="font-semibold">{formatValue(method.value)}</span>
                  </div>
                  <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                      style={{ 
                        width: getBarWidth(method.value),
                        backgroundColor: method.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

     
    </div>
  )
}
