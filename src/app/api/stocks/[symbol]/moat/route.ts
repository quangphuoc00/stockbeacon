import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AIMotAnalysisService } from '@/lib/services/ai-moat.service';
import { SECEdgarService } from '@/lib/services/sec-edgar.service';
import { YahooFinanceService } from '@/lib/services/yahoo-finance.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    // Temporarily skip authentication for testing
    // TODO: Re-enable authentication
    // const supabase = createClient();
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // if (authError || !user) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    // Await params as required in Next.js 15
    const resolvedParams = await params;
    const symbol = resolvedParams.symbol.toUpperCase();
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';

    // Fetch company data from Yahoo Finance (using static methods)
    const [quote, financials] = await Promise.all([
      YahooFinanceService.getQuote(symbol),
      YahooFinanceService.getFinancials(symbol),
    ]);

    if (!quote) {
      return NextResponse.json(
        { error: 'Stock not found' },
        { status: 404 }
      );
    }

    // Get competitive information from SEC
    const competitiveInfo = await SECEdgarService.getCompetitiveInfo(symbol);

    // Prepare company data for AI analysis
    const companyData = {
      symbol,
      companyName: quote.name || symbol,
      sector: quote.sector || 'Unknown',
      industry: quote.industry || 'Unknown',
      businessSummary: `${quote.name} is a ${quote.sector || 'company'} in the ${quote.industry || 'industry'} sector with a market cap of $${(quote.marketCap / 1e9).toFixed(1)}B.`,
      grossMargins: financials?.grossMargin,
      operatingMargins: financials?.operatingMargin,
      profitMargins: financials?.profitMargin,
      marketCap: quote.marketCap,
      employees: undefined, // Not available from current data
      revenueGrowth: financials?.revenueGrowth,
      competitorsList: competitiveInfo.competitors,
    };

    // Get AI moat analysis
    const moatAnalysis = await AIMotAnalysisService.getMoatAnalysis(
      symbol,
      companyData,
      forceRefresh
    );

    // Get SEC filings for additional context
    const [overview, recentFilings] = await Promise.all([
      SECEdgarService.getCompanyOverview(symbol),
      SECEdgarService.getRecentFilings(symbol),
    ]);

    return NextResponse.json({
      moatAnalysis,
      secData: {
        overview,
        recentFilings: recentFilings.slice(0, 5), // Return only the 5 most recent filings
      },
      companyData: {
        name: companyData.companyName,
        sector: companyData.sector,
        industry: companyData.industry,
        marketCap: companyData.marketCap,
        employees: companyData.employees,
        competitors: companyData.competitorsList,
      },
    });
  } catch (error) {
    console.error('Moat analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moat analysis' },
      { status: 500 }
    );
  }
}
