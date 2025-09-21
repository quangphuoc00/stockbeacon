# API Update for US Stocks Only Focus

## Current Implementation

The current `/api/stocks/[symbol]/financial-statements` endpoint uses:
1. SEC EDGAR as primary source
2. Yahoo Finance as fallback for non-US companies

## Recommended Changes

### 1. Update the API Route

```typescript
// src/app/api/stocks/[symbol]/financial-statements/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { SECEdgarService } from '@/lib/services/sec-edgar.service'
import { getRedisInstance } from '@/lib/utils/redis'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params
  const symbol = rawSymbol.toUpperCase()
  
  try {
    // Check Redis cache first
    const redis = getRedisInstance()
    const cacheKey = `financial_statements:${symbol}`
    
    try {
      const cachedData = await redis.get(cacheKey)
      if (cachedData) {
        console.log(`Returning cached financial statements for ${symbol}`)
        return NextResponse.json(JSON.parse(cachedData))
      }
    } catch (cacheError) {
      console.error('Redis cache error:', cacheError)
      // Continue without cache
    }
    
    // Check if this is a US-listed company
    const cik = await SECEdgarService.getCIK(symbol)
    if (!cik) {
      return NextResponse.json(
        { 
          error: 'Symbol not found or not a US-listed company',
          message: 'StockBeacon currently supports US-listed companies only'
        },
        { status: 404 }
      )
    }
    
    // Fetch from SEC EDGAR
    console.log(`[API] Fetching financial statements from SEC EDGAR for ${symbol}`)
    const statements = await SECEdgarService.getFinancialStatements(symbol)
    
    if (!statements) {
      return NextResponse.json(
        { error: 'Failed to retrieve financial statements' },
        { status: 500 }
      )
    }
    
    // Cache the results for 1 day
    try {
      await redis.setex(cacheKey, 86400, JSON.stringify(statements))
    } catch (cacheError) {
      console.error('Failed to cache financial statements:', cacheError)
      // Continue without caching
    }
    
    return NextResponse.json(statements)
  } catch (error) {
    console.error(`Error fetching financial statements for ${symbol}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch financial statements' },
      { status: 500 }
    )
  }
}
```

### 2. Update Error Messages in UI

In `financial-statement-table.tsx`, update error handling:

```typescript
// When no data is available
if (!financialStatements) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Statements Not Available</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This symbol is not a US-listed company. StockBeacon currently 
            supports financial analysis for US stocks only (NYSE, NASDAQ, etc.).
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
```

### 3. Add US Stock Validation

Create a helper function to validate US stocks:

```typescript
// src/lib/utils/stock-validation.ts

export async function isUSStock(symbol: string): Promise<boolean> {
  // Check if we can get a CIK (only US companies have CIKs)
  const cik = await SECEdgarService.getCIK(symbol)
  return !!cik
}

export function getStockExchange(symbol: string): string | null {
  // Optional: Add logic to determine exchange if needed
  // This could be enhanced with exchange data
  return null
}
```

### 4. Update Stock Search/Selection

Add filtering to show only US stocks in search results:

```typescript
// When displaying search results
const filteredResults = await Promise.all(
  searchResults.map(async (stock) => {
    const isUS = await isUSStock(stock.symbol)
    return isUS ? stock : null
  })
).then(results => results.filter(Boolean))
```

## Benefits of This Approach

1. **Clear User Expectations**: Users know exactly what's supported
2. **Consistent Data Quality**: Every stock has complete financial data
3. **Better Error Messages**: Clear explanation when non-US stocks are searched
4. **Simplified Codebase**: No need to handle multiple data sources
5. **100% Confidence**: All analyses have maximum confidence

## Migration Notes

1. Remove Yahoo Finance service imports
2. Update any references to international stocks in documentation
3. Consider adding a "Supported Exchanges" section to the UI
4. Update marketing materials to emphasize US stock focus

## Future Considerations

If international support is needed later:
1. Could add separate data providers for specific countries
2. Each country would need its own confidence scoring
3. UI would need to handle varying data completeness
