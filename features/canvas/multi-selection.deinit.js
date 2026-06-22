(function () {
  const STATE_KEY = '__ttEnhancerMultiSelectionState';
  
  if (window[STATE_KEY] && typeof window[STATE_KEY].destroy === 'function') {
    window[STATE_KEY].destroy();
  }
})();
