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
  const { symbol } = await params
  const stockSymbol = symbol.toUpperCase()
  
  // Fetch all data in parallel for faster page load
  const [stockData, moatAnalysis, companyProfile] = await Promise.all([
    fetchStockData(stockSymbol),
    fetchMoatAnalysis(stockSymbol),
    fetchCompanyProfile(stockSymbol)
  ])
  
  if (!stockData) {
    notFound()
  }
  
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
  try {
    console.log(`Fetching stock data for ${symbol}`)
    const stockData = await StockDataService.getStockData(symbol)
    
    // Add stockbeaconScore to match expected format
    if (stockData) {
      return {
        quote: stockData.quote,
        financials: stockData.financials,
        historical: stockData.historical,
        stockbeaconScore: stockData.score
      }
    }
    
    return null
    } catch (error) {
    console.error(`Error fetching stock data for ${symbol}:`, error)
    return null
  }
}

async function fetchMoatAnalysis(symbol: string) {
  try {
    // Only check cache, don't fetch fresh data to keep page load fast
    const cacheKey = `moat_analysis:${symbol}`
    const redis = getRedisInstance()
    
    console.log(`[Page] Checking for cached moat analysis: ${cacheKey}`)
    const cached = await redis.get(cacheKey)
    if (cached) {
      console.log(`[Page] Found cached moat analysis for ${symbol}, score: ${(cached as any).overallScore}/100`)
      return cached as any
    }
    
    console.log(`[Page] No cached moat analysis found for ${symbol}`)
    // Return null and let client fetch it when needed
    return null
  } catch (error) {
    console.error(`Error fetching moat analysis for ${symbol}:`, error)
    return null
  }
}

async function fetchCompanyProfile(symbol: string) {
  try {
    // For now, we'll let the client fetch this
    // In the future, we can implement server-side caching
    return null
  } catch (error) {
    console.error(`Error fetching company profile for ${symbol}:`, error)
    return null
  }
}
