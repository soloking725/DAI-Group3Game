# CLAUDE – GAME DEV PERMANENT INSTRUCTIONS

## 0. CORE PRINCIPLE (READ FIRST)
Before you write a single line of code, answer these 3 questions in your head:
1. **Will this hurt framerate?** (If yes, design a cheaper way.)
2. **Will this make the codebase harder to navigate?** (If yes, refactor or split.)
3. **Does this break existing debug/editor tools?** (If yes, update them first.)

---

## 1. PERFORMANCE – LAG & FRAMERATE
- **Profile before optimizing** – never guess. Use in-engine profiler (Unity/Unreal/Godot) or custom timers.
- **Avoid per‑frame allocations** – cache references, use object pools, reuse collections.
- **Update frequency** – move expensive logic to `FixedUpdate` (physics) or co‑routines / timers (e.g., run AI every 5 frames, not every frame).
- **Batching** – check draw calls, use GPU instancing, combine meshes, reduce materials.
- **Memory** – watch for memory leaks (unsubscribed events, lingering references). Suggest `WeakReference` or cleanup callbacks.
- **If you spot O(n²) or O(n³) loops in hot paths** – immediately flag and propose a spatial hash / octree / grid.

---

## 2. CODE ORGANIZATION – STOP WASTING TIME SEARCHING
- **Single Responsibility** – each file/class should have ONE clear job.
- **Naming** – use descriptive, search‑friendly names. Avoid abbreviations unless industry‑standard (e.g., `Rigidbody2D`).
- **Group by feature, NOT by type** – put all player-related scripts in a `Player/` folder, all UI in `UI/`, etc. (this is a guideline, not a mandate – adapt to your existing structure).
- **Comments** – comment the *why*, not the *what*. Add `// TODO:` or `// OPTIMIZE:` for known future work.
- **When you see a file > 800 lines** – ask: *“Does this truly need to be this big?”* If not, suggest splitting. But **only split if**:
  - The file has multiple distinct responsibilities.
  - The split reduces cognitive load and makes testing easier.
  - The split does NOT create circular dependencies or unnecessary indirection.
- **If you decide to split** – provide a clear mapping (old → new files) so I can update project references.

---

## 3. KEEP THE “PLAN” UP‑TO‑DATE
I maintain a `GAME_PLAN.md` in the root. Whenever you:
- Add a new system
- Change a core mechanic
- Deprecate an old feature
- Restructure folders

→ **Update `GAME_PLAN.md`** with:
- What changed
- Why it changed
- Any new dependencies or entry points

If `GAME_PLAN.md` doesn’t exist yet, create it with:
- High‑level architecture (scenes, managers, data flow)
- Current milestone / next goal
- Known technical debt

---

## 4. DEBUG TOOLS – KEEP THEM WORKING & EXTEND
- **Never break the debug overlay / console** – if your change touches input, rendering, or logging, test the debug tools manually.
- **If you add a new system**, add a corresponding debug command or visualizer (e.g., `-show_ai_paths`, `-toggle_physics_debug`).
- **If a debug tool becomes outdated**, either fix it or add a `// DEPRECATED` comment with the new replacement.

**Level Editor** (if exists):
- Any change to serialization, transforms, or prefab instantiation **must** be tested with the level editor.
- If the level editor relies on a specific data format, do not change that format without providing a migration script or fallback.

---

## 5. RESPONSIBILITY CHECKLIST (BEFORE SUBMITTING CODE)
- [ ] Does this run at 60+ FPS on the target hardware? (If unsure, add a performance comment and suggest a stress test.)
- [ ] Are there new allocations in `Update()`? If yes, cache them.
- [ ] Is every new file placed in a logical, searchable location?
- [ ] Did I update `GAME_PLAN.md`?
- [ ] Did I test at least one debug command / editor function?
- [ ] If I split a big file, did I verify no broken references?

---

## 6. WHEN IN DOUBT – ASK ME
If you are unsure whether a refactor is worth it, propose two options:
- **Option A** – quick fix (minimum changes).
- **Option B** – clean refactor (includes splitting, updating tools, docs).

Tell me the trade‑offs (time, risk, performance gain) and let me decide.

---

**END OF INSTRUCTIONS**