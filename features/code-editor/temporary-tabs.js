(function () {
  const MODAL_SELECTOR = '.tt-popup.tt-universal-modal.tt-popup-code-editor__modal';
  const TITLE_SELECTOR = '.tt-popup__title';
  const ACE_SELECTOR = '#ace-editor.ace_editor, .ace_editor';
  const STORAGE_KEY = 'tt_enhancer_code_editor_tabs_v1';
  const MAX_TABS = 9;

  try {
    window.__ttEnhancerCodeTabs?.observer?.disconnect?.();
  } catch {}

  function normalize(value) {
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

  function loadStore() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch {
      return {};
    }
  }

  function saveStore(store) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store || {}));
    } catch {}
  }

  function getAceEditor(modal) {
    const root = modal.querySelector(ACE_SELECTOR);
    if (!root || !window.ace) return null;
    try {
      return ace.edit(root);
    } catch {
      return null;
    }
  }

  function getSelectedLayerContext() {
    const direct = window.__ttEnhancerCurrentEmbedEditorContext;
    if (direct?.key && Date.now() - (Number(direct.updatedAt) || 0) < 15000) return direct;

    const selected = document.querySelector(
      '.tt-layers__item.is-active, .tt-layers__item.active, .tt-layers__item_selected, .tt-layers__item--selected'
    );
    if (!selected) return null;

    const list = selected.closest('.tt-layers__list');
    const index = list ? Array.from(list.querySelectorAll('.tt-layers__item')).indexOf(selected) : -1;
    const text = normalize(selected.querySelector('.tt-layers__item__text')?.textContent || selected.textContent);
    return {
      key: ['selected', index, hashString(text)].join(':'),
      label: text
    };
  }

  function getModalKey(modal, initialCode) {
    const ctx = getSelectedLayerContext();
    if (ctx?.key) return ['embed', location.pathname, ctx.key].join('|');

    const title = normalize(modal.querySelector(TITLE_SELECTOR)?.textContent);
    return ['editor', location.pathname, hashString(title), hashString(initialCode)].join('|');
  }

  function editorValue(editor) {
    try {
      return editor.getValue();
    } catch {
      return '';
    }
  }

  function setEditorValue(editor, value) {
    try {
      editor.setValue(String(value || ''), -1);
      editor.clearSelection?.();
      editor.focus?.();
      editor.resize?.(true);
    } catch {}
  }

  function onMenuKeyDown(event) {
    if (event.key === 'Escape') closeMenu();
  }

  function closeMenu(event) {
    if (event?.target?.closest?.('.tt-code-tabs-menu')) return;

    document.querySelectorAll('.tt-code-tabs-menu').forEach((menu) => menu.remove());
    document.removeEventListener('mousedown', closeMenu, true);
    document.removeEventListener('keydown', onMenuKeyDown, true);
    window.removeEventListener('resize', closeMenu, true);
    document.removeEventListener('scroll', closeMenu, true);
  }

  function placeMenu(menu, x, y) {
    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    const left = Math.min(Math.max(8, x), window.innerWidth - rect.width - 8);
    const top = Math.min(Math.max(8, y), window.innerHeight - rect.height - 8);
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
  }

  function defaultState(initialCode) {
    return {
      active: 0,
      tabs: [{ value: String(initialCode || '') }]
    };
  }

  function readState(key, initialCode) {
    const store = loadStore();
    const existing = store[key];
    if (!existing || !Array.isArray(existing.tabs) || !existing.tabs.length) {
      return defaultState(initialCode);
    }

    existing.tabs = existing.tabs
      .slice(0, MAX_TABS)
      .map((tab) => ({ value: String(tab?.value || '') }));
    existing.active = Math.min(Math.max(Number(existing.active) || 0, 0), existing.tabs.length - 1);
    return existing;
  }

  function writeState(key, state) {
    const store = loadStore();
    store[key] = {
      active: Math.min(Math.max(Number(state.active) || 0, 0), state.tabs.length - 1),
      tabs: state.tabs.slice(0, MAX_TABS).map((tab) => ({ value: String(tab.value || '') }))
    };
    saveStore(store);
  }

  function renderTabs(modal) {
    const ctx = modal.__ttCodeTabs;
    if (!ctx?.wrap) return;

    ctx.list.replaceChildren();
    ctx.state.tabs.forEach((tab, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tt-code-tabs__tab' + (index === ctx.state.active ? ' is-active' : '');
      button.textContent = String(index + 1);
      button.title = index === 0 ? 'Основная вкладка' : `Временная вкладка ${index + 1}`;
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        switchTab(modal, index);
      }, true);
      button.addEventListener('contextmenu', (event) => {
        if (index <= 0) return;
        event.preventDefault();
        event.stopPropagation();
        openTabMenu(modal, index, event);
      }, true);
      ctx.list.appendChild(button);
    });

    ctx.add.disabled = ctx.state.tabs.length >= MAX_TABS;
    ctx.add.style.display = ctx.state.tabs.length >= MAX_TABS ? 'none' : '';
  }

  function persistCurrent(modal) {
    const ctx = modal.__ttCodeTabs;
    if (!ctx?.editor) return;
    ctx.state.tabs[ctx.state.active].value = editorValue(ctx.editor);
    writeState(ctx.key, ctx.state);
  }

  function switchTab(modal, index) {
    const ctx = modal.__ttCodeTabs;
    if (!ctx || index === ctx.state.active || !ctx.state.tabs[index]) return;

    persistCurrent(modal);
    ctx.state.active = index;
    setEditorValue(ctx.editor, ctx.state.tabs[index].value);
    writeState(ctx.key, ctx.state);
    renderTabs(modal);
  }

  function deleteTab(modal, index) {
    const ctx = modal.__ttCodeTabs;
    if (!ctx || index <= 0 || !ctx.state.tabs[index]) return;

    persistCurrent(modal);
    ctx.state.tabs.splice(index, 1);

    if (ctx.state.active === index) {
      ctx.state.active = Math.min(index, ctx.state.tabs.length - 1);
    } else if (ctx.state.active > index) {
      ctx.state.active -= 1;
    }

    setEditorValue(ctx.editor, ctx.state.tabs[ctx.state.active].value);
    writeState(ctx.key, ctx.state);
    renderTabs(modal);
  }

  function openTabMenu(modal, index, event) {
    if (index <= 0) return;

    closeMenu();

    const menu = document.createElement('div');
    menu.className = 'tt-code-tabs-menu';
    menu.setAttribute('role', 'menu');

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'tt-code-tabs-menu__item';
    deleteButton.textContent = 'Удалить';
    deleteButton.setAttribute('role', 'menuitem');
    deleteButton.addEventListener('click', (clickEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      deleteTab(modal, index);
      closeMenu();
    }, true);

    menu.appendChild(deleteButton);
    menu.addEventListener('mousedown', (mouseEvent) => {
      mouseEvent.stopPropagation();
    }, true);

    placeMenu(menu, event.clientX, event.clientY);

    setTimeout(() => {
      document.addEventListener('mousedown', closeMenu, true);
      document.addEventListener('keydown', onMenuKeyDown, true);
      window.addEventListener('resize', closeMenu, true);
      document.addEventListener('scroll', closeMenu, true);
    }, 0);
  }

  function addTab(modal) {
    const ctx = modal.__ttCodeTabs;
    if (!ctx || ctx.state.tabs.length >= MAX_TABS) return;

    persistCurrent(modal);
    ctx.state.tabs.push({ value: ctx.state.tabs[ctx.state.active].value });
    ctx.state.active = ctx.state.tabs.length - 1;
    setEditorValue(ctx.editor, ctx.state.tabs[ctx.state.active].value);
    writeState(ctx.key, ctx.state);
    renderTabs(modal);
  }

  function buildControls(modal) {
    const title = modal.querySelector(TITLE_SELECTOR);
    if (!title || title.querySelector('.tt-code-tabs')) return null;

    const wrap = document.createElement('span');
    wrap.className = 'tt-code-tabs';

    const list = document.createElement('span');
    list.className = 'tt-code-tabs__list';

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'tt-code-tabs__add';
    add.title = 'Новая временная вкладка';
    add.setAttribute('aria-label', 'Новая временная вкладка');
    add.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      addTab(modal);
    }, true);

    wrap.appendChild(list);
    wrap.appendChild(add);
    title.appendChild(wrap);
    return { wrap, list, add };
  }

  function bindSaveButtons(modal) {
    const ctx = modal.__ttCodeTabs;
    if (!ctx) return;

    modal.querySelectorAll('button, [role="button"], .tt-button').forEach((button) => {
      if (!(button instanceof HTMLElement) || button.dataset.ttCodeTabsSaveBound === '1') return;
      const text = normalize(button.textContent);
      if (!/^Сохранить$/i.test(text)) return;
      button.dataset.ttCodeTabsSaveBound = '1';
      button.addEventListener('mousedown', () => persistCurrent(modal), true);
      button.addEventListener('click', () => persistCurrent(modal), true);
    });
  }

  function enhanceModal(modal) {
    if (!(modal instanceof HTMLElement) || modal.dataset.ttCodeTabsApplied === '1') return;

    const editor = getAceEditor(modal);
    if (!editor) return;

    const initialCode = editorValue(editor);
    const key = getModalKey(modal, initialCode);
    const controls = buildControls(modal);
    if (!controls) return;

    modal.dataset.ttCodeTabsApplied = '1';
    modal.__ttCodeTabs = {
      editor,
      key,
      state: readState(key, initialCode),
      wrap: controls.wrap,
      list: controls.list,
      add: controls.add
    };

    if (modal.__ttCodeTabs.state.active > 0) {
      setEditorValue(editor, modal.__ttCodeTabs.state.tabs[modal.__ttCodeTabs.state.active].value);
    }

    editor.session?.on?.('change', () => persistCurrent(modal));
    bindSaveButtons(modal);
    renderTabs(modal);
  }

  function scheduleEnhance(modal) {
    [0, 80, 180, 360, 700].forEach((delay) => {
      setTimeout(() => enhanceModal(modal), delay);
    });
  }

  function findModalsFromNode(node) {
    if (!(node instanceof HTMLElement)) return [];
    if (node.matches(MODAL_SELECTOR)) return [node];
    return Array.from(node.querySelectorAll?.(MODAL_SELECTOR) || []);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        findModalsFromNode(node).forEach(scheduleEnhance);
      }
    }
    document.querySelectorAll(MODAL_SELECTOR).forEach(bindSaveButtons);
  });

  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  document.querySelectorAll(MODAL_SELECTOR).forEach(scheduleEnhance);

  window.__ttEnhancerCodeTabs = { observer };
})();
