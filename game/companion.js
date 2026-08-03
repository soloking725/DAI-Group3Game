// The Child — companion system (2026-07-16).
// See Plans/child_companion_system_plan.md (Neva-style reference: she is
// PHYSICALLY REAL — runs, jumps, hesitates, catches up — with an invisible
// teleport failsafe that only ever fires off-screen, so the illusion of
// real traversal never breaks on camera).
//
// Activation: companionState.active — set by the keep-the-Child story
// branch (or the companion_test.html arena tool). game.js creates/updates/
// draws the global `child` while active.
//
//  Design rules (from the plan — do not quietly relax these):
//   * She can NEVER die, take damage, fall into pits permanently, block the
//     player's movement, or soft-lock a room. Frustration kills attachment.
//   * Enemies never target her (she's an anomaly outside the fracture).
//   * Phase 1 kit: hide during combat, heal-by-touch after. Phase 2
//     (companionState.canFight, the story.md §2 "let her fight" choice):
//     she fights with a FOUND weapon (companionState.weapon), same as the
//     player finds abilities — not a fixed kit. Real, modest damage (an
//     assist, not a DPS race with the player) — see COMPANION_WEAPONS below.

// ── Tuning constants ────────────────────────────────────────────────────────
// The four `var`s below (not `const`) are reassigned live by
// companion_test.html's sliders — same convention as enemy.js's
// KNOCKBACK_* constants, so the tuning bench can set the real value the
// real update()/_moveToward() logic reads, instead of monkey-patching
// Child.prototype.update to fake it per-instance afterward.
var CHILD_FOLLOW_DIST = 70;          // px behind the player she aims for
var CHILD_RUN_SPEED = 3.4;           // slightly below MOVE_SPEED (4) — she visibly hustles
const CHILD_JUMP_FORCE = -11;
const CHILD_GAP_LOOKAHEAD = 20;      // px ahead to probe for missing floor
const CHILD_STUCK_FRAMES = 90;       // no progress for this long → failsafe eligible
const CHILD_TELEPORT_MARGIN = 60;    // must ALSO be at least this far off-screen to blink
var CHILD_HEAL_COOLDOWN = 4200;      // 70s @ 60fps between touch-heals
const CHILD_HEAL_RANGE = 34;         // touch distance
const CHILD_HIDE_SEARCH_STEP = 40;   // spacing of candidate hide spots
var CHILD_TETHER_INTERVAL = 540;     // 9s between fight-mode weapon assists
const CHILD_TETHER_RANGE = 200;      // she assists on enemies near the player
const CHILD_TETHER_PULL = 70;        // px the enemy gets dragged toward the player (knuckles only)

// ── Found weapons (Phase 2 kit) ─────────────────────────────────────────────
// She finds these the same way the player finds abilities — starts with one
// (assigned at the story.md §2 "let her fight" choice) and can find a
// different/upgraded one later from an enemy drop (see game.js's
// COMPANION_WEAPON_DROP_CHANCE). Each is a flavor of the same assist slot —
// one damage source, timed on CHILD_TETHER_INTERVAL — not a moveset.
const COMPANION_WEAPONS = {
  knuckles:    { label: 'Knuckles',    color: '#f9a8d4', damage: 3, pull: true,  guardBreak: false, ticks: 1 },
  taser:       { label: 'Taser',       color: '#7dd3fc', damage: 2, pull: false, guardBreak: true,  ticks: 1 },
  flamethrower:{ label: 'Flamethrower',color: '#fb923c', damage: 1, pull: false, guardBreak: false, ticks: 4 }, // 1 dmg x4 ticks, DoT-flavored
};

// ── State (flat-flags style, matching abilityState's convention) ───────────
const companionState = {
  active: false,      // she exists and follows — the "kept the Child" branch
  canFight: false,    // Phase 2 unlocked (story.md §2's "let her fight" choice)
  weapon: null,        // 'knuckles' | 'taser' | 'flamethrower' — set when canFight flips true
  mode: 'follow',     // 'follow' | 'hiding' | 'fighting' | 'scripted'
  healCooldown: 0,    // frames until her touch-heal is ready again
  scriptTarget: null, // {x, y} waypoint while mode === 'scripted'
  // Environment-interaction hook (2026-08-01) — 'scripted' mode today only
  // ever carries a waypoint (scriptTarget); this is the room to grow that
  // into "walk to X, THEN play an interaction pose" without a second state
  // machine. A cutscene `call` step (or any future environment-trigger
  // code) sets this to a Child animStateKey() suffix (see below) — e.g.
  // 'point', 'examine', 'pull_lever' — once she arrives, and clears it
  // (back to null) when the beat ends. No built-in meaning yet: it only
  // does something once a matching `child_<name>` def exists in
  // ANIM_DEFS (anim_editor.html) — same additive/no-op-until-authored
  // contract every other animStateKey() in this codebase follows.
  scriptAnim: null,
};

class Child {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 16;
    this.height = 24;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.grounded = false;

    this.stuckTimer = 0;      // frames without X-progress toward the target
    this.lastX = x;
    this.jumpCooldown = 0;    // small gap between jumps so she doesn't pogo
    this.bobTimer = 0;        // idle animation phase
    this.healFlash = 0;       // frames of heal VFX
    this.cowering = false;    // combat-hide body language
    this.callChirp = 0;       // frames of "called" indicator
    this.tetherTimer = CHILD_TETHER_INTERVAL; // fight-mode assist countdown
    this.tetherBeam = null;   // { enemy, timer } — assist VFX
    this.pendingTicks = 0;    // remaining flamethrower-style ticks
    this.tickTimer = 0;
    this.tickTarget = null;

    // Visual bridge to game/animdata.js (2026-08-01) — same additive,
    // fallback-to-procedural convention as enemy.js's ComposedEnemy: an
    // ANIM_DEFS key authored under `child_<state>` (see animStateKey()
    // below, editable in anim_editor.html) overrides the procedural body
    // draw; nothing authored means zero behavior change from today.
    this.animator = new Animator(this);
    this._animKey = null;
  }

  // One state key per frame, `child_<state>` convention (mirrors
  // ComposedEnemy.animStateKey()'s `enemy_<id>_<state>` and player.js's
  // playerBodyStateKey()). companionState.scriptAnim (see its own comment)
  // takes priority over everything else — it's how a cutscene or future
  // environment-interaction trigger asks for a specific pose ('point',
  // 'examine', 'pull_lever', ...) regardless of what she'd otherwise be
  // doing. She never takes damage (design rule, see file header), so
  // unlike enemies there's no `_hurt`/`_death` state to cover.
  animStateKey() {
    if (companionState.mode === 'scripted' && companionState.scriptAnim) {
      return `child_${companionState.scriptAnim}`;
    }
    if (this.healFlash > 0) return 'child_heal';
    if (this.tetherBeam) return 'child_fight_assist';
    if (this.cowering) return 'child_hide';
    if (companionState.mode === 'fighting') return 'child_fight';
    if (Math.abs(this.vx) > 0.3) return 'child_walk';
    return 'child_idle';
  }

  // ── Per-frame update. game.js calls this during 'playing' when active. ──
  update(player, area, bounds, enemies, timeScale = 1) {
    const _ts = timeScale;
    this.bobTimer += 0.1 * _ts;
    if (this.jumpCooldown > 0) this.jumpCooldown -= _ts;
    if (this.healFlash > 0) this.healFlash -= _ts;
    if (this.callChirp > 0) this.callChirp -= _ts;
    if (companionState.healCooldown > 0) companionState.healCooldown -= _ts;

    // Mode selection (unless a script owns her): any living enemy actively
    // engaging the player flips her to hiding (Phase 1) or fighting
    // (Phase 2); combat ending brings her back to follow — which is also
    // when her touch-heal matters (the walk-back-to-her reunion loop).
    if (companionState.mode !== 'scripted') {
      const combatOn = enemies.some((e) => !e.dead && e.aware);
      if (combatOn) {
        companionState.mode = companionState.canFight ? 'fighting' : 'hiding';
      } else {
        companionState.mode = 'follow';
      }
    }

    // Pick this frame's movement target by mode.
    let target;
    this.cowering = false;
    switch (companionState.mode) {
      case 'hiding':
        target = this._hideSpot(player, area, enemies);
        this.cowering = true;
        break;
      case 'scripted':
        target = companionState.scriptTarget || { x: this.x, y: this.y };
        break;
      case 'fighting':
        // Fight from mid-range behind the player, not on top of enemies.
        target = { x: player.x - player.facing * (CHILD_FOLLOW_DIST + 30), y: player.y };
        this._updateTetherAssist(player, enemies, _ts);
        break;
      default: // follow
        target = { x: player.x - player.facing * CHILD_FOLLOW_DIST, y: player.y };
    }

    this._moveToward(target, area, bounds, player, _ts);

    // Touch-heal — only out of combat, off cooldown, and when it matters.
    if (companionState.mode === 'follow' &&
        companionState.healCooldown <= 0 &&
        player.health < playerMaxHealth() &&
        Math.abs((player.x + player.width / 2) - (this.x + this.width / 2)) < CHILD_HEAL_RANGE &&
        Math.abs((player.y + player.height / 2) - (this.y + this.height / 2)) < CHILD_HEAL_RANGE) {
      player.health = Math.min(playerMaxHealth(), player.health + 1);
      companionState.healCooldown = CHILD_HEAL_COOLDOWN;
      this.healFlash = 30;
      if (typeof spawnParticles === 'function') spawnParticles(player.x + player.width / 2, player.y + 4, '#f9a8d4', 10);
      if (typeof addAbilityNotification === 'function') addAbilityNotification('The Child steadies you (+1)');
      if (typeof SFX !== 'undefined') SFX.abilityPickup();
    }

    // Visual bridge to game/animdata.js — see the constructor's comment.
    // Guarded the same way ComposedEnemy/player.js guard their own
    // animator: only play()s when a matching key actually exists, so an
    // un-authored Child costs nothing extra per frame.
    this._animKey = this.animStateKey();
    if (typeof ANIM_DEFS !== 'undefined' && ANIM_DEFS[this._animKey]) {
      this.animator.play(this._animKey);
      this.animator.update(_ts);
    }
  }

  // Call button (input.js 'callChild'): she hurries to the player.
  call(player) {
    this.callChirp = 40;
    this.stuckTimer = Math.max(this.stuckTimer, CHILD_STUCK_FRAMES - 20); // near-instant failsafe if she's stuck far away
  }

  // ── Locomotion ─────────────────────────────────────────────────────────
  _moveToward(target, area, bounds, player, _ts) {
    const dx = target.x - this.x;
    const arrived = Math.abs(dx) < 12;

    if (!arrived) {
      const dir = dx > 0 ? 1 : -1;
      this.facing = dir;
      // Gap probe: only walk over a hole if a jump could plausibly clear
      // it (she jumps below); otherwise stop at the edge like a real kid.
      const speed = this.callChirp > 0 ? CHILD_RUN_SPEED * 1.25 : CHILD_RUN_SPEED;
      this.vx = dir * speed;

      if (this.grounded) {
        const gapAhead = !hasFootingAhead(this, bounds, dir, CHILD_GAP_LOOKAHEAD);
        const playerAbove = (player.y + player.height) < this.y - 30;
        const playerJumpedRecently = !player.grounded && player.vy < -2;
        if (this.jumpCooldown <= 0 && (gapAhead || playerAbove || (playerJumpedRecently && Math.abs(dx) < 120))) {
          // Jump: over the gap, up toward the player's platform, or a
          // mirror-jump when the player leaps nearby (traversal feels duet-like).
          this.vy = CHILD_JUMP_FORCE;
          this.grounded = false;
          this.jumpCooldown = 24;
        }
      }
    } else {
      this.vx = 0;
      if (Math.abs(player.x + player.width / 2 - (this.x + this.width / 2)) > 6 && companionState.mode === 'follow') {
        this.facing = (player.x > this.x) ? 1 : -1; // idle: look at the player
      }
    }

    // Physics — same shared resolver as everything else (physics.js).
    // Dispatches on room gravity direction (Gravity Collapse Core,
    // 2026-07-26) the same way player.js/resolveEnemyPhysics do — 'down'
    // is this exact call, unchanged.
    if (typeof applyRoomGravity === 'function') applyRoomGravity(this, _ts);
    else this.vy += GRAVITY * _ts;
    this.x += this.vx * _ts;
    this.y += this.vy * _ts;
    this.grounded = false;
    const _companionGravDir = typeof getRoomGravityDir === 'function' ? getRoomGravityDir() : 'down';
    if (_companionGravDir === 'down' || typeof resolveRotatedGravityCollision !== 'function') {
      resolveEntityCollision(this, area ? area.platforms : null, {
        movedX: this.vx * _ts,
        movedY: this.vy * _ts,
        groundY: bounds ? bounds.groundY : undefined, // she never falls out of the world
        bounds,
      });
    } else {
      resolveRotatedGravityCollision(this, area ? area.platforms : null, _companionGravDir, {
        movedX: this.vx * _ts,
        movedY: this.vy * _ts,
        bounds,
      });
    }

    // ── Catch-up failsafe (the Neva trick) ──
    // Fires only when she's made no X-progress for a while AND is well
    // off-screen (or fell past any floor) — never teleports on camera.
    if (Math.abs(this.x - this.lastX) < 0.5 && !arrived) this.stuckTimer += _ts;
    else this.stuckTimer = 0;
    this.lastX = this.x;

    const offscreen = typeof camera !== 'undefined' &&
      (this.x < camera.x - CHILD_TELEPORT_MARGIN || this.x > camera.x + W + CHILD_TELEPORT_MARGIN ||
       this.y < camera.y - CHILD_TELEPORT_MARGIN || this.y > camera.y + H + CHILD_TELEPORT_MARGIN);
    const fellOut = area && this.y > (typeof area.roomHeight === 'number' ? area.roomHeight : area.groundY) + 300;

    if ((this.stuckTimer >= CHILD_STUCK_FRAMES && offscreen) || fellOut) {
      this.x = player.x - player.facing * 40;
      this.y = player.y - 10;
      this.vx = 0; this.vy = 0;
      this.stuckTimer = 0;
      if (area) nudgeOutOfPlatforms(this, area.platforms, 'Child catch-up', true);
    }
  }

  // Farthest reasonable point from the nearest enemy, sampled along the
  // room near the player (she hides NEAR the fight — visible and worth
  // protecting — not three rooms away).
  _hideSpot(player, area, enemies) {
    let nearest = null, nd = Infinity;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.abs(e.x - player.x);
      if (d < nd) { nd = d; nearest = e; }
    }
    if (!nearest) return { x: player.x - player.facing * CHILD_FOLLOW_DIST, y: player.y };

    // Authored hide spots (area.hideSpots: [{x, y}]) — real cover geometry
    // (an alcove, behind a crate, a corner) placed by level design. Prefer
    // the one farthest from the nearest enemy, within reach of the player,
    // over the pure-computed fallback below (which just walks away along
    // the ground — reads as "leaving" more than "hiding").
    if (area && Array.isArray(area.hideSpots) && area.hideSpots.length) {
      let best = null, bestD = -Infinity;
      for (const spot of area.hideSpots) {
        if (Math.abs(spot.x - player.x) > 400) continue; // too far to read as "hiding near the fight"
        const d = Math.hypot(spot.x - nearest.x, spot.y - nearest.y);
        if (d > bestD) { bestD = d; best = spot; }
      }
      if (best) return { x: best.x, y: best.y };
    }

    // Sample a few spots on the player's side away from the enemy; take the
    // farthest within a sane radius.
    const away = player.x > nearest.x ? 1 : -1;
    let best = { x: player.x + away * 140, y: player.y };
    for (let i = 1; i <= 4; i++) {
      const cx = player.x + away * (100 + i * CHILD_HIDE_SEARCH_STEP);
      if (area && (cx < 20 || cx > area.width - 20)) break;
      best = { x: cx, y: player.y };
    }
    return best;
  }

  // ── Phase 2: weapon assist ──────────────────────────────────────────────
  // Every CHILD_TETHER_INTERVAL frames, her found weapon (COMPANION_WEAPONS)
  // hits the enemy nearest the player's facing line — real, modest damage
  // (an assist, not a DPS race with the player). Flavor varies by weapon:
  // knuckles pulls+staggers, taser opens guards, flamethrower ticks damage
  // over a few frames. this.pendingTicks/tickTimer carry a multi-tick
  // weapon (flamethrower) across frames without a second timer field.
  _updateTetherAssist(player, enemies, _ts) {
    if (this.tetherBeam) {
      this.tetherBeam.timer -= _ts;
      if (this.tetherBeam.timer <= 0) this.tetherBeam = null;
    }

    // Finish out a multi-tick weapon (flamethrower) independent of the main
    // assist cooldown, as long as the target's still alive.
    if (this.pendingTicks > 0) {
      this.tickTimer -= _ts;
      if (this.tickTimer <= 0 && this.tickTarget && !this.tickTarget.dead) {
        const w = COMPANION_WEAPONS[companionState.weapon] || COMPANION_WEAPONS.knuckles;
        this.tickTarget.takeDamage(w.damage, this.x);
        this.tetherBeam = { enemy: this.tickTarget, timer: 14 };
        this.pendingTicks--;
        this.tickTimer = 10;
      } else if (!this.tickTarget || this.tickTarget.dead) {
        this.pendingTicks = 0;
      }
    }

    this.tetherTimer -= _ts;
    if (this.tetherTimer > 0) return;

    let target = null, bestD = CHILD_TETHER_RANGE;
    for (const e of enemies) {
      if (e.dead) continue;
      const ex = e.x + e.width / 2, px = player.x + player.width / 2;
      if ((ex - px) * player.facing <= 0) continue; // in front of the player only
      const d = Math.abs(ex - px);
      if (d < bestD) { bestD = d; target = e; }
    }
    if (!target) return;

    this.tetherTimer = CHILD_TETHER_INTERVAL;
    const w = COMPANION_WEAPONS[companionState.weapon] || COMPANION_WEAPONS.knuckles;

    if (w.pull) {
      const pull = (player.x > target.x) ? CHILD_TETHER_PULL : -CHILD_TETHER_PULL;
      target.x += pull;
    }
    target.hitStun = Math.max(target.hitStun || 0, 18);
    if (w.guardBreak && target.blocking > 0) { target.blocking = 0; target.guardBroken = 40; }
    target.takeDamage(w.damage, this.x);

    if (w.ticks > 1) {
      this.pendingTicks = w.ticks - 1;
      this.tickTarget = target;
      this.tickTimer = 10;
    }

    this.tetherBeam = { enemy: target, timer: 20 };
    if (typeof spawnParticles === 'function') spawnParticles(target.x + target.width / 2, target.y + target.height / 2, w.color, 8);
    if (typeof SFX !== 'undefined') SFX.dash();
  }

  // ── Rendering — procedural vector, same art language as everything else ──
  draw(ctx) {
    const bob = this.grounded ? Math.sin(this.bobTimer) * 1.2 : 0;
    const x = this.x, y = this.y + bob;

    // Tether-assist beam (fight mode VFX)
    if (this.tetherBeam && !this.tetherBeam.enemy.dead) {
      const e = this.tetherBeam.enemy;
      const wCol = (COMPANION_WEAPONS[companionState.weapon] || COMPANION_WEAPONS.knuckles).color;
      ctx.globalAlpha = this.tetherBeam.timer / 20 * 0.8;
      ctx.strokeStyle = wCol;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + this.width / 2, y + 6);
      ctx.lineTo(e.x + e.width / 2, e.y + e.height / 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.globalAlpha = 1;
    }

    // Soft glow — she reads as an anomaly, not a combatant
    ctx.fillStyle = 'rgba(249, 168, 212, 0.12)';
    ctx.beginPath();
    ctx.arc(x + this.width / 2, y + this.height / 2, 18, 0, Math.PI * 2);
    ctx.fill();

    // Body — visual bridge to game/animdata.js (see constructor comment):
    // an authored `child_<state>` def overrides this exact silhouette;
    // falls back to the original procedural body/head/eye draw unchanged
    // when nothing's authored for the current state.
    if (typeof ANIM_DEFS !== 'undefined' && ANIM_DEFS[this._animKey]) {
      this.animator.draw(ctx);
    } else {
      const squash = this.cowering ? 0.7 : 1;
      const h = this.height * squash;
      ctx.fillStyle = '#f9a8d4';
      ctx.fillRect(x + 2, y + (this.height - h), this.width - 4, h);
      // Head
      ctx.beginPath();
      ctx.arc(x + this.width / 2, y + (this.height - h) + 2, 6, 0, Math.PI * 2);
      ctx.fill();
      // Eye — looks where she faces (hidden while cowering: face buried)
      if (!this.cowering) {
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(x + this.width / 2 + (this.facing === 1 ? 1 : -4), y + (this.height - h), 3, 3);
      }
    }

    // Heal-ready pulse: gentle ring when her touch-heal is available and
    // the player is hurt — the in-world "come to me" signal, no HUD icon.
    if (companionState.healCooldown <= 0 && typeof player !== 'undefined' && player && player.health < playerMaxHealth() &&
        companionState.mode === 'follow') {
      const pulse = Math.sin(this.bobTimer * 2) * 0.15;
      ctx.strokeStyle = `rgba(249, 168, 212, ${0.35 + pulse})`;
      ctx.beginPath();
      ctx.arc(x + this.width / 2, y + this.height / 2, 14, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Heal moment flash
    if (this.healFlash > 0) {
      ctx.globalAlpha = this.healFlash / 30;
      ctx.strokeStyle = '#fbcfe8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + this.width / 2, y + this.height / 2, 24 - this.healFlash / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.globalAlpha = 1;
    }

    // Called indicator
    if (this.callChirp > 0) {
      ctx.fillStyle = `rgba(249, 168, 212, ${this.callChirp / 40})`;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('♪', x + this.width / 2, y - 8);
      ctx.textAlign = 'left';
    }
  }
}

// ── Companion weapon drops ───────────────────────────────────────────────
// She finds new weapons the same way the player finds abilities — a rare
// drop from an enemy kill (only once she's fighting at all; see game.js's
// COMPANION_WEAPON_DROP_CHANCE at the melee-kill site). Self-contained,
// same array/spawn/update/draw/clear shape as healing.js's vitality motes.
const WEAPON_DROP_LIFETIME = 600; // 10s before an uncollected drop fades
const WEAPON_DROP_COLLECT_DIST = 22;
const COMPANION_WEAPON_DROP_CHANCE = 0.06; // per melee kill, only while companionState.canFight
let weaponDrops = [];

function spawnWeaponDrop(x, y) {
  const pool = Object.keys(COMPANION_WEAPONS).filter((k) => k !== companionState.weapon);
  const weapon = pool.length ? pool[Math.floor(Math.random() * pool.length)] : companionState.weapon;
  weaponDrops.push({ x, y, vy: -3, weapon, life: WEAPON_DROP_LIFETIME, alive: true });
}

function updateWeaponDrops(player, timeScale = 1) {
  const px = player.x + player.width / 2, py = player.y + player.height / 2;
  for (const d of weaponDrops) {
    if (!d.alive) continue;
    d.life -= timeScale;
    if (d.life <= 0) { d.alive = false; continue; }
    d.vy = Math.min(2, d.vy + 0.25 * timeScale); // gentle drop, small bounce-settle feel
    d.y += d.vy * timeScale;

    if (Math.hypot(px - d.x, py - d.y) < WEAPON_DROP_COLLECT_DIST) {
      d.alive = false;
      companionState.weapon = d.weapon;
      if (typeof spawnParticles === 'function') spawnParticles(d.x, d.y, COMPANION_WEAPONS[d.weapon].color, 12);
      if (typeof addAbilityNotification === 'function') addAbilityNotification(`The Child found: ${COMPANION_WEAPONS[d.weapon].label}`);
      if (typeof SFX !== 'undefined') SFX.abilityPickup();
    }
  }
  for (let i = weaponDrops.length - 1; i >= 0; i--) {
    if (!weaponDrops[i].alive) weaponDrops.splice(i, 1);
  }
}

function drawWeaponDrops(ctx) {
  for (const d of weaponDrops) {
    const a = Math.min(1, d.life / 60);
    const col = COMPANION_WEAPONS[d.weapon].color;
    ctx.globalAlpha = a * (0.7 + Math.sin(d.life * 0.15) * 0.3);
    ctx.fillStyle = col;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function clearWeaponDrops() {
  weaponDrops.length = 0; // room change — drops are room-space, same as motes
}

// Debug-tool access (same pattern as area.js's window.AREAS)
if (typeof window !== 'undefined') {
  window.companionState = companionState;
  window.Child = Child;
  window.COMPANION_WEAPONS = COMPANION_WEAPONS;
}
