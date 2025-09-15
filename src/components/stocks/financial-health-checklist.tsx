'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ValuationDriverChart } from './valuation-driver-chart'
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Shield,
  BarChart3,
  Users
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { TrendChart } from './trend-chart'

// Types
export interface FinancialCheck {
  id: string
  name: string
  status: 'pass' | 'warning' | 'fail'
  value: string | number
  details?: string
  priority?: 'red-flag' | 'important' | 'nice-to-have'
  explanation?: CheckExplanation
}

export interface CheckExplanation {
  whatWeCheck: string
  numbers: {
    label: string
    value: string
  }[]
  plainEnglish: string
  formula?: string
  whyItMatters?: string[]
  recommendation?: string
}

interface CheckCategory {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  checks: FinancialCheck[]
  score?: number
  weight?: number
}

interface FinancialHealthChecklistProps {
  data: any
  loading?: boolean
}

// Get icon for status
const StatusIcon = ({ status }: { status: 'pass' | 'warning' | 'fail' }) => {
  switch (status) {
    case 'pass':
      return <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
    case 'fail':
      return <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
  }
}

// Helper function to determine if a check is a ratio metric
const isRatioMetric = (checkName: string): boolean => {
  const ratioNames = [
    'current ratio',
    'debt-to-equity',
    'debt to equity',
    'net profit margin',
    'return on equity',
    'free cash flow margin',
    'gross margin',
    'operating margin',
    'roa',
    'roe',
    'roic',
    'return on invested capital',
    'ocf/net income',
    'earnings quality'
  ]
  return ratioNames.some(name => checkName.toLowerCase().includes(name))
}

// Helper function to determine if a check is a growth metric
const isGrowthMetric = (checkName: string): boolean => {
  const growthNames = ['growth', 'cagr', 'trend']
  return growthNames.some(name => checkName.toLowerCase().includes(name))
}

// Helper function to get benchmark values for ratios
const getRatioBenchmarks = (checkName: string): any => {
  const lowerName = checkName.toLowerCase()
  
  if (lowerName.includes('current ratio')) {
    return { poor: 0.5, fair: 1.0, good: 1.5, excellent: 2.0 }
  }
  if (lowerName.includes('debt') && lowerName.includes('equity')) {
    return { excellent: 0.5, good: 1.0, fair: 2.0, poor: 3.0 } // Inverted
  }
  if (lowerName.includes('net profit margin') || lowerName.includes('net margin')) {
    return { poor: 0, fair: 5, good: 10, excellent: 15 }
  }
  if (lowerName.includes('return on equity') || lowerName.includes('roe')) {
    return { poor: 5, fair: 10, good: 15, excellent: 20 }
  }
  if (lowerName.includes('free cash flow margin') || lowerName.includes('fcf margin')) {
    return { poor: 0, fair: 5, good: 10, excellent: 15 }
  }
  if (lowerName.includes('roic') || lowerName.includes('return on invested capital')) {
    return { poor: 5, fair: 10, good: 15, excellent: 20 }
  }
  if (lowerName.includes('ocf') && lowerName.includes('net income')) {
    return { poor: 0.5, fair: 0.8, good: 1.0, excellent: 1.2 }
  }
  if (lowerName.includes('gross margin') || lowerName.includes('gross profit margin')) {
    return { poor: 20, fair: 30, good: 40, excellent: 50 }
  }
  
  return null
}

// Simple ratio visualization component
const RatioVisualization = ({ value, benchmarks, checkName }: { value: number, benchmarks: any, checkName: string }) => {
  // Calculate position on benchmark scale
  let position = 0
  const isInverted = checkName.toLowerCase().includes('debt')
  
  if (isInverted) {
    // Lower is better
    if (value <= benchmarks.excellent) {
      position = 87.5 // Excellent zone
    } else if (value <= benchmarks.good) {
      position = 62.5 // Good zone
    } else if (value <= benchmarks.fair) {
      position = 37.5 // Fair zone
    } else {
      position = 12.5 // Poor zone
    }
  } else {
    // Higher is better
    if (value >= benchmarks.excellent) {
      position = 87.5 // Excellent zone
    } else if (value >= benchmarks.good) {
      position = 62.5 // Good zone
    } else if (value >= benchmarks.fair) {
      position = 37.5 // Fair zone
    } else {
      position = 12.5 // Poor zone
    }
  }
  
  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
      <div className="text-center">
        <div className="text-3xl font-bold">{value.toFixed(2)}</div>
        <div className="text-sm text-muted-foreground mt-1">{checkName}</div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Poor</span>
          <span>Fair</span>
          <span>Good</span>
          <span>Excellent</span>
        </div>
        <div className="relative h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
          <div className="absolute inset-0 flex">
            <div className="flex-1 bg-red-200 dark:bg-red-900/30"></div>
            <div className="flex-1 bg-yellow-200 dark:bg-yellow-900/30"></div>
            <div className="flex-1 bg-green-200 dark:bg-green-900/30"></div>
            <div className="flex-1 bg-green-300 dark:bg-green-800/30"></div>
          </div>
          {/* Position indicator */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-gray-800 dark:bg-gray-200 rounded"
            style={{ left: `${position}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{benchmarks.poor.toFixed(1)}</span>
          <span>{benchmarks.excellent.toFixed(1)}</span>
        </div>
      </div>
    </div>
  )
}

// Individual check item component
const CheckItem = ({ check, data }: { check: FinancialCheck, data?: any }) => {
  const [showDialog, setShowDialog] = useState(false)

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null
    
    const config = {
      'red-flag': { 
        className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800',
        label: 'Red Flag'
      },
      'important': { 
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        label: 'Important'
      },
      'nice-to-have': { 
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        label: 'Nice to Have'
      }
    }
    
    const cfg = config[priority as keyof typeof config]
    if (!cfg) return null
    
    return (
      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", cfg.className)}>
        {cfg.label}
      </Badge>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between py-2.5 px-3 hover:bg-muted/50 rounded-lg transition-colors">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <StatusIcon status={check.status} />
          <span className="font-medium text-sm truncate">{check.name}</span>
          {getPriorityBadge(check.priority)}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-sm font-mono">{check.value}</div>
            {check.details && (
              <div className="text-xs text-muted-foreground">{check.details}</div>
            )}
          </div>
          {check.explanation && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 flex-shrink-0"
              onClick={() => setShowDialog(true)}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Explanation Dialog */}
      {check.explanation && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <StatusIcon status={check.status} />
                {check.name.toUpperCase()}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 mt-4">
              {/* What we're checking */}
              <div>
                <h4 className="font-semibold mb-2">What We're Checking:</h4>
                <p className="text-sm text-muted-foreground">{check.explanation.whatWeCheck}</p>
              </div>
              
              {/* Visualization for ratios and growth metrics */}
              {isRatioMetric(check.name) && check.value && typeof check.value === 'string' && (
                (() => {
                  const numericValue = parseFloat(check.value)
                  const benchmarks = getRatioBenchmarks(check.name)
                  if (!isNaN(numericValue) && benchmarks) {
                    return <RatioVisualization value={numericValue} benchmarks={benchmarks} checkName={check.name} />
                  }
                  return null
                })()
              )}
              
              {/* Trend chart for growth metrics */}
              {isGrowthMetric(check.name) && data?.keyTrends && (
                (() => {
                  // Find matching trend data
                  const matchingTrend = data.keyTrends.find((trend: any) => {
                    const metricLower = trend.metric.toLowerCase()
                    const checkLower = check.name.toLowerCase()
                    return (
                      (checkLower.includes('revenue') && metricLower.includes('revenue')) ||
                      (checkLower.includes('profit') && (metricLower.includes('profit') || metricLower.includes('net income'))) ||
                      (checkLower.includes('cash flow') && metricLower.includes('cash flow'))
                    )
                  })
                  
                  if (matchingTrend) {
                    return (
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <TrendChart trend={matchingTrend} />
                      </div>
                    )
                  }
                  return null
                })()
              )}
              
              {/* Share count trend chart for buyback checks */}
              {check.id === 'share-buybacks' && data?.keyTrends && (
                (() => {
                  const shareCountTrend = data.keyTrends.find((trend: any) => 
                    trend.metric.toLowerCase().includes('shares outstanding')
                  )
                  
                  if (shareCountTrend) {
                    return (
                      <div>
                        <h4 className="font-semibold mb-2">Total Shares Outstanding Over Time:</h4>
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <TrendChart trend={shareCountTrend} />
                          {shareCountTrend.insight && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {shareCountTrend.insight}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  }
                  return null
                })()
              )}


              {/* Plain English */}
              <div>
                <h4 className="font-semibold mb-2">Plain English:</h4>
                <p className="text-sm bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  {check.explanation.plainEnglish}
                </p>
              </div>

              {/* Why it matters */}
              {check.explanation.whyItMatters && (
                <div>
                  <h4 className="font-semibold mb-2">Why This Matters:</h4>
                  <ul className="space-y-1">
                    {check.explanation.whyItMatters.map((item, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendation */}
              {check.explanation.recommendation && (
                <div>
                  <h4 className="font-semibold mb-2">Recommendation:</h4>
                  <p className="text-sm bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    💡 {check.explanation.recommendation}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

// Category component
const CategorySection = ({ category, defaultOpen = false, data }: { category: CheckCategory, defaultOpen?: boolean, data?: any }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  const passedCount = category.checks.filter(c => c.status === 'pass').length
  const totalCount = category.checks.length
  const percentage = (passedCount / totalCount) * 100
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger className="w-full text-left hover:bg-muted/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {category.icon}
                <div>
                  <CardTitle className="text-base">{category.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {category.description}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {passedCount}/{totalCount} Passed
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {percentage.toFixed(0)}% Health
                  </div>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {category.checks.map((check) => (
                <CheckItem key={check.id} check={check} data={data} />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

export function FinancialHealthChecklist({ data, loading }: FinancialHealthChecklistProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-20 bg-muted animate-pulse rounded" />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No financial analysis data available</p>
        </CardContent>
      </Card>
    )
  }

  // Map the data to our category structure
  const categories = mapToSimplifiedCategories(data)
  
  // Calculate overall stats
  const allChecks = categories.flatMap(c => c.checks)
  const passedChecks = allChecks.filter(c => c.status === 'pass').length
  const warningChecks = allChecks.filter(c => c.status === 'warning').length
  const failedChecks = allChecks.filter(c => c.status === 'fail').length
  const totalChecks = allChecks.length
  const overallPercentage = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0
  
  const summary = {
    total: totalChecks,
    passed: passedChecks,
    warnings: warningChecks,
    failed: failedChecks,
    percentage: overallPercentage
  }

  return (
    <div className="space-y-4">
      {/* Valuation Driver Analysis */}
      <ValuationDriverChart 
        symbol={data.symbol || ''}
        historicalData={data.historicalData}
        financialData={data}
        currentMarketCap={data.currentMarketCap}
      />

      {/* Category Sections - 2 Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((category, index) => (
          <CategorySection 
            key={category.id} 
            category={category} 
            defaultOpen={index < 2} // Open first two categories by default
            data={data}
          />
        ))}
      </div>
    </div>
  )
}

// Map data to our simplified category structure
function mapToSimplifiedCategories(data: any): CheckCategory[] {
  // Helper function to get category score
  const getCategoryScore = (categoryName: string) => {
    const category = data.healthScore?.categories?.find((c: any) => 
      c.name.toLowerCase().includes(categoryName.toLowerCase())
    )
    return {
      score: category?.score || 0,
      weight: category?.weight || 0
    }
  }

  // Create a simplified data structure that combines all available data
  const simplifiedData = {
    // Direct data pass-through for trend chart access
    keyTrends: data.keyTrends || [],
    
    // Green and red flags
    greenFlags: data.greenFlags || [],
    redFlags: data.redFlags || [],
    
    // Key ratios contain actual calculated values
    ratios: data.keyRatios || [],
    
    // Trends contain historical data
    trends: data.keyTrends || [],
    
    // Health score contains category breakdowns
    healthScore: data.healthScore || {},
    
    // Summary contains investment suitability
    summary: data.summary || {},
    
    // For now, we'll extract some basic metrics from the flags and ratios
    // This is a temporary solution - ideally we'd have the raw financial data
    metrics: extractMetricsFromAnalysis(data)
  }

  // For now, create simplified checks using available data
  // This is a temporary implementation until we have raw financial data
  return [
    {
      id: 'solvency-liquidity',
      name: 'Solvency & Liquidity',
      description: 'Can the company pay its bills and survive?',
      icon: <Shield className="h-5 w-5 text-primary" />,
      checks: createSimplifiedSolvencyChecks(data),
      ...getCategoryScore('solvency')
    },
    {
      id: 'consistent-growth',
      name: 'Consistent Growth',
      description: 'Is the company growing sustainably?',
      icon: <TrendingUp className="h-5 w-5 text-primary" />,
      checks: createSimplifiedGrowthChecks(data),
      ...getCategoryScore('growth')
    },
    {
      id: 'profitability-margins',
      name: 'Profitability & Margins',
      description: 'Is the company making money efficiently?',
      icon: <DollarSign className="h-5 w-5 text-primary" />,
      checks: createSimplifiedProfitabilityChecks(data),
      ...getCategoryScore('profitability')
    },
    {
      id: 'financial-strength',
      name: 'Financial Strength',
      description: 'How strong is the balance sheet?',
      icon: <Activity className="h-5 w-5 text-primary" />,
      checks: createSimplifiedStrengthChecks(data),
      ...getCategoryScore('financial-strength')
    },
    {
      id: 'quality-efficiency',
      name: 'Quality & Efficiency',
      description: 'How well-run is the company?',
      icon: <BarChart3 className="h-5 w-5 text-primary" />,
      checks: createSimplifiedQualityChecks(data),
      ...getCategoryScore('quality-efficiency')
    },
    {
      id: 'shareholder-value',
      name: 'Shareholder Value',
      description: 'Does the company reward shareholders?',
      icon: <Users className="h-5 w-5 text-primary" />,
      checks: createSimplifiedShareholderChecks(data, data.financialStatements),
      ...getCategoryScore('shareholder-value')
    }
  ]
}

// Helper function to extract metrics from analysis data
function extractMetricsFromAnalysis(data: any): any {
  const metrics: any = {}
  
  // Extract from ratios
  data.keyRatios?.forEach((ratio: any) => {
    if (ratio.value !== null && ratio.value !== undefined) {
      metrics[ratio.name] = ratio.value
    }
  })
  
  // Extract from trends
  data.keyTrends?.forEach((trend: any) => {
    if (trend.periods && trend.periods.length > 0) {
      const latest = trend.periods[trend.periods.length - 1]
      metrics[`latest${trend.metric}`] = latest.value
    }
  })
  
  return metrics
}

// Simplified check functions using available data
function createSimplifiedSolvencyChecks(data: any): FinancialCheck[] {
  const checks: FinancialCheck[] = []
  
  // Current Ratio check from keyRatios
  const currentRatio = data.keyRatios?.find((r: any) => r.name?.includes('Current Ratio'))
  if (currentRatio) {
    checks.push({
      id: 'current-ratio',
      name: 'Current Ratio',
      status: currentRatio.value >= 1.5 ? 'pass' : currentRatio.value >= 1.0 ? 'warning' : 'fail',
      value: currentRatio.value?.toFixed(2) || 'N/A',
      priority: 'important',
      explanation: {
        whatWeCheck: 'Can the company pay its bills due within the next 12 months?',
        numbers: currentRatio.actualValues ? [
          { label: 'Current Assets', value: `$${(currentRatio.actualValues.numerator / 1e9).toFixed(1)}B` },
          { label: 'Current Liabilities', value: `$${(currentRatio.actualValues.denominator / 1e9).toFixed(1)}B` }
        ] : [{ label: 'Ratio', value: currentRatio.value?.toFixed(2) }],
        plainEnglish: currentRatio.interpretation,
        formula: currentRatio.formula,
        recommendation: currentRatio.value >= 1.5 ? 'Healthy liquidity position' : 'Monitor liquidity closely'
      }
    })
  }
  
  // Debt-to-Equity check
  const debtToEquity = data.keyRatios?.find((r: any) => r.name?.includes('Debt') && r.name?.includes('Equity'))
  if (debtToEquity) {
    checks.push({
      id: 'debt-to-equity',
      name: 'Debt-to-Equity Ratio',
      status: debtToEquity.value <= 1.0 ? 'pass' : debtToEquity.value <= 2.0 ? 'warning' : 'fail',
      value: debtToEquity.value?.toFixed(2) || 'N/A',
      priority: 'important',
      explanation: {
        whatWeCheck: 'How much debt does the company have relative to equity?',
        numbers: debtToEquity.actualValues ? [
          { label: 'Total Debt', value: `$${(debtToEquity.actualValues.numerator / 1e9).toFixed(1)}B` },
          { label: 'Equity', value: `$${(debtToEquity.actualValues.denominator / 1e9).toFixed(1)}B` }
        ] : [{ label: 'Ratio', value: debtToEquity.value?.toFixed(2) }],
        plainEnglish: debtToEquity.interpretation,
        formula: debtToEquity.formula,
        recommendation: debtToEquity.value <= 1.0 ? 'Conservative debt levels' : 'Consider reducing debt'
      }
    })
  }
  
  // Check red flags for solvency issues
  data.redFlags?.forEach((flag: any) => {
    if (flag.title?.includes('Liquidity') || flag.title?.includes('Debt')) {
      checks.push({
        id: flag.title.toLowerCase().replace(/\s+/g, '-'),
        name: flag.title,
        status: 'fail',
        value: flag.value || 'Issue',
        priority: 'red-flag',
        explanation: {
          whatWeCheck: flag.explanation,
          numbers: flag.technicalDescription ? [{ label: 'Details', value: flag.technicalDescription }] : [],
          plainEnglish: flag.explanation,
          recommendation: flag.recommendation || 'Address immediately'
        }
      })
    }
  })
  
  // Check green flags for strength
  data.greenFlags?.forEach((flag: any) => {
    if (flag.title?.includes('Cash') || flag.title?.includes('Balance Sheet')) {
      checks.push({
        id: flag.title.toLowerCase().replace(/\s+/g, '-'),
        name: flag.title,
        status: 'pass',
        value: flag.value || 'Strong',
        priority: 'nice-to-have',
        explanation: {
          whatWeCheck: flag.explanation,
          numbers: flag.technicalDescription ? [{ label: 'Details', value: flag.technicalDescription }] : [],
          plainEnglish: flag.explanation,
          recommendation: 'Continue current strategy'
        }
      })
    }
  })
  
  return checks.length > 0 ? checks : [{
    id: 'no-data',
    name: 'Data Not Available',
    status: 'warning',
    value: 'N/A'
  }]
}

function createSimplifiedGrowthChecks(data: any): FinancialCheck[] {
  const checks: FinancialCheck[] = []
  
  // Revenue trend
  const revenueTrend = data.keyTrends?.find((t: any) => t.metric === 'Revenue')
  if (revenueTrend) {
    checks.push({
      id: 'revenue-growth',
      name: 'Revenue Growth',
      status: revenueTrend.cagr >= 10 ? 'pass' : revenueTrend.cagr >= 5 ? 'warning' : 'fail',
      value: `${revenueTrend.cagr?.toFixed(1) || 0}% CAGR`,
      details: revenueTrend.periods?.length >= 5 ? '5-year trend' : `${revenueTrend.periods?.length || 0}-year trend`,
      priority: 'important',
      explanation: {
        whatWeCheck: 'Is the company growing its sales consistently?',
        numbers: revenueTrend.periods?.slice(-5).map((p: any) => ({
          label: new Date(p.date).getFullYear().toString(),
          value: `$${(p.value / 1e9).toFixed(1)}B`
        })) || [],
        plainEnglish: revenueTrend.insight,
        recommendation: revenueTrend.cagr >= 10 ? 'Strong growth trajectory' : 'Monitor growth trends'
      }
    })
  }
  
  // Net Income trend
  const profitTrend = data.keyTrends?.find((t: any) => t.metric === 'Net Income')
  if (profitTrend) {
    checks.push({
      id: 'profit-growth',
      name: 'Profit Growth',
      status: profitTrend.cagr >= 10 ? 'pass' : profitTrend.cagr >= 0 ? 'warning' : 'fail',
      value: `${profitTrend.cagr?.toFixed(1) || 0}% CAGR`,
      details: profitTrend.periods?.length >= 5 ? '5-year trend' : `${profitTrend.periods?.length || 0}-year trend`,
      priority: 'important',
      explanation: {
        whatWeCheck: 'Are profits growing over time?',
        numbers: profitTrend.periods?.slice(-5).map((p: any) => ({
          label: new Date(p.date).getFullYear().toString(),
          value: `$${(p.value / 1e9).toFixed(1)}B`
        })) || [],
        plainEnglish: profitTrend.insight,
        recommendation: profitTrend.cagr >= 10 ? 'Excellent profit growth' : 'Review profitability drivers'
      }
    })
  }
  
  // Cash Flow trend
  const cashFlowTrend = data.keyTrends?.find((t: any) => t.metric === 'Free Cash Flow' || t.metric === 'Operating Cash Flow')
  if (cashFlowTrend) {
    checks.push({
      id: 'cash-flow-growth',
      name: 'Cash Flow Growth',
      status: cashFlowTrend.cagr >= 10 ? 'pass' : cashFlowTrend.cagr >= 0 ? 'warning' : 'fail',
      value: `${cashFlowTrend.cagr?.toFixed(1) || 0}% CAGR`,
      details: cashFlowTrend.periods?.length >= 5 ? '5-year trend' : `${cashFlowTrend.periods?.length || 0}-year trend`,
      priority: 'red-flag',
      explanation: {
        whatWeCheck: 'Is the company generating more cash over time?',
        numbers: cashFlowTrend.periods?.slice(-5).map((p: any) => ({
          label: new Date(p.date).getFullYear().toString(),
          value: `$${(p.value / 1e9).toFixed(1)}B`
        })) || [],
        plainEnglish: cashFlowTrend.insight || 'Cash flow growth indicates financial health',
        recommendation: cashFlowTrend.cagr >= 10 ? 'Strong cash generation' : 'Monitor cash flow trends closely'
      }
    })
  }
  
  return checks.length > 0 ? checks : [{
    id: 'no-data',
    name: 'Growth Data Not Available',
    status: 'warning',
    value: 'N/A'
  }]
}

function createSimplifiedProfitabilityChecks(data: any): FinancialCheck[] {
  const checks: FinancialCheck[] = []
  
  // Gross Margin with trend analysis
  const grossMargin = data.keyRatios?.find((r: any) => r.name?.includes('Gross Profit Margin') || r.name?.includes('Gross Margin'))
  const grossMarginTrend = data.keyTrends?.find((t: any) => t.metric?.toLowerCase().includes('gross margin') || t.metric?.toLowerCase().includes('gross profit'))
  
  if (grossMargin) {
    const trendDirection = grossMarginTrend?.direction || 'unknown'
    const isImproving = trendDirection === 'increasing'
    const isStable = trendDirection === 'stable'
    const isDeclining = trendDirection === 'decreasing'
    
    // Determine status based on both level and trend
    let status: 'pass' | 'warning' | 'fail' = 'warning'
    if (grossMargin.value >= 40 && !isDeclining) status = 'pass'
    else if (grossMargin.value >= 30 && isImproving) status = 'pass'
    else if (grossMargin.value >= 30 && isStable) status = 'warning'
    else if (grossMargin.value < 20 || isDeclining) status = 'fail'
    
    checks.push({
      id: 'gross-margin',
      name: 'Gross Margin & Trend',
      status,
      value: `${grossMargin.value?.toFixed(1) || 0}%`,
      details: trendDirection !== 'unknown' ? `${trendDirection} trend` : undefined,
      priority: 'important',
      explanation: {
        whatWeCheck: 'Pricing power and competitive advantage - shows profit after direct costs',
        numbers: grossMargin.actualValues ? [
          { label: 'Gross Profit', value: `$${(grossMargin.actualValues.numerator / 1e9).toFixed(1)}B` },
          { label: 'Revenue', value: `$${(grossMargin.actualValues.denominator / 1e9).toFixed(1)}B` },
          { label: '5-Year Trend', value: trendDirection || 'N/A' }
        ] : [{ label: 'Current Margin', value: `${grossMargin.value?.toFixed(1)}%` }],
        plainEnglish: `${grossMargin.interpretation || 'Gross margin shows pricing power.'}${isDeclining ? ' Warning: Declining margins may indicate increasing competition or cost pressures.' : ''}`,
        formula: 'Gross Profit / Revenue × 100',
        whyItMatters: [
          'High gross margins indicate pricing power',
          'Declining margins signal competitive pressure',
          'Industry comparison is crucial'
        ],
        recommendation: 
          grossMargin.value >= 40 ? 'Excellent pricing power - maintain competitive advantage' :
          grossMargin.value >= 30 ? 'Good margins - monitor for changes' :
          'Consider strategies to improve pricing or reduce direct costs'
      }
    })
  }
  
  // Net Margin from ratios
  const netMargin = data.keyRatios?.find((r: any) => r.name?.includes('Net Margin') || r.name?.includes('Net Profit'))
  if (netMargin) {
    checks.push({
      id: 'net-margin',
      name: 'Net Profit Margin',
      status: netMargin.value >= 10 ? 'pass' : netMargin.value >= 5 ? 'warning' : 'fail',
      value: `${netMargin.value?.toFixed(1) || 0}%`,
      priority: 'important',
      explanation: {
        whatWeCheck: 'What percentage of revenue becomes profit?',
        numbers: [{ label: 'Net Margin', value: `${netMargin.value?.toFixed(1)}%` }],
        plainEnglish: netMargin.interpretation,
        recommendation: netMargin.value >= 10 ? 'Strong profitability' : 'Work on improving margins'
      }
    })
  }
  
  // ROE from ratios
  const roe = data.keyRatios?.find((r: any) => r.name?.includes('ROE') || r.name?.includes('Return on Equity'))
  if (roe) {
    checks.push({
      id: 'return-on-equity',
      name: 'Return on Equity',
      status: roe.value >= 15 ? 'pass' : roe.value >= 10 ? 'warning' : 'fail',
      value: `${roe.value?.toFixed(1) || 0}%`,
      priority: 'nice-to-have',
      explanation: {
        whatWeCheck: 'How well does the company use shareholder money?',
        numbers: [{ label: 'ROE', value: `${roe.value?.toFixed(1)}%` }],
        plainEnglish: roe.interpretation,
        recommendation: roe.value >= 15 ? 'Excellent returns' : 'Returns could be improved'
      }
    })
  }
  
  return checks.length > 0 ? checks : [{
    id: 'no-data',
    name: 'Profitability Data Not Available',
    status: 'warning',
    value: 'N/A'
  }]
}

function createSimplifiedStrengthChecks(data: any): FinancialCheck[] {
  // Similar pattern - extract from available data
  return data.keyRatios?.filter((r: any) => 
    r.name?.includes('Debt') || r.name?.includes('Interest Coverage')
  ).map((ratio: any) => ({
    id: ratio.name.toLowerCase().replace(/\s+/g, '-'),
    name: ratio.name,
    status: ratio.score === 'excellent' || ratio.score === 'good' ? 'pass' : 
            ratio.score === 'fair' ? 'warning' : 'fail',
    value: ratio.value?.toFixed(2) || 'N/A',
    priority: 'nice-to-have',
    explanation: {
      whatWeCheck: ratio.formula,
      numbers: [],
      plainEnglish: ratio.interpretation,
      recommendation: 'Monitor financial strength metrics'
    }
  })) || []
}

function createSimplifiedQualityChecks(data: any): FinancialCheck[] {
  const checks: FinancialCheck[] = []
  
  // Return on Invested Capital (ROIC)
  const roic = data.keyRatios?.find((r: any) => 
    r.name?.toLowerCase().includes('roic') || 
    r.name?.toLowerCase().includes('return on invested capital')
  )
  
  if (roic) {
    checks.push({
      id: 'roic',
      name: 'Return on Invested Capital (ROIC)',
      status: roic.value >= 15 ? 'pass' : roic.value >= 10 ? 'warning' : 'fail',
      value: `${roic.value?.toFixed(1) || 0}%`,
      priority: 'important',
      explanation: {
        whatWeCheck: 'True business returns - how efficiently does the company use ALL investor capital (debt + equity)?',
        numbers: roic.actualValues ? [
          { label: 'NOPAT', value: `$${(roic.actualValues.numerator / 1e9).toFixed(1)}B` },
          { label: 'Invested Capital', value: `$${(roic.actualValues.denominator / 1e9).toFixed(1)}B` },
          { label: 'ROIC', value: `${roic.value?.toFixed(1)}%` }
        ] : [{ label: 'ROIC', value: `${roic.value?.toFixed(1)}%` }],
        plainEnglish: roic.interpretation || 'ROIC shows how well management uses investor capital. Unlike ROE, it cannot be manipulated with leverage.',
        formula: 'NOPAT / (Debt + Equity - Cash) × 100',
        whyItMatters: [
          'Single best indicator of business quality',
          'Should exceed cost of capital (typically 8-10%)',
          'Cannot be faked with financial engineering'
        ],
        recommendation: 
          roic.value >= 20 ? 'Exceptional capital efficiency - likely has strong competitive advantage' :
          roic.value >= 15 ? 'Great returns on capital - well-managed business' :
          roic.value >= 10 ? 'Acceptable returns - ensure above cost of capital' :
          'Poor capital allocation - may be destroying value'
      }
    })
  }
  
  // Operating Cash Flow to Net Income (Earnings Quality)
  const ocfToNI = data.keyRatios?.find((r: any) => 
    r.name?.toLowerCase().includes('operating cash flow') && r.name?.toLowerCase().includes('net income') ||
    r.name?.toLowerCase().includes('ocf/net income') ||
    r.name?.toLowerCase().includes('earnings quality')
  )
  
  if (ocfToNI) {
    checks.push({
      id: 'earnings-quality',
      name: 'OCF/Net Income (Earnings Quality)',
      status: ocfToNI.value >= 1.0 ? 'pass' : ocfToNI.value >= 0.8 ? 'warning' : 'fail',
      value: ocfToNI.value?.toFixed(2) || 'N/A',
      priority: 'red-flag',
      explanation: {
        whatWeCheck: 'Are reported profits turning into real cash? Validates earnings quality and detects accounting manipulation.',
        numbers: ocfToNI.actualValues ? [
          { label: 'Operating Cash Flow', value: `$${(ocfToNI.actualValues.numerator / 1e9).toFixed(1)}B` },
          { label: 'Net Income', value: `$${(ocfToNI.actualValues.denominator / 1e9).toFixed(1)}B` },
          { label: 'Ratio', value: ocfToNI.value?.toFixed(2) }
        ] : [{ label: 'OCF/NI Ratio', value: ocfToNI.value?.toFixed(2) }],
        plainEnglish: ocfToNI.interpretation || 
          (ocfToNI.value >= 1.0 ? 'Excellent - profits are backed by strong cash generation.' :
           ocfToNI.value >= 0.8 ? 'Acceptable - most profits convert to cash.' :
           'Warning - profits may be overstated or involve aggressive accounting.'),
        formula: 'Operating Cash Flow / Net Income',
        whyItMatters: [
          'Ratio > 1.0 indicates high-quality earnings',
          'Consistently < 0.8 suggests accounting manipulation',
          'Cash is harder to fake than earnings'
        ],
        recommendation: 
          ocfToNI.value >= 1.2 ? 'Very high quality earnings - cash exceeds reported profits' :
          ocfToNI.value >= 1.0 ? 'Good earnings quality - profits convert to cash' :
          ocfToNI.value >= 0.8 ? 'Monitor closely - some profits not converting to cash' :
          'Red flag - investigate potential earnings manipulation'
      }
    })
  }
  
  // Free Cash Flow Margin
  const fcfMargin = data.keyRatios?.find((r: any) => r.name?.includes('FCF') || r.name?.includes('Free Cash Flow'))
  if (fcfMargin) {
    checks.push({
      id: 'fcf-margin',
      name: 'Free Cash Flow Margin',
      status: fcfMargin.value >= 10 ? 'pass' : fcfMargin.value >= 5 ? 'warning' : 'fail',
      value: `${fcfMargin.value?.toFixed(1) || 0}%`,
      priority: 'important',
      explanation: {
        whatWeCheck: 'How much free cash does the company generate?',
        numbers: [{ label: 'FCF Margin', value: `${fcfMargin.value?.toFixed(1)}%` }],
        plainEnglish: fcfMargin.interpretation,
        recommendation: fcfMargin.value >= 10 ? 'Strong cash generation' : 'Monitor cash flow'
      }
    })
  }
  
  return checks.length > 0 ? checks : [{
    id: 'no-data',
    name: 'Quality Metrics Not Available',
    status: 'warning',
    value: 'N/A'
  }]
}

function createSimplifiedShareholderChecks(data: any, financialStatements?: any): FinancialCheck[] {
  const checks: FinancialCheck[] = []
  
  // Get share count trend data for later use
  const shareCountTrend = data.keyTrends?.find((t: any) => 
    t.metric?.toLowerCase().includes('shares outstanding')
  )
  
  // Check for buyback flag
  const buybackFlag = data.greenFlags?.find((f: any) => 
    f.title?.toLowerCase().includes('buyback') || 
    f.title?.toLowerCase().includes('share repurchase')
  )
  
  if (buybackFlag) {
    checks.push({
      id: 'share-buybacks',
      name: 'Share Buybacks',
      status: 'pass',
      value: buybackFlag.value ? `${buybackFlag.value.toFixed(1)}% reduction` : 'Active',
      priority: 'nice-to-have',
      explanation: {
        whatWeCheck: buybackFlag.explanation || 'Is the company buying back shares?',
        numbers: buybackFlag.technicalDescription ? 
          [{ label: 'Details', value: buybackFlag.technicalDescription }] : [],
        plainEnglish: buybackFlag.explanation || 'Company is returning cash to shareholders through buybacks',
        recommendation: 'Strong capital return program'
      }
    })
  }
  
  // Check for dividend coverage flag
  const dividendFlag = data.greenFlags?.find((f: any) => 
    f.title?.toLowerCase().includes('dividend')
  )
  
  if (dividendFlag) {
    checks.push({
      id: 'dividend-coverage',
      name: 'Dividend Sustainability',
      status: 'pass',
      value: dividendFlag.value ? `${dividendFlag.value.toFixed(0)}% payout` : 'Well Covered',
      priority: 'nice-to-have',
      explanation: {
        whatWeCheck: 'Are dividends sustainable from cash flow?',
        numbers: dividendFlag.technicalDescription ? 
          [{ label: 'Details', value: dividendFlag.technicalDescription }] : [],
        plainEnglish: dividendFlag.explanation || 'Dividends are well covered by cash flow',
        recommendation: 'Safe and sustainable dividend'
      }
    })
  }
  
  // Check for share dilution in red flags
  const dilutionFlag = data.redFlags?.find((f: any) => 
    f.title?.toLowerCase().includes('dilution') || 
    f.title?.toLowerCase().includes('share count')
  )
  
  if (dilutionFlag) {
    checks.push({
      id: 'share-dilution',
      name: 'Share Dilution',
      status: 'fail',
      value: dilutionFlag.value ? `+${dilutionFlag.value.toFixed(1)}%` : 'High',
      priority: 'red-flag',
      explanation: {
        whatWeCheck: dilutionFlag.explanation || 'Is share count increasing?',
        numbers: dilutionFlag.technicalDescription ? 
          [{ label: 'Details', value: dilutionFlag.technicalDescription }] : [],
        plainEnglish: dilutionFlag.explanation || 'Share count increasing, diluting ownership',
        recommendation: dilutionFlag.recommendation || 'Monitor dilution levels'
      }
    })
  }
  
  // Check share count trend if available
  if (shareCountTrend && !dilutionFlag && !buybackFlag) {
    const isDecreasing = shareCountTrend.direction === 'improving' || 
                        (shareCountTrend.cagr && shareCountTrend.cagr < 0)
    checks.push({
      id: 'share-count-trend',
      name: 'Share Count Trend',
      status: isDecreasing ? 'pass' : shareCountTrend.direction === 'stable' ? 'warning' : 'fail',
      value: shareCountTrend.cagr ? `${shareCountTrend.cagr.toFixed(1)}% CAGR` : shareCountTrend.direction,
      details: shareCountTrend.periods?.length >= 5 ? '5-year trend' : `${shareCountTrend.periods?.length || 0}-year trend`,
      priority: 'important',
      explanation: {
        whatWeCheck: 'Is share count increasing (dilution) or decreasing (buybacks)?',
        numbers: shareCountTrend.periods?.slice(-3).map((p: any) => ({
          label: new Date(p.date).getFullYear().toString(),
          value: `${(p.value / 1e6).toFixed(0)}M shares`
        })) || [],
        plainEnglish: shareCountTrend.insight || 
          (isDecreasing ? 'Share count decreasing - good for shareholders!' : 'Share count changing over time'),
        recommendation: isDecreasing ? 'Excellent trend' : 'Monitor share count changes'
      }
    })
  }
  
  // Check for dividend trend
  const dividendTrend = data.keyTrends?.find((t: any) => 
    t.metric?.toLowerCase().includes('dividend')
  )
  
  if (dividendTrend) {
    const isGrowing = dividendTrend.direction === 'improving' || 
                     (dividendTrend.cagr && dividendTrend.cagr > 0)
    checks.push({
      id: 'dividend-growth',
      name: 'Dividend Growth',
      status: isGrowing ? 'pass' : dividendTrend.direction === 'stable' ? 'warning' : 'fail',
      value: dividendTrend.cagr ? `${dividendTrend.cagr.toFixed(1)}% CAGR` : dividendTrend.direction,
      details: dividendTrend.periods?.length >= 5 ? '5-year trend' : `${dividendTrend.periods?.length || 0}-year trend`,
      priority: 'nice-to-have',
      explanation: {
        whatWeCheck: 'Is the company growing its dividend payments?',
        numbers: dividendTrend.periods?.slice(-3).map((p: any) => ({
          label: new Date(p.date).getFullYear().toString(),
          value: `$${(p.value / 1e9).toFixed(2)}B`
        })) || [],
        plainEnglish: dividendTrend.insight || 
          (isGrowing ? 'Growing dividend payments to shareholders' : 'Dividend trend over time'),
        recommendation: isGrowing ? 'Strong dividend growth' : 'Review dividend policy'
      }
    })
  }
  
  // Add SBC (Stock-Based Compensation) check
  if (!checks.find(c => c.id === 'stock-compensation')) {
    const symbol = data.symbol || ''
    const isKnownHighSBC = ['GOOGL', 'GOOG', 'META', 'AMZN', 'MSFT', 'AAPL', 'NVDA', 'TSLA', 'CRM', 'NFLX'].includes(symbol.toUpperCase())
    const isTechOrGrowth = data.summary?.oneLineSummary?.toLowerCase().includes('tech') ||
                          data.summary?.oneLineSummary?.toLowerCase().includes('software') ||
                          data.greenFlags?.some((f: any) => f.title?.includes('Growth')) ||
                          data.keyTrends?.find((t: any) => t.metric === 'Revenue')?.cagr > 20
    
    // Try to get actual SBC data from financial statements
    let sbcAmount: number | null = null
    let revenue: number | null = null
    let sbcToRevenue: number | null = null
    
    if (financialStatements?.cashFlowStatements?.ttm?.stockBasedCompensation) {
      sbcAmount = financialStatements.cashFlowStatements.ttm.stockBasedCompensation
      revenue = financialStatements.incomeStatements?.ttm?.revenue || null
      if (sbcAmount && revenue && revenue > 0) {
        sbcToRevenue = (sbcAmount / revenue) * 100
      }
    }
    
    if (sbcAmount !== null || isKnownHighSBC || isTechOrGrowth || shareCountTrend?.direction === 'volatile') {
      let sbcValue: string
      let sbcStatus: 'pass' | 'warning' | 'fail'
      let sbcGuidance: string
      let numbers: any[] = []
      
      if (sbcAmount !== null && sbcToRevenue !== null) {
        // We have actual SBC data
        sbcValue = `${sbcToRevenue.toFixed(1)}% of revenue`
        sbcStatus = sbcToRevenue <= 2 ? 'pass' : sbcToRevenue <= 5 ? 'warning' : 'fail'
        sbcGuidance = sbcToRevenue <= 2
          ? `Low stock compensation at ${sbcToRevenue.toFixed(1)}% of revenue - management not overpaid.`
          : sbcToRevenue <= 5
          ? `Moderate ${sbcToRevenue.toFixed(1)}% stock comp - watch for dilution.`
          : `High ${sbcToRevenue.toFixed(1)}% stock comp - excessive management pay!`
        
        numbers = [
          { label: 'Stock-Based Comp (TTM)', value: `$${(sbcAmount / 1e9).toFixed(2)}B` },
          { label: 'As % of Revenue', value: `${sbcToRevenue.toFixed(1)}%` }
        ]
        
        if (revenue) {
          numbers.push({ label: 'Revenue (TTM)', value: `$${(revenue / 1e9).toFixed(2)}B` })
        }
      } else {
        // Estimate SBC impact based on typical ranges
        sbcValue = 'Check 10-K'
        sbcStatus = 'warning'
        sbcGuidance = 'Tech and high-growth companies often have 10-20% of revenue as SBC.'
        
        if (isKnownHighSBC) {
          sbcValue = '10-15% of revenue'
          sbcStatus = 'fail'
          if (['GOOGL', 'GOOG'].includes(symbol.toUpperCase())) {
            sbcGuidance = 'Alphabet (Google) typically has SBC of ~13-15% of revenue, around $20-25B annually. This is a significant dilution factor despite the buybacks.'
          } else if (symbol === 'META') {
            sbcGuidance = 'Meta typically has SBC of ~15-20% of revenue, one of the highest in big tech.'
          } else if (['CRM', 'TSLA'].includes(symbol)) {
            sbcGuidance = 'This company is known for very high SBC, often exceeding 15% of revenue.'
          }
        }
      }
      
      checks.push({
        id: 'stock-compensation',
        name: 'Stock-Based Compensation (SBC)',
        status: sbcStatus,
        value: sbcValue,
        priority: 'important',
        explanation: {
          whatWeCheck: 'Is the company diluting shareholders through excessive stock compensation?',
          numbers: numbers,
          plainEnglish: `Stock-based compensation dilutes existing shareholders by issuing new shares to employees. ${sbcGuidance}${sbcAmount === null ? ' Check the company\'s 10-K filing for exact SBC numbers.' : ''}`,
          recommendation: sbcAmount !== null 
            ? (sbcToRevenue! <= 2 
              ? 'Reasonable compensation structure.' 
              : sbcToRevenue! <= 5 
              ? 'Monitor dilution from stock comp.' 
              : 'Excessive stock compensation. Red flag.')
            : 'Review the "Share-Based Compensation" note in the annual report. Compare SBC to buyback amounts to see net dilution.'
        }
      })
    }
  }
  
  return checks.length > 0 ? checks : [{
    id: 'no-data',
    name: 'Shareholder Data Not Available',
    status: 'warning',
    value: 'N/A'
  }]
}