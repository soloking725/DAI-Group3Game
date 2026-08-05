// Multi-page Inventory screen (2026-08-01 redesign — see
// Plans/archive/inventory_redesign.md). Replaces the old single-page inventory
// panel that used to be drawn inline in game_draw_loop.js. Four pages,
// switched with Q/E while gameState === 'inventory':
//   0 MAP           — the world map (reuses map.js's drawMap) + player-
//                      placed pins ("scratched together from all sources").
//   1 CHARACTER     — portrait, health, Fracture Pips, ability icons
//                      (dimmed silhouette until unlocked), companion
//                      portrait if kept, and a re-readable Lore & Story
//                      list (collected lore used to be a write-once toast;
//                      this is its permanent home).
//   2 UPGRADES      — the old inventory content, unchanged in behavior.
//   3 CUSTOMIZATION — idle anims / taunts / fashion looks. Starts with an
//                      EMPTY catalog on purpose — editor/inventory_editor.html
//                      is the only place that adds entries (COSMETICS_CATALOG
//                      lives in customization.js).
//
// Layout data (INVENTORY_LAYOUT) follows the same anchor+offset shape as
// game_hud_menus.js's HUD_LAYOUT, and the same localStorage-override
// pattern, so editor/inventory_editor.html can drag-reposition every
// element here exactly like editor/hud_editor.html does for the HUD — and,
// unlike the HUD editor, can also ADD new entries (any key not already in
// this object), rendered generically by drawCustomLayoutElements() below.

const INVENTORY_LAYOUT_KEY = 'stillpoint_inventory_layout_v1';

const INVENTORY_LAYOUT = {
  panel:    { anchor: 'top-left', x: 80,  y: 45,  w: 640, h: 370, visible: true },
  tabStrip: { anchor: 'top-center', x: 0, y: 26,  visible: true },

  // Page 1 — Character
  portrait:          { anchor: 'top-left', x: 96,  y: 110, size: 56, visible: true, page: 1 },
  healthLabel:       { anchor: 'top-left', x: 68,  y: 152, visible: true, page: 1 },
  fracturePipsRow:   { anchor: 'top-left', x: 76,  y: 178, gap: 22, visible: true, page: 1 },
  abilityGrid:       { anchor: 'top-left', x: 76,  y: 216, size: 24, gap: 34, cols: 5, visible: true, page: 1, lockedColor: 'rgba(255,255,255,0.06)', lockedBorderColor: '#2a2a4e' },
  companionPortrait: { anchor: 'top-left', x: 224, y: 110, size: 40, visible: true, page: 1 },
  storyListHeader:   { anchor: 'top-left', x: 340, y: 95,  visible: true, page: 1 },
  storyList:         { anchor: 'top-left', x: 340, y: 118, w: 260, rowH: 16, visible: true, page: 1 },
  storyDetail:       { anchor: 'top-left', x: 340, y: 300, w: 260, visible: true, page: 1 },

  // Page 2 — Upgrades (positions mirror the old single-page layout)
  pipsHeader:   { anchor: 'top-left', x: 76,  y: 95,  visible: true, page: 2 },
  pipsRow2:     { anchor: 'top-left', x: 96,  y: 122, gap: 26, visible: true, page: 2 },
  lorePipsInfo: { anchor: 'top-left', x: 76,  y: 165, visible: true, page: 2 },
  upgradesList: { anchor: 'top-left', x: 356, y: 95,  w: 250, rowH: 48, visible: true, page: 2 },

  // Page 3 — Customization
  slotTabs:        { anchor: 'top-left', x: 76, y: 95,  gap: 90, visible: true, page: 3 },
  cosmeticsGrid:   { anchor: 'top-left', x: 76, y: 130, cellW: 160, cellH: 50, cols: 3, visible: true, page: 3, lockedColor: 'rgba(255,255,255,0.08)', lockedBorderColor: '#2a2a4e' },
  cosmeticsDetail: { anchor: 'top-left', x: 76, y: 330, w: 560, visible: true, page: 3 },
};

(function applyInventoryLayoutOverrides() {
  const saved = readOverrideJSON(INVENTORY_LAYOUT_KEY, OverrideShape.object);
  if (!saved) return;
  for (const key in saved) {
    // Editor-added elements (not one of the built-in keys above) get
    // created outright — this is how "add new stuff freely" works
    // without a code change; see drawCustomLayoutElements().
    if (INVENTORY_LAYOUT[key]) Object.assign(INVENTORY_LAYOUT[key], saved[key]);
    else INVENTORY_LAYOUT[key] = saved[key];
  }
})();

// Same anchor resolver as game_hud_menus.js's hudResolve(), duplicated
// rather than shared since the two layout objects are independent and this
// keeps each editor able to evolve its anchor vocabulary separately.
function invResolve(el) {
  switch (el.anchor) {
    case 'top-center':    return { x: W / 2 + el.x, y: el.y };
    case 'bottom-left':   return { x: el.x, y: H - el.y };
    case 'bottom-right':  return { x: W - el.x, y: H - el.y };
    case 'bottom-center': return { x: W / 2 + el.x, y: H - el.y };
    default:              return { x: el.x, y: el.y }; // top-left
  }
}

function inventoryPanelRect() {
  const el = INVENTORY_LAYOUT.panel;
  return { px: el.x, py: el.y, w: el.w, h: el.h };
}

function drawDiamondPip(ctx, x, y, filled, color, halfSize, lockedFill, lockedBorder) {
  halfSize = halfSize || 8;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = filled ? color : (lockedFill || 'rgba(255,255,255,0.06)');
  ctx.fillRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2);
  ctx.strokeStyle = filled ? '#ffffffaa' : (lockedBorder || '#2a2a4e');
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2);
  ctx.restore();
}

// ── Editor-authored tooltips (2026-08-01 — see editor/inventory_editor.html's
// "tooltip" field on every layout element). The game is keyboard-only with
// no mouse hover, so these render as persistent micro-copy captions rather
// than hover popups — same idea, adapted to the input model. Opt-in: only
// elements with a non-empty el.tooltip render anything.
function drawLayoutTooltips(ctx, page) {
  ctx.textAlign = 'left';
  ctx.font = 'italic 9px "Courier New", monospace';
  ctx.fillStyle = 'rgba(224, 215, 255, 0.55)';
  for (const key in INVENTORY_LAYOUT) {
    const el = INVENTORY_LAYOUT[key];
    if (!el.tooltip || el.visible === false) continue;
    if (el.page !== undefined && el.page !== page) continue;
    const pos = invResolve(el);
    ctx.fillText(el.tooltip, pos.x, pos.y - 4);
  }
  ctx.textAlign = 'left';
}

// Small floating box above a grid cell — used for per-cosmetic tooltips,
// which are authored data (per catalog entry) rather than per-layout-element.
function drawFloatingTooltip(ctx, x, y, text) {
  ctx.font = '10px "Courier New", monospace';
  const padX = 6, padY = 4;
  const w = ctx.measureText(text).width + padX * 2;
  const h = 16;
  ctx.fillStyle = 'rgba(10, 10, 18, 0.92)';
  ctx.fillRect(x, y - h, w, h);
  ctx.strokeStyle = 'rgba(196, 181, 253, 0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y - h, w, h);
  ctx.fillStyle = '#e0d7ff';
  ctx.textAlign = 'left';
  ctx.fillText(text, x + padX, y - padY);
}

// ── Page 0: Map (reuses map.js's drawMap, adds a player-pin layer) ──────

const MAP_PIN_TYPES = [
  { id: 'note',   glyph: '✎', color: '#67e8f9', label: 'Note' },   // pencil
  { id: 'danger', glyph: '⚠', color: '#f87171', label: 'Danger' }, // warning
  { id: 'item',   glyph: '★', color: '#fbbf24', label: 'Item' },   // star
  { id: 'rest',   glyph: '♦', color: '#a78bfa', label: 'Rest' },   // diamond
];
const MAP_PIN_PICK_RADIUS = 14; // logical-space distance to count as "same pin" for cycle/delete/note

function nearestMapPin(x, y) {
  let best = null, bestDist = MAP_PIN_PICK_RADIUS;
  for (const pin of mapPins) {
    const d = Math.hypot(pin.x - x, pin.y - y);
    if (d <= bestDist) { best = pin; bestDist = d; }
  }
  return best;
}

function drawInventoryMapPage(ctx) {
  drawMap(ctx, currentAreaId, discoveredAreas, anchorActivated);

  // drawMap() restores its own pan/zoom transform before returning — redo
  // it here so pins and the placement cursor stay locked to the room
  // boxes under pan/zoom instead of floating over them.
  ctx.save();
  ctx.translate(W / 2 + mapView.panX, H / 2 + mapView.panY);
  ctx.scale(mapView.zoom, mapView.zoom);
  ctx.translate(-W / 2, -H / 2);

  ctx.textAlign = 'center';
  for (const pin of mapPins) {
    const type = MAP_PIN_TYPES.find(t => t.id === pin.icon) || MAP_PIN_TYPES[0];
    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = type.color;
    ctx.fillText(type.glyph, pin.x, pin.y);
    if (pin.note) {
      ctx.font = '8px "Courier New", monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(pin.note.length > 20 ? pin.note.slice(0, 19) + '…' : pin.note, pin.x, pin.y + 13);
    }
  }

  // Placement crosshair
  ctx.strokeStyle = '#e0d7ff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mapCursor.x - 7, mapCursor.y);
  ctx.lineTo(mapCursor.x + 7, mapCursor.y);
  ctx.moveTo(mapCursor.x, mapCursor.y - 7);
  ctx.lineTo(mapCursor.x, mapCursor.y + 7);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.font = '9px "Courier New", monospace';
  ctx.fillStyle = '#6a6a9e';
  ctx.fillText('Arrows move cursor · ENTER add/cycle pin · DEL remove · N note · +/- zoom', W / 2, H - 28);
  ctx.textAlign = 'left';
}

// Input for Page 0 — called from game_update.js's gameState === 'inventory'
// dispatch. Reuses mapView (map.js) for pan/zoom so panning here behaves
// exactly like the standalone Tab map; cursor movement and pin placement
// are new. Every pin mutation autosaves immediately, same as tryUpgrade().
function updateInventoryMapPage() {
  const MAP_ZOOM_SPEED = 0.03, CURSOR_SPEED = 6;
  if (keys['Equal'] || keys['NumpadAdd']) mapView.zoom = Math.min(3, mapView.zoom + MAP_ZOOM_SPEED);
  if (keys['Minus'] || keys['NumpadSubtract']) mapView.zoom = Math.max(0.4, mapView.zoom - MAP_ZOOM_SPEED);
  if (wasJustPressed('Digit0')) resetMapView();

  if (keys['ArrowLeft']) mapCursor.x = Math.max(0, mapCursor.x - CURSOR_SPEED);
  if (keys['ArrowRight']) mapCursor.x = Math.min(W, mapCursor.x + CURSOR_SPEED);
  if (keys['ArrowUp']) mapCursor.y = Math.max(0, mapCursor.y - CURSOR_SPEED);
  if (keys['ArrowDown']) mapCursor.y = Math.min(H, mapCursor.y + CURSOR_SPEED);

  if (wasJustPressed('Enter') || wasJustPressed('Space')) {
    const existing = nearestMapPin(mapCursor.x, mapCursor.y);
    if (existing) {
      const idx = MAP_PIN_TYPES.findIndex(t => t.id === existing.icon);
      existing.icon = MAP_PIN_TYPES[(idx + 1) % MAP_PIN_TYPES.length].id;
    } else {
      mapPins.push({ id: nextMapPinId++, x: mapCursor.x, y: mapCursor.y, icon: MAP_PIN_TYPES[0].id, note: '' });
    }
    SFX.uiSelect();
    if (typeof saveGame === 'function') saveGame();
  } else if (wasJustPressed('Delete') || wasJustPressed('Backspace')) {
    const existing = nearestMapPin(mapCursor.x, mapCursor.y);
    if (existing) {
      mapPins = mapPins.filter(p => p !== existing);
      SFX.uiSelect();
      if (typeof saveGame === 'function') saveGame();
    }
  } else if (wasJustPressed('KeyN')) {
    const existing = nearestMapPin(mapCursor.x, mapCursor.y);
    if (existing) {
      const note = window.prompt('Pin note:', existing.note || '');
      if (note !== null) {
        existing.note = note.slice(0, 60);
        if (typeof saveGame === 'function') saveGame();
      }
    }
  }
}

// Input for Page 3 — ←→ switches the idle_anim/taunt/fashion slot tab, ↑↓
// browses that slot's catalog entries, Enter equips (or unequips if the
// selected entry is already equipped — equipCosmetic() toggles).
function updateInventoryCustomizationPage() {
  if (wasJustPressed('ArrowLeft')) {
    cosmeticsSlotIndex = (cosmeticsSlotIndex - 1 + COSMETIC_SLOTS.length) % COSMETIC_SLOTS.length;
    cosmeticsSelection = 0;
    SFX.uiSelect();
    return;
  }
  if (wasJustPressed('ArrowRight')) {
    cosmeticsSlotIndex = (cosmeticsSlotIndex + 1) % COSMETIC_SLOTS.length;
    cosmeticsSelection = 0;
    SFX.uiSelect();
    return;
  }
  const list = cosmeticsForSlot(COSMETIC_SLOTS[cosmeticsSlotIndex]);
  if (!list.length) return;
  if (wasJustPressed('ArrowUp')) {
    cosmeticsSelection = (cosmeticsSelection - 1 + list.length) % list.length;
    SFX.uiSelect();
  } else if (wasJustPressed('ArrowDown')) {
    cosmeticsSelection = (cosmeticsSelection + 1) % list.length;
    SFX.uiSelect();
  } else if (wasJustPressed('Enter') || wasJustPressed('Space')) {
    const def = list[cosmeticsSelection];
    if (equipCosmetic(def.id)) {
      SFX.abilityPickup();
      const nowEquipped = equippedCosmetics[def.slot] === def.id;
      inventoryMessage = { text: nowEquipped ? `${def.name} equipped!` : `${def.name} unequipped.`, timer: 90 };
      if (typeof saveGame === 'function') saveGame();
    } else {
      SFX.uiSelect();
      inventoryMessage = { text: 'Not yet unlocked', timer: 90 };
    }
  }
}

// ── Shared panel chrome (pages 1-3) ──────────────────────────────────────

function drawInventoryPanelBg(ctx) {
  ctx.fillStyle = 'rgba(10, 10, 15, 0.88)';
  ctx.fillRect(0, 0, W, H);
  const bgGlow = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, H * 0.7);
  bgGlow.addColorStop(0, 'rgba(103, 232, 249, 0.05)');
  bgGlow.addColorStop(1, 'rgba(103, 232, 249, 0)');
  ctx.fillStyle = bgGlow;
  ctx.fillRect(0, 0, W, H);

  const { px, py, w, h } = inventoryPanelRect();
  ctx.fillStyle = 'rgba(9, 9, 16, 0.95)';
  ctx.fillRect(px, py, w, h);
  ctx.strokeStyle = '#3a3a6e';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px, py, w, h);
  ctx.strokeStyle = 'rgba(196, 181, 253, 0.5)';
  ctx.lineWidth = 2;
  for (const [cx, cy, dx, dy] of [[px, py, 1, 1], [px + w, py, -1, 1], [px, py + h, 1, -1], [px + w, py + h, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + dy * 16);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + dx * 16, cy);
    ctx.stroke();
  }
}

function drawInventoryTabStrip(ctx) {
  const strip = invResolve(INVENTORY_LAYOUT.tabStrip);
  const gap = 130;
  const startX = strip.x - gap * (INVENTORY_PAGE_NAMES.length - 1) / 2;
  ctx.textAlign = 'center';
  for (let i = 0; i < INVENTORY_PAGE_NAMES.length; i++) {
    const active = i === inventoryPage;
    ctx.font = active ? 'bold 12px "Courier New", monospace' : '12px "Courier New", monospace';
    ctx.fillStyle = active ? '#e0d7ff' : '#4a4a6e';
    ctx.fillText(active ? `◆ ${INVENTORY_PAGE_NAMES[i]} ◆` : INVENTORY_PAGE_NAMES[i], startX + i * gap, strip.y);
  }
  ctx.textAlign = 'left';
}

function inventoryPageControlsHint() {
  if (inventoryPage === 1) return '↑↓ Select · Q/E Tab · ESC Back';
  if (inventoryPage === 2) return '↑↓ Select · ENTER Upgrade · Q/E Tab · ESC Back';
  if (inventoryPage === 3) return '←→ Slot · ↑↓ Select · ENTER Equip · Q/E Tab · ESC Back';
  return 'Q/E Tab · ESC Back';
}

// ── Page 1: Character ─────────────────────────────────────────────────────

// Leveled ability keys come from INVENTORY_UPGRADES (game_state.js); the
// remaining three grants are binary unlocks with no level to show. Order
// here is the grid's reading order.
const INVENTORY_ABILITY_GRID_ORDER = [
  'phase_dash', 'shard_shot', 'stillpoint', 'graviton_surge', 'void_tether',
  'charged_attack', 'parry', 'construct',
];

// Every collected lore fragment across all areas, with its full text —
// the permanent, re-readable home for lore that otherwise only ever
// appeared once as a fading loreOverlay toast.
function collectedLoreEntries() {
  const out = [];
  for (const areaId in AREAS) {
    const area = AREAS[areaId];
    if (!area.loreFragments) continue;
    for (const lf of area.loreFragments) {
      if (collectedLore[lf.id]) out.push({ id: lf.id, text: lf.text, areaName: area.name || areaId });
    }
  }
  return out;
}

function drawInventoryCharacterPage(ctx) {
  ctx.textAlign = 'left';

  // Portrait — a plain silhouette box; there's no sprite-on-UI-panel
  // pipeline yet, so this just reads as "you" via color, not a real render.
  const port = invResolve(INVENTORY_LAYOUT.portrait);
  const psize = INVENTORY_LAYOUT.portrait.size;
  ctx.fillStyle = 'rgba(196, 181, 253, 0.12)';
  ctx.fillRect(port.x - psize / 2, port.y - psize / 2, psize, psize);
  ctx.strokeStyle = '#c4b5fd';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(port.x - psize / 2, port.y - psize / 2, psize, psize);
  ctx.textAlign = 'center';
  ctx.font = '9px "Courier New", monospace';
  ctx.fillStyle = '#8a8aae';
  ctx.fillText('YOU', port.x, port.y + psize / 2 + 12);

  // Health
  const hp = invResolve(INVENTORY_LAYOUT.healthLabel);
  ctx.textAlign = 'left';
  ctx.font = '12px "Courier New", monospace';
  ctx.fillStyle = '#f87171';
  ctx.fillText(`HP  ${Math.ceil(player.health)} / ${playerMaxHealth()}`, hp.x, hp.y);

  // Fracture Pips
  const fp = invResolve(INVENTORY_LAYOUT.fracturePipsRow);
  const fgap = INVENTORY_LAYOUT.fracturePipsRow.gap;
  for (let i = 0; i < 4; i++) drawDiamondPip(ctx, fp.x + i * fgap, fp.y, i < player.fractureMax, '#67e8f9');

  // Ability grid — dimmed silhouette slots for not-yet-unlocked abilities,
  // level badge for the ones with a lore-pip-funded upgrade track.
  const ag = invResolve(INVENTORY_LAYOUT.abilityGrid);
  const { cols, gap, size, lockedColor, lockedBorderColor } = INVENTORY_LAYOUT.abilityGrid;
  for (let i = 0; i < INVENTORY_ABILITY_GRID_ORDER.length; i++) {
    const key = INVENTORY_ABILITY_GRID_ORDER[i];
    const grant = ABILITY_GRANTS[key];
    if (!grant) continue;
    const owned = !!abilityState[grant.flag];
    const col = i % cols, row = Math.floor(i / cols);
    const cx = ag.x + col * gap, cy = ag.y + row * gap;

    drawDiamondPip(ctx, cx, cy, owned, grant.color, size / 2, lockedColor, lockedBorderColor);

    const level = statUpgrades[key];
    if (owned && typeof level === 'number') {
      ctx.textAlign = 'center';
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.fillStyle = '#0a0a0f';
      ctx.fillText(String(level), cx, cy + 3);
    }
    ctx.textAlign = 'center';
    ctx.font = '8px "Courier New", monospace';
    ctx.fillStyle = owned ? '#b0a8d0' : '#4a4a6e';
    ctx.fillText(owned ? grant.popup : '???', cx, cy + size / 2 + 12);
  }

  // Companion portrait — only when the Child is actually kept (story.md §2)
  if (typeof companionState !== 'undefined' && companionState.active) {
    const cp = invResolve(INVENTORY_LAYOUT.companionPortrait);
    const csize = INVENTORY_LAYOUT.companionPortrait.size;
    ctx.fillStyle = 'rgba(249, 168, 212, 0.12)';
    ctx.fillRect(cp.x - csize / 2, cp.y - csize / 2, csize, csize);
    ctx.strokeStyle = '#f9a8d4';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cp.x - csize / 2, cp.y - csize / 2, csize, csize);
    ctx.textAlign = 'center';
    ctx.font = '8px "Courier New", monospace';
    ctx.fillStyle = '#f9a8d4';
    ctx.fillText('THE CHILD', cp.x, cp.y + csize / 2 + 12);
    if (companionState.canFight && companionState.weapon) {
      const wdef = typeof COMPANION_WEAPONS !== 'undefined' ? COMPANION_WEAPONS[companionState.weapon] : null;
      ctx.fillStyle = '#8a8aae';
      ctx.fillText(wdef ? wdef.label : companionState.weapon, cp.x, cp.y + csize / 2 + 22);
    }
  }

  // Lore & Story — re-readable list of everything collected so far
  const entries = collectedLoreEntries();
  const lh = invResolve(INVENTORY_LAYOUT.storyListHeader);
  ctx.textAlign = 'left';
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`LORE & STORY (${entries.length})`, lh.x, lh.y);

  const sl = invResolve(INVENTORY_LAYOUT.storyList);
  const { w: listW, rowH } = INVENTORY_LAYOUT.storyList;
  const visibleRows = 8;
  inventorySelection = entries.length ? Math.max(0, Math.min(inventorySelection, entries.length - 1)) : 0;
  const start = Math.max(0, Math.min(inventorySelection - Math.floor(visibleRows / 2), Math.max(0, entries.length - visibleRows)));
  ctx.font = '11px "Courier New", monospace';
  for (let i = 0; i < Math.min(visibleRows, entries.length); i++) {
    const idx = start + i;
    const entry = entries[idx];
    const selected = idx === inventorySelection;
    const ry = sl.y + i * rowH;
    if (selected) {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
      ctx.fillRect(sl.x - 6, ry - 11, listW, rowH);
    }
    ctx.fillStyle = selected ? '#fde68a' : '#8a8060';
    let label = `${entry.areaName}`;
    while (ctx.measureText(label).width > listW - 12 && label.length > 4) label = label.slice(0, -2) + '…';
    ctx.fillText(`${selected ? '▸ ' : '  '}${label}`, sl.x, ry);
  }
  if (entries.length === 0) {
    ctx.fillStyle = '#5a5a7e';
    ctx.font = 'italic 10px "Courier New", monospace';
    ctx.fillText('Nothing found yet.', sl.x, sl.y);
  }

  const sd = invResolve(INVENTORY_LAYOUT.storyDetail);
  const activeEntry = entries[inventorySelection];
  if (activeEntry) {
    ctx.font = 'italic 10px "Courier New", monospace';
    ctx.fillStyle = '#c9b98a';
    wrapText(ctx, activeEntry.text, sd.x, sd.y, INVENTORY_LAYOUT.storyDetail.w, 13);
  }
}

// ── Page 2: Upgrades (migrated from the old single-page inventory) ──────

function drawInventoryUpgradesPage(ctx) {
  ctx.textAlign = 'left';

  const ph = invResolve(INVENTORY_LAYOUT.pipsHeader);
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.fillStyle = '#67e8f9';
  ctx.fillText('FRACTURE PIPS', ph.x, ph.y);

  const pr = invResolve(INVENTORY_LAYOUT.pipsRow2);
  const pgap = INVENTORY_LAYOUT.pipsRow2.gap;
  for (let i = 0; i < 4; i++) drawDiamondPip(ctx, pr.x + i * pgap, pr.y, i < player.fractureMax, '#67e8f9');

  const totalLorePips = Object.keys(collectedLore).length;
  const banked = Math.max(0, lorePipsBanked());
  const li = invResolve(INVENTORY_LAYOUT.lorePipsInfo);
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText('LORE PIPS', li.x, li.y);
  ctx.font = '12px "Courier New", monospace';
  ctx.fillStyle = '#c9b98a';
  ctx.fillText(`Found:  ${totalLorePips}`, li.x, li.y + 22);
  ctx.fillStyle = banked > 0 ? '#fde68a' : '#8a8060';
  ctx.fillText(`Banked: ${banked}`, li.x, li.y + 42);
  ctx.font = 'italic 10px "Courier New", monospace';
  ctx.fillStyle = '#5a5a7e';
  wrapText(ctx, 'Lore Pips are spent below on lasting upgrades.', li.x, li.y + 68, 240, 13);

  const listEl = INVENTORY_LAYOUT.upgradesList;
  const list = invResolve(listEl);
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.fillStyle = '#c4b5fd';
  ctx.fillText('UPGRADES', list.x, list.y);

  inventorySelection = Math.max(0, Math.min(inventorySelection, INVENTORY_UPGRADES.length - 1));
  let ly = list.y + 24;
  for (let i = 0; i < INVENTORY_UPGRADES.length; i++) {
    const def = INVENTORY_UPGRADES[i];
    const level = statUpgrades[def.key] || 0;
    const maxed = level >= def.max;
    const nextCost = def.costs[level] || def.costs[def.costs.length - 1];
    const canAfford = banked >= nextCost;
    const selected = i === inventorySelection;
    const rowH = listEl.rowH;

    if (selected) {
      ctx.fillStyle = 'rgba(196, 181, 253, 0.14)';
      ctx.fillRect(list.x - 10, ly - 18, listEl.w + 10, rowH);
      ctx.strokeStyle = 'rgba(196, 181, 253, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(list.x - 10, ly - 18, listEl.w + 10, rowH);
    }

    ctx.font = '13px "Courier New", monospace';
    ctx.fillStyle = maxed ? '#8a8aae' : (selected ? '#e0d7ff' : '#b0a8d0');
    ctx.fillText(`${selected ? '▸ ' : '  '}${def.label}`, list.x, ly);

    const pipStartX = list.x + 4;
    const pipY = ly + 16;
    for (let l = 0; l < def.max; l++) drawDiamondPip(ctx, pipStartX + l * 16, pipY, l < level, def.color, 5);

    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = maxed ? '#6a6a8e' : (canAfford ? '#8a8aae' : '#5a5a7e');
    ctx.fillText(maxed ? 'MAXED' : `Cost: ${nextCost} pips`, pipStartX + def.max * 16 + 10, pipY + 4);

    ly += rowH;
  }

  const activeDef = INVENTORY_UPGRADES[inventorySelection];
  if (activeDef) {
    ctx.font = 'italic 10px "Courier New", monospace';
    ctx.fillStyle = '#7a7a9e';
    wrapText(ctx, activeDef.desc, list.x, ly + 8, listEl.w, 13);
  }
}

// ── Page 3: Customization ────────────────────────────────────────────────

const COSMETIC_SLOTS = ['idle_anim', 'taunt', 'fashion'];
const COSMETIC_SLOT_LABELS = { idle_anim: 'Idle Anim', taunt: 'Taunt', fashion: 'Fashion' };

function drawInventoryCustomizationPage(ctx) {
  ctx.textAlign = 'left';
  const st = invResolve(INVENTORY_LAYOUT.slotTabs);
  const sgap = INVENTORY_LAYOUT.slotTabs.gap;
  for (let i = 0; i < COSMETIC_SLOTS.length; i++) {
    const active = i === cosmeticsSlotIndex;
    ctx.font = active ? 'bold 12px "Courier New", monospace' : '12px "Courier New", monospace';
    ctx.fillStyle = active ? '#e0d7ff' : '#5a5a7e';
    ctx.fillText(active ? `[ ${COSMETIC_SLOT_LABELS[COSMETIC_SLOTS[i]]} ]` : COSMETIC_SLOT_LABELS[COSMETIC_SLOTS[i]], st.x + i * sgap, st.y);
  }

  const slot = COSMETIC_SLOTS[cosmeticsSlotIndex];
  const list = typeof cosmeticsForSlot === 'function' ? cosmeticsForSlot(slot) : [];
  const gridEl = INVENTORY_LAYOUT.cosmeticsGrid;
  const grid = invResolve(gridEl);
  const { cellW, cellH, cols, lockedColor, lockedBorderColor } = gridEl;

  if (list.length === 0) {
    ctx.font = 'italic 11px "Courier New", monospace';
    ctx.fillStyle = '#5a5a7e';
    wrapText(ctx, 'Nothing here yet — add looks in editor/inventory_editor.html.', grid.x, grid.y + 10, 500, 15);
    return;
  }

  cosmeticsSelection = Math.max(0, Math.min(cosmeticsSelection, list.length - 1));
  let selectedCx = null, selectedCy = null;
  for (let i = 0; i < list.length; i++) {
    const def = list[i];
    const col = i % cols, row = Math.floor(i / cols);
    const cx = grid.x + col * cellW, cy = grid.y + row * cellH;
    const unlocked = isCosmeticUnlocked(def.id);
    const equipped = equippedCosmetics[slot] === def.id;
    const selected = i === cosmeticsSelection;
    if (selected) { selectedCx = cx; selectedCy = cy; }

    if (selected) {
      ctx.fillStyle = 'rgba(196, 181, 253, 0.14)';
      ctx.fillRect(cx - 6, cy - 14, cellW - 10, cellH - 8);
    }
    ctx.fillStyle = unlocked ? (def.color || '#c4b5fd') : (lockedColor || 'rgba(255,255,255,0.08)');
    ctx.fillRect(cx, cy, 22, 22);
    ctx.strokeStyle = equipped ? '#67e8f9' : (unlocked ? 'rgba(255,255,255,0.27)' : (lockedBorderColor || '#2a2a4e'));
    ctx.lineWidth = equipped ? 2 : 1;
    ctx.strokeRect(cx, cy, 22, 22);

    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = unlocked ? (selected ? '#e0d7ff' : '#b0a8d0') : '#4a4a6e';
    ctx.fillText(unlocked ? def.name : '???', cx + 28, cy + 10);
    if (equipped) {
      ctx.fillStyle = '#67e8f9';
      ctx.font = '9px "Courier New", monospace';
      ctx.fillText('EQUIPPED', cx + 28, cy + 21);
    }
  }

  const activeDef = list[cosmeticsSelection];
  const detail = invResolve(INVENTORY_LAYOUT.cosmeticsDetail);
  if (activeDef) {
    const unlocked = isCosmeticUnlocked(activeDef.id);
    ctx.font = 'italic 10px "Courier New", monospace';
    ctx.fillStyle = '#7a7a9e';
    wrapText(ctx, unlocked ? (activeDef.desc || '') : 'Not yet unlocked.', detail.x, detail.y, INVENTORY_LAYOUT.cosmeticsDetail.w, 13);
    // Per-item tooltip (authored in editor/inventory_editor.html's cosmetics
    // form, distinct from the longer `desc` shown in the detail pane above)
    // — floats above the selected swatch, the closest a keyboard-only UI
    // gets to a hover tooltip.
    if (activeDef.tooltip && selectedCx !== null) {
      drawFloatingTooltip(ctx, selectedCx - 6, selectedCy - 18, activeDef.tooltip);
    }
  }
}

// ── Editor-added custom elements (drag-placed via the palette, no built-in
// semantics — decorative labels/icons the designer positions freely) ──────

function drawCustomLayoutElements(ctx, page) {
  for (const key in INVENTORY_LAYOUT) {
    const el = INVENTORY_LAYOUT[key];
    if (!el.custom || el.page !== page || el.visible === false) continue;
    const pos = invResolve(el);
    if (el.kind === 'icon') {
      drawDiamondPip(ctx, pos.x, pos.y, true, el.color || '#c4b5fd', (el.size || 16) / 2);
      if (el.label) {
        ctx.textAlign = 'center';
        ctx.font = '8px "Courier New", monospace';
        ctx.fillStyle = '#8a8aae';
        ctx.fillText(el.label, pos.x, pos.y + (el.size || 16) / 2 + 12);
      }
    } else if (el.kind === 'pipRow') {
      const n = el.count || 4;
      for (let i = 0; i < n; i++) drawDiamondPip(ctx, pos.x + i * (el.gap || 20), pos.y, true, el.color || '#c4b5fd', (el.size || 14) / 2);
    } else { // 'text' (default)
      ctx.textAlign = 'left';
      ctx.font = `${el.bold ? 'bold ' : ''}${el.fontSize || 11}px "Courier New", monospace`;
      ctx.fillStyle = el.color || '#b0a8d0';
      ctx.fillText(el.label || key, pos.x, pos.y);
    }
  }
  ctx.textAlign = 'left';
}

// ── Dispatcher ────────────────────────────────────────────────────────────

function drawInventoryScreen(ctx) {
  if (inventoryPage === 0) {
    drawInventoryMapPage(ctx);
    drawInventoryTabStrip(ctx);
    return;
  }

  drawInventoryPanelBg(ctx);
  if (inventoryPage === 1) drawInventoryCharacterPage(ctx);
  else if (inventoryPage === 2) drawInventoryUpgradesPage(ctx);
  else if (inventoryPage === 3) drawInventoryCustomizationPage(ctx);
  drawCustomLayoutElements(ctx, inventoryPage);
  drawLayoutTooltips(ctx, inventoryPage);

  const { px, py, w, h } = inventoryPanelRect();
  if (inventoryMessage) {
    ctx.textAlign = 'center';
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = 'rgba(224, 215, 255, 0.85)';
    ctx.fillText(inventoryMessage.text, W / 2, py + h - 40);
  }
  ctx.font = '10px "Courier New", monospace';
  ctx.fillStyle = '#4a4a6e';
  ctx.textAlign = 'center';
  ctx.fillText(inventoryPageControlsHint(), W / 2, py + h - 16);
  ctx.textAlign = 'left';

  drawInventoryTabStrip(ctx);
}
