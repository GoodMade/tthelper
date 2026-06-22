(function () {
  const STATE_KEY = '__ttEnhancerMultiSelectionState';
  const CSS_CLASS = 'tt-enhancer-multi-selected';
  
  function debug(...args) {
    console.log('[MultiSelect Debug]', ...args);
  }

  try {
    window[STATE_KEY]?.destroy?.();
  } catch {}

  let selectedIds = new Set();
  let lastClickedId = null;
  let isDestroyed = false;
  let runtimeRequire = null;

  function getRuntimeRequire() {
    if (runtimeRequire) return runtimeRequire;
    const chunk = window.rspackChunktaptop_design_editor;
    if (!chunk || typeof chunk.push !== 'function') return null;
    try {
      const chunkId = `tt-enhancer-multi-selection-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
        layers: req(39510)?.A,
        events: req(91893)?.A
      };
    } catch {
      return null;
    }
  }

  function emitLayoutChanged() {
    const api = getTaptopApi();
    if (!api) return;

    try {
      api.layers?.setMap?.();
    } catch {}

    try {
      const events = api.events;
      [
        events?.ON_HTML_UPDATE,
        events?.ON_CSS_CHANGE,
        events?.ON_CHANGE_TAG_DISPLAY,
        events?.ON_CHANGE,
        events?.ON_CHANGE_TAG,
        events?.ON_CHANGE_TAG_DATA,
        events?.ON_UPDATE,
        events?.ON_DATA_CHANGE
      ].forEach((eventName) => {
        if (eventName === events?.ON_CSS_CHANGE) events.emit?.(eventName, null, true);
        else if (eventName) events.emit?.(eventName);
      });
    } catch {}

    try {
      window.dispatchEvent(new Event('resize'));
    } catch {}
  }

  function extractIdFromLayerItem(itemEl) {
    if (!itemEl) return null;
    
    // We might have tagged it already
    const existing = itemEl.getAttribute('data-enhancer-tag-id');
    if (existing) return existing;

    // TapTop layers might have a native attribute like data-id or id if we missed it
    if (itemEl.dataset && itemEl.dataset.tagId) return itemEl.dataset.tagId;

    // Fallback to React Fiber
    const keys = Object.keys(itemEl);
    const reactKey = keys.find(k => k.startsWith('__reactProps$') || k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
    if (!reactKey) return null;
    
    let fiber = itemEl[reactKey];
    if (!fiber) return null;

    // The key is often the ID in lists
    if (fiber.key && typeof fiber.key === 'string' && fiber.key.length > 5) return fiber.key;
    if (fiber.return && fiber.return.key && typeof fiber.return.key === 'string' && fiber.return.key.length > 5) return fiber.return.key;

    // Try finding id in props
    try {
        let props = fiber.memoizedProps || fiber;
        if (props.id) return props.id;
        if (props.tag && props.tag.id) return props.tag.id;
        if (props.item && props.item.id) return props.item.id;
    } catch {}

    return null;
  }

  function getVisualOrderFromDOM() {
    const items = Array.from(document.querySelectorAll('.tt-layers__item'));
    const order = [];
    items.forEach(item => {
        const id = extractIdFromLayerItem(item);
        if (id && !order.includes(id)) {
            order.push(id);
            // Proactively tag it
            item.setAttribute('data-enhancer-tag-id', id);
        }
    });
    return order;
  }

  function updateDOM() {
    if (isDestroyed) return;
    
    document.querySelectorAll(`.${CSS_CLASS}`).forEach(el => {
      el.classList.remove(CSS_CLASS);
    });

    const api = getTaptopApi();
    const activeId = api?.runtime?.selected;
    if (activeId) {
      const activeLayerItem = document.querySelector('.tt-layers__item.is-active, .tt-layers__item.active, .tt-layers__item_selected, .tt-layers__item--selected');
      if (activeLayerItem) {
        activeLayerItem.setAttribute('data-enhancer-tag-id', activeId);
      }
    }

    // Try to ensure all items are tagged
    getVisualOrderFromDOM();

    selectedIds.forEach(id => {
      const canvasItem = document.querySelector(`[data-tag-id="${id}"]`);
      if (canvasItem) canvasItem.classList.add(CSS_CLASS);
      
      const layerItem = document.querySelector(`.tt-layers__item[data-enhancer-tag-id="${id}"]`);
      if (layerItem) layerItem.classList.add(CSS_CLASS);
      else {
        // try to find by text if possible? No, we can't reliably.
        // We will just let the user know by styling
      }
    });

    // Sync layer panel attributes if needed
    if (api?.layout?.tree?.tags) {
      const tags = api.layout.tree.tags;
      selectedIds.forEach(id => {
        const tag = tags[id];
        if (tag && tag.name) {
          // Attempt to find layer item by name if it doesn't have data-enhancer-tag-id
          // This is a bit risky but helps visual selection
          const items = Array.from(document.querySelectorAll('.tt-layers__item:not([data-enhancer-tag-id])'));
          for (let item of items) {
            const nameEl = item.querySelector('.tt-layers__item-name, .tt-layers__name');
            if (nameEl && nameEl.textContent.trim() === tag.name) {
              item.setAttribute('data-enhancer-tag-id', id);
              item.classList.add(CSS_CLASS);
              break;
            }
          }
        }
      });
    }

    window.__ttEnhancerMultiSelectedIds = Array.from(selectedIds);
  }

  function toggleSelection(id) {
    debug('Toggling selection for id:', id);
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
      lastClickedId = id;
    }
    debug('Current selectedIds:', Array.from(selectedIds));
    updateDOM();
  }

  function selectRange(id) {
    debug('Selecting range to id:', id);
    if (!lastClickedId) {
      debug('No lastClickedId, falling back to toggle');
      toggleSelection(id);
      return;
    }

    const api = getTaptopApi();
    if (!api || !api.layout || !api.layout.tree) {
      debug('No tree available for range selection');
      toggleSelection(id);
      return;
    }

    const uniqueIds = getVisualOrderFromDOM();
    const startIdx = uniqueIds.indexOf(lastClickedId);
    const endIdx = uniqueIds.indexOf(id);
    
    debug('Visual range indices in DOM:', startIdx, endIdx);

    if (startIdx !== -1 && endIdx !== -1) {
      const min = Math.min(startIdx, endIdx);
      const max = Math.max(startIdx, endIdx);
      for (let i = min; i <= max; i++) {
        selectedIds.add(uniqueIds[i]);
      }
    } else {
      selectedIds.add(id);
    }
    
    lastClickedId = id;
    debug('Current selectedIds:', Array.from(selectedIds));
    updateDOM();
  }

  function stripModifiersAndRedispatch(e) {
    if (isDestroyed) return;
    if (e.__isFakeEvent) return;
    if (e.button !== 0) return; // Only left clicks

    const layerItem = e.target.closest('.tt-layers__item');
    const canvasItem = e.target.closest('[data-tag-id]');
    const targetEl = layerItem || canvasItem;
    
    if (!targetEl) {
      if (e.type === 'pointerdown' || (!window.PointerEvent && e.type === 'mousedown')) {
        if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
          debug('Clicked outside layers, clearing selection');
          selectedIds.clear();
          lastClickedId = null;
          updateDOM();
        }
      }
      return;
    }

    // Try to tag the layer item early if we can guess its ID
    if (layerItem && !layerItem.hasAttribute('data-enhancer-tag-id')) {
        // Natively, TapTop will select it after click. We'll tag it later.
    }

    const isMac = navigator.userAgent.toLowerCase().includes('mac');
    const isMultiModifier = isMac ? e.metaKey : e.ctrlKey;
    const isShift = e.shiftKey;

    if (isMultiModifier || isShift) {
      debug('Original event with modifier intercepted:', e.type, 'isMulti:', isMultiModifier, 'isShift:', isShift);
      e.stopPropagation();
      e.preventDefault();

      let FakeEventClass = MouseEvent;
      let eventInit = {
        bubbles: true, cancelable: true, view: window, detail: e.detail,
        screenX: e.screenX, screenY: e.screenY, clientX: e.clientX, clientY: e.clientY,
        ctrlKey: false, altKey: e.altKey, shiftKey: false, metaKey: false,
        button: e.button, buttons: e.buttons,
      };

      if (window.PointerEvent && e instanceof PointerEvent) {
        FakeEventClass = PointerEvent;
        eventInit.pointerId = e.pointerId;
        eventInit.width = e.width;
        eventInit.height = e.height;
        eventInit.pressure = e.pressure;
        eventInit.pointerType = e.pointerType;
        eventInit.isPrimary = e.isPrimary;
      }

      const fakeEvent = new FakeEventClass(e.type, eventInit);
      fakeEvent.__isFakeEvent = true;
      debug('Dispatching fake event:', fakeEvent.type);
      e.target.dispatchEvent(fakeEvent);

      if (e.type === 'pointerdown' || (!window.PointerEvent && e.type === 'mousedown')) {
        setTimeout(() => {
          const api = getTaptopApi();
          const id = api?.runtime?.selected;
          debug('After fake down event, TapTop native selected ID is:', id);
          if (!id) return;
          
          if (layerItem) {
            layerItem.setAttribute('data-enhancer-tag-id', id);
          }

          if (isMultiModifier) {
            toggleSelection(id);
          } else if (isShift) {
            selectRange(id);
          }
        }, 50);
      }
    } else {
      if (e.type === 'pointerdown' || (!window.PointerEvent && e.type === 'mousedown')) {
        setTimeout(() => {
          const api = getTaptopApi();
          const id = api?.runtime?.selected;
          debug('Normal click processed by TapTop. New ID:', id);
          if (!id) return;
          
          if (layerItem) {
            layerItem.setAttribute('data-enhancer-tag-id', id);
          }

          selectedIds.clear();
          selectedIds.add(id);
          lastClickedId = id;
          updateDOM();
        }, 50);
      }
    }
  }

  function onKeyDown(e) {
    if (isDestroyed) return;
    
    if (e.shiftKey && (e.code === 'KeyA' || e.key === 'a' || e.key === 'A' || e.key === 'Ф' || e.key === 'ф')) {
      if (selectedIds.size > 1) {
        debug('Shift+A pressed with multiple items. Attempting manual group...');
        
        const api = getTaptopApi();
        if (api) {
            if (api.layout) debug('API layout keys:', Object.keys(api.layout));
            if (api.runtime) debug('API runtime keys:', Object.keys(api.runtime));
            if (api.layers) debug('API layers keys:', Object.keys(api.layers));
            if (api.events) debug('API events keys:', Object.keys(api.events));
        }
        
        // Let TapTop natively wrap the last clicked item (the natively selected one)
        // We will wait for the new Div to be created, and then move other items inside it.
        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            const api = getTaptopApi();
            if (!api || !api.layout || !api.layout.tree) return;
            
            const newParentId = api.runtime.selected;
            if (!newParentId) {
                debug(`[Attempt ${attempts}] api.runtime.selected is empty`);
                if (attempts > 20) clearInterval(checkInterval);
                return;
            }
            
            const tree = api.layout.tree;
            const newParentTag = tree.tags[newParentId];
            
            if (!newParentTag) {
                debug(`[Attempt ${attempts}] Selected ID ${newParentId} not found in tree.tags`);
                if (attempts > 20) clearInterval(checkInterval);
                return;
            }

            if (newParentTag.type !== 'div') {
                debug(`[Attempt ${attempts}] Selected ID ${newParentId} is a ${newParentTag.type}, not a div. Waiting...`);
                if (attempts > 20) clearInterval(checkInterval);
                return;
            }
            
            // Success! We found the new wrapper div!
            clearInterval(checkInterval);
            debug(`[Attempt ${attempts}] TapTop created new wrapper div:`, newParentId);
            
            // Move other selected items into this new div
            const otherIds = Array.from(selectedIds).filter(id => id !== lastClickedId && id !== newParentId);
            debug('Other IDs to move:', otherIds);
            
            let changed = false;
            for (let id of otherIds) {
                const tag = tree.tags[id];
                if (!tag) continue;
                
                const oldParentId = tag.parentId;
                const oldParent = tree.tags[oldParentId];
                
                if (oldParent && oldParent.children) {
                    oldParent.children = oldParent.children.filter(childId => childId !== id);
                }
                
                tag.parentId = newParentId;
                if (!newParentTag.children) newParentTag.children = [];
                newParentTag.children.push(id);
                changed = true;
            }
            
            if (changed) {
                debug('Moved elements to new wrapper. Attempting to update TapTop UI...');
                
                // Increment tree version to force update
                if (tree.version) tree.version++;
                
                // We need to trigger an event or UI sync
                if (api.layout.sync) api.layout.sync();
                emitLayoutChanged();
                
                // Clear selectedIds except the new wrapper
                selectedIds.clear();
                selectedIds.add(newParentId);
                lastClickedId = newParentId;
                updateDOM();
            }
        }, 100); // Check every 100ms
      }
    }
  }
  
  const interval = setInterval(() => {
    updateDOM();
  }, 500);

  const eventsToStrip = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click'];
  eventsToStrip.forEach(type => {
    document.addEventListener(type, stripModifiersAndRedispatch, true);
  });
  
  document.addEventListener('keydown', onKeyDown, true);

  debug('Multi-selection script loaded successfully. Events bound.');

  window[STATE_KEY] = {
    destroy: () => {
      debug('Multi-selection script destroying...');
      isDestroyed = true;
      clearInterval(interval);
      eventsToStrip.forEach(type => {
        document.removeEventListener(type, stripModifiersAndRedispatch, true);
      });
      document.removeEventListener('keydown', onKeyDown, true);
      selectedIds.clear();
      delete window.__ttEnhancerMultiSelectedIds;
      delete window[STATE_KEY];
    }
  };

})();
