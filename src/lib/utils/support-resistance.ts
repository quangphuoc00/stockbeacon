/**
 * Utility functions for calculating support and resistance levels
 */

interface PriceData {
  time: any
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface SupportResistanceLevel {
  price: number
  type: 'support' | 'resistance'
  strength: number // 1-3, where 3 is strongest
  method: 'swing' | 'pivot' | 'volume' | 'psychological'
}

/**
 * Calculate support and resistance levels using multiple methods
 */
export function calculateSupportResistance(data: PriceData[]): SupportResistanceLevel[] {
  if (!data || data.length < 20) return []

  const levels: SupportResistanceLevel[] = []
  
  // 1. Swing High/Low Method
  const swingLevels = findSwingLevels(data)
  levels.push(...swingLevels)
  
  // 2. Pivot Points
  const pivotLevels = calculatePivotPoints(data)
  levels.push(...pivotLevels)
  
  // 3. Volume-based levels
  const volumeLevels = findVolumeLevels(data)
  levels.push(...volumeLevels)
  
  // 4. Psychological levels (round numbers)
  const psychLevels = findPsychologicalLevels(data)
  levels.push(...psychLevels)
  
  // Merge nearby levels and calculate strength
  const mergedLevels = mergeLevels(levels, data)
  
  // Sort by price descending
  return mergedLevels.sort((a, b) => b.price - a.price)
}

/**
 * Find swing highs and lows
 */
function findSwingLevels(data: PriceData[], lookback: number = 10): SupportResistanceLevel[] {
  const levels: SupportResistanceLevel[] = []
  
  for (let i = lookback; i < data.length - lookback; i++) {
    const current = data[i]
    let isSwingHigh = true
    let isSwingLow = true
    
    // Check if current is swing high
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && data[j].high >= current.high) {
        isSwingHigh = false
      }
      if (j !== i && data[j].low <= current.low) {
        isSwingLow = false
      }
    }
    
    if (isSwingHigh) {
      levels.push({
        price: current.high,
        type: 'resistance',
        strength: 2,
        method: 'swing'
      })
    }
    
    if (isSwingLow) {
      levels.push({
        price: current.low,
        type: 'support',
        strength: 2,
        method: 'swing'
      })
    }
  }
  
  return levels
}

/**
 * Calculate traditional pivot points
 */
function calculatePivotPoints(data: PriceData[]): SupportResistanceLevel[] {
  if (data.length < 1) return []
  
  // Use the most recent complete period
  const lastData = data[data.length - 1]
  const high = lastData.high
  const low = lastData.low
  const close = lastData.close
  
  const pivot = (high + low + close) / 3
  const r1 = 2 * pivot - low
  const s1 = 2 * pivot - high
  const r2 = pivot + (high - low)
  const s2 = pivot - (high - low)
  const r3 = high + 2 * (pivot - low)
  const s3 = low - 2 * (high - pivot)
  
  return [
    { price: r3, type: 'resistance', strength: 1, method: 'pivot' },
    { price: r2, type: 'resistance', strength: 2, method: 'pivot' },
    { price: r1, type: 'resistance', strength: 3, method: 'pivot' },
    { price: s1, type: 'support', strength: 3, method: 'pivot' },
    { price: s2, type: 'support', strength: 2, method: 'pivot' },
    { price: s3, type: 'support', strength: 1, method: 'pivot' }
  ]
}

/**
 * Find levels with high volume
 */
function findVolumeLevels(data: PriceData[]): SupportResistanceLevel[] {
  if (!data[0]?.volume) return []
  
  const levels: SupportResistanceLevel[] = []
  const volumeThreshold = calculateVolumeThreshold(data)
  
  for (let i = 1; i < data.length - 1; i++) {
    const current = data[i]
    if (!current.volume) continue
    
    // High volume spike
    if (current.volume > volumeThreshold) {
      // Check if price reversed after high volume
      const nextBar = data[i + 1]
      const prevBar = data[i - 1]
      
      // Potential resistance if price went down after
      if (current.close > prevBar.close && nextBar.close < current.close) {
        levels.push({
          price: current.high,
          type: 'resistance',
          strength: 2,
          method: 'volume'
        })
      }
      
      // Potential support if price went up after
      if (current.close < prevBar.close && nextBar.close > current.close) {
        levels.push({
          price: current.low,
          type: 'support',
          strength: 2,
          method: 'volume'
        })
      }
    }
  }
  
  return levels
}

/**
 * Calculate volume threshold (2x average)
 */
function calculateVolumeThreshold(data: PriceData[]): number {
  const volumes = data.filter(d => d.volume).map(d => d.volume!)
  if (volumes.length === 0) return 0
  
  const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
  return avgVolume * 2
}

/**
 * Find psychological levels (round numbers)
 */
function findPsychologicalLevels(data: PriceData[]): SupportResistanceLevel[] {
  if (data.length === 0) return []
  
  const levels: SupportResistanceLevel[] = []
  const currentPrice = data[data.length - 1].close
  const priceRange = Math.max(...data.map(d => d.high)) - Math.min(...data.map(d => d.low))
  
  // Determine round number interval based on price
  let interval: number
  if (currentPrice < 10) {
    interval = 1
  } else if (currentPrice < 100) {
    interval = 5
  } else if (currentPrice < 1000) {
    interval = 10
  } else {
    interval = 50
  }
  
  // Find round numbers within price range
  const minPrice = Math.min(...data.map(d => d.low))
  const maxPrice = Math.max(...data.map(d => d.high))
  
  for (let price = Math.floor(minPrice / interval) * interval; price <= maxPrice; price += interval) {
    if (price >= minPrice && price <= maxPrice) {
      // Determine if support or resistance based on current price
      const type = price < currentPrice ? 'support' : 'resistance'
      levels.push({
        price,
        type,
        strength: 1,
        method: 'psychological'
      })
    }
  }
  
  return levels
}

/**
 * Merge nearby levels and calculate combined strength
 */
function mergeLevels(levels: SupportResistanceLevel[], data: PriceData[]): SupportResistanceLevel[] {
  if (levels.length === 0) return []
  
  const currentPrice = data[data.length - 1].close
  const priceRange = Math.max(...data.map(d => d.high)) - Math.min(...data.map(d => d.low))
  const mergeTolerance = priceRange * 0.005 // 0.5% of price range
  
  const merged: SupportResistanceLevel[] = []
  const used = new Set<number>()
  
  for (let i = 0; i < levels.length; i++) {
    if (used.has(i)) continue
    
    const current = levels[i]
    const nearbyLevels = [current]
    used.add(i)
    
    // Find all levels within merge tolerance
    for (let j = i + 1; j < levels.length; j++) {
      if (used.has(j)) continue
      
      const other = levels[j]
      if (Math.abs(current.price - other.price) <= mergeTolerance) {
        nearbyLevels.push(other)
        used.add(j)
      }
    }
    
    // Calculate merged level
    const avgPrice = nearbyLevels.reduce((sum, l) => sum + l.price, 0) / nearbyLevels.length
    const maxStrength = Math.min(3, Math.max(...nearbyLevels.map(l => l.strength)) + Math.floor(nearbyLevels.length / 2))
    const type = avgPrice < currentPrice ? 'support' : 'resistance'
    const methods = [...new Set(nearbyLevels.map(l => l.method))]
    
    merged.push({
      price: avgPrice,
      type,
      strength: maxStrength,
      method: methods[0] // Use primary method
    })
  }
  
  // Keep only the strongest levels (top 2-3 support and resistance each)
  // Prioritize levels that are close to current price
  
  const resistanceLevels = merged
    .filter(l => l.type === 'resistance')
    .sort((a, b) => {
      // First sort by strength, then by proximity to current price
      if (b.strength !== a.strength) return b.strength - a.strength
      return Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice)
    })
    .slice(0, 3)
  
  const supportLevels = merged
    .filter(l => l.type === 'support')
    .sort((a, b) => {
      // First sort by strength, then by proximity to current price
      if (b.strength !== a.strength) return b.strength - a.strength
      return Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice)
    })
    .slice(0, 3)
  
  return [...resistanceLevels, ...supportLevels]
}

/**
 * Format price for display
 */
export function formatSupportResistancePrice(price: number): string {
  if (price < 10) {
    return price.toFixed(2)
  } else if (price < 100) {
    return price.toFixed(1)
  } else {
    return price.toFixed(0)
  }
}
