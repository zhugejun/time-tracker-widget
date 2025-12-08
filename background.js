// Background Service Worker for Time Tracker Widget

// Check and reset timers at midnight
function setupMidnightReset() {
  const now = new Date();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );
  const msUntilMidnight = tomorrow.getTime() - now.getTime();

  console.log(
    `⏱️ Time Tracker: Next auto-reset scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`
  );

  // Schedule the reset for midnight
  setTimeout(() => {
    resetTodayData();
    // Schedule the next midnight reset
    setupMidnightReset();
  }, msUntilMidnight);
}

// Reset all timer data for today
function resetTodayData() {
  chrome.storage.local.get(['timeData'], function (data) {
    const timeData = data.timeData || {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

    console.log('⏱️ Time Tracker: Running midnight auto-reset...');

    // Remove all entries for yesterday (cleanup old data)
    let removedCount = 0;
    for (const key in timeData) {
      if (key.endsWith(yesterday)) {
        delete timeData[key];
        removedCount++;
      }
    }

    // Save cleaned data
    chrome.storage.local.set({ timeData }, function () {
      console.log(
        `⏱️ Time Tracker: Auto-reset complete. Removed ${removedCount} entries from yesterday.`
      );
      console.log(`⏱️ New day started: ${today}`);
    });
  });
}

// Function to manually reset today's data (called from options page)
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === 'resetTodayData') {
    chrome.storage.local.get(['timeData'], function (data) {
      const timeData = data.timeData || {};
      const today = new Date().toDateString();
      let removedCount = 0;

      // Remove all entries for today
      for (const key in timeData) {
        if (key.endsWith(today)) {
          delete timeData[key];
          removedCount++;
        }
      }

      // Save updated data
      chrome.storage.local.set({ timeData }, function () {
        console.log(
          `⏱️ Time Tracker: Manual reset complete. Removed ${removedCount} entries for today.`
        );
        
        // Broadcast reset message to all tabs
        chrome.tabs.query({}, function (tabs) {
          tabs.forEach((tab) => {
            chrome.tabs.sendMessage(
              tab.id,
              { action: 'resetTimer' },
              function () {
                // Ignore errors for tabs that don't have content script
                chrome.runtime.lastError;
              }
            );
          });
        });
        
        sendResponse({ success: true, count: removedCount });
      });
    });

    return true; // Will respond asynchronously
  }
});

// Initialize on service worker startup
setupMidnightReset();
console.log('⏱️ Time Tracker: Background service worker initialized');
