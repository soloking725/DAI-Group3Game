# Room Verification Tool — Design Plan (not built yet)

## Why this exists

Building Crag of the Colossus surfaced three real bugs, all invisible from just
reading the `area.js` data or loading the room once in a browser:

1. **Pit-death threshold mismatch** — the room loaded fine, rendered fine, and
   killed the player instantly on entry because `game.js`'s pit-death formula
   assumed a shape of room this one didn't match.
2. **Unreachable platform** — an upper-route dead-end whose "secret" no longer
   made sense once the floor layout changed underneath it.
3. **Door embedded in solid geometry** — a transition trigger positioned
   inside a platform's own body instead of in the air where the player's
   standing hitbox actually is, making it physically untouchable.

None of these are syntax errors, none throw exceptions, and none are visible
from a single screenshot taken at the room's spawn point. They only show up by
actually trying to traverse the room. That's the gap this tool closes — catch
this class of bug before a human has to find it by playing.

## Three components (was two — the Spawn button added 2026-07-29, user request)

### 1. Static layout linter (fast, runs on every `area.js` change)

Pure data analysis, no simulation. For each room:

- **Reachability graph**: build a graph of platforms as nodes, edges where one
  platform is reachable from another via a normal jump, a dash, or a fall
  (using the real physics constants — `JUMP_FORCE`, `GRAVITY`, `MOVE_SPEED`,
  `DASH_SPEED`, `PHASE_DASH_SPEED` — to compute actual reachable horizontal/
  vertical envelopes, not guessed numbers). Flood-fill from the room's entry
  point(s) (every `toX`/`toY` any transition targets). Flag any platform,
  enemy spawn, stillpoint, ability reward, or lore fragment that isn't in the
  reachable set — **unless** it's behind a `destructible: true` wall or an
  ability-gated path the player doesn't have yet on a first pass (those are
  legitimate secrets, not bugs — the linter needs to know the room's intended
  ability loadout to tell the difference, see "loadout tiers" below).
- **Fall-safety check**: for every gap between two platforms on what the room
  author has *not* explicitly marked as a hazard section, confirm the gap is
  within jump/dash range. For rooms using the "continuous cave floor" pattern
  (current direction per user feedback), also just directly verify there is
  no x-range with zero platform coverage along the main floor band at all.
- **Door-in-geometry check**: for every `transitions[]` entry, confirm the
  hitbox overlaps the *player's standing bounding box* at that location
  (computed as `platformTop - playerHeight` to `platformTop`), not the
  platform's own solid body. This is exactly the bug class found in #3 above
  — codify it as a permanent check, not a one-off fix.
- **Compass graph validation** — already built (`validateAreaGraph()` in
  `area.js`). The static linter should just call it, not reimplement it.
- **Two-way walkability**: for every non-`oneWay` compass connection, confirm
  a transition exists in *both* rooms (already partially covered by the
  symmetry check in `validateAreaGraph()` — this extends it to also verify
  the physical doors, not just the declared connection records).

Output: a plain report per room — pass, or a list of specific failures with
coordinates, similar in spirit to the existing `[compass graph]` console
errors.

### 2. Dynamic bot walker (slower, run before considering a room "done")

A headless simulation, similar in shape to `debug_v1.html`'s sandboxed iframe
approach, but driving a scripted agent instead of scripted key sequences:

- Spawn the bot with **full health, healing disabled from being needed**
  (effectively invincible — `player.health` pinned, or `invincibleTimer`
  forced high) so hazard/enemy damage doesn't abort the traversal attempt
  early; the goal is reachability, not a difficulty playtest.
- Give it the room's **declared expected loadout** — see "loadout tiers"
  below — not every ability unconditionally. A room's designer should state
  up front which abilities the player is assumed to have on a first pass
  through that room, and the bot should be tested against exactly that
  loadout (plus a second pass with everything unlocked, to verify Tier 3
  secrets *are* reachable once the right ability exists).
- Movement policy: greedy frontier search — from the current platform, try
  every reachable neighbor (per the static linter's reachability graph) not
  yet visited, biased toward those closer to an unvisited transition/pickup;
  fall back to short random jitter if stuck for N frames (catches cases the
  static graph missed, e.g. an enemy pushing the bot into a soft-lock).
- Goals to verify per run: reach every transition, reach every stillpoint,
  reach every ability reward, and — critically — **use every transition
  and confirm the landing point on the other side is also safe** (this is
  the specific check that would have caught the pit-death bug: entering a
  room via a script-driven `switchArea()` call and immediately checking
  `player.health`/`gameState` a few dozen frames later).
- Time-boxed per room (e.g. 30 real seconds of simulated frames) — a bot that
  hasn't reached everything by then is itself a signal the room is too large/
  convoluted for even a scripted-optimal path, worth a human look regardless
  of whether it's a hard "fail."

Output: per-room reachability report (same shape as the static linter) plus a
recorded path log for any room that failed, so a human can see exactly where
the bot got stuck rather than re-deriving it by hand.

### 3. "Spawn" button — actually jump into the room yourself (2026-07-29, direct request)

Per direct request: the static linter and bot walker both produce *reports*, but the
user wants a one-click way to go stand in the room themselves and look — the report
tells you *that* something's wrong (or that everything passed), a spawn button lets you
immediately confirm *how it actually looks/feels*, no different from
`enemy_editor.html`'s existing "Test in Arena" handoff to `enemy_test.html`, just
targeting an arbitrary real room instead of a dedicated arena.

**Where the button lives**: next to every room row in both the static linter's report
and the bot walker's per-room result (pass or fail — a passing room is still worth
eyeballing, not just failures), plus a free-standing version in `room_progress.js`'s
`--full` output once that's surfaced in the (also newly planned) Project Progress
Dashboard, so "spawn here" is reachable from wherever a room's status shows up, not
just this one tool.

**Mechanism** (small, self-contained dev-only harness, same spirit as
`debug_v1.html`'s sandboxed real-game boot):

- A tiny query-param handler, added to `index.html` (or the harness page this tool
  lives on) guarded so it only ever fires in a dev context: `?spawnRoom=<roomId>`
  (optionally `&loadout=<comma-separated ability keys>|all`).
- After the real `init()` runs (so all the usual setup — `AREAS`, `player`, `abilityState`
  defaults — already happened), override the two things `init()` hardcodes:
  `currentAreaId = 'spawn_area_1'` becomes the requested room id, and `gameState =
  'menu'` becomes `'playing'` (skip the main menu entirely — you want to land *in* the
  room, not one extra click away from it). Reposition the player at the room's first
  `anchors[]` entry (same fallback `switchArea()` already uses when a transition has no
  manual spawn point) rather than a hardcoded `(100, groundY-60)`, so you land somewhere
  sane in an arbitrary room instead of possibly inside geometry.
- **Grant the requested loadout** before dropping the player in — this is exactly why
  the "loadout tiers" concept below matters for this feature too, not just the bot
  walker: inspecting `graviton_core_room2` with zero abilities means every ability-gated
  path in it is unreachable and looks broken when it isn't. Default to `all` (every
  `abilityState.hasX` flag true, `player.fractureMax` maxed) for quick manual eyeballing;
  support the room's own declared `expectedLoadout.onEntry` for a truer "what does a
  first-time player actually see" check when that's the thing being verified instead.
- No save-game interaction at all — this harness should never read or write a real save
  slot, so jumping around rooms for inspection can't corrupt or overwrite actual
  progress. Same "never touch real save data from a dev tool" principle
  `enemy_test.html`/`companion_test.html` already follow.
- Once in the room, it's just the real game — real input, real camera, real physics,
  real enemy AI (if any are placed) — no scripted bot involved for this path, that's
  the whole point: the user drives it themselves, this only removes the "navigate the
  whole game from the main menu to get here" friction.

**Explicitly not this feature's job**: this doesn't replace the bot walker's automated
reachability report (§2) — it's the *manual follow-up* once a report flags something (or
even when nothing's flagged and you just want to eyeball a room after a layout edit).
Keep both: automated report for scale (71 rooms), spawn button for the specific
room you actually care about right now.

## Loadout tiers (needed by all three components)

Every room should declare, alongside its existing data, something like:

```js
expectedLoadout: { onEntry: ['phase_dash'], secretsRequire: ['charged_attack'] }
```

so the verification tool knows what "should be reachable on a first pass"
means for that specific room, instead of guessing. This is a small addition
to the room verification tool's scope, not a request to add this field
everywhere immediately — flag it here so whoever builds this tool knows it's
a prerequisite, not an afterthought.

## Where this should live

- Static linter: a plain function (like `validateAreaGraph()`), callable from
  Node for CI/pre-commit use and from the browser for interactive dev use —
  no DOM dependency, so it can run in both contexts.
- Dynamic bot walker: an addition to `debug_v1.html`'s existing sandboxed-
  iframe pattern (it already knows how to boot a real game instance and drive
  `gameLoop()`/`switchArea()` — see the `R10` room-survival check added in
  this session, which is a minimal single-frame version of exactly this idea)
  — OR a new standalone page (`room_verify.html`) if it grows large enough
  that bolting it onto `debug_v1.html` gets cluttered. Decide once it's
  actually being built, not now.

## Explicitly not in scope for this tool

- Judging whether a room is *fun* — this only checks reachability/safety, not
  design quality, pacing, or difficulty.
- Enemy AI correctness — a separate concern (see the enemy targeting/
  detection work), though the bot walker will incidentally exercise enemy
  collision since it's playing through real rooms with real enemies spawned.
- Auto-fixing anything it finds — this tool reports, a human (or a future
  session) fixes.
