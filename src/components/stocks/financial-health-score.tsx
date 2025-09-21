'use client'

import { cn } from '@/lib/utils'

interface FinancialHealthScoreProps {
  score: number // 0-100
  grade: string // A+, A, B+, B, C+, C, D, F
  summary: string
  simpleRating: '🟢 Excellent' | '🟢 Good' | '🟡 Fair' | '🔴 Poor'
  categories?: {
    name: string
    score: number
    weight: number
  }[]
  loading?: boolean
}

export function FinancialHealthScore({ 
  score, 
  grade, 
  summary, 
  simpleRating,
  categories,
  loading 
}: FinancialHealthScoreProps) {
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-40 bg-muted rounded-lg"></div>
      </div>
    )
  }

  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 65) return 'text-yellow-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800 border-green-200'
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  return (
    <div className="space-y-4">
      {/* Main Score Display */}
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              {/* Score Meter */}
              <div className="relative w-40 h-24">
                <svg 
                  className="w-full h-full" 
                  viewBox="0 0 200 120"
                >
                  {/* Background semicircle */}
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="16"
                    className="text-gray-200"
                  />
                  
                  {/* Score arc */}
                  {score > 0 && (
                    <path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="16"
                      className={getScoreColor(score)}
                      strokeLinecap="round"
                      strokeDasharray={`${(score / 100) * 251.33} 251.33`}
                    />
                  )}
                  
                  {/* Center circle background */}
                  <circle
                    cx="100"
                    cy="100"
                    r="35"
                    className="fill-white"
                  />
                  
                  {/* Score text */}
                  <text
                    x="100"
                    y="105"
                    textAnchor="middle"
                    className="fill-current text-4xl font-bold"
                  >
                    {score}
                  </text>
                </svg>
              </div>

              {/* Grade Badge */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "text-2xl font-bold px-4 py-2 rounded-lg border-2",
                  getGradeColor(grade)
                )}>
                  {grade}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Grade</p>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-4">
              <p className="text-lg font-medium">{simpleRating}</p>
              <p className="text-sm text-muted-foreground mt-1">{summary}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {categories && categories.length > 0 && (
        <div className="space-y-2 pt-4 border-t">
          <p className="text-sm font-medium mb-3">Score Breakdown</p>
          {categories.map((category) => (
            <div key={category.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize">
                  {category.name.replace(/_/g, ' ')}
                </span>
                <span className="text-muted-foreground">
                  {category.score}/100 ({category.weight}% weight)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    category.score >= 80 ? 'bg-green-500' :
                    category.score >= 65 ? 'bg-yellow-500' :
                    category.score >= 50 ? 'bg-orange-500' :
                    'bg-red-500'
                  )}
                  style={{ width: `${category.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
