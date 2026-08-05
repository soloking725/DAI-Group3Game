> **ARCHIVED 2026-08-03**: moved out of `Plans/` during a doc consolidation
> pass. Superseded by `CLAUDE.md` (auto-loaded, authoritative "read this
> first" doc since 2026-08-02) and `Plans/roadmap.md` (the live changelog).
> This doc's own changelog was frozen at v0.0.14/2026-07-21 and its "File
> map" section had drifted stale (still describes the pre-split single
> `game.js`, references `enemy_designer.html`/`debug_new.html` as live
> tools — both since removed). Its one genuinely unique piece of content,
> the "Basic plot / mandatory story sequence" summary, was folded into
> `CLAUDE.md` before this archive. Kept here for historical context only —
> do not treat anything below as current.

# Stillpoint — Overview

Read this first, then give instructions. This doc is a map + a changelog,
not a design doc — for design/status detail follow the pointers below into
`CLAUDE.md`/`roadmap.md`/`expansion.md`.

## The game, in one paragraph

**Stillpoint** is a 2D Metroidvania action-platformer (vanilla HTML5
Canvas + JS, no build step). Core mechanic: **Stillpoint**, a time-slow
ability fueled by a "Fracture" resource, layered on tight platformer
movement (dash, wall jump, phase dash) and directional melee combat. The
Sovereign has fused every other Stillpoint into herself and rules a
13-region "spacetime" world; the player explores, gains abilities, fights
her minibosses, and moves toward a final confrontation. Visual style:
minimalist vector art, dark background, violet/teal/deep-blue palette
(Hollow Knight / Celeste / Hyper Light Drifter as tonal references).

## Basic plot / mandatory story sequence (planned, per `floor_plan.md`)

Not all of this is built yet (see `story.md`/`lore.md` for the full
narrative doc, `roadmap.md` for what's actually live) — this is the
mandatory backbone the floor plan's graph encodes:

1. Player reaches **Echo Bridge** and **meets the Child** (mandatory,
   +1 max health).
2. Meeting the Child triggers an **arrest** — the player is taken to
   **Echo Bridge, Prison**.
3. Escaping the prison drops the player at **Timeline X Roads, Room 2**,
   where they make the **Child choice**: keep the Child (permanent, no
   Void Tether) or give the Child up (grants **Void Tether**, more
   routes open up, but permanent the other way too — see `CLAUDE.md`'s
   "irreversible, consent-gated choices" throughline). Either branch
   sets the `child_choice_resolved` flag.
4. Until that choice is resolved, **Timeline X Roads Room 1** and
   **Mirror Corridor** are both locked — and since **Crystal Cavern**
   (the Shard Shot pickup) has no other route in during this window
   either, the practical effect is the player can't reach any of the
   three until the choice is made. This is intentional pacing, not a
   softlock: Shard Shot is not a mandatory ability (only **Phase Dash**
   and **Stillpoint** are — see `archive/floor_plan_open_issues.md`/
   `analyze_floor_plan.js`'s mandatory-room analysis), so gating it here
   costs nothing and forces the choice to happen early.

## File map

**Reorganized 2026-07-16** (user request): the repo root used to be flat.
Only `index.html` stays at the root now — the 9 runtime scripts moved into
`game/`, every dev/debug HTML tool (+ `export_graph.js`) moved into
`editor/`. See `CLAUDE.md`'s "File locations" section for the full detail
(path rewrites, the `debug_v1.html`/`debug_new.html` srcdoc gotcha, etc.).

**Game runtime** (`game/`, load order matters — see `index.html`; the six
files marked NEW landed 2026-07-16, roadmap Phase 17):
- `audio.js` — procedural Web Audio SFX, no audio files
- `input.js` — keyboard state (`keys{}`/`justPressed{}`), remappable bindings
- `physics.js` — NEW: shared entity collision resolver + spawn safety (`nudgeOutOfPlatforms`)
- `animdata.js` — NEW: `ANIM_DEFS` frame/hitbox timelines + `Animator` (edited by `anim_editor.html`; game not yet migrated onto it)
- `area.js` — all room data (`AREAS{}`), the compass-graph door topology, `validateAreaGraph()`
- `map.js` — map overlay, generated from `area.js`'s graph
- `ability.js` — Phase Dash / Shard Shot / Echo class / `abilityState`
- `cutscene.js` — NEW: data-driven cutscenes (`CUTSCENES{}`, `playCutscene()`, `storyFlags{}`)
- `combo.js` — NEW: combo chains as data (`COMBO_DEFS` + action-event tracker + rewards)
- `healing.js` — NEW: vitality motes, max-health shards (`playerMaxHealth()`), strike-open healing crystals
- `boss.js` — the final boss (3-phase state machine)
- `enemy.js` — all enemy classes (now with notice-delay/decision-commit/facing-cone AI + opt-in block/dodge/breakout/feint defense verbs), including the composable `ComposedEnemy` system
- `companion.js` — NEW: the Child (Neva-style follower; hide-&-heal → tether-assist)
- `attackVFX.js` — NEW (2026-07-19): shared player VFX/hitbox math, reused by the animation editor's "Dissect from current game" tool and `animdata.js`'s procedural poses
- `player.js` — player class: movement, combat, physics constants
- `game.js` — main loop, game state machine, HUD (`HUD_LAYOUT`), save/load, everything else
- `style.css` — currently unused (`index.html`'s CSS is inline)

**Dev/debug tools** (`editor/`, all standalone HTML, open directly in a browser):
- `debug_v1.html` / `debug_new.html` — headless-ish automated test console (room walker, timing, input replay)
- `levelEditor.html` — visual room editor, edits the real `AREAS` object
- `enemy_test.html` — spawn any enemy/miniboss in an isolated arena to test it
- `enemy_editor.html` — tune an existing enemy's numeric stats/loadout (now including speed), hands off to `enemy_test.html`
- `enemy_designer.html` — build new enemies from composable attack/counter/on-death modules (new, see `Plans/enemy_system_plan.md`; defs may now include a `defense` block — block/dodge/breakout/dashPunish)
- `anim_editor.html` — NEW (2026-07-16): animation/hitbox timeline editor over `game/animdata.js`'s `ANIM_DEFS` (frame durations, drag-resize hit/hurtboxes, per-frame image upload, combo-cancel windows, localStorage save + JSON export)
- `combo_editor.html` — NEW: visual combo-chain editor over `game/combo.js`'s `COMBO_DEFS` (action steps, timing windows, rewards)
- `hud_editor.html` — NEW: drag/toggle HUD elements (writes `HUD_LAYOUT` overrides; game.js's table is authoritative — keep the editor's DEFAULTS copy in sync)
- `companion_test.html` — NEW: boots the real game into the test arena with the Child active (mode override, wave spawner, tuning sliders, catch-up fuzzer)
- `graph_analyzer.html` / `export_graph.js` — world graph → yEd GraphML export/analysis
- `world_map.graphml` (repo root — an export artifact, not a tool) — the exported graph, for viewing in yEd
- `Plans/analyze_floor_plan.js` — Node CLI over `floor_plan.md`'s graph: reachability, critical/speedrun path, mandatory rooms, soft-lock scan, route count, random-playthrough simulation (`--simulate`, `--html` → `floor_plan_report.html`/`floor_plan_simulation.html`)
- `Plans/room_difficulty_calculator.js` — same graph/engine, but you pick any room and it batch-simulates reaching it (rolling the Child-choice per run) to report the average loadout (abilities/pips/health) a player has on arrival, plus a rough difficulty-tier suggestion (`--html` → `room_difficulty_calculator.html`)

**Planning docs** (`Plans/`) — read in this rough order of authority:
1. `CLAUDE.md` — standing rules for whoever (human or Claude) works in this repo; the fullest single reference
2. `performanceInstructions.md` — engineering discipline rules
3. `roadmap.md` — the real changelog: what's actually built, phase by phase, with bugs/decisions
4. `expansion.md` — forward-looking design (new abilities, 26+2 enemies, 13 regions, minibosses) — aspirational, cross-check against `roadmap.md`/`area.js`
5. `regions.md` — world layout reference: which regions exist, cluster position, room counts, miniboss, special effect
6. `floor_plan.md` (+ `floor_plan_mermaid.txt`, `floor_plan.svg`, `floor_plan_report.html`, `floor_plan_simulation.html`) — the full room-to-room connection graph and an automated reachability/simulation tool (`analyze_floor_plan.js`) over it
7. `archive/floor_plan_open_issues.md` — archived 2026-07-21, superseded by `floor_plan.md`'s own correction log
8. `story.md` — narrative/companion-character system (companion is now built — see `archive/child_companion_system_plan.md`; endings/Fracture Pip economy still unbuilt)
9. `lore.md` — narrative/character writing (Sovereign, minibosses) — current source of truth for characterization, not yet ported into in-game text
10. `BUG_ANALYSIS_AND_QA_PLAN.md` — known bug inventory + playtest protocol (not fully re-verified since 2026-07-11/12, see its own staleness note)
11. `enemy_system_plan.md` — the composable enemy-module system (`ComposedEnemy`); see also `enemy_attack_vocabulary_plan.md` for the newer attack-verb layer
12. 2026-07-16 planning set — **all built as of Phase 19, 2026-07-16** (see `roadmap.md`), all now archived under `Plans/archive/` (2026-08-03 — done and no longer live design docs, kept for original rationale only):
    `archive/child_companion_system_plan.md` (Neva-style following Child — locomotion,
    hide-&-heal shipped, learns-to-fight progression still open, `companion_test.html` arena tool),
    `archive/combat_ai_overhaul_plan.md` (Void Tether fix + facing auto-aim,
    enemy notice-delay/decision-cooldown/facing-cone, block/dodge/breakout/
    mix-up/reactivity modules, shared collision resolver + spawn safety — all shipped),
    `archive/healing_items_plan.md` (no potions — vitality motes, Child heal, placed
    restores, max-health shards — all shipped), `archive/animation_editor_plan.md` (timeline/hitbox
    editor + `ANIM_DEFS` data model shipped; player/enemy/boss bridges + raster frames added 2026-07-20)
13. Other narrower docs as needed: `cave_design_plan.md`, `movement_feel_plan.md`, `archive/level_editor_guide.md` (archived 2026-07-21, superseded by roadmap.md's "WHAT'S ACTUALLY NEXT"), `room_verification_tool_plan.md`, `enemy_attack_vocabulary_plan.md`, `engineering_todo.md` (added 2026-08-01, the current live engineering punch list — read this instead of hunting through individual plan docs for "what's still open")
14. More archived, done-or-superseded docs (`Plans/archive/`, moved 2026-08-03 — not maintained further, historical rationale only): `inventory_redesign.md` (multi-page inventory, implemented 2026-08-01), `cutscene_editor_plan.md` (v1 built 2026-07-30, `editor/cutscene_editor.html`), `room_scene_editor_plan.md` (v1+v2 built 2026-07-29/08-01, `editor/room_scene_editor.html`), `project_progress_dashboard_plan.md` (v1 built 2026-07-29, folded into `dev_hub.html`; v2 per-room drill-down still open, tracked in `engineering_todo.md`), `continue_boss_buildout_prompt.md` (a one-time session-resume prompt from the miniboss buildout push, superseded by the ~14 minibosses now built), `session_priorities.md` (an old, 2026-07-12 session docket — 5 of 8 items done, its remaining useful item folded into `engineering_todo.md` §3)

## Where we are

- **v0.0.1** — 2026-07-15 — Removed The Rift's planned Charged Attack and
  Graviton Surge entry requirements (doc/simulation-only; the built room
  never enforced them in code) from `floor_plan.md`, `floor_plan_mermaid.txt`,
  the regenerated `floor_plan_report.html`/`floor_plan_simulation.html`,
  and flagged the now-stale "Rift requires Charged Attack" argument in
  `regions.md` as needing revisiting. Created this overview doc.
- **v0.0.2** — 2026-07-15 — Confirmed via `analyze_floor_plan.js` that
  only Phase Dash + Stillpoint are truly mandatory to beat the game (the
  ~20% "fail" rate in `floor_plan_simulation.html` is unrelated to the
  Rift change — it's the random walker genuinely getting stuck in
  bottleneck rooms deep in the run, not a stale simulation); decided The
  Rift becomes a difficulty check instead of gaining more ability
  requirements (noted in `floor_plan_open_issues.md`); added a design
  note to `roadmap.md` that the Sovereign should always be stronger than
  the player and echo the player's own kit ("the game is a loop"); built
  `Plans/room_difficulty_calculator.js`/`.html`, a pick-a-room simulator
  that reports average player loadout on arrival (abilities, pips,
  health) with a rough difficulty-tier suggestion, including a real
  keep-the-Child-vs-Void-Tether coin flip per run.
- **v0.0.3** — 2026-07-15 — Fixed `room_difficulty_calculator.js`'s
  random-walk engine, which was missing the base engine's anti-loop
  "stuck bouncing → search history for an escape" logic (Final Boss reach
  rate was 42% vs. the base engine's ~80%+; now 66% after porting it
  verbatim). Added an "endgame rush" override to all three copies of the
  walker (server, `floor_plan_simulation.html`'s embedded engine, and the
  difficulty calculator): once a run revisits the Antechamber with Phase
  Dash already held, it heads for the Final Boss instead of continuing to
  wander. Found and fixed a real graph gap: the "you can't reach Mirror
  Corridor until Timeline X Roads Room 2" rule was only prose on the Echo
  Bridge Prison node, never an enforced requirement — added `entry
  requires child_choice_resolved` to Mirror Corridor in `floor_plan.md`/
  `floor_plan_mermaid.txt` to actually gate it (reachability still 79/79,
  no new soft-locks). Added min/max ranges and a per-room ability/flag
  gate-check panel to the difficulty calculator.
- **v0.0.4** — 2026-07-15 — Fixed a real bug in
  `room_difficulty_calculator.js`: the "reached before the choice" /
  "kept the Child" / "gave up the Child" result columns were mutually
  exclusive (if any before-choice runs existed, the keep/give columns
  were hidden entirely, even when runs existed in those branches too) —
  now all three show side by side whenever they have data. Added a "walk
  style" toggle (Thorough explorer vs. Direct — only backtracks when
  actually stuck) to both `room_difficulty_calculator.html` and
  `floor_plan_simulation.html` (plus a `--direct` CLI flag on
  `analyze_floor_plan.js --simulate`); Direct mode's Final Boss fail rate
  is ~1% vs. Explorer's ~18%, as expected for a beeline player vs. a
  completionist wanderer. (Initially and incorrectly said Crystal Cavern
  didn't need the same fix as Mirror Corridor — corrected in v0.0.5.)
- **v0.0.5** — 2026-07-15 — Corrected v0.0.4: Crystal Cavern also needed
  `entry requires child_choice_resolved` — the intended sequence is
  meet-the-Child → arrested → Echo Bridge Prison → escape locks Timeline
  X Roads Room 1 *and* Mirror Corridor until Room 2's choice, and since
  Crystal Cavern has no other route in during that window either, it was
  effectively supposed to be locked too (it just wasn't, since it has its
  own direct edge from Echo Bridge that the original prose-only note
  never covered). Fixed in `floor_plan.md`/`floor_plan_mermaid.txt`;
  reachability still 79/79, mandatory-ability list unchanged (Shard Shot
  was never mandatory, so this costs nothing). Added the "Basic plot"
  section above to this doc. Fixed a real Phase Dash bug in `game.js`:
  the composable-enemy-system session left `separateFromEnemy()` (physical
  push-apart) running unconditionally during Phase Dash, fighting the
  dash's velocity and preventing pass-through — Phase Dash was invincible
  but not physically able to cross an enemy. Also added the missing
  `!player.phaseDashing` gate to the enemy-attack-hitbox-vs-player check
  (every other player-damage check had it; this one didn't). See roadmap
  Phase 15. Not yet browser-verified (see `CLAUDE.md`'s hard rule) —
  needs a human playtest.
- **v0.0.6** — 2026-07-15 — Fixed the sim completion drop from v0.0.5's
  Crystal Cavern gate: `Timeline X Roads, Room 2` is the sole gateway
  into a large unexplored cluster (Graviton Core, Observatory, Puppet
  Strings, and now Crystal Cavern's branch too), and the walker's
  curiosity formula gave the exact same "leads somewhere new" bonus on
  every single revisit forever, with no decay — so it looped back
  through Room 2 20-40+ times per run instead of treating repeat
  thoroughfare traffic as routine, burning the step budget. Added
  diminishing returns (divide curiosity by visit count, capped at 5) to
  all three engine copies (server, `floor_plan_simulation.html`'s
  embedded engine, `room_difficulty_calculator.js`). Explore-mode fail
  rate dropped from ~21% back to ~2%, Direct-mode from ~6.7% to 0%
  (150-run samples, same seed before/after).
- **v0.0.7** — 2026-07-15 — Found and closed a real softlock in the graph
  itself (not a simulator artifact — the engine's own dead-end handler
  flags this exact shape as "a real design bug"): The Rift had 5
  entrances, but only 1 (from Timeline X Roads Room 2) required Phase
  Dash — the other 4 (via The Vault, Static Field) didn't, so a player
  could reach `The Forge → The Vault Room 1 → The Rift → Antechamber`
  with only Stillpoint. Hollow Core off the Antechamber is a dead end and
  the only other exit (to the Final Boss push) requires Phase Dash, with
  no edge back to The Rift — a real permanent stuck state. Fixed by
  making Phase Dash a node-level entry requirement on The Rift itself
  (`floor_plan.md`/`floor_plan_mermaid.txt`), not just one incoming edge
  — costs nothing since Phase Dash was already mandatory. 79/79
  reachable, mandatory list unchanged, 300-run sample post-fix: 0.3% fail
  rate, zero dead-ends at the Antechamber/Hollow Core.
- **v0.0.8** — 2026-07-15 — Fixed a real parser bug in
  `analyze_floor_plan.js` that explained two user-reported oddities at
  once: `Sovereign Army Reserve`'s label text `"locked by 4 Fracture
  Pips and 10 Lore Pips"` was matched by the same regex used for reward
  pickups (`/(\d+)\s*fracture pip/`), so it was silently misread as a
  grant of 4 bogus Fracture Pips, and the code returned before ever
  parsing the "10 Lore Pips" half — the room ended up with zero real
  requirement enforced. Total collectible Fracture Pips in the graph is
  now correctly 4 (was reporting 8), and Sovereign Army Reserve now
  properly requires ≥4 Fracture Pips + ≥10 Lore Pips to enter — added
  real `requiresFracturePips`/`requiresLorePips` node fields, parsing,
  and enforcement (checked against each run's own running pip totals,
  which were already only tallied once per room on first visit — that
  part was never actually broken) to all three engine copies. Also gated
  all 4 "(post-game)" Sovereign Rooms behind a `postgame_unlocked` flag
  that nothing in the graph ever grants, so they're correctly excluded
  from every pre-victory simulation (0/300 reached in testing, reachable
  room count now 75/79 — the 4 unreached are exactly those rooms).
  Verified via the difficulty calculator: Fracture Pips range 4–4, Lore
  Pips never below 10 among runs that reached Sovereign Army Reserve.
- **v0.0.9** — 2026-07-15 — Added 1 Lore Pip to Crag Warden everywhere:
  a real `loreFragments` pickup in `area.js` (continues the crag_entrance/
  crag_breach/crag_altar sequence — a post-fight reflection on the
  Colossus Core), and `(1 lore pip)` on Crag Warden's node label in
  `floor_plan.md`/`floor_plan_mermaid.txt`. Total Lore Pips 16 → 17,
  confirmed via `analyze_floor_plan.js`; reachability/Final Boss access
  unaffected.
- **v0.0.10** — 2026-07-15 — The deterministic critical-path report
  (`floor_plan_report.html`) was skipping Echo Bridge Prison entirely —
  Timeline X Roads Room 1 had a direct, equally-short edge straight to
  Room 2, so the shortest-path search just took that instead of routing
  through the mandatory arrest sequence. Fixed per the user's preferred
  approach (teleport, not edge removal): added a one-way
  `Echo Bridge, part 1 → Echo Bridge, Prison` edge modeling "meeting the
  Child immediately teleports you to Prison" to `floor_plan.md`/
  `floor_plan_mermaid.txt` — the Room 1 → Room 2 shortcut edge is
  untouched. Critical path A now correctly goes Echo Bridge → Prison →
  Room 2. Reachability still 75/79, mandatory-room list unchanged,
  150-run sample: 1.3% fail rate.

- **v0.0.11** — 2026-07-16 — Built the full ability-leveling system from
  `Plans/Enemy_Design.pdf`: all 6 abilities now scale Lv0-3 (2/3/4 lore pips
  per level) plus a shared Lv4 Limit Break Enhanced State (flat blue aura,
  6s, zero knockback/hazard immunity); Graviton Surge and Void Tether built
  from scratch (previously unbuilt). `enemy_test.html` gained a per-ability
  checkbox+level panel plus Fracture/Lore Pip inputs that write directly
  into the real game state, live-applying without a respawn. Also applied
  the Rift lore-pip fix everywhere (17 -> 18 total) and placed Memory
  Resonance at The Vault's exit anchor. See `roadmap.md` Phase 16 for full
  detail, including several flagged follow-ups (Lv4 activation inputs for
  5 of 6 abilities, the 3 combo inputs, a pre-existing Shard Shot cooldown
  bug) — not yet browser-verified per `CLAUDE.md`'s hard rule.

- **v0.0.12** — 2026-07-16 — Planning-only session (no code changes): wrote
  the four-doc planning set listed in the file map above (Child companion,
  combat/AI overhaul, healing/items, animation editor). Two real findings
  from the code survey worth recording: (1) **Void Tether's "button does
  nothing" root cause** — `abilityState.hasVoidTether` is never granted
  anywhere in the real game (only reset to `false` + save/load round-trip);
  the ability logic itself is built. (2) A whiffed tether cast burns its
  full 90f cooldown before target existence is checked, with zero feedback
  (`player.js:452` vs `game.js:2340`). Both fixes are spec'd in
  `combat_ai_overhaul_plan.md` §A. Unity/engine-switch consideration
  explicitly dropped per user decision — staying vanilla canvas.

- **v0.0.13** — 2026-07-16 — Built everything the v0.0.12 planning set
  described (user: "make the editors, fix enemy ai, … everything we just
  planned"): 6 new runtime scripts (`physics.js` shared collision +
  spawn safety, `animdata.js`, `cutscene.js`, `combo.js`, `healing.js`,
  `companion.js`), 4 new editors (`anim_editor`, `combo_editor`,
  `hud_editor`, `companion_test`), enemy AI overhaul (notice delay,
  decision commit, facing cone, block/dodge/breakout/feints), Void Tether
  fixed for real (the grant chain silently ignored it AND graviton_surge
  AND all 3 max-health pickups — now a data-driven ABILITY_GRANTS table),
  cutscenes + a sample scene, combo chains with 3 built-ins, vitality
  motes/health shards/healing crystals, the Child with full follow/hide/
  heal/assist behavior, level-editor Solid Wall & Ceiling tools, and a
  restored `enemy_test_arena` room that the folder reorg had silently
  dropped (all arena tools were broken). Verified via `node --check` on
  everything + a Node VM smoke test loading all 15 scripts in order and
  exercising each system (all passing). NOT browser-verified — see
  roadmap Phase 17's manual test checklist.

- **v0.0.14** — 2026-07-17 through 2026-07-21 — SVG-based level rebuild
  scaffolded all 13 regions (71 rooms) as flat SHELL rooms in `area.js`
  (roadmap Phase 20) plus new runtime platform flags (hazard/oneWay/
  moving/crumble, Phase 21), levelEditor placeable + platform-type UI
  (Phase 22), and `Plans/room_progress.js` as a per-room design-progress
  tracker (Phase 23). Separately: `game/attackVFX.js` (shared player VFX/
  hitbox math, 2026-07-19), the enemy attack vocabulary (Reversal, Aggro-
  Pull, The Catch, Tiger Knee, Afterimage Strike, Mote Eater — 2026-07-20,
  see `enemy_attack_vocabulary_plan.md`), the animation editor's enemy/
  boss bridge + raster frames (2026-07-20), 8 more `ComposedEnemy` types
  (2026-07-21, see `expansion.md`), and a lore/story war-bunker setting
  reframe (2026-07-21, see `lore.md`/`story.md`). See `roadmap.md`'s
  "Status catch-up (2026-07-21)" tail entry for the full reconciliation —
  this doc and `roadmap.md` had both drifted out of sync with these by the
  time this entry was written.

<!-- Add new entries above this line, newest first is fine too — just keep
     the number incrementing and each entry to one or two sentences with a
     date. -->
