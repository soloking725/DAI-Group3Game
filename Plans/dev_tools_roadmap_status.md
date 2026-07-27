# Dev Tools Roadmap — Status (2026-07-24)

Source: a 19-tab critique doc of the dev-tool suite, consolidated into a phased roadmap. This tracks what's actually landed vs. still open.

## Done

### Dev Hub (`editor/dev_hub.html`)
- `game/devContext.js` — shared cross-tool state (current room/enemy/animation) + activity log, `localStorage`-backed
- Sidebar grouped by workflow (Level Design / Combat & Enemies / Systems / QA), deep-links via `?room=`/`?enemy=`/`?anim=` into Level Editor, Enemy Editor, Anim Editor
- "Run All Validations": room layout linter + compass graph (`validateAreaGraph`) + embedded-door geometry check, all static, no iframe needed
- Live Overrides panel: shows/clears the 4 `localStorage` override keys (room/anim/combo/HUD)

### Live-override pipeline
- Anim/Combo/HUD already had `localStorage` → live-apply on load (pre-existing, just not documented before)
- Added the missing piece: `AREA_OVERRIDES_KEY` in `game/area.js` + "💾 Save to Browser (Live)" button in Level Editor — same pattern, closes the room-data gap

### Phase 1 — data loss & test reliability (all done)
- `game/unsavedGuard.js` — `beforeunload` protection, wired into Level Editor, Anim Editor, Enemy Designer, HUD Editor, Combo Editor
- `game/undoHistory.js` — undo/redo, wired into HUD Editor, Enemy Designer, Anim Editor (companion_test intentionally skipped — real-time tuning, not document authoring)
- Fixed `enemy_designer.html`'s attack-type-switch **and** movement-type-switch data loss (migrate-not-replace merge)
- Fixed `graph_analyzer.html` reading `connections` instead of `transitions` (drift-prone second source of truth)
- Fixed `debug_v1.html` R05/R10: root cause was `game.js`'s `player`/`gameState` never being exposed on `window` (`let` ≠ `window` property) — added live getters, same fix `AREAS` already had. R05 now reads `player.x` directly instead of canvas pixel-diffing. R10's dt handling was checked and found to already be correct (fixed-timestep accumulator) — not touched.
- **IndexedDB migration** for `anim_editor.html` sprite uploads (`game/animImageStore.js`) — was the doc's #1 Blocker (base64 images in `localStorage` crashed after ~2 uploads). Legacy inline `data:` URLs still work unchanged.

### Phase 2 — game feel / runtime consistency (partial)
- `companion_test.html` + `companion.js`: made `CHILD_FOLLOW_DIST`/`CHILD_RUN_SPEED`/`CHILD_HEAL_COOLDOWN`/`CHILD_TETHER_INTERVAL` live-tunable `var`s (same convention as `enemy.js`'s `KNOCKBACK_*`), fixed the follow-distance slider (previously did nothing), the speed slider (previously only worked once already moving), heal/tether sliders (previously capped instead of rescaling), and the mode-override 50ms `setInterval` drift (now `requestAnimationFrame`-timed). This also deleted the `Child.prototype.update` monkey-patch entirely.
- Miniboss-flag pollution (`enemy_test.html`) — checked, already fixed elsewhere, nothing to do

## Still open

**Phase 2 (game feel):**
- Centralized `triggerHitImpact(severity)` — hitstop is currently set ad hoc at ~19 call sites in `game.js`
- Wire the existing `attack_windup`/`attack_strike`/`attack_recover` poses (already in `animdata.js`) into the player's animator — currently unused
- Stillpoint duration ring (no visual indicator of remaining time)
- Hazard knockback direction (currently knocks away from hazard center, not surface normal)
- Attack input buffering during recovery frames

**Phase 3 (iteration friction):** copy-to-clipboard sweep, timestamped handoff keys, HUD editor `DEFAULTS` sync + schema versioning, auto-generated UI schemas in Enemy Designer/Editor, property-panel perf fixes at 50+ objects

**Phase 4 (only if time permits):** camera squash, enemy death burst, landing dust/footsteps, fast travel, ability-gated door icon, boss phase audio, per-ability cooldown ring colors, scoped `GameConstants.js`

## Verification approach

Everything above was verified without a browser (per standing preference) — `node --check` syntax passes on every touched file, plus targeted Node `vm`-sandbox functional tests loading the real game files and asserting actual behavior (undo/redo round-trips, IndexedDB put/get, companion follow-distance/speed/cooldown math, override merge logic). Not yet verified in-browser.
