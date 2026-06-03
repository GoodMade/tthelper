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

async function syncDvhPreloadContentScript(settings) {
  if (!chrome.scripting?.registerContentScripts) return;

  const option = featuresConfig.rightPanelInterface.options.dvhHeight;
  const storageKey = option.storageKey || 'rightPanelInterface_dvhHeight';
  const value = getOptionValue(settings || {}, storageKey, option);
  const shouldRegister = isOptionEnabled(option, value);

  try {
    const registered = await chrome.scripting.getRegisteredContentScripts({
      ids: [DVH_PRELOAD_CONTENT_SCRIPT_ID]
    });
    const isRegistered = registered.length > 0;

    if (shouldRegister && !isRegistered) {
      await chrome.scripting.registerContentScripts([{
        id: DVH_PRELOAD_CONTENT_SCRIPT_ID,
        matches: CMS_CONTENT_SCRIPT_MATCHES,
        js: ['features/units/dvh-preload.js'],
        runAt: 'document_start',
        world: 'MAIN'
      }]);
    } else if (!shouldRegister && isRegistered) {
      await chrome.scripting.unregisterContentScripts({
        ids: [DVH_PRELOAD_CONTENT_SCRIPT_ID]
      });
    }
  } catch (e) {
    console.warn('Taptop Enhancer dvh preload sync error:', e);
  }
}

// ============= Управление CSS (без перезагрузки) =============

function addCssTag(tabId, filePath, key) {
  const abs = chrome.runtime.getURL(filePath);
  chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: (href, id) => {
      if (document.querySelector(`style[data-tt-css="${id}"]`)) return;
      fetch(href, { credentials: 'omit' })
        .then(r => r.text())
        .then(css => {
          const s = document.createElement('style');
          s.setAttribute('data-tt-css', id);
          s.textContent = css;
          (document.head || document.documentElement).appendChild(s);
        })
        .catch(err => console.error('TT addCssTag error:', err));
    },
    args: [abs, key + '::' + filePath]
  });
}

function removeCssTag(tabId, filePath, key) {
  chrome.scripting.executeScript({
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
  const res = await fetch(url, { credentials: 'omit', cache: 'no-cache' });
  if (!res.ok) throw new Error('Failed to fetch ' + url);
  return await res.text();
}

function injectInlineJsMain(tabId, code, key, dedupe = true) {
  chrome.scripting.executeScript({
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

async function injectJsRespectingCSP(tabId, externalUrls, localFiles) {
  try {
    // 1) Внешние модули: грузим код в SW и инжектим inline в MAIN
    for (const url of (externalUrls || [])) {
      const code = await fetchExternalCode(url);
      // метка чтобы не дублировать
      const markKey = '__tt_enhancer_ext_inline__' + url;
      injectInlineJsMain(tabId, code, markKey, true);
    }
    // 2) Локальные файлы: вставляем как page-скрипт через текст
    for (const file of (localFiles || [])) {
      const abs = chrome.runtime.getURL(file);
      const code = await fetchExternalCode(abs);
      injectInlineJsMain(tabId, code, '', false);
    }
    console.log('Taptop Enhancer: внешние и локальные JS инжектированы inline (CSP-safe)');
  } catch (e) {
    console.error('Taptop Enhancer CSP-safe inject error:', e);
  }
}

async function injectJsIsolated(tabId, localFiles) {
  try {
    for (const file of (localFiles || [])) {
      const results = await chrome.scripting.executeScript({
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
      if (!results?.[0]?.result) continue;
      await chrome.scripting.executeScript({
        target: { tabId },
        world: 'ISOLATED',
        files: [file]
      });
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

function getAdditionalWidgetFileUrl(source, widgetName, fileName) {
  if (source.type === 'local') {
    throw new Error('Local widget file is not in remote source');
  }

  return source.type === 'folder'
    ? joinAdditionalWidgetFolderUrl(source.url, widgetName, fileName)
    : getAdditionalWidgetJsdelivrPathUrl(source, `${widgetName}/${fileName}`);
}

async function fetchAdditionalWidgetFileFromSource(source, widgetName, fileName) {
  return fetchAdditionalWidgetJson(getAdditionalWidgetFileUrl(source, widgetName, fileName));
}

async function loadAdditionalGithubWidgetList(source) {
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

  const items = await fetchAdditionalWidgetJson(getAdditionalWidgetGithubContentsUrl(source), {
    headers: { Accept: 'application/vnd.github+json' }
  });

  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item?.type === 'dir' && isValidAdditionalWidgetName(item.name))
    .map((item) => buildAdditionalWidgetEntry(source, item.name));
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
  if (!isValidAdditionalWidgetName(widgetName)) throw new Error('Invalid widget name');
  if (!ADDITIONAL_WIDGET_VALID_FILE_NAMES.has(fileName)) throw new Error('Invalid widget file');

  const source = await getAdditionalWidgetSourceById(payload?.sourceId || ADDITIONAL_WIDGET_DEFAULT_SOURCE.id);
  const cache = await readAdditionalWidgetCache();
  const cachedFile = getCachedAdditionalWidgetFile(cache[source.id], widgetName, fileName);
  if (cachedFile !== undefined) return cachedFile;

  await syncAdditionalWidgetSource(source);
  const freshCache = await readAdditionalWidgetCache();
  const freshFile = getCachedAdditionalWidgetFile(freshCache[source.id], widgetName, fileName);
  if (freshFile !== undefined) return freshFile;

  return fetchAdditionalWidgetFileFromSource(source, widgetName, fileName);
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
      const isOn = isOptionEnabled(option, value);

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
        if (!tab || tab.active === false || !tab.url) return;
        try {
          const host = new URL(tab.url).hostname;
          if (host && !hosts.includes(host)) hosts.push(host);
        } catch (e) {}
      });
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

chrome.storage.sync.get(null, (settings) => {
  syncDvhPreloadContentScript(settings);
  syncDnrRulesetsFromSettings(settings);
  syncDynamicFrameRulesFromSettings(settings);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return;
  if (!Object.prototype.hasOwnProperty.call(changes, 'units_dvhHeight')) return;

  chrome.storage.sync.get(null, (settings) => {
    syncDvhPreloadContentScript(settings);
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

function isOptionEnabled(option, value) {
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
    const frames = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: detectTaptopFreePlanInPage
    });
    return frames?.[0]?.result || { isFree: false, source: 'empty' };
  } catch (e) {
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

function updateActionForTab(tabId, url) {
  if (!chrome.action || typeof tabId !== 'number') return;

  const enabled = isCmsUrl(url);
  if (enabled) {
    chrome.action.enable(tabId);
    chrome.action.setTitle({ tabId, title: 'TapTop Helper' });
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

// ============= Применение опций к вкладке =============

function applyFeatures(tabId) {
  chrome.storage.sync.get(null, async (settings) => {
    await syncDnrRulesetsFromSettings(settings);
    await syncDynamicFrameRulesFromSettings(settings);

    chrome.tabs.get(tabId, async (tab) => {
      if (!tab || !isCmsUrl(tab.url)) return;

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
          let isOn = isOptionEnabled(option, value);
          if (isOptionDisabledByFreePlan(option, tariffState)) isOn = false;
          const key = storageKey;

          if (option.dnrRulesets && isOn) {
            await setDnrRulesets(option.dnrRulesets, true);
          }

          // CSS: управляемые style-теги (вставка/удаление)
          if (option.css && option.css.length) {
            if (isOn) {
              option.css.forEach(f => addCssTag(tabId, f, key));
            } else {
              option.css.forEach(f => removeCssTag(tabId, f, key));
            }
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
    });
  });
}

// Автоприменение при полной загрузке вкладки редактора
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab?.url || changeInfo.url) {
    updateActionForTab(tabId, tab?.url || changeInfo.url);
  }

  if (changeInfo.status === 'complete' && tab && isCmsUrl(tab.url)) {
    applyFeatures(tabId);
    setPendingReload(tabId, false);
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
    chrome.tabs.sendMessage(openerTabId, {
      action: 'miniBrowserOpenUrl',
      url
    });
    chrome.tabs.remove(tab.id);
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
  tabs.forEach((tab) => updateActionForTab(tab.id, tab.url || tab.pendingUrl));
});

// Сообщения popup ↔ background
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
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
  if (req && req.action === 'openMiniBrowserSidePanel') {
    openMiniBrowserSidePanel(req, sender, sendResponse);
    return true;
  }
  if (req && req.action === 'openMiniBrowserSidePanelLast') {
    openMiniBrowserSidePanelLast(req, sender, sendResponse);
    return true;
  }
});
