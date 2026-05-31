(function () {
  const STATE_KEY = '__ttEnhancerLayerJsonTransfer';
  const CLIPBOARD_KEY = 'clipboardData';
  const WRAPPER_TYPE = 'taptop-enhancer-layer-export';
  const RIGHT_BLOCK_SELECTOR = '.tt-styles-block__right, .tt-styles-block__right--compact';
  const ROOT_CLASS = 'tt-layer-json-transfer';
  const SETTINGS_CLASS = 'tt-layer-json-transfer-settings';
  const UNIQUE_CLASS_RE = /--u-([a-z0-9]+)$/;
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

  let runtimeRequire = null;
  let mountObserver = null;
  let toastTimer = 0;
  let settingsVisibilityTimer = 0;
  let activeConflictDialog = null;

  function getRuntimeRequire() {
    if (runtimeRequire) return runtimeRequire;

    const chunk = window.rspackChunktaptop_design_editor;
    if (!chunk || typeof chunk.push !== 'function') return null;

    try {
      const chunkId = `tt-enhancer-json-transfer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
        clipboard: req(6269)?.A,
        clipboardStore: req(34369)?.N,
        layout: req(36945)?.A,
        runtime: req(87621)?.A,
        actionCopy: req(89224)?.aI?.COPY_COMPONENT,
        systemClassNames: req(71842)?.A?.classNames
      };
    } catch {
      return null;
    }
  }

  function isLayerClipboard(data) {
    return !!(data && data.copiedLayout && data.action && data.tagID);
  }

  function getLayerName(data) {
    const tagId = data?.tagID || '';
    try {
      const root = data?.copiedLayout?.tree?.root;
      const tags = data?.copiedLayout?.tree?.tags || {};
      const tag = tags[tagId] || tags[root];
      return tag?.name || tag?.alias || tagId || 'layer';
    } catch {
      return tagId || 'layer';
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
      if (!isSystemClassName(value)) values.add(value);
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

  function chooseClassConflictMode(conflicts) {
    if (!conflicts.length) return Promise.resolve('project');
    if (activeConflictDialog) activeConflictDialog.remove();

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

  function safeFilename(value) {
    return String(value || 'layer')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'layer';
  }

  function showToast(text) {
    clearTimeout(toastTimer);
    document.querySelectorAll('.tt-layer-json-transfer-toast').forEach((node) => node.remove());

    const toast = document.createElement('div');
    toast.className = 'tt-layer-json-transfer-toast';
    toast.textContent = text;
    document.body.appendChild(toast);

    toastTimer = setTimeout(() => toast.remove(), 2800);
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

  function downloadJson(data) {
    const wrapper = {
      type: WRAPPER_TYPE,
      version: 1,
      exportedAt: new Date().toISOString(),
      sourceUrl: location.href,
      layerName: getLayerName(data),
      clipboardData: data
    };

    const blob = new Blob([JSON.stringify(wrapper, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `taptop-layer-${safeFilename(wrapper.layerName)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportSelectedLayer() {
    const api = getTaptopApi();
    if (!api?.clipboard || !api.layout || !api.runtime || !api.actionCopy) {
      showToast('Экспорт JSON недоступен: редактор еще загружается');
      return;
    }

    const selected = api.runtime.selected;
    if (!selected) {
      showToast('Выберите слой для экспорта');
      return;
    }

    api.clipboard.copyToClipboard(api.layout, api.actionCopy, selected);
    const raw = localStorage.getItem(CLIPBOARD_KEY);
    const data = raw ? JSON.parse(raw) : null;

    if (!isLayerClipboard(data)) {
      showToast('Не удалось экспортировать выбранный слой');
      return;
    }

    downloadJson(data);
    showToast('JSON слоя экспортирован');
  }

  function normalizeImportedJson(json) {
    if (json?.type === WRAPPER_TYPE && isLayerClipboard(json.clipboardData)) return json.clipboardData;
    if (isLayerClipboard(json)) return json;
    return null;
  }

  async function importClipboardData(data) {
    const api = getTaptopApi();
    const currentVersion = api?.layout?.tree?.version;
    const importedVersion = data?.copiedLayout?.tree?.version;

    if (currentVersion && importedVersion && currentVersion !== importedVersion) {
      showToast('JSON от другой версии редактора, вставка может не сработать');
    }

    const resolvedData = await resolveClassConflicts(data);
    if (!resolvedData) {
      showToast('Импорт отменен');
      return;
    }

    localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(resolvedData));
    api?.clipboardStore?.updateState?.();
    showToast('JSON импортирован в буфер. Вставьте слой через Cmd/Ctrl+V');
  }

  function importJsonFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = normalizeImportedJson(JSON.parse(String(reader.result || '')));
        if (!data) {
          showToast('Файл не похож на JSON слоя Taptop');
          return;
        }
        importClipboardData(data);
      } catch {
        showToast('Не удалось прочитать JSON');
      }
    };
    reader.readAsText(file);
  }

  function hasSelectedLayer() {
    const api = getTaptopApi();
    const selected = api?.runtime?.selected;
    if (!selected || !api?.layout?.tree?.composed) return false;

    try {
      const tag = api.layout.tree.composed.get(selected);
      return !!tag && !tag.isRoot;
    } catch {
      return false;
    }
  }

  function syncSettingsExportVisibility(panel) {
    panel.hidden = !hasSelectedLayer();
  }

  function startSettingsExportVisibilitySync(panel) {
    syncSettingsExportVisibility(panel);
    settingsVisibilityTimer = setInterval(() => syncSettingsExportVisibility(panel), 250);
  }

  function findRightBlock() {
    const direct = document.querySelector(RIGHT_BLOCK_SELECTOR);
    if (direct) return direct;

    for (const host of document.querySelectorAll('*')) {
      const found = host.shadowRoot?.querySelector?.(RIGHT_BLOCK_SELECTOR);
      if (found) return found;
    }

    return null;
  }

  function buildControls() {
    const wrap = document.createElement('span');
    wrap.className = ROOT_CLASS;

    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = 'application/json,.json';
    importInput.className = 'tt-layer-json-transfer__file';
    importInput.addEventListener('change', () => {
      importJsonFile(importInput.files?.[0]);
      importInput.value = '';
    });

    const importButton = document.createElement('button');
    importButton.type = 'button';
    importButton.className = 'tt-layer-json-transfer__button';
    importButton.title = 'Импорт слоя из JSON в буфер';
    importButton.setAttribute('aria-label', 'Импорт слоя из JSON в буфер');
    importButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/></svg>';
    importButton.addEventListener('click', () => importInput.click());

    wrap.append(importButton, importInput);
    return wrap;
  }

  function findSeoSettingsBlock() {
    const labels = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, label'))
      .filter(isVisible)
      .filter((el) => normalizeText(el.textContent) === 'SEO');

    for (const label of labels) {
      const block = label.closest('.tt-styles-block, [class*="styles-block"]');
      if (block instanceof HTMLElement && block !== label) return block;

      let current = label.parentElement;
      while (current && current !== document.body) {
        const text = normalizeText(current.textContent);
        const rect = current.getBoundingClientRect();
        if (text.includes('SEO') && rect.width >= 160 && rect.width <= 420 && rect.height >= 24) {
          return current;
        }
        current = current.parentElement;
      }
    }

    return null;
  }

  function buildSettingsExportPanel() {
    const panel = document.createElement('section');
    panel.className = SETTINGS_CLASS;

    const title = document.createElement('h3');
    title.className = 'tt-layer-json-transfer-settings__title';
    title.textContent = 'Экспорт слоя';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tt-layer-json-transfer-settings__button';
    button.title = 'Экспорт выбранного слоя в JSON';
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg><span>Экспортировать в JSON</span>';
    button.addEventListener('click', exportSelectedLayer);

    panel.append(title, button);
    startSettingsExportVisibilitySync(panel);
    return panel;
  }

  function mountSettingsExport() {
    if (document.querySelector(`.${SETTINGS_CLASS}`)) return true;

    const seoBlock = findSeoSettingsBlock();
    if (!seoBlock || !seoBlock.parentElement) return false;

    seoBlock.insertAdjacentElement('afterend', buildSettingsExportPanel());
    return true;
  }

  function mountTopImport() {
    const rightBlock = findRightBlock();
    if (!rightBlock) return false;
    if (!rightBlock.querySelector(`.${ROOT_CLASS}`)) {
      rightBlock.prepend(buildControls());
    }
    return true;
  }

  const initialTop = mountTopImport();
  const initialSettings = mountSettingsExport();

  if (!initialTop || !initialSettings) {
    mountObserver = new MutationObserver(() => {
      const mountedTop = mountTopImport();
      const mountedSettings = mountSettingsExport();
      if (mountedTop && mountedSettings) {
        mountObserver.disconnect();
        mountObserver = null;
      }
    });
    mountObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  window[STATE_KEY] = {
    destroy() {
      mountObserver?.disconnect?.();
      clearInterval(settingsVisibilityTimer);
      document.querySelectorAll(`.${ROOT_CLASS}`).forEach((node) => node.remove());
      document.querySelectorAll(`.${SETTINGS_CLASS}`).forEach((node) => node.remove());
      document.querySelectorAll('.tt-layer-class-conflict-overlay').forEach((node) => node.remove());
      document.querySelectorAll('.tt-layer-json-transfer-toast').forEach((node) => node.remove());
      clearTimeout(toastTimer);
      if (window[STATE_KEY] === this) delete window[STATE_KEY];
    }
  };
})();
