# Session Priorities — Clear Prompts in Recommended Order

Each prompt is self-contained; Fable can pick one and execute it end-to-end. After each item, move to the next prompt and update `roadmap.md` with what was accomplished (same style as existing entries — checkbox + prose note).

---

## 1. Bug Fixes + Debug Tools Organization

Fix the pre-existing debug-tool issues and audit the toolchain for silent breakage:

- Attach `window.abilityState = abilityState` at the bottom of `ability.js` (same guard pattern as the `window.AREAS` fix in `area.js`), so `debug_v1.html`'s R10 and beyond can read ability state from the sandboxed iframe.
- Run `debug_v1.html` headless in the test console and confirm R01–R14 pass (all 14 rooms, no crashes). Note any remaining errors so we don't re-investigate them.
- Do a quick pass: check that `levelEditor.html`, `enemy_test.html`, and `worldmap.html` all load without console errors on a fresh page load.
- Document any silent regressions you find in `roadmap.md` Phase 8 so future sessions know about them.

---

## 2. Map Skeleton: 13 Regions, Empty Rooms, Ability Redistribution

Build the base topology without art; prioritize non-linearity over verticality:

- Decide on 2–3 anchor regions (besides Crag, which already exists) to start with — something like Event Horizon (gravity), Mirror Veil (echo), and one more from `expansion.md` §3.13b.
- For each anchor region: create 4–7 empty rooms (flat platforms + doors only, no enemies/pickups yet) following the "few large rooms" pattern from `CLAUDE.md`. Each room gets `col`/`row` grid coordinates, real `connections[]` entries (not placeholder transitions), and a `region` name.
- Redistribute all ability rewards from the current spine-linear layout to their actual regions per `expansion.md` §3.14 (e.g., Phase Dash goes to Event Horizon, Shard Shot to Mirror Veil). Don't re-award abilities the player already has; mark gated rooms correctly with `requires`.
- Run `validateAreaGraph()` and `validateAllRoomLayouts()` after each region — no green lights until the linter passes clean on all newly-added rooms.
- Test in the real game: verify you can walk/dash/phase through the new doors, collect the redistributed abilities in the right rooms, and that the map overlay shows your new grid positions.

---

## 3. Room Verification Tool: Dynamic Bot-Walker Half

Build the missing half of the room linter — a headless bot that walks every real path a player might take and reports soft-locks:

- Refer to `Plans/room_verification_tool_plan.md` (the "dynamic bot walker" section) for the design.
- Implement `walkRoomHeadless(room)`: spawn a player at each `entry point` from the static linter's pass, run the game loop for ~300 frames, and report:
  - Does the player reach the room's `goal` (a marked platform, or a specific ability/enemy/anchor)?
  - Does any transition fire without the player being at the right door?
  - Are there any jumps/dashes that land the player in a softlock position (ledge too high, gap too wide)?
  - Return a simple `{ reachable: bool, softlocks: [positions], unexpectedTransitions: [list] }` per entry point.
- Integrate into `validateAllRoomLayouts()` so it runs after the static checks (or as an opt-in flag).
- Test on the 3 anchor regions from priority #2 and Crag (since Crag already passed the static linter, the bot should confirm no soft-locks there).

---

## 4. Room Aesthetics: Generative Cave Style + Recognizable Doors

Build a visual system so rooms feel like caves, not platform puzzles, and doors are clearly entrances/exits:

- Pick your 2–3 anchor regions and design a visual identity per region: Crag (teal crystal + dark stone), Event Horizon (purple gravity distortion), Mirror Veil (cyan echo + reflective surfaces), etc. Palette + edge treatment rules (platform jaggedness, crystal cluster density).
- Write a shared decoration function `decorateRoomForRegion(ctx, room, region)` in `game.js` that takes the room and region name and draws:
  - Platform edges: add per-region jitter/crystals/glow (no geometry change, just visual)
  - Ambient glow/shadows that reinforce the region's mood
  - Region-specific tile/gradient pattern as a subtle background texture.
- Replace the hardcoded floating rectangles for doors (in `game.js`'s `drawTransitions()`) with recognizable cave-mouth shapes: arched stone entrance for regular doors, glowing portal for ability gates, one-way arrow for shortcuts. Tint by region.
- Apply the system to all rooms in the 2–3 anchor regions — verify they look cohesive and doors are immediately obvious.

---

## 5. Enemy Roster + Enemy Editor

Expand the enemy roster and build an in-browser editor for rapid iteration:

- Pick 4–6 enemies from `expansion.md` §4 that you haven't built yet (e.g., Stalker, Null Sentinel, Polarity Drone, or others) and implement them in `enemy.js` following the pattern of Fractured/Stutterer — class, stats, update loop, attack pattern, hit feedback.
- Create `enemy_editor.html` following the pattern of `levelEditor.html`: a visual grid where you can select an enemy type, set its stats (hp, speed, attack cooldown, etc.), assign it an ability loadout, and hit "Test" to spawn it in `enemy_test.html`.
- Add a "Save JSON" export so you can paste enemy definitions back into `enemy.js`'s roster comment or a separate file.
- Test each new enemy in `enemy_test.html` against 2–3 ability loadouts; refine stats if any feel too easy or impossible. Document balance decisions in `roadmap.md`.

---

## 6. Performance Pass + Game Feel

Profile and optimize, then tune feel (hitstop, screenshake, attack feedback):

- Use Chrome DevTools / Firefox Profiler to record a full playthrough of Crag (all 4 rooms) and identify frame drops. Log the culprits (physics loop, draw calls, particle spawning, etc.) with frame counts in `roadmap.md`.
- Optimize the top 2–3 bottlenecks (e.g., reduce per-frame allocations per `performanceInstructions.md`, batch draw calls, check for hidden loops).
- Once stable at 60fps, tune "feel": increase hitstop duration for melee hits by 2–3 frames, add subtle camera shake on player landing, add dust particles on dash. Small values only — measure against the Celeste/HLD reference feeling.
- Test the King fight and a miniboss to confirm the changes land well and don't introduce new frame drops.

---

## 7. SFX Sandbox + Audio Rework

Redesign audio per the existing plan in `roadmap.md` Phase 5.2a:

- Refer to `Plans/` (or the section in `roadmap.md`) for the audio design requirements — region-specific drones, attack feedback synthesis, Stillpoint hum, etc.
- Rewrite the Web Audio synthesis in `audio.js` to support region-dependent drone layers (query `getCurrentArea()` and use its `ambientColor`/region to pick a synth timbre).
- Add attack-hit feedback: a short, punchy click/beep that varies by damage dealt (normal/heavy/Stillpoint). Keep CPU cost low.
- Add Stillpoint activation hum (a lower-register drone that blends with the existing region music, no standalone track).
- Test in the full game (Crag + King fight) and tune volumes/timbre so nothing feels harsh or drowns out gameplay.

---

## 8. Linter Integration into Level Editor

Surface the room verification tool inside the editor workflow:

- Add a "Validate Room" button to `levelEditor.html` (beside or below the "Export JSON" button) that runs `validateRoomLayout(currentRoom)` on the room the user is editing *without* leaving the editor.
- Display the linter output inline: a green checkmark if pass, red error list if fail. Highlight unreachable platforms or bad door placements in red on the canvas.
- Keep a "Validate All" button for batch-checking all edited rooms at once before committing to `area.js`.
- Test by building one new room in the editor, hitting "Validate Room," fixing any linter errors, then exporting — should work end-to-end.

---

## Summary

These 8 tasks unlock the non-linear map structure, fill it with polish and content, and leave debug tooling in a reliable state for the next phase (building out all 13 regions in parallel). Each one updates `roadmap.md` on completion.
