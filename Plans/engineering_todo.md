# Engineering To-Do (added 2026-08-01)

Pure engineering/tooling/architecture work — things a session can pick up and
build without a creative decision from the user first. Deliberately excludes
content work (hand-designing rooms, placing enemies, writing cutscene text,
drawing art, deciding hazard/puzzle design, region layout) — that's the
user's own creative direction, not listed here. Where an item is blocked on
a creative/design decision rather than pure engineering, it's flagged as
such instead of included as a build task.

Sources this consolidates (read those for full detail — this is a punch
list, not a replacement): `production_workflow_and_tool_gaps.md`,
`dev_tools_roadmap_status.md`, `roadmap.md`'s tail entries,
`enemy_attack_vocabulary_plan.md`, `room_verification_tool_plan.md`,
`archive/session_priorities.md` (retired 2026-08-03 — 5 of 8 items were
done, its bot-walker item was already a duplicate of #2 below, its audio-
rework item is superseded by the real recorded-music/sample system that
now exists; the one genuinely un-tracked item, a formal profiling pass,
is folded into #3 below).

## 1. Custom art/animation system (this session's thread)

- **Cutscene visuals** — a new `visual`/`portrait` step type in
  `cutscene.js`'s `CUTSCENES` vocabulary, authored in `cutscene_editor.html`.
  Needs a real design decision on the step's shape (full-screen portrait?
  positioned sprite? camera-relative?) before building — flagged, not
  started.
- **Particles/projectiles** — need a lighter, non-`Animator` mechanism
  (an optional `imageId` + shared image-cache lookup, no per-particle class
  instance) given the performance boundary found this session
  (`debug_v2.html`'s test X03 bounds pooled array growth; a full `Animator`
  per particle would be new per-object overhead that doesn't exist today).
  Not started.
- **HUD/menu chrome, world-map icons** — not touched this session. HUD has
  an owning tool (`hud_editor.html`) to extend; world-map icons have no
  owning tool (`worldmap.html` was removed 2026-07-26) — small scope
  question on where this would even live.
- **`REGION_STYLES`-level *animated* variant authoring UI** — `hazardVariant`/
  `enemyVariant` (color, from the visual-variants work) are still hand-edited
  directly in `game_entities.js`; extending `room_scene_editor.html`'s
  existing region-style panel to expose them is a small, natural follow-up,
  not done.
- **State-aware animated variants** for pickups/anchors (e.g. an anchor's
  activated-vs-dormant glow, a healing crystal's consumed dimming, a Lore
  Pip's overlay/cutscene/none tinting) — today an authored `animKey` fully
  replaces the procedural look including those state differences. A future
  layer could let an authored animation branch by state too; not built,
  deliberately deferred as a "when it's actually needed" item.
- **`anim_editor.html` "Room Objects" picker category** — right now a new
  hazard/platform/door/pickup animation key is only reachable via
  `levelEditor.html`'s deep-link button (Option 2, per the user's explicit
  choice); the entity picker itself has no generic "Room Object" browse
  entry the way Player/Boss/Enemies/Child do. Low priority — the deep-link
  path already covers the primary workflow.
- **`decorationSprites[]` scattered-decal layer** (room_scene_editor
  addendum, `Plans/archive/room_scene_editor_plan.md` §1) — many small
  non-colliding placed sprites (rubble, clutter), separate from the
  full-bleed `backdropLayers[]`. Spec'd, not built.
- **Live camera-bounds overlay** in `room_scene_editor.html`'s preview
  canvas — draws the real camera-clamp rectangle so background art isn't
  authored outside what the player can ever actually see. Spec'd, not
  built.
- **Ambient one-shot SFX trigger zones** — same data shape as
  `cutsceneTriggers[]` (a zone + sample id + trigger-once/loop-while-inside).
  Blocked on sourcing actual positional-ambient audio assets first (the
  existing `SAMPLE_URLS` table is all combat-impact sounds) — a content
  gap as much as a coding one.

## 2. Room verification / production tooling

- **Room reachability bot-walker** (`room_verification_tool_plan.md`
  Component 2) — **deprioritized by the user, 2026-08-02** ("i don't care
  for the bot walker"). Previously ranked highest-priority per
  `production_workflow_and_tool_gaps.md`'s own recommendation; overridden
  by explicit user call. Only the static linter (Component 1, now merged
  into `game/roomVerify.js` — see §7 item 10) and Spawn button (Component
  3) are built. Not being pursued — don't resurface this as a
  recommendation without being asked again.
- **Project Progress Dashboard v2** — per-room drill-down (click a region
  row to expand into its per-room breakdown) and a "suggested next
  room/region" heuristic. v1 (aggregate stats) is built on `dev_hub.html`;
  v2 needs the ranking heuristic designed (what "highest leverage next"
  actually weighs) before building — a small design call, not a big one.
- **Cutscene editor v2** — swap the current static mocked walkthrough
  preview for a real sandboxed-iframe preview (same technique
  `room_scene_editor.html` already uses). Spec'd, deferred on purpose in
  the v1 build.
- **`debug_v1.html` R10 fix** — `abilityState` isn't attached to `window`
  (a top-level `const` in `ability.js`), so that one check reports
  `undefined`. One-line fix (`window.abilityState = abilityState`), just
  never prioritized since it's debug-tool-only.

## 3. Combat/movement feel polish (`difficulty_bot_and_combat_polish_plan.md` Part 2, `dev_tools_roadmap_status.md` Phase 2)

- Centralized `triggerHitImpact(severity)` — hitstop is currently set ad
  hoc at ~19 call sites in `game_update.js`; pull into one function.
- Wire the existing `attack_windup`/`attack_strike`/`attack_recover` poses
  (already authored in `animdata.js`) into the player's actual animator —
  currently defined but unused.
- Stillpoint duration ring — no visual indicator of remaining Stillpoint
  time exists yet.
- Hazard knockback direction — currently always knocks away from the
  hazard's center; should be off the surface normal instead.
- Attack input buffering during recovery frames (same buffering treatment
  jump input already got).
- Reversal's Sword-Clash interrupt-punish check
  (`enemy_attack_vocabulary_plan.md`'s one remaining unbuilt piece — almost
  everything else in that doc is done).
- **Formal profiling pass** (from `archive/session_priorities.md` #6, never
  done): record a full playthrough of Crag (all 4 rooms) in Chrome/Firefox
  DevTools, identify actual frame-drop culprits (physics loop, draw calls,
  particle spawning), and optimize the top 2-3 bottlenecks. `hitstop`/
  `screenShake` exist and are used, but nobody has actually profiled this
  game — everything above is feel/API cleanup, not measured performance work.

## 4. Iteration-friction cleanup (`dev_tools_roadmap_status.md` Phase 3)

- Copy-to-clipboard sweep across editors (some export flows still require
  manual textarea select-all).
- Timestamped handoff keys (so a stale `localStorage` handoff between two
  tools can't silently apply outdated data).
- HUD editor `DEFAULTS` sync + schema versioning (the editor keeps its own
  copy of `HUD_LAYOUT`'s defaults — a drift risk if one changes without the
  other).
- Auto-generated UI schemas in `enemy_designer.html`/`enemy_editor.html`
  (currently hand-maintained per-field forms).
- Property-panel performance fixes at 50+ objects selected in
  `levelEditor.html`.

## 5. Lower priority / only if time permits (`dev_tools_roadmap_status.md` Phase 4)

Camera squash on impact, enemy death burst VFX, landing dust/footsteps,
fast travel between anchors, an ability-gated door icon (visual "you need X
to open this" tell beyond the current glowing-portal treatment), boss phase
audio stingers, per-ability cooldown ring colors, a scoped
`GameConstants.js` (pulling the scattered tunable `const`s into one place).

## 6. Flagged for a decision, not pure engineering

- **Warp Gate Nexus's Keystone mechanic** (`expansion.md` §3.11) — planned
  as "open after collecting 3 Keystones," which conflicts with the
  project's own "no lock-and-key gating" rule (`CLAUDE.md`'s Explicit
  design decisions section). Needs a decision from you (reframe as an
  ability gate or puzzle-vault-completion gate?) before it's buildable —
  not something to resolve unilaterally.
- ~~JS code King→Sovereign rename~~ — **done, 2026-08-02**, on explicit
  request. Turned out to be smaller than it looked: no actual `King`-
  prefixed identifiers existed anywhere (`class Boss` was always generic),
  only prose comments and a few editor-tool display strings/ids
  (`fractured_kings_guard_normal`→`fractured_sovereigns_guard_normal`,
  `kings_guard_miniboss`→`sovereigns_guard_miniboss` in
  `editor/enemy_test.html`, both unbuilt/unreferenced elsewhere so safe to
  rename outright). `area.js`'s `loreFragments[]` turned out to already
  say "Sovereign" — a stale claim in `CLAUDE.md` said otherwise,
  corrected there too. "The Mirror King" is a separate, deliberately-named
  character (per `lore.md`) and was left untouched everywhere. See
  `CLAUDE.md`'s `lore.md` entry for the full rundown.

## 7. Editor/game duplication & structural audit (2026-08-02)

Full pass over all 30 `editor/*` files plus a duplication check against
`game/*.js`. Bugs and the highest-value dedups are already fixed this
session (see "Fixed" below); the rest is a ranked backlog.

**Fixed this session:**
- `editor/floor_plan_report.html`'s comma-grouping regex was missing
  backslashes (`/B(?=(d{3})+(?!d))/g` → `/\B(?=(\d{3})+(?!\d))/g`) and
  silently never grouped digits.
- `editor/cutscene_editor.js`'s `deleteStep`/`moveStep` compared
  `selection.path.length` instead of the existing `samePath()` helper, and
  `deleteStep` left `selection.index` stale (didn't decrement) when a step
  *before* the selection was deleted.
- `editor/room_difficulty_calculator.html` threw `TypeError` on a stale/
  unmatched room selection (`.find(...).label` with no null-check) — now
  guards and shows a message instead.
- `editor/room_scene_editor.js`'s `pushHistory()` had a dead no-op `if`
  branch, turned into a plain comment.
- `game/physics.js`'s `nudgeOutOfPlatforms()` hand-rolled its own AABB
  overlap test instead of calling the existing `rectsOverlap()` — now
  calls it (adapting `plat.w`/`plat.h` → `width`/`height`).
- **New `game/overrideStore.js`** — the `localStorage.getItem → JSON.parse
  → try/catch` shell duplicated across 10 `applyXOverrides()` functions
  (`customization.js`, `animdata.js`, `area.js`, `combo.js`, `boss.js`,
  `cutscene.js`, `enemy.js`, `game_entities.js`, `inventory_ui.js`,
  `game_hud_menus.js`) is now one shared `readOverrideJSON(key)`; each
  caller keeps its own merge semantics. Wired into all 15 HTML files that
  load any of those 10 scripts (`index.html` + 14 editor tools).
- **New `editor/canvasFit.js`** — `fitCanvasToStage()` was byte-identical
  across `ability_tester.html`, `companion_test.html`, `enemy_test.html`,
  `enemy_designer.html`; now one shared file, each caller keeps its own
  `addEventListener('resize', ...)` + initial call.

**Remaining duplication, ranked by footprint:**
1. ~~Floor-plan simulation algorithm triplicated~~ — **fixed 2026-08-02.**
   Turned out to be worse than 3 copies: `Plans/analyze_floor_plan.js` had
   the engine twice internally (its own Node-side `simulateRandomPlaythrough`
   plus a second copy hand-ported into the template string that generates
   `editor/floor_plan_simulation.html`), and `editor/room_difficulty_calculator.html`
   is *also* a generated artifact (from `Plans/room_difficulty_calculator.js`,
   not hand-maintained) with a third copy. All the shared logic — RNG,
   weighted pick, mask/requirement helpers, and the actual "choose next
   move" decision algorithm (endgame-rush override, dead-end backtrack,
   oscillation escape, curiosity-weighted pick) — is now one file,
   `game/floorPlanWalkEngine.js` (dual browser-global/Node-`require`able,
   same pattern as `game/minibossRegistry.js`). `nodeWeight`/
   `difficultyMultiplier`/`applyNodeGrants` stayed as small per-file copies
   on purpose — each source its config table differently (`GRAPH.*` global
   vs. a module-level const) and weren't worth forcing onto one shape.
   Verified byte-identical simulation output before/after for both the
   Node CLI and the generated-HTML path (same seed → same walk). Along the
   way, fixed the same "no null-check on a stale room selection" bug in
   the *real* source (`Plans/room_difficulty_calculator.js`) that an
   earlier session in this pass had only patched in the generated file
   (which would've been silently overwritten on next regen).
2. ~~Drag/hit-test/bounds-editing reimplemented 4 times~~ — **fixed
   2026-08-02, split into two real sub-cases once actually compared line
   by line.** `hud_editor.html` and `inventory_editor.html`'s move-only
   anchored-element drag (mousedown hit-test loop → mousemove delta with
   anchor-flip → mouseup commit) was byte-identical — now one shared
   `editor/anchoredDrag.js` (`resolveAnchored()` + `makeAnchoredDragController()`).
   `anim_editor.html`'s hitbox/hurtbox box-drag and `room_scene_editor.js`'s
   cutscene-trigger drag are genuinely different beyond that (1-corner vs.
   4-corner resize handles, different min-size handling, different
   world/screen coordinate transforms, different multi-entity selection
   models) — not safe to force into one controller. But their corner-resize
   *math* ("opposite corner stays fixed") is the same algorithm underneath;
   extracted that alone into `editor/boxResize.js`'s `resizeRectByCorner()`,
   verified against both original inline formulas with 25,000 randomized
   inputs (0 mismatches) before wiring it in. The move-logic and event
   wiring stayed local to each file since those really do differ.
3. ~~`levelEditor.html` doesn't use the shared `game/undoHistory.js`~~ —
   **fixed 2026-08-02.** It hand-rolled its own `history`/`historyIndex`
   array (the exact same shape `undoHistory.js`'s own header says it was
   originally lifted out of — `levelEditor.html` itself was just never
   migrated to the shared module afterward). Swapped it for a
   `historyMgr = UndoHistory.create(() => area, (v) => { area = v; ... })`,
   same pattern as the other three editors — `area` is a reassignable
   `let` here (unlike `anim_editor.html`'s `const ANIM_DEFS`, which needs
   the delete-and-reassign-keys dance), so the `setState` callback is a
   plain reassignment. `pushHistory()`/`resetHistory()`/`undo()`/`redo()`/
   `updateUndoRedoButtons()` kept their names as thin wrappers so none of
   the ~15 existing call sites needed to change.
4. ~~JSON export-to-textarea pattern duplicated in 4 editors~~ — **fixed
   2026-08-02.** `anim_editor.html`/`combo_editor.html`/`hud_editor.html`/
   `inventory_editor.html` each defined their own `exportJSON()` with an
   identical shell (write into `#exportBox`, `.select()`, optionally log
   via `DevContext`) around a genuinely-different header comment + JSON
   snippet per tool (different target file, different wrapping —
   `Object.assign(ANIM_DEFS, ...)` vs `COMBO_DEFS = ...` vs `const
   HUD_LAYOUT = ...` vs `const INVENTORY_LAYOUT = ...`). New
   `editor/exportPanel.js` (`ExportPanel.write(boxId, text, logSource,
   logMsg, logDetail)`) owns just the shared shell; each caller still
   builds its own `text` string. **Paste-to-load is still not
   implemented** — that's a real feature gap, not duplication (each
   editor's wrapper shape is different enough that "parse it back" needs
   real per-editor design: replace-whole-object vs merge, validation,
   undo/unsaved-guard interaction), left out of this pass on purpose
   rather than bolted on as a rushed side effect of the dedup.
5. ~~Headless-boot `requestAnimationFrame` stub duplicated 4 times~~ —
   **checked 2026-08-02, turned out to be mischaracterized, not a real
   dedup target.** Actually 3 genuinely different things: (a)
   `debug_v1.html`/`debug_new.html`'s version doesn't suppress anything —
   it calls through to the real RAF and just logs timestamps for frame-
   timing telemetry; that pair was byte-identical, but that's item 7's
   duplication, not this one, and item 7 is now resolved (`debug_new.html`
   deleted). (b) `debug_v2.html`'s stub is one small piece of a much larger
   `INSTRUMENT` bundle (localStorage shim, muted audio, exception capture,
   frame-counting RAF stub) injected as a single template string into a
   sandboxed iframe — different mechanism, different purpose (frozen
   clock, manually stepped) from either of the others. (c)
   `difficulty_bot.html`'s is a genuinely standalone 2-line stub
   (`window.requestAnimationFrame = function(){ return 0; }`) loaded
   directly on its own page, no iframe at all — different mechanism again.
   Three different injection mechanisms (string-spliced-before-iframe-
   srcdoc ×2, direct-page-script) for three different purposes means there
   isn't a clean shared abstraction here — forcing one would add
   indirection for a script that's already 1-3 lines in each real case.
   Not extracted; not a real duplication once actually compared.
6. ~~Embedded-door AABB linter check duplicated byte-for-byte~~ — **fixed
   2026-08-02.** `debug_v1.html`'s R11 now calls
   `win.RoomVerify.verifyRoom(room, win.AREAS)` and filters for
   `DOOR_EMBEDDED` issues instead of its own AABB loop.
   `dev_hub.html`'s copy was pure redundancy once its "Room Layout Linter"
   section already switched to `RoomVerify.verifyRoom()` (§7 item 3's
   `levelEditor`/`dev_hub` fix, done alongside the linter merge) — any
   `DOOR_EMBEDDED` issue already surfaces there, so the separate "Embedded
   Doors" section/summary-count/health-dot in `dev_hub.html` was deleted
   outright rather than pointed at the same call a second time.
7. ~~`debug_new.html` is a stale near-duplicate of `debug_v1.html`~~ —
   **fixed 2026-08-02: deleted.** Confirmed via direct diff before
   removing (not assumed): identical R01-R08 checks except `debug_v1.html`
   has real bug fixes on top (R05 reads `win.player.x` directly instead of
   unreliable canvas-pixel-diffing; R06's pause-menu-navigation press count
   is the correct 7, not the old 5), plus 3 more checks (R09-R11)
   `debug_new.html` never had — a strict superset, not just a rename.
   Checked for references before deleting: only `dev_hub.html`'s tool list
   linked it (now removed) — no other functional code referenced it.
   Updated the doc mentions that describe it as a currently-live tool
   (`CLAUDE.md`'s File locations + Dev/debug tooling sections,
   `Plans/performanceInstructions.md`'s "never break the debug tools"
   list); left it in places that are more historical/planning artifacts
   (`Plans/OVERVIEW.md`, `Plans/production_workflow_and_tool_gaps.md`,
   `Plans/BUG_ANALYSIS_AND_QA_PLAN.md`) — lower payoff to chase every
   mention across the whole doc set.
8. ~~No shared stylesheet~~ — **stale claim, checked 2026-08-02.** This one
   was already solved: `styles/design-system.css` (455 lines, built
   2026-07-29 per `Plans/editor_redesign.md`/`Plans/editor_design_style_
   guide.md`) is already `<link>`ed by 21 of 24 hand-maintained
   `editor/*.html` files, each still keeping its own internal `<style>`
   block after it for genuine one-off overrides — exactly the intended
   convention per the stylesheet's own header comment. This item was
   apparently written before that rollout, or just never updated after
   — either way, not a real gap for those 21. **The real, narrower gap**:
   the 3 *generated* files (`floor_plan_simulation.html`,
   `floor_plan_report.html`, `room_difficulty_calculator.html` — machine-
   written by `Plans/analyze_floor_plan.js`/`Plans/room_difficulty_
   calculator.js`, see duplication item 1 above) never got the link added
   to their template, so they were still on their own inline-only styling.
   **Fixed**: added the `<link>` to both generator scripts' `fullDoc`
   head-template strings (so future regenerations stay consistent) and
   hand-patched the 3 currently-committed HTML files' `<head>` tags to
   match, rather than fully re-running the generators — `floor_plan_
   simulation.html` in particular embeds a randomly-seeded simulation run,
   and regenerating without the original seed would have changed those
   numbers as an unrelated side effect of a styling-only fix.
9. **Hit-flash/knockback duplicated ~6 ways in `game/*.js`** — checked
   2026-08-02, line-by-line, before touching any of it (this is live,
   tuned combat code, high risk to merge blind without the ability to
   browser-test per this repo's standing rule). Turned out to be much less
   mergeable than it looked, plus one real, safe fix:
   - **The "three different names for the same flag" part was partly
     right, partly wrong.** `hitFlash` (`TemporalWarden.takeDamage`,
     `enemy.js:4503`) really was a pure rename of the exact same
     set-8/countdown/`>0`-check pattern every other simple enemy's
     `flashTimer` uses — **fixed**, renamed to `flashTimer` throughout the
     class (4 sites: ctor, `takeDamage`, `update`, `draw`), zero behavior
     change, no other file referenced the old name. `bounceFlash`
     (`ColossusCore`) is **not** the same flag under a different name —
     it's a genuinely separate, second flag that coexists with
     `ColossusCore`'s own `flashTimer` on the same instance, for a
     different visual state ("this hit bounced off harmlessly" vs. "this
     hit actually connected"). Left alone; renaming it would have been
     wrong, not a fix.
   - **The 6 `takeDamage()` bodies are not safe to merge.** `Player`'s
     flash isn't even the same mechanism — it's driven by
     `invincibleTimer > 0` with a flicker check (`flashTimer % 4 < 2`) in
     `draw()`, not a post-hit countdown at all, so it isn't really part of
     this family. `FracturedSlime`/`ColossusCore`/`TemporalWarden` (now
     consistent on `flashTimer`) really are near-identical in shape
     (health -= amount; flashTimer = N; optional small fixed knockback;
     death check) — genuinely mergeable in principle — but `Enemy`'s base
     `takeDamage` and especially `ComposedEnemy`'s (~100 lines: shield-HP
     absorption, Shield Slip streak-counting, Mote Eater heal-instead-of-
     damage, parry-stun double damage, hyper-armor knockback/interrupt
     immunity, per-class `knockbackResistance`/`stunResistance` scaling,
     Reversal hit-streak arming, on-death effect hooks — all before or
     woven through the common health/flash/knockback tail) are real,
     load-bearing per-class combat design, not copy-paste drift. Forcing
     a shared `applyHitEffect()` across all of these would either flatten
     into a config object doing the same branching with extra indirection,
     or risk silently changing tuned numbers (exact knockback values,
     flash-frame counts) across enemies players already fight — not
     attempted. The field-name fix above is the one part of this item that
     was both real and safe to do without a browser to verify against.
10. ~~Two independent room-reachability linters~~ — **fixed 2026-08-02.**
    `area.js:5341-5688` had its own complete flood-fill room-layout linter
    (`_linterFloodFill`/`_linterPointReachable`/`_linterJumpHeight`/
    `_linterEdge`/`validateRoomLayout`/`validateAllRoomLayouts`, auto-runs
    on every page's `window` `load` event), independently built from
    `game/roomVerify.js`'s "Component 1" static linter. Comparing them
    directly against all 71 real rooms (`node`, no browser) found they
    agreed on 70 and genuinely disagreed on one — `crag_entrance`'s return
    door, anchor, and a cosmetic pickup sit behind an ~1200px vertical gap
    nothing in the room bridges, and `roomVerify.js` missed it: its
    reachability flood-fill seeded from the room's own anchors/doors as
    free "you can definitely stand here" starting points, which is
    circular (never verifies the door itself is reachable from a real
    entry) — `area.js`'s version correctly used real cross-room landing
    coordinates instead and caught it. **`roomVerify.js` is now the one
    canonical implementation** — merged in area.js's real entry-point
    seeding, an `ENTRY_VOID` check, the two-pass ability-loadout model
    (first-visit softlock vs. legitimate gated secret; `abilityReward`
    additionally requires first-pass reachability, since an ability can't
    be gated behind itself), the wall-obstruction check on direct jumps,
    the `rotatedGravityOnly`/`hazard`/`destructible` platform exclusions,
    and broadened `FLOOR_GAP` to area.js's more general any-height check —
    while keeping roomVerify's own real advantages area.js never had
    (wall-jump chaining, Void Tether reach, `healingCrystals` coverage,
    symmetric `ONE_SIDED_DOOR`). Also added `DOOR_UNREACHABLE`, a check
    neither old version had alone (area.js checked door touchability but
    not embedding; roomVerify checked embedding but not touchability).
    One real bug surfaced *while verifying* the merge: `reachEnvelope()`'s
    Phase Dash bonus was gated to near-flat gaps only (`|dy| <= 48`), but
    Phase Dash is 8-directional (`player.js`'s `getDashDirection`) and
    should stack onto any in-flight jump, same as area.js's `_linterReach`
    already modeled correctly — this had been silently wrong in
    `roomVerify.js` even before this merge, masked only because the
    entry-seeding bug fed reachability in from high-up points that never
    exercised real upward-climb budgets. Fixed. Final state, verified
    against all 71 rooms: matches area.js's original assessment of
    `crag_entrance` exactly (2 unreachable platforms, 1 unreachable
    anchor, 1 unreachable door), all 70 other rooms clean — see
    `game/roomVerify.js`'s own header for the full writeup.
    `area.js`'s auto-run now delegates to `RoomVerify.verifyAllRooms(AREAS)`
    instead of duplicating the logic. Since `roomVerify.js` was previously
    loaded *only* by `editor/room_verify.html`, added
    `<script src=".../game/roomVerify.js">` alongside every existing
    `area.js` tag (`index.html` + 9 editor tools) so the auto-run keeps
    working everywhere it used to; `debug_v1.html`/`debug_v2.html`/
    `debug_new.html` inherit it automatically (they clone `index.html`'s
    script tags via a generic regex, not a hardcoded list).
    `editor/levelEditor.html`'s "Check All Rooms"/"Validate This Room" and
    `editor/dev_hub.html`'s "Run All Validations" both called
    `validateRoomLayout()` as a bare global — updated both to call
    `RoomVerify.verifyRoom()` directly (the old `{failures: [string]}`
    shape is now `{issues: [{type,severity,x,y,detail}]}`; levelEditor's
    canvas failure-markers now use the issue's real `x`/`y` fields instead
    of regex-scraping them back out of a formatted message string).
    `Plans/rebuild_levels_from_svg.js`'s own internal validator also
    references the deleted `validateAllRoomLayouts()` — left as-is
    deliberately: that script is frozen, one-off tooling this project's
    own convention says not to re-run once hand level-design starts (see
    `CLAUDE.md`), so a stale reference inside it costs nothing.
    **Along the way, found and fixed a real, separate regression**: three
    Node CLI tools (`Plans/room_verify_cli.js`, `Plans/room_progress.js`,
    `editor/export_graph.js`) were silently broken — each runs `area.js`
    in a `vm` sandbox that never defined `readOverrideJSON`, so every one
    of them crashed with `ReferenceError` the moment `applyAreaOverrides()`
    ran at `area.js`'s top level. This dates back to the `overrideStore.js`
    consolidation earlier in this same session's duplication pass, not to
    today's linter merge — just never noticed until this work needed those
    tools working. Fixed by stubbing `readOverrideJSON` in each sandbox
    (returns `null`, meaning "no saved override" — correct for a Node tool
    that has no `localStorage` and wants the real committed `AREAS` data
    anyway), same convention already used there for `window`/`console`.
    **Separately flagged, not fixed (per your call — this is content/level-
    design work, not engineering)**: `crag_entrance`'s real bug above is
    still live in the room today. The top-left area (anchor at (130,270),
    the door back to `the_fracture_part1` at (10,210), and a cosmetic
    upgrade pickup at (650,270)) sits behind a gap from y≈300 to y≈1510
    (up to ~1200px vertical, depending on x) with nothing in the room's
    `platforms[]` bridging it — no stairs, no moving platform, and the
    room's one `wall:true` platform is a 10×4px sliver nowhere near load-
    bearing. Both real entries into the room (from `the_fracture_part1` at
    (60,1150) and `crag_breach` at (1240,720)) land well below this gap.
    Needs a design call: move the door/anchor/pickup down into the already-
    reachable mid-tier, or add real connecting platforms up from it.

**Structural issues (not duplication):**
- `game_update.js`'s `update()` is 2,147 of the file's 2,162 lines — the
  entire per-frame game loop in one function. Biggest structural risk in
  the codebase (it's the hot path). **Concrete split shape, verified
  against the real control flow (2026-08-02)**: the function is already a
  sequence of early-return `if (gameState === X) { ...; return; }` blocks
  for every non-gameplay state — `reviving` (line 36, and again 440),
  `menu` (92), `gameover` (271), `paused`/`paused_controls`/
  `paused_settings` (283/321/352), `inventory` (385), `cutscene` (448),
  `victory` (455) — followed by ~1500 lines of unguarded fallthrough that
  only actually runs when none of those matched, i.e. the real `'playing'`
  tick (FX timers, hitstop/slow-mo frame skipping, ability physics,
  door-cooldown, enemy/boss/camera updates). That shape means each
  branch can become its own `updateMenu()`/`updatePaused()`/
  `updateInventory()`/`updateCutscene()`/`updateVictory()`/`updateReviving()`
  function with no logic changes, called from a thin `switch (gameState)`
  dispatcher, and the fallthrough tail becomes `updatePlaying()` — the one
  genuinely large piece left, but now isolated and independently testable
  instead of interleaved with 7 other states' logic in one 2,162-line body.
  Mechanical, not a redesign — same category of risk as the `game.js`
  6-way split already done 2026-07-27 (see the game.js bullet above), just
  not yet attempted for this file. Not started; flagging the concrete shape
  so a future session doesn't have to re-derive it before starting.
- `boss.js`'s `Boss` class (~1,400 lines) doesn't reuse `enemy.js`'s
  `ComposedEnemy` framework — reimplements damage/movement/hitbox/
  telegraph logic from scratch instead of extending the data-driven
  system ~25 other enemy types already share.
- ~~`Boss.takeDamage` (`boss.js:444`) has no flash/invincibility/hitstun
  at all~~ — **partially fixed 2026-08-03, rest deliberately left alone.**
  The hit-flash half was a real, safe gap: added `this.flashTimer = 0` (ctor),
  set to 8 on a real (non-shield-blocked) hit in `takeDamage()`, ticked down
  unconditionally at the top of `update()` (even through the stun-gate, so a
  hit landing right before a parry-stun doesn't leave it stuck on), and
  applied as a white tint in `draw()`'s fallback (non-`ANIM_DEFS`) body-color
  branch — same convention `enemy.js`'s `flashTimer` family already uses
  (only the fallback draw path gets the tint; when an authored `ANIM_DEFS`
  key exists and `animator.draw()` runs instead, flash isn't visually
  applied there either, matching the same not-yet-built gap other enemies
  already have). **Invincibility/hitstun was deliberately not added** —
  unlike the flash, that's a real combat-balance change: the boss has active
  states (`lunging`, dash chains, `beam_channel`, phase transitions) a
  post-hit stun could interrupt mid-animation, which most final-boss designs
  in this genre intentionally avoid (an "unflinching until staggered"
  boss is a legitimate, common choice, and `ColossusCore`'s own analogous
  hit only nudges `attackCooldown` by a minimum, not a hard state-halting
  stun). This genuinely reads as intentional rather than an oversight, but
  it's a design call for you to make, not one this pass should guess at —
  flagging with the flash fix already in, not implementing
  invincibility/hitstun without a decision.
  **Resolved 2026-08-05**: asked directly, user chose flash-only i-frames
  (no interrupt) over real hitstun-in-safe-states or a full stagger.
  `takeDamage()` now also gates on `this.flashTimer > 0` — the existing
  8-frame hit-flash timer doubles as the immunity window, no new field.
  Stops back-to-back *separate* hits (fast combo's next swing, a projectile
  landing right after a melee hit) from all registering within the same
  beat; does not touch single-swing multi-hit (already solved by
  `player.hitTargetsThisSwing`) and does not interrupt any active state —
  exactly the scope asked for. See `Plans/roadmap.md`'s matching entry.
- ~~`game/game.js` (5,967 lines) is confirmed dead code~~ — **resolved**:
  it's now `game/archive/game.js` (`git status` shows a staged rename,
  `game/game.js` → `game/archive/game.js`, done outside any tracked
  session in this doc). Was dead code — not `<script>`'d by any HTML file,
  superseded by the 2026-07-27 split into `game_state.js`/
  `game_entities.js`/`game_boot_save.js`/`game_update.js`/
  `game_hud_menus.js`/`game_draw_loop.js` (every top-level function name
  in `game.js` also exists in the split files) — moved to `archive/` rather
  than deleted outright, which still solves the original risk (grepping
  `game/*.js` for `function update`/`switchArea` no longer finds a
  near-identical dead copy to accidentally patch instead of the live one).
  One stale reference remains: `game/agentController.js:14`'s comment
  still says "game/game.js's 'Main loop' section" — harmless (a comment,
  not a load path) but worth a one-line fix (`game/archive/game.js`) next
  time that file is touched.
- The `Construct` ability is fully plumbed (keybind, cooldown const,
  `ABILITY_GRANTS` entry, save/load) but has **no actual behavior** — see
  `CLAUDE.md`'s own "New-ability checklist" cautionary note, this was
  already known/logged, not a new finding.
- Several files under `game/` are editor-tool-only, never loaded by
  `index.html` (`agentController.js`, `roomVerify.js`,
  `roomDesignScore.js`, `devContext.js`, `unsavedGuard.js`,
  `minibossRegistry.js`, `roomImageStore.js`). Not necessarily wrong
  (`game/` may be intended as "shared code," not strictly "shipped code")
  but worth confirming that's the intended convention.
- ~~No image ever reaches `assets/`~~ — **stale claim, checked
  2026-08-03: already built.** `editor/save-server.js`'s `/save-art-image`
  route (added 2026-08-03, own header comment explains the shape) writes a
  real PNG under `assets/art/anim/` or `assets/art/rooms/` (timestamped
  `.bak` on overwrite), and both `anim_editor.html` and
  `room_scene_editor.js` already call it to promote a working-draft image
  (an inline `data:` URL or an `AnimImageStore`/`RoomImageStore` IndexedDB
  id) to a checked-in file — the small local-Node-write-endpoint option
  this item used to list as one tradeoff among three is the one that got
  built. Requires running via `node editor/save-server.js` (won't work
  opened via `file://`), same caveat as the other save-server routes.
- **`gameState`'s hand-rolled FSM has non-atomic transitions, patched by
  comments rather than structure.** Two confirmed real instances, both
  already correctly fixed today (not live bugs, an architectural risk
  going forward): the door-cooldown debounce (`game_state.js:107-120`,
  `DOOR_COOLDOWN_FRAMES` — re-entering a room via a door can re-trigger the
  destination's own return-door on the very next tick, ping-ponging
  forever without it) and the inventory-key double-read guard
  (`game_update.js:77-88`, an explicit early `return` so a single keypress
  isn't read twice by two different `gameState === ...` branches in the
  same frame). Every new state/branch added to `update()` risks
  reintroducing this exact bug class since nothing enforces atomicity
  structurally. A `{from, to, guard}` transition table would make that a
  property of the table instead of something re-discovered per feature —
  a real improvement, but a rearchitecture of the game's central state
  machine, not a bug fix; needs sign-off before starting, same as the
  module-system item below.
- **No module system — the `<script>` tag order in `index.html:101-128`
  (26 tags) *is* the dependency graph.** `game_state.js` alone declares
  103 top-level `let`/`const` bindings (`player`, `gameState`, `boss`,
  `areaEnemies`, `camera`, ...), mutated directly from 8-10 other files;
  `overrideStore.js` must load before any file that calls
  `readOverrideJSON()` at parse time, `animdata.js` must precede
  `area.js`, etc. Reordering a tag is a silent `ReferenceError` at load,
  not a build error, and no file can be unit-tested in isolation. Already
  implicitly flagged in `CLAUDE.md`'s Architecture map ("actually
  modularizing state behind real module boundaries would be a much bigger
  refactor than [the 2026-07-27 game.js] split was — flag that before
  attempting"). Since every file is already a plain non-module `<script>`,
  switching to `type="module"` + real `import`/`export` is additive rather
  than a rewrite — but this is a large, speculative refactor of working
  code, exactly what `CLAUDE.md`'s "ask before big refactors" rule
  and the project's stated infra-vs-content priority (`CLAUDE.md`'s
  "Where this project is right now" section) should gate. Not scoped for
  implementation — flagging only.
  **Mitigated, not resolved, 2026-08-05**: rather than the module-system
  refactor, two small additive tools now catch a bad `<script>` order
  without touching a single line of existing runtime behavior —
  `game/bootDependencyCheck.js` (a runtime canary check, last tag loaded,
  logs exactly what's missing instead of a cryptic mid-file
  `ReferenceError`) and `Plans/check_script_order.js` (a static AST-based
  linter, same family as `room_verify_cli.js`, checking `index.html` +
  every editor tool that hand-lists its own `game/*.js` subset — 22 HTML
  files audited, all clean). See `Plans/roadmap.md`'s matching entry for
  the full build writeup, including a real false-positive-flood finding
  mid-build (references inside ordinary function/method bodies aren't
  load-order-sensitive at all, since those only run after boot completes
  — only top-level statements and IIFEs are) that reshaped the linter's
  actual scope. This does not replace a real module system — it only
  catches bad ordering, not the other reasons one might eventually want
  modules (unit-testability, explicit typed exports). Still not scoped
  for implementation.

**On an external architecture review (2026-08-02):** a review pass
covering 8 claims was checked line-by-line against the live code before
anything from it was added above. Three held up and are now folded in
(the two new bullets above, plus duplication item 10 in the list above
this one); two were already tracked verbatim in this exact section before
the review ran (`update()`'s length, `Boss`/`ComposedEnemy` not sharing a
framework) and weren't re-added; one (the dead `game.js` monolith) turned
out to already be resolved (moved to `game/archive/`, see the corrected
bullet above) rather than still-pending. **One claim was checked and found
wrong**: that `area.js`'s room-layout linter validates against "stale"
physics constants when `physics.js`/`player.js` change. It doesn't —
`area.js`'s `_linterPhysics()` (`area.js:5374-5386`) reads
`GRAVITY`/`JUMP_FORCE`/`MOVE_SPEED`/etc. live via
`typeof X !== 'undefined' ? X : <fallback>`, and the fallback only matters
for standalone tools that load `area.js` without `player.js` — documented
inline, same tradeoff `roomVerify.js`'s own `PHYSICS_DEFAULTS` accepts.
Chasing down *why* that claim looked plausible is what surfaced the real
issue: `area.js` has its own complete second reachability linter that
nothing in this doc had caught before (duplication item 10, above) — a
bigger and more concrete finding than the claim that prompted the check. A
second claim ("nine independent hand-rolled override-merge
implementations") was stale rather than wrong: the shared JSON-read shell
it described as missing was already extracted this pass
(`readOverrideJSON()`, see "Fixed this session" above) — its own header
already says merge semantics stay per-caller on purpose. The real
remaining gap is narrower — no schema/validation step on top of that
shared read, so a renamed/reshaped field in one editor's saved override
blob silently produces `undefined` in whatever `applyXOverrides()` reads
it, with no error anywhere. Lower priority than the linter duplication; a
lightweight fix (a per-key expected-shape check inside each
`applyXOverrides()`, or one small shared validator) rather than a
rearchitecture — **fixed 2026-08-03**: `readOverrideJSON(key, validateShape)`
now takes an optional `(parsed) => boolean` shape check (`overrideStore.js`'s
new `OverrideShape.object`/`OverrideShape.array` cover the two shapes every
caller actually expects); a failing check logs a `console.warn` naming the
key and falls back to `null` (built-in defaults) instead of letting the
malformed shape flow into the caller's merge. Wired into all 11 call sites.
Still only a top-level shape check (object vs. array), not per-field
validation — a renamed nested field inside a validly-shaped object still
silently reads as `undefined` downstream; flagging that narrower remainder
rather than treating this as fully closed.

**Second round of the same external review (2026-08-02), 4 more claims —
checked before any were acted on, per the user's ask "have these been
fixed, if not can we fix them":**
- **"Inconsistent module convention (12 IIFE files vs. ~20 bare, including
  `area.js`/`combo.js`/`game_entities.js`)"** — the specific file list is
  wrong: `area.js`, `combo.js`, and `game_entities.js` are bare top-level
  code, not IIFE-wrapped (verified — `grep -E "^\(function\("` across all
  34 `game/*.js` files finds exactly 7: `agentController.js`,
  `animImageStore.js`, `devContext.js`, `roomImageStore.js`,
  `roomVerify.js`, `undoHistory.js`, `unsavedGuard.js`; `roomVerify.js`'s
  is a UMD-style dual export, the other 6 are `(function(){ ... window.X =
  {...}; })()`). There's a third pattern too: `minibossRegistry.js` and
  `floorPlanWalkEngine.js` use bare top-level `const`/`function` plus a
  `module.exports` tail for Node reuse, no IIFE at all. So it's really
  ~26 bare / 6 IIFE-namespace-object / 2 bare-with-Node-tail / 1
  IIFE+UMD, not the claimed 12/20 split. The underlying complaint has a
  kernel of truth (no file anywhere states the rule), but the actual
  pattern isn't random: every IIFE file is a self-contained utility with
  no need for other files to reach into its internals directly
  (`undoHistory.js`/`unsavedGuard.js`/`animImageStore.js`/
  `roomImageStore.js`/`devContext.js`/`agentController.js`), while every
  core gameplay file (`game_state.js`, `game_update.js`, `player.js`,
  `enemy.js`, `boss.js`, `area.js`, `combo.js`, `game_entities.js`, ...)
  stays bare specifically *because* dozens of other files need direct
  read/write access to its top-level `let`s (`player`, `gameState`,
  `boss`, `AREAS`, ...) — wrapping those in an IIFE would require
  deliberately exposing every one of those as a getter/setter on a
  namespace object, i.e. it's the same scope as the "no module system"
  item already flagged above, not a separate smaller fix. **The prose
  write-up is now done (2026-08-03)** — `CLAUDE.md`'s Architecture map has
  a "Module convention: IIFE vs. bare top-level code" subsection naming the
  three real patterns and the test for which one a new file should use.
  Actually converting existing files between patterns is still not
  attempted, on purpose, without deciding on the module-system question
  first.
- **"Editors read runtime internals directly (`AREAS` etc., no stable
  interface)"** — true (verified: `debug_v1.html`, `debug_v2.html`,
  `dev_hub.html`, `graph_analyzer.html`, `room_scene_editor.js`,
  `levelEditor.html`, `export_graph.js`, `cutscene_editor.js` all index
  `AREAS[...]` directly), but this is a **deliberate, already-made
  decision, not a gap** — `CLAUDE.md`'s own `levelEditor.html` entry
  says it was *corrected* 2026-07-12 specifically to load `area.js`
  directly and edit the real `AREAS` object, replacing an earlier design
  with "separate hardcoded preset copies" that drifted from the real
  data. Building a stable interface layer back in would reintroduce
  exactly the drift risk that correction removed. Not something to fix —
  flagging that the framing is backwards, not adding a task.
- **"Two competing persistence layers (highest impact)"** — the
  underlying fact is real (`game_boot_save.js:218-241` does its own raw
  `localStorage.getItem`/`setItem` for settings, plus a separate
  `getSaveKey`/`getBackupKey` scheme for save slots — verified, neither
  goes through `readOverrideJSON()`), but **"competing" is the wrong
  word and merging them would be a real regression risk**, not a fix:
  `overrideStore.js` persists dev-tool-authored override blobs (private,
  best-effort, explicitly designed to degrade to "no persistence" on any
  failure — see `CLAUDE.md`'s Save data section); `game_boot_save.js`
  persists the player's actual save-game progress, which is why it has a
  `getBackupKey()` redundancy scheme `readOverrideJSON()` has no
  equivalent of (a corrupted save falls back to its backup; a corrupted
  override blob just silently returns `null` and the game uses built-in
  defaults). Routing save-slot reads through the override store's
  fail-to-null semantics would mean a corrupted save could silently
  vanish instead of falling back to its backup — worse, not better. The
  one real, low-risk, actually-available cleanup: `loadSettings()`
  (`game_boot_save.js:216-231`) has the same
  `getItem→JSON.parse→try/catch` shape `readOverrideJSON()` already
  extracts, just with the parsed fields applied inline instead of
  returned — could call `readOverrideJSON(SETTINGS_KEY)` for the "get me
  the parsed blob or null" half and keep its own field-by-field
  default-application logic, saving ~4 lines with zero behavior change —
  **done, 2026-08-02** (`game_boot_save.js`'s `loadSettings()`); the
  save-slot code (`getSaveKey`/`getBackupKey`) was left untouched on
  purpose, per the reasoning above.
- **"Load order is silently load-bearing"** — real (confirmed:
  `overrideStore.js:10-11`'s comment, and 15 other `game/*.js` files read
  `AREAS` as a bare global with no declared dependency), but this is the
  same fact as the "No module system" bullet already added above in this
  same list — not a new, separate issue, just another angle on it.

None of these four turned out to be "bugs to fix" in the sense the
question asked — one is factually wrong in its specifics, two describe
already-deliberate design decisions where the proposed fix would be a
regression (re-adding drift risk / weakening save-corruption recovery),
and one restates an item already on this list. The only concrete, safe,
zero-risk action available from this batch is documenting the
IIFE-vs-bare convention in prose (not a code change) and, optionally, the
~4-line `loadSettings()` dedup — everything else in this batch is the same
"ask before big refactors" module-system question already flagged, not
four new independent fixes.

## 8. Editor suite gaps found 2026-08-03 (persistence, testing, integration)

Found while reviewing `Plans/plotline_editor_plan.md` — these are broader
than that one plan (they apply to the editor suite as a whole) so they live
here instead, per this doc's own scope note.

- **Persistence is inconsistent across the whole suite, and this is
  under-documented.** Checked `editor/save-server.js` directly rather than
  trusting CLAUDE.md's summary: it has exactly two live disk-write routes
  (`/save-hud-layout`, `/save-inventory-layout`, both patching an existing
  `const X = {...}` block) plus `/save-art-image` (binary PNG write, well
  input-validated — category allowlist, filename regex, PNG-data-URL check,
  no path-traversal issue found). Every other content-editing tool —
  `levelEditor.html`, `room_scene_editor.html`, `cutscene_editor.html`,
  `combo_editor.html`, `anim_editor.html` — uses the manual copy-paste
  "Export JSON to textarea" flow, not a live save route. This means "save
  straight to source" reads as the general pattern in CLAUDE.md's dev-tool
  section but is actually two tools out of ~13. Worth either (a) extending
  live-save to the rest, since `editor/exportPanel.js` already shows the
  shared-shell pattern that made HUD/inventory's version practical, or (b)
  at minimum correcting the doc language so a future session doesn't assume
  a route exists that doesn't. `Plans/plotline_editor_plan.md`'s four new
  routes ran into this directly — see its own "save-server.js has no code
  path for creating a new file" gap.
  **Stale as of 2026-08-05, re-checked against the live code.** This bullet
  describes `save-server.js`'s reality as of 2026-08-03 — accurate then,
  but `editor_shell/targets.js` (the Electron shell's AST patch engine,
  Milestone 2, built 2026-08-04, i.e. *after* this was written) added live
  disk-write targets for `AREAS`, `ANIM_DEFS`, `BOSS_PHASE_CONFIG` + all 12
  miniboss phase defs, `TemporalWarden`'s stat consts, `REGION_STYLES`,
  `CUTSCENES`, and `COMBO_DEFS`, on top of the original HUD/inventory
  layouts. Verified live `stillpointAPI.patchPath`/`writeWhole` calls
  actually exist in each corresponding editor's JS — `anim_editor.html`,
  `boss_phase_editor.html`, `combo_editor.html`, `cutscene_editor.js`,
  `enemy_editor.html`, `hud_editor.html`, `inventory_editor.html`,
  `levelEditor.html`, `room_scene_editor.js` — every real content-authoring
  editor in the suite now has live disk-write when run via `npm start`.
  The manual "Export JSON to textarea" flow still present in several of
  these is the deliberate fallback for when the tool is opened in a plain
  browser tab with no `window.stillpointAPI` (`save-server.js`'s old HTTP
  path), not a sign live-save is missing. What's genuinely still unwired,
  by design, not oversight: `plotline_editor.html`'s 4 targets (`QUESTS`/
  `VISIONS`/`NPC_DIALOGUE`/`STORY_FLAG_META` — pre-content infra, per
  `CLAUDE.md`) and `enemy_designer.html` (no fixed registry to write into,
  by its own design). Don't resurface "persistence is inconsistent" as a
  suite-wide gap without checking `targets.js` first — the two remaining
  cases above are the only real ones left.
- **`save-server.js`'s patch logic has no automated test.** `patchLayoutBlock()`
  is a regex-based line patcher (`KEY_LINE_RE`) — exactly the class of code
  that silently corrupts a file on an input shape nobody tested (a value
  containing an unescaped newline, a key whose serialized form spans past
  one line, a decl block with nested braces at the same indent depth as a
  top-level key). It's currently verified only by hand (save, then diff).
  A small Node smoke test (feed it a few known-tricky layout shapes,
  assert the patched output round-trips) would catch a regression before
  it corrupts `game_hud_menus.js`/`game/inventory_ui.js` for real, not
  after.
- **No CI or pre-commit hook runs any of the existing validators.**
  `validateAreaGraph()` (on `index.html` load), `roomVerify.js` (via
  `room_verify.html`/`Plans/room_verify_cli.js`), and `debug_v1.html`'s
  R01–R11 all exist and are genuinely useful, but every one of them is
  "run manually when you remember to." Given how much linting
  infrastructure already exists in this repo, the gap isn't "we need more
  linters," it's "nothing forces the ones we have to actually run." A
  `package.json` script wiring `node Plans/room_verify_cli.js` (already a
  standalone Node CLI, zero new code needed) into a git pre-commit hook
  would close this cheaply for the one check that's already fully
  headless; `debug_v1.html`'s browser-dependent checks can't be CI'd
  without a headless-browser runner, which is a bigger ask and not
  proposed here.
  **One more headless CLI added to this same list, 2026-08-05**:
  `Plans/check_script_order.js` (script load-order linter — see the "No
  module system" bullet above and `Plans/roadmap.md`'s build entry). Exit
  code `0`/`1` like `room_verify_cli.js`, so it's wireable into the same
  future pre-commit hook this bullet already recommends — **the hook
  itself was deliberately not wired as part of that build**, per this
  repo's git safety rules (not touching `.git/hooks` without being asked
  directly). The underlying gap this bullet describes is unchanged: still
  nothing forces any of these validators to run.
- **`dev_hub.html` has no entry point for `plotline_editor.html`.**
  Confirmed by grep — zero references to "plotline" anywhere in
  `editor/dev_hub.html` today. When the plotline editor is actually built,
  it needs a `dev_hub.html` sidebar entry (per its existing
  Level Design/Combat & Enemies/Systems/QA grouping — this tool doesn't
  cleanly fit any of the four, which is itself worth a decision: new
  "Narrative" group, or folded into "Systems") and arguably a new metric
  in the Project Progress dashboard (quest/dialogue/vision authored-vs-
  planned counts, alongside its existing room-design-score and
  enemy/miniboss-roster counts from `game/minibossRegistry.js`) — the
  dashboard's whole premise is "derived, not hand-tracked" state, and a
  narrative system with zero visibility there would be the one content
  category the dashboard doesn't cover.
- **No accessibility pass on any editor tool** (keyboard-only operation,
  focus order, screen-reader labeling). Low priority — these are internal
  single-developer tools, not player-facing — but worth a one-line
  acknowledgment rather than silence, since it's a real gap if the
  toolchain is ever handed to a second person.
