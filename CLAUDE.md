# CLAUDE.md — Stillpoint

Context file for Claude (or Claude Code) working in this repo. Read this
before making changes — it points to the fuller docs and encodes decisions
that aren't obvious from the code alone.

This file favors compact facts and pointers over narrative history — full
build history for anything below lives in `Plans/roadmap.md` (the single
source of truth for "what's actually built"), not here. If this file and
`Plans/roadmap.md` ever disagree about what's built, trust `roadmap.md`.

## ⛔ HARD RULE — NEVER test in a browser yourself

**Do not open a browser, start a preview server, or use any browser/preview
tool (Claude_Browser, javascript_tool, computer, etc.) on this repo, for any
reason, including "just verifying my own change" or "just checking for
errors."** Make the code change, describe exactly what to test and how
(specific page, specific steps, specific expected result), and stop there.
The user tests it themselves.

This is a repeat instruction (first given 2026-07-14, restated 2026-07-15
after it was violated mid-session) — it overrides this assistant's own
general "verify UI changes in a browser" default completely for this repo.
If a task seems to require browser verification to be confident in it, that
confidence gap is expected and fine to leave with the user, not a reason to
open the browser anyway.

## What this is

**Stillpoint** — a 2D Metroidvania action-platformer. Vanilla HTML5
Canvas + JavaScript, no build step, no frameworks, no bundler. Runs by
opening `index.html` directly or serving the folder statically:

```
python3 -m http.server 8000
# http://localhost:8000/index.html
```

This still fully applies to the game itself. The repo's first
`package.json`/`node_modules` (added 2026-08-04) exist only for the
**editor tooling's** Electron shell (`editor_shell/`, `npm start` —
see `Plans/unified_editor_ide_plan.md`) — the game has no npm dependency
and no build step, and none is planned.

Visual style: minimalist vector art, dark background, violet/teal/deep-blue
palette. Tonal references: Hollow Knight, Celeste, Hyper Light Drifter.
Core mechanic: **Stillpoint**, a time-slow ability tied to a "Fracture"
resource, layered on tight platformer movement (dash, wall jump, phase
dash) and directional melee combat.

## Basic plot / mandatory story sequence

Not all of this is built yet as in-game text (see `Plans/story.md`/
`Plans/lore.md` for the full narrative doc) — this is the mandatory
backbone `Plans/floor_plan.md`'s graph encodes:

1. Player reaches **Echo Bridge** and **meets the Child** (mandatory,
   +1 max health).
2. Meeting the Child triggers an **arrest** — the player is taken to
   **Echo Bridge, Prison**.
3. Escaping the prison drops the player at **Timeline X Roads, Room 2**,
   where they make the **Child choice**: keep the Child (permanent, no
   Void Tether) or give the Child up (grants **Void Tether**, more routes
   open up, but permanent the other way too — see this file's
   "irreversible, consent-gated choices" throughline below). Either branch
   sets the `child_choice_resolved` flag.
4. Until that choice is resolved, **Timeline X Roads Room 1** and
   **Mirror Corridor** are both locked — and since **Crystal Cavern** (the
   Shard Shot pickup) has no other route in during this window either, the
   player can't reach any of the three until the choice is made.
   Intentional pacing, not a softlock: only **Phase Dash** and
   **Stillpoint** are mandatory abilities, so gating Shard Shot here costs
   nothing.

## Read these first (in this order)

1. **`Plans/performanceInstructions.md`** — standing engineering rules for
   every session (performance discipline, file organization, keep debug
   tools working, update the plan doc, ask before big refactors). Binding.
2. **`Plans/roadmap.md`** — the actual dev-status changelog: what's done,
   partial, or not started, and why. **The single most important doc for
   "what state is the code actually in."** Update it whenever you finish
   work (checkboxes + a short prose note, same style as existing entries).
3. **`Plans/expansion.md`** — forward-looking design (new abilities, 26+2
   enemy roster, 13 regions, 8 minibosses, post-game). Aspirational, not
   built — cross-check against `Plans/roadmap.md`/`area.js` before assuming
   something here exists in code.
4. **`Plans/BUG_ANALYSIS_AND_QA_PLAN.md`** — known bug inventory
   (severity-rated, file/line refs) + manual playtest protocol. Check here
   before assuming a weird behavior is new. Its own staleness note: BUG-001,
   002, 003, 012, and 013 re-verified fixed as of 2026-08-03; BUG-004
   through BUG-011 not re-checked since 2026-07-11.
5. **`Plans/engineering_todo.md`** — the live, consolidated engineering
   punch list (pure tooling/architecture work, excludes creative/content
   decisions). Added 2026-08-01; supersedes older scattered TODOs in
   `Plans/production_workflow_and_tool_gaps.md`/`Plans/archive/dev_tools_roadmap_status.md`
   for "what's left to build" — the former is kept as historical detail
   (unique done-work narrative not duplicated elsewhere), the latter fully
   archived 2026-08-03 (its open items were 100% redundant with this doc).

Other design docs, read as needed for their specific topic:
- `Plans/story.md` — narrative/companion-character system design doc (not a
  status doc — companion itself is built, see `Plans/archive/child_companion_system_plan.md`;
  endings/Fracture Pip economy still unbuilt). Newest planned ability,
  **Void Tether** (§4), is built.
- `Plans/lore.md` — narrative source of truth for characterization
  (Sovereign, minibosses) — not yet surfaced in-game (`LORE_ENABLED =
  false`). King→Sovereign fully renamed in code 2026-08-02 (was docs-only
  before). `game/archive/game.js` (dead code, unloaded) still says "King" —
  intentionally untouched. "The Mirror King" (`hollow_guardian` miniboss)
  is an unrelated, deliberately-named character.
- `Plans/boss_art_reference.md` — visual design reference for every boss/
  miniboss (appearance, movement, attack-animation beats). Pure art/
  creative reference, not a status doc — spot-checked accurate against
  `boss.js`'s phase colors.
- `Plans/plotline_editor_plan.md` — design plan for the narrative-tooling
  suite (Story Flag Graph, Visions, Quests, NPC Dialogue). Tooling built
  2026-08-03: `editor/plotline_editor.html` + four data files
  (`game/quests.js`, `game/npcDialogue.js`, `game/visions.js`,
  `game/storyFlagMeta.js`) + `game/plotlineVerify.js` (static flag-graph
  auditor). **None of the four data files are wired into `index.html`
  yet** — runtime is unchanged; see the Architecture map below and the
  plan's own §5 for the still-open content/wiring phase.
- `Plans/movement_feel_plan.md` — proposal, not started: push movement
  toward a faster/more fluid feel (dash-refill-on-landing as the priority
  lever). Raising base speed constants requires a full
  `validateAllRoomLayouts()` re-run — read before touching
  `MOVE_SPEED`/`DASH_SPEED`/dash-cooldown.
- `Plans/human_proportions_plan.md` — proposal, not started: open-questions
  discussion doc on giving the player human-scale proportions instead of
  the current abstract 24×32 rectangle. Nothing here is scoped for
  implementation yet.
- `Plans/fight_ambience_plan.md` — proposal, not started: per-fight room
  tinting + optional ambient particles while a boss/miniboss is alive,
  authored via `room_scene_editor.html`. Distinct from `REGION_STYLES`
  (whole-region, combat-state-agnostic) and `area.bgTint` (static per-room,
  currently unexposed in any editor). Has open questions (phase-tied
  variation, accessibility toggle) to answer before implementing.
- `Plans/unified_editor_ide_plan.md` — **Milestones 1-3 built 2026-08-04**.
  `npm start` opens the whole 27-tool `editor/`
  suite as one Electron window (`editor_shell/`) instead of a browser tab
  + `save-server.js` process per tool — user-verified against the real
  debug harnesses (`debug_v1.html`/`debug_v2.html` both pass unchanged
  inside the packaged app). The "per-file save-format" problem the doc
  originally flagged as unsolved (patching `AREAS`/`CUTSCENES` without
  mangling hand-written comments) got solved via a real AST patch engine
  (`editor_shell/constPatcher.js`, `recast`+`@babel/parser`, 5 patch
  modes) — 9 save targets across 8 editors write straight to their real
  `game/*.js` source file now, comments intact, every write verified
  against the actual repo files (not just copies). `save-server.js`'s old
  HTTP path is untouched and still works as a fallback in a plain
  browser tab — this was never a hard cutover. See the doc's own
  "Milestone 2 status" table for exactly which targets are wired vs. the
  couple still deliberately unwired (`QUESTS`/`VISIONS`/`NPC_DIALOGUE`/
  `STORY_FLAG_META` — pre-content infra; `enemy_designer.html` — no fixed
  registry to write into, by its own design). The game (`index.html`) and
  this editor shell remain a deliberately separate decision — the game is
  planned to get its own, separate Electron wrap later for a Steam
  release (Steamworks tooling is the deciding factor there, not dev
  convenience); see the plan doc for detail. Milestone 3 (real tabs
  replacing the single window-navigates-in-place model, `DevContext` now
  a real main-process-owned shared state object persisted to disk and
  pushed live to every open tab instead of `localStorage` polling, a
  proper tab-aware app menu) is built — `editor_shell/tabManager.js`,
  `editor_shell/shell.html`/`shell-preload.js`,
  `editor_shell/devContextStore.js`. Verified via `node --check` and
  cross-checking every Electron API used against the installed
  `electron@43.2.0` type definitions, **not yet exercised through the
  actual app UI** — per this repo's standing no-browser-testing rule,
  that's on the user; see the plan doc's "Manual test checklist" for
  exact steps, including re-running `debug_v1.html`/`debug_v2.html`
  inside a tab. Multi-panel/split-view layouts were deliberately left out
  of this round as a separate, larger follow-up, not started.
- `Plans/cave_design_plan.md` — cave-floor/no-fall-death aesthetic
  philosophy. Superseded for region-specific look by the `REGION_STYLES`/
  `decorateRoomForRegion()` decoration system; still the right reference
  for general cave-floor logic.
- `Plans/room_verification_tool_plan.md` — reachability/safety linter for
  rooms. **Built**: static linter (`game/roomVerify.js`, runnable via
  `editor/room_verify.html` or `node Plans/room_verify_cli.js` — clean
  across all 71 rooms) and the dev Spawn button
  (`applyDevSpawnOverride()`/`?spawnRoom=<id>`). **Not built**: the
  headless bot-walker (dynamic simulation half) — `debug_v1.html`'s
  R09–R11 checks are the only current down-payment on that piece.
- `Plans/floor_plan.md` — the full-game room-to-room connection graph
  (mermaid flowchart): topology, fast-travel nodes, ability gates, pip/
  upgrade placement per room. Read alongside `Plans/regions.md` (mechanical
  effect, miniboss assignment, cluster position) — the two complement each
  other. "Sovereign Room" post-game nodes have no room-by-room design yet —
  don't build against them without a fuller pass first.
- `Plans/regions.md` — the single reference for world layout: which of the
  13 `expansion.md` regions exist (built or planned), cluster/col/row, room
  counts, miniboss, special effect. Use alongside `export_graph.js`'s yEd
  GraphML export (spatial map planning) and `levelEditor.html` (room
  detail).
- `Plans/enemy_system_plan.md` — the underlying composable-module
  architecture (`ComposedEnemy`, `ATTACK_BEHAVIORS`/`COUNTER_EFFECTS`) that
  `enemy_attack_vocabulary_plan.md`'s attack verbs are built on top of. Its
  "Phase A" scope is built and load-bearing (current, not stale); treat the
  doc's "Phase B" section as backlog/wishlist, not active planning.
- `Plans/enemy_attack_vocabulary_plan.md` — new enemy attack verbs
  (Reversal, Aggro-Pull, The Catch, Tiger Knee, Afterimage Strike, Mote
  Eater). Mostly built in `enemy.js`/`ability.js` — read its own tail for
  exact remaining scope (Reversal's Sword-Clash interrupt-punish check)
  before assuming anything in it is still just a plan.
- `Plans/room_progress.js` — read-only Node CLI (not a doc) classifying
  every room as SHELL/started/designed. Run `node Plans/room_progress.js
  --full`/`--todo` for the live per-room state instead of trusting any
  doc's static "N of 13 regions" claim.
- `Plans/rebuild_levels_from_svg.js` — the one-off Node script that bulk-
  generated `area.js`'s room scaffolding from an SVG floor-plan export.
  **Do not re-run this once hand level-design starts** — it overwrites
  `area.js` wholesale.
- `Plans/room_design_bible.md` — the reference to have open while
  hand-designing any of the 71 rooms: one section per region with a live,
  code-derived room table plus mechanic/miniboss/hazard notes. Ground-truth
  tables go stale the moment `area.js` changes — regenerate per its own §0
  instructions rather than trusting a stale number in it.
- `Plans/editor_design_style_guide.md` — the design-system recipe for
  `editor/` tools (companion to `Plans/archive/editor_redesign.md`'s
  original brief, archived 2026-08-03 — read the style guide, not the
  brief, before touching editor files). Read before touching any
  `editor/*.html` file — 25 of 26 tools already use
  `styles/design-system.css`; keep new/edited tools consistent with it.
- `Plans/archive/session_priorities.md` — an old (2026-07-12) session task docket,
  mostly consumed (5 of 8 items done). Genuinely still open: #3 (bot-walker,
  same gap as `room_verification_tool_plan.md` above) and #6 (a formal
  perf-profiling + feel-tuning pass — hitstop/screenshake exist, but the
  systematic version described here hasn't happened). #7 (audio rework) is
  functionally superseded — the game now has real recorded region music +
  sample-based SFX (see `assets/audio/`), not just procedural drones as
  originally scoped, so treat it as done-differently rather than open.
- `Plans/archive/OVERVIEW.md` — archived 2026-08-03: an older "read this
  first" map+changelog doc, superseded by this file (auto-loaded,
  authoritative) and `roadmap.md` (the live changelog). Its changelog was
  frozen at 2026-07-21 and its file map had drifted stale (still described
  the pre-split single `game.js`); its one genuinely unique bit — the
  basic plot/mandatory-sequence summary — was folded into this file above
  before archiving.
- `Plans/archive/dev_tools_roadmap_status.md` — archived 2026-08-03: a
  2026-07-24 dev-tool critique snapshot. Its "still open" items were fully
  duplicated in `Plans/engineering_todo.md` §3; its "done" section is
  historical only.

## Where this project is right now (added 2026-07-24 — read before suggesting "build more tools" or "build more content")

**The user is intentionally in an infrastructure-building phase right now,
on purpose, while working a summer internship with limited free time.**
The plan is a dedicated content push (enemies + levels) once the internship
ends — building infra now so it's ready then, not because content is
blocked on it. Tooling is in good shape; content is thin — most planned
enemies aren't built, **none are placed in any room** (`node
Plans/room_progress.js --full` for the live count), and only a handful of
rooms are hand-designed despite all 71 existing as scaffolded shells.

**Implications for future sessions:**
- Don't push back on "let's build another tool" as premature just because
  infra outpaces content — that imbalance is the user's deliberate choice
  for this phase.
- Don't assume every session should default to more tooling either — if
  asked for a general "what next" recommendation (not a specific tool
  request), the honest answer is still "the content build-out is the real
  bottleneck." Give that answer when asked; don't volunteer it as pushback
  when the user has already chosen to build infrastructure.

## Explicit design decisions (do not relitigate without asking)

- **Irreversible, consent-gated choices are an intentional throughline**
  (named 2026-07-14). Recurring pattern: Void Tether (leaving the child at
  the entrance is permanent, `Plans/story.md` §4), the Hollow Core secret
  ending-path, the pacifist region. The throughline is *density and
  consistency* — applied to small traversal choices as much as big story
  beats, not reserved for one or two dramatic moments. New optional content
  should default to this pattern rather than a softer reversible version.
- **No charms/badge system.** Keep Stillpoint's own identity; borrow
  structural lessons from metroidvanias, not their mechanics wholesale.
- **No boxed HUD panels.** No persistent ability-icon bar. Prefer minimal
  in-world feedback (cooldown rings under the player's feet, glyphs, glow).
- **Browser/canvas is the platform.** No engine rewrite. Electron/Tauri
  wrap is the agreed path *later* if an offline/desktop build is wanted.
- **Lore is OFF** (`LORE_ENABLED = false` in `game_state.js`). The
  text-popup lore-fragment system is intentionally disabled pending a
  redesign as environmental storytelling. Don't delete the data/code paths,
  don't flip the flag without being asked.
- **No fall-death as the default difficulty lever.** New rooms use
  continuous cave floors; pits are reserved for rooms that deliberately
  want that hazard, via an explicit `pitDeathY` override, not an inferred
  one.
- **No lock-and-key gating.** A door should be blocked by something the
  player's *toolkit* can't yet do (Phase Dash, Shard Shot, wall jump), never
  by a collectible key with no other function — Hollow Knight's mantis-jump-
  gated ledges, not literal locked doors. **Known conflict, not resolved**:
  `Plans/expansion.md`'s Warp Gate Nexus (§3.11) is planned to open via 3
  Keystones — a literal key mechanic, not built yet. Revisit with the user
  before implementing as written.
- Explicitly out of scope project-wide: charms, a shop/geo economy as a
  main progression gate, procedural generation, multiplayer, lock-and-key
  item gating.

## File locations (2026-07-16 reorg)

Only `index.html` stays at the root:
- `game/` — the runtime scripts + `style.css` (unused, `index.html`'s CSS
  is inline). `game.js` split into 6 files 2026-07-27 (`game_state.js`,
  `game_entities.js`, `game_boot_save.js`, `game_update.js`,
  `game_hud_menus.js`, `game_draw_loop.js` — see Architecture map) —
  order-preserving split, same shared globals, not modularized.
- `editor/` — every dev/debug tool, standalone HTML. Each tool's own
  `<script src="...">` tags read `../game/foo.js`.
- `editor_shell/` — added 2026-08-04: the Electron main-process code that
  packages `editor/` as one desktop app (`main.js`, `preload.js`,
  `ipcHandlers.js`, `constPatcher.js`, `targets.js`). Not part of the
  game or the browser-served editor pages themselves — see
  `Plans/unified_editor_ide_plan.md` for what it does and why.
- `Plans/` — all planning docs.
- Root — `index.html`, `world_map.graphml` (export artifact), `Enemy_Design.pdf`,
  and this file (`CLAUDE.md` — moved here from `Plans/` on 2026-08-02 so
  Claude Code auto-loads it at session start; every `Plans/*.md` reference
  above/below is written as a full `Plans/foo.md` path accordingly).

`debug_v1.html` fetches `../index.html` and text-rewrites its `game/foo.js`
paths to `../game/foo.js` before injecting via `srcdoc` (a `srcdoc`
document resolves relative paths against the *host* file's location, not
the fetched content's original location).

## Architecture map

Plain `<script>` tags in `index.html` (`game/<name>.js` each), load order
matters (globals depend on earlier files):

```
game/audio.js       → SFX (Web Audio; recorded music/SFX samples where sourced,
                       procedural synthesis as fallback — see assets/audio/)
game/input.js       → keys{}/justPressed{} via e.code, remappable keyBindings
game/physics.js     → shared collision: resolveEntityCollision()/resolveEnemyPhysics()
                       + nudgeOutOfPlatforms() spawn safety. EVERY enemy physics tail
                       calls this — never write a new inline platform loop.
game/visualVariants.js → getVisualVariant(category, region, instanceOverride) resolver
                       for "same behavior, different look" content (hazard color,
                       per-enemy tint). Generic — reusable for future categories.
game/animdata.js    → ANIM_DEFS frame/hitbox timelines + Animator + POSE_RENDERERS.
                       Edited by editor/anim_editor.html. Game does NOT fully render
                       through it yet — migration is deliberate per-entity work.
                       Frames can carry an `events` array (spawnProjectile/
                       cameraShake/sfx), consumed by boss.js's anim-driven hitbox bridge.
game/area.js        → AREAS{} data + compass graph (col/row/connections) + validateAreaGraph()
game/map.js         → builds map overlay FROM area.js's compass graph (never hand-authored)
game/ability.js     → Phase Dash / Shard Shot / Graviton Surge / Void Tether / Echo / abilityState
game/cutscene.js    → CUTSCENES{} scripts + playCutscene() + storyFlags{} (saved).
                       gameState 'cutscene': input locked, hold-attack-to-skip; skipped
                       setFlag/call steps STILL execute (progression safety).
game/combo.js       → COMBO_DEFS chains + action-event tracker (rising-edge detection
                       off player flags — add new abilities in _detectActions(), one line)
game/healing.js     → vitality motes, maxHealthBonus/playerMaxHealth(), healing crystals.
                       Heal caps must use playerMaxHealth(), not MAX_HEALTH.
game/boss.js        → Boss (the Fractured Sovereign) — 3-phase state machine, data-driven
                       via BOSS_PHASE_CONFIG (tunable from editor/boss_phase_editor.html).
game/enemy.js       → all enemy classes + ComposedEnemy. Base-class AI: notice delay,
                       decision commit, facing-cone detection; opt-in defense verbs via
                       this.defense (block/dodge/breakout/dashPunish) + mix-ups.
game/companion.js   → the Child (companionState + Child class) — follow/hide/heal/
                       found-weapon fight-assist (COMPANION_WEAPONS). Never dies,
                       teleport failsafe only off-screen. Activates via cutscene.js's
                       Echo Bridge meeting choice.
game/attackVFX.js   → shared player VFX/hitbox math, extracted out of player.js/ability.js
                       so anim_editor.html and animdata.js's POSE_RENDERERS reuse identical
                       shapes/hitboxes. Self-contained (plain numbers/ctx only).
game/player.js      → Player class — movement, combat, all physics constants
```

`game.js`'s 6-file split, load order (must stay in sequence, right after `player.js`):
```
game/game_state.js     → canvas/DOM setup, top-level mutable game state (player,
                          currentAreaId, particles, boss, camera, DEBUG_MODE, etc.),
                          pause/menu-nav state, ABILITY_GRANTS, Fracture Pip economy,
                          Limit Break, Tutorial, camera functions
game/game_entities.js  → Projectile/Particle classes, damage helpers, particle/
                          collision/area-enemy management (spawnAreaEnemies,
                          switchArea, ...), platform/anchor/reward/lore-pip drawing,
                          region decoration (REGION_STYLES/decorateRoomForRegion)
game/game_boot_save.js → unstuckPlayer, init(), settings load/save, buildPauseMenu,
                          saveGame()/loadGame()/deleteSave(), startNewGame/respawnPlayer
game/game_update.js    → the main update() function (~2000 lines) — per-frame
                          state-machine tick, pitDeathY death check, boss/miniboss
                          defeat gating
game/game_hud_menus.js → HUD_LAYOUT data table + drawHUD() and friends, all
                          drawMainMenu/drawPlayMenu/drawSettingsScreen/...
game/game_draw_loop.js → the main draw() function (~800 lines), gameLoop(), and the
                          file's closing init(); requestAnimationFrame(gameLoop); bootstrap
```

Key global state lives across these 6 files but isn't modularized/encapsulated —
still one shared global namespace (`player`, `boss`, `miniboss`, `areaEnemies`,
`camera`, `gameState`, etc.), now physically split across files but readable/
writable from every other file the same as before. Enemy/boss classes read some
of these directly, so actually modularizing state behind real module boundaries
would be a much bigger refactor than the file split was — flag that before attempting it.

**New-ability checklist**: a grantable ability needs (1) an `abilityState.hasX`
flag + reset in BOTH reset paths + save/load, (2) one line in `game_state.js`'s
`ABILITY_GRANTS` (the pickup grant is generic — an unlisted ability is silently
ignored, which is how Void Tether/Graviton Surge were dead for a while), (3)
optionally one line in `combo.js`'s `_detectActions()` to be combo-able. **The
checklist covers the plumbing, not "is there a real feature behind the flag"**
— a fully-wired `abilityState.hasX` isn't proof the ability itself exists; check
for actual input-handling/update/draw code too (a past ability shipped full
plumbing with zero real behavior behind it).

### World / rooms (`area.js`)

- Every room is an entry in `AREAS{}` with `platforms`, `transitions`,
  `enemies`, `anchors` (checkpoints), optional `abilityReward`,
  `loreFragments`, `col`/`row`, and `connections[]` (the single source of
  truth for door topology — `map.js` generates its layout from this).
- `validateAreaGraph()` runs on load and console-errors on: doors not on
  the correct edge, missing targets, col/row adjacency mismatches, missing
  reverse connections for two-way doors. Keep new rooms passing this.
- Room-sizing philosophy: **few large, multi-tier rooms with internal
  branching**, not many small single-gimmick rooms. Reserve real doors for
  genuine region boundaries or pre-boss checkpoints.
- `pitDeathY` is an explicit per-room override in `game_update.js`'s death
  check — don't infer it from `groundY` (a past bug hardcoded a 600px kill
  plane that killed players in tall rooms with real floors below y:600).

### Combat / physics constants

Almost all tunable numbers (jump force, dash speed, attack windows,
cooldowns, i-frames) are named `const`s at the top of `player.js`,
`enemy.js`, `boss.js`, `ability.js`. Change values there, not inline.

### Module convention: IIFE vs. bare top-level code

No build step means no real module system (see the "No module system" gap
flagged in `Plans/engineering_todo.md`) — but the choice of IIFE-wrapped vs.
bare top-level code per file is deliberate, not random, even though nothing
said so in writing until now:

- **Bare top-level `let`/`const`/`function`** (`game_state.js`, `player.js`,
  `enemy.js`, `boss.js`, `area.js`, `combo.js`, `game_entities.js`,
  `cutscene.js`, ...) — every core gameplay file. Dozens of other files need
  direct read/write access to these top-level bindings (`player`, `gameState`,
  `boss`, `AREAS`, ...); wrapping them in an IIFE would mean deliberately
  exposing every one as a getter/setter on a namespace object for no benefit,
  since `<script>` load order already makes them globally reachable either
  way.
- **IIFE, `window.X = {...}` namespace object** (`undoHistory.js`,
  `unsavedGuard.js`, `animImageStore.js`, `roomImageStore.js`,
  `devContext.js`, `agentController.js`, and `roomVerify.js` as a UMD-style
  dual export) — self-contained utilities with no need for other files to
  reach into their internals; only the exported surface should be touched.
- **Bare top-level + `module.exports` tail** (`minibossRegistry.js`,
  `floorPlanWalkEngine.js`) — a third pattern for files meant to be
  `require()`d by Node CLI tools *and* loaded as a plain `<script>` in the
  browser.

New file → pick by the same test: does other game code need direct access to
its top-level state? Bare. Is it a self-contained helper only its own API
should be called through? IIFE. Does a Node CLI tool also need to load it?
Add the `module.exports` tail. Don't convert existing files between these
without a reason — it's cosmetic churn on files that work.

### Per-swing hit dedup pattern

`player.hitTargetsThisSwing` (a `Set`, cleared whenever a new attack
starts) prevents a multi-frame attack hitbox from damaging the same target
every overlapping frame. Any new damage-dealing hit loop must check/add to
this set the same way existing loops do — see `BUG-001` in
`Plans/BUG_ANALYSIS_AND_QA_PLAN.md` for what happens if you don't.

### Narrative/plotline layer (built 2026-08-03, not yet wired into runtime)

```
game/visions.js        → VISIONS — non-interactive lore-reveal steps, gated behind LORE_ENABLED
game/quests.js         → QUESTS — multi-stage tracked quest arcs
game/npcDialogue.js    → NPC_DIALOGUE — re-enterable talk-count-gated conversations
game/storyFlagMeta.js  → STORY_FLAG_META — human-readable flag descriptions only, never the flags themselves
game/plotlineVerify.js → PlotlineVerify.analyze()/.verify() — static cycle/dead-flag/unwritten-flag
                          audit over the flag graph (same linter philosophy as roomVerify.js)
```

None of these five files have a `<script>` tag in `index.html` yet —
`editor/plotline_editor.html` loads them directly (same pattern
`cutscene_editor.html` uses to read the live `CUTSCENES` object). See
`Plans/plotline_editor_plan.md` for the full spec and its still-open §5
(content/wiring phase — the pacifist NPC's actual content and the
`companionRestricted` region field).

### Boss/miniboss death pattern — a real gotcha

`boss.js`'s `Boss.update()` must be called even after `boss.dead` is true
(it self-guards and just increments `deathTimer`), because the victory
trigger checks `boss.deathTimer === 1`. Gate the *call site* on `boss`
alone, with only the damage-dealing checks individually gated on
`!boss.dead` — gating the call site on `boss && !boss.dead` gets
`deathTimer` stuck at 0 forever and victory can never fire. Copy this
pattern for new bosses/minibosses.

## Dev/debug tooling — keep these working

All standalone HTML in `editor/`, styled via `styles/design-system.css`
(per `Plans/editor_design_style_guide.md`). One-line purpose + current
caveat each — full build history is in `Plans/roadmap.md`, not here.

- **`debug_v1.html`** — headless-ish live test console. Boots the real game
  in a sandboxed iframe, dispatches real `KeyboardEvent`s, diffs canvas
  snapshots/timing (R01–R11), walks every room via `validateAreaGraph()` +
  a teleport-in survival check, plus a static door/platform geometry
  linter. Run after any change touching input, state transitions, area
  data, or timing. (`debug_new.html`, an earlier superseded version,
  deleted 2026-08-02.)
- **`debug_v2.html`** — debug_v1.html's successor (built, wired into
  `dev_hub.html`, previously undocumented here until 2026-08-04). 100+
  frame-stepped checks across collision/abilities/AI/UI/audio/input/
  save-load/rooms/anim/perf. Stubs `requestAnimationFrame` before game
  code loads so every check advances the game by hand, exactly N frames
  (deterministic, no `sleep()`/pixel-diff flakiness); uses indirect
  `eval` in the iframe to reach script-scoped `let`/`const` state
  (`limitBreak`, `areaEnemies`, `keys`, ...) with no game-file changes;
  runs gameplay checks in a synthetic `__dbg_arena` room (known floor/
  ceiling/walls/one-way/moving/crumble platforms) so failures mean "the
  physics is wrong," not "that room is shaped oddly"; replaces the
  iframe's `localStorage` with an in-memory shim so a run can never touch
  real save slots/keybinds/HUD layout/anim overrides (debug_v1.html does
  autosave into real slot 1 on every run — use v2 when that matters).
  Does not replace debug_v1.html — both are still linked from
  `dev_hub.html`; v1 remains useful for its narrower, faster real-`rAF`
  timing checks.
- **`levelEditor.html`** — visual room editor (platforms, enemies,
  transitions, anchors, ability rewards, lore, boss spawns), loads/edits
  the real `AREAS` object directly, generic serializer export. Undo/redo,
  copy/paste, multi-select, pan/zoom, drag-resize handles, in-editor room
  linter, "Diff vs Saved". Has working hazard/crumble/moving/one-way
  platform inspector fields, a `tint` field (per-placement color override,
  consumed by `game/visualVariants.js`), and `animKey` + "🎬 Edit Animation
  →" deep-links on platform/transition/anchor/reward/pip/healing-crystal
  inspectors (not on Cosmetic Upgrade — no runtime draw function exists for
  those yet).
- **`enemy_test.html`** — spawns any real enemy/miniboss class in an
  isolated flat arena with a chosen ability loadout, for balance testing.
- **`enemy_editor.html`** — tunes numeric stats/loadout for any built enemy
  class with a live preview, hands off to `enemy_test.html` to spawn/fight
  it. Doesn't edit AI/behavior logic itself — non-coder safe.
- **`world_map_editor.html`** — force-directed visual world-topology tool.
  Reads live from `AREAS` on every load, runs a spring simulation (rooms
  repel, `connections[]` attract, region-centroid pull keeps clusters
  together). Semantic zoom: region blobs at overview, room boxes at mid,
  full detail (gates, types, anchors) when zoomed in. Drag-to-pin rooms
  (persisted in `localStorage`), click-to-inspect (sidebar detail + nav),
  region filters, "Export MAP_LAYOUT" generates a paste-ready
  `MAP_LAYOUT_SVG` for `map.js`. Replaces the deleted `worldmap.html`
  (col/row grid, structurally couldn't handle 2+ rooms per cell) and the
  Whimsical→`parse_worldmap_svg.js`→hand-paste pipeline.
- **`anim_editor.html`** — frame-strip animation/hitbox editor over
  `game/animdata.js`'s `ANIM_DEFS` — durations, drag-resize hitboxes,
  per-frame image upload, cancelableFrom combo windows, onion skin, `?anim=`
  deep-link auto-creates a placeholder for a new key. Includes a Companion
  entity category (The Child).
- **`combo_editor.html`** — visual editor for `game/combo.js`'s
  `COMBO_DEFS` (steps, timing windows, rewards).
- **`hud_editor.html`** — drag/toggle HUD elements via
  `game_hud_menus.js`'s `HUD_LAYOUT` table. Editor keeps its own DEFAULTS
  copy — if you change one, change the other.
- **`boss_phase_editor.html`** — tunes `boss.js`'s `BOSS_PHASE_CONFIG`
  (phase thresholds, attack weights, adaptation bias) without touching
  `boss.js` itself.
- **`companion_test.html`** — boots the real game into `enemy_test_arena`
  with the Child active (mode override, wave spawner, tuning sliders).
- **`ability_tester.html`** — live ability/movement-feel tuning bench. Boots
  the real game straight into `enemy_test_arena` (full kit, max level,
  every ability unlocked so each one's strongest form is testable) and
  exposes every tunable movement/dash/knockback/ability constant
  (`player.js`/`ability.js`/`enemy.js`) as a slider, grouped by
  ability/system. Works because those constants were deliberately switched
  from `const` to `var` so `window.CONST_NAME = value` takes effect the
  next frame — same convention `enemy.js` already used for
  `enemy_editor.html`. Buttons to spawn/clear test enemies (including one
  placed for Reach-cone testing), full-heal the player, and reset all
  sliders to shipped defaults. "Generate JS" exports a paste-ready
  `var NAME = value;` block per source file. No live-save-server route —
  export/paste only, same as most editors per the suite-wide persistence
  gap noted below.
- **`difficulty_bot.html`** — evolves a small neural net
  (`game/agentController.js`) to play the real game against a customizable
  roster in the dev-only `bot_arena` room, producing a quantitative
  difficulty score. Full design in
  `Plans/difficulty_bot_and_combat_polish_plan.md`.
- **`audio_ab_tester.html`** — every region/boss/enemy-ability SFX slot
  with its current live track plus new candidates to audition against it
  (`assets/audio/candidates/manifest.json`). Star a favorite; export
  picks.json. Doesn't change the live game itself.
- **`level_designer.html`** — never built standalone; superseded, its
  scope (REGION_STYLES tuning) folded into `room_scene_editor.html`.
- **`room_scene_editor.html`** — edits a room's `backdropLayers[]`
  (background/decoration PNG layers, parallax, tint, opacity, optional
  per-layer frame animation) and its `REGION_STYLES` entry (colors +
  numeric decoration knobs). Center preview is the real game in a
  sandboxed iframe with live property writes, not an approximation. Also
  owns `area.cutsceneTriggers[]` (data-driven room-entry/on-load plot
  triggers) and `area.audioZones[]` (sub-room music-track overrides, reuses
  `setRegionMusic`'s crossfade machinery via `SFX.setAudioZone()`). Not
  built: the `decorationSprites[]` scattered-decal layer, live
  camera-bounds overlay, ambient one-shot SFX trigger zones.
- **`cutscene_editor.html`** — structured list-and-form editor over
  `cutscene.js`'s `CUTSCENES` step format (all 8 step types, including
  `choice`'s branch authoring). `call` steps use a safe-preset-library +
  raw-code-escape-hatch split. Preview is a static mocked walkthrough, not
  a real-game iframe (deferred to v2). Complements (doesn't overlap)
  `room_scene_editor.html`'s cutscene-trigger *placement* — this one
  authors *content*.
- **`plotline_editor.html`** — flag graph + visions/quests/dialogue editor
  (five tabs: Flag Graph / Visions / Quests / Dialogue / Export), built
  2026-08-03 per `Plans/plotline_editor_plan.md`. Force-directed Flag Graph
  view (canvas spring sim, drag-to-pin, colour by writer source) with
  `PlotlineVerify` audit output (cycles/dead-flag/unwritten-flag issues,
  clickable). Four `localStorage` override keys registered in
  `dev_hub.html`'s Live Overrides panel.
- **`dev_hub.html`** — central launcher, sidebar grouped by workflow
  (Level Design / Combat & Enemies / Systems / QA), deep-links into other
  tools via `?room=`/`?enemy=`/`?anim=`, "Run All Validations", Live
  Overrides panel (shows/clears the 4 `localStorage` override keys), and a
  Project Progress dashboard (room design-state via
  `game/roomDesignScore.js`, Fracture Pip/enemy/miniboss roster counts via
  `game/minibossRegistry.js`, enemy-anim authored-vs-procedural coverage,
  collapsible per-region table). Per-room drill-down + "suggested next"
  heuristic (v2) not built.

If you touch input handling, area data shape, or add new game state, run
the relevant debug page manually — per `Plans/performanceInstructions.md`,
breaking these silently is a regression.


## Save data

`localStorage`, 3 slots, key pattern `stillpoint_save_v1_slot_{n}`. All
access wrapped in try/catch (private browsing / quota should degrade to
"no persistence," never crash). Settings (screen shake, hitstop) are a
separate key, `stillpoint_settings_v1`. See `saveGame()`/`loadGame()` in
`game_boot_save.js` for the exact shape if you add new persisted state —
update both save and load, plus `startNewGame()`'s reset path.

## Current status (see `Plans/roadmap.md` for full detail — always trust its
own tail end, "NEXT SESSION SHOULD", over this summary, not the other way around)

- Phase 0 (core UX/QoL) and Phase 1.1–1.8 (movement/combat overhaul) done.
- Crag of the Colossus (4 rooms + Colossus Core miniboss) built and
  live-verified.
- All 13 `expansion.md` regions exist as real `AREAS{}` entries (71 rooms).
  A handful have their full mechanical effect + hand-design; the rest are
  flat SHELL rooms (geometry/doors only). Run `node Plans/room_progress.js
  --full` for the live per-room state.
- 10+ enemy types are built and spawnable via `enemy_test.html`/
  `enemy_editor.html`, but **not placed in `AREAS`** — every room's
  `enemies: []` is still effectively empty; placing them is open
  level-design work. Two known balance issues open: BUG-013 (Stillpoint)
  and BAL-001 (Phase Dash's echo-distraction) — see
  `Plans/BUG_ANALYSIS_AND_QA_PLAN.md`.
- The Sovereign's death-timer gating bug (victory could never fire) is
  fixed — see the boss/miniboss death pattern section above.

## When making changes

- Follow `Plans/performanceInstructions.md`: no per-frame allocations,
  profile before optimizing, keep files organized by feature, update
  `Plans/roadmap.md` when you finish something, don't break debug tools.
- New rooms: give them `col`/`row`, real `connections[]` entries, run
  `validateAreaGraph()` (automatic on load — check the console), prefer
  the "few big rooms" pattern, default to no fall-death.
- New enemies/bosses: follow the per-swing hit dedup pattern and the
  correct dead-gating pattern above — don't repeat the Sovereign's old bug.
- Design-doc conflicts: `Plans/roadmap.md` reflects actual code state and
  wins over `Plans/expansion.md`/`Plans/story.md` when they disagree about
  what exists.
