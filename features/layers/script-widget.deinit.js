(function () {
  const key = '__ttEnhancerEmbedContextMenuFeatures';
  const features = window[key] || {};
  if (typeof features.inlineEdit !== 'boolean') features.inlineEdit = false;
  features.scriptWidget = false;
  window[key] = features;
})();
