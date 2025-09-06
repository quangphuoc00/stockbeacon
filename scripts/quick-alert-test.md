# Quick Alert System Test Guide 🚀

## 1. Set Up a Test Alert (UI)

1. Go to `/watchlist`
2. Add a stock (e.g., AAPL)
3. Click "Set Alerts"
4. Enter test values:
   - Target Price: 1000 (high to ensure trigger)
   - Business Quality: 1 (low to ensure trigger)
   - Time to Buy: 1 (low to ensure trigger)
5. Click "Save Alerts"

## 2. Verify Alert Saved (API)

```bash
# Check your alerts
curl http://localhost:3002/api/test/watchlist-alerts \
  -H "Cookie: [your-cookie]" | python3 -m json.tool
```

## 3. Trigger Alert Check (Manual)

```bash
# Force check your alerts
curl -X POST http://localhost:3002/api/test/check-my-alerts \
  -H "Cookie: [your-cookie]"
```

## 4. Check Logs

Look for these messages in console:
- `🔔 Starting alert check...`
- `🎯 Alert triggered for AAPL!`
- `✅ Alert sent for AAPL`

## 5. Verify Email

Check your inbox for:
- Subject: "🎯 Perfect Storm Alert: AAPL"
- From: StockBeacon
- Shows all conditions met ✅

## Common Issues

### No alerts triggered?
- Check if `alert_enabled = true`
- Verify `buy_triggers` is not null
- Make sure conditions are achievable

### No email received?
- Check if RESEND_API_KEY is set
- Verify email address in profile
- Check spam folder

### Alert not checking?
- Market hours: Mon-Fri 9:30 AM - 4 PM EST
- Or use manual check endpoint
- Check server logs for errors

## Test Different Scenarios

### Scenario 1: Price Alert Only
```json
{
  "target_price": 150,
  "buy_triggers": null
}
```

### Scenario 2: Score Alerts Only
```json
{
  "target_price": null,
  "buy_triggers": {
    "minScore": 75,
    "minTimingScore": 60
  }
}
```

### Scenario 3: All Conditions
```json
{
  "target_price": 150,
  "buy_triggers": {
    "minScore": 70,
    "minTimingScore": 50
  }
}
```

## Success! 🎉

When you see an email in your inbox, the entire alert system is working end-to-end!
