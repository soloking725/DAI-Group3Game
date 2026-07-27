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
  expansion.md minibosses. `area.js`'s existing `loreFragments[]` text
  still reflects the OLD King and has NOT been ported to match yet — treat
  lore.md as the current source of truth for characterization, not the
  live in-game strings. Not yet surfaced in-game (`LORE_ENABLED = false`).
  **JS code (`boss.js`, `game.js`, `area.js`, `enemy.js`) still uses `King`
  identifiers/text throughout — the rename is docs-only so far** (all of
  `lore.md`, `story.md`, `expansion.md`, `regions.md`, `floor_plan.md` now
  say "Sovereign"; `roadmap.md`'s changelog entries intentionally keep
  "King" where they're describing what was true at the time). Don't rename
  the JS without being asked — it's a real refactor (state var names, boss
  dialogue strings, etc.), not a find/replace.
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
  (`REGION_STYLES`/`decorateRoomForRegion()` in game.js — see roadmap.md
  Phase 9) for anything region-specific; still the right reference for
  cave-floor/no-fall-death philosophy generally.
- `room_verification_tool_plan.md` — design for a not-yet-built
  reachability/safety linter for rooms (static linter + headless bot
  walker). `debug_v1.html`'s R09–R11 checks are a lightweight down-payment
  on this, not the full tool.
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
- **Lore is OFF** (`LORE_ENABLED = false` in `game.js`). The text-popup
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

- `game/` — the 9 core runtime scripts (`audio.js` through `game.js`,
  listed below) plus `style.css` (currently unused — `index.html`'s CSS is
  inline; kept here anyway since it's thematically a game asset).
- `editor/` — every dev/debug tool (`debug_v1.html`, `debug_new.html`,
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
before). `debug_v1.html`/`debug_new.html` fetch `../index.html` and text-
rewrite its `game/foo.js` paths to `../game/foo.js` before injecting via
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
game/animdata.js  → NEW ANIM_DEFS frame/hitbox timelines + Animator + POSE_RENDERERS.
                    Edited by editor/anim_editor.html. The game does NOT yet render
                    through it — migration is deliberate per-entity work.
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
game/boss.js      → Boss (The Fractured King) — 3-phase state machine
game/enemy.js     → all enemy classes + ComposedEnemy. Base-class AI: notice delay,
                    decision commit (updateMovementIntent), facing-cone detection;
                    opt-in defense verbs via this.defense (block/dodge/breakout/
                    dashPunish) + windupVariance/feintChance mix-ups.
game/companion.js → NEW the Child (companionState + Child class) — follow/hide/heal/
                    tether-assist; never dies, teleport failsafe only off-screen.
game/attackVFX.js → NEW (2026-07-19) shared player VFX/hitbox math, extracted out of
                    player.js/ability.js so anim_editor.html's "Dissect from current
                    game" button and animdata.js's POSE_RENDERERS reuse identical
                    shapes/hitboxes to the legacy fallback draw path. Self-contained
                    (plain numbers/ctx only, no other game/*.js dependency).
game/player.js    → Player class — movement, combat, all physics constants
game/game.js      → main loop, game state machine, HUD (HUD_LAYOUT data table),
                    ABILITY_GRANTS pickup table, save/load, everything else
```

New-ability checklist (2026-07-16): a grantable ability needs (1) an
`abilityState.hasX` flag + reset in BOTH reset paths + save/load, (2) one
line in game.js's `ABILITY_GRANTS` (the pickup grant is generic — the old
if/else chain silently ignored unlisted abilities, which is exactly how
Void Tether/Graviton Surge/max-health pickups were dead for a while),
(3) optionally one line in combo.js's `_detectActions()` to be combo-able.

Key global state lives in `game.js` (not modularized — `player`, `boss`,
`miniboss`, `areaEnemies`, `camera`, `gameState`, etc. are top-level
`let`s). Enemy/boss classes read some of these directly (e.g.
`gameTimeScale`, `getCurrentArea()`), so moving state into modules would
be a real refactor, not a mechanical one — flag this before attempting it.

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
- `pitDeathY` is an explicit per-room override in `game.js`'s death check
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
victory can never fire — the King's block in `game.js` had exactly this
bug and has since been fixed (it now gates on `boss` alone, with the
damage-dealing checks individually gated on `!boss.dead`). Both the King
and the miniboss (`ColossusCore`) now use the correct pattern — copy it
for new bosses/minibosses: gate the update call on the object existing,
gate only the damage checks on `!dead`.

## Dev/debug tooling — keep these working

- **`debug_v1.html` / `debug_new.html`** — headless-ish live test console.
  Boots the real game in a sandboxed iframe, dispatches real
  `KeyboardEvent`s, diffs canvas snapshots and frame timing. `debug_v1.html`
  additionally walks every room via `validateAreaGraph()` + a 90-frame
  teleport-in survival check per room, and a static "door embedded in
  platform geometry" linter. Run this after any change touching input,
  state transitions, area data, or timing.
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
  styling only renders in the real game, not this editor's canvas), and
  still no UI for hazards/switches/moving/one-way platforms since those
  need new `game.js` runtime behavior first — see
  `roadmap.md`'s own "WHAT'S ACTUALLY NEXT"/tail section for the
  prioritized next-session list (`Plans/archive/level_editor_guide.md` is
  the older, now-superseded version of this same punch list).
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
  applies overrides on load) + paste-ready JSON export.
- **`combo_editor.html`** — NEW: visual editor for `game/combo.js`'s
  `COMBO_DEFS` (steps from the documented action vocabulary, per-step
  frame windows, rewards). Same save/export pattern.
- **`hud_editor.html`** — NEW: drag/toggle the HUD elements `drawHUD()`
  renders, via game.js's `HUD_LAYOUT` table. The editor keeps a DEFAULTS
  copy of that table — if you change one, change the other.
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
  `requestAnimationFrame` before `game.js` loads and calling the real
  `update()` directly; replays the best genome of each generation live
  (real `update()`+`draw()` at real speed) so training stays watchable.
  Net inputs include the target's real `.attacks[]`/`.defense` data (the
  same data `enemy_designer.html` edits), not just position/HP. Full design
  in `Plans/difficulty_bot_and_combat_polish_plan.md` — that doc's Part 2
  (centralized hit-impact/hitstop, player attack → Animator migration,
  input buffering) is scoped but not built yet.
- **`level_designer.html`** — PLANNED, not built (see roadmap.md's tail
  end for the full spec). Would be a live visual tuning tool for the Task
  4 decoration system (`REGION_STYLES` etc.) — palette/parameter controls
  reusing the real game.js decoration functions, with a JSON export.
  Explicitly scoped to NOT touch room geometry — that stays
  `levelEditor.html`'s job.

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
`game.js` for the exact shape if you add new persisted state — remember
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
