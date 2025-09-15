'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle } from 'lucide-react'
import { useFinancialAnalysis } from '@/lib/hooks/useFinancialAnalysis'
import { FinancialHealthChecklist } from './financial-health-checklist'

interface FinancialAnalysisData {
  symbol: string
  analysisDate: string
  healthScore: {
    overall: number
    grade: string
    summary: string
    categories: {
      name: string
      score: number
      weight: number
    }[]
  }
  summary: {
    oneLineSummary: string
    healthDescription: string
    simpleRating: '🟢 Excellent' | '🟢 Good' | '🟡 Fair' | '🔴 Poor'
    investmentSuitability: {
      conservative: boolean
      growth: boolean
      value: boolean
      income: boolean
    }
  }
  keyStrengths: string[]
  keyWeaknesses: string[]
  redFlagsCount: number
  greenFlagsCount: number
  redFlags: {
    severity: string
    title: string
    explanation: string
    technicalDescription?: string
    formula?: string
    value?: number
    threshold?: number
    recommendation?: string
    confidence?: number
  }[]
  greenFlags: {
    strength: string
    title: string
    explanation: string
    technicalDescription?: string
    metrics?: any
    trend?: string
    recommendation?: string
    confidence?: number
  }[]
  keyRatios: {
    name: string
    value: number | null
    formula?: string
    interpretation: string
    score: string
    benchmark?: any
    actualValues?: {
      numerator: number
      denominator: number
      unit?: string
    }
    trend?: 'improving' | 'stable' | 'declining'
  }[]
  keyTrends: {
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
  }[]
  recommendations: {
    type: string
    priority: string
    title: string
    description: string
  }[]
}

interface FinancialAnalysisDashboardProps {
  symbol: string
}

// Investor type descriptions
const investorTypeInfo = {
  conservative: {
    icon: '🛡️',
    title: 'Conservative Investor',
    description: 'Safety-first approach, prioritizing capital preservation',
    requirements: [
      'Health Score ≥ 70',
      'No critical red flags',
      'Strong balance sheet OR stable dividends OR stable margins'
    ],
    ideal: 'Retirees, risk-averse investors, or those near retirement'
  },
  growth: {
    icon: '🚀',
    title: 'Growth Investor',
    description: 'Seeks high growth potential, accepts more volatility',
    requirements: [
      'Health Score ≥ 65',
      'Revenue/earnings growing >10% annually',
      'Strong growth indicators or trends'
    ],
    ideal: 'Long-term investors with higher risk tolerance'
  },
  value: {
    icon: '💎',
    title: 'Value Investor',
    description: 'Looks for quality companies at fair prices',
    requirements: [
      'Health Score ≥ 60',
      'No critical issues',
      'High returns on capital (ROE >20% or ROIC >15%)'
    ],
    ideal: 'Patient investors seeking undervalued opportunities'
  },
  income: {
    icon: '💰',
    title: 'Income Investor',
    description: 'Seeks regular dividend income',
    requirements: [
      'Health Score ≥ 65',
      'Sustainable dividend payments',
      'Growing or stable dividend history'
    ],
    ideal: 'Retirees or those seeking passive income'
  }
}

export function FinancialAnalysisDashboard({ symbol }: FinancialAnalysisDashboardProps) {
  const { 
    data, 
    loading, 
    error
  } = useFinancialAnalysis<FinancialAnalysisData>(symbol, 'analysis')
  

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error.includes('Not a US-listed company') 
            ? 'Financial analysis is only available for US-listed companies (NYSE, NASDAQ, etc.)'
            : error.includes('Limited financial data') || error.includes('Incomplete financial data')
            ? error
            : `Unable to analyze financial data: ${error}`
          }
        </AlertDescription>
      </Alert>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Investment Suitability - Temporarily disabled */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Investment Suitability</CardTitle>
          <CardDescription>
            Match this stock to your investment style
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(data.summary.investmentSuitability).map(([style, suitable]) => {
                const info = investorTypeInfo[style as keyof typeof investorTypeInfo]
                
                return (
                  <div key={style} className="relative text-center p-4 rounded-lg border">
                    {/* Info Icon in corner */}
                    {/* <Tooltip>
                      <TooltipTrigger asChild>
                        <Info 
                          className="absolute top-2 right-2 h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" 
                        />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs p-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{info.icon}</span>
                            <h4 className="font-semibold">{info.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">{info.description}</p>
                          <div>
                            <p className="text-xs font-semibold mb-1">Requirements:</p>
                            <ul className="text-xs space-y-0.5">
                              {info.requirements.map((req, idx) => (
                                <li key={idx}>• {req}</li>
                              ))}
                            </ul>
                          </div>
                          <p className="text-xs text-muted-foreground italic">
                            Ideal for: {info.ideal}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip> */}
                    
                    {/* Main content */}
                    {/* <div className={cn(
                      "text-2xl mb-2",
                      suitable ? "text-green-600" : "text-muted-foreground"
                    )}>
                      {suitable ? "✅" : "❌"}
                    </div>
                    <p className="text-sm font-medium capitalize flex items-center justify-center gap-1">
                      <span>{info.icon}</span>
                      <span>{style}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {suitable ? "Suitable" : "Not Suitable"}
                    </p>
                  </div>
                )
              })}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card> */}

      {/* Financial Health Checklist */}
      <FinancialHealthChecklist data={data} loading={loading} />
    </div>
  )
}
