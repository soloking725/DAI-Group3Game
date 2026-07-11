# STILLPOINT — COMPLETE EXPANSION ROADMAP (FINAL PLAN)

This document outlines the **full expansion** of Stillpoint, building on the existing game (Phase 0–Phase 1.7 already implemented).  
It adds new abilities, reworks existing ones, introduces 13 interconnected spacetime‑themed areas, 26 normal enemies, 2 hard enemies, 8 minibosses, and post‑game content.  
All tasks are grouped into logical phases for incremental development.

---

## TABLE OF CONTENTS

1. [Phase 0: Core Ability Reworks](#phase-0-core-ability-reworks)
2. [Phase 1: New Ability – Graviton Surge](#phase-1-new-ability--graviton-surge)
3. [Phase 2: Enemy Roster (26 Normal + 2 Hard)](#phase-2-enemy-roster-26-normal--2-hard)
4. [Phase 3: New Areas – Spacetime Regions (13 Rooms)](#phase-3-new-areas--spacetime-regions-13-rooms)
5. [Phase 4: Minibosses (8)](#phase-4-minibosses-8)
6. [Phase 5: Post‑Game & Replayability](#phase-5-postgame--replayability)
7. [What This Plan Does Not Include](#what-this-plan-does-not-include-by-design)

---

## PHASE 0: CORE ABILITY REWORKS

*Goal: Make every ability feel essential, intuitive, and rewarding throughout the entire game.*

| # | Task | Files | Description |
|---|------|-------|-------------|
| 0.1 | **Shard Shot – Hold to Aim** | `player.js`, `game.js` | Remove the awkward `W+V` aiming. Replace with **hold‑to‑charge, release‑to‑fire**. While holding `V`, a **visible aiming arc** (glowing dotted parabola) appears. Tap `V` → fire forward instantly. Hold `V` + `Up/W` → arc aims upward smoothly. Hold `V` + `Down/S` → aims downward (for off‑ledge shots). Projectile gains **slight magnetism** toward destructible crystal walls, reducing wasted shots. |
| 0.2 | **Stillpoint – Offensive Buff & Life Steal** | `player.js`, `game.js` | Stillpoint now has **dual use**: ① While active, all melee attacks deal **1.5× damage**. ② Every melee hit landed during Stillpoint restores **1 health pip** (capped at MAX_HEALTH). This turns it from a pure defensive slowdown into a **risk‑reward recovery tool** for tough fights. Additionally, the audio gets a deeper, resonant hum. |
| 0.3 | **Stillpoint – Fracture Drain Adjustment** | `player.js` | The drain rate remains 1 pip per ~1 second, but the life‑steal gives the player a way to sustain it longer by staying aggressive. Visual feedback: a subtle health‑gain flash on each hit. |

---

## PHASE 1: NEW ABILITY – GRAVITON SURGE (G)

*Goal: Introduce a second time‑space manipulation that flips gravity, opening entirely new movement puzzles and combat possibilities.*

| # | Task | Files | Description |
|---|------|-------|-------------|
| 1.1 | **Graviton Surge – Core Implementation** | `player.js`, `game.js`, `ability.js` | Press `G` to **reverse gravity** for 3 seconds. The player walks on the ceiling, and enemies “fall” upward (briefly stunned). Jumping during this lets you “fall” upward. **Cost**: Consumes 1 full Fracture pip. Cannot be active simultaneously with Stillpoint. Cooldown: 120 frames (2 seconds) after the effect ends. |
| 1.2 | **Visual & Audio Feedback** | `player.js`, `audio.js` | Screen tint inverts (cool blue/white shift), particles stream upward. All physics (projectiles, enemies) reverse gravity. Sound: a rising sweep with a low bass pulse. |
| 1.3 | **Integration into Existing Areas** | `area.js` | Place the ability pickup in the new **Graviton Core** region (see Phase 3). Also add a handful of secret rooms in older areas that require Graviton Surge to reach (e.g., a ceiling‑only platform in The Fracture containing a lore fragment). |

---

## PHASE 2: ENEMY ROSTER (26 NORMAL + 2 HARD)

*Goal: Provide a diverse, challenging bestiary that forces the player to use their entire toolkit (dashes, parries, heavy attacks, new abilities).*

### 2.1 Normal Enemies (26 total)

#### From the existing game (re‑used and rebalanced)
- **Fractured** – basic melee rusher (windup + slash).  
- **Stutterer** – teleporting decoy enemy (already in).  
- **Crystal Sentinel** – ranged homing attacker with directional shield (already in).  
- **Fractured Slime** – summoned by boss, charges/hops.

#### New additions (21 more)
1. **Temporal Shard** – Splits into two on death; both must be killed within 3 seconds or they reform. *Counter: Parry the split to prevent division.*
2. **Echo Stalker** – Teleports behind you when you dash. *Counter: Don’t dash predictably; phase‑dash through its spawn point to stun it.*
3. **Phase Sentinel** – Fires delayed homing orbs that accelerate after 1 second. *Counter: Shard‑shot the orbs to detonate them early.*
4. **Gravity Well** – Pulls you toward it if you’re within 200px. *Counter: Use Graviton Surge to flip the pull direction, or phase‑dash out.*
5. **Rift Crawler** – Burrows underground, erupts upward after a 1‑second tell (dust cloud). *Counter: Jump over the eruption and attack from above.*
6. **Void Lancer** – Charging thrust attack (telegraphed by a glowing spear tip). *Counter: Perfect parry to stun it and deal double damage.*
7. **Crystal Arbiter** – Summons 3 homing crystals that orbit it. *Counter: Shard‑shot the crystals to break them before they fire.*
8. **Stillpoint Revenant** – Emits a slow bubble that cancels your Stillpoint if you stand inside it. *Counter: Stay mobile or use Graviton Surge to escape the bubble.*
9. **Fractured Knight** – Carries a front shield that blocks melee and projectiles. *Counter: Phase‑dash through it to attack from behind.*
10. **Shard Spitter** – Fires bouncing projectiles that arc off walls. *Counter: Stay low; the arcs go high.*
11. **Timeworn Husk** – Regenerates 1 HP every 2 seconds if not damaged. *Counter: Burst damage (heavy attack or shard shot) interrupts regeneration.*
12. **Kinetic Striker** – Dashes through you, leaving a spark trail that damages on contact. *Counter: Jump over the dash and punish the recovery.*
13. **Phase Mage** – Teleports randomly and fires a spread shot of 5 small orbs. *Counter: Stay close; the spread is wide, so close range is safer.*
14. **Ruin Stalker** – Clings to walls/ceilings and drops down on you. *Counter: Watch for a shimmer on the surface; attack it while it’s clinging.*
15. **Pulse Warden** – Emits expanding shockwave rings (every 2 seconds). *Counter: Jump over the rings (they are low).*
16. **Echoing Spectre** – Spawns a delayed copy of itself that attacks 1 second later. *Counter: Hit the original during the spawn animation to cancel the copy.*
17. **Temporal Parasite** – Latches onto you, slowing your movement by 30% for 3 seconds. *Counter: Use Graviton Surge to shake it off instantly.*
18. **Void Juggernaut** – Charges through destructible walls; if it hits a wall, it is stunned. *Counter: Lure it into a crystal wall.*
19. **Shard Geyser** – Stationary; sprays shards upward in a cone. *Counter: Approach from the side or use Graviton Surge to flip the spray direction.*
20. **Gravity Scavenger** – Small scuttling insect; on contact, you become “Heavy” (jump and dash distance halved) for 3 seconds. *Counter: Shard‑shot from a distance, or parry the touch to reflect the debuff back.*
21. **Polarity Drone** – Hovers; alternates polarity every 3 seconds. Blue = pushes you away, Red = pulls you in. *Counter: Hit it to flip polarity immediately—use it to your advantage.*
22. **Mirror Sprite** – Translucent ghost that only appears in reflections. It attacks from behind when you’re not facing it. *Counter: Face it directly to make it tangible; parry its attack to shatter it.*
23. **Warp Mite** – Tiny, fast, zips erratically. On contact, it teleports you to a random nearby location (disorienting, no damage). *Counter: Phase‑dash through it—it despawns in confusion.*
24. **Inertial Shieldbearer** – Runs in a straight line, gaining speed. Cannot turn sharply. *Counter: Use Graviton Surge to flip its gravity, sending it into a wall.*
25. **Fractured King's Guard** – (Elite normal) – Uses a greatshield with 3 phases: shield bash, aggressive combos, enrage with shard adds. *Counter: Parry the bash, dodge the combos.*

### 2.2 Hard Enemies (2 total)

26. **Null‑Gravity Brute** – Hovers weightlessly, dashing horizontally with super‑armour. Does not flinch from normal attacks. Only flinches when hit with a **Heavy Attack** or a **Shard Shot** while it is moving. Pattern: charges 3 times, floats up and slams down (slow‑mo shockwave). *Counter: Time heavy attacks or shard shots during its dash.*
27. **Temporal Paradox** – Splits into two silhouettes (blue and red). One is “Past” (blue), one “Future” (red). If you hit the wrong one, the other heals all damage dealt. You must hit the one that flashes a **green** glint (the “Present”). They swap identities every 2 seconds. *Counter: Wait for the green flash and attack; use Stillpoint to slow the swap to give yourself more time.*

---

### 2.3 Ability-Countering Enemies (design philosophy + new entries)

**Why this matters:** right now every counter runs one direction — abilities beat enemy defenses (shields, walls), but nothing pushes back against careless ability use. If Phase Dash, Shard Shot, and Graviton Surge are ever unconditionally safe against everything, players stop making choices and just default to whichever tool is least risky. Every ability needs at least one enemy that makes using it carelessly a real mistake — not a hard wall that disables the ability, but a situational punish that rewards using it *well* instead of *by reflex*.

**On Stillpoint specifically — deliberately NOT giving regular enemies a hard counter to it:** the King's phase-3 immunity ("he sees through the slow and counter-lunges") is supposed to be the thematic payoff of the game's central lore — <br>*"Stillpoint: the moment between moments. He stole ours."* <br>*"The Fractured King does not want your death. He wants someone to finally stop him."* <br>He is the one thing time cannot touch, because he's the one who broke it. If regular enemies also flatly ignore Stillpoint, that moment gets spent too early and cheaply. Keep the existing partial slow-resistance mechanic (2.5 — 30% resistance after 3+ Stillpoint activations in one fight) as the sanctioned *soft* counter, applied broadly. Full immunity stays reserved for the King. The one exception below (Temporal Warden) is a deliberate, narratively-justified foreshadowing beat, not a precedent to repeat elsewhere.

#### New enemies (add to the 25/2 roster above)

28. **Anchor Wraith** *(counters Phase Dash)* — A tethered, semi-transparent enemy that projects a visible stasis field around itself (a faint distortion ring, ~120px radius). If the player Phase Dashes while inside the field, the dash is cancelled mid-motion and the player takes a small hit and loses the dash's i-frames — punishing "dash through everything" as a reflex. *Counter: destroy the Wraith from outside its field radius first (melee or Shard Shot both work), or bait it to move before dashing through the now-empty space.* Spawns in Static Field / Polar Shift.
29. **Null Sentinel** *(counters Phase Dash)* — Alternates between a "phaseable" state (dim, translucent) and a "solid" state (bright glow, ~1s each) on a visible rhythm. Phase Dashing into it while solid deals contact damage and stops the dash; while phaseable, it's a free pass-through, same as intended. *Counter: read the glow state before committing to a dash, the same way players already read enemy windups for parries — this is Phase Dash's version of a telegraph.* Spawns in Mirror Veil / Warp Gate Nexus.
30. **Gravity Anchor** *(counters Graviton Surge)* — A stationary, rooted enemy (plant/crystal-like) that locally nullifies gravity manipulation in its radius: activating Graviton Surge while near one either fizzles instantly (wasting the Fracture pip cost) or briefly re-flips back on you. *Counter: kill the Anchor first (it doesn't move or attack directly, low HP, but is usually guarded by 1-2 other enemies) before trying to Surge in that room.* Spawns in Graviton Core / The Inverted Spire.
31. **Deflector Drone** *(counters Shard Shot)* — Hovers passively, projecting a small directional energy shield on whichever side currently faces the player. A Shard Shot that hits the shield is reflected straight back at the player (dodgeable, but punishes reflexive spam-firing from safe range). *Counter: circle to its unshielded side (melee or Phase Dash both work to reposition fast), or bait a shot then dodge the reflection and punish the shield's brief cooldown afterward.* Spawns in The Polar Shift / Paradox Engine.
32. **Absorber Husk** *(counters Shard Shot)* — A slow, tanky enemy that visibly "eats" Shard Shot projectiles fired at it (a shrinking-orb absorb animation) and heals a small amount of HP per shot absorbed, actively punishing ranged spam instead of just ignoring it. Vulnerable to melee and to Graviton Surge (can't absorb while gravity-flipped and disoriented). *Counter: don't feed it Shard Shots — engage in melee, or catch it right after a Surge flip.* Spawns in Paradox Engine / The Void Expanse.
33. **Temporal Warden** *(partial, narratively-justified Stillpoint resistance — foreshadowing only, not a template to repeat)* — Already listed as Miniboss 4.6. Worth calling out here specifically: this is the ONE enemy below full-boss status that should get anything beyond the standard 30% slow-resistance, and only because its entire identity (a time-rift mage that rewinds its own health) is thematically about resisting time manipulation — it should read as a splinter/servant of whatever broke the world, foreshadowing that something out there can push back against Stillpoint before the King ever does. Do not give this treatment to any other regular enemy; it should stay a singular, memorable beat.
34. **Debris Construct** *(new — Paradox Engine)* — Inert scrap-and-crystal wreckage (visually: the Paradox Engine's own broken machine parts) that assembles itself when the player gets close, telegraphed by a 1-second self-assembly animation (parts snapping together, rising hum) before it can move or attack — a free punish window. Slow, wide, telegraphed shove attack; no ranged option. Exposed core on its back takes double Shard Shot damage, mirroring Crystal Sentinel's shield logic inverted. *Counter: punish the assembly window, or circle behind it for the core — riskier since its shove has decent range.* Fits the Paradox Engine's "giant machine" theme as its scattered offspring.

---

## PHASE 3: NEW AREAS – SPACETIME REGIONS (13 ROOMS)

*Goal: Wrap the existing linear world with a large, interconnected web of new regions, each with unique physics, hazards, and puzzles. All areas are hand‑crafted and contain at least one ability gate or shortcut.*

**Hub**: The Vault (existing) now has **four exits** (North, East, South, West) leading to the new regions.

| # | Area Name | Theme | Key Mechanic | Enemies Found | Ability Required to Enter |
|---|-----------|-------|--------------|---------------|---------------------------|
| 3.1 | **Event Horizon** | Edge of a black hole | Constant gravitational pull leftward; platforming against the current. | Gravity Scavengers, Gravity Wells | Phase Dash (to cross a gap near entry) |
| 3.2 | **Mirror Veil** | Upside‑down reflection world | Background is inverted; secret paths exist only in the reflection. | Mirror Sprites, Echo Stalkers, **Null Sentinel** *(2.3 — Phase Dash counter)* | None (open from The Vault) |
| 3.3 | **Graviton Core** | Gravity‑flipping facility | Levers that flip gravity; contains the **Graviton Surge** ability. | Null‑Gravity Brutes, Polarity Drones, **Gravity Anchor** *(2.3 — Graviton Surge counter)* | Shard Shot (to break a crystal barrier) |
| 3.4 | **The Polar Shift** | Magnetic walls | Blue walls push you away, red walls pull you in; bounce between them like a pinball. | Polarity Drones, Inertial Shieldbearers, **Anchor Wraith** *(2.3 — Phase Dash counter)*, **Deflector Drone** *(2.3 — Shard Shot counter)* | Phase Dash (to cross a magnet gap) |
| 3.5 | **Timeline Crossroads** | Two overlapping time states | Past (crumbling) / Present (safe). Enemies phase in/out; attack only when they are “Present” (golden tint). | Temporal Shards, Echoing Spectres | Stillpoint (to freeze the timeline) |
| 3.6 | **Chrono‑Space Rift** | Looping room | Projectiles and enemies that leave the left side reappear on the right (wrap‑around). | Phase Mages, Shard Spitters | None (open) |
| 3.7 | **The Observatory** | Open‑air with galaxy skybox | Low gravity (floaty jumps, longer falls). Lots of verticality. | Crystal Arbiters, Pulse Wardens | Graviton Surge (to reach high platforms) |
| 3.8 | **Paradox Engine** | Chase zone | A giant machine chases you with a death beam; run through a maze while fighting adds. | Void Juggernauts, Timeworn Husks, **Deflector Drone** *(2.3 — Shard Shot counter)*, **Absorber Husk** *(2.3 — Shard Shot counter)*, **Construct Sentry / The Assembler** *(new miniboss, see 4.7)* | Shard Shot (to destroy machine weak points) |
| 3.9 | **Static Field** | Electromagnetic arcs | Arcs chain across the room; touching the floor zaps you upward (must stay airborne). Also **corrupts the map overlay** — see "Map Interference" below. | Kinetic Strikers, Warp Mites, **Anchor Wraith** *(2.3 — Phase Dash counter)* | Phase Dash (to chain between platforms) |
| 3.10 | **The Inverted Spire** | Gravity inverted upward | Gravity pulls *up*; you start at the “bottom” (which is actually the sky). | Ruin Stalkers, Gravity Wells, **Gravity Anchor** *(2.3 — Graviton Surge counter)* | Graviton Surge (to re‑invert at will) |
| 3.11 | **Warp Gate Nexus** | Teleporter hub | A central room with 3–4 small “challenge vaults” (puzzle rooms). | Rift Crawlers, Shard Geysers, **Null Sentinel** *(2.3 — Phase Dash counter)* | None (open after collecting 3 Keystones) |
| 3.12 | **The Void Expanse** | No solid ground | Entirely moving platforms made of “time‑stopped” debris; time your dashes perfectly. | Fractured Knights, Void Lancers, **Absorber Husk** *(2.3 — Shard Shot counter)* | Phase Dash (to traverse gaps) |
| 3.13 | **Echoing Abyss** | Mirror floor | Your dashes and attacks create lingering echoes (static copies) that stay for 2 seconds and can be used as **platforms** (you can jump on your own echo). | Echoing Spectres, Temporal Parasites | Stillpoint (to freeze echoes in place) |

> **Region-fit audit note:** section 2.3's five ability-countering enemies each named two home regions in prose ("Spawns in X / Y") but were missing from this table's "Enemies Found" column for both — a real mismatch, now fixed above. If you add more ability-countering enemies later, add them to *this* table at the same time you write their counter entry, not just in prose, or they'll silently disappear from the region's actual roster the way these did.

**Map Interference (Static Field only)**: The room's electromagnetic arcs bleed into the player's map overlay (`map.js`) rather than just the room itself.

- While the player is inside Static Field, and for a short time after leaving it, opening the map (`M`) shows visual corruption: room labels flicker/garble, connection lines jitter or briefly vanish, and the player's own position marker drifts and snaps back.
- **Discovered rooms are never actually lost** — this is a presentational glitch layered on top of `drawMap()`, not a change to `discoveredAreas` state. The underlying data is always intact; only the rendering is scrambled, so the effect can be as aggressive as it likes without risk of permanently confusing or softlocking the player.
- The corruption strength scales with proximity to active arc hazards in the room (e.g., a `mapCorruption` value from 0–1 that game.js feeds into `drawMap()`), fading out once the player leaves the region and a few seconds pass.
- A late-game upgrade or lore fragment can grant a "shielded map" that reduces or removes this effect, giving completionists a small reward for full exploration.
- This is a good candidate to prototype early and cheaply: it's a `drawMap()`/canvas-jitter effect layered on existing rendering, not new world geometry, so it's low-risk relative to the rest of Phase 3.

---

**Interconnectivity**: Each area has at least one shortcut that loops back to an earlier area (e.g., Event Horizon has a one‑way door to The Fracture). The Vault acts as the central hub, and the final challenge (Warp Gate Nexus) leads to the true final boss (optional).

---

### 3.14 Non-Linear Structure & Upgrade Placement (see also index.html Phase 6)

The 13 regions above are a *list of themes*, not yet a non-linear world. Turning them into one requires two explicit rules, applied per region before any interior room layout is built:

**Rule 1 — cross-region gating.** Each region's *deepest* reward should require an ability found in a **different** region, not one found earlier in the same region. For example:
- Mirror Veil (3.2, open from The Vault, no ability required) is a good "first region" candidate — but its deepest secret room should require Graviton Surge (found later, in 3.3), not anything found in Mirror Veil itself.
- This is what makes backtracking purposeful: a player who fully clears Mirror Veil early will remember "there was a spot I couldn't reach" and come back once they have Graviton Surge, rather than the region simply being "done" forever after one visit.

**Rule 2 — three placement tiers per region**, not evenly-scattered pickups:
| Tier | Risk/Effort | Placement | Example reward |
|---|---|---|---|
| 1 — critical path | Low | Main route, can't be missed | Whatever's needed to leave the region at all |
| 2 — side room | Moderate (small detour, an optional fight, tighter platforming) | Visible from the main route | Extra Fracture pip, minor stat upgrade |
| 3 — deep/secret | Real (requires an ability from another region, or a real puzzle/miniboss) | True dead end of a branch | Ability upgrade, max-health increase, or a miniboss-guarded item |

Tier 3 rewards are the ones that should feel like *the reason* a completionist explores — not lore text, an actual mechanical upgrade worth detouring for.

**Practical note**: this only works cleanly once the map/door system is built on the compass-graph fix (see the separate map.js/area.js rework) — a region needs a real "this door leads somewhere I can't enter yet" signal on the map, or players will simply forget an unreachable branch exists between visits.

---

### 3.15 Big Rooms, Not Many Small Rooms (why Hollow Knight has so few doors)

Right now the game's structure is: many small single-screen rooms, each connected to the next by a door/transition. Hollow Knight (and most well-regarded Metroidvanias) get the same or greater content density from the opposite approach: **a handful of large rooms per region, each spanning many screens both vertically and horizontally, with far fewer doors between them.** This isn't just aesthetic — it changes what a "region" actually is and how exploration feels. Do this deliberately for every new region below, not just as a stylistic nice-to-have:

**Why fewer, bigger rooms are better here specifically:**
- Every door is a loading/transition moment and a node the map-graph and compass-direction system has to track (see the map.js rework). Fewer doors means a simpler, more legible map, and it means the compass-graph validator has less surface area to get wrong.
- A door hides what's on the other side. A big room lets the player SEE a destination (a ledge above, a passage below, a platform across a chasm) long before they can reach it — that's what actually creates "I'll remember to come back here" moments, far more than a closed door with a lock icon does. This is the mechanism Tier 3 upgrades (3.14) should lean on: put the reward somewhere visible-but-unreachable inside a big room, not behind another door in a different room.
- One big room can contain an entire region's difficulty curve internally (an easy lower section, a harder upper section, a hidden basement) without needing new rooms/doors for each difficulty step.

**How to actually build one (concrete pattern, buildable with your current canvas/camera system):**
1. Define the room's full logical bounds much larger than one screen — e.g. `width: 3000-4000` and use vertical space too (multiple platform "floors" stacked well beyond a single screen height, with the camera scrolling to follow the player vertically as well as horizontally, not just horizontally as the current rooms do).
2. Structure it as 3-6 loosely connected **sub-areas within the same room** rather than 3-6 separate room objects: e.g. an entry section, a branching upper path, a branching lower path, and a converging point near an exit. These sub-areas share one `AREAS` entry, one camera space, one continuous background — the player never sees a loading transition moving between them.
3. Put actual gates INSIDE the room, not just at its edges: an ability-locked shortcut partway through the room that, once opened, lets you skip most of it on a return visit — this is what "big room" gives you that "many small rooms" can't: internal shortcuts that don't need to be modeled as separate compass-graph nodes at all.
4. Reserve actual room-to-room DOORS (the compass-graph transitions) for genuine boundaries between differently-themed content — e.g. the edge of a region, or the hub. Within a region, prefer internal verticality/branching over new doors.
5. Use verticality as content, not just traversal: a tall room can have an easy critical path along the bottom and optional, harder platforming climbing to a Tier 3 reward near the top — this is a single room doing the job that used to take 2-3 separate rooms (main path room + side room + secret room).

**Sizing rule of thumb**: if you're about to create a new small room whose entire purpose is "a corridor with one gimmick and a door on each end," it's very likely that gimmick should be a section inside a bigger neighboring room instead, not its own `AREAS` entry.

**When to still use a door**: a genuine region boundary (thematically different content, e.g. Static Field vs. Mirror Veil), or a checkpoint/save-adjacent transition where a hard loading break is actually welcome (e.g. right before a miniboss arena, so a death doesn't require re-traversing the whole region). Everything else should be a bigger room.

---

### 3.16 Breakable Walls & Interactive Puzzle Rooms

*Goal: give exploration more texture than "walk until you hit a locked door" — the game already has one puzzle primitive (Shard Shot crystal walls in The Forge); this expands it into a real toolkit.*

**Breakable walls, expanded beyond Shard Shot:**
- **Shard-breakable** (existing) — visible crystal texture, cracks progressively as hit, already implemented via `destructible`/`hp` on platforms.
- **Heavy-attack-only walls** — sturdier rubble/debris texture that a normal hit visibly bounces off of (small spark, no damage) but a charged heavy attack cracks in one hit — gives the heavy attack a dedicated traversal use, not just a combat option.
- **Graviton-flip walls** — a wall that's only breakable while gravity is flipped (fits Graviton Core / Inverted Spire thematically — the wall's "weak side" is on what's normally the ceiling).
- **Secret shimmer** (already planned elsewhere) — 1–2 sparkle particles at a low random interval on any breakable wall type, so players learn to watch walls without a glowing "here" arrow.

**Interactive puzzle rooms (not just combat gates):**
- **Lever/switch chains** — Graviton Core's gravity-flip levers (already implied by its Key Mechanic) should extend into small sequencing puzzles: flip gravity, cross a now-reachable ledge, hit a switch that stays flipped only while you stand near it, forcing a route decision rather than a single flip-and-walk.
- **Echo-platform puzzles** — Echoing Abyss's "your echoes are platforms" mechanic (3.13) is already a puzzle primitive; make at least one room require a *specific order* of dash-echo placement to reach a ledge (e.g., an echo needs to exist in two places simultaneously, which requires chaining Phase Dash before the first echo expires) rather than only using echoes reactively in combat.
- **Polarity-bounce rooms** — The Polar Shift's blue/red wall bounce (3.4) should have at least one room where the *order* of push/pull walls you bounce through determines which of two exits you land at — same mechanic, but framed as a routing puzzle instead of just traversal.
- **Map-corruption puzzle (Static Field)** — since the map already glitches in this region (see "Map Interference" above), one room can require navigating partly blind, using audio cues (already planned: enemy windup "pings") instead of the map, turning the corruption from a pure visual gimmick into an actual puzzle constraint.

**Design rule for all of the above:** every puzzle room should be solvable using only abilities the player already has on entry to that region (per the cross-region gating rule in 3.14) — a puzzle that requires an ability from two regions later is a wall, not a puzzle, unless it's explicitly a Tier 3 secret intended to be solved on a later visit.

---

### 3.17 Environmental Hazards (per-region, not generic)

*Goal: hazards should reinforce each region's specific physics gimmick, not be an interchangeable spikes-and-sawblades layer dropped in everywhere.*

- **Event Horizon / Inverted Spire (gravity regions):** hazards that only activate relative to the *current* gravity direction — spikes that are harmless on the "floor" side but lethal on whichever side just became "down" after a Graviton Surge flip. Forces the player to think about the flip's consequence, not just its traversal use.
- **Static Field:** the existing floor-zaps-you-upward mechanic (3.9) already IS the region's hazard — no additional generic hazard needed here, just make sure it's built on the shared hazard object shape (see `ROADMAP.md` Phase 4.6 detail) so it isn't special-cased code.
- **The Polar Shift:** magnetic walls that damage on contact only while charged the *opposite* polarity to the player's last touched wall — turns the pinball traversal into a real hazard, not just a bounce.
- **Timeline Crossroads / Chrono-Space Rift (time regions):** hazards that only exist in one time-state (visible only when "Past," lethal only when "Present," or vice versa) — reuses the enemy phase-in/out visual language (golden tint = Present) already speced for this region's enemies, so hazards and enemies read consistently.
- **Paradox Engine:** the chase-beam itself (already in the region's Key Mechanic) doubles as its hazard — again, no separate generic hazard layer needed; build the chase beam on the shared hazard shape instead of custom logic so it's consistent with everything else.

**Rule of thumb:** if a hazard could be dropped into any region unchanged, it's not doing enough thematic work — reskin or tie it to that region's specific mechanic before adding it.

## PHASE 4: MINIBOSSES (8)

*Goal: Provide memorable, challenging boss fights that test specific mechanics.*

**Arena note (see index.html Phase 3.7/3.8):** each miniboss below needs a room sized and shaped around its specific mechanic, not a reused generic box — e.g. Electromagnetic Golem's push/pull needs open floor to read clearly; Quantum Pursuer's delayed-mirroring needs enough space that the delay is legible. Arena shape is part of the design spec for each fight, decided alongside its moveset.

| # | Name | Theme | Phase 1 | Phase 2 | Strategy | Reward |
|---|------|-------|---------|---------|----------|--------|
| 4.1 | **The Fractured King's Guard** | Elite knight | Shield bash + combos | Enrage with shard adds | Parry the bash; attack during shield recovery. | +1 Max Health |
| 4.2 | **The Mirror King** | Reflection world | Reflects 50% damage back at you | Creates a clone that copies your exact movements | Use Stillpoint to slow clone; phase‑dash through reflected projectiles and attack from behind. | Graviton Surge upgrade (duration +1s) |
| 4.3 | **Gravity Collapse Core** | Black hole | Shoots debris at you | Massive pull that drags you into ceiling spikes | Use Graviton Surge to flip gravity and escape; shard‑shot debris to hit the core. | +1 Fracture pip (max 4) |
| 4.4 | **Electromagnetic Golem** | Magnetic scrap | Repulsion fields push you left/right | Polarity reverses, pulls you in and slams | Use environmental magnetism (stand on platforms that push you away) to create openings. | Shard Shot upgrade (faster projectile) |
| 4.5 | **Quantum Pursuer** | Shadow clone of the player | Mirrors your moves with a 0.5‑second delay | Attacks independently; copies your last 3 actions in order | Stop moving to avoid the clone; phase‑dash into it to overlap and deal damage. | +1 Dash Chain (max 4) |
| 4.6 | **Temporal Warden** | Time‑rift mage | Rewinds health every 10 seconds (visible countdown) | Flash indicates rewind; you must deal X damage during the flash to interrupt | Be aggressive during the countdown; use Stillpoint to extend the window. | Stillpoint upgrade (life steal +1 per hit) |
| 4.7 | **The Assembler** | Construct-builder | Standard telegraphed pattern (slam, shockwave, slow tracking beam) | At 60% HP, pulls scrap from the arena to summon 1–2 Debris Constructs (2.1 #34); if the player clears them fast, The Assembler is briefly "exposed" (missing plating, 2× melee damage) since it just spent resources building them | Choose: burn the boss and ignore adds, or clear adds first for the exposed-damage window — a real resource-tradeoff fight, not just a bigger damage sponge. | Shard Shot upgrade or +1 Fracture pip |
| 4.8 | **Warden & Hollow** *(mirror duo)* | Reactive counter-pair, not fake prediction | Warden: guaranteed parry vs. melee specifically, no other offense. Hollow: guaranteed dodge/teleport vs. ranged & ability hits (Shard Shot, Phase Dash), vulnerable to melee. | Fight both at once — melee the ranged-dodger (Hollow), Shard Shot/Phase Dash the melee-parrier (Warden). Forces toolkit-switching rather than one dominant strategy. | +1 Dash Chain, or a cosmetic reward | 

**Design note on 4.8:** this is the buildable version of a "this enemy reads me" boss (a Psycho Mantis-style idea) — each half is a simple, readable rule (not real prediction), so neither reads as unfair alone, but the pairing genuinely forces you to alternate tools. Cheap to build (two reaction checks), no new engine work needed.

---

## PHASE 5: POST‑GAME & REPLAYABILITY

*Goal: Give players a reason to continue exploring after defeating the final boss.*

| # | Task | Files | Description |
|---|------|-------|-------------|
| 5.1 | **Radiant Mode** | `game.js` | After beating the game once, unlock a toggle in the menu that makes the player die in one hit (health set to 1) but grants a special cosmetic and an achievement. |
| 5.2 | **Boss Rush** | `boss.js`, `game.js` | A new game mode accessible from the main menu: fight all minibosses + the King back‑to‑back with 3 healing opportunities. Timer and score tracking. |
| 5.3 | **Secret Ending** | `game.js`, `area.js` | If the player collects all lore fragments, all Stillpoint activations, and defeats the King without using any healing items, a new ending cutscene is triggered. |
| 5.4 | **Journal / Bestiary** | `map.js`, `pause menu` | Add a journal that fills out as you defeat each enemy type – shows name, HP, and a cryptic lore line. Unlocked in the pause menu (drawn like the map overlay). |
| 5.5 | **Memory Boss Refights** | `boss.js`, `area.js` | Once the King is defeated, a shimmering ghost appears in The Vault. Interacting lets you refight the King (and any defeated miniboss) anytime – great for practice and speedrunners. |
| 5.6 | **The Archive** *(optional secret postgame boss — proposal, not yet greenlit)* | `boss.js`, `game.js` | A refight-style construct that visibly gets better each attempt rather than being secretly hard from the start: it tracks a rolling window of your recent actions (melee/ranged ratio, dash frequency, average windup reaction time — the same kind of stat-biasing the King's `adapt` system already does, extended into 3–4 more knobs) and its guard/dodge choices *visibly* shift attempt-to-attempt (e.g. it starts parrying your most-used attack after losing to it twice). **Design constraints if built:** the escalation must be capped so a mechanically skilled player can still beat it on attempt one or two, and every adaptation should be telegraphed (a visible stance/color change), never a silent invisible difficulty increase — otherwise it fights the genre's core promise that mastery wins. Worth prototyping small before committing a full moveset. |

---

## WHAT THIS PLAN DOES NOT INCLUDE (BY DESIGN)

- **Charms / badge system** (explicitly rejected by the user).  
- **Geo / shop economy** as a main progression gate (kept minimal – optional merchant in Phase 5).  
- **Procedural generation** – all rooms are hand‑crafted.  
- **Multiplayer / online features**.

---

## IMMEDIATE NEXT STEPS

1. **Implement Phase 0.1** (Shard Shot hold‑to‑aim) – this is the quickest win that improves feel immediately.  
2. **Implement Phase 1** (Graviton Surge) – this will define the new movement puzzles.  
3. **Design the new area layouts** (start with Graviton Core and Mirror Veil) to test integration.  
4. **Iterate on enemies** – add them gradually, one type at a time, and playtest thoroughly.

---