 # StockBeacon Test Cases

## 🔐 Phase 1: Authentication & Core Setup

### 1.1 User Registration
- **Test**: Navigate to http://localhost:3003/register
- **Expected**: Registration form with email, password, risk tolerance fields
- **Action**: Fill form with:
  - Email: test@example.com
  - Password: Test123!
  - Risk Tolerance: Moderate
- **Verify**: User created in Supabase, redirected to dashboard

### 1.2 User Login
- **Test**: Navigate to http://localhost:3003/login
- **Expected**: Login form with email/password fields
- **Action**: Enter valid credentials
- **Verify**: Successful login, redirected to dashboard

### 1.3 Protected Routes
- **Test**: Access http://localhost:3003/dashboard without login
- **Expected**: Redirect to /login page
- **Verify**: Cannot access protected pages without authentication

---

## 📊 Phase 2: Stock Data Engine

### 2.1 Individual Stock Data
**Test URL**: http://localhost:3003/test-stocks

**Test Cases**:
```
1. Search "AAPL"
   - Verify: Current price displays
   - Verify: StockBeacon Score (0-100) shows
   - Verify: Price change percentage with color coding
   
2. Search "NVDA"
   - Verify: Technical indicators display (RSI, MACD, etc.)
   - Verify: Financial metrics load
   - Verify: Historical data chart appears

3. Search "INVALID"
   - Verify: Error message appears
   - Verify: App doesn't crash
```

### 2.2 StockBeacon Score Calculation
**API Test**: 
```bash
curl "http://localhost:3003/api/stocks/MSFT" | jq '.data.score'
```

**Verify**:
- Score between 0-100
- Business Quality Score (0-60)
- Timing Score (0-40)
- Recommendation: strong_buy/buy/hold/sell/strong_sell
- Strengths & Weaknesses arrays

### 2.3 Technical Indicators
**Test Stocks**: TSLA, META, AMZN

**Verify Each Has**:
- RSI value (0-100)
- SMA 20/50/200
- MACD with signal line
- Bollinger Bands
- Support/Resistance levels
- Trend: bullish/bearish/neutral

### 2.4 API Endpoints

#### Top Stocks API
```bash
curl "http://localhost:3003/api/stocks/top?limit=5"
```
**Verify**: Returns array of 5 stocks with prices

#### Trending Stocks API
```bash
curl "http://localhost:3003/api/stocks/trending"
```
**Verify**: Returns 10 trending stocks

#### Screener API
```bash
curl "http://localhost:3003/api/stocks/screener?minScore=60&maxScore=100"
```
**Verify**: Returns filtered stocks with score >= 60

---

## 🎯 Phase 3: User Features

### 3.1 Dashboard
**URL**: http://localhost:3003/dashboard

**Test Elements**:
- [ ] Portfolio summary card shows total value
- [ ] Day's gain/loss with percentage
- [ ] Watchlist displays 6 stocks
- [ ] Top gainers section (3 stocks)
- [ ] Top losers section (3 stocks)
- [ ] Trending stocks carousel
- [ ] Quick search bar works

### 3.2 Stock Screener
**URL**: http://localhost:3003/screener

**Filter Tests**:
1. **Score Filter**
   - Set range: 70-100
   - Apply filters
   - Verify: Only high-score stocks shown

2. **Price Filter**
   - Set range: $10-$100
   - Apply filters
   - Verify: Stocks within price range

3. **Sector Filter**
   - Select: Technology
   - Apply filters
   - Verify: Only tech stocks displayed

4. **Sort Options**
   - Sort by: Score (Descending)
   - Verify: Highest scores first
   - Sort by: % Change
   - Verify: Biggest gainers first

5. **Export Function**
   - Click Export button
   - Verify: CSV file downloads

### 3.3 Stock Detail Pages
**URL**: http://localhost:3003/stocks/[SYMBOL]

**Test Symbols**: AAPL, GOOGL, TSLA, NFLX

**Verify Each Page Has**:
- [ ] Current price with change
- [ ] 52-week range
- [ ] Market cap
- [ ] StockBeacon Score breakdown
- [ ] Key statistics (P/E, EPS, Beta)
- [ ] Technical indicators tab
- [ ] Financial metrics tab
- [ ] Watch/Alert buttons

---

## 🔥 Edge Cases & Error Handling

### 4.1 Invalid Stock Symbol
- **Test**: Search for "XXXYYY"
- **Expected**: Graceful error message
- **Verify**: App continues functioning

### 4.2 API Rate Limiting
- **Test**: Rapid-fire 20 requests
- **Expected**: Cached data served
- **Verify**: No API errors

### 4.3 Missing Data
- **Test**: Search "BRK.A" (known edge case)
- **Expected**: Partial data displayed
- **Verify**: No crashes, shows available data

### 4.4 Network Issues
- **Test**: Disconnect internet, navigate pages
- **Expected**: Cached content shows
- **Verify**: Error boundaries work

---

## 🚀 Performance Tests

### 5.1 Page Load Times
- Dashboard: < 2 seconds
- Screener: < 2 seconds
- Stock Details: < 3 seconds

### 5.2 API Response Times
- Individual stock: < 1 second (cached)
- Trending stocks: < 2 seconds
- Screener results: < 2 seconds

### 5.3 Concurrent Users
- Test with 5 browser tabs
- All should function independently
- No data corruption

---

## ✅ Quick Test Checklist

```bash
# 1. Test Public Access
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3003/test-stocks
# Expected: 200

# 2. Test API Health
curl "http://localhost:3003/api/stocks/AAPL" | jq '.success'
# Expected: true

# 3. Test Score Calculation
curl "http://localhost:3003/api/stocks/TSLA" | jq '.data.score.score'
# Expected: Number 0-100

# 4. Test Trending
curl "http://localhost:3003/api/stocks/trending" | jq '.data | length'
# Expected: 10

# 5. Test Screener
curl "http://localhost:3003/api/stocks/screener?minScore=50" | jq '.success'
# Expected: true
```

---

## 🎨 UI/UX Tests

### Visual Consistency
- [ ] Dark mode support (if implemented)
- [ ] Mobile responsive (test at 375px, 768px, 1024px)
- [ ] Loading states show spinners
- [ ] Error states show helpful messages
- [ ] Success states show confirmations

### Accessibility
- [ ] Tab navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG standards
- [ ] Forms have proper labels

---

## 📝 Manual Test Sequence

1. **Fresh User Flow**
   - Register new account
   - Complete onboarding
   - Search first stock
   - Add to watchlist
   - Use screener
   - View stock details

2. **Power User Flow**
   - Login existing account
   - Check dashboard metrics
   - Run complex screener filter
   - Export results
   - View multiple stock pages
   - Test all tabs on detail page

3. **Error Recovery Flow**
   - Trigger 404 (bad URL)
   - Trigger API error (invalid symbol)
   - Test back button
   - Test refresh after error
   - Verify data persistence
