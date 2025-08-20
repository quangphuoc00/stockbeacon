# 🧪 How to Run Automated Tests Locally

## Quick Start

### 1️⃣ Install Dependencies (One Time Only)
```bash
# Install test dependencies
npm install

# Install Playwright browsers (one time)
npx playwright install chromium
```

### 2️⃣ Start Your Application
```bash
# In one terminal, start your app
npm run dev
```

### 3️⃣ Run Tests
```bash
# In another terminal, run tests

# Run ALL tests from the markdown file
npm run test:auto

# Run tests in headless mode (no browser window)
npm run test:auto:headless

# Run tests with debugging (slow mode + screenshots)
npm run test:auto:debug
```

## 📝 How It Works

1. **Write tests in plain English** in `QA_TEST_SCENARIOS.md`
2. **Run the command** `npm run test:auto`
3. **Get results** in your terminal and HTML report

That's it! No coding required.

## 🎯 Running Specific Tests

```bash
# Run a specific test by name
node scripts/automated-test-runner.js --test "Login"

# Run all tests in a category
node scripts/automated-test-runner.js --category "Authentication"

# Run with screenshots on failure
node scripts/automated-test-runner.js --screenshot

# Run slowly to watch what's happening
node scripts/automated-test-runner.js --slow
```

## 📊 Test Results

After tests run, you'll find:
- **Terminal Output**: Immediate pass/fail feedback
- **HTML Report**: Located in `test-results/test-report-[timestamp].html`
- **Screenshots**: (if enabled) in `test-results/` folder

## 🔧 Configuration

Edit these environment variables in your `.env.local` file:
```bash
# Test user credentials
TEST_USER_EMAIL=demo@stockbeacon.com
TEST_USER_PASSWORD=Demo123!@#

# Test URL (default: http://localhost:3000)
TEST_URL=http://localhost:3000
```

## ✏️ Writing New Tests

1. Open `QA_TEST_SCENARIOS.md`
2. Add your test following this format:

```markdown
### Test: Your Test Name
- **URL**: /starting-page
- **Steps**:
  1. Action: Click "Button Name" | Expected: Something happens
  2. Action: Fill email with "test@example.com" | Expected: Email accepted
  3. Action: Click "Submit" | Expected: Success message appears
```

## 🎨 Supported Actions

The test runner understands these actions:
- **Click**: `Click "Sign In"` or `Click on user avatar`
- **Fill/Type**: `Fill email with "test@test.com"` or `Type "AAPL" in search`
- **Navigate**: `Navigate to /dashboard` or `Go to login page`
- **Wait**: `Wait 2 seconds`
- **Check/Verify**: `Check for welcome message`
- **Refresh**: `Refresh the page`
- **Press**: `Press Enter` or `Press Tab`
- **Scroll**: `Scroll down` or `Scroll up`

## 🐛 Troubleshooting

### Tests not finding elements?
- Make sure your app is running (`npm run dev`)
- Check that the element text matches exactly
- Try using more specific selectors in the markdown

### Tests running too fast?
```bash
# Run in slow mode to see what's happening
npm run test:auto:debug
```

### Need to debug a specific test?
```bash
# Run just one test with screenshots
node scripts/automated-test-runner.js --test "Login" --screenshot --slow
```

### Tests failing randomly?
- Increase timeouts in `scripts/automated-test-runner.js`
- Make sure your app is fully loaded before running tests
- Check for race conditions in your app

## 📸 Examples

### Running all tests:
```bash
npm run test:auto

# Output:
╔══════════════════════════════════════════════════════╗
║     StockBeacon Automated Test Runner v1.0.0        ║
╚══════════════════════════════════════════════════════╝

📖 Reading test scenarios from: QA_TEST_SCENARIOS.md
📋 Found 25 test scenarios
🌐 Launching browser (headless: false)
🚀 Starting test execution...

🧪 Running: User Login Flow
   ✅ Test PASSED (3250ms)

🧪 Running: Stock Search Functionality
   ✅ Test PASSED (2150ms)

📊 TEST SUMMARY
   ✅ Passed: 23
   ❌ Failed: 2
   📈 Pass Rate: 92.0%
   📊 HTML Report saved: test-results/test-report-1234567890.html
```

### Running specific category:
```bash
node scripts/automated-test-runner.js --category "Authentication" --headless

# Will run only authentication-related tests without showing browser
```

## 🚀 Best Practices

1. **Run tests regularly**: Before committing code changes
2. **Keep tests simple**: One action per step
3. **Use descriptive names**: Make it clear what each test does
4. **Check the HTML report**: It has detailed step-by-step results
5. **Update tests**: When UI changes, update the markdown file

## 💡 Tips

- The test runner automatically handles login when tests require it
- Tests run in isolation - each test starts fresh
- You can watch tests run by not using `--headless`
- Screenshots are automatically taken on failures when using `--screenshot`
- The HTML report can be opened in any browser for detailed results

## 🎯 Quick Test Commands

```bash
# Most common commands you'll use:

# 1. Quick test run (see browser)
npm run test:auto

# 2. Full test suite (no browser window)
npm run test:auto:headless

# 3. Debug failing test
npm run test:auto:debug

# 4. Test specific feature
node scripts/automated-test-runner.js --test "Stock Search"
```

That's all you need to know! Just write your tests in the markdown file and run the commands above. No coding or complex setup required! 🎉
