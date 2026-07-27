# Enemy Attack Vocabulary — Plan (partially built, see 2026-07-20 status update)

Status: **planning only**, 2026-07-20. Goal per user direction: give
`ComposedEnemy` (enemy.js/area.js) a real vocabulary of attacks that punish
specific player habits ("remember which button to press, or don't press
it") instead of just bigger numbers. Read alongside `combat_ai_overhaul_plan.md`
and `enemy_system_plan.md` for how ComposedEnemy's data-driven attack defs
work.

This doc is the merged/critiqued version of the user's original brainstorm
plus follow-up additions — see inline notes for what changed and why.

**Sword Clash, not Parry (2026-07-20 correction):** the original plan
leaned on a player parry input for Reversal/Parry Frame, but that input was
removed 2026-07-18 (`player.js:63` — overloaded the attack button with no
telegraph, read as broken timing) and the user doesn't want another button
added ("too many buttons right now"). Fix: **Sword Clash** — no new input.
If the player's own attack hitbox is active and would connect during a
clashable enemy attack's telegraph window (Reversal's existing white-flash
tell, etc.), it resolves as a clash instead of a trade: no damage either
side, both stagger, enemy's windup is interrupted (the punish window).
Miss the window (attack too early/late, or don't attack) and it's a normal
hit. This rides on the attack button's existing windup/active frames
(already several frames wide per `ATTACK_DURATION`), so the window can be
much more forgiving than a dedicated parry input ever could, and it's
tunable per-enemy without touching input code. Needs its own distinct
hit-stop/flash/SFX so it reads as "a system," not random luck — do not
reuse the normal-hit or old-parry-stun feedback for it. Enemies keep their
own parry/stun tech (`stunTimer`, `melee_parry` counter, Void Lancer) — only
the *player-input* parry stays gone.

---

## 1. Ability Counter-Play (punish the button press)

Each of the 4 player abilities gets at least one enemy response that makes
spamming it a real decision instead of a free action.

| Ability | Attack | Behavior | Why |
|---|---|---|---|
| Shard Shot | **Aggro-Pull** (Void Juggernaut) | Hit from range → enters Rage Charge, dashes at 2x speed for 20f instead of flinching | Punishes "sit at max range and press V" — forces a dodge reaction |
| Shard Shot | **Mote Eater** (Absorber Husk) | Eats the shot, spawns a health mote for *itself* | Stops spam because you're feeding the enemy — needs a strong visual tell so it reads as "my mistake," not "broken damage" |
| Shard Shot | **Shield Slip** (Fractured Knight) | Shield blocks; 3 rapid hits overheats it, drops for 1s (punish window) | Rewards sustained aggression over single pokes |
| Phase Dash | **Afterimage Strike** (Echo Stalker/Phase Mage) | Dash through this enemy → delayed explosive drops where you land | Dashing through isn't automatically safe; keep moving after |
| Phase Dash | **Guard Clash** (renamed from "Parry Frame" — Fractured Sovereign's Guard-type) | Dash straight into its front arc → it's an enemy-side block/counter (`stunTimer`, not a player input), stops the dash cold and knocks you back | Enemy-side parry tech, no player input needed. Can't blindly dash into everything |
| Graviton Surge | **Ceiling Slam** (Null-Gravity Brute) | When flipped, slams downward instead of just floating, shockwave on landing | Now cheap to build correctly — reuses the ceiling-bounce fix from 2026-07-19. Surge isn't a free wail-on-them window |
| Graviton Surge | **Gravity Anchor** (miniboss/rare-elite only, not a common enemy) | Immune to flip, pulses to briefly ground the player nearby | A real "your ability doesn't work here" zone — strong as a rare setpiece, annoying as a common encounter, so gate it to elites |
| Void Tether | **The Catch** (Void Juggernaut / Brute / boss-tier, "Armored" state) | Tether a Heavy enemy → *you* fly to *them* instead, and if Armored they catch + grapple-throw you | Best idea in the set — turns the strongest, currently-riskless ability into a real bet. **Merge target for "Grapple Break" below — same mechanic, one build.** |

---

## 2. Universal Attack Archetypes (moveset vocabulary)

| Attack | Example enemy | Behavior | Player response taught |
|---|---|---|---|
| **Reversal** ("Get Off Me") | Blitz Guard | Mid-combo, flashes white, instant 360° uppercut (10f startup) | Stop mashing blindly — but a well-timed attack into the white-flash window **clashes** (see Sword Clash note above) instead of trading, interrupting the Reversal and opening it up. Highest-value single addition — nothing currently punishes mindless attacking |
| **Tiger Knee** (anti-air) | Ruin Stalker | Quick high-arcing swipe, only triggers vs. an airborne player | Stay grounded or dodge — direct counter-pressure to juggle/Reach-heavy play, good to build alongside Reach |
| **Feint Cancel** (mix-up) | Phase Mage (**one enemy only**, see note) | Slow windup, cancels (blue flash), then fast 8f real slash | The windup is a lie — wait for the flash, don't parry early. Hard to telegraph fairly; restrict to a single "trickster" archetype so it doesn't read as unfair everywhere |
| **Lingering Damage** (zone control) | Stillpoint Revenant | Leaves a damage trail for 2s as it moves | Can't stand still and combo — forces repositioning |
| **Command Grab** *(new)* | TBD heavy enemy | Slow, clearly telegraphed, unblockable/unparryable throw | Answers "just parry/block everything" — only counter is movement, not defense |
| **Hyper-armor Windup** *(new)* | Null-Gravity Brute, miniboss charges | Doesn't flinch on hit during windup; your combo doesn't interrupt it | Teaches "not every opening is safe to take" — complements Reversal, which teaches the opposite (sometimes stopping is right) |
| **Adaptive Resist** *(new)* | TBD (elite-tier) | After 2-3 hits from the same direction in a row, briefly resists/reduces damage from that direction | Rewards the varied forward/up/down/Reach kit instead of one optimal button. Cheap: rolling last-N-hit-direction buffer + damage multiplier |
| **Chip-Guard Block** *(new)* | A second, lighter blocker type | Blocks but takes reduced (not zero) damage, no knockback | Keeps pressure meaningful without every blocker being a Reversal/parry-bait clone — variety within "enemy that blocks" |

Cut/merged from the original brainstorm:
- **Grapple Break** — identical mechanic to **The Catch**, don't build twice.

Deferred (bigger scope, treat as miniboss/setpiece material, not core
vocabulary):
- Split-on-death, false-floor/illusory-platform attacks.

---

## 3. Projectile Types (the "neutral" game)

All five kept — genuinely differentiated, and mostly map onto the existing
`Projectile` class + `seekWalls`-style magnetism pattern already used for
Shard Shot's crystal-wall homing.

| Type | Speed | Behavior | Meant for | Priority |
|---|---|---|---|---|
| Homing (short) | Medium | Tracks player 20f, then goes straight | Phase Sentinel, Phase Mage | High — changes player movement, not just what they dodge |
| Bouncing Shard | Fast | Bounces twice off walls/floor, angle changes | Shard Spitter | High |
| Charged Beam (telegraph) | Instant/hitscan | Ground-line telegraph for 1s, then massive damage | Boss-tier (The Assembler) | High |
| Gravity Well | Slow | No damage; weak pull toward it if player stands still | Gravity Well enemy | Lower — positional tool, not a combat verb |
| Mine | Stationary | Drops, explodes after 1s | Warp Mite | Lower |

---

## 4. Miniboss-specific attacks — separate follow-up plan

The 8-miniboss table from the original brainstorm (Guard's Shield
Catch/Greatsword Drag, Mirror King's Copy Swap, Collapse Core's Gravity
Spike, Golem's Polarity Pinball, Pursuer's Delayed Replica, Warden's Time
Heal, Assembler's Scrap Storm, Duo's Cross Slash) is strong material but
**out of scope for this pass** — minibosses in this codebase are hand-built
per-instance, not authored through `ComposedEnemy`'s shared data model the
way regular enemies are, so it's a different unit of work. Revisit as its
own plan once the base vocabulary above is in.

---

## Status update, 2026-07-20 — first three built

Three entries from the priority list below are now real, in `game/enemy.js`
(`ComposedEnemy`, the data-driven system — see `enemy_system_plan.md`),
authorable per-composed-enemy via `def.attacks[]`/`def.counters[]`, not
hardcoded to any specific named enemy:

- **Reversal** (`ATTACK_BEHAVIORS.reversal`) — not selected through the
  normal range/cooldown weighted pick; force-triggers from
  `ComposedEnemy.takeDamage()` once `hitThreshold` hits (default 3) land
  within `hitWindow` frames (default 90) of each other, then runs the same
  windup→active→cooldown timeline every other attack uses. Center-of-self
  AoE hitbox (not directional — a "back off" burst). White windup flash +
  hitstop/screenshake/particles on fire for a real tell. **The Sword Clash
  interrupt-and-punish resolution described in the Sword Clash note above
  is NOT built yet** — this is currently "stop attacking or take the hit,"
  not yet "time an attack right and get rewarded." That's a `player.js`-
  side addition (checking the player's active hitbox against the enemy's
  windup window) — worth its own pass once this is playtested.
- **Aggro-Pull** (`COUNTER_EFFECTS.shard_shot.aggro_pull`) — hit-triggered
  (checked in `takeDamage()` when `attackDir === 'ranged'`, same pattern
  `melee_parry.stun_and_double_damage`/`shard_shot.reflect` already use),
  starts a brief rush straight at the player (`chargeSpeed`/
  `chargeDuration`) that overrides normal movement AI for its duration.
- **Mote Eater** (`COUNTER_EFFECTS.shard_shot.mote_eater`) — a ranged hit
  under this counter does no damage/knockback/flinch at all and just heals
  the enemy (`healAmount`) — full negation, not a reduction, so the lesson
  reads unambiguously.

Plumbing change needed for both counters to actually detect a Shard Shot
hit: `game.js`'s projectile-hits-enemy block now passes `'ranged'` as
`attackDir` universally (was Crystal Sentinel-only, for its double-damage
shield) — harmless everywhere else, since every other `takeDamage()` only
branches on `'up'`/`'down'`, so `'ranged'` was already falling into the
same default/forward-knockback path an omitted 3rd arg used.

None of these three have authored `ANIM_DEFS` art yet — they render via
the existing procedural `ComposedEnemy.draw()` fallback (Reversal's
windup does get the white-flash color override even without custom art).
See `animation_editor_plan.md`'s 2026-07-20 update for how to draw for
them now that the bridge exists.

## Status update, 2026-07-20 (later same day) — build-priority items #3-5

The rest of the "Build priority (first pass)" list (section 5) is now
real too, same additive/data-driven pattern (`def.attacks[]`/
`def.counters[]`, editable in `editor/enemy_designer.html`, no per-enemy
hardcoding):

- **Tiger Knee** (`ATTACK_BEHAVIORS.tiger_knee`, `game/enemy.js`) — a
  generic `requiresAirborne` gate on any attack def, checked in
  `ComposedEnemy._decideActiveAttack()`'s candidate filter: the attack is
  never even offered as a candidate while `player.grounded`, so nothing
  telegraphs and nothing fires until the player actually jumps into range.
  Hitbox arcs up from the enemy's head instead of melee_swing's chest-
  height box. Editor UI added under `ATTACK_UI.tiger_knee`.
- **Afterimage Strike** (`COUNTER_EFFECTS.phase_dash.afterimage_strike`) —
  hit-triggered on the dash-through contact itself (same overlap check
  `game.js`'s enemy loop already runs for the Phase Dash pass-through
  skip), arms `player._afterimageArmed`/`_afterimageParams`; the hazard
  itself is pushed to a new `afterimageHazards[]` array (`game.js`) only
  once the dash actually ends (`player.js`), so it lands where the player
  stops, not mid-dash — "keep moving after" is the intended read, not
  "dodge a projectile." Telegraphs as a pulsing ring for `armDelay` frames
  before it deals AoE damage. Editor UI added under
  `COUNTER_UI.phase_dash.afterimage_strike`.
- **The Catch** (`COUNTER_EFFECTS.void_tether.the_catch`, merged with the
  cut Grapple Break idea per the original plan) — cast-triggered in
  `game.js`'s Void Tether block: a target carrying this counter reverses
  the pull (`player.tether.pullPlayerToEnemy` — player flies to the enemy,
  reusing the same travel/ramp-speed code the wall-grapple half of the
  ability already had) instead of the enemy coming to the player. A new
  per-enemy `armored` stat flag (`ComposedEnemy.armored`, from
  `def.stats.armored`, editor UI under `STAT_UI`) decides the payoff on
  arrival: non-Armored just resists (normal arrival damage/hitstun still
  applies to the enemy, same as any other tether pull); Armored instead
  catches the player and grapple-throws them (`throwKnockbackX/Y`,
  `throwHitStun`, `damage` — no damage/hitstun to the enemy in this
  branch, the punish lands on the player). Gated to Armored, not every
  `the_catch` target, so it stays a rare Heavy/miniboss-tier bet per the
  original design intent, not something a common enemy can carry by
  accident.

Same as the first three: none of these have authored `ANIM_DEFS` art yet
(Afterimage Strike's hazard also has no art beyond the procedural ring
telegraph) — pure behavior/data additions, draw for them via
`anim_editor.html` whenever convenient, no code changes required to pick
up authored frames once they exist.

**Manual test plan (per this repo's hard "don't open a browser yourself"
rule — see `Plans/CLAUDE.md`):** in `editor/enemy_designer.html`, build one
enemy per attack — (1) a `tiger_knee` attacker, jump near it and confirm
it only swings while you're airborne, never grounded; (2) a
`phase_dash`/`afterimage_strike` counter enemy, Phase Dash through it and
confirm a pulsing ring appears where you land and detonates after it fills
in, damaging you only if you're still standing in it; (3) a
`void_tether`/`the_catch` counter enemy with `Armored` OFF then ON — Void
Tether it from range and confirm you fly to it both times, but only get
caught/thrown back when Armored is checked.

## 5. Build priority (first pass)

Ordered to hit every core ability with the least new infrastructure — each
of these composes existing systems (`hitStun`, `stunTimer`/parry,
knockback) rather than needing a new state machine:

1. **Reversal** — **built 2026-07-20**, minus the Sword Clash interrupt-and-punish resolution (still needs the attack-hitbox-vs-telegraph-window check on the player side).
2. **Aggro-Pull** — **built 2026-07-20**.
3. **The Catch** — **built 2026-07-20**. Biggest risk/reward payoff, fixes Void Tether's free-action problem.
4. **Tiger Knee** — **built 2026-07-20**. Cheap gate on `player.grounded`, pairs naturally with Reach (2026-07-19).
5. **Afterimage Strike** — **built 2026-07-20**. Closes Phase Dash's "always safe" gap.

(Mote Eater, listed as a later-pass item in section 1's table, also shipped 2026-07-20 alongside Aggro-Pull since both are the same `takeDamage()`/`'ranged'` plumbing.)

Second pass (once the above are live and playtested): Ceiling Slam, Shield
Slip, Command Grab, Hyper-armor Windup, then the projectile tiers.

Not yet scoped into a build order: Mote Eater, Gravity Anchor, Feint
Cancel, Lingering Damage, Adaptive Resist, Chip-Guard Block, Parry Frame,
Gravity Well, Mine — all kept, just later.
