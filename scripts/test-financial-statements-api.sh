#!/bin/bash

echo "Testing Financial Statements API"
echo "================================"

# Test different symbols
symbols=("AAPL" "MSFT" "GOOGL" "AMZN")

for symbol in "${symbols[@]}"; do
    echo -e "\n📊 Testing $symbol..."
    echo "--------------------"
    
    # Call the API endpoint
    response=$(curl -s "http://localhost:3000/api/stocks/$symbol/financial-statements")
    
    if [ $? -eq 0 ]; then
        # Check if response contains expected fields
        if echo "$response" | grep -q "incomeStatements"; then
            echo "✅ Income statements found"
            
            # Extract some key metrics
            annual_count=$(echo "$response" | grep -o '"annual":\[[^]]*\]' | grep -o '"date"' | wc -l)
            quarterly_count=$(echo "$response" | grep -o '"quarterly":\[[^]]*\]' | head -1 | grep -o '"date"' | wc -l)
            
            echo "  - Annual periods: $annual_count"
            echo "  - Quarterly periods: $quarterly_count"
        else
            echo "❌ No income statements found"
        fi
        
        if echo "$response" | grep -q "balanceSheets"; then
            echo "✅ Balance sheets found"
        else
            echo "❌ No balance sheets found"
        fi
        
        if echo "$response" | grep -q "cashFlowStatements"; then
            echo "✅ Cash flow statements found"
        else
            echo "❌ No cash flow statements found"
        fi
    else
        echo "❌ API call failed for $symbol"
    fi
done

echo -e "\n✅ API test completed!"
