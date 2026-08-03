// Enemies: Fractured (basic) and Stutterer (teleporting)

const ENEMY_SPEED = 1.5;
const ENEMY_HEALTH = 6;
const ENEMY_DAMAGE = 1;
const ENEMY_ATTACK_RANGE = 40;

// ── Player-outgoing melee knockback (2026-07-20) ────────────────────────────
// Base per-hit knockback magnitude, keyed by swing direction — was three
// separate hardcoded copies (Enemy.takeDamage, ComposedEnemy.takeDamage,
// and the duplicate before that) that had already drifted apart once. One
// shared source, and `var` (not `const`) so ability_tester.html's
// "Knockback" section can tune them live, same convention as the ability
// constants.
var KNOCKBACK_FORWARD_X = 5;
var KNOCKBACK_FORWARD_Y = -4;  // moderate pop-up, sets up juggling
var KNOCKBACK_UP_X = 3;
var KNOCKBACK_UP_Y = -12;      // big launch
var KNOCKBACK_DOWN_X = 6;
var KNOCKBACK_DOWN_Y = 8;      // slam down
const ENEMY_DETECT_RANGE = 200; // how far the enemy notices the player (was 80 via ENEMY_ATTACK_RANGE * 2)
const ENEMY_ATTACK_COOLDOWN = 90;

// ── Detection tuning ─────────────────────────────────────────────────────────
// See Enemy.canSeePlayer() below for how these combine.
const ENEMY_VERTICAL_BAND = 50;       // ground enemies: max |dy| to count the player as "seen"
const ENEMY_DETECT_HYSTERESIS = 35;   // widens ENEMY_DETECT_RANGE once already aware, so sitting
                                       // right on the boundary doesn't flicker chase/patrol every frame
const ENEMY_VERTICAL_HYSTERESIS = 20; // same idea, applied to the vertical band
const ENEMY_FACING_DEADZONE = 6;      // px — don't flip facing from noise when the player is ~overhead
const PATROL_SPEED = 0.7;             // slow wander speed, independent of chase speed
const PATROL_IDLE_FRAMES = 30;        // frames to stand still after losing the player, before patrol resumes

// ── AI reaction tuning (2026-07-16 combat overhaul — see
// Plans/combat_ai_overhaul_plan.md §B) ───────────────────────────────────────
// Notice delay: an enemy that first spots the player holds an "alert" beat
// (eye-glow ramp, no movement change) before actually engaging — enemies
// should *react* to seeing you, not *know* the instant you cross a radius.
// Per-enemy override: this.noticeFrames.
const ENEMY_NOTICE_FRAMES = 26;
// Decision commit: direction flips and chase/patrol re-evaluations only
// happen when decisionTimer expires — between re-evaluations the enemy
// commits to its current intent instead of re-deciding every frame (the
// "changes its mind instantly, constantly" fix). Attack triggering is NOT
// gated on this — a committed enemy still swings when you step into range.
// Per-enemy override: this.decisionFrames.
const ENEMY_DECISION_FRAMES = 18;
// Facing cone: initial detection only works in front of the enemy (a
// forward half-plane plus this much slack behind its back-edge), with a
// small omnidirectional "hearing" radius so you can't stand ON an enemy
// unseen. Once aware, detection is omnidirectional until sight is lost
// (nobody forgets an attacker mid-fight). Flying enemies (ignoreVertical)
// keep omni detection — they have no meaningful facing.
const ENEMY_REAR_SLACK = 14;          // px behind the enemy's center still counted as "in front"
const ENEMY_HEARING_RADIUS = 80;      // omnidirectional close-range detection (~40% of detect range)

// Windup (pre-attack telegraph) duration in frames
// Player has this many frames to react and dodge before the hit lands.
const ENEMY_WINDUP_FRAMES = 28;

// ── Shared ledge-detection helper ───────────────────────────────────────────
// Ground enemies used to walk straight off platform edges into pits: `grounded`
// gets set true on landing but was never reset to false each frame, so the
// "stop moving when airborne" safeguard only ever worked before an enemy's
// first landing. That's fixed at each `grounded = false` reset site below.
// This helper is the other half — probing whether there's actually a floor
// ahead in the enemy's direction of travel (`dir`, ±1) before committing to
// move that way, so chase/patrol stop and turn at a real ledge instead of
// relying on the world-bounds clamp (which only stops them at the edge of
// the whole area, not a mid-air gap).
function hasFootingAhead(entity, bounds, dir, lookahead = 14) {
  const probeX = dir === 1 ? entity.x + entity.width + lookahead : entity.x - lookahead;
  const probeY = entity.y + entity.height + 6;
  if (bounds && probeY >= bounds.groundY) return true;
  const area = (typeof getCurrentArea === 'function') ? getCurrentArea() : null;
  if (area) {
    for (const plat of area.platforms) {
      if (plat.destructible && plat.hp <= 0) continue;
      if (probeX >= plat.x && probeX < plat.x + plat.w && probeY >= plat.y && probeY <= plat.y + plat.h + 10) {
        return true;
      }
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Base enemy class — Fractured
// ─────────────────────────────────────────────────────────────────────────────
class Enemy {
  constructor(x, y, type = 'fractured') {
    this.x = x;
    this.y = y;
    this.width = 28;
    this.height = 28;
    this.type = type;
    // Base body color for draw()'s default (non-flash/windup) state — a
    // plain field rather than a hardcoded literal so visualVariants.js's
    // region/instance reskinning (see spawnAreaEnemies) can override it,
    // same convention as ComposedEnemy's own `this.color`.
    this.bodyColor = '#f87171';
    this.health = ENEMY_HEALTH;
    // Per-instance speed override (2026-07-16, user request — enemy_editor.html
    // control). Scales both chase and patrol movement below; currently only
    // wired into this base class's own update() — subclasses that fully
    // override update() with their own movement (most of them do) don't read
    // this yet, a known limitation, not a silent no-op bug.
    this.speed = ENEMY_SPEED;
    this.vx = this.speed;
    this.vy = 0;
    this.grounded = false;
    this.facing = -1;
    this.attackCooldown = ENEMY_ATTACK_COOLDOWN;

    // windup → attacking → idle pipeline
    this.windingUp = false;   // crouching / telegraphing
    this.windUpTimer = 0;
    this.attacking = false;
    this.attackTimer = 0;

    this.flashTimer = 0;
    this.dead = false;
    this.deathTimer = 0;
    this.hitStun = 0;          // frames of hit stun remaining
    this.juggling = false;     // airborne combo state
    this.patrolCenter = x;
    this.patrolRange = 120;
    this.patrolDir = -1;   // patrol's own direction state — never read/written by chase code
    this.idleTimer = 0;    // frames left to stand still after losing the player, before patrol resumes
    this.aware = false;    // hysteresis flag — see canSeePlayer()

    // ── AI reaction state (2026-07-16 combat overhaul) ──
    // noticeTimer counts UP toward noticeFrames while the player is
    // detectable but the enemy hasn't finished its alert beat; alerted
    // becomes true (and stays true while detection holds) once it fires.
    // See canSeePlayer() for how these gate `aware`.
    this.noticeFrames = ENEMY_NOTICE_FRAMES;
    this.noticeTimer = 0;
    this.alerted = false;
    // decisionTimer counts down; movement intent (chase direction, facing
    // flips, patrol/chase switches) only re-evaluates when it hits 0.
    this.decisionFrames = ENEMY_DECISION_FRAMES;
    this.decisionTimer = 0;
    this.committedVx = null; // movement the enemy is committed to between decisions

    // ── Defense verbs (2026-07-16 combat overhaul, OPT-IN per enemy) ──
    // null = plain grunt (default). Subclasses / enemy_designer defs set any
    // subset — see updateDefense() for the behaviors and knobs:
    //   block:    { chance, range, guardFrames, cooldown }
    //   dodge:    { chance, range, iframes, cooldown }
    //   breakout: { hits, window, cooldown }   (anti-juggle burst)
    //   dashPunish: true                        (punish Phase-Dash spam)
    this.defense = null;
    // Runtime defense state — exists on every enemy (cheap) so game.js's
    // hit loop can read blocking/dodgeIFrames without null-guarding.
    this.blocking = 0;          // frames of active guard remaining
    this.guardCooldown = 0;
    this.guardBroken = 0;       // frames of broken-guard vulnerability (no re-guard)
    this.dodgeCooldown = 0;
    this.dodgeIFrames = 0;      // frames the enemy evades all melee
    this.juggleHits = 0;        // hits taken inside the breakout window
    this.juggleWindowTimer = 0;
    this.breakoutCharge = 0;    // >0: readable charge flash counting down to the burst
    this.breakoutCooldown = 0;
    this.breakoutBurstPending = false; // consumed by game.js (player shove + VFX)
    this.parriedRecently = 0;   // frames — parry-respect: raises feint odds (see windup)
    this._playerWasAttacking = false;  // rising-edge detector for player swings
    this._dashPassCount = 0;    // dash-punish: recent Phase-Dash pass-throughs
    this._dashPassTimer = 0;
    this._wasPhaseDashing = false;
    // Mix-ups: every enemy rolls its windup duration ±windupVariance so
    // attack timing can't be metronome-memorized; feintChance is the odds a
    // windup is a feint (cancel at ~60%, then the real swing, faster).
    this.windupVariance = 0.25;
    this.feintChance = 0;
    this.feinting = false;
    // Per-attack player knockback (heavy shove attacks): set to
    // { vx, vy, hitStun } to override the flat default when this enemy's
    // attack lands — read via getAttackDamageAndKnockback() in game.js.
    this.attackDamage = null;    // null = ENEMY_DAMAGE
    this.attackKnockback = null;

    // Per-instance overrides for canSeePlayer(), meant for future subclasses:
    //   this.verticalBand = <px>   — override ENEMY_VERTICAL_BAND for this enemy
    //   this.ignoreVertical = true — flying/hovering enemies that should track both axes freely
    this.verticalBand = null;
    this.ignoreVertical = false;

    // Distraction state (for echo decoys)
    this.distractionTimer = 0;
    this.distractionTarget = null;
  }

  // ── Shared player-detection method — all enemy subclasses should call this ──
  // instead of computing raw dx/dist themselves, so new enemy types don't
  // reintroduce the "flat, no vertical awareness" bug this replaced.
  //
  // Ground enemies (default): only "see" the player within a vertical band
  // (ENEMY_VERTICAL_BAND, or `this.verticalBand` if set) — an enemy directly
  // below/above the player on a different platform should not detect or
  // attack them just because they're horizontally close.
  //
  // Flying/hovering enemies: set `this.ignoreVertical = true` to track the
  // player with full Euclidean distance and no vertical gating at all — a
  // one-line config on the subclass, not a rewrite of this method.
  //
  // Hysteresis: once `this.aware` is true, both the detect range and the
  // vertical band widen by their *_HYSTERESIS constants before dropping back
  // to unaware — this is what stops rapid chase/patrol flicker when the
  // player sits right on the boundary instead of clearly inside or outside it.
  // Returns { inRange, dx, dy, dist, verticalOk, alertProgress }.
  // `inRange` is the final "actively engaging the player" answer, which as
  // of the 2026-07-16 combat overhaul means all three of:
  //   1. detectable — the old distance + vertical-band (+hysteresis) check,
  //   2. in the facing cone — INITIAL detection only works in front of the
  //      enemy (or inside the small omnidirectional hearing radius); once
  //      aware, detection is omnidirectional until sight is lost,
  //   3. past the notice delay — first detection starts an alert beat
  //      (noticeFrames, eye-glow/"?" tell in draw()) before aware flips on.
  // Subclasses keep using the raw fields (dx/verticalOk) for attack gating.
  canSeePlayer(player) {
    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dy = (player.y + player.height / 2) - (this.y + this.height / 2);

    const baseBand = this.ignoreVertical ? Infinity : (this.verticalBand != null ? this.verticalBand : ENEMY_VERTICAL_BAND);
    const band = (this.aware && !this.ignoreVertical) ? baseBand + ENEMY_VERTICAL_HYSTERESIS : baseBand;
    const verticalOk = Math.abs(dy) <= band;

    const dist = this.ignoreVertical ? Math.abs(dx) : Math.sqrt(dx * dx + dy * dy);
    const range = this.aware ? ENEMY_DETECT_RANGE + ENEMY_DETECT_HYSTERESIS : ENEMY_DETECT_RANGE;
    let detectable = verticalOk && dist < range;

    // Facing cone — only gates INITIAL detection (once aware, an enemy
    // doesn't forget an attacker who circles behind it). Flying enemies
    // have no meaningful facing and stay omnidirectional.
    if (detectable && !this.aware && !this.ignoreVertical) {
      const inFront = dx * this.facing > -ENEMY_REAR_SLACK;
      const heard = dist < ENEMY_HEARING_RADIUS;
      if (!inFront && !heard) detectable = false;
    }

    // Notice delay — an alert beat between "could detect" and "engaging".
    // Scales with gameTimeScale so Stillpoint slows enemy reactions too.
    const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;
    if (detectable && !this.alerted) {
      this.noticeTimer += _ts;
      if (this.noticeTimer >= this.noticeFrames) this.alerted = true;
    } else if (!detectable) {
      if (this.aware || this.alerted) {
        // Genuinely lost the player — drop back to unalerted patrol.
        this.alerted = false;
        this.noticeTimer = 0;
      } else if (this.noticeTimer > 0) {
        // Player slipped out mid-notice: decay instead of hard reset, so
        // skirting the cone edge doesn't restart the beat from zero.
        this.noticeTimer = Math.max(0, this.noticeTimer - 2 * _ts);
      }
    }

    const inRange = detectable && this.alerted;
    this.aware = inRange;
    const alertProgress = this.alerted ? 1 : Math.min(1, this.noticeTimer / Math.max(1, this.noticeFrames));
    return { inRange, dx, dy, dist, verticalOk, alertProgress };
  }

  // ── Movement intent with decision commit (2026-07-16 combat overhaul) ──
  // The chase/patrol/idle choice — including facing flips — only
  // re-evaluates when decisionTimer expires; between decisions the enemy
  // commits to its current movement instead of re-deciding every frame.
  // Ledge safety is still checked EVERY frame (commitment never walks an
  // enemy off a cliff). Centralized here so subclasses with their own
  // update() (VoidLancer etc.) reuse it instead of pasting the chase/patrol
  // block; `moveSpeed` is the subclass's chase speed.
  updateMovementIntent(sight, bounds, _ts, moveSpeed) {
    this.decisionTimer -= _ts;

    if (this.decisionTimer <= 0) {
      this.decisionTimer = this.decisionFrames;

      // Facing — only flips at decision points (windup start also snaps it,
      // see the windup trigger, so attacks never fire backward).
      if (Math.abs(sight.dx) > ENEMY_FACING_DEADZONE) {
        this.facing = sight.dx > 0 ? 1 : -1;
      }

      if (sight.inRange) {
        this.committedVx = this.facing * moveSpeed;
        this.idleTimer = 0;
      } else if (this.idleTimer > 0) {
        this.committedVx = 0;
      } else {
        // Patrol — own direction state, never touched by the chase branch,
        // so switching states can never leave stale momentum behind.
        const atLedge = this.grounded && !hasFootingAhead(this, bounds, this.patrolDir);
        if (Math.abs(this.x - this.patrolCenter) > this.patrolRange || atLedge) {
          this.patrolDir = this.x > this.patrolCenter ? -1 : 1;
        }
        this.committedVx = this.patrolDir * PATROL_SPEED * (moveSpeed / ENEMY_SPEED);
      }
    }

    if (this.idleTimer > 0) this.idleTimer -= _ts;

    // Apply the committed intent, with per-frame ledge safety.
    const moveDir = Math.sign(this.committedVx || 0);
    if (moveDir !== 0 && this.grounded && !hasFootingAhead(this, bounds, moveDir)) {
      this.vx = 0;
    } else {
      this.vx = this.committedVx || 0;
    }
  }

  // ── Defense verbs (2026-07-16 combat overhaul) ──────────────────────────
  // Ticks all defense timers and reacts to the START of a player swing
  // (block / dodge) and to Phase-Dash spam (dash-punish). Called near the
  // top of update() — before the hit-stun early return, so the anti-juggle
  // breakout can still charge and fire WHILE the enemy is being juggled
  // (that's its whole purpose). Safe no-op when this.defense is null.
  updateDefense(player, _ts) {
    // Timers tick unconditionally (they may have been set before a config change)
    if (this.blocking > 0) this.blocking -= _ts;
    if (this.guardCooldown > 0) this.guardCooldown -= _ts;
    if (this.guardBroken > 0) this.guardBroken -= _ts;
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= _ts;
    if (this.dodgeIFrames > 0) this.dodgeIFrames -= _ts;
    if (this.breakoutCooldown > 0) this.breakoutCooldown -= _ts;
    if (this.parriedRecently > 0) this.parriedRecently -= _ts;
    if (this.juggleWindowTimer > 0) {
      this.juggleWindowTimer -= _ts;
      if (this.juggleWindowTimer <= 0) this.juggleHits = 0;
    }

    // Breakout charge → burst. The 15f charge flash (see drawDefenseTells)
    // is the player's cue to dash out before the shove lands.
    if (this.breakoutCharge > 0) {
      this.breakoutCharge -= _ts;
      if (this.breakoutCharge <= 0) {
        this.breakoutBurstPending = true; // game.js applies the player shove + VFX
        this.hitStun = 0;                 // escapes the juggle
        this.juggling = false;
        this.juggleHits = 0;
        this.breakoutCooldown = (this.defense && this.defense.breakout && this.defense.breakout.cooldown) || 600;
      }
    }

    const d = this.defense;
    const swingStarted = player.attacking && !this._playerWasAttacking;
    this._playerWasAttacking = player.attacking;
    if (!d) return;

    // React to a swing STARTING (its startup frames) — never to a hit that
    // already landed. Only while able to act (not stunned/mid-action).
    if (swingStarted && !this.dead && this.hitStun <= 0 && !this.windingUp && !this.attacking) {
      const px = player.x + player.width / 2, ex = this.x + this.width / 2;
      const dist = Math.abs(px - ex);
      const inFront = (px - ex) * this.facing > 0;

      if (d.block && this.guardCooldown <= 0 && this.guardBroken <= 0 && inFront &&
          dist < (d.block.range ?? 90) && Math.random() < (d.block.chance ?? 0.4)) {
        // Raise guard for the swing's duration + a beat. Counterplay lives
        // in game.js's hit loop: heavy attacks and hits from behind break/
        // bypass it, and a Void Tether pull yanks the guard open.
        this.blocking = d.block.guardFrames ?? 26;
        this.guardCooldown = d.block.cooldown ?? 120;
        this.vx = 0;
      } else if (d.dodge && this.dodgeCooldown <= 0 &&
                 dist < (d.dodge.range ?? 90) && Math.random() < (d.dodge.chance ?? 0.35)) {
        const away = px > ex ? -1 : 1;
        if (this._movementFlies) {
          // Evasion in flight (2026-07-24) — every dodge-capable enemy was
          // grounded-only before this (the `this.grounded` gate below), so
          // flying enemies (Crystal Sentinel, Deflector Drone, Anchor
          // Wraith, Echo Stalker) could never dodge at all. No ledge check
          // needed — already airborne, nothing to fall off. Vertical jink
          // is randomized so it doesn't read as a fixed, learnable pattern.
          this.vx = away * 5;
          this.vy = (Math.random() < 0.5 ? -1 : 1) * 4;
          this.dodgeIFrames = d.dodge.iframes ?? 18;
          this.dodgeCooldown = d.dodge.cooldown ?? 150;
        } else if (this.grounded) {
          // Telegraphed back-hop with brief i-frames — fixed landing
          // recovery is the punish window; baiting it out (swing, wait,
          // swing) is the counterplay. Never hops off a ledge.
          if (hasFootingAhead(this, null, away, 34)) {
            this.vx = away * 5;
            this.vy = -5;
            this.grounded = false;
            this.dodgeIFrames = d.dodge.iframes ?? 18;
            this.dodgeCooldown = d.dodge.cooldown ?? 150;
          }
        }
      }
    }

    // Ranged Dodge (2026-07-26, first use: Hollow of the Warden & Hollow
    // duo — "guaranteed dodge vs. ranged & ability hits, vulnerable to
    // melee"). Reactive evasion specifically against the player's OWN
    // ranged projectiles (Shard Shot), separate from the melee-swing-
    // triggered `dodge` above — checked every frame, not gated on
    // `swingStarted`. Reads the live player-projectile array (game.js's
    // `projectiles`, distinct from ComposedEnemy's own enemy-fired one)
    // for anything within range and heading toward this enemy, then reuses
    // the exact same dodge i-frame/hop mechanics as `d.dodge` above, just
    // gated on a different trigger. Deliberately scoped to Shard Shot only
    // this pass — Void Tether/Graviton Surge "ability hits" aren't
    // detected here (see roadmap.md's Warden & Hollow entry for why).
    if (d.rangedDodge && this.dodgeCooldown <= 0 && !this.dead && this.hitStun <= 0 &&
        typeof projectiles !== 'undefined') {
      for (const proj of projectiles) {
        if (!proj.alive) continue;
        const pcx = proj.x + (proj.width || 0) / 2, pcy = proj.y + (proj.height || 0) / 2;
        const ecx = this.x + this.width / 2, ecy = this.y + this.height / 2;
        if (Math.hypot(pcx - ecx, pcy - ecy) > (d.rangedDodge.range ?? 220)) continue;
        if ((ecx - pcx) * proj.vx <= 0) continue; // not heading this way
        if (Math.random() >= (d.rangedDodge.chance ?? 0.9)) continue;
        const away = pcx > ecx ? -1 : 1;
        if (this._movementFlies) {
          this.vx = away * 5;
          this.vy = (Math.random() < 0.5 ? -1 : 1) * 4;
        } else if (this.grounded && hasFootingAhead(this, null, away, 34)) {
          this.vx = away * 5;
          this.vy = -5;
          this.grounded = false;
        } else {
          continue; // couldn't actually dodge this frame — try again next frame
        }
        this.dodgeIFrames = d.rangedDodge.iframes ?? 20;
        this.dodgeCooldown = d.rangedDodge.cooldown ?? 90;
        break;
      }
    }

    // Dash-punish (reactivity): a player phase-dashing through this enemy
    // twice in ~4s gets an instant turn (skips the decision commit once)
    // and a fast swipe aimed at the dash exit. Punishes dash-through spam
    // specifically (BAL-001's "echo/dash as a crutch" complaint).
    if (d.dashPunish) {
      if (this._dashPassTimer > 0) {
        this._dashPassTimer -= _ts;
        if (this._dashPassTimer <= 0) this._dashPassCount = 0;
      }
      if (player.phaseDashing && !this._wasPhaseDashing) {
        const dist = Math.abs((player.x + player.width / 2) - (this.x + this.width / 2));
        if (dist < 120) { this._dashPassCount++; this._dashPassTimer = 240; }
      }
      this._wasPhaseDashing = player.phaseDashing;

      if (this._dashPassCount >= 2 && this.hitStun <= 0 && !this.dead &&
          !this.windingUp && !this.attacking && this.attackCooldown <= 0) {
        this._dashPassCount = 0;
        this.facing = (player.x + player.width / 2) > (this.x + this.width / 2) ? 1 : -1;
        this.windingUp = true;
        if (typeof SFX !== 'undefined') SFX.enemyTelegraph();
        this.windUpTimer = Math.max(10, Math.round(ENEMY_WINDUP_FRAMES * 0.5)); // fast punish swipe
        this.vx = 0;
      }
    }
  }

  // Breakout hit-registration — called from every takeDamage (base and the
  // overrides in VoidLancer/ComposedEnemy) so juggle detection can't drift
  // out of sync with damage application.
  registerHitForBreakout() {
    const b = this.defense && this.defense.breakout;
    if (!b || this.dead) return;
    this.juggleHits++;
    this.juggleWindowTimer = b.window ?? 120;
    if (this.juggleHits >= (b.hits ?? 4) && this.breakoutCooldown <= 0 && this.breakoutCharge <= 0) {
      this.breakoutCharge = 15; // readable flash, then the burst fires in updateDefense
    }
  }

  // Per-attack damage/knockback override — same contract ComposedEnemy
  // already had; game.js calls this on whatever enemy's attack landed.
  // Base enemies opt in by setting this.attackDamage / this.attackKnockback.
  getAttackDamageAndKnockback() {
    if (this.attackDamage == null && this.attackKnockback == null) return null;
    return {
      damage: this.attackDamage != null ? this.attackDamage : ENEMY_DAMAGE,
      knockback: this.attackKnockback || undefined,
    };
  }

  // Visual tells for the defense verbs — shared so subclasses with their own
  // draw() can call it too (base draw() already does).
  drawDefenseTells(ctx) {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    // Guard: a steel arc held in front of the enemy
    if (this.blocking > 0) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const mid = this.facing === 1 ? 0 : Math.PI;
      ctx.arc(cx, cy, this.width * 0.75, mid - 0.7, mid + 0.7);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Broken guard: cracked-arc stagger marker
    if (this.guardBroken > 0) {
      ctx.globalAlpha = Math.min(1, this.guardBroken / 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('×', cx, this.y - 6);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    // Breakout charge: expanding white flash ring — the "get out" cue
    if (this.breakoutCharge > 0) {
      const t = 1 - this.breakoutCharge / 15;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 - t * 0.4})`;
      ctx.lineWidth = 3 + t * 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 10 + t * 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  update(player, bounds, echoes) {
    const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;

    if (this.dead) { this.deathTimer++; return; }

    // Defense verbs first — must run before the hit-stun early return below
    // so the anti-juggle breakout can charge/fire mid-juggle.
    this.updateDefense(player, _ts);

    // Echo distraction — timer scales with game speed
    if (this.distractionTimer > 0) {
      this.distractionTimer -= _ts;
      if (this.distractionTimer < 0) this.distractionTimer = 0;
    }
    if (this.distractionTimer > 0 && this.distractionTarget && this.distractionTarget.alive) {
      const echo = this.distractionTarget;
      this.facing = (echo.x + echo.width / 2) > (this.x + this.width / 2) ? 1 : -1;
      this.vx = 0;
      this.windingUp = false;
      this.attacking = false;
      this.attackTimer = 0;
      this.flashTimer++;
      return;
    }

    let nearestEcho = null, nearestDist = ECHO_DISTRACT_RADIUS;
    for (const echo of echoes) {
      if (!echo.alive) continue;
      const d = Math.abs((this.x + this.width / 2) - (echo.x + echo.width / 2));
      if (d < nearestDist) { nearestDist = d; nearestEcho = echo; }
    }
    if (nearestEcho) {
      this.distractionTarget = nearestEcho;
      this.distractionTimer = ECHO_DISTRACT_DURATION;
      return;
    }

    const wasAware = this.aware;
    const sight = this.canSeePlayer(player);
    // Face the player when engaged (fixes "walking away" bug)
    if (sight.inRange && Math.abs(sight.dx) > ENEMY_FACING_DEADZONE) {
      this.facing = sight.dx > 0 ? 1 : -1;
    }

    // Lost the player this frame — stop chase movement immediately instead of
    // carrying stale chase velocity into the patrol branch below, then idle
    // briefly before patrol resumes (absorbs flicker right at the vertical-
    // band boundary instead of visibly pacing back and forth every frame).
    // Forcing decisionTimer to 0 makes the next frame a real decision point,
    // so losing the player is never masked by a stale movement commitment.
    if (wasAware && !sight.inRange) {
      this.vx = 0;
      this.committedVx = 0;
      this.idleTimer = PATROL_IDLE_FRAMES;
      this.decisionTimer = 0;
    }

    // ── Windup telegraph ─────────────────────────────────────────────────────
    // Begin windup when actively engaging (aware + in range + vertical band)
    // — an enemy on a different platform never attacks just because the
    // player is horizontally close, and an unaware enemy gets its notice
    // beat before its first swing instead of attacking the instant the
    // player walks up behind it. Facing snaps to the player at windup start
    // (deliberate: the enemy commits to the attack and turns to deliver it),
    // so the decision-commit facing can never make it swing backward.
    if (sight.inRange && Math.abs(sight.dx) < ENEMY_ATTACK_RANGE && this.attackCooldown <= 0 && !this.windingUp && !this.attacking) {
      if (Math.abs(sight.dx) > ENEMY_FACING_DEADZONE) this.facing = sight.dx > 0 ? 1 : -1;
      this.windingUp = true;
      if (typeof SFX !== 'undefined') SFX.enemyTelegraph();
      // Mix-ups: roll the windup duration (±windupVariance) so attack
      // timing can't be metronome-memorized, and maybe make this windup a
      // feint — cancel at ~60% and immediately re-wind the real swing.
      // Being parried recently raises the feint odds (parry-respect).
      const variance = 1 + (Math.random() * 2 - 1) * this.windupVariance;
      this.windUpTimer = Math.max(8, Math.round(ENEMY_WINDUP_FRAMES * variance));
      const feintOdds = this.feintChance + (this.parriedRecently > 0 ? 0.2 : 0);
      this.feinting = feintOdds > 0 && Math.random() < feintOdds;
      if (this.feinting) this.windUpTimer = Math.round(this.windUpTimer * 0.6);
      this.vx = 0;
    }

    if (this.windingUp) {
      this.windUpTimer -= _ts;
      this.vx = 0; // freeze during windup
      if (this.windUpTimer <= 0) {
        if (this.feinting) {
          // Feint: the telegraph resets and the REAL swing comes in faster —
          // the restarted windup ring is itself the readable feint tell.
          this.feinting = false;
          this.windUpTimer = Math.max(8, Math.round(ENEMY_WINDUP_FRAMES * 0.7));
        } else {
          this.windingUp = false;
          this.attacking = true;
          this.attackTimer = 20;
          this.attackCooldown = ENEMY_ATTACK_COOLDOWN;
        }
      }
    }

    // ── Hit stun ─────────────────────────────────────────────────────────────
    if (this.hitStun > 0) {
      this.hitStun--;
      // Physics during hit stun (allow airborne movement for juggling).
      // resolveEnemyPhysics (physics.js) handles floors, walls (hard
      // knockback bounces — see PHYS_WALL_BOUNCE_*), ceilings, and the
      // juggle-ends-on-landing rule.
      this.grounded = false;
      applyRoomGravity(this, _ts); // physics.js — 'down' everywhere except Gravity Collapse Core's own room
      // Smash-style knockback decay (user feedback 2026-07-19: "goes a set
      // distance and then stops" — vx held completely constant in the air
      // with zero drag, so a hit traveled at fixed speed for its whole
      // flight and only decelerated once physics.js's grounded-only *0.8
      // friction kicked in on landing; if hitStun ran out first, the AI
      // branch below just overwrote vx outright, reading as an instant
      // hard stop either way). Mirrors player.js's own knockback decay
      // (`this.vx *= 0.92` every hitStunTimer frame, line ~398) — a launch
      // still starts fast (the initial knockback impulse is untouched) but
      // now bleeds off continuously through the whole airborne arc instead
      // of holding flat, and lands into physics.js's steeper *0.8 ground
      // friction for a quicker final settle, same "fast start, quick
      // decel" shape Smash's knockback uses.
      this.vx *= 0.92;
      this.x += this.vx * _ts;
      this.y += this.vy * _ts;
      resolveEnemyPhysics(this, bounds, _ts);

      this.flashTimer--;
      if (this.flashTimer <= 0) this.flashTimer = -1;
      if (this.dead) this.deathTimer++;
      return; // skip AI during hit stun
    }

    // ── Attack ───────────────────────────────────────────────────────────────
    if (this.attacking) {
      this.vx = 0;
      this.attackTimer -= _ts;
      if (this.attackTimer <= 0) this.attacking = false;
    }

    if (this.attackCooldown > 0) this.attackCooldown -= _ts;
    if (this.attackCooldown < 0) this.attackCooldown = 0;

    // ── Movement AI (only when not winding up or attacking) ──────────────────
    // Chase/patrol/idle intent — including facing — is chosen at decision
    // points and committed between them (see updateMovementIntent), with
    // ledge safety still enforced every frame.
    if (!this.windingUp && !this.attacking && this.dodgeIFrames <= 0) {
      this.updateMovementIntent(sight, bounds, _ts, this.speed);
    }

    // Physics — shared resolver (physics.js): floors, wall stop/bounce,
    // ceilings, world floor + bounds. Replaces the old inline top-landing-
    // only loop, which could snap an enemy walking into a tall wall up onto
    // its top surface (no prevBottom guard) and ignored ceilings entirely.
    // If airborne and NOT juggling, stop horizontal movement — prevents enemies walking off platform edges into void
    if (!this.grounded && !this.juggling) this.vx = 0;
    this.grounded = false;
    applyRoomGravity(this, _ts);
    this.x += this.vx * _ts;
    this.y += this.vy * _ts;
    resolveEnemyPhysics(this, bounds, _ts);

    this.flashTimer++; // unscaled — visual flash stays snappy
  }

  getAttackHitbox() {
    if (!this.attacking || this.attackTimer > 15) return null;
    return {
      x: this.facing === 1 ? this.x + this.width : this.x - 30,
      y: this.y + 4,
      width: 30,
      height: 24
    };
  }

  takeDamage(dmg, sourceX, attackDir = 'forward') {
    this.health -= dmg;
    this.flashTimer = 0;
    this.windingUp = false; // interrupt windup on hit — gives player a punish window
    this.windUpTimer = 0;
    this.feinting = false;
    this.hitStun = 14; // base hit stun frames
    this.registerHitForBreakout(); // anti-juggle burst bookkeeping (no-op without defense.breakout)

    if (sourceX !== undefined) {
      const dir = (this.x > sourceX ? 1 : -1);
      // Directional knockback scales with attack type
      if (attackDir === 'up') {
        this.vx = dir * KNOCKBACK_UP_X;
        this.vy = KNOCKBACK_UP_Y;
        this.juggling = true;
      } else if (attackDir === 'down') {
        this.vx = dir * KNOCKBACK_DOWN_X;
        this.vy = KNOCKBACK_DOWN_Y;
      } else {
        this.vx = dir * KNOCKBACK_FORWARD_X;
        this.vy = KNOCKBACK_FORWARD_Y;
        if (!this.grounded) this.juggling = true;
      }
    }
    if (this.health <= 0) this.dead = true;
  }

  draw(ctx) {
    if (this.dead) {
      ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 20);
    }

    // ── Body colour ───────────────────────────────────────────────────────────
    if (this.flashTimer < 6) {
      ctx.fillStyle = '#ffffff';
    } else if (this.distractionTimer > 0) {
      ctx.fillStyle = '#818cf8';
    } else if (this.windingUp) {
      // Windup colour — shift from red toward bright orange-white as timer expires
      const t = 1 - this.windUpTimer / ENEMY_WINDUP_FRAMES;
      const r = Math.round(248 + 7 * t);
      const g = Math.round(113 * (1 - t));
      ctx.fillStyle = `rgb(${r}, ${g}, 40)`;
    } else {
      ctx.fillStyle = this.bodyColor;
    }

    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Eye — warms from black toward amber while the notice beat ramps up
    // (the "it's starting to see you" tell; the "?" below completes it).
    const noticing = !this.aware && this.noticeTimer > 0;
    if (noticing) {
      const p = Math.min(1, this.noticeTimer / Math.max(1, this.noticeFrames));
      ctx.fillStyle = `rgb(${Math.round(10 + 240 * p)}, ${Math.round(10 + 180 * p)}, ${Math.round(15 + 20 * p)})`;
    } else {
      ctx.fillStyle = '#0a0a0f';
    }
    const eyeX = this.facing === 1 ? this.x + 18 : this.x + 4;
    ctx.fillRect(eyeX, this.y + 8, 8, 6);

    // ── Notice tell: "?" fades in above the head during the alert beat ──────
    // (deliberately distinct from the windup "!" — "?" means "it's noticing
    // you, back off or commit", "!" means "the swing is coming").
    if (noticing && !this.windingUp) {
      const p = Math.min(1, this.noticeTimer / Math.max(1, this.noticeFrames));
      ctx.globalAlpha = 0.3 + p * 0.7;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('?', this.x + this.width / 2, this.y - 6);
      ctx.textAlign = 'left';
      ctx.globalAlpha = this.dead ? Math.max(0, 1 - this.deathTimer / 20) : 1;
    }

    // Defense-verb tells (guard arc, broken-guard ×, breakout charge ring)
    this.drawDefenseTells(ctx);

    // ── Windup telegraph: expanding danger ring + "!" above head ─────────────
    if (this.windingUp) {
      const progress = 1 - this.windUpTimer / ENEMY_WINDUP_FRAMES; // 0→1
      const ringRadius = 8 + progress * 20;
      const alpha = 0.3 + progress * 0.5;
      ctx.strokeStyle = `rgba(255, 120, 40, ${alpha})`;
      ctx.lineWidth = 2 - progress;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Exclamation mark — pulses brighter as the swing approaches
      const excAlpha = 0.5 + progress * 0.5;
      ctx.globalAlpha = excAlpha;
      ctx.fillStyle = '#fbbf24';
      ctx.font = `bold ${10 + Math.round(progress * 4)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('!', this.x + this.width / 2, this.y - 6);
      ctx.textAlign = 'left';
      ctx.globalAlpha = this.dead ? Math.max(0, 1 - this.deathTimer / 20) : 1;

      // Crouching squash — compress body toward ground
      const squash = progress * 0.35;
      ctx.fillStyle = '#f87171';
      ctx.fillRect(this.x - squash * this.width * 0.5, this.y + squash * this.height * 0.4,
                   this.width + squash * this.width, this.height * (1 - squash * 0.4));
    }

    // ── Attack swing: slash arc ───────────────────────────────────────────────
    if (this.attacking && this.attackTimer <= 15) {
      const atk = this.getAttackHitbox();
      if (atk) {
        const swingProgress = 1 - this.attackTimer / 15;
        // Arc lines — fan out from body
        const originX = this.facing === 1 ? this.x + this.width : this.x;
        const originY = this.y + this.height / 2;
        const arcSpan = Math.PI * 0.65 * swingProgress;
        const startAngle = this.facing === 1 ? -Math.PI * 0.55 : -Math.PI * 0.45;
        const arcLen = 32;
        ctx.strokeStyle = `rgba(248, 113, 113, ${0.8 - swingProgress * 0.5})`;
        ctx.lineWidth = 3 - swingProgress * 2;
        for (let i = 0; i <= 5; i++) {
          const a = startAngle + (i / 5) * this.facing * arcSpan;
          ctx.beginPath();
          ctx.moveTo(originX, originY);
          ctx.lineTo(originX + Math.cos(a) * arcLen, originY + Math.sin(a) * arcLen);
          ctx.stroke();
        }
        ctx.lineWidth = 1;
        // Impact flash at tip
        if (swingProgress > 0.7) {
          ctx.fillStyle = `rgba(255, 200, 100, ${(swingProgress - 0.7) * 2})`;
          const tipAngle = startAngle + this.facing * arcSpan;
          ctx.beginPath();
          ctx.arc(originX + Math.cos(tipAngle) * arcLen,
                  originY + Math.sin(tipAngle) * arcLen, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stutterer — teleports in bursts, leaving decoy images
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// VoidLancer — telegraphed charging thrust. Perfect parry stuns it and the
// next hit lands for double damage (see takeDamage). Planned enemy from
// expansion.md §2 (home region: The Void Expanse, not built yet) — built as
// a standalone class per roadmap.md Phase 2.2 ("Lancer" -> "Void Lancer").
// ─────────────────────────────────────────────────────────────────────────────
const LANCER_HEALTH = 10;
const LANCER_SPEED = 1.2;          // slower patrol/approach than Fractured — the payoff is the charge
const LANCER_DAMAGE = 2;           // charge hits harder than a basic Fractured swing (ENEMY_DAMAGE=1)
const LANCER_CHARGE_SPEED = 10;
const LANCER_WINDUP_FRAMES = 34;   // slightly longer than ENEMY_WINDUP_FRAMES — glowing spear tip telegraph
const LANCER_CHARGE_DURATION = 20;
const LANCER_CHARGE_COOLDOWN = 130;


// ═══════════════════════════════════════════════════════════════════════════
// Task 5 (session_priorities.md #5) — 5 new enemies from expansion.md §2/§2.3.
// Picked to work with abilities already in the game (Phase Dash, Shard Shot)
// rather than the unbuilt Graviton Surge, and two (Mirror Sprite, Echo
// Stalker) double as first real content for Mirror Veil, which has been an
// empty enemies:[] skeleton since Phase 9. See roadmap.md for balance notes.
// ═══════════════════════════════════════════════════════════════════════════

// ── Null Sentinel (expansion.md 2.3 #29) — Phase Dash counter ──────────────
// Alternates phaseable (dim) / solid (bright) every ~1s. Dashing into it
// while solid cancels the dash and deals a small hit; while phaseable it's a
// free pass-through, same as an ordinary Phase Dash. Reuses the base Enemy's
// chase/patrol/attack AI via super.update() — only the phase toggle and the
// dash-counter check are new.
const SENTINEL_PHASE_INTERVAL = 60; // ~1s per state at 60fps


// ── Anchor Wraith (expansion.md 2.3 #28) — Phase Dash counter ──────────────
// Tethered, drifts slowly (doesn't chase aggressively), projects a visible
// stasis field. Phase Dashing while inside the field cancels the dash and
// deals a small hit + strips i-frames, punishing "dash through everything"
// as a reflex — same design intent as Null Sentinel, different shape
// (always-on field vs. a timed on/off state).
const WRAITH_FIELD_RADIUS = 120;
const WRAITH_DRIFT_SPEED = 0.8;
const ANCHOR_WRAITH_HEALTH = 4; // low relative to other enemies, per expansion.md — meant to be killed before it matters, not fought head-on


// ── Deflector Drone (expansion.md 2.3 #31) — Shard Shot counter ────────────
// Hovers passively, shield always faces the player. A Shard Shot that hits
// the shielded side is reflected back (see game.js's projectile/enemy
// collision loop for the actual reflection — that array lives in game.js,
// not here, so the counter can't be fully self-contained the way the two
// Phase-Dash counters above are).
const DEFLECTOR_HOVER_SPEED = 0.5;
const DEFLECTOR_HEALTH = 5;


// ── Mirror Sprite (expansion.md §2, enemy #22) — Mirror Veil flavor enemy ──
// Only tangible when the player is facing it; attacks from behind (i.e.
// while the player is NOT facing it) otherwise. Reuses base Enemy attack AI
// via super.update(), then overrides tangibility afterward.
const SPRITE_HEALTH = 4;


// ── Echo Stalker (expansion.md §2, enemy #2) — Mirror Veil flavor enemy ────
// Teleports to just behind the player the moment a Phase Dash ends. Reuses
// Stutterer's teleport-blink visual convention (decoy fade, blink flicker).
const STALKER_BLINK_COOLDOWN = 45;
const STALKER_HEALTH = 4;


// ─────────────────────────────────────────────────────────────────────────────
// FracturedSlime — summoned miniboss by the Fractured Sovereign
// ─────────────────────────────────────────────────────────────────────────────
const SLIME_SPEED = 2.5;
const SLIME_HEALTH = 8;
const SLIME_DAMAGE = 1;

class FracturedSlime {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 32;
    this.height = 24;
    this.vx = 0;
    this.vy = 0;
    this.health = SLIME_HEALTH;
    this.maxHealth = SLIME_HEALTH;
    this.facing = -1;
    this.dead = false;
    this.deathTimer = 0;
    this.grounded = false;
    this.flashTimer = 0;
    this.state = 'idle';
    this.stateTimer = 60 + Math.random() * 60;
    this.attackCooldown = 0;
    this.stunTimer = 0; // parry stun
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  getAttackHitbox() {
    if (this.state !== 'charging' || this.stateTimer <= 5) return null;
    return {
      x: this.facing === 1 ? this.x + this.width : this.x - 20,
      y: this.y - 4,
      width: 20,
      height: this.height + 8
    };
  }

  takeDamage(amount, fromX) {
    if (this.dead) return;
    this.health -= amount;
    this.flashTimer = 6;
    this.attackCooldown = Math.max(this.attackCooldown, 20);
    if (this.health <= 0) { this.health = 0; this.dead = true; this.deathTimer = 0; }
  }

  update(player, bounds, echoes) {
    const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;

    if (this.dead) { this.deathTimer++; return; }

    // Stunned by parry — skip all actions
    if (this.stunTimer > 0) {
      this.stunTimer -= _ts;
      this.flashTimer = Math.max(0, this.flashTimer - 1);
      return;
    }

    const area = getCurrentArea();
    this.facing = player.x > this.x ? 1 : -1;
    this.flashTimer = Math.max(0, this.flashTimer - 1);
    if (this.attackCooldown > 0) this.attackCooldown -= _ts;
    if (this.attackCooldown < 0) this.attackCooldown = 0;
    this.stateTimer -= _ts;

    switch (this.state) {
      case 'idle':
        this.vx *= 0.8;
        // Windup tell before charge: briefly squashes then launches
        if (this.stateTimer <= 0 && this.attackCooldown <= 0) {
          if (Math.random() < 0.6 && this.grounded) {
            this.state = 'charging';
            this.stateTimer = 30;
            this.vx = this.facing * SLIME_SPEED * 2;
            if (typeof SFX !== 'undefined') SFX.enemyTelegraphHeavy();
          } else if (this.grounded) {
            this.state = 'hopping';
            this.stateTimer = 20;
            this.vy = -7;
            this.vx = this.facing * SLIME_SPEED;
            if (typeof SFX !== 'undefined') SFX.enemyHop();
          }
        }
        break;
      case 'charging':
        if (this.stateTimer <= 0) { this.state = 'idle'; this.stateTimer = 40; this.vx = 0; }
        break;
      case 'hopping':
        if (this.grounded && this.stateTimer <= 0) { this.state = 'idle'; this.stateTimer = 50; }
        break;
    }

    this.grounded = false;
    applyRoomGravity(this, _ts);
    this.y += this.vy * _ts;
    this.x += this.vx * _ts;
    resolveEnemyPhysics(this, bounds, _ts); // shared resolver — see physics.js
  }

  draw(ctx) {
    if (this.dead) {
      ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 20);
    }

    ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : '#2dd4bf';

    const cx = this.x + this.width / 2;
    ctx.fillRect(this.x + 4, this.y + 4, this.width - 8, this.height - 4);
    ctx.fillRect(this.x + 8, this.y, this.width - 16, this.height);

    // Eyes
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(cx - 6, this.y + 8, 4, 4);
    ctx.fillRect(cx + 2, this.y + 8, 4, 4);

    // Charge tell — arrow in direction of charge
    if (this.state === 'charging') {
      const arrowX = this.facing === 1 ? this.x + this.width + 4 : this.x - 14;
      ctx.fillStyle = 'rgba(45, 212, 191, 0.85)';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(this.facing === 1 ? '›' : '‹', arrowX, this.y + this.height / 2 + 5);
    }

    ctx.globalAlpha = 1;
  }
}

if (typeof spawnParticles === 'undefined') {
  var spawnParticles = function() {};
}
// ─────────────────────────────────────────────────────────────────────────────
// Crystal Sentinel — Ranged enemy with a directional shield
// ─────────────────────────────────────────────────────────────────────────────
const SENTINEL_HEALTH = 10;
const SENTINEL_SHIELD_HP = 2;
const SENTINEL_SPEED = 1.2;
const SENTINEL_ATTACK_COOLDOWN = 90;

// ComposedEnemy migration (2026-07-24, user request: "add crystal sentinel to
// composed enemy so that all enemies are composed"). Def + class now live
// in the Migrated legacy enemy classes section below (after ComposedEnemy's
// own declaration, same temporal-dead-zone reason Stutterer etc. are there).
// The directional shield-HP system that blocked this migration before is now
// a generic ComposedEnemy trait (`def.stats.shield` — see the constructor's
// comment, ~10 lines above `takeDamage()`) instead of bespoke per-class code.

// ─────────────────────────────────────────────────────────────────────────────
// Blitz Guard — fast, short telegraph, constant pressure.
// Designed for post-Stillpoint areas (col 5+, rows 1+).
// ─────────────────────────────────────────────────────────────────────────────
const BLITZ_HEALTH = 7;
const BLITZ_SPEED = 3.5;
const BLITZ_DAMAGE = 1;
const BLITZ_WINDUP_FRAMES = 14; // very short – you MUST predict
const BLITZ_ATTACK_COOLDOWN = 35;
const BLITZ_DETECT_RANGE = 300;


// ─────────────────────────────────────────────────────────────────────────────
// Colossus Core — Crag of the Colossus miniboss (crag_warden). A rock-shelled
// construct that only Charged (heavy) attacks can damage — a normal hit
// bounces off with a spark, exactly like the region's destructible rubble
// walls. Single telegraphed charge attack, no phases — reskin of "The
// Fractured Sovereign's Guard" (expansion.md 4.1), chosen because it's the most
// "basic, no ability required beyond Charged Attack" fight on the miniboss
// roster, which fits a region's first miniboss. Reward: +1 Max Health,
// applied by game.js when `defeatedMinibosses['colossus_core']` flips true.
// ─────────────────────────────────────────────────────────────────────────────
const COLOSSUS_HEALTH = 20;
const COLOSSUS_SPEED = 4.2; // bumped alongside the larger body (2026-07-27) — a bigger Colossus covering ground at the old speed read as sluggish
const COLOSSUS_DAMAGE = 2;
// Swing range/reach scale off `width`/`height` below — this is just the
// distance threshold that decides "close enough to swing instead of
// charging," not a hitbox size.
const COLOSSUS_SWING_RANGE = 150;

class ColossusCore {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    // A little larger than a big human-scale fighter (this game's player is
    // 24x32; a broad-shouldered human-proportioned brawler would sit around
    // 36-44 tall at this scale) — Colossus Core is meant to read as a
    // towering golem well past that, not just a slightly bigger person.
    this.width = 84;
    this.height = 92;
    this.vx = 0;
    this.vy = 0;
    this.health = COLOSSUS_HEALTH;
    this.maxHealth = COLOSSUS_HEALTH;
    this.facing = -1;
    this.dead = false;
    this.deathTimer = 0;
    this.grounded = false;
    this.flashTimer = 0;
    this.bounceFlash = 0; // brief white flash when a NON-heavy hit bounces off (no damage)
    this.state = 'idle';  // idle -> telegraph -> charging -> idle, or idle -> swing_telegraph -> swinging -> idle
    this.stateTimer = 90;
    this.attackCooldown = 0;
    this.stunTimer = 0; // parry stun
    this.displayName = 'Crag Warden'; // game.js's generic defeat notification reads this

    // Visual/hitbox bridge to game/animdata.js (2026-07-27) — additive, same
    // fallback rule as Boss/ComposedEnemy: an authored `colossus_<state>` key
    // (editor/anim_editor.html) overrides the procedural body art AND the
    // hardcoded hitbox rects below; nothing authored means zero behavior
    // change. `this.state` is already attack-specific here (charging vs
    // swinging are two different states), unlike Boss, so it doubles as the
    // per-attack key with no extra `_activeAttack` field needed.
    this.animator = new Animator(this);
    this._animKey = null;
  }

  getBounds() { return { x: this.x, y: this.y, width: this.width, height: this.height }; }

  animStateKey() {
    if (this.dead) return 'colossus_dead';
    return `colossus_${this.state}`;
  }

  // Whether a hit actually connects for life-steal/fracture-gain purposes —
  // queried by game.js's generalized miniboss combat block instead of
  // hardcoding "only heavy" to this one class. Matches takeDamage()'s own
  // isHeavy gate exactly, so a non-heavy hit still bounces (no damage) but
  // is also correctly reported as not having connected.
  willConnect(isHeavy) { return !!isHeavy; }

  getAttackHitbox() {
    // Anim-driven path (2026-07-27) — mirrors Boss's getAttackHitbox() bridge
    // exactly. `this._animKey` was already set to this tick's correct value
    // by update() before game.js calls this.
    if (typeof ANIM_DEFS !== 'undefined' && ANIM_DEFS[this._animKey]) {
      const hitboxes = this.animator.currentHitboxes();
      if (hitboxes.length === 0) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const hb of hitboxes) {
        minX = Math.min(minX, hb.x); minY = Math.min(minY, hb.y);
        maxX = Math.max(maxX, hb.x + hb.width); maxY = Math.max(maxY, hb.y + hb.height);
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    if (this.state === 'charging') {
      return {
        x: this.facing === 1 ? this.x + this.width : this.x - 26,
        y: this.y + 10,
        width: 26,
        height: this.height - 20,
      };
    }
    // Swing — a wide overhead haymaker, reaching further out than the
    // charge's contact poke and covering more vertical space (it's meant to
    // threaten a player standing right next to the Colossus, not just
    // whoever's directly in its charge lane).
    if (this.state === 'swinging') {
      return {
        x: this.facing === 1 ? this.x + this.width - 10 : this.x - 46,
        y: this.y - 10,
        width: 56,
        height: this.height * 0.7,
      };
    }
    return null;
  }

  // Distinct feel per attack (game.js's generic miniboss combat block reads
  // this if present, falling back to flat COLOSSUS_DAMAGE otherwise): the
  // charge is a persistent shove down its charge lane, the swing is a single
  // big haymaker that launches the player up and away instead.
  getAttackDamageAndKnockback() {
    // Anim-driven path — same authored-frame source as getAttackHitbox()
    // above; first authored hitbox on the frame wins, falls through below
    // when unauthored.
    if (typeof ANIM_DEFS !== 'undefined' && ANIM_DEFS[this._animKey]) {
      const hitboxes = this.animator.currentHitboxes();
      if (hitboxes.length > 0) {
        const hb = hitboxes[0];
        return { damage: hb.damage, knockback: { vx: hb.knockbackX, vy: hb.knockbackY, hitStun: hb.hitStun } };
      }
    }

    if (this.state === 'swinging') {
      return { damage: COLOSSUS_DAMAGE, knockback: { vx: 5, vy: -9, hitStun: 18 } };
    }
    return { damage: COLOSSUS_DAMAGE, knockback: { vx: 6, vy: -2, hitStun: 14 } };
  }

  // `isHeavy` — only a Charged Attack can damage the core; a normal hit
  // bounces off (visual/audio feedback only, no health loss, no hitstun).
  // This mirrors the destructible-wall rule elsewhere in the region: some
  // things only yield to force.
  takeDamage(amount, fromX, attackDir, isHeavy) {
    if (this.dead) return;
    if (!isHeavy) {
      this.bounceFlash = 8;
      if (typeof SFX !== 'undefined') SFX.shardHit();
      return;
    }
    this.health -= amount;
    this.flashTimer = 8;
    this.attackCooldown = Math.max(this.attackCooldown, 30);
    if (fromX !== undefined) this.vx = (this.x > fromX ? 1 : -1) * 2;
    if (this.health <= 0) { this.health = 0; this.dead = true; this.deathTimer = 0; }
  }

  update(player, bounds, echoes) {
    const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;
    if (this.dead) { this.deathTimer++; return; }

    if (this.stunTimer > 0) {
      this.stunTimer -= _ts;
      this.flashTimer = Math.max(0, this.flashTimer - 1);
      return;
    }

    const area = getCurrentArea();
    this.facing = player.x > this.x ? 1 : -1;
    this.flashTimer = Math.max(0, this.flashTimer - 1);
    this.bounceFlash = Math.max(0, this.bounceFlash - 1);
    if (this.attackCooldown > 0) this.attackCooldown -= _ts;
    if (this.attackCooldown < 0) this.attackCooldown = 0;
    this.stateTimer -= _ts;

    const dist = Math.abs((player.x + player.width / 2) - (this.x + this.width / 2));

    switch (this.state) {
      case 'idle':
        // Close in at a slow walk while out of charge range instead of
        // just standing still waiting for the player to wander closer —
        // a stationary Colossus reads as passive/static; this keeps it
        // actually hunting between charges.
        if (dist >= 500 && this.grounded) {
          this.vx = this.facing * (COLOSSUS_SPEED * 0.3);
        } else {
          this.vx *= 0.85;
        }
        if (this.stateTimer <= 0) {
          if (this.attackCooldown <= 0 && dist < COLOSSUS_SWING_RANGE && this.grounded) {
            // Close enough to just swing — no reason to back off and charge
            // when the player is already standing right next to it.
            this.state = 'swing_telegraph';
            this.stateTimer = 26; // shorter, punchier windup than the charge
            this.vx = 0;
            if (typeof SFX !== 'undefined') SFX.enemyTelegraphHeavy();
          } else if (this.attackCooldown <= 0 && dist < 500 && this.grounded) {
            this.state = 'telegraph';
            this.stateTimer = 40; // visible windup before the charge — see draw()
            this.vx = 0;
            if (typeof SFX !== 'undefined') SFX.enemyTelegraphHeavy();
          } else {
            this.stateTimer = 30; // keep re-checking
          }
        }
        break;
      case 'telegraph':
        this.vx = 0;
        if (this.stateTimer <= 0) {
          this.state = 'charging';
          this.stateTimer = 50;
          this.vx = this.facing * COLOSSUS_SPEED;
        }
        break;
      case 'charging':
        if (this.stateTimer <= 0) {
          this.state = 'idle';
          this.stateTimer = 70;
          this.vx = 0;
          this.attackCooldown = 60;
        }
        break;
      case 'swing_telegraph':
        this.vx = 0;
        this.facing = player.x > this.x ? 1 : -1; // keep tracking right up to the swing itself — no free dodge by circling during the windup
        if (this.stateTimer <= 0) {
          this.state = 'swinging';
          this.stateTimer = 16;
          if (typeof screenShake !== 'undefined') {
            screenShake = Math.max(screenShake, 14);
            screenShakeIntensity = Math.max(screenShakeIntensity, 6);
          }
          if (typeof SFX !== 'undefined') SFX.enemyHeavyLand ? SFX.enemyHeavyLand() : SFX.enemyTelegraphHeavy();
        }
        break;
      case 'swinging':
        if (this.stateTimer <= 0) {
          this.state = 'idle';
          this.stateTimer = 60;
          this.attackCooldown = 45; // shorter recovery than the charge — a swing doesn't send it careening off, less to punish
        }
        break;
    }

    this.grounded = false;
    applyRoomGravity(this, _ts);
    this.y += this.vy * _ts;
    this.x += this.vx * _ts;
    const phys = resolveEnemyPhysics(this, bounds, _ts); // shared resolver — see physics.js

    // Hitting a wall (or the arena bound) ends a charge early instead of
    // clipping out of bounds / grinding along the obstacle.
    if (this.state === 'charging' &&
        (phys.wallNormal !== 0 || phys.bounced ||
         this.x <= bounds.left || this.x + this.width >= bounds.right)) {
      this.state = 'idle'; this.stateTimer = 70; this.attackCooldown = 60; this.vx = 0;
    }

    // Visual/hitbox bridge (see animStateKey()'s comment above). Frame
    // events support cameraShake/sfx only — no spawnProjectile, ColossusCore
    // has no ranged attack to author toward.
    this._animKey = this.animStateKey();
    if (typeof ANIM_DEFS !== 'undefined' && ANIM_DEFS[this._animKey]) {
      this.animator.play(this._animKey);
      this.animator.update(_ts);
      for (const ev of this.animator.consumeFrameEvents()) {
        if (ev.type === 'cameraShake') {
          if (typeof screenShake !== 'undefined') {
            screenShake = Math.max(screenShake, ev.shake ?? 10);
            screenShakeIntensity = Math.max(screenShakeIntensity, ev.intensity ?? 5);
          }
        } else if (ev.type === 'sfx') {
          if (typeof SFX !== 'undefined' && typeof SFX[ev.name] === 'function') SFX[ev.name]();
        }
      }
    }
  }

  draw(ctx) {
    if (this.dead) {
      ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 30);
    }

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const healthFrac = this.health / this.maxHealth;

    // Body/core/eye — visual bridge to game/animdata.js. Additive: falls
    // back to the original procedural body exactly as before when no
    // `colossus_<state>` key is authored. Everything below (telegraph
    // rings, swing flash, health bar) still draws regardless, same
    // "overlays are separate from body art" rule Boss/ComposedEnemy use.
    if (typeof ANIM_DEFS !== 'undefined' && ANIM_DEFS[this._animKey]) {
      this.animator.draw(ctx);
    } else {
      // Body — rust/stone shell, cracks appear as health drops
      ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : this.bounceFlash > 0 ? '#fbbf24' : '#c2703d';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.strokeStyle = '#7a4322';
      ctx.lineWidth = 3;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
      ctx.lineWidth = 1;

      // Crack overlay — more cracks the lower the health
      const crackCount = Math.round((1 - healthFrac) * 6);
      ctx.strokeStyle = 'rgba(10, 5, 3, 0.6)';
      for (let i = 0; i < crackCount; i++) {
        const seed = i * 37.13 + Math.floor(this.x); // stable per-instance, not per-frame random
        const sx = this.x + 8 + (seed % (this.width - 16));
        const sy = this.y + 8 + ((seed * 1.7) % (this.height - 16));
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 8 - (seed % 16), sy + 10 - (seed % 20));
        ctx.stroke();
      }

      // Molten core, visible through the shell — glows brighter as it takes damage
      ctx.fillStyle = `rgba(251, 146, 60, ${0.3 + (1 - healthFrac) * 0.5})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 10 + (1 - healthFrac) * 6, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#0a0a0f';
      const eyeX = this.facing === 1 ? this.x + this.width - 20 : this.x + 12;
      ctx.fillRect(eyeX, this.y + 14, 10, 8);
    }

    // Telegraph — expanding ring + "!" before the charge
    if (this.state === 'telegraph') {
      const progress = 1 - this.stateTimer / 40;
      const ringRadius = 16 + progress * 36;
      ctx.strokeStyle = `rgba(255, 120, 40, ${0.3 + progress * 0.5})`;
      ctx.lineWidth = 3 - progress;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = '#fbbf24';
      ctx.font = `bold ${12 + Math.round(progress * 4)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('!', cx, this.y - 8);
      ctx.textAlign = 'left';
    }

    // Charge tell — motion streaks behind it
    if (this.state === 'charging') {
      ctx.fillStyle = 'rgba(217, 119, 87, 0.4)';
      const trailX = this.facing === 1 ? this.x - 20 : this.x + this.width;
      ctx.fillRect(trailX, this.y + 10, 20, this.height - 20);
    }

    // Swing telegraph — a raised, glowing overhead arc on the swinging side
    if (this.state === 'swing_telegraph') {
      const progress = 1 - this.stateTimer / 26;
      const armX = this.facing === 1 ? this.x + this.width : this.x;
      ctx.strokeStyle = `rgba(255, 160, 60, ${0.35 + progress * 0.5})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(armX, this.y, 20 + progress * 26, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Swing itself — a bright, wide sweep flash where the haymaker lands
    if (this.state === 'swinging') {
      const hb = this.getAttackHitbox();
      if (hb) {
        ctx.fillStyle = `rgba(255, 200, 120, ${0.5 * (this.stateTimer / 16)})`;
        ctx.fillRect(hb.x, hb.y, hb.width, hb.height);
      }
    }

    // Health bar
    const barW = 70;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(cx - barW / 2, this.y - 20, barW, 6);
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(cx - barW / 2, this.y - 20, barW * healthFrac, 6);

    ctx.globalAlpha = 1;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ComposedEnemy — data-driven enemy for no-code authoring (roadmap.md 2.8's
// "design enemies without help" tool, `enemy_designer.html`;
// Plans/enemy_system_plan.md is the full design doc this implements —
// "Phase A", 2026-07-15). Every enemy above this point is a bespoke
// hand-coded subclass; ComposedEnemy is the opposite: ONE class that
// interprets a plain `def` object at runtime, picking a movement behavior
// and a LIST of attack behaviors (+ counters) from the registries below.
// This does NOT replace or retrofit the 9 classes above — those stay
// untouched (zero regression risk) — it's a new, additive authoring path.
//
// def shape:
//   {
//     id: 'my_enemy', color: '#f87171',
//     movement: { type: 'ground_chase'|'hover'|'stationary'|'teleport_blink', ...params },
//     attacks: [ { type, weight, minRange, ...params }, ... ],
//     attackSelection: 'weighted' | 'range' | 'combo',  // how to pick among ready ACTIVE attacks — see plan doc
//     counters: [ { ability: 'phase_dash'|'shard_shot'|'melee_parry'|'stillpoint', effect, ...params }, ... ],
//     onDeath: { type: 'none'|'explode'|'spawn_projectiles'|'split', ...params },
//     rage: { thresholdFrac, speedMult, cooldownMult, damageMult } | null,
//     stats: { health, patrolRange, ignoreVertical, verticalBand, knockbackResistance, stunResistance },
//   }
// Backward compat: a def with the old singular `attack: {...}` field (from
// before multi-attack landed) is wrapped into `attacks: [attack]` at
// construction — nothing already exported breaks.
//
// Spawned two ways:
//   - Real game: area.js `enemies: [{ type: 'composed', x, y, def }]` —
//     game.js's spawnAreaEnemies() special-cases 'composed' to pass `def`
//     through (see the comment at that call site).
//   - enemy_designer.html's own live preview canvas, and its "Test in
//     Arena" handoff into enemy_test.html (same localStorage pattern
//     enemy_editor.html already uses).
// ═══════════════════════════════════════════════════════════════════════════

// ── Movement behaviors ──────────────────────────────────────────────────────
// Each behavior is `run(enemy, player, bounds, _ts, sight)`, called once per
// frame from ComposedEnemy.update() when no ACTIVE attack is in progress.
// Reads its own params from `enemy.movement` (a per-instance clone of
// `def.movement`, so rage-state multipliers can mutate it safely without
// touching the shared def object). Free to set enemy.vx/vy directly;
// ComposedEnemy handles gravity/platform collision/world-bounds clamp
// afterward exactly like the base Enemy class does, EXCEPT for 'hover' and
// 'teleport_blink' which opt out of gravity via `enemy._movementFlies`.
const MOVEMENT_BEHAVIORS = {
  // Walks the ground, chasing when the player is sighted (respecting ledges
  // via hasFootingAhead — never walks off a platform edge into a pit) and
  // patrolling back and forth otherwise. This is the base Enemy class's own
  // chase/patrol state machine, generalized to read its speeds from params
  // instead of the ENEMY_SPEED/PATROL_SPEED consts.
  ground_chase: {
    // Jump-to-player (2026-07-24) — opt-in per enemy (`canJump`), off by
    // default so every existing placement is unaffected. Two triggers:
    // (1) blocked by a ledge/gap while actively chasing — jump it instead
    // of stopping dead; (2) player detected above/below the normal
    // vertical band (the actual reason sight.inRange might be false —
    // ground enemies otherwise have zero active verticality, they just
    // stop safely at ledges) but close enough horizontally to bother.
    // This is the real fix for "enemies aren't mobile," not a cosmetic one.
    params: { speed: 1.5, patrolSpeed: 0.7, canJump: false, jumpForce: -9, jumpCooldown: 50, jumpDetectRange: 140 },
    run(enemy, player, bounds, _ts, sight) {
      const p = enemy.movement;
      if (p.canJump && enemy._jumpCooldown > 0) enemy._jumpCooldown -= _ts;

      if (sight.inRange) {
        if (enemy.grounded && !hasFootingAhead(enemy, bounds, enemy.facing)) {
          if (p.canJump && (enemy._jumpCooldown ?? 0) <= 0) {
            enemy.vy = p.jumpForce; enemy.grounded = false;
            enemy.vx = enemy.facing * p.speed;
            enemy._jumpCooldown = p.jumpCooldown;
          } else {
            enemy.vx = 0;
          }
        } else enemy.vx = enemy.facing * p.speed;
        enemy.idleTimer = 0;
      } else if (enemy.idleTimer > 0) {
        enemy.idleTimer -= _ts;
        enemy.vx = 0;
      } else {
        const atLedge = enemy.grounded && !hasFootingAhead(enemy, bounds, enemy.patrolDir);
        if (Math.abs(enemy.x - enemy.patrolCenter) > enemy.patrolRange || atLedge) {
          enemy.patrolDir = enemy.x > enemy.patrolCenter ? -1 : 1;
        }
        enemy.vx = (enemy.grounded && !hasFootingAhead(enemy, bounds, enemy.patrolDir))
          ? 0 : enemy.patrolDir * p.patrolSpeed;
      }

      // Height-jump: uses sight.dx/dy/verticalOk directly (not enemy.aware
      // — an enemy stuck outside the vertical band never becomes aware in
      // the first place, since canSeePlayer() gates `aware` on the same
      // band this is trying to work around) so it can fire independent of
      // whether the enemy has otherwise noticed the player yet.
      if (p.canJump && enemy.grounded && (enemy._jumpCooldown ?? 0) <= 0 &&
          !sight.verticalOk && sight.dy < -40 && sight.dy > -170 && Math.abs(sight.dx) < p.jumpDetectRange) {
        enemy.vy = p.jumpForce; enemy.grounded = false;
        enemy.vx = Math.sign(sight.dx) * p.speed;
        enemy.facing = Math.sign(sight.dx) || enemy.facing;
        enemy._jumpCooldown = p.jumpCooldown;
      }
    },
  },

  // Flies, ignores gravity. Three sub-modes via `mode`:
  //   'approach'          — drifts toward the player when sighted (Anchor Wraith style)
  //   'maintain_distance' — hovers, bobs in place, nudges toward an ideal distance (Deflector Drone style)
  //   'stationary_bob'    — bobs in place only, never moves horizontally
  hover: {
    params: { mode: 'approach', speed: 0.8, idealDistance: 200, bobAmplitude: 12, bobSpeed: 0.03,
              // verticalTrack (Crystal Sentinel migration, 2026-07-24):
              // 'maintain_distance' only, opt-in — also nudges vy toward the
              // player's y (band-gated, same shape as the x logic) instead
              // of just bobbing on a fixed baseY. Off by default so Deflector
              // Drone's existing behavior is unchanged.
              verticalTrack: false },
    run(enemy, player, bounds, _ts, sight) {
      const p = enemy.movement;
      enemy._mState.bobPhase = (enemy._mState.bobPhase || Math.random() * Math.PI * 2) + p.bobSpeed * _ts;
      if (enemy._mState.baseY === undefined) enemy._mState.baseY = enemy.y;
      // Shield-broken speed penalty (Crystal Sentinel migration) — any
      // shielded composed enemy slows while its shield is down, not just
      // the hover mode, but this is the only movement type a shielded
      // enemy currently uses.
      const speedMult = (enemy.shieldDef && enemy.shieldBroken) ? 0.4 : 1.0;

      if (p.mode === 'approach') {
        if (sight.inRange) {
          const dist = Math.max(1, Math.hypot(sight.dx, sight.dy));
          enemy.vx = (sight.dx / dist) * p.speed * speedMult;
          enemy.vy = (sight.dy / dist) * p.speed * speedMult;
        } else {
          enemy.vx *= 0.9; enemy.vy *= 0.9;
        }
        enemy.x += enemy.vx * _ts;
        enemy.y += enemy.vy * _ts;
      } else if (p.mode === 'maintain_distance') {
        const dist = Math.abs(sight.dx);
        if (dist > p.idealDistance + 50) enemy.vx = enemy.facing * p.speed * speedMult;
        else if (dist < p.idealDistance - 50) enemy.vx = -enemy.facing * p.speed * speedMult;
        else enemy.vx *= 0.5;
        enemy.x += enemy.vx * _ts;
        if (p.verticalTrack) {
          if (Math.abs(sight.dy) > 40) enemy.vy += Math.sign(sight.dy) * 0.04 * _ts;
          else enemy.vy *= 0.9;
          enemy.vy = Math.max(-1.5, Math.min(1.5, enemy.vy)) * speedMult;
          enemy.y += enemy.vy * _ts;
        } else {
          enemy.y = enemy._mState.baseY + Math.sin(enemy._mState.bobPhase) * p.bobAmplitude;
        }
      } else {
        enemy.vx = 0;
        enemy.y = enemy._mState.baseY + Math.sin(enemy._mState.bobPhase) * p.bobAmplitude;
      }
      enemy.x = Math.max(bounds.left, Math.min(enemy.x, bounds.right - enemy.width));
    },
  },

  // Never moves under its own power — a turret. Still faces the player.
  stationary: {
    params: {},
    run(enemy) { enemy.vx = 0; enemy.vy = 0; },
  },

  // Blinks near/behind the player, either on a fixed interval or the instant
  // the player's Phase Dash ends (Echo Stalker style). Doesn't chase on foot.
  teleport_blink: {
    params: { mode: 'interval', interval: 120, blinkDistance: 40, cooldown: 45 },
    run(enemy, player, bounds, _ts, sight) {
      const p = enemy.movement;
      enemy.vx = 0; enemy.vy = 0;
      if (enemy._mState.blinkCooldown > 0) enemy._mState.blinkCooldown -= _ts;

      let shouldBlink = false;
      if (p.mode === 'interval') {
        enemy._mState.timer = (enemy._mState.timer || 0) + _ts;
        if (enemy._mState.timer >= p.interval) { enemy._mState.timer = 0; shouldBlink = true; }
      } else { // on_player_dash_end
        const wasDashing = enemy._mState.wasDashing;
        enemy._mState.wasDashing = player.phaseDashing;
        if (wasDashing && !player.phaseDashing && !(enemy._mState.blinkCooldown > 0)) shouldBlink = true;
      }

      if (shouldBlink) {
        // Decoy fade trail (Stutterer/EchoStalker migration, 2026-07-20) —
        // a faded copy left at the pre-blink position, generic to ANY
        // composed enemy using teleport_blink, not just these two (matches
        // EchoStalker's own original comment: "reuses Stutterer's
        // teleport-blink visual convention"). Drawn in ComposedEnemy.draw().
        (enemy._mState.decoys ?? (enemy._mState.decoys = [])).push({ x: enemy.x, y: enemy.y, life: 60 });
        const behindDir = -player.facing;
        enemy.x = player.x + behindDir * (player.width + p.blinkDistance);
        enemy.y = player.y;
        enemy.x = Math.max(bounds.left, Math.min(enemy.x, bounds.right - enemy.width));
        enemy._mState.blinkCooldown = p.cooldown;
        enemy._blinkFlash = 15;
        if (typeof spawnParticlesAt !== 'undefined') spawnParticlesAt(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#a78bfa', 6);
      }
      if (enemy._blinkFlash > 0) enemy._blinkFlash -= _ts;
      if (enemy._mState.decoys) {
        for (let i = enemy._mState.decoys.length - 1; i >= 0; i--) {
          enemy._mState.decoys[i].life -= _ts;
          if (enemy._mState.decoys[i].life <= 0) enemy._mState.decoys.splice(i, 1);
        }
      }
    },
  },
};

// ── Attack behaviors ────────────────────────────────────────────────────────
// Two shapes:
//   - PASSIVE (`passive: true`) — `run(enemy, player, bounds, _ts, sight, atkDef)`
//     called unconditionally every frame, independent of the active-attack
//     selection below (contact_field, shield_reflect — always-on, never "chosen").
//   - ACTIVE (default) — owns a shared windup→active→cooldown timeline
//     driven by ComposedEnemy.update() itself (NOT by the behavior), so
//     every active attack gets multi-attack selection for free. A behavior
//     only defines what happens at specific moments:
//       range        — how close the player must be to be a *candidate* (used by all selection modes)
//       onFire(enemy, player, atkDef)          — windup just ended, attack begins
//       onTick(enemy, player, atkDef, _ts)      — called every frame while active (optional)
//       onEnd(enemy, player, atkDef)             — active phase just ended (optional)
//       getHitbox(enemy, atkDef)                 — melee-style hitbox while active, or null
const ATTACK_BEHAVIORS = {
  melee_swing: {
    params: { range: 40, windupFrames: 28, activeFrames: 15, cooldown: 90, damage: 1,
              hitboxWidth: 30, hitboxHeight: 24, knockbackX: 5, knockbackY: -4, knockbackHitStun: 10 },
    getHitbox(enemy, atkDef) {
      if (!enemy.attacking) return null;
      return {
        x: enemy.facing === 1 ? enemy.x + enemy.width : enemy.x - atkDef.hitboxWidth,
        y: enemy.y + 4, width: atkDef.hitboxWidth, height: atkDef.hitboxHeight,
      };
    },
  },

  // Grabs the player at close range, roots them (movement zeroed, dragged
  // alongside the enemy) for `grabDuration` frames dealing `damagePerTick`
  // every `tickCooldown` frames, then throws them with a large configurable
  // knockback — the user's explicit "grab and throw into a wall" ask.
  grab: {
    params: { range: 36, windupFrames: 24, activeFrames: 40, cooldown: 120,
              damagePerTick: 1, tickCooldown: 15,
              throwKnockbackX: 14, throwKnockbackY: -8, throwHitStun: 22 },
    onFire(enemy, player) { enemy._aRuntime.grabTick = 0; },
    onTick(enemy, player, atkDef, _ts) {
      // Drag the player alongside the enemy — a direct position hold is the
      // same trick AnchorWraith/DeflectorDrone already use for their
      // player-field interactions, no player.js changes needed.
      const holdX = enemy.x + enemy.facing * (enemy.width * 0.6);
      player.x = holdX; player.y = enemy.y;
      player.vx = 0; player.vy = 0;
      enemy._aRuntime.grabTick -= _ts;
      if (enemy._aRuntime.grabTick <= 0 && player.invincibleTimer <= 0) {
        player.takeDamage(atkDef.damagePerTick, enemy.x);
        if (enemy.phaseFlags?.dotOnHit && typeof applyPlayerDot !== 'undefined') applyPlayerDot(player, enemy.phaseFlags.dotOnHit);
        enemy._aRuntime.grabTick = atkDef.tickCooldown;
      }
    },
    onEnd(enemy, player, atkDef) {
      // The throw — a pure knockback launch, deliberately bypassing
      // invincibility (it's a release, not a new damage instance).
      const dir = enemy.facing;
      player.vx = dir * atkDef.throwKnockbackX;
      player.vy = atkDef.throwKnockbackY;
      player.hitStunTimer = atkDef.throwHitStun;
    },
    getHitbox() { return null; }, // damage applied directly in onTick, not via the generic hitbox loop
  },

  // Command Grab (enemy_attack_vocabulary_plan.md — "just parry/block
  // everything" answer, generalized here to "just react to everything,"
  // since the player has no block/parry input anymore, see enemy_attack_
  // vocabulary_plan.md's Sword Clash note). 2026-07-20 user direction:
  // fast, not the original plan's slow/heavily-telegraphed version — same
  // grab/root/throw shape as `grab` above, just a much shorter windup
  // (10f default vs grab's 24f) so it reads as a real reaction check
  // instead of a free dodge. The short windup still gets a real tell (loud
  // particle burst + a hitstop beat, same convention Reversal's white
  // flash uses) so "fast" doesn't slide into "unfair" — the generic
  // windup ring/`!` every attack already draws is the primary read; this
  // adds a second, louder signal on top for a window this short.
  command_grab: {
    params: { range: 46, windupFrames: 10, activeFrames: 26, cooldown: 160,
              damagePerTick: 1, tickCooldown: 12,
              throwKnockbackX: 16, throwKnockbackY: -9, throwHitStun: 24 },
    onFire(enemy, player) {
      enemy._aRuntime.grabTick = 0;
      if (typeof spawnParticles !== 'undefined') spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#fb923c', 10);
      if (typeof hitstopTimer !== 'undefined') hitstopTimer = Math.max(hitstopTimer, 3);
    },
    onTick(enemy, player, atkDef, _ts) {
      const holdX = enemy.x + enemy.facing * (enemy.width * 0.6);
      player.x = holdX; player.y = enemy.y;
      player.vx = 0; player.vy = 0;
      enemy._aRuntime.grabTick -= _ts;
      if (enemy._aRuntime.grabTick <= 0 && player.invincibleTimer <= 0) {
        player.takeDamage(atkDef.damagePerTick, enemy.x);
        if (enemy.phaseFlags?.dotOnHit && typeof applyPlayerDot !== 'undefined') applyPlayerDot(player, enemy.phaseFlags.dotOnHit);
        enemy._aRuntime.grabTick = atkDef.tickCooldown;
      }
    },
    onEnd(enemy, player, atkDef) {
      const dir = enemy.facing;
      player.vx = dir * atkDef.throwKnockbackX;
      player.vy = atkDef.throwKnockbackY;
      player.hitStunTimer = atkDef.throwHitStun;
    },
    getHitbox() { return null; },
  },

  // Telegraphed dash-lunge (generalizes Void Lancer's charge into a
  // configurable behavior). While charging, the enemy's own body becomes
  // the "hitbox" (via getHitbox returning its bounds) so the generic
  // enemy-attack-hits-player loop applies this attack's own damage/knockback
  // instead of the flat default contact damage.
  dash_charge: {
    // aerial (2026-07-24, "charging in flight"): a grounded charger only
    // ever needs `facing` — it's stuck on one axis anyway. A flying enemy
    // wastes its whole vertical freedom doing the same thing, so
    // `aerial: true` charges along the full 2D vector toward the player's
    // position at the moment of firing (computed once, like a real charge
    // commit — it does NOT home mid-flight) instead of pure horizontal.
    params: { range: 260, windupFrames: 30, activeFrames: 20, cooldown: 130,
              damage: 2, chargeSpeed: 9, knockbackX: 6, knockbackY: -4, knockbackHitStun: 12,
              aerial: false },
    onFire(enemy, player, atkDef) {
      if (atkDef.aerial) {
        const dx = (player.x + player.width / 2) - (enemy.x + enemy.width / 2);
        const dy = (player.y + player.height / 2) - (enemy.y + enemy.height / 2);
        const dist = Math.max(1, Math.hypot(dx, dy));
        enemy.vx = (dx / dist) * atkDef.chargeSpeed;
        enemy.vy = (dy / dist) * atkDef.chargeSpeed;
      } else {
        enemy.vx = enemy.facing * atkDef.chargeSpeed;
      }
    },
    onTick(enemy, player, atkDef, _ts, bounds) {
      // Grounded chargers get x/y integration for free from ComposedEnemy's
      // own unconditional physics tail (gravity/collision — runs regardless
      // of attack state). Flying enemies (`_movementFlies`) opt OUT of that
      // tail entirely and normally self-integrate inside their movement
      // type's own run() — which is skipped while an attack is active. So a
      // flying charger needs its own integration here, or it would hold
      // charge velocity and never actually move. Bounds-clamped the same
      // way hover already clamps x every frame — grounded chargers get
      // wall/edge collision for free from that same physics tail; flying
      // ones get none of it, so without this a charge near a level edge
      // could fly straight off-screen.
      if (enemy._movementFlies) {
        enemy.x += enemy.vx * _ts;
        enemy.y += enemy.vy * _ts;
        if (bounds) enemy.x = Math.max(bounds.left, Math.min(enemy.x, bounds.right - enemy.width));
      }
    },
    onEnd(enemy, player, atkDef) {
      enemy.vx = 0;
      if (atkDef.aerial) enemy.vy = 0;
    },
    getHitbox(enemy) {
      if (!enemy.attacking) return null;
      return { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height };
    },
  },

  // Continuous rectangular beam tracking the player's y for `activeFrames`,
  // ticking damage every `tickCooldown` frames. Size/duration configurable
  // per the user's "beam attacks and their sizes" ask.
  beam: {
    params: { range: 400, windupFrames: 35, activeFrames: 45, cooldown: 150,
              damage: 1, tickCooldown: 12, beamWidth: 12, tracksPlayer: true },
    onFire(enemy) { enemy._aRuntime.beamTick = 0; },
    onTick(enemy, player, atkDef, _ts) {
      enemy._aRuntime.beamTick -= _ts;
      const hb = ATTACK_BEHAVIORS.beam.visualRect(enemy, atkDef);
      if (hb && enemy._aRuntime.beamTick <= 0 && rectsOverlap(hb, player) && player.invincibleTimer <= 0) {
        player.takeDamage(atkDef.damage, enemy.x);
        if (enemy.phaseFlags?.dotOnHit && typeof applyPlayerDot !== 'undefined') applyPlayerDot(player, enemy.phaseFlags.dotOnHit);
        enemy._aRuntime.beamTick = atkDef.tickCooldown;
      }
    },
    // NOT named getHitbox — beam deliberately does NOT participate in
    // ComposedEnemy.getAttackHitbox() (game.js's generic per-frame
    // enemy-hits-player check). That check has no cooldown of its own; it
    // just relies on player invincibility frames, which would fight with
    // this behavior's own configurable `tickCooldown` for the same hit —
    // two independent damage timers racing over one overlap. Beam owns its
    // damage exclusively via onTick above; `visualRect` exists only so
    // onTick and ComposedEnemy.draw() can share the same rectangle math for
    // rendering. getHitbox() is a real method (see far below) that returns
    // null unconditionally for this type, by design.
    getHitbox() { return null; },
    visualRect(enemy, atkDef) {
      if (!enemy.attacking) return null;
      const y = atkDef.tracksPlayer ? enemy._lastSightY ?? enemy.y : enemy.y;
      const len = 600;
      return {
        x: enemy.facing === 1 ? enemy.x + enemy.width : enemy.x - len,
        y: y + enemy.height / 2 - atkDef.beamWidth / 2,
        width: len, height: atkDef.beamWidth,
      };
    },
  },

  // Defensive-only: for `activeFrames`, the enemy is "countering." If the
  // player's melee hitbox overlaps during that window, game.js's hit loop
  // (see the isCountering() check added there) negates the player's hit and
  // lands a counter-hit instead — the user's literal ask.
  counter_stance: {
    params: { range: 50, windupFrames: 20, activeFrames: 30, cooldown: 140,
              counterDamage: 2, counterKnockbackX: 6, counterKnockbackY: -5, counterHitStun: 14 },
    getHitbox() { return null; }, // never deals damage via the generic hitbox path — only via onCountered
  },

  // "Get Off Me" reversal (enemy_attack_vocabulary_plan.md, priority #1 —
  // 2026-07-20): punishes mindlessly mashing this enemy instead of reacting.
  // NOT selected through the normal range/cooldown weighted pick — it's
  // force-triggered from ComposedEnemy.takeDamage() when `hitThreshold`
  // hits land within `hitWindow` frames of each other (see the hit-streak
  // tracking there), then runs through the exact same windup->active->
  // cooldown timeline every other ACTIVE attack uses. Center-of-self AoE
  // (not directional) since it's a "everyone back off" burst, not an aimed
  // swing — a well-timed player attack into the windup can still Sword
  // Clash it per the vocabulary plan (that resolution lives on the
  // player-attack side, not here — this def only needs to provide a real
  // telegraph window for it to key off, which the windup already is).
  reversal: {
    params: { hitThreshold: 3, hitWindow: 90, windupFrames: 10, activeFrames: 8, cooldown: 200,
              damage: 2, hitboxRadius: 40, knockbackX: 6, knockbackY: -8, knockbackHitStun: 16 },
    onFire(enemy) {
      if (typeof spawnParticles !== 'undefined') spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ffffff', 14);
      if (typeof screenShake !== 'undefined') { screenShake = Math.max(screenShake, 6); screenShakeIntensity = Math.max(screenShakeIntensity, 3); }
      if (typeof hitstopTimer !== 'undefined') hitstopTimer = Math.max(hitstopTimer, 4);
    },
    getHitbox(enemy, atkDef) {
      if (!enemy.attacking) return null;
      const cx = enemy.x + enemy.width / 2, cy = enemy.y + enemy.height / 2;
      return { x: cx - atkDef.hitboxRadius, y: cy - atkDef.hitboxRadius, width: atkDef.hitboxRadius * 2, height: atkDef.hitboxRadius * 2 };
    },
  },

  // Generic attack-def gate (2026-07-24, enemy_attack_vocabulary_plan.md's
  // "Conditional Triggers" section): any attack def in ANY of the entries
  // below can add `condition: 'player_airborne' | 'player_grounded' |
  // 'player_low_hp' | 'near_wall' | 'has_allies'` and ComposedEnemy will
  // never offer it as a candidate unless that condition currently holds —
  // see `_evalCondition()`/`_decideActiveAttack()`. Same purpose as
  // `requiresAirborne` below (kept as-is, it's the one existing case), just
  // generalized instead of adding a new one-off boolean per condition.

  // Tiger Knee, anti-air (enemy_attack_vocabulary_plan.md, priority #4 —
  // 2026-07-20): a quick high-arcing swipe that only ever comes out against
  // an airborne player — direct counter-pressure to juggle/Reach-heavy
  // play. `requiresAirborne` is a generic gate read by
  // ComposedEnemy._decideActiveAttack() (any attack type could opt into it,
  // not just this one), so the enemy simply never offers this attack as a
  // candidate while the player is grounded — no windup ever starts, nothing
  // to dodge or react to, the counter-play is "stay grounded or dodge
  // *before* jumping into range."
  tiger_knee: {
    params: { range: 60, requiresAirborne: true, windupFrames: 12, activeFrames: 8, cooldown: 100,
              damage: 1, hitboxWidth: 26, hitboxHeight: 46, knockbackX: 3, knockbackY: 6, knockbackHitStun: 12 },
    getHitbox(enemy, atkDef) {
      if (!enemy.attacking) return null;
      // Arcs up and slightly forward from the enemy's head instead of
      // melee_swing's chest-height box — the "anti-air" shape.
      return {
        x: enemy.facing === 1 ? enemy.x + enemy.width * 0.3 : enemy.x + enemy.width * 0.7 - atkDef.hitboxWidth,
        y: enemy.y - atkDef.hitboxHeight + 10, width: atkDef.hitboxWidth, height: atkDef.hitboxHeight,
      };
    },
  },

  // ── Scavenged war weapons (2026-07-26) ──────────────────────────────────
  // Grounded in `lore.md` (§264-265: the shelter's war-research scientists
  // "mass-produce[d] sidearms, tasers, thrown charges"; §457: a resistance
  // leader "fighting with tasers, flamethrowers, bombs, and guns scavenged"
  // ) and `expansion.md` #331 (The Child's own planned kit: "tasers,
  // flamethrowers, bombs, and guns scavenged from guards"). These are
  // now general `ATTACK_BEHAVIORS` entries any `ComposedEnemy` def can use —
  // not exclusive to any one character — so regular enemies can carry the
  // same common-war-weapon flavor the lore already describes as widespread.
  // "Normal" vs "strong" is expressed the same way every other attack in
  // this file already varies by instance (different numbers on the same
  // type, e.g. Electromagnetic Golem's `melee_swing` vs a Fractured's),
  // not as separate type strings — the *_NORMAL/*_STRONG preset consts
  // below spread onto a def's own attack entry: `{ type: 'gun', ...GUN_STRONG }`.
  // Bombs (also named in both docs) aren't added here — `ranged_projectile`'s
  // existing `pattern: 'mine'` (arm-then-AoE-explode) already covers a
  // thrown-charge/bomb exactly, no new behavior needed for that one.
  // Net launcher (2026-07-26, added on user request — not from either doc's
  // named list, but the same "captured soldier's improvised kit" reasoning
  // taser was justified with) rounds these out to a fourth: a ranged root
  // instead of taser's close-range hitstun jolt.

  // Gun — a scavenged sidearm/rifle. Thin wrapper around the existing
  // projectile pipeline with gun-flavored defaults: quick draw, fast flat
  // bullets, modest per-shot damage. The strong preset is a tight burst
  // (`pattern: 'spread'`, 3 rounds) rather than one bigger bullet — more
  // total damage per engagement, not a single scarier hit.
  gun: {
    params: { range: 380, windupFrames: 14, activeFrames: 8, cooldown: 70, damage: 1,
              projectileSpeed: 7, pattern: 'straight', projectileCount: 1, spreadAngle: 0,
              color: '#e2e8f0' },
    onFire(enemy, player, atkDef) {
      ComposedEnemy.fireProjectiles(enemy, player, atkDef);
      if (typeof spawnParticles !== 'undefined') spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#fde68a', 4);
      if (typeof SFX !== 'undefined' && SFX.gunShot) SFX.gunShot();
    },
    getHitbox() { return null; }, // no melee — damage happens via the projectile array, same as ranged_projectile
  },

  // Flamethrower — close-range continuous cone. Ticks a burn DoT rather
  // than one big hit (a zoning/wear-down weapon, not a one-shot) — same
  // onTick/visualRect/getHitbox-null shape as `beam` above, just short
  // range and orange, applying applyPlayerDot() each tick instead of (or
  // alongside) flat damage.
  flamethrower: {
    params: { range: 130, windupFrames: 26, activeFrames: 50, cooldown: 160,
              damage: 0, tickCooldown: 14, beamWidth: 26,
              dotDamagePerTick: 1, dotTickInterval: 30, dotDuration: 90, color: '#f97316' },
    onFire(enemy) {
      enemy._aRuntime.flameTick = 0;
      if (typeof SFX !== 'undefined' && SFX.flamethrower) SFX.flamethrower();
    },
    onTick(enemy, player, atkDef, _ts) {
      enemy._aRuntime.flameTick -= _ts;
      const hb = ATTACK_BEHAVIORS.flamethrower.visualRect(enemy, atkDef);
      if (hb && enemy._aRuntime.flameTick <= 0 && rectsOverlap(hb, player) && player.invincibleTimer <= 0) {
        if (atkDef.damage > 0) player.takeDamage(atkDef.damage, enemy.x);
        if (typeof applyPlayerDot !== 'undefined') {
          applyPlayerDot(player, { damagePerTick: atkDef.dotDamagePerTick, tickInterval: atkDef.dotTickInterval, duration: atkDef.dotDuration });
        }
        enemy._aRuntime.flameTick = atkDef.tickCooldown;
      }
    },
    // Same reasoning as `beam` above — owns its own tick cooldown, doesn't
    // fight the generic per-frame hit loop's reliance on player invincibility.
    getHitbox() { return null; },
    visualRect(enemy, atkDef) {
      if (!enemy.attacking) return null;
      return {
        x: enemy.facing === 1 ? enemy.x + enemy.width : enemy.x - atkDef.range,
        y: enemy.y + enemy.height * 0.2, width: atkDef.range, height: atkDef.beamWidth,
      };
    },
  },

  // Taser — crowd-control flavored: low damage, heavy hitstun (the
  // "incapacitate, don't kill" read a taser should have, distinct from a
  // gun's flat damage or a flamethrower's DoT). Same close-range hitbox
  // shape as melee_swing, just re-tuned numbers.
  taser: {
    params: { range: 46, windupFrames: 20, activeFrames: 12, cooldown: 110, damage: 1,
              hitboxWidth: 34, hitboxHeight: 26, knockbackX: 2, knockbackY: -1, knockbackHitStun: 40,
              color: '#60a5fa' },
    getHitbox(enemy, atkDef) {
      if (!enemy.attacking) return null;
      return {
        x: enemy.facing === 1 ? enemy.x + enemy.width : enemy.x - atkDef.hitboxWidth,
        y: enemy.y + 4, width: atkDef.hitboxWidth, height: atkDef.hitboxHeight,
      };
    },
  },

  // Net launcher — a thrown-net CC weapon, distinct from taser: taser is a
  // close-range hitstun jolt, net is a ranged root. Reuses the projectile
  // pipeline (thin wrapper, like `gun`) but with near-zero knockback and a
  // long `knockbackHitStun` — the existing "hitStunTimer suppresses
  // directional input" rule (player.js) already reads as "player is stuck
  // in place" with no new player-side state needed. Slow projectile speed
  // (a thrown net, not a bullet) so it's dodgeable at range rather than an
  // unavoidable poke.
  net: {
    params: { range: 320, windupFrames: 24, activeFrames: 10, cooldown: 150, damage: 0,
              projectileSpeed: 4, pattern: 'straight', projectileCount: 1, spreadAngle: 0,
              knockbackX: 0, knockbackY: 0, knockbackHitStun: 70,
              color: '#a3846a' },
    onFire(enemy, player, atkDef) {
      ComposedEnemy.fireProjectiles(enemy, player, atkDef);
      if (typeof spawnParticles !== 'undefined') spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#a3846a', 4);
      if (typeof SFX !== 'undefined' && SFX.dash) SFX.dash(); // soft thrown-object whoosh — closest existing match, no dedicated "throw" SFX exists yet
    },
    getHitbox() { return null; }, // no melee — damage/root happens via the projectile array
  },

  ranged_projectile: {
    // pattern: 'straight' | 'homing' | 'arc' | 'bounce' | 'spread' |
    // 'piercing' | 'gravity_well' | 'mine' (enemy_attack_vocabulary_plan.md
    // §3's projectile table — 'straight'/'bounce'/'piercing'/'spread' map
    // directly onto that table's Bouncing Shard etc.; 'homing' is its
    // "Homing (short)" entry, now actually short via `homingDuration`
    // below — previously homed for the shot's entire `life`; 'gravity_well'
    // and 'mine' are the two new patterns added 2026-07-20.)
    params: { range: 350, windupFrames: 35, activeFrames: 20, cooldown: 100, damage: 1,
              projectileSpeed: 3.5, pattern: 'homing', projectileCount: 3, spreadAngle: 30,
              maxBounces: 2, color: '#2dd4bf',
              homingDuration: 20,   // homing only — frames before it goes straight
              wellRadius: 90, wellPull: 0.15, // gravity_well only — no damage, just pulls
              armTimer: 60, mineRadius: 70,   // mine only — arms then AoE-explodes
    },
    onFire(enemy, player, atkDef) { ComposedEnemy.fireProjectiles(enemy, player, atkDef); },
    getHitbox() { return null; }, // no melee — damage happens via the projectile array
  },

  // Passive damage aura — no windup/telegraph, ticks damage on a cooldown
  // whenever the player is within `radius`. Optionally cancels a Phase Dash
  // the same way Anchor Wraith's field does (`cancelsPhaseDash`).
  contact_field: {
    passive: true,
    params: { radius: 100, damage: 1, tickCooldown: 45, cancelsPhaseDash: false },
    run(enemy, player, bounds, _ts, sight, atkDef) {
      if (enemy._aState.tick > 0) enemy._aState.tick -= _ts;
      const cx = enemy.x + enemy.width / 2, cy = enemy.y + enemy.height / 2;
      const pcx = player.x + player.width / 2, pcy = player.y + player.height / 2;
      const dist = Math.hypot(pcx - cx, pcy - cy);
      if (dist > atkDef.radius) return;

      if (atkDef.cancelsPhaseDash && player.phaseDashing) {
        player.phaseDashing = false;
        player.phaseDashTimer = 0;
        player.vx *= 0.3;
        player.invincibleTimer = 0;
        player.takeDamage(atkDef.damage);
        if (enemy.phaseFlags?.dotOnHit && typeof applyPlayerDot !== 'undefined') applyPlayerDot(player, enemy.phaseFlags.dotOnHit);
        enemy._aState.tick = atkDef.tickCooldown;
        return;
      }
      if (enemy._aState.tick <= 0 && player.invincibleTimer <= 0) {
        player.takeDamage(atkDef.damage);
        if (enemy.phaseFlags?.dotOnHit && typeof applyPlayerDot !== 'undefined') applyPlayerDot(player, enemy.phaseFlags.dotOnHit);
        enemy._aState.tick = atkDef.tickCooldown;
      }
    },
  },

  // Purely defensive — no attack of its own. A shield always faces the
  // player; a ranged projectile hitting the shielded side is reflected back
  // instead of dealing damage (see game.js's projectile/enemy collision
  // loop's generalized check for `enemy.reflectsProjectiles`).
  shield_reflect: {
    passive: true,
    params: {},
    run() { /* no-op — the shield direction is just enemy.facing, updated every frame in ComposedEnemy.update() */ },
  },

  // Shield Slip (enemy_attack_vocabulary_plan.md, Shard Shot counter-play
  // column, Fractured Knight). A permanently-raised shield: melee hits
  // deal no damage but count toward `hitThreshold` within `hitWindow`
  // ("rapid" — miss the window and the streak resets, same shape as
  // Reversal's hit-streak); reach the threshold and the shield drops for
  // `dropDuration` frames, a real full-damage punish window. 2026-07-20
  // user direction: ranged hits (Shard Shot) don't work on this at all —
  // fully absorbed, ZERO progress toward the drop — so sitting at range
  // spamming Shard Shot can't ever open it; only sustained melee pressure
  // does. No per-frame `run()` work — the shield-up/down state and hit-
  // streak bookkeeping live in ComposedEnemy.takeDamage()/update() (same
  // hit-triggered pattern as Reversal/Aggro-Pull/Mote Eater/Shield Slip's
  // siblings above), since it needs attackDir + timers this behavior
  // object has no access to. This entry exists so the type shows up in
  // the editor and carries its own params.
  shield_slip: {
    passive: true,
    params: { hitThreshold: 3, hitWindow: 90, dropDuration: 60 },
    run() {},
  },

  // Gravity Flip (2026-07-26, Gravity Collapse Core) — sets
  // `enemy.roomGravityDir`, the boss-local flag `physics.js`'s
  // `getRoomGravityDir()` reads (see `Plans/roadmap.md`'s architecture
  // entry for the full mechanism: a new sibling collision function plus
  // one dispatch branch in `resolveEnemyPhysics`/`player.js`/
  // `companion.js`, `resolveEntityCollision` itself never touched). No
  // hitbox of its own — the shifted gravity itself is the danger, not a
  // direct hit. `range: Infinity` (set per-instance, not here) makes it
  // always a valid candidate regardless of distance, since it's a
  // room-wide effect. Picks any direction other than the current one so
  // it never "flips" to the same state twice in a row.
  gravity_flip: {
    params: { range: Infinity, windupFrames: 50, activeFrames: 10, cooldown: 260,
              directions: ['up', 'down', 'left', 'right'] },
    onFire(enemy, player, atkDef) {
      const choices = atkDef.directions.filter((d) => d !== enemy.roomGravityDir);
      enemy.roomGravityDir = choices[Math.floor(Math.random() * choices.length)];
      if (typeof spawnParticles !== 'undefined') {
        spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 20);
      }
      if (typeof screenShake !== 'undefined') {
        screenShake = Math.max(screenShake, 14);
        screenShakeIntensity = Math.max(screenShakeIntensity, 6);
      }
    },
    getHitbox() { return null; },
  },
};

// Normal/strong tier presets for the three scavenged-weapon attack types
// above — spread onto a def's own attack entry, e.g.
// `{ type: 'gun', weight: 1, ...GUN_STRONG }`. "Strong" reads as more
// dangerous per weapon's own identity (a tighter burst for a gun, a longer
// burn for a flamethrower, a longer stagger for a taser), not just bigger
// numbers across the board.
const GUN_NORMAL = { damage: 1, projectileSpeed: 7, cooldown: 70, pattern: 'straight', projectileCount: 1 };
const GUN_STRONG = { damage: 1, projectileSpeed: 8, cooldown: 55, pattern: 'spread', projectileCount: 3, spreadAngle: 10 };
const FLAMETHROWER_NORMAL = { dotDamagePerTick: 1, dotDuration: 90, range: 130, tickCooldown: 14 };
const FLAMETHROWER_STRONG = { dotDamagePerTick: 2, dotDuration: 150, range: 170, tickCooldown: 10, damage: 1 };
const TASER_NORMAL = { damage: 1, knockbackHitStun: 40, cooldown: 110 };
const TASER_STRONG = { damage: 2, knockbackHitStun: 60, cooldown: 90 };
// Net — "strong" is a longer root, not more damage (the net never deals
// damage at all; it's pure zoning/setup for a follow-up hit from this or
// another enemy), matching the CC-not-killing identity taser already set.
const NET_NORMAL = { knockbackHitStun: 70, cooldown: 150 };
const NET_STRONG = { knockbackHitStun: 100, cooldown: 120, projectileSpeed: 5 };

// War Scavenger — a concrete, spawnable example built on the new weapon
// behaviors above (not one of the 26+2 expansion.md roster names — a
// generic, region-agnostic "someone picked up a scavenged gun" enemy,
// matching lore.md's framing that this kind of weapon is common/widespread
// rather than tied to one named character). Ships with the gun preset;
// swap `attacks` for the flamethrower/taser presets (or mix multiple) to
// build a variant — no code changes needed, same as any other ComposedEnemy.
const WAR_SCAVENGER_DEF = {
  id: 'war_scavenger',
  displayName: 'War Scavenger',
  color: '#94a3b8',
  movement: { type: 'ground_chase', speed: 1.0, patrolSpeed: 0.5 },
  attacks: [{ type: 'gun', weight: 1, ...GUN_NORMAL }],
  stats: { health: 7 },
};
// `class WarScavenger extends ComposedEnemy` itself lives further down,
// grouped with the other migrated legacy classes — see the "Migrated legacy
// enemy classes" comment below for why (TDZ: ComposedEnemy must be declared
// first). Only the def stays here, next to the weapon presets it's built from.

// ── Ability-counter effects ─────────────────────────────────────────────────
// Each `def.counters[]` entry names a player ability + an effect. Checked
// every frame in ComposedEnemy._checkCounters(), independent of the attack
// list above — an enemy can have zero attacks and still be a pure counter
// (e.g. a stationary Null-Field enemy). This is the module that generalizes
// what used to be one-off per-class code (Null Sentinel/Anchor Wraith's
// phase-dash cancel, Deflector Drone's reflect, Void Lancer's parry-stun-2x)
// into something the editor can configure.
const COUNTER_EFFECTS = {
  phase_dash: {
    cancel_and_damage: {
      params: { radius: 70, damage: 1 },
      check(enemy, player, c) {
        if (!player.phaseDashing) return;
        // NullSentinel migration (2026-07-20): while phase-toggled to
        // non-solid (`enemy.solid === false`, see def.phaseToggle in
        // ComposedEnemy's ctor/update()), it's a free pass-through — the
        // counter only fires while solid. Enemies without phaseToggle
        // never set this false, so they're unaffected (always "solid").
        if (enemy.solid === false) return;
        const cx = enemy.x + enemy.width / 2, cy = enemy.y + enemy.height / 2;
        const pcx = player.x + player.width / 2, pcy = player.y + player.height / 2;
        if (Math.hypot(pcx - cx, pcy - cy) > c.radius) return;
        player.phaseDashing = false;
        player.phaseDashTimer = 0;
        player.vx *= 0.3;
        player.invincibleTimer = 0;
        player.takeDamage(c.damage);
      },
    },
    // Afterimage Strike (enemy_attack_vocabulary_plan.md, priority #5 —
    // 2026-07-20): dashing through this enemy isn't automatically safe.
    // Hit-triggered on the dash-through contact itself (rectsOverlap while
    // player.phaseDashing, the same moment cancel_and_damage's radius check
    // would fire for a cancel-type enemy) rather than a per-frame proximity
    // check, so the real logic lives in game.js's enemy-loop overlap block
    // right next to that contact check, not here — same hit-triggered
    // pattern as shard_shot's aggro_pull/mote_eater below. Listed here only
    // so the editor's dropdown offers it and so the params have one home.
    afterimage_strike: { params: { armDelay: 45, radius: 46, damage: 2 }, check() {} },
  },
  shard_shot: {
    // 'reflect' doesn't need a per-frame check — it just sets
    // enemy.reflectsProjectiles = true at construction (see ComposedEnemy
    // ctor), same flag shield_reflect uses, checked by game.js's projectile
    // collision loop. Listed here for the editor's dropdown only.
    reflect: { params: {}, check() {} },
    // Aggro-Pull (enemy_attack_vocabulary_plan.md) — like 'reflect' and
    // melee_parry's stun_and_double_damage, this is hit-triggered rather
    // than a per-frame proximity check, so the real logic lives in
    // ComposedEnemy.takeDamage() (looks for attackDir === 'ranged'), not
    // here. Punishes "sit at max range and spam Shard Shot": a ranged hit
    // starts a brief rush straight at the player instead of just flinching.
    aggro_pull: { params: { chargeSpeed: 2.2, chargeDuration: 24 }, check() {} },
    // Mote Eater — a ranged hit deals no damage and heals the enemy
    // instead, so spamming Shard Shot at it is actively counterproductive.
    // Same hit-triggered pattern; real logic in ComposedEnemy.takeDamage().
    mote_eater: { params: { healAmount: 1 }, check() {} },
  },
  melee_parry: {
    // 'stun_and_double_damage' also needs no per-frame check — it's read by
    // ComposedEnemy.takeDamage() at the moment of a hit (this.stunTimer > 0
    // means a successful parry just landed, per game.js's existing generic
    // parry-success code which sets stunTimer on ANY enemy).
    stun_and_double_damage: { params: {}, check() {} },
  },
  stillpoint: {
    cancel: {
      params: { radius: 90 },
      check(enemy, player, c) {
        if (!player.stillpointActive) return;
        const cx = enemy.x + enemy.width / 2, cy = enemy.y + enemy.height / 2;
        const pcx = player.x + player.width / 2, pcy = player.y + player.height / 2;
        if (Math.hypot(pcx - cx, pcy - cy) > c.radius) return;
        player.stillpointActive = false;
        if (typeof SFX !== 'undefined' && SFX.stillpointEnd) SFX.stillpointEnd();
      },
    },
  },
  // Ground Stomp (2026-07-24 fix — the prior comment here claiming
  // "Graviton Surge doesn't exist yet" was stale; the ability has been
  // fully built since Phase 19). Enemies carrying this counter are skipped
  // by game.js's ceiling-pin/slam loop entirely (see `ComposedEnemy`'s
  // `this.groundStomp` cache above) and instead get a shockwave triggered
  // from game.js on the rising edge of `player.gravitonActive` — that's
  // where the real per-frame state (the flip's start moment, the enemy's
  // grounded position) lives, same reason void_tether's `the_catch` and
  // shard_shot's `aggro_pull` also do their real work outside this
  // check()-based dispatch. Listed here only so params have one home and
  // the editor's dropdown can offer it.
  graviton_surge: { ground_stomp: { params: { shockwaveRadius: 100, damage: 1, knockbackY: -5 }, check() {} } },
  void_tether: {
    // The Catch (enemy_attack_vocabulary_plan.md, priority #3 — 2026-07-20,
    // merged with the cut "Grapple Break" idea): turns Void Tether's
    // currently-riskless "pull the enemy to you" into a real bet against a
    // Heavy-tier enemy carrying this counter. No per-frame check — Void
    // Tether is cast-triggered (`player.voidTetherFired`), and the pull
    // itself is a multi-frame travel state (`player.tether`), so the real
    // logic lives in game.js's Void Tether block (both the initial-cast
    // target resolution and the arrival check), same reason aggro_pull/
    // mote_eater/stun_and_double_damage above don't check() here. `enemy.
    // armored` (ComposedEnemy ctor, from def.stats.armored) decides which
    // half fires: a non-Armored the_catch target just reverses the pull
    // (player flies to them, per the "or pulls you to walls" half of the
    // ability that's already built) instead of coming to the player;
    // Armored additionally catches the incoming player and grapple-throws
    // them on arrival.
    the_catch: { params: { throwKnockbackX: 12, throwKnockbackY: -7, throwHitStun: 20, damage: 1 }, check() {} },
  },
};

// ── On-death effects ─────────────────────────────────────────────────────────
const ON_DEATH_EFFECTS = {
  none: { params: {}, apply() {} },
  // NOTE: the actual player-damage check for this effect lives in
  // ComposedEnemy.update()'s dead-branch, not here — takeDamage() (where
  // `apply()` is called from) only receives a bare sourceX number, not the
  // real player object with a position/invincibility state to check against.
  explode: {
    params: { radius: 90, damage: 2 },
    apply(enemy, d) {
      spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 20);
      if (typeof screenShake !== 'undefined') { screenShake = Math.max(screenShake, 10); screenShakeIntensity = Math.max(screenShakeIntensity, 5); }
    },
  },
  spawn_projectiles: {
    params: { count: 6, projectileSpeed: 3, damage: 1, color: '#f87171' },
    apply(enemy, d) {
      const cx = enemy.x + enemy.width / 2, cy = enemy.y + enemy.height / 2;
      for (let i = 0; i < d.count; i++) {
        const angle = (i / d.count) * Math.PI * 2;
        ComposedEnemy.projectiles.push({
          x: cx - 6, y: cy - 6, width: 12, height: 12,
          vx: Math.cos(angle) * d.projectileSpeed, vy: Math.sin(angle) * d.projectileSpeed,
          speed: d.projectileSpeed, homingStrength: 0,
          damage: d.damage, life: 90, alive: true, color: d.color,
        });
      }
    },
  },
  split: {
    params: { count: 2, healthFrac: 0.5, spread: 40 },
    apply(enemy, d, bounds) {
      const area = getCurrentArea();
      const enemies = (typeof areaEnemies !== 'undefined' && area) ? areaEnemies[area.id] : null;
      if (!enemies) return;
      for (let i = 0; i < d.count; i++) {
        const childDef = JSON.parse(JSON.stringify(enemy.def));
        childDef.onDeath = { type: 'none' }; // splits don't chain-split forever
        childDef.stats = { ...childDef.stats, health: Math.max(1, Math.round(enemy.maxHealth * d.healthFrac)) };
        const child = new ComposedEnemy(enemy.x + (i === 0 ? -d.spread : d.spread), enemy.y, childDef);
        enemies.push(child);
      }
    },
  },
};

// ── Multi-enemy coordination (2026-07-21) ────────────────────────────────
// Runs as a post-process override right after MOVEMENT_BEHAVIORS.run() sets
// this frame's vx — only enemies carrying a `role` are touched, so an
// undefined role is a guaranteed no-op (today's single-enemy behavior).
// Deliberately simple: no shared blackboard, no per-enemy negotiation, just
// each enemy reacting to where its allies currently are. Kept as override
// logic (not woven into every MOVEMENT_BEHAVIORS.run signature) so adding a
// role never risks changing what non-role enemies do.
function applyRoleCoordination(enemy, player, allies) {
  const speed = Math.abs(enemy.movement?.speed ?? 1.5);
  const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
  const px = player.x + player.width / 2, py = player.y + player.height / 2;
  const distToPlayer = Math.hypot(px - ex, py - ey);

  // Low-HP retreat (any role): once badly hurt with an ally nearby, back off
  // toward them instead of continuing to press — the player is baited into
  // chasing a retreating target into the ally that's still at full strength.
  if (enemy.health / enemy.maxHealth < 0.3) {
    let nearestAlly = null, nearestDist = Infinity;
    for (const ally of allies) {
      if (ally === enemy || ally.dead) continue;
      const ax = ally.x + ally.width / 2, ay = ally.y + ally.height / 2;
      const d = Math.hypot(ax - ex, ay - ey);
      if (d < nearestDist) { nearestDist = d; nearestAlly = ally; }
    }
    if (nearestAlly && nearestDist < 220) {
      enemy.vx = (nearestAlly.x > enemy.x ? 1 : -1) * speed;
      return;
    }
  }

  if (enemy.role === 'ranged') {
    // Hold at range once a tank ally is already engaged closer to the player,
    // or once already at/inside its own hold range — don't walk into melee.
    const tankEngaged = allies.some((a) => a !== enemy && !a.dead && a.role === 'tank'
      && Math.hypot((a.x + a.width / 2) - px, (a.y + a.height / 2) - py) < distToPlayer);
    const holdRange = enemy.movement?.holdRange ?? 220;
    if (tankEngaged || distToPlayer < holdRange) {
      enemy.vx = (px > ex ? -1 : 1) * speed * 0.6;
    }
  } else if (enemy.role === 'flanker') {
    // Commit to a lateral destination point rather than beelining at the
    // player (space-claim positioning) — approach from one side and stick to
    // it for a while instead of re-deciding every frame.
    if (enemy._flankRepick <= 0) {
      enemy._flankSide = Math.random() < 0.5 ? -1 : 1;
      enemy._flankRepick = 90;
    }
    enemy._flankRepick--;
    const targetX = px + enemy._flankSide * 90;
    enemy.vx = (targetX > ex ? 1 : -1) * speed;
  }
  // role === 'tank': no override — keep default chase pressure.
}

class ComposedEnemy extends Enemy {
  constructor(x, y, def) {
    super(x, y, def.id || 'composed');
    this.def = def;
    // Size override (Crystal Sentinel migration, 2026-07-24) — every prior
    // composed def was fine with the base Enemy 28x28 default, so nothing
    // read def.stats.width/height before now. Optional, backward compatible.
    if (def.stats?.width) this.width = def.stats.width;
    if (def.stats?.height) this.height = def.stats.height;
    this.maxHealth = def.stats?.health ?? 4;
    this.health = this.maxHealth;
    this.patrolRange = def.stats?.patrolRange ?? 120;
    this.patrolCenter = x;
    this.verticalBand = def.stats?.verticalBand ?? null;
    this.ignoreVertical = !!def.stats?.ignoreVertical;
    this.knockbackResistance = Math.max(0, Math.min(1, def.stats?.knockbackResistance ?? 0));
    this.stunResistance = Math.max(0, Math.min(1, def.stats?.stunResistance ?? 0));
    // "Armored" (enemy_attack_vocabulary_plan.md, The Catch) — miniboss/
    // rare-elite Heavy-tier flag, not a common-enemy default. Only affects
    // void_tether's the_catch counter (game.js's tether-arrival block): an
    // Armored target catches + grapple-throws the player on arrival instead
    // of just resisting the pull like a non-Armored the_catch target does.
    this.armored = !!def.stats?.armored;
    // Phase-toggle (NullSentinel migration, 2026-07-20) — when set,
    // this.solid alternates on a timer (see update() below). Only gates
    // the phase_dash/cancel_and_damage counter (solid = tangible to a
    // Phase Dash, non-solid = free pass-through) — doesn't touch normal
    // body-contact damage or attacks, matching NullSentinel's original scope.
    this.phaseToggle = def.phaseToggle || null;
    this.solid = true;
    this._phaseTimer = 0;
    // Face-tangible (MirrorSprite migration, 2026-07-20) — when set,
    // this.tangible is recomputed every frame from whether the player is
    // currently facing toward this enemy; takeDamage() no-ops while
    // intangible. Can still wind up/attack while intangible — that's the
    // point, same as the original class ("attacks from behind when you're
    // not facing it").
    this.faceTangible = !!def.faceTangible;
    this.tangible = true;
    // Regen (Timeworn Husk, 2026-07-21) — generic trait: heals `amount`
    // every `interval` frames, but ANY damage taken resets the countdown
    // to `interruptWindow` frames first — "regenerates if not damaged;
    // burst damage interrupts" (expansion.md #11). See takeDamage()'s
    // real-damage branch (resets `_noHitTimer`) and update() (ticks it
    // down, then ticks the regen timer once it's clear).
    this.regenDef = def.regen || null;
    this._noHitTimer = 0;
    this._regenTimer = 0;
    this.color = def.color || '#f87171';

    // Directional shield-HP (Crystal Sentinel migration, 2026-07-24) — a
    // regenerating HP pool separate from `health`, chipped down instead of
    // a binary block (contrast with Shield Slip's `shield_slip` attack
    // above, which is all-or-nothing until a hit-streak drops it). Only
    // blocks melee hits arriving from the shielded side (`shieldFacesPoint`,
    // already shared with DeflectorDrone/shield_reflect); ranged always
    // pierces straight to health, matching the original class. Breaking it
    // starts `breakDuration` before it snaps back at full; while intact and
    // below max it trickles back `regenAmount` every `regenInterval` frames
    // (paused entirely while broken — mirrors the original's if/else-if).
    this.shieldDef = def.stats?.shield || null;
    if (this.shieldDef) {
      this.shieldHp = this.shieldDef.hp;
      this.maxShieldHp = this.shieldDef.hp;
      this.shieldBroken = false;
      this.shieldBreakTimer = 0;
      this.shieldRegenTimer = 0;
    }

    // Coordination role (2026-07-21) — optional, purely a movement-priority
    // hint consulted by applyRoleCoordination() below. 'tank' presses forward
    // as normal (no override); 'ranged' hangs back once a tank ally is
    // already engaged or it's already at its hold range; 'flanker' commits to
    // a lateral destination point instead of beelining (space-claim, not a
    // pure homing vector). No role = today's unchanged single-enemy behavior.
    this.role = def.role || null;
    this._flankSide = 0;
    this._flankRepick = 0;
    this._wallNormal = 0; // cached each physics resolve, read by the 'near_wall' attack condition

    this.movement = { ...MOVEMENT_BEHAVIORS[def.movement?.type]?.params, ...def.movement }; // per-instance clone — safe for rage to mutate
    this._movementFlies = def.movement?.type === 'hover' || def.movement?.type === 'teleport_blink';
    this._mState = {};

    // Backward compat: old single `def.attack` becomes a 1-entry list.
    const attacksInput = def.attacks || (def.attack ? [def.attack] : [{ type: 'melee_swing' }]);
    this.attacks = attacksInput.map((a) => ({ ...ATTACK_BEHAVIORS[a.type]?.params, weight: 1, minRange: 0, enabled: true, ...a }));
    this.attackSelection = def.attackSelection || 'weighted';
    // Player-style adaptation (2026-07-26) — same idea as boss.js's
    // `adapt.rangedHits`/`meleeHits`: track how the player has actually been
    // damaging THIS enemy and nudge its own weighted attack picks to counter
    // it (kite-only players start eating more close-range attacks; melee-
    // only players see this enemy lean on its ranged/spacing options more).
    // Only applied to named bosses/minibosses (see _decideActiveAttack) —
    // harmless to track on every ComposedEnemy, but only worth reacting to
    // on a fight long enough for the pattern to mean something.
    this._adaptMelee = 0;
    this._adaptRanged = 0;

    // Vulnerable window (see takeDamage()/update()/draw()) — opt-in per
    // attack via `vulnFrames`/`vulnDamageMult` on any attack def.
    this._vulnerableTimer = 0;
    this._vulnerableDamageMult = 1;
    this._activeIdxList = []; this._passiveIdxList = [];
    this.attacks.forEach((a, i) => { (ATTACK_BEHAVIORS[a.type]?.passive ? this._passiveIdxList : this._activeIdxList).push(i); });
    this._attackCooldowns = this.attacks.map(() => 0);
    this._activeAttack = null;
    this._comboIndex = 0;
    this._aState = {};    // shared scratch for passive behaviors
    this._aRuntime = {};  // shared scratch for the currently-active attack (onFire/onTick/onEnd)

    this.counters = def.counters || [];
    // Defense verbs (2026-07-16 combat overhaul) — pass straight through
    // from the def, so enemy_designer.html JSON can grant block/dodge/
    // breakout/dashPunish per composed enemy. Mix-up knobs too.
    this.defense = def.defense || null;
    if (def.windupVariance !== undefined) this.windupVariance = def.windupVariance;
    if (def.feintChance !== undefined) this.feintChance = def.feintChance;
    this.reflectsProjectiles = this.attacks.some((a) => a.type === 'shield_reflect')
      || this.counters.some((c) => c.ability === 'shard_shot' && c.effect === 'reflect');
    // Ground Stomp (graviton_surge counter, 2026-07-24 — fixes the stale
    // COUNTER_EFFECTS.graviton_surge no-op below, which wrongly assumed the
    // ability didn't exist yet). Cached the same way `armored`/
    // `reflectsProjectiles` are so game.js's gravity-flip loop can check one
    // flag per enemy per frame instead of scanning `counters[]`.
    const groundStompCounter = this.counters.find((c) => c.ability === 'graviton_surge' && c.effect === 'ground_stomp');
    this.groundStomp = groundStompCounter
      ? { ...COUNTER_EFFECTS.graviton_surge.ground_stomp.params, ...groundStompCounter }
      : null;

    this.onDeathDef = { type: 'none', ...ON_DEATH_EFFECTS[def.onDeath?.type]?.params, ...def.onDeath };
    this.rageDef = def.rage || null;
    this._raged = false;

    // Boss/miniboss display name (game.js's defeat notification reads this,
    // falling back to the raw id for regular enemies that never set it).
    this.displayName = def.displayName || def.id || null;

    // Ordered, one-way, multi-threshold phase system (health-triggered,
    // mirrors the single-threshold rage check below but supports several
    // thresholds in sequence — see _applyPhase()). `phaseFlags` is a merged
    // bag later game.js/attack-behavior code checks (e.g. `dotOnHit`,
    // `knockbackImmune`) without needing to know which phase set it.
    this.phasesDef = def.phases || [];
    this._phaseCursor = 0;
    this.phaseFlags = {};

    this._blinkFlash = 0;
    this._lastSightY = y;

    // Reversal hit-streak tracking + Aggro-Pull rush state (2026-07-20,
    // enemy_attack_vocabulary_plan.md) — see takeDamage()/update() below.
    this._hitStreak = 0;
    this._hitStreakTimer = 0;
    this._rageChargeTimer = 0;
    this._rageChargeSpeed = 0;

    // Shield Slip hit-streak + drop timer (2026-07-20, same file, later
    // update — see takeDamage()/update()/draw() below). Independent of the
    // Reversal streak above — an enemy could in principle carry both.
    this._shieldHitStreak = 0;
    this._shieldHitStreakTimer = 0;
    this._shieldDownTimer = 0;

    // Visual bridge to game/animdata.js (2026-07-20) — additive, same
    // fallback rule as the player: an ANIM_DEFS key drawn in
    // editor/anim_editor.html under `enemy_<id>_<state>` (see
    // animStateKey() below) overrides the procedural draw() below it;
    // nothing authored means zero behavior change. Hitbox/attack math stays
    // owned by ATTACK_BEHAVIORS/getHitbox() either way — this is visuals
    // only, deliberately not a second source of truth for combat numbers.
    this.animator = new Animator(this);

    // Adds present from the start of the fight (2026-07-26, Stationmaster's
    // prisoners — "swarm from phase 1", not a later escalation). Same
    // push-to-areaEnemies mechanism as _spawnAdds()/ON_DEATH_EFFECTS.split;
    // this.x/this.y are already valid at this point (set by Enemy's ctor).
    if (def.spawnOnStart) this._spawnAdds(def.spawnOnStart);
  }

  // Shared by def.spawnOnStart (constructor) and phaseDef.spawn
  // (_applyPhase) — pushes `count` fresh ComposedEnemy adds, built from a
  // caller-supplied def (not this enemy's own def, unlike
  // ON_DEATH_EFFECTS.split which clones itself), into the current room's
  // enemy array. Generalizes split's exact spawn mechanism to fire
  // on-demand rather than only on death.
  _spawnAdds(spawnDef) {
    const area = typeof getCurrentArea !== 'undefined' ? getCurrentArea() : null;
    const enemies = (typeof areaEnemies !== 'undefined' && area) ? areaEnemies[area.id] : null;
    if (!enemies || !spawnDef?.def) return;
    const count = spawnDef.count ?? 1;
    const spread = spawnDef.spread ?? 60;
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spread;
      enemies.push(new ComposedEnemy(this.x + offset, this.y, spawnDef.def));
    }
  }

  // Mirrors player.js's playerBodyStateKey() — one state key per frame,
  // `enemy_<def.id>_<state>` convention (matches the "entity_action" hint
  // already in anim_editor.html's UI). def.id is the composed enemy's own
  // id (e.g. 'blitz_guard_v2'), so different composed defs never collide.
  animStateKey() {
    const id = this.def.id || 'composed';
    if (this.dead) return `enemy_${id}_death`;
    if (this._activeAttack !== null) {
      const type = this.attacks[this._activeAttack].type;
      return this.windingUp ? `enemy_${id}_windup_${type}` : `enemy_${id}_attack_${type}`;
    }
    if (Math.abs(this.vx) > 0.3) return `enemy_${id}_walk`;
    return `enemy_${id}_idle`;
  }

  // Same "is a ranged shot approaching from my currently-shielded side"
  // check DeflectorDrone already has — needed here too for shield_reflect.
  shieldFacesPoint(px) {
    return (px < this.x + this.width / 2) === (this.facing === -1);
  }

  // counter_stance (attack module) integration point — game.js's melee-hit
  // loop calls this before applying player-attack-hits-enemy damage.
  isCountering() {
    if (this._activeAttack === null || !this.attacking) return false;
    return this.attacks[this._activeAttack].type === 'counter_stance';
  }
  onCountered(player) {
    const atkDef = this.attacks[this._activeAttack];
    player.takeDamage(atkDef.counterDamage, this.x, {
      vx: atkDef.counterKnockbackX, vy: atkDef.counterKnockbackY, hitStun: atkDef.counterHitStun,
    });
    this.flashTimer = 10;
    if (typeof spawnParticles !== 'undefined') spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#fbbf24', 8);
  }

  // Overrides Enemy.takeDamage to add: melee_parry stun-and-double-damage
  // counter, knockback/stun resistance stats, and the on-death effect hook.
  takeDamage(dmg, sourceX, attackDir = 'forward') {
    // Face-tangible (MirrorSprite migration) — "face it directly to make
    // it tangible." Checked before anything else, including Shield Slip/
    // Mote Eater below, since an intangible hit should just pass through.
    if (this.faceTangible && !this.tangible) return;

    // Directional shield-HP (see constructor comment) — melee from the
    // shielded side chips shieldHp instead of health; ranged bypasses it
    // entirely. Checked before Shield Slip/Mote Eater/health below, same
    // "intercept before anything else" priority the original class used.
    if (this.shieldDef && !this.shieldBroken && attackDir !== 'ranged' &&
        sourceX !== undefined && this.shieldFacesPoint(sourceX)) {
      this.shieldHp -= 1;
      this.flashTimer = 10;
      if (typeof SFX !== 'undefined' && SFX.shardHit) SFX.shardHit();
      if (this.shieldHp <= 0) {
        this.shieldHp = 0;
        this.shieldBroken = true;
        this.shieldBreakTimer = this.shieldDef.breakDuration ?? 90;
        if (typeof spawnParticles !== 'undefined') spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#2dd4bf', 12);
      }
      return; // no health damage/knockback/death check while the shield absorbs it
    }

    // Shield Slip (enemy_attack_vocabulary_plan.md, 2026-07-20 direction:
    // Shard Shot doesn't work on it at all). Checked before anything else
    // so a raised shield intercepts damage regardless of source. While
    // `_shieldDownTimer <= 0` (shield up): a ranged hit is fully absorbed
    // with ZERO streak progress — no free window from range, only
    // sustained melee opens it. A melee hit deals no damage but counts
    // toward `hitThreshold` within `hitWindow`; hitting the threshold
    // drops the shield for `dropDuration` frames (full damage applies
    // normally once it falls through past this block).
    const shieldAtk = this.attacks.find((a) => a.type === 'shield_slip');
    if (shieldAtk && this._shieldDownTimer <= 0) {
      if (attackDir === 'ranged') {
        if (typeof spawnParticles !== 'undefined') spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#94a3b8', 4);
        if (typeof SFX !== 'undefined' && SFX.parry) SFX.parry();
        return;
      }
      this._shieldHitStreak = (this._shieldHitStreakTimer > 0 ? this._shieldHitStreak + 1 : 1);
      this._shieldHitStreakTimer = shieldAtk.hitWindow ?? 90;
      this.flashTimer = 6; // brief spark, not the full white hit-flash — the shield absorbed it, not the enemy's body
      if (typeof spawnParticles !== 'undefined') spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#e2e8f0', 5);
      if (this._shieldHitStreak >= (shieldAtk.hitThreshold ?? 3)) {
        this._shieldHitStreak = 0;
        this._shieldHitStreakTimer = 0;
        this._shieldDownTimer = shieldAtk.dropDuration ?? 60;
        if (typeof spawnParticles !== 'undefined') spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#fbbf24', 12);
        if (typeof screenShake !== 'undefined') { screenShake = Math.max(screenShake, 5); screenShakeIntensity = Math.max(screenShakeIntensity, 2); }
      }
      return; // no damage/knockback/death check while the shield is up
    }

    // Mote Eater (enemy_attack_vocabulary_plan.md) — a ranged hit does
    // nothing but feed it: no damage, no flinch/knockback, just a heal.
    // Full early-return (not a damage-reduction) so the lesson reads
    // unambiguously: shooting this thing is actively counterproductive,
    // not just "less effective."
    if (attackDir === 'ranged') {
      const moteEater = this.counters.find((c) => c.ability === 'shard_shot' && c.effect === 'mote_eater');
      if (moteEater) {
        const p = { ...COUNTER_EFFECTS.shard_shot.mote_eater.params, ...moteEater };
        this.health = Math.min(this.maxHealth, this.health + p.healAmount);
        if (typeof spawnParticles !== 'undefined') spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#4ade80', 8);
        return;
      }
    }

    const parryCounter = this.counters.find((c) => c.ability === 'melee_parry' && c.effect === 'stun_and_double_damage');
    const wasStunned = parryCounter && this.stunTimer > 0;
    // Vulnerable window (2026-07-27, `vulnFrames`/`vulnDamageMult` on any attack def —
    // see _decideActiveAttack()'s attack-end transition below) — a real,
    // guaranteed "you whiffed, now you're extra punishable" beat, the same
    // read/punish rhythm Hollow Knight's Mantis Lords use: a hard telegraph,
    // then (whether it lands or not) a real opening, not just "back to
    // normal cooldown." Stacks multiplicatively with the parry-stun double
    // damage above rather than replacing it.
    const vulnMult = this._vulnerableTimer > 0 ? (this._vulnerableDamageMult || 1) : 1;
    const finalDmg = (wasStunned ? dmg * 2 : dmg) * vulnMult;

    // Hyper-armor Windup (enemy_attack_vocabulary_plan.md — "not every
    // opening is safe to take," the deliberate opposite lesson from
    // Reversal). A generic `hyperArmor: true` flag on whichever attack def
    // is currently winding up or active: damage still lands (health drops
    // below), but the flinch/interrupt/knockback that would normally
    // follow doesn't — the windup keeps counting down exactly on schedule
    // and the enemy doesn't get shoved off its mark. Any attack type can
    // opt in; nothing here is tied to a specific behavior.
    const hyperArmored = this._activeAttack !== null && this.attacks[this._activeAttack].hyperArmor && (this.windingUp || this.attacking);

    this.health -= finalDmg;
    if (attackDir === 'ranged') this._adaptRanged++; else this._adaptMelee++;
    this.flashTimer = 0;
    // Regen interrupt — any real damage instance resets the no-hit clock.
    if (this.regenDef) { this._noHitTimer = this.regenDef.interruptWindow ?? 120; this._regenTimer = 0; }
    if (!hyperArmored) {
      this.windingUp = false; this.windUpTimer = 0;
      this.stunTimer = 0;
      this.hitStun = Math.round(14 * (1 - this.stunResistance));
    }
    this.registerHitForBreakout(); // anti-juggle bookkeeping (no-op without defense.breakout)

    if (sourceX !== undefined && !hyperArmored && !this.phaseFlags?.knockbackImmune) {
      const dir = (this.x > sourceX ? 1 : -1);
      const kb = 1 - this.knockbackResistance;
      if (attackDir === 'up') { this.vx = dir * KNOCKBACK_UP_X * kb; this.vy = KNOCKBACK_UP_Y * kb; this.juggling = true; }
      else if (attackDir === 'down') { this.vx = dir * KNOCKBACK_DOWN_X * kb; this.vy = KNOCKBACK_DOWN_Y * kb; }
      else { this.vx = dir * KNOCKBACK_FORWARD_X * kb; this.vy = KNOCKBACK_FORWARD_Y * kb; if (!this.grounded) this.juggling = true; }
    }

    if (this.health > 0) {
      // Aggro-Pull (enemy_attack_vocabulary_plan.md) — a ranged hit starts
      // a brief rush at the player instead of just flinching. Doesn't
      // touch this._activeAttack/windingUp (movement-only), so it layers
      // cleanly under a real attack later — see update()'s movement
      // override below.
      if (attackDir === 'ranged') {
        const aggro = this.counters.find((c) => c.ability === 'shard_shot' && c.effect === 'aggro_pull');
        if (aggro) {
          const p = { ...COUNTER_EFFECTS.shard_shot.aggro_pull.params, ...aggro };
          this._rageChargeTimer = p.chargeDuration;
          this._rageChargeSpeed = p.chargeSpeed;
        }
      }

      // Reversal ("Get Off Me") hit-streak — force-fires regardless of the
      // normal range/cooldown weighted selection once `hitThreshold` hits
      // land within `hitWindow` frames of each other. Only arms while no
      // attack is already active, so it can't stack on top of/interrupt
      // another attack this enemy is already mid-swing on.
      const reversalIdx = this.attacks.findIndex((a) => a.type === 'reversal');
      if (reversalIdx !== -1 && this._activeAttack === null && this._attackCooldowns[reversalIdx] <= 0) {
        const atk = this.attacks[reversalIdx];
        this._hitStreak = (this._hitStreakTimer > 0 ? this._hitStreak + 1 : 1);
        this._hitStreakTimer = atk.hitWindow ?? 90;
        if (this._hitStreak >= (atk.hitThreshold ?? 3)) {
          this._hitStreak = 0;
          this._activeAttack = reversalIdx;
          this.windingUp = true;
          if (typeof SFX !== 'undefined') SFX.enemyTelegraphHeavy();
          this.windUpTimer = atk.windupFrames ?? 10;
        }
      }
    }

    if (this.health <= 0 && !this.dead) {
      this.health = 0; this.dead = true;
      const effect = ON_DEATH_EFFECTS[this.onDeathDef.type];
      if (effect) effect.apply(this, this.onDeathDef);
    }
  }

  // Generic per-attack gate (enemy_attack_vocabulary_plan.md "Conditional
  // Triggers", 2026-07-24): a data-only way to restrict when an attack def
  // is even offered as a candidate, same spirit as `requiresAirborne`
  // (Tiger Knee) but not hardcoded to one case. `near_wall` reads
  // `this._wallNormal`, cached from the PREVIOUS frame's
  // resolveEnemyPhysics() call (physics resolves after attack selection
  // each frame — see the update() tail) — one frame stale, same latency the
  // `sight` snapshot this whole method already runs on.
  _evalCondition(cond, player, allies) {
    switch (cond) {
      case 'player_airborne': return !player.grounded;
      case 'player_grounded': return !!player.grounded;
      case 'player_low_hp': return player.health <= playerMaxHealth() * 0.3;
      case 'near_wall': return !!this._wallNormal;
      case 'has_allies': return !!(allies && allies.some((a) => a !== this && !a.dead));
      default: return true; // unknown/omitted condition never blocks the attack
    }
  }

  _decideActiveAttack(player, sight, allies) {
    if (!this._activeIdxList.length) return null;
    const dist = Math.abs(sight.dx);
    const ready = this._activeIdxList.filter((i) => {
      if (this._attackCooldowns[i] > 0) return false;
      if (!sight.verticalOk) return false;
      const a = this.attacks[i];
      if (a.enabled === false) return false; // phase-disabled (see _applyPhase())
      if (a.requiresAirborne && player.grounded) return false; // Tiger Knee gate
      if (a.condition && !this._evalCondition(a.condition, player, allies)) return false;
      return dist >= (a.minRange || 0) && dist <= (a.range ?? Infinity);
    });
    if (!ready.length) return null;

    if (this.attackSelection === 'combo') {
      for (let step = 0; step < this._activeIdxList.length; step++) {
        const idx = this._activeIdxList[(this._comboIndex + step) % this._activeIdxList.length];
        if (ready.includes(idx)) { this._comboIndex = (this._activeIdxList.indexOf(idx) + 1) % this._activeIdxList.length; return idx; }
      }
      return null;
    }
    // 'weighted' and 'range' both end in a weighted pick among the eligible
    // set — 'range' just means the range window above already did the real
    // work of narrowing which attacks are eligible in the first place.
    // Named bosses/minibosses (see constructor) additionally nudge these
    // weights toward whichever range band the player has been UNDERUSING
    // against this fight — a kite-only player starts seeing more of its
    // close-range options offered real weight, and vice versa. Classifies
    // each ready attack as melee/ranged off its own `range` window (no new
    // authoring needed) rather than a hardcoded per-type list.
    const total = ready.reduce((s, i) => s + this._weightFor(i), 0);
    let r = Math.random() * total;
    for (const i of ready) { r -= this._weightFor(i); if (r <= 0) return i; }
    return ready[ready.length - 1];
  }

  _weightFor(i) {
    const a = this.attacks[i];
    let w = a.weight || 1;
    if (!this.displayName) return w; // adaptation is a boss/miniboss-only touch
    const totalHits = this._adaptMelee + this._adaptRanged;
    if (totalHits < 5) return w; // not enough of a read on the player yet
    const isRanged = (a.range ?? Infinity) > 150;
    // Counter the player's demonstrated style, same direction as boss.js's
    // adapt: a melee-only player sees this enemy lean on ranged/spacing
    // options; a kite-only player sees it lean on closing-the-gap options.
    const playerPrefersMelee = this._adaptMelee > this._adaptRanged + 4;
    const playerPrefersRanged = this._adaptRanged > this._adaptMelee + 4;
    if (playerPrefersMelee && isRanged) w *= 1.6;
    if (playerPrefersRanged && !isRanged) w *= 1.6;
    return w;
  }

  // Applies one phase threshold's changes once, permanently (never
  // reversed — health only goes down during a fight, same one-way spirit
  // as rageDef above). Mutates the per-instance movement/attacks/
  // knockbackResistance directly, never the shared `def`.
  _applyPhase(phaseDef) {
    this.currentPhase = (this.currentPhase || 1) + 1;
    const mult = phaseDef.statMultipliers || {};
    if (mult.speedMult !== undefined) {
      if (this.movement.speed !== undefined) this.movement.speed *= mult.speedMult;
      if (this.movement.patrolSpeed !== undefined) this.movement.patrolSpeed *= mult.speedMult;
    }
    if (mult.knockbackResistanceMult !== undefined) {
      this.knockbackResistance = Math.max(0, Math.min(1, this.knockbackResistance * mult.knockbackResistanceMult));
    }
    if (mult.damageMult !== undefined || mult.cooldownMult !== undefined) {
      for (const a of this.attacks) {
        if (mult.cooldownMult !== undefined && a.cooldown !== undefined) a.cooldown = Math.max(5, a.cooldown * mult.cooldownMult);
        if (mult.damageMult !== undefined && a.damage !== undefined) a.damage *= mult.damageMult;
        if (mult.damageMult !== undefined && a.damagePerTick !== undefined) a.damagePerTick *= mult.damageMult;
      }
    }

    // Attack patches — matched by `type` against existing entries (patches
    // every entry sharing that type, since attacks carry no unique id of
    // their own) and appended as a brand-new attack/cooldown slot when
    // nothing matches, which is how a phase can grant an attack the enemy
    // didn't start the fight with (e.g. a "spawns adds" phase attack).
    for (const patch of (phaseDef.attacks || [])) {
      const matches = this.attacks.filter((a) => a.type === patch.type);
      if (matches.length) {
        for (const a of matches) Object.assign(a, patch);
      } else {
        const full = { ...ATTACK_BEHAVIORS[patch.type]?.params, weight: 1, minRange: 0, enabled: true, ...patch };
        this.attacks.push(full);
        this._attackCooldowns.push(0);
        (ATTACK_BEHAVIORS[full.type]?.passive ? this._passiveIdxList : this._activeIdxList).push(this.attacks.length - 1);
      }
    }

    // Merged bag so a later phase can add/override flags without clobbering
    // ones an earlier phase already set unless explicitly overridden.
    this.phaseFlags = { ...this.phaseFlags, ...(phaseDef.flags || {}) };

    // Movement override (2026-07-26, first use: the Stationmaster's
    // ground→flight phase transition, the Assembler's portal-flanking
    // intensification) — shallow-merges onto the per-instance movement
    // clone, same non-destructive pattern as statMultipliers above. A
    // `type` change also recomputes `_movementFlies` so gravity/the
    // physics-tail gating stays consistent with the new movement type.
    if (phaseDef.movement) {
      Object.assign(this.movement, phaseDef.movement);
      if (phaseDef.movement.type !== undefined) {
        this._movementFlies = this.movement.type === 'hover' || this.movement.type === 'teleport_blink';
      }
    }

    // Phase-triggered adds (2026-07-26, first use: none yet at 50% — the
    // Stationmaster's prisoners spawn on fight-start instead, see
    // def.spawnOnStart — kept here for the next phase-escalation fight
    // that needs a later wave, e.g. The Assembler's family of "spawn adds"
    // designs floated in the boss-buildout plan).
    if (phaseDef.spawn) this._spawnAdds(phaseDef.spawn);

    if (typeof spawnParticles !== 'undefined') {
      spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#facc15', 16);
    }
  }

  _checkCounters(player) {
    for (const c of this.counters) {
      const eff = COUNTER_EFFECTS[c.ability]?.[c.effect];
      if (eff) eff.check(this, player, { ...eff.params, ...c });
    }
  }

  update(player, bounds, echoes, allies) {
    const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;
    if (this.dead) {
      // explode's actual player-damage check — done here (not in takeDamage's
      // apply() above) because this is the only place with a real `player`
      // reference to check distance/invincibility against. Only on the exact
      // first dead frame, so it can't repeat-hit while the death fades out.
      if (this.deathTimer === 0 && this.onDeathDef.type === 'explode') {
        const cx = this.x + this.width / 2, cy = this.y + this.height / 2;
        const pcx = player.x + player.width / 2, pcy = player.y + player.height / 2;
        if (Math.hypot(pcx - cx, pcy - cy) <= this.onDeathDef.radius && player.invincibleTimer <= 0) {
          player.takeDamage(this.onDeathDef.damage, this.x);
        }
      }
      this.deathTimer++;
      this._animKey = this.animStateKey();
      if (typeof ANIM_DEFS !== 'undefined' && ANIM_DEFS[this._animKey]) {
        this.animator.play(this._animKey);
        this.animator.update(_ts);
      }
      return;
    }

    // Defense verbs (2026-07-24 bug fix): ComposedEnemy fully overrides
    // Enemy.update() and never called the inherited updateDefense() —
    // block/dodge/breakout/dashPunish (`this.defense`, set in the
    // constructor from def.defense) have been dead code for every composed
    // enemy since the 2026-07-20 migration, despite enemy_designer.html
    // exposing UI for all four. Same ordering as the base class: before the
    // hit-stun early return below, so the anti-juggle breakout can still
    // charge/fire mid-juggle (that's its whole purpose).
    this.updateDefense(player, _ts);

    // Echo distraction — identical convention to every other enemy class.
    if (this.distractionTimer > 0) {
      this.distractionTimer -= _ts;
      if (this.distractionTimer <= 0) this.distractionTarget = null;
      this.flashTimer++;
      return;
    }
    let nearestEcho = null, nearestDist = ECHO_DISTRACT_RADIUS;
    for (const echo of echoes) {
      if (!echo.alive) continue;
      const d = Math.abs((this.x + this.width / 2) - (echo.x + echo.width / 2));
      if (d < nearestDist) { nearestDist = d; nearestEcho = echo; }
    }
    if (nearestEcho) { this.distractionTarget = nearestEcho; this.distractionTimer = ECHO_DISTRACT_DURATION; return; }

    // Hit stun — same physics-during-stun pattern as the base Enemy class,
    // including the smash-style continuous knockback decay (see the base
    // Enemy class's hitStun block above for the full rationale).
    if (this.hitStun > 0) {
      this.hitStun--;
      if (!this._movementFlies) {
        this.grounded = false;
        applyRoomGravity(this, _ts);
      }
      this.vx *= 0.92;
      this.x += this.vx * _ts;
      this.y += this.vy * _ts;
      // NOTE: this manual `bounds.groundY` clamp (unlike resolveEnemyPhysics'
      // dispatch) is still down-axis-specific — out of v1 scope per the
      // Gravity Collapse Core plan (no grounded adds exist in that room this
      // pass; the boss itself is `_movementFlies` and skips this branch).
      if (!this._movementFlies && this.y + this.height > bounds.groundY) {
        this.y = bounds.groundY - this.height; this.vy = 0; this.grounded = true;
      }
      if (this.x < bounds.left) this.x = bounds.left;
      if (this.x + this.width > bounds.right) this.x = bounds.right - this.width;
      this.flashTimer = Math.max(-1, this.flashTimer - 1);
      return;
    }

    const sight = this.canSeePlayer(player);
    this._lastSightY = player.y;
    if (Math.abs(sight.dx) > ENEMY_FACING_DEADZONE && !this.windingUp) {
      this.facing = sight.dx > 0 ? 1 : -1;
    }

    // Phase-toggle (NullSentinel migration) — alternates solid/phaseable
    // on a fixed interval, independent of anything else this frame.
    if (this.phaseToggle) {
      this._phaseTimer += _ts;
      if (this._phaseTimer >= (this.phaseToggle.interval ?? 60)) {
        this._phaseTimer = 0;
        this.solid = !this.solid;
      }
    }

    // Face-tangible (MirrorSprite migration) — tangible only while the
    // player is currently facing toward this enemy.
    if (this.faceTangible) {
      this.tangible = (this.x > player.x) === (player.facing === 1);
    }

    // Rage — one-way threshold trigger, mutates the per-instance movement/
    // attack clones directly (never the shared def object).
    if (this.rageDef && !this._raged && this.health <= this.maxHealth * (this.rageDef.thresholdFrac ?? 0.3)) {
      this._raged = true;
      if (this.movement.speed !== undefined) this.movement.speed *= (this.rageDef.speedMult ?? 1);
      if (this.movement.patrolSpeed !== undefined) this.movement.patrolSpeed *= (this.rageDef.speedMult ?? 1);
      for (const a of this.attacks) {
        if (a.cooldown !== undefined) a.cooldown = Math.max(5, a.cooldown * (this.rageDef.cooldownMult ?? 1));
        if (a.damage !== undefined) a.damage *= (this.rageDef.damageMult ?? 1);
        if (a.damagePerTick !== undefined) a.damagePerTick *= (this.rageDef.damageMult ?? 1);
      }
      if (typeof spawnParticles !== 'undefined') spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#f87171', 14);
    }

    // Phases — ordered, one-way, multi-threshold (see _applyPhase()). A
    // `while`, not `if`, so a single big hit that crosses two thresholds in
    // one frame still applies both in order rather than only the nearer one.
    while (this._phaseCursor < this.phasesDef.length &&
           this.health <= this.maxHealth * this.phasesDef[this._phaseCursor].healthPct) {
      this._applyPhase(this.phasesDef[this._phaseCursor]);
      this._phaseCursor++;
    }

    // Reversal hit-streak decay — a streak that goes hitWindow frames
    // without another hit resets, so it's "N hits in a row," not "N hits
    // ever."
    if (this._hitStreakTimer > 0) {
      this._hitStreakTimer -= _ts;
      if (this._hitStreakTimer <= 0) this._hitStreak = 0;
    }

    // Shield Slip — same streak-decay shape as Reversal above, plus the
    // shield-down punish window counting back up to restore.
    if (this._shieldHitStreakTimer > 0) {
      this._shieldHitStreakTimer -= _ts;
      if (this._shieldHitStreakTimer <= 0) this._shieldHitStreak = 0;
    }
    if (this._shieldDownTimer > 0) this._shieldDownTimer -= _ts;

    // Directional shield-HP regen/break (Crystal Sentinel migration) — see
    // constructor comment. Broken: counts down to a full snap-back. Intact
    // and damaged: trickles back one point per regenInterval. Full: idle.
    if (this.shieldDef) {
      if (this.shieldBroken) {
        this.shieldBreakTimer -= _ts;
        if (this.shieldBreakTimer <= 0) {
          this.shieldBroken = false;
          this.shieldHp = this.maxShieldHp;
          if (typeof spawnParticles !== 'undefined') spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#67e8f9', 6);
        }
      } else if (this.shieldHp < this.maxShieldHp) {
        this.shieldRegenTimer -= _ts;
        if (this.shieldRegenTimer <= 0) {
          this.shieldHp = Math.min(this.maxShieldHp, this.shieldHp + 1);
          this.shieldRegenTimer = this.shieldDef.regenInterval ?? 180;
        }
      } else {
        this.shieldRegenTimer = 0;
      }
    }

    // Regen (Timeworn Husk) — counts down the post-hit lockout first; only
    // once it's clear does the actual regen-tick timer run.
    if (this.regenDef && this.health < this.maxHealth) {
      if (this._noHitTimer > 0) {
        this._noHitTimer -= _ts;
      } else {
        this._regenTimer += _ts;
        if (this._regenTimer >= (this.regenDef.interval ?? 120)) {
          this._regenTimer = 0;
          this.health = Math.min(this.maxHealth, this.health + (this.regenDef.amount ?? 1));
          if (typeof spawnParticles !== 'undefined') spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#4ade80', 6);
        }
      }
    }

    this._checkCounters(player);

    // Passive attacks (contact_field, shield_reflect) run unconditionally.
    for (const i of this._passiveIdxList) {
      ATTACK_BEHAVIORS[this.attacks[i].type].run(this, player, bounds, _ts, sight, this.attacks[i]);
    }

    // Active-attack selection state machine.
    if (this._activeAttack === null) {
      const idx = this._decideActiveAttack(player, sight, allies);
      if (idx !== null) {
        this._activeAttack = idx;
        this.windingUp = true;
        this.windUpTimer = this.attacks[idx].windupFrames ?? 20;
        this.vx = 0;
        if (typeof SFX !== 'undefined') {
          const heavy = this.attacks[idx].hyperArmor ||
            ['dash_charge', 'command_grab', 'reversal'].includes(this.attacks[idx].type);
          if (heavy) SFX.enemyTelegraphHeavy(); else SFX.enemyTelegraph();
        }
      }
    }
    if (this._activeAttack !== null) {
      const idx = this._activeAttack;
      const atkDef = this.attacks[idx];
      const behavior = ATTACK_BEHAVIORS[atkDef.type];
      if (this.windingUp) {
        this.windUpTimer -= _ts;
        this.vx = 0; // stationary during windup for every attack type, including dash_charge — it only bursts once onFire() sets vx
        if (this.windUpTimer <= 0) {
          this.windingUp = false;
          this.attacking = true;
          this.attackTimer = atkDef.activeFrames ?? 20;
          behavior.onFire?.(this, player, atkDef);
        }
      } else if (this.attacking) {
        behavior.onTick?.(this, player, atkDef, _ts, bounds);
        this.attackTimer -= _ts;
        if (this.attackTimer <= 0) {
          this.attacking = false;
          behavior.onEnd?.(this, player, atkDef);
          this._attackCooldowns[idx] = atkDef.cooldown ?? 60;
          this._activeAttack = null;
          // Guaranteed vulnerable window (opt-in, see constructor/takeDamage()).
          if (atkDef.vulnFrames > 0) {
            this._vulnerableTimer = atkDef.vulnFrames;
            this._vulnerableDamageMult = atkDef.vulnDamageMult ?? 1.5;
          }
        }
      }
    }
    if (this._vulnerableTimer > 0) this._vulnerableTimer -= _ts;
    for (let i = 0; i < this._attackCooldowns.length; i++) if (this._attackCooldowns[i] > 0) this._attackCooldowns[i] -= _ts;

    // Movement only runs when no active attack is winding up/firing.
    // Aggro-Pull's rush (set in takeDamage() on a ranged hit) overrides
    // normal movement AI for its duration — a direct rush at the player
    // instead of whatever chase/patrol logic would otherwise run.
    if (this._activeAttack === null) {
      if (this._rageChargeTimer > 0) {
        this._rageChargeTimer -= _ts;
        const dir = (player.x + player.width / 2) > (this.x + this.width / 2) ? 1 : -1;
        this.facing = dir;
        this.vx = dir * this._rageChargeSpeed;
      } else if (this.dodgeIFrames > 0) {
        // Dodge bugfix (2026-07-24): every movement type recomputes vx (and
        // hover recomputes vy too) unconditionally every frame, which was
        // stomping the dodge's push velocity almost immediately — the
        // horizontal hop before this fix barely traveled anywhere (only the
        // vertical hitch from `vy` survived, since ground_chase never
        // touches vy). Same override shape as the Aggro-Pull rage-charge
        // branch above: normal movement AI is fully suspended for as long
        // as the dodge's own i-frames last, so the escape actually covers
        // distance. Flying enemies need one more thing: every movement type
        // that opts out of gravity (`_movementFlies`) also opts out of the
        // generic physics block below and integrates its own x/y INSIDE
        // run() (see hover's `enemy.x += ...`) — which we just skipped, so
        // without this they'd hold dodge velocity but never actually move.
        // Grounded enemies don't need this: their position integration
        // lives in the unconditional physics block further down, untouched
        // by this branch.
        if (this._movementFlies) {
          this.x += this.vx * _ts;
          this.y += this.vy * _ts;
          this.x = Math.max(bounds.left, Math.min(this.x, bounds.right - this.width));
        }
      } else {
        // `??` combines return VALUES, and run() never returns anything —
        // `A?.run(...) ?? B.run(...)` was calling BOTH every frame (the left
        // side's result is always undefined), not falling back to B only
        // when A is missing. ground_chase.run() then unconditionally ran a
        // second time on top of every enemy's real movement, and its patrol
        // branch (enemy.patrolDir * p.patrolSpeed) went NaN for any 'hover'
        // enemy — a hover-flavored `movement` object never has patrolSpeed
        // (only ground_chase's own params include it) — corrupting vx for
        // the rest of the enemy's life. Pick the BEHAVIOR OBJECT to fall
        // back to instead, then call .run() exactly once.
        (MOVEMENT_BEHAVIORS[this.def.movement?.type] ?? MOVEMENT_BEHAVIORS.ground_chase)
          .run(this, player, bounds, _ts, sight);
        if (this.role && allies) applyRoleCoordination(this, player, allies);
      }
    }

    // Physics — grounded enemies use the same gravity/platform-collision
    // pattern as the base Enemy class; flying ones (hover/teleport_blink)
    // opt out entirely, since their behavior already sets this.y directly.
    if (!this._movementFlies) {
      // Zero horizontal velocity when airborne — except mid-attack (dash_charge
      // needs to keep its burst velocity even if it runs off a ledge while charging).
      if (!this.grounded && !this.juggling && this._activeAttack === null) this.vx = 0;
      this.grounded = false;
      applyRoomGravity(this, _ts);
      this.x += this.vx * _ts;
      this.y += this.vy * _ts;
      const phys = resolveEnemyPhysics(this, bounds, _ts); // shared resolver — see physics.js
      this._wallNormal = phys.wallNormal; // cached for next frame's 'near_wall' attack condition

      // A wall/bound stopping a mid-attack lunge (dash_charge) kills the
      // lunge's velocity — the attack timer still runs out normally, the
      // enemy just doesn't grind against (or bounce backward off) the wall
      // with its own attack movement.
      if (this._activeAttack !== null &&
          (phys.wallNormal !== 0 || phys.bounced ||
           this.x <= bounds.left || this.x + this.width >= bounds.right)) {
        this.vx = 0;
      }
    }

    this.flashTimer++;

    // Visual bridge to game/animdata.js — see the constructor's comment.
    // Guarded the same way player.js guards its own bodyAnimator (only
    // play()s when a matching key actually exists), so an un-authored
    // composed enemy costs nothing and never spams Animator's
    // no-animation-named console.warn every time its state changes.
    this._animKey = this.animStateKey();
    if (typeof ANIM_DEFS !== 'undefined' && ANIM_DEFS[this._animKey]) {
      this.animator.play(this._animKey);
      this.animator.update(_ts);
    }
  }

  getAttackHitbox() {
    if (this._activeAttack === null) return null;
    const atkDef = this.attacks[this._activeAttack];
    return ATTACK_BEHAVIORS[atkDef.type].getHitbox(this, atkDef);
  }

  // Custom knockback for whichever attack is currently active — read by
  // game.js's generic enemy-attack-hits-player loop instead of the flat
  // ENEMY_DAMAGE/default-knockback every other enemy uses.
  getAttackDamageAndKnockback() {
    if (this._activeAttack === null) return null;
    const a = this.attacks[this._activeAttack];
    return {
      damage: a.damage ?? 1,
      knockback: { vx: a.knockbackX ?? 4, vy: a.knockbackY ?? -3, hitStun: a.knockbackHitStun ?? 10 },
      dotOnHit: this.phaseFlags?.dotOnHit || null,
    };
  }

  static fireProjectiles(enemy, player, atkDef) {
    if (!ComposedEnemy.projectiles) ComposedEnemy.projectiles = [];


    const startX = enemy.x + enemy.width / 2, startY = enemy.y + enemy.height / 2;
    const targetX = player.x + player.width / 2, targetY = player.y + player.height / 2;
    const baseAngle = Math.atan2(targetY - startY, targetX - startX);

    const makeShot = (angle) => {
      const proj = {
        x: startX - 6, y: startY - 6, width: 12, height: 12,
        vx: Math.cos(angle) * atkDef.projectileSpeed, vy: Math.sin(angle) * atkDef.projectileSpeed,
        targetX, targetY, speed: atkDef.projectileSpeed,
        homingStrength: atkDef.pattern === 'homing' ? 0.03 : 0,
        // Homing (short) — enemy_attack_vocabulary_plan.md §3: only tracks
        // for `homingDuration` frames, then goes straight (updateProjectiles
        // zeroes homingStrength once this hits 0), not for the shot's whole
        // life like before.
        homingDuration: atkDef.pattern === 'homing' ? atkDef.homingDuration : undefined,
        gravity: atkDef.pattern === 'arc' || atkDef.pattern === 'mine',
        bounces: atkDef.pattern === 'bounce' ? atkDef.maxBounces : 0,
        piercing: atkDef.pattern === 'piercing',
        damage: atkDef.damage, life: 120, alive: true, color: atkDef.color,
        // Captured at fire time — updateProjectiles() has no live enemy
        // reference per-shot, so the phase-driven DoT flag rides along on
        // the projectile itself instead.
        dotOnHit: enemy.phaseFlags?.dotOnHit || null,
        // sourceX + an explicit knockback object let a specific shot (the
        // Net Launcher below) drive player.takeDamage()'s knockback/hitStun
        // override, same convention `taser`'s melee hitbox already uses.
        // null/undefined for every other pattern preserves the pre-existing
        // "projectiles just deal damage, no knockback" behavior exactly.
        sourceX: startX,
        knockback: (atkDef.knockbackX !== undefined || atkDef.knockbackHitStun !== undefined)
          ? { vx: atkDef.knockbackX ?? 0, vy: atkDef.knockbackY ?? 0, hitStun: atkDef.knockbackHitStun ?? 10 }
          : null,
      };
      // Gravity Well — no damage, doesn't fly at the player, just sits and
      // weakly pulls anyone in `wellRadius`. Positional tool, not a hit.
      if (atkDef.pattern === 'gravity_well') {
        proj.vx = 0; proj.vy = 0; proj.damage = 0;
        proj.isWell = true; proj.wellRadius = atkDef.wellRadius; proj.wellPull = atkDef.wellPull;
        proj.life = 240; // sits around longer than a normal shot — it's a zone, not a projectile
      }
      // Mine — drops (gravity, set above) and sits once it lands, arms for
      // `armTimer` frames, then AoE-explodes. Never damages on contact —
      // walking into it before it's armed does nothing, same "opts out of
      // the generic hit check" convention `beam` already uses.
      if (atkDef.pattern === 'mine') {
        proj.vx = 0; proj.isMine = true; proj.landed = false;
        proj.armTimer = atkDef.armTimer; proj.mineRadius = atkDef.mineRadius;
        proj.life = 999; // lifetime is owned by armTimer/explosion, not the generic life countdown
      }
      ComposedEnemy.projectiles.push(proj);
    };

    if (atkDef.pattern === 'spread') {
      const n = Math.max(1, atkDef.projectileCount);
      const spreadRad = (atkDef.spreadAngle * Math.PI) / 180;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : i / (n - 1) - 0.5;
        makeShot(baseAngle + t * spreadRad);
      }
    } else {
      makeShot(baseAngle);
    }
    if (typeof SFX !== 'undefined' && SFX.shardShot) SFX.shardShot();
  }

  static updateProjectiles(player) {
    if (!ComposedEnemy.projectiles) return;
    const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;
    const area = getCurrentArea();
    for (const proj of ComposedEnemy.projectiles) {
      if (!proj.alive) continue;
      // Homing (short) — stop tracking once homingDuration runs out, then
      // it's just whatever straight-line vx/vy it had at that moment.
      if (proj.homingDuration !== undefined) {
        proj.homingDuration -= _ts;
        if (proj.homingDuration <= 0) proj.homingStrength = 0;
      }
      if (proj.homingStrength > 0) {
        const dx = proj.targetX - (proj.x + proj.width / 2);
        const dy = proj.targetY - (proj.y + proj.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          proj.vx += (dx / dist) * proj.homingStrength * _ts;
          proj.vy += (dy / dist) * proj.homingStrength * _ts;
          const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
          if (speed > proj.speed) { proj.vx = (proj.vx / speed) * proj.speed; proj.vy = (proj.vy / speed) * proj.speed; }
        }
      }
      // Mine — once landed, gravity/vx/vy are already zeroed below; don't
      // let gravity re-accelerate it while it sits armed.
      if (proj.gravity && !(proj.isMine && proj.landed)) proj.vy += 0.15 * _ts;
      proj.x += proj.vx * _ts;
      proj.y += proj.vy * _ts;
      proj.life -= _ts;
      if (proj.life <= 0) proj.alive = false;

      // Bounce off platforms instead of just dying on wall contact — except
      // a mine, which stops and arms instead of bouncing (see below).
      if (proj.alive && proj.bounces > 0 && !proj.isMine && area) {
        for (const plat of area.platforms) {
          if (plat.destructible && plat.hp <= 0) continue;
          if (rectsOverlap(proj, { x: plat.x, y: plat.y, width: plat.w, height: plat.h })) {
            proj.vy *= -0.8; proj.vx *= 0.9;
            proj.bounces--;
            break;
          }
        }
      }

      // Mine — falls until it lands on a platform, then arms for
      // `armTimer` frames before AoE-exploding (never damages on contact).
      if (proj.alive && proj.isMine) {
        if (!proj.landed && area) {
          for (const plat of area.platforms) {
            if (plat.destructible && plat.hp <= 0) continue;
            if (rectsOverlap(proj, { x: plat.x, y: plat.y, width: plat.w, height: plat.h })) {
              proj.vx = 0; proj.vy = 0; proj.landed = true; proj.y = plat.y - proj.height;
              break;
            }
          }
        } else if (proj.landed) {
          proj.armTimer -= _ts;
          if (proj.armTimer <= 0) {
            const cx = proj.x + proj.width / 2, cy = proj.y + proj.height / 2;
            if (player.invincibleTimer <= 0 && Math.hypot((player.x + player.width / 2) - cx, (player.y + player.height / 2) - cy) <= proj.mineRadius) {
              player.takeDamage(proj.damage);
              if (proj.dotOnHit && typeof applyPlayerDot !== 'undefined') applyPlayerDot(player, proj.dotOnHit);
            }
            if (typeof spawnParticles !== 'undefined') spawnParticles(cx, cy, proj.color, 14);
            if (typeof screenShake !== 'undefined') { screenShake = Math.max(screenShake, 8); screenShakeIntensity = Math.max(screenShakeIntensity, 4); }
            if (typeof SFX !== 'undefined' && SFX.bombExplode) SFX.bombExplode();
            proj.alive = false;
          }
        }
      }

      // Gravity Well — no damage, just a weak pull on anyone in radius
      // while it's up. Positional tool, not a hit — see the generic
      // player-collision check below, which explicitly skips wells.
      if (proj.alive && proj.isWell) {
        const cx = proj.x + proj.width / 2, cy = proj.y + proj.height / 2;
        const dx = (player.x + player.width / 2) - cx, dy = (player.y + player.height / 2) - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > 1 && dist <= proj.wellRadius) {
          player.vx -= (dx / dist) * proj.wellPull * _ts;
          player.vy -= (dy / dist) * proj.wellPull * _ts;
        }
      }

      // Generic contact damage — mines and wells opt out entirely (same
      // convention `beam` uses for its own reasons): a mine only damages
      // via its own timed explosion above, a well never damages at all.
      if (proj.alive && !proj.isMine && !proj.isWell && rectsOverlap(proj, player) && player.invincibleTimer <= 0) {
        player.takeDamage(proj.damage, proj.knockback ? proj.sourceX : undefined, proj.knockback);
        if (proj.dotOnHit && typeof applyPlayerDot !== 'undefined') applyPlayerDot(player, proj.dotOnHit);
        if (!proj.piercing) proj.alive = false;
      }
    }
    ComposedEnemy.projectiles = ComposedEnemy.projectiles.filter((p) => p.alive);
  }

  static drawProjectiles(ctx) {
    if (!ComposedEnemy.projectiles) return;
    for (const p of ComposedEnemy.projectiles) {
      if (p.isWell) {
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.wellRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (p.isMine && p.landed) {
        // Pulses faster as armTimer runs down — a real "about to go off" tell.
        const pulse = 0.5 + 0.5 * Math.sin(p.armTimer * 0.3);
        ctx.strokeStyle = `rgba(248, 113, 113, ${0.3 + pulse * 0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 10 + pulse * 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = p.life / 120;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  draw(ctx) {
    if (this.dead) ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 20);

    // Decoy fade trail (see teleport_blink's run() above) — drawn first so
    // the real body reads on top of its own afterimages.
    if (this._mState.decoys) {
      for (const decoy of this._mState.decoys) {
        ctx.globalAlpha = (decoy.life / 60) * 0.3;
        ctx.fillStyle = '#a78bfa';
        ctx.fillRect(decoy.x, decoy.y, this.width, this.height);
      }
      ctx.globalAlpha = this.dead ? Math.max(0, 1 - this.deathTimer / 20) : 1;
    }

    // Face-tangible (MirrorSprite migration) — dims to signal "not
    // currently hittable," same alpha the original class used.
    if (this.faceTangible && !this.tangible) ctx.globalAlpha *= 0.3;

    // Vulnerable window (2026-07-27, `vulnFrames`) — a bright, fast
    // pulsing ring so the guaranteed punish opening is legible on sight,
    // not just a number in the def. Deliberately more urgent/faster than
    // the regen ring below (this is "hit me now," not "notice I'm healing").
    if (this._vulnerableTimer > 0) {
      const pulse = 0.5 + 0.4 * Math.sin(this._vulnerableTimer * 0.5);
      ctx.strokeStyle = `rgba(251, 191, 36, ${pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Regen (Timeworn Husk) — a faint green pulse ring while actively
    // healing, so "why didn't that combo finish it" reads as a system,
    // not a miscount.
    if (this.regenDef && this._noHitTimer <= 0 && this.health < this.maxHealth) {
      const pulse = 0.4 + 0.3 * Math.sin(this._regenTimer * 0.15);
      ctx.strokeStyle = `rgba(74, 222, 128, ${pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    if (this.reflectsProjectiles) {
      const shieldX = this.facing === -1 ? this.x - 3 : this.x + this.width - 3;
      ctx.fillStyle = 'rgba(103, 232, 249, 0.7)';
      ctx.fillRect(shieldX, this.y - 2, 6, this.height + 4);
    }

    // Shield Slip — a steady bar while up (readable at a glance vs. the
    // cyan reflect bar above — different mechanic, different color), a
    // flashing red outline instead during the drop/punish window so "the
    // shield is gone" is exactly as loud as "the shield is up" was.
    const shieldSlipAtk = this.attacks.find((a) => a.type === 'shield_slip');
    if (shieldSlipAtk) {
      if (this._shieldDownTimer > 0) {
        if (Math.floor(this._shieldDownTimer / 4) % 2 === 0) {
          ctx.strokeStyle = 'rgba(248, 113, 113, 0.8)';
          ctx.lineWidth = 2;
          ctx.strokeRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);
          ctx.lineWidth = 1;
        }
      } else {
        const shieldX = this.facing === -1 ? this.x - 3 : this.x + this.width - 3;
        ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
        ctx.fillRect(shieldX, this.y - 2, 6, this.height + 4);
      }
    }

    // Directional shield-HP (Crystal Sentinel migration) — a filled bar
    // scaled by remaining shieldHp (distinct from Shield Slip's flat bar
    // above: this one visibly thins as it's chipped down) plus one pip per
    // point, same read as the original class's dot row.
    if (this.shieldDef && !this.shieldBroken && this.shieldHp > 0) {
      const shieldX = this.facing === 1 ? this.x + this.width - 4 : this.x - 12;
      const shieldAlpha = 0.3 + (this.shieldHp / this.maxShieldHp) * 0.5;
      ctx.fillStyle = `rgba(103, 232, 249, ${shieldAlpha})`;
      ctx.fillRect(shieldX, this.y + 4, 12, this.height - 8);
      ctx.strokeStyle = `rgba(103, 232, 249, ${shieldAlpha * 0.8})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(shieldX - 1, this.y + 2, 14, this.height - 4);
      ctx.lineWidth = 1;
      for (let i = 0; i < this.maxShieldHp; i++) {
        const px = this.facing === 1 ? this.x + this.width + 2 : this.x - 10;
        const py = this.y + 8 + i * 14;
        ctx.fillStyle = i < this.shieldHp ? '#67e8f9' : '#1a2a3e';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this._blinkFlash > 0 && Math.floor(this._blinkFlash) % 4 < 2) { ctx.globalAlpha = 1; return; }

    const countering = this.isCountering();
    // Reversal's windup reads as a distinct white flash (the "get off me"
    // tell), same convention the generic orange windup ring below already
    // uses to signal "something's about to happen," just louder for this
    // specific attack per the vocabulary plan's spec.
    const isReversalWindup = this.windingUp && this._activeAttack !== null && this.attacks[this._activeAttack].type === 'reversal';
    // Command Grab's windup is only 10f by default (vs grab's 24f) — a
    // second, louder color cue on top of the generic orange ring/`!` so a
    // window that short still reads as "something specific," not just
    // "something."
    const isCommandGrabWindup = this.windingUp && this._activeAttack !== null && this.attacks[this._activeAttack].type === 'command_grab';

    // Visual bridge to game/animdata.js — see the constructor's comment.
    // Falls back to the original procedural body/eye draw exactly as
    // before when no ANIM_DEFS key is authored for the current state.
    if (typeof ANIM_DEFS !== 'undefined' && ANIM_DEFS[this._animKey]) {
      this.animator.draw(ctx);
    } else {
      ctx.fillStyle = this.flashTimer < 6 ? '#ffffff' : (isReversalWindup ? '#ffffff' : (isCommandGrabWindup ? '#fb923c' : (countering ? '#60a5fa' : (this.windingUp ? '#fbbf24' : this.color))));
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.fillStyle = '#0a0a0f';
      const eyeX = this.facing === 1 ? this.x + 18 : this.x + 4;
      ctx.fillRect(eyeX, this.y + 8, 8, 6);
    }

    // Passive contact_field radius, drawn faint.
    for (const i of this._passiveIdxList) {
      if (this.attacks[i].type === 'contact_field') {
        ctx.strokeStyle = 'rgba(248, 113, 113, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.attacks[i].radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (this.windingUp) {
      const wf = this.attacks[this._activeAttack]?.windupFrames || ENEMY_WINDUP_FRAMES;
      const progress = 1 - this.windUpTimer / wf;
      ctx.strokeStyle = `rgba(255, 120, 40, ${0.3 + progress * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 8 + progress * 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', this.x + this.width / 2, this.y - 6);
      ctx.textAlign = 'left';
    }

    const hitbox = this.getAttackHitbox();
    if (this.attacking && hitbox) {
      ctx.strokeStyle = countering ? 'rgba(96, 165, 250, 0.6)' : 'rgba(255, 200, 100, 0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
      ctx.lineWidth = 1;
    }

    // beam doesn't use getAttackHitbox() (see ATTACK_BEHAVIORS.beam's note
    // on why) — draw its visual rectangle separately via visualRect.
    if (this.attacking && this._activeAttack !== null && this.attacks[this._activeAttack].type === 'beam') {
      const beamRect = ATTACK_BEHAVIORS.beam.visualRect(this, this.attacks[this._activeAttack]);
      if (beamRect) {
        ctx.fillStyle = 'rgba(103, 232, 249, 0.35)';
        ctx.fillRect(beamRect.x, beamRect.y, beamRect.width, beamRect.height);
        ctx.strokeStyle = 'rgba(224, 250, 255, 0.7)';
        ctx.lineWidth = 1;
        ctx.strokeRect(beamRect.x, beamRect.y, beamRect.width, beamRect.height);
      }
    }

    ctx.globalAlpha = 1;
  }
}
ComposedEnemy.projectiles = [];


// ── Migrated legacy enemy classes (2026-07-20) ──────────────────────────────
// The rest of the roster, now built on ComposedEnemy instead of bespoke
// per-class update()/draw()/takeDamage() code — user request: "make all
// the other enemies into composed enemies so that any changes we make to
// the class as a whole will update them too." Moved down here (not left in
// their original spots higher up the file) because `extends ComposedEnemy`
// needs that class already defined — a `class X extends Y` at module-eval
// time is subject to the same temporal-dead-zone rule as any other `const`/
// `class`, so this had to come after ComposedEnemy's own declaration above,
// not before it. CrystalSentinel is now converted too (2026-07-24) — its
// regenerating directional shield-HP system is a generic `def.stats.shield`
// trait now (see ComposedEnemy's constructor/takeDamage()/update()), not
// bespoke per-class code anymore. The two real minibosses (ColossusCore,
// FracturedSlime) remain NOT converted — they have their own reward/defeat
// plumbing and (Colossus) an "only Charged Attacks damage it" rule
// ComposedEnemy has no concept of — converting either would be a real,
// separately-scoped project, not part of this pass.
class WarScavenger extends ComposedEnemy {
  constructor(x, y) { super(x, y, WAR_SCAVENGER_DEF); }
}
const STUTTERER_DEF = {
  id: 'stutterer',
  color: '#a78bfa',
  movement: { type: 'teleport_blink', mode: 'interval', interval: 120, blinkDistance: 110, cooldown: 0 },
  attacks: [{ type: 'melee_swing', range: ENEMY_ATTACK_RANGE * 2.5, windupFrames: ENEMY_WINDUP_FRAMES, activeFrames: 20, cooldown: ENEMY_ATTACK_COOLDOWN + 30, damage: ENEMY_DAMAGE }],
  stats: { health: ENEMY_HEALTH },
};

// ComposedEnemy migration (2026-07-20, user request: "make all the other
// enemies into composed enemies so changes to the class update them too").
// Same teleport-harass identity, built from shared vocabulary now — future
// ComposedEnemy changes (new counters, hyper-armor, etc.) apply here for
// free. One real behavior change, not just a visual one: the original
// jumped a RANDOM distance (80-140px) toward the player; teleport_blink's
// shared 'interval' mode always lands a fixed distance BEHIND the player's
// facing instead (the same logic EchoStalker below already used) — traded
// exact fidelity for one shared, tunable teleport implementation instead of
// two near-duplicate bespoke ones. The fan-arc swing visual is gone from
// the generic draw (a custom attack visual or ANIM_DEFS art would bring it
// back); the decoy fade trail is NOT lost — it's now generic to any
// composed enemy using teleport_blink (see MOVEMENT_BEHAVIORS.teleport_blink).
class Stutterer extends ComposedEnemy {
  constructor(x, y) { super(x, y, STUTTERER_DEF); }
}
const CRYSTAL_SENTINEL_DEF = {
  id: 'crystal_sentinel',
  color: '#2dd4bf',
  // hover/maintain_distance already existed (Deflector Drone); verticalTrack
  // is the one addition this migration needed (see MOVEMENT_BEHAVIORS.hover)
  // so it chases the player's y instead of just bobbing in place.
  movement: { type: 'hover', mode: 'maintain_distance', speed: SENTINEL_SPEED, idealDistance: 200, verticalTrack: true },
  // pattern:'homing' with homingDuration set to the shot's full life (120)
  // reproduces the original's "homes for its whole flight," not the generic
  // ranged_projectile default (a short homing window, per enemy_attack_
  // vocabulary_plan.md's "Homing (short)" entry). damage:12 matches the
  // original's hardcoded player.takeDamage(12) — high relative to melee
  // ENEMY_DAMAGE, kept as-is rather than silently rebalanced.
  attacks: [{ type: 'ranged_projectile', range: 400, windupFrames: 35, activeFrames: 20, cooldown: SENTINEL_ATTACK_COOLDOWN,
              damage: 12, projectileSpeed: 3.5, pattern: 'homing', homingDuration: 120, color: '#2dd4bf' }],
  stats: { health: SENTINEL_HEALTH, width: 32, height: 40, ignoreVertical: true,
           shield: { hp: SENTINEL_SHIELD_HP, breakDuration: 90, regenInterval: 180 } },
};

// ComposedEnemy migration (2026-07-24) — the last non-miniboss enemy class,
// per user request "add crystal sentinel to composed enemy so that all
// enemies are composed." The directional shield-HP system that blocked this
// before (see the "Migrated legacy enemy classes" header comment above) is
// now `def.stats.shield`, a generic trait any composed enemy can opt into —
// chips a separate HP pool on a front-facing melee hit (`shieldFacesPoint()`,
// already shared with Deflector Drone), lets ranged bypass it entirely,
// regenerates over time, and snaps back after a break window. Two smaller
// generic additions came out of this migration too: `def.stats.width/height`
// (every composed enemy before this used the base 28x28 default) and hover's
// `verticalTrack` mode (see above) — both immediately reusable by future
// composed enemies, not one-offs.
class CrystalSentinel extends ComposedEnemy {
  constructor(x, y) { super(x, y, CRYSTAL_SENTINEL_DEF); }
}
const VOID_LANCER_DEF = {
  id: 'void_lancer',
  color: '#7c3aed',
  movement: { type: 'ground_chase', speed: LANCER_SPEED, patrolSpeed: PATROL_SPEED },
  attacks: [{ type: 'dash_charge', range: ENEMY_ATTACK_RANGE * 6, windupFrames: LANCER_WINDUP_FRAMES,
              activeFrames: LANCER_CHARGE_DURATION, cooldown: LANCER_CHARGE_COOLDOWN, damage: LANCER_DAMAGE,
              chargeSpeed: LANCER_CHARGE_SPEED, knockbackX: 5, knockbackY: -4, knockbackHitStun: 14 }],
  counters: [{ ability: 'melee_parry', effect: 'stun_and_double_damage' }],
  defense: { dodge: { chance: 0.4, range: 90, iframes: 18, cooldown: 150 }, dashPunish: true },
  feintChance: 0.15,
  stats: { health: LANCER_HEALTH },
};

// ComposedEnemy migration (2026-07-20) — dash_charge already generalizes
// exactly this "telegraphed charging thrust" shape, and melee_parry's
// stun_and_double_damage counter already generalizes the perfect-parry
// payoff. `dash_charge`'s hitbox is the enemy's full body while charging
// (vs. the original's narrower 22px lance box) — a slightly more generous
// hitbox for the player to land the parry against, not a nerf to the
// Lancer. LANCER_DAMAGE (2) is now actually applied — the original class
// never read that constant at all (game.js's flat ENEMY_DAMAGE=1 was the
// only damage source for any non-ComposedEnemy class), so this is a real
// (intentional, matches the documented design) damage buff, worth a
// playtest.
class VoidLancer extends ComposedEnemy {
  constructor(x, y) { super(x, y, VOID_LANCER_DEF); }
}
const NULL_SENTINEL_DEF = {
  id: 'null_sentinel',
  color: '#e0d4ff',
  movement: { type: 'ground_chase', speed: ENEMY_SPEED, patrolSpeed: PATROL_SPEED },
  attacks: [{ type: 'melee_swing' }],
  counters: [{ ability: 'phase_dash', effect: 'cancel_and_damage', radius: 70, damage: 1 }],
  phaseToggle: { interval: SENTINEL_PHASE_INTERVAL },
  stats: { health: ENEMY_HEALTH },
};

// ComposedEnemy migration (2026-07-20) — the original called super.update()
// (base Enemy's default chase+melee AI) and only added the solid/phaseable
// toggle + dash-cancel check on top, so it was ALREADY a "cohesive"
// chase-and-attack enemy, not the do-nothing wall it can look like on a
// quick read — the toggle is new here via the generic `phaseToggle` trait
// (ComposedEnemy ctor/update()), which any composed def can now use, and
// the dash-cancel is the existing phase_dash/cancel_and_damage counter,
// now gated on `enemy.solid` (see that counter's check() in
// COUNTER_EFFECTS.phase_dash above) so it only fires while solid.
class NullSentinel extends ComposedEnemy {
  constructor(x, y) { super(x, y, NULL_SENTINEL_DEF); }
}
const ANCHOR_WRAITH_DEF = {
  id: 'anchor_wraith',
  color: '#818cf8',
  movement: { type: 'hover', mode: 'approach', speed: WRAITH_DRIFT_SPEED },
  attacks: [], // no melee of its own — the field is the whole point, same as the original
  counters: [{ ability: 'phase_dash', effect: 'cancel_and_damage', radius: WRAITH_FIELD_RADIUS, damage: 1 }],
  stats: { health: ANCHOR_WRAITH_HEALTH, ignoreVertical: true },
};

// ComposedEnemy migration (2026-07-20) — hover's 'approach' mode is exactly
// "slow deliberate drift toward the player, don't chase aggressively," and
// phase_dash/cancel_and_damage is exactly the always-on stasis field. A
// deliberate zero-attack def, per the design comment above (`Plans/
// enemy_attack_vocabulary_plan.md` note on "a stationary Null-Field enemy"
// being a sanctioned rare pattern) — but note it DOES still move (drifts),
// unlike a fully stationary counter-only enemy would.
class AnchorWraith extends ComposedEnemy {
  constructor(x, y) { super(x, y, ANCHOR_WRAITH_DEF); }
}
const DEFLECTOR_DRONE_DEF = {
  id: 'deflector_drone',
  color: '#67e8f9',
  movement: { type: 'hover', mode: 'maintain_distance', speed: DEFLECTOR_HOVER_SPEED, idealDistance: 150, bobAmplitude: 12, bobSpeed: 0.03 },
  attacks: [{ type: 'shield_reflect' }],
  counters: [{ ability: 'shard_shot', effect: 'reflect' }],
  stats: { health: DEFLECTOR_HEALTH, ignoreVertical: true },
};

// ComposedEnemy migration (2026-07-20) — shield_reflect + the shard_shot/
// reflect counter are literally what this enemy's own header comment says
// they were generalized FROM, so this is closer to "restore the original
// name to its generic form" than a real port. Movement swaps the bespoke
// sine-bob-plus-slow-drift for hover's 'maintain_distance' mode (bob +
// hold roughly `idealDistance` away) — same passive-obstacle feel, not
// pixel-identical drift math. `shieldFacesPoint()` (used by game.js's
// projectile-hit-enemy check) is now a ComposedEnemy method, not
// DeflectorDrone-only — see its definition above getAttackHitbox().
class DeflectorDrone extends ComposedEnemy {
  constructor(x, y) { super(x, y, DEFLECTOR_DRONE_DEF); }
}
const MIRROR_SPRITE_DEF = {
  id: 'mirror_sprite',
  color: '#c084fc',
  movement: { type: 'ground_chase', speed: ENEMY_SPEED, patrolSpeed: PATROL_SPEED },
  attacks: [{ type: 'melee_swing' }],
  faceTangible: true,
  stats: { health: SPRITE_HEALTH },
};

// ComposedEnemy migration (2026-07-20) — `faceTangible` is a new generic
// ComposedEnemy trait (see the ctor/update()/takeDamage()/draw() hooks
// above) doing exactly what this class's bespoke tangible-toggle used to:
// intangible (dimmed, can't be damaged) unless the player is currently
// facing toward it, but it can still wind up and attack while intangible —
// "attacks from behind when you're not facing it" stays intact.
class MirrorSprite extends ComposedEnemy {
  constructor(x, y) { super(x, y, MIRROR_SPRITE_DEF); }
}
const ECHO_STALKER_DEF = {
  id: 'echo_stalker',
  color: '#7c3aed',
  movement: { type: 'teleport_blink', mode: 'on_player_dash_end', blinkDistance: 10, cooldown: STALKER_BLINK_COOLDOWN },
  attacks: [{ type: 'melee_swing' }],
  stats: { health: STALKER_HEALTH },
};

// ComposedEnemy migration (2026-07-20) — this was already the class whose
// behavior teleport_blink's 'on_player_dash_end' mode was generalized
// FROM (see that mode's own comment), so this port is exact, not an
// approximation. Decoy fade trail: no longer bespoke, generic to any
// composed enemy on teleport_blink (see MOVEMENT_BEHAVIORS.teleport_blink
// and ComposedEnemy.draw()).
class EchoStalker extends ComposedEnemy {
  constructor(x, y) { super(x, y, ECHO_STALKER_DEF); }
}
const BLITZ_GUARD_DEF = {
  id: 'blitz_guard',
  color: '#ef4444',
  movement: { type: 'ground_chase', speed: BLITZ_SPEED, patrolSpeed: PATROL_SPEED },
  attacks: [{ type: 'melee_swing', range: ENEMY_ATTACK_RANGE * 1.2, windupFrames: BLITZ_WINDUP_FRAMES,
              activeFrames: 16, cooldown: BLITZ_ATTACK_COOLDOWN, damage: BLITZ_DAMAGE }],
  stats: { health: BLITZ_HEALTH, verticalBand: 80 },
};

// ComposedEnemy migration (2026-07-20) — one real simplification, not just
// a port: the original's separate "burst-dash 7px/f toward the player when
// >200px away, no damage during it, THEN a short-windup melee once in
// range" two-speed behavior has no direct ground_chase equivalent (which
// only has one chase speed, no distance-gated burst state) — folded into a
// single fast continuous chase at BLITZ_SPEED instead. Reads slightly less
// "lunges from range," still reads as fast/aggressive up close where the
// short windup (14f) does the real work. Worth a playtest; a dedicated
// "burst chase past a distance threshold" MOVEMENT_BEHAVIORS mode would be
// the fuller fix if this feels like a real loss.
class BlitzGuard extends ComposedEnemy {
  constructor(x, y) { super(x, y, BLITZ_GUARD_DEF); }
}

// ── 8 more roster entries (2026-07-21, expansion.md Phase 2.1/2.3) ─────────
// Same pattern as the migrated 8 above — a def + a thin subclass, so they
// show up in ENEMY_REGISTRY/enemy_test.html/area.js placement exactly like
// every hand-coded class always has. Picked to (a) match a named
// expansion.md enemy where reasonable, not invent unrelated ones, and (b)
// exercise mechanics that hadn't been proven on a real enemy yet — Tiger
// Knee, Shield Slip, The Catch/Aggro-Pull together, the brand-new Regen
// trait, and the stillpoint/cancel counter (never attached to any named
// enemy before this).

// Void Juggernaut (expansion.md #18 + the literal example enemy named in
// enemy_attack_vocabulary_plan.md for both Aggro-Pull and The Catch) — a
// Heavy dash-charger. Shooting it from range only enrages it into a rush;
// Void Tethering it pulls YOU to IT, and since it's Armored, arrival is a
// catch-and-throw, not a free hit.
const VOID_JUGGERNAUT_DEF = {
  id: 'void_juggernaut',
  color: '#f97316',
  movement: { type: 'ground_chase', speed: 1.8, patrolSpeed: 0.6 },
  attacks: [{ type: 'dash_charge', range: 280, windupFrames: 32, activeFrames: 22, cooldown: 150,
              damage: 3, chargeSpeed: 8, knockbackX: 7, knockbackY: -5, knockbackHitStun: 16 }],
  counters: [
    { ability: 'shard_shot', effect: 'aggro_pull', chargeSpeed: 2.4, chargeDuration: 26 },
    { ability: 'void_tether', effect: 'the_catch', throwKnockbackX: 14, throwKnockbackY: -8, throwHitStun: 22, damage: 2 },
  ],
  stats: { health: 14, knockbackResistance: 0.4, armored: true },
};
class VoidJuggernaut extends ComposedEnemy {
  constructor(x, y) { super(x, y, VOID_JUGGERNAUT_DEF); }
}

// Ruin Stalker (expansion.md #14, "clings to walls/ceilings, drops down on
// you") — true wall-clinging isn't in the movement vocabulary, so this
// keeps its ground_chase footing but leans on Tiger Knee (this session's
// anti-air attack, built with Ruin Stalker named as its intended user in
// the vocabulary plan) as its signature punish for jumping near it.
const RUIN_STALKER_DEF = {
  id: 'ruin_stalker',
  color: '#a3a3a3',
  movement: { type: 'ground_chase', speed: 1.6, patrolSpeed: 0.5 },
  attacks: [
    { type: 'melee_swing', weight: 2 },
    { type: 'tiger_knee', weight: 3 },
  ],
  // Breakout (2026-07-21, defense-verb rollout) — anti-air juggle-prone
  // enemy gets the one verb built specifically for that: escape after 4
  // hits within the window, white-flash tell so the player can dash out
  // instead of free-comboing it forever.
  defense: { breakout: { hits: 4, window: 90, cooldown: 400 } },
  stats: { health: 6 },
};
class RuinStalker extends ComposedEnemy {
  constructor(x, y) { super(x, y, RUIN_STALKER_DEF); }
}

// Fractured Knight (expansion.md #9, "carries a front shield that blocks
// melee and projectiles") — Shield Slip handles the melee block/overheat
// half; shard_shot/reflect handles the projectile half. Still throws an
// occasional swing between shield holds (melee_swing is active/weighted,
// shield_slip is passive — both run at once, same layering Deflector
// Drone's shield_reflect + a real attack would use).
const FRACTURED_KNIGHT_DEF = {
  id: 'fractured_knight',
  color: '#94a3b8',
  movement: { type: 'ground_chase', speed: 1.0, patrolSpeed: 0.5 },
  attacks: [
    { type: 'melee_swing', damage: 2, cooldown: 110 },
    { type: 'shield_slip', hitThreshold: 3, hitWindow: 100, dropDuration: 70 },
  ],
  counters: [{ ability: 'shard_shot', effect: 'reflect' }],
  // Block (2026-07-21, defense-verb rollout) — "shield wall" archetype gets
  // the block verb on top of Shield Slip: a raised guard on your swing's
  // startup, separate from the ranged-side reflect/shield_slip mechanics.
  // Void Tether still rips a raised guard open (enemy.js's tether-arrival
  // block already special-cases enemy.blocking > 0), so it's beatable, not
  // a wall.
  defense: { block: { chance: 0.5, range: 90, guardFrames: 30, cooldown: 130 } },
  stats: { health: 10, knockbackResistance: 0.3 },
};
class FracturedKnight extends ComposedEnemy {
  constructor(x, y) { super(x, y, FRACTURED_KNIGHT_DEF); }
}

// The Conduit — Static Field miniboss (`static_guardian`). A human scientist
// who creates the world's weaponry/electronics; her tell is electricity, not
// scale. First real usage of the generic phase system (see _applyPhase()):
// phase 2 doesn't change which attacks fire, just makes them angrier and
// adds "electroweak decay" — a weak damage-over-time effect on a landed hit,
// per the story doc.
const CONDUIT_DEF = {
  id: 'static_guardian',
  displayName: 'The Conduit',
  color: '#6558F5',
  movement: { type: 'ground_chase', speed: 1.4, patrolSpeed: 0.6 },
  attacks: [
    { type: 'ranged_projectile', range: 380, windupFrames: 30, activeFrames: 18, cooldown: 90,
      damage: 1, projectileSpeed: 4, pattern: 'homing', homingDuration: 40, color: '#a5b4fc', weight: 2 },
    { type: 'ranged_projectile', range: 300, windupFrames: 34, activeFrames: 18, cooldown: 130,
      damage: 1, projectileSpeed: 3.5, pattern: 'spread', projectileCount: 3, spreadAngle: 40,
      color: '#6558F5', weight: 1 },
  ],
  stats: { health: 26, knockbackResistance: 0.2 },
  phases: [
    {
      healthPct: 0.5,
      statMultipliers: { speedMult: 1.25, damageMult: 1.2, cooldownMult: 0.85 },
      flags: { dotOnHit: { damagePerTick: 1, tickInterval: 45, duration: 150 } },
    },
  ],
};
class TheConduit extends ComposedEnemy {
  constructor(x, y) { super(x, y, CONDUIT_DEF); }
}

// The Mirror King — Mirror Veil miniboss (`hollow_guardian`). Evil-by-choice
// (lore.md): a section chief who duplicates himself and enforces a vain
// hierarchy over his own copies. The story doc's literal "swarm of self/
// player/projectile copies" (expansion.md Phase 4 #4.1) is scoped down per
// the boss-buildout plan's own outline (`Plans/continue_boss_buildout_prompt.md`)
// — no new clone-entity engine work this pass — so the mirror theme reads
// through existing mechanics instead: counter_stance turns a landed player
// swing back on them (a literal mirrored hit), a spread ranged_projectile
// stands in for his duplicated shard volleys, and dodge is his vanity/
// elusiveness. Phase 2 ("the real one is found, the copies stop protecting
// him") drops the coy counter-play for a faster, harder, more direct
// assault — not literally spawning copies, but the same story beat: no
// more hiding behind tricks. Deliberately NOT knockback-resistant, per the
// story doc's own strategy note ("not immune to knockback, hard punishes work").
const MIRROR_KING_DEF = {
  id: 'hollow_guardian',
  displayName: 'The Mirror King',
  color: '#c084fc',
  movement: { type: 'ground_chase', speed: 1.2, patrolSpeed: 0.5 },
  attacks: [
    { type: 'melee_swing', damage: 2, cooldown: 100, weight: 2 },
    { type: 'ranged_projectile', range: 340, windupFrames: 32, activeFrames: 16, cooldown: 120,
      damage: 1, projectileSpeed: 3.5, pattern: 'spread', projectileCount: 4, spreadAngle: 50,
      color: '#c084fc', weight: 2 },
    { type: 'counter_stance', range: 60, windupFrames: 18, activeFrames: 26, cooldown: 160,
      counterDamage: 2, counterKnockbackX: 6, counterKnockbackY: -5, counterHitStun: 14, weight: 1 },
  ],
  defense: { dodge: { chance: 0.35, range: 90, iframes: 16, cooldown: 150 } },
  stats: { health: 30 },
  phases: [
    {
      healthPct: 0.5,
      statMultipliers: { speedMult: 1.25, cooldownMult: 0.8, damageMult: 1.15 },
      attacks: [
        { type: 'ranged_projectile', pattern: 'spread', projectileCount: 6, spreadAngle: 70, weight: 1 },
      ],
    },
  ],
};
class MirrorKing extends ComposedEnemy {
  constructor(x, y) { super(x, y, MIRROR_KING_DEF); }
}

// The Fractured Sovereign's Guard — Graviton Core miniboss (`graviton_sentinel`).
// Sympathetic (lore.md's one direct Sovereign-thread exception): loyalty
// with no one left to be loyal to. Story doc (expansion.md Phase 4 #4.4):
// phase 1 is a shield bash plus melee combos, parriable/blockable until the
// shield breaks; phase 2 hits much harder with huge knockback, moves
// somewhat faster, resists the player's own knockback, and starts throwing
// ceiling rubble. Reuses FRACTURED_KNIGHT_DEF's block+stats.shield template
// almost directly (same "shield wall that breaks open" archetype), just
// player-scale-boss-tuned: a dash_charge "bash" as the primary threat
// instead of Fractured Knight's plain melee_swing, plus a phase-2 arc
// projectile standing in for the rubble drop (no new engine mechanic).
const GRAVITON_GUARD_DEF = {
  id: 'graviton_sentinel',
  displayName: "Sovereign's Guard",
  color: '#94a3b8',
  movement: { type: 'ground_chase', speed: 1.1, patrolSpeed: 0.5 },
  attacks: [
    { type: 'dash_charge', range: 260, windupFrames: 32, activeFrames: 20, cooldown: 140,
      damage: 3, chargeSpeed: 8, knockbackX: 7, knockbackY: -5, knockbackHitStun: 16, weight: 2 },
    { type: 'melee_swing', damage: 2, cooldown: 90, weight: 3 },
  ],
  // Block (guaranteed reactive guard on the player's swing startup) layered
  // with a separate breakable shield HP pool (stats.shield) — "parries/
  // blocks with the shield until it breaks" is these two working together,
  // the same combo FRACTURED_KNIGHT_DEF already proved.
  defense: { block: { chance: 0.55, range: 100, guardFrames: 32, cooldown: 120 } },
  stats: { health: 34, knockbackResistance: 0.3, width: 34, height: 46,
           shield: { hp: 10, breakDuration: 100, regenInterval: 200 } },
  phases: [
    {
      healthPct: 0.5,
      statMultipliers: { speedMult: 1.15, knockbackResistanceMult: 1.4 },
      attacks: [
        { type: 'dash_charge', knockbackX: 11, knockbackY: -8, knockbackHitStun: 22 },
        { type: 'ranged_projectile', range: 320, windupFrames: 28, activeFrames: 16, cooldown: 150,
          damage: 2, projectileSpeed: 3, pattern: 'arc', color: '#78716c', weight: 1 },
      ],
    },
  ],
};
class GravitonGuard extends ComposedEnemy {
  constructor(x, y) { super(x, y, GRAVITON_GUARD_DEF); }
}

// The Assembler — Paradox Engine miniboss (`paradox_engine`). Open moral
// axis (lore.md, deliberately not placed): the creator herself, still
// maintaining every warp field/portal gate in the shelter, not an
// abandoned automaton. Story doc (`expansion.md` Phase 4 #4.8): phase 1 is
// a standard telegraphed pattern (slam, shockwave, tracking beam); phase 2
// adds portal-assisted flanking, punishing anything but patient,
// cooldown-timed openings. `teleport_blink`'s 'interval' mode (blink to
// behind the player on a timer) is her "portal" the whole fight, tuned
// faster/further at phase 2 via the new generic `phaseDef.movement`
// override (see `_applyPhase()`) rather than only ramping at 50% — no new
// engine mechanic needed. "Shockwave" is a 360° `ranged_projectile` spread
// burst (an approximation, not a literal warp-energy AoE render).
const ASSEMBLER_DEF = {
  id: 'paradox_engine',
  displayName: 'The Assembler',
  color: '#fb923c',
  movement: { type: 'teleport_blink', mode: 'interval', interval: 150, blinkDistance: 90, cooldown: 70 },
  attacks: [
    { type: 'dash_charge', range: 260, windupFrames: 26, activeFrames: 18, cooldown: 130,
      damage: 2, chargeSpeed: 9, knockbackX: 6, knockbackY: -5, knockbackHitStun: 14, weight: 2 }, // slam
    { type: 'ranged_projectile', range: 260, windupFrames: 30, activeFrames: 10, cooldown: 150,
      damage: 1, projectileSpeed: 3.5, pattern: 'spread', projectileCount: 8, spreadAngle: 360,
      color: '#fb923c', weight: 2 }, // shockwave
    { type: 'beam', range: 420, windupFrames: 40, activeFrames: 40, cooldown: 170,
      damage: 1, tickCooldown: 14, beamWidth: 14, tracksPlayer: true, weight: 1 }, // tracking beam
  ],
  stats: { health: 32, knockbackResistance: 0.15 },
  phases: [
    {
      healthPct: 0.5,
      movement: { interval: 70, blinkDistance: 140, cooldown: 35 },
      statMultipliers: { cooldownMult: 0.85, damageMult: 1.15 },
    },
  ],
};
class TheAssembler extends ComposedEnemy {
  constructor(x, y) { super(x, y, ASSEMBLER_DEF); }
}

// Brainwashed prisoner — a Stationmaster add, not a standalone roster
// enemy (not in ENEMY_REGISTRY, spawned only via def.spawnOnStart below).
// Deliberately weak/generic: the story doc's point is that they're victims,
// not a real threat on their own, and per lore.md they're "killable by
// his own other attacks, not just the player's" — no special code needed
// for that half, a plain ComposedEnemy is as vulnerable to the
// Stationmaster's dash_charge/melee_swing hitboxes as the player is to
// friendly fire in any already-existing multi-enemy room.
const PRISONER_ADD_DEF = {
  id: 'brainwashed_prisoner',
  color: '#a8a29e',
  movement: { type: 'ground_chase', speed: 1.0, patrolSpeed: 0.4 },
  attacks: [{ type: 'melee_swing', damage: 1, cooldown: 90 }],
  stats: { health: 3 },
};

// Timeline Crossroads' scientist — story doc's proposed name "The
// Stationmaster" (`timeline_keeper`, lore.md, name not locked). Evil-by-
// choice: one of the scientists who ordered the child's creation and
// wanted her to fail; runs the shelter's transit routes and a prison at
// Echo Bridge. Story doc (`expansion.md` Phase 4 #4.11): phase 1 fights
// via brainwashed-prisoner adds (see PRISONER_ADD_DEF above) while trains/
// locomotives sweep the arena; phase 2 he takes to the air himself, flying
// and knockback-resistant — takes a lot of knockback but keeps flying
// regardless. First real use of two small generic phase-system additions
// (see `_applyPhase()`/constructor): `def.spawnOnStart` (the prisoners,
// present from the start of the fight, not a later escalation — matches
// the doc's own phase-1 placement) and `phaseDef.movement`'s `type` switch
// (ground → flight), which is also the first real user of `dash_charge`'s
// existing-but-previously-unused `aerial: true` mode. "Trains/locomotives
// sweeping the arena" is represented by a long-range, high-speed
// dash_charge rather than a new moving-hazard-object system — no separate
// engine work this pass.
const STATIONMASTER_DEF = {
  id: 'timeline_keeper',
  displayName: 'The Stationmaster',
  color: '#fbbf24',
  movement: { type: 'ground_chase', speed: 1.0, patrolSpeed: 0.5 },
  attacks: [
    { type: 'dash_charge', range: 500, windupFrames: 40, activeFrames: 14, cooldown: 160,
      damage: 3, chargeSpeed: 13, knockbackX: 8, knockbackY: -5, knockbackHitStun: 18, weight: 2 }, // locomotive sweep
    { type: 'melee_swing', damage: 2, cooldown: 100, weight: 2 },
  ],
  stats: { health: 30, knockbackResistance: 0.15, ignoreVertical: true },
  spawnOnStart: { def: PRISONER_ADD_DEF, count: 3, spread: 90 },
  phases: [
    {
      healthPct: 0.5,
      movement: { type: 'hover', mode: 'maintain_distance', speed: 1.6, idealDistance: 220, bobAmplitude: 14, bobSpeed: 0.03 },
      statMultipliers: { knockbackResistanceMult: 4 },
      attacks: [
        { type: 'dash_charge', aerial: true, knockbackX: 9, knockbackY: -6, knockbackHitStun: 20 },
      ],
    },
  ],
};
class TheStationmaster extends ComposedEnemy {
  constructor(x, y) { super(x, y, STATIONMASTER_DEF); }
}

// Quantum Pursuer — Echoing Abyss miniboss (`abyss_guardian`). Evil-by-
// choice (lore.md). Story doc (`expansion.md` Phase 4 #4.6): releases a
// 0.5s-delayed shadow of the player's own soul that forces constant
// movement, while charging soul-powered ranged spells from range; phase 1
// weak to knockback, phase 2 soul-charged/knockback-resistant and covers
// the field with long-range spells. The delayed-shadow half is a genuinely
// new mechanic — not something the phase/attack vocabulary already covers
// — so unlike every fight built so far this pass, this is a real
// `ComposedEnemy` SUBCLASS with `update()`/`draw()` overrides layered on
// top of the shared combat/attack/phase machinery (the same "bespoke
// overlay on shared systems" shape `Boss`/`ColossusCore` already use),
// not a plain data-only def.
const QUANTUM_PURSUER_SHADOW_DELAY_FRAMES = 30; // ~0.5s at 60fps; approximate, not gameTimeScale-adjusted
const QUANTUM_PURSUER_DEF = {
  id: 'abyss_guardian',
  displayName: 'Quantum Pursuer',
  color: '#f472b6',
  movement: { type: 'ground_chase', speed: 1.3, patrolSpeed: 0.5 },
  attacks: [
    { type: 'ranged_projectile', range: 420, windupFrames: 45, activeFrames: 20, cooldown: 130,
      damage: 2, projectileSpeed: 4, pattern: 'homing', homingDuration: 50, color: '#f472b6' },
  ],
  // knockbackResistance starts near-zero ("weak to knockback" in phase 1)
  // rather than exactly zero — _applyPhase's knockbackResistanceMult
  // *multiplies* the existing value, so a true 0 could never be raised by
  // phase 2's multiplier. 0.05 reads as "barely any," matching the doc.
  stats: { health: 26, knockbackResistance: 0.05 },
  phases: [
    {
      healthPct: 0.5,
      // "Soul-charged and resistant to knockback" — a real, large
      // increase (0.05 -> 0.5), not full immunity (the doc never claims
      // that for this fight, unlike Crag Warden/the Sovereign's phase 3).
      statMultipliers: { knockbackResistanceMult: 10 },
      // "Covers the field with long-range spells" — same attack slot,
      // longer range, faster, and now a 3-shot spread instead of a single
      // homing bolt.
      attacks: [
        { type: 'ranged_projectile', range: 520, cooldown: 100, pattern: 'spread',
          projectileCount: 3, spreadAngle: 30 },
      ],
    },
  ],
};
class QuantumPursuer extends ComposedEnemy {
  constructor(x, y) {
    super(x, y, QUANTUM_PURSUER_DEF);
    this._shadowHistory = [];
    this._shadowHitCooldown = 0;
  }

  update(player, bounds, echoes, allies) {
    super.update(player, bounds, echoes, allies);
    if (this.dead) return;
    const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;

    // Record this frame's player position, then the OLDEST entry once the
    // buffer is full is the shadow's live position — a fixed-size FIFO,
    // not scaled by gameTimeScale (so the delay stays roughly wall-clock
    // even during Stillpoint, rather than stretching with it).
    this._shadowHistory.push({ x: player.x, y: player.y, w: player.width, h: player.height });
    if (this._shadowHistory.length > QUANTUM_PURSUER_SHADOW_DELAY_FRAMES) this._shadowHistory.shift();

    if (this._shadowHitCooldown > 0) this._shadowHitCooldown -= _ts;
    if (this._shadowHistory.length >= QUANTUM_PURSUER_SHADOW_DELAY_FRAMES && this._shadowHitCooldown <= 0 &&
        player.invincibleTimer <= 0) {
      const shadow = this._shadowHistory[0];
      if (rectsOverlap({ x: shadow.x, y: shadow.y, width: shadow.w, height: shadow.h }, player)) {
        player.takeDamage(1, shadow.x);
        this._shadowHitCooldown = 60;
      }
    }
  }

  draw(ctx) {
    super.draw(ctx);
    if (this.dead || this._shadowHistory.length < QUANTUM_PURSUER_SHADOW_DELAY_FRAMES) return;
    const shadow = this._shadowHistory[0];
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = this.color;
    ctx.fillRect(shadow.x, shadow.y, shadow.w, shadow.h);
    ctx.restore();
  }
}

// Warden & Hollow — Warp Gate Nexus duo miniboss (`warp_guardian`).
// Sympathetic (lore.md: dutiful gatekeepers whose shift never technically
// ended). Story doc (`expansion.md` Phase 4 #4.9): a reactive counter-pair,
// not fake prediction — Warden guarantees a parry vs. melee only, with no
// other offense; Hollow guarantees a dodge/teleport vs. ranged & ability
// hits, but is vulnerable to melee. Strategy: melee the ranged-dodger
// (Hollow), Shard Shot/Phase Dash the melee-parrier (Warden) — forces
// toolkit-switching. `game.js`'s miniboss system only tracks one primary
// boss entity (`MINIBOSS_CLASSES`/`defeatedMinibosses` are both singular),
// so per this batch's established pattern (see the Stationmaster's
// prisoners), Warden is the registered miniboss and Hollow spawns
// alongside him via `def.spawnOnStart` — a second independent
// `ComposedEnemy` fighting in the same arena, not a second tracked "boss."
// Warden's "guaranteed parry, no other offense" needs zero new engine
// work: `defense.block` with `chance: 1.0` plus an empty `attacks: []`
// (a already-sanctioned pattern, see Anchor Wraith) covers it exactly —
// the existing cooldown between guard windows is the real punish gap, not
// a new "guard break" concept. Hollow's ranged-side guarantee is the
// batch's second new mechanic this pass: the new `defense.rangedDodge`
// verb (see `updateDefense()`), scoped to Shard Shot only — Void Tether/
// Graviton Surge "ability hits" aren't covered.
const HOLLOW_DEF = {
  id: 'warp_guardian_hollow',
  displayName: 'Hollow',
  color: '#38bdf8',
  movement: { type: 'ground_chase', speed: 1.0, patrolSpeed: 0.5 },
  attacks: [],
  defense: { rangedDodge: { range: 260, chance: 0.9, iframes: 20, cooldown: 80 } },
  stats: { health: 16 },
};
const WARDEN_DEF = {
  id: 'warp_guardian',
  displayName: 'Warden',
  color: '#94a3b8',
  movement: { type: 'ground_chase', speed: 1.0, patrolSpeed: 0.5 },
  attacks: [],
  defense: { block: { chance: 1.0, range: 100, guardFrames: 30, cooldown: 110 } },
  stats: { health: 20 },
  spawnOnStart: { def: HOLLOW_DEF, count: 1, spread: 140 },
  // No real escalation authored yet — a no-op stub (fires immediately,
  // changes nothing) so boss_phase_editor.html has a phases array to list
  // and build real phases into, same convention as any other ComposedEnemy
  // miniboss.
  phases: [{ healthPct: 1 }],
};
class WardenAndHollow extends ComposedEnemy {
  constructor(x, y) { super(x, y, WARDEN_DEF); }
}

// Electromagnetic Golem — The Polar Shift's miniboss (`polar_guardian`),
// directed by an unnamed scientist (evil-by-choice, `lore.md`/`expansion.md`
// #4.5). Explicitly large/machine per the sizing rule — the non-airborne
// half of the batch's two "engine-mechanic outlier" fights (contrast
// Gravity Collapse Core). Story doc: strong hits with heavy knockback; the
// scientist gives walls/floor/the player a magnetic charge (attract or
// repel), with counterplay platforms that flip the player's own charge.
// Phase 1: repulsion fields push the player around the room. Phase 2 (≤50%
// HP): charge-reversal slams pull the player in. Weak to projectiles/
// charged attacks — deliberately low health, no knockback resistance,
// nothing here blocks Shard Shot. Charging specific hand-authored
// platforms (`area.js`'s `polar_shift_room2`, `magnetizable: true`
// entries) on a timer is real per-frame room-state manipulation the
// phase/attack vocabulary doesn't cover, so — like Quantum Pursuer/The
// Stationmaster — this is a real `ComposedEnemy` subclass, not a data-only
// def. The actual pull/push force and the "touching a charged platform
// sets your own charge" counterplay both live in `player.js`'s physics
// block (see the `polarity` force loop there) — this class only decides
// WHICH platforms are charged and WHEN.
const ELECTROMAGNETIC_GOLEM_DEF = {
  id: 'polar_guardian',
  displayName: 'Electromagnetic Golem',
  color: '#f7e600',
  movement: { type: 'ground_chase', speed: 1.0, patrolSpeed: 0.4 },
  attacks: [
    { type: 'melee_swing', damage: 2, cooldown: 100,
      knockbackX: 9, knockbackY: -7, knockbackHitStun: 20, weight: 2 },
    { type: 'dash_charge', range: 300, windupFrames: 34, activeFrames: 20, cooldown: 160,
      damage: 3, chargeSpeed: 8, knockbackX: 10, knockbackY: -6, knockbackHitStun: 22, weight: 1 },
  ],
  stats: { health: 24, width: 72, height: 84 },
  // The real phase 2 (faster magnetize recharge at ≤50% HP) is hand-checked
  // in update() below against this.health directly, not read from here —
  // this stub just gives boss_phase_editor.html a phases array to list.
  phases: [{ healthPct: 1 }],
};
class ElectromagneticGolem extends ComposedEnemy {
  constructor(x, y) {
    super(x, y, ELECTROMAGNETIC_GOLEM_DEF);
    this._magnetizeCooldown = 90; // first charge comes a beat into the fight, not instantly
    this._chargedPlatforms = [];  // platform objects this instance currently has charged

    // Defensive reset: if a previous fight instance was left mid-charge
    // (room exit without defeat — see the dead-branch cleanup below),
    // `plat.polarity` mutations on area.js's shared platform objects would
    // otherwise persist across a fresh spawn. Guarantees every new fight
    // starts with an uncharged room regardless of how the last one ended.
    const area = typeof getCurrentArea !== 'undefined' ? getCurrentArea() : null;
    if (area) {
      for (const plat of area.platforms) {
        if (plat.magnetizable) plat.polarity = null;
      }
    }
  }

  update(player, bounds, echoes, allies) {
    super.update(player, bounds, echoes, allies);
    if (this.dead) { this._clearCharge(); return; }
    const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;
    this._magnetizeCooldown -= _ts;
    if (this._magnetizeCooldown <= 0) {
      const phase2 = this.health <= this.maxHealth * 0.5;
      this._triggerMagnetize(player, phase2);
      this._magnetizeCooldown = phase2 ? 140 : 220; // phase 2 recharges faster
    }
  }

  // Charges every `magnetizable` platform to a shared polarity. Phase 1
  // leaves the player's own charge alone (repulsion only bites once
  // they've picked one up via a counterplay platform — the intended
  // tension). Phase 2 force-sets the player's charge to the OPPOSITE of
  // the surfaces' new charge, guaranteeing a hard pull-in — the "charge-
  // reversal slam" the story doc describes as an explicit attack.
  _triggerMagnetize(player, phase2) {
    this._clearCharge();
    const area = typeof getCurrentArea !== 'undefined' ? getCurrentArea() : null;
    if (!area) return;
    const polarity = Math.random() < 0.5 ? 'positive' : 'negative';
    for (const plat of area.platforms) {
      if (!plat.magnetizable) continue;
      plat.polarity = polarity;
      this._chargedPlatforms.push(plat);
    }
    if (phase2) player.magnetCharge = polarity === 'positive' ? 'negative' : 'positive';
    if (typeof spawnParticles !== 'undefined') {
      spawnParticles(this.x + this.width / 2, this.y + this.height / 2, this.color, 18);
    }
  }

  _clearCharge() {
    for (const plat of this._chargedPlatforms) plat.polarity = null;
    this._chargedPlatforms.length = 0;
  }
}

// Gravity Collapse Core — Event Horizon's miniboss (`horizon_core`). No
// moral agent (lore.md: a runaway mining-extraction accident, not a
// person) — a massive flying construct that changes the room's gravity to
// any of 4 directions. Story doc (`expansion.md` Phase 4 #4.2): phase 1
// debris projectiles + gravity shifts under the player; phase 2 same kit,
// denser hazard layering as HP drops; immune to knockback and to being
// juggled. The room-gravity mechanic itself (`roomGravityDir`, the new
// `resolveRotatedGravityCollision` sibling collision function, the
// dispatch in `resolveEnemyPhysics`/`player.js`/`companion.js`) lives in
// `physics.js` — see `Plans/roadmap.md`'s architecture entry for the full
// design — this def is only the moveset sitting on top of it, set via the
// `gravity_flip` attack above. `movement.type: 'hover'` makes
// `_movementFlies` true, which already exempts this boss's OWN body from
// `applyRoomGravity`/room collision entirely (a free composition, no new
// code) — matching "massive flying robot," immune to its own attack.
// `knockbackImmune` fires via a `healthPct: 1` phase (true from frame 1),
// reusing the existing `phaseFlags` hook, also free.
const HORIZON_CORE_DEF = {
  id: 'horizon_core',
  displayName: 'Gravity Collapse Core',
  color: '#818cf8',
  movement: { type: 'hover', mode: 'maintain_distance', speed: 1.0, idealDistance: 260, bobAmplitude: 16, bobSpeed: 0.02 },
  attacks: [
    { type: 'ranged_projectile', range: Infinity, windupFrames: 34, activeFrames: 16, cooldown: 110,
      damage: 2, projectileSpeed: 4, pattern: 'straight', color: '#818cf8', weight: 3 }, // debris
    { type: 'gravity_flip', weight: 1 },
  ],
  stats: { health: 30, ignoreVertical: true, width: 80, height: 64 },
  phases: [
    { healthPct: 1, flags: { knockbackImmune: true } }, // immediate — "immune to knockback and to being juggled"
    { healthPct: 0.5, statMultipliers: { cooldownMult: 0.8, damageMult: 1.15 } }, // "same kit, denser hazard layering"
  ],
};
class HorizonCore extends ComposedEnemy {
  constructor(x, y) { super(x, y, HORIZON_CORE_DEF); }
}

// Temporal Warden — Chrono-Space Rift's miniboss (`chrono_ally`), drafted
// 2026-07-26 from the existing design in `expansion.md` §4.3/§2.5 and
// `lore.md`'s Chrono-Space Rift section. Sympathetic: a precognition-driven
// time mage who deliberately holds back his true strength out of guilt —
// restrained offense throughout ("doesn't go all out on you", per the
// user), not an aggressive rusher. Core mechanic: rewinds his own health on
// a visible countdown unless interrupted — deal enough damage during the
// brief flash window or the last ~10s of damage taken gets undone. Bespoke
// (like ColossusCore, not a ComposedEnemy subclass) since the rewind/undo-
// damage state is real per-frame room-state manipulation outside the
// phase/attack vocabulary, same reasoning as Electromagnetic Golem/Gravity
// Collapse Core. Also carries the ONE narratively-justified partial
// Stillpoint resistance in the game (`expansion.md` §2.5 explicitly flags
// this as a singular beat, "not a template to repeat elsewhere") — kept
// fully self-contained here (his own local blend of `gameTimeScale`, never
// touching the shared value other enemies read), matching that instruction
// and the same "boss-local, not general infrastructure" precedent the two
// gravity/magnetism fights already set. Reward on defeat: a Stillpoint
// upgrade (+1 lifesteal per hit, `stillpointLifestealBonus` in game.js)
// instead of the usual +1 Max Health, per his specific documented reward.
const TEMPORAL_WARDEN_HEALTH = 26;
const TEMPORAL_WARDEN_REWIND_CYCLE = 600;    // ~10s between rewind checkpoints
const TEMPORAL_WARDEN_FLASH_WINDOW = 90;     // ~1.5s visible "interrupt me now" window before a rewind
const TEMPORAL_WARDEN_INTERRUPT_DAMAGE = 4;  // damage needed during the flash window to cancel the rewind
const TEMPORAL_WARDEN_RESIST_CAP = 0.3;      // 30% max slow resistance — same ceiling expansion.md names for the generic "soft" version
const TEMPORAL_WARDEN_RESIST_STILLPOINT_USES = 3; // Stillpoint activations against him before resistance starts ramping in
class TemporalWarden {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 32;
    this.height = 40;
    this.vx = 0;
    this.vy = 0;
    this.health = TEMPORAL_WARDEN_HEALTH;
    this.maxHealth = TEMPORAL_WARDEN_HEALTH;
    this.facing = -1;
    this.dead = false;
    this.deathTimer = 0;
    this.displayName = 'Temporal Warden';
    this.flashTimer = 0; // renamed from hitFlash 2026-08-02 — same set-8/countdown/">0" pattern every other enemy's flash field uses, no behavior change

    // Restrained ranged kit — no melee, no heavy hits.
    this.attackCooldown = 60;
    this.telegraph = null; // { timer, duration }

    // Health-rewind cycle
    this._cycleTimer = TEMPORAL_WARDEN_REWIND_CYCLE;
    this._healthAtCycleStart = this.health;
    this._flashActive = false;
    this._damageDuringFlash = 0;

    // Partial Stillpoint resistance — self-detected (mirrors boss.js's own
    // edge-detection pattern), boss-local, never written back to the
    // shared `gameTimeScale`.
    this._stillpointWasActive = false;
    this._stillpointUsesAgainstHim = 0;

    // Visual bridge to game/animdata.js (2026-07-27) — visuals/frame-events
    // only (cameraShake/sfx); no melee hitbox exists to author toward, see
    // getAttackHitbox() below. Additive/fallback, same as every other bridge
    // in this file.
    this.animator = new Animator(this);
    this._animKey = null;
  }

  getBounds() { return { x: this.x, y: this.y, width: this.width, height: this.height }; }

  animStateKey() {
    if (this.dead) return 'temporal_warden_dead';
    if (this._flashActive) return 'temporal_warden_flash';
    if (this.telegraph) return 'temporal_warden_telegraph';
    return 'temporal_warden_idle';
  }

  // No melee hitbox of his own — Shard Shot-style bolts are the only
  // offense, pushed through ComposedEnemy's shared projectile pool below.
  getAttackHitbox() { return null; }

  takeDamage(amount, fromX) {
    if (this.dead) return;
    this.health -= amount;
    this.flashTimer = 8;
    if (this._flashActive) this._damageDuringFlash += amount;
    if (fromX !== undefined) this.vx = (this.x > fromX ? 1 : -1) * 1.5;
    if (this.health <= 0) { this.health = 0; this.dead = true; this.deathTimer = 0; }
  }

  // Ramps in only after the player leans on Stillpoint against him
  // specifically — full slow for the opening exchanges, so the resistance
  // reads as a response to being provoked, not a fixed stat from frame one.
  _myTimeScale(_globalTS) {
    const resist = this._stillpointUsesAgainstHim >= TEMPORAL_WARDEN_RESIST_STILLPOINT_USES
      ? TEMPORAL_WARDEN_RESIST_CAP
      : TEMPORAL_WARDEN_RESIST_CAP * (this._stillpointUsesAgainstHim / TEMPORAL_WARDEN_RESIST_STILLPOINT_USES);
    return _globalTS + (1 - _globalTS) * resist;
  }

  update(player, bounds, echoes) {
    if (this.dead) { this.deathTimer++; return; }
    const _globalTS = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;

    const spNow = !!(player && player.stillpointActive);
    if (spNow && !this._stillpointWasActive) this._stillpointUsesAgainstHim++;
    this._stillpointWasActive = spNow;
    const myTS = this._myTimeScale(_globalTS);

    this.flashTimer = Math.max(0, this.flashTimer - 1);
    this.facing = player.x > this.x ? 1 : -1;

    // ── Health-rewind cycle ────────────────────────────────────────────
    this._cycleTimer -= myTS;
    if (!this._flashActive && this._cycleTimer <= TEMPORAL_WARDEN_FLASH_WINDOW) {
      this._flashActive = true;
      this._damageDuringFlash = 0;
      if (typeof spawnParticles !== 'undefined') spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#67e8f9', 10);
    }
    if (this._cycleTimer <= 0) {
      if (this.dead) return;
      if (this._damageDuringFlash < TEMPORAL_WARDEN_INTERRUPT_DAMAGE) {
        // Not interrupted — undo this cycle's damage.
        this.health = Math.min(this.maxHealth, this._healthAtCycleStart);
        if (typeof spawnParticles !== 'undefined') spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#67e8f9', 20);
        if (typeof screenShake !== 'undefined') { screenShake = Math.max(screenShake, 10); screenShakeIntensity = Math.max(screenShakeIntensity, 4); }
      } else if (typeof spawnParticles !== 'undefined') {
        // Interrupted — rewind cancelled, current (damaged) health stands.
        spawnParticles(this.x + this.width / 2, this.y - 10, '#fbbf24', 14);
      }
      this._flashActive = false;
      this._cycleTimer = TEMPORAL_WARDEN_REWIND_CYCLE;
      this._healthAtCycleStart = this.health;
    }

    // ── Restrained ranged kit — a slow, telegraphed chrono bolt ─────────
    if (this.telegraph) {
      this.telegraph.timer -= myTS;
      if (this.telegraph.timer <= 0) {
        ComposedEnemy.fireProjectiles(this, player, { projectileSpeed: 3, pattern: 'straight', damage: 1, color: '#67e8f9' });
        this.telegraph = null;
        this.attackCooldown = 100;
      }
    } else if (this.attackCooldown > 0) {
      this.attackCooldown -= myTS;
    } else {
      this.telegraph = { timer: 34, duration: 34 };
    }

    // Floats — no gravity, gentle bob, holds a preferred distance rather
    // than closing in (a cautious kiter, matching "holds back").
    const preferredDist = 240;
    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dist = Math.abs(dx);
    if (dist > preferredDist + 40) this.vx = Math.sign(dx) * 1.0;
    else if (dist < preferredDist - 40) this.vx = -Math.sign(dx) * 1.0;
    else this.vx *= 0.9;
    this.x += this.vx * myTS;
    if (bounds) this.x = Math.max(bounds.left, Math.min(this.x, bounds.right - this.width));
    this.y += Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.03) * 0.3;

    // Visual bridge (see constructor's comment) — cameraShake/sfx frame
    // events only, no spawnProjectile (the chrono bolt fire is still
    // code-driven off telegraph.timer above, not frame-driven).
    this._animKey = this.animStateKey();
    if (typeof ANIM_DEFS !== 'undefined' && ANIM_DEFS[this._animKey]) {
      this.animator.play(this._animKey);
      this.animator.update(myTS);
      for (const ev of this.animator.consumeFrameEvents()) {
        if (ev.type === 'cameraShake') {
          if (typeof screenShake !== 'undefined') {
            screenShake = Math.max(screenShake, ev.shake ?? 10);
            screenShakeIntensity = Math.max(screenShakeIntensity, ev.intensity ?? 5);
          }
        } else if (ev.type === 'sfx') {
          if (typeof SFX !== 'undefined' && typeof SFX[ev.name] === 'function') SFX[ev.name]();
        }
      }
    }
  }

  draw(ctx) {
    if (this.dead) ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 40);

    const cx = this.x + this.width / 2, cy = this.y + this.height / 2;

    // Rewind-flash tell — a visible pulsing ring, brighter/faster the
    // closer the countdown gets to resolving, so "interrupt me now" reads
    // clearly before it happens, not just as a surprise afterward.
    if (this._flashActive) {
      const pulse = Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.4) * 0.25 + 0.4;
      ctx.strokeStyle = `rgba(103, 232, 249, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, this.width * 0.9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Robed body/hourglass core/eyes — visual bridge to game/animdata.js.
    // Additive: falls back to the procedural silhouette below when no
    // `temporal_warden_<state>` key is authored. The rewind-flash ring above
    // and the telegraph glow below still draw regardless, same convention
    // as every other bridge in this file.
    if (typeof ANIM_DEFS !== 'undefined' && ANIM_DEFS[this._animKey]) {
      this.animator.draw(ctx);
    } else {
      // Robed body — cyan/violet, a hooded time-mage silhouette.
      ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : '#2e2a4a';
      ctx.beginPath();
      ctx.moveTo(cx, this.y);
      ctx.lineTo(this.x + this.width, this.y + this.height);
      ctx.lineTo(this.x, this.y + this.height);
      ctx.closePath();
      ctx.fill();

      // Hourglass core — the visible "clock" motif, empties/fills with the cycle.
      const cycleFrac = 1 - this._cycleTimer / TEMPORAL_WARDEN_REWIND_CYCLE;
      ctx.fillStyle = 'rgba(103, 232, 249, 0.85)';
      ctx.beginPath();
      ctx.arc(cx, this.y + this.height * 0.55, 5, 0, Math.PI * 2 * Math.min(1, cycleFrac + 0.05));
      ctx.fill();

      // Eyes — white during the flash window (a real tell, not just the ring).
      ctx.fillStyle = this._flashActive ? '#ffffff' : '#67e8f9';
      ctx.fillRect(this.x + this.width / 2 - 7, this.y + this.height * 0.35, 5, 4);
      ctx.fillRect(this.x + this.width / 2 + 2, this.y + this.height * 0.35, 5, 4);
    }

    // Telegraph — a small charging glow before the chrono bolt fires.
    if (this.telegraph) {
      const progress = 1 - this.telegraph.timer / this.telegraph.duration;
      ctx.fillStyle = `rgba(103, 232, 249, ${0.2 + progress * 0.4})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 6 + progress * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }
}

// Shard Spitter (expansion.md #10, "fires bouncing projectiles that arc
// off walls") — ranged_projectile's existing 'bounce' pattern, built
// months before this session but never attached to a named enemy either.
const SHARD_SPITTER_DEF = {
  id: 'shard_spitter',
  color: '#38bdf8',
  movement: { type: 'ground_chase', speed: 0.8, patrolSpeed: 0.4 },
  attacks: [{ type: 'ranged_projectile', range: 380, windupFrames: 30, activeFrames: 15, cooldown: 110,
              damage: 1, projectileSpeed: 4.5, pattern: 'bounce', maxBounces: 2, color: '#38bdf8' }],
  stats: { health: 6 },
};
class ShardSpitter extends ComposedEnemy {
  constructor(x, y) { super(x, y, SHARD_SPITTER_DEF); }
}

// Kinetic Striker (expansion.md #12, "dashes through you... counter: jump
// over the dash and punish the recovery") — a glass-cannon dash_charge:
// low health, short windup, frequent. The "spark trail" flavor text is
// cosmetic only (no persistent hazard) — dash_charge's own body-as-hitbox
// during the charge already is the "dashes through you" contact.
const KINETIC_STRIKER_DEF = {
  id: 'kinetic_striker',
  color: '#facc15',
  movement: { type: 'ground_chase', speed: 2.2, patrolSpeed: 0.8 },
  attacks: [{ type: 'dash_charge', range: 240, windupFrames: 18, activeFrames: 16, cooldown: 100,
              damage: 1, chargeSpeed: 11, knockbackX: 6, knockbackY: -4, knockbackHitStun: 12 }],
  // Dodge (2026-07-21, defense-verb rollout) — "fast glass cannon" gets a
  // high-chance back-hop on your swing's startup, punishing predictable
  // pokes the same way its own dash punishes standing still.
  defense: { dodge: { chance: 0.55, range: 90, iframes: 16, cooldown: 130 } },
  stats: { health: 4 },
};
class KineticStriker extends ComposedEnemy {
  constructor(x, y) { super(x, y, KINETIC_STRIKER_DEF); }
}

// Timeworn Husk (expansion.md #11, "regenerates 1 HP every 2 seconds if
// not damaged... burst damage interrupts regeneration") — the first real
// use of the new generic `regen` trait (ComposedEnemy ctor/takeDamage()/
// update()/draw() above), built specifically for this enemy.
const TIMEWORN_HUSK_DEF = {
  id: 'timeworn_husk',
  color: '#78716c',
  movement: { type: 'ground_chase', speed: 0.9, patrolSpeed: 0.4 },
  attacks: [{ type: 'melee_swing', damage: 1, cooldown: 100 }],
  regen: { amount: 1, interval: 120, interruptWindow: 150 },
  stats: { health: 8 },
};
class TimewornHusk extends ComposedEnemy {
  constructor(x, y) { super(x, y, TIMEWORN_HUSK_DEF); }
}

// Pulse Warden (expansion.md #15, "emits expanding shockwave rings every 2
// seconds") — contact_field as a zero-active-attack passive danger zone,
// same "pure counter/passive enemy" pattern AnchorWraith uses, just damage
// instead of a phase-dash cancel. True ring-height dodging (jump over it)
// isn't modeled — contact_field is a flat radius check, not a rising ring
// — so for now it reads as "don't stand near it," not "time a jump."
const PULSE_WARDEN_DEF = {
  id: 'pulse_warden',
  color: '#c084fc',
  movement: { type: 'hover', mode: 'maintain_distance', speed: 0.6, idealDistance: 120, bobAmplitude: 10, bobSpeed: 0.025 },
  attacks: [{ type: 'contact_field', radius: 90, damage: 1, tickCooldown: 120 }],
  stats: { health: 7, ignoreVertical: true },
};
class PulseWarden extends ComposedEnemy {
  constructor(x, y) { super(x, y, PULSE_WARDEN_DEF); }
}

// Stillpoint Revenant (expansion.md #8, "emits a slow bubble that cancels
// your Stillpoint if you stand inside it") — the first enemy anywhere in
// the codebase to actually use the stillpoint/cancel counter; it existed
// in COUNTER_EFFECTS since the original combat overhaul but had never
// been attached to a real enemy def before now.
const STILLPOINT_REVENANT_DEF = {
  id: 'stillpoint_revenant',
  color: '#818cf8',
  movement: { type: 'ground_chase', speed: 1.1, patrolSpeed: 0.5 },
  attacks: [{ type: 'melee_swing', damage: 1, cooldown: 100 }],
  counters: [{ ability: 'stillpoint', effect: 'cancel', radius: 100 }],
  stats: { health: 7 },
};
class StillpointRevenant extends ComposedEnemy {
  constructor(x, y) { super(x, y, STILLPOINT_REVENANT_DEF); }
}

// The Undertow — Void Expanse miniboss (`void_expanse_boss`), drafted
// 2026-07-28 from lore.md's "open, not yet placed on the moral axis" entry:
// the child of a scientist obsessed with darkness, now merged with it —
// steals what people hold dearest (took the Temporal Warden's love, will
// take the player's own companion/ally too if brought here) and moves
// through the void at will. `teleport_blink`'s 'interval' mode is the same
// "portal, at will" pattern The Assembler already uses — reused rather than
// inventing a second teleport mechanic. `gravity_well` (no damage, just
// pulls) stands in for "steals what you hold dear" as a literal pulling
// current — no new companion-specific mechanic needed. Deliberately not
// armored or knockback-heavy: a chase/pressure fight, not a brawler.
const UNDERTOW_DEF = {
  id: 'void_expanse_boss',
  displayName: 'The Undertow',
  color: '#1a0b2e',
  movement: { type: 'teleport_blink', mode: 'interval', interval: 160, blinkDistance: 200, cooldown: 80 },
  attacks: [
    { type: 'ranged_projectile', range: 380, windupFrames: 32, activeFrames: 18, cooldown: 110,
      damage: 2, projectileSpeed: 4, pattern: 'homing', homingDuration: 45, color: '#4c1d95', weight: 2 },
    { type: 'ranged_projectile', range: 260, windupFrames: 40, activeFrames: 20, cooldown: 160,
      damage: 0, pattern: 'gravity_well', wellRadius: 110, wellPull: 0.22, color: '#0f0620', weight: 1 },
    { type: 'ranged_projectile', range: 340, windupFrames: 30, activeFrames: 16, cooldown: 140,
      damage: 1, projectileSpeed: 3.5, pattern: 'spread', projectileCount: 5, spreadAngle: 60, color: '#6d28d9', weight: 1 },
  ],
  stats: { health: 30, knockbackResistance: 0.15 },
  phases: [
    {
      healthPct: 0.5,
      movement: { interval: 90, blinkDistance: 260, cooldown: 45 },
      statMultipliers: { cooldownMult: 0.8, damageMult: 1.15 },
      attacks: [
        { type: 'ranged_projectile', pattern: 'gravity_well', wellRadius: 150, wellPull: 0.32 },
      ],
    },
  ],
};
class Undertow extends ComposedEnemy {
  constructor(x, y) { super(x, y, UNDERTOW_DEF); }
}

// The Child — Antechamber miniboss (`antechamber_child`), drafted 2026-07-28
// per lore.md's now-resolved canon (user direction: this fight REPLACES
// Abandoned Shell as the sole "lost the child" consequence — see
// game_update.js's miniboss-death branch for the Absorb/Spare choice this
// triggers instead of the usual +1 Max Health reward, and cutscene.js's
// `antechamber_child_ending` script for that choice itself). Grown up among
// escaped prisoners after being separated from the player during the
// Stationmaster's prison break; fights with the exact scavenged-weapon set
// `lore.md`/`expansion.md` name (tasers/flamethrowers/bombs/guns) — the
// same gun/taser/flamethrower presets and `ranged_projectile` 'mine'
// pattern WarScavenger already uses, not a new mechanic. Three phases per
// the doc: alone; then calls other former prisoners to her aid (the exact
// `PRISONER_ADD_DEF` add the Stationmaster already uses — same prisoners,
// same person calling them); then a rage-boosted final phase (stronger
// weapon variants + across-the-board multipliers). "Occasionally healing
// them" has no direct heal-an-ally verb in the vocabulary, so it's
// approximated as her own modest regen — reads as her patching herself
// (and by extension the fight) up while she has allies to lean on.
const ANTECHAMBER_CHILD_DEF = {
  id: 'antechamber_child',
  displayName: 'The Child',
  color: '#e2b8a3',
  movement: { type: 'ground_chase', speed: 1.1, patrolSpeed: 0.5 },
  attacks: [
    { type: 'gun', weight: 2, ...GUN_NORMAL },
    { type: 'taser', weight: 1, ...TASER_NORMAL },
    { type: 'flamethrower', weight: 1, ...FLAMETHROWER_NORMAL },
    // Scavenged bomb — ranged_projectile's 'mine' pattern (arm, then AoE),
    // same convention war_scavenger's `pattern: 'mine'` note describes.
    { type: 'ranged_projectile', weight: 1, range: 300, windupFrames: 45, activeFrames: 10,
      cooldown: 180, damage: 2, pattern: 'mine', armTimer: 60, mineRadius: 70, color: '#f59e0b' },
  ],
  regen: { amount: 1, interval: 150, interruptWindow: 120 },
  stats: { health: 22, knockbackResistance: 0.1 },
  phases: [
    {
      healthPct: 0.66,
      spawn: { def: PRISONER_ADD_DEF, count: 2, spread: 100 }, // "calling other former prisoners to her aid"
    },
    {
      healthPct: 0.33,
      statMultipliers: { speedMult: 1.3, cooldownMult: 0.7, damageMult: 1.3 }, // rage-boosted final phase
      attacks: [
        { type: 'gun', ...GUN_STRONG },
        { type: 'taser', ...TASER_STRONG },
        { type: 'flamethrower', ...FLAMETHROWER_STRONG },
      ],
    },
  ],
};
class TheChild extends ComposedEnemy {
  constructor(x, y) { super(x, y, ANTECHAMBER_CHILD_DEF); }
}

// Abandoned Shell — Hollow Core miniboss (`abandoned_shell`), drafted
// 2026-07-28. Per story.md §5's original design ("a ghostly, red-eyed boss
// that copies your moves — dashes, shard shots, attack patterns"), user-
// relocated 2026-07-28 from the final door to Hollow Core, and made
// unconditional (fights every playthrough regardless of the child's fate,
// decoupled from the losing-the-child narrative now that Antechamber
// Child owns that role). HP ~48 = 60% of BOSS_MAX_HEALTH (80, boss.js),
// matching story.md's original "~60% of the Sovereign" spec. A literal
// dynamic move-mirror (reading the player's own unlocked abilities at
// runtime) is real new engine work outside this pass's scope — approximated
// instead via the existing vocabulary, same "read through what's already
// there" convention every other fight in this file uses for a mechanic
// that isn't a literal 1:1 build: `dash_charge` mirrors Phase Dash,
// `ranged_projectile` (straight) mirrors Shard Shot, `melee_swing` mirrors
// the player's own basic attack pattern.
const ABANDONED_SHELL_DEF = {
  id: 'abandoned_shell',
  displayName: 'Abandoned Shell',
  color: '#dc2626',
  movement: { type: 'ground_chase', speed: 1.3, patrolSpeed: 0.6, canJump: true },
  attacks: [
    { type: 'melee_swing', damage: 2, cooldown: 90, weight: 2 },
    { type: 'dash_charge', range: 300, windupFrames: 20, activeFrames: 16, cooldown: 110,
      damage: 2, chargeSpeed: 12, knockbackX: 6, knockbackY: -5, knockbackHitStun: 14, weight: 2 },
    { type: 'ranged_projectile', range: 360, windupFrames: 28, activeFrames: 14, cooldown: 130,
      damage: 1, projectileSpeed: 5, pattern: 'straight', color: '#f87171', weight: 1 },
  ],
  stats: { health: 48, knockbackResistance: 0.15 },
  phases: [
    { healthPct: 0.5, statMultipliers: { speedMult: 1.2, cooldownMult: 0.8, damageMult: 1.15 } },
  ],
};
class AbandonedShell extends ComposedEnemy {
  constructor(x, y) { super(x, y, ABANDONED_SHELL_DEF); }
}

// Single source of truth for `area.enemies[].type` strings backed by a real
// class (mirrors the branches in game.js spawnAreaEnemies). Tools that need
// the full roster (e.g. the level editor's enemy dropdown) read this instead
// of hardcoding the list, so a newly added enemy class shows up automatically
// as soon as it's registered here — one line, not two places to update.
// NOTE: 'composed' is listed for discoverability only — unlike every other
// entry, ComposedEnemy's constructor takes a required 3rd argument (`def`),
// so it's never auto-constructed via `new ENEMY_REGISTRY[type](x, y)` the
// way the rest of the roster is. See game.js's spawnAreaEnemies() for the
// special-cased 'composed' branch that actually instantiates it.
const ENEMY_REGISTRY = {
  fractured: Enemy,
  stutterer: Stutterer,
  crystal_sentinel: CrystalSentinel,
  void_lancer: VoidLancer,
  null_sentinel: NullSentinel,
  anchor_wraith: AnchorWraith,
  deflector_drone: DeflectorDrone,
  mirror_sprite: MirrorSprite,
  echo_stalker: EchoStalker,
  blitz_guard: BlitzGuard,
  void_juggernaut: VoidJuggernaut,
  ruin_stalker: RuinStalker,
  fractured_knight: FracturedKnight,
  shard_spitter: ShardSpitter,
  kinetic_striker: KineticStriker,
  timeworn_husk: TimewornHusk,
  pulse_warden: PulseWarden,
  stillpoint_revenant: StillpointRevenant,
  war_scavenger: WarScavenger,
  composed: ComposedEnemy,
};
// NOTE: no miniboss (ComposedEnemy-based or bespoke — ColossusCore,
// ElectromagneticGolem, HorizonCore, TemporalWarden, etc.) is ever listed
// here, only in game.js's MINIBOSS_CLASSES — a miniboss is a singular,
// room-level `miniboss:` assignment with its own spawn lifecycle
// (isMinibossArena, defeatedMinibosses), not a regular placeable/roster
// enemy. levelEditor.html's enemy dropdown and difficulty_bot.html's
// roster both read this registry specifically to stay scoped to regular
// enemies; both tools' separate Boss/Miniboss picker reads MINIBOSS_CLASSES
// instead (see enemy_test.html's/difficulty_bot.html's generalized
// MINIBOSS_CLASSES-driven spawn code, 2026-07-26).

// ── Editor overrides (miniboss phases) ──────────────────────────────────
// Composed-enemy minibosses (game_state.js's MINIBOSS_CLASSES entries that
// are ComposedEnemy, not a bespoke class) keyed by def.id so
// boss_phase_editor.html can list/edit their `phases` arrays the same way
// it edits the Sovereign's BOSS_PHASE_CONFIG. Bespoke-class minibosses
// (ColossusCore, ElectromagneticGolem's underlying class if any, etc.) have
// no `def.phases` and are intentionally absent here.
const COMPOSED_PHASE_DEFS = {
  static_guardian: CONDUIT_DEF,
  hollow_guardian: MIRROR_KING_DEF,
  graviton_sentinel: GRAVITON_GUARD_DEF,
  paradox_engine: ASSEMBLER_DEF,
  timeline_keeper: STATIONMASTER_DEF,
  abyss_guardian: QUANTUM_PURSUER_DEF,
  warp_guardian: WARDEN_DEF,
  polar_guardian: ELECTROMAGNETIC_GOLEM_DEF,
  horizon_core: HORIZON_CORE_DEF,
  void_expanse_boss: UNDERTOW_DEF,
  antechamber_child: ANTECHAMBER_CHILD_DEF,
  abandoned_shell: ABANDONED_SHELL_DEF,
};

// boss_phase_editor.html saves work-in-progress here; same pattern as
// boss.js's BOSS_CONFIG_OVERRIDES_KEY. Keyed by def.id, each value is a
// wholesale replacement of that def's `phases` array (unlike
// BOSS_PHASE_CONFIG's per-phase-number merge — a miniboss phase list is
// small enough that add/remove/reorder is common, so partial merging by
// index would silently keep stale entries).
const ENEMY_PHASE_OVERRIDES_KEY = 'stillpoint_enemy_phase_overrides_v1';
function applyEnemyPhaseOverrides() {
  const overrides = readOverrideJSON(ENEMY_PHASE_OVERRIDES_KEY);
  if (!overrides) return;
  for (const id in overrides) {
    if (COMPOSED_PHASE_DEFS[id]) COMPOSED_PHASE_DEFS[id].phases = overrides[id];
  }
}
applyEnemyPhaseOverrides();

if (typeof window !== 'undefined') {
  window.COMPOSED_PHASE_DEFS = COMPOSED_PHASE_DEFS;
  window.ENEMY_PHASE_OVERRIDES_KEY = ENEMY_PHASE_OVERRIDES_KEY;
}

// Real per-enemy defaults, exported so tools like enemy_editor.html can read
// the numbers straight off enemy.js instead of keeping a hand-copied
// duplicate that silently drifts out of sync (see roadmap: "the editor
// lies" bug — health: 3 shown for an enemy whose real ENEMY_HEALTH is 6).
if (typeof window !== 'undefined') {
  window.ENEMY_HEALTH = ENEMY_HEALTH;
  window.ENEMY_ATTACK_COOLDOWN = ENEMY_ATTACK_COOLDOWN;
  window.ENEMY_SPEED = ENEMY_SPEED;
  window.LANCER_HEALTH = LANCER_HEALTH;
  window.LANCER_SPEED = LANCER_SPEED;
  window.LANCER_CHARGE_COOLDOWN = LANCER_CHARGE_COOLDOWN;
  window.SENTINEL_HEALTH = SENTINEL_HEALTH;
  window.SENTINEL_SPEED = SENTINEL_SPEED;
  window.SENTINEL_ATTACK_COOLDOWN = SENTINEL_ATTACK_COOLDOWN;
  window.ANCHOR_WRAITH_HEALTH = ANCHOR_WRAITH_HEALTH;
  window.WRAITH_DRIFT_SPEED = WRAITH_DRIFT_SPEED;
  window.DEFLECTOR_HEALTH = DEFLECTOR_HEALTH;
  window.DEFLECTOR_HOVER_SPEED = DEFLECTOR_HOVER_SPEED;
  window.SPRITE_HEALTH = SPRITE_HEALTH;
  window.STALKER_HEALTH = STALKER_HEALTH;
}
if (typeof window !== 'undefined') window.ENEMY_REGISTRY = ENEMY_REGISTRY;