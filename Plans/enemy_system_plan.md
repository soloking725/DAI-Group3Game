# Enemy System — Composable Modules Plan (2026-07-15)

**Doc-currency note (2026-08-03):** re-checked against code — Phase A's
registries (`ATTACK_BEHAVIORS`/`COUNTER_EFFECTS`/`ON_DEATH_EFFECTS` in
`enemy.js`) are still live and load-bearing; `enemy_attack_vocabulary_plan.md`
builds its newer attack-verb layer directly on top of them. This doc wasn't
in `CLAUDE.md`'s pointer list despite being current architecture — now added.
Everything below marked **Plan — Phase B** is backlog/wishlist, not active
planning — cross-check against `expansion.md`'s roster before assuming any
of it is scheduled.

## Status: Phase A is BUILT (2026-07-15), not yet human-playtested

Per the standing `CLAUDE.md` rule, this was built without opening a
browser — verified only via `node -c` syntax checks and a careful manual
read-through of the logic, not an actual playthrough. **Treat this as
"should work, needs your playtest," not "confirmed working."** See
"How to test this" at the bottom of this doc for exactly what to try.

Built in `enemy.js` (all of the new `ATTACK_BEHAVIORS`/`COUNTER_EFFECTS`/
`ON_DEATH_EFFECTS` registries + the rewritten `ComposedEnemy` class),
`enemy_designer.html` (full UI: attack list with add/remove, 3 selection
modes, counters list, rage toggle, on-death dropdown), `game.js` (counter_stance
hook in the melee-hit loop, custom per-attack damage/knockback hook, the
two `ComposedEnemy.projectiles` update/draw calls), and `player.js`
(`takeDamage`'s new optional 3rd `knockback` param). Everything below marked
**[DONE]** is real, shipped code — everything else is still just this doc.

## Answer to "is it a good idea to have modules in the editor?" — yes

The user's own proposed category list (Movement / Attack / Defense / Counter
/ State-Phase / Perception / Targeting / Environment) is the right shape.
Adopt it with one refinement:

- **Movement stays single-select** — an enemy has one identity for how it
  occupies space (already true of every built enemy: Fractured walks,
  Anchor Wraith floats, nothing does both).
- **Attack, Defense, Counters, State become lists**, not single-select —
  real existing enemies already combine more than one (Crystal Sentinel is
  ranged attack + directional shield; Deflector Drone is passive hover +
  shield-reflect counter). The current `ComposedEnemy` only supports ONE
  attack behavior total, which is the single biggest gap versus what
  real/planned enemies actually need — see Phase A1 below.
- **Perception/Targeting/Environment stay mostly out of the editor** — these
  are either already baked into the shared `canSeePlayer()`/
  `hasFootingAhead()` helpers every behavior already uses (perception,
  environment), or belong to a later multi-enemy system (targeting/group
  behaviors are roadmap.md 2.5, explicitly a separate task, not part of
  single-enemy authoring).

This keeps the registry pattern already in `enemy.js`
(`MOVEMENT_BEHAVIORS`/`ATTACK_BEHAVIORS` as plain object literals) as the
extension point for everything below — adding a new behavior is "add one
entry to a registry," not touching `ComposedEnemy`'s core loop. That
already satisfies the "plugin architecture" ask from the brainstorm without
extra work.

## New `def` shape (Phase A target)

```js
{
  id, color,
  stats: { health, patrolRange, ignoreVertical, verticalBand,
           knockbackResistance, stunResistance },  // last 2 are new
  movement: { type, ...params },                    // unchanged, single
  attacks: [ { type, weight, ...params }, ... ],     // NEW — was singular `attack`
  counters: [ { ability, effect, ...params }, ... ], // NEW
  onDeath: { type: 'none' | 'explode' | 'spawn_projectiles' | 'split', ...params }, // NEW
  rage: { thresholdFrac: 0.3, speedMult: 1.4, cooldownMult: 0.6, damageMult: 1.2 }, // NEW, optional
}
```

`attacks` being a list with per-entry `weight` (roulette-select among
whichever entries are off cooldown) directly answers the "AI Decision
Logic — randomisation of attack choice" ask from the brainstorm, and is
required for several planned enemies (Phase Mage: teleport + spread shot;
Fractured Knight: shield + shove). Backward-compat: a def with the old
singular `attack` field gets wrapped into `attacks: [attack]` at load time
so nothing already exported breaks.

## Phase A — build next (the user's explicit asks + already-flagged gaps)

Each is additive to the existing registries — same shape as
`melee_swing`/`contact_field` etc., no core-loop rewrite required.

1. **[DONE] Multi-attack support** (`def.attacks[]`) — prerequisite for #2
   (counter_stance coexisting with a real attack) and for several roster
   enemies below. Do this first; everything else in Phase A assumes it
   exists. Three distinct selection modes (`def.attackSelection`), not
   just random weighting — per the user's explicit ask that "random" and
   "different attacks based on distance/combo" are different things:
   - `weighted` (default) — among attacks that are off cooldown and
     within their own `range`, pick one randomly, biased by each entry's
     `weight`. Pure randomness is the special case where all weights are equal.
   - `range` — each entry gets a `minRange`/`maxRange` window (reusing the
     existing `range` field as `maxRange`); the enemy picks whichever
     ready attack's window contains the current distance to the player
     (e.g. melee below 60px, ranged above 60px) — this is "different
     attacks based on distance," a deterministic choice, not a roll.
   - `combo` — ignores weight/range, cycles through `def.attacks` in
     array order every time one finishes, looping back to the start —
     this is a fixed sequence (e.g. swing → swing → grab), not a choice
     at all.
   Implementation detail: only *active* attack types (melee_swing,
   ranged_projectile, grab, dash_charge, beam, counter_stance) participate
   in this selection state machine; passive types (contact_field,
   shield_reflect) run unconditionally every frame regardless of
   selection mode, same as today — they were never "chosen," they're
   always-on.
2. **[DONE] `grab` attack** — lunges into grab range, roots the player (movement
   disabled) for `grabDuration` frames dealing `damagePerTick`, then throws:
   large configurable knockback (`throwKnockbackX/Y`) launching the player
   toward a wall. Directly the user's "grab and throw" + "high knockback
   into a wall" asks in one behavior.
3. **[DONE] `dash_charge` attack** (not a movement type — see note below) — windup
   then a fast lunge with contact damage; generalizes Void Lancer's charge
   into a configurable behavior instead of a bespoke class. **Note:** the
   brainstorm lists "Charge" under both Movement and gets requested again
   as a state ("Charging") — build it once, as an attack, since every
   existing charge-style enemy (Void Lancer) is really "a telegraphed lunge
   attack," not ambient locomotion. Flag this consolidation instead of
   building two versions.
4. **[DONE] `counter_stance` defense/counter** — for N frames the enemy is
   "countering"; if the player's melee hitbox overlaps during that window,
   the player's hit is negated (no damage, but still added to
   `hitTargetsThisSwing` so it doesn't retry) and the enemy immediately
   lands a free hit on the player. This is the user's literal ask
   ("if you hit while it counters, it won't land and it'll hit you").
5. **[DONE] `beam` attack** — a continuous rectangular hitbox tracking the
   player's y (or locked) for `activeFrames` frames, ticking damage every
   `tickCooldown` frames. New visual (thick line/rect with glow), same
   windup-then-active-then-cooldown timing shape as every other attack.
   `beamWidth`/`range` control size, per the user's ask. **Implementation
   note found while building:** beam deliberately does NOT go through
   `ComposedEnemy.getAttackHitbox()` (game.js's generic per-frame
   enemy-hits-player check) — that check has no cooldown of its own, it
   just relies on player invincibility frames, which would race against
   beam's own configurable `tickCooldown` for the same hit. Beam owns its
   damage exclusively through its own `onTick`; a separate `visualRect`
   helper is what `draw()` uses to actually render it.
6. **[DONE] `ranged_projectile` pattern expansion** — instead of building 6
   separate new behaviors for Straight/Homing/Arc/Bounce/Spread/Piercing
   from the brainstorm, add one `pattern` param to the existing
   `ranged_projectile` behavior (`'straight' | 'homing' | 'arc' | 'bounce' |
   'spread' | 'piercing'`), since they're all the same windup→fire→collide
   shape with different flight math. Cheaper than 6 registry entries, same
   design coverage. `spread` also takes a `projectileCount`/`spreadAngle`.
7. **[DONE] Ability-counter module** (`def.counters[]`) — each entry names
   which player ability it reacts to (`phase_dash | shard_shot |
   graviton_surge | stillpoint | melee_parry`) and an effect
   (`cancel_and_damage | reflect | null_field | stun_and_double_damage`).
   This generalizes what's currently hardcoded per-class (Null
   Sentinel/Anchor Wraith's phase-dash cancel, Deflector Drone's reflect,
   Void Lancer's parry-stun-2x-damage) into one configurable list — was
   already flagged as a gap before this brainstorm arrived, still the
   highest-value single item here since it's core to the game's actual
   combat identity (ability counters are a named throughline, not a
   nice-to-have). `graviton_surge`/`null_field` is listed in the editor
   for forward-compat only — no real logic, since Graviton Surge itself
   isn't built yet.
8. **[DONE] Rage state** (`def.rage`) — single health-threshold trigger,
   one-way (no un-raging), multiplies speed/cooldown/damage. Deliberately
   NOT a general state-effect DSL — that's real scope (see "Explicitly
   deferred" below) — this is the minimal version that satisfies "rage at
   low health" without over-building.
9. **[DONE] On-death effects** (`def.onDeath`) — `explode` (radius+damage
   AoE — the actual player-damage check lives in `ComposedEnemy.update()`'s
   dead-branch, not in the `apply()` registry, since `takeDamage()` only
   receives a bare sourceX number, not a real player reference to check
   distance/invincibility against), `spawn_projectiles` (N shots in a
   ring), `split` (spawns weaker copies — needed for the planned Temporal
   Shard enemy). One small registry, same plugin pattern.
10. **[DONE] Knockback/stun resistance stats** — `player.takeDamage()` now
    takes an optional 3rd `knockback` arg (`{vx, vy, hitStun}`) that
    overrides its default impulse; `ComposedEnemy.takeDamage()` scales its
    own outgoing knockback/hitstun by `1 - knockbackResistance`/
    `1 - stunResistance`.
11. **Decoys — NOT built, deferred as originally planned.** Unlike the other
    nine, this needs a genuinely new lightweight entity type (a real,
    hittable, 1-HP stand-in that can absorb a player attack, not just a
    visual afterimage like Stutterer's existing decoys) — more novel than
    "one more registry entry," budget it as its own sub-task.

Already covered, no new work needed — just confirm existing behaviors
directly satisfy these two named asks: **teleportation** = `teleport_blink`
(exists), **flight** = `hover` with `mode:'approach'` + `ignoreVertical`
(exists). **Windup timing** is already a per-attack param
(`windupFrames`) on every attack behavior including the new ones above —
this was never actually missing, just not obviously surfaced.

## Editor UI changes needed for Phase A

- Attack section becomes a repeatable list (add/remove entries), each with
  its own type dropdown + param sliders + a weight slider.
- New "Counters" section, same repeatable-list pattern, ability dropdown +
  effect dropdown + params.
- New small "State" section (not a list): rage threshold/multipliers,
  on-death type + params.
- Movement section stays exactly as-is (single dropdown).

## Triage of the full brainstorm list

Legend: **Now** = in Phase A above. **Plan** = good idea, real scope,
sequence later (Phase B, listed below). **Skip** = wrong fit for this game
or already solved elsewhere — reason given so it doesn't get re-litigated.

### Movement
| Item | Verdict | Note |
|---|---|---|
| Patrol, Chase, Hover, Drift, Fly, Teleport | **Now/exists** | Already built (`ground_chase`, `hover`, `teleport_blink`). |
| Charge (as movement) | **Skip (as movement)** | Build once, as the Phase A2 `dash_charge` attack instead — see note above. |
| Flee (retreat at low HP) | **Plan — Phase B** | Real gap, cheap once rage state (A8) exists — reuses the same threshold check. |
| Strafe, Circle/Orbit | **Plan — Phase B** | New `hover` sub-modes (`mode:'strafe'`, `mode:'orbit'`) — small additions to an existing behavior, not new systems. |
| Follow (moving platforms/waypoints) | **Skip** | No moving-platform runtime system exists yet at all (roadmap.md 4.4, unbuilt) — this is blocked on that, not an enemy-authoring gap. |
| Pause (idle between moves) | **Skip** | Already effectively covered by `PATROL_IDLE_FRAMES`-style idle timers built into the base chase logic. |
| Burrow, Wall Cling, Leap, Phase (intangible move), Wrap (screen-wrap) | **Plan — Phase B** | Each is a real, distinct new movement type (Rift Crawler, Ruin Stalker, etc.) — genuinely new code, not a param tweak. Worth doing but only when you're actually building that specific planned enemy, not speculatively. |
| Swoop (arc dive) | **Plan — Phase B** | New `hover` sub-mode. |

### Attack
| Item | Verdict | Note |
|---|---|---|
| Swing, Thrust, Homing/Straight projectile | **Now/exists** | `melee_swing`, `ranged_projectile`. |
| Grab, Beam, Spread/Arc/Bounce/Piercing projectile patterns | **Now** | Phase A2/A5/A6. |
| Slam (pogo-able overhead) | **Plan — Phase B** | Needs a new "hits from above, player can pogo off it" hitbox shape — real but small. |
| Spin (360° AoE), Combo (multi-swing) | **Plan — Phase B** | Variants of `melee_swing`'s existing windup/active/recovery shape. |
| Shove (knockback, no damage) | **Plan — Phase B** | Trivial once A2's knockback params exist — a shove is just `damage:0` with knockback set. |
| Shockwave, Explosion (on-demand, not just on-death), Field, Geyser, Nova | **Plan — Phase B** | `contact_field` already covers "Field"; the rest are burst-shaped variants of it — one new `area_burst` behavior with a `shape` param could cover Shockwave/Nova/Geyser together. |
| Spawn Add, Spawn Hazard, Spawn Orb, Clone, Decoy | **Plan — Phase B** (Decoy is Phase A11) | Summoning is real scope — needs enemies to be able to spawn other `ComposedEnemy` instances, a genuine new capability. Sequence after Phase A ships and proves stable. |

### Defense / Counter
| Item | Verdict | Note |
|---|---|---|
| Directional shield, Reflect | **Now/exists** | `shield_reflect`. |
| Counter Stance | **Now** | Phase A4. |
| Omnidirectional shield, Breakable shield (own HP) | **Plan — Phase B** | Generalizes Crystal Sentinel's shield-HP pattern into the module system. |
| Absorb (heal from projectiles) | **Plan — Phase B** | Needed for the planned Absorber Husk. |
| Dodge, Teleport Dodge, Roll | **Plan — Phase B** | Reactive-to-player-attack dodge needs the enemy to read the player's attack windup, which no current behavior does yet — new capability, not just a param. |
| Passive/On-Hit/On-Kill/Absorb Regen | **Plan — Phase B** | One `regen` module with a `trigger` param covers all four variants — don't build four behaviors. |
| Slow Aura / Debuff Zone | **Plan — Phase B** | Needs a player-debuff system to exist first (there isn't one) — real prerequisite work. |
| Ability counters (Phase Dash/Shard Shot/Graviton/Stillpoint/melee-parry) | **Now** | Phase A7 — this is the single highest-value item in the whole list. |

### State / Phase
| Item | Verdict | Note |
|---|---|---|
| Rage/Desperation at low health | **Now** | Phase A8 (minimal version — see note on why it's not a full DSL). |
| Explode/Split/Spawn-projectiles on death | **Now** (explode, spawn_projectiles, split) | Phase A9. |
| Exposed (vulnerability window after event) | **Plan — Phase B** | Needed for The Assembler; ties into the summon system above, sequence together. |
| Phased/Past-Present/Polarity/Accelerating | **Skip** | These are single-enemy bespoke gimmicks for specific planned minibosses/enemies (Temporal Paradox, Polarity Drone) — not generalizable modules, build as one-off classes the way Void Lancer etc. already are, when that specific enemy gets built. |
| Reform (resurrect if copies not killed) | **Skip** | Same as above — Temporal Shard-specific, build bespoke when that enemy is scoped. |
| Assembly/Burrowed/Inactive (vulnerable-while-constructing states) | **Plan — Phase B** | Ties to the summon system + Debris Construct/The Assembler specifically. |

### Perception / Targeting / Environment
| Item | Verdict | Note |
|---|---|---|
| Radius, Vertical Band, Hysteresis | **Now/exists** | Already the shared `canSeePlayer()` every behavior uses. |
| Line of Sight (raycast), Cone, Sound-based, Vibration | **Skip** | No line-of-sight raycasting exists in the game at all (platforms don't currently block sight checks) — real infrastructure work, not enemy-authoring scope, and arguably not needed given room sizes/design so far. |
| Awareness Build-up, Forget Timer | **Skip** | `ENEMY_DETECT_HYSTERESIS`/`PATROL_IDLE_FRAMES` already solve the actual problem (flicker at the detection boundary) these were meant to solve — would be redundant. |
| Aggro Transfer, targeting priority, all Group Behaviors | **Skip — belongs to roadmap.md 2.5** | Multi-enemy coordination is already its own planned phase, explicitly scoped separately — don't fold into single-enemy authoring. |
| Ledge Avoidance, Wall collision | **Now/exists** | `hasFootingAhead()`. |
| Wall Climb, Ceiling Cling, Platform Jump | **Skip** | Same as Wall Cling/Burrow above — real new movement types, build only when the specific planned enemy needing them gets scoped. |
| Destructible Wall Breaker | **Plan — Phase B** | Needed for Void Juggernaut — small: an attack that also damages destructible platforms, reusing the existing player heavy-attack-vs-wall collision code as a template. |
| Hazard Ignorance/Trigger/Immune/Use | **Skip** | No general hazard system exists yet at all (roadmap.md 4.6, unbuilt) — blocked on that landing first. |

### Region-themed abilities (Mirror Veil, Event Horizon, etc.)
**Skip cataloguing individually** — every one of these decomposes into
combinations of the modules above (Mirror Clone = Phase B's Clone summon;
Gravity Pull = a new `hover` "pull toward self" sub-mode; Wrap Teleport =
Phase B's screen-wrap movement; Rewind = a bespoke Temporal Warden-specific
mechanic, correctly already flagged as narratively special in `lore.md`,
not a reusable module). Revisit these when actually building each specific
region's enemies, using this table as the module inventory to draw from,
rather than pre-designing 13 regions' worth of bespoke mechanics now.

### The four "wildcard" ideas (Echo Trail, Gravity Tether, Sound Ping, Corruption Spread)
| Idea | Verdict | Note |
|---|---|---|
| Echo Trail (fading self-copies 1s behind, a "snake" of threats) | **Plan — Phase B**, good idea | Genuinely novel, fits the game's time/echo theming well (echoes are already a core mechanic via Phase Dash's Echo class), reuses existing trail/decay-timer code patterns (Stutterer's decoys, Echo class itself). |
| Gravity Tether (rubber-band snap back past a distance) | **Plan — Phase B**, good idea | Forces close-range engagement, distinct from every existing behavior, cheap to build (one distance check + a snap-back velocity). |
| Sound Ping (audio/HUD disorientation, no damage) | **Skip for now** | Interesting but sensory-disorientation-as-mechanic is a bigger design commitment (accessibility implications — some players rely on audio cues, HUD flicker could conflict with the accessibility toggles already built in 0.6) — worth a standalone design discussion, not a quick module add. |
| Corruption Spread (void puddles slow + block dashing) | **Plan — Phase B**, good idea | Area-denial-without-damage is a mechanic the game doesn't have yet, fits the Fracture/corruption theming, reuses the existing hazard-placement pattern once basic hazards (roadmap.md 4.6) land — sequence after that. |

### The three "boss-ish" ideas (Input Mirror, Fracture Reversal, Time Echo)
| Idea | Verdict | Note |
|---|---|---|
| Input Mirror (delayed copy of player's own inputs) | **Plan, but as a bespoke miniboss, not a module** | This is exactly Quantum Pursuer's already-planned kit (`expansion.md`/`regions.md` — "mirrors your moves with a 0.5s delay") — don't build a generic module, build it directly as that miniboss when scoped. |
| Fracture Reversal (heals off your Fracture pips) | **Plan, bespoke** | Strong thematic fit for a Fracture-cluster miniboss specifically (punishes going in over-charged) — flag as a candidate ability for whichever miniboss ends up guarding that cluster, not a general module. |
| Time Echo (2s rewind-on-hit zone) | **Skip** | Very close to Temporal Warden's already-established "rewinds its own health every 10s" identity (`lore.md`) — using a near-identical mechanic on a second enemy would dilute what's supposed to be his one distinctive trait ("the one enemy with partial, narratively-justified Stillpoint resistance"). Pick a different mechanic if this cluster wants a second time-themed enemy. |

## Missing roster cross-reference (does the module system actually pay off?)

Once Phase A ships, most of `expansion.md`'s 25 unbuilt normal enemies
become buildable **in the editor, no new code**, by combining existing +
Phase A modules:

- **Kinetic Striker** = `dash_charge` attack + `ground_chase` movement
- **Pulse Warden** = Phase B's `area_burst`(shockwave shape) on a timer
- **Phase Mage** = `teleport_blink` movement + `attacks: [spread projectile, ...]`
- **Temporal Shard** = `onDeath: split`
- **Fractured Knight** = `attacks: [shove]` + a Phase B breakable-shield defense
- **Warp Mite** = `teleport_blink` (interval mode) + tiny stats, no attack needed (contact-only, already generic)

Enemies still needing genuinely new movement types even after Phase A+B
(Rift Crawler/burrow, Ruin Stalker/wall-cling) stay bespoke-class work,
same as Void Lancer etc. today — the module system was never going to
make every planned enemy zero-code, just most of them.

## Explicitly deferred, not forgotten

- A general state-effect DSL (arbitrary "at health X, become Y") — Phase
  A8's rage is the minimal version; a full DSL is real scope, revisit only
  if the minimal version proves limiting in practice.
- Group/targeting behaviors — roadmap.md 2.5, already its own phase.
- Hazard system, moving platforms — roadmap.md 4.6/4.4, already their own
  unbuilt prerequisites several Phase B items lean on.
- Sound Ping — needs its own accessibility-aware design pass first.
- Decoys (Phase A11) — not built this pass, see item 11 above.

## How to test this (2026-07-15 build — not yet human-playtested)

Open `enemy_designer.html` (via `python3 -m http.server 8000`, per
`CLAUDE.md`) and:

1. **Basic sanity** — page should load with no console errors, a purple
   square (the default enemy) visible mid-arena, and you controlling the
   player (← → move, Z jump, X attack, C dash) able to walk up and fight it.
2. **Multi-attack selection** — click "+ Add Attack" to add a second entry
   (e.g. leave attack 1 as melee_swing, add a `ranged_projectile` as attack
   2), set Selection Mode to `range` with attack 1's Min Range 0 / Attack
   Range ~50 and attack 2's Min Range ~60, then approach from far away
   (should fire the projectile) vs. up close (should swing instead).
   Switch to `combo` and confirm it alternates every time regardless of
   distance. Switch to `weighted` and adjust the weight sliders — a much
   higher weight on one attack should make it fire far more often.
3. **`grab`** — set attack type to `grab`, get close, confirm you get
   pulled alongside the enemy and can't move away, take periodic damage,
   then get launched at throw. Tune Throw Knockback X/Y high and confirm
   you fly noticeably farther/into a wall.
4. **`counter_stance`** — set attack type to `counter_stance`, time a melee
   swing against the enemy while it's in its blue "countering" stance
   (color changes) — your hit should deal 0 damage and you should take a
   counter-hit instead. Hit it while NOT countering — should work normally
   (uses whatever your OTHER attack entries are, or plain body contact if
   counter_stance is the only entry).
5. **`beam`** — set attack type to `beam`, confirm a wide cyan rectangle
   extends from the enemy toward you while active, and it ticks damage on
   its own schedule (adjust Tick Cooldown to feel it change).
6. **`dash_charge`** — confirm a telegraphed lunge that deals its own
   configured damage/knockback, distinct from a normal melee swing.
7. **Ranged patterns** — cycle the Pattern dropdown (straight/homing/arc/
   bounce/spread/piercing) on a `ranged_projectile` attack and confirm each
   visibly behaves differently (arc should dip with gravity, bounce should
   ricochet off a platform, spread should fire a fan of shots).
8. **Counters** — add a Counter with ability `phase_dash`/effect
   `cancel_and_damage`, then Phase Dash (F) through the enemy — should
   cancel your dash and hit you. Try `melee_parry`/`stun_and_double_damage`
   — successfully parrying (tap X during its swing recovery... check
   input.js's actual parry binding) should make your next hit deal double.
9. **Rage** — enable Rage, fight it down past the threshold, confirm a
   visible particle burst and a noticeable speed/aggression change after.
10. **On-death** — try each of explode (should visibly hurt you if you're
    standing close when it dies)/spawn_projectiles (should fire a ring of
    shots outward)/split (should spawn 2 smaller copies).
11. **Export/Load round-trip** — Export JSON, tweak a few sliders, Load
    that same JSON back — should restore exactly.
12. **Real game integration** — paste an exported def into any room's
    `enemies: []` in `area.js` as `{ type: 'composed', x, y, def }`, load
    the real game, and confirm it spawns and behaves identically to the
    designer preview.

Known unknowns going into this (flag if you see them): grab's forced
player-position hold might visually jitter for one frame depending on
render/update ordering; beam's `visualRect` uses a fixed 600px length
(not configurable) which may look wrong in very wide or narrow rooms;
`split`'s children inherit the full attack/counter list of the parent
(only health scales down) which may make them still-dangerous rather than
clearly weaker.
