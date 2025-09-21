#!/bin/bash

echo "Testing FMP Keys Database Management"
echo "==================================="
echo ""

# Test 1: Get current key stats
echo "📊 Current FMP Key Statistics:"
echo "-----------------------------"
curl -s "http://localhost:3000/api/admin/fmp-keys" | jq '.'

echo ""
echo ""

# Test 2: Add test keys (you can replace with real keys)
echo "➕ Adding Test Keys:"
echo "-------------------"
# curl -X POST "http://localhost:3000/api/admin/fmp-keys" \
#   -H "Content-Type: application/json" \
#   -d '{"keys": ["test-key-1", "test-key-2", "test-key-3"]}' | jq '.'

echo "Uncomment the curl command above and add real keys to test"
echo ""

# Test 3: Test financial statements API
echo "🧪 Testing Financial Statements API:"
echo "-----------------------------------"
response=$(curl -s "http://localhost:3000/api/stocks/AAPL/financial-statements")

if echo "$response" | grep -q "grossProfit.*[0-9]"; then
    echo "✅ FMP is working - detailed financial data available"
    echo ""
    echo "Sample fields with data:"
    echo "$response" | grep -o '"[^"]*":[0-9][^,}]*' | head -10 | sed 's/^/  /'
else
    echo "⚠️  Using Yahoo Finance fallback (limited data)"
    echo ""
    echo "To enable FMP:"
    echo "1. Get API keys from https://financialmodelingprep.com/developer/docs/"
    echo "2. Add keys using:"
    echo '   curl -X POST "http://localhost:3000/api/admin/fmp-keys" \'
    echo '     -H "Content-Type: application/json" \'
    echo '     -d '"'"'{"keys": ["key1", "key2", "key3"]}'"'"''
fi

echo ""
echo "✅ Test completed!"
