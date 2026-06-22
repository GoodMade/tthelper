(function () {
  const STATE_KEY = '__ttEnhancerLayersKeyboardMove';
  const REORDER_SELECTOR = '.tt-highlight-position .tt-reorder';
  const REORDER_BUTTON_SELECTOR = '.tt-reorder__button';

  try {
    window[STATE_KEY]?.destroy?.();
  } catch {}

  function isEditableTarget(target) {
    const el = target instanceof Element ? target : null;
    if (!el) return false;
    const editable = el.closest('input, textarea, select, [contenteditable="true"], .ace_editor');
    return !!editable;
  }

  function isVisible(el) {
    if (!(el instanceof HTMLElement)) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function getVisibleReorder() {
    const reorders = Array.from(document.querySelectorAll(REORDER_SELECTOR)).filter(isVisible);
    return reorders[reorders.length - 1] || null;
  }

  function clickReorderButton(direction) {
    const reorder = getVisibleReorder();
    if (!reorder) return false;

    const buttons = Array.from(reorder.querySelectorAll(REORDER_BUTTON_SELECTOR)).filter(isVisible);
    const button = buttons[direction < 0 ? 0 : 1];
    if (!button || button.disabled || button.classList.contains('tt-button--state-disabled')) return false;

    dispatchMouseClick(button);
    return true;
  }

  function centerPoint(el, yRatio = 0.5) {
    const rect = el.getBoundingClientRect();
    return {
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height * yRatio)
    };
  }

  function dispatchMouseClick(el) {
    const point = centerPoint(el);
    const opts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: point.x,
      clientY: point.y,
      screenX: window.screenX + point.x,
      screenY: window.screenY + point.y,
      button: 0,
      buttons: 1
    };

    try {
      el.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ pointerId: 1, pointerType: 'mouse', isPrimary: true }, opts)));
      el.dispatchEvent(new PointerEvent('pointerup', Object.assign({ pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 0 }, opts)));
    } catch {}

    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, opts, { buttons: 0 })));
    el.dispatchEvent(new MouseEvent('click', Object.assign({}, opts, { buttons: 0 })));
  }

  function simulateLayerMove(direction) {
    return clickReorderButton(direction);
  }

  function onKeyDown(event) {
    if (!event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    if (isEditableTarget(event.target)) return;

    const direction = event.key === 'ArrowUp' ? -1 : 1;
    if (!simulateLayerMove(direction)) return;

    event.preventDefault();
    event.stopPropagation();
  }

  document.addEventListener('keydown', onKeyDown, true);

  window[STATE_KEY] = {
    destroy() {
      document.removeEventListener('keydown', onKeyDown, true);
      if (window[STATE_KEY] === this) delete window[STATE_KEY];
    }
  };
})();
