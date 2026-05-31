(function () {
  const STATE_KEY = '__ttEnhancerSearchReplace';
  const ROOT_CLASS = 'tt-search-replace';
  const ITEM_CLASS = 'tt-search-replace-tabs-item';
  const HOST_CLASS = 'tt-search-replace-tabs-host';
  const OPEN_CLASS = 'is-open';
  const PANEL_OPEN_CLASS = 'is-panel-open';

  try {
    window[STATE_KEY]?.destroy?.();
  } catch {}

  let runtimeRequire = null;
  let mountObserver = null;
  let activeCanvasOverlay = null;

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

  function presetOptionsHtml() {
    return [
      '<option value="">Пользовательский шаблон</option>',
      ...PRESETS.map((preset) => `<option value="${preset.id}">${preset.label}</option>`)
    ].join('');
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
    status.textContent = text;
    status.dataset.state = state;
  }

  function clearStatus(root) {
    setStatus(root, '', 'idle');
  }

  function setLoading(root, isLoading) {
    root.classList.toggle('is-loading', isLoading);
    root.querySelectorAll('[data-action="count"], button[type="submit"]').forEach((button) => {
      button.disabled = isLoading;
    });
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
    setLoading(root, true);
    setStatus(root, dryRun ? 'Ищем...' : 'Заменяем...', 'loading');
    await waitForPaint();

    try {
      if (root.dataset.searchRunToken !== runToken) return;
      const minimumLoading = delay(220);
      const result = await replaceInCanvas(values.find, values.replace, values.regex, dryRun, values.scope);
      await minimumLoading;
      if (root.dataset.searchRunToken !== runToken) return;
      setStatus(root, result.message, result.ok ? 'success' : 'error');
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

  function closePanels(exceptRoot = null) {
    document.querySelectorAll(`.${ROOT_CLASS}`).forEach((root) => {
      if (root === exceptRoot) return;
      root.classList.remove(PANEL_OPEN_CLASS);
      root.querySelector('[data-role="trigger"]')?.setAttribute('aria-expanded', 'false');
      delete root.dataset.searchRunToken;
      setLoading(root, false);
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
        <label>
          <span>Шаблон</span>
          <select name="preset">
            ${presetOptionsHtml()}
          </select>
        </label>
        <label>
          <span>Найти</span>
          <textarea name="find" rows="2" placeholder='например: "([^"]+)"'></textarea>
        </label>
        <label>
          <span>Заменить на</span>
          <textarea name="replace" rows="2" placeholder='например: «$1»'></textarea>
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
          <button type="button" data-action="count">Найти</button>
          <button type="submit" data-primary="1">Заменить</button>
        </div>
        <div class="tt-search-replace__status" data-role="status"></div>
      </form>
    `;

    const trigger = root.querySelector('[data-role="trigger"]');
    const form = root.querySelector('form');
    const getField = (name) => form.elements.namedItem(name);
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
      const preset = PRESETS.find((item) => item.id === presetId);
      if (!preset) return;
      getField('find').value = preset.find;
      getField('replace').value = preset.replace;
      getField('regex').checked = preset.regex;
      setStatus(root, `Шаблон выбран: ${preset.label}`, 'idle');
    };

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
      closeMenus();
      closePanels();
    });

    root.querySelector('[data-action="count"]').addEventListener('click', () => {
      const values = getValues();
      runSearch(root, values, true);
    });

    getField('preset').addEventListener('change', (event) => {
      applyPreset(event.target.value);
      getField('find')?.focus?.();
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = getValues();
      runSearch(root, values, false);
    });

    form.addEventListener('click', (event) => event.stopPropagation());
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
