Continue building out the miniboss/boss fights for this game (Stillpoint, /Users/promiseegunjobi/Documents/GitHub/DAI-Group3Game).

## Context — what's already done

A prior session fixed a blocking bug and proved out the architecture with one real fight. Read `~/.claude/plans/keen-painting-goblet.md` first for the full detail — short version:

- **Spawn bug fixed**: `game/area.js` now derives `isMinibossArena`/`isBossArena` from each room's `roomType` at load time (a loop right before `validateAreaGraph()`). Before this, no boss/miniboss ever spawned in real gameplay even though 11 miniboss rooms + the final boss room already had `roomType`/`miniboss`/`bossSpawn` authored.
- **Generic phase system added to `ComposedEnemy`** (`game/enemy.js`): `def.phases = [{ healthPct, statMultipliers: {speedMult,damageMult,cooldownMult,knockbackResistanceMult}, attacks: [...patches], flags: {...} }]`, ordered/one-way/multi-threshold, mirrors the existing one-way `rageDef` pattern. Implemented via `_applyPhase()`. Attacks get a new `enabled` flag (phases can disable/enable/append attacks by matching `type`). `phaseFlags` is a merged bag other code reads — currently used for `knockbackImmune` (hooked into `takeDamage()`) and `dotOnHit` (a damage-over-time effect, threaded through every enemy-attack-hits-player call site plus `getAttackDamageAndKnockback()`, applied via a new `applyPlayerDot()` helper in `game/game.js`).
- **`MINIBOSS_CLASSES` registry** in `game/game.js` replaces what used to be a hardcoded `if (area.miniboss === 'colossus_core')` branch — adding a new miniboss is now one registry entry (`{ [minibossId]: ClassName }`), not another `else if`.
- **Generalized the miniboss combat/defeat block** (`game/game.js`, inside the main update loop's `if (miniboss) {...}`): minibosses can now be hit by the player's Shard Shot projectiles (never worked before), damage/knockback reads from `miniboss.getAttackDamageAndKnockback()` when defined instead of one flat constant, a missing invincibility/Phase-Dash guard got fixed, and defeat now grants a real permanent `+1 Max Health` via `maxHealthBonus++`/`playerMaxHealth()` (reusing `healing.js`'s existing save-persisted mechanism) instead of just a full heal.
- **Crag Warden** (`ColossusCore` in `game/enemy.js`, miniboss id `colossus_core`) — pre-existing class, now actually spawns thanks to the flag fix. Got `willConnect(isHeavy)` and `displayName = 'Crag Warden'` added so it plugs into the generalized combat/defeat block correctly (only heavy attacks connect, unchanged from before).
- **The Conduit** (`TheConduit`/`CONDUIT_DEF` in `game/enemy.js`, miniboss id `static_guardian`, room `static_field_room2`) — the first new boss, built to prove the phase system: two `ranged_projectile` attacks (homing + spread), phase 2 at 50% health gets faster/harder-hitting and starts applying a damage-over-time tick on hit. Music already fully wired (`BOSS_MUSIC_MAP.static_guardian` → `boss_conduit.ogg`, pre-existing from an earlier audio pass).

**Not yet playtested in a real browser** — the prior session's standing instruction was no browser-based verification, only `node --check` + manual code tracing. If a browser/dev-server run has happened since, trust that over this summary for whether Crag Warden/The Conduit actually work correctly on screen.

## Session update (2026-07-26) — 2 more fights built

Continued this same batch: **Mirror King** (`hollow_guardian`,
`MIRROR_KING_DEF`/`MirrorKing` in `game/enemy.js`) and **Fractured
Sovereign's Guard** (`graviton_sentinel`, `GRAVITON_GUARD_DEF`/
`GravitonGuard`) are now built, following `CONDUIT_DEF`'s proven shape —
plain `ComposedEnemy` + `phases`, no new engine work. Both registered in
`game.js`'s `MINIBOSS_CLASSES` (now 4 entries). Both rooms
(`mirror_veil_hollow`, `graviton_core_room3`) and both `BOSS_MUSIC_MAP`
entries were already wired from the earlier architecture pass — zero
`area.js`/`audio.js` changes needed. Full detail in `roadmap.md`'s
"Boss buildout — Mirror King + Fractured Sovereign's Guard (2026-07-26)"
entry, including the manual playtest plan (not yet run — no-browser-testing
rule). Mirror King's literal clone-swarm was deliberately scoped down (per
this doc's own "no new engine mechanic expected" note below) — the mirror
theme is carried by `counter_stance` + a spread `ranged_projectile` +
`defense.dodge` instead of spawning real copies.

**Also found while reading `expansion.md`'s Phase 4 table**: the fuller
per-boss story doc (moral axis, phase-by-phase attacks, strategy, reward)
referenced below as possibly lost is actually still in the repo —
`Plans/expansion.md`'s "PHASE 4: MINIBOSSES" table (search for "the user's
own redone spec") has it for all 12 fights. Don't ask the user to re-paste
it; read that table first.

## Session update (2026-07-26, later same day) — 2 more fights built

Continued the same session: **The Assembler** (`paradox_engine`,
`ASSEMBLER_DEF`/`TheAssembler`) and **The Stationmaster**
(`timeline_keeper`, `STATIONMASTER_DEF`/`TheStationmaster`, Timeline
Crossroads' scientist-boss — proposed name from `lore.md`'s 2026-07-22
entry, which is a fuller/different spec than this doc's earlier "human but
airborne" placeholder row below; read `expansion.md`'s #4.11 and
`lore.md`'s own section before touching this fight again). Both in
`game/enemy.js`, both registered in `game.js`'s `MINIBOSS_CLASSES` (now 6
entries). Full detail, including the manual playtest plan (not yet run),
is in `roadmap.md`'s "Boss buildout — The Assembler + The Stationmaster
(2026-07-26, same day)" entry.

This pair needed real new (but small, generic) infrastructure the first
four fights didn't — two additions to `ComposedEnemy`'s phase system in
`enemy.js`: **`phaseDef.movement`** (shallow-merge override onto the
per-instance movement clone, recomputes `_movementFlies` on a `type`
change — what lets the Stationmaster's phase 2 switch him from grounded to
flying) and **`def.spawnOnStart`/`phaseDef.spawn`** (via a new
`_spawnAdds()` method — pushes caller-supplied `ComposedEnemy` adds into
the room, same push-to-`areaEnemies` mechanism `ON_DEATH_EFFECTS.split`
already used, generalized to fire at fight-start or on a phase threshold
instead of only on death). The Stationmaster is also the first real user
of `dash_charge`'s existing `aerial: true` mode (built during an earlier
mobility pass, never attached to a named enemy until now).

## Session update (2026-07-26, later still same day) — 2 more fights built, 8 of 12 done

Continued the same session: **Quantum Pursuer** (`abyss_guardian`,
`QUANTUM_PURSUER_DEF`/`QuantumPursuer`) and **Warden & Hollow**
(`warp_guardian`, `WARDEN_DEF`/`HOLLOW_DEF`/`WardenAndHollow`). Both in
`game/enemy.js`, both registered in `game.js`'s `MINIBOSS_CLASSES` (now 8
entries). Full detail, including the manual playtest plan (not yet run),
is in `roadmap.md`'s "Boss buildout — Quantum Pursuer + Warden & Hollow
(2026-07-26, same day)" entry.

This pair each needed a genuinely new mechanic (unlike the previous pair's
reusable phase-system extensions): **Quantum Pursuer** is a real
`ComposedEnemy` subclass (not a plain data def) — a 30-frame FIFO buffer of
the player's own position feeds a delayed, damaging "soul shadow," drawn
and collided in `update()`/`draw()` overrides layered on the shared combat
machinery. **Warden & Hollow** turned out to need the existing
`role`/`applyRoleCoordination` system NOT at all (that system is
movement-priority hints for allied enemies working together, not
per-enemy-type guaranteed defense reactions) — instead, Warden's
"guaranteed parry, no offense" is free with existing primitives
(`defense.block` at `chance: 1.0` + `attacks: []`), and only Hollow needed
real new work: a `defense.rangedDodge` verb reacting to the player's live
Shard Shot projectiles. `game.js`'s miniboss tracking is singular (one
`miniboss` variable, one `defeatedMinibosses[area.miniboss]`), so Hollow is
spawned as a `def.spawnOnStart` add alongside Warden (the registered
miniboss) rather than as a second tracked boss — same pattern the
Stationmaster's prisoners already used.

## Session update (2026-07-26, final pair) — 10 of 12 fights now built

Continued the same session, and finished the two "large/machine" fights,
each preceded by a full `EnterPlanMode` scoping pass (see the plan file
`~/.claude/plans/distributed-gliding-forest.md` and `roadmap.md`'s
"Electromagnetic Golem + Gravity Collapse Core" entry for full detail):

- **Electromagnetic Golem** (`polar_guardian`,
  `ELECTROMAGNETIC_GOLEM_DEF`/`ElectromagneticGolem`) — needed zero
  changes to `physics.js`'s shared resolver; magnetism is an additive
  force before collision, the same shape as the pre-existing gravity-well/
  Graviton-Ball pull. New: `player.magnetCharge`, a `polarity` platform
  flag, a `magnetizable` flag for surfaces the boss charges at runtime.
  `polar_shift_room2` got 4 hand-authored platforms (was floor-only).
- **Gravity Collapse Core** (`horizon_core`, `HORIZON_CORE_DEF`/
  `HorizonCore`) — the real architecture item: `physics.js` gained
  `getRoomGravityDir()`/`applyRoomGravity()`/`resolveRotatedGravityCollision()`
  (a new sibling function; `resolveEntityCollision` itself is untouched),
  dispatched from the 3 places gravity/collision were previously applied
  directly (`enemy.js` via one `resolveEnemyPhysics` branch, `player.js`,
  `companion.js`). `player.js` also got an input-axis remap for sideways
  gravity (first-draft control mapping — reuses `aimUp`/`aimDown` for
  along-the-wall movement — flagged as the piece most likely to need
  adjustment after a real playtest). Verified with a from-scratch headless
  test suite exercising the actual collision math (12 cases, caught and
  fixed several real sign bugs in the first draft) — the strongest
  verification available without a browser, not a substitute for one.
  `event_horizon_core` got real wall/ceiling platforms; a genuine linter
  false-positive was found and fixed along the way (`validateAllRoomLayouts()`
  has no concept of rotated gravity, so it flagged the new platforms as
  unreachable — added a `rotatedGravityOnly` exemption flag, zero effect
  on real physics, following the existing `ceiling`/`hazard` precedent).

Both registered in `game.js`'s `MINIBOSS_CLASSES` (now 10 entries). Neither
played in a real browser yet — manual playtest checklist is in
`roadmap.md`'s entry.

## What's left — 2 of the original 12 fights, neither attempted this batch

| Fight | id | Approach |
|---|---|---|
| Temporal Warden | `chrono_ally` | **Deprioritized to last per the user** ("doesn't go all out offensively on you but I haven't worked out his kinks yet") — don't build until the design itself is settled. Per `expansion.md`'s #4.3 row: NOT a `defense.dodge` variant (this doc's older outline guessed wrong) — it's a periodic self-health-rewind-unless-interrupted cycle (a real new timer-based state machine, closer in shape to Quantum Pursuer's subclass than to a data-only def), plus a deliberately narrow, narratively-justified partial-Stillpoint-resistance exception documented in `expansion.md` §2 — read that section before building, don't improvise the Stillpoint interaction. |
| Sovereign (final boss) | n/a — `class Boss` in `game/boss.js` | Already has a bespoke 3-phase class. This is a content/moveset alignment pass to the "fighting your own future self" story doc (same moveset as player except Graviton Surge; phase1 precog, phase2 all abilities except Stillpoint, phase3 uses Stillpoint) — not new architecture, but a large, careful pass across a ~1000-line bespoke file; don't attempt it casually alongside def-only fights. |

Two more were never really "the 12" in the same sense — no id/room exists
yet, so they're blocked on room-authoring first, same gap as when this doc
was first written:

| Fight | id | Approach |
|---|---|---|
| Void Expanse miniboss | unassigned key (pick one, e.g. `void_walker`) | Human-scale per the sizing rule below. **Room doesn't exist in `area.js` at all** — needs a room authored (platforms/transitions/`roomType: 'miniboss'`/`miniboss`/`bossSpawn`) before it can even use the flag-derivation fix. |
| Antechamber / The Child | unassigned key (pick one, e.g. `antechamber_child`) | Human (a child/teen), explicitly 3 phases (solo → calls allies + heals → rage). **Room doesn't exist in `area.js` at all**, same gap. Likely ties into `game/companion.js`'s existing `Child` entity/assets — confirm design intent (reuse her sprite/animation) before scoping. Also has an unresolved design conflict with the Abandoned Shell fight (`story.md` §5) per `lore.md` — flag it to the user before building. |

## Sizing rule (from the user, apply to every fight above)

Unless a fight is explicitly described as large/a machine/a construct (Gravity Collapse Core, Electromagnetic Golem), it's human-scale — don't give it a big boss-class body just because it's a "boss." Use `ComposedEnemy`'s normal small dimensions (or close to them) for every human fight in the table.

## Story source

The full per-boss story/moveset descriptions (core tragedy, style of attack, abilities) that this table was built from are in the conversation history that produced the plan file — if they're not available in this new chat, ask the user to re-paste their boss doc (Region / Miniboss / Core tragedy / Style of Attack / Abilities table) before designing movesets, don't invent backstory.

## How to work

1. Read `~/.claude/plans/keen-painting-goblet.md` in full first.
2. Read `game/enemy.js`'s `CONDUIT_DEF`/`TheConduit` (search for `static_guardian`) as the reference example for how a phase-using `ComposedEnemy` def should look, and `FracturedKnight`/`VoidLancer` for shield/dash-charge examples.
3. Build fights roughly in the table's order (cheapest/most-proven-pattern first), one or two at a time — don't try to do all remaining ~11 in one giant pass. For each: author the `ComposedEnemy` def + class, add it to `MINIBOSS_CLASSES`, confirm the room's `miniboss`/`bossSpawn` already exists in `area.js` (it does for everything except Void Expanse and Antechamber, which need rooms authored first), and confirm/add its `BOSS_MUSIC_MAP` entry in `game/audio.js` if missing.
4. For the two engine-mechanic outliers (Gravity Collapse Core's room gravity, Electromagnetic Golem's magnetize), scope the new mechanic as its own mini-plan before touching moveset design — probably worth its own `EnterPlanMode` pass given it touches `physics.js`/`player.js`.
5. Verify with `node --check` on every touched file. No browser-based testing — this repo has a standing instruction against it; rely on static checks and ask the user to playtest.
6. Don't touch `game/area.js`'s bulk-generated room data via `Plans/rebuild_levels_from_svg.js` — hand-editing individual room objects (like adding Void Expanse/Antechamber rooms) is fine and is how every prior addition was done.
