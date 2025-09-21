import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HelpCircle, TrendingDown, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface RedFlagProps {
  flag: {
    severity: string
    title: string
    explanation: string
    technicalDescription?: string
    formula?: string
    value?: number
    threshold?: number
    recommendation?: string
    confidence?: number
  }
  index: number
}

interface GreenFlagProps {
  flag: {
    strength: string
    title: string
    explanation: string
    technicalDescription?: string
    metrics?: any
    trend?: string
    recommendation?: string
    confidence?: number
  }
  index: number
}

// Format large numbers for display
const formatNumber = (num: number | undefined): string => {
  if (!num) return 'N/A'
  
  const absNum = Math.abs(num)
  if (absNum >= 1e9) {
    return `$${(num / 1e9).toFixed(2)}B`
  } else if (absNum >= 1e6) {
    return `$${(num / 1e6).toFixed(2)}M`
  } else if (absNum >= 1e3) {
    return `$${(num / 1e3).toFixed(2)}K`
  } else {
    return `$${num.toFixed(2)}`
  }
}

// Format percentage
const formatPercentage = (num: number | undefined): string => {
  if (num === undefined || num === null) return 'N/A'
  return `${num.toFixed(1)}%`
}

export function EnhancedRedFlag({ flag, index }: RedFlagProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-600 text-white'
      case 'high': return 'bg-red-500 text-white'
      case 'medium': return 'bg-orange-500 text-white'
      default: return 'bg-yellow-500 text-white'
    }
  }

  // Calculate comparison percentage if we have value and threshold
  const comparisonPercentage = flag.value && flag.threshold 
    ? Math.min((flag.value / flag.threshold) * 100, 200) // Cap at 200% for display
    : null

  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Badge className={cn("mt-0.5", getSeverityColor(flag.severity))}>
                {flag.severity}
              </Badge>
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  {index + 1}. {flag.title}
                  {flag.confidence && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs">
                            {flag.confidence}% confidence
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Analysis confidence based on data completeness</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </h4>
              </div>
            </div>
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>

          {/* Actual Figures */}
          {flag.technicalDescription && (
            <div className="bg-white/70 rounded-lg p-3 border border-red-200">
              <p className="text-sm font-medium text-gray-700">📊 The Numbers:</p>
              <p className="text-sm mt-1">{flag.technicalDescription}</p>
              
              {/* Visual Comparison */}
              {comparisonPercentage !== null && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Actual: {formatNumber(flag.value)}</span>
                    <span>Limit: {formatNumber(flag.threshold)}</span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={cn(
                        "h-full transition-all",
                        comparisonPercentage > 100 ? "bg-red-600" : "bg-orange-500"
                      )}
                      style={{ width: `${Math.min(comparisonPercentage, 100)}%` }}
                    />
                  </div>
                  {comparisonPercentage > 100 && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ Exceeds safe limit by {(comparisonPercentage - 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              )}
              
              {/* Formula */}
              {flag.formula && (
                <p className="text-xs text-gray-500 mt-2 font-mono">
                  Formula: {flag.formula}
                </p>
              )}
            </div>
          )}

          {/* Beginner Explanation */}
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              <span className="font-medium">💡 What this means:</span> {flag.explanation}
            </p>
          </div>

          {/* Recommendation */}
          {flag.recommendation && (
            <div className="bg-red-100 rounded-lg p-3 border border-red-300">
              <p className="text-sm">
                <span className="font-medium">⚡ Action needed:</span> {flag.recommendation}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function EnhancedGreenFlag({ flag, index }: GreenFlagProps) {
  const getStrengthColor = (strength: string) => {
    switch (strength.toLowerCase()) {
      case 'exceptional': return 'bg-green-600 text-white'
      case 'strong': return 'bg-green-500 text-white'
      case 'positive': return 'bg-green-400 text-white'
      default: return 'bg-green-300 text-gray-800'
    }
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Badge className={cn("mt-0.5", getStrengthColor(flag.strength))}>
                {flag.strength}
              </Badge>
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  {index + 1}. {flag.title}
                  {flag.confidence && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs">
                            {flag.confidence}% confidence
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Analysis confidence based on data completeness</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </h4>
              </div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>

          {/* Actual Figures */}
          {flag.technicalDescription && (
            <div className="bg-white/70 rounded-lg p-3 border border-green-200">
              <p className="text-sm font-medium text-gray-700">📊 The Numbers:</p>
              <p className="text-sm mt-1">{flag.technicalDescription}</p>
              
              {/* Trend Indicator */}
              {flag.trend && (
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">{flag.trend}</span>
                </div>
              )}
            </div>
          )}

          {/* Beginner Explanation */}
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              <span className="font-medium">💡 What this means:</span> {flag.explanation}
            </p>
          </div>

          {/* Recommendation */}
          {flag.recommendation && (
            <div className="bg-green-100 rounded-lg p-3 border border-green-300">
              <p className="text-sm">
                <span className="font-medium">✅ Why this matters:</span> {flag.recommendation}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
