(function () {
  const STATE_KEY = '__ttEnhancerReuseDeletedClassNames';
  const MAX_ATTEMPTS = 80;
  const RETRY_DELAY = 250;
  const BUTTON_ATTR = 'data-tt-enhancer-class-manager';
  const LAYER_BUTTON_ATTR = 'data-tt-enhancer-layer-class-manager';
  const DELETE_LAYER_BUTTON_ATTR = 'data-tt-enhancer-delete-layer-with-classes';
  const STYLE_ID = 'tt-enhancer-class-manager-style';
  const LAYERS_LIST_SELECTOR = '.tt-layers__list';
  const LAYER_ITEM_SELECTOR = '.tt-layers__item';
  const LAYER_MENU_DELETE_TEXTS = ['Удалить', 'Delete'];
  const LAYER_MENU_ANCHOR_TEXTS = ['Дублировать', 'Duplicate', 'Переименовать', 'Rename'];
  const DELETE_LAYER_CLASSES_TEXT = 'Удалить классы';

  const previous = window[STATE_KEY];
  if (previous?.restore) previous.restore();

  const state = {
    attempts: 0,
    timer: 0,
    runtimeRequire: null,
    patches: [],
    layersSetPropPatch: null,
    observer: null,
    menuMountRaf: 0,
    button: null,
    layerButton: null,
    layerContextButton: null,
    modal: null,
    style: null,
    keydownListener: null,
    contextmenuListener: null,
    contextMenuTimers: [],
    layerContextTagId: '',
    layerContextPoint: null,
    projectClassSelection: new Set(),
    restore() {
      clearTimeout(state.timer);
      state.contextMenuTimers.forEach((timer) => clearTimeout(timer));
      state.contextMenuTimers = [];
      state.observer?.disconnect?.();
      state.observer = null;
      if (state.menuMountRaf) {
        cancelAnimationFrame(state.menuMountRaf);
        state.menuMountRaf = 0;
      }
      if (state.keydownListener) {
        document.removeEventListener('keydown', state.keydownListener, true);
        state.keydownListener = null;
      }
      if (state.contextmenuListener) {
        document.removeEventListener('contextmenu', state.contextmenuListener, true);
        state.contextmenuListener = null;
      }
      state.button?.remove?.();
      state.button = null;
      state.layerButton?.remove?.();
      state.layerButton = null;
      state.layerContextButton?.remove?.();
      state.layerContextButton = null;
      if (state.layersSetPropPatch?.layers?.setProp === state.layersSetPropPatch.patched) {
        state.layersSetPropPatch.layers.setProp = state.layersSetPropPatch.original;
      }
      state.layersSetPropPatch = null;
      document.querySelectorAll(`[${DELETE_LAYER_BUTTON_ATTR}]`).forEach((button) => button.remove());
      state.layerContextTagId = '';
      state.layerContextPoint = null;
      state.modal?.remove?.();
      state.modal = null;
      state.projectClassSelection.clear();
      state.style?.remove?.();
      state.style = null;
      state.patches.forEach(({ proto, original, patched }) => {
        if (proto?.generateByName === patched) proto.generateByName = original;
      });
      state.patches = [];
      if (window[STATE_KEY] === state) delete window[STATE_KEY];
    }
  };

  window[STATE_KEY] = state;

  function getRuntimeRequire() {
    if (state.runtimeRequire) return state.runtimeRequire;

    const chunk = window.rspackChunktaptop_design_editor;
    if (!chunk || typeof chunk.push !== 'function') return null;

    try {
      const chunkId = `tt-enhancer-reuse-deleted-class-names-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      chunk.push([[chunkId], {}, (req) => {
        state.runtimeRequire = req;
      }]);
    } catch {}

    return state.runtimeRequire;
  }

  function parseClassName(value) {
    const match = String(value || '').match(/^(.+)-(\d+)$/);
    return match
      ? { baseName: match[1], count: Number(match[2]) }
      : { baseName: String(value || ''), count: undefined };
  }

  function setClassNameValue(className, value) {
    if (!className || className.value === value) return className;
    if (typeof className.set === 'function') className.set(value);
    else className.value = value;
    return className;
  }

  function patchClassNameCollectionConstructor(Ctor) {
    const proto = Ctor?.prototype;
    if (!proto || typeof proto.generateByName !== 'function') return false;
    if (proto.generateByName.__ttEnhancerReuseDeletedClassNamesPatched) return true;

    const original = proto.generateByName;
    const patched = function patchedGenerateByName(name) {
      const requested = String(name || '');
      if (!requested || typeof this.findByName !== 'function') {
        return original.call(this, name);
      }

      const makeClassName = (value) => setClassNameValue(original.call(this, value), value);

      if (!this.findByName(requested)) {
        return makeClassName(requested);
      }

      const { baseName, count } = parseClassName(requested);
      let next = this.countMap?.has?.(baseName) ? this.countMap.get(baseName) : undefined;
      if (next === undefined) next = count !== undefined ? count : 1;

      let candidate = '';
      do {
        next += 1;
        candidate = `${baseName}-${next}`;
      } while (this.findByName(candidate));

      return makeClassName(candidate);
    };

    patched.__ttEnhancerReuseDeletedClassNamesPatched = true;
    patched.__ttEnhancerReuseDeletedClassNamesOriginal = original;
    proto.generateByName = patched;
    state.patches.push({ proto, original, patched });
    return true;
  }

  function patch() {
    const req = getRuntimeRequire();
    if (!req) return false;

    try {
      const layout = req(36945)?.A;
      const ClassNameCollection = req(13977)?.A;
      const constructors = [
        ClassNameCollection,
        layout?.mainClassNameCollection?.constructor,
        layout?.designClassNameCollection?.constructor
      ];

      let patchedAny = false;
      Array.from(new Set(constructors.filter(Boolean))).forEach((Ctor) => {
        patchedAny = patchClassNameCollectionConstructor(Ctor) || patchedAny;
      });

      return patchedAny;
    } catch {
      return false;
    }
  }

  function getTaptopApi() {
    const req = getRuntimeRequire();
    if (!req) return null;

    try {
      return {
        classNameActions: req(73461)?.A,
        constants: req(89224),
        events: req(91893)?.A,
        history: req(16271)?.A,
        layers: req(39510)?.A,
        layout: req(36945)?.A,
        runInAction: req(27813)?.Rn,
        runtime: req(87621)?.A,
        systemClasses: req(71842)?.A?.classNames || new Set()
      };
    } catch {
      return null;
    }
  }

  function ensureStyle() {
    if (state.style?.isConnected) return;

    const existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .tt-search-replace__menu .tt-enhancer-class-manager-menu-item {
        white-space: nowrap;
      }
      button.tt-context-menu-item.tt-enhancer-layer-delete-classes-floating {
        position: fixed !important;
        z-index: 2147483600 !important;
        border: 0 !important;
        border-radius: 0 0 6px 6px !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        font-family: inherit !important;
        font-size: 13px !important;
        line-height: inherit !important;
        text-align: left !important;
        white-space: nowrap !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
        outline: 0 !important;
        appearance: none !important;
      }
      button.tt-context-menu-item.tt-enhancer-layer-delete-classes-floating:hover {
        background-color: #2f8df7 !important;
        color: #fff !important;
      }
      button.tt-context-menu-item.tt-enhancer-layer-delete-classes-floating .tt-context-menu-item__value {
        color: inherit !important;
        font: inherit !important;
        line-height: inherit !important;
        padding: 0 16px !important;
        width: 100% !important;
        box-sizing: border-box !important;
        text-align: left !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
      .tt-enhancer-class-manager-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2147483000;
        display: flex;
        align-items: flex-start;
        justify-content: flex-end;
        padding: 96px 24px 24px;
        background: rgba(18, 24, 38, 0.28);
      }
      .tt-enhancer-class-manager-modal {
        width: min(440px, calc(100vw - 48px));
        max-height: min(620px, calc(100vh - 128px));
        border: 1px solid rgba(15, 23, 42, 0.12);
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 18px 50px rgba(15, 23, 42, 0.22);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #20242a;
        font-family: Inter, Arial, sans-serif;
      }
      .tt-enhancer-class-manager-head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        padding: 12px;
        border-bottom: 1px solid #eceff3;
      }
      .tt-enhancer-class-manager-search {
        min-width: 0;
        flex: 1;
        height: 36px;
        border: 1px solid #d9dde5;
        border-radius: 6px;
        padding: 0 10px;
        font-size: 14px;
        outline: none;
      }
      .tt-enhancer-class-manager-search:focus {
        border-color: #2f80ed;
        box-shadow: 0 0 0 2px rgba(47, 128, 237, 0.14);
      }
      .tt-enhancer-class-manager-controls {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 8px 12px;
      }
      .tt-enhancer-class-manager-controls-main {
        min-width: 0;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px 12px;
      }
      .tt-enhancer-class-manager-filter,
      .tt-enhancer-class-manager-select-all {
        height: 28px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #4b5565;
        font-size: 13px;
        line-height: 16px;
        cursor: pointer;
        user-select: none;
      }
      .tt-enhancer-class-manager-filter input,
      .tt-enhancer-class-manager-select-all input,
      .tt-enhancer-class-manager-row-check {
        width: 15px;
        height: 15px;
        margin: 0;
        accent-color: #2f80ed;
      }
      .tt-enhancer-class-manager-delete-unused {
        min-height: 28px;
        flex: 0 0 auto;
        border: 1px solid #c0362c;
        border-radius: 6px;
        background: #fff;
        color: #c0362c;
        cursor: pointer;
        padding: 0 10px;
        font-size: 12px;
        font-weight: 600;
        line-height: 16px;
        white-space: nowrap;
      }
      .tt-enhancer-class-manager-delete-unused:hover:not(:disabled) {
        background: rgba(192, 54, 44, 0.08);
      }
      .tt-enhancer-class-manager-delete-unused:disabled {
        border-color: #d8dde8;
        color: #9aa3af;
        cursor: default;
      }
      .tt-enhancer-class-manager-close,
      .tt-enhancer-class-manager-remove {
        border: 0;
        border-radius: 6px;
        background: transparent;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .tt-enhancer-class-manager-close {
        width: 32px;
        height: 32px;
        color: #596273;
      }
      .tt-enhancer-class-manager-close:hover {
        background: #f2f4f7;
      }
      .tt-enhancer-class-manager-list {
        overflow: auto;
        padding: 3px 0;
      }
      .tt-enhancer-class-manager-row {
        min-height: 38px;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 8px;
        align-items: start;
        padding: 5px 12px;
      }
      .tt-enhancer-class-manager-row.is-select-mode {
        grid-template-columns: auto minmax(0, 1fr);
      }
      .tt-enhancer-class-manager-row:hover {
        background: #f7f9fc;
      }
      .tt-enhancer-class-manager-row.is-selected {
        background: #edf5ff;
      }
      .tt-enhancer-class-manager-row.is-selected:hover {
        background: #e5f0ff;
      }
      .tt-enhancer-class-manager-row-check {
        margin-top: 2px;
      }
      .tt-enhancer-class-manager-row-info {
        min-width: 0;
      }
      .tt-enhancer-class-manager-layer-node {
        display: block;
      }
      .tt-enhancer-class-manager-layer-row {
        position: relative;
        min-height: 28px;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 3px 10px 3px calc(10px + var(--tt-layer-depth, 0) * 12px);
      }
      .tt-enhancer-class-manager-layer-row::before,
      .tt-enhancer-class-manager-layer-classes::before {
        content: "";
        position: absolute;
        left: 10px;
        top: 0;
        bottom: 0;
        width: calc(var(--tt-layer-depth, 0) * 12px);
        pointer-events: none;
        opacity: 0.75;
        background: repeating-linear-gradient(
          to right,
          transparent 0,
          transparent 5px,
          #d4d9e2 5px,
          #d4d9e2 6px,
          transparent 6px,
          transparent 12px
        );
      }
      .tt-enhancer-class-manager-layer-arrow {
        width: 0;
        height: 0;
        flex: 0 0 auto;
        border-top: 4px solid transparent;
        border-bottom: 4px solid transparent;
        border-left: 5px solid #9aa3af;
        transform: rotate(90deg);
      }
      .tt-enhancer-class-manager-layer-arrow.is-empty {
        opacity: 0;
      }
      .tt-enhancer-class-manager-layer-icon {
        width: 14px;
        height: 14px;
        flex: 0 0 auto;
        color: #9aa3af;
      }
      .tt-enhancer-class-manager-layer-icon svg {
        width: 14px;
        height: 14px;
        display: block;
      }
      .tt-enhancer-class-manager-layer-title {
        min-width: 0;
        flex: 1;
        color: #20242a;
        font-size: 13px;
        font-weight: 600;
        line-height: 18px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .tt-enhancer-class-manager-layer-classes {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 1px;
        padding: 0 8px 2px calc(24px + var(--tt-layer-depth, 0) * 12px);
      }
      .tt-enhancer-class-manager-layer-class {
        min-height: 24px;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 1px 0 1px 8px;
        border-radius: 4px;
      }
      .tt-enhancer-class-manager-layer-class:hover {
        background: #f7f9fc;
      }
      .tt-enhancer-class-manager-layer-class-name {
        position: relative;
        min-width: 0;
        flex: 1;
        color: #374151;
        font-size: 13px;
        line-height: 18px;
        padding-left: 10px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .tt-enhancer-class-manager-layer-class-name[contenteditable],
      .tt-enhancer-class-manager-name[contenteditable] {
        cursor: text;
        outline: none;
        user-select: text;
        -webkit-user-select: text;
        caret-color: #2f80ed;
      }
      .tt-enhancer-class-manager-layer-class-name[contenteditable]:focus,
      .tt-enhancer-class-manager-name[contenteditable]:focus {
        text-overflow: clip;
        box-shadow: inset 0 -1px 0 #2f80ed;
      }
      .tt-enhancer-class-manager-layer-class-name.is-invalid,
      .tt-enhancer-class-manager-name.is-invalid {
        color: #c0362c;
        box-shadow: inset 0 -1px 0 #c0362c;
      }
      .tt-enhancer-class-manager-layer-class-name::before {
        content: "";
        position: absolute;
        left: 0;
        top: 50%;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: #aab2bf;
        transform: translateY(-50%);
      }
      .tt-enhancer-class-manager-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 14px;
        line-height: 18px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
      .tt-enhancer-class-manager-meta {
        margin-top: 1px;
        color: #8a94a6;
        font-size: 11px;
        line-height: 14px;
      }
      .tt-enhancer-class-manager-remove {
        width: 30px;
        height: 30px;
        color: #c0362c;
      }
      .tt-enhancer-class-manager-remove:hover {
        background: rgba(192, 54, 44, 0.1);
      }
      .tt-enhancer-class-manager-layer-class .tt-enhancer-class-manager-remove {
        width: 22px;
        height: 22px;
        flex: 0 0 auto;
        color: #98a2b3;
      }
      .tt-enhancer-class-manager-layer-class .tt-enhancer-class-manager-remove:hover {
        color: #dc2626;
      }
      .tt-enhancer-class-manager-empty {
        padding: 28px 16px;
        color: #7b8494;
        font-size: 14px;
        text-align: center;
      }
      .tt-enhancer-class-manager-summary {
        min-height: 47px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 12px 10px;
        border-top: 1px solid #eceff3;
        color: #7b8494;
        font-size: 12px;
        line-height: 16px;
      }
      .tt-enhancer-class-manager-summary-text {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .tt-enhancer-class-manager-delete-all {
        min-height: 30px;
        flex: 0 0 auto;
        border: 1px solid #c0362c;
        border-radius: 6px;
        background: #c0362c;
        color: #fff;
        cursor: pointer;
        padding: 0 12px;
        font-size: 12px;
        font-weight: 600;
        line-height: 16px;
      }
      .tt-enhancer-class-manager-delete-all:hover:not(:disabled) {
        background: #a82d25;
        border-color: #a82d25;
      }
      .tt-enhancer-class-manager-delete-all:disabled {
        border-color: #d8dde8;
        background: #f2f4f7;
        color: #9aa3af;
        cursor: default;
      }
    `;
    document.head.appendChild(style);
    state.style = style;
  }

  function iconSvg(path, viewBox = '0 0 24 24') {
    return `<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  }

  function readObjectValue(item, key) {
    if (!item) return '';
    try {
      if (typeof item.get === 'function') return item.get(key) || '';
    } catch {}
    try {
      return item[key] || '';
    } catch {
      return '';
    }
  }

  function toArrayLike(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (value instanceof Set) return Array.from(value);
    if (value instanceof Map) return Array.from(value.values());
    if (typeof value !== 'string' && typeof value[Symbol.iterator] === 'function') {
      try {
        return Array.from(value);
      } catch {}
    }
    return [];
  }

  function getOriginalId(api, id) {
    return api?.events?.getOriginalID?.(id) || id || '';
  }

  function getTagId(tag) {
    return String(
      readObjectValue(tag, 'id')
      || readObjectValue(tag, 'tagID')
      || readObjectValue(tag, 'tagId')
      || ''
    );
  }

  function getTagById(api, id) {
    const tree = api?.layout?.tree;
    if (!tree || !id) return null;

    const originalId = getOriginalId(api, id);
    try {
      if (tree.composed?.has?.(id)) return tree.composed.get(id);
      if (tree.composed?.has?.(originalId)) return tree.composed.get(originalId);
      if (tree.has?.(originalId)) return tree.get(originalId);
      if (tree.has?.(id)) return tree.get(id);
      return tree.composed?.get?.(id) || tree.composed?.get?.(originalId) || tree.get?.(originalId) || tree.get?.(id) || null;
    } catch {
      return null;
    }
  }

  function getOriginalTag(api, tag) {
    const tree = api?.layout?.tree;
    const id = typeof tag === 'string' ? tag : getTagId(tag);
    if (!tree || !id) return tag || null;

    const originalId = getOriginalId(api, id);
    try {
      if (tree.has?.(originalId)) return tree.get(originalId);
      return tree.get?.(originalId) || tag || null;
    } catch {
      return tag || null;
    }
  }

  function getSelectedTag(api) {
    const selected = api?.runtime?.selected;
    if (!selected) return null;
    return getTagById(api, selected);
  }

  function getLayerItemIndex(item) {
    const list = item?.closest?.(LAYERS_LIST_SELECTOR);
    if (!list) return -1;
    return Array.from(list.querySelectorAll(LAYER_ITEM_SELECTOR)).indexOf(item);
  }

  function getLayerTagFromItem(api, item, useSelectedFallback = true) {
    if (!(item instanceof HTMLElement)) return useSelectedFallback ? getSelectedTag(api) : null;

    const index = getLayerItemIndex(item);
    if (index >= 0) {
      try {
        const layer = api?.layers?.list?.[index];
        const tag = getTagById(api, layer?.id);
        if (tag) return tag;
      } catch {}
    }

    return useSelectedFallback ? getSelectedTag(api) : null;
  }

  function getParentId(tag) {
    const parent = readObjectValue(tag, 'parent')
      || readObjectValue(tag, 'parentId')
      || readObjectValue(tag, 'parentID')
      || readObjectValue(tag, 'parent_id');
    if (!parent) return '';
    if (typeof parent === 'string' || typeof parent === 'number') return String(parent);
    return getTagId(parent);
  }

  function getChildIds(tag) {
    const childValues = [];
    const append = (value) => {
      if (!value) return;
      if (typeof value === 'string' || typeof value === 'number') {
        childValues.push(String(value));
        return;
      }
      const id = getTagId(value);
      if (id) childValues.push(id);
    };

    [
      readObjectValue(tag, 'children'),
      readObjectValue(tag, 'childrens'),
      readObjectValue(tag, 'items')
    ].forEach((children) => {
      const list = toArrayLike(children);
      if (list.length) list.forEach(append);
      else if (children && typeof children === 'object') Object.values(children).forEach(append);
    });

    return childValues;
  }

  function getTagTitle(tag) {
    return String(
      readObjectValue(tag, 'name')
      || readObjectValue(tag, 'title')
      || readObjectValue(tag, 'label')
      || readObjectValue(tag, 'displayName')
      || readObjectValue(tag, 'tagName')
      || readObjectValue(tag, 'type')
      || getTagId(tag)
      || 'Слой'
    );
  }

  function getLayerTypeText(tag) {
    return [
      readObjectValue(tag, 'type'),
      readObjectValue(tag, 'tagName'),
      readObjectValue(tag, 'widgetName'),
      readObjectValue(tag, 'widgetType'),
      readObjectValue(tag, 'widgetCode'),
      readObjectValue(tag, 'code'),
      getTagTitle(tag)
    ].map((value) => String(value || '').toLowerCase()).join(' ');
  }

  function getLayerTypeIcon(tag) {
    const value = getLayerTypeText(tag);
    if (/(^|[\s_-])(text|richtext|rich_text|paragraph|heading|title|subtitle|caption|label)($|[\s_-])/.test(value)) {
      return iconSvg('<path d="M5 3h6"/><path d="M8 3v10"/><path d="M6 13h4"/>', '0 0 16 16');
    }
    if (/(image|img|picture|photo|video|media)/.test(value)) {
      return iconSvg('<rect x="2.5" y="3" width="11" height="10" rx="1.5"/><path d="M4.5 11 7 8.5l2 2 1.5-1.5 1.5 2"/><path d="M10.5 5.5h.01"/>', '0 0 16 16');
    }
    if (/(svg|icon|vector|arrow)/.test(value)) {
      return iconSvg('<path d="M3 11c2-6 8-6 10 0"/><path d="M5 11v2"/><path d="M11 11v2"/><path d="M6 6h4"/><path d="M8 4v2"/>', '0 0 16 16');
    }
    if (/(custom|widget|embed|html|code|script)/.test(value)) {
      return iconSvg('<rect x="3" y="3" width="10" height="10" rx="1.5"/><path d="M11 5 5 11"/>', '0 0 16 16');
    }
    if (/(button|link|input|form|select|textarea)/.test(value)) {
      return iconSvg('<rect x="2.5" y="4.5" width="11" height="7" rx="2"/><path d="M5.5 8h5"/>', '0 0 16 16');
    }
    return iconSvg('<rect x="3" y="3" width="10" height="10" rx="1.5"/>', '0 0 16 16');
  }

  function isUniqueClassName(value) {
    return /--(?:u|s\d+)-[a-z0-9]+$/i.test(String(value || ''));
  }

  function isSystemClassName(api, value) {
    const name = String(value || '');
    if (!name) return true;
    if (isUniqueClassName(name)) return true;
    if (/^(tt-|has-|is-)/.test(name)) return true;
    if (api?.systemClasses?.has?.(name)) return true;
    if (api?.constants?._g?.includes?.(name)) return true;
    return false;
  }

  function getCollections(api) {
    const layout = api?.layout;
    return [
      { id: 'main', title: 'main', collection: layout?.mainClassNameCollection },
      { id: 'design', title: 'design', collection: layout?.designClassNameCollection }
    ].filter(({ collection }) => collection);
  }

  function getSelectorCollections(api) {
    const layout = api?.layout;
    return [
      layout?.mainSelectorCollection,
      layout?.designSelectorCollection,
      layout?.cmSelectorCollection,
      layout?.animationSelectorCollection
    ].filter(Boolean);
  }

  function getClassUsage(api, id) {
    const targetId = String(id || '');
    let count = 0;
    try {
      api?.layout?.tree?.list?.forEach?.((tag) => {
        if (toArrayLike(readObjectValue(tag, 'classNameIds')).some((item) => getClassIdValue(item) === targetId)) count += 1;
      });
    } catch {}
    return count;
  }

  function getClassRows(api) {
    const seen = new Set();
    const rows = [];

    getCollections(api).forEach(({ id: source, title, collection }) => {
      (collection.list || []).forEach((className) => {
        const value = String(className?.value || '').trim();
        if (!value || isSystemClassName(api, value) || seen.has(className.id)) return;
        const usage = getClassUsage(api, className.id);
        seen.add(className.id);
        rows.push({
          type: 'class',
          id: className.id,
          value,
          source,
          usage,
          unused: usage === 0,
          meta: usage ? `Используется: ${usage}` : 'Не используется',
          collection
        });
      });

      if (collection.countMap?.forEach) {
        collection.countMap.forEach((_, baseName) => {
          const value = String(baseName || '').trim();
          const key = `${source}:reserve:${value}`;
          if (!value || isSystemClassName(api, value) || collection.findByName?.(value) || seen.has(key)) return;
          seen.add(key);
          rows.push({
            type: 'reserve',
            id: key,
            value,
            source,
            usage: 0,
            unused: true,
            meta: 'Резерв имени',
            collection
          });
        });
      }
    });

    return rows.sort((a, b) => a.value.localeCompare(b.value));
  }

  function getClassNameById(api, id) {
    const classId = String(id || '');
    if (!classId) return null;

    for (const { collection } of getCollections(api)) {
      const found = (collection.list || []).find((className) => String(className?.id || '') === classId);
      if (found) return found;
    }

    try {
      return api?.layout?.classNameManager?.get?.(classId) || null;
    } catch {
      return null;
    }
  }

  function getClassIdValue(value) {
    return typeof value === 'object'
      ? String(readObjectValue(value, 'id') || readObjectValue(value, 'value') || '')
      : String(value || '');
  }

  function getTagClassRows(api, tag) {
    const rows = [];
    const seen = new Set();
    const target = getOriginalTag(api, tag) || tag;

    toArrayLike(readObjectValue(target, 'classNameIds')).forEach((id) => {
      const classId = getClassIdValue(id);
      if (!classId || seen.has(classId)) return;

      const className = getClassNameById(api, classId);
      const value = String(className?.value || readObjectValue(id, 'value') || readObjectValue(id, 'name') || '').trim();
      if (!value || isSystemClassName(api, value)) return;

      seen.add(classId);
      rows.push({
        id: classId,
        value,
        tag: target
      });
    });

    return rows;
  }

  function getTagChildren(api, tag) {
    const explicit = getChildIds(tag)
      .map((id) => getTagById(api, id))
      .filter(Boolean);
    if (explicit.length) return explicit;

    const id = getTagId(tag);
    if (!id) return [];
    const originalId = getOriginalId(api, id);
    return Array.from(api?.layout?.tree?.list || []).filter((item) => {
      const parentId = getParentId(item);
      return parentId === id || parentId === originalId || getOriginalId(api, parentId) === originalId;
    });
  }

  function buildLayerClassTree(api, tag, depth = 0, visited = new Set()) {
    const id = getTagId(tag);
    const visitKey = id || tag;
    if (visited.has(visitKey)) return null;
    visited.add(visitKey);

    const children = getTagChildren(api, tag)
      .map((child) => buildLayerClassTree(api, child, depth + 1, visited))
      .filter(Boolean);

    return {
      id,
      tag: getOriginalTag(api, tag) || tag,
      title: getTagTitle(tag),
      icon: getLayerTypeIcon(tag),
      classes: getTagClassRows(api, tag),
      depth,
      children
    };
  }

  function filterLayerClassTree(node, query) {
    if (!node) return null;
    const normalizedQuery = String(query || '').trim().toLowerCase();
    const layerMatches = !normalizedQuery || node.title.toLowerCase().includes(normalizedQuery);
    const classes = node.classes.filter((row) => {
      return !normalizedQuery || layerMatches || row.value.toLowerCase().includes(normalizedQuery);
    });
    const children = node.children
      .map((child) => filterLayerClassTree(child, query))
      .filter(Boolean);

    if (!classes.length && !children.length && !layerMatches) return null;
    if (!classes.length && !children.length && !normalizedQuery) return null;
    return { ...node, classes, children };
  }

  function countLayerClasses(node) {
    if (!node) return 0;
    return node.classes.length + node.children.reduce((sum, child) => sum + countLayerClasses(child), 0);
  }

  function collectLayerClassRows(node, rows = []) {
    if (!node) return rows;
    node.classes.forEach((row) => rows.push(row));
    node.children.forEach((child) => collectLayerClassRows(child, rows));
    return rows;
  }

  function selectorHasClass(selector, className) {
    const target = String(className || '');
    if (!target) return false;

    const parsed = selector?.parsed;
    if (Array.isArray(parsed)) {
      const flat = parsed.flat ? parsed.flat(Infinity) : [].concat(...parsed);
      if (flat.some((item) => item?.type === 'class' && item?.value === target)) return true;
    }

    let found = false;
    String(selector?.selectorText || '').replace(/\.(-?[_a-zA-Z]+[-_a-zA-Z0-9]*)/g, (_, token) => {
      if (token === target) found = true;
      return '';
    });
    return found;
  }

  function deleteSelectorsByClass(api, className) {
    getSelectorCollections(api).forEach((collection) => {
      const list = Array.from(collection.list || []);
      list.forEach((selector) => {
        if (!selectorHasClass(selector, className)) return;
        const key = selector.key || `${selector.media}/${selector.selectorText}`;
        try {
          collection.delete?.(key);
        } catch {}
      });
    });
  }

  function removeClassFromTags(api, id) {
    const targetId = String(id || '');
    api?.layout?.tree?.list?.forEach?.((tag) => {
      const classIds = toArrayLike(readObjectValue(tag, 'classNameIds'));
      if (!classIds.some((item) => getClassIdValue(item) === targetId)) return;
      if (typeof tag.removeClassNameId === 'function') tag.removeClassNameId(targetId);
      else tag.classNameIds = classIds.filter((item) => getClassIdValue(item) !== targetId);
    });
  }

  function removeClassFromCollection(collection, id, value, options = {}) {
    if (!collection || !id) return;

    const { baseName } = parseClassName(value);
    const countMap = collection.countMap;
    const hadReserve = !!baseName && countMap?.has?.(baseName);
    const reserveCount = hadReserve ? countMap.get(baseName) : undefined;

    try {
      collection.remove?.(id);
    } catch {}

    if (options.deleteReserve) {
      try {
        countMap?.delete?.(baseName);
      } catch {}
      return;
    }

    if (hadReserve && !countMap?.has?.(baseName)) {
      try {
        countMap.set(baseName, reserveCount);
      } catch {}
    }
  }

  function removeClassReserve(api, value) {
    const { baseName } = parseClassName(value);
    if (!baseName) return;
    getCollections(api).forEach(({ collection }) => {
      try {
        collection?.countMap?.delete?.(baseName);
      } catch {}
    });
  }

  function removeClassReservesLater(values) {
    const baseNames = Array.from(new Set(
      Array.from(values || [])
        .map((value) => parseClassName(value).baseName)
        .filter(Boolean)
    ));
    if (!baseNames.length) return;

    requestAnimationFrame(() => {
      setTimeout(() => {
        const api = getTaptopApi();
        if (!api || window[STATE_KEY] !== state) return;

        try {
          runTaptopAction(api, () => {
            getCollections(api).forEach(({ collection }) => {
              baseNames.forEach((baseName) => {
                try {
                  collection?.countMap?.delete?.(baseName);
                } catch {}
              });
            });
            api.runtime?.setHasChangedParams?.(true);
          });
          dispatchClassChange(api);
        } catch {}
      }, 150);
    });
  }

  function removeClassWithNativeAction(api, row, options = {}) {
    const className = getClassNameById(api, row?.id);
    const controller = api?.layout?.classNameController;
    const tag = getOriginalTag(api, row?.tag) || getSelectedTag(api) || api?.layout?.tree?.getRootTag?.() || null;

    if (!className || !controller || typeof api?.classNameActions?.removeAndCleanClassName !== 'function') {
      return false;
    }

    try {
      api.classNameActions.removeAndCleanClassName(className, tag, controller);
      if (options.deleteReserve) removeClassReserve(api, row.value);
      return true;
    } catch {
      return false;
    }
  }

  function runTaptopAction(api, callback) {
    const runInAction = api?.runInAction;
    if (typeof runInAction === 'function') return runInAction(callback);
    return callback();
  }

  function dispatchClassChange(api) {
    try {
      api?.events?.emit?.(api.events.ON_CLASSNAME_SELECT);
      if (api?.events?.ON_CSS_CHANGE) api.events.emit(api.events.ON_CSS_CHANGE, null, true);
      if (api?.events?.ON_CHANGE_TAG_DISPLAY) api.events.emit(api.events.ON_CHANGE_TAG_DISPLAY);
    } catch {}
  }

  function removeClassFromLayer(row) {
    const api = getTaptopApi();
    if (!api || !row?.tag || !row.id) return false;

    const tag = getOriginalTag(api, row.tag) || row.tag;
    const targetId = String(row.id || '');
    const classIds = toArrayLike(readObjectValue(tag, 'classNameIds'));
    if (!classIds.some((item) => getClassIdValue(item) === targetId)) return false;

    if (typeof tag.removeClassNameId === 'function') tag.removeClassNameId(targetId);
    else tag.classNameIds = classIds.filter((item) => getClassIdValue(item) !== targetId);

    dispatchClassChange(api);
    api.history?.add?.('remove layer className');
    return true;
  }

  function deleteClassRows(rows, options = {}) {
    const api = getTaptopApi();
    const targets = Array.from(rows || []).filter(Boolean);
    if (!api || !targets.length) return false;

    let removedClass = false;
    let removedReserve = false;

    targets.forEach((row) => {
      if (row.type === 'reserve') {
        const { baseName } = parseClassName(row.value);
        row.collection?.countMap?.delete?.(baseName);
        removedReserve = true;
        return;
      }

      if (!options.forceManual && removeClassWithNativeAction(api, row, options)) {
        removedClass = true;
        return;
      }

      removeClassFromTags(api, row.id);
      deleteSelectorsByClass(api, row.value);

      getCollections(api).forEach(({ collection }) => {
        removeClassFromCollection(collection, row.id, row.value, options);
      });

      if (api.runtime?.selectedClassNameId === row.id) {
        api.runtime.setSelectedClassNameId?.('');
      }
      removedClass = true;
    });

    if (!removedClass && !removedReserve) return false;
    if (removedClass && !options.skipDispatch) dispatchClassChange(api);
    if (!options.skipHistory) {
      api.history?.add?.(
        options.historyLabel || (
          targets.length > 1 || (removedClass && removedReserve)
            ? 'remove classNames'
            : (removedClass ? 'remove className' : 'remove className reserve')
        )
      );
    }
    return true;
  }

  function toProjectClassRows(api, rows) {
    return getUniqueClassRows(rows).map((row) => {
      const id = String(row?.id || '');
      const className = getClassNameById(api, id);
      const value = String(className?.value || row?.value || '').trim();
      if (!id || !value) return null;
      return {
        type: 'class',
        id,
        value
      };
    }).filter(Boolean);
  }

  function deleteProjectClassRowsLater(rows) {
    const projectRows = toProjectClassRows(getTaptopApi(), rows);
    if (!projectRows.length) return false;

    requestAnimationFrame(() => {
      setTimeout(() => {
        const api = getTaptopApi();
        if (!api || window[STATE_KEY] !== state) return;

        const currentRows = toProjectClassRows(api, projectRows);
        if (!currentRows.length) return;

        try {
          if (deleteClassRows(currentRows, {
            historyLabel: 'remove layer classNames'
          })) {
            api.runtime?.setHasChangedParams?.(true);
            removeClassReservesLater(currentRows.map((row) => row.value));
          }
        } catch {}
      }, 500);
    });

    return true;
  }

  function deleteClassRow(row) {
    return deleteClassRows([row]);
  }

  function getUniqueClassRows(rows) {
    const seen = new Set();
    return Array.from(rows || []).filter((row) => {
      const id = String(row?.id || '');
      const value = String(row?.value || '');
      const key = id ? `id:${id}` : `value:${value}`;
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getLayerContextTag(api, tagId = state.layerContextTagId) {
    if (tagId) {
      const tag = getTagById(api, tagId);
      if (tag) return tag;
    }
    return getSelectedTag(api);
  }

  function deleteLayerClasses(tagId = state.layerContextTagId) {
    const api = getTaptopApi();
    const target = api ? getLayerContextTag(api, tagId) : null;
    const original = getOriginalTag(api, target) || target;
    if (!api || !original?.id) return false;

    const tree = buildLayerClassTree(api, original);
    const classRows = collectLayerClassRows(tree);
    if (!classRows.length) return false;

    if (!deleteProjectClassRowsLater(classRows)) return false;
    if (!tagId || state.layerContextTagId === tagId) state.layerContextTagId = '';
    return true;
  }

  function classRowSelectionKey(row) {
    return `${row?.type || ''}:${row?.source || ''}:${row?.id || ''}:${row?.value || ''}`;
  }

  function pruneProjectClassSelection(rows) {
    const available = new Set(rows.map(classRowSelectionKey));
    state.projectClassSelection.forEach((key) => {
      if (!available.has(key)) state.projectClassSelection.delete(key);
    });
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalizeClassNameEdit(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .trim()
      .replace(/^\.+/, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  function isValidCustomClassName(api, value, currentId) {
    const next = String(value || '').trim();
    if (!next) return false;
    if (!/^-?[_a-zA-Z]+[-_a-zA-Z0-9]*$/.test(next)) return false;
    if (isSystemClassName(api, next)) return false;

    const existing = api?.layout?.classNameManager?.findByName?.(next)
      || getCollections(api)
        .map(({ collection }) => collection.findByName?.(next))
        .find(Boolean)
      || null;
    return !existing || String(existing.id || '') === String(currentId || '');
  }

  function selectorTextWithRenamedClass(text, from, to) {
    return String(text || '').replace(
      new RegExp(`\\.${escapeRegExp(from)}(?![-_a-zA-Z0-9])`, 'g'),
      `.${to}`
    );
  }

  function renameSelectorsByClass(api, from, to) {
    const renameInManager = (manager) => {
      if (!manager?.list || typeof manager.duplicate !== 'function' || typeof manager.delete !== 'function') return false;

      manager.list
        .filter((selector) => selectorHasClass(selector, from))
        .forEach((selector) => {
          manager.duplicate(selector, from, to);
          manager.delete(`${selector.media}/${selector.selectorText}`);
        });
      return true;
    };

    if (renameInManager(api?.layout?.classNameController?.selectorManager)) return;

    getSelectorCollections(api).forEach((collection) => {
      if (renameInManager(collection)) return;
      if (!collection?.map) return;

      const nextMap = collection.map instanceof Map ? new Map() : {};
      const setNext = (key, selector) => {
        if (nextMap instanceof Map) nextMap.set(key, selector);
        else nextMap[key] = selector;
      };
      const entries = collection.map instanceof Map
        ? Array.from(collection.map.entries())
        : Object.entries(collection.map);

      entries.forEach(([key, selector]) => {
        const nextKey = selectorTextWithRenamedClass(key, from, to);
        if (selector?.selectorText) selector.selectorText = selectorTextWithRenamedClass(selector.selectorText, from, to);
        setNext(nextKey, selector);
      });
      collection.map = nextMap;
    });
  }

  function renameClassRow(row, nextValue) {
    const api = getTaptopApi();
    const next = normalizeClassNameEdit(nextValue);
    const className = row?.id ? getClassNameById(api, row.id) : null;
    const oldValue = String(className?.value || row?.value || '').trim();

    if (!api || !row || row.type === 'reserve' || !className || !oldValue) return false;
    if (next === oldValue) return true;
    if (!isValidCustomClassName(api, next, row.id)) return false;

    const controller = api.layout?.classNameController;
    let renamed = false;
    try {
      if (typeof api.classNameActions?.renameClassName === 'function' && controller) {
        api.classNameActions.renameClassName(className, next, controller);
        renamed = String(className.value || '') !== oldValue;
      } else if (typeof controller?.rename === 'function') {
        renamed = controller.rename(className, next) && String(className.value || '') !== oldValue;
        if (renamed && api.events?.ON_HISTORYCAL_EVENT) {
          api.events.emit?.(api.events.ON_HISTORYCAL_EVENT, 'rename className');
        }
      }
    } catch {}

    if (!renamed) {
      renameSelectorsByClass(api, oldValue, next);
      setClassNameValue(className, next);
      row.collection?.setCountByName?.(next);
      row.collection?.cleanCountByName?.(oldValue);
      if (api.events?.ON_HISTORYCAL_EVENT) {
        api.events.emit?.(api.events.ON_HISTORYCAL_EVENT, 'rename className');
      }
      renamed = true;
    }

    if (!renamed) return false;
    return true;
  }

  function plainEditableText(element) {
    return String(element?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function flashInvalidEditable(element) {
    element.classList.add('is-invalid');
    element.title = 'Некорректное или уже занятое имя класса';
    clearTimeout(element.__ttInvalidTimer);
    element.__ttInvalidTimer = setTimeout(() => {
      element.classList.remove('is-invalid');
    }, 1400);
  }

  function makeClassNameEditable(element, row, onRenamed) {
    if (!element || row?.type === 'reserve') return;

    element.setAttribute('contenteditable', 'plaintext-only');
    element.setAttribute('spellcheck', 'false');
    element.setAttribute('role', 'textbox');
    element.setAttribute('aria-label', 'Переименовать класс');
    element.tabIndex = 0;

    let original = String(row.value || '');
    let escapeRequested = false;

    const resetText = (value) => {
      element.textContent = value;
      element.title = value;
    };
    const commit = () => {
      const next = normalizeClassNameEdit(plainEditableText(element));
      if (!next || next === original) {
        resetText(original);
        return true;
      }
      if (!renameClassRow(row, next)) {
        flashInvalidEditable(element);
        return false;
      }
      onRenamed?.();
      return true;
    };

    element.addEventListener('focus', () => {
      original = String(row.value || element.textContent || '');
      element.classList.remove('is-invalid');
    });
    element.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        event.preventDefault();
        if (commit()) element.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        escapeRequested = true;
        resetText(original);
        element.blur();
      }
    });
    element.addEventListener('keypress', (event) => event.stopPropagation());
    element.addEventListener('keyup', (event) => event.stopPropagation());
    element.addEventListener('paste', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const text = event.clipboardData?.getData?.('text/plain') || '';
      try {
        document.execCommand('insertText', false, text.replace(/\s+/g, ' '));
      } catch {
        element.textContent += text.replace(/\s+/g, ' ');
      }
    });
    element.addEventListener('blur', () => {
      if (escapeRequested) {
        escapeRequested = false;
        return;
      }
      if (!commit()) resetText(original);
    });
  }

  function closeModal() {
    state.modal?.remove?.();
    state.modal = null;
    state.projectClassSelection.clear();
  }

  function focusWithoutScroll(element) {
    try {
      element?.focus?.({ preventScroll: true });
    } catch {
      element?.focus?.();
    }
  }

  function restoreListScroll(list, scrollTop) {
    if (!scrollTop) return;
    requestAnimationFrame(() => {
      list.scrollTop = scrollTop;
    });
  }

  function renderModal(query = '', unusedOnly = false, scrollTop = 0) {
    const api = getTaptopApi();
    if (!api) return;
    ensureStyle();

    const normalizedQuery = String(query || '').trim().toLowerCase();
    const projectRows = getClassRows(api);
    const unusedRows = projectRows.filter((row) => row.unused);
    const allRows = projectRows.filter((row) => row.value.toLowerCase().includes(normalizedQuery));
    const rows = unusedOnly ? allRows.filter((row) => row.unused) : allRows;
    pruneProjectClassSelection(rows);
    const rowKeys = rows.map(classRowSelectionKey);
    const selectedRows = rows.filter((row) => state.projectClassSelection.has(classRowSelectionKey(row)));
    const selectedCount = selectedRows.length;
    const selectedVisibleCount = rowKeys.filter((key) => state.projectClassSelection.has(key)).length;
    const selectionMode = selectedCount > 0;

    if (!state.modal) {
      const backdrop = document.createElement('div');
      backdrop.className = 'tt-enhancer-class-manager-backdrop';
      backdrop.addEventListener('mousedown', (event) => {
        if (event.target === backdrop) closeModal();
      });

      const modal = document.createElement('div');
      modal.className = 'tt-enhancer-class-manager-modal';
      modal.addEventListener('mousedown', (event) => event.stopPropagation());

      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      state.modal = backdrop;

      if (!state.keydownListener) {
        state.keydownListener = (event) => {
          if (
            event.key === 'Escape'
            && !event.target?.closest?.('[contenteditable="plaintext-only"], [contenteditable="true"]')
          ) closeModal();
        };
        document.addEventListener('keydown', state.keydownListener, true);
      }
    }

    const modal = state.modal.querySelector('.tt-enhancer-class-manager-modal');
    modal.innerHTML = '';

    const head = document.createElement('div');
    head.className = 'tt-enhancer-class-manager-head';

    const search = document.createElement('input');
    search.className = 'tt-enhancer-class-manager-search';
    search.type = 'search';
    search.placeholder = 'Поиск';
    search.value = query;
    search.addEventListener('input', () => {
      state.projectClassSelection.clear();
      renderModal(search.value, unusedOnly);
    });

    const close = document.createElement('button');
    close.className = 'tt-enhancer-class-manager-close';
    close.type = 'button';
    close.title = 'Закрыть';
    close.innerHTML = iconSvg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>');
    close.addEventListener('click', closeModal);

    const controls = document.createElement('div');
    controls.className = 'tt-enhancer-class-manager-controls';

    const controlsMain = document.createElement('div');
    controlsMain.className = 'tt-enhancer-class-manager-controls-main';

    const selectAll = document.createElement('label');
    selectAll.className = 'tt-enhancer-class-manager-select-all';
    const selectAllInput = document.createElement('input');
    selectAllInput.type = 'checkbox';
    selectAllInput.checked = !!rows.length && selectedVisibleCount === rows.length;
    selectAllInput.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < rows.length;
    selectAllInput.disabled = !rows.length;
    selectAllInput.addEventListener('change', () => {
      rowKeys.forEach((key) => {
        if (selectAllInput.checked) state.projectClassSelection.add(key);
        else state.projectClassSelection.delete(key);
      });
      renderModal(search.value, filterInput.checked, list.scrollTop);
    });
    const selectAllText = document.createElement('span');
    selectAllText.textContent = 'Выделить все';
    selectAll.append(selectAllInput, selectAllText);

    const filter = document.createElement('label');
    filter.className = 'tt-enhancer-class-manager-filter';
    const filterInput = document.createElement('input');
    filterInput.type = 'checkbox';
    filterInput.checked = unusedOnly;
    filterInput.addEventListener('change', () => {
      state.projectClassSelection.clear();
      renderModal(search.value, filterInput.checked);
    });
    const filterText = document.createElement('span');
    filterText.textContent = 'Только неиспользуемые';
    filter.append(filterInput, filterText);
    controlsMain.append(selectAll, filter);

    controls.append(controlsMain);

    head.append(search, close, controls);

    const list = document.createElement('div');
    list.className = 'tt-enhancer-class-manager-list';

    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'tt-enhancer-class-manager-empty';
      empty.textContent = unusedOnly
        ? 'Неиспользуемых классов нет'
        : (normalizedQuery ? 'Ничего не найдено' : 'Пользовательских классов нет');
      list.appendChild(empty);
    } else {
      rows.forEach((row) => {
        const key = classRowSelectionKey(row);
        const checked = state.projectClassSelection.has(key);
        const item = document.createElement('div');
        item.className = 'tt-enhancer-class-manager-row';
        if (selectionMode) item.classList.add('is-select-mode');
        if (checked) item.classList.add('is-selected');

        const checkbox = document.createElement('input');
        checkbox.className = 'tt-enhancer-class-manager-row-check';
        checkbox.type = 'checkbox';
        checkbox.checked = checked;
        checkbox.title = `Выбрать ${row.value}`;
        checkbox.setAttribute('aria-label', `Выбрать ${row.value}`);
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) state.projectClassSelection.add(key);
          else state.projectClassSelection.delete(key);
          renderModal(search.value, filterInput.checked, list.scrollTop);
        });

        const info = document.createElement('div');
        info.className = 'tt-enhancer-class-manager-row-info';
        const name = document.createElement('div');
        name.className = 'tt-enhancer-class-manager-name';
        name.textContent = row.value;
        name.title = row.value;
        makeClassNameEditable(name, row, () => renderModal(search.value, filterInput.checked, list.scrollTop));
        const meta = document.createElement('div');
        meta.className = 'tt-enhancer-class-manager-meta';
        meta.textContent = row.meta;
        info.append(name, meta);

        item.append(checkbox);
        item.append(info);
        if (!selectionMode) {
          const remove = document.createElement('button');
          remove.className = 'tt-enhancer-class-manager-remove';
          remove.type = 'button';
          remove.title = 'Удалить';
          remove.innerHTML = iconSvg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/>');
          remove.addEventListener('click', () => {
            const nextScrollTop = list.scrollTop;
            if (deleteClassRow(row)) renderModal(search.value, filterInput.checked, nextScrollTop);
          });
          item.append(remove);
        }
        list.appendChild(item);
      });
    }

    const summary = document.createElement('div');
    summary.className = 'tt-enhancer-class-manager-summary';
    const summaryText = document.createElement('div');
    summaryText.className = 'tt-enhancer-class-manager-summary-text';
    const shownText = unusedOnly
      ? `Показано неиспользуемых: ${rows.length} из ${allRows.length}`
      : `Показано: ${rows.length}`;
    summaryText.textContent = selectionMode && selectedCount ? `${shownText} · выбрано: ${selectedCount}` : shownText;
    summary.append(summaryText);

    if (selectionMode && selectedCount) {
      const deleteAll = document.createElement('button');
      deleteAll.className = 'tt-enhancer-class-manager-delete-all';
      deleteAll.type = 'button';
      deleteAll.textContent = 'Удалить выбранные';
      deleteAll.title = `Удалить выбранные классы: ${selectedCount}`;
      deleteAll.addEventListener('click', () => {
        const nextScrollTop = list.scrollTop;
        if (deleteClassRows(selectedRows)) {
          state.projectClassSelection.clear();
          renderModal(search.value, filterInput.checked, nextScrollTop);
        }
      });
      summary.append(deleteAll);
    } else {
      const deleteUnused = document.createElement('button');
      deleteUnused.className = 'tt-enhancer-class-manager-delete-unused';
      deleteUnused.type = 'button';
      deleteUnused.textContent = 'Удалить неиспользуемые';
      deleteUnused.title = unusedRows.length
        ? `Удалить все неиспользуемые классы: ${unusedRows.length}`
        : 'Неиспользуемых классов нет';
      deleteUnused.disabled = !unusedRows.length;
      deleteUnused.addEventListener('click', () => {
        if (!unusedRows.length) return;
        const nextScrollTop = list.scrollTop;
        if (deleteClassRows(unusedRows)) {
          state.projectClassSelection.clear();
          renderModal(search.value, filterInput.checked, nextScrollTop);
        }
      });
      summary.append(deleteUnused);
    }

    modal.append(head, list, summary);
    restoreListScroll(list, scrollTop);
    focusWithoutScroll(search);
  }

  function renderLayerClassNode(list, node, query, renderAgain) {
    const item = document.createElement('div');
    item.className = 'tt-enhancer-class-manager-layer-node';
    item.style.setProperty('--tt-layer-depth', String(Math.min(node.depth, 12)));

    const row = document.createElement('div');
    row.className = 'tt-enhancer-class-manager-layer-row';

    const arrow = document.createElement('span');
    arrow.className = 'tt-enhancer-class-manager-layer-arrow' + (node.children.length ? '' : ' is-empty');

    const icon = document.createElement('span');
    icon.className = 'tt-enhancer-class-manager-layer-icon';
    icon.innerHTML = node.icon;

    const title = document.createElement('div');
    title.className = 'tt-enhancer-class-manager-layer-title';
    title.textContent = node.title;
    title.title = node.title;

    row.append(arrow, icon, title);
    item.appendChild(row);

    if (node.classes.length) {
      const classes = document.createElement('div');
      classes.className = 'tt-enhancer-class-manager-layer-classes';

      node.classes.forEach((classRow) => {
        const classItem = document.createElement('div');
        classItem.className = 'tt-enhancer-class-manager-layer-class';

        const name = document.createElement('div');
        name.className = 'tt-enhancer-class-manager-layer-class-name';
        name.textContent = classRow.value;
        name.title = classRow.value;
        makeClassNameEditable(name, classRow, () => renderAgain(query, list.scrollTop));

        const remove = document.createElement('button');
        remove.className = 'tt-enhancer-class-manager-remove';
        remove.type = 'button';
        remove.title = 'Убрать класс со слоя';
        remove.innerHTML = iconSvg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>');
        remove.addEventListener('click', () => {
          const nextScrollTop = list.scrollTop;
          if (removeClassFromLayer(classRow)) renderAgain(query, nextScrollTop);
        });

        classItem.append(name, remove);
        classes.appendChild(classItem);
      });

      item.appendChild(classes);
    }

    list.appendChild(item);
    node.children.forEach((child) => renderLayerClassNode(list, child, query, renderAgain));
  }

  function renderLayerClassesModal(query = '', scrollTop = 0) {
    const api = getTaptopApi();
    if (!api) return;
    ensureStyle();

    const selected = getSelectedTag(api);
    const tree = selected ? filterLayerClassTree(buildLayerClassTree(api, selected), query) : null;
    const total = countLayerClasses(tree);

    if (!state.modal) {
      const backdrop = document.createElement('div');
      backdrop.className = 'tt-enhancer-class-manager-backdrop';
      backdrop.addEventListener('mousedown', (event) => {
        if (event.target === backdrop) closeModal();
      });

      const modal = document.createElement('div');
      modal.className = 'tt-enhancer-class-manager-modal';
      modal.addEventListener('mousedown', (event) => event.stopPropagation());

      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      state.modal = backdrop;

      if (!state.keydownListener) {
        state.keydownListener = (event) => {
          if (
            event.key === 'Escape'
            && !event.target?.closest?.('[contenteditable="plaintext-only"], [contenteditable="true"]')
          ) closeModal();
        };
        document.addEventListener('keydown', state.keydownListener, true);
      }
    }

    const modal = state.modal.querySelector('.tt-enhancer-class-manager-modal');
    modal.innerHTML = '';

    const head = document.createElement('div');
    head.className = 'tt-enhancer-class-manager-head';

    const search = document.createElement('input');
    search.className = 'tt-enhancer-class-manager-search';
    search.type = 'search';
    search.placeholder = 'Поиск по слоям и классам';
    search.value = query;
    search.addEventListener('input', () => renderLayerClassesModal(search.value));

    const close = document.createElement('button');
    close.className = 'tt-enhancer-class-manager-close';
    close.type = 'button';
    close.title = 'Закрыть';
    close.innerHTML = iconSvg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>');
    close.addEventListener('click', closeModal);

    head.append(search, close);

    const list = document.createElement('div');
    list.className = 'tt-enhancer-class-manager-list';

    if (!selected) {
      const empty = document.createElement('div');
      empty.className = 'tt-enhancer-class-manager-empty';
      empty.textContent = 'Активный слой не выбран';
      list.appendChild(empty);
    } else if (!tree || total === 0) {
      const empty = document.createElement('div');
      empty.className = 'tt-enhancer-class-manager-empty';
      empty.textContent = String(query || '').trim()
        ? 'Ничего не найдено'
        : 'В выбранном слое и вложенных слоях пользовательских классов нет';
      list.appendChild(empty);
    } else {
      renderLayerClassNode(list, tree, query, renderLayerClassesModal);
    }

    const summary = document.createElement('div');
    summary.className = 'tt-enhancer-class-manager-summary';
    summary.textContent = selected
      ? `Слой: ${getTagTitle(selected)} · классов: ${total}`
      : 'Выберите слой и откройте список снова';

    modal.append(head, list, summary);
    restoreListScroll(list, scrollTop);
    focusWithoutScroll(search);
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function textEqualsAny(value, texts) {
    const text = normalizeText(value);
    return texts.some((item) => text === item);
  }

  function normalizeMenuItemElement(menu, item) {
    const roleItem = item.closest?.('button, [role="menuitem"], li');
    if (roleItem && menu.contains(roleItem)) return roleItem;

    let current = item;
    while (current?.parentElement && current.parentElement !== menu) {
      const parent = current.parentElement;
      if (normalizeText(parent.textContent) !== normalizeText(current.textContent)) break;
      current = parent;
    }
    return current;
  }

  function getPotentialMenuItems(menu) {
    const seen = new Set();
    return Array.from(menu.querySelectorAll([
      'button.tt-context-menu-item',
      'button[class*="tt-context-menu-item"]',
      '.tt-context-menu-item',
      '[class*="tt-context-menu-item"]',
      'button',
      '[role="menuitem"]'
    ].join(',')))
      .map((item) => normalizeMenuItemElement(menu, item))
      .filter((item) => {
        if (!(item instanceof HTMLElement) || seen.has(item)) return false;
        if (!normalizeText(item.textContent)) return false;
        const style = getComputedStyle(item);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        seen.add(item);
        return true;
      });
  }

  function findLayerContextDeleteItem(menu) {
    const items = getPotentialMenuItems(menu).filter((item) => !item.hasAttribute(DELETE_LAYER_BUTTON_ATTR));
    const hasLayerMenuAnchor = items.some((item) => textEqualsAny(item.textContent, LAYER_MENU_ANCHOR_TEXTS));

    const deleteItem = items.find((item) => (
      textEqualsAny(item.textContent, LAYER_MENU_DELETE_TEXTS)
    ));
    if (!deleteItem) return null;

    return hasLayerMenuAnchor || state.layerContextTagId ? deleteItem : null;
  }

  function getLayerContextMenuCandidates() {
    return Array.from(document.querySelectorAll([
      '.tt-context-menu',
      '[role="menu"]'
    ].join(','))).filter((menu) => menu instanceof HTMLElement);
  }

  function getLayerContextMenuBox(menu) {
    if (!(menu instanceof HTMLElement)) return null;
    return Array.from(menu.children || []).find((child) => (
      child instanceof HTMLElement
      && String(child.className || '').includes('tt-context-menu__popup')
    )) || menu;
  }

  function getLayerContextMenuContent(menu) {
    return menu?.querySelector?.('.tt-context-menu__popup__content')
      || getLayerContextMenuBox(menu);
  }

  function closeLayerContextMenu(menuItem) {
    try {
      state.layerContextButton?.remove?.();
      state.layerContextButton = null;
    } catch {}
    try {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
    } catch {}
    try {
      getTaptopApi()?.layers?.setProp?.('edit', null);
    } catch {}
  }

  function setMenuItemText(item, text) {
    const value = item.querySelector?.('[class*="tt-context-menu-item__value"]');
    if (value) value.textContent = text;
    else item.textContent = text;
  }

  function positionLayerContextButton(button, anchor, menu) {
    const menuBox = getLayerContextMenuBox(menu);
    const contentEl = getLayerContextMenuContent(menu);


    // Re-read rects after potential expansion
    const itemRect = anchor?.getBoundingClientRect?.();
    const contentRect = contentEl?.getBoundingClientRect?.();
    const menuRect = menuBox?.getBoundingClientRect?.();
    const popupRect = menuRect || contentRect;
    const point = state.layerContextPoint || {};
    const width = Math.round(popupRect?.width || itemRect?.width || 200);
    const height = Math.max(28, Math.round(itemRect?.height || 40));
    const left = Math.round(popupRect?.left ?? itemRect?.left ?? point.x ?? 0);
    // +1px gap to prevent hover bleed from the item above
    const top = Math.round((itemRect?.bottom ?? contentRect?.bottom ?? menuRect?.bottom ?? ((point.y || 0) + 120)) + 1);
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxTop = Math.max(8, window.innerHeight - height - 8);
    button.style.left = `${Math.max(8, Math.min(left, maxLeft))}px`;
    button.style.top = `${Math.max(8, Math.min(top, maxTop))}px`;
    button.style.width = `${width}px`;
    button.style.height = `${height}px`;
    button.style.minHeight = `${height}px`;

    // Copy styles from the anchor and menu to perfectly match the theme
    if (anchor) {
      const anchorStyle = getComputedStyle(anchor);
      button.style.color = anchorStyle.color;
      button.style.fontFamily = anchorStyle.fontFamily;
      button.style.fontSize = anchorStyle.fontSize;
      button.style.fontWeight = anchorStyle.fontWeight;
      button.style.lineHeight = anchorStyle.lineHeight;
      const valueChild = anchor.querySelector('[class*="tt-context-menu-item__value"]');
      if (valueChild) {
        const valStyle = getComputedStyle(valueChild);
        const myValue = button.querySelector('.tt-context-menu-item__value');
        if (myValue) {
          myValue.style.fontSize = valStyle.fontSize;
          myValue.style.fontWeight = valStyle.fontWeight;
        }
      }
    }

    // Find the solid background color of the menu container
    let currentEl = anchor || menu;
    while (currentEl && currentEl !== document.body) {
      const style = getComputedStyle(currentEl);
      if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
        button.style.backgroundColor = style.backgroundColor;
        break;
      }
      currentEl = currentEl.parentElement;
    }
  }

  function buildDeleteLayerMenuItem(deleteItem, tagId) {
    const button = document.createElement('button');
    button.setAttribute(DELETE_LAYER_BUTTON_ATTR, '1');
    button.setAttribute('role', 'menuitem');
    button.className = 'tt-context-menu-item tt-enhancer-layer-delete-classes-floating';
    button.type = 'button';
    button.dataset.ttEnhancerLayerTagId = tagId || '';
    const value = document.createElement('div');
    value.className = 'tt-context-menu-item__value';
    value.textContent = DELETE_LAYER_CLASSES_TEXT;
    button.appendChild(value);

    const stop = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    button.addEventListener('pointerdown', stop, true);
    button.addEventListener('mousedown', stop, true);
    button.addEventListener('mouseup', stop, true);
    button.addEventListener('click', (event) => {
      stop(event);
      const targetTagId = button.dataset.ttEnhancerLayerTagId || tagId;
      closeLayerContextMenu(button);
      requestAnimationFrame(() => {
        if (window[STATE_KEY] === state) deleteLayerClasses(targetTagId);
      });
    }, true);

    return button;
  }

  function mountDeleteLayerMenuItem(tagId = state.layerContextTagId) {
    if (!tagId || !getTaptopApi()) {
      state.layerContextButton?.remove?.();
      state.layerContextButton = null;
      return false;
    }

    ensureStyle();

    const menus = getLayerContextMenuCandidates();
    if (!menus.length) {
      state.layerContextButton?.remove?.();
      state.layerContextButton = null;
      return false;
    }

    const menuMatches = menus.map((menu) => ({
      menu,
      deleteItem: findLayerContextDeleteItem(menu)
    }));
    const match = menuMatches.find(({ deleteItem }) => !!deleteItem) || menuMatches[0] || null;
    const deleteItem = match?.deleteItem || null;
    const menu = match?.menu || null;

    if (!deleteItem && !menu) {
      state.layerContextButton?.remove?.();
      state.layerContextButton = null;
      return false;
    }

    const existing = state.layerContextButton?.isConnected ? state.layerContextButton : null;
    if (existing) {
      setMenuItemText(existing, DELETE_LAYER_CLASSES_TEXT);
      existing.dataset.ttEnhancerLayerTagId = tagId;
      positionLayerContextButton(existing, deleteItem, menu);
      return true;
    }

    const button = buildDeleteLayerMenuItem(deleteItem, tagId);
    positionLayerContextButton(button, deleteItem, menu);
    document.body.appendChild(button);
    state.layerContextButton = button;
    return true;
  }

  function hasLayerContextDeleteAnchor() {
    return getLayerContextMenuCandidates().some((menu) => !!findLayerContextDeleteItem(menu));
  }

  function scheduleDeleteLayerMenuMount(edit) {
    const tagId = String(edit?.id || '');
    if (!tagId) return;
    state.layerContextTagId = tagId;
    state.layerContextPoint = (
      Number.isFinite(edit?.x) && Number.isFinite(edit?.y)
        ? { x: edit.x, y: edit.y }
        : state.layerContextPoint
    );

    state.contextMenuTimers.forEach((timer) => clearTimeout(timer));
    state.contextMenuTimers = [0, 40, 90, 160, 280, 450, 700, 1000].map((delay) => setTimeout(() => {
      if (window[STATE_KEY] !== state) return;
      mountDeleteLayerMenuItem(tagId);
    }, delay));
    state.contextMenuTimers.push(setTimeout(() => {
      if (state.layerContextTagId === tagId) state.layerContextTagId = '';
      if (!hasLayerContextDeleteAnchor()) {
        state.layerContextButton?.remove?.();
        state.layerContextButton = null;
      }
      state.contextMenuTimers = [];
    }, 2200));
  }

  function patchLayersEditState() {
    const api = getTaptopApi();
    const layers = api?.layers;
    if (!layers || typeof layers.setProp !== 'function') return false;
    if (state.layersSetPropPatch?.layers === layers) return true;
    if (layers.setProp.__ttEnhancerDeleteLayerWithClassesPatched) {
      if (typeof layers.setProp.__ttEnhancerDeleteLayerWithClassesOriginal === 'function') {
        layers.setProp = layers.setProp.__ttEnhancerDeleteLayerWithClassesOriginal;
      } else {
        return true;
      }
    }

    const original = layers.setProp;
    const patched = function patchedSetLayerProp(prop, value) {
      const result = original.apply(this, arguments);
      if (prop === 'edit' && value?.id) {
        scheduleDeleteLayerMenuMount(value);
      }
      return result;
    };
    patched.__ttEnhancerDeleteLayerWithClassesPatched = true;
    patched.__ttEnhancerDeleteLayerWithClassesOriginal = original;
    layers.setProp = patched;
    state.layersSetPropPatch = { layers, original, patched };
    return true;
  }

  function onLayerContextMenu(event) {
    const item = event.target?.closest?.(LAYER_ITEM_SELECTOR);
    const list = item?.closest?.(LAYERS_LIST_SELECTOR);
    if (!list || !item || !list.contains(item)) {
      state.layerContextTagId = '';
      return;
    }

    const api = getTaptopApi();
    const tag = getLayerTagFromItem(api, item, true);
    const id = getTagId(tag);
    const tagId = id ? (getOriginalId(api, id) || id) : '';
    scheduleDeleteLayerMenuMount({ id: tagId, x: event.clientX, y: event.clientY });
  }

  function mountMenuItemFromMutation() {
    if (state.layerContextTagId) mountDeleteLayerMenuItem();
    else if (state.layerContextButton?.isConnected && !hasLayerContextDeleteAnchor()) {
      state.layerContextButton.remove();
      state.layerContextButton = null;
    }
    if (state.button?.isConnected && state.layerButton?.isConnected) return;
    if (!document.querySelector('.tt-search-replace__menu, [role="menu"]')) return;
    mountMenuItem();
  }

  function scheduleMenuItemMount() {
    [0, 120, 300, 700, 1200].forEach((delay) => {
      setTimeout(() => {
        if (window[STATE_KEY] === state) mountMenuItem();
      }, delay);
    });
  }

  function findSearchReplaceMenu() {
    const menus = Array.from(document.querySelectorAll('.tt-search-replace__menu, [role="menu"]'));
    return menus.find((menu) => {
      if (!(menu instanceof HTMLElement)) return false;
      return Array.from(menu.querySelectorAll('button, [role="menuitem"]')).some((item) => {
        const text = normalizeText(item.textContent);
        return text === 'Поиск и замена';
      });
    }) || null;
  }

  function closeSearchReplaceMenu(menuItem) {
    const root = menuItem.closest('.tt-search-replace');
    root?.classList?.remove?.('is-open');
    root?.querySelector?.('[data-role="trigger"]')?.setAttribute?.('aria-expanded', 'false');
  }

  function mountMenuItem() {
    if (state.button?.isConnected && state.layerButton?.isConnected) return true;
    if (!getTaptopApi()) return false;

    const menu = findSearchReplaceMenu();
    if (!menu) return false;

    ensureStyle();

    const makeButton = (attr, action, title, text, onClick) => {
      const existing = menu.querySelector(`[${attr}]`);
      if (existing) return existing;

      const button = document.createElement('button');
      button.className = 'tt-enhancer-class-manager-menu-item';
      button.type = 'button';
      button.setAttribute('role', 'menuitem');
      button.setAttribute('data-action', action);
      button.title = title;
      button.setAttribute(attr, '1');
      button.textContent = text;
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeSearchReplaceMenu(button);
        onClick();
      });
      return button;
    };

    const projectButton = makeButton(
      BUTTON_ATTR,
      'open-class-manager',
      'Пользовательские классы',
      'Классы проекта',
      () => renderModal('')
    );
    const layerButton = makeButton(
      LAYER_BUTTON_ATTR,
      'open-layer-class-manager',
      'Классы активного слоя и вложенных слоев',
      'Классы слоя',
      () => renderLayerClassesModal('')
    );

    const searchReplaceItem = menu.querySelector('[data-action="open-panel"]')
      || Array.from(menu.querySelectorAll('button, [role="menuitem"]')).find((item) => normalizeText(item.textContent) === 'Поиск и замена');
    if (!projectButton.isConnected) {
      if (searchReplaceItem?.after) searchReplaceItem.after(projectButton);
      else menu.appendChild(projectButton);
    }
    if (!layerButton.isConnected) {
      if (projectButton?.after) projectButton.after(layerButton);
      else menu.appendChild(layerButton);
    }

    state.button = projectButton;
    state.layerButton = layerButton;
    return true;
  }

  function startUiMount() {
    patchLayersEditState();
    mountMenuItem();
    scheduleMenuItemMount();
    if (!state.contextmenuListener) {
      state.contextmenuListener = onLayerContextMenu;
      document.addEventListener('contextmenu', state.contextmenuListener, true);
    }
    if (state.observer) return;
    state.observer = new MutationObserver(() => {
      if (state.menuMountRaf) return;
      state.menuMountRaf = requestAnimationFrame(() => {
        state.menuMountRaf = 0;
        mountMenuItemFromMutation();
      });
    });
    state.observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function tryPatch() {
    if (window[STATE_KEY] !== state) return;
    if (patch()) {
      startUiMount();
      return;
    }

    state.attempts += 1;
    if (state.attempts >= MAX_ATTEMPTS) return;
    state.timer = setTimeout(tryPatch, RETRY_DELAY);
  }

  tryPatch();
})();
