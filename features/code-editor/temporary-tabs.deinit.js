(function () {
  try {
    window.__ttEnhancerCodeTabs?.observer?.disconnect?.();
  } catch {}

  document.querySelectorAll('.tt-code-tabs').forEach((el) => el.remove());
  document.querySelectorAll('.tt-code-tabs-menu').forEach((el) => el.remove());
  document.querySelectorAll('.tt-popup-code-editor__modal[data-tt-code-tabs-applied]').forEach((modal) => {
    delete modal.__ttCodeTabs;
    delete modal.dataset.ttCodeTabsApplied;
  });

  try {
    delete window.__ttEnhancerCodeTabs;
  } catch {}
})();
