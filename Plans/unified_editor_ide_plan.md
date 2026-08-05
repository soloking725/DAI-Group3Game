# Unified Editor IDE — a Godot/Unity-style desktop shell (Milestones 1-3 built)

Status: proposed 2026-08-04, from a question raised while working on
`editor/*.html` gap-fixes in the same session as `Plans/fight_ambience_plan.md`.
Wrapper technology decided 2026-08-04: **Electron** (see "Electron vs.
Tauri vs. NW.js" below — chosen over the doc's original NW.js lean once
the iframe/Node-context interaction with `debug_v1.html`/`debug_v2.html`
was identified as a real risk, not a formality).

**Built the same day, across three follow-up rounds**: Milestone 1
(packaging — `npm start` opens the whole editor suite as one Electron
window, user-verified against the real debug harnesses) and most of
Milestone 2 (the AST-based save engine — see "Milestone 2 status" below
for exactly which of the ~9 real save targets are wired vs. still open).

**Milestone 3 built 2026-08-04**, in a follow-up round after the user
asked for it directly (same pattern as 1-2 — this stayed the kind of "big
refactor" CLAUDE.md's performance instructions say to check in about
first, never an assumed default). Real tabs (`editor_shell/tabManager.js`,
`editor_shell/shell.html`) replaced Milestone 1's single window that
navigated in place, and `DevContext` (`game/devContext.js`) became a
real main-process-owned shared state object
(`editor_shell/devContextStore.js`, persisted to disk, pushed live to
every open tab) instead of relying on localStorage + the browser's
`storage` event. See "Milestone 3 architecture" below for what was built
and, per this repo's standing no-browser-testing rule, what's still on
the user to click-test.

## The question this answers

"Can we make the 26 `editor/*.html` dev tools into one unified app I can
open, like Godot or Unity, instead of a browser tab per tool?" — **yes,
technically.** This doc scopes what that actually takes and, just as
importantly, what it does *not* fix on its own.

## What's true today (read from the actual code)

- **26 standalone HTML tools** in `editor/` (`ls editor/*.html | wc -l`), 22
  linked from `dev_hub.html`'s `TOOLS` array, plus `dev_hub.html` itself,
  `audio_ab_tester.html`, and `asset_browser.html` (reachable directly, not
  in the launcher list). Every tool is plain HTML + `<script src="...">` +
  inline `<script>` — no build step, no bundler, no framework. This matters
  a lot for feasibility: an Electron/Tauri wrapper can load these files
  **completely unchanged** as its first milestone.
- **No `package.json` exists anywhere in this repo yet** — confirmed via
  `find . -maxdepth 1 -iname package.json`. This is a genuinely fresh
  addition, not "there's already tooling scaffolding to build on."
- **`npm` is installed** (`npm --version` → 10.9.8, confirmed 2026-08-04) —
  no separate install step needed before `npm init`/`npm install electron`.
- **6 of the 26 tools embed iframes**: `debug_v1.html`, `debug_v2.html`,
  `dev_hub.html`, `cutscene_editor.html`, `enemy_designer.html`,
  `room_scene_editor.html`. This matters for the wrapper choice below —
  `debug_v1.html`/`debug_v2.html` specifically boot the real game inside a
  sandboxed iframe (`srcdoc`, path-rewritten) and reach into its
  script-scoped state via indirect `eval`; anything that changes what
  Node/context access an iframe has relative to its parent is a direct risk
  to the QA workflow those two tools provide, not a cosmetic concern.
- **Node is already a project dependency in practice**, just not declared —
  `editor/save-server.js`, `Plans/room_verify_cli.js`,
  `Plans/room_difficulty_calculator.js`, and others already assume a local
  `node` (confirmed `node --version` → v22.23.1 works in this environment).
  Electron ships its own bundled Node/Chromium, so this is a smooth fit, not
  a new runtime being introduced.
- **Rust/Cargo are NOT installed** (`which rustc cargo` → not found). Tauri
  needs a Rust toolchain to build; Electron doesn't. This is the single
  biggest practical tiebreaker below.
- **`editor/save-server.js` is the only existing "app-like" piece** — a
  plain Node `http.createServer` on port 8787, with hand-written routes:
  two `LAYOUTS` entries that regex-patch one `const NAME = {...}` block in
  one target file each (HUD/inventory layouts), `/save-art-image` (writes a
  binary PNG from a `data:` URL), and `/apply-audio-pick` (added this
  session — copies one audio file over another). Every editor that *isn't*
  wired to one of these routes falls back to copy-paste "Export JSON."
- **~25 `localStorage` keys** (`stillpoint_*` — area/anim/combo/HUD/
  inventory/cutscene/region-style/quest/vision/dialogue/flag-meta overrides,
  `stillpoint_dev_context`, keybinds, settings, recent-tools, plus
  IndexedDB-backed `RoomImageStore`/`AnimImageStore` for working-draft
  images) are how tools currently hand data to each other and to the real
  game (`index.html` reads override keys at boot). **All of this only works
  because every tool is served from the same origin** (either `file://` in
  the same directory, or `http://localhost:8787`) — `localStorage`/
  `IndexedDB` are origin-scoped. This is the load-bearing fact for the
  architecture section below.
- **`dev_hub.html`'s own `DevContext` module** (`game/devContext.js`) is
  already a shared "what am I working on" state object, cross-tool activity
  log, and deep-link (`?room=`/`?enemy=`/`?anim=`/...) system — i.e. this
  repo already has a primitive, localStorage-backed version of what a real
  IDE's shared session state would be. A unified shell doesn't need to
  invent this concept, just give it a better home than `localStorage`.

## What a desktop shell actually buys

- One app to open — no `python3 -m http.server`, no separately remembering
  to `node editor/save-server.js`, no "only works through localhost:8787,
  not file://" caveat repeated across half the editor tooltips.
- Native file I/O via Node's `fs` in the main process, replacing
  `save-server.js`'s HTTP+CORS roundtrip — same underlying Node APIs
  (`fs.readFileSync`/`writeFileSync`/`copyFileSync`), called via Electron
  IPC instead of `fetch()`. Removes the "is the server running" failure
  mode entirely.
- A real app shell — persistent multi-panel/tabbed layout instead of 22
  independent browser tabs, `DevContext` becoming real in-process shared
  state (or a small local DB) instead of a `localStorage` polling pattern.
- Consistent origin by construction (see below), so the current
  same-origin fragility (things silently breaking if a tool is opened via
  `file://` in one browser tab and `localhost:8787` in another) goes away.

## What it does NOT buy — updated 2026-08-04, this got solved

The reason "not every editor can use save-server well" (this session's
earlier finding) wasn't a *transport* problem, it was a *data-format*
problem: `save-server.js`'s `patchLayoutBlock()` only worked because HUD/
inventory layouts are one flat, simple `const NAME = {...}` object, patched
line-by-line via regex. `levelEditor.html`'s `AREAS` object (73 rooms,
nested arrays, 201 hand-written comments scattered through `area.js`) and
`cutscene_editor.js`'s branching step trees need a round-trip-preserving
*parser*, not a smarter regex — switching `fetch(...)` to
`ipcRenderer.invoke(...)` alone would not have made that easier.

**Solved via AST-based patching (`editor_shell/constPatcher.js`,
`recast` + `@babel/parser`)**, not string/regex patching. Five modes,
grown as each new target's shape demanded one:
- `syncTopLevelObjectKeys` (**sync**) — whole-flat-object sync
  (add/update/remove top-level keys), the direct AST equivalent of the
  old `patchLayoutBlock`, now handling arbitrarily nested values
  correctly. Used for `hudLayout`/`inventoryLayout`.
- `patchPathInFile` (**path**) — replaces a value at one nested path
  (e.g. `spawn_area_1.name` inside `AREAS`) and touches *nothing* else in
  the file, AST node for AST node. Used for `areas`, `animDefs`,
  `regionStyles`, `cutscenes`. **Verified**: patching one room's `name`
  and one platform's `h` in the real `game/area.js` left all 201 comments
  byte-identical and changed only the 2 touched lines.
- `patchConstInFile` (**whole**) — replaces an entire const's value in
  one shot. Only safe for consts verified to have zero internal comments
  (checked per-target before use, not assumed) — used for
  `bossPhaseConfig` and, generically, for each individual scalar var
  under **rawVar** below.
- `patchArrayElementByKey` (**arrayByKey**) — for array-shaped consts
  (`COMBO_DEFS`), where array index isn't a safe address (it shifts as
  elements are added/removed/reordered) — addresses elements by a stable
  key field (`id`) instead. Used for `comboDefs`.
- **rawVar** (`enemyStatVar` target, via `patchConstInFile` on a
  renderer-named-but-server-allowlisted variable) — for consts that
  aren't a single object/array at all, but many independent top-level
  scalars (`enemy.js`'s `const LANCER_HEALTH = 10;` and 14 siblings).
  The safety-relevant discovery here: several enemy TYPES share the same
  backing variable (`ENEMY_ATTACK_COOLDOWN` alone backs 7 different
  enemies) — `enemy_editor.html` computes the full sibling map at load
  and requires explicit confirmation naming every affected sibling before
  writing, so a "per-enemy" save can't silently change enemies the user
  isn't looking at.

**Milestone 2 status — wired vs. still open, as of 2026-08-04:**

| Target | Editor | Mode | Verified against real file? |
|---|---|---|---|
| `hudLayout` | `hud_editor.html` | sync | ✅ (117 comments preserved) |
| `inventoryLayout` | `inventory_editor.html` | sync | ✅ (83 comments preserved) |
| `areas` | `levelEditor.html`, `room_scene_editor.js` | path | ✅ (201 comments preserved) |
| `animDefs` | `anim_editor.html` | path | ✅ (202 comments preserved) |
| `bossPhaseConfig` | `boss_phase_editor.html` (Sovereign only) | whole | ✅ |
| `regionStyles` | `room_scene_editor.js` | path | ✅ (402 comments preserved) |
| `cutscenes` | `cutscene_editor.js` | path | ✅ (119 comments preserved, incl. a `call` step's raw function code) |
| `comboDefs` | `combo_editor.html` | arrayByKey | ✅ |
| `enemyStatVar` | `enemy_editor.html` | rawVar | ✅ (1727 comments preserved) |
| art-image save, audio-pick apply | anim/room-scene/audio_ab_tester | (ported verbatim from `save-server.js`, no AST) | ✅ (`save-server.js` itself confirmed untouched/still-live) |
| asset index generation | `asset_browser.html` | (`execFileSync('node', ['asset_index.js', '--json'])`, no AST — read-only) | ✅ (ran the exact IPC call headlessly, parsed the real repo's index, 6 namespaces returned correctly) |
| `QUESTS`/`VISIONS`/`NPC_DIALOGUE`/`STORY_FLAG_META` | `plotline_editor.html` | — | **deliberately not wired** — CLAUDE.md flags these as still-unwired, pre-content infra |
| `enemy_designer.html`'s ad-hoc defs | `enemy_designer.html` | — | **deliberately not wired** — no fixed registry to write into, by its own design (its code comment says so); Export JSON is already the correct end state |
| `rename_asset.js`'s `--write` mode | `asset_browser.html` | — | **deliberately not wired** — this is a project-wide identifier rewrite across `game/`+`editor/` plus a `git mv` on the backing asset file, a meaningfully bigger trust jump than any const-value patch above. The tool's own hint text already says "this page never writes to disk itself" as an intentional design choice, not a gap — automating it wasn't assumed, only asked about. "Generate index" (read-only) is wired; "copy rename cmd" (manual, unchanged) still is too. |

Every "✅" above means: a real production save call was made against the
actual repo file (not a scratch copy), the write was confirmed to land,
and the file was restored to its exact original byte content afterward —
verified via direct comparison, a repo-wide grep for leaked test markers,
and a check for stray `.bak` files. **Not verified**: the actual click
path inside the running app (button → confirm dialog → success message).
That remains on the user to confirm, per this repo's standing
no-browser-testing rule — re-affirmed this session when asked directly to
test the GUI, and declined for the same reason each earlier time.

A shared `game/writeGuard.js` (`findNonFiniteNumber()`) is called before
every write path above — `JSON.stringify` silently turns `NaN`/`Infinity`
into `null`, so a garbled `<input type="number">` field could otherwise
corrupt a real game constant with no error. Every write path now refuses
and names the exact bad field instead.

## Electron vs. Tauri vs. NW.js

| | Electron | Tauri | NW.js |
|---|---|---|---|
| New toolchain required | None — reuses Node already used by `save-server.js`/CLI scripts | Rust + Cargo, not currently installed in this environment | None — same Node/npm story as Electron |
| Bundle size | Large (ships Chromium + Node per app) | Small (uses the OS's native webview) | Large (ships Chromium + Node, same as Electron) |
| Renderer's access to Node APIs | Isolated by default (`contextIsolation: true`) — a renderer script can't call `require('fs')` directly; needs a `preload` script + `ipcRenderer`/`ipcMain` bridge | Renderer talks to Rust commands via `invoke()`, conceptually the same bridge shape as Electron's IPC | **Every page's own `<script>` can call `require('fs')` (or any Node module) directly, no bridge, no preload, no IPC layer** — this is NW.js's defining difference from the other two |
| Maturity / ecosystem | Very common pattern (VS Code, Figma desktop, Obsidian) — most examples, most active security patching | Newer, smaller ecosystem, same wrap-a-web-app pattern works but fewer worked examples | Smaller community than Electron, slower release cadence — still maintained, but "one person's side project got popular" energy vs. Electron's much larger backing |
| Fit for **this specific codebase** | Good, but Milestone 2 (porting `save-server.js`'s routes) means writing an IPC bridge — new code, new pattern, on top of 26 files that have never used IPC | Same IPC-bridge requirement as Electron, plus the new Rust toolchain | **All 26 editor tools are already plain `<script>` tags with inline JS that already knows how to read/write via `fetch()`+HTTP — with NW.js, `saveToFile()`/`applyAudioPick()`-style functions could call `fs.writeFileSync` straight from the page's own existing script, deleting the HTTP roundtrip (and `save-server.js` itself) rather than re-implementing it as IPC.** This is a real reduction in Milestone 2's scope, not just a style preference. |

**Decision (2026-08-04): Electron.** NW.js's "every script gets `fs` for
free, no IPC to design" pitch was the original draw, but it has a real
downside the first draft of this doc missed: NW.js gives Node context to
*everything* by default, including iframes — and 6 of the 26 tools embed
iframes, two of which (`debug_v1.html`, `debug_v2.html`) are the core QA
harnesses, booting the real game in a sandboxed iframe and reaching into
its script-scoped state via indirect `eval`. Whether that harness behaves
identically once the host page has ambient Node access is genuinely
unclear and would need to be verified, not assumed.

Electron's default posture — `contextIsolation: true`, `nodeIntegration:
false` — sidesteps this cleanly: nothing gets direct `fs` access anywhere,
iframes included, unless it goes through a `preload` script's IPC bridge
explicitly wired up for that one page. `debug_v1.html`/`debug_v2.html`'s
iframe-`eval` harness then runs in an environment identical to plain
Chrome, because there's no ambient Node context to interact with it at
all. The save-server-equivalent calls live in the *top-level* tool page's
own preload/IPC call, never inside the iframe, so there's no overlap to
worry about.

The tradeoff this accepts: Milestone 2 (below) now means writing an actual
IPC bridge (`preload.js` + `ipcMain`/`ipcRenderer` per save-server-backed
tool) instead of a direct `require('fs')` call — genuinely more code than
the NW.js path would have needed. In exchange: Electron's ecosystem/
security-patch cadence is the most active of the three by a wide margin
(VS Code, Figma, Obsidian all ship on it), which matters more for
something that becomes long-lived dev infrastructure than saving a
milestone's worth of IPC boilerplate. Tauri stays ruled out for the same
reason as before (Rust toolchain not installed, doesn't uniquely solve
anything here that Electron doesn't).

## Should the game and the editor IDE share the same wrapper?

**Not necessarily the same build target, even though both would use
Electron.** Nothing requires the editor shell and a future game desktop
wrap to be the same app or share configuration.

- **The editor IDE** is 100% local, developer-only, never distributed to
  players. `contextIsolation`/`nodeIntegration:false` with an explicit
  `preload` bridge (see architecture sketch above) is still the right
  default even though there's no untrusted content ever loaded — it's what
  avoids the iframe-ambiguity problem, not a security boundary being
  defended against real risk here. Nothing about being dev-only argues for
  loosening it.
- **The game** (`index.html`), if it ever gets the desktop wrap CLAUDE.md
  already names as the agreed *later* path, is a shipped, distributed
  artifact with different priorities: it doesn't need raw `fs` access from
  its own script at all (saves already go through `localStorage`, same as
  the browser version), and bundle size / auto-update / code-signing for a
  player-facing download matter there in a way they don't for a local dev
  tool. Tauri's small binary size could still make sense for the game
  specifically even with Electron chosen for the editor here.

Picking Electron for the editor now doesn't lock in Electron for the
game's eventual wrap, and vice versa — these are two separate decisions
with two different priority lists, and this repo's own docs already treat
the game's desktop wrap as a distinct, later, separately-scoped decision
from anything in this doc.

## Architecture sketch (Electron)

1. **One `package.json`** (`npm init` — the first this repo will have),
   `main` field pointing at a new small `main.js` (the Electron main
   process — creates the `BrowserWindow`, nothing else at Milestone 1).
   `contextIsolation: true`, `nodeIntegration: false` on every
   `BrowserWindow` — the default posture, kept deliberately rather than
   loosened, since loosening it is exactly what would reintroduce the
   iframe-ambiguity problem NW.js had.
2. **Shell page**: `main.js` loads `dev_hub.html` (or a new shell page
   inspired by it) as the app's home view. Each tool opens either as a new
   `BrowserWindow` or as a tab within one window — either way, **every
   window is part of the same app, same origin by construction** (loaded
   via a custom `app://` protocol or `file://` registered consistently, not
   ad-hoc), so the `localStorage`/IndexedDB sharing that already works
   today under one `http://localhost:8787` origin keeps working, just
   under a different origin scheme. This does need one small piece of new
   plumbing NW.js wouldn't have (registering the custom protocol
   consistently across every window) — the doc's original NW.js draft
   undercounted this as "zero extra work"; it's small, but not nothing.
3. **`save-server.js`'s routes become a `preload.js` + IPC bridge**, not a
   direct call: `editor/save-server.js`'s route handlers
   (`handleSave`/`handleSaveArtImage`/`handleApplyAudioPick`) are already
   plain Node functions operating on `fs`/`path` — under Electron, each
   gets registered once as an `ipcMain.handle('save:layout', ...)`-style
   channel in `main.js`, and each editor's existing `saveToFile()`/
   `applyAudioPick()`-style function calls it via
   `window.electronAPI.saveLayout(...)` (exposed through a `preload.js`
   using `contextBridge.exposeInMainWorld`, one bridge function per
   save-server route, scoped only to the tools that need it). More code
   than NW.js's direct `require('fs')` call would have been, but the
   bridge surface is small (4 routes) and explicit. `save-server.js` itself
   can stay running in parallel during migration (see open question 3) or
   be deleted once every consuming tool has switched.
4. **The 26 tool files need zero changes for Milestone 1** — they already
   assume nothing about their host beyond "a browser-like environment with
   `fetch`, `localStorage`, `IndexedDB`, `<canvas>`," all of which
   Electron's Chromium-based `BrowserWindow` provides identically to a
   real browser. Only the 4 save-server-backed tools need edits, and only
   in Milestone 2.
5. **✅ Verified, 2026-08-04 — the prediction held.** User ran
   `debug_v1.html`/`debug_v2.html` inside the packaged app: `debug_v1.html`
   R01-R09/R11 passed (R10's failure was a pre-existing check quirk, not
   an Electron regression — every room failing identically at full health
   points at the check itself, not 55 real deaths); `debug_v2.html` ran
   all 102 checks with the same pass/fail split a plain-browser run would
   show (88 pass/7 warn/6 fail/1 skip, all pre-existing gameplay bugs
   unrelated to packaging). `contextIsolation`/`nodeIntegration` being off
   for iframes did keep the harness behaving identically to plain Chrome,
   as predicted.

## Suggested migration order (incremental, not big-bang)

1. **✅ Milestone 1 — DONE, user-verified 2026-08-04.** `npm init`, add `electron` as a dev
   dependency (first `package.json` this repo will have), a minimal
   `main.js` that opens `dev_hub.html` in a `BrowserWindow`
   (`contextIsolation: true`, `nodeIntegration: false`). Zero editor-file
   changes. Validates the whole approach cheaply — if something about
   running these 26 tools under Electron's Chromium build doesn't work
   identically to Chrome, this milestone finds out for a handful of config
   lines, before anything else is built on top. **Explicitly includes**
   running `debug_v1.html` and `debug_v2.html` inside the packaged app and
   confirming their iframe+`eval` harness still passes — this is the one
   behavior the doc can't fully guarantee from reading code alone, so
   verify it here rather than discovering a regression in Milestone 3. On
   macOS, expect (and don't be alarmed by) the unsigned-app Gatekeeper
   prompt on first launch of the packaged build — expected for a local dev
   tool, not a bug to chase.
2. **✅ Milestone 2 — done, see the status table above for exactly which
   targets (and the 2 deliberate exceptions).** Went further than
   "replace save-server's transport" originally scoped — turned out the
   real blocker wasn't transport at all (see "What it does NOT buy"
   above), so this became "build a real AST patch engine, then wire N
   editors to it," which is why 9 save-to-disk targets across 8 editors
   exist instead of the original 5-tool estimate. `asset_browser.html`
   is wired too, in the end — but for something different than this doc
   originally guessed: it turned out to be a read-only identifier-
   reference viewer over a CLI-generated index, not a file browser, so
   "wiring" it meant running `asset_index.js` directly instead of
   `<input type=file>`-loading a manually-generated JSON dump — not real
   filesystem browsing as originally assumed here. The old
   HTTP server keeps running in parallel exactly as planned — every wired
   editor still works in a plain browser tab with `save-server.js`
   running, confirmed live this session (see the roadmap entry for the
   specifics of that check).
3. **✅ Milestone 3 — done, 2026-08-04, scoped narrower than the doc's
   original open-ended framing.** Built: real tabs (not separate native
   windows, not one window navigating in place), `DevContext` as real
   main-process-owned shared state pushed live to every tab, and a proper
   app menu (File/Navigate, tab-aware). Not built, and deliberately left
   for a later round if wanted: multi-panel/split layouts (side-by-side
   tools) — tabs alone were the part of "feel like Godot/Unity" the user
   asked for; panels are a separate, larger UI project layered on the same
   `TabManager` foundation, not started here.
4. **✅ Resolved, not "out of scope" anymore**: the per-file save-format
   problem described in "What it does NOT buy" turned out to be the
   actual center of Milestone 2's real work, not a separate follow-up —
   see the AST-based patch engine above. `levelEditor.html` and
   `cutscene_editor.js` both have real writable-save support now.

## Milestone 3 architecture (built 2026-08-04)

- **`editor_shell/tabManager.js`** — one `WebContentsView` per tab, same
  `webPreferences` every tab already had under Milestone 1
  (`contextIsolation: true`, `nodeIntegration: false`, `preload:
  editor_shell/preload.js` — unchanged, so the save-target IPC bridge and
  `debug_v1.html`/`debug_v2.html`'s iframe+`eval` harness run in an
  identical environment to before, just inside a `WebContentsView` instead
  of the window's own root `webContents`). Views are layered onto
  `win.contentView` (only the active tab attached at a time — inactive
  tabs stay in memory, detached, so switching back doesn't reload/lose
  state) below a fixed 40px strip. `setWindowOpenHandler` on each tab now
  opens a *new tab* instead of navigating the current one away — this is
  what makes clicking a tool link from `dev_hub.html` feel like opening a
  document, not replacing the one you had open.
- **`editor_shell/shell.html` + `editor_shell/shell-preload.js`** — the
  window's own page is now just this tab strip (title per tab, close
  button, `+` new tab, back/forward/home/reload), styled with a small
  inline subset of `styles/design-system.css`'s tokens (not a full
  `<link>` — this page is chrome, not a tool). A separate, narrower
  preload (`shellAPI`, tab control only) from the one every tool tab gets
  (`stillpointAPI`, save targets + DevContext) — the strip never needs
  filesystem-write access.
- **`editor_shell/devContextStore.js`** — the main process's one
  authoritative `DevContext` copy, persisted as JSON in
  `app.getPath('userData')` (survives cache clears; doesn't depend on
  localStorage's per-origin/quota behavior at all). Every `get`/`set`/`log`
  call goes through `stillpointAPI.devContext.*` (added to
  `editor_shell/preload.js`) via new `ipcMain.handle('stillpoint:devContext*', ...)`
  channels in `editor_shell/ipcHandlers.js`; every change is pushed to
  *every* open tab's `webContents` (`devcontext:changed`), not just
  written somewhere a poller might eventually notice.
- **`game/devContext.js`** — kept its existing synchronous
  `get()`/`set()`/`log()`/`recent()` surface (so none of the ~22 editor
  files calling it needed to change) but now reconciles with the
  Electron-owned copy above when `window.stillpointAPI.isElectron` is
  true, and dispatches a `devcontext:changed` `CustomEvent` on `window`
  whenever state arrives from elsewhere (push from main, or another tab).
  Outside Electron — a tool opened in a plain browser tab against
  `save-server.js`, still fully supported per Milestone 2's "old path
  stays alive" finding — this falls back to the exact original
  localStorage + `storage`-event behavior, unchanged. `dev_hub.html`'s
  sidebar/activity feed listens for the new event alongside its existing
  `storage` listener.
- **App menu** — File (New Tab `Cmd/Ctrl+T`, Close Tab `Cmd/Ctrl+W`) and
  Navigate (Back/Forward/Home/Reload, Next/Previous Tab, Toggle DevTools),
  all operating on the active tab through `TabManager`, replacing Milestone
  1's single-window Navigate-only menu.

**Verified via static review, not a live run**: `node --check` on every
new/changed file, and every Electron API used (`WebContentsView`,
`BrowserWindow.contentView`/`.children`/`addChildView`/`removeChildView`,
`WebContents.navigationHistory`) cross-checked against this repo's
installed `electron@43.2.0` type definitions
(`node_modules/electron/electron.d.ts`) to confirm they exist and take the
arguments used here. **Not verified**: actually launching the packaged
app and clicking through it — tabs opening/closing/switching, the
DevContext sidebar updating live across two tabs, and re-running
`debug_v1.html`/`debug_v2.html` inside a tab to confirm their harness
still passes now that they run inside a `WebContentsView` rather than the
window's root `webContents` (expected to be a non-issue per the
`webPreferences` staying identical, but Milestone 1's own doc entry
treated this exact check as worth doing explicitly rather than assuming
it, and that reasoning applies again here). That remains on the user to
run, per this repo's standing no-browser-testing rule — see "Manual test
checklist" below for exact steps.

### Manual test checklist (for the user to run — `npm start`)

1. App opens to Dev Hub in one tab. Click a tool link (e.g. any card in
   the tool grid) — it should open as a **new tab**, not replace the Dev
   Hub tab.
2. Open 2-3 tools, click between their tabs — each should keep its own
   state (scroll position, any in-progress edits) rather than reloading.
3. Close a tab (×) — the next tab over should become active; closing the
   last tab shouldn't crash the app.
4. `Cmd/Ctrl+T` opens a new Dev Hub tab; `Cmd/Ctrl+W` closes the active
   tab; `Cmd/Ctrl+Shift+]` / `[` cycle tabs.
5. In one tab, open `levelEditor.html` (or any tool that calls
   `DevContext.set(...)`, e.g. picking a room) — switch to a Dev Hub tab
   and confirm its sidebar "what am I working on" section updates without
   needing a manual reload.
6. Run `debug_v1.html` and `debug_v2.html` each in their own tab and
   confirm the same pass/fail split Milestone 1 already established
   (R01-R09/R11 for v1; the 88/7/6/1 split for v2) — this is the one
   check specifically worth re-doing after this milestone, per the note
   above.

## Effort estimate

- Milestone 1: **actual — roughly matched the estimate.** `npm init` +
  `electron` + a small `main.js` (plus a `setWindowOpenHandler` tweak,
  added after initial user feedback, so tool links navigate in-window
  instead of spawning native windows per click). User confirmed
  `debug_v1.html`/`debug_v2.html` pass inside the packaged app.
- Milestone 2: **actual — larger than estimated, for a good reason.** The
  original estimate assumed "swap `fetch()` for IPC" across 5 tools; what
  actually happened was building a genuine AST patch engine (5 patch
  modes, grown incrementally as each target's real shape demanded a new
  one) and wiring 9 targets across 8 editors, run across several
  follow-up sessions rather than one. Each individual wire-up stayed
  small and mechanical once the engine existed — the cost was in the
  engine, not the repetition.
- Milestone 3: **actual — narrower than the doc's original open-ended
  framing, on purpose.** Rather than treating "real shell UX" as an
  unbounded UI design project, this round scoped it to the two concrete
  things named in the doc's own migration-order bullet (tabs, real shared
  `DevContext`) plus the app menu, and stopped there — multi-panel/split
  layouts stayed out, as a genuinely separate follow-up rather than scope
  creep on this pass. `TabManager`'s per-tab `WebContentsView` model is
  the right foundation for panels later (same views, different layout
  logic), so nothing here would need to be redone to add them.

## Open questions

1. **Answered, 2026-08-04**: wanted now — the user asked for Milestones 1
   and 2 directly, ahead of the post-internship content push, rather than
   waiting.
2. **Answered, 2026-08-04, by Milestone 3**: real tabs now (`TabManager`,
   `setWindowOpenHandler` opens a new tab instead of navigating the
   current one away) — the "always-open shell" end of this question,
   same one window, multiple documents. Panels/split-view were
   deliberately left out of this round (see the Milestone 3 effort note
   above) — not started, would layer onto the same `WebContentsView`
   foundation.
3. **Answered, in practice**: `save-server.js`'s HTTP path stays alive
   alongside the new IPC path — every wired editor tries
   `window.stillpointAPI` first and falls back to
   `fetch('http://localhost:8787/...')` when it isn't present, confirmed
   working live this session. Not a hard cutover, and no plan to make it
   one.
