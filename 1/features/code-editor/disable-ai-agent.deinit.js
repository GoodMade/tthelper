(function () {
  try {
    const observer = window.__ttEnhancerDisableAiObserver;
    if (observer?.disconnect) observer.disconnect();
    window.__ttEnhancerDisableAiObserver = null;

    document.querySelectorAll('.tt-popup__title[data-tt-ai-title-renamed="1"]').forEach((title) => {
      const original = title.dataset.ttAiOriginalTitle;
      if (!original) return;
      for (const node of title.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent === 'Редактор кода') {
          node.textContent = original;
          break;
        }
      }
      delete title.dataset.ttAiOriginalTitle;
      delete title.dataset.ttAiTitleRenamed;
    });
  } catch (e) {}
})();
