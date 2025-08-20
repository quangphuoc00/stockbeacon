import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AIMotAnalysisService } from '@/lib/services/ai-moat.service';
import { SECEdgarService } from '@/lib/services/sec-edgar.service';
import { YahooFinanceService } from '@/lib/services/yahoo-finance.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
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

    const symbol = params.symbol.toUpperCase();
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';

    // Fetch company data from Yahoo Finance
    const yahooService = new YahooFinanceService();
    const [quote, profile] = await Promise.all([
      yahooService.getQuote(symbol),
      yahooService.getCompanyProfile(symbol),
    ]);

    if (!quote || !profile) {
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
      companyName: quote.name || profile.companyName || symbol,
      sector: profile.sector || 'Unknown',
      industry: profile.industry || 'Unknown',
      businessSummary: profile.longBusinessSummary || profile.businessSummary || '',
      grossMargins: profile.grossMargins,
      operatingMargins: profile.operatingMargins,
      profitMargins: profile.profitMargins,
      marketCap: quote.marketCap,
      employees: profile.fullTimeEmployees,
      revenueGrowth: profile.revenueGrowth,
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
