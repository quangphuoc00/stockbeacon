# Moat Score Synchronization Fix - Testing Guide

## What Was Fixed

### 1. Added Debug Logging
- Stock page server-side: Logs when checking for cached moat analysis
- StockDataService: Logs when checking for cached moat during score calculation
- StockBeaconScore: Logs whether AI moat is used or estimated moat
- Client component: Logs initial data and score updates
- UI: Logs when displaying scores and expected conversions

### 2. Score Recalculation
- Created `/api/stocks/[symbol]/recalculate-score` endpoint
- When moat analysis is loaded, score is automatically recalculated
- Updated score is reflected in the Overview tab

### 3. Improved Caching
- Server-side fetches cached moat analysis on page load
- Stock data service includes cached moat in score calculation
- Shared Redis instance for better performance

## How to Test

1. **Clear browser console and terminal**

2. **Navigate to a stock page** (e.g., /stocks/AAPL)

3. **Check the terminal logs**:
   ```
   [Page] Checking for cached moat analysis: moat_analysis:AAPL
   [StockDataService] Checking for cached moat analysis: moat_analysis:AAPL
   [StockBeaconScore] Calculating score for AAPL:
     - AI Moat Analysis: Yes/No
     - Moat Score: X/20
   ```

4. **Check browser console**:
   ```
   [StockDetailsClient] Initializing for AAPL
     - Initial moat analysis: Yes/No
     - Initial score: X (moat: Y/20)
   [UI] Displaying scores - Total: X, Moat: Y/20
   ```

5. **Click on the Moat Analysis tab**
   - If moat wasn't cached, it will fetch fresh analysis
   - Watch for: "Moat analysis loaded, recalculating score..."
   - Score should update in Overview tab

6. **Verify synchronization**:
   - Overview Moat Score (X/20) should match Moat Analysis (Y/100)
   - Formula: X/20 = Y/100 (e.g., 18/20 = 90/100)

## Expected Behavior

### Case 1: Moat Analysis Already Cached
- Both tabs show synchronized scores immediately
- No additional API calls needed

### Case 2: No Cached Moat Analysis
- Overview shows estimated moat score initially
- Clicking Moat Analysis tab fetches AI analysis
- Score automatically recalculates and updates
- Both tabs now synchronized

## Troubleshooting

If scores are still not synchronized:
1. Check if moat analysis is being cached (24-hour TTL)
2. Verify Redis is working properly
3. Look for any error messages in console/terminal
4. Try force refresh with ?refresh=true on moat endpoint
