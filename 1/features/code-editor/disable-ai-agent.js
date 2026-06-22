(function () {
  const MODAL_SELECTOR = '.tt-popup.tt-universal-modal.tt-popup-code-editor__modal';
  const TITLE_SELECTOR = '.tt-popup__title';
  const AI_TITLE_RE = /AI\s*Code\s*Generator/i;
  const NEW_TITLE = 'Редактор кода';

  function renameTitle(title) {
    if (!title || title.dataset.ttAiTitleRenamed === '1') return;

    for (const node of title.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && AI_TITLE_RE.test(node.textContent || '')) {
        title.dataset.ttAiOriginalTitle = node.textContent;
        node.textContent = NEW_TITLE;
        title.dataset.ttAiTitleRenamed = '1';
        return;
      }
    }

    if (AI_TITLE_RE.test(title.textContent || '')) {
      title.dataset.ttAiOriginalTitle = title.textContent;
      title.firstChild
        ? title.firstChild.textContent = NEW_TITLE
        : title.insertBefore(document.createTextNode(NEW_TITLE), title.firstChild);
      title.dataset.ttAiTitleRenamed = '1';
    }
  }

  function fitEditor(modal) {
    const codeBox = modal.querySelector('.tt-popup-code-editor-code__code');
    const codeEditor = modal.querySelector('.tt-code-editor');
    const aceRoot = modal.querySelector('#ace-editor.ace_editor') || modal.querySelector('.ace_editor');
    if (!codeBox || !codeEditor || !aceRoot) return false;

    const modalRect = modal.getBoundingClientRect();
    const codeRect = codeBox.getBoundingClientRect();
    const footerRect = modal.querySelector('.tt-popup-code-editor-footer')?.getBoundingClientRect();
    const footerH = footerRect ? footerRect.height : 0;
    const notesH = Array.from(modal.querySelectorAll('.tt-popup-code-editor-note'))
      .reduce((sum, el) => {
        const r = el.getBoundingClientRect();
        const visible = r.height > 0 && getComputedStyle(el).display !== 'none';
        return visible ? sum + r.height : sum;
      }, 0);
    const nextH = Math.max(360, Math.floor(modalRect.bottom - codeRect.top - footerH - notesH - 42));

    [codeBox, codeEditor, aceRoot].forEach((el) => {
      el.style.height = nextH + 'px';
      el.style.minHeight = '0';
    });
    aceRoot.style.width = '100%';
    try { ace.edit(aceRoot).resize(true); } catch (e) {}
    return true;
  }

  function scheduleEditorFitBurst(modal) {
    [0, 80, 180, 360, 700].forEach((delay) => {
      setTimeout(() => {
        fitEditor(modal);
      }, delay);
    });
  }

  function enhanceModal(modal) {
    if (!(modal instanceof HTMLElement)) return;
    if (modal.dataset.ttDisableAiApplied === '1') return;

    const title = modal.querySelector(TITLE_SELECTOR);
    if (!title) return;

    modal.dataset.ttDisableAiApplied = '1';
    renameTitle(title);
    scheduleEditorFitBurst(modal);
  }

  function findModalsFromNode(node) {
    if (!(node instanceof HTMLElement)) return [];
    if (node.matches(MODAL_SELECTOR)) return [node];

    const closest = node.closest?.(MODAL_SELECTOR);
    if (closest) return [closest];

    return Array.from(node.querySelectorAll?.(MODAL_SELECTOR) || []);
  }

  try {
    if (window.__ttEnhancerDisableAiObserver?.disconnect) {
      window.__ttEnhancerDisableAiObserver.disconnect();
    }

    document.querySelectorAll(MODAL_SELECTOR).forEach(enhanceModal);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          findModalsFromNode(node).forEach(enhanceModal);
        }
      }
    });
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    window.__ttEnhancerDisableAiObserver = observer;
  } catch (e) {}
})();
