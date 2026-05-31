(function () {
  if (window.__tt_enhancer_dvh_regexp_patch__) return;
  window.__tt_enhancer_dvh_regexp_patch__ = true;

  const NativeRegExp = window.RegExp;
  const nativeExec = NativeRegExp.prototype.exec;
  const UNIT_PATTERN = 'px|em|rem|%|vw|vh';
  const EXTRA_UNITS = ['dvh', 'svh', 'lvh', 'vmin', 'vmax', 'ch'];
  const PATCHED_UNIT_PATTERN = `${UNIT_PATTERN}|${EXTRA_UNITS.join('|')}`;

  function patchPattern(pattern) {
    if (typeof pattern !== 'string' || !pattern.includes(UNIT_PATTERN)) return pattern;
    return pattern.replaceAll(UNIT_PATTERN, PATCHED_UNIT_PATTERN);
  }

  function PatchedRegExp(pattern, flags) {
    if (pattern instanceof NativeRegExp) return new NativeRegExp(pattern, flags);
    return new NativeRegExp(patchPattern(pattern), flags);
  }

  Object.setPrototypeOf(PatchedRegExp, NativeRegExp);
  PatchedRegExp.prototype = NativeRegExp.prototype;
  Object.defineProperty(PatchedRegExp.prototype, 'constructor', {
    value: PatchedRegExp,
    configurable: true,
    writable: true
  });

  NativeRegExp.prototype.exec = function (value) {
    const result = nativeExec.call(this, value);
    if (result || typeof value !== 'string' || !EXTRA_UNITS.some((unit) => value.includes(unit))) return result;

    const source = this.source.replaceAll('\\/', '/');
    if (!source.includes(UNIT_PATTERN)) return result;

    try {
      const patched = new NativeRegExp(patchPattern(source), this.flags);
      return nativeExec.call(patched, value);
    } catch {
      return result;
    }
  };

  window.RegExp = PatchedRegExp;

  if (!window.__tt_enhancer_dvh_array_patch__) {
    window.__tt_enhancer_dvh_array_patch__ = true;

    const nativeMap = Array.prototype.map;
    function isSizeUnitArray(array) {
      return (
        Array.isArray(array) &&
        array.indexOf('px') !== -1 &&
        array.indexOf('%') !== -1 &&
        array.indexOf('em') !== -1 &&
        array.indexOf('rem') !== -1 &&
        array.indexOf('vw') !== -1 &&
        array.indexOf('vh') !== -1 &&
        EXTRA_UNITS.every((unit) => array.indexOf(unit) === -1)
      );
    }

    function withDvhUnit(array) {
      if (!isSizeUnitArray(array)) return array;
      const next = array.slice();
      next.splice(next.indexOf('vh') + 1, 0, ...EXTRA_UNITS);
      return next;
    }

    Array.prototype.map = function (callback, thisArg) {
      return nativeMap.call(withDvhUnit(this), callback, thisArg);
    };
  }
})();
