'use client'

import React, { useState, useEffect, useRef, Fragment } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Info, TrendingUp, TrendingDown, Minus, Calculator } from 'lucide-react'
import { ComprehensiveValuation, ValuationResult } from '@/lib/services/valuation.service'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ValuationChartProps {
  valuation: ComprehensiveValuation | null
  loading?: boolean
  onRecalculate?: (customRates: CustomGrowthRates) => void
  missingFields?: any
  manualInputs?: {
    operatingCashflow?: number
    shareholderEquity?: number
    pegRatio?: number
    earningsGrowth?: number
  }
  onManualInputChange?: (inputs: any) => void
}

interface CustomGrowthRates {
  growthRate1to5?: number
  growthRate6to10?: number
  growthRate11to20?: number
  discountRate?: number
}

// Client-side DCF calculation for instant feedback
function calculateClientDCF(
  currentCashflow: number,
  growthRate1to5: number,
  growthRate6to10: number,
  growthRate11to20: number,
  sharesOutstanding: number,
  totalDebt: number = 0,
  totalCash: number = 0,
  discountRate: number = 0.1
): number {
  let totalPV = 0
  
  // Years 1-5: Initial growth phase
  for (let year = 1; year <= 5; year++) {
    const futureCF = currentCashflow * Math.pow(1 + growthRate1to5, year)
    const presentValue = futureCF / Math.pow(1 + discountRate, year)
    totalPV += presentValue
  }

  // Years 6-10: Moderate growth phase
  const year5CF = currentCashflow * Math.pow(1 + growthRate1to5, 5)
  for (let year = 6; year <= 10; year++) {
    const futureCF = year5CF * Math.pow(1 + growthRate6to10, year - 5)
    const presentValue = futureCF / Math.pow(1 + discountRate, year)
    totalPV += presentValue
  }

  // Years 11-20: Mature growth phase
  const year10CF = year5CF * Math.pow(1 + growthRate6to10, 5)
  for (let year = 11; year <= 20; year++) {
    const futureCF = year10CF * Math.pow(1 + growthRate11to20, year - 10)
    const presentValue = futureCF / Math.pow(1 + discountRate, year)
    totalPV += presentValue
  }

  // Convert Enterprise Value to Equity Value
  const enterpriseValue = totalPV
  const equityValue = enterpriseValue - totalDebt + totalCash
  
  return equityValue / sharesOutstanding
}

export function ValuationChart({ valuation, loading, onRecalculate, missingFields, manualInputs, onManualInputChange }: ValuationChartProps) {
  const [selectedMethod, setSelectedMethod] = useState<ValuationResult | null>(null)
  const [customRates, setCustomRates] = useState<CustomGrowthRates>({})
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({})
  const initializedMethodRef = useRef<string | null>(null)
  const [localValuations, setLocalValuations] = useState<{ [key: string]: ValuationResult } | null>(null)
  
  // Function to update DCF value locally for instant feedback
  const updateLocalDCFValue = (method: ValuationResult, rates: CustomGrowthRates) => {
    if (!method.calculationData || !method.calculationData.inputs) return
    
    const inputs = method.calculationData.inputs
    const currentCashflow = inputs['Operating Cash Flow']?.value || inputs['Free Cash Flow']?.value || inputs['Net Income']?.value || 0
    const sharesOutstanding = inputs['Shares Outstanding']?.value || 1
    const totalDebt = inputs['Total Debt']?.value || 0
    const totalCash = inputs['Cash & ST Investments']?.value || 0
    
    // Use custom rates or fall back to original values
    const growthRate1to5 = rates.growthRate1to5 ?? inputs['Growth Rate (Year 1-5)']?.value ?? 0.1
    const growthRate6to10 = rates.growthRate6to10 ?? inputs['Growth Rate (Year 6-10)']?.value ?? 0.075
    const growthRate11to20 = rates.growthRate11to20 ?? inputs['Growth Rate (Year 11-20)']?.value ?? 0.04
    const discountRate = rates.discountRate ?? inputs['Discount Rate']?.value ?? 0.1
    
    // Calculate new value
    const newValue = calculateClientDCF(
      currentCashflow,
      growthRate1to5,
      growthRate6to10,
      growthRate11to20,
      sharesOutstanding,
      totalDebt,
      totalCash,
      discountRate
    )
    
    // Create updated method with new value
    const updatedMethod = {
      ...method,
      value: newValue,
      isCalculating: true, // Visual indicator that this is a live calculation
      calculationData: {
        ...method.calculationData,
        inputs: {
          ...inputs,
          'Growth Rate (Year 1-5)': { ...inputs['Growth Rate (Year 1-5)'], value: growthRate1to5 },
          'Growth Rate (Year 6-10)': { ...inputs['Growth Rate (Year 6-10)'], value: growthRate6to10 },
          'Growth Rate (Year 11-20)': { ...inputs['Growth Rate (Year 11-20)'], value: growthRate11to20 },
          'Discount Rate': { ...inputs['Discount Rate'], value: discountRate }
        }
      }
    }
    
    // Update local valuations
    setLocalValuations(prev => ({
      ...prev,
      [method.method]: updatedMethod
    }))
    
    // Also update the selected method if it's the current one
    if (selectedMethod?.method === method.method) {
      setSelectedMethod(updatedMethod)
    }
  }
  
  // Auto-select the first valuation method when data loads (only if none is selected)
  useEffect(() => {
    if (valuation?.valuations && valuation.valuations.length > 0 && !selectedMethod) {
      setSelectedMethod(valuation.valuations[0])
    }
  }, [valuation]) // Remove selectedMethod from deps to avoid circular updates
  
  // Initialize custom rates and input values from valuation data
  useEffect(() => {
    if (selectedMethod?.calculationData?.inputs && selectedMethod.method !== initializedMethodRef.current) {
      const inputs = selectedMethod.calculationData.inputs
      const rate1to5 = inputs['Growth Rate (Year 1-5)']?.value
      const rate6to10 = inputs['Growth Rate (Year 6-10)']?.value
      const rate11to20 = inputs['Growth Rate (Year 11-20)']?.value
      const discountRate = inputs['Discount Rate']?.value
      
      // Always initialize rates for DCF methods
      if (selectedMethod.method === 'DFCF-20' || selectedMethod.method === 'DCF-20' || selectedMethod.method === 'DNI-20') {
        setCustomRates({
          growthRate1to5: rate1to5,
          growthRate6to10: rate6to10,
          growthRate11to20: rate11to20,
          discountRate: discountRate
        })
        
        // Initialize input values with all available values
        setInputValues({
          'Growth Rate (Year 1-5)': rate1to5 !== undefined ? (rate1to5 * 100).toFixed(2) : '',
          'Growth Rate (Year 6-10)': rate6to10 !== undefined ? (rate6to10 * 100).toFixed(2) : '',
          'Growth Rate (Year 11-20)': rate11to20 !== undefined ? (rate11to20 * 100).toFixed(2) : '',
          'Discount Rate': discountRate !== undefined ? (discountRate * 100).toFixed(2) : ''
        })
        
        // Mark this method as initialized
        initializedMethodRef.current = selectedMethod.method
      }
    }
  }, [selectedMethod])
  
  // Handle input changes with instant feedback for DCF calculations
  const handleInputChange = (key: string, value: string) => {
    // Update local input value for smooth typing
    setInputValues(prev => ({ ...prev, [key]: value }))
    
    // For DCF models, calculate instantly while typing
    if (selectedMethod && (selectedMethod.method === 'DFCF-20' || selectedMethod.method === 'DCF-20' || selectedMethod.method === 'DNI-20')) {
      // Parse the input value
      const numValue = parseFloat(value) / 100 // Convert percentage to decimal
      if (!isNaN(numValue) || value === '') {
        // Map input key to growth rate field
        let field: keyof CustomGrowthRates | null = null
        if (key === 'Growth Rate (Year 1-5)') field = 'growthRate1to5'
        else if (key === 'Growth Rate (Year 6-10)') field = 'growthRate6to10'
        else if (key === 'Growth Rate (Year 11-20)') field = 'growthRate11to20'
        else if (key === 'Discount Rate') field = 'discountRate'
        
        if (field) {
          const newRates = { ...customRates, [field]: value === '' ? undefined : numValue }
          setCustomRates(newRates)
          hasUserChangedRatesRef.current = true
          
          // Calculate new value instantly on client-side
          updateLocalDCFValue(selectedMethod, newRates)
        }
      }
    }
  }
  
  const handleInputBlur = (key: string, field: keyof CustomGrowthRates) => {
    // On blur, optionally save to server after user finishes editing
    // The value has already been updated in real-time via handleInputChange
    if (onRecalculate && hasUserChangedRatesRef.current) {
      hasUserChangedRatesRef.current = false
      onRecalculate(customRates)
    }
  }
  
  // Track if user has manually changed rates
  const hasUserChangedRatesRef = useRef(false)
  
  // Removed auto-recalculate - now handled in real-time via handleInputChange
  // Server sync happens on blur via handleInputBlur
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Intrinsic Value Analysis</CardTitle>
          <CardDescription>Calculating multiple intrinsic value models...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            {/* Animated chart icon */}
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent animate-spin" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-bl from-primary/10 via-transparent to-primary/10 animate-spin-reverse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg 
                  className="w-10 h-10 text-primary animate-pulse-subtle" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  strokeWidth={2} 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                  />
                </svg>
              </div>
            </div>
            
            {/* Loading text */}
            <div className="mt-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">Analyzing valuation models</span>
                <span className="flex gap-1">
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce-dot" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce-dot" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce-dot" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
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
          <CardDescription>Unable to calculate intrinsic value metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Insufficient financial data to perform intrinsic value analysis.
          </p>
        </CardContent>
      </Card>
    )
  }

  const maxValue = Math.max(
    valuation.currentPrice * 2,
    ...valuation.valuations.map(v => {
      const localValue = localValuations?.[v.method]?.value
      return localValue !== undefined ? localValue : v.value
    })
  )

  const getBarWidth = (value: number) => {
    return `${(value / maxValue) * 100}%`
  }

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 })}M`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Intrinsic Value Methods List */}
      <Card>
        <CardHeader>
          <CardTitle>Intrinsic Value Methods</CardTitle>
          <CardDescription>
            Current Price: {formatValue(valuation.currentPrice)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Price Reference Lines */}
          <div className="relative">
            <div 
              className="absolute top-0 bottom-0 w-0.5 z-10"
              style={{ 
                left: `${(valuation.currentPrice / maxValue) * 100}%`,
                backgroundImage: 'repeating-linear-gradient(to bottom, hsl(var(--primary)) 0, hsl(var(--primary)) 4px, transparent 4px, transparent 8px)'
              }}
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <Badge variant="outline" className="text-xs">
                  Current: {formatValue(valuation.currentPrice)}
                </Badge>
              </div>
            </div>

            {/* Intrinsic Value Bars */}
            <div className="space-y-3 mt-8 mb-2">
              {valuation.valuations.map((method, index) => {
                // Use local calculation if available
                const displayMethod = localValuations?.[method.method] || method
                const isLocallyCalculated = localValuations?.[method.method] !== undefined
                
                return (
                  <div 
                    key={index} 
                    className={`space-y-1 cursor-pointer transition-all ${
                      selectedMethod?.method === method.method ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                    }`}
                    onClick={() => {
                      if (method.method !== selectedMethod?.method) {
                        initializedMethodRef.current = null
                      }
                      setSelectedMethod(displayMethod)
                    }}
                  >
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <span className="font-medium min-w-[120px] flex items-center gap-1">
                        {method.method}
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
                      </span>
                    </div>
                    <span className={`font-semibold flex items-center gap-1 ${isLocallyCalculated ? 'text-blue-600' : ''}`}>
                      {formatValue(displayMethod.value)}
                      {isLocallyCalculated && (
                        <span className="text-xs text-blue-500 animate-pulse">●</span>
                      )}
                    </span>
                  </div>
                  <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                      style={{ 
                        width: getBarWidth(displayMethod.value),
                        backgroundColor: displayMethod.color || method.color
                      }}
                    />
                  </div>
                </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right Column - Calculation Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              <CardTitle>Calculation Details</CardTitle>
            </div>
          </div>
          <div className="mt-1">
            <Badge variant="secondary" className="text-sm font-semibold px-3 py-1">
              {selectedMethod ? selectedMethod.method : 'Loading...'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {selectedMethod?.calculationData ? (
            <div className="space-y-6">
              {/* Formula */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Formula</h4>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {selectedMethod.calculationData.formula}
                </code>
              </div>

              {/* Input Values */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Input Values</h4>
                <div className="space-y-1">
                  {Object.entries(selectedMethod.calculationData.inputs)
                    .sort(([keyA, inputA], [keyB, inputB]) => {
                      // Define editable fields
                      const isEditableA = (keyA.includes('Growth Rate') || keyA === 'Discount Rate') && 
                        (selectedMethod.method === 'DFCF-20' || selectedMethod.method === 'DCF-20' || selectedMethod.method === 'DNI-20')
                      const isEditableB = (keyB.includes('Growth Rate') || keyB === 'Discount Rate') && 
                        (selectedMethod.method === 'DFCF-20' || selectedMethod.method === 'DCF-20' || selectedMethod.method === 'DNI-20')
                      
                      // Non-editable fields come first
                      if (!isEditableA && isEditableB) return -1
                      if (isEditableA && !isEditableB) return 1
                      
                      // Within editable fields, group growth rates together
                      if (isEditableA && isEditableB) {
                        // Discount rate comes before growth rates
                        if (keyA === 'Discount Rate' && keyB.includes('Growth Rate')) return -1
                        if (keyA.includes('Growth Rate') && keyB === 'Discount Rate') return 1
                        
                        // Sort growth rates by year
                        if (keyA.includes('Growth Rate') && keyB.includes('Growth Rate')) {
                          if (keyA.includes('1-5')) return -1
                          if (keyB.includes('1-5')) return 1
                          if (keyA.includes('6-10')) return -1
                          if (keyB.includes('6-10')) return 1
                        }
                      }
                      
                      return 0
                    })
                    .map(([key, input], index, array) => {
                      const isGrowthRate = key.includes('Growth Rate')
                      const isDiscountRate = key === 'Discount Rate'
                      const isEditableGrowthRate = (isGrowthRate || isDiscountRate) && 
                        (selectedMethod.method === 'DFCF-20' || selectedMethod.method === 'DCF-20' || selectedMethod.method === 'DNI-20')
                    
                    // Check if this is a missing data field
                    const isMissingData = (
                      (key === 'Operating Cash Flow' && input.value === 0 && selectedMethod.method === 'DCF-20') ||
                      (key === 'Shareholder Equity' && input.value === 0 && selectedMethod.method === 'Mean P/B')
                    )
                    
                    // Special handling for PEG Ratio when earnings growth is missing
                    const isPegRatioMissing = selectedMethod.method === 'PEG Ratio' && 
                      missingFields?.earningsGrowth?.needed && 
                      key === 'Current PEG Ratio'
                    
                    const isEditableInput = isEditableGrowthRate || isMissingData || isPegRatioMissing
                    
                    // Check if this is the first editable field (to add separator)
                    const isFirstEditableField = isEditableGrowthRate && index > 0 && 
                      !array.slice(0, index).some(([k]) => 
                        (k.includes('Growth Rate') || k === 'Discount Rate') && 
                        (selectedMethod.method === 'DFCF-20' || selectedMethod.method === 'DCF-20' || selectedMethod.method === 'DNI-20')
                      )
                    
                    return (
                      <Fragment key={key}>
                        {isFirstEditableField && (
                          <div className="border-t border-muted my-16">
                          </div>
                        )}
                        <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          {isPegRatioMissing ? 'Earnings Growth Rate:' : key}:
                        </span>
                        
                        <div className="flex items-center gap-2">
                          {isEditableInput ? (
                            <Input
                              type="text"
                              className="h-7 w-24 text-right font-mono"
                              placeholder={isMissingData || isPegRatioMissing ? "Enter value" : "0.00"}
                              value={
                                isPegRatioMissing 
                                  ? (manualInputs?.earningsGrowth ? (manualInputs.earningsGrowth * 100).toFixed(2) : '')
                                  : isMissingData 
                                  ? (key === 'Operating Cash Flow' 
                                    ? (manualInputs?.operatingCashflow ? manualInputs.operatingCashflow.toString() : '')
                                    : key === 'Shareholder Equity' 
                                    ? (manualInputs?.shareholderEquity ? manualInputs.shareholderEquity.toString() : '')
                                    : inputValues[key] || '')
                                  : (inputValues[key] || '')
                              }
                              onChange={(e) => {
                                if (isPegRatioMissing) {
                                  const value = parseFloat(e.target.value) / 100 || undefined
                                  if (onManualInputChange) {
                                    onManualInputChange({ ...manualInputs, earningsGrowth: value })
                                  }
                                } else if (isMissingData) {
                                  const value = parseFloat(e.target.value) || undefined
                                  if (key === 'Operating Cash Flow' && onManualInputChange) {
                                    onManualInputChange({ ...manualInputs, operatingCashflow: value })
                                  } else if (key === 'Shareholder Equity' && onManualInputChange) {
                                    onManualInputChange({ ...manualInputs, shareholderEquity: value })
                                  }
                                } else {
                                  handleInputChange(key, e.target.value)
                                }
                              }}
                              onBlur={() => {
                                if (isEditableGrowthRate && !isMissingData && !isPegRatioMissing) {
                                  if (key === 'Growth Rate (Year 1-5)') handleInputBlur(key, 'growthRate1to5')
                                  else if (key === 'Growth Rate (Year 6-10)') handleInputBlur(key, 'growthRate6to10')
                                  else if (key === 'Growth Rate (Year 11-20)') handleInputBlur(key, 'growthRate11to20')
                                  else if (key === 'Discount Rate') handleInputBlur(key, 'discountRate')
                                }
                              }}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  // Since we update in real-time, blur will trigger save to server
                                  e.currentTarget.blur()
                                }
                              }}
                            />
                          ) : (
                            <span className="font-mono">
                              {key === 'Free Cash Flow' && typeof input.value === 'number' && input.value >= 1000000
                                ? `$${(input.value / 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 })}M`
                                : key === 'Total Debt' && typeof input.value === 'number' && input.value >= 1000000
                                ? `$${(input.value / 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 })}M`
                                : key === 'Cash & ST Investments' && typeof input.value === 'number' && input.value >= 1000000
                                ? `$${(input.value / 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 })}M`
                                : key === 'Shares Outstanding' && typeof input.value === 'number' && input.value >= 1000000
                                ? `${(input.value / 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 })}M`
                                : typeof input.value === 'number' && input.value >= 1000000
                                ? `$${(input.value / 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 })}M`
                                : typeof input.value === 'number' && input.value > 1000
                                ? input.value.toLocaleString('en-US', { maximumFractionDigits: 0 })
                                : typeof input.value === 'number' && input.value < 1
                                ? `${(input.value * 100).toFixed(2)}%`
                                : input.value}
                            </span>
                          )}
                          {isEditableGrowthRate && <span className="text-xs text-muted-foreground">%</span>}
                          {(input.source === 'yahoo-finance' || (input.source === 'calculated' && !isGrowthRate && !isDiscountRate)) && (
                            <Badge variant={
                              input.source === 'yahoo-finance' ? 'default' : 'secondary'
                            } className="text-xs px-1 py-0">
                              {input.source === 'yahoo-finance' ? 'Yahoo' : 'Calc'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      </Fragment>
                    )
                  })}
                </div>
                
                {/* Additional manual inputs for PEG when earnings growth is missing */}
                {selectedMethod.method === 'PEG Ratio' && missingFields?.earningsGrowth?.needed && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded-md">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Earnings Growth Rate (Manual):</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          className="h-7 w-24 text-right font-mono"
                          placeholder="0.00"
                          value={manualInputs?.earningsGrowth ? (manualInputs.earningsGrowth * 100).toFixed(2) : ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) / 100 || undefined
                            if (onManualInputChange) {
                              onManualInputChange({ ...manualInputs, earningsGrowth: value })
                            }
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur()
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                        <Badge variant="destructive" className="text-xs px-1 py-0">
                          Manual
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                      Enter earnings growth rate to calculate PEG ratio
                    </p>
                  </div>
                )}
              </div>

              {/* Calculation Steps */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Calculation Steps</h4>
                <div className="space-y-3">
                  {selectedMethod.calculationData.steps.map((step, index) => (
                    <div key={index} className="border-l-2 border-muted pl-4">
                      <p className="text-sm font-medium">{step.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.calculation}
                      </p>
                      <p className="text-sm font-mono mt-1">
                        = {formatValue(step.result)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Result */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Intrinsic Value:</span>
                  <span className="text-xl font-bold">{formatValue(selectedMethod.value)}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-muted-foreground">Current Price:</span>
                  <span className="text-sm">{formatValue(valuation.currentPrice)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-muted-foreground">Upside/Downside:</span>
                  <span className={`text-sm font-medium ${
                    selectedMethod.value > valuation.currentPrice ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {((selectedMethod.value - valuation.currentPrice) / valuation.currentPrice * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {selectedMethod ? (
                <p>Calculation details not available for this method yet.</p>
              ) : (
                <p>Loading calculation details...</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
