(function () {
  const SESSION_KEY = 'ttMiniBrowserSidePanel';
  const HISTORY_KEY = 'miniBrowser_history';
  const PINNED_TABS_KEY = 'miniBrowser_pinnedTabs';
  const BOOKMARKS_KEY = 'miniBrowser_bookmarks';
  const TABS_KEY = 'miniBrowser_sidePanelTabs';
  const ACTIVE_TAB_KEY = 'miniBrowser_sidePanelActiveTab';
  const MOBILE_VIEW_KEY = 'miniBrowser_sidePanelMobileView';
  const HISTORY_LIMIT = 12;
  const RECENT_BOOKMARK_LIMIT = 10;
  const DEFAULT_BOOKMARK_FOLDER_ID = 'favorites';
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
  const DEFAULT_PINNED_LINKS = [
    { id: 'gemini', title: 'Gemini', url: 'https://gemini.google.com', active: true },
    { id: 'deepseek', title: 'Deepseek', url: 'https://chat.deepseek.com', active: false },
    { id: 'claude', title: 'Claude', url: 'https://claude.ai', active: false },
    { id: 'chatgpt', title: 'ChatGPT', url: 'https://openai.com', active: false },
    { id: 'qwen', title: 'Qwen', url: 'https://chat.qwen.ai', active: false },
    { id: 'kimi', title: 'Kimi', url: 'https://www.kimi.com', active: false },
    { id: 'glm', title: 'GLM', url: 'https://chat.z.ai', active: false },
    { id: 'gigachat', title: 'GigaChat', url: 'https://giga.chat', active: false }
  ];

  const tabsEl = document.querySelector('[data-role="tabs"]');
  const frame = document.querySelector('.sidepanel-frame');
  const body = document.querySelector('.sidepanel-body');
  const addressForm = document.querySelector('[data-role="address"]');
  const addressField = document.querySelector('.sidepanel-address-field');
  const addressInput = document.querySelector('[data-role="address-input"]');
  const suggestions = document.querySelector('[data-role="suggestions"]');
  const home = document.querySelector('[data-role="home"]');
  const historyList = document.querySelector('[data-role="history"]');
  const bookmarksHome = document.querySelector('[data-role="bookmarks-home"]');
  const recentBookmarksList = document.querySelector('[data-role="bookmarks-recent"]');
  const foldersList = document.querySelector('[data-role="bookmark-folders"]');
  const folderView = document.querySelector('[data-role="folder-view"]');
  const folderTitle = document.querySelector('[data-role="folder-title"]');
  const folderLinks = document.querySelector('[data-role="folder-links"]');
  const bookmarkButton = document.querySelector('[data-action="bookmark"]');
  const bookmarksHomeButton = document.querySelector('[data-action="bookmarks-home"]');
  const mobileViewButton = document.querySelector('[data-action="mobile-view"]');
  const deviceControl = document.querySelector('.sidepanel-device-control');
  const deviceLabel = document.querySelector('[data-role="device-label"]');
  const deviceMenu = document.querySelector('[data-role="device-menu"]');
  const bookmarkPopup = document.querySelector('[data-role="bookmark-popup"]');
  const bookmarkTitleInput = document.querySelector('[data-role="bookmark-title-input"]');
  const bookmarkFoldersList = document.querySelector('[data-role="bookmark-popup-folders"]');
  const bookmarkFolderInput = document.querySelector('[data-role="bookmark-folder-input"]');
  const bookmarkFolderCreate = document.querySelector('[data-action="bookmark-folder-create"]');

  let tabs = [];
  let activeTabId = '';
  let currentUrl = '';
  let currentTitle = '';
  let bookmarks = { version: 1, folders: [] };
  let pinnedLinks = [];

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

  function uid(prefix) {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function iconSvg(name) {
    if (name === 'star') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m12 2.6 2.83 5.74 6.33.92-4.58 4.46 1.08 6.3L12 17.04l-5.66 2.98 1.08-6.3-4.58-4.46 6.33-.92L12 2.6Z"/></svg>';
    }
    if (name === 'star-filled') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2 2.95 6.42 7.05.84-5.21 4.8 1.38 6.94L12 17.55 5.83 21l1.38-6.94L2 9.26l7.05-.84L12 2Z"/></svg>';
    }
    if (name === 'folder') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm2 2v10h14V8h-7.83l-2-2H5v2Z"/></svg>';
    }
    if (name === 'close') {
      return '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.3 19.7 2.89 18.29 9.17 12 2.89 5.71 4.3 4.3l6.29 6.29 6.3-6.29 1.41 1.41Z"/></svg>';
    }
    if (name === 'plus') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>';
    }
    return '';
  }

  function cloneTabs(rawTabs) {
    const source = Array.isArray(rawTabs) ? rawTabs : [];
    const normalized = source.map((tab, index) => ({
      id: String(tab?.id || 'side-tab-' + Date.now() + '-' + index),
      title: String(tab?.title || tab?.url || 'Новая вкладка'),
      url: normalizeUrl(tab?.url || ''),
      deviceId: normalizeDeviceId(tab?.deviceId || 'default')
    }));
    return normalized.length ? normalized : [{ id: uid('side-tab'), title: 'Новая вкладка', url: '', deviceId: 'default' }];
  }

  function clonePinnedLinks(rawTabs) {
    const source = Array.isArray(rawTabs) && rawTabs.length ? rawTabs.map((tab) => ({ ...tab })) : DEFAULT_PINNED_LINKS.map((tab) => ({ ...tab }));

    DEFAULT_PINNED_LINKS.forEach((defaultTab) => {
      const exists = source.some((tab) => tab?.id === defaultTab.id || normalizeUrl(tab?.url || '') === normalizeUrl(defaultTab.url));
      if (!exists) source.push({ ...defaultTab });
    });

    return source.map((tab, index) => {
      const url = normalizeUrl(tab?.url || '');
      if (!url || tab?.active === false || tab?.deleted) return null;
      return {
        id: String(tab?.id || 'pinned-' + index),
        title: String(tab?.title || titleFromUrl(url)),
        url
      };
    }).filter(Boolean);
  }

  function getActiveTab() {
    return tabs.find((tab) => tab.id === activeTabId) || tabs[0] || null;
  }

  function ensureActiveTab() {
    if (!tabs.length) tabs = [{ id: uid('side-tab'), title: 'Новая вкладка', url: '' }];
    if (!tabs.some((tab) => tab.id === activeTabId)) activeTabId = tabs[0].id;
  }

  function migrateLegacyDeviceStateToActiveTab() {
    const tab = getActiveTab();
    if (!tab || tab.deviceId !== 'default') return;
    const legacyDeviceId = normalizeDeviceId(localGet(MOBILE_VIEW_KEY, 'default'));
    if (legacyDeviceId === 'default') return;
    tab.deviceId = legacyDeviceId;
    localSet(MOBILE_VIEW_KEY, 'default');
    saveTabs();
  }

  function saveTabs() {
    chrome.storage.local.set({
      [TABS_KEY]: tabs,
      [ACTIVE_TAB_KEY]: activeTabId
    });
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

  function cloneBookmarks(raw) {
    const sourceFolders = Array.isArray(raw?.folders) ? raw.folders : [];
    const folders = sourceFolders.map((folder, folderIndex) => {
      const seen = new Set();
      const folderBookmarks = (Array.isArray(folder?.bookmarks) ? folder.bookmarks : []).map((bookmark, bookmarkIndex) => {
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
        bookmarks: folderBookmarks
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

  function saveHistory(url, title) {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    chrome.storage.local.get({ [HISTORY_KEY]: [] }, (items) => {
      const current = cloneHistory(items[HISTORY_KEY]);
      const next = current.filter((item) => item.url !== normalized);
      next.unshift({
        title: title || currentTitle || titleFromUrl(normalized),
        url: normalized,
        updatedAt: Date.now()
      });
      chrome.storage.local.set({ [HISTORY_KEY]: next.slice(0, HISTORY_LIMIT) }, renderHistoryHome);
    });
  }

  function saveBookmarks() {
    chrome.storage.sync.set({ [BOOKMARKS_KEY]: bookmarks });
  }

  function setPanel(tab) {
    currentUrl = normalizeUrl(tab?.url || '');
    currentTitle = String(tab?.title || currentUrl || '');
    addressInput.value = currentUrl;
    bookmarksHomeButton.classList.remove('is-active');
    renderMobileView();

    if (!currentUrl) {
      frame.classList.remove('is-ready');
      frame.removeAttribute('src');
      frame.dataset.currentUrl = '';
      showHistoryHome();
      renderBookmarkSurfaces();
      return;
    }

    home.classList.add('is-hidden');
    bookmarksHome.classList.add('is-hidden');
    folderView.classList.add('is-hidden');
    frame.classList.add('is-ready');
    if (frame.dataset.currentUrl !== currentUrl) {
      frame.dataset.currentUrl = currentUrl;
      setReloadLoading(true);
      frame.src = currentUrl;
      requestPageTitle(currentUrl);
    }
    renderBookmarkSurfaces();
  }

  function requestPageTitle(url) {
    chrome.runtime.sendMessage({ action: 'getMiniBrowserPageTitle', url }, (response) => {
      if (chrome.runtime.lastError || !response?.ok || !response.title || normalizeUrl(url) !== currentUrl) return;
      currentTitle = response.title;
      const tab = getActiveTab();
      if (tab && tab.url === currentUrl) {
        tab.title = response.title;
        saveTabs();
        renderTabs();
      }
      renderBookmarkSurfaces();
    });
  }

  function navigate(value, titleHint) {
    const nextUrl = normalizeUrl(value);
    if (!nextUrl) return;
    const title = titleHint || titleFromUrl(nextUrl);
    const tab = getActiveTab();
    if (tab) {
      tab.url = nextUrl;
      tab.title = title;
    } else {
      const id = uid('side-tab');
      tabs.push({ id, title, url: nextUrl });
      activeTabId = id;
    }
    saveTabs();
    renderTabs();
    saveHistory(nextUrl, title);
    setPanel({ url: nextUrl, title });
  }

  function submitAddressValue() {
    const nextUrl = normalizeUrl(addressInput.value);
    if (!nextUrl) return;
    const shouldReload = !!currentUrl && normalizeUrl(currentUrl) === nextUrl;
    navigate(nextUrl);
    if (shouldReload) reload();
    hideSuggestions();
    addressInput.blur();
  }

  function reload() {
    if (!currentUrl) return;
    setReloadLoading(true);
    frame.src = currentUrl;
  }

  function setReloadLoading(isLoading) {
    const button = document.querySelector('[data-action="reload"]');
    body.classList.toggle('is-page-loading', !!isLoading);
    if (!button) return;
    button.classList.toggle('is-loading', !!isLoading);
    button.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  }

  function openExternal() {
    if (!currentUrl) return;
    chrome.tabs.create({ url: currentUrl });
  }

  function openWindow() {
    if (!currentUrl) return;
    chrome.windows.create({
      url: currentUrl,
      type: 'popup',
      width: 1100,
      height: 820,
      focused: true
    });
  }

  function renderMobileView() {
    const tab = getActiveTab();
    const device = DEVICE_PRESETS.find((item) => item.id === normalizeDeviceId(tab?.deviceId || 'default')) || DEVICE_PRESETS[0];
    const isMobileView = device.id !== 'default';
    body.classList.toggle('is-mobile-view', isMobileView);
    if (isMobileView) {
      body.style.setProperty('--sidepanel-device-width', device.width + 'px');
      body.style.setProperty('--sidepanel-device-height', device.height + 'px');
    } else {
      body.style.removeProperty('--sidepanel-device-width');
      body.style.removeProperty('--sidepanel-device-height');
    }
    mobileViewButton.classList.toggle('is-active', isMobileView);
    mobileViewButton.setAttribute('aria-pressed', isMobileView ? 'true' : 'false');
    mobileViewButton.setAttribute('aria-label', isMobileView ? 'Сменить устройство просмотра' : 'Выбрать устройство');
    deviceLabel.textContent = isMobileView ? device.title + ' ' + device.width + 'x' + device.height : '';
    updateDeviceScale();
    renderDeviceMenu();
  }

  function updateDeviceScale() {
    const tab = getActiveTab();
    const mobileDeviceId = normalizeDeviceId(tab?.deviceId || 'default');
    const isMobileView = mobileDeviceId !== 'default';
    if (!isMobileView) {
      body.style.removeProperty('--sidepanel-device-scale');
      return;
    }
    const device = DEVICE_PRESETS.find((item) => item.id === mobileDeviceId) || DEVICE_PRESETS[0];
    const rect = body.getBoundingClientRect();
    const areaWidth = Math.max(0, rect.width - 24);
    const areaHeight = Math.max(0, rect.height - 24);
    const scale = Math.min(1, areaWidth / device.width || 1, areaHeight / device.height || 1);
    body.style.setProperty('--sidepanel-device-scale', String(Math.max(0.1, scale)));
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
    saveTabs();
    hideDeviceMenu();
    renderMobileView();
  }

  function renderDeviceMenu() {
    deviceMenu.innerHTML = '';
    DEVICE_PRESETS.forEach((device) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sidepanel-device-option' + (device.id === normalizeDeviceId(getActiveTab()?.deviceId || 'default') ? ' is-active' : '');
      const title = document.createElement('span');
      title.className = 'sidepanel-device-option-title';
      title.textContent = device.title;
      const size = document.createElement('span');
      size.className = 'sidepanel-device-option-size';
      size.textContent = device.id === 'default' ? 'Desktop' : device.width + ' x ' + device.height;
      button.appendChild(title);
      button.appendChild(size);
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setMobileDevice(device.id);
      });
      deviceMenu.appendChild(button);
    });
  }

  function toggleDeviceMenu() {
    renderDeviceMenu();
    deviceMenu.classList.toggle('is-hidden');
  }

  function hideDeviceMenu() {
    deviceMenu.classList.add('is-hidden');
  }

  function openHome() {
    const tab = getActiveTab();
    if (tab) {
      tab.url = '';
      tab.title = 'Новая вкладка';
      saveTabs();
      renderTabs();
    }
    setPanel({ url: '', title: 'Новая вкладка' });
  }

  function showHistoryHome() {
    hideBookmarkPopup();
    hideSuggestions();
    bookmarksHomeButton.classList.remove('is-active');
    frame.classList.remove('is-ready');
    home.classList.remove('is-hidden');
    bookmarksHome.classList.add('is-hidden');
    folderView.classList.add('is-hidden');
    renderHistoryHome();
  }

  function showBookmarksHome() {
    hideBookmarkPopup();
    hideSuggestions();
    bookmarksHomeButton.classList.add('is-active');
    frame.classList.remove('is-ready');
    home.classList.add('is-hidden');
    bookmarksHome.classList.remove('is-hidden');
    folderView.classList.add('is-hidden');
    renderBookmarksHome();
  }

  function bookmarkFoldersForUrl(url) {
    const normalized = normalizeUrl(url);
    if (!normalized) return [];
    return bookmarks.folders.filter((folder) => {
      return folder.bookmarks.some((bookmark) => normalizeUrl(bookmark.url) === normalized);
    });
  }

  function isCurrentBookmarked() {
    return bookmarkFoldersForUrl(currentUrl).length > 0;
  }

  function currentBookmarkTitle() {
    const bookmarked = bookmarkFoldersForUrl(currentUrl)
      .flatMap((folder) => folder.bookmarks)
      .find((bookmark) => normalizeUrl(bookmark.url) === currentUrl);
    return bookmarked?.title || currentTitle || (currentUrl ? titleFromUrl(currentUrl) : 'Закладка');
  }

  function ensureDefaultFolder() {
    let folder = bookmarks.folders.find((item) => item.id === DEFAULT_BOOKMARK_FOLDER_ID);
    if (!folder) {
      folder = { id: DEFAULT_BOOKMARK_FOLDER_ID, title: 'Избранное', createdAt: 0, bookmarks: [] };
      bookmarks.folders.unshift(folder);
    }
    return folder;
  }

  function addBookmarkToFolder(folderId) {
    if (!currentUrl) return;
    const folder = bookmarks.folders.find((item) => item.id === folderId) || ensureDefaultFolder();
    const title = String(bookmarkTitleInput.value || '').trim() || currentBookmarkTitle();
    const existing = folder.bookmarks.find((bookmark) => normalizeUrl(bookmark.url) === currentUrl);
    if (existing) {
      existing.title = title;
      existing.addedAt = Date.now();
    } else {
      folder.bookmarks.unshift({ id: uid('bookmark'), title, url: currentUrl, addedAt: Date.now() });
    }
    saveBookmarks();
    renderBookmarkSurfaces();
  }

  function removeBookmarkFromFolder(folderId) {
    const folder = bookmarks.folders.find((item) => item.id === folderId);
    if (!folder || !currentUrl) return;
    folder.bookmarks = folder.bookmarks.filter((bookmark) => normalizeUrl(bookmark.url) !== currentUrl);
    saveBookmarks();
    renderBookmarkSurfaces();
  }

  function toggleBookmarkInFolder(folderId) {
    const folder = bookmarks.folders.find((item) => item.id === folderId);
    const exists = !!folder?.bookmarks.some((bookmark) => normalizeUrl(bookmark.url) === currentUrl);
    if (exists) removeBookmarkFromFolder(folderId); else addBookmarkToFolder(folderId);
  }

  function createBookmarkFolder(value) {
    const title = String(value || '').trim();
    if (!title) return;
    let folder = bookmarks.folders.find((item) => item.title.toLowerCase() === title.toLowerCase());
    if (!folder) {
      folder = { id: uid('folder'), title, createdAt: Date.now(), bookmarks: [] };
      bookmarks.folders.push(folder);
    }
    addBookmarkToFolder(folder.id);
    bookmarkFolderInput.value = '';
    syncFolderCreateButton();
  }

  function updateBookmarkTitles(titleValue) {
    const title = String(titleValue || '').trim();
    if (!currentUrl || !title) return;
    let didUpdate = false;
    bookmarks.folders.forEach((folder) => {
      folder.bookmarks.forEach((bookmark) => {
        if (normalizeUrl(bookmark.url) !== currentUrl || bookmark.title === title) return;
        bookmark.title = title;
        didUpdate = true;
      });
    });
    if (didUpdate) saveBookmarks();
  }

  function showBookmarkPopup() {
    if (!currentUrl) return;
    hideSuggestions();
    bookmarkPopup.classList.remove('is-hidden');
    bookmarkTitleInput.value = currentBookmarkTitle();
    renderBookmarkPopup();
  }

  function hideBookmarkPopup() {
    bookmarkPopup.classList.add('is-hidden');
  }

  function toggleBookmarkPopup() {
    if (!currentUrl) return;
    if (!isCurrentBookmarked()) addBookmarkToFolder(DEFAULT_BOOKMARK_FOLDER_ID);
    if (bookmarkPopup.classList.contains('is-hidden')) showBookmarkPopup(); else hideBookmarkPopup();
  }

  function syncFolderCreateButton() {
    const hasValue = !!String(bookmarkFolderInput.value || '').trim();
    bookmarkFolderCreate.classList.toggle('is-visible', hasValue);
    bookmarkFolderCreate.tabIndex = hasValue ? 0 : -1;
    bookmarkFolderCreate.setAttribute('aria-hidden', hasValue ? 'false' : 'true');
  }

  function renderBookmarkPopup() {
    bookmarkButton.classList.toggle('is-active', isCurrentBookmarked());
    bookmarkButton.innerHTML = iconSvg(isCurrentBookmarked() ? 'star-filled' : 'star');
    bookmarkFoldersList.innerHTML = '';
    bookmarks.folders.forEach((folder) => {
      const inFolder = !!currentUrl && folder.bookmarks.some((bookmark) => normalizeUrl(bookmark.url) === currentUrl);
      const row = document.createElement('div');
      row.className = 'sidepanel-bookmark-popup-folder';

      const name = document.createElement('span');
      name.className = 'sidepanel-bookmark-popup-folder-name';
      name.textContent = folder.title;

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'sidepanel-bookmark-popup-folder-toggle' + (inFolder ? ' is-added' : '');
      toggle.textContent = inFolder ? '-' : '+';
      toggle.addEventListener('click', () => toggleBookmarkInFolder(folder.id));

      row.appendChild(name);
      row.appendChild(toggle);
      bookmarkFoldersList.appendChild(row);
    });
  }

  function renderBookmarkSurfaces() {
    bookmarkButton.classList.toggle('is-active', isCurrentBookmarked());
    bookmarkButton.innerHTML = iconSvg(isCurrentBookmarked() ? 'star-filled' : 'star');
    if (!bookmarkPopup.classList.contains('is-hidden')) renderBookmarkPopup();
  }

  function renderTabs() {
    tabsEl.innerHTML = '';
    tabs.forEach((tab) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sidepanel-tab' + (tab.id === activeTabId ? ' is-active' : '');

      const title = document.createElement('span');
      title.className = 'sidepanel-tab-title';
      title.textContent = tab.title || tab.url || 'Новая вкладка';

      const close = document.createElement('span');
      close.className = 'sidepanel-tab-close';
      close.innerHTML = iconSvg('close');
      close.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeTab(tab.id);
      });

      button.appendChild(title);
      button.appendChild(close);
      button.addEventListener('click', () => activateTab(tab.id));
      tabsEl.appendChild(button);
    });

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'sidepanel-tab-add';
    add.setAttribute('aria-label', 'Добавить вкладку');
    add.innerHTML = iconSvg('plus');
    add.addEventListener('click', addTab);
    tabsEl.appendChild(add);
  }

  function activateTab(id) {
    activeTabId = id;
    ensureActiveTab();
    saveTabs();
    renderTabs();
    setPanel(getActiveTab());
  }

  function addTab() {
    const id = uid('side-tab');
    tabs.push({ id, title: 'Новая вкладка', url: '' });
    activeTabId = id;
    saveTabs();
    renderTabs();
    setPanel(getActiveTab());
    requestAnimationFrame(() => {
      addressInput.focus();
      addressInput.select();
    });
  }

  function closeTab(id) {
    const index = tabs.findIndex((tab) => tab.id === id);
    if (index < 0) return;
    tabs.splice(index, 1);
    if (!tabs.length) {
      tabs.push({ id: uid('side-tab'), title: 'Новая вкладка', url: '' });
    }
    if (activeTabId === id) {
      const next = tabs[Math.min(index, tabs.length - 1)] || tabs[0];
      activeTabId = next.id;
    }
    saveTabs();
    renderTabs();
    setPanel(getActiveTab());
  }

  function allBookmarkEntries() {
    const entries = [];
    bookmarks.folders.forEach((folder) => {
      folder.bookmarks.forEach((bookmark) => {
        entries.push({ ...bookmark, folderTitle: folder.title, folderId: folder.id });
      });
    });
    return entries.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  }

  function linkItem(item, metaText) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sidepanel-link';

    const title = document.createElement('span');
    title.className = 'sidepanel-link-title';
    title.textContent = item.title || titleFromUrl(item.url);

    const meta = document.createElement('span');
    meta.className = 'sidepanel-link-url';
    meta.textContent = metaText || item.url;

    button.appendChild(title);
    button.appendChild(meta);
    button.addEventListener('click', () => navigate(item.url, item.title));
    return button;
  }

  function suggestionItem(item) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sidepanel-suggestion';

    const title = document.createElement('span');
    title.className = 'sidepanel-suggestion-title';
    title.textContent = item.title || item.url;

    const url = document.createElement('span');
    url.className = 'sidepanel-suggestion-url';
    url.textContent = item.url;

    button.appendChild(title);
    button.appendChild(url);
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      navigate(item.url, item.title);
      hideSuggestions();
    });
    return button;
  }

  function renderSuggestionList(kind, items) {
    const col = suggestions?.querySelector('[data-list="' + kind + '"]');
    const list = col?.querySelector('.sidepanel-suggestions-list');
    if (!col || !list) return;

    list.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'sidepanel-suggestions-empty';
      empty.textContent = kind === 'history' ? 'Пока пусто' : 'Нет ссылок';
      list.appendChild(empty);
      return;
    }

    items.forEach((item) => list.appendChild(suggestionItem(item)));
  }

  function showSuggestions() {
    if (!suggestions) return;
    chrome.storage.local.get({ [HISTORY_KEY]: [] }, (items) => {
      const history = cloneHistory(items[HISTORY_KEY]);
      renderSuggestionList('history', history);
      renderSuggestionList('pinned', pinnedLinks);
      suggestions.classList.remove('is-hidden');
    });
  }

  function hideSuggestions() {
    suggestions?.classList.add('is-hidden');
  }

  function folderItem(folder) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sidepanel-folder';

    const icon = document.createElement('span');
    icon.className = 'sidepanel-folder-icon';
    icon.innerHTML = iconSvg('folder');

    const title = document.createElement('span');
    title.className = 'sidepanel-folder-title';
    title.textContent = folder.title;

    const count = document.createElement('span');
    count.className = 'sidepanel-folder-count';
    count.textContent = String(folder.bookmarks.length);

    button.appendChild(icon);
    button.appendChild(title);
    button.appendChild(count);
    button.addEventListener('click', () => {
      folderTitle.textContent = folder.title;
      renderList(folderLinks, folder.bookmarks, 'В папке пусто');
      home.classList.add('is-hidden');
      bookmarksHome.classList.add('is-hidden');
      folderView.classList.remove('is-hidden');
      frame.classList.remove('is-ready');
      bookmarksHomeButton.classList.add('is-active');
    });
    return button;
  }

  function renderList(container, items, emptyText, metaKey) {
    container.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'sidepanel-link-empty';
      empty.textContent = emptyText;
      container.appendChild(empty);
      return;
    }
    items.forEach((item) => container.appendChild(linkItem(item, metaKey ? item[metaKey] : '')));
  }

  function renderHistoryHome() {
    chrome.storage.local.get({ [HISTORY_KEY]: [] }, (items) => {
      renderList(historyList, cloneHistory(items[HISTORY_KEY]), 'Пока пусто');
    });
  }

  function renderBookmarksHome() {
    folderView.classList.add('is-hidden');
    renderList(recentBookmarksList, allBookmarkEntries().slice(0, RECENT_BOOKMARK_LIMIT), 'Закладок пока нет', 'folderTitle');
    foldersList.innerHTML = '';
    bookmarks.folders.forEach((folder) => foldersList.appendChild(folderItem(folder)));
  }

  addressForm.addEventListener('submit', (event) => {
    event.preventDefault();
    submitAddressValue();
  });

  addressInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    submitAddressValue();
  });
  addressInput.addEventListener('focus', () => {
    addressInput.select();
    showSuggestions();
  });
  addressInput.addEventListener('click', showSuggestions);
  addressField.addEventListener('focusout', (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      hideSuggestions();
    }
  });
  frame.addEventListener('load', () => setReloadLoading(false));
  bookmarkButton.addEventListener('click', toggleBookmarkPopup);
  bookmarkTitleInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    updateBookmarkTitles(event.currentTarget.value);
    event.currentTarget.blur();
  });
  bookmarkTitleInput.addEventListener('blur', (event) => updateBookmarkTitles(event.currentTarget.value));
  bookmarkFolderInput.addEventListener('input', syncFolderCreateButton);
  bookmarkFolderInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    createBookmarkFolder(event.currentTarget.value);
  });
  bookmarkFolderCreate.addEventListener('click', () => createBookmarkFolder(bookmarkFolderInput.value));
  document.querySelector('[data-action="folder-back"]').addEventListener('click', showBookmarksHome);
  bookmarksHomeButton.addEventListener('click', showBookmarksHome);
  deviceControl.addEventListener('click', (event) => {
    if (event.target.closest('[data-role="device-menu"]')) return;
    toggleDeviceMenu();
  });
  window.addEventListener('resize', updateDeviceScale);

  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.sidepanel-address-field')) hideSuggestions();
    if (!event.target.closest('.sidepanel-device-control')) hideDeviceMenu();
    if (!event.target.closest('.sidepanel-bookmark-control')) hideBookmarkPopup();
  }, true);

  chrome.storage.sync.get({ [BOOKMARKS_KEY]: null, [PINNED_TABS_KEY]: null }, (items) => {
    bookmarks = cloneBookmarks(items[BOOKMARKS_KEY]);
    pinnedLinks = clonePinnedLinks(items[PINNED_TABS_KEY]);
    if (!items[BOOKMARKS_KEY]) saveBookmarks();
    chrome.storage.local.get({ [TABS_KEY]: [], [ACTIVE_TAB_KEY]: '' }, (localItems) => {
      tabs = cloneTabs(localItems[TABS_KEY]);
      activeTabId = String(localItems[ACTIVE_TAB_KEY] || tabs[0]?.id || '');
      ensureActiveTab();
      migrateLegacyDeviceStateToActiveTab();
      renderTabs();
      setPanel(getActiveTab());
      chrome.storage.session.get(SESSION_KEY, (sessionItems) => {
        const payload = sessionItems[SESSION_KEY];
        if (payload?.url) navigate(payload.url, payload.title);
      });
    });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'session' && changes[SESSION_KEY]) {
      const payload = changes[SESSION_KEY].newValue;
      if (payload?.url) navigate(payload.url, payload.title);
      return;
    }
    if (areaName === 'sync' && changes[BOOKMARKS_KEY]) {
      bookmarks = cloneBookmarks(changes[BOOKMARKS_KEY].newValue);
      renderBookmarksHome();
      renderBookmarkSurfaces();
      return;
    }
    if (areaName === 'sync' && changes[PINNED_TABS_KEY]) {
      pinnedLinks = clonePinnedLinks(changes[PINNED_TABS_KEY].newValue);
      if (!suggestions?.classList.contains('is-hidden')) showSuggestions();
      return;
    }
    if (areaName === 'local' && changes[HISTORY_KEY]) {
      renderHistoryHome();
    }
  });

  document.querySelector('[data-action="reload"]').addEventListener('click', reload);
  document.querySelector('[data-action="external"]').addEventListener('click', openExternal);
  document.querySelector('[data-action="window"]').addEventListener('click', openWindow);
})();
