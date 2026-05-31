(function () {
  const STATE_KEY = '__ttEnhancerCrossProjectClipboardBridge';
  const STORAGE_KEY = 'tt_enhancer_cross_project_layer_clipboard';
  const PAGE_SOURCE = 'tt-enhancer-cross-project-clipboard';
  const BRIDGE_SOURCE = 'tt-enhancer-cross-project-clipboard-bridge';

  try {
    window[STATE_KEY]?.destroy?.();
  } catch {}

  function postToPage(type, payload) {
    window.postMessage({ source: BRIDGE_SOURCE, type, payload }, '*');
  }

  function loadClipboard() {
    chrome.storage.local.get(STORAGE_KEY, (stored) => {
      if (chrome.runtime.lastError) return;
      postToPage('loaded', stored[STORAGE_KEY] || null);
    });
  }

  function saveClipboard(payload) {
    if (!payload?.raw) return;
    chrome.storage.local.set({ [STORAGE_KEY]: payload });
  }

  function onMessage(event) {
    if (event.source !== window) return;

    const data = event.data;
    if (!data || data.source !== PAGE_SOURCE) return;

    if (data.type === 'save') saveClipboard(data.payload);
    if (data.type === 'load') loadClipboard();
  }

  function onStorageChanged(changes, areaName) {
    if (areaName !== 'local' || !changes[STORAGE_KEY]) return;
    postToPage('updated', changes[STORAGE_KEY].newValue || null);
  }

  window.addEventListener('message', onMessage);
  chrome.storage.onChanged.addListener(onStorageChanged);
  loadClipboard();

  window[STATE_KEY] = {
    destroy() {
      window.removeEventListener('message', onMessage);
      chrome.storage.onChanged.removeListener(onStorageChanged);
      if (window[STATE_KEY] === this) delete window[STATE_KEY];
    }
  };
})();
