# Movement Feel — "late Celeste" speed & fluidity (proposal, not started)

Status: design proposal only (2026-07-13). No code changed. Written in response to a
direct request to plan toward faster, more fluid player movement (and enemies that match
that pace), referencing Celeste's late-game/B-side movement feel as the target.

## Where the game already is (read from the actual code, not guessed)

Some of the "Celeste feel" prerequisites are already true here, which matters because it
means this isn't a from-scratch problem:

- **No acceleration ramp-up.** `player.js` sets `vx = speed` directly on input, not via a
  gradual accelerate/decelerate curve. That's already arcade-snappy, not floaty.
- **Attacks don't root the player.** Movement in `update()` is only blocked by
  `dashing`/`phaseDashing`/`hitStunTimer`, never by `attacking` — you can already move
  freely mid-swing. Nothing to fix here.
- **Dash is already short and momentum-preserving.** `DASH_DURATION = 8` frames (~133ms)
  is snappy, and `vx *= 0.6 + dashChain * 0.08` on dash-end keeps real momentum instead of
  hard-stopping — same idea as Celeste's post-dash momentum carry.
- **Coyote time + a dash-chain system already exist** (`COYOTE_FRAMES`, `dashChain` up to
  `DASH_CHAIN_MAX = 3`), so the skeleton for chainable movement tech is already in place.
- **Hitstop is already short** (3-12 frames per hit, all under 200ms, and it's a togglable
  accessibility setting per roadmap 0.6) — combat feedback isn't what's making the game
  feel slow; it's not really in scope for this plan.

## The actual gap vs. Celeste

**Dash refill is time-based, not landing-based.** `DASH_COOLDOWN = 30` frames, scaling up
per chain (`30 + (chain-1)*10`), and it only resets on a flat timer or 120 frames of
inactivity. Celeste's core trick is that your dash comes back **the instant you touch the
ground** (or an refill source) — that's what makes chaining dash → land → dash → land feel
continuous instead of metered. Right now, landing doesn't do anything special for the
dash; you're still waiting out a timer even standing still on solid ground. This is the
single biggest lever for "fluid" specifically (not just "fast").

**Camera lags behind at speed.** `camera.x += (targetX - camera.x) * 0.1` — a flat 10%
per-frame catch-up with no look-ahead. At current speeds this is barely noticeable; at
Celeste-tier dash speed it would visibly lag behind the player, which reads as sluggish
even if the player itself is moving fast. Camera needs to scale with this change, not be
tuned in isolation.

**Base speed numbers are moderate, not slow.** `MOVE_SPEED = 4`px/frame (240px/s) and
`DASH_SPEED = 12`px/frame (720px/s) against an 800px-wide canvas are already reasonably
brisk for this viewport — dashing crosses the whole screen in ~1.1s. Raw speed isn't the
main problem; availability/chainability of dash is.

## Recommended levers, in priority order

1. **Dash refill on landing** (biggest lever, do this first and alone). On `grounded`
   transitioning `false → true`, if `dashCooldown > 0` and `dashChain === 0` (i.e. not
   mid-chain), reset `dashCooldown = 0`. Keep the existing chain-decay cooldown math for
   *air* chaining (dash → dash → dash without touching ground) so that system still means
   something — this only removes the "wait out a timer while standing still" case, which
   is the part that reads as unresponsive rather than deliberate.
2. **Directional dash** (regular Dash — Shift/X — not Phase Dash, see note below). Right
   now `usePhaseDash`-style horizontal-only logic also governs the regular dash:
   `this.vx = this.facing * DASH_SPEED * ...` always fires horizontally regardless of
   held direction. Change: at the moment Dash is pressed, read held movement keys
   (Up/Down/Left/Right or WASD) into an 8-way direction (N/S/E/W/NE/NW/SE/SW); if no
   directional key is held, default to horizontal along `facing` (fully backward
   compatible with today's feel). This is Celeste's actual core dash mechanic — 8-way
   air dashing is a bigger contributor to "that" feel than raw speed numbers are — and it
   directly helps the enemy-fairness problem below: a directional dash is an escape tool
   against high-knockback enemies (dash up/away out of a combo), not just a horizontal
   one.
   - **Standing 8-way melee is explicitly rejected (2026-07-13, per the user)** — a
     keyboard has no clean analog aim for a stationary swing, and inventing a whole new
     hold-to-aim scheme just for melee direction isn't worth it. Instead: a **dash
     attack** — pressing Attack during or immediately after a dash swings along the
     dash's direction (reusing whichever of the 8 directions the dash just used, no new
     input). This gets "combat matches movement" without a new control scheme, and gives
     directional melee a natural home: it's a property of the dash, not a fourth aim
     mode bolted onto standing combat.
   gap-closer.
   - **Deliberately NOT touching Phase Dash here.** Phase Dash stays horizontal-only,
     matching roadmap 1.9's proposed ability-upgrade shop where omnidirectional Phase
     Dash is something you *earn* with banked Lore Pips, not something that ships free.
     Regular Dash going 8-way immediately and Phase Dash staying gated is intentional
     progression, not an inconsistency — flag this if it comes up again so nobody
     "fixes" Phase Dash to match without meaning to.
3. **Camera look-ahead + faster catch-up, scaled to whatever speed comes out of #1/#2.**
   Raise the lerp factor (e.g. 0.1 → 0.15-0.18) and add a small offset toward
   `player.vx`/`player.vy` direction (Celeste and most fast platformers bias the camera
   ~20-40px in the direction of travel above some speed threshold) so the player can see
   where they're about to be, not just where they are.
4. **Modest base speed increase, only after #1-#3 are playtested.** If dashing more
   freely still feels like it needs more top-end, raise `MOVE_SPEED`/`DASH_SPEED`
   incrementally (e.g. +1 and +2 respectively) rather than jumping straight to a large
   number — see "Risk" below for why this one is more expensive than it looks.
5. **Wavedash-style dash-jump preservation, if not already clean.** Confirm jump input on
   the last dash frame doesn't zero `vx` before applying `JUMP_FORCE` — if it does, that's
   a one-line fix that unlocks a real skill-expression tech (chaining dash → jump keeps
   dash speed into the jump arc) for free, very Celeste-coded.

## Editor constraint — no rotation

`levelEditor.html` has no rotation/angle handling anywhere (confirmed by search, not
assumed) — every platform/hazard it can place is axis-aligned. Any room-layout idea that
implies angled geometry (a ramp, a rotated ledge) isn't buildable with the current tool.
The workaround is the same one Crag/Vault already use for tiered climbs: **staggered
axis-aligned platforms**, not rotated ones — e.g. a ledge reachable only via an up-dash
followed by a horizontal dash, built from two ordinary rectangles positioned to require
that sequence, not a single diagonal platform. Keep this in mind for any "reward the new
directional dash" room design — the reward is in the *required input sequence*, not in
the geometry's visual angle.

## Enemies in a faster game

Direct question worth answering plainly: **does enemy AI need to get "smarter" to keep up
with a faster player?** No — not on the "more complex decision-making" axis. The existing
windup → attack → idle state machine (enemy.js) is not the bottleneck, and making it more
sophisticated (deeper prediction, more branching logic) is the expensive, bug-prone lever
with the worst payoff. What actually keeps a fast game feeling fair is **legibility and
roster variety**, which is a different, cheaper axis:

- **Telegraph legibility, not telegraph brevity.** A faster player doesn't require a
  faster-*reacting* enemy — it requires that enemy's windup stay readable at a glance
  while everything on screen is moving quicker. Concretely: keep windup *duration*
  (`ENEMY_WINDUP_FRAMES`) roughly where it is or trim it only slightly, but make the
  telegraph itself louder — bigger color/size change, a sharper audio cue (2.7 "Enemy
  Windup Ping" is already on the roadmap and becomes more important here, not less). Fast
  approach + a clear, unmissable "now" moment (Sekiro/Dead Cells' pattern) reads as fair
  even at high speed; a subtle telegraph that used to be readable at a slower game speed
  can stop being readable purely because everything around it sped up.
- **Knockback and combo-potential enemies are the right instinct — frame them as spacing
  tools, not difficulty spikes.** An enemy that hits hard and shoves the player away
  forces a spacing decision (dash back in vs. reposition vs. bait another swing) instead
  of just testing reaction time — that's a great fit for a faster game specifically
  *because* the new directional dash (#2 above) gives the player a real answer to being
  shoved (dash away/up out of the knockback arc, rather than just eating a stun-lock).
  Knockback-heavy enemies without a mobility answer would feel unfair; with #2 in place,
  they're a real rock-paper-scissors against player mobility instead.
- **Speed-matched chasers are fine, but pair the speed increase with the telegraph-clarity
  rule above, not with reaction-time pressure.** An enemy that closes distance fast but
  still has one unmistakable "now it's going to hit" frame is exciting, not unfair. An
  enemy that's fast AND subtle is the actual failure mode to avoid.
- **This is exactly what roadmap Phase 2 already scopes, and it gets MORE valuable, not
  less, once movement speeds up:**
  - **2.5 Group Coordination** — a lone enemy is trivial to blow past at higher player
    speed no matter how it's tuned; a coordinated group that covers space and reacts to
    each other is what actually creates pressure a fast, mobile player still has to
    solve. This is a bigger lever than making any single enemy "smarter."
  - **2.8 Enemy Architecture Rework** (component-based movement/attack behaviors) — worth
    revisiting priority on this given the movement work. Building a handful of new
    speed/knockback/combo archetypes as compositions of shared behaviors is much cheaper
    than hand-rolling more bespoke classes on top of the current 9, and it's the natural
    place to add a shared "telegraph loudness" parameter across every enemy at once
    rather than tuning each class individually.
  - **2.1 Pit Avoidance** — matters more once enemies chase faster; an enemy that can't
    path around a pit becomes either trivially cheesable or (worse) walks itself off a
    ledge into the player at a speed that reads as broken rather than intentional.
- **Difficulty-curve it, don't apply it globally.** Keep tutorial/early Fractured-enemy
  pacing close to today's numbers (they exist to teach fundamentals) and introduce
  knockback-heavy/combo/speed-matched archetypes progressively by region, same as
  expansion.md already scales enemy difficulty — a faster player earlier in the game
  should feel empowered against old enemies, not immediately up against a harder roster.

## Making enemies (and bosses) actually stronger, not just "fairer"

Called out directly (2026-07-13, per the user): the section above is entirely about
*fairness* (legible telegraphs, readable patterns) — applied on its own, without a
counterbalancing toughness pass, that just makes enemies comparatively weaker against a
now-faster, now-more-mobile player. Bosses are already beatable too easily today; giving
the player more tools without giving enemies more teeth makes that worse, not better.
Fairness and toughness are two different axes and both need work. None of the following
requires "smarter" AI (more branching decision logic) — they're numeric, choreography, and
pressure-design levers, which is exactly the cheaper, more reliable axis this doc has been
arguing for throughout:

- **Close the attack-cooldown gap — already a named, diagnosed problem.** `boss.js`'s
  attack cooldowns run 35-70 frames depending on move/phase (only dropping to 20-25 in
  phase 3), against the player's flat 18-frame `ATTACK_COOLDOWN`. That gap is *why*
  facetanking currently wins — already flagged as roadmap **3.6 Anti-Facetank Pass**, and
  it applies to every miniboss too, not just the King. This is a pure numbers fix and
  probably the single highest-value change here.
- **Multi-hit combo attacks instead of one windup → one hit → idle.** Chaining 2-3 hits
  per commitment (choreography change in boss.js/enemy.js's attack functions, not new
  decision logic) raises real per-engagement threat without touching "intelligence."
- **Lean harder on the `adapt` system that already exists — it's underused, not absent.**
  `boss.js` already tracks melee-vs-ranged hit ratio and dash count and biases move
  selection off it (`prefersRange`/`prefersMelee`, teleport threshold scales with
  `adapt.dashCount`). This is cheap reactive tuning already half-built, not deep AI.
  Extend it once directional dash exists: bias toward wide sweep/area attacks specifically
  when the player is dash-spamming, so mobility overuse has a real answer instead of being
  a free pass.
- **Simultaneous pressure, not sequential single-telegraph puzzles.** A fast player solves
  one attack at a time trivially; real toughening comes from making them manage two things
  at once (an add spawn + a boss attack, an arena hazard + a windup). The summon-adds hook
  already exists (`boss.js`'s `summonCooldown`) — use it more aggressively now that
  mobility is higher, and extend the same pattern to minibosses that don't have it yet.
- **Make bosses actually use verticality offensively**, not just occupy one lane — already
  the stated intent of roadmap **3.7** (arena size/verticality). A boss that leaps to a
  high platform and slams down forces relocation; a boss that never leaves one lane is
  trivial to strafe forever regardless of its numbers.
- **Mandatory-engagement design for at least some fights.** Colossus Core's existing rule
  (only heavy/charged attacks connect, normal attacks bounce off) is exactly this pattern —
  it can't be dodged past indefinitely, it has to be fought on its terms. More
  minibosses requiring a specific tool (not just good dodging) keeps movement mastery from
  trivializing the whole game, the same way a Metroidvania ability-gate keeps exploration
  from being sequence-broken by pure skill alone.
- **Numeric HP/damage tuning is a valid supporting lever, but a secondary one.** Raising
  raw health or damage is the easiest change to make and the easiest one to overdo into
  a boring bullet-sponge — treat it as a background dial to adjust *after* the above
  (cooldown gap, combos, adapt system, simultaneous pressure) are already in place, not
  as the primary answer to "bosses are too easy."

## Risk — why this isn't a small tuning pass

`player.js`'s physics constants are exactly what `area.js`'s room linter
(`validateRoomLayout()`/`validateAllRoomLayouts()`) uses to verify every jump/dash gap in
all 27 rooms is actually crossable — see `_linterPointReachable()`'s physics simulation in
area.js. Changing `MOVE_SPEED`/`DASH_SPEED`/dash availability doesn't just change feel, it
can silently trivialize gaps that were sized for the old numbers (not a correctness bug,
but a pacing one — content designed as a challenge becomes trivial) or, in rarer cases,
make an intended-tight jump behave differently than tuned. Any change here should be
followed by a full linter re-run (`validateAllRoomLayouts()`, same as every past physics-
touching session in roadmap.md) before considering it done, and ideally a manual playtest
of a few rooms that were tuned tightly (Crag's rubble-wall gaps, Echo Bridge's gap
sequence) to confirm nothing that was meant to require Phase Dash now trivially doesn't.

## Wall contact during a dash — no automatic bounce

Considered and rejected (2026-07-13): an automatic dash-bounces-off-walls-and-continues
mechanic. Rejected because it takes direction control away from the player at exactly the
moment they most need it (right after committing to a dash, often near a hazard or an
enemy) — a defining trait of good platformer control is that the *player* decides the
outcome, not the physics engine, and dashes are already "difficult to control once
started" even without adding an automated redirect on top. It reads well in a trailer and
poorly in your hands, especially in a game with combat, where an uncontrolled bounce
trajectory could land you inside an enemy's hitbox with no recovery option.

**Better version, reusing what already exists:** don't auto-bounce — let dashing into a
wall open a brief, *player-input* wall-jump window, same mechanic as the existing
wall-slide/wall-jump system (`WALL_JUMP_COYOTE`, `WALL_JUMP_FORCE`/`WALL_JUMP_H_SPEED` in
player.js), just triggered off dash-contact instead of normal fall-contact. You get the
"chain off a wall mid-combat" fantasy the bounce idea was going for, without losing
agency, and it's an extension of already-built code rather than new physics.

## Other fast-paced-combat levers (not yet covered above)

- **Momentum/aggression reward, not just aggression risk.** Stillpoint already rewards
  aggression (1.5x damage + lifesteal while active, see `playerMeleeDamage()`/
  `applyStillpointLifeSteal()` in game.js) — extend the same philosophy to the dash
  attack: a hit landed immediately off a dash could carry a small bonus, so staying fast
  and forward is the mechanically optimal way to play, not just the exciting-looking way.
- **Directional hit reactions.** Enemies should get knocked in the direction the hit
  actually traveled (a dash-attack from below pops them up, one from the side sends them
  sideways) rather than a fixed generic knockback vector — this is what makes
  juggling/positioning read as the player's own choice rather than a canned animation.
- **A camera "impact" kick on big hits** — a tiny zoom-punch or 1-frame nudge on heavy
  attacks/parries/kills, distinct from the existing screen shake. Cheap, and named
  specifically in combat-feel research as a top lever independent of raw numbers.
- **SFX/VFX carry more of "feels good" than damage numbers do.** Worth remembering for
  the ability-upgrade shop (roadmap 1.9): a "stronger Shard Shot" tier should sound and
  look different, not just hit harder, or the upgrade won't feel like it did anything.
- **Ambient audio/visual escalation tied to sustained speed/combat**, not a boxed
  combo-counter (already ruled out by the "no boxed HUD" design decision) — ties into the
  existing per-area drone system in `audio.js` and the Doppler-Shift brainstorm in
  `regions.md`: let the ambient layer intensify while the player stays fast/aggressive, so
  the game signals "you're in the flow" without new UI chrome.

## Enemy pace: fast enemies, or slow enemies with fast attacks?

Direct answer: **slow/moderate enemy movement, fast and sharply-telegraphed attacks**,
as the default — not uniformly fast enemies. Reasoning, not just preference:

Speed is a *relative* feeling, not an absolute number. The entire reason the player feels
fast is that they're fast **compared to the world around them** — if enemy movement scales
up to match player movement, that gap closes and the player stops feeling fast at all,
even though the raw numbers went up for both. Making enemies generally fast directly
undermines the stated goal ("I want the player to feel fast") rather than supporting it.
Keeping most enemies at a measured, readable movement pace is what preserves the player's
mobility advantage as the actual reward for getting good at the movement tech this whole
plan is about.

This is also already the shape of the existing enemy state machine, which is good news —
it doesn't need reinventing, just leaning into on purpose: `enemy.js`'s
windup → attack → idle pipeline already separates "how the enemy moves" from "how its
attack executes." The recommendation is to keep that separation explicit as a design rule
going forward: enemy *locomotion* (patrol/chase speed) stays deliberate and readable, so
the player always has a legible sense of "I am faster than this thing"; enemy *attacks*,
once committed past the telegraph, should be quick and decisive (a fast strike, not a
sluggish one) — slow anticipation, fast payoff, exactly the "over-exaggerated tell, sharp
release" pattern already cited from the Badeline/readability research earlier in this doc.
A slow-approaching enemy with a lightning-fast punish is threatening and fair at the same
time; a fast-approaching enemy with a fast attack is neither readable nor a display of the
player's own speed advantage.

**Keep the handful of genuinely fast-moving "chaser" archetypes from the Enemies section
above as deliberate, minority exceptions** (Paradox Engine's chase-zone machine is the
clear example) — a rare fast-mover reads as a distinct, memorable threat specifically
*because* most enemies aren't like that. If every enemy chases at player-matching speed,
the exception stops being special and just becomes the new normal baseline, right back to
eroding the player's relative-speed fantasy.

## My actual recommendation

Don't jump straight to full Celeste-tier movement across the board — prototype **levers #1
and #2 together** (dash refills on landing + directional dash) first, in isolation, and
play them for a bit before deciding whether to also raise base speed. Both are cheap,
reversible, and neither requires re-tuning existing room geometry, because they change
*how often*/*which way* you can dash, not *how far* a dash reaches. Raising raw speed
numbers (#4) is where the real cost lives (full linter re-run + manual re-check of
tightly-tuned rooms), so that's worth holding off on until you've felt out whether #1+#2
(and #3's camera fix, which is nearly free) already get you where you want to be. If after
that it still feels too grounded compared to what you're picturing, escalate to raising
base speed with the re-verification step built into the plan, not skipped.

Enemy work (see "Enemies in a faster game" above) should happen alongside #1/#2, not
after — a directional dash specifically changes what "fair" means for knockback-heavy
enemies, so tuning one without the other will feel wrong in either direction.

This also isn't an all-or-nothing identity question — the game doesn't have to choose
between "Hollow Knight-paced" and "Celeste-paced." Lever #1 pushes it toward more
expressive, chainable movement without changing what the game fundamentally is (a
Metroidvania with combat, not a pure movement-tech platformer) — full Celeste-tier speed
usually comes with combat taking a back seat, which isn't this game's identity. Keep base
speed increases modest even if you do end up wanting more than #1 alone provides.
