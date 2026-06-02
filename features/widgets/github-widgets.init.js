(function () {
  const key = '__ttEnhancerEmbedContextMenuFeatures';
  const features = window[key] || {};

  if (typeof features.inlineEdit !== 'boolean') features.inlineEdit = false;
  if (typeof features.scriptWidget !== 'boolean') features.scriptWidget = false;
  features.githubWidgets = true;

  window[key] = features;
})();
