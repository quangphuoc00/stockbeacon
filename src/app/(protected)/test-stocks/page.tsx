'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercentage, getScoreColor } from '@/lib/utils'

interface StockData {
  symbol: string
  quote: any
  financials: any
  score: any
  error?: string
}

export default function TestStocksPage() {
  const [symbol, setSymbol] = useState('AAPL')
  const [loading, setLoading] = useState(false)
  const [stockData, setStockData] = useState<StockData | null>(null)

  const fetchStockData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/stocks/${symbol.toUpperCase()}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stock data')
      }
      
      setStockData(data)
    } catch (error) {
      console.error('Error fetching stock data:', error)
      setStockData({
        symbol: symbol.toUpperCase(),
        quote: null,
        financials: null,
        score: null,
        error: error instanceof Error ? error.message : 'Failed to fetch stock data'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Stock Data Engine Test</h1>
      
      {/* Search Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Stock API</CardTitle>
          <CardDescription>Enter a stock symbol to fetch comprehensive data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter stock symbol (e.g., AAPL, GOOGL)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchStockData()}
            />
            <Button onClick={fetchStockData} disabled={loading}>
              {loading ? 'Loading...' : 'Fetch Data'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {stockData && (
        <>
          {stockData.error ? (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-600">{stockData.error}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Quote Data */}
              {stockData.quote && (
                <Card>
                  <CardHeader>
                    <CardTitle>Quote Data</CardTitle>
                    <CardDescription>{stockData.quote.longName}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-medium">{formatCurrency(stockData.quote.regularMarketPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Change:</span>
                      <span className={`font-medium ${stockData.quote.regularMarketChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(stockData.quote.regularMarketChange)} ({formatPercentage(stockData.quote.regularMarketChangePercent)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Market Cap:</span>
                      <span className="font-medium">{formatCurrency(stockData.quote.marketCap)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Volume:</span>
                      <span className="font-medium">{stockData.quote.regularMarketVolume?.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Financial Data */}
              {stockData.financials && (
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">P/E Ratio:</span>
                      <span className="font-medium">{stockData.financials.peRatio?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">EPS:</span>
                      <span className="font-medium">{formatCurrency(stockData.financials.eps)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revenue Growth:</span>
                      <span className="font-medium">{formatPercentage(stockData.financials.revenueGrowth * 100)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profit Margin:</span>
                      <span className="font-medium">{formatPercentage(stockData.financials.profitMargin * 100)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* StockBeacon Score */}
              {stockData.score && (
                <Card>
                  <CardHeader>
                    <CardTitle>StockBeacon Score</CardTitle>
                    <div className="mt-2">
                      <Badge className={`text-lg px-3 py-1 ${getScoreColor(stockData.score.overall)}`}>
                        Score: {stockData.score.overall}/100
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Business Quality</span>
                        <span className="text-sm font-medium">{stockData.score.businessQuality}/60</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(stockData.score.businessQuality / 60) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Timing Opportunity</span>
                        <span className="text-sm font-medium">{stockData.score.timingOpportunity}/40</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(stockData.score.timingOpportunity / 40) * 100}%` }}
                        />
                      </div>
                    </div>
                    {stockData.score.recommendation && (
                      <div className="pt-2 border-t">
                        <p className="text-sm">
                          <span className="font-medium">Recommendation:</span> {stockData.score.recommendation}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Technical Indicators */}
              {stockData.score?.technicalIndicators && (
                <Card>
                  <CardHeader>
                    <CardTitle>Technical Indicators</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">RSI (14):</span>
                      <span className="font-medium">
                        {stockData.score.technicalIndicators.rsi?.toFixed(2) || 'N/A'}
                        {stockData.score.technicalIndicators.rsi && (
                          <Badge className="ml-2" variant={
                            stockData.score.technicalIndicators.rsi > 70 ? 'destructive' :
                            stockData.score.technicalIndicators.rsi < 30 ? 'default' : 'secondary'
                          }>
                            {stockData.score.technicalIndicators.rsi > 70 ? 'Overbought' :
                             stockData.score.technicalIndicators.rsi < 30 ? 'Oversold' : 'Neutral'}
                          </Badge>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SMA 20:</span>
                      <span className="font-medium">{formatCurrency(stockData.score.technicalIndicators.sma20)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SMA 50:</span>
                      <span className="font-medium">{formatCurrency(stockData.score.technicalIndicators.sma50)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Support:</span>
                      <span className="font-medium">{formatCurrency(stockData.score.technicalIndicators.support)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Resistance:</span>
                      <span className="font-medium">{formatCurrency(stockData.score.technicalIndicators.resistance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trend:</span>
                      <Badge variant={
                        stockData.score.technicalIndicators.trend === 'bullish' ? 'default' :
                        stockData.score.technicalIndicators.trend === 'bearish' ? 'destructive' : 'secondary'
                      }>
                        {stockData.score.technicalIndicators.trend}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
