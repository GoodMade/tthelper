(function () {
  const LAYERS_LIST_SELECTOR = '.tt-layers__list';
  const LAYER_ITEM_SELECTOR = '.tt-layers__item';
  const ROOT_ATTR = 'data-tt-enhancer-layer-visibility-toggles';
  const EMBED_BUTTON_SELECTOR = '[data-tt-enhancer-embed-inline-edit][data-tt-layer-button-owner="active"]';
  const HELPER_CLASS_NAME = 'helper--d-none';
  const STATE_KEY = '__ttEnhancerLayerVisibilityToggles';

  try {
    const state = window[STATE_KEY];
    state?.observer?.disconnect?.();
    if (state?.onLayerClick) document.removeEventListener('click', state.onLayerClick, true);
    if (state?.onLayerClick) document.removeEventListener('mouseup', state.onLayerClick, true);
    if (state?.onDocumentMouseDown) document.removeEventListener('mousedown', state.onDocumentMouseDown, true);
    if (state?.onViewportChange) document.removeEventListener('scroll', state.onViewportChange, true);
    if (state?.onViewportChange) window.removeEventListener('resize', state.onViewportChange, true);
    if (state?.onKeyDown) document.removeEventListener('keydown', state.onKeyDown, true);
    if (state?.onKeyUp) document.removeEventListener('keyup', state.onKeyUp, true);
    if (state?.onWindowBlur) window.removeEventListener('blur', state.onWindowBlur, true);
    document.querySelectorAll(`[${ROOT_ATTR}]`).forEach((el) => el.remove());
  } catch {}

  let activeLayer = null;
  let raf = 0;
  let runtimeRequire = null;

  function getRuntimeRequire() {
    if (runtimeRequire) return runtimeRequire;

    const chunk = window.rspackChunktaptop_design_editor;
    if (!chunk || typeof chunk.push !== 'function') return null;

    try {
      const chunkId = `tt-enhancer-d-none-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
        visibility: req(10582)?.B,
        constants: req(89224)
      };
    } catch {
      return null;
    }
  }

  function dispatchCssUpdate(api) {
    try {
      api?.events?.emit?.(api.events.ON_CSS_CHANGE, null, true);
      if (api?.events?.ON_CHANGE_TAG_DISPLAY) api.events.emit(api.events.ON_CHANGE_TAG_DISPLAY);
    } catch {}
  }

  function dispatchDisplayUpdate(api) {
    try {
      if (api?.events?.ON_CHANGE_TAG_DISPLAY) api.events.emit(api.events.ON_CHANGE_TAG_DISPLAY);
    } catch {}
  }

  function saveHistory(label) {
    try {
      const req = getRuntimeRequire();
      req?.(16271)?.A?.add?.(label);
    } catch {}
  }

  function isVisible(el) {
    if (!(el instanceof HTMLElement)) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function systemIconSvg(name) {
    return '<svg width="15" height="15" class="tt-icon tt-icon--size-15 tt-icon--name-' + name + '" aria-hidden="true"><use href="/g/s3/mosaic/images/icons.svg#' + name + '" xlink:href="/g/s3/mosaic/images/icons.svg#' + name + '"></use></svg>';
  }

  function getSelectedTag(api = getTaptopApi()) {
    const selected = api?.runtime?.selected;
    const tree = api?.layout?.tree;
    if (!selected || !tree) return null;

    const originalId = api?.events?.getOriginalID?.(selected) || selected;
    try {
      if (tree.has?.(originalId)) return tree.get(originalId);
      if (tree.has?.(selected)) return tree.get(selected);
      return tree.get(originalId) || tree.get(selected) || null;
    } catch {
      return null;
    }
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

  function tagHasHelperClass(tag, helperClass = findHelperClass()) {
    if (!tag || !helperClass) return false;
    return Array.isArray(tag.classNameIds) && tag.classNameIds.includes(helperClass.id);
  }

  function isFullyHidden(tag) {
    return Boolean(tag?.getVisibilityParams?.()?.params?.isHiddenAll);
  }

  function toggleFullVisibility() {
    const api = getTaptopApi();
    const tag = getSelectedTag(api);
    const tree = api?.layout?.tree;
    if (!tag || !tree) return;

    const nextHidden = !isFullyHidden(tag);
    if (api?.visibility?.setVisibility) {
      api.visibility.setVisibility(tag, tree, nextHidden);
    } else if (typeof tag.getVisibilityParams === 'function' && typeof tag.setVisibilityParams === 'function') {
      const params = tag.getVisibilityParams();
      params.params.isHiddenAll = nextHidden;
      tag.setVisibilityParams(params);
    } else {
      return;
    }

    dispatchDisplayUpdate(api);
    saveHistory(nextHidden ? 'hide layer' : 'show layer');
    updateButtonControls();
  }

  function toggleHelperClass() {
    const api = getTaptopApi();
    const tag = getSelectedTag(api);
    const helperClass = ensureHelperStyle(api);
    if (!tag || !helperClass) return;

    if (tagHasHelperClass(tag, helperClass)) {
      tag.removeClassNameId?.(helperClass.id);
    } else {
      tag.addClassNameId?.(helperClass.id);
    }

    dispatchCssUpdate(api);
    saveHistory(`toggle ${HELPER_CLASS_NAME}`);
    updateButtonControls();
  }

  function removeControls() {
    document.querySelectorAll(`[${ROOT_ATTR}]`).forEach((el) => el.remove());
  }

  function updateButtonControls(root = document.querySelector(`[${ROOT_ATTR}]`)) {
    if (!(root instanceof HTMLElement)) return;
    const api = getTaptopApi();
    const tag = getSelectedTag(api);
    const helperClass = findHelperClass(api);
    const dNoneActive = tagHasHelperClass(tag, helperClass);
    const fullHidden = isFullyHidden(tag);
    const dNoneButton = root.querySelector('[data-tt-helper-d-none-toggle]');
    const fullButton = root.querySelector('[data-tt-full-visibility-toggle]');

    if (dNoneButton instanceof HTMLElement) {
      dNoneButton.title = dNoneActive ? `Убрать ${HELPER_CLASS_NAME}` : `Назначить ${HELPER_CLASS_NAME}`;
      setButtonState(dNoneButton, dNoneActive);
    }

    if (fullButton instanceof HTMLElement) {
      fullButton.title = fullHidden ? 'Показать слой' : 'Скрыть слой полностью';
      setButtonIcon(fullButton, 'medium-visibility-none');
      setButtonState(fullButton, fullHidden);
    }
  }

  function setButtonIcon(button, icon) {
    if (button.dataset.icon === icon) return;
    button.dataset.icon = icon;
    button.innerHTML = systemIconSvg(icon);
    button.querySelector('svg').style.cssText = 'width: 20px;height: 20px;fill: currentColor';
  }

  function setButtonState(button, isActive) {
    button.dataset.active = isActive ? '1' : '0';
    button.setAttribute('aria-label', button.title);
    button.style.background = isActive ? '#0d7cff' : '#fff';
    button.style.color = isActive ? '#fff' : '#0d7cff';
    button.style.boxShadow = isActive
      ? '0 1px 4px rgba(0, 0, 0, 0.18)'
      : 'inset 0 0 0 1px rgba(13, 124, 255, 0.18), 0 1px 4px rgba(0, 0, 0, 0.12)';
  }

  function positionControls(root) {
    if (!activeLayer || !document.contains(activeLayer)) return false;

    const itemRect = activeLayer.getBoundingClientRect();
    const panelRect = activeLayer.closest('.tt-layers')?.getBoundingClientRect();
    const editButton = document.querySelector(EMBED_BUTTON_SELECTOR);
    const editRect = editButton instanceof HTMLElement && isVisible(editButton) ? editButton.getBoundingClientRect() : null;
    const left = Math.round(editRect ? editRect.right + 8 : (panelRect?.right || itemRect.right) + 16);
    const top = Math.round(itemRect.top + itemRect.height / 2);

    if (itemRect.bottom < 0 || itemRect.top > window.innerHeight) {
      root.remove();
      return false;
    }

    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
    return true;
  }

  function buildControls() {
    const root = document.createElement('div');
    root.setAttribute(ROOT_ATTR, '1');
    root.style.cssText = [
      'position: fixed',
      'left: 0',
      'top: 0',
      'transform: translateY(-50%)',
      'z-index: 2147482501',
      'display: flex',
      'gap: 6px',
      'align-items: center',
      'height: 30px'
    ].join(';');

    const fullButton = document.createElement('button');
    fullButton.type = 'button';
    fullButton.dataset.ttFullVisibilityToggle = '1';
    setButtonIcon(fullButton, 'medium-visibility-none');
    fullButton.style.cssText = getButtonCss();
    fullButton.addEventListener('mousedown', stopControlEvent, true);
    fullButton.addEventListener('click', (event) => {
      stopControlEvent(event);
      toggleFullVisibility();
    }, true);

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.ttHelperDNoneToggle = '1';
    setButtonIcon(button, 'medium-display-none');
    button.style.cssText = getButtonCss();
    button.addEventListener('mousedown', stopControlEvent, true);
    button.addEventListener('click', (event) => {
      stopControlEvent(event);
      toggleHelperClass();
    }, true);

    root.appendChild(button);
    root.appendChild(fullButton);
    updateButtonControls(root);

    return root;
  }

  function getButtonCss() {
    return [
      'width: 30px',
      'height: 30px',
      'padding: 0',
      'border: 0',
      'border-radius: 6px',
      'background: #0d7cff',
      'color: #fff',
      'display: inline-flex',
      'align-items: center',
      'justify-content: center',
      'cursor: pointer',
      'box-shadow: inset 0 0 0 1px rgba(13, 124, 255, 0.18), 0 1px 4px rgba(0, 0, 0, 0.12)'
    ].join(';');
  }

  function stopControlEvent(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function ensureControls() {
    if (!activeLayer || !document.contains(activeLayer)) {
      removeControls();
      return;
    }

    let root = document.querySelector(`[${ROOT_ATTR}]`);
    if (!root) {
      root = buildControls();
      document.body.appendChild(root);
    }
    updateButtonControls(root);
    positionControls(root);
  }

  function scheduleControls() {
    [0, 80, 180, 360, 700, 1200].forEach((delay) => setTimeout(ensureControls, delay));
  }

  function onLayerClick(event) {
    const list = event.target?.closest?.(LAYERS_LIST_SELECTOR);
    const item = event.target?.closest?.(LAYER_ITEM_SELECTOR);
    if (!list || !item || !list.contains(item)) return;
    if (event.target?.closest?.(`[${ROOT_ATTR}]`)) return;

    activeLayer = item;
    scheduleControls();
  }

  function onDocumentMouseDown(event) {
    if (event.target?.closest?.(`[${ROOT_ATTR}]`)) return;
    if (event.target?.closest?.(LAYERS_LIST_SELECTOR)) return;
    activeLayer = null;
    removeControls();
  }

  function scheduleFromMutation() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      ensureControls();
    });
  }

  function onViewportChange() {
    const root = document.querySelector(`[${ROOT_ATTR}]`);
    if (root) positionControls(root);
  }

  const observer = new MutationObserver((mutations) => {
    const onlyOwnControls = mutations.every((mutation) => {
      const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
      const target = mutation.target;
      if (target instanceof HTMLElement && target.closest(`[${ROOT_ATTR}]`)) return true;
      return nodes.length && nodes.every((node) => {
        if (node instanceof HTMLElement) return node.hasAttribute(ROOT_ATTR) || Boolean(node.closest(`[${ROOT_ATTR}]`));
        return node.parentElement?.closest?.(`[${ROOT_ATTR}]`);
      });
    });
    if (!onlyOwnControls) scheduleFromMutation();
  });

  document.addEventListener('click', onLayerClick, true);
  document.addEventListener('mouseup', onLayerClick, true);
  document.addEventListener('mousedown', onDocumentMouseDown, true);
  document.addEventListener('scroll', onViewportChange, true);
  window.addEventListener('resize', onViewportChange, true);
  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });

  window[STATE_KEY] = {
    observer,
    onLayerClick,
    onDocumentMouseDown,
    onViewportChange
  };
})();
