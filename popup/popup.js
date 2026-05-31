document.addEventListener('DOMContentLoaded', () => {
  const featuresContainer = document.getElementById('features-container');
  const applyBtn = document.getElementById('apply-btn');
  const headerMenuBtn = document.getElementById('header-menu-btn');
  const headerMenuDropdown = document.getElementById('header-menu-dropdown');
  const headerMenu = headerMenuBtn?.closest('.header-menu');
  const exportStateBtn = document.getElementById('export-state-btn');
  const importStateBtn = document.getElementById('import-state-btn');
  const importStateInput = document.getElementById('import-state-input');
  const BACKUP_SCHEMA = 'taptop-helper-state-backup';
  const BACKUP_VERSION = 1;
  let hasLocalReloadChange = false;
  let activeHelp = null;
  let activeHelpKey = '';

  function getLastError() {
    try {
      return chrome.runtime.lastError || null;
    } catch (e) {
      return null;
    }
  }

  function getStorageArea(name) {
    try {
      return chrome?.storage?.[name] || null;
    } catch (e) {
      return null;
    }
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function getObjectSize(value) {
    return isPlainObject(value) ? Object.keys(value).length : 0;
  }

  function readStorageArea(name) {
    const area = getStorageArea(name);
    if (!area) return Promise.resolve(null);

    return new Promise((resolve, reject) => {
      try {
        area.get(null, (items) => {
          const error = getLastError();
          if (error) {
            reject(new Error(error.message || `Не удалось прочитать chrome.storage.${name}`));
            return;
          }
          resolve(items || {});
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function replaceStorageArea(name, items) {
    const area = getStorageArea(name);
    if (!area || !isPlainObject(items)) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const finishClear = () => {
        const error = getLastError();
        if (error) {
          reject(new Error(error.message || `Не удалось очистить chrome.storage.${name}`));
          return;
        }

        const keys = Object.keys(items);
        if (!keys.length) {
          resolve();
          return;
        }

        area.set(items, () => {
          const setError = getLastError();
          if (setError) {
            reject(new Error(setError.message || `Не удалось записать chrome.storage.${name}`));
            return;
          }
          resolve();
        });
      };

      try {
        area.clear(finishClear);
      } catch (error) {
        reject(error);
      }
    });
  }

  function dumpWebStorage(storage) {
    const result = {};
    if (!storage) return result;

    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key == null) continue;
      result[key] = storage.getItem(key);
    }

    return result;
  }

  function restoreWebStorage(storage, items, shouldClear) {
    if (!storage || !isPlainObject(items)) return 0;
    if (shouldClear) storage.clear();

    let count = 0;
    Object.entries(items).forEach(([key, value]) => {
      storage.setItem(key, value == null ? '' : String(value));
      count += 1;
    });

    return count;
  }

  function getExtensionLocalStorage() {
    try {
      return dumpWebStorage(window.localStorage);
    } catch (e) {
      return {};
    }
  }

  function replaceExtensionLocalStorage(items) {
    try {
      restoreWebStorage(window.localStorage, items, true);
    } catch (e) {}
  }

  function getActiveTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs && tabs[0] ? tabs[0] : null);
      });
    });
  }

  function canReadPageStorage(tab) {
    return !!tab?.id && /^https?:\/\//i.test(tab.url || '');
  }

  async function readActivePageStorage() {
    const tab = await getActiveTab();
    if (!canReadPageStorage(tab)) {
      return {
        available: false,
        reason: tab?.url ? 'Недоступный тип вкладки' : 'Нет активной вкладки',
        tabUrl: tab?.url || ''
      };
    }

    try {
      const frames = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          function dump(storage) {
            const result = {};
            for (let i = 0; i < storage.length; i += 1) {
              const key = storage.key(i);
              if (key == null) continue;
              result[key] = storage.getItem(key);
            }
            return result;
          }

          return {
            available: true,
            url: location.href,
            origin: location.origin,
            localStorage: dump(localStorage),
            sessionStorage: dump(sessionStorage)
          };
        }
      });

      return frames?.[0]?.result || {
        available: false,
        reason: 'Страница не вернула данные',
        tabUrl: tab.url || ''
      };
    } catch (error) {
      return {
        available: false,
        reason: error?.message || 'Не удалось прочитать storage страницы',
        tabUrl: tab.url || ''
      };
    }
  }

  async function restoreActivePageStorage(pageStorage) {
    if (!isPlainObject(pageStorage) || !pageStorage.available) return null;

    const tab = await getActiveTab();
    if (!canReadPageStorage(tab)) {
      throw new Error('Откройте страницу TapTop перед импортом storage страницы.');
    }

    const activeOrigin = new URL(tab.url).origin;
    if (pageStorage.origin && pageStorage.origin !== activeOrigin) {
      const ok = confirm(
        `В файле есть storage страницы ${pageStorage.origin}, а текущая вкладка открыта на ${activeOrigin}. Импортировать данные страницы в текущую вкладку?`
      );
      if (!ok) return null;
    }

    const frames = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [pageStorage],
      func: (storedPageStorage) => {
        function isObject(value) {
          return !!value && typeof value === 'object' && !Array.isArray(value);
        }

        function restore(storage, items) {
          if (!storage || !isObject(items)) return 0;

          let count = 0;
          Object.entries(items).forEach(([key, value]) => {
            storage.setItem(key, value == null ? '' : String(value));
            count += 1;
          });
          return count;
        }

        return {
          localStorage: restore(localStorage, storedPageStorage.localStorage),
          sessionStorage: restore(sessionStorage, storedPageStorage.sessionStorage),
          origin: location.origin,
          url: location.href
        };
      }
    });

    return frames?.[0]?.result || null;
  }

  function downloadJson(payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const link = document.createElement('a');
    link.href = url;
    link.download = `taptop-helper-backup-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportState() {
    try {
      const [sync, local, session, activePage] = await Promise.all([
        readStorageArea('sync'),
        readStorageArea('local'),
        readStorageArea('session'),
        readActivePageStorage()
      ]);

      downloadJson({
        schema: BACKUP_SCHEMA,
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        extension: {
          id: chrome.runtime.id,
          name: chrome.runtime.getManifest().name,
          version: chrome.runtime.getManifest().version
        },
        chromeStorage: { sync, local, session },
        extensionLocalStorage: getExtensionLocalStorage(),
        activePage
      });
    } catch (error) {
      alert(error?.message || 'Не удалось экспортировать настройки и историю.');
    }
  }

  function normalizeBackup(data) {
    if (!isPlainObject(data)) {
      throw new Error('Файл импорта должен быть JSON-объектом.');
    }

    if (data.schema !== BACKUP_SCHEMA) {
      throw new Error('Это не файл бэкапа TapTop Helper.');
    }

    if (!isPlainObject(data.chromeStorage)) {
      throw new Error('В файле нет данных chrome.storage.');
    }

    return data;
  }

  async function importState(file) {
    if (!file) return;

    try {
      const data = normalizeBackup(JSON.parse(await file.text()));
      const syncCount = getObjectSize(data.chromeStorage.sync);
      const localCount = getObjectSize(data.chromeStorage.local);
      const sessionCount = getObjectSize(data.chromeStorage.session);
      const pageCount = getObjectSize(data.activePage?.localStorage) + getObjectSize(data.activePage?.sessionStorage);
      const ok = confirm(
        `Импорт заменит chrome.storage расширения из файла:\n\nsync: ${syncCount}\nlocal: ${localCount}\nsession: ${sessionCount}\nstorage текущей страницы: ${pageCount}\n\nПродолжить?`
      );

      if (!ok) return;

      await replaceStorageArea('sync', data.chromeStorage.sync);
      await replaceStorageArea('local', data.chromeStorage.local);
      await replaceStorageArea('session', data.chromeStorage.session);

      if (isPlainObject(data.extensionLocalStorage)) {
        replaceExtensionLocalStorage(data.extensionLocalStorage);
      }

      await restoreActivePageStorage(data.activePage);

      alert('Импорт завершен. Popup сейчас обновится; открытую страницу TapTop лучше перезагрузить.');
      window.location.reload();
    } catch (error) {
      alert(error?.message || 'Не удалось импортировать настройки и историю.');
    }
  }

  function updateApplyVisibility(pendingReload) {
    applyBtn.style.display = pendingReload ? 'inline-block' : 'none';
    applyBtn.disabled = !pendingReload;
  }

  function closeHeaderMenu() {
    if (!headerMenu || !headerMenuDropdown || !headerMenuBtn) return;
    headerMenu.classList.remove('is-open');
    headerMenuDropdown.hidden = true;
    headerMenuBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleHeaderMenu() {
    if (!headerMenu || !headerMenuDropdown || !headerMenuBtn) return;
    const isOpen = headerMenu.classList.toggle('is-open');
    headerMenuDropdown.hidden = !isOpen;
    headerMenuBtn.setAttribute('aria-expanded', String(isOpen));
  }

  function closeHelpPopup() {
    if (activeHelp) {
      const panel = activeHelp;
      panel.addEventListener('transitionend', () => panel.remove(), { once: true });
      setTimeout(() => panel.remove(), 180);
      activeHelp = null;
    }
    activeHelpKey = '';
    document.body.classList.remove('help-open');
  }

  function openHelpPopup(helpPopup, key) {
    if (activeHelp && activeHelpKey === key) {
      closeHelpPopup();
      return;
    }

    closeHelpPopup();
    activeHelpKey = key;

    const panel = document.createElement('aside');
    panel.className = 'help-popover';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', helpPopup.title);

    const header = document.createElement('div');
    header.className = 'help-popover__header';

    const title = document.createElement('h3');
    title.textContent = helpPopup.title;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'help-popover__close';
    closeBtn.setAttribute('aria-label', 'Закрыть');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', closeHelpPopup);

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'help-popover__body';

    (helpPopup.items || []).forEach((item) => {
      const row = document.createElement('p');
      const term = document.createElement('strong');
      term.textContent = item.term;
      row.appendChild(term);
      row.append(` - ${item.text}`);
      body.appendChild(row);
    });

    if (helpPopup.link?.url) {
      const link = document.createElement('a');
      link.className = 'help-popover__link';
      link.href = helpPopup.link.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = helpPopup.link.label || 'Подробнее';
      body.appendChild(link);
    }

    panel.appendChild(header);
    panel.appendChild(body);
    document.body.appendChild(panel);
    activeHelp = panel;
    requestAnimationFrame(() => document.body.classList.add('help-open'));
  }

  function applyCurrentTab(option) {
    if (option.reloadRequired) {
      hasLocalReloadChange = true;
      updateApplyVisibility(true);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.runtime.sendMessage({ action: 'setPendingReload', tabId: tabs[0].id, value: true });
        }
      });
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.runtime.sendMessage({ action: 'applyFeatures', tabId: tabs[0].id });
        chrome.runtime.sendMessage({ action: 'requestDirtyState', tabId: tabs[0].id });
      }
    });
  }

  function normalizeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw)) return raw;
    return 'https://' + raw;
  }

  function createTabId() {
    return 'custom-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function renderBrowserTabsOption(option, storageKey, settings) {
    let tabs = Array.isArray(settings[storageKey])
      ? settings[storageKey].map((tab) => ({ ...tab }))
      : (option.defaultValue || []).map((tab) => ({ ...tab }));

    (option.defaultValue || []).forEach((defaultTab) => {
      const exists = tabs.some((tab) => tab.id === defaultTab.id || normalizeUrl(tab.url) === normalizeUrl(defaultTab.url));
      if (!exists) tabs.push({ ...defaultTab });
    });

    const li = document.createElement('li');
    li.className = 'option-item option-item--browser-tabs';

    const title = document.createElement('div');
    title.className = 'browser-tabs-option__title';
    title.textContent = option.label;

    const list = document.createElement('div');
    list.className = 'browser-tabs-option__list';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'browser-tabs-option__add';
    addBtn.textContent = '+ Добавить ссылку';

    function save() {
      chrome.storage.sync.set({ [storageKey]: tabs }, () => applyCurrentTab(option));
    }

    function draw(focusId) {
      list.innerHTML = '';

      tabs.forEach((tab) => {
        if (tab.deleted) return;

        const row = document.createElement('div');
        row.className = 'browser-tabs-option__row' + (tab.active ? '' : ' is-muted');
        row.draggable = true;
        row.dataset.id = tab.id;

        const handle = document.createElement('button');
        handle.type = 'button';
        handle.className = 'browser-tabs-option__handle';
        handle.setAttribute('aria-label', 'Перетащить');
        handle.textContent = '⋮⋮';

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'browser-tabs-option__toggle';
        toggle.setAttribute('aria-label', tab.active ? 'Отключить вкладку' : 'Включить вкладку');

        const fields = document.createElement('div');
        fields.className = 'browser-tabs-option__fields';

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'browser-tabs-option__remove';
        remove.setAttribute('aria-label', 'Удалить ссылку');
        remove.textContent = '×';

        const name = document.createElement('input');
        name.className = 'browser-tabs-option__name';
        name.value = tab.title || '';
        name.placeholder = 'Название';

        const url = document.createElement('input');
        url.className = 'browser-tabs-option__url';
        url.value = tab.url || '';
        url.placeholder = 'https://example.com';

        function commitField() {
          tab.title = name.value.trim() || tab.title || 'Новая вкладка';
          tab.url = normalizeUrl(url.value);
          save();
        }

        [name, url].forEach((input) => {
          input.addEventListener('click', (event) => event.stopPropagation());
          input.addEventListener('blur', commitField);
          input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              input.blur();
            }
          });
        });

        row.addEventListener('click', () => {
          if (!tab.active) {
            tab.active = true;
            save();
            draw();
          }
        });

        toggle.addEventListener('click', (event) => {
          event.stopPropagation();
          tab.active = !tab.active;
          save();
          draw();
        });

        remove.addEventListener('click', (event) => {
          event.stopPropagation();
          const defaultTab = (option.defaultValue || []).find((item) => item.id === tab.id);
          if (defaultTab) {
            tab.deleted = true;
            tab.active = false;
          } else {
            tabs = tabs.filter((item) => item.id !== tab.id);
          }
          save();
          draw();
        });

        row.addEventListener('dragstart', (event) => {
          event.dataTransfer.setData('text/plain', tab.id);
          event.dataTransfer.effectAllowed = 'move';
          row.classList.add('is-dragging');
        });
        row.addEventListener('dragend', () => row.classList.remove('is-dragging'));
        row.addEventListener('dragover', (event) => event.preventDefault());
        row.addEventListener('drop', (event) => {
          event.preventDefault();
          const fromId = event.dataTransfer.getData('text/plain');
          const from = tabs.findIndex((item) => item.id === fromId);
          const to = tabs.findIndex((item) => item.id === tab.id);
          if (from < 0 || to < 0 || from === to) return;
          const [item] = tabs.splice(from, 1);
          tabs.splice(to, 0, item);
          save();
          draw();
        });

        fields.appendChild(name);
        fields.appendChild(url);
        row.appendChild(handle);
        row.appendChild(toggle);
        row.appendChild(fields);
        row.appendChild(remove);
        list.appendChild(row);

        if (focusId && focusId === tab.id) {
          requestAnimationFrame(() => {
            url.focus();
            url.select();
          });
        }
      });
    }

    addBtn.addEventListener('click', () => {
      const tab = {
        id: createTabId(),
        title: 'Новая вкладка',
        url: '',
        active: true,
        custom: true
      };
      tabs.push(tab);
      save();
      draw(tab.id);
    });

    draw();

    li.appendChild(title);
    li.appendChild(list);
    li.appendChild(addBtn);
    return li;
  }

  // Рендер опций + загрузка состояний
  chrome.storage.sync.get(null, (settings) => {
    for (const categoryId in featuresConfig) {
      const category = featuresConfig[categoryId];

      const details = document.createElement('details');
      details.className = 'feature-group';
      details.open = true;

      const summary = document.createElement('summary');
      summary.textContent = category.name;
      details.appendChild(summary);

      const ul = document.createElement('ul');
      ul.className = 'options-list';

      for (const optionId in category.options) {
        const option = category.options[optionId];
        const fullId = `${categoryId}_${optionId}`;
        const storageKey = option.storageKey || fullId;

        if (option.type === 'browserTabs') {
          ul.appendChild(renderBrowserTabsOption(option, storageKey, settings));
          continue;
        }

        const li = document.createElement('li');
        li.className = 'option-item';

        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = storageKey;
        const storedValue = Object.prototype.hasOwnProperty.call(settings, storageKey)
          ? settings[storageKey]
          : option.fallbackStorageKey && Object.prototype.hasOwnProperty.call(settings, option.fallbackStorageKey)
            ? settings[option.fallbackStorageKey]
            : option.defaultValue;
        cb.checked = !!storedValue;

        cb.addEventListener('change', (e) => {
          const value = e.target.checked;
          chrome.storage.sync.set({ [storageKey]: value }, () => {
            if (option.applyOnChange === false) return;
            applyCurrentTab(option);
          });
        });

        const labelText = document.createElement('span');
        labelText.className = 'option-label-text';
        labelText.textContent = option.label;

        label.appendChild(cb);
        label.appendChild(labelText);

        if (option.tooltip) {
          const help = document.createElement('span');
          help.className = 'option-help';
          help.textContent = '?';
          help.setAttribute('aria-label', option.tooltip);
          help.dataset.tooltip = option.tooltip;
          help.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (option.helpPopup) openHelpPopup(option.helpPopup, storageKey);
          });
          label.appendChild(help);
        }

        li.appendChild(label);
        ul.appendChild(li);
      }

      details.appendChild(ul);
      featuresContainer.appendChild(details);
    }

    // При открытии popup — запрос состояния pendingReload
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.runtime.sendMessage({ action: 'requestDirtyState', tabId: tabs[0].id });
      }
    });
  });

  // Кнопка «Применить»: подтверждение и перезагрузка
  applyBtn.addEventListener('click', () => {
    const ok = confirm('Чтобы применить изменения, требуется перезагрузить страницу. Перезагрузить сейчас?');
    if (!ok) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.reload(tabs[0].id);
        window.close();
      }
    });
  });

  // Ответ со стороны background по запросу состояния
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.action === 'tabDirtyState') {
      if (hasLocalReloadChange) return;
      updateApplyVisibility(!!msg.pendingReload);
    }
  });

  if (headerMenuBtn && headerMenuDropdown) {
    headerMenuBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleHeaderMenu();
    });

    headerMenuDropdown.addEventListener('click', () => closeHeaderMenu());
  }

  exportStateBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    exportState();
  });

  importStateBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    importStateInput?.click();
  });

  importStateInput?.addEventListener('change', () => {
    const file = importStateInput.files?.[0] || null;
    importState(file);
    importStateInput.value = '';
  });

  document.addEventListener('click', (event) => {
    if (!headerMenu || headerMenu.contains(event.target)) return;
    closeHeaderMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeHeaderMenu();
      closeHelpPopup();
    }
  });
});
