// Popup script for Time Tracker Widget

document.addEventListener('DOMContentLoaded', function () {
  loadData();
  updatePauseButton();
  updateWidgetToggle();

  // Widget visibility toggle
  document
    .getElementById('widgetToggle')
    .addEventListener('click', function () {
      chrome.storage.local.get(['widgetVisible'], function (data) {
        const currentState = data.widgetVisible !== false; // Default is true
        const newState = !currentState;

        chrome.storage.local.set({ widgetVisible: newState }, function () {
          updateWidgetToggle();
          // Notify all tabs to show/hide widget
          chrome.tabs.query({}, function (tabs) {
            tabs.forEach((tab) => {
              chrome.tabs.sendMessage(
                tab.id,
                {
                  action: newState ? 'showWidget' : 'hideWidget',
                },
                function () {
                  // Ignore errors for tabs that don't have content script
                  chrome.runtime.lastError;
                }
              );
            });
          });
        });
      });
    });

  // Pause/Resume button
  document.getElementById('pauseBtn').addEventListener('click', function () {
    chrome.storage.local.get(['trackingPaused'], function (data) {
      const currentState = data.trackingPaused || false;
      const newState = !currentState;

      chrome.storage.local.set({ trackingPaused: newState }, function () {
        updatePauseButton();
      });
    });
  });

  // Dashboard button
  document
    .getElementById('dashboardBtn')
    .addEventListener('click', function () {
      chrome.tabs.create({ url: 'dashboard.html' });
    });

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', function () {
    chrome.runtime.openOptionsPage();
  });

  // Clear data button
  document.getElementById('clearData').addEventListener('click', function () {
    if (confirm('Clear all time tracking data? This cannot be undone.')) {
      chrome.storage.local.clear(function () {
        loadData();
        alert('All data cleared!');
      });
    }
  });
});

function loadData() {
  chrome.storage.local.get(['timeData', 'hiddenSites'], function (data) {
    displayTimeData(data.timeData || {});
    displayHiddenSites(data.hiddenSites || []);
  });
}

function displayTimeData(timeData) {
  const timeList = document.getElementById('timeList');
  const today = new Date().toDateString();

  // Filter today's data
  const todayData = {};
  for (const [key, value] of Object.entries(timeData)) {
    if (key.endsWith(today)) {
      const site = key.replace(`_${today}`, '');
      todayData[site] = value;
    }
  }

  // Sort by time spent
  const sortedSites = Object.entries(todayData).sort((a, b) => b[1] - a[1]);

  if (sortedSites.length === 0) {
    timeList.innerHTML =
      '<div class="empty-state">No activity tracked today</div>';
    return;
  }

  timeList.innerHTML = sortedSites
    .map(
      ([site, seconds]) => `
    <div class="time-item">
      <span class="site-name" title="${site}">${site}</span>
      <span class="site-time">${formatTime(seconds)}</span>
    </div>
  `
    )
    .join('');
}

function displayHiddenSites(hiddenSites) {
  const hiddenList = document.getElementById('hiddenList');
  const hiddenSection = document.getElementById('hiddenSection');

  if (hiddenSites.length === 0) {
    hiddenSection.style.display = 'none';
    return;
  }

  hiddenSection.style.display = 'block';
  hiddenList.innerHTML = hiddenSites
    .map(
      (site) => `
    <div class="hidden-site">
      <span title="${site}">${site}</span>
      <button class="show-btn" data-site="${site}">Show</button>
    </div>
  `
    )
    .join('');

  // Add event listeners to show buttons
  hiddenList.querySelectorAll('.show-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const site = this.getAttribute('data-site');
      chrome.storage.local.get(['hiddenSites'], function (data) {
        const hiddenSites = data.hiddenSites || [];
        const index = hiddenSites.indexOf(site);
        if (index > -1) {
          hiddenSites.splice(index, 1);
          chrome.storage.local.set({ hiddenSites }, function () {
            loadData();
          });
        }
      });
    });
  });
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function updatePauseButton() {
  chrome.storage.local.get(['trackingPaused'], function (data) {
    const isPaused = data.trackingPaused || false;
    const btn = document.getElementById('pauseBtn');

    if (isPaused) {
      btn.textContent = '▶️ Resume All';
      btn.style.background = '#10b981';
    } else {
      btn.textContent = '⏸️ Pause All';
      btn.style.background = '#f59e0b';
    }
  });
}

function updateWidgetToggle() {
  chrome.storage.local.get(['widgetVisible'], function (data) {
    const isVisible = data.widgetVisible !== false; // Default is true
    const toggle = document.getElementById('widgetToggle');

    if (isVisible) {
      toggle.classList.add('active');
    } else {
      toggle.classList.remove('active');
    }
  });
}
