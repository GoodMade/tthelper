(function () {
  const PAGE_SOURCE = 'tt-enhancer-cross-project-clipboard';
  const BRIDGE_SOURCE = 'tt-enhancer-cross-project-clipboard-bridge';
  const STORAGE_KEY = 'tt_enhancer_cross_project_layer_clipboard';

  let extensionConnected = false;
  const widgetCache = {};

  // --- UI Elements ---
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const statusBanner = document.getElementById('statusBanner');
  const statusText = document.getElementById('statusText');
  const toastContainer = document.getElementById('toastContainer');

  // --- Theme Toggle ---
  themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    document.body.setAttribute('data-theme', nextTheme);
    
    // Update theme icon
    if (nextTheme === 'light') {
      themeIcon.innerHTML = `
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      `;
    } else {
      themeIcon.innerHTML = `
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      `;
    }
  });

  // --- Status Check ---
  function updateStatus(connected) {
    extensionConnected = connected;
    if (connected) {
      statusBanner.classList.add('connected');
      statusText.textContent = 'Расширение TapTop Helper подключено';
    } else {
      statusBanner.classList.remove('connected');
      statusText.textContent = 'Работает через системный буфер (расширение не обнаружено)';
    }
  }

  // --- Debug Panel ---
  const debugPanel = document.createElement('div');
  debugPanel.style.cssText = 'position:fixed;bottom:10px;right:10px;background:#111;color:#0f0;padding:10px;font-family:monospace;font-size:11px;z-index:9999;max-width:300px;max-height:200px;overflow:auto;pointer-events:none;border-radius:4px;';
  document.body.appendChild(debugPanel);

  function logDebug(msg) {
    console.log('[Catalog Debug]', msg);
    const line = document.createElement('div');
    line.textContent = '> ' + msg;
    debugPanel.appendChild(line);
    debugPanel.scrollTop = debugPanel.scrollHeight;
  }

  logDebug('Catalog script initialized');

  // Ping the extension bridge
  function pingExtension() {
    logDebug('Pinging bridge...');
    window.postMessage({ source: PAGE_SOURCE, type: 'load' }, '*');
  }

  // Listen for responses from the extension bridge
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.source === BRIDGE_SOURCE) {
      logDebug('Bridge responded with: ' + event.data.type);
      updateStatus(true);
    }
  });

  // Initial check
  pingExtension();
  // Periodic check in case extension loads slightly later
  let pingCount = 0;
  const pingInterval = setInterval(() => {
    if (extensionConnected) {
      clearInterval(pingInterval);
      return;
    }
    pingCount++;
    if (pingCount > 5) {
      clearInterval(pingInterval);
      logDebug('Bridge ping timeout');
      return;
    }
    pingExtension();
  }, 1000);

  // Check if directly in extension context
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    updateStatus(true);
    logDebug('Running in direct extension context');
  }

  // --- Toast Notification ---
  function showToast(message) {
    logDebug('Toast: ' + message);
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
  }

  // --- Clipboard Copy Fallback (for non-secure HTTP contexts like http://test/) ---
  function copyToClipboardFallback(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }

  // Helper to fetch with cache-busting
  async function fetchWidgetData(filename) {
    const url = filename + '?t=' + Date.now();
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    return await response.json();
  }

  // --- Preload Widget JSONs on page load ---
  // This ensures that when the user clicks a button, we can read the JSON and copy it synchronously.
  async function preloadWidgets() {
    const buttons = document.querySelectorAll('.copy-button');
    for (const button of buttons) {
      const filename = button.getAttribute('data-target');
      if (filename) {
        try {
          widgetCache[filename] = await fetchWidgetData(filename);
        } catch (err) {
          console.warn(`Failed to preload ${filename}:`, err);
        }
      }
    }
  }

  // Trigger preload immediately
  preloadWidgets();
  
  // Refresh cache every time the window regains focus (e.g. user Alt-Tabs back from IDE)
  window.addEventListener('focus', preloadWidgets);

  // --- Copy Widget Logic (Synchronous to preserve user gesture) ---
  function copyWidget(filename, button) {
    const btnText = button.querySelector('.btn-text');
    const originalText = btnText.textContent;
    
    try {
      // 1. Read JSON data from cache (synchronous)
      const data = widgetCache[filename];
      if (!data) {
        throw new Error(`Widget data for ${filename} is not preloaded yet. Try again.`);
      }
      const rawString = JSON.stringify(data);

      // 2. Copy to System Clipboard (synchronous execution ensures user gesture is active!)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(rawString).catch((err) => {
          // Fallback if writeText fails asynchronously in some browsers
          const success = copyToClipboardFallback(rawString);
          if (!success) console.error('Clipboard copy failed:', err);
        });
      } else {
        const success = copyToClipboardFallback(rawString);
        if (!success) throw new Error('Clipboard fallback copy failed');
      }

      // 3. Send to Extension Bridge (runs in content script)
      const payload = {
        raw: rawString,
        savedAt: Date.now(),
        sourceId: 'widget-catalog',
        pageKey: window.location.href,
        pageUrl: window.location.href,
        pageOrigin: window.location.origin
      };

      logDebug('Sending payload to bridge...');
      window.postMessage({
        source: PAGE_SOURCE,
        type: 'save',
        payload: payload
      }, '*');

      // 4. Directly update chrome storage if in extension context
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        logDebug('Updating chrome.storage.local directly');
        chrome.storage.local.set({ [STORAGE_KEY]: payload });
      }

      logDebug('Copy process completed successfully');

      // Visual Success state
      button.classList.add('success');
      btnText.textContent = 'Скопировано!';
      
      showToast(`Компонент из ${filename} скопирован в буфер обмена`);

      setTimeout(() => {
        button.classList.remove('success');
        btnText.textContent = originalText;
      }, 2000);

    } catch (error) {
      console.error('Failed to copy widget:', error);
      showToast(`Ошибка копирования: ${error.message || filename}`);
    }
  }

  // Register Buttons
  document.querySelectorAll('.copy-button').forEach((button) => {
    const targetFile = button.getAttribute('data-target');
    
    // Refresh cache in the background when the user hovers over the button
    button.addEventListener('mouseenter', async () => {
      try {
        widgetCache[targetFile] = await fetchWidgetData(targetFile);
      } catch (e) {
        // Ignore hover fetch errors, it will fall back to whatever is in the cache
      }
    });

    button.addEventListener('click', () => {
      copyWidget(targetFile, button);
    });
  });

})();
