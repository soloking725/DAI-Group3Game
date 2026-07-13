# CLAUDE.md — Stillpoint

Context file for Claude (or Claude Code) working in this repo. Read this
before making changes — it points to the fuller docs and encodes decisions
that aren't obvious from the code alone.

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
- `lore.md` — a real, substantive narrative doc (NOT empty — corrected
  2026-07-12, this line was stale). Connective-tissue prose tying together
  the `loreFragments[]` already in `area.js` into one story; not yet
  surfaced in-game (`LORE_ENABLED = false`).
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
- `regions.md` — which of the 13 expansion.md regions exist (built or
  planned), room counts, and each region's special effect/mechanic; also
  holds a 25-physics-concept brainstorm for 5 *additional* regions beyond
  the 13, kept strictly in a "not assigned anywhere yet" section.
- `session_priorities.md` — an ordered task docket for a specific work
  session (checkbox list, not a permanent design doc). Once fully consumed
  its "recommended order" reasoning should be folded into roadmap.md and
  the file itself archived/retired — don't treat it as a standing doc the
  way roadmap.md/expansion.md are.

## Explicit design decisions (do not relitigate without asking)

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

## Architecture map

Plain `<script>` tags in `index.html`, load order matters (globals depend
on earlier files):

```
audio.js    → SFX (procedural Web Audio, no audio files, per-area drone)
input.js    → keys{}/justPressed{} via e.code, isPressed()/wasJustPressed()
area.js     → AREAS{} data + compass graph (col/row/connections) + validateAreaGraph()
map.js      → builds map overlay FROM area.js's compass graph (never hand-authored)
ability.js  → Phase Dash / Shard Shot / Echo class / abilityState
boss.js     → Boss (The Fractured King) — 3-phase state machine
enemy.js    → Enemy, Stutterer, FracturedSlime, CrystalSentinel, ColossusCore
player.js   → Player class — movement, combat, all physics constants
game.js     → main loop, game state machine, HUD, save/load, everything else
```

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
  `Plans/level_editor_guide.md` for the prioritized next-session list.
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
- **`worldmap.html`** — standalone compass-graph visualizer, reads live
  `AREAS` data plus a hand-maintained `PLANNED_REGIONS` list for the
  regions in `expansion.md` that don't exist as real `AREAS` entries yet,
  plus a region-status table (built vs. planned, cluster membership) added
  2026-07-12. Keep `PLANNED_REGIONS`/`CROSS_LINKS` in sync with
  `expansion.md` §3.13b by hand — there's no automatic validation between
  the two.
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
- 3 of the 13 expansion.md spacetime regions are built as real skeletons
  (Mirror Veil, Event Horizon, Chrono-Space Rift — empty rooms + doors,
  cross-linked to each other, 2 of Mirror Veil's abilities/enemies placed;
  no cave-aesthetic-level room population like Crag has yet). The
  remaining 10, the rest of the 26+2 enemy roster, and the 8 minibosses in
  `expansion.md` are **planned, not built**. See `roadmap.md` Phase 9/10
  and `regions.md` for detail.
- 5 new enemies (Null Sentinel, Anchor Wraith, Deflector Drone, Mirror
  Sprite, Echo Stalker) are built in `enemy.js`, spawnable via
  `enemy_test.html`/`enemy_editor.html` (new tool — see Dev/debug tooling
  below) and placed in `AREAS`. Two known balance issues open: BUG-013
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
