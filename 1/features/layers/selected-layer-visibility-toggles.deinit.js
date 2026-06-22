(function () {
  try {
    const state = window.__ttEnhancerLayerVisibilityToggles;
    if (state?.observer?.disconnect) state.observer.disconnect();
    if (state?.onLayerClick) document.removeEventListener('click', state.onLayerClick, true);
    if (state?.onLayerClick) document.removeEventListener('mouseup', state.onLayerClick, true);
    if (state?.onDocumentMouseDown) document.removeEventListener('mousedown', state.onDocumentMouseDown, true);
    if (state?.onViewportChange) document.removeEventListener('scroll', state.onViewportChange, true);
    if (state?.onViewportChange) window.removeEventListener('resize', state.onViewportChange, true);
    if (state?.onKeyDown) document.removeEventListener('keydown', state.onKeyDown, true);
    if (state?.onKeyUp) document.removeEventListener('keyup', state.onKeyUp, true);
    if (state?.onWindowBlur) window.removeEventListener('blur', state.onWindowBlur, true);
    document.querySelectorAll('[data-tt-enhancer-layer-visibility-toggles]').forEach((el) => el.remove());
    delete window.__ttEnhancerLayerVisibilityToggles;
  } catch (e) {}
})();
