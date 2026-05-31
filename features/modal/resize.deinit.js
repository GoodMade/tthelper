(function () {
  try {
	const obs = window.__ttEnhancerModalObserver;
	if (obs && obs.disconnect) obs.disconnect();
	if (window.__ttEnhancerModalResizeHandler) {
	  window.removeEventListener('resize', window.__ttEnhancerModalResizeHandler);
	  window.__ttEnhancerModalResizeHandler = null;
	}
  } catch (e) {}

  document.querySelectorAll('.tt-universal-modal').forEach((modal) => {
	if (modal.__ttCtx?.modeObserver?.disconnect) modal.__ttCtx.modeObserver.disconnect();
	if (modal.__ttCtx?.dragCleanup) modal.__ttCtx.dragCleanup();
	delete modal.__ttCtx;
	modal.classList.remove('tt-enhancer--fullheight');
	modal.removeAttribute('data-tt-enhancer');
	const controls = modal.querySelector('.tt-enhancer-controls');
	if (controls) controls.remove();
	const resizer = modal.querySelector('.tt-enhancer-resizer');
	if (resizer) resizer.remove();
  });
})();
