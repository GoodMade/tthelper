(function () {
  const STATE_KEY = '__ttEnhancerAiPanelBridge';
  const REQUEST_SOURCE = 'tt-enhancer-ai-panel';
  const RESPONSE_SOURCE = 'tt-enhancer-ai-panel-bridge';
  const PROVIDER_STORAGE_KEY = 'aiPanel_provider';
  const GEMINI_API_KEY_STORAGE_KEY = 'aiPanel_geminiApiKey';
  const GEMINI_MODEL_STORAGE_KEY = 'aiPanel_geminiModel';
  const GEMINI_IMAGE_MODEL_STORAGE_KEY = 'aiPanel_geminiImageModel';
  const OPENROUTER_API_KEY_STORAGE_KEY = 'aiPanel_openRouterApiKey';
  const OPENROUTER_MODEL_STORAGE_KEY = 'aiPanel_openRouterModel';
  const OPENROUTER_IMAGE_MODEL_STORAGE_KEY = 'aiPanel_openRouterImageModel';
  const OPENAI_COMPATIBLE_API_KEY_STORAGE_KEY = 'aiPanel_openAiCompatibleApiKey';
  const OPENAI_COMPATIBLE_BASE_URL_STORAGE_KEY = 'aiPanel_openAiCompatibleBaseUrl';
  const OPENAI_COMPATIBLE_MODEL_STORAGE_KEY = 'aiPanel_openAiCompatibleModel';
  const PUTER_MODEL_STORAGE_KEY = 'aiPanel_puterModel';
  const PUTER_IMAGE_MODEL_STORAGE_KEY = 'aiPanel_puterImageModel';
  const CUSTOM_MODELS_STORAGE_KEY = 'aiPanel_customModels';
  const DEFAULT_PROVIDER = 'gemini';
  const DEFAULT_MODEL = 'gemini-2.5-flash';
  const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';
  const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';
  const DEFAULT_OPENROUTER_IMAGE_MODEL = 'google/gemini-2.5-flash-image';
  const DEFAULT_OPENAI_COMPATIBLE_MODEL = 'gpt-4o-mini';
  const DEFAULT_PUTER_MODEL = 'gemini-2.5-flash';
  const DEFAULT_PUTER_IMAGE_MODEL = 'gemini-2.5-flash-image';
  const MODEL_MODES = {
    text: 'text',
    image: 'image'
  };
  const CUSTOM_MODEL_LIMIT = 30;
  const MODEL_ALIASES = {
    'gemini-2.5-flash-image-preview': 'gemini-2.5-flash-image',
    'gemini-3.1-flash-image': 'gemini-3.1-flash-image-preview'
  };
  const BRIDGE_FILE = 'features/ai-panel/gemini-panel-bridge.js';

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

  function safeLastError() {
    try {
      return chrome?.runtime?.lastError || null;
    } catch {
      return null;
    }
  }

  function canUseChromeApi(path) {
    try {
      if (!chrome?.runtime?.id) return false;
      if (path === 'syncStorage') return !!chrome?.storage?.sync;
      if (path === 'runtimeMessage') return typeof chrome?.runtime?.sendMessage === 'function';
      return true;
    } catch {
      return false;
    }
  }

  function isContextInvalidated(error) {
    return /extension context invalidated/i.test(String(error?.message || error || ''));
  }

  function normalizeProvider(value) {
    return value === 'openrouter' || value === 'puter' || value === 'openai-compatible' ? value : DEFAULT_PROVIDER;
  }

  function normalizeModelMode(value) {
    return value === MODEL_MODES.image ? MODEL_MODES.image : MODEL_MODES.text;
  }

  function sanitizeModelInput(provider, value) {
    const activeProvider = normalizeProvider(provider);
    const model = String(value || '').trim().replace(/^models\//, '');
    if (!model) return '';
    if (activeProvider === 'gemini' || activeProvider === 'puter') {
      if (MODEL_ALIASES[model]) return MODEL_ALIASES[model];
      return /^[a-z0-9._:-]+$/i.test(model) ? model : '';
    }
    if (activeProvider === 'openai-compatible') {
      return /^[a-z0-9._:/+@=-]+$/i.test(model) ? model : '';
    }
    return /^[a-z0-9._:/+-]+$/i.test(model) ? model : '';
  }

  function normalizeOpenAiCompatibleBaseUrl(value) {
    let raw = String(value || '').trim();
    if (!raw) return '';
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
      raw = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|host\.docker\.internal)([:/]|$)/i.test(raw)
        ? 'http://' + raw
        : 'https://' + raw;
    }
    try {
      const url = new URL(raw);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
      url.hash = '';
      url.search = '';
      return url.href.replace(/\/+$/, '');
    } catch {
      return '';
    }
  }

  function normalizeModel(provider, value, mode = MODEL_MODES.text) {
    const activeProvider = normalizeProvider(provider);
    const activeMode = normalizeModelMode(mode);
    const fallback = activeProvider === 'gemini' && activeMode === MODEL_MODES.image
      ? DEFAULT_IMAGE_MODEL
      : activeProvider === 'puter' && activeMode === MODEL_MODES.image
        ? DEFAULT_PUTER_IMAGE_MODEL
      : activeProvider === 'openrouter' && activeMode === MODEL_MODES.image
        ? DEFAULT_OPENROUTER_IMAGE_MODEL
      : activeProvider === 'openai-compatible' ? DEFAULT_OPENAI_COMPATIBLE_MODEL
      : activeProvider === 'openrouter' ? DEFAULT_OPENROUTER_MODEL
      : activeProvider === 'puter' ? DEFAULT_PUTER_MODEL
      : DEFAULT_MODEL;
    return sanitizeModelInput(activeProvider, value || fallback) || fallback;
  }

  function isImageGenerationModel(model) {
    return /image|imagen/i.test(String(model || ''));
  }

  function normalizeModelForMode(provider, value, mode = MODEL_MODES.text) {
    const activeProvider = normalizeProvider(provider);
    const activeMode = normalizeModelMode(mode);
    const model = normalizeModel(activeProvider, value, activeMode);
    if (activeProvider === 'gemini' && activeMode === MODEL_MODES.image) {
      return isImageGenerationModel(model) ? model : DEFAULT_IMAGE_MODEL;
    }
    if (activeProvider === 'gemini' && isImageGenerationModel(model)) return DEFAULT_MODEL;
    if (activeProvider === 'puter' && activeMode === MODEL_MODES.image) {
      return isImageGenerationModel(model) ? model : DEFAULT_PUTER_IMAGE_MODEL;
    }
    if (activeProvider === 'puter' && isImageGenerationModel(model)) return DEFAULT_PUTER_MODEL;
    return model;
  }

  function normalizeCustomModelList(provider, values) {
    const result = [];
    if (!Array.isArray(values)) return result;
    values.forEach((value) => {
      const model = sanitizeModelInput(provider, value);
      if (model && !result.includes(model)) result.push(model);
    });
    return result.slice(0, CUSTOM_MODEL_LIMIT);
  }

  function normalizeCustomModels(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      gemini: normalizeCustomModelList('gemini', source.gemini),
      openrouter: normalizeCustomModelList('openrouter', source.openrouter),
      'openai-compatible': normalizeCustomModelList('openai-compatible', source['openai-compatible'] || source.openAiCompatible),
      puter: normalizeCustomModelList('puter', source.puter)
    };
  }

  function settingsPayload(items) {
    const provider = normalizeProvider(items?.[PROVIDER_STORAGE_KEY]);
    const geminiModel = normalizeModelForMode('gemini', items?.[GEMINI_MODEL_STORAGE_KEY], MODEL_MODES.text);
    const geminiImageModel = normalizeModelForMode('gemini', items?.[GEMINI_IMAGE_MODEL_STORAGE_KEY], MODEL_MODES.image);
    const openRouterModel = normalizeModelForMode('openrouter', items?.[OPENROUTER_MODEL_STORAGE_KEY], MODEL_MODES.text);
    const openRouterImageModel = normalizeModelForMode('openrouter', items?.[OPENROUTER_IMAGE_MODEL_STORAGE_KEY], MODEL_MODES.image);
    const openAiCompatibleModel = normalizeModelForMode('openai-compatible', items?.[OPENAI_COMPATIBLE_MODEL_STORAGE_KEY], MODEL_MODES.text);
    const openAiCompatibleBaseUrl = normalizeOpenAiCompatibleBaseUrl(items?.[OPENAI_COMPATIBLE_BASE_URL_STORAGE_KEY]);
    const puterModel = normalizeModelForMode('puter', items?.[PUTER_MODEL_STORAGE_KEY], MODEL_MODES.text);
    const puterImageModel = normalizeModelForMode('puter', items?.[PUTER_IMAGE_MODEL_STORAGE_KEY], MODEL_MODES.image);
    const customModels = normalizeCustomModels(items?.[CUSTOM_MODELS_STORAGE_KEY]);
    const hasGeminiApiKey = !!String(items?.[GEMINI_API_KEY_STORAGE_KEY] || '').trim();
    const hasOpenRouterApiKey = !!String(items?.[OPENROUTER_API_KEY_STORAGE_KEY] || '').trim();
    const hasOpenAiCompatibleApiKey = !!String(items?.[OPENAI_COMPATIBLE_API_KEY_STORAGE_KEY] || '').trim();
    const hasOpenAiCompatibleBaseUrl = !!openAiCompatibleBaseUrl;
    const model = provider === 'openrouter'
      ? openRouterModel
      : provider === 'openai-compatible'
        ? openAiCompatibleModel
      : provider === 'puter' ? puterModel : geminiModel;
    return {
      provider,
      model,
      geminiModel,
      geminiImageModel,
      openRouterModel,
      openRouterImageModel,
      openAiCompatibleModel,
      openAiCompatibleBaseUrl,
      puterModel,
      puterImageModel,
      customModels,
      hasApiKey: provider === 'puter'
        ? true
        : provider === 'openai-compatible'
          ? hasOpenAiCompatibleBaseUrl
        : provider === 'openrouter' ? hasOpenRouterApiKey : hasGeminiApiKey,
      hasGeminiApiKey,
      hasOpenRouterApiKey,
      hasOpenAiCompatibleApiKey,
      hasOpenAiCompatibleBaseUrl,
      hasPuterApiKey: true
    };
  }

  function readSettings(id) {
    if (!canUseChromeApi('syncStorage')) {
      return;
    }
    try {
      chrome.storage.sync.get({
        [PROVIDER_STORAGE_KEY]: DEFAULT_PROVIDER,
        [GEMINI_API_KEY_STORAGE_KEY]: '',
        [GEMINI_MODEL_STORAGE_KEY]: DEFAULT_MODEL,
        [GEMINI_IMAGE_MODEL_STORAGE_KEY]: DEFAULT_IMAGE_MODEL,
        [OPENROUTER_API_KEY_STORAGE_KEY]: '',
        [OPENROUTER_MODEL_STORAGE_KEY]: DEFAULT_OPENROUTER_MODEL,
        [OPENROUTER_IMAGE_MODEL_STORAGE_KEY]: DEFAULT_OPENROUTER_IMAGE_MODEL,
        [OPENAI_COMPATIBLE_API_KEY_STORAGE_KEY]: '',
        [OPENAI_COMPATIBLE_BASE_URL_STORAGE_KEY]: '',
        [OPENAI_COMPATIBLE_MODEL_STORAGE_KEY]: DEFAULT_OPENAI_COMPATIBLE_MODEL,
        [PUTER_MODEL_STORAGE_KEY]: DEFAULT_PUTER_MODEL,
        [PUTER_IMAGE_MODEL_STORAGE_KEY]: DEFAULT_PUTER_IMAGE_MODEL,
        [CUSTOM_MODELS_STORAGE_KEY]: { gemini: [], openrouter: [], 'openai-compatible': [], puter: [] }
      }, (items) => {
        const error = safeLastError();
        if (error) {
          if (isContextInvalidated(error)) return;
          respond(id, false, null, error.message || 'Не удалось прочитать настройки AI');
          return;
        }

        respond(id, true, settingsPayload(items));
      });
    } catch (error) {
      if (isContextInvalidated(error)) return;
      respond(id, false, null, error?.message || String(error));
    }
  }

  function saveSettings(id, payload) {
    const provider = normalizeProvider(payload?.provider);
    const mode = normalizeModelMode(payload?.mode);
    const modelKey = provider === 'openrouter'
      ? mode === MODEL_MODES.image ? OPENROUTER_IMAGE_MODEL_STORAGE_KEY : OPENROUTER_MODEL_STORAGE_KEY
      : provider === 'openai-compatible'
        ? OPENAI_COMPATIBLE_MODEL_STORAGE_KEY
      : provider === 'puter'
        ? mode === MODEL_MODES.image ? PUTER_IMAGE_MODEL_STORAGE_KEY : PUTER_MODEL_STORAGE_KEY
      : mode === MODEL_MODES.image ? GEMINI_IMAGE_MODEL_STORAGE_KEY : GEMINI_MODEL_STORAGE_KEY;
    const apiKeyKey = provider === 'openrouter'
      ? OPENROUTER_API_KEY_STORAGE_KEY
      : provider === 'openai-compatible'
        ? OPENAI_COMPATIBLE_API_KEY_STORAGE_KEY
      : provider === 'gemini' ? GEMINI_API_KEY_STORAGE_KEY : '';
    const customModel = sanitizeModelInput(provider, payload?.customModel);
    const patch = {
      [PROVIDER_STORAGE_KEY]: provider,
      [modelKey]: normalizeModelForMode(provider, payload?.model, mode)
    };
    const apiKey = String(payload?.apiKey || '').trim();
    const hasBaseUrlPayload = Object.prototype.hasOwnProperty.call(payload || {}, 'baseUrl');
    const baseUrl = normalizeOpenAiCompatibleBaseUrl(payload?.baseUrl);

    if (payload?.customModel && !customModel) {
      respond(id, false, null, 'Некорректный model id');
      return;
    }

    if (apiKeyKey && payload?.clearKey === true) {
      patch[apiKeyKey] = '';
    } else if (apiKeyKey && apiKey) {
      patch[apiKeyKey] = apiKey.slice(0, 500);
    }

    if (provider === 'openai-compatible' && hasBaseUrlPayload) {
      patch[OPENAI_COMPATIBLE_BASE_URL_STORAGE_KEY] = baseUrl.slice(0, 800);
    }

    if (!canUseChromeApi('syncStorage')) {
      return;
    }

    const writePatch = () => {
      chrome.storage.sync.set(patch, () => {
        const error = safeLastError();
        if (error) {
          if (isContextInvalidated(error)) return;
          respond(id, false, null, error.message || 'Не удалось сохранить настройки AI');
          return;
        }
        readSettings(id);
      });
    };

    try {
      if (!customModel) {
        writePatch();
        return;
      }

      chrome.storage.sync.get({
        [CUSTOM_MODELS_STORAGE_KEY]: { gemini: [], openrouter: [], 'openai-compatible': [], puter: [] }
      }, (items) => {
        const error = safeLastError();
        if (error) {
          if (isContextInvalidated(error)) return;
          respond(id, false, null, error.message || 'Не удалось сохранить модель AI');
          return;
        }

        const customModels = normalizeCustomModels(items?.[CUSTOM_MODELS_STORAGE_KEY]);
        const list = customModels[provider].filter((item) => item !== customModel);
        customModels[provider] = [customModel, ...list].slice(0, CUSTOM_MODEL_LIMIT);
        patch[CUSTOM_MODELS_STORAGE_KEY] = customModels;
        writePatch();
      });
    } catch (error) {
      if (isContextInvalidated(error)) return;
      respond(id, false, null, error?.message || String(error));
    }
  }

  function generate(id, payload) {
    if (!canUseChromeApi('runtimeMessage')) {
      return;
    }
    try {
      chrome.runtime.sendMessage({
        action: 'ttAiGenerate',
        payload
      }, (response) => {
        const error = safeLastError();
        if (error) {
          if (isContextInvalidated(error)) return;
          respond(id, false, null, error.message || 'Не удалось отправить AI запрос');
          return;
        }
        if (!response?.ok) {
          respond(id, false, response || null, response?.error || 'AI провайдер вернул ошибку');
          return;
        }
        respond(id, true, response.result || null);
      });
    } catch (error) {
      if (isContextInvalidated(error)) return;
      respond(id, false, null, error?.message || String(error));
    }
  }

  function getModels(id, payload) {
    if (!canUseChromeApi('runtimeMessage')) {
      return;
    }
    try {
      chrome.runtime.sendMessage({
        action: 'ttAiGetModels',
        payload
      }, (response) => {
        const error = safeLastError();
        if (error) {
          if (isContextInvalidated(error)) return;
          respond(id, false, null, error.message || 'Не удалось получить список моделей');
          return;
        }
        if (!response?.ok) {
          respond(id, false, response || null, response?.error || 'Не удалось получить список моделей');
          return;
        }
        respond(id, true, response.result || null);
      });
    } catch (error) {
      if (isContextInvalidated(error)) return;
      respond(id, false, null, error?.message || String(error));
    }
  }

  function loadPuterSdk(id) {
    if (!canUseChromeApi('runtimeMessage')) {
      return;
    }
    try {
      chrome.runtime.sendMessage({
        action: 'ttAiPuterLoadSdk'
      }, (response) => {
        const error = safeLastError();
        if (error) {
          if (isContextInvalidated(error)) return;
          respond(id, false, null, error.message || 'Не удалось загрузить Puter.js');
          return;
        }
        if (!response?.ok) {
          respond(id, false, response || null, response?.error || 'Не удалось загрузить Puter.js');
          return;
        }
        respond(id, true, response.result || null);
      });
    } catch (error) {
      if (isContextInvalidated(error)) return;
      respond(id, false, null, error?.message || String(error));
    }
  }

  function fetchPuterSdk(id) {
    if (!canUseChromeApi('runtimeMessage')) {
      return;
    }
    try {
      chrome.runtime.sendMessage({
        action: 'ttAiPuterFetchSdk'
      }, (response) => {
        const error = safeLastError();
        if (error) {
          if (isContextInvalidated(error)) return;
          respond(id, false, null, error.message || 'Не удалось загрузить Puter SDK');
          return;
        }
        if (!response?.ok) {
          respond(id, false, response || null, response?.error || 'Не удалось загрузить Puter SDK');
          return;
        }
        respond(id, true, response.result || null);
      });
    } catch (error) {
      if (isContextInvalidated(error)) return;
      respond(id, false, null, error?.message || String(error));
    }
  }

  function fetchImageData(id, payload) {
    if (!canUseChromeApi('runtimeMessage')) {
      return;
    }
    try {
      chrome.runtime.sendMessage({
        action: 'ttAiGeminiFetchImage',
        url: payload?.url || ''
      }, (response) => {
        const error = safeLastError();
        if (error) {
          if (isContextInvalidated(error)) return;
          respond(id, false, null, error.message || 'Не удалось загрузить изображение');
          return;
        }
        if (!response?.ok) {
          respond(id, false, response || null, response?.error || 'Не удалось загрузить изображение');
          return;
        }
        respond(id, true, response.result || null);
      });
    } catch (error) {
      if (isContextInvalidated(error)) return;
      respond(id, false, null, error?.message || String(error));
    }
  }

  function getRuntimeUrl(id, payload) {
    try {
      const path = String(payload?.path || '').trim();
      if (!path || path.includes('..') || path.startsWith('/')) {
        respond(id, false, null, 'Некорректный путь расширения');
        return;
      }
      respond(id, true, { url: chrome.runtime.getURL(path) });
    } catch (error) {
      respond(id, false, null, error?.message || String(error));
    }
  }

  function puterFetch(id, payload) {
    if (!canUseChromeApi('runtimeMessage')) {
      return;
    }
    try {
      chrome.runtime.sendMessage({
        action: 'ttAiPuterFetch',
        payload: payload || {}
      }, (response) => {
        const error = safeLastError();
        if (error) {
          if (isContextInvalidated(error)) return;
          respond(id, false, null, error.message || 'Не удалось выполнить запрос Puter');
          return;
        }
        if (!response?.ok) {
          respond(id, false, response || null, response?.error || 'Puter API вернул ошибку');
          return;
        }
        respond(id, true, response.result || null);
      });
    } catch (error) {
      if (isContextInvalidated(error)) return;
      respond(id, false, null, error?.message || String(error));
    }
  }

  function onMessage(event) {
    if (event.source !== window) return;
    const message = event.data;
    if (!message || message.source !== REQUEST_SOURCE || !message.id) return;

    if (message.action === 'getSettings') {
      readSettings(message.id);
      return;
    }

    if (message.action === 'saveSettings') {
      saveSettings(message.id, message.payload || {});
      return;
    }

    if (message.action === 'generate') {
      generate(message.id, message.payload || {});
      return;
    }

    if (message.action === 'getModels') {
      getModels(message.id, message.payload || {});
      return;
    }

    if (message.action === 'fetchImageData') {
      fetchImageData(message.id, message.payload || {});
      return;
    }

    if (message.action === 'getRuntimeUrl') {
      getRuntimeUrl(message.id, message.payload || {});
      return;
    }

    if (message.action === 'loadPuterSdk') {
      loadPuterSdk(message.id);
      return;
    }

    if (message.action === 'fetchPuterSdk') {
      fetchPuterSdk(message.id);
      return;
    }

    if (message.action === 'puterFetch') {
      puterFetch(message.id, message.payload || {});
      return;
    }

    respond(message.id, false, null, 'Неизвестное действие AI bridge');
  }

  window.addEventListener('message', onMessage);

  window[STATE_KEY] = {
    destroy() {
      window.removeEventListener('message', onMessage);
      try {
        if (window.__ttEnhancerIsolatedInjected) {
          delete window.__ttEnhancerIsolatedInjected[BRIDGE_FILE];
        }
      } catch {}
      if (window[STATE_KEY] === this) delete window[STATE_KEY];
    }
  };
})();
