# Production Workflow & Editor-Suite Gap Audit (added 2026-07-29)

**The question this answers**: does the existing + planned tool suite let you finish
Stillpoint end-to-end without needing to come back and ask for more coding help, and if
not, what's actually missing — plus what order to actually do the remaining work in.
Short version up front: **no, not quite** — most of the mechanical/tooling gaps are
closeable (two are listed below), but a few things are inherently creative judgment
calls no tool removes, and one real gap (room reachability verification) is already
planned but not built. Read on for the specifics and the recommended order of work.

**Update 2026-08-01 — visual variants system built.** Not originally in this audit;
came up in conversation when hazards turned out to always render as identical red
spikes regardless of region (no tool gap flagged it because the audit was scoped to
*missing* tools, not *inflexible* existing rendering). Rather than a one-off hazard-
color fix, built as a generalized resolver — see §1a below — because the same
"functionally identical, cosmetically different" need recurs (an enemy that's the
same `ComposedEnemy`/behavior in two regions but should read as visually distinct,
a destructible that's mechanically a wall-with-HP everywhere but wants a per-region
material look, etc.). Not itself one of the two tracked closeable gaps (bot-walker,
Project Progress Dashboard v2) — those are both still open, see §3.

## 1a. Visual variants — generalized region/instance reskinning (built 2026-08-01)

`game/visualVariants.js` (new, small, dependency-light) is a generic resolver,
`getVisualVariant(category, region, instanceOverride)`, with a 3-step priority chain:
an explicit per-instance override wins, then a `REGION_STYLES[region][category +
'Variant']` entry (opt-in per region, same table `room_scene_editor.html` already
edits for `primary`/`secondary`/`glow`), then `null` — meaning "no opinion, caller
keeps its current hardcoded default." That null-by-default behavior is what makes
this additive, not a reskin of the whole game at once: every region/instance that
hasn't opted in renders exactly as it did before this system existed.

Two concrete call sites prove the pattern today:
- **Hazards** (`drawPlatform()` in `game_entities.js`) — `getHazardStyle(region,
  plat.hazardVariant)` replaces the old hardcoded red fill/stroke. A region with no
  styling still gets the same plain red as before (zero regression across all 71
  rooms — reverified with `node Plans/room_verify_cli.js`, same 69-clean/2-warning
  result as before this change). A region that already has a `REGION_STYLES` entry
  (mirror_veil/event_horizon/chrono_rift) gets a *derived* tint for free (from its
  existing `primary`/`secondary` colors, no new creative color choices invented) even
  without authoring a dedicated `hazardVariant` — that's opt-in-by-default, a stronger
  default than requiring per-region hand-authoring before any visual change shows up.
- **Enemies** (`spawnAreaEnemies()` in `game_entities.js`) — after construction, an
  optional tint resolves the same way: `eDef.tint` (a new per-placement field, now
  editable in `levelEditor.html`'s enemy inspector) beats `REGION_STYLES[region]
  .enemyVariant`, beats "no tint, enemy keeps its own `def.color`" (today's behavior,
  unconditionally, for every enemy placed so far — none have a tint or region-enemy-
  variant set yet). Wired into both `ComposedEnemy` (already had `this.color`) and the
  legacy base `Enemy` class (`Fractured`'s hand-coded draw hardcoded `#f87171` inline;
  pulled into a `this.bodyColor` field, same convention as `ComposedEnemy.color`, so
  both enemy families are reskinnable through the one resolver).

Verified without a browser per this repo's standing rule: `node --check` on every
touched file, a standalone Node test of the resolver's priority chain (instance >
region > null, both hazard and enemy paths, 6 assertions), and a full
`room_verify_cli.js` re-run confirming no behavior change for any of the 71 real
rooms (none have opted into a variant yet).

**Not built / explicitly out of scope for this pass**: authoring UI for
`REGION_STYLES[region].hazardVariant`/`.enemyVariant` themselves (they're
hand-editable objects in `game_entities.js` today, same as `primary`/`secondary`/
`glow` already are — extending `room_scene_editor.html`'s existing region-style panel
to expose these two new fields would be a small, natural follow-up, not done yet);
sprite/shape variants (only color is wired — a hazard that's a different *shape* per
region, or an enemy with a different silhouette, is a bigger lift than this pass
scoped); and applying the pattern to any category beyond hazards/enemies (the
resolver itself is generic — `getVisualVariant('destructible', region, ...)` would
work today with zero new code — but no draw call site reads it for destructibles/
platforms/pickups yet; add call sites opportunistically as the actual need comes up,
per this doc's own "don't build ahead of a real need" framing elsewhere).

## 1b. Custom art/animation authoring — 3 of 6 targets built (2026-08-01)

Follow-up conversation to §1a: can custom art be *animated*, not just recolored, and
across every category that might want it (hazards, platforms, doors, anchors/pips/
rewards/cosmetics, cutscene visuals, the Child, HUD/world-map icons, particles/
projectiles)? Researched `Animator`'s real implementation before answering (not
assumed) — it only hard-needs `x/y/width/height/facing` on its target, so reuse is
genuinely cheap, with one real catch: `area.js` objects use `w`/`h`, not `width`/
`height`. Landed on a 3-tier plan by weight (full `Animator` for entity-like things;
a lightweight frames-only flipbook for room-attached static art; no persistent state
at all for pooled/transient VFX, since a full `Animator` per particle would be new
per-frame overhead `debug_v2.html`'s test X03 doesn't budget for today) rather than
one bespoke editor per category — extends existing tool owners instead of building
new ones, per this doc's own §0 principle.

Built, user's explicit choice of **Option 2** (`levelEditor.html` links out to
`anim_editor.html` per object rather than embedding its frame-strip UI — geometry
editing and art authoring stay deliberately separate tools/workflows):

1. **The Child** — full `Animator` bridge in `game/companion.js`
   (`child_<state>` keys: idle/walk/hide/fight/fight_assist/heal), added to
   `anim_editor.html`'s entity picker. Plus, per explicit request, a genuine
   **environment-interaction hook** (not a full interaction system — that needs
   real lever/environment-object triggers that don't exist yet): a new
   `companionState.scriptAnim` field that `animStateKey()` reads first, ahead of
   everything else, whenever `mode === 'scripted'` — a future cutscene step or
   trigger sets it to any name (`point`/`examine`/`pull_lever` suggested as
   starting points) and a matching `child_<name>` def just works, no new plumbing.
2. **Room backdrop layer animation** — `backdropLayers[].frames[]` in
   `game_entities.js`/`room_scene_editor.html`, a stateless flipbook driven by the
   existing `frameCount` global (not a mutated per-layer timer). Direct answer to
   the original "can room_scene_editor do animated custom art" question.
3. **Hazards, platforms, doors** — new `getRoomObjectAnimator()`/
   `tryDrawRoomObjectAnim()` bridge in `game_entities.js` (a cached, in-place-
   mutated adapter solving the `w`/`h` vs `width`/`height` mismatch), a new
   `animKey` field + "🎬 Edit Animation →" link-out button in `levelEditor.html`'s
   Platform/Transition inspectors, and a real fix in `anim_editor.html`'s
   `?anim=` deep-link handler (previously only worked for already-authored keys —
   now auto-creates a sized placeholder for a brand-new key so the link-out is
   genuinely one-click).

All three verified without a browser (`node --check`, and real Node/`vm`-sandboxed
functional tests against the actual shipped code, not reimplementations — 8+8+11
assertions across the three) plus a `room_verify_cli.js` re-run after each step
confirming zero regression (same 69-clean/2-warnings/0-failing result throughout).

**Follow-up, same day: anchors, ability rewards, Fracture/Lore Pips, healing
crystals — also built.** These are bare `{x,y}` pickups with no `w`/`h`, so a
sibling helper (`tryDrawPointObjectAnim()`, a fixed-box adapter bottom-anchored at
`y`) was added alongside `getRoomObjectAnimator()` rather than reusing it directly
— same opt-in/zero-regression contract, same `levelEditor.html` link-out pattern.
Cosmetic upgrades were explicitly **not** given this (verified there's no runtime
draw function for them at all yet — data-only today — so an `animKey` field would
be speculative dead code).

**Still not built** (2 of the original 6): cutscene visuals (needs a real design
decision — a new `CUTSCENES` step type) and particles/projectiles (needs a lighter,
non-`Animator` mechanism given the performance boundary above) — both genuinely
open, not just unscheduled. HUD/world-map icons also not revisited. See
`roadmap.md`'s tail entry for full per-item implementation detail.

## 1. Addendum to `Plans/room_scene_editor_plan.md` — what else it should cover

Three things that plan didn't scope, worth folding in before building it:

- **A scattered-prop decoration layer, separate from full-bleed backdrop layers.**
  The plan's `backdropLayers[]` covers big parallax images (a whole background scene).
  Dedicated 2D editors (Ogmo's "decal layers" specifically) also give you a second,
  different kind of layer: many small, individually-placed, non-colliding sprites
  (rubble, dead pipework, a cracked sign) scattered by hand across the foreground/
  midground. Without this, "room look" only ever means one big backdrop image per
  room, not the smaller texture/clutter details that make a cave or ruin actually read
  as lived-in. Add a `decorationSprites[]` array (`{imageId, x, y, scale, rotation,
  flipX}`) — same `RoomImageStore` reuse as the backdrop layers, just placed as many
  small free-standing instances instead of one big layer.
- **Per-room ambient/positional one-shot SFX triggers.** The Audio A/B Tester
  (`editor/audio_ab_tester.html`) already curates real per-*region* music/SFX
  candidates against a manifest — but there's no way to plant a one-off ambient sound
  at a specific spot in a room (a distant clang, a dripping echo) the way the cutscene-
  trigger zones plant a cutscene at a spot. Same data shape as `cutsceneTriggers[]`
  (a zone + a sample id + trigger-once/loop-while-inside), cheap to add alongside it
  once that panel exists.
- **A live camera-bounds overlay in the preview canvas.** Since `updateCamera()`
  clamps to room bounds, background art placed near a room's edge may never actually
  be visible depending on where the clamp stops the camera — the preview canvas should
  draw the real camera-clamp rectangle so a background layer doesn't get authored
  outside what the player can ever see.

None of these change that plan's core scope or its v1/v2 staging — they're additions
to the same tool, not a new one.

## 2. Full tool inventory — what's actually covered today

| Discipline | Tool(s) | Coverage |
|---|---|---|
| Room geometry, doors, entity placement, all 3 pip types | `editor/levelEditor.html` | Full — undo/redo, live-override save, in-editor validation, diff-vs-saved |
| World topology / critical path / reachability (topology-level, not physics-level) | `editor/graph_analyzer.html`, `editor/floor_plan_report.html`, `editor/floor_plan_simulation.html`, `Plans/analyze_floor_plan.js` | Full for the *planned* graph (`floor_plan.md`'s mermaid) — cross-check these still read the same graph shape `area.js` implements, per `regions.md`'s own flagged "tree vs. web" discrepancy-check |
| Enemy stats/behavior authoring | `editor/enemy_editor.html` (quick tweaks), `editor/enemy_designer.html` (full `ComposedEnemy` attack/behavior authoring) | Full for anything expressible as a `ComposedEnemy` — the 10 older hand-coded `Enemy` subclasses aren't editable this way (would need direct `enemy.js` edits) |
| Enemy/miniboss live testing | `editor/enemy_test.html`, `editor/companion_test.html` | Full |
| Boss phase tuning | `editor/boss_phase_editor.html` | Full for `BOSS_PHASE_CONFIG` (thresholds/weights) — moveset/telegraph *design* itself is still a code change |
| Player ability tuning | `editor/ability_tester.html`, `editor/ability_utility_calculator.html` | Full for constants/scoring |
| Combo authoring | `editor/combo_editor.html` | Full |
| Character/enemy/boss animation frames + hitboxes | `editor/anim_editor.html` | Full, IndexedDB-backed, no quota issue |
| HUD layout | `editor/hud_editor.html` | Full |
| Difficulty scoring (bot vs. a chosen roster) | `editor/difficulty_bot.html`, `editor/room_difficulty_calculator.html` | Full for combat-encounter difficulty; **not** whole-run pacing across all 71 rooms in sequence (see gap below) |
| Automated regression/smoke testing | `editor/debug_v1.html`, `debug_v2.html` (100+ checks), `debug_new.html` | Full for what's scripted — doesn't include a general room-traversal bot (see gap below) |
| Audio curation (real CC0 music/SFX, per-region) | `editor/audio_ab_tester.html` + `assets/audio/candidates/manifest.json` | Full for picking/shortlisting tracks — no per-*spot* ambient placement (added to §1 above) |
| Cross-tool state, launcher, live-override management | `editor/dev_hub.html` | Full as a launcher/status board for the tools above |
| Room-by-room design-completeness tracking | `Plans/room_progress.js`, `Plans/room_design_bible.md` | Full as a live read of `area.js` — see the Project Dashboard gap below for unifying this with pip/anim status |
| Room *background art* + parallax + cutscene-trigger placement | **Planned, not built**: `Plans/room_scene_editor_plan.md` | Genuine gap until built |
| Room reachability/physical-safety verification (not just topology) | **Planned, not built**: `Plans/room_verification_tool_plan.md` (only a 90-frame single-check down-payment exists, `debug_v1.html` R09-R11) | Genuine, flagged gap — see §3 |
| Cutscene *step* authoring (the `wait`/`text`/`choice` content itself) | **Planned, not built**: `Plans/cutscene_editor_plan.md` (2026-07-29) | Was a genuine gap; now planned — a structured list-and-form editor over the existing `CUTSCENES` step format, not a timeline/node-graph (the format already fits that pattern better, per that doc's research) |
| Manual playtest protocol | `Plans/BUG_ANALYSIS_AND_QA_PLAN.md` §6 | Exists but written for the old "Fractured King" boss — needs a refresh pass before it's trustworthy against the current Sovereign/miniboss roster |

## 3. Real gaps — and which ones a tool can actually close

**Closeable with more tooling** (recommend building, in this priority order):

1. **The room verification bot-walker** (`Plans/room_verification_tool_plan.md`,
   fully spec'd already, not built). This is the single highest-value remaining tool:
   once you've hand-designed geometry for 71 rooms across 13 regions, the only way
   today to know a room is actually beatable (no soft-locks, no unreachable pips, no
   door embedded in geometry) is either the static `validateAreaGraph()` check
   (topology only) or a human manually walking it. A scripted bot that actually tries
   to traverse a room and reports stuck points removes that manual step for the bulk
   of rooms, leaving human playtesting for *feel*, not *reachability*. Build this
   before doing the full 13-region hand-design pass, not after — cheaper to catch a bad
   room while you're still actively building it than to discover it in a full playtest
   once everything's "done."
2. **A unified Project Progress Dashboard** (extend `dev_hub.html`, don't build a
   separate tool) — now planned in full: `Plans/project_progress_dashboard_plan.md`
   (2026-07-29). Pulls room design-state, pip-placed-vs-target for all 3 pip types,
   enemy/miniboss roster coverage, and anim-authored-vs-procedural coverage into one
   panel on the existing `dev_hub.html` page, reusing its already-live `AREAS`/
   `ENEMY_REGISTRY`/`ANIM_DEFS` data instead of cross-referencing docs/scripts by hand.
3. **`Plans/room_scene_editor_plan.md` itself** — already planned, not yet built,
   covered in depth in that doc plus §1's addendum above.

**Not closeable by tooling — inherent creative work, no shortcut**:

- Deciding each room's actual hazard/puzzle design (the `expansion.md` §3.16/§3.17
  ideas are proposals, not implementations — someone has to design the actual
  lever-chain puzzle, the actual polarity-bounce routing, etc.).
- Writing/placing the actual Lore Pip visual-effect content and Cutscene *step*
  content (`lore.md`'s visual-effect table is a spec, not code — someone authors the
  real silhouette/camera-pan steps in `cutscene.js`, no tool removes that authorship,
  only a future tool could make placing *where* it triggers easier, per §2's flagged
  gap).
- Drawing the actual art (this project's declared minimalist-vector style is a
  deliberate choice — `anim_editor.html` and the planned room-scene editor are the
  *authoring* surface, not an art generator; the actual drawing is still you).
- Playtesting for *fun*/pacing/feel — QA research is consistent on this point
  (automated checks + human playtesting are complementary, not substitutes for each
  other): a bot-walker proves a room is *beatable*, not that it's *good*. That
  judgment stays a human loop no matter how good the tooling gets.

**Honest verdict**: with items 1-2 above built, the tool suite would cover essentially
all of the *mechanical* remaining work (placing content, verifying it's functional,
tracking status) without needing more coding help — but the *creative* content itself
(what goes in each room, what each cutscene actually shows, what the art looks like)
was never something a tool suite removes; it removes the friction of *entering and
verifying* that content, not the work of deciding what it is.

## 4. Research: how this compares to how other Metroidvanias actually get made

- **Team Cherry (Hollow Knight, 4 people)**: built in Unity with 2D Toolkit +
  Unity's own 2D physics/Sprite Packer/Particle System — i.e., they leaned on an
  existing engine's tooling rather than building bespoke editors for most of it, and
  hand-drew art in Photoshop as plain PNGs, imported separately from level layout. Their
  original 18-month estimate became 4 years — worth internalizing as a realistic
  baseline, not a cautionary outlier: even a small, focused team runs long on a game
  this scale. Team Cherry's own described process (per Silksong-era interviews) treats
  level-building as iterative and exploratory ("take an empty space and think, should
  there be a few platforms here") rather than fully pre-planned — consistent with
  this project's own room_design_bible.md being a reference/target, not a rigid
  blueprint to execute mechanically.
- **General indie pipeline consensus** (prototyping-through-launch guides): the
  strongly repeated principle is *greybox first, art later* — validate a room/mechanic
  with placeholder geometry before investing in final art, because an unproven room
  redesigned after art exists is much more expensive than one redesigned while it's
  still just platforms and boxes. **This project is unusually well-positioned here**:
  the "greybox" phase is essentially done project-wide (71 scaffolded rooms, all core
  systems built) — the remaining work is closer to a *content* pass than a prototyping
  pass, which changes the recommended order somewhat from a from-scratch project (see
  §5).
- **Narrative pipelines** typically front-load a "world bible" (character/lore
  documents) before writing actual dialogue/script content — this project already has
  exactly that layer done (`lore.md`, `story.md`, and now `room_design_bible.md`), so
  the narrative work remaining is specifically the *content-authoring* step (writing
  real `CUTSCENES` steps, real lore-pip visuals) against an already-solid bible, not
  bible-writing itself.
- **QA/playtesting guidance** consistently pairs automated checks with regular human
  playtesting sessions (every sprint, not just before ship) — this project's
  `debug_v1.html`/`debug_v2.html`/difficulty_bot already give strong automated coverage;
  the gap is specifically the reachability bot-walker (§3) and a refreshed manual
  playtest protocol, not a wholesale QA process rebuild.
- **Audio middleware research**: FMOD/Wwise exist for *adaptive* audio (parameter-driven
  mixing, dynamic layering) — this project's actual need (curated CC0 tracks per region,
  simple crossfades, procedural one-shot SFX fallback) doesn't call for that complexity;
  the existing `audio.js`/`audio_ab_tester.html` approach is already the right-sized
  solution, not an under-built one. No recommendation to adopt middleware.

## 5. Recommended order of work (adapted to this project's actual current state)

Standard advice ("build all levels, then all art, then all combat, then narrative")
doesn't fit well here, because unlike a from-scratch project, **this project's systems
and scaffolding are already built** — what's left is close to a *content* pass across
13 regions + a handful of origin-spine rooms, not a green-field production. Recommend
working **region by region, end-to-end, rather than discipline by discipline
game-wide** — this matches the "vertical slice first" principle (prove the whole
per-region pipeline works well on one or two regions before committing to repeating it
13 times) better than a strict global ordering would:

1. **Pick one region** (recommend starting with one already `designed`-state per
   `room_design_bible.md` and high plot-weight, e.g. Chrono-Space Rift or Mirror
   Veil, both built + already have their ability grant wired) as your first full
   pipeline pass.
2. **Layout/hazard pass** (`levelEditor.html`) — build out that region's actual
   mechanical effect (the thing `room_design_bible.md` flags as "not yet built" per
   region) and hazard/puzzle ideas from `expansion.md` §3.16/§3.17. This is the
   highest-leverage step per room since everything else (enemy placement, pips,
   cutscene triggers, art) depends on final geometry.
3. **Encounter pass** (`enemy_designer.html`/`enemy_editor.html` + place in
   `levelEditor.html`) — swap the current placeholder enemy distribution (Phase 27's
   auto-generated pass) for the region's intended flavor roster per
   `room_design_bible.md`'s per-region notes, then **immediately** score it with
   `difficulty_bot.html`/`room_difficulty_calculator.html` — don't wait until the
   whole region is "done" to find out an encounter is unfair.
4. **Miniboss polish** (`boss_phase_editor.html` + direct arena-shape edits in
   `levelEditor.html`) — per `expansion.md`'s "Arena note," shape the fight's room
   around its specific mechanic now that the room's final geometry exists.
5. **Verify reachability** (once built, the bot-walker from §3; today, a manual
   playthrough + `debug_v1.html`'s existing checks) — catch soft-locks/embedded doors
   before investing in art, cheaper to fix now.
6. **Plot/cutscene content** — write the actual `CUTSCENES` steps for any beat tied to
   this region (lore-pip visuals per `lore.md`'s table, any plot cutscene), and place
   pip modes (`overlay`/`cutscene`/`none`) + (once built) cutscene-trigger zones. Doing
   this after geometry locks avoids re-placing triggers every time a platform moves.
7. **Art pass** — draw entity animation frames (`anim_editor.html`) for whichever
   enemies/minibosses live in this region, and (once built) background/parallax art
   in the new room-scene editor. This is deliberately last per the "greybox first, art
   later" research — geometry and encounters churn less once locked, so art invested
   here doesn't get thrown away by a later layout change.
8. **Audio pass** — finalize/shortlist this region's track in `audio_ab_tester.html`
   now that its final mood (art + hazard design) is locked, not before.
9. **Region QA** — run the automated suites, then a real human playthrough focused on
   *feel* (the thing no bot-walker checks), before marking the region done in
   `room_design_bible.md`/`roadmap.md`.
10. **Repeat 2-9 for the next region.** Once 2-3 regions have been through this full
    cycle, you'll know whether the per-step tooling actually holds up at this project's
    scale — adjust the order/tooling before committing to it across all 13.
11. **Whole-game pass, only after every region is individually done**: full-game QA
    soak (a real start-to-finish playthrough, all 3 endings), whole-run pacing check
    via `floor_plan_simulation.html`/`floor_plan_report.html` against the *actually
    built* graph (not just the planned one), save-compatibility check across all
    save-shape changes made during the content pass, then ship — trivial for this
    project specifically, since there's no build step (`Plans/CLAUDE.md`: open
    `index.html` directly or serve the folder statically).

## Sources

- [Understand how Team Cherry created the world of Hollow Knight](https://mundogamer.community/en/articles/understand-how-team-cherry-created-the-world-of-hollow-knight)
- [When We Made... Hollow Knight — MCV/DEVELOP](https://www.mcvuk.com/when-we-made-hollow-knight/)
- [Hollow Knight — Made with Unity](https://unity.com/made-with-unity/hollow-knight)
- [Team Cherry explains the Silksong development process — GamesRadar+](https://www.gamesradar.com/games/action/team-cherry-explains-the-silksong-development-process-that-was-so-fun-devs-just-couldnt-stop-if-youre-trying-to-build-a-mario-level-you-might-take-an-empty-space-and-think-oh-should-there-be-a-few-platforms-here/)
- [The placeholder asset problem: How programmer art kills playtests — Unity](https://unity.com/blog/placeholder-asset-problem)
- [Game Development Process: Complete Guide from Concept to Launch](https://generalistprogrammer.com/tutorials/game-development-process-concept-to-launch-2025)
- [Narrative Pipeline — Ludolib](https://ludolib.net/en/careers/producers/narrative-pipeline)
- [How Narrative Pipeline in Game Dev Works — Gamigion](https://www.gamigion.com/how-narrative-pipeline-in-game-dev-works/)
- [QA for indie game studios: a practical guide](https://gamestudiounlocked.substack.com/p/qa-for-indie-game-studios)
- [6 steps to a successful playtesting process for an indie developer — Game Developer](https://www.gamedeveloper.com/programming/6-steps-to-a-successful-playtesting-process-for-an-indie-developer)
- [FMOD vs Wwise for Indie Games — Bugnet Blog](https://bugnet.io/blog/fmod-vs-wwise-for-indie-games)
