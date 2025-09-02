/**
 * Direct xAI API Test with Moat Analysis Prompt
 */

require('dotenv').config({ path: '.env.local' });

async function testMoatWithRealPrompt() {
  const apiKey = process.env.XAI_API_KEY;
  const model = process.env.XAI_MODEL || 'grok-2-1212';
  
  console.log('🚀 Testing Direct xAI Moat Analysis\n');
  console.log('Model:', model);
  console.log('='.repeat(50) + '\n');
  
  const prompt = `
    Perform a comprehensive competitive moat analysis for Apple Inc. (AAPL).
    
    Company Context:
    - Sector: Technology
    - Industry: Consumer Electronics
    - Market Cap: $3,450.0B
    - Business: Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.
    - Key Metrics:
      - Gross Margins: 43.3%
      - Operating Margins: 30.3%
      - Revenue Growth: 5.2%
    - Main Competitors: Microsoft, Google, Samsung, Amazon
    
    Analyze the company's competitive position critically and honestly. Consider both current advantages and future vulnerabilities over a 5-10 year horizon.
    
    Score the company across these FOUR MOAT DIMENSIONS:
    
    1. BRAND LOYALTY & PRICING POWER (0-25 points)
    2. SWITCHING COSTS (0-25 points)
    3. NETWORK EFFECTS (0-25 points)
    4. ECONOMIES OF SCALE (0-25 points)
    
    Provide your response as a JSON object with this structure:
    {
      "brandLoyalty": {
        "score": [0-25],
        "explanation": "[3-4 sentences with specific evidence]"
      },
      "switchingCosts": {
        "score": [0-25],
        "explanation": "[3-4 sentences quantifying switching barriers]"
      },
      "networkEffects": {
        "score": [0-25],
        "explanation": "[3-4 sentences on network dynamics]"
      },
      "scaleAdvantages": {
        "score": [0-25],
        "explanation": "[3-4 sentences on scale benefits]"
      },
      "summary": "[One paragraph providing an honest overall assessment]"
    }
  `;
  
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a senior investment analyst specializing in competitive moat analysis. Provide brutally honest assessments. Always respond with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 2500,
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.choices && data.choices[0]) {
      console.log('✅ xAI Response Received!\n');
      
      const content = data.choices[0].message.content;
      
      try {
        const analysis = JSON.parse(content);
        
        console.log('📊 APPLE INC. MOAT ANALYSIS\n');
        console.log('='.repeat(50));
        
        const totalScore = 
          analysis.brandLoyalty.score + 
          analysis.switchingCosts.score + 
          analysis.networkEffects.score + 
          analysis.scaleAdvantages.score;
        
        const strength = totalScore >= 80 ? 'Strong' : 
                        totalScore >= 60 ? 'Moderate' : 'Weak';
        
        console.log('\n🎯 Overall Score:', totalScore, '/ 100');
        console.log('💪 Moat Strength:', strength);
        console.log('\n📈 Dimension Scores:');
        console.log('  • Brand Loyalty:', analysis.brandLoyalty.score, '/ 25');
        console.log('  • Switching Costs:', analysis.switchingCosts.score, '/ 25');
        console.log('  • Network Effects:', analysis.networkEffects.score, '/ 25');
        console.log('  • Scale Advantages:', analysis.scaleAdvantages.score, '/ 25');
        
        console.log('\n📝 Summary:');
        console.log(analysis.summary);
        
        console.log('\n🔍 Detailed Analysis:\n');
        console.log('Brand Loyalty:', analysis.brandLoyalty.explanation);
        console.log('\nSwitching Costs:', analysis.switchingCosts.explanation);
        console.log('\nNetwork Effects:', analysis.networkEffects.explanation);
        console.log('\nScale Advantages:', analysis.scaleAdvantages.explanation);
        
      } catch (parseError) {
        console.log('⚠️  Response was not valid JSON. Raw content:');
        console.log(content);
      }
    } else {
      console.log('❌ API Error:', data.error || data.message || 'Unknown error');
    }
  } catch (error) {
    console.log('❌ Connection Error:', error.message);
  }
}

testMoatWithRealPrompt().catch(console.error);
