# Steam Desktop Build — wrapping `index.html` for a Steam release (design proposal, not started)

Status: proposed 2026-08-04, split out during the same session that built
`editor_shell/` (the Electron wrap for the dev-tool suite, per
`Plans/unified_editor_ide_plan.md`). That session also decided the game
itself will get its own Electron wrap targeting Steam — reversing
`unified_editor_ide_plan.md`'s earlier Tauri lean, but **only for the
game**, because Steamworks integration tooling is far more mature on
Electron/Node than on Tauri/Rust (see "Wrapper choice" below for the
actual library landscape, which needs a real verification pass, not just
this restated rationale). `Plans/roadmap.md` (~line 4585, "Live save
patching" entry) is the pointer that named this doc before it existed —
this is that doc. Nothing here is built yet.

**This is a separate decision from `unified_editor_ide_plan.md`, on
purpose.** That doc's own §"Electron vs. Tauri vs. NW.js" says as much:
"Nothing requires the editor shell and a future game desktop wrap to use
the same tech... don't let this section's Electron pick for the *editor*
be read as deciding the game's eventual wrap too." Two different
audiences (developers vs. players), two different priorities (iteration
speed vs. a small, trustworthy, Steam-reviewable build) — don't conflate
them, and don't assume work on one motivates work on the other.

## Where this sits relative to the current project phase

CLAUDE.md's "Where this project is right now" section is explicit: the
project is deliberately in an infrastructure-building phase during a
summer internship with limited free time, with a dedicated content push
(enemies + levels) planned for afterward. A Steam build is
distribution/release infrastructure, not content — it fits the same
"build it now so it's ready later" logic as the editor shell, **but** it
has a much lower ceiling of usefulness until there's a finished, sellable
game behind it. Recommendation: this doc is fine to have written and
reviewed now, but starting Milestone 1 before the content push is
probably premature — flag that explicitly as an open question below
rather than assuming either answer.

## What's true today (read from the actual code/repo)

- **The game is one entry point, `index.html`**, loading ~20
  `game/*.js` files as plain `<script>` tags in a fixed order (see
  CLAUDE.md's Architecture map) — no build step, no bundler. Same
  "wrapper can load this completely unchanged as Milestone 1" property
  that made the editor shell cheap.
- **A root `package.json` already exists**, created for `editor_shell/`
  (`"main": "editor_shell/main.js"`, `electron ^43.2.0` as a
  `devDependency`, `@babel/parser`/`recast` for the AST-based save
  patcher). It is scoped to the editor — **the game shell should not
  reuse this `main` entry or this package's dependency list**; see
  "Two apps, not one" below.
- **`editor_shell/`** is the concrete precedent to copy the shape of:
  `main.js` (a `BrowserWindow` with `contextIsolation: true`,
  `nodeIntegration: false`, a `preload.js`), `preload.js`
  (`contextBridge`-exposed API surface), `ipcHandlers.js` (the actual
  `ipcMain.handle` implementations), `targets.js` (a symbolic-id
  allowlist so a renderer can't point a write at an arbitrary path). The
  game shell's `preload.js` surface will be much smaller than the
  editor's (save read/write + Steamworks calls, not a generic file
  patcher), but the pattern — never give the renderer raw `fs`, always go
  through an allowlisted IPC channel — is identical.
- **Saves are `localStorage`-only today**: `game/game_boot_save.js`, 3
  slots, key pattern `stillpoint_save_v1_slot_{n}`, plus a
  `stillpoint_settings_v1` key for screen shake/hitstop, all wrapped in
  try/catch so a quota/private-browsing failure degrades to "no
  persistence" rather than crashing. **This is the single biggest
  architecture gap for a Steam build**: Steam Cloud syncs actual files on
  disk, not a browser's `localStorage` database — there is nothing on
  disk to sync yet. See "Save-file bridge" below.
- **No Steamworks integration of any kind exists** — no `steam_appid.txt`,
  no achievement calls, no SDK dependency in `package.json`. This is a
  from-scratch addition, not something to extend.
- **Repo size**: `assets/` alone is ~86M (recorded music/SFX samples per
  CLAUDE.md's audio note), `game/`+`editor/` source is ~2.7M combined.
  Electron's own runtime (bundled Chromium + Node) adds on the order of
  ~150-200M to a packaged build regardless of game content — worth
  knowing going in, not a blocker; Steam's CDN doesn't care, but it's the
  reason a from-scratch Tauri build (small native webview, no bundled
  Chromium) would have been the leaner choice **if** Steamworks tooling
  didn't tip the decision the other way.

## Two apps, not one

The editor shell and the game shell should be **separate Electron apps**,
not two windows/entry points inside one `package.json`:

- Different audiences: the editor is a dev tool that never ships to a
  player; the game is the reviewable, sellable Steam build. Bundling them
  risks a stray dev-tool code path ending up in what gets uploaded to
  Steam's depot.
- Different dependency surfaces: the editor needs `@babel/parser`/
  `recast` for its AST save-patcher; the game needs a Steamworks
  binding and nothing else. No reason for the game's package to carry the
  editor's dependencies or vice versa.
- Precedent from `editor_shell/`'s own naming: a parallel `game_shell/`
  directory (own `main.js`/`preload.js`/`ipcHandlers.js`, own minimal
  `package.json`, `"main": "game_shell/main.js"`) is the natural mirror.
  Whether that's a second `package.json` in a `game_shell/` subfolder
  (npm workspace-style) or a fully separate top-level repo/folder outside
  this one is an open question below — either is workable, but "one
  `package.json` serving both apps" is the option to avoid.

## Wrapper choice — verify before committing

The stated reasoning ("Steamworks integration tooling is far more mature
on Electron") is directionally right — Node has real Steamworks bindings
and Electron is a Node host — but the specific library landscape moves
and should be re-checked at Milestone 0 time rather than assumed from this
doc:

- **`steamworks.js`** (napi-rs bindings over the Steamworks SDK) is the
  actively-maintained option as of this doc's writing, and — despite
  being Rust-authored — ships prebuilt Node native bindings, so it is
  usable from plain Node/Electron without a Rust toolchain on the
  *consuming* machine (unlike a full Tauri app, which needs Rust to build
  the app itself). This is likely the actual reason Electron pulls ahead
  here, more precisely than "Steamworks tooling favors Electron" — worth
  confirming its current maintenance status and Electron-version
  compatibility (this repo's `electron ^43.2.0`) before Milestone 0 ships.
- **`greenworks`** (the older Electron-specific Steamworks wrapper) is
  effectively unmaintained as of recent memory — do not default to it
  without checking its last release date and open-issue state first.
- Whatever is chosen is a **native addon** (real compiled code, not pure
  JS) — that means `electron-rebuild` (or the packager's built-in native
  module handling) is a real Milestone 0 step, not a formality, and native
  addons need per-platform prebuilds (Windows/macOS/Linux) if the game
  ships cross-platform on Steam.

## Save-file bridge

Steam Cloud syncs files at fixed paths under a per-app Steam Cloud
quota — it has no concept of `localStorage`. Two ways to reconcile that
with `game_boot_save.js`'s current model, in increasing order of
invasiveness:

1. **Mirror, don't replace.** Keep `saveGame()`/`loadGame()` writing to
   `localStorage` exactly as today (so the game still works identically
   when opened as a plain file/served page, outside the Steam shell), and
   add one `preload.js`-exposed IPC call, `window.steamSaveAPI.mirror(slot,
   json)`, invoked right after every existing `localStorage.setItem` in the
   save path, writing the same JSON to a real file in Electron's
   `app.getPath('userData')`. Steam Cloud is then pointed at that
   directory. Lowest risk — the existing save code path is untouched, this
   is purely additive.
2. **Make files the source of truth when running under the shell**, with
   `localStorage` as the fallback for the plain-browser case (mirrors
   exactly how `editor_shell`'s tools fall back to `save-server.js`'s HTTP
   path when `window.stillpointAPI` isn't present — same "don't force a
   hard cutover" precedent, see `Plans/roadmap.md`'s Live Save Patching
   entry). More correct long-term (avoids the two stores silently
   diverging) but touches `game_boot_save.js`'s read path, not just the
   write path — bigger, not a Milestone-1-sized change.

Recommendation: start with option 1 for Milestone 2 below; only move to
option 2 if divergence between the two stores actually becomes a problem
in practice, per this repo's general "don't build for a hypothetical"
convention.

## Achievements

Not scoped in detail here — genuinely premature before the content push
(most planned enemies aren't placed in any room yet, per CLAUDE.md's
"Where this project is right now," and `LORE_ENABLED = false` means a
chunk of narrative beats an achievement list might key off don't surface
in-game yet). When it is time: the natural hook points already exist in
code without new instrumentation — `cutscene.js`'s `storyFlags{}` (boss
kills, the Child choice, region completion) already fire at exactly the
moments an achievement list would care about, so wiring achievements later
is "call `SteamAPI` from the same `setFlag()` call site," not a new
tracking system.

## Suggested migration order (incremental, mirrors `unified_editor_ide_plan.md`'s milestone shape)

1. **Milestone 0 — verify the Steamworks binding.** Before writing any
   `game_shell/` code: confirm the current best-maintained Node/Electron
   Steamworks binding, confirm it has prebuilt binaries (or can be
   rebuilt) for `electron ^43`, and do a throwaway smoke test
   (`SteamAPI_Init()` succeeding against a real or test Steam `appid`,
   e.g. Steam's public `480` "Spacewar" test app) in isolation, outside
   this repo. This is the one step in the whole plan with real
   "might not actually work as assumed" risk — everything after it is
   comparatively mechanical.
2. **Milestone 1 — packaging only.** New `game_shell/` directory, its own
   minimal `package.json` (`"main": "game_shell/main.js"`, `electron` as
   the only dependency so far), a `main.js` that opens `index.html`
   unchanged in a `BrowserWindow` (`contextIsolation: true`,
   `nodeIntegration: false`) sized/resizable appropriately for a shipped
   game window (fixed aspect ratio worth considering, given the canvas
   game's fixed internal resolution — check `game_state.js`'s canvas
   setup before picking a window size policy). Zero `game/*.js` changes.
   Explicitly verify: frame timing/`requestAnimationFrame` behaves the
   same under Electron's Chromium as a plain browser (the game's
   `gameLoop()` assumes real `rAF` timing — debug_v2.html's stubbed-`rAF`
   approach is a *test* harness trick, not something the shipped game
   should ever rely on), Web Audio playback and the recorded
   music/SFX samples in `assets/audio/` all load and play correctly from
   a packaged (not `file://`-served) app, and keyboard input/`e.code`
   handling in `game/input.js` is unaffected by running inside Electron.
   Same expected first-launch Gatekeeper prompt on macOS as
   `editor_shell/` hit — not a bug to chase.
3. **Milestone 2 — save-file bridge.** Implement save-file-bridge option 1
   above: `game_shell/preload.js` + `ipcHandlers.js` exposing one mirror-
   write call, wired into `game_boot_save.js`'s existing `saveGame()` path
   only when `window.steamSaveAPI` is present (same presence-check
   fallback pattern `hud_editor.html`/`inventory_editor.html` already use
   for `window.stillpointAPI`). No Steam Cloud configuration yet — this
   milestone just proves real files land in `userData` correctly across
   all 3 save slots + settings + backup-key logic.
4. **Milestone 3 — Steamworks integration proper.** `steam_appid.txt`,
   `SteamAPI_Init()` at app launch (gate the whole window behind a
   successful init — decide what "Steam not running" should do:
   `editor_shell`-style graceful continue vs. hard refuse, since unlike
   the editor this build's whole reason to exist is running under Steam),
   Steam Cloud enablement pointed at Milestone 2's save directory in the
   Steamworks partner backend, and — only once the content push has
   produced real achievement-worthy moments — the achievement calls
   described above.
5. **Milestone 4 — packaging & Steam upload.** `electron-builder` or
   `electron-forge` for the actual distributable (`.exe`/`.app`/Linux
   target), code-signing decision (unsigned is fine for personal/early
   testing the same way `editor_shell` ships unsigned today, but Steam
   review and antivirus false-positive rates make signing worth budgeting
   for before a public release, not before), and `steamcmd` depot upload.
   This milestone is genuinely separate from "the game runs in Electron"
   — budget it as its own pass, not a footnote on Milestone 3.

## Effort estimate

- Milestone 0: small but has real uncertainty — budget more wall-clock
  than the line count suggests, since it's a smoke test against an
  external SDK/service, not a code-writing task.
- Milestone 1: small, same order of magnitude as `editor_shell`'s own
  Milestone 1 (a session or less) — the game is one HTML entry point vs.
  the editor's 26.
- Milestone 2: small-medium — one IPC channel, wired into one existing
  code path (`saveGame()`), verified across 3 slots + settings + backups.
- Milestone 3: medium — mechanically simple per achievement/save hook,
  but gated on content that doesn't fully exist yet (see "Achievements"
  above), so its real-world timeline is tied to the content push, not to
  engineering effort alone.
- Milestone 4: medium — packaging/signing/store-page/depot mechanics are
  a different skill set than the rest of this plan and worth treating as
  its own scoped pass close to an actual release date, not done early.

## Open questions (answer before starting Milestone 0)

1. Is this wanted *now*, or does it — like the unified editor IDE — wait
   behind the post-internship content push? Given achievements
   (Milestone 3) are content-gated anyway, there's a real argument for
   doing Milestones 0-2 now (pure infra, no content dependency) and
   holding 3-4 until there's a release-worthy build.
2. Does a Steam Partner account / `appid` already exist for this project,
   or is that itself a still-open step (with its own $100 Steamworks fee)
   this doc's Milestone 3-4 timeline depends on?
3. Cross-platform scope for v1 — Windows-only first (likely the largest
   Steam audience segment) with macOS/Linux later, or all three from the
   start? This materially affects Milestone 0's native-binding
   verification work (prebuilds needed per target) and Milestone 4's
   packaging matrix.
4. Should the plain browser/`python3 -m http.server` way of running the
   game keep working indefinitely (dev convenience, matches this repo's
   "don't force a hard cutover" precedent from the editor shell), or is a
   point where Steam becomes the only supported way to play acceptable?
   Leaning toward "keep both," consistent with every other dual-path
   decision in this repo, but worth confirming rather than assuming.
