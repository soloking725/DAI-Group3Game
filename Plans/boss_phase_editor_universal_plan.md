# boss_phase_editor.html — universal boss/miniboss coverage plan

Status: Phases 1 and 2 done (2026-08-04); Phase 3 still open. Written
2026-08-04 after an architecture audit (see "Current state" below) — that
section is now stale on the specific gap counts (written before Phase 1/2
landed) but still accurate on the tool's overall shape; trust the Phase
1/2 write-ups below and re-verify against the live files before assuming
anything else in this doc is current.

## Current state (more built than it looks)

`editor/boss_phase_editor.html` already isn't Sovereign-only. It has a
target dropdown covering the Sovereign plus all 12 `ComposedEnemy`-based
minibosses (from `game/enemy.js`'s `COMPOSED_PHASE_DEFS`), with two UI
branches:

- **Sovereign branch** — bespoke UI matching `BOSS_PHASE_CONFIG`'s bespoke
  shape (fixed 3 phases, reserved-slot/teleport/adaptation-bias system,
  weighted attack-method tables). Disk-write works (`writeFileBtn` →
  `editor_shell/targets.js`'s `bossPhaseConfig` target, `mode:'whole'`).
- **Generic miniboss branch** — variable-length phase-card list
  (`healthPct` trigger, 4 stat multipliers, freeform JSON for
  `attacks`/`movement`/`flags`/`spawn`), driven directly off
  `ComposedEnemy._applyPhase()`'s generic phase-patch shape. Already
  handles any number of phases for any of the 12 defs with no per-boss
  hardcoding. **Save is localStorage-only** (`ENEMY_PHASE_OVERRIDES_KEY`) —
  `writeFileBtn` is hard-blocked for every non-Sovereign target
  (`boss_phase_editor.html` ~line 528).

So 13 of 15 named bosses/minibosses are already tunable in one tool, in the
sense of "phase escalation + attack-weight + stat-multiplier" edits. The
real gaps are narrower than "rebuild this generically":

1. Miniboss edits never reach disk — only the Sovereign gets a permanent
   `game/enemy.js` write. Everyone else's tuning lives in `localStorage`
   overrides that a fresh browser/profile won't see.
2. Two minibosses have **no config surface at all**: `ColossusCore`
   (`game/enemy.js:1110`) and `TemporalWarden` (`game/enemy.js:4504`) are
   hand-written classes, not `ComposedEnemy`, with imperative state
   machines instead of a `.phases` array. They don't appear in the target
   dropdown today and can't without either a data surface or a rewrite.
3. Base attacks/movement/stats (as opposed to phase deltas) aren't
   editable in this tool for any target except read-only Sovereign
   context — and `enemy_designer.html`, which does edit that shape, works
   on a throwaway ad-hoc `def`, not the live named `*_DEF` consts. Two
   tools currently touch overlapping shapes with no shared save target.

## Plan

### Phase 1 — Disk-write parity for the 12 `ComposedEnemy` minibosses (highest value, lowest risk) — DONE 2026-08-04

No behavior changes required in `enemy.js`; this is pure editor-shell
plumbing, following the exact pattern already proven for
`BOSS_PHASE_CONFIG`.

- Add one `editor_shell/targets.js` entry per miniboss def (or one
  parameterized target keyed by def name) pointing at `game/enemy.js`,
  `declName: '<NAME>_DEF'`.
- Use `mode: 'path'` (patch just the `.phases` sub-key), **not**
  `mode: 'whole'` — unlike `BOSS_PHASE_CONFIG`, these consts carry
  hand-written design comments elsewhere in the object (base attacks,
  stat notes) that a whole-object replace would blow away. Confirm this
  against `constPatcher.js`'s existing patch modes before assuming `path`
  covers a nested array replace; if it only patches scalar/top-level
  keys, this may need a new patch mode — check first, don't assume.
- Wire the new targets through `ipcHandlers.js`/`preload.js` the same way
  `bossPhaseConfig` is wired.
- Un-block `writeFileBtn` in `boss_phase_editor.html` for non-Sovereign
  targets once the corresponding target exists; keep the alert as a
  fallback for any target that isn't wired yet (defensive, not silent).
- Verify: edit a phase multiplier for e.g. `graviton_sentinel` via the
  editor, disk-write, diff `game/enemy.js` to confirm only the `.phases`
  array changed and the surrounding comments/other fields survived.

**Built as:** 12 new `minibossPhases_<id>` entries in
`editor_shell/targets.js` (`mode: 'path'`, `game/enemy.js`, one per
`*_DEF` const), no `ipcHandlers.js`/`preload.js` changes needed — the
existing generic `stillpointAPI.patchPath()` IPC route already supported
this, it just had no registered targets to point at yet.
`boss_phase_editor.html`'s `writeFileBtn` handler now branches on target
type: Sovereign still uses `writeWhole('bossPhaseConfig', ...)`; minibosses
use `patchPath('minibossPhases_<id>', 'phases', ...)` via a new
`MINIBOSS_WRITE_TARGETS` id map (must stay in sync with
`editor_shell/targets.js`'s entries — same manual-sync caveat as
`minibossRegistry.js` vs. `game_state.js`'s `MINIBOSS_CLASSES`). Button
label and in-code comments updated to drop the "Sovereign only" framing.
`findNonFiniteNumber()` guard applied to `def.phases` before write, same
as the Sovereign path.
Verified via a scratchpad-copy dry run (not the real file): patched
`GRAVITON_GUARD_DEF.phases` on a throwaway copy of `game/enemy.js` and
diffed — only the `phases` array changed, the inline block/shield design
comment and every other def were byte-identical. All 12 new target ids'
`declName`s confirmed present as top-level consts in the real
`game/enemy.js`. Not yet exercised through the actual Electron app UI
(this repo's CLAUDE.md hard-bans self-testing in a browser/preview) — the
user should confirm end-to-end from `npm start` → Boss Phase Editor →
pick a miniboss → edit a phase → "Write to source file" → check
`game/enemy.js` and the `.bak` file.

### Phase 2 — Decide fate of the two bespoke minibosses — DONE 2026-08-04

User's call: **Option B for `ColossusCore`** (full `ComposedEnemy`
migration), **Option C for `TemporalWarden`** (narrow bespoke tuning
surface, mechanics untouched) — a genuine split, not a single answer for
both, since the two bosses turned out to have very different
generalizability once actually researched.

**`ColossusCore` — migrated onto `ComposedEnemy`** (`game/enemy.js`, the
bespoke class replaced in place with `COLOSSUS_CORE_DEF` + a slim
`class ColossusCore extends ComposedEnemy`). Its mechanics (two distance-
gated attacks, a heavy-attack-only damage gate, a hold-position idle) map
onto the shared vocabulary with two small, generic, backward-compatible
additions:
- New `MOVEMENT_BEHAVIORS.ground_hold` type (approach-past-a-threshold,
  decelerate-to-a-stop, no patrol) — `ground_chase`'s patrol fallback
  can't substitute (it oscillates around a center rather than holding
  still).
- New optional `hitboxOffsetX`/`hitboxOffsetY` params on `melee_swing`
  (default `0`/`4`, matching every existing user's behavior exactly) so
  an overhead-swing hitbox can sit higher/further forward than that
  type's default low-slash offset.

Everything else (the heavy-only gate, per-frame facing tracking, the
single shared cooldown across both attacks, the hand-painted crack/
molten-core/telegraph visuals) is a subclass-local override — the
established `super.x() + custom logic` pattern `QuantumPursuer`/
`ElectromagneticGolem` already use elsewhere in this file, not new shared
engine surface. Two accepted, documented behavior deltas (verify by feel
during playtesting): `dash_charge`'s hitbox is the whole enemy body
(generic convention) rather than the original's narrower forward sliver;
a charge that clips a wall zeroes velocity generically rather than
instantly aborting back to idle. Wired into `COMPOSED_PHASE_DEFS`/
`editor_shell/targets.js` (`minibossPhases_colossus_core`)/
`boss_phase_editor.html`'s `MINIBOSS_WRITE_TARGETS` exactly like the other
12 — no editor-side special-casing needed, Phase 1's machinery already
covers any id present in `COMPOSED_PHASE_DEFS`.

**`TemporalWarden` — stays bespoke, gets a narrow numeric tuning branch.**
Its rewind/Stillpoint-resistance mechanics are explicitly documented
(twice, independently — in `game/enemy.js`'s own comment and in
`Plans/enemy_system_plan.md`) as a deliberate one-off, "not a template to
repeat elsewhere" — migrating those specific mechanics onto `ComposedEnemy`
would mean building brand-new generic engine infrastructure (a rewind/
checkpoint module, a per-instance time-scale override) specifically to
undo that stated design decision, so it was correctly ruled out. Instead:
its previously-inline magic numbers (bolt telegraph/cooldown/speed/damage,
kite distance/deadzone/speed) were named as 7 new top-level consts
alongside the 6 that already existed, then wired into a new third UI
branch (`boss_phase_editor.html`'s `#bespokeUI`) — 13 grouped number
inputs, disk-write via a new `temporalWardenStatVar` `rawVar` target
(`editor_shell/targets.js`), the exact same pattern `enemy_editor.html`
already uses for other enemies' stat consts via `writeNamedVar`. No
localStorage live-preview offered for this branch (deliberately — these
are plain `const`s with no runtime override-application path, matching
`enemy_editor.html`'s own precedent of disk-write-only for `rawVar`-backed
fields, confirmed by reading that tool's actual save path rather than
assuming a live-tuning story existed).

**Known dormant follow-up, not fixed here (out of scope for this
migration):** `editor/anim_editor.html`'s Colossus Core entry
(`kind:'bespoke'`, its own `dissectColossus()` helper) still reads the
now-removed `this.state` string values (`'telegraph'`/`'charging'`/
`'swing_telegraph'`/`'swinging'`). This is currently harmless — zero
`colossus_*` `ANIM_DEFS` entries exist, so nothing at runtime or in that
tool is actually exercised through it yet — but it will need updating
(most likely switched to whatever the other `kind:'composed'` minibosses
use there) whenever anim-authoring work on Colossus Core actually starts.

Verified via scratchpad-copy dry runs (never the real file, per this
repo's standing rule): `patchPathInFile` on a throwaway copy for
`COLOSSUS_CORE_DEF.phases`, and `patchConstInFile` for two
`TEMPORAL_WARDEN_*` consts — both diffed clean (only the intended value
changed, every comment/other field byte-identical), both patched copies
passed `node --check`. All new decl/const names confirmed present as real
top-level declarations. `boss_phase_editor.html`'s embedded `<script>`
extracted and syntax-checked directly. **Not exercised through the actual
Electron app UI or in a real fight** (this repo's CLAUDE.md hard-bans
browser/preview self-testing) — see this entry's own tail for exactly
what the user should confirm by hand.

### Phase 3 — Reconcile base-stat editing overlap with `enemy_designer.html`

Pick one ownership split and stick to it — don't let both tools grow
partial, diverging edit surfaces for the same named defs:

- **Recommended: keep the split by concern, close the loop on**
  **`enemy_designer.html`'s "load real def" gap.** boss_phase_editor.html
  stays phase-deltas-only (its current scope, already coherent).
  `enemy_designer.html` gains a "load `<NAME>_DEF` from the live registry"
  mode (already has JSON import — the gap is *saving back* to the real
  const, not loading) with its own disk-write target in
  `editor_shell/targets.js`, so base attacks/movement/stats for named
  minibosses have exactly one editable home, distinct from phase tuning.
  Cross-link the two tools (boss_phase_editor.html already links out to
  enemy_designer.html for base stats at ~line 132 — update that link's
  caveat once save-back exists instead of "changes there aren't tied back
  to the live def").
- Alternative (not recommended): duplicate base-stat fields into
  boss_phase_editor.html directly. Rejected — doubles maintenance surface
  for fields enemy_designer.html already renders, and blurs this tool's
  otherwise-clean "phase escalation only" scope.

## Sequencing / recommendation

Phases 1 and 2 are both done (2026-08-04) — see their own write-ups above
for what shipped and what's still only scratchpad-verified vs. hands-on
confirmed. Phase 3 (the `enemy_designer.html` base-stat overlap) is the
only remaining open item, and still hinges on a decision only the user can
make (whether closing that gap is worth doing now vs. later) — flag it as
an open question rather than assuming an answer and building it.

## Non-goals

- No change to `BOSS_PHASE_CONFIG`'s own shape or the Sovereign's bespoke
  reserved-slot/teleport/adaptation system — that asymmetry vs. minibosses
  is intentional (the Sovereign is mechanically unique) and shouldn't be
  generalized away.
- No new phase-schema abstraction beyond what `ComposedEnemy._applyPhase()`
  already supports — the generic miniboss UI branch already handles
  variable phase counts/shapes correctly; this plan doesn't touch that.
