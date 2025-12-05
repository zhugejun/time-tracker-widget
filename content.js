// Time Tracker Widget - Content Script

(function () {
  'use strict';

  try {
    // Check if chrome.storage is available
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      console.log('⏱️ Time Tracker: Extension not fully loaded yet');
      return;
    }

    // Avoid running multiple times
    if (window.timeTrackerInjected) return;
    window.timeTrackerInjected = true;

    // Check for extension context invalidation - improved version
    function isContextValid() {
      try {
        // Try to access chrome.runtime.id - this will throw if context is invalid
        if (chrome && chrome.runtime && chrome.runtime.id) {
          return true;
        }
        return false;
      } catch (e) {
        // Any error means context is invalid
        return false;
      }
    }

    // If context is already invalid at startup, exit gracefully
    if (!isContextValid()) {
      console.log(
        '⏱️ Time Tracker: Extension was reloaded. Refresh the page to see the widget.'
      );
      return;
    }

    // Safe chrome.storage wrapper
    function safeStorageGet(keys, callback) {
      if (!isContextValid()) {
        console.log(
          'Time Tracker: Storage get skipped - extension context invalid'
        );
        // Don't call callback if context is invalid
        return;
      }
      try {
        chrome.storage.local.get(keys, function (data) {
          try {
            // Check context again in callback
            if (!isContextValid()) {
              console.log(
                'Time Tracker: Storage callback skipped - context became invalid'
              );
              return;
            }
            callback(data);
          } catch (callbackError) {
            // Catch errors in user's callback
            if (
              callbackError.message &&
              callbackError.message.includes('Extension context invalidated')
            ) {
              console.log(
                '⏱️ Time Tracker: Extension context invalidated during callback. Refresh the page.'
              );
            } else {
              console.warn('Time Tracker: Callback error', callbackError);
            }
          }
        });
      } catch (e) {
        console.warn('Time Tracker: Storage get error', e.message || e);
      }
    }

    function safeStorageSet(data, callback) {
      if (!isContextValid()) {
        console.log(
          'Time Tracker: Storage set skipped - extension context invalid'
        );
        return;
      }
      try {
        chrome.storage.local.set(data, callback);
      } catch (e) {
        console.warn('Time Tracker: Storage set error', e.message || e);
      }
    }

    // State
    let startTime = Date.now();
    let elapsedSeconds = 0;
    let timerInterval = null;
    let isVisible = true;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    // Get current domain
    const currentDomain = window.location.hostname;

    // Create widget HTML
    const widget = document.createElement('div');
    widget.id = 'time-tracker-widget';
    widget.innerHTML = `
    <div class="time-tracker-header">
      <span class="time-tracker-icon">⏱️</span>
      <span class="time-tracker-title">Time on ${currentDomain}</span>
      <button class="time-tracker-pause" title="Pause tracking">⏸️</button>
      <button class="time-tracker-close" title="Hide">×</button>
    </div>
    <div class="time-tracker-time">00:00:00</div>
    <button class="time-tracker-reset" title="Reset timer">Reset</button>
  `;

    // Load saved position
    safeStorageGet(
      [
        'widgetPosition',
        'hiddenSites',
        'timeData',
        'widgetTheme',
        'trackAllSites',
        'trackedSites',
        'trackingPaused',
        'widgetVisible',
      ],
      function (data) {
        // Early exit if context is invalid - prevents all errors
        if (!isContextValid()) {
          console.log(
            'Time Tracker: Skipping widget initialization - extension context invalid'
          );
          return;
        }

        // Check if widget should be globally hidden
        const widgetVisible = data.widgetVisible !== false; // Default is true
        if (!widgetVisible) {
          isVisible = false;
          return;
        }

        // Check tracking mode
        const trackAllSites =
          data.trackAllSites !== undefined ? data.trackAllSites : true;
        const trackedSites = data.trackedSites || [];

        if (!trackAllSites && !trackedSites.includes(currentDomain)) {
          // Not tracking this site
          return;
        }

        // Check if this site should be hidden
        const hiddenSites = data.hiddenSites || [];
        if (hiddenSites.includes(currentDomain)) {
          isVisible = false;
          return;
        }

        // Apply saved position or default
        const position = data.widgetPosition || { x: 20, y: 20 };
        widget.style.left = position.x + 'px';
        widget.style.top = position.y + 'px';

        // Apply theme
        const theme = data.widgetTheme || 'dark';
        widget.className = `theme-${theme}`;

        // Load previous time for this site today
        const today = new Date().toDateString();
        const timeData = data.timeData || {};
        const siteKey = `${currentDomain}_${today}`;
        elapsedSeconds = timeData[siteKey] || 0;

        // Add to page
        document.body.appendChild(widget);

        // Initialize pause state
        const trackingPaused = data.trackingPaused || false;
        updatePauseButton(trackingPaused);

        // Start timer (if not paused)
        if (!trackingPaused) {
          startTimer();
        } else {
          console.log('⏱️ Tracking is paused globally');
        }
      }
    );

    // Listen for theme updates AND time updates from other tabs
    try {
      if (isContextValid()) {
        chrome.storage.onChanged.addListener(function (changes, namespace) {
          if (!isContextValid()) return;

          // Theme changes
          if (changes.widgetTheme) {
            const theme = changes.widgetTheme.newValue || 'dark';
            widget.className = `theme-${theme}`;
          }

          // Time data changes from other tabs - SYNC!
          if (changes.timeData && changes.timeData.newValue) {
            const today = new Date().toDateString();
            const siteKey = `${currentDomain}_${today}`;
            const newTimeData = changes.timeData.newValue;

            if (
              newTimeData[siteKey] !== undefined &&
              newTimeData[siteKey] !== elapsedSeconds
            ) {
              // Another tab updated the time - sync to it!
              elapsedSeconds = newTimeData[siteKey];
              updateDisplay();
              console.log(
                '⏱️ Time synced from another tab:',
                formatTime(elapsedSeconds)
              );
            }
          }

          // Pause state changes from other tabs/popup - SYNC!
          if (changes.trackingPaused !== undefined) {
            const isPaused = changes.trackingPaused.newValue;
            updatePauseButton(isPaused);

            if (isPaused) {
              // Paused from another tab
              console.log('⏸️ Tracking paused from another source');
              if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
              }
              saveTimeData();
            } else {
              // Resumed from another tab
              console.log('▶️ Tracking resumed from another source');
              if (!document.hidden) {
                startTimer();
              }
            }
          }
        });
      }
    } catch (e) {
      console.warn('Time Tracker: Could not add storage listener', e);
    }

    // Listen for messages from popup to show/hide widget
    try {
      if (isContextValid()) {
        chrome.runtime.onMessage.addListener(function (
          message,
          sender,
          sendResponse
        ) {
          if (!isContextValid()) return;

          if (message.action === 'hideWidget') {
            if (widget && widget.parentNode) {
              widget.style.display = 'none';
              isVisible = false;
              // Stop timer when hidden
              if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
              }
              saveTimeData();
            }
          } else if (message.action === 'showWidget') {
            if (widget && widget.parentNode) {
              widget.style.display = 'block';
              isVisible = true;
              // Restart timer when shown (if not paused globally)
              safeStorageGet(['trackingPaused'], function (data) {
                const isPaused = data.trackingPaused || false;
                if (!isPaused && !document.hidden) {
                  startTimer();
                }
              });
            }
          }
        });
      }
    } catch (e) {
      console.warn('Time Tracker: Could not add message listener', e);
    }

    // Helper function to format time for logging
    function formatTime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }

    // Update pause button appearance
    function updatePauseButton(isPaused) {
      const pauseBtn = widget.querySelector('.time-tracker-pause');
      if (pauseBtn) {
        if (isPaused) {
          pauseBtn.textContent = '▶️';
          pauseBtn.title = 'Resume tracking';
          widget.style.opacity = '0.7';
        } else {
          pauseBtn.textContent = '⏸️';
          pauseBtn.title = 'Pause tracking';
          widget.style.opacity = '1';
        }
      }
    }

    // Toggle pause state
    function togglePause() {
      safeStorageGet(['trackingPaused'], function (data) {
        if (!isContextValid()) return;

        const currentState = data.trackingPaused || false;
        const newState = !currentState;

        safeStorageSet({ trackingPaused: newState }, function () {
          updatePauseButton(newState);

          if (newState) {
            // Pausing
            console.log('⏸️ Tracking paused globally');
            if (timerInterval) {
              clearInterval(timerInterval);
              timerInterval = null;
            }
            saveTimeData();
          } else {
            // Resuming
            console.log('▶️ Tracking resumed');
            startTimer();
          }
        });
      });
    }

    // Timer functions
    function startTimer() {
      if (!isContextValid()) return;

      // Don't start timer if tab is not visible
      if (document.hidden) {
        console.log('⏱️ Tab hidden - timer paused');
        return;
      }

      // Check if tracking is paused globally
      safeStorageGet(['timeData', 'trackingPaused'], function (data) {
        if (!isContextValid()) return;

        // Don't start if paused
        if (data.trackingPaused) {
          console.log('⏱️ Tracking is paused - timer not started');
          updatePauseButton(true);
          return;
        }

        const today = new Date().toDateString();
        const timeData = data.timeData || {};
        const siteKey = `${currentDomain}_${today}`;

        // Use the latest time from storage
        if (timeData[siteKey] !== undefined) {
          elapsedSeconds = timeData[siteKey];
        }

        updateDisplay();

        // Clear any existing timer
        if (timerInterval) {
          clearInterval(timerInterval);
        }

        // Start counting
        timerInterval = setInterval(() => {
          if (!isContextValid()) {
            clearInterval(timerInterval);
            return;
          }

          // Only count if tab is visible
          if (document.hidden) {
            return;
          }

          elapsedSeconds++;
          updateDisplay();

          // Save every 10 seconds
          if (elapsedSeconds % 10 === 0) {
            saveTimeData();
          }
        }, 1000);
      });
    }

    function updateDisplay() {
      if (!isContextValid()) return;

      const hours = Math.floor(elapsedSeconds / 3600);
      const minutes = Math.floor((elapsedSeconds % 3600) / 60);
      const seconds = elapsedSeconds % 60;

      const timeString = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      const timeDisplay = widget.querySelector('.time-tracker-time');
      if (timeDisplay) {
        timeDisplay.textContent = timeString;

        // Change color based on time spent
        if (elapsedSeconds > 3600) {
          // > 1 hour
          timeDisplay.style.color = '#ef4444';
        } else if (elapsedSeconds > 1800) {
          // > 30 min
          timeDisplay.style.color = '#f59e0b';
        } else {
          timeDisplay.style.color = '#10b981';
        }
      }
    }

    function pad(num) {
      return num.toString().padStart(2, '0');
    }

    function saveTimeData() {
      if (!isContextValid()) return;

      const today = new Date().toDateString();
      const siteKey = `${currentDomain}_${today}`;

      console.log(`⏱️ Saving time: ${formatTime(elapsedSeconds)}`);

      safeStorageGet(['timeData'], function (data) {
        if (!isContextValid()) return;

        const timeData = data.timeData || {};
        timeData[siteKey] = elapsedSeconds;
        safeStorageSet({ timeData });
      });
    }

    // Make widget draggable - drag from anywhere on the widget
    widget.addEventListener('mousedown', function (e) {
      // Don't drag if clicking on buttons
      if (
        e.target.classList.contains('time-tracker-close') ||
        e.target.classList.contains('time-tracker-reset') ||
        e.target.classList.contains('time-tracker-pause')
      ) {
        return;
      }

      isDragging = true;
      widget.classList.add('dragging');
      dragOffset.x = e.clientX - widget.offsetLeft;
      dragOffset.y = e.clientY - widget.offsetTop;
      widget.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!isDragging) return;

      e.preventDefault();

      let x = e.clientX - dragOffset.x;
      let y = e.clientY - dragOffset.y;

      // Keep within viewport
      x = Math.max(0, Math.min(x, window.innerWidth - widget.offsetWidth));
      y = Math.max(0, Math.min(y, window.innerHeight - widget.offsetHeight));

      widget.style.left = x + 'px';
      widget.style.top = y + 'px';
    });

    document.addEventListener('mouseup', function () {
      if (!isDragging) return;

      isDragging = false;
      widget.classList.remove('dragging');
      widget.style.cursor = 'grab';

      if (!isContextValid()) return;

      // Save position
      const position = {
        x: parseInt(widget.style.left),
        y: parseInt(widget.style.top),
      };
      safeStorageSet({ widgetPosition: position });
    });

    // Close button
    const closeBtn = widget.querySelector('.time-tracker-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        widget.style.display = 'none';
        if (timerInterval) {
          clearInterval(timerInterval);
        }
        saveTimeData();

        if (!isContextValid()) return;

        // Save that this site is hidden
        safeStorageGet(['hiddenSites'], function (data) {
          if (!isContextValid()) return;

          const hiddenSites = data.hiddenSites || [];
          if (!hiddenSites.includes(currentDomain)) {
            hiddenSites.push(currentDomain);
            safeStorageSet({ hiddenSites });
          }
        });
      });
    }

    // Pause/Resume button
    const pauseBtn = widget.querySelector('.time-tracker-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', function (e) {
        e.stopPropagation(); // Prevent dragging when clicking pause
        togglePause();
      });
    }

    // Reset button
    const resetBtn = widget.querySelector('.time-tracker-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (confirm('Reset timer for this site today?')) {
          elapsedSeconds = 0;
          updateDisplay();
          saveTimeData();
        }
      });
    }

    // Save data when leaving page
    window.addEventListener('beforeunload', function () {
      saveTimeData();
    });

    // Pause timer when tab is not visible, resume and sync when visible
    document.addEventListener('visibilitychange', function () {
      if (!isContextValid()) return;

      if (document.hidden) {
        // Tab hidden - pause timer and save
        console.log('⏱️ Tab hidden - pausing timer');
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        saveTimeData();
      } else {
        // Tab visible - sync latest time and resume
        console.log('⏱️ Tab visible - syncing and resuming timer');

        // Load latest time from storage (another tab might have updated it)
        safeStorageGet(['timeData'], function (data) {
          if (!isContextValid()) return;

          const today = new Date().toDateString();
          const timeData = data.timeData || {};
          const siteKey = `${currentDomain}_${today}`;

          if (timeData[siteKey] !== undefined) {
            elapsedSeconds = timeData[siteKey];
            updateDisplay();
          }

          // Now start counting
          startTimer();
        });
      }
    });
  } catch (error) {
    // Catch any errors related to extension context invalidation
    if (
      error.message &&
      error.message.includes('Extension context invalidated')
    ) {
      console.log(
        '⏱️ Time Tracker: Extension was reloaded. Refresh the page to see the widget.'
      );
    } else {
      // Log unexpected errors for debugging
      console.warn('⏱️ Time Tracker: Unexpected error', error.message);
    }
  }
})();
