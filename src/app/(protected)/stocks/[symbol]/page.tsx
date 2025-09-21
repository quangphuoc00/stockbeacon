import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RedisCacheService } from '@/lib/services/redis-cache.service'
import { StockDataService } from '@/lib/services/stock-data.service'
import { formatCurrency } from '@/lib/utils'
import { StockDetailsClient } from '@/components/stocks/stock-details-client'
import { getRedisInstance } from '@/lib/utils/redis'

interface StockPageProps {
  params: Promise<{ symbol: string }>
}

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: StockPageProps): Promise<Metadata> {
  const { symbol } = await params
  const stockSymbol = symbol.toUpperCase()
  
  try {
    // Fetch stock data
    const stockData = await StockDataService.getStockData(stockSymbol)
    
    if (!stockData?.quote) {
      return {
        title: `${stockSymbol} - StockBeacon`,
        description: `View real-time stock data and analysis for ${stockSymbol}`
      }
    }
    
    const { quote } = stockData
    const price = quote.price || 0
    const change = quote.changePercent || 0
    
    return {
      title: `${stockSymbol} • ${formatCurrency(price)}`,
      description: `${quote.name || stockSymbol} (${stockSymbol}) stock price, news, and analysis. Current price: ${formatCurrency(price)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)`,
      openGraph: {
        title: `${stockSymbol} - ${quote.name || 'Stock Details'}`,
        description: `Current price: ${formatCurrency(price)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)`,
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: `${stockSymbol} • ${formatCurrency(price)}`,
        description: `${quote.name || stockSymbol} stock analysis on StockBeacon`,
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: `${stockSymbol} - StockBeacon`,
      description: `View real-time stock data and analysis for ${stockSymbol}`
    }
  }
}

export default async function StockPage({ params }: StockPageProps) {
  const startTime = Date.now()
  const { symbol } = await params
  const stockSymbol = symbol.toUpperCase()
  
  console.log(`[StockPage] Loading page for symbol: ${stockSymbol}`)
  console.log(`[StockPage] Request timestamp: ${new Date().toISOString()}`)
  
  // Fetch all data in parallel for faster page load
  console.log(`[StockPage] Starting parallel data fetch for ${stockSymbol}`)
  const [stockData, moatAnalysis, companyProfile] = await Promise.all([
    fetchStockData(stockSymbol),
    fetchMoatAnalysis(stockSymbol),
    fetchCompanyProfile(stockSymbol)
  ])
  
  const fetchTime = Date.now() - startTime
  console.log(`[StockPage] Data fetch completed in ${fetchTime}ms`)
  console.log(`[StockPage] Stock data available: ${!!stockData}`)
  console.log(`[StockPage] Moat analysis available: ${!!moatAnalysis}`)
  console.log(`[StockPage] Company profile available: ${!!companyProfile}`)
  
  if (!stockData) {
    console.error(`[StockPage] No stock data found for ${stockSymbol}, returning 404`)
    notFound()
  }
  
  console.log(`[StockPage] Rendering StockDetailsClient for ${stockSymbol}`)
  return (
    <StockDetailsClient
      symbol={stockSymbol}
      initialStockData={stockData}
      initialMoatAnalysis={moatAnalysis}
      initialCompanyProfile={companyProfile}
    />
  )
}

async function fetchStockData(symbol: string) {
  const startTime = Date.now()
  try {
    console.log(`[fetchStockData] Starting fetch for ${symbol}`)
    const stockData = await StockDataService.getStockData(symbol)
    const fetchTime = Date.now() - startTime
    
    if (stockData) {
      console.log(`[fetchStockData] Successfully fetched data for ${symbol} in ${fetchTime}ms`)
      console.log(`[fetchStockData] Quote data: price=${stockData.quote?.price}, change=${stockData.quote?.changePercent}%`)
      console.log(`[fetchStockData] Has financials: ${!!stockData.financials}`)
      console.log(`[fetchStockData] Has historical data: ${!!stockData.historical}`)
      console.log(`[fetchStockData] StockBeacon score: ${stockData.score}`)
      
      return {
        quote: stockData.quote,
        financials: stockData.financials,
        historical: stockData.historical,
        stockbeaconScore: stockData.score
      }
    }
    
    console.warn(`[fetchStockData] No data returned for ${symbol} after ${fetchTime}ms`)
    return null
  } catch (error) {
    const fetchTime = Date.now() - startTime
    console.error(`[fetchStockData] Error fetching stock data for ${symbol} after ${fetchTime}ms:`, error)
    console.error(`[fetchStockData] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return null
  }
}

async function fetchMoatAnalysis(symbol: string) {
  const startTime = Date.now()
  try {
    // Only check cache, don't fetch fresh data to keep page load fast
    const cacheKey = `moat_analysis:${symbol}`
    const redis = getRedisInstance()
    
    console.log(`[fetchMoatAnalysis] Checking Redis cache for key: ${cacheKey}`)
    const cached = await redis.get(cacheKey)
    const fetchTime = Date.now() - startTime
    
    if (cached) {
      console.log(`[fetchMoatAnalysis] Found cached moat analysis for ${symbol} in ${fetchTime}ms`)
      console.log(`[fetchMoatAnalysis] Moat score: ${(cached as any).overallScore}/100`)
      console.log(`[fetchMoatAnalysis] Has strengths: ${!!(cached as any).strengths?.length}`)
      console.log(`[fetchMoatAnalysis] Has risks: ${!!(cached as any).risks?.length}`)
      return cached as any
    }
    
    console.log(`[fetchMoatAnalysis] No cached moat analysis found for ${symbol} after ${fetchTime}ms`)
    // Return null and let client fetch it when needed
    return null
  } catch (error) {
    const fetchTime = Date.now() - startTime
    console.error(`[fetchMoatAnalysis] Error fetching moat analysis for ${symbol} after ${fetchTime}ms:`, error)
    console.error(`[fetchMoatAnalysis] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return null
  }
}

async function fetchCompanyProfile(symbol: string) {
  const startTime = Date.now()
  try {
    console.log(`[fetchCompanyProfile] Checking for company profile: ${symbol}`)
    // For now, we'll let the client fetch this
    // In the future, we can implement server-side caching
    const fetchTime = Date.now() - startTime
    console.log(`[fetchCompanyProfile] Skipping server-side fetch for ${symbol} (${fetchTime}ms) - will be fetched client-side`)
    return null
  } catch (error) {
    const fetchTime = Date.now() - startTime
    console.error(`[fetchCompanyProfile] Error fetching company profile for ${symbol} after ${fetchTime}ms:`, error)
    return null
  }
}
