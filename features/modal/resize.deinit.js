(function () {
  try {
	const obs = window.__ttEnhancerModalObserver;
	if (obs && obs.disconnect) obs.disconnect();
	if (window.__ttEnhancerModalResizeHandler) {
	  window.removeEventListener('resize', window.__ttEnhancerModalResizeHandler);
	  window.__ttEnhancerModalResizeHandler = null;
	}
	if (window.__ttEnhancerModalStackHandler) {
	  document.removeEventListener('pointerdown', window.__ttEnhancerModalStackHandler, true);
	  window.__ttEnhancerModalStackHandler = null;
	}
  } catch (e) {}

  document.querySelectorAll('.tt-universal-modal').forEach((modal) => {
	if (modal.__ttCtx?.modeObserver?.disconnect) modal.__ttCtx.modeObserver.disconnect();
	if (modal.__ttCtx?.dragCleanup) modal.__ttCtx.dragCleanup();
	if (modal.__ttCtx?.stackFocusListener) {
	  modal.removeEventListener('focusin', modal.__ttCtx.stackFocusListener, true);
	}
	delete modal.__ttCtx;
	modal.classList.remove('tt-enhancer--fullheight', 'tt-enhancer--stack-active', 'tt-enhancer--stack-background');
	modal.removeAttribute('data-tt-enhancer');
	const controls = modal.querySelector('.tt-enhancer-controls');
	if (controls) controls.remove();
	const resizer = modal.querySelector('.tt-enhancer-resizer');
	if (resizer) resizer.remove();
  });
  document.getElementById('tt-enhancer-mini-browser-panel')?.classList.remove('is-stack-active');
})();
