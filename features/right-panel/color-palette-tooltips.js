(function () {
  const FEATURE_KEY = '__ttEnhancerColorPaletteTooltips__';
  const ORIGINAL_TITLE_ATTR = 'data-tt-enhancer-color-palette-original-title';
  const SUPPRESSED_TITLE_ATTR = 'data-tt-enhancer-color-palette-suppressed-title';
  const SUPPRESSED_TITLE_VALUE_ATTR = 'data-tt-enhancer-color-palette-suppressed-title-value';
  const OPTIMISTIC_STYLE_ATTR = 'data-tt-enhancer-color-palette-optimistic-style';
  const OPTIMISTIC_STYLE_KEY_ATTR = 'data-tt-enhancer-color-palette-optimistic-style-key';
  const TOOLTIP_CLASS = 'tt-enhancer-color-palette-tooltip';
  const FIELD_TOOLTIP_ACTIVE_CLASS = 'tt-enhancer-color-field-tooltip-active';
  const DETAILS_TOGGLE_CLASS = 'tt-enhancer-color-details-toggle';
  const DETAILS_LIST_CLASS = 'tt-enhancer-color-details-list';
  const DETAILS_ITEM_CLASS = 'tt-enhancer-color-details-item';
  const DETAILS_EXPANDED_CLASS = 'tt-enhancer-color-details-expanded';
  const ACTIVE_SWATCH_CLASS = 'tt-enhancer-color-palette-active-swatch';
  const DETAILS_ROW_KEY_ATTR = 'data-tt-enhancer-color-details-key';
  const SWATCH_SELECTOR = '.tt-swatches__item';
  const FIELD_SELECTOR = '.tt-input-color-picker';
  const HOVER_SELECTOR = `${SWATCH_SELECTOR}, ${FIELD_SELECTOR}`;
  const API_MODULE_ID = 85923;
  const APPLY_DELAY_MS = 50;
  const LOAD_DELAY_MS = 250;
  const REFRESH_INTERVAL_MS = 4000;
  const OPTIMISTIC_ENTRY_TTL_MS = 8000;
  const VIEWPORT_MARGIN = 8;
  const TOOLTIP_GAP = 8;
  const SCROLL_RESTORE_DELAYS_MS = [0, 50, 180, 420, 780];

  try {
    window[FEATURE_KEY]?.destroy?.();
  } catch {}

  const colorProbe = document.createElement('span');
  let runtimeRequire = null;

  const state = {
    destroyed: false,
    colorNames: new Map(),
    observer: null,
    refreshIntervalId: null,
    applyTimerId: null,
    loadTimerId: null,
    loadTimerIds: [],
    scrollRestoreTimerIds: [],
    loadPromise: null,
    lastLoadAt: 0,
    optimisticEntries: new Map(),
    optimisticSwatches: new Map(),
    originalFetch: null,
    tooltip: null,
    activeElement: null,
    activeSource: '',
    detailsExpanded: false,
    detailsScrollPositions: new WeakMap()
  };

  function getRuntimeRequire() {
    if (runtimeRequire) return runtimeRequire;

    const chunk = window.rspackChunktaptop_design_editor;
    if (!chunk || typeof chunk.push !== 'function') return null;

    try {
      const chunkId = `tt-enhancer-color-palette-tooltips-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      chunk.push([[chunkId], {}, (req) => {
        runtimeRequire = req;
      }]);
    } catch {}

    return runtimeRequire;
  }

  function getFetchUrl(input) {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    if (input instanceof Request) return input.url;

    return '';
  }

  function getSavedColorApiRequest(input) {
    const rawUrl = getFetchUrl(input);
    if (!rawUrl) return null;

    let url;
    try {
      url = new URL(rawUrl, window.location.href);
    } catch {
      return null;
    }

    const method = url.searchParams.get('method') || '';
    const action = method.split('/').pop();
    if (!['addSavedColor', 'editSavedColor', 'deleteSavedColor'].includes(action)) return null;

    return {
      action,
      params: {
        color: url.searchParams.get('param[color]') || '',
        name: url.searchParams.get('param[name]') || '',
        index: Number(url.searchParams.get('param[index]'))
      }
    };
  }

  function normalizeAlpha(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '1';

    const normalized = Math.max(0, Math.min(1, number));
    return String(Math.round(normalized * 1000) / 1000).replace(/\.?0+$/, '') || '0';
  }

  function normalizeChannel(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;

    return Math.max(0, Math.min(255, Math.round(number)));
  }

  function rgbPartsToKey(parts) {
    if (!parts || parts.length < 3) return null;

    const red = normalizeChannel(parts[0]);
    const green = normalizeChannel(parts[1]);
    const blue = normalizeChannel(parts[2]);
    const alpha = normalizeAlpha(parts.length > 3 ? parts[3] : 1);

    if (red === null || green === null || blue === null) return null;

    return `${red},${green},${blue},${alpha}`;
  }

  function parseRgbString(value) {
    const match = String(value || '').match(/rgba?\(([^)]+)\)/i);
    if (!match) return null;

    return rgbPartsToKey(match[1].split(',').map((part) => part.trim()));
  }

  function normalizeColorToKey(value) {
    const rawValue = String(value || '').trim();
    if (!rawValue) return null;

    if (/^\d+\s*,/.test(rawValue)) {
      return rgbPartsToKey(rawValue.split(',').map((part) => part.trim()));
    }

    const rgbMatch = rawValue.match(/rgba?\([^)]+\)/i);
    if (rgbMatch) return parseRgbString(rgbMatch[0]);

    let cssValue = rawValue;
    if (/^[\da-f]{3,8}$/i.test(cssValue)) {
      cssValue = `#${cssValue}`;
    }

    colorProbe.style.color = '';
    colorProbe.style.color = cssValue;

    if (!colorProbe.style.color) return null;

    return parseRgbString(colorProbe.style.color);
  }

  function getAliasKeys(key) {
    if (!key) return [];

    const parts = key.split(',');
    const keys = [key];

    if (parts[3] === '1') {
      keys.push(`${parts[0]},${parts[1]},${parts[2]}`);
    }

    return keys;
  }

  function getColorKeys(value) {
    return getAliasKeys(normalizeColorToKey(value));
  }

  function toHexChannel(value) {
    return Number(value).toString(16).padStart(2, '0');
  }

  function keyToDisplayColor(key) {
    const [red, green, blue, alpha = '1'] = String(key || '').split(',');
    if (!red || !green || !blue) return '';

    if (alpha !== '1') {
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }

    const hex = `${toHexChannel(red)}${toHexChannel(green)}${toHexChannel(blue)}`;
    if (hex[0] === hex[1] && hex[2] === hex[3] && hex[4] === hex[5]) {
      return `#${hex[0]}${hex[2]}${hex[4]}`;
    }

    return `#${hex}`;
  }

  function keyToRgbColor(key) {
    const [red, green, blue, alpha = '1'] = String(key || '').split(',');
    if (!red || !green || !blue) return '';

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  function getReactFiber(element) {
    if (!(element instanceof HTMLElement)) return null;

    const key = Object.keys(element).find((item) => (
      item.startsWith('__reactFiber$') || item.startsWith('__reactInternalInstance$')
    ));

    return key ? element[key] : null;
  }

  function getReactProps(element) {
    if (!(element instanceof HTMLElement)) return null;

    const key = Object.keys(element).find((item) => item.startsWith('__reactProps$'));

    return key ? element[key] : null;
  }

  function findFiber(fiber, predicate) {
    let current = fiber;

    while (current) {
      if (predicate(current)) return current;
      current = current.return;
    }

    return null;
  }

  function getSwatchesComponent(swatch) {
    const fiber = getReactFiber(swatch);
    const componentFiber = findFiber(fiber, (item) => {
      const instance = item.stateNode;
      return !!(
        instance
        && instance.props?.swatches?.list
        && typeof instance.getSelectedSwatch === 'function'
      );
    });

    return componentFiber?.stateNode || null;
  }

  function patchSwatchComponentProps(swatch, color) {
    const fiber = getReactFiber(swatch);
    const swatchFiber = findFiber(fiber, (item) => {
      const instance = item.stateNode;
      return !!(
        instance
        && instance.props
        && Object.prototype.hasOwnProperty.call(instance.props, 'color')
        && Object.prototype.hasOwnProperty.call(instance.props, 'index')
      );
    });

    const instance = swatchFiber?.stateNode;

    try {
      if (instance?.props) instance.props.color = color;
      if (swatchFiber?.memoizedProps) swatchFiber.memoizedProps.color = color;
      if (swatchFiber?.pendingProps) swatchFiber.pendingProps.color = color;
    } catch {}
  }

  function getSwatchItemComponent(swatch) {
    const fiber = getReactFiber(swatch);
    const swatchFiber = findFiber(fiber, (item) => {
      const instance = item.stateNode;
      return !!(
        instance
        && instance.props
        && Object.prototype.hasOwnProperty.call(instance.props, 'color')
        && Object.prototype.hasOwnProperty.call(instance.props, 'index')
      );
    });

    return swatchFiber?.stateNode || null;
  }

  function selectSavedSwatch(swatch) {
    if (!(swatch instanceof HTMLElement)) return false;

    const instance = getSwatchItemComponent(swatch);

    if (typeof instance?.onSelect === 'function') {
      try {
        instance.onSelect();
        return true;
      } catch {}
    }

    if (typeof instance?.props?.onSelect === 'function') {
      try {
        instance.props.onSelect(instance.props.color, instance.props.index);
        return true;
      } catch {}
    }

    return activateNativeControl(swatch);
  }

  function selectSavedSwatchByIndex(wrapper, index) {
    if (!isSavedSwatchesWrapper(wrapper) || !Number.isInteger(index) || index < 0) return false;

    const component = getSavedSwatchesComponentFromWrapper(wrapper);
    const swatches = getSavedSwatchElements(wrapper, component?.props?.swatches?.list).savedSwatches;

    if (selectSavedSwatch(swatches[index])) return true;

    const color = component?.props?.swatches?.list?.[index]?.color;

    if (component && color && typeof component.onSelect === 'function') {
      try {
        component.onSelect(color, index);
        return true;
      } catch {}
    }

    return selectSavedSwatch(swatches[index]);
  }

  function updateRuntimeSavedSwatch(index, key, name) {
    const color = keyToRgbColor(key);
    const cleanName = String(name || '').trim();
    if (!Number.isInteger(index) || index < 0 || !color || !cleanName) return false;

    let didUpdate = false;

    getSavedSwatchesByIndex(index).forEach((swatch) => {
      const component = getSwatchesComponent(swatch);
      const model = component?.props?.swatches?.list?.[index];

      try {
        if (model?.update) {
          model.update(color, cleanName);
          didUpdate = true;
        }
      } catch {}

      patchSwatchComponentProps(swatch, color);

      try {
        component?.forceUpdate?.();
      } catch {}
    });

    return didUpdate;
  }

  function setColorName(map, color, name) {
    const cleanName = String(name || '').trim();
    const key = normalizeColorToKey(color);
    if (!cleanName || !key) return;

    const entry = {
      name: cleanName,
      color: keyToDisplayColor(key)
    };

    getAliasKeys(key).forEach((aliasKey) => {
      map.set(aliasKey, entry);
    });
  }

  function setColorNameByKey(map, key, name) {
    const cleanName = String(name || '').trim();
    if (!cleanName || !key) return;

    const entry = {
      name: cleanName,
      color: keyToDisplayColor(key)
    };

    getAliasKeys(key).forEach((aliasKey) => {
      map.set(aliasKey, entry);
    });
  }

  function getSwatchesWrapper(element) {
    return element?.closest?.('.tt-swatches__wrapper') || null;
  }

  function isSavedSwatchesWrapper(wrapper) {
    return wrapper instanceof HTMLElement && !String(wrapper.className || '').toLowerCase().includes('last');
  }

  function getSwatchIndex(swatch) {
    const wrapper = getSwatchesWrapper(swatch);
    if (!isSavedSwatchesWrapper(wrapper)) return -1;

    return Array.from(wrapper.querySelectorAll(SWATCH_SELECTOR)).indexOf(swatch);
  }

  function getSavedSwatchWrappers() {
    return Array.from(document.querySelectorAll('.tt-swatches__wrapper')).filter(isSavedSwatchesWrapper);
  }

  function getSavedSwatchesByIndex(index) {
    if (!Number.isInteger(index) || index < 0) return [];

    return getSavedSwatchWrappers()
      .map((wrapper) => wrapper.querySelectorAll(SWATCH_SELECTOR)[index])
      .filter((swatch) => swatch instanceof HTMLElement);
  }

  function getSavedWrapperFromGroup(group) {
    if (!(group instanceof HTMLElement)) return null;

    return Array.from(group.querySelectorAll('.tt-swatches__wrapper')).find(isSavedSwatchesWrapper) || null;
  }

  function getSavedSwatchesComponentFromWrapper(wrapper) {
    const swatches = Array.from(wrapper?.querySelectorAll?.(SWATCH_SELECTOR) || []);

    for (const swatch of swatches) {
      const component = getSwatchesComponent(swatch);
      if (component) return component;
    }

    return null;
  }

  function getAvailableAddButton(wrapper) {
    return Array.from(wrapper?.querySelectorAll?.('.tt-swatches__add') || []).find((button) => {
      if (!(button instanceof HTMLElement)) return false;

      const className = String(button.className || '').toLowerCase();
      const isDisabled = className.includes('disabled') || button.hasAttribute('disabled') || button.disabled === true;

      return !isDisabled;
    }) || null;
  }

  function getSavedSwatchElements(wrapper, models) {
    const allSwatches = Array.from(wrapper?.querySelectorAll?.(SWATCH_SELECTOR) || [])
      .filter((swatch) => swatch instanceof HTMLElement);

    if (Array.isArray(models) && allSwatches.length > models.length) {
      return {
        allSwatches,
        savedSwatches: allSwatches.slice(allSwatches.length - models.length)
      };
    }

    return {
      allSwatches,
      savedSwatches: allSwatches
    };
  }

  function getPickerColorKey(component) {
    const color = component?.props?.color;
    const candidates = [
      typeof color === 'string' ? color : '',
      color?.toRgbString?.(),
      color?.toHexString?.(),
      color?.toHex?.()
    ];

    return getFirstColorKey(candidates.filter(Boolean));
  }

  function isNativeSwatchActive(swatch, component, index) {
    const activeIndex = component?.state?.activeIndex;
    const hasNativeActiveClass = Array.from(swatch?.classList || []).some((className) => {
      return className !== ACTIVE_SWATCH_CLASS && className.toLowerCase().includes('active');
    });

    return (
      hasNativeActiveClass
      || (Number.isInteger(activeIndex) && activeIndex === index)
    );
  }

  function findSavedSwatchIndexByKey(savedSwatches, models, currentKey) {
    if (!currentKey) return -1;
    return savedSwatches.findIndex((swatch, index) => {
      const model = Array.isArray(models) ? models[index] : null;
      return getSwatchKeyForDetails(swatch, model, index) === currentKey;
    });
  }

  function getActiveSavedSwatchIndex(savedSwatches, models, component) {
    const nativeActiveIndex = savedSwatches.findIndex((swatch, index) => isNativeSwatchActive(swatch, component, index));
    if (nativeActiveIndex > -1) return nativeActiveIndex;

    return findSavedSwatchIndexByKey(savedSwatches, models, getPickerColorKey(component));
  }

  function getSwatchKeyForDetails(swatch, model, index) {
    const optimisticSwatch = Number.isInteger(index) ? state.optimisticSwatches.get(index) : null;
    const candidates = swatch ? getSwatchColorCandidates(swatch) : [];

    return optimisticSwatch?.key
      || normalizeColorToKey(model?.color)
      || getFirstColorKey(candidates);
  }

  function syncSavedSwatchActiveClass(wrapper) {
    const component = getSavedSwatchesComponentFromWrapper(wrapper);
    const models = component?.props?.swatches?.list;
    const { allSwatches, savedSwatches } = getSavedSwatchElements(wrapper, models);
    const activeIndex = getActiveSavedSwatchIndex(savedSwatches, models, component);

    allSwatches.forEach((swatch) => swatch.classList.remove(ACTIVE_SWATCH_CLASS));

    savedSwatches.forEach((swatch, index) => {
      swatch.classList.toggle(ACTIVE_SWATCH_CLASS, index === activeIndex);
    });
  }

  function clearScrollRestoreTimers() {
    state.scrollRestoreTimerIds.forEach((timerId) => window.clearTimeout(timerId));
    state.scrollRestoreTimerIds = [];
  }

  function restoreScrollPosition(element, scrollLeft, scrollTop) {
    if (!(element instanceof HTMLElement) || !document.documentElement.contains(element)) return;

    element.scrollLeft = scrollLeft;
    element.scrollTop = scrollTop;
  }

  function getDetailsScrollContainer(element) {
    if (!(element instanceof HTMLElement)) return null;
    if (element.classList.contains(DETAILS_LIST_CLASS)) return element;

    const list = element.closest(`.${DETAILS_LIST_CLASS}`);
    return list instanceof HTMLElement ? list : null;
  }

  function rememberDetailsScrollPosition(element) {
    const list = getDetailsScrollContainer(element);
    const wrapper = list?.closest?.('.tt-swatches__wrapper');
    if (!(list instanceof HTMLElement) || !isSavedSwatchesWrapper(wrapper)) return;

    state.detailsScrollPositions.set(wrapper, {
      scrollLeft: list.scrollLeft,
      scrollTop: list.scrollTop
    });
  }

  function queueScrollRestore(element) {
    if (!(element instanceof HTMLElement)) return;

    const scrollLeft = element.scrollLeft;
    const scrollTop = element.scrollTop;

    clearScrollRestoreTimers();
    SCROLL_RESTORE_DELAYS_MS.forEach((delay) => {
      const timerId = window.setTimeout(() => {
        state.scrollRestoreTimerIds = state.scrollRestoreTimerIds.filter((id) => id !== timerId);
        restoreScrollPosition(element, scrollLeft, scrollTop);
      }, delay);

      state.scrollRestoreTimerIds.push(timerId);
    });
  }

  function queueSwatchScrollRestore(element) {
    const swatchesList = element?.closest?.('.tt-swatches__list');

    if (swatchesList instanceof HTMLElement && swatchesList.getClientRects().length) {
      queueScrollRestore(swatchesList);
    }
  }

  function getSavedSwatchDetails(wrapper) {
    cleanupOptimisticEntries();

    const component = getSavedSwatchesComponentFromWrapper(wrapper);
    const models = component?.props?.swatches?.list;
    const { allSwatches, savedSwatches } = getSavedSwatchElements(wrapper, models);
    const activeIndex = getActiveSavedSwatchIndex(savedSwatches, models, component);

    if (Array.isArray(models)) {
      return models.map((model, index) => {
        const swatch = savedSwatches[index] || null;
        const candidates = swatch ? getSwatchColorCandidates(swatch) : [];
        const info = swatch ? getColorInfo(candidates) : null;
        const optimisticSwatch = state.optimisticSwatches.get(index);
        const key = getSwatchKeyForDetails(swatch, model, index);

        if (!key) return null;

        const displayColor = keyToDisplayColor(key);

        return {
          index,
          swatchIndex: swatch ? allSwatches.indexOf(swatch) : -1,
          name: optimisticSwatch?.name || String(model?.name || info?.name || '').trim(),
          color: displayColor,
          cssColor: keyToRgbColor(key) || displayColor,
          active: index === activeIndex
        };
      }).filter(Boolean);
    }

    return allSwatches.map((swatch, index) => {
      const candidates = getSwatchColorCandidates(swatch);
      const key = getFirstColorKey(candidates);
      const info = getColorInfo(candidates);

      if (!key) return null;

      const displayColor = info?.color || keyToDisplayColor(key);

      return {
        index,
        swatchIndex: index,
        name: info?.name || '',
        color: displayColor,
        cssColor: keyToRgbColor(key) || displayColor,
        active: index === activeIndex
      };
    }).filter(Boolean);
  }

  function createDetailsSwatch(cssColor) {
    const swatch = document.createElement('span');
    const fill = document.createElement('span');

    swatch.className = `${DETAILS_ITEM_CLASS}__swatch`;
    fill.className = `${DETAILS_ITEM_CLASS}__swatch-fill`;
    fill.style.backgroundColor = cssColor;
    swatch.append(fill);

    return swatch;
  }

  function createDetailsText(name, color) {
    const text = document.createElement('span');
    const title = document.createElement('span');
    const value = document.createElement('span');

    text.className = `${DETAILS_ITEM_CLASS}__text`;
    title.className = `${DETAILS_ITEM_CLASS}__name`;
    value.className = `${DETAILS_ITEM_CLASS}__color`;
    title.textContent = name || color;
    value.textContent = color;
    text.append(title, value);

    return text;
  }

  function createDetailsCreateItem() {
    const row = document.createElement('button');
    const icon = document.createElement('span');
    const text = document.createElement('span');

    row.type = 'button';
    row.className = `${DETAILS_ITEM_CLASS} ${DETAILS_ITEM_CLASS}--create`;
    row.dataset.action = 'add';
    row.setAttribute(DETAILS_ROW_KEY_ATTR, 'add');
    row.setAttribute('role', 'listitem');
    icon.className = `${DETAILS_ITEM_CLASS}__create-icon`;
    icon.textContent = '+';
    text.className = `${DETAILS_ITEM_CLASS}__create-text`;
    text.textContent = 'Создать новый цвет';
    row.append(icon, text);

    return row;
  }

  function createDetailsSaveButton() {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = `${DETAILS_ITEM_CLASS}__save`;
    button.dataset.action = 'add';
    button.setAttribute('aria-label', 'Сохранить текущий цвет');
    button.textContent = '+';

    return button;
  }

  function setAttributeIfChanged(element, name, value) {
    if (!(element instanceof HTMLElement)) return;
    const nextValue = String(value);
    if (element.getAttribute(name) !== nextValue) {
      element.setAttribute(name, nextValue);
    }
  }

  function setTextIfChanged(element, value) {
    if (!(element instanceof HTMLElement)) return;
    const nextValue = String(value);
    if (element.textContent !== nextValue) {
      element.textContent = nextValue;
    }
  }

  function createDetailsItem(item, canSave) {
    const row = document.createElement('div');

    row.className = DETAILS_ITEM_CLASS;
    row.setAttribute(DETAILS_ROW_KEY_ATTR, `saved:${item.index}`);
    row.dataset.index = String(item.index);
    row.dataset.swatchIndex = String(item.swatchIndex);
    row.setAttribute('role', 'listitem');
    row.classList.toggle(`${DETAILS_ITEM_CLASS}--active`, !!item.active);
    row.append(createDetailsSwatch(item.cssColor), createDetailsText(item.name, item.color));

    if (item.active && canSave) {
      row.append(createDetailsSaveButton());
    }

    return row;
  }

  function updateDetailsCreateItem(row) {
    if (!(row instanceof HTMLButtonElement)) return createDetailsCreateItem();

    row.type = 'button';
    const className = `${DETAILS_ITEM_CLASS} ${DETAILS_ITEM_CLASS}--create`;
    if (row.className !== className) row.className = className;
    if (row.dataset.action !== 'add') row.dataset.action = 'add';
    setAttributeIfChanged(row, DETAILS_ROW_KEY_ATTR, 'add');
    setAttributeIfChanged(row, 'role', 'listitem');

    let icon = row.querySelector(`.${DETAILS_ITEM_CLASS}__create-icon`);
    let text = row.querySelector(`.${DETAILS_ITEM_CLASS}__create-text`);

    if (!(icon instanceof HTMLElement) || !(text instanceof HTMLElement)) {
      row.replaceChildren();
      icon = document.createElement('span');
      text = document.createElement('span');
      icon.className = `${DETAILS_ITEM_CLASS}__create-icon`;
      text.className = `${DETAILS_ITEM_CLASS}__create-text`;
      row.append(icon, text);
    }

    setTextIfChanged(icon, '+');
    setTextIfChanged(text, 'Создать новый цвет');
    return row;
  }

  function updateDetailsItem(row, item, canSave) {
    if (!(row instanceof HTMLDivElement)) return createDetailsItem(item, canSave);

    if (!row.classList.contains(DETAILS_ITEM_CLASS)) row.classList.add(DETAILS_ITEM_CLASS);
    row.classList.remove(`${DETAILS_ITEM_CLASS}--create`);
    setAttributeIfChanged(row, DETAILS_ROW_KEY_ATTR, `saved:${item.index}`);
    if (row.dataset.index !== String(item.index)) row.dataset.index = String(item.index);
    if (row.dataset.swatchIndex !== String(item.swatchIndex)) row.dataset.swatchIndex = String(item.swatchIndex);
    setAttributeIfChanged(row, 'role', 'listitem');
    const activeClass = `${DETAILS_ITEM_CLASS}--active`;
    if (row.classList.contains(activeClass) !== !!item.active) {
      row.classList.toggle(activeClass, !!item.active);
    }

    let swatch = row.querySelector(`.${DETAILS_ITEM_CLASS}__swatch`);
    let text = row.querySelector(`.${DETAILS_ITEM_CLASS}__text`);

    if (!(swatch instanceof HTMLElement)) {
      swatch = createDetailsSwatch(item.cssColor);
      row.prepend(swatch);
    }

    let fill = swatch.querySelector(`.${DETAILS_ITEM_CLASS}__swatch-fill`);
    if (!(fill instanceof HTMLElement)) {
      swatch.replaceChildren();
      fill = document.createElement('span');
      fill.className = `${DETAILS_ITEM_CLASS}__swatch-fill`;
      swatch.append(fill);
    }
    if (fill.style.backgroundColor !== item.cssColor) {
      fill.style.backgroundColor = item.cssColor;
    }

    if (!(text instanceof HTMLElement)) {
      text = createDetailsText(item.name, item.color);
      swatch.after(text);
    }

    let name = text.querySelector(`.${DETAILS_ITEM_CLASS}__name`);
    let color = text.querySelector(`.${DETAILS_ITEM_CLASS}__color`);
    if (!(name instanceof HTMLElement) || !(color instanceof HTMLElement)) {
      text.replaceChildren();
      name = document.createElement('span');
      color = document.createElement('span');
      name.className = `${DETAILS_ITEM_CLASS}__name`;
      color.className = `${DETAILS_ITEM_CLASS}__color`;
      text.append(name, color);
    }
    setTextIfChanged(name, item.name || item.color);
    setTextIfChanged(color, item.color);

    const shouldShowSave = !!item.active && canSave;
    let saveButton = row.querySelector(`.${DETAILS_ITEM_CLASS}__save`);
    if (shouldShowSave) {
      if (!(saveButton instanceof HTMLButtonElement)) {
        saveButton = createDetailsSaveButton();
        row.append(saveButton);
      }
    } else {
      saveButton?.remove();
    }

    return row;
  }

  function syncDetailsRows(list, rows, canSave) {
    const existingRows = new Map();
    Array.from(list.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        const key = child.getAttribute(DETAILS_ROW_KEY_ATTR);
        if (key) existingRows.set(key, child);
      }
    });

    let didChangeStructure = false;
    const usedRows = new Set();

    rows.forEach((rowData, index) => {
      const key = rowData === 'add' ? 'add' : `saved:${rowData.index}`;
      const existingRow = existingRows.get(key);
      const nextRow = rowData === 'add'
        ? updateDetailsCreateItem(existingRow)
        : updateDetailsItem(existingRow, rowData, canSave);

      usedRows.add(nextRow);

      if (list.children[index] !== nextRow) {
        list.insertBefore(nextRow, list.children[index] || null);
        didChangeStructure = true;
      }
    });

    Array.from(list.children).forEach((child) => {
      if (!usedRows.has(child)) {
        child.remove();
        didChangeStructure = true;
      }
    });

    return didChangeStructure;
  }

  function ensureDetailsList(wrapper) {
    let list = Array.from(wrapper.children).find((child) => child.classList?.contains(DETAILS_LIST_CLASS));

    if (!list) {
      list = document.createElement('div');
      list.className = DETAILS_LIST_CLASS;
      list.setAttribute('role', 'list');

      const swatchesList = wrapper.querySelector('.tt-swatches__list');
      if (swatchesList) {
        swatchesList.after(list);
      } else {
        wrapper.prepend(list);
      }
    }

    return list;
  }

  function renderDetailsList(wrapper) {
    const list = ensureDetailsList(wrapper);
    const rememberedScrollPosition = state.detailsScrollPositions.get(wrapper);
    const scrollLeft = Number.isFinite(rememberedScrollPosition?.scrollLeft)
      ? rememberedScrollPosition.scrollLeft
      : list.scrollLeft;
    const scrollTop = Number.isFinite(rememberedScrollPosition?.scrollTop)
      ? rememberedScrollPosition.scrollTop
      : list.scrollTop;

    list.hidden = !state.detailsExpanded;

    if (!state.detailsExpanded) {
      list.replaceChildren();
      return;
    }

    const rows = [];
    const canSave = !!getAvailableAddButton(wrapper);
    if (canSave) rows.push('add');

    getSavedSwatchDetails(wrapper).forEach((item) => {
      rows.push(item);
    });

    const didChangeStructure = syncDetailsRows(list, rows, canSave);
    if (!didChangeStructure) {
      rememberDetailsScrollPosition(list);
      return;
    }

    restoreScrollPosition(list, scrollLeft, scrollTop);
    rememberDetailsScrollPosition(list);
  }

  function ensureDetailsToggle(wrapper) {
    const group = wrapper.closest('.tt-swatches-group');
    const dropdown = group?.querySelector?.('.tt-swatches-group__dropdown');
    if (!(group instanceof HTMLElement) || !(dropdown instanceof HTMLElement)) return;

    let toggle = group.querySelector(`.${DETAILS_TOGGLE_CLASS}`);

    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = DETAILS_TOGGLE_CLASS;
      toggle.append(document.createElement('span'));
    }

    toggle.setAttribute('aria-expanded', state.detailsExpanded ? 'true' : 'false');
    toggle.setAttribute('aria-label', state.detailsExpanded ? 'Свернуть подробный список цветов' : 'Показать подробный список цветов');
    toggle.classList.toggle(`${DETAILS_TOGGLE_CLASS}--expanded`, state.detailsExpanded);

    if (toggle.previousElementSibling !== dropdown) {
      dropdown.after(toggle);
    }
  }

  function restoreDetailsUi(root = document) {
    if (!root.querySelectorAll) return;

    root.querySelectorAll(`.${DETAILS_TOGGLE_CLASS}, .${DETAILS_LIST_CLASS}`).forEach((element) => element.remove());
    root.querySelectorAll(`.${DETAILS_EXPANDED_CLASS}`).forEach((element) => {
      element.classList.remove(DETAILS_EXPANDED_CLASS);
    });
    root.querySelectorAll(`.${ACTIVE_SWATCH_CLASS}`).forEach((element) => {
      element.classList.remove(ACTIVE_SWATCH_CLASS);
    });
  }

  function isDetailsUiElement(element) {
    return element instanceof HTMLElement && !!element.closest(`.${DETAILS_TOGGLE_CLASS}, .${DETAILS_LIST_CLASS}`);
  }

  function cleanupOrphanDetailsUi() {
    document.querySelectorAll('.tt-swatches-group').forEach((group) => {
      if (getSavedWrapperFromGroup(group)) return;

      group.querySelectorAll(`.${DETAILS_TOGGLE_CLASS}`).forEach((element) => element.remove());
    });

    document.querySelectorAll(`.${DETAILS_LIST_CLASS}`).forEach((list) => {
      if (!isSavedSwatchesWrapper(list.closest('.tt-swatches__wrapper'))) {
        list.remove();
      }
    });

    document.querySelectorAll(`.tt-swatches__wrapper.${DETAILS_EXPANDED_CLASS}`).forEach((wrapper) => {
      if (!isSavedSwatchesWrapper(wrapper)) wrapper.classList.remove(DETAILS_EXPANDED_CLASS);
    });
  }

  function applySavedColorsDetails() {
    if (state.destroyed) return;

    cleanupOrphanDetailsUi();

    getSavedSwatchWrappers().forEach((wrapper) => {
      ensureDetailsToggle(wrapper);
      syncSavedSwatchActiveClass(wrapper);
      wrapper.classList.toggle(DETAILS_EXPANDED_CLASS, state.detailsExpanded);
      renderDetailsList(wrapper);
    });
  }

  function clickNativeElement(element) {
    if (!(element instanceof HTMLElement)) return;

    try {
      element.click();
    } catch {
      element.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
    }
  }

  function activateNativeControl(element) {
    if (!(element instanceof HTMLElement)) return false;

    const onClick = getReactProps(element)?.onClick;

    if (typeof onClick === 'function') {
      try {
        onClick({
          currentTarget: element,
          target: element,
          preventDefault() {},
          stopPropagation() {}
        });
        return true;
      } catch {}
    }

    clickNativeElement(element);
    return true;
  }

  function stopDetailsEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  }

  function handleDetailsClick(event, target) {
    const toggle = target.closest(`.${DETAILS_TOGGLE_CLASS}`);

    if (toggle) {
      stopDetailsEvent(event);
      hideTooltip();
      state.detailsExpanded = !state.detailsExpanded;
      applySavedColorsDetails();
      return true;
    }

    const item = target.closest(`.${DETAILS_ITEM_CLASS}`);
    if (!item) return false;

    const wrapper = item.closest('.tt-swatches__wrapper');
    if (!isSavedSwatchesWrapper(wrapper)) return false;

    stopDetailsEvent(event);
    hideTooltip();
    clearScrollRestoreTimers();
    rememberDetailsScrollPosition(item);

    const saveButton = target.closest(`.${DETAILS_ITEM_CLASS}__save`);
    if (item.dataset.action === 'add' || (saveButton && item.contains(saveButton))) {
      activateNativeControl(getAvailableAddButton(wrapper));
      scheduleSavedColorsReloadSeries();
      scheduleApply(wrapper);
      return true;
    }

    const index = Number(item.dataset.index);

    if (selectSavedSwatchByIndex(wrapper, index)) {
      scheduleApply(wrapper);
      scheduleLoadSavedColors(350, true);
    }

    return true;
  }

  function cleanupOptimisticEntries() {
    const now = Date.now();

    state.optimisticEntries.forEach((optimisticEntry, key) => {
      if (optimisticEntry.expiresAt <= now) {
        state.optimisticEntries.delete(key);
      }
    });

    state.optimisticSwatches.forEach((optimisticSwatch, index) => {
      if (optimisticSwatch.expiresAt <= now) {
        state.optimisticSwatches.delete(index);
      }
    });
  }

  function mergeOptimisticEntries(map) {
    cleanupOptimisticEntries();

    state.optimisticEntries.forEach(({ entry }, key) => {
      map.set(key, entry);
    });

    return map;
  }

  function createColorNameMap(items) {
    const map = new Map();

    (Array.isArray(items) ? items : []).forEach((item) => {
      if (!item) return;

      const name = item.n || item.name;
      const color = item.c ? `rgba(${String(item.c).replace(/,/g, ', ')})` : item.color;

      setColorName(map, color, name);
    });

    return mergeOptimisticEntries(map);
  }

  function getSavedColorEntry(key) {
    for (const aliasKey of getAliasKeys(key)) {
      const entry = state.colorNames.get(aliasKey);
      if (entry) return entry;
    }

    return null;
  }

  function getColorInfo(candidates) {
    let fallbackKey = null;

    for (const candidate of candidates) {
      const key = normalizeColorToKey(candidate);
      if (!key) continue;

      fallbackKey ||= key;

      const savedEntry = getSavedColorEntry(key);
      if (savedEntry) {
        return {
          name: savedEntry.name,
          color: savedEntry.color || keyToDisplayColor(key)
        };
      }
    }

    if (!fallbackKey) return null;

    return {
      name: '',
      color: keyToDisplayColor(fallbackKey)
    };
  }

  function rememberOriginalTitle(element) {
    if (element.hasAttribute(ORIGINAL_TITLE_ATTR)) return;

    element.setAttribute(ORIGINAL_TITLE_ATTR, element.getAttribute('title') || '');
  }

  function suppressNativeTitle(element) {
    if (!(element instanceof HTMLElement)) return;

    const currentTitle = element.getAttribute('title') || '';
    const previousSuppressedTitle = element.getAttribute(SUPPRESSED_TITLE_VALUE_ATTR) || '';

    if (currentTitle && currentTitle !== previousSuppressedTitle) {
      element.setAttribute(ORIGINAL_TITLE_ATTR, currentTitle);
      element.setAttribute(SUPPRESSED_TITLE_VALUE_ATTR, currentTitle);
    } else {
      rememberOriginalTitle(element);
    }

    element.setAttribute(SUPPRESSED_TITLE_ATTR, '1');
    element.removeAttribute('title');
  }

  function restoreElementTitle(element) {
    if (!(element instanceof HTMLElement) || !element.hasAttribute(SUPPRESSED_TITLE_ATTR)) return;

    const originalTitle = element.getAttribute(ORIGINAL_TITLE_ATTR) || '';

    if (originalTitle) {
      element.setAttribute('title', originalTitle);
    } else {
      element.removeAttribute('title');
    }

    element.removeAttribute(ORIGINAL_TITLE_ATTR);
    element.removeAttribute(SUPPRESSED_TITLE_ATTR);
    element.removeAttribute(SUPPRESSED_TITLE_VALUE_ATTR);
  }

  function getStyleColor(element, propertyName) {
    if (!(element instanceof HTMLElement)) return '';

    const inlineColor = element.style?.[propertyName];
    if (inlineColor) return inlineColor;

    try {
      return getComputedStyle(element)[propertyName] || '';
    } catch {
      return '';
    }
  }

  function getSwatchTitleTargets(swatch) {
    return [swatch, ...swatch.querySelectorAll('[title]')]
      .filter((element) => element instanceof HTMLElement);
  }

  function getSwatchColorCandidates(swatch, includeOptimistic = true) {
    const colorNode = swatch.querySelector('.tt-swatches__color');
    const candidates = [
      ...(includeOptimistic ? getOptimisticSwatchCandidates(swatch) : []),
      swatch.getAttribute('title'),
      swatch.getAttribute('data-color'),
      getStyleColor(colorNode, 'backgroundColor'),
      colorNode?.getAttribute('data-color'),
      getStyleColor(swatch, 'backgroundColor'),
      colorNode?.getAttribute('title'),
      swatch.getAttribute(SUPPRESSED_TITLE_VALUE_ATTR),
      swatch.getAttribute(ORIGINAL_TITLE_ATTR),
      colorNode?.getAttribute(SUPPRESSED_TITLE_VALUE_ATTR),
      colorNode?.getAttribute(ORIGINAL_TITLE_ATTR)
    ];

    return candidates.filter(Boolean);
  }

  function getFirstColorKey(candidates) {
    for (const candidate of candidates) {
      const key = normalizeColorToKey(candidate);
      if (key) return key;
    }

    return null;
  }

  function setOptimisticColorName(candidates, name) {
    const cleanName = String(name || '').trim();
    const key = getFirstColorKey(candidates);
    if (!cleanName || !key) return '';

    const entry = {
      name: cleanName,
      color: keyToDisplayColor(key)
    };
    const expiresAt = Date.now() + OPTIMISTIC_ENTRY_TTL_MS;

    getAliasKeys(key).forEach((aliasKey) => {
      state.optimisticEntries.set(aliasKey, {
        entry,
        expiresAt
      });
    });

    setColorNameByKey(state.colorNames, key, cleanName);
    return key;
  }

  function setOptimisticSwatch(index, key, name, commit = false) {
    const cleanName = String(name || '').trim();
    if (index < 0 || !key || !cleanName) return false;

    state.optimisticSwatches.set(index, {
      key,
      name: cleanName,
      expiresAt: Date.now() + OPTIMISTIC_ENTRY_TTL_MS
    });
    setColorNameByKey(state.colorNames, key, cleanName);

    if (commit) {
      updateRuntimeSavedSwatch(index, key, cleanName);
    }

    return true;
  }

  function getOptimisticSwatch(swatch) {
    cleanupOptimisticEntries();

    const index = getSwatchIndex(swatch);
    if (index < 0) return null;

    return state.optimisticSwatches.get(index) || null;
  }

  function getOptimisticSwatchCandidates(swatch) {
    const optimisticSwatch = getOptimisticSwatch(swatch);
    if (!optimisticSwatch) return [];

    return [optimisticSwatch.key];
  }

  function applySavedColorApiChange(request) {
    if (!request) return;

    const { action, params } = request;

    if (action === 'deleteSavedColor') {
      if (Number.isInteger(params.index)) {
        state.optimisticSwatches.delete(params.index);
      }
      scheduleApply();
      refreshActiveTooltip();
      return;
    }

    const cleanName = String(params.name || '').trim();
    const key = normalizeColorToKey(params.color);
    if (!cleanName || !key) return;

    setColorNameByKey(state.colorNames, key, cleanName);
    setOptimisticColorName([key], cleanName);

    if (action === 'editSavedColor' && Number.isInteger(params.index)) {
      setOptimisticSwatch(params.index, key, cleanName, true);
      getSavedSwatchesByIndex(params.index).forEach((swatch) => {
        applyOptimisticSwatchStyle(swatch);
        applyOptimisticSwatchEditorName(swatch);
        scheduleApply(swatch);
      });
    } else {
      scheduleApply();
    }

    refreshActiveTooltip();
  }

  function applyOptimisticSwatchStyle(swatch) {
    const optimisticSwatch = getOptimisticSwatch(swatch);
    const colorNode = swatch.querySelector('.tt-swatches__color');
    if (!optimisticSwatch || !(colorNode instanceof HTMLElement)) return;

    if (!colorNode.hasAttribute(OPTIMISTIC_STYLE_ATTR)) {
      colorNode.setAttribute(OPTIMISTIC_STYLE_ATTR, colorNode.getAttribute('style') || '');
    }

    if (colorNode.getAttribute(OPTIMISTIC_STYLE_KEY_ATTR) !== optimisticSwatch.key) {
      colorNode.setAttribute(OPTIMISTIC_STYLE_KEY_ATTR, optimisticSwatch.key);
    }

    if (normalizeColorToKey(getStyleColor(colorNode, 'backgroundColor')) !== optimisticSwatch.key) {
      colorNode.style.backgroundColor = keyToDisplayColor(optimisticSwatch.key);
    }
  }

  function applyOptimisticSwatchEditorName(swatch) {
    const optimisticSwatch = getOptimisticSwatch(swatch);
    const editor = getSwatchEditor(swatch);
    const nameNode = editor?.querySelector('.tt-swatches-editor__name');

    if (!optimisticSwatch || !(nameNode instanceof HTMLElement)) return;

    if (nameNode.textContent !== optimisticSwatch.name) {
      nameNode.textContent = optimisticSwatch.name;
    }
  }

  function isRuntimeSwatchCurrent(swatch) {
    const optimisticSwatch = getOptimisticSwatch(swatch);
    if (!optimisticSwatch) return true;

    const index = getSwatchIndex(swatch);
    const model = getSwatchesComponent(swatch)?.props?.swatches?.list?.[index];
    if (!model) return false;

    return (
      normalizeColorToKey(model.color) === optimisticSwatch.key
      && String(model.name || '').trim() === optimisticSwatch.name
    );
  }

  function shouldBlockOptimisticSwatchNativeClick(swatch) {
    const optimisticSwatch = getOptimisticSwatch(swatch);
    const colorNode = swatch?.querySelector?.('.tt-swatches__color');

    return !!optimisticSwatch && colorNode?.hasAttribute?.(OPTIMISTIC_STYLE_ATTR) && !isRuntimeSwatchCurrent(swatch);
  }

  function restoreOptimisticSwatchStyle(colorNode) {
    if (!(colorNode instanceof HTMLElement) || !colorNode.hasAttribute(OPTIMISTIC_STYLE_ATTR)) return;

    const originalStyle = colorNode.getAttribute(OPTIMISTIC_STYLE_ATTR) || '';

    if (originalStyle) {
      colorNode.setAttribute('style', originalStyle);
    } else {
      colorNode.removeAttribute('style');
    }

    colorNode.removeAttribute(OPTIMISTIC_STYLE_ATTR);
    colorNode.removeAttribute(OPTIMISTIC_STYLE_KEY_ATTR);
  }

  function getInputValue(element) {
    if (!(element instanceof HTMLElement)) return '';

    if ('value' in element) return element.value;

    const input = element.querySelector('input');
    if (input && 'value' in input) return input.value;

    return element.textContent || '';
  }

  function getFieldTitleTargets(field) {
    return [
      field,
      field.querySelector('.tt-input-color-picker__icon'),
      field.querySelector('.tt-input-color-picker__input'),
      ...field.querySelectorAll('[title]')
    ].filter((element) => element instanceof HTMLElement);
  }

  function getFieldColorCandidates(field) {
    const input = field.querySelector('.tt-input-color-picker__input');
    const iconFills = Array.from(field.querySelectorAll('.tt-input-color-picker__icon_fill'));
    const alpha = String(getInputValue(field.querySelector('.tt-input-color-picker__alpha'))).match(/\d+(\.\d+)?/)?.[0] || '';
    const inputValue = String(getInputValue(input)).replace(/^#/, '').trim();
    const candidates = [];

    iconFills.forEach((fill) => {
      candidates.push(getStyleColor(fill, 'backgroundColor'));
      candidates.push(fill.getAttribute('style'));
    });

    if (/^[\da-f]{3,8}$/i.test(inputValue)) {
      candidates.push(`#${inputValue}`);

      if (alpha) {
        const key = normalizeColorToKey(`#${inputValue}`);
        if (key) {
          const parts = key.split(',');
          candidates.push(`${parts[0]},${parts[1]},${parts[2]},${normalizeAlpha(Number(alpha) / 100)}`);
        }
      }
    }

    return candidates.filter(Boolean);
  }

  function applySwatch(swatch) {
    applyOptimisticSwatchStyle(swatch);
    applyOptimisticSwatchEditorName(swatch);

    const info = getColorInfo(getSwatchColorCandidates(swatch));
    const targets = getSwatchTitleTargets(swatch);

    if (info) {
      targets.forEach(suppressNativeTitle);
      return;
    }

    targets.forEach(restoreElementTitle);
  }

  function applyColorField(field) {
    getFieldTitleTargets(field).forEach(suppressNativeTitle);
  }

  function applyTooltips(root = document) {
    if (state.destroyed || !root) return;

    if (root instanceof HTMLElement) {
      if (root.matches(SWATCH_SELECTOR)) applySwatch(root);
      if (root.matches(FIELD_SELECTOR)) applyColorField(root);
    }

    if (!root.querySelectorAll) return;

    root.querySelectorAll(SWATCH_SELECTOR).forEach(applySwatch);
    root.querySelectorAll(FIELD_SELECTOR).forEach(applyColorField);
    applySavedColorsDetails();
  }

  function scheduleApply(root = document) {
    if (state.destroyed) return;

    window.clearTimeout(state.applyTimerId);
    state.applyTimerId = window.setTimeout(() => {
      applyTooltips(root);
      refreshActiveTooltip();
    }, APPLY_DELAY_MS);
  }

  function ensureTooltip() {
    if (state.tooltip && document.documentElement.contains(state.tooltip)) return state.tooltip;

    const tooltip = document.createElement('div');
    const name = document.createElement('div');
    const color = document.createElement('div');

    tooltip.className = TOOLTIP_CLASS;
    tooltip.setAttribute('role', 'tooltip');
    name.className = `${TOOLTIP_CLASS}__name`;
    color.className = `${TOOLTIP_CLASS}__color`;
    tooltip.append(name, color);
    document.body.append(tooltip);
    state.tooltip = tooltip;

    return tooltip;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function updateTooltipPosition() {
    const tooltip = state.tooltip;
    const element = state.activeElement;

    if (!tooltip || !element || !document.documentElement.contains(element)) {
      hideTooltip();
      return;
    }

    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const maxLeft = window.innerWidth - tooltipRect.width - VIEWPORT_MARGIN;
    const left = clamp(center - tooltipRect.width / 2, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, maxLeft));
    let top = rect.top - tooltipRect.height - TOOLTIP_GAP;
    let placement = 'top';

    if (top < VIEWPORT_MARGIN) {
      top = rect.bottom + TOOLTIP_GAP;
      placement = 'bottom';
    }

    tooltip.dataset.placement = placement;
    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
    tooltip.style.setProperty('--tt-enhancer-color-tooltip-arrow-left', `${Math.round(clamp(center - left, 10, tooltipRect.width - 10))}px`);
  }

  function showTooltip(element, info, source) {
    const shouldBlockNativeFieldTooltip = source === 'field';
    const shouldShowTooltip = info?.color && (source !== 'field' || info.name);

    document.body?.classList.toggle(FIELD_TOOLTIP_ACTIVE_CLASS, shouldBlockNativeFieldTooltip);

    if (!shouldShowTooltip) {
      state.activeElement = element;
      state.activeSource = source;
      state.tooltip?.classList.remove(`${TOOLTIP_CLASS}--visible`);
      return;
    }

    const tooltip = ensureTooltip();
    const name = tooltip.querySelector(`.${TOOLTIP_CLASS}__name`);
    const color = tooltip.querySelector(`.${TOOLTIP_CLASS}__color`);
    const showColor = source !== 'field';

    state.activeElement = element;
    state.activeSource = source;
    name.hidden = !info.name;
    name.textContent = info.name || '';
    color.hidden = !showColor;
    color.textContent = info.color;
    tooltip.classList.toggle(`${TOOLTIP_CLASS}--field`, source === 'field');
    tooltip.classList.toggle(`${TOOLTIP_CLASS}--color-only`, showColor && !info.name);
    tooltip.classList.add(`${TOOLTIP_CLASS}--visible`);

    updateTooltipPosition();
    requestAnimationFrame(updateTooltipPosition);
  }

  function hideTooltip() {
    state.activeElement = null;
    state.activeSource = '';
    state.tooltip?.classList.remove(`${TOOLTIP_CLASS}--visible`);
    document.body?.classList.remove(FIELD_TOOLTIP_ACTIVE_CLASS);
  }

  function getHoverInfo(element) {
    if (element.matches(SWATCH_SELECTOR)) {
      return {
        source: 'swatch',
        info: getColorInfo(getSwatchColorCandidates(element))
      };
    }

    if (element.matches(FIELD_SELECTOR)) {
      return {
        source: 'field',
        info: getColorInfo(getFieldColorCandidates(element))
      };
    }

    return {
      source: '',
      info: null
    };
  }

  function refreshActiveTooltip() {
    if (!state.activeElement) return;

    const { source, info } = getHoverInfo(state.activeElement);
    showTooltip(state.activeElement, info, source);
  }

  async function loadSavedColors(force = false) {
    if (state.destroyed || state.loadPromise) return state.loadPromise;

    const now = Date.now();
    if (!force && now - state.lastLoadAt < 1000) return null;

    const req = getRuntimeRequire();
    if (!req) return null;

    let request;
    try {
      request = req(API_MODULE_ID)?.M2;
    } catch {
      return null;
    }

    if (typeof request !== 'function') return null;

    state.lastLoadAt = now;
    state.loadPromise = request({ action: 'getSavedColors', cache: 'no-store' })
      .then(({ result }) => {
        state.colorNames = createColorNameMap(result);
        scheduleApply();
        refreshActiveTooltip();
      })
      .catch(() => {})
      .finally(() => {
        state.loadPromise = null;
      });

    return state.loadPromise;
  }

  function clearLoadTimers() {
    window.clearTimeout(state.loadTimerId);
    state.loadTimerId = null;
    state.loadTimerIds.forEach((timerId) => window.clearTimeout(timerId));
    state.loadTimerIds = [];
  }

  function queueLoadSavedColors(delay = LOAD_DELAY_MS, force = false) {
    if (state.destroyed) return;

    const timerId = window.setTimeout(() => {
      state.loadTimerIds = state.loadTimerIds.filter((id) => id !== timerId);
      loadSavedColors(force);
    }, delay);

    state.loadTimerIds.push(timerId);
  }

  function scheduleLoadSavedColors(delay = LOAD_DELAY_MS, force = false) {
    clearLoadTimers();
    queueLoadSavedColors(delay, force);
  }

  function scheduleSavedColorsReloadSeries() {
    clearLoadTimers();
    [180, 650, 1400, 2600].forEach((delay) => {
      queueLoadSavedColors(delay, true);
    });
  }

  function patchFetch() {
    if (state.originalFetch || typeof window.fetch !== 'function') return;

    const originalFetch = window.fetch;

    function patchedFetch(...args) {
      const savedColorRequest = getSavedColorApiRequest(args[0]);
      const result = originalFetch.apply(this, args);

      if (!savedColorRequest) return result;

      return Promise.resolve(result).then((response) => {
        if (response?.ok) {
          applySavedColorApiChange(savedColorRequest);
        }

        scheduleSavedColorsReloadSeries();
        return response;
      }, (error) => {
        scheduleSavedColorsReloadSeries();
        throw error;
      });
    }

    try {
      Object.defineProperty(patchedFetch, '__ttEnhancerColorPaletteOriginalFetch', {
        value: originalFetch
      });
    } catch {}

    state.originalFetch = originalFetch;
    window.fetch = patchedFetch;
  }

  function restoreFetch() {
    if (!state.originalFetch) return;

    if (window.fetch?.__ttEnhancerColorPaletteOriginalFetch === state.originalFetch) {
      window.fetch = state.originalFetch;
    }

    state.originalFetch = null;
  }

  function handlePointerOver(event) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const relevantElement = target.closest(HOVER_SELECTOR);
    if (!(relevantElement instanceof HTMLElement)) return;

    const { source, info } = getHoverInfo(relevantElement);
    if (source === 'field') {
      document.body?.classList.add(FIELD_TOOLTIP_ACTIVE_CLASS);
      applyColorField(relevantElement);
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    }

    loadSavedColors();
    showTooltip(relevantElement, info, source);
  }

  function handlePointerOut(event) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const relevantElement = target.closest(HOVER_SELECTOR);
    if (!(relevantElement instanceof HTMLElement)) return;

    const relatedTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (relatedTarget && relevantElement.contains(relatedTarget)) return;

    if (state.activeElement === relevantElement) hideTooltip();
  }

  function getEditorActiveSwatch(editor) {
    const wrapper = editor.closest('.tt-swatches__wrapper');
    const swatches = Array.from(wrapper?.querySelectorAll(SWATCH_SELECTOR) || []);

    return swatches.find((swatch) => {
      const className = String(swatch.className || '').toLowerCase();
      return className.includes('active');
    }) || null;
  }

  function getSwatchEditor(swatch) {
    return getSwatchesWrapper(swatch)?.querySelector('.tt-swatches-editor') || null;
  }

  function updateOptimisticColorNameFromEditor(editor, commit = false) {
    if (!(editor instanceof HTMLElement)) return false;

    const input = editor.querySelector('.tt-swatches-editor__input');
    const nameNode = editor.querySelector('.tt-swatches-editor__name');
    const name = String(input ? getInputValue(input) : nameNode?.textContent || '').trim();
    const activeSwatch = getEditorActiveSwatch(editor);

    if (!name || !activeSwatch) return false;

    const index = getSwatchIndex(activeSwatch);
    const existingSwatch = index > -1 ? state.optimisticSwatches.get(index) : null;
    const key = input
      ? setOptimisticColorName(getSwatchColorCandidates(activeSwatch, false), name)
      : existingSwatch?.key || setOptimisticColorName(getSwatchColorCandidates(activeSwatch), name);

    if (!key) return false;

    setOptimisticSwatch(index, key, name, commit);

    scheduleApply(activeSwatch);
    refreshActiveTooltip();
    return true;
  }

  function handleSwatchesEditorInput(event) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const editor = target?.closest?.('.tt-swatches-editor');

    if (editor) updateOptimisticColorNameFromEditor(editor);
  }

  function isEditorSaveControl(target, editor) {
    if (!(target instanceof HTMLElement) || !(editor instanceof HTMLElement)) return false;

    const control = target.closest('button, [role="button"], [class*="button"]');
    if (!control || !editor.contains(control)) return false;
    if (control.classList.contains('tt-swatches-editor__button')) return true;

    const text = String(control.textContent || '').trim().toLowerCase();
    return text.includes('сохран') || text.includes('save');
  }

  function handleSwatchesEditorSave(event) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const editor = target?.closest?.('.tt-swatches-editor');

    if (!editor || !isEditorSaveControl(target, editor)) return;

    updateOptimisticColorNameFromEditor(editor, true);
    scheduleSavedColorsReloadSeries();
  }

  function handleSwatchesEditorKeydown(event) {
    if (event.key !== 'Enter') return;

    const target = event.target instanceof HTMLElement ? event.target : null;
    const editor = target?.closest?.('.tt-swatches-editor');
    if (!editor?.querySelector('.tt-swatches-editor__input')) return;

    updateOptimisticColorNameFromEditor(editor, true);
    scheduleSavedColorsReloadSeries();
  }

  function handleClick(event) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    if (handleDetailsClick(event, target)) return;

    const swatch = target.closest(SWATCH_SELECTOR);
    if (swatch) queueSwatchScrollRestore(swatch);

    if (swatch && shouldBlockOptimisticSwatchNativeClick(swatch)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      applyOptimisticSwatchStyle(swatch);
      applyOptimisticSwatchEditorName(swatch);
      scheduleApply(swatch);
      refreshActiveTooltip();
      return;
    }

    if (!target.closest('.tt-color-picker, .tt-color-picker__popup, .tt-swatches__wrapper, .tt-swatches__list, .tt-swatches-editor')) return;

    if (target.closest('.tt-swatches-editor, .tt-swatches__add')) {
      scheduleSavedColorsReloadSeries();
      return;
    }

    scheduleLoadSavedColors(350, true);
  }

  function handleDetailsScroll(event) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target?.classList?.contains(DETAILS_LIST_CLASS)) return;

    rememberDetailsScrollPosition(target);
    clearScrollRestoreTimers();
  }

  function handleDetailsScrollIntent(event) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const list = getDetailsScrollContainer(target);
    if (!list) return;

    clearScrollRestoreTimers();
    rememberDetailsScrollPosition(list);
    event.stopPropagation();
  }

  function restoreAllTitles(root = document) {
    if (!root.querySelectorAll) return;

    root.querySelectorAll(`[${SUPPRESSED_TITLE_ATTR}]`).forEach(restoreElementTitle);
    root.querySelectorAll(`[${OPTIMISTIC_STYLE_ATTR}]`).forEach(restoreOptimisticSwatchStyle);
  }

  function isSavedSwatchesMutationTarget(element) {
    return !!element?.closest?.('.tt-swatches-editor, .tt-swatches__list');
  }

  function hasSavedSwatchNodes(nodes) {
    return Array.from(nodes).some((node) => {
      if (!(node instanceof HTMLElement)) return false;

      return node.matches(SWATCH_SELECTOR) || !!node.querySelector(SWATCH_SELECTOR);
    });
  }

  state.observer = new MutationObserver((mutations) => {
    let shouldReloadSavedColors = false;

    mutations.forEach((mutation) => {
      const targetElement = mutation.target instanceof HTMLElement
        ? mutation.target
        : mutation.target?.parentElement;

      if (isDetailsUiElement(targetElement)) return;

      const editor = targetElement?.closest?.('.tt-swatches-editor');

      if (editor) {
        const swatch = getEditorActiveSwatch(editor);
        if (swatch) applyOptimisticSwatchEditorName(swatch);
      }

      if (targetElement?.closest?.('.tt-swatches-editor__name')) {
        updateOptimisticColorNameFromEditor(editor);
        const swatch = getEditorActiveSwatch(editor);
        if (swatch) applyOptimisticSwatchEditorName(swatch);
      }

      if (mutation.type === 'attributes') {
        const target = targetElement;
        if (!target) return;

        const relevantElement = target.closest(HOVER_SELECTOR);
        if (relevantElement) {
          scheduleApply(relevantElement);

          if (relevantElement.matches(SWATCH_SELECTOR)) {
            const editor = getSwatchEditor(relevantElement);
            if (editor?.querySelector('.tt-swatches-editor__input')) {
              updateOptimisticColorNameFromEditor(editor);
            }
          }
        }

        return;
      }

      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement && !isDetailsUiElement(node)) scheduleApply(node);
      });

      const target = targetElement;
      if (isSavedSwatchesMutationTarget(target) || hasSavedSwatchNodes(mutation.addedNodes)) {
        shouldReloadSavedColors = true;
      }
    });

    if (shouldReloadSavedColors) {
      scheduleSavedColorsReloadSeries();
    }
  });

  state.observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
    attributeFilter: ['title', 'style', 'class', 'value', 'data-color']
  });

  document.addEventListener('pointerover', handlePointerOver, true);
  document.addEventListener('mouseover', handlePointerOver, true);
  document.addEventListener('pointerout', handlePointerOut, true);
  document.addEventListener('mouseout', handlePointerOut, true);
  document.addEventListener('input', handleSwatchesEditorInput, true);
  document.addEventListener('change', handleSwatchesEditorInput, true);
  document.addEventListener('keydown', handleSwatchesEditorKeydown, true);
  document.addEventListener('pointerdown', handleSwatchesEditorSave, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('scroll', handleDetailsScroll, true);
  document.addEventListener('wheel', handleDetailsScrollIntent, true);
  document.addEventListener('touchmove', handleDetailsScrollIntent, true);
  window.addEventListener('scroll', updateTooltipPosition, true);
  window.addEventListener('resize', updateTooltipPosition);

  state.refreshIntervalId = window.setInterval(() => {
    loadSavedColors();
  }, REFRESH_INTERVAL_MS);

  window[FEATURE_KEY] = {
    apply: applyTooltips,
    reload() {
      return loadSavedColors(true);
    },
    destroy() {
      state.destroyed = true;
      window.clearTimeout(state.applyTimerId);
      clearScrollRestoreTimers();
      clearLoadTimers();
      window.clearInterval(state.refreshIntervalId);
      state.observer?.disconnect?.();
      document.removeEventListener('pointerover', handlePointerOver, true);
      document.removeEventListener('mouseover', handlePointerOver, true);
      document.removeEventListener('pointerout', handlePointerOut, true);
      document.removeEventListener('mouseout', handlePointerOut, true);
      document.removeEventListener('input', handleSwatchesEditorInput, true);
      document.removeEventListener('change', handleSwatchesEditorInput, true);
      document.removeEventListener('keydown', handleSwatchesEditorKeydown, true);
      document.removeEventListener('pointerdown', handleSwatchesEditorSave, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('scroll', handleDetailsScroll, true);
      document.removeEventListener('wheel', handleDetailsScrollIntent, true);
      document.removeEventListener('touchmove', handleDetailsScrollIntent, true);
      window.removeEventListener('scroll', updateTooltipPosition, true);
      window.removeEventListener('resize', updateTooltipPosition);
      restoreFetch();
      hideTooltip();
      state.tooltip?.remove();
      restoreDetailsUi();
      restoreAllTitles();
    }
  };

  patchFetch();
  loadSavedColors(true);
  applyTooltips();
})();
