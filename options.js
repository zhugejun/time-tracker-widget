// Options page script

let trackAllSites = true;
let trackedSites = [];

document.addEventListener('DOMContentLoaded', function () {
  loadSettings();
  setupEventListeners();
});

function setupEventListeners() {
  // Theme selection
  document.querySelectorAll('.theme-card').forEach((card) => {
    card.addEventListener('click', function () {
      const theme = this.getAttribute('data-theme');
      selectTheme(theme);
      saveSettings({ widgetTheme: theme });
    });
  });

  // Track all toggle
  document
    .getElementById('trackAllToggle')
    .addEventListener('click', function () {
      trackAllSites = !trackAllSites;
      this.classList.toggle('active');
      updateTrackingMode();
      saveSettings({ trackAllSites: trackAllSites });
    });

  // Add site button
  document.getElementById('addSiteBtn').addEventListener('click', addSite);

  // Enter key in input
  document
    .getElementById('siteInput')
    .addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        addSite();
      }
    });
}

function loadSettings() {
  chrome.storage.local.get(
    ['widgetTheme', 'trackAllSites', 'trackedSites'],
    function (data) {
      // Load theme
      const theme = data.widgetTheme || 'dark';
      selectTheme(theme);

      // Load tracking mode
      trackAllSites =
        data.trackAllSites !== undefined ? data.trackAllSites : true;
      document
        .getElementById('trackAllToggle')
        .classList.toggle('active', trackAllSites);

      // Load tracked sites
      trackedSites = data.trackedSites || [];
      updateTrackingMode();
    }
  );
}

function selectTheme(theme) {
  console.log('Selecting theme:', theme);
  document.querySelectorAll('.theme-card').forEach((card) => {
    card.classList.remove('active');
  });
  const selectedCard = document.querySelector(
    `.theme-card[data-theme="${theme}"]`
  );
  if (selectedCard) {
    selectedCard.classList.add('active');
    console.log('Theme selected successfully:', theme);
  } else {
    console.error('Theme card not found:', theme);
  }
}

function updateTrackingMode() {
  const siteListSection = document.getElementById('siteListSection');

  if (trackAllSites) {
    siteListSection.style.display = 'none';
  } else {
    siteListSection.style.display = 'block';
    renderTrackedSites();
  }
}

function addSite() {
  const input = document.getElementById('siteInput');
  let site = input.value.trim().toLowerCase();

  if (!site) return;

  // Clean up the input
  site = site
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');

  if (site && !trackedSites.includes(site)) {
    trackedSites.push(site);
    renderTrackedSites();
    saveSettings({ trackedSites: trackedSites });
    input.value = '';
    showSaveNotice();
  }
}

function removeSite(site) {
  trackedSites = trackedSites.filter((s) => s !== site);
  renderTrackedSites();
  saveSettings({ trackedSites: trackedSites });
  showSaveNotice();
}

function renderTrackedSites() {
  const container = document.getElementById('trackedSites');

  if (trackedSites.length === 0) {
    container.innerHTML =
      '<p style="color: #6b7280; font-size: 14px; padding: 16px; text-align: center;">No sites added yet. Add sites you want to track.</p>';
    return;
  }

  container.innerHTML = trackedSites
    .map(
      (site) => `
    <div class="site-item">
      <span>${site}</span>
      <button class="remove-btn" onclick="removeSiteFromList('${site}')">Remove</button>
    </div>
  `
    )
    .join('');
}

// Make this available globally for onclick
window.removeSiteFromList = function (site) {
  removeSite(site);
};

function saveSettings(settings) {
  chrome.storage.local.set(settings, function () {
    showSaveNotice();
  });
}

function showSaveNotice() {
  const notice = document.getElementById('saveNotice');
  notice.classList.add('show');
  setTimeout(() => {
    notice.classList.remove('show');
  }, 2000);
}
