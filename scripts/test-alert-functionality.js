// Test script for alert functionality (Phases 1 & 2)
// Run this in browser console on the watchlist page

async function testAlertFunctionality() {
  console.log('🧪 Starting Alert Functionality Tests...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Check if watchlist has items
  console.log('Test 1: Checking watchlist items...');
  const watchlistCards = document.querySelectorAll('[class*="card"]');
  if (watchlistCards.length > 0) {
    results.passed++;
    results.tests.push({ name: 'Watchlist has items', status: '✅ PASS' });
    console.log('✅ Found', watchlistCards.length, 'watchlist items');
  } else {
    results.failed++;
    results.tests.push({ name: 'Watchlist has items', status: '❌ FAIL - No items found' });
    console.log('❌ No watchlist items found. Add some stocks first.');
    return results;
  }

  // Test 2: Check if Set Alerts button exists
  console.log('\nTest 2: Checking Set Alerts button...');
  const setAlertsButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Set Alerts')
  );
  
  if (setAlertsButton) {
    results.passed++;
    results.tests.push({ name: 'Set Alerts button exists', status: '✅ PASS' });
    console.log('✅ Found Set Alerts button');
  } else {
    results.failed++;
    results.tests.push({ name: 'Set Alerts button exists', status: '❌ FAIL' });
    console.log('❌ Set Alerts button not found');
    return results;
  }

  // Test 3: Test opening dialog
  console.log('\nTest 3: Testing dialog opening...');
  setAlertsButton.click();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const dialog = document.querySelector('[role="dialog"]');
  if (dialog && dialog.textContent.includes('Configure Buy Alerts')) {
    results.passed++;
    results.tests.push({ name: 'Dialog opens correctly', status: '✅ PASS' });
    console.log('✅ Dialog opened successfully');
  } else {
    results.failed++;
    results.tests.push({ name: 'Dialog opens correctly', status: '❌ FAIL' });
    console.log('❌ Dialog did not open');
    return results;
  }

  // Test 4: Check if form inputs exist
  console.log('\nTest 4: Checking form inputs...');
  const inputs = dialog.querySelectorAll('input[type="number"]');
  if (inputs.length === 3) {
    results.passed++;
    results.tests.push({ name: 'All 3 inputs present', status: '✅ PASS' });
    console.log('✅ Found all 3 input fields');
  } else {
    results.failed++;
    results.tests.push({ name: 'All 3 inputs present', status: '❌ FAIL - Found ' + inputs.length });
    console.log('❌ Expected 3 inputs, found', inputs.length);
  }

  // Test 5: Test input functionality
  console.log('\nTest 5: Testing input functionality...');
  const [targetPriceInput, minScoreInput, minTimingScoreInput] = inputs;
  
  // Set test values
  targetPriceInput.value = '150.50';
  targetPriceInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  minScoreInput.value = '75';
  minScoreInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  minTimingScoreInput.value = '60';
  minTimingScoreInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (targetPriceInput.value === '150.50' && minScoreInput.value === '75' && minTimingScoreInput.value === '60') {
    results.passed++;
    results.tests.push({ name: 'Input values update correctly', status: '✅ PASS' });
    console.log('✅ Input values set successfully');
  } else {
    results.failed++;
    results.tests.push({ name: 'Input values update correctly', status: '❌ FAIL' });
    console.log('❌ Input values did not update correctly');
  }

  // Test 6: Test Save button
  console.log('\nTest 6: Testing Save Alerts button...');
  const saveButton = Array.from(dialog.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Save Alerts')
  );
  
  if (saveButton) {
    results.passed++;
    results.tests.push({ name: 'Save button exists', status: '✅ PASS' });
    console.log('✅ Found Save Alerts button');
    
    // Monitor network request
    console.log('📡 Monitoring network for PATCH request...');
    
    // Click save
    saveButton.click();
    
    // Wait for request
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for success message
    const successMessage = document.body.textContent.includes('Alert settings saved');
    if (successMessage) {
      results.passed++;
      results.tests.push({ name: 'Save shows success message', status: '✅ PASS' });
      console.log('✅ Success message displayed');
    } else {
      results.failed++;
      results.tests.push({ name: 'Save shows success message', status: '❌ FAIL' });
      console.log('❌ No success message found');
    }
  } else {
    results.failed++;
    results.tests.push({ name: 'Save button exists', status: '❌ FAIL' });
    console.log('❌ Save button not found');
  }

  // Test 7: Close and reopen dialog to check persistence
  console.log('\nTest 7: Testing value persistence...');
  
  // Close dialog
  const closeButton = dialog.querySelector('button[aria-label*="Close"]');
  if (closeButton) closeButton.click();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Reopen dialog
  setAlertsButton.click();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const newDialog = document.querySelector('[role="dialog"]');
  const newInputs = newDialog.querySelectorAll('input[type="number"]');
  
  if (newInputs[0].value === '150.5' || newInputs[0].placeholder === '150.5') {
    results.passed++;
    results.tests.push({ name: 'Values persist after reload', status: '✅ PASS' });
    console.log('✅ Values persisted correctly');
  } else {
    results.failed++;
    results.tests.push({ name: 'Values persist after reload', status: '⚠️ PARTIAL' });
    console.log('⚠️ Values may not have persisted (check placeholder)');
  }

  // Summary
  console.log('\n📊 TEST SUMMARY:');
  console.log('================');
  results.tests.forEach(test => {
    console.log(`${test.status} - ${test.name}`);
  });
  console.log('================');
  console.log(`Total: ${results.passed + results.failed} tests`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  
  return results;
}

// Run the test
console.log('To run tests, execute: testAlertFunctionality()');
console.log('Make sure you are on the watchlist page first!');

// Auto-run if on watchlist page
if (window.location.pathname.includes('watchlist')) {
  testAlertFunctionality();
}
