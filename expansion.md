# STILLPOINT — COMPLETE EXPANSION ROADMAP (FINAL PLAN)

This document outlines the **full expansion** of Stillpoint, building on the existing game (Phase 0–Phase 1.7 already implemented).  
It adds new abilities, reworks existing ones, introduces 13 interconnected spacetime‑themed areas, 25 normal enemies, 2 hard enemies, 6 minibosses, and post‑game content.  
All tasks are grouped into logical phases for incremental development.

---

## TABLE OF CONTENTS

1. [Phase 0: Core Ability Reworks](#phase-0-core-ability-reworks)
2. [Phase 1: New Ability – Graviton Surge](#phase-1-new-ability--graviton-surge)
3. [Phase 2: Enemy Roster (25 Normal + 2 Hard)](#phase-2-enemy-roster-25-normal--2-hard)
4. [Phase 3: New Areas – Spacetime Regions (13 Rooms)](#phase-3-new-areas--spacetime-regions-13-rooms)
5. [Phase 4: Minibosses (6)](#phase-4-minibosses-6)
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

## PHASE 2: ENEMY ROSTER (25 NORMAL + 2 HARD)

*Goal: Provide a diverse, challenging bestiary that forces the player to use their entire toolkit (dashes, parries, heavy attacks, new abilities).*

### 2.1 Normal Enemies (25 total)

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

## PHASE 3: NEW AREAS – SPACETIME REGIONS (13 ROOMS)

*Goal: Wrap the existing linear world with a large, interconnected web of new regions, each with unique physics, hazards, and puzzles. All areas are hand‑crafted and contain at least one ability gate or shortcut.*

**Hub**: The Vault (existing) now has **four exits** (North, East, South, West) leading to the new regions.

| # | Area Name | Theme | Key Mechanic | Enemies Found | Ability Required to Enter |
|---|-----------|-------|--------------|---------------|---------------------------|
| 3.1 | **Event Horizon** | Edge of a black hole | Constant gravitational pull leftward; platforming against the current. | Gravity Scavengers, Gravity Wells | Phase Dash (to cross a gap near entry) |
| 3.2 | **Mirror Veil** | Upside‑down reflection world | Background is inverted; secret paths exist only in the reflection. | Mirror Sprites, Echo Stalkers | None (open from The Vault) |
| 3.3 | **Graviton Core** | Gravity‑flipping facility | Levers that flip gravity; contains the **Graviton Surge** ability. | Null‑Gravity Brutes, Polarity Drones | Shard Shot (to break a crystal barrier) |
| 3.4 | **The Polar Shift** | Magnetic walls | Blue walls push you away, red walls pull you in; bounce between them like a pinball. | Polarity Drones, Inertial Shieldbearers | Phase Dash (to cross a magnet gap) |
| 3.5 | **Timeline Crossroads** | Two overlapping time states | Past (crumbling) / Present (safe). Enemies phase in/out; attack only when they are “Present” (golden tint). | Temporal Shards, Echoing Spectres | Stillpoint (to freeze the timeline) |
| 3.6 | **Chrono‑Space Rift** | Looping room | Projectiles and enemies that leave the left side reappear on the right (wrap‑around). | Phase Mages, Shard Spitters | None (open) |
| 3.7 | **The Observatory** | Open‑air with galaxy skybox | Low gravity (floaty jumps, longer falls). Lots of verticality. | Crystal Arbiters, Pulse Wardens | Graviton Surge (to reach high platforms) |
| 3.8 | **Paradox Engine** | Chase zone | A giant machine chases you with a death beam; run through a maze while fighting adds. | Void Juggernauts, Timeworn Husks | Shard Shot (to destroy machine weak points) |
| 3.9 | **Static Field** | Electromagnetic arcs | Arcs chain across the room; touching the floor zaps you upward (must stay airborne). Also **corrupts the map overlay** — see "Map Interference" below. | Kinetic Strikers, Warp Mites | Phase Dash (to chain between platforms) |
| 3.10 | **The Inverted Spire** | Gravity inverted upward | Gravity pulls *up*; you start at the “bottom” (which is actually the sky). | Ruin Stalkers, Gravity Wells | Graviton Surge (to re‑invert at will) |
| 3.11 | **Warp Gate Nexus** | Teleporter hub | A central room with 3–4 small “challenge vaults” (puzzle rooms). | Rift Crawlers, Shard Geysers | None (open after collecting 3 Keystones) |
| 3.12 | **The Void Expanse** | No solid ground | Entirely moving platforms made of “time‑stopped” debris; time your dashes perfectly. | Fractured Knights, Void Lancers | Phase Dash (to traverse gaps) |
| 3.13 | **Echoing Abyss** | Mirror floor | Your dashes and attacks create lingering echoes (static copies) that stay for 2 seconds and can be used as **platforms** (you can jump on your own echo). | Echoing Spectres, Temporal Parasites | Stillpoint (to freeze echoes in place) |

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

## PHASE 4: MINIBOSSES (6)

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

*This roadmap replaces all previous versions and is the definitive guide for the Stillpoint expansion.*