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

  function safeLastError() {
    try {
      return chrome?.runtime?.lastError || null;
    } catch {
      return null;
    }
  }

  function canUseChromeStorage(area = 'local') {
    try {
      return !!chrome?.runtime?.id && !!chrome?.storage?.[area];
    } catch {
      return false;
    }
  }

  function loadClipboard() {
    if (!canUseChromeStorage('local')) return;
    try {
      chrome.storage.local.get(STORAGE_KEY, (stored) => {
        if (safeLastError()) return;
        postToPage('loaded', stored?.[STORAGE_KEY] || null);
      });
    } catch {}
  }

  function saveClipboard(payload, requestId) {
    if (!payload?.raw) {
      postToPage('error', { requestId, error: 'empty-payload' });
      return;
    }

    const savedPayload = {
      ...payload,
      savedAt: Number(payload.savedAt) || Date.now(),
      bridgeSavedAt: Date.now()
    };

    const confirmSaved = () => postToPage('saved', { requestId, payload: savedPayload });
    const reportError = (error) => postToPage('error', {
      requestId,
      error: error?.message || String(error || 'save-failed')
    });

    if (canUseChromeStorage('local')) {
      try {
        chrome.storage.local.set({ [STORAGE_KEY]: savedPayload }, () => {
          const lastError = safeLastError();
          if (lastError) reportError(lastError);
          else confirmSaved();
        });
        return;
      } catch (error) {
        reportError(error);
        return;
      }
    }

    // Fallback for contexts where chrome.storage is not exposed to the isolated
    // script but chrome.runtime messaging is still available. Background stores
    // the same payload under STORAGE_KEY.
    try {
      if (chrome?.runtime?.id && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'ttCrossProjectClipboardSave',
          payload: savedPayload
        }, (response) => {
          const lastError = safeLastError();
          if (lastError || !response?.ok) reportError(lastError || response?.error || 'background-save-failed');
          else confirmSaved();
        });
        return;
      }
    } catch (error) {
      reportError(error);
      return;
    }

    reportError('chrome-storage-unavailable');
  }

  function onMessage(event) {
    if (event.source !== window) return;

    const data = event.data;
    if (!data || data.source !== PAGE_SOURCE) return;

    if (data.type === 'save') saveClipboard(data.payload, data.requestId || data.payload?.requestId);
    if (data.type === 'load') loadClipboard();
  }

  function onStorageChanged(changes, areaName) {
    if (areaName !== 'local' || !changes[STORAGE_KEY]) return;
    postToPage('updated', changes[STORAGE_KEY].newValue || null);
  }

  window.addEventListener('message', onMessage);
  try {
    chrome?.storage?.onChanged?.addListener?.(onStorageChanged);
  } catch {}
  postToPage('ready', { storageAvailable: canUseChromeStorage('local') });
  loadClipboard();

  window[STATE_KEY] = {
    destroy() {
      window.removeEventListener('message', onMessage);
      try {
        chrome?.storage?.onChanged?.removeListener?.(onStorageChanged);
      } catch {}
      if (window[STATE_KEY] === this) delete window[STATE_KEY];
    }
  };
})();
