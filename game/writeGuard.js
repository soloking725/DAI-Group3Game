// Shared by editor/*.html tools that write straight to a game/*.js source
// file (via window.stillpointAPI). JSON.stringify silently turns NaN/
// Infinity into `null` — walking the value first turns a malformed number
// input into a clear, specific error instead of a silent `null` landing in
// a real game constant on disk.
function findNonFiniteNumber(val, path) {
  path = path || '';
  if (typeof val === 'number') return Number.isFinite(val) ? null : (path || '(value)');
  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      const bad = findNonFiniteNumber(val[i], path + '[' + i + ']');
      if (bad) return bad;
    }
    return null;
  }
  if (val && typeof val === 'object') {
    for (const k in val) {
      const bad = findNonFiniteNumber(val[k], path ? path + '.' + k : k);
      if (bad) return bad;
    }
  }
  return null;
}

if (typeof window !== 'undefined') window.findNonFiniteNumber = findNonFiniteNumber;
if (typeof module !== 'undefined' && module.exports) module.exports = { findNonFiniteNumber };
