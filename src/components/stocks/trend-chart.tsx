import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react'

interface TrendData {
  metric: string
  direction: string
  visualIndicator: string
  insight: string
  periods?: {
    date: string
    value: number
    percentageChange?: number
  }[]
  cagr?: number
}

interface TrendChartProps {
  trend: TrendData
}

// Format large numbers
const formatValue = (value: number, metric: string, compact: boolean = false): string => {
  const isPercentage = metric.toLowerCase().includes('margin') || 
                      metric.toLowerCase().includes('return')
  
  if (isPercentage) {
    return `${value.toFixed(1)}%`
  }
  
  const absValue = Math.abs(value)
  if (absValue >= 1e9) {
    return compact ? `$${(value / 1e9).toFixed(1)}B` : `$${(value / 1e9).toFixed(2)}B`
  } else if (absValue >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`
  } else if (absValue >= 1e3) {
    return `$${(value / 1e3).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

// Get color based on direction
const getDirectionColor = (direction: string) => {
  switch (direction) {
    case 'improving': return 'text-green-600'
    case 'deteriorating': return 'text-red-600'
    case 'volatile': return 'text-orange-600'
    default: return 'text-gray-600'
  }
}

// Get icon based on direction
const getDirectionIcon = (direction: string) => {
  switch (direction) {
    case 'improving': return <TrendingUp className="h-4 w-4" />
    case 'deteriorating': return <TrendingDown className="h-4 w-4" />
    case 'volatile': return <Activity className="h-4 w-4" />
    default: return <Minus className="h-4 w-4" />
  }
}

export function TrendChart({ trend }: TrendChartProps) {
  if (!trend.periods || trend.periods.length === 0) {
    // Fallback to simple display if no chart data
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">{trend.metric}</CardTitle>
            <div className={cn("flex items-center gap-2", getDirectionColor(trend.direction))}>
              {getDirectionIcon(trend.direction)}
              <span className="text-sm font-medium capitalize">{trend.direction}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{trend.insight}</p>
          {trend.cagr !== undefined && (
            <p className="text-xs text-muted-foreground mt-2">
              CAGR: {trend.cagr.toFixed(1)}%
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Calculate chart dimensions - responsive
  const chartWidth = 600  // Increased width
  const chartHeight = 220  // Increased height to accommodate labels
  const padding = { top: 35, right: 30, bottom: 40, left: 30 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  // Calculate min/max values for scaling
  const values = trend.periods!.map(p => p.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const valueRange = maxValue - minValue
  const valuePadding = valueRange * 0.1 // Add 10% padding

  // Scale functions
  const xScale = (index: number) => {
    return padding.left + (index / (trend.periods!.length - 1)) * innerWidth
  }

  const yScale = (value: number) => {
    const normalized = (value - (minValue - valuePadding)) / (valueRange + valuePadding * 2)
    return padding.top + innerHeight - (normalized * innerHeight)
  }

  // Create SVG path for the line
  const linePath = trend.periods!
    .map((period, index) => {
      const x = xScale(index)
      const y = yScale(period.value)
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  // Create area path (filled area under the line)
  const areaPath = `${linePath} L ${xScale(trend.periods!.length - 1)} ${padding.top + innerHeight} L ${xScale(0)} ${padding.top + innerHeight} Z`

  // Determine if trend is positive or negative
  const isPositive = trend.direction === 'improving' || 
                    (trend.periods!.length >= 2 && 
                     trend.periods![trend.periods!.length - 1].value > trend.periods![0].value)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{trend.metric}</CardTitle>
          <div className="flex items-center gap-2">
            <div className={cn("flex items-center gap-1", getDirectionColor(trend.direction))}>
              {getDirectionIcon(trend.direction)}
              <span className="text-sm font-medium capitalize">{trend.direction}</span>
            </div>
            {trend.cagr !== undefined && (
              <Badge variant="outline" className="text-xs">
                {trend.cagr > 0 ? '+' : ''}{trend.cagr.toFixed(1)}% CAGR
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {/* Chart */}
        <div className="relative w-full" style={{ aspectRatio: '3 / 1' }}>
          <svg 
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Grid lines */}
            <g className="text-gray-200">
              {[0, 0.5, 1].map(ratio => {
                const y = padding.top + innerHeight * (1 - ratio)
                return (
                  <line
                    key={ratio}
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + innerWidth}
                    y2={y}
                    stroke="currentColor"
                    strokeDasharray="2,2"
                  />
                )
              })}
            </g>

            {/* Area fill */}
            <path
              d={areaPath}
              fill={isPositive ? 'url(#greenGradient)' : 'url(#redGradient)'}
              opacity="0.1"
            />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke={isPositive ? '#10b981' : '#ef4444'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {trend.periods!.map((period, index) => {
              const x = xScale(index)
              const y = yScale(period.value)
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={isPositive ? '#10b981' : '#ef4444'}
                  stroke="white"
                  strokeWidth="2"
                />
              )
            })}

            {/* X-axis labels (years) - show all years */}
            {trend.periods!.map((period, index) => {
              const x = xScale(index)
              return (
                <text
                  key={index}
                  x={x}
                  y={padding.top + innerHeight + 25}
                  textAnchor="middle"
                  className="text-sm fill-gray-600"
                  style={{ fontSize: '13px' }}
                >
                  {new Date(period.date).getFullYear()}
                </text>
              )
            })}

            {/* Value labels on all points */}
            {trend.periods!.map((period, index) => {
              const x = xScale(index)
              const y = yScale(period.value)
              
              // Smart positioning: alternate above/below for dense data
              // or position based on available space
              let labelY: number
              const baseOffset = 22
              
              if (trend.periods!.length > 4 && index % 2 === 0) {
                // For many points, alternate positioning
                labelY = y - baseOffset
              } else if (trend.periods!.length > 4) {
                labelY = y + baseOffset + 5
              } else {
                // For fewer points, position based on space
                const isTopHalf = y < (padding.top + innerHeight / 2)
                labelY = isTopHalf ? y + baseOffset + 5 : y - baseOffset
              }
              
              const formattedValue = formatValue(period.value, trend.metric, true)
              const hasChange = period.percentageChange !== undefined && index > 0
              const changeText = hasChange 
                ? `${period.percentageChange! > 0 ? '+' : ''}${period.percentageChange!.toFixed(1)}%`
                : ''
              
              // Calculate text width for proper background sizing
              const valueWidth = formattedValue.length * 7.5
              const changeWidth = changeText.length * 6
              const maxWidth = Math.max(valueWidth, changeWidth)
              const boxHeight = hasChange ? 32 : 20
              
              return (
                <g key={`label-${index}`}>
                  {/* Background for better readability */}
                  <rect
                    x={x - maxWidth / 2 - 5}
                    y={labelY - 12}
                    width={maxWidth + 10}
                    height={boxHeight}
                    rx={4}
                    fill="white"
                    fillOpacity="0.95"
                    stroke={isPositive ? '#10b981' : '#ef4444'}
                    strokeWidth="0.5"
                    strokeOpacity="0.3"
                  />
                  <text
                    x={x}
                    y={labelY}
                    textAnchor="middle"
                    className="text-sm fill-gray-800 font-semibold"
                    style={{ fontSize: '13px' }}
                  >
                    {formattedValue}
                  </text>
                  {hasChange && (
                    <text
                      x={x}
                      y={labelY + 14}
                      textAnchor="middle"
                      className={cn(
                        "text-xs",
                        period.percentageChange! > 0 ? "fill-green-600" : "fill-red-600"
                      )}
                      style={{ fontSize: '11px' }}
                    >
                      {changeText}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Gradients */}
            <defs>
              <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Insight */}
        <p className="text-sm text-muted-foreground mt-3">{trend.insight}</p>

        {/* Additional metrics */}
        {trend.periods!.length >= 2 && (
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>
              Total Change: {
                ((trend.periods![trend.periods!.length - 1].value - trend.periods![0].value) / 
                 trend.periods![0].value * 100).toFixed(1)
              }%
            </span>
            {trend.periods![trend.periods!.length - 1].percentageChange !== undefined && (
              <span>
                Latest YoY: {
                  trend.periods![trend.periods!.length - 1].percentageChange! > 0 ? '+' : ''
                }{trend.periods![trend.periods!.length - 1].percentageChange!.toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
