(function () {
  const LAYERS_LIST_SELECTOR = '.tt-layers__list';
  const LAYER_ITEM_SELECTOR = '.tt-layers__item';
  const INLINE_BUTTON_ATTR = 'data-tt-enhancer-embed-inline-edit';
  const LEGACY_CREATE_SCRIPT_MENU_ATTR = 'data-tt-enhancer-create-script-menu-item';
  const SCRIPT_WIDGET_ATTR = 'data-tt-enhancer-script-widget';
  const GITHUB_WIDGET_ATTR = 'data-tt-enhancer-github-widget';
  const SCRIPT_DROP_TARGET_ATTR = 'data-tt-enhancer-script-drop-target';
  const SCRIPT_WIDGET_HOVER_OUTLINE_ATTR = 'data-tt-enhancer-script-widget-hover-outline';
  const VISIBILITY_TOGGLES_ATTR = 'data-tt-enhancer-layer-visibility-toggles';
  const OPEN_EDITOR_TEXTS = ['Открыть редактор кода', 'Open code editor'];
  const SETTINGS_TEXTS = ['Настройки', 'Settings'];
  const EDIT_TEXT = 'Редактировать';
  const SCRIPT_WIDGET_TEXT = 'Script';
  const EMBED_WIDGET_TEXT = 'Embed';
  const SVG_ICON_WIDGET_TEXT = 'SVG Icon';
  const SCRIPT_LAYER_NAME = 'script';
  const SCRIPTS_LAYER_NAME = 'Scripts';
  const GITHUB_WIDGET_SCRIPT_DATA_NAME = 'widget-script';
  const SCRIPT_TEMPLATE = '<style>\n \n</style>\n\n<script>\n \n</script>';
  const CLIPBOARD_KEY = 'clipboardData';
  const LAYER_EXPORT_TYPE = 'taptop-enhancer-layer-export';
  const HELPER_CLASS_NAME = 'helper--d-none';
  const SCRIPT_WIDGET_HOVER_BORDER = '#8fc9ff';
  const WIDGET_PANEL_ANCHORS = ['Link Block', EMBED_WIDGET_TEXT, 'Collection', SVG_ICON_WIDGET_TEXT];
  const FEATURE_FLAGS_KEY = '__ttEnhancerEmbedContextMenuFeatures';
  const GITHUB_WIDGET_DRAG_TYPE = 'application/x-tt-enhancer-github-widget';
  const GITHUB_WIDGET_PAGE_SOURCE = 'tt-enhancer-github-widgets';
  const GITHUB_WIDGET_BRIDGE_SOURCE = 'tt-enhancer-github-widgets-bridge';
  const GITHUB_WIDGETS_JSDELIVR_INDEX_URL = 'https://data.jsdelivr.com/v1/packages/gh/GoodMade/tthelper_data@main?structure=flat';
  const GITHUB_WIDGETS_CDN_ROOT = 'https://cdn.jsdelivr.net/gh/GoodMade/tthelper_data@main/widgets';
  const DEFAULT_GITHUB_WIDGET_SOURCE_ID = 'tthelper_data';
  const DEFAULT_GITHUB_WIDGET_SOURCE_TITLE = 'TapTop Helper';
  const featureFlags = window[FEATURE_FLAGS_KEY] || { inlineEdit: true, scriptWidget: true };
  const isInlineEditEnabled = featureFlags.inlineEdit !== false;
  const isScriptWidgetEnabled = featureFlags.scriptWidget !== false;
  const isGithubWidgetsEnabled = featureFlags.githubWidgets === true;

  try {
    window.__ttEnhancerEmbedContextMenu?.observer?.disconnect?.();
    document.removeEventListener('contextmenu', window.__ttEnhancerEmbedContextMenu?.onContextMenu, true);
    document.removeEventListener('click', window.__ttEnhancerEmbedContextMenu?.onLayerClick, true);
    document.removeEventListener('mouseup', window.__ttEnhancerEmbedContextMenu?.onLayerClick, true);
    document.removeEventListener('mousedown', window.__ttEnhancerEmbedContextMenu?.onDocumentMouseDown, true);
    document.removeEventListener('dragover', window.__ttEnhancerEmbedContextMenu?.onDocumentDragOver, true);
    document.removeEventListener('drop', window.__ttEnhancerEmbedContextMenu?.onDocumentDrop, true);
    document.removeEventListener('dragend', window.__ttEnhancerEmbedContextMenu?.onDocumentDragEnd, true);
    document.removeEventListener('scroll', window.__ttEnhancerEmbedContextMenu?.onViewportChange, true);
    window.removeEventListener('resize', window.__ttEnhancerEmbedContextMenu?.onViewportChange, true);
    window.__ttEnhancerEmbedContextMenu?.clearScriptWidgetExpandTimer?.();
    window.__ttEnhancerEmbedContextMenu?.clearGithubWidgetTimers?.();
    document.querySelectorAll(`[${INLINE_BUTTON_ATTR}]`).forEach((el) => el.remove());
    document.querySelectorAll(`[${LEGACY_CREATE_SCRIPT_MENU_ATTR}]`).forEach((el) => el.remove());
    document.querySelectorAll(`[${SCRIPT_WIDGET_ATTR}]`).forEach((el) => el.remove());
    document.querySelectorAll(`[${GITHUB_WIDGET_ATTR}]`).forEach((el) => el.remove());
    document.querySelectorAll('.tt-enhancer-github-widget-toast').forEach((el) => el.remove());
    document.querySelectorAll(`[${SCRIPT_DROP_TARGET_ATTR}]`).forEach((el) => {
      el.removeAttribute(SCRIPT_DROP_TARGET_ATTR);
      el.style.removeProperty('box-shadow');
      el.style.removeProperty('background');
    });
  } catch {}

  let lastLayerContext = null;
  let scriptWidgetDragState = null;
  let scriptWidgetLastDropState = null;
  let scriptWidgetSuppressClickUntil = 0;
  let scriptWidgetDropInProgress = false;
  let scriptWidgetExpandTimer = null;
  let githubWidgetDragState = null;
  let githubWidgetLastDropState = null;
  let githubWidgetSuppressClickUntil = 0;
  let githubWidgetDropInProgress = false;
  let githubWidgets = [];
  let githubWidgetsLoading = false;
  let githubWidgetsLoaded = false;
  let githubWidgetsLoadFailed = false;
  let githubWidgetsLoadRetries = 0;
  let githubWidgetsRetryTimer = 0;
  let githubWidgetRequestId = 0;
  let githubToastTimer = 0;
  let raf = 0;
  let runtimeRequire = null;

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeSearchText(value) {
    return normalizeText(value).toLocaleLowerCase();
  }

  function findLocalizedTextMatch(value, texts) {
    const haystack = normalizeSearchText(value);
    return texts.find((text) => haystack.includes(normalizeSearchText(text))) || '';
  }

  function hashString(value) {
    let hash = 2166136261;
    const str = String(value || '');
    for (let i = 0; i < str.length; i += 1) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(36);
  }

  function rememberEmbedEditorContext(item) {
    if (!(item instanceof HTMLElement)) return;

    const list = item.closest(LAYERS_LIST_SELECTOR);
    const index = list ? Array.from(list.querySelectorAll(LAYER_ITEM_SELECTOR)).indexOf(item) : -1;
    const text = normalizeText(item.querySelector('.tt-layers__item__text')?.textContent || item.textContent);
    window.__ttEnhancerCurrentEmbedEditorContext = {
      key: ['inline', index, hashString(text)].join(':'),
      label: text,
      updatedAt: Date.now()
    };
  }

  function rememberEmbedEditorContextFromTag(tag) {
    const id = readObjectValue(tag, 'id');
    const label = readObjectValue(tag, 'name') || readObjectValue(tag, 'alias') || readObjectValue(tag, 'type') || 'embed';
    if (!id) return;

    window.__ttEnhancerCurrentEmbedEditorContext = {
      key: ['created', id, hashString(label)].join(':'),
      label,
      updatedAt: Date.now()
    };
  }

  function dispatchMouseClick(el) {
    const opts = { bubbles: true, cancelable: true, view: window };
    try { el.focus?.({ preventScroll: true }); } catch {}
    try {
      el.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ pointerId: 1, pointerType: 'mouse', isPrimary: true }, opts)));
      el.dispatchEvent(new PointerEvent('pointerup', Object.assign({ pointerId: 1, pointerType: 'mouse', isPrimary: true }, opts)));
    } catch {}
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
    try { el.click?.(); } catch {}
  }

  function isVisible(el) {
    if (!(el instanceof HTMLElement)) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function getRuntimeRequire() {
    if (runtimeRequire) return runtimeRequire;

    const chunk = window.rspackChunktaptop_design_editor;
    if (!chunk || typeof chunk.push !== 'function') return null;

    try {
      const chunkId = `tt-enhancer-embed-edit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
        components: req(90309)?.A,
        constants: req(89224),
        layers: req(39510)?.A,
        layout: req(36945)?.A,
        runtime: req(87621)?.A,
        events: req(91893)?.A,
        ui: req(68089)?.A,
        clientOverlay: req(96750)?.A,
        dropPosition: req(66093)?.A,
        widgets: req(71842)?.A
      };
    } catch {
      return null;
    }
  }

  function saveHistory(label) {
    try {
      getRuntimeRequire()?.(16271)?.A?.add?.(label);
    } catch {}
  }

  function dispatchCssUpdate(api) {
    try {
      api?.events?.emit?.(api.events.ON_CSS_CHANGE, null, true);
      if (api?.events?.ON_CHANGE_TAG_DISPLAY) api.events.emit(api.events.ON_CHANGE_TAG_DISPLAY);
    } catch {}
  }

  function getSelectedTag(api = getTaptopApi()) {
    const selected = api?.runtime?.selected;
    const tree = api?.layout?.tree;
    if (!selected || !tree) return null;

    const originalId = api?.events?.getOriginalID?.(selected) || selected;
    try {
      if (tree.has?.(originalId)) return tree.get(originalId);
      if (tree.has?.(selected)) return tree.get(selected);
      if (tree.composed?.has?.(originalId)) return tree.composed.get(originalId);
      if (tree.composed?.has?.(selected)) return tree.composed.get(selected);
      return tree.get?.(originalId) || tree.get?.(selected) || tree.composed?.get?.(originalId) || tree.composed?.get?.(selected) || null;
    } catch {
      return null;
    }
  }

  function readObjectValue(item, key) {
    if (!item) return '';
    try {
      if (typeof item.get === 'function') return item.get(key) || '';
    } catch {}
    return item[key] || '';
  }

  function isEmbedValue(value) {
    return String(value || '').split(/[_:-]+/).some((part) => /^embed$/i.test(part));
  }

  function hasObjectFlag(item, key) {
    if (!item) return false;
    try {
      if (item[key] === true) return true;
    } catch {}
    try {
      if (typeof item.get === 'function' && item.get(key) === true) return true;
    } catch {}
    return false;
  }

  function isEmbedTag(tag) {
    if (!tag) return false;
    if (hasObjectFlag(tag, 'isEmbedWidget') || hasObjectFlag(tag, 'isCanSetEmbedCode')) return true;
    if (hasCan(tag, 'SET_EMBED_CODE')) return true;

    return [
      readObjectValue(tag, 'type'),
      readObjectValue(tag, 'widgetName'),
      readObjectValue(tag, 'widgetType'),
      readObjectValue(tag, 'widgetCode'),
      readObjectValue(tag, 'widget'),
      readObjectValue(tag, 'code')
    ].some(isEmbedValue);
  }

  function getOriginalId(api, id) {
    return api?.events?.getOriginalID?.(id) || id || '';
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

  function getComposedTag(api, tag) {
    if (!tag) return null;
    const tree = api?.layout?.tree;
    const id = readObjectValue(tag, 'id');
    if (!tree || !id) return tag;

    try {
      if (tree.composed?.has?.(id)) return tree.composed.get(id);
      const byOrigin = tree.getComposedTagByOriginID?.(getOriginalId(api, id));
      if (byOrigin) return byOrigin;
    } catch {}

    return tag;
  }

  function getOriginalTag(api, tag) {
    const tree = api?.layout?.tree;
    const id = typeof tag === 'string' ? tag : readObjectValue(tag, 'id');
    if (!tree || !id) return tag || null;

    const originalId = getOriginalId(api, id);
    try {
      if (tree.has?.(originalId)) return tree.get(originalId);
      return tree.get?.(originalId) || tag || null;
    } catch {
      return tag || null;
    }
  }

  function getLayerItemIndex(item) {
    const list = item?.closest?.(LAYERS_LIST_SELECTOR);
    if (!list) return -1;
    return Array.from(list.querySelectorAll(LAYER_ITEM_SELECTOR)).indexOf(item);
  }

  function getLayerModelFromItem(item, api = getTaptopApi()) {
    if (!(item instanceof HTMLElement)) return null;
    const index = getLayerItemIndex(item);
    const layer = index >= 0 ? api?.layers?.list?.[index] : null;
    if (layer) return layer;

    const tag = getLayerTagFromItem(item, api, false);
    const id = readObjectValue(tag, 'id');
    return id ? api?.layers?.map?.get?.(id) || null : null;
  }

  function getLayerTagFromItem(item, api = getTaptopApi(), useSelectedFallback = true) {
    if (!(item instanceof HTMLElement)) return null;

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

  function hasCan(tag, value) {
    if (!tag) return false;
    try {
      if (typeof tag.hasCan === 'function' && tag.hasCan(value)) return true;
    } catch {}

    const can = readObjectValue(tag, 'can');
    if (Array.isArray(can)) return can.includes(value);
    return String(can || '').split(',').map((item) => item.trim()).includes(value);
  }

  function canInsertInto(tag, api = getTaptopApi()) {
    if (!tag) return false;
    if (tag.isCanSomeInsert || tag.isCanInsert || tag.isCanInsertChildren) return true;

    const constants = api?.constants || {};
    return [
      constants.TZ?.INSERT || 'INSERT',
      constants.TZ?.INSERT_CHILDREN || 'INSERT_CHILDREN',
      constants.TZ?.INSERT_ONLY_DIV || 'INSERT_ONLY_DIV'
    ].some((value) => hasCan(tag, value));
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

  function getRootTag(api = getTaptopApi()) {
    const tree = api?.layout?.tree;
    const rootId = tree?.composed?.root || tree?.root || '';
    return getTagById(api, rootId) || tree?.composed?.get?.(rootId) || tree?.get?.(rootId) || null;
  }

  function findInsertableTargetFromTag(api, tag) {
    let current = getComposedTag(api, tag);
    const visited = new Set();

    while (current) {
      const currentId = readObjectValue(current, 'id');
      if (currentId) {
        if (visited.has(currentId)) break;
        visited.add(currentId);
      }

      if (canInsertInto(current, api)) return current;

      const parent = getTagById(api, getParentId(current));
      current = getComposedTag(api, parent);
    }

    return null;
  }

  function getScriptWidgetTarget(api = getTaptopApi()) {
    const selectedTarget = findInsertableTargetFromTag(api, getSelectedTag(api));
    if (selectedTarget) return selectedTarget;
    const root = getRootTag(api);
    return canInsertInto(root, api) ? root : null;
  }

  function getScriptDropTargetFromLayerItem(item, api = getTaptopApi()) {
    const tag = getLayerTagFromItem(item, api, false);
    return findInsertableTargetFromTag(api, tag);
  }

  function getWidgetCode(api = getTaptopApi()) {
    return api?.constants?.gz?.TT_EMBED || 'tt_embed';
  }

  function getDropWidgetAction(api = getTaptopApi()) {
    return api?.constants?.aI?.DROP_WIDGET || 'drop_widget';
  }

  function clearNativeLayerDragState(api = getTaptopApi()) {
    try {
      api?.runtime?.setDragged?.('');
      api?.runtime?.setCaptured?.('');
      api?.clientOverlay?.setCoords?.(null);
      api?.clientOverlay?.setDragId?.('');
      api?.clientOverlay?.setMode?.(api?.constants?.D$?.REST || 'rest');
      api?.clientOverlay?.setAction?.(api?.constants?.aI?.NONE || '');
      api?.layers?.clearProps?.();
      api?.layers?.setProp?.('action', api?.constants?.aI?.NONE || '');
    } catch {}
  }

  function scheduleNativeLayerDragStateClear(api = getTaptopApi()) {
    [0, 30, 120, 360].forEach((delay) => {
      setTimeout(() => clearNativeLayerDragState(api), delay);
    });
  }

  function setNativeWidgetDragState(api = getTaptopApi(), widgetCode = getWidgetCode(api)) {
    const action = getDropWidgetAction(api);
    try {
      api?.runtime?.setDragged?.(widgetCode);
      api?.clientOverlay?.setMode?.(api?.constants?.D$?.ADD || 'add');
      api?.clientOverlay?.setAction?.(action);
      api?.layers?.setProp?.('drag', widgetCode);
      api?.layers?.setProp?.('action', action);
    } catch {}
  }

  function getGithubWidgetDragCode(api = getTaptopApi()) {
    return api?.constants?.gz?.DIV || 'div';
  }

  function clearStaleScriptWidgetDragState(api = getTaptopApi()) {
    if (scriptWidgetDragState) return;
    const widgetCode = getWidgetCode(api);
    const action = getDropWidgetAction(api);
    if (api?.layers?.drag === widgetCode && api?.layers?.action === action) {
      clearNativeLayerDragState(api);
    }
  }

  function getDropParentFromLayer(api, layer, depth) {
    if (!layer) return '';
    if (Number(layer.depth) === depth - 1) return layer.id || '';

    const parents = Array.isArray(layer.parents) ? [...layer.parents].reverse() : [];
    return parents.find((id) => Number(api?.layers?.map?.get?.(id)?.depth) === depth - 1) || '';
  }

  function calculateLayerDropPosition(api, layer, clientX) {
    if (!layer) return { drop: '', depth: 0 };

    const nextLayer = layer.next ? api?.layers?.map?.get?.(layer.next) : null;
    const minDepth = nextLayer ? Number(nextLayer.depth) || 1 : 1;
    let maxDepth = Number(layer.depth) || 0;
    if (layer.canDrop) maxDepth += 1;

    const depth = Math.min(maxDepth, Math.max(minDepth, Math.floor(Number(clientX || 0) / 30)));
    return {
      drop: getDropParentFromLayer(api, layer, depth),
      depth
    };
  }

  function findNearestLayerItemFromPoint(event) {
    const fromPoint = Array.from(document.elementsFromPoint?.(event.clientX, event.clientY) || [])
      .map((el) => el?.closest?.(LAYER_ITEM_SELECTOR))
      .find((el) => el instanceof HTMLElement);
    if (fromPoint) return fromPoint;

    const isNearLayersList = Array.from(document.querySelectorAll(LAYERS_LIST_SELECTOR))
      .filter(isVisible)
      .some((list) => {
        const rect = list.getBoundingClientRect();
        return (
          event.clientX >= rect.left - 20 &&
          event.clientX <= rect.right + 20 &&
          event.clientY >= rect.top - 80 &&
          event.clientY <= rect.bottom + 80
        );
      });
    if (!isNearLayersList) return null;

    const items = Array.from(document.querySelectorAll(LAYER_ITEM_SELECTOR)).filter(isVisible);
    return items
      .map((item) => {
        const rect = item.getBoundingClientRect();
        const distance = event.clientY < rect.top
          ? rect.top - event.clientY
          : event.clientY > rect.bottom
            ? event.clientY - rect.bottom
            : 0;
        return { item, distance };
      })
      .sort((a, b) => a.distance - b.distance)
      .find(({ distance }) => distance < 80)?.item || null;
  }

  function getLayerDropStateFromEvent(event, api = getTaptopApi()) {
    const item = getLayerItemFromEvent(event) || findNearestLayerItemFromPoint(event);
    const layer = getLayerModelFromItem(item, api);
    if (!item || !layer) return null;

    const rect = item.getBoundingClientRect();
    const isBefore = event.clientY < rect.top + rect.height / 2;
    const referenceId = (isBefore ? layer.prev : layer.id) || layer.id;
    const referenceLayer = api?.layers?.map?.get?.(referenceId) || layer;
    const position = calculateLayerDropPosition(api, referenceLayer, event.clientX);
    let dropId = position.drop || readObjectValue(getScriptDropTargetFromLayerItem(item, api), 'id');
    let dropTag = getTagById(api, dropId);

    if (!canInsertInto(dropTag, api)) {
      dropTag = getScriptDropTargetFromLayerItem(item, api);
      dropId = readObjectValue(dropTag, 'id');
    }

    if (!dropId || !canInsertInto(dropTag, api)) return null;

    return {
      item,
      layer,
      dropId,
      overId: referenceId,
      afterId: isBefore ? layer.prev || '' : layer.id || '',
      beforeId: isBefore ? layer.id || '' : layer.next || '',
      depth: position.depth
    };
  }

  function setNativeLayerDropState(api, dropState) {
    if (!dropState) return;
    try {
      api?.layers?.setProp?.('over', dropState.overId);
      api?.layers?.setProp?.('after', dropState.afterId);
      api?.layers?.setProp?.('before', dropState.beforeId);
      api?.layers?.setProp?.('drop', dropState.dropId);
      api?.layers?.setProp?.('depth', dropState.depth);
    } catch {}
  }

  function isLayerExpanded(api, layerId) {
    if (!layerId) return false;
    const expand = api?.layers?.expand;
    return Array.isArray(expand) ? expand.includes(layerId) : !!expand?.includes?.(layerId);
  }

  function clearScriptWidgetExpandTimer(keepLayerId = '') {
    if (!scriptWidgetExpandTimer) return;
    if (keepLayerId && scriptWidgetExpandTimer.id === keepLayerId) return;

    clearTimeout(scriptWidgetExpandTimer.timer);
    scriptWidgetExpandTimer = null;
  }

  function openScriptWidgetHoverLayer(api, layerId) {
    const currentApi = api || getTaptopApi();
    if (!scriptWidgetDragState || !layerId || isLayerExpanded(currentApi, layerId)) return;

    try {
      if (typeof currentApi?.layers?.open === 'function') {
        currentApi.layers.open(layerId);
      } else {
        currentApi?.layers?.toggle?.(layerId);
      }

      const expanded = Array.from(currentApi?.layers?.expand || []);
      currentApi?.ui?.setCurrentDesignLayerIds?.(expanded);
    } catch {}
  }

  function scheduleScriptWidgetLayerExpand(api, dropState) {
    const layer = dropState?.layer;
    const layerId = layer?.id || '';

    if (!layerId || !layer.children || isLayerExpanded(api, layerId)) {
      clearScriptWidgetExpandTimer();
      return;
    }

    clearScriptWidgetExpandTimer(layerId);
    if (scriptWidgetExpandTimer?.id === layerId) return;

    scriptWidgetExpandTimer = {
      id: layerId,
      timer: setTimeout(() => {
        openScriptWidgetHoverLayer(api, layerId);
        scriptWidgetExpandTimer = null;
      }, 1000)
    };
  }

  function findHelperClass(api = getTaptopApi()) {
    const manager = api?.layout?.classNameManager;
    const mainCollection = api?.layout?.mainClassNameCollection;
    if (!manager || !mainCollection) return null;

    return manager.findByName?.(HELPER_CLASS_NAME) || mainCollection.findByName?.(HELPER_CLASS_NAME) || null;
  }

  function ensureHelperClass(api = getTaptopApi()) {
    const manager = api?.layout?.classNameManager;
    const mainCollection = api?.layout?.mainClassNameCollection;
    if (!manager || !mainCollection) return null;

    let className = findHelperClass(api);
    if (!className) className = mainCollection.generateByName?.(HELPER_CLASS_NAME);
    if (!className) return null;

    if (className.value !== HELPER_CLASS_NAME) {
      if (typeof className.set === 'function') className.set(HELPER_CLASS_NAME);
      else className.value = HELPER_CLASS_NAME;
    }

    if (!manager.has?.(className.id) && !mainCollection.has?.(className.id)) {
      manager.add?.(className);
    }

    return findHelperClass(api) || className;
  }

  function ensureHelperStyle(api = getTaptopApi()) {
    const helperClass = ensureHelperClass(api);
    const selectors = api?.layout?.mainSelectorCollection;
    const constants = api?.constants || {};
    if (!helperClass || !selectors) return null;

    const media = constants.$U?.SCREEN || 'screen';
    const displayProp = constants.Fi?.DISPLAY || 'display';
    const noneValue = constants.nl?.NONE || 'none';
    const selector = selectors.getSelector?.(media, `.${HELPER_CLASS_NAME}`);

    if (selector) {
      const current = selector.getCSS?.(displayProp);
      const currentValue = typeof current === 'string' ? current : current?.value;
      if (currentValue !== noneValue) selector.setCSS?.(displayProp, noneValue);
    }

    dispatchCssUpdate(api);
    return helperClass;
  }

  function applyDisplayNoneClass(api, tag) {
    const helperClass = ensureHelperStyle(api);
    const target = getOriginalTag(api, tag);
    if (!helperClass || !target) return;

    const classIds = Array.isArray(target.classNameIds) ? target.classNameIds : [];
    if (!classIds.includes(helperClass.id)) {
      target.addClassNameId?.(helperClass.id);
    }

    dispatchCssUpdate(api);
  }

  function applyLayerName(api, tag, name) {
    const target = getOriginalTag(api, tag);
    if (!target) return;

    try {
      if (typeof target.setName === 'function') target.setName(name);
      else target.name = name;
    } catch {}
  }

  function applyScriptLayerName(api, tag) {
    applyLayerName(api, tag, SCRIPT_LAYER_NAME);
  }

  function findOpenCodeEditorButton() {
    const clickable = Array.from(document.querySelectorAll('button, [role="button"], .tt-button'));
    const directButton = clickable
      .filter(isVisible)
      .filter((el) => findLocalizedTextMatch(el.textContent, OPEN_EDITOR_TEXTS))
      .sort((a, b) => normalizeText(a.textContent).length - normalizeText(b.textContent).length)
      .find(Boolean);

    if (directButton) return directButton;

    const candidates = Array.from(document.querySelectorAll('*'));
    const textNode = candidates
      .filter(isVisible)
      .filter((el) => {
        const text = normalizeText(el.textContent);
        const match = findLocalizedTextMatch(text, OPEN_EDITOR_TEXTS);
        return match && text.length <= match.length + 20;
      })
      .sort((a, b) => normalizeText(a.textContent).length - normalizeText(b.textContent).length)
      .find(Boolean);

    if (!textNode) return null;
    return textNode.closest('button, [role="button"], .tt-button') || textNode;
  }

  function hasCodeIcon(item) {
    const iconNodes = Array.from(item.querySelectorAll('svg, use, [class*="icon"], [class*="widget"]'));
    return iconNodes.some((node) => {
      const className = String(node.getAttribute('class') || node.className?.baseVal || node.className || '');
      const href = String(
        node.getAttribute('href') ||
        node.getAttribute('xlink:href') ||
        node.getAttributeNS?.('http://www.w3.org/1999/xlink', 'href') ||
        ''
      );
      return /embed/i.test(`${className} ${href}`);
    });
  }

  function isSelectedLayerItem(item) {
    return item.matches([
      '.is-active',
      '.active',
      '.tt-layers__item_selected',
      '.tt-layers__item--selected',
      '[aria-selected="true"]',
      '[data-selected="true"]',
      '[data-active="true"]'
    ].join(','));
  }

  function isEmbedLayerItem(item) {
    if (!(item instanceof HTMLElement)) return false;

    const api = getTaptopApi();
    const itemTag = getLayerTagFromItem(item, api, false);
    if (isEmbedTag(itemTag)) return true;
    if (hasCodeIcon(item)) return true;

    const selectedTag = getSelectedTag(api);
    return isSelectedLayerItem(item) && isEmbedTag(selectedTag);
  }

  function findTextButton(text) {
    const candidates = Array.from(document.querySelectorAll('button, [role="button"], .tt-button, [class*="tab"], [class*="Tabs"] *'));
    const node = candidates
      .filter(isVisible)
      .sort((a, b) => normalizeText(a.textContent).length - normalizeText(b.textContent).length)
      .find((el) => normalizeText(el.textContent) === text);

    return node?.closest('button, [role="button"], .tt-button, [class*="tab"]') || node || null;
  }

  function waitForOpenCodeEditorButton(timeout = 5000) {
    const startedAt = Date.now();
    return new Promise((resolve) => {
      const tick = () => {
        const button = findOpenCodeEditorButton();
        if (button) {
          resolve(button);
          return;
        }
        if (Date.now() - startedAt >= timeout) {
          resolve(null);
          return;
        }
        setTimeout(tick, 80);
      };
      tick();
    });
  }

  async function openCodeEditor() {
    let button = findOpenCodeEditorButton();
    if (!button) {
      const settingsTab = SETTINGS_TEXTS.map(findTextButton).find(Boolean);
      if (settingsTab) dispatchMouseClick(settingsTab);
      button = await waitForOpenCodeEditorButton();
    }

    if (!button) return;

    dispatchMouseClick(button);
  }

  function findCodeEditorAce() {
    const modal = document.querySelector('.tt-popup.tt-universal-modal.tt-popup-code-editor__modal, .tt-popup-code-editor__modal');
    return modal?.querySelector?.('#ace-editor.ace_editor, .ace_editor') || null;
  }

  function waitForCodeEditorAce(timeout = 4000) {
    const startedAt = Date.now();
    return new Promise((resolve) => {
      const tick = () => {
        const aceRoot = findCodeEditorAce();
        if (aceRoot) {
          resolve(aceRoot);
          return;
        }
        if (Date.now() - startedAt >= timeout) {
          resolve(null);
          return;
        }
        setTimeout(tick, 80);
      };
      tick();
    });
  }

  async function ensureCodeEditorTemplate() {
    const aceRoot = await waitForCodeEditorAce();
    if (!aceRoot || !window.ace?.edit) return;

    try {
      const editor = window.ace.edit(aceRoot);
      if (!String(editor.getValue?.() || '').trim()) {
        editor.setValue(SCRIPT_TEMPLATE, -1);
      }
      editor.focus?.();
    } catch {}
  }

  function removeInlineButtons() {
    document.querySelectorAll(`[${INLINE_BUTTON_ATTR}]`).forEach((button) => button.remove());
  }

  function removeOtherInlineButtons() {
    document.querySelectorAll(`[${INLINE_BUTTON_ATTR}]`).forEach((button) => {
      if (button.dataset.ttLayerButtonOwner !== 'active') button.remove();
    });
  }

  function positionInlineButton(button) {
    if (!lastLayerContext || !document.contains(lastLayerContext)) return false;

    const itemRect = lastLayerContext.getBoundingClientRect();
    const panelRect = lastLayerContext.closest('.tt-layers')?.getBoundingClientRect();
    const left = Math.round((panelRect?.right || itemRect.right) + 16);
    const top = Math.round(itemRect.top + itemRect.height / 2);

    if (itemRect.bottom < 0 || itemRect.top > window.innerHeight) {
      button.remove();
      return false;
    }

    button.style.left = `${left}px`;
    button.style.top = `${top}px`;
    return true;
  }

  function buildInlineButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute(INLINE_BUTTON_ATTR, '1');
    button.textContent = EDIT_TEXT;
    button.style.cssText = [
      'position: fixed',
      'left: 0',
      'top: 0',
      'transform: translateY(-50%)',
      'z-index: 2147482500',
      'height: 30px',
      'padding: 0 10px',
      'border: 0',
      'border-radius: 6px',
      'background: #fff',
      'color: #0d7cff',
      'font: 600 13px/30px Inter, Arial, sans-serif',
      'white-space: nowrap',
      'cursor: pointer',
      'box-shadow: inset 0 0 0 1px rgba(13, 124, 255, 0.18), 0 1px 4px rgba(0, 0, 0, 0.12)'
    ].join(';');

    button.addEventListener('mouseenter', () => {
      button.style.background = '#e8f2ff';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = '#fff';
    });

    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    }, true);

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      rememberEmbedEditorContext(lastLayerContext);
      openCodeEditor();
    }, true);

    return button;
  }

  function isWidgetListElement(el) {
    if (!(el instanceof HTMLElement) || !isVisible(el)) return false;

    const text = normalizeText(el.textContent);
    if (!WIDGET_PANEL_ANCHORS.every((label) => text.includes(label))) return false;

    const children = Array.from(el.children).filter((child) => child instanceof HTMLElement && isVisible(child));
    if (children.length < 6) return false;

    const matchingChildren = children.filter((child) => {
      const childText = normalizeText(child.textContent);
      return WIDGET_PANEL_ANCHORS.some((label) => childText === label || childText.includes(label));
    });
    return matchingChildren.length >= 3;
  }

  function findWidgetListFromNode(node) {
    let current = node instanceof HTMLElement ? node.parentElement : null;
    while (current && current !== document.body && current !== document.documentElement) {
      if (isWidgetListElement(current)) return current;
      current = current.parentElement;
    }
    return null;
  }

  function findWidgetCardByText(text) {
    const nodes = Array.from(document.querySelectorAll('button, [role="button"], div, span'))
      .filter(isVisible)
      .sort((a, b) => normalizeText(a.textContent).length - normalizeText(b.textContent).length)
      .filter((el) => normalizeText(el.textContent) === text);

    for (const node of nodes) {
      const list = findWidgetListFromNode(node);
      if (!list) continue;

      let card = node;
      while (card.parentElement && card.parentElement !== list) {
        card = card.parentElement;
      }
      if (card.parentElement === list) return card;
    }

    return null;
  }

  function replaceWidgetCardText(card, text) {
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    let replaced = false;
    const replaceableTexts = [EMBED_WIDGET_TEXT, SVG_ICON_WIDGET_TEXT, SCRIPT_WIDGET_TEXT];

    while (node) {
      if (replaceableTexts.includes(normalizeText(node.nodeValue))) {
        node.nodeValue = text;
        replaced = true;
      }
      node = walker.nextNode();
    }

    if (!replaced) {
      const label = Array.from(card.querySelectorAll('span, div'))
        .filter(isVisible)
        .sort((a, b) => normalizeText(a.textContent).length - normalizeText(b.textContent).length)
        .find((el) => replaceableTexts.includes(normalizeText(el.textContent)));
      if (label) label.textContent = text;
    }
  }

  function removeDisabledClasses(root) {
    [root, ...Array.from(root.querySelectorAll('*'))].forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      Array.from(el.classList).forEach((className) => {
        if (/disabled/i.test(className)) el.classList.remove(className);
      });
      el.removeAttribute('disabled');
      el.removeAttribute('aria-disabled');
    });
  }

  function clearScriptDropTarget() {
    document.querySelectorAll(`[${SCRIPT_DROP_TARGET_ATTR}]`).forEach((item) => {
      item.removeAttribute(SCRIPT_DROP_TARGET_ATTR);
      item.style.removeProperty('box-shadow');
      item.style.removeProperty('background');
    });
  }

  function markScriptDropTarget(item) {
    if (!(item instanceof HTMLElement)) return;
    document.querySelectorAll(`[${SCRIPT_DROP_TARGET_ATTR}]`).forEach((current) => {
      if (current !== item) {
        current.removeAttribute(SCRIPT_DROP_TARGET_ATTR);
        current.style.removeProperty('box-shadow');
        current.style.removeProperty('background');
      }
    });
    item.setAttribute(SCRIPT_DROP_TARGET_ATTR, '1');
    item.style.boxShadow = 'inset 3px 0 0 #2f8cff, inset 0 0 0 1px rgba(47, 140, 255, 0.35)';
    item.style.background = 'rgba(47, 140, 255, 0.08)';
  }

  function stopScriptWidgetEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  }

  function hasVisibleBoxStyle(el) {
    const style = getComputedStyle(el);
    const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some((side) => (
      parseFloat(style[`border${side}Width`]) > 0 &&
      style[`border${side}Style`] !== 'none'
    ));
    const hasRadius = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft']
      .some((corner) => parseFloat(style[`border${corner}Radius`]) > 0);
    const hasBackground = style.backgroundColor && style.backgroundColor !== 'transparent' && style.backgroundColor !== 'rgba(0, 0, 0, 0)';
    return hasBorder || hasRadius || hasBackground;
  }

  function getScriptWidgetHoverSurface(card) {
    const cardRect = card.getBoundingClientRect();
    const cardArea = Math.max(1, cardRect.width * cardRect.height);
    const candidates = [card, ...Array.from(card.querySelectorAll('*'))]
      .filter((el) => el instanceof HTMLElement && isVisible(el) && !el.hasAttribute(SCRIPT_WIDGET_HOVER_OUTLINE_ATTR))
      .map((el, index) => {
        const rect = el.getBoundingClientRect();
        const area = rect.width * rect.height;
        const areaRatio = Math.min(area / cardArea, 1);
        const boxScore = hasVisibleBoxStyle(el) ? 2 : 0;
        const sizeScore = rect.width >= cardRect.width * 0.75 && rect.height >= cardRect.height * 0.75 ? 3 : 0;
        return { el, score: sizeScore + boxScore + areaRatio - index * 0.001 };
      })
      .sort((a, b) => b.score - a.score);

    return candidates[0]?.el || card;
  }

  function setScriptWidgetHover(card, isHovered) {
    if (!(card instanceof HTMLElement)) return;

    card.querySelectorAll(`[${SCRIPT_WIDGET_HOVER_OUTLINE_ATTR}]`).forEach((outline) => outline.remove());
    card.style.removeProperty('outline');
    card.style.removeProperty('outline-offset');

    if (isHovered) {
      const surface = getScriptWidgetHoverSurface(card);
      const outline = document.createElement('span');
      outline.setAttribute(SCRIPT_WIDGET_HOVER_OUTLINE_ATTR, '1');
      outline.style.cssText = [
        'position: absolute',
        'inset: 0',
        `border: 1px solid ${SCRIPT_WIDGET_HOVER_BORDER}`,
        'border-radius: 6px',
        'box-sizing: border-box',
        'pointer-events: none',
        'z-index: 2'
      ].join(';');

      if (getComputedStyle(surface).position === 'static') {
        surface.style.position = 'relative';
      }
      surface.appendChild(outline);
    }
  }

  function isScriptWidgetDragEvent(event) {
    if (scriptWidgetDragState) return true;
    const types = Array.from(event.dataTransfer?.types || []);
    return types.includes('application/x-tt-enhancer-script-widget');
  }

  function startScriptWidgetDrag(event) {
    scriptWidgetDragState = {
      startedAt: Date.now()
    };
    scriptWidgetSuppressClickUntil = Date.now() + 600;
    setNativeWidgetDragState();

    try {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/x-tt-enhancer-script-widget', '1');
      event.dataTransfer.setData('text/plain', SCRIPT_WIDGET_TEXT);
    } catch {}
  }

  function finishScriptWidgetDrag() {
    if (scriptWidgetDragState) scriptWidgetSuppressClickUntil = Date.now() + 600;
    clearScriptWidgetExpandTimer();
    clearScriptDropTarget();
    scheduleNativeLayerDragStateClear();
    setTimeout(() => {
      scriptWidgetDragState = null;
      scriptWidgetLastDropState = null;
    }, 0);
  }

  function clearGithubWidgetTimers() {
    clearTimeout(githubWidgetsRetryTimer);
    clearTimeout(githubToastTimer);
    githubWidgetsRetryTimer = 0;
    githubToastTimer = 0;
  }

  function showGithubWidgetToast(text, duration = 3200) {
    clearTimeout(githubToastTimer);
    document.querySelectorAll('.tt-enhancer-github-widget-toast').forEach((node) => node.remove());

    const toast = document.createElement('div');
    toast.className = 'tt-enhancer-github-widget-toast';
    toast.textContent = text;
    toast.style.cssText = [
      'position: fixed',
      'right: 18px',
      'bottom: 18px',
      'z-index: 2147482600',
      'max-width: 320px',
      'padding: 10px 12px',
      'border-radius: 6px',
      'background: rgba(17, 24, 39, 0.94)',
      'color: #fff',
      'font: 500 13px/1.35 Inter, Arial, sans-serif',
      'opacity: 1',
      'transform: translateY(0)',
      'transition: opacity 0.16s ease, transform 0.16s ease',
      'box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22)'
    ].join(';');
    document.body.appendChild(toast);

    githubToastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      setTimeout(() => toast.remove(), 180);
    }, duration);
  }

  function deepCloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isValidGithubWidgetName(value) {
    return /^[a-zA-Z0-9._-]+$/.test(String(value || ''));
  }

  function normalizeGithubWidgetEntry(widget) {
    if (typeof widget === 'string') {
      const name = widget;
      return {
        key: `${DEFAULT_GITHUB_WIDGET_SOURCE_ID}::${name}`,
        name,
        sourceId: DEFAULT_GITHUB_WIDGET_SOURCE_ID,
        sourceTitle: DEFAULT_GITHUB_WIDGET_SOURCE_TITLE,
        sourceType: 'github'
      };
    }

    const name = String(widget?.name || '').trim();
    const sourceId = String(widget?.sourceId || DEFAULT_GITHUB_WIDGET_SOURCE_ID).trim() || DEFAULT_GITHUB_WIDGET_SOURCE_ID;
    return {
      key: String(widget?.key || `${sourceId}::${name}`),
      name,
      sourceId,
      sourceTitle: String(widget?.sourceTitle || sourceId),
      sourceType: widget?.sourceType || 'github'
    };
  }

  function getGithubWidgetKey(widget) {
    return normalizeGithubWidgetEntry(widget).key;
  }

  function getGithubWidgetFromValue(value) {
    if (value && typeof value === 'object') return normalizeGithubWidgetEntry(value);

    const raw = String(value || '').trim();
    return normalizeGithubWidgetEntry(
      githubWidgets.find((widget) => getGithubWidgetKey(widget) === raw)
      || githubWidgets.find((widget) => widget.name === raw)
      || raw
    );
  }

  function getGithubRawUrl(widgetName, fileName) {
    if (!isValidGithubWidgetName(widgetName)) return '';
    return `${GITHUB_WIDGETS_CDN_ROOT}/${encodeURIComponent(widgetName)}/${encodeURIComponent(fileName)}`;
  }

  function requestGithubWidgetsBridge(action, payload = {}, timeout = 6000) {
    const id = `github-widget-${Date.now()}-${githubWidgetRequestId += 1}`;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        clearInterval(retryTimer);
        window.removeEventListener('message', onMessage);
        reject(new Error('GitHub widgets bridge timeout'));
      }, timeout);
      const retryTimer = setInterval(postRequest, 180);

      function onMessage(event) {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.source !== GITHUB_WIDGET_BRIDGE_SOURCE || data.type !== 'response') return;
        if (data.id !== id) return;

        clearTimeout(timer);
        clearInterval(retryTimer);
        window.removeEventListener('message', onMessage);

        if (data.ok) resolve(data.result);
        else reject(new Error(data.error || 'GitHub widgets bridge error'));
      }

      function postRequest() {
        window.postMessage({
          source: GITHUB_WIDGET_PAGE_SOURCE,
          type: 'request',
          id,
          action,
          payload
        }, '*');
      }

      window.addEventListener('message', onMessage);
      postRequest();
    });
  }

  async function fetchGithubWidgetListDirect() {
    const response = await fetch(GITHUB_WIDGETS_JSDELIVR_INDEX_URL, {
      cache: 'no-cache',
      credentials: 'omit',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`GitHub widgets list failed: ${response.status}`);

    const data = await response.json();
    const files = Array.isArray(data?.files) ? data.files : [];
    const names = new Set();

    files.forEach((file) => {
      const fileName = '/' + String(file?.name || '').replace(/^\/+/, '');
      if (!fileName.startsWith('/widgets/')) return;

      const rest = fileName.slice('/widgets/'.length);
      const parts = rest.split('/').filter(Boolean);
      if (parts.length !== 2 || parts[1] !== 'layers.json') return;
      if (isValidGithubWidgetName(parts[0])) names.add(parts[0]);
    });

    return Array.from(names)
      .map((name) => normalizeGithubWidgetEntry({ name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async function fetchGithubWidgetJsonDirect(widget, fileName) {
    const entry = normalizeGithubWidgetEntry(widget);
    if (entry.sourceId !== DEFAULT_GITHUB_WIDGET_SOURCE_ID) {
      throw new Error('Direct fetch supports default widget source only');
    }

    const url = getGithubRawUrl(entry.name, fileName);
    if (!url) throw new Error('Invalid GitHub widget name');

    const response = await fetch(url, {
      cache: 'no-cache',
      credentials: 'omit',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`GitHub widget file failed: ${response.status}`);
    return response.json();
  }

  async function fetchGithubWidgetList() {
    try {
      const widgets = await requestGithubWidgetsBridge('list');
      return Array.isArray(widgets) ? widgets.map(normalizeGithubWidgetEntry) : [];
    } catch (bridgeError) {
      try {
        return await fetchGithubWidgetListDirect();
      } catch (directError) {
        console.error('Taptop Enhancer GitHub widgets list error:', bridgeError, directError);
        throw directError;
      }
    }
  }

  async function fetchGithubWidgetJson(widget, fileName) {
    const entry = normalizeGithubWidgetEntry(widget);

    try {
      return await requestGithubWidgetsBridge('file', {
        sourceId: entry.sourceId,
        widgetName: entry.name,
        fileName
      });
    } catch (bridgeError) {
      if (entry.sourceId !== DEFAULT_GITHUB_WIDGET_SOURCE_ID) {
        console.error('Taptop Enhancer GitHub widget file error:', bridgeError);
        throw bridgeError;
      }

      try {
        return await fetchGithubWidgetJsonDirect(entry, fileName);
      } catch (directError) {
        console.error('Taptop Enhancer GitHub widget file error:', bridgeError, directError);
        throw directError;
      }
    }
  }

  function isLayerClipboard(data) {
    return !!(data && data.copiedLayout && data.action && data.tagID);
  }

  function getLayerNameFromImportedJson(json, fallbackName = 'layer') {
    if (json?.type === LAYER_EXPORT_TYPE && json.layerName) return String(json.layerName);

    const data = json?.type === LAYER_EXPORT_TYPE ? json.clipboardData : json;
    const root = data?.copiedLayout?.tree?.root;
    const tags = data?.copiedLayout?.tree?.tags || {};
    const tag = tags[data?.tagID] || tags[root];

    return String(tag?.name || tag?.alias || fallbackName || 'layer');
  }

  function normalizeImportedLayerJson(json, fallbackName = 'layer') {
    const data = json?.type === LAYER_EXPORT_TYPE && isLayerClipboard(json.clipboardData)
      ? json.clipboardData
      : isLayerClipboard(json)
        ? json
        : null;

    if (!data) return null;

    const next = deepCloneJson(data);
    const layerName = getLayerNameFromImportedJson(json, fallbackName);
    const rootId = next?.copiedLayout?.tree?.root;
    const rootTag = next?.copiedLayout?.tree?.tags?.[next.tagID] || next?.copiedLayout?.tree?.tags?.[rootId];

    if (rootTag && layerName) rootTag.name = layerName;
    return next;
  }

  function getClipboardRootId(data) {
    return data?.tagID || data?.copiedLayout?.tree?.root || '';
  }

  function setClipboardData(api, data) {
    try {
      api?.clipboardStore?.setClipboard?.(data);
      return;
    } catch {}

    try {
      localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(data));
      api?.clipboardStore?.updateState?.();
    } catch {}
  }

  function warnIfImportedVersionDiffers(api, data) {
    const currentVersion = api?.layout?.tree?.version;
    const importedVersion = data?.copiedLayout?.tree?.version;
    if (currentVersion && importedVersion && currentVersion !== importedVersion) {
      showGithubWidgetToast('JSON от другой версии редактора, вставка может не сработать');
    }
  }

  function emitLayoutChanged(api) {
    try {
      api?.layers?.setMap?.();
      api?.events?.emit?.(api.events.ON_HTML_UPDATE);
      api?.events?.emit?.(api.events.ON_CHANGE_TAG_DISPLAY);
    } catch {}
  }

  function normalizeMarkerForClipboardPaste(api, marker) {
    if (!marker) return null;

    const next = Object.assign({}, marker);
    next.id = getOriginalId(api, marker.id);

    if (marker.afterChild || marker.deepAfterChild) {
      next.afterChild = marker.deepAfterChild || getOriginalId(api, marker.afterChild);
    }

    if (marker.beforeChild || marker.deepBeforeChild) {
      next.beforeChild = marker.deepBeforeChild || getOriginalId(api, marker.beforeChild);
    }

    return next;
  }

  async function pasteClipboardDataAtMarker(api, data, marker, options = {}) {
    if (!api?.clipboard?.pasteFromClipboard || !data || !marker?.id) return null;

    warnIfImportedVersionDiffers(api, data);
    setClipboardData(api, data);
    const pasteMarker = normalizeMarkerForClipboardPaste(api, marker);

    let pasted = null;
    try {
      pasted = api.clipboard.pasteFromClipboard(pasteMarker, getClipboardRootId(data));
    } catch (error) {
      console.error('Taptop Enhancer GitHub widget paste error:', error);
      return null;
    }

    if (!pasted) return null;

    saveHistory(options.historyLabel || 'import github widget');
    emitLayoutChanged(api);

    if (options.select !== false) {
      [0, 120, 300].forEach((delay) => {
        setTimeout(() => selectCreatedEmbed(api, pasted), delay);
      });
    }

    return pasted;
  }

  function isNamedLayer(tag, name) {
    const expected = normalizeText(name).toLowerCase();
    const candidates = [
      readObjectValue(tag, 'bothName'),
      readObjectValue(tag, 'name'),
      readObjectValue(tag, 'alias'),
      readObjectValue(tag, 'className')
    ];
    return candidates.some((value) => normalizeText(value).toLowerCase() === expected);
  }

  function normalizeLookupValue(value) {
    return normalizeText(value).toLowerCase();
  }

  function normalizeDataValue(value) {
    if (value == null) return '';
    if (typeof value === 'object') {
      if (Object.prototype.hasOwnProperty.call(value, 'value')) return normalizeDataValue(value.value);
      if (Object.prototype.hasOwnProperty.call(value, 'text')) return normalizeDataValue(value.text);
    }
    return String(value);
  }

  function dataKeyCandidates(name) {
    const clean = String(name || '').replace(/^custom-/, '').replace(/^data-/, '');
    return Array.from(new Set([
      `custom-data-${clean}`,
      `data-${clean}`,
      clean,
      String(name || '')
    ].filter(Boolean)));
  }

  function readDataEntry(tag, key) {
    if (!tag) return null;
    try {
      const value = tag.getData?.(key);
      if (value != null) return value;
    } catch {}
    try {
      if (tag.data instanceof Map && tag.data.has(key)) return tag.data.get(key);
    } catch {}
    try {
      if (tag.data && typeof tag.data === 'object' && Object.prototype.hasOwnProperty.call(tag.data, key)) {
        return tag.data[key];
      }
    } catch {}
    return null;
  }

  function readAttrEntry(tag, key) {
    if (!tag) return null;
    try {
      const value = tag.getAttr?.(key);
      if (value != null) return value;
    } catch {}
    try {
      if (tag.attr instanceof Map && tag.attr.has(key)) return tag.attr.get(key);
    } catch {}
    try {
      if (tag.attr && typeof tag.attr === 'object' && Object.prototype.hasOwnProperty.call(tag.attr, key)) {
        return tag.attr[key];
      }
    } catch {}
    return null;
  }

  function readElementAttr(tag, key) {
    const element = tag?.dom || tag?.element || tag?.node;
    if (!element || typeof element.getAttribute !== 'function') return null;
    try {
      return element.getAttribute(key);
    } catch {
      return null;
    }
  }

  function readCustomData(tag, name) {
    for (const key of dataKeyCandidates(name)) {
      const dataValue = readDataEntry(tag, key);
      if (dataValue != null) return normalizeDataValue(dataValue);
      const attrValue = readAttrEntry(tag, key);
      if (attrValue != null) return normalizeDataValue(attrValue);
      const elementValue = readElementAttr(tag, key);
      if (elementValue != null) return normalizeDataValue(elementValue);
    }
    return '';
  }

  function getGithubWidgetScriptIdentity(scriptJson, widgetName) {
    const fallbackLayerName = `${widgetName}-script`;
    const layerName = getLayerNameFromImportedJson(scriptJson, fallbackLayerName);
    const baseName = String(layerName || '').replace(/^widget[-_\s]+/i, '') || widgetName;
    const dataNames = new Set([
      widgetName,
      baseName,
      layerName,
      fallbackLayerName
    ].map(normalizeLookupValue).filter(Boolean));
    const layerNames = new Set([
      layerName,
      fallbackLayerName,
      `widget-${widgetName}`,
      `widget-${baseName}`
    ].map(normalizeLookupValue).filter(Boolean));

    return { dataNames, layerNames };
  }

  function findExistingGithubWidgetScript(api, scriptJson, widgetName) {
    const tree = api?.layout?.tree;
    if (!tree) return null;

    const { dataNames, layerNames } = getGithubWidgetScriptIdentity(scriptJson, widgetName);
    let found = null;
    [tree, tree.tags, tree.composed, tree.composed?.tags].forEach((collection) => {
      if (found) return;
      forEachTagInCollection(collection, (tag) => {
        if (found || !isEmbedTag(tag)) return;

        const scriptName = normalizeLookupValue(readCustomData(tag, GITHUB_WIDGET_SCRIPT_DATA_NAME));
        if (scriptName && dataNames.has(scriptName)) {
          found = tag;
          return;
        }

        const tagNames = [
          readObjectValue(tag, 'bothName'),
          readObjectValue(tag, 'name'),
          readObjectValue(tag, 'alias')
        ].map(normalizeLookupValue);
        if (tagNames.some((name) => layerNames.has(name))) found = tag;
      });
    });

    return found ? getOriginalTag(api, found) : null;
  }

  function markGithubWidgetScriptData(data, widgetName) {
    const rootId = getClipboardRootId(data);
    const rootTag = data?.copiedLayout?.tree?.tags?.[data?.tagID] || data?.copiedLayout?.tree?.tags?.[rootId];
    if (!rootTag) return;

    if (!rootTag.data || typeof rootTag.data !== 'object') rootTag.data = {};
    rootTag.data[`custom-data-${GITHUB_WIDGET_SCRIPT_DATA_NAME}`] = {
      type: 'STRING',
      value: String(widgetName || '')
    };
  }

  function forEachTagInCollection(collection, callback) {
    if (!collection) return;

    if (collection instanceof Map) {
      collection.forEach(callback);
      return;
    }

    if (collection.tags instanceof Map) {
      collection.tags.forEach(callback);
      return;
    }

    if (collection.map instanceof Map) {
      collection.map.forEach(callback);
      return;
    }

    if (Array.isArray(collection.list)) {
      collection.list.forEach(callback);
      return;
    }

    if (collection.tags && typeof collection.tags === 'object') {
      Object.values(collection.tags).forEach(callback);
      return;
    }

    if (collection.map && typeof collection.map === 'object') {
      Object.values(collection.map).forEach(callback);
    }
  }

  function findScriptsLayer(api = getTaptopApi()) {
    const tree = api?.layout?.tree;
    if (!tree) return null;

    try {
      const found = tree.findFirstByID?.(tree.root, (tag) => isNamedLayer(tag, SCRIPTS_LAYER_NAME));
      if (found) return getOriginalTag(api, found);
    } catch {}

    let found = null;
    [tree, tree.tags, tree.composed, tree.composed?.tags].forEach((collection) => {
      if (found) return;
      forEachTagInCollection(collection, (tag) => {
        if (!found && isNamedLayer(tag, SCRIPTS_LAYER_NAME)) found = tag;
      });
    });

    return found ? getOriginalTag(api, found) : null;
  }

  function getWidgetLayout(api, widgetCode) {
    try {
      return api?.widgets?.get?.(widgetCode) || null;
    } catch {
      return null;
    }
  }

  function moveRootChildToFront(api, tag) {
    const root = getOriginalTag(api, getRootTag(api));
    const target = getOriginalTag(api, tag);
    if (!root?.id || !target?.id || !Array.isArray(root.children)) return false;
    if (getOriginalId(api, getParentId(target)) !== root.id) return false;

    const targetId = getOriginalId(api, target.id);
    const index = root.children.findIndex((id) => getOriginalId(api, id) === targetId);
    if (index <= 0) return false;

    const children = root.children.slice();
    const [childId] = children.splice(index, 1);
    children.unshift(childId);

    try {
      if (typeof root.setChildren === 'function') root.setChildren(children);
      else root.children = children;
      emitLayoutChanged(api);
      return true;
    } catch {
      return false;
    }
  }

  function ensureScriptsLayer(api = getTaptopApi()) {
    let scriptsLayer = findScriptsLayer(api);
    if (scriptsLayer && canInsertInto(getComposedTag(api, scriptsLayer) || scriptsLayer, api)) {
      if (moveRootChildToFront(api, scriptsLayer)) saveHistory('move scripts layer');
      return scriptsLayer;
    }

    const root = getOriginalTag(api, getRootTag(api));
    const divCode = api?.constants?.gz?.DIV || 'div';
    const divLayout = getWidgetLayout(api, divCode);

    if (!root?.id || !divLayout || !api?.layout?.add) return null;

    let created = null;
    try {
      const firstChildId = Array.isArray(root.children) ? root.children[0] || '' : '';
      const addOptions = {
        layout: divLayout,
        parentId: root.id
      };
      if (firstChildId) addOptions.beforeChildId = firstChildId;

      const result = api.layout.add(addOptions);
      created = getTagById(api, result?.id) || api.layout.tree?.get?.(result?.id);
    } catch (error) {
      console.error('Taptop Enhancer create Scripts layer error:', error);
    }

    if (!created) return null;

    applyLayerName(api, created, SCRIPTS_LAYER_NAME);
    applyDisplayNoneClass(api, created);
    saveHistory('create scripts layer');
    emitLayoutChanged(api);

    scriptsLayer = getOriginalTag(api, created);
    try {
      api?.layers?.open?.(scriptsLayer.id);
      api?.ui?.setCurrentDesignLayerIds?.(Array.from(api?.layers?.expand || []));
    } catch {}

    return scriptsLayer;
  }

  function buildLayerDropMarker(api, dropState, clipboardData) {
    if (!api || !dropState) return null;

    const action = clipboardData?.action || api?.constants?.aI?.COPY_COMPONENT || 'copy';
    const rootId = getClipboardRootId(clipboardData);
    const marker = api?.dropPosition?.getDropPosition?.(action, dropState.dropId, rootId, dropState.overId);
    if (marker) return marker;

    const parentTag = getOriginalTag(api, getTagById(api, dropState.dropId));
    if (!parentTag?.id) return null;

    return {
      id: parentTag.id,
      afterChild: getOriginalId(api, dropState.afterId),
      beforeChild: getOriginalId(api, dropState.beforeId)
    };
  }

  function getFallbackInsertMarker(api) {
    const target = getScriptWidgetTarget(api);
    const originalTarget = getOriginalTag(api, target);
    if (originalTarget) return buildAppendMarkerPosition(api, originalTarget);

    const root = getOriginalTag(api, getRootTag(api));
    return root ? buildAppendMarkerPosition(api, root) : null;
  }

  async function importGithubWidgetScript(api, scriptJson, widgetName) {
    const existing = findExistingGithubWidgetScript(api, scriptJson, widgetName);
    if (existing) return existing;

    const scriptData = normalizeImportedLayerJson(scriptJson, `${widgetName}-script`);
    if (!scriptData) return null;
    markGithubWidgetScriptData(scriptData, widgetName);

    const scriptsLayer = ensureScriptsLayer(api);
    if (!scriptsLayer) {
      showGithubWidgetToast('Не удалось создать слой Scripts');
      return null;
    }

    const marker = buildAppendMarkerPosition(api, scriptsLayer);
    const pasted = await pasteClipboardDataAtMarker(api, scriptData, marker, {
      historyLabel: `import github widget script ${widgetName}`,
      select: false
    });

    if (pasted) {
      const original = getOriginalTag(api, pasted);
      if (original) applyDisplayNoneClass(api, original);
    }

    return pasted;
  }

  async function importGithubWidget(widgetValue, options = {}) {
    const widget = getGithubWidgetFromValue(widgetValue);
    const widgetName = widget.name;

    if (!isValidGithubWidgetName(widgetName)) {
      showGithubWidgetToast('Некорректное имя виджета');
      return null;
    }

    const api = getTaptopApi();
    if (!api?.layout || !api?.clipboard) {
      showGithubWidgetToast('Редактор еще загружается');
      return null;
    }

    showGithubWidgetToast(`Загружаю ${widgetName}...`);

    let layersJson = null;
    let scriptJson = null;

    try {
      [layersJson, scriptJson] = await Promise.all([
        fetchGithubWidgetJson(widget, 'layers.json'),
        fetchGithubWidgetJson(widget, 'script.json').catch(() => null)
      ]);
    } catch (error) {
      console.error('Taptop Enhancer GitHub widget load error:', error);
      showGithubWidgetToast(`Не удалось загрузить ${widgetName}`);
      return null;
    }

    const layersData = normalizeImportedLayerJson(layersJson, widgetName);
    if (!layersData) {
      showGithubWidgetToast('layers.json не похож на слой Taptop');
      return null;
    }

    const marker = options.dropState
      ? buildLayerDropMarker(api, options.dropState, layersData)
      : options.marker || api?.runtime?.markerLastPosition || getFallbackInsertMarker(api);

    if (!marker?.id) {
      showGithubWidgetToast('Не найдено место для вставки');
      return null;
    }

    const pastedWidget = await pasteClipboardDataAtMarker(api, layersData, marker, {
      historyLabel: `import github widget ${widgetName}`
    });

    if (!pastedWidget) {
      showGithubWidgetToast(`Не удалось добавить ${widgetName}`);
      return null;
    }

    if (scriptJson) {
      await importGithubWidgetScript(api, scriptJson, widgetName);
      [120, 360].forEach((delay) => {
        setTimeout(() => selectCreatedEmbed(api, pastedWidget), delay);
      });
    }

    showGithubWidgetToast(`${widgetName} добавлен`);
    return pastedWidget;
  }

  function isGithubWidgetDragEvent(event) {
    if (githubWidgetDragState) return true;
    const types = Array.from(event.dataTransfer?.types || []);
    return types.includes(GITHUB_WIDGET_DRAG_TYPE);
  }

  function getGithubWidgetNameFromEvent(event) {
    if (githubWidgetDragState?.widgetName) return githubWidgetDragState.widgetName;
    try {
      return event.dataTransfer?.getData?.(GITHUB_WIDGET_DRAG_TYPE) || event.dataTransfer?.getData?.('text/plain') || '';
    } catch {
      return '';
    }
  }

  function startGithubWidgetDrag(event, widgetName) {
    const widget = getGithubWidgetFromValue(widgetName);
    const widgetKey = getGithubWidgetKey(widget);
    const api = getTaptopApi();
    githubWidgetDragState = {
      widgetName: widgetKey,
      startedAt: Date.now()
    };
    githubWidgetSuppressClickUntil = Date.now() + 600;
    try { api?.runtime?.setMarkerPosition?.(api.layout, null); } catch {}
    setNativeWidgetDragState(api, getGithubWidgetDragCode(api));

    try {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData(GITHUB_WIDGET_DRAG_TYPE, widgetKey);
      event.dataTransfer.setData('text/plain', widget.name);
    } catch {}
  }

  function finishGithubWidgetDrag() {
    if (githubWidgetDragState) githubWidgetSuppressClickUntil = Date.now() + 600;
    clearScriptWidgetExpandTimer();
    clearScriptDropTarget();
    scheduleNativeLayerDragStateClear();
    setTimeout(() => {
      githubWidgetDragState = null;
      githubWidgetLastDropState = null;
    }, 0);
  }

  async function createGithubWidgetFromPanel(widgetName) {
    const api = getTaptopApi();
    const marker = getFallbackInsertMarker(api);
    await importGithubWidget(widgetName, { marker });
  }

  function buildScriptWidgetCard(referenceCard) {
    const card = referenceCard instanceof HTMLElement
      ? referenceCard.cloneNode(true)
      : document.createElement('div');

    [card, ...Array.from(card.querySelectorAll('*'))].forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      el.removeAttribute('id');
      el.removeAttribute('draggable');
      el.draggable = false;
    });

    card.draggable = true;
    card.setAttribute('draggable', 'true');
    card.setAttribute(SCRIPT_WIDGET_ATTR, '1');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', SCRIPT_WIDGET_TEXT);
    card.setAttribute('title', SCRIPT_WIDGET_TEXT);
    card.style.cursor = 'pointer';
    removeDisabledClasses(card);
    replaceWidgetCardText(card, SCRIPT_WIDGET_TEXT);

    if (!(referenceCard instanceof HTMLElement)) {
      card.textContent = SCRIPT_WIDGET_TEXT;
      card.style.cssText = [
        'display: flex',
        'align-items: center',
        'min-height: 48px',
        'padding: 0 16px',
        'border: 1px solid #e8e8e8',
        'border-radius: 6px',
        'background: #fff',
        'font: inherit',
        'cursor: pointer'
      ].join(';');
    }

    card.addEventListener('dragstart', startScriptWidgetDrag, true);
    card.addEventListener('dragend', finishScriptWidgetDrag, true);
    card.addEventListener('mouseenter', () => setScriptWidgetHover(card, true));
    card.addEventListener('mouseleave', () => setScriptWidgetHover(card, false));
    card.addEventListener('focus', () => setScriptWidgetHover(card, true), true);
    card.addEventListener('blur', () => setScriptWidgetHover(card, false), true);

    card.addEventListener('click', (event) => {
      stopScriptWidgetEvent(event);
      if (scriptWidgetSuppressClickUntil > Date.now()) return;
      createScriptFromWidgetPanel();
    }, true);

    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      stopScriptWidgetEvent(event);
      createScriptFromWidgetPanel();
    }, true);

    return card;
  }

  function buildGithubWidgetCard(referenceCard, widget) {
    const card = referenceCard instanceof HTMLElement
      ? referenceCard.cloneNode(true)
      : document.createElement('div');
    const entry = normalizeGithubWidgetEntry(widget);
    const widgetName = entry.name || '';
    const widgetKey = getGithubWidgetKey(entry);

    [card, ...Array.from(card.querySelectorAll('*'))].forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      el.removeAttribute('id');
      el.removeAttribute('draggable');
      el.removeAttribute(SCRIPT_WIDGET_ATTR);
      el.removeAttribute(GITHUB_WIDGET_ATTR);
      el.removeAttribute(SCRIPT_WIDGET_HOVER_OUTLINE_ATTR);
      el.draggable = false;
    });

    card.draggable = true;
    card.setAttribute('draggable', 'true');
    card.setAttribute(GITHUB_WIDGET_ATTR, '1');
    card.dataset.ttEnhancerGithubWidgetName = widgetName;
    card.dataset.ttEnhancerGithubWidgetKey = widgetKey;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', widgetName);
    card.setAttribute('title', entry.sourceTitle ? `${widgetName} · ${entry.sourceTitle}` : widgetName);
    card.style.cursor = 'pointer';
    removeDisabledClasses(card);
    replaceWidgetCardText(card, widgetName);

    if (!(referenceCard instanceof HTMLElement)) {
      card.textContent = widgetName;
      card.style.cssText = [
        'display: flex',
        'align-items: center',
        'min-height: 48px',
        'padding: 0 16px',
        'border: 1px solid #e8e8e8',
        'border-radius: 6px',
        'background: #fff',
        'font: inherit',
        'cursor: pointer'
      ].join(';');
    }

    card.addEventListener('dragstart', (event) => startGithubWidgetDrag(event, widgetKey), true);
    card.addEventListener('dragend', finishGithubWidgetDrag, true);
    card.addEventListener('mouseenter', () => setScriptWidgetHover(card, true));
    card.addEventListener('mouseleave', () => setScriptWidgetHover(card, false));
    card.addEventListener('focus', () => setScriptWidgetHover(card, true), true);
    card.addEventListener('blur', () => setScriptWidgetHover(card, false), true);

    card.addEventListener('click', (event) => {
      stopScriptWidgetEvent(event);
      if (githubWidgetSuppressClickUntil > Date.now()) return;
      createGithubWidgetFromPanel(widgetKey);
    }, true);

    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      stopScriptWidgetEvent(event);
      createGithubWidgetFromPanel(widgetKey);
    }, true);

    return card;
  }

  function ensureScriptWidgetCard() {
    const svgIconCard = findWidgetCardByText(SVG_ICON_WIDGET_TEXT);
    if (!svgIconCard?.parentElement) return;

    const list = svgIconCard.parentElement;
    const existingInList = list.querySelector(`[${SCRIPT_WIDGET_ATTR}]`);
    document.querySelectorAll(`[${SCRIPT_WIDGET_ATTR}]`).forEach((item) => {
      if (item !== existingInList) item.remove();
    });

    if (existingInList) {
      if (existingInList.previousElementSibling !== svgIconCard) {
        svgIconCard.insertAdjacentElement('afterend', existingInList);
      }
      return;
    }

    const embedCard = findWidgetCardByText(EMBED_WIDGET_TEXT);
    const scriptCard = buildScriptWidgetCard(embedCard || svgIconCard);
    svgIconCard.insertAdjacentElement('afterend', scriptCard);
  }

  async function loadGithubWidgets() {
    if (githubWidgetsLoaded || githubWidgetsLoading || githubWidgetsLoadFailed || githubWidgetsRetryTimer) return;

    githubWidgetsLoading = true;
    try {
      const widgets = await fetchGithubWidgetList();
      githubWidgets = Array.isArray(widgets)
        ? widgets.map(normalizeGithubWidgetEntry).filter((widget) => isValidGithubWidgetName(widget?.name))
        : [];
      githubWidgetsLoaded = true;
      githubWidgetsLoadFailed = false;
      githubWidgetsLoadRetries = 0;
      clearTimeout(githubWidgetsRetryTimer);
      githubWidgetsRetryTimer = 0;
      ensureGithubWidgetCards();
    } catch (error) {
      console.error('Taptop Enhancer GitHub widgets load error:', error);
      if (githubWidgetsLoadRetries < 3) {
        githubWidgetsLoadRetries += 1;
        clearTimeout(githubWidgetsRetryTimer);
        githubWidgetsRetryTimer = setTimeout(() => {
          githubWidgetsRetryTimer = 0;
          loadGithubWidgets();
        }, 1000 * githubWidgetsLoadRetries);
      } else {
        githubWidgets = [];
        githubWidgetsLoaded = true;
        githubWidgetsLoadFailed = true;
        githubWidgetsLoadRetries = 0;
        showGithubWidgetToast('Не удалось загрузить дополнительные виджеты');
        ensureGithubWidgetCards();
      }
    } finally {
      githubWidgetsLoading = false;
    }
  }

  function ensureGithubWidgetCards() {
    const svgIconCard = findWidgetCardByText(SVG_ICON_WIDGET_TEXT);
    const scriptCard = document.querySelector(`[${SCRIPT_WIDGET_ATTR}]`);
    const anchor = scriptCard || svgIconCard;

    if (!anchor?.parentElement) return;

    if (!githubWidgetsLoaded) {
      loadGithubWidgets();
      return;
    }

    const list = anchor.parentElement;
    const desiredKeys = new Set(githubWidgets.map(getGithubWidgetKey));
    const existingCards = new Map();

    document.querySelectorAll(`[${GITHUB_WIDGET_ATTR}]`).forEach((card) => {
      const key = card.dataset.ttEnhancerGithubWidgetKey || card.dataset.ttEnhancerGithubWidgetName || '';
      if (card.parentElement !== list || !desiredKeys.has(key) || existingCards.has(key)) {
        card.remove();
        return;
      }
      existingCards.set(key, card);
    });

    const referenceCard = findWidgetCardByText(EMBED_WIDGET_TEXT) || svgIconCard || scriptCard;
    let cursor = anchor;

    githubWidgets.forEach((widget) => {
      const widgetKey = getGithubWidgetKey(widget);
      let card = existingCards.get(widgetKey);
      if (!card) card = buildGithubWidgetCard(referenceCard, widget);

      if (card.previousElementSibling !== cursor) {
        cursor.insertAdjacentElement('afterend', card);
      }

      cursor = card;
    });
  }

  function scheduleScriptWidgetCard() {
    [0, 80, 180, 360, 700, 1200, 1800].forEach((delay) => {
      setTimeout(ensureScriptWidgetCard, delay);
    });
  }

  function scheduleGithubWidgetCards() {
    [0, 120, 300, 700, 1200, 2000, 3200].forEach((delay) => {
      setTimeout(ensureGithubWidgetCards, delay);
    });
  }

  function buildAppendMarkerPosition(api, targetTag) {
    const constants = api?.constants || {};
    const children = Array.isArray(targetTag?.children) ? targetTag.children : [];
    const afterChild = children[children.length - 1] || '';
    const marker = {
      id: targetTag.id,
      composedId: targetTag.id,
      targetType: targetTag.type || targetTag.widgetName || targetTag.tagName || '',
      direction: constants.Lh?.TOP || 'top',
      childType: '',
      rangeLeft: 0,
      rangeTop: 0,
      rangeRight: 0,
      rangeBottom: 0,
      markerPositions: {},
      fillType: 'half'
    };

    if (afterChild) {
      marker.afterChild = afterChild;
      marker.deepAfterChild = getOriginalId(api, afterChild);
    }

    return marker;
  }

  function directAddEmbed(api, marker) {
    const widgetCode = getWidgetCode(api);
    const widgetLayout = api?.widgets?.get?.(widgetCode) || api?.widgets?.get?.('tt_embed');
    if (!widgetLayout || !api?.layout?.add) return null;

    try {
      const result = api.layout.add({
        layout: widgetLayout,
        parentId: getOriginalId(api, marker.id),
        afterChildId: marker.deepAfterChild || getOriginalId(api, marker.afterChild),
        beforeChildId: marker.deepBeforeChild || getOriginalId(api, marker.beforeChild)
      });
      return getTagById(api, result?.id);
    } catch {
      return null;
    }
  }

  function createEmbedInLayer(api, targetTag) {
    const marker = buildAppendMarkerPosition(api, targetTag);
    const widgetCode = getWidgetCode(api);
    const action = getDropWidgetAction(api);

    try {
      api?.runtime?.setMarkerPosition?.(api.layout, marker);
      return api?.components?.componentAction?.(api.layout, action, { widgetCode }) || directAddEmbed(api, marker);
    } catch {
      return directAddEmbed(api, marker);
    }
  }

  function createEmbedAtLayerDrop(api, dropState) {
    const widgetCode = getWidgetCode(api);
    const action = getDropWidgetAction(api);
    const marker = api?.dropPosition?.getDropPosition?.(action, dropState?.dropId, widgetCode, dropState?.overId);

    if (marker) {
      try {
        api?.runtime?.setMarkerPosition?.(api.layout, marker);
        return api?.components?.componentAction?.(api.layout, action, { widgetCode });
      } catch {}
    }

    const target = getTagById(api, dropState?.dropId);
    return target ? createEmbedInLayer(api, target) : null;
  }

  function setEmbedTemplate(api, tag) {
    const target = getOriginalTag(api, tag);
    if (!target) return null;

    try {
      target.setEmbedCode?.(SCRIPT_TEMPLATE);
      if (typeof target.setEmbedCode !== 'function') target.embedCode = SCRIPT_TEMPLATE;
    } catch {}

    return target;
  }

  function selectCreatedEmbed(api, createdTag) {
    const composed = getComposedTag(api, createdTag) || createdTag;
    const id = composed?.id || createdTag?.id;
    if (!id) return null;

    try {
      api?.runtime?.setSelected?.(id);
      api?.events?.emit?.(api.events.ON_SELECT_LAYER, composed, api.layout?.tree);
    } catch {}

    return composed;
  }

  async function finalizeCreatedScriptEmbed(api, created, options = {}) {
    if (!created) return null;
    const shouldOpenEditor = options.openEditor !== false;

    const createdTag = setEmbedTemplate(api, created) || created;
    applyScriptLayerName(api, createdTag);
    applyDisplayNoneClass(api, createdTag);
    saveHistory('create script embed');
    try {
      api?.events?.emit?.(api.events.ON_HTML_UPDATE);
      api?.events?.emit?.(api.events.ON_CHANGE_TAG_DISPLAY);
    } catch {}

    [0, 80, 180].forEach((delay) => {
      setTimeout(() => selectCreatedEmbed(api, createdTag), delay);
    });

    if (shouldOpenEditor) {
      setTimeout(async () => {
        const selected = selectCreatedEmbed(api, createdTag);
        if (selected) rememberEmbedEditorContextFromTag(selected);
        await openCodeEditor();
        await ensureCodeEditorTemplate();
      }, 240);
    } else {
      setTimeout(async () => {
        const selected = selectCreatedEmbed(api, createdTag);
        if (selected) rememberEmbedEditorContextFromTag(selected);
        await ensureCodeEditorTemplate();
      }, 300);
    }

    return createdTag;
  }

  async function createScriptInTarget(api, targetTag) {
    if (!api || !canInsertInto(targetTag, api)) return null;
    const created = createEmbedInLayer(api, targetTag);
    return finalizeCreatedScriptEmbed(api, created);
  }

  async function createScriptAtLayerDrop(api, dropState) {
    if (!api || !dropState) return null;
    const created = createEmbedAtLayerDrop(api, dropState);
    return finalizeCreatedScriptEmbed(api, created);
  }

  async function createScriptFromWidgetPanel() {
    const api = getTaptopApi();
    const targetTag = getScriptWidgetTarget(api);
    await createScriptInTarget(api, targetTag);
  }

  function ensureInlineEditButton() {
    if (!lastLayerContext || !document.contains(lastLayerContext)) return;

    if (!isEmbedLayerItem(lastLayerContext)) {
      removeInlineButtons();
      return;
    }

    removeOtherInlineButtons();
    let button = document.querySelector(`[${INLINE_BUTTON_ATTR}][data-tt-layer-button-owner="active"]`);
    if (!button) {
      button = buildInlineButton();
      button.dataset.ttLayerButtonOwner = 'active';
      document.body.appendChild(button);
    }
    positionInlineButton(button);
  }

  function scheduleInlineEditButton() {
    [0, 80, 180, 360, 700, 1200, 1800].forEach((delay) => {
      setTimeout(ensureInlineEditButton, delay);
    });
  }

  function onLayerClick(event) {
    const list = event.target?.closest?.(LAYERS_LIST_SELECTOR);
    const item = event.target?.closest?.(LAYER_ITEM_SELECTOR);
    if (!list || !item || !list.contains(item)) return;
    if (event.target?.closest?.(`[${INLINE_BUTTON_ATTR}]`)) return;

    lastLayerContext = item;
    scheduleInlineEditButton();
  }

  function onDocumentMouseDown(event) {
    clearStaleScriptWidgetDragState();
    if (window.__ttEnhancerLayerVisibilityTogglesInteracting) return;
    if (event.target?.closest?.(`[${INLINE_BUTTON_ATTR}]`)) return;
    if (event.target?.closest?.(`[${SCRIPT_WIDGET_ATTR}]`)) return;
    if (event.target?.closest?.(`[${GITHUB_WIDGET_ATTR}]`)) return;
    if (event.target?.closest?.(`[${VISIBILITY_TOGGLES_ATTR}]`)) return;
    if (event.target?.closest?.(LAYERS_LIST_SELECTOR)) return;

    lastLayerContext = null;
    removeInlineButtons();
  }

  function getLayerItemFromEvent(event) {
    const item = event.target?.closest?.(LAYER_ITEM_SELECTOR);
    const list = item?.closest?.(LAYERS_LIST_SELECTOR);
    if (!list || !item || !list.contains(item)) return null;
    return item;
  }

  function onDocumentDragOver(event) {
    if (isGithubWidgetDragEvent(event)) {
      const api = getTaptopApi();
      const dropState = getLayerDropStateFromEvent(event, api);

      setNativeWidgetDragState(api, getGithubWidgetDragCode(api));

      if (!dropState) {
        githubWidgetLastDropState = null;
        clearScriptWidgetExpandTimer();
        clearScriptDropTarget();
        return;
      }

      event.preventDefault();
      try { event.dataTransfer.dropEffect = 'copy'; } catch {}
      githubWidgetLastDropState = dropState;
      setNativeLayerDropState(api, dropState);
      scheduleScriptWidgetLayerExpand(api, dropState);
      markScriptDropTarget(dropState.item);
      return;
    }

    if (!isScriptWidgetDragEvent(event)) return;

    const api = getTaptopApi();
    const dropState = getLayerDropStateFromEvent(event, api);
    if (!dropState) {
      scriptWidgetLastDropState = null;
      clearScriptWidgetExpandTimer();
      clearScriptDropTarget();
      return;
    }

    event.preventDefault();
    try { event.dataTransfer.dropEffect = 'copy'; } catch {}
    scriptWidgetLastDropState = dropState;
    setNativeWidgetDragState(api);
    setNativeLayerDropState(api, dropState);
    scheduleScriptWidgetLayerExpand(api, dropState);
    markScriptDropTarget(dropState.item);
  }

  async function onDocumentDrop(event) {
    if (isGithubWidgetDragEvent(event)) {
      if (githubWidgetDropInProgress) return;

      const widgetName = getGithubWidgetNameFromEvent(event);
      const api = getTaptopApi();
      const dropState = getLayerDropStateFromEvent(event, api);
      const marker = dropState ? null : api?.runtime?.markerLastPosition;

      event.preventDefault();

      githubWidgetDropInProgress = true;
      githubWidgetLastDropState = null;
      clearNativeLayerDragState(api);
      finishGithubWidgetDrag();

      try {
        await importGithubWidget(widgetName, {
          dropState,
          marker
        });
      } finally {
        setTimeout(() => {
          githubWidgetDropInProgress = false;
        }, 300);
      }
      return;
    }

    if (!isScriptWidgetDragEvent(event)) return;
    if (scriptWidgetDropInProgress) return;

    const api = getTaptopApi();
    const dropState = getLayerDropStateFromEvent(event, api);
    if (!dropState) {
      finishScriptWidgetDrag();
      return;
    }

    event.preventDefault();

    scriptWidgetDropInProgress = true;
    setNativeLayerDropState(api, dropState);
    try {
      await createScriptAtLayerDrop(api, dropState);
    } finally {
      scriptWidgetLastDropState = null;
      finishScriptWidgetDrag();
      setTimeout(() => {
        scriptWidgetDropInProgress = false;
      }, 300);
    }
  }

  async function onDocumentDragEnd(event) {
    if (isGithubWidgetDragEvent(event)) {
      if (githubWidgetDropInProgress) return;

      const widgetName = githubWidgetDragState?.widgetName || getGithubWidgetNameFromEvent(event);
      const api = getTaptopApi();
      const dropState = githubWidgetLastDropState;

      if (!dropState) {
        finishGithubWidgetDrag();
        return;
      }

      githubWidgetDropInProgress = true;
      githubWidgetLastDropState = null;
      clearNativeLayerDragState(api);
      finishGithubWidgetDrag();
      try {
        await importGithubWidget(widgetName, { dropState });
      } finally {
        setTimeout(() => {
          githubWidgetDropInProgress = false;
        }, 300);
      }
      return;
    }

    if (!isScriptWidgetDragEvent(event)) return;
    if (scriptWidgetDropInProgress) return;

    const api = getTaptopApi();
    const dropState = scriptWidgetLastDropState;
    if (!dropState) {
      finishScriptWidgetDrag();
      return;
    }

    scriptWidgetDropInProgress = true;
    try {
      await createScriptAtLayerDrop(api, dropState);
    } finally {
      scriptWidgetLastDropState = null;
      finishScriptWidgetDrag();
      setTimeout(() => {
        scriptWidgetDropInProgress = false;
      }, 300);
    }
  }

  function scheduleFromMutation() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (isInlineEditEnabled) ensureInlineEditButton();
      if (isScriptWidgetEnabled) ensureScriptWidgetCard();
      if (isGithubWidgetsEnabled) ensureGithubWidgetCards();
    });
  }

  function onViewportChange() {
    const button = document.querySelector(`[${INLINE_BUTTON_ATTR}][data-tt-layer-button-owner="active"]`);
    if (button) positionInlineButton(button);
  }

  const observer = new MutationObserver((mutations) => {
    const onlyOwnElements = mutations.every((mutation) => {
      const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
      return nodes.length && nodes.every((node) => (
        node instanceof HTMLElement &&
        (
          node.hasAttribute(INLINE_BUTTON_ATTR) ||
          node.hasAttribute(SCRIPT_WIDGET_ATTR) ||
          node.hasAttribute(GITHUB_WIDGET_ATTR) ||
          node.hasAttribute(SCRIPT_WIDGET_HOVER_OUTLINE_ATTR)
        )
      ));
    });
    if (!onlyOwnElements) scheduleFromMutation();
  });

  if (isInlineEditEnabled) {
    document.addEventListener('click', onLayerClick, true);
    document.addEventListener('mouseup', onLayerClick, true);
    document.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange, true);
  }

  if (isInlineEditEnabled || isScriptWidgetEnabled || isGithubWidgetsEnabled) {
    document.addEventListener('mousedown', onDocumentMouseDown, true);
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  }

  if (isScriptWidgetEnabled || isGithubWidgetsEnabled) {
    document.addEventListener('dragover', onDocumentDragOver, true);
    document.addEventListener('drop', onDocumentDrop, true);
    document.addEventListener('dragend', onDocumentDragEnd, true);
  }

  if (isScriptWidgetEnabled) {
    scheduleScriptWidgetCard();
  }

  if (isGithubWidgetsEnabled) {
    scheduleGithubWidgetCards();
  }

  window.__ttEnhancerEmbedContextMenu = {
    features: {
      inlineEdit: isInlineEditEnabled,
      scriptWidget: isScriptWidgetEnabled,
      githubWidgets: isGithubWidgetsEnabled
    },
    observer,
    onLayerClick,
    onDocumentMouseDown,
    onDocumentDragOver,
    onDocumentDrop,
    onDocumentDragEnd,
    onViewportChange,
    clearScriptWidgetExpandTimer,
    clearGithubWidgetTimers
  };
})();
