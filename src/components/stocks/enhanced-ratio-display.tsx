import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface RatioData {
  name: string
  value: number | null
  formula?: string
  interpretation: string
  score: string
  benchmark?: {
    poor: number
    fair: number
    good: number
    excellent: number
  }
  actualValues?: {
    numerator: number
    denominator: number
    unit?: string
  }
  trend?: 'improving' | 'stable' | 'declining'
}

interface EnhancedRatioProps {
  ratio: RatioData
  index: number
}

// Format numbers based on ratio type
const formatRatioValue = (value: number | null, name: string): string => {
  if (value === null || value === undefined) return 'N/A'
  
  // Percentage ratios
  if (name.toLowerCase().includes('margin') || 
      name.toLowerCase().includes('return') || 
      name.toLowerCase().includes('roe') ||
      name.toLowerCase().includes('roi')) {
    return `${value.toFixed(1)}%`
  }
  
  // Day ratios
  if (name.toLowerCase().includes('days')) {
    return `${value.toFixed(0)} days`
  }
  
  // Times ratios (coverage, turnover)
  if (name.toLowerCase().includes('coverage') || 
      name.toLowerCase().includes('turnover')) {
    return `${value.toFixed(1)}x`
  }
  
  // Regular ratios
  return value.toFixed(2)
}

// Get benchmark thresholds based on ratio type
const getDefaultBenchmarks = (name: string): any => {
  const lowerName = name.toLowerCase()
  
  if (lowerName.includes('current ratio')) {
    return { poor: 1.0, fair: 1.5, good: 2.0, excellent: 2.5 }
  }
  if (lowerName.includes('debt to equity')) {
    return { excellent: 0.5, good: 1.0, fair: 2.0, poor: 3.0 } // Inverted
  }
  if (lowerName.includes('net margin')) {
    return { poor: 0, fair: 5, good: 10, excellent: 15 }
  }
  if (lowerName.includes('roe') || lowerName.includes('return on equity')) {
    return { poor: 5, fair: 10, good: 15, excellent: 20 }
  }
  
  return null
}

export function EnhancedRatioDisplay({ ratio, index }: EnhancedRatioProps) {
  const benchmark = ratio.benchmark || getDefaultBenchmarks(ratio.name)
  
  // Calculate position on benchmark scale
  let benchmarkPosition = 0
  let benchmarkColor = 'bg-gray-500'
  
  if (benchmark && ratio.value !== null) {
    const isInverted = ratio.name.toLowerCase().includes('debt') || 
                      ratio.name.toLowerCase().includes('days')
    
    if (isInverted) {
      // Lower is better
      if (ratio.value <= benchmark.excellent) {
        benchmarkPosition = 100
        benchmarkColor = 'bg-green-600'
      } else if (ratio.value <= benchmark.good) {
        benchmarkPosition = 75
        benchmarkColor = 'bg-green-500'
      } else if (ratio.value <= benchmark.fair) {
        benchmarkPosition = 50
        benchmarkColor = 'bg-yellow-500'
      } else {
        benchmarkPosition = 25
        benchmarkColor = 'bg-red-500'
      }
    } else {
      // Higher is better
      if (ratio.value >= benchmark.excellent) {
        benchmarkPosition = 100
        benchmarkColor = 'bg-green-600'
      } else if (ratio.value >= benchmark.good) {
        benchmarkPosition = 75
        benchmarkColor = 'bg-green-500'
      } else if (ratio.value >= benchmark.fair) {
        benchmarkPosition = 50
        benchmarkColor = 'bg-yellow-500'
      } else {
        benchmarkPosition = 25
        benchmarkColor = 'bg-red-500'
      }
    }
  }
  
  const getScoreBadgeVariant = (score: string) => {
    switch (score) {
      case 'excellent': return 'default'
      case 'good': return 'secondary'
      case 'fair': return 'outline'
      default: return 'destructive'
    }
  }
  
  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold flex items-center gap-2">
                {ratio.name}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{ratio.interpretation}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {ratio.trend && getTrendIcon(ratio.trend)}
              <Badge variant={getScoreBadgeVariant(ratio.score)}>
                {ratio.score}
              </Badge>
            </div>
          </div>
          
          {/* Main Value Display */}
          <div className="text-center py-2">
            <div className="text-3xl font-bold">
              {formatRatioValue(ratio.value, ratio.name)}
            </div>
            
            {/* Formula and actual values */}
            {(ratio.formula || ratio.actualValues) && (
              <div className="mt-2 space-y-1">
                {ratio.formula && (
                  <p className="text-xs text-gray-500 font-mono">{ratio.formula}</p>
                )}
                {ratio.actualValues && (
                  <p className="text-sm text-gray-600">
                    = {formatNumber(ratio.actualValues.numerator)} ÷ {formatNumber(ratio.actualValues.denominator)}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Benchmark Visualization */}
          {benchmark && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Poor</span>
                <span>Fair</span>
                <span>Good</span>
                <span>Excellent</span>
              </div>
              <div className="relative h-8 bg-gray-200 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex">
                  <div className="flex-1 bg-red-200"></div>
                  <div className="flex-1 bg-yellow-200"></div>
                  <div className="flex-1 bg-green-200"></div>
                  <div className="flex-1 bg-green-300"></div>
                </div>
                {/* Position indicator */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-gray-800 rounded"
                  style={{ left: `${benchmarkPosition}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatRatioValue(benchmark.poor, ratio.name)}</span>
                <span>{formatRatioValue(benchmark.excellent, ratio.name)}</span>
              </div>
            </div>
          )}
          
          {/* Interpretation */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              <span className="font-medium">💡 What this means:</span> {ratio.interpretation}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to format large numbers
const formatNumber = (num: number): string => {
  const absNum = Math.abs(num)
  if (absNum >= 1e9) {
    return `$${(num / 1e9).toFixed(2)}B`
  } else if (absNum >= 1e6) {
    return `$${(num / 1e6).toFixed(2)}M`
  } else if (absNum >= 1e3) {
    return `$${(num / 1e3).toFixed(2)}K`
  } else {
    return `$${num.toFixed(0)}`
  }
}
