# Stillpoint — Systematic Bug Analysis & QA Plan

> Generated: 2026-07-11 | Codebase: DAI-Group3Game (vanilla HTML/Canvas/JS)

> **Staleness note (2026-08-03):** re-spot-checked against current code.
> **BUG-001 is fixed** (`player.hitTargetsThisSwing` per-swing hit dedup
> exists in both `game.js` and `healing.js` — see `CLAUDE.md`'s "Per-swing
> hit dedup pattern" section). **BUG-002 and BUG-012 are now also fixed**
> (superseding the 2026-07-21 note that said otherwise) — `boss.js` no
> longer uses `setTimeout` for stagger/bounce state; both now run on a
> frame-counter (`this._staggerDelayTimer`, decremented in `update()`,
> explicit comment at boss.js:611 "not setTimeout, which fires on
> wall-clock time regardless of pause"). The one remaining `setTimeout` in
> `boss.js` (line 566) is a cosmetic phase-3 dialogue-popup delay only, not
> gameplay state — not the bug either entry described. **BUG-003 is also
> fixed** — `CHARGE_TAP` was raised from 5 to 16 frames (`player.js:62`,
> comment cites "2026-07-16, user feedback"), closing the DPS-inversion gap
> the original entry flagged. BUG-013 is already marked fixed/verified
> within its own entry below (2026-07-12/17). BUG-004 through BUG-011 have
> not been re-checked against the Phase 19-23+ changes (shared collision
> resolver, new platform flags, enemy AI overhaul, ability-leveling system)
> — treat those entries as "as of 2026-07-11" until someone re-verifies
> them.

## Table of Contents
1. [Bug Inventory](#1-bug-inventory)
2. [Automated Test Suite](#2-automated-test-suite)
3. [Manual Playtest Protocol](#3-manual-playtest-protocol)
4. [Performance Profiling Guide](#4-performance-profiling-guide)
5. [Bug Reporting Template](#5-bug-reporting-template)
6. [Comprehensive Checklist](#6-comprehensive-checklist)

---

## 1. Bug Inventory

### CRITICAL (Game-Breaking)

#### BUG-001: No enemy invincibility frames — single swing deals massive damage
| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Files** | `game.js:1626-1676` |
| **Root Cause** | `enemy.takeDamage()` (enemy.js:203) has no invincibility check. Player attack hitbox overlaps every frame during `attackTimer` (12-16 frames). Each frame calls `takeDamage()`. |
| **Symptom** | Enemies (3 HP) die in one swing. Attack animation hits ~12 times. |
| **Fix** | Add `enemy.hitStun > 0` guard before `takeDamage()` in game.js:1626, OR add `invincibleTimer` in enemy.takeDamage() that returns early if active. Boss already has `invulnerable` — enemies need the same pattern. |

#### BUG-002: `setTimeout` in boss.js runs outside game loop — FIXED (verified 2026-08-03)
| Field | Value |
|-------|-------|
| **Severity** | CRITICAL (was) |
| **Files** | `boss.js:611-616` (fix), `boss.js:154-155` (field init) |
| **Root Cause (historical)** | `setTimeout` used for boss stagger state transitions and bounce effects. Fired regardless of game paused, tab-inactive, or hitstop. |
| **Fix applied** | Stagger/bounce now run on `this._staggerDelayTimer`, a frame-counter decremented in `boss.update()` (`myTimeScale`-aware), exactly the fix this entry proposed. Code has an explicit comment at boss.js:611 marking the intent. Only `setTimeout` left in `boss.js` (line 566) is a cosmetic phase-3 dialogue-popup delay, not state logic. |

---

### HIGH (Gameplay-Impacting)

#### BUG-003: CHARGE_TAP threshold mismatch — FIXED 2026-07-16 (verified 2026-08-03)
| Field | Value |
|-------|-------|
| **Severity** | HIGH (was) |
| **Files** | `player.js:62` |
| **Root Cause (historical)** | `CHARGE_TAP = 5` frames. Holding 5-19 frames fired "heavy" (26f cooldown) but `heavyCharge < 0.5` so damage = `ATTACK_DAMAGE` (1) instead of scaled — a DPS-inversion trap. |
| **Fix applied** | `CHARGE_TAP` raised 5 → 16 frames (inline comment: "2026-07-16, user feedback"), the first of this entry's two proposed fixes — only a meaningful hold now registers as heavy. |

#### BUG-004: Pit death gated by invincibility timer
| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Files** | `game.js:1567` |
| **Root Cause** | `if ((playerDead || pitDeath) && (playerDead || player.invincibleTimer <= 0))` — pit death requires `invincibleTimer <= 0`. Player with active i-frames falling off-map won't die. |
| **Symptom** | Player falls into pit while invincible → never triggers game over. Stuck in void. |
| **Fix** | Change to: `if (playerDead || pitDeath)` (always die from pit). Or: `if ((playerDead || pitDeath) && (playerDead || pitDeath || player.invincibleTimer <= 0))`. |

#### BUG-005: Enemy attack hitbox fires during windup (no active-frame gate)
| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Files** | `enemy.js:203` (getAttackHitbox) |
| **Root Cause** | Enemy returns hitbox when `this.state === 'attacking'`. No check for active frames vs windup/recovery. |
| **Symptom** | Player can be hit before the enemy visually attacks. Unfair damage windows. |
| **Fix** | Add active-frame window: only return hitbox when `attackTimer` is within a specific range (e.g., last 6 of 16 frames). |

#### BUG-013: Stillpoint blocks attacking, so its own offensive buff can (almost) never trigger — FIXED 2026-07-12, rebalance still open
| Field | Value |
|-------|-------|
| **Severity** | HIGH (flagged by user 2026-07-12) |
| **Files** | `player.js:282`, `player.js:302`, `player.js:343`, `player.js:365` |
| **Root Cause** | All four attack/charge/parry start-conditions required `!this.stillpointActive`. This predated Phase 0.2, which reworked Stillpoint into an offensive buff — melee attacks during Stillpoint deal 1.5x damage and life-steal 1 HP per hit (`playerMeleeDamage()`/`applyStillpointLifeSteal()` in game.js). The old defensive-tool guard was never removed when that buff was added. |
| **Symptom** | Pressing Z/J to attack (or charge, or parry) while Stillpoint was active did nothing — the buff could basically never trigger through normal play. |
| **Fix** | `!this.stillpointActive` removed from all four gates — attacking, charging, and parrying now all work normally during Stillpoint, matching the Phase 0.2 design intent. Verified: `node --check` passes, Node linter harness still 27/0/26/0 (no data regressions — this is pure player-input logic, untouched by either linter). |
| **Balance risk — NOT resolved, needs a human playtest** | Stillpoint now stacks unlimited free attacking + 1.5x damage + full lifesteal + the existing slow-time/damage-immunity utility, with no new drawback besides the existing Fracture-meter drain. This may well be overpowered now that it's actually usable as designed — needs a real fight (King + a miniboss) to judge before calling it balanced. If it's too strong, likely levers: reduce the 1.5x multiplier, cap lifesteal frequency (e.g. once per swing instead of per hit-connect), or shorten Stillpoint's duration per pip. |

---

### MEDIUM (Quality/Polish)

#### BUG-006: Boss damage aura ignores `gameTimeScale`
| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Files** | `boss.js` (phase 3 aura) |
| **Root Cause** | Aura tick rate (30 frames) is fixed, not multiplied by `_globalTS`. Stillpoint slows everything except aura damage. |
| **Symptom** | Boss still deals full aura DPS during Stillpoint slow-mo. |
| **Fix** | Multiply tick interval by `_globalTS` or apply `_globalTS` to aura tick counter. |

#### BUG-007: Camera doesn't clamp during reviving state
| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Files** | `game.js:1404-1407` |
| **Root Cause** | Reviving state returns early from update. Camera position set during death may be off-screen. |
| **Symptom** | Camera shows void or off-screen area during revive animation. |
| **Fix** | Call `clampCamera()` or `resetCamera()` before setting `gameState = 'reviving'`. |

#### BUG-008: `clearJustPressed()` missing on some early returns
| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Files** | `game.js:1449-1451` (map overlay) |
| **Root Cause** | Map open returns early at line 1451. `clearJustPressed()` at line 1450 only fires on the toggle frame. Subsequent frames with map open don't clear just-pressed. |
| **Symptom** | Keys pressed while map is open may fire on next gameplay frame after map closes. |
| **Fix** | Add `clearJustPressed()` before the `return` at line 1451. (Already done at line 1450 for toggle, but not for holding map open.) |

#### BUG-009: Enemy distraction timer can loop indefinitely
| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Files** | `enemy.js` (distraction/distractionTimer) |
| **Root Cause** | Echoes that persist keep resetting `distractionTimer`. If echo outlives normal timer, enemy stays distracted. |
| **Symptom** | Enemy refuses to attack after echo expires. |
| **Fix** | Cap distraction duration or break lock-on when echo dies. |

---

### LOW (Minor/Edge Cases)

#### BUG-010: HUD drawn when map is open
| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Files** | `game.js` (draw loop) |
| **Root Cause** | Map overlay doesn't block HUD rendering. Health/stamina bars visible behind map. |
| **Fix** | Skip HUD draw when `mapOpen === true`. |

#### BUG-011: Victory state doesn't reset ability cooldowns
| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Files** | `game.js:1424-1439` |
| **Root Cause** | After boss defeat, player returns to antechamber with `health = MAX_HEALTH` but cooldowns/fracture meter carry over. |
| **Fix** | Reset `abilityState.phaseDashCooldown`, `shardShotCooldown`, `fractureMeter`. |

#### BUG-012: Boss bounce effect uses `setTimeout` — FIXED (verified 2026-08-03)
| Field | Value |
|-------|-------|
| **Severity** | LOW (was) |
| **Files** | `boss.js:1186` |
| **Root Cause (historical)** | Same as BUG-002 but for the bounce visual effect only. |
| **Fix applied** | Same fix as BUG-002 — `this._heavyDipTimer`, a frame-counter (inline comment: "~120ms at 60fps — frame counter, not setTimeout"). |

---

## Balance Notes (not bugs — flagged for a future tuning pass)

#### BAL-001: Phase Dash is too strong — PARTIALLY ADDRESSED 2026-07-12
| Field | Value |
|-------|-------|
| **Flagged** | 2026-07-12, by the user |
| **Files** | `ability.js`, `enemy.js` |
| **Symptom** | User clarified the specific problem: not spam (the 90-frame cooldown was fine), but the Echo's enemy-distraction effect — 60 frames (1 full second) of a distracted enemy being fully frozen (no movement, no attack) within a 150px radius. That's a strong "make every nearby enemy stop existing for a second" panic button, usable defensively any time a fight gets hard, independent of whether Phase Dash was used for its intended traversal purpose. |
| **Fix** | Added `ECHO_DISTRACT_DURATION = 30` (ability.js) and replaced all 4 hardcoded `distractionTimer = 60` assignments in enemy.js (base `Enemy`, `Stutterer`, `VoidLancer`, `CrystalSentinel`) with it — distraction duration halved, 60 → 30 frames. Deliberately the only number changed (not radius, not the dash's own i-frames/cooldown/speed) so the effect of this one lever can be judged in isolation before touching anything else. Verified: `node --check` on both files, linter harness still 27/0/26/0. |
| **Status** | Needs a human playtest to confirm 30 frames actually fixes the "crutch" feeling without breaking the echo's intended traversal use (buying a moment to slip past one enemy). If still too strong, next lever to try is `ECHO_DISTRACT_RADIUS` (150px, ability.js) — not the dash's own speed/cooldown/i-frames, which the user confirmed are NOT the problem. |

---

## Summary of Architecture Issues

| Area | Issue | Impact |
|------|-------|--------|
| Damage | No enemy i-frames | Combat trivial — enemies die in 1 hit |
| Timers | `setTimeout` for game logic | State desync on pause/tab-switch |
| Charge | Threshold/cooldown mismatch | Punishes intended input pattern |
| Death | Pit gated by i-frames | Player can be stuck in void |
| Hitboxes | Enemy attack has no active frames | Unfair damage windows |
| Time Scale | Aura ignores `gameTimeScale` | Stillpoint less effective vs boss |

---

## 2. Automated Test Suite

> Non-destructive — snapshots state, runs checks, restores. Input via `dispatchEvent`.

### R01–R03: Core Initialization

```javascript
const TestSuite = {
  results: [], passed: 0, failed: 0, iframe: null,

  init(frame) { this.iframe = frame; this.results = []; },

  dispatchKey(code, type) {
    const doc = this.iframe.contentDocument;
    doc.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true, cancelable: true }));
  },

  assert(id, name, cond, detail='') {
    const ok = !!cond;
    this.results.push({ id, name, pass: ok, detail });
    if (ok) this.passed++; else this.failed++;
    return ok;
  },

  // R01: Game initializes without crashing
  async R01_Init() {
    const w = this.iframe.contentWindow;
    this.assert('R01', 'Game initializes', w.gameState !== undefined,
      w.gameState ?? 'undefined');
  },

  // R02: Player object valid
  async R02_PlayerExists() {
    const w = this.iframe.contentWindow;
    const p = w.player;
    this.assert('R02', 'Player health valid',
      p && p.health > 0 && p.health <= w.MAX_HEALTH,
      p ? `${p.health}/${w.MAX_HEALTH}` : 'player missing');
  },

  // R03: Canvas renders
  async R03_CanvasRenders() {
    const c = this.iframe.contentDocument.querySelector('canvas');
    this.assert('R03', 'Canvas ready', !!(c && c.getContext('2d')),
      c ? `${c.width}x${c.height}` : 'not found');
  },
```

### R04–R07: Input & Movement

```javascript
  // R04: Menu → Play transition
  async R04_MenuNavigation() {
    const w = this.iframe.contentWindow;
    const before = w.gameState;
    this.dispatchKey('Enter', 'keydown');
    await new Promise(r => setTimeout(r, 100));
    this.assert('R04', 'Menu → Play', before === 'menu' && w.gameState !== 'menu',
      `${before} → ${w.gameState}`);
  },

  // R05: Player movement
  async R05_PlayerMovement() {
    const p = this.iframe.contentWindow.player;
    const start = p.x;
    this.dispatchKey('KeyD', 'keydown');
    await new Promise(r => setTimeout(r, 100));
    this.dispatchKey('KeyD', 'keyup');
    this.assert('R05', 'Player moves on D', Math.abs(p.x - start) > 0.5,
      `delta=${(p.x - start).toFixed(1)}`);
  },

  // R06: Jump
  async R06_PlayerJump() {
    const p = this.iframe.contentWindow.player;
    this.dispatchKey('KeyW', 'keydown');
    await new Promise(r => setTimeout(r, 50));
    this.dispatchKey('KeyW', 'keyup');
    this.assert('R06', 'Jump vy < 0', p.vy < 0, `vy=${p.vy.toFixed(1)}`);
  },

  // R07: Attack registers
  async R07_AttackTriggers() {
    const p = this.iframe.contentWindow.player;
    this.dispatchKey('KeyZ', 'keydown');
    await new Promise(r => setTimeout(r, 50));
    this.dispatchKey('KeyZ', 'keyup');
    this.assert('R07', 'Attack fires', p.attackCooldown > 0,
      `cooldown=${p.attackCooldown}`);
  },
```

### R08–R12: Combat, Save, Performance

```javascript
  // R08: Enemy damage
  async R08_EnemyDamage() {
    const w = this.iframe.contentWindow;
    const enemies = w.areaEnemies?.[w.currentAreaId] || [];
    if (!enemies.length) return this.assert('R08', 'Enemy damage', true, 'skipped');
    const e = enemies[0];
    const hp = e.health;
    e.takeDamage(1, w.player.x);
    this.assert('R08', 'Enemy HP reduces', e.health < hp, `${hp} → ${e.health}`);
  },

  // R10: Save system
  async R10_SaveSystem() {
    try {
      this.iframe.contentWindow.saveGame();
      const d = localStorage.getItem('stillpoint_save');
      this.assert('R10', 'Save persists', !!d, d ? `${d.length}B` : 'null');
    } catch (e) { this.assert('R10', 'Save', false, e.message); }
  },

  // R11: FPS > 55
  async R11_Performance() {
    const t0 = performance.now();
    await new Promise(r => { let n = 0; (const go = () => { n++; n >= 60 ? r() : requestAnimationFrame(go); })(); });
    const fps = (60 / (performance.now() - t0)) * 1000;
    this.assert('R11', `FPS > 55`, fps > 55, `${fps.toFixed(1)} fps`);
  },

  // Run all
  async runAll() {
    const tests = ['R01_Init','R02_PlayerExists','R03_CanvasRenders',
      'R04_MenuNavigation','R05_PlayerMovement','R06_PlayerJump',
      'R07_AttackTriggers','R08_EnemyDamage','R10_SaveSystem','R11_Performance'];
    this.results = []; this.passed = 0; this.failed = 0;
    for (const t of tests) { try { await this[t](); } catch(e) { this.assert(t,t,false,e.message); } }
    return { total: tests.length, passed: this.passed, failed: this.failed, results: this.results };
  }
};

// Wire up in debug_new.html:
// const frame = document.getElementById('gameFrame');
// frame.onload = () => TestSuite.init(frame);
// window.runTests = () => TestSuite.runAll().then(r => console.log(`${r.passed}/${r.total}`));
```

---

## 3. Manual Playtest Protocol

> Run these checks after every code change. Each section targets a specific gameplay system.

### 3.1 Movement & Platforming (10 min)

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 1.1 | Walk left/right across full tutorial area | Smooth movement, no clipping | ☐ |
| 1.2 | Jump on every platform edge | Lands cleanly, no fall-through | ☐ |
| 1.3 | Wall slide on vertical wall | Sparks visible, slow descent | ☐ |
| 1.4 | Wall jump from both sides | Launches away from wall with momentum | ☐ |
| 1.5 | Double jump mid-air | Second jump triggers, reduced height | ☐ |
| 1.6 | Coyote time: jump 3 frames after leaving edge | Jump still works | ☐ |
| 1.7 | Jump buffer: press jump 3 frames before landing | Jump fires on landing | ☐ |
| 1.8 | Dash chains (3×) in mid-air | Each dash extends, cooldown increases | ☐ |
| 1.9 | Phase dash through enemy | Passes through, invincibility active | ☐ |
| 1.10 | Crouch under low obstacle | Hitbox shrinks, blocks jump | ☐ |

### 3.2 Combat Mechanics (15 min)

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 2.1 | Normal attack (tap Z) → 1 hit per swing | Enemy takes 1 dmg, then i-frames block | ☐ |
| 2.2 | Heavy attack (hold Z > 2s) → scaled damage | Higher dmg, longer cooldown (26f) | ☐ |
| 2.3 | Upward attack on enemy | Launches enemy upward (juggling) | ☐ |
| 2.4 | Downward attack (pogo) | Bounces player up, hits enemy | ☐ |
| 2.5 | Dash-refund on hit | Dash cooldown reduced by 50% | ☐ |
| 2.6 | Parry enemy attack (within 6f window) | Enemy stunned, golden sparks, i-frames | ☐ |
| 2.7 | Parry boss projectile | Same as 2.6, boss staggered | ☐ |
| 2.8 | Shard shot hits enemy → destroys on contact | Enemy takes dmg, projectile removed | ☐ |
| 2.9 | Shard shot tilts upward (W+V) | Projectile arcs upward | ☐ |
| 2.10 | Fracture meter fills from hits → full enables Stillpoint | Meter visible, activates at 1 pip | ☐ |

### 3.3 Ability Gates & Secrets (10 min)

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 3.1 | Phase dash gate (requires ability) | Cannot pass until unlocked | ☐ |
| 3.2 | Shard shot gate (requires ability) | Must shoot switch/target | ☐ |
| 3.3 | Stillpoint gate (requires ability) | Time-slow solves puzzle | ☐ |
| 3.4 | Hidden lore fragment collection | Lore overlay appears, persists | ☐ |
| 3.5 | Destructible platform breaks on projectile | Platform shatters with particles | ☐ |
| 3.6 | Secret area behind breakable wall | Accessible with correct sequence | ☐ |

### 3.4 Boss Fight — Fractured King (20 min)

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 4.1 | Phase 1: Slashes, lunges, projectiles | Dodgeable, clear telegraphs | ☐ |
| 4.2 | Phase 2: Shield blocks frontal hits | Back attack breaks shield | ☐ |
| 4.3 | Phase 2: Summon Fractured Slimes | 2 slimes spawn, attack independently | ☐ |
| 4.4 | Phase 3: Ultimate charge & sweep | Red warning, long recovery window | ☐ |
| 4.5 | Phase 3: Stillpoint counter-lunge | Boss teleports toward player | ☐ |
| 4.6 | Adaptation system: boss shifts patterns after 6 hits | "ADAPTING" popup appears | ☐ |
| 4.7 | 5 consecutive hits → immediate retaliation | Boss attacks without cooldown | ☐ |
| 4.8 | Victory cinematic plays on kill | Particles, timer, R to resume | ☐ |

### 3.5 Save/Load & Edge Cases (10 min)

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 5.1 | New game → save → reload | Position, health, abilities restored | ☐ |
| 5.2 | Die → respawn at checkpoint | Correct position, health restored | ☐ |
| 5.3 | Pit death (fall off map) | Game over screen, respawn | ☐ |
| 5.4 | Pause mid-air → unpause → land | Physics resumes correctly | ☐ |
| 5.5 | Switch tab for 10s → return | Game catches up, no state corruption | ☐ |
| 5.6 | F2 saves manually | Confirm message, save persists | ☐ |
| 5.7 | Multiple save slots → load different slot | Each slot independent | ☐ |
| 5.8 | ESC in tutorial → skip to Fracture | Skips correctly, abilities granted | ☐ |

---

## 4. Performance Profiling Guide

### 4.1 Thresholds

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Avg FPS | > 55 | < 30 |
| Max frame time | < 100ms | > 200ms |
| Script execution/frame | < 8ms | > 15ms |
| Memory (heap) | < 100MB | > 200MB |
| Particle count | < 200 | > 500 |

### 4.2 Chrome DevTools Steps

1. **Open DevTools** → `Cmd+Option+I`
2. **Performance tab** → click ◉ Record (or `Cmd+E`)
3. Play game for 10 seconds (include combat + boss)
4. Stop recording → analyze flame chart
5. Look for:
   - Long tasks (> 50ms) — red bars
   - `requestAnimationFrame` gaps
   - GC pauses (blue bars)
6. **Bottom panel**: check "Events" for forced style/recalc

### 4.3 Frame Budget Analysis

```
60fps = 16.67ms per frame
Budget split:
  └─ Update logic    ~8ms  (physics, AI, collisions)
  └─ Render          ~6ms  (draw calls, canvas ops)
  └─ Overhead        ~2ms  (GC, layout, browser)
```

### 4.4 Common Bottlenecks to Check

| Area | Symptom | Fix |
|------|---------|-----|
| Collision checks | Frame spikes with many enemies | Spatial hashing, grid partitioning |
| Particle spawning | Lag on enemy death | Cap particles, pool objects |
| Canvas redraws | Low FPS | `willReadFrequently=false`, avoid `getImageData` |
| Array splicing | Micro-stutters mid-frame | Reverse iteration, object pooling |
| `setTimeout` | State drift | Replace with frame-counters |

---

## 5. Bug Reporting Template

> Copy-paste this for every bug found during playtest. Fill in all fields.

```markdown
### BUG-XXX: [Short title]

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL / HIGH / MEDIUM / LOW |
| **Category** | Movement / Combat / UI / Save/Load / Boss / Performance |
| **File(s)** | `file.js:line` |
| **Repro Steps** | 1. ... 2. ... 3. ... |
| **Expected** | What should happen |
| **Actual** | What actually happens |
| **Frequency** | Always / Sometimes (X/10) / Once |
| **Screenshot** | [link or paste] |
| **Root Cause** | (if known) |
| **Proposed Fix** | (if known) |
```

### Severity definitions

| Severity | Definition | Examples |
|----------|-----------|----------|
| **CRITICAL** | Game unplayable; crash; hard lock | BUG-001 (no enemy i-frames), BUG-002 (setTimeout desync) |
| **HIGH** | Core mechanic broken; unfair death; major exploit | BUG-003 (charge mismatch), BUG-004 (pit + i-frames) |
| **MEDIUM** | Polish issue; edge case; visual glitch | BUG-006 (aura time-scale), BUG-008 (input leak) |
| **LOW** | Minor visual/audio/cosmetic | BUG-010 (HUD behind map), BUG-011 (cooldown reset) |

---

## 6. Comprehensive Checklist

> Master checklist for pre-merge validation. All items must pass before committing to main.

### 6.1 Automated Tests

- [ ] All R01–R12 regression tests pass in `debug_new.html`
- [ ] Zero JavaScript console errors during test run
- [ ] FPS > 55 in R11 performance test
- [ ] Save/load cycle (R10) persists correctly

### 6.2 Code Quality

- [ ] No `setTimeout`/`setInterval` for game logic (use frame-counters)
- [ ] All `clearJustPressed()` called before early returns
- [ ] All enemy damage paths check invincibility (`hitStun > 0` or `invincibleTimer`)
- [ ] Boss `invulnerable` check guards all damage paths
- [ ] `gameTimeScale` applied consistently (enemies, boss aura, projectiles)
- [ ] No hardcoded magic numbers without named constants
- [ ] All file reads use `read_file` / `search_files` (no `cat`/`grep` in agent prompts)
- [ ] No secrets/credentials in committed files

### 6.3 Movement & Platforming

- [ ] Walk, run, jump, double-jump all functional
- [ ] Coyote time (3f) works on every edge
- [ ] Jump buffer (3f) works on every platform
- [ ] Wall slide + wall jump both sides
- [ ] Dash chains (1–3×) with correct cooldown scaling
- [ ] Phase dash grants invincibility, passes through enemies
- [ ] No fall-through on any platform edge
- [ ] Pit death triggers regardless of invincibility timer

### 6.4 Combat

- [ ] Normal attack: 1 hit per swing (enemy i-frames active)
- [ ] Heavy attack: scaled damage, correct cooldown
- [ ] Upward attack launches enemies (juggling)
- [ ] Downward attack bounces player (pogo)
- [ ] Dash refund on hit (50% cooldown)
- [ ] Parry works on enemy attack + projectile + body contact
- [ ] Shard shot hits enemies, tilts upward with W+V
- [ ] Fracture meter fills, Stillpoint activates
- [ ] Stillpoint slows enemies/boss (not player)

### 6.5 Boss — Fractured King

- [ ] Phase 1 attacks all dodgeable with telegraphs
- [ ] Phase 2 shield blocks frontal, back breaks it
- [ ] Phase 2 summons work (2 slimes)
- [ ] Phase 3 ultimate charge + sweep
- [ ] Phase 3 Stillpoint counter-lunge
- [ ] Adaptation triggers at 6 hits
- [ ] Consecutive hit retaliation (5 hits)
- [ ] Victory cinematic → R to resume
- [ ] Boss defeated flag persists after save/load

### 6.6 Save/Load & State

- [ ] New game starts at tutorial
- [ ] Checkpoint saves on Stillpoint activation
- [ ] Manual save (F2) works
- [ ] Load restores: position, health, abilities, area
- [ ] Death → respawn at last checkpoint
- [ ] Multiple save slots independent
- [ ] Tutorial skip (ESC) grants abilities correctly
- [ ] Victory state: player can return to antechamber

### 6.7 Performance

- [ ] Avg FPS > 55 in tutorial area
- [ ] Avg FPS > 45 with 5+ enemies
- [ ] Avg FPS > 35 during boss fight
- [ ] No frame spikes > 100ms (DevTools Performance tab)
- [ ] Memory stable after 5 min play (no GC spiral)
- [ ] Particle count < 200 (visual cap)

### 6.8 Audio & Visual

- [ ] SFX plays on: attack hit, enemy death, dash, parry, shard shot, boss hit
- [ ] Screen shake on hits (scaled: normal vs heavy)
- [ ] Hitstop freezes correctly (3-12f depending on attack)
- [ ] Death fade-in/out smooth
- [ ] Area transition fade works
- [ ] Ability pickup notifications visible
- [ ] Lore overlay displays and fades

### 6.9 Edge Cases

- [ ] Tab switch (10s) → resume → no corruption
- [ ] Pause mid-air → unpause → physics correct
- [ ] Rapid input (spam keys) → no state corruption
- [ ] Player stuck in wall → walk away or jump out
- [ ] Enemy despawn after death animation
- [ ] Projectile cleanup when leaving area
- [ ] Boss cleared when leaving boss arena
- [ ] Camera clamps to area bounds
