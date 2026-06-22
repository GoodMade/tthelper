(function () {
  try {
    const state = window.__ttEnhancerEmbedContextMenu;
    if (state?.observer?.disconnect) state.observer.disconnect();
    if (state?.onContextMenu) document.removeEventListener('contextmenu', state.onContextMenu, true);
    if (state?.onLayerClick) document.removeEventListener('click', state.onLayerClick, true);
    if (state?.onLayerClick) document.removeEventListener('mouseup', state.onLayerClick, true);
    if (state?.onDocumentMouseDown) document.removeEventListener('mousedown', state.onDocumentMouseDown, true);
    if (state?.onDocumentDragOver) document.removeEventListener('dragover', state.onDocumentDragOver, true);
    if (state?.onDocumentDrop) document.removeEventListener('drop', state.onDocumentDrop, true);
    if (state?.onDocumentDragEnd) document.removeEventListener('dragend', state.onDocumentDragEnd, true);
    if (state?.onViewportChange) document.removeEventListener('scroll', state.onViewportChange, true);
    if (state?.onViewportChange) window.removeEventListener('resize', state.onViewportChange, true);
    if (state?.clearScriptWidgetExpandTimer) state.clearScriptWidgetExpandTimer();
    if (state?.clearGithubWidgetTimers) state.clearGithubWidgetTimers();
    document.querySelectorAll('[data-tt-enhancer-embed-inline-edit]').forEach((el) => el.remove());
    document.querySelectorAll('[data-tt-enhancer-create-script-menu-item]').forEach((el) => el.remove());
    document.querySelectorAll('[data-tt-enhancer-script-widget]').forEach((el) => el.remove());
    document.querySelectorAll('[data-tt-enhancer-github-widget]').forEach((el) => el.remove());
    document.querySelectorAll('.tt-enhancer-github-widget-toast').forEach((el) => el.remove());
    document.querySelectorAll('[data-tt-enhancer-script-drop-target]').forEach((el) => {
      el.removeAttribute('data-tt-enhancer-script-drop-target');
      el.style.removeProperty('box-shadow');
      el.style.removeProperty('background');
    });
    delete window.__ttEnhancerEmbedContextMenu;
    delete window.__ttEnhancerCurrentEmbedEditorContext;
  } catch (e) {}
})();
