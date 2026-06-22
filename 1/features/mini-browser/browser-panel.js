(function () {
  const BUTTON_ID = 'tt-enhancer-mini-browser-button';
  const SIDE_BUTTON_ID = 'tt-enhancer-side-browser-button';
  const OPEN_SITE_BUTTON_ID = 'tt-enhancer-open-site-button';
  const PANEL_ID = 'tt-enhancer-mini-browser-panel';
  const CODE_EDITOR_MODAL_SELECTOR = '.tt-popup.tt-universal-modal.tt-popup-code-editor__modal, .tt-popup-code-editor__modal';
  const CODE_EDITOR_STACK_ACTIVE_CLASS = 'tt-enhancer--stack-active';
  const CODE_EDITOR_STACK_BACKGROUND_CLASS = 'tt-enhancer--stack-background';
  const STACK_ACTIVE_CLASS = 'is-stack-active';
  const MINI_BROWSER_ENABLED_KEY = 'miniBrowser_enabled';
  const SIDE_PANEL_BROWSER_KEY = 'miniBrowser_sidePanelBrowser';
  const PINNED_LINKS_KEY = 'miniBrowser_pinnedTabs';
  const TABS_KEY = 'miniBrowser_tabs';
  const OPEN_SITE_BUTTON_KEY = 'miniBrowser_openCurrentSiteTabButton';
  const BOOKMARKS_KEY = 'miniBrowser_bookmarks';
  const OPEN_KEY = 'tt_enhancer_mini_browser_open';
  const ACTIVE_KEY = 'tt_enhancer_mini_browser_active';
  const PINNED_KEY = 'tt_enhancer_mini_browser_pinned';
  const SHIFTED_LEFT_KEY = 'tt_enhancer_mini_browser_shifted_left';
  const WIDTH_KEY = 'tt_enhancer_mini_browser_width';
  const LAST_WIDTH_KEY = 'tt_enhancer_mini_browser_last_width';
  const MOBILE_VIEW_KEY = 'tt_enhancer_mini_browser_mobile_view';
  const FIT_DEVICE_KEY = 'tt_enhancer_mini_browser_fit_device';
  const LEGACY_HISTORY_KEY = 'tt_enhancer_mini_browser_history';
  const HISTORY_KEY = 'miniBrowser_history';
  const BOOKMARK_SEARCH_HISTORY_KEY = 'tt_enhancer_mini_browser_bookmark_search_history';
  const HISTORY_LIMIT = 12;
  const MIN_PANEL_WIDTH = 380;
  const DEFAULT_BOOKMARK_FOLDER_ID = 'favorites';
  const RECENT_BOOKMARK_LIMIT = 8;
  const BOOKMARK_SEARCH_HISTORY_LIMIT = 8;
  const DEVICE_PRESETS = [
    { id: 'default', title: 'По умолчанию', width: 0, height: 0 },
    { id: 'iphone-se', title: 'iPhone SE', width: 375, height: 667 },
    { id: 'iphone-12-pro', title: 'iPhone 12 Pro', width: 390, height: 844 },
    { id: 'iphone-14-pro-max', title: 'iPhone 14 Pro Max', width: 430, height: 932 },
    { id: 'pixel-7', title: 'Pixel 7', width: 412, height: 915 },
    { id: 'ipad-mini', title: 'iPad Mini', width: 768, height: 1024 },
    { id: 'ipad-air', title: 'iPad Air', width: 820, height: 1180 },
    { id: 'ipad-pro', title: 'iPad Pro', width: 1024, height: 1366 },
    { id: 'full-hd', title: 'Full HD', width: 1920, height: 1080 }
  ];

  const DEFAULT_TABS = [
    { id: 'gemini', title: 'Gemini', url: 'https://gemini.google.com', active: true },
    { id: 'deepseek', title: 'Deepseek', url: 'https://chat.deepseek.com', active: false },
    { id: 'claude', title: 'Claude', url: 'https://claude.ai', active: false },
    { id: 'chatgpt', title: 'ChatGPT', url: 'https://openai.com', active: false },
    { id: 'qwen', title: 'Qwen', url: 'https://chat.qwen.ai', active: false },
    { id: 'kimi', title: 'Kimi', url: 'https://www.kimi.com', active: false },
    { id: 'glm', title: 'GLM', url: 'https://chat.z.ai', active: false },
    { id: 'gigachat', title: 'GigaChat', url: 'https://giga.chat', active: false }
  ];
  const DEFAULT_PINNED_LINKS = [
    { id: 'project-site', title: 'Сайт проекта', url: '', active: true, dynamicUrl: 'currentSite' },
    ...DEFAULT_TABS
  ];

  const existing = window.__ttEnhancerMiniBrowser;
  if (existing?.destroy) {
    try {
      existing.destroy({ silent: true });
    } catch (e) {}
  }

  const state = {
    observer: null,
    button: null,
    sideButton: null,
    panel: null,
    tabs: [],
    pinnedLinks: [],
    isMiniBrowserEnabled: false,
    isSidePanelBrowserEnabled: false,
    showOpenSiteButton: false,
    bookmarks: { version: 1, folders: [] },
    history: [],
    frames: new Map(),
    titleRequests: new Map(),
    storageListener: null,
    documentPointerListener: null,
    windowBlurListener: null,
    windowResizeListener: null,
    buttonSyncFrame: 0,
    resizeCleanup: null,
    activeId: '',
    isOpen: false,
    isPinned: true,
    isShiftedLeft: false,
    isMobileView: false,
    mobileDeviceId: 'default',
    isFitDevice: false,
    fitBeforeWidth: '',
    bookmarkPopupOpen: false,
    bookmarkDrawerOpen: false,
    bookmarkSearchOpen: false,
    bookmarkSearchQuery: '',
    activeBookmarkFolderId: '',
    isDestroyed: false,
    mount,
    destroy
  };

  function isContextInvalidatedError(error) {
    return String(error?.message || error || '').toLowerCase().includes('extension context invalidated');
  }

  function safeChromeCall(callback, fallback) {
    try {
      if (!chrome?.runtime?.id) return typeof fallback === 'function' ? fallback() : fallback;
      return callback();
    } catch (e) {
      if (!isContextInvalidatedError(e)) throw e;
      destroy({ silent: true });
      return typeof fallback === 'function' ? fallback() : fallback;
    }
  }

  function safeRuntimeSendMessage(message, callback) {
    return safeChromeCall(() => chrome.runtime.sendMessage(message, callback));
  }

  function createBlankTab() {
    return {
      id: uid('tab'),
      title: 'Новая вкладка',
      url: '',
      active: true,
      custom: true,
      deviceId: 'default',
      fitDevice: false
    };
  }

  function cloneTabs(tabs) {
    const source = Array.isArray(tabs) ? tabs : DEFAULT_TABS;
    const normalized = source.map((tab, index) => ({
      id: String(tab.id || 'tab-' + Date.now() + '-' + index),
      title: String(tab.title || tab.url || 'Новая вкладка'),
      url: normalizeUrl(tab.url || ''),
      active: tab.active !== false,
      deleted: !!tab.deleted,
      deviceId: normalizeDeviceId(tab.deviceId || 'default'),
      fitDevice: !!tab.fitDevice
    })).filter((tab) => !tab.deleted && tab.active && (tab.url || !tab.id.startsWith('custom-')));

    return normalized.length ? normalized : [createBlankTab()];
  }

  function clonePinnedLinks(rawTabs) {
    let source = Array.isArray(rawTabs) && rawTabs.length
      ? rawTabs.map((tab) => ({ ...tab }))
      : DEFAULT_PINNED_LINKS.map((tab) => ({ ...tab }));
    source = source.filter((tab) => {
      return !tab?.deleted || DEFAULT_PINNED_LINKS.some((defaultTab) => isSamePinnedDefault(tab, defaultTab));
    });

    DEFAULT_PINNED_LINKS.forEach((defaultTab) => {
      const exists = source.some((tab) => isSamePinnedDefault(tab, defaultTab));
      if (!exists) source.push({ ...defaultTab });
    });

    return source.map((tab, index) => {
      const url = resolvePinnedLinkUrl(tab);
      if (!url || tab?.active === false || tab?.deleted) return null;
      return {
        id: String(tab?.id || 'pinned-' + index),
        title: String(tab?.title || titleFromUrl(url)),
        url
      };
    }).filter(Boolean);
  }

  function isSamePinnedDefault(tab, defaultTab) {
    if (!tab || !defaultTab) return false;
    if (tab.id === defaultTab.id) return true;
    if (defaultTab.dynamicUrl) return tab.dynamicUrl === defaultTab.dynamicUrl;
    return normalizeUrl(tab.url || '') === normalizeUrl(defaultTab.url || '');
  }

  function resolvePinnedLinkUrl(tab) {
    if (tab?.dynamicUrl === 'currentSite') return currentSiteUrl();
    return normalizeUrl(tab?.url || '');
  }

  function uid(prefix) {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function cloneBookmarks(raw) {
    const sourceFolders = Array.isArray(raw?.folders) ? raw.folders : [];
    const folders = sourceFolders.map((folder, folderIndex) => {
      const seen = new Set();
      const bookmarks = (Array.isArray(folder?.bookmarks) ? folder.bookmarks : []).map((bookmark, bookmarkIndex) => {
        const url = normalizeUrl(bookmark?.url || '');
        if (!url || seen.has(url)) return null;
        seen.add(url);
        return {
          id: String(bookmark.id || uid('bookmark-' + folderIndex + '-' + bookmarkIndex)),
          title: String(bookmark.title || titleFromUrl(url)),
          url,
          addedAt: Number(bookmark.addedAt) || Date.now()
        };
      }).filter(Boolean);

      return {
        id: String(folder?.id || uid('folder-' + folderIndex)),
        title: String(folder?.title || 'Папка'),
        createdAt: Number(folder?.createdAt) || Date.now(),
        bookmarks
      };
    }).filter((folder) => folder.id && folder.title);

    if (!folders.some((folder) => folder.id === DEFAULT_BOOKMARK_FOLDER_ID)) {
      folders.unshift({
        id: DEFAULT_BOOKMARK_FOLDER_ID,
        title: 'Избранное',
        createdAt: 0,
        bookmarks: []
      });
    }

    return { version: 1, folders };
  }

  function activeTabs() {
    return state.tabs.filter((tab) => tab.active && !tab.deleted);
  }

  function normalizeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw)) return raw;
    return 'https://' + raw;
  }

  function titleFromUrl(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (e) {
      return url;
    }
  }

  function currentSiteUrl() {
    try {
      const url = new URL(window.location.href);
      if (!/^https?:$/.test(url.protocol)) return '';
      return url.origin + '/';
    } catch (e) {
      return '';
    }
  }

  function localGet(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value == null ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }

  function localSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  }

  function iconSvg(name) {
    if (name === 'close') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.3 19.7 2.89 18.29 9.17 12 2.89 5.71 4.3 4.3l6.29 6.29 6.3-6.29 1.41 1.41Z"/></svg>';
    }
    if (name === 'external') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3ZM5 5h7v2H7v10h10v-5h2v7H5V5Z"/></svg>';
    }
    if (name === 'external-thin') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M14 3.5h6.5V10M20.5 3.5l-10 10M11.5 5.5h-6v13h13v-6"/></svg>';
    }
    if (name === 'window') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 4v8h16V9H4Zm0-2v1h16V7H4Z"/></svg>';
    }
    if (name === 'phone') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 3v14h10V5H7Zm4 15v1h2v-1h-2Z"/></svg>';
    }
    if (name === 'fit') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h6v2H7.41l3.3 3.29-1.42 1.42L6 7.41V10H4V4Zm10 0h6v6h-2V7.41l-3.29 3.3-1.42-1.42 3.3-3.29H14V4ZM9.29 13.29l1.42 1.42L7.41 18H10v2H4v-6h2v2.59l3.29-3.3Zm5.42 0 3.29 3.3V14h2v6h-6v-2h2.59l-3.3-3.29 1.42-1.42Z"/></svg>';
    }
    if (name === 'sidepanel') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v10h10V7H4Zm12 0v10h4V7h-4Z"/></svg>';
    }
    if (name === 'sidepanel-thin') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1" d="M4.5 5.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Zm10 0v13"/></svg>';
    }
    if (name === 'refresh') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.45 10.9h-2.13A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h8V3l-3.35 3.35Z"/></svg>';
    }
    if (name === 'plus') {
      return '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>';
    }
    if (name === 'pin') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15.5 4.5 4 4-3 3 1 5-1 1-4-4-5.5 5.5-2-2 5.5-5.5-4-4 1-1 5 1 3-3Z"/></svg>';
    }
    if (name === 'pin-filled') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m15.45 3.1 5.45 5.45-3.25 3.25.92 4.6-2.17 2.17-3.95-3.95-5.8 5.8-3.07-3.07 5.8-5.8-3.95-3.95 2.17-2.17 4.6.92 3.25-3.25Z"/></svg>';
    }
    if (name === 'shift-left') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m7-7-7 7 7 7"/></svg>';
    }
    if (name === 'star') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m12 2.6 2.83 5.74 6.33.92-4.58 4.46 1.08 6.3L12 17.04l-5.66 2.98 1.08-6.3-4.58-4.46 6.33-.92L12 2.6Z"/></svg>';
    }
    if (name === 'star-filled') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2 2.95 6.42 7.05.84-5.21 4.8 1.38 6.94L12 17.55 5.83 21l1.38-6.94L2 9.26l7.05-.84L12 2Z"/></svg>';
    }
    if (name === 'folder') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm2 2v10h14V8h-7.83l-2-2H5v2Z"/></svg>';
    }
    if (name === 'back') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m10.83 12 4.58 4.59L14 18l-6-6 6-6 1.41 1.41L10.83 12Z"/></svg>';
    }
    if (name === 'search') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.5 4a5.5 5.5 0 0 1 4.39 8.81l5.15 5.15-1.41 1.41-5.15-5.15A5.5 5.5 0 1 1 9.5 4Zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/></svg>';
    }
    if (name === 'browser') {
      return '<svg width="25" height="25" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 5v7h16v-7H4Zm0-3v1h16V7H4Zm2.25.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm2.5 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm2.5 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"/></svg>';
    }
    return '<svg width="25" height="25" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.5c.55 3.15 2.33 4.93 5.5 5.5-3.17.57-4.95 2.35-5.5 5.5-.57-3.15-2.35-4.93-5.5-5.5 3.15-.57 4.93-2.35 5.5-5.5Zm5.6 9.1c.32 1.84 1.36 2.88 3.2 3.2-1.84.33-2.88 1.36-3.2 3.2-.33-1.84-1.36-2.87-3.2-3.2 1.84-.32 2.87-1.36 3.2-3.2ZM7.2 13.8c.25 1.43 1.06 2.24 2.5 2.5-1.44.25-2.25 1.06-2.5 2.5-.26-1.44-1.07-2.25-2.5-2.5 1.43-.26 2.24-1.07 2.5-2.5Z"/></svg>';
  }

  function stopTaptopModalEvents(element) {
    const stop = (event) => event.stopPropagation();
    ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach((eventName) => {
      element.addEventListener(eventName, stop);
    });
  }

  function bringMiniBrowserToFront() {
    state.panel?.classList.add(STACK_ACTIVE_CLASS);
    document.querySelectorAll(CODE_EDITOR_MODAL_SELECTOR).forEach((modal) => {
      modal.classList.remove(CODE_EDITOR_STACK_ACTIVE_CLASS);
      modal.classList.add(CODE_EDITOR_STACK_BACKGROUND_CLASS);
    });
  }

  function showNotice(text) {
    if (!state.panel) return;
    let notice = state.panel.querySelector('.tt-enhancer-mini-browser-panel__notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'tt-enhancer-mini-browser-panel__notice';
      state.panel.appendChild(notice);
    }
    notice.textContent = text;
    notice.classList.add('is-visible');
    clearTimeout(state.noticeTimer);
    state.noticeTimer = setTimeout(() => {
      notice.classList.remove('is-visible');
    }, 4200);
  }

  function readTabs(callback) {
    safeChromeCall(() => chrome.storage.sync.get({ [TABS_KEY]: null }, (settings) => {
      const storedTabs = Array.isArray(settings[TABS_KEY]) ? settings[TABS_KEY] : null;
      const rawTabs = storedTabs || DEFAULT_TABS;
      const tabs = cloneTabs(rawTabs);
      if (!storedTabs || tabs.length !== rawTabs.length) {
        chrome.storage.sync.set({ [TABS_KEY]: tabs });
      }
      callback(tabs);
    }), () => callback(cloneTabs(DEFAULT_TABS)));
  }

  function readPinnedLinks(callback) {
    safeChromeCall(() => chrome.storage.sync.get({ [PINNED_LINKS_KEY]: DEFAULT_PINNED_LINKS }, (settings) => {
      callback(clonePinnedLinks(settings[PINNED_LINKS_KEY]));
    }), () => callback(clonePinnedLinks(DEFAULT_PINNED_LINKS)));
  }

  function readBookmarks(callback) {
    safeChromeCall(() => chrome.storage.sync.get({ [BOOKMARKS_KEY]: null }, (settings) => {
      const bookmarks = cloneBookmarks(settings[BOOKMARKS_KEY]);
      if (!settings[BOOKMARKS_KEY]) {
        chrome.storage.sync.set({ [BOOKMARKS_KEY]: bookmarks });
      }
      callback(bookmarks);
    }), () => callback(cloneBookmarks(null)));
  }

  function saveTabs() {
    safeChromeCall(() => chrome.storage.sync.set({
      [TABS_KEY]: state.tabs.filter((tab) => tab.url || !tab.transient)
    }));
  }

  function saveBookmarks() {
    safeChromeCall(() => chrome.storage.sync.set({ [BOOKMARKS_KEY]: state.bookmarks }));
  }

  function cloneHistory(items) {
    return (Array.isArray(items) ? items : []).map((item) => {
      const url = normalizeUrl(item?.url || '');
      if (!url) return null;
      return {
        title: String(item.title || titleFromUrl(url)),
        url,
        updatedAt: Number(item.updatedAt) || Date.now()
      };
    }).filter(Boolean);
  }

  function readSharedHistory(callback) {
    safeChromeCall(() => chrome.storage.local.get({ [HISTORY_KEY]: [] }, (items) => {
      const shared = cloneHistory(items[HISTORY_KEY]);
      const legacy = cloneHistory(readLegacyHistory());
      const merged = [];
      shared.concat(legacy).forEach((item) => {
        if (!merged.some((existing) => existing.url === item.url)) merged.push(item);
      });
      state.history = merged.slice(0, HISTORY_LIMIT);
      if (legacy.length && merged.length !== shared.length) {
        chrome.storage.local.set({ [HISTORY_KEY]: state.history });
        localSet(LEGACY_HISTORY_KEY, '[]');
      }
      callback(state.history);
    }), () => {
      state.history = cloneHistory(readLegacyHistory()).slice(0, HISTORY_LIMIT);
      callback(state.history);
    });
  }

  function createButton() {
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.className = 'tt-button tt-button--appearance-large-white tt-button--color-blue tt-button--state-default tt-enhancer-mini-browser-button';
    button.title = 'Мини браузер';
    button.setAttribute('aria-label', 'Открыть мини браузер');
    const iconUrl = safeChromeCall(() => chrome.runtime.getURL('features/mini-browser/ai-browser.svg'), '');
    button.innerHTML = '<span class="tt-button__icon tt-button__icon--size-large">' + (iconUrl ? '<img class="tt-enhancer-mini-browser-button__img" src="' + iconUrl + '" alt="">' : iconSvg('browser')) + '</span>';
    stopTaptopModalEvents(button);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      setOpen(!state.isOpen);
    });
    return button;
  }

  function createSideButton() {
    const button = document.createElement('button');
    button.id = SIDE_BUTTON_ID;
    button.type = 'button';
    button.className = 'tt-button tt-button--appearance-large-white tt-button--color-blue tt-button--state-default tt-enhancer-side-browser-button';
    button.title = 'Side браузер';
    button.setAttribute('aria-label', 'Открыть Side браузер');
    button.innerHTML = '<span class="tt-button__icon tt-button__icon--size-large">' + iconSvg('sidepanel-thin') + '</span>';
    stopTaptopModalEvents(button);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!state.isSidePanelBrowserEnabled) return;
      safeRuntimeSendMessage({ action: 'openMiniBrowserSidePanelLast', projectSiteUrl: currentSiteUrl() }, (response) => {
        const error = chrome.runtime.lastError?.message || response?.error;
        if (!error && response?.ok) return;
        console.warn('Taptop Enhancer side panel error:', error || 'unknown error');
        if (state.panel) showNotice('Chrome не открыл боковую панель: ' + (error || 'неизвестная ошибка'));
      });
    });
    return button;
  }

  function createOpenSiteButton() {
    const button = document.createElement('button');
    button.id = OPEN_SITE_BUTTON_ID;
    button.type = 'button';
    button.className = 'tt-button tt-button--appearance-large-white tt-button--color-blue tt-button--state-default tt-enhancer-open-site-button';
    button.title = 'Открыть сайт в новой вкладке';
    button.setAttribute('aria-label', 'Открыть сайт в новой вкладке');
    button.innerHTML = '<span class="tt-button__icon tt-button__icon--size-large">' + iconSvg('external-thin') + '</span>';
    stopTaptopModalEvents(button);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const url = currentSiteUrl();
      if (url) safeRuntimeSendMessage({ action: 'openExternalTab', url });
    });
    return button;
  }

  function createPanel() {
    const panel = document.createElement('aside');
    panel.id = PANEL_ID;
    panel.className = 'tt-enhancer-mini-browser-panel';
    panel.setAttribute('aria-label', 'Мини браузер');
    stopTaptopModalEvents(panel);
    panel.addEventListener('pointerdown', bringMiniBrowserToFront, true);

    panel.innerHTML =
      '<div class="tt-enhancer-mini-browser-panel__resize-handle" data-action="resize-panel" aria-hidden="true"></div>' +
      '<div class="tt-enhancer-mini-browser-panel__bar">' +
        '<div class="tt-enhancer-mini-browser-panel__tabs"></div>' +
        '<div class="tt-enhancer-mini-browser-panel__actions">' +
          '<button type="button" class="tt-enhancer-mini-browser-panel__action" data-action="shift-left" aria-label="Сдвинуть мини браузер влево на 300px">' + iconSvg('shift-left') + '</button>' +
          '<button type="button" class="tt-enhancer-mini-browser-panel__action" data-action="pin-panel" aria-label="Открепить мини браузер">' + iconSvg('pin-filled') + '</button>' +
          '<button type="button" class="tt-enhancer-mini-browser-panel__action" data-action="bookmarks-panel" aria-label="Открыть закладки">' + iconSvg('star') + '</button>' +
          '<button type="button" class="tt-enhancer-mini-browser-panel__action" data-action="sidepanel" aria-label="Открыть в боковой панели Chrome">' + iconSvg('sidepanel') + '</button>' +
          '<button type="button" class="tt-enhancer-mini-browser-panel__action" data-action="close" aria-label="Скрыть мини браузер">' + iconSvg('close') + '</button>' +
        '</div>' +
      '</div>' +
      '<form class="tt-enhancer-mini-browser-panel__address">' +
        '<button type="button" class="tt-enhancer-mini-browser-panel__address-action" data-action="refresh" aria-label="Обновить">' + iconSvg('refresh') + '</button>' +
        '<div class="tt-enhancer-mini-browser-panel__address-field">' +
          '<input type="text" class="tt-enhancer-mini-browser-panel__address-input" placeholder="Введите адрес страницы">' +
          '<div class="tt-enhancer-mini-browser-panel__address-actions">' +
            '<div class="tt-enhancer-mini-browser-panel__bookmark-control">' +
              '<button type="button" class="tt-enhancer-mini-browser-panel__address-action tt-enhancer-mini-browser-panel__bookmark-toggle" data-action="bookmark-current" aria-label="Добавить в закладки">' + iconSvg('star') + '</button>' +
              '<div class="tt-enhancer-mini-browser-panel__bookmark-popup is-hidden" data-role="bookmark-popup">' +
                '<div class="tt-enhancer-mini-browser-panel__bookmark-title-field">' +
                  '<input type="text" class="tt-enhancer-mini-browser-panel__bookmark-title-input" data-role="bookmark-title-input" placeholder=" ">' +
                  '<span class="tt-enhancer-mini-browser-panel__bookmark-title-label">Название закладки</span>' +
                '</div>' +
                '<div class="tt-enhancer-mini-browser-panel__bookmark-popup-list" data-role="bookmark-popup-folders"></div>' +
                '<div class="tt-enhancer-mini-browser-panel__bookmark-folder-form" data-role="bookmark-folder-form">' +
                  '<input type="text" class="tt-enhancer-mini-browser-panel__bookmark-folder-input" data-role="bookmark-folder-input" placeholder="Новая папка">' +
                  '<button type="button" class="tt-enhancer-mini-browser-panel__bookmark-folder-create" data-action="bookmark-folder-create">Создать</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="tt-enhancer-mini-browser-panel__device-control">' +
              '<button type="button" class="tt-enhancer-mini-browser-panel__address-action" data-action="mobile-view" aria-label="Выбрать устройство">' + iconSvg('phone') + '</button>' +
              '<span class="tt-enhancer-mini-browser-panel__device-label" data-role="device-label"></span>' +
              '<button type="button" class="tt-enhancer-mini-browser-panel__address-action tt-enhancer-mini-browser-panel__device-fit is-hidden" data-action="fit-device" aria-label="Развернуть под размер">' + iconSvg('fit') + '</button>' +
              '<div class="tt-enhancer-mini-browser-panel__device-menu is-hidden" data-role="device-menu"></div>' +
            '</div>' +
            '<button type="button" class="tt-enhancer-mini-browser-panel__address-action" data-action="window" aria-label="Открыть текущую страницу как окно браузера">' + iconSvg('window') + '</button>' +
            '<button type="button" class="tt-enhancer-mini-browser-panel__address-action" data-action="sidepanel-current" aria-label="Открыть текущую страницу в боковой панели Chrome">' + iconSvg('sidepanel') + '</button>' +
            '<button type="button" class="tt-enhancer-mini-browser-panel__address-action" data-action="external" aria-label="Открыть текущую страницу в новой вкладке">' + iconSvg('external') + '</button>' +
          '</div>' +
          '<div class="tt-enhancer-mini-browser-panel__suggestions is-hidden">' +
            '<div class="tt-enhancer-mini-browser-panel__suggestions-col" data-list="history">' +
              '<div class="tt-enhancer-mini-browser-panel__suggestions-title">История</div>' +
              '<div class="tt-enhancer-mini-browser-panel__suggestions-list"></div>' +
            '</div>' +
            '<div class="tt-enhancer-mini-browser-panel__suggestions-col" data-list="pinned">' +
              '<div class="tt-enhancer-mini-browser-panel__suggestions-title">Закрепленные</div>' +
              '<div class="tt-enhancer-mini-browser-panel__suggestions-list"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</form>' +
      '<div class="tt-enhancer-mini-browser-panel__bookmarks-drawer" data-role="bookmarks-drawer" aria-hidden="true">' +
        '<div class="tt-enhancer-mini-browser-panel__bookmarks-head">' +
          '<div class="tt-enhancer-mini-browser-panel__bookmarks-head-left">' +
            '<button type="button" class="tt-enhancer-mini-browser-panel__bookmarks-head-action" data-action="bookmarks-search" aria-label="Поиск по закладкам">' + iconSvg('search') + '</button>' +
            '<button type="button" class="tt-enhancer-mini-browser-panel__bookmarks-head-action is-hidden" data-action="bookmarks-back" aria-label="Назад">' + iconSvg('back') + '</button>' +
          '</div>' +
          '<div class="tt-enhancer-mini-browser-panel__bookmarks-title" data-role="bookmarks-title">Закладки</div>' +
          '<input type="text" class="tt-enhancer-mini-browser-panel__bookmarks-search-input is-hidden" data-role="bookmarks-search-input" placeholder="Поиск по закладкам">' +
          '<button type="button" class="tt-enhancer-mini-browser-panel__bookmarks-head-action" data-action="bookmarks-close" aria-label="Закрыть закладки">' + iconSvg('close') + '</button>' +
        '</div>' +
        '<div class="tt-enhancer-mini-browser-panel__bookmarks-content">' +
          '<div data-role="bookmarks-home">' +
            '<div class="tt-enhancer-mini-browser-panel__bookmarks-section">' +
              '<div class="tt-enhancer-mini-browser-panel__bookmarks-section-title" data-role="bookmarks-links-title">Последние</div>' +
              '<div class="tt-enhancer-mini-browser-panel__bookmarks-list" data-role="bookmarks-recent"></div>' +
            '</div>' +
            '<div class="tt-enhancer-mini-browser-panel__bookmarks-section" data-role="bookmarks-folders-section">' +
              '<div class="tt-enhancer-mini-browser-panel__bookmarks-section-title">Папки</div>' +
              '<div class="tt-enhancer-mini-browser-panel__bookmarks-folder-list" data-role="bookmarks-folders"></div>' +
            '</div>' +
          '</div>' +
          '<div class="tt-enhancer-mini-browser-panel__bookmarks-folder-view is-hidden" data-role="bookmarks-folder-view"></div>' +
        '</div>' +
      '</div>' +
      '<div class="tt-enhancer-mini-browser-panel__frame-wrap"></div>';

    panel.querySelector('[data-action="close"]').addEventListener('click', (event) => {
      event.stopPropagation();
      setOpen(false);
    });
    panel.querySelector('[data-action="pin-panel"]').addEventListener('click', (event) => {
      event.stopPropagation();
      setPinned(!state.isPinned);
    });
    panel.querySelector('[data-action="shift-left"]').addEventListener('click', (event) => {
      event.stopPropagation();
      setShiftedLeft(!state.isShiftedLeft);
    });
    panel.querySelector('[data-action="resize-panel"]').addEventListener('pointerdown', startPanelResize);
    panel.querySelector('[data-action="resize-panel"]').addEventListener('dblclick', resetPanelWidth);
    panel.querySelector('.tt-enhancer-mini-browser-panel__device-control').addEventListener('click', (event) => {
      if (event.target.closest('[data-role="device-menu"]') || event.target.closest('[data-action="fit-device"]')) return;
      event.stopPropagation();
      toggleDeviceMenu();
    });
    panel.querySelector('[data-action="fit-device"]').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      fitPanelToDevice();
    });
    panel.querySelector('[data-action="external"]').addEventListener('click', (event) => {
      event.stopPropagation();
      const tab = getActiveTab();
      if (tab?.url) window.open(tab.url, '_blank', 'noopener,noreferrer');
    });
    panel.querySelector('[data-action="bookmark-current"]').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleBookmarkToggleClick();
    });
    panel.querySelector('[data-action="bookmarks-panel"]').addEventListener('click', (event) => {
      event.stopPropagation();
      toggleBookmarksDrawer();
      hideBookmarkPopup();
    });
    panel.querySelector('[data-action="bookmarks-search"]').addEventListener('click', (event) => {
      event.stopPropagation();
      toggleBookmarksSearch();
    });
    panel.querySelector('[data-role="bookmarks-search-input"]').addEventListener('input', (event) => {
      state.bookmarkSearchQuery = event.currentTarget.value;
      renderBookmarksDrawer();
    });
    panel.querySelector('[data-role="bookmarks-search-input"]').addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        hideBookmarksSearch();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        saveBookmarkSearchQuery(event.currentTarget.value);
        renderBookmarksDrawer();
      }
    });
    panel.querySelector('[data-action="bookmarks-close"]').addEventListener('click', (event) => {
      event.stopPropagation();
      if (state.bookmarkSearchOpen) {
        hideBookmarksSearch();
        return;
      }
      hideBookmarksDrawer();
    });
    panel.querySelector('[data-action="bookmarks-back"]').addEventListener('click', (event) => {
      event.stopPropagation();
      openBookmarksHome();
    });
    panel.querySelector('[data-action="bookmark-folder-create"]').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const input = panel.querySelector('[data-role="bookmark-folder-input"]');
      createBookmarkFolder(input?.value || '');
      if (input) {
        input.value = '';
        syncBookmarkFolderCreateButton(input);
      }
    });
    panel.querySelector('[data-role="bookmark-folder-input"]').addEventListener('input', (event) => {
      syncBookmarkFolderCreateButton(event.currentTarget);
    });
    panel.querySelector('[data-role="bookmark-folder-input"]').addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      event.stopPropagation();
      if (!String(event.currentTarget.value || '').trim()) return;
      createBookmarkFolder(event.currentTarget.value);
      event.currentTarget.value = '';
      syncBookmarkFolderCreateButton(event.currentTarget);
    });
    panel.querySelector('[data-role="bookmark-title-input"]').addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      event.stopPropagation();
      saveCurrentBookmarkTitle(event.currentTarget.value);
      event.currentTarget.blur();
    });
    panel.querySelector('[data-role="bookmark-title-input"]').addEventListener('blur', (event) => {
      saveCurrentBookmarkTitle(event.currentTarget.value);
    });
    panel.querySelector('[data-role="bookmark-popup"]').addEventListener('mousedown', (event) => {
      if (!event.target.closest('input')) event.preventDefault();
    });
    panel.querySelector('[data-action="window"]').addEventListener('click', (event) => {
      event.stopPropagation();
      const tab = getActiveTab();
      if (tab?.url) safeRuntimeSendMessage({ action: 'openMiniBrowserWindow', url: tab.url });
    });
    panel.querySelector('[data-action="sidepanel"]').addEventListener('click', (event) => {
      event.stopPropagation();
      if (!state.isSidePanelBrowserEnabled) return;
      safeRuntimeSendMessage({ action: 'openMiniBrowserSidePanelLast', projectSiteUrl: currentSiteUrl() }, (response) => {
        const error = chrome.runtime.lastError?.message || response?.error;
        if (error || !response?.ok) {
          console.warn('Taptop Enhancer side panel error:', error || 'unknown error');
          showNotice('Chrome не открыл боковую панель: ' + (error || 'неизвестная ошибка'));
        }
      });
    });
    panel.querySelector('[data-action="sidepanel-current"]').addEventListener('click', (event) => {
      event.stopPropagation();
      if (!state.isSidePanelBrowserEnabled) return;
      const tab = getActiveTab();
      if (tab?.url) {
        safeRuntimeSendMessage({
          action: 'openMiniBrowserSidePanel',
          url: tab.url,
          title: tab.title || titleFromUrl(tab.url),
          projectSiteUrl: currentSiteUrl()
        }, (response) => {
          const error = chrome.runtime.lastError?.message || response?.error;
          if (error || !response?.ok) {
            console.warn('Taptop Enhancer side panel error:', error || 'unknown error');
            showNotice('Chrome не открыл боковую панель: ' + (error || 'неизвестная ошибка'));
          }
        });
      }
    });
    panel.querySelector('[data-action="refresh"]').addEventListener('click', (event) => {
      event.stopPropagation();
      reloadActiveFrame();
    });
    panel.querySelector('.tt-enhancer-mini-browser-panel__address').addEventListener('submit', (event) => {
      event.preventDefault();
      submitAddressValue();
    });
    panel.querySelector('.tt-enhancer-mini-browser-panel__address-input').addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.isComposing) return;
      event.preventDefault();
      submitAddressValue();
    });
    panel.querySelector('.tt-enhancer-mini-browser-panel__address-input').addEventListener('input', showSuggestions);
    panel.querySelector('.tt-enhancer-mini-browser-panel__address-input').addEventListener('focus', showSuggestions);
    panel.querySelector('.tt-enhancer-mini-browser-panel__address-input').addEventListener('click', showSuggestions);
    panel.querySelector('.tt-enhancer-mini-browser-panel__address-field').addEventListener('focusout', (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        hideSuggestions();
      }
    });
    panel.querySelector('.tt-enhancer-mini-browser-panel__frame-wrap').addEventListener('pointerdown', () => {
      hideSuggestions();
      hideBookmarkPopup();
    });
    panel.addEventListener('pointerdown', (event) => {
      if (!event.target.closest('.tt-enhancer-mini-browser-panel__bookmark-control')) {
        hideBookmarkPopup();
      }
    });

    return panel;
  }

  function handleDocumentPointerDown(event) {
    const target = event.target;
    const panel = state.panel || document.getElementById(PANEL_ID);
    const clickedInsidePanel = !!panel?.contains(target);
    const clickedExtensionButton = !!(
      document.getElementById(BUTTON_ID)?.contains(target) ||
      document.getElementById(SIDE_BUTTON_ID)?.contains(target) ||
      document.getElementById(OPEN_SITE_BUTTON_ID)?.contains(target)
    );

    if (clickedInsidePanel || clickedExtensionButton) {
      bringMiniBrowserToFront();
    }

    if (state.bookmarkPopupOpen && !target.closest?.('.tt-enhancer-mini-browser-panel__bookmark-control')) {
      hideBookmarkPopup();
    }
    if (!target.closest?.('.tt-enhancer-mini-browser-panel__device-control')) {
      hideDeviceMenu();
    }

    if (state.isOpen && !state.isPinned && !clickedInsidePanel && !clickedExtensionButton) {
      setOpen(false);
    }
  }

  function handleWindowBlur() {
    setTimeout(() => {
      const activeElement = document.activeElement;
      if (activeElement?.tagName === 'IFRAME' && state.panel?.contains(activeElement)) {
        bringMiniBrowserToFront();
      }
      if (state.bookmarkPopupOpen && (activeElement?.tagName === 'IFRAME' || !document.hasFocus())) {
        hideBookmarkPopup();
      }
    }, 0);
  }

  function syncBookmarkFolderCreateButton(input) {
    const button = state.panel?.querySelector('[data-action="bookmark-folder-create"]');
    if (!button) return;
    const hasValue = !!String(input?.value || '').trim();
    button.classList.toggle('is-visible', hasValue);
    button.tabIndex = hasValue ? 0 : -1;
    button.setAttribute('aria-hidden', hasValue ? 'false' : 'true');
  }

  function getActiveTab() {
    return activeTabs().find((tab) => tab.id === state.activeId) || activeTabs()[0] || null;
  }

  function maxPanelWidth() {
    return Math.max(MIN_PANEL_WIDTH, window.innerWidth - 48);
  }

  function clampPanelWidth(width) {
    const value = Number(width);
    if (!Number.isFinite(value)) return MIN_PANEL_WIDTH;
    return Math.min(Math.max(value, MIN_PANEL_WIDTH), maxPanelWidth());
  }

  function applyStoredPanelWidth() {
    if (!state.panel) return;
    if (state.isFitDevice && state.isMobileView) {
      applyFitDeviceWidth();
      return;
    }
    const stored = Number(localGet(WIDTH_KEY, ''));
    if (!Number.isFinite(stored) || stored <= 0) {
      state.panel.style.removeProperty('width');
      return;
    }
    state.panel.style.width = clampPanelWidth(stored) + 'px';
  }

  function applyFitDeviceWidth() {
    if (!state.panel || !state.isMobileView) return;
    const device = selectedDevice();
    state.panel.style.width = clampPanelWidth(device.width + 24) + 'px';
  }

  function availableDeviceArea() {
    const wrap = state.panel?.querySelector('.tt-enhancer-mini-browser-panel__frame-wrap');
    if (!wrap) return { width: 0, height: 0 };
    const rect = wrap.getBoundingClientRect();
    return {
      width: Math.max(0, rect.width - 24),
      height: Math.max(0, rect.height - 24)
    };
  }

  function updateDeviceScale() {
    if (!state.panel) return;
    if (!state.isMobileView) {
      state.panel.style.removeProperty('--tt-mini-browser-device-scale');
      return;
    }
    const device = selectedDevice();
    const area = availableDeviceArea();
    const scale = Math.min(1, area.width / device.width || 1, area.height / device.height || 1);
    state.panel.style.setProperty('--tt-mini-browser-device-scale', String(Math.max(0.1, scale)));
  }

  function fitPanelToDevice() {
    if (!state.panel || !state.isMobileView) return;
    const tab = getActiveTab();
    if (!tab) return;
    if (tab.fitDevice) {
      if (state.fitBeforeWidth === '__default__') {
        state.panel.style.removeProperty('width');
      } else {
        state.panel.style.width = state.fitBeforeWidth;
      }
      tab.fitDevice = false;
      state.fitBeforeWidth = '';
    } else {
      state.fitBeforeWidth = state.panel.style.width || '__default__';
      tab.fitDevice = true;
      applyFitDeviceWidth();
    }
    state.isFitDevice = !!tab.fitDevice;
    saveTabs();
    renderFitButton();
    requestAnimationFrame(updateDeviceScale);
  }

  function resetPanelWidth(event) {
    event?.preventDefault();
    event?.stopPropagation();
    const currentStored = Number(localGet(WIDTH_KEY, ''));
    if (Number.isFinite(currentStored) && currentStored > 0) {
      localSet(LAST_WIDTH_KEY, String(Math.round(clampPanelWidth(state.panel?.getBoundingClientRect().width || currentStored))));
      localSet(WIDTH_KEY, '');
      state.panel?.style.removeProperty('width');
      return;
    }

    const lastStored = Number(localGet(LAST_WIDTH_KEY, ''));
    if (!Number.isFinite(lastStored) || lastStored <= 0) return;
    const nextWidth = clampPanelWidth(lastStored);
    localSet(WIDTH_KEY, String(Math.round(nextWidth)));
    if (state.panel) state.panel.style.width = nextWidth + 'px';
  }

  function startPanelResize(event) {
    if (!state.panel || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    hideSuggestions();
    hideBookmarkPopup();

    const startX = event.clientX;
    const startWidth = state.panel.getBoundingClientRect().width;
    let didMove = false;

    const cleanup = () => {
      window.removeEventListener('pointermove', handleMove, true);
      window.removeEventListener('pointerup', handleUp, true);
      window.removeEventListener('pointercancel', handleUp, true);
      state.panel?.classList.remove('is-resizing');
      document.documentElement.classList.remove('tt-enhancer-mini-browser-is-resizing');
      state.resizeCleanup = null;
    };

    const resizeTo = (clientX) => {
      const nextWidth = clampPanelWidth(startWidth + startX - clientX);
      state.panel.style.width = nextWidth + 'px';
      return nextWidth;
    };

    function handleMove(moveEvent) {
      moveEvent.preventDefault();
      if (Math.abs(moveEvent.clientX - startX) < 2 && !didMove) return;
      didMove = true;
      resizeTo(moveEvent.clientX);
    }

    function handleUp(upEvent) {
      upEvent.preventDefault();
    if (didMove) {
      const nextWidth = resizeTo(upEvent.clientX);
      const tab = getActiveTab();
      if (tab) tab.fitDevice = false;
      state.isFitDevice = false;
      state.fitBeforeWidth = '';
      saveTabs();
      localSet(WIDTH_KEY, String(Math.round(nextWidth)));
      localSet(LAST_WIDTH_KEY, String(Math.round(nextWidth)));
      renderFitButton();
    }
      cleanup();
    }

    state.resizeCleanup?.();
    state.panel.classList.add('is-resizing');
    document.documentElement.classList.add('tt-enhancer-mini-browser-is-resizing');
    state.resizeCleanup = cleanup;
    window.addEventListener('pointermove', handleMove, true);
    window.addEventListener('pointerup', handleUp, true);
    window.addEventListener('pointercancel', handleUp, true);
  }

  function removePanel() {
    state.resizeCleanup?.();
    state.panel?.remove();
    state.panel = null;
    state.frames.clear();
    state.titleRequests.clear();
  }

  function applyBrowserSettings(settings) {
    state.isMiniBrowserEnabled = settings?.[MINI_BROWSER_ENABLED_KEY] === true;
    state.isSidePanelBrowserEnabled = settings?.[SIDE_PANEL_BROWSER_KEY] === true;
    state.showOpenSiteButton = settings?.[OPEN_SITE_BUTTON_KEY] === true;

    if (!state.isMiniBrowserEnabled) {
      state.isOpen = false;
      localSet(OPEN_KEY, '0');
      removePanel();
    }
  }

  function readBrowserSettings(callback) {
    safeChromeCall(() => chrome.storage.sync.get({
      [MINI_BROWSER_ENABLED_KEY]: false,
      [SIDE_PANEL_BROWSER_KEY]: false,
      [OPEN_SITE_BUTTON_KEY]: false
    }, (settings) => {
      applyBrowserSettings(settings || {});
      callback?.();
    }), () => {
      applyBrowserSettings({
        [MINI_BROWSER_ENABLED_KEY]: false,
        [SIDE_PANEL_BROWSER_KEY]: false,
        [OPEN_SITE_BUTTON_KEY]: false
      });
      callback?.();
    });
  }

  function ensurePanel() {
    if (!state.isMiniBrowserEnabled) return null;
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = createPanel();
      document.body.appendChild(panel);
    }
    state.panel = panel;
    applyStoredPanelWidth();
    applyShiftedLeft();
    syncSidePanelControls();
    return panel;
  }

  function setOpen(isOpen) {
    state.isOpen = !!isOpen && state.isMiniBrowserEnabled;
    localSet(OPEN_KEY, state.isOpen ? '1' : '0');
    if (!state.isMiniBrowserEnabled) {
      removePanel();
      state.button?.classList.remove('is-active');
      state.button?.setAttribute('aria-pressed', 'false');
      return;
    }
    if (!state.isOpen) {
      state.panel?.classList.remove('is-open');
      state.button?.classList.remove('is-active');
      state.button?.setAttribute('aria-pressed', 'false');
      return;
    }
    ensurePanel();
    state.panel?.classList.add('is-open');
    state.button?.classList.toggle('is-active', state.isOpen);
    state.button?.setAttribute('aria-pressed', state.isOpen ? 'true' : 'false');
    bringMiniBrowserToFront();
    ensureActiveTab();
    renderPanel();
  }

  function setPinned(isPinned) {
    state.isPinned = !!isPinned;
    localSet(PINNED_KEY, state.isPinned ? '1' : '0');
    renderPinButton();
  }

  function setShiftedLeft(isShiftedLeft) {
    state.isShiftedLeft = !!isShiftedLeft;
    localSet(SHIFTED_LEFT_KEY, state.isShiftedLeft ? '1' : '0');
    applyShiftedLeft();
    renderShiftLeftButton();
  }

  function setMobileView(isMobileView) {
    setMobileDevice(isMobileView ? 'iphone-12-pro' : 'default');
  }

  function selectedDevice() {
    const tab = getActiveTab();
    return DEVICE_PRESETS.find((device) => device.id === normalizeDeviceId(tab?.deviceId || 'default')) || DEVICE_PRESETS[0];
  }

  function normalizeDeviceId(deviceId) {
    if (deviceId === '1') return 'iphone-12-pro';
    if (deviceId === '0') return 'default';
    if (deviceId === 'notebook') return 'full-hd';
    return DEVICE_PRESETS.some((device) => device.id === deviceId) ? deviceId : 'default';
  }

  function setMobileDevice(deviceId) {
    const device = DEVICE_PRESETS.find((item) => item.id === normalizeDeviceId(deviceId)) || DEVICE_PRESETS[0];
    const tab = getActiveTab();
    if (!tab) return;
    tab.deviceId = device.id;
    state.isMobileView = device.id !== 'default';
    if (!state.isMobileView) {
      tab.fitDevice = false;
      state.fitBeforeWidth = '';
    } else if (tab.fitDevice) {
      applyFitDeviceWidth();
    }
    saveTabs();
    hideDeviceMenu();
    renderMobileView();
  }

  function renderPinButton() {
    const button = state.panel?.querySelector('[data-action="pin-panel"]');
    if (!button) return;
    button.classList.toggle('is-active', state.isPinned);
    button.innerHTML = iconSvg(state.isPinned ? 'pin-filled' : 'pin');
    button.setAttribute('aria-pressed', state.isPinned ? 'true' : 'false');
    button.setAttribute('aria-label', state.isPinned ? 'Открепить мини браузер' : 'Закрепить мини браузер');
  }

  function applyShiftedLeft() {
    state.panel?.classList.toggle('is-shifted-left', state.isShiftedLeft);
  }

  function renderShiftLeftButton() {
    const button = state.panel?.querySelector('[data-action="shift-left"]');
    if (!button) return;
    button.classList.toggle('is-active', state.isShiftedLeft);
    button.setAttribute('aria-pressed', state.isShiftedLeft ? 'true' : 'false');
    button.setAttribute('aria-label', state.isShiftedLeft ? 'Вернуть мини браузер назад' : 'Сдвинуть мини браузер влево на 300px');
  }

  function renderMobileView() {
    const device = selectedDevice();
    const tab = getActiveTab();
    state.mobileDeviceId = device.id;
    state.isMobileView = device.id !== 'default';
    state.isFitDevice = !!(state.isMobileView && tab?.fitDevice);
    state.panel?.classList.toggle('is-mobile-view', state.isMobileView);
    if (state.panel) {
      if (state.isMobileView) {
        state.panel.style.setProperty('--tt-mini-browser-device-width', device.width + 'px');
        state.panel.style.setProperty('--tt-mini-browser-device-height', device.height + 'px');
      } else {
        state.panel.style.removeProperty('--tt-mini-browser-device-width');
        state.panel.style.removeProperty('--tt-mini-browser-device-height');
      }
    }
    const button = state.panel?.querySelector('[data-action="mobile-view"]');
    const fitButton = state.panel?.querySelector('[data-action="fit-device"]');
    const label = state.panel?.querySelector('[data-role="device-label"]');
    if (button) {
      button.classList.toggle('is-active', state.isMobileView);
      button.setAttribute('aria-pressed', state.isMobileView ? 'true' : 'false');
      button.setAttribute('aria-label', state.isMobileView ? 'Сменить устройство просмотра' : 'Выбрать устройство');
    }
    if (label) {
      label.textContent = state.isMobileView ? device.title + ' ' + device.width + 'x' + device.height : '';
    }
    if (fitButton) {
      fitButton.classList.toggle('is-hidden', !state.isMobileView);
    }
    renderFitButton();
    updateDeviceScale();
    renderDeviceMenu();
  }

  function renderFitButton() {
    const fitButton = state.panel?.querySelector('[data-action="fit-device"]');
    if (!fitButton) return;
    const isFit = !!getActiveTab()?.fitDevice;
    fitButton.classList.toggle('is-active', isFit);
    fitButton.setAttribute('aria-pressed', isFit ? 'true' : 'false');
    fitButton.setAttribute('aria-label', isFit ? 'Свернуть к прежней ширине' : 'Развернуть под размер');
  }

  function renderDeviceMenu() {
    const menu = state.panel?.querySelector('[data-role="device-menu"]');
    if (!menu) return;
    menu.innerHTML = '';
    DEVICE_PRESETS.forEach((device) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tt-enhancer-mini-browser-panel__device-option' + (device.id === selectedDevice().id ? ' is-active' : '');
      const title = document.createElement('span');
      title.className = 'tt-enhancer-mini-browser-panel__device-option-title';
      title.textContent = device.title;
      const size = document.createElement('span');
      size.className = 'tt-enhancer-mini-browser-panel__device-option-size';
      size.textContent = device.id === 'default' ? 'Desktop' : device.width + ' x ' + device.height;
      button.appendChild(title);
      button.appendChild(size);
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setMobileDevice(device.id);
      });
      menu.appendChild(button);
    });
  }

  function toggleDeviceMenu() {
    const menu = state.panel?.querySelector('[data-role="device-menu"]');
    if (!menu) return;
    renderDeviceMenu();
    menu.classList.toggle('is-hidden');
  }

  function hideDeviceMenu() {
    state.panel?.querySelector('[data-role="device-menu"]')?.classList.add('is-hidden');
  }

  function ensureActiveTab() {
    const tabs = activeTabs();
    if (!tabs.length) {
      const tab = createBlankTab();
      state.tabs.push(tab);
      state.activeId = tab.id;
      localSet(ACTIVE_KEY, state.activeId);
      saveTabs();
      return;
    }
    if (!tabs.some((tab) => tab.id === state.activeId)) {
      state.activeId = localGet(ACTIVE_KEY, tabs[0].id);
      if (!tabs.some((tab) => tab.id === state.activeId)) state.activeId = tabs[0].id;
    }
    localSet(ACTIVE_KEY, state.activeId);
  }

  function activateTab(id) {
    state.activeId = id;
    localSet(ACTIVE_KEY, id);
    renderPanel();
    syncAddressValue();
  }

  function addRuntimeTab() {
    if (state.addingTab) return;
    state.addingTab = true;
    setTimeout(() => {
      state.addingTab = false;
    }, 250);

    const id = 'custom-' + Date.now();
    state.tabs.push({ id, title: 'Новая вкладка', url: '', active: true, custom: true, transient: true, deviceId: 'default', fitDevice: false });
    state.activeId = id;
    renderPanel();
    focusAddress(true);
  }

  function addUrlTab(url) {
    const nextUrl = normalizeUrl(url);
    if (!nextUrl) return;

    const title = titleFromUrl(nextUrl);

    const id = 'external-' + Date.now();
    state.tabs.push({ id, title, url: nextUrl, active: true, custom: true, deviceId: 'default', fitDevice: false });
    state.activeId = id;
    saveHistory(nextUrl);
    saveTabs();
    renderPanel();
    setOpen(true);
  }

  function navigateActive(value, titleHint) {
    const tab = getActiveTab();
    if (!tab) return;
    const url = normalizeUrl(value);
    if (!url) return;
    const previousUrl = tab.url;
    tab.url = url;
    delete tab.transient;
    if (titleHint) {
      tab.title = titleHint;
    } else if (previousUrl !== url || !tab.title || tab.title === 'Новая вкладка') {
      tab.title = titleFromUrl(url);
    }
    saveHistory(url);
    saveTabs();
    renderPanel();
    loadFrame(tab);
  }

  function submitAddressValue() {
    const input = state.panel?.querySelector('.tt-enhancer-mini-browser-panel__address-input');
    if (!input) return;
    const url = normalizeUrl(input.value);
    if (!url) return;
    const tab = getActiveTab();
    const shouldReload = !!tab?.url && normalizeUrl(tab.url) === url;
    navigateActive(url);
    if (shouldReload) reloadActiveFrame();
    hideSuggestions();
    input.blur();
  }

  function requestPageTitle(tab) {
    if (!tab?.url || !/^https?:\/\//i.test(tab.url)) return;
    const fallback = titleFromUrl(tab.url);
    if (tab.title && tab.title !== fallback && tab.title !== 'Новая вкладка') return;

    const requestId = uid('title');
    state.titleRequests.set(tab.id, requestId);
    safeRuntimeSendMessage({ action: 'getMiniBrowserPageTitle', url: tab.url }, (response) => {
      if (chrome.runtime.lastError || !response?.ok || !response.title) return;
      const current = state.tabs.find((item) => item.id === tab.id);
      if (!current || current.url !== tab.url || state.titleRequests.get(tab.id) !== requestId) return;
      current.title = response.title;
      state.titleRequests.delete(tab.id);
      saveTabs();
      renderPanel();
    });
  }

  function reloadActiveFrame() {
    const frame = state.frames.get(state.activeId);
    if (frame) {
      setRefreshLoading(true);
      frame.classList.add('is-loading');
      frame.src = frame.src;
    }
  }

  function setRefreshLoading(isLoading) {
    const button = state.panel?.querySelector('[data-action="refresh"]');
    state.panel?.classList.toggle('is-page-loading', !!isLoading);
    if (!button) return;
    button.classList.toggle('is-loading', !!isLoading);
    button.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  }

  function syncAddressValue() {
    if (!state.panel) return;
    const input = state.panel.querySelector('.tt-enhancer-mini-browser-panel__address-input');
    const tab = getActiveTab();
    if (input) input.value = tab?.url || '';
  }

  function focusAddress(select) {
    if (!state.panel) return;
    syncAddressValue();
    const input = state.panel.querySelector('.tt-enhancer-mini-browser-panel__address-input');
    if (!input) return;
    requestAnimationFrame(() => {
      input.focus();
      if (select) input.select();
      showSuggestions();
    });
  }

  function readLegacyHistory() {
    try {
      return JSON.parse(localStorage.getItem(LEGACY_HISTORY_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function readHistory() {
    return state.history;
  }

  function saveHistory(url) {
    if (!url) return;
    const normalized = normalizeUrl(url);
    const history = state.history.filter((item) => item.url !== normalized);
    const tab = state.tabs.find((item) => item.url === url);
    history.unshift({ title: tab?.title || titleFromUrl(normalized), url: normalized, updatedAt: Date.now() });
    state.history = history.slice(0, HISTORY_LIMIT);
    safeChromeCall(() => chrome.storage.local.set({ [HISTORY_KEY]: state.history }), () => {
      localSet(LEGACY_HISTORY_KEY, JSON.stringify(state.history));
    });
  }

  function removeHistoryItem(url) {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    state.history = state.history.filter((item) => normalizeUrl(item.url) !== normalized);
    safeChromeCall(() => chrome.storage.local.set({ [HISTORY_KEY]: state.history }), () => {
      localSet(LEGACY_HISTORY_KEY, JSON.stringify(state.history));
    });
    showSuggestions();
  }

  function addressFilterQuery() {
    const input = state.panel?.querySelector('.tt-enhancer-mini-browser-panel__address-input');
    if (!input) return '';
    if (document.activeElement === input && input.selectionStart === 0 && input.selectionEnd === input.value.length) return '';
    return String(input.value || '').trim().toLowerCase();
  }

  function suggestionMatchesQuery(item, query) {
    if (!query) return true;
    const title = String(item?.title || '').toLowerCase();
    const url = String(item?.url || '').toLowerCase();
    return title.includes(query) || url.includes(query);
  }

  function suggestionItem(item, kind) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tt-enhancer-mini-browser-panel__suggestion';

    const title = document.createElement('span');
    title.className = 'tt-enhancer-mini-browser-panel__suggestion-title';
    title.textContent = item.title || item.url;

    const url = document.createElement('span');
    url.className = 'tt-enhancer-mini-browser-panel__suggestion-url';
    url.textContent = item.url;

    button.appendChild(title);
    button.appendChild(url);
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      navigateActive(item.url, item.title);
      hideSuggestions();
    });

    if (kind !== 'history') return button;

    const row = document.createElement('div');
    row.className = 'tt-enhancer-mini-browser-panel__suggestion-row';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'tt-enhancer-mini-browser-panel__suggestion-remove';
    remove.setAttribute('aria-label', 'Удалить из истории');
    remove.title = 'Удалить из истории';
    remove.innerHTML = iconSvg('close');
    remove.addEventListener('mousedown', (event) => event.preventDefault());
    remove.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeHistoryItem(item.url);
    });

    row.appendChild(button);
    row.appendChild(remove);
    return row;
  }

  function historyEmptyText(query) {
    return query ? 'Ничего не найдено' : 'Пока пусто';
  }

  function filteredHistory() {
    const query = addressFilterQuery();
    return {
      query,
      items: readHistory().filter((item) => suggestionMatchesQuery(item, query))
    };
  }

  function renderSuggestionList(kind, items, emptyText) {
    const col = state.panel?.querySelector('[data-list="' + kind + '"]');
    const list = col?.querySelector('.tt-enhancer-mini-browser-panel__suggestions-list');
    if (!col || !list) return;

    list.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'tt-enhancer-mini-browser-panel__suggestions-empty';
      empty.textContent = emptyText || (kind === 'history' ? 'Пока пусто' : 'Нет ссылок');
      list.appendChild(empty);
      return;
    }

    items.forEach((item) => list.appendChild(suggestionItem(item, kind)));
  }

  function showSuggestions() {
    if (!state.panel) return;
    const suggestions = state.panel.querySelector('.tt-enhancer-mini-browser-panel__suggestions');
    if (!suggestions) return;

    const history = filteredHistory();
    renderSuggestionList('history', history.items, historyEmptyText(history.query));
    renderSuggestionList('pinned', state.pinnedLinks);
    suggestions.classList.remove('is-hidden');
  }

  function hideSuggestions() {
    state.panel?.querySelector('.tt-enhancer-mini-browser-panel__suggestions')?.classList.add('is-hidden');
  }

  function getCurrentBookmarkUrl() {
    const tab = getActiveTab();
    return tab?.url ? normalizeUrl(tab.url) : '';
  }

  function getCurrentBookmarkTitle() {
    const tab = getActiveTab();
    const url = getCurrentBookmarkUrl();
    const bookmarked = foldersForBookmarkUrl(url)
      .flatMap((folder) => folder.bookmarks)
      .find((bookmark) => normalizeUrl(bookmark.url) === url);
    if (bookmarked?.title) return bookmarked.title;
    return tab?.title || (url ? titleFromUrl(url) : 'Закладка');
  }

  function getBookmarkTitleInputValue() {
    const input = state.panel?.querySelector('[data-role="bookmark-title-input"]');
    const url = getCurrentBookmarkUrl();
    const value = input?.dataset.url === url ? String(input.value || '').trim() : '';
    return value || getCurrentBookmarkTitle();
  }

  function findBookmarkFolder(folderId) {
    return state.bookmarks.folders.find((folder) => folder.id === folderId) || null;
  }

  function foldersForBookmarkUrl(url) {
    const normalized = normalizeUrl(url);
    if (!normalized) return [];
    return state.bookmarks.folders.filter((folder) => {
      return folder.bookmarks.some((bookmark) => normalizeUrl(bookmark.url) === normalized);
    });
  }

  function isCurrentPageBookmarked() {
    return foldersForBookmarkUrl(getCurrentBookmarkUrl()).length > 0;
  }

  function ensureDefaultBookmarkFolder() {
    let folder = findBookmarkFolder(DEFAULT_BOOKMARK_FOLDER_ID);
    if (!folder) {
      folder = {
        id: DEFAULT_BOOKMARK_FOLDER_ID,
        title: 'Избранное',
        createdAt: 0,
        bookmarks: []
      };
      state.bookmarks.folders.unshift(folder);
    }
    return folder;
  }

  function updateCurrentBookmarkTitles(titleValue) {
    const url = getCurrentBookmarkUrl();
    const title = String(titleValue || '').trim();
    if (!url || !title) return false;

    let didUpdate = false;
    state.bookmarks.folders.forEach((folder) => {
      folder.bookmarks.forEach((bookmark) => {
        if (normalizeUrl(bookmark.url) !== url || bookmark.title === title) return;
        bookmark.title = title;
        didUpdate = true;
      });
    });
    return didUpdate;
  }

  function saveCurrentBookmarkTitle(titleValue) {
    if (!updateCurrentBookmarkTitles(titleValue)) return;
    saveBookmarks();
    renderBookmarksDrawer();
  }

  function addBookmarkToFolder(folderId) {
    const url = getCurrentBookmarkUrl();
    if (!url) {
      showNotice('Сначала откройте страницу');
      return false;
    }

    const folder = findBookmarkFolder(folderId) || ensureDefaultBookmarkFolder();
    const existing = folder.bookmarks.find((bookmark) => normalizeUrl(bookmark.url) === url);
    const title = getBookmarkTitleInputValue();
    if (existing) {
      existing.title = title;
      existing.addedAt = Date.now();
    } else {
      folder.bookmarks.unshift({
        id: uid('bookmark'),
        title,
        url,
        addedAt: Date.now()
      });
    }
    saveBookmarks();
    renderBookmarkSurfaces();
    return true;
  }

  function removeBookmarkFromFolder(folderId) {
    const url = getCurrentBookmarkUrl();
    const folder = findBookmarkFolder(folderId);
    if (!url || !folder) return false;

    const next = folder.bookmarks.filter((bookmark) => normalizeUrl(bookmark.url) !== url);
    if (next.length === folder.bookmarks.length) return false;
    folder.bookmarks = next;
    saveBookmarks();
    renderBookmarkSurfaces();
    return true;
  }

  function toggleBookmarkInFolder(folderId) {
    const url = getCurrentBookmarkUrl();
    if (!url) {
      showNotice('Сначала откройте страницу');
      return;
    }

    const inFolder = !!findBookmarkFolder(folderId)?.bookmarks.some((bookmark) => normalizeUrl(bookmark.url) === url);
    if (inFolder) {
      removeBookmarkFromFolder(folderId);
    } else {
      addBookmarkToFolder(folderId);
    }
  }

  function handleBookmarkToggleClick() {
    if (!getCurrentBookmarkUrl()) {
      showNotice('Сначала откройте страницу');
      return;
    }
    if (state.bookmarkPopupOpen) {
      hideBookmarkPopup();
      return;
    }
    if (!isCurrentPageBookmarked()) {
      ensureDefaultBookmarkFolder();
      addBookmarkToFolder(DEFAULT_BOOKMARK_FOLDER_ID);
    }
    showBookmarkPopup();
  }

  function createBookmarkFolder(value) {
    const title = String(value || '').trim();
    if (!title) return;

    let folder = state.bookmarks.folders.find((item) => item.title.toLowerCase() === title.toLowerCase());
    if (!folder) {
      folder = {
        id: uid('folder'),
        title,
        createdAt: Date.now(),
        bookmarks: []
      };
      state.bookmarks.folders.push(folder);
    }

    if (getCurrentBookmarkUrl()) {
      addBookmarkToFolder(folder.id);
    } else {
      saveBookmarks();
      renderBookmarkSurfaces();
    }
  }

  function renameBookmarkFolder(folderId, titleValue) {
    const folder = findBookmarkFolder(folderId);
    const title = String(titleValue || '').trim();
    if (!folder || !title || folder.title === title) {
      renderBookmarkSurfaces();
      return;
    }

    folder.title = title;
    saveBookmarks();
    renderBookmarkSurfaces();
  }

  function startBookmarkFolderRename(row, folder) {
    if (!row || !folder || row.querySelector('input')) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tt-enhancer-mini-browser-panel__bookmark-popup-folder-input';
    input.value = folder.title;

    const name = row.querySelector('.tt-enhancer-mini-browser-panel__bookmark-popup-folder-name');
    name?.replaceWith(input);

    let isDone = false;
    const commit = () => {
      if (isDone) return;
      isDone = true;
      renameBookmarkFolder(folder.id, input.value);
    };
    const cancel = () => {
      if (isDone) return;
      isDone = true;
      renderBookmarkSurfaces();
    };

    input.addEventListener('click', (event) => event.stopPropagation());
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        commit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        cancel();
      }
    });
    input.addEventListener('blur', commit);

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  function showBookmarkPopup() {
    state.bookmarkPopupOpen = true;
    renderBookmarkPopup();
    state.panel?.querySelector('[data-role="bookmark-popup"]')?.classList.remove('is-hidden');
  }

  function hideBookmarkPopup() {
    state.bookmarkPopupOpen = false;
    state.panel?.querySelector('[data-role="bookmark-popup"]')?.classList.add('is-hidden');
  }

  function allBookmarkEntries() {
    const entries = [];
    state.bookmarks.folders.forEach((folder) => {
      folder.bookmarks.forEach((bookmark) => {
        entries.push({
          ...bookmark,
          folderId: folder.id,
          folderTitle: folder.title
        });
      });
    });
    return entries.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  }

  function bookmarkLinkItem(item, metaText) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tt-enhancer-mini-browser-panel__bookmark-link';

    const title = document.createElement('span');
    title.className = 'tt-enhancer-mini-browser-panel__bookmark-link-title';
    title.textContent = item.title || titleFromUrl(item.url);

    const meta = document.createElement('span');
    meta.className = 'tt-enhancer-mini-browser-panel__bookmark-link-meta';
    meta.textContent = metaText || item.url;

    button.appendChild(title);
    button.appendChild(meta);
    button.addEventListener('click', () => {
      if (state.bookmarkSearchOpen) saveBookmarkSearchQuery(state.bookmarkSearchQuery);
      navigateActive(item.url, item.title);
      hideBookmarksDrawer();
      hideBookmarkPopup();
    });
    return button;
  }

  function renderEmptyBookmarkList(container, text) {
    const empty = document.createElement('div');
    empty.className = 'tt-enhancer-mini-browser-panel__bookmarks-empty';
    empty.textContent = text;
    container.appendChild(empty);
  }

  function renderBookmarkPopup() {
    if (!state.panel) return;
    const list = state.panel.querySelector('[data-role="bookmark-popup-folders"]');
    const button = state.panel.querySelector('[data-action="bookmark-current"]');
    const titleInput = state.panel.querySelector('[data-role="bookmark-title-input"]');
    if (!list || !button || !titleInput) return;

    const currentUrl = getCurrentBookmarkUrl();
    const isBookmarked = isCurrentPageBookmarked();
    button.classList.toggle('is-active', isBookmarked);
    button.setAttribute('aria-pressed', isBookmarked ? 'true' : 'false');
    button.setAttribute('aria-label', isBookmarked ? 'Страница в закладках' : 'Добавить в закладки');
    button.innerHTML = iconSvg(isBookmarked ? 'star-filled' : 'star');
    if (document.activeElement !== titleInput || titleInput.dataset.url !== currentUrl) {
      titleInput.value = getCurrentBookmarkTitle();
      titleInput.dataset.url = currentUrl;
    }

    list.innerHTML = '';
    state.bookmarks.folders.forEach((folder) => {
      const inFolder = !!currentUrl && folder.bookmarks.some((bookmark) => normalizeUrl(bookmark.url) === currentUrl);

      const row = document.createElement('div');
      row.className = 'tt-enhancer-mini-browser-panel__bookmark-popup-folder';

      const name = document.createElement('span');
      name.className = 'tt-enhancer-mini-browser-panel__bookmark-popup-folder-name';
      name.textContent = folder.title;

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'tt-enhancer-mini-browser-panel__bookmark-popup-folder-toggle' + (inFolder ? ' is-added' : '');
      toggle.textContent = inFolder ? '-' : '+';
      toggle.setAttribute('aria-label', inFolder ? 'Убрать из папки ' + folder.title : 'Добавить в папку ' + folder.title);
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleBookmarkInFolder(folder.id);
        showBookmarkPopup();
      });

      row.appendChild(name);
      row.appendChild(toggle);
      row.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        startBookmarkFolderRename(row, folder);
      });
      list.appendChild(row);
    });

    state.panel.querySelector('[data-role="bookmark-popup"]')?.classList.toggle('is-hidden', !state.bookmarkPopupOpen);
  }

  function toggleBookmarksDrawer() {
    if (state.bookmarkDrawerOpen) {
      hideBookmarksDrawer();
    } else {
      showBookmarksDrawer();
    }
  }

  function showBookmarksDrawer(folderId) {
    state.bookmarkDrawerOpen = true;
    state.activeBookmarkFolderId = folderId || '';
    renderBookmarksDrawer();
    const drawer = state.panel?.querySelector('[data-role="bookmarks-drawer"]');
    drawer?.classList.add('is-open');
    drawer?.setAttribute('aria-hidden', 'false');
    state.panel?.querySelector('[data-action="bookmarks-panel"]')?.classList.add('is-active');
  }

  function hideBookmarksDrawer() {
    state.bookmarkDrawerOpen = false;
    state.activeBookmarkFolderId = '';
    const drawer = state.panel?.querySelector('[data-role="bookmarks-drawer"]');
    drawer?.classList.remove('is-open');
    drawer?.setAttribute('aria-hidden', 'true');
    state.panel?.querySelector('[data-action="bookmarks-panel"]')?.classList.remove('is-active');
  }

  function toggleBookmarksSearch() {
    if (state.bookmarkSearchOpen) {
      hideBookmarksSearch();
    } else {
      showBookmarksSearch();
    }
  }

  function showBookmarksSearch() {
    state.bookmarkSearchOpen = true;
    renderBookmarksDrawer();
    const input = state.panel?.querySelector('[data-role="bookmarks-search-input"]');
    requestAnimationFrame(() => input?.focus());
  }

  function hideBookmarksSearch() {
    state.bookmarkSearchOpen = false;
    state.bookmarkSearchQuery = '';
    const input = state.panel?.querySelector('[data-role="bookmarks-search-input"]');
    if (input) input.value = '';
    renderBookmarksDrawer();
  }

  function closeBookmarksSearchState() {
    state.bookmarkSearchOpen = false;
    state.bookmarkSearchQuery = '';
    const input = state.panel?.querySelector('[data-role="bookmarks-search-input"]');
    if (input) input.value = '';
  }

  function openBookmarksHome() {
    state.activeBookmarkFolderId = '';
    renderBookmarksDrawer();
  }

  function openBookmarkFolder(folderId) {
    closeBookmarksSearchState();
    state.activeBookmarkFolderId = folderId;
    state.bookmarkDrawerOpen = true;
    renderBookmarksDrawer();
  }

  function normalizedSearchQuery() {
    return String(state.bookmarkSearchQuery || '').trim().toLowerCase();
  }

  function bookmarkMatchesQuery(item, query) {
    if (!query) return true;
    return [
      item.title,
      item.url,
      item.folderTitle
    ].some((value) => String(value || '').toLowerCase().includes(query));
  }

  function folderMatchesQuery(folder, query) {
    if (!query) return true;
    if (folder.title.toLowerCase().includes(query)) return true;
    return folder.bookmarks.some((bookmark) => {
      return bookmarkMatchesQuery({ ...bookmark, folderTitle: folder.title }, query);
    });
  }

  function readBookmarkSearchHistory() {
    try {
      return JSON.parse(localStorage.getItem(BOOKMARK_SEARCH_HISTORY_KEY) || '[]')
        .filter((item) => typeof item === 'string' && item.trim());
    } catch (e) {
      return [];
    }
  }

  function saveBookmarkSearchQuery(value) {
    const query = String(value || '').trim();
    if (!query) return;
    const history = readBookmarkSearchHistory().filter((item) => item.toLowerCase() !== query.toLowerCase());
    history.unshift(query);
    localSet(BOOKMARK_SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, BOOKMARK_SEARCH_HISTORY_LIMIT)));
  }

  function applyBookmarkSearchQuery(value) {
    const query = String(value || '').trim();
    if (!query) return;
    state.bookmarkSearchOpen = true;
    state.bookmarkSearchQuery = query;
    saveBookmarkSearchQuery(query);
    renderBookmarksDrawer();
    const input = state.panel?.querySelector('[data-role="bookmarks-search-input"]');
    requestAnimationFrame(() => {
      if (!input) return;
      input.focus();
      input.select();
    });
  }

  function searchHistoryItem(query) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tt-enhancer-mini-browser-panel__bookmark-search-history-item';

    const icon = document.createElement('span');
    icon.className = 'tt-enhancer-mini-browser-panel__bookmark-search-history-icon';
    icon.innerHTML = iconSvg('search');

    const text = document.createElement('span');
    text.className = 'tt-enhancer-mini-browser-panel__bookmark-search-history-text';
    text.textContent = query;

    button.appendChild(icon);
    button.appendChild(text);
    button.addEventListener('click', () => applyBookmarkSearchQuery(query));
    return button;
  }

  function renderBookmarksDrawer() {
    if (!state.panel) return;
    const drawer = state.panel.querySelector('[data-role="bookmarks-drawer"]');
    const title = state.panel.querySelector('[data-role="bookmarks-title"]');
    const back = state.panel.querySelector('[data-action="bookmarks-back"]');
    const home = state.panel.querySelector('[data-role="bookmarks-home"]');
    const folderView = state.panel.querySelector('[data-role="bookmarks-folder-view"]');
    const recent = state.panel.querySelector('[data-role="bookmarks-recent"]');
    const folders = state.panel.querySelector('[data-role="bookmarks-folders"]');
    const searchInput = state.panel.querySelector('[data-role="bookmarks-search-input"]');
    const linksTitle = state.panel.querySelector('[data-role="bookmarks-links-title"]');
    const searchButton = state.panel.querySelector('[data-action="bookmarks-search"]');
    const closeButton = state.panel.querySelector('[data-action="bookmarks-close"]');
    const foldersSection = state.panel.querySelector('[data-role="bookmarks-folders-section"]');
    if (!drawer || !title || !back || !home || !folderView || !recent || !folders || !searchInput || !linksTitle || !searchButton || !closeButton || !foldersSection) return;

    const activeFolder = state.activeBookmarkFolderId ? findBookmarkFolder(state.activeBookmarkFolderId) : null;
    const query = normalizedSearchQuery();
    drawer.classList.toggle('is-open', state.bookmarkDrawerOpen);
    drawer.setAttribute('aria-hidden', state.bookmarkDrawerOpen ? 'false' : 'true');
    state.panel.querySelector('[data-action="bookmarks-panel"]')?.classList.toggle('is-active', state.bookmarkDrawerOpen);
    searchButton.classList.toggle('is-active', state.bookmarkSearchOpen);
    searchButton.classList.toggle('is-hidden', !!activeFolder);
    back.classList.toggle('is-hidden', !activeFolder);
    title.classList.toggle('is-hidden', state.bookmarkSearchOpen);
    searchInput.classList.toggle('is-hidden', !state.bookmarkSearchOpen);
    closeButton.setAttribute('aria-label', state.bookmarkSearchOpen ? 'Закрыть поиск' : 'Закрыть закладки');
    if (searchInput.value !== state.bookmarkSearchQuery) searchInput.value = state.bookmarkSearchQuery;
    home.classList.toggle('is-hidden', !!activeFolder);
    folderView.classList.toggle('is-hidden', !activeFolder);
    title.textContent = activeFolder ? activeFolder.title : 'Закладки';
    linksTitle.textContent = state.bookmarkSearchOpen && !query ? 'История поиска' : (query ? 'Ссылки' : 'Последние');

    recent.innerHTML = '';
    if (state.bookmarkSearchOpen && !query && !activeFolder) {
      const history = readBookmarkSearchHistory();
      foldersSection.classList.add('is-hidden');
      if (!history.length) {
        renderEmptyBookmarkList(recent, 'Истории поиска пока нет');
      } else {
        history.forEach((item) => recent.appendChild(searchHistoryItem(item)));
      }
    } else {
      foldersSection.classList.remove('is-hidden');
      const recentEntries = allBookmarkEntries()
        .filter((item) => bookmarkMatchesQuery(item, query))
        .slice(0, query ? 50 : RECENT_BOOKMARK_LIMIT);
      if (!recentEntries.length) {
        renderEmptyBookmarkList(recent, query ? 'Ничего не найдено' : 'Закладок пока нет');
      } else {
        recentEntries.forEach((item) => recent.appendChild(bookmarkLinkItem(item, item.folderTitle)));
      }

      folders.innerHTML = '';
      state.bookmarks.folders.filter((folder) => folderMatchesQuery(folder, query)).forEach((folder) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tt-enhancer-mini-browser-panel__bookmark-folder';

        const icon = document.createElement('span');
        icon.className = 'tt-enhancer-mini-browser-panel__bookmark-folder-icon';
        icon.innerHTML = iconSvg('folder');

        const text = document.createElement('span');
        text.className = 'tt-enhancer-mini-browser-panel__bookmark-folder-text';
        text.textContent = folder.title;

        const count = document.createElement('span');
        count.className = 'tt-enhancer-mini-browser-panel__bookmark-folder-count';
        count.textContent = String(folder.bookmarks.length);

        button.appendChild(icon);
        button.appendChild(text);
        button.appendChild(count);
        button.addEventListener('click', () => openBookmarkFolder(folder.id));
        folders.appendChild(button);
      });
    }

    folderView.innerHTML = '';
    if (activeFolder) {
      const folderBookmarks = activeFolder.bookmarks
        .slice()
        .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
        .filter((item) => bookmarkMatchesQuery({ ...item, folderTitle: activeFolder.title }, query));
      if (!folderBookmarks.length) {
        renderEmptyBookmarkList(folderView, query ? 'Ничего не найдено' : 'В папке пусто');
      } else {
        folderBookmarks.forEach((item) => folderView.appendChild(bookmarkLinkItem(item, item.url)));
      }
    }
  }

  function renderBookmarkSurfaces() {
    renderBookmarkPopup();
    renderBookmarksDrawer();
  }

  function syncSidePanelControls() {
    const isEnabled = !!state.isSidePanelBrowserEnabled;
    state.sideButton?.classList.toggle('is-hidden', !isEnabled);
    state.sideButton?.setAttribute('aria-hidden', isEnabled ? 'false' : 'true');
    state.panel?.querySelectorAll('[data-action="sidepanel"], [data-action="sidepanel-current"]').forEach((button) => {
      button.classList.toggle('is-hidden', !isEnabled);
      button.disabled = !isEnabled;
      button.setAttribute('aria-hidden', isEnabled ? 'false' : 'true');
    });
  }

  function renderPanel() {
    if (!state.panel || !state.isOpen || !state.isMiniBrowserEnabled) return;
    ensureActiveTab();
    renderTabs();
    renderPinButton();
    renderShiftLeftButton();
    syncSidePanelControls();
    renderMobileView();
    renderFrames();
    syncAddressValue();
    renderBookmarkSurfaces();
  }

  function renderTabs() {
    const tabsEl = state.panel.querySelector('.tt-enhancer-mini-browser-panel__tabs');
    tabsEl.innerHTML = '';
    activeTabs().forEach((tab) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.draggable = true;
      button.className = 'tt-enhancer-mini-browser-panel__tab' + (tab.id === state.activeId ? ' is-active' : '');
      button.dataset.id = tab.id;

      const label = document.createElement('span');
      label.className = 'tt-enhancer-mini-browser-panel__tab-label';
      label.textContent = tab.title || tab.url || 'Новая вкладка';

      const close = document.createElement('span');
      close.className = 'tt-enhancer-mini-browser-panel__tab-close';
      close.setAttribute('aria-label', 'Закрыть вкладку');
      close.innerHTML = iconSvg('close');

      close.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        removeTab(tab.id);
      });

      button.appendChild(label);
      button.appendChild(close);
      button.addEventListener('click', () => activateTab(tab.id));
      button.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', tab.id);
        event.dataTransfer.effectAllowed = 'move';
      });
      button.addEventListener('dragover', (event) => event.preventDefault());
      button.addEventListener('drop', (event) => {
        event.preventDefault();
        moveTab(event.dataTransfer.getData('text/plain'), tab.id);
      });
      tabsEl.appendChild(button);
    });

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'tt-enhancer-mini-browser-panel__tab-add';
    add.setAttribute('aria-label', 'Добавить вкладку');
    add.innerHTML = iconSvg('plus');
    add.addEventListener('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
      addRuntimeTab();
    });
    tabsEl.appendChild(add);
  }

  function removeTab(id) {
    const tabs = activeTabs();
    const activeIndex = tabs.findIndex((tab) => tab.id === id);
    const removeIndex = state.tabs.findIndex((tab) => tab.id === id);
    if (removeIndex < 0) return;

    state.tabs.splice(removeIndex, 1);
    state.titleRequests.delete(id);

    const frame = state.frames.get(id);
    if (frame) {
      frame.remove();
      state.frames.delete(id);
    }

    if (state.activeId === id) {
      const nextTabs = activeTabs();
      let next = nextTabs[Math.min(activeIndex, nextTabs.length - 1)] || nextTabs[nextTabs.length - 1] || null;
      if (!next) {
        next = createBlankTab();
        state.tabs.push(next);
      }
      state.activeId = next.id;
      localSet(ACTIVE_KEY, state.activeId);
    }

    saveTabs();
    renderPanel();
  }

  function moveTab(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    const from = state.tabs.findIndex((tab) => tab.id === fromId);
    const to = state.tabs.findIndex((tab) => tab.id === toId);
    if (from < 0 || to < 0) return;
    const [item] = state.tabs.splice(from, 1);
    state.tabs.splice(to, 0, item);
    saveTabs();
    renderPanel();
  }

  function renderFrames() {
    const wrap = state.panel.querySelector('.tt-enhancer-mini-browser-panel__frame-wrap');
    activeTabs().forEach((tab) => {
      if (!tab.url) return;
      let frame = state.frames.get(tab.id);
      if (!frame) {
        frame = document.createElement('iframe');
        frame.className = 'tt-enhancer-mini-browser-panel__frame';
        frame.title = tab.title || tab.url;
        frame.allow = 'clipboard-read; clipboard-write; microphone; camera; display-capture';
        frame.referrerPolicy = 'no-referrer-when-downgrade';
        frame.addEventListener('load', () => {
          frame.classList.remove('is-loading');
          if (tab.id === state.activeId) setRefreshLoading(false);
          hideSuggestions();
        });
        frame.addEventListener('pointerdown', hideSuggestions);
        state.frames.set(tab.id, frame);
        wrap.appendChild(frame);
      }
      loadFrame(tab);
      frame.classList.toggle('is-current', tab.id === state.activeId);
    });

    for (const [id, frame] of state.frames) {
      const keep = activeTabs().some((tab) => tab.id === id && tab.url);
      if (!keep) {
        frame.remove();
        state.frames.delete(id);
      }
    }
  }

  function loadFrame(tab) {
    const frame = state.frames.get(tab.id);
    if (!frame || !tab.url) return;
    if (frame.dataset.currentUrl !== tab.url) {
      if (tab.id === state.activeId) setRefreshLoading(true);
      frame.classList.add('is-loading');
      frame.dataset.currentUrl = tab.url;
      frame.src = tab.url;
      requestPageTitle(tab);
    }
  }

  function ensureButton() {
    const right = document.querySelector('.tt-header__right');
    if (!right) return false;
    let button = document.getElementById(BUTTON_ID);
    let sideButton = document.getElementById(SIDE_BUTTON_ID);
    let openSiteButton = document.getElementById(OPEN_SITE_BUTTON_ID);

    if (!state.isMiniBrowserEnabled && button) {
      button.remove();
      button = null;
    }
    if (!state.isSidePanelBrowserEnabled && sideButton) {
      sideButton.remove();
      sideButton = null;
    }
    if (!state.showOpenSiteButton && openSiteButton) {
      openSiteButton.remove();
      openSiteButton = null;
    }

    if (state.isMiniBrowserEnabled && !button) button = createButton();
    if (state.isSidePanelBrowserEnabled && !sideButton) sideButton = createSideButton();
    if (state.showOpenSiteButton && !openSiteButton) openSiteButton = createOpenSiteButton();

    const publish = right.querySelector('.tt-design-mode-publish');
    const desired = [button, sideButton, openSiteButton].filter(Boolean);
    let before = publish || null;
    for (let index = desired.length - 1; index >= 0; index -= 1) {
      const item = desired[index];
      if (item.parentNode !== right || item.nextSibling !== before) {
        right.insertBefore(item, before);
      }
      before = item;
    }

    state.button = button;
    state.sideButton = sideButton;
    state.openSiteButton = openSiteButton;
    state.button?.classList.toggle('is-active', state.isOpen);
    state.button?.setAttribute('aria-pressed', state.isOpen ? 'true' : 'false');
    syncSidePanelControls();
    return true;
  }

  function scheduleButtonSync() {
    if (state.buttonSyncFrame) return;
    state.buttonSyncFrame = window.requestAnimationFrame(() => {
      state.buttonSyncFrame = 0;
      if (state.isDestroyed) return;
      ensureButton();
      if (state.isOpen && !document.getElementById(PANEL_ID)) {
        ensurePanel();
        renderPanel();
      }
    });
  }

  function refreshFromStorage() {
    readTabs((tabs) => {
      readPinnedLinks((pinnedLinks) => {
        readBookmarks((bookmarks) => {
          readSharedHistory(() => {
            state.tabs = tabs;
            state.pinnedLinks = pinnedLinks;
            state.bookmarks = bookmarks;
            ensureActiveTab();
            if (state.isMiniBrowserEnabled && state.isOpen) {
              migrateLegacyDeviceStateToActiveTab();
              ensurePanel();
              renderPanel();
            } else if (!state.isMiniBrowserEnabled) {
              removePanel();
            }
            ensureButton();
          });
        });
      });
    });
  }

  function migrateLegacyDeviceStateToActiveTab() {
    const tab = getActiveTab();
    if (!tab || tab.deviceId !== 'default') return;
    const legacyDeviceId = normalizeDeviceId(localGet(MOBILE_VIEW_KEY, 'default'));
    if (legacyDeviceId === 'default') return;
    tab.deviceId = legacyDeviceId;
    tab.fitDevice = localGet(FIT_DEVICE_KEY, '0') === '1';
    localSet(MOBILE_VIEW_KEY, 'default');
    localSet(FIT_DEVICE_KEY, '0');
    saveTabs();
  }

  function mount() {
    state.isOpen = false;
    localSet(OPEN_KEY, '0');
    state.isPinned = localGet(PINNED_KEY, '1') !== '0';
    state.isShiftedLeft = localGet(SHIFTED_LEFT_KEY, '0') === '1';
    state.activeId = localGet(ACTIVE_KEY, '');
    readBrowserSettings(() => {
      ensureButton();
      refreshFromStorage();
      setOpen(state.isOpen);
    });

    if (state.observer?.disconnect) state.observer.disconnect();
    state.observer = new MutationObserver(() => {
      scheduleButtonSync();
    });
    state.observer.observe(document.documentElement || document.body, { childList: true, subtree: true });

    if (state.storageListener) {
      safeChromeCall(() => chrome.storage.onChanged.removeListener(state.storageListener));
    }
    state.storageListener = (changes, areaName) => {
      if (areaName === 'sync' && changes[TABS_KEY]) refreshFromStorage();
      if (areaName === 'sync' && changes[PINNED_LINKS_KEY]) {
        state.pinnedLinks = clonePinnedLinks(changes[PINNED_LINKS_KEY].newValue);
        if (!state.panel?.querySelector('.tt-enhancer-mini-browser-panel__suggestions')?.classList.contains('is-hidden')) {
          showSuggestions();
        }
      }
      if (
        areaName === 'sync'
        && (
          changes[MINI_BROWSER_ENABLED_KEY]
          || changes[SIDE_PANEL_BROWSER_KEY]
          || changes[OPEN_SITE_BUTTON_KEY]
        )
      ) {
        applyBrowserSettings({
          [MINI_BROWSER_ENABLED_KEY]: changes[MINI_BROWSER_ENABLED_KEY]?.newValue ?? state.isMiniBrowserEnabled,
          [SIDE_PANEL_BROWSER_KEY]: changes[SIDE_PANEL_BROWSER_KEY]?.newValue ?? state.isSidePanelBrowserEnabled,
          [OPEN_SITE_BUTTON_KEY]: changes[OPEN_SITE_BUTTON_KEY]?.newValue ?? state.showOpenSiteButton
        });
        ensureButton();
        if (state.isMiniBrowserEnabled && state.isOpen) {
          ensurePanel();
          renderPanel();
        } else if (!state.isMiniBrowserEnabled) {
          removePanel();
        } else {
          syncSidePanelControls();
        }
      }
      if (areaName === 'sync' && changes[BOOKMARKS_KEY]) {
        state.bookmarks = cloneBookmarks(changes[BOOKMARKS_KEY].newValue);
        renderBookmarkSurfaces();
      }
      if (areaName === 'local' && changes[HISTORY_KEY]) {
        state.history = cloneHistory(changes[HISTORY_KEY].newValue).slice(0, HISTORY_LIMIT);
        if (!state.panel?.querySelector('.tt-enhancer-mini-browser-panel__suggestions')?.classList.contains('is-hidden')) {
          showSuggestions();
        }
      }
    };
    safeChromeCall(() => chrome.storage.onChanged.addListener(state.storageListener));

    if (state.documentPointerListener) {
      document.removeEventListener('pointerdown', state.documentPointerListener, true);
    }
    state.documentPointerListener = handleDocumentPointerDown;
    document.addEventListener('pointerdown', state.documentPointerListener, true);

    if (state.windowBlurListener) {
      window.removeEventListener('blur', state.windowBlurListener);
    }
    state.windowBlurListener = handleWindowBlur;
    window.addEventListener('blur', state.windowBlurListener);

    if (state.windowResizeListener) {
      window.removeEventListener('resize', state.windowResizeListener);
    }
    state.windowResizeListener = updateDeviceScale;
    window.addEventListener('resize', state.windowResizeListener);

    if (state.messageListener) {
      safeChromeCall(() => chrome.runtime.onMessage.removeListener(state.messageListener));
    }
    state.messageListener = (message) => {
      if (message?.action === 'miniBrowserOpenUrl' && message.url) {
        addUrlTab(message.url);
      }
    };
    safeChromeCall(() => chrome.runtime.onMessage.addListener(state.messageListener));
    safeRuntimeSendMessage({ action: 'unregisterMiniBrowserHost' });
  }

  function destroy(options) {
    if (state.isDestroyed) return;
    state.isDestroyed = true;
    state.resizeCleanup?.();
    if (state.buttonSyncFrame) {
      window.cancelAnimationFrame(state.buttonSyncFrame);
      state.buttonSyncFrame = 0;
    }
    state.observer?.disconnect?.();
    if (state.documentPointerListener) document.removeEventListener('pointerdown', state.documentPointerListener, true);
    if (state.windowBlurListener) window.removeEventListener('blur', state.windowBlurListener);
    if (state.windowResizeListener) window.removeEventListener('resize', state.windowResizeListener);
    if (state.storageListener) safeChromeCall(() => chrome.storage.onChanged.removeListener(state.storageListener));
    if (state.messageListener) safeChromeCall(() => chrome.runtime.onMessage.removeListener(state.messageListener));
    if (!options?.silent) safeRuntimeSendMessage({ action: 'unregisterMiniBrowserHost' });
    document.getElementById(BUTTON_ID)?.remove();
    document.getElementById(SIDE_BUTTON_ID)?.remove();
    document.getElementById(OPEN_SITE_BUTTON_ID)?.remove();
    document.getElementById(PANEL_ID)?.remove();
    state.frames.clear();
    state.titleRequests.clear();
    delete window.__ttEnhancerMiniBrowser;
  }

  window.__ttEnhancerMiniBrowser = state;
  mount();
})();
