#!/bin/bash

# Simple Moat Analysis Tester
echo "🧪 Testing Enhanced Moat Analysis"
echo "================================="
echo ""

# Test stocks
STOCKS=("AAPL" "MSFT" "PYPL" "GOOGL" "AMZN")

for SYMBOL in "${STOCKS[@]}"; do
    echo "Testing $SYMBOL..."
    
    # Make API call
    RESPONSE=$(curl -s http://localhost:3000/api/stocks/$SYMBOL/moat)
    
    # Check if we got moat analysis
    if echo "$RESPONSE" | grep -q "moatAnalysis"; then
        SCORE=$(echo "$RESPONSE" | jq -r '.moatAnalysis.overallScore' 2>/dev/null)
        STRENGTH=$(echo "$RESPONSE" | jq -r '.moatAnalysis.strength' 2>/dev/null)
        
        if [ "$SCORE" != "null" ]; then
            echo "✅ $SYMBOL: Score $SCORE/100 - $STRENGTH Moat"
            echo "   Summary: $(echo "$RESPONSE" | jq -r '.moatAnalysis.summary' | head -c 100)..."
        else
            echo "⚠️  $SYMBOL: Analysis returned but empty"
        fi
    else
        ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
        echo "❌ $SYMBOL: $ERROR"
    fi
    echo ""
done

echo "================================="
echo "✨ Test Complete!"
