// Script to clear financial analysis cache
// Run this in the browser console on the stock page

// Clear sessionStorage cache
const keysToRemove = [];
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  if (key && key.includes('financial_analysis_cache')) {
    keysToRemove.push(key);
  }
}

keysToRemove.forEach(key => {
  sessionStorage.removeItem(key);
  console.log(`Removed: ${key}`);
});

console.log(`Cleared ${keysToRemove.length} cached items`);

// Force refresh the page
window.location.reload();
