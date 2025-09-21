#!/bin/bash

echo "🧪 Testing Enhanced Financial Displays"
echo "===================================="

# Test API endpoint to verify enhanced data is being returned
echo -e "\n1️⃣ Testing API Response Structure..."

# Test AAPL (should have red flags with figures)
echo -e "\n📊 Testing AAPL (Company with red flags):"
curl -s http://localhost:3000/api/stocks/AAPL/analysis | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)

print(f'Health Score: {data[\"healthScore\"][\"overall\"]}/100 ({data[\"healthScore\"][\"grade\"]})')
print(f'\\nRed Flags ({data[\"redFlagsCount\"]}):')
for i, flag in enumerate(data.get('redFlags', [])[:2]):
    print(f'  {i+1}. {flag[\"title\"]}')
    if 'technicalDescription' in flag:
        print(f'     📊 {flag[\"technicalDescription\"]}')
    if 'confidence' in flag:
        print(f'     🎯 Confidence: {flag[\"confidence\"]}%')
    print()

print(f'\\nGreen Flags ({data[\"greenFlagsCount\"]}):')
for i, flag in enumerate(data.get('greenFlags', [])[:2]):
    print(f'  {i+1}. {flag[\"title\"]}')
    if 'technicalDescription' in flag:
        print(f'     📊 {flag[\"technicalDescription\"]}')
    print()

print('Key Ratios:')
for ratio in data.get('keyRatios', [])[:2]:
    print(f'  • {ratio[\"name\"]}: {ratio[\"value\"]} ({ratio[\"score\"]})')
    if 'formula' in ratio:
        print(f'    Formula: {ratio[\"formula\"]}')
"

# Test MSFT (excellent company with green flags)
echo -e "\n📊 Testing MSFT (Excellent company):"
curl -s http://localhost:3000/api/stocks/MSFT/analysis | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)

print(f'Health Score: {data[\"healthScore\"][\"overall\"]}/100 ({data[\"healthScore\"][\"grade\"]})')
print(f'\\nGreen Flags: {data[\"greenFlagsCount\"]} total')
flag = data.get('greenFlags', [])[0] if data.get('greenFlags') else None
if flag:
    print(f'  Example: {flag[\"title\"]}')
    if 'technicalDescription' in flag:
        print(f'  Numbers: {flag[\"technicalDescription\"]}')
"

echo -e "\n\n2️⃣ Visual UI Test Instructions:"
echo "================================"
echo "1. Open http://localhost:3000/stocks/AAPL"
echo "2. Navigate to 'Financials' tab"
echo "3. Click on 'Flags' tab and verify:"
echo "   ✓ Red/Green flags show actual financial figures"
echo "   ✓ Each flag has confidence percentage"
echo "   ✓ Visual comparisons (progress bars) for red flags"
echo "   ✓ Recommendations are displayed"
echo ""
echo "4. Click on 'Ratios' tab and verify:"
echo "   ✓ Each ratio shows the actual calculation"
echo "   ✓ Benchmark visualization with position indicator"
echo "   ✓ Color-coded performance levels"
echo "   ✓ Beginner-friendly explanations"
echo ""
echo "✅ If all elements display correctly, the enhancement is successful!"
