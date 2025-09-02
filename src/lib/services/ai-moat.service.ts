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
          model: process.env.XAI_MODEL || 'grok-2-1212',
          messages: [
            {
              role: 'system',
              content: 'You are a senior investment analyst specializing in competitive moat analysis, trained in the Warren Buffett/Charlie Munger approach. You provide brutally honest, detailed assessments that institutional investors rely on. You never sugarcoat weaknesses, always consider competitive dynamics, and focus on sustainable advantages that can persist for 5-10 years. Your analysis is evidence-based, comparing companies to best-in-class examples. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.2, // Very low temperature for consistent, analytical responses
          max_tokens: 2500, // Increased for more detailed analysis
        }),
      });

      if (!response.ok) {
        throw new Error(`xAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      let content = data.choices[0].message.content;
      
      // Clean up the response - remove markdown code blocks if present
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
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
    Perform a comprehensive competitive moat analysis for ${companyData.companyName} (${companyData.symbol}).
    
    Company Context:
    - Sector: ${companyData.sector}
    - Industry: ${companyData.industry}
    - Market Cap: ${companyData.marketCap ? `$${(companyData.marketCap / 1e9).toFixed(1)}B` : 'N/A'}
    - Business: ${companyData.businessSummary}
    - Key Metrics:
      - Gross Margins: ${companyData.grossMargins ? `${(companyData.grossMargins * 100).toFixed(1)}%` : 'N/A'}
      - Operating Margins: ${companyData.operatingMargins ? `${(companyData.operatingMargins * 100).toFixed(1)}%` : 'N/A'}
      - Revenue Growth: ${companyData.revenueGrowth ? `${(companyData.revenueGrowth * 100).toFixed(1)}%` : 'N/A'}
    ${companyData.competitorsList ? `- Main Competitors: ${companyData.competitorsList.join(', ')}` : ''}
    
    Analyze the company's competitive position critically and honestly. Consider both current advantages and future vulnerabilities over a 5-10 year horizon.
    
    Score the company across these FOUR MOAT DIMENSIONS:
    
    1. BRAND LOYALTY & PRICING POWER (0-25 points)
    Evaluate: Brand recognition strength, customer retention vs industry average, ability to raise prices without losing customers, premium pricing capability.
    Consider: Does the brand command premium prices? Do customers actively choose it over cheaper alternatives?
    
    2. SWITCHING COSTS (0-25 points)
    Analyze: Financial costs of switching, time/effort costs, business disruption, data migration complexity, integration dependencies, psychological barriers.
    Quantify: How much would it really cost/disrupt a customer to switch to a competitor?
    
    3. NETWORK EFFECTS (0-25 points)
    Examine: Does value increase with more users? Are there two-sided network effects? Can users easily multi-home with competitors?
    Evidence: Look for user growth correlation with engagement, marketplace dynamics.
    
    4. ECONOMIES OF SCALE (0-25 points)
    Evaluate: Fixed cost advantages, purchasing power, distribution efficiency, R&D cost spreading, operating leverage.
    Proof: Are margins expanding with growth? Do they have cost advantages competitors can't match?
    
    CRITICAL ASSESSMENT:
    - What could destroy this moat in 5 years?
    - Which competitors pose the biggest threat?
    - What are the company's biggest vulnerabilities?
    
    Provide your response as a JSON object with this structure:
    {
      "brandLoyalty": {
        "score": [0-25],
        "explanation": "[3-4 sentences with specific evidence. Be critical - explain WHY the score is high or low with concrete examples. Use plain English.]"
      },
      "switchingCosts": {
        "score": [0-25],
        "explanation": "[3-4 sentences quantifying switching barriers or lack thereof. Compare to competitors. Be specific about what makes switching easy or hard.]"
      },
      "networkEffects": {
        "score": [0-25],
        "explanation": "[3-4 sentences on network dynamics. Explain if effects are strengthening or weakening. Compare to platform leaders.]"
      },
      "scaleAdvantages": {
        "score": [0-25],
        "explanation": "[3-4 sentences on scale benefits. Are these advantages sustainable? How do margins compare to smaller competitors?]"
      },
      "summary": "[One paragraph (4-6 sentences) providing an honest overall assessment. Start with the moat classification (Strong/Moderate/Weak), explain the key competitive advantages AND vulnerabilities, and assess the moat's durability. Be specific about threats and compare to best-in-class examples. Write for an intelligent investor who wants the truth, not marketing speak.]"
    }
    
    Be intellectually honest. If the company lacks a moat, say so clearly. Compare to industry leaders. Focus on sustainable advantages, not temporary benefits.
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
