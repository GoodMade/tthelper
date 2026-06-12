(function () {
  const STATE_KEY = '__ttEnhancerRightPanelRails';
  const STORAGE_KEY = 'ttEnhancerRightPanelRailsStateV2';
  const LEGACY_STORAGE_KEY = 'ttEnhancerRightPanelRailsLeft';
  const TARGET_CLASS = 'tt-enhancer-right-panel-rails-target';
  const FLOATING_CLASS = 'tt-enhancer-right-panel-rails-floating';
  const PINNED_CLASS = 'tt-enhancer-right-panel-rails-pinned-left';
  const DETACHED_CLASS = 'tt-enhancer-right-panel-rails-detached';
  const DRAGGING_CLASS = 'tt-enhancer-right-panel-rails-dragging';
  const BODY_DRAGGING_CLASS = 'tt-enhancer-right-panel-rails-is-dragging';
  const HANDLE_CLASS = 'tt-enhancer-right-panel-rails-handle';
  const GHOST_CLASS = 'tt-enhancer-right-panel-rails-ghost';
  const EXPAND_BUTTON_CLASS = 'tt-enhancer-right-panel-rails-expand-button';
  const CANVAS_EXPANDED_CLASS = 'tt-enhancer-right-panel-rails-canvas-expanded';
  const OFFSET_VAR = '--tt-enhancer-right-panel-rails-offset';
  const LEFT_DOCK_PANEL_THRESHOLD = 96;
  const LEFT_DOCK_POINTER_THRESHOLD = 28;
  const LEFT_DOCK_OVERSWIPE_DISTANCE = 18;
  const LEFT_DOCK_POINTER_EDGE = 10;
  const LEFT_DOCK_POINTER_OVERSWIPE = -10;
  const LEFT_DOCK_HOLD_MS = 2000;
  const RIGHT_RETURN_THRESHOLD = 96;
  const PANEL_SELECTORS = [
    '.tt-design-mode-right-panel',
    '.tt-right-panel',
    '.tt-styles-panel',
    '.right-panel-popup'
  ];
  const LEFT_PANEL_SELECTORS = [
    '.tt-layers',
    '.tt-widgets',
    '.tt-design-mode-left-panel',
    '.tt-left-panel',
    '[class*="left-panel"]'
  ];
  const CANVAS_SELECTORS = [
    '.tt-app__canvas',
    '.tt-design-mode__canvas',
    '.tt-design-mode-canvas',
    '.tt-canvas',
    '[class*="canvas"]'
  ];
  const PIN_STYLE_PROPS = [
    'position',
    'left',
    'top',
    'right',
    'bottom',
    'width',
    'height',
    'maxHeight',
    'zIndex',
    'margin',
    'transform',
    'willChange'
  ];
  const SHIFT_STYLE_PROPS = ['marginLeft', 'marginRight', 'width', 'maxWidth', 'flex', 'flexBasis'];

  try {
    window[STATE_KEY]?.destroy?.();
  } catch {}

  let panel = null;
  let observer = null;
  let syncRaf = 0;
  let drag = null;
  let currentLeft = readSavedLeft();
  let shiftedCanvas = null;
  let expandButton = null;

  function readSavedLeft() {
    try {
      window.localStorage?.removeItem(LEGACY_STORAGE_KEY);
      const state = JSON.parse(window.localStorage?.getItem(STORAGE_KEY) || 'null');
      const value = Number(state?.left);
      return state?.version === 2 && Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  }

  function saveLeft(value) {
    try {
      if (Number.isFinite(value)) {
        window.localStorage?.setItem(STORAGE_KEY, JSON.stringify({
          version: 2,
          left: Math.round(value)
        }));
      }
    } catch {}
  }

  function clearSavedLeft() {
    try {
      window.localStorage?.removeItem(STORAGE_KEY);
    } catch {}
  }

  function isElementVisible(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element.closest('.tt-enhancer-ai-panel, .tt-search-replace')) return false;

    const rect = element.getBoundingClientRect();
    if (rect.width < 220 || rect.height < 240) return false;

    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  function getPanelSelectorIndex(element) {
    const index = PANEL_SELECTORS.findIndex((selector) => element.matches(selector));
    return index === -1 ? PANEL_SELECTORS.length : index;
  }

  function getPanelCandidates() {
    const seen = new Set();
    const candidates = [];

    PANEL_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (!(element instanceof HTMLElement) || seen.has(element) || !isElementVisible(element)) return;
        seen.add(element);
        candidates.push(element);
      });
    });

    return candidates.filter((candidate) => {
      const parentPanel = candidate.parentElement?.closest?.(PANEL_SELECTORS.join(','));
      return !parentPanel || !seen.has(parentPanel);
    });
  }

  function findPanel() {
    if (panel?.isConnected && isElementVisible(panel)) return panel;

    return getPanelCandidates()
      .map((candidate) => {
        const rect = candidate.getBoundingClientRect();
        const selectorScore = (PANEL_SELECTORS.length - getPanelSelectorIndex(candidate)) * 10000;
        const rightScore = Math.max(0, 2000 - Math.abs(window.innerWidth - rect.right));
        const heightScore = Math.min(rect.height, 1200);
        return { candidate, score: selectorScore + rightScore + heightScore };
      })
      .sort((a, b) => b.score - a.score)[0]?.candidate || null;
  }

  function createHandle(kind) {
    const handle = document.createElement('div');
    handle.className = `${HANDLE_CLASS} ${HANDLE_CLASS}--${kind}`;
    handle.tabIndex = 0;
    handle.setAttribute('role', 'button');
    handle.setAttribute('aria-label', 'Переместить правую панель по горизонтали');
    handle.addEventListener('pointerdown', onPointerDown, true);
    handle.addEventListener('dblclick', (event) => {
      event.preventDefault();
      event.stopPropagation();
      resetPanel();
    }, true);
    return handle;
  }

  function mountHandles(target) {
    if (!target || target.dataset.ttEnhancerRightPanelRails === '1') return;
    target.dataset.ttEnhancerRightPanelRails = '1';
    if (getComputedStyle(target).position === 'static') {
      target.dataset.ttEnhancerRightPanelRailsPosition = target.style.position || '';
      target.style.position = 'relative';
    }
    target.classList.add(TARGET_CLASS);
    target.append(createHandle('top'));
  }

  function unmountHandles(target) {
    if (!target) return;
    target.querySelectorAll(`:scope > .${HANDLE_CLASS}`).forEach((node) => node.remove());
    restoreInlineStyles(target, 'ttEnhancerRightPanelRailsPinStyles', PIN_STYLE_PROPS);
    restoreInlineStyles(target, 'ttEnhancerRightPanelRailsDetachStyles', PIN_STYLE_PROPS);
    target.classList.remove(TARGET_CLASS, FLOATING_CLASS, PINNED_CLASS, DETACHED_CLASS, DRAGGING_CLASS);
    target.style.removeProperty(OFFSET_VAR);
    delete target.dataset.ttEnhancerRightPanelRailsPinBaseRect;
    if (Object.prototype.hasOwnProperty.call(target.dataset, 'ttEnhancerRightPanelRailsPosition')) {
      target.style.position = target.dataset.ttEnhancerRightPanelRailsPosition;
      delete target.dataset.ttEnhancerRightPanelRailsPosition;
    }
    delete target.dataset.ttEnhancerRightPanelRails;
  }

  function getLayoutRect(target) {
    const wasFloating = target.classList.contains(FLOATING_CLASS);
    const wasDragging = target.classList.contains(DRAGGING_CLASS);
    const previousOffset = target.style.getPropertyValue(OFFSET_VAR);

    if (wasFloating) target.classList.remove(FLOATING_CLASS);
    if (wasDragging) target.classList.remove(DRAGGING_CLASS);
    target.style.removeProperty(OFFSET_VAR);

    const rect = target.getBoundingClientRect();

    if (wasFloating) target.classList.add(FLOATING_CLASS);
    if (wasDragging) target.classList.add(DRAGGING_CLASS);
    if (previousOffset) target.style.setProperty(OFFSET_VAR, previousOffset);

    return rect;
  }

  function clampLeft(left, rect) {
    const minLeft = 0;
    const maxLeft = Math.max(minLeft, window.innerWidth - rect.width);
    return Math.min(maxLeft, Math.max(minLeft, left));
  }

  function removeGhost() {
    document.querySelectorAll(`.${GHOST_CLASS}`).forEach((node) => node.remove());
  }

  function removeExpandButton() {
    expandButton?.remove?.();
    document.querySelectorAll(`.${EXPAND_BUTTON_CLASS}`).forEach((node) => node.remove());
    expandButton = null;
  }

  function isCanvasExpanded() {
    return !!shiftedCanvas?.isConnected && shiftedCanvas.classList.contains(CANVAS_EXPANDED_CLASS);
  }

  function createExpandButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = EXPAND_BUTTON_CLASS;
    button.setAttribute('aria-label', 'Расширить холст вправо');
    button.title = 'Расширить холст вправо';
    button.textContent = '→';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!panel) return;
      detachPanelForCanvas();
    }, true);
    return button;
  }

  function updateExpandButton(slotRect) {
    if (!panel || panel.classList.contains(PINNED_CLASS) || isCanvasExpanded()) {
      removeExpandButton();
      return;
    }

    if (currentLeft == null || Math.abs(currentLeft - slotRect.left) < 24) {
      removeExpandButton();
      return;
    }

    if (!expandButton?.isConnected) {
      expandButton = createExpandButton();
      document.body.appendChild(expandButton);
    }

    const size = Math.min(92, Math.max(64, Math.round(slotRect.width * 0.22)));
    expandButton.style.width = `${size}px`;
    expandButton.style.height = `${size}px`;
    expandButton.style.left = `${Math.round(slotRect.left + slotRect.width / 2 - size / 2)}px`;
    expandButton.style.top = `${Math.round(slotRect.top + slotRect.height / 2 - size / 2)}px`;
  }

  function clearDockHoldTimer(activeDrag = drag) {
    if (!activeDrag?.dockTimer) return;
    clearTimeout(activeDrag.dockTimer);
    activeDrag.dockTimer = 0;
  }

  function finishActiveDrag() {
    if (!drag) return;
    clearDockHoldTimer(drag);
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', onPointerUp, true);
    document.removeEventListener('pointercancel', onPointerUp, true);
    document.body?.classList.remove(BODY_DRAGGING_CLASS);
    panel?.classList.remove(DRAGGING_CLASS);
    drag = null;
  }

  function completeLeftDockHold(activeDrag) {
    if (!drag || drag !== activeDrag || !panel || panel.classList.contains(PINNED_CLASS)) return;
    finishActiveDrag();
    pinPanelLeft();
  }

  function completeLeftDockSwipe() {
    if (!drag || !panel || panel.classList.contains(PINNED_CLASS)) return;
    finishActiveDrag();
    pinPanelLeft();
  }

  function syncLeftDockGesture(rawLeft, pointerX, deltaX) {
    if (!drag || drag.wasPinned || panel?.classList?.contains(PINNED_CLASS)) return;

    const isMovingLeft = deltaX < 0;
    const isOverswiped = rawLeft <= -LEFT_DOCK_OVERSWIPE_DISTANCE || pointerX <= LEFT_DOCK_POINTER_OVERSWIPE;
    const isPushingAtEdge = isMovingLeft && pointerX <= LEFT_DOCK_POINTER_EDGE && rawLeft <= LEFT_DOCK_POINTER_EDGE;

    if (isOverswiped || isPushingAtEdge) {
      completeLeftDockSwipe();
      return;
    }

    if (rawLeft <= LEFT_DOCK_PANEL_THRESHOLD || pointerX <= LEFT_DOCK_POINTER_THRESHOLD) {
      if (!drag.dockTimer) {
        drag.dockTimer = setTimeout(() => completeLeftDockHold(drag), LEFT_DOCK_HOLD_MS);
      }
      return;
    }

    clearDockHoldTimer(drag);
  }

  function rememberInlineStyles(element, key, props) {
    if (!element || element.dataset[key]) return;
    const styles = {};
    props.forEach((prop) => {
      styles[prop] = element.style[prop] || '';
    });
    element.dataset[key] = JSON.stringify(styles);
  }

  function restoreInlineStyles(element, key, props) {
    if (!element?.dataset?.[key]) return;

    let styles = {};
    try {
      styles = JSON.parse(element.dataset[key] || '{}') || {};
    } catch {}

    props.forEach((prop) => {
      element.style[prop] = styles[prop] || '';
    });
    delete element.dataset[key];
  }

  function resetCanvasShift() {
    if (shiftedCanvas?.isConnected) {
      restoreInlineStyles(shiftedCanvas, 'ttEnhancerRightPanelRailsShiftStyles', SHIFT_STYLE_PROPS);
    }
    shiftedCanvas?.classList?.remove?.('tt-enhancer-right-panel-rails-shift-target', CANVAS_EXPANDED_CLASS);
    shiftedCanvas = null;
  }

  function getLeftDockEdge(panelRect) {
    const candidates = [];

    LEFT_PANEL_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (!(element instanceof HTMLElement) || !isElementVisible(element) || element.contains(panel)) return;
        const rect = element.getBoundingClientRect();
        if (rect.left > panelRect.left || rect.right > panelRect.left + 8) return;
        if (rect.width < 32 || rect.width > 520 || rect.height < 180) return;
        candidates.push(rect.right);
      });
    });

    if (!candidates.length) {
      Array.from(document.body?.children || []).forEach((element) => {
        if (!(element instanceof HTMLElement) || !isElementVisible(element) || element.contains(panel)) return;
        const rect = element.getBoundingClientRect();
        if (rect.left > 24 || rect.right > panelRect.left + 8) return;
        if (rect.width < 32 || rect.width > 520 || rect.height < 220) return;
        candidates.push(rect.right);
      });
    }

    return Math.round(Math.max(0, ...candidates));
  }

  function findCanvasShiftTarget(leftEdge, panelRect) {
    const seen = new Set();
    const candidates = [];

    CANVAS_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (!(element instanceof HTMLElement) || seen.has(element) || !isElementVisible(element)) return;
        if (element === panel || element.contains(panel) || panel?.contains(element)) return;
        const rect = element.getBoundingClientRect();
        if (rect.left < leftEdge - 24 || rect.left > panelRect.left + 24) return;
        if (rect.right < panelRect.left + 160 || rect.width < 260 || rect.height < 240) return;
        seen.add(element);
        const classScore = /canvas/i.test(element.className || '') ? 10000 : 0;
        const leftScore = Math.max(0, 2000 - Math.abs(rect.left - leftEdge) * 10);
        candidates.push({ element, score: classScore + leftScore - rect.width * rect.height / 100000 });
      });
    });

    if (!candidates.length) {
      const pointY = Math.min(window.innerHeight - 20, Math.max(panelRect.top + 80, panelRect.top + panelRect.height / 2));
      document.elementsFromPoint(leftEdge + 12, pointY).forEach((element) => {
        let current = element instanceof HTMLElement ? element : null;
        while (current && current !== document.body && current !== document.documentElement) {
          if (!seen.has(current) && isElementVisible(current) && current !== panel && !current.contains(panel)) {
            const rect = current.getBoundingClientRect();
            if (rect.left >= leftEdge - 24 && rect.right > panelRect.left + 160 && rect.width > 260 && rect.height > 240) {
              seen.add(current);
              candidates.push({ element: current, score: -rect.width * rect.height / 100000 });
            }
          }
          current = current.parentElement;
        }
      });
    }

    return candidates.sort((a, b) => b.score - a.score)[0]?.element || null;
  }

  function findRightExpansionTarget(panelRect) {
    const seen = new Set();
    const candidates = [];

    CANVAS_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (!(element instanceof HTMLElement) || seen.has(element) || !isElementVisible(element)) return;
        if (element === panel || element.contains(panel) || panel?.contains(element)) return;
        const rect = element.getBoundingClientRect();
        if (rect.left > panelRect.left - 120 || rect.right < panelRect.left - 160) return;
        if (rect.width < 260 || rect.height < 240) return;
        seen.add(element);
        const classScore = /canvas/i.test(element.className || '') ? 10000 : 0;
        const rightScore = Math.max(0, 2000 - Math.abs(rect.right - panelRect.left) * 10);
        candidates.push({ element, score: classScore + rightScore - rect.width * rect.height / 100000 });
      });
    });

    if (!candidates.length) {
      const pointY = Math.min(window.innerHeight - 20, Math.max(panelRect.top + 80, panelRect.top + panelRect.height / 2));
      document.elementsFromPoint(Math.max(1, panelRect.left - 20), pointY).forEach((element) => {
        let current = element instanceof HTMLElement ? element : null;
        while (current && current !== document.body && current !== document.documentElement) {
          if (!seen.has(current) && isElementVisible(current) && current !== panel && !current.contains(panel)) {
            const rect = current.getBoundingClientRect();
            if (rect.left < panelRect.left && rect.width > 260 && rect.height > 240) {
              seen.add(current);
              candidates.push({ element: current, score: -rect.width * rect.height / 100000 });
            }
          }
          current = current.parentElement;
        }
      });
    }

    return candidates.sort((a, b) => b.score - a.score)[0]?.element || null;
  }

  function applyCanvasShift(leftEdge, width, panelRect) {
    resetCanvasShift();
    const target = findCanvasShiftTarget(leftEdge, panelRect);
    if (!target) return;

    const targetRect = target.getBoundingClientRect();
    const computed = getComputedStyle(target);
    const marginLeft = Number.parseFloat(computed.marginLeft) || 0;
    const targetWidth = Number.parseFloat(computed.width) || targetRect.width;

    rememberInlineStyles(target, 'ttEnhancerRightPanelRailsShiftStyles', SHIFT_STYLE_PROPS);
    target.classList.add('tt-enhancer-right-panel-rails-shift-target');
    target.style.marginLeft = `${Math.round(marginLeft + width)}px`;
    if (targetWidth > width) {
      target.style.width = `${Math.round(targetWidth - width)}px`;
      target.style.maxWidth = `${Math.round(targetWidth - width)}px`;
    }
    shiftedCanvas = target;
  }

  function applyRightCanvasExpansion(panelRect) {
    const target = findRightExpansionTarget(panelRect);
    if (!target) return;

    resetCanvasShift();
    const targetRect = target.getBoundingClientRect();
    const computed = getComputedStyle(target);
    const targetWidth = Number.parseFloat(computed.width) || targetRect.width;
    const flexBasis = Number.parseFloat(computed.flexBasis);
    const marginRight = Number.parseFloat(computed.marginRight) || 0;
    const expansionWidth = Math.round(panelRect.width);

    rememberInlineStyles(target, 'ttEnhancerRightPanelRailsShiftStyles', SHIFT_STYLE_PROPS);
    target.classList.add('tt-enhancer-right-panel-rails-shift-target', CANVAS_EXPANDED_CLASS);
    target.style.width = `${Math.round(targetWidth + expansionWidth)}px`;
    target.style.maxWidth = `${Math.round(targetWidth + expansionWidth)}px`;
    target.style.marginRight = `${Math.round(marginRight - expansionWidth)}px`;
    if (Number.isFinite(flexBasis)) {
      target.style.flexBasis = `${Math.round(flexBasis + expansionWidth)}px`;
    }
    shiftedCanvas = target;
    removeExpandButton();
  }

  function getPinnedBaseRect() {
    try {
      const rect = JSON.parse(panel?.dataset?.ttEnhancerRightPanelRailsPinBaseRect || 'null');
      if (rect && Number.isFinite(rect.left) && Number.isFinite(rect.top) && Number.isFinite(rect.width)) {
        return rect;
      }
    } catch {}

    const currentRect = panel?.getBoundingClientRect?.();
    return currentRect ? {
      left: currentRect.left,
      top: currentRect.top,
      width: currentRect.width,
      height: currentRect.height
    } : null;
  }

  function applyPinnedLayout(baseRect = null) {
    if (!panel?.classList?.contains(PINNED_CLASS)) return;

    const normalRect = baseRect || getPinnedBaseRect();
    if (!normalRect) return;

    const leftEdge = getLeftDockEdge(normalRect);
    const width = Math.round(normalRect.width);
    const height = Math.min(Math.round(normalRect.height), window.innerHeight - Math.round(normalRect.top));

    panel.style.left = `${leftEdge}px`;
    panel.style.top = `${Math.round(normalRect.top)}px`;
    panel.style.width = `${width}px`;
    panel.style.height = `${Math.max(120, height)}px`;
    panel.style.maxHeight = `${Math.max(120, height)}px`;
    applyCanvasShift(leftEdge, width, normalRect);
  }

  function pinPanelLeft() {
    const nextPanel = findPanel();
    if (!nextPanel) return;

    panel = nextPanel;
    mountHandles(panel);
    currentLeft = null;
    clearSavedLeft();
    removeGhost();
    removeExpandButton();
    restoreDetachedPanel();
    panel.classList.remove(FLOATING_CLASS, DETACHED_CLASS, DRAGGING_CLASS);
    panel.style.removeProperty(OFFSET_VAR);

    const normalRect = getLayoutRect(panel);
    rememberInlineStyles(panel, 'ttEnhancerRightPanelRailsPinStyles', PIN_STYLE_PROPS);
    panel.dataset.ttEnhancerRightPanelRailsPinBaseRect = JSON.stringify({
      left: normalRect.left,
      top: normalRect.top,
      width: normalRect.width,
      height: normalRect.height
    });
    panel.classList.add(PINNED_CLASS);
    applyPinnedLayout(normalRect);
  }

  function unpinPanel() {
    if (!panel) return;
    resetCanvasShift();
    panel.classList.remove(PINNED_CLASS);
    restoreInlineStyles(panel, 'ttEnhancerRightPanelRailsPinStyles', PIN_STYLE_PROPS);
    delete panel.dataset.ttEnhancerRightPanelRailsPinBaseRect;
  }

  function detachPanelForCanvas() {
    if (!panel) return;

    const visualRect = panel.getBoundingClientRect();
    currentLeft = visualRect.left;
    resetCanvasShift();
    removeGhost();
    removeExpandButton();

    rememberInlineStyles(panel, 'ttEnhancerRightPanelRailsDetachStyles', PIN_STYLE_PROPS);
    panel.classList.remove(FLOATING_CLASS, PINNED_CLASS, DRAGGING_CLASS);
    panel.classList.add(DETACHED_CLASS);
    panel.style.removeProperty(OFFSET_VAR);
    panel.style.left = `${Math.round(visualRect.left)}px`;
    panel.style.top = `${Math.round(visualRect.top)}px`;
    panel.style.width = `${Math.round(visualRect.width)}px`;
    panel.style.height = `${Math.round(visualRect.height)}px`;
    panel.style.maxHeight = `${Math.round(Math.min(visualRect.height, window.innerHeight - visualRect.top))}px`;
  }

  function restoreDetachedPanel() {
    if (!panel) return;
    panel.classList.remove(DETACHED_CLASS);
    restoreInlineStyles(panel, 'ttEnhancerRightPanelRailsDetachStyles', PIN_STYLE_PROPS);
  }

  function setFloating(left, baseRect) {
    if (!panel) return;

    const rect = baseRect || getLayoutRect(panel);
    currentLeft = clampLeft(left, rect);

    if (panel.classList.contains(DETACHED_CLASS)) {
      panel.style.left = `${Math.round(currentLeft)}px`;
      panel.style.top = `${Math.round(rect.top)}px`;
      removeGhost();
      return;
    }

    panel.classList.add(FLOATING_CLASS);
    panel.style.setProperty(OFFSET_VAR, `${Math.round(currentLeft - rect.left)}px`);
    removeGhost();
    updateExpandButton(rect);
  }

  function shouldReturnToRightSlot(activeDrag) {
    if (!panel || !activeDrag?.hasMoved || activeDrag.wasPinned || panel.classList.contains(PINNED_CLASS)) return false;
    if (!Number.isFinite(currentLeft)) return false;

    const layoutLeft = activeDrag.rect?.left;
    const panelWidth = activeDrag.rect?.width || panel.getBoundingClientRect().width;
    const rightEdgeLeft = window.innerWidth - panelWidth;

    return Math.abs(currentLeft - layoutLeft) <= RIGHT_RETURN_THRESHOLD
      || currentLeft >= rightEdgeLeft - RIGHT_RETURN_THRESHOLD;
  }

  function resetPanel() {
    currentLeft = null;
    clearSavedLeft();
    removeGhost();
    removeExpandButton();
    if (!panel) return;
    unpinPanel();
    restoreDetachedPanel();
    panel.classList.remove(FLOATING_CLASS, DRAGGING_CLASS);
    panel.style.removeProperty(OFFSET_VAR);
  }

  function onPointerDown(event) {
    if (event.button !== 0 || drag || !(event.currentTarget instanceof HTMLElement)) return;
    const targetPanel = event.currentTarget.closest(`.${TARGET_CLASS}`);
    if (!(targetPanel instanceof HTMLElement)) return;

    panel = targetPanel;
    const movedRect = panel.getBoundingClientRect();
    const isPinned = panel.classList.contains(PINNED_CLASS);
    const isDetached = panel.classList.contains(DETACHED_CLASS);
    const rect = isPinned || isDetached ? movedRect : getLayoutRect(panel);
    const startLeft = panel.classList.contains(FLOATING_CLASS) ? movedRect.left : rect.left;

    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startLeft,
      rect,
      wasPinned: isPinned,
      wasDetached: isDetached,
      hasMoved: false,
      dockTimer: 0
    };

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    panel.classList.add(DRAGGING_CLASS);
    document.body?.classList.add(BODY_DRAGGING_CLASS);
    removeGhost();
    removeExpandButton();
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('pointercancel', onPointerUp, true);
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    const deltaX = event.clientX - drag.startX;
    if (!drag.hasMoved && Math.abs(deltaX) < 2) return;
    if (!drag.hasMoved && drag.wasPinned) {
      const visualLeft = panel?.getBoundingClientRect?.().left || drag.startLeft;
      unpinPanel();
      drag.rect = getLayoutRect(panel);
      drag.startLeft = visualLeft;
      setFloating(visualLeft, drag.rect);
    }
    drag.hasMoved = true;
    const rawLeft = drag.startLeft + deltaX;
    setFloating(rawLeft, drag.rect);
    syncLeftDockGesture(rawLeft, event.clientX, deltaX);
  }

  function onPointerUp(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', onPointerUp, true);
    document.removeEventListener('pointercancel', onPointerUp, true);
    document.body?.classList.remove(BODY_DRAGGING_CLASS);
    panel?.classList.remove(DRAGGING_CLASS);
    clearDockHoldTimer(drag);

    if (shouldReturnToRightSlot(drag)) {
      resetPanel();
    } else if (drag.hasMoved && currentLeft != null) {
      saveLeft(currentLeft);
    }
    drag = null;
  }

  function syncPanel() {
    syncRaf = 0;
    const nextPanel = findPanel();

    if (!nextPanel) {
      if (!drag) removeGhost();
      return;
    }

    if (panel && panel !== nextPanel && !drag) {
      unmountHandles(panel);
    }

    panel = nextPanel;
    mountHandles(panel);

    if (currentLeft != null) setFloating(currentLeft);
    if (panel.classList.contains(PINNED_CLASS)) applyPinnedLayout();
  }

  function scheduleSync() {
    if (syncRaf) return;
    syncRaf = requestAnimationFrame(syncPanel);
  }

  function destroy() {
    if (syncRaf) cancelAnimationFrame(syncRaf);
    observer?.disconnect?.();
    resetCanvasShift();
    removeExpandButton();
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', onPointerUp, true);
    document.removeEventListener('pointercancel', onPointerUp, true);
    window.removeEventListener('resize', scheduleSync);
    document.body?.classList.remove(BODY_DRAGGING_CLASS);
    document.querySelectorAll(`.${HANDLE_CLASS}`).forEach((node) => node.remove());
    document.querySelectorAll(`.${TARGET_CLASS}`).forEach((target) => {
      restoreInlineStyles(target, 'ttEnhancerRightPanelRailsPinStyles', PIN_STYLE_PROPS);
      restoreInlineStyles(target, 'ttEnhancerRightPanelRailsDetachStyles', PIN_STYLE_PROPS);
      target.classList.remove(TARGET_CLASS, FLOATING_CLASS, PINNED_CLASS, DETACHED_CLASS, DRAGGING_CLASS);
      target.style.removeProperty(OFFSET_VAR);
      delete target.dataset.ttEnhancerRightPanelRailsPinBaseRect;
      if (Object.prototype.hasOwnProperty.call(target.dataset, 'ttEnhancerRightPanelRailsPosition')) {
        target.style.position = target.dataset.ttEnhancerRightPanelRailsPosition;
        delete target.dataset.ttEnhancerRightPanelRailsPosition;
      }
      delete target.dataset.ttEnhancerRightPanelRails;
    });
    removeGhost();
    clearDockHoldTimer(drag);
    drag = null;
    if (window[STATE_KEY]?.destroy === destroy) delete window[STATE_KEY];
  }

  syncPanel();
  observer = new MutationObserver(scheduleSync);
  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  window.addEventListener('resize', scheduleSync);

  window[STATE_KEY] = { destroy };
})();
