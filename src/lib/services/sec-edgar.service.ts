/**
 * SEC EDGAR API Service
 * Fetches company filings and business information from SEC
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface CompanyFiling {
  cik: string;
  ticker: string;
  companyName: string;
  filingType: string;
  filingDate: string;
  filingUrl: string;
  businessDescription?: string;
  riskFactors?: string[];
  competitiveStrengths?: string[];
}

export interface CompanyOverview {
  cik: string;
  ticker: string;
  name: string;
  sic: string;
  sicDescription: string;
  category: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  businessAddress: {
    street1: string;
    street2?: string;
    city: string;
    stateOrCountry: string;
    zipCode: string;
  };
  phone?: string;
  ein?: string;
  entityType: string;
  insiderTransactionForOwnerExists: boolean;
  insiderTransactionForIssuerExists: boolean;
  tickers: string[];
  exchanges: string[];
  formerNames: Array<{
    name: string;
    from: string;
    to: string;
  }>;
}

export class SECEdgarService {
  private static SEC_BASE_URL = 'https://data.sec.gov';
  private static SEC_SUBMISSIONS_URL = `${SECEdgarService.SEC_BASE_URL}/submissions`;
  private static SEC_COMPANY_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';
  private static CACHE_PREFIX = 'sec_filing:';
  private static CACHE_TTL = 86400 * 7; // 7 days cache for SEC data
  
  // User agent required by SEC
  private static headers = {
    'User-Agent': process.env.SEC_USER_AGENT || 'StockBeacon/1.0 (contact@stockbeacon.app)',
    'Accept': 'application/json',
  };

  /**
   * Get CIK (Central Index Key) from stock ticker
   */
  static async getCIKFromTicker(ticker: string): Promise<string | null> {
    const cacheKey = `cik_mapping:${ticker.toUpperCase()}`;
    
    // Check cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return cached as string;
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }

    try {
      // Fetch company tickers mapping
      const response = await fetch(this.SEC_COMPANY_TICKERS_URL, {
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`SEC API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Find the CIK for the given ticker
      for (const key in data) {
        if (data[key].ticker === ticker.toUpperCase()) {
          const cik = String(data[key].cik_str).padStart(10, '0');
          
          // Cache the result
          try {
            await redis.setex(cacheKey, this.CACHE_TTL, cik);
          } catch (error) {
            console.error('Cache write error:', error);
          }
          
          return cik;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching CIK:', error);
      return null;
    }
  }

  /**
   * Get company overview and recent filings
   */
  static async getCompanyOverview(ticker: string): Promise<CompanyOverview | null> {
    const cacheKey = `${this.CACHE_PREFIX}overview:${ticker}`;
    
    // Check cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return cached as CompanyOverview;
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }

    const cik = await this.getCIKFromTicker(ticker);
    if (!cik) {
      console.error(`CIK not found for ticker: ${ticker}`);
      return null;
    }

    try {
      const response = await fetch(`${this.SEC_SUBMISSIONS_URL}/CIK${cik}.json`, {
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`SEC API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const overview: CompanyOverview = {
        cik: data.cik,
        ticker: ticker.toUpperCase(),
        name: data.name,
        sic: data.sic,
        sicDescription: data.sicDescription,
        category: data.category,
        fiscalYearEnd: data.fiscalYearEnd,
        stateOfIncorporation: data.stateOfIncorp,
        businessAddress: {
          street1: data.addresses?.business?.street1 || '',
          street2: data.addresses?.business?.street2,
          city: data.addresses?.business?.city || '',
          stateOrCountry: data.addresses?.business?.stateOrCountry || '',
          zipCode: data.addresses?.business?.zipCode || '',
        },
        phone: data.phone,
        ein: data.ein,
        entityType: data.entityType,
        insiderTransactionForOwnerExists: data.insiderTransactionForOwnerExists || false,
        insiderTransactionForIssuerExists: data.insiderTransactionForIssuerExists || false,
        tickers: data.tickers || [ticker.toUpperCase()],
        exchanges: data.exchanges || [],
        formerNames: data.formerNames || [],
      };

      // Cache the result
      try {
        await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(overview));
      } catch (error) {
        console.error('Cache write error:', error);
      }

      return overview;
    } catch (error) {
      console.error('Error fetching company overview:', error);
      return null;
    }
  }

  /**
   * Get recent 10-K and 10-Q filings
   */
  static async getRecentFilings(
    ticker: string,
    filingTypes: string[] = ['10-K', '10-Q']
  ): Promise<CompanyFiling[]> {
    const cacheKey = `${this.CACHE_PREFIX}filings:${ticker}:${filingTypes.join(',')}`;
    
    // Check cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return cached as CompanyFiling[];
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }

    const cik = await this.getCIKFromTicker(ticker);
    if (!cik) {
      return [];
    }

    try {
      const response = await fetch(`${this.SEC_SUBMISSIONS_URL}/CIK${cik}.json`, {
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`SEC API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const filings: CompanyFiling[] = [];
      const recent = data.filings?.recent;
      
      if (recent) {
        for (let i = 0; i < recent.form.length && filings.length < 10; i++) {
          if (filingTypes.includes(recent.form[i])) {
            const filing: CompanyFiling = {
              cik: cik,
              ticker: ticker.toUpperCase(),
              companyName: data.name,
              filingType: recent.form[i],
              filingDate: recent.filingDate[i],
              filingUrl: `https://www.sec.gov/Archives/edgar/data/${cik}/${recent.accessionNumber[i].replace(/-/g, '')}/${recent.primaryDocument[i]}`,
            };
            filings.push(filing);
          }
        }
      }

      // Cache the result
      try {
        await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(filings));
      } catch (error) {
        console.error('Cache write error:', error);
      }

      return filings;
    } catch (error) {
      console.error('Error fetching filings:', error);
      return [];
    }
  }

  /**
   * Extract business description from latest 10-K
   * Note: This is simplified - full implementation would parse the actual filing
   */
  static async getBusinessDescription(ticker: string): Promise<string | null> {
    const cacheKey = `${this.CACHE_PREFIX}business:${ticker}`;
    
    // Check cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return cached as string;
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }

    const filings = await this.getRecentFilings(ticker, ['10-K']);
    if (filings.length === 0) {
      return null;
    }

    // For now, return a placeholder description
    // In production, this would fetch and parse the actual 10-K filing
    const description = `${filings[0].companyName} operates in the ${ticker} sector. For detailed business information, please refer to the company's latest 10-K filing dated ${filings[0].filingDate}.`;

    // Cache the result
    try {
      await redis.setex(cacheKey, this.CACHE_TTL, description);
    } catch (error) {
      console.error('Cache write error:', error);
    }

    return description;
  }

  /**
   * Get competitive landscape information
   * Simplified version - would normally parse actual filings
   */
  static async getCompetitiveInfo(ticker: string): Promise<{
    competitors: string[];
    strengths: string[];
    risks: string[];
  }> {
    const cacheKey = `${this.CACHE_PREFIX}competitive:${ticker}`;
    
    // Check cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return cached as any;
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }

    // Industry-based competitor mapping (simplified)
    const competitorMap: { [key: string]: string[] } = {
      'AAPL': ['MSFT', 'GOOGL', 'SAMSUNG'],
      'MSFT': ['AAPL', 'GOOGL', 'AMZN', 'ORCL'],
      'GOOGL': ['MSFT', 'META', 'AMZN', 'AAPL'],
      'AMZN': ['MSFT', 'GOOGL', 'WMT', 'BABA'],
      'TSLA': ['GM', 'F', 'RIVN', 'NIO', 'LCID'],
      'NVDA': ['AMD', 'INTC', 'QCOM'],
      'META': ['GOOGL', 'SNAP', 'TWTR', 'PINS'],
      'NFLX': ['DIS', 'AMZN', 'AAPL', 'WBD'],
      'JPM': ['BAC', 'WFC', 'C', 'GS'],
      'V': ['MA', 'AXP', 'PYPL', 'SQ'],
    };

    const info = {
      competitors: competitorMap[ticker.toUpperCase()] || [],
      strengths: [
        'Strong market position',
        'Established brand recognition',
        'Diversified revenue streams',
      ],
      risks: [
        'Market competition',
        'Regulatory changes',
        'Economic uncertainty',
      ],
    };

    // Cache the result
    try {
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(info));
    } catch (error) {
      console.error('Cache write error:', error);
    }

    return info;
  }

  /**
   * Clear cache for a specific ticker
   */
  static async clearCache(ticker: string): Promise<void> {
    const patterns = [
      `${this.CACHE_PREFIX}overview:${ticker}`,
      `${this.CACHE_PREFIX}filings:${ticker}:*`,
      `${this.CACHE_PREFIX}business:${ticker}`,
      `${this.CACHE_PREFIX}competitive:${ticker}`,
      `cik_mapping:${ticker.toUpperCase()}`,
    ];

    for (const pattern of patterns) {
      try {
        await redis.del(pattern);
      } catch (error) {
        console.error('Cache clear error:', error);
      }
    }
  }
}
