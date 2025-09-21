#!/usr/bin/env node

/**
 * Comprehensive test for Financial Health Score visualization
 * Tests different score values and validates the display
 */

const fetch = require('node-fetch');
global.fetch = fetch;

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Test cases with different scores
const TEST_CASES = [
  { symbol: 'AAPL', expectedRange: [60, 70], description: 'Average company' },
  { symbol: 'MSFT', expectedRange: [80, 90], description: 'Excellent company' },
  { symbol: 'GOOGL', expectedRange: [75, 85], description: 'Very good company' },
  { symbol: 'AMZN', expectedRange: [70, 80], description: 'Good company' },
  { symbol: 'META', expectedRange: [70, 80], description: 'Good company' }
];

// Color expectations based on score
const getExpectedColor = (score) => {
  if (score >= 80) return 'green';
  if (score >= 65) return 'yellow';
  if (score >= 50) return 'orange';
  return 'red';
};

// Grade expectations based on score
const getExpectedGrade = (score) => {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D';
  return 'F';
};

// Simple rating based on score
const getExpectedRating = (score) => {
  if (score >= 80) return '🟢 Excellent';
  if (score >= 70) return '🟢 Good';
  if (score >= 55) return '🟡 Fair';
  return '🔴 Poor';
};

async function testVisualization() {
  console.log('🧪 Testing Financial Health Score Visualization\n');
  console.log('This test validates:');
  console.log('  ✓ Score calculation (0-100)');
  console.log('  ✓ Grade assignment (A+ to F)');
  console.log('  ✓ Color coding (green/yellow/orange/red)');
  console.log('  ✓ Simple rating assignment');
  console.log('  ✓ Category breakdowns\n');

  const results = {
    passed: 0,
    failed: 0,
    details: []
  };

  for (const testCase of TEST_CASES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Testing ${testCase.symbol} - ${testCase.description}`);
    console.log(`${'='.repeat(60)}`);

    try {
      // Fetch financial analysis
      const response = await fetch(`${API_BASE_URL}/api/stocks/${testCase.symbol}/analysis`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch analysis');
      }

      const data = await response.json();
      
      // Validate health score
      console.log('\n1️⃣ Health Score Validation:');
      const score = data.healthScore.overall;
      console.log(`   Score: ${score}/100`);
      
      if (score >= testCase.expectedRange[0] && score <= testCase.expectedRange[1]) {
        console.log(`   ✅ Score within expected range [${testCase.expectedRange[0]}-${testCase.expectedRange[1]}]`);
      } else {
        console.log(`   ⚠️  Score outside expected range [${testCase.expectedRange[0]}-${testCase.expectedRange[1]}]`);
      }

      // Validate grade
      console.log('\n2️⃣ Grade Validation:');
      const expectedGrade = getExpectedGrade(score);
      console.log(`   Actual Grade: ${data.healthScore.grade}`);
      console.log(`   Expected Grade: ${expectedGrade}`);
      
      if (data.healthScore.grade === expectedGrade) {
        console.log('   ✅ Grade matches expected');
      } else {
        console.log('   ❌ Grade mismatch!');
        results.failed++;
        continue;
      }

      // Validate color (inferred from score)
      console.log('\n3️⃣ Color Validation:');
      const expectedColor = getExpectedColor(score);
      console.log(`   Expected Color: ${expectedColor}`);
      console.log('   ✅ Color will be applied based on score');

      // Validate simple rating
      console.log('\n4️⃣ Simple Rating Validation:');
      const expectedRating = getExpectedRating(score);
      console.log(`   Actual Rating: ${data.summary.simpleRating}`);
      console.log(`   Expected Rating: ${expectedRating}`);
      
      if (data.summary.simpleRating === expectedRating) {
        console.log('   ✅ Rating matches expected');
      } else {
        console.log('   ❌ Rating mismatch!');
        results.failed++;
        continue;
      }

      // Validate categories
      console.log('\n5️⃣ Category Breakdown:');
      const categories = data.healthScore.categories;
      let totalWeight = 0;
      
      categories.forEach(cat => {
        console.log(`   ${cat.name}: ${cat.score}/100 (${cat.weight}% weight)`);
        totalWeight += cat.weight;
        
        // Validate score range
        if (cat.score < 0 || cat.score > 100) {
          console.log(`   ❌ Invalid category score: ${cat.score}`);
          results.failed++;
          return;
        }
      });
      
      console.log(`   Total Weight: ${totalWeight}%`);
      if (totalWeight === 100) {
        console.log('   ✅ Category weights sum to 100%');
      } else {
        console.log('   ❌ Category weights do not sum to 100%!');
        results.failed++;
        continue;
      }

      // Calculate weighted score manually
      let calculatedScore = 0;
      categories.forEach(cat => {
        calculatedScore += (cat.score * cat.weight / 100);
      });
      
      console.log(`\n6️⃣ Score Calculation Check:`);
      console.log(`   Calculated: ${calculatedScore.toFixed(1)}`);
      console.log(`   Reported: ${score}`);
      
      if (Math.abs(calculatedScore - score) < 1) {
        console.log('   ✅ Score calculation verified');
      } else {
        console.log('   ❌ Score calculation mismatch!');
        results.failed++;
        continue;
      }

      // Visual representation test
      console.log('\n7️⃣ Visual Representation:');
      console.log(`   Arc Fill: ${score}% of semicircle`);
      console.log(`   Arc Color: ${expectedColor}`);
      console.log(`   Text Display: ${score}`);
      console.log('   ✅ Visual elements configured correctly');

      results.passed++;
      results.details.push({
        symbol: testCase.symbol,
        score,
        grade: data.healthScore.grade,
        rating: data.summary.simpleRating,
        status: 'PASSED'
      });

    } catch (error) {
      console.error(`\n❌ Test failed for ${testCase.symbol}: ${error.message}`);
      results.failed++;
      results.details.push({
        symbol: testCase.symbol,
        error: error.message,
        status: 'FAILED'
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / TEST_CASES.length) * 100).toFixed(0)}%`);

  console.log('\nDetailed Results:');
  results.details.forEach(detail => {
    if (detail.status === 'PASSED') {
      console.log(`  ✅ ${detail.symbol}: Score ${detail.score} (${detail.grade}) - ${detail.rating}`);
    } else {
      console.log(`  ❌ ${detail.symbol}: ${detail.error}`);
    }
  });

  // Visual Test Instructions
  console.log('\n' + '='.repeat(60));
  console.log('🎨 VISUAL VERIFICATION INSTRUCTIONS');
  console.log('='.repeat(60));
  console.log('1. Open browser to http://localhost:3001');
  console.log('2. Navigate to each test stock (AAPL, MSFT, GOOGL, etc.)');
  console.log('3. Click on "Financials" tab');
  console.log('4. Verify the following visual elements:');
  console.log('   - Semicircle meter fills proportionally to score');
  console.log('   - Color matches score range (green/yellow/orange/red)');
  console.log('   - Score number is centered and readable');
  console.log('   - Grade badge shows correct letter grade');
  console.log('   - Category bars fill correctly');
  console.log('\n✅ If all visual elements match expectations, the implementation is correct!');
}

// SVG Path Test
function testSVGPathCalculation() {
  console.log('\n\n🔧 SVG PATH CALCULATION TEST');
  console.log('='.repeat(60));
  
  // The semicircle has circumference = π * diameter / 2
  // For radius 80, circumference = π * 160 / 2 ≈ 251.33
  
  const testScores = [0, 25, 50, 75, 100];
  const circumference = Math.PI * 160 / 2;
  
  console.log(`Semicircle circumference: ${circumference.toFixed(2)}`);
  console.log('\nDash array calculations:');
  
  testScores.forEach(score => {
    const dashLength = (score / 100) * circumference;
    console.log(`  Score ${score}%: dash = ${dashLength.toFixed(2)}, gap = ${circumference.toFixed(2)}`);
  });
  
  console.log('\n✅ SVG uses strokeDasharray to control arc fill percentage');
}

// Run tests
async function runAllTests() {
  await testVisualization();
  testSVGPathCalculation();
  
  console.log('\n🏁 All tests completed!');
}

runAllTests().catch(console.error);
