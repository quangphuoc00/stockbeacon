/**
 * AI-Powered Moat Analysis Service
 * Uses xAI (Grok) to analyze competitive advantages and business moats
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface MoatAnalysis {
  symbol: string;
  overallScore: number; // 0-100
  dimensions: {
    brandLoyalty: {
      score: number; // 0-25
      explanation: string;
    };
    switchingCosts: {
      score: number; // 0-25
      explanation: string;
    };
    networkEffects: {
      score: number; // 0-25
      explanation: string;
    };
    scaleAdvantages: {
      score: number; // 0-25
      explanation: string;
    };
  };
  summary: string;
  strength: 'Strong' | 'Moderate' | 'Weak';
  lastUpdated: Date;
}

interface CompanyData {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  businessSummary: string;
  grossMargins?: number;
  operatingMargins?: number;
  profitMargins?: number;
  marketCap?: number;
  employees?: number;
  revenueGrowth?: number;
  competitorsList?: string[];
}

export class AIMotAnalysisService {
  private static XAI_API_URL = 'https://api.x.ai/v1/chat/completions';
  private static CACHE_PREFIX = 'moat_analysis:';
  private static CACHE_TTL = parseInt(process.env.CACHE_TTL_AI_ANALYSIS || '86400'); // 24 hours

  /**
   * Get moat analysis for a stock, using cache if available
   */
  static async getMoatAnalysis(
    symbol: string,
    companyData: CompanyData,
    forceRefresh = false
  ): Promise<MoatAnalysis> {
    const cacheKey = `${this.CACHE_PREFIX}${symbol}`;

    // Check cache first unless force refresh
    if (!forceRefresh) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return cached as MoatAnalysis;
        }
      } catch (error) {
        console.error('Cache read error:', error);
      }
    }

    // Generate new analysis
    const analysis = await this.generateMoatAnalysis(symbol, companyData);

    // Cache the result
    try {
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(analysis));
    } catch (error) {
      console.error('Cache write error:', error);
    }

    return analysis;
  }

  /**
   * Generate moat analysis using xAI (Grok)
   */
  private static async generateMoatAnalysis(
    symbol: string,
    companyData: CompanyData
  ): Promise<MoatAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(companyData);
      
      const response = await fetch(this.XAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.XAI_MODEL || 'grok-3-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a financial analyst specializing in competitive moat analysis. You analyze businesses to identify their competitive advantages. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3, // Lower temperature for consistent analysis
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        throw new Error(`xAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse the JSON response
      const aiAnalysis = JSON.parse(content);
      
      return this.formatMoatAnalysis(symbol, aiAnalysis);
    } catch (error) {
      console.error('AI moat analysis error:', error);
      // Return fallback analysis
      return this.getFallbackAnalysis(symbol, companyData);
    }
  }

  /**
   * Build the analysis prompt for the AI
   */
  private static buildAnalysisPrompt(companyData: CompanyData): string {
    return `
    Analyze the competitive moat for ${companyData.companyName} (${companyData.symbol}).
    
    Company Information:
    - Sector: ${companyData.sector}
    - Industry: ${companyData.industry}
    - Business: ${companyData.businessSummary}
    - Gross Margins: ${companyData.grossMargins ? `${(companyData.grossMargins * 100).toFixed(1)}%` : 'N/A'}
    - Operating Margins: ${companyData.operatingMargins ? `${(companyData.operatingMargins * 100).toFixed(1)}%` : 'N/A'}
    - Market Cap: ${companyData.marketCap ? `$${(companyData.marketCap / 1e9).toFixed(1)}B` : 'N/A'}
    - Revenue Growth: ${companyData.revenueGrowth ? `${(companyData.revenueGrowth * 100).toFixed(1)}%` : 'N/A'}
    ${companyData.competitorsList ? `- Main Competitors: ${companyData.competitorsList.join(', ')}` : ''}
    
    Analyze and score the company's moat across these four dimensions:
    
    1. Brand Loyalty (0-25 points): How strong is customer attachment to the brand? Consider brand recognition, customer satisfaction, repeat purchase rates.
    
    2. Switching Costs (0-25 points): How difficult/expensive is it for customers to switch to competitors? Consider contracts, data lock-in, learning curves, integration costs.
    
    3. Network Effects (0-25 points): Does the product/service become more valuable as more people use it? Consider user networks, platform effects, data advantages.
    
    4. Scale Advantages (0-25 points): Does the company have cost or capability advantages from its size? Consider economies of scale, distribution networks, R&D capacity.
    
    Provide your response as a JSON object with this exact structure:
    {
      "brandLoyalty": {
        "score": [0-25],
        "explanation": "[2-3 sentences explaining the score in simple terms a beginner can understand]"
      },
      "switchingCosts": {
        "score": [0-25],
        "explanation": "[2-3 sentences explaining the score in simple terms]"
      },
      "networkEffects": {
        "score": [0-25],
        "explanation": "[2-3 sentences explaining the score in simple terms]"
      },
      "scaleAdvantages": {
        "score": [0-25],
        "explanation": "[2-3 sentences explaining the score in simple terms]"
      },
      "summary": "[3-4 sentences summarizing the overall moat strength and key competitive advantages in beginner-friendly language]"
    }
    
    Be objective and base scores on the actual business characteristics. Avoid jargon and explain in plain English.
    `;
  }

  /**
   * Format the AI response into our MoatAnalysis structure
   */
  private static formatMoatAnalysis(symbol: string, aiAnalysis: any): MoatAnalysis {
    const dimensions = {
      brandLoyalty: aiAnalysis.brandLoyalty,
      switchingCosts: aiAnalysis.switchingCosts,
      networkEffects: aiAnalysis.networkEffects,
      scaleAdvantages: aiAnalysis.scaleAdvantages,
    };

    const overallScore = 
      dimensions.brandLoyalty.score +
      dimensions.switchingCosts.score +
      dimensions.networkEffects.score +
      dimensions.scaleAdvantages.score;

    let strength: 'Strong' | 'Moderate' | 'Weak';
    if (overallScore >= 70) strength = 'Strong';
    else if (overallScore >= 40) strength = 'Moderate';
    else strength = 'Weak';

    return {
      symbol,
      overallScore,
      dimensions,
      summary: aiAnalysis.summary,
      strength,
      lastUpdated: new Date(),
    };
  }

  /**
   * Fallback analysis when AI is unavailable
   */
  private static getFallbackAnalysis(
    symbol: string,
    companyData: CompanyData
  ): MoatAnalysis {
    // Calculate basic scores based on available metrics
    const marginScore = Math.min(
      25,
      Math.round((companyData.grossMargins || 0) * 100)
    );
    
    const growthScore = Math.min(
      25,
      Math.round((companyData.revenueGrowth || 0) * 50)
    );

    const sizeScore = companyData.marketCap
      ? Math.min(25, Math.round(Math.log10(companyData.marketCap / 1e9) * 5))
      : 10;

    const brandScore = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA'].includes(symbol)
      ? 20
      : 10;

    const overallScore = marginScore + growthScore + sizeScore + brandScore;

    return {
      symbol,
      overallScore,
      dimensions: {
        brandLoyalty: {
          score: brandScore,
          explanation: 'Brand strength calculated based on market position and recognition.',
        },
        switchingCosts: {
          score: marginScore,
          explanation: 'Higher margins often indicate pricing power from switching costs.',
        },
        networkEffects: {
          score: growthScore,
          explanation: 'Growth rate suggests potential network effects and market expansion.',
        },
        scaleAdvantages: {
          score: sizeScore,
          explanation: 'Company size provides economies of scale and competitive advantages.',
        },
      },
      summary: `${companyData.companyName} shows ${
        overallScore >= 70 ? 'strong' : overallScore >= 40 ? 'moderate' : 'limited'
      } competitive advantages based on financial metrics. This is a simplified analysis.`,
      strength: overallScore >= 70 ? 'Strong' : overallScore >= 40 ? 'Moderate' : 'Weak',
      lastUpdated: new Date(),
    };
  }

  /**
   * Get multiple moat analyses in batch (for efficiency)
   */
  static async getBatchMoatAnalyses(
    stocksData: CompanyData[]
  ): Promise<Map<string, MoatAnalysis>> {
    const results = new Map<string, MoatAnalysis>();
    
    // Process in parallel but limit concurrency
    const batchSize = 3;
    for (let i = 0; i < stocksData.length; i += batchSize) {
      const batch = stocksData.slice(i, i + batchSize);
      const promises = batch.map(data =>
        this.getMoatAnalysis(data.symbol, data)
      );
      
      const batchResults = await Promise.all(promises);
      batchResults.forEach((analysis, index) => {
        results.set(batch[index].symbol, analysis);
      });
    }
    
    return results;
  }

  /**
   * Clear cached moat analysis for a symbol
   */
  static async clearCache(symbol: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${symbol}`;
    try {
      await redis.del(cacheKey);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}
