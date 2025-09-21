'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  IncomeStatementData, 
  BalanceSheetData, 
  CashFlowStatementData,
  FinancialStatements 
} from '@/types/stock'
import { 
  formatFinancialNumber, 
  formatFinancialDate,
  calculateYoYGrowth,
  getValueColorClass,
  formatLineItemName
} from '@/lib/utils/financial-formatting'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface FinancialStatementTableProps {
  statements: FinancialStatements | null
  loading?: boolean
}

// Define the order and grouping of line items for each statement
const INCOME_STATEMENT_ITEMS = [
  { key: 'revenue', label: 'Revenue', group: 'Revenue' },
  { key: 'costOfRevenue', label: 'Cost of Revenue', group: 'Revenue' },
  { key: 'grossProfit', label: 'Gross Profit', group: 'Revenue', bold: true },
  
  { key: 'operatingExpenses', label: 'Operating Expenses', group: 'Operating' },
  { key: 'sellingGeneralAdministrative', label: 'SG&A', group: 'Operating' },
  { key: 'researchDevelopment', label: 'R&D', group: 'Operating' },
  { key: 'operatingIncome', label: 'Operating Income', group: 'Operating', bold: true },
  
  { key: 'interestExpense', label: 'Interest Expense', group: 'Other' },
  { key: 'otherNonOperatingIncome', label: 'Other Income', group: 'Other' },
  { key: 'incomeBeforeTax', label: 'Income Before Tax', group: 'Other' },
  { key: 'incomeTaxExpense', label: 'Income Tax', group: 'Other' },
  { key: 'netIncome', label: 'Net Income', group: 'Other', bold: true },
  
  { key: 'eps', label: 'EPS (Basic)', group: 'Per Share' },
  { key: 'epsDiluted', label: 'EPS (Diluted)', group: 'Per Share' },
]

const BALANCE_SHEET_ITEMS = [
  // Assets
  { key: 'totalAssets', label: 'Total Assets', group: 'Assets', bold: true },
  { key: 'currentAssets', label: 'Total Current Assets', group: 'Assets' },
  { key: 'totalNonCurrentAssets', label: 'Total Non Current Assets', group: 'Assets', calculated: true },
  
  // Liabilities
  { key: 'totalLiabilities', label: 'Total Liabilities', group: 'Liabilities', bold: true },
  { key: 'currentLiabilities', label: 'Total Current Liabilities', group: 'Liabilities' },
  { key: 'totalNonCurrentLiabilities', label: 'Total Non Current Liabilities', group: 'Liabilities', calculated: true },
  
  // Equity
  { key: 'totalShareholderEquity', label: 'Total Equity', group: 'Equity', bold: true },
  { key: 'totalStockholdersEquity', label: 'Total Stockholders Equity', group: 'Equity' },
  { key: 'minorityInterest', label: 'Minority Interest', group: 'Equity' },
  { key: 'totalLiabilitiesAndEquity', label: 'Total Liabilities & Shareholders Equity', group: 'Equity', bold: true, calculated: true },
  
  // Shares Outstanding
  { key: 'sharesOutstanding', label: 'Total Common Shares Outstanding', group: 'Shares' },
  { key: 'preferredSharesOutstanding', label: 'Total Preferred Shares Outstanding', group: 'Shares' },
]

const CASH_FLOW_ITEMS = [
  // Operating Activities
  { key: 'operatingCashFlow', label: 'Cash from Operating Activities', group: 'Operating', bold: true },
  { key: 'netIncome', label: 'Net Income', group: 'Operating' },
  { key: 'depreciation', label: 'Depreciation/Depletion & Amortization', group: 'Operating' },
  { key: 'deferredTaxes', label: 'Deferred Taxes', group: 'Operating', calculated: true },
  { key: 'nonCashItems', label: 'Non-Cash Items', group: 'Operating', calculated: true },
  { key: 'changeInWorkingCapital', label: 'Changes in Working Capital', group: 'Operating' },
  
  // Investing Activities
  { key: 'investingCashFlow', label: 'Cash from Investing Activities', group: 'Investing', bold: true },
  { key: 'capitalExpenditures', label: 'Capital Expenditures', group: 'Investing' },
  { key: 'otherInvestingTotal', label: 'Other Investing Cash Flow Items, Total', group: 'Investing', calculated: true },
  
  // Financing Activities
  { key: 'financingCashFlow', label: 'Cash from Financing Activities', group: 'Financing', bold: true },
  { key: 'financingCashFlowItems', label: 'Financing Cash Flow Items', group: 'Financing', calculated: true },
  { key: 'dividendsPaid', label: 'Total Cash Dividends Paid', group: 'Financing' },
  { key: 'stockNetIssuance', label: 'Issuance (Retirement) of Stock, Net', group: 'Financing', calculated: true },
  { key: 'debtNetIssuance', label: 'Issuance (Retirement) of Debt, Net', group: 'Financing', calculated: true },
  
  // Other
  { key: 'foreignExchangeEffects', label: 'Foreign Exchange Effects', group: 'Other', calculated: true },
  { key: 'netChangeInCash', label: 'Net Change in Cash', group: 'Other', bold: true },
  { key: 'cashInterestPaid', label: 'Cash Interest Paid', group: 'Other', calculated: true },
  { key: 'cashTaxesPaid', label: 'Cash Taxes Paid', group: 'Other', calculated: true },
]

export function FinancialStatementTable({ statements, loading }: FinancialStatementTableProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'annual' | 'quarterly'>('annual')
  const [selectedStatement, setSelectedStatement] = useState<'income' | 'balance' | 'cashflow'>('income')

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!statements) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No financial statement data available</p>
        </CardContent>
      </Card>
    )
  }

  const renderStatement = () => {
    switch (selectedStatement) {
      case 'income':
        return renderIncomeStatement()
      case 'balance':
        return renderBalanceSheet()
      case 'cashflow':
        return renderCashFlowStatement()
    }
  }

  const renderIncomeStatement = () => {
    const data = selectedPeriod === 'annual' 
      ? statements.incomeStatements.annual 
      : statements.incomeStatements.quarterly
    
    // Only show TTM for annual view, not quarterly
    const ttmData = selectedPeriod === 'annual' ? statements.incomeStatements.ttm : undefined
    
    // Log quarterly data for Q4 comparison
    if (selectedPeriod === 'quarterly' && data) {
      console.log('[FinancialStatementTable] Quarterly income data:')
      data.slice(0, 5).forEach((q: any) => {
        const revenueInB = q.revenue ? (q.revenue / 1e9).toFixed(2) : '0'
        console.log(`  Q${q.fiscalQuarter} ${q.fiscalYear}: Revenue=$${revenueInB}B (${q.revenue})`)
      })
      
      // Check Q4 values specifically
      const q4Data = data.filter((q: any) => q.fiscalQuarter === 4).slice(0, 3)
      console.log('[FinancialStatementTable] Q4 revenue values:')
      q4Data.forEach((q: any) => {
        const revenueInB = q.revenue ? (q.revenue / 1e9).toFixed(2) : '0'
        console.log(`  Q4 ${q.fiscalYear}: Revenue=$${revenueInB}B`)
      })
    }

    return renderStatementTable(data, INCOME_STATEMENT_ITEMS, ttmData)
  }

  const renderBalanceSheet = () => {
    const data = selectedPeriod === 'annual' 
      ? statements.balanceSheets.annual 
      : statements.balanceSheets.quarterly

    return renderStatementTable(data, BALANCE_SHEET_ITEMS)
  }

  const renderCashFlowStatement = () => {
    const data = selectedPeriod === 'annual' 
      ? statements.cashFlowStatements.annual 
      : statements.cashFlowStatements.quarterly
    
    // Only show TTM for annual view, not quarterly
    const ttmData = selectedPeriod === 'annual' ? statements.cashFlowStatements.ttm : undefined

    return renderStatementTable(data, CASH_FLOW_ITEMS, ttmData)
  }

  const renderStatementTable = (
    data: any[], 
    items: any[], 
    ttmData?: any
  ) => {
    const isAnnual = selectedPeriod === 'annual'
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No data available for this period</p>
        </div>
      )
    }

    // Remove duplicates based on formatted date
    const uniquePeriodsMap = new Map<string, any>()
    
    // Process all data to remove duplicates
    data.forEach(period => {
      const periodLabel = formatFinancialDate(period.date, period.fiscalQuarter, period.fiscalYear, isAnnual)
      
      if (!uniquePeriodsMap.has(periodLabel)) {
        uniquePeriodsMap.set(periodLabel, period)
      } else {
        // If duplicate found, keep the one with more data
        const existing = uniquePeriodsMap.get(periodLabel)
        const existingDataCount = Object.values(existing)
          .filter(v => v !== null && v !== undefined).length
        const newDataCount = Object.values(period)
          .filter(v => v !== null && v !== undefined).length
        
        if (newDataCount > existingDataCount) {
          uniquePeriodsMap.set(periodLabel, period)
        }
      }
    })
    
    // Convert map back to array and sort by date (newest first)
    const uniquePeriods = Array.from(uniquePeriodsMap.values())
      .sort((a, b) => {
        const dateA = new Date(a.date)
        const dateB = new Date(b.date)
        return dateB.getTime() - dateA.getTime() // Sort descending (newest first)
      })
    
    
    // Show more periods - up to 8 for annual view and 20 for quarterly (5 years)
    const maxPeriods = isAnnual ? 8 : 20
    const displayData = uniquePeriods.slice(0, maxPeriods)
    
    // Filter items to only show those with at least some data
    const itemsWithData = items.filter(item => {
      // Check if any period has data for this field
      return displayData.some(period => period[item.key] !== null) || 
             (ttmData && ttmData[item.key] !== null)
    })
    
    if (itemsWithData.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No detailed data available for this reporting period.
          </p>
        </div>
      )
    }
    
    let currentGroup = ''

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Item</TableHead>
              {ttmData && (
                <TableHead className="text-right min-w-[120px]">TTM</TableHead>
              )}
              {displayData.map((period, index) => (
                <TableHead key={index} className="text-right min-w-[120px]">
                  {formatFinancialDate(period.date, period.fiscalQuarter, period.fiscalYear, isAnnual)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsWithData.map((item, index) => {
              const showGroupHeader = item.group !== currentGroup
              currentGroup = item.group

              return (
                <React.Fragment key={`item-${index}-${item.key}`}>
                  {showGroupHeader && (
                    <TableRow>
                      <TableCell 
                        colSpan={displayData.length + (ttmData ? 2 : 1)} 
                        className="font-semibold text-sm text-muted-foreground bg-muted/30"
                      >
                        {item.group}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className={`sticky left-0 bg-background z-10 ${item.bold ? 'font-semibold' : ''}`}>
                      {item.label}
                    </TableCell>
                    {ttmData && (
                      <TableCell className={`text-right ${item.bold ? 'font-semibold' : ''}`}>
                        {formatValue(getFieldValue(ttmData, item), item.key)}
                      </TableCell>
                    )}
                    {displayData.map((period, periodIndex) => {
                      const value = getFieldValue(period, item)
                      const previousValue = getFieldValue(displayData[periodIndex + 1], item)
                      const yoyGrowth = calculateYoYGrowth(value, previousValue)

                      return (
                        <TableCell 
                          key={periodIndex} 
                          className={`text-right ${item.bold ? 'font-semibold' : ''}`}
                        >
                          <div>
                            {formatValue(value, item.key)}
                            {yoyGrowth !== null && Math.abs(yoyGrowth) > 0.1 && (
                              <div className={`text-xs ${getValueColorClass(yoyGrowth)}`}>
                                {yoyGrowth > 0 ? '+' : ''}{yoyGrowth.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  const getFieldValue = (period: any, item: any) => {
    if (!period || !item) return null
    
    // Handle calculated fields
    if (item.calculated) {
      switch (item.key) {
        // Balance Sheet calculations
        case 'totalNonCurrentAssets':
          return (period.totalAssets || 0) - (period.currentAssets || 0)
        case 'totalNonCurrentLiabilities':
          return (period.totalLiabilities || 0) - (period.currentLiabilities || 0)
        case 'totalLiabilitiesAndEquity':
          return period.totalAssets // Assets = Liabilities + Equity
        case 'totalStockholdersEquity':
          return period.totalShareholderEquity // Same value, different label
          
        // Cash Flow calculations
        case 'deferredTaxes':
          return period.deferredIncomeTaxes
        case 'nonCashItems':
          // Sum of stock-based comp and other non-cash items
          return (period.stockBasedCompensation || 0) + (period.otherOperatingActivities || 0)
        case 'otherInvestingTotal':
          // Sum of investments, acquisitions, and other investing activities
          return (period.investments || 0) + (period.acquisitionsNet || 0) + (period.otherInvestingActivities || 0)
        case 'financingCashFlowItems':
          return period.otherFinancingActivities
        case 'stockNetIssuance':
          // Stock repurchases are negative, so negate to get net issuance
          return period.stockRepurchased ? -period.stockRepurchased : null
        case 'debtNetIssuance':
          // Net of issuance minus repayment
          return (period.debtIssuance || 0) - (period.debtRepayment || 0)
        case 'foreignExchangeEffects':
          return period.foreignCurrencyEffect
        case 'cashInterestPaid':
          return period.cashInterestPaid
        case 'cashTaxesPaid':
          return period.cashTaxesPaid
          
        default:
          return null
      }
    }
    
    return period[item.key]
  }

  const formatValue = (value: any, key: string) => {
    if (key === 'eps' || key === 'epsDiluted') {
      return value !== null ? `$${value.toFixed(2)}` : '-'
    }
    // Format shares as count in billions
    if (key === 'sharesOutstanding' || key === 'sharesOutstandingDiluted' || key === 'preferredSharesOutstanding') {
      if (value === null) return '-'
      return (value / 1000000000).toFixed(2) + 'B'
    }
    return formatFinancialNumber(value)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Financial Statements</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedPeriod === 'annual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('annual')}
            >
              Annual
            </Button>
            <Button
              variant={selectedPeriod === 'quarterly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('quarterly')}
            >
              Quarterly
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* SEC EDGAR Data Source Notice */}
        {statements && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>Data Source:</strong> Financial statements from SEC EDGAR filings
            </p>
          </div>
        )}
        
        <Tabs value={selectedStatement} onValueChange={(v) => setSelectedStatement(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="income">Income Statement</TabsTrigger>
            <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          </TabsList>
          <TabsContent value={selectedStatement} className="mt-4">
            {renderStatement()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
