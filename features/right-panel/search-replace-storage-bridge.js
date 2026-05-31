(function () {
  const STATE_KEY = '__ttEnhancerSearchReplaceStorageBridge';
  const REQUEST_SOURCE = 'tt-enhancer-search-replace';
  const RESPONSE_SOURCE = 'tt-enhancer-search-replace-storage-bridge';
  const ALLOWED_KEYS = new Set([
    'ttEnhancerSearchReplaceCustomPresets',
    'ttEnhancerSearchReplacePresetSettings'
  ]);

  try {
    window[STATE_KEY]?.destroy?.();
  } catch {}

  function respond(id, ok, data = null, error = '') {
    window.postMessage({
      source: RESPONSE_SOURCE,
      id,
      ok,
      data,
      error
    }, '*');
  }

  function onMessage(event) {
    if (event.source !== window) return;
    const message = event.data;
    if (!message || message.source !== REQUEST_SOURCE || !message.id) return;

    const key = String(message.payload?.key || '');
    if (!ALLOWED_KEYS.has(key)) {
      respond(message.id, false, null, 'Недоступный ключ хранилища');
      return;
    }

    if (message.action === 'get') {
      chrome.storage.sync.get({ [key]: message.payload?.defaultValue ?? null }, (items) => {
        const error = chrome.runtime.lastError;
        respond(message.id, !error, items?.[key], error?.message || '');
      });
      return;
    }

    if (message.action === 'set') {
      chrome.storage.sync.set({ [key]: message.payload?.value }, () => {
        const error = chrome.runtime.lastError;
        respond(message.id, !error, null, error?.message || '');
      });
      return;
    }

    respond(message.id, false, null, 'Неизвестное действие хранилища');
  }

  window.addEventListener('message', onMessage);

  window[STATE_KEY] = {
    destroy() {
      window.removeEventListener('message', onMessage);
      if (window[STATE_KEY] === this) delete window[STATE_KEY];
    }
  };
})();
