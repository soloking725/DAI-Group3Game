# Combat & Enemy AI Overhaul — Plan (built 2026-07-16, see roadmap Phase 19)

Status: **A/B/C/D below all built 2026-07-16** (roadmap.md Phase 19), same
session as this doc's user direction: "enemy fixes are urgent — combat is
the point of this game at this moment." (A) the Void Tether fix, (B) enemy
AI capability upgrades, (C) enemy defensive/offensive verbs, and (D) the
shared collision resolver (`physics.js`) all shipped. The enemy attack
vocabulary work that followed (Reversal, Aggro-Pull, etc.) is a separate,
newer doc — see `enemy_attack_vocabulary_plan.md`.

Read alongside `enemy_system_plan.md` (the ComposedEnemy module system —
most new verbs land there first) and `animation_editor_plan.md` (attack
timing/cancel windows eventually live in its `ANIM_DEFS` data model).

---

## A. Void Tether — diagnosed, fix spec'd (highest priority)

**Root cause of "button does nothing": nothing in the real game ever
grants the ability.** `abilityState.hasVoidTether` is set `false` in both
reset paths (`game.js:1387`, `game.js:1654`) and round-tripped through
save/load — but no `abilityReward`, pickup, or story grant exists anywhere
in `area.js`/`game.js`. The R-key handler (`player.js:449`) checks
`abilityState.hasVoidTether` and silently no-ops forever outside
`enemy_test.html`'s checkbox. The ability logic itself (pull enemy /
pull-to-wall, `game.js:2335-2419`) is built.

Fix plan, in order:

1. **Grant path.** Story-wise Void Tether comes from the give-up-the-Child
   choice (`story.md` §4), which needs the cutscene system — not built.
   Interim: place a real `abilityReward: 'void_tether'` pickup in a
   reachable room (wire it through the same reward-grant code path Phase
   Dash/Shard Shot use) so the ability is testable in normal play *now*;
   move the grant behind the Child choice when that scene exists.
2. **Whiff bug.** The cooldown is charged at `player.js:452` *before*
   `game.js` knows whether any target exists — a whiffed cast burns the
   full 90f cooldown with zero feedback. Fix: on no-target-and-no-wall,
   play a short fizzle SFX/VFX at the player and refund the cooldown down
   to ~20f (small tax so it can't be spammed as a free probe).
3. **Facing-direction auto-aim** (user spec: "auto aim to the nearest
   enemy in the direction you're facing"). Current targeting
   (`game.js:2344-2349`) is nearest-enemy-in-ANY-direction. Replace with:
   filter candidates to the facing half-plane
   (`(enemyCx - playerCx) * player.facing > 0`), prefer the one nearest to
   the horizontal facing line (weight distance + vertical offset), never
   pull an enemy from behind. If no enemy qualifies in front → existing
   pull-to-wall branch (already facing-filtered) → else whiff (step 2).
4. **Target telegraph.** A faint marker on the enemy that *would* be
   tethered while R is available (only when `hasVoidTether` and off
   cooldown, only nearest-valid target) — cheap, and makes the auto-aim
   legible. Matches the "in-world feedback, no HUD chrome" rule.

Estimated size: small (~30 lines total across `player.js`/`game.js` +
one `area.js` pickup entry). No new systems needed.

---

## B. Enemy AI capability upgrades (base `Enemy`, benefits every subclass)

Current state (verified in code): a flag-based state machine
(`windingUp`/`attacking`/`aware`/`patrolDir`/`idleTimer`), with detection
hysteresis already in place. Two confirmed gaps match the user's
complaints:

### B1. Notice delay ("think timer" on *gaining* sight) — cheap, do first
`idleTimer` (`PATROL_IDLE_FRAMES = 30`) only buffers *losing* the player.
There is no delay on first detection — enemies snap from patrol to chase
in one frame. Add `noticeTimer`: on first `canSeePlayer()` success, enter
an **alert** beat for ~20–35 frames (per-enemy tunable, `this.noticeFrames`)
with a visible tell (eye-glow ramp / "!" flicker — procedural, no sprite
needed) before `aware = true`. Player-facing effect: enemies feel like
they *react* rather than *know*.

### B2. Decision cooldown (stops instant mind-changing)
Add `decisionTimer`: chase-direction flips, attack-choice rolls, and
patrol/chase transitions may only re-evaluate every ~15–25 frames. Between
re-evaluations the enemy commits to its current intent. This single timer
is the "doesn't change its mind constantly" fix and also makes dodging
*feel* like it works (the enemy overcommits briefly, as real fighters do).

### B3. Facing-cone detection
`canSeePlayer()` (`enemy.js:118-131`) is omnidirectional (distance +
vertical band only). Change initial detection to a forward wedge
(~120° cone via `(playerCx - enemyCx) * this.facing > 0` plus an angle
check), with a small omnidirectional "hearing" radius (~40% of
`ENEMY_DETECT_RANGE`) so you can't stand *on* an enemy unseen. Once
`aware`, detection stays omnidirectional until sight is lost (nobody
forgets an attacker mid-fight). Keep the existing hysteresis. Flying
enemies (`ignoreVertical`) can keep omni detection or get a wider cone —
per-enemy flag.

---

## C. Enemy verbs that balance a strong player

User's list: blocking, dodging, combo breakout, heavy knockback, mix-ups,
reactivity. These should be **addable per-enemy, not global** — which is
exactly what the ComposedEnemy module system (`enemy_system_plan.md`,
`enemy_designer.html`) exists for. Build each as a composable module first
(instantly testable in the designer/arena), then retrofit onto classic
subclasses only where wanted.

### C1. `block` (defense module)
Trigger: player attack startup detected within range AND attacker is in
the enemy's facing half-plane → raise guard (visible stance change) for
the swing's duration + ~10f. Blocked hit: 0 damage, small player recoil,
distinct clank SFX. Counterplay (must exist or blocking is just annoying):
guard is broken by charged attacks, by hits from behind, and by Void
Tether pulls (tether yanks the guard open — deliberate combo synergy:
tether → guard broken → punish). Per-module knobs: block chance, guard
duration, recovery, what breaks it.

### C2. `dodge` (defense module)
Trigger: player attack startup within range → probability roll (per-enemy,
e.g. 25–60%) → short telegraphed back-hop or side-step with brief i-frames,
on its own cooldown (~2–3s) so it can't chain-dodge forever. The
`decisionTimer` commit (B2) prevents dodge-spam feeling twitchy.
Counterplay: dodges have a fixed landing recovery (~10f punish window),
and feinting (attacking, waiting, then attacking) baits the dodge out.

### C3. `breakout` (anti-juggle module — the combo breaker)
Juggle detection: enemy takes ≥N hits (default 4) within M frames
(default 120) while in `hitStun`/airborne → charge flash (~15f, clearly
readable) → radial burst: strong knockback to the player, little/no
damage, clears the enemy's hitstun, self-cooldown ~10s. This is the
fighting-game "burst": it caps infinite juggles without deleting the combo
system — the flash gives the player time to dash out, and baiting the
burst (stop hitting at 3, let it whiff) becomes advanced play. Directly
complements the deep-combo plans: combos stay strong, but not free.

### C4. Heavy knockback attacks (attack-module property, not a new system)
Add `playerKnockback: {x, y}` to attack definitions — specific attacks
(shield slams, colossus swipes) shove the player far enough to genuinely
reposition the fight. The player-side knockback application already exists;
this is exposing it as a per-attack tunable (and later a per-frame hitbox
property in `ANIM_DEFS`).

### C5. Mix-ups (attack-selection layer in base Enemy)
Three small pieces, all cheap:
- **Windup variance**: each windup rolls its duration ±25% so attack
  timing can't be metronome-memorized.
- **Feint** (module): start a windup, cancel at ~60%, then immediately
  begin the real attack (or a different one). Per-enemy feint chance.
- **Anti-repeat weighted choice**: enemies with 2+ attacks pick by weight,
  with the last-used attack's weight halved — no double-repeat spam, no
  predictable rotation either.

### C6. Reactivity (counter-modules — the designer already has a `counter`
module category; extend it)
Start with two and evaluate before adding more:
- **Dash-punish**: if the player phase-dashes through this enemy twice
  within ~4s, the enemy turns instantly (skips `decisionTimer` once) and
  fires a fast swipe at the dash exit point. Punishes dash-through spam
  specifically, which playtests flagged as a crutch (BAL-001).
- **Parry-respect**: after being parried, the enemy hesitates (~30f) and
  its next attack is 20% more likely to be a feint (C5). Makes parrying
  change enemy behavior visibly.

---

## D. Shared collision resolver (foundation — also fixes the bug class)

Enemy platform collision is currently **duplicated inline in 11 places**
across `enemy.js` subclasses, which is why wall/ceiling/spawn bugs keep
recurring in per-enemy variants (wall-clip fixed globally only via a
post-update pass in game.js; ceiling fixed only for Graviton Surge via
`resolveCeilingY()`). Plan: extract ONE
`resolveEntityCollision(entity, platforms)` (floors, ceilings, walls,
velocity-scaled margins — port the player's already-fixed logic from
`player.js:670-748`) and have every subclass loop call it. Add a
**spawn-safety check** at room load / enemy spawn: if the spawn AABB
overlaps a platform, nudge to the nearest free spot and console-warn (same
spirit as `validateAreaGraph()`). The Child companion
(`child_companion_system_plan.md`) requires this resolver too — build it
once, three systems benefit.

---

## Priority order (combat is the point right now)

1. **A. Void Tether fix** (grant + whiff refund + facing auto-aim) — small,
   user-requested, unblocks a whole ability.
2. **B1 + B2** notice delay + decision cooldown — tiny diffs, biggest
   "the AI feels smarter" return per line of code.
3. **D. Shared resolver + spawn safety** — kills the recurring bug class,
   unblocks the Child.
4. **C4 + C5** knockback tunables + mix-ups — cheap feel wins.
5. **B3** facing-cone detection.
6. **C1 block → C2 dodge → C3 breakout** — in that order; each needs its
   counterplay tuned in `enemy_test.html` before the next.
7. **C6** reactivity modules — last; needs the others live to react *to*.

Everything in C should ship as ComposedEnemy modules with
`enemy_designer.html` support so new enemies get these verbs by
checkbox, not by code.
