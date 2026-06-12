// Импортируем конфиг опций
importScripts('features/config.js');

const CMS_CONTENT_SCRIPT_MATCHES = [
  'http://*/-/cms',
  'https://*/-/cms',
  'http://*/-/cms/*',
  'https://*/-/cms/*'
];
const DVH_PRELOAD_CONTENT_SCRIPT_ID = 'tt-enhancer-dvh-preload';
const FREE_PLAN_PAID_RESTORE_DONE_KEY = 'ttFreePlanPaidRestoreDoneV3';
const SAFE_MODE_STORAGE_KEY = 'ttEnhancer_safeModeManual';
const MINI_BROWSER_ENABLED_STORAGE_KEY = 'miniBrowser_enabled';
const MINI_BROWSER_SIDE_PANEL_BROWSER_STORAGE_KEY = 'miniBrowser_sidePanelBrowser';
const MINI_BROWSER_OPEN_SITE_BUTTON_STORAGE_KEY = 'miniBrowser_openCurrentSiteTabButton';
const AI_GEMINI_API_KEY_STORAGE_KEY = 'aiPanel_geminiApiKey';
const AI_GEMINI_MODEL_STORAGE_KEY = 'aiPanel_geminiModel';
const AI_OPENROUTER_API_KEY_STORAGE_KEY = 'aiPanel_openRouterApiKey';
const AI_OPENROUTER_MODEL_STORAGE_KEY = 'aiPanel_openRouterModel';
const AI_OPENAI_COMPATIBLE_API_KEY_STORAGE_KEY = 'aiPanel_openAiCompatibleApiKey';
const AI_OPENAI_COMPATIBLE_BASE_URL_STORAGE_KEY = 'aiPanel_openAiCompatibleBaseUrl';
const AI_OPENAI_COMPATIBLE_MODEL_STORAGE_KEY = 'aiPanel_openAiCompatibleModel';
const AI_DEFAULT_PROVIDER = 'gemini';
const AI_GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';
const AI_GEMINI_DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';
const AI_OPENROUTER_DEFAULT_MODEL = 'openrouter/free';
const AI_OPENAI_COMPATIBLE_DEFAULT_MODEL = 'gpt-4o-mini';
const AI_OPENROUTER_FREE_MODELS_CACHE_KEY = 'aiPanel_openRouterFreeModelsCache';
const AI_OPENROUTER_MODELS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const AI_GEMINI_MAX_INLINE_IMAGE_BYTES = 10 * 1024 * 1024;
const AI_PUTER_SDK_URL = 'https://js.puter.com/v2/';
const AI_PUTER_SDK_MARK_KEY = '__tt_enhancer_puter_sdk_loaded';
const AI_PANEL_ENABLED_STORAGE_KEY = 'features_aiGeminiChat';
const AI_PANEL_CSP_RULE_IDS = [5200, 5201, 5202];
const CROSS_PROJECT_CLIPBOARD_STORAGE_KEY = 'tt_enhancer_cross_project_layer_clipboard';
let miniBrowserSidePanelEnabled = false;

function isIgnorableTabError(error) {
  const message = String(error?.message || error || '');
  return /Frame with ID \d+ was removed|No frame with id|No tab with id|The tab was closed|Cannot access contents of url/i.test(message);
}

async function safeExecuteScript(details) {
  try {
    return await chrome.scripting.executeScript(details);
  } catch (error) {
    if (isIgnorableTabError(error)) return null;
    throw error;
  }
}

function detectCmsEditorReadyInPage() {
  if (document.readyState === 'loading') return false;

  const readySelectors = [
    '.tt-header__right',
    '.tt-design-mode-publish',
    '.tt-design-mode-right-panel',
    '.tt-right-panel',
    '.tt-widgets__list',
    '.tt-layers',
    '[class*="design-mode"][class*="right"]',
    '[class*="right-panel"]'
  ];

  return readySelectors.some((selector) => {
    try {
      return !!document.querySelector(selector);
    } catch {
      return false;
    }
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCmsEditorReady(tabId, timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const frames = await safeExecuteScript({
      target: { tabId },
      world: 'ISOLATED',
      func: detectCmsEditorReadyInPage
    });

    if (frames?.[0]?.result === true) return true;
    if (!frames) return false;
    await sleep(500);
  }

  return false;
}

async function syncDvhPreloadContentScript(settings) {
  if (!chrome.scripting?.registerContentScripts) return;

  try {
    const registered = await chrome.scripting.getRegisteredContentScripts({
      ids: [DVH_PRELOAD_CONTENT_SCRIPT_ID]
    });
    const isRegistered = registered.length > 0;

    if (isRegistered) {
      await chrome.scripting.unregisterContentScripts({
        ids: [DVH_PRELOAD_CONTENT_SCRIPT_ID]
      });
    }
  } catch (e) {
    console.warn('Taptop Enhancer dvh preload sync error:', e);
  }
}

// ============= Управление CSS (без перезагрузки) =============

async function addCssTag(tabId, filePath, key) {
  const abs = chrome.runtime.getURL(filePath);
  return safeExecuteScript({
    target: { tabId },
    world: 'MAIN',
    func: (href, id) => {
      const existing = document.querySelector(`style[data-tt-css="${id}"]`);
      fetch(href, { credentials: 'omit' })
        .then(r => r.text())
        .then(css => {
          const s = existing || document.createElement('style');
          s.textContent = css;
          if (!existing) {
            s.setAttribute('data-tt-css', id);
            (document.head || document.documentElement).appendChild(s);
          }
        })
        .catch(err => console.error('TT addCssTag error:', err));
    },
    args: [abs, key + '::' + filePath]
  });
}

async function removeCssTag(tabId, filePath, key) {
  return safeExecuteScript({
    target: { tabId },
    world: 'MAIN',
    func: (id) => {
      const s = document.querySelector(`style[data-tt-css="${id}"]`);
      if (s) s.remove();
    },
    args: [key + '::' + filePath]
  });
}

// ============= CSP-safe загрузка внешних JS и инъекция в MAIN =============

async function fetchExternalCode(url) {
  let res = null;
  try {
    res = await fetch(url, { credentials: 'omit', cache: 'no-cache' });
  } catch (error) {
    throw new Error('Failed to fetch ' + url + ': ' + (error?.message || String(error)));
  }
  if (!res.ok) throw new Error('Failed to fetch ' + url);
  return await res.text();
}

async function injectInlineJsMain(tabId, code, key, dedupe = true) {
  return safeExecuteScript({
    target: { tabId },
    world: 'MAIN',
    func: (codeText, markKey, shouldDedupe) => {
      if (shouldDedupe && markKey && window[markKey]) return; // дедупликация
      const s = document.createElement('script');
      s.textContent = codeText;
      (document.head || document.documentElement).appendChild(s);
      s.remove();
      if (shouldDedupe && markKey) window[markKey] = true;
    },
    args: [code, key, dedupe]
  });
}

async function injectLocalJsFileMain(tabId, file) {
  const abs = chrome.runtime.getURL(file);
  try {
    const code = await fetchExternalCode(abs);
    await injectInlineJsMain(tabId, code, '', false);
  } catch (error) {
    console.warn('Taptop Enhancer inline local JS fetch failed, falling back to files injection:', {
      file,
      url: abs,
      error: error?.message || String(error)
    });
    try {
      return await safeExecuteScript({
        target: { tabId },
        world: 'MAIN',
        files: [file]
      });
    } catch (fallbackError) {
      console.warn('Taptop Enhancer local JS files injection skipped:', {
        file,
        error: fallbackError?.message || String(fallbackError)
      });
      return null;
    }
  }
  return true;
}

async function injectJsRespectingCSP(tabId, externalUrls, localFiles) {
  // 1) Внешние модули: грузим код в SW и инжектим inline в MAIN
  for (const url of (externalUrls || [])) {
    try {
      const code = await fetchExternalCode(url);
      // метка чтобы не дублировать
      const markKey = '__tt_enhancer_ext_inline__' + url;
      await injectInlineJsMain(tabId, code, markKey, true);
    } catch (error) {
      console.warn('Taptop Enhancer external JS inject skipped:', {
        url,
        error: error?.message || String(error)
      });
    }
  }

  // 2) Локальные файлы: вставляем как page-скрипт через текст
  for (const file of (localFiles || [])) {
    await injectLocalJsFileMain(tabId, file);
  }

  console.log('Taptop Enhancer: внешние и локальные JS инжектированы inline (CSP-safe)');
}

async function injectJsIsolated(tabId, localFiles) {
  try {
    for (const file of (localFiles || [])) {
      const results = await safeExecuteScript({
        target: { tabId },
        world: 'ISOLATED',
        func: (filePath) => {
          window.__ttEnhancerIsolatedInjected = window.__ttEnhancerIsolatedInjected || {};
          if (window.__ttEnhancerIsolatedInjected[filePath]) return false;
          window.__ttEnhancerIsolatedInjected[filePath] = true;
          return true;
        },
        args: [file]
      });
      if (!results) return;
      if (!results?.[0]?.result) continue;
      const injected = await safeExecuteScript({
        target: { tabId },
        world: 'ISOLATED',
        files: [file]
      });
      if (!injected) return;
    }
  } catch (e) {
    console.error('Taptop Enhancer isolated inject error:', e);
  }
}

// ============= Источники дополнительных виджетов =============

const ADDITIONAL_WIDGET_SOURCES_STORAGE_KEY = 'widgets_additionalWidgetSources';
const ADDITIONAL_WIDGET_CACHE_STORAGE_KEY = 'widgets_additionalWidgetCache';
const ADDITIONAL_WIDGET_SYNC_STATUS_STORAGE_KEY = 'widgets_additionalWidgetSyncStatus';
const ADDITIONAL_WIDGET_DISABLED_STORAGE_KEY = 'widgets_additionalWidgetDisabled';
const ADDITIONAL_WIDGET_DEFAULT_SOURCE = {
  id: 'tthelper_data',
  title: 'TapTop Helper',
  type: 'github',
  url: 'https://github.com/GoodMade/tthelper_data/tree/main/widgets',
  readonly: true
};
const ADDITIONAL_WIDGET_LOCAL_SOURCE = {
  id: 'local_uploaded_widgets',
  title: 'Локальные виджеты',
  type: 'local',
  url: 'local://uploaded-widgets',
  readonly: true
};
const ADDITIONAL_WIDGET_VALID_FILE_NAMES = new Set(['layers.json', 'script.json']);

function additionalWidgetHashString(value) {
  let hash = 2166136261;
  const str = String(value || '');
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

function normalizeAdditionalWidgetUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw)) return raw;
  return 'https://' + raw;
}

function normalizeAdditionalWidgetSourceType(value) {
  if (value === 'local') return 'local';
  return value === 'folder' ? 'folder' : 'github';
}

function normalizeAdditionalWidgetSourceId(value, fallbackSeed) {
  const raw = String(value || '').trim();
  if (/^[a-zA-Z0-9._:-]+$/.test(raw)) return raw;
  return 'source-' + additionalWidgetHashString(fallbackSeed || raw || Date.now());
}

function normalizeAdditionalWidgetSource(source, index) {
  const url = normalizeAdditionalWidgetUrl(source?.url || '');
  const id = normalizeAdditionalWidgetSourceId(source?.id, url || String(index));
  return {
    id,
    title: String(source?.title || id).trim() || id,
    type: normalizeAdditionalWidgetSourceType(source?.type),
    url,
    active: source?.active !== false,
    order: index,
    readonly: !!source?.readonly
  };
}

function isValidAdditionalWidgetName(value) {
  return /^[a-zA-Z0-9._-]+$/.test(String(value || ''));
}

function encodeAdditionalWidgetPath(value) {
  return String(value || '')
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function joinAdditionalWidgetFolderUrl(baseUrl, widgetName, fileName) {
  const base = String(baseUrl || '').replace(/\/+$/, '');
  return `${base}/${encodeURIComponent(widgetName)}/${encodeURIComponent(fileName)}`;
}

function getAdditionalWidgetKey(source, widgetName) {
  return `${source.id}::${widgetName}`;
}

function buildAdditionalWidgetEntry(source, widgetName) {
  return {
    key: getAdditionalWidgetKey(source, widgetName),
    name: widgetName,
    sourceId: source.id,
    sourceTitle: source.title || source.id,
    sourceType: source.type,
    sourceOrder: source.order || 0
  };
}

function parseAdditionalWidgetGithubSource(source) {
  const url = normalizeAdditionalWidgetUrl(source.url);
  if (!url) throw new Error('Empty GitHub source URL');

  const parsed = new URL(url);
  const parts = parsed.pathname.split('/').filter(Boolean);
  let owner = '';
  let repo = '';
  let branch = 'main';
  let path = 'widgets';

  if (parsed.hostname === 'github.com') {
    owner = parts[0] || '';
    repo = (parts[1] || '').replace(/\.git$/, '');
    if (parts[2] === 'tree' && parts[3]) {
      branch = parts[3];
      path = parts.slice(4).join('/') || 'widgets';
    }
  } else if (parsed.hostname === 'raw.githubusercontent.com') {
    owner = parts[0] || '';
    repo = (parts[1] || '').replace(/\.git$/, '');
    branch = parts[2] || 'main';
    path = parts.slice(3).join('/') || 'widgets';
  } else if (parsed.hostname === 'cdn.jsdelivr.net' && parts[0] === 'gh') {
    owner = parts[1] || '';
    const repoWithBranch = parts[2] || '';
    const branchIndex = repoWithBranch.indexOf('@');
    repo = (branchIndex >= 0 ? repoWithBranch.slice(0, branchIndex) : repoWithBranch).replace(/\.git$/, '');
    branch = branchIndex >= 0 ? repoWithBranch.slice(branchIndex + 1) || 'main' : 'main';
    path = parts.slice(3).join('/') || 'widgets';
  }

  if (!owner || !repo) throw new Error('Invalid GitHub source URL');
  return { owner, repo, branch, path };
}

function getAdditionalWidgetGithubContentsUrl(source) {
  const info = parseAdditionalWidgetGithubSource(source);
  const path = encodeAdditionalWidgetPath(info.path);
  return `https://api.github.com/repos/${encodeURIComponent(info.owner)}/${encodeURIComponent(info.repo)}/contents/${path}?ref=${encodeURIComponent(info.branch)}`;
}

function getAdditionalWidgetGithubRawPathUrl(source, extraPath) {
  const info = parseAdditionalWidgetGithubSource(source);
  const path = encodeAdditionalWidgetPath([info.path, extraPath].filter(Boolean).join('/'));
  return `https://raw.githubusercontent.com/${encodeURIComponent(info.owner)}/${encodeURIComponent(info.repo)}/${encodeURIComponent(info.branch)}/${path}`;
}

function getAdditionalWidgetJsdelivrPackageUrl(source) {
  const info = parseAdditionalWidgetGithubSource(source);
  return `https://data.jsdelivr.com/v1/packages/gh/${encodeURIComponent(info.owner)}/${encodeURIComponent(info.repo)}@${encodeURIComponent(info.branch)}?structure=flat`;
}

function getAdditionalWidgetJsdelivrPathUrl(source, extraPath) {
  const info = parseAdditionalWidgetGithubSource(source);
  const path = encodeAdditionalWidgetPath([info.path, extraPath].filter(Boolean).join('/'));
  return `https://cdn.jsdelivr.net/gh/${encodeURIComponent(info.owner)}/${encodeURIComponent(info.repo)}@${encodeURIComponent(info.branch)}/${path}`;
}

function getAdditionalWidgetGithubTreeUrl(source) {
  const info = parseAdditionalWidgetGithubSource(source);
  const path = encodeAdditionalWidgetPath(info.path);
  return `https://github.com/${encodeURIComponent(info.owner)}/${encodeURIComponent(info.repo)}/tree/${encodeURIComponent(info.branch)}/${path}`;
}

function normalizeAdditionalWidgetIndex(data) {
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.widgets)
      ? data.widgets
      : [];

  return items
    .map((item) => typeof item === 'string' ? { name: item } : item)
    .filter((item) => isValidAdditionalWidgetName(item?.name))
    .map((item) => item.name);
}

function normalizeAdditionalWidgetFlatFileName(value) {
  return '/' + String(value || '').replace(/^\/+/, '');
}

function parseAdditionalWidgetJsdelivrFlatList(data, source) {
  const info = parseAdditionalWidgetGithubSource(source);
  const prefix = '/' + String(info.path || '').replace(/^\/+|\/+$/g, '') + '/';
  const names = new Set();
  const files = Array.isArray(data?.files) ? data.files : [];

  files.forEach((file) => {
    const fileName = normalizeAdditionalWidgetFlatFileName(file?.name);
    if (!fileName.startsWith(prefix)) return;

    const rest = fileName.slice(prefix.length);
    const parts = rest.split('/').filter(Boolean);
    if (parts.length !== 2 || parts[1] !== 'layers.json') return;
    if (isValidAdditionalWidgetName(parts[0])) names.add(parts[0]);
  });

  return Array.from(names);
}

function decodeAdditionalWidgetHtmlAttr(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function parseAdditionalWidgetGithubTreeHtml(html, source) {
  const info = parseAdditionalWidgetGithubSource(source);
  const basePath = '/' + [
    info.owner,
    info.repo,
    'tree',
    info.branch,
    ...String(info.path || '').split('/').filter(Boolean)
  ].map((part) => encodeURIComponent(part)).join('/') + '/';
  const names = new Set();
  const hrefPattern = /\bhref="([^"]+)"/g;
  let match = null;

  while ((match = hrefPattern.exec(String(html || '')))) {
    let href = decodeAdditionalWidgetHtmlAttr(match[1]).split('#')[0].split('?')[0];
    try {
      if (/^https?:\/\//i.test(href)) href = new URL(href).pathname;
    } catch (e) {}
    if (!href.startsWith(basePath)) continue;

    const rest = href.slice(basePath.length);
    if (!rest || rest.includes('/')) continue;

    try {
      const name = decodeURIComponent(rest);
      if (isValidAdditionalWidgetName(name)) names.add(name);
    } catch (e) {}
  }

  return Array.from(names);
}

async function fetchAdditionalWidgetText(url, options = {}) {
  const response = await fetch(url, Object.assign({
    cache: 'no-cache',
    credentials: 'omit'
  }, options));

  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.text();
}

async function fetchAdditionalWidgetJson(url, options = {}) {
  const text = await fetchAdditionalWidgetText(url, Object.assign({
    headers: { Accept: 'application/json' }
  }, options));
  return JSON.parse(text);
}

function readAdditionalWidgetCustomSources() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get({ [ADDITIONAL_WIDGET_SOURCES_STORAGE_KEY]: [] }, (settings) => {
        const sources = Array.isArray(settings?.[ADDITIONAL_WIDGET_SOURCES_STORAGE_KEY])
          ? settings[ADDITIONAL_WIDGET_SOURCES_STORAGE_KEY]
          : [];
        resolve(sources);
      });
    } catch (e) {
      resolve([]);
    }
  });
}

function normalizeAdditionalWidgetDisabledMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, isDisabled]) => isDisabled === true && /^[a-zA-Z0-9._:-]+::[a-zA-Z0-9._-]+$/.test(key))
      .map(([key]) => [key, true])
  );
}

function readAdditionalWidgetDisabledMap() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get({ [ADDITIONAL_WIDGET_DISABLED_STORAGE_KEY]: {} }, (settings) => {
        resolve(normalizeAdditionalWidgetDisabledMap(settings?.[ADDITIONAL_WIDGET_DISABLED_STORAGE_KEY]));
      });
    } catch (e) {
      resolve({});
    }
  });
}

function writeAdditionalWidgetDisabledMap(disabledMap) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.set({
        [ADDITIONAL_WIDGET_DISABLED_STORAGE_KEY]: normalizeAdditionalWidgetDisabledMap(disabledMap)
      }, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message || 'Failed to write disabled widgets'));
          return;
        }
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function loadAdditionalWidgetSources() {
  const customSources = await readAdditionalWidgetCustomSources();
  const sources = [
    normalizeAdditionalWidgetSource(ADDITIONAL_WIDGET_DEFAULT_SOURCE, 0),
    normalizeAdditionalWidgetSource(ADDITIONAL_WIDGET_LOCAL_SOURCE, 1),
    ...customSources.map((source, index) => normalizeAdditionalWidgetSource(source, index + 2))
  ];
  const seen = new Set();

  return sources.filter((source) => {
    if (!source.active || !source.url || seen.has(source.id)) return false;
    seen.add(source.id);
    return true;
  });
}

function readLocalStorage(keys) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(keys, (items) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message || 'Failed to read chrome.storage.local'));
          return;
        }
        resolve(items || {});
      });
    } catch (error) {
      reject(error);
    }
  });
}

function writeLocalStorage(items) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set(items, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message || 'Failed to write chrome.storage.local'));
          return;
        }
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

function readSyncStorage(keys) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get(keys, (items) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message || 'Failed to read chrome.storage.sync'));
          return;
        }
        resolve(items || {});
      });
    } catch (error) {
      reject(error);
    }
  });
}

function writeSyncStorage(items) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.set(items, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message || 'Failed to write chrome.storage.sync'));
          return;
        }
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function readAdditionalWidgetCache() {
  const items = await readLocalStorage({ [ADDITIONAL_WIDGET_CACHE_STORAGE_KEY]: {} });
  return items[ADDITIONAL_WIDGET_CACHE_STORAGE_KEY] || {};
}

async function readAdditionalWidgetSyncStatus() {
  const items = await readLocalStorage({ [ADDITIONAL_WIDGET_SYNC_STATUS_STORAGE_KEY]: {} });
  return items[ADDITIONAL_WIDGET_SYNC_STATUS_STORAGE_KEY] || {};
}

async function setAdditionalWidgetSyncStatus(sourceId, patch) {
  const statuses = await readAdditionalWidgetSyncStatus();
  const next = Object.assign({}, statuses[sourceId] || {}, patch || {}, {
    updatedAt: Date.now()
  });
  statuses[sourceId] = next;
  await writeLocalStorage({ [ADDITIONAL_WIDGET_SYNC_STATUS_STORAGE_KEY]: statuses });
  return next;
}

function isAdditionalWidgetCacheValid(source, cached) {
  return !!(
    source
    && cached
    && cached.source
    && cached.source.type === source.type
    && cached.source.url === source.url
    && Array.isArray(cached.widgets)
  );
}

function getCachedAdditionalWidgetListForSource(source, cached, disabledMap = {}) {
  if (!isAdditionalWidgetCacheValid(source, cached)) return [];
  return cached.widgets
    .map((widget) => buildAdditionalWidgetEntry(source, widget.name || widget))
    .filter((widget) => isValidAdditionalWidgetName(widget.name) && disabledMap[widget.key] !== true);
}

function getCachedAdditionalWidgetFile(cached, widgetName, fileName) {
  const files = cached?.files?.[widgetName];
  if (!files) return undefined;
  return files[fileName];
}

function getAdditionalWidgetFileUrl(source, widgetName, fileName, options = {}) {
  if (source.type === 'local') {
    throw new Error('Local widget file is not in remote source');
  }

  if (source.type === 'github' && options.preferRaw === true) {
    return getAdditionalWidgetGithubRawPathUrl(source, `${widgetName}/${fileName}`);
  }

  return source.type === 'folder'
    ? joinAdditionalWidgetFolderUrl(source.url, widgetName, fileName)
    : getAdditionalWidgetJsdelivrPathUrl(source, `${widgetName}/${fileName}`);
}

async function fetchAdditionalWidgetFileFromSource(source, widgetName, fileName, options = {}) {
  return fetchAdditionalWidgetJson(getAdditionalWidgetFileUrl(source, widgetName, fileName, options));
}

async function writeCachedAdditionalWidgetFile(source, widgetName, fileName, fileJson) {
  const cache = await readAdditionalWidgetCache();
  const cached = isAdditionalWidgetCacheValid(source, cache[source.id])
    ? cache[source.id]
    : {
      source: {
        id: source.id,
        title: source.title,
        type: source.type,
        url: source.url
      },
      widgets: [],
      files: {}
    };
  const widgets = Array.isArray(cached.widgets) ? cached.widgets.slice() : [];
  const hasWidget = widgets.some((widget) => String(widget?.name || widget || '') === widgetName);
  if (!hasWidget) widgets.push(buildAdditionalWidgetEntry(source, widgetName));

  const files = Object.assign({}, cached.files || {});
  files[widgetName] = Object.assign({}, files[widgetName] || {}, {
    [fileName]: fileJson
  });

  cache[source.id] = Object.assign({}, cached, {
    source: {
      id: source.id,
      title: source.title,
      type: source.type,
      url: source.url
    },
    widgets,
    files,
    syncedAt: Date.now()
  });

  await writeLocalStorage({ [ADDITIONAL_WIDGET_CACHE_STORAGE_KEY]: cache });
}

async function loadAdditionalGithubWidgetList(source) {
  try {
    const items = await fetchAdditionalWidgetJson(getAdditionalWidgetGithubContentsUrl(source), {
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (Array.isArray(items)) {
      return items
        .filter((item) => item?.type === 'dir' && isValidAdditionalWidgetName(item.name))
        .map((item) => buildAdditionalWidgetEntry(source, item.name));
    }
  } catch (e) {}

  try {
    const names = parseAdditionalWidgetJsdelivrFlatList(
      await fetchAdditionalWidgetJson(getAdditionalWidgetJsdelivrPackageUrl(source)),
      source
    );
    if (names.length) return names.map((name) => buildAdditionalWidgetEntry(source, name));
  } catch (e) {}

  try {
    const names = normalizeAdditionalWidgetIndex(
      await fetchAdditionalWidgetJson(getAdditionalWidgetGithubRawPathUrl(source, 'widgets.json'))
    );
    if (names.length) return names.map((name) => buildAdditionalWidgetEntry(source, name));
  } catch (e) {}

  try {
    const html = await fetchAdditionalWidgetText(getAdditionalWidgetGithubTreeUrl(source), {
      headers: { Accept: 'text/html' }
    });
    const names = parseAdditionalWidgetGithubTreeHtml(html, source);
    if (names.length) return names.map((name) => buildAdditionalWidgetEntry(source, name));
  } catch (e) {}

  return [];
}

async function loadAdditionalFolderWidgetList(source) {
  const base = source.url.replace(/\/+$/, '');
  const names = normalizeAdditionalWidgetIndex(await fetchAdditionalWidgetJson(`${base}/widgets.json`));
  return names.map((name) => buildAdditionalWidgetEntry(source, name));
}

async function loadAdditionalLocalWidgetList(source) {
  const cache = await readAdditionalWidgetCache();
  if (!isAdditionalWidgetCacheValid(source, cache[source.id])) return [];
  return cache[source.id].widgets
    .map((widget) => buildAdditionalWidgetEntry(source, widget.name || widget))
    .filter((widget) => isValidAdditionalWidgetName(widget.name));
}

async function loadAdditionalSourceWidgetList(source) {
  if (source.type === 'local') return loadAdditionalLocalWidgetList(source);
  if (source.type === 'folder') return loadAdditionalFolderWidgetList(source);
  return loadAdditionalGithubWidgetList(source);
}

async function syncAdditionalWidgetSource(source) {
  const sourceId = source?.id || '';
  if (!sourceId) throw new Error('No source id');

  if (source.type === 'local') {
    const widgets = await loadAdditionalLocalWidgetList(source);
    return setAdditionalWidgetSyncStatus(sourceId, {
      state: 'success',
      error: '',
      widgetsCount: widgets.length
    });
  }

  await setAdditionalWidgetSyncStatus(sourceId, {
    state: 'syncing',
    error: '',
    widgetsCount: 0
  });

  try {
    const listedWidgets = await loadAdditionalSourceWidgetList(source);
    const files = {};
    const syncedWidgets = [];

    const results = await Promise.allSettled(listedWidgets.map(async (widget) => {
      const widgetName = widget.name;
      const layersJson = await fetchAdditionalWidgetFileFromSource(source, widgetName, 'layers.json');
      let scriptJson = null;

      try {
        scriptJson = await fetchAdditionalWidgetFileFromSource(source, widgetName, 'script.json');
      } catch (e) {}

      return {
        widget,
        files: {
          'layers.json': layersJson,
          'script.json': scriptJson
        }
      };
    }));

    results.forEach((result) => {
      if (result.status !== 'fulfilled') return;
      const { widget, files: widgetFiles } = result.value;
      if (!isValidAdditionalWidgetName(widget?.name)) return;
      syncedWidgets.push(widget);
      files[widget.name] = widgetFiles;
    });

    if (!syncedWidgets.length && listedWidgets.length) {
      throw new Error('Widget files were not loaded');
    }

    const cache = await readAdditionalWidgetCache();
    cache[sourceId] = {
      source: {
        id: source.id,
        title: source.title,
        type: source.type,
        url: source.url
      },
      widgets: syncedWidgets,
      files,
      syncedAt: Date.now()
    };
    await writeLocalStorage({ [ADDITIONAL_WIDGET_CACHE_STORAGE_KEY]: cache });

    return setAdditionalWidgetSyncStatus(sourceId, {
      state: 'success',
      error: '',
      widgetsCount: syncedWidgets.length
    });
  } catch (error) {
    await setAdditionalWidgetSyncStatus(sourceId, {
      state: 'error',
      error: error?.message || String(error),
      widgetsCount: 0
    });
    throw error;
  }
}

async function loadAdditionalWidgetList() {
  const sources = await loadAdditionalWidgetSources();
  const cache = await readAdditionalWidgetCache();
  const disabledMap = await readAdditionalWidgetDisabledMap();
  const widgets = [];
  const errors = [];

  for (const source of sources) {
    const cached = cache[source.id];
    if (isAdditionalWidgetCacheValid(source, cached)) {
      widgets.push(...getCachedAdditionalWidgetListForSource(source, cached, disabledMap));
      continue;
    }

    try {
      await syncAdditionalWidgetSource(source);
      const freshCache = await readAdditionalWidgetCache();
      widgets.push(...getCachedAdditionalWidgetListForSource(source, freshCache[source.id], disabledMap));
    } catch (error) {
      errors.push(error);
    }
  }

  if (!widgets.length && errors.length) {
    throw errors[0] || new Error('No widget sources loaded');
  }

  return widgets.sort((a, b) => {
    const source = (Number(a.sourceOrder) || 0) - (Number(b.sourceOrder) || 0);
    return source || String(a.name || '').localeCompare(String(b.name || ''));
  });
}

async function getAdditionalWidgetSourceById(sourceId) {
  const sources = await loadAdditionalWidgetSources();
  return sources.find((source) => source.id === sourceId) || sources[0] || normalizeAdditionalWidgetSource(ADDITIONAL_WIDGET_DEFAULT_SOURCE, 0);
}

async function loadAdditionalWidgetFile(payload) {
  const widgetName = payload?.widgetName || '';
  const fileName = payload?.fileName || '';
  const bypassCache = payload?.bypassCache === true;
  if (!isValidAdditionalWidgetName(widgetName)) throw new Error('Invalid widget name');
  if (!ADDITIONAL_WIDGET_VALID_FILE_NAMES.has(fileName)) throw new Error('Invalid widget file');

  const source = await getAdditionalWidgetSourceById(payload?.sourceId || ADDITIONAL_WIDGET_DEFAULT_SOURCE.id);
  const cache = await readAdditionalWidgetCache();
  const cachedFile = getCachedAdditionalWidgetFile(cache[source.id], widgetName, fileName);
  if (cachedFile !== undefined && !bypassCache) return cachedFile;

  if (source.type === 'local') {
    if (cachedFile !== undefined) return cachedFile;
    throw new Error('Local widget file is not loaded');
  }

  if (!bypassCache) {
    await syncAdditionalWidgetSource(source);
    const freshCache = await readAdditionalWidgetCache();
    const freshFile = getCachedAdditionalWidgetFile(freshCache[source.id], widgetName, fileName);
    if (freshFile !== undefined) return freshFile;
  }

  const fileJson = await fetchAdditionalWidgetFileFromSource(source, widgetName, fileName, {
    preferRaw: bypassCache
  });
  if (bypassCache) await writeCachedAdditionalWidgetFile(source, widgetName, fileName, fileJson);
  return fileJson;
}

async function syncAdditionalWidgetSourceById(sourceId) {
  const source = await getAdditionalWidgetSourceById(sourceId || ADDITIONAL_WIDGET_DEFAULT_SOURCE.id);
  return syncAdditionalWidgetSource(source);
}

async function forgetAdditionalWidgetSource(sourceId) {
  if (
    !sourceId
    || sourceId === ADDITIONAL_WIDGET_DEFAULT_SOURCE.id
    || sourceId === ADDITIONAL_WIDGET_LOCAL_SOURCE.id
  ) return;

  const [cache, statuses, disabledMap] = await Promise.all([
    readAdditionalWidgetCache(),
    readAdditionalWidgetSyncStatus(),
    readAdditionalWidgetDisabledMap()
  ]);
  let disabledChanged = false;

  delete cache[sourceId];
  delete statuses[sourceId];
  Object.keys(disabledMap).forEach((key) => {
    if (!key.startsWith(`${sourceId}::`)) return;
    delete disabledMap[key];
    disabledChanged = true;
  });

  await writeLocalStorage({
    [ADDITIONAL_WIDGET_CACHE_STORAGE_KEY]: cache,
    [ADDITIONAL_WIDGET_SYNC_STATUS_STORAGE_KEY]: statuses
  });
  if (disabledChanged) await writeAdditionalWidgetDisabledMap(disabledMap);
}

async function handleAdditionalWidgetsRequest(req, sendResponse) {
  try {
    if (req.widgetAction === 'syncSource') {
      sendResponse?.({ ok: true, result: await syncAdditionalWidgetSourceById(req.sourceId) });
      return;
    }

    if (req.widgetAction === 'forgetSource') {
      await forgetAdditionalWidgetSource(req.sourceId);
      sendResponse?.({ ok: true, result: null });
      return;
    }

    if (req.widgetAction === 'list') {
      sendResponse?.({ ok: true, result: await loadAdditionalWidgetList() });
      return;
    }

    if (req.widgetAction === 'file') {
      sendResponse?.({ ok: true, result: await loadAdditionalWidgetFile(req.payload || {}) });
      return;
    }

    throw new Error('Unknown additional widgets action');
  } catch (error) {
    sendResponse?.({ ok: false, error: error?.message || String(error) });
  }
}

// ============= Управление правилами сетевых заголовков =============

async function setDnrRulesets(rulesetIds, isEnabled) {
  if (!rulesetIds || !rulesetIds.length || !chrome.declarativeNetRequest?.updateEnabledRulesets) {
    return;
  }

  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: isEnabled ? rulesetIds : [],
      disableRulesetIds: isEnabled ? [] : rulesetIds
    });
  } catch (e) {
    console.warn('Taptop Enhancer DNR ruleset error:', e);
  }
}

async function syncDnrRulesetsFromSettings(settings) {
  const enable = new Set();
  const disable = new Set();

  for (const categoryId in featuresConfig) {
    const category = featuresConfig[categoryId];
    for (const optionId in category.options) {
      const option = category.options[optionId];
      if (!option.dnrRulesets?.length) continue;

      const fullId = categoryId + '_' + optionId;
      const storageKey = option.storageKey || fullId;
      const value = getOptionValue(settings, storageKey, option);
      const isOn = isOptionEnabled(option, value, settings);

      option.dnrRulesets.forEach((rulesetId) => {
        if (isOn) {
          enable.add(rulesetId);
          disable.delete(rulesetId);
        } else if (!enable.has(rulesetId)) {
          disable.add(rulesetId);
        }
      });
    }
  }

  if (!enable.size && !disable.size) return;

  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: Array.from(enable),
      disableRulesetIds: Array.from(disable)
    });
  } catch (e) {
    console.warn('Taptop Enhancer DNR sync error:', e);
  }
}

async function syncDynamicFrameRulesFromSettings(settings) {
  if (!chrome.declarativeNetRequest?.updateDynamicRules) return;

  const removeRuleIds = Array.from({ length: 100 }, (_, index) => 5000 + index);
  const hosts = [];

  if (isMiniBrowserFrameBrowserEnabled(settings)) {
    for (const categoryId in featuresConfig) {
      const category = featuresConfig[categoryId];
      for (const optionId in category.options) {
        const option = category.options[optionId];
        if (option.type !== 'browserTabs') continue;

        const fullId = categoryId + '_' + optionId;
        const storageKey = option.storageKey || fullId;
        const value = getOptionValue(settings, storageKey, option);
        if (!Array.isArray(value)) continue;

        value.forEach((tab) => {
          if (!tab || tab.active === false || !tab.url || tab.deleted) return;
          try {
            const host = new URL(tab.url).hostname;
            if (host && !hosts.includes(host)) hosts.push(host);
          } catch (e) {}
        });
      }
    }
  }

  const addRules = hosts.slice(0, 100).map((host, index) => ({
    id: 5000 + index,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      responseHeaders: [
        { header: 'x-frame-options', operation: 'remove' },
        { header: 'content-security-policy', operation: 'remove' },
        { header: 'content-security-policy-report-only', operation: 'remove' }
      ]
    },
    condition: {
      urlFilter: '||' + host + '^',
      resourceTypes: ['sub_frame']
    }
  }));

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules
    });
  } catch (e) {
    console.warn('Taptop Enhancer dynamic DNR sync error:', e);
  }
}

async function syncAiPanelCspRulesFromSettings(settings) {
  if (!chrome.declarativeNetRequest?.updateDynamicRules) return;

  const isOn = !isSafeModeEnabled(settings) && getBooleanOptionValue(settings || {}, AI_PANEL_ENABLED_STORAGE_KEY, false);
  const removeRuleIds = AI_PANEL_CSP_RULE_IDS.slice();
  const makeRule = (id, regexFilter) => ({
    id,
    priority: 10,
    action: {
      type: 'modifyHeaders',
      responseHeaders: [
        { header: 'content-security-policy', operation: 'remove' },
        { header: 'content-security-policy-report-only', operation: 'remove' }
      ]
    },
    condition: {
      regexFilter,
      resourceTypes: ['main_frame', 'sub_frame']
    }
  });
  const addRules = isOn ? [
    makeRule(5200, '^https?://([^/]+\\.)?taptop\\.pro(?:/|$)'),
    makeRule(5201, '^https?://([^/]+\\.)?taptop\\.site(?:/|$)'),
    makeRule(5202, '^https?://([^/]+\\.)?onicon\\.ru(?:/|$)')
  ] : [];

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules
    });
  } catch (e) {
    console.warn('Taptop Enhancer AI panel CSP DNR sync error:', e);
  }
}

chrome.storage.sync.get(null, (settings) => {
  syncMiniBrowserRuntimeFlags(settings || {});
  syncDvhPreloadContentScript(settings);
  syncDnrRulesetsFromSettings(settings);
  syncDynamicFrameRulesFromSettings(settings);
  syncAiPanelCspRulesFromSettings(settings);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return;

  const shouldSyncDvh = Object.prototype.hasOwnProperty.call(changes, 'units_dvhHeight');
  const shouldSyncMiniBrowser = (
    Object.prototype.hasOwnProperty.call(changes, SAFE_MODE_STORAGE_KEY)
    || Object.prototype.hasOwnProperty.call(changes, MINI_BROWSER_ENABLED_STORAGE_KEY)
    || Object.prototype.hasOwnProperty.call(changes, MINI_BROWSER_SIDE_PANEL_BROWSER_STORAGE_KEY)
    || Object.prototype.hasOwnProperty.call(changes, MINI_BROWSER_OPEN_SITE_BUTTON_STORAGE_KEY)
    || Object.prototype.hasOwnProperty.call(changes, 'miniBrowser_pinnedTabs')
  );
  const shouldSyncAiPanelCsp = (
    Object.prototype.hasOwnProperty.call(changes, SAFE_MODE_STORAGE_KEY)
    || Object.prototype.hasOwnProperty.call(changes, AI_PANEL_ENABLED_STORAGE_KEY)
  );

  if (!shouldSyncDvh && !shouldSyncMiniBrowser && !shouldSyncAiPanelCsp) return;

  chrome.storage.sync.get(null, (settings) => {
    syncMiniBrowserRuntimeFlags(settings || {});
    if (shouldSyncDvh) syncDvhPreloadContentScript(settings);
    if (shouldSyncMiniBrowser) {
      syncDnrRulesetsFromSettings(settings);
      syncDynamicFrameRulesFromSettings(settings);
    }
    if (shouldSyncAiPanelCsp) syncAiPanelCspRulesFromSettings(settings);
  });
});

function getOptionValue(settings, storageKey, option) {
  if (Object.prototype.hasOwnProperty.call(settings, storageKey)) return settings[storageKey];
  if (option.fallbackStorageKey && Object.prototype.hasOwnProperty.call(settings, option.fallbackStorageKey)) {
    return settings[option.fallbackStorageKey];
  }
  return option.defaultValue;
}

function getOptionValueForTariff(settings, storageKey, option, tariffState) {
  if (Object.prototype.hasOwnProperty.call(settings, storageKey)) return settings[storageKey];
  if (option.fallbackStorageKey && Object.prototype.hasOwnProperty.call(settings, option.fallbackStorageKey)) {
    return settings[option.fallbackStorageKey];
  }
  if (tariffState?.isFree !== true && Object.prototype.hasOwnProperty.call(option, 'paidDefaultValue')) {
    return option.paidDefaultValue;
  }
  return option.defaultValue;
}

function getOptionByStorageKey(storageKey) {
  for (const categoryId in featuresConfig) {
    const category = featuresConfig[categoryId];
    for (const optionId in category.options) {
      const option = category.options[optionId];
      const key = option.storageKey || `${categoryId}_${optionId}`;
      if (key === storageKey) return option;
    }
  }
  return null;
}

function getBooleanOptionValue(settings, storageKey, fallback = false) {
  const option = getOptionByStorageKey(storageKey);
  if (option) return !!getOptionValue(settings || {}, storageKey, option);
  if (settings && Object.prototype.hasOwnProperty.call(settings, storageKey)) return !!settings[storageKey];
  return !!fallback;
}

function isSafeModeEnabled(settings) {
  return getBooleanOptionValue(settings, SAFE_MODE_STORAGE_KEY, false);
}

function isMiniBrowserFrameBrowserEnabled(settings) {
  if (isSafeModeEnabled(settings)) return false;
  return (
    getBooleanOptionValue(settings, MINI_BROWSER_ENABLED_STORAGE_KEY, false)
    || getBooleanOptionValue(settings, MINI_BROWSER_SIDE_PANEL_BROWSER_STORAGE_KEY, false)
  );
}

function syncMiniBrowserRuntimeFlags(settings) {
  miniBrowserSidePanelEnabled = getBooleanOptionValue(settings, MINI_BROWSER_SIDE_PANEL_BROWSER_STORAGE_KEY, false);
}

function isOptionEnabled(option, value, settings) {
  if (isSafeModeEnabled(settings) && option.storageKey !== SAFE_MODE_STORAGE_KEY) return false;
  if (option.enabledWhenAnyOf?.length) {
    return option.enabledWhenAnyOf.some((storageKey) => getBooleanOptionValue(settings || {}, storageKey, true));
  }
  if (option.type === 'browserTabs') {
    return true;
  }
  return !!value;
}

function detectTaptopFreePlanInPage() {
  const PENDING_TIMEOUT = 2500;
  const RETRY_DELAY = 150;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function detectFromRuntime() {
    try {
      const chunk = window.rspackChunktaptop_design_editor;
      if (!chunk || typeof chunk.push !== 'function') return null;

      let runtimeRequire = null;
      const chunkId = `tt-enhancer-tariff-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      chunk.push([[chunkId], {}, (req) => {
        runtimeRequire = req;
      }]);

      const runtime = runtimeRequire?.(87621)?.A;
      const hasSiteFlag = typeof runtime?.isSitePaid === 'boolean';
      if (!hasSiteFlag) return null;

      const teamInfo = runtime?.teamInfo || null;
      const hasTeamInfoFlag = typeof teamInfo?.isTeamPaid === 'boolean';
      const isSitePaid = runtime.isSitePaid === true;
      const isTeamPaid = runtime.isTeamPaid === true || teamInfo?.isTeamPaid === true;

      if (isSitePaid || isTeamPaid) {
        return {
          isFree: false,
          source: 'runtime',
          isSitePaid,
          isTeamPaid,
          teamInfoLoaded: !!teamInfo
        };
      }

      if (!hasTeamInfoFlag) {
        return {
          isFree: false,
          source: 'runtime-pending',
          pending: true,
          isSitePaid: false,
          isTeamPaid: false,
          teamInfoLoaded: false
        };
      }

      return {
        isFree: true,
        source: 'runtime',
        isSitePaid: false,
        isTeamPaid: false,
        teamInfoLoaded: true
      };
    } catch {
      return null;
    }
  }

  function detectFromEmbedWidget() {
    try {
      const items = Array.from(document.querySelectorAll('.tt-widgets__list .tt-widgets__item, .tt-widgets__item'));
      const embedItem = items.find((item) => {
        const name = String(item.querySelector('.tt-widgets__name')?.textContent || '').trim();
        const hasEmbedIcon = Array.from(item.querySelectorAll('use')).some((use) => {
          const href = use.getAttribute('href') || use.getAttribute('xlink:href') || '';
          return href.includes('medium-widgets-embed');
        });
        return name === 'Embed' || hasEmbedIcon;
      });
      if (!embedItem) return null;

      const embedDisabled = embedItem.classList.contains('is-disabled') || embedItem.getAttribute('aria-disabled') === 'true';
      return {
        isFree: embedDisabled,
        source: 'embed-widget',
        embedDisabled
      };
    } catch {
      return null;
    }
  }

  function detectOnce() {
    const runtimeState = detectFromRuntime();
    if (runtimeState?.pending) return runtimeState;
    return runtimeState || detectFromEmbedWidget() || { isFree: false, source: 'unknown' };
  }

  return (async () => {
    const startedAt = Date.now();
    let state = detectOnce();

    while (state?.pending && Date.now() - startedAt < PENDING_TIMEOUT) {
      await sleep(RETRY_DELAY);
      state = detectOnce();
    }

    return state || { isFree: false, source: 'unknown' };
  })();
}

async function getTabTariffState(tabId) {
  if (!chrome.scripting?.executeScript) return { isFree: false, source: 'unavailable' };

  try {
    const frames = await safeExecuteScript({
      target: { tabId },
      world: 'MAIN',
      func: detectTaptopFreePlanInPage
    });
    if (!frames) return { isFree: false, source: 'tab-unavailable' };
    return frames?.[0]?.result || { isFree: false, source: 'empty' };
  } catch (e) {
    if (isIgnorableTabError(e)) return { isFree: false, source: 'tab-unavailable' };
    console.warn('Taptop Enhancer tariff detection error:', e);
    return { isFree: false, source: 'error' };
  }
}

function isOptionDisabledByFreePlan(option, tariffState) {
  return tariffState?.isFree === true && option.disabledOnFreePlan === true;
}

function getFreePlanDisabledOptions() {
  const result = [];
  for (const categoryId in featuresConfig) {
    const category = featuresConfig[categoryId];
    for (const optionId in category.options) {
      const option = category.options[optionId];
      if (!option.disabledOnFreePlan) continue;

      const fullId = categoryId + '_' + optionId;
      const storageKey = option.storageKey || fullId;
      result.push({ option, storageKey });
    }
  }
  return result;
}

function getPaidPlanRestoreValue(option) {
  if (Object.prototype.hasOwnProperty.call(option, 'paidDefaultValue')) return option.paidDefaultValue;
  if (Object.prototype.hasOwnProperty.call(option, 'defaultValue')) return option.defaultValue;
  return true;
}

async function restorePaidPlanOptionDefaults(settings, tariffState) {
  if (tariffState?.isFree === true) return settings || {};

  try {
    const local = await readLocalStorage({ [FREE_PLAN_PAID_RESTORE_DONE_KEY]: false });
    if (local[FREE_PLAN_PAID_RESTORE_DONE_KEY]) return settings || {};

    const patch = {};
    getFreePlanDisabledOptions().forEach(({ option, storageKey }) => {
      if (settings?.[storageKey] === false) patch[storageKey] = getPaidPlanRestoreValue(option);
    });

    if (Object.keys(patch).length) {
      await writeSyncStorage(patch);
    }

    await writeLocalStorage({ [FREE_PLAN_PAID_RESTORE_DONE_KEY]: true });
    return Object.keys(patch).length ? { ...(settings || {}), ...patch } : settings || {};
  } catch (e) {
    console.warn('Taptop Enhancer paid plan restore error:', e);
    return settings || {};
  }
}

// ============= Отслеживание состояния вкладок =============

const tabState = new Map(); // tabId -> { applied: Set<string>, pendingReload: boolean }
const pendingReloadKey = (tabId) => `tt_pending_reload_${tabId}`;
const miniBrowserHosts = new Set();

function isCmsUrl(url) {
  try {
    const parsed = new URL(url || '');
    return /^https?:$/.test(parsed.protocol) && /^\/-\/cms(?:\/|$)/.test(parsed.pathname);
  } catch (e) {
    return false;
  }
}

function isCatalogUrl(url) {
  try {
    const parsed = new URL(url || '');
    return parsed.hostname === 'localhost' ||
           parsed.hostname === '127.0.0.1' ||
           parsed.hostname === 'test' ||
           parsed.hostname === 'test.local' ||
           parsed.hostname === 'servbay.host' ||
           parsed.hostname.includes('catalog') ||
           parsed.hostname.includes('taptop-catalog') ||
           parsed.hostname.includes('tthelper-catalog') ||
           parsed.pathname.includes('catalog') ||
           parsed.pathname.includes('taptop-catalog') ||
           parsed.pathname.includes('tt-catalog') ||
           parsed.protocol === 'chrome-extension:';
  } catch (e) {
    return false;
  }
}

function updateActionForTab(tabId, url) {
  if (!chrome.action || typeof tabId !== 'number') return;

  const isCms = isCmsUrl(url);
  const isCatalog = isCatalogUrl(url);
  
  if (isCms) {
    chrome.action.enable(tabId);
    chrome.action.setTitle({ tabId, title: 'TapTop Helper' });
  } else if (isCatalog) {
    chrome.action.enable(tabId);
    chrome.action.setTitle({ tabId, title: 'Каталог виджетов TapTop Helper' });
  } else {
    chrome.action.disable(tabId);
    chrome.action.setTitle({ tabId, title: 'TapTop Helper работает только на страницах /-/cms' });
  }
}

function markApplied(tabId, key) {
  const s = tabState.get(tabId) || { applied: new Set(), pendingReload: false };
  s.applied.add(key);
  tabState.set(tabId, s);
}

function markRemoved(tabId, key) {
  const s = tabState.get(tabId) || { applied: new Set(), pendingReload: false };
  s.applied.delete(key);
  tabState.set(tabId, s);
}

function setPendingReload(tabId, val) {
  const s = tabState.get(tabId) || { applied: new Set(), pendingReload: false };
  s.pendingReload = !!val;
  tabState.set(tabId, s);
  chrome.storage.local.set({ [pendingReloadKey(tabId)]: !!val });
}

function getState(tabId) {
  return tabState.get(tabId) || { applied: new Set(), pendingReload: false };
}

async function openMiniBrowserSidePanel(req, sender, sendResponse) {
  const url = String(req?.url || '').trim();
  const projectSiteUrl = String(req?.projectSiteUrl || '').trim();
  if (!chrome.sidePanel?.open) {
    sendResponse?.({ ok: false, error: 'Side Panel API недоступен' });
    return;
  }
  if (!miniBrowserSidePanelEnabled) {
    sendResponse?.({ ok: false, error: 'Браузер правой панели отключен в настройках TapTop Helper' });
    return;
  }

  try {
    if (!sender.tab?.windowId) {
      sendResponse?.({ ok: false, error: 'Не удалось определить окно Chrome для Side Panel' });
      return;
    }

    // Важно: open() должен выполняться как можно ближе к клику пользователя.
    // Любой await до него может сбросить user activation в Chrome.
    const openPromise = chrome.sidePanel.open({ windowId: sender.tab.windowId });

    if (url || projectSiteUrl) {
      await chrome.storage.session.set({
        ttMiniBrowserSidePanel: {
          url,
          title: String(req.title || url),
          projectSiteUrl,
          updatedAt: Date.now()
        }
      });
    }

    await openPromise;
    sendResponse?.({ ok: true });
  } catch (e) {
    console.warn('Taptop Enhancer side panel open error:', e);
    sendResponse?.({ ok: false, error: e?.message || String(e) });
  }
}

function openMiniBrowserSidePanelLast(req, sender, sendResponse) {
  openMiniBrowserSidePanel({ url: '', projectSiteUrl: req?.projectSiteUrl || '' }, sender, sendResponse);
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function getMiniBrowserPageTitle(req, sendResponse) {
  const url = String(req?.url || '').trim();
  if (!/^https?:\/\//i.test(url)) {
    sendResponse?.({ ok: false });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      cache: 'no-cache',
      credentials: 'omit',
      headers: { Range: 'bytes=0-131071' },
      signal: controller.signal
    });
    const html = await response.text();
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = decodeHtmlEntities(match?.[1] || '').replace(/\s+/g, ' ').trim().slice(0, 140);
    sendResponse?.({ ok: !!title, title });
  } catch (e) {
    sendResponse?.({ ok: false, error: e?.message || String(e) });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeAiProvider(value) {
  return value === 'openrouter' || value === 'openai-compatible' || value === 'puter' ? value : AI_DEFAULT_PROVIDER;
}

function normalizeGeminiModel(value) {
  const model = String(value || AI_GEMINI_DEFAULT_MODEL)
    .trim()
    .replace(/^models\//, '');

  if (model === 'gemini-2.5-flash-image-preview') return AI_GEMINI_DEFAULT_IMAGE_MODEL;
  if (!/^[a-z0-9._:-]+$/i.test(model)) return AI_GEMINI_DEFAULT_MODEL;
  return model || AI_GEMINI_DEFAULT_MODEL;
}

function normalizeOpenRouterModel(value) {
  const model = String(value || AI_OPENROUTER_DEFAULT_MODEL).trim();
  if (!/^[a-z0-9._:/+-]+$/i.test(model)) return AI_OPENROUTER_DEFAULT_MODEL;
  return model || AI_OPENROUTER_DEFAULT_MODEL;
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

function normalizeOpenAiCompatibleModel(value) {
  const model = String(value || AI_OPENAI_COMPATIBLE_DEFAULT_MODEL).trim().replace(/^models\//, '');
  if (!/^[a-z0-9._:/+@=-]+$/i.test(model)) return AI_OPENAI_COMPATIBLE_DEFAULT_MODEL;
  return model || AI_OPENAI_COMPATIBLE_DEFAULT_MODEL;
}

function isZeroOpenRouterPrice(value) {
  const raw = String(value ?? '').trim();
  return raw !== '' && Number(raw) === 0;
}

function isFreeOpenRouterModel(model) {
  const id = String(model?.id || '').trim();
  const pricing = model?.pricing || {};
  return (
    id === AI_OPENROUTER_DEFAULT_MODEL ||
    id.endsWith(':free') ||
    (
      isZeroOpenRouterPrice(pricing.prompt) &&
      isZeroOpenRouterPrice(pricing.completion) &&
      (pricing.request === undefined || isZeroOpenRouterPrice(pricing.request))
    )
  );
}

function normalizeOpenRouterModelOption(model) {
  const id = String(model?.id || '').trim();
  if (!id || normalizeOpenRouterModel(id) !== id) return null;
  return {
    value: id,
    label: `OpenRouter - ${id}`,
    tier: 'free',
    name: String(model?.name || '').trim().slice(0, 140),
    contextLength: Number(model?.context_length || model?.top_provider?.context_length || 0) || 0
  };
}

function normalizeOpenRouterFreeModels(models) {
  const byValue = new Map();
  const add = (item) => {
    if (!item?.value || byValue.has(item.value)) return;
    byValue.set(item.value, item);
  };

  add({
    value: AI_OPENROUTER_DEFAULT_MODEL,
    label: `OpenRouter - ${AI_OPENROUTER_DEFAULT_MODEL}`,
    tier: 'free'
  });

  (models || [])
    .filter(isFreeOpenRouterModel)
    .map(normalizeOpenRouterModelOption)
    .filter(Boolean)
    .forEach(add);

  return Array.from(byValue.values());
}

async function readOpenRouterFreeModelsCache() {
  try {
    const items = await readLocalStorage({ [AI_OPENROUTER_FREE_MODELS_CACHE_KEY]: null });
    const cache = items?.[AI_OPENROUTER_FREE_MODELS_CACHE_KEY];
    if (!cache || !Array.isArray(cache.models)) return null;
    return cache;
  } catch {
    return null;
  }
}

async function fetchOpenRouterFreeModels(force = false) {
  const cached = await readOpenRouterFreeModelsCache();
  const now = Date.now();
  if (!force && cached?.fetchedAt && now - cached.fetchedAt < AI_OPENROUTER_MODELS_CACHE_TTL_MS) {
    return {
      models: cached.models,
      fetchedAt: cached.fetchedAt,
      fromCache: true
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models?output_modalities=text', {
        cache: 'no-cache',
        credentials: 'omit',
        signal: controller.signal
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data?.data)) {
        throw new Error(data?.error?.message || `OpenRouter models API ${response.status}`);
      }

      const models = normalizeOpenRouterFreeModels(data.data);
      const fetchedAt = Date.now();
      await writeLocalStorage({
        [AI_OPENROUTER_FREE_MODELS_CACHE_KEY]: {
          fetchedAt,
          models
        }
      });
      return {
        models,
        fetchedAt,
        fromCache: false
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    if (cached?.models?.length) {
      return {
        models: cached.models,
        fetchedAt: cached.fetchedAt || 0,
        fromCache: true,
        stale: true
      };
    }
    throw error;
  }
}

function isGeminiImageModel(model) {
  return /image|imagen/i.test(String(model || ''));
}

function normalizeGeminiTextPart(value, maxLength = 120000) {
  return String(value || '').slice(0, maxLength);
}

function normalizeGeminiInlineDataPart(part) {
  const inlineData = part?.inlineData || part?.inline_data;
  const mimeType = String(inlineData?.mimeType || inlineData?.mime_type || '').trim();
  const data = String(inlineData?.data || '').trim();
  if (!mimeType.startsWith('image/') || !data) return null;
  if (data.length > Math.ceil(AI_GEMINI_MAX_INLINE_IMAGE_BYTES * 4 / 3) + 4096) return null;
  return {
    inlineData: {
      mimeType,
      data
    }
  };
}

function normalizeGeminiContents(contents) {
  if (!Array.isArray(contents)) return [];

  return contents.map((item) => {
    const role = item?.role === 'model' ? 'model' : 'user';
    const parts = Array.isArray(item?.parts) ? item.parts : [];
    return {
      role,
      parts: parts.map((part) => {
        const text = normalizeGeminiTextPart(part?.text);
        if (text) return { text };
        return normalizeGeminiInlineDataPart(part);
      }).filter(Boolean)
    };
  }).filter((item) => item.parts.length);
}

function extractGeminiResponseText(data) {
  const texts = [];
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  candidates.forEach((candidate) => {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    parts.forEach((part) => {
      if (typeof part?.text === 'string') texts.push(part.text);
    });
  });
  return texts.join('\n').trim();
}

function extractGeminiResponseImages(data) {
  const images = [];
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  candidates.forEach((candidate) => {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    parts.forEach((part) => {
      const inlineData = part?.inlineData || part?.inline_data;
      const mimeType = String(inlineData?.mimeType || inlineData?.mime_type || '').trim();
      const imageData = String(inlineData?.data || '').trim();
      if (!mimeType.startsWith('image/') || !imageData) return;
      images.push({
        mimeType,
        data: imageData,
        dataUrl: `data:${mimeType};base64,${imageData}`
      });
    });
  });
  return images;
}

function normalizeOpenRouterContentPart(part) {
  const text = normalizeGeminiTextPart(part?.text);
  if (text) return { type: 'text', text };

  const inlineData = normalizeGeminiInlineDataPart(part);
  const mimeType = inlineData?.inlineData?.mimeType || '';
  const data = inlineData?.inlineData?.data || '';
  if (!mimeType || !data) return null;
  return {
    type: 'image_url',
    image_url: {
      url: `data:${mimeType};base64,${data}`
    }
  };
}

function normalizeOpenRouterMessages(contents, systemInstruction = '') {
  const messages = [];
  const systemText = normalizeGeminiTextPart(systemInstruction, 60000);
  if (systemText) {
    messages.push({ role: 'system', content: systemText });
  }

  if (!Array.isArray(contents)) return messages;

  contents.forEach((item) => {
    const role = item?.role === 'model' || item?.role === 'assistant' ? 'assistant' : 'user';
    const parts = Array.isArray(item?.parts) ? item.parts.map(normalizeOpenRouterContentPart).filter(Boolean) : [];
    if (!parts.length) return;
    messages.push({
      role,
      content: parts.length === 1 && parts[0].type === 'text' ? parts[0].text : parts
    });
  });

  return messages;
}

function openRouterContentText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => {
    if (typeof part === 'string') return part;
    if (typeof part?.text === 'string') return part.text;
    return '';
  }).filter(Boolean).join('\n');
}

function extractOpenRouterResponseText(data) {
  const texts = [];
  const choices = Array.isArray(data?.choices) ? data.choices : [];
  choices.forEach((choice) => {
    const text = openRouterContentText(choice?.message?.content || choice?.text || '');
    if (text) texts.push(text);
  });
  return texts.join('\n').trim();
}

function extractOpenRouterResponseImages(data) {
  const images = [];
  const addImageUrl = (url) => {
    const dataUrl = String(url || '').trim();
    if (!/^data:image\//i.test(dataUrl)) return;
    const mimeType = dataUrl.split(';')[0].replace(/^data:/i, '') || 'image/png';
    images.push({
      mimeType,
      dataUrl
    });
  };

  const choices = Array.isArray(data?.choices) ? data.choices : [];
  choices.forEach((choice) => {
    const message = choice?.message || {};
    (Array.isArray(message.images) ? message.images : []).forEach((image) => {
      addImageUrl(image?.image_url?.url || image?.imageUrl?.url || image?.url);
    });

    const content = message.content;
    if (Array.isArray(content)) {
      content.forEach((part) => {
        addImageUrl(part?.image_url?.url || part?.imageUrl?.url || part?.url);
      });
    }
  });

  return images;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function inferImageMimeType(url, fallback = '') {
  const type = String(fallback || '').split(';')[0].trim().toLowerCase();
  if (type.startsWith('image/')) return type;
  const path = String(url || '').split(/[?#]/)[0].toLowerCase();
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.gif')) return 'image/gif';
  return 'image/png';
}

async function fetchGeminiImageData(req, sendResponse) {
  const rawUrl = String(req?.url || '').trim();
  let url = null;
  try {
    url = new URL(rawUrl);
  } catch {
    sendResponse?.({ ok: false, error: 'Некорректный URL изображения' });
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    sendResponse?.({ ok: false, error: 'Поддерживаются только http/https изображения' });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url.href, {
      cache: 'no-cache',
      credentials: 'include',
      signal: controller.signal
    });
    if (!response.ok) {
      sendResponse?.({ ok: false, error: `Не удалось загрузить изображение: ${response.status}` });
      return;
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > AI_GEMINI_MAX_INLINE_IMAGE_BYTES) {
      sendResponse?.({ ok: false, error: 'Изображение слишком большое для отправки в Gemini' });
      return;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > AI_GEMINI_MAX_INLINE_IMAGE_BYTES) {
      sendResponse?.({ ok: false, error: 'Изображение слишком большое для отправки в Gemini' });
      return;
    }

    const mimeType = inferImageMimeType(url.href, response.headers.get('content-type') || '');
    const data = arrayBufferToBase64(buffer);
    sendResponse?.({
      ok: true,
      result: {
        mimeType,
        data,
        dataUrl: `data:${mimeType};base64,${data}`
      }
    });
  } catch (error) {
    const isAbort = error?.name === 'AbortError';
    sendResponse?.({
      ok: false,
      error: isAbort ? 'Изображение не загрузилось за 20 секунд' : (error?.message || String(error))
    });
  } finally {
    clearTimeout(timeout);
  }
}

function formatGeminiError(status, data, raw, model) {
  const apiError = data?.error || {};
  const code = apiError.code || status || '';
  const reason = String(apiError.status || '').trim();
  const message = String(apiError.message || raw || `Gemini API error ${status}`).trim();
  const prefix = `Gemini API ${code}${reason ? ` ${reason}` : ''}`;
  const normalizedMessage = message.toLowerCase();
  const hints = [];

  if (normalizedMessage.includes('quota exceeded') || reason === 'RESOURCE_EXHAUSTED') {
    hints.push(
      `У проекта нет доступной квоты для модели ${model}.`,
      'Для free tier это может означать лимит 0 именно на эту модель.',
      'Попробуйте gemini-2.5-flash, gemini-2.5-flash-lite или gemini-2.0-flash.',
      'Квоты считаются по Google project, а не по отдельному API key.'
    );
  } else if (status === 403 || reason === 'PERMISSION_DENIED' || normalizedMessage.includes('denied access')) {
    hints.push(
      'Google отказал проекту, к которому привязан этот API key.',
      'Это не ошибка выбранного слоя и не проблема сохранения ключа в расширении.',
      'Попробуйте создать новый Project/API key в Google AI Studio или выбрать другой ключ из проекта без блокировки.',
      'Если новый ключ из того же проекта тоже отвечает так же, проверьте Usage/Rate limit/Billing или обратитесь в поддержку Google.'
    );
  } else if (status === 400 || reason === 'INVALID_ARGUMENT') {
    hints.push('Проверьте модель и формат запроса.');
  } else if (status === 404 || reason === 'NOT_FOUND') {
    hints.push(
      `Модель ${model} не найдена для выбранной версии Gemini API.`,
      'Для image-режима используйте gemini-2.5-flash-image или gemini-3.1-flash-image.',
      'Если модель выбрана верно, проверьте доступность модели для проекта и региона в Google AI Studio.'
    );
  } else if (status === 429) {
    hints.push('Похоже на лимит запросов или квоту проекта.');
  } else if (status === 401 || reason === 'UNAUTHENTICATED') {
    hints.push('Проверьте, что API key скопирован полностью и без лишних пробелов.');
  }

  return {
    error: [prefix, message, ...hints].filter(Boolean).join('\n'),
    status,
    model,
    geminiStatus: reason,
    geminiMessage: message
  };
}

function formatOpenRouterError(status, data, raw, model) {
  const apiError = data?.error || {};
  const code = apiError.code || status || '';
  const message = String(apiError.message || raw || `OpenRouter API error ${status}`).trim();
  const prefix = `OpenRouter API ${code}`;
  const normalizedMessage = message.toLowerCase();
  const hints = [];

  if (status === 401) {
    hints.push('Проверьте, что OpenRouter API key скопирован полностью и без лишних пробелов.');
  } else if (status === 402) {
    hints.push('На OpenRouter не хватает credits для выбранной модели.');
  } else if (status === 404) {
    hints.push(`Модель ${model} не найдена в OpenRouter. Проверьте model id на странице Models.`);
  } else if (status === 429) {
    hints.push('Похоже на лимит запросов OpenRouter или выбранного провайдера.');
  } else if (status === 400 || status === 422 || normalizedMessage.includes('model')) {
    hints.push('Проверьте модель OpenRouter и формат запроса.');
  }

  return {
    error: [prefix, message, ...hints].filter(Boolean).join('\n'),
    status,
    model,
    openRouterMessage: message
  };
}

async function generateOpenRouterContent(req, sendResponse) {
  try {
    const payload = req?.payload || {};
    const settings = await readSyncStorage({
      [AI_OPENROUTER_API_KEY_STORAGE_KEY]: '',
      [AI_OPENROUTER_MODEL_STORAGE_KEY]: AI_OPENROUTER_DEFAULT_MODEL
    });
    const apiKey = String(settings[AI_OPENROUTER_API_KEY_STORAGE_KEY] || '').trim();
    if (!apiKey) {
      sendResponse?.({ ok: false, error: 'Добавьте OpenRouter API key в настройках AI чата' });
      return;
    }

    const model = normalizeOpenRouterModel(payload.model || settings[AI_OPENROUTER_MODEL_STORAGE_KEY]);
    const messages = normalizeOpenRouterMessages(payload.contents, payload.systemInstruction);
    if (!messages.some((message) => message.role !== 'system')) {
      sendResponse?.({ ok: false, error: 'Пустой запрос к OpenRouter' });
      return;
    }

    const body = {
      model,
      messages
    };
    if (payload.maxTokens !== undefined || payload.max_tokens !== undefined) {
      const maxTokens = Number(payload.maxTokens ?? payload.max_tokens);
      if (Number.isFinite(maxTokens) && maxTokens > 0) {
        body.max_tokens = Math.min(65536, Math.max(1, Math.round(maxTokens)));
      }
    }
    if (Array.isArray(payload.modalities) && payload.modalities.length) {
      body.modalities = payload.modalities
        .map((item) => String(item || '').trim())
        .filter((item) => item === 'image' || item === 'text');
    }

    const timeoutMs = Math.min(120000, Math.max(10000, Number(payload.timeoutMs || 60000) || 60000));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let data = null;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://taptop.pro',
          'X-OpenRouter-Title': 'TapTop Helper'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const raw = await response.text();
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        sendResponse?.({
          ok: false,
          ...formatOpenRouterError(response.status, data, raw, model)
        });
        return;
      }
    } finally {
      clearTimeout(timeout);
    }

    const text = extractOpenRouterResponseText(data);
    const images = extractOpenRouterResponseImages(data);
    sendResponse?.({
      ok: true,
      result: {
        model: data?.model || model,
        text,
        images,
        data
      }
    });
  } catch (error) {
    const isAbort = error?.name === 'AbortError';
    sendResponse?.({
      ok: false,
      error: isAbort ? 'OpenRouter не ответил за отведённое время' : (error?.message || String(error))
    });
  }
}

function getOpenAiCompatibleCompletionsEndpoint(baseUrl) {
  let url = baseUrl;
  if (url.endsWith('/models')) {
    url = url.substring(0, url.length - '/models'.length);
  }
  return url.endsWith('/chat/completions') ? url : `${url}/chat/completions`;
}

function getOpenAiCompatibleModelsEndpoint(baseUrl) {
  let url = baseUrl;
  if (url.endsWith('/chat/completions')) {
    url = url.substring(0, url.length - '/chat/completions'.length);
  }
  return url.endsWith('/models') ? url : `${url}/models`;
}

async function fetchOpenAiCompatibleModels(baseUrl, apiKey) {
  const endpoint = getOpenAiCompatibleModelsEndpoint(baseUrl);
  const headers = {
    'Accept': 'application/json'
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Сервер вернул статус ${response.status}`);
    }
    const data = await response.json();
    const models = Array.isArray(data?.data) ? data.data : [];
    return models.map((model) => ({
      id: model.id,
      name: model.id
    }));
  } finally {
    clearTimeout(timeout);
  }
}

function formatOpenAiCompatibleError(status, data, raw, model, baseUrl) {
  const apiError = data?.error || {};
  const code = apiError.code || status || '';
  const message = String(apiError.message || raw || `API error ${status}`).trim();
  const prefix = `OpenAI-compatible API ${code}`;
  const normalizedMessage = message.toLowerCase();
  const hints = [];

  if (status === 401) {
    hints.push('Проверьте, что API key скопирован полностью и без лишних пробелов.');
  } else if (status === 404) {
    hints.push(`Ресурс не найден. Проверьте правильность Base URL (${baseUrl}) и что модель (${model}) поддерживается провайдером.`);
  } else if (status === 429) {
    hints.push('Похоже на лимит запросов.');
  } else if (status === 400 || status === 422) {
    hints.push('Проверьте модель и формат запроса.');
  }

  return {
    error: [prefix, message, ...hints].filter(Boolean).join('\n'),
    status,
    model,
    apiMessage: message
  };
}

async function generateOpenAiCompatibleContent(req, sendResponse) {
  try {
    const payload = req?.payload || {};
    const settings = await readSyncStorage({
      [AI_OPENAI_COMPATIBLE_API_KEY_STORAGE_KEY]: '',
      [AI_OPENAI_COMPATIBLE_BASE_URL_STORAGE_KEY]: '',
      [AI_OPENAI_COMPATIBLE_MODEL_STORAGE_KEY]: AI_OPENAI_COMPATIBLE_DEFAULT_MODEL
    });
    const baseUrl = normalizeOpenAiCompatibleBaseUrl(payload.baseUrl || settings[AI_OPENAI_COMPATIBLE_BASE_URL_STORAGE_KEY]);
    if (!baseUrl) {
      sendResponse?.({ ok: false, error: 'Добавьте Base URL в настройках AI чата' });
      return;
    }
    const apiKey = String(settings[AI_OPENAI_COMPATIBLE_API_KEY_STORAGE_KEY] || '').trim();

    const model = normalizeOpenAiCompatibleModel(payload.model || settings[AI_OPENAI_COMPATIBLE_MODEL_STORAGE_KEY]);
    const messages = normalizeOpenRouterMessages(payload.contents, payload.systemInstruction);
    if (!messages.some((message) => message.role !== 'system')) {
      sendResponse?.({ ok: false, error: 'Пустой запрос к OpenAI-compatible' });
      return;
    }

    const body = {
      model,
      messages
    };
    if (payload.maxTokens !== undefined || payload.max_tokens !== undefined) {
      const maxTokens = Number(payload.maxTokens ?? payload.max_tokens);
      if (Number.isFinite(maxTokens) && maxTokens > 0) {
        body.max_tokens = Math.min(65536, Math.max(1, Math.round(maxTokens)));
      }
    }
    if (Array.isArray(payload.modalities) && payload.modalities.length) {
      body.modalities = payload.modalities
        .map((item) => String(item || '').trim())
        .filter((item) => item === 'image' || item === 'text');
    }

    const timeoutMs = Math.min(120000, Math.max(10000, Number(payload.timeoutMs || 60000) || 60000));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let data = null;

    const endpoint = getOpenAiCompatibleCompletionsEndpoint(baseUrl);

    const headers = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const raw = await response.text();
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        sendResponse?.({
          ok: false,
          ...formatOpenAiCompatibleError(response.status, data, raw, model, baseUrl)
        });
        return;
      }
    } finally {
      clearTimeout(timeout);
    }

    const text = extractOpenRouterResponseText(data);
    const images = extractOpenRouterResponseImages(data);
    sendResponse?.({
      ok: true,
      result: {
        model: data?.model || model,
        text,
        images,
        data
      }
    });
  } catch (error) {
    const isAbort = error?.name === 'AbortError';
    sendResponse?.({
      ok: false,
      error: isAbort ? 'Сервер не ответил за отведённое время' : (error?.message || String(error))
    });
  }
}

function generateAiContent(req, sendResponse) {
  const provider = normalizeAiProvider(req?.payload?.provider);
  if (provider === 'openrouter') {
    generateOpenRouterContent(req, sendResponse);
    return;
  }
  if (provider === 'openai-compatible') {
    generateOpenAiCompatibleContent(req, sendResponse);
    return;
  }
  if (provider === 'puter') {
    sendResponse?.({ ok: false, error: 'Puter.js выполняется в браузерном контексте AI панели' });
    return;
  }
  generateGeminiContent(req, sendResponse);
}

async function getAiModels(req, sendResponse) {
  const provider = normalizeAiProvider(req?.payload?.provider);
  if (provider === 'openai-compatible') {
    try {
      const payload = req?.payload || {};
      const settings = await readSyncStorage({
        [AI_OPENAI_COMPATIBLE_API_KEY_STORAGE_KEY]: '',
        [AI_OPENAI_COMPATIBLE_BASE_URL_STORAGE_KEY]: ''
      });
      const baseUrl = normalizeOpenAiCompatibleBaseUrl(payload.baseUrl || settings[AI_OPENAI_COMPATIBLE_BASE_URL_STORAGE_KEY]);
      if (!baseUrl) {
        sendResponse?.({ ok: true, result: { provider: 'openai-compatible', models: [] } });
        return;
      }
      const apiKey = String(settings[AI_OPENAI_COMPATIBLE_API_KEY_STORAGE_KEY] || '').trim();
      const models = await fetchOpenAiCompatibleModels(baseUrl, apiKey);
      sendResponse?.({
        ok: true,
        result: {
          provider: 'openai-compatible',
          models
        }
      });
    } catch (error) {
      sendResponse?.({
        ok: false,
        error: error?.message || 'Не удалось получить список моделей OpenAI-compatible'
      });
    }
    return;
  }
  if (provider !== 'openrouter') {
    sendResponse?.({
      ok: true,
      result: {
        provider,
        models: []
      }
    });
    return;
  }

  try {
    const result = await fetchOpenRouterFreeModels(req?.payload?.force === true);
    sendResponse?.({
      ok: true,
      result: {
        provider: 'openrouter',
        tier: 'free',
        models: result.models,
        fetchedAt: result.fetchedAt,
        fromCache: !!result.fromCache,
        stale: !!result.stale
      }
    });
  } catch (error) {
    sendResponse?.({
      ok: false,
      error: error?.message || 'Не удалось получить список моделей OpenRouter'
    });
  }
}

async function loadPuterSdkInSenderTab(req, sender, sendResponse) {
  const tabId = sender?.tab?.id;
  if (typeof tabId !== 'number') {
    sendResponse?.({ ok: false, error: 'Не удалось определить вкладку для загрузки Puter.js' });
    return;
  }

  const target = { tabId };
  if (Number.isInteger(sender?.frameId)) target.frameIds = [sender.frameId];

  const hasPuter = async () => {
    const result = await safeExecuteScript({
      target,
      world: 'MAIN',
      func: () => !!window.puter?.ai?.chat
    });
    return !!result?.[0]?.result;
  };

  try {
    await safeExecuteScript({
      target,
      world: 'MAIN',
      func: (requestSource, responseSource) => {
        try {
          window.PUTER_QUIET = true;
          if (window.puter) window.puter.quiet = true;
        } catch {}
        const originalFetch = window.fetch?.bind(window);
        if (!originalFetch && !window.__ttEnhancerPuterFetchProxyInstalled) return false;

        const bytesToBase64 = (bytes) => {
          let binary = '';
          const chunkSize = 0x8000;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
          }
          return btoa(binary);
        };

        const arrayBufferToBase64 = (buffer) => bytesToBase64(new Uint8Array(buffer));

        const serializeBody = async (body) => {
          if (!body) return null;
          if (typeof body === 'string') return { kind: 'text', value: body };
          if (body instanceof URLSearchParams) return { kind: 'text', value: body.toString() };
          if (body instanceof ArrayBuffer) return { kind: 'bytes', data: arrayBufferToBase64(body) };
          if (ArrayBuffer.isView(body)) {
            return { kind: 'bytes', data: bytesToBase64(new Uint8Array(body.buffer, body.byteOffset, body.byteLength)) };
          }
          if (body instanceof Blob) {
            return {
              kind: 'bytes',
              data: arrayBufferToBase64(await body.arrayBuffer()),
              type: body.type || ''
            };
          }
          if (body instanceof FormData) {
            const entries = [];
            for (const [name, value] of body.entries()) {
              if (value instanceof Blob) {
                entries.push({
                  name,
                  value: {
                    kind: 'file',
                    name: value.name || 'file',
                    type: value.type || 'application/octet-stream',
                    data: arrayBufferToBase64(await value.arrayBuffer())
                  }
                });
              } else {
                entries.push({ name, value: { kind: 'text', value: String(value) } });
              }
            }
            return { kind: 'formData', entries };
          }
          return { kind: 'text', value: String(body) };
        };

        const base64ToBytes = (value) => {
          const binary = atob(String(value || ''));
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
          }
          return bytes;
        };

        const requestViaExtension = (payload) => new Promise((resolve, reject) => {
          const id = 'puter_fetch_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
          let timer = 0;
          const cleanup = () => {
            clearTimeout(timer);
            window.removeEventListener('message', onMessage);
          };
          const onMessage = (event) => {
            if (event.source !== window) return;
            const message = event.data;
            if (!message || message.source !== responseSource || message.id !== id) return;
            cleanup();
            if (!message.ok) {
              reject(new Error(message.error || 'Puter proxy error'));
              return;
            }
            resolve(message.data || {});
          };
          timer = setTimeout(() => {
            cleanup();
            reject(new Error('Puter proxy не ответил'));
          }, 120000);
          window.addEventListener('message', onMessage);
          window.postMessage({
            source: requestSource,
            id,
            action: 'puterFetch',
            payload
          }, '*');
        });

        if (originalFetch && !window.__ttEnhancerPuterFetchProxyInstalled) {
          window.fetch = async (input, init = undefined) => {
            const request = input instanceof Request ? input : null;
            const rawUrl = request ? request.url : String(input || '');
            let parsed = null;
            try {
              parsed = new URL(rawUrl, location.href);
            } catch {
              return originalFetch(input, init);
            }
            if (parsed.protocol !== 'https:' || parsed.hostname !== 'api.puter.com') {
              return originalFetch(input, init);
            }

            const headers = new Headers(request ? request.headers : undefined);
            if (init?.headers) {
              new Headers(init.headers).forEach((value, key) => headers.set(key, value));
            }
            const method = String(init?.method || request?.method || 'GET').toUpperCase();
            let body = init && Object.prototype.hasOwnProperty.call(init, 'body') ? init.body : null;
            if (!body && request && method !== 'GET' && method !== 'HEAD') {
              try {
                body = await request.clone().blob();
              } catch {}
            }

            const result = await requestViaExtension({
              url: parsed.href,
              method,
              headers: Array.from(headers.entries()),
              body: await serializeBody(body)
            });
            return new Response(base64ToBytes(result.bodyBase64), {
              status: result.status || 200,
              statusText: result.statusText || '',
              headers: result.headers || []
            });
          };
          window.__ttEnhancerPuterFetchProxyInstalled = true;
        }

        const originalXMLHttpRequest = window.XMLHttpRequest;
        if (originalXMLHttpRequest && !window.__ttEnhancerPuterXhrProxyInstalled) {
          const isPuterApiUrl = (rawUrl) => {
            try {
              const parsed = new URL(String(rawUrl || ''), location.href);
              return parsed.protocol === 'https:' && parsed.hostname === 'api.puter.com';
            } catch {
              return false;
            }
          };

          const makeEvent = (type, target) => {
            let event = null;
            try {
              event = new Event(type);
            } catch {
              event = { type };
            }
            try {
              Object.defineProperty(event, 'target', { configurable: true, value: target });
              Object.defineProperty(event, 'currentTarget', { configurable: true, value: target });
            } catch {}
            return event;
          };

          const textFromBytes = (bytes) => {
            try {
              return new TextDecoder().decode(bytes);
            } catch {
              let text = '';
              for (let i = 0; i < bytes.length; i += 1) text += String.fromCharCode(bytes[i]);
              return text;
            }
          };

          window.XMLHttpRequest = function TtPuterXMLHttpRequest() {
            const xhr = new originalXMLHttpRequest();
            const native = {
              open: xhr.open.bind(xhr),
              send: xhr.send.bind(xhr),
              abort: xhr.abort.bind(xhr),
              setRequestHeader: xhr.setRequestHeader.bind(xhr),
              getResponseHeader: xhr.getResponseHeader.bind(xhr),
              getAllResponseHeaders: xhr.getAllResponseHeaders.bind(xhr),
              addEventListener: xhr.addEventListener.bind(xhr),
              removeEventListener: xhr.removeEventListener.bind(xhr)
            };
            const state = {
              isPuter: false,
              method: 'GET',
              url: '',
              headers: [],
              responseHeaders: [],
              listeners: new Map(),
              readyState: 0,
              status: 0,
              statusText: '',
              responseURL: '',
              responseType: '',
              response: null,
              responseText: '',
              timeout: 0,
              withCredentials: false,
              aborted: false,
              timer: 0
            };

            const listenersFor = (type) => {
              if (!state.listeners.has(type)) state.listeners.set(type, new Set());
              return state.listeners.get(type);
            };

            const emit = (type) => {
              const event = makeEvent(type, xhr);
              const handler = xhr['on' + type];
              if (typeof handler === 'function') {
                try {
                  handler.call(xhr, event);
                } catch (error) {
                  setTimeout(() => { throw error; }, 0);
                }
              }
              listenersFor(type).forEach((listener) => {
                try {
                  if (typeof listener === 'function') listener.call(xhr, event);
                  else listener?.handleEvent?.(event);
                } catch (error) {
                  setTimeout(() => { throw error; }, 0);
                }
              });
              return true;
            };

            const setReadyState = (readyState) => {
              state.readyState = readyState;
              emit('readystatechange');
            };

            const definePuterProperties = () => {
              const define = (key, descriptor) => {
                try {
                  Object.defineProperty(xhr, key, { configurable: true, ...descriptor });
                } catch {}
              };
              define('readyState', { get: () => state.readyState });
              define('status', { get: () => state.status });
              define('statusText', { get: () => state.statusText });
              define('responseURL', { get: () => state.responseURL });
              define('responseType', {
                get: () => state.responseType,
                set: (value) => {
                  state.responseType = String(value || '');
                }
              });
              define('response', { get: () => state.response });
              define('responseText', { get: () => state.responseText });
              define('timeout', {
                get: () => state.timeout,
                set: (value) => {
                  state.timeout = Math.max(0, Number(value || 0) || 0);
                }
              });
              define('withCredentials', {
                get: () => state.withCredentials,
                set: (value) => {
                  state.withCredentials = !!value;
                }
              });
            };

            xhr.addEventListener = function addEventListener(type, listener, options) {
              if (listener) listenersFor(String(type)).add(listener);
              return native.addEventListener(type, listener, options);
            };

            xhr.removeEventListener = function removeEventListener(type, listener, options) {
              listenersFor(String(type)).delete(listener);
              return native.removeEventListener(type, listener, options);
            };

            xhr.open = function open(method, url, async = true, user = undefined, password = undefined) {
              state.method = String(method || 'GET').toUpperCase();
              state.url = String(url || '');
              state.isPuter = isPuterApiUrl(state.url);
              if (!state.isPuter) {
                return native.open(method, url, async, user, password);
              }
              definePuterProperties();
              state.readyState = 1;
              emit('readystatechange');
              return undefined;
            };

            xhr.setRequestHeader = function setRequestHeader(name, value) {
              if (!state.isPuter) return native.setRequestHeader(name, value);
              state.headers.push([String(name || ''), String(value ?? '')]);
              return undefined;
            };

            xhr.getResponseHeader = function getResponseHeader(name) {
              if (!state.isPuter) return native.getResponseHeader(name);
              const wanted = String(name || '').toLowerCase();
              const item = state.responseHeaders.find(([key]) => String(key || '').toLowerCase() === wanted);
              return item ? item[1] : null;
            };

            xhr.getAllResponseHeaders = function getAllResponseHeaders() {
              if (!state.isPuter) return native.getAllResponseHeaders();
              return state.responseHeaders
                .map(([key, value]) => `${key}: ${value}`)
                .join('\r\n');
            };

            xhr.abort = function abort() {
              if (!state.isPuter) return native.abort();
              state.aborted = true;
              clearTimeout(state.timer);
              state.status = 0;
              state.statusText = '';
              setReadyState(4);
              emit('abort');
              emit('loadend');
              return undefined;
            };

            xhr.send = function send(body = null) {
              if (!state.isPuter) return native.send(body);
              state.aborted = false;
              if (state.timeout) {
                state.timer = setTimeout(() => {
                  if (state.readyState === 4) return;
                  state.aborted = true;
                  state.status = 0;
                  state.statusText = '';
                  setReadyState(4);
                  emit('timeout');
                  emit('loadend');
                }, state.timeout);
              }

              (async () => {
                try {
                  const result = await requestViaExtension({
                    url: new URL(state.url, location.href).href,
                    method: state.method,
                    headers: state.headers,
                    body: await serializeBody(body)
                  });
                  if (state.aborted) return;

                  clearTimeout(state.timer);
                  const bytes = base64ToBytes(result.bodyBase64 || '');
                  const headers = Array.isArray(result.headers) ? result.headers : [];
                  const contentType = String(
                    headers.find(([key]) => String(key || '').toLowerCase() === 'content-type')?.[1] || ''
                  );
                  const text = textFromBytes(bytes);
                  const responseType = String(state.responseType || '').toLowerCase();

                  state.status = Number(result.status || 200) || 200;
                  state.statusText = String(result.statusText || '');
                  state.responseURL = state.url;
                  state.responseHeaders = headers;
                  state.responseText = text;
                  if (responseType === 'arraybuffer') {
                    state.response = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
                  } else if (responseType === 'blob') {
                    state.response = new Blob([bytes], { type: contentType || '' });
                  } else if (responseType === 'json') {
                    try {
                      state.response = text ? JSON.parse(text) : null;
                    } catch {
                      state.response = null;
                    }
                  } else {
                    state.response = text;
                  }

                  setReadyState(2);
                  setReadyState(3);
                  emit('progress');
                  setReadyState(4);
                  emit('load');
                  emit('loadend');
                } catch (error) {
                  if (state.aborted) return;
                  clearTimeout(state.timer);
                  state.status = 0;
                  state.statusText = error?.message || 'Puter proxy error';
                  setReadyState(4);
                  emit('error');
                  emit('loadend');
                }
              })();
              return undefined;
            };

            return xhr;
          };

          try {
            window.XMLHttpRequest.prototype = originalXMLHttpRequest.prototype;
            Object.setPrototypeOf(window.XMLHttpRequest, originalXMLHttpRequest);
            ['UNSENT', 'OPENED', 'HEADERS_RECEIVED', 'LOADING', 'DONE'].forEach((key) => {
              window.XMLHttpRequest[key] = originalXMLHttpRequest[key];
            });
          } catch {}

          window.__ttEnhancerPuterXhrProxyInstalled = true;
        }

        const originalWebSocket = window.WebSocket;
        if (originalWebSocket && !window.__ttEnhancerPuterSocketGuardInstalled) {
          const isPuterSocketUrl = (rawUrl) => {
            try {
              const parsed = new URL(String(rawUrl || ''), location.href);
              return parsed.protocol === 'wss:' && parsed.hostname === 'api.puter.com' && parsed.pathname.includes('/socket.io/');
            } catch {
              return false;
            }
          };
          window.WebSocket = function TtPuterWebSocket(url, protocols) {
            if (!isPuterSocketUrl(url)) {
              return protocols === undefined ? new originalWebSocket(url) : new originalWebSocket(url, protocols);
            }
            const socket = new EventTarget();
            socket.url = String(url || '');
            socket.readyState = originalWebSocket.CLOSED || 3;
            socket.bufferedAmount = 0;
            socket.extensions = '';
            socket.protocol = '';
            socket.binaryType = 'blob';
            socket.close = () => {};
            socket.send = () => {
              throw new Error('Puter socket is disabled in TapTop Helper');
            };
            setTimeout(() => {
              const event = makeEvent('close', socket);
              if (typeof socket.onclose === 'function') socket.onclose(event);
              socket.dispatchEvent(event);
            }, 0);
            return socket;
          };
          try {
            window.WebSocket.prototype = originalWebSocket.prototype;
            Object.setPrototypeOf(window.WebSocket, originalWebSocket);
            ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach((key) => {
              window.WebSocket[key] = originalWebSocket[key];
            });
          } catch {}
          window.__ttEnhancerPuterSocketGuardInstalled = true;
        }

        return true;
      },
      args: ['tt-enhancer-ai-panel', 'tt-enhancer-ai-panel-bridge']
    });

    if (await hasPuter()) {
      sendResponse?.({ ok: true, result: { loaded: true, cached: true, proxied: true } });
      return;
    }

    const code = await fetchExternalCode(AI_PUTER_SDK_URL);
    await safeExecuteScript({
      target,
      world: 'MAIN',
      func: async (codeText, markKey, sourceUrl) => {
        if (window.puter?.ai?.chat) return true;
        if (!window[markKey]) {
          try {
            window.PUTER_QUIET = true;
          } catch {}
          const script = document.createElement('script');
          script.textContent = `${codeText}\n//# sourceURL=${sourceUrl}`;
          (document.head || document.documentElement).appendChild(script);
          script.remove();
          window[markKey] = true;
        }
        try {
          if (window.puter) window.puter.quiet = true;
        } catch {}
        const startedAt = Date.now();
        while (!window.puter?.ai?.chat && Date.now() - startedAt < 5000) {
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
        return !!window.puter?.ai?.chat;
      },
      args: [code, AI_PUTER_SDK_MARK_KEY, AI_PUTER_SDK_URL]
    });

    if (!(await hasPuter())) {
      sendResponse?.({ ok: false, error: 'Puter.js загрузился, но window.puter.ai.chat не появился' });
      return;
    }

    sendResponse?.({ ok: true, result: { loaded: true, cached: false } });
  } catch (error) {
    sendResponse?.({ ok: false, error: error?.message || String(error) });
  }
}

async function fetchPuterSdkCode(req, sendResponse) {
  try {
    const code = await fetchExternalCode(AI_PUTER_SDK_URL);
    sendResponse?.({
      ok: true,
      result: {
        code,
        sourceUrl: AI_PUTER_SDK_URL
      }
    });
  } catch (error) {
    sendResponse?.({ ok: false, error: error?.message || String(error) });
  }
}

function base64ToUint8Array(value) {
  const binary = atob(String(value || ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function deserializePuterRequestBody(body) {
  if (!body || typeof body !== 'object') return undefined;
  if (body.kind === 'text') return String(body.value || '');
  if (body.kind === 'bytes') return base64ToUint8Array(body.data || '');
  if (body.kind === 'formData') {
    const formData = new FormData();
    (Array.isArray(body.entries) ? body.entries : []).forEach((entry) => {
      if (!entry || !entry.name) return;
      if (entry.value?.kind === 'file') {
        const bytes = base64ToUint8Array(entry.value.data || '');
        const blob = new Blob([bytes], { type: entry.value.type || 'application/octet-stream' });
        formData.append(entry.name, blob, entry.value.name || 'file');
        return;
      }
      formData.append(entry.name, String(entry.value?.value ?? ''));
    });
    return formData;
  }
  return undefined;
}

function normalizePuterProxyHeaders(headers) {
  const result = {};
  (Array.isArray(headers) ? headers : []).forEach((pair) => {
    const name = String(pair?.[0] || '').trim();
    const value = String(pair?.[1] || '');
    if (!name || /^(host|origin|referer|content-length)$/i.test(name)) return;
    result[name] = value;
  });
  return result;
}

async function proxyPuterFetch(req, sendResponse) {
  const payload = req?.payload || {};
  let url = null;
  try {
    url = new URL(String(payload.url || ''));
  } catch {
    sendResponse?.({ ok: false, error: 'Некорректный URL Puter API' });
    return;
  }

  if (url.protocol !== 'https:' || url.hostname !== 'api.puter.com') {
    sendResponse?.({ ok: false, error: 'Puter proxy разрешает только https://api.puter.com' });
    return;
  }

  try {
    const method = String(payload.method || 'GET').toUpperCase();
    const body = deserializePuterRequestBody(payload.body);
    const response = await fetch(url.href, {
      method,
      headers: normalizePuterProxyHeaders(payload.headers),
      body: method === 'GET' || method === 'HEAD' ? undefined : body,
      credentials: 'include',
      cache: 'no-cache'
    });
    const buffer = await response.arrayBuffer();
    sendResponse?.({
      ok: true,
      result: {
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(response.headers.entries()),
        bodyBase64: arrayBufferToBase64(buffer)
      }
    });
  } catch (error) {
    sendResponse?.({ ok: false, error: error?.message || String(error) });
  }
}

async function generateGeminiContent(req, sendResponse) {
  try {
    const payload = req?.payload || {};
    const settings = await readSyncStorage({
      [AI_GEMINI_API_KEY_STORAGE_KEY]: '',
      [AI_GEMINI_MODEL_STORAGE_KEY]: AI_GEMINI_DEFAULT_MODEL
    });
    const apiKey = String(settings[AI_GEMINI_API_KEY_STORAGE_KEY] || '').trim();
    if (!apiKey) {
      sendResponse?.({ ok: false, error: 'Добавьте Gemini API key в настройках AI чата' });
      return;
    }

    const model = normalizeGeminiModel(payload.model || settings[AI_GEMINI_MODEL_STORAGE_KEY]);
    const contents = normalizeGeminiContents(payload.contents);
    if (!contents.length) {
      sendResponse?.({ ok: false, error: 'Пустой запрос к Gemini' });
      return;
    }

    const body = { contents };
    const systemText = normalizeGeminiTextPart(payload.systemInstruction, 60000);
    if (systemText) {
      body.system_instruction = {
        parts: [{ text: systemText }]
      };
    }
    if (payload.generationConfig && typeof payload.generationConfig === 'object') {
      body.generationConfig = payload.generationConfig;
    }

    const timeoutMs = Math.min(120000, Math.max(10000, Number(payload.timeoutMs || 60000) || 60000));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let data = null;

    try {
      const apiVersion = isGeminiImageModel(model) ? 'v1' : 'v1beta';
      const response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const raw = await response.text();
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        sendResponse?.({
          ok: false,
          ...formatGeminiError(response.status, data, raw, model)
        });
        return;
      }
    } finally {
      clearTimeout(timeout);
    }

    const text = extractGeminiResponseText(data);
    const images = extractGeminiResponseImages(data);
    sendResponse?.({
      ok: true,
      result: {
        model,
        text,
        images,
        data
      }
    });
  } catch (error) {
    const isAbort = error?.name === 'AbortError';
    sendResponse?.({
      ok: false,
      error: isAbort ? 'Gemini не ответил за отведённое время' : (error?.message || String(error))
    });
  }
}

// ============= Применение опций к вкладке =============

function applyFeatures(tabId) {
  chrome.storage.sync.get(null, async (settings) => {
    if (isSafeModeEnabled(settings)) {
      setPendingReload(tabId, false);
      return;
    }

    chrome.tabs.get(tabId, async (tab) => {
      const tabError = chrome.runtime.lastError;
      if (tabError) {
        if (!isIgnorableTabError(tabError)) console.warn('Taptop Enhancer tab get error:', tabError);
        return;
      }
      if (!tab || !isCmsUrl(tab.url)) return;

      try {
        const isReady = await waitForCmsEditorReady(tabId);
        if (!isReady) {
          console.warn('Taptop Enhancer: редактор TapTop не готов, фичи не применены');
          return;
        }

        await syncDnrRulesetsFromSettings(settings);
        await syncDynamicFrameRulesFromSettings(settings);
        await syncAiPanelCspRulesFromSettings(settings);

        const tariffState = await getTabTariffState(tabId);
        const effectiveSettings = await restorePaidPlanOptionDefaults(settings, tariffState);
        let needsReload = false;

        for (const categoryId in featuresConfig) {
          const category = featuresConfig[categoryId];
          for (const optionId in category.options) {
            const option = category.options[optionId];
            const fullId = categoryId + '_' + optionId;
            const storageKey = option.storageKey || fullId;
            const value = getOptionValueForTariff(effectiveSettings, storageKey, option, tariffState);
            let isOn = isOptionEnabled(option, value, effectiveSettings);
            if (isOptionDisabledByFreePlan(option, tariffState)) isOn = false;
            const key = storageKey;

            if (option.dnrRulesets && isOn) {
              await setDnrRulesets(option.dnrRulesets, true);
            }

            // CSS: управляемые style-теги (вставка/удаление)
            if (option.css && option.css.length) {
              await Promise.all(option.css.map((f) => (
                isOn ? addCssTag(tabId, f, key) : removeCssTag(tabId, f, key)
              )));
            }

            // JS: CSP-safe инъекция inline в MAIN
            if ((option.external_js && option.external_js.length) || (option.js && option.js.length)) {
              if (isOn) {
                await injectJsRespectingCSP(tabId, option.external_js || [], option.js || []);
              } else {
                if (option.deinit) {
                  const deFiles = Array.isArray(option.deinit) ? option.deinit : [option.deinit];
                  await injectJsRespectingCSP(tabId, [], deFiles);
                } else if (option.reloadRequired) {
                  needsReload = true;
                }
              }
            }

            if (option.isolated_js && option.isolated_js.length) {
              if (isOn) {
                await injectJsIsolated(tabId, option.isolated_js || []);
              } else if (option.isolated_deinit) {
                const deFiles = Array.isArray(option.isolated_deinit) ? option.isolated_deinit : [option.isolated_deinit];
                await injectJsIsolated(tabId, deFiles);
              } else if (option.reloadRequired) {
                needsReload = true;
              }
            }

            if (option.dnrRulesets && !isOn) {
              await setDnrRulesets(option.dnrRulesets, false);
            }

            if (isOn) markApplied(tabId, key); else markRemoved(tabId, key);
          }
        }

        setPendingReload(tabId, needsReload);
        console.log('Taptop Enhancer: состояние опций применено');
      } catch (error) {
        if (isIgnorableTabError(error)) return;
        console.warn('Taptop Enhancer applyFeatures error:', error);
      }
    });
  });
}

// Автоприменение при полной загрузке вкладки редактора
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab?.url || changeInfo.url) {
    updateActionForTab(tabId, tab?.url || changeInfo.url);
  }

  if (changeInfo.status === 'complete' && tab) {
    if (isCmsUrl(tab.url)) {
      applyFeatures(tabId);
      setPendingReload(tabId, false);
    } else if (isCatalogUrl(tab.url)) {
      injectJsIsolated(tabId, ["features/layers/cross-project-clipboard-bridge.js"]);
    }
  }

  if (miniBrowserHosts.has(tabId) && changeInfo.url) {
    miniBrowserHosts.delete(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  miniBrowserHosts.delete(tabId);
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    updateActionForTab(tabId, tab?.url);
  });
});

chrome.tabs.onCreated.addListener((tab) => {
  updateActionForTab(tab.id, tab.pendingUrl || tab.url);

  const openerTabId = tab.openerTabId;
  if (typeof openerTabId !== 'number' || !miniBrowserHosts.has(openerTabId)) return;

  const handleUrl = (url) => {
    if (!url || url === 'about:blank' || url.startsWith('chrome://')) return false;
    const sendPromise = chrome.tabs.sendMessage(openerTabId, {
      action: 'miniBrowserOpenUrl',
      url
    });
    sendPromise?.catch?.((error) => {
      if (!isIgnorableTabError(error)) console.warn('Taptop Enhancer mini browser opener message error:', error);
    });
    const removePromise = chrome.tabs.remove(tab.id);
    removePromise?.catch?.((error) => {
      if (!isIgnorableTabError(error)) console.warn('Taptop Enhancer mini browser created tab remove error:', error);
    });
    return true;
  };

  if (handleUrl(tab.pendingUrl || tab.url)) return;

  const listener = (createdTabId, changeInfo) => {
    if (createdTabId !== tab.id) return;
    if (!handleUrl(changeInfo.url)) return;
    chrome.tabs.onUpdated.removeListener(listener);
  };
  chrome.tabs.onUpdated.addListener(listener);
  setTimeout(() => chrome.tabs.onUpdated.removeListener(listener), 5000);
});

chrome.tabs.query({}, (tabs) => {
  if (chrome.runtime.lastError) return;
  tabs.forEach((tab) => {
    const url = tab.url || tab.pendingUrl;
    updateActionForTab(tab.id, url);
    if (typeof tab.id === 'number' && tab.status === 'complete') {
      if (isCmsUrl(url)) {
        applyFeatures(tab.id);
      } else if (isCatalogUrl(url)) {
        injectJsIsolated(tab.id, ["features/layers/cross-project-clipboard-bridge.js"]);
      }
    }
  });
});

// Сообщения popup ↔ background
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req && req.action === 'ttCrossProjectClipboardSave') {
    const payload = req.payload || {};
    if (!payload.raw) {
      sendResponse?.({ ok: false, error: 'empty-payload' });
      return false;
    }

    chrome.storage.local.set({
      [CROSS_PROJECT_CLIPBOARD_STORAGE_KEY]: {
        ...payload,
        savedAt: Number(payload.savedAt) || Date.now(),
        backgroundSavedAt: Date.now()
      }
    }, () => {
      const err = chrome.runtime.lastError;
      sendResponse?.(err ? { ok: false, error: err.message || String(err) } : { ok: true });
    });
    return true;
  }

  if (req && req.action === 'additionalWidgetsRequest') {
    handleAdditionalWidgetsRequest(req, sendResponse);
    return true;
  }
  if (req && req.action === 'applyFeatures' && typeof req.tabId === 'number') {
    applyFeatures(req.tabId);
  }
  if (req && req.action === 'requestDirtyState' && typeof req.tabId === 'number') {
    const s = getState(req.tabId);
    chrome.storage.local.get(pendingReloadKey(req.tabId), (stored) => {
      chrome.runtime.sendMessage({
        action: 'tabDirtyState',
        tabId: req.tabId,
        pendingReload: !!(s.pendingReload || stored[pendingReloadKey(req.tabId)])
      });
    });
  }
  if (req && req.action === 'setPendingReload' && typeof req.tabId === 'number') {
    setPendingReload(req.tabId, !!req.value);
  }
  if (req && req.action === 'registerMiniBrowserHost' && sender.tab?.id) {
    miniBrowserHosts.add(sender.tab.id);
  }
  if (req && req.action === 'unregisterMiniBrowserHost' && sender.tab?.id) {
    miniBrowserHosts.delete(sender.tab.id);
  }
  if (req && req.action === 'openMiniBrowserWindow' && req.url) {
    chrome.windows.create({
      url: req.url,
      type: 'popup',
      width: 1100,
      height: 820,
      focused: true
    });
  }
  if (req && req.action === 'openExternalTab' && req.url) {
    chrome.tabs.create({
      url: req.url,
      active: true
    });
  }
  if (req && req.action === 'getMiniBrowserPageTitle') {
    getMiniBrowserPageTitle(req, sendResponse);
    return true;
  }
  if (req && (req.action === 'ttAiGenerate' || req.action === 'ttAiGeminiGenerate')) {
    generateAiContent(req, sendResponse);
    return true;
  }
  if (req && req.action === 'ttAiGetModels') {
    getAiModels(req, sendResponse);
    return true;
  }
  if (req && req.action === 'ttAiGeminiFetchImage') {
    fetchGeminiImageData(req, sendResponse);
    return true;
  }
  if (req && req.action === 'ttAiPuterLoadSdk') {
    loadPuterSdkInSenderTab(req, sender, sendResponse);
    return true;
  }
  if (req && req.action === 'ttAiPuterFetchSdk') {
    fetchPuterSdkCode(req, sendResponse);
    return true;
  }
  if (req && req.action === 'ttAiPuterFetch') {
    proxyPuterFetch(req, sendResponse);
    return true;
  }
  if (req && req.action === 'openMiniBrowserSidePanel') {
    openMiniBrowserSidePanel(req, sender, sendResponse);
    return true;
  }
  if (req && req.action === 'openMiniBrowserSidePanelLast') {
    openMiniBrowserSidePanelLast(req, sender, sendResponse);
    return true;
  }
});
