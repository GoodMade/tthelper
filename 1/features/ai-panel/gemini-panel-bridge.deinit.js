(function () {
  try {
    window.__ttEnhancerAiPanelBridge?.destroy?.();
    if (window.__ttEnhancerIsolatedInjected) {
      delete window.__ttEnhancerIsolatedInjected['features/ai-panel/gemini-panel-bridge.deinit.js'];
    }
  } catch {}
})();
