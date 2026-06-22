(function () {
  try {
    window.__ttEnhancerSearchReplace?.destroy?.();
  } catch {}

  document.querySelectorAll('.tt-search-replace').forEach((node) => {
    const host = node.parentElement;
    node.remove();
    host?.classList?.remove?.('tt-search-replace-tabs-host');
  });
  document.querySelectorAll('.tt-search-replace-tabs-item').forEach((node) => {
    const host = node.parentElement;
    node.remove();
    host?.classList?.remove?.('tt-search-replace-tabs-host');
  });
})();
