(function () {
  const FEATURE_KEY = '__tt_enhancer_dvh_height_unit__';
  const EXTRA_UNITS = ['dvh', 'svh', 'lvh', 'vmin', 'vmax', 'ch'];
  const NATIVE_LENGTH_UNITS = ['px', '%', 'em', 'rem', 'vw', 'vh'];
  const EDITOR_UNIT_VALUES = [...NATIVE_LENGTH_UNITS, ...EXTRA_UNITS];
  const UNIT_VALUES = new Set([...EDITOR_UNIT_VALUES, 'auto', 'none', 'normal']);
  const USE_NATIVE_STYLE_CONTROLS = true;
  const SIZE_PROPERTY_BY_LABEL = {
    'Шир.': 'width',
    'W': 'width',
    'Width': 'width',
    'Выс.': 'height',
    'H': 'height',
    'Height': 'height',
    'Мин Ш': 'min-width',
    'Min W': 'min-width',
    'Min Width': 'min-width',
    'Мин В': 'min-height',
    'Min H': 'min-height',
    'Min Height': 'min-height',
    'Макс Ш': 'max-width',
    'Max W': 'max-width',
    'Max Width': 'max-width',
    'Макс В': 'max-height',
    'Max H': 'max-height',
    'Max Height': 'max-height'
  };
  const POSITION_PROPERTY_BY_TITLE = {
    'Сдвинуть вверх': 'top',
    'Edit position Top': 'top',
    'Сдвинуть вправо': 'right',
    'Edit position Right': 'right',
    'Сдвинуть вниз': 'bottom',
    'Edit position Bottom': 'bottom',
    'Сдвинуть влево': 'left',
    'Edit position Left': 'left'
  };
  const POSITION_TITLE_BY_PROPERTY = {
    top: 'Сдвинуть вверх',
    right: 'Сдвинуть вправо',
    bottom: 'Сдвинуть вниз',
    left: 'Сдвинуть влево'
  };
  const POSITION_PROPERTY_BY_SIDE = {
    top: 'top',
    right: 'right',
    bottom: 'bottom',
    left: 'left'
  };
  const SPACING_PROPERTIES_BY_ICON = {
    'medium-margin-all': ['margin'],
    'medium-margin-left': ['margin-left'],
    'medium-margin-top': ['margin-top'],
    'medium-margin-right': ['margin-right'],
    'medium-margin-bottom': ['margin-bottom'],
    'medium-margin-left-right': ['margin-left', 'margin-right'],
    'medium-margin-top-bottom': ['margin-top', 'margin-bottom'],
    'medium-padding-left': ['padding-left'],
    'medium-padding-top': ['padding-top'],
    'medium-padding-right': ['padding-right'],
    'medium-padding-bottom': ['padding-bottom'],
    'medium-padding-left-right': ['padding-left', 'padding-right'],
    'medium-padding-top-bottom': ['padding-top', 'padding-bottom'],
    'medium-padding-all': ['padding'],
    'medium-gap-horizontal': ['column-gap'],
    'medium-gap-vertical': ['row-gap']
  };
  const TEXT_PROPERTIES_BY_ICON = {
    'medium-text-styles-size': ['font-size']
  };
  const BORDER_RADIUS_PROPERTIES = [
    'border-top-left-radius',
    'border-top-right-radius',
    'border-bottom-left-radius',
    'border-bottom-right-radius'
  ];
  const BORDER_RADIUS_PROPERTY_BY_ICON = {
    'medium-radius-all-top-left': 'border-top-left-radius',
    'medium-radius-top-right': 'border-top-right-radius',
    'medium-radius-bottom-left': 'border-bottom-left-radius',
    'medium-radius-bottom-right': 'border-bottom-right-radius'
  };
  const SUPPORTED_CUSTOM_STYLE_PROPERTIES = new Set([
    ...Object.values(SIZE_PROPERTY_BY_LABEL),
    ...Object.values(POSITION_PROPERTY_BY_TITLE),
    ...Object.values(SPACING_PROPERTIES_BY_ICON).flat(),
    ...Object.values(TEXT_PROPERTIES_BY_ICON).flat(),
    ...BORDER_RADIUS_PROPERTIES,
    'border-radius',
    'gap'
  ]);
  const SELECTOR_COLLECTION_KEYS = [
    'selectorCollection',
    'mainSelectorCollection',
    'designSelectorCollection',
    'cmSelectorCollection',
    'animationSelectorCollection',
    'defaultSelectorCollection'
  ];
  const CUSTOM_STYLE_TITLE_TEXTS = ['Пользовательские свойства', 'Custom Properties'];
  const CUSTOM_UNIT_REMOVAL_TTL_MS = 3000;

  if (window[FEATURE_KEY]) return;
  window[FEATURE_KEY] = true;

  let lastStyleUnitControl = null;
  let lastHandledAt = 0;
  let lastUnlockedUnitPickerInteractionAt = 0;
  const positionCustomUnits = new Map();
  const unlockedCustomUnitInputs = new WeakMap();
  const inlineCustomUnitControls = new WeakMap();
  const patchedTaptopRuntimes = new WeakSet();
  const patchedTaptopSelectors = new WeakSet();
  const patchedTaptopSelectorCollections = new WeakSet();
  const knownTaptopSelectorCollections = [];
  const taptopRuntimeBySelector = new WeakMap();
  const taptopSelectorIds = new WeakMap();
  const customUnitState = new Map();
  const removedCustomUnitProperties = new Map();
  const styleControlSyncTimers = new WeakMap();
  let positionDragLoop = null;
  let activeCustomUnitEditor = null;
  let nativeLengthApplyToken = 0;
  let customStyleRefreshTimer = null;
  let pendingCustomStyleRefreshRoot = null;
  let lastCustomStyleRefreshAt = 0;
  let nextTaptopSelectorId = 1;
  let patchAllListsScheduled = false;

  function installPositionSliderStyles() {
    if (document.getElementById('tt-enhancer-position-slider-style')) return;

    const style = document.createElement('style');
    style.id = 'tt-enhancer-position-slider-style';
    style.textContent = `
      .tt-enhancer-position-slider {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        cursor: pointer;
        appearance: none;
        background: transparent;
        z-index: 2;
      }
      .tt-enhancer-position-slider::-webkit-slider-runnable-track {
        height: 4px;
        border-radius: 999px;
        background: linear-gradient(90deg, #2f8cff var(--tt-enhancer-slider-progress, 50%), #e8e8e8 var(--tt-enhancer-slider-progress, 50%));
      }
      .tt-enhancer-position-slider::-webkit-slider-thumb {
        appearance: none;
        width: 18px;
        height: 18px;
        margin-top: -7px;
        border: 0;
        border-radius: 50%;
        background: #2f8cff;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function installCustomUnitEditorStyles() {
    if (document.getElementById('tt-enhancer-custom-unit-editor-style')) return;

    const style = document.createElement('style');
    style.id = 'tt-enhancer-custom-unit-editor-style';
    style.textContent = `
      .tt-enhancer-custom-unit-editor {
        display: inline-flex;
        align-items: center;
        min-width: 0;
        max-width: 100%;
        vertical-align: middle;
        gap: 6px;
      }
      .tt-enhancer-custom-unit-editor--inline {
        display: inline-flex !important;
        min-width: 0;
      }
      .tt-enhancer-custom-unit-editor__group {
        display: inline-flex;
        align-items: center;
        min-width: 0;
        gap: 6px;
      }
      .tt-custom-disable-item[data-tt-enhancer-custom-unit-mounted="1"] {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        width: auto;
        min-width: 0;
        max-width: 100%;
        pointer-events: auto;
      }
      .tt-custom-disable-item[data-tt-enhancer-custom-unit-mounted="1"] .tt-custom-disable-item__label {
        flex: 0 0 auto;
      }
      .tt-custom-disable-item[data-tt-enhancer-custom-unit-mounted="1"] .tt-custom-disable-item__value {
        display: inline-flex;
        align-items: center;
        flex: 0 1 auto;
        min-width: 0;
        max-width: 106px;
        padding: 0;
        background: transparent;
        overflow: visible;
        white-space: nowrap;
        text-overflow: clip;
        pointer-events: auto;
      }
      .tt-custom-disable-item[data-tt-enhancer-custom-unit-mounted="1"] .tt-enhancer-custom-unit-editor {
        flex: 0 1 auto;
      }
      .tt-custom-disable-item[data-tt-enhancer-custom-unit-mounted="1"] .tt-enhancer-custom-unit-editor__group {
        display: inline-flex;
        width: auto;
        gap: 4px;
      }
      .tt-enhancer-custom-unit-editor__number,
      .tt-enhancer-custom-unit-editor__unit {
        box-sizing: border-box;
        height: 32px;
        min-width: 0;
        border: 0;
        border-radius: 6px;
        outline: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        line-height: 32px;
      }
      .tt-enhancer-custom-unit-editor__number {
        width: 42px;
        padding: 0;
        text-align: right;
      }
      .tt-enhancer-custom-unit-editor__unit-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 38px;
        width: auto;
        max-width: 58px;
        padding: 0 10px 0 0;
        position: relative;
        cursor: pointer;
        border: 0;
        border-radius: 0;
        appearance: none;
        background: transparent;
        color: inherit;
        font: inherit;
        line-height: 32px;
      }
      .tt-enhancer-custom-unit-editor__unit-button::after {
        content: "";
        position: absolute;
        right: 0;
        top: 50%;
        width: 6px;
        height: 6px;
        border-right: 1px solid currentColor;
        border-bottom: 1px solid currentColor;
        opacity: 0.45;
        transform: translateY(-65%) rotate(45deg);
      }
      .tt-enhancer-custom-unit-editor__unit {
        display: block;
        max-width: 48px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .tt-enhancer-custom-unit-editor__number::selection {
        background: #b8d8ff;
      }
      .tt-enhancer-custom-unit-editor-popup {
        z-index: 2147483647;
      }
      .tt-enhancer-custom-unit-editor-popup .tt-input-picker-list {
        min-width: 72px;
      }
      .tt-enhancer-custom-unit-editor-popup .tt-input-picker-option {
        width: 100%;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function installDvhValidatorPatch() {
    if (window.__tt_enhancer_dvh_regexp_patch__) return;
    window.__tt_enhancer_dvh_regexp_patch__ = true;

    const NativeRegExp = window.RegExp;
    const nativeExec = NativeRegExp.prototype.exec;
    const UNIT_PATTERN = 'px|em|rem|%|vw|vh';
    const PATCHED_UNIT_PATTERN = `${UNIT_PATTERN}|${EXTRA_UNITS.join('|')}`;

    function patchPattern(pattern) {
      if (typeof pattern !== 'string' || !pattern.includes(UNIT_PATTERN)) return pattern;
      return pattern.replaceAll(UNIT_PATTERN, PATCHED_UNIT_PATTERN);
    }

    function PatchedRegExp(pattern, flags) {
      if (pattern instanceof NativeRegExp) return new NativeRegExp(pattern, flags);
      return new NativeRegExp(patchPattern(pattern), flags);
    }

    Object.setPrototypeOf(PatchedRegExp, NativeRegExp);
    PatchedRegExp.prototype = NativeRegExp.prototype;
    Object.defineProperty(PatchedRegExp.prototype, 'constructor', {
      value: PatchedRegExp,
      configurable: true,
      writable: true
    });

    NativeRegExp.prototype.exec = function (value) {
      const result = nativeExec.call(this, value);
      if (result || typeof value !== 'string' || !EXTRA_UNITS.some((unit) => value.includes(unit))) return result;

      const source = this.source.replaceAll('\\/', '/');
      if (!source.includes(UNIT_PATTERN)) return result;

      try {
        const patched = new NativeRegExp(patchPattern(source), this.flags);
        return nativeExec.call(patched, value);
      } catch {
        return result;
      }
    };

    window.RegExp = PatchedRegExp;

    installUnitArrayPatch();
  }

  function isSizeUnitArray(array) {
    return (
      Array.isArray(array) &&
      array.indexOf('px') !== -1 &&
      array.indexOf('%') !== -1 &&
      array.indexOf('em') !== -1 &&
      array.indexOf('rem') !== -1 &&
      array.indexOf('vw') !== -1 &&
      array.indexOf('vh') !== -1 &&
      EXTRA_UNITS.every((unit) => array.indexOf(unit) === -1)
    );
  }

  function withDvhUnit(array) {
    if (!isSizeUnitArray(array)) return array;
    const next = array.slice();
    next.splice(next.indexOf('vh') + 1, 0, ...EXTRA_UNITS);
    return next;
  }

  function installUnitArrayPatch() {
    if (window.__tt_enhancer_dvh_array_patch__) return;
    window.__tt_enhancer_dvh_array_patch__ = true;

    const nativeMap = Array.prototype.map;

    Array.prototype.map = function (callback, thisArg) {
      return nativeMap.call(withDvhUnit(this), callback, thisArg);
    };
  }

  function getInputSetter(input) {
    const own = Object.getOwnPropertyDescriptor(input, 'value');
    const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    return own && own.set ? own.set : proto && proto.set;
  }

  function setInputValue(input, value) {
    const setter = getInputSetter(input);
    if (setter) setter.call(input, value);
    else input.value = value;

    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    notifyReactInputChange(input, value);
  }

  function setInputDisplayValue(input, value) {
    if (!input || input.value === value) return;
    const setter = getInputSetter(input);
    if (setter) setter.call(input, value);
    else input.value = value;
  }

  function isSizeItem(item) {
    const label = item?.querySelector('.tt-input-text__label');
    return Boolean(SIZE_PROPERTY_BY_LABEL[(label?.textContent || '').trim()]);
  }

  function getSizeUnitControl(from) {
    const item = from?.closest?.('.tt-styles-size__item');
    if (!item || !isSizeItem(item)) return null;

    const picker = item.querySelector('.tt-input-picker');
    const label = (item.querySelector('.tt-input-text__label')?.textContent || '').trim();
    const inputs = Array.from(item.querySelectorAll('input.tt-input-text__input, input'));
    const valueInput = inputs.find((input) => !picker?.contains(input));

    if (!picker || !valueInput) return null;
    return {
      kind: 'size',
      key: label,
      picker,
      valueInput,
      properties: [SIZE_PROPERTY_BY_LABEL[label]]
    };
  }

  function getIconNames(container) {
    return Array.from(container?.querySelectorAll?.('svg.tt-icon') || []).flatMap((icon) => {
      const classNames = String(icon.getAttribute('class') || '').split(/\s+/);
      const href = icon.querySelector('use')?.getAttribute('xlink:href') || icon.querySelector('use')?.getAttribute('href') || '';
      const id = href.includes('#') ? href.slice(href.indexOf('#') + 1) : '';
      return classNames.concat(id).filter(Boolean);
    });
  }

  function getIconUnitControl(from, selector, kind) {
    const item = from?.closest?.(selector);
    const picker = from?.closest?.('.tt-input-picker');
    if (!item || !picker || !item.contains(picker)) return null;

    const iconName = getIconNames(item).find((name) => SPACING_PROPERTIES_BY_ICON[name]);
    const properties = SPACING_PROPERTIES_BY_ICON[iconName];
    const inputs = Array.from(item.querySelectorAll('input.tt-input-text__input, input'));
    const valueInput = inputs.find((input) => !picker.contains(input));

    if (!properties || !valueInput) return null;
    return {
      kind,
      key: iconName,
      picker,
      valueInput,
      properties
    };
  }

  function getSpacingUnitControl(from) {
    return getIconUnitControl(from, '.tt-spacing__item', 'spacing');
  }

  function getGapUnitControl(from) {
    return getIconUnitControl(from, '.tt-gap-grid__item', 'gap');
  }

  function getInputGroupLengthControl(from, kind, key, properties) {
    const group = from?.closest?.('.tt-input-group');
    if (!group) return null;

    const picker = group.querySelector('.tt-input-picker');
    const inputs = Array.from(group.querySelectorAll('input.tt-input-text__input, input'));
    const valueInput = inputs.find((input) => !picker?.contains(input));

    if (!picker || !valueInput || !properties?.length) return null;
    return {
      kind,
      key,
      picker,
      valueInput,
      properties
    };
  }

  function getFontSizeUnitControl(from) {
    const group = from?.closest?.('.tt-input-group');
    if (!group || !getIconNames(group).some((name) => TEXT_PROPERTIES_BY_ICON[name])) return null;

    const iconName = getIconNames(group).find((name) => TEXT_PROPERTIES_BY_ICON[name]);
    return getInputGroupLengthControl(group, 'font-size', iconName, TEXT_PROPERTIES_BY_ICON[iconName]);
  }

  function getBorderRadiusUnitControl(from) {
    const group = from?.closest?.('.tt-border-radius__common__input, .tt-border-radius__corner__input');
    if (!group) return null;

    if (group.classList.contains('tt-border-radius__common__input')) {
      return getInputGroupLengthControl(group, 'radius', 'border-radius-common', BORDER_RADIUS_PROPERTIES);
    }

    const iconName = getIconNames(group).find((name) => BORDER_RADIUS_PROPERTY_BY_ICON[name]);
    const property = BORDER_RADIUS_PROPERTY_BY_ICON[iconName];
    return getInputGroupLengthControl(group, 'radius', iconName || property, property ? [property] : []);
  }

  function getPositionPropertyByTitle(title) {
    return POSITION_PROPERTY_BY_TITLE[String(title || '').trim()] || null;
  }

  function getPositionPropertyByEditor(element) {
    const editor = element?.closest?.('.tt-styles-position__indent-editor');
    if (!editor) return null;

    const sideClass = Array.from(editor.classList || []).find((className) => (
      className.startsWith('tt-styles-position__indent-editor--') ||
      className.startsWith('tt-styles-indent-editor--side-')
    ));
    const side = sideClass?.replace(/^tt-styles-position__indent-editor--/, '').replace(/^tt-styles-indent-editor--side-/, '');
    return POSITION_PROPERTY_BY_SIDE[side] || null;
  }

  function getPositionUnitControl(from) {
    const picker = from?.closest?.('.tt-input-picker');
    const popup = from?.closest?.('.tt-popup');
    if (!picker || !popup || !popup.contains(picker)) return null;

    const title = (popup.querySelector('.tt-popup__title')?.textContent || '').trim();
    const property = getPositionPropertyByTitle(title);
    const inputGroup = picker.closest('.tt-styles-indent-editor__popup__input');
    const inputs = Array.from(inputGroup?.querySelectorAll?.('input.tt-input-text__input, input') || []);
    const valueInput = inputs.find((input) => !picker.contains(input));

    if (!property || !valueInput) return null;
    return {
      kind: 'position',
      key: title,
      popup,
      picker,
      valueInput,
      properties: [property]
    };
  }

  function getInlinePositionUnitControl(from) {
    const editor = from?.closest?.('.tt-styles-position__indent-editor');
    if (!editor || editor.closest('.tt-popup')) return null;

    const property = getPositionPropertyByEditor(editor);
    const valueInput = Array.from(editor.querySelectorAll('input.tt-input-text__input, input'))
      .find((input) => !input.closest('.tt-input-picker'));

    if (!property || !valueInput) return null;
    return {
      kind: 'position',
      key: POSITION_TITLE_BY_PROPERTY[property] || property,
      valueInput,
      picker: null,
      properties: [property]
    };
  }

  function getStyleUnitControl(from) {
    return getSizeUnitControl(from) ||
      getSpacingUnitControl(from) ||
      getGapUnitControl(from) ||
      getFontSizeUnitControl(from) ||
      getBorderRadiusUnitControl(from) ||
      getPositionUnitControl(from) ||
      getInlinePositionUnitControl(from);
  }

  function getStyleUnitControlForElement(element) {
    const direct = getStyleUnitControl(element);
    if (direct) return direct;

    const spacingItem = element?.closest?.('.tt-spacing__item');
    const spacingPicker = spacingItem?.querySelector?.('.tt-input-picker');
    if (spacingPicker) {
      const control = getSpacingUnitControl(spacingPicker);
      if (control) return control;
    }

    const gapItem = element?.closest?.('.tt-gap-grid__item');
    const gapPicker = gapItem?.querySelector?.('.tt-input-picker');
    if (gapPicker) {
      const control = getGapUnitControl(gapPicker);
      if (control) return control;
    }

    const positionInputGroup = element?.closest?.('.tt-styles-indent-editor__popup__input');
    const positionPicker = positionInputGroup?.querySelector?.('.tt-input-picker');
    if (positionPicker) {
      const control = getPositionUnitControl(positionPicker);
      if (control) return control;
    }

    return null;
  }

  function findSizeUnitControlByKey(label) {
    const items = Array.from(document.querySelectorAll('.tt-styles-size__item'));
    const normalizedLabel = String(label || '').trim();
    const property = SIZE_PROPERTY_BY_LABEL[normalizedLabel];
    const item = items.find((item) => {
      const itemLabel = (item.querySelector('.tt-input-text__label')?.textContent || '').trim();
      return itemLabel === normalizedLabel || (property && SIZE_PROPERTY_BY_LABEL[itemLabel] === property);
    });
    return item ? getSizeUnitControl(item) : null;
  }

  function findSpacingUnitControlByKey(iconName) {
    const items = Array.from(document.querySelectorAll('.tt-spacing__item'));
    const item = items.find((item) => getIconNames(item).includes(iconName));
    const picker = item?.querySelector('.tt-input-picker');
    return picker ? getSpacingUnitControl(picker) : null;
  }

  function findGapUnitControlByKey(iconName) {
    const items = Array.from(document.querySelectorAll('.tt-gap-grid__item'));
    const item = items.find((item) => getIconNames(item).includes(iconName));
    const picker = item?.querySelector('.tt-input-picker');
    return picker ? getGapUnitControl(picker) : null;
  }

  function findFontSizeUnitControlByKey(key) {
    const controls = Array.from(document.querySelectorAll('.tt-input-group'))
      .map((group) => getFontSizeUnitControl(group))
      .filter(Boolean);
    return controls.find((control) => control.key === key) || controls[0] || null;
  }

  function hasSameProperties(left = [], right = []) {
    return left.length === right.length && left.every((property) => right.includes(property));
  }

  function findBorderRadiusUnitControlByKey(key, properties = []) {
    const controls = Array.from(document.querySelectorAll('.tt-border-radius__common__input, .tt-border-radius__corner__input'))
      .map((group) => getBorderRadiusUnitControl(group))
      .filter(Boolean);
    return controls.find((control) => control.key === key) ||
      controls.find((control) => hasSameProperties(control.properties, properties)) ||
      null;
  }

  function findPositionUnitControlByKey(title) {
    const popups = Array.from(document.querySelectorAll('.tt-popup'));
    const property = getPositionPropertyByTitle(title) || POSITION_PROPERTY_BY_SIDE[String(title || '').trim()];
    const popup = popups.find((popup) => {
      const popupTitle = (popup.querySelector('.tt-popup__title')?.textContent || '').trim();
      return popupTitle === title || (property && getPositionPropertyByTitle(popupTitle) === property);
    });
    const picker = popup?.querySelector('.tt-styles-indent-editor__popup__input .tt-input-picker');
    return picker ? getPositionUnitControl(picker) : null;
  }

  function findOpenPositionUnitControl() {
    const popups = Array.from(document.querySelectorAll('.tt-popup'));
    for (const popup of popups) {
      const title = (popup.querySelector('.tt-popup__title')?.textContent || '').trim();
      if (!getPositionPropertyByTitle(title)) continue;

      const picker = popup.querySelector('.tt-styles-indent-editor__popup__input .tt-input-picker');
      const control = picker ? getPositionUnitControl(picker) : null;
      if (control) return control;
    }
    return null;
  }

  function resolveStyleUnitControl() {
    const control = lastStyleUnitControl;
    if (!control) return findOpenPositionUnitControl();

    if (
      control.picker &&
      control.valueInput &&
      document.contains(control.picker) &&
      document.contains(control.valueInput)
    ) {
      return control;
    }

    const next = control.kind === 'size'
      ? findSizeUnitControlByKey(control.key)
      : control.kind === 'gap'
        ? findGapUnitControlByKey(control.key)
        : control.kind === 'position'
          ? findPositionUnitControlByKey(control.key)
          : findSpacingUnitControlByKey(control.key);

    if (next) lastStyleUnitControl = next;
    return next;
  }

  function rememberStyleUnitPicker(event) {
    if (event.target?.closest?.('.tt-enhancer-custom-unit-editor, .tt-enhancer-custom-unit-editor-popup')) return;

    const control = getStyleUnitControl(event.target);
    if (control) {
      lastStyleUnitControl = control;
      ensureReactPickerHasDvh();
    } else if (event.target?.closest?.('.tt-input-picker')) {
      lastStyleUnitControl = null;
    }
  }

  function getUnitInput() {
    const picker = resolveStyleUnitControl()?.picker;
    if (!picker || !document.contains(picker)) return null;
    return picker.querySelector('input.tt-input-text__input, input');
  }

  function getUnitInputForControl(control) {
    const picker = control?.picker;
    if (!picker || !document.contains(picker)) return null;
    return picker.querySelector('input.tt-input-text__input, input');
  }

  function getExtraUnitButton(from) {
    if (from?.closest?.('.tt-enhancer-custom-unit-editor, .tt-enhancer-custom-unit-editor-popup')) return null;

    const markedButton = from?.closest?.('[data-tt-enhancer-unit]');
    if (markedButton) return markedButton;

    const option = from?.closest?.('.tt-input-picker-option');
    const unit = (option?.querySelector('.tt-input-picker-option__value')?.textContent || '').trim();
    if (!EXTRA_UNITS.includes(unit)) return null;

    const control = findOpenPositionUnitControl() || resolveStyleUnitControl();
    if (!control) return null;

    lastStyleUnitControl = control;
    option.dataset.ttEnhancerUnit = unit;
    return option;
  }

  function getPickerOptionUnit(from) {
    const option = from?.closest?.('.tt-input-picker-option');
    return (option?.querySelector('.tt-input-picker-option__value')?.textContent || '').trim();
  }

  function getExtraUnitPartsForControl(control, root) {
    if (!control?.properties?.length) return null;

    const propertyParts = getCustomStyleExtraUnitPartsForControl(control, root);
    if (propertyParts) return propertyParts;

    return getExtraUnitValueParts(control.valueInput?.value) ||
      findExtraUnitValueParts(control.valueInput?.value) ||
      null;
  }

  function getCustomStyleExtraUnitPartsForControl(control, root) {
    if (!control?.properties?.length) return null;

    if (control.kind === 'radius' && control.properties.length > 1) {
      const values = control.properties
        .map((property) => getExtraUnitValueParts(getPropertyCssValue(property, root)))
        .filter(Boolean);
      if (values.length !== control.properties.length) return null;

      const first = values[0];
      const sameValue = values.every((value) => (
        value.number === first.number &&
        value.unit.toLowerCase() === first.unit.toLowerCase()
      ));
      return sameValue ? first : null;
    }

    for (const property of control.properties) {
      const parts = getExtraUnitValueParts(getPropertyCssValue(property, root));
      if (parts) return parts;
    }

    return null;
  }

  function getNativeLengthPartsForControl(control, root) {
    if (!control?.properties?.length) return null;

    for (const property of control.properties) {
      const parts = getStyleValueParts(getPropertyCssValue(property, root));
      if (parts && isNativeLengthUnit(parts.unit)) return parts;
    }

    return null;
  }

  function getNativeLengthUnitButton(from) {
    if (from?.closest?.('.tt-enhancer-custom-unit-editor, .tt-enhancer-custom-unit-editor-popup')) return null;

    const option = from?.closest?.('.tt-input-picker-option');
    const unit = getPickerOptionUnit(from).toLowerCase();
    if (!option || !isNativeLengthUnit(unit)) return null;

    const control = findOpenPositionUnitControl() || resolveStyleUnitControl();
    if (!control?.valueInput || !document.contains(control.valueInput)) return null;

    const hasExtraUnit = getSelectedExtraUnitForControl(control) ||
      getRememberedCustomUnitForControl(control, option) ||
      getExtraUnitPartsForControl(control, option) ||
      hasCustomStylePropertiesViaTaptop(control.properties, option);
    if (!hasExtraUnit) return null;

    lastStyleUnitControl = control;
    option.dataset.ttEnhancerNativeUnit = unit;
    return option;
  }

  function getReactFiber(node) {
    if (!node) return null;
    const key = Object.keys(node).find((name) => (
      name.startsWith('__reactFiber$') ||
      name.startsWith('__reactInternalInstance$')
    ));
    return key ? node[key] : null;
  }

  function getReactProps(node) {
    if (!node) return null;
    const key = Object.keys(node).find((name) => name.startsWith('__reactProps$'));
    return key ? node[key] : null;
  }

  function forceReactUpdateNear(root) {
    const roots = [
      root,
      getCustomStyleRoot(),
      getCustomStyleBlock(),
      document.querySelector('.tt-styles-panel'),
      document.querySelector('.right-panel-popup')
    ].filter(Boolean);
    const seen = new WeakSet();
    let updated = false;

    roots.forEach((node) => {
      let fiber = getReactFiber(node);
      let depth = 0;
      while (fiber && depth < 14) {
        const instance = fiber.stateNode;
        if (
          instance &&
          typeof instance === 'object' &&
          !seen.has(instance) &&
          typeof instance.forceUpdate === 'function'
        ) {
          seen.add(instance);
          try {
            instance.forceUpdate();
            updated = true;
          } catch {}
        }
        fiber = fiber.return;
        depth += 1;
      }
    });

    return updated;
  }

  function scheduleCustomStylePanelRefresh(root) {
    pendingCustomStyleRefreshRoot = root || pendingCustomStyleRefreshRoot;
    if (customStyleRefreshTimer) return;

    const now = Date.now();
    const delay = now - lastCustomStyleRefreshAt > 140 ? 0 : 140;
    customStyleRefreshTimer = setTimeout(() => {
      customStyleRefreshTimer = null;
      lastCustomStyleRefreshAt = Date.now();
      const refreshRoot = pendingCustomStyleRefreshRoot || root;
      pendingCustomStyleRefreshRoot = null;
      forceReactUpdateNear(refreshRoot);
    }, delay);
  }

  function sanitizeCssValue(value) {
    const openParen = String.fromCharCode(40);
    const closeParen = String.fromCharCode(41);
    let depth = 0;
    let next = '';

    for (const char of String(value || '')) {
      if (char === openParen) depth += 1;
      else if (char === closeParen) {
        if (depth === 0) continue;
        depth -= 1;
      }
      next += char;
    }

    return next + closeParen.repeat(depth);
  }

  function getTaptopSelectorFromValue(value) {
    if (!value || typeof value !== 'object') return null;
    if (value.runtime?.selector?.setCSS) return value.runtime.selector;
    if (value.selector?.setCSS) return value.selector;
    if (value.setCSS && value.removeCSS && value.getCSS) return value;
    return null;
  }

  function getTaptopRuntimeFromValue(value) {
    if (!value || typeof value !== 'object') return null;
    if (value.runtime?.getCustomProps && value.runtime?.props && 'selector' in value.runtime) return value.runtime;
    if (value.getCustomProps && value.props && 'selector' in value) return value;
    return null;
  }

  function getTaptopSelectorCollectionFromValue(value) {
    if (!value || typeof value !== 'object') return null;
    if (value.selectorCollection?.list && value.selectorCollection?.getSelector) return value.selectorCollection;
    if (value.list && value.getSelector && (value.findSelector || value.sortedList)) return value;
    return null;
  }

  function getTaptopSelectorCollectionsFromValue(value) {
    if (!value || typeof value !== 'object') return [];

    const collections = [];
    const directCollection = getTaptopSelectorCollectionFromValue(value);
    if (directCollection) collections.push(directCollection);

    SELECTOR_COLLECTION_KEYS.forEach((key) => {
      const collection = value[key];
      if (collection?.list && collection?.getSelector) collections.push(collection);
    });

    return collections.filter((collection, index) => collections.indexOf(collection) === index);
  }

  function collectTaptopSelectorCollections(root, maxDepth = 4, maxVisits = 700) {
    const seen = new WeakSet();
    const seenCollections = new WeakSet();
    const collections = [];
    const stack = [{ value: root, depth: 0 }];
    let visits = 0;

    while (stack.length && visits < maxVisits) {
      const { value, depth } = stack.pop();
      if (!value || typeof value !== 'object' || seen.has(value)) continue;
      seen.add(value);
      visits += 1;

      getTaptopSelectorCollectionsFromValue(value).forEach((collection) => {
        if (!collection || seenCollections.has(collection)) return;
        seenCollections.add(collection);
        collections.push(collection);
      });

      if (depth >= maxDepth || value === window || value === document || value instanceof Node) continue;

      let values;
      try {
        values = Object.values(value);
      } catch {
        continue;
      }

      values.forEach((item) => {
        if (item && typeof item === 'object') stack.push({ value: item, depth: depth + 1 });
      });
    }

    return collections;
  }

  function normalizeCssPropertyName(value) {
    const property = String(value || '')
      .trim()
      .replace(/_/g, '-')
      .replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)
      .toLowerCase();
    return SUPPORTED_CUSTOM_STYLE_PROPERTIES.has(property) ? property : '';
  }

  function getMatchingExtraUnitRawValue(value, parts) {
    const raw = String(value || '').trim();
    const rawParts = getExtraUnitValueParts(raw);
    if (!rawParts) return '';

    return rawParts.number === parts.number && rawParts.unit.toLowerCase() === parts.unit.toLowerCase()
      ? raw
      : '';
  }

  function getStyleValueCandidates(value) {
    const candidates = [
      value.value,
      value.serializeValue,
      value.cssValue,
      value.currentValue
    ];

    [value.value, value.rule, value.css, value.style].forEach((item) => {
      if (!item || typeof item !== 'object') return;
      candidates.push(item.value, item.serializeValue, item.cssValue, item.currentValue);
    });

    return candidates;
  }

  function getSelectorCssRule(selector, property) {
    if (!selector || typeof selector.getCSS !== 'function') return null;

    try {
      return selector.getCSS(property);
    } catch {
      return null;
    }
  }

  function isSelectorCustomStyleProperty(selector, property) {
    return isSelectorListedCustomStyleProperty(selector, property) || isSelectorCustomRuleStyleProperty(selector, property);
  }

  function isSelectorListedCustomStyleProperty(selector, property) {
    return Boolean(typeof selector?.isCustomProperty === 'function'
      ? selector.isCustomProperty(property)
      : selector?.custom?.has?.(property));
  }

  function isSelectorCustomRuleStyleProperty(selector, property) {
    const cssValue = getSelectorCssRule(selector, property);
    return Boolean(cssValue?.isCustom);
  }

  function getSelectorPropertyCssValue(selector, property) {
    if (!selector) return null;

    try {
      const cssValue = getSelectorCssRule(selector, property);
      if (typeof cssValue === 'string') return cssValue;
      if (cssValue && typeof cssValue === 'object') {
        return getStyleValueCandidates(cssValue).find(Boolean) || '';
      }
      return '';
    } catch {
      return null;
    }
  }

  function hasExtraUnitCssValue(value) {
    if (getExtraUnitValueParts(value)) return true;
    if (!value || typeof value !== 'object') return false;

    return getStyleValueCandidates(value).some((item) => getExtraUnitValueParts(item));
  }

  function getCustomUnitPropertyFromObject(value, parts) {
    if (!value || typeof value !== 'object') return '';

    const property = [
      value.name,
      value.property,
      value.cssProperty,
      value.ruleName,
      value.styleName,
      value.key
    ].map(normalizeCssPropertyName).find(Boolean);
    if (!property) return '';

    const rawValue = getStyleValueCandidates(value)
      .map((item) => getMatchingExtraUnitRawValue(item, parts))
      .find(Boolean);

    return rawValue ? property : '';
  }

  function findInObject(root, predicate, maxDepth = 5, maxVisits = 350) {
    const seen = new WeakSet();
    const stack = [{ value: root, depth: 0 }];
    let visits = 0;

    while (stack.length && visits < maxVisits) {
      const { value, depth } = stack.pop();
      if (!value || typeof value !== 'object' || seen.has(value)) continue;
      seen.add(value);
      visits += 1;

      const found = predicate(value);
      if (found) return found;
      if (depth >= maxDepth || value === window || value === document || value instanceof Node) continue;

      let values;
      try {
        values = Object.values(value);
      } catch {
        continue;
      }

      values.forEach((item) => {
        if (item && typeof item === 'object') stack.push({ value: item, depth: depth + 1 });
      });
    }

    return null;
  }

  function findTaptopSelectorInFiber(fiber) {
    let node = fiber;
    while (node) {
      let context = node.dependencies?.firstContext;
      while (context) {
        const selector = findInObject(context.memoizedValue, getTaptopSelectorFromValue, 4);
        if (selector) return selector;
        context = context.next;
      }

      const selector = findInObject({
        props: node.memoizedProps,
        state: node.memoizedState,
        nodeProps: node.stateNode?.props
      }, getTaptopSelectorFromValue, 4);
      if (selector) return selector;

      node = node.return;
    }

    return null;
  }

  function findTaptopRuntimeInFiber(fiber) {
    let node = fiber;
    while (node) {
      let context = node.dependencies?.firstContext;
      while (context) {
        const runtime = findInObject(context.memoizedValue, getTaptopRuntimeFromValue, 4);
        if (runtime) return runtime;
        context = context.next;
      }

      const runtime = findInObject({
        props: node.memoizedProps,
        state: node.memoizedState,
        nodeProps: node.stateNode?.props
      }, getTaptopRuntimeFromValue, 4);
      if (runtime) return runtime;

      node = node.return;
    }

    return null;
  }

  function findTaptopSelectorCollectionsInFiber(fiber) {
    const collections = [];
    const seenCollections = new WeakSet();
    const remember = (items) => {
      (items || []).forEach((collection) => {
        if (!collection || seenCollections.has(collection)) return;
        seenCollections.add(collection);
        collections.push(collection);
      });
    };

    let node = fiber;
    while (node) {
      let context = node.dependencies?.firstContext;
      while (context) {
        remember(collectTaptopSelectorCollections(context.memoizedValue));
        context = context.next;
      }

      remember(collectTaptopSelectorCollections({
        props: node.memoizedProps,
        state: node.memoizedState,
        nodeProps: node.stateNode?.props
      }));

      node = node.return;
    }

    return collections;
  }

  function findCustomUnitPropertyInFiber(fiber, parts) {
    let node = fiber;
    while (node) {
      let context = node.dependencies?.firstContext;
      while (context) {
        const property = findInObject(context.memoizedValue, (value) => getCustomUnitPropertyFromObject(value, parts), 5, 600);
        if (property) return property;
        context = context.next;
      }

      const property = findInObject({
        props: node.memoizedProps,
        state: node.memoizedState,
        nodeProps: node.stateNode?.props
      }, (value) => getCustomUnitPropertyFromObject(value, parts), 5, 600);
      if (property) return property;

      node = node.return;
    }

    return '';
  }

  function findTaptopSelector(extraRoot) {
    const directSelector = getTaptopSelectorFromValue(extraRoot);
    if (directSelector) return directSelector;

    const control = resolveStyleUnitControl();
    const roots = [
      extraRoot,
      control?.picker,
      control?.valueInput,
      getCustomStyleRoot(),
      getCustomStyleBlock(),
      document.querySelector('.right-panel-popup'),
      document.querySelector('.tt-styles-block')
    ].filter(Boolean);

    for (const root of roots) {
      const selector = findTaptopSelectorInFiber(getReactFiber(root));
      if (selector) return selector;
    }

    return null;
  }

  function findTaptopRuntime(extraRoot) {
    const directRuntime = getTaptopRuntimeFromValue(extraRoot);
    if (directRuntime) {
      rememberTaptopRuntime(directRuntime);
      return directRuntime;
    }

    const directSelector = getTaptopSelectorFromValue(extraRoot);
    if (directSelector && taptopRuntimeBySelector.has(directSelector)) {
      return taptopRuntimeBySelector.get(directSelector);
    }

    const control = resolveStyleUnitControl();
    const roots = [
      extraRoot,
      control?.picker,
      control?.valueInput,
      getCustomStyleRoot(),
      getCustomStyleBlock(),
      document.querySelector('.right-panel-popup'),
      document.querySelector('.tt-styles-block')
    ].filter(Boolean);

    for (const root of roots) {
      const runtime = findTaptopRuntimeInFiber(getReactFiber(root));
      if (runtime) {
        rememberTaptopRuntime(runtime);
        return runtime;
      }
    }

    return null;
  }

  function findTaptopSelectorCollections(extraRoot) {
    const control = resolveStyleUnitControl();
    const roots = [
      extraRoot,
      control?.picker,
      control?.valueInput,
      getCustomStyleRoot(),
      getCustomStyleBlock(),
      document.querySelector('.right-panel-popup'),
      document.querySelector('.tt-styles-block')
    ].filter(Boolean);
    const collections = [];
    const seenCollections = new WeakSet();
    const remember = (items) => {
      (items || []).forEach((collection) => {
        if (!collection || seenCollections.has(collection)) return;
        seenCollections.add(collection);
        collections.push(collection);
      });
    };

    roots.forEach((root) => {
      remember(collectTaptopSelectorCollections(root));
      remember(findTaptopSelectorCollectionsInFiber(getReactFiber(root)));
    });

    return collections;
  }

  function rememberTaptopRuntime(runtime) {
    if (runtime?.selector && (typeof runtime.selector === 'object' || typeof runtime.selector === 'function')) {
      taptopRuntimeBySelector.set(runtime.selector, runtime);
    }
    rememberTaptopSelectorCollections([runtime?.selectorCollection]);
  }

  function getTaptopModelContext(root) {
    const runtime = findTaptopRuntime(root);
    const selector = runtime?.selector || findTaptopSelector(root);
    const selectorCollection = runtime?.selectorCollection || getTaptopSelectorCollectionFromValue(root);
    const selectorCollections = [
      selectorCollection,
      ...findTaptopSelectorCollections(root)
    ].filter(Boolean);
    rememberTaptopSelectorCollections(selectorCollections);
    return { runtime, selector, selectorCollection, selectorCollections, root };
  }

  function rememberTaptopSelectorCollection(collection) {
    if (!collection || (typeof collection !== 'object' && typeof collection !== 'function')) return false;
    if (!collection.list && !collection.sortedList) return false;
    if (!knownTaptopSelectorCollections.some((item) => item === collection)) {
      knownTaptopSelectorCollections.push(collection);
    }
    patchTaptopSelectorCollectionForCustomUnits(collection);
    return true;
  }

  function rememberTaptopSelectorCollections(collections) {
    return (collections || []).map(rememberTaptopSelectorCollection).some(Boolean);
  }

  function getRuntimePropCssProperty(prop) {
    return normalizeCssPropertyName(prop?.name || prop?.propertyName || prop?.property || prop?.cssProperty);
  }

  function getTaptopSelectorKey(selector) {
    if (!selector || (typeof selector !== 'object' && typeof selector !== 'function')) return '';
    const fallbackKey = selector.media && selector.selectorText ? `${selector.media}/${selector.selectorText}` : '';
    return String((selector.key ?? fallbackKey) || '');
  }

  function normalizeTaptopSourceKey(source) {
    const value = String(source || '').trim();
    return value.startsWith('key:') ? value.slice(4) : value;
  }

  function addUniqueSourceKey(sourceKeys, source) {
    const key = normalizeTaptopSourceKey(source);
    if (key && !sourceKeys.includes(key)) sourceKeys.push(key);
  }

  function getRuntimePropertySourceKeys(properties, root) {
    const propertySet = new Set((properties || []).map(normalizeCssPropertyName).filter(Boolean));
    if (!propertySet.size) return [];

    const runtime = findTaptopRuntime(root);
    const selector = runtime?.selector || findTaptopSelector(root);
    const sourceKeys = [];
    addUniqueSourceKey(sourceKeys, getTaptopSelectorKey(selector));

    const inspectProp = (prop) => {
      const property = getRuntimePropCssProperty(prop);
      if (!propertySet.has(property)) return;
      addUniqueSourceKey(sourceKeys, prop?.source);
    };

    try {
      Array.from(runtime?.props?.values?.() || []).forEach(inspectProp);
    } catch {}

    try {
      Array.from(runtime?.getCustomProps?.() || []).forEach(inspectProp);
    } catch {}

    return sourceKeys;
  }

  function getCustomUnitRemovalSourceKeys(properties, root, explicitSourceKeys = []) {
    const sourceKeys = [];
    (explicitSourceKeys || []).forEach((source) => addUniqueSourceKey(sourceKeys, source));
    getRuntimePropertySourceKeys(properties, root).forEach((source) => addUniqueSourceKey(sourceKeys, source));
    addUniqueSourceKey(sourceKeys, getTaptopSelectorKey(findTaptopSelector(root)));
    return sourceKeys;
  }

  function makeVirtualCustomProp(prop, property, value, selector) {
    const virtual = Object.create(prop);
    Object.defineProperties(virtual, {
      isCustom: { value: true, configurable: true },
      source: { value: selector?.key || prop?.source || '', configurable: true },
      name: { value: property, configurable: true },
      propertyName: { value: property, configurable: true },
      value: { value, configurable: true }
    });
    return virtual;
  }

  function getVirtualExtraUnitCustomProps(runtime) {
    const selector = runtime?.selector;
    const props = Array.from(runtime?.props?.values?.() || []);

    return props.map((prop) => {
      const property = getRuntimePropCssProperty(prop);
      if (!property) return null;
      if (wasCustomUnitPropertyRecentlyRemoved(property, selector)) return null;
      if (!selectorHasCssProperty(selector, property)) return null;

      const selectorValue = getSelectorPropertyCssValue(selector, property);
      const value = String(selectorValue || '').trim();
      if (!getExtraUnitValueParts(value)) return null;

      return makeVirtualCustomProp(prop, property, value, selector);
    }).filter(Boolean);
  }

  function patchTaptopRuntimeCustomProps(root) {
    const runtime = findTaptopRuntime(root);
    if (!runtime || typeof runtime.getCustomProps !== 'function') return false;

    rememberTaptopRuntime(runtime);
    rememberTaptopSelectorCollection(runtime.selectorCollection);
    patchTaptopSelectorForCustomUnits(runtime.selector || root);
    if (patchedTaptopRuntimes.has(runtime)) return false;
    const originalGetCustomProps = runtime.getCustomProps;
    runtime.getCustomProps = function () {
      const virtualList = getVirtualExtraUnitCustomProps(this);
      const virtualProperties = new Set(virtualList.map(getRuntimePropCssProperty).filter(Boolean));
      const list = Array.from(originalGetCustomProps.call(this) || [])
        .filter((prop) => {
          const property = getRuntimePropCssProperty(prop);
          if (!property) return true;
          if (virtualProperties.has(property)) return false;
          if (wasCustomUnitPropertyRecentlyRemoved(property, this.selector)) return false;
          if (prop?.source && prop.source === this.selector?.key) {
            return selectorHasCssProperty(this.selector, property);
          }
          return true;
        });
      const seen = new Set(list.map(getRuntimePropCssProperty).filter(Boolean));
      const nextVirtualList = virtualList
        .filter((prop) => {
          const property = getRuntimePropCssProperty(prop);
          if (!property || seen.has(property)) return false;
          seen.add(property);
          return true;
        });
      return list.concat(nextVirtualList);
    };

    patchedTaptopRuntimes.add(runtime);
    return true;
  }

  function demoteRuntimeExtraUnitCustomProps(root) {
    const runtime = findTaptopRuntime(root);
    const selector = runtime?.selector || findTaptopSelector(root);
    if (!runtime || !selector) return false;

    if (hasActiveCustomUnitRemovalMarks()) {
      cleanupRemovedCustomUnitRulesInSelectorCollections({ runtime, selector, selectorCollection: runtime.selectorCollection, root });
    }
    let changed = false;
    Array.from(runtime.props?.values?.() || []).forEach((prop) => {
      const property = getRuntimePropCssProperty(prop);
      if (!property) return;
      if (wasCustomUnitPropertyRecentlyRemoved(property, selector)) {
        removeCustomStylePropertiesViaTaptop([property], selector);
        changed = clearRuntimeCustomPropsForRemovedProperties([property], selector) || changed;
        return;
      }
      if (!selectorHasCssProperty(selector, property)) return;

      const value = String(getSelectorPropertyCssValue(selector, property) || '').trim();
      if (!getExtraUnitValueParts(value)) return;

      changed = promoteCustomStylePropertiesViaTaptop([property], root, value) || changed;
      changed = patchRuntimePropForEditableLength(prop, value) || changed;
    });

    if (changed) scheduleCustomStylePanelRefresh(root);
    return changed;
  }

  function patchRuntimePropForEditableLength(prop, value) {
    if (!prop) return false;

    const parts = getStyleValueParts(value);
    let changed = false;

    try {
      if (prop.isCustom) {
        prop.isCustom = false;
        changed = true;
      }
    } catch {}

    if (!parts) return changed;

    const unit = parts.unit.toLowerCase();
    const number = Number(parts.number);
    [
      ['value', value],
      ['number', Number.isFinite(number) ? number : parts.number],
      ['unit', unit]
    ].forEach(([key, nextValue]) => {
      try {
        if (prop[key] !== nextValue) {
          prop[key] = nextValue;
          changed = true;
        }
      } catch {}
    });

    return changed;
  }

  function getResetFallbackParts(property) {
    if (property === 'width') return { number: 100, unit: '%' };
    if (['height', 'min-width', 'min-height', ...Object.values(POSITION_PROPERTY_BY_TITLE)].includes(property)) {
      return { number: 0, unit: 'auto' };
    }
    if (['max-width', 'max-height'].includes(property)) return { number: 0, unit: 'none' };
    if (['gap', 'row-gap', 'column-gap'].includes(property)) return { number: 0, unit: 'normal' };
    if (
      property === 'margin' ||
      property === 'padding' ||
      property.startsWith('margin-') ||
      property.startsWith('padding-') ||
      property === 'border-radius' ||
      BORDER_RADIUS_PROPERTIES.includes(property)
    ) {
      return { number: 0, unit: 'px' };
    }
    if (property === 'font-size') return { number: 16, unit: 'px' };
    return null;
  }

  function patchRuntimePropForReset(prop, property) {
    if (!prop) return false;

    const fallback = getResetFallbackParts(property);
    let changed = false;

    [
      ['isCustom', false],
      ['source', ''],
      ['available', true]
    ].forEach(([key, nextValue]) => {
      try {
        if (prop[key] !== nextValue) {
          prop[key] = nextValue;
          changed = true;
        }
      } catch {}
    });

    if (!fallback) return changed;

    [
      ['number', fallback.number],
      ['unit', fallback.unit],
      ['value', ['auto', 'none', 'normal'].includes(fallback.unit) ? fallback.unit : `${fallback.number}${fallback.unit}`]
    ].forEach(([key, nextValue]) => {
      try {
        if (prop[key] !== nextValue) {
          prop[key] = nextValue;
          changed = true;
        }
      } catch {}
    });

    return changed;
  }

  function demoteRuntimeCustomProps(properties, root) {
    const runtime = findTaptopRuntime(root);
    const selector = runtime?.selector || findTaptopSelector(root);
    if (!runtime || !properties?.length) return false;

    const propertySet = new Set(properties.map(normalizeCssPropertyName).filter(Boolean));
    let changed = false;
    Array.from(runtime.props?.values?.() || []).forEach((prop) => {
      const property = getRuntimePropCssProperty(prop);
      if (!propertySet.has(property)) return;

      const value = selectorHasCssProperty(selector, property)
        ? String(getSelectorPropertyCssValue(selector, property) || '').trim()
        : '';
      changed = patchRuntimePropForEditableLength(prop, value) || changed;
    });

    if (changed) scheduleCustomStylePanelRefresh(root);
    return changed;
  }

  function clearRuntimeCustomPropsForRemovedProperties(properties, root) {
    const runtime = findTaptopRuntime(root);
    const selector = runtime?.selector || findTaptopSelector(root);
    if (!runtime || !properties?.length) return false;

    const propertySet = new Set(properties.map(normalizeCssPropertyName).filter(Boolean));
    let changed = false;
    Array.from(runtime.props?.values?.() || []).forEach((prop) => {
      const property = getRuntimePropCssProperty(prop);
      if (!propertySet.has(property)) return;

      if (selectorHasCssProperty(selector, property)) {
        const value = String(getSelectorPropertyCssValue(selector, property) || '').trim();
        changed = patchRuntimePropForEditableLength(prop, value) || changed;
        return;
      }

      changed = patchRuntimePropForReset(prop, property) || changed;
    });

    if (changed) scheduleCustomStylePanelRefresh(root);
    return changed;
  }

  function getTaptopSelectorStateId(selector) {
    if (typeof selector === 'string') {
      const sourceKey = normalizeTaptopSourceKey(selector);
      return sourceKey ? `key:${sourceKey}` : '';
    }
    if (!selector || (typeof selector !== 'object' && typeof selector !== 'function')) return '';
    const selectorKey = getTaptopSelectorKey(selector) || selector.selectorText;
    if (selectorKey) return `key:${String(selectorKey)}`;

    if (!taptopSelectorIds.has(selector)) {
      taptopSelectorIds.set(selector, nextTaptopSelectorId);
      nextTaptopSelectorId += 1;
    }
    return String(taptopSelectorIds.get(selector));
  }

  function getCustomUnitRemovalKey(selector, property) {
    const selectorId = selector ? getTaptopSelectorStateId(selector) : '*';
    return `${selectorId}:${property}`;
  }

  function isCustomUnitRemovalMarkActive(key) {
    const createdAt = removedCustomUnitProperties.get(key);
    if (!createdAt) return false;
    if (Date.now() - createdAt <= CUSTOM_UNIT_REMOVAL_TTL_MS) return true;
    removedCustomUnitProperties.delete(key);
    return false;
  }

  function hasActiveCustomUnitRemovalMarks() {
    Array.from(removedCustomUnitProperties.keys()).forEach(isCustomUnitRemovalMarkActive);
    return removedCustomUnitProperties.size > 0;
  }

  function hasActiveCustomUnitRemovalForProperties(properties, sourceKeys = [], root) {
    const normalizedProperties = (properties || []).map(normalizeCssPropertyName).filter(Boolean);
    if (!normalizedProperties.length) return false;

    const normalizedSourceKeys = (sourceKeys || []).map(normalizeTaptopSourceKey).filter(Boolean);
    const selector = findTaptopSelector(root);

    return normalizedProperties.some((property) => {
      if (isCustomUnitRemovalMarkActive(getCustomUnitRemovalKey(null, property))) return true;
      if (selector && isCustomUnitRemovalMarkActive(getCustomUnitRemovalKey(selector, property))) return true;
      return normalizedSourceKeys.some((sourceKey) => (
        isCustomUnitRemovalMarkActive(getCustomUnitRemovalKey(sourceKey, property))
      ));
    });
  }

  function markCustomUnitPropertiesRemoved(properties, root, explicitSourceKeys = []) {
    const normalizedProperties = (properties || []).map(normalizeCssPropertyName).filter(Boolean);
    if (!normalizedProperties.length) return;

    const sourceKeys = getCustomUnitRemovalSourceKeys(normalizedProperties, root, explicitSourceKeys);
    const now = Date.now();
    normalizedProperties.forEach((property) => {
      if (sourceKeys.length) {
        sourceKeys.forEach((sourceKey) => {
          const key = getCustomUnitRemovalKey(sourceKey, property);
          if (!isCustomUnitRemovalMarkActive(key)) removedCustomUnitProperties.set(key, now);
        });
      } else {
        const key = getCustomUnitRemovalKey(null, property);
        if (!isCustomUnitRemovalMarkActive(key)) removedCustomUnitProperties.set(key, now);
      }
    });
  }

  function clearCustomUnitPropertiesRemoved(properties, root) {
    const normalizedProperties = (properties || []).map(normalizeCssPropertyName).filter(Boolean);
    if (!normalizedProperties.length) return;

    const selector = findTaptopSelector(root);
    normalizedProperties.forEach((property) => {
      removedCustomUnitProperties.delete(getCustomUnitRemovalKey(selector, property));
      removedCustomUnitProperties.delete(getCustomUnitRemovalKey(null, property));
      Array.from(removedCustomUnitProperties.keys()).forEach((key) => {
        if (key.endsWith(`:${property}`)) removedCustomUnitProperties.delete(key);
      });
    });
  }

  function wasCustomUnitPropertyRecentlyRemoved(property, root) {
    const normalizedProperty = normalizeCssPropertyName(property);
    if (!normalizedProperty) return false;

    const selector = findTaptopSelector(root);
    if (selector && isCustomUnitRemovalMarkActive(getCustomUnitRemovalKey(selector, normalizedProperty))) {
      return true;
    }

    return isCustomUnitRemovalMarkActive(getCustomUnitRemovalKey(null, normalizedProperty));
  }

  function cleanupRemovedCustomUnitRulesInSelector(selector, root) {
    if (!selector) return false;

    let changed = false;
    SUPPORTED_CUSTOM_STYLE_PROPERTIES.forEach((property) => {
      if (!wasCustomUnitPropertyRecentlyRemoved(property, selector)) return;

      const cssRule = getSelectorCssRule(selector, property);
      const hasRule = selectorHasCssProperty(selector, property);
      const hasExtraRule = hasRule && hasExtraUnitCssValue(cssRule);
      const isCustomRule = isSelectorCustomRuleStyleProperty(selector, property);
      const isListedCustom = isSelectorListedCustomStyleProperty(selector, property);

      if ((hasExtraRule || isCustomRule) && typeof selector.removeCSS === 'function') {
        selector.removeCSS(property);
        changed = true;
        return;
      }

      if (isListedCustom && typeof selector.removeCustomProperty === 'function') {
        selector.removeCustomProperty(property);
        changed = true;
      }
    });

    if (changed) {
      if (typeof selector.onChange === 'function') selector.onChange();
      clearRuntimeCustomPropsForRemovedProperties(Array.from(SUPPORTED_CUSTOM_STYLE_PROPERTIES), selector);
      scheduleCustomStylePanelRefresh(root || selector);
    }
    return changed;
  }

  function getSelectorCollectionItems(collection) {
    if (!collection) return [];

    const items = [
      collection.list,
      collection.sortedList,
      collection.designSelectorCollection?.list,
      collection.designSelectorCollection?.sortedList,
      collection.selectorCollection?.list,
      collection.selectorCollection?.sortedList
    ].filter(Boolean);

    return items.flatMap((item) => {
      try {
        return Array.from(item || []);
      } catch {
        return [];
      }
    }).filter(Boolean);
  }

  function getSelectorCollectionsForCleanup(context = {}) {
    return [
      context.selectorCollection,
      ...(context.selectorCollections || []),
      context.runtime?.selectorCollection,
      ...knownTaptopSelectorCollections
    ].filter(Boolean);
  }

  function getSelectorFromCollectionByKey(collection, sourceKey) {
    if (!collection || !sourceKey) return null;

    try {
      const selector = collection.get?.(sourceKey);
      if (selector) return selector;
    } catch {}

    const separatorIndex = sourceKey.indexOf('/');
    if (separatorIndex <= 0 || typeof collection.findSelector !== 'function') return null;

    try {
      return collection.findSelector(sourceKey.slice(separatorIndex + 1), sourceKey.slice(0, separatorIndex));
    } catch {
      return null;
    }
  }

  function getSelectorsBySourceKeys(sourceKeys, context = {}) {
    const normalizedSourceKeys = (sourceKeys || []).map(normalizeTaptopSourceKey).filter(Boolean);
    if (!normalizedSourceKeys.length) return [];

    const selectors = [];
    const seenSelectors = new WeakSet();
    const remember = (selector) => {
      if (!selector || seenSelectors.has(selector)) return;
      seenSelectors.add(selector);
      selectors.push(selector);
    };

    getSelectorCollectionsForCleanup(context).forEach((collection) => {
      normalizedSourceKeys.forEach((sourceKey) => {
        remember(getSelectorFromCollectionByKey(collection, sourceKey));
      });
    });

    return selectors;
  }

  function cleanupRemovedCustomUnitRulesInSelectorCollections(context = {}) {
    const collections = getSelectorCollectionsForCleanup(context);

    let changed = false;
    const seenCollections = new WeakSet();
    const seenSelectors = new WeakSet();
    getSelectorsBySourceKeys(context.sourceKeys, context).forEach((selector) => {
      if (!selector || seenSelectors.has(selector)) return;
      seenSelectors.add(selector);
      changed = cleanupRemovedCustomUnitRulesInSelector(selector, context.root || context.selector || selector) || changed;
    });

    collections.forEach((collection) => {
      if (!collection || seenCollections.has(collection)) return;
      seenCollections.add(collection);
      rememberTaptopSelectorCollection(collection);

      getSelectorCollectionItems(collection).forEach((selector) => {
        if (!selector || seenSelectors.has(selector)) return;
        seenSelectors.add(selector);
        changed = cleanupRemovedCustomUnitRulesInSelector(selector, context.root || context.selector || selector) || changed;
      });
    });

    return changed;
  }

  function patchTaptopSelectorCollectionForCustomUnits(collection) {
    if (!collection || patchedTaptopSelectorCollections.has(collection)) return false;

    const originalGetSelector = collection.getSelector;
    if (typeof originalGetSelector === 'function') {
      collection.getSelector = function () {
        const selector = originalGetSelector.apply(this, arguments);
        patchTaptopSelectorForCustomUnits(selector);
        if (hasActiveCustomUnitRemovalMarks()) cleanupRemovedCustomUnitRulesInSelector(selector, selector);
        return selector;
      };
    }

    const originalAdd = collection.add;
    if (typeof originalAdd === 'function') {
      collection.add = function (selector) {
        patchTaptopSelectorForCustomUnits(selector);
        if (hasActiveCustomUnitRemovalMarks()) cleanupRemovedCustomUnitRulesInSelector(selector, selector);
        return originalAdd.apply(this, arguments);
      };
    }

    patchedTaptopSelectorCollections.add(collection);
    getSelectorCollectionItems(collection).forEach((selector) => {
      patchTaptopSelectorForCustomUnits(selector);
      if (hasActiveCustomUnitRemovalMarks()) cleanupRemovedCustomUnitRulesInSelector(selector, selector);
    });
    return true;
  }

  function patchTaptopSelectorForCustomUnits(root) {
    const selector = findTaptopSelector(root);
    if (!selector || patchedTaptopSelectors.has(selector)) return false;

    const originalSetCSS = selector.setCSS;
    if (typeof originalSetCSS === 'function') {
      selector.setCSS = function (property, value) {
        const normalizedProperty = normalizeCssPropertyName(property);
        if (
          normalizedProperty &&
          wasCustomUnitPropertyRecentlyRemoved(normalizedProperty, this) &&
          hasExtraUnitCssValue(value)
        ) {
          return undefined;
        }

        return originalSetCSS.apply(this, arguments);
      };
    }

    const originalAddCustomProperty = selector.addCustomProperty;
    if (typeof originalAddCustomProperty === 'function') {
      selector.addCustomProperty = function (property) {
        const normalizedProperty = normalizeCssPropertyName(property);
        const currentValue = normalizedProperty ? getSelectorPropertyCssValue(this, normalizedProperty) : '';
        if (
          normalizedProperty &&
          wasCustomUnitPropertyRecentlyRemoved(normalizedProperty, this) &&
          (!currentValue || hasExtraUnitCssValue(currentValue))
        ) {
          return undefined;
        }

        return originalAddCustomProperty.apply(this, arguments);
      };
    }

    const originalRemoveCSS = selector.removeCSS;
    if (typeof originalRemoveCSS === 'function') {
      selector.removeCSS = function (property) {
        const normalizedProperty = normalizeCssPropertyName(property);
        const cssRule = normalizedProperty ? getSelectorCssRule(this, normalizedProperty) : null;
        const shouldTrackRemoval = normalizedProperty && (
          hasExtraUnitCssValue(cssRule) ||
          isSelectorCustomRuleStyleProperty(this, normalizedProperty) ||
          isSelectorListedCustomStyleProperty(this, normalizedProperty)
        );
        if (shouldTrackRemoval) markCustomUnitPropertiesRemoved([normalizedProperty], this);

        const result = originalRemoveCSS.apply(this, arguments);

        if (shouldTrackRemoval) {
          clearRuntimeCustomPropsForRemovedProperties([normalizedProperty], this);
          forgetPropertiesCustomUnit([normalizedProperty], this);
          scheduleCustomStylePanelRefresh(root);
        }
        return result;
      };
    }

    const originalRemoveCustomProperty = selector.removeCustomProperty;
    if (typeof originalRemoveCustomProperty === 'function') {
      selector.removeCustomProperty = function (property) {
        const normalizedProperty = normalizeCssPropertyName(property);
        const currentValue = normalizedProperty ? getSelectorPropertyCssValue(this, normalizedProperty) : '';
        const shouldTrackRemoval = normalizedProperty && hasExtraUnitCssValue(currentValue);
        if (shouldTrackRemoval) markCustomUnitPropertiesRemoved([normalizedProperty], this);

        const result = originalRemoveCustomProperty.apply(this, arguments);

        if (shouldTrackRemoval) {
          clearRuntimeCustomPropsForRemovedProperties([normalizedProperty], this);
          forgetPropertiesCustomUnit([normalizedProperty], this);
          scheduleCustomStylePanelRefresh(root);
        }
        return result;
      };
    }

    patchedTaptopSelectors.add(selector);
    if (hasActiveCustomUnitRemovalMarks()) cleanupRemovedCustomUnitRulesInSelector(selector, root);
    return true;
  }

  function getControlStatePrefixes(control, root, includeFallback = false) {
    if (!control) return [];

    const selector = findTaptopSelector(root || control.valueInput);
    const prefixes = [];
    if (selector) prefixes.push(`selector:${getTaptopSelectorStateId(selector)}`);
    if (includeFallback || !selector) {
      prefixes.push(`control:${control.kind || ''}:${control.key || ''}`);
    }
    return prefixes;
  }

  function getControlStateKeys(control, root, includeFallback = false) {
    if (!control?.properties?.length) return [];

    const prefixes = getControlStatePrefixes(control, root, includeFallback);
    return prefixes.flatMap((prefix) => control.properties.map((property) => `${prefix}:${property}`));
  }

  function rememberControlCustomUnit(control, unit, root) {
    const normalizedUnit = String(unit || '').trim().toLowerCase();
    if (!EXTRA_UNITS.includes(normalizedUnit)) return;

    getControlStateKeys(control, root, true).forEach((key) => {
      customUnitState.set(key, normalizedUnit);
    });
    if (control?.picker) control.picker.dataset.ttEnhancerSelectedUnit = normalizedUnit;
    if (control?.kind === 'position') positionCustomUnits.set(control.key, normalizedUnit);
  }

  function forgetControlCustomUnit(control, root) {
    getControlStateKeys(control, root, true).forEach((key) => {
      customUnitState.delete(key);
    });
    if (control?.picker) delete control.picker.dataset.ttEnhancerSelectedUnit;
    if (control?.kind === 'position') positionCustomUnits.delete(control.key);
  }

  function getRememberedCustomUnitForControl(control, root) {
    const unit = getControlStateKeys(control, root, false)
      .map((key) => customUnitState.get(key))
      .find((value) => EXTRA_UNITS.includes(value));

    return unit || '';
  }

  function setCustomStylePropertiesViaTaptop(styles, root) {
    const selector = findTaptopSelector(root);
    if (!selector) return false;

    patchTaptopSelectorForCustomUnits(selector);
    styles.forEach(({ property, value }) => {
      selector.setCSS(property, sanitizeCssValue(value), true);
    });
    return true;
  }

  function setNativeLengthPropertiesViaTaptop(control, value, root) {
    const parts = getStyleValueParts(value);
    const selector = findTaptopSelector(root);
    if (
      !control?.properties?.length ||
      !parts ||
      !isNativeLengthUnit(parts.unit) ||
      !selector ||
      typeof selector.setCSS !== 'function'
    ) {
      return false;
    }

    patchTaptopSelectorForCustomUnits(selector);
    const sanitizedValue = sanitizeCssValue(value);
    control.properties.forEach((property) => {
      clearCustomUnitPropertiesRemoved([property], selector);
      selector.setCSS(property, sanitizedValue, false);
      if (typeof selector.removeCustomProperty === 'function') {
        selector.removeCustomProperty(property);
      }
    });

    if (typeof selector.onChange === 'function') selector.onChange();
    return true;
  }

  function setLockedCustomLengthPropertiesViaTaptop(control, value, root) {
    const parts = getStyleValueParts(value);
    if (!control?.properties?.length || !parts) return false;

    if (EXTRA_UNITS.includes(parts.unit.toLowerCase())) {
      const selector = findTaptopSelector(root);
      if (!selector || typeof selector.setCSS !== 'function') return false;
      patchTaptopSelectorForCustomUnits(selector);
      return promoteCustomStylePropertiesViaTaptop(control.properties, root, value);
    }

    return setNativeLengthPropertiesViaTaptop(control, value, root);
  }

  function removeCustomStylePropertiesViaTaptop(properties, root) {
    const selector = findTaptopSelector(root);
    if (!selector) return false;

    patchTaptopSelectorForCustomUnits(selector);
    markCustomUnitPropertiesRemoved(properties, selector);
    properties.forEach((property) => {
      if (typeof selector.removeCSS === 'function') selector.removeCSS(property);
    });
    cleanupRemovedCustomUnitRulesInSelectorCollections(getTaptopModelContext(selector));
    return true;
  }

  function demoteCustomStylePropertiesViaTaptop(properties, root, options = {}) {
    const selector = findTaptopSelector(root);
    if (!selector) return false;

    patchTaptopSelectorForCustomUnits(selector);
    let changed = false;
    const shouldMarkRemoval = options.markRemoval !== false;
    properties.forEach((property) => {
      const isListedCustom = isSelectorListedCustomStyleProperty(selector, property);
      const isRuleCustom = isSelectorCustomRuleStyleProperty(selector, property);
      if (!isListedCustom && !isRuleCustom) return;

      if (shouldMarkRemoval) markCustomUnitPropertiesRemoved([property], selector);
      const currentValue = String(getSelectorPropertyCssValue(selector, property) || '').trim();
      if ((currentValue && isRuleCustom) && typeof selector.setCSS === 'function') {
        selector.setCSS(property, currentValue, false);
        changed = true;
      }
      if (isListedCustom && typeof selector.removeCustomProperty === 'function') {
        selector.removeCustomProperty(property);
        changed = true;
      }
    });

    if (changed && typeof selector.onChange === 'function') selector.onChange();
    return changed;
  }

  function promoteCustomStylePropertiesViaTaptop(properties, root, value, options = {}) {
    const selector = findTaptopSelector(root);
    if (!selector) return false;

    patchTaptopSelectorForCustomUnits(selector);
    const nextValue = value ? sanitizeCssValue(value) : '';
    let changed = false;
    properties.forEach((property) => {
      if (options.clearRemovalMark) clearCustomUnitPropertiesRemoved([property], selector);
      else if (wasCustomUnitPropertyRecentlyRemoved(property, selector)) return;

      const isListedCustom = isSelectorListedCustomStyleProperty(selector, property);
      const isRuleCustom = isSelectorCustomRuleStyleProperty(selector, property);
      const currentValue = getSelectorPropertyCssValue(selector, property);
      if (
        nextValue &&
        typeof selector.setCSS === 'function' &&
        (isRuleCustom || String(currentValue || '').trim() !== nextValue)
      ) {
        selector.setCSS(property, nextValue, false);
        changed = true;
      }
      if (nextValue && !isListedCustom && typeof selector.addCustomProperty === 'function') {
        selector.addCustomProperty(property);
        changed = true;
      }
    });

    if (changed && typeof selector.onChange === 'function') selector.onChange();
    return changed;
  }

  function hasMissingVisibleCustomStyleProperty(properties) {
    if (!getCustomStyleRoot()) return false;
    return properties.some((property) => !findCustomStyleRow(property));
  }

  function syncCustomStyleFlagForUnit(control, unit, root, value, options = {}) {
    if (!control?.properties?.length) return false;

    const normalizedUnit = String(unit || '').toLowerCase();
    const targetRoot = root || control.valueInput;

    if (EXTRA_UNITS.includes(normalizedUnit)) {
      if (!getExtraUnitValueParts(value)) return false;
      if (!options.clearRemovalMark && control.properties.some((property) => wasCustomUnitPropertyRecentlyRemoved(property, targetRoot))) {
        return false;
      }

      const changed = promoteCustomStylePropertiesViaTaptop(control.properties, targetRoot, value, options);
      rememberControlCustomUnit(control, normalizedUnit, targetRoot);
      patchTaptopRuntimeCustomProps(targetRoot);
      demoteRuntimeCustomProps(control.properties, targetRoot);
      syncVisibleCustomStylePropertyValues(control.properties, sanitizeCssValue(value));
      scheduleCustomStylePanelRefresh(targetRoot);
      return changed;
    }

    const hasNativeLengthValue = isNativeLengthValue(value);
    let changed = false;
    if (hasNativeLengthValue) {
      clearCustomUnitPropertiesRemoved(control.properties, targetRoot);
      changed = setNativeLengthPropertiesViaTaptop(control, value, targetRoot) || changed;
    }
    changed = demoteCustomStylePropertiesViaTaptop(control.properties, targetRoot, {
      markRemoval: !hasNativeLengthValue
    }) || changed;
    if (hasNativeLengthValue) clearCustomUnitPropertiesRemoved(control.properties, targetRoot);
    demoteRuntimeCustomProps(control.properties, targetRoot);
    forgetControlCustomUnit(control, targetRoot);
    if (changed) scheduleCustomStylePanelRefresh(targetRoot);
    return changed;
  }

  function hasCustomStylePropertiesViaTaptop(properties, root) {
    const selector = findTaptopSelector(root);
    if (!selector) return false;

    return properties.some((property) => (
      !wasCustomUnitPropertyRecentlyRemoved(property, selector) &&
      isSelectorCustomStyleProperty(selector, property)
    ));
  }

  function selectorHasCssProperty(selector, property) {
    if (!selector || typeof selector.hasCSS !== 'function') return false;
    try {
      return selector.hasCSS(property);
    } catch {
      return false;
    }
  }

  function findStyleUnitControlByKey(control) {
    if (!control) return null;
    if (control.kind === 'locked-custom') {
      if (SIZE_PROPERTY_BY_LABEL[control.key]) return findSizeUnitControlByKey(control.key);
      if (control.properties?.includes('font-size')) return findFontSizeUnitControlByKey(control.key);
      if (control.properties?.some((property) => BORDER_RADIUS_PROPERTIES.includes(property))) {
        return findBorderRadiusUnitControlByKey(control.key, control.properties);
      }
      const positionProperty = control.properties?.find((property) => POSITION_PROPERTY_BY_SIDE[property]);
      if (positionProperty) return findPositionUnitControlByKey(control.key) || findPositionUnitControlByKey(positionProperty);
      if (SPACING_PROPERTIES_BY_ICON[control.key]) {
        return control.key.includes('gap')
          ? findGapUnitControlByKey(control.key)
          : findSpacingUnitControlByKey(control.key);
      }
    }
    return control.kind === 'size'
      ? findSizeUnitControlByKey(control.key)
      : control.kind === 'gap'
        ? findGapUnitControlByKey(control.key)
        : control.kind === 'font-size'
          ? findFontSizeUnitControlByKey(control.key)
          : control.kind === 'radius'
            ? findBorderRadiusUnitControlByKey(control.key, control.properties)
            : control.kind === 'position'
              ? findPositionUnitControlByKey(control.key)
              : findSpacingUnitControlByKey(control.key);
  }

  function normalizeEditorNumber(number) {
    const trimmed = String(number || '').trim();
    if (/^\.\d+$/.test(trimmed)) return trimmed.slice(1);
    return trimmed;
  }

  function setNativeControlValue(control, value, optionButton) {
    const parts = getStyleValueParts(value);
    if (!parts) return false;

    const nextControl = findStyleUnitControlByKey(control);
    if (!nextControl?.valueInput || !document.contains(nextControl.valueInput)) return false;

    const number = normalizeEditorNumber(parts.number);
    const unit = parts.unit.toLowerCase();
    const unitInput = getUnitInputForControl(nextControl);
    if (!unitInput) return false;

    const isExtraUnit = EXTRA_UNITS.includes(unit);
    if (nextControl.picker) {
      if (isExtraUnit) nextControl.picker.dataset.ttEnhancerSelectedUnit = unit;
      else delete nextControl.picker.dataset.ttEnhancerSelectedUnit;
    }
    if (nextControl.kind === 'position') {
      if (isExtraUnit) positionCustomUnits.set(nextControl.key, unit);
      else positionCustomUnits.delete(nextControl.key);
    }

    setInputValue(nextControl.valueInput, number);
    const option = optionButton?.closest?.('.tt-input-picker-option') ? getOptionController(optionButton) : null;
    if (option && typeof option.onClick === 'function') option.onClick(unit);
    else setInputValue(unitInput, unit);
    nextControl.valueInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    nextControl.valueInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
    setInputDisplayValue(nextControl.valueInput, number);
    setInputDisplayValue(unitInput, unit);
    nextControl.valueInput.blur();
    if (nextControl.properties?.length) clearCustomUnitPropertiesRemoved(nextControl.properties, optionButton || nextControl.valueInput);
    return true;
  }

  function getLengthNumberForControl(control, root) {
    const rawValue = String(control?.valueInput?.value || '').trim();
    const rawParts = getStyleValueParts(rawValue) || findExtraUnitValueParts(rawValue);
    if (rawParts?.number) return normalizeEditorNumber(rawParts.number);
    if (/^-?\d*\.?\d+$/.test(rawValue)) return normalizeEditorNumber(rawValue);

    const customParts = getExtraUnitPartsForControl(control, root);
    if (customParts?.number) return normalizeEditorNumber(customParts.number);

    return '0';
  }

  function buildLengthValueForControl(control, unit, root) {
    return normalizeStyleValue(getLengthNumberForControl(control, root), unit);
  }

  function patchLengthControlDisplay(control, value, unit) {
    const parts = getStyleValueParts(value);
    if (!parts) return;

    if (control?.kind === 'position') {
      patchPositionControlDisplay(control, value, unit || parts.unit);
      return;
    }

    const delays = USE_NATIVE_STYLE_CONTROLS ? [0] : [0, 40, 120, 260, 700];
    delays.forEach((delay) => {
      setTimeout(() => {
        const nextControl = findStyleUnitControlByKey(control) || control;
        if (!nextControl?.valueInput || !document.contains(nextControl.valueInput)) return;

        const selectedUnit = String(unit || parts.unit || '').toLowerCase();
        const number = normalizeEditorNumber(parts.number);
        setInputDisplayValue(nextControl.valueInput, number);
        setInputDisplayValue(getUnitInputForControl(nextControl), selectedUnit);
        if (nextControl.picker && EXTRA_UNITS.includes(selectedUnit)) {
          nextControl.picker.dataset.ttEnhancerSelectedUnit = selectedUnit;
        }
      }, delay);
    });
  }

  function applyLengthValueViaNativeControl(control, value, root, callback) {
    const parts = getStyleValueParts(value);
    if (!control?.properties?.length || !parts) return false;

    nativeLengthApplyToken += 1;
    const token = nativeLengthApplyToken;
    const unit = parts.unit.toLowerCase();
    const appliedViaNativeControl = setNativeControlValue(control, value, root);
    const appliedViaTaptopModel = isNativeLengthUnit(unit)
      ? setNativeLengthPropertiesViaTaptop(control, value, root || control.valueInput)
      : false;
    if (!appliedViaNativeControl && !appliedViaTaptopModel) return false;

    syncCustomStyleFlagForUnit(control, unit, root || control.valueInput, value);
    patchLengthControlDisplay(control, value, unit);

    [80, 220, 500].forEach((delay) => {
      setTimeout(() => {
        if (token !== nativeLengthApplyToken) return;
        const nextControl = findStyleUnitControlByKey(control) || control;
        syncCustomStyleFlagForUnit(nextControl, unit, nextControl.valueInput || root || control.valueInput, value);
        patchLengthControlDisplay(nextControl, value, unit);
      }, delay);
    });

    callback?.();
    return true;
  }

  function applyCustomLengthValue(control, value, root, callback) {
    if (USE_NATIVE_STYLE_CONTROLS) {
      if (control?.kind === 'locked-custom') {
        const parts = getStyleValueParts(value);
        if (!parts || !setLockedCustomLengthPropertiesViaTaptop(control, value, root || control.valueInput)) {
          return false;
        }

        syncCustomStyleFlagForUnit(control, parts.unit, root || control.valueInput, value);
        scheduleCustomStylePanelRefresh(root || control.valueInput);
        callback?.();
        return true;
      }

      return applyLengthValueViaNativeControl(control, value, root, callback);
    }

    if (!control?.properties?.length || !value) return false;

    if (isNativeLengthValue(value)) {
      return applyNativeLengthValue(control, value, root, callback);
    }

    const parts = getExtraUnitValueParts(value);
    if (!parts) return false;

    cancelPendingNativeLengthApply();
    const token = nativeLengthApplyToken;
    const unit = parts.unit.toLowerCase();
    const styles = control.properties.map((property) => ({ property, value }));
    if (setCustomStylePropertiesViaTaptop(styles, root || control.valueInput)) {
      rememberControlCustomUnit(control, unit, root || control.valueInput);
      patchLengthControlDisplay(control, value, unit);
      setTimeout(() => syncVisibleCustomStyleProperties(styles, callback), 0);
      [60, 180, 360].forEach((delay) => {
        setTimeout(() => {
          if (token !== nativeLengthApplyToken) return;
          if (!setCustomStylePropertiesViaTaptop(styles, root || control.valueInput)) return;
          rememberControlCustomUnit(control, unit, root || control.valueInput);
          patchLengthControlDisplay(control, value, unit);
          syncVisibleCustomStyleProperties(styles);
        }, delay);
      });
      return true;
    }

    if (!getCustomStyleRoot() && !getCustomStyleBlock()) return false;

    return setCustomStyleProperties(styles, 0, () => {
      rememberControlCustomUnit(control, unit, root || control.valueInput);
      patchLengthControlDisplay(control, value, unit);
      callback?.();
    });
  }

  function cancelPendingNativeLengthApply() {
    nativeLengthApplyToken += 1;
  }

  function getScrollSnapshot() {
    return Array.from(document.querySelectorAll('.tt-scrollable__container'))
      .map((element) => ({ element, top: element.scrollTop, left: element.scrollLeft }));
  }

  function restoreScrollSnapshot(snapshot) {
    snapshot.forEach(({ element, top, left }) => {
      if (!document.contains(element)) return;
      element.scrollTop = top;
      element.scrollLeft = left;
    });
  }

  function preserveScroll(callback) {
    const snapshot = getScrollSnapshot();
    const windowX = window.scrollX;
    const windowY = window.scrollY;

    callback();

    [0, 40, 120, 260].forEach((delay) => {
      setTimeout(() => {
        restoreScrollSnapshot(snapshot);
        window.scrollTo(windowX, windowY);
      }, delay);
    });
  }

  function getScrollRestorer() {
    const snapshot = getScrollSnapshot();
    const windowX = window.scrollX;
    const windowY = window.scrollY;

    return () => {
      restoreScrollSnapshot(snapshot);
      window.scrollTo(windowX, windowY);
    };
  }

  function getCustomStyleRemoveButton(row) {
    const roots = [
      row,
      row?.closest?.('.tt-styles-block-row'),
      row?.parentElement
    ].filter(Boolean);

    for (const root of roots) {
      const buttons = Array.from(root.querySelectorAll?.('button') || []);
      const button = buttons.find((button) => (
        button.classList.contains('tt-custom-style__remove') ||
        getIconNames(button).includes('medium-control-remove')
      ));
      if (button) return button;
    }

    return null;
  }

  function removeVisibleCustomStyleProperty(property) {
    const row = findCustomStyleRow(property);
    return removeCustomStyleRow(row);
  }

  function removeCustomStyleRow(row) {
    const button = getCustomStyleRemoveButton(row);
    if (button) {
      preserveScroll(() => {
        button.click();
        button.blur();
      });
      return true;
    }

    return false;
  }

  function removeCustomStyleProperties(control, root) {
    const removedViaTaptop = removeCustomStylePropertiesViaTaptop(control.properties, root);
    const removedVisibleRows = control.properties
      .map(removeVisibleCustomStyleProperty)
      .some(Boolean);

    return removedViaTaptop || removedVisibleRows;
  }

  function forgetPropertiesCustomUnit(properties, root) {
    const propertySet = new Set((properties || []).map(normalizeCssPropertyName).filter(Boolean));
    if (!propertySet.size) return;

    getVisibleStyleUnitControls().forEach((control) => {
      if (!control.properties?.some((property) => propertySet.has(property))) return;
      forgetControlCustomUnit(control, root || control.valueInput);
      clearStaleCustomUnitDisplay(control, root || control.valueInput, true);
    });
  }

  function cleanupRemovedCustomUnitProperties(properties, root, explicitSourceKeys = []) {
    const normalizedProperties = (properties || []).map(normalizeCssPropertyName).filter(Boolean);
    if (!normalizedProperties.length) return;

    const context = getTaptopModelContext(root);
    const sourceKeys = getCustomUnitRemovalSourceKeys(normalizedProperties, context, explicitSourceKeys);
    context.sourceKeys = sourceKeys;
    const targetRoot = context.selector || root;
    markCustomUnitPropertiesRemoved(normalizedProperties, targetRoot, sourceKeys);
    cleanupRemovedCustomUnitRulesInSelector(context.selector, targetRoot);
    cleanupRemovedCustomUnitRulesInSelectorCollections(context);
    clearRuntimeCustomPropsForRemovedProperties(normalizedProperties, context.runtime || targetRoot);
    forgetPropertiesCustomUnit(normalizedProperties, targetRoot);
    scheduleCustomStylePanelRefresh(targetRoot);
  }

  function purgeVisibleCustomStyleProperties(control) {
    if (!control?.properties?.length) return;
    control.properties.forEach(removeVisibleCustomStyleProperty);
  }

  function applyNativeLengthValue(control, value, root, callback) {
    if (USE_NATIVE_STYLE_CONTROLS) {
      return applyLengthValueViaNativeControl(control, value, root, callback);
    }

    const token = nativeLengthApplyToken + 1;
    nativeLengthApplyToken = token;
    const restoreScroll = getScrollRestorer();
    const removedCustomProperties = removeCustomStyleProperties(control, root);
    forgetControlCustomUnit(control, root);
    if (!removedCustomProperties && getCustomStyleExtraUnitPartsForControl(control, root)) return false;

    [0, 80, 180, 360, 700].forEach((delay) => {
      setTimeout(() => {
        if (token !== nativeLengthApplyToken) return;
        purgeVisibleCustomStyleProperties(control);
        setNativeControlValue(control, value);
        restoreScroll();
      }, delay);
    });
    callback?.();
    [0, 40, 120, 260, 700].forEach((delay) => {
      setTimeout(() => {
        if (token === nativeLengthApplyToken) restoreScroll();
      }, delay);
    });
    return true;
  }

  function getCustomStylePropertyByValue(parts) {
    const target = `${parts.number}${parts.unit}`.toLowerCase();
    const matches = getCustomStyleRows().map((row) => {
      const [nameInput, valueInput] = getCustomStyleRowInputs(row);
      const property = normalizeCssPropertyName(nameInput?.value);
      const value = String(valueInput?.value || '').trim().toLowerCase();
      return property && value === target ? property : '';
    }).filter(Boolean);

    return matches.length === 1 ? matches[0] : '';
  }

  function getSelectorCssValueMatch(selector, property, parts) {
    if (!selector || typeof selector.getCSS !== 'function') return '';

    let cssValue;
    try {
      cssValue = selector.getCSS(property);
    } catch {
      return '';
    }

    if (getMatchingExtraUnitRawValue(cssValue, parts)) return String(cssValue).trim();
    if (cssValue && typeof cssValue === 'object') {
      return getStyleValueCandidates(cssValue)
        .map((item) => getMatchingExtraUnitRawValue(item, parts))
        .find(Boolean) || '';
    }

    return '';
  }

  function getCustomStylePropertyBySelectorValue(parts, root) {
    const selector = findTaptopSelector(root);
    if (!selector) return '';

    const matches = Array.from(SUPPORTED_CUSTOM_STYLE_PROPERTIES).filter((property) => (
      getSelectorCssValueMatch(selector, property, parts)
    ));

    return matches.length === 1 ? matches[0] : '';
  }

  function buildLockedCustomUnitControl(element, parts, property, key = property) {
    if (!property) return null;
    return {
      kind: 'locked-custom',
      key,
      valueInput: element,
      properties: [property],
      unit: parts.unit
    };
  }

  function buildLockedCustomUnitControlFromElement(element, properties, key) {
    if (!element || !properties?.length) return null;
    return {
      kind: 'locked-custom',
      key,
      valueInput: element,
      properties,
      unit: ''
    };
  }

  function getIconCustomUnitControlFromElement(element) {
    const iconContainers = [
      element.closest('.tt-spacing__item, .tt-gap-grid__item'),
      element.closest('.tt-styles-block-row')
    ].filter(Boolean);

    for (const iconItem of iconContainers) {
      const iconNames = getIconNames(iconItem).filter((name) => SPACING_PROPERTIES_BY_ICON[name]);
      const iconName = iconNames.length === 1 ? iconNames[0] : '';
      const properties = SPACING_PROPERTIES_BY_ICON[iconName];
      if (properties) return buildLockedCustomUnitControlFromElement(element, properties, iconName);
    }

    return null;
  }

  function getFontSizeCustomUnitControlFromElement(element) {
    const containers = [
      element.closest('.tt-input-group'),
      element.closest('.tt-custom-disable-item'),
      element.closest('.tt-styles-block-row')
    ].filter(Boolean);

    for (const container of containers) {
      const iconName = getIconNames(container).find((name) => TEXT_PROPERTIES_BY_ICON[name]);
      if (iconName) return buildLockedCustomUnitControlFromElement(element, TEXT_PROPERTIES_BY_ICON[iconName], iconName);
    }

    return null;
  }

  function getBorderRadiusCustomUnitControlFromElement(element) {
    const common = element.closest('.tt-border-radius--common, .tt-border-radius__common__input');
    if (common) {
      return buildLockedCustomUnitControlFromElement(element, BORDER_RADIUS_PROPERTIES, 'border-radius-common');
    }

    const corner = element.closest('.tt-border-radius__corner, .tt-border-radius__corner__input');
    if (!corner) return null;

    const iconName = getIconNames(corner).find((name) => BORDER_RADIUS_PROPERTY_BY_ICON[name]);
    const property = BORDER_RADIUS_PROPERTY_BY_ICON[iconName];
    return property ? buildLockedCustomUnitControlFromElement(element, [property], iconName) : null;
  }

  function getCustomUnitControlByElementShape(element) {
    const sizeItem = element.closest('.tt-styles-size__item');
    if (sizeItem) {
      const label = (
        sizeItem.querySelector('.tt-input-text__label')?.textContent ||
        sizeItem.querySelector('.tt-custom-disable-item__label')?.textContent ||
        ''
      ).trim();
      const property = SIZE_PROPERTY_BY_LABEL[label];
      if (property) return buildLockedCustomUnitControlFromElement(element, [property], label);
    }

    const iconControl = getIconCustomUnitControlFromElement(element);
    if (iconControl) return iconControl;

    const fontSizeControl = getFontSizeCustomUnitControlFromElement(element);
    if (fontSizeControl) return fontSizeControl;

    const borderRadiusControl = getBorderRadiusCustomUnitControlFromElement(element);
    if (borderRadiusControl) return borderRadiusControl;

    const positionProperty = getPositionPropertyByEditor(element);
    if (positionProperty) return buildLockedCustomUnitControlFromElement(element, [positionProperty], positionProperty);

    return null;
  }

  function getPropertyCssValue(property, root) {
    const selector = findTaptopSelector(root);
    if (wasCustomUnitPropertyRecentlyRemoved(property, selector || root)) return '';

    const selectorValue = getSelectorPropertyCssValue(selector, property);
    if (selectorValue !== null) return selectorValue;

    const row = findCustomStyleRow(property);
    const [, valueInput] = getCustomStyleRowInputs(row);
    if (valueInput?.value) return valueInput.value;

    return '';
  }

  function getMixedCustomUnitControl(display) {
    if ((display?.textContent || '').trim().toLowerCase() !== 'mixed') return null;

    const control = getCustomUnitControlByElementShape(display);
    if (!control) return null;

    const values = control.properties
      .map((property) => getExtraUnitValueParts(getPropertyCssValue(property, display)))
      .filter(Boolean);
    if (!values.length) return null;

    const first = values[0];
    const sameNumber = values.every((value) => value.number === first.number);
    const sameUnit = values.every((value) => value.unit.toLowerCase() === first.unit.toLowerCase());

    return {
      control: Object.assign({}, control, { unit: sameUnit ? first.unit : '' }),
      parts: {
        number: sameNumber ? first.number : '',
        unit: first.unit
      }
    };
  }

  function getCustomUnitControlFromElement(element, parts) {
    if (!element || !parts) return null;

    if (element.closest('.tt-popup')) {
      const positionControl = getPositionUnitControlFromPopupTarget(element);
      return positionControl
        ? {
          kind: 'locked-custom',
          key: positionControl.key,
          valueInput: positionControl.valueInput || element,
          properties: positionControl.properties,
          unit: parts.unit
        }
        : null;
    }

    const fiberProperty = findCustomUnitPropertyInFiber(getReactFiber(element), parts);
    const fiberControl = buildLockedCustomUnitControl(element, parts, fiberProperty);
    if (fiberControl) return fiberControl;

    const sizeItem = element.closest('.tt-styles-size__item');
    if (sizeItem) {
      const label = (
        sizeItem.querySelector('.tt-input-text__label')?.textContent ||
        sizeItem.querySelector('.tt-custom-disable-item__label')?.textContent ||
        ''
      ).trim();
      const property = SIZE_PROPERTY_BY_LABEL[label];
      if (property) {
        return {
          kind: 'locked-custom',
          key: label,
          valueInput: element,
          properties: [property],
          unit: parts.unit
        };
      }
    }

    const iconControl = getIconCustomUnitControlFromElement(element);
    if (iconControl) return Object.assign({}, iconControl, { unit: parts.unit });

    const fontSizeControl = getFontSizeCustomUnitControlFromElement(element);
    if (fontSizeControl) return Object.assign({}, fontSizeControl, { unit: parts.unit });

    const borderRadiusControl = getBorderRadiusCustomUnitControlFromElement(element);
    if (borderRadiusControl) return Object.assign({}, borderRadiusControl, { unit: parts.unit });

    const positionProperty = getPositionPropertyByEditor(element);
    if (positionProperty) {
      return {
        kind: 'locked-custom',
        key: positionProperty,
        valueInput: element,
        properties: [positionProperty],
        unit: parts.unit
      };
    }

    return buildLockedCustomUnitControl(
      element,
      parts,
      getCustomStylePropertyBySelectorValue(parts, element) || getCustomStylePropertyByValue(parts)
    );
  }

  function getCustomUnitLockedControl(input) {
    if (!input) return null;

    const parts = getExtraUnitValueParts(input.value);
    if (!parts) return null;
    return getCustomUnitControlFromElement(input, parts);
  }

  function unlockCustomUnitInput(input, control) {
    if (!input || !control) return;

    unlockedCustomUnitInputs.set(input, control);
    input.disabled = false;
    input.readOnly = false;
    input.removeAttribute('disabled');
    input.removeAttribute('readonly');
    input.removeAttribute('aria-disabled');
    input.dataset.ttEnhancerCustomUnitUnlocked = '1';

    const label = input.closest('.tt-input-text__label-wrap');
    label?.classList.remove('tt-input-text__label-wrap--disabled');
    if (label) {
      label.style.pointerEvents = 'auto';
      label.removeAttribute('aria-disabled');
    }

    const textRoot = input.closest('.tt-input-text');
    if (textRoot) textRoot.style.pointerEvents = 'auto';
  }

  function unlockCustomUnitInputs() {
    document
      .querySelectorAll('.tt-styles-size__item input, .tt-spacing__item input, .tt-gap-grid__item input, .tt-styles-position__indent-editor input')
      .forEach((input) => {
        const control = getCustomUnitLockedControl(input);
        if (control) unlockCustomUnitInput(input, control);
      });

    document
      .querySelectorAll('.tt-custom-disable-item')
      .forEach((display) => {
        if (findExtraUnitValueParts(display.textContent)) display.dataset.ttEnhancerCustomUnitUnlockable = '1';
      });
  }

  function getCustomUnitInputFromEventTarget(target) {
    const input = target?.closest?.('input') ||
      target?.closest?.('.tt-input-text, .tt-input-text__label-wrap')?.querySelector?.('input');
    if (!input) return null;

    const control = unlockedCustomUnitInputs.get(input) || getCustomUnitLockedControl(input);
    if (!control) return null;

    unlockCustomUnitInput(input, control);
    return input;
  }

  function isUnlockedUnitPickerTarget(target) {
    const picker = target?.closest?.('.tt-input-picker');
    if (!picker) return false;

    const group = picker.closest('.tt-input-group');
    const inputs = Array.from(group?.querySelectorAll?.('input.tt-input-text__input, input') || []);
    return inputs.some((input) => !picker.contains(input) && unlockedCustomUnitInputs.has(input));
  }

  function syncUnlockedCustomUnitInput(input) {
    const control = unlockedCustomUnitInputs.get(input) || getCustomUnitLockedControl(input);
    if (!control) return;

    const parts = getExtraUnitValueParts(input.value);
    const unit = parts?.unit || control.unit;
    const value = normalizeStyleValue(input.value, unit);
    if (!value) return;

    const nextControl = Object.assign({}, control, { unit });
    unlockedCustomUnitInputs.set(input, nextControl);
    applyCustomLengthValue(nextControl, value, input);
  }

  function commitUnlockedCustomUnitInput(input, blur = false) {
    if (!(input instanceof HTMLInputElement)) return;
    syncUnlockedCustomUnitInput(input);
    if (!blur) return;

    setTimeout(() => {
      if (document.activeElement === input) input.blur();
    }, 0);
  }

  function setCustomUnitDisplayValue(display, value) {
    const mounted = inlineCustomUnitControls.get(display);
    if (mounted?.editor?.isConnected) {
      const parts = getStyleValueParts(value);
      if (parts) mounted.setValue(Object.assign({}, parts, { number: normalizeEditorNumber(parts.number) }));
      return;
    }

    const valueNode = display?.querySelector?.('.tt-custom-disable-item__value span') ||
      display?.querySelector?.('.tt-custom-disable-item__value') ||
      display?.querySelector?.('span');

    if (valueNode) valueNode.textContent = value;
  }

  function getCustomUnitEditorHtml() {
    return `
      <span class="tt-enhancer-custom-unit-editor__group">
        <input class="tt-enhancer-custom-unit-editor__number" type="text" spellcheck="false">
        <button class="tt-enhancer-custom-unit-editor__unit-button tt-enhancer-custom-unit-editor__picker" type="button" tabindex="0">
          <span class="tt-enhancer-custom-unit-editor__unit"></span>
        </button>
      </span>
    `;
  }

  function applyInlineCustomUnitValue(display, control, value, callback) {
    if (applyCustomLengthValue(control, value, display, callback)) {
      setCustomUnitDisplayValue(display, value);
      return true;
    }

    return false;
  }

  function createCustomUnitPopup(anchor, selectedUnit, onSelect) {
    const popup = document.createElement('div');
    popup.className = 'tt-input-picker__tether-element tt-input-picker__tether-element--appearance-primary tether-element tether-enabled tt-enhancer-custom-unit-editor-popup';
    popup.innerHTML = `
      <div class="tt-input-picker-popup">
        <div class="tt-input-picker-list">
          <div class="tt-input-picker-list__scroll" style="position: relative; overflow: hidden; width: 100%; height: auto; min-height: 0px; max-height: 320px;">
            <div class="tt-enhancer-custom-unit-editor-popup__items" style="position: relative; overflow: auto; min-height: 15px; max-height: 320px;"></div>
          </div>
        </div>
      </div>
    `;

    const items = popup.querySelector('.tt-enhancer-custom-unit-editor-popup__items');
    EDITOR_UNIT_VALUES.forEach((unit) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tt-input-picker-option';
      button.dataset.ttEnhancerCustomEditorUnit = unit;
      button.innerHTML = `
        <span class="tt-input-picker-option__icon"></span>
        <span class="tt-input-picker-option__value" style="max-width: 350px;"></span>
      `;
      button.querySelector('.tt-input-picker-option__value').textContent = unit;
      button.addEventListener('mouseenter', () => button.classList.add('tt-input-picker-option--hover'));
      button.addEventListener('mouseleave', () => button.classList.remove('tt-input-picker-option--hover'));
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelect(unit);
      });
      button.addEventListener('mousedown', (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      items.appendChild(button);
    });

    const position = () => {
      const rect = anchor.getBoundingClientRect();
      popup.style.position = 'absolute';
      popup.style.left = `${Math.round(rect.left + window.scrollX)}px`;
      popup.style.top = `${Math.round(rect.bottom + window.scrollY + 2)}px`;
      popup.style.minWidth = `${Math.round(rect.width)}px`;
    };
    const repaint = () => {
      const unitValue = selectedUnit();
      popup.querySelectorAll('.tt-input-picker-option').forEach((button) => {
        const isActive = button.dataset.ttEnhancerCustomEditorUnit === unitValue;
        button.classList.toggle('tt-input-picker-option--active', isActive);
        const icon = button.querySelector('.tt-input-picker-option__icon');
        if (icon) {
          icon.innerHTML = isActive
            ? '<svg width="10" height="10" class="tt-icon tt-icon--size-10 tt-icon--name-small-check-mark"><use xlink:href="/g/s3/mosaic/images/icons.svg#small-check-mark"></use></svg>'
            : '';
        }
      });
    };
    const cleanup = () => {
      document.removeEventListener('pointerdown', handleOutside, true);
      document.removeEventListener('mousedown', handleOutside, true);
      window.removeEventListener('scroll', position, true);
      window.removeEventListener('resize', position, true);
      popup.remove();
    };
    const handleOutside = (event) => {
      if (popup.contains(event.target) || anchor.contains(event.target)) return;
      cleanup();
    };

    document.body.appendChild(popup);
    position();
    repaint();
    document.addEventListener('pointerdown', handleOutside, true);
    document.addEventListener('mousedown', handleOutside, true);
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position, true);

    return { popup, repaint, cleanup };
  }

  function mountInlineCustomUnitControl(display, control, parts) {
    if (!display || !control || !parts) return false;
    installCustomUnitEditorStyles();

    const existing = inlineCustomUnitControls.get(display);
    if (existing?.editor?.isConnected) {
      existing.control = control;
      existing.setValue(parts);
      return true;
    }

    const host = display.querySelector('.tt-custom-disable-item__value') || display;
    if (!host) return false;

    const editor = document.createElement('span');
    editor.className = 'tt-enhancer-custom-unit-editor tt-enhancer-custom-unit-editor--inline';
    editor.innerHTML = getCustomUnitEditorHtml();

    const numberInput = editor.querySelector('.tt-enhancer-custom-unit-editor__number');
    const unitDisplay = editor.querySelector('.tt-enhancer-custom-unit-editor__unit');
    const unitPicker = editor.querySelector('.tt-enhancer-custom-unit-editor__picker');
    let currentControl = control;
    let popupController = null;
    let committing = false;
    const getUnitValue = () => (unitDisplay.textContent || '').trim();
    const setUnitValue = (unit) => {
      unitDisplay.textContent = unit;
    };

    const closePopup = () => {
      popupController?.cleanup();
      popupController = null;
    };
    const commit = () => {
      if (committing) return;
      const value = normalizeStyleValue(normalizeEditorNumber(numberInput.value), getUnitValue());
      if (!value) return;
      committing = true;
      applyInlineCustomUnitValue(display, currentControl, value, () => {
        committing = false;
      });
      setTimeout(() => {
        committing = false;
      }, 500);
    };
    const setValue = (nextParts) => {
      if (!nextParts) return;
      if (document.activeElement !== numberInput) numberInput.value = nextParts.number;
      setUnitValue(nextParts.unit.toLowerCase());
      popupController?.repaint();
    };
    const openPopup = () => {
      if (popupController) {
        closePopup();
        return;
      }
      popupController = createCustomUnitPopup(unitPicker, () => getUnitValue().toLowerCase(), (unit) => {
        setUnitValue(unit);
        closePopup();
        commit();
        numberInput.focus({ preventScroll: true });
      });
    };

    setValue(parts);
    inlineCustomUnitControls.set(display, {
      editor,
      get control() {
        return currentControl;
      },
      set control(nextControl) {
        currentControl = nextControl;
      },
      setValue
    });

    ['pointerdown', 'mousedown', 'click', 'dblclick', 'keydown'].forEach((type) => {
      editor.addEventListener(type, (event) => event.stopPropagation());
    });
    numberInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        commit();
        numberInput.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setValue(findExtraUnitValueParts(display.textContent));
        numberInput.blur();
      }
    });
    numberInput.addEventListener('change', commit);
    numberInput.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!editor.contains(document.activeElement) && !popupController?.popup.contains(document.activeElement)) commit();
      }, 0);
    });
    unitPicker.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openPopup();
    });
    unitPicker.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    unitPicker.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        commit();
        unitPicker.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closePopup();
      } else if (event.key === 'ArrowDown' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        openPopup();
      }
    });

    Array.from(host.childNodes).forEach((node) => {
      if (node !== editor) node.remove();
    });
    display.dataset.ttEnhancerCustomUnitMounted = '1';
    host.appendChild(editor);
    return true;
  }

  function mountInlineCustomUnitControls() {
    document.querySelectorAll('.tt-custom-disable-item').forEach((display) => {
      let parts = findExtraUnitValueParts(display.textContent);
      let control = parts ? getCustomUnitControlFromElement(display, parts) : null;

      if (!parts || !control) {
        const mixed = getMixedCustomUnitControl(display);
        parts = mixed?.parts || null;
        control = mixed?.control || null;
      }

      if (mountInlineCustomUnitControl(display, control, parts)) {
        display.dataset.ttEnhancerCustomUnitUnlockable = '1';
      }
    });
  }

  function closeActiveCustomUnitEditor(commit = false) {
    const editor = activeCustomUnitEditor;
    if (!editor) return;

    if (commit) editor.commit();
    else editor.cancel();
  }

  function applyCustomUnitEditorValue(control, value, root, callback) {
    return applyCustomLengthValue(control, value, root, callback);
  }

  function handleCustomUnitEditorOutsidePointer(event) {
    const editor = activeCustomUnitEditor;
    if (!editor || editor.editor.contains(event.target) || editor.popup?.contains(event.target)) return;
    if (Date.now() - (editor.lastPopupInteractionAt || 0) < 140) return;

    editor.commit();
  }

  function syncVisibleCustomStyleProperties(styles, callback, index = 0) {
    if (index >= styles.length) {
      callback?.();
      return;
    }

    const { property, value } = styles[index];
    const row = findCustomStyleRow(property);
    if (!row) {
      syncVisibleCustomStyleProperties(styles, callback, index + 1);
      return;
    }

    const [, valueInput] = getCustomStyleRowInputs(row);
    if (!valueInput || valueInput.disabled) {
      syncVisibleCustomStyleProperties(styles, callback, index + 1);
      return;
    }

    commitCustomPropertyValue(valueInput, value, () => {
      syncVisibleCustomStyleProperties(styles, callback, index + 1);
    });
  }

  function openCustomUnitEditor(display, control, parts) {
    installCustomUnitEditorStyles();
    closeActiveCustomUnitEditor(true);

    const host = display.closest('.tt-reset-bem') || display.parentElement;
    if (!host) return false;

    const editor = document.createElement('span');
    editor.className = 'tt-enhancer-custom-unit-editor';
    editor.innerHTML = getCustomUnitEditorHtml();

    const numberInput = editor.querySelector('.tt-enhancer-custom-unit-editor__number');
    const unitDisplay = editor.querySelector('.tt-enhancer-custom-unit-editor__unit');
    const unitPicker = editor.querySelector('.tt-enhancer-custom-unit-editor__picker');

    numberInput.value = parts.number;
    unitDisplay.textContent = parts.unit.toLowerCase();

    let closed = false;
    let committing = false;
    let popup = null;
    let lastSelectedUnitAt = 0;
    let lastPopupInteractionAt = 0;
    const getUnitValue = () => (unitDisplay.textContent || '').trim();
    const setUnitValue = (unit) => {
      unitDisplay.textContent = unit;
    };

    const closeUnitPopup = () => {
      popup?.remove();
      popup = null;
    };
    const positionUnitPopup = () => {
      if (!popup) return;
      const rect = unitPicker.getBoundingClientRect();
      popup.style.position = 'absolute';
      popup.style.left = `${Math.round(rect.left + window.scrollX)}px`;
      popup.style.top = `${Math.round(rect.bottom + window.scrollY + 2)}px`;
      popup.style.minWidth = `${Math.round(rect.width)}px`;
    };
    const repaintUnitPopup = () => {
      if (!popup) return;
      const selectedUnit = getUnitValue().toLowerCase();
      popup.querySelectorAll('.tt-input-picker-option').forEach((button) => {
        const isActive = button.dataset.ttEnhancerCustomEditorUnit === selectedUnit;
        button.classList.toggle('tt-input-picker-option--active', isActive);
        const icon = button.querySelector('.tt-input-picker-option__icon');
        if (icon) {
          icon.innerHTML = isActive
            ? '<svg width="10" height="10" class="tt-icon tt-icon--size-10 tt-icon--name-small-check-mark"><use xlink:href="/g/s3/mosaic/images/icons.svg#small-check-mark"></use></svg>'
            : '';
        }
      });
    };
    const selectUnit = (unit) => {
      if (!EDITOR_UNIT_VALUES.includes(unit)) return;
      const now = Date.now();
      lastPopupInteractionAt = now;
      if (getUnitValue() === unit && now - lastSelectedUnitAt < 80) return;
      lastSelectedUnitAt = now;
      setUnitValue(unit);
      setCustomUnitDisplayValue(display, normalizeStyleValue(numberInput.value, unit));
      repaintUnitPopup();
      closeUnitPopup();
      numberInput.focus({ preventScroll: true });
    };
    const openUnitPopup = () => {
      if (popup) {
        closeUnitPopup();
        return;
      }

      popup = document.createElement('div');
      popup.className = 'tt-input-picker__tether-element tt-input-picker__tether-element--appearance-primary tether-element tether-enabled tt-enhancer-custom-unit-editor-popup';
      popup.innerHTML = `
        <div class="tt-input-picker-popup">
          <div class="tt-input-picker-list">
            <div class="tt-input-picker-list__scroll" style="position: relative; overflow: hidden; width: 100%; height: auto; min-height: 0px; max-height: 320px;">
              <div class="tt-enhancer-custom-unit-editor-popup__items" style="position: relative; overflow: auto; min-height: 15px; max-height: 320px;"></div>
            </div>
          </div>
        </div>
      `;

      const items = popup.querySelector('.tt-enhancer-custom-unit-editor-popup__items');
      EDITOR_UNIT_VALUES.forEach((unit) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tt-input-picker-option';
        button.dataset.ttEnhancerCustomEditorUnit = unit;
        button.innerHTML = `
          <span class="tt-input-picker-option__icon"></span>
          <span class="tt-input-picker-option__value" style="max-width: 350px;"></span>
        `;
        button.querySelector('.tt-input-picker-option__value').textContent = unit;
        button.addEventListener('mouseenter', () => button.classList.add('tt-input-picker-option--hover'));
        button.addEventListener('mouseleave', () => button.classList.remove('tt-input-picker-option--hover'));
        items.appendChild(button);
      });

      document.body.appendChild(popup);
      positionUnitPopup();
      repaintUnitPopup();
    };
    const cleanup = () => {
      if (closed) return;
      closed = true;
      if (activeCustomUnitEditor?.editor === editor) activeCustomUnitEditor = null;
      closeUnitPopup();
      window.removeEventListener('scroll', positionUnitPopup, true);
      window.removeEventListener('resize', positionUnitPopup, true);
      if (editor.contains(document.activeElement)) document.activeElement.blur();
      display.style.display = '';
      editor.remove();
    };
    const commit = () => {
      if (closed || committing) return;
      committing = true;
      closeUnitPopup();
      const value = normalizeStyleValue(normalizeEditorNumber(numberInput.value), getUnitValue());
      if (!value) {
        cleanup();
        return;
      }

      setCustomUnitDisplayValue(display, value);
      if (!applyCustomUnitEditorValue(control, value, display, cleanup)) cleanup();
    };

    activeCustomUnitEditor = {
      editor,
      display,
      get popup() {
        return popup;
      },
      get lastPopupInteractionAt() {
        return lastPopupInteractionAt;
      },
      openedAt: Date.now(),
      commit,
      cancel: cleanup,
      selectUnit,
      openUnitPopup
    };

    ['pointerdown', 'mousedown', 'click', 'dblclick', 'input', 'change', 'keydown'].forEach((type) => {
      editor.addEventListener(type, (event) => event.stopPropagation());
    });
    numberInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        commit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        cleanup();
      }
    });
    unitPicker.addEventListener('pointerdown', (event) => {
      if (event.__ttEnhancerCustomUnitHandled) return;
      event.preventDefault();
      event.stopPropagation();
      openUnitPopup();
    });
    unitPicker.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    unitPicker.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    unitPicker.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        commit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        cleanup();
      } else if (event.key === 'ArrowDown' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        openUnitPopup();
      }
    });
    editor.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!editor.contains(document.activeElement) && !popup?.contains(document.activeElement)) commit();
      }, 0);
    });
    editor.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        commit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        cleanup();
      }
    });
    window.addEventListener('scroll', positionUnitPopup, true);
    window.addEventListener('resize', positionUnitPopup, true);

    display.style.display = 'none';
    host.insertBefore(editor, display.nextSibling);
    numberInput.focus({ preventScroll: true });
    numberInput.select();
    return true;
  }

  function startNativeCustomUnitEdit(display) {
    const parts = findExtraUnitValueParts(display?.textContent);
    const control = getCustomUnitControlFromElement(display, parts);
    if (!control || !parts) return false;
    return openCustomUnitEditor(display, control, parts);
  }

  function handleCustomUnitUnlockPointer(event) {
    const editor = activeCustomUnitEditor;
    const editorUnitOption = event.target?.closest?.('[data-tt-enhancer-custom-editor-unit]');
    if (editor && editorUnitOption && editor.popup?.contains(editorUnitOption)) {
      event.preventDefault();
      event.stopPropagation();
      editor.selectUnit(editorUnitOption.dataset.ttEnhancerCustomEditorUnit);
      return;
    }

    const editorPicker = event.target?.closest?.('.tt-enhancer-custom-unit-editor__picker');
    if (
      editor &&
      editorPicker &&
      editor.editor.contains(editorPicker) &&
      (event.type === 'pointerdown' || (event.type === 'mousedown' && !window.PointerEvent))
    ) {
      event.preventDefault();
      event.stopPropagation();
      event.__ttEnhancerCustomUnitHandled = true;
      editor.openUnitPopup();
      return;
    }

    if (event.target?.closest?.('.tt-enhancer-custom-unit-editor--inline')) {
      return;
    }

    if (event.target?.closest?.('.tt-enhancer-custom-unit-editor') || (editor?.popup && editor.popup.contains(event.target))) {
      event.stopPropagation();
      return;
    }

    const display = event.target?.closest?.('.tt-custom-disable-item');
    if (display && findExtraUnitValueParts(display.textContent)) {
      event.preventDefault();
      event.stopPropagation();
      if (activeCustomUnitEditor?.display === display && Date.now() - activeCustomUnitEditor.openedAt < 350) {
        return;
      }
      startNativeCustomUnitEdit(display);
      return;
    }

    if (isUnlockedUnitPickerTarget(event.target)) {
      lastUnlockedUnitPickerInteractionAt = Date.now();
      return;
    }

    const input = getCustomUnitInputFromEventTarget(event.target);
    if (!input) return;
    if (unlockedCustomUnitInputs.has(input)) return;

    event.stopPropagation();
    setTimeout(() => input.focus({ preventScroll: true }), 0);
  }

  function handleUnlockedCustomUnitInput(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (!unlockedCustomUnitInputs.has(input) && !getCustomUnitLockedControl(input)) return;

    if (event.type !== 'input') {
      setTimeout(() => syncUnlockedCustomUnitInput(input), 40);
    }
  }

  function handleUnlockedCustomUnitCommit(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !unlockedCustomUnitInputs.has(input)) return;

    if (event.type === 'keydown') {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      event.stopPropagation();
      setTimeout(() => commitUnlockedCustomUnitInput(input, true), 0);
      return;
    }

    if (event.type === 'focusout' && Date.now() - lastUnlockedUnitPickerInteractionAt < 700) return;
    setTimeout(() => commitUnlockedCustomUnitInput(input), 0);
  }

  function handleUnlockedCustomUnitOutsidePointer(event) {
    const input = document.activeElement;
    if (!(input instanceof HTMLInputElement) || !unlockedCustomUnitInputs.has(input)) return;
    if (event.target === input || input.closest('.tt-input-group')?.contains(event.target)) return;
    if (
      event.target?.closest?.('.tt-input-picker__tether-element, .tt-dropdown-picker-popup') &&
      Date.now() - lastUnlockedUnitPickerInteractionAt < 700
    ) return;

    setTimeout(() => commitUnlockedCustomUnitInput(input, true), 0);
  }

  function getPositionSliderElements(control) {
    const popup = document.contains(control?.popup)
      ? control.popup
      : findPositionUnitControlByKey(control?.key)?.popup;
    const nativeSlider = popup?.querySelector('.tt-styles-indent-editor__popup__slider.tt-slider, .tt-slider');
    const thumb = nativeSlider?.querySelector('[role="slider"]');
    return { popup, nativeSlider, thumb };
  }

  function getPositionSliderMeta(control) {
    const { thumb } = getPositionSliderElements(control);
    const min = Number(thumb?.getAttribute('aria-valuemin'));
    const max = Number(thumb?.getAttribute('aria-valuemax'));
    const step = thumb?.getAttribute('aria-valuestep');
    return {
      min: Number.isFinite(min) ? min : -200,
      max: Number.isFinite(max) ? max : 200,
      step: step || '1'
    };
  }

  function setSliderProgress(slider) {
    const min = Number(slider.min);
    const max = Number(slider.max);
    const value = Number(slider.value);
    const progress = max === min ? 0 : ((value - min) / (max - min)) * 100;
    slider.style.setProperty('--tt-enhancer-slider-progress', `${Math.max(0, Math.min(100, progress))}%`);
  }

  function setPositionControlNumber(control, number, unit) {
    setInputDisplayValue(control.valueInput, String(number));
    setInputDisplayValue(getUnitInputForControl(control), unit);
  }

  function setPositionCustomNumber(control, number, unit) {
    const value = normalizeStyleValue(number, unit);
    if (!value) return;

    setPositionControlNumber(control, number, unit);
    applyCustomLengthValue(control, value, control.valueInput);
  }

  function ensurePositionCustomSlider(control, value, unit) {
    if (control?.kind !== 'position') return;
    const parts = getStyleValueParts(value);
    if (!parts) return;

    installPositionSliderStyles();

    const { nativeSlider } = getPositionSliderElements(control);
    if (!nativeSlider?.parentElement) return;

    const parent = nativeSlider.parentElement;
    const meta = getPositionSliderMeta(control);
    parent.style.position = parent.style.position || 'relative';
    nativeSlider.style.opacity = '0';
    nativeSlider.style.pointerEvents = 'none';

    let slider = parent.querySelector(':scope > .tt-enhancer-position-slider');
    if (!slider) {
      slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'tt-enhancer-position-slider';
      slider.addEventListener('pointerdown', (event) => event.stopPropagation());
      slider.addEventListener('mousedown', (event) => event.stopPropagation());
      slider.addEventListener('input', (event) => {
        event.stopPropagation();
        const nextControl = findPositionUnitControlByKey(control.key) || control;
        setPositionCustomNumber(nextControl, slider.value, positionCustomUnits.get(control.key) || unit);
        setSliderProgress(slider);
      });
      slider.addEventListener('change', (event) => {
        event.stopPropagation();
        const nextControl = findPositionUnitControlByKey(control.key) || control;
        setPositionCustomNumber(nextControl, slider.value, positionCustomUnits.get(control.key) || unit);
        setSliderProgress(slider);
      });
      parent.appendChild(slider);
    }

    slider.min = String(meta.min);
    slider.max = String(meta.max);
    slider.step = meta.step;
    slider.value = parts.number;
    setSliderProgress(slider);
  }

  function patchPositionControlDisplay(control, value, unit) {
    if (control?.kind !== 'position') return;
    const parts = getStyleValueParts(value);
    if (!parts) return;

    [0, 40, 120, 260].forEach((delay) => {
      setTimeout(() => {
        const nextControl = findPositionUnitControlByKey(control.key) || control;
        if (!document.contains(nextControl.valueInput)) return;

        setInputDisplayValue(nextControl.valueInput, parts.number);
        setInputDisplayValue(getUnitInputForControl(nextControl), unit || parts.unit);
        ensurePositionCustomSlider(nextControl, value, unit || parts.unit);
      }, delay);
    });
  }

  function normalizePositionControlDisplay(control, unit) {
    if (control?.kind !== 'position' || !document.contains(control.valueInput)) return '';

    const rawValue = String(control.valueInput.value || '').trim();
    const parts = getStyleValueParts(rawValue);
    const number = parts ? parts.number : rawValue;
    if (!/^-?\d*\.?\d+$/.test(number)) return '';

    setInputDisplayValue(control.valueInput, number);
    setInputDisplayValue(getUnitInputForControl(control), unit || parts?.unit || '');
    return number;
  }

  function getPositionUnitControlFromPopupTarget(target) {
    const popup = target?.closest?.('.tt-popup');
    if (!popup) return null;
    const title = (popup.querySelector('.tt-popup__title')?.textContent || '').trim();
    if (!getPositionPropertyByTitle(title)) return null;
    const picker = popup.querySelector('.tt-styles-indent-editor__popup__input .tt-input-picker');
    return picker ? getPositionUnitControl(picker) : null;
  }

  function syncPositionCustomStyle(control) {
    if (control?.kind !== 'position') return;
    const unit = positionCustomUnits.get(control.key);
    if (!unit) return;

    const number = normalizePositionControlDisplay(control, unit);
    const value = normalizeStyleValue(number || control.valueInput.value, unit);
    if (!value) return;

    applyCustomLengthValue(control, value, control.valueInput);
  }

  function handlePositionPopupEdit(event) {
    if (event.target?.closest?.('.tt-enhancer-position-slider')) return;

    const control = getPositionUnitControlFromPopupTarget(event.target);
    if (!control || !positionCustomUnits.has(control.key)) return;

    if (event.type === 'pointermove' || event.type === 'mousemove') {
      normalizePositionControlDisplay(control, positionCustomUnits.get(control.key));
      return;
    }

    if (positionDragLoop && (event.type === 'input' || event.type === 'change')) {
      normalizePositionControlDisplay(control, positionCustomUnits.get(control.key));
      return;
    }

    setTimeout(() => syncPositionCustomStyle(control), event.type === 'input' ? 0 : 40);
  }

  function stopPositionDragLoop() {
    if (!positionDragLoop) return;
    const { control } = positionDragLoop;
    positionDragLoop = null;
    setTimeout(() => syncPositionCustomStyle(control), 0);
  }

  function startPositionDragLoop(event) {
    if (!event.target?.closest?.('.tt-slider, .tt-slider__thumb, [role="slider"]')) return;

    const control = getPositionUnitControlFromPopupTarget(event.target);
    if (!control || !positionCustomUnits.has(control.key)) return;

    stopPositionDragLoop();
    positionDragLoop = { control };
    normalizePositionControlDisplay(control, positionCustomUnits.get(control.key));
  }

  function notifyReactInputChange(input, value) {
    const onChange = getReactProps(input)?.onChange;
    if (typeof onChange !== 'function') return;

    try {
      onChange({
        target: input,
        currentTarget: input,
        type: 'change',
        bubbles: true,
        nativeEvent: {},
        preventDefault() {},
        stopPropagation() {}
      });
    } catch {
      try {
        onChange(value);
      } catch {}
    }
  }

  function getReactInputPicker() {
    const control = resolveStyleUnitControl();
    let fiber = getReactFiber(control?.picker) || getReactFiber(getUnitInput());
    while (fiber) {
      const instance = fiber.stateNode;
      if (
        instance &&
        typeof instance.getOptions === 'function' &&
        typeof instance.changeValue === 'function'
      ) {
        return instance;
      }
      fiber = fiber.return;
    }
    return null;
  }

  function normalizeStyleValue(value, unit) {
    const trimmed = String(value || '').trim();
    if (!trimmed || trimmed === 'auto' || trimmed === 'none' || trimmed === 'normal' || trimmed === '-') return '';
    if (/^-?\d*\.?\d+(px|%|em|rem|vw|vh|dvh|svh|lvh|vmin|vmax|ch)$/i.test(trimmed)) {
      return trimmed.replace(/(px|%|em|rem|vw|vh|dvh|svh|lvh|vmin|vmax|ch)$/i, unit);
    }
    if (/^-?\d*\.?\d+$/.test(trimmed)) return `${trimmed}${unit}`;
    return `${trimmed}${unit}`;
  }

  function getStyleValueParts(value) {
    const match = String(value || '').trim().match(/^(-?\d*\.?\d+)(px|%|em|rem|vw|vh|dvh|svh|lvh|vmin|vmax|ch)$/i);
    return match ? { number: match[1], unit: match[2] } : null;
  }

  function isNativeLengthUnit(unit) {
    return NATIVE_LENGTH_UNITS.includes(String(unit || '').toLowerCase());
  }

  function isNativeLengthValue(value) {
    const parts = getStyleValueParts(value);
    return Boolean(parts && isNativeLengthUnit(parts.unit));
  }

  function getExtraUnitValueParts(value) {
    const parts = getStyleValueParts(value);
    return parts && EXTRA_UNITS.includes(parts.unit.toLowerCase()) ? parts : null;
  }

  function findExtraUnitValueParts(value) {
    const match = String(value || '').match(/(-?\d*\.?\d+)(dvh|svh|lvh|vmin|vmax|ch)/i);
    return match ? { number: match[1], unit: match[2] } : null;
  }

  function canBuildStyleValue(value) {
    return Boolean(normalizeStyleValue(value, 'px'));
  }

  function getCustomStyleRoot() {
    return document.querySelector('.tt-custom-style');
  }

  function getCustomStyleBlock() {
    const title = Array.from(document.querySelectorAll('.tt-title-helper')).find((item) => (
      CUSTOM_STYLE_TITLE_TEXTS.some((text) => (item.textContent || '').includes(text))
    ));
    let node = title;
    while (node && !node.classList?.contains('tt-styles-block--fields')) node = node.parentElement;
    return node || null;
  }

  function waitForCustomStyleRoot(callback, attempts = 25) {
    const root = getCustomStyleRoot();
    if (root) {
      callback(root);
      return;
    }
    if (attempts <= 0) return;
    setTimeout(() => waitForCustomStyleRoot(callback, attempts - 1), 40);
  }

  function withCustomStyleRoot(callback) {
    const root = getCustomStyleRoot();
    if (root) {
      callback(root);
      return true;
    }

    const block = getCustomStyleBlock();
    const toggle = block?.querySelector('.tt-styles-block__right button');
    if (!toggle) return false;

    toggle.click();
    waitForCustomStyleRoot(callback);
    return true;
  }

  function getCustomStyleRows() {
    return Array.from(document.querySelectorAll('.tt-custom-style__content'));
  }

  function getCustomStyleRowInputs(row) {
    return Array.from(row?.querySelectorAll?.('input.tt-input-text__input, input') || []);
  }

  function findCustomStyleRow(property) {
    return getCustomStyleRows().find((row) => {
      const [nameInput] = getCustomStyleRowInputs(row);
      return (nameInput?.value || '').trim() === property;
    }) || null;
  }

  function syncVisibleCustomStylePropertyValue(property, value) {
    const row = findCustomStyleRow(property);
    const [, valueInput] = getCustomStyleRowInputs(row);
    if (!valueInput || valueInput.value === value) return false;

    setInputValue(valueInput, value);
    setInputDisplayValue(valueInput, value);
    return true;
  }

  function syncVisibleCustomStylePropertyValues(properties, value) {
    if (!properties?.length || !value) return false;
    return properties
      .map((property) => syncVisibleCustomStylePropertyValue(property, value))
      .some(Boolean);
  }

  function hasVisibleNativeCustomStyleProperty(properties) {
    return (properties || []).some((property) => {
      const row = findCustomStyleRow(property);
      const [, valueInput] = getCustomStyleRowInputs(row);
      return isNativeLengthValue(valueInput?.value);
    });
  }

  function findEmptyCustomStyleRow() {
    return getCustomStyleRows().find((row) => {
      const [nameInput] = getCustomStyleRowInputs(row);
      return !(nameInput?.value || '').trim();
    }) || null;
  }

  function clickCustomStyleAdd(root) {
    const button = root?.querySelector('.tt-title__control button');
    if (!button) return false;
    button.click();
    return true;
  }

  function waitForCustomStyleRow(predicate, callback, attempts = 25) {
    const row = getCustomStyleRows().find(predicate);
    if (row) {
      callback(row);
      return;
    }
    if (attempts <= 0) {
      callback?.(null);
      return;
    }
    setTimeout(() => waitForCustomStyleRow(predicate, callback, attempts - 1), 40);
  }

  function commitCustomPropertyName(input, property) {
    setInputValue(input, property);
    setTimeout(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
    }, 40);
  }

  function commitCustomPropertyValue(input, value, callback) {
    setInputValue(input, value);
    setTimeout(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
      callback?.();
    }, 40);
  }

  function fillCustomStyleRow(row, property, value, callback) {
    const [nameInput] = getCustomStyleRowInputs(row);
    if (!nameInput) {
      callback?.();
      return;
    }

    commitCustomPropertyName(nameInput, property);
    waitForCustomStyleRow((nextRow) => {
      const [nextNameInput, nextValueInput] = getCustomStyleRowInputs(nextRow);
      return (nextNameInput?.value || '').trim() === property && nextValueInput && !nextValueInput.disabled;
    }, (nextRow) => {
      if (!nextRow) {
        if (!(nameInput.value || '').trim()) removeCustomStyleRow(row);
        callback?.();
        return;
      }
      const [, valueInput] = getCustomStyleRowInputs(nextRow);
      if (valueInput) commitCustomPropertyValue(valueInput, value, callback);
      else callback?.();
    });
  }

  function setCustomStyleProperty(property, value, callback) {
    return withCustomStyleRoot((root) => {
      const existingRow = findCustomStyleRow(property);
      if (existingRow) {
        const [, valueInput] = getCustomStyleRowInputs(existingRow);
        if (valueInput) commitCustomPropertyValue(valueInput, value, callback);
        else callback?.();
        return;
      }

      const emptyRow = findEmptyCustomStyleRow();
      if (emptyRow) {
        fillCustomStyleRow(emptyRow, property, value, callback);
        return;
      }

      const beforeRows = new Set(getCustomStyleRows());
      if (!clickCustomStyleAdd(root)) {
        callback?.();
        return;
      }

      waitForCustomStyleRow((row) => !beforeRows.has(row), (row) => {
        fillCustomStyleRow(row, property, value, callback);
      });
    });
  }

  function setCustomStyleProperties(styles, index = 0, callback) {
    if (index >= styles.length) {
      callback?.();
      return true;
    }
    const { property, value } = styles[index];
    return setCustomStyleProperty(property, value, () => setCustomStyleProperties(styles, index + 1, callback));
  }

  function cleanupCustomStyleFocus() {
    [0, 80, 180, 360, 700].forEach((delay) => {
      setTimeout(() => {
        const active = document.activeElement;
        if (active?.closest?.('.tt-custom-style')) active.blur();
      }, delay);
    });
  }

  function applyExtraUnitAsCustomStyle(unit, control = resolveStyleUnitControl(), callback, root) {
    if (!control || !document.contains(control.valueInput)) return false;

    const value = buildLengthValueForControl(control, unit, root || control.valueInput);
    if (!value) return false;

    return applyCustomLengthValue(control, value, root || control.valueInput, callback);
  }

  function isUnitOptions(options) {
    const values = options.map((option) => String(option.value));
    return values.indexOf('vh') !== -1 && values.every((value) => UNIT_VALUES.has(value));
  }

  function ensureReactPickerHasDvh() {
    const picker = getReactInputPicker();
    if (!picker || picker.__ttEnhancerDvhOptionsPatched || typeof picker.getOptions !== 'function') return picker;

    const originalGetOptions = picker.getOptions;
    picker.getOptions = function () {
      const options = originalGetOptions.call(this);
      if (!Array.isArray(options) || !isUnitOptions(options) || EXTRA_UNITS.every((unit) => options.some((option) => option.value === unit))) {
        return options;
      }

      const vhIndex = options.findIndex((option) => option.value === 'vh');
      const missingUnits = EXTRA_UNITS.filter((unit) => !options.some((option) => option.value === unit));
      const extraOptions = missingUnits.map((unit) => Object.assign({}, options[vhIndex], {
        value: unit,
        children: unit,
        title: undefined
      }));
      const next = options.slice();
      next.splice(vhIndex + 1, 0, ...extraOptions);
      return next;
    };

    picker.__ttEnhancerDvhOptionsPatched = true;
    if (typeof picker.forceUpdate === 'function') picker.forceUpdate();
    return picker;
  }

  function getOptionController(button) {
    const list = button.closest('.tt-input-picker-list');
    const options = Array.from(list?.querySelectorAll('.tt-input-picker-option') || []);
    const nativeOptions = options.filter((option) => option !== button && !option.dataset.ttEnhancerUnit);
    const sourceOption = nativeOptions.find((option) => (
      option.querySelector('.tt-input-picker-option__value')?.textContent.trim() === 'vh'
    )) || nativeOptions[0];

    let fiber = getReactFiber(sourceOption);
    while (fiber) {
      const instance = fiber.stateNode;
      const props = instance?.props || fiber.memoizedProps;
      if (props && typeof props.onClick === 'function' && 'value' in props) {
        return props;
      }
      fiber = fiber.return;
    }

    return null;
  }

  function closePickerPopup(button) {
    const popup = button.closest('.tt-input-picker__tether-element');
    if (popup) popup.remove();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
  }

  function paintSelectedDvh(button) {
    const list = button.closest('.tt-input-picker-list');
    const activeIcon = list?.querySelector('.tt-input-picker-option--active .tt-input-picker-option__icon');
    const nextIcon = button.querySelector('.tt-input-picker-option__icon');

    list?.querySelectorAll('.tt-input-picker-option').forEach((option) => {
      option.classList.toggle('tt-input-picker-option--active', option === button);
      option.classList.remove('tt-input-picker-option--hover');
      if (option !== button && option.querySelector('.tt-input-picker-option__icon')) {
        option.querySelector('.tt-input-picker-option__icon').textContent = '';
      }
    });

    if (activeIcon && nextIcon && !nextIcon.firstChild) {
      nextIcon.replaceChildren(activeIcon.cloneNode(true));
    }
  }

  function getSelectedExtraUnitForControl(control) {
    const rememberedUnit = getRememberedCustomUnitForControl(control, control?.valueInput);
    const parts = getExtraUnitPartsForControl(control, control?.valueInput);
    const inputUnit = String(getUnitInputForControl(control)?.value || '').trim().toLowerCase();
    if (EXTRA_UNITS.includes(inputUnit) && (rememberedUnit || parts)) return inputUnit;

    const datasetUnit = String(control?.picker?.dataset.ttEnhancerSelectedUnit || '').trim().toLowerCase();
    if (EXTRA_UNITS.includes(datasetUnit) && (rememberedUnit || parts)) return datasetUnit;

    if (EXTRA_UNITS.includes(rememberedUnit)) return rememberedUnit;

    return parts?.unit ? parts.unit.toLowerCase() : '';
  }

  function syncSelectedExtraUnit(list) {
    const unit = getSelectedExtraUnitForControl(resolveStyleUnitControl());
    if (!unit) return;

    const button = Array.from(list.querySelectorAll('.tt-input-picker-option')).find((option) => (
      (option.dataset.ttEnhancerUnit || option.querySelector('.tt-input-picker-option__value')?.textContent || '').trim().toLowerCase() === unit
    ));

    if (button) paintSelectedDvh(button);
  }

  function makeExtraUnitButton(templateButton, unit) {
    const button = templateButton.cloneNode(true);
    button.classList.remove('tt-input-picker-option--active', 'tt-input-picker-option--hover');
    button.dataset.ttEnhancerUnit = unit;

    const icon = button.querySelector('.tt-input-picker-option__icon');
    if (icon) icon.textContent = '';

    const value = button.querySelector('.tt-input-picker-option__value');
    if (value) value.textContent = unit;
    else button.textContent = unit;

    button.addEventListener('mouseenter', () => {
      button.classList.add('tt-input-picker-option--hover');
    });
    button.addEventListener('mouseleave', () => {
      button.classList.remove('tt-input-picker-option--hover');
    });

    return button;
  }

  function selectExtraUnit(button) {
    const unit = button.dataset.ttEnhancerUnit || 'dvh';
    const currentControl = findOpenPositionUnitControl() || resolveStyleUnitControl();
    if (currentControl) lastStyleUnitControl = currentControl;

    ensureReactPickerHasDvh();

    const control = resolveStyleUnitControl();
    if (control?.properties?.length) clearCustomUnitPropertiesRemoved(control.properties, button);

    if (applyExtraUnitAsCustomStyle(unit, control, cleanupCustomStyleFocus, button)) {
      cleanupCustomStyleFocus();
      rememberControlCustomUnit(control, unit, button);
      if (control?.kind === 'position' && !USE_NATIVE_STYLE_CONTROLS) {
        const value = buildLengthValueForControl(control, unit, button);
        patchPositionControlDisplay(control, value, unit);
      }
      paintSelectedDvh(button);
      closePickerPopup(button);
      return;
    }

    if (control) {
      closePickerPopup(button);
      return;
    }

    const input = getUnitInput();
    if (!input) return;

    const option = getOptionController(button);
    if (option) {
      option.onClick(unit);
      return;
    }

    const picker = getReactInputPicker();
    if (picker) {
      picker.changeValue(unit);
      if (typeof picker.closePopup === 'function') picker.closePopup();
      paintSelectedDvh(button);
      return;
    }

    input.focus({ preventScroll: true });
    setInputValue(input, unit);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
    input.blur();

    const selected = resolveStyleUnitControl()?.picker?.querySelector('input.tt-input-text__input, input');
    if (selected && selected !== input) setInputValue(selected, unit);
    paintSelectedDvh(button);
    closePickerPopup(button);
  }

  function selectNativeLengthUnit(button) {
    const unit = button.dataset.ttEnhancerNativeUnit || getPickerOptionUnit(button).toLowerCase();
    const control = findOpenPositionUnitControl() || resolveStyleUnitControl();
    if (!control || !isNativeLengthUnit(unit)) return false;

    const number = getLengthNumberForControl(control, button);
    const value = normalizeStyleValue(number, unit);
    if (!value) return false;

    if (applyNativeLengthValue(control, value, button, cleanupCustomStyleFocus)) {
      cleanupCustomStyleFocus();
      paintSelectedDvh(button);
      closePickerPopup(button);
      return true;
    }

    return false;
  }

  function handleDvhPointer(event) {
    const nativeButton = getNativeLengthUnitButton(event.target);
    if (nativeButton) {
      event.preventDefault();
      event.stopPropagation();

      const now = Date.now();
      if (now - lastHandledAt < 80) return;
      lastHandledAt = now;

      selectNativeLengthUnit(nativeButton);
      return;
    }

    const button = getExtraUnitButton(event.target);
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    if (now - lastHandledAt < 80) return;
    lastHandledAt = now;

    selectExtraUnit(button);
  }

  function getStyleControlSyncTarget(target) {
    const input = target instanceof HTMLInputElement
      ? target
      : target?.closest?.('input.tt-input-text__input, input');
    if (!input) return null;

    const control = getStyleUnitControlForElement(input);
    if (!control?.valueInput || !document.contains(control.valueInput)) return null;

    const unitInput = getUnitInputForControl(control);
    if (input !== control.valueInput && input !== unitInput) return null;

    return { control, input, unitInput };
  }

  function syncStyleControlLength(control, root, sourceInput) {
    if (!control?.valueInput || !document.contains(control.valueInput)) return;
    if (unlockedCustomUnitInputs.has(control.valueInput)) return;

    const unitInput = getUnitInputForControl(control);
    const unit = String(unitInput?.value || '').trim().toLowerCase();
    const sourceIsUnitInput = sourceInput === unitInput;

    if (sourceIsUnitInput && isNativeLengthUnit(unit)) {
      const hadCustomUnit = getSelectedExtraUnitForControl(control) ||
        getRememberedCustomUnitForControl(control, root) ||
        getExtraUnitPartsForControl(control, root);
      if (!hadCustomUnit) return;

      const value = buildLengthValueForControl(control, unit, root);
      if (value) applyNativeLengthValue(control, value, root);
      return;
    }

    const extraUnit = sourceIsUnitInput && EXTRA_UNITS.includes(unit)
      ? unit
      : getSelectedExtraUnitForControl(control) || getRememberedCustomUnitForControl(control, root);
    if (!EXTRA_UNITS.includes(extraUnit)) return;

    const value = buildLengthValueForControl(control, extraUnit, root);
    if (!value) return;
    applyCustomLengthValue(control, value, root);
  }

  function scheduleStyleControlSync(control, root, sourceInput, delay) {
    const key = control?.valueInput;
    if (!key) return;

    const currentTimer = styleControlSyncTimers.get(key);
    if (currentTimer) clearTimeout(currentTimer);

    const timer = setTimeout(() => {
      styleControlSyncTimers.delete(key);
      syncStyleControlLength(findStyleUnitControlByKey(control) || control, root, sourceInput);
    }, delay);
    styleControlSyncTimers.set(key, timer);
  }

  function handleStyleControlSync(event) {
    if (event.target?.closest?.('.tt-enhancer-custom-unit-editor, .tt-enhancer-custom-unit-editor-popup, .tt-custom-style')) return;
    if (event.type === 'keydown' && event.key !== 'Enter') return;

    const target = getStyleControlSyncTarget(event.target);
    if (!target) return;

    const delay = event.type === 'input' ? 0 : 40;
    scheduleStyleControlSync(target.control, event.target, target.input, delay);
  }

  function getDirectLengthNumberForControl(control) {
    const rawValue = String(control?.valueInput?.value || '').trim();
    const parts = getStyleValueParts(rawValue) || findExtraUnitValueParts(rawValue);
    if (parts?.number) return normalizeEditorNumber(parts.number);
    if (/^-?\d*\.?\d+$/.test(rawValue)) return normalizeEditorNumber(rawValue);
    return '';
  }

  function syncVirtualCustomStyleControl(control, root, unitInput, requireDirectNumber = false, options = {}) {
    const nextControl = findStyleUnitControlByKey(control) || control;
    const nextUnitInput = getUnitInputForControl(nextControl) || unitInput;
    const unit = getSelectedExtraUnitForControl(nextControl) ||
      getRememberedCustomUnitForControl(nextControl, root) ||
      String(nextUnitInput?.value || '').trim().toLowerCase();
    if (!EXTRA_UNITS.includes(unit)) return;

    const number = requireDirectNumber ? getDirectLengthNumberForControl(nextControl) : '';
    const value = requireDirectNumber
      ? normalizeStyleValue(number, unit)
      : buildLengthValueForControl(nextControl, unit, root);
    if (!value) return;

    syncCustomStyleFlagForUnit(nextControl, unit, root, value, options);
    patchLengthControlDisplay(nextControl, value, unit);
  }

  function handleVirtualCustomStyleRefresh(event) {
    if (event.target?.closest?.('.tt-enhancer-custom-unit-editor, .tt-enhancer-custom-unit-editor-popup, .tt-custom-style')) return;
    if (event.type === 'keydown' && event.key !== 'Enter') return;

    const target = getStyleControlSyncTarget(event.target);
    if (!target) return;

    const requireDirectNumber = event.type === 'input';
    const clearRemovalMark = event.isTrusted && (event.type === 'input' || event.type === 'change');
    const inputUnit = String(target.unitInput?.value || '').trim().toLowerCase();
    if (clearRemovalMark && !EXTRA_UNITS.includes(inputUnit)) {
      clearCustomUnitPropertiesRemoved(target.control.properties, event.target);
    }
    const delays = requireDirectNumber ? [120] : [40, 160, 360];
    delays.forEach((delay) => {
      setTimeout(() => {
        syncVirtualCustomStyleControl(target.control, event.target, target.unitInput, requireDirectNumber, { clearRemovalMark });
      }, delay);
    });
  }

  function handleVirtualCustomPropertyRefresh(event) {
    if (!event.target?.closest?.('.tt-custom-style')) return;
    if (event.type === 'keydown' && event.key !== 'Enter') return;

    const row = event.target.closest('.tt-custom-style__content');
    const [nameInput, valueInput] = getCustomStyleRowInputs(row);
    const property = normalizeCssPropertyName(nameInput?.value);
    if (!property || !valueInput) return;

    const delay = event.type === 'input' ? 140 : 80;
    setTimeout(() => {
      const value = String(valueInput.value || '').trim();
      patchTaptopRuntimeCustomProps(row);
      if (getExtraUnitValueParts(value)) {
        promoteCustomStylePropertiesViaTaptop([property], row, value, {
          clearRemovalMark: event.isTrusted && (event.type === 'input' || event.type === 'change')
        });
      } else if (event.type !== 'input' && value) {
        if (isNativeLengthValue(value)) clearCustomUnitPropertiesRemoved([property], row);
        forgetPropertiesCustomUnit([property], row);
      }
      scheduleCustomStylePanelRefresh(row);
    }, delay);
  }

  function getCustomStyleRowProperty(row) {
    const [nameInput] = getCustomStyleRowInputs(row);
    return normalizeCssPropertyName(nameInput?.value);
  }

  function findCustomStyleRowPropInFiber(row, property) {
    const targetProperty = normalizeCssPropertyName(property);
    let node = getReactFiber(row);

    while (node) {
      const prop = findInObject({
        props: node.memoizedProps,
        state: node.memoizedState,
        nodeProps: node.stateNode?.props
      }, (value) => {
        const cssProperty = getRuntimePropCssProperty(value);
        if (!cssProperty || (targetProperty && cssProperty !== targetProperty)) return null;
        if ('source' in value || 'isCustom' in value || 'propertyName' in value) return value;
        return null;
      }, 5, 700);
      if (prop) return prop;
      node = node.return;
    }

    return null;
  }

  function getCustomStyleRowSourceKeys(row, property) {
    const targetProperty = normalizeCssPropertyName(property || getCustomStyleRowProperty(row));
    if (!targetProperty) return [];

    const sourceKeys = [];
    const rowProp = findCustomStyleRowPropInFiber(row, targetProperty);
    addUniqueSourceKey(sourceKeys, rowProp?.source);

    const [, valueInput] = getCustomStyleRowInputs(row);
    const rowValue = String(valueInput?.value || '').trim();
    const runtime = findTaptopRuntime(row);

    try {
      Array.from(runtime?.getCustomProps?.() || []).forEach((prop) => {
        if (getRuntimePropCssProperty(prop) !== targetProperty) return;
        if (rowValue && String(prop?.value || '').trim() && String(prop.value).trim() !== rowValue) return;
        addUniqueSourceKey(sourceKeys, prop?.source);
      });
    } catch {}

    addUniqueSourceKey(sourceKeys, getTaptopSelectorKey(runtime?.selector || findTaptopSelector(row)));
    return sourceKeys;
  }

  function getStyleControlSourceKeys(control, root) {
    if (!control?.properties?.length) return [];

    const sourceKeys = getRuntimePropertySourceKeys(control.properties, root || control.valueInput);
    control.properties.forEach((property) => {
      const row = findCustomStyleRow(property);
      getCustomStyleRowSourceKeys(row, property).forEach((sourceKey) => addUniqueSourceKey(sourceKeys, sourceKey));
    });
    return sourceKeys;
  }

  function scheduleCustomUnitPropertyCleanup(properties, root, explicitSourceKeys = []) {
    const context = getTaptopModelContext(root);
    const sourceKeys = getCustomUnitRemovalSourceKeys(properties, context, explicitSourceKeys);
    context.sourceKeys = sourceKeys;
    [0, 80, 220].forEach((delay) => {
      setTimeout(() => {
        if (!hasActiveCustomUnitRemovalForProperties(properties, sourceKeys, context)) return;
        cleanupRemovedCustomUnitProperties(properties, context, sourceKeys);
      }, delay);
    });
  }

  function getResetControlFromTarget(target) {
    const resetRoot = target?.closest?.('.tt-reset-bem');
    if (!resetRoot || resetRoot.closest('.tt-custom-style')) return null;

    const input = resetRoot.querySelector('input.tt-input-text__input, input');
    return getStyleUnitControlForElement(input) ||
      getStyleUnitControl(resetRoot) ||
      getCustomUnitControlByElementShape(resetRoot);
  }

  function handleCustomUnitResetOrRemove(event) {
    const shouldCleanup = event.type === 'click';
    const removeButton = event.target?.closest?.('.tt-custom-style__remove');
    if (removeButton) {
      const row = removeButton.closest('.tt-styles-block-row')?.querySelector('.tt-custom-style__content');
      const property = getCustomStyleRowProperty(row);
      if (property) {
        const sourceKeys = getCustomStyleRowSourceKeys(row, property);
        markCustomUnitPropertiesRemoved([property], removeButton, sourceKeys);
        if (shouldCleanup) scheduleCustomUnitPropertyCleanup([property], removeButton, sourceKeys);
      }
      return;
    }

    const resetButton = event.target?.closest?.('.tt-reset-bem__body');
    if (!resetButton) return;

    const customStyleRow = resetButton.closest('.tt-custom-style__content');
    if (customStyleRow) {
      const property = getCustomStyleRowProperty(customStyleRow);
      if (property) {
        const sourceKeys = getCustomStyleRowSourceKeys(customStyleRow, property);
        markCustomUnitPropertiesRemoved([property], resetButton, sourceKeys);
        if (shouldCleanup) scheduleCustomUnitPropertyCleanup([property], resetButton, sourceKeys);
      }
      return;
    }

    const control = getResetControlFromTarget(resetButton);
    if (!control?.properties?.length) return;

    const hasRecentRemoval = control.properties.some((property) => wasCustomUnitPropertyRecentlyRemoved(property, resetButton));
    const hasExtraUnit = hasRecentRemoval ||
      getExtraUnitPartsForControl(control, resetButton) ||
      hasCustomStylePropertiesViaTaptop(control.properties, resetButton);
    if (!hasExtraUnit) return;

    const sourceKeys = getStyleControlSourceKeys(control, resetButton);
    markCustomUnitPropertiesRemoved(control.properties, resetButton, sourceKeys);
    if (shouldCleanup) scheduleCustomUnitPropertyCleanup(control.properties, resetButton, sourceKeys);
  }

  function getVisibleStyleUnitControls() {
    const controls = [];
    document.querySelectorAll('.tt-styles-size__item').forEach((item) => {
      const control = getSizeUnitControl(item);
      if (control) controls.push(control);
    });
    document.querySelectorAll('.tt-spacing__item .tt-input-picker').forEach((picker) => {
      const control = getSpacingUnitControl(picker);
      if (control) controls.push(control);
    });
    document.querySelectorAll('.tt-gap-grid__item .tt-input-picker').forEach((picker) => {
      const control = getGapUnitControl(picker);
      if (control) controls.push(control);
    });
    document.querySelectorAll('.tt-input-group').forEach((group) => {
      const control = getFontSizeUnitControl(group);
      if (control) controls.push(control);
    });
    document.querySelectorAll('.tt-border-radius__common__input, .tt-border-radius__corner__input').forEach((group) => {
      const control = getBorderRadiusUnitControl(group);
      if (control) controls.push(control);
    });
    document.querySelectorAll('.tt-popup .tt-styles-indent-editor__popup__input .tt-input-picker').forEach((picker) => {
      const control = getPositionUnitControl(picker);
      if (control) controls.push(control);
    });
    document.querySelectorAll('.tt-styles-position__indent-editor').forEach((editor) => {
      const control = getInlinePositionUnitControl(editor);
      if (control) controls.push(control);
    });
    return controls;
  }

  function patchStyleControlsFromCustomProperties() {
    getVisibleStyleUnitControls().forEach((control) => {
      const parts = getCustomStyleExtraUnitPartsForControl(control, control.valueInput);
      if (!parts) {
        clearStaleCustomUnitDisplay(control, control.valueInput);
        return;
      }

      const unit = parts.unit.toLowerCase();
      const value = `${parts.number}${unit}`;
      rememberControlCustomUnit(control, unit, control.valueInput);
      patchLengthControlDisplay(control, value, unit);
    });
  }

  function syncVisibleSupportedCustomPropertyFlags() {
    if (hasActiveCustomUnitRemovalMarks()) {
      cleanupRemovedCustomUnitRulesInSelectorCollections(getTaptopModelContext());
    }

    getVisibleStyleUnitControls().forEach((control) => {
      if (control.properties?.some((property) => wasCustomUnitPropertyRecentlyRemoved(property, control.valueInput))) {
        cleanupRemovedCustomUnitProperties(control.properties, control.valueInput);
        return;
      }

      const parts = getCustomStyleExtraUnitPartsForControl(control, control.valueInput);
      if (parts) {
        const unit = parts.unit.toLowerCase();
        const value = `${parts.number}${unit}`;
        syncCustomStyleFlagForUnit(control, unit, control.valueInput, value);
        patchLengthControlDisplay(control, value, unit);
        return;
      }

      const rememberedUnit = getRememberedCustomUnitForControl(control, control.valueInput);
      const inputUnit = String(getUnitInputForControl(control)?.value || '').trim().toLowerCase();
      const datasetUnit = String(control?.picker?.dataset.ttEnhancerSelectedUnit || '').trim().toLowerCase();
      if (hasVisibleNativeCustomStyleProperty(control.properties)) {
        forgetControlCustomUnit(control, control.valueInput);
        clearStaleCustomUnitDisplay(control, control.valueInput, true);
        return;
      }

      if (
        EXTRA_UNITS.includes(rememberedUnit) &&
        (inputUnit === rememberedUnit || datasetUnit === rememberedUnit)
      ) {
        demoteCustomStylePropertiesViaTaptop(control.properties, control.valueInput);
        forgetControlCustomUnit(control, control.valueInput);
        clearStaleCustomUnitDisplay(control, control.valueInput);
        return;
      }

      forgetControlCustomUnit(control, control.valueInput);
    });
  }

  function demoteVisibleExtraUnitReadOnlyCustomProperties() {
    document.querySelectorAll('.tt-custom-disable-item').forEach((display) => {
      const parts = findExtraUnitValueParts(display.textContent);
      if (!parts) return;

      const shapedControl = getCustomUnitControlByElementShape(display);
      const control = getCustomUnitControlFromElement(display, parts) ||
        (shapedControl ? Object.assign({}, shapedControl, { unit: parts.unit }) : null);
      if (!control?.properties?.length) return;
      if (control.properties.some((property) => wasCustomUnitPropertyRecentlyRemoved(property, display))) {
        cleanupRemovedCustomUnitProperties(control.properties, display);
        return;
      }

      const unit = parts.unit.toLowerCase();
      const value = `${normalizeEditorNumber(parts.number)}${unit}`;
      patchTaptopRuntimeCustomProps(display);
      syncCustomStyleFlagForUnit(control, unit, display, value);
      demoteRuntimeExtraUnitCustomProps(display);
    });
  }

  function clearStaleCustomUnitDisplay(control, root, force = false) {
    const selector = findTaptopSelector(root || control?.valueInput);
    const rememberedUnit = getRememberedCustomUnitForControl(control, root);
    if (rememberedUnit && !selector) return;
    if (rememberedUnit && selector) forgetControlCustomUnit(control, root);

    const unitInput = getUnitInputForControl(control);
    const inputUnit = String(unitInput?.value || '').trim().toLowerCase();
    const datasetUnit = String(control?.picker?.dataset.ttEnhancerSelectedUnit || '').trim().toLowerCase();
    if (!force && !EXTRA_UNITS.includes(inputUnit) && !EXTRA_UNITS.includes(datasetUnit)) return;

    const nativeParts = getNativeLengthPartsForControl(control, root);
    if (nativeParts?.number) {
      setInputDisplayValue(control.valueInput, normalizeEditorNumber(nativeParts.number));
      setInputDisplayValue(unitInput, nativeParts.unit.toLowerCase());
      return;
    }

    const fallback = getResetFallbackParts(control.properties?.[0]);
    if (!fallback) return;

    if (['auto', 'none', 'normal'].includes(fallback.unit)) {
      setInputDisplayValue(control.valueInput, fallback.unit);
      setInputDisplayValue(unitInput, '-');
      return;
    }

    setInputDisplayValue(control.valueInput, String(fallback.number));
    setInputDisplayValue(unitInput, fallback.unit);
  }

  function patchUnitList(list) {
    if (list.closest('.tt-enhancer-custom-unit-editor-popup')) return;

    if (list.dataset.ttEnhancerDvhPatched === '1') {
      syncSelectedExtraUnit(list);
      return;
    }

    const options = Array.from(list.querySelectorAll('.tt-input-picker-option'));
    const values = options.map((option) => (
      option.querySelector('.tt-input-picker-option__value')?.textContent || ''
    ).trim());
    options.forEach((option, index) => {
      if (EXTRA_UNITS.includes(values[index])) option.dataset.ttEnhancerUnit = values[index];
    });

    if (EXTRA_UNITS.every((unit) => values.indexOf(unit) !== -1)) {
      list.dataset.ttEnhancerDvhPatched = '1';
      syncSelectedExtraUnit(list);
      return;
    }

    if (values.indexOf('vh') === -1 || !values.every((value) => UNIT_VALUES.has(value))) {
      return;
    }

    const control = resolveStyleUnitControl();
    if (!control?.picker || !document.contains(control.picker)) return;

    const vhButton = options[values.indexOf('vh')];
    const insertBeforeButton = options[values.indexOf('auto')] || options[values.indexOf('none')] || options[values.indexOf('vh') + 1];
    const missingUnits = EXTRA_UNITS.filter((unit) => values.indexOf(unit) === -1);
    const extraButtons = missingUnits.map((unit) => makeExtraUnitButton(vhButton, unit));

    extraButtons.forEach((button) => {
      if (insertBeforeButton) insertBeforeButton.parentNode.insertBefore(button, insertBeforeButton);
      else vhButton.parentNode.appendChild(button);
    });
    list.dataset.ttEnhancerDvhPatched = '1';
    syncSelectedExtraUnit(list);
  }

  function patchAllLists() {
    document.querySelectorAll('.tt-input-picker-list').forEach(patchUnitList);
    if (USE_NATIVE_STYLE_CONTROLS) {
      patchTaptopSelectorForCustomUnits();
      patchTaptopRuntimeCustomProps();
      demoteRuntimeExtraUnitCustomProps();
      syncVisibleSupportedCustomPropertyFlags();
      demoteVisibleExtraUnitReadOnlyCustomProperties();
    } else {
      patchStyleControlsFromCustomProperties();
      unlockCustomUnitInputs();
      mountInlineCustomUnitControls();
    }
  }

  function schedulePatchAllLists() {
    if (patchAllListsScheduled) return;
    patchAllListsScheduled = true;
    requestAnimationFrame(() => {
      patchAllListsScheduled = false;
      patchAllLists();
    });
  }

  document.addEventListener('pointerdown', rememberStyleUnitPicker, true);
  document.addEventListener('pointerdown', handleDvhPointer, true);
  document.addEventListener('mousedown', handleDvhPointer, true);
  document.addEventListener('click', handleDvhPointer, true);
  document.addEventListener('focusin', rememberStyleUnitPicker, true);
  if (USE_NATIVE_STYLE_CONTROLS) {
    document.addEventListener('input', handleVirtualCustomStyleRefresh, true);
    document.addEventListener('change', handleVirtualCustomStyleRefresh, true);
    document.addEventListener('focusout', handleVirtualCustomStyleRefresh, true);
    document.addEventListener('keydown', handleVirtualCustomStyleRefresh, true);
    document.addEventListener('input', handleVirtualCustomPropertyRefresh, true);
    document.addEventListener('change', handleVirtualCustomPropertyRefresh, true);
    document.addEventListener('focusout', handleVirtualCustomPropertyRefresh, true);
    document.addEventListener('keydown', handleVirtualCustomPropertyRefresh, true);
    document.addEventListener('click', handleCustomUnitResetOrRemove, true);
  }
  if (!USE_NATIVE_STYLE_CONTROLS) {
    document.addEventListener('pointerdown', handleCustomUnitEditorOutsidePointer, true);
    document.addEventListener('mousedown', handleCustomUnitEditorOutsidePointer, true);
    document.addEventListener('pointerdown', handleCustomUnitUnlockPointer, true);
    document.addEventListener('mousedown', handleCustomUnitUnlockPointer, true);
    document.addEventListener('click', handleCustomUnitUnlockPointer, true);
    document.addEventListener('input', handleStyleControlSync, true);
    document.addEventListener('change', handleStyleControlSync, true);
    document.addEventListener('focusout', handleStyleControlSync, true);
    document.addEventListener('keydown', handleStyleControlSync, true);
    document.addEventListener('input', handleUnlockedCustomUnitInput, true);
    document.addEventListener('change', handleUnlockedCustomUnitInput, true);
    document.addEventListener('focusout', handleUnlockedCustomUnitCommit, true);
    document.addEventListener('keydown', handleUnlockedCustomUnitCommit, true);
    document.addEventListener('pointerdown', handleUnlockedCustomUnitOutsidePointer, true);
    document.addEventListener('mousedown', handleUnlockedCustomUnitOutsidePointer, true);
    document.addEventListener('pointerdown', startPositionDragLoop, true);
    document.addEventListener('mousedown', startPositionDragLoop, true);
    document.addEventListener('input', handlePositionPopupEdit, true);
    document.addEventListener('change', handlePositionPopupEdit, true);
    document.addEventListener('pointermove', handlePositionPopupEdit, true);
    document.addEventListener('mousemove', handlePositionPopupEdit, true);
    document.addEventListener('pointerup', handlePositionPopupEdit, true);
    document.addEventListener('mouseup', handlePositionPopupEdit, true);
    document.addEventListener('pointerup', stopPositionDragLoop, true);
    document.addEventListener('mouseup', stopPositionDragLoop, true);
    document.addEventListener('pointercancel', stopPositionDragLoop, true);
  }

  installDvhValidatorPatch();

  const observer = new MutationObserver(() => schedulePatchAllLists());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  patchAllLists();
})();
