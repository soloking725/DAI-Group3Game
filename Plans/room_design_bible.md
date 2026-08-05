# Room Design Bible — Stillpoint (added 2026-07-29)

**Purpose**: one document to have open while hand-designing any of the 71 scaffolded
rooms (or drawing art in `editor/anim_editor.html`), organized by region. It answers,
per room: how many lore pips (and which vision mode), how many Fracture Pips, which
enemies belong there, what the region is *about* (mechanically and narratively), and
what still needs deciding. Nothing here replaces the doc it's pulled from — this is a
synthesis + a set of ground-truth tables, not a new source of truth. Where this doc and
a source doc disagree, the source doc wins; re-run the extraction (see below) rather
than trust a stale number here.

## 0. How to use this document

**Ground truth vs. proposal** — two different kinds of information sit side by side in
every region section below, and they are not the same reliability:

- **Ground truth** (room tables, pip/enemy counts, sizes, connection counts): pulled
  directly from `game/area.js` via a one-off Node script (same technique as
  `Plans/room_progress.js`, no browser needed). Accurate as of 2026-07-29. If you've
  since edited a room, these numbers are stale — regenerate with:
  ```bash
  node Plans/room_progress.js --full
  ```
  for design-state scoring, or write a similar throwaway `vm`-based script (see that
  file's own source for the pattern) if you need different fields dumped.
- **Proposal** (planned hazards, planned puzzle ideas, planned-but-unbuilt enemy
  flavor, extra/customization pip placement): pulled from `expansion.md`/`lore.md`/
  `regions.md`/`story.md`. These are design intent, not code — nothing enforces them,
  and several are explicitly flagged "not locked" in their source doc. Treat disagreement
  between two source docs as a real open question, not a bug in this doc.

**Companion docs — what each one is actually for** (don't duplicate their content by
hand-copying into a room; read the source):

| Doc | What it's the source of truth for |
|---|---|
| `floor_plan.md` | Room-to-room door topology (the mermaid graph) — which room leads where, one-way teleports, ability gates on doors |
| `regions.md` | Cluster/col-row grid position, reward placement (which region grants which ability/pip), the Extra/Customization Pips table |
| `lore.md` | Full narrative: the Sovereign, every miniboss's tragedy/moral-axis writeup, per-region "Hunt" thread, lore-pip visual-effect table |
| `expansion.md` | Mechanical effect per region, full 26+2+7 enemy roster, hazard/puzzle-room ideas (§3.16/3.17), miniboss movesets (Phase 4 table) |
| `story.md` | Plot beats tied to specific rooms (Echo Bridge, Timeline Crossroads, Void Tether, the three endings, Sovereign postgame) |
| `Plans/archive/animation_editor_plan.md` | How `editor/anim_editor.html` and the `ANIM_DEFS` data model work |
| `Plans/cave_design_plan.md` | Cave-floor/no-fall-death aesthetic philosophy (superseded for region-specific look by `REGION_STYLES` in `game_entities.js`, still right for general cave-floor logic) |
| `Plans/room_verification_tool_plan.md` | The reachability/safety linter design (`debug_v1.html`'s R09-R11 checks are the current down-payment on it) |
| **This doc** | Per-region "everything in one place" reference for the actual room-design pass — pip/enemy/plot content, cross-linked to all of the above |

**Regenerating the ground-truth tables**: every room table below came from a script
like this (adjust the fields you want dumped):
```bash
node -e "
const fs=require('fs'),vm=require('vm');
const ctx={window:{addEventListener(){}},console:{log(){},warn(){},error(){}}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('game/area.js','utf8'),ctx,{filename:'area.js'});
const AREAS=ctx.window.AREAS;
for(const id of Object.keys(AREAS)){const r=AREAS[id];
  console.log(id, r.region, (r.enemies||[]).length, (r.loreFragments||[]).length);}
"
```
Never open a browser to check this — per `CLAUDE.md`'s hard rule, everything
above is a pure Node/`vm` read of `area.js`, same technique `Plans/room_progress.js`
already uses.

---

## 1. Global design principles (recap only — full detail in `CLAUDE.md`/`expansion.md`)

Don't relitigate these per-room; they're already-decided project-wide rules:

- **Few large, multi-tier rooms, not many small ones** (`expansion.md` §3.15) — a room
  whose entire purpose is "a corridor with one gimmick and a door on each end" should
  almost always be a section inside a bigger neighboring room instead. This is *why*
  several rooms below are already huge (`the_vault_room1` is 8740px wide,
  `chrono_rift_loop1` is 7162px) — that sizing is deliberate, not a mistake to shrink.
- **Cross-region gating + 3-tier reward placement** (`expansion.md` §3.14) — a region's
  deepest reward should require an ability found in a *different* region. Tier 1
  (critical path, can't-miss) / Tier 2 (side room, visible from the main route) / Tier 3
  (real secret, gated behind another region's ability) — don't scatter rewards evenly.
- **Region-specific hazards, not a generic spikes layer** (`expansion.md` §3.17) — a
  hazard that could be dropped into any region unchanged isn't doing enough thematic
  work. See each region section below for its specific hazard note (or the flag that
  one still needs inventing).
- **No lock-and-key gating** — a door is blocked by an *ability* the player's toolkit
  lacks yet, never a found item that only unlocks one door. `expansion.md`'s Warp Gate
  Nexus "3 Keystones" is a known unresolved conflict with this rule — see that region's
  section below.
- **No fall-death by default** — continuous cave floors; `pitDeathY` is an explicit
  opt-in override for rooms that deliberately want a pit hazard, not inferred.
- **Irreversible, consent-gated choices are a deliberate throughline** — new optional
  content should default to a real, warned, permanent cost (see `CLAUDE.md`'s own list:
  Void Tether's child-abandonment choice, the Pacifist Enclave's one-strike-forfeits
  rule, the proposed Hollow Core secret-ending warning) rather than a softer reversible
  version.
- **Reachability is auto-validated** — `validateAreaGraph()` runs on every load and
  console-errors on bad door/col-row data; `debug_v1.html` additionally walks every room
  with a 90-frame teleport-in survival check. Run it after any change touching room
  geometry/doors.

---

## 2. Research notes: what makes Metroidvania room/region design work

Brief, sourced notes — not a tutorial, a set of reminders to check your own room design
against. See the Sources list at the very end of this doc for links.

**Boss Keys' framework (Mark Brown / Game Maker's Toolkit's long-running Metroidvania
analysis series)**: the recurring, teachable patterns across Super Metroid, Symphony of
the Night, Metroid Prime, and Metroid Dread are (a) the "I'll remember that" ledge — a
visible-but-unreachable spot shown *before* the player has the tool for it, which is
exactly `expansion.md` §3.15's "big room lets you see a destination you can't reach yet"
point already adopted here; (b) shortcuts that loop back to earlier hubs once a section
is cleared, turning a line back into a loop; (c) legible 2-mode gating (an ability either
opens a whole new *kind* of space, or it's a minor convenience) — worth checking each of
this game's 8 abilities against, since a Blink/Mirror Step that only ever saves a few
seconds of walking is under-using its slot.

**Hollow Knight's own stated design choices** (the explicit tonal reference this project
already cites): no pass-through platforms *at all* — a deliberate constraint that forces
verticality to be solved with real platforming, not a shortcut layer; and the same "big,
few rooms" philosophy `expansion.md` §3.15 already adopted, independently arrived at as
the *reason* Hollow Knight's map reads as coherent despite its size — fewer loading
transitions means fewer nodes for the player's own mental map to track.

**Region/level "bible" structure** (general game-design-document practice, not
Stillpoint-specific): a good per-region reference separates *theme* (what it's about),
*mechanic* (what's actually different about moving through it), *encounters* (density,
composition, telegraph clarity), and *rewards* (what's here and why) — exactly the shape
each section below uses, so a person picking up this doc mid-project doesn't have to
re-derive it from four other files.

**Layer-thinking from dedicated 2D editors (Tiled/LDtk/Ogmo/GameMaker's Room Editor)**:
none of these tools are in this project's pipeline (`area.js` is hand/script-authored
JS objects, not a Tiled TMX/LDtk JSON export), but their *concept* of a room as several
independent layers is worth borrowing mentally when you design a room by hand:
- A **background/decoration layer** (this project's `REGION_STYLES`/
  `decorateRoomForRegion()` in `game_entities.js` — parallax-ish backdrop art, no
  collision) — decide this per region, not per room, same as those tools' shared-tileset
  convention.
- A **collision/platform layer** (`platforms[]` — floors, walls, ceilings, hazards,
  destructibles, moving platforms).
- An **entity layer** (`enemies[]`, `anchors[]`, `abilityReward`, pip arrays,
  `bossSpawn`) — placed independently of collision geometry, the way Tiled's Object
  Layer or GameMaker's Instance Layer sit on top of a Tile Layer.
- A **metadata layer** (`col`/`row`/`connections[]`/`requires` gates) — this project's
  answer to Ogmo's Grid Layer, driving `map.js`'s auto-generated map rather than a
  hand-drawn one.

Keeping these mentally separate while designing a room (decoration vs. collision vs.
entities vs. topology) is the same discipline those dedicated tools enforce structurally
— this project just enforces it by convention instead of tooling.

---

## 3. Roster references (single source — don't re-copy per region)

### 3.1 Built enemy types (`ENEMY_REGISTRY`, `game/enemy.js` — 19 total, spawnable now)

| Registry key | Role / what it counters |
|---|---|
| `fractured` | Basic melee rusher — windup + slash. The tutorial-tier enemy. |
| `stutterer` | Teleporting decoy. |
| `crystal_sentinel` | Ranged homing attacker, directional shield. |
| `void_lancer` | Telegraphed charging thrust — parry-punishable. |
| `null_sentinel` | *Counters Phase Dash* — alternates phaseable/solid on a visible rhythm. |
| `anchor_wraith` | *Counters Phase Dash* — stasis field cancels a dash mid-motion if triggered inside it. |
| `deflector_drone` | *Counters Shard Shot* — reflects shots off a directional shield. |
| `mirror_sprite` | Translucent, only tangible when faced directly — Mirror Veil's signature enemy. |
| `echo_stalker` | Teleports behind you when you dash. |
| `blitz_guard` | Fast rusher (built beyond the original 26+2 roster — a `roadmap.md` addition). |
| `void_juggernaut` | Charges through destructible walls; stunned on wall impact. |
| `ruin_stalker` | Clings/drops (simplified — no true wall-cling movement type exists yet). |
| `fractured_knight` | Front shield blocks melee/projectiles — flank it. |
| `shard_spitter` | Bouncing arc-shot projectiles. |
| `kinetic_striker` | Dash-through with a damaging spark trail. |
| `timeworn_husk` | Regens HP unless hit recently — burst damage interrupts it. |
| `pulse_warden` | Expanding shockwave rings (flat radius, not a true rising ring yet). |
| `stillpoint_revenant` | Cancels the player's Stillpoint if stood inside its slow bubble. |
| `war_scavenger` | Sovereign postgame roster filler (not in the original 26+2 — added for the Sovereign-side rooms). |

**Not yet built** (still just `expansion.md` prose, no `ENEMY_REGISTRY` entry): 7 more
normal enemies (Temporal Shard, Phase Sentinel, Gravity Well, Rift Crawler, Crystal
Arbiter, Phase Mage, Echoing Spectre, Temporal Parasite, Gravity Scavenger, Polarity
Drone, Warp Mite, Inertial Shieldbearer — §2.1's remaining entries), the 2 Hard enemies
(Null-Gravity Brute, Temporal Paradox), and Absorber Husk / Debris Construct from §2.3's
countering roster. If a region's "planned flavor" below calls for one of these, it isn't
placeable yet — note it as a future swap-in, don't block room design waiting for it.

**Known drift, flag don't silently fix**: the first automated enemy-placement pass
(`roadmap.md` Phase 27) placed 333 enemies using only the 19 *built* types, distributed
by room-width density and a rough region-depth tier — **not** matched 1:1 against
`expansion.md`'s per-region "Enemies Found" column, since several of those named
enemies aren't built yet. So a room's *current* enemy list (ground truth, below) and its
*intended flavor* (from `expansion.md`, also listed below) will often differ — this is
expected drift from that placeholder pass, not a bug. Hand redesign should feel free to
swap toward the intended-flavor list, using currently-built stand-ins where the exact
enemy doesn't exist yet.

### 3.2 Built minibosses (`MINIBOSS_CLASSES`, `game/enemy.js`/`boss.js` — 14 total)

All 14 are real, spawnable, wired into their rooms already — the "minibosses: planned"
framing in older docs is stale for all of these; only their *movesets/arena shaping*
still need hand-design polish per `expansion.md`'s Phase 4 table (see the "Arena note"
there — arena shape is part of each fight's design spec, not a reused generic box).

| Class key | Region | Display name | Moral axis (`lore.md`) |
|---|---|---|---|
| `colossus_core` | Crag of the Colossus | Crag Warden | Evil-by-choice |
| `hollow_guardian` | Mirror Veil | The Mirror King | Evil-by-choice |
| `horizon_core` | Event Horizon | Gravity Collapse Core | No moral agent (accident) |
| `chrono_ally` | Chrono-Space Rift | Temporal Warden | Sympathetic (the opening's ally) |
| `graviton_sentinel` | Graviton Core | Fractured Sovereign's Guard | Sympathetic (the one direct Sovereign exception) |
| `polar_guardian` | The Polar Shift | Electromagnetic Golem (+ its scientist) | Scientist: evil-by-choice |
| `abyss_guardian` | Echoing Abyss | Quantum Pursuer | Evil-by-choice |
| `paradox_engine` | Paradox Engine | The Assembler | Open — not yet placed |
| `warp_guardian` | Warp Gate Nexus | Warden & Hollow | Sympathetic (dutiful, not cruel) |
| `static_guardian` | Static Field | The Conduit | Open — not yet placed |
| `timeline_keeper` | Timeline Crossroads | The Stationmaster *(proposed name)* | Evil-by-choice |
| `void_expanse_boss` | The Void Expanse | The Undertow *(proposed name)* | Open — not on moral axis by design |
| `antechamber_child` | Antechamber (origin spine) | The Child, grown | The player's own companion, lost |
| `abandoned_shell` | Hollow Core (origin spine) | Abandoned Shell | N/A — unconditional fight, no moral framing |

The Inverted Spire and The Observatory intentionally carry **no** miniboss (`regions.md`
confirms this is deliberate, not a gap).

### 3.3 Pip economy — current placed counts vs. targets

| Pip type | Target total | Currently placed in `area.js` | Notes |
|---|---|---|---|
| **Fracture Pips** | 5 (`regions.md`) | 4 — `fp_crs_1` (Chrono-Space Rift Sanctum), `fp_tf_1` (The Forge), `fp_gcr2_1` (Graviton Core Room 2), `fp_sfr2_1` (Static Field Room 2). Missing: the origin spine's original 2 (The Fracture, The Vault — check whether those are implemented as a different mechanism; if not, that's 2 more still needed against a 5-target, i.e. this count may already be off — verify against `player.js`'s `FRACTURE_ABS_MAX` before treating 5 as final). | `player.js`'s `FRACTURE_ABS_MAX` is hardcoded `4` — raising the real total to 5 needs a code change too, not just a 5th pip placement (flagged in `regions.md`, still not done). |
| **Lore Pips** (`mode:'overlay'`/`'cutscene'`) | 15 (`regions.md`/`floor_plan.md`) | 15 placed, all currently `mode:'overlay'` (none use the new `'cutscene'` mode yet, even the ones `lore.md`'s visual-effects table marks "Cutscene" — see per-region tables below for exact ids) | Code support for all 3 modes shipped `roadmap.md` Phase 28 (2026-07-29) — setting `mode:'cutscene'` + `cutsceneId` on the plot-critical ones (`lore_tv1`-equivalent, `lore_ac2`-equivalent, etc. once ported into `area.js`) is now just data entry in `levelEditor.html`, no engine work needed. |
| **Extra/Customization Pips** (`mode:'none'`) | 15 (`regions.md`'s new table, 2026-07-29) | 0 placed | Proposed distribution: 1 per each of the 13 regions + 2 in Crag of the Colossus (already built/live) — see `regions.md`'s "Extra/Customization Pips" table for the per-region breakdown, repeated in each region section below. |
| **Cosmetic upgrades** | 4 proposed (1/cluster) | 6 already placed (`spawn_area_1`, `spawn_area_2`, `crag_entrance`, `echo_bridge_prison`, `chrono_rift_loop1`, `void_expanse_room1`, `one_way_teleport_gate_to_paradox_engine` — 7 actually, count exceeds the 4-target proposal) | `regions.md` calls these "kept rare," proposed at 1/cluster (4 total) — already over that with 7 placed; worth a pass to decide if some should be reclassified/removed, or the "keep rare" target itself should just be revised upward now that they exist. |

---

## 4. Anim editor workflow (`editor/anim_editor.html`)

Full mechanism in `Plans/archive/animation_editor_plan.md` — this is just the checklist for
using it while doing the room-design pass:

1. **Nothing has hand-drawn art yet.** Every entity (player, all 19 enemies, all 14
   minibosses, the Sovereign) draws via live procedural canvas primitives
   (`ctx.arc`/`fillRect`/etc.), not frame images. The player, `ComposedEnemy`, and
   `Boss` are all *bridged* to `animdata.js`'s `Animator` (an authored `ANIM_DEFS` key
   overrides the procedural draw; an unauthored one costs nothing and falls back
   automatically) — so authoring art for any of them is purely additive, no code risk.
2. **The 10 older hand-coded `Enemy` subclasses are NOT bridged** (Stutterer,
   VoidLancer, CrystalSentinel, NullSentinel, AnchorWraith, DeflectorDrone,
   MirrorSprite, EchoStalker, BlitzGuard, and the base `Enemy`/`fractured` class) —
   each already has a working procedural `draw()`, so bridging is real per-class work,
   not automatic. Deprioritized on purpose; revisit per-type only if you actually want
   to draw one.
3. **Key convention** — open `anim_editor.html`, set "Entity mock" W/H to the real
   entity's size, then author under:
   - Player: whatever keys `player.js`'s existing bridge already reads (melee swings,
     Dash, Phase Dash, Wall Slide, Echo, Stillpoint, Shard Shot aim/beam, Gravity Ball).
   - `ComposedEnemy`s (9 of the 19 registry types + all 14 minibosses that use
     `ComposedEnemy`/data-driven phases): `enemy_<def.id>_<state>` where state is
     `idle`/`walk`/`windup_<attackType>`/`attack_<attackType>`/`death`.
   - `Boss` (the Sovereign): `boss_<telegraph.type>` while an attack telegraphs
     (`charge`/`slam`/`barrage`/`triple`/`nova`/`ultimate_charge`) or
     `boss_<state>` otherwise (`idle`/`entering`/`recovering`/`teleporting`/`lunging`).
4. **Recommended drawing order** — match the room-design pass, not alphabetical: draw
   art for enemies already placed in `designed`-state rooms first (see each region's
   room table below for state), since those rooms are closer to actually being played/
   tested. Lowest-hanging fruit by current placement frequency: `fractured`+`stutterer`
   (origin spine, huge count), `crystal_sentinel` (Event Horizon/Observatory),
   `void_juggernaut`+`fractured_knight`+`timeworn_husk`+`stillpoint_revenant`
   (Graviton Core/The Vault/The Rift/The Forge — the same 4-enemy squad reused across
   several origin-spine and Graviton rooms).
5. **Export**: "Save to game" (localStorage override, game reads it live) or "Export
   JSON" (paste-ready into `game/animdata.js`'s real `ANIM_DEFS`) — same non-destructive
   pattern as every other editor in this project.

---

## 5. Per-region sections

Each section: overview table, one-line local tragedy + Hunt-thread (full text in
`lore.md`), the live room table (ground truth), and design notes (hazard/puzzle ideas,
enemy-roster note, extra-pip placement).

### 5.1 Mirror Veil

| | |
|---|---|
| Status | Built region (Phase 9) — mechanical effect (inverted reflection, secret paths only visible in the reflection) still not implemented |
| Cluster / col,row | Time/Mirror-adjacent, sits at col 2-3, row 1-3 (see `area.js` compass data) |
| Miniboss | The Mirror King (`hollow_guardian`) — evil-by-choice, hierarchy-obsessed section chief who duplicates himself |
| Grants | Phase Dash (Mirror Veil Sanctum) |
| Extra pip target | 1 (`regions.md`) |

**Local tragedy**: a mid-tier officer's vanity — duplicated himself for weapons research
and enforced a strict "original vs. copy" hierarchy, not survival necessity. **Hunt
thread**: her search-light, refracted through thousands of mirrors, produced thousands
of false positives — the one region that actively defeated her method rather than going
unchecked.

| Room | Type | Size | Conn. | Enemies (current) | Lore pips | Fracture | Ability |
|---|---|---|---|---|---|---|---|
| `mirror_veil_gate` | room | 1000×3955 | 3 | mirror_sprite×2, echo_stalker, null_sentinel | — | — | — |
| `mirror_veil_reflection` | room | 2102×691 | 2 | mirror_sprite×2, echo_stalker×2, null_sentinel×2 | `lore_mvr1` | — | — |
| `mirror_veil_hollow` | miniboss | 1000×691 | 2 | (miniboss) | — | — | — |
| `mirror_veil_sanctum` | room | 1000×691 | 2 | — | — | — | **Phase Dash** |
| `mirror_corridor` | room | 1000×2019 | 2 | mirror_sprite×2, echo_stalker, null_sentinel | — | — | — |

**Design notes**: `mirror_veil_gate` at 3955px tall is your one genuinely vertical room
here — a natural home for the "secret paths only visible in the reflection" mechanic
once built, since verticality gives room for a real vs. reflected layout to diverge. No
dedicated hazard note in `expansion.md` §3.17 yet — invent one that reinforces "only the
reflection is real" (e.g. a platform that's solid only in the inverted view). Enemy
roster already matches intended flavor well (Mirror Sprite/Echo Stalker/Null Sentinel
are exactly this region's named cast in `expansion.md` §3.2/§3.9/§3.11). 1 extra pip
proposed anywhere in this region, per `regions.md`.

### 5.2 Event Horizon

| | |
|---|---|
| Status | Built region (Phase 9) — mechanical effect (constant leftward gravitational pull) not implemented |
| Miniboss | Gravity Collapse Core (`horizon_core`) — no moral agent, a mine whose containment failed |
| Grants | Nothing (no ability tied to this region) |
| Extra pip target | 1 |

**Local tragedy**: a war-supply gravitic mine, containment failed, still "extracting"
whatever's nearby. **Hunt thread**: her search-probes were pulled into the collapse with
everything else — their beacon lights still fall, forever transmitting "searching," never
"clear."

| Room | Type | Size | Conn. | Enemies (current) | Lore pips | Fracture | Ability |
|---|---|---|---|---|---|---|---|
| `event_horizon_gate` | room | 1000×691 | 2 | crystal_sentinel×2, void_lancer, anchor_wraith | — | — | — |
| `event_horizon_pull` | room | 1383×2572 | 4 | crystal_sentinel×2, void_lancer×2, anchor_wraith | — | — | — |
| `event_horizon_drift` | room | 1000×691 | 2 | crystal_sentinel×2, void_lancer, anchor_wraith | `lore_ehd_1` | — | — |
| `event_horizon_core` | miniboss | 1383×1314 | 2 | (miniboss) | — | — | — |

**Design notes**: `event_horizon_pull` is the tallest room here (2572px) — the obvious
home for the region's "platforming against a steady lateral force" mechanic once the
gravity-pull is built, since a tall room gives the pull more room to matter across a
vertical climb. Hazard note (`expansion.md` §3.17): gravity-relative spikes — harmless on
the current "floor" side, lethal on whichever side just became "down." Enemy roster
currently leans Crystal Sentinel/Void Lancer/Anchor Wraith rather than the
`expansion.md`-named Gravity Scavengers/Gravity Wells (both unbuilt) — expected drift,
swap in the real names once built.

### 5.3 Chrono-Space Rift

| | |
|---|---|
| Status | Built region (Phase 9) — mechanical effect (wrap-around looping room) not implemented |
| Miniboss | Temporal Warden (`chrono_ally`) — sympathetic, the opening cinematic's ally |
| Grants | Stillpoint (Sanctum) |
| Extra pip target | 1 |

**Local tragedy**: the monastic keeper of the player's own stolen Stillpoint, resetting
his own death on a countdown to buy more time. **Hunt thread + second thread**: this is
the one region she'd search personally if she could — the Warden's own time-loop reads
as noise to her perception, the same instability that hides him is what hid the theft.
His repeating death is also a small, mortal rehearsal of the whole game's identity-loop
reveal (see `lore.md` for the full writeup — worth a knowing nod on a second playthrough,
not required to land the first time).

| Room | Type | Size | Conn. | Enemies (current) | Lore pips | Fracture | Ability |
|---|---|---|---|---|---|---|---|
| `chrono_rift_gate` | room | 1853×1189 | 3 | stutterer×3, stillpoint_revenant×3, timeworn_husk×2 | — | — | — |
| `chrono_rift_loop1` | room | 7162×1189 | 4 | stutterer×4, stillpoint_revenant×4, timeworn_husk×4 | — | — | — |
| `chrono_rift_loop2` | room | 1133×5947 | 3 | stutterer×2, stillpoint_revenant×2, timeworn_husk×2 | `lore_crl2_1` | — | — |
| `chrono_rift_echo` | room | 4591×560 | 4 | stutterer×4, stillpoint_revenant×4, timeworn_husk×4 | — | — | — |
| `chrono_rift_sanctum` | miniboss | 1000×987 | 2 | (miniboss) | — | `fp_crs_1` | **Stillpoint** |

**Design notes**: `chrono_rift_loop2` (1133×5947 — the tallest room in the built game)
is your vertical wrap-around candidate; `chrono_rift_loop1` (7162 wide) is the horizontal
one — between the two you already have both axes covered for the "exit one side,
reappear on the other" mechanic. Hazard note (§3.17): hazards that only exist in one
time-state (visible only "Past," lethal only "Present," matching the enemy phase-in/out
gold-tint language already speced for Timeline Crossroads — reuse the same visual
grammar here since both are time regions). `stillpoint_revenant` is thematically perfect
here (a Stillpoint-canceling enemy in the region that grants Stillpoint) — keep it dense.

### 5.4 Graviton Core

| | |
|---|---|
| Status | Shell (Phase 20 scaffold only) — no mechanical effect (gravity-flip levers) built |
| Miniboss | Fractured Sovereign's Guard (`graviton_sentinel`) — sympathetic, the one direct Sovereign-thread exception |
| Grants | Graviton Surge (Room 2) |
| Extra pip target | 1 |
| Side content | Sovereign's Army Reserve branches off Room 3 (horde gauntlet → Limit Breaker Trial) |

**Local tragedy**: an elite soldier, still holding this post, waiting for reinforcements
that stopped coming — loyalty with no one left to be loyal to. **Hunt thread**: needs no
invented evidence — this is the one place her command structure never fully died, the
closest thing to her actual current reach outside the throne room.

| Room | Type | Size | Conn. | Enemies (current) | Lore pips | Fracture | Ability |
|---|---|---|---|---|---|---|---|
| `graviton_core_room1` | room | 2738×1134 | 3 | void_juggernaut×3, fractured_knight×3, deflector_drone×3 | — | — | — |
| `graviton_core_room2` | room | 1826×1134 | 3 | void_juggernaut×3, fractured_knight×3, deflector_drone×2 | — | `fp_gcr2_1` | **Graviton Surge** |
| `graviton_core_room3` | miniboss | 1466×1673 | 4 | (miniboss) | `lore_gc3_1` | — | — |

**Design notes**: still a SHELL region beyond enemy placement — the actual gravity-flip
lever mechanic (`expansion.md` §3.16's lever/switch-chain puzzle idea belongs here
specifically) is the real open work. `graviton_core_room3` is the widest miniboss arena
in the game (1673 tall) — plenty of room for the Guard's "drops rubble by hitting the
ceiling" attack. Enemy roster (Void Juggernaut/Fractured Knight/Deflector Drone) doesn't
yet include the `expansion.md`-named Null-Gravity Brute/Polarity Drone/Gravity Anchor
(none built) — expected drift.

### 5.5 The Polar Shift

| | |
|---|---|
| Status | Built (mechanical push/pull magnetism not implemented) |
| Miniboss | Electromagnetic Golem + its scientist (`polar_guardian`) — scientist evil-by-choice (actively jams outside comms) |
| Grants | Max Health +1 (Room 1) |
| Extra pip target | 1 |

**Local tragedy**: a remote crew solved their own problems (collapses, scavengers) with
a magnetic automaton — but the scientist directing it also actively sabotages outside
communication, which is what makes her a choice, not desperation. **Hunt thread**: the
one region where the evidence is *absence of a search at all* — this crew never drew her
attention.

| Room | Type | Size | Conn. | Enemies (current) | Lore pips | Fracture | Ability |
|---|---|---|---|---|---|---|---|
| `polar_shift_room1` | room | 1936×1909 | 3 | kinetic_striker×4, blitz_guard×3, shard_spitter×3 | — | — | Max Health +1 |
| `polar_shift_room2` | miniboss | 1411×913 | 2 | (miniboss) | `lore_ps2_1` | — | — |

**Design notes**: `polar_shift_room1` (1909 tall) is a good vertical bounce-chamber
candidate for the blue-push/red-pull pinball mechanic. Hazard note (§3.17): walls that
damage on contact only while charged *opposite* polarity to the player's last touch —
turns traversal itself into the hazard. Puzzle idea (§3.16): a room where the *order* of
push/pull walls you bounce through determines which of two exits you land at — routing,
not just crossing. Enemy roster here (Kinetic Striker/Blitz Guard/Shard Spitter) doesn't
match `expansion.md`'s named Polarity Drones/Inertial Shieldbearers/Anchor
Wraith/Deflector Drone yet (2 of those 4 aren't built) — worth at least swapping in
Anchor Wraith and Deflector Drone (both built) for closer flavor match, since
`expansion.md` §2.3 explicitly names this region as one of their two homes.

### 5.6 Timeline Crossroads

| | |
|---|---|
| Status | Built (Past/Present overlapping-time mechanic not implemented) |
| Miniboss | The Stationmaster *(proposed name)* (`timeline_keeper`) — evil-by-choice, one of the scientists who ordered the child's creation |
| Grants | Void Tether (limited, Room 2) — plus Max Health +1 in Puppet Strings Part 2 |
| Extra pip target | 1 |
| Plot weight | **The heaviest single region in the game** — the child-choice beat lives at Echo Bridge just before it, and the Void Tether/prison-break story beat (`story.md` §4) fires here |

**Local tragedy**: unchanged from the base "connective plot" framing — already the most
connected region by virtue of being load-bearing plot, not scenery. See `story.md` §4
for the full Stationmaster/prison-break/Void Tether sequence before touching this
region's rooms — the story beats are more load-bearing here than in any other region.

| Room | Type | Size | Conn. | Enemies (current) | Lore pips | Fracture | Ability |
|---|---|---|---|---|---|---|---|
| `timeline_x_roads_room1` | room | 1000×560 | 5 | stutterer×2, void_lancer, shard_spitter | — | — | — |
| `timeline_x_roads_room2` | miniboss | 3955×2213 | **10** | (miniboss) | `lore_txr2_1` | — | **Void Tether** |
| `timeline_x_roads_room3` | room | 1000×560 | 4 | stutterer×2, void_lancer, shard_spitter | — | — | — |
| `puppet_strings_part1` | room | 1936×830 | 2 | stutterer×2, void_lancer×2, shard_spitter×2 | — | — | — |
| `puppet_strings_part2` | room | 1936×830 | 2 | stutterer×2, void_lancer×2, shard_spitter×2 | — | — | Max Health +1 |

**Design notes**: `timeline_x_roads_room2` has **10 connections** — by far the single
biggest hub node in the entire game (compare The Vault Room 1 and The Rift, both at 6).
Confirms `regions.md`'s own read that hub rooms carry the actual interconnecting load
while miniboss rooms are near-leaves — this is the one miniboss room that's also a hub,
worth deliberately shaping its arena so the Stationmaster fight doesn't feel like it's
happening in a thoroughfare. Hazard note (§3.17): reuse the Present/Past gold-tint visual
language for hazards too, not just enemies. `timeline_x_roads_room2` is also the room
where the Void Tether grant and the game's biggest permanent-choice moment collide —
treat its layout as a stage for that cutscene, not just a fight arena.

### 5.7 The Observatory

| | |
|---|---|
| Status | Built (low-gravity mechanic not implemented) |
| Miniboss | None (deliberate) |
| Grants | Nothing directly, but its capstone room IS Sovereign's Observatory (fast travel unlock) |
| Extra pip target | 1 |

**Local tragedy**: none — a Sovereign watch-post, not a military one; the low gravity
literally is the mechanism that let her perception reach as far as it needed to from a
single fixed point. **Hunt thread**: this region IS the Hunt thread at full strength —
no addition needed, it's her literal vantage point.

| Room | Type | Size | Conn. | Enemies (current) | Lore pips | Fracture | Ability |
|---|---|---|---|---|---|---|---|
| `observatory_room1` | room | 2047×1134 | 3 | crystal_sentinel×2, deflector_drone×2, pulse_warden×2 | — | — | — |
| `observatory_room2` | room | 2185×1134 | 3 | crystal_sentinel×2, deflector_drone×2, pulse_warden×2 | `lore_obs2_1` | — | — |
| `observatory_room3` | room | 1798×1134 | 2 | crystal_sentinel×2, deflector_drone×2, pulse_warden×2 | — | — | — |
| `sovereign_observatory` | room | 2047×1134 | 2 | crystal_sentinel×2, deflector_drone×2, pulse_warden×2 | `lore_so_1` | — | Fast travel unlock (capstone) |

**Design notes**: `regions.md` calls out **2** Lore Pips for this region specifically
(`observatory_room2` + the Sovereign's Observatory capstone itself) — matches the ground
truth above, the only region with 2 rather than 1. Low-gravity floaty-jump mechanic
isn't built yet — this is your best candidate for heavy verticality once it is, since
all 4 rooms here are already tall (1134px) rather than wide. No dedicated hazard note in
§3.17 — worth inventing one keyed to low gravity specifically (e.g. a hazard that only
becomes dangerous during a slow-fall arc).

### 5.8 The Void Expanse

| | |
|---|---|
| Status | Built (no-solid-ground/moving-debris mechanic not implemented) |
| Miniboss | The Undertow *(proposed name)* (`void_expanse_boss`) — deliberately off the moral axis |
| Grants | Completes Void Tether (full range, if already held from Timeline Crossroads) |
| Extra pip target | 1 |

**Local tragedy**: the single most war-damaged site in the shelter, full stop — no
bigger event needed than "this is where the fighting was worst," which is also why every
platform here is debris still frozen mid-collapse. **Hunt thread**: unchanged from the
base framing (self-explanatory, no addition needed).

| Room | Type | Size | Conn. | Enemies (current) | Lore pips | Fracture | Ability |
|---|---|---|---|---|---|---|---|
| `void_expanse_room1` | room | 5753×3043 | 5 | void_juggernaut×4, anchor_wraith×4, null_sentinel×4 | `lore_ve1_1` | — | — |
| `void_expanse_room2` | miniboss | 1000×560 | 3 | (miniboss) | — | — | Completes Void Tether |

**Design notes**: `void_expanse_room1` is the single largest room in the game by area
(5753×3043) — the obvious home for "entirely moving platforms, time your dashes
perfectly" once built, since it needs the most room to actually stage that. Deliberately
has both Anchor Wraith and Null Sentinel (both Phase-Dash counters) — appropriate, since
Phase Dash is the traversal ability this region's mechanic is built around per
`expansion.md` §3.12.

### 5.9 Warp Gate Nexus

| | |
|---|---|
| Status | Shell (teleporter-hub + challenge-vault structure not built) |
| Miniboss | Warden & Hollow (`warp_guardian`) — sympathetic, dutiful gatekeeper pair |
| Grants | Blink (not yet built — `expansion.md` §1B.2) |
| Extra pip target | 1 |
| **Known conflict, unresolved** | `expansion.md` §3.11 specs entry as "open after collecting 3 Keystones" — a literal key mechanic that conflicts with `CLAUDE.md`'s no-lock-and-key rule. Revisit with the user before implementing as written; may need reframing as an ability gate or puzzle-vault-completion gate instead. |

**Local tragedy**: two gatekeepers, built specifically as a pair so neither has a blind
spot — still testing travelers because the all-clear to stand down never arrived.
**Hunt thread**: what they do (test and clear travelers, methodically) is a small,
mundane ancestor of exactly what the Sovereign now does full-time.

| Room | Type | Size | Conn. | Enemies (current) | Lore pips | Fracture | Ability |
|---|---|---|---|---|---|---|---|
| `warp_gate_nexus_room1` | room | 1000×560 | 2 | — | — | — | — |
| `warp_gate_nexus_room2` | miniboss | 1000×560 | 2 | (miniboss) | `lore_wgn2_1` | — | — |

**Design notes**: both rooms are still flat SHELL scaffolds with zero enemies placed —
this region needs the most ground-floor design work of the 13 (the "hub + 3-4 challenge
vaults" structure from `expansion.md` §3.11 doesn't exist as real sub-rooms yet). Resolve
the Keystone-gate conflict *before* building the vaults, since the vault-gating mechanism
is exactly where that conflict would get baked into real content. `warp_guardian`'s dual
nature (Warden counters melee, Hollow counters ranged) means this arena specifically
needs enough space to "alternate tools," not a cramped box — see `expansion.md` §4.9's
design note.

### 5.10 Paradox Engine

| | |
|---|---|
| Status | Built (chase-zone mechanic not implemented) |
| Miniboss | The Assembler (`paradox_engine`) — open, not yet placed on moral axis |
| Grants | Nothing |
| Extra pip target | 1 |

**Local tragedy**: not an abandoned automaton — the creator herself is still here,
maintaining every warp field and portal gate; whether she's trapped by her own
usefulness or just never questioned it is left open on purpose. **Hunt thread**: her own
still-running order queue has an unfinished batch labeled for detection-array
components — if it ever completes, it hands her, unknowingly, exactly the tool she's
missing. A live thread, not resolved.

| Room | Type | Size | Conn. | Enemies (current) | Lore pips | Fracture | Ability |
|---|---|---|---|---|---|---|---|
| `paradox_engine_room1` | room | 1300×1286 | 3 | void_juggernaut×3, timeworn_husk×3, kinetic_striker×3 | — | — | — |
| `paradox_engine_room2` | miniboss | 1300×1286 | 3 | (miniboss) | `lore_pe2_1` | — | — |

**Design notes**: the chase-beam mechanic (a giant machine hunting the player through a
maze) is entirely unbuilt — per §3.17, build it on the shared hazard-object shape rather
than bespoke logic, same instruction as Static Field's arcs. Debris Construct (§2.3 #35,
unbuilt) is written specifically as this region's own scattered-machine-parts enemy —
worth prioritizing if you build one more unbuilt enemy type for this pass.

### 5.11 Static Field

| | |
|---|---|
| Status | Built (electromagnetic-arc/map-corruption mechanic not implemented) |
| Miniboss | The Conduit (`static_guardian`) — open, not yet placed on moral axis |
| Grants | Nothing (guards this region's Fracture Pip instead — Overcharge, this region's real ability grant per `expansion.md` §1B.3, isn't wired to a room yet) |
| Extra pip target | 1 |

**Local tragedy**: a grounding construct built to safely bleed dangerous current into
the earth — the creator (a weapons/electronics scientist) is still here, still working,
whether victim of her own usefulness or not is left open. **Hunt thread**: the map-
overlay corruption doesn't just glitch the player — it scrambled her own tracking data
too, a second region that blinds her by accident.

| Room | Type | Size | Conn. | Enemies (current) | Lore pips | Fracture | Ability |
|---|---|---|---|---|---|---|---|
| `static_field_room1` | room | 1300×1286 | 4 | kinetic_striker×3, anchor_wraith×3, deflector_drone×3 | — | — | — |
| `static_field_room2` | miniboss | 1300×1286 | 3 | (miniboss) | — | `fp_sfr2_1` | — |

**Design notes**: the floor-zaps-you-upward hazard (§3.17) IS this region's hazard — no
separate generic layer needed, build it on the shared hazard shape. Puzzle idea (§3.16):
one room requiring partly-blind navigation via audio cues (enemy windup "pings" already
planned) instead of the corrupted map — turns the glitch from pure visual gimmick into
a real constraint. `expansion.md` §1B.3 places **Overcharge** as this region's ability
grant (thematically: "channel the danger instead of avoiding it") — currently missing
from both rooms' `abilityReward` field; this is the one region among the 13 whose
promised ability grant hasn't been wired to a room at all yet, worth prioritizing.

### 5.12 The Inverted Spire

| | |
|---|---|
| Status | Built (gravity-inverted-permanently mechanic not implemented) |
| Miniboss | None (deliberate) |
| Grants | Nothing |
| Extra pip target | 1 |

**Local tragedy**: a Sovereign relay tower, hit directly, inverted permanently — its
beacon, unlike the tower, never lost power, and is still broadcasting orders into a
command structure that no longer exists. **Hunt thread**: this region's relay beacon
still broadcasting IS the Hunt thread at full strength — no addition needed.

| Room | Type | Size | Conn. | Enemies (current) | Lore pips | Fracture | Ability |
|---|---|---|---|---|---|---|---|
| `inverted_spire` | room | 1383×1314 | 3 | crystal_sentinel×3, pulse_warden×2, deflector_drone×2 | `lore_is_1` | — | — |

**Design notes**: only one room exists for this whole region today (`regions.md`
estimates 4-6 rooms per region as a convention — this is the most under-built of the 13
by that measure, a single room standing in for the whole region). If this region gets a
real build pass, it's the one most in need of *more rooms*, not just mechanical/visual
polish on what's there. Gravity permanently inverted from room entry is the mechanic —
"up" and "down" swapped the instant the tower broke, matching the Event Horizon/Inverted
Spire shared hazard note in §3.17 (gravity-relative spikes).

### 5.13 Echoing Abyss

| | |
|---|---|
| Status | Built (echo-as-platform mechanic not implemented) |
| Miniboss | Quantum Pursuer (`abyss_guardian`) — evil-by-choice, used citizens as soul-fodder |
| Grants | Nothing |
| Extra pip target | 1 |

**Local tragedy**: not a lone griever — a scientist who used the shelter's lower-class
citizens as experimental bait, collecting their souls to fuel her own ascent. **Hunt
thread + second thread**: her search parties who entered here got copied too — several
of the region's echo-copies are unmistakably her own search personnel, still searching,
permanently. This region is also the closest single-region metaphor for the whole game's
identity-loop reveal (a person who didn't want to stop being themselves, copied instead
of ended, recurring forever) — worth a knowing nod post-ending (e.g. a NG+-only visual
difference here), not required to land on a first playthrough.

| Room | Type | Size | Conn. | Enemies (current) | Lore pips | Fracture | Ability |
|---|---|---|---|---|---|---|---|
| `echoing_abyss_room1` | room | 1217×560 | 2 | echo_stalker×2, timeworn_husk, pulse_warden | — | — | — |
| `echoing_abyss_room2` | miniboss | 1217×560 | 1 | (miniboss) | `lore_ea2_1` | — | — |

**Design notes**: also just 2 rooms built (same under-built flag as Inverted Spire).
Puzzle idea (§3.16): require a *specific order* of dash-echo placement to reach a ledge
(an echo needing to exist in two places at once, chaining Phase Dash before the first
expires) — the mechanic doesn't exist in code yet, so this is pure future design intent.
This region also has the game's one-way shortcut back to the early spine
(`echoing_abyss` → `crystal_cavern`, gated on `stillpoint`, already required to reach
here) — `regions.md` proposes reusing the echo-as-platform idea for that shortcut
specifically (leave an echo in Crystal Cavern on the way in, land on it on the way back)
rather than building a new connective room.

### 5.14 Crag of the Colossus (side-branch, not one of the 13)

| | |
|---|---|
| Status | Most fully built/live side content in the game — `crag_entrance` got a full room-geometry redesign pass (`roadmap.md` Phase 27) |
| Miniboss | Crag Warden (`colossus_core`) — evil-by-choice, self-augmented for total control |
| Grants | Charged Attack (Crag Altar) — **intended mandatory**, enforcement (a wall-gate) still unbuilt |
| Extra pip target | **2** (not 1 — see `regions.md`'s reasoning: already built/live, unlike most of the 13, so it's where the customization economy is actually reachable today) |
| Existing lore | 3 built `loreFragments` (`lore_ce1`/`crag_entrance`, `lore_cb1`/`crag_breach`, `lore_ca1`/`crag_altar`) — separate from the 15-Lore-Pip count, per `regions.md` |

**Local tragedy**: ruthless, merciless head of the crag's mining operation, fused
himself with the crag's own crystal-heart tech for total control — it worked too well.
Deliberately disconnected from the Sovereign's own thread (no Hunt-thread entry).

| Room | Type | Size | Conn. | Enemies (current) | Cosmetic | Heal | Ability |
|---|---|---|---|---|---|---|---|
| `crag_entrance` | room | 4280×2530 | 2 | fractured, blitz_guard×2, ruin_stalker | 1 | — | — |
| `crag_breach` | room | 1000×1383 | 2 | fractured, blitz_guard | — | — | — |
| `crag_altar` | room | 1051×1383 | 2 | fractured, blitz_guard | — | 1 | Charged Attack |
| `crag_warden` | miniboss | 1051×560 | 3 | (miniboss) | — | — | — |

**Design notes**: `crag_entrance`'s redesign (1286→4280 wide, 793→2530 tall — the jump-
crossable floor rift + raised cave ledge, `roadmap.md` Phase 27) is the reference sample
for what a "physically bigger, more cavelike" room redesign should look like elsewhere —
worth reading that room's actual `platforms[]` array before redesigning any other
regions's rooms in the same direction. `crag_breach`/`crag_altar` await the same
direction's approval before following through (per that same roadmap entry) — check with
the user before resizing them, since their doors/anchors/enemies all have to move
together (a real coupling cost, not just a bigger canvas).

### 5.15 Origin spine (not one of the 13 — the main critical-path line)

Not "a region" in the cluster sense, but the largest single cluster of rooms in the
game (19 rooms) and where the game's actual plot beats concentrate. No single overview
table fits it the way a themed region does — see `story.md` directly for the plot
content (Echo Bridge's companion-meeting cutscene, Crystal Cavern's Shard Shot grant,
The Vault's hub role, the Antechamber/Hollow Core endgame pair).

| Room | Type | Size | Conn. | Enemies (current) | Lore pips | Ability | Notes |
|---|---|---|---|---|---|---|---|
| `spawn_area_1` | room | 1000×560 | 1 | — | — | — | 1 cosmetic |
| `tutorial_area` | room | 1577×830 | 2 | — | — | — | SHELL — the game's very first room |
| `the_fracture_part1` | room | 1000×996 | 4 | fractured, stutterer | — | — | |
| `the_fracture_part2` | room | 2462×560 | 3 | fractured×3, stutterer×2 | — | — | |
| `the_fracture_part3` | room | 1000×560 | 3 | fractured, stutterer | — | — | |
| `the_fracture_part4` | room | 1000×2821 | 2 | fractured, stutterer | — | — | |
| `echo_bridge_part1` | room | 8547×560 | 6 | fractured×6, stutterer×6 | — | Max Health +1 | Meet-the-child cutscene fires here |
| `echo_bridge_prison` | room | 1715×682 | 3 | fractured_knight×3, stutterer×2 | — | Parry | 1 cosmetic |
| `upper_ruins` | room | 1023×1023 | 2 | fractured, stutterer | — | — | Branches to Pacifist Region |
| `pacifist_region` | room | 1000×560 | 1 | — | `lore_pr1` | — | SHELL — irreversible fight-forfeits-reward rule applies |
| `crystal_cavern` | room | 1798×1134 | 4 | fractured×2, crystal_sentinel×2, stutterer×2 | — | Shard Shot | |
| `the_forge` | room | 2047×1134 | 4 | fractured_knight×2, void_juggernaut×2, timeworn_husk×2, stillpoint_revenant×2 | — | — | `fp_tf_1` |
| `the_vault_room1` | room | 8740×1134 | 6 | ×3 each of 4 types | — | — | Widest room in the game, 6-way hub |
| `the_vault_room2` | room | 1839×560 | 3 | ×2-3 each of 4 types | `lore_tv2_1` | — | |
| `the_rift` | room | 4315×940 | 6 | ×3 each of 4 types | `lore_tr_1` | — | 6-way hub, matches The Vault Room 1 |
| `antechamber` | miniboss | 2462×1632 | 3 | (miniboss: `antechamber_child`) | — | — | SHELL — the Absorb/Spare choice cutscene fires here |
| `hollow_core` | miniboss | 1162×581 | 1 | (miniboss: `abandoned_shell`) | `lore_hc_1` | — | SHELL — unconditional fight, every playthrough |
| `spawn_area_2` | room | 1000×560 | 2 | — | — | — | 1 cosmetic, SHELL |
| `tutorial_final` | boss | 1577×830 | 1 | — | — | — | SHELL — the Sovereign fight itself |

**Design notes**: `the_vault_room1` (8740 wide) and `echo_bridge_part1` (8547 wide) are
the two widest rooms in the entire game — both origin-spine hubs, consistent with
`regions.md`'s observation that hub rooms (not miniboss rooms) carry the real
interconnecting load. `antechamber`, `hollow_core`, `tutorial_final`, `tutorial_area`,
`pacifist_region`, and both `spawn_area` rooms are still SHELL despite being on the
critical path or carrying major plot beats — these are the highest-priority rooms in the
whole game to hand-design next, since they're where the actual ending cutscenes/fights
live, not optional content.

### 5.16 Sovereign postgame + misc rooms (`sovereign` region + `teleport` corridors)

Per `story.md` §9, these are real planned postgame content (not reserved-but-uncommitted
slots), still needing room-by-room design beyond the 5-step arc description in that
section. **Open tension, flagged not resolved** (`story.md` §9): the confirmed framing
("go through the game again, harder boss fights") reads more like a harder-difficulty
pass across the *same* 13 regions than bespoke new rooms — resolve this before building
`sovereign_room4`/`try_out_region` any further, since building them as brand-new
geometry vs. reusing the 13 regions' existing rooms are very different amounts of work.

| Room | Type | Size | Conn. | Enemies (current) | Notes |
|---|---|---|---|---|---|
| `sovereign_room1`/`2`/`3` | room | ~1000-1100 wide | 1 each | war_scavenger/fractured_knight/stillpoint_revenant, ×3-4 each | designed-state already, per `room_progress.js` |
| `sovereign_room4` | room | 7162×1189 | 1 | — | SHELL — empty despite being sized like a real hub |
| `sovereign_army_reserve` | room | 6998×733 | 2 | war_scavenger×8, blitz_guard×5, kinetic_striker×3 | The horde gauntlet, off Graviton Core Room 3 |
| `try_out_region` | room | 1079×733 | 1 | — | SHELL — grants Level 4 Limit Break, dead-ends the Reserve |

The 3 `teleport` rooms (`one_way_teleport_gate_to_paradox_engine`,
`one_way_warp_gate_to_inverted_spire`, `teleport_from_paradox_engine_to_upper_ruins_1`)
are pure connective corridors, all SHELL, low design priority — they exist only to carry
a one-way transition and don't need enemies/pips/plot content of their own.

---

## 6. Workflow checklist — designing one room start to finish

1. **Open this doc's region section** for context (theme, mechanic, hazard/puzzle
   ideas, plot weight) alongside `floor_plan.md` (what connects where) and
   `levelEditor.html` (the actual room).
2. **Check `node Plans/room_progress.js --full`** for this room's current state
   (SHELL/started/designed) and which specific signals are missing (platforms beyond
   the floor, enemies, a real vertical shaft, moved pips/anchors).
3. **Geometry first**: build the room big (per §1's "few large rooms" rule) — decide
   sub-areas (entry/branch/converge) before placing anything else.
4. **Enemies**: pull from this region's roster note above; prefer built types that
   match the intended flavor, don't wait on unbuilt roster entries.
5. **Pips**: place this region's target Lore Pip(s) (mode `overlay` by default, or
   `cutscene` if it's plot-critical — see `lore.md`'s per-fragment mode column) and its
   1-2 Extra/Customization Pips (`mode:'none'`) per this doc's per-region target.
6. **Hazards/puzzles**: use this region's dedicated hazard note if one exists; if not,
   invent one that reinforces the region's specific mechanic, per §3.17's rule of thumb
   — never a generic spikes-and-sawblades layer.
7. **Validate**: `validateAreaGraph()` runs automatically on load (check console);
   `debug_v1.html`'s R09-R11 checks and the in-editor "Validate This Room"/"Check All
   Rooms" linter are the other two passes to run before calling a room done.
8. **Art (optional, separate pass)**: once a room is `designed`-state and its enemies
   are locked in, open `anim_editor.html` per §4 above to author real frames for
   whichever enemies live there.
9. **Update `roadmap.md`** with what changed, same style as existing entries — this
   doc doesn't replace that changelog.

---

## Sources (design-research citations for §2)

- [How the Hollow Knight devs mapped out their 'Metroidvania'](https://www.gamedeveloper.com/design/how-the-i-hollow-knight-i-devs-mapped-out-their-metroidvania-)
- [How to design a great Metroidvania map — PC Gamer](https://www.pcgamer.com/how-to-design-a-great-metroidvania-map/)
- [Game Maker's Toolkit — Wikipedia (Boss Keys series background)](https://en.wikipedia.org/wiki/Game_Maker's_Toolkit)
- [LDtk vs Tiled: Compared](https://www.softwr.com/compare/ldtk-level-editor-vs-tiled-map-editor)
- [Tiled — Working with Objects (official docs)](https://doc.mapeditor.org/en/stable/manual/objects/)
- [Tiled — Custom Properties (official docs)](https://doc.mapeditor.org/en/stable/manual/custom-properties/)
- [Using The GameMaker Room Editor](https://gamemaker.io/en/help/articles/using-the-gamemaker-room-editor)
- [GameMaker — Layer Types And Properties](https://manual.gamemaker.io/lts/en/The_Asset_Editors/Room_Properties/Layer_Properties.htm)
- [How to Write a Game Design Document (Examples and Template)](https://www.gameindustrycareerguide.com/how-to-write-a-game-design-document/)
