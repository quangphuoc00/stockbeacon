import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info, TrendingUp, TrendingDown } from 'lucide-react'

interface CompactFlagProps {
  flag: any
  type: 'red' | 'green'
  index: number
}

// Format large numbers compactly
const formatCompactNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return 'N/A'
  const absNum = Math.abs(num)
  
  if (absNum >= 1e9) return `${(num / 1e9).toFixed(1)}B`
  if (absNum >= 1e6) return `${(num / 1e6).toFixed(1)}M`
  if (absNum >= 1e3) return `${(num / 1e3).toFixed(0)}K`
  return num.toFixed(0)
}

export function CompactFlag({ flag, type, index }: CompactFlagProps) {
  const isRed = type === 'red'
  
  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-600 text-white'
      case 'high': return 'bg-red-500 text-white'
      case 'medium': return 'bg-orange-500 text-white'
      case 'low': return 'bg-yellow-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getStrengthColor = (strength: string) => {
    switch (strength?.toLowerCase()) {
      case 'exceptional': return 'bg-green-600 text-white'
      case 'strong': return 'bg-green-500 text-white'
      case 'good': return 'bg-emerald-500 text-white'
      default: return 'bg-teal-500 text-white'
    }
  }

  // For red flags, check if value exceeds threshold
  const exceedsThreshold = isRed && flag.value && flag.threshold && flag.value > flag.threshold
  const percentageOver = exceedsThreshold ? ((flag.value / flag.threshold - 1) * 100).toFixed(0) : null

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      isRed ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
    )}>
      <TooltipProvider>
        <div className="space-y-2">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn(
                  "text-xs px-2 py-0.5",
                  isRed ? getSeverityColor(flag.severity) : getStrengthColor(flag.strength)
                )}>
                  {isRed ? flag.severity : flag.strength}
                </Badge>
                <h4 className="text-sm font-semibold line-clamp-1">
                  {flag.title}
                </h4>
              </div>
            </div>
            
            {/* Info Tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className={cn(
                  "h-4 w-4 cursor-help flex-shrink-0",
                  isRed ? "text-red-600" : "text-green-600"
                )} />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm p-4">
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold mb-1">{flag.title}</p>
                    <p className="text-sm">{flag.explanation}</p>
                  </div>
                  
                  {flag.technicalDescription && (
                    <div>
                      <p className="text-xs font-semibold mb-1">Technical Details:</p>
                      <p className="text-xs">{flag.technicalDescription}</p>
                    </div>
                  )}
                  
                  {flag.formula && (
                    <p className="text-xs font-mono bg-gray-100 p-1 rounded">
                      {flag.formula}
                    </p>
                  )}
                  
                  {flag.recommendation && (
                    <div>
                      <p className="text-xs font-semibold mb-1">Recommendation:</p>
                      <p className="text-xs">{flag.recommendation}</p>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Key Metrics Row */}
          {(flag.value !== undefined || flag.metrics) && (
            <div className="flex items-center gap-3 text-xs">
              {flag.value !== undefined && (
                <div className="flex items-center gap-1">
                  {/* Extract and show the metric from technical description if available */}
                  {flag.technicalDescription && flag.technicalDescription.includes(':') ? (
                    <span className="text-xs text-gray-700 font-medium">
                      {flag.technicalDescription.split('.')[0]}
                    </span>
                  ) : (
                    <>
                      <span className="text-gray-600">Value:</span>
                      <span className="font-semibold">
                        {flag.value > 1000 ? formatCompactNumber(flag.value) : `${flag.value.toFixed(1)}%`}
                      </span>
                      {(flag.threshold || flag.benchmark) && (
                        <>
                          <span className="text-gray-500">{isRed ? 'vs' : '>'}</span>
                          <span className="text-gray-600">
                            {flag.threshold 
                              ? `${flag.threshold.toFixed(1)}%`
                              : `${flag.benchmark.toFixed(1)}%`
                            }
                          </span>
                        </>
                      )}
                    </>
                  )}
                  {exceedsThreshold && (
                    <Badge variant="destructive" className="text-xs px-1.5 py-0 ml-1">
                      +{percentageOver}%
                    </Badge>
                  )}
                </div>
              )}
              
              {flag.metrics && Object.keys(flag.metrics).length > 0 && (
                <div className="flex items-center gap-2">
                  {Object.entries(flag.metrics).slice(0, 2).map(([key, value]: [string, any]) => (
                    <span key={key} className="text-gray-600">
                      {key}: <span className="font-semibold">{
                        typeof value === 'number' && value > 1000 
                          ? formatCompactNumber(value) 
                          : typeof value === 'number' 
                            ? value.toFixed(1) 
                            : value
                      }</span>
                    </span>
                  ))}
                </div>
              )}
              
              {flag.trend && (
                <div className={cn(
                  "flex items-center gap-1",
                  flag.trend === 'improving' ? "text-green-600" : "text-red-600"
                )}>
                  {flag.trend === 'improving' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className="text-xs capitalize">{flag.trend}</span>
                </div>
              )}
            </div>
          )}

          {/* Confidence Badge */}
          {flag.confidence && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600 line-clamp-2 flex-1 pr-2">
                💡 {flag.explanation.split('.')[0]}.
              </p>
              <Badge variant="outline" className="text-xs px-2 py-0">
                {flag.confidence}%
              </Badge>
            </div>
          )}
        </div>
      </TooltipProvider>
    </div>
  )
}
