// Shared read for editor-saved override blobs in localStorage. Every
// applyXOverrides() in animdata.js/area.js/combo.js/boss.js/cutscene.js/
// enemy.js/game_entities.js/inventory_ui.js/game_hud_menus.js/customization.js
// used to hand-roll this same getItem→guard→JSON.parse→try/catch shell with
// slightly different error handling; this is the one copy. Each caller still
// owns its own merge semantics (whole-key replace vs Object.assign vs array
// validation) since those genuinely differ per override type — only the
// "safely get me the parsed blob or null" part was actually duplicated.
//
// Must load before any script whose top-level code calls this (animdata.js,
// area.js, etc. apply their overrides immediately on load, not on an event).
//
// `validateShape`, if passed, is `(parsed) => boolean` — a cheap top-level
// shape check (plain object vs. array, roughly which one), not full field
// validation. Guards against the gap where a renamed/reshaped field in a
// saved override blob would otherwise flow straight into the caller's
// `for (const key in overrides)`/`Array.isArray` merge and produce a
// confusing `undefined` deep in game state with no error anywhere. Failing
// the check logs a warning and falls back to `null` (same as missing/bad
// JSON) rather than silently passing the malformed shape through.
function readOverrideJSON(key, validateShape) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (validateShape && !validateShape(parsed)) {
      console.warn(`[overrideStore] Saved override for "${key}" has an unexpected shape — ignoring it and using built-in defaults.`, parsed);
      return null;
    }
    return parsed;
  } catch (e) {
    return null; // private browsing / bad JSON — caller falls back to built-ins
  }
}

// Shared top-level shape checks for the two shapes every caller actually
// expects — a plain non-array object (id/key → entry map) or an array.
const OverrideShape = {
  object: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
  array: (v) => Array.isArray(v),
};
