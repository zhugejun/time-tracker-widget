// Dashboard JavaScript

let currentPeriod = 'today';
let allTimeData = {};
let chart = null;

// Load data when page loads
document.addEventListener('DOMContentLoaded', function () {
  loadDashboardData();
  setupEventListeners();
});

function setupEventListeners() {
  // Period selector buttons
  document.querySelectorAll('.period-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      document
        .querySelectorAll('.period-btn')
        .forEach((b) => b.classList.remove('active'));
      this.classList.add('active');
      currentPeriod = this.getAttribute('data-period');
      loadDashboardData();
    });
  });

  // Export button
  document.getElementById('exportBtn').addEventListener('click', exportData);

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', function () {
    chrome.runtime.openOptionsPage();
  });
}

function loadDashboardData() {
  chrome.storage.local.get(['timeData'], function (data) {
    allTimeData = data.timeData || {};
    processAndDisplayData();
  });
}

function processAndDisplayData() {
  const filteredData = filterDataByPeriod(allTimeData, currentPeriod);

  // Calculate stats
  const stats = calculateStats(filteredData);

  // Update UI
  updateStatsCards(stats);
  updateTopSitesList(stats.sortedSites.slice(0, 5));
  updateAllSitesList(stats.sortedSites);
  updateChart(stats.sortedSites.slice(0, 10));

  // Show insights for today only
  if (currentPeriod === 'today' && stats.sortedSites.length > 0) {
    updateInsights(stats);
  } else {
    document.getElementById('insights').style.display = 'none';
  }
}

function filterDataByPeriod(timeData, period) {
  const now = new Date();
  const filtered = {};

  Object.keys(timeData).forEach((key) => {
    const [domain, dateStr] = key.split('_');
    const itemDate = new Date(dateStr);

    let include = false;

    switch (period) {
      case 'today':
        include = itemDate.toDateString() === now.toDateString();
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        include = itemDate.toDateString() === yesterday.toDateString();
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        include = itemDate >= weekAgo;
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        include = itemDate >= monthAgo;
        break;
      case 'all':
        include = true;
        break;
    }

    if (include) {
      if (!filtered[domain]) {
        filtered[domain] = 0;
      }
      filtered[domain] += timeData[key];
    }
  });

  return filtered;
}

function calculateStats(data) {
  const sites = Object.keys(data);
  const times = Object.values(data);

  const totalSeconds = times.reduce((sum, time) => sum + time, 0);
  const avgSeconds = sites.length > 0 ? totalSeconds / sites.length : 0;

  const sortedSites = sites
    .map((site) => ({
      domain: site,
      seconds: data[site],
      formatted: formatTime(data[site]),
    }))
    .sort((a, b) => b.seconds - a.seconds);

  const topSite = sortedSites.length > 0 ? sortedSites[0] : null;

  return {
    totalSeconds,
    avgSeconds,
    sitesCount: sites.length,
    sortedSites,
    topSite,
  };
}

function updateStatsCards(stats) {
  document.getElementById('totalTime').textContent = formatTime(
    stats.totalSeconds
  );
  document.getElementById('sitesCount').textContent = stats.sitesCount;
  document.getElementById('avgTime').textContent = formatTime(
    Math.floor(stats.avgSeconds)
  );

  if (stats.topSite) {
    document.getElementById('topSite').textContent = truncate(
      stats.topSite.domain,
      20
    );
    document.getElementById('topSiteTime').textContent =
      stats.topSite.formatted;
  } else {
    document.getElementById('topSite').textContent = '-';
    document.getElementById('topSiteTime').textContent = 'No data yet';
  }
}

function updateTopSitesList(sites) {
  const container = document.getElementById('topSitesList');

  if (sites.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <h3>No Data Yet</h3>
        <p>Start browsing to see your top sites</p>
      </div>
    `;
    return;
  }

  const maxTime = sites[0].seconds;

  container.innerHTML = sites
    .map((site, index) => {
      const percentage = (site.seconds / maxTime) * 100;
      const initial = site.domain.charAt(0).toUpperCase();
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
      const color = colors[index % colors.length];

      return `
      <div class="site-item">
        <div class="site-icon" style="background: ${color}">
          ${initial}
        </div>
        <div class="site-info">
          <div class="site-name" title="${site.domain}">${site.domain}</div>
          <div class="site-bar-container">
            <div class="site-bar" style="width: ${percentage}%; background: ${color}"></div>
          </div>
        </div>
        <div class="site-time">${site.formatted}</div>
      </div>
    `;
    })
    .join('');
}

function updateAllSitesList(sites) {
  const container = document.getElementById('allSitesList');

  if (sites.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🌐</div>
        <h3>No Sites Tracked</h3>
        <p>Visit some websites to see them here</p>
      </div>
    `;
    return;
  }

  const maxTime = sites[0].seconds;

  container.innerHTML = sites
    .map((site, index) => {
      const percentage = (site.seconds / maxTime) * 100;
      const initial = site.domain.charAt(0).toUpperCase();

      return `
      <div class="site-item">
        <div class="site-icon">
          ${initial}
        </div>
        <div class="site-info">
          <div class="site-name" title="${site.domain}">${site.domain}</div>
          <div class="site-bar-container">
            <div class="site-bar" style="width: ${percentage}%"></div>
          </div>
        </div>
        <div class="site-time">${site.formatted}</div>
      </div>
    `;
    })
    .join('');
}

function updateChart(sites) {
  const ctx = document.getElementById('timeChart').getContext('2d');

  if (chart) {
    chart.destroy();
  }

  if (sites.length === 0) {
    return;
  }

  const labels = sites.map((s) => truncate(s.domain, 15));
  const data = sites.map((s) => (s.seconds / 3600).toFixed(2)); // Convert to hours

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Hours',
          data: data,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const hours = Math.floor(context.parsed.y);
              const minutes = Math.floor((context.parsed.y - hours) * 60);
              return `${hours}h ${minutes}m`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return value + 'h';
            },
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    },
  });
}

function updateInsights(stats) {
  const container = document.getElementById('insights');
  container.style.display = 'grid';

  // Focus Score (based on time distribution)
  const focusScore = calculateFocusScore(stats.sortedSites);
  document.getElementById('focusScore').textContent = focusScore + '%';
  document.getElementById('focusDescription').textContent =
    focusScore > 70
      ? 'High focus on few sites'
      : focusScore > 40
      ? 'Moderate distribution'
      : 'Time spread across many sites';

  // Trend (compare to yesterday if available)
  const trendData = calculateTrend();
  document.getElementById('trendValue').textContent = trendData.value;
  document.getElementById('trendDescription').textContent =
    trendData.description;

  // Peak time (would need hourly tracking - simplified for now)
  document.getElementById('peakTime').textContent = 'N/A';
  document.getElementById('peakDescription').textContent =
    'Coming soon - hourly tracking';
}

function calculateFocusScore(sites) {
  if (sites.length === 0) return 0;
  if (sites.length === 1) return 100;

  // Calculate concentration: how much time is spent on top site vs others
  const totalTime = sites.reduce((sum, site) => sum + site.seconds, 0);
  const topSitePercent = (sites[0].seconds / totalTime) * 100;

  // Score is based on concentration
  return Math.round(topSitePercent);
}

function calculateTrend() {
  const today = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  let todayTotal = 0;
  let yesterdayTotal = 0;

  Object.keys(allTimeData).forEach((key) => {
    const [domain, dateStr] = key.split('_');
    if (dateStr === today) {
      todayTotal += allTimeData[key];
    } else if (dateStr === yesterdayStr) {
      yesterdayTotal += allTimeData[key];
    }
  });

  if (yesterdayTotal === 0) {
    return {
      value: 'N/A',
      description: 'No data from yesterday',
    };
  }

  const change = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
  const direction = change > 0 ? '↑' : '↓';

  return {
    value: `${direction} ${Math.abs(Math.round(change))}%`,
    description:
      change > 0
        ? `${Math.abs(Math.round(change))}% more than yesterday`
        : `${Math.abs(Math.round(change))}% less than yesterday`,
  };
}

function exportData() {
  const data = processExportData();
  const csv = convertToCSV(data);
  downloadCSV(
    csv,
    `time-tracker-${currentPeriod}-${
      new Date().toISOString().split('T')[0]
    }.csv`
  );
}

function processExportData() {
  const filteredData = filterDataByPeriod(allTimeData, currentPeriod);
  const rows = [];

  Object.keys(filteredData).forEach((domain) => {
    rows.push({
      domain: domain,
      seconds: filteredData[domain],
      time: formatTime(filteredData[domain]),
      hours: (filteredData[domain] / 3600).toFixed(2),
    });
  });

  return rows.sort((a, b) => b.seconds - a.seconds);
}

function convertToCSV(data) {
  const headers = ['Domain', 'Time', 'Hours', 'Seconds'];
  const rows = data.map((row) => [
    row.domain,
    row.time,
    row.hours,
    row.seconds,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// Utility functions
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}h ${m}m`;
  } else if (m > 0) {
    return `${m}m ${s}s`;
  } else {
    return `${s}s`;
  }
}

function truncate(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}
