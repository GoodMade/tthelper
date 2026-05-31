(function () {
  try {
    const state = window.__ttEnhancerEmbedContextMenu;
    if (state?.observer?.disconnect) state.observer.disconnect();
    if (state?.onContextMenu) document.removeEventListener('contextmenu', state.onContextMenu, true);
    if (state?.onLayerClick) document.removeEventListener('click', state.onLayerClick, true);
    if (state?.onLayerClick) document.removeEventListener('mouseup', state.onLayerClick, true);
    if (state?.onDocumentMouseDown) document.removeEventListener('mousedown', state.onDocumentMouseDown, true);
    if (state?.onViewportChange) document.removeEventListener('scroll', state.onViewportChange, true);
    if (state?.onViewportChange) window.removeEventListener('resize', state.onViewportChange, true);
    document.querySelectorAll('[data-tt-enhancer-embed-inline-edit]').forEach((el) => el.remove());
    delete window.__ttEnhancerEmbedContextMenu;
    delete window.__ttEnhancerCurrentEmbedEditorContext;
  } catch (e) {}
})();
