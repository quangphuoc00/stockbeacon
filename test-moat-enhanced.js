#!/usr/bin/env node
/**
 * Test script for enhanced Moat Analysis
 * Run with: node test-moat-enhanced.js
 */

require('dotenv').config({ path: '.env.local' });

// Test API configuration
async function testAPIConnection() {
  console.log('🔍 Testing xAI API Connection...\n');
  
  const apiKey = process.env.XAI_API_KEY;
  const model = process.env.XAI_MODEL || 'grok-2-1212';
  
  console.log('Configuration:');
  console.log('- API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NOT SET');
  console.log('- Model:', model);
  console.log('');
  
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
            content: 'You are a financial analyst. Respond with a brief analysis.',
          },
          {
            role: 'user',
            content: 'Give me a one-sentence moat analysis of Apple Inc.',
          },
        ],
        temperature: 0.2,
        max_tokens: 100,
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ API Connection Successful!');
      console.log('Response:', data.choices[0].message.content);
    } else {
      console.log('❌ API Error:', data.error || data.message || 'Unknown error');
    }
  } catch (error) {
    console.log('❌ Connection Error:', error.message);
  }
}

// Test Moat Analysis Service
async function testMoatAnalysis() {
  console.log('\n📊 Testing Moat Analysis Service...\n');
  
  const { AIMotAnalysisService } = require('./src/lib/services/ai-moat.service.ts');
  
  const testCompanyData = {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    businessSummary: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
    grossMargins: 0.4331,
    operatingMargins: 0.3025,
    profitMargins: 0.2531,
    marketCap: 3450000000000,
    employees: 161000,
    revenueGrowth: 0.052,
    competitorsList: ['Microsoft', 'Google', 'Samsung', 'Amazon'],
  };
  
  try {
    console.log('Analyzing', testCompanyData.companyName, '...\n');
    
    const analysis = await AIMotAnalysisService.getMoatAnalysis(
      testCompanyData.symbol,
      testCompanyData,
      true // Force refresh
    );
    
    console.log('✅ Moat Analysis Complete!\n');
    console.log('Overall Score:', analysis.overallScore, '/ 100');
    console.log('Strength:', analysis.strength);
    console.log('\nDimensions:');
    console.log('- Brand Loyalty:', analysis.dimensions.brandLoyalty.score, '/ 25');
    console.log('- Switching Costs:', analysis.dimensions.switchingCosts.score, '/ 25');
    console.log('- Network Effects:', analysis.dimensions.networkEffects.score, '/ 25');
    console.log('- Scale Advantages:', analysis.dimensions.scaleAdvantages.score, '/ 25');
    console.log('\nSummary:', analysis.summary.substring(0, 200) + '...');
  } catch (error) {
    console.log('❌ Analysis Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

// Test via API endpoint
async function testAPIEndpoint() {
  console.log('\n🌐 Testing API Endpoint...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/stocks/MSFT/moat');
    const data = await response.json();
    
    if (data.moatAnalysis) {
      console.log('✅ API Endpoint Working!');
      console.log('Company:', data.companyData.name);
      console.log('Moat Score:', data.moatAnalysis.overallScore);
      console.log('Moat Strength:', data.moatAnalysis.strength);
    } else if (data.error) {
      console.log('❌ API Error:', data.error);
    }
  } catch (error) {
    console.log('❌ Endpoint Error:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Enhanced Moat Analysis Test Suite\n');
  console.log('=' .repeat(50));
  
  await testAPIConnection();
  console.log('\n' + '='.repeat(50));
  
  await testMoatAnalysis();
  console.log('\n' + '='.repeat(50));
  
  await testAPIEndpoint();
  console.log('\n' + '='.repeat(50));
  
  console.log('\n✨ Test Complete!');
}

runTests().catch(console.error);
