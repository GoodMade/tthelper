(function () {
  const STATE_KEY = '__ttEnhancerDisableHiddenLayerAutoclose';
  const MAX_ATTEMPTS = 80;
  const RETRY_DELAY = 250;

  const previous = window[STATE_KEY];
  if (previous?.restore) previous.restore();

  const state = {
    attempts: 0,
    timer: 0,
    runtimeRequire: null,
    layers: null,
    originalClose: null,
    patchedClose: null,
    restore() {
      clearTimeout(state.timer);
      if (state.layers && state.originalClose && state.layers.close === state.patchedClose) {
        state.layers.close = state.originalClose;
      }
      if (window[STATE_KEY] === state) delete window[STATE_KEY];
    }
  };

  window[STATE_KEY] = state;

  function getRuntimeRequire() {
    if (state.runtimeRequire) return state.runtimeRequire;

    const chunk = window.rspackChunktaptop_design_editor;
    if (!chunk || typeof chunk.push !== 'function') return null;

    try {
      const chunkId = `tt-enhancer-hidden-layer-autoclose-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      chunk.push([[chunkId], {}, (req) => {
        state.runtimeRequire = req;
      }]);
    } catch {}

    return state.runtimeRequire;
  }

  function getTaptopApi() {
    const req = getRuntimeRequire();
    if (!req) return null;

    try {
      return {
        events: req(91893)?.A,
        layout: req(36945)?.A,
        layers: req(39510)?.A
      };
    } catch {
      return null;
    }
  }

  function isDisplayNone(element) {
    if (!element || element.nodeType !== 1) return false;

    try {
      return getComputedStyle(element).display === 'none';
    } catch {
      return false;
    }
  }

  function isLayerHiddenByDisplay(api, layerId) {
    const refs = api?.events?.refs;
    const ref = refs?.[layerId];
    if (isDisplayNone(ref)) return true;

    const composed = api?.layout?.tree?.composed;
    const tag = composed?.has?.(layerId) ? composed.get(layerId) : null;
    const parentRef = tag?.parent ? refs?.[tag.parent] : null;
    return isDisplayNone(parentRef);
  }

  function isLayerHiddenByVisibility(api, layerId) {
    try {
      const tree = api?.layout?.tree;
      const composed = tree?.composed;
      const tag = composed?.has?.(layerId) ? composed.get(layerId) : null;
      const originalId = tag?.originID || api?.events?.getOriginalID?.(layerId) || layerId;
      const original = originalId && tree?.has?.(originalId) ? tree.get(originalId) : null;
      return Boolean(original?.getVisibilityParams?.()?.params?.isHiddenAll);
    } catch {
      return false;
    }
  }

  function shouldKeepExpanded(api, layerId) {
    return isLayerHiddenByDisplay(api, layerId) || isLayerHiddenByVisibility(api, layerId);
  }

  function patch() {
    const api = getTaptopApi();
    const layers = api?.layers;
    if (!layers || typeof layers.close !== 'function') return false;

    const originalClose = layers.close;
    state.layers = layers;
    state.originalClose = originalClose;
    state.patchedClose = function patchedClose(layerId, ...args) {
      if (shouldKeepExpanded(api, layerId)) return;
      return originalClose.call(this, layerId, ...args);
    };

    layers.close = state.patchedClose;
    return true;
  }

  function tryPatch() {
    if (window[STATE_KEY] !== state) return;
    if (patch()) return;
    state.attempts += 1;
    if (state.attempts >= MAX_ATTEMPTS) return;
    state.timer = setTimeout(tryPatch, RETRY_DELAY);
  }

  tryPatch();
})();
