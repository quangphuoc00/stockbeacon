# Testing Alert Checking System

## Quick Test Guide

### 1. Set Up Test Alerts
First, configure some alerts with conditions close to current values:

```javascript
// In browser console on watchlist page:
// 1. Click "Set Alerts" on a stock
// 2. Set conditions that should trigger:
//    - Target Price: Above current price (e.g., if AAPL is $150, set $155)
//    - Min Business Quality: Below current score (e.g., if score is 75, set 70)
//    - Min Time to Buy: Below current score (e.g., if score is 60, set 50)
// 3. Save the alert
```

### 2. Test Manual Alert Check (Development Only)

#### Option A: Check Your Alerts
```bash
# Check alerts for your user
curl -X POST http://localhost:3002/api/test/check-my-alerts \
  -H "Cookie: [your-auth-cookie]" \
  -H "Content-Type: application/json"
```

#### Option B: Trigger Full Alert Check
```bash
# Run the full alert check (dev mode)
curl http://localhost:3002/api/cron/check-alerts
```

### 3. View Your Active Alerts
```bash
# See all your configured alerts
curl http://localhost:3002/api/test/check-my-alerts \
  -H "Cookie: [your-auth-cookie]"
```

### 4. Check Console Logs
When alerts are checked, you'll see logs like:
```
🔔 Starting alert check...
Checking 3 active alerts...
Checking alerts for AAPL...
🎯 Alert triggered for AAPL!
✅ Alert check completed in 245ms
```

### 5. Verify Alert Evaluation
The system checks three conditions:
- ✅ Price ≤ Target Price
- ✅ Business Quality Score ≥ Minimum
- ✅ Time to Buy Score ≥ Minimum

All three must be true for an alert to trigger.

### Expected Results

#### If All Conditions Met:
```json
{
  "success": true,
  "message": "Checked 1 alerts",
  "alertsChecked": 1,
  "duration": "245ms"
}
```
Console: "🎯 Alert triggered for AAPL!"

#### If Conditions Not Met:
```json
{
  "success": true,
  "message": "Checked 1 alerts",
  "alertsChecked": 1,
  "duration": "198ms"
}
```
No trigger message in console.

### Troubleshooting

1. **No alerts found**: Make sure `alert_enabled = true` and `buy_triggers` is not null
2. **Conditions not triggering**: Check current values vs. your thresholds
3. **API errors**: Check if you're in development mode
4. **No notifications**: Phase 4 (notifications) not implemented yet

### Cron Schedule
- Alert checks run every 15 minutes during market hours (9:30 AM - 4:00 PM EST)
- Also run after daily score updates (2 AM EST)
- Manual checks available anytime in development mode
