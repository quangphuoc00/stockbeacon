#!/bin/bash

# Test the Financial Analysis API endpoint

echo "🧪 Testing Financial Analysis API"
echo "================================"

API_BASE_URL=${API_BASE_URL:-"http://localhost:3000"}

# Test US stock (should work)
echo -e "\n1️⃣ Testing US Stock (AAPL)..."
echo "Request: GET $API_BASE_URL/api/stocks/AAPL/analysis"
response=$(curl -s "$API_BASE_URL/api/stocks/AAPL/analysis")

if [ $? -eq 0 ]; then
    # Check if response contains expected fields
    if echo "$response" | jq -e '.healthScore.overall' > /dev/null 2>&1; then
        echo "✅ Success! Health Score: $(echo "$response" | jq -r '.healthScore.overall') ($(echo "$response" | jq -r '.healthScore.grade'))"
        echo "   Summary: $(echo "$response" | jq -r '.summary.oneLineSummary')"
        echo "   Rating: $(echo "$response" | jq -r '.summary.simpleRating')"
        echo "   Strengths: $(echo "$response" | jq -r '.keyStrengths | length') found"
        echo "   Weaknesses: $(echo "$response" | jq -r '.keyWeaknesses | length') found"
        echo "   Red Flags: $(echo "$response" | jq -r '.redFlagsCount')"
        echo "   Green Flags: $(echo "$response" | jq -r '.greenFlagsCount')"
    else
        echo "❌ Error: Invalid response format"
        echo "$response" | jq '.'
    fi
else
    echo "❌ Error: Failed to connect to API"
fi

# Test another US stock
echo -e "\n2️⃣ Testing US Stock (MSFT)..."
echo "Request: GET $API_BASE_URL/api/stocks/MSFT/analysis"
response=$(curl -s "$API_BASE_URL/api/stocks/MSFT/analysis")

if [ $? -eq 0 ]; then
    if echo "$response" | jq -e '.healthScore.overall' > /dev/null 2>&1; then
        echo "✅ Success! Health Score: $(echo "$response" | jq -r '.healthScore.overall') ($(echo "$response" | jq -r '.healthScore.grade'))"
        echo "   Investment Suitability:"
        echo "   - Conservative: $(echo "$response" | jq -r '.summary.investmentSuitability.conservative')"
        echo "   - Growth: $(echo "$response" | jq -r '.summary.investmentSuitability.growth')"
        echo "   - Value: $(echo "$response" | jq -r '.summary.investmentSuitability.value')"
        echo "   - Income: $(echo "$response" | jq -r '.summary.investmentSuitability.income')"
    else
        echo "❌ Error: Invalid response format"
    fi
else
    echo "❌ Error: Failed to connect to API"
fi

# Test non-US stock (should fail gracefully)
echo -e "\n3️⃣ Testing Non-US Stock (TSM)..."
echo "Request: GET $API_BASE_URL/api/stocks/TSM/analysis"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$API_BASE_URL/api/stocks/TSM/analysis")
http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
json_response=$(echo "$response" | sed '/HTTP_STATUS/d')

if [ "$http_status" = "404" ]; then
    echo "✅ Correctly rejected non-US stock"
    echo "   Message: $(echo "$json_response" | jq -r '.message')"
else
    echo "❌ Error: Expected 404 for non-US stock, got $http_status"
fi

# Test invalid symbol
echo -e "\n4️⃣ Testing Invalid Symbol (XXXXX)..."
echo "Request: GET $API_BASE_URL/api/stocks/XXXXX/analysis"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$API_BASE_URL/api/stocks/XXXXX/analysis")
http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
json_response=$(echo "$response" | sed '/HTTP_STATUS/d')

if [ "$http_status" = "404" ]; then
    echo "✅ Correctly rejected invalid symbol"
    echo "   Message: $(echo "$json_response" | jq -r '.message')"
else
    echo "❌ Error: Expected 404 for invalid symbol, got $http_status"
fi

# Test response structure
echo -e "\n5️⃣ Testing Response Structure..."
response=$(curl -s "$API_BASE_URL/api/stocks/AAPL/analysis")

check_field() {
    if echo "$response" | jq -e ".$1" > /dev/null 2>&1; then
        echo "   ✅ $1"
    else
        echo "   ❌ Missing: $1"
    fi
}

echo "Checking required fields:"
check_field "symbol"
check_field "healthScore.overall"
check_field "healthScore.grade"
check_field "summary.oneLineSummary"
check_field "keyStrengths"
check_field "keyWeaknesses"
check_field "topRedFlags"
check_field "topGreenFlags"
check_field "keyRatios"
check_field "keyTrends"
check_field "recommendations"

# Display sample recommendation
echo -e "\n6️⃣ Sample Recommendation:"
recommendation=$(echo "$response" | jq -r '.recommendations[0]')
if [ "$recommendation" != "null" ]; then
    echo "   Priority: $(echo "$recommendation" | jq -r '.priority')"
    echo "   Title: $(echo "$recommendation" | jq -r '.title')"
    echo "   Description: $(echo "$recommendation" | jq -r '.description')"
else
    echo "   No recommendations found"
fi

echo -e "\n✅ API Test Complete!"
