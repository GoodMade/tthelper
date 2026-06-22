(function () {
  try {
    window.__ttEnhancerGithubWidgetsBridge?.destroy?.();
    delete window.__ttEnhancerGithubWidgetsBridge;
  } catch (e) {}
})();
