import { IncomeStatementData, BalanceSheetData, CashFlowStatementData } from '@/types/stock'

export interface SECFactValue {
  start?: string
  end: string
  val: number
  fy: number
  fp: string
  form: string
  filed: string
  frame?: string
}

export interface SECFact {
  label: string
  description: string
  units: {
    USD?: SECFactValue[]
    shares?: SECFactValue[]
  }
}

export class SECEdgarHelpers {
  /**
   * Extract income statement data from SEC facts
   */
  static extractIncomeStatements(facts: Record<string, SECFact>) {
    const annual: IncomeStatementData[] = []
    const quarterly: IncomeStatementData[] = []

    // Get revenue data from all possible tags and combine them
    // Include bank-specific revenue fields
    const revenueFields = [
      // Standard revenue fields
      facts.RevenueFromContractWithCustomerExcludingAssessedTax?.units?.USD || [],
      facts.Revenues?.units?.USD || [],
      facts.SalesRevenueNet?.units?.USD || [],
      // Bank-specific revenue fields
      facts.InterestAndDividendIncomeOperating?.units?.USD || [],
      facts.InterestIncomeOperating?.units?.USD || [],
      facts.NoninterestIncome?.units?.USD || [],
      facts.RevenuesNetOfInterestExpense?.units?.USD || []
    ]

    // Process each revenue field
    revenueFields.forEach(revenueData => {
      revenueData.forEach(entry => {
        // Annual: 10-K forms (with or without frame)
        if (entry.form === '10-K') {
          annual.push(this.createIncomeStatement(facts, entry, 'FY'))
        } 
        // Quarterly: 10-Q forms
        else if (entry.form === '10-Q') {
          quarterly.push(this.createIncomeStatement(facts, entry, entry.fp))
        }
      })
    })

    // Remove duplicates based on fiscal year
    const annualMap = new Map<number, IncomeStatementData>()
    annual.forEach(stmt => {
      const year = stmt.fiscalYear
      if (year && (!annualMap.has(year) || new Date(stmt.date) > new Date(annualMap.get(year)!.date))) {
        annualMap.set(year, stmt)
      }
    })
    
    const uniqueAnnual = Array.from(annualMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    // Remove quarterly entries where the quarter doesn't match the expected quarter based on date
    const cleanedQuarterly = quarterly.filter(q => {
      if (!q.date || !q.fiscalQuarter) return true
      const month = new Date(q.date).getMonth() + 1 // 1-12
      const expectedQuarter = Math.ceil(month / 3) // 1-4
      return q.fiscalQuarter === expectedQuarter
    })
    
    // Remove duplicates based on date (keep the first one)
    const quarterlyMap = new Map<string, IncomeStatementData>()
    cleanedQuarterly.forEach(stmt => {
      const dateKey = stmt.date.toString().substring(0, 10) // YYYY-MM-DD
      if (!quarterlyMap.has(dateKey)) {
        quarterlyMap.set(dateKey, stmt)
      }
    })
    
    const dedupedQuarterly = Array.from(quarterlyMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Convert YTD to quarterly values for income statements FIRST (like cash flow does)
    const quarterlyValues = this.convertIncomeStatementYTDToQuarterly(dedupedQuarterly)
    
    // Then calculate Q4 data using the converted quarterly values
    const enhancedQuarterly = this.calculateQ4Data(uniqueAnnual, quarterlyValues)
    
    return { 
      annual: uniqueAnnual.slice(0, 10), // Last 10 years
      quarterly: enhancedQuarterly.slice(0, 20) // Last 20 quarters (5 years)
    }
  }

  /**
   * Create income statement from SEC facts
   */
  static createIncomeStatement(
    facts: Record<string, SECFact>, 
    periodData: SECFactValue,
    period: string
  ): IncomeStatementData {
    const endDate = periodData.end
    // Convert date to ISO format with timezone
    const isoDate = new Date(endDate + 'T00:00:00.000Z').toISOString()
    
    // For quarterly data, we need to pass additional context to getFactValue
    const isQuarterly = period !== 'FY'
    const context = isQuarterly ? { frame: periodData.frame, start: periodData.start } : undefined
    
    // For quarterly data, use the calendar year from the date, not the fiscal year
    // This fixes issues where Q1/Q2 are assigned to the wrong fiscal year
    const calendarYear = new Date(endDate).getFullYear()
    const useCalendarYear = isQuarterly

    return {
      date: isoDate,
      endDate: isoDate,
      fiscalYear: useCalendarYear ? calendarYear : periodData.fy,
      fiscalQuarter: period === 'FY' ? undefined : parseInt(period.replace('Q', '')) || undefined,
      
      // Revenue - includes bank-specific fields
      revenue: this.getFactValue(facts, [
        // Standard revenue fields
        'RevenueFromContractWithCustomerExcludingAssessedTax', 
        'Revenues', 
        'SalesRevenueNet',
        // Bank-specific revenue fields
        'InterestAndDividendIncomeOperating',
        'InterestIncomeOperating',
        'NoninterestIncome',
        'RevenuesNetOfInterestExpense'
      ], endDate, 'USD', context),
      // Cost of Revenue - includes bank-specific interest expense
      costOfRevenue: this.getFactValue(facts, [
        // Standard cost fields
        'CostOfGoodsAndServicesSold', 
        'CostOfRevenue', 
        'CostOfGoodsSold',
        // Bank-specific cost fields (interest expense is their main cost)
        'InterestExpense',
        'InterestExpenseOperating'
      ], endDate, 'USD', context),
      grossProfit: this.getFactValue(facts, ['GrossProfit'], endDate, 'USD', context),
      
      // Operating Expenses - includes bank-specific fields
      operatingExpenses: this.getFactValue(facts, [
        'OperatingExpenses',
        // Bank-specific operating expense fields
        'NoninterestExpense',
        'NoninterestExpenseTotal'
      ], endDate, 'USD', context),
      sellingGeneralAdministrative: this.getFactValue(facts, [
        'SellingGeneralAndAdministrativeExpense',
        // Bank-specific fields
        'PersonnelExpenses',
        'EmployeeBenefitsAndCompensation'
      ], endDate, 'USD', context),
      researchDevelopment: this.getFactValue(facts, ['ResearchAndDevelopmentExpense'], endDate, 'USD', context),
      otherOperatingExpenses: null,
      
      // Operating Income - includes bank-specific fields
      operatingIncome: this.getFactValue(facts, [
        'OperatingIncomeLoss',
        // Bank-specific fields
        'IncomeFromContinuingOperationsBeforeIncomeTaxes',
        'PreTaxIncome'
      ], endDate, 'USD', context),
      
      // Other Income/Expense
      interestExpense: this.getFactValue(facts, ['InterestExpense'], endDate, 'USD', context),
      interestIncome: this.getFactValue(facts, ['InvestmentIncomeInterest'], endDate, 'USD', context),
      otherNonOperatingIncome: this.getFactValue(facts, ['NonoperatingIncomeExpense'], endDate, 'USD', context),
      
      // Pre-tax Income
      incomeBeforeTax: this.getFactValue(facts, ['IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest'], endDate, 'USD', context),
      incomeTaxExpense: this.getFactValue(facts, ['IncomeTaxExpenseBenefit'], endDate, 'USD', context),
      
      // Net Income - includes bank-specific fields
      netIncome: this.getFactValue(facts, [
        'NetIncomeLoss',
        // Bank-specific fields
        'NetIncomeLossAvailableToCommonStockholdersBasic',
        'NetIncomeLossAttributableToParent'
      ], endDate, 'USD', context),
      netIncomeFromContinuingOps: this.getFactValue(facts, [
        'IncomeLossFromContinuingOperations',
        'IncomeLossFromContinuingOperationsIncludingPortionAttributableToNoncontrollingInterest'
      ], endDate, 'USD', context),
      
      // Per Share Data
      eps: this.getFactValue(facts, ['EarningsPerShareBasic'], endDate, 'USD', context),
      epsDiluted: this.getFactValue(facts, ['EarningsPerShareDiluted'], endDate, 'USD', context),
      
      // Additional Items
      ebit: null,
      ebitda: null,
      exceptionalItems: null
    }
  }

  /**
   * Extract balance sheet data from SEC facts
   */
  static extractBalanceSheets(facts: Record<string, SECFact>) {
    const annual: BalanceSheetData[] = []
    const quarterly: BalanceSheetData[] = []

    // Get assets data as reference for periods
    const assets = facts.Assets?.units?.USD || []

    assets.forEach(entry => {
      if (entry.form === '10-K') {
        annual.push(this.createBalanceSheet(facts, entry, 'FY'))
      } else if (entry.form === '10-Q') {
        quarterly.push(this.createBalanceSheet(facts, entry, entry.fp))
      }
    })

    // Remove duplicates based on fiscal year
    const annualMap = new Map<number, BalanceSheetData>()
    annual.forEach(stmt => {
      const year = stmt.fiscalYear
      if (year && (!annualMap.has(year) || new Date(stmt.date) > new Date(annualMap.get(year)!.date))) {
        annualMap.set(year, stmt)
      }
    })
    
    const uniqueAnnual = Array.from(annualMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    // Remove quarterly entries where the quarter doesn't match the expected quarter based on date
    const cleanedQuarterly = quarterly.filter(q => {
      if (!q.date || !q.fiscalQuarter) return true
      const month = new Date(q.date).getMonth() + 1 // 1-12
      const expectedQuarter = Math.ceil(month / 3) // 1-4
      return q.fiscalQuarter === expectedQuarter
    })
    
    // Remove duplicates based on date (keep the first one)
    const quarterlyMap = new Map<string, BalanceSheetData>()
    cleanedQuarterly.forEach(stmt => {
      const dateKey = stmt.date.toString().substring(0, 10) // YYYY-MM-DD
      if (!quarterlyMap.has(dateKey)) {
        quarterlyMap.set(dateKey, stmt)
      }
    })
    
    const dedupedQuarterly = Array.from(quarterlyMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // For balance sheets, Q4 is typically the same as annual (no calculation needed)
    // But we need to add Q4 entries where they're missing
    const enhancedQuarterly = this.addQ4BalanceSheets(uniqueAnnual, dedupedQuarterly)
    
    return { 
      annual: uniqueAnnual.slice(0, 10), // Last 10 years
      quarterly: enhancedQuarterly.slice(0, 20) // Last 20 quarters
    }
  }

  /**
   * Create balance sheet from SEC facts
   */
  static createBalanceSheet(
    facts: Record<string, SECFact>, 
    periodData: SECFactValue,
    period: string
  ): BalanceSheetData {
    const date = periodData.end
    const isoDate = new Date(date + 'T00:00:00.000Z').toISOString()
    
    // For quarterly data, use the calendar year from the date
    const calendarYear = new Date(date).getFullYear()
    const useCalendarYear = period !== 'FY'

    return {
      date: isoDate,
      endDate: isoDate,
      fiscalYear: useCalendarYear ? calendarYear : periodData.fy,
      fiscalQuarter: period === 'FY' ? undefined : parseInt(period.replace('Q', '')) || undefined,
      
      // Assets - includes bank-specific fields
      totalAssets: this.getFactValue(facts, [
        'Assets',
        // Bank-specific fields
        'AssetsNet'
      ], date),
      currentAssets: this.getFactValue(facts, [
        'AssetsCurrent',
        // Banks may not have traditional current assets
        'CashAndDueFromBanks'
      ], date),
      cashAndCashEquivalents: this.getFactValue(facts, [
        'CashAndCashEquivalentsAtCarryingValue',
        // Bank-specific fields
        'CashAndDueFromBanks',
        'CashAndBalancesDueFromDepositoryInstitutions'
      ], date),
      cashAndShortTermInvestments: this.getFactValue(facts, ['CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'], date),
      netReceivables: this.getFactValue(facts, ['AccountsReceivableNetCurrent'], date),
      inventory: this.getFactValue(facts, ['InventoryNet'], date),
      otherCurrentAssets: this.getFactValue(facts, [
        'OtherAssetsCurrent',
        // Bank-specific assets
        'LoansAndLeasesReceivableNetOfAllowanceForCreditLosses',
        'LoansAndLeasesReceivableNetReportedAmount'
      ], date),
      
      // Non-current Assets
      propertyPlantEquipment: this.getFactValue(facts, ['PropertyPlantAndEquipmentNet'], date),
      goodwill: this.getFactValue(facts, ['Goodwill'], date),
      intangibleAssets: this.getFactValue(facts, ['IntangibleAssetsNetExcludingGoodwill'], date),
      longTermInvestments: this.getFactValue(facts, ['LongTermInvestments'], date),
      otherNonCurrentAssets: this.getFactValue(facts, ['OtherAssetsNoncurrent'], date),
      
      // Liabilities - includes bank-specific fields
      totalLiabilities: this.getFactValue(facts, [
        'Liabilities',
        // Bank-specific fields
        'LiabilitiesAndStockholdersEquity'
      ], date),
      currentLiabilities: this.getFactValue(facts, [
        'LiabilitiesCurrent',
        // Bank-specific fields (deposits are their main liability)
        'Deposits',
        'DepositsTotal'
      ], date),
      accountsPayable: this.getFactValue(facts, ['AccountsPayableCurrent'], date),
      shortTermDebt: this.getFactValue(facts, ['ShortTermBorrowings'], date),
      currentPortionLongTermDebt: this.getFactValue(facts, ['LongTermDebtCurrent'], date),
      otherCurrentLiabilities: this.getFactValue(facts, ['OtherLiabilitiesCurrent'], date),
      
      // Non-current Liabilities
      longTermDebt: this.getFactValue(facts, ['LongTermDebtNoncurrent'], date),
      deferredTaxLiabilities: this.getFactValue(facts, ['DeferredTaxLiabilitiesNoncurrent'], date),
      otherNonCurrentLiabilities: this.getFactValue(facts, ['OtherLiabilitiesNoncurrent'], date),
      
      // Equity
      totalShareholderEquity: this.getFactValue(facts, ['StockholdersEquity'], date),
      commonStock: this.getFactValue(facts, ['CommonStockValue'], date),
      retainedEarnings: this.getFactValue(facts, ['RetainedEarningsAccumulatedDeficit'], date),
      treasuryStock: this.getFactValue(facts, ['TreasuryStockValue'], date),
      otherShareholderEquity: null,
      minorityInterest: this.getFactValue(facts, [
        'MinorityInterest',
        'NoncontrollingInterestInSubsidiaries',
        'RedeemableNoncontrollingInterestEquityCarryingAmount'
      ], date),
      
      // Shares
      sharesOutstanding: this.getFactValue(facts, [
        'WeightedAverageNumberOfSharesOutstandingBasic',
        'CommonStockSharesOutstanding',
        'EntityCommonStockSharesOutstanding'
      ], date, 'shares'),
      sharesOutstandingDiluted: this.getFactValue(facts, [
        'WeightedAverageNumberOfDilutedSharesOutstanding',
        'CommonStockSharesOutstandingIncludingDilutiveEffect'
      ], date, 'shares'),
      preferredSharesOutstanding: this.getFactValue(facts, [
        'PreferredStockSharesOutstanding',
        'PreferredStockSharesIssued'
      ], date, 'shares')
    }
  }

  /**
   * Extract cash flow statement data from SEC facts
   */
  static extractCashFlowStatements(facts: Record<string, SECFact>) {
    const annual: CashFlowStatementData[] = []
    const quarterly: CashFlowStatementData[] = []

    // Get operating cash flow as reference
    const operatingCF = facts.NetCashProvidedByUsedInOperatingActivities?.units?.USD || []

    operatingCF.forEach(entry => {
      if (entry.form === '10-K') {
        annual.push(this.createCashFlowStatement(facts, entry, 'FY'))
      } else if (entry.form === '10-Q') {
        quarterly.push(this.createCashFlowStatement(facts, entry, entry.fp))
      }
    })

    // Remove duplicates based on fiscal year
    const annualMap = new Map<number, CashFlowStatementData>()
    annual.forEach(stmt => {
      const year = stmt.fiscalYear
      if (year && (!annualMap.has(year) || new Date(stmt.date) > new Date(annualMap.get(year)!.date))) {
        annualMap.set(year, stmt)
      }
    })
    
    const uniqueAnnual = Array.from(annualMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    // Remove quarterly entries where the quarter doesn't match the expected quarter based on date
    const cleanedQuarterly = quarterly.filter(q => {
      if (!q.date || !q.fiscalQuarter) return true
      const month = new Date(q.date).getMonth() + 1 // 1-12
      const expectedQuarter = Math.ceil(month / 3) // 1-4
      return q.fiscalQuarter === expectedQuarter
    })
    
    // Remove duplicates based on date (keep the first one)
    const quarterlyMap = new Map<string, CashFlowStatementData>()
    cleanedQuarterly.forEach(stmt => {
      const dateKey = stmt.date.toString().substring(0, 10) // YYYY-MM-DD
      if (!quarterlyMap.has(dateKey)) {
        quarterlyMap.set(dateKey, stmt)
      }
    })
    
    const dedupedQuarterly = Array.from(quarterlyMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Convert YTD to quarterly values for cash flow statements
    const quarterlyValues = this.convertYTDToQuarterly(dedupedQuarterly)
    
    // Calculate Q4 data for cash flow statements
    const enhancedQuarterly = this.calculateQ4CashFlows(uniqueAnnual, quarterlyValues)
    
    return { 
      annual: uniqueAnnual.slice(0, 10), // Last 10 years
      quarterly: enhancedQuarterly.slice(0, 20) // Last 20 quarters
    }
  }

  /**
   * Create cash flow statement from SEC facts
   */
  static createCashFlowStatement(
    facts: Record<string, SECFact>, 
    periodData: SECFactValue,
    period: string
  ): CashFlowStatementData {
    const endDate = periodData.end
    const isoDate = new Date(endDate + 'T00:00:00.000Z').toISOString()
    
    // For quarterly data, we need to pass additional context to getFactValue
    const isQuarterly = period !== 'FY'
    const context = isQuarterly ? { frame: periodData.frame, start: periodData.start } : undefined
    
    // For quarterly data, use the calendar year from the date
    const calendarYear = new Date(endDate).getFullYear()
    const useCalendarYear = isQuarterly

    return {
      date: isoDate,
      endDate: isoDate,
      fiscalYear: useCalendarYear ? calendarYear : periodData.fy,
      fiscalQuarter: period === 'FY' ? undefined : parseInt(period.replace('Q', '')) || undefined,
      
      // Operating Activities - includes bank-specific fields
      operatingCashFlow: this.getFactValue(facts, [
        'NetCashProvidedByUsedInOperatingActivities',
        // Bank-specific fields
        'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations'
      ], endDate, 'USD', context),
      netIncome: this.getFactValue(facts, [
        'NetIncomeLoss',
        // Bank-specific fields
        'NetIncomeLossAvailableToCommonStockholdersBasic',
        'NetIncomeLossAttributableToParent'
      ], endDate, 'USD', context),
      depreciation: this.getFactValue(facts, ['DepreciationDepletionAndAmortization'], endDate, 'USD', context),
      stockBasedCompensation: this.getFactValue(facts, ['ShareBasedCompensation', 'StockBasedCompensation'], endDate, 'USD', context),
      deferredIncomeTaxes: this.getFactValue(facts, [
        'DeferredIncomeTaxExpenseBenefit',
        'DeferredIncomeTaxesAndTaxCredits',
        'IncreaseDecreaseInDeferredIncomeTaxes'
      ], endDate, 'USD', context),
      changeInWorkingCapital: null,
      changeInReceivables: this.getFactValue(facts, ['IncreaseDecreaseInAccountsReceivable'], endDate, 'USD', context),
      changeInInventory: this.getFactValue(facts, ['IncreaseDecreaseInInventories'], endDate, 'USD', context),
      changeInPayables: this.getFactValue(facts, ['IncreaseDecreaseInAccountsPayable'], endDate, 'USD', context),
      otherOperatingActivities: null,
      
      // Investing Activities
      investingCashFlow: this.getFactValue(facts, ['NetCashProvidedByUsedInInvestingActivities'], endDate, 'USD', context),
      capitalExpenditures: this.getFactValue(facts, ['PaymentsToAcquirePropertyPlantAndEquipment'], endDate, 'USD', context),
      investments: null,
      acquisitionsNet: this.getFactValue(facts, ['PaymentsToAcquireBusinessesNetOfCashAcquired'], endDate, 'USD', context),
      otherInvestingActivities: null,
      
      // Financing Activities
      financingCashFlow: this.getFactValue(facts, ['NetCashProvidedByUsedInFinancingActivities'], endDate, 'USD', context),
      dividendsPaid: this.getFactValue(facts, ['PaymentsOfDividendsCommonStock'], endDate, 'USD', context),
      stockRepurchased: this.getFactValue(facts, ['PaymentsForRepurchaseOfCommonStock'], endDate, 'USD', context),
      debtRepayment: this.getFactValue(facts, ['RepaymentsOfLongTermDebt'], endDate, 'USD', context),
      debtIssuance: this.getFactValue(facts, ['ProceedsFromIssuanceOfLongTermDebt'], endDate, 'USD', context),
      otherFinancingActivities: null,
      
      // Net Change
      netChangeInCash: this.getFactValue(facts, [
        'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect',
        'CashAndCashEquivalentsPeriodIncreaseDecrease'
      ], endDate, 'USD', context),
      foreignCurrencyEffect: this.getFactValue(facts, [
        'EffectOfExchangeRateOnCashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents',
        'EffectOfExchangeRateOnCashAndCashEquivalents'
      ], endDate, 'USD', context),
      freeCashFlow: null, // Will be calculated
      
      // Beginning/Ending Cash
      beginCashPosition: null,
      endCashPosition: null,
      
      // Supplemental
      cashInterestPaid: this.getFactValue(facts, ['InterestPaidNet'], endDate, 'USD', context),
      cashTaxesPaid: this.getFactValue(facts, ['IncomeTaxesPaidNet'], endDate, 'USD', context)
    }
  }

  /**
   * Get fact value for a specific date
   */
  static getFactValue(
    facts: Record<string, SECFact>, 
    possibleKeys: string[], 
    date: string,
    unit: 'USD' | 'shares' = 'USD',
    context?: { frame?: string; start?: string }
  ): number | null {
    // Log if we're looking for bank-specific fields
    const bankFields = ['InterestAndDividendIncomeOperating', 'InterestIncomeOperating', 'NoninterestIncome', 'RevenuesNetOfInterestExpense', 'Deposits', 'DepositsTotal']
    const lookingForBankFields = possibleKeys.some(key => bankFields.includes(key))
    
    for (const key of possibleKeys) {
      const fact = facts[key]
      if (!fact || !fact.units[unit]) continue

      // For quarterly data with context, prefer entries with matching frame
      if (context && context.frame) {
        // First try to find an entry with the same frame
        const frameValue = fact.units[unit].find(v => v.end === date && v.frame === context.frame)
        if (frameValue) return frameValue.val
        
        // If no frame match, look for entries with similar 3-month period
        if (context.start) {
          const quarterlyValue = fact.units[unit].find(v => {
            if (v.end !== date) return false
            if (!v.start) return false
            
            // Check if it's approximately a 3-month period
            const startDate = new Date(v.start)
            const endDate = new Date(v.end)
            const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                              (endDate.getMonth() - startDate.getMonth())
            
            return monthsDiff >= 2 && monthsDiff <= 3
          })
          if (quarterlyValue) return quarterlyValue.val
        }
      }
      
      // For annual data or if no quarterly match found, use the original logic
      const value = fact.units[unit].find(v => v.end === date)
      if (value) {
        // Log if we found a bank-specific field
        if (lookingForBankFields && bankFields.includes(key)) {
          console.log(`[SEC] Found bank-specific field: ${key} = ${value.val} for date ${date}`)
        }
        return value.val
      }
    }
    
    // Log if no value found for revenue-related fields
    if (possibleKeys.includes('RevenueFromContractWithCustomerExcludingAssessedTax') && !context) {
      console.log(`[SEC] No revenue value found for ${date}. Available facts:`, Object.keys(facts).filter(k => k.toLowerCase().includes('revenue') || k.toLowerCase().includes('interest')))
    }
    
    return null
  }

  /**
   * Calculate TTM income statement
   */
  static calculateTTMIncomeStatement(quarterly: IncomeStatementData[]): IncomeStatementData | null {
    if (quarterly.length < 4) return null

    const last4Quarters = quarterly.slice(0, 4)
    
    return {
      date: last4Quarters[0].date,
      endDate: last4Quarters[0].endDate,  
      fiscalYear: last4Quarters[0].fiscalYear,
      fiscalQuarter: undefined,
      revenue: this.sumValues(last4Quarters.map(q => q.revenue)),
      costOfRevenue: this.sumValues(last4Quarters.map(q => q.costOfRevenue)),
      grossProfit: this.sumValues(last4Quarters.map(q => q.grossProfit)),
      operatingExpenses: this.sumValues(last4Quarters.map(q => q.operatingExpenses)),
      sellingGeneralAdministrative: this.sumValues(last4Quarters.map(q => q.sellingGeneralAdministrative)),
      researchDevelopment: this.sumValues(last4Quarters.map(q => q.researchDevelopment)),
      otherOperatingExpenses: this.sumValues(last4Quarters.map(q => q.otherOperatingExpenses)),
      operatingIncome: this.sumValues(last4Quarters.map(q => q.operatingIncome)),
      interestExpense: this.sumValues(last4Quarters.map(q => q.interestExpense)),
      interestIncome: this.sumValues(last4Quarters.map(q => q.interestIncome)),
      otherNonOperatingIncome: this.sumValues(last4Quarters.map(q => q.otherNonOperatingIncome)),
      incomeBeforeTax: this.sumValues(last4Quarters.map(q => q.incomeBeforeTax)),
      incomeTaxExpense: this.sumValues(last4Quarters.map(q => q.incomeTaxExpense)),
      netIncome: this.sumValues(last4Quarters.map(q => q.netIncome)),
      netIncomeFromContinuingOps: this.sumValues(last4Quarters.map(q => q.netIncomeFromContinuingOps)),
      eps: this.sumValues(last4Quarters.map(q => q.eps)),
      epsDiluted: this.sumValues(last4Quarters.map(q => q.epsDiluted)),
      ebit: this.sumValues(last4Quarters.map(q => q.ebit)),
      ebitda: this.sumValues(last4Quarters.map(q => q.ebitda)),
      exceptionalItems: this.sumValues(last4Quarters.map(q => q.exceptionalItems))
    }
  }

  /**
   * Calculate TTM cash flow
   */
  static calculateTTMCashFlow(quarterly: CashFlowStatementData[]): CashFlowStatementData | null {
    if (quarterly.length < 4) return null

    const last4Quarters = quarterly.slice(0, 4)
    
    return {
      date: last4Quarters[0].date,
      endDate: last4Quarters[0].endDate,  
      fiscalYear: last4Quarters[0].fiscalYear,
      fiscalQuarter: undefined,
      operatingCashFlow: this.sumValues(last4Quarters.map(q => q.operatingCashFlow)),
      netIncome: this.sumValues(last4Quarters.map(q => q.netIncome)),
      depreciation: this.sumValues(last4Quarters.map(q => q.depreciation)),
      stockBasedCompensation: this.sumValues(last4Quarters.map(q => q.stockBasedCompensation)),
      deferredIncomeTaxes: this.sumValues(last4Quarters.map(q => q.deferredIncomeTaxes)),
      changeInWorkingCapital: this.sumValues(last4Quarters.map(q => q.changeInWorkingCapital)),
      changeInReceivables: this.sumValues(last4Quarters.map(q => q.changeInReceivables)),
      changeInInventory: this.sumValues(last4Quarters.map(q => q.changeInInventory)),
      changeInPayables: this.sumValues(last4Quarters.map(q => q.changeInPayables)),
      otherOperatingActivities: this.sumValues(last4Quarters.map(q => q.otherOperatingActivities)),
      investingCashFlow: this.sumValues(last4Quarters.map(q => q.investingCashFlow)),
      capitalExpenditures: this.sumValues(last4Quarters.map(q => q.capitalExpenditures)),
      investments: this.sumValues(last4Quarters.map(q => q.investments)),
      acquisitionsNet: this.sumValues(last4Quarters.map(q => q.acquisitionsNet)),
      otherInvestingActivities: this.sumValues(last4Quarters.map(q => q.otherInvestingActivities)),
      financingCashFlow: this.sumValues(last4Quarters.map(q => q.financingCashFlow)),
      dividendsPaid: this.sumValues(last4Quarters.map(q => q.dividendsPaid)),
      stockRepurchased: this.sumValues(last4Quarters.map(q => q.stockRepurchased)),
      debtRepayment: this.sumValues(last4Quarters.map(q => q.debtRepayment)),
      debtIssuance: this.sumValues(last4Quarters.map(q => q.debtIssuance)),
      otherFinancingActivities: this.sumValues(last4Quarters.map(q => q.otherFinancingActivities)),
      netChangeInCash: this.sumValues(last4Quarters.map(q => q.netChangeInCash)),
      foreignCurrencyEffect: this.sumValues(last4Quarters.map(q => q.foreignCurrencyEffect)),
      freeCashFlow: this.sumValues(last4Quarters.map(q => q.freeCashFlow)),
      beginCashPosition: last4Quarters[3].beginCashPosition,
      endCashPosition: last4Quarters[0].endCashPosition,
      cashInterestPaid: this.sumValues(last4Quarters.map(q => q.cashInterestPaid)),
      cashTaxesPaid: this.sumValues(last4Quarters.map(q => q.cashTaxesPaid))
    }
  }

  /**
   * Helper to sum values
   */
  private static sumValues(values: (number | null)[]): number | null {
    const validValues = values.filter(v => v !== null) as number[]
    return validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) : null
  }

  /**
   * Calculate Q4 data by subtracting Q1-Q3 from annual totals
   */
  private static calculateQ4Data(
    annual: IncomeStatementData[], 
    quarterly: IncomeStatementData[]
  ): IncomeStatementData[] {
    const result = [...quarterly]
    
    // Group quarterly data by calendar year (based on date, not fiscal year which can be inconsistent)
    const quarterlyByYear = new Map<number, IncomeStatementData[]>()
    quarterly.forEach(q => {
      if (q.date && q.fiscalQuarter && q.fiscalQuarter <= 3) {
        const year = new Date(q.date).getFullYear()
        if (!quarterlyByYear.has(year)) {
          quarterlyByYear.set(year, [])
        }
        quarterlyByYear.get(year)!.push(q)
      }
    })
    
    // For each annual statement, calculate Q4 if we have Q1-Q3
    annual.forEach(annualStmt => {
      const year = annualStmt.fiscalYear
      if (!year || !annualStmt.date) return
      
      // Use calendar year from the annual statement date
      const calendarYear = new Date(annualStmt.date).getFullYear()
      const yearQuarters = quarterlyByYear.get(calendarYear) || []
      const q1 = yearQuarters.find(q => q.fiscalQuarter === 1)
      const q2 = yearQuarters.find(q => q.fiscalQuarter === 2)
      const q3 = yearQuarters.find(q => q.fiscalQuarter === 3)
      
      // Check if Q4 already exists for this year
      const existingQ4 = result.find(q => 
        q.fiscalQuarter === 4 && 
        q.date && 
        new Date(q.date).getFullYear() === calendarYear
      )
      
      // Only calculate Q4 if we have all three quarters and Q4 doesn't already exist
      if (q1 && q2 && q3 && !existingQ4) {
        // Log the calculation for debugging  
        // Note: Q1, Q2, Q3 should be individual quarterly values (already converted from YTD)
        console.log(`[SEC] Calculating Q4 ${calendarYear}:`, {
          annual: annualStmt.revenue,
          q1: q1.revenue,
          q2: q2.revenue,
          q3: q3.revenue,
          calculated_q4: (annualStmt.revenue || 0) - (q1.revenue || 0) - (q2.revenue || 0) - (q3.revenue || 0),
          q1_date: q1.date,
          q2_date: q2.date,
          q3_date: q3.date,
          annual_date: annualStmt.date
        })
        
        // Additional validation logging
        const sumQ123 = (q1.revenue || 0) + (q2.revenue || 0) + (q3.revenue || 0)
        const q4Calc = (annualStmt.revenue || 0) - sumQ123
        console.log(`[SEC] Q4 Validation: Q1+Q2+Q3=${sumQ123}, Annual=${annualStmt.revenue}, Q4=${q4Calc}`)
        
        if (q4Calc < 0) {
          console.warn(`[SEC] WARNING: Negative Q4 revenue calculated for ${calendarYear}! This suggests Q1-Q3 might still be YTD values.`)
        }
        
        // Create Q4 data - Q4 ends on the same date as the annual report
        const q4Date = new Date(annualStmt.date)
        
        const q4: IncomeStatementData = {
          date: q4Date.toISOString(),
          endDate: q4Date.toISOString(),
          fiscalYear: year,
          fiscalQuarter: 4,
          
          // Calculate Q4 values by subtracting Q1+Q2+Q3 from annual
          // Now that quarters are individual values, we need to subtract all three
          revenue: this.subtractQuarters(annualStmt.revenue, [q1.revenue, q2.revenue, q3.revenue]),
          costOfRevenue: this.subtractQuarters(annualStmt.costOfRevenue, [q1.costOfRevenue, q2.costOfRevenue, q3.costOfRevenue]),
          grossProfit: this.subtractQuarters(annualStmt.grossProfit, [q1.grossProfit, q2.grossProfit, q3.grossProfit]),
          
          operatingExpenses: this.subtractQuarters(annualStmt.operatingExpenses, [q1.operatingExpenses, q2.operatingExpenses, q3.operatingExpenses]),
          sellingGeneralAdministrative: this.subtractQuarters(annualStmt.sellingGeneralAdministrative, [q1.sellingGeneralAdministrative, q2.sellingGeneralAdministrative, q3.sellingGeneralAdministrative]),
          researchDevelopment: this.subtractQuarters(annualStmt.researchDevelopment, [q1.researchDevelopment, q2.researchDevelopment, q3.researchDevelopment]),
          otherOperatingExpenses: this.subtractQuarters(annualStmt.otherOperatingExpenses, [q1.otherOperatingExpenses, q2.otherOperatingExpenses, q3.otherOperatingExpenses]),
          
          operatingIncome: this.subtractQuarters(annualStmt.operatingIncome, [q1.operatingIncome, q2.operatingIncome, q3.operatingIncome]),
          interestExpense: this.subtractQuarters(annualStmt.interestExpense, [q1.interestExpense, q2.interestExpense, q3.interestExpense]),
          interestIncome: this.subtractQuarters(annualStmt.interestIncome, [q1.interestIncome, q2.interestIncome, q3.interestIncome]),
          otherNonOperatingIncome: this.subtractQuarters(annualStmt.otherNonOperatingIncome, [q1.otherNonOperatingIncome, q2.otherNonOperatingIncome, q3.otherNonOperatingIncome]),
          
          incomeBeforeTax: this.subtractQuarters(annualStmt.incomeBeforeTax, [q1.incomeBeforeTax, q2.incomeBeforeTax, q3.incomeBeforeTax]),
          incomeTaxExpense: this.subtractQuarters(annualStmt.incomeTaxExpense, [q1.incomeTaxExpense, q2.incomeTaxExpense, q3.incomeTaxExpense]),
          netIncome: this.subtractQuarters(annualStmt.netIncome, [q1.netIncome, q2.netIncome, q3.netIncome]),
          netIncomeFromContinuingOps: this.subtractQuarters(annualStmt.netIncomeFromContinuingOps, [q1.netIncomeFromContinuingOps, q2.netIncomeFromContinuingOps, q3.netIncomeFromContinuingOps]),
          
          // For EPS, take the annual value divided by 4 as approximation
          eps: annualStmt.eps ? annualStmt.eps / 4 : null,
          epsDiluted: annualStmt.epsDiluted ? annualStmt.epsDiluted / 4 : null,
          
          ebit: this.subtractQuarters(annualStmt.ebit, [q1.ebit, q2.ebit, q3.ebit]),
          ebitda: this.subtractQuarters(annualStmt.ebitda, [q1.ebitda, q2.ebitda, q3.ebitda]),
          exceptionalItems: this.subtractQuarters(annualStmt.exceptionalItems, [q1.exceptionalItems, q2.exceptionalItems, q3.exceptionalItems])
        }
        
        result.push(q4)
      }
    })
    
    // Sort by date descending
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    return result
  }

  /**
   * Helper to subtract quarterly values from annual
   */
  private static subtractQuarters(annual: number | null, quarters: (number | null)[]): number | null {
    if (annual === null) return null
    
    const quarterSum = this.sumValues(quarters)
    if (quarterSum === null) return null
    
    return annual - quarterSum
  }

  /**
   * Add Q4 balance sheet entries from annual reports
   * For balance sheets, Q4 = Annual (no calculation needed since it's a point-in-time snapshot)
   */
  private static addQ4BalanceSheets(
    annual: BalanceSheetData[], 
    quarterly: BalanceSheetData[]
  ): BalanceSheetData[] {
    const result = [...quarterly]
    
    // For each annual statement, add it as Q4 if Q4 doesn't exist
    annual.forEach(annualStmt => {
      const year = annualStmt.fiscalYear
      if (!year || !annualStmt.date) return
      
      const calendarYear = new Date(annualStmt.date).getFullYear()
      
      // Check if Q4 already exists for this year
      const existingQ4 = result.find(q => 
        q.fiscalQuarter === 4 && 
        q.date && 
        new Date(q.date).getFullYear() === calendarYear
      )
      
      if (!existingQ4) {
        // Add the annual statement as Q4
        const q4: BalanceSheetData = {
          ...annualStmt,
          fiscalQuarter: 4
        }
        result.push(q4)
      }
    })
    
    // Sort by date descending
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    return result
  }

  /**
   * Convert YTD (Year-to-Date) cash flow values to individual quarterly values
   * SEC reports Q2 as Q1+Q2, Q3 as Q1+Q2+Q3, so we need to subtract previous quarters
   */
  private static convertYTDToQuarterly(quarterly: CashFlowStatementData[]): CashFlowStatementData[] {
    // Group by year
    const byYear = new Map<number, CashFlowStatementData[]>()
    quarterly.forEach(q => {
      const year = new Date(q.date).getFullYear()
      if (!byYear.has(year)) {
        byYear.set(year, [])
      }
      byYear.get(year)!.push(q)
    })
    
    const result: CashFlowStatementData[] = []
    
    // Process each year
    byYear.forEach((yearQuarters, year) => {
      // Sort by quarter
      yearQuarters.sort((a, b) => (a.fiscalQuarter || 0) - (b.fiscalQuarter || 0))
      
      for (let i = 0; i < yearQuarters.length; i++) {
        const current = yearQuarters[i]
        const previous = i > 0 ? yearQuarters[i - 1] : null
        
        if (!previous || current.fiscalQuarter === 1) {
          // Q1 values are already individual (not cumulative)
          result.push({ ...current })
        } else {
          // For Q2, Q3: subtract previous YTD to get individual quarter value
          const adjusted: CashFlowStatementData = {
            ...current,
            // Operating Activities
            operatingCashFlow: this.subtractValues(current.operatingCashFlow, previous.operatingCashFlow),
            netIncome: this.subtractValues(current.netIncome, previous.netIncome),
            depreciation: this.subtractValues(current.depreciation, previous.depreciation),
            stockBasedCompensation: this.subtractValues(current.stockBasedCompensation, previous.stockBasedCompensation),
            deferredIncomeTaxes: this.subtractValues(current.deferredIncomeTaxes, previous.deferredIncomeTaxes),
            changeInWorkingCapital: this.subtractValues(current.changeInWorkingCapital, previous.changeInWorkingCapital),
            changeInReceivables: this.subtractValues(current.changeInReceivables, previous.changeInReceivables),
            changeInInventory: this.subtractValues(current.changeInInventory, previous.changeInInventory),
            changeInPayables: this.subtractValues(current.changeInPayables, previous.changeInPayables),
            otherOperatingActivities: this.subtractValues(current.otherOperatingActivities, previous.otherOperatingActivities),
            
            // Investing Activities
            investingCashFlow: this.subtractValues(current.investingCashFlow, previous.investingCashFlow),
            capitalExpenditures: this.subtractValues(current.capitalExpenditures, previous.capitalExpenditures),
            investments: this.subtractValues(current.investments, previous.investments),
            acquisitionsNet: this.subtractValues(current.acquisitionsNet, previous.acquisitionsNet),
            otherInvestingActivities: this.subtractValues(current.otherInvestingActivities, previous.otherInvestingActivities),
            
            // Financing Activities
            financingCashFlow: this.subtractValues(current.financingCashFlow, previous.financingCashFlow),
            dividendsPaid: this.subtractValues(current.dividendsPaid, previous.dividendsPaid),
            stockRepurchased: this.subtractValues(current.stockRepurchased, previous.stockRepurchased),
            debtRepayment: this.subtractValues(current.debtRepayment, previous.debtRepayment),
            debtIssuance: this.subtractValues(current.debtIssuance, previous.debtIssuance),
            otherFinancingActivities: this.subtractValues(current.otherFinancingActivities, previous.otherFinancingActivities),
            
            // Net Change
            netChangeInCash: this.subtractValues(current.netChangeInCash, previous.netChangeInCash),
            foreignCurrencyEffect: this.subtractValues(current.foreignCurrencyEffect, previous.foreignCurrencyEffect),
            freeCashFlow: this.subtractValues(current.freeCashFlow, previous.freeCashFlow),
            
            // Supplemental (these are also YTD)
            cashInterestPaid: this.subtractValues(current.cashInterestPaid, previous.cashInterestPaid),
            cashTaxesPaid: this.subtractValues(current.cashTaxesPaid, previous.cashTaxesPaid)
          }
          
          result.push(adjusted)
        }
      }
    })
    
    // Sort by date descending
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  /**
   * Convert YTD (Year-to-Date) income statement values to individual quarterly values
   */
  private static convertIncomeStatementYTDToQuarterly(quarterly: IncomeStatementData[]): IncomeStatementData[] {
    const result: IncomeStatementData[] = []
    
    // Group by fiscal year
    const byYear = new Map<number, IncomeStatementData[]>()
    quarterly.forEach(q => {
      if (q.fiscalYear && q.fiscalQuarter && q.fiscalQuarter !== 4) { // Skip Q4 as it's already calculated
        if (!byYear.has(q.fiscalYear)) {
          byYear.set(q.fiscalYear, [])
        }
        byYear.get(q.fiscalYear)!.push(q)
      } else if (q.fiscalQuarter === 4) {
        // Q4 is already individual values from calculateQ4Data
        result.push(q)
      }
    })
    
    // Process each year
    byYear.forEach((yearQuarters, year) => {
      // Sort by quarter
      yearQuarters.sort((a, b) => (a.fiscalQuarter || 0) - (b.fiscalQuarter || 0))
      
      for (let i = 0; i < yearQuarters.length; i++) {
        const current = yearQuarters[i]
        const previous = i > 0 ? yearQuarters[i - 1] : null
        
        if (!previous || current.fiscalQuarter === 1) {
          // Q1 values are already individual (not cumulative)
          console.log(`[SEC] Q${current.fiscalQuarter} ${current.fiscalYear} - Q1 already individual: Revenue=${current.revenue}`)
          result.push({ ...current })
        } else {
          // For Q2, Q3: subtract previous YTD to get individual quarter value
          console.log(`[SEC] Q${current.fiscalQuarter} ${current.fiscalYear} - Converting from YTD: Current=${current.revenue}, Previous=${previous.revenue}`)
          const adjusted: IncomeStatementData = {
            ...current,
            // Revenue and costs
            revenue: this.subtractValues(current.revenue, previous.revenue),
            costOfRevenue: this.subtractValues(current.costOfRevenue, previous.costOfRevenue),
            grossProfit: this.subtractValues(current.grossProfit, previous.grossProfit),
            
            // Operating expenses
            operatingExpenses: this.subtractValues(current.operatingExpenses, previous.operatingExpenses),
            sellingGeneralAdministrative: this.subtractValues(current.sellingGeneralAdministrative, previous.sellingGeneralAdministrative),
            researchDevelopment: this.subtractValues(current.researchDevelopment, previous.researchDevelopment),
            otherOperatingExpenses: this.subtractValues(current.otherOperatingExpenses, previous.otherOperatingExpenses),
            
            // Income items
            operatingIncome: this.subtractValues(current.operatingIncome, previous.operatingIncome),
            interestExpense: this.subtractValues(current.interestExpense, previous.interestExpense),
            interestIncome: this.subtractValues(current.interestIncome, previous.interestIncome),
            otherNonOperatingIncome: this.subtractValues(current.otherNonOperatingIncome, previous.otherNonOperatingIncome),
            incomeBeforeTax: this.subtractValues(current.incomeBeforeTax, previous.incomeBeforeTax),
            incomeTaxExpense: this.subtractValues(current.incomeTaxExpense, previous.incomeTaxExpense),
            netIncome: this.subtractValues(current.netIncome, previous.netIncome),
            netIncomeFromContinuingOps: this.subtractValues(current.netIncomeFromContinuingOps, previous.netIncomeFromContinuingOps),
            
            // EBIT/EBITDA
            ebit: this.subtractValues(current.ebit, previous.ebit),
            ebitda: this.subtractValues(current.ebitda, previous.ebitda),
            exceptionalItems: this.subtractValues(current.exceptionalItems, previous.exceptionalItems),
            
            // Per share data doesn't need adjustment as it's already per-share
            eps: current.eps,
            epsDiluted: current.epsDiluted
          }
          
          result.push(adjusted)
        }
      }
    })
    
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  /**
   * Helper to subtract two values (handles null)
   */
  private static subtractValues(current: number | null, previous: number | null): number | null {
    if (current === null || previous === null) return current
    return current - previous
  }

  /**
   * Calculate Q4 cash flow data by subtracting Q1-Q3 from annual totals
   */
  private static calculateQ4CashFlows(
    annual: CashFlowStatementData[], 
    quarterly: CashFlowStatementData[]
  ): CashFlowStatementData[] {
    const result = [...quarterly]
    
    // Group quarterly data by calendar year
    const quarterlyByYear = new Map<number, CashFlowStatementData[]>()
    quarterly.forEach(q => {
      if (q.date && q.fiscalQuarter && q.fiscalQuarter <= 3) {
        const year = new Date(q.date).getFullYear()
        if (!quarterlyByYear.has(year)) {
          quarterlyByYear.set(year, [])
        }
        quarterlyByYear.get(year)!.push(q)
      }
    })
    
    // For each annual statement, calculate Q4 if we have Q1-Q3
    annual.forEach(annualStmt => {
      const year = annualStmt.fiscalYear
      if (!year || !annualStmt.date) return
      
      const calendarYear = new Date(annualStmt.date).getFullYear()
      const yearQuarters = quarterlyByYear.get(calendarYear) || []
      const q1 = yearQuarters.find(q => q.fiscalQuarter === 1)
      const q2 = yearQuarters.find(q => q.fiscalQuarter === 2)
      const q3 = yearQuarters.find(q => q.fiscalQuarter === 3)
      
      // Check if Q4 already exists
      const existingQ4 = result.find(q => 
        q.fiscalQuarter === 4 && 
        q.date && 
        new Date(q.date).getFullYear() === calendarYear
      )
      
      // Only calculate Q4 if we have all three quarters and Q4 doesn't exist
      if (q1 && q2 && q3 && !existingQ4) {
        const q4Date = new Date(annualStmt.date)
        
        const q4: CashFlowStatementData = {
          date: q4Date.toISOString(),
          endDate: q4Date.toISOString(),
          fiscalYear: year,
          fiscalQuarter: 4,
          
          // Calculate Q4 values by subtracting Q1-Q3 from annual
          operatingCashFlow: this.subtractQuarters(annualStmt.operatingCashFlow, [q1.operatingCashFlow, q2.operatingCashFlow, q3.operatingCashFlow]),
          netIncome: this.subtractQuarters(annualStmt.netIncome, [q1.netIncome, q2.netIncome, q3.netIncome]),
          depreciation: this.subtractQuarters(annualStmt.depreciation, [q1.depreciation, q2.depreciation, q3.depreciation]),
          stockBasedCompensation: this.subtractQuarters(annualStmt.stockBasedCompensation, [q1.stockBasedCompensation, q2.stockBasedCompensation, q3.stockBasedCompensation]),
          deferredIncomeTaxes: this.subtractQuarters(annualStmt.deferredIncomeTaxes, [q1.deferredIncomeTaxes, q2.deferredIncomeTaxes, q3.deferredIncomeTaxes]),
          changeInWorkingCapital: this.subtractQuarters(annualStmt.changeInWorkingCapital, [q1.changeInWorkingCapital, q2.changeInWorkingCapital, q3.changeInWorkingCapital]),
          changeInReceivables: this.subtractQuarters(annualStmt.changeInReceivables, [q1.changeInReceivables, q2.changeInReceivables, q3.changeInReceivables]),
          changeInInventory: this.subtractQuarters(annualStmt.changeInInventory, [q1.changeInInventory, q2.changeInInventory, q3.changeInInventory]),
          changeInPayables: this.subtractQuarters(annualStmt.changeInPayables, [q1.changeInPayables, q2.changeInPayables, q3.changeInPayables]),
          otherOperatingActivities: this.subtractQuarters(annualStmt.otherOperatingActivities, [q1.otherOperatingActivities, q2.otherOperatingActivities, q3.otherOperatingActivities]),
          
          investingCashFlow: this.subtractQuarters(annualStmt.investingCashFlow, [q1.investingCashFlow, q2.investingCashFlow, q3.investingCashFlow]),
          capitalExpenditures: this.subtractQuarters(annualStmt.capitalExpenditures, [q1.capitalExpenditures, q2.capitalExpenditures, q3.capitalExpenditures]),
          investments: this.subtractQuarters(annualStmt.investments, [q1.investments, q2.investments, q3.investments]),
          acquisitionsNet: this.subtractQuarters(annualStmt.acquisitionsNet, [q1.acquisitionsNet, q2.acquisitionsNet, q3.acquisitionsNet]),
          otherInvestingActivities: this.subtractQuarters(annualStmt.otherInvestingActivities, [q1.otherInvestingActivities, q2.otherInvestingActivities, q3.otherInvestingActivities]),
          
          financingCashFlow: this.subtractQuarters(annualStmt.financingCashFlow, [q1.financingCashFlow, q2.financingCashFlow, q3.financingCashFlow]),
          dividendsPaid: this.subtractQuarters(annualStmt.dividendsPaid, [q1.dividendsPaid, q2.dividendsPaid, q3.dividendsPaid]),
          stockRepurchased: this.subtractQuarters(annualStmt.stockRepurchased, [q1.stockRepurchased, q2.stockRepurchased, q3.stockRepurchased]),
          debtRepayment: this.subtractQuarters(annualStmt.debtRepayment, [q1.debtRepayment, q2.debtRepayment, q3.debtRepayment]),
          debtIssuance: this.subtractQuarters(annualStmt.debtIssuance, [q1.debtIssuance, q2.debtIssuance, q3.debtIssuance]),
          otherFinancingActivities: this.subtractQuarters(annualStmt.otherFinancingActivities, [q1.otherFinancingActivities, q2.otherFinancingActivities, q3.otherFinancingActivities]),
          
          netChangeInCash: this.subtractQuarters(annualStmt.netChangeInCash, [q1.netChangeInCash, q2.netChangeInCash, q3.netChangeInCash]),
          foreignCurrencyEffect: this.subtractQuarters(annualStmt.foreignCurrencyEffect, [q1.foreignCurrencyEffect, q2.foreignCurrencyEffect, q3.foreignCurrencyEffect]),
          freeCashFlow: this.subtractQuarters(annualStmt.freeCashFlow, [q1.freeCashFlow, q2.freeCashFlow, q3.freeCashFlow]),
          
          // Cash positions are point-in-time, so use annual values
          beginCashPosition: annualStmt.beginCashPosition,
          endCashPosition: annualStmt.endCashPosition,
          
          // Supplemental
          cashInterestPaid: this.subtractQuarters(annualStmt.cashInterestPaid, [q1.cashInterestPaid, q2.cashInterestPaid, q3.cashInterestPaid]),
          cashTaxesPaid: this.subtractQuarters(annualStmt.cashTaxesPaid, [q1.cashTaxesPaid, q2.cashTaxesPaid, q3.cashTaxesPaid])
        }
        
        result.push(q4)
      }
    })
    
    // Sort by date descending
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    return result
  }
}
