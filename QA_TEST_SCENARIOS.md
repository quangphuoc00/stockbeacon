# StockBeacon QA Test Scenarios 🧪

This document contains all test scenarios that will be automatically executed.
Each test is written in a simple, readable format that gets converted to automated browser tests.

## Test Format

Each test follows this simple structure:
```
### Test: [Test Name]
- **URL**: [Starting URL]
- **Steps**:
  1. Action: [What to do] | Expected: [What should happen]
  2. Action: [What to do] | Expected: [What should happen]
```

---

## 🔐 Authentication Tests

### Test: User Registration Flow
- **URL**: /register
- **Steps**:
  1. Action: Click "Sign Up" button | Expected: Registration form appears
  2. Action: Fill email with "test@example.com" | Expected: Email field accepts input
  3. Action: Fill password with "Test123!@#" | Expected: Password field shows strength indicator
  4. Action: Fill confirm password with "Test123!@#" | Expected: Passwords match
  5. Action: Click "Create Account" | Expected: Redirects to dashboard or verification page
  6. Action: Check for welcome message | Expected: "Welcome to StockBeacon" appears

### Test: User Login Flow
- **URL**: /login
- **Steps**:
  1. Action: Navigate to login page | Expected: Login form is visible
  2. Action: Fill email with "demo@stockbeacon.com" | Expected: Email field accepts input
  3. Action: Fill password with "Demo123!@#" | Expected: Password field accepts input
  4. Action: Click "Sign In" | Expected: Redirects to dashboard
  5. Action: Check user menu | Expected: User avatar/name appears in header

### Test: Password Reset
- **URL**: /login
- **Steps**:
  1. Action: Click "Forgot Password?" | Expected: Password reset form appears
  2. Action: Fill email with "test@example.com" | Expected: Email field accepts input
  3. Action: Click "Send Reset Link" | Expected: Success message appears
  4. Action: Check message | Expected: "Check your email" message displays

### Test: Logout Flow
- **URL**: /dashboard
- **Prerequisites**: User must be logged in
- **Steps**:
  1. Action: Click user avatar | Expected: Dropdown menu appears
  2. Action: Click "Sign Out" | Expected: Confirms logout
  3. Action: Check redirect | Expected: Returns to login page
  4. Action: Try accessing dashboard | Expected: Redirects to login

---

## 📊 Stock Search & Analysis Tests

### Test: Stock Search Functionality
- **URL**: /dashboard
- **Prerequisites**: User must be logged in
- **Steps**:
  1. Action: Click search bar | Expected: Search input focuses
  2. Action: Type "AAPL" | Expected: Search suggestions appear
  3. Action: Press Enter or click suggestion | Expected: Navigates to AAPL stock page
  4. Action: Check stock data | Expected: Price, chart, and metrics display

### Test: Stock Details Page
- **URL**: /stocks/AAPL
- **Prerequisites**: User must be logged in
- **Steps**:
  1. Action: Check page load | Expected: Stock symbol "AAPL" displays
  2. Action: Check price section | Expected: Current price and change percentage show
  3. Action: Check chart | Expected: Price chart renders
  4. Action: Check StockBeacon Score | Expected: Score between 0-100 displays
  5. Action: Check metrics | Expected: P/E ratio, volume, market cap visible
  6. Action: Click "Add to Watchlist" | Expected: Success message appears

### Test: Invalid Stock Symbol
- **URL**: /dashboard
- **Prerequisites**: User must be logged in
- **Steps**:
  1. Action: Search for "INVALIDXYZ" | Expected: Search executes
  2. Action: Check results | Expected: "No results found" message appears
  3. Action: Check suggestions | Expected: Alternative suggestions may appear

---

## 🔍 Stock Screener Tests

### Test: Basic Screener Filter
- **URL**: /screener
- **Prerequisites**: User must be logged in
- **Steps**:
  1. Action: Navigate to screener | Expected: Screener page loads
  2. Action: Set "Market Cap" to "Large Cap" | Expected: Filter applies
  3. Action: Set "Sector" to "Technology" | Expected: Filter applies
  4. Action: Click "Apply Filters" | Expected: Results update
  5. Action: Check results | Expected: Only tech large-cap stocks show
  6. Action: Check result count | Expected: Result count displays

### Test: Advanced Screener Filters
- **URL**: /screener
- **Prerequisites**: User must be logged in
- **Steps**:
  1. Action: Click "Advanced Filters" | Expected: Advanced options expand
  2. Action: Set P/E ratio range 10-30 | Expected: Slider adjusts
  3. Action: Set volume minimum 1M | Expected: Input accepts value
  4. Action: Set StockBeacon Score > 70 | Expected: Filter applies
  5. Action: Click "Apply Filters" | Expected: Results filter
  6. Action: Check first result | Expected: Meets all filter criteria

### Test: Save Screener Settings
- **URL**: /screener
- **Prerequisites**: User must be logged in
- **Steps**:
  1. Action: Apply some filters | Expected: Filters active
  2. Action: Click "Save Screen" | Expected: Save dialog appears
  3. Action: Name it "My Tech Stocks" | Expected: Name field accepts input
  4. Action: Click "Save" | Expected: Success message appears
  5. Action: Refresh page | Expected: Saved screen appears in list

---

## 📈 Dashboard Tests

### Test: Dashboard Overview
- **URL**: /dashboard
- **Prerequisites**: User must be logged in
- **Steps**:
  1. Action: Load dashboard | Expected: Dashboard renders
  2. Action: Check top movers | Expected: Gainers and losers display
  3. Action: Check market overview | Expected: Market indices show
  4. Action: Check watchlist widget | Expected: Watchlist items appear
  5. Action: Check news feed | Expected: Latest news articles load

### Test: Dashboard Widgets Interaction
- **URL**: /dashboard
- **Prerequisites**: User must be logged in
- **Steps**:
  1. Action: Click on a top gainer | Expected: Navigates to stock page
  2. Action: Return to dashboard | Expected: Dashboard reloads
  3. Action: Click "View All" on watchlist | Expected: Goes to watchlist page
  4. Action: Click a news article | Expected: Article expands or opens

---

## 👁️ Watchlist Tests

### Test: Add Stock to Watchlist
- **URL**: /stocks/MSFT
- **Prerequisites**: User must be logged in
- **Steps**:
  1. Action: Click "Add to Watchlist" | Expected: Button changes to "Remove"
  2. Action: Navigate to watchlist page | Expected: MSFT appears in list
  3. Action: Check stock details | Expected: Price and change display

### Test: Remove Stock from Watchlist
- **URL**: /watchlist
- **Prerequisites**: User must be logged in, watchlist has items
- **Steps**:
  1. Action: Find a stock in list | Expected: Stock is visible
  2. Action: Click remove button (X) | Expected: Confirmation appears
  3. Action: Confirm removal | Expected: Stock disappears from list
  4. Action: Check empty state | Expected: If last item, "Empty watchlist" message

### Test: Watchlist Sorting
- **URL**: /watchlist
- **Prerequisites**: User must be logged in, multiple items in watchlist
- **Steps**:
  1. Action: Click "Sort by Price" | Expected: List reorders by price
  2. Action: Click "Sort by Change%" | Expected: List reorders by change
  3. Action: Click "Sort by Name" | Expected: List reorders alphabetically

---

## 💼 Portfolio Tests

### Test: Add Stock to Portfolio
- **URL**: /portfolio
- **Prerequisites**: User must be logged in
- **Steps**:
  1. Action: Click "Add Position" | Expected: Add form appears
  2. Action: Enter symbol "GOOGL" | Expected: Stock validates
  3. Action: Enter quantity "10" | Expected: Field accepts number
  4. Action: Enter price "150.00" | Expected: Field accepts price
  5. Action: Select date | Expected: Date picker works
  6. Action: Click "Add" | Expected: Position appears in portfolio
  7. Action: Check calculations | Expected: Total value calculates correctly

### Test: Portfolio Performance
- **URL**: /portfolio
- **Prerequisites**: User must have positions
- **Steps**:
  1. Action: Check total value | Expected: Sum of all positions displays
  2. Action: Check daily change | Expected: Today's gain/loss shows
  3. Action: Check total return | Expected: Overall return percentage displays
  4. Action: Click on a position | Expected: Stock details expand

---

## 🎨 UI/UX Tests

### Test: Responsive Design Mobile
- **URL**: /dashboard
- **Device**: Mobile (iPhone 12)
- **Steps**:
  1. Action: Load page on mobile | Expected: Mobile layout renders
  2. Action: Open hamburger menu | Expected: Navigation menu slides in
  3. Action: Scroll horizontally | Expected: No horizontal scroll
  4. Action: Check touch targets | Expected: Buttons are tap-friendly

### Test: Dark Mode Toggle
- **URL**: /dashboard
- **Prerequisites**: User must be logged in
- **Steps**:
  1. Action: Find theme toggle | Expected: Toggle is visible
  2. Action: Click dark mode | Expected: Theme changes to dark
  3. Action: Check colors | Expected: Background is dark, text is light
  4. Action: Refresh page | Expected: Dark mode persists
  5. Action: Toggle back to light | Expected: Theme changes to light

### Test: Keyboard Navigation
- **URL**: /dashboard
- **Steps**:
  1. Action: Press Tab key | Expected: Focus moves to next element
  2. Action: Press Enter on link | Expected: Link activates
  3. Action: Press Escape on modal | Expected: Modal closes
  4. Action: Use arrow keys in dropdown | Expected: Selection moves

---

## ⚡ Performance Tests

### Test: Page Load Speed
- **URL**: /dashboard
- **Steps**:
  1. Action: Measure load time | Expected: Page loads < 3 seconds
  2. Action: Check largest contentful paint | Expected: LCP < 2.5 seconds
  3. Action: Check first input delay | Expected: FID < 100ms
  4. Action: Check cumulative layout shift | Expected: CLS < 0.1

### Test: Search Performance
- **URL**: /dashboard
- **Steps**:
  1. Action: Type in search rapidly | Expected: No lag or stuttering
  2. Action: Check debouncing | Expected: Waits before searching
  3. Action: Measure results time | Expected: Results appear < 1 second

---

## 🔒 Security Tests

### Test: Protected Routes
- **URL**: /dashboard
- **Prerequisites**: User NOT logged in
- **Steps**:
  1. Action: Try accessing dashboard | Expected: Redirects to login
  2. Action: Try accessing /portfolio | Expected: Redirects to login
  3. Action: Try accessing /screener | Expected: Redirects to login

### Test: Session Timeout
- **URL**: /dashboard
- **Prerequisites**: User logged in
- **Steps**:
  1. Action: Wait for session timeout | Expected: Session expires
  2. Action: Try an action | Expected: Redirects to login
  3. Action: Check message | Expected: "Session expired" message

---

## 🐛 Error Handling Tests

### Test: Network Error Handling
- **URL**: /dashboard
- **Prerequisites**: Simulate network failure
- **Steps**:
  1. Action: Disconnect network | Expected: Error message appears
  2. Action: Try to load stocks | Expected: "Network error" message
  3. Action: Reconnect network | Expected: Auto-retry or manual retry option

### Test: API Error Handling
- **URL**: /stocks/AAPL
- **Prerequisites**: API returns error
- **Steps**:
  1. Action: Load stock with API error | Expected: Error message displays
  2. Action: Check message | Expected: User-friendly error text
  3. Action: Click "Retry" | Expected: Attempts to reload

---

## 📱 Cross-Browser Tests

### Test: Chrome Compatibility
- **Browser**: Chrome latest
- **URL**: /dashboard
- **Steps**:
  1. Action: Load application | Expected: All features work
  2. Action: Check console | Expected: No critical errors

### Test: Safari Compatibility
- **Browser**: Safari latest
- **URL**: /dashboard
- **Steps**:
  1. Action: Load application | Expected: All features work
  2. Action: Check animations | Expected: Smooth animations

### Test: Firefox Compatibility
- **Browser**: Firefox latest
- **URL**: /dashboard
- **Steps**:
  1. Action: Load application | Expected: All features work
  2. Action: Check forms | Expected: Form validation works

---

## 🎯 Critical Path Tests (Priority P0)

These tests MUST pass before any deployment:

1. **User can register and login**
2. **User can search for stocks**
3. **User can view stock details**
4. **User can add/remove watchlist items**
5. **User can use the screener**
6. **User can logout**
7. **Application loads on mobile**
8. **No console errors on page load**
9. **All API endpoints respond**
10. **Authentication persists on refresh**

---

## 📋 Test Execution Checklist

Before running tests:
- [ ] Test environment is set up
- [ ] Test data is prepared
- [ ] All services are running
- [ ] Browser drivers are updated

After running tests:
- [ ] All P0 tests pass
- [ ] No critical bugs found
- [ ] Performance metrics met
- [ ] Accessibility checks pass
- [ ] Cross-browser verified

---

## 🔄 Regression Test Suite

Run these tests after every deployment:
1. All Authentication Tests
2. Stock Search Functionality
3. Dashboard Overview
4. Add/Remove Watchlist
5. Basic Screener Filter
6. Protected Routes
7. Mobile Responsive Design

---

## 📝 Notes

- Replace test emails with actual test account credentials
- Adjust expected load times based on production metrics
- Update stock symbols if they become invalid
- Add new test scenarios as features are added
