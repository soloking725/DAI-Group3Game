# Project Progress Dashboard — Plan (proposal only, not built — added 2026-07-29)

**What this closes**: right now, "what's left to do" means running
`node Plans/room_progress.js --full`, separately cross-referencing
`Plans/room_design_bible.md`'s per-region pip/enemy targets by hand, and separately
knowing (from memory, or by opening `anim_editor.html` and checking) which enemies/
minibosses have any authored animation frame vs. 100% procedural fallback. This plan
folds all of that into one live panel — **extending `editor/dev_hub.html`, not building
a new tool** — since it already loads the real data live and already has exactly this
kind of summary-stats panel, just a much thinner one.

## 0. This is an extension, not a new tool — here's the existing code to build on

`editor/dev_hub.html` already:
- Loads `area.js`, `enemy.js`, `animdata.js` live (`<script>` tags,
  `dev_hub.html:124-129`) — real `AREAS`, `ENEMY_REGISTRY`, `ANIM_DEFS` are already
  in scope, not something this plan needs to add.
- Has a `renderStats()` function (`dev_hub.html:286-298`) computing exactly 3 raw
  counts today — room count, `ENEMY_REGISTRY` size, `ANIM_DEFS` size — rendered as 3
  stat cards. This plan is "make this panel deeper," not "build a sibling panel."
- Has a `runAllValidations()` function (`dev_hub.html:311-389`) that already runs
  `validateRoomLayout()` per room, `validateAreaGraph()`, and an embedded-door check,
  rendering pass/fail with click-through to `levelEditor.html?room=<id>` for any
  failing room (`dev_hub.html:378-382`) — the exact click-through pattern this plan's
  new panels should reuse for jumping to a room (and, once built, to the room
  verification tool's new **Spawn button**, see
  `Plans/room_verification_tool_plan.md`'s §3).

**One real technical wrinkle to flag before building**: `MINIBOSS_CLASSES` (needed for
the miniboss-coverage panel below) lives in `game/game_state.js`, not `enemy.js` —
and `game_state.js` does `document.getElementById('game').getContext('2d')` at the
very top of the file (`game_state.js:2-3`), unconditionally, outside any function.
`dev_hub.html` has no `<canvas id="game">` element today, so adding a naive
`<script src="../game/game_state.js">` tag would throw immediately on load and break
every script after it in load order (the same class of bug `roadmap.md` Phase 27's
"the global.AREAS regression" story already found once — a script that assumes DOM/
global setup it wasn't given). **Fix**: add a hidden `<canvas id="game" style="display:
none">` to `dev_hub.html` before that script tag (cheap, no visual effect, satisfies
the getter) — or extract just the `MINIBOSS_CLASSES` table out of `game_state.js` into
its own small data file if a full `game_state.js` include pulls in more than this panel
actually needs. Decide which when building; flagging so it isn't a surprise.

## 1. Data sources and how each panel gets its numbers

| Panel | Source | Notes |
|---|---|---|
| Room design-state (SHELL/started/designed) | `room_progress.js`'s `analyze(id)` function | **Extract this into a shared file** (see §2) rather than re-implementing it in `dev_hub.html` — it's already a pure function (no DOM/Node dependency), the same "reuse, don't duplicate" principle `graph_analyzer.html`/`runAllValidations()` already follow for `validateAreaGraph()`. |
| Pip economy (Fracture / Lore / Extra) | Live count from `AREAS`: `fracturePipRewards.length` summed, `loreFragments` summed and split by `mode` (`'overlay'`/`'cutscene'` = Lore, `'none'` = Extra) | Targets (5 / 15 / 15) are **not** derivable from code — they're a design decision recorded in `regions.md`/`room_design_bible.md`. Hardcode them as named constants in the dashboard, with a comment pointing at `regions.md`'s tables, and **update both by hand if the target ever changes** — same dual-copy caveat `hud_editor.html`'s `DEFAULTS` table already has to live with. |
| Enemy roster coverage | `Object.keys(ENEMY_REGISTRY).length` (built) vs. a hardcoded planned-total constant | The planned total (26 normal + 2 hard + 7 countering = 35, per `expansion.md` §2) is prose, not data — same manual-sync caveat as pip targets above. |
| Miniboss coverage | `Object.keys(MINIBOSS_CLASSES).length` (built — currently 14, all of them) vs. `expansion.md`'s named roster | Mostly moot today (all 14 are built) — keep the panel anyway so it stays accurate if the roster ever grows (e.g. a genuinely new miniboss idea). |
| Anim-authored coverage | For each `ENEMY_REGISTRY`/`MINIBOSS_CLASSES` key, check whether **any** `ANIM_DEFS` key matches that entity's convention (`enemy_<id>_<state>` or `boss_<state>`/`boss_<telegraph.type>`, per `Plans/archive/animation_editor_plan.md`'s bridge conventions) | A simple `Object.keys(ANIM_DEFS).some(k => k.startsWith('enemy_' + id + '_'))` per entity — cheap, no new data needed, `ANIM_DEFS` is already loaded. |
| Per-region rollup | Cross-reference `AREAS[id].region` against the design-state + pip + enemy data above, grouped | This is `room_design_bible.md`'s own per-region tables, computed live instead of hand-maintained — the dashboard becomes the "is this doc's snapshot still accurate" check, not a replacement for the doc's narrative content (mechanic/miniboss/tragedy text still lives only in the doc). |

## 2. One prerequisite refactor: share `room_progress.js`'s scoring logic

`room_progress.js`'s `analyze(id)` function (lines ~39-72 of that file) is pure —
takes a room object, returns `{score, state, ...signal counts}`, no `fs`/`vm`/DOM
calls inside it. Recommend extracting it (and the `FLOOR_H`/`DOOR_H` constants it
depends on) into a small new file, e.g. `game/roomDesignScore.js`, that:
- `room_progress.js` (the Node CLI) requires/includes for its own CLI output —
  replacing its inline copy, not duplicating it.
- `dev_hub.html` (or wherever the dashboard panel ends up) includes as a plain
  `<script>` tag, same convention as every other shared `game/*.js` file.

This avoids the two ever silently disagreeing about what counts as "designed" — the
exact class of drift this project's own docs repeatedly flag as a real risk (e.g.
`graph_analyzer.html` used to read `connections` instead of `transitions` and
disagreed with `validateAreaGraph()` until that was fixed, per
`dev_tools_roadmap_status.md`). Small, mechanical refactor — do it before or alongside
building the dashboard panel, not as a separate later cleanup.

## 3. Proposed panel layout (added to `dev_hub.html`, new "Progress" section)

Matches the existing page's plain stat-card + collapsible-group visual language
(`dev_hub.html`'s current `.stat-card`/`group-title` CSS classes) — no new visual
language to invent:

1. **Top row, expanded stat cards** (replaces/extends the current 3-card row):
   Rooms (designed/started/SHELL counts + a thin progress bar, matching
   `room_progress.js`'s own `███░░░` bar aesthetic), Fracture Pips (`X/5`), Lore Pips
   (`X/15`), Extra Pips (`X/15`), Enemies Built (`X/35`), Minibosses Built (`X/14`),
   Anim Coverage (`X/33 entities have ≥1 authored key`).
2. **Per-region rollup table** (collapsible, one row per region key in `AREAS`):
   region name, room design-state breakdown for that region only, pip counts placed
   vs. this region's target (pulled from the same hardcoded table as the top row,
   filtered per region), miniboss built y/n, mechanical-effect built y/n (still has to
   be a hand-maintained flag — "is the region's special traversal mechanic actually
   coded" isn't derivable from `AREAS` data at all, it's a fact about `game_update.js`/
   `player.js` code, so mark this column explicitly manual, don't pretend it's live).
   Click a region to filter `levelEditor.html`'s room list to it (small addition to
   that tool, or just open it with the first room in that region pre-selected).
3. **Per-room drill-down** (click a region row to expand, or reuse the existing
   `runAllValidations()` failing-room click-through pattern): each room shows its
   design-state, pip ids present, enemy list, and — once
   `Plans/room_verification_tool_plan.md`'s Spawn button exists — a direct "Spawn
   here" link (`levelEditor.html?room=<id>` for editing, `?spawnRoom=<id>` for
   in-game inspection, both openable from the same row).
4. **"Suggested next" line** (v2, optional): simplest possible heuristic — the
   lowest-design-state region with the most SHELL rooms, or the region with the
   largest pip deficit against target — one sentence, not a scored ranking system.
   Nice-to-have, not required for v1.

## 4. Scope staging

- **v1**: the extracted shared scoring file (§2) + the expanded top-row stat cards +
  the per-region rollup table. This alone answers "what's left" at a glance without
  cross-referencing anything by hand.
- **v2**: per-room drill-down with Spawn-button links (depends on
  `room_verification_tool_plan.md`'s spawn feature existing first), and the
  "suggested next" heuristic line.
- **Explicitly out of scope**: this dashboard reports live `area.js` state — it does
  not edit anything (no write-back to `AREAS`, no save button). All edits still happen
  in `levelEditor.html`/`anim_editor.html`/etc.; this tool is read-only by design, same
  as `graph_analyzer.html`.

## 5. Open question for the user before building

Should the per-region "mechanical effect built?" flag (§3, point 2) live as a small
hardcoded table inside the dashboard's own script (fastest to build, but yet another
hand-maintained fact to keep in sync), or should each region's entry in `AREAS` gain a
real `mechanicalEffectBuilt: true/false` field so it's queryable the normal way (a
small `area.js` data addition, more consistent with how everything else here avoids
hand-maintained duplicate facts, per `room_progress.js`'s own explicit design goal)?
Recommend the latter, but it's a real (if small) data-model change to `area.js`, so
flagging rather than assuming.
