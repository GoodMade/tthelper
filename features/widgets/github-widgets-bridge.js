(function () {
  const STATE_KEY = '__ttEnhancerGithubWidgetsBridge';
  const PAGE_SOURCE = 'tt-enhancer-github-widgets';
  const BRIDGE_SOURCE = 'tt-enhancer-github-widgets-bridge';
  const SOURCES_STORAGE_KEY = 'widgets_additionalWidgetSources';
  const CACHE_STORAGE_KEY = 'widgets_additionalWidgetCache';
  const DISABLED_STORAGE_KEY = 'widgets_additionalWidgetDisabled';
  const DEFAULT_SOURCE = {
    id: 'tthelper_data',
    title: 'TapTop Helper',
    type: 'github',
    url: 'https://github.com/GoodMade/tthelper_data/tree/main/widgets',
    readonly: true
  };
  const LOCAL_SOURCE = {
    id: 'local_uploaded_widgets',
    title: 'Локальные виджеты',
    type: 'local',
    url: 'local://uploaded-widgets',
    readonly: true
  };
  const VALID_FILE_NAMES = new Set(['layers.json', 'script.json']);

  try {
    window[STATE_KEY]?.destroy?.();
  } catch {}

  function hashString(value) {
    let hash = 2166136261;
    const str = String(value || '');
    for (let i = 0; i < str.length; i += 1) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(36);
  }

  function normalizeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw)) return raw;
    return 'https://' + raw;
  }

  function normalizeSourceType(value) {
    if (value === 'local') return 'local';
    return value === 'folder' ? 'folder' : 'github';
  }

  function normalizeSourceId(value, fallbackSeed) {
    const raw = String(value || '').trim();
    if (/^[a-zA-Z0-9._:-]+$/.test(raw)) return raw;
    return 'source-' + hashString(fallbackSeed || raw || Date.now());
  }

  function normalizeSource(source, index) {
    const url = normalizeUrl(source?.url || '');
    const id = normalizeSourceId(source?.id, url || String(index));
    return {
      id,
      title: String(source?.title || id).trim() || id,
      type: normalizeSourceType(source?.type),
      url,
      active: source?.active !== false,
      order: index,
      readonly: !!source?.readonly
    };
  }

  function isValidWidgetName(value) {
    return /^[a-zA-Z0-9._-]+$/.test(String(value || ''));
  }

  function normalizeDisabledMap(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, isDisabled]) => isDisabled === true && /^[a-zA-Z0-9._:-]+::[a-zA-Z0-9._-]+$/.test(key))
        .map(([key]) => [key, true])
    );
  }

  function encodePath(value) {
    return String(value || '')
      .split('/')
      .filter(Boolean)
      .map((part) => encodeURIComponent(part))
      .join('/');
  }

  function joinFolderUrl(baseUrl, widgetName, fileName) {
    const base = String(baseUrl || '').replace(/\/+$/, '');
    return `${base}/${encodeURIComponent(widgetName)}/${encodeURIComponent(fileName)}`;
  }

  function getWidgetKey(source, widgetName) {
    return `${source.id}::${widgetName}`;
  }

  function buildWidgetEntry(source, widgetName) {
    return {
      key: getWidgetKey(source, widgetName),
      name: widgetName,
      sourceId: source.id,
      sourceTitle: source.title || source.id,
      sourceType: source.type,
      sourceOrder: source.order || 0
    };
  }

  function isCacheValid(source, cached) {
    return !!(
      source
      && cached
      && cached.source
      && cached.source.type === source.type
      && cached.source.url === source.url
      && Array.isArray(cached.widgets)
    );
  }

  function parseGithubSource(source) {
    const url = normalizeUrl(source.url);
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

  function getGithubContentsUrl(source) {
    const info = parseGithubSource(source);
    const path = encodePath(info.path);
    return `https://api.github.com/repos/${encodeURIComponent(info.owner)}/${encodeURIComponent(info.repo)}/contents/${path}?ref=${encodeURIComponent(info.branch)}`;
  }

  function getJsdelivrPackageUrl(source) {
    const info = parseGithubSource(source);
    return `https://data.jsdelivr.com/v1/packages/gh/${encodeURIComponent(info.owner)}/${encodeURIComponent(info.repo)}@${encodeURIComponent(info.branch)}?structure=flat`;
  }

  function getJsdelivrPathUrl(source, extraPath) {
    const info = parseGithubSource(source);
    const path = encodePath([info.path, extraPath].filter(Boolean).join('/'));
    return `https://cdn.jsdelivr.net/gh/${encodeURIComponent(info.owner)}/${encodeURIComponent(info.repo)}@${encodeURIComponent(info.branch)}/${path}`;
  }

  function normalizeWidgetIndex(data) {
    const items = Array.isArray(data)
      ? data
      : Array.isArray(data?.widgets)
        ? data.widgets
        : [];

    return items
      .map((item) => typeof item === 'string' ? { name: item } : item)
      .filter((item) => isValidWidgetName(item?.name))
      .map((item) => item.name);
  }

  function normalizeFlatFileName(value) {
    return '/' + String(value || '').replace(/^\/+/, '');
  }

  function parseJsdelivrFlatList(data, source) {
    const info = parseGithubSource(source);
    const prefix = '/' + String(info.path || '').replace(/^\/+|\/+$/g, '') + '/';
    const names = new Set();
    const files = Array.isArray(data?.files) ? data.files : [];

    files.forEach((file) => {
      const fileName = normalizeFlatFileName(file?.name);
      if (!fileName.startsWith(prefix)) return;

      const rest = fileName.slice(prefix.length);
      const parts = rest.split('/').filter(Boolean);
      if (parts.length !== 2 || parts[1] !== 'layers.json') return;
      if (isValidWidgetName(parts[0])) names.add(parts[0]);
    });

    return Array.from(names);
  }

  function postResponse(id, ok, result, error = '') {
    window.postMessage({
      source: BRIDGE_SOURCE,
      type: 'response',
      id,
      ok,
      result,
      error
    }, '*');
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, Object.assign({
      cache: 'no-cache',
      credentials: 'omit',
      headers: { Accept: 'application/json' }
    }, options));

    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  }

  function requestBackground(action, payload = {}) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({
          action: 'additionalWidgetsRequest',
          widgetAction: action,
          payload
        }, (response) => {
          const error = chrome.runtime.lastError;
          if (error) {
            reject(new Error(error.message || 'Background request failed'));
            return;
          }

          if (response?.ok) {
            resolve(response.result);
            return;
          }

          reject(new Error(response?.error || 'Background widgets request failed'));
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function readCustomSources() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get({ [SOURCES_STORAGE_KEY]: [] }, (settings) => {
          const sources = Array.isArray(settings?.[SOURCES_STORAGE_KEY])
            ? settings[SOURCES_STORAGE_KEY]
            : [];
          resolve(sources);
        });
      } catch {
        resolve([]);
      }
    });
  }

  function readDisabledWidgets() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get({ [DISABLED_STORAGE_KEY]: {} }, (settings) => {
          resolve(normalizeDisabledMap(settings?.[DISABLED_STORAGE_KEY]));
        });
      } catch {
        resolve({});
      }
    });
  }

  function readWidgetCache() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get({ [CACHE_STORAGE_KEY]: {} }, (items) => {
          resolve(items?.[CACHE_STORAGE_KEY] || {});
        });
      } catch {
        resolve({});
      }
    });
  }

  async function loadSources() {
    const customSources = await readCustomSources();
    const sources = [
      normalizeSource(DEFAULT_SOURCE, 0),
      normalizeSource(LOCAL_SOURCE, 1),
      ...customSources.map((source, index) => normalizeSource(source, index + 2))
    ];
    const seen = new Set();

    return sources.filter((source) => {
      if (!source.active || !source.url || seen.has(source.id)) return false;
      seen.add(source.id);
      return true;
    });
  }

  async function loadGithubWidgetList(source) {
    try {
      const names = parseJsdelivrFlatList(await fetchJson(getJsdelivrPackageUrl(source)), source);
      if (names.length) return names.map((name) => buildWidgetEntry(source, name));
    } catch {}

    try {
      const names = normalizeWidgetIndex(await fetchJson(getJsdelivrPathUrl(source, 'widgets.json')));
      if (names.length) return names.map((name) => buildWidgetEntry(source, name));
    } catch {}

    const items = await fetchJson(getGithubContentsUrl(source), {
      headers: { Accept: 'application/vnd.github+json' }
    });

    if (!Array.isArray(items)) return [];

    return items
      .filter((item) => item?.type === 'dir' && isValidWidgetName(item.name))
      .map((item) => buildWidgetEntry(source, item.name));
  }

  async function loadFolderWidgetList(source) {
    const base = source.url.replace(/\/+$/, '');
    const names = normalizeWidgetIndex(await fetchJson(`${base}/widgets.json`));
    return names.map((name) => buildWidgetEntry(source, name));
  }

  async function loadLocalWidgetList(source) {
    const cache = await readWidgetCache();
    if (!isCacheValid(source, cache[source.id])) return [];
    return cache[source.id].widgets
      .map((widget) => buildWidgetEntry(source, widget.name || widget))
      .filter((widget) => isValidWidgetName(widget.name));
  }

  async function loadSourceWidgetList(source) {
    if (source.type === 'local') return loadLocalWidgetList(source);
    if (source.type === 'folder') return loadFolderWidgetList(source);
    return loadGithubWidgetList(source);
  }

  async function loadWidgetList() {
    const [sources, disabledMap] = await Promise.all([
      loadSources(),
      readDisabledWidgets()
    ]);
    const results = await Promise.allSettled(sources.map(loadSourceWidgetList));
    const widgets = [];
    const errors = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        widgets.push(...result.value.filter((widget) => disabledMap[widget.key] !== true));
      } else {
        errors.push(result.reason);
      }
    });

    if (!widgets.length && errors.length) {
      throw errors[0] || new Error('No widget sources loaded');
    }

    return widgets.sort((a, b) => {
      const source = (Number(a.sourceOrder) || 0) - (Number(b.sourceOrder) || 0);
      return source || String(a.name || '').localeCompare(String(b.name || ''));
    });
  }

  async function getSourceById(sourceId) {
    const sources = await loadSources();
    return sources.find((source) => source.id === sourceId) || sources[0] || normalizeSource(DEFAULT_SOURCE, 0);
  }

  async function loadWidgetFile(payload) {
    const widgetName = payload?.widgetName || '';
    const fileName = payload?.fileName || '';
    if (!isValidWidgetName(widgetName)) throw new Error('Invalid widget name');
    if (!VALID_FILE_NAMES.has(fileName)) throw new Error('Invalid widget file');

    const source = await getSourceById(payload?.sourceId || DEFAULT_SOURCE.id);
    if (source.type === 'local') {
      const cache = await readWidgetCache();
      if (!isCacheValid(source, cache[source.id])) throw new Error('Local widget source is not loaded');
      const cachedFile = cache[source.id]?.files?.[widgetName]?.[fileName];
      if (cachedFile !== undefined) return cachedFile;
      throw new Error('Local widget file is not loaded');
    }

    const url = source.type === 'folder'
      ? joinFolderUrl(source.url, widgetName, fileName)
      : getJsdelivrPathUrl(source, `${widgetName}/${fileName}`);

    return fetchJson(url);
  }

  async function handleRequest(data) {
    const id = data?.id || '';

    try {
      if (data.action === 'list') {
        try {
          postResponse(id, true, await requestBackground('list'));
        } catch (backgroundError) {
          console.warn('Taptop Enhancer widgets background list fallback:', backgroundError);
          postResponse(id, true, await loadWidgetList());
        }
        return;
      }

      if (data.action === 'file') {
        try {
          postResponse(id, true, await requestBackground('file', data.payload || {}));
        } catch (backgroundError) {
          console.warn('Taptop Enhancer widgets background file fallback:', backgroundError);
          postResponse(id, true, await loadWidgetFile(data.payload || {}));
        }
        return;
      }

      throw new Error('Unknown widgets action');
    } catch (error) {
      postResponse(id, false, null, error?.message || String(error));
    }
  }

  function onMessage(event) {
    if (event.source !== window) return;

    const data = event.data;
    if (!data || data.source !== PAGE_SOURCE || data.type !== 'request') return;
    handleRequest(data);
  }

  window.addEventListener('message', onMessage);

  window[STATE_KEY] = {
    destroy() {
      window.removeEventListener('message', onMessage);
      if (window[STATE_KEY] === this) delete window[STATE_KEY];
    }
  };
})();
