#!/bin/bash

echo "Testing Financial Modeling Prep Integration"
echo "=========================================="
echo ""

# Check if FMP API keys are set
if [ -n "$FMP_API_KEYS" ]; then
    key_count=$(echo "$FMP_API_KEYS" | tr ',' '\n' | wc -l | tr -d ' ')
    echo "✅ FMP_API_KEYS configured with $key_count keys for rotation"
    echo "   Daily limit: $((key_count * 250)) API calls"
    echo ""
elif [ -n "$FMP_API_KEY" ]; then
    echo "✅ FMP_API_KEY configured (single key)"
    echo "   Daily limit: 250 API calls"
    echo ""
else
    echo "❌ No FMP API keys configured"
    echo "   Please add your FMP API key(s) to .env.local:"
    echo ""
    echo "   Option 1 - Single key:"
    echo "   FMP_API_KEY=your-api-key-here"
    echo ""
    echo "   Option 2 - Multiple keys for rotation:"
    echo "   FMP_API_KEYS=key1,key2,key3"
    echo ""
    echo "   Get free API keys at: https://financialmodelingprep.com/developer/docs/"
    echo ""
fi

# Test the API endpoint
echo "📊 Testing API endpoint for AAPL..."
echo "-----------------------------------"

response=$(curl -s "http://localhost:3000/api/stocks/AAPL/financial-statements")

if [ $? -eq 0 ]; then
    # Check if we got detailed data (FMP) or limited data (Yahoo)
    revenue_count=$(echo "$response" | grep -o '"revenue":[0-9]' | wc -l)
    gross_profit_count=$(echo "$response" | grep -o '"grossProfit":[0-9]' | wc -l)
    operating_income_count=$(echo "$response" | grep -o '"operatingIncome":[0-9]' | wc -l)
    
    echo "Data Analysis:"
    echo "  - Revenue entries found: $revenue_count"
    echo "  - Gross Profit entries found: $gross_profit_count"
    echo "  - Operating Income entries found: $operating_income_count"
    echo ""
    
    if [ $gross_profit_count -gt 0 ] && [ $operating_income_count -gt 0 ]; then
        echo "✅ Financial Modeling Prep is working! (Detailed data available)"
        echo ""
        echo "Sample data fields found:"
        echo "$response" | grep -o '"[^"]*":[0-9][^,}]*' | head -20 | sed 's/^/  /'
    else
        echo "⚠️  Using Yahoo Finance (Limited data - only revenue and net income)"
        echo ""
        echo "To enable detailed financial statements:"
        echo "1. Get a free API key from https://financialmodelingprep.com/developer/docs/"
        echo "2. Add to .env.local: FMP_API_KEY=your-api-key"
        echo "3. Restart the development server"
    fi
else
    echo "❌ Failed to connect to API endpoint"
    echo "   Make sure the development server is running on http://localhost:3000"
fi

echo ""
echo "Test completed!"
