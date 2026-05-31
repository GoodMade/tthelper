(function () {
  const STATE_KEY = '__ttEnhancerSearchReplace';
  const ROOT_CLASS = 'tt-search-replace';
  const ITEM_CLASS = 'tt-search-replace-tabs-item';
  const HOST_CLASS = 'tt-search-replace-tabs-host';
  const OPEN_CLASS = 'is-open';
  const PANEL_OPEN_CLASS = 'is-panel-open';
  const CUSTOM_PRESETS_KEY = 'ttEnhancerSearchReplaceCustomPresets';
  const PRESET_SETTINGS_KEY = 'ttEnhancerSearchReplacePresetSettings';
  const CUSTOM_PRESET_PREFIX = 'custom:';
  const STORAGE_REQUEST_SOURCE = 'tt-enhancer-search-replace';
  const STORAGE_RESPONSE_SOURCE = 'tt-enhancer-search-replace-storage-bridge';

  try {
    window[STATE_KEY]?.destroy?.();
  } catch {}

  let runtimeRequire = null;
  let mountObserver = null;
  let activeCanvasOverlay = null;
  let customPresets = [];
  let presetSettings = { order: [], disabled: [] };

  function getRuntimeRequire() {
    if (runtimeRequire) return runtimeRequire;

    const chunk = window.rspackChunktaptop_design_editor;
    if (!chunk || typeof chunk.push !== 'function') return null;

    try {
      const chunkId = `tt-enhancer-search-replace-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      chunk.push([[chunkId], {}, (req) => {
        runtimeRequire = req;
      }]);
    } catch {}

    return runtimeRequire;
  }

  function getTaptopApi() {
    const req = getRuntimeRequire();
    if (!req) return null;

    try {
      return {
        layout: req(36945)?.A,
        runtime: req(87621)?.A,
        events: req(91893)?.A,
        history: req(16271)?.A
      };
    } catch {
      return null;
    }
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function isVisible(el) {
    if (!(el instanceof HTMLElement)) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function dotsIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="12" cy="19" r="1.9"/></svg>';
  }

  function closeIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"/></svg>';
  }

  function saveIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h12.2L21 6.8V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1 2v14h2v-6h8v6h3V7.7L16.3 5H16v5H7V5H6Zm4 14h4v-4h-4v4Zm-1-9h5V5H9v5Z"/></svg>';
  }

  function undoIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7H5V3H3v8h8V9H6.7a7 7 0 1 1 1.9 7.4l-1.4 1.4A9 9 0 1 0 9 7Z"/></svg>';
  }

  function settingsIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13.5a7.7 7.7 0 0 0 .05-1.5l2-1.55-2-3.46-2.43.98a7.6 7.6 0 0 0-1.3-.75L15.35 4h-4l-.37 3.22c-.46.2-.9.45-1.3.75L7.25 6.99l-2 3.46L7.24 12a7.7 7.7 0 0 0 0 1.5l-2 1.55 2 3.46 2.43-.98c.41.3.84.55 1.3.75l.37 3.22h4l.37-3.22c.46-.2.9-.45 1.3-.75l2.43.98 2-3.46-2.04-1.55ZM13.35 15.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/></svg>';
  }

  function trashIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-.8 11H6.8L6 9Zm4 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z"/></svg>';
  }

  const PRESETS = [
    {
      id: 'double-quotes-to-guillemets',
      label: 'Кавычки "..." -> «...»',
      find: '"([^"]+)"',
      replace: '«$1»',
      regex: true
    },
    {
      id: 'single-quotes-to-guillemets',
      label: "Кавычки '...' -> «...»",
      find: "'([^']+)'",
      replace: '«$1»',
      regex: true
    },
    {
      id: 'any-quotes-to-guillemets',
      label: 'Любые внешние кавычки -> «...»',
      find: '["“”„]([^"“”„]+)["“”„]',
      replace: '«$1»',
      regex: true
    },
    {
      id: 'double-spaces',
      label: 'Двойные пробелы -> один',
      find: '[ \\t]{2,}',
      replace: ' ',
      regex: true
    },
    {
      id: 'space-before-punctuation',
      label: 'Убрать пробел перед ,.!?:;',
      find: '\\s+([,.;:!?])',
      replace: '$1',
      regex: true
    },
    {
      id: 'ellipsis',
      label: 'Троеточие ... -> …',
      find: '...',
      replace: '…',
      regex: false
    },
    {
      id: 'dash',
      label: 'Пробельный дефис -> тире',
      find: '\\s+-\\s+',
      replace: ' — ',
      regex: true
    }
  ];

  function getStorageArea() {
    try {
      return chrome?.storage?.sync || null;
    } catch {
      return null;
    }
  }

  function requestBridgeStorage(action, payload, callback) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let done = false;
    let attempts = 0;
    let timer = 0;

    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
    };
    const finish = (ok, data, error = '') => {
      if (done) return;
      done = true;
      cleanup();
      callback(ok, data, error);
    };
    function onMessage(event) {
      if (event.source !== window) return;
      const message = event.data;
      if (!message || message.source !== STORAGE_RESPONSE_SOURCE || message.id !== id) return;
      finish(!!message.ok, message.data, message.error || '');
    }
    const send = () => {
      if (done) return;
      attempts += 1;
      if (attempts > 14) {
        finish(false, null, 'Хранилище расширения недоступно');
        return;
      }

      window.postMessage({
        source: STORAGE_REQUEST_SOURCE,
        id,
        action,
        payload
      }, '*');
      timer = setTimeout(send, 150);
    };

    window.addEventListener('message', onMessage);
    send();
  }

  function normalizePresetScope(preset) {
    return {
      className: String(preset?.scope?.className || preset?.scopeClass || ''),
      tags: String(preset?.scope?.tags || preset?.scopeTags || '')
    };
  }

  function normalizePresetSettings(value) {
    const order = Array.isArray(value?.order) ? value.order.map(String).filter(Boolean) : [];
    const disabled = Array.isArray(value?.disabled) ? value.disabled.map(String).filter(Boolean) : [];
    return {
      order: Array.from(new Set(order)),
      disabled: Array.from(new Set(disabled))
    };
  }

  function normalizeCustomPreset(item) {
    if (!item || typeof item !== 'object') return null;
    const label = String(item.label || '').trim();
    const find = String(item.find || '');
    if (!label || !find) return null;
    return {
      id: String(item.id || `${CUSTOM_PRESET_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}`),
      label,
      find,
      replace: String(item.replace || ''),
      regex: !!item.regex,
      scope: normalizePresetScope(item)
    };
  }

  function loadCustomPresets(callback) {
    const storage = getStorageArea();
    if (!storage) {
      requestBridgeStorage('get', { key: CUSTOM_PRESETS_KEY, defaultValue: [] }, (ok, data) => {
        customPresets = (ok && Array.isArray(data) ? data : [])
          .map(normalizeCustomPreset)
          .filter(Boolean);
        callback(customPresets);
      });
      return;
    }

    try {
      storage.get({ [CUSTOM_PRESETS_KEY]: [] }, (items) => {
        let error = null;
        try {
          error = chrome?.runtime?.lastError;
        } catch {}
        if (error) {
          callback([]);
          return;
        }

        customPresets = (Array.isArray(items?.[CUSTOM_PRESETS_KEY]) ? items[CUSTOM_PRESETS_KEY] : [])
          .map(normalizeCustomPreset)
          .filter(Boolean);
        callback(customPresets);
      });
    } catch {
      callback([]);
    }
  }

  function saveCustomPresets(callback) {
    const storage = getStorageArea();
    if (!storage) {
      requestBridgeStorage('set', { key: CUSTOM_PRESETS_KEY, value: customPresets }, (ok, data, error) => {
        callback(ok, error || '');
      });
      return;
    }

    try {
      storage.set({ [CUSTOM_PRESETS_KEY]: customPresets }, () => {
        let error = null;
        try {
          error = chrome?.runtime?.lastError;
        } catch {}
        callback(!error, error?.message || '');
      });
    } catch (error) {
      callback(false, error?.message || 'Не удалось сохранить шаблон');
    }
  }

  function loadPresetSettings(callback) {
    const storage = getStorageArea();
    if (!storage) {
      requestBridgeStorage('get', { key: PRESET_SETTINGS_KEY, defaultValue: {} }, (ok, data) => {
        presetSettings = normalizePresetSettings(ok ? data : {});
        callback(presetSettings);
      });
      return;
    }

    try {
      storage.get({ [PRESET_SETTINGS_KEY]: {} }, (items) => {
        let error = null;
        try {
          error = chrome?.runtime?.lastError;
        } catch {}
        presetSettings = normalizePresetSettings(error ? {} : items?.[PRESET_SETTINGS_KEY]);
        callback(presetSettings);
      });
    } catch {
      callback(presetSettings);
    }
  }

  function savePresetSettings(callback) {
    const storage = getStorageArea();
    const value = normalizePresetSettings(presetSettings);
    presetSettings = value;
    if (!storage) {
      requestBridgeStorage('set', { key: PRESET_SETTINGS_KEY, value }, (ok, data, error) => {
        callback?.(ok, error || '');
      });
      return;
    }

    try {
      storage.set({ [PRESET_SETTINGS_KEY]: value }, () => {
        let error = null;
        try {
          error = chrome?.runtime?.lastError;
        } catch {}
        callback?.(!error, error?.message || '');
      });
    } catch (error) {
      callback?.(false, error?.message || 'Не удалось сохранить порядок шаблонов');
    }
  }

  function loadPresetState(callback) {
    let pending = 2;
    const done = () => {
      pending -= 1;
      if (!pending) callback();
    };
    loadCustomPresets(done);
    loadPresetSettings(done);
  }

  function getAllPresets() {
    const presets = [...PRESETS, ...customPresets];
    const orderIndex = new Map(presetSettings.order.map((id, index) => [id, index]));
    return presets.slice().sort((a, b) => {
      const ai = orderIndex.has(a.id) ? orderIndex.get(a.id) : Number.MAX_SAFE_INTEGER;
      const bi = orderIndex.has(b.id) ? orderIndex.get(b.id) : Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return presets.indexOf(a) - presets.indexOf(b);
    });
  }

  function isPresetDisabled(id) {
    return presetSettings.disabled.includes(id);
  }

  function setPresetDisabled(id, disabled) {
    const values = new Set(presetSettings.disabled);
    if (disabled) values.add(id);
    else values.delete(id);
    presetSettings = {
      ...presetSettings,
      disabled: Array.from(values)
    };
  }

  function setPresetOrder(ids) {
    const knownIds = new Set(getAllPresets().map((preset) => preset.id));
    presetSettings = {
      ...presetSettings,
      order: ids.filter((id) => knownIds.has(id))
    };
  }

  function deleteCustomPreset(id) {
    const before = customPresets.length;
    customPresets = customPresets.filter((preset) => preset.id !== id);
    presetSettings = {
      order: presetSettings.order.filter((item) => item !== id),
      disabled: presetSettings.disabled.filter((item) => item !== id)
    };
    return customPresets.length !== before;
  }

  function getPresetById(id) {
    return getAllPresets().find((item) => item.id === id) || null;
  }

  function getSelectablePresets(query = '') {
    const normalizedQuery = normalizeText(query).toLowerCase();
    return getAllPresets().filter((preset) => (
      !isPresetDisabled(preset.id)
      && (!normalizedQuery || preset.label.toLowerCase().includes(normalizedQuery))
    ));
  }

  function getTagEntries(tree) {
    const entries = [];
    const seen = new Set();
    const seenTags = new WeakSet();
    const add = (tag, id) => {
      if (!tag || typeof tag !== 'object') return;
      const key = String(id || readObjectValue(tag, 'id') || entries.length);
      if (seen.has(key)) return;
      if (seenTags.has(tag)) return;
      seen.add(key);
      seenTags.add(tag);
      entries.push({ id: key, tag });
    };
    const addCollection = (collection) => {
      if (!collection) return;
      if (collection instanceof Map) {
        collection.forEach((tag, id) => add(tag, id));
        return;
      }
      if (typeof collection.forEach === 'function') {
        try {
          collection.forEach((tag, id) => add(tag, id));
          return;
        } catch {}
      }
      if (typeof collection === 'object') Object.entries(collection).forEach(([id, tag]) => add(tag, id));
    };

    const tags = readObjectValue(tree, 'tags');
    const composed = readObjectValue(tree, 'composed');
    const map = readObjectValue(tree, 'map');

    addCollection(tags);
    addCollection(composed);
    addCollection(map);
    if (typeof tree?.forEach === 'function') {
      try {
        tree.forEach((tag, id) => add(tag, id));
      } catch {}
    }

    return entries;
  }

  function splitScopeTokens(value) {
    return String(value || '')
      .split(/[,\n]+/)
      .flatMap((part) => part.split(/\s+/))
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function normalizeClassToken(value) {
    return String(value || '').trim().replace(/^\./, '').toLowerCase();
  }

  function normalizeTagToken(value) {
    return String(value || '').trim().toLowerCase().replace(/^tt[_-]/, '');
  }

  function escapeCssIdent(value) {
    try {
      if (window.CSS?.escape) return window.CSS.escape(value);
    } catch {}
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function selectorClassNames(value) {
    const names = [];
    String(value || '').replace(/\.([_a-zA-Zа-яА-ЯёЁ-][\wа-яА-ЯёЁ-]*)/g, (_, className) => {
      names.push(className);
      return _;
    });
    return names;
  }

  function readObjectValue(item, key) {
    if (!item) return '';
    try {
      if (typeof item.get === 'function') return item.get(key) || '';
    } catch {}
    return item[key] || '';
  }

  function toArrayLike(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      if (typeof value.toArray === 'function') return value.toArray();
    } catch {}
    try {
      if (typeof value.toJS === 'function') {
        const next = value.toJS();
        return Array.isArray(next) ? next : Object.values(next || {});
      }
    } catch {}
    try {
      if (typeof value[Symbol.iterator] === 'function') return Array.from(value);
    } catch {}
    try {
      if (typeof value.size === 'number' && typeof value.get === 'function') {
        return Array.from({ length: value.size }, (_, index) => value.get(index));
      }
    } catch {}
    return [];
  }

  function collectionItems(collection) {
    const items = [];
    const add = (item, fallbackId) => {
      if (!item) return;
      const values = new Set();
      const id = String(readObjectValue(item, 'id') || fallbackId || '');
      const addValue = (value) => {
        if (value) values.add(String(value));
      };

      if (typeof item === 'string') addValue(item);
      addValue(readObjectValue(item, 'value'));
      addValue(readObjectValue(item, 'name'));
      addValue(readObjectValue(item, 'className'));
      addValue(readObjectValue(item, 'selectorText'));
      selectorClassNames(readObjectValue(item, 'selectorText') || readObjectValue(item, 'value') || fallbackId).forEach(addValue);

      values.forEach((value) => items.push({ id, value }));
    };

    if (!collection) return items;
    if (Array.isArray(collection.list)) collection.list.forEach(add);
    if (collection.map instanceof Map) collection.map.forEach((item, id) => add(item, id));
    if (collection.map && typeof collection.map.get === 'function' && typeof collection.map.forEach === 'function') {
      try {
        collection.map.forEach((item, id) => add(item, id));
      } catch {}
    }
    if (collection.map && typeof collection.map === 'object') {
      Object.entries(collection.map).forEach(([id, item]) => add(item, id));
    }
    if (typeof collection.forEach === 'function') {
      try {
        collection.forEach((item, id) => add(item, id));
      } catch {}
    }
    if (typeof collection.values === 'function') {
      try {
        Array.from(collection.values()).forEach(add);
      } catch {}
    }
    if (typeof collection.serialize === 'function') {
      try {
        const serialized = collection.serialize();
        if (serialized?.map) Object.entries(serialized.map).forEach(([id, item]) => add(item, id));
      } catch {}
    }

    return items;
  }

  function buildClassNameMap(layout) {
    const map = new Map();
    [
      layout?.mainClassNameCollection,
      layout?.designClassNameCollection,
      layout?.mainSelectorCollection,
      layout?.designSelectorCollection,
      layout?.cmSelectorCollection
    ].forEach((collection) => {
      collectionItems(collection).forEach((item) => {
        if (item.id && item.value) map.set(item.id, item.value);
      });
    });
    return map;
  }

  function getClassCollections(layout) {
    return [
      layout?.classNameManager,
      layout?.mainClassNameCollection,
      layout?.designClassNameCollection,
      layout?.mainSelectorCollection,
      layout?.designSelectorCollection,
      layout?.cmSelectorCollection
    ].filter(Boolean);
  }

  function resolveClassValueById(layout, id, classNameMap) {
    const key = String(id || '');
    if (!key) return '';
    if (classNameMap.has(key)) return classNameMap.get(key);

    for (const collection of getClassCollections(layout)) {
      try {
        const item = collection.get?.(key)
          || collection.findById?.(key)
          || collection.getById?.(key)
          || collection.map?.get?.(key);
        const value = readObjectValue(item, 'value')
          || readObjectValue(item, 'name')
          || readObjectValue(item, 'className')
          || readObjectValue(item, 'selectorText');
        if (value) return String(value);
      } catch {}
    }

    return '';
  }

  function getClassScopeIds(layout, classTokens) {
    const ids = new Set();
    const collections = getClassCollections(layout);

    classTokens.forEach((token) => {
      collections.forEach((collection) => {
        try {
          const item = collection?.findByName?.(token) || collection?.findByName?.(`.${token}`);
          const id = readObjectValue(item, 'id');
          if (id) ids.add(String(id));
        } catch {}
      });
    });

    return ids;
  }

  function getTagClassNames(tag, classNameMap, layout) {
    const names = new Set();
    const addName = (value) => {
      String(value || '')
        .split(/\s+/)
        .map(normalizeClassToken)
        .filter(Boolean)
        .forEach((name) => names.add(name));
    };

    const attrs = readObjectValue(tag, 'attrs') || readObjectValue(tag, 'attributes');
    const props = readObjectValue(tag, 'props');

    addName(readObjectValue(tag, 'className'));
    toArrayLike(readObjectValue(tag, 'classNames')).forEach(addName);
    toArrayLike(readObjectValue(tag, 'classes')).forEach(addName);
    addName(readObjectValue(attrs, 'class'));
    addName(readObjectValue(props, 'class'));
    toArrayLike(readObjectValue(tag, 'classNameIds')).forEach((id) => {
        if (id && typeof id === 'object') {
          addName(readObjectValue(id, 'value'));
          addName(readObjectValue(id, 'name'));
          addName(readObjectValue(id, 'className'));
          addName(readObjectValue(id, 'selectorText'));
          return;
        }

        const idValue = String(id || '');
        const value = resolveClassValueById(layout, idValue, classNameMap);
        if (value) addName(value);
        selectorClassNames(value || idValue).forEach(addName);
    });

    return names;
  }

  function getTagClassIds(tag) {
    const ids = new Set();
    toArrayLike(readObjectValue(tag, 'classNameIds')).forEach((id) => {
      if (!id) return;
      if (typeof id === 'object') {
        const value = readObjectValue(id, 'id') || readObjectValue(id, 'value');
        if (value) ids.add(String(value));
        return;
      }
      ids.add(String(id));
    });
    return ids;
  }

  function getParentId(tag) {
    const parent = readObjectValue(tag, 'parent')
      || readObjectValue(tag, 'parentId')
      || readObjectValue(tag, 'parentID')
      || readObjectValue(tag, 'parent_id');
    if (!parent) return '';
    if (typeof parent === 'string' || typeof parent === 'number') return String(parent);
    return String(
      readObjectValue(parent, 'id')
      || readObjectValue(parent, 'tagID')
      || readObjectValue(parent, 'tagId')
      || ''
    );
  }

  function getChildIds(tag) {
    const childValues = [];
    const append = (value) => {
      if (!value) return;
      if (typeof value === 'string' || typeof value === 'number') childValues.push(String(value));
      else {
        const id = readObjectValue(value, 'id') || readObjectValue(value, 'tagID') || readObjectValue(value, 'tagId');
        if (id) childValues.push(String(id));
      }
    };

    [
      readObjectValue(tag, 'children'),
      readObjectValue(tag, 'childrens'),
      readObjectValue(tag, 'items')
    ].forEach((children) => {
      const list = toArrayLike(children);
      if (list.length) list.forEach(append);
      else if (Array.isArray(children)) children.forEach(append);
      else if (children && typeof children === 'object') Object.values(children).forEach(append);
    });

    return childValues;
  }

  function buildEntryIndex(entries) {
    const byId = new Map();
    const parentById = new Map();

    entries.forEach((entry) => {
      addEntryIdentity(byId, entry.id, entry);
      const tagId = readObjectValue(entry.tag, 'id') ? String(readObjectValue(entry.tag, 'id')) : '';
      if (tagId) addEntryIdentity(byId, tagId, entry);
    });

    entries.forEach((entry) => {
      const parentId = getParentId(entry.tag);
      if (parentId) {
        addParentIdentity(parentById, entry.id, parentId);
        const tagId = readObjectValue(entry.tag, 'id');
        if (tagId) addParentIdentity(parentById, tagId, parentId);
      }

      getChildIds(entry.tag).forEach((childId) => {
        if (!parentById.has(childId)) addParentIdentity(parentById, childId, entry.id);
      });
    });

    return { byId, parentById };
  }

  function entryMatchesClass(entry, classNameMap, layout, classTokens, classIds) {
    if (!classTokens.length) return true;
    const classNames = getTagClassNames(entry.tag, classNameMap, layout);
    if (classTokens.some((token) => classNames.has(token))) return true;

    if (classIds.size) {
      const tagClassIds = getTagClassIds(entry.tag);
      for (const id of classIds) {
        if (tagClassIds.has(id)) return true;
      }
    }

    return false;
  }

  function entryIsInsideClassScope(entry, index, matchingIds) {
    if (!matchingIds.size) return false;

    let current = entry;
    const seen = new Set();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      if (identitySetHas(matchingIds, current.id) || identitySetHas(matchingIds, readObjectValue(current.tag, 'id'))) return true;

      const parentId = getIdentityMapValue(index.parentById, current.id)
        || getIdentityMapValue(index.parentById, readObjectValue(current.tag, 'id'))
        || getParentId(current.tag);
      current = parentId ? getIdentityMapValue(index.byId, parentId) : null;
    }

    return false;
  }

  function addIdentityVariants(target, value) {
    const text = String(value || '').trim();
    if (!text) return;
    target.add(text);
    target.add(text.toLowerCase());

    const withoutInstanceSuffix = text.replace(/_\d+$/, '');
    if (withoutInstanceSuffix && withoutInstanceSuffix !== text) {
      target.add(withoutInstanceSuffix);
      target.add(withoutInstanceSuffix.toLowerCase());
    }
  }

  function identitySetHas(target, value) {
    const aliases = new Set();
    addIdentityVariants(aliases, value);
    for (const alias of aliases) {
      if (target.has(alias)) return true;
    }
    return false;
  }

  function getIdentityMapValue(target, value) {
    const aliases = new Set();
    addIdentityVariants(aliases, value);
    for (const alias of aliases) {
      if (target.has(alias)) return target.get(alias);
    }
    return null;
  }

  function addElementClassIdentityIds(target, element) {
    let className = '';
    try {
      className = element.getAttribute?.('class') || String(element.className || '');
    } catch {}

    String(className).replace(/(?:^|\s)[a-z]+--(?:u|s\d+)-([a-zA-Z0-9_-]+)/g, (_, id) => {
      addIdentityVariants(target, id);
      return _;
    });
  }

  function addEntryIdentity(index, id, entry) {
    const values = new Set();
    addIdentityVariants(values, id);
    values.forEach((value) => index.set(value, entry));
  }

  function addParentIdentity(index, childId, parentId) {
    const childAliases = new Set();
    const parentAliases = new Set();
    addIdentityVariants(childAliases, childId);
    addIdentityVariants(parentAliases, parentId);

    const normalizedParentId = parentAliases.values().next().value || String(parentId || '');
    childAliases.forEach((alias) => index.set(alias, normalizedParentId));
  }

  function getElementPossibleIds(element) {
    const ids = new Set();
    const add = (value) => {
      addIdentityVariants(ids, value);
    };

    ['id', 'data-id', 'data-tag-id', 'data-tagid', 'data-node-id', 'data-layer-id', 'data-element-id', 'data-tt-id'].forEach((name) => {
      try {
        add(element.getAttribute?.(name));
      } catch {}
    });

    try {
      Object.values(element.dataset || {}).forEach(add);
    } catch {}

    addElementClassIdentityIds(ids, element);
    return ids;
  }

  function buildDomIdEntryMap(entries) {
    const byDomId = new Map();
    const add = (value, entryId) => {
      const aliases = new Set();
      addIdentityVariants(aliases, value);
      aliases.forEach((alias) => byDomId.set(alias, entryId));
    };

    entries.forEach((entry) => {
      add(entry.id, entry.id);
      const tagId = readObjectValue(entry.tag, 'id');
      if (tagId) add(tagId, entry.id);
    });
    return byDomId;
  }

  function getDomScopeEntryIds(classTokens, entries) {
    const ids = new Set();
    if (!classTokens.length || typeof document === 'undefined') return ids;

    const byDomId = buildDomIdEntryMap(entries);
    const identifiedSelector = '[id], [data-id], [data-tag-id], [data-tagid], [data-node-id], [data-layer-id], [data-element-id], [data-tt-id], [class*="--u-"], [class*="--s1-"], [class*="--s2-"]';

    const inspect = (element) => {
      getElementPossibleIds(element).forEach((id) => {
        const entryId = byDomId.get(id);
        if (entryId) ids.add(entryId);
      });
    };

    queryScopeElements(classTokens).forEach(({ element }) => {
      const before = ids.size;
      inspect(element);

      try {
        element.querySelectorAll(identifiedSelector)
          .forEach(inspect);
      } catch {}

      if (ids.size !== before) return;

      let parent = element.parentElement;
      let depth = 0;
      while (parent && depth < 8) {
        if (parent.matches?.(identifiedSelector)) {
          inspect(parent);
          break;
        }
        parent = parent.parentElement;
        depth += 1;
      }
    });

    return ids;
  }

  function rectIntersectionArea(a, b) {
    const left = Math.max(a.left, b.left);
    const right = Math.min(a.right, b.right);
    const top = Math.max(a.top, b.top);
    const bottom = Math.min(a.bottom, b.bottom);
    return Math.max(0, right - left) * Math.max(0, bottom - top);
  }

  function rectCenterInside(inner, outer) {
    const x = inner.left + inner.width / 2;
    const y = inner.top + inner.height / 2;
    return x >= outer.left && x <= outer.right && y >= outer.top && y <= outer.bottom;
  }

  function rectMatchesScope(targetRect, scopeRect) {
    if (rectCenterInside(targetRect, scopeRect)) return true;

    const targetArea = Math.max(1, targetRect.width * targetRect.height);
    const scopeArea = Math.max(1, scopeRect.width * scopeRect.height);
    const intersection = rectIntersectionArea(targetRect, scopeRect);
    return intersection / Math.min(targetArea, scopeArea) >= 0.45;
  }

  function queryIdentifiedElementsInDocument(doc, frameRect = null) {
    const selector = '[id], [data-id], [data-tag-id], [data-tagid], [data-node-id], [data-layer-id], [data-element-id], [data-tt-id], [class*="--u-"], [class*="--s1-"], [class*="--s2-"]';
    const elements = [];

    try {
      doc.querySelectorAll(selector).forEach((element) => {
        const rect = getElementViewportRect(element, frameRect);
        if (isOverlayTargetVisible(element, rect)) elements.push({ element, rect });
      });
    } catch {}

    return elements;
  }

  function queryIdentifiedElements() {
    const elements = [];
    const seen = new WeakSet();
    const add = (item) => {
      if (seen.has(item.element)) return;
      seen.add(item.element);
      elements.push(item);
    };

    queryIdentifiedElementsInDocument(document).forEach(add);
    document.querySelectorAll('iframe').forEach((frame) => {
      try {
        const doc = frame.contentDocument;
        if (!doc) return;
        queryIdentifiedElementsInDocument(doc, frame.getBoundingClientRect()).forEach(add);
      } catch {}
    });

    return elements;
  }

  function getGeometryScopeEntryIds(classTokens, entries) {
    const ids = new Set();
    if (!classTokens.length || typeof document === 'undefined') return ids;

    const scopeRects = queryScopeElements(classTokens).map((item) => item.rect);
    if (!scopeRects.length) return ids;

    const byDomId = buildDomIdEntryMap(entries);

    queryIdentifiedElements().forEach(({ element, rect }) => {
      if (!scopeRects.some((scopeRect) => rectMatchesScope(rect, scopeRect))) return;

      getElementPossibleIds(element).forEach((id) => {
        const entryId = byDomId.get(id);
        if (entryId) ids.add(entryId);
      });
    });

    return ids;
  }

  function getTagIdentityValues(tag) {
    const values = new Set();
    const add = (value) => {
      const normalized = normalizeTagToken(value);
      if (!normalized) return;
      values.add(normalized);
      normalized.split(/[_:-]+/).filter(Boolean).forEach((part) => values.add(part));
    };

    [
      readObjectValue(tag, 'tagName'),
      readObjectValue(tag, 'type'),
      readObjectValue(tag, 'widgetName'),
      readObjectValue(tag, 'widgetType'),
      readObjectValue(tag, 'componentName'),
      readObjectValue(tag, 'name'),
      readObjectValue(tag, 'alias'),
      readObjectValue(tag, 'id')
    ].forEach(add);

    const widget = readObjectValue(tag, 'widget');
    add(readObjectValue(widget, 'name'));
    add(readObjectValue(widget, 'type'));

    return values;
  }

  function entryHasTagScope(entry, tagTokens) {
    if (!tagTokens.length) return true;
    const values = getTagIdentityValues(entry.tag);
    return tagTokens.some((token) => values.has(token));
  }

  function filterTagEntries(entries, layout, scope = {}) {
    const classTokens = splitScopeTokens(scope.className).map(normalizeClassToken).filter(Boolean);
    const tagTokens = splitScopeTokens(scope.tags).map(normalizeTagToken).filter(Boolean);
    if (!classTokens.length && !tagTokens.length) return entries;

    const index = buildEntryIndex(entries);
    const classNameMap = buildClassNameMap(layout);
    const classIds = getClassScopeIds(layout, classTokens);
    const matchingClassIds = new Set();

    if (classTokens.length) {
      const domScopeIds = getDomScopeEntryIds(classTokens, entries);
      domScopeIds.forEach((id) => matchingClassIds.add(id));

      entries.forEach((entry) => {
        if (entryMatchesClass(entry, classNameMap, layout, classTokens, classIds)) matchingClassIds.add(entry.id);
      });

      if (!matchingClassIds.size) {
        getGeometryScopeEntryIds(classTokens, entries).forEach((id) => matchingClassIds.add(id));
      }
    }

    return entries.filter((entry) => (
      (!classTokens.length || entryIsInsideClassScope(entry, index, matchingClassIds))
      && entryHasTagScope(entry, tagTokens)
    ));
  }

  function makePattern(find, isRegex) {
    if (!find) return { error: 'Введите текст для поиска' };
    try {
      return {
        regex: new RegExp(isRegex ? find : escapeRegExp(find), 'gu')
      };
    } catch (error) {
      return { error: error?.message || 'Некорректное регулярное выражение' };
    }
  }

  function countMatches(value, regex) {
    const text = String(value || '');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  function replaceText(value, regex, replacement) {
    const source = String(value || '');
    const count = countMatches(source, regex);
    return {
      count,
      value: count ? source.replace(regex, replacement) : source
    };
  }

  function getObjectValue(obj, key) {
    try {
      if (typeof obj?.get === 'function') return obj.get(key);
    } catch {}
    return obj?.[key];
  }

  function setObjectValue(obj, key, value) {
    if (!obj || !key) return;
    try {
      if (typeof obj.set === 'function') {
        obj.set(key, value);
        return;
      }
    } catch {}
    obj[key] = value;
  }

  function shouldSkipKey(key) {
    return /^(id|parent|children|className|classNameIds|widgetName|widgetExportSettings|can|dataAccess|dataAccessPath|dataSource|type|tagName|src|href|image_id|ver_id|filename|ext|size)$/i.test(String(key));
  }

  function isTextContainer(value) {
    const type = String(value?.type || '').toUpperCase();
    return /^(HTML|STRING|TEXT|RICH_TEXT)$/.test(type) && Object.prototype.hasOwnProperty.call(value, 'value');
  }

  function isLikelyTextKey(key) {
    return /(^|_)(text|title|subtitle|description|caption|content|html|rich|name|label|alt)(_|$)/i.test(String(key));
  }

  function visitTextValue(value, replaceOne) {
    if (typeof value === 'string') return replaceOne(value);

    if (value && typeof value === 'object') {
      if (typeof value.ru === 'string' || typeof value.en === 'string') {
        let count = 0;
        ['ru', 'en'].forEach((lang) => {
          if (typeof value[lang] !== 'string') return;
          const next = replaceOne(value[lang]);
          count += next.count;
          value[lang] = next.value;
        });
        return { count, value };
      }
    }

    return { count: 0, value };
  }

  function traverseTextFields(root, replaceOne) {
    const seen = new WeakSet();
    let count = 0;

    const visit = (obj, key = '', depth = 0) => {
      if (!obj || typeof obj !== 'object' || depth > 10) return;
      if (seen.has(obj)) return;
      seen.add(obj);

      if (isTextContainer(obj)) {
        const current = getObjectValue(obj, 'value');
        const next = visitTextValue(current, replaceOne);
        if (next.count) {
          count += next.count;
          setObjectValue(obj, 'value', next.value);
        }
        return;
      }

      const entries = obj instanceof Map ? Array.from(obj.entries()) : Object.entries(obj);
      entries.forEach(([childKey, child]) => {
        if (shouldSkipKey(childKey)) return;

        if (typeof child === 'string') {
          if (!isLikelyTextKey(childKey) && !isLikelyTextKey(key)) return;
          const next = replaceOne(child);
          if (next.count) {
            count += next.count;
            setObjectValue(obj, childKey, next.value);
          }
          return;
        }

        if (child && typeof child === 'object') visit(child, childKey, depth + 1);
      });
    };

    visit(root);
    return count;
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isOverlayTargetVisible(element, rect) {
    if (!element || typeof element.getBoundingClientRect !== 'function') return false;
    if (element.closest?.(`.${ROOT_CLASS}, .tt-design-mode-right-panel, .tt-panel, .tt-dropdown, .tt-tooltip`)) return false;
    if (rect.width < 4 || rect.height < 4) return false;
    if (rect.right < 0 || rect.bottom < 0 || rect.left > window.innerWidth || rect.top > window.innerHeight) return false;

    try {
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    } catch {
      return true;
    }
  }

  function getElementViewportRect(element, frameRect = null) {
    const rect = element.getBoundingClientRect();
    if (!frameRect) return rect;
    const frame = element.ownerDocument?.defaultView?.frameElement;
    const scaleX = frame?.offsetWidth ? frameRect.width / frame.offsetWidth : 1;
    const scaleY = frame?.offsetHeight ? frameRect.height / frame.offsetHeight : 1;
    return {
      left: rect.left * scaleX + frameRect.left,
      top: rect.top * scaleY + frameRect.top,
      right: rect.right * scaleX + frameRect.left,
      bottom: rect.bottom * scaleY + frameRect.top,
      width: rect.width * scaleX,
      height: rect.height * scaleY
    };
  }

  function queryScopeElementsInDocument(doc, tokens, frameRect = null) {
    const elements = [];
    tokens.forEach((token) => {
      try {
        doc.querySelectorAll(`.${escapeCssIdent(token)}`).forEach((element) => {
          const rect = getElementViewportRect(element, frameRect);
          if (isOverlayTargetVisible(element, rect)) elements.push({ element, rect });
        });
      } catch {}
    });
    return elements;
  }

  function queryScopeElements(tokens) {
    const seen = new WeakSet();
    const targets = [];
    const add = (item) => {
      if (seen.has(item.element)) return;
      seen.add(item.element);
      targets.push(item);
    };

    queryScopeElementsInDocument(document, tokens).forEach(add);
    document.querySelectorAll('iframe').forEach((frame) => {
      try {
        const doc = frame.contentDocument;
        if (!doc) return;
        const frameRect = frame.getBoundingClientRect();
        queryScopeElementsInDocument(doc, tokens, frameRect).forEach(add);
      } catch {}
    });

    return targets;
  }

  function createCanvasOverlay(scope) {
    const tokens = splitScopeTokens(scope?.className).map(normalizeClassToken).filter(Boolean);
    if (!tokens.length) return null;

    const overlay = document.createElement('div');
    overlay.className = 'tt-search-replace-canvas-overlay';
    const nodes = [];
    let frameId = 0;
    let destroyed = false;

    const render = () => {
      if (destroyed) return;
      const targets = queryScopeElements(tokens);

      while (nodes.length < targets.length) {
        const item = document.createElement('div');
        item.className = 'tt-search-replace-canvas-overlay__item';
        overlay.appendChild(item);
        nodes.push(item);
      }
      while (nodes.length > targets.length) nodes.pop().remove();

      targets.forEach(({ rect }, index) => {
        const item = nodes[index];
        item.style.transform = `translate3d(${Math.round(rect.left)}px, ${Math.round(rect.top)}px, 0)`;
        item.style.width = `${Math.round(rect.width)}px`;
        item.style.height = `${Math.round(rect.height)}px`;
      });
    };

    const tick = () => {
      render();
      frameId = requestAnimationFrame(tick);
    };

    return {
      start() {
        if (!overlay.isConnected) document.body.appendChild(overlay);
        tick();
      },
      finish() {
        if (destroyed) return;
        cancelAnimationFrame(frameId);
        render();
        overlay.classList.add('is-finished');
        setTimeout(() => this.destroy(), 520);
      },
      destroy() {
        destroyed = true;
        cancelAnimationFrame(frameId);
        overlay.remove();
      }
    };
  }

  function cleanupCanvasOverlay(finish = false) {
    const overlay = activeCanvasOverlay;
    activeCanvasOverlay = null;
    if (!overlay) return;
    if (finish) overlay.finish();
    else overlay.destroy();
  }

  async function replaceInCanvas(find, replacement, isRegex, dryRun, scope = {}) {
    const api = getTaptopApi();
    const layout = api?.layout;
    const tags = getTagEntries(layout?.tree);
    const pattern = makePattern(find, isRegex);

    if (pattern.error) return { ok: false, message: pattern.error, count: 0, tags: 0 };
    if (!layout || !tags.length) return { ok: false, message: 'Редактор еще загружается', count: 0, tags: 0 };

    const scopedTags = filterTagEntries(tags, layout, scope);
    let total = 0;
    let changedTags = 0;
    let lastYield = performance.now();

    for (let index = 0; index < scopedTags.length; index += 1) {
      const { tag } = scopedTags[index];
      const tagCount = traverseTextFields(tag, (value) => {
        pattern.regex.lastIndex = 0;
        return dryRun
          ? { count: countMatches(value, pattern.regex), value }
          : replaceText(value, pattern.regex, replacement);
      });
      if (tagCount) {
        total += tagCount;
        changedTags += 1;
      }

      if (index % 8 === 7 || performance.now() - lastYield > 16) {
        await nextFrame();
        lastYield = performance.now();
      }
    }

    if (!dryRun && total) {
      try {
        api?.history?.add?.('search and replace text');
      } catch {}
      dispatchUpdate(api);
    }

    return {
      ok: true,
      count: total,
      tags: changedTags,
      message: dryRun
        ? `Найдено ${total} совпадений в ${changedTags} слоях`
        : `Заменено ${total} совпадений в ${changedTags} слоях`
    };
  }

  function dispatchUpdate(api) {
    try {
      const events = api?.events;
      [
        events?.ON_CHANGE,
        events?.ON_CHANGE_TAG,
        events?.ON_CHANGE_TAG_DATA,
        events?.ON_CHANGE_TAG_DISPLAY,
        events?.ON_UPDATE,
        events?.ON_DATA_CHANGE
      ].forEach((eventName) => {
        if (eventName) events.emit?.(eventName);
      });
    } catch {}

    try {
      window.dispatchEvent(new Event('resize'));
    } catch {}
  }

  function setStatus(root, text, state = 'idle') {
    const status = root.querySelector('[data-role="status"]');
    if (!status) return;
    clearTimeout(Number(root.dataset.statusClearTimer || 0));
    delete root.dataset.statusClearTimer;
    status.textContent = text;
    status.dataset.state = state;
  }

  function setTemporaryStatus(root, text, state = 'idle', timeout = 2200) {
    setStatus(root, text, state);
    const timer = setTimeout(() => {
      clearStatus(root);
    }, timeout);
    root.dataset.statusClearTimer = String(timer);
  }

  function clearStatus(root) {
    clearTimeout(Number(root.dataset.statusClearTimer || 0));
    delete root.dataset.statusClearTimer;
    setStatus(root, '', 'idle');
  }

  function setLoading(root, isLoading) {
    root.classList.toggle('is-loading', isLoading);
    root.querySelectorAll('[data-action="count"], button[type="submit"]').forEach((button) => {
      button.disabled = isLoading;
    });
  }

  function showReplaceUndo(root) {
    const button = root.querySelector('[data-action="undo-replace"]');
    if (button) button.hidden = false;
  }

  function hideReplaceUndo(root) {
    const button = root.querySelector('[data-action="undo-replace"]');
    if (button) button.hidden = true;
  }

  function runConstructorUndo() {
    const api = getTaptopApi();
    const history = api?.history;
    const methodNames = ['applyPrev', 'undo', 'back', 'goBack', 'rollback', 'revert', 'previous', 'prev'];

    for (const name of methodNames) {
      const method = history?.[name];
      if (typeof method !== 'function') continue;
      try {
        method.call(history);
        return true;
      } catch {}
    }

    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
    const undoButton = buttons.find((button) => {
      if (!(button instanceof HTMLElement) || !isVisible(button) || button.closest(`.${ROOT_CLASS}`)) return false;
      const text = normalizeText(`${button.textContent || ''} ${button.getAttribute('aria-label') || ''} ${button.getAttribute('title') || ''}`);
      return /(undo|отменить|отмена)/i.test(text) && !/(redo|повтор|вернуть)/i.test(text);
    });

    if (!undoButton) return false;
    undoButton.click();
    return true;
  }

  function waitForPaint() {
    return nextFrame().then(nextFrame);
  }

  async function runSearch(root, values, dryRun) {
    const runToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    root.dataset.searchRunToken = runToken;
    cleanupCanvasOverlay(false);
    activeCanvasOverlay = createCanvasOverlay(values.scope);
    activeCanvasOverlay?.start();
    if (!dryRun) hideReplaceUndo(root);
    setLoading(root, true);
    setStatus(root, dryRun ? 'Ищем...' : 'Заменяем...', 'loading');
    await waitForPaint();

    try {
      if (root.dataset.searchRunToken !== runToken) return;
      const minimumLoading = delay(220);
      const result = await replaceInCanvas(values.find, values.replace, values.regex, dryRun, values.scope);
      await minimumLoading;
      if (root.dataset.searchRunToken !== runToken) return;
      if (result.ok && !dryRun) {
        setTemporaryStatus(root, result.message, 'success');
        if (result.count > 0) showReplaceUndo(root);
      } else {
        setStatus(root, result.message, result.ok ? 'success' : 'error');
      }
    } catch (error) {
      if (root.dataset.searchRunToken !== runToken) return;
      setStatus(root, error?.message || 'Не удалось выполнить поиск', 'error');
    } finally {
      if (root.dataset.searchRunToken === runToken) {
        delete root.dataset.searchRunToken;
        setLoading(root, false);
        cleanupCanvasOverlay(true);
      }
    }
  }

  function closeMenus() {
    document.querySelectorAll(`.${ROOT_CLASS}`).forEach((root) => {
      root.classList.remove(OPEN_CLASS);
      root.querySelector('[data-role="trigger"]')?.setAttribute('aria-expanded', 'false');
    });
  }

  function closePresetDropdowns() {
    document.querySelectorAll(`.${ROOT_CLASS}`).forEach((root) => {
      root.classList.remove('is-preset-dropdown-open');
      root.querySelector('[data-action="toggle-preset-dropdown"]')?.setAttribute('aria-expanded', 'false');
      const menu = root.querySelector('[data-role="preset-dropdown-menu"]');
      if (menu) menu.hidden = true;
      const search = root.querySelector('[data-role="preset-search"]');
      if (search) search.value = '';
    });
  }

  function closeFloatingPopovers() {
    document.querySelectorAll(`.${ROOT_CLASS}`).forEach((root) => {
      root.classList.remove('is-save-popover-open', 'is-preset-settings-open');
      const savePopover = root.querySelector('[data-role="save-template-popover"]');
      if (savePopover) savePopover.hidden = true;
      const settingsPopover = root.querySelector('[data-role="preset-settings-popover"]');
      if (settingsPopover) settingsPopover.hidden = true;
    });
  }

  function closePanels(exceptRoot = null) {
    document.querySelectorAll(`.${ROOT_CLASS}`).forEach((root) => {
      if (root === exceptRoot) return;
      root.classList.remove(PANEL_OPEN_CLASS);
      root.classList.remove('is-save-popover-open');
      root.classList.remove('is-preset-settings-open');
      root.classList.remove('is-preset-dropdown-open');
      const savePopover = root.querySelector('[data-role="save-template-popover"]');
      if (savePopover) savePopover.hidden = true;
      const presetSettingsPopover = root.querySelector('[data-role="preset-settings-popover"]');
      if (presetSettingsPopover) presetSettingsPopover.hidden = true;
      const presetDropdownMenu = root.querySelector('[data-role="preset-dropdown-menu"]');
      if (presetDropdownMenu) presetDropdownMenu.hidden = true;
      root.querySelector('[data-role="trigger"]')?.setAttribute('aria-expanded', 'false');
      delete root.dataset.searchRunToken;
      setLoading(root, false);
      hideReplaceUndo(root);
      clearStatus(root);
      cleanupCanvasOverlay(false);
    });
  }

  function buildRoot() {
    const root = document.createElement('div');
    root.className = ROOT_CLASS;
    root.innerHTML = `
      <button type="button" class="tt-search-replace__trigger" data-role="trigger" aria-label="Дополнительные действия" aria-haspopup="menu" aria-expanded="false">${dotsIcon()}</button>
      <div class="tt-search-replace__menu" role="menu">
        <button type="button" role="menuitem" data-action="open-panel">Поиск и замена</button>
      </div>
      <form class="tt-search-replace__panel" data-role="panel">
        <div class="tt-search-replace__border-loader" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
        <button type="button" class="tt-search-replace__close" data-action="close-panel" aria-label="Закрыть">${closeIcon()}</button>
        <div class="tt-search-replace__title">Поиск и замена</div>
        <div class="tt-search-replace__preset-label">
          <span class="tt-search-replace__label-row">
            <span>Шаблон</span>
            <span class="tt-search-replace__template-note" data-role="template-save-note"></span>
          </span>
          <span class="tt-search-replace__preset-control">
            <span class="tt-search-replace__preset-dropdown" data-role="preset-dropdown">
              <button type="button" class="tt-search-replace__preset-trigger" data-action="toggle-preset-dropdown" aria-haspopup="listbox" aria-expanded="false">
                <span data-role="preset-selected">Пользовательский шаблон</span>
                <span class="tt-search-replace__preset-arrow" aria-hidden="true"></span>
              </button>
              <span class="tt-search-replace__preset-menu" data-role="preset-dropdown-menu" hidden>
                <input type="text" class="tt-search-replace__preset-search" data-role="preset-search" placeholder="Поиск по шаблонам">
                <span class="tt-search-replace__preset-options" data-role="preset-options"></span>
              </span>
              <input type="hidden" name="preset" value="">
            </span>
            <button type="button" class="tt-search-replace__preset-settings" data-action="open-preset-settings" title="Настроить шаблоны" aria-label="Настроить шаблоны">${settingsIcon()}</button>
          </span>
          <div class="tt-search-replace__preset-settings-popover" data-role="preset-settings-popover" hidden>
            <div class="tt-search-replace__preset-settings-list" data-role="preset-settings-list"></div>
          </div>
        </div>
        <label>
          <span>Найти</span>
          <textarea name="find" rows="2" placeholder='например: Текст или "([^"]+)"'></textarea>
        </label>
        <label>
          <span>Заменить на</span>
          <textarea name="replace" rows="2" placeholder="например: Новый текст или «$1»"></textarea>
        </label>
        <details class="tt-search-replace__scope">
          <summary>Ограничить поиск</summary>
          <label>
            <span>Внутри класса</span>
            <input type="text" name="scopeClass" placeholder="container, hero или .section">
          </label>
          <label>
            <span>Только теги/виджеты</span>
            <input type="text" name="scopeTags" placeholder="text, div или button">
          </label>
        </details>
        <div class="tt-search-replace__options">
          <label><input type="checkbox" name="regex"> <span>.* регулярка</span></label>
        </div>
        <div class="tt-search-replace__actions">
          <div class="tt-search-replace__actions-main">
            <button type="button" data-action="count">Найти</button>
            <button type="submit" data-primary="1">Заменить</button>
            <button type="button" class="tt-search-replace__undo-replace" data-action="undo-replace" title="Отменить замену" aria-label="Отменить замену" hidden>${undoIcon()}</button>
          </div>
          <div class="tt-search-replace__save-wrap">
            <button type="button" class="tt-search-replace__save-template" data-action="open-save-template" title="Сохранить как шаблон" aria-label="Сохранить как шаблон">${saveIcon()}</button>
            <div class="tt-search-replace__save-popover" data-role="save-template-popover" hidden>
              <label>
                <span>Заголовок шаблона</span>
                <input type="text" name="templateTitle" placeholder="Например: Кавычки в заголовках">
              </label>
              <button type="button" data-action="save-template-submit">Сохранить</button>
            </div>
          </div>
        </div>
        <div class="tt-search-replace__status" data-role="status"></div>
      </form>
    `;

    const trigger = root.querySelector('[data-role="trigger"]');
    const form = root.querySelector('form');
    const getField = (name) => form.elements.namedItem(name);
    const presetField = getField('preset');
    const presetTrigger = root.querySelector('[data-action="toggle-preset-dropdown"]');
    const presetSearchField = root.querySelector('[data-role="preset-search"]');
    const presetOptions = root.querySelector('[data-role="preset-options"]');
    const presetSelected = root.querySelector('[data-role="preset-selected"]');
    let saveHighlightTimer = 0;
    const getValues = () => ({
      find: String(getField('find')?.value || ''),
      replace: String(getField('replace')?.value || ''),
      regex: !!getField('regex')?.checked,
      scope: {
        className: String(getField('scopeClass')?.value || ''),
        tags: String(getField('scopeTags')?.value || '')
      }
    });
    const applyPreset = (presetId) => {
      const preset = getPresetById(presetId);
      if (!preset) return;
      const scope = normalizePresetScope(preset);
      getField('find').value = preset.find;
      getField('replace').value = preset.replace;
      getField('regex').checked = preset.regex;
      getField('scopeClass').value = scope.className;
      getField('scopeTags').value = scope.tags;
      setStatus(root, `Шаблон выбран: ${preset.label}`, 'idle');
    };
    const clearPresetFields = () => {
      getField('find').value = '';
      getField('replace').value = '';
      getField('regex').checked = false;
      getField('scopeClass').value = '';
      getField('scopeTags').value = '';
      clearStatus(root);
    };
    const getSelectedPresetLabel = () => getPresetById(presetField?.value)?.label || '';
    const setPresetValue = (presetId = '') => {
      const preset = getPresetById(presetId);
      if (presetField) presetField.value = preset ? preset.id : '';
      if (presetSelected) {
        presetSelected.textContent = preset?.label || 'Пользовательский шаблон';
        presetSelected.title = preset?.label || '';
      }
    };
    const renderPresetDropdownOptions = (query = '') => {
      if (!presetOptions) return;
      presetOptions.replaceChildren();

      const customOption = document.createElement('button');
      customOption.type = 'button';
      customOption.className = 'tt-search-replace__preset-option';
      customOption.dataset.presetId = '';
      customOption.setAttribute('role', 'option');
      customOption.textContent = 'Пользовательский шаблон';
      customOption.classList.toggle('is-selected', !presetField?.value);
      if (!normalizeText(query)) presetOptions.appendChild(customOption);

      const presets = getSelectablePresets(query);
      presets.forEach((preset) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'tt-search-replace__preset-option';
        option.dataset.presetId = preset.id;
        option.setAttribute('role', 'option');
        option.textContent = preset.label;
        option.classList.toggle('is-selected', presetField?.value === preset.id);
        presetOptions.appendChild(option);
      });

      if (!presetOptions.children.length) {
        const empty = document.createElement('span');
        empty.className = 'tt-search-replace__preset-empty';
        empty.textContent = 'Ничего не найдено';
        presetOptions.appendChild(empty);
      }
    };
    const refreshPresetSelect = (selectedId = presetField?.value || '') => {
      const selectableIds = new Set(getSelectablePresets().map((preset) => preset.id));
      setPresetValue(selectableIds.has(selectedId) ? selectedId : '');
      renderPresetDropdownOptions(presetSearchField?.value || '');
    };
    const closeSavePopover = () => {
      root.classList.remove('is-save-popover-open');
      const popover = root.querySelector('[data-role="save-template-popover"]');
      if (popover) popover.hidden = true;
    };
    const closePresetDropdown = () => {
      root.classList.remove('is-preset-dropdown-open');
      const menu = root.querySelector('[data-role="preset-dropdown-menu"]');
      if (menu) menu.hidden = true;
      presetTrigger?.setAttribute('aria-expanded', 'false');
      if (presetSearchField) presetSearchField.value = '';
      renderPresetDropdownOptions('');
    };
    const openPresetDropdown = () => {
      const menu = root.querySelector('[data-role="preset-dropdown-menu"]');
      if (!menu) return;
      closeSavePopover();
      closePresetSettings();
      renderPresetDropdownOptions('');
      menu.hidden = false;
      root.classList.add('is-preset-dropdown-open');
      presetTrigger?.setAttribute('aria-expanded', 'true');
      presetSearchField?.focus?.();
    };
    const closePresetSettings = () => {
      root.classList.remove('is-preset-settings-open');
      const popover = root.querySelector('[data-role="preset-settings-popover"]');
      if (popover) popover.hidden = true;
    };
    const persistPresetSettings = (message = '') => {
      savePresetSettings((ok, error) => {
        if (!ok) {
          setStatus(root, error || 'Не удалось сохранить настройки шаблонов', 'error');
          return;
        }
        refreshPresetSelect();
        if (message) setTemporaryStatus(root, message, 'success');
      });
    };
    const renderPresetManager = () => {
      const list = root.querySelector('[data-role="preset-settings-list"]');
      if (!list) return;
      list.replaceChildren();

      getAllPresets().forEach((preset) => {
        const isCustom = preset.id.startsWith(CUSTOM_PRESET_PREFIX);
        const row = document.createElement('div');
        row.className = 'tt-search-replace__preset-row';
        row.draggable = true;
        row.dataset.presetId = preset.id;

        const drag = document.createElement('span');
        drag.className = 'tt-search-replace__preset-drag';
        drag.setAttribute('aria-hidden', 'true');
        drag.textContent = '⋮⋮';

        const toggle = document.createElement('label');
        toggle.className = 'tt-search-replace__preset-toggle';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.action = 'toggle-preset';
        checkbox.checked = !isPresetDisabled(preset.id);
        const title = document.createElement('span');
        title.textContent = preset.label;
        toggle.append(checkbox, title);

        const deleteButton = document.createElement('button');
        const deleteTitle = isCustom ? 'Удалить шаблон' : 'Скрыть шаблон';
        deleteButton.type = 'button';
        deleteButton.dataset.action = 'delete-preset';
        deleteButton.title = deleteTitle;
        deleteButton.setAttribute('aria-label', deleteTitle);
        deleteButton.innerHTML = trashIcon();

        row.append(drag, toggle, deleteButton);
        list.appendChild(row);
      });
    };
    const openPresetSettings = () => {
      const popover = root.querySelector('[data-role="preset-settings-popover"]');
      if (!popover) return;
      renderPresetManager();
      popover.hidden = false;
      root.classList.add('is-preset-settings-open');
    };
    const openSavePopover = () => {
      const popover = root.querySelector('[data-role="save-template-popover"]');
      if (!popover) return;
      closePresetSettings();
      const titleInput = getField('templateTitle');
      titleInput.value = getSelectedPresetLabel();
      popover.hidden = false;
      root.classList.add('is-save-popover-open');
      titleInput.focus();
      titleInput.select();
    };
    const showTemplateSaved = () => {
      const note = root.querySelector('[data-role="template-save-note"]');
      if (note) note.textContent = 'Сохранено в шаблоны';
      root.classList.add('is-template-saved');
      clearTimeout(saveHighlightTimer);
      saveHighlightTimer = setTimeout(() => {
        root.classList.remove('is-template-saved');
        if (note) note.textContent = '';
      }, 1800);
    };
    const saveCurrentTemplate = () => {
      const label = normalizeText(getField('templateTitle')?.value || '');
      const values = getValues();
      if (!label) {
        setStatus(root, 'Введите заголовок шаблона', 'error');
        getField('templateTitle')?.focus?.();
        return;
      }
      if (!values.find) {
        setStatus(root, 'Введите текст для поиска', 'error');
        getField('find')?.focus?.();
        return;
      }

      const preset = {
        id: `${CUSTOM_PRESET_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}`,
        label,
        find: values.find,
        replace: values.replace,
        regex: values.regex,
        scope: values.scope
      };

      const previousPresets = customPresets;
      customPresets = [preset, ...customPresets].slice(0, 50);
      saveCustomPresets((ok, message) => {
        if (!ok) {
          customPresets = previousPresets;
          setStatus(root, message || 'Не удалось сохранить шаблон', 'error');
          return;
        }

        if (presetSearchField) presetSearchField.value = '';
        refreshPresetSelect(preset.id);
        closeSavePopover();
        renderPresetManager();
        showTemplateSaved();
        setTemporaryStatus(root, `Шаблон сохранен: ${label}`, 'success');
      });
    };

    refreshPresetSelect();
    loadPresetState(() => {
      refreshPresetSelect();
      renderPresetManager();
    });

    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = root.classList.contains(OPEN_CLASS) || root.classList.contains(PANEL_OPEN_CLASS);
      closeMenus();
      closePanels();
      if (open) return;

      root.classList.add(OPEN_CLASS);
      trigger.setAttribute('aria-expanded', 'true');
    });

    root.querySelector('[data-action="open-panel"]').addEventListener('click', () => {
      closeMenus();
      closePanels(root);
      root.classList.add(PANEL_OPEN_CLASS);
      getField('find')?.focus?.();
    });

    root.querySelector('[data-action="close-panel"]').addEventListener('click', () => {
      closeSavePopover();
      closePresetDropdown();
      closePresetSettings();
      closeMenus();
      closePanels();
    });

    root.querySelector('[data-action="count"]').addEventListener('click', () => {
      const values = getValues();
      runSearch(root, values, true);
    });

    root.querySelector('[data-action="undo-replace"]').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      hideReplaceUndo(root);
      if (!runConstructorUndo()) setTemporaryStatus(root, 'Не удалось вызвать отмену конструктора', 'error');
    });

    presetTrigger?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (root.classList.contains('is-preset-dropdown-open')) closePresetDropdown();
      else openPresetDropdown();
    });

    presetSearchField?.addEventListener('input', () => {
      renderPresetDropdownOptions(presetSearchField.value);
    });

    presetSearchField?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePresetDropdown();
        presetTrigger?.focus?.();
        return;
      }
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const firstOption = presetOptions?.querySelector('.tt-search-replace__preset-option');
      if (!firstOption) return;
      const id = firstOption.dataset.presetId || '';
      setPresetValue(id);
      closePresetDropdown();
      if (id) applyPreset(id);
      else clearPresetFields();
    });

    presetOptions?.addEventListener('click', (event) => {
      const option = event.target?.closest?.('.tt-search-replace__preset-option');
      if (!option) return;
      const id = option.dataset.presetId || '';
      setPresetValue(id);
      closePresetDropdown();
      if (id) applyPreset(id);
      else clearPresetFields();
    });

    root.querySelector('[data-action="open-preset-settings"]').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeSavePopover();
      closePresetDropdown();
      if (root.classList.contains('is-preset-settings-open')) closePresetSettings();
      else openPresetSettings();
    });

    const presetSettingsList = root.querySelector('[data-role="preset-settings-list"]');
    presetSettingsList?.addEventListener('change', (event) => {
      const checkbox = event.target;
      if (!(checkbox instanceof HTMLInputElement) || checkbox.dataset.action !== 'toggle-preset') return;
      const row = checkbox.closest('[data-preset-id]');
      const id = row?.dataset?.presetId || '';
      if (!id) return;
      setPresetDisabled(id, !checkbox.checked);
      persistPresetSettings(checkbox.checked ? 'Шаблон включен' : 'Шаблон отключен');
    });

    presetSettingsList?.addEventListener('click', (event) => {
      const button = event.target?.closest?.('[data-action="delete-preset"]');
      if (!button) return;
      const row = button.closest('[data-preset-id]');
      const id = row?.dataset?.presetId || '';
      if (!id) return;

      if (id.startsWith(CUSTOM_PRESET_PREFIX)) {
        const previousPresets = customPresets;
        const previousSettings = presetSettings;
        deleteCustomPreset(id);
        saveCustomPresets((customOk, customError) => {
          if (!customOk) {
            customPresets = previousPresets;
            presetSettings = previousSettings;
            setStatus(root, customError || 'Не удалось удалить шаблон', 'error');
            return;
          }
          savePresetSettings((settingsOk, settingsError) => {
            if (!settingsOk) setStatus(root, settingsError || 'Не удалось сохранить настройки шаблонов', 'error');
            renderPresetManager();
            refreshPresetSelect();
            if (settingsOk) setTemporaryStatus(root, 'Шаблон удален', 'success');
            else setStatus(root, 'Шаблон удален', 'error');
          });
        });
        return;
      }

      setPresetDisabled(id, true);
      renderPresetManager();
      persistPresetSettings('Шаблон скрыт');
    });

    let draggedPresetId = '';
    presetSettingsList?.addEventListener('dragstart', (event) => {
      const row = event.target?.closest?.('[data-preset-id]');
      draggedPresetId = row?.dataset?.presetId || '';
      if (!draggedPresetId) return;
      row.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', draggedPresetId);
    });

    presetSettingsList?.addEventListener('dragover', (event) => {
      if (!draggedPresetId) return;
      event.preventDefault();
      const targetRow = event.target?.closest?.('[data-preset-id]');
      if (!targetRow || targetRow.dataset.presetId === draggedPresetId) return;
      const draggedRow = presetSettingsList.querySelector(`[data-preset-id="${draggedPresetId}"]`);
      if (!draggedRow) return;
      const rect = targetRow.getBoundingClientRect();
      const before = event.clientY < rect.top + rect.height / 2;
      presetSettingsList.insertBefore(draggedRow, before ? targetRow : targetRow.nextSibling);
    });

    presetSettingsList?.addEventListener('dragend', () => {
      if (!draggedPresetId) return;
      presetSettingsList.querySelector('.is-dragging')?.classList.remove('is-dragging');
      draggedPresetId = '';
      setPresetOrder(Array.from(presetSettingsList.querySelectorAll('[data-preset-id]')).map((row) => row.dataset.presetId));
      persistPresetSettings('Порядок шаблонов сохранен');
    });

    root.querySelector('[data-action="open-save-template"]').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closePresetDropdown();
      closePresetSettings();
      if (root.classList.contains('is-save-popover-open')) closeSavePopover();
      else openSavePopover();
    });

    root.querySelector('[data-action="save-template-submit"]').addEventListener('click', (event) => {
      event.preventDefault();
      saveCurrentTemplate();
    });

    getField('templateTitle')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveCurrentTemplate();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSavePopover();
      }
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = getValues();
      runSearch(root, values, false);
    });

    form.addEventListener('click', (event) => {
      const target = event.target;
      if (!target?.closest?.('[data-role="preset-dropdown"]')) closePresetDropdown();
      if (
        !target?.closest?.('[data-role="preset-settings-popover"]')
        && !target?.closest?.('[data-action="open-preset-settings"]')
      ) {
        closePresetSettings();
      }
      if (!target?.closest?.('.tt-search-replace__save-wrap')) closeSavePopover();
      event.stopPropagation();
    });
    return root;
  }

  function findTabsHost() {
    const direct = document.querySelector('.tt-design-mode-right-panel__tabs .tt-tabs__list');
    if (direct instanceof HTMLElement && isVisible(direct)) return direct;

    const candidates = Array.from(document.querySelectorAll('ul, div, nav, section, header'))
      .filter(isVisible)
      .filter((el) => {
        const text = normalizeText(el.textContent);
        return text.includes('Дизайн') && text.includes('Настройки') && text.includes('Анимации');
      })
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return (ar.width * ar.height) - (br.width * br.height);
      });

    return candidates.find((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width >= 220 && rect.width <= 760 && rect.height >= 36 && rect.height <= 110;
    }) || null;
  }

  function mount() {
    const host = findTabsHost();
    if (!host) return false;
    if (host.querySelector(`.${ROOT_CLASS}`) || host.querySelector(`.${ITEM_CLASS}`)) return true;

    host.classList.add(HOST_CLASS);
    if (host.matches('ul, ol')) {
      const item = document.createElement('li');
      item.className = ITEM_CLASS;
      item.appendChild(buildRoot());
      host.appendChild(item);
    } else {
      host.appendChild(buildRoot());
    }
    return true;
  }

  function onDocumentClick(event) {
    if (event.target?.closest?.(`.${ROOT_CLASS}`)) return;
    closeMenus();
    closePresetDropdowns();
    closeFloatingPopovers();
  }

  function onKeyDown(event) {
    if (event.key !== 'Escape') return;
    closeMenus();
    closePanels();
  }

  document.addEventListener('click', onDocumentClick, true);
  document.addEventListener('keydown', onKeyDown, true);

  mount();
  mountObserver = new MutationObserver(() => mount());
  mountObserver.observe(document.documentElement, { childList: true, subtree: true });

  window[STATE_KEY] = {
    destroy() {
      mountObserver?.disconnect?.();
      document.removeEventListener('click', onDocumentClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.querySelectorAll(`.${ROOT_CLASS}`).forEach((node) => {
        const host = node.parentElement;
        node.remove();
        host?.classList?.remove?.(HOST_CLASS);
      });
      document.querySelectorAll(`.${ITEM_CLASS}`).forEach((node) => {
        const host = node.parentElement;
        node.remove();
        host?.classList?.remove?.(HOST_CLASS);
      });
      if (window[STATE_KEY] === this) delete window[STATE_KEY];
    }
  };
})();
