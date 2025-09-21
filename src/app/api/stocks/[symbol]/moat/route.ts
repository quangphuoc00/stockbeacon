import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AIMoatAnalysisService } from '@/lib/services/ai-moat.service';
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
    const [quote, financials, companyProfile] = await Promise.all([
      YahooFinanceService.getQuote(symbol),
      YahooFinanceService.getFinancials(symbol),
      YahooFinanceService.getCompanyProfile(symbol),
    ]);

    if (!quote) {
      return NextResponse.json(
        { error: 'Stock not found' },
        { status: 404 }
      );
    }

    // Prepare company data for AI analysis
    const companyData = {
      symbol,
      companyName: quote.name || symbol,
      sector: quote.sector || companyProfile?.sector || 'Unknown',
      industry: quote.industry || companyProfile?.industry || 'Unknown',
      businessSummary: companyProfile?.businessSummary || `${quote.name} is a ${quote.sector || 'company'} in the ${quote.industry || 'industry'} sector with a market cap of $${(quote.marketCap / 1e9).toFixed(1)}B.`,
      grossMargins: financials?.grossMargin ?? undefined,
      operatingMargins: financials?.operatingMargin ?? undefined,
      profitMargins: financials?.profitMargin ?? undefined,
      marketCap: quote.marketCap,
      employees: companyProfile?.fullTimeEmployees || undefined,
      revenueGrowth: financials?.revenueGrowth ?? undefined,
      competitorsList: [], // Yahoo Finance doesn't provide direct competitor data
    };

    // Get AI moat analysis
    const moatAnalysis = await AIMoatAnalysisService.getMoatAnalysis(
      symbol,
      companyData,
      forceRefresh
    );

    // Prepare company overview data from Yahoo Finance
    const overview = companyProfile ? {
      name: companyData.companyName,
      description: companyProfile.businessSummary,
      sector: companyProfile.sector,
      industry: companyProfile.industry,
      website: companyProfile.website,
      address: companyProfile.address ? `${companyProfile.address}, ${companyProfile.city}, ${companyProfile.state} ${companyProfile.zip}` : null,
      phone: companyProfile.phone,
      employees: companyProfile.fullTimeEmployees,
      officers: companyProfile.companyOfficers,
    } : null;
    
    // Note: Yahoo Finance doesn't provide SEC filings directly
    const recentFilings: any[] = [];

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
        businessSummary: companyData.businessSummary,
        marketCap: companyData.marketCap,
        employees: companyData.employees,
        competitors: companyData.competitorsList,
        website: companyProfile?.website || null,
        address: companyProfile?.address ? {
          street: companyProfile.address,
          city: companyProfile.city,
          state: companyProfile.state,
          zip: companyProfile.zip,
          country: companyProfile.country,
        } : null,
        phone: companyProfile?.phone || null,
        officers: companyProfile?.companyOfficers || [],
      },
    });
  } catch (error) {
    console.error('Moat analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch moat analysis';
    
    // Check if it's an API configuration issue
    if (errorMessage.includes('AI service not configured')) {
      return NextResponse.json(
        { 
          error: 'AI moat analysis is not available. Please ensure XAI_API_KEY is configured in your environment variables.',
          fallbackAnalysis: true 
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
