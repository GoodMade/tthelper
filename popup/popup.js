document.addEventListener('DOMContentLoaded', () => {
  const featuresContainer = document.getElementById('features-container');
  const applyBtn = document.getElementById('apply-btn');
  let hasLocalReloadChange = false;
  let activeHelp = null;
  let activeHelpKey = '';

  function updateApplyVisibility(pendingReload) {
    applyBtn.style.display = pendingReload ? 'inline-block' : 'none';
    applyBtn.disabled = !pendingReload;
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
        cb.checked = Object.prototype.hasOwnProperty.call(settings, storageKey)
          ? !!settings[storageKey]
          : !!option.defaultValue;

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

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeHelpPopup();
  });
});
