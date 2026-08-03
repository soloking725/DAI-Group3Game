> **ARCHIVED 2026-07-21**: moved out of `Plans/` during a doc staleness
> pass. This doc's claim that the arrest/prison graph fix (variant 3c)
> "has NOT been applied yet" is now stale/contradicted — `floor_plan.md`'s
> live mermaid already contains `Echo_Bridge_Prison` and
> `child_choice_resolved` gates on Mirror Corridor/Crystal Cavern, matching
> variant 3c almost exactly. Kept for historical context only; treat
> `floor_plan.md`'s own dated correction log as authoritative, not this
> file.

# Floor Plan — open issues (session notes, 2026-07-16)

Working notes from an extended session iterating on `floor_plan.md` /
`floor_plan_mermaid.txt` with `Plans/analyze_floor_plan.js`. Meant to let a
fresh session pick up exactly where this one stopped — read this before
touching the graph again.

## Status of the real files right now

`Plans/floor_plan.md` and `Plans/floor_plan_mermaid.txt` are in sync with
each other and reflect the **last confirmed-good state**: 76 rooms, fully
reachable (76/76), King→Sovereign rename done, Magnet Climb/old Antechamber
restriction removed, fast-travel-unlock-requires-Sovereign's-Observatory
modeled, Void Tether pickup at Timeline X Roads Room 2 modeled as
conditional-on-Stillpoint.

**The arrest/prison plot point discussed this session has NOT been applied
to these files yet.** All of that exploration happened in scratch files
(`/tmp/new_mermaid*.txt`) to test variants quickly. Nothing needs
reverting — just don't assume the live files already have it.

## The tool

`Plans/analyze_floor_plan.js` (plain Node, no deps):
- `node Plans/analyze_floor_plan.js [file]` — full report: reachability,
  ability/flag acquisition order, critical path (fewest rooms), speedrun
  path (time-weighted), mandatory-room list, soft-lock risk scan, route
  count, "what gates what."
- `--html` — writes `Plans/floor_plan_report.html`, a visual version of
  the above (open directly in a browser).
- `--diff` — cross-checks `floor_plan.md` against `floor_plan.svg` /
  `floor_plan_mermaid.txt` for text drift.

It now supports **custom story flags** generically: any node/edge segment
shaped like `requires <snake_case_name>` or `unlocks <snake_case_name>`
that isn't a known ability is auto-registered as a flag (see
`met_child`, `fast_travel_unlocked` for the hardcoded examples, and the
new `prison_resolved` for a working example of the auto-discovered kind).

## Open problem #1 — is Timeline X Roads Room 2 / Void Tether mandatory?

Long back-and-forth this session. What was tried, in order, and why each
attempt failed or worked:

1. **Hard "(locked by Stillpoint)" gate on Room 2's entry alone.**
   Created a real 4-node circular deadlock: Stillpoint only comes from
   Chrono Space Rift's Sanctum → Chrono Space Rift's only entrance
   requires Void Tether → Void Tether only comes from Room 2 → Room 2
   requires Stillpoint. No ordering works. **Fixed** by adding two new
   edges: `Echo Bridge, part 1 → The Void Expanse, Room 1` and
   `The Void Expanse, Room 1 → Chrono Space Rift, Loop, Part 1` — a real
   alternate, ungated entrance into the Chrono Space Rift loop that
   bypasses the Void-Tether-gated front door, so Stillpoint becomes
   bootstrap-able without needing Void Tether first.

2. **That bootstrap fix reopened a bypass around Graviton Core.** Once
   Stillpoint was free, The Forge (needs only Stillpoint) opened a route
   to Vault Room 1 → Graviton Core Room 3 → walk in *backwards* to Room 2
   (Graviton Surge) without ever passing Room 1's Shard-Shot gate.
   Partially fixed by adding "entry requires Shard Shot" to Graviton Core
   Room 2 and Room 3 as well (not just Room 1) — but this did **not**
   fully close the loophole, because Shard Shot (Crystal Cavern, always
   free) and Stillpoint (via the new bootstrap) are *each independently*
   obtainable without ever touching Room 2, and together that's
   everything Graviton Surge needs. **Room 2 is still not mandatory as of
   the last committed state.**

3. **Arrest/prison plot point (this session, not committed).** Player
   idea: entering Echo Bridge, part 1 for the first time forces a march
   through Timeline X Roads Room 1 into a new "Echo Bridge, Prison" room;
   escaping there drops you at Room 2, and (per the idea) Room 1 + Mirror
   Corridor become locked until Room 2 is resolved — forcing the
   Void-Tether-vs-Child choice. Tested three graph variants:

   - **(a) As literally described** (lock only Room 1 + Mirror Corridor,
     Room 2 keeps "(locked by Stillpoint)"): still bypassable — Echo
     Bridge's own direct edges to Crystal Cavern and Void Expanse are
     untouched by the lock. Also a **real softlock risk**: verified that
     blocking just the Echo Bridge → Void Expanse edge alone drops
     reachability to 29/76 (unreachable), meaning a player who hits the
     lock before getting Stillpoint would be permanently stuck.
   - **(b) Funnel Crystal Cavern/Void Expanse/Upper Ruins/Observatory
     through Room 1 instead of through Echo Bridge directly:** still
     bypassable — Room 1 has a *second*, always-open entrance via Mirror
     Veil Gate that the lock doesn't touch.
   - **(c) WORKING variant:** remove "(locked by Stillpoint)" from Room 2
     entirely (keep only "met the Child"); add a new `prison_resolved`
     flag granted at Room 2; gate Timeline X Roads Room 1, Mirror
     Corridor, and the Mirror Veil Gate ↔ Fracture part 2 connection
     behind that flag. Verified: 76/76 reachable, Room 2 confirmed
     mandatory (19 rooms mandatory total, up from 13), no softlock.
     **Caveat the user caught live:** since Room 2 no longer requires
     Stillpoint, **Stillpoint itself fell off the mandatory list** —
     nothing else in the graph currently needs it (only the optional
     Forge does).

## Open problem #2 — Stillpoint needs a new mandatory anchor

**Update 2026-07-15**: The Rift's Charged Attack and Graviton Surge entry
requirements described below were removed at the user's request — The
Rift now only requires Stillpoint + `child_choice_resolved`. The
reasoning below is kept as historical context for why Stillpoint was
anchored here, not as a current description of the room's gates.

**Update 2026-07-15 (2)**: user's stated intent is to make The Rift a
**difficulty check, not a further ability gate** — i.e. don't add more
`requires: <ability>` entries here to raise its bar; raise the actual
in-room combat/platforming difficulty (enemy density, hazard layout)
instead, on top of the two requirements it already has. Not yet designed
or built — no room content changes made yet, this is a note for whoever
next works on `area.js`'s `the_rift` entry.

Direct follow-on from (3c) above. Not yet applied or tested. Leading
recommendation: add **"entry requires Stillpoint"** to **The Rift**
(already requires Charged Attack + Graviton Surge, already confirmed
mandatory, a natural late-game multi-ability convergence point). No known
circular-dependency risk this time, since Stillpoint's bootstrap route
(Echo Bridge → Void Expanse → Chrono Space Rift) doesn't depend on
Charged Attack, Graviton Surge, or the Rift itself. Alternative if that
feels wrong tonally: add it as a third requirement on Graviton Core Room
1/2/3 alongside Shard Shot.

**Before committing anything**, re-verify with the tool: reachable 76/76,
Stillpoint's room AND Room 2 both mandatory, no new soft-lock entries.

## Other confirmed findings, not yet fixed in the live files

- **Real bug:** "Teleport from Static Field" has zero outgoing edges — a
  genuine dead end (`DEFINITE TRAP` in the soft-lock scan). Every other
  `Teleport from X` node in the doc leads somewhere (Chrono Space Rift's
  → Echoing Abyss Room 1; Warp Gate Nexus's → Inverted Spire). Fix: add
  `Teleport_from_Static_8c56de9c --> Graviton_Core_Room_1_7aa0f207`.
- 9 "DEPENDS ON LOADOUT" soft-lock entries in the scan — likely fine
  (intentional one-way teleport gates a player would normally already be
  equipped for), but not manually verified room-by-room.
- "How many ways to beat the game": astronomically large (~8.7
  quintillion in the last committed graph) — not a meaningful design
  metric on its own, dominated by detour/ordering combinatorics. The
  mandatory-room count is the more useful "shape of the game" number.
- "Is the map too restrictive / too ability-gated?" — raised, not yet
  answered with real data. Worth a follow-up pass using the mandatory-room
  count and per-ability gate-count (`what gates what` section) as the
  starting metrics if picked back up.

## Decisions already made — don't relitigate

- King Room 1–4 / King's Observatory → Sovereign Room 1–4 / Sovereign's
  Observatory, for consistency with `lore.md`/`story.md`'s 2026-07-13
  rename.
- Magnet Climb and the old Antechamber "Magnet Climb OR Void Tether"
  restriction: removed, confirmed correct.
- Fast travel's *warp mechanic* requires having visited Sovereign's
  Observatory first (a flag, `fast_travel_unlocked`) — modeled and
  working. Normal walking access is unaffected; only the warp shortcut
  needs it.
- Timeline X Roads Room 2's Void Tether grant should be a real
  irreversible "give up the Child / keep the Child forever" choice —
  matches the game's established irreversible-consent-gated-choice
  pattern (`CLAUDE.md`). Keep this framing.
- The arrest/prison plot point itself (the narrative beat) is good and
  worth keeping — only the graph wiring needs to land on variant (3c)
  above (or a refinement of it) before committing it to the real files.

## How to resume

1. Read this doc.
2. Decide where Stillpoint's new mandatory gate goes (Open problem #2).
3. Apply, to **both** `Plans/floor_plan.md` and
   `Plans/floor_plan_mermaid.txt` (keep their mermaid blocks identical):
   - the working prison/lock variant (3c),
   - the Stillpoint re-gate,
   - the Teleport-from-Static-Field dead-end fix.
4. Run `node Plans/analyze_floor_plan.js --html` and confirm: 76/76
   reachable, both Stillpoint's room and Room 2 mandatory, no
   `DEFINITE TRAP` entries, no new parser warnings.
5. Open `Plans/floor_plan_report.html` and sanity-check the two example
   routes read sensibly.
