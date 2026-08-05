# Cutscene Step Editor — Plan (proposal only, not built — added 2026-07-29)

**Gap this closes**: `Plans/archive/room_scene_editor_plan.md` only places *where* a cutscene
triggers in a room — the cutscene's actual *content* (the `wait`/`text`/`cameraPan`/
`choice` step list) is still 100% hand-written JS in `game/cutscene.js`, with zero
visual tooling. Only 3 cutscenes exist today, so this hasn't been painful yet, but per
direct request this is worth planning now rather than waiting until content volume
makes it painful. **Not implemented in this pass** — same status as the other 3
planning docs from this session.

## 0. The data model already exists — don't invent a new one

Unlike the room-scene editor (which needed a genuinely new data model), the cutscene
*format* is already fully designed and documented — `game/cutscene.js:1-51`'s own
header comment specs every step type completely:

| Step type | Fields | What it does |
|---|---|---|
| `wait` | `frames` | Hold N frames |
| `text` | `text`, `frames` | Show a line at the bottom of the screen |
| `cameraPan` | `x`, `y`, `speed` | Glide camera to a world point, holds there |
| `cameraReturn` | `speed` | Glide camera back to normal follow |
| `movePlayer` | `x`, `speed` | Walk the player to world x (no physics, flat ground) |
| `setFlag` | `flag`, `value` | Set `storyFlags[flag]` — instant |
| `call` | `fn` (arbitrary JS function) | Run code — the one step type a visual editor can't fully tame, see §3 |
| `choice` | `actionA`/`actionB`, `promptA`/`promptB`, `taps`, `window`, `onTimeout`, `onA`/`onB` (nested step arrays) | The rapid-tap-repeat decision prompt (`story.md`'s "quick-tap decision moments") |

This tool's job is purely **authoring and reordering a list of these**, plus a live
preview — not redesigning the format.

## 1. Research: how existing tools handle branching/scripted cutscenes

Two competing patterns exist in the wild (from this session's earlier research into
Godot's ecosystem): a **visual timeline/node-graph** (drag clips on a scrubber, or wire
nodes for branches) vs. a **script-based director** (an ordered list of typed steps,
authored more like a form than a graph — Godot's own community has documented moving
*toward* this pattern over a pure timeline specifically because branching/conditional
beats are awkward in a linear timeline but natural as a list of typed steps with a
nested branch). **This project's format is already the second pattern** — `steps: []`
with `choice.onA`/`onB` nesting sub-arrays — so the right editor UI is a **structured
list-and-form editor**, not a node graph or a scrubber timeline. Building a timeline UI
here would be translating an already-good data shape into a worse-fitting visual
metaphor.

## 2. Proposed UI

Same three-pane skeleton as every other editor in this family:

- **Left panel — Cutscene list**: flat list of `CUTSCENES` keys (add/rename/delete),
  sourced live from the real object (`<script src="../game/cutscene.js">`, same
  inclusion `levelEditor.html` just gained for its Lore Pip datalist).
- **Center — Step list** (the core of the tool): an ordered, numbered list of the
  selected cutscene's `steps[]`. Each row shows a one-line summary (`text: "She
  watches you go..."`, `cameraPan → (900, 300)`, `choice: moveLeft vs moveRight`).
  Drag to reorder (reuse `levelEditor.html`'s existing list-reorder interaction, same
  as its layer-order buttons). "+ Add Step" opens a type picker, inserting at the
  selected position. A `choice` step's row expands inline to show its nested `onA`/
  `onB` sub-lists, indented — recursion, not a separate screen, so the branch structure
  stays visually obvious rather than hidden behind a click-through.
- **Right panel — Step properties** (context-sensitive per selected step's `type`,
  same pattern as every other editor's `updateSideProps()`):
  - `text`: a textarea (frames auto-suggested from text length, editable).
  - `cameraPan`/`movePlayer`: numeric x/y/speed fields, **plus a "pick on canvas"
    button** — click a point in the live preview (§4) to set x/y instead of typing
    coordinates blind, since these are always meaningful room-relative positions.
  - `setFlag`: a flag-name field with autocomplete from every `storyFlags.*` reference
    already grepped out of the codebase (a fixed known-flags list, regenerate the list
    by scanning `game/*.js` for `storyFlags\.\w+` — cheap, avoids typos creating a new
    flag that silently never matches an existing gate check), plus a boolean value
    toggle.
  - `choice`: the two action/prompt/tap-threshold fields, and two "Edit Branch →"
    buttons that scroll the center panel to that branch's nested step list.
  - `call`: see §3 below — this is the one type that can't be a simple form.
- **Bottom bar**: Undo/redo (reuse the existing history-stack code), a "▶ Preview This
  Cutscene" button (§4), and non-destructive JSON/paste-ready-JS export, same as every
  other tool in this family.

## 3. The `call` step problem — no full visual solution, a bounded escape hatch instead

`call` steps run arbitrary JS (`() => { companionState.active = true; }`,
`() => { player.fractureMax = Math.min(FRACTURE_ABS_MAX, player.fractureMax + 1); }`).
A truly visual editor can't safely offer arbitrary code execution in a form UI without
either becoming a full code editor (defeats the "visual" goal) or being unsafe/fragile
(string-eval'd expressions with no validation). Recommend the same **safe-path +
escape-hatch** split `enemy_designer.html` already uses for anything its friendly UI
doesn't cover (a raw JSON/code box alongside the guided fields):

- **Safe path — a small preset library** covering the actual `call` bodies already
  used in the 3 existing cutscenes plus their obvious near-future siblings: "grant
  ability" (dropdown of ability keys), "set companion active/canFight/weapon",
  "increment Fracture max", "spawn/despawn X" — each a parameterized template, not
  free code.
- **Escape hatch — a raw JS-function textarea** for anything not covered, exactly like
  today, with a visible "⚠ raw code — no guardrails" label so it's clear this path
  bypasses the tool's safety net. This keeps the tool useful for the 90% case without
  pretending it can safely visualize the 10% case that's genuinely arbitrary code.

## 4. Live preview — reuse the real game, don't fake one

`updateCutscene()`/`drawCutsceneOverlay()` (`game/cutscene.js`) read real globals
(`player`, `camera`, `gameState`, `companionState`, `storyFlags`) — faking a standalone
preview environment for these would mean re-implementing large chunks of the game
purely for this tool. **Recommend the same sandboxed-real-game-iframe pattern
`debug_v1.html` already uses** (it already knows how to boot a real game instance and
drive `gameLoop()`): the editor's preview pane is an iframe running the actual game,
booted into whatever room the cutscene is meant to play in (a dropdown to pick which
real room, defaulting to wherever it's already wired via `playCutscene()` calls in
`game_update.js`/`game_entities.js`, if any), then the parent frame calls
`playCutscene(key)` on it via `postMessage` or direct iframe-window access (same
access pattern `debug_v1.html`'s checks already use). This gets a **fully accurate**
preview — real letterbox bars, real camera glide, real rapid-tap `choice` input
handling — for free, instead of an approximation that might drift from actual
behavior. "pick on canvas" (§2) for `cameraPan`/`movePlayer` coordinates reads clicks
on this same live iframe.

## 5. Reuse checklist

| Need | Reuse this |
|---|---|
| Real `CUTSCENES` data + `playCutscene()` | `<script src="../game/cutscene.js">` |
| Real, accurate step-by-step preview | `debug_v1.html`'s sandboxed real-game-iframe boot pattern |
| Drag-reorder list UI | `levelEditor.html`'s existing layer-order interaction |
| Undo/redo | The shared history-stack code every other editor already uses |
| Known `storyFlags` names for autocomplete | A small generated list (grep `storyFlags\.\w+` across `game/*.js` once, refresh occasionally — doesn't need to be live-computed every load) |
| Safe-path-plus-escape-hatch pattern for uneditable content | `enemy_designer.html`'s existing raw-JSON-box precedent for anything outside its guided fields |
| Non-destructive export | Same paste-ready JSON/JS pattern as every other tool here |

## 6. Scope staging

- **v1**: step list authoring (add/reorder/edit/delete for `wait`/`text`/`cameraPan`/
  `cameraReturn`/`movePlayer`/`setFlag`), export. Covers the bulk of likely near-term
  content (most planned lore-pip visuals in `lore.md`'s table are simple
  Overlay/Cutscene beats, not branching choices).
- **v2**: `choice` step authoring (nested branch editing) and the live real-game-iframe
  preview (§4) — the preview is the more involved half of this tool, reasonable to
  stage after basic list-editing works.
- **v3 (only if `call` steps keep needing new preset kinds)**: grow the preset library
  in §3 as new `call` patterns show up in practice, rather than trying to anticipate
  every possible one up front.
- **Explicitly out of scope**: this tool doesn't decide *where* a cutscene triggers in
  the world — that's `Plans/archive/room_scene_editor_plan.md`'s `cutsceneTriggers[]` job (§4
  of that doc). The two tools are complementary: this one authors *what* a cutscene
  key contains, that one places *where* a key fires.

## 7. Open questions for the user before building

1. Is the real-game-iframe preview (§4) worth its build cost for v1, or is a cheaper
   "just read the step list back as plain text/a mocked-up sequence" preview acceptable
   until v2? Recommend the cheap version first, upgrade later — matches this session's
   general "stage the expensive part second" pattern across all 4 plans.
2. Confirm the `call`-step preset list in §3 should start from exactly the 3 patterns
   already used in the existing 3 cutscenes (grant-ability-adjacent, companion-state,
   Fracture-max-increment) rather than guessing at others not yet needed.
