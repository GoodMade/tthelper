(function () {
  const STATE_KEY = '__ttEnhancerKineskopePopup';
  const ROOT_ATTR = 'data-tt-enhancer-kineskope-popup';
  const TRIGGER_ATTR = 'data-tt-enhancer-kineskope-trigger';
  const LAYERS_LIST_SELECTOR = '.tt-layers__list';
  const LAYERS_PANEL_SELECTOR = '.tt-layers';
  const LAYER_CONTROLS_SELECTOR = '[data-tt-enhancer-layer-visibility-toggles]';
  const IMAGE_REPLACE_TEXT = 'Заменить изображение';
  const IMAGE_REPLACE_TEXTS = [IMAGE_REPLACE_TEXT, 'Replace image'];
  const OPEN_POPUP_TEXT = 'Настройки Kineskope';
  const SETTINGS_TEXTS = ['Настройки', 'Settings'];
  const POPUP_GAP = 6;
  const POPUP_MARGIN = 12;
  const TRIGGER_GAP = 6;
  const TRIGGER_SIZE = 24;
  const SRC_DATA_NAME = 'src';
  const KINESKOPE_DATA_NAME = 'kineskope';
  const WIDGET_DATA_NAME = 'widget';

  try {
    window[STATE_KEY]?.restore?.();
  } catch {}

  const state = {
    runtimeRequire: null,
    popup: null,
    triggerButton: null,
    layerTriggerButton: null,
    observer: null,
    activeContext: null,
    isPopupOpen: false,
    popupAnchorButton: null,
    popupAnchorMode: 'button',
    pinnedWidgetOriginalId: '',
    selectedEvents: null,
    syncTimer: 0,
    positionTimer: 0,
    commitTimer: 0,
    retryTimer: 0,
    pollTimer: 0,
    lastOwnPointer: null,
    lastSelectedId: '',
    iframe: null,
    iframeScrollTarget: null,
    iframeDocument: null,
    onSelectedChange: null,
    onDocumentClick: null,
    onKeyDown: null,
    onViewportChange: null,
    onIframeScroll: null,
    onIframeClick: null,
    restore() {
      clearTimeout(state.syncTimer);
      clearTimeout(state.commitTimer);
      clearTimeout(state.retryTimer);
      clearInterval(state.pollTimer);
      state.observer?.disconnect?.();
      if (state.positionTimer) cancelAnimationFrame(state.positionTimer);
      state.popup?.remove?.();
      state.triggerButton?.remove?.();
      state.layerTriggerButton?.remove?.();
      removeSelectedListeners();
      document.removeEventListener('click', state.onDocumentClick, true);
      document.removeEventListener('mouseup', state.onDocumentClick, true);
      document.removeEventListener('keydown', state.onKeyDown, true);
      document.removeEventListener('scroll', state.onViewportChange, true);
      window.removeEventListener('resize', state.onViewportChange, true);
      removeIframeScrollListener();
      if (window[STATE_KEY] === state) delete window[STATE_KEY];
    },
    debug() {
      const api = getTaptopApi();
      const selectedTag = getSelectedTag(api);
      const context = getKineskopeContext(api);
      const anchorRect = context ? getContextAnchorRect(context) : null;
      return {
        loaded: true,
        apiReady: Boolean(api?.runtime && api?.layout?.tree && api?.events),
        selectedId: api?.runtime?.selected || '',
        selectedTag: selectedTag ? {
          id: readObjectValue(selectedTag, 'id'),
          name: readObjectValue(selectedTag, 'name'),
          widget: readCustomData(selectedTag, WIDGET_DATA_NAME),
          kineskope: readCustomData(selectedTag, KINESKOPE_DATA_NAME)
        } : null,
        hasContext: Boolean(context),
        widgetId: context?.widgetOriginalId || '',
        hasCover: Boolean(context?.coverTag),
        hasEmbed: Boolean(context?.embedTag),
        src: context?.src || '',
        pinnedWidgetOriginalId: state.pinnedWidgetOriginalId,
        anchorRect: anchorRect ? {
          left: Math.round(anchorRect.left),
          top: Math.round(anchorRect.top),
          width: Math.round(anchorRect.width),
          height: Math.round(anchorRect.height)
        } : null,
        hasHeaderTrigger: Boolean(state.triggerButton && document.contains(state.triggerButton)),
        hasLayerTrigger: Boolean(state.layerTriggerButton && document.contains(state.layerTriggerButton)),
        popupAnchorMode: state.popupAnchorMode,
        isPopupOpen: state.isPopupOpen,
        popupHidden: state.popup ? state.popup.hidden : null
      };
    },
    forceSync() {
      syncPopup();
      return state.debug();
    },
    forceOpen() {
      showPopup(getFreshActiveContext(), getPreferredTriggerButton());
      return state.debug();
    }
  };

  window[STATE_KEY] = state;

  removeOrphanTriggerButtons();

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeSearchText(value) {
    return normalizeText(value).toLocaleLowerCase();
  }

  function matchesLocalizedText(value, texts, exact = false) {
    const haystack = normalizeSearchText(value);
    return (Array.isArray(texts) ? texts : [texts]).some((text) => {
      const needle = normalizeSearchText(text);
      return exact ? haystack === needle : haystack.includes(needle);
    });
  }

  function normalizeDataValue(value) {
    if (value == null) return '';
    if (typeof value === 'object') {
      if ('value' in value) return normalizeDataValue(value.value);
      if ('src' in value) return normalizeDataValue(value.src);
    }
    return String(value);
  }

  function normalizeDataToken(value) {
    return normalizeDataValue(value).trim().replace(/^['"]|['"]$/g, '').toLowerCase();
  }

  function isElementNode(value) {
    return Boolean(value && value.nodeType === 1 && typeof value.getBoundingClientRect === 'function');
  }

  function isIframeElement(value) {
    return isElementNode(value) && String(value.tagName || '').toUpperCase() === 'IFRAME';
  }

  function isHtmlElement(value) {
    return isElementNode(value) && typeof value.matches === 'function' && typeof value.closest === 'function';
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

  function readObjectValue(item, key) {
    if (!item) return '';
    try {
      if (typeof item.get === 'function') return item.get(key) || '';
    } catch {}
    return item[key] || '';
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
    return null;
  }

  function readElementData(element, name) {
    if (!isElementNode(element) || typeof element.getAttribute !== 'function') return '';
    for (const key of dataKeyCandidates(name)) {
      const value = element.getAttribute(key);
      if (value != null) return normalizeDataValue(value);
    }
    return '';
  }

  function readCustomData(tag, name) {
    for (const key of dataKeyCandidates(name)) {
      const dataValue = readDataEntry(tag, key);
      if (dataValue != null) return normalizeDataValue(dataValue);
      const attrValue = readAttrEntry(tag, key);
      if (attrValue != null) return normalizeDataValue(attrValue);
    }
    return '';
  }

  function getTagLabel(tag) {
    return normalizeText(
      readObjectValue(tag, 'name') ||
        readObjectValue(tag, 'alias') ||
        readObjectValue(tag, 'widgetName') ||
        readObjectValue(tag, 'type')
    );
  }

  function findExistingDataKey(tag, name) {
    return dataKeyCandidates(name).find((key) => readDataEntry(tag, key) != null) || '';
  }

  function getRuntimeRequire() {
    if (state.runtimeRequire) return state.runtimeRequire;

    const chunk = window.rspackChunktaptop_design_editor;
    if (!chunk || typeof chunk.push !== 'function') return null;

    try {
      const chunkId = `tt-enhancer-kineskope-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      chunk.push([[chunkId], {}, (req) => {
        state.runtimeRequire = req;
      }]);
    } catch {}

    return state.runtimeRequire;
  }

  function getTaptopApi() {
    const req = getRuntimeRequire();
    if (!req) return null;

    try {
      return {
        layout: req(36945)?.A,
        runtime: req(87621)?.A,
        events: req(91893)?.A
      };
    } catch {
      return null;
    }
  }

  function getOriginalId(api, id) {
    if (!id) return '';
    try {
      return api?.events?.getOriginalID?.(id) || id;
    } catch {
      return id;
    }
  }

  function getComposedTree(api) {
    try {
      return api?.layout?.tree?.composed || null;
    } catch {
      return null;
    }
  }

  function getTagById(api, id, preferComposed = true) {
    if (!api?.layout?.tree || !id) return null;
    const tree = api.layout.tree;
    const originalId = getOriginalId(api, id);

    try {
      const composed = getComposedTree(api);
      if (preferComposed) {
        if (composed?.has?.(id)) return composed.get(id);
        if (composed?.has?.(originalId)) return composed.get(originalId);
        const composedByOrigin = tree.getComposedTagByOriginID?.(originalId);
        if (composedByOrigin) return composedByOrigin;
      }
      if (tree.has?.(originalId)) return tree.get(originalId);
      if (tree.has?.(id)) return tree.get(id);
      return composed?.get?.(id) || composed?.get?.(originalId) || tree.get?.(originalId) || tree.get?.(id) || null;
    } catch {
      return null;
    }
  }

  function getSelectedTag(api = getTaptopApi()) {
    const selected = api?.runtime?.selected;
    return selected ? getTagById(api, selected, true) : null;
  }

  function getParentTag(api, tag) {
    const parentId = readObjectValue(tag, 'parent');
    return parentId ? getTagById(api, parentId, true) : null;
  }

  function isKineskopeWidget(tag) {
    return normalizeDataToken(readCustomData(tag, WIDGET_DATA_NAME)) === 'kineskope';
  }

  function hasKineskopeRole(tag, role) {
    return normalizeDataToken(readCustomData(tag, KINESKOPE_DATA_NAME)) === role;
  }

  function findKineskopeWidgetRoot(api, tag) {
    let current = tag;
    const visited = new Set();

    while (current) {
      const id = readObjectValue(current, 'id');
      if (id) {
        if (visited.has(id)) break;
        visited.add(id);
      }

      if (isKineskopeWidget(current)) return current;
      current = getParentTag(api, current);
    }

    return null;
  }

  function walkTagTree(api, rootTag, visit) {
    const visited = new Set();

    function walk(tag) {
      if (!tag) return false;
      const id = readObjectValue(tag, 'id');
      if (id) {
        if (visited.has(id)) return false;
        visited.add(id);
      }

      if (visit(tag)) return true;

      const children = readObjectValue(tag, 'children');
      if (!Array.isArray(children)) return false;
      return children.some((childId) => walk(getTagById(api, childId, true)));
    }

    return walk(rootTag);
  }

  function findKineskopeRoleTag(api, widgetTag, role) {
    let found = null;
    walkTagTree(api, widgetTag, (tag) => {
      if (hasKineskopeRole(tag, role)) {
        found = tag;
        return true;
      }
      return false;
    });
    return found;
  }

  function buildKineskopeContext(api, widgetTag, selectedTag = getSelectedTag(api)) {
    if (!api || !widgetTag || !isKineskopeWidget(widgetTag)) return null;
    const embedTag = findKineskopeRoleTag(api, widgetTag, 'embed');
    const coverTag = findKineskopeRoleTag(api, widgetTag, 'cover');

    return {
      api,
      selectedTag,
      widgetTag,
      widgetOriginalId: getOriginalId(api, readObjectValue(widgetTag, 'id')),
      embedTag,
      coverTag,
      src: embedTag ? readCustomData(embedTag, SRC_DATA_NAME) : ''
    };
  }

  function getKineskopeContext(api = getTaptopApi()) {
    const selectedTag = getSelectedTag(api);
    return isKineskopeWidget(selectedTag)
      ? buildKineskopeContext(api, selectedTag, selectedTag)
      : null;
  }

  function getContextByWidgetOriginalId(widgetOriginalId) {
    const api = getTaptopApi();
    if (!api || !widgetOriginalId) return null;
    const widgetTag = getTagById(api, widgetOriginalId, true);
    if (!widgetTag || !isKineskopeWidget(widgetTag)) return null;

    return buildKineskopeContext(api, widgetTag, getSelectedTag(api));
  }

  function getPinnedKineskopeContext(api = getTaptopApi()) {
    if (!state.pinnedWidgetOriginalId) return null;

    const selectedTag = getSelectedTag(api);
    const selectedWidgetTag = findKineskopeWidgetRoot(api, selectedTag);
    const selectedWidgetOriginalId = getOriginalId(api, readObjectValue(selectedWidgetTag, 'id'));
    if (selectedWidgetOriginalId !== state.pinnedWidgetOriginalId) return null;

    return getContextByWidgetOriginalId(state.pinnedWidgetOriginalId);
  }

  function getFreshActiveContext() {
    const current = getKineskopeContext();
    if (current) return current;
    const pinned = getPinnedKineskopeContext();
    if (pinned) return pinned;
    return getContextByWidgetOriginalId(state.activeContext?.widgetOriginalId);
  }

  function findCanvasKineskopeElement(target) {
    let element = isElementNode(target) ? target : target?.parentElement || null;

    while (isElementNode(element)) {
      const widget = normalizeDataToken(readElementData(element, WIDGET_DATA_NAME));
      const role = normalizeDataToken(readElementData(element, KINESKOPE_DATA_NAME));
      if (widget === 'kineskope' || role === 'cover') return element;
      element = element.parentElement;
    }

    return null;
  }

  function getIframeElementFromTopPoint(event) {
    const api = getTaptopApi();
    const iframe = getIframe(api);
    if (!iframe) return null;

    let iframeDocument = null;
    try {
      iframeDocument = iframe.contentDocument;
    } catch {}
    if (!iframeDocument) return null;

    const rect = iframe.getBoundingClientRect();
    const clientX = Number(event.clientX);
    const clientY = Number(event.clientY);
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;

    const scaleX = iframe.offsetWidth ? rect.width / iframe.offsetWidth : 1;
    const scaleY = iframe.offsetHeight ? rect.height / iframe.offsetHeight : scaleX;
    const x = (clientX - rect.left) / scaleX;
    const y = (clientY - rect.top) / scaleY;

    try {
      return iframeDocument.elementFromPoint(x, y);
    } catch {
      return null;
    }
  }

  function getIframeElementFromEventPoint(event) {
    const targetDocument = event.target?.ownerDocument;
    if (targetDocument && targetDocument !== document) {
      try {
        return targetDocument.elementFromPoint(event.clientX, event.clientY);
      } catch {
        return null;
      }
    }

    return getIframeElementFromTopPoint(event);
  }

  function findCanvasKineskopeElementFromEvent(event) {
    return findCanvasKineskopeElement(event.target) || findCanvasKineskopeElement(getIframeElementFromEventPoint(event));
  }

  function findCanvasKineskopeWidgetElement(element) {
    let current = element;
    while (isElementNode(current)) {
      if (normalizeDataToken(readElementData(current, WIDGET_DATA_NAME)) === 'kineskope') return current;
      current = current.parentElement;
    }
    return null;
  }

  function getKineskopeContextFromDomElement(element) {
    const api = getTaptopApi();
    if (!api || !isElementNode(element)) return null;

    const widgetElement = findCanvasKineskopeWidgetElement(element);
    if (widgetElement) {
      const widgetId = widgetElement.id || widgetElement.getAttribute?.('id') || '';
      const widgetTag = widgetId ? getTagById(api, widgetId, true) : null;
      if (widgetTag && isKineskopeWidget(widgetTag)) {
        return buildKineskopeContext(api, widgetTag, getSelectedTag(api));
      }
    }

    let current = element;
    while (isElementNode(current)) {
      const id = current.id || current.getAttribute?.('id') || '';
      const tag = id ? getTagById(api, id, true) : null;
      const widgetTag = tag ? (isKineskopeWidget(tag) ? tag : findKineskopeWidgetRoot(api, tag)) : null;
      if (widgetTag) return buildKineskopeContext(api, widgetTag, tag || getSelectedTag(api));
      current = current.parentElement;
    }

    return null;
  }

  function dispatchDataUpdate(api, tag) {
    try {
      api?.events?.emit?.(api.events.ON_CHANGE_DOM_ATTR, tag);
    } catch {}
  }

  function setEmbedSrc(context, value) {
    const fresh = context?.widgetOriginalId
      ? getContextByWidgetOriginalId(context.widgetOriginalId)
      : getKineskopeContext();
    const api = fresh?.api;
    const tag = fresh?.embedTag;
    if (!api || !tag) return false;

    const key = findExistingDataKey(tag, SRC_DATA_NAME) || 'custom-data-src';
    try {
      if (findExistingDataKey(tag, SRC_DATA_NAME) && !readObjectValue(tag, 'isComposed') && typeof tag.setData === 'function') {
        tag.setData(key, { type: 'STRING', value });
      } else if (typeof tag.setAttr === 'function') {
        tag.setAttr(key, value);
      } else if (typeof tag.setData === 'function') {
        tag.setData(key, { type: 'STRING', value });
      } else {
        return false;
      }
      tag.dom?.setAttribute?.('data-src', value);
      dispatchDataUpdate(api, tag);
      state.activeContext = {
        ...fresh,
        src: value
      };
      setPopupError(false);
      return true;
    } catch {
      setPopupError(true);
      return false;
    }
  }

  function selectTag(api, tag) {
    if (!api || !tag) return false;
    const id = readObjectValue(tag, 'id');
    if (!id) return false;

    try {
      api.runtime?.setSelected?.(id);
      api.events?.emit?.(api.events.ON_SELECT_LAYER, tag, api.layout?.tree);
      return true;
    } catch {
      return false;
    }
  }

    function dispatchMouseClick(el) {
      if (!isHtmlElement(el)) return;
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
      if (!isHtmlElement(el)) return false;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function findTextButton(texts) {
    const candidates = Array.from(document.querySelectorAll('button, [role="button"], .tt-button, [class*="tab"], [class*="Tabs"] *'));
    const node = candidates
      .filter(isVisible)
      .sort((a, b) => normalizeText(a.textContent).length - normalizeText(b.textContent).length)
      .find((el) => matchesLocalizedText(el.textContent, texts, true));

    return node?.closest('button, [role="button"], .tt-button, [class*="tab"]') || node || null;
  }

  function findReplaceImageButton() {
    const candidates = Array.from(document.querySelectorAll('button, [role="button"], .tt-button, input[type="button"]'));
    const byText = candidates
      .filter(isVisible)
      .sort((a, b) => normalizeText(a.textContent || a.value).length - normalizeText(b.textContent || b.value).length)
      .find((el) => matchesLocalizedText(el.textContent || el.value, IMAGE_REPLACE_TEXTS));

    return byText?.closest('button, [role="button"], .tt-button') || byText || null;
  }

  function waitForElement(find, timeout = 5000) {
    const startedAt = Date.now();
    return new Promise((resolve) => {
      const tick = () => {
        const found = find();
        if (found) {
          resolve(found);
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

  async function openCoverImageDialog(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const context = getFreshActiveContext();
    if (!context?.coverTag) {
      setPopupError(true);
      return;
    }

    state.activeContext = context;
    selectTag(context.api, context.coverTag);

    setTimeout(() => scheduleSync(), 0);
    await waitForAnimationFrame();

    const settingsTab = findTextButton(SETTINGS_TEXTS);
    if (settingsTab) dispatchMouseClick(settingsTab);

    const replaceButton = await waitForElement(findReplaceImageButton, 5000);
    if (replaceButton) {
      dispatchMouseClick(replaceButton);
      setPopupError(false);
    } else {
      setPopupError(true);
    }
  }

  function waitForAnimationFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 80));
    });
  }

  function systemIconSvg(name) {
    return '<svg width="18" height="18" class="tt-icon tt-icon--size-18 tt-icon--name-' + name + '" aria-hidden="true"><use href="/g/s3/mosaic/images/icons.svg#' + name + '" xlink:href="/g/s3/mosaic/images/icons.svg#' + name + '"></use></svg>';
  }

  function cogIconSvg() {
    return [
      '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/>',
      '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8.92 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.31.22.65.22 1h.09a2 2 0 1 1 0 4h-.09c0 .35-.08.69-.22 1Z"/>',
      '</svg>'
    ].join('');
  }

  function buildTriggerButton(type = 'layer') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = type === 'layer'
      ? 'tt-enhancer-kineskope-trigger tt-enhancer-kineskope-trigger--inline'
      : 'tt-enhancer-kineskope-trigger';
    button.setAttribute(TRIGGER_ATTR, type);
    button.setAttribute('aria-label', OPEN_POPUP_TEXT);
    button.setAttribute('aria-expanded', 'false');
    button.title = OPEN_POPUP_TEXT;
    button.innerHTML = cogIconSvg();
    button.addEventListener('click', (event) => {
      markOwnPointerEvent(event);
      event.preventDefault();
      event.stopPropagation();
      togglePopup(button);
    }, true);
    ['pointerdown', 'mousedown', 'mouseup', 'dblclick'].forEach((type) => {
      button.addEventListener(type, (event) => {
        markOwnPointerEvent(event);
        event.stopPropagation();
      }, true);
    });
    return button;
  }

  function removeHeaderTriggerButtons() {
    document.querySelectorAll(`[${TRIGGER_ATTR}="header"]`).forEach((button) => button.remove());
    state.triggerButton?.remove?.();
    state.triggerButton = null;
  }

  function removeOrphanTriggerButtons() {
    document.querySelectorAll(`[${TRIGGER_ATTR}]`).forEach((button) => button.remove());
    state.triggerButton = null;
    state.layerTriggerButton = null;
    state.popupAnchorButton = null;
  }

  function ensureLayerTriggerButton() {
    const controls = document.querySelector(LAYER_CONTROLS_SELECTOR);
    if (!(controls instanceof HTMLElement)) {
      removeLayerTriggerButton();
      return null;
    }

    if (state.layerTriggerButton && document.contains(state.layerTriggerButton)) {
      if (state.layerTriggerButton.parentElement !== controls) controls.appendChild(state.layerTriggerButton);
      state.layerTriggerButton.hidden = false;
      return state.layerTriggerButton;
    }

    state.layerTriggerButton?.remove?.();
    state.layerTriggerButton = buildTriggerButton('layer');
    state.layerTriggerButton.hidden = false;
    controls.appendChild(state.layerTriggerButton);
    return state.layerTriggerButton;
  }

  function ensureHeaderTriggerButton() {
    if (state.triggerButton && document.contains(state.triggerButton)) return state.triggerButton;
    state.triggerButton?.remove?.();
    state.triggerButton = buildTriggerButton('header');
    state.triggerButton.hidden = true;
    document.body.appendChild(state.triggerButton);
    return state.triggerButton;
  }

  function removeLayerTriggerButton() {
    if (state.popupAnchorButton === state.layerTriggerButton) state.popupAnchorButton = null;
    state.layerTriggerButton?.remove?.();
    state.layerTriggerButton = null;
  }

  function getTriggerButtons() {
    return [state.layerTriggerButton, state.triggerButton]
      .filter((button) => button && document.contains(button));
  }

  function getPreferredTriggerButton() {
    return getTriggerButtons().find((button) => isVisible(button)) || null;
  }

  function markOwnPointerEvent(event) {
    const clientX = Number(event.clientX);
    const clientY = Number(event.clientY);
    state.lastOwnPointer = {
      at: Date.now(),
      x: Number.isFinite(clientX) ? clientX : null,
      y: Number.isFinite(clientY) ? clientY : null
    };
  }

  function isRecentOwnPointerEvent(event) {
    const last = state.lastOwnPointer;
    if (!last || Date.now() - last.at > 1200) return false;

    const clientX = Number(event.clientX);
    const clientY = Number(event.clientY);
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY) || last.x == null || last.y == null) {
      return true;
    }

    return Math.abs(clientX - last.x) <= 8 && Math.abs(clientY - last.y) <= 8;
  }

  function isPointInsideElement(event, element) {
    if (!isElementNode(element) || element.hidden) return false;
    const clientX = Number(event.clientX);
    const clientY = Number(event.clientY);
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return false;

    const rect = element.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  function isOwnUiEvent(event) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    if (path.includes(state.popup) || path.includes(state.triggerButton) || path.includes(state.layerTriggerButton)) {
      return true;
    }

    if (isRecentOwnPointerEvent(event)) return true;

    if (
      isPointInsideElement(event, state.popup) ||
      isPointInsideElement(event, state.triggerButton) ||
      isPointInsideElement(event, state.layerTriggerButton)
    ) {
      return true;
    }

    const target = event.target;
    return Boolean(
      target?.closest?.(`[${ROOT_ATTR}], [${TRIGGER_ATTR}]`) ||
      target?.parentElement?.closest?.(`[${ROOT_ATTR}], [${TRIGGER_ATTR}]`)
    );
  }

  function setTriggersExpanded(isExpanded, activeButton = null) {
    getTriggerButtons().forEach((button) => {
      const isActive = Boolean(isExpanded && (!activeButton || button === activeButton));
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    });
  }

  function buildPopup() {
    const root = document.createElement('div');
    root.className = 'tt-enhancer-kineskope-popup';
    root.setAttribute(ROOT_ATTR, '1');
    root.hidden = true;

    const imageButton = document.createElement('button');
    imageButton.type = 'button';
    imageButton.className = 'tt-enhancer-kineskope-popup__image';
    imageButton.title = IMAGE_REPLACE_TEXT;
    imageButton.setAttribute('aria-label', IMAGE_REPLACE_TEXT);
    imageButton.innerHTML = systemIconSvg('medium-widgets-image');
    imageButton.addEventListener('click', openCoverImageDialog, true);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tt-enhancer-kineskope-popup__input';
    input.placeholder = 'https://kinescope.io/...';
    input.autocomplete = 'off';
    input.spellcheck = false;

    input.addEventListener('input', () => {
      clearTimeout(state.commitTimer);
      state.commitTimer = setTimeout(() => commitInputValue(), 350);
    });
    input.addEventListener('change', commitInputValue);
    input.addEventListener('blur', commitInputValue);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitInputValue();
        input.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        hidePopup();
      }
    });

    ['pointerdown', 'mousedown', 'mouseup', 'click', 'dblclick', 'wheel'].forEach((type) => {
      root.addEventListener(type, markOwnPointerEvent, true);
      root.addEventListener(type, (event) => {
        event.stopPropagation();
      });
    });

    root.append(imageButton, input);
    return root;
  }

  function ensurePopup() {
    if (state.popup && document.contains(state.popup)) return state.popup;
    state.popup = buildPopup();
    document.body.appendChild(state.popup);
    return state.popup;
  }

  function setPopupError(isError) {
    state.popup?.classList.toggle('is-error', Boolean(isError));
  }

  function commitInputValue() {
    clearTimeout(state.commitTimer);
    const input = state.popup?.querySelector('.tt-enhancer-kineskope-popup__input');
    if (!(input instanceof HTMLInputElement)) return;
    const context = getFreshActiveContext();
    if (!context) return;
    setEmbedSrc(context, input.value.trim());
  }

  function hidePopup(options = {}) {
    if (!state.popup) {
      state.isPopupOpen = false;
      state.popupAnchorButton = null;
      setTriggersExpanded(false);
      if (options.clearContext) {
        state.activeContext = null;
        state.pinnedWidgetOriginalId = '';
      }
      return;
    }
    state.popup.hidden = true;
    state.popup.classList.remove('is-error');
    state.isPopupOpen = false;
    state.popupAnchorButton = null;
    setTriggersExpanded(false);
    if (options.clearContext) {
      state.activeContext = null;
      state.pinnedWidgetOriginalId = '';
    }
  }

  function clearKineskopeUi() {
    hidePopup({ clearContext: true });
    removeHeaderTriggerButtons();
    removeLayerTriggerButton();
  }

  function showPopup(context = getFreshActiveContext(), anchorButton = getPreferredTriggerButton(), anchorMode = 'button') {
    if (!context) return;
    state.activeContext = context;
    state.pinnedWidgetOriginalId = context.widgetOriginalId;
    state.isPopupOpen = true;
    state.popupAnchorButton = anchorButton && document.contains(anchorButton) ? anchorButton : null;
    state.popupAnchorMode = anchorMode;
    const popup = ensurePopup();
    popup.hidden = false;
    updatePopupContent(context);
    positionPopupForContext(context);
    syncIframeScrollListener(context.api);
    setTriggersExpanded(true, state.popupAnchorButton);
  }

  function togglePopup(anchorButton = getPreferredTriggerButton(), anchorMode = 'button') {
    if (state.isPopupOpen && state.popup && !state.popup.hidden) {
      if (!anchorButton || state.popupAnchorButton === anchorButton) {
        hidePopup();
        return;
      }
    }
    showPopup(getFreshActiveContext(), anchorButton, anchorMode);
  }

  function getIframe(api) {
    const iframe = api?.events?.iframe || document.querySelector('#tt-iframe, iframe.tt-iframe');
    return isIframeElement(iframe) ? iframe : null;
  }

  function getElementRectInTopWindow(element, api) {
    if (!isElementNode(element)) return null;

    const rect = element.getBoundingClientRect();
    if (element.ownerDocument === document) return rect;

    const iframe = element.ownerDocument?.defaultView?.frameElement || getIframe(api);
    if (!isElementNode(iframe)) return null;

    const iframeRect = iframe.getBoundingClientRect();
    const scaleX = iframe.offsetWidth ? iframeRect.width / iframe.offsetWidth : 1;
    const scaleY = iframe.offsetHeight ? iframeRect.height / iframe.offsetHeight : scaleX;

    return {
      left: iframeRect.left + rect.left * scaleX,
      top: iframeRect.top + rect.top * scaleY,
      right: iframeRect.left + rect.right * scaleX,
      bottom: iframeRect.top + rect.bottom * scaleY,
      width: rect.width * scaleX,
      height: rect.height * scaleY
    };
  }

  function getTagDom(tag, api) {
    const dom = readObjectValue(tag, 'dom');
    if (isElementNode(dom)) return dom;
    try {
      if (isElementNode(tag?.dom)) return tag.dom;
    } catch {}

    const id = readObjectValue(tag, 'id');
    const originalId = getOriginalId(api, id);
    const doc = getIframe(api)?.contentDocument;
    if (!doc) return null;

    const ids = [id, originalId].filter(Boolean);
    for (const candidateId of ids) {
      try {
        const found = doc.getElementById(candidateId) || doc.querySelector(`#${CSS.escape(candidateId)}`);
        if (isElementNode(found)) return found;
      } catch {}
    }
    return null;
  }

  function getVisibleRectForTag(tag, api) {
    const dom = getTagDom(tag, api);
    const rect = getElementRectInTopWindow(dom, api);
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    return { dom, rect };
  }

  function getContextAnchorRect(context) {
    return (
      getVisibleRectForTag(context.widgetTag, context.api) ||
      getVisibleRectForTag(context.selectedTag, context.api) ||
      getVisibleRectForTag(context.coverTag, context.api) ||
      getVisibleRectForTag(context.embedTag, context.api)
    )?.rect || null;
  }

  function getFallbackHeaderRect(context) {
    const rect = getContextAnchorRect(context);
    if (!rect) return null;
    const labelWidth = Math.max(120, Math.min(260, getTagLabel(context.widgetTag).length * 8 + 36));
    return {
      left: rect.left,
      top: rect.top - TRIGGER_SIZE - 4,
      right: rect.left + labelWidth,
      bottom: rect.top,
      width: labelWidth,
      height: TRIGGER_SIZE + 4
    };
  }

  function getHeaderRect(context) {
    const anchorRect = getContextAnchorRect(context);
    if (!anchorRect) return null;

    const label = getTagLabel(context.widgetTag);
    const candidates = Array.from(document.querySelectorAll('div, span, button, label'))
      .filter((el) => {
        if (!isVisible(el)) return false;
        if (el.closest?.(`[${ROOT_ATTR}], [${TRIGGER_ATTR}], ${LAYERS_LIST_SELECTOR}`)) return false;
        const text = normalizeText(el.textContent);
        return label ? text === label || text.includes(label) : false;
      })
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const topDistance = Math.abs(rect.bottom - anchorRect.top);
        const leftDistance = Math.abs(rect.left - anchorRect.left);
        const sizePenalty = Math.max(0, rect.width - 360) + Math.max(0, rect.height - 60) * 8;
        return { rect, score: topDistance * 4 + leftDistance + sizePenalty };
      })
      .sort((a, b) => a.score - b.score);

    return candidates[0]?.rect || getFallbackHeaderRect(context);
  }

  function updatePopupContent(context) {
    const popup = state.popup;
    if (!popup) return;

    popup.dataset.widgetId = context.widgetOriginalId;
    const input = popup.querySelector('.tt-enhancer-kineskope-popup__input');
    if (input instanceof HTMLInputElement && document.activeElement !== input) {
      input.value = context.src || '';
    }

    const imageButton = popup.querySelector('.tt-enhancer-kineskope-popup__image');
    if (imageButton instanceof HTMLButtonElement) {
      imageButton.disabled = !context.coverTag;
    }

    setPopupError(false);
  }

  function getCanvasButtonGroupRect(context) {
    const anchorRect = getContextAnchorRect(context);
    if (!anchorRect) return null;

    const headerRect = getHeaderRect(context);
    const rowCenter = headerRect
      ? headerRect.top + headerRect.height / 2
      : anchorRect.top - TRIGGER_SIZE / 2;
    const minLeft = Math.max(0, anchorRect.left - 16);
    const maxLeft = anchorRect.right + 160;

    const candidates = Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter((el) => {
        if (!isVisible(el)) return false;
        if (el.closest?.(`[${ROOT_ATTR}], [${TRIGGER_ATTR}], ${LAYERS_LIST_SELECTOR}, ${LAYER_CONTROLS_SELECTOR}`)) return false;
        const rect = el.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        if (Math.abs(centerY - rowCenter) > 26) return false;
        if (rect.left < minLeft || rect.left > maxLeft) return false;
        return rect.width >= 18 && rect.width <= 48 && rect.height >= 18 && rect.height <= 48;
      })
      .map((el) => el.getBoundingClientRect());

    if (!candidates.length) return null;

    const left = Math.min(...candidates.map((rect) => rect.left));
    const top = Math.min(...candidates.map((rect) => rect.top));
    const right = Math.max(...candidates.map((rect) => rect.right));
    const bottom = Math.max(...candidates.map((rect) => rect.bottom));

    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top
    };
  }

  function positionHeaderTriggerForContext(context = state.activeContext) {
    const button = ensureHeaderTriggerButton();
    if (!button || !context?.widgetTag) return false;

    const anchorRect = getCanvasButtonGroupRect(context) || getHeaderRect(context) || getContextAnchorRect(context);
    if (!anchorRect) {
      removeHeaderTriggerButtons();
      return false;
    }

    const triggerSize = TRIGGER_SIZE;
    const left = Math.min(
      Math.max(anchorRect.right + TRIGGER_GAP, POPUP_MARGIN),
      window.innerWidth - triggerSize - POPUP_MARGIN
    );
    const top = Math.min(
      Math.max(anchorRect.top + Math.max(0, (anchorRect.height - triggerSize) / 2), POPUP_MARGIN),
      window.innerHeight - triggerSize - POPUP_MARGIN
    );

    button.hidden = false;
    button.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
    return true;
  }

  function syncLayerTriggerForContext(context = state.activeContext) {
    if (!context?.widgetTag) {
      removeLayerTriggerButton();
      return;
    }

    const button = ensureLayerTriggerButton();
    if (!button) return null;
    button.hidden = false;
    button.style.transform = '';

    if (state.popupAnchorMode === 'button' && state.isPopupOpen && !state.popupAnchorButton) {
      state.popupAnchorButton = button;
      setTriggersExpanded(true, button);
    }
    return button;
  }

  function getPopupAnchorRect(context) {
    if (state.popupAnchorMode === 'button') {
      const button = state.popupAnchorButton;
      if (button && document.contains(button) && isVisible(button)) {
        return button.getBoundingClientRect();
      }
      if (state.layerTriggerButton && document.contains(state.layerTriggerButton) && isVisible(state.layerTriggerButton)) {
        state.popupAnchorButton = state.layerTriggerButton;
        return state.layerTriggerButton.getBoundingClientRect();
      }
      if (state.triggerButton && document.contains(state.triggerButton) && isVisible(state.triggerButton)) {
        state.popupAnchorButton = state.triggerButton;
        return state.triggerButton.getBoundingClientRect();
      }
    }

    return getHeaderRect(context);
  }

  function positionPopupForContext(context = state.activeContext) {
    if (!state.popup || state.popup.hidden || !context?.widgetTag) return;

    const anchorRect = getPopupAnchorRect(context);
    if (!anchorRect) {
      hidePopup();
      return;
    }

    const popupRect = state.popup.getBoundingClientRect();
    const popupWidth = popupRect.width || 360;
    const popupHeight = popupRect.height || 36;
    let left = anchorRect.left;
    let top = anchorRect.bottom + POPUP_GAP;

    left = Math.min(Math.max(left, POPUP_MARGIN), window.innerWidth - popupWidth - POPUP_MARGIN);
    top = Math.min(Math.max(top, POPUP_MARGIN), window.innerHeight - popupHeight - POPUP_MARGIN);

    state.popup.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
  }

  function syncKineskopeUiForContext(context) {
    if (!context?.widgetTag) return false;
    const previousWidgetId = state.activeContext?.widgetOriginalId || '';
    if (previousWidgetId && previousWidgetId !== context.widgetOriginalId) hidePopup();

    state.activeContext = context;
    positionHeaderTriggerForContext(context);
    syncLayerTriggerForContext(context);

    if (state.isPopupOpen && state.popup && !state.popup.hidden) {
      updatePopupContent(context);
      positionPopupForContext(context);
    }
    syncIframeScrollListener(context.api);
    return true;
  }

  function syncPopup() {
    const api = getTaptopApi();
    syncIframeScrollListener(api);

    const context = getKineskopeContext(api);
    const pinnedContext = context || getPinnedKineskopeContext(api);
    if (!pinnedContext) {
      clearKineskopeUi();
      return;
    }

    syncKineskopeUiForContext(pinnedContext);
  }

  function scheduleSync(delay = 40) {
    clearTimeout(state.syncTimer);
    state.syncTimer = setTimeout(syncPopup, delay);
  }

  function scheduleSyncBurst() {
    [0, 80, 180, 360, 700, 1200].forEach((delay) => {
      setTimeout(syncPopup, delay);
    });
  }

  function schedulePosition() {
    if (state.positionTimer) return;
    state.positionTimer = requestAnimationFrame(() => {
      state.positionTimer = 0;
      const context = getFreshActiveContext();
      positionHeaderTriggerForContext(context);
      syncLayerTriggerForContext(context);
      positionPopupForContext();
    });
  }

  function addSelectedListeners(api) {
    if (!api?.events || state.selectedEvents === api.events) return Boolean(state.selectedEvents);

    removeSelectedListeners();
    state.selectedEvents = api.events;
    state.onSelectedChange = () => scheduleSync();

    try { api.events.on?.(api.events.ON_SET_SELECTED, state.onSelectedChange); } catch {}
    try { api.events.on?.(api.events.ON_SELECT_LAYER, state.onSelectedChange); } catch {}

    return true;
  }

  function removeSelectedListeners() {
    const events = state.selectedEvents;
    const handler = state.onSelectedChange;
    if (events && handler) {
      try { events.off?.(events.ON_SET_SELECTED, handler); } catch {}
      try { events.off?.(events.ON_SELECT_LAYER, handler); } catch {}
      try { events.removeListener?.(events.ON_SET_SELECTED, handler); } catch {}
      try { events.removeListener?.(events.ON_SELECT_LAYER, handler); } catch {}
    }
    state.selectedEvents = null;
    state.onSelectedChange = null;
  }

  function removeIframeScrollListener() {
    state.iframeScrollTarget?.removeEventListener?.('scroll', state.onIframeScroll, true);
    state.iframeDocument?.removeEventListener?.('pointerdown', state.onIframeClick, true);
    state.iframeDocument?.removeEventListener?.('mousedown', state.onIframeClick, true);
    state.iframeDocument?.removeEventListener?.('click', state.onIframeClick, true);
    state.iframeDocument?.removeEventListener?.('mouseup', state.onIframeClick, true);
    state.iframeScrollTarget = null;
    state.iframeDocument = null;
    state.iframe = null;
  }

  function syncIframeScrollListener(api) {
    const iframe = getIframe(api);
    let iframeDocument = null;
    try {
      iframeDocument = iframe?.contentDocument || null;
    } catch {}

    if (iframe === state.iframe && iframeDocument === state.iframeDocument) return;

    removeIframeScrollListener();
    state.iframe = iframe;
    if (!iframe) return;

    try {
      state.iframeScrollTarget = iframe.contentWindow;
      state.iframeScrollTarget?.addEventListener?.('scroll', state.onIframeScroll, true);
    } catch {}

    state.iframeDocument = iframeDocument;
    state.iframeDocument?.addEventListener?.('pointerdown', state.onIframeClick, true);
    state.iframeDocument?.addEventListener?.('mousedown', state.onIframeClick, true);
    state.iframeDocument?.addEventListener?.('click', state.onIframeClick, true);
    state.iframeDocument?.addEventListener?.('mouseup', state.onIframeClick, true);
  }

  function syncKineskopeUiFromCanvasElement(element) {
    const context = getKineskopeContextFromDomElement(element);
    if (!context) return false;

    state.pinnedWidgetOriginalId = context.widgetOriginalId;
    syncKineskopeUiForContext(context);
    [80, 180, 360].forEach((delay) => {
      setTimeout(() => {
        const fresh = getKineskopeContext() || getPinnedKineskopeContext() || getContextByWidgetOriginalId(context.widgetOriginalId);
        if (fresh) syncKineskopeUiForContext(fresh);
      }, delay);
    });
    return true;
  }

  function syncFromCanvasClick(event) {
    if (syncKineskopeUiFromCanvasElement(findCanvasKineskopeElementFromEvent(event))) return;
    state.pinnedWidgetOriginalId = '';
    scheduleSync(120);
  }

  function start() {
    const api = getTaptopApi();
    if (!api?.runtime || !api?.layout?.tree || !api?.events) {
      state.retryTimer = setTimeout(start, 250);
      return;
    }

    addSelectedListeners(api);
    startSelectionPolling(api);
    syncIframeScrollListener(api);
    scheduleSync(0);
  }

  function startSelectionPolling(api) {
    clearInterval(state.pollTimer);
    state.lastSelectedId = api?.runtime?.selected || '';
    state.pollTimer = setInterval(() => {
      const nextSelectedId = api?.runtime?.selected || '';
      if (nextSelectedId === state.lastSelectedId) return;
      state.lastSelectedId = nextSelectedId;
      scheduleSync(0);
    }, 200);
  }

  state.onDocumentClick = (event) => {
    if (isOwnUiEvent(event)) return;
    if (state.isPopupOpen) hidePopup();
    if (event.target?.closest?.(`${LAYERS_LIST_SELECTOR}, ${LAYERS_PANEL_SELECTOR}`)) {
      state.pinnedWidgetOriginalId = '';
      scheduleSyncBurst();
      return;
    }
    if (syncKineskopeUiFromCanvasElement(findCanvasKineskopeElementFromEvent(event))) return;
    state.pinnedWidgetOriginalId = '';
    scheduleSync(80);
  };

  state.onKeyDown = (event) => {
    if (event.key === 'Escape' && state.popup && !state.popup.hidden) {
      hidePopup();
    }
  };

  state.onViewportChange = () => schedulePosition();
  state.onIframeScroll = () => schedulePosition();
  state.onIframeClick = (event) => syncFromCanvasClick(event);

  state.observer = new MutationObserver((mutations) => {
    const onlyOwnPopup = mutations.every((mutation) => {
      const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
      return nodes.length && nodes.every((node) => (
        node instanceof HTMLElement &&
        (
          node.hasAttribute(ROOT_ATTR) ||
          node.hasAttribute(TRIGGER_ATTR) ||
          Boolean(node.closest?.(`[${ROOT_ATTR}], [${TRIGGER_ATTR}]`))
        )
      ));
    });
    if (!onlyOwnPopup) schedulePosition();
  });

  document.addEventListener('click', state.onDocumentClick, true);
  document.addEventListener('mouseup', state.onDocumentClick, true);
  document.addEventListener('keydown', state.onKeyDown, true);
  document.addEventListener('scroll', state.onViewportChange, true);
  window.addEventListener('resize', state.onViewportChange, true);
  state.observer.observe(document.documentElement || document.body, { childList: true, subtree: true });

  start();
})();
