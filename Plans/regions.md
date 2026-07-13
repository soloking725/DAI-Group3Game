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

---

## Built (3 anchor regions — see roadmap.md Phase 9)

All three are currently empty skeletons (flat floor + doors only) — no
special effect is implemented yet. Task 4 (cave-aesthetic pass) gave them a
first visual identity; none of them have their *mechanical* effect (the
thing that makes traversal feel different, not just look different) built.

| Region | Rooms | Miniboss | Mechanical effect (not yet built) |
|---|---|---|---|
| Mirror Veil | 4 (gate, reflection, hollow, sanctum) | The Mirror King (4.2) | Background is inverted; secret paths exist only in the reflected version of the room, not the "real" one — per expansion.md §3.2. |
| Event Horizon | 4 (gate, pull, drift, core) | Gravity Collapse Core (4.3) | Constant gravitational pull toward one side of the room (leftward per §3.1) — platforming against a steady lateral force, not just gaps. |
| Chrono-Space Rift | 4 (gate, loop, echo, sanctum) | Temporal Warden (4.6) — also the opening cinematic's ally, see story.md §0 | Looping room — anything (player, projectile, enemy) that exits one side reappears on the other (wrap-around), per §3.6. |

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
| Graviton Core | Gravity (col 7) | 7, -1 | 4-6 | Fractured King's Guard (4.1) — the one miniboss directly tied to the King himself | Levers that flip gravity for the room; grants Graviton Surge. |
| The Inverted Spire | Gravity (col 7) | 7, -3 | 4-6 | — | Gravity permanently inverted — "up" and "down" are swapped from the moment you enter. |
| The Observatory | Void/Sky (col 3) | 3, -1 | 4-6 | — | Low gravity — floaty jumps, long hang time, heavy verticality. Its capstone room IS "King's Observatory" — see Reward Placement below. |
| The Void Expanse | Void/Sky (col 3) | 3, -2 | 5-7 | — | No solid ground at all — every platform is a moving "time-stopped debris" chunk; timing, not positioning, is the whole puzzle. |
| Warp Gate Nexus | Void/Sky (col 3) | 3, -3 | 5-7 (hub + 3-4 vaults) | Warden & Hollow (4.8) | Teleporter hub — a central room branching into 3-4 small self-contained challenge vaults. |
| The Polar Shift | Magnetic (col 6) | 6, -1 | 4-6 | Electromagnetic Golem (4.4) | Blue walls push, red walls pull — traversal is bouncing between magnetic surfaces like a pinball, not jumping. |
| Paradox Engine | Magnetic (col 6) | 6, -2 | 5-7 | The Assembler (4.7) | Chase zone — a giant machine actively hunts the player through a maze while normal enemies still need fighting. |
| Static Field | Magnetic (col 6) | 6, -3 | 4-6 | — | Electromagnetic arcs chain across the room; touching the floor zaps you upward (must stay airborne). Also corrupts the map overlay while inside (and briefly after) — a presentational glitch only, `discoveredAreas` is never actually altered. |
| Timeline Crossroads | Time/Mirror (col 5, south) | 5, 2 | 4-6 | The Crystalline Warden (story.md §4, Void Tether fight) — moved here 2026-07-13, see resolution note below | Two overlapping time states, Past (crumbling) and Present (safe); enemies phase in/out, only vulnerable when "Present" (gold tint). Home of the Companion's Memory beat (roadmap 6.6) AND — moved here 2026-07-13 — Puppet Strings/Tether Region, branching directly off this region rather than Warp Gate Nexus, so the ability's showcase area sits right where it's earned instead of across the map. |
| Echoing Abyss | Time/Mirror (col 5, south) | 5, 4 | 4-6 | Quantum Pursuer (4.5) — canonically catches up to and overtakes the player, the game's one deliberately-faster-than-you enemy | Your own dashes/attacks leave lingering echoes (2s) that double as real platforms — you can jump on your own echo. |

4 regions carry no miniboss (Inverted Spire, Observatory, Void Expanse,
Static Field) — intentional, not every region needs one; see roadmap.md's
Phase 2/4 discussion if that changes.

**Reconciliation resolved 2026-07-13**: expansion.md's miniboss table
assigned Electromagnetic Golem to the Magnetic cluster (The Polar Shift),
while story.md §4 separately placed the Crystalline Warden (Void Tether's
gatekeeper) in "The Polar Shift" by name — a collision from two docs'
independent numbering, not a deliberate double-fight. Resolved by moving
the Crystalline Warden to **Timeline Crossroads**: Electromagnetic Golem is
the better mechanical fit for Polar Shift's push/pull magnetism, and the
Warden's "freezes in terror, encases itself in crystal" imagery fits
Timeline Crossroads' Past (frozen)/Present (safe) mechanic better anyway —
a net improvement, not just a fix. `story.md` §4 updated to match.

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
| Charged Attack | Crag Altar (Crag of the Colossus, side region) | Built (Phase 7) |
| Graviton Surge | Graviton Core | Planned, region not built yet |
| Void Tether | Timeline Crossroads (Crystalline Warden fight, conditional on leaving the child) — moved from The Polar Shift 2026-07-13 | Planned, region not built yet |

### Fracture Pips — 4 total (`FRACTURE_ABS_MAX`), 2 already placed

| # | Location | Status | Gate (for backtracking) |
|---|---|---|---|
| 1 | The Fracture (origin spine, low shelf) | Built — see roadmap.md 1.9 | None — deliberately the easy, teach-the-mechanic first one |
| 2 | The Vault (origin spine, altar) | Built — see roadmap.md 1.9 | None — same reasoning |
| 3 | Graviton Core, a nook requiring Phase Dash | Planned | Phase Dash (from Mirror Veil) — cross-region gate |
| 4 | Echoing Abyss, a nook requiring Charged Attack to break a wall | Planned | Charged Attack (from Crag) — cross-region gate, also rewards reaching the region with the long one-way shortcut back to Crystal Cavern (existing `CROSS_LINKS` entry) |

### Lore Pips — one per region, two regions get a second

Applies to all 13 regions (the 3 built ones currently have `loreFragments`
placed on the origin spine's OWN rooms, per Phase 7-9, but the 3 anchor
REGIONS themselves — Mirror Veil, Event Horizon, Chrono-Space Rift — have
none yet; add theirs per this rule too):

| Region | Lore Pip count | Where |
|---|---|---|
| Mirror Veil | 1 | Sanctum (alongside the Phase Dash grant) |
| Event Horizon | 1 | Core (deepest built room) |
| Chrono-Space Rift | 1 | Sanctum (alongside the Stillpoint grant) |
| Graviton Core | 1 | — |
| The Inverted Spire | 1 | — |
| **The Observatory** | **2** | One standard placement; the second IS the King's Observatory payoff itself (see below) — the region's narrative weight earns the extra |
| The Void Expanse | 1 | — |
| **Warp Gate Nexus** | **2** | Hub regions carry more narrative weight — earns the extra |
| The Polar Shift | 1 | — |
| Paradox Engine | 1 | — |
| Static Field | 1 | — |
| Timeline Crossroads | 1 | Placed near the Companion's Memory beat (roadmap 6.6) |
| Echoing Abyss | 1 | — |

Total: 15 Lore Pips across the 13 regions (11 x 1, 2 x 2), separate from the
origin spine's own already-placed fragments and the Crag's 3.

### Cosmetic upgrades — NOT one per region, kept rare and hidden

Per the "nice to collect, not another economy" discussion — these are
zero-mechanical-weight finds (dash-trail/echo color, a build epithet
unlock), so they shouldn't be as common as Lore Pips or they stop feeling
special. Proposed: **one per cluster** (Gravity, Void/Sky, Magnetic,
Time/Mirror — 4 total), hidden in whichever single room within that
cluster ends up hardest to reach, decided once that cluster is actually
built, not pre-assigned to a specific region now.

### King's Observatory & Hollow Core — placement

- **King's Observatory** is not a new/14th region — it's the capstone room
  of the already-planned **"The Observatory"** region (Void/Sky cluster);
  the shared name isn't a coincidence, use it. Reach it deep in that
  region's layout, ideally after a cross-region ability requirement (ties
  into the map/exploration payoff already discussed).
- **Hollow Core** — placed as plot geography near the endgame, not a side
  region: a secret/optional room branching off **Antechamber** or
  **Boss Arena**, consistent with the "center of the world, tied to the
  King's true prison" framing from its earlier discussion. Exact door
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
  "execution risk" triage tier. Nothing has replaced it yet.
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
