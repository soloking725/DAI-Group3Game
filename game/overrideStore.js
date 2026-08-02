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
function readOverrideJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null; // private browsing / bad JSON — caller falls back to built-ins
  }
}
