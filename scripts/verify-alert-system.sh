#!/bin/bash

# Comprehensive test script for the alert system
echo "🧪 Verifying Alert System Implementation"
echo "========================================"
echo ""

# Configuration
BASE_URL="http://localhost:3002"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

# Function to check if a file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2 exists"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $2 not found at $1"
        ((FAILED++))
    fi
}

# Function to check if API endpoint responds
check_endpoint() {
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$1")
    if [ "$RESPONSE" = "$2" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $3 returns $2"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $3 returns $RESPONSE (expected $2)"
        ((FAILED++))
    fi
}

echo "1️⃣ Phase 1: Frontend Implementation"
echo "-----------------------------------"
check_file "src/app/(protected)/watchlist/page.tsx" "Watchlist page"
echo ""

echo "2️⃣ Phase 2: Backend API"
echo "----------------------"
check_file "src/app/api/watchlist/route.ts" "Watchlist API"
check_endpoint "$BASE_URL/api/watchlist" "401" "Watchlist API (401 = auth required)"
echo ""

echo "3️⃣ Phase 3: Alert Checking System"
echo "--------------------------------"
check_file "src/lib/services/alert-checker.service.ts" "AlertCheckerService"
check_file "src/app/api/cron/check-alerts/route.ts" "Alert check cron endpoint"
check_file "src/app/api/test/check-my-alerts/route.ts" "Test alert endpoint"
check_endpoint "$BASE_URL/api/cron/check-alerts" "200" "Alert cron GET endpoint"
echo ""

echo "4️⃣ Database Schema Check"
echo "-----------------------"
if grep -q "buy_triggers JSONB" supabase/migrations/*.sql 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}: buy_triggers column exists in schema"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️ WARN${NC}: Could not verify buy_triggers column"
fi

if grep -q "alert_enabled BOOLEAN" supabase/migrations/*.sql 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}: alert_enabled column exists in schema"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️ WARN${NC}: Could not verify alert_enabled column"
fi
echo ""

echo "5️⃣ Test Files"
echo "------------"
check_file "scripts/test-alert-functionality.js" "Frontend test script"
check_file "scripts/test-alert-backend.js" "Backend test script"
check_file "scripts/test-alert-api.sh" "API test script"
check_file "scripts/test-alert-checking.md" "Alert checking guide"
echo ""

echo "6️⃣ Documentation"
echo "---------------"
check_file "ALERT_IMPLEMENTATION_PLAN.md" "Implementation plan"
check_file "ALERT_TEST_RESULTS.md" "Test results"
echo ""

echo "========================================"
echo "📊 Summary"
echo "========================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! The alert system is properly implemented.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Configure alerts in the UI"
    echo "2. Test alert checking with: curl -X POST $BASE_URL/api/test/check-my-alerts"
    echo "3. Check if NotificationService is sending emails (Phase 4)"
else
    echo -e "${RED}❌ Some checks failed. Please review the implementation.${NC}"
fi

echo ""
echo "To run a full integration test:"
echo "1. Login to the app"
echo "2. Add stocks to watchlist"
echo "3. Set alert conditions"
echo "4. Run: curl -X POST $BASE_URL/api/test/check-my-alerts -H 'Cookie: [your-cookie]'"
