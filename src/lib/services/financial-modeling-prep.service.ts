import { FinancialStatements, IncomeStatementData, BalanceSheetData, CashFlowStatementData } from '@/types/stock'
import { FMPKeyManagerService } from './fmp-key-manager.service'

export class FinancialModelingPrepService {
  private static readonly BASE_URL = 'https://financialmodelingprep.com/api/v3'
  
  /**
   * Check if FMP API is configured
   */
  static async isConfigured(): Promise<boolean> {
    const keys = await FMPKeyManagerService.getActiveKeys()
    return keys.length > 0
  }

  /**
   * Fetch comprehensive financial statements from FMP
   */
  static async getFinancialStatements(symbol: string): Promise<FinancialStatements | null> {
    if (!(await this.isConfigured())) {
      console.warn('Financial Modeling Prep API key not configured')
      return null
    }

    try {
      // Fetch all three statement types in parallel
      const [incomeStatements, balanceSheets, cashFlowStatements] = await Promise.all([
        this.fetchIncomeStatements(symbol),
        this.fetchBalanceSheets(symbol),
        this.fetchCashFlowStatements(symbol)
      ])

      // Calculate TTM for income and cash flow
      const ttmIncome = this.calculateTTMIncomeStatement(incomeStatements.quarterly)
      const ttmCashFlow = this.calculateTTMCashFlow(cashFlowStatements.quarterly)

      return {
        symbol,
        incomeStatements: {
          annual: incomeStatements.annual,
          quarterly: incomeStatements.quarterly,
          ttm: ttmIncome || undefined
        },
        balanceSheets: {
          annual: balanceSheets.annual,
          quarterly: balanceSheets.quarterly
        },
        cashFlowStatements: {
          annual: cashFlowStatements.annual,
          quarterly: cashFlowStatements.quarterly,
          ttm: ttmCashFlow || undefined
        },
        updatedAt: new Date()
      }
    } catch (error) {
      console.error(`Failed to fetch financial statements from FMP for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Fetch income statements
   */
  private static async fetchIncomeStatements(symbol: string) {
    const [annual, quarterly] = await Promise.all([
      this.fetchData(`/income-statement/${symbol}?limit=5`),
      this.fetchData(`/income-statement/${symbol}?period=quarter&limit=8`)
    ])

    return {
      annual: this.processIncomeStatements(annual || []),
      quarterly: this.processIncomeStatements(quarterly || [])
    }
  }

  /**
   * Fetch balance sheets
   */
  private static async fetchBalanceSheets(symbol: string) {
    const [annual, quarterly] = await Promise.all([
      this.fetchData(`/balance-sheet-statement/${symbol}?limit=5`),
      this.fetchData(`/balance-sheet-statement/${symbol}?period=quarter&limit=8`)
    ])

    return {
      annual: this.processBalanceSheets(annual || []),
      quarterly: this.processBalanceSheets(quarterly || [])
    }
  }

  /**
   * Fetch cash flow statements
   */
  private static async fetchCashFlowStatements(symbol: string) {
    const [annual, quarterly] = await Promise.all([
      this.fetchData(`/cash-flow-statement/${symbol}?limit=5`),
      this.fetchData(`/cash-flow-statement/${symbol}?period=quarter&limit=8`)
    ])

    return {
      annual: this.processCashFlowStatements(annual || []),
      quarterly: this.processCashFlowStatements(quarterly || [])
    }
  }

  /**
   * Fetch data from FMP API with automatic key rotation and retry
   */
  private static async fetchData(endpoint: string, retryCount = 0): Promise<any[]> {
    try {
      // Get next API key from database
      const apiKey = await FMPKeyManagerService.getNextKey()
      if (!apiKey) {
        throw new Error('No active API keys available')
      }

      const url = `${this.BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${apiKey}`
      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 401) {
          // Invalid API key - record failure
          await FMPKeyManagerService.recordKeyFailure(apiKey)
          
          // Try with a different key if we haven't exceeded retry limit
          if (retryCount < 3) {
            console.log(`[FMP] API key invalid, trying with another key...`)
            return this.fetchData(endpoint, retryCount + 1)
          }
          throw new Error('Invalid API key - all retries exhausted')
        }
        
        if (response.status === 429) {
          // Rate limit hit - try with next key
          if (retryCount < 3) {
            console.log(`[FMP] Rate limit hit, trying with another key...`)
            return this.fetchData(endpoint, retryCount + 1)
          }
          throw new Error('Rate limit exceeded on all available keys')
        }
        
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // Check for FMP error messages
      if (data['Error Message']) {
        console.error('[FMP] API Error:', data['Error Message'])
        await FMPKeyManagerService.recordKeyFailure(apiKey)
        return []
      }
      
      // FMP returns an array of statements
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error(`[FMP] API error: ${endpoint}`, error)
      return []
    }
  }

  /**
   * Process income statement data from FMP format
   */
  private static processIncomeStatements(statements: any[]): IncomeStatementData[] {
    return statements.map(statement => ({
      date: statement.date,
      endDate: statement.date,
      fiscalYear: statement.calendarYear || new Date(statement.date).getFullYear(),
      fiscalQuarter: statement.period === 'FY' ? undefined : parseInt(statement.period?.replace('Q', '') || '0') || undefined,
      revenue: statement.revenue || null,
      costOfRevenue: statement.costOfRevenue || null,
      grossProfit: statement.grossProfit || null,
      operatingExpenses: statement.operatingExpenses || null,
      sellingGeneralAdministrative: statement.sellingGeneralAndAdministrativeExpenses || null,
      researchDevelopment: statement.researchAndDevelopmentExpenses || null,
      otherOperatingExpenses: null, // Not available in FMP
      operatingIncome: statement.operatingIncome || null,
      interestExpense: statement.interestExpense || null,
      interestIncome: statement.interestIncome || null,
      otherNonOperatingIncome: statement.otherIncomeExpenseNet || null,
      incomeBeforeTax: statement.incomeBeforeTax || null,
      incomeTaxExpense: statement.incomeTaxExpense || null,
      netIncome: statement.netIncome || null,
      netIncomeFromContinuingOps: statement.netIncomeFromContinuingOperations || null,
      eps: statement.eps || null,
      epsDiluted: statement.epsdiluted || null,
      ebit: statement.ebit || null,
      ebitda: statement.ebitda || null,
      exceptionalItems: null // Not available in FMP
    }))
  }

  /**
   * Process balance sheet data from FMP format
   */
  private static processBalanceSheets(statements: any[]): BalanceSheetData[] {
    return statements.map(statement => ({
      date: statement.date,
      endDate: statement.date,
      fiscalYear: statement.calendarYear || new Date(statement.date).getFullYear(),
      fiscalQuarter: statement.period === 'FY' ? undefined : parseInt(statement.period?.replace('Q', '') || '0') || undefined,
      // Assets
      totalAssets: statement.totalAssets || null,
      currentAssets: statement.totalCurrentAssets || null,
      cashAndCashEquivalents: statement.cashAndCashEquivalents || null,
      cashAndShortTermInvestments: statement.cashAndShortTermInvestments || null,
      netReceivables: statement.netReceivables || null,
      inventory: statement.inventory || null,
      otherCurrentAssets: statement.otherCurrentAssets || null,
      // Non-current Assets
      propertyPlantEquipment: statement.propertyPlantEquipmentNet || null,
      goodwill: statement.goodwill || null,
      intangibleAssets: statement.intangibleAssets || null,
      longTermInvestments: statement.longTermInvestments || null,
      otherNonCurrentAssets: statement.otherNonCurrentAssets || null,
      // Liabilities
      totalLiabilities: statement.totalLiabilities || null,
      currentLiabilities: statement.totalCurrentLiabilities || null,
      accountsPayable: statement.accountPayables || null,
      shortTermDebt: statement.shortTermDebt || null,
      currentPortionLongTermDebt: statement.currentPortionOfLongTermDebt || null,
      otherCurrentLiabilities: statement.otherCurrentLiabilities || null,
      // Non-current Liabilities
      longTermDebt: statement.longTermDebt || null,
      deferredTaxLiabilities: statement.deferredTaxLiabilitiesNonCurrent || null,
      otherNonCurrentLiabilities: statement.otherNonCurrentLiabilities || null,
      // Equity
      totalShareholderEquity: statement.totalStockholdersEquity || null,
      commonStock: statement.commonStock || null,
      retainedEarnings: statement.retainedEarnings || null,
      treasuryStock: statement.treasuryStock || null,
      otherShareholderEquity: statement.othertotalStockholdersEquity || null,
      // Shares
      sharesOutstanding: statement.commonStockSharesOutstanding || null
    }))
  }

  /**
   * Process cash flow statement data from FMP format
   */
  private static processCashFlowStatements(statements: any[]): CashFlowStatementData[] {
    return statements.map(statement => ({
      date: statement.date,
      endDate: statement.date,
      fiscalYear: statement.calendarYear || new Date(statement.date).getFullYear(),
      fiscalQuarter: statement.period === 'FY' ? undefined : parseInt(statement.period?.replace('Q', '') || '0') || undefined,
      // Operating Activities
      operatingCashFlow: statement.operatingCashFlow || null,
      netIncome: statement.netIncome || null,
      depreciation: statement.depreciationAndAmortization || null,
      stockBasedCompensation: statement.stockBasedCompensation || null,
      changeInWorkingCapital: statement.changeInWorkingCapital || null,
      changeInReceivables: statement.accountsReceivables || null,
      changeInInventory: statement.inventory || null,
      changeInPayables: statement.accountsPayables || null,
      otherOperatingActivities: statement.otherOperatingActivities || null,
      // Investing Activities
      investingCashFlow: statement.netCashUsedForInvestingActivites || null,
      capitalExpenditures: statement.capitalExpenditure || null,
      investments: statement.investmentsInPropertyPlantAndEquipment || null,
      acquisitionsNet: statement.acquisitionsNet || null,
      otherInvestingActivities: statement.otherInvestingActivites || null,
      // Financing Activities
      financingCashFlow: statement.netCashUsedProvidedByFinancingActivities || null,
      dividendsPaid: statement.dividendsPaid || null,
      stockRepurchased: statement.commonStockRepurchased || null,
      debtRepayment: statement.debtRepayment || null,
      debtIssuance: statement.proceedsFromIssuanceOfDebt || null,
      otherFinancingActivities: statement.otherFinancingActivites || null,
      // Net Change
      netChangeInCash: statement.netChangeInCash || null,
      freeCashFlow: statement.freeCashFlow || null,
      // Beginning/Ending Cash
      beginCashPosition: statement.cashAtBeginningOfPeriod || null,
      endCashPosition: statement.cashAtEndOfPeriod || null
    }))
  }

  /**
   * Calculate TTM income statement from quarterly data
   */
  private static calculateTTMIncomeStatement(quarterly: IncomeStatementData[]): IncomeStatementData | null {
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
   * Calculate TTM cash flow from quarterly data
   */
  private static calculateTTMCashFlow(quarterly: CashFlowStatementData[]): CashFlowStatementData | null {
    if (quarterly.length < 4) return null

    const last4Quarters = quarterly.slice(0, 4)
    
    return {
      date: last4Quarters[0].date,
      endDate: last4Quarters[0].endDate,
      fiscalYear: last4Quarters[0].fiscalYear,
      fiscalQuarter: undefined,
      // Operating Activities
      operatingCashFlow: this.sumValues(last4Quarters.map(q => q.operatingCashFlow)),
      netIncome: this.sumValues(last4Quarters.map(q => q.netIncome)),
      depreciation: this.sumValues(last4Quarters.map(q => q.depreciation)),
      stockBasedCompensation: this.sumValues(last4Quarters.map(q => q.stockBasedCompensation)),
      changeInWorkingCapital: this.sumValues(last4Quarters.map(q => q.changeInWorkingCapital)),
      changeInReceivables: this.sumValues(last4Quarters.map(q => q.changeInReceivables)),
      changeInInventory: this.sumValues(last4Quarters.map(q => q.changeInInventory)),
      changeInPayables: this.sumValues(last4Quarters.map(q => q.changeInPayables)),
      otherOperatingActivities: this.sumValues(last4Quarters.map(q => q.otherOperatingActivities)),
      // Investing Activities
      investingCashFlow: this.sumValues(last4Quarters.map(q => q.investingCashFlow)),
      capitalExpenditures: this.sumValues(last4Quarters.map(q => q.capitalExpenditures)),
      investments: this.sumValues(last4Quarters.map(q => q.investments)),
      acquisitionsNet: this.sumValues(last4Quarters.map(q => q.acquisitionsNet)),
      otherInvestingActivities: this.sumValues(last4Quarters.map(q => q.otherInvestingActivities)),
      // Financing Activities
      financingCashFlow: this.sumValues(last4Quarters.map(q => q.financingCashFlow)),
      dividendsPaid: this.sumValues(last4Quarters.map(q => q.dividendsPaid)),
      stockRepurchased: this.sumValues(last4Quarters.map(q => q.stockRepurchased)),
      debtRepayment: this.sumValues(last4Quarters.map(q => q.debtRepayment)),
      debtIssuance: this.sumValues(last4Quarters.map(q => q.debtIssuance)),
      otherFinancingActivities: this.sumValues(last4Quarters.map(q => q.otherFinancingActivities)),
      // Net Change
      netChangeInCash: this.sumValues(last4Quarters.map(q => q.netChangeInCash)),
      freeCashFlow: this.sumValues(last4Quarters.map(q => q.freeCashFlow)),
      // Beginning/Ending Cash - use the first quarter's begin and last quarter's end
      beginCashPosition: last4Quarters[3].beginCashPosition,
      endCashPosition: last4Quarters[0].endCashPosition
    }
  }

  /**
   * Helper to sum values, ignoring nulls
   */
  private static sumValues(values: (number | null)[]): number | null {
    const validValues = values.filter(v => v !== null) as number[]
    return validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) : null
  }

  /**
   * Helper to average values, ignoring nulls
   */
  private static averageValues(values: (number | null)[]): number | null {
    const validValues = values.filter(v => v !== null) as number[]
    return validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : null
  }
}
