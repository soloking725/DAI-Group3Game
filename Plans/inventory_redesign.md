# Multi-page Inventory Redesign (Hollow Knight-style)

Status: implemented 2026-08-01. Page 3 (Customization) ships with an empty
cosmetics catalog by design — content is added via editor/inventory_editor.html,
not hardcoded. See "What actually shipped" at the bottom of this doc.

## Current state (as of this doc)

- Single-page canvas-drawn "Inventory" screen, no DOM: `game/game_draw_loop.js:529-689` (draw), `game/game_update.js:385-412` (input), `game/game_state.js:380-424` (data: `INVENTORY_UPGRADES`, `statUpgrades`, `fracturePipsFound`).
- Toggle: `I` key or pause-menu "Inventory" entry → `gameState = 'inventory'`.
- Separate systems that would feed the new pages but currently have no inventory-screen presence:
  - `game/map.js` — full-screen world map (`M` key), generated from `area.js` compass graph + hand-laid `MAP_LAYOUT_SVG` positions.
  - `game/companion.js` — "the Child" companion (`companionState.active`).
  - `game/healing.js` — Vitality Motes / Max-Health Shards / Healing Crystals (kept deliberately separate from Fracture Pips per its own header).
  - No story-item collection list, no cosmetics/skins system, no idle-animation/taunt system exist yet — new data structures needed.
- Editor precedent: `editor/hud_editor.html` (323 lines) edits `HUD_LAYOUT` (anchor + offset per element) live against a canvas mock, persists to `localStorage['stillpoint_hud_layout_v1']`, read back by `hudResolve()` in `game/game_hud_menus.js`. `editor/room_scene_editor.js` boots the *actual game* in an iframe and live-mutates its globals — better fidelity than a mock, worth reusing for this editor instead of hud_editor's mock-canvas approach.

## Research: Hollow Knight's inventory pattern, and what it implies here

Hollow Knight's "Inventory" is a tabbed pause screen (arrow keys / shoulder buttons cycle tabs): Quill Notebook/Journal (bestiary), Charms (equip loadout with a Notch budget), Map (per-area, revealed by find-in-world Cartographer maps, pins/markers editable by the player), and implicitly the equipment/nail/geo readout on the pause backdrop itself. Key UX properties worth carrying over:

1. **Tabs are a strip, not a menu** — one row of icons/labels, current tab highlighted, `Q`/`E` or `←`/`→` cycles without leaving the overlay. Fits the existing single-`gameState('inventory')`-with-a-sub-index pattern already used for `pausedSettingsIndex`.
2. **The map is player-marked, not just a viewer** — HK lets you drop pins (bench, shop, item, etc.) once you own the Quill. That's a "missed" feature: your Page 0 description ("scratched together from all types of sources") implies a diegetic, hand-drawn/collage map — leaning into a **pin/annotation layer the player places** (not just auto-revealed rooms) would sell that "scratched together" framing much better than a clean auto-generated map. Cheap to add: reuse `map.js`'s room-position data, add a `mapPins` array (`{roomId, x, y, icon, note}`) saved with the game.
3. **Charms = build diversity via constrained equip slots**, not just power totals. Your Page 3 (idle anims/taunts/fashion) is cosmetic-only per your description, so this concern doesn't map 1:1, but it's worth flagging that Page 2 (ability upgrades) currently has *no* opportunity-cost mechanic — every upgrade is independently purchasable with enough Lore Pips, nothing is mutually exclusive or slotted. That's fine as an intentional design choice, just noting it's the one thing HK-style "build" depth that's absent.
4. **Distinct page identity via layout, not just content** — HK's Charms page is a grid, the map is spatial/free-pan, the journal is a list+detail split. Reusing one panel template for all 4 of your pages (as the current single inventory screen does) will read as flat. Recommend: Map = full-bleed pannable canvas (reuse `map.js` renderer, add pin layer); Inventory (char/items) = your described vertical split; Upgrades = list+detail (close to what exists now); Customization = grid of swatches/portraits (new).
5. **Companion presence on the character panel** — showing "the Child" next to the player portrait when kept (per your Page 1 spec) has no precedent to copy mechanically, but visually it should read as a *diegetic portrait*, not a live-simulated companion — cheaper to build (a static pose/sprite keyed off `companionState.active` and maybe `companionState.trust`/rapport if that exists) and avoids re-running companion AI inside a paused overlay.

## Things likely missed in your brief

- **Bestiary/lore-codex entry point.** You already track `collectedLore` (Lore Pips) and presumably lore *text* fires via `loreOverlay`. Right now there's no screen to re-read collected lore after the popup fades. This is the single biggest HK-inspired gap — consider a lore/journal sub-tab (could live inside Page 1's "story items" side, or be a 5th page) so collected lore isn't write-once/ephemeral.
- **Ability icon levels vs. locked abilities.** Page 1 says "abilities with a number for their level next to them" — need a rule for *not-yet-unlocked* abilities (dim slot vs. hidden entirely). HK dims unknown charms as silhouettes; recommend the same (encourages "there's a slot I haven't filled" pull) rather than hiding rows, since `game_entities.js:954`'s `requires === 'ten_lore_pips'` gating already implies abilities can be earned mid-game.
- **Story items needing a "read again" affordance** — same issue as lore: if picked-up key items currently only flash a toast, Page 1's "story items" column should be their permanent home, with a detail pane like the current Page 2 upgrade description.
- **Map legend for pin types** and a **toggle for revealed-vs-undiscovered rooms** (fog of war) — `map.js` should already gate on visited rooms; confirm and expose that state in the new page rather than re-deriving it.
- **Save-data shape.** Every new piece of state (mapPins, customization unlocks/equipped, page-specific editor overrides) needs to be added to whatever `game_boot_save.js` serializes, or it won't survive reload/export.
- **Editor scope** — HUD editor only ever needed to move existing elements. This editor also needs to *add new elements* (per your ask) — meaning it needs an element palette (icon/text/pip-row/portrait-slot primitives), not just drag-existing. That's a materially bigger tool than `hud_editor.html`.

## Proposed architecture

**Data/state** (`game_state.js`): replace `gameState === 'inventory'` boolean-ish check with `inventoryPage` (0-3, maybe 4 for lore codex) alongside existing `inventorySelection`. Keep `INVENTORY_UPGRADES` etc. as-is; add:
- `mapPins` (Page 0) — array, persisted.
- `equippedCosmetics` / `unlockedCosmetics` (Page 3) — object, persisted.
- Keep companion/lore/healing systems untouched; the new pages *read* them, don't own them.

**Input** (`game_update.js`): generalize the existing `gameState === 'inventory'` block — `Q`/`E` or `←`/`→` (outside a list-nav context) switches `inventoryPage`; per-page handlers dispatch on `inventoryPage` for the rest (reuse today's ↑↓/Enter logic verbatim for the Upgrades page).

**Draw** (`game_draw_loop.js` is already large — recommend extracting to new `game/inventory_ui.js` per the Explore agent's suggestion, called from the draw loop's `gameState === 'inventory'` branch): one `drawInventoryTabs()` header shared by all 4 pages, then `drawMapPage / drawCharacterPage / drawUpgradesPage / drawCustomizationPage`, each owning its own layout. Layout constants for each (panel rects, portrait slot, tab strip) should live in a new `INVENTORY_LAYOUT` object mirroring `HUD_LAYOUT`'s anchor+offset shape, so the same editor pattern applies.

**Editor** (`editor/inventory_editor.html`, new): follow `room_scene_editor.js`'s live-iframe pattern (boot the real game, not a mock) with `editor/inventory_editor.js` driving it — pick a page, drag-reposition `INVENTORY_LAYOUT` entries like `hud_editor.html` does for `HUD_LAYOUT`, plus a palette panel to add new element instances (text label, icon slot, pip row, portrait) that get appended to `INVENTORY_LAYOUT` with a generated id. Persist under a new `localStorage` key, e.g. `stillpoint_inventory_layout_v1`, loaded the same way `HUD_LAYOUT` merges saved overrides at boot.

## Suggested build order

1. `inventoryPage` state + tab strip + page-switch input (mechanical skeleton, no new content).
2. Migrate existing Upgrades content into Page 2 unchanged (proves the skeleton).
3. Page 1 (character/abilities/story items + companion portrait) — biggest content lift, needs an ability-icon catalog.
4. Page 0 (map reuse + pins) — mostly wiring into `map.js`'s existing renderer.
5. Page 3 (customization) — depends on a cosmetics data model that doesn't exist yet; likely the long pole.
6. `editor/inventory_editor.html` — do this alongside step 1-2 once `INVENTORY_LAYOUT` exists, so every later page benefits.

Open questions for you before implementation:
- Should the lore/journal re-read screen be a 5th page or folded into Page 1's story-item column?
- Is there an existing ability-icon asset set, or do these need to be drawn/sourced first?
- Any existing cosmetics/skins concept (even a stub list) to build Page 3's data model against, or starting from zero?

## What actually shipped (2026-08-01)

Answers received: Page 3 starts from zero (editor fills it in); lore/story
re-read folded into Page 1 (no 5th page); no icon asset set existed, so
ability/pip/cosmetic icons are drawn as colored diamond glyphs (same motif
the old inventory panel already used), not sprites.

- **State**: `game/game_state.js` — `inventoryPage` (0-3), `INVENTORY_PAGE_NAMES`,
  `mapPins`/`mapCursor`/`nextMapPinId` (Page 0), `unlockedCosmetics`/
  `equippedCosmetics`/`cosmeticsSlotIndex`/`cosmeticsSelection` (Page 3).
- **Catalog**: `game/customization.js` — `COSMETICS_CATALOG` (starts `[]`,
  localStorage-backed like `HUD_LAYOUT`), `isCosmeticUnlocked()`, `equipCosmetic()`.
- **Draw + per-page input**: `game/inventory_ui.js` — `INVENTORY_LAYOUT`
  (anchor+offset, same shape/override pattern as `HUD_LAYOUT`), `drawInventoryScreen()`
  dispatcher, one draw fn per page, `updateInventoryMapPage()` /
  `updateInventoryCustomizationPage()` (Page 1/2 input stayed in `game_update.js`
  since it's just list nav).
- **Input**: `game_update.js`'s `gameState === 'inventory'` block — Q/E cycle
  pages; per-page ↑↓/Enter as before, plus Page 0's cursor+pin controls
  (arrows move, Enter add/cycle pin type, Delete/Backspace remove, N sets a
  note via `window.prompt()`, matching the existing save-import prompt() precedent).
- **Save data**: `game_boot_save.js` — `mapPins`/`unlockedCosmetics`/
  `equippedCosmetics` persist through `saveGame()`/`loadGame()`, reset in
  `init()` and `startNewGame()`.
- **Editor**: `editor/inventory_editor.html` — drag-reposition every
  `INVENTORY_LAYOUT` entry per page (mirrors `hud_editor.html`, but on an
  800x450 mock canvas — 1:1 with the real game, not scaled — to avoid a
  centering-math mismatch that would've hit a wide `panel` element), a
  palette to add freeform text/icon/pip-row elements to any page, and a
  full CRUD form for the Page-3 cosmetics catalog (name/slot/color/unlock
  condition/description). Linked from `editor/dev_hub.html`.

Not done / deliberately deferred: no real player-sprite portraits on Page 1
(colored boxes stand in — no sprite-on-UI-panel pipeline exists yet); Page 0
pins are freeform crosshair-placed rather than snapped to rooms; idle-anim/
taunt *playback* (actually changing what the player does when idle) isn't
wired — the Customization page only tracks which one is equipped, since
that's a Page-3-content problem for whenever animation content exists to
equip. Not verified in-browser per this repo's standing preference for
CLI/node-based verification over opening the game.
