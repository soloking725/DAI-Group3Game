# Punch list — things to do before the next session

You said you know how to use the level editor already, so this isn't a
how-to anymore — it's a prioritized list of concrete work, pulled from
`roadmap.md`'s own "NEXT SESSION SHOULD" section, `session_priorities.md`,
and gaps I found while working on the editor this session. Each item says
where to look and roughly how big it is.

## 1. Fix `enemy_editor.html`'s missing enemy (5 minutes)

`enemy_editor.html` has its own hand-written `ENEMY_DEFAULTS` object
(~line 90) with 9 entries — it's missing `blitz_guard`, the 10th enemy
that's in `enemy.js`'s `ENEMY_REGISTRY` and now spawns correctly in-game.
Add one entry matching the existing pattern:
```js
blitz_guard: { name: 'Blitz Guard', health: ?, attackCooldown: ?, patrolRange: ?, color: '#?' },
```
Pull the real numbers from `enemy.js`'s `BlitzGuard` class constants (same
convention the file's own comment describes — it's hand-copied from
enemy.js's consts on purpose, not loaded live). Same gap likely repeats
for any *next* new enemy you add — worth remembering this file needs a
manual entry too, same as `game.js` used to before the registry fix.

## 2. Highest priority per roadmap.md: two flagged balance issues

Before building more content on top of core movement/combat, these need a
deliberate pass (see `BUG_ANALYSIS_AND_QA_PLAN.md` for detail):
- **BUG-013** — Stillpoint blocks attacking, so its own offensive lifesteal
  buff can never actually trigger while it's active. Contradiction in its
  own design.
- **BAL-001** — Phase Dash's echo-distraction is flagged as too strong.

Everything built since (Crag, the 3 anchor regions, all 10 enemies) is
tuned around current Phase Dash/Stillpoint behavior, so fixing these later
risks re-tuning multiple already-built rooms. Do this before more content.

## 3. Playtest what's already built but unverified

- 5 newer enemies (Null Sentinel, Anchor Wraith, Deflector Drone, Mirror
  Sprite, Echo Stalker) were validated headlessly (Node syntax/linter
  checks) but never actually played. Use `enemy_test.html`, 2-3 loadouts
  each. Specifically check whether Deflector Drone's projectile-reflection
  feels fair.
- Confirm `debug_v1.html`'s R10/R11 checks pass in a real browser
  (hard-refresh — caching was suspected last time this was checked).
- Confirm the Task 4 region decoration/cave styling (`REGION_STYLES`,
  `decorateRoomForRegion()`, door shapes) actually looks good on screen —
  it's only ever been validated as data/syntax, never seen live.

## 4. Three pacing/critical-path fixes (design work, not yet built)

From `roadmap.md`'s PLANNED section, in the order they depend on each
other:
1. **Reverse Charged Attack's placement** — currently granted in Crag Altar
   *before* the Colossus Core miniboss fight, making the miniboss optional
   and pointless to fight. Move the grant to Colossus Core's defeat instead
   (mirror how the King's own defeat is handled in `game.js`). Needs
   `area.js` changes to both `crag_altar` (remove pickup) and `crag_warden`
   (add it on miniboss defeat).
2. **Add a Charged-Attack-only wall** blocking the direct critical path
   (The Rift → Antechamber → Boss Arena) so a player can't sequence-break
   straight to the King without ever touching Crag. Must be a real
   destructible wall (heavy-attack-only, full corridor height — no partial
   wall Phase Dash/jump can skip), not a `requires` flag (project's
   no-lock-and-key rule). Needs #1 done first or the wall is pointless
   (Charged Attack would still be trivially obtainable without the fight
   it's meant to gate).
3. **Confirm "more sparse Stillpoints" scope with the user** before
   touching anything — ambiguous whether it means the ability or Anchor
   checkpoint density (27 of ~28 rooms currently have at least one
   `anchors[]` entry). Likely reading: reduce Anchor density. Don't
   implement until confirmed.

## 5. Region atlas doc drift (found this session, needs reconciling)

`Plans/expansion.md` §3.13b describes a planned "Time/Mirror cluster" at
col 5, rows 1-4, south of the Vault. The actual built `mirror_veil_*` rooms
in `area.js` are at col 2, rows -2 to -5 — a different position entirely.
Either the plan moved and the doc wasn't updated, or Mirror Veil isn't the
region that doc section describes. Worth a quick pass to reconcile
`expansion.md`'s atlas against what's actually in `area.js` (also check
`worldmap.html`'s hand-maintained `PLANNED_REGIONS`/`CROSS_LINKS` list,
which has the same "keep in sync by hand" problem) before planning the
next region — building against a stale map wastes time.

## 6. Rooms/regions still to build

3 of the 13 `expansion.md` regions exist as skeletons (Mirror Veil, Event
Horizon, Chrono-Space Rift — empty rooms + doors, cross-linked, only 2 of
Mirror Veil's abilities/enemies actually placed, no Crag-level cave
population). Two dangling stub doors already point at the next one to
build:
- `crag_warden` → `graviton_core` (gated `graviton_surge`)
- `event_horizon_core` → `graviton_core` (gated `graviton_surge`)

Both are inert until **Graviton Surge** (the ability, `expansion.md` Phase
1) and the **Graviton Core** region itself exist — this is the natural
next region since the hooks are already sitting there. After that, per the
atlas in §3.13b: Observatory, The Polar Shift, The Void Expanse, Paradox
Engine, Warp Gate Nexus, The Inverted Spire, Static Field — 7 more, still
fully unplanned in code. Do item 5 above first so you're building against
an accurate map.

Also: `Plans/story.md` §4 describes **Void Tether** (grapple-hook ability,
key `T`), newer than Graviton Surge and tied to a not-yet-built companion
system — don't confuse the two when picking "the next ability" to build.

## 7. Enemy roster gap

10 of the ~34 enemies described in `expansion.md` §2 are built (fractured,
stutterer, crystal_sentinel, void_lancer, null_sentinel, anchor_wraith,
deflector_drone, mirror_sprite, echo_stalker, blitz_guard — the last one
isn't even in the expansion.md list, so it may be a since-added design not
reflected in the doc, worth checking). ~24 remain unbuilt, including both
Hard Enemies (Null-Gravity Brute, Temporal Paradox) and several of the
ability-countering enemies in §2.3 (Gravity Anchor, Absorber Husk, Temporal
Warden). Pick these opportunistically as you build the regions they're
tied to — most are scoped to a specific planned region already.

## 8. Standing docket items (`session_priorities.md`)

Still open, in the file's recommended order:
- **#3 — Dynamic bot-walker.** The static room linter (what "Validate This
  Room"/"Check All Rooms" in the editor now run) only checks reachability
  assuming a default loadout — it can't catch cross-region ability-order
  softlocks like the Phase-Dash-unobtainable bug from Phase 11. Build the
  headless walker per `Plans/room_verification_tool_plan.md`. This is
  explicitly flagged as worth doing **before** more region/ability work,
  since that exact bug class will keep recurring otherwise.
- **#6 — Performance pass + game feel.** Profile a full Crag playthrough,
  fix the top 2-3 bottlenecks, then tune hitstop/screenshake/landing-dust
  feel in small increments.
- **#7 — SFX rework.** Region-specific drone layers, attack-hit feedback
  synthesis, Stillpoint activation hum. Design detail in `roadmap.md`
  Phase 5.2a.

## 9. Something to just go check (not scoped, not fixed)

You flagged in your original level-editor wishlist that enemy patrol
"doesn't currently patrol, or its bugged." Nobody's looked at this yet —
worth a standalone investigation of `enemy.js`'s patrol state machine
(search for `patrolCenter`/`patrolDir`/`atLedge`) before building any
patrol-waypoint editor tool on top of it. UI on top of broken behavior
just hides the bug instead of fixing it.

## What NOT to start yet

- **Hazards / switches / moving platforms / one-way platforms** (your
  original wishlist items #11/#13/#14/#30) — these need new `game.js`
  runtime behavior before editor UI is useful. Rough effort: one-way
  platforms and hazards are moderate (a flag + a collision check each,
  following the existing `wall:true` pattern), switches and moving
  platforms are both high-effort new systems. Build the engine half first.
- **Full pixel-art/level-dressing tool** (wishlist #9) — explicitly scoped
  as its own separate initiative, not a next-session item.
- **`level_designer.html`** — planned (a live visual tuning tool for the
  Task 4 region decoration system), but the user hasn't confirmed they
  want it built yet. Ask before starting; it's a second tool comparable in
  size to `levelEditor.html` itself.
