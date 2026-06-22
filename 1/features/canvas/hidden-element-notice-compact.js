(function () {
  const STATE_KEY = '__ttEnhancerHiddenElementNoticeCompact';
  const NOTICE_TEXTS = ['Видимость элемента скрыта', 'Element visibility is hidden'];
  const NOTICE_ATTR = 'data-tt-enhancer-hidden-element-notice';

  const previous = window[STATE_KEY];
  if (previous?.restore) previous.restore();

  const state = {
    observer: null,
    restore() {
      state.observer?.disconnect();
      document.querySelectorAll(`.tt-top-bar[${NOTICE_ATTR}="true"]`).forEach((element) => {
        element.removeAttribute(NOTICE_ATTR);
      });
      if (window[STATE_KEY] === state) delete window[STATE_KEY];
    }
  };

  window[STATE_KEY] = state;

  function isHiddenElementNotice(element) {
    if (!element || !element.classList?.contains('tt-top-bar')) return false;

    const ownText = Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent.trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return NOTICE_TEXTS.some((text) => ownText === text);
  }

  function updateNotice(element) {
    if (!element?.classList?.contains('tt-top-bar')) return;
    if (isHiddenElementNotice(element)) {
      element.setAttribute(NOTICE_ATTR, 'true');
    } else {
      element.removeAttribute(NOTICE_ATTR);
    }
  }

  function scan(root) {
    if (!root?.querySelectorAll) return;

    if (root.classList?.contains('tt-top-bar')) updateNotice(root);
    root.querySelectorAll('.tt-top-bar').forEach(updateNotice);
  }

  scan(document);

  state.observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        updateNotice(mutation.target);
        mutation.addedNodes.forEach(scan);
      } else if (mutation.type === 'characterData') {
        updateNotice(mutation.target.parentElement);
      }
    });
  });

  state.observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();
