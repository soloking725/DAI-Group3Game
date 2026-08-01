# Regions — the single planning reference for world layout

Scope: which of the 13 expansion.md regions exist (built or planned), their
cluster/col/row position, room counts, each region's special mechanical
effect, miniboss assignment, and — new 2026-07-13 — where every
upgrade/collectible type is meant to be found. This is the doc to have open
alongside a spatial diagramming tool (yEd via `export_graph.js`'s live
GraphML export, or Whimsical if you'd rather build the graph by hand — see
the tradeoff note in the earlier discussion) and **`levelEditor.html`**
(individual room detail once a region is actually being built). Deliberately
NOT duplicated here: door topology/`connections[]` (that's `area.js`'s
compass graph) or narrative content (that's `story.md`/`lore.md`).

Trimmed 2026-07-13: removed the 25-physics-concept future brainstorm (none
of it was assigned to a real region) and folded in the col/row/cluster data
that used to live only in `worldmap.html`'s `PLANNED_REGIONS` array, so this
is now the one place to look, not two.

**`worldmap.html` removed 2026-07-26**: its col/row grid never actually held
a one-room-per-cell invariant (region-chain helper/cutscene/corridor
sub-rooms routinely share a cell with an unrelated region's room — verified
live: 22 of 35 occupied cells had 2+ real rooms stacked together), making
the rendered map unreadable well beyond the one overlap fix noted at line
~100 below. A real fix meant redesigning the renderer to cluster overlapping
rooms instead of a flat grid — judged not worth it. Every mention of that
file below is now historical only; `CROSS_LINKS`/`PLANNED_REGIONS` data it
used to hold either duplicates what this doc already has (cluster/col/row)
or is gone with the file (the cross-link edge list — not reconstructed here,
see git history if it's ever needed again).

---

## World-map connectivity & the war-bunker reframe (confirmed 2026-07-21)

**Scope for the new social/"life" content (hospitals, living quarters, slums, a rich
district, the pacifist wing — see `story.md` §10, `lore.md`'s reframe)**: no new whole
regions. Reskin/redesign existing planned regions that currently have the loosest
identity and no assigned miniboss (Timeline Crossroads, The Observatory, The Void Expanse
are the candidates — see "no miniboss" list below) plus a handful of new small side rooms
off already-planned regions, rather than expanding the region count.

**Correction to an earlier "tree, not web" critique**: `roadmap.md` Phase 7 flags the
built `area.js` compass graph as closer to a tree (one parent edge, at most one shortcut
back per region) than a web. Checked directly against `Plans/floor_plan_mermaid.txt`
(generated from `svg.txt`, the actual source-of-truth board) — **the original design is
not a tree.** Real hub rooms carry 4-6 outgoing connections each (Timeline Crossroads Room
1, The Vault Room 1, The Rift, Graviton Core Room 3), plus a real mesh of one-way teleport
shortcuts cross-linking distant regions (Void Expanse ↔ Paradox Engine, Warp Gate Nexus ↔
Inverted Spire, Static Field ↔ Graviton Core, Chrono-Space Rift ↔ Echoing Abyss). The
"tree" read is almost certainly `area.js` (the auto-generated implementation) having lost
edges during the SVG rebuild — an engineering gap to check against the mermaid, not a plan
flaw. Not yet verified whether `area.js` actually dropped these edges; flagging as a
concrete follow-up check, not confirmed as a bug yet.

**The web/leaf pattern this suggests (proposed direction, matches data already in the
mermaid)**: miniboss rooms in the source graph are mostly near-leaves — one way in, one
way out (Mirror Veil Hollow, Crag Warden, Event Horizon Core, Warp Gate Nexus Room 2) —
while the hub rooms doing the actual interconnecting work are civilian/traversal spaces.
This matches a deliberate split worth designing around: **a web for the living spaces**
(the shelter's population actually moves between home, work, and each other) **and
miniboss labs as intentional spurs off it** — they were never built for people to walk
between, only for cargo to. Concretely: an environmental supply-chain economy (tanky
supply robots, power routed from Static Field, ore refined at Colossus Core) gives the
labs' isolation an in-fiction reason instead of it reading as a design gap, and hands the
existing "ability-gated backtracking" goal (roadmap 6.2 — region A gates region B's reward
behind an ability found elsewhere) a mechanical lever: disrupting a supply line in one
region could plausibly change something in another. **Not yet decided**: whether the
economy stays pure environmental flavor or becomes an actual sabotage-able mechanic —
good either way, but the choice changes how much needs to be built.

---

## Built (3 anchor regions — see roadmap.md Phase 9)

**Correction, 2026-07-21**: this "Built" vs "Planned" split describes which
regions have their *mechanical effect* (inverted background, gravity pull,
loop wrap-around) implemented — only these 3 still qualify on that axis.
It no longer describes which regions exist as real `AREAS{}` entries: the
2026-07-17 SVG rebuild (roadmap.md Phase 20) scaffolded **all 13 regions**
(71 rooms total, confirmed via `Plans/room_progress.js --full`) as flat
SHELL rooms — geometry/doors only, same state the 3 anchor regions were in
before Task 4. So every region below listed as "Planned" already exists in
code as an empty shell; "planned" now means "not yet mechanically/visually
designed," not "doesn't exist." Cross-check `Plans/room_progress.js --todo`
for the current per-room state before assuming a region is unbuilt.

All three of these specific regions are otherwise still empty skeletons
(flat floor + doors only) beyond Task 4's visual pass — none of them have
their *mechanical* effect (the thing that makes traversal feel different,
not just look different) built.

| Region | Rooms | Miniboss | Mechanical effect (not yet built) |
|---|---|---|---|
| Mirror Veil | 4 (gate, reflection, hollow, sanctum) | The Mirror King (4.1) | Background is inverted; secret paths exist only in the reflected version of the room, not the "real" one — per expansion.md §3.2. |
| Event Horizon | 4 (gate, pull, drift, core) | Gravity Collapse Core (4.2) | Constant gravitational pull toward one side of the room (leftward per §3.1) — platforming against a steady lateral force, not just gaps. |
| Chrono-Space Rift | 4 (gate, loop, echo, sanctum) | Temporal Warden (4.3) — also the opening cinematic's ally, see story.md §0 | Looping room — anything (player, projectile, enemy) that exits one side reappears on the other (wrap-around), per §3.6. |

---

## Planned (10 remaining of the 13 expansion.md regions)

None of these exist as real `AREAS` entries yet — `worldmap.html` shows each
as a single placeholder node (col/row below match its `PLANNED_REGIONS`
array — keep both in sync by hand, or update `worldmap.html` when either
changes). Room counts are estimates (4-7 rooms/region convention), not
committed layouts. Miniboss assignments confirmed 2026-07-13.

**Col/row repositioned 2026-07-13** — Gravity (was col 5) and Void/Sky (was
col 4) used to sit exactly on top of the built Event Horizon and
Chrono-Space Rift chains once those became real 4-room chains occupying
those same cells in Phase 9; nobody moved the placeholders afterward. This
is what caused the overlapping/unreadable `worldmap.html` the user
reported. Moved Gravity to col 7 and Void/Sky to col 3 (both genuinely
free columns). Magnetic (col 6) and Time/Mirror south (col 5, rows 2/4)
were already clear and are unchanged. `worldmap.html`'s `PLANNED_REGIONS`
updated to match — verified live, no more overlap.

| Region | Cluster | Col, Row | Est. rooms | Miniboss | Special effect |
|---|---|---|---|---|---|
| Graviton Core | Gravity (col 7) | 7, -1 | 4-6 | Fractured Sovereign's Guard (4.4) — the one miniboss directly tied to the Sovereign herself | Levers that flip gravity for the room; grants Graviton Surge. |
| The Inverted Spire | Gravity (col 7) | 7, -3 | 4-6 | — | Gravity permanently inverted — "up" and "down" are swapped from the moment you enter. |
| The Observatory | Void/Sky (col 3) | 3, -1 | 4-6 | — | Low gravity — floaty jumps, long hang time, heavy verticality. Its capstone room IS "Sovereign's Observatory" — see Reward Placement below. |
| The Void Expanse | Void/Sky (col 3) | 3, -2 | 5-7 | **The Undertow** (4.12, proposed name — added 2026-07-21/22, see `lore.md`) | No solid ground at all — every platform is a moving "time-stopped debris" chunk; timing, not positioning, is the whole puzzle. |
| Warp Gate Nexus | Void/Sky (col 3) | 3, -3 | 5-7 (hub + 3-4 vaults) | Warden & Hollow (4.9) | Teleporter hub — a central room branching into 3-4 small self-contained challenge vaults. |
| The Polar Shift | Magnetic (col 6) | 6, -1 | 4-6 | Electromagnetic Golem (4.5) | Blue walls push, red walls pull — traversal is bouncing between magnetic surfaces like a pinball, not jumping. |
| Paradox Engine | Magnetic (col 6) | 6, -2 | 5-7 | The Assembler (4.8) | Chase zone — a giant machine actively hunts the player through a maze while normal enemies still need fighting. |
| Static Field | Magnetic (col 6) | 6, -3 | 4-6 | The Conduit (added 2026-07-13 by `floor_plan.md`, see `lore.md`) — guards this region's Fracture Pip at Room 2, no ability attached | Electromagnetic arcs chain across the room; touching the floor zaps you upward (must stay airborne). Also corrupts the map overlay while inside (and briefly after) — a presentational glitch only, `discoveredAreas` is never actually altered. |
| Timeline Crossroads | Time/Mirror (col 5, south) | 5, 2 | 4-6 | **The Stationmaster** (story.md §4, Void Tether fight — proposed name, replaces the earlier Crystalline Warden assignment, see resolution note below) | Two overlapping time states, Past (crumbling) and Present (safe); enemies phase in/out, only vulnerable when "Present" (gold tint). Home of the Companion's Memory beat (roadmap 6.6) AND — moved here 2026-07-13 — Puppet Strings/Tether Region, branching directly off this region rather than Warp Gate Nexus, so the ability's showcase area sits right where it's earned instead of across the map. |
| Echoing Abyss | Time/Mirror (col 5, south) | 5, 4 | 4-6 | Quantum Pursuer (4.6) — canonically catches up to and overtakes the player, the game's one deliberately-faster-than-you enemy | Your own dashes/attacks leave lingering echoes (2s) that double as real platforms — you can jump on your own echo. |

2 regions carry no miniboss (Inverted Spire, Observatory) — intentional, not
every region needs one; see roadmap.md's Phase 2/4 discussion if that
changes. **Void Expanse moved out of this list 2026-07-21/22**: it now has
its own miniboss, The Undertow (proposed name — see `lore.md`), resolving
what used to be a deliberate "no miniboss" call. **Static Field moved out
of this list 2026-07-13**: `floor_plan.md` gives it a new miniboss (The
Conduit), superseding the earlier "no miniboss" call. Combined, that's
**12 named minibosses across the 13 regions**, plus two non-individual
encounters (Sovereign's Army Reserve's horde, and a conflicted/unresolved
Antechamber "grown Child" fight) — see `lore.md`'s "Minibosses & their
regions" section and `expansion.md`'s Phase 4 table for the full,
up-to-date roster; this doc only tracks region assignment.

**Reconciliation resolved 2026-07-13, superseded 2026-07-22**: expansion.md's miniboss table
assigned Electromagnetic Golem to the Magnetic cluster (The Polar Shift),
while story.md §4 separately placed the Crystalline Warden (Void Tether's
gatekeeper) in "The Polar Shift" by name — a collision from two docs'
independent numbering, not a deliberate double-fight. Resolved by moving
the Crystalline Warden to **Timeline Crossroads**: Electromagnetic Golem is
the better mechanical fit for Polar Shift's push/pull magnetism, and the
Warden's "freezes in terror, encases itself in crystal" imagery fits
Timeline Crossroads' Past (frozen)/Present (safe) mechanic better anyway —
a net improvement, not just a fix. **2026-07-22: Crystalline Warden itself
is now replaced** at Timeline Crossroads by a new figure (proposed name
"The Stationmaster") tied to the child's origin and a prison at Echo
Bridge — a full identity/moveset swap, not just a rename; see `lore.md` and
`story.md` §4 for the new figure's story and the corrected (immediate,
functional) Void Tether grant.

---

## Reward placement (added 2026-07-13)

**Design principle**: every planned region's best reward should require an
ability or tool found in a DIFFERENT region — per roadmap 6.2/6.3's existing
"ability-gated backtracking" rule. Don't gate a region's own deepest secret
on an ability granted earlier in that same region; that's not backtracking,
that's just critical path. The table below proposes which other region's
tool gates each one's Tier-3 secret — treat these as a starting proposal to
adjust once rooms are actually being laid out in the level editor, not a
final lock.

### Abilities — where each one is granted

| Ability | Region | Status |
|---|---|---|
| Phase Dash | Mirror Veil Sanctum | Built (Phase 9) |
| Shard Shot | Crystal Cavern (origin spine) | Built — kept here deliberately, its own wall puzzle needs the ability in-room, see roadmap.md Phase 9 |
| Stillpoint | Chrono-Space Rift Sanctum | Built (Phase 9) |
| Charged Attack | Crag Altar (Crag of the Colossus, narratively side region — but this ability is intended to be MANDATORY, not skippable, see the Side-branches section below) | Built (Phase 7), but the enforcement that makes it actually unskippable is `roadmap.md`'s still-unbuilt wall-gate item |
| Graviton Surge | Graviton Core | Planned, region not built yet |
| Void Tether | **Two-stage, corrected 2026-07-22**: Timeline Crossroads (The Stationmaster fight, conditional on leaving the child) grants a real, working but limited version immediately — the permanent-sacrifice choice is rewarded on the spot, not gated further. The Void Expanse (The Undertow fight) later completes it (full range, no charge limit) as an optional upgrade, not a prerequisite. Moved from The Polar Shift 2026-07-13. | Planned, region not built yet |
| Mirror Step (new 2026-07-13, expansion.md 1B.1) | Mirror Veil | Planned — region exists as a built skeleton (Phase 9), ability itself not built |
| Blink (new 2026-07-13, expansion.md 1B.2) | Warp Gate Nexus | Planned, region not built yet |
| Overcharge (new 2026-07-13, expansion.md 1B.3) | Static Field | Planned, region not built yet |
~~Magnet Climb~~ — removed 2026-07-14, direct instruction. Existed briefly (2026-07-13) as a new ability co-gating the Antechamber with Void Tether (XOR); both the ability and the Antechamber's gate requirement are gone. Antechamber entry from The Rift is now ungated beyond what The Rift itself requires.

### Fracture Pips — 5 total, 2 already placed (superseded 2026-07-13 by `floor_plan.md`)

`floor_plan.md`'s graph wins over the old 4-pip plan below (resolved by direct
instruction) — it places pips by which room's reward they sit alongside
rather than by cross-region ability gate. **Implementation note, not yet
done**: `player.js`'s `FRACTURE_ABS_MAX` is hardcoded to `4` — raising the
real total to 5 pips means either bumping that constant to `5` or treating
one of the 5 as redundant/overflow once `fractureMax` hits its cap. Flagging
only; not changed here since it's a balance-affecting code constant, not a
docs fix.

| # | Location | Status | Notes |
|---|---|---|---|
| 1 | The Fracture (origin spine, low shelf) | Built — see roadmap.md 1.9 | Deliberately the easy, teach-the-mechanic first one |
| 2 | The Vault (origin spine, altar) | Built — see roadmap.md 1.9 | Same reasoning |
| 3 | Chrono-Space Rift, Sanctum | Built region, pip not yet placed in `area.js` | Alongside the Stillpoint grant (3-pip ability) — pairs the pip that lets you afford Stillpoint with the room that grants it |
| 4 | Graviton Core, Room 2 | Planned | Alongside the Graviton Surge grant |
| 5 | Static Field, Room 2 | Planned | Alongside the region's new miniboss, The Conduit (see below) — no ability grant here anymore, Magnet Climb was removed 2026-07-14 |

Superseded/removed: the old #3/#4 (a Graviton Core nook behind Phase Dash, an
Echoing Abyss nook behind Charged Attack) — not in `floor_plan.md`'s graph,
dropped rather than kept as a 6th/7th pip.

### Lore Pips — 15 total (superseded 2026-07-13 by `floor_plan.md`)

`floor_plan.md`'s graph wins over the table below's original per-region
counts, same resolution as the Fracture Pips section above. Composition
changed: 12 of the 13 regions carry exactly 1 (not the original 11), one
region carries 2, one region (**Static Field**) carries **0** (dropped —
its Room 2 is now a Fracture Pip + the new miniboss instead, see above),
and 2 more Lore Pips sit outside the 13 regions entirely, on the origin
spine / endgame (The Vault, Room 2; Hollow Core) — bringing the true total
to 15, same number as before but differently composed.

| Region | Lore Pip count | Where |
|---|---|---|
| Mirror Veil | 1 | Reflection room |
| Event Horizon | 1 | Drift room |
| Chrono-Space Rift | 1 | Loop, Part 2 |
| Graviton Core | 1 | Room 3 (alongside its miniboss) |
| The Inverted Spire | 1 | The region's single entry room |
| **The Observatory** | **2** | Room 2; the second IS Sovereign's Observatory itself (the capstone payoff — see below) |
| The Void Expanse | 1 | Room 1 (alongside a cosmetic upgrade) |
| Warp Gate Nexus | 1 *(was 2 — the hub-bonus 2nd pip is dropped, not in `floor_plan.md`'s graph)* | Room 2 (alongside its miniboss) |
| The Polar Shift | 1 | Room 2 (alongside its miniboss) |
| Paradox Engine | 1 | Room 2 (alongside its miniboss) |
| **Static Field** | **0** *(dropped — was 1)* | — has a Fracture Pip + new miniboss instead |
| Timeline Crossroads | 1 | Timeline X Roads, Room 2 (alongside its miniboss and the Void Tether grant) |
| Echoing Abyss | 1 | Room 2 (alongside its miniboss) |
| *(not a region)* The Vault | 1 | Room 2 — new, distinct from the 2 `loreFragments` already built in Vault Room 1 |
| *(not a region)* Hollow Core | 1 | The room itself |

Total: 15 Lore Pips across the 13 regions (11 x 1, 2 x 2), separate from the
origin spine's own already-placed fragments and the Crag's 3.

### Extra/Customization Pips — 15 total, added 2026-07-29 (proposal)

Per the user's request: 15 more pips with **no vision/visual effect
attached** (unlike the 15 Lore Pips above, which each trigger a specific
`lorePipEffect` moment) — pure Fracture Pip/upgrade-economy currency, there
so players have more of that economy to spend on customization. Combined
with the 15 Lore Pips above: **30 pips total** in the world. Same caveat as
the Lore Pip table — these are proposed placements, not locked, since most
of the 13 regions aren't built yet.

| Region | Extra Pips | Reasoning |
|---|---|---|
| Mirror Veil | 1 | Even spread |
| Event Horizon | 1 | Even spread |
| Chrono-Space Rift | 1 | Even spread |
| Graviton Core | 1 | Even spread |
| The Inverted Spire | 1 | Even spread |
| The Observatory | 1 | Even spread |
| The Void Expanse | 1 | Even spread |
| Warp Gate Nexus | 1 | Even spread |
| The Polar Shift | 1 | Even spread |
| Paradox Engine | 1 | Even spread |
| **Static Field** | 1 | Only region with 0 Lore Pips, but not over-weighted — see Crag below |
| Timeline Crossroads | 1 | Even spread |
| Echoing Abyss | 1 | Even spread |
| **Crag of the Colossus** *(side-branch, not one of the 13)* | **2** | Already built and live (unlike most of the 13, which are unbuilt shells) — gives the customization economy somewhere actually reachable today. Separate from its existing 3 old-style `loreFragments` text fragments, same relationship the 15 Lore Pips have to those. |

Total: 13 x 1 (across the 13 regions) + 2 (Crag) = 15 extra pips, bringing
the grand total to 30 alongside the 15 Lore Pips. Not yet implemented in
`area.js`/`game_entities.js` — these need a distinct pip type from the
lore-fragment kind (no `lorePipEffect` trigger) once building starts.

### Cosmetic upgrades — NOT one per region, kept rare and hidden

Per the "nice to collect, not another economy" discussion — these are
zero-mechanical-weight finds (dash-trail/echo color, a build epithet
unlock), so they shouldn't be as common as Lore Pips or they stop feeling
special. Proposed: **one per cluster** (Gravity, Void/Sky, Magnetic,
Time/Mirror — 4 total), hidden in whichever single room within that
cluster ends up hardest to reach, decided once that cluster is actually
built, not pre-assigned to a specific region now.

### Sovereign's Observatory & Hollow Core — placement

- **Sovereign's Observatory** (renamed 2026-07-13 from "King's Observatory"
  per the King→Sovereign rename — see `lore.md`/`story.md` revision
  history) is not a new/14th region — it's the capstone room of the
  already-planned **"The Observatory"** region (Void/Sky cluster); the
  shared name isn't a coincidence, use it. Reach it deep in that region's
  layout, ideally after a cross-region ability requirement (ties into the
  map/exploration payoff already discussed).
- **Hollow Core** — placed as plot geography near the endgame, not a side
  region: a secret/optional room branching off **Antechamber** or
  **Boss Arena**, consistent with the "center of the world, tied to the
  Sovereign's true prison" framing from its earlier discussion. Exact door
  placement to be decided alongside 6.7's spatial-loop rework, since both
  touch the same rooms.

### Fast travel nodes (mirrors roadmap.md 4.5 — kept in sync by hand)

The Vault; each region's Sanctum/Core (Mirror Veil Sanctum, Chrono-Space
Rift Sanctum, Event Horizon Core, and future regions' equivalent deepest
room); the opening sealed starting room (6.7), once discovered. Deliberately
NOT at the Antechamber/Boss Arena Phase-Dash wall crossing — that stays a
one-time reveal, not a menu option.

---

## Connective content — honest accounting (revised 2026-07-13)

Checked directly rather than assumed: for the specific "tree vs. web"
problem among the 13 planned regions, **not much was actually added this
session**, and what was removed was the one idea aimed squarely at it.

- **Mirror Corridor** — the flagship idea for this exact problem (turning
  the Mirror Veil Sanctum <-> Event Horizon Gate cross-link into a real
  playable room). Removed per instruction along with the rest of the
  "execution risk" triage tier. **Reinstated 2026-07-13** by `floor_plan.md`
  (Mirror Veil, Sanctum → Mirror Corridor → Event Horizon, Gate) — treat
  that doc as the current word on this, superseding the "nothing has
  replaced it yet" note below.
- **Puppet Strings / Tether Region** — real, but it's a dead-end optional
  vault off Warp Gate Nexus (see that row above), not a cross-link between
  two existing regions. Doesn't solve the same problem.
- **The spatial loop reveal (roadmap 6.7)** — a genuinely big connective
  addition, but it connects the origin spine's two ends (tutorial <-> boss
  arena) to each other, not the 13 planned regions to one another.
- **Fast travel nodes** (roadmap 4.5) — functional connectivity between
  hubs, not new spatial/narrative web content.
- **`CROSS_LINKS`** (`worldmap.html`) — pre-existing from Phase 9, not
  added this session.

**A concrete replacement worth considering, since the gap is real**:
`echoing_abyss` <-> `crystal_cavern` already has a one-way shortcut back to
the early spine (existing `CROSS_LINKS` entry). A cheaper, lower-risk
version of Mirror Corridor's idea — real content at a cross-link, not just
a bare door — could apply here instead: since Echoing Abyss's own mechanic
is "your echoes become platforms," the shortcut back to Crystal Cavern
could require leaving a deliberate echo *in* Crystal Cavern on the way in,
then using it as a landing platform on the way back through — reusing an
existing region's already-built geometry and the already-built echo system,
no new room needed the way Mirror Corridor's two-lane portal room would
have. Lower risk because it's an interaction with a room that already
exists, not a new room with unproven portal-swap rules. Worth prototyping
before committing, same caution as everything else in this file's rewards
section.

## Cross-links (the "tree vs. web" fix)

Hand-maintained in `worldmap.html`'s `CROSS_LINKS` array (not duplicated
here to avoid a second copy drifting out of sync) — see that file for the
current list and expansion.md §3.13b for the reasoning behind each one.
Apply the same cross-link pattern to any of the 10 planned regions above
once they're actually built, per Phase 9's standing instruction.

## Side-branches (not part of the 13 spacetime regions)

Same category as Crag of the Colossus in one sense only — spatially attached
to the spine/a region, narratively separate from the Sovereign's 13-region
empire. **"Side region" ≠ "optional," a distinction this doc got wrong
2026-07-14 and is correcting here**: Crag is narratively independent from
the Sovereign's story, but Charged Attack (its reward) was intended to be
mandatory — `roadmap.md` has a still-unbuilt, already-planned wall gate on
the true critical path (The Rift → Antechamber → Boss Arena) specifically to
stop players from reaching the Sovereign without ever touching Crag. **Update
2026-07-15**: `floor_plan.md`'s graph no longer shows The Rift requiring
Charged Attack (or Graviton Surge) to enter — both were removed at the
user's request, so this specific piece of evidence for Charged Attack being
mandatory no longer holds. The planned wall gate on the Rift→Antechamber→Boss
Arena path is unbuilt either way; whether Charged Attack is still meant to be
mandatory via that gate (or via some other mechanism) needs revisiting with
the user rather than assumed from this doc. A region can be mandatory content
while having zero connection to the main villain's plot — those are
independent axes, not the same choice.
**Pacifist Enclave and Sovereign's Army Reserve below ARE genuinely optional
(skippable, bonus-only rewards)** — don't read "side-branch" as implying
that on its own; check each entry's own reward for whether it's load-bearing.

- **Pacifist Enclave** (added 2026-07-14) — off Upper Ruins. Explicitly not
  under Sovereign rule. Peaceful play unlocks 5 minigames leading to 1 lore
  pip; fighting even once forfeits the reward permanently (irreversible
  consent-gated choice, see `CLAUDE.md`'s design-decisions list). Placed
  early (Upper Ruins, not The Vault) since the emotional beat — "the world
  can still be kind if you are" — lands better before the player's been
  ground down by 10+ regions of hostility, not after.
- **Sovereign's Army Reserve** (added 2026-07-14) — off Graviton Core,
  Room 3. An extremely difficult horde gauntlet; placed here specifically
  because Graviton Core is the one region confirmed to still be under live
  contact with the Sovereign's command structure (see `lore.md`'s Graviton
  Core entry) — the only place in the world an active "reserve" of her
  soldiers makes in-fiction sense. Dead-ends into **Limit Breaker Trial**,
  which grants a 4th ability-upgrade tier beyond the standard 3 (see the
  not-yet-finalized ability upgrade tree discussion) — the hardcore-player
  answer to "what's after the normal progression caps out."
