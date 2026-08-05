// Customization catalog (idle anims / taunts / fashion looks) — Page 3 of
// the multi-page Inventory (Plans/archive/inventory_redesign.md). Starts EMPTY on
// purpose: editor/inventory_editor.html is the only place that adds
// entries, same localStorage-override pattern game_hud_menus.js's
// HUD_LAYOUT uses — the editor writes a full catalog array to
// localStorage, this file reads it back at boot.
const COSMETICS_CATALOG_KEY = 'stillpoint_cosmetics_catalog_v1';

// Each entry: { id, slot: 'idle_anim'|'taunt'|'fashion', name, color, tooltip, desc,
// unlock: 'always' | 'lore_pip:<n>' | 'flag:<storyFlagsKey>' | 'boss:<minibossId>' }
// tooltip is a short line floated above the selected grid swatch
// (game/inventory_ui.js's drawFloatingTooltip); desc is the longer text
// shown in the bottom detail pane. Both optional.
let COSMETICS_CATALOG = [];

function loadCosmeticsCatalog() {
  const parsed = readOverrideJSON(COSMETICS_CATALOG_KEY, OverrideShape.array);
  if (Array.isArray(parsed)) COSMETICS_CATALOG = parsed;
}
loadCosmeticsCatalog();

function cosmeticsForSlot(slot) {
  return COSMETICS_CATALOG.filter(c => c.slot === slot);
}

// Mirrors isRequirementMet() in map.js but for cosmetic unlock strings —
// kept separate since the vocabulary differs (lore pip count vs. traversal
// ability flags) and unlocking a look has no bearing on traversal gating.
function isCosmeticUnlockMet(unlock) {
  if (!unlock || unlock === 'always') return true;
  const [kind, arg] = unlock.split(':');
  if (kind === 'lore_pip') {
    return typeof lorePipsCollectedTotal === 'function' && lorePipsCollectedTotal() >= (parseInt(arg, 10) || 0);
  }
  if (kind === 'flag') return typeof storyFlags !== 'undefined' && !!storyFlags[arg];
  if (kind === 'boss') return typeof defeatedMinibosses !== 'undefined' && !!defeatedMinibosses[arg];
  return false; // unknown unlock string — treat as locked, not silently open
}

// True if this save can equip the cosmetic — either already flagged
// unlocked (persisted once earned, mirroring how ability pickups latch
// abilityState flags), or its unlock condition currently holds.
function isCosmeticUnlocked(id) {
  if (unlockedCosmetics[id]) return true;
  const def = COSMETICS_CATALOG.find(c => c.id === id);
  return !!(def && isCosmeticUnlockMet(def.unlock));
}

// Equip/unequip toggle for the Customization page. Returns true if the
// catalog entry exists and is unlocked; false (no-op) otherwise.
function equipCosmetic(id) {
  const def = COSMETICS_CATALOG.find(c => c.id === id);
  if (!def || !isCosmeticUnlocked(id)) return false;
  unlockedCosmetics[id] = true; // latch — once earned, stays earned even if the unlock condition later stops holding
  equippedCosmetics[def.slot] = (equippedCosmetics[def.slot] === id) ? null : id;
  return true;
}
