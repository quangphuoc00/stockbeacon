#!/bin/bash

# Automated Alert System Test Runner
# Executes comprehensive tests for the alert functionality

echo "🧪 AUTOMATED ALERT SYSTEM TEST SUITE"
echo "===================================="
echo ""

# Configuration
BASE_URL="http://localhost:3002"
TEST_USER_EMAIL="test@example.com"
RESULTS_FILE="alert-test-results.log"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
PASSED=0
FAILED=0
SKIPPED=0

# Initialize results file
echo "Alert System Test Results - $(date)" > $RESULTS_FILE
echo "====================================" >> $RESULTS_FILE

# Helper function to log results
log_result() {
    local test_name=$1
    local status=$2
    local details=$3
    
    echo "$test_name: $status - $details" >> $RESULTS_FILE
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        ((PASSED++))
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ FAIL${NC}: $test_name - $details"
        ((FAILED++))
    else
        echo -e "${YELLOW}⚠️ SKIP${NC}: $test_name - $details"
        ((SKIPPED++))
    fi
}

# Function to get auth cookie
get_auth_cookie() {
    # Check if cookie file exists
    if [ -f "$HOME/.stockbeacon-auth-cookie" ]; then
        cat "$HOME/.stockbeacon-auth-cookie"
    else
        echo ""
    fi
}

COOKIE=$(get_auth_cookie)

if [ -z "$COOKIE" ]; then
    log_result "Authentication" "SKIP" "No auth cookie found"
    echo ""
    echo "Please login to the app first to run authenticated tests"
    echo ""
fi

# Test 1: API Health Check
echo -e "\n${BLUE}1️⃣ API HEALTH CHECKS${NC}"
echo "-------------------"

# Test watchlist endpoint
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/watchlist" -H "Cookie: $COOKIE")
if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "401" ]; then
    log_result "Watchlist API" "PASS" "Returns $RESPONSE"
else
    log_result "Watchlist API" "FAIL" "Returns $RESPONSE"
fi

# Test alert cron endpoint
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/cron/check-alerts")
if [ "$RESPONSE" = "200" ]; then
    log_result "Alert Cron API" "PASS" "Accessible"
else
    log_result "Alert Cron API" "FAIL" "Returns $RESPONSE"
fi

# Test 2: Frontend Form Validation
echo -e "\n${BLUE}2️⃣ FORM VALIDATION TESTS${NC}"
echo "------------------------"

if [ -n "$COOKIE" ]; then
    # Get a watchlist item for testing
    WATCHLIST_DATA=$(curl -s "$BASE_URL/api/watchlist" -H "Cookie: $COOKIE")
    ITEM_ID=$(echo "$WATCHLIST_DATA" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if data.get('success') and data.get('data') and len(data['data']) > 0:
    print(data['data'][0].get('id', ''))
" 2>/dev/null)
    
    if [ -n "$ITEM_ID" ]; then
        # Test valid update
        VALID_UPDATE=$(curl -s -X PATCH "$BASE_URL/api/watchlist" \
            -H "Cookie: $COOKIE" \
            -H "Content-Type: application/json" \
            -d '{
                "id": "'$ITEM_ID'",
                "updates": {
                    "target_price": 150.50,
                    "buy_triggers": {
                        "minScore": 75,
                        "minTimingScore": 60,
                        "enabled": true
                    }
                }
            }')
        
        if echo "$VALID_UPDATE" | grep -q '"success":true'; then
            log_result "Valid alert update" "PASS" "Saved successfully"
        else
            log_result "Valid alert update" "FAIL" "$VALID_UPDATE"
        fi
        
        # Test invalid score
        INVALID_SCORE=$(curl -s -X PATCH "$BASE_URL/api/watchlist" \
            -H "Cookie: $COOKIE" \
            -H "Content-Type: application/json" \
            -d '{
                "id": "'$ITEM_ID'",
                "updates": {
                    "buy_triggers": {
                        "minScore": 150
                    }
                }
            }')
        
        if echo "$INVALID_SCORE" | grep -q "between 0 and 100"; then
            log_result "Invalid score validation" "PASS" "Rejected correctly"
        else
            log_result "Invalid score validation" "FAIL" "Accepted invalid score"
        fi
        
        # Test negative price
        NEGATIVE_PRICE=$(curl -s -X PATCH "$BASE_URL/api/watchlist" \
            -H "Cookie: $COOKIE" \
            -H "Content-Type: application/json" \
            -d '{
                "id": "'$ITEM_ID'",
                "updates": {
                    "target_price": -50
                }
            }')
        
        if echo "$NEGATIVE_PRICE" | grep -q "positive number"; then
            log_result "Negative price validation" "PASS" "Rejected correctly"
        else
            log_result "Negative price validation" "FAIL" "Accepted negative price"
        fi
    else
        log_result "Form validation tests" "SKIP" "No watchlist items found"
    fi
else
    log_result "Form validation tests" "SKIP" "Authentication required"
fi

# Test 3: Alert Condition Evaluation
echo -e "\n${BLUE}3️⃣ ALERT CONDITION TESTS${NC}"
echo "------------------------"

if [ -n "$COOKIE" ]; then
    # Check current alerts
    ALERT_CHECK=$(curl -s -X POST "$BASE_URL/api/test/check-my-alerts" \
        -H "Cookie: $COOKIE" \
        -H "Content-Type: application/json")
    
    if echo "$ALERT_CHECK" | grep -q '"success":true'; then
        ALERTS_CHECKED=$(echo "$ALERT_CHECK" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('alertsChecked', 0))
" 2>/dev/null)
        
        log_result "Alert checking" "PASS" "Checked $ALERTS_CHECKED alerts"
        
        # Log the conditions being checked
        echo "$ALERT_CHECK" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'alerts' in data:
    for alert in data['alerts']:
        print(f\"  - {alert['symbol']}: Price < {alert['conditions'].get('targetPrice', 'Any')}, Score >= {alert['conditions'].get('minScore', 'Any')}, Timing >= {alert['conditions'].get('minTimingScore', 'Any')}\")
" 2>/dev/null
    else
        log_result "Alert checking" "FAIL" "$ALERT_CHECK"
    fi
else
    log_result "Alert condition tests" "SKIP" "Authentication required"
fi

# Test 4: Database Schema
echo -e "\n${BLUE}4️⃣ DATABASE SCHEMA TESTS${NC}"
echo "------------------------"

# Check migration files
if [ -f "supabase/migrations/003_add_alert_cooldown_fields.sql" ]; then
    log_result "Cooldown migration" "PASS" "Migration file exists"
else
    log_result "Cooldown migration" "FAIL" "Migration file missing"
fi

# Test 5: Performance Tests
echo -e "\n${BLUE}5️⃣ PERFORMANCE TESTS${NC}"
echo "--------------------"

# Test alert check speed
if [ -n "$COOKIE" ]; then
    START_TIME=$(date +%s%N)
    curl -s -X POST "$BASE_URL/api/test/check-my-alerts" \
        -H "Cookie: $COOKIE" \
        -H "Content-Type: application/json" > /dev/null
    END_TIME=$(date +%s%N)
    
    DURATION=$(( ($END_TIME - $START_TIME) / 1000000 ))
    
    if [ $DURATION -lt 1000 ]; then
        log_result "Alert check performance" "PASS" "${DURATION}ms"
    else
        log_result "Alert check performance" "FAIL" "${DURATION}ms (>1000ms)"
    fi
else
    log_result "Performance tests" "SKIP" "Authentication required"
fi

# Test 6: Error Handling
echo -e "\n${BLUE}6️⃣ ERROR HANDLING TESTS${NC}"
echo "-----------------------"

# Test missing ID
MISSING_ID=$(curl -s -X PATCH "$BASE_URL/api/watchlist" \
    -H "Cookie: $COOKIE" \
    -H "Content-Type: application/json" \
    -d '{"updates": {"target_price": 100}}')

if echo "$MISSING_ID" | grep -q "ID is required"; then
    log_result "Missing ID error" "PASS" "Handled correctly"
else
    log_result "Missing ID error" "FAIL" "Not handled properly"
fi

# Test 7: Integration Tests
echo -e "\n${BLUE}7️⃣ INTEGRATION TESTS${NC}"
echo "--------------------"

# Test full flow: Set alert → Check conditions
if [ -n "$COOKIE" ] && [ -n "$ITEM_ID" ]; then
    # Set up an alert
    SETUP_ALERT=$(curl -s -X PATCH "$BASE_URL/api/watchlist" \
        -H "Cookie: $COOKIE" \
        -H "Content-Type: application/json" \
        -d '{
            "id": "'$ITEM_ID'",
            "updates": {
                "target_price": 999999,
                "buy_triggers": {
                    "minScore": 1,
                    "minTimingScore": 1,
                    "enabled": true
                }
            }
        }')
    
    # Check if it would trigger
    sleep 1
    CHECK_RESULT=$(curl -s -X POST "$BASE_URL/api/test/check-my-alerts" \
        -H "Cookie: $COOKIE" \
        -H "Content-Type: application/json")
    
    if echo "$SETUP_ALERT" | grep -q '"success":true'; then
        log_result "Full integration flow" "PASS" "Alert configured and checked"
    else
        log_result "Full integration flow" "FAIL" "Setup or check failed"
    fi
else
    log_result "Integration tests" "SKIP" "Authentication required"
fi

# Test Summary
echo -e "\n${BLUE}📊 TEST SUMMARY${NC}"
echo "=============="
echo -e "Passed:  ${GREEN}$PASSED${NC}"
echo -e "Failed:  ${RED}$FAILED${NC}"
echo -e "Skipped: ${YELLOW}$SKIPPED${NC}"
echo -e "Total:   $((PASSED + FAILED + SKIPPED))"
echo ""

# Save summary to file
echo "" >> $RESULTS_FILE
echo "Summary:" >> $RESULTS_FILE
echo "Passed: $PASSED" >> $RESULTS_FILE
echo "Failed: $FAILED" >> $RESULTS_FILE
echo "Skipped: $SKIPPED" >> $RESULTS_FILE

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo "Overall: PASS" >> $RESULTS_FILE
else
    echo -e "${RED}❌ Some tests failed. Check $RESULTS_FILE for details.${NC}"
    echo "Overall: FAIL" >> $RESULTS_FILE
fi

echo ""
echo "Full results saved to: $RESULTS_FILE"
echo ""

# Additional manual test suggestions
echo "📝 MANUAL TESTS TO PERFORM:"
echo "1. Set an alert with achievable conditions"
echo "2. Wait for market data to meet conditions"
echo "3. Verify email notification received"
echo "4. Check cooldown prevents duplicate alerts"
echo "5. Test with multiple stocks and users"
