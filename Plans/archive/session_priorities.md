# Session Priorities — Clear Prompts in Recommended Order

Each prompt is self-contained; Fable can pick one and execute it end-to-end. After each item, move to the next prompt and update `roadmap.md` with what was accomplished (same style as existing entries — checkbox + prose note).

This is a session docket, not a standing design doc (see `CLAUDE.md`'s note
on this file) — items 1, 2, 5, and 8 below are **done** (see `roadmap.md`
Phases 8, 9, 10, and 12 respectively) and have been trimmed from this list;
only the still-outstanding items remain. Once #3/#4/#6/#7 are all
consumed too, retire this file entirely and fold anything still useful
into `roadmap.md`.

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

## 4. Room Aesthetics: Generative Cave Style + Recognizable Doors — DONE, see `roadmap.md` Phase 9 ("Task 4")

`REGION_STYLES`/`decorateRoomForRegion()`/`decoratePlatformForRegion()`/
`drawDoor()` in `game.js` cover this (palette + ambient effect + edge
treatment per region, cave-mouth/portal/shortcut door shapes replacing the
old flat rectangles). Not yet confirmed to *look* good in a live browser —
see roadmap.md's "NEXT SESSION SHOULD" note — but the system itself is
built, not still on this docket.

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

## Summary

Originally 8 tasks; 1, 2, 4, 5, and 8 are done (see `roadmap.md` Phases
8–10 and 12). Remaining: 3 (bot-walker), 6 (perf/feel), 7 (audio rework).
Each one updates `roadmap.md` on completion; once all are consumed, retire
this file per the note at the top.
