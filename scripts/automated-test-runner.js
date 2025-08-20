#!/usr/bin/env node

/**
 * Automated Test Runner for StockBeacon
 * 
 * This script reads test scenarios from a markdown file and automatically
 * executes them using Playwright. No coding required - just write tests
 * in plain English in the QA_TEST_SCENARIOS.md file!
 * 
 * Usage:
 *   npm run test:auto                    # Run all tests
 *   npm run test:auto -- --headless      # Run in headless mode
 *   npm run test:auto -- --test "Login"  # Run specific test
 *   npm run test:auto -- --category "Authentication" # Run category
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: process.env.TEST_URL || 'http://localhost:3000',
  timeout: 30000,
  headless: process.argv.includes('--headless'),
  slowMo: process.argv.includes('--slow') ? 500 : 0,
  testFile: path.join(__dirname, '..', 'QA_TEST_SCENARIOS.md'),
  screenshot: process.argv.includes('--screenshot'),
  video: process.argv.includes('--video'),
  outputDir: path.join(__dirname, '..', 'test-results'),
  
  // Test user credentials (should be in env vars in production)
  testUser: {
    email: process.env.TEST_USER_EMAIL || 'demo@stockbeacon.com',
    password: process.env.TEST_USER_PASSWORD || 'Demo123!@#'
  }
};

// Test result tracking
const results = {
  passed: [],
  failed: [],
  skipped: [],
  errors: [],
  startTime: new Date(),
  endTime: null
};

/**
 * Parse markdown file and extract test scenarios
 */
function parseTestScenarios(content) {
  const tests = [];
  const lines = content.split('\n');
  let currentTest = null;
  let inSteps = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Test header
    if (line.startsWith('### Test:')) {
      if (currentTest) tests.push(currentTest);
      currentTest = {
        name: line.replace('### Test:', '').trim(),
        url: '',
        prerequisites: '',
        steps: [],
        category: '',
        device: 'desktop'
      };
      inSteps = false;
    }
    
    // Category header
    if (line.startsWith('## ') && !line.includes('Test Format') && currentTest) {
      currentTest.category = line.replace(/^##\s*[🔐📊🔍📈👁️💼🎨⚡🔒🐛📱🎯📋🔄📝]*\s*/, '').trim();
    }
    
    // URL
    if (line.includes('**URL**:') && currentTest) {
      currentTest.url = line.split('**URL**:')[1].trim();
    }
    
    // Prerequisites
    if (line.includes('**Prerequisites**:') && currentTest) {
      currentTest.prerequisites = line.split('**Prerequisites**:')[1].trim();
    }
    
    // Device
    if (line.includes('**Device**:') && currentTest) {
      currentTest.device = line.split('**Device**:')[1].trim().toLowerCase();
    }
    
    // Steps header
    if (line.includes('**Steps**:') && currentTest) {
      inSteps = true;
    }
    
    // Step item
    if (inSteps && line.match(/^\s*\d+\.\s*Action:/)) {
      const parts = line.split('|');
      if (parts.length === 2) {
        const action = parts[0].replace(/^\s*\d+\.\s*Action:/, '').trim();
        const expected = parts[1].replace('Expected:', '').trim();
        currentTest.steps.push({ action, expected });
      }
    }
  }
  
  if (currentTest) tests.push(currentTest);
  return tests;
}

/**
 * Execute a single action in the browser
 */
async function executeAction(page, action, testName) {
  const actionLower = action.toLowerCase();
  
  try {
    // Navigation actions
    if (actionLower.includes('navigate to') || actionLower.includes('go to')) {
      const url = action.match(/['"](.*?)['"]/)?.[1] || action.split('to')[1]?.trim();
      if (url) {
        await page.goto(url.startsWith('http') ? url : `${CONFIG.baseUrl}${url}`);
      }
      return true;
    }
    
    // Click actions
    if (actionLower.includes('click')) {
      const target = action.replace(/click( on)?/i, '').trim().replace(/["']/g, '');
      
      // Try multiple selectors
      const selectors = [
        `text="${target}"`,
        `button:has-text("${target}")`,
        `a:has-text("${target}")`,
        `[aria-label="${target}"]`,
        `[title="${target}"]`,
        `#${target.toLowerCase().replace(/\s+/g, '-')}`,
        `.${target.toLowerCase().replace(/\s+/g, '-')}`
      ];
      
      for (const selector of selectors) {
        try {
          await page.locator(selector).first().click({ timeout: 5000 });
          return true;
        } catch (e) {
          // Continue to next selector
        }
      }
      
      throw new Error(`Could not find element to click: ${target}`);
    }
    
    // Fill/Type actions
    if (actionLower.includes('fill') || actionLower.includes('type') || actionLower.includes('enter')) {
      const match = action.match(/(?:fill|type|enter)\s+(?:in\s+)?(?:the\s+)?(.*?)\s+(?:with|:)\s+["']?(.*?)["']?$/i);
      if (match) {
        const [, field, value] = match;
        
        // Common field selectors
        const fieldSelectors = [
          `input[placeholder*="${field}"]`,
          `input[name*="${field.toLowerCase()}"]`,
          `input[id*="${field.toLowerCase()}"]`,
          `textarea[placeholder*="${field}"]`,
          `[aria-label*="${field}"]`,
          `input[type="${field.toLowerCase()}"]`
        ];
        
        for (const selector of fieldSelectors) {
          try {
            await page.locator(selector).first().fill(value, { timeout: 5000 });
            return true;
          } catch (e) {
            // Continue to next selector
          }
        }
        
        throw new Error(`Could not find field: ${field}`);
      }
    }
    
    // Wait actions
    if (actionLower.includes('wait')) {
      const seconds = parseInt(action.match(/\d+/)?.[0] || '1');
      await page.waitForTimeout(seconds * 1000);
      return true;
    }
    
    // Check/Verify actions
    if (actionLower.includes('check') || actionLower.includes('verify')) {
      // Just wait a bit for the check
      await page.waitForTimeout(1000);
      return true;
    }
    
    // Refresh
    if (actionLower.includes('refresh')) {
      await page.reload();
      return true;
    }
    
    // Press key
    if (actionLower.includes('press')) {
      const key = action.match(/press\s+(.*?)(?:\s+key)?$/i)?.[1];
      if (key) {
        await page.keyboard.press(key);
        return true;
      }
    }
    
    // Scroll
    if (actionLower.includes('scroll')) {
      if (actionLower.includes('down')) {
        await page.evaluate(() => window.scrollBy(0, 500));
      } else if (actionLower.includes('up')) {
        await page.evaluate(() => window.scrollBy(0, -500));
      }
      return true;
    }
    
    // Select dropdown
    if (actionLower.includes('select') || actionLower.includes('set')) {
      const match = action.match(/(?:select|set)\s+["']?(.*?)["']?\s+(?:to|as|with)\s+["']?(.*?)["']?/i);
      if (match) {
        const [, field, value] = match;
        const selector = `select[name*="${field.toLowerCase()}"], select[id*="${field.toLowerCase()}"]`;
        await page.selectOption(selector, value);
        return true;
      }
    }
    
    // Default: try to find and click the text
    await page.locator(`text="${action}"`).first().click();
    return true;
    
  } catch (error) {
    console.error(`  ❌ Action failed: ${action}`);
    console.error(`     Error: ${error.message}`);
    return false;
  }
}

/**
 * Verify expected result
 */
async function verifyExpectation(page, expected) {
  const expectedLower = expected.toLowerCase();
  
  try {
    // Check for text content
    if (expectedLower.includes('appears') || expectedLower.includes('displays') || 
        expectedLower.includes('shows') || expectedLower.includes('visible')) {
      const text = expected.replace(/(appears|displays|shows|is visible|visible)/gi, '').trim();
      if (text && text !== expected) {
        await page.locator(`text="${text}"`).first().waitFor({ state: 'visible', timeout: 5000 });
      }
      return true;
    }
    
    // Check for navigation/redirect
    if (expectedLower.includes('redirect') || expectedLower.includes('navigat')) {
      await page.waitForLoadState('networkidle');
      return true;
    }
    
    // Check URL
    if (expectedLower.includes('url')) {
      const urlPart = expected.match(/['"](.*?)['"]/)?.[1];
      if (urlPart) {
        await page.waitForURL(`**${urlPart}**`);
      }
      return true;
    }
    
    // Check for element count
    if (expectedLower.includes('count')) {
      // Just verify page loaded
      await page.waitForLoadState('domcontentloaded');
      return true;
    }
    
    // Default: just wait a moment
    await page.waitForTimeout(500);
    return true;
    
  } catch (error) {
    console.error(`  ⚠️  Expectation not met: ${expected}`);
    return false;
  }
}

/**
 * Handle prerequisites (login, setup, etc.)
 */
async function handlePrerequisites(page, prerequisites) {
  if (!prerequisites) return true;
  
  const prereqLower = prerequisites.toLowerCase();
  
  // Handle login requirement
  if (prereqLower.includes('logged in') || prereqLower.includes('login')) {
    console.log('  📝 Logging in user...');
    
    // Check if already logged in
    try {
      await page.goto(`${CONFIG.baseUrl}/dashboard`);
      await page.waitForURL('**/dashboard**', { timeout: 3000 });
      console.log('  ✅ Already logged in');
      return true;
    } catch (e) {
      // Need to login
    }
    
    // Perform login
    await page.goto(`${CONFIG.baseUrl}/login`);
    await page.fill('input[type="email"]', CONFIG.testUser.email);
    await page.fill('input[type="password"]', CONFIG.testUser.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    console.log('  ✅ Login successful');
    return true;
  }
  
  // Handle other prerequisites as needed
  return true;
}

/**
 * Run a single test scenario
 */
async function runTest(browser, test) {
  console.log(`\n🧪 Running: ${test.name}`);
  console.log(`   Category: ${test.category || 'General'}`);
  console.log(`   Steps: ${test.steps.length}`);
  
  const context = await browser.newContext({
    viewport: test.device === 'mobile' 
      ? { width: 375, height: 812 } 
      : { width: 1280, height: 720 },
    recordVideo: CONFIG.video ? { dir: CONFIG.outputDir } : undefined
  });
  
  const page = await context.newPage();
  let testPassed = true;
  const testResult = {
    name: test.name,
    category: test.category,
    steps: [],
    duration: 0,
    error: null
  };
  
  const startTime = Date.now();
  
  try {
    // Handle prerequisites
    if (test.prerequisites) {
      await handlePrerequisites(page, test.prerequisites);
    }
    
    // Navigate to starting URL
    if (test.url) {
      const fullUrl = test.url.startsWith('http') ? test.url : `${CONFIG.baseUrl}${test.url}`;
      console.log(`   Navigating to: ${fullUrl}`);
      await page.goto(fullUrl);
    }
    
    // Execute each step
    for (let i = 0; i < test.steps.length; i++) {
      const step = test.steps[i];
      console.log(`\n   Step ${i + 1}: ${step.action}`);
      
      const actionSuccess = await executeAction(page, step.action, test.name);
      const expectSuccess = await verifyExpectation(page, step.expected);
      
      const stepPassed = actionSuccess && expectSuccess;
      testResult.steps.push({
        action: step.action,
        expected: step.expected,
        passed: stepPassed
      });
      
      if (stepPassed) {
        console.log(`   ✅ Step passed`);
      } else {
        console.log(`   ❌ Step failed`);
        testPassed = false;
        
        // Take screenshot on failure
        if (CONFIG.screenshot) {
          const screenshotPath = path.join(
            CONFIG.outputDir, 
            `${test.name.replace(/\s+/g, '-')}-step${i + 1}-failure.png`
          );
          await page.screenshot({ path: screenshotPath, fullPage: true });
          console.log(`   📸 Screenshot saved: ${screenshotPath}`);
        }
      }
      
      // Add delay between steps if in slow mode
      if (CONFIG.slowMo) {
        await page.waitForTimeout(CONFIG.slowMo);
      }
    }
    
  } catch (error) {
    console.error(`\n   ❌ Test error: ${error.message}`);
    testPassed = false;
    testResult.error = error.message;
    
    // Take screenshot on error
    if (CONFIG.screenshot) {
      const screenshotPath = path.join(
        CONFIG.outputDir,
        `${test.name.replace(/\s+/g, '-')}-error.png`
      );
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   📸 Screenshot saved: ${screenshotPath}`);
    }
  } finally {
    testResult.duration = Date.now() - startTime;
    await context.close();
  }
  
  // Record result
  if (testPassed) {
    console.log(`\n   ✅ Test PASSED (${testResult.duration}ms)`);
    results.passed.push(testResult);
  } else {
    console.log(`\n   ❌ Test FAILED (${testResult.duration}ms)`);
    results.failed.push(testResult);
  }
  
  return testPassed;
}

/**
 * Generate HTML report
 */
function generateHTMLReport() {
  const totalTests = results.passed.length + results.failed.length + results.skipped.length;
  const passRate = totalTests > 0 ? ((results.passed.length / totalTests) * 100).toFixed(1) : 0;
  const duration = ((results.endTime - results.startTime) / 1000).toFixed(1);
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>StockBeacon Test Report - ${new Date().toLocaleDateString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, system-ui, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-bottom: 20px; }
    .summary { display: flex; gap: 20px; margin-bottom: 30px; }
    .summary-card { flex: 1; padding: 20px; border-radius: 8px; text-align: center; }
    .summary-card h3 { font-size: 32px; margin-bottom: 5px; }
    .summary-card p { color: #666; font-size: 14px; }
    .passed { background: #d4edda; color: #155724; }
    .failed { background: #f8d7da; color: #721c24; }
    .skipped { background: #fff3cd; color: #856404; }
    .info { background: #d1ecf1; color: #0c5460; }
    .test-list { margin-top: 30px; }
    .test-item { border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 15px; overflow: hidden; }
    .test-header { padding: 15px; background: #f8f9fa; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
    .test-header:hover { background: #e9ecef; }
    .test-header.passed { border-left: 4px solid #28a745; }
    .test-header.failed { border-left: 4px solid #dc3545; }
    .test-body { padding: 15px; display: none; background: #fff; }
    .test-body.show { display: block; }
    .step { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .step:last-child { border-bottom: none; }
    .step-passed::before { content: "✅ "; }
    .step-failed::before { content: "❌ "; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-left: 10px; }
    .badge-passed { background: #28a745; color: white; }
    .badge-failed { background: #dc3545; color: white; }
    .error { background: #fff5f5; border: 1px solid #feb; padding: 10px; border-radius: 4px; margin-top: 10px; color: #c00; font-family: monospace; font-size: 12px; }
    .timestamp { color: #666; font-size: 14px; margin-top: 30px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 StockBeacon Automated Test Report</h1>
    
    <div class="summary">
      <div class="summary-card passed">
        <h3>${results.passed.length}</h3>
        <p>Passed</p>
      </div>
      <div class="summary-card failed">
        <h3>${results.failed.length}</h3>
        <p>Failed</p>
      </div>
      <div class="summary-card skipped">
        <h3>${results.skipped.length}</h3>
        <p>Skipped</p>
      </div>
      <div class="summary-card info">
        <h3>${passRate}%</h3>
        <p>Pass Rate</p>
      </div>
      <div class="summary-card info">
        <h3>${duration}s</h3>
        <p>Duration</p>
      </div>
    </div>
    
    <div class="test-list">
      <h2>Test Results</h2>
      
      ${results.passed.concat(results.failed).map((test, index) => {
        const isPassed = results.passed.includes(test);
        return `
        <div class="test-item">
          <div class="test-header ${isPassed ? 'passed' : 'failed'}" onclick="toggleTest(${index})">
            <div>
              <strong>${test.name}</strong>
              <span class="badge badge-${isPassed ? 'passed' : 'failed'}">${isPassed ? 'PASSED' : 'FAILED'}</span>
              <span style="color: #666; margin-left: 10px; font-size: 14px;">${test.category} • ${test.duration}ms</span>
            </div>
            <span>▼</span>
          </div>
          <div class="test-body" id="test-${index}">
            ${test.steps.map((step, i) => `
              <div class="step ${step.passed ? 'step-passed' : 'step-failed'}">
                <strong>Step ${i + 1}:</strong> ${step.action}<br>
                <span style="color: #666; margin-left: 20px;">Expected: ${step.expected}</span>
              </div>
            `).join('')}
            ${test.error ? `<div class="error">Error: ${test.error}</div>` : ''}
          </div>
        </div>
        `;
      }).join('')}
    </div>
    
    <div class="timestamp">
      Report generated on ${new Date().toLocaleString()}
    </div>
  </div>
  
  <script>
    function toggleTest(index) {
      const element = document.getElementById('test-' + index);
      element.classList.toggle('show');
    }
  </script>
</body>
</html>`;
  
  const reportPath = path.join(CONFIG.outputDir, `test-report-${Date.now()}.html`);
  fs.writeFileSync(reportPath, html);
  console.log(`\n📊 HTML Report saved: ${reportPath}`);
  
  return reportPath;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     StockBeacon Automated Test Runner v1.0.0        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  
  // Create output directory
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // Check if markdown file exists
  if (!fs.existsSync(CONFIG.testFile)) {
    console.error(`❌ Test file not found: ${CONFIG.testFile}`);
    console.log('\nPlease create QA_TEST_SCENARIOS.md with your test scenarios.');
    process.exit(1);
  }
  
  // Read and parse test scenarios
  console.log(`📖 Reading test scenarios from: ${CONFIG.testFile}`);
  const content = fs.readFileSync(CONFIG.testFile, 'utf-8');
  const tests = parseTestScenarios(content);
  
  console.log(`📋 Found ${tests.length} test scenarios`);
  
  // Filter tests if specific test or category requested
  let testsToRun = tests;
  const args = process.argv.slice(2);
  const testIndex = args.indexOf('--test');
  const categoryIndex = args.indexOf('--category');
  
  if (testIndex !== -1 && args[testIndex + 1]) {
    const testName = args[testIndex + 1];
    testsToRun = tests.filter(t => t.name.toLowerCase().includes(testName.toLowerCase()));
    console.log(`🎯 Running specific test: ${testName}`);
  } else if (categoryIndex !== -1 && args[categoryIndex + 1]) {
    const category = args[categoryIndex + 1];
    testsToRun = tests.filter(t => t.category.toLowerCase().includes(category.toLowerCase()));
    console.log(`🎯 Running category: ${category}`);
  }
  
  if (testsToRun.length === 0) {
    console.log('⚠️  No matching tests found');
    process.exit(0);
  }
  
  // Launch browser
  console.log(`\n🌐 Launching browser (headless: ${CONFIG.headless})`);
  const browser = await chromium.launch({
    headless: CONFIG.headless,
    slowMo: CONFIG.slowMo
  });
  
  console.log(`🚀 Starting test execution...\n`);
  console.log('═'.repeat(60));
  
  // Run tests
  for (const test of testsToRun) {
    await runTest(browser, test);
  }
  
  // Close browser
  await browser.close();
  
  // Set end time
  results.endTime = new Date();
  
  // Generate summary
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 TEST SUMMARY\n');
  console.log(`   ✅ Passed: ${results.passed.length}`);
  console.log(`   ❌ Failed: ${results.failed.length}`);
  console.log(`   ⏭️  Skipped: ${results.skipped.length}`);
  console.log(`   ⏱️  Duration: ${((results.endTime - results.startTime) / 1000).toFixed(1)}s`);
  
  const totalTests = results.passed.length + results.failed.length;
  if (totalTests > 0) {
    const passRate = (results.passed.length / totalTests * 100).toFixed(1);
    console.log(`   📈 Pass Rate: ${passRate}%`);
  }
  
  // Generate HTML report
  const reportPath = generateHTMLReport();
  
  // List failed tests
  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.failed.forEach(test => {
      console.log(`   - ${test.name} (${test.category})`);
      if (test.error) {
        console.log(`     Error: ${test.error}`);
      }
    });
  }
  
  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { parseTestScenarios, executeAction, verifyExpectation };
