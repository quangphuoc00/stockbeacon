// EXAMPLE: How to modify the prompt in ai-moat.service.ts

// Current 4-dimension system (lines 170-184):
const CURRENT_DIMENSIONS = `
    1. BRAND LOYALTY & PRICING POWER (0-25 points)
    2. SWITCHING COSTS (0-25 points)
    3. NETWORK EFFECTS (0-25 points)
    4. ECONOMIES OF SCALE (0-25 points)
`;

// OPTION 1: Add a 5th dimension (keep 25 points each = 125 total)
const FIVE_DIMENSIONS_125_POINTS = `
    1. BRAND LOYALTY & PRICING POWER (0-25 points)
    2. SWITCHING COSTS (0-25 points)
    3. NETWORK EFFECTS (0-25 points)
    4. ECONOMIES OF SCALE (0-25 points)
    5. REGULATORY & INTELLECTUAL PROPERTY MOAT (0-25 points)
    Evaluate: Patents, licenses, regulatory barriers, proprietary technology.
    Consider: How difficult is it for competitors to replicate legally?
`;

// OPTION 2: Convert to 5 dimensions with 20 points each (100 total)
const FIVE_DIMENSIONS_100_POINTS = `
    1. BRAND LOYALTY & PRICING POWER (0-20 points)
    2. SWITCHING COSTS (0-20 points)
    3. NETWORK EFFECTS (0-20 points)
    4. ECONOMIES OF SCALE (0-20 points)
    5. INTANGIBLE ASSETS & IP (0-20 points)
`;

// OPTION 3: Industry-specific dimensions
const TECH_SPECIFIC_PROMPT = `
    ${companyData.sector === 'Technology' ? `
    ADDITIONAL TECH-SPECIFIC FACTORS:
    - Developer ecosystem strength (0-10 bonus points)
    - Data moat and AI advantages (0-10 bonus points)
    - Platform lock-in effects (0-10 bonus points)
    ` : ''}
`;

// OPTION 4: More critical scoring guidelines
const DETAILED_SCORING = `
    1. BRAND LOYALTY & PRICING POWER (0-25 points)
    Scoring Guide:
    - 20-25: Top 3 brand globally, commands 20%+ price premium
    - 15-19: Strong regional brand, 10-20% price premium
    - 10-14: Recognized brand, 5-10% price premium
    - 5-9: Weak differentiation, commodity pricing pressure
    - 0-4: No brand value, pure price competition
`;

// OPTION 5: Add specific questions for better analysis
const ENHANCED_CRITICAL_ASSESSMENT = `
    CRITICAL ASSESSMENT:
    - What could destroy this moat in 5 years?
    - Which competitors pose the biggest threat?
    - What technology shift could disrupt this business?
    - How would a recession impact the moat?
    - What would happen if the CEO left?
    - Is the moat getting stronger or weaker over time?
`;

// OPTION 6: Request specific comparisons
const COMPARISON_PROMPT = `
    COMPETITIVE COMPARISON:
    - How does this moat compare to ${companyData.competitorsList?.[0] || 'main competitor'}?
    - Who has the strongest moat in the ${companyData.industry} industry?
    - What company outside this industry has a similar moat structure?
    - Rate this moat vs Apple/Microsoft/Amazon (whichever is most relevant)
`;

// OPTION 7: Modify the JSON response structure
const MODIFIED_RESPONSE_FORMAT = `
    {
      "overallMoatStrength": "Wide|Narrow|None",
      "moatDurability": "10+ years|5-10 years|3-5 years|<3 years",
      "dimensions": {
        "brandLoyalty": { "score": [0-20], "trend": "strengthening|stable|weakening" },
        "switchingCosts": { "score": [0-20], "trend": "strengthening|stable|weakening" },
        // ... other dimensions
      },
      "topStrengths": ["strength1", "strength2", "strength3"],
      "topVulnerabilities": ["vulnerability1", "vulnerability2", "vulnerability3"],
      "investmentImplication": "Strong Buy|Buy|Hold|Sell",
      "confidenceLevel": "High|Medium|Low"
    }
`;

// OPTION 8: Change the system prompt for different analysis style
const ALTERNATIVE_SYSTEM_PROMPTS = {
  conservative: "You are a risk-averse value investor who prioritizes capital preservation. Be extremely critical of moats and assume worst-case scenarios.",
  
  growth: "You are a growth-focused analyst looking for companies with expanding moats. Focus on future potential and scalability.",
  
  quant: "You are a quantitative analyst. Focus on measurable metrics, statistical evidence, and numerical comparisons. Avoid subjective assessments.",
  
  activist: "You are an activist investor. Identify how management could strengthen the moat and what changes would maximize competitive advantages."
};

console.log(`
TO IMPLEMENT THESE CHANGES:

1. Open: src/lib/services/ai-moat.service.ts

2. Find the buildAnalysisPrompt method (line 151)

3. Replace or modify the prompt sections you want to change

4. If adding a 5th dimension, also update:
   - The formatMoatAnalysis method to handle the new dimension
   - The MoatAnalysis interface to include the new field
   - The UI component to display the new dimension

5. Save and test with:
   curl http://localhost:3000/api/stocks/AAPL/moat?refresh=true
`);
