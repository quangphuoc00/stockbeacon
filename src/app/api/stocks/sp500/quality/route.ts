import { NextRequest, NextResponse } from 'next/server'
import { SP500GitHubService } from '@/lib/services/sp500-github.service'
import { ScorePersistenceService } from '@/lib/services/score-persistence.service'
import { YahooFinanceService } from '@/lib/services/yahoo-finance.service'
import { ValuationService, ValuationCategory } from '@/lib/services/valuation.service'
import { StockScore, StockQuote } from '@/types/stock'

interface StockWithValuation {
  symbol: string
  companyName: string
  sector: string
  currentPrice: number
  priceChange: number
  priceChangePercent: number
  score: number
  businessQualityScore: number
  timingScore: number
  recommendation: string
  fairValue: number
  discountPremium: number
  peRatio: number | null
  marketCap: number
  calculatedAt: Date
}

interface QualityStocksResponse {
  highly_undervalued: StockWithValuation[]
  undervalued: StockWithValuation[]
  fairly_valued: StockWithValuation[]
  overvalued: StockWithValuation[]
  highly_overvalued: StockWithValuation[]
  metadata: {
    totalStocks: number
    qualityThreshold: number
    lastUpdated: Date
    fromCache: boolean
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const minBusinessScore = parseInt(searchParams.get('minScore') || '42') // Default 70% of 60
    
    console.log('Fetching S&P 500 quality stocks...')
    
    // Step 1: Get S&P 500 constituents
    const sp500Stocks = await SP500GitHubService.getConstituents()
    const symbols = sp500Stocks.map(s => s.symbol)
    
    // Create a map for quick lookup
    const stockInfoMap = new Map(sp500Stocks.map(s => [s.symbol, s]))
    
    // Step 2: Get quality stocks with scores
    const qualityStocks = await ScorePersistenceService.getSP500QualityStocks(
      symbols,
      minBusinessScore
    )
    
    console.log(`Found ${qualityStocks.length} quality stocks out of ${symbols.length} S&P 500 stocks`)
    
    // Step 3: Get current prices for quality stocks
    const qualitySymbols = qualityStocks.map(s => s.symbol)
    const quotes = await YahooFinanceService.getQuotes(qualitySymbols)
    
    // Step 4: Calculate valuation categories and group stocks
    const stocksWithValuation: StockWithValuation[] = []
    const categorizedStocks: QualityStocksResponse = {
      highly_undervalued: [],
      undervalued: [],
      fairly_valued: [],
      overvalued: [],
      highly_overvalued: [],
      metadata: {
        totalStocks: 0,
        qualityThreshold: minBusinessScore,
        lastUpdated: new Date(),
        fromCache: true // Assuming scores are from cache/DB
      }
    }
    
    // Process each quality stock
    for (const stock of qualityStocks) {
      const quote = quotes.get(stock.symbol)
      const stockInfo = stockInfoMap.get(stock.symbol)
      
      if (!quote || !stockInfo) continue
      
      // Calculate valuation category
      let valuationCategory: ValuationCategory | null = null
      
      try {
        // Simple valuation based on score components
        // In a full implementation, this would use the comprehensive valuation service
        const fairValue = calculateSimpleFairValue(quote, stock)
        const confidence = stock.moatScore > 15 ? 'high' : stock.moatScore > 10 ? 'medium' : 'low'
        
        valuationCategory = ValuationService.getValuationCategory(
          quote.price,
          fairValue,
          confidence
        )
      } catch (error) {
        console.error(`Error calculating valuation for ${stock.symbol}:`, error)
        continue
      }
      
      if (!valuationCategory) continue
      
      const stockData: StockWithValuation = {
        symbol: stock.symbol,
        companyName: stockInfo.companyName,
        sector: stockInfo.sector,
        currentPrice: quote.price,
        priceChange: quote.change,
        priceChangePercent: quote.changePercent,
        score: stock.score,
        businessQualityScore: stock.businessQualityScore,
        timingScore: stock.timingScore,
        recommendation: stock.recommendation,
        fairValue: valuationCategory.fairValue,
        discountPremium: valuationCategory.discountPremium,
        peRatio: quote.peRatio,
        marketCap: quote.marketCap,
        calculatedAt: stock.calculatedAt
      }
      
      // Add to appropriate category
      categorizedStocks[valuationCategory.level].push(stockData)
      stocksWithValuation.push(stockData)
    }
    
    // Sort each category by score (highest first)
    Object.keys(categorizedStocks).forEach(key => {
      if (Array.isArray(categorizedStocks[key as keyof QualityStocksResponse])) {
        (categorizedStocks[key as keyof QualityStocksResponse] as StockWithValuation[])
          .sort((a, b) => b.score - a.score)
      }
    })
    
    categorizedStocks.metadata.totalStocks = stocksWithValuation.length
    
    return NextResponse.json({
      success: true,
      data: categorizedStocks,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Error fetching S&P 500 quality stocks:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch quality stocks',
        message: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

/**
 * Simple fair value calculation based on score components
 * This is a placeholder - in production, use comprehensive valuation
 */
function calculateSimpleFairValue(quote: StockQuote, score: StockScore): number {
  // Base fair value on current price adjusted by valuation score
  const valuationAdjustment = (score.valuationScore - 10) / 10 // -1 to +1
  const fairValue = quote.price * (1 - valuationAdjustment * 0.2) // Max 20% adjustment
  
  return Math.max(fairValue, quote.price * 0.5) // Never less than 50% of current price
}
