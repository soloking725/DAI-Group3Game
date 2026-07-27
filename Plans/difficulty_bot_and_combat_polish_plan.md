# Difficulty-Scoring Bot + Combat Polish (Input Buffer / Hit Impact / Hitstop) — Plan

Not started. Written 2026-07-24 as a scoping doc for two independent pieces
of work, bundled here because they were discussed together — implement
either one on its own, in any order, whenever there's a free session for it.
Neither blocks content work (enemy/room building) and neither is blocked by it.

---

## Part 1 — Difficulty-Scoring Bot (NEAT-style evolved agent)

**Status: v1 built 2026-07-24** — `game/agentController.js` +
`editor/difficulty_bot.html` + the `bot_arena` room in `game/area.js`.
Registered in `dev_hub.html`. Verified with `node --check` only (per this
repo's standing no-browser-testing rule) — not yet run in-browser, so the
first real session with it doubles as the actual verification pass. See
`roadmap.md`'s 2026-07-24 entry for the full landed-scope note. The rest of
this section is the original design spec — still accurate to what was
built, kept as-is rather than rewritten after the fact.

### Goal

A headless agent that plays the real game against a boss/miniboss in
`enemy_test_arena` and produces a quantitative difficulty score (survival
time, damage taken, deaths-per-N-attempts) — replacing guesswork with a
number, and giving `Plans/room_difficulty_calculator.js`'s hand-tuned
`difficultyConfig` weights something to be checked against.

**Not in scope for this pass:** the "final boss learns your playstyle"
idea. That's a separate, later project (imitation learning on recorded
player sessions, not evolved-from-scratch play) — see the note at the end.

### Why this is tractable here specifically

- `enemy_test.html` already spawns any real enemy/boss class in an isolated
  arena with a chosen ability loadout — that's the eval harness, already built.
- `game/input.js` exposes `keys{}`/`justPressed{}` as the only interface
  between "something pressing buttons" and the game — an agent can drive
  the game by writing to these objects directly, no engine changes needed.
- `debug_v1.html` already proves the game runs headless-ish: it boots the
  real game in a sandboxed iframe and dispatches synthetic `KeyboardEvent`s.
  Same pattern, different consumer.
- The game loop is a fixed-timestep accumulator (confirmed correct per
  `roadmap.md` R10 note) — deterministic enough for repeatable fitness runs.

### Architecture

New file: `game/agentController.js` (loaded only by the new tool below,
never by `index.html`). Self-contained, no dependency on other `game/*.js`
files beyond reading `player`/`boss`/`gameState` off `window` (same
pattern `debug_v1.html` already relies on — see the `window.player`/
`window.gameState` getters noted in `Plans/CLAUDE.md`'s architecture map).

```
game/agentController.js
  - Genome: fixed-size Float32Array of weights (small feedforward net,
    NOT full NEAT topology evolution for v1 — see "Scope cut" below)
  - Inputs (~14 base + per-enemy-awareness inputs, see below)
  - Outputs (8): left, right, jump, attack, dash, block/dodge (if mapped),
    stillpoint, charged-attack-hold
  - step(dt): reads inputs off window state, runs one forward pass,
    writes booleans into window.keys / window.justPressed for one frame
  - Pure math + object reads/writes — no DOM, no rendering — so it can run
    at uncapped speed (see "fast-forward" below)
```

### The arena — bounded box, not the open test-arena room

`enemy_test_arena` (`area.js:4391`) is a 2000px-wide open floor with a
couple of floating platforms and no side walls or ceiling — fine for manual
testing, wrong for the bot: an evolved agent will happily discover
"run to the edge of the world and kite forever" as a fitness-maximizing
strategy that has nothing to do with actual difficulty, and an unbounded Y
axis means jump-spam-to-escape is also free.

Plan: a small **new dev-only room**, `bot_arena`, alongside
`enemy_test_arena` in `area.js` (same "dev-only room, skipped by the
`col`-based room linter" pattern already used for `enemy_test_arena` —
see the `typeof room.col !== 'number'` skip in `dev_hub.html`'s validator).
Square-ish bounded box: floor, a ceiling platform, and two side walls thick
enough that `physics.js`'s `resolveEntityCollision` treats them as solid
(same collision path every other platform already uses — no new physics
code needed, just geometry: one `platforms` entry each for floor/ceiling/
left wall/right wall framing a fixed interior, e.g. 800×500). This also
makes the "time-in-room"/edge-distance inputs below meaningful, since the
box has a fixed, known extent instead of an arbitrary 2000px runway.

### Customization — enemies, count, and ability loadout

Exposed as UI controls in `editor/difficulty_bot.html`, all before hitting
"Run Evolution":

- **Enemy roster**: multi-select over `ENEMY_REGISTRY` (same list
  `enemy_test.html`'s dropdown already reads from) — pick 1 or more
  enemy types to populate the arena with. Supports both "evaluate one
  boss alone" and "evaluate a gauntlet of regular enemies" runs.
- **Count**: a spawn count per selected type (reuses `enemy_test.html`'s
  existing spawn-count control, not a new mechanic) — with bounded-arena
  spacing logic needed so N enemies don't spawn stacked in an 800×500 box;
  a simple ring/grid placement around the arena perimeter is enough.
- **Ability loadout level**: `enemy_test.html` already lets you choose the
  player's ability loadout when spawning (which abilities are "granted").
  Difficulty bot reuses the exact same loadout picker, plus a numeric
  **"ability tier"** concept worth adding here since it doesn't exist yet:
  a simple 1-3 knob that scales tunable constants already exposed as
  live `var`s (dash speed/cooldown, attack cooldown, max health — see
  `Plans/CLAUDE.md`'s note that "almost all tunable numbers are named
  consts") so you can ask "how hard is this boss for a player who *has*
  Phase Dash + full health vs. one who's undergeared." This is the actual
  point of making it customizable — difficulty isn't one number, it's a
  matrix over (boss, enemy count, player gear).

### Enemy-awareness inputs — yes, this needs its own input block

A bot that only sees position/HP/cooldown numbers (the original ~14-input
list) will learn to react to telegraphs by pixel-watching, which works but
converges slower and doesn't transfer between enemy types. Since
`ComposedEnemy` (`enemy.js:2231`) already carries fully structured attack
data — `this.attacks[]`, each with a `type` key into `ATTACK_BEHAVIORS`,
`windupFrames`, `minRange`, `weight`, `hyperArmor`, plus `this.defense`
(block/dodge/breakout/dashPunish flags) — the *same* data
`enemy_designer.html` edits is directly readable off the live enemy
instance at eval time, not something that needs re-deriving:

- **Per-encounter, at genome-eval start**: read the spawned enemy's
  `.attacks` array and `.defense` config once, and feed a compact
  encoded summary into the net's input vector (e.g. one-hot/multi-hot
  over `ATTACK_BEHAVIORS` types present, min/max windup frames present,
  whether `hyperArmor` or a `defense` verb is in play). This is "the bot
  gets told what it's up against" — closer to a player skimming
  `enemy_designer.html`'s stat sheet before a fight than to blind trial.
- **Per-frame, during combat**: `this._activeAttack` /
  `this.windingUp` / `this.attacking` (all already instance fields on
  `Enemy`/`ComposedEnemy`) tell you *which* attack is currently winding up
  and its windup-frame countdown — feed the current attack's `type` (or
  just its `hyperArmor`/`minRange` shape) as a live input alongside the
  existing distance/HP inputs, so the net can learn distinct responses
  per attack type (e.g. don't engage during `hyperArmor` windup, do
  punish `counter_stance` bait) instead of one generic dodge reaction.
- This means the input vector size isn't fixed at 14 — it's
  `14 + (attack-type one-hot width)`, computed once `ATTACK_BEHAVIORS`'s
  key list is known (read it directly off the object, don't hardcode a
  count, so new attack verbs added later don't silently break the net
  shape).

Net effect: yes, the bot is aware of the enemy's real behavior data — not
by "watching and learning what an attack looks like from scratch" (that's
a valid design, just a slower/different project — pure pixel/state
imitation), but by treating the same structured data the designer already
authors as ground truth, so evolution spends its budget learning
*response policy*, not attack recognition.

New tool: `editor/difficulty_bot.html`
  - Loads the real game scripts in the same order as `index.html` (same
    convention `ability_tester.html`/`companion_test.html` already use)
  - UI: enemy roster multi-select + per-type count, ability-loadout /
    tier picker, population size, generation count, "Run Evolution" button
    (all per "Customization" above)
  - Fast-forward: call the game's fixed-timestep update function directly
    in a tight loop (no `requestAnimationFrame`, no canvas draw except a
    periodic preview redraw) — this is the actual speed win, not
    parallelism. Expect 50-200 sim-frames per real millisecond once
    rendering is skipped, so a full generation (e.g. 50 genomes × 20s of
    simulated combat) runs in a few real seconds, not minutes.
  - Fitness function (v1, simple and legible over clever):
    `fitness = survivalFrames + damageDealtToBoss*2 - damageTakenByPlayer*0.5
               + (bossKilled ? 5000 : 0)`
  - Selection: truncation selection + Gaussian weight mutation + single-point
    crossover — standard, no need for anything fancier at this scale
  - Output: best genome's fitness curve across generations (this IS the
    difficulty score — how many generations/how much fitness it takes to
    reliably beat a boss is a proxy for how hard that boss actually is),
    plus a "replay best genome at real speed" button for eyeballing it

### Scope cut for v1 — fixed topology, not full NEAT

True NEAT (evolving network topology, not just weights) is a real
implementation project on its own (speciation, innovation numbers,
crossover-by-gene-alignment). For a difficulty *score*, topology evolution
isn't the point — a fixed small feedforward net (14 in → 12 hidden → 8 out,
~250 weights) with weight-only evolution gets 90% of the value at a
fraction of the code. Revisit true NEAT only if v1's fixed net can't learn
a boss at all (unlikely for anything currently built — the bosses aren't
that mechanically deep yet).

### Per-boss considerations

- **The King / ColossusCore**: multi-phase state machines — fitness should
  weight *phase reached* in addition to raw survival, or evolution will
  plateau at "survive phase 1 forever" instead of pushing through
  Confirm the death-timer gating pattern (`roadmap.md`'s "Boss/miniboss
  death pattern" note) doesn't need special-casing for headless runs —
  it shouldn't, since it's just `boss.update()` being called every frame
  regardless of render.
- Reset-between-genomes: needs a clean re-spawn of player + boss state
  each genome run, not a full page reload (too slow at population scale).
  Likely a `resetArenaForAgent()` helper in the new tool that re-runs
  whatever `enemy_test.html` does on spawn, minus the DOM/UI parts.

### Estimated scope

Medium — most of the risk is in "fast-forwarding the game loop cleanly"
(making sure nothing in `game.js` implicitly depends on real wall-clock
time or `requestAnimationFrame` timing rather than the dt accumulator) and
in reset-between-genomes being actually clean (stale `hitTargetsThisSwing`,
lingering VFX timers, etc. — anything that isn't part of the authoritative
reset path could quietly bias fitness across genomes). Budget a full
session for the harness + fixed-net evolution loop, plus a second pass
once it's run against a real boss to fix whatever assumption about
"headless == real" turns out wrong.

### Later, separate project — style-mirroring final-boss agent

Real-time online learning during a single playthrough is the wrong shape
for this (too little data per run, players adapt faster than an agent
converges, reads as random rather than "learned"). The version that
actually works: **record player action logs during normal playtesting**
(dodge timing relative to boss telegraphs, preferred approach angle,
punish windows the player habitually falls for, stillpoint usage timing),
then train a small imitation-learned or hand-tuned heuristic profile
*offline* from that log, and bake it into a fixed moveset for the final
boss (who is narratively the player, per `story.md`/`lore.md`'s Sovereign
framing — mechanically fitting, not just thematically). Needs recorded
playtest data to exist first, which it doesn't yet. Revisit once there's
been real playtesting on the 4 built rooms — don't start this before then.

---

## Part 2 — Input Buffering, Centralized Hit Impact, Hitstop Cleanup

Three related but separable fixes, all from `Plans/dev_tools_roadmap_status.md`'s
"Still open" Phase 2 list.

### 2a. Centralized `triggerHitImpact(severity)`

**Current state**: `game.js` sets `screenShake`, `screenShakeIntensity`,
and `hitstopTimer` together, by hand, at ~19 separate call sites (grep
confirms lines in the 400s, 2600s-3600s range) — e.g.:
```js
screenShake = Math.max(screenShake, 12); screenShakeIntensity = Math.max(screenShakeIntensity, 6);
hitstopTimer = Math.max(hitstopTimer, 8);
```
repeated with slightly different magic numbers per hit type (light attack,
heavy attack, guard-break, tether-latch, boss phase transition, etc.).

**Plan**: one function in `game.js` (near the other combat-feel state):
```js
const HIT_IMPACT_PRESETS = {
  light:    { shake: 4,  shakeIntensity: 2, hitstop: 3 },
  medium:   { shake: 8,  shakeIntensity: 4, hitstop: 5 },
  heavy:    { shake: 12, shakeIntensity: 6, hitstop: 8 },
  critical: { shake: 16, shakeIntensity: 8, hitstop: 12 },
};
function triggerHitImpact(severity, opts) {
  const p = HIT_IMPACT_PRESETS[severity];
  screenShake = Math.max(screenShake, opts?.shake ?? p.shake);
  screenShakeIntensity = Math.max(screenShakeIntensity, opts?.shakeIntensity ?? p.shakeIntensity);
  hitstopTimer = Math.max(hitstopTimer, opts?.hitstop ?? p.hitstop);
}
```
Then replace each of the ~19 sites with a call, mapping their current
magic numbers onto the nearest preset (a couple sites already do exactly
`player.heavy ? X : Y` branching — those become
`triggerHitImpact(player.heavy ? 'heavy' : 'medium')`, which is a legibility
win on top of the dedup). Sites with genuinely unique numbers (the 40/30
`screenShake` values around line 2602/2622, which look like boss-specific
set-pieces, not per-hit combat feel) can pass `opts` to override, or stay
as direct assignment if they're truly one-off cinematic beats rather than
"a hit landed" — judgment call per site, not a blanket find/replace.

**Estimated scope**: small — mechanical, but 19 call sites to individually
read (not blind-replace, since a couple have nonstandard values worth
preserving deliberately) means a careful single session, not a quick pass.

### 2b. Wire `attack_windup`/`attack_strike`/`attack_recover` into the player animator

**Current state**: `game/animdata.js` already defines these three poses
for at least two attack animations (`attack_windup`: 3f, `attack_strike`:
5f with the active hitbox, `attack_recover`: 4f, `cancelableFrom: true`),
and `POSE_RENDERERS` already implements draw functions for all three
(`animdata.js:112-120`). But `player.js`'s actual attack state machine
(`attackTimer`/`attackCooldown`, `player.js:95-705`) doesn't reference
`Animator` or these pose names at all — it's still driving off the legacy
manual timer/hitbox path (`attackVFX.js`), same as the rest of the
not-yet-migrated entities per the "migration is deliberate per-entity
work" note in `Plans/CLAUDE.md`'s architecture map.

**Plan**: this is the animation-system migration for the player's attack,
specifically. Steps:
1. Give `Player` an `Animator` instance (pattern already exists for
   whichever entity was migrated first — check `animdata.js`/`Animator`
   usage sites for the reference implementation before writing a new one).
2. On attack start, `animator.play('slash_1')` (or whichever `ANIM_DEFS`
   key) instead of setting `attackTimer` directly.
3. Replace the current `attackTimer <= 0` / `ATTACK_DURATION` checks with
   reads off the animator's current frame's `cancelableFrom` flag — this
   is the actual payoff, since it means combo-cancel windows come from
   the same data `anim_editor.html` edits, instead of a second hardcoded
   source of truth.
4. The active-hitbox frame (`attack_strike`, which already carries hitbox
   data in `animdata.js`) replaces whatever `attackVFX.js` currently
   computes for hitbox timing — but `attackVFX.js`'s actual shape math
   should stay (it's the thing anim_editor.html's "Dissect from current
   game" button depends on matching, per its own file header).
5. Verify combo-cancel timing didn't shift — `ATTACK_DURATION` and the
   anim def's total frame count (3+5+4=12) need to match, or every combo
   window in `combo.js`'s `COMBO_DEFS` silently desyncs.

**Estimated scope**: medium-large, and the riskiest of the three — it's
touching the actual input-to-hitbox-to-cancel pipeline for the player's
core attack, not just adding a new independent system. Do this in its own
session with nothing else in flight, and re-run `debug_v1.html` afterward
(input/state-transition changes are explicitly called out in
`Plans/CLAUDE.md` as needing a manual debug-console pass).

### 2c. Attack input buffering during recovery frames

**Current state**: `player.js:593` — attack only registers on
`wasActionJustPressed('attack') && this.attackCooldown <= 0`. A press
during `attackCooldown > 0` (i.e. during recovery) is simply dropped —
there's no buffer, confirmed by grep (no `attackBuffer`/`bufferedInput`
anywhere in `player.js`).

**Plan**: standard input-buffer pattern, small and self-contained:
```js
// in Player constructor:
this.bufferedAttack = 0; // frames remaining that a buffered attack press is still valid

// in the input-handling block, replace the direct check with:
if (wasActionJustPressed('attack')) this.bufferedAttack = ATTACK_BUFFER_WINDOW; // e.g. 6 frames
if (this.bufferedAttack > 0) this.bufferedAttack--;

const attackRequested = this.bufferedAttack > 0 && (wasActionJustPressed('attack') || this.bufferedAttack > 0);
if (attackRequested && this.attackCooldown <= 0 && !this.ducking) {
  this.bufferedAttack = 0; // consumed
  // ...existing attack-start logic
}
```
(exact placement depends on which of the ~4 attack-trigger conditions at
`player.js:593/604/675` should all honor the buffer — likely all of them,
since they're the same underlying "start an attack" decision gated by
different pre-conditions).

**Interacts with 2b**: if the animator migration lands first, "recovery
frames" becomes `animator.currentFrame().pose === 'attack_recover'`
instead of `attackCooldown > 0` — cleaner, and buffering naturally aligns
with the `cancelableFrom` flag already in the anim data (a buffered press
during a cancelable recovery frame should probably combo-cancel instead of
queueing a fresh attack, which is a design decision to make explicitly,
not fall out accidentally). **Recommendation: do 2b before 2c** if both
are on the table, since 2c is meaningfully simpler once recovery frames
are animator-driven rather than raw timer math, and doing 2c first risks
throwaway work.

**Estimated scope**: small on its own; small-medium if sequenced after 2b
per the above.

### Suggested order

1. **2a** (centralized hit impact) — smallest, safest, no behavior change
   risk, pure legibility win. Good warm-up/standalone session.
2. **2b** (animator migration for player attacks) — do this before 2c.
3. **2c** (input buffering) — cheap once 2b's `cancelableFrom` data exists
   to hang the buffer logic off of.
4. **Part 1 (difficulty bot)** — fully independent of 2a-2c, can slot in
   anywhere, including before all three if that's more motivating to build
   first.
