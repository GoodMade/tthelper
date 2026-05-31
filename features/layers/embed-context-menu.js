(function () {
  const LAYERS_LIST_SELECTOR = '.tt-layers__list';
  const LAYER_ITEM_SELECTOR = '.tt-layers__item';
  const INLINE_BUTTON_ATTR = 'data-tt-enhancer-embed-inline-edit';
  const LEGACY_CREATE_SCRIPT_MENU_ATTR = 'data-tt-enhancer-create-script-menu-item';
  const SCRIPT_WIDGET_ATTR = 'data-tt-enhancer-script-widget';
  const SCRIPT_DROP_TARGET_ATTR = 'data-tt-enhancer-script-drop-target';
  const SCRIPT_WIDGET_HOVER_OUTLINE_ATTR = 'data-tt-enhancer-script-widget-hover-outline';
  const VISIBILITY_TOGGLES_ATTR = 'data-tt-enhancer-layer-visibility-toggles';
  const OPEN_EDITOR_TEXT = 'Открыть редактор кода';
  const EDIT_TEXT = 'Редактировать';
  const SCRIPT_WIDGET_TEXT = 'Script';
  const EMBED_WIDGET_TEXT = 'Embed';
  const SVG_ICON_WIDGET_TEXT = 'SVG Icon';
  const SCRIPT_LAYER_NAME = 'script';
  const SCRIPT_TEMPLATE = '<style>\n \n</style>\n\n<script>\n \n</script>';
  const HELPER_CLASS_NAME = 'helper--d-none';
  const SCRIPT_WIDGET_HOVER_BORDER = '#8fc9ff';
  const WIDGET_PANEL_ANCHORS = ['Link Block', EMBED_WIDGET_TEXT, 'Collection', SVG_ICON_WIDGET_TEXT];
  const FEATURE_FLAGS_KEY = '__ttEnhancerEmbedContextMenuFeatures';
  const featureFlags = window[FEATURE_FLAGS_KEY] || { inlineEdit: true, scriptWidget: true };
  const isInlineEditEnabled = featureFlags.inlineEdit !== false;
  const isScriptWidgetEnabled = featureFlags.scriptWidget !== false;

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
    document.querySelectorAll(`[${INLINE_BUTTON_ATTR}]`).forEach((el) => el.remove());
    document.querySelectorAll(`[${LEGACY_CREATE_SCRIPT_MENU_ATTR}]`).forEach((el) => el.remove());
    document.querySelectorAll(`[${SCRIPT_WIDGET_ATTR}]`).forEach((el) => el.remove());
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
  let raf = 0;
  let runtimeRequire = null;

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
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

  function isEmbedTag(tag) {
    return [
      readObjectValue(tag, 'type'),
      readObjectValue(tag, 'widgetName'),
      readObjectValue(tag, 'widgetType')
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

  function setNativeWidgetDragState(api = getTaptopApi()) {
    const widgetCode = getWidgetCode(api);
    const action = getDropWidgetAction(api);
    try {
      api?.runtime?.setDragged?.(widgetCode);
      api?.layers?.setProp?.('drag', widgetCode);
      api?.layers?.setProp?.('action', action);
    } catch {}
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

  function applyScriptLayerName(api, tag) {
    const target = getOriginalTag(api, tag);
    if (!target) return;

    try {
      if (typeof target.setName === 'function') target.setName(SCRIPT_LAYER_NAME);
      else target.name = SCRIPT_LAYER_NAME;
    } catch {}
  }

  function findOpenCodeEditorButton() {
    const clickable = Array.from(document.querySelectorAll('button, [role="button"], .tt-button'));
    const directButton = clickable
      .filter(isVisible)
      .filter((el) => normalizeText(el.textContent).includes(OPEN_EDITOR_TEXT))
      .sort((a, b) => normalizeText(a.textContent).length - normalizeText(b.textContent).length)
      .find(Boolean);

    if (directButton) return directButton;

    const candidates = Array.from(document.querySelectorAll('*'));
    const textNode = candidates
      .filter(isVisible)
      .filter((el) => {
        const text = normalizeText(el.textContent);
        return text.includes(OPEN_EDITOR_TEXT) && text.length <= OPEN_EDITOR_TEXT.length + 20;
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

  function isEmbedLayerItem(item) {
    if (!item) return false;

    const selectedTag = getSelectedTag();
    if (selectedTag) return isEmbedTag(selectedTag);

    return hasCodeIcon(item);
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
      const settingsTab = findTextButton('Настройки');
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

    while (node) {
      if (normalizeText(node.nodeValue) === EMBED_WIDGET_TEXT || normalizeText(node.nodeValue) === SVG_ICON_WIDGET_TEXT) {
        node.nodeValue = text;
        replaced = true;
      }
      node = walker.nextNode();
    }

    if (!replaced) {
      const label = Array.from(card.querySelectorAll('span, div'))
        .filter(isVisible)
        .sort((a, b) => normalizeText(a.textContent).length - normalizeText(b.textContent).length)
        .find((el) => [EMBED_WIDGET_TEXT, SVG_ICON_WIDGET_TEXT].includes(normalizeText(el.textContent)));
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

  function scheduleScriptWidgetCard() {
    [0, 80, 180, 360, 700, 1200, 1800].forEach((delay) => {
      setTimeout(ensureScriptWidgetCard, delay);
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

  if (isInlineEditEnabled || isScriptWidgetEnabled) {
    document.addEventListener('mousedown', onDocumentMouseDown, true);
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  }

  if (isScriptWidgetEnabled) {
    document.addEventListener('dragover', onDocumentDragOver, true);
    document.addEventListener('drop', onDocumentDrop, true);
    document.addEventListener('dragend', onDocumentDragEnd, true);
    scheduleScriptWidgetCard();
  }

  window.__ttEnhancerEmbedContextMenu = {
    features: {
      inlineEdit: isInlineEditEnabled,
      scriptWidget: isScriptWidgetEnabled
    },
    observer,
    onLayerClick,
    onDocumentMouseDown,
    onDocumentDragOver,
    onDocumentDrop,
    onDocumentDragEnd,
    onViewportChange,
    clearScriptWidgetExpandTimer
  };
})();
