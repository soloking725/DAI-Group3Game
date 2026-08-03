# CLAUDE.md — Stillpoint

Context file for Claude (or Claude Code) working in this repo. Read this
before making changes — it points to the fuller docs and encodes decisions
that aren't obvious from the code alone.

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

Visual style: minimalist vector art, dark background, violet/teal/deep-blue
palette. Tonal references: Hollow Knight, Celeste, Hyper Light Drifter.
Core mechanic: **Stillpoint**, a time-slow ability tied to a "Fracture"
resource, layered on tight platformer movement (dash, wall jump, phase
dash) and directional melee combat.

## Read these first (in this order)

1. **`performanceInstructions.md`** — standing engineering rules for every
   session (performance discipline, file organization, keep debug tools
   working, update the plan doc, ask before big refactors). Treat this as
   binding.
2. **`roadmap.md`** — the actual dev-status changelog: what's done, what's
   partial, what's not started, and *why* things were built the way they
   were (bug fixes, decisions, deviations from plan). This is the
   single most important doc for "what state is the code actually in."
   **Update it whenever you finish work**, in the same style as existing
   entries (checkboxes + a short prose note, not just a checkbox flip).
3. **`expansion.md`** — the forward-looking design plan (new abilities,
   26+2 enemy roster, 13 new regions, 8 minibosses, post-game). This is
   aspirational/planned, not built — cross-check against `roadmap.md` and
   `area.js` before assuming something described here exists in code.
4. **`BUG_ANALYSIS_AND_QA_PLAN.md`** — known bug inventory (severity-rated,
   with file/line references) plus the manual playtest protocol and
   automated test suite design. Check here before assuming a weird
   behavior is new.

Other design docs, read as needed for their specific topic:
- `story.md` — narrative/companion-character system (large, not yet built
  — no code currently implements the companion, endings, or Fracture Pip
  economy described there; it's a design doc, not a status doc). Contains
  the newest planned ability, **Void Tether** (§4) — newer than
  expansion.md's Graviton Surge, itself still unbuilt.
- `lore.md` — a real, substantive narrative doc. Rewritten 2026-07-12: the
  Sovereign (renamed from "the King" 2026-07-13 — see her own revision
  history) is a deliberate conqueror-villain (fused every Stillpoint into
  one on purpose, still actively hunting the companion child from
  story.md), not the earlier sympathetic/tragic framing — see roadmap.md
  1.10 for the full brainstorm and lore.md's own "Revision history".
  Also gained a full "Minibosses & their regions" section covering all 8
  expansion.md minibosses. Not yet surfaced in-game (`LORE_ENABLED =
  false`). **King→Sovereign rename completed in JS code, 2026-08-02**
  (previously docs-only, per explicit user request). Verified before
  renaming that there were no actual `King`-prefixed *identifiers*
  anywhere (`class Boss` was always generically named) — every live
  reference was prose ("the King" in a comment) or a display string, both
  now say "Sovereign"/"the Fractured Sovereign" throughout `boss.js`,
  `game_state.js`, `game_update.js`, `game_entities.js`, `enemy.js`,
  `agentController.js`, and `editor/enemy_test.html`/`difficulty_bot.html`.
  Also found while checking: `area.js`'s `loreFragments[]` text already
  said "Sovereign" (e.g. `lore_so_1`: "The Sovereign sees all, but watches
  nothing.") — this doc's previous claim that it "still reflects the OLD
  King" was itself stale, fixed in an earlier session without this note
  being updated. `game/archive/game.js` (dead code, not `<script>`'d
  anywhere — see `Plans/engineering_todo.md`'s Structural issues) still
  has old `King` text; not touched, since renaming inside frozen/dead code
  has no payoff. `roadmap.md`'s changelog entries intentionally keep
  "King" where they're describing what was true at the time — not part of
  this rename, don't touch those either. "The Mirror King" (`hollow_
  guardian` miniboss, `class MirrorKing`) is a different, deliberately-
  named character per `lore.md` — unrelated to this rename, left as-is
  everywhere.
- `movement_feel_plan.md` — proposal (not started) for pushing player
  movement toward a faster, more fluid ("late Celeste") feel — dash-
  refill-on-landing as the priority lever, camera look-ahead, and matching
  enemy pacing. Flags that raising base speed constants requires a full
  `validateAllRoomLayouts()` re-run since the linter simulates physics
  against those exact constants — read this before touching
  `MOVE_SPEED`/`DASH_SPEED`/dash-cooldown behavior.
- `human_proportions_plan.md` — proposal (not started, 2026-07-26), written
  as a discussion doc analyzing what giving the player (and possibly the
  cast) real human-scale proportions (reference given: Ike from Smash
  Ultimate — tall, broad, muscular) instead of the current abstract 24×32
  rectangle would ripple into: art production cost, hurtbox/collision
  geometry (a full `validateAllRoomLayouts()` re-run, same class of risk
  `movement_feel_plan.md` already flags for a smaller change), movement
  feel, enemy/world scale (directly interacts with the "Sovereign should
  always read as stronger than you" design note elsewhere in this file),
  and tonal fit against the game's declared Hollow Knight/Celeste/Hyper
  Light Drifter visual references, which all use small, non-realistic
  silhouettes on purpose. Ends with open questions for the user, not a
  plan of record — nothing here is scoped for implementation yet.
- `cave_design_plan.md` — "how to make rooms read as a cave, not a
  platform gauntlet" research notes; informed the Crag of the Colossus
  build. Largely superseded for new work by the Task 4 decoration system
  (`REGION_STYLES`/`decorateRoomForRegion()` in game_entities.js — see roadmap.md
  Phase 9) for anything region-specific; still the right reference for
  cave-floor/no-fall-death philosophy generally.
- `room_verification_tool_plan.md` — reachability/safety linter for rooms.
  **Components 1 (static linter) and 3 (Spawn button) built, 2026-07-29**:
  `game/roomVerify.js` (reachability flood-fill via real jump/dash/phase-
  dash physics, floor-gap/embedded-door/one-sided-door checks), runnable
  from `editor/room_verify.html` (live, in `dev_hub.html`'s Level Design
  group) or `node Plans/room_verify_cli.js`. Clean across all 71 real
  rooms (2 warnings-only, 0 failing). The Spawn button is
  `applyDevSpawnOverride()` in `game_boot_save.js` — `?spawnRoom=<id>`
  boots straight into any room, no save touched. **Component 2 (headless
  bot walker) still not built** — `debug_v1.html`'s R09–R11 checks remain
  the only down-payment on that piece. See `roadmap.md`'s tail entry for
  full detail on what each check does and its known false-positive class.
- `floor_plan.md` — **official, 2026-07-13**: the full-game room-to-room
  connection graph (origin spine + all 3 built regions + all 10 planned
  regions), as a mermaid flowchart. Topology only — door-by-door connections,
  fast travel nodes, ability gates, pip/upgrade placement per room. Doesn't
  replace `regions.md` (mechanical effect, miniboss assignment, cluster
  position) — the two are meant to be read together. Reinstates Mirror
  Corridor (see `regions.md`'s connective-content section). Static Field
  gained a new miniboss, The Conduit (see `lore.md`) — it briefly also
  granted a new ability, Magnet Climb, which was removed 2026-07-14 along
  with the Antechamber's ability-gate requirement. Contains "Sovereign Room"
  nodes for `story.md` §9's Sovereign Ending postgame arc — rescoped
  2026-07-14 from far-future/unscoped to real planned (if unbuilt) content,
  see roadmap.md 5.9 — still no room-by-room design yet, so don't build
  against them without a fuller pass first.
- `regions.md` — the single planning reference for world layout: which of
  the 13 expansion.md regions exist (built or planned), cluster/col/row,
  room counts, miniboss assignment, and each region's special effect.
  Rebuilt 2026-07-13 to fold in the col/row/cluster data that used to only
  live in `worldmap.html`'s `PLANNED_REGIONS` array (that tool was removed
  2026-07-26 — see the Dev/debug tooling section below — this file is now
  the only place that data lives) and to drop the old 25-physics-concept
  brainstorm (nothing in it was ever assigned to a region). Use alongside yEd (`export_graph.js`
  exports the live world graph to yEd's GraphML format — the actual answer
  to "is there a tool to plan the map spatially," no custom tool needed)
  and `levelEditor.html` for individual room detail.
- `session_priorities.md` — an ordered task docket for a specific work
  session (checkbox list, not a permanent design doc). Once fully consumed
  its "recommended order" reasoning should be folded into roadmap.md and
  the file itself archived/retired — don't treat it as a standing doc the
  way roadmap.md/expansion.md are.
- `enemy_attack_vocabulary_plan.md` — the newest, best-maintained plan doc
  (self-updating dated status entries through 2026-07-20): new enemy attack
  verbs (Reversal, Aggro-Pull, The Catch, Tiger Knee, Afterimage Strike,
  Mote Eater) layered on the Phase 19 AI/defense-verb base. Most of it is
  now built in `enemy.js`/`ability.js` — read its own tail for exact
  remaining scope (Reversal's Sword-Clash interrupt-punish check) before
  assuming anything in it is still just a plan.
- `Plans/room_progress.js` — a read-only Node CLI (not a doc) classifying
  every room in `area.js` as SHELL/started/designed from design signals
  (see roadmap.md Phase 23). Run `node Plans/room_progress.js --full` or
  `--todo` for the live per-room design-progress state instead of trusting
  any doc's static "N of 13 regions" claim.
- `Plans/rebuild_levels_from_svg.js` — the one-off Node script that bulk-
  generated `area.js`'s current room scaffolding from an SVG floor-plan
  export (roadmap.md Phase 20, 2026-07-17). **Do not re-run this once
  hand level-design starts** — it overwrites `area.js` wholesale.
- `Plans/room_design_bible.md` — **NEW (2026-07-29)**: the single reference
  to have open while hand-designing any of the 71 rooms or drawing art in
  `anim_editor.html` — one section per region with a live, code-derived
  room table (size/connections/enemies/pips) plus that region's mechanic,
  miniboss, local tragedy, Hunt-thread one-liner, and hazard/puzzle ideas,
  all cross-referenced back to `floor_plan.md`/`regions.md`/`lore.md`/
  `expansion.md`/`story.md` rather than duplicating them. Also has the
  full built-enemy/built-miniboss roster reference and the current pip-
  economy counts (Fracture/Lore/Extra-Customization) in one place. Its
  ground-truth tables go stale the moment `area.js` changes — regenerate
  per its own §0 instructions rather than trusting a stale number in it.

## Where this project is right now (added 2026-07-24 — read before suggesting "build more tools" or "build more content")

**The user is intentionally in an infrastructure-building phase right now,
on purpose, while working a summer internship with limited free time.**
The plan is a dedicated ~1 month content push (enemies + levels) once the
internship ends — building infra now so it's all ready to use then, not
because content work is blocked on it. Concretely, per this session's
audit: tooling (undo/redo, unsaved-guard, IndexedDB sprite storage, live
overrides, the dev hub, now the difficulty bot) is in good shape, while
content is thin — only 5-13 of 26+2 planned enemies are built and **none
are placed in any room** (every `AREAS` entry has `enemies: []`), and only
4 rooms are actually hand-designed despite all 71 existing as scaffolded
shells (`node Plans/room_progress.js --full` for the live count).

**Implications for future sessions:**
- Don't push back on "let's build another tool" as premature just because
  infra outpaces content — that imbalance is the user's deliberate choice
  for this phase, not an oversight to correct.
- Also don't assume every session should default to more tooling — when
  asked for a general recommendation on what to do next (not a specific
  tool request), the honest answer is still "the content build-out is the
  real bottleneck," per the analysis in
  `Plans/difficulty_bot_and_combat_polish_plan.md`'s framing. Give that
  answer when asked; don't volunteer it as pushback when the user has
  already chosen to build infrastructure.
- When the content push actually starts, `Plans/difficulty_bot_and_combat_polish_plan.md`'s
  Part 1 (difficulty bot, built) becomes actually useful for balancing new
  enemies/rooms as they're built — Part 2 (hit-impact/hitstop cleanup,
  input buffering) is pure feel-polish, lower priority than either infra
  or content, do it opportunistically.

## Explicit design decisions (do not relitigate without asking)

- **Irreversible, consent-gated choices are an intentional throughline
  (named 2026-07-14).** Recurring pattern across the design docs: Void
  Tether (leaving the child at the entrance is now permanent, `story.md`
  §4), the proposed Hollow Core secret ending-path (explicit "are you sure"
  warning before an irreversible commitment), the proposed pacifist
  region (fighting even once forfeits the reward forever). Not a unique
  *concept* — permanent-choice mechanics exist all over games (Bioshock's
  Little Sisters, Undertale's genocide route, morality locks in countless
  RPGs) — the throughline here is *density and consistency*: this game
  applies it repeatedly, to small traversal/ability choices as much as to
  big story beats, rather than reserving it for one or two dramatic moments.
  New optional content should default to this pattern (a real, warned,
  permanent cost) rather than inventing a softer reversible version.
- **No charms/badge system.** Rejected. Keep Stillpoint's own identity
  (time-fracture + dashes + Stillpoint); borrow structural lessons from
  metroidvanias, not their mechanics wholesale.
- **No boxed HUD panels.** No persistent ability-icon bar. Prefer minimal
  in-world feedback (cooldown rings under the player's feet, glyphs,
  glow) over UI chrome.
- **Browser/canvas is the platform.** No engine rewrite. An Electron/Tauri
  wrap is the agreed path *later* if an offline/desktop build is wanted.
- **Lore is OFF** (`LORE_ENABLED = false` in `game_state.js`). The text-popup
  lore-fragment system is intentionally disabled pending a redesign as
  environmental storytelling. Data and code paths are left intact —
  don't delete them, and don't flip the flag without being asked.
- **No fall-death as the default difficulty lever.** New rooms should use
  continuous cave floors (see `cave_design_plan.md`); pits are reserved
  for rooms that deliberately want that hazard, via an explicit
  `pitDeathY` override, not an inferred one.
- **No lock-and-key gating (flagged 2026-07-12).** A door should be
  blocked by something the player's *toolkit* can't yet do (Phase Dash,
  Shard Shot, wall jump, etc.) — never by a collectible key/item found
  elsewhere that just unlocks a door with no other function, the way
  `requires: 'phase_dash'` already works everywhere in `area.js` today.
  Hollow Knight reference point: mantis-jump-gated ledges and dash-gated
  gaps, not literal locked doors with a key on the other side of the map.
  **Known conflict, not yet resolved**: `expansion.md`'s Warp Gate Nexus
  (§3.11, and the cross-link table in §3.13b) is planned to open "after
  collecting 3 Keystones" — a literal key mechanic. Not built yet. Revisit
  this with the user before implementing it as written; it may need
  reframing as an ability gate (or a puzzle-vault-completion gate) instead.
- Explicitly out of scope project-wide: charms, a shop/geo economy as a
  main progression gate, procedural generation, multiplayer, lock-and-key
  item gating (see above).

## File locations (2026-07-16 reorg)

The repo root used to be flat (every `.js`/dev-tool `.html` alongside
`index.html`). Reorganized on user request into three folders — **only
`index.html` itself stays at the root**:

- `game/` — the core runtime scripts (`audio.js` through the `game_*.js`
  files, listed below) plus `style.css` (currently unused — `index.html`'s
  CSS is inline; kept here anyway since it's thematically a game asset).
  **`game.js` split into 6 files 2026-07-27** (`game_state.js`,
  `game_entities.js`, `game_boot_save.js`, `game_update.js`,
  `game_hud_menus.js`, `game_draw_loop.js` — see Architecture map below):
  it had grown to ~6000 lines mixing camera/rendering, HUD/menu state,
  save/load, the ~2000-line `update()`, and the ~800-line `draw()`. The
  split is purely order-preserving (verified byte-for-byte: concatenating
  the 6 files in order reproduces the original file exactly) — every
  `<script src="game/game.js">` tag across `index.html` and the 5 editor
  tools that loaded it became 6 tags in the same position/order, so
  nothing about load order or global-scope semantics changed. It does
  **not** modularize the state (see "Key global state" note below) —
  it's the same shared globals, just spread across files textually.
- `editor/` — every dev/debug tool (`debug_v1.html`,
  `levelEditor.html`, `enemy_test.html`, `enemy_editor.html`,
  `enemy_designer.html`, `graph_analyzer.html`,
  `export_graph.js`). Cross-references between these tools (e.g.
  `enemy_editor.html`'s "Test in Arena" opening `enemy_test.html`) are
  same-folder and needed no changes; each tool's own `<script src="...">`
  tags now read `../game/foo.js`. `export_graph.js` (a Node CLI, not
  loaded by any page) resolves its `../game/area.js` / `../world_map.graphml`
  defaults off `__dirname`, so it works regardless of the caller's cwd.
- `Plans/` — unchanged, all planning docs (this file included).
- Root — `index.html`, `world_map.graphml` (an export artifact, not a
  tool — nothing loads it programmatically), `Enemy_Design.pdf`.

`index.html`'s own script tags now read `game/foo.js` (it didn't move, so
these are still simple root-relative paths, just one folder deeper than
before). `debug_v1.html` fetches `../index.html` and text-
rewrites its `game/foo.js` paths to `../game/foo.js` before injecting via
`srcdoc` (a `srcdoc` document resolves relative paths against the *host*
file's location, not the fetched content's original location — see the
comment at each file's `loadSandbox()`).

## Architecture map

Plain `<script>` tags in `index.html` (now `game/<name>.js` each, see
above), load order matters (globals depend on earlier files). The six
files marked NEW landed 2026-07-16 (roadmap Phase 17):

```
game/audio.js     → SFX (procedural Web Audio, no audio files, per-area drone)
game/input.js     → keys{}/justPressed{} via e.code, remappable keyBindings
game/physics.js   → NEW shared collision: resolveEntityCollision()/resolveEnemyPhysics()
                    (velocity-scaled margins, prevBottom guard, walls/ceilings/bounce)
                    + nudgeOutOfPlatforms() spawn safety. EVERY enemy physics tail
                    calls this — never write a new inline platform loop.
game/visualVariants.js → NEW (2026-08-01): generic getVisualVariant(category,
                    region, instanceOverride) resolver for "same behavior,
                    different look" content — instance override > REGION_STYLES
                    [region][category+'Variant'] > null (caller's own default,
                    unchanged). Two call sites today: drawPlatform()'s hazard
                    color (game_entities.js) and spawnAreaEnemies()'s optional
                    per-enemy tint (eDef.tint, editable in levelEditor.html's
                    enemy inspector). Generic — reusable for any future category
                    (destructibles, pickups, ...) with no new resolver code, just
                    a new call site when an actual need shows up. See
                    roadmap.md's tail entry / production_workflow_and_tool_gaps.md
                    §1a for the full writeup.
game/animdata.js  → NEW ANIM_DEFS frame/hitbox timelines + Animator + POSE_RENDERERS.
                    Edited by editor/anim_editor.html. The game does NOT yet render
                    through it — migration is deliberate per-entity work. **Added
                    2026-07-27**: frames can carry an `events` array
                    (spawnProjectile/cameraShake/sfx), fired once via
                    `Animator.consumeFrameEvents()` the tick a frame is first
                    entered; consumed by boss.js (Boss + ColossusCore +
                    TemporalWarden, same anim-driven hitbox bridge Boss already
                    had). Hitboxes also gained a `hitStun` field.
game/area.js      → AREAS{} data + compass graph (col/row/connections) + validateAreaGraph()
                    (+ per-room healingCrystals[]; enemy_test_arena is the dev-only room)
game/map.js       → builds map overlay FROM area.js's compass graph (never hand-authored)
game/ability.js   → Phase Dash / Shard Shot / Graviton Surge / Void Tether / Echo / abilityState
game/cutscene.js  → NEW CUTSCENES{} scripts + playCutscene() + storyFlags{} (saved).
                    gameState 'cutscene': input locked, hold-attack-to-skip; skipped
                    setFlag/call steps STILL execute (progression safety).
game/combo.js     → NEW COMBO_DEFS chains + action-event tracker (rising-edge detection
                    off player flags — add new abilities in _detectActions(), one line)
game/healing.js   → NEW vitality motes, maxHealthBonus/playerMaxHealth(), healing
                    crystals. Heal caps must use playerMaxHealth(), not MAX_HEALTH.
game/boss.js      → Boss (The Fractured King) — 3-phase state machine. **Added
                    2026-07-27**: `pickAttack()`'s attack-selection probability
                    chains were pulled out into a data table, `BOSS_PHASE_CONFIG`
                    (phase thresholds, per-phase weighted attack lists,
                    distance/adaptation bias, the Phase 3 Stillpoint reserved
                    slot, the teleport roll) — same numbers/behavior as before,
                    now tunable from `editor/boss_phase_editor.html` (new tool,
                    see below) via a `localStorage` overrides key, same pattern
                    as animdata.js's `ANIM_OVERRIDES_KEY`.
game/enemy.js     → all enemy classes + ComposedEnemy. Base-class AI: notice delay,
                    decision commit (updateMovementIntent), facing-cone detection;
                    opt-in defense verbs via this.defense (block/dodge/breakout/
                    dashPunish) + windupVariance/feintChance mix-ups.
game/companion.js → NEW the Child (companionState + Child class) — follow/hide/heal/
                    found-weapon fight-assist (COMPANION_WEAPONS, 2026-07-27, replaced
                    the original tether-only kit); never dies, teleport failsafe only
                    off-screen. Only actually activates via cutscene.js's Echo Bridge
                    meeting choice — see roadmap.md Phase 24.
game/attackVFX.js → NEW (2026-07-19) shared player VFX/hitbox math, extracted out of
                    player.js/ability.js so anim_editor.html's "Dissect from current
                    game" button and animdata.js's POSE_RENDERERS reuse identical
                    shapes/hitboxes to the legacy fallback draw path. Self-contained
                    (plain numbers/ctx only, no other game/*.js dependency).
game/player.js    → Player class — movement, combat, all physics constants
```

`game.js` **split into 6 files, 2026-07-27** (order-preserving — see the
File locations note above for how/why). Load order (must stay in this
sequence, right after `player.js`):

```
game/game_state.js     → canvas/DOM setup, all top-level mutable game state
                          (player, currentAreaId, particles, boss, camera,
                          DEBUG_MODE, etc.), pause/menu-nav state,
                          REMAPPABLE_ACTIONS, ABILITY_GRANTS, tryParryDeflect,
                          Fracture Pip/upgrade economy, Limit Break, Tutorial,
                          camera functions (getBounds/updateCamera/...)
game/game_entities.js  → Projectile/Particle classes, shard shot/void tether
                          damage helpers, particle/collision/area-enemy
                          management (spawnAreaEnemies, switchArea, ...),
                          platform/anchor/reward/lore-pip drawing, region
                          decoration (REGION_STYLES/decorateRoomForRegion),
                          area backdrop drawing
game/game_boot_save.js → unstuckPlayer, init(), settings load/save,
                          buildPauseMenu, saveGame()/loadGame()/deleteSave(),
                          startNewGame/respawnPlayer/returnToAnchor/restartRoom
game/game_update.js    → the main `update()` function (~2000 lines) — the
                          per-frame game-state-machine tick, incl. pitDeathY
                          death check and the boss/miniboss defeat gating
game/game_hud_menus.js → HUD_LAYOUT data table + drawHUD() and friends
                          (health/boss bar/cooldowns/tutorial banner/etc.),
                          all drawMainMenu/drawPlayMenu/drawSettingsScreen/...
game/game_draw_loop.js → the main `draw()` function (~800 lines), gameLoop(),
                          and the file's closing `init(); requestAnimationFrame
                          (gameLoop);` bootstrap
```

Key global state lives across these 6 files (not modularized/encapsulated
— still one shared global namespace, e.g. `player`, `boss`, `miniboss`,
`areaEnemies`, `camera`, `gameState` are top-level `let`s, now physically
sitting in `game_state.js` but readable/writable from every other file the
same as before the split). Enemy/boss classes read some of these directly
(e.g. `gameTimeScale`, `getCurrentArea()`), so actually modularizing state
behind real module boundaries would be a much bigger refactor than this
split was — flag that before attempting it.

New-ability checklist (2026-07-16): a grantable ability needs (1) an
`abilityState.hasX` flag + reset in BOTH reset paths + save/load, (2) one
line in game_state.js's `ABILITY_GRANTS` (the pickup grant is generic — the old
if/else chain silently ignored unlisted abilities, which is exactly how
Void Tether/Graviton Surge/max-health pickups were dead for a while),
(3) optionally one line in combo.js's `_detectActions()` to be combo-able.
**Cautionary example, 2026-07-27**: a `Construct` ability got steps 1-2
(flag, cooldown const, `ABILITY_GRANTS` entry with real popup/notification
text, a keybind on `KeyQ`) plus a full save/load wire-up, with **no actual
ability behavior built** — no aim/build/quickfire logic anywhere, just a
stray `this.construct` (no assignment) in `player.js`'s constructor. The
checklist covers the plumbing, not "is there a real feature behind the
flag" — don't take a fully-wired `abilityState.hasX` as proof the ability
itself exists; check for the actual input-handling/update/draw code too.
Freeing `KeyQ` for it also **reassigned Stillpoint/Graviton Surge/Void
Tether from Q/E/R to A/S/D** — a real, user-facing keybind change.

### World / rooms (`area.js`)

- Every room is an entry in `AREAS{}` with `platforms`, `transitions`,
  `enemies`, `anchors` (checkpoints), optional `abilityReward`,
  `loreFragments`, `col`/`row` (compass grid position), and
  `connections[]` (the single source of truth for door topology —
  `map.js` generates its layout from this, nothing is hand-authored
  separately).
- `validateAreaGraph()` runs on load and console-errors on: doors not on
  the correct edge, missing targets, col/row adjacency mismatches, and
  missing reverse connections for two-way doors. Keep new rooms passing
  this — it's cheap and catches real bugs (see `roadmap.md` Phase 7 for
  examples of bugs it would have caught).
- Room-sizing philosophy: **few large, multi-tier rooms with internal
  branching**, not many small single-gimmick rooms — see
  `expansion.md` §3.15. Reserve real doors (`transitions`/`connections`)
  for genuine region boundaries or pre-boss checkpoints.
- `pitDeathY` is an explicit per-room override in `game_update.js`'s death check
  — don't rely on inferring it from `groundY` (a past bug: a hardcoded
  600px-kill-plane heuristic killed players in tall rooms with real
  floors below y:600; see `roadmap.md` Phase 7).

### Combat / physics constants

Almost all tunable numbers (jump force, dash speed, attack windows,
cooldowns, i-frames) are named `const`s at the top of `player.js`,
`enemy.js`, `boss.js`, `ability.js`. Change values there, not inline.

### Per-swing hit dedup pattern

`player.hitTargetsThisSwing` (a `Set`, cleared whenever a new attack
starts) prevents a multi-frame attack hitbox from damaging the same
target every overlapping frame. Any new damage-dealing hit loop (enemy,
boss, miniboss, destructible wall) must check/add to this set the same
way the existing loops in `game.js` do — see `BUG-001` in
`BUG_ANALYSIS_AND_QA_PLAN.md` for what happens if you don't.

### Boss/miniboss death pattern — a real gotcha

`boss.js`'s `Boss.update()` must be called even after `boss.dead` is
true (it self-guards and just increments `deathTimer`), because the
victory trigger checks `boss.deathTimer === 1`. Gating the *call site* on
`boss && !boss.dead` means `deathTimer` gets stuck at 0 forever and
victory can never fire — the King's block in `game_update.js` had exactly this
bug and has since been fixed (it now gates on `boss` alone, with the
damage-dealing checks individually gated on `!boss.dead`). Both the King
and the miniboss (`ColossusCore`) now use the correct pattern — copy it
for new bosses/minibosses: gate the update call on the object existing,
gate only the damage checks on `!dead`.

## Dev/debug tooling — keep these working

- **`debug_v1.html`** — headless-ish live test console. Boots the real game
  in a sandboxed iframe, dispatches real `KeyboardEvent`s, diffs canvas
  snapshots and frame timing (11 checks, R01-R11), walks every room via
  `validateAreaGraph()` + a 90-frame teleport-in survival check per room,
  and a static "door embedded in platform geometry" linter. Run this after
  any change touching input, state transitions, area data, or timing.
  (`debug_new.html`, an earlier 8-check version this one strictly
  superseded — same checks with real bug fixes plus 3 more — was deleted
  2026-08-02 as a confirmed-safe duplicate; see `Plans/engineering_todo.md`.)
- **`levelEditor.html`** — visual room editor (place platforms, enemies,
  transitions, anchors, ability rewards, lore, boss spawns) with JS export.
  **Corrected 2026-07-12** (was stale): it now loads `area.js`/`enemy.js`
  directly and edits the real `AREAS` object — no more separate hardcoded
  preset copies. Export is a generic serializer over the whole room object
  (preserves col/row/connections/mapAccent/pitDeathY-as-Infinity/etc., not
  just a fixed field list). Enemy-type dropdown reads from `enemy.js`'s
  `ENEMY_REGISTRY` (all 10 built types, auto-updates as classes are added
  to that registry — see roadmap.md Phase 12). Has undo/redo, copy/paste,
  multi-select, pan/zoom, per-object drag-resize handles, an in-editor
  "Validate This Room"/"Check All Rooms" linter (satisfies
  session_priorities.md's former #8), and a "Diff vs Saved" comparison —
  still no `region`-driven decoration *preview* (Task 4's palette/cave
  styling only renders in the real game, not this editor's canvas) — see
  `roadmap.md`'s own "WHAT'S ACTUALLY NEXT"/tail section for the
  prioritized next-session list (`Plans/archive/level_editor_guide.md` is
  the older, now-superseded version of this same punch list).
  **Correction, 2026-08-01**: this section previously claimed "still no UI
  for hazards/switches/moving/one-way platforms" — false, verified against
  the live file: hazard (+ damage), crumble (+ delay/respawn), moving
  (+ target x/y/speed), and platform one-way all have working inspector
  fields (`p-hazard`/`p-crumble`/`p-moving`/`p-plat-oneway` etc.) — that
  claim was stale, not a real gap. Also gained a `tint` field on the enemy
  inspector this session (`p-tint`, next to the type dropdown) — an
  optional per-placement hex-color override consumed by the new
  `game/visualVariants.js` resolver (see the Architecture map entry above),
  stored as `eDef.tint` on the enemy placement, blank by default (no
  behavior change for any enemy that doesn't set one). Also gained an
  `animKey` field + "🎬 Edit Animation →" button on the Platform and
  Transition (door) inspectors, deep-linking to `anim_editor.html` (Option
  2 from the design discussion — geometry and animation authoring stay
  separate tools/tabs, no embedded frame-strip UI here). Consumed by
  `game_entities.js`'s new `getRoomObjectAnimator()`/
  `tryDrawRoomObjectAnim()` bridge. **Same day, extended to Anchor/Ability
  Reward/Lore Pip/Fracture Pip/Healing Crystal inspectors too** (a sibling
  `tryDrawPointObjectAnim()` bridge, since those are bare `{x,y}` with no
  `w`/`h`) — deliberately NOT added to Cosmetic Upgrade (no runtime draw
  function exists for those yet, so the field would be dead). See
  `roadmap.md`'s tail entry for full detail.
- **`enemy_test.html`** — spawns any real enemy/miniboss class in an
  isolated flat arena with a chosen ability loadout, for balance/behavior
  testing without playing through the full game.
- **`enemy_editor.html`** — tunes numeric stats (HP, attack cooldown,
  patrol range) and ability loadout for any built enemy class, with a live
  preview canvas, then hands off to `enemy_test.html` to actually spawn and
  fight it (via a `localStorage` handoff key). Does NOT edit AI/behavior
  logic or enemy.js itself — a "Save JSON" export gives a paste-ready
  overrides block instead. Safe for a non-coder to use directly; no code
  risk.
- **`worldmap.html`** — REMOVED 2026-07-26 (user call): its core premise (one
  room = one grid cell) never held — `col`/`row` in `area.js` is a region-
  level positioning convention, not a per-room-unique one, so region-chain
  helper/cutscene/corridor sub-rooms routinely share a cell with an
  unrelated region's room. Verified directly against the live `AREAS` data
  (not assumed): 22 of 35 occupied cells had 2+ real rooms stacked on the
  same cell, making the rendered map genuinely unreadable. A real fix would
  mean redesigning the renderer to cluster/stack overlapping rooms instead
  of a flat grid — a rework, not a patch — and the user judged the tool low-
  value even without the bug, so it was deleted rather than fixed. `regions.md`
  (region-level cluster/col/row planning) and `graph_analyzer.html`/
  `levelEditor.html` (room-level detail) remain the right tools for this.
- **`anim_editor.html`** — NEW (2026-07-16): frame-strip animation/hitbox
  editor over `game/animdata.js`'s `ANIM_DEFS` — durations, drag-resize
  hitboxes/hurtbox, per-frame image upload (data URLs, self-contained),
  cancelableFrom combo windows, onion skin, localStorage save (the game
  applies overrides on load) + paste-ready JSON export. **2026-08-01**:
  gained a Companion entity category (`child:child`, The Child — see
  `companion.js`'s new `Animator` bridge) and a fixed `?anim=` deep-link
  handler that now auto-creates a sized placeholder for a brand-new key
  (previously only worked for already-authored keys) — the latter is what
  makes `levelEditor.html`'s new per-object "Edit Animation →" buttons a
  real one-click flow. See `roadmap.md`'s tail entry for full detail.
- **`combo_editor.html`** — NEW: visual editor for `game/combo.js`'s
  `COMBO_DEFS` (steps from the documented action vocabulary, per-step
  frame windows, rewards). Same save/export pattern.
- **`hud_editor.html`** — NEW: drag/toggle the HUD elements `drawHUD()`
  renders, via game_hud_menus.js's `HUD_LAYOUT` table. The editor keeps a DEFAULTS
  copy of that table — if you change one, change the other.
- **`boss_phase_editor.html`** — NEW (2026-07-27, untracked): tunes
  `boss.js`'s `BOSS_PHASE_CONFIG` (phase health thresholds, per-phase attack
  weights, distance/adaptation bias) without touching `boss.js` itself.
  Added to `dev_hub.html`'s Combat & Enemies group.
- **`companion_test.html`** — NEW: boots the real game into
  `enemy_test_arena` with the Child active (mode override, canFight
  toggle, wave spawner, player-teleport fuzzer, live tuning sliders).
- **`ability_tester.html`** — NEW (untracked, exact date/scope not yet
  documented): loads the real game scripts in the same load order as
  `index.html`. Confirm/document its actual purpose next time it's touched.
- **`difficulty_bot.html`** — NEW (2026-07-24): evolves a small
  fixed-topology neural net (`game/agentController.js`) to play the real
  game against a customizable enemy/boss/miniboss roster in the new
  dev-only `bot_arena` room (`area.js`), producing a quantitative
  difficulty score instead of a guess. Fast-forwards by stubbing
  `requestAnimationFrame` before the game_*.js files load and calling the real
  `update()` directly; replays the best genome of each generation live
  (real `update()`+`draw()` at real speed) so training stays watchable.
  Net inputs include the target's real `.attacks[]`/`.defense` data (the
  same data `enemy_designer.html` edits), not just position/HP. Full design
  in `Plans/difficulty_bot_and_combat_polish_plan.md` — that doc's Part 2
  (centralized hit-impact/hitstop, player attack → Animator migration,
  input buffering) is scoped but not built yet.
- **`level_designer.html`** — never built standalone; **superseded**, its
  scope (REGION_STYLES color/numeric tuning) was folded into
  `room_scene_editor.html` (below) per the user's 2026-07-29 confirmation
  of `Plans/room_scene_editor_plan.md` §0.
- **`room_scene_editor.html`** — **v1 built, 2026-07-29** (per
  `Plans/room_scene_editor_plan.md`, scope confirmed with the user before
  building: fold in `level_designer.html`'s scope, and add a per-room
  `hideProceduralBackdrop` toggle rather than making custom art always
  additive). Edits a room's `backdropLayers[]` (background/decoration PNG
  layers — parallaxX/Y, offset, scale, repeat none/x/both, tint, opacity,
  per-layer hidden toggle — genuinely new rendering capability;
  `drawAreaBackdrop()` in `game_entities.js` now draws these before the
  original procedural deep/mid nebula layers, skipping the procedural
  layers entirely when `hideProceduralBackdrop` is set) and the current
  room's `REGION_STYLES` entry (primary/secondary/glow colors, plus the
  numeric knobs `decorateRoomForRegion()` was parametrized to expose —
  `diamondSpacing`/`ringCount`+`ringSpacing`/`spokeCount` for
  mirror_veil/event_horizon/chrono_rift respectively). Uploaded images
  store in a new `game/roomImageStore.js` (IndexedDB, same shape as
  `game/animImageStore.js` — see that file's own header for why: avoids
  the `localStorage` quota crash a base64-inline approach hit before).
  **The center preview is the real game, not an approximation**: a
  sandboxed iframe boots `../index.html` into the exact room (same
  fetch+srcdoc+path-rewrite technique as `debug_v1.html`'s
  `loadSandbox()`; room selection goes through a new
  `window.__editorSpawnRoom` hook on `applyDevSpawnOverride()` in
  `game_boot_save.js` since a srcdoc document has no real query string for
  `?spawnRoom=` to reach), and every property edit writes directly into
  the running iframe's `win.AREAS[roomId]`/`win.REGION_STYLES[region]` —
  no reload needed, since `draw()`/`update()` already read
  `getCurrentArea()` fresh every frame. A parallax-preview scrubber drags
  the real `player.x` through the room so the camera's own follow logic
  shows relative layer speed in motion. Non-destructive export (paste-ready
  JS snippet) + "Save to Browser (Live)" for both the room
  (`stillpoint_area_overrides_v1`, same key `levelEditor.html` already
  uses) and the region style (new `stillpoint_region_style_overrides_v1`
  key), same pattern as every other editor in this family. **v2 built,
  same day**: `area.cutsceneTriggers[]` — data-driven room-entry/on-load
  plot triggers (`{id, x,y,w,h, cutsceneId, storyFlag, triggerType:
  'enter'|'onRoomLoad'}`), replacing what used to only be hardcoded `if`
  conditions scattered across `game_update.js`/`game_entities.js` (those 3
  existing call sites are untouched — this is additive). Real runtime
  wiring, not just editor tooling: `switchArea()` in `game_entities.js`
  fires the first matching `onRoomLoad` trigger for the room being entered
  (gated on `storyFlag`, same "skip once you've seen it" convention the
  hardcoded `echo_bridge_intro` check already used); `update()` in
  `game_update.js` checks `'enter'`-type zones every frame via the same
  `rectsOverlap()` the transitions loop already uses. A new
  `firedTriggersThisVisit` Set (`game_state.js`) debounces same-visit
  re-firing for a trigger whose cutscene forgets to `setFlag` its own
  gate — reset on every `switchArea()`/`applyDevSpawnOverride()` call.
  Verified with standalone logic unit tests (not a full game boot) that
  the fire-once/storyFlag-gate/same-visit-debounce/re-fire-on-new-visit
  semantics all hold. Editor side: a left-panel trigger list (click to
  select + jump the parallax scrubber to the zone), a `cutsceneId` field
  autocompleted from the real `CUTSCENES` (`game/cutscene.js` now loaded
  by this editor too, same `<datalist>` pattern `levelEditor.html`'s Lore
  Pip panel uses), a `storyFlag` field with a live hint (recursively
  scans every `CUTSCENES` script, including `choice` branches, for a
  matching `setFlag` step, so a typo'd flag that will never actually gate
  anything is visible immediately), and a "▶ Test Cutscene" button that
  calls `win.playCutscene()` directly for a quick "does this scene even
  play" check. **The zone itself is drawn/dragged/resized on a new
  transparent `<canvas id="trigger-overlay">` stacked on top of the
  preview iframe** (not inside the iframe — trigger zones are invisible
  in real gameplay by design) — a small `requestAnimationFrame` loop
  mirrors the iframe's live `win.camera` every tick and converts each
  zone from world to screen space with the exact same transform
  `applyCamera()` uses in `game_state.js` (`screen = (world - camera) *
  zoom`), so the rectangles track correctly while the parallax scrubber
  moves the camera. **Not built (still deferred, lower-value/lower-
  urgency addendum items per the plan's §6.5)**: the `decorationSprites[]`
  scattered-decal layer, and the live camera-bounds overlay. Ambient
  one-shot SFX trigger zones were also left out of this pass — deliberately,
  not an oversight: `game/audio.js`'s `SAMPLE_URLS` table is all combat
  impact sounds (attack/hit/hurt/parry/etc.), there's no existing library
  of positional ambient one-shots (a distant clang, a dripping echo) to
  point a `sampleId` field at, so building this now would mean sourcing
  new audio assets first, not just wiring up a dropdown — a separate
  content task, not a coding continuation of this one.
  **2026-08-01**: `backdropLayers[]` entries can now optionally be animated
  — a new `frames: [{imageId, duration}]` array (stateless, driven by the
  existing `frameCount` global, always loops), authored via a new
  per-layer "Animation (optional)" section in the layer inspector
  (thumbnail + duration + reorder/delete + "+ Add Frame", reusing
  `RoomImageStore` exactly like the existing single-image upload). A layer
  with no `frames` (every layer before this) is untouched — falls straight
  back to the original single-`imageId` path. See `roadmap.md`'s tail
  entry for the full writeup, including a real `stripPreview()`/
  `pushFullLiveState()` gotcha this caught (per-frame preview blobs needed
  the same strip/re-prime treatment the layer-level image already had).
- **`Plans/production_workflow_and_tool_gaps.md`** — NEW (2026-07-29):
  answers "does the full editor suite (built + planned) let this project
  finish without more coding help, and if not, what's missing and in what
  order should the remaining work happen." Full inventory table of every
  existing tool's coverage, an honest gap list split into closeable-by-
  tooling (a room reachability/safety bot-walker — already spec'd in
  `Plans/room_verification_tool_plan.md`, still not built — and a unified
  Project Progress Dashboard, newly proposed, extending `dev_hub.html`)
  vs. inherently-creative-no-tool-removes-it (hazard/puzzle design
  content, cutscene *step* writing, actual art, fun/pacing playtesting).
  Research-backed (how Team Cherry actually built Hollow Knight, general
  greybox-then-art indie pipeline practice, narrative/QA/audio-middleware
  pipeline norms — sources in the doc) into a recommended region-by-region
  production order tailored to this project's actual state (systems/
  scaffolding already built, remaining work is a content pass, not
  green-field production) — read before deciding what to work on next.
- **`Plans/project_progress_dashboard_plan.md`** — **v1 built, 2026-07-29**:
  extends `editor/dev_hub.html`'s stats panel into a full "what's left"
  dashboard — room design-state (via the new shared
  `game/roomDesignScore.js`, extracted out of `room_progress.js` so the two
  can't drift apart on what counts as "designed"), Fracture Pips vs. a
  hardcoded 5-target, live enemy/miniboss roster counts (19/35, 14/14 —
  the latter via a new standalone `game/minibossRegistry.js`, a small
  id→name table that deliberately does NOT load `game_state.js`, sidestepping
  that file's unconditional `document.getElementById('game').getContext('2d')`
  at its top), and enemy-anim-authored-vs-procedural coverage (currently
  0/19 — `ANIM_DEFS` only has 2 player-attack entries so far). Plus a new
  collapsible "Progress by Region" table, click-through to
  `levelEditor.html` per region. **Corrected same session**: the first pass
  wrongly claimed `loreFragments` had no `mode` field and reported Lore vs.
  Extra/Customization Pips as unsplittable — a bad grep plus trusting
  `regions.md`'s stale line over `room_design_bible.md`'s correct one. The
  split is real and fully wired already: `game_update.js`'s pickup handler
  and `levelEditor.html`'s pip inspector both branch live on
  `loreFragments[].mode` (`'overlay'`/`'cutscene'` = Lore, `'none'` = Extra,
  correctly skipping any cutscene/vignette for Extra pips), shipped Phase 28
  (2026-07-29). The panel now reads the real field: 18/15 Lore Pips, 0/15
  Extra Pips (0 only because none are placed yet, not because the field is
  missing). `cosmeticUpgrades` (a separate rare/cosmetic mechanic, ~4
  target) stays its own row. See `roadmap.md`'s tail entry for full detail.
  **v2 (per-room drill-down + Spawn-button links, "suggested next"
  heuristic) not built**, deferred per the plan's own scope staging.
- **`Plans/cutscene_editor_plan.md`** — **v1 built, 2026-07-30**:
  `editor/cutscene_editor.html`/`cutscene_editor.js`, a structured
  list-and-form editor over `cutscene.js`'s `CUTSCENES` step format
  (`wait`/`text`/`cameraPan`/`cameraReturn`/`movePlayer`/`setFlag`/`call`/
  `choice` — all 8, `choice`'s nested `onA`/`onB` branch authoring included
  a step early since 3 of the 4 real cutscenes use it) — a typed step list,
  not a timeline/node-graph, per the plan's own research (§1). `call` steps
  use the plan's safe-preset-library-plus-raw-code-escape-hatch split (§3):
  3 templated presets (grant ability, companion active/canFight, Fracture
  Max increment) plus a labeled raw-code textarea. Preview is the plan's
  §7-recommended CHEAP version (a static mocked walkthrough), **not** the
  real-game-iframe preview — that stays deferred to v2 exactly as the plan
  staged it. `cameraPan`/`movePlayer` get a schematic to-scale room-outline
  canvas (real `AREAS` platform extents) to click-place coordinates on,
  cheaper than an iframe but solving the same "don't type blind" problem.
  New `game/cutscene.js` piece: a `call` step's `fn` can't survive
  `structuredClone`/JSON (functions), so working data carries a `_callCode`
  source string instead, materialized back into a real `fn` via
  `applyCutsceneOverrides()`/`new Function(...)` — new
  `stillpoint_cutscene_overrides_v1` localStorage key, same live-override
  pattern `animdata.js`'s `ANIM_OVERRIDES_KEY` uses, so `index.html` and
  every other tool loading `cutscene.js` pick up edits with no code change.
  Wired into `dev_hub.html` (Level Design group + Live Overrides panel).
  Not tested in a browser per this repo's standing rule — see
  `roadmap.md`'s tail entry for the full verification note. Complements,
  doesn't overlap, `room_scene_editor_plan.md`'s cutscene-trigger placement
  — that tool decides *where* a cutscene fires, this one authors *what's in
  it*.

If you touch input handling, area data shape, or add a new game state,
run the relevant debug page manually — per `performanceInstructions.md`,
breaking these silently is treated as a regression.

**Known debug-tool issues (pre-existing, not from recent sessions):**
- `debug_v1.html` R10 check: `win.abilityState is undefined`. Root cause:
  `abilityState` in `ability.js` is a top-level `const`, not a `window`
  property. Fixed R09 by attaching `window.AREAS = AREAS` in area.js (same
  pattern); a fix for this would be `window.abilityState = abilityState` at
  the bottom of ability.js. Not done because it's debug-tool-only and low
  priority — add the same guard pattern only if you're already in that file.

## Save data

`localStorage`, 3 slots, key pattern `stillpoint_save_v1_slot_{n}`. All
access wrapped in try/catch (private browsing / quota should degrade to
"no persistence," never crash). Settings (screen shake, hitstop) are a
separate key, `stillpoint_settings_v1`. See `saveGame()`/`loadGame()` in
`game_boot_save.js` for the exact shape if you add new persisted state — remember
to also update it in both the save and load functions, plus
`startNewGame()`'s reset path.

## Current status (see `roadmap.md` for full detail — corrected 2026-07-12,
the note below about Phase 1.8 was stale; this is exactly the kind of drift
this section is prone to, so **always trust `roadmap.md`'s own tail end
("NEXT SESSION SHOULD") over this summary**, not the other way around)

- Phase 0 (core UX/QoL) and Phase 1.1–1.8 (movement/combat overhaul,
  including 1.8 Dash Refund on Hit) are done.
- Crag of the Colossus (a full region: 4 rooms + Colossus Core miniboss)
  is built and live-verified — see `roadmap.md` Phase 7 for the bugs
  found/fixed while building it.
- 3 of the 13 expansion.md spacetime regions (Mirror Veil, Event Horizon,
  Chrono-Space Rift) have their special *mechanical* effect built, and are
  further along visually (Task 4 cave-aesthetic pass, 2 of Mirror Veil's
  abilities/enemies placed). **Corrected 2026-07-21**: all 13 regions now
  exist as real `AREAS{}` entries (71 rooms total) — the 2026-07-17 SVG
  rebuild (`roadmap.md` Phase 20) scaffolded the other 10 as flat SHELL
  rooms (geometry/doors only, no mechanical effect or hand-design yet). Run
  `node Plans/room_progress.js --full` for the live per-room state. The
  rest of the 26+2 enemy roster and the 8 minibosses in `expansion.md` are
  still **planned, not built**. See `roadmap.md` Phase 9/10/20 and
  `regions.md` for detail.
- 5 new enemies (Null Sentinel, Anchor Wraith, Deflector Drone, Mirror
  Sprite, Echo Stalker) are built in `enemy.js`, spawnable via
  `enemy_test.html`/`enemy_editor.html` (new tool — see Dev/debug tooling
  below). **NOT placed in `AREAS`** — corrected 2026-07-17: every room has
  `enemies: []`, verified against committed HEAD too, so this was never
  true rather than something a later pass undid. 10 enemy types exist
  (incl. BlitzGuard); placing them is open level-design work. Two known balance issues open: BUG-013
  (Stillpoint) and BAL-001 (Phase Dash's echo-distraction) — both partially
  addressed this session but need a human playtest to confirm, see
  `BUG_ANALYSIS_AND_QA_PLAN.md`.
- The King's death-timer gating bug (victory could never fire) is fixed —
  see the boss/miniboss death pattern section above for the pattern to copy.

## When making changes

- Follow `performanceInstructions.md`: no per-frame allocations, profile
  before optimizing, keep files organized by feature, update `roadmap.md`
  when you finish something, don't break debug tools.
- New rooms: give them `col`/`row`, real `connections[]` entries, run
  `validateAreaGraph()` (automatic on load — check the console), prefer
  the "few big rooms" pattern, default to no fall-death.
- New enemies/bosses: follow the per-swing hit dedup pattern and the
  correct dead-gating pattern (see above) — don't copy the King's bug.
- Design-doc conflicts: `roadmap.md` reflects actual code state and wins
  over `expansion.md`/`story.md` when they disagree about what exists.
