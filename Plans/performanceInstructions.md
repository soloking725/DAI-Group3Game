# Performance & Engineering Discipline — Stillpoint

Standing rules for every session working on this vanilla HTML5 Canvas/JS
codebase (no engine, no build step — see `CLAUDE.md`). Treat as binding
per `CLAUDE.md`'s "read these first" list.

## 0. CORE PRINCIPLE (READ FIRST)
Before you write a single line of code, answer these 3 questions in your head:
1. **Will this hurt framerate?** (If yes, design a cheaper way.)
2. **Will this make the codebase harder to navigate?** (If yes, refactor or split.)
3. **Does this break existing debug/editor tools?** (If yes, update them first.)

---

## 1. PERFORMANCE – LAG & FRAMERATE
- **Profile before optimizing** – never guess. Use Chrome/Firefox DevTools'
  Performance tab (see `BUG_ANALYSIS_AND_QA_PLAN.md` §4 for the exact steps)
  or custom `performance.now()` timers.
- **Avoid per‑frame allocations** – cache references, reuse arrays/objects
  instead of allocating new ones inside `update()`/`draw()` every frame.
- **Update frequency** – expensive logic that doesn't need to run every
  frame (e.g. AI decisions, distant-enemy checks) should run every N frames
  via a counter, not unconditionally in the main loop.
- **Canvas draw calls** – batch similar draws where cheap to do so, avoid
  redundant `save()`/`restore()`, avoid `getImageData`/`putImageData` in
  hot paths.
- **Memory** – watch for leaks (event listeners never removed, arrays that
  only grow — e.g. `projectiles[]`/particle arrays must actually splice out
  dead entries every frame).
- **If you spot O(n²) or worse in a hot path** (e.g. every-enemy-vs-every-
  projectile collision checks) – flag it and propose a cheaper structure
  (spatial grid, early-exit distance check) before it becomes a real
  bottleneck at higher enemy/particle counts.

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

## 3. KEEP `roadmap.md` UP‑TO‑DATE
`Plans/roadmap.md` is this project's living dev-status doc (not a separate
`GAME_PLAN.md` — this file used to reference that name; it doesn't exist in
this repo). Whenever you:
- Add a new system
- Change a core mechanic
- Deprecate an old feature
- Fix a non-trivial bug

→ **Update `roadmap.md`** in the same style as its existing entries
(checkbox + a short prose note — what changed, why, what's still open),
not just a checkbox flip. See `CLAUDE.md`'s "read these first" section for
how the doc set fits together.

---

## 4. DEBUG TOOLS – KEEP THEM WORKING & EXTEND
- **Never break the debug tools** – `debug_v1.html`,
  `levelEditor.html`, `enemy_test.html`, `enemy_editor.html`
  (full list and what each does in `CLAUDE.md`'s "Dev/debug tooling"
  section). If your change touches input handling, area data shape, or adds
  a new game state, run the relevant page manually and check the console.
- **If you add a new system** (a new ability, enemy type, room field),
  check whether an existing tool needs updating to know about it (e.g. a
  new enemy type needs adding to `enemy_test.html`'s `CLASS_MAP` and
  `levelEditor.html`'s palette — see `CLAUDE.md`'s note that the palette is
  currently stale, a real gap).
- **`levelEditor.html`**: exported room JSON must be pasted into `area.js`
  by hand (not live-synced) — if you change the room data shape, the
  editor's export needs to match or its output silently won't paste in
  cleanly.

---

## 5. RESPONSIBILITY CHECKLIST (BEFORE SUBMITTING CODE)
- [ ] Does this hold 60fps? (If unsure, note it and suggest a stress test —
      see `BUG_ANALYSIS_AND_QA_PLAN.md` §4 for profiling steps.)
- [ ] Are there new allocations inside `update()`/`draw()` every frame? If
      yes, cache them.
- [ ] Did I update `roadmap.md`?
- [ ] Did I test at least one relevant debug tool (see §4)?
- [ ] If I split a big file, did I verify `index.html`'s `<script>` load
      order still resolves (see `CLAUDE.md`'s architecture map — order
      matters, globals depend on earlier files)?

---

## 6. WHEN IN DOUBT – ASK ME
If you are unsure whether a refactor is worth it, propose two options:
- **Option A** – quick fix (minimum changes).
- **Option B** – clean refactor (includes splitting, updating tools, docs).

Tell me the trade‑offs (time, risk, performance gain) and let me decide.

---

**END OF INSTRUCTIONS**