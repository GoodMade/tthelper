(function () {
  try {
    window.__ttEnhancerMiniBrowser?.destroy?.();
    if (window.__ttEnhancerIsolatedInjected) {
      delete window.__ttEnhancerIsolatedInjected['features/mini-browser/browser-panel.js'];
      delete window.__ttEnhancerIsolatedInjected['features/mini-browser/browser-panel.deinit.js'];
    }
  } catch (e) {}
})();
