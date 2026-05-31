(function () {
  const key = '__ttEnhancerEmbedContextMenuFeatures';
  const features = window[key] || {};
  features.inlineEdit = true;
  if (typeof features.scriptWidget !== 'boolean') features.scriptWidget = false;
  window[key] = features;
})();
