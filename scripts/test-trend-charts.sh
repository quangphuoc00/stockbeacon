#!/bin/bash

echo "🧪 Testing Trend Charts Display"
echo "=============================="

# Test API endpoint to verify trend data is being returned
echo -e "\n1️⃣ Testing API Response for Trend Data..."

# Test MSFT (should have good trend data)
echo -e "\n📊 Testing MSFT trends:"
curl -s http://localhost:3000/api/stocks/MSFT/analysis | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)

print(f'Health Score: {data[\"healthScore\"][\"overall\"]}/100')
print(f'\\nKey Trends ({len(data[\"keyTrends\"])}):')
for trend in data.get('keyTrends', []):
    print(f'\\n  📈 {trend[\"metric\"]}:')
    print(f'     Direction: {trend[\"direction\"]} {trend[\"visualIndicator\"]}')
    if 'cagr' in trend and trend['cagr'] is not None:
        print(f'     CAGR: {trend[\"cagr\"]:.1f}%')
    if 'periods' in trend and trend['periods']:
        print(f'     Data points: {len(trend[\"periods\"])} years')
        first = trend['periods'][0]
        last = trend['periods'][-1]
        print(f'     Range: {first[\"date\"][:4]} to {last[\"date\"][:4]}')
        print(f'     Values: ${first[\"value\"]/1e9:.1f}B → ${last[\"value\"]/1e9:.1f}B')
        change = ((last['value'] - first['value']) / first['value'] * 100)
        print(f'     Total change: {change:+.1f}%')
    print(f'     Insight: {trend[\"insight\"][:80]}...')
"

# Test GOOGL
echo -e "\n\n📊 Testing GOOGL trends:"
curl -s http://localhost:3000/api/stocks/GOOGL/analysis | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)

print(f'Trends found: {len(data[\"keyTrends\"])}')
for trend in data.get('keyTrends', []):
    periods = trend.get('periods', [])
    print(f'  • {trend[\"metric\"]}: {len(periods)} data points, {trend[\"direction\"]}')
"

echo -e "\n\n2️⃣ Visual UI Test Instructions:"
echo "================================"
echo "1. Open http://localhost:3000/stocks/MSFT"
echo "2. Navigate to 'Financials' tab"
echo "3. Click on 'Trends' tab and verify:"
echo "   ✓ Line charts display for Revenue, Net Income, Free Cash Flow"
echo "   ✓ Charts show multiple years of data"
echo "   ✓ Green color for improving trends, red for declining"
echo "   ✓ Data points are clickable with tooltips"
echo "   ✓ CAGR percentage is displayed"
echo "   ✓ First and last values are labeled"
echo "   ✓ Year labels on x-axis"
echo ""
echo "4. Visual features to check:"
echo "   ✓ Gradient fill under the line"
echo "   ✓ Grid lines for reference"
echo "   ✓ Direction indicator (↗️/↘️/➡️)"
echo "   ✓ Total change percentage"
echo "   ✓ Latest year-over-year change"
echo ""
echo "✅ If all charts display correctly with smooth lines and data, the implementation is successful!"
