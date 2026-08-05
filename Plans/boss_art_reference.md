# STILLPOINT — Boss & Miniboss Art Reference

A complete visual-design reference for drawing every boss and miniboss: what they look like, how they move, every attack and its animation beats. Organized per-character so you can work through them one at a time.

---

## TABLE OF CONTENTS

1. [The Fractured Sovereign (Final Boss)](#1-the-fractured-sovereign-final-boss)
2. [Colossus Core / Crag Warden](#2-colossus-core--crag-warden)
3. [The Conduit](#3-the-conduit)
4. [The Mirror King](#4-the-mirror-king)
5. [Graviton Guard (Sovereign's Guard)](#5-graviton-guard-sovereigns-guard)
6. [The Assembler](#6-the-assembler)
7. [The Stationmaster](#7-the-stationmaster)
8. [Quantum Pursuer](#8-quantum-pursuer)
9. [Warden & Hollow (duo)](#9-warden--hollow-duo)
10. [Electromagnetic Golem](#10-electromagnetic-golem)
11. [Gravity Collapse Core (Horizon Core)](#11-gravity-collapse-core-horizon-core)
12. [Temporal Warden](#12-temporal-warden)
13. [The Undertow](#13-the-undertow)
14. [The Child (Antechamber)](#14-the-child-antechamber)
15. [Abandoned Shell](#15-abandoned-shell)
16. [The Player](#16-the-player)
17. [Stutterer (Common Enemy)](#17-stutterer-common-enemy)
18. [Stillpoint Revenant (Common Enemy)](#18-stillpoint-revenant-common-enemy)

---

## 1. THE FRACTURED SOVEREIGN (Final Boss)

**ID:** `boss` (class `Boss` in `game/boss.js`)
**Region:** Sovereign's Throne (final area)
**Size:** 48 × 56 px — larger than the player (24×32) but not massive
**Color palette:** Phase 1 violet (`#8b5cf6`), Phase 2 purple (`#c084fc`), Phase 3 red (`#f87171`). Inner core always pale lavender (`#e0d4ff`). Eyes red (`#ff3333`) normally, white during lunge/teleport.
**Lore:** She IS the player from the future — same ability kit minus Graviton Surge, plus a corrupted Void Tether that pulls HER to you instead.

### Visual States

| State | What it looks like |
|-------|--------------------|
| **Idle** | Gentle floating bob (2px sine wave). Drifts toward/away from player to hold ~220px preferred distance. |
| **Entering** | Descends into arena, settles at ground level. |
| **Recovering** | Breathing bob (5px sine). Invulnerable, flashing opacity. |
| **Phase transition** | Opacity flickers (every 6 frames), "PHASE II/III" text floats up. Phase 3: red aura expands, quote appears: *"You think stillness belongs to you?"* |
| **Staggered** | Sliding to a stop (velocity × 0.85 decay). Vulnerable window — this is when the player attacks. |
| **Teleporting** | Vanishes (goes offscreen), vortex rings spin at departure point (3 concentric arcs, alternating rotation). Reappears at random arena position with a 15-frame flash. |
| **Lunging** | Fast horizontal surge at vx=11. White eyes. 3 trailing afterimages in red, fading. Motion blur effect. |
| **Dead** | Body fragments scatter outward in a radial burst (12 pieces spinning), fade to transparent over 60 frames. |

### Phase 3 Persistent Visuals
- **Damage aura:** Pulsing red circle (radius ~100px, `rgba(248,113,113)`) around her at all times. Deals tick damage if player stands within 150px.
- **Stillpoint immunity shimmer:** Faint red outline rectangle (2px stroke, sine-pulsing opacity) around her body at all times in Phase 3.
- **Boss Stillpoint activation:** Larger pulsing red ring (radius ~140px, 4px stroke) when she casts her own Stillpoint.

### Shield (Phase 2+)
A vertical cyan bar (`#67e8f9`) on whichever side she faces. 12px wide, extends 4px above and below her body. Pulses with a sine glow. Blocks frontal damage (2 hits to break). When broken, "SHIELD BROKEN" text in teal.

### Attacks — Full Breakdown

#### MELEE SWING (All Phases)
**Telegraph (14 frames):** A glowing violet circle grows at the strike point — forward (in front of her), up (above), or down (below), depending on where the player is relative to her center. She picks the direction based on player position (±40px vertical threshold).
- Forward: circle at `facing × 40px` offset, radius grows from 14 to 38
- Up: circle 40px above her center
- Down: circle 40px below her center

**Active hit (10 frames):**
- Forward hitbox: 86 × 50 px rectangle, extends from her front edge
- Up hitbox: (width+20) × 64 px rectangle, 60px above her top
- Down hitbox: (width+20) × 64 px rectangle, starting at her bottom edge

**Damage:** 1, moderate knockback (vx 5-7, vy -4 to -8)
**Cooldown:** 55 frames Phase 1, 30 frames Phase 2+
**Recovery:** 12-frame delay then 28-frame stagger (punish window)

#### CHARGED HEAVY (Phase 2+ only, or as retaliation to 5+ consecutive hits)
**Telegraph (40 frames):** Red escalating glow circle centered on her. Starts at radius 20, grows to 80. Pulsing brightness. "HEAVY" text appears at 75% charge. She tracks the player's horizontal position during windup (slow drift at 1.4-2.0 speed).

**Active hit (14 frames):** Massive 120 × 76 px rectangle extending from her front. She dips up 15px and slams back down (7-frame dip animation). Screen shake (intensity 8, duration 16).

**Damage:** 2, HUGE knockback (vx 18, vy -9, hitStun 22) — meant to send the player flying into the arena wall.
**Cooldown:** 80 frames Phase 2, 55 frames Phase 3

#### DASH-CHAIN (Phase 2+)
**Telegraph (26 frames):** Red horizontal arrow growing from her side in the dash direction. Arrow length grows from 80 to 200px. Arrow has a triangular head. "DASH" text appears at 75%.

**Active:** She slides across the arena at vx=11. Her body IS the hitbox. Bounces off walls up to 2 more times (3 legs total), reversing direction each time. Each chained leg has a shorter timer (24 frames vs 34 first leg).

**Damage:** 1, knockback vx 10, vy -5, hitStun 12
**End:** Enters stagger state for 35 frames after the chain ends.

#### PHASE DASH (Defensive — All Phases)
No telegraph. Instant burst away from the player at vx=13. 13 frames of invincibility (flickering opacity). 16 frames total. No stagger after — she returns to idle quickly (25 frames). This is an escape tool, not an attack.

#### WALL BURST (Phase 2+)
Only fires when she's near an arena wall (within 60px of either edge). She launches away from the wall at vx=11 in a vertical arc (30px peak height over 20 frames, sine curve). 10 frames of invincibility. Wall jump SFX.

#### SHARD SHOT (All Phases)
**Telegraph (22 frames):** Small cyan circle (`#67e8f9`) growing at her center, radius 8 to 14.

**Fires:** One aimed projectile (12×12 px orb) toward the player at speed 5. Projectile color: pale violet (`#c4b5fd`), drawn as a filled circle.

**Damage:** 1, knockback vx 4, vy -3
**Cooldown:** 90 frames Phase 1, 55 frames Phase 2+

#### BEAM CHANNEL (Phase 2+)
**Telegraph (45 frames):** Red rectangle extending from her front side, growing wider (60 → 160px). "BEAM" text above her. Red with sine-pulsing alpha.

**Active (90 frames):** Continuous red beam (700px long, body-height + 8px tall) extending from her front. Bright red outer layer, paler inner core. She tracks the player horizontally. Deals 1 damage every 6 frames on contact.

**End:** 32-frame stagger.

#### REVERSED VOID TETHER (Phase 2+)
**Telegraph (35 frames):** A dashed red line (`#f87171`) connecting her center to the player's center. Line gets thicker and more opaque as it charges. "TETHER" text appears at 70%. This is RED, not the player's teal — corrupted version.

**Active:** She accelerates toward the player (starts at 35% of max speed, ramps up to full speed 9 over time). Her body is the hitbox during travel.

**Damage on arrival:** 2, knockback vx 14, vy -8, hitStun 18
**End:** 30-frame stagger at player's position.

#### BOSS STILLPOINT (Phase 3 Only — Centerpiece Move)
**Telegraph (55 frames):** Golden ring expanding outward from her center (`#fbbf24` stroke), radius grows to 120px × progress. Sine-pulsing opacity.

**Activation:** Burst of particles — 18 red + 12 golden. Major screen shake (30 intensity). Quote: *"You think stillness belongs to you?"*. Activates her own Stillpoint: the entire game slows down (player, all enemies, all projectiles) for 150 frames (~2.5s). She herself is IMMUNE to her own slow. 420-frame cooldown.

**Visual while active:** Large pulsing red ring (140px radius, 4px stroke) around her, on top of the persistent Phase 3 aura.

#### TELEPORT (Phase 2+, 12% chance per attack pick)
She vanishes (moves offscreen). Vortex rings spin at departure. After 15 frames, reappears at a random arena position with a 15-frame white flash.

#### SUMMON (Phase 2+, periodic)
Signals game to spawn small enemies at arena edges. No visual telegraph from her — the enemies just appear at x=60 and x=740.

### Precognition System (All Phases)
When the player commits to a move (charging heavy attack, holding Stillpoint, aiming Shard Shot, or attacking), she reads it:
- **Phase 1:** Text popup "I SEE IT COMING" (blue `#93c5fd`). Responds with a reposition (Phase Dash or Lunge), not a counter-attack. Phase 1 is about feeling outread, not outfought.
- **Phase 2+:** Text popup "READ." (blue). Responds with a real counter-attack matched to what was read (heavy → Dash-Chain, Stillpoint → Lunge, Shard → Phase Dash, attack → Melee Swing).

### Adaptation System
After 6 total hits, "— ADAPTING —" text in lavender. She biases future attack selection toward countering whatever the player uses most (melee vs. ranged).
After 5 consecutive hits in Phase 2+: "ENOUGH" text in gold, immediately fires a Charged Heavy.

---

## 2. COLOSSUS CORE / CRAG WARDEN

**ID:** `colossus_core` (class `ColossusCore` in `game/enemy.js`)
**Region:** Crag of the Colossus
**Size:** 84 × 92 px — towering, well past human scale
**Color:** Procedural body (orange-brown rocky)
**Lore:** A massive stone/crystal golem. Only Heavy Attacks damage it — normal hits bounce off.

### Visual States

| State | What it looks like |
|-------|--------------------|
| **Idle** | Slow walk toward player when distant (30% speed). Stationary when close. |
| **Telegraph (charge)** | Stands still, 40-frame windup. Visible power-up. |
| **Charging** | Barrels forward at speed 4.2. Body leading edge is the hitbox. |
| **Swing telegraph** | 26-frame windup, shorter/punchier than charge. |
| **Swinging** | Overhead haymaker — wide arc. |
| **Stun (parry)** | Frozen, flashing. |
| **Bounce flash** | Brief white flash (8 frames) when a non-heavy hit bounces off harmlessly. |
| **Dead** | Death timer increments (handled by game). |

### Attacks

#### CHARGE
**Telegraph (40 frames):** Stands still, heavy telegraph SFX.
**Active (50 frames):** Charges at speed 4.2 in facing direction. Front-edge hitbox (26px wide, body height - 20px).
**Damage:** 2, knockback vx 6, vy -2, hitStun 14
**Recovery:** Returns to idle, 70-frame wait + 60-frame attack cooldown.

#### OVERHEAD SWING
**Triggers when:** Player is within 150px (too close to bother charging).
**Telegraph (26 frames):** Shorter windup.
**Active:** Wide haymaker — hitbox 56px wide extending from front, 70% of body height, starts 10px above top edge. Reaches further and covers more vertical space than the charge.
**Damage:** 2, knockback vx 5, vy -9, hitStun 18 (big upward launch)
**Recovery:** 60-frame cooldown.

### Key Design Note
Normal hits show a bounce flash + SFX but deal zero damage. Only Heavy Attacks (charged attacks) work. This is the core mechanic — you must commit to slow, heavy swings against a fast, aggressive enemy.

---

## 3. THE CONDUIT

**ID:** `static_guardian` (class `TheConduit` in `game/enemy.js`)
**Region:** Static Field
**Color:** `#6558F5` (electric indigo-violet)
**Size:** Default ComposedEnemy size
**Lore:** A human scientist who creates the world's weaponry and electronics. Her tell is electricity, not scale — she's human-sized, not a golem.
**Health:** 26, knockback resistance 0.2

### Movement
Ground chase at speed 1.4, patrols at 0.6. Aggressive positioning.

### Attacks

#### HOMING ELECTRIC BOLT
**Range:** 380px, **Windup:** 30 frames, **Active:** 18 frames
Single homing projectile, pale indigo (`#a5b4fc`), speed 4, homes for 40 frames
**Damage:** 1, **Cooldown:** 90 frames
**SFX:** Electric ability sound

#### ELECTRIC SPREAD
**Range:** 300px, **Windup:** 34 frames, **Active:** 18 frames
3 projectiles in a 40° spread, indigo (`#6558F5`), speed 3.5
**Damage:** 1, **Cooldown:** 130 frames
**SFX:** Electric ability sound

### Phase 2 (≤50% HP)
- Speed × 1.25, damage × 1.2, cooldowns × 0.85
- Gains **electroweak decay DoT:** every hit inflicts a damage-over-time effect (1 damage per tick, 45-frame tick interval, 150-frame total duration)

**Visual concept:** A human-scale scientist wreathed in electricity. Not physically imposing — dangerous because of her technology. Phase 2 she's angrier, faster, and her hits leave a lingering electric burn.

---

## 4. THE MIRROR KING

**ID:** `hollow_guardian` (class `MirrorKing` in `game/enemy.js`)
**Region:** Mirror Veil
**Color:** `#c084fc` (soft purple)
**Size:** Default ComposedEnemy size
**Lore:** Evil-by-choice section chief who duplicates himself. Vain, elusive. NOT knockback-resistant (hard punishes work).
**Health:** 30

### Attacks

#### MELEE SWING
Standard melee attack.
**Damage:** 2
**Cooldown:** 100 frames

#### SPREAD PROJECTILE (represents duplicated shard volleys)
**Range:** 340px detection
**Windup:** 32 frames
**Active:** 16 frames — fires 4 projectiles in a 50° spread fan
**Projectile color:** Purple (`#c084fc`)
**Speed:** 3.5
**Damage:** 1
**Cooldown:** 120 frames

#### COUNTER STANCE (the "mirror" — reflects your swing back at you)
**Range:** 60px
**Windup:** 18 frames
**Active window:** 26 frames — if the player hits him during this, the damage is reflected back
**Counter damage:** 2, knockback vx 6, vy -5, hitStun 14
**Cooldown:** 160 frames

### Defense
**Dodge:** 35% chance to dodge when player swings nearby (90px range), 16 i-frames, 150-frame cooldown.

### Phase 2 (≤50% HP)
- Speed × 1.25, cooldowns × 0.8, damage × 1.15
- Spread shot upgrades: 6 projectiles, 70° angle (wider, denser fan)

**Visual concept:** His "copies stop protecting him" — the coy counter-play drops for a faster, harder, more direct assault.

---

## 5. GRAVITON GUARD (Sovereign's Guard)

**ID:** `graviton_sentinel` (class `GravitonGuard` in `game/enemy.js`)
**Region:** Graviton Core
**Color:** `#94a3b8` (steel gray)
**Size:** 34 × 46 px (bigger than a normal enemy)
**Lore:** Sympathetic — loyal guard with no one left to be loyal to. Shield-based fighter.
**Health:** 34

### Attacks

#### SHIELD BASH (dash_charge)
**Range:** 260px
**Windup:** 32 frames
**Active:** 20 frames — charges at speed 8
**Damage:** 3, knockback vx 7, vy -5, hitStun 16
**Cooldown:** 140 frames

#### MELEE SWING
**Damage:** 2
**Cooldown:** 90 frames

### Defense
**Block:** 55% chance to raise guard when player swings (100px range), holds for 32 frames, 120-frame cooldown.
**Shield HP:** 10 — a separate breakable shield pool. When broken, 100 frames of vulnerability before it regenerates (200-frame regen interval).

### Phase 2 (≤50% HP) — Shield breaks, harder hits
- Speed × 1.15, knockback resistance × 1.4
- Dash charge gets heavier knockback: vx 11, vy -8, hitStun 22
- Gains **arc projectile** (ceiling rubble): range 320, windup 28 frames, speed 3, damage 2, gray color (`#78716c`), arcing trajectory

---

## 6. THE ASSEMBLER

**ID:** `paradox_engine` (class `TheAssembler` in `game/enemy.js`)
**Region:** Paradox Engine
**Color:** `#fb923c` (orange)
**Size:** Default
**Lore:** Open moral axis — the creator herself, still maintaining every warp field. Uses portals.
**Health:** 32, slight knockback resistance (0.15)

### Movement: Portal Blink
Teleports to behind the player every 150 frames (Phase 1) / 70 frames (Phase 2). Blink distance 90px / 140px. Uses portal SFX, not personal teleport.

### Attacks

#### SLAM (dash_charge)
**Range:** 260px, **Windup:** 26 frames, **Active:** 18 frames
**Charge speed:** 9
**Damage:** 2, knockback vx 6, vy -5, hitStun 14

#### SHOCKWAVE (360° spread)
**Range:** 260px, **Windup:** 30 frames, **Active:** 10 frames
Fires **8 projectiles** in a full **360° spread** — a radial burst
**Color:** Orange (`#fb923c`), **Speed:** 3.5, **Damage:** 1

#### TRACKING BEAM
**Range:** 420px, **Windup:** 40 frames, **Active:** 40 frames
Continuous beam, 14px wide, tracks the player
**Damage:** 1 per tick (14-frame tick cooldown)

### Phase 2 (≤50% HP)
- Blink interval halved (70 frames), distance nearly doubled (140px), cooldown halved (35 frames)
- Cooldowns × 0.85, damage × 1.15

---

## 7. THE STATIONMASTER

**ID:** `timeline_keeper` (class `TheStationmaster` in `game/enemy.js`)
**Region:** Timeline Crossroads
**Color:** `#fbbf24` (gold/amber)
**Size:** Default
**Lore:** Evil-by-choice scientist who ordered the child's creation. Runs the shelter's transit and a prison. Fights with brainwashed prisoners and "locomotives."
**Health:** 30, slight knockback resistance (0.15)

### Phase 1: Ground + Prisoners
Starts with **3 brainwashed prisoners** (weak adds: 3 HP each, gray `#a8a29e`, basic melee, speed 1.0). They fight alongside him.

#### LOCOMOTIVE SWEEP (dash_charge)
The signature attack — represented as a very fast, long-range charge.
**Range:** 500px, **Windup:** 40 frames, **Active:** 14 frames
**Charge speed:** 13 (fastest in the game)
**Damage:** 3, knockback vx 8, vy -5, hitStun 18
**SFX:** Train sweep sound

#### MELEE SWING
**Damage:** 2, **Cooldown:** 100 frames

### Phase 2 (≤50% HP): Takes to the air
- **Movement switches to hover** (maintain distance at 220px, bobbing amplitude 14px)
- Knockback resistance × 4 (absorbs huge knockback but keeps flying)
- Dash charge becomes aerial
- Dash charge knockback upgrades: vx 9, vy -6, hitStun 20

**Visual concept:** Phase 1 is a ground brawler hiding behind his prisoners. Phase 2 he takes flight himself — now he's the locomotive, swooping across the arena.

---

## 8. QUANTUM PURSUER

**ID:** `abyss_guardian` (class `QuantumPursuer` in `game/enemy.js`)
**Region:** Echoing Abyss
**Color:** `#f472b6` (pink)
**Size:** Default
**Lore:** Evil-by-choice. Releases a delayed shadow of the player's soul.
**Health:** 26

### Unique Mechanic: THE SHADOW
A translucent pink copy of the PLAYER that follows the player's own movements on a 0.5-second delay (30 frames). It traces exactly where the player was half a second ago. If the player touches their own shadow, they take 1 damage (60-frame hit cooldown). Forces constant movement — you can never stand still.

**Shadow visual:** Player's silhouette at 35% opacity, filled with the Pursuer's pink color.

### Attacks

#### HOMING BOLT (Phase 1)
**Range:** 420px, **Windup:** 45 frames, **Active:** 20 frames
Single homing projectile, pink (`#f472b6`), speed 4, homes for 50 frames
**Damage:** 2

### Phase 2 (≤50% HP)
- Knockback resistance jumps from near-zero to 0.5 (huge increase)
- Attack becomes a **3-shot spread** (30° angle) at longer range (520px), faster cooldown (100 frames)

**Visual concept:** Phase 1 is a squishy ranged caster you can bully with knockback while dodging the shadow. Phase 2 he's "soul-charged" — harder to push around and carpets the arena with projectiles.

---

## 9. WARDEN & HOLLOW (Duo Fight)

**Region:** Warp Gate Nexus
**Lore:** Sympathetic — dutiful gatekeepers whose shift never ended. A reactive counter-pair that forces toolkit-switching.

### WARDEN (Primary — tracked as the miniboss)
**ID:** `warp_guardian`
**Color:** `#94a3b8` (steel gray)
**Health:** 20

**Attacks:** NONE. Warden has no offensive attacks.
**Defense:** **Guaranteed block** — 100% chance to raise guard on player swing (100px range), 30-frame guard, 110-frame cooldown.

**Strategy:** You can't melee the Warden. Use Shard Shot or Phase Dash.

### HOLLOW (Add — spawns alongside Warden)
**ID:** `warp_guardian_hollow`
**Color:** `#38bdf8` (sky blue)
**Health:** 16

**Attacks:** NONE. Hollow also has no offensive attacks.
**Defense:** **Guaranteed ranged dodge** — 90% chance to dodge any Shard Shot within 260px range, 20 i-frames, 80-frame cooldown.

**Strategy:** You can't shoot Hollow. Must use melee.

**The puzzle:** Melee Hollow (the ranged-dodger), shoot Warden (the melee-blocker). Forces the player to switch tools constantly.

---

## 10. ELECTROMAGNETIC GOLEM

**ID:** `polar_guardian` (class `ElectromagneticGolem` in `game/enemy.js`)
**Region:** The Polar Shift
**Color:** `#f7e600` (electric yellow)
**Size:** 72 × 84 px — LARGE machine
**Lore:** Directed by an unnamed evil scientist. Magnetizes the room's platforms.
**Health:** 24 (deliberately low for its size)

### Attacks

#### MELEE SWING
**Damage:** 2, heavy knockback: vx 9, vy -7, hitStun 20

#### CHARGE (dash_charge)
**Range:** 300px, **Windup:** 34 frames, **Active:** 20 frames
**Charge speed:** 8
**Damage:** 3, knockback vx 10, vy -6, hitStun 22

### Unique Mechanic: MAGNETIZE
On a timer (220 frames Phase 1, 140 frames Phase 2), charges all `magnetizable` platforms in the room to a random polarity (positive or negative). Burst of yellow particles when activated.

- **Phase 1:** Platforms get a charge (push/pull the player). Player's own charge is only set if they touch a counterplay platform — the tension is picking up a charge voluntarily.
- **Phase 2 (≤50% HP):** Force-sets the player's charge to the OPPOSITE of the surfaces, guaranteeing a hard pull-in. This IS an attack — "charge-reversal slam."

**Visual concept:** A giant yellow/gold machine that periodically electrifies the room's surfaces. Weak to projectiles, no shield. The room itself is the weapon.

---

## 11. GRAVITY COLLAPSE CORE (Horizon Core)

**ID:** `horizon_core` (class `HorizonCore` in `game/enemy.js`)
**Region:** Event Horizon
**Color:** `#818cf8` (indigo)
**Size:** 80 × 64 px — massive flying construct
**Lore:** Not a person — a runaway mining extraction accident. Changes room gravity.
**Health:** 30, **fully knockback immune** from frame 1

### Movement
Hovers, maintains 260px distance, bobs gently (16px amplitude). Immune to its own gravity shifts (it flies).

### Attacks

#### DEBRIS PROJECTILE
**Range:** infinite, **Windup:** 34 frames, **Active:** 16 frames
Straight-line projectile, indigo (`#818cf8`), speed 4
**Damage:** 2

#### GRAVITY FLIP
Changes the room's gravity direction to one of 4 directions (up/down/left/right). The player, all ground enemies, everything is affected — except the Core itself.

### Phase 2 (≤50% HP)
- Cooldowns × 0.8, damage × 1.15
- Same attacks, just denser/faster — "denser hazard layering"

**Visual concept:** A massive indigo construct floating serenely above the chaos it causes. The player is being tossed around by gravity while dodging debris.

---

## 12. TEMPORAL WARDEN

**ID:** `chrono_ally` (class `TemporalWarden` in `game/enemy.js`)
**Region:** Chrono-Space Rift
**Color:** Dark violet body (`#2e2a4a`), cyan accents (`#67e8f9`)
**Size:** 32 × 40 px
**Lore:** Sympathetic — a time mage who holds back out of guilt. Restrained offense throughout.
**Health:** 26

### Visual Design
- **Body:** Triangular robed silhouette — hooded time-mage shape (top vertex at head, wide base at feet)
- **Hourglass core:** Small cyan circle at chest level, fills up as the rewind cycle progresses
- **Eyes:** Two small rectangles, cyan normally, white during the rewind-flash window
- **Flash ring:** Pulsing cyan circle (3px stroke) around him during the interrupt window

### Movement
Floats — no gravity, gentle sine-wave bob. Kites at 240px preferred distance (backs away if player gets close, drifts in if too far). NOT aggressive.

### Attack: CHRONO BOLT
**Telegraph (34 frames):** Small cyan glow growing at his center (radius 6→14).
Fires a single slow projectile (speed 3, straight line, cyan `#67e8f9`).
**Damage:** 1
**Cooldown:** 100 frames

That's it — one slow, telegraphed projectile. He's deliberately weak offensively.

### Core Mechanic: HEALTH REWIND
Every ~10 seconds (600 frames), he attempts to rewind all damage taken during that cycle.

**The cycle:**
1. Timer counts down from 600 to 0
2. At 90 frames remaining (~1.5s before rewind), the **flash window** starts:
   - Pulsing cyan ring around him
   - Eyes turn white
   - Cyan particles burst
3. If the player deals **4+ damage during the flash window**, the rewind is INTERRUPTED (gold particles, damage sticks)
4. If NOT interrupted, he heals back to his HP at the cycle's start (cyan particles, screen shake)
5. Cycle resets

**Visual tell design:** The hourglass core filling up IS the countdown. The pulsing ring + white eyes IS the "hit me NOW" tell.

### Stillpoint Resistance
The ONE non-boss enemy with partial Stillpoint resistance. Ramps in after the player uses Stillpoint 3+ times against him specifically. Caps at 30% resistance (not immunity). Narratively justified as foreshadowing — he's a time mage.

### Reward on Defeat
+1 Stillpoint lifesteal (not the usual +1 Max Health).

---

## 13. THE UNDERTOW

**ID:** `void_expanse_boss` (class `Undertow` in `game/enemy.js`)
**Region:** Void Expanse
**Color:** `#1a0b2e` (near-black deep purple)
**Size:** Default
**Lore:** Child of a scientist obsessed with darkness, merged with the void. Steals what people hold dearest.
**Health:** 30, slight knockback resistance (0.15)

### Movement: Portal Blink
Teleports on interval (160 frames Phase 1, 90 frames Phase 2). Blink distance 200px/260px. Portal SFX. A chase/pressure fight.

### Attacks

#### HOMING BOLT
**Range:** 380px, **Windup:** 32 frames, **Active:** 18 frames
Single homing projectile, dark purple (`#4c1d95`), speed 4, homes for 45 frames
**Damage:** 2

#### GRAVITY WELL (the "stealing" attack)
**Range:** 260px, **Windup:** 40 frames, **Active:** 20 frames
Spawns a gravity well projectile — **zero damage**, but pulls the player toward it (radius 110px, pull strength 0.22). Near-black color (`#0f0620`). Void pull SFX.
**Phase 2:** Radius increases to 150px, pull strength to 0.32.

#### SPREAD SHOT
**Range:** 340px, **Windup:** 30 frames, **Active:** 16 frames
5 projectiles in a 60° spread, dark violet (`#6d28d9`), speed 3.5
**Damage:** 1

### Phase 2 (≤50% HP)
- Blink faster/further, cooldowns × 0.8, damage × 1.15
- Gravity well becomes stronger and wider

**Visual concept:** A dark, near-invisible figure that teleports around the arena, pulling you into void wells while pelting you with dark projectiles. The fight is about staying mobile and not getting sucked in.

---

## 14. THE CHILD (Antechamber)

**ID:** `antechamber_child` (class `TheChild` in `game/enemy.js`)
**Region:** Antechamber
**Color:** `#e2b8a3` (warm skin tone)
**Size:** Default
**Lore:** The player's companion, grown up among escaped prisoners after separation. Fights with scavenged weapons (tasers, flamethrowers, bombs, guns). This fight REPLACES the Abandoned Shell as the consequence of losing the child. Triggers the Absorb/Spare choice on defeat.
**Health:** 22, slight knockback resistance (0.1)

### Attacks (Scavenged Weapons)

#### GUN
Ranged projectile (uses the WarScavenger gun preset — check `GUN_NORMAL`/`GUN_STRONG` constants in enemy.js for exact stats).

#### TASER
Close-range shock weapon (uses `TASER_NORMAL`/`TASER_STRONG` presets).

#### FLAMETHROWER
Cone/stream attack (uses `FLAMETHROWER_NORMAL`/`FLAMETHROWER_STRONG` presets).

#### SCAVENGED BOMB (mine pattern)
**Range:** 300px, **Windup:** 45 frames
Throws a mine that arms after 60 frames, then detonates in a 70px radius
**Damage:** 2, color amber (`#f59e0b`)

### Regen
Heals 1 HP every 150 frames unless hit within the last 120 frames.

### Three Phases

**Phase 1 (100%–66% HP):** Fights alone with normal weapons.

**Phase 2 (66%–33% HP):** Calls **2 brainwashed prisoners** (same weak adds as the Stationmaster's — 3 HP each, gray, basic melee).

**Phase 3 (≤33% HP):** Rage-boosted.
- Speed × 1.3, cooldowns × 0.7, damage × 1.3
- All weapons upgrade to their STRONG variants (faster, harder-hitting)

**Visual concept:** A tragic fight — this is your former companion, now hostile, using improvised weapons. The three phases mirror the Stationmaster fight (prisoners are literally the same people).

---

## 15. ABANDONED SHELL

**ID:** `abandoned_shell` (class `AbandonedShell` in `game/enemy.js`)
**Region:** Hollow Core
**Color:** `#dc2626` (red)
**Size:** Default
**Lore:** A ghostly, red-eyed boss that copies your moves. HP ~48 (60% of the Sovereign's 80). Fights every playthrough unconditionally.
**Health:** 48, knockback resistance 0.15

### Movement
Ground chase at speed 1.3, can jump. Patrols at 0.6. Aggressive and mobile.

### Attacks (mirrors of the player's own kit)

#### MELEE SWING (mirrors player's basic attack)
**Damage:** 2, **Cooldown:** 90 frames

#### DASH CHARGE (mirrors Phase Dash)
**Range:** 300px, **Windup:** 20 frames (fast!), **Active:** 16 frames
**Charge speed:** 12
**Damage:** 2, knockback vx 6, vy -5, hitStun 14

#### RANGED PROJECTILE (mirrors Shard Shot)
**Range:** 360px, **Windup:** 28 frames, **Active:** 14 frames
Single straight-line projectile, red (`#f87171`), speed 5
**Damage:** 1

### Phase 2 (≤50% HP)
- Speed × 1.2, cooldowns × 0.8, damage × 1.15
- Same attacks, faster and harder

**Visual concept:** A red-eyed echo of the player. Everything it does should look like a corrupted/twisted version of the player's own moveset. It's fast, aggressive, and hits hard — a mirror match.

---

## 16. THE PLAYER

**Class:** `Player` in `game/player.js`. Draw math for attacks/abilities lives in `game/attackVFX.js` (kept separate so `anim_editor.html` and `animdata.js`'s `POSE_RENDERERS` can reuse the exact same shapes/hitboxes).
**Size:** 24 × 32 px normal, 16 px tall while ducking (`normalHeight`/`duckHeight`).
**Lore:** She's also the Fractured Sovereign's "past self" — worth keeping a visual thread between the two (see §1's palette: the Sovereign's violet `#8b5cf6`/lavender core `#e0d4ff` echoes the player's own violet/lavender below, deliberately).

### Base Body
- **Fill:** `#c4b5fd` (light violet) normally, swaps to `#a5f3fc` (cyan) for the entire duration Stillpoint is active — this is the primary "is Stillpoint on" read for the player's own body, separate from the halo effect below.
- **Chest core:** small 8×8 glowing square at `x+8, y+12`. `rgba(224,215,255, 0.55)` normal, `rgba(103,232,249, 0.95)` during Stillpoint (brighter + cyan).
- **Eyes:** `#0a0a0f` (near-black), 6×6px square, offset to whichever side she's facing (`x+14` facing right / `x+4` facing left).
- **Hurt/invincibility:** no color change — flickers by skipping the draw call every other 4-frame window while `invincibleTimer > 0`.
- **Squash/stretch (pure transform, not animator-driven):** airborne stretch scales with `|vy|`, a landing squash on touchdown, ducking adds a 1.15× horizontal stretch.

### Movement/Ability VFX
| Effect | Visual |
|---|---|
| **Dash trail** | Color interpolates violet→cyan by combo-chain tier: `rgb(196,181,253)` at tier 0 → `rgb(103,232,249)` at max tier. Max-chain trail adds `rgba(103,232,249,0.6)` sparkles. |
| **Phase Dash** | Solid `#a78bfa` afterimage ghosts + a soft `rgba(196,181,253,0.18)` halo trailing behind. |
| **Wall-slide** | Radial gradient glow `rgba(196,181,253, pulse)` → transparent against the wall, plus `rgba(203,245,255, pulse×0.6)` sparkles. |
| **Echo (Phase Dash afterimage/decoy)** | Body `#c4b5fd`, distraction-radius ring `rgba(196,181,253, alpha×0.3)`, swing arc `rgba(196,181,253, 0.9×t)`. |
| **Stillpoint halo** | Fill `rgba(103,232,249, 0.12×pulse)`, stroke `rgba(103,232,249, 0.55×pulse)` — expanding/contracting ring, distinct from the body-color swap above. |
| **Shard Shot aim line** | Dotted amber `#fbbf24` line with a matching glow, shown while aiming. |
| **Shard Shot Lv3 beam** | Upgraded aim becomes a solid beam, `rgba(103,232,249, 0.85×pulse)` with a `#67e8f9` cyan glow — same cyan family as Stillpoint, visually ties the two abilities together. |
| **Graviton Surge** | Pink/magenta `rgba(244,114,182, alpha)` — a radial pull-field plus a solid core ball. The one ability that breaks from the violet/cyan palette entirely (deliberately reads as a "foreign," heavier force). |
| **Limit Break aura** | Blue: fill `rgba(59,130,246, 0.22×pulse)`, stroke `rgba(96,165,250, 0.8×pulse)` — the other palette-breaking effect, signals "temporary overdrive" rather than a core kit ability. |
| **Heavy-attack charge glow** | Amber `rgba(251,146,60, alpha)`, expanding halo + ring while charging a heavy swing. |

### Attack Swings (Melee)
Attack slash VFX for every direction share one look: white/near-white strokes `rgba(255,248,255, alpha)` fading through secondary lines in `rgba(224,215,255,...)` / `rgba(196,181,253,...)`, plus a bright white flash burst `rgba(255,250,255, alpha)` at the swing's midpoint frame.

Hitbox sizes (from `attackVFX.js`):

| Attack | Size (w×h) | Damage | Duration |
|---|---|---|---|
| Forward | 58 × 28 | 1 | 12 frames (`ATTACK_VFX_FRAME_COUNT`) |
| Up | 30 × 36 | 1 | 12 frames |
| Down | 40 × 24 | 1 | 12 frames |
| Heavy Forward | 44 × 50 | 2 (`HEAVY_DAMAGE`) | 16 frames (+4 heavy extra) |

Cooldown between swings: 18 frames. Heavy knockback multiplier: ×2.5.

### Anim-Editor State — what's authored vs. still on legacy fallback
Two parallel animator systems exist (`animKeyForAttack()` for swings, `playerBodyStateKey()` for movement pose, plus independent overlay keys for abilities), but **only two keys have real `ANIM_DEFS` entries in `game/animdata.js` right now**:

- `player_attack_forward` — 3 frames (3f/5f/4f), pose `attack_swing` dir `forward`, hitbox lands on frame 2 (`{x:24,y:6,w:58,h:28}`), frame 3 is cancelable into a combo follow-up.
- `player_attack_up` — same 3-frame shape, hitbox `{x:-5,y:-28,w:40,h:36, noMirror:true}`.

**Everything else below still renders through the old hardcoded `drawPlayerBody()`/`drawAttackVFX()` code path, not `anim_editor.html`-authored frames — these are the open slots to fill in:**
- `player_attack_down` (no entry yet)
- Heavy variants of all three directions (`player_attack_forward_heavy`, etc. — no entries yet)
- Body/movement poses: `player_idle`, `player_run`, `player_jump`, `player_fall`, `player_duck`, `player_wallslide`, `player_phasedash`, `player_dash_chain1/2/3` (none authored)
- Overlay poses: `player_stillpoint`, `player_shardshot_aim`, `player_shardshot_beam`, `player_gravball` (none authored)

(`editor/anim_editor.html`'s "Companion" category is for the Child, §14 — not the player. There is no equivalent player category label yet; player keys are added by their raw key name via the `?anim=` deep link.)

---

## 17. STUTTERER (Common Enemy)

**ID:** `stutterer` (class `Stutterer extends ComposedEnemy` in `game/enemy.js`)
**Size:** 28 × 28 px (default `ComposedEnemy` size, no override)
**Color:** `#a78bfa` (violet)
**Health:** 6
**Placement:** the single most-placed enemy type in `area.js` (37 placements) — this is the one players will see the most, by a wide margin.
**Concept:** a stuttering, glitchy melee enemy that repeatedly blinks itself directly behind the player rather than walking — closes distance in bursts, not a chase.

### Movement — Blink
Every 120 frames, teleports to land 110px behind the player's current facing direction (grounded — falls/rests on the floor between blinks, doesn't fly). Each blink:
- Leaves a **fading decoy** at the departure point: same violet `#a78bfa` fill, fades out over 60 frames.
- **Flash** on arrival: visibility toggles on/off for 15 frames (a stutter/glitch flicker, matching the name).
- **Particle burst:** 6 violet particles at the arrival point.

### Attack — MELEE SWING
**Range:** 100px, **Windup:** 28 frames, **Active:** 20 frames
**Hitbox:** 30 × 24, positioned at the enemy's leading edge
**Damage:** 1, knockback vx 5, vy -4, hitStun 10
**Cooldown:** 120 frames

No counters, no defense verbs, no shield/regen — a straightforward, low-HP swarm-style threat whose entire identity is the teleport-blink movement.

### Generic ComposedEnemy Visuals (shared with §18 and most non-boss enemies)
Since it doesn't override `draw()`, it renders through the shared `ComposedEnemy.draw()` path:
- **Body:** plain filled rectangle in `this.color` (`#a78bfa`), EXCEPT: white `#ffffff` for the first 6 frames after taking a hit (flash), amber `#fbbf24` while winding up an attack.
- **Eyes:** `#0a0a0f`, 8×6px, offset to facing side.
- **Windup telegraph:** expanding orange ring `rgba(255,120,40, 0.3 + progress×0.5)` plus a bold amber `!` above its head.
- **Active-hitbox outline:** `rgba(255,200,100,0.6)` stroke while the swing is live.
- **Death fade:** alpha ramps 1→0 over 20 frames.

**Attacks still to design/fill in:** currently only the one melee swing — no ranged option, no secondary "stutter" attack variant despite the glitch-blink identity. Worth deciding whether the visual glitch-flicker should extend into the attack windup itself (e.g., the `!` telegraph double-flickering) to sell "stutter" as a combat trait, not just a movement trait.

---

## 18. STILLPOINT REVENANT (Common Enemy)

**ID:** `stillpoint_revenant` (class `StillpointRevenant extends ComposedEnemy` in `game/enemy.js`)
**Size:** 28 × 28 px (default, no override)
**Color:** `#818cf8` (indigo/periwinkle)
**Health:** 7
**Placement:** second most-placed enemy type in `area.js` (32 placements) — the other enemy nearly every player will fight repeatedly.
**Concept:** the first (and currently only) enemy anywhere in the codebase built specifically to counter the player's Stillpoint ability directly, rather than just being slowed by it like everything else.

### Movement — Ground Chase
Standard ground chase, but deliberately slower than the `ground_chase` default: speed 1.1 (vs. default 1.5), patrol speed 0.5 (vs. default 0.7). Chases when the player is in sight range along its facing direction; patrols between a fixed range otherwise. Stops at ledges — doesn't jump.

### Attack — MELEE SWING
Uses the shared `melee_swing` defaults: **range** 40px, **windup** 28 frames, **active** 15 frames, **hitbox** 30 × 24, **knockback** vx 5, vy -4, hitStun 10.
**Damage:** 1, **Cooldown:** 100 frames

### Signature Mechanic — STILLPOINT COUNTER
`counters: [{ ability: 'stillpoint', effect: 'cancel', radius: 100 }]`. While the player has Stillpoint active and stands within 100px of this enemy's center, it force-cancels the player's Stillpoint outright (plays the Stillpoint-end SFX) — described in its own code comment as "emits a slow bubble that cancels your Stillpoint if you stand inside it."

**No visual indicator currently exists for the 100px counter radius itself** — this is the biggest open art gap on this enemy. The only visual tell it has is the shared amber windup ring/`!` telegraph, which is for its *melee attack*, not its passive Stillpoint-cancel field. Needs its own persistent visual (a faint indigo bubble/ring at the 100px radius, pulsing or flickering when the counter is armed vs. triggered) so players can actually read "I'm inside its cancel field" before losing Stillpoint.

### Generic ComposedEnemy Visuals (shared with §17)
Same shared `ComposedEnemy.draw()` path as Stutterer — plain `#818cf8` fill rectangle, white hit-flash, amber windup color/ring/`!`, `#0a0a0f` eyes, orange telegraph ring, death fade over 20 frames. No `ANIM_DEFS` entry exists for it either, so it's 100% on the legacy generic draw path — a candidate for a bespoke pose set given how often players will see it.

**Attacks still to design/fill in:** only the one melee swing exists in code. Given its identity is entirely about the Stillpoint-cancel field, consider whether it needs any active attack at all beyond "punish for standing near it," versus adding a second ranged/pulse attack that reinforces the "stillness enforcer" theme (e.g., a short-range shockwave on top of the passive cancel).

---

## GENERAL ART NOTES

### Anim Key Convention
Every boss/miniboss has animation keys for the anim editor (`editor/anim_editor.html`):
- Boss: `boss_idle`, `boss_melee`, `boss_heavy`, `boss_charging`, `boss_dead`, `boss_active_melee_forward`, etc.
- Colossus: `colossus_idle`, `colossus_telegraph`, `colossus_charging`, `colossus_swinging`, `colossus_dead`
- Temporal Warden: `temporal_warden_idle`, `temporal_warden_flash`, `temporal_warden_telegraph`, `temporal_warden_dead`
- All ComposedEnemy minibosses: use the generic composed-enemy anim bridge
- Player: only `player_attack_forward` and `player_attack_up` are authored; every other key (`player_attack_down`, all `_heavy` variants, all body/movement/overlay keys) is still on the legacy hardcoded draw path — see §16 for the full open list
- Stutterer / Stillpoint Revenant (and most regular `ComposedEnemy` types): no `ANIM_DEFS` entries at all yet — render entirely through the generic composed-enemy draw bridge described in §17/§18

### Common Visual Language
- **Telegraph = growing glow/circle** (the player needs to see it winding up)
- **Active hitbox = the actual weapon art** (sword slash, charge body, beam line)
- **Stagger = vulnerable pose** (the player's punish window)
- **Flash = hit confirmation** (white flash for 8 frames on damage taken)
- **Invulnerability = flickering opacity** (sine-wave alpha)
- **Phase transition = dramatic pause** (90 frames, text popup, invulnerable flash)

### Size Reference
- Player: 24 × 32 px
- Normal enemy: ~28 × 28 px
- ComposedEnemy miniboss: varies, most default size
- Graviton Guard: 34 × 46
- Electromagnetic Golem: 72 × 84
- Horizon Core: 80 × 64
- Colossus Core: 84 × 92
- The Sovereign: 48 × 56
- Stutterer / Stillpoint Revenant: 28 × 28 (default enemy size, no override)
