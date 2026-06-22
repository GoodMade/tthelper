(function () {
  try {
    window.__ttEnhancerAiPanel?.destroy?.();
    window.__ttEnhancerGeminiPanel?.destroy?.();
    document.documentElement?.classList?.remove(
      'tt-enhancer-ai-is-resizing',
      'tt-enhancer-ai-is-resizing--ew',
      'tt-enhancer-ai-is-resizing--ns',
      'tt-enhancer-ai-is-resizing--nesw',
      'tt-enhancer-ai-is-resizing--nwse'
    );
    document.getElementById('tt-enhancer-ai-panel')?.remove();
    document.getElementById('tt-enhancer-ai-button')?.remove();
    document.getElementById('tt-enhancer-ai-rail-button')?.remove();
    document.querySelectorAll('.tt-enhancer-ai-canvas-host').forEach((node) => {
      node.classList?.remove('tt-enhancer-ai-canvas-host');
    });
    document.querySelectorAll([
      '#tt-enhancer-gemini-panel',
      '#tt-enhancer-gemini-button',
      '.tt-enhancer-gemini-panel',
      '.tt-enhancer-gemini-button',
      '[id^="tt-enhancer-gemini"]',
      '[class*="tt-enhancer-gemini-"]'
    ].join(',')).forEach((node) => node.remove?.());
  } catch (e) {}
})();
