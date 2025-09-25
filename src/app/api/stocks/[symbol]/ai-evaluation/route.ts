import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Valuation Steps Template
const VALUATION_STEPS_TEMPLATE = `
# Stock Evaluation Template (7-Step Framework)

**Instruction:** Evaluate the stock {TICKER} using the 7-step long-term investing framework. For Step 4, use the sector-specific valuation metrics table to compare the stock against historical data and peers.

## 1️⃣ Financial Health
- Debt-to-Equity, Net Debt/EBITDA
- Current Ratio / Quick Ratio, Interest coverage
- Cash strength: cash vs debt, buybacks vs dilution
- Dividend sustainability (if applicable)

## 2️⃣ Consistent Growth
- Revenue growth over 5+ years
- Net income, EPS, Free Cash Flow (FCF), Operating Cash Flow (OCF) trends
- Profit margins: gross, operating, net
- ROE & ROIC trends

## 3️⃣ Competitive Advantage (Moat)
- Moat type: brand, patents, network effects, switching costs, regulatory
- Quantify moat: ROIC vs cost of capital, customer retention
- Pricing power or market share

## 4️⃣ Valuation vs History (Sector-Specific)
Use the table below to select metrics for the sector:

| Sector / Industry | Best Metric(s) | Why |
|-----------------|----------------|-----|
| Banks & Lenders | P/E, P/B | Earnings reflect spread-based business; book value supports lending capacity. |
| Insurance | P/E, P/B, Combined Ratio | Earnings & book equity matter, plus underwriting efficiency. |
| Consumer Staples | P/FCF, EV/EBITDA | Strong stable FCF; EBITDA smooths accounting differences. |
| Mature Tech / SaaS | P/FCF, EV/FCF | FCF drives buybacks/dividends; less noisy than earnings. |
| Retail / E-commerce | P/OCF, EV/EBITDA | OCF captures true cash; earnings often suppressed. |
| Energy | EV/EBITDA, P/CF | Commodity cycles distort earnings; cash flow better shows cycle strength. |
| Utilities | P/E, Dividend Yield, EV/EBITDA | Regulated earnings are stable; yield + steady cash. |
| Industrials | EV/EBITDA, P/E | Capital-intensive; EBITDA and earnings matter. |
| Real Estate / REITs | P/FFO | Net income distorted by depreciation; FFO reflects distributable cash. |
| Healthcare / Pharma | P/E, EV/EBITDA | Patents and R&D matter; earnings and EBITDA reflect long-term profitability. |
| High-Growth Tech (Unprofitable) | EV/Sales, Gross Margin | No earnings; sales multiples are a proxy. |

- Compare current metrics to 5-year & 10-year historical averages
- Compare metrics to sector / industry peers
- Highlight if stock is undervalued, fairly valued, or overvalued

## 5️⃣ Valuation vs Future
- Discounted Cash Flow (DCF) or intrinsic value estimate
- Margin of safety
- Base, bull, and bear scenarios

## 6️⃣ Timing / Entry Point
- Technical support/resistance
- Trend lines, moving averages
- RSI or momentum indicators
- Suggest favorable entry points

## 7️⃣ Short-Term Events vs Long-Term Fundamentals
- Identify short-term events: regulatory, earnings, M&A, sector volatility
- Explain if they affect long-term business health

**Output Requirements:**
- Provide a clear recommendation: Buy / Hold / Avoid with reasoning
- Summarize key points in 3-5 bullet points
- Identify top 3 risks and opportunities
- Keep the analysis concise but comprehensive
`

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { symbol: symbolParam } = await params
    const symbol = symbolParam.toUpperCase()
    const { stockData, financialStatements, companyProfile, moatAnalysis, valuation } = await request.json()

    // Check if XAI API key is configured
    const xaiApiKey = process.env.XAI_API_KEY
    if (!xaiApiKey) {
      console.error('[AI Evaluation] XAI_API_KEY not configured')
      return NextResponse.json(
        { error: 'AI evaluation service not configured' },
        { status: 503 }
      )
    }

    // Helper function to safely calculate ratios
    const safeRatio = (numerator: number | undefined, denominator: number | undefined, defaultValue = 0) => {
      if (!numerator || !denominator || denominator === 0) return defaultValue
      const ratio = numerator / denominator
      return isFinite(ratio) ? ratio : defaultValue
    }

    // Prepare the context for AI evaluation
    const balanceSheet = financialStatements?.balanceSheets?.annual?.[0]
    const incomeStatement = financialStatements?.incomeStatements?.annual?.[0]
    
    const context = {
      symbol,
      currentPrice: stockData?.quote?.price || stockData?.quote?.regularMarketPrice || 0,
      marketCap: stockData?.quote?.marketCap || 0,
      peRatio: stockData?.quote?.trailingPE || stockData?.quote?.forwardPE || 0,
      pegRatio: stockData?.quote?.pegRatio || 0,
      priceToBook: stockData?.quote?.priceToBook || 0,
      debtToEquity: safeRatio(balanceSheet?.totalDebt, balanceSheet?.totalStockholdersEquity, 0),
      currentRatio: safeRatio(balanceSheet?.totalCurrentAssets, balanceSheet?.totalCurrentLiabilities, 0),
      roe: safeRatio(incomeStatement?.netIncome, balanceSheet?.totalStockholdersEquity, 0),
      revenueGrowth: stockData?.financials?.revenueGrowth || 0,
      profitMargin: stockData?.financials?.profitMargin || 0,
      sector: companyProfile?.sector || stockData?.quote?.sector || 'Unknown',
      industry: companyProfile?.industry || stockData?.quote?.industry || 'Unknown',
      moatScore: moatAnalysis?.overallScore || 0,
      moatStrength: moatAnalysis?.strength || 'Unknown',
      intrinsicValue: valuation?.fairValue || 0,
      upside: valuation?.upside || 0,
      businessSummary: companyProfile?.businessSummary || '',
    }

    // Format the prompt with the template and context
    const prompt = VALUATION_STEPS_TEMPLATE.replace('{TICKER}', symbol) + `

Stock Context:
- Current Price: $${context.currentPrice > 0 ? context.currentPrice.toFixed(2) : 'N/A'}
- Market Cap: ${context.marketCap > 0 ? `$${(context.marketCap / 1e9).toFixed(2)}B` : 'N/A'}
- P/E Ratio: ${context.peRatio > 0 ? context.peRatio.toFixed(2) : 'N/A'}
- PEG Ratio: ${context.pegRatio > 0 ? context.pegRatio.toFixed(2) : 'N/A'}
- Price to Book: ${context.priceToBook > 0 ? context.priceToBook.toFixed(2) : 'N/A'}
- Debt to Equity: ${context.debtToEquity > 0 ? context.debtToEquity.toFixed(2) : 'N/A'}
- Current Ratio: ${context.currentRatio > 0 ? context.currentRatio.toFixed(2) : 'N/A'}
- ROE: ${context.roe !== 0 ? `${(context.roe * 100).toFixed(1)}%` : 'N/A'}
- Revenue Growth: ${context.revenueGrowth !== 0 ? `${(context.revenueGrowth * 100).toFixed(1)}%` : 'N/A'}
- Profit Margin: ${context.profitMargin !== 0 ? `${(context.profitMargin * 100).toFixed(1)}%` : 'N/A'}
- Sector: ${context.sector}
- Industry: ${context.industry}
- Moat Score: ${context.moatScore}/100 (${context.moatStrength})
- Intrinsic Value: ${context.intrinsicValue > 0 ? `$${context.intrinsicValue.toFixed(2)}` : 'N/A'}
- Upside: ${context.upside !== 0 ? `${context.upside.toFixed(1)}%` : 'N/A'}
- Business: ${context.businessSummary ? context.businessSummary.substring(0, 200) + '...' : 'N/A'}

Provide a structured JSON response with the following format:
{
  "recommendation": "Buy/Hold/Avoid",
  "summary": "Brief 1-2 sentence summary of the investment thesis",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "risks": ["Risk 1", "Risk 2", "Risk 3"],
  "opportunities": ["Opportunity 1", "Opportunity 2", "Opportunity 3"],
  "steps": {
    "financialHealth": {
      "title": "1️⃣ Financial Health",
      "analysis": "Analysis text",
      "score": 0-100,
      "metrics": { "metric1": "value1", "metric2": "value2" }
    },
    "consistentGrowth": {
      "title": "2️⃣ Consistent Growth",
      "analysis": "Analysis text",
      "score": 0-100,
      "metrics": { "metric1": "value1", "metric2": "value2" }
    },
    "competitiveAdvantage": {
      "title": "3️⃣ Competitive Advantage (Moat)",
      "analysis": "Analysis text",
      "score": 0-100,
      "metrics": { "metric1": "value1", "metric2": "value2" }
    },
    "valuationVsHistory": {
      "title": "4️⃣ Valuation vs History",
      "analysis": "Analysis text",
      "score": 0-100,
      "metrics": { "metric1": "value1", "metric2": "value2" }
    },
    "valuationVsFuture": {
      "title": "5️⃣ Valuation vs Future",
      "analysis": "Analysis text",
      "score": 0-100,
      "metrics": { "metric1": "value1", "metric2": "value2" }
    },
    "timingEntry": {
      "title": "6️⃣ Timing / Entry Point",
      "analysis": "Analysis text",
      "score": 0-100,
      "metrics": { "metric1": "value1", "metric2": "value2" }
    },
    "shortTermVsLongTerm": {
      "title": "7️⃣ Short-Term Events vs Long-Term Fundamentals",
      "analysis": "Analysis text",
      "score": 0-100,
      "metrics": { "metric1": "value1", "metric2": "value2" }
    }
  }
}`

    console.log(`[AI Evaluation] Calling XAI API for ${symbol}`)
    console.log('[AI Evaluation] Context values:', {
      symbol,
      hasFinancialStatements: !!financialStatements,
      hasBalanceSheet: !!balanceSheet,
      hasIncomeStatement: !!incomeStatement,
      currentPrice: context.currentPrice,
      debtToEquity: context.debtToEquity,
      currentRatio: context.currentRatio,
      roe: context.roe,
    })
    
    // Call XAI API
    const xaiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${xaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [
          {
            role: 'system',
            content: 'You are a professional stock analyst providing comprehensive investment evaluations. Always respond with valid JSON only, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      })
    })

    if (!xaiResponse.ok) {
      const errorText = await xaiResponse.text()
      console.error('[AI Evaluation] XAI API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to generate AI evaluation' },
        { status: 500 }
      )
    }

    const xaiData = await xaiResponse.json()
    const aiResponseText = xaiData.choices[0]?.message?.content || ''
    
    // Parse the AI response
    let evaluation
    try {
      // Remove any potential markdown formatting
      const cleanedResponse = aiResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      evaluation = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('[AI Evaluation] Failed to parse AI response:', parseError)
      console.error('[AI Evaluation] Raw response:', aiResponseText)
      return NextResponse.json(
        { error: 'Failed to parse AI evaluation response' },
        { status: 500 }
      )
    }

    console.log(`[AI Evaluation] Successfully generated evaluation for ${symbol}`)
    
    return NextResponse.json({ 
      evaluation,
      success: true 
    })

  } catch (error) {
    console.error('[AI Evaluation] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate AI evaluation' },
      { status: 500 }
    )
  }
}
