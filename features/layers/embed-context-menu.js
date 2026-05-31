(function () {
  const LAYERS_LIST_SELECTOR = '.tt-layers__list';
  const LAYER_ITEM_SELECTOR = '.tt-layers__item';
  const INLINE_BUTTON_ATTR = 'data-tt-enhancer-embed-inline-edit';
  const VISIBILITY_TOGGLES_ATTR = 'data-tt-enhancer-layer-visibility-toggles';
  const OPEN_EDITOR_TEXT = 'Открыть редактор кода';
  const EDIT_TEXT = 'Редактировать';

  try {
    window.__ttEnhancerEmbedContextMenu?.observer?.disconnect?.();
    document.removeEventListener('contextmenu', window.__ttEnhancerEmbedContextMenu?.onContextMenu, true);
    document.removeEventListener('click', window.__ttEnhancerEmbedContextMenu?.onLayerClick, true);
    document.removeEventListener('mouseup', window.__ttEnhancerEmbedContextMenu?.onLayerClick, true);
    document.removeEventListener('mousedown', window.__ttEnhancerEmbedContextMenu?.onDocumentMouseDown, true);
    document.removeEventListener('scroll', window.__ttEnhancerEmbedContextMenu?.onViewportChange, true);
    window.removeEventListener('resize', window.__ttEnhancerEmbedContextMenu?.onViewportChange, true);
  } catch {}

  let lastLayerContext = null;
  let raf = 0;

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
      return /code|embed|html|script/i.test(`${className} ${href}`);
    });
  }

  function isEmbedLayerItem(item) {
    if (!item) return false;
    if (hasCodeIcon(item)) return true;

    const text = normalizeText(item.querySelector('.tt-layers__item__text')?.textContent);
    return /^(global|css)$/i.test(text) && normalizeText(item.parentElement?.textContent).includes('CSS');
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

  function ensureInlineEditButton() {
    if (!lastLayerContext || !document.contains(lastLayerContext)) return;

    if (!isEmbedLayerItem(lastLayerContext) && !findOpenCodeEditorButton()) {
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
    if (window.__ttEnhancerLayerVisibilityTogglesInteracting) return;
    if (event.target?.closest?.(`[${INLINE_BUTTON_ATTR}]`)) return;
    if (event.target?.closest?.(`[${VISIBILITY_TOGGLES_ATTR}]`)) return;
    if (event.target?.closest?.(LAYERS_LIST_SELECTOR)) return;

    lastLayerContext = null;
    removeInlineButtons();
  }

  function scheduleFromMutation() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      ensureInlineEditButton();
    });
  }

  function onViewportChange() {
    const button = document.querySelector(`[${INLINE_BUTTON_ATTR}][data-tt-layer-button-owner="active"]`);
    if (button) positionInlineButton(button);
  }

  const observer = new MutationObserver((mutations) => {
    const onlyOwnButton = mutations.every((mutation) => {
      const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
      return nodes.length && nodes.every((node) => node instanceof HTMLElement && node.hasAttribute(INLINE_BUTTON_ATTR));
    });
    if (!onlyOwnButton) scheduleFromMutation();
  });

  document.addEventListener('click', onLayerClick, true);
  document.addEventListener('mouseup', onLayerClick, true);
  document.addEventListener('mousedown', onDocumentMouseDown, true);
  document.addEventListener('scroll', onViewportChange, true);
  window.addEventListener('resize', onViewportChange, true);
  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });

  window.__ttEnhancerEmbedContextMenu = { observer, onLayerClick, onDocumentMouseDown, onViewportChange };
})();
