/**
 * deepequal-x — Zero-dep deep equality comparison
 * Handles: primitives, plain objects, arrays, Map, Set, Date, RegExp,
 * ArrayBuffer, typed arrays, Error, circular references, Symbol keys.
 */

/** @typedef {('strict'|'loose'|'shallow')} EqualMode */

/**
 * Deep equality check.
 * @param {*} a - First value
 * @param {*} b - Second value
 * @param {object} [opts] - Options
 * @param {EqualMode} [opts.mode='strict'] - 'strict' (=== type match), 'loose' (== type coercion for primitives), 'shallow' (one level deep only)
 * @param {string[]} [opts.ignore] - Object keys to skip
 * @returns {boolean}
 */
export function deepEqual(a, b, opts = {}) {
  const { mode = 'strict', ignore = [] } = opts;
  const seen = new Map();
  return _eq(a, b, mode, ignore, seen, 0);
}

/**
 * Strict deep equality (default).
 */
export function strictEqual(a, b, opts = {}) {
  return deepEqual(a, b, { ...opts, mode: 'strict' });
}

/**
 * Shallow equality — only compares one level for objects/arrays.
 */
export function shallowEqual(a, b, opts = {}) {
  return deepEqual(a, b, { ...opts, mode: 'shallow' });
}

/**
 * Loose deep equality — coerces primitives like ==.
 */
export function looseEqual(a, b, opts = {}) {
  return deepEqual(a, b, { ...opts, mode: 'loose' });
}

/**
 * Get the differences between two values.
 * @returns {Array<{path: string, a: *, b: *}>}
 */
export function diff(a, b, opts = {}) {
  const { ignore = [] } = opts;
  const results = [];
  _diff(a, b, ignore, [], results, new Map(), 0);
  return results;
}

// ─── Internals ──────────────────────────────────────────────

const TypedArrayCtors = Object.getOwnPropertyNames(globalThis)
  .filter(k => /^(Int|Uint|Float|BigInt)/.test(k) && typeof globalThis[k] === 'function' && globalThis[k].BYTES_PER_ELEMENT !== undefined);

function _eq(a, b, mode, ignore, seen, depth) {
  // Fast path: identical reference (also handles NaN)
  if (a === b) return true;
  // NaN
  if (a !== a && b !== b) return true;
  // Loose mode primitive coercion
  if (mode === 'loose') {
    if (a == null && b == null) return true;
    if (typeof a !== 'object' && typeof b !== 'object') return a == b;
  }
  // null/undefined
  if (a == null || b == null) return false;
  // Different typeof
  const ta = typeof a, tb = typeof b;
  if (ta !== tb) return false;

  // Shallow mode: for objects/arrays, compare keys at depth 0 only
  if (mode === 'shallow' && ta === 'object' && depth === 0) {
    return _shallowObj(a, b, ignore);
  }

  // Symbols & functions — compare by reference only (already checked ===)
  if (ta === 'symbol' || ta === 'function') return false;
  if (ta === 'function') return false;

  // Primitives that failed === (different values)
  if (ta !== 'object') return false;

  // From here, both are objects
  // Detect circular references
  const ka = seen.get(a);
  if (ka !== undefined) return ka === b;
  seen.set(a, b);
  seen.set(b, a);

  let result;
  const aCtor = a.constructor, bCtor = b.constructor;

  // RegExp
  if (a instanceof RegExp && b instanceof RegExp) {
    result = a.source === b.source && a.flags === b.flags;
  }
  // Date
  else if (a instanceof Date && b instanceof Date) {
    const ta2 = a.getTime(), tb2 = b.getTime();
    result = ta2 === tb2 || (ta2 !== ta2 && tb2 !== tb2);
  }
  // Map
  else if (a instanceof Map && b instanceof Map) {
    result = _eqMap(a, b, mode, ignore, seen, depth);
  }
  // Set
  else if (a instanceof Set && b instanceof Set) {
    result = _eqSet(a, b, mode, ignore, seen, depth);
  }
  // ArrayBuffer
  else if (a instanceof ArrayBuffer && b instanceof ArrayBuffer) {
    result = a.byteLength === b.byteLength && _eqBytes(new Uint8Array(a), new Uint8Array(b));
  }
  // Typed arrays
  else if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
    if (a.constructor !== b.constructor || a.length !== b.length) result = false;
    else result = _eqBytes(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), new Uint8Array(b.buffer, b.byteOffset, b.byteLength));
  }
  // Error
  else if (a instanceof Error && b instanceof Error) {
    result = a.name === b.name && a.message === b.message && _eq(a.cause, b.cause, mode, ignore, seen, depth + 1);
  }
  // Plain arrays
  else if (Array.isArray(a) && Array.isArray(b)) {
    result = _eqArray(a, b, mode, ignore, seen, depth);
  }
  // One is array, other isn't
  else if (Array.isArray(a) || Array.isArray(b)) {
    result = false;
  }
  // Plain objects (including custom prototypes)
  else {
    result = _eqObject(a, b, mode, ignore, seen, depth);
  }

  seen.delete(a);
  seen.delete(b);
  return result;
}

function _shallowObj(a, b, ignore) {
  const ka = _keys(a, ignore), kb = _keys(b, ignore);
  if (ka.length !== kb.length) return false;
  const set = new Set(ka);
  for (const k of kb) {
    if (!set.has(k)) return false;
    if (a[k] !== b[k] && !(a[k] !== a[k] && b[k] !== b[k])) return false;
  }
  return true;
}

function _eqArray(a, b, mode, ignore, seen, depth) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!_eq(a[i], b[i], mode, ignore, seen, depth + 1)) return false;
  }
  return true;
}

function _eqObject(a, b, mode, ignore, seen, depth) {
  const ka = _keys(a, ignore), kb = _keys(b, ignore);
  if (ka.length !== kb.length) return false;
  const set = new Set(kb);
  for (const k of ka) {
    if (!set.has(k)) return false;
    if (!_eq(a[k], b[k], mode, ignore, seen, depth + 1)) return false;
  }
  return true;
}

function _eqMap(a, b, mode, ignore, seen, depth) {
  if (a.size !== b.size) return false;
  // For loose mode, do simpler key comparison
  if (mode === 'loose') {
    for (const [k, v] of a) {
      let found = false;
      for (const [k2, v2] of b) {
        if (_eq(k, k2, mode, ignore, seen, depth + 1) && _eq(v, v2, mode, ignore, seen, depth + 1)) { found = true; break; }
      }
      if (!found) return false;
    }
    return true;
  }
  // Strict: keys must match by reference for objects, by value for primitives
  for (const [k, v] of a) {
    let matched = false;
    for (const [k2, v2] of b) {
      if (k === k2 || (typeof k !== 'object' && k == k2)) {
        if (_eq(v, v2, mode, ignore, seen, depth + 1)) { matched = true; break; }
      }
    }
    if (!matched) {
      // Try deep key match for complex keys
      for (const [k2, v2] of b) {
        if (_eq(k, k2, mode, ignore, seen, depth + 1) && _eq(v, v2, mode, ignore, seen, depth + 1)) { matched = true; break; }
      }
      if (!matched) return false;
    }
  }
  return true;
}

function _eqSet(a, b, mode, ignore, seen, depth) {
  if (a.size !== b.size) return false;
  for (const v of a) {
    let found = false;
    for (const v2 of b) {
      if (v === v2 || (v !== v && v2 !== v2)) { found = true; break; }
      if (typeof v === 'object' && typeof v2 === 'object') {
        if (_eq(v, v2, mode, ignore, seen, depth + 1)) { found = true; break; }
      }
    }
    if (!found) return false;
  }
  return true;
}

function _eqBytes(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function _keys(obj, ignore) {
  if (!ignore.length) {
    const keys = [];
    for (const k of Reflect.ownKeys(obj)) {
      if (typeof k === 'symbol') keys.push(k);
      else keys.push(k);
    }
    return keys;
  }
  const igSet = new Set(ignore);
  return Reflect.ownKeys(obj).filter(k => !igSet.has(k));
}

// ─── diff internals ─────────────────────────────────────────

function _diff(a, b, ignore, path, results, seen, depth) {
  if (a === b || (a !== a && b !== b)) return;
  if (a == null || b == null || typeof a !== typeof b) {
    results.push({ path: _fmtPath(path), a, b });
    return;
  }
  if (typeof a !== 'object') {
    results.push({ path: _fmtPath(path), a, b });
    return;
  }

  // Circular guard
  if (seen.has(a) && seen.get(a) === b) return;
  seen.set(a, b);

  if (Array.isArray(a) && Array.isArray(b)) {
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      if (i >= a.length) results.push({ path: `${_fmtPath(path)}[${i}]`, a: undefined, b: b[i] });
      else if (i >= b.length) results.push({ path: `${_fmtPath(path)}[${i}]`, a: a[i], b: undefined });
      else _diff(a[i], b[i], ignore, [...path, `[${i}]`], results, seen, depth + 1);
    }
    return;
  }

  if (a instanceof Date && b instanceof Date) {
    if (a.getTime() !== b.getTime()) results.push({ path: _fmtPath(path), a, b });
    return;
  }

  if (a instanceof RegExp && b instanceof RegExp) {
    if (a.source !== b.source || a.flags !== b.flags) results.push({ path: _fmtPath(path), a, b });
    return;
  }

  const ka = _keys(a, ignore), kb = _keys(b, ignore);
  const kbSet = new Set(kb);
  for (const k of ka) {
    if (!kbSet.has(k)) {
      results.push({ path: _fmtPath(path, k), a: a[k], b: undefined });
    } else {
      _diff(a[k], b[k], ignore, [...path, String(k)], results, seen, depth + 1);
    }
  }
  for (const k of kb) {
    if (!ka.includes(k)) {
      results.push({ path: _fmtPath(path, k), a: undefined, b: b[k] });
    }
  }
}

function _fmtPath(path, key) {
  let s = path.length ? path.join('') : '(root)';
  if (key !== undefined) {
    s += typeof key === 'number' || /^\[\d+\]$/.test(String(key)) ? `[${key}]` : `.${key}`;
  }
  return s;
}

export default deepEqual;
