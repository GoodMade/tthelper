(function () {
  const STATE_KEY = '__ttEnhancerCrossProjectClipboard';
  const CLIPBOARD_KEY = 'clipboardData';
  const PAGE_SOURCE = 'tt-enhancer-cross-project-clipboard';
  const BRIDGE_SOURCE = 'tt-enhancer-cross-project-clipboard-bridge';
  const UNIQUE_CLASS_RE = /--u-([a-z0-9]+)$/;
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
  let lastLocalWriteAt = 0;
  let runtimeRequire = null;
  let activeConflictDialog = null;
  let pastePatchTimer = 0;
  let patchedClipboard = null;
  let originalPasteFromClipboard = null;
  let resolvingPaste = false;
  let lastProjectClassChoiceRaw = '';

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
        layout: req(36945)?.A,
        systemClassNames: req(71842)?.A?.classNames
      };
    } catch {
      return null;
    }
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function collectClassValues(collection) {
    const values = new Set();
    const add = (item) => {
      if (item?.value) values.add(String(item.value));
    };

    if (!collection) return values;
    if (Array.isArray(collection.list)) collection.list.forEach(add);
    if (collection.map instanceof Map) collection.map.forEach(add);
    if (collection.map && typeof collection.map === 'object') Object.values(collection.map).forEach(add);
    if (typeof collection.serialize === 'function') {
      try {
        const serialized = collection.serialize();
        if (serialized?.map) Object.values(serialized.map).forEach(add);
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
    if (collection.map instanceof Map) collection.map.forEach(add);
    if (collection.map && typeof collection.map === 'object') {
      Object.entries(collection.map).forEach(([id, item]) => add(item, id));
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
    collectUserClassValues(api?.layout?.mainClassNameCollection).forEach((value) => values.add(value));
    return values;
  }

  function getImportedClassNames(data) {
    const values = new Set();
    const layout = data?.copiedLayout;
    collectUserClassValues(layout?.mainClassNameCollection).forEach((value) => values.add(value));
    return values;
  }

  function getUsedClassIds(data) {
    const api = getTaptopApi();
    const values = new Set();
    [
      api?.layout?.mainClassNameCollection,
      api?.layout?.designClassNameCollection,
      data?.copiedLayout?.mainClassNameCollection,
      data?.copiedLayout?.designClassNameCollection
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

  function saveClipboard(raw) {
    if (!isLayerClipboardValue(raw)) return;
    postToBridge('save', {
      raw: String(raw),
      savedAt: Date.now(),
      pageUrl: location.href,
      pageOrigin: location.origin
    });
  }

  function applyExternalClipboard(payload) {
    if (!payload?.raw || !isLayerClipboardValue(payload.raw)) return;
    if (payload.savedAt && payload.savedAt < lastLocalWriteAt) return;

    try {
      applyingExternalClipboard = true;
      originalSetItem.call(localStorage, CLIPBOARD_KEY, String(payload.raw));
      scheduleNativeClipboardSync();
    } catch (error) {
      console.warn('Taptop Enhancer cross-project clipboard apply failed:', error);
    } finally {
      applyingExternalClipboard = false;
    }
  }

  async function resolveCurrentClipboardBeforePaste() {
    const raw = localStorage.getItem(CLIPBOARD_KEY);
    if (!raw || !isLayerClipboardValue(raw) || raw === lastProjectClassChoiceRaw) return true;

    let data = null;
    try {
      data = JSON.parse(raw);
    } catch {
      return true;
    }

    const conflicts = getClassConflicts(data);
    if (!conflicts.length) return true;

    const mode = await chooseClassConflictMode(conflicts);
    if (mode === 'cancel') return false;

    if (mode === 'project') {
      lastProjectClassChoiceRaw = raw;
      return true;
    }

    const nextData = createClassCopies(data, conflicts);
    applyingExternalClipboard = true;
    try {
      originalSetItem.call(localStorage, CLIPBOARD_KEY, JSON.stringify(nextData));
      syncNativeClipboardState();
      scheduleNativeClipboardSync();
    } finally {
      applyingExternalClipboard = false;
    }

    return true;
  }

  function installPastePatch() {
    const clipboard = getTaptopApi()?.clipboard;
    if (!clipboard || typeof clipboard.pasteFromClipboard !== 'function') return false;
    if (clipboard.pasteFromClipboard.__ttEnhancerCrossProjectPatched) return true;

    patchedClipboard = clipboard;
    originalPasteFromClipboard = clipboard.pasteFromClipboard;

    const patchedPasteFromClipboard = async function (...args) {
      if (resolvingPaste) return originalPasteFromClipboard.apply(this, args);

      resolvingPaste = true;
      try {
        const canPaste = await resolveCurrentClipboardBeforePaste();
        if (!canPaste) return null;
        return await originalPasteFromClipboard.apply(this, args);
      } finally {
        resolvingPaste = false;
      }
    };

    patchedPasteFromClipboard.__ttEnhancerCrossProjectPatched = true;
    clipboard.pasteFromClipboard = patchedPasteFromClipboard;
    return true;
  }

  function patchedSetItem(key, value) {
    const result = originalSetItem.apply(this, arguments);

    if (this === localStorage && String(key) === CLIPBOARD_KEY && !applyingExternalClipboard) {
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

  Storage.prototype.setItem = patchedSetItem;
  window.addEventListener('message', onMessage);
  postToBridge('load');
  if (!installPastePatch()) {
    pastePatchTimer = window.setInterval(() => {
      if (installPastePatch()) {
        clearInterval(pastePatchTimer);
        pastePatchTimer = 0;
      }
    }, 300);
  }

  window[STATE_KEY] = {
    destroy() {
      window.removeEventListener('message', onMessage);
      clearInterval(pastePatchTimer);
      activeConflictDialog?.remove?.();
      document.querySelectorAll('style[data-tt-layer-class-conflict]').forEach((node) => node.remove());
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
