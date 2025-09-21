/**
 * Utility functions for formatting financial statement data
 */

/**
 * Format large financial numbers with appropriate units (K, M, B, T)
 */
export function formatFinancialNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  
  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  
  if (absValue >= 1e12) {
    return `${sign}${(absValue / 1e12).toFixed(2)}T`
  } else if (absValue >= 1e9) {
    return `${sign}${(absValue / 1e9).toFixed(2)}B`
  } else if (absValue >= 1e6) {
    return `${sign}${(absValue / 1e6).toFixed(2)}M`
  } else if (absValue >= 1e3) {
    return `${sign}${(absValue / 1e3).toFixed(2)}K`
  } else {
    return `${sign}${absValue.toFixed(2)}`
  }
}

/**
 * Format percentage values
 */
export function formatPercentageValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `${(value * 100).toFixed(2)}%`
}

/**
 * Format per share values
 */
export function formatPerShare(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `$${value.toFixed(2)}`
}

/**
 * Format date for financial periods
 */
export function formatFinancialDate(date: Date | string | null | undefined, fiscalQuarter?: string | number, fiscalYear?: number, isAnnual?: boolean): string {
  if (!date) return '-'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const year = fiscalYear || dateObj.getFullYear()
  
  // For annual periods, just show the year
  if (isAnnual) {
    return year.toString()
  }
  
  // If fiscal quarter is provided, use it
  if (fiscalQuarter) {
    return `Q${fiscalQuarter} ${year}`
  }
  
  // Otherwise, determine quarter based on month
  const month = dateObj.getMonth()
  const quarter = Math.floor(month / 3) + 1
  
  return `Q${quarter} ${year}`
}

/**
 * Format fiscal year
 */
export function formatFiscalYear(date: Date | string | null | undefined): string {
  if (!date) return '-'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return `FY ${dateObj.getFullYear()}`
}

/**
 * Calculate year-over-year growth
 */
export function calculateYoYGrowth(current: number | null, previous: number | null): number | null {
  if (!current || !previous || previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

/**
 * Get color class based on value (for positive/negative indicators)
 */
export function getValueColorClass(value: number | null | undefined, inverse: boolean = false): string {
  if (value === null || value === undefined) return ''
  
  if (inverse) {
    return value > 0 ? 'text-red-600' : 'text-green-600'
  }
  
  return value > 0 ? 'text-green-600' : 'text-red-600'
}

/**
 * Format statement line item name for display
 */
export function formatLineItemName(key: string): string {
  // Convert camelCase to Title Case
  const result = key.replace(/([A-Z])/g, ' $1').trim()
  return result.charAt(0).toUpperCase() + result.slice(1)
}

/**
 * Get period label (Annual/Quarterly/TTM)
 */
export function getPeriodLabel(isAnnual: boolean, isTTM: boolean = false): string {
  if (isTTM) return 'TTM'
  return isAnnual ? 'Annual' : 'Quarterly'
}
