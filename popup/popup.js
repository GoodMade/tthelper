document.addEventListener('DOMContentLoaded', () => {
  const featuresContainer = document.getElementById('features-container');
  const applyBtn = document.getElementById('apply-btn');
  const headerMenuBtn = document.getElementById('header-menu-btn');
  const headerMenuDropdown = document.getElementById('header-menu-dropdown');
  const headerMenu = headerMenuBtn?.closest('.header-menu');
  const extensionVersion = document.getElementById('extension-version');
  const widgetSourcesBtn = document.getElementById('widget-sources-btn');
  const exportStateBtn = document.getElementById('export-state-btn');
  const importStateBtn = document.getElementById('import-state-btn');
  const importStateInput = document.getElementById('import-state-input');
  const freePlanMenuItems = [widgetSourcesBtn].filter(Boolean);
  const BACKUP_SCHEMA = 'taptop-helper-state-backup';
  const BACKUP_VERSION = 1;
  const WIDGET_SYNC_STATUS_KEY = 'widgets_additionalWidgetSyncStatus';
  const WIDGET_CACHE_KEY = 'widgets_additionalWidgetCache';
  const WIDGET_DISABLED_KEY = 'widgets_additionalWidgetDisabled';
  const LEGACY_WIDGET_GITHUB_TOKEN_KEY = 'widgets_githubToken';
  const FREE_PLAN_PAID_RESTORE_DONE_KEY = 'ttFreePlanPaidRestoreDoneV2';
  const SENSITIVE_STORAGE_KEYS = new Set([LEGACY_WIDGET_GITHUB_TOKEN_KEY]);
  const LOCAL_WIDGET_SOURCE = {
    id: 'local_uploaded_widgets',
    title: 'Локальные виджеты',
    type: 'local',
    url: 'local://uploaded-widgets',
    readonly: true
  };
  let hasLocalReloadChange = false;
  let activeHelp = null;
  let activeHelpKey = '';
  let activeWidgetSources = null;
  let activeWidgetSourcesHelp = null;
  let activeTariffState = { isFree: false, source: 'pending' };

  if (extensionVersion) {
    try {
      const version = chrome.runtime.getManifest()?.version;
      if (version) extensionVersion.textContent = version;
    } catch (e) {}
  }

  try {
    chrome.storage.local.remove(LEGACY_WIDGET_GITHUB_TOKEN_KEY);
  } catch (e) {}

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

  function omitSensitiveStorageItems(items) {
    if (!isPlainObject(items)) return items;
    const next = { ...items };
    SENSITIVE_STORAGE_KEYS.forEach((key) => delete next[key]);
    return next;
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

  function detectTaptopFreePlanInPage() {
    function detectFromRuntime() {
      try {
        const chunk = window.rspackChunktaptop_design_editor;
        if (!chunk || typeof chunk.push !== 'function') return null;

        let runtimeRequire = null;
        const chunkId = `tt-enhancer-tariff-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        chunk.push([[chunkId], {}, (req) => {
          runtimeRequire = req;
        }]);

        const runtime = runtimeRequire?.(87621)?.A;
        const hasSiteFlag = typeof runtime?.isSitePaid === 'boolean';
        const hasTeamFlag = typeof runtime?.isTeamPaid === 'boolean';
        if (!hasSiteFlag || !hasTeamFlag) return null;

        return {
          isFree: runtime.isSitePaid === false && runtime.isTeamPaid === false,
          source: 'runtime',
          isSitePaid: runtime.isSitePaid === true,
          isTeamPaid: runtime.isTeamPaid === true
        };
      } catch {
        return null;
      }
    }

    function detectFromEmbedWidget() {
      try {
        const items = Array.from(document.querySelectorAll('.tt-widgets__list .tt-widgets__item, .tt-widgets__item'));
        const embedItem = items.find((item) => {
          const name = String(item.querySelector('.tt-widgets__name')?.textContent || '').trim();
          const hasEmbedIcon = Array.from(item.querySelectorAll('use')).some((use) => {
            const href = use.getAttribute('href') || use.getAttribute('xlink:href') || '';
            return href.includes('medium-widgets-embed');
          });
          return name === 'Embed' || hasEmbedIcon;
        });
        if (!embedItem) return null;

        const embedDisabled = embedItem.classList.contains('is-disabled') || embedItem.getAttribute('aria-disabled') === 'true';
        return {
          isFree: embedDisabled,
          source: 'embed-widget',
          embedDisabled
        };
      } catch {
        return null;
      }
    }

    return detectFromRuntime() || detectFromEmbedWidget() || { isFree: false, source: 'unknown' };
  }

  async function getActiveTabTariffState() {
    const tab = await getActiveTab();
    if (!canReadPageStorage(tab)) return { isFree: false, source: 'unavailable' };

    try {
      const frames = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: detectTaptopFreePlanInPage
      });
      return frames?.[0]?.result || { isFree: false, source: 'empty' };
    } catch (e) {
      return { isFree: false, source: 'error' };
    }
  }

  function isFreePlanActive() {
    return activeTariffState?.isFree === true;
  }

  function updateHeaderMenuForTariff() {
    const shouldDisable = isFreePlanActive();
    freePlanMenuItems.forEach((item) => {
      item.hidden = false;
      item.disabled = shouldDisable;
      item.classList.toggle('is-free-plan-disabled', shouldDisable);
      item.setAttribute('aria-disabled', String(shouldDisable));
      if (shouldDisable) item.title = 'Недоступно на бесплатном тарифе TapTop';
      else item.removeAttribute('title');
    });
    if (shouldDisable) closeWidgetSourcesPopup();
  }

  function isOptionDisabledByFreePlan(option) {
    return isFreePlanActive() && option?.disabledOnFreePlan === true;
  }

  function getConfiguredOptionValue(settings, storageKey, option) {
    if (Object.prototype.hasOwnProperty.call(settings, storageKey)) return settings[storageKey];
    if (option.fallbackStorageKey && Object.prototype.hasOwnProperty.call(settings, option.fallbackStorageKey)) {
      return settings[option.fallbackStorageKey];
    }
    if (!isFreePlanActive() && Object.prototype.hasOwnProperty.call(option, 'paidDefaultValue')) {
      return option.paidDefaultValue;
    }
    return option.defaultValue;
  }

  function getFreePlanDisabledOptions() {
    const result = [];
    for (const categoryId in featuresConfig) {
      const category = featuresConfig[categoryId];
      for (const optionId in category.options) {
        const option = category.options[optionId];
        if (!option.disabledOnFreePlan) continue;

        const fullId = `${categoryId}_${optionId}`;
        const storageKey = option.storageKey || fullId;
        result.push({ option, storageKey });
      }
    }
    return result;
  }

  function getPaidPlanRestoreValue(option) {
    if (Object.prototype.hasOwnProperty.call(option, 'paidDefaultValue')) return option.paidDefaultValue;
    if (Object.prototype.hasOwnProperty.call(option, 'defaultValue')) return option.defaultValue;
    return true;
  }

  function readLocalItems(defaults) {
    return new Promise((resolve) => {
      chrome.storage.local.get(defaults, (items) => resolve(items || defaults || {}));
    });
  }

  function setLocalItems(items) {
    return new Promise((resolve) => {
      chrome.storage.local.set(items, resolve);
    });
  }

  async function getPaidPlanRestorePatch(settings) {
    if (isFreePlanActive()) return {};

    const local = await readLocalItems({ [FREE_PLAN_PAID_RESTORE_DONE_KEY]: false });
    if (local[FREE_PLAN_PAID_RESTORE_DONE_KEY]) return {};

    const patch = {};
    getFreePlanDisabledOptions().forEach(({ option, storageKey }) => {
      if (settings[storageKey] === false) patch[storageKey] = getPaidPlanRestoreValue(option);
    });

    await setLocalItems({ [FREE_PLAN_PAID_RESTORE_DONE_KEY]: true });
    return patch;
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
        chromeStorage: {
          sync,
          local: omitSensitiveStorageItems(local),
          session
        },
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
      await replaceStorageArea('local', omitSensitiveStorageItems(data.chromeStorage.local));
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

    closeWidgetSourcesPopup();
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

  function closeWidgetSourcesPopup() {
    closeWidgetSourcesHelpPopup();
    if (activeWidgetSources) {
      activeWidgetSources.remove();
      activeWidgetSources = null;
    }
    document.body.classList.remove('widget-sources-open');
  }

  function closeWidgetSourcesHelpPopup() {
    activeWidgetSourcesHelp?.remove?.();
    activeWidgetSourcesHelp = null;
  }

  function appendInstructionItem(list, text, code) {
    const item = document.createElement('li');
    item.append(text);
    if (code) {
      const codeEl = document.createElement('code');
      codeEl.textContent = code;
      item.appendChild(codeEl);
    }
    list.appendChild(item);
  }

  function appendInstructionSection(body, titleText, items) {
    const title = document.createElement('h4');
    title.textContent = titleText;
    const list = document.createElement('ol');

    items.forEach((item) => {
      if (typeof item === 'string') appendInstructionItem(list, item);
      else appendInstructionItem(list, item.text, item.code);
    });

    body.appendChild(title);
    body.appendChild(list);
  }

  function appendInstructionCodeBlock(body, lines) {
    const code = document.createElement('pre');
    code.className = 'widget-sources-help__code';
    code.textContent = lines.join('\n');
    body.appendChild(code);
  }

  function openWidgetSourcesHelpPopup() {
    if (activeWidgetSourcesHelp) {
      closeWidgetSourcesHelpPopup();
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'widget-sources-help';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Как создать виджет');

    const dialog = document.createElement('div');
    dialog.className = 'widget-sources-help__dialog';

    const header = document.createElement('div');
    header.className = 'widget-sources-help__header';

    const title = document.createElement('h3');
    title.textContent = 'Как создать виджет';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'widget-sources-help__close';
    closeBtn.setAttribute('aria-label', 'Закрыть');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', closeWidgetSourcesHelpPopup);

    const body = document.createElement('div');
    body.className = 'widget-sources-help__body';

    appendInstructionSection(body, 'Создание виджета', [
      'Создайте слой с версткой виджета.',
      { text: 'Выберите корневой слой верстки, откройте “Настройки” и в блоке “Пользовательские атрибуты” через “+” добавьте ', code: 'data-widget="widget-name"' },
      'Для внутренних слоев лучше не создавать отдельные классы без необходимости. Базовые стили держите в root-классе виджета, чтобы потом проще менять оформление через новый класс и не путаться в конфликтах.',
      'Создайте отдельный слой Embed со скриптами и стилями виджета.',
      { text: 'Слой скрипта назовите ', code: 'widget-name' },
      'name - это название виджета из data-widget.'
    ]);

    appendInstructionSection(body, 'Экспорт из конструктора', [
      'В панели слоев выберите корневой слой верстки виджета.',
      { text: 'В правой панели откройте “Настройки”, найдите блок “Экспорт слоя” и нажмите ', code: 'Экспортировать в JSON' },
      'Отдельно выберите Embed-слой со скриптом виджета и снова нажмите “Экспортировать в JSON”.',
      'Файлы могут называться как угодно: при локальной загрузке они сохранятся как layers.json и script.json.'
    ]);

    appendInstructionSection(body, 'Локальная загрузка', [
      'Нажмите “Загрузить” в источнике “Локальные виджеты”.',
      'Введите имя виджета или оставьте поле пустым, чтобы взять имя из data-widget.',
      'В поле “Слои верстки виджета” выберите экспорт слоя верстки.',
      'В поле “Слой скрипта виджета” выберите экспорт Embed-слоя со скриптом.',
      'Если имя пустое, оно возьмется из data-widget. Если имя введено вручную, data-widget внутри файла будет переименован под него.'
    ]);

    appendInstructionSection(body, 'Источник GitHub или Сайт', [
      'В источнике каждый виджет лежит в отдельной папке.',
      'В папке виджета должен быть файл layers.json.',
      'Файл script.json необязательный, но нужен для служебного Embed-скрипта.',
      'GitHub умеет отдавать список папок через свои API. Для обычного источника “Сайт” добавьте widgets.json со списком папок виджетов, потому что сайт не всегда позволяет надежно прочитать содержимое директории.'
    ]);

    appendInstructionCodeBlock(body, [
      'widgets/',
      '  kineskope/',
      '    layers.json',
      '    script.json',
      'widgets.json  // ["kineskope"]'
    ]);

    appendInstructionSection(body, 'Пример имен', [
      { text: 'Имя виджета: ', code: 'kineskope' },
      { text: 'Атрибут слоя верстки: ', code: 'data-widget="kineskope"' },
      { text: 'Имя слоя скрипта: ', code: 'widget-kineskope' }
    ]);

    header.appendChild(title);
    header.appendChild(closeBtn);
    dialog.appendChild(header);
    dialog.appendChild(body);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeWidgetSourcesHelpPopup();
    });
    document.body.appendChild(overlay);
    activeWidgetSourcesHelp = overlay;
  }

  function getWidgetSourcesOption() {
    return featuresConfig?.widgets?.options?.githubWidgets || null;
  }

  function openWidgetSourcesPopup() {
    if (isFreePlanActive()) {
      closeWidgetSourcesPopup();
      return;
    }

    if (activeWidgetSources) {
      closeWidgetSourcesPopup();
      return;
    }

    const option = getWidgetSourcesOption();
    if (!option) return;

    closeHelpPopup();

    chrome.storage.sync.get(null, (settings) => {
      const storageKey = option.storageKey || 'widgets_githubWidgets';
      const panel = document.createElement('aside');
      panel.className = 'widget-sources-popover';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'Источники виджетов');

      const header = document.createElement('div');
      header.className = 'widget-sources-popover__header';

      const title = document.createElement('h3');
      title.textContent = 'Источники виджетов';

      const actions = document.createElement('div');
      actions.className = 'widget-sources-popover__actions';

      const helpBtn = document.createElement('button');
      helpBtn.type = 'button';
      helpBtn.className = 'widget-sources-popover__help';
      helpBtn.setAttribute('aria-label', 'Как создать виджет');
      helpBtn.title = 'Как создать виджет';
      helpBtn.textContent = '?';
      helpBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openWidgetSourcesHelpPopup();
      });

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'widget-sources-popover__close';
      closeBtn.setAttribute('aria-label', 'Закрыть');
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', closeWidgetSourcesPopup);

      const body = document.createElement('div');
      body.className = 'widget-sources-popover__body';
      body.appendChild(renderWidgetSourcesManager(option, storageKey, settings || {}));

      actions.appendChild(helpBtn);
      actions.appendChild(closeBtn);
      header.appendChild(title);
      header.appendChild(actions);
      panel.appendChild(header);
      panel.appendChild(body);
      document.body.appendChild(panel);
      activeWidgetSources = panel;
      requestAnimationFrame(() => document.body.classList.add('widget-sources-open'));
    });
  }

  function refreshCurrentTabFeatures() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.runtime.sendMessage({ action: 'applyFeatures', tabId: tabs[0].id });
        chrome.runtime.sendMessage({ action: 'requestDirtyState', tabId: tabs[0].id });
      }
    });
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

    refreshCurrentTabFeatures();
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

  function createWidgetSourceId() {
    return 'source-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function normalizeWidgetSourceType(value) {
    if (value === 'local') return 'local';
    return value === 'folder' ? 'folder' : 'github';
  }

  function getWidgetSourceTypeLabel(type) {
    if (normalizeWidgetSourceType(type) === 'local') return 'Локально';
    return normalizeWidgetSourceType(type) === 'folder' ? 'Сайт' : 'GitHub';
  }

  function getWidgetSourceUrlPlaceholder(type) {
    return normalizeWidgetSourceType(type) === 'folder'
      ? 'https://example.com/widgets/'
      : 'https://github.com/user/repo/tree/main/widgets';
  }

  function isValidWidgetSourceWidgetName(value) {
    return /^[a-zA-Z0-9._-]+$/.test(String(value || ''));
  }

  function getWidgetSourceWidgetKey(source, widgetName) {
    return `${source.id}::${widgetName}`;
  }

  function normalizeWidgetDisabledMap(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, isDisabled]) => isDisabled === true && /^[a-zA-Z0-9._:-]+::[a-zA-Z0-9._-]+$/.test(key))
        .map(([key]) => [key, true])
    );
  }

  function isWidgetSourceCacheValid(source, cached) {
    return !!(
      source
      && cached
      && cached.source
      && cached.source.type === source.type
      && cached.source.url === source.url
      && Array.isArray(cached.widgets)
    );
  }

  function getCachedWidgetNamesForSource(source, widgetCache) {
    const cached = widgetCache?.[source.id];
    if (!isWidgetSourceCacheValid(source, cached)) return [];
    return cached.widgets
      .map((widget) => String(widget?.name || widget || '').trim())
      .filter(isValidWidgetSourceWidgetName)
      .sort((a, b) => a.localeCompare(b));
  }

  function isValidLocalWidgetName(value) {
    return /^[a-z][a-z0-9_-]{0,63}$/.test(String(value || ''));
  }

  function normalizeLocalWidgetName(value) {
    return String(value || '').trim().toLowerCase();
  }

  function normalizeUploadedJson(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Файл должен быть JSON-объектом.');
    }
    if (data.type !== 'taptop-enhancer-layer-export' || !data.clipboardData?.copiedLayout?.tree?.tags) {
      throw new Error('Файл не похож на экспорт слоя TapTop Helper.');
    }
    return data;
  }

  function normalizeDataEntryValue(value) {
    if (value == null) return '';
    if (typeof value === 'object') {
      if (Object.prototype.hasOwnProperty.call(value, 'value')) return normalizeDataEntryValue(value.value);
      if (Object.prototype.hasOwnProperty.call(value, 'text')) return normalizeDataEntryValue(value.text);
    }
    return String(value).trim();
  }

  function isWidgetDataKey(key) {
    const clean = String(key || '').replace(/^custom-/, '').replace(/^data-/, '');
    return clean === 'widget';
  }

  function getLayerDataWidgetValues(layerJson) {
    const tags = layerJson?.clipboardData?.copiedLayout?.tree?.tags;
    const values = new Set();
    if (!tags || typeof tags !== 'object') return [];

    Object.values(tags).forEach((tag) => {
      const data = tag?.data;
      if (!data || typeof data !== 'object') return;
      Object.entries(data).forEach(([key, value]) => {
        if (!isWidgetDataKey(key)) return;
        const normalized = normalizeDataEntryValue(value);
        if (normalized) values.add(normalized);
      });
    });

    return Array.from(values);
  }

  function getNormalizedLayerDataWidgetValues(layerJson) {
    return Array.from(new Set(
      getLayerDataWidgetValues(layerJson)
        .map(normalizeLocalWidgetName)
        .filter(Boolean)
    ));
  }

  function setDataEntryValue(entry, value) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      entry.value = value;
      if (!entry.type) entry.type = 'STRING';
      return entry;
    }
    return { type: 'STRING', value };
  }

  function renameLayerDataWidget(layerJson, widgetName) {
    const tags = layerJson?.clipboardData?.copiedLayout?.tree?.tags;
    if (!tags || typeof tags !== 'object') return;

    Object.values(tags).forEach((tag) => {
      const data = tag?.data;
      if (!data || typeof data !== 'object') return;

      Object.keys(data).forEach((key) => {
        if (!isWidgetDataKey(key)) return;
        data[key] = setDataEntryValue(data[key], widgetName);
      });
    });
  }

  function renameScriptLayerJson(scriptJson, widgetName) {
    if (!scriptJson) return;

    const nextName = `widget-${widgetName}`;
    const data = scriptJson.type === 'taptop-enhancer-layer-export'
      ? scriptJson.clipboardData
      : scriptJson;
    const rootId = data?.copiedLayout?.tree?.root;
    const rootTag = data?.copiedLayout?.tree?.tags?.[data?.tagID] || data?.copiedLayout?.tree?.tags?.[rootId];

    if (scriptJson.type === 'taptop-enhancer-layer-export') scriptJson.layerName = nextName;
    if (rootTag) rootTag.name = nextName;
  }

  function normalizeWidgetSource(source) {
    const type = normalizeWidgetSourceType(source?.type);
    return {
      id: String(source?.id || createWidgetSourceId()),
      title: String(source?.title || '').trim(),
      type,
      url: normalizeUrl(source?.url || ''),
      active: source?.active !== false
    };
  }

  function getWidgetSources(option, settings) {
    const defaults = (option.sourcesDefaultValue || []).map((source) => ({
      ...normalizeWidgetSource(source),
      readonly: true
    })).concat([{ ...normalizeWidgetSource(LOCAL_WIDGET_SOURCE), readonly: true }]);
    const defaultIds = new Set(defaults.map((source) => source.id));
    const stored = Array.isArray(settings[option.sourcesStorageKey])
      ? settings[option.sourcesStorageKey]
      : [];
    const custom = stored
      .map(normalizeWidgetSource)
      .filter((source) => !defaultIds.has(source.id));

    return { defaults, custom };
  }

  function renderWidgetSourcesToggleOption(option, storageKey, settings) {
    const isLockedByFreePlan = isOptionDisabledByFreePlan(option);
    const li = document.createElement('li');
    li.className = 'option-item';
    if (isLockedByFreePlan) li.classList.add('is-disabled-by-free-plan');

    const label = document.createElement('label');
    if (isLockedByFreePlan) label.title = 'Недоступно на бесплатном тарифе TapTop';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = storageKey;
    const storedValue = getConfiguredOptionValue(settings, storageKey, option);
    cb.checked = isLockedByFreePlan ? false : !!storedValue;
    cb.disabled = isLockedByFreePlan;

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

    cb.addEventListener('change', (event) => {
      if (isOptionDisabledByFreePlan(option)) {
        event.target.checked = false;
        return;
      }
      const value = event.target.checked;
      chrome.storage.sync.set({ [storageKey]: value }, () => {
        if (option.applyOnChange === false) return;
        applyCurrentTab(option);
      });
    });

    li.appendChild(label);
    return li;
  }

  function renderWidgetSourcesManager(option, storageKey, settings) {
    const sourcesStorageKey = option.sourcesStorageKey || `${storageKey}_sources`;
    option.sourcesStorageKey = sourcesStorageKey;

    let { defaults, custom } = getWidgetSources(option, settings);
    let disabledWidgets = normalizeWidgetDisabledMap(settings[WIDGET_DISABLED_KEY]);
    let widgetCache = {};
    let syncStatus = {};
    const openSourceIds = new Set();

    const panel = document.createElement('div');
    panel.className = 'widget-sources';

    const list = document.createElement('div');
    list.className = 'widget-sources__list';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'widget-sources__add';
    addBtn.textContent = '+ Источник';

    function requestAdditionalWidgetAction(widgetAction, payload = {}) {
      return new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage({
            action: 'additionalWidgetsRequest',
            widgetAction,
            ...payload
          }, (response) => {
            const error = chrome.runtime.lastError;
            if (error) {
              reject(new Error(error.message || 'Не удалось выполнить запрос'));
              return;
            }

            if (response?.ok) {
              resolve(response.result);
              return;
            }

            reject(new Error(response?.error || 'Не удалось выполнить запрос'));
          });
        } catch (error) {
          reject(error);
        }
      });
    }

    function updateWidgetSourceLocalState() {
      chrome.storage.local.get({
        [WIDGET_SYNC_STATUS_KEY]: {},
        [WIDGET_CACHE_KEY]: {}
      }, (items) => {
        syncStatus = items?.[WIDGET_SYNC_STATUS_KEY] || {};
        widgetCache = items?.[WIDGET_CACHE_KEY] || {};
        draw();
      });
    }

    function setLocalSyncStatus(sourceId, patch) {
      syncStatus[sourceId] = Object.assign({}, syncStatus[sourceId] || {}, patch || {}, {
        updatedAt: Date.now()
      });
      draw();
    }

    async function syncSource(source) {
      if (!source?.id || !source.url) return;
      setLocalSyncStatus(source.id, { state: 'syncing', error: '' });

      try {
        const result = await requestAdditionalWidgetAction('syncSource', { sourceId: source.id });
        setLocalSyncStatus(source.id, result || { state: 'success', error: '' });
        refreshCurrentTabFeatures();
        updateWidgetSourceLocalState();
      } catch (error) {
        setLocalSyncStatus(source.id, {
          state: 'error',
          error: error?.message || 'Не удалось загрузить источник'
        });
        updateWidgetSourceLocalState();
      }
    }

    function forgetSource(sourceId) {
      requestAdditionalWidgetAction('forgetSource', { sourceId }).catch(() => {});
    }

    function saveSources(afterSave) {
      chrome.storage.sync.set({
        [sourcesStorageKey]: custom.map(normalizeWidgetSource)
      }, () => {
        refreshCurrentTabFeatures();
        afterSave?.();
      });
    }

    function saveDisabledWidgets(afterSave) {
      disabledWidgets = normalizeWidgetDisabledMap(disabledWidgets);
      chrome.storage.sync.set({
        [WIDGET_DISABLED_KEY]: disabledWidgets
      }, () => {
        refreshCurrentTabFeatures();
        afterSave?.();
      });
    }

    function removeDisabledWidgetsForSource(sourceId) {
      let changed = false;
      Object.keys(disabledWidgets).forEach((key) => {
        if (!key.startsWith(`${sourceId}::`)) return;
        delete disabledWidgets[key];
        changed = true;
      });
      if (changed) saveDisabledWidgets();
    }

    function findWidgetNameConflict(widgetName) {
      return defaults.concat(custom).find((source) => (
        getCachedWidgetNamesForSource(source, widgetCache)
          .map(normalizeLocalWidgetName)
          .includes(widgetName)
      )) || null;
    }

    function getWidgetNameConflictMessage(source, widgetName) {
      if (source?.id === LOCAL_WIDGET_SOURCE.id) {
        return `В локальных виджетах уже есть виджет с именем "${widgetName}".`;
      }
      return `В источнике ${source?.title || source?.id || 'виджетов'} уже есть виджет с именем "${widgetName}".`;
    }

    async function readUploadJsonFile(file, label, isRequired) {
      if (!file) {
        if (isRequired) throw new Error(`Выберите ${label}.`);
        return null;
      }
      return normalizeUploadedJson(JSON.parse(await file.text()));
    }

    function saveLocalUploadedWidget(source, widgetName, layersJson, scriptJson, afterSave) {
      const nextCache = Object.assign({}, widgetCache || {});
      const current = isWidgetSourceCacheValid(source, nextCache[source.id])
        ? nextCache[source.id]
        : {
          source: {
            id: source.id,
            title: source.title,
            type: source.type,
            url: source.url
          },
          widgets: [],
          files: {}
        };

      const widgets = current.widgets
        .filter((widget) => String(widget?.name || widget || '') !== widgetName)
        .concat([{ name: widgetName }])
        .sort((a, b) => String(a.name || a).localeCompare(String(b.name || b)));

      nextCache[source.id] = {
        source: {
          id: source.id,
          title: source.title,
          type: source.type,
          url: source.url
        },
        widgets,
        files: Object.assign({}, current.files || {}, {
          [widgetName]: {
            'layers.json': layersJson,
            'script.json': scriptJson
          }
        }),
        syncedAt: Date.now()
      };

      chrome.storage.local.set({ [WIDGET_CACHE_KEY]: nextCache }, () => {
        const error = getLastError();
        if (error) {
          alert(error.message || 'Не удалось сохранить локальный виджет.');
          return;
        }
        widgetCache = nextCache;
        openSourceIds.add(source.id);
        refreshCurrentTabFeatures();
        draw();
        afterSave?.();
      });
    }

    function openLocalWidgetUploadPopup(source) {
      const overlay = document.createElement('div');
      overlay.className = 'local-widget-upload';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-label', 'Загрузить виджет');

      const dialog = document.createElement('form');
      dialog.className = 'local-widget-upload__dialog';

      const header = document.createElement('div');
      header.className = 'local-widget-upload__header';

      const title = document.createElement('h4');
      title.textContent = 'Загрузить виджет';

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'local-widget-upload__close';
      closeBtn.setAttribute('aria-label', 'Закрыть');
      closeBtn.textContent = '×';

      const body = document.createElement('div');
      body.className = 'local-widget-upload__body';

      const nameLabel = document.createElement('label');
      nameLabel.className = 'local-widget-upload__field';
      const nameText = document.createElement('span');
      nameText.textContent = 'Название';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = 'my-widget';
      nameInput.autocomplete = 'off';
      nameInput.spellcheck = false;
      nameLabel.appendChild(nameText);
      nameLabel.appendChild(nameInput);

      const layersLabel = document.createElement('label');
      layersLabel.className = 'local-widget-upload__field';
      const layersText = document.createElement('span');
      layersText.textContent = 'Файл верстки виджета (json файл слоев)';
      const layersInput = document.createElement('input');
      layersInput.type = 'file';
      layersInput.accept = 'application/json,.json';
      layersLabel.appendChild(layersText);
      layersLabel.appendChild(layersInput);

      const scriptLabel = document.createElement('label');
      scriptLabel.className = 'local-widget-upload__field';
      const scriptText = document.createElement('span');
      scriptText.textContent = 'Файл скрипта виджета (json файл слоя embed)';
      const scriptInput = document.createElement('input');
      scriptInput.type = 'file';
      scriptInput.accept = 'application/json,.json';
      scriptLabel.appendChild(scriptText);
      scriptLabel.appendChild(scriptInput);

      const status = document.createElement('div');
      status.className = 'local-widget-upload__status';

      const actions = document.createElement('div');
      actions.className = 'local-widget-upload__actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'local-widget-upload__cancel';
      cancelBtn.textContent = 'Отмена';

      const submitBtn = document.createElement('button');
      submitBtn.type = 'submit';
      submitBtn.className = 'local-widget-upload__submit';
      submitBtn.textContent = 'Загрузить';

      function close() {
        overlay.remove();
      }

      function setStatus(message, isError = true) {
        status.textContent = message || '';
        status.classList.toggle('is-error', !!message && isError);
      }

      closeBtn.addEventListener('click', close);
      cancelBtn.addEventListener('click', close);

      dialog.addEventListener('submit', async (event) => {
        event.preventDefault();
        setStatus('');

        submitBtn.disabled = true;
        try {
          const layersJson = await readUploadJsonFile(layersInput.files?.[0] || null, 'слои верстки виджета', true);
          const scriptJson = await readUploadJsonFile(scriptInput.files?.[0] || null, 'слой скрипта виджета', false);
          const dataWidgetValues = getNormalizedLayerDataWidgetValues(layersJson);

          if (!dataWidgetValues.length) {
            throw new Error('В файле слоев верстки не найден data-widget. Добавьте data-widget с тем же именем, что и виджет.');
          }

          let widgetName = normalizeLocalWidgetName(nameInput.value);
          if (!widgetName) widgetName = dataWidgetValues[0] || '';
          nameInput.value = widgetName;

          if (!isValidLocalWidgetName(widgetName)) {
            throw new Error('Название должно быть на английском: латиница, цифры, дефис или подчёркивание. Первый символ — буква.');
          }

          const conflict = findWidgetNameConflict(widgetName);
          if (conflict) {
            throw new Error(getWidgetNameConflictMessage(conflict, widgetName));
          }

          renameLayerDataWidget(layersJson, widgetName);
          renameScriptLayerJson(scriptJson, widgetName);
          saveLocalUploadedWidget(source, widgetName, layersJson, scriptJson, close);
        } catch (error) {
          setStatus(error?.message || 'Не удалось загрузить виджет.');
        } finally {
          submitBtn.disabled = false;
        }
      });

      header.appendChild(title);
      header.appendChild(closeBtn);
      body.appendChild(nameLabel);
      body.appendChild(layersLabel);
      body.appendChild(scriptLabel);
      body.appendChild(status);
      actions.appendChild(cancelBtn);
      actions.appendChild(submitBtn);
      dialog.appendChild(header);
      dialog.appendChild(body);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      requestAnimationFrame(() => nameInput.focus());
    }

    function buildWidgetSourceWidgetsPanel(source, status) {
      const widgets = getCachedWidgetNamesForSource(source, widgetCache);
      const isSyncing = status?.state === 'syncing';
      const isLocalSource = source.type === 'local';
      const wrapper = document.createElement('div');
      wrapper.className = 'widget-source-widgets';

      const header = document.createElement('div');
      header.className = 'widget-source-widgets__header';

      const count = document.createElement('span');
      count.className = 'widget-source-widgets__count';
      count.textContent = widgets.length
        ? `Виджеты: ${widgets.length}`
        : isSyncing
          ? 'Загружаются'
          : 'Виджеты не загружены';

      header.appendChild(count);
      if (!isLocalSource) {
        const refresh = document.createElement('button');
        refresh.type = 'button';
        refresh.className = 'widget-source-widgets__refresh';
        refresh.textContent = isSyncing ? 'Загрузка' : 'Обновить';
        refresh.disabled = isSyncing || !source.url;
        refresh.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          syncSource(source);
        });
        header.appendChild(refresh);
      }
      wrapper.appendChild(header);

      if (status?.state === 'error' && status.error) {
        const error = document.createElement('div');
        error.className = 'widget-source-widgets__error';
        error.textContent = status.error;
        wrapper.appendChild(error);
      }

      if (!widgets.length) {
        const empty = document.createElement('div');
        empty.className = 'widget-source-widgets__empty';
        empty.textContent = isLocalSource
          ? 'Локальных виджетов пока нет.'
          : isSyncing
            ? 'Список появится после загрузки.'
            : 'Нажмите обновить, чтобы загрузить список.';
        wrapper.appendChild(empty);
      } else {
        const widgetList = document.createElement('div');
        widgetList.className = 'widget-source-widgets__list';

        widgets.forEach((widgetName) => {
          const widgetKey = getWidgetSourceWidgetKey(source, widgetName);
          const label = document.createElement('label');
          label.className = 'widget-source-widgets__item' + (disabledWidgets[widgetKey] ? ' is-disabled' : '');

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'widget-source-widgets__checkbox';
          checkbox.checked = disabledWidgets[widgetKey] !== true;
          checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
              delete disabledWidgets[widgetKey];
            } else {
              disabledWidgets[widgetKey] = true;
            }
            saveDisabledWidgets(draw);
          });

          const name = document.createElement('span');
          name.className = 'widget-source-widgets__name';
          name.textContent = widgetName;

          label.appendChild(checkbox);
          label.appendChild(name);
          widgetList.appendChild(label);
        });

        wrapper.appendChild(widgetList);
      }

      if (isLocalSource) {
        const uploadBtn = document.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.className = 'widget-source-widgets__upload';
        uploadBtn.textContent = 'Загрузить';
        uploadBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          openLocalWidgetUploadPopup(source);
        });
        wrapper.appendChild(uploadBtn);
      }

      return wrapper;
    }

    function draw(focusId) {
      list.innerHTML = '';

      defaults.concat(custom).forEach((source) => {
        const isReadonly = !!source.readonly;
        const status = syncStatus[source.id] || {};
        const isSyncing = status.state === 'syncing';
        const row = document.createElement('div');
        row.className = [
          'widget-sources__row',
          isReadonly ? 'is-readonly' : '',
          isSyncing ? 'is-syncing' : '',
          status.state === 'error' ? 'is-error' : '',
          status.state === 'success' ? 'is-success' : ''
        ].filter(Boolean).join(' ');
        row.dataset.id = source.id;

        const isOpen = openSourceIds.has(source.id);
        if (isOpen) row.classList.add('is-open');

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'widget-sources__toggle';
        toggleBtn.setAttribute('aria-label', isOpen ? 'Скрыть виджеты источника' : 'Показать виджеты источника');
        toggleBtn.title = isOpen ? 'Скрыть виджеты источника' : 'Показать виджеты источника';
        toggleBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (isOpen) openSourceIds.delete(source.id);
          else openSourceIds.add(source.id);
          draw();
        });

        const type = document.createElement('select');
        type.className = 'widget-sources__type';
        [
          { value: 'github', label: 'GitHub' },
          { value: 'folder', label: 'Сайт' }
        ].forEach((item) => {
          const optionEl = document.createElement('option');
          optionEl.value = item.value;
          optionEl.textContent = item.label;
          type.appendChild(optionEl);
        });
        type.value = normalizeWidgetSourceType(source.type);

        const fields = document.createElement('div');
        fields.className = 'widget-sources__fields';

        const title = document.createElement('input');
        title.className = 'widget-sources__name';
        title.value = source.title || '';
        title.placeholder = 'Название';
        title.disabled = isReadonly;

        const url = document.createElement('input');
        url.className = 'widget-sources__url';
        url.value = source.type === 'local' ? 'chrome.storage.local' : source.url || '';
        url.placeholder = getWidgetSourceUrlPlaceholder(source.type);
        url.disabled = isReadonly;

        function commitField() {
          if (isReadonly) return;
          const previousUrl = source.url;
          source.title = title.value.trim();
          source.url = normalizeUrl(url.value);
          title.value = source.title;
          url.value = source.url;
          saveSources(() => {
            if (source.url && source.url !== previousUrl) syncSource(source);
          });
        }

        let remove = null;
        if (!isReadonly) {
          type.addEventListener('change', () => {
            const previousType = source.type;
            source.type = normalizeWidgetSourceType(type.value);
            url.placeholder = getWidgetSourceUrlPlaceholder(source.type);
            saveSources(() => {
              if (source.url && source.type !== previousType) syncSource(source);
            });
          });

          [title, url].forEach((input) => {
            input.addEventListener('click', (event) => event.stopPropagation());
            input.addEventListener('blur', commitField);
            input.addEventListener('keydown', (event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                input.blur();
              }
            });
          });

          remove = document.createElement('button');
          remove.type = 'button';
          remove.className = 'widget-sources__remove';
          remove.setAttribute('aria-label', 'Удалить источник');
          remove.textContent = '×';
          remove.addEventListener('click', (event) => {
            event.stopPropagation();
            custom = custom.filter((item) => item.id !== source.id);
            openSourceIds.delete(source.id);
            removeDisabledWidgetsForSource(source.id);
            forgetSource(source.id);
            saveSources();
            draw();
          });
        }

        fields.appendChild(title);
        fields.appendChild(url);
        row.appendChild(toggleBtn);
        if (!isReadonly) row.appendChild(type);
        row.appendChild(fields);
        if (remove) row.appendChild(remove);
        list.appendChild(row);

        if (isOpen) {
          list.appendChild(buildWidgetSourceWidgetsPanel(source, status));
        }

        if (focusId && focusId === source.id) {
          requestAnimationFrame(() => {
            url.focus();
            url.select();
          });
        }
      });
    }

    addBtn.addEventListener('click', () => {
      const source = {
        id: createWidgetSourceId(),
        title: '',
        type: 'github',
        url: ''
      };
      custom.push(source);
      saveSources();
      draw(source.id);
    });

    draw();
    updateWidgetSourceLocalState();

    panel.appendChild(list);
    panel.appendChild(addBtn);
    return panel;
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

    const header = document.createElement('div');
    header.className = 'browser-tabs-option__header';

    const title = document.createElement('div');
    title.className = 'browser-tabs-option__title';
    title.textContent = option.label;

    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'browser-tabs-option__collapse';

    const content = document.createElement('div');
    content.className = 'browser-tabs-option__content';

    const list = document.createElement('div');
    list.className = 'browser-tabs-option__list';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'browser-tabs-option__add';
    addBtn.textContent = '+ Добавить ссылку';

    function save() {
      chrome.storage.sync.set({ [storageKey]: tabs }, () => applyCurrentTab(option));
    }

    let isOpen = false;

    function syncOpenState() {
      li.classList.toggle('is-open', isOpen);
      content.hidden = !isOpen;
      collapseBtn.setAttribute('aria-expanded', String(isOpen));
      collapseBtn.setAttribute('aria-label', isOpen ? 'Свернуть закрепленные ссылки' : 'Раскрыть закрепленные ссылки');
      collapseBtn.title = isOpen ? 'Свернуть' : 'Раскрыть';
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
        toggle.setAttribute('aria-label', tab.active ? 'Отключить ссылку' : 'Включить ссылку');

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
          tab.title = name.value.trim() || tab.title || 'Новая ссылка';
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
        title: 'Новая ссылка',
        url: '',
        active: false,
        custom: true
      };
      tabs.push(tab);
      save();
      draw(tab.id);
    });

    draw();
    syncOpenState();

    collapseBtn.addEventListener('click', () => {
      isOpen = !isOpen;
      syncOpenState();
    });

    header.appendChild(title);
    header.appendChild(collapseBtn);
    content.appendChild(list);
    content.appendChild(addBtn);
    li.appendChild(header);
    li.appendChild(content);
    return li;
  }

  function requestPendingReloadState() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.runtime.sendMessage({ action: 'requestDirtyState', tabId: tabs[0].id });
      }
    });
  }

  function renderOptions(settings) {
    featuresContainer.innerHTML = '';

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

        if (option.type === 'widgetSourcesToggle') {
          ul.appendChild(renderWidgetSourcesToggleOption(option, storageKey, settings));
          continue;
        }

        const li = document.createElement('li');
        li.className = 'option-item';
        const isLockedByFreePlan = isOptionDisabledByFreePlan(option);
        if (isLockedByFreePlan) li.classList.add('is-disabled-by-free-plan');

        const label = document.createElement('label');
        if (isLockedByFreePlan) label.title = 'Недоступно на бесплатном тарифе TapTop';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = storageKey;
        const storedValue = getConfiguredOptionValue(settings, storageKey, option);
        cb.checked = isLockedByFreePlan ? false : !!storedValue;
        cb.disabled = isLockedByFreePlan;

        cb.addEventListener('change', (e) => {
          if (isOptionDisabledByFreePlan(option)) {
            e.target.checked = false;
            return;
          }
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

    requestPendingReloadState();
  }

  function readSyncSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(null, (settings) => resolve(settings || {}));
    });
  }

  async function loadPopupState() {
    try {
      const [tariffState, settings] = await Promise.all([
        getActiveTabTariffState(),
        readSyncSettings()
      ]);

      activeTariffState = tariffState || { isFree: false, source: 'empty' };
      updateHeaderMenuForTariff();

      const effectiveSettings = { ...(settings || {}) };
      if (isFreePlanActive()) refreshCurrentTabFeatures();

      const patch = await getPaidPlanRestorePatch(effectiveSettings);
      Object.assign(effectiveSettings, patch);

      if (Object.keys(patch).length) {
        chrome.storage.sync.set(patch, () => {
          refreshCurrentTabFeatures();
          renderOptions(effectiveSettings);
        });
        return;
      }

      renderOptions(effectiveSettings);
    } catch (e) {
      activeTariffState = { isFree: false, source: 'error' };
      updateHeaderMenuForTariff();
      renderOptions(await readSyncSettings());
    }
  }

  // Рендер опций + загрузка состояний
  loadPopupState();

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

  widgetSourcesBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    openWidgetSourcesPopup();
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
      closeWidgetSourcesPopup();
    }
  });
});
