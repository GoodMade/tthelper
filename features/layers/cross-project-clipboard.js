(function () {
  const STATE_KEY = '__ttEnhancerCrossProjectClipboard';
  const CLIPBOARD_KEY = 'clipboardData';
  const PAGE_SOURCE = 'tt-enhancer-cross-project-clipboard';
  const BRIDGE_SOURCE = 'tt-enhancer-cross-project-clipboard-bridge';
  const UNIQUE_CLASS_RE = /--u-([a-z0-9]+)$/;
  const PAGE_SESSION_ID = `page_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const IGNORED_CLASS_CONFLICT_NAMES = new Set(['helper--d-none']);
  const FALLBACK_SYSTEM_CLASS_NAMES = new Set([
    'div',
    'image',
    'image__img',
    'link',
    'rich-text',
    'root',
    'section',
    'svg-icon',
    'text',
    'tt-rich-text'
  ]);

  try {
    window[STATE_KEY]?.destroy?.();
  } catch {}

  const originalSetItem = Storage.prototype.setItem;
  let applyingExternalClipboard = false;
  let sourceClipboardRaw = '';
  let sourceClipboardIsExternal = false;
  let suppressClipboardSaveDepth = 0;
  let suppressClipboardSaveUntil = 0;
  let lastLocalWriteAt = 0;
  // Timestamp + origin of the value currently materialized in localStorage[CLIPBOARD_KEY].
  // Used so a freshly arrived (e.g. catalog / cross-project) clipboard is never
  // clobbered by a stale in-memory remembered value, and vice versa.
  let sourceClipboardSavedAt = 0;
  let currentClipboardSavedAt = 0;
  let currentClipboardIsExternal = false;
  let runtimeRequire = null;
  let activeConflictDialog = null;
  let pastePatchTimer = 0;
  let patchedClipboard = null;
  let originalPasteFromClipboard = null;
  let originalGetClipboard = null;
  let resolvingPaste = false;
  const bridgeRefreshTimers = new Set();
  let lastBridgeLoadRequestedAt = 0;

  function isLayerClipboardValue(value) {
    try {
      const data = JSON.parse(String(value || ''));
      return !!(data && data.copiedLayout && data.action && data.tagID);
    } catch {
      return false;
    }
  }

  function postToBridge(type, payload) {
    window.postMessage({ source: PAGE_SOURCE, type, payload }, '*');
  }

  function requestBridgeClipboardLoad(reason = 'manual') {
    const now = Date.now();
    // Avoid message spam while still making focus / paste refreshes responsive.
    if (now - lastBridgeLoadRequestedAt < 80) return;
    lastBridgeLoadRequestedAt = now;
    postToBridge('load', {
      reason,
      requesterId: PAGE_SESSION_ID,
      requestedAt: now,
      pageKey: getCurrentPageKey(),
      pageUrl: location.href,
      pageOrigin: location.origin
    });
  }

  function scheduleBridgeClipboardRefresh(reason = 'refresh') {
    requestBridgeClipboardLoad(reason);
    [120, 350, 900].forEach((delay) => {
      const timer = setTimeout(() => {
        bridgeRefreshTimers.delete(timer);
        requestBridgeClipboardLoad(`${reason}:${delay}`);
      }, delay);
      bridgeRefreshTimers.add(timer);
    });
  }

  function getCurrentPageKey() {
    try {
      return new URL(location.href).href;
    } catch {
      return String(location.href || '');
    }
  }

  function getPayloadPageKey(payload) {
    if (payload?.pageKey) return String(payload.pageKey);
    if (!payload?.pageUrl) return '';

    try {
      return new URL(String(payload.pageUrl), location.href).href;
    } catch {
      return String(payload.pageUrl || '');
    }
  }

  function isSamePagePayload(payload) {
    if (payload?.sourceId && payload.sourceId === PAGE_SESSION_ID) return true;
    const payloadPageKey = getPayloadPageKey(payload);
    return !!payloadPageKey && payloadPageKey === getCurrentPageKey();
  }

  function rememberSourceClipboardRaw(raw, isExternal = false, savedAt = Date.now()) {
    const next = String(raw || '');
    if (!isLayerClipboardValue(next)) return;
    sourceClipboardRaw = next;
    sourceClipboardIsExternal = Boolean(isExternal);
    sourceClipboardSavedAt = Number(savedAt) || Date.now();
  }

  function isClipboardSaveSuppressed() {
    return suppressClipboardSaveDepth > 0 || Date.now() < suppressClipboardSaveUntil;
  }

  function suppressClipboardSaveDuringPaste(callback) {
    suppressClipboardSaveDepth += 1;
    suppressClipboardSaveUntil = Date.now() + 1200;
    try {
      return callback();
    } finally {
      suppressClipboardSaveDepth = Math.max(0, suppressClipboardSaveDepth - 1);
      suppressClipboardSaveUntil = Date.now() + 1200;
    }
  }

  function setClipboardRaw(raw) {
    if (!isLayerClipboardValue(raw)) return false;

    const normalized = normalizeLayerVersionForCurrentProject(raw);
    applyingExternalClipboard = true;
    try {
      originalSetItem.call(localStorage, CLIPBOARD_KEY, String(normalized));
      syncNativeClipboardState();
      scheduleNativeClipboardSync();
      return true;
    } catch {
      return false;
    } finally {
      applyingExternalClipboard = false;
    }
  }

  function restoreSourceClipboardForPaste() {
    const currentRaw = localStorage.getItem(CLIPBOARD_KEY);
    const currentIsLayer = isLayerClipboardValue(currentRaw);

    // Only let the in-memory remembered clipboard win over what is currently in
    // localStorage when it is a valid layer AND it is at least as fresh as the
    // current value. This prevents a previously exported/imported JSON buffer
    // (json-transfer) from overwriting a just-copied catalog/cross-project layer.
    if (
      sourceClipboardRaw &&
      sourceClipboardRaw !== currentRaw &&
      isLayerClipboardValue(sourceClipboardRaw) &&
      (!currentIsLayer || sourceClipboardSavedAt >= currentClipboardSavedAt)
    ) {
      setClipboardRaw(sourceClipboardRaw);
      currentClipboardSavedAt = sourceClipboardSavedAt;
      currentClipboardIsExternal = sourceClipboardIsExternal;
      return sourceClipboardRaw;
    }

    // Otherwise keep the current value, but force the native Taptop clipboard
    // store to re-read it synchronously, so paste never uses a stale in-memory
    // buffer that is out of sync with localStorage.
    if (currentIsLayer) syncNativeClipboardState();
    return currentRaw;
  }

  function getRuntimeRequire() {
    if (runtimeRequire) return runtimeRequire;

    const chunk = window.rspackChunktaptop_design_editor;
    if (!chunk || typeof chunk.push !== 'function') return null;

    try {
      const chunkId = `tt-enhancer-clipboard-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      chunk.push([[chunkId], {}, (req) => {
        runtimeRequire = req;
      }]);
    } catch {}

    return runtimeRequire;
  }

  function syncNativeClipboardState() {
    try {
      const req = getRuntimeRequire();
      const store = req?.(34369)?.N;
      store?.updateState?.();
    } catch {}
  }

  function getTaptopApi() {
    const req = getRuntimeRequire();
    if (!req) return null;

    try {
      return {
        clipboard: req(6269)?.A,
        events: req(91893)?.A,
        layers: req(39510)?.A,
        layout: req(36945)?.A,
        systemClassNames: req(71842)?.A?.classNames
      };
    } catch {
      return null;
    }
  }

  function getCurrentProjectTreeVersion() {
    try {
      const version = getTaptopApi()?.layout?.tree?.version;
      return /^\d+\.\d+\.\d+$/.test(String(version)) ? String(version) : null;
    } catch {
      return null;
    }
  }

  // Taptop's paste handler (C.pasteFromClipboard) rejects a clipboard layer
  // unless copiedLayout.tree.version EXACTLY equals the destination project's
  // current tree.version, which is a semver string like "1.0.0". Catalog /
  // cross-project layers are stamped with a foreign or numeric version (e.g. the
  // number 1), so the strict !== check fails, pasteFromClipboard returns null,
  // and nothing is inserted (the previously copied/exported layer appears to
  // "win"). Re-stamp the incoming layer with the destination project's version
  // so it passes the gate. If the runtime version cannot be read yet, leave the
  // value untouched (degrades to previous behaviour).
  function normalizeLayerVersionForCurrentProject(raw) {
    const targetVersion = getCurrentProjectTreeVersion();
    if (!targetVersion) return raw;
    try {
      const data = JSON.parse(String(raw));
      const tree = data?.copiedLayout?.tree;
      if (!tree) return raw;
      if (String(tree.version) === targetVersion) return raw;
      tree.version = targetVersion;
      return JSON.stringify(data);
    } catch {
      return raw;
    }
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalizeClassToken(value) {
    return String(value || '').trim().replace(/^\./, '');
  }

  function selectorClassNames(value) {
    const names = new Set();
    String(value || '').replace(/\.([_a-zA-Z-][_a-zA-Z0-9-]*)/g, (_, name) => {
      if (name) names.add(name);
      return '';
    });
    return names;
  }

  function collectClassValues(collection) {
    const values = new Set();
    const addValue = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return;
      if (raw.includes('.')) selectorClassNames(raw).forEach((name) => values.add(name));
      if (/[.#:>+~,[\]()]/.test(raw)) return;
      raw.split(/\s+/).forEach((token) => {
        const normalized = normalizeClassToken(token);
        if (normalized) values.add(normalized);
      });
    };
    const add = (item, fallbackValue) => {
      if (!item) return;
      if (typeof item === 'string') addValue(item);
      if (item?.value) addValue(item.value);
      if (item?.name) addValue(item.name);
      if (item?.className) addValue(item.className);
      selectorClassNames(item?.selectorText || fallbackValue).forEach(addValue);
    };

    if (!collection) return values;
    if (Array.isArray(collection.list)) collection.list.forEach(add);
    if (collection.map instanceof Map) collection.map.forEach((item, key) => add(item, key));
    if (collection.map && typeof collection.map.get === 'function' && typeof collection.map.forEach === 'function') {
      try {
        collection.map.forEach((item, key) => add(item, key));
      } catch {}
    }
    if (collection.map && typeof collection.map === 'object') {
      Object.entries(collection.map).forEach(([key, item]) => add(item, key));
    }
    if (typeof collection.forEach === 'function') {
      try {
        collection.forEach((item, key) => add(item, key));
      } catch {}
    }
    if (typeof collection.values === 'function') {
      try {
        Array.from(collection.values()).forEach(add);
      } catch {}
    }
    if (typeof collection.toArray === 'function') {
      try {
        collection.toArray().forEach(add);
      } catch {}
    }
    if (typeof collection.serialize === 'function') {
      try {
        const serialized = collection.serialize();
        if (Array.isArray(serialized?.list)) serialized.list.forEach(add);
        if (serialized?.map) Object.entries(serialized.map).forEach(([key, item]) => add(item, key));
      } catch {}
    }

    return values;
  }

  function collectClassIds(collection) {
    const ids = new Set();
    const add = (item, fallbackId) => {
      const id = item?.id || fallbackId;
      if (id) ids.add(String(id));
    };

    if (!collection) return ids;
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
    if (typeof collection.toArray === 'function') {
      try {
        collection.toArray().forEach(add);
      } catch {}
    }
    if (typeof collection.serialize === 'function') {
      try {
        const serialized = collection.serialize();
        if (Array.isArray(serialized?.list)) serialized.list.forEach(add);
        if (serialized?.map) Object.entries(serialized.map).forEach(([id, item]) => add(item, id));
      } catch {}
    }

    return ids;
  }

  function isSystemClassName(value) {
    const name = String(value || '');
    const api = getTaptopApi();
    return UNIQUE_CLASS_RE.test(name) || FALLBACK_SYSTEM_CLASS_NAMES.has(name) || !!api?.systemClassNames?.has?.(name);
  }

  function collectUserClassValues(collection) {
    const values = new Set();
    collectClassValues(collection).forEach((value) => {
      if (!isSystemClassName(value) && !IGNORED_CLASS_CONFLICT_NAMES.has(value)) values.add(value);
    });
    return values;
  }

  function getCurrentClassNames() {
    const api = getTaptopApi();
    const values = new Set();
    [
      api?.layout?.classNameManager,
      api?.layout?.mainClassNameCollection,
      api?.layout?.designClassNameCollection
    ].forEach((collection) => {
      collectUserClassValues(collection).forEach((value) => values.add(value));
    });
    return values;
  }

  function getImportedClassNames(data) {
    const values = new Set();
    const layout = data?.copiedLayout;
    [
      layout?.classNameManager,
      layout?.mainClassNameCollection,
      layout?.designClassNameCollection,
      layout?.mainSelectorCollection,
      layout?.designSelectorCollection,
      layout?.cmSelectorCollection,
      layout?.animationSelectorCollection
    ].forEach((collection) => {
      collectUserClassValues(collection).forEach((value) => values.add(value));
    });
    return values;
  }

  function getUsedClassIds(data) {
    const api = getTaptopApi();
    const values = new Set();
    [
      api?.layout?.mainClassNameCollection,
      api?.layout?.designClassNameCollection,
      api?.layout?.classNameManager,
      data?.copiedLayout?.mainClassNameCollection,
      data?.copiedLayout?.designClassNameCollection,
      data?.copiedLayout?.classNameManager
    ].forEach((collection) => {
      collectClassIds(collection).forEach((id) => values.add(id));
    });
    return values;
  }

  function getClassConflicts(data) {
    const current = getCurrentClassNames();
    return Array.from(getImportedClassNames(data)).filter((value) => current.has(value)).sort();
  }

  function makeNextClassName(base, used) {
    let index = 1;
    let next = `${base}-${index}`;
    while (used.has(next)) {
      index += 1;
      next = `${base}-${index}`;
    }
    used.add(next);
    return next;
  }

  function makeNextClassId(used) {
    let id = '';
    do {
      id = `class_i${Math.random().toString(36).slice(2, 10).padEnd(8, '0')}`;
    } while (used.has(id));
    used.add(id);
    return id;
  }

  function renameClassCollection(collection, renameMap, usedIds) {
    const idMap = new Map();
    if (!collection?.map) return idMap;

    const nextMap = {};
    Object.entries(collection.map).forEach(([id, item]) => {
      if (!item?.value || !renameMap.has(item.value)) {
        nextMap[id] = item;
        return;
      }

      const nextId = makeNextClassId(usedIds);
      idMap.set(item.id || id, nextId);
      item.id = nextId;
      item.value = renameMap.get(item.value);
      nextMap[nextId] = item;
    });
    collection.map = nextMap;

    if (Array.isArray(collection.list)) {
      collection.list.forEach((item) => {
        if (item?.id && idMap.has(item.id)) item.id = idMap.get(item.id);
        if (item?.value && renameMap.has(item.value)) item.value = renameMap.get(item.value);
      });
    }

    if (collection.countMap) {
      const nextCountMap = {};
      Object.values(collection.map).forEach((item) => {
        if (!item?.value) return;
        nextCountMap[item.value] = Math.max(nextCountMap[item.value] || 0, 1);
      });
      collection.countMap = nextCountMap;
    }

    return idMap;
  }

  function remapTreeClassNameIds(tree, idMap) {
    if (!tree?.tags || !idMap.size) return;
    Object.values(tree.tags).forEach((tag) => {
      if (!Array.isArray(tag?.classNameIds)) return;
      tag.classNameIds = tag.classNameIds.map((id) => idMap.get(id) || id);
    });
  }

  function replaceClassSelectors(text, renameMap) {
    let next = String(text || '');
    renameMap.forEach((to, from) => {
      next = next.replace(new RegExp(`\\.${escapeRegExp(from)}(?![-_a-zA-Z0-9])`, 'g'), `.${to}`);
    });
    return next;
  }

  function renameSelectorCollection(collection, renameMap) {
    if (!collection?.map) return;
    const nextMap = {};
    Object.entries(collection.map).forEach(([key, selector]) => {
      const nextKey = replaceClassSelectors(key, renameMap);
      if (selector?.selectorText) selector.selectorText = replaceClassSelectors(selector.selectorText, renameMap);
      nextMap[nextKey] = selector;
    });
    collection.map = nextMap;
  }

  function createClassCopies(data, conflicts) {
    const next = deepClone(data);
    const used = new Set([...getCurrentClassNames(), ...getImportedClassNames(next)]);
    const usedIds = getUsedClassIds(next);
    const renameMap = new Map(conflicts.map((name) => [name, makeNextClassName(name, used)]));
    const layout = next.copiedLayout;

    const idMap = renameClassCollection(layout?.mainClassNameCollection, renameMap, usedIds);
    remapTreeClassNameIds(layout?.tree, idMap);
    renameSelectorCollection(layout?.mainSelectorCollection, renameMap);
    renameSelectorCollection(layout?.designSelectorCollection, renameMap);
    renameSelectorCollection(layout?.cmSelectorCollection, renameMap);
    renameSelectorCollection(layout?.animationSelectorCollection, renameMap);

    return next;
  }

  function ensureConflictDialogStyles() {
    if (document.querySelector('style[data-tt-layer-class-conflict]')) return;
    const style = document.createElement('style');
    style.dataset.ttLayerClassConflict = '1';
    style.textContent = `
      .tt-layer-class-conflict-overlay {
        position: fixed; inset: 0; z-index: 2147482700;
        display: flex; align-items: center; justify-content: center;
        background: rgba(17, 24, 39, 0.36);
      }
      .tt-layer-class-conflict-dialog {
        width: min(430px, calc(100vw - 32px)); padding: 18px;
        border-radius: 8px; background: #fff; color: #20242a;
        box-shadow: 0 18px 52px rgba(0, 0, 0, 0.24);
        font: 13px/1.45 Inter, Arial, sans-serif;
      }
      .tt-layer-class-conflict-dialog h3 { margin: 0 0 8px; font: 600 15px/1.3 Inter, Arial, sans-serif; }
      .tt-layer-class-conflict-dialog p { margin: 0 0 12px; color: #596171; }
      .tt-layer-class-conflict-list { margin: 0 0 14px; padding: 8px 10px; max-height: 96px; overflow: auto; border-radius: 6px; background: #f5f7fb; color: #333; }
      .tt-layer-class-conflict-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
      .tt-layer-class-conflict-actions button { min-height: 30px; padding: 0 12px; border: 1px solid #d8dde8; border-radius: 4px; background: #fff; color: #333; cursor: pointer; font: 500 12px/1 Inter, Arial, sans-serif; }
      .tt-layer-class-conflict-actions button[data-primary="1"] { border-color: #0d7cff; background: #0d7cff; color: #fff; }
    `;
    document.documentElement.appendChild(style);
  }

  function chooseClassConflictMode(conflicts) {
    if (!conflicts.length) return Promise.resolve('project');
    if (activeConflictDialog) activeConflictDialog.remove();

    ensureConflictDialogStyles();

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'tt-layer-class-conflict-overlay';
      activeConflictDialog = overlay;

      const dialog = document.createElement('div');
      dialog.className = 'tt-layer-class-conflict-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');

      const list = conflicts.slice(0, 12).join(', ') + (conflicts.length > 12 ? ` и еще ${conflicts.length - 12}` : '');
      dialog.innerHTML = `
        <h3>Совпадение классов</h3>
        <p>В проекте уже есть классы с такими именами. Как импортировать слой?</p>
        <div class="tt-layer-class-conflict-list"></div>
        <div class="tt-layer-class-conflict-actions">
          <button type="button" data-action="project">Использовать классы проекта</button>
          <button type="button" data-action="copy" data-primary="1">Создать копии классов</button>
          <button type="button" data-action="cancel">Отмена</button>
        </div>
      `;
      dialog.querySelector('.tt-layer-class-conflict-list').textContent = list;

      const close = (mode) => {
        overlay.remove();
        if (activeConflictDialog === overlay) activeConflictDialog = null;
        resolve(mode);
      };

      dialog.addEventListener('click', (event) => {
        const action = event.target?.closest?.('button')?.dataset.action;
        if (action) close(action);
      });
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close('cancel');
      });

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      dialog.querySelector('[data-primary="1"]')?.focus?.();
    });
  }

  async function resolveClassConflicts(data) {
    const conflicts = getClassConflicts(data);
    if (!conflicts.length) return data;

    const mode = await chooseClassConflictMode(conflicts);
    if (mode === 'copy') return createClassCopies(data, conflicts);
    if (mode === 'project') return data;
    return null;
  }

  function scheduleNativeClipboardSync() {
    [0, 100, 400, 1000].forEach((delay) => {
      setTimeout(syncNativeClipboardState, delay);
    });
  }

  function emitLayoutChanged(api = getTaptopApi()) {
    try {
      api?.layers?.setMap?.();
    } catch {}

    try {
      const events = api?.events;
      [
        events?.ON_HTML_UPDATE,
        events?.ON_CSS_CHANGE,
        events?.ON_CHANGE_TAG_DISPLAY,
        events?.ON_CHANGE,
        events?.ON_CHANGE_TAG,
        events?.ON_CHANGE_TAG_DATA,
        events?.ON_UPDATE,
        events?.ON_DATA_CHANGE
      ].forEach((eventName) => {
        if (eventName === events?.ON_CSS_CHANGE) events.emit?.(eventName, null, true);
        else if (eventName) events.emit?.(eventName);
      });
    } catch {}

    try {
      window.dispatchEvent(new Event('resize'));
    } catch {}
  }

  function scheduleLayoutRefresh() {
    [0, 80, 250, 700].forEach((delay) => {
      setTimeout(() => emitLayoutChanged(), delay);
    });
  }

  function saveClipboard(raw) {
    if (!isLayerClipboardValue(raw)) return;
    const savedAt = Date.now();
    rememberSourceClipboardRaw(raw, false, savedAt);
    currentClipboardSavedAt = savedAt;
    currentClipboardIsExternal = false;
    postToBridge('save', {
      raw: String(raw),
      savedAt,
      sourceId: PAGE_SESSION_ID,
      pageKey: getCurrentPageKey(),
      pageUrl: location.href,
      pageOrigin: location.origin
    });
  }

  function applyExternalClipboard(payload) {
    if (!payload?.raw || !isLayerClipboardValue(payload.raw)) return;

    const raw = normalizeLayerVersionForCurrentProject(payload.raw);
    const payloadSavedAt = Number(payload.savedAt) || Date.now();
    const isExternalPayload = !isSamePagePayload(payload);
    const currentRaw = localStorage.getItem(CLIPBOARD_KEY);

    // Already applied: just refresh bookkeeping. We intentionally do NOT compare
    // against lastLocalWriteAt here — that cross-tab/page wall-clock guard used to
    // silently drop valid catalog payloads.
    if (raw === currentRaw) {
      rememberSourceClipboardRaw(raw, isExternalPayload, payloadSavedAt);
      currentClipboardSavedAt = payloadSavedAt;
      currentClipboardIsExternal = isExternalPayload;
      return;
    }

    // Skip only when the incoming value is strictly older than the valid layer
    // we already hold.
    if (isLayerClipboardValue(currentRaw) && payloadSavedAt < currentClipboardSavedAt) return;

    rememberSourceClipboardRaw(raw, isExternalPayload, payloadSavedAt);
    currentClipboardSavedAt = payloadSavedAt;
    currentClipboardIsExternal = isExternalPayload;
    try {
      applyingExternalClipboard = true;
      originalSetItem.call(localStorage, CLIPBOARD_KEY, String(raw));
      // Sync the native Taptop clipboard store immediately (and again on a few
      // delays for safety) so a paste right after switching tabs uses the new layer.
      syncNativeClipboardState();
      scheduleNativeClipboardSync();
    } catch (error) {
      console.warn('Taptop Enhancer cross-project clipboard apply failed:', error);
    } finally {
      applyingExternalClipboard = false;
    }
  }

  function applyClassConflictMode(data, conflicts, mode) {
    if (mode === 'cancel') return false;

    if (mode === 'project') return true;

    const nextData = createClassCopies(data, conflicts);
    const nextRaw = normalizeLayerVersionForCurrentProject(JSON.stringify(nextData));
    applyingExternalClipboard = true;
    try {
      const conflictSavedAt = Date.now();
      originalSetItem.call(localStorage, CLIPBOARD_KEY, nextRaw);
      rememberSourceClipboardRaw(nextRaw, true, conflictSavedAt);
      currentClipboardSavedAt = conflictSavedAt;
      currentClipboardIsExternal = true;
      syncNativeClipboardState();
      scheduleNativeClipboardSync();
    } finally {
      applyingExternalClipboard = false;
    }

    return true;
  }

  function resolveCurrentClipboardBeforePaste() {
    const raw = restoreSourceClipboardForPaste();
    if (!raw || !isLayerClipboardValue(raw)) return true;
    if (!sourceClipboardIsExternal) return true;

    let data = null;
    try {
      data = JSON.parse(raw);
    } catch {
      return true;
    }

    const conflicts = getClassConflicts(data);
    if (!conflicts.length) return true;

    return chooseClassConflictMode(conflicts)
      .then((mode) => applyClassConflictMode(data, conflicts, mode));
  }

  function isPromiseLike(value) {
    return !!value && typeof value.then === 'function';
  }

  function installPastePatch() {
    const clipboard = getTaptopApi()?.clipboard;
    if (!clipboard || typeof clipboard.pasteFromClipboard !== 'function') return false;
    if (clipboard.pasteFromClipboard.__ttEnhancerCrossProjectPatched) return true;

    patchedClipboard = clipboard;
    originalPasteFromClipboard = clipboard.pasteFromClipboard;
    originalGetClipboard = typeof clipboard.getClipboard === 'function' ? clipboard.getClipboard : null;

    if (originalGetClipboard && !originalGetClipboard.__ttEnhancerCrossProjectPatchedGet) {
      const patchedGetClipboard = function (...args) {
        // Taptop's Cmd/Ctrl+V flow reads getClipboard() first to decide action/tagID.
        // If we only patch pasteFromClipboard(), the hotkey path can still make its
        // decision from the old local buffer. Refresh before every read.
        prepareClipboardBeforeNativePaste();
        return originalGetClipboard.apply(this, args);
      };
      patchedGetClipboard.__ttEnhancerCrossProjectPatchedGet = true;
      clipboard.getClipboard = patchedGetClipboard;
    }

    const patchedPasteFromClipboard = function (...args) {
      if (resolvingPaste) return originalPasteFromClipboard.apply(this, args);

      resolvingPaste = true;
      const runPaste = () => {
        const shouldRefreshLayout = isLayerClipboardValue(localStorage.getItem(CLIPBOARD_KEY));
        const pasted = suppressClipboardSaveDuringPaste(() => originalPasteFromClipboard.apply(this, args));
        if (shouldRefreshLayout) scheduleLayoutRefresh();
        return pasted;
      };

      let isAsyncDecision = false;
      try {
        const canPaste = resolveCurrentClipboardBeforePaste();
        if (isPromiseLike(canPaste)) {
          isAsyncDecision = true;
          return canPaste
            .then((resolvedCanPaste) => (resolvedCanPaste ? runPaste() : null))
            .finally(() => {
              resolvingPaste = false;
            });
        }

        if (!canPaste) return null;
        return runPaste();
      } finally {
        if (!isAsyncDecision) resolvingPaste = false;
      }
    };

    patchedPasteFromClipboard.__ttEnhancerCrossProjectPatched = true;
    clipboard.pasteFromClipboard = patchedPasteFromClipboard;
    return true;
  }

  function patchedSetItem(key, value) {
    const result = originalSetItem.apply(this, arguments);

    if (this === localStorage && String(key) === CLIPBOARD_KEY && !applyingExternalClipboard) {
      if (isClipboardSaveSuppressed()) {
        if (isLayerClipboardValue(value)) {
          lastLocalWriteAt = Date.now();
          currentClipboardSavedAt = lastLocalWriteAt;
          currentClipboardIsExternal = false;
          rememberSourceClipboardRaw(value, false, lastLocalWriteAt);
        }
        scheduleNativeClipboardSync();
        return result;
      }

      lastLocalWriteAt = Date.now();
      scheduleNativeClipboardSync();
      saveClipboard(value);
    }

    return result;
  }

  function onMessage(event) {
    if (event.source !== window) return;

    const data = event.data;
    if (!data || data.source !== BRIDGE_SOURCE) return;

    if (data.type === 'loaded' || data.type === 'updated') {
      applyExternalClipboard(data.payload);
    }
  }

  function isPasteHotkey(event) {
    const key = String(event.key || '').toLowerCase();
    const code = String(event.code || '').toLowerCase();
    const isV = key === 'v' || key === 'м' || code === 'keyv' || event.keyCode === 86;
    return isV && (event.metaKey || event.ctrlKey) && !event.altKey;
  }

  function prepareClipboardBeforeNativePaste() {
    // This runs synchronously before Taptop's own hotkey handler. If the bridge
    // has already delivered the catalog payload (usually on focus), make it the
    // active clipboard immediately so Taptop does not read an older local buffer.
    restoreSourceClipboardForPaste();
    syncNativeClipboardState();
  }

  function onKeyDownCapture(event) {
    if (!isPasteHotkey(event)) return;
    requestBridgeClipboardLoad('paste-hotkey');
    prepareClipboardBeforeNativePaste();
  }

  function onFocusRefresh() {
    scheduleBridgeClipboardRefresh('focus');
  }

  function onVisibilityRefresh() {
    if (document.visibilityState === 'visible') scheduleBridgeClipboardRefresh('visible');
  }

  function onPaste(event) {
    try {
      const text = event.clipboardData?.getData('text/plain');
      if (text && isLayerClipboardValue(text)) {
        const current = localStorage.getItem(CLIPBOARD_KEY);
        if (text === current) return;

        const savedAt = Date.now();
        applyingExternalClipboard = true;
        try {
          const normalized = normalizeLayerVersionForCurrentProject(text);
          originalSetItem.call(localStorage, CLIPBOARD_KEY, String(normalized));
          rememberSourceClipboardRaw(normalized, true, savedAt); // Mark as external for conflict check
          currentClipboardSavedAt = savedAt;
          currentClipboardIsExternal = true;
          syncNativeClipboardState();
        } finally {
          applyingExternalClipboard = false;
        }
      }
    } catch (err) {
      console.warn('Taptop Enhancer paste capture error:', err);
    }
  }

  Storage.prototype.setItem = patchedSetItem;
  window.addEventListener('message', onMessage);
  window.addEventListener('paste', onPaste, true);
  window.addEventListener('keydown', onKeyDownCapture, true);
  window.addEventListener('focus', onFocusRefresh, true);
  window.addEventListener('pageshow', onFocusRefresh, true);
  document.addEventListener('visibilitychange', onVisibilityRefresh, true);
  scheduleBridgeClipboardRefresh('init');
  installPastePatch();
  pastePatchTimer = window.setInterval(installPastePatch, 300);

  window[STATE_KEY] = {
    destroy() {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('paste', onPaste, true);
      window.removeEventListener('keydown', onKeyDownCapture, true);
      window.removeEventListener('focus', onFocusRefresh, true);
      window.removeEventListener('pageshow', onFocusRefresh, true);
      document.removeEventListener('visibilitychange', onVisibilityRefresh, true);
      bridgeRefreshTimers.forEach((timer) => clearTimeout(timer));
      bridgeRefreshTimers.clear();
      clearInterval(pastePatchTimer);
      activeConflictDialog?.remove?.();
      document.querySelectorAll('style[data-tt-layer-class-conflict]').forEach((node) => node.remove());
      if (patchedClipboard?.getClipboard?.__ttEnhancerCrossProjectPatchedGet && originalGetClipboard) {
        patchedClipboard.getClipboard = originalGetClipboard;
      }
      if (patchedClipboard?.pasteFromClipboard?.__ttEnhancerCrossProjectPatched && originalPasteFromClipboard) {
        patchedClipboard.pasteFromClipboard = originalPasteFromClipboard;
      }
      if (Storage.prototype.setItem === patchedSetItem) {
        Storage.prototype.setItem = originalSetItem;
      }
      if (window[STATE_KEY] === this) delete window[STATE_KEY];
    }
  };
})();
