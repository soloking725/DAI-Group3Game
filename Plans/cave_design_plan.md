# Making Stillpoint Read as a Cave — Research & Plan

Triggered by direct feedback: the floorless "segmented platforms over instant-death
pits" pattern (Echo Bridge/The Rift, and Crag's original draft) isn't the right
feel. Goal: Hollow Knight-like underground platforming — parkour that stays
interesting without leaning on fall-death as the difficulty lever, and a world
that reads as one connected place, not a string of separate rooms.

## What actually makes Hollow Knight's underground platforming/layout work

Distilled from how the game is actually built, not just "it's good because it's HK":

1. **Verticality is the spine, not a decoration.** Hallownest's own map is oriented
   vertically — you *descend* into the world, and depth itself carries meaning
   (deeper = older/stranger/more dangerous). Our compass graph right now is
   almost entirely one horizontal row. That's the single biggest structural gap
   between what we have and what HK does.
2. **Foreground/background separation is deliberate and consistent.** Solid
   platforms are drawn in a brighter, readable palette; everything behind them
   (cave walls, distant structures, ruins) is dark and low-contrast. You never
   have to guess what's solid. Our rooms currently don't really have a
   background *layer* — `bgTint` is a flat wash, not a silhouette layer.
3. **Doors are tunnels, not rectangles.** Every transition is a carved opening
   in the rock with matching geometry on both sides, panned into with near-zero
   visual disruption. This is the "invisible door" feedback from earlier,
   confirmed by looking at what HK actually does structurally, not just
   aesthetically.
4. **Most of the game has no fall-death at all.** This surprised me rechecking
   it — instant-death pits are concentrated in specific zones with a reason
   (Deepnest's darkness, White Palace's precision gauntlet, acid in Fungal
   Wastes as an ecology detail). The *default* traversal experience is "you can
   always retry a jump by falling to solid ground," not "one miss, restart."
   Difficulty comes from enemies, hazards, and precision under time pressure —
   not from an ambient death floor everywhere.
5. **Movement upgrades retroactively reopen the map, and the game telegraphs
   this in advance.** A gap that's obviously too tall, a ledge with no visible
   route up — you see it before you have the tool, and remembering it later is
   the reward. This only works if "visible but unreachable" is a deliberate
   placement, which is already the direction `expansion.md` §3.14 took — good,
   keep doing that, just make sure the *room geometry* actually shows these
   spots instead of hiding them behind a locked door with no visual tease.
6. **Room size and shape vary with purpose — "always huge" isn't the actual
   rule.** Hubs (Crossroads, City of Tears) are large with many interconnects;
   connective corridors between them are much smaller. What's consistent isn't
   size, it's that a room's *shape matches its job* — a hub reads like a hub, a
   connector reads like a hallway, an arena reads like an arena. §3.15's "big
   rooms" push in `expansion.md` should be read as "size matches purpose," not
   "everything must be maximally large" — worth softening that language.
7. **Internal shortcuts, not just region-to-region ones.** The classic HK move
   is a one-way drop or locked door that, once opened from the far side, turns
   a 90-second traversal into a 10-second one on repeat visits. We already have
   this idea in `expansion.md` §3.15 point 3 — it's just not built yet anywhere.
8. **Landmarks give you a mental map independent of the M-key.** A giant
   fossil, a broken statue, a distinctive silhouette visible from multiple
   vantage points in the same region — you navigate by "the big cracked pillar"
   as much as by the map screen.

## What this means concretely for Stillpoint

**A. Rendering (not started, scoped separately from this plan)**
- A real background silhouette layer behind platforms — dark jagged rock
  shapes, parallax-scrolled slower than the foreground, distinct from the
  current flat `bgTint` wash.
- Tunnel-mouth transition geometry replacing the floating arrow icon — carve
  the door into the platform shape itself (a rounded/jagged gap in the rock,
  maybe faint drifting particles or light bleed) so it reads as a passage
  without a UI marker. This is the single change that most directly answers
  "make the door invisible."
- Matching silhouette across a transition pair (continue the pattern already
  used for Crag Entrance's east door / Crag Breach's west door lining up).

**B. Structure**
- Bias new regions toward real verticality — not just "bigger," but rooms
  with an actual up/down identity (a shaft you climb, a chamber you descend
  into), matching the compass graph's row axis instead of only its column axis.
  Crag already does this (rows -1 to -4); lean into it harder for the planned
  13 regions, especially ones already thematically vertical (Inverted Spire,
  Event Horizon).
- Stop defaulting every room to "as big as possible." Categorize deliberately:
  **Hub** (multi-tier, several exits, the shape Crag Entrance/Breach are now),
  **Corridor** (small, 1-2 screens, connective tissue — fine for these to stay
  small), **Vertical Shaft** (tall and narrow, one clear through-line),
  **Arena** (miniboss/boss, open floor, shape follows the fight like
  Crag Warden already does). Assign one of these per room up front, not after
  the fact.
- Build at least one real internal shortcut per region once a region has more
  than 2 rooms (a locked door on the far side of a long path that opens onto
  a route you already cleared) — Crag doesn't have one of these yet; worth
  retrofitting once the "invisible door" rendering work lands, so it's not
  built twice.
- 1-2 background landmarks per region, reused across multiple rooms in that
  region for orientation — doesn't need new engine work, just deliberate
  background-layer content once (A) exists.

**C. Traversal feel — keeping parkour interesting without fall-death as the lever**
- No-fall-death stays the default for all future rooms (already applied to
  Crag this session) — pits are only for a room that's *specifically* built
  around that hazard and says so in a comment, matching `expansion.md` §3.17's
  "hazards should reinforce region physics" rule. Practical enforcement: the
  `pitDeathY` pattern added this session should default generous (current
  behavior) rather than needing to be remembered per room — already true, just
  documenting the intent so a future room doesn't quietly regress.
- Interest instead comes from: verticality itself (climbing well feels good
  without death pressure), enemy placement forcing a real route choice
  (fight through vs. platform around/above), ability-gated shortcuts that
  reward backtracking, and "I can see it but can't reach it yet" reveals.
- Mechanical variety over raising death stakes: limited-use crumbling
  platforms (a repositioning puzzle, not instant death), moving platforms,
  and — once Graviton Surge exists — genuine low/reversed-gravity traversal
  segments. None of this is built yet; flagging as the toolkit to reach for
  instead of "make the gap bigger and add spikes."

## Explicitly not solved by this plan
- The tunnel-door rendering work is real engine effort across every room, not
  a Crag-only fix — still a separate task, referenced here so it isn't
  designed twice.
- This doesn't retroactively redo the 9 origin-spine rooms or Echo Bridge/The
  Rift's floorless pits — those keep their current behavior (they have
  `pitDeathY` overrides specifically to preserve it). Whether to eventually
  redesign them is a separate decision, not assumed here.
