# Room Scene Editor — Plan (v1 built 2026-07-29)

> See `roadmap.md`'s own entry for what actually shipped vs. what's still
> v2/deferred — this doc is kept as-written for the original design
> rationale, not re-edited to match the build after the fact.

**What the user asked for**: a room editor to design "the look of a room" — backgrounds,
hand-drawn/uploaded PNG art, and animation PNGs — plus a way to place cutscenes and plot
points, with real UI-design attention. This doc is the plan for that tool: what it
should do, what it should reuse from existing code, its data model, and a proposed UI
layout. **Not implemented in this pass** — same status as `Plans/animation_editor_plan.md`
was before it got built, and the same "planning-only" status `CLAUDE.md`'s existing
`level_designer.html` entry has had since 2026-07-17 (still not built as of this doc).

## 0. How this tool relates to the existing editor family — don't duplicate, extend

This project already has 8 dev tools (`CLAUDE.md`'s "Dev/debug tooling" section),
each with a narrow, non-overlapping job. This new tool needs to slot into that same
division of labor, not re-solve what another tool already owns:

| Existing tool | Owns | This new tool does NOT touch |
|---|---|---|
| `editor/levelEditor.html` | Room **geometry**: platforms, doors, enemies, anchors, ability rewards, pips | Platform placement, collision shapes, `connections[]` topology |
| `editor/anim_editor.html` | **Character** animation frames/hitboxes for player/enemies/bosses (`ANIM_DEFS`) | Character sprite frames — this tool is about the *room*, not entities that move through it |
| `editor/hud_editor.html` | HUD layout (`HUD_LAYOUT`) | Anything not player-facing UI chrome |
| `editor/boss_phase_editor.html` | Boss attack-weight tuning (`BOSS_PHASE_CONFIG`) | Combat balance |
| **PLANNED `level_designer.html`** (`roadmap.md`, un-built since 2026-07-17) | Was scoped narrowly: live-tune `REGION_STYLES` colors/numeric knobs via the real `decorateRoomForRegion()` function | — |

**This new tool's actual job, not covered by any of the above**: a room's *background
art* (currently 100% procedural canvas primitives, zero images anywhere in the
rendering pipeline — see §2 below) and *cutscene/plot-point placement* (currently
hardcoded `if` conditions scattered across `game_update.js`/`game_entities.js`, not
data-driven or visual at all — see §4). **Recommend folding the planned
`level_designer.html` into this tool as one panel** (its REGION_STYLES tuning is really
just "one more layer of room look," the same category of thing as a background image)
rather than building two separate tools that both open a room-preview canvas and both
read `REGION_STYLES` — flag this to the user before starting, since it changes
`level_designer.html`'s own roadmap.md entry from "still to build separately" to
"absorbed here."

## 1. Research: what dedicated room/scene editors actually provide

None of these tools are in this project's pipeline (no Tiled/LDtk/Ogmo/engine import —
`area.js` is hand-authored JS, no TMX/LDtk-JSON export step), but their concepts are
worth deliberately borrowing since they're mature, well-tested answers to "how do you
edit a 2D scene's look":

- **Layer separation is universal.** GameMaker's Room Editor splits a room into
  Background/Tile/Instance/Asset/Path layers, each independently orderable by depth;
  Ogmo Editor's "decal layers" specifically exist to freely position/scale/rotate
  standalone images for decoration, separate from its grid-based "block layers." Tiled
  and LDtk both separate Tile Layers (grid-snapped) from Object/Entity layers
  (free-position). The universal lesson: **background art, collision, and entities
  should be independently orderable layers**, never one flat list — this tool's data
  model (§3) follows that split.
- **Parallax scrolling is a design tool, not just eye candy** — it sells depth and can
  guide player focus, and every engine's room editor treats "how fast does this layer
  scroll relative to camera" as a first-class per-layer property, not a hardcoded
  constant. This project already has exactly this concept in `drawAreaBackdrop()`'s
  deep (0.04x) vs. mid (0.3x) layers (see §2) — the new tool's job is making that
  *tunable per room* instead of a fixed two-layer procedural system.
- **Cutscene/timeline tools favor either a literal timeline (drag clips on a scrubber,
  e.g. Comic Cutscene Maker's animated-panel/parallax-layer/camera-look timeline) or a
  script-based director pattern** (Godot's own community has moved toward a
  `CutsceneDirector`-style scripted-steps approach over a pure visual timeline, citing
  more flexibility for branching/conditional beats than a linear timeline node graph
  gives). **This project already has a script-based system** (`cutscene.js`'s
  `CUTSCENES{}` step arrays: `wait`/`text`/`cameraPan`/`choice`/`setFlag`/`call`) — the
  new tool doesn't need to invent a timeline UI at all, just a visual way to *place
  where in the world* a given `CUTSCENES` key triggers (§4), leaving the step-authoring
  itself as hand-written JS in `cutscene.js`, same as today.
- **UI/UX principles for dev tools specifically** (not player-facing game UI): clarity
  over density — high-contrast, readable at a glance, every control gives immediate
  visual feedback. The existing editor family already does this reasonably well
  (`levelEditor.html`'s live canvas + side-panel property inspector, instant apply on
  input); this tool should match that established look/interaction pattern rather than
  invent a new one, so a user who already knows `levelEditor.html` doesn't have to
  relearn a different interaction model for the room-look tool.

## 2. Current state audit — what this tool builds on top of

**There is no image/sprite rendering pipeline for rooms today.** Every visual element
of a room's "look" is one of:
- `area.bgColor`/`area.ambientColor`/`area.mapAccent` — flat hex color strings, used for
  gradients/tints (`drawAreaBackdrop()`, `game_entities.js:1111`).
- `drawAreaBackdrop()`'s **deep layer** (slow radial-gradient "nebulae," `cam.x * 0.04`
  parallax offset) and **mid layer** (procedural silhouettes via `drawMidShape()`,
  `cam.x * 0.3` offset) — both entirely math-generated per frame, no images
  (`game_entities.js:1111-1136`).
- `REGION_STYLES` (`game_entities.js:864-868`) — only 3 regions have an entry today
  (`mirror_veil`/`event_horizon`/`chrono_rift`), each a `{primary, secondary, glow}`
  color triple consumed by `decorateRoomForRegion()` (ambient effect, drawn once per
  frame under the platforms) and `decoratePlatformForRegion()` (per-platform edge
  decoration) — both are hand-written per-region `if` branches with bespoke procedural
  drawing code (reflection seams, gravity-lensing arcs, clock spokes), not
  data-driven beyond the 3 colors.
- `drawDoor()` (`game_entities.js:974`) — 3 shape kinds (glowing portal / one-way arrow
  / arched entrance), tinted by `area.mapAccent`/`ambientColor`, otherwise
  region-agnostic.

**Cutscenes are already a real, working system, just not visually placed.**
`cutscene.js`'s `CUTSCENES{}` + `playCutscene(id)` is fully built (§ referenced in
`CLAUDE.md`'s architecture map) — the gap is that every trigger is a hardcoded
condition, e.g.:
```js
// game_entities.js:511
if (targetId === 'echo_bridge_part1' && !storyFlags.echo_bridge_intro_seen) {
  playCutscene('echo_bridge_intro');
}
// game_update.js:601
if (!storyFlags.child_fight_choice_resolved && (areaEnemies[...] || []).some(e => e.aware)) {
  playCutscene('child_first_fight_choice');
}
```
Three call sites total today, each a bespoke condition a programmer wrote by hand —
there's no data on `area.js` rooms saying "a cutscene lives here," so a level designer
can't see or move a plot trigger without editing JS. This is the concrete gap the new
tool's cutscene-placement feature (§4) closes.

**Existing precedent for image storage, directly reusable**: `game/animImageStore.js`
(added 2026-07-23, `roadmap.md`) is a small IndexedDB wrapper (`put`/`get`/`delete`/
`generateId`) built specifically because `anim_editor.html` used to inline uploaded
images as base64 `data:` URLs straight into `localStorage`-saved `ANIM_DEFS`, which hit
`localStorage`'s ~5-10MB quota after 2-3 uploads. The fix: `frame.image` holds a short
`idb_...` id instead of the raw bytes; `animdata.js`'s `getAnimImage()` resolves either
form (legacy inline `data:` URL, or an IndexedDB id) so exported/shipped content stays
self-contained while the *editing* experience doesn't hit the quota. **This exact
pattern is the answer to "how do room background PNGs get stored"** — a sibling store
(e.g. `RoomImageStore`, same `IndexedDB` wrapper shape, different DB name) avoids
re-solving a problem this codebase already solved once.

## 3. Proposed data model

New optional field on `AREAS[id]` entries, additive (a room with no `backdropLayers`
renders exactly as it does today — `drawAreaBackdrop()`'s existing procedural deep/mid
layers stay the default, same fallback philosophy `animdata.js`'s `pose` vs. `image`
already uses):

```js
backdropLayers: [
  {
    id: 'bl_...',           // stable id, referenced by the editor's selection/undo
    imageId: 'idb_...',     // RoomImageStore key, or a raw data: URL for legacy/shipped content
    parallaxX: 0.3,         // fraction of camera.x this layer scrolls at (0 = fixed, 1 = moves with world)
    parallaxY: 0.1,
    x: 0, y: 0,             // base placement offset
    scale: 1,
    repeat: 'x',            // 'none' | 'x' | 'both' — for seamless horizontal-scroll backgrounds
    tint: null,             // optional hex overlay, reuses hexToRgba() same as everywhere else
    opacity: 1,
  },
],
cutsceneTriggers: [
  {
    id: 'ct_...',
    x: 0, y: 0, w: 100, h: 100,   // a trigger zone, same shape as transitions[]
    cutsceneId: 'echo_bridge_intro',  // key into CUTSCENES{}
    storyFlag: 'echo_bridge_intro_seen', // gate: skip if this flag is already true
    triggerType: 'enter',   // 'enter' (overlap) | 'onRoomLoad' (fires once on switchArea, no zone needed)
  },
],
```

Both arrays are additive/optional, same convention every other per-room array
(`loreFragments`, `fracturePipRewards`, etc.) already follows — `validateAreaGraph()`
and `room_progress.js` would need small additions to know about the new fields, but
nothing about existing rooms changes by adding this.

**Why a trigger *zone* and not just a room-id condition**: today's 3 hardcoded cutscene
triggers are keyed on whole-room entry or a global condition — fine for "first entry to
a room," not expressive enough for "stand in this specific spot" (several planned
beats, e.g. the Antechamber's Phase-Dash wall-crossing reveal in `story.md` §0, are
specifically about crossing a particular point in a room, not just being in it at all).
A rectangle trigger zone (same shape as `transitions[]`, so the editor can reuse
`levelEditor.html`'s existing rectangle-drag-resize-handle code) covers both cases:
`onRoomLoad` ignores `x/y/w/h` entirely for the "whole room, on entry" case, `enter`
uses the zone for the "specific spot" case.

## 4. Proposed tool UI

Read `Plans/artifact-design`-style discipline even though this isn't a web artifact —
the goal is a tool a non-coder can use confidently, matching `levelEditor.html`'s
already-established interaction model (live canvas + side property inspector + instant
apply) rather than inventing a new one:

**Layout** (three-pane, same skeleton as `levelEditor.html`):

- **Left panel — Room & Layer list**:
  - Room/region picker (dropdown, populated from the real loaded `AREAS`, exactly like
    `levelEditor.html`'s own room switcher — never a hand-typed duplicate list).
  - Below it, a flat ordered list of the current room's `backdropLayers[]` (drag to
    reorder = change draw depth) — each row shows a thumbnail, its parallax factor as a
    small badge, and a visibility toggle.
  - A separate collapsed section for `cutsceneTriggers[]` — a flat list, click to
    select and jump the canvas to that trigger's zone.

- **Center — Live canvas preview**: renders the picked room using the REAL functions
  (`drawAreaBackdrop`, `decorateRoomForRegion`, `decoratePlatformForRegion`, `drawDoor`,
  plus the new backdrop-layer draw loop) via a `<script src="../game/game_entities.js">`
  include — same "load the real render code, don't reimplement an approximation"
  principle the planned `level_designer.html` spec already committed to. A camera-pan
  scrubber (drag left/right) previews parallax at different scroll positions, since
  parallax only reads correctly in motion — a static single frame can't show it.
  Cutscene trigger zones draw as a distinct dashed rectangle overlay (reuse
  `levelEditor.html`'s `diamond()`/rectangle-draw conventions for visual consistency),
  draggable/resizable the same way `transitions[]` already are in that tool.

- **Right panel — Properties inspector** (context-sensitive on current selection, same
  pattern as `levelEditor.html`'s `updateSideProps()`):
  - **Layer selected**: image upload button (writes to `RoomImageStore`, same
    IndexedDB pattern as `anim_editor.html`'s sprite uploads — §2), parallaxX/Y
    sliders with live numeric readout, scale/opacity/tint controls, a `repeat`
    dropdown (none/x/both) for seamless-scroll backgrounds.
  - **Region-level style selected** (absorbing the planned `level_designer.html`
    scope): `REGION_STYLES` primary/secondary/glow color pickers, plus whatever
    numeric knobs the region's own `decorateRoomForRegion()` branch exposes (diamond
    spacing, ring count, spoke count — same list `roadmap.md`'s existing
    `level_designer.html` spec already itemized).
  - **Cutscene trigger selected**: `cutsceneId` dropdown (sourced from a real
    `CUTSCENES` object, same `<datalist>`-autocomplete approach just added to
    `levelEditor.html`'s Lore Pip panel — see `roadmap.md` Phase 28), `storyFlag` text
    field with a live "already true in a fresh save? / currently set?" hint, and a
    `triggerType` toggle.

- **Bottom bar**: Undo/Redo (reuse `levelEditor.html`'s existing history-stack code,
  don't reinvent), zoom controls, and an Export button that serializes the working
  `backdropLayers[]`/`cutsceneTriggers[]`/`REGION_STYLES` edits back into paste-ready JS
  blocks — same non-destructive "paste into source yourself" pattern every editor in
  this family already uses; the tool never writes files directly.

**Interaction details worth getting right** (from the researched UI/UX principles —
clarity, immediate feedback):
- Every slider/color-picker updates the live canvas on `input`, not just on release —
  matches `levelEditor.html`'s existing `applyProps()` wiring exactly.
- The parallax-preview scrubber should make the *relative* speed difference between
  layers immediately obvious — this is the one interaction unique to this tool (nothing
  else in the editor family previews motion), so it deserves specific attention rather
  than an afterthought slider.
- Keep the tool's own chrome (panels, buttons) visually distinct from the game-preview
  canvas — no floating labels drawn *inside* the canvas that could be mistaken for
  actual game HUD, consistent with `CLAUDE.md`'s "no boxed HUD panels" rule applying to
  the real game, and this tool's job being to preview that rule accurately, not violate
  it in its own preview chrome.

## 5. Reuse checklist (don't rebuild what already exists)

| Need | Reuse this, don't reinvent |
|---|---|
| Load real room data | `<script src="../game/area.js">`, same as every other editor |
| Load real decoration/backdrop code | `<script src="../game/game_entities.js">` for `REGION_STYLES`/`decorateRoomForRegion`/`decoratePlatformForRegion`/`drawDoor`/`drawAreaBackdrop` — needs `physics.js` first per the real load order |
| Look up real cutscene ids | `<script src="../game/cutscene.js">` for `window.CUTSCENES` — same inclusion `editor/levelEditor.html` just gained (`roadmap.md` Phase 28) |
| Store uploaded background PNGs without hitting `localStorage` quota | A new `game/roomImageStore.js`, identical shape to `game/animImageStore.js` (different `DB_NAME`) |
| Rectangle drag/resize/select UI | `levelEditor.html`'s existing platform/transition drag-handle code |
| Undo/redo | `levelEditor.html`'s existing history-stack implementation |
| Autocomplete a cutscene id field | The `<datalist>` pattern just added to `levelEditor.html`'s Lore Pip panel (2026-07-29) |
| Non-destructive export | JSON/paste-ready-JS export button, same as every existing editor tool |

## 6. Scope staging

- **v1 (recommend building first)**: `backdropLayers[]` + image upload/parallax/tint
  editing, and the `REGION_STYLES` region-level color/numeric tuning absorbed from the
  planned `level_designer.html` spec. This alone closes the "there is no way to add
  real background art to a room" gap, which is the more novel and higher-value half of
  the ask.
- **v2**: `cutsceneTriggers[]` placement UI. Lower urgency than v1 since only 3
  cutscenes exist total today (not yet a scaling-pain point), but straightforward once
  v1's canvas/panel scaffolding exists.
- **Explicitly out of scope**: a visual node-graph/timeline scripting UI for cutscene
  *steps themselves* (the `wait`/`text`/`cameraPan`/`choice` step arrays) — `cutscene.js`
  already has a working, hand-authored format for that; this tool only places *where* a
  cutscene fires, it doesn't replace writing the cutscene's own steps in JS. Also out of
  scope: touching `anim_editor.html`'s character-animation domain, or `levelEditor.html`'s
  geometry/entity domain — this tool is additive alongside both, not a replacement for
  either.

## 6.5 Addendum (2026-07-29, from `Plans/production_workflow_and_tool_gaps.md`'s audit) — three more things to fold in

- **A scattered decoration-sprite layer, separate from `backdropLayers[]`.** Ogmo
  Editor's "decal layers" are the precedent: many small, individually-placed,
  non-colliding sprites (rubble, dead pipework, a cracked sign), not one big background
  image. Add `decorationSprites: [{id, imageId, x, y, scale, rotation, flipX}]` — same
  `RoomImageStore` reuse as §3's backdrop layers, just placed as many small instances
  instead of one full-bleed layer. Without this, "room look" only ever means one
  backdrop image, never the smaller clutter details that make a space read as lived-in.
- **Per-room ambient/positional one-shot SFX triggers.** `editor/audio_ab_tester.html`
  already curates real per-*region* music/SFX candidates — but nothing plants a one-off
  ambient sound (a distant clang, a dripping echo) at a specific spot in a room. Same
  shape as `cutsceneTriggers[]` (a zone + a sample id + trigger-once/loop-while-inside),
  cheap to add to that same panel once it exists — no new panel needed, just another row
  type in the same trigger-list UI.
- **A live camera-bounds overlay in the preview canvas.** `updateCamera()` clamps to
  room bounds, so background art placed near a room's edge may never actually be
  visible depending on where the clamp stops the camera. Draw the real camera-clamp
  rectangle in the preview so art doesn't get authored outside what a player can ever
  see.

## 7. Open questions to raise with the user before building

1. Confirm folding the planned `level_designer.html` into this tool (§0) rather than
   building it as a separate, smaller tool first — changes that entry's `roadmap.md`
   status from "still to build" to "superseded by this doc's v1."
2. Does `backdropLayers[]` need to support per-room overrides of the *existing*
   procedural deep/mid nebula layers (turn them off entirely for a room that has real
   background art instead), or should real art always layer additively on top of the
   procedural backdrop? Affects whether `drawAreaBackdrop()` needs a new "skip
   procedural layers" flag.
3. Trigger zones (§3) reuse the transitions'-rectangle shape — confirm that's
   sufficient, versus wanting a non-rectangular trigger area (e.g. radius-based) for
   any specific planned beat.

## Sources (design-research citations)

- [Using The GameMaker Room Editor](https://gamemaker.io/en/help/articles/using-the-gamemaker-room-editor)
- [GameMaker — Layer Types And Properties](https://manual.gamemaker.io/lts/en/The_Asset_Editors/Room_Properties/Layer_Properties.htm)
- [LDtk vs Tiled: Compared](https://www.softwr.com/compare/ldtk-level-editor-vs-tiled-map-editor)
- [SaaSHub — Ogmo Editor vs Tiled Map Editor comparison](https://www.saashub.com/compare-ogmo-editor-vs-tiled-map-editor)
- [Parallax scrolling — Wikipedia](https://en.wikipedia.org/wiki/Parallax_scrolling)
- [Parallax Background in Unity — Medium](https://medium.com/@Code_With_K/parallax-background-in-unity-fd8766d5a9bd)
- [Godot 4 CutsceneDirector: A Script-Based Alternative to Timelines](https://manuelsanchezdev.com/blog/godot-cutscenes/)
- [Comic Cutscene Maker (itch.io)](https://nic-phan.itch.io/comic-cutscene-maker)
- [Game UI/UX Design: Best Practices and Examples — Wayline](https://www.wayline.io/blog/game-ui-ux-design-best-practices-and-examples)
