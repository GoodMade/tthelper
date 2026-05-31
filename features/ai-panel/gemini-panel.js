(function () {
  const BUTTON_ID = 'tt-enhancer-gemini-button';
  const PANEL_ID = 'tt-enhancer-gemini-panel';
  const GEMINI_URL = 'https://gemini.google.com/';
  const OPEN_KEY = 'tt_enhancer_gemini_panel_open';

  const existing = window.__ttEnhancerGeminiPanel;
  if (existing?.mount) {
    existing.mount();
    return;
  }

  const state = {
    observer: null,
    button: null,
    panel: null,
    iframe: null,
    hasLoadedFrame: false,
    isOpen: false,
    mount,
    destroy
  };

  function readOpenState() {
    try {
      return localStorage.getItem(OPEN_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function writeOpenState(isOpen) {
    try {
      localStorage.setItem(OPEN_KEY, isOpen ? '1' : '0');
    } catch (e) {}
  }

  function iconSvg(name) {
    if (name === 'close') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.3 19.7 2.89 18.29 9.17 12 2.89 5.71 4.3 4.3l6.29 6.29 6.3-6.29 1.41 1.41Z"/></svg>';
    }
    if (name === 'external') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3ZM5 5h7v2H7v10h10v-5h2v7H5V5Z"/></svg>';
    }
    return '<svg width="25" height="25" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.5c.55 3.15 2.33 4.93 5.5 5.5-3.17.57-4.95 2.35-5.5 5.5-.57-3.15-2.35-4.93-5.5-5.5 3.15-.57 4.93-2.35 5.5-5.5Zm5.6 9.1c.32 1.84 1.36 2.88 3.2 3.2-1.84.33-2.88 1.36-3.2 3.2-.33-1.84-1.36-2.87-3.2-3.2 1.84-.32 2.87-1.36 3.2-3.2ZM7.2 13.8c.25 1.43 1.06 2.24 2.5 2.5-1.44.25-2.25 1.06-2.5 2.5-.26-1.44-1.07-2.25-2.5-2.5 1.43-.26 2.24-1.07 2.5-2.5Z"/></svg>';
  }

  function createButton() {
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.className = 'tt-button tt-button--appearance-large-white tt-button--color-blue tt-button--state-default tt-enhancer-gemini-button';
    button.title = 'Gemini';
    button.setAttribute('aria-label', 'Открыть Gemini');
    button.innerHTML = '<span class="tt-button__icon tt-button__icon--size-large">' + iconSvg('gemini') + '</span>';
    stopTaptopModalEvents(button);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      setOpen(!state.isOpen);
    });
    return button;
  }

  function createPanel() {
    const panel = document.createElement('aside');
    panel.id = PANEL_ID;
    panel.className = 'tt-enhancer-gemini-panel';
    panel.setAttribute('aria-label', 'Gemini');
    stopTaptopModalEvents(panel);

    const bar = document.createElement('div');
    bar.className = 'tt-enhancer-gemini-panel__bar';

    const title = document.createElement('div');
    title.textContent = 'Gemini';

    const actions = document.createElement('div');
    actions.className = 'tt-enhancer-gemini-panel__actions';

    const external = document.createElement('button');
    external.type = 'button';
    external.className = 'tt-enhancer-gemini-panel__action';
    external.title = 'Открыть в новой вкладке';
    external.setAttribute('aria-label', 'Открыть Gemini в новой вкладке');
    external.innerHTML = iconSvg('external');
    external.addEventListener('click', (event) => {
      event.stopPropagation();
      window.open(GEMINI_URL, '_blank', 'noopener,noreferrer');
    });

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'tt-enhancer-gemini-panel__action';
    close.title = 'Скрыть';
    close.setAttribute('aria-label', 'Скрыть Gemini');
    close.innerHTML = iconSvg('close');
    close.addEventListener('click', (event) => {
      event.stopPropagation();
      setOpen(false);
    });

    actions.appendChild(external);
    actions.appendChild(close);
    bar.appendChild(title);
    bar.appendChild(actions);

    const wrap = document.createElement('div');
    wrap.className = 'tt-enhancer-gemini-panel__frame-wrap';

    const iframe = document.createElement('iframe');
    iframe.className = 'tt-enhancer-gemini-panel__frame';
    iframe.title = 'Gemini';
    iframe.dataset.src = GEMINI_URL;
    iframe.allow = 'clipboard-read; clipboard-write; microphone; camera; display-capture';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.addEventListener('load', () => {
      panel.classList.remove('is-loading');
    });

    const loader = document.createElement('div');
    loader.className = 'tt-enhancer-gemini-panel__loader';
    loader.setAttribute('aria-label', 'Загрузка Gemini');
    loader.innerHTML = '<div class="tt-enhancer-gemini-panel__spinner" aria-hidden="true"></div>';

    wrap.appendChild(iframe);
    wrap.appendChild(loader);
    panel.appendChild(bar);
    panel.appendChild(wrap);

    state.iframe = iframe;
    return panel;
  }

  function stopTaptopModalEvents(panel) {
    const stop = (event) => {
      event.stopPropagation();
    };

    [
      'click',
      'dblclick',
      'mousedown',
      'mouseup',
      'pointerdown',
      'pointerup',
      'touchstart',
      'touchend'
    ].forEach((eventName) => {
      panel.addEventListener(eventName, stop);
    });
  }

  function ensureFrameLoaded() {
    const iframe = state.iframe || document.querySelector('#' + PANEL_ID + ' iframe');
    if (!iframe) return;

    state.iframe = iframe;
    state.hasLoadedFrame = state.hasLoadedFrame || iframe.src === GEMINI_URL;
    if (!state.hasLoadedFrame) {
      state.panel?.classList.add('is-loading');
      iframe.src = iframe.dataset.src || GEMINI_URL;
      state.hasLoadedFrame = true;
    }
  }

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = createPanel();
      document.body.appendChild(panel);
    }
    state.panel = panel;
  }

  function setOpen(isOpen) {
    state.isOpen = !!isOpen;
    writeOpenState(state.isOpen);
    ensurePanel();
    if (state.isOpen) ensureFrameLoaded();
    state.panel.classList.toggle('is-open', state.isOpen);
    state.button?.classList.toggle('is-active', state.isOpen);
    state.button?.setAttribute('aria-pressed', state.isOpen ? 'true' : 'false');
  }

  function ensureButton() {
    const right = document.querySelector('.tt-header__right');
    if (!right) return false;

    let button = document.getElementById(BUTTON_ID);
    if (!button) {
      button = createButton();
    }

    if (!right.contains(button)) {
      const publish = right.querySelector('.tt-design-mode-publish');
      right.insertBefore(button, publish || null);
    }

    state.button = button;
    state.button.classList.toggle('is-active', state.isOpen);
    state.button.setAttribute('aria-pressed', state.isOpen ? 'true' : 'false');
    return true;
  }

  function mount() {
    state.isOpen = readOpenState();
    ensurePanel();
    setOpen(state.isOpen);
    ensureButton();

    if (state.observer?.disconnect) {
      state.observer.disconnect();
    }

    state.observer = new MutationObserver(() => {
      ensureButton();
      if (!document.getElementById(PANEL_ID)) ensurePanel();
    });
    state.observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  }

  function destroy() {
    state.observer?.disconnect?.();
    document.getElementById(BUTTON_ID)?.remove();
    document.getElementById(PANEL_ID)?.remove();
    delete window.__ttEnhancerGeminiPanel;
  }

  window.__ttEnhancerGeminiPanel = state;
  mount();
})();
