# Region & Room Reference

A single reachable-and-readable reference for every region and room in the
game — what it looks like, sounds like, and what's dangerous about it.
Pulled from `Plans/regions.md`, `Plans/lore.md`, `Plans/expansion.md`,
`Plans/story.md`, `Plans/floor_plan.md`, `game/audio.js`, and
`game/game_entities.js` (`REGION_STYLES`) — not invented. Where a category
has no source material, it says "not specified" rather than guessing.

**Deliberately excluded**: Sovereign Room 1–4 — the postgame arc's own
placeholder rooms (`story.md` §9), which have door topology only and no
room-by-room content designed yet, so there isn't anything real to
describe. **Sovereign's Observatory and the Boss Arena (Sovereign's
Throne) are included below** ([§19](#19-sovereigns-observatory),
[§20](#20-sovereigns-throne-boss-arena)) since both have real, sourced
design material. Everything else, including side-branches and the origin
spine, is here.

Room lists below are pulled straight from `floor_plan.md`'s mermaid graph
(the topology source of truth) — room names, order, and any inline notes
(what unlocks there, entry requirements) are copied from its node labels.

---

## Table of Contents

1. [Origin Spine (Fracture / Echo Bridge / Crystal Cavern / The Vault / Antechamber)](#1-origin-spine)
2. [Mirror Veil](#2-mirror-veil)
3. [Event Horizon](#3-event-horizon)
4. [Chrono-Space Rift](#4-chrono-space-rift)
5. [Graviton Core](#5-graviton-core)
6. [The Inverted Spire](#6-the-inverted-spire)
7. [The Observatory](#7-the-observatory)
8. [The Void Expanse](#8-the-void-expanse)
9. [Warp Gate Nexus](#9-warp-gate-nexus)
10. [The Polar Shift](#10-the-polar-shift)
11. [Paradox Engine](#11-paradox-engine)
12. [Static Field](#12-static-field)
13. [Timeline Crossroads](#13-timeline-crossroads)
14. [Echoing Abyss](#14-echoing-abyss)
15. [Crag of the Colossus](#15-crag-of-the-colossus)
16. [Pacifist Enclave](#16-pacifist-enclave)
17. [Sovereign's Army Reserve](#17-sovereigns-army-reserve)
18. [Mirror Corridor & Puppet Strings (connective rooms)](#18-connective-rooms)
19. [Sovereign's Observatory](#19-sovereigns-observatory)
20. [Sovereign's Throne (Boss Arena)](#20-sovereigns-throne-boss-arena)

---

## 1. Origin Spine

*(The Fracture, Echo Bridge, Crystal Cavern, Upper Ruins, The Vault, The Rift,
The Antechamber, Hollow Core, Tutorial/Spawn)*

### Rooms (in graph order)
- **Spawn Area** — 1 cosmetic upgrade. One-way to Tutorial Area.
- **Tutorial Area** — one-way to The Fracture, part 1.
- **The Fracture, part 1** — fast travel node. Branches to part 2, part 3, and Crag Entrance (requires Phase Dash).
- **The Fracture, part 3** — branches to part 4, and (Void Tether required) to Chrono-Space Rift, Echo.
- **The Fracture, part 2** — branches to Mirror Veil, Gate.
- **The Fracture, part 4** — leads to Echo Bridge, part 1.
- **Echo Bridge, part 1** — meet the Child (mandatory, +1 max health). On first entry, mandatory detour to Echo Bridge, Prison. Branches to Crystal Cavern, Upper Ruins, Timeline X Roads Room 1, and (once the prison sequence ends) The Void Expanse Room 1 and (Void Tether path) Observatory Room 2.
- **Echo Bridge, Prison** — 1 cosmetic upgrade. No way back to X Roads Room 1 — only forward to Timeline X Roads Room 2.
- **Crystal Cavern** — unlocks Shard Shot (needed to leave). Entry requires the Child choice resolved. Branches to Timeline X Roads Room 1, Echoing Abyss Room 1 (requires Phase Dash), and (Void Tether path) Timeline X Roads Room 3.
- **Upper Ruins** — branches to Pacifist Region.
- **The Vault, Room 1** — fast travel node. Branches to Polar Shift Room 1, The Vault Room 2, Graviton Core Room 1, The Rift.
- **The Vault, Room 2** — 1 Lore Pip. Leads to The Rift.
- **The Rift** — entry requires Stillpoint + child_choice_resolved + Phase Dash. 1 lore pip. Branches to Polar Shift Room 1 and The Antechamber.
- **The Antechamber** — branches to Hollow Core and (one-way, requires Phase Dash) back to Spawn Area, closing the loop into the Tutorial Area's Final Boss Fight room.
- **Hollow Core** — 1 lore pip.

### Ambience
Not visually specified per-room beyond the game's general dark violet/teal
palette; no dedicated `REGION_STYLES` decoration exists for the spine.

### Music
- The Fracture (all 4 parts) shares **`chrono_fracture.ogg`** ("Transmission," Dark Sci-Fi Audio Pack, SRG774, CC0) with Chrono-Space Rift — described as looping/temporal, ties to the loop-reset ending.
- The Vault shares **`vault_void_expanse.ogg`** ("The Depths of Hell," Joth, CC0) with Hollow Core, The Rift, and The Void Expanse — described as heavy, isolating, "closing in on the end."
- Crystal Cavern has no separately-listed track; falls back to the default hub music unless mapped elsewhere.

### Hazards
Not specified as region-unique — standard platform/enemy encounters.

### Abilities / mechanics
Shard Shot is granted at Crystal Cavern (its own wall puzzle needs the
ability in-room to solve). The Vault holds a Fracture Pip at its altar and
is the spine's central hub, with four planned exits.

### Lore flavor
The Fracture is a war-memorial mural/mystery whose meaning only lands at
the ending — a single point of light on a silhouetted skyline, cracking
outward, later recontextualized as the exact shape of the loop's reset. The
Vault is where a hooded silhouette (implied to be the player's own past
self) pocketed one Stillpoint shard from a table before armored figures
seized the rest — "the one Stillpoint that was stolen back from her."

---

## 2. Mirror Veil

### Rooms
- **Mirror Veil, Gate** — fast travel node.
- **Mirror Veil, Reflection** — 1 Lore Pip. Leads to Mirror Veil, Hollow.
- **Mirror Veil, Hollow** — miniboss (The Mirror King). Leads to Mirror Veil, Sanctum.
- **Mirror Veil, Sanctum** — unlocks Phase Dash. Leads to Mirror Corridor.

### Ambience
Background is inverted — an upside-down reflection world; secret paths
exist only in the reflected version of a room, never the "real" one. Built
visual effect (`REGION_STYLES.mirror_veil`; primary `#c084fc` / secondary
`#7c3aed` / glow `#e9d5ff`): a horizontal "reflection seam" line at
mid-room height with a scattered diamond motif, plus faint upside-down
platform ghosts.

### Music
**`mirror_veil.ogg`** — "Sector" (Dark Sci-Fi Audio Pack, SRG774, CC0).

### Hazards
Not specified — no dedicated hazard note exists yet in the design docs;
flagged as worth inventing something tied to "only the reflection is real."

### Abilities / mechanics
Grants **Phase Dash**. Planned home of **Mirror Step** (new ability,
proposed, not built) and the **Null Sentinel** enemy (a Phase Dash
counter).

### Lore flavor
Was a mid-tier command wing under section chief "The Mirror King," who
duplicated himself for weapons research and enforced a strict
original-vs-copy hierarchy out of vanity. The Sovereign's search-light,
refracted through thousands of mirrors, produced false positives here —
the one region that actively defeats her hunting method rather than just
going unchecked.

---

## 3. Event Horizon

### Rooms
- **Event Horizon, Gate** — fast travel node. Leads to Event Horizon, Pull.
- **Event Horizon, Pull** — branches to Echo Bridge Prison and Event Horizon, Drift.
- **Event Horizon, Drift** — 1 Lore Pip. Leads to Event Horizon, Core.
- **Event Horizon, Core** — miniboss (Gravity Collapse Core / Horizon Core). Leads to The Inverted Spire.

### Ambience
The edge of a black hole. Built visual effect (`REGION_STYLES.event_horizon`;
primary `#818cf8` / secondary `#4338ca` / glow `#c7d2fe`): a radial
gravitational-pull vignette anchored off-screen left, slow-pulsing
concentric event-horizon rings, inward-curving lensing glows on platform
corners.

### Music
**`event_horizon.ogg`** — "Pulse" (Dark Sci-Fi Audio Pack, SRG774, CC0).

### Hazards
A constant leftward gravitational pull — platforming against a steady
lateral force, not just gaps. Design intent: gravity-relative spikes,
harmless on the current "floor" side but lethal on whichever side becomes
"down" after a Graviton Surge flip.

### Abilities / mechanics
No ability granted here. Enemies: Gravity Scavengers, Gravity Wells.

### Lore flavor
Not a command wing but a gravitic-material extraction mine feeding the war
effort — containment failed late in the war, and it's still a
self-collapsing singularity "extracting" debris and people who worked it.
No malice, just an operation that outlived its chain of command. The
Sovereign's search-probes sent in were pulled into the collapse; their
beacon lights still fall, transmitting "searching," never "clear."

---

## 4. Chrono-Space Rift

### Rooms
- **Chrono-Space Rift, Gate** — fast travel node.
- **Chrono-Space Rift, Loop, Part 1** — 1 cosmetic upgrade.
- **Chrono-Space Rift, Loop, Part 2** — 1 Lore Pip.
- **Chrono-Space Rift, Echo** — requires Void Tether to enter from The Fracture.
- **Chrono-Space Rift, Sanctum** — miniboss ("Ally" — the Temporal Warden). Unlocks Stillpoint. 1 Fracture Pip.
- One-way teleports connect Sanctum ↔ Echoing Abyss, and Loop Part 1 ↔ (Void Tether path) the Void Expanse's Paradox Engine teleport gate.

### Ambience
A looping room — exit one side, reappear on the other. Built visual effect
(`REGION_STYLES.chrono_rift`; primary `#a78bfa` / secondary `#6d28d9` /
glow `#ddd6fe`): a slow-rotating clock-face "ghost" of spokes from a fixed
hub, tick marks along platform tops like a timeline ruler.

### Music
**`chrono_fracture.ogg`** — "Transmission" (Dark Sci-Fi Audio Pack, SRG774,
CC0), shared with The Fracture — looping/temporal, ties to the loop-reset
ending.

### Hazards
Not specified beyond the wrap-around mechanic itself.

### Abilities / mechanics
Grants **Stillpoint** (Sanctum). Enemies: Phase Mages, Shard Spitters,
Stillpoint Revenants.

### Lore flavor
Home of the monastic order that hid the player's Stillpoint from the
Sovereign. Its eldest keeper (the Temporal Warden) rewinds his own death
forever, guilt-driven, sparing his true strength — a small mortal
rehearsal of the game's endgame identity-loop reveal. This is the one
region the Sovereign would search personally if she could, since the
stolen Stillpoint is hidden here, but the Warden's own time-loop reads as
noise to her perception.

---

## 5. Graviton Core

### Rooms
- **Graviton Core, Room 1** — entry requires Shard Shot.
- **Graviton Core, Room 2** — entry requires Shard Shot. Unlocks Graviton Surge. 1 Fracture Pip.
- **Graviton Core, Room 3** — entry requires Shard Shot. Miniboss (Graviton Guard). 1 Lore Pip. Branches to The Vault, Sovereign's Army Reserve, and The Inverted Spire.

### Ambience
A gravity-flipping facility — no built `REGION_STYLES` visual entry yet.

### Music
**`graviton_static.ogg`** — "Infestation in the Control Room" (Joth, CC0),
shared with Static Field — oppressive, mechanical, glitchy/corrupting.

### Hazards
Not specified beyond the gravity-flip levers/puzzle mechanic.

### Abilities / mechanics
Grants **Graviton Surge** (Room 2). Home of the **Gravity Anchor** enemy (a
Graviton Surge counter). Room 3 branches off into Sovereign's Army Reserve.

### Lore flavor
Guarded personally by an elite Sovereign soldier (the Graviton Guard) still
holding the outpost, waiting for orders that stopped coming. This is the
one place her command structure never fully died — the closest thing to
her actual current reach outside the throne room.

---

## 6. The Inverted Spire

### Rooms
- **Inverted Spire** — single room, entry requires Graviton Surge. 1 Lore Pip. Leads back into Timeline Crossroads.

### Ambience
Gravity permanently inverted the instant you enter — "up" and "down" are
swapped for the whole room.

### Music
**`observatory_spire.ogg`** — "Airy" (Dark Sci-Fi Audio Pack, SRG774,
CC0), shared with The Observatory — floaty, vertiginous, vast.

### Hazards
Design intent: gravity-relative spikes, shared with Event Horizon's hazard
concept.

### Abilities / mechanics
No ability granted. No miniboss (deliberate).

### Lore flavor
A Sovereign relay tower built to keep Graviton Core in contact with
command — took a direct hit and inverted permanently. Its beacon never
lost power and is still broadcasting orders into a command structure that
no longer exists.

---

## 7. The Observatory

### Rooms
- **The Observatory, Room 1** — entry requires Charged Attack.
- **Observatory, Room 2** — entry requires Graviton Surge. 1 Lore Pip.
- **Observatory, Room 3** — leads to the region's capstone room, Sovereign's Observatory ([§19](#19-sovereigns-observatory)).

### Ambience
Low gravity — floaty jumps, long hang time, heavy verticality.

### Music
**`observatory_spire.ogg`** — "Airy," shared with The Inverted Spire —
floaty, vertiginous, vast.

### Hazards
Not specified — no dedicated hazard note exists yet; the design docs
suggest one keyed specifically to the low-gravity feel.

### Abilities / mechanics
No ability granted directly by these three rooms. No miniboss (deliberate).

### Lore flavor
A literal Sovereign watch-post — she has a perception sense for hidden or
anomalous things, and stood here to use it. Low gravity is what let her
perception reach as far as it needed to — "verticality as a literal
metaphor for oversight."

---

## 8. The Void Expanse

### Rooms
- **The Void Expanse, Room 1** — 1 Lore Pip, 1 cosmetic upgrade. Branches to Chrono-Space Rift Loop Part 1 and Void Expanse Room 2.
- **The Void Expanse, Room 2** — requires Shard Shot. Branches to a one-way teleport toward Paradox Engine and to Warp Gate Nexus Room 1.

### Ambience
No solid ground at all — every platform is a moving "time-stopped debris"
chunk; timing, not positioning, is the whole puzzle.

### Music
**`vault_void_expanse.ogg`** — "The Depths of Hell" (Joth, CC0), shared
with The Vault/Hollow Core/The Rift — heavy, isolating, "closing in on the
end." Miniboss theme: **`boss_void_expanse.ogg`** — "Dark Ambience Loop"
(Iwan "qubodup" Gabovitch, CC-BY 3.0, attribution required) — chosen
specifically as an actual ambience loop matching the fight's void-chase
tone.

### Hazards
Not a generic hazard layer — the no-solid-ground/moving-debris mechanic
itself IS the hazard and the puzzle.

### Abilities / mechanics
Completes **Void Tether** (full range, no charge limit) if already granted
from Timeline Crossroads.

### Lore flavor
Not a mine, command wing, or barracks — the single most damaged site in
the shelter, took the worst of late-stage weapons testing and never
stopped showing it. The miniboss, The Undertow, is a scientist's child
obsessed with darkness, now merged with it — steals what people hold
dearest (already took the Temporal Warden's love; will take the player's
companion if brought here). Deliberately left off the sympathetic/cruel
moral axis — genuinely ambiguous.

---

## 9. Warp Gate Nexus

### Rooms
- **Warp Gate Nexus, Room 1** — the hub room.
- **Warp Gate Nexus, Room 2** — miniboss (Warden & Hollow duo). 1 Lore Pip. One-way warp gate onward to The Inverted Spire.

### Ambience
A teleporter hub — a central room branching into 3–4 small self-contained
challenge vaults (per `regions.md`'s estimate; only 2 rooms currently in
the floor-plan graph).

### Music
**`hub_living.ogg`** — "Heavenly Loop" (isaiah658, CC0) — the same warm,
calm bed used across all living/hub areas (Spawn, Tutorial, Sanctums).

### Hazards
Not specified.

### Abilities / mechanics
Intended to grant **Blink** (not yet built). Note: `expansion.md`'s
"opens after collecting 3 Keystones" concept is a literal key mechanic
that conflicts with the project's no-lock-and-key rule — flagged as an
unresolved design conflict, not something to build against as written.

### Lore flavor
Guarded by two gatekeepers, Warden & Hollow, stationed as a deliberate pair
so neither has a blind spot — testing travelers before letting them
through. Travelers stopped coming; the stand-down order never arrived, so
they're still testing everyone who walks in ("their shift never
technically ended"). Read as faithful and dutiful, not cruel — their
test-and-clear protocol is a small, mundane ancestor of what the Sovereign
now does full-time.

---

## 10. The Polar Shift

### Rooms
- **Polar Shift, Room 1** — fast travel node. +1 max health.
- **Polar Shift, Room 2** — miniboss (Electromagnetic Golem). 1 Lore Pip. One-way exit into Paradox Engine.

### Ambience
Magnetic walls — blue push, red pull. Traversal is bouncing between
magnetic surfaces like a pinball, not jumping.

### Music
**`polar_paradox.ogg`** — "Urgent" (Dark Sci-Fi Audio Pack, SRG774, CC0),
shared with Paradox Engine — driving, urgent, magnetic push/pull and
chase tension.

### Hazards
Design intent: magnetic walls damage on contact only while charged the
*opposite* polarity to the player's last-touched wall — the traversal
itself becomes the hazard.

### Abilities / mechanics
No ability granted. Home of the **Anchor Wraith** and **Deflector Drone**
enemies.

### Lore flavor
A remote mining wing outside the Sovereign's routine oversight; its crew
built a magnetic automaton (the Electromagnetic Golem) to defend tunnels
from collapses and scavengers. An unnamed scientist still directs the
golem personally and actively jams outside communication — sabotage, not
desperation, hence evil-by-choice. The one region where the "hunt" evidence
is *absence of a search at all* — this crew solved its own problems and
never drew Sovereign attention.

---

## 11. Paradox Engine

### Rooms
- **Paradox Engine, Room 1** — entered via a one-way teleport gate from The Void Expanse; also receives Polar Shift's one-way exit.
- **Paradox Engine, Room 2** — miniboss (The Assembler). Entry requires Shard Shot. 1 Lore Pip. Leads to a teleport toward Upper Ruins and to Static Field, Room 1.

### Ambience
A chase zone — a giant machine actively hunts the player through a maze
while normal enemies still need fighting.

### Music
**`polar_paradox.ogg`** — "Urgent," shared with The Polar Shift — driving,
urgent, chase tension. Miniboss theme: **`boss_assembler.ogg`** — "Caustic
Chip" (Jan125, CC-BY 4.0, attribution required).

### Hazards
The chase-beam itself (unbuilt) is meant to double as the region's hazard
— no separate generic hazard layer intended.

### Abilities / mechanics
No ability granted. Home of the **Deflector Drone**, **Absorber Husk**, and
a planned but unbuilt **Debris Construct** (inert scrap that self-assembles
when the player nears, telegraphed).

### Lore flavor
Not an abandoned automaton — the creator herself is still here, actively
maintaining every warp field and portal gate; whether she's trapped by her
own usefulness or never questioned it is left deliberately open. Drops a
real, functional Warp Key (postgame utility) on defeat.

---

## 12. Static Field

### Rooms
- **Static Field, Room 1** — branches to Static Field Room 2, a one-way teleport to The Void Expanse Room 2, and a one-way teleport to Graviton Core.
- **Static Field, Room 2** — new miniboss (The Conduit). Entry requires Phase Dash. 1 Fracture Pip. Leads to The Rift and the one-way teleport to Graviton Core.

### Ambience
Electromagnetic arcs chain across the room; touching the floor zaps you
upward — you must stay airborne. Also corrupts the player's map overlay
while inside (and briefly after) — a presentational glitch only; the
underlying discovered-room data is never actually altered.

### Music
**`graviton_static.ogg`** — "Infestation in the Control Room" (Joth, CC0),
shared with Graviton Core — oppressive, mechanical, glitchy/corrupting.

### Hazards
The floor-zaps-upward mechanic itself IS the region's hazard — no separate
generic hazard layer needed.

### Abilities / mechanics
Guards this region's Fracture Pip (Room 2). The intended ability grant is
**Overcharge**, but this is the one region whose promised ability isn't
wired to any room yet. Home of the **Anchor Wraith** enemy.

### Lore flavor
A self-sufficient utility wing that tapped raw electrical discharge for
power via a grounding construct meant to bleed dangerous current safely
into the earth. The creator/scientist ("The Conduit") is still here and
working, fighting with raw electricity; her second phase weaponizes the
electroweak interaction, slowly decaying the player over time. The map
corruption here scrambled the Sovereign's own tracking data too —
accidental sabotage, like Mirror Veil's mirrors.

---

## 13. Timeline Crossroads

### Rooms
- **Timeline X Roads, Room 1** — fast travel node.
- **Timeline X Roads, Room 2** — unlocks Void Tether if you give up the Child (permanent either way). Locked by Echo Bridge part 1. Unlocks `child_choice_resolved`. Miniboss (The Stationmaster). 1 Lore Pip.
- **Timeline X Roads, Room 3** — reached via Crystal Cavern (Void Tether path). Leads to Chrono-Space Rift Gate and The Forge (entry requires Stillpoint, 1 Fracture Pip).

### Ambience
Two overlapping time states — Past (crumbling) and Present (safe); enemies
and hazards phase in and out, only vulnerable/visible when "Present"
(golden tint).

### Music
**`timeline_crossroads.ogg`** — "The Surreal Truth" (Joth, CC0) — past/
present overlap, ghostly. Miniboss theme: **`boss_timeline_crossroads.ogg`**
— "Chuggin' Through Columbia (Looping)" (Eric Matyas, CC-BY 3.0,
attribution required — no CC0 "trains/industrial transit" track was
found).

### Hazards
Design intent: hazards that only exist in one time-state, reusing the
gold-tint = Present visual language.

### Abilities / mechanics
Grants a real, working (but limited) **Void Tether** immediately, via The
Stationmaster fight, conditional on leaving the Child. Also the site of
the Child-choice cutscene beat and the Puppet Strings/Tether Region branch
(see [§18](#18-connective-rooms)).

### Lore flavor
The miniboss (proposed name "The Stationmaster") is one of the scientists
who ordered the child's creation and wanted her to fail. Controls internal
transit routes, runs the Echo Bridge prison, and has the player arrested
when found with the Child — a real staged plot beat. Also stole the Void
Tether from the Void Expanse's own guardian. Fights with trains,
locomotives, and brainwashed prisoners.

---

## 14. Echoing Abyss

### Rooms
- **Echoing Abyss, Room 1** — fast travel node. Entry requires Phase Dash.
- **Echoing Abyss, Room 2** — miniboss (Quantum Pursuer). 1 Lore Pip.

### Ambience
A "mirror floor" — your own dashes and attacks leave lingering echoes (2s)
that double as real platforms.

### Music
**`echoing_abyss.ogg`** — "Cage of the Cryptid" (Joth, CC0) — the closest
available CC0 fit for "intimate, sad, unresolved" (flagged as an imperfect
placeholder). Miniboss theme: **`boss_quantum_pursuer.ogg`** — "Sinister
Abode" (Zane Little Music, CC0).

### Hazards
Not specified beyond the echo/platform mechanic itself.

### Abilities / mechanics
No ability granted directly. Has the game's one-way shortcut back to
Crystal Cavern (origin spine), gated on Stillpoint.

### Lore flavor
The miniboss (Quantum Pursuer) used the shelter's lower-class citizens as
experimental soul-fodder to fuel her own ascent — exploitation, not grief,
hence evil-by-choice. Releases a delayed half-second shadow of the
player's own soul. Several of the region's echo-copies are unmistakably
the Sovereign's own search personnel, still searching, permanently — also
flagged as the closest-region metaphor for the game's endgame
identity-loop reveal.

---

## 15. Crag of the Colossus

*(Built side-branch — narratively independent of the 13 spacetime regions
and the Sovereign's story, though intended as mandatory content via a
still-unbuilt wall gate.)*

### Rooms
- **Crag Entrance** — fast travel node. Requires Phase Dash to enter.
- **Crag Breach, part 1**
- **Crag Altar** — unlocks Charged Attack. The floor collapses and you must fight the Crag Warden.
- **Crag Warden** — miniboss. 1 Lore Pip. Leads back to Echo Bridge, part 1.

### Ambience
The deliberate odd one out — a rust/warm-stone palette against the game's
cool violet/teal (`#d97757` / `#c2703d` / `#fb923c`).

### Music
**`crag.ogg`** — "Final Captain's Log" (Joth, CC0), flagged as an
imperfect placeholder (no ideal CC0 fit for "rocky, primal, collapsing"
was found). Miniboss theme: **`boss_crag_warden.ogg`** — "Hard Battle 1"
(MintoDog, CC0), a unique track.

### Hazards
Not specified beyond standard combat encounters; the redesigned
`crag_entrance` room has a jump-crossable floor rift and a raised cave
ledge.

### Abilities / mechanics
Grants **Charged Attack** (Crag Altar) — intended to be mandatory, but the
wall-gate that would enforce that is still unbuilt.

### Lore flavor
The Crag Warden, ruthless head of the mining operation here, fused himself
with the crag's own "heart of crystal" tech for total control — it worked
too well, giving him permanent super armor. Quotes: *"The crag does not
yield to a light hand. Strike as though you mean to end something."* /
*"Something split this stone in one blow."* / *"We gave the crag a heart
of crystal so it would remember how to stand. It remembers too well."*

---

## 16. Pacifist Enclave

*(Optional side-branch off Upper Ruins — explicitly not under Sovereign
rule.)*

### Rooms
- **Pacifist Region** — single node in the current graph (design intent
  is 5 minigames within it, per `regions.md`).

### Ambience
Not specified visually.

### Music
Not specified — no dedicated track referenced in `audio.js`/CREDITS.md.

### Hazards
None specified — designed as explicitly peaceful content.

### Abilities / mechanics
Peaceful play unlocks 5 minigames leading to 1 Lore Pip. Fighting even
once forfeits the reward permanently — an irreversible, consent-gated
choice (see `CLAUDE.md`'s design-decisions list). Placed early
(off Upper Ruins) so the "the world can still be kind if you are" beat
lands before the player's been ground down by 10+ regions of hostility.

### Lore flavor
A ward for shelter staff discarded as no-longer-useful — injured, aged,
retired weapons workers. One resident offers the player a place to sleep
(the first real home-base beat) and can teach a skill over repeat visits;
a romance track is possible. Mid-to-late game, a miniboss takes him as
leverage.

---

## 17. Sovereign's Army Reserve

*(Optional side-branch off Graviton Core, Room 3 — genuinely skippable,
bonus-only reward.)*

### Rooms
- **Sovereign's Army Reserve** — locked by 4 Fracture Pips and 10 Lore
  Pips. Leads to...
- **Try-out region** — where the Level 4 Limit Break unlock happens.

### Ambience
Not specified visually.

### Music
Treated as a horde encounter — uses **`miniboss_a`**, "Hard Boss Battle 1"
(MintoDog, CC0), a "miniboss-tier martial track."

### Hazards
Not specified — the horde gauntlet itself is the content.

### Abilities / mechanics
An extremely difficult horde gauntlet, mixed ranged/melee, cleared in
sequence. Dead-ends into the Limit Breaker Trial — a 4th ability-upgrade
tier beyond the standard 3 (not yet finalized).

### Lore flavor
Not individual characters — the same guard cloned over and over, frozen in
time many loops ago by a much earlier Sovereign; "no will left but to
fight," closer to a hazard than characters. Placed here specifically
because Graviton Core is the one region confirmed still under live contact
with the Sovereign's command structure — the only place an active
"reserve" of her soldiers makes in-fiction sense.

---

## 18. Connective Rooms

*(Cross-link content added specifically to fix the world graph's
tree-vs-web problem — spatially between two regions, not "owned" by
either.)*

### Mirror Corridor
Connects Mirror Veil, Sanctum → Event Horizon, Gate. Entry requires
`child_choice_resolved`. Reinstated by `floor_plan.md` as real playable
content after being cut and flagged as a gap in `regions.md` — the
flagship fix for the game's "tree, not web" connectivity problem. No
ambience/music/hazard details specified yet beyond that it's real content,
not just a bare door.

### Puppet Strings / Tether Region (Part 1 & 2)
Branches off Timeline X Roads, Room 2. Both parts locked by Void Tether.
Part 2 grants +1 max health and leads back to Timeline X Roads, Room 2. A
dead-end optional vault, not a cross-region link. No ambience/music/hazard
details specified.

---

## 19. Sovereign's Observatory

*(The Observatory region's capstone room — not a 14th region, the deepest
room of [§7](#7-the-observatory). Reached after Observatory Room 3.)*

### Rooms
- **Sovereign's Observatory** — entry requires Graviton Surge. 1 Lore Pip.
  Unlocks fast travel. Leads onward into The Void Expanse, Room 1.

### Ambience
Low gravity, same as the rest of The Observatory — floaty, verticality as
the whole point, not just this room's decoration.

### Music
**`observatory_spire.ogg`** — "Airy" (Dark Sci-Fi Audio Pack, SRG774, CC0)
— confirmed directly in `game/audio.js`'s `AREA_MUSIC_MAP`
(`sovereign_observatory: 'observatory_spire'`), the same track as the rest
of the Observatory/Inverted Spire cluster — floaty, vertiginous, vast.

### Hazards
Not specified beyond the region's general low-gravity platforming.

### Abilities / mechanics
Grants nothing directly, but is a fast-travel unlock — this room's real
reward is access, not a kit piece.

### Lore flavor
This is the same vantage point the Sovereign used, in the game's present —
literally what the region's name describes: she has a form of perception
that senses hidden/anomalous things, and stood here to use it, watching
the shelter for exactly the kind of anomaly she couldn't otherwise see
coming. She isn't watching the whole shelter from it anymore; she's
watching for the one anomaly (the child) that was always outside her
frame — which is why finding this room lands as more than a fast-travel
unlock, it's arriving at the seat of the hunt itself. Its lore-pip visual
(`lore_so1`, a plot-critical cutscene, not a passive overlay): *"The
Sovereign's silhouette alone in a vast chamber ringed floor-to-ceiling with
identical watching apertures, all turned outward except one — small, at
the room's exact center, turned inward on herself — and she has not
noticed it's there."*

---

## 20. Sovereign's Throne (Boss Arena)

*(The final area — `boss_arena` in `game/area.js`, reached via The
Antechamber. Deliberately never connects directly from any of the 13
regions — `expansion.md`'s "final boss placement rule": no region, built or
planned, leads straight into the Antechamber or Boss Arena, so the
Sovereign stays the true end of the critical path regardless of how much
side content the world grows.)*

### Rooms
- **The Antechamber** — the room immediately before the boss fight; also
  branches to Hollow Core and, one-way (requires Phase Dash), loops back to
  the Spawn Area / Tutorial Area's Final Boss Fight room — the spatial loop
  that ties the game's ending back to its own opening (`roadmap.md` 6.7).
- **Tutorial Area, Final Boss Fight** (internally `tutorial_final` /
  `boss_arena`) — the arena itself, where the Fractured Sovereign fight
  happens (full moveset/phase breakdown already covered in
  [§1](#1-the-fractured-sovereign-final-boss) of the boss art reference
  above).

### Ambience
Not decoratively specified beyond the game's general dark violet/teal
palette — no `REGION_STYLES` entry exists for it (unlike the built
regions), since its identity is carried by the boss fight itself, not
environmental tinting.

### Music
**`final_boss.ogg`** — "Epic Boss Battle [Seamlessly Looping]" (Juhani
Junkala, via SubspaceAudio's "400 Indie Game Music Loops," CC0) — confirmed
in `game/audio.js` (`tutorial_final: 'final_boss'`). Chosen deliberately as
"the best fit for fighting your own future self," per `CREDITS.md`.

### Hazards
Roadmap flags the arena's current build as a known weak point, not a
finished design: `boss_arena` is presently a flat 900px sealed room (one
ground lane + 3 small platforms, all roughly the same height band) — not
much room for the boss or the player to use space meaningfully. The
planned fix (`roadmap.md` 3.7, not yet built) is real verticality — at
least 2-3 distinct height tiers the boss can occupy or leap between, with
her kit actually using them (e.g. a Phase 2 teleport-to-a-platform before
summoning enemies, a Phase 3 leaping slam from a high platform) — so
players track her in two dimensions, not just left/right.

### Abilities / mechanics
No ability granted. This is the fight against **The Fractured Sovereign**
— see [§1](#1-the-fractured-sovereign-final-boss) above for her complete
phase/attack/visual breakdown; not repeated here to avoid duplicating that
section.

### Lore flavor
She is the player's own future self — same core ability kit minus Graviton
Surge, plus a corrupted Void Tether that pulls her toward the player
instead of the reverse. The Antechamber leading into this fight carries its
own lore beat: the Sovereign's silhouette standing over a fragment of a
broken map, one hand slowly closing over a region with no light left in
it — searching (`lore_ac1`) — followed by the game's clearest statement of
the hunt itself: a small silhouette (the child) slipping between two of
her searching light-beams untouched, the beams sweeping back and missing
her by inches, again (`lore_ac2`). Hollow Core, branching off this same
room, is described elsewhere as her true prison — a vast cavity at the
world's own spatial center, walls lined with every fused Stillpoint she
ever took, and one socket at the center, dark, empty, sized for exactly
one more.

---

## Sources

`Plans/regions.md`, `Plans/lore.md`, `Plans/expansion.md`, `Plans/story.md`,
`Plans/floor_plan.md`, `game/audio.js`, `game/game_entities.js`
(`REGION_STYLES`), `assets/audio/music/CREDITS.md`. Where the source docs
themselves flag something as unbuilt, a placeholder, or not yet decided,
that flag is carried over here rather than smoothed away.
