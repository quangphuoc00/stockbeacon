#!/bin/bash

# Test script for company profile API endpoint

echo "=== Testing Company Profile API ==="
echo ""

# Test with Apple
echo "1. Testing AAPL (Apple Inc.):"
curl -s http://localhost:3000/api/stocks/AAPL/profile | jq '.'
echo ""

# Test with a different stock
echo "2. Testing MSFT (Microsoft):"
curl -s http://localhost:3000/api/stocks/MSFT/profile | jq '.'
echo ""

# Test with force refresh
echo "3. Testing with force refresh (GOOGL):"
curl -s "http://localhost:3000/api/stocks/GOOGL/profile?refresh=true" | jq '.'
echo ""

# Test error handling
echo "4. Testing invalid symbol:"
curl -s http://localhost:3000/api/stocks/INVALID123/profile | jq '.'
echo ""

echo "=== Test Complete ==="
