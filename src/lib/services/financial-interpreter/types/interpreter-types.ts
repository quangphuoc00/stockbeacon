/**
 * Financial Statement Interpreter Types
 * For US-listed companies with complete SEC EDGAR data
 */

import { FinancialStatements, IncomeStatementData, BalanceSheetData, CashFlowStatementData } from '@/types/stock'

// Confidence Score Types
export interface ConfidenceScore {
  score: number // Always 100 for base financial data from SEC
  level: 'maximum' | 'enhanced'
  source: string
  factors: ConfidenceFactor[]
}

export interface ConfidenceFactor {
  name: string
  status: 'available' | 'calculated'
  description: string
}

// Red Flag Types
export interface RedFlag {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: 'liquidity' | 'solvency' | 'profitability' | 'efficiency' | 'leverage'
  title: string
  technicalDescription: string
  beginnerExplanation: string
  formula?: string
  value?: number
  threshold?: number
  recommendation: string
}

export interface RedFlagWithConfidence {
  flag: RedFlag
  confidence: ConfidenceScore
  dataUsed: string[]
}

// Green Flag Types
export interface GreenFlag {
  id: string
  strength: 'exceptional' | 'strong' | 'good'
  category: 'growth' | 'profitability' | 'efficiency' | 'financial_health' | 'shareholder_friendly'
  title: string
  technicalDescription: string
  beginnerExplanation: string
  formula?: string
  value?: number
  benchmark?: number
  insight: string
  metrics?: any
  trend?: string
  recommendation?: string
}

export interface GreenFlagWithConfidence {
  flag: GreenFlag
  confidence: ConfidenceScore
  dataUsed: string[]
}

// Ratio Types
export interface FinancialRatio {
  id: string
  name: string
  category: 'liquidity' | 'profitability' | 'efficiency' | 'leverage' | 'valuation'
  value: number | null
  formula: string
  formulaDescription: string
  interpretation: RatioInterpretation
  actualValues?: {
    numerator: number
    denominator: number
  }
  trend?: string
}

export interface RatioInterpretation {
  score: 'excellent' | 'good' | 'fair' | 'poor'
  beginnerExplanation: string
  benchmark: {
    excellent: number
    good: number
    fair: number
    poor: number
  }
  trend?: 'improving' | 'stable' | 'deteriorating'
  industryContext?: string
}

// Trend Analysis Types
export interface TrendAnalysis {
  metric: string
  periods: TrendPeriod[]
  direction: 'improving' | 'stable' | 'deteriorating' | 'volatile'
  cagr?: number // Compound Annual Growth Rate
  volatility?: number
  beginnerInsight: string
  visualIndicator: '📈' | '📊' | '📉' | '🎢'
}

export interface TrendPeriod {
  date: string
  value: number
  percentageChange?: number
}

// Health Score Types
export interface HealthScore {
  overall: number // 0-100
  grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F'
  categories: HealthScoreCategory[]
  summary: string
  beginnerInterpretation: string
  keyStrengths: string[]
  keyWeaknesses: string[]
  actionableInsights: string[]
}

export interface HealthScoreCategory {
  name: 'profitability' | 'growth' | 'financial_stability' | 'efficiency' | 'shareholder_value'
  score: number
  weight: number
  factors: string[]
}

// Main Report Type
export interface FinancialInterpretationReport {
  symbol: string
  companyName?: string
  timestamp: Date
  dataQuality: DataQuality
  healthScore: HealthScore
  redFlags: RedFlagWithConfidence[]
  greenFlags: GreenFlagWithConfidence[]
  ratios: FinancialRatio[]
  trends: TrendAnalysis[]
  beginnerSummary: BeginnerSummary
  recommendations: Recommendation[]
}

export interface DataQuality {
  completeness: number // Always 100 for SEC data
  lastUpdated: Date
  fiscalYearEnd: string
  dataPoints: number
  historicalDepth: {
    annual: number
    quarterly: number
  }
}

export interface BeginnerSummary {
  oneLineSummary: string
  healthDescription: string
  topThreeStrengths: string[]
  topThreeConcerns: string[]
  simpleRating: '🟢 Excellent' | '🟢 Good' | '🟡 Fair' | '🔴 Poor'
  investmentSuitability: {
    conservative: boolean
    growth: boolean
    value: boolean
    income: boolean
  }
}

export interface Recommendation {
  type: 'action' | 'monitor' | 'investigate'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  rationale: string
  timeframe?: string
}

// Analysis Options
export interface AnalysisOptions {
  includeIndustryComparison?: boolean
  includePeerAnalysis?: boolean
  includeProjections?: boolean
  customBenchmarks?: Record<string, number>
}

// Helper Types
export interface FinancialMetrics {
  // Calculated from statements
  workingCapital: number
  freeCashFlow: number
  ebit: number
  ebitda: number
  netDebt: number
  enterpriseValue?: number
  
  // Growth rates
  revenueGrowthRate: number
  earningsGrowthRate: number
  fcfGrowthRate: number
  
  // Margins
  grossMargin: number
  operatingMargin: number
  netMargin: number
  fcfMargin: number
  
  // Returns
  roe: number
  roa: number
  roic: number
  
  // Per share
  bookValuePerShare: number
  cashPerShare: number
  debtPerShare: number
}

// Industry Benchmark Types
export interface IndustryBenchmarks {
  sector: string
  industry: string
  benchmarks: {
    currentRatio: { p25: number; median: number; p75: number }
    debtToEquity: { p25: number; median: number; p75: number }
    grossMargin: { p25: number; median: number; p75: number }
    operatingMargin: { p25: number; median: number; p75: number }
    roe: { p25: number; median: number; p75: number }
    roic: { p25: number; median: number; p75: number }
  }
}
