// Импортируем конфиг опций
importScripts('features/config.js');

const CMS_CONTENT_SCRIPT_MATCHES = [
  'http://*/-/cms',
  'https://*/-/cms',
  'http://*/-/cms/*',
  'https://*/-/cms/*'
];
const DVH_PRELOAD_CONTENT_SCRIPT_ID = 'tt-enhancer-dvh-preload';

async function syncDvhPreloadContentScript(settings) {
  if (!chrome.scripting?.registerContentScripts) return;

  const option = featuresConfig.rightPanelInterface.options.dvhHeight;
  const storageKey = option.storageKey || 'rightPanelInterface_dvhHeight';
  const value = getOptionValue(settings || {}, storageKey, option);
  const shouldRegister = isOptionEnabled(option, value);

  try {
    const registered = await chrome.scripting.getRegisteredContentScripts({
      ids: [DVH_PRELOAD_CONTENT_SCRIPT_ID]
    });
    const isRegistered = registered.length > 0;

    if (shouldRegister && !isRegistered) {
      await chrome.scripting.registerContentScripts([{
        id: DVH_PRELOAD_CONTENT_SCRIPT_ID,
        matches: CMS_CONTENT_SCRIPT_MATCHES,
        js: ['features/units/dvh-preload.js'],
        runAt: 'document_start',
        world: 'MAIN'
      }]);
    } else if (!shouldRegister && isRegistered) {
      await chrome.scripting.unregisterContentScripts({
        ids: [DVH_PRELOAD_CONTENT_SCRIPT_ID]
      });
    }
  } catch (e) {
    console.warn('Taptop Enhancer dvh preload sync error:', e);
  }
}

// ============= Управление CSS (без перезагрузки) =============

function addCssTag(tabId, filePath, key) {
  const abs = chrome.runtime.getURL(filePath);
  chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: (href, id) => {
      if (document.querySelector(`style[data-tt-css="${id}"]`)) return;
      fetch(href, { credentials: 'omit' })
        .then(r => r.text())
        .then(css => {
          const s = document.createElement('style');
          s.setAttribute('data-tt-css', id);
          s.textContent = css;
          (document.head || document.documentElement).appendChild(s);
        })
        .catch(err => console.error('TT addCssTag error:', err));
    },
    args: [abs, key + '::' + filePath]
  });
}

function removeCssTag(tabId, filePath, key) {
  chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: (id) => {
      const s = document.querySelector(`style[data-tt-css="${id}"]`);
      if (s) s.remove();
    },
    args: [key + '::' + filePath]
  });
}

// ============= CSP-safe загрузка внешних JS и инъекция в MAIN =============

async function fetchExternalCode(url) {
  const res = await fetch(url, { credentials: 'omit', cache: 'no-cache' });
  if (!res.ok) throw new Error('Failed to fetch ' + url);
  return await res.text();
}

function injectInlineJsMain(tabId, code, key, dedupe = true) {
  chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: (codeText, markKey, shouldDedupe) => {
      if (shouldDedupe && markKey && window[markKey]) return; // дедупликация
      const s = document.createElement('script');
      s.textContent = codeText;
      (document.head || document.documentElement).appendChild(s);
      s.remove();
      if (shouldDedupe && markKey) window[markKey] = true;
    },
    args: [code, key, dedupe]
  });
}

async function injectJsRespectingCSP(tabId, externalUrls, localFiles) {
  try {
    // 1) Внешние модули: грузим код в SW и инжектим inline в MAIN
    for (const url of (externalUrls || [])) {
      const code = await fetchExternalCode(url);
      // метка чтобы не дублировать
      const markKey = '__tt_enhancer_ext_inline__' + url;
      injectInlineJsMain(tabId, code, markKey, true);
    }
    // 2) Локальные файлы: вставляем как page-скрипт через текст
    for (const file of (localFiles || [])) {
      const abs = chrome.runtime.getURL(file);
      const code = await fetchExternalCode(abs);
      injectInlineJsMain(tabId, code, '', false);
    }
    console.log('Taptop Enhancer: внешние и локальные JS инжектированы inline (CSP-safe)');
  } catch (e) {
    console.error('Taptop Enhancer CSP-safe inject error:', e);
  }
}

async function injectJsIsolated(tabId, localFiles) {
  try {
    for (const file of (localFiles || [])) {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'ISOLATED',
        func: (filePath) => {
          window.__ttEnhancerIsolatedInjected = window.__ttEnhancerIsolatedInjected || {};
          if (window.__ttEnhancerIsolatedInjected[filePath]) return false;
          window.__ttEnhancerIsolatedInjected[filePath] = true;
          return true;
        },
        args: [file]
      });
      if (!results?.[0]?.result) continue;
      await chrome.scripting.executeScript({
        target: { tabId },
        world: 'ISOLATED',
        files: [file]
      });
    }
  } catch (e) {
    console.error('Taptop Enhancer isolated inject error:', e);
  }
}

// ============= Управление правилами сетевых заголовков =============

async function setDnrRulesets(rulesetIds, isEnabled) {
  if (!rulesetIds || !rulesetIds.length || !chrome.declarativeNetRequest?.updateEnabledRulesets) {
    return;
  }

  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: isEnabled ? rulesetIds : [],
      disableRulesetIds: isEnabled ? [] : rulesetIds
    });
  } catch (e) {
    console.warn('Taptop Enhancer DNR ruleset error:', e);
  }
}

async function syncDnrRulesetsFromSettings(settings) {
  const enable = new Set();
  const disable = new Set();

  for (const categoryId in featuresConfig) {
    const category = featuresConfig[categoryId];
    for (const optionId in category.options) {
      const option = category.options[optionId];
      if (!option.dnrRulesets?.length) continue;

      const fullId = categoryId + '_' + optionId;
      const storageKey = option.storageKey || fullId;
      const value = getOptionValue(settings, storageKey, option);
      const isOn = isOptionEnabled(option, value);

      option.dnrRulesets.forEach((rulesetId) => {
        if (isOn) {
          enable.add(rulesetId);
          disable.delete(rulesetId);
        } else if (!enable.has(rulesetId)) {
          disable.add(rulesetId);
        }
      });
    }
  }

  if (!enable.size && !disable.size) return;

  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: Array.from(enable),
      disableRulesetIds: Array.from(disable)
    });
  } catch (e) {
    console.warn('Taptop Enhancer DNR sync error:', e);
  }
}

async function syncDynamicFrameRulesFromSettings(settings) {
  if (!chrome.declarativeNetRequest?.updateDynamicRules) return;

  const removeRuleIds = Array.from({ length: 100 }, (_, index) => 5000 + index);
  const hosts = [];

  for (const categoryId in featuresConfig) {
    const category = featuresConfig[categoryId];
    for (const optionId in category.options) {
      const option = category.options[optionId];
      if (option.type !== 'browserTabs') continue;

      const fullId = categoryId + '_' + optionId;
      const storageKey = option.storageKey || fullId;
      const value = getOptionValue(settings, storageKey, option);
      if (!Array.isArray(value)) continue;

      value.forEach((tab) => {
        if (!tab || tab.active === false || !tab.url) return;
        try {
          const host = new URL(tab.url).hostname;
          if (host && !hosts.includes(host)) hosts.push(host);
        } catch (e) {}
      });
    }
  }

  const addRules = hosts.slice(0, 100).map((host, index) => ({
    id: 5000 + index,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      responseHeaders: [
        { header: 'x-frame-options', operation: 'remove' },
        { header: 'content-security-policy', operation: 'remove' },
        { header: 'content-security-policy-report-only', operation: 'remove' }
      ]
    },
    condition: {
      urlFilter: '||' + host + '^',
      resourceTypes: ['sub_frame']
    }
  }));

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules
    });
  } catch (e) {
    console.warn('Taptop Enhancer dynamic DNR sync error:', e);
  }
}

chrome.storage.sync.get(null, (settings) => {
  syncDvhPreloadContentScript(settings);
  syncDnrRulesetsFromSettings(settings);
  syncDynamicFrameRulesFromSettings(settings);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return;
  if (!Object.prototype.hasOwnProperty.call(changes, 'units_dvhHeight')) return;

  chrome.storage.sync.get(null, (settings) => {
    syncDvhPreloadContentScript(settings);
  });
});

function getOptionValue(settings, storageKey, option) {
  if (Object.prototype.hasOwnProperty.call(settings, storageKey)) return settings[storageKey];
  if (option.fallbackStorageKey && Object.prototype.hasOwnProperty.call(settings, option.fallbackStorageKey)) {
    return settings[option.fallbackStorageKey];
  }
  return option.defaultValue;
}

function isOptionEnabled(option, value) {
  if (option.type === 'browserTabs') {
    return Array.isArray(value) && value.some(tab => tab && tab.active !== false && tab.url);
  }
  return !!value;
}

// ============= Отслеживание состояния вкладок =============

const tabState = new Map(); // tabId -> { applied: Set<string>, pendingReload: boolean }
const pendingReloadKey = (tabId) => `tt_pending_reload_${tabId}`;
const miniBrowserHosts = new Set();

function isCmsUrl(url) {
  try {
    const parsed = new URL(url || '');
    return /^https?:$/.test(parsed.protocol) && /^\/-\/cms(?:\/|$)/.test(parsed.pathname);
  } catch (e) {
    return false;
  }
}

function updateActionForTab(tabId, url) {
  if (!chrome.action || typeof tabId !== 'number') return;

  const enabled = isCmsUrl(url);
  if (enabled) {
    chrome.action.enable(tabId);
    chrome.action.setTitle({ tabId, title: 'TapTop Helper' });
  } else {
    chrome.action.disable(tabId);
    chrome.action.setTitle({ tabId, title: 'TapTop Helper работает только на страницах /-/cms' });
  }
}

function markApplied(tabId, key) {
  const s = tabState.get(tabId) || { applied: new Set(), pendingReload: false };
  s.applied.add(key);
  tabState.set(tabId, s);
}

function markRemoved(tabId, key) {
  const s = tabState.get(tabId) || { applied: new Set(), pendingReload: false };
  s.applied.delete(key);
  tabState.set(tabId, s);
}

function setPendingReload(tabId, val) {
  const s = tabState.get(tabId) || { applied: new Set(), pendingReload: false };
  s.pendingReload = !!val;
  tabState.set(tabId, s);
  chrome.storage.local.set({ [pendingReloadKey(tabId)]: !!val });
}

function getState(tabId) {
  return tabState.get(tabId) || { applied: new Set(), pendingReload: false };
}

async function openMiniBrowserSidePanel(req, sender, sendResponse) {
  const url = String(req?.url || '').trim();
  if (!chrome.sidePanel?.open) {
    sendResponse?.({ ok: false, error: 'Side Panel API недоступен' });
    return;
  }

  try {
    if (!sender.tab?.windowId) {
      sendResponse?.({ ok: false, error: 'Не удалось определить окно Chrome для Side Panel' });
      return;
    }

    // Важно: open() должен выполняться как можно ближе к клику пользователя.
    // Любой await до него может сбросить user activation в Chrome.
    const openPromise = chrome.sidePanel.open({ windowId: sender.tab.windowId });

    if (url) {
      await chrome.storage.session.set({
        ttMiniBrowserSidePanel: {
          url,
          title: String(req.title || url),
          updatedAt: Date.now()
        }
      });
    }

    await openPromise;
    sendResponse?.({ ok: true });
  } catch (e) {
    console.warn('Taptop Enhancer side panel open error:', e);
    sendResponse?.({ ok: false, error: e?.message || String(e) });
  }
}

function openMiniBrowserSidePanelLast(req, sender, sendResponse) {
  openMiniBrowserSidePanel({ url: '' }, sender, sendResponse);
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function getMiniBrowserPageTitle(req, sendResponse) {
  const url = String(req?.url || '').trim();
  if (!/^https?:\/\//i.test(url)) {
    sendResponse?.({ ok: false });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      cache: 'no-cache',
      credentials: 'omit',
      headers: { Range: 'bytes=0-131071' },
      signal: controller.signal
    });
    const html = await response.text();
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = decodeHtmlEntities(match?.[1] || '').replace(/\s+/g, ' ').trim().slice(0, 140);
    sendResponse?.({ ok: !!title, title });
  } catch (e) {
    sendResponse?.({ ok: false, error: e?.message || String(e) });
  } finally {
    clearTimeout(timeout);
  }
}

// ============= Применение опций к вкладке =============

function applyFeatures(tabId) {
  chrome.storage.sync.get(null, async (settings) => {
    await syncDnrRulesetsFromSettings(settings);
    await syncDynamicFrameRulesFromSettings(settings);

    chrome.tabs.get(tabId, async (tab) => {
      if (!tab || !isCmsUrl(tab.url)) return;

      let needsReload = false;

      for (const categoryId in featuresConfig) {
        const category = featuresConfig[categoryId];
        for (const optionId in category.options) {
          const option = category.options[optionId];
          const fullId = categoryId + '_' + optionId;
          const storageKey = option.storageKey || fullId;
          const value = getOptionValue(settings, storageKey, option);
          const isOn = isOptionEnabled(option, value);
          const key = storageKey;

          if (option.dnrRulesets && isOn) {
            await setDnrRulesets(option.dnrRulesets, true);
          }

          // CSS: управляемые style-теги (вставка/удаление)
          if (option.css && option.css.length) {
            if (isOn) {
              option.css.forEach(f => addCssTag(tabId, f, key));
            } else {
              option.css.forEach(f => removeCssTag(tabId, f, key));
            }
          }

          // JS: CSP-safe инъекция inline в MAIN
          if ((option.external_js && option.external_js.length) || (option.js && option.js.length)) {
            if (isOn) {
              await injectJsRespectingCSP(tabId, option.external_js || [], option.js || []);
            } else {
              if (option.deinit) {
                const deFiles = Array.isArray(option.deinit) ? option.deinit : [option.deinit];
                await injectJsRespectingCSP(tabId, [], deFiles);
              } else if (option.reloadRequired) {
                needsReload = true;
              }
            }
          }

          if (option.isolated_js && option.isolated_js.length) {
            if (isOn) {
              await injectJsIsolated(tabId, option.isolated_js || []);
            } else if (option.isolated_deinit) {
              const deFiles = Array.isArray(option.isolated_deinit) ? option.isolated_deinit : [option.isolated_deinit];
              await injectJsIsolated(tabId, deFiles);
            } else if (option.reloadRequired) {
              needsReload = true;
            }
          }

          if (option.dnrRulesets && !isOn) {
            await setDnrRulesets(option.dnrRulesets, false);
          }

          if (isOn) markApplied(tabId, key); else markRemoved(tabId, key);
        }
      }

      setPendingReload(tabId, needsReload);
      console.log('Taptop Enhancer: состояние опций применено');
    });
  });
}

// Автоприменение при полной загрузке вкладки редактора
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab?.url || changeInfo.url) {
    updateActionForTab(tabId, tab?.url || changeInfo.url);
  }

  if (changeInfo.status === 'complete' && tab && isCmsUrl(tab.url)) {
    applyFeatures(tabId);
    setPendingReload(tabId, false);
  }

  if (miniBrowserHosts.has(tabId) && changeInfo.url) {
    miniBrowserHosts.delete(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  miniBrowserHosts.delete(tabId);
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    updateActionForTab(tabId, tab?.url);
  });
});

chrome.tabs.onCreated.addListener((tab) => {
  updateActionForTab(tab.id, tab.pendingUrl || tab.url);

  const openerTabId = tab.openerTabId;
  if (typeof openerTabId !== 'number' || !miniBrowserHosts.has(openerTabId)) return;

  const handleUrl = (url) => {
    if (!url || url === 'about:blank' || url.startsWith('chrome://')) return false;
    chrome.tabs.sendMessage(openerTabId, {
      action: 'miniBrowserOpenUrl',
      url
    });
    chrome.tabs.remove(tab.id);
    return true;
  };

  if (handleUrl(tab.pendingUrl || tab.url)) return;

  const listener = (createdTabId, changeInfo) => {
    if (createdTabId !== tab.id) return;
    if (!handleUrl(changeInfo.url)) return;
    chrome.tabs.onUpdated.removeListener(listener);
  };
  chrome.tabs.onUpdated.addListener(listener);
  setTimeout(() => chrome.tabs.onUpdated.removeListener(listener), 5000);
});

chrome.tabs.query({}, (tabs) => {
  if (chrome.runtime.lastError) return;
  tabs.forEach((tab) => updateActionForTab(tab.id, tab.url || tab.pendingUrl));
});

// Сообщения popup ↔ background
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req && req.action === 'applyFeatures' && typeof req.tabId === 'number') {
    applyFeatures(req.tabId);
  }
  if (req && req.action === 'requestDirtyState' && typeof req.tabId === 'number') {
    const s = getState(req.tabId);
    chrome.storage.local.get(pendingReloadKey(req.tabId), (stored) => {
      chrome.runtime.sendMessage({
        action: 'tabDirtyState',
        tabId: req.tabId,
        pendingReload: !!(s.pendingReload || stored[pendingReloadKey(req.tabId)])
      });
    });
  }
  if (req && req.action === 'setPendingReload' && typeof req.tabId === 'number') {
    setPendingReload(req.tabId, !!req.value);
  }
  if (req && req.action === 'registerMiniBrowserHost' && sender.tab?.id) {
    miniBrowserHosts.add(sender.tab.id);
  }
  if (req && req.action === 'unregisterMiniBrowserHost' && sender.tab?.id) {
    miniBrowserHosts.delete(sender.tab.id);
  }
  if (req && req.action === 'openMiniBrowserWindow' && req.url) {
    chrome.windows.create({
      url: req.url,
      type: 'popup',
      width: 1100,
      height: 820,
      focused: true
    });
  }
  if (req && req.action === 'openExternalTab' && req.url) {
    chrome.tabs.create({
      url: req.url,
      active: true
    });
  }
  if (req && req.action === 'getMiniBrowserPageTitle') {
    getMiniBrowserPageTitle(req, sendResponse);
    return true;
  }
  if (req && req.action === 'openMiniBrowserSidePanel') {
    openMiniBrowserSidePanel(req, sender, sendResponse);
    return true;
  }
  if (req && req.action === 'openMiniBrowserSidePanelLast') {
    openMiniBrowserSidePanelLast(req, sender, sendResponse);
    return true;
  }
});
