import { FinancialCheck } from './financial-health-checklist'

// Helper function to format currency
const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

// Helper function to format percentage
const formatPercent = (value: number): string => {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

// Helper function to calculate CAGR
const calculateCAGR = (startValue: number, endValue: number, years: number): number => {
  if (startValue <= 0 || endValue <= 0) return 0
  return ((Math.pow(endValue / startValue, 1 / years) - 1) * 100)
}

export function createSolvencyChecks(data: any): FinancialCheck[] {
  const checks: FinancialCheck[] = []

  // 1. Insolvency Risk Check
  const totalAssets = data.latestBalance?.totalAssets || 0
  const totalLiabilities = data.latestBalance?.totalLiabilities || 0
  const netWorth = totalAssets - totalLiabilities

  checks.push({
    id: 'insolvency-risk',
    name: 'Insolvency Risk Check',
    status: netWorth > 0 ? 'pass' : 'fail',
    value: netWorth > 0 ? 'Assets > Liabilities' : 'INSOLVENT',
    details: `${formatCurrency(totalAssets)} vs ${formatCurrency(totalLiabilities)}`,
    explanation: {
      whatWeCheck: 'Can the company cover all its debts if it had to liquidate today? We compare total assets to total liabilities.',
      numbers: [
        { label: 'Total Assets', value: formatCurrency(totalAssets) },
        { label: 'Total Liabilities', value: formatCurrency(totalLiabilities) },
        { label: 'Net Worth (Equity)', value: formatCurrency(netWorth) },
        { label: 'Equity Ratio', value: `${((netWorth / totalAssets) * 100).toFixed(1)}%` }
      ],
      plainEnglish: netWorth > 0 
        ? `The company owns ${formatCurrency(totalAssets)} but owes ${formatCurrency(totalLiabilities)} - like having a house worth $500k with a $300k mortgage. They have ${formatCurrency(netWorth)} in net worth.`
        : `DANGER: The company owes more than it owns! Like having a $300k house with a $400k mortgage - technically bankrupt on paper.`,
      whyItMatters: netWorth > 0 ? [
        'Positive net worth means the company is solvent',
        'Provides a cushion for tough times',
        'Banks and suppliers view this favorably',
        'Shareholders have real equity value'
      ] : [
        'Company is technically insolvent - major bankruptcy risk',
        'May struggle to get new loans or credit',
        'Suppliers may demand cash upfront',
        'Shareholders equity is negative'
      ],
      recommendation: netWorth > 0 
        ? 'No immediate concerns. The company has positive equity providing a financial cushion.'
        : 'CRITICAL: Investigate restructuring plans immediately. Check for turnaround strategy or consider avoiding.',
      formula: 'Total Assets - Total Liabilities = Shareholders Equity'
    }
  })

  // 2. Liquidity Crisis Check
  const currentAssets = data.latestBalance?.currentAssets || 0
  const currentLiabilities = data.latestBalance?.currentLiabilities || 0
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0
  const operatingCashFlow = data.ttmCashFlow?.operatingCashFlow || data.latestCashFlow?.operatingCashFlow || 0

  checks.push({
    id: 'liquidity-crisis',
    name: 'Liquidity Crisis Check',
    status: currentRatio >= 1.5 ? 'pass' : currentRatio >= 1.0 ? 'warning' : 'fail',
    value: `Current Ratio: ${currentRatio.toFixed(2)}`,
    details: currentRatio < 1.0 ? 'Cannot pay short-term bills' : 'Can cover near-term obligations',
    explanation: {
      whatWeCheck: 'Can the company pay its bills due within the next 12 months? We look at current assets vs current liabilities.',
      numbers: [
        { label: 'Current Assets', value: formatCurrency(currentAssets) },
        { label: 'Current Liabilities', value: formatCurrency(currentLiabilities) },
        { label: 'Current Ratio', value: currentRatio.toFixed(2) },
        { label: 'Working Capital', value: formatCurrency(currentAssets - currentLiabilities) },
        { label: 'Operating Cash Flow (TTM)', value: formatCurrency(operatingCashFlow) }
      ],
      plainEnglish: currentRatio >= 1.0
        ? `Company has ${formatCurrency(currentAssets / currentLiabilities)} for every $1.00 of bills due this year - like having $${(currentRatio * 1000).toFixed(0)} in the bank with $1,000 in upcoming bills.`
        : `WARNING: Company only has ${formatCurrency(currentAssets / currentLiabilities)} for every $1.00 of bills - like having only $${(currentRatio * 1000).toFixed(0)} in the bank but $1,000 in bills to pay!`,
      whyItMatters: [
        currentRatio >= 1.5 ? 'Comfortable cushion to pay all short-term obligations' : 'Limited buffer for unexpected expenses',
        'Indicates ability to handle day-to-day operations',
        'Important for supplier and creditor confidence',
        currentRatio < 1.0 ? 'May need emergency funding or asset sales' : 'Can weather short-term disruptions'
      ],
      recommendation: currentRatio >= 1.5 
        ? 'Healthy liquidity position. No immediate concerns.'
        : currentRatio >= 1.0
        ? 'Monitor quarterly. Consider improving working capital management.'
        : 'URGENT: Company may struggle to pay bills. Check credit facilities and cash flow trends.',
      formula: 'Current Assets ÷ Current Liabilities'
    }
  })

  // 3. Cash Burn Check
  const totalDebt = (data.latestBalance?.shortTermDebt || 0) + (data.latestBalance?.longTermDebt || 0)
  const totalEquity = data.latestBalance?.totalShareholderEquity || 0
  const debtToEquity = totalEquity > 0 ? totalDebt / totalEquity : 999
  const isCashBurning = operatingCashFlow < 0
  const hasHighLeverage = debtToEquity > 2

  checks.push({
    id: 'cash-burn-leverage',
    name: 'Cash Burn with Leverage',
    status: !isCashBurning ? 'pass' : hasHighLeverage ? 'fail' : 'warning',
    value: isCashBurning ? 'Burning Cash' : 'Cash Positive',
    details: `OCF: ${formatCurrency(operatingCashFlow)}, D/E: ${debtToEquity.toFixed(2)}`,
    explanation: {
      whatWeCheck: 'Is the company burning cash while carrying high debt? This combination can quickly lead to bankruptcy.',
      numbers: [
        { label: 'Operating Cash Flow (TTM)', value: formatCurrency(operatingCashFlow) },
        { label: 'Total Debt', value: formatCurrency(totalDebt) },
        { label: 'Total Equity', value: formatCurrency(totalEquity) },
        { label: 'Debt-to-Equity Ratio', value: debtToEquity.toFixed(2) },
        { label: 'Monthly Burn Rate', value: isCashBurning ? formatCurrency(operatingCashFlow / 12) : 'N/A' }
      ],
      plainEnglish: isCashBurning && hasHighLeverage
        ? `DANGER: Company is losing ${formatCurrency(Math.abs(operatingCashFlow / 12))} per month while already deep in debt - like maxing out credit cards while unemployed!`
        : isCashBurning
        ? `Company is losing money (${formatCurrency(Math.abs(operatingCashFlow / 12))}/month) but has manageable debt levels.`
        : `Company generates positive cash flow of ${formatCurrency(operatingCashFlow / 12)} per month - healthy situation.`,
      whyItMatters: [
        isCashBurning ? 'Negative cash flow means spending more than earning' : 'Positive cash flow funds operations and growth',
        hasHighLeverage ? 'High debt makes cash burn extremely dangerous' : 'Moderate debt levels provide flexibility',
        isCashBurning && hasHighLeverage ? 'May need emergency funding soon' : 'Can sustain operations from internal cash',
        'Cash flow is the lifeblood of any business'
      ],
      recommendation: !isCashBurning
        ? 'Healthy cash generation. Continue monitoring trends.'
        : hasHighLeverage
        ? 'CRITICAL: High bankruptcy risk. Check cash runway and debt covenants immediately.'
        : 'Monitor burn rate closely. Ensure path to profitability is clear.',
      formula: 'Operating Cash Flow (from Cash Flow Statement)'
    }
  })

  // 4. Debt Service Coverage
  const interestExpense = Math.abs(data.ttmIncome?.interestExpense || data.latestIncome?.interestExpense || 0)
  const debtService = interestExpense * 1.5 // Estimate principal payments as 50% of interest
  const debtServiceCoverage = debtService > 0 ? operatingCashFlow / debtService : 999

  checks.push({
    id: 'debt-service',
    name: 'Debt Service Coverage',
    status: debtServiceCoverage >= 1.25 ? 'pass' : debtServiceCoverage >= 1.0 ? 'warning' : 'fail',
    value: debtServiceCoverage < 100 ? `${debtServiceCoverage.toFixed(2)}x` : 'No Debt',
    details: `OCF covers debt ${debtServiceCoverage.toFixed(1)}x`,
    explanation: {
      whatWeCheck: 'Can the company pay its debt obligations (interest and principal) from operating cash flow?',
      numbers: [
        { label: 'Operating Cash Flow', value: formatCurrency(operatingCashFlow) },
        { label: 'Interest Expense', value: formatCurrency(interestExpense) },
        { label: 'Est. Total Debt Service', value: formatCurrency(debtService) },
        { label: 'Coverage Ratio', value: `${debtServiceCoverage.toFixed(2)}x` },
        { label: 'Safety Margin', value: formatPercent((debtServiceCoverage - 1) * 100) }
      ],
      plainEnglish: debtServiceCoverage >= 1.25
        ? `Company earns ${formatCurrency(debtServiceCoverage)} for every $1 of debt payments - like earning $1,250/month with a $1,000 mortgage.`
        : debtServiceCoverage >= 1.0
        ? `Company barely covers debt payments - like earning $1,050/month with a $1,000 mortgage. Very tight!`
        : `DANGER: Company can't cover debt payments - earning only ${formatCurrency(debtServiceCoverage * 1000)}/month but owes $1,000!`,
      whyItMatters: [
        'Shows ability to service debt without external financing',
        'Banks require minimum coverage ratios in loan agreements',
        debtServiceCoverage < 1.0 ? 'May trigger debt covenant violations' : 'Maintains good standing with lenders',
        'Lower coverage increases refinancing risk'
      ],
      recommendation: debtServiceCoverage >= 1.25
        ? 'Comfortable debt coverage. No concerns.'
        : debtServiceCoverage >= 1.0
        ? 'Tight coverage. Work on improving cash flow or reducing debt.'
        : 'URGENT: Cannot cover debt payments. Risk of default. Check covenant compliance.',
      formula: 'Operating Cash Flow ÷ (Interest + Principal Payments)'
    }
  })

  return checks
}

export function createGrowthChecks(data: any): FinancialCheck[] {
  const checks: FinancialCheck[] = []

  // Extract trend data
  const revenueTrend = data.trends?.find((t: any) => t.metric.includes('Revenue'))
  const profitTrend = data.trends?.find((t: any) => t.metric === 'Net Income')
  const ocfTrend = data.trends?.find((t: any) => t.metric === 'Operating Cash Flow')
  const fcfTrend = data.trends?.find((t: any) => t.metric === 'Free Cash Flow')

  // 1. Revenue Growth Check
  const revenueCAGR = revenueTrend?.cagr || 0
  const latestRevenueGrowth = revenueTrend?.periods?.[revenueTrend.periods.length - 1]?.percentageChange || 0

  checks.push({
    id: 'revenue-growth',
    name: 'Revenue Growth',
    status: revenueCAGR >= 10 ? 'pass' : revenueCAGR >= 5 ? 'warning' : 'fail',
    value: `${formatPercent(revenueCAGR)} CAGR`,
    details: `Latest YoY: ${formatPercent(latestRevenueGrowth)}`,
    explanation: {
      whatWeCheck: 'Is the company growing its sales consistently over time? We look at 3-year compound annual growth rate (CAGR).',
      numbers: revenueTrend?.periods?.slice(-4).map((p: any) => ({
        label: new Date(p.date).getFullYear().toString(),
        value: formatCurrency(p.value)
      })) || [],
      plainEnglish: revenueCAGR >= 10
        ? `Sales growing ${revenueCAGR.toFixed(1)}% per year - like a store that had 100 customers now serving ${Math.round(100 * Math.pow(1 + revenueCAGR/100, 3))} customers.`
        : revenueCAGR >= 0
        ? `Sales growing slowly at ${revenueCAGR.toFixed(1)}% annually - barely keeping up with inflation.`
        : `Sales declining ${Math.abs(revenueCAGR).toFixed(1)}% per year - losing customers or market share.`,
      whyItMatters: [
        'Revenue growth drives all other financial improvements',
        'Shows market demand for products/services',
        revenueCAGR >= 10 ? 'Outpacing most competitors' : 'May be losing market share',
        'Future profits depend on revenue growth'
      ],
      recommendation: revenueCAGR >= 10
        ? 'Strong growth trajectory. Monitor for sustainability.'
        : revenueCAGR >= 5
        ? 'Moderate growth. Look for acceleration opportunities.'
        : 'Weak/negative growth. Investigate competitive position and market trends.',
      formula: '((Ending Revenue / Beginning Revenue)^(1/Years) - 1) × 100'
    }
  })

  // 2. Profit Growth Check
  const profitCAGR = profitTrend?.cagr || 0
  const latestProfit = data.ttmIncome?.netIncome || data.latestIncome?.netIncome || 0

  checks.push({
    id: 'profit-growth',
    name: 'Profit Growth',
    status: profitCAGR >= 15 && latestProfit > 0 ? 'pass' : profitCAGR >= 5 && latestProfit > 0 ? 'warning' : 'fail',
    value: latestProfit > 0 ? `${formatPercent(profitCAGR)} CAGR` : 'Unprofitable',
    details: `Current: ${formatCurrency(latestProfit)}`,
    explanation: {
      whatWeCheck: 'Are profits growing faster than revenue? This indicates improving efficiency and margins.',
      numbers: profitTrend?.periods?.slice(-4).map((p: any) => ({
        label: new Date(p.date).getFullYear().toString(),
        value: formatCurrency(p.value)
      })) || [],
      plainEnglish: profitCAGR >= 15 && latestProfit > 0
        ? `Profits growing ${profitCAGR.toFixed(1)}% annually - excellent wealth creation for shareholders!`
        : latestProfit > 0
        ? `Profits growing ${profitCAGR.toFixed(1)}% per year - decent but could be better.`
        : `Company is not profitable - no earnings for shareholders.`,
      whyItMatters: [
        'Profit growth creates shareholder value',
        'Shows operational efficiency improvements',
        'Funds future growth and dividends',
        latestProfit <= 0 ? 'No profits means no real value creation' : 'Consistent profits reduce risk'
      ],
      recommendation: profitCAGR >= 15 && latestProfit > 0
        ? 'Excellent profit growth. Company creating significant value.'
        : latestProfit > 0
        ? 'Monitor margin trends and efficiency initiatives.'
        : 'Focus on path to profitability before growth.',
      formula: 'Year-over-year Net Income growth rate'
    }
  })

  // 3. Cash Flow Growth Check
  const ocfCAGR = ocfTrend?.cagr || 0
  const latestOCF = data.ttmCashFlow?.operatingCashFlow || data.latestCashFlow?.operatingCashFlow || 0

  checks.push({
    id: 'cash-flow-growth',
    name: 'Cash Flow Growth',
    status: ocfCAGR >= 10 && latestOCF > 0 ? 'pass' : ocfCAGR >= 5 && latestOCF > 0 ? 'warning' : 'fail',
    value: `${formatPercent(ocfCAGR)} CAGR`,
    details: `Current: ${formatCurrency(latestOCF)}`,
    explanation: {
      whatWeCheck: 'Is the company generating more cash from operations over time? Cash is the ultimate measure of business health.',
      numbers: ocfTrend?.periods?.slice(-4).map((p: any) => ({
        label: new Date(p.date).getFullYear().toString(),
        value: formatCurrency(p.value)
      })) || [],
      plainEnglish: ocfCAGR >= 10 && latestOCF > 0
        ? `Cash generation growing ${ocfCAGR.toFixed(1)}% yearly - more money flowing in to fund growth and rewards.`
        : latestOCF > 0
        ? `Cash flow growing slowly at ${ocfCAGR.toFixed(1)}% - positive but concerning.`
        : `Negative cash flow - business is consuming cash rather than generating it!`,
      whyItMatters: [
        'Cash funds all business activities',
        'Real cash can\'t be manipulated like earnings',
        'Growing cash flow enables dividends and buybacks',
        'Banks and investors focus heavily on cash generation'
      ],
      recommendation: ocfCAGR >= 10 && latestOCF > 0
        ? 'Strong cash generation trend. Very healthy.'
        : latestOCF > 0
        ? 'Positive but slow growth. Investigate working capital efficiency.'
        : 'Negative cash flow is unsustainable. Urgent attention needed.'
    }
  })

  // 4. Free Cash Flow Growth
  const fcfCAGR = fcfTrend?.cagr || 0
  const latestFCF = data.ttmCashFlow?.freeCashFlow || 
    ((data.ttmCashFlow?.operatingCashFlow || 0) - Math.abs(data.ttmCashFlow?.capitalExpenditures || 0))

  checks.push({
    id: 'fcf-growth',
    name: 'Free Cash Flow Growth',
    status: fcfCAGR >= 10 && latestFCF > 0 ? 'pass' : fcfCAGR >= 0 && latestFCF > 0 ? 'warning' : 'fail',
    value: latestFCF > 0 ? `${formatPercent(fcfCAGR)} CAGR` : 'Negative FCF',
    details: `Current: ${formatCurrency(latestFCF)}`,
    explanation: {
      whatWeCheck: 'Is free cash flow (cash after necessary investments) growing? This is money available for shareholders.',
      numbers: [
        { label: 'Operating Cash Flow', value: formatCurrency(data.ttmCashFlow?.operatingCashFlow || 0) },
        { label: 'Capital Expenditures', value: formatCurrency(Math.abs(data.ttmCashFlow?.capitalExpenditures || 0)) },
        { label: 'Free Cash Flow', value: formatCurrency(latestFCF) },
        { label: 'FCF Margin', value: formatPercent((latestFCF / (data.ttmIncome?.revenue || 1)) * 100) }
      ],
      plainEnglish: fcfCAGR >= 10 && latestFCF > 0
        ? `Free cash growing ${fcfCAGR.toFixed(1)}% annually - more money for dividends, buybacks, or growth!`
        : latestFCF > 0
        ? `Free cash growing slowly - limited funds for shareholder returns.`
        : `No free cash flow - all money tied up in operations or investments.`,
      whyItMatters: [
        'Free cash flow is what\'s left for shareholders',
        'Funds dividends, buybacks, and acquisitions',
        'Shows business quality beyond accounting profits',
        'Key metric for valuation models'
      ],
      recommendation: fcfCAGR >= 10 && latestFCF > 0
        ? 'Excellent FCF growth. Check capital allocation strategy.'
        : latestFCF > 0
        ? 'Positive but monitor capital intensity trends.'
        : 'No free cash for shareholders. Review investment strategy.'
    }
  })

  // 5. Growth Quality Check
  const revenueGrowth = revenueCAGR
  const profitGrowth = profitCAGR
  const cashGrowth = ocfCAGR
  const qualityScore = (
    (profitGrowth > revenueGrowth ? 1 : 0) + 
    (cashGrowth > profitGrowth ? 1 : 0) +
    (latestOCF > latestProfit ? 1 : 0)
  )

  checks.push({
    id: 'growth-quality',
    name: 'Growth Quality',
    status: qualityScore >= 2 ? 'pass' : qualityScore >= 1 ? 'warning' : 'fail',
    value: qualityScore >= 2 ? 'High Quality' : qualityScore >= 1 ? 'Mixed Quality' : 'Low Quality',
    details: 'Profitable & cash-generative',
    explanation: {
      whatWeCheck: 'Is growth translating into profits and cash? Quality growth shows improving margins and efficiency.',
      numbers: [
        { label: 'Revenue Growth', value: formatPercent(revenueGrowth) },
        { label: 'Profit Growth', value: formatPercent(profitGrowth) },
        { label: 'Cash Flow Growth', value: formatPercent(cashGrowth) },
        { label: 'OCF/Net Income', value: (latestOCF / (latestProfit || 1)).toFixed(2) + 'x' }
      ],
      plainEnglish: qualityScore >= 2
        ? 'Excellent growth quality - sales turning into profits and cash efficiently!'
        : qualityScore >= 1
        ? 'Mixed growth quality - some efficiency gains but room for improvement.'
        : 'Poor growth quality - growing sales but not profits or cash flow.',
      whyItMatters: [
        'Quality growth is sustainable long-term',
        'Shows operational efficiency improvements',
        'Indicates pricing power and cost control',
        'High-quality growth commands premium valuations'
      ],
      recommendation: qualityScore >= 2
        ? 'High-quality growth profile. Very attractive.'
        : qualityScore >= 1
        ? 'Focus on margin improvement initiatives.'
        : 'Growth without profitability is unsustainable. Review strategy.'
    }
  })

  return checks
}

export function createProfitabilityChecks(data: any): FinancialCheck[] {
  const checks: FinancialCheck[] = []

  // Extract profitability metrics
  const revenue = data.ttmIncome?.revenue || data.latestIncome?.revenue || 0
  const grossProfit = data.ttmIncome?.grossProfit || data.latestIncome?.grossProfit || 0
  const operatingIncome = data.ttmIncome?.operatingIncome || data.latestIncome?.operatingIncome || 0
  const netIncome = data.ttmIncome?.netIncome || data.latestIncome?.netIncome || 0

  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
  const operatingMargin = revenue > 0 ? (operatingIncome / revenue) * 100 : 0
  const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0

  // 1. Gross Margin Health
  const previousGrossMargin = data.previousIncome?.revenue > 0 
    ? ((data.previousIncome.grossProfit || 0) / data.previousIncome.revenue) * 100 : 0
  const marginChange = grossMargin - previousGrossMargin

  checks.push({
    id: 'gross-margin',
    name: 'Gross Margin Health',
    status: grossMargin >= 40 ? 'pass' : grossMargin >= 20 ? 'warning' : 'fail',
    value: `${grossMargin.toFixed(1)}%`,
    details: `YoY: ${marginChange > 0 ? '+' : ''}${marginChange.toFixed(1)}pp`,
    explanation: {
      whatWeCheck: 'What percentage of revenue is left after direct costs? Higher margins indicate pricing power.',
      numbers: [
        { label: 'Revenue', value: formatCurrency(revenue) },
        { label: 'Cost of Revenue', value: formatCurrency(revenue - grossProfit) },
        { label: 'Gross Profit', value: formatCurrency(grossProfit) },
        { label: 'Gross Margin', value: `${grossMargin.toFixed(1)}%` },
        { label: 'Prior Year Margin', value: `${previousGrossMargin.toFixed(1)}%` }
      ],
      plainEnglish: grossMargin >= 40
        ? `Company keeps $${grossMargin.toFixed(0)} of every $100 in sales after direct costs - strong pricing power!`
        : grossMargin >= 20
        ? `Company keeps $${grossMargin.toFixed(0)} per $100 of sales - decent but competitive pressure evident.`
        : `Only $${grossMargin.toFixed(0)} left per $100 of sales - very thin margins or commodity business.`,
      whyItMatters: [
        'Shows pricing power and competitive advantage',
        'Higher margins = more profit potential',
        marginChange > 0 ? 'Improving margins show strengthening position' : 'Declining margins indicate pressure',
        'Industry comparison is crucial here'
      ],
      recommendation: grossMargin >= 40
        ? 'Strong gross margins. Monitor for sustainability.'
        : grossMargin >= 20
        ? 'Acceptable margins. Look for improvement opportunities.'
        : 'Weak margins. Investigate pricing and cost structure.',
      formula: '(Revenue - Cost of Goods Sold) ÷ Revenue × 100'
    }
  })

  // 2. Operating Profitability
  checks.push({
    id: 'operating-profit',
    name: 'Operating Profitability',
    status: operatingMargin >= 15 ? 'pass' : operatingMargin >= 10 ? 'warning' : 'fail',
    value: `${operatingMargin.toFixed(1)}%`,
    details: operatingIncome > 0 ? 'Profitable operations' : 'Operating loss',
    explanation: {
      whatWeCheck: 'Is the core business profitable after all operating expenses? This excludes interest and taxes.',
      numbers: [
        { label: 'Revenue', value: formatCurrency(revenue) },
        { label: 'Operating Expenses', value: formatCurrency(grossProfit - operatingIncome) },
        { label: 'Operating Income', value: formatCurrency(operatingIncome) },
        { label: 'Operating Margin', value: `${operatingMargin.toFixed(1)}%` }
      ],
      plainEnglish: operatingMargin >= 15
        ? `Earns $${operatingMargin.toFixed(0)} operating profit per $100 of sales - efficiently run business!`
        : operatingMargin > 0
        ? `Makes $${operatingMargin.toFixed(0)} per $100 in sales from operations - room for improvement.`
        : `Loses money on operations - spending more to run the business than it earns!`,
      whyItMatters: [
        'Shows core business profitability',
        'Indicates operational efficiency',
        'Key metric for comparing competitors',
        operatingIncome <= 0 ? 'Operating losses are unsustainable' : 'Positive operations fund growth'
      ],
      recommendation: operatingMargin >= 15
        ? 'Healthy operating margins. Well-managed business.'
        : operatingMargin > 0
        ? 'Positive but investigate cost reduction opportunities.'
        : 'Operating losses require immediate attention.'
    }
  })

  // 3. Net Profitability
  checks.push({
    id: 'net-profit',
    name: 'Net Profitability',
    status: netMargin >= 10 ? 'pass' : netMargin >= 5 ? 'warning' : 'fail',
    value: netIncome > 0 ? `${netMargin.toFixed(1)}%` : 'Loss',
    details: `${formatCurrency(netIncome)} net income`,
    explanation: {
      whatWeCheck: 'What\'s the final profit after ALL expenses including interest and taxes?',
      numbers: [
        { label: 'Revenue', value: formatCurrency(revenue) },
        { label: 'All Expenses', value: formatCurrency(revenue - netIncome) },
        { label: 'Net Income', value: formatCurrency(netIncome) },
        { label: 'Net Margin', value: `${netMargin.toFixed(1)}%` },
        { label: 'EPS', value: `$${data.ttmIncome?.epsDiluted?.toFixed(2) || 'N/A'}` }
      ],
      plainEnglish: netMargin >= 10
        ? `Keeps $${netMargin.toFixed(0)} as final profit for every $100 in sales - excellent profitability!`
        : netMargin > 0
        ? `Final profit of $${netMargin.toFixed(0)} per $100 in sales - positive but could be better.`
        : `Losing money overall - no profits for shareholders!`,
      whyItMatters: [
        'Bottom line profit for shareholders',
        'Funds dividends and growth',
        'Key input for valuation',
        netIncome <= 0 ? 'No profits = no shareholder value' : 'Consistent profits reduce risk'
      ],
      recommendation: netMargin >= 10
        ? 'Strong bottom-line profitability.'
        : netMargin > 0
        ? 'Profitable but explore margin expansion.'
        : 'Unprofitable. Path to profitability critical.'
    }
  })

  // 4. Margin Trend
  const marginTrend = data.trends?.find((t: any) => t.metric.includes('Margin'))
  const isExpanding = marginTrend?.direction === 'improving'
  const isCompressing = marginTrend?.direction === 'deteriorating'

  checks.push({
    id: 'margin-trend',
    name: 'Margin Expansion/Compression',
    status: isExpanding ? 'pass' : isCompressing ? 'fail' : 'warning',
    value: isExpanding ? 'Expanding' : isCompressing ? 'Compressing' : 'Stable',
    details: marginTrend?.insight || 'Check historical trends',
    explanation: {
      whatWeCheck: 'Are profit margins improving or getting worse over time? Trend matters as much as level.',
      numbers: marginTrend?.periods?.slice(-4).map((p: any) => ({
        label: new Date(p.date).getFullYear().toString(),
        value: `${p.value.toFixed(1)}%`
      })) || [],
      plainEnglish: isExpanding
        ? 'Margins improving - keeping more profit from each sale as business scales!'
        : isCompressing
        ? 'Margins shrinking - competitive pressure or rising costs eating into profits.'
        : 'Margins stable - consistent profitability but no improvement.',
      whyItMatters: [
        'Trend predicts future profitability',
        isExpanding ? 'Shows strengthening competitive position' : 'May indicate weakening moat',
        'Margin expansion drives stock returns',
        'Key indicator of business quality'
      ],
      recommendation: isExpanding
        ? 'Excellent trend. Investigate drivers for sustainability.'
        : isCompressing
        ? 'Concerning trend. Address cost or pricing issues.'
        : 'Stable but look for expansion opportunities.'
    }
  })

  return checks
}

export function createFinancialStrengthChecks(data: any): FinancialCheck[] {
  const checks: FinancialCheck[] = []

  // Extract balance sheet metrics
  const totalDebt = (data.latestBalance?.shortTermDebt || 0) + (data.latestBalance?.longTermDebt || 0)
  const totalEquity = data.latestBalance?.totalShareholderEquity || 0
  const cash = data.latestBalance?.cashAndCashEquivalents || 0
  const operatingIncome = data.ttmIncome?.operatingIncome || data.latestIncome?.operatingIncome || 0
  const interestExpense = Math.abs(data.ttmIncome?.interestExpense || data.latestIncome?.interestExpense || 0)

  // 1. Debt Levels
  const debtToEquity = totalEquity > 0 ? totalDebt / totalEquity : 999

  checks.push({
    id: 'debt-levels',
    name: 'Debt Levels',
    status: debtToEquity <= 0.5 ? 'pass' : debtToEquity <= 1.0 ? 'warning' : 'fail',
    value: `D/E: ${debtToEquity.toFixed(2)}`,
    details: `${formatCurrency(totalDebt)} debt`,
    explanation: {
      whatWeCheck: 'How much debt does the company carry relative to shareholder equity? Lower is safer.',
      numbers: [
        { label: 'Total Debt', value: formatCurrency(totalDebt) },
        { label: 'Total Equity', value: formatCurrency(totalEquity) },
        { label: 'Debt-to-Equity Ratio', value: debtToEquity.toFixed(2) },
        { label: 'Debt as % of Assets', value: `${((totalDebt / (data.latestBalance?.totalAssets || 1)) * 100).toFixed(1)}%` }
      ],
      plainEnglish: debtToEquity <= 0.5
        ? `Conservative debt - only $${(debtToEquity).toFixed(2)} of debt per $1 of equity. Like having a small mortgage on a valuable house.`
        : debtToEquity <= 1.0
        ? `Moderate leverage - $${debtToEquity.toFixed(2)} debt per $1 equity. Manageable but watch closely.`
        : `High leverage - $${debtToEquity.toFixed(2)} debt per $1 equity! Like having a huge mortgage on a small house.`,
      whyItMatters: [
        'Lower debt = lower financial risk',
        'High debt amplifies losses in bad times',
        debtToEquity > 1 ? 'More debt than equity increases bankruptcy risk' : 'Conservative leverage provides flexibility',
        'Affects cost of capital and credit rating'
      ],
      recommendation: debtToEquity <= 0.5
        ? 'Conservative debt levels. Strong financial position.'
        : debtToEquity <= 1.0
        ? 'Moderate leverage. Monitor debt service ability.'
        : 'High leverage concerning. Review debt reduction plans.',
      formula: 'Total Debt ÷ Total Shareholders Equity'
    }
  })

  // 2. Interest Coverage
  const interestCoverage = interestExpense > 0 ? operatingIncome / interestExpense : 999

  checks.push({
    id: 'interest-coverage',
    name: 'Interest Coverage',
    status: interestCoverage >= 5 ? 'pass' : interestCoverage >= 2 ? 'warning' : 'fail',
    value: interestExpense > 0 ? `${interestCoverage.toFixed(1)}x` : 'No Debt',
    details: 'EBIT/Interest',
    explanation: {
      whatWeCheck: 'Can the company easily pay interest on its debt from operating earnings?',
      numbers: [
        { label: 'Operating Income (EBIT)', value: formatCurrency(operatingIncome) },
        { label: 'Interest Expense', value: formatCurrency(interestExpense) },
        { label: 'Coverage Ratio', value: `${interestCoverage.toFixed(1)}x` },
        { label: 'Safety Margin', value: formatPercent((interestCoverage - 1) * 100) }
      ],
      plainEnglish: interestCoverage >= 5
        ? `Earns ${interestCoverage.toFixed(0)}x its interest payments - like earning $5,000/month with a $1,000 mortgage payment.`
        : interestCoverage >= 2
        ? `Covers interest ${interestCoverage.toFixed(1)}x - adequate but limited cushion for tough times.`
        : `Barely covering interest payments - like earning $1,500/month with a $1,000 mortgage!`,
      whyItMatters: [
        'Shows ability to service debt comfortably',
        'Banks often require minimum coverage ratios',
        interestCoverage < 2 ? 'Low coverage = high default risk' : 'High coverage = financial flexibility',
        'Affects credit rating and borrowing costs'
      ],
      recommendation: interestCoverage >= 5
        ? 'Excellent interest coverage. No debt concerns.'
        : interestCoverage >= 2
        ? 'Adequate coverage but work on improvement.'
        : 'Weak coverage. Risk of covenant breach or default.'
    }
  })

  // 3. Cash Position
  const netCash = cash - totalDebt
  const cashToDebt = totalDebt > 0 ? cash / totalDebt : 999

  checks.push({
    id: 'cash-position',
    name: 'Cash Position',
    status: netCash > 0 ? 'pass' : cashToDebt >= 0.5 ? 'warning' : 'fail',
    value: netCash > 0 ? 'Net Cash' : `${(cashToDebt * 100).toFixed(0)}% of debt`,
    details: formatCurrency(cash),
    explanation: {
      whatWeCheck: 'Does the company have enough cash to handle emergencies or opportunities?',
      numbers: [
        { label: 'Cash & Equivalents', value: formatCurrency(cash) },
        { label: 'Total Debt', value: formatCurrency(totalDebt) },
        { label: 'Net Cash (Debt)', value: formatCurrency(netCash) },
        { label: 'Cash to Debt Ratio', value: `${(cashToDebt * 100).toFixed(0)}%` }
      ],
      plainEnglish: netCash > 0
        ? `More cash than debt - could pay off all debts today! Like having $50k in the bank with a $30k mortgage.`
        : cashToDebt >= 0.5
        ? `Cash covers ${(cashToDebt * 100).toFixed(0)}% of debt - decent liquidity buffer.`
        : `Low cash relative to debt - limited financial flexibility.`,
      whyItMatters: [
        'Cash provides options and safety',
        netCash > 0 ? 'Net cash position = maximum flexibility' : 'Net debt position = constrained options',
        'Enables opportunistic investments',
        'Buffer for economic downturns'
      ],
      recommendation: netCash > 0
        ? 'Fortress balance sheet. Excellent position.'
        : cashToDebt >= 0.5
        ? 'Adequate cash buffer. Maintain liquidity.'
        : 'Low cash levels. Build reserves or reduce debt.'
    }
  })

  // 4. Financial Flexibility (placeholder for credit lines, would need additional data)
  checks.push({
    id: 'financial-flexibility',
    name: 'Financial Flexibility',
    status: netCash > 0 || debtToEquity < 0.5 ? 'pass' : debtToEquity <= 1.0 ? 'warning' : 'fail',
    value: netCash > 0 ? 'High' : debtToEquity < 1 ? 'Moderate' : 'Low',
    details: 'Access to capital',
    explanation: {
      whatWeCheck: 'Can the company raise money if needed for growth or emergencies?',
      numbers: [
        { label: 'Net Cash Position', value: formatCurrency(netCash) },
        { label: 'Debt-to-Equity', value: debtToEquity.toFixed(2) },
        { label: 'Debt Capacity Used', value: `${Math.min((debtToEquity / 2) * 100, 100).toFixed(0)}%` }
      ],
      plainEnglish: netCash > 0 || debtToEquity < 0.5
        ? 'High flexibility - plenty of options to raise capital through debt or equity.'
        : debtToEquity <= 1.0
        ? 'Moderate flexibility - some borrowing capacity remains.'
        : 'Low flexibility - already highly leveraged, limited options.',
      whyItMatters: [
        'Flexibility enables strategic moves',
        'Important for weathering crises',
        'Affects acquisition capabilities',
        'Influences dividend/buyback capacity'
      ],
      recommendation: netCash > 0 || debtToEquity < 0.5
        ? 'Strong financial flexibility for opportunities.'
        : debtToEquity <= 1.0
        ? 'Maintain current flexibility levels.'
        : 'Limited flexibility. Focus on debt reduction.'
    }
  })

  return checks
}

export function createQualityChecks(data: any): FinancialCheck[] {
  const checks: FinancialCheck[] = []

  // Extract quality metrics
  const netIncome = data.ttmIncome?.netIncome || data.latestIncome?.netIncome || 0
  const operatingCashFlow = data.ttmCashFlow?.operatingCashFlow || data.latestCashFlow?.operatingCashFlow || 0
  const revenue = data.ttmIncome?.revenue || data.latestIncome?.revenue || 0
  const totalAssets = data.latestBalance?.totalAssets || 0
  const totalEquity = data.latestBalance?.totalShareholderEquity || 0
  const previousEquity = data.previousBalance?.totalShareholderEquity || totalEquity

  // 1. Earnings Quality
  const cashToEarnings = netIncome !== 0 ? operatingCashFlow / netIncome : 0

  checks.push({
    id: 'earnings-quality',
    name: 'Earnings Quality',
    status: cashToEarnings >= 1.2 ? 'pass' : cashToEarnings >= 0.8 ? 'warning' : 'fail',
    value: `${cashToEarnings.toFixed(2)}x`,
    details: 'OCF/Net Income',
    explanation: {
      whatWeCheck: 'Are reported profits backed by real cash flow? High-quality earnings convert to cash.',
      numbers: [
        { label: 'Net Income', value: formatCurrency(netIncome) },
        { label: 'Operating Cash Flow', value: formatCurrency(operatingCashFlow) },
        { label: 'Cash/Earnings Ratio', value: `${cashToEarnings.toFixed(2)}x` },
        { label: 'Difference', value: formatCurrency(operatingCashFlow - netIncome) }
      ],
      plainEnglish: cashToEarnings >= 1.2
        ? `Excellent - generating ${cashToEarnings.toFixed(1)}x more cash than reported profits! Real money, not accounting tricks.`
        : cashToEarnings >= 0.8
        ? `Decent - cash flow roughly matches profits, some timing differences.`
        : `Warning - profits not converting to cash! May indicate aggressive accounting.`,
      whyItMatters: [
        'Cash is real, earnings can be manipulated',
        'High ratio = conservative accounting',
        'Low ratio may indicate earnings management',
        'Banks and investors prefer cash profits'
      ],
      recommendation: cashToEarnings >= 1.2
        ? 'High-quality earnings. Very reliable financials.'
        : cashToEarnings >= 0.8
        ? 'Acceptable quality but monitor trends.'
        : 'Poor earnings quality. Investigate accounting policies.',
      formula: 'Operating Cash Flow ÷ Net Income'
    }
  })

  // 2. Return on Equity (ROE)
  const avgEquity = (totalEquity + previousEquity) / 2
  const roe = avgEquity > 0 ? (netIncome / avgEquity) * 100 : 0

  checks.push({
    id: 'return-on-equity',
    name: 'Return on Equity (ROE)',
    status: roe >= 15 ? 'pass' : roe >= 10 ? 'warning' : 'fail',
    value: `${roe.toFixed(1)}%`,
    details: 'Annual return',
    explanation: {
      whatWeCheck: 'What return is the company generating on shareholder investment?',
      numbers: [
        { label: 'Net Income', value: formatCurrency(netIncome) },
        { label: 'Average Equity', value: formatCurrency(avgEquity) },
        { label: 'ROE', value: `${roe.toFixed(1)}%` },
        { label: 'vs S&P 500 avg', value: roe > 14 ? 'Above' : 'Below' }
      ],
      plainEnglish: roe >= 15
        ? `Earning ${roe.toFixed(0)}% return on shareholder money - better than most stock market returns!`
        : roe >= 10
        ? `Generating ${roe.toFixed(0)}% returns - decent but not exceptional.`
        : `Only ${roe.toFixed(0)}% return - shareholders could do better elsewhere.`,
      whyItMatters: [
        'Measures management effectiveness',
        'Key driver of stock returns',
        'Shows competitive advantage',
        roe < 10 ? 'Below market returns' : 'Beating passive investing'
      ],
      recommendation: roe >= 15
        ? 'Excellent returns. Check sustainability.'
        : roe >= 10
        ? 'Acceptable but seek improvement.'
        : 'Poor returns. Why invest here vs index fund?'
    }
  })

  // 3. Asset Efficiency
  const assetTurnover = totalAssets > 0 ? revenue / totalAssets : 0

  checks.push({
    id: 'asset-efficiency',
    name: 'Asset Efficiency',
    status: assetTurnover >= 1.0 ? 'pass' : assetTurnover >= 0.5 ? 'warning' : 'fail',
    value: `${assetTurnover.toFixed(2)}x`,
    details: 'Revenue/Assets',
    explanation: {
      whatWeCheck: 'How efficiently does the company use its assets to generate revenue?',
      numbers: [
        { label: 'Revenue', value: formatCurrency(revenue) },
        { label: 'Total Assets', value: formatCurrency(totalAssets) },
        { label: 'Asset Turnover', value: `${assetTurnover.toFixed(2)}x` },
        { label: 'Revenue per $1 asset', value: `$${assetTurnover.toFixed(2)}` }
      ],
      plainEnglish: assetTurnover >= 1.0
        ? `Generates $${assetTurnover.toFixed(2)} in sales per $1 of assets - efficient operation!`
        : assetTurnover >= 0.5
        ? `Makes $${assetTurnover.toFixed(2)} per $1 of assets - could be more efficient.`
        : `Only $${assetTurnover.toFixed(2)} sales per $1 of assets - assets underutilized.`,
      whyItMatters: [
        'Shows operational efficiency',
        'Higher turnover = better asset use',
        'Industry-specific (retail high, utilities low)',
        'Drives return on assets'
      ],
      recommendation: assetTurnover >= 1.0
        ? 'Good asset utilization. Compare to peers.'
        : assetTurnover >= 0.5
        ? 'Room for efficiency improvements.'
        : 'Poor asset utilization. Review asset base.'
    }
  })

  // 4. Working Capital Management (simplified - would need more detailed data)
  const workingCapital = (data.latestBalance?.currentAssets || 0) - (data.latestBalance?.currentLiabilities || 0)
  const wcToRevenue = revenue > 0 ? (workingCapital / revenue) * 100 : 0

  checks.push({
    id: 'working-capital',
    name: 'Working Capital Management',
    status: wcToRevenue > 0 && wcToRevenue < 30 ? 'pass' : wcToRevenue < 0 ? 'fail' : 'warning',
    value: `${Math.abs(wcToRevenue).toFixed(0)}% of sales`,
    details: workingCapital > 0 ? 'Positive' : 'Negative',
    explanation: {
      whatWeCheck: 'Is working capital (current assets - current liabilities) efficiently managed?',
      numbers: [
        { label: 'Working Capital', value: formatCurrency(workingCapital) },
        { label: 'As % of Revenue', value: `${wcToRevenue.toFixed(1)}%` },
        { label: 'Days of Revenue', value: `${(wcToRevenue * 3.65).toFixed(0)} days` }
      ],
      plainEnglish: wcToRevenue > 0 && wcToRevenue < 30
        ? `Efficient - only ${wcToRevenue.toFixed(0)}% of revenue tied up in working capital.`
        : wcToRevenue < 0
        ? `Negative working capital - suppliers financing the business (can be good if stable).`
        : `High working capital - ${wcToRevenue.toFixed(0)}% of revenue stuck in operations.`,
      whyItMatters: [
        'Lower working capital = more cash available',
        'Efficient management improves cash flow',
        'Too high = money tied up unnecessarily',
        'Negative can be good (e.g., Amazon model)'
      ],
      recommendation: wcToRevenue > 0 && wcToRevenue < 30
        ? 'Well-managed working capital.'
        : wcToRevenue < 0
        ? 'Monitor stability of negative WC model.'
        : 'High WC. Review receivables and inventory.'
    }
  })

  // 5. Capital Allocation (simplified)
  const capex = Math.abs(data.ttmCashFlow?.capitalExpenditures || data.latestCashFlow?.capitalExpenditures || 0)
  const dividends = Math.abs(data.ttmCashFlow?.dividendsPaid || data.latestCashFlow?.dividendsPaid || 0)
  const buybacks = Math.abs(data.ttmCashFlow?.stockRepurchased || data.latestCashFlow?.stockRepurchased || 0)
  const totalCapitalDeployed = capex + dividends + buybacks
  const fcf = operatingCashFlow - capex

  checks.push({
    id: 'capital-allocation',
    name: 'Capital Allocation',
    status: fcf > 0 && (dividends + buybacks) < fcf ? 'pass' : fcf > 0 ? 'warning' : 'fail',
    value: fcf > 0 ? 'Balanced' : 'Poor',
    details: 'Growth + Returns',
    explanation: {
      whatWeCheck: 'How wisely does management allocate capital between growth and shareholder returns?',
      numbers: [
        { label: 'Capital Expenditures', value: formatCurrency(capex) },
        { label: 'Dividends Paid', value: formatCurrency(dividends) },
        { label: 'Share Buybacks', value: formatCurrency(buybacks) },
        { label: 'Free Cash Flow', value: formatCurrency(fcf) },
        { label: 'Payout Ratio', value: `${fcf > 0 ? ((dividends + buybacks) / fcf * 100).toFixed(0) : 0}%` }
      ],
      plainEnglish: fcf > 0 && (dividends + buybacks) < fcf
        ? 'Balanced allocation - investing in growth while rewarding shareholders.'
        : fcf > 0
        ? 'Returning more cash than generating - may be unsustainable.'
        : 'No free cash flow - all money consumed by operations and investments.',
      whyItMatters: [
        'Good allocation drives long-term returns',
        'Balance between growth and returns',
        'Shows management priorities',
        'Affects future sustainability'
      ],
      recommendation: fcf > 0 && (dividends + buybacks) < fcf
        ? 'Prudent capital allocation strategy.'
        : fcf > 0
        ? 'High payout ratio. Ensure sustainability.'
        : 'No cash for shareholders. Review strategy.'
    }
  })

  return checks
}

export function createShareholderChecks(data: any): FinancialCheck[] {
  const checks: FinancialCheck[] = []

  // Extract shareholder metrics
  const currentShares = data.latestBalance?.sharesOutstanding || 0
  const previousShares = data.shareHistory?.[data.shareHistory.length - 4]?.value || currentShares
  const shareChange = previousShares > 0 ? ((currentShares - previousShares) / previousShares) * 100 : 0
  const shareCAGR = previousShares > 0 && currentShares > 0 
    ? calculateCAGR(previousShares, currentShares, 3) : 0

  // 1. Share Dilution Check
  checks.push({
    id: 'share-dilution',
    name: 'Share Dilution Check',
    status: shareCAGR <= 0 ? 'pass' : shareCAGR <= 3 ? 'warning' : 'fail',
    value: shareCAGR <= 0 ? 'Decreasing' : `+${shareCAGR.toFixed(1)}%/yr`,
    details: `${(currentShares / 1e6).toFixed(0)}M shares`,
    explanation: {
      whatWeCheck: 'Is the company creating new shares that dilute existing shareholders?',
      numbers: [
        { label: '3 Years Ago', value: `${(previousShares / 1e6).toFixed(0)}M shares` },
        { label: 'Current', value: `${(currentShares / 1e6).toFixed(0)}M shares` },
        { label: 'Total Change', value: `${shareChange > 0 ? '+' : ''}${shareChange.toFixed(1)}%` },
        { label: '3-Year CAGR', value: `${shareCAGR > 0 ? '+' : ''}${shareCAGR.toFixed(1)}%` }
      ],
      plainEnglish: shareCAGR <= 0
        ? 'Share count decreasing - your ownership percentage is growing! Like pizza being cut into fewer slices.'
        : shareCAGR <= 3
        ? `Modest dilution of ${shareCAGR.toFixed(1)}% per year - acceptable if funding growth.`
        : `Heavy dilution at ${shareCAGR.toFixed(1)}% annually - your ownership shrinking fast!`,
      whyItMatters: [
        shareCAGR <= 0 ? 'Buybacks increase your ownership %' : 'Dilution reduces your ownership %',
        'Affects earnings per share growth',
        shareCAGR > 5 ? 'High dilution destroys shareholder value' : 'Moderate dilution may fund growth',
        'Check if dilution creates value'
      ],
      recommendation: shareCAGR <= 0
        ? 'Excellent - reducing share count benefits shareholders.'
        : shareCAGR <= 3
        ? 'Monitor dilution and ensure value creation.'
        : 'Excessive dilution. Avoid unless transformative growth.',
      formula: 'Year-over-year change in shares outstanding'
    }
  })

  // 2. Share Buybacks
  const buybacks = Math.abs(data.ttmCashFlow?.stockRepurchased || data.latestCashFlow?.stockRepurchased || 0)
  const marketCap = data.latestQuote?.marketCap || (currentShares * (data.latestQuote?.price || 0))
  const buybackYield = marketCap > 0 ? (buybacks / marketCap) * 100 : 0

  checks.push({
    id: 'share-buybacks',
    name: 'Share Buybacks',
    status: buybackYield >= 2 ? 'pass' : buybackYield >= 0.5 ? 'warning' : 'fail',
    value: buybackYield > 0 ? `${buybackYield.toFixed(1)}% yield` : 'None',
    details: formatCurrency(buybacks),
    explanation: {
      whatWeCheck: 'Is the company buying back shares to increase ownership concentration?',
      numbers: [
        { label: 'Buyback Amount', value: formatCurrency(buybacks) },
        { label: 'Market Cap', value: formatCurrency(marketCap) },
        { label: 'Buyback Yield', value: `${buybackYield.toFixed(1)}%` },
        { label: 'Shares Retired', value: `~${((buybacks / (marketCap / currentShares)) / 1e6).toFixed(1)}M` }
      ],
      plainEnglish: buybackYield >= 2
        ? `Returning ${buybackYield.toFixed(1)}% via buybacks - actively shrinking share count!`
        : buybackYield > 0
        ? `Modest buybacks of ${buybackYield.toFixed(1)}% - some capital return.`
        : 'No share buybacks - missing opportunity to return cash.',
      whyItMatters: [
        'Buybacks increase ownership concentration',
        'Tax-efficient way to return cash',
        'Shows management confidence',
        'Boosts EPS without operational improvement'
      ],
      recommendation: buybackYield >= 2
        ? 'Strong buyback program benefiting shareholders.'
        : buybackYield > 0
        ? 'Some buybacks but could be more aggressive.'
        : 'Consider buybacks if shares undervalued.'
    }
  })

  // 3. Dividend Sustainability
  const dividends = Math.abs(data.ttmCashFlow?.dividendsPaid || data.latestCashFlow?.dividendsPaid || 0)
  const fcf = (data.ttmCashFlow?.operatingCashFlow || 0) - Math.abs(data.ttmCashFlow?.capitalExpenditures || 0)
  const dividendCoverage = dividends > 0 && fcf > 0 ? fcf / dividends : 0
  const payoutRatio = fcf > 0 ? (dividends / fcf) * 100 : 0

  checks.push({
    id: 'dividend-sustainability',
    name: 'Dividend Sustainability',
    status: dividends === 0 || dividendCoverage >= 1.5 ? 'pass' : dividendCoverage >= 1.0 ? 'warning' : 'fail',
    value: dividends > 0 ? `${payoutRatio.toFixed(0)}% payout` : 'No dividend',
    details: dividendCoverage > 0 ? `${dividendCoverage.toFixed(1)}x coverage` : 'N/A',
    explanation: {
      whatWeCheck: 'Can the company maintain its dividend payments from free cash flow?',
      numbers: [
        { label: 'Dividends Paid', value: formatCurrency(dividends) },
        { label: 'Free Cash Flow', value: formatCurrency(fcf) },
        { label: 'Coverage Ratio', value: dividendCoverage > 0 ? `${dividendCoverage.toFixed(2)}x` : 'N/A' },
        { label: 'Payout Ratio', value: `${payoutRatio.toFixed(0)}%` }
      ],
      plainEnglish: dividends === 0
        ? 'No dividend - company reinvests all profits or has none to distribute.'
        : dividendCoverage >= 1.5
        ? `Dividend well-covered by cash flow - using only ${payoutRatio.toFixed(0)}% of available cash.`
        : dividendCoverage >= 1.0
        ? `Tight dividend coverage - using ${payoutRatio.toFixed(0)}% of cash. Limited buffer.`
        : 'Paying more in dividends than generating in cash - unsustainable!',
      whyItMatters: [
        'Sustainable dividends provide reliable income',
        'Coverage ratio shows safety margin',
        dividendCoverage < 1 ? 'May need to cut dividend' : 'Room to maintain/grow dividend',
        'Important for income investors'
      ],
      recommendation: dividends === 0 || dividendCoverage >= 1.5
        ? 'Dividend policy is sustainable.'
        : dividendCoverage >= 1.0
        ? 'Monitor coverage closely. Limited margin.'
        : 'Dividend at risk. Prepare for potential cut.'
    }
  })

  // 4. Total Capital Return
  const totalReturn = dividends + buybacks
  const returnYield = marketCap > 0 ? (totalReturn / marketCap) * 100 : 0
  const fcfYield = marketCap > 0 && fcf > 0 ? (fcf / marketCap) * 100 : 0

  checks.push({
    id: 'capital-return',
    name: 'Capital Return Rate',
    status: returnYield >= 3 && totalReturn <= fcf ? 'pass' : returnYield >= 1.5 ? 'warning' : 'fail',
    value: `${returnYield.toFixed(1)}% yield`,
    details: formatCurrency(totalReturn),
    explanation: {
      whatWeCheck: 'How much cash is returned to shareholders via dividends and buybacks?',
      numbers: [
        { label: 'Dividends', value: formatCurrency(dividends) },
        { label: 'Buybacks', value: formatCurrency(buybacks) },
        { label: 'Total Returned', value: formatCurrency(totalReturn) },
        { label: 'Return Yield', value: `${returnYield.toFixed(1)}%` },
        { label: 'FCF Yield', value: `${fcfYield.toFixed(1)}%` }
      ],
      plainEnglish: returnYield >= 3
        ? `Returning ${returnYield.toFixed(1)}% to shareholders annually - excellent cash returns!`
        : returnYield >= 1.5
        ? `Modest ${returnYield.toFixed(1)}% return - some reward for shareholders.`
        : `Low ${returnYield.toFixed(1)}% return - keeping most cash in the business.`,
      whyItMatters: [
        'Direct cash return to shareholders',
        'Shows capital allocation priorities',
        totalReturn > fcf ? 'Unsustainable if exceeds FCF' : 'Sustainable from operations',
        'Key component of total returns'
      ],
      recommendation: returnYield >= 3 && totalReturn <= fcf
        ? 'Strong, sustainable shareholder returns.'
        : returnYield >= 1.5
        ? 'Moderate returns. Room for improvement.'
        : 'Low shareholder returns. Review capital allocation.'
    }
  })

  // 5. Management Alignment (simplified - would need insider ownership data)
  const stockBasedComp = Math.abs(data.ttmIncome?.stockBasedCompensation || 0)
  const sbcToRevenue = data.ttmIncome?.revenue > 0 ? (stockBasedComp / data.ttmIncome.revenue) * 100 : 0

  checks.push({
    id: 'management-alignment',
    name: 'Management Alignment',
    status: sbcToRevenue <= 2 ? 'pass' : sbcToRevenue <= 5 ? 'warning' : 'fail',
    value: sbcToRevenue > 0 ? `${sbcToRevenue.toFixed(1)}% SBC` : 'Low SBC',
    details: 'Stock compensation',
    explanation: {
      whatWeCheck: 'Is management compensation reasonable and aligned with shareholders?',
      numbers: [
        { label: 'Stock-Based Comp', value: formatCurrency(stockBasedComp) },
        { label: 'As % of Revenue', value: `${sbcToRevenue.toFixed(1)}%` },
        { label: 'Per Share Impact', value: `$${(stockBasedComp / currentShares).toFixed(2)}` }
      ],
      plainEnglish: sbcToRevenue <= 2
        ? `Low stock compensation at ${sbcToRevenue.toFixed(1)}% of revenue - management not overpaid.`
        : sbcToRevenue <= 5
        ? `Moderate ${sbcToRevenue.toFixed(1)}% stock comp - watch for dilution.`
        : `High ${sbcToRevenue.toFixed(1)}% stock comp - excessive management pay!`,
      whyItMatters: [
        'High SBC dilutes shareholders',
        'Shows if management is overpaid',
        'Affects true profitability',
        'Should align with performance'
      ],
      recommendation: sbcToRevenue <= 2
        ? 'Reasonable compensation structure.'
        : sbcToRevenue <= 5
        ? 'Monitor dilution from stock comp.'
        : 'Excessive stock compensation. Red flag.'
    }
  })

  return checks
}
