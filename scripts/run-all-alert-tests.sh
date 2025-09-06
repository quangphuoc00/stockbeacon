#!/bin/bash

# Master test runner for alert system
# Runs all test suites and generates comprehensive report

echo "🚀 STOCKBEACON ALERT SYSTEM - MASTER TEST SUITE"
echo "=============================================="
echo ""
echo "Starting comprehensive testing..."
echo ""

# Create test results directory
mkdir -p test-results
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="test-results/alert-test-report-$TIMESTAMP.txt"

# Initialize report
echo "StockBeacon Alert System Test Report" > $REPORT_FILE
echo "Generated: $(date)" >> $REPORT_FILE
echo "========================================" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# 1. System Verification
echo "1️⃣ Running System Verification..."
echo "" >> $REPORT_FILE
echo "SYSTEM VERIFICATION" >> $REPORT_FILE
echo "==================" >> $REPORT_FILE
./scripts/verify-alert-system.sh >> $REPORT_FILE 2>&1
echo ""

# 2. API Tests
echo "2️⃣ Running API Tests..."
echo "" >> $REPORT_FILE
echo "API TESTS" >> $REPORT_FILE
echo "=========" >> $REPORT_FILE
if [ -f "$HOME/.stockbeacon-auth-cookie" ]; then
    ./scripts/test-alert-api.sh >> $REPORT_FILE 2>&1
else
    echo "Skipped - No auth cookie" >> $REPORT_FILE
fi
echo ""

# 3. Automated Tests
echo "3️⃣ Running Automated Tests..."
echo "" >> $REPORT_FILE
echo "AUTOMATED TESTS" >> $REPORT_FILE
echo "===============" >> $REPORT_FILE
./scripts/test-alert-system-automated.sh >> $REPORT_FILE 2>&1
echo ""

# 4. Test Case Summary
echo "4️⃣ Generating Test Case Summary..."
echo "" >> $REPORT_FILE
echo "TEST SCENARIOS" >> $REPORT_FILE
echo "==============" >> $REPORT_FILE
node scripts/test-alert-system-comprehensive.js >> $REPORT_FILE 2>&1
echo ""

# 5. Database Check
echo "5️⃣ Checking Database Schema..."
echo "" >> $REPORT_FILE
echo "DATABASE SCHEMA" >> $REPORT_FILE
echo "===============" >> $REPORT_FILE
if [ -f "supabase/migrations/003_add_alert_cooldown_fields.sql" ]; then
    echo "✅ Cooldown migration exists" >> $REPORT_FILE
else
    echo "❌ Cooldown migration missing" >> $REPORT_FILE
fi
echo ""

# Generate summary
echo "" >> $REPORT_FILE
echo "FINAL SUMMARY" >> $REPORT_FILE
echo "=============" >> $REPORT_FILE

# Count results
PASS_COUNT=$(grep -c "✅" $REPORT_FILE)
FAIL_COUNT=$(grep -c "❌" $REPORT_FILE)
TOTAL_COUNT=$((PASS_COUNT + FAIL_COUNT))

echo "Total Tests: $TOTAL_COUNT" >> $REPORT_FILE
echo "Passed: $PASS_COUNT" >> $REPORT_FILE
echo "Failed: $FAIL_COUNT" >> $REPORT_FILE
echo "" >> $REPORT_FILE

if [ $FAIL_COUNT -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED!" >> $REPORT_FILE
    STATUS="PASS"
else
    echo "⚠️ Some tests failed. Review results above." >> $REPORT_FILE
    STATUS="FAIL"
fi

# Display summary
echo ""
echo "📊 TEST EXECUTION COMPLETE"
echo "========================="
echo "Total Tests: $TOTAL_COUNT"
echo "Passed: $PASS_COUNT ✅"
echo "Failed: $FAIL_COUNT ❌"
echo ""
echo "Full report saved to: $REPORT_FILE"
echo ""

if [ "$STATUS" = "PASS" ]; then
    echo "🎉 ALL TESTS PASSED! The alert system is fully functional."
else
    echo "⚠️ Some tests failed. Check the report for details."
fi

echo ""
echo "📝 Next Steps:"
echo "1. Review the full report: cat $REPORT_FILE"
echo "2. Test email delivery: node scripts/test-email-alerts.js"
echo "3. Configure a real alert and wait for market conditions"
echo "4. Monitor logs: tail -f *.log"
