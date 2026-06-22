(function () {
  const FEATURE_KEY = '__tt_enhancer_disable_tooltips_ctrl__';
  const BODY_CLASS = 'tt-enhancer-show-tooltips-on-ctrl';

  if (window[FEATURE_KEY]) return;
  window[FEATURE_KEY] = true;

  function setCtrlState(isPressed) {
    document.body?.classList.toggle(BODY_CLASS, !!isPressed);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Control' || event.ctrlKey) setCtrlState(true);
  }, true);

  document.addEventListener('keyup', (event) => {
    if (event.key === 'Control' || !event.ctrlKey) setCtrlState(false);
  }, true);

  window.addEventListener('blur', () => setCtrlState(false));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) setCtrlState(false);
  });
})();
