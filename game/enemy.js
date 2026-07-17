// Enemies: Fractured (basic) and Stutterer (teleporting)

const ENEMY_SPEED = 1.5;
const ENEMY_HEALTH = 6;
const ENEMY_DAMAGE = 1;
const ENEMY_ATTACK_RANGE = 40;
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
      } else if (d.dodge && this.dodgeCooldown <= 0 && this.grounded &&
                 dist < (d.dodge.range ?? 90) && Math.random() < (d.dodge.chance ?? 0.35)) {
        // Telegraphed back-hop with brief i-frames — fixed landing recovery
        // is the punish window; baiting it out (swing, wait, swing) is the
        // counterplay. Never hops off a ledge.
        const away = px > ex ? -1 : 1;
        if (hasFootingAhead(this, null, away, 34)) {
          this.vx = away * 5;
          this.vy = -5;
          this.grounded = false;
          this.dodgeIFrames = d.dodge.iframes ?? 18;
          this.dodgeCooldown = d.dodge.cooldown ?? 150;
        }
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
      this.vy += GRAVITY * _ts;
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
    if (!this.windingUp && !this.attacking) {
      this.updateMovementIntent(sight, bounds, _ts, this.speed);
    }

    // Physics — shared resolver (physics.js): floors, wall stop/bounce,
    // ceilings, world floor + bounds. Replaces the old inline top-landing-
    // only loop, which could snap an enemy walking into a tall wall up onto
    // its top surface (no prevBottom guard) and ignored ceilings entirely.
    // If airborne and NOT juggling, stop horizontal movement — prevents enemies walking off platform edges into void
    if (!this.grounded && !this.juggling) this.vx = 0;
    this.grounded = false;
    this.vy += GRAVITY * _ts;
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
        this.vx = dir * 3;
        this.vy = -12; // big launch
        this.juggling = true;
      } else if (attackDir === 'down') {
        this.vx = dir * 6;
        this.vy = 8; // slam down
      } else {
        this.vx = dir * 5;
        this.vy = -4; // moderate pop-up for juggling
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
      ctx.fillStyle = '#f87171';
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
class Stutterer extends Enemy {
  constructor(x, y) {
    super(x, y, 'stutterer');
    this.teleportTimer = 0;
    this.teleportInterval = 120;
    this.decoys = [];
    this.blinking = false;
    this.blinkTimer = 0;
  }

  update(player, bounds, echoes) {
      const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;

    if (this.dead) { this.deathTimer++; return; }

    // Distraction
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

    this.teleportTimer += _ts;

    if (this.teleportTimer >= this.teleportInterval) {
      this.teleportTimer = 0;
      this.decoys.push({ x: this.x, y: this.y, life: 60 });
      const dx = player.x - this.x;
      const jumpDist = 80 + Math.random() * 60;
      this.x += Math.sign(dx) * jumpDist;
      this.x = Math.max(bounds.left, Math.min(this.x, bounds.right - this.width));
      // A teleport roll can land inside a platform (the old "Stutterer
      // materializes on top of a wall" bug) — push out along the shortest
      // axis instead. quiet=true: this is a runtime roll, not an authoring error.
      const tpArea = (typeof getCurrentArea === 'function') ? getCurrentArea() : null;
      if (tpArea) nudgeOutOfPlatforms(this, tpArea.platforms, 'Stutterer teleport', true);
      this.blinking = true;
      this.blinkTimer = 15;
      spawnParticlesAt(this.x + this.width / 2, this.y + this.height / 2, '#a78bfa', 6);
    }

    if (this.blinking) {
      this.blinkTimer -= _ts;
      if (this.blinkTimer <= 0) this.blinking = false;
    }

    for (let i = this.decoys.length - 1; i >= 0; i--) {
      this.decoys[i].life -= _ts;
      if (this.decoys[i].life <= 0) this.decoys.splice(i, 1);
    }

    // Shared detection (see Enemy.canSeePlayer()) — Stutterer never chases
    // (it teleports instead), so it only needs this for stable facing and
    // vertical-gated attack triggering, not the chase/patrol state machine.
    const sight = this.canSeePlayer(player);
    if (Math.abs(sight.dx) > ENEMY_FACING_DEADZONE) {
      this.facing = sight.dx > 0 ? 1 : -1;
    }
    this.vx = 0;

    // Windup before attack — gated to the vertical band too, so a Stutterer
    // on a platform far above/below the player can't windup just because
    // it's horizontally close.
    if (sight.verticalOk && Math.abs(sight.dx) < ENEMY_ATTACK_RANGE * 2.5 && this.attackCooldown <= 0 && !this.windingUp && !this.attacking) {
      this.windingUp = true;
      this.windUpTimer = ENEMY_WINDUP_FRAMES;
    }

    if (this.windingUp) {
      this.windUpTimer -= _ts;
      if (this.windUpTimer <= 0) {
        this.windingUp = false;
        this.attacking = true;
        this.attackTimer = 20;
        this.attackCooldown = ENEMY_ATTACK_COOLDOWN + 30;
      }
    }

    if (this.attacking) {
      this.attackTimer -= _ts;
      if (this.attackTimer <= 0) this.attacking = false;
    }

    if (this.attackCooldown > 0) this.attackCooldown -= _ts;
    if (this.attackCooldown < 0) this.attackCooldown = 0;

    // Stop horizontal movement when airborne — prevents falling off platforms sideways in void areas
    if (!this.grounded) this.vx = 0;
    this.grounded = false;
    this.vy += GRAVITY * _ts;
    this.y += this.vy * _ts;
    resolveEnemyPhysics(this, bounds, _ts); // shared resolver — see physics.js

    this.flashTimer++; // unscaled
  }

  draw(ctx) {
    if (this.dead) {
      ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 20);
    }

    // Decoys
    for (const decoy of this.decoys) {
      ctx.globalAlpha = (decoy.life / 60) * 0.3;
      ctx.fillStyle = '#a78bfa';
      ctx.fillRect(decoy.x, decoy.y, this.width, this.height);
    }
    ctx.globalAlpha = 1;

    if (this.blinking && this.blinkTimer % 4 < 2) return;

    // Teleport warning: grows into a full ring as the port approaches
    if (this.teleportTimer > this.teleportInterval - 30) {
      const prog = (this.teleportTimer - (this.teleportInterval - 30)) / 30;
      const pulse = Math.sin(this.teleportTimer * 0.5) * 0.5 + 0.5;
      const radius = 16 + prog * 24;
      ctx.strokeStyle = `rgba(167, 139, 250, ${(0.3 + pulse * 0.5) * prog})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
      // "BLINK" text above when very close
      if (prog > 0.7) {
        ctx.fillStyle = `rgba(196, 181, 253, ${prog})`;
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BLINK', this.x + this.width / 2, this.y - 8);
        ctx.textAlign = 'left';
      }
      ctx.lineWidth = 1;
    }

    // Body colour
    if (this.flashTimer < 6) {
      ctx.fillStyle = '#ffffff';
    } else if (this.distractionTimer > 0) {
      ctx.fillStyle = '#818cf8';
    } else if (this.windingUp) {
      const t = 1 - this.windUpTimer / ENEMY_WINDUP_FRAMES;
      ctx.fillStyle = `rgba(200, 100, 255, ${0.6 + t * 0.4})`;
    } else {
      ctx.fillStyle = '#a78bfa';
    }

    const cx = this.x + this.width / 2;
    ctx.fillRect(this.x + 4, this.y, this.width - 8, this.height);
    ctx.fillRect(this.x, this.y + 6, this.width, this.height - 12);

    // Eyes
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(cx - 5, this.y + 8, 4, 6);
    ctx.fillRect(cx + 1, this.y + 8, 4, 6);

    // Windup telegraph
    if (this.windingUp) {
      const progress = 1 - this.windUpTimer / ENEMY_WINDUP_FRAMES;
      const ringRadius = 8 + progress * 18;
      ctx.strokeStyle = `rgba(196, 130, 255, ${0.4 + progress * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, this.y + this.height / 2, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = '#e0d0ff';
      ctx.font = `bold ${9 + Math.round(progress * 3)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('!', cx, this.y - 6);
      ctx.textAlign = 'left';
    }

    // Attack swing (fan arc, purple)
    if (this.attacking && this.attackTimer <= 15) {
      const atk = this.getAttackHitbox();
      if (atk) {
        const swingProgress = 1 - this.attackTimer / 15;
        const originX = this.facing === 1 ? this.x + this.width : this.x;
        const originY = this.y + this.height / 2;
        const arcSpan = Math.PI * 0.65 * swingProgress;
        const startAngle = this.facing === 1 ? -Math.PI * 0.55 : -Math.PI * 0.45;
        ctx.strokeStyle = `rgba(167, 139, 250, ${0.9 - swingProgress * 0.4})`;
        ctx.lineWidth = 2.5 - swingProgress * 1.5;
        for (let i = 0; i <= 5; i++) {
          const a = startAngle + (i / 5) * this.facing * arcSpan;
          ctx.beginPath();
          ctx.moveTo(originX, originY);
          ctx.lineTo(originX + Math.cos(a) * 34, originY + Math.sin(a) * 34);
          ctx.stroke();
        }
        ctx.lineWidth = 1;
      }
    }

    ctx.globalAlpha = 1;
  }
}

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

class VoidLancer extends Enemy {
  constructor(x, y) {
    super(x, y, 'void_lancer');
    this.health = LANCER_HEALTH;
    this.speed = LANCER_SPEED; // enemy_editor.html's Speed slider reads/writes this.speed
    this.attackCooldown = LANCER_CHARGE_COOLDOWN;
    this.charging = false;       // mid-thrust, moving fast, hitbox live
    this.chargeTimer = 0;
    this.stunTimer = 0;          // parry stun — see takeDamage() for the double-damage payoff
    // Defense verbs: a duelist — hops back from swings and punishes
    // Phase-Dash spam (see Enemy.updateDefense for the knobs' meaning).
    this.defense = {
      dodge: { chance: 0.4, range: 90, iframes: 18, cooldown: 150 },
      dashPunish: true,
    };
    this.feintChance = 0.15;
  }

  update(player, bounds, echoes) {
    const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;

    if (this.dead) { this.deathTimer++; return; }

    // Parry stun — frozen in place, vulnerable to a follow-up double-damage hit.
    if (this.stunTimer > 0) {
      this.stunTimer -= _ts;
      this.vx = 0;
      this.flashTimer = Math.max(0, this.flashTimer - 1);
      return;
    }

    // Echo distraction (same convention as the other enemy types)
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

    const sight = this.canSeePlayer(player);

    // ── Windup: begin the telegraph once actively engaging and roughly in
    // lane (facing snaps to the player at windup start, same rule as the
    // base class — the charge commits to a direction and keeps it).
    if (sight.inRange && Math.abs(sight.dx) < ENEMY_ATTACK_RANGE * 6 &&
        this.attackCooldown <= 0 && !this.windingUp && !this.charging) {
      if (Math.abs(sight.dx) > ENEMY_FACING_DEADZONE) this.facing = sight.dx > 0 ? 1 : -1;
      this.windingUp = true;
      this.windUpTimer = LANCER_WINDUP_FRAMES;
      this.vx = 0;
    }

    if (this.windingUp) {
      this.windUpTimer -= _ts;
      this.vx = 0;
      if (this.windUpTimer <= 0) {
        this.windingUp = false;
        this.charging = true;
        this.chargeTimer = LANCER_CHARGE_DURATION;
        this.vx = this.facing * LANCER_CHARGE_SPEED;
        this.attackCooldown = LANCER_CHARGE_COOLDOWN;
      }
    }

    if (this.charging) {
      this.chargeTimer -= _ts;
      if (this.chargeTimer <= 0) {
        this.charging = false;
        this.vx = 0;
      }
    }

    if (this.attackCooldown > 0) this.attackCooldown -= _ts;
    if (this.attackCooldown < 0) this.attackCooldown = 0;

    // ── Approach (only when not telegraphing/charging) — shared
    // decision-committed chase/patrol from the base class.
    if (!this.windingUp && !this.charging) {
      this.updateMovementIntent(sight, bounds, _ts, this.speed);
    }

    if (!this.grounded && !this.charging) this.vx = 0;
    this.grounded = false;
    this.vy += GRAVITY * _ts;
    this.x += this.vx * _ts;
    this.y += this.vy * _ts;
    const phys = resolveEnemyPhysics(this, bounds, _ts); // shared resolver — see physics.js

    // Charging into a wall/bound ends the charge early rather than sliding
    // along it (wall contact now comes from the shared resolver; a hard
    // charge that bounced also ends — the thrust spent itself on the wall).
    if (this.charging &&
        (phys.wallNormal !== 0 || phys.bounced ||
         this.x <= bounds.left || this.x + this.width >= bounds.right)) {
      this.charging = false;
      this.chargeTimer = 0;
      this.vx = 0;
    }

    this.flashTimer++;
  }

  getAttackHitbox() {
    if (!this.charging) return null;
    return {
      x: this.facing === 1 ? this.x + this.width : this.x - 22,
      y: this.y + 6,
      width: 22,
      height: this.height - 12,
    };
  }

  // Perfect parry (game.js sets `this.stunTimer = PARRY_STUN` on a successful
  // deflect) leaves the Lancer stunned and open — the next hit that lands
  // while it's still stunned deals double damage, per its design counter.
  takeDamage(dmg, sourceX, attackDir = 'forward') {
    const wasStunned = this.stunTimer > 0;
    this.health -= wasStunned ? dmg * 2 : dmg;
    this.flashTimer = 0;
    this.windingUp = false;
    this.windUpTimer = 0;
    this.charging = false;
    this.chargeTimer = 0;
    this.stunTimer = 0;
    this.hitStun = 14;
    this.registerHitForBreakout(); // anti-juggle bookkeeping (no-op without defense.breakout)

    if (sourceX !== undefined) {
      const dir = (this.x > sourceX ? 1 : -1);
      if (attackDir === 'up') { this.vx = dir * 3; this.vy = -12; this.juggling = true; }
      else if (attackDir === 'down') { this.vx = dir * 6; this.vy = 8; }
      else { this.vx = dir * 5; this.vy = -4; if (!this.grounded) this.juggling = true; }
    }
    if (this.health <= 0) this.dead = true;
  }

  draw(ctx) {
    if (this.dead) {
      ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 20);
    }

    if (this.stunTimer > 0) {
      ctx.fillStyle = '#60a5fa';
    } else if (this.flashTimer < 6) {
      ctx.fillStyle = '#ffffff';
    } else if (this.distractionTimer > 0) {
      ctx.fillStyle = '#818cf8';
    } else if (this.windingUp) {
      const t = 1 - this.windUpTimer / LANCER_WINDUP_FRAMES;
      ctx.fillStyle = `rgb(${Math.round(80 + 100 * t)}, ${Math.round(60 + 40 * t)}, ${Math.round(180 + 60 * t)})`;
    } else {
      ctx.fillStyle = '#7c3aed';
    }
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Eye
    ctx.fillStyle = '#0a0a0f';
    const eyeX = this.facing === 1 ? this.x + 18 : this.x + 4;
    ctx.fillRect(eyeX, this.y + 8, 8, 6);

    // Lance — extends further and brightens through windup/charge
    const lanceLen = this.charging ? 30 : (this.windingUp ? 10 + (1 - this.windUpTimer / LANCER_WINDUP_FRAMES) * 18 : 6);
    const lanceX = this.facing === 1 ? this.x + this.width : this.x - lanceLen;
    ctx.fillStyle = this.windingUp ? `rgba(196, 181, 253, ${0.5 + (1 - this.windUpTimer / LANCER_WINDUP_FRAMES) * 0.5})` : '#c4b5fd';
    ctx.fillRect(lanceX, this.y + this.height / 2 - 2, lanceLen, 4);

    // Windup telegraph: glowing spear tip + "!"
    if (this.windingUp) {
      const progress = 1 - this.windUpTimer / LANCER_WINDUP_FRAMES;
      const tipX = this.facing === 1 ? this.x + this.width + lanceLen : this.x - lanceLen;
      ctx.fillStyle = `rgba(224, 208, 255, ${0.4 + progress * 0.6})`;
      ctx.beginPath();
      ctx.arc(tipX, this.y + this.height / 2, 3 + progress * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e0d0ff';
      ctx.font = `bold ${9 + Math.round(progress * 3)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('!', this.x + this.width / 2, this.y - 6);
      ctx.textAlign = 'left';
    }

    // Charge trail
    if (this.charging) {
      ctx.fillStyle = 'rgba(124, 58, 237, 0.35)';
      for (let i = 1; i <= 3; i++) {
        ctx.fillRect(this.x - this.facing * i * 10, this.y, this.width, this.height);
      }
    }

    // Stun indicator
    if (this.stunTimer > 0) {
      ctx.fillStyle = '#bfdbfe';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('*', this.x + this.width / 2, this.y - 6);
      ctx.textAlign = 'left';
    }

    // Defense-verb tells (dodge/dash-punish enemy — shows nothing unless active)
    this.drawDefenseTells(ctx);

    ctx.globalAlpha = 1;
  }
}

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

class NullSentinel extends Enemy {
  constructor(x, y) {
    super(x, y, 'null_sentinel');
    this.phaseTimer = 0;
    this.solid = true;
    // Defense verbs: the wall — raises a guard against frontal swings.
    // Counterplay: charged attacks break it, backstabs bypass it, a Void
    // Tether pull rips it open (see game.js's hit loop / tether arrival).
    this.defense = {
      block: { chance: 0.5, range: 90, guardFrames: 26, cooldown: 120 },
      breakout: { hits: 4, window: 120, cooldown: 600 },
    };
  }

  update(player, bounds, echoes) {
    super.update(player, bounds, echoes);
    if (this.dead) return;
    const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;

    this.phaseTimer += _ts;
    if (this.phaseTimer >= SENTINEL_PHASE_INTERVAL) {
      this.phaseTimer = 0;
      this.solid = !this.solid;
    }

    if (this.solid && player.phaseDashing && rectsOverlap(player, this)) {
      player.phaseDashing = false;
      player.phaseDashTimer = 0;
      player.vx *= 0.3;
      player.invincibleTimer = 0;
      player.takeDamage(1);
    }
  }

  draw(ctx) {
    if (this.dead) ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 20);

    const bodyAlpha = this.dead ? 1 : (this.solid ? 1 : 0.3);
    ctx.globalAlpha *= bodyAlpha;
    ctx.fillStyle = this.flashTimer < 6 ? '#ffffff' : (this.solid ? '#e0d4ff' : '#8888aa');
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#0a0a0f';
    const eyeX = this.facing === 1 ? this.x + 18 : this.x + 4;
    ctx.fillRect(eyeX, this.y + 8, 8, 6);
    ctx.globalAlpha = this.dead ? Math.max(0, 1 - this.deathTimer / 20) : 1;

    // Solid/phaseable state ring — reads at a glance without staring at body alpha.
    ctx.strokeStyle = this.solid ? 'rgba(224, 212, 255, 0.6)' : 'rgba(136, 136, 170, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 18, 0, Math.PI * 2);
    ctx.stroke();

    if (this.windingUp) {
      const progress = 1 - this.windUpTimer / ENEMY_WINDUP_FRAMES;
      ctx.fillStyle = `rgba(255, 120, 40, ${0.5 + progress * 0.5})`;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', this.x + this.width / 2, this.y - 6);
      ctx.textAlign = 'left';
    }
    ctx.globalAlpha = 1;
  }
}

// ── Anchor Wraith (expansion.md 2.3 #28) — Phase Dash counter ──────────────
// Tethered, drifts slowly (doesn't chase aggressively), projects a visible
// stasis field. Phase Dashing while inside the field cancels the dash and
// deals a small hit + strips i-frames, punishing "dash through everything"
// as a reflex — same design intent as Null Sentinel, different shape
// (always-on field vs. a timed on/off state).
const WRAITH_FIELD_RADIUS = 120;
const WRAITH_DRIFT_SPEED = 0.8;
const ANCHOR_WRAITH_HEALTH = 4; // low relative to other enemies, per expansion.md — meant to be killed before it matters, not fought head-on

class AnchorWraith extends Enemy {
  constructor(x, y) {
    super(x, y, 'anchor_wraith');
    this.ignoreVertical = true; // floats, not ground-bound
    this.health = ANCHOR_WRAITH_HEALTH;
    this.speed = WRAITH_DRIFT_SPEED; // enemy_editor.html's Speed slider reads/writes this.speed
  }

  update(player, bounds, echoes) {
    const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;
    if (this.dead) { this.deathTimer++; return; }

    if (this.hitStun > 0) {
      this.hitStun--;
      this.x += this.vx * _ts;
      this.y += this.vy * _ts;
      this.flashTimer = Math.max(-1, this.flashTimer - 1);
      return;
    }

    const sight = this.canSeePlayer(player);
    if (Math.abs(sight.dx) > ENEMY_FACING_DEADZONE) this.facing = sight.dx > 0 ? 1 : -1;

    // Slow, deliberate drift toward the player — "bait it to move before
    // dashing through the now-empty space" only works if it actually moves.
    if (sight.inRange) {
      const dist = Math.max(1, Math.hypot(sight.dx, sight.dy));
      this.vx = (sight.dx / dist) * this.speed;
      this.vy = (sight.dy / dist) * this.speed;
    } else {
      this.vx *= 0.9;
      this.vy *= 0.9;
    }
    this.x += this.vx * _ts;
    this.y += this.vy * _ts;
    this.x = Math.max(bounds.left, Math.min(this.x, bounds.right - this.width));

    const cx = this.x + this.width / 2, cy = this.y + this.height / 2;
    const pcx = player.x + player.width / 2, pcy = player.y + player.height / 2;
    const distToPlayer = Math.hypot(pcx - cx, pcy - cy);
    if (player.phaseDashing && distToPlayer <= WRAITH_FIELD_RADIUS) {
      player.phaseDashing = false;
      player.phaseDashTimer = 0;
      player.vx *= 0.3;
      player.invincibleTimer = 0;
      player.takeDamage(1);
    }

    this.flashTimer++;
  }

  getAttackHitbox() { return null; } // no melee attack of its own — the field is the whole point

  draw(ctx) {
    if (this.dead) ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 20);

    // Stasis field ring — the actual mechanic, drawn first so the body reads on top.
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y + this.height / 2, WRAITH_FIELD_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha *= 0.55; // semi-transparent per expansion.md's description
    ctx.fillStyle = this.flashTimer < 6 ? '#ffffff' : '#818cf8';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.globalAlpha = this.dead ? Math.max(0, 1 - this.deathTimer / 20) : 1;
  }
}

// ── Deflector Drone (expansion.md 2.3 #31) — Shard Shot counter ────────────
// Hovers passively, shield always faces the player. A Shard Shot that hits
// the shielded side is reflected back (see game.js's projectile/enemy
// collision loop for the actual reflection — that array lives in game.js,
// not here, so the counter can't be fully self-contained the way the two
// Phase-Dash counters above are).
const DEFLECTOR_HOVER_SPEED = 0.5;
const DEFLECTOR_HEALTH = 5;

class DeflectorDrone extends Enemy {
  constructor(x, y) {
    super(x, y, 'deflector_drone');
    this.ignoreVertical = true;
    this.health = DEFLECTOR_HEALTH;
    this.speed = DEFLECTOR_HOVER_SPEED; // enemy_editor.html's Speed slider reads/writes this.speed
    this.hoverPhase = Math.random() * Math.PI * 2;
    this.hoverCenterY = y;
  }

  // Is `px` (a projectile's x) approaching from this drone's currently
  // shielded side? Shield always faces the player, so it's just "is the
  // shot coming from the same side the player is on."
  shieldFacesPoint(px) {
    return (px < this.x + this.width / 2) === (this.facing === -1);
  }

  update(player, bounds, echoes) {
    const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;
    if (this.dead) { this.deathTimer++; return; }

    if (this.hitStun > 0) {
      this.hitStun--;
      this.x += this.vx * _ts;
      this.y += this.vy * _ts;
      this.flashTimer = Math.max(-1, this.flashTimer - 1);
      return;
    }

    const sight = this.canSeePlayer(player);
    this.facing = sight.dx > 0 ? 1 : -1; // shield always tracks the player, no deadzone

    // Gentle bob in place — passive, doesn't chase.
    this.hoverPhase += 0.03 * _ts;
    this.y = this.hoverCenterY + Math.sin(this.hoverPhase) * 12;
    this.x += (sight.inRange ? this.facing * this.speed * 0.2 : 0) * _ts;
    this.x = Math.max(bounds.left, Math.min(this.x, bounds.right - this.width));

    this.flashTimer++;
  }

  getAttackHitbox() { return null; } // no melee — purely a ranged-combat obstacle

  draw(ctx) {
    if (this.dead) ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 20);
    ctx.fillStyle = this.flashTimer < 6 ? '#ffffff' : '#67e8f9';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Shield — a bright arc on whichever side currently faces the player.
    const shieldX = this.facing === -1 ? this.x - 3 : this.x + this.width - 3;
    ctx.fillStyle = 'rgba(103, 232, 249, 0.7)';
    ctx.fillRect(shieldX, this.y - 2, 6, this.height + 4);
    ctx.globalAlpha = 1;
  }
}

// ── Mirror Sprite (expansion.md §2, enemy #22) — Mirror Veil flavor enemy ──
// Only tangible when the player is facing it; attacks from behind (i.e.
// while the player is NOT facing it) otherwise. Reuses base Enemy attack AI
// via super.update(), then overrides tangibility afterward.
const SPRITE_HEALTH = 4;

class MirrorSprite extends Enemy {
  constructor(x, y) {
    super(x, y, 'mirror_sprite');
    this.health = SPRITE_HEALTH;
    this.tangible = false;
  }

  update(player, bounds, echoes) {
    super.update(player, bounds, echoes);
    if (this.dead) return;
    // Tangible only when the player is facing toward this sprite.
    const towardSprite = (this.x > player.x) === (player.facing === 1);
    this.tangible = towardSprite;
  }

  takeDamage(dmg, sourceX, attackDir) {
    if (!this.tangible) return; // "Face it directly to make it tangible"
    super.takeDamage(dmg, sourceX, attackDir);
  }

  getAttackHitbox() {
    // Can still attack while intangible — that's the whole threat ("attacks
    // from behind when you're not facing it").
    if (!this.attacking || this.attackTimer > 15) return null;
    return {
      x: this.facing === 1 ? this.x + this.width : this.x - 30,
      y: this.y + 4,
      width: 30,
      height: 24
    };
  }

  draw(ctx) {
    if (this.dead) ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 20);
    ctx.globalAlpha *= this.tangible ? 1 : 0.3;
    ctx.fillStyle = this.flashTimer < 6 ? '#ffffff' : (this.tangible ? '#c084fc' : '#6b5b8a');
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#0a0a0f';
    const eyeX = this.facing === 1 ? this.x + 18 : this.x + 4;
    ctx.fillRect(eyeX, this.y + 8, 8, 6);
    ctx.globalAlpha = this.dead ? Math.max(0, 1 - this.deathTimer / 20) : 1;

    if (this.windingUp) {
      const progress = 1 - this.windUpTimer / ENEMY_WINDUP_FRAMES;
      ctx.fillStyle = `rgba(255, 120, 40, ${0.4 + progress * 0.6})`;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', this.x + this.width / 2, this.y - 6);
      ctx.textAlign = 'left';
    }
    ctx.globalAlpha = 1;
  }
}

// ── Echo Stalker (expansion.md §2, enemy #2) — Mirror Veil flavor enemy ────
// Teleports to just behind the player the moment a Phase Dash ends. Reuses
// Stutterer's teleport-blink visual convention (decoy fade, blink flicker).
const STALKER_BLINK_COOLDOWN = 45;
const STALKER_HEALTH = 4;

class EchoStalker extends Enemy {
  constructor(x, y) {
    super(x, y, 'echo_stalker');
    this.health = STALKER_HEALTH;
    this.blinking = false;
    this.blinkTimer = 0;
    this.blinkCooldown = 0;
    this.wasDashing = false;
  }

  update(player, bounds, echoes) {
    const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;
    if (this.dead) { this.deathTimer++; return; }

    if (this.blinkCooldown > 0) this.blinkCooldown -= _ts;
    if (this.blinkTimer > 0) { this.blinkTimer -= _ts; if (this.blinkTimer <= 0) this.blinking = false; }

    // The moment a Phase Dash ends, teleport to just behind the player's new facing.
    if (this.wasDashing && !player.phaseDashing && this.blinkCooldown <= 0) {
      const behindDir = -player.facing;
      this.x = player.x + behindDir * (player.width + 10);
      this.y = player.y;
      this.blinking = true;
      this.blinkTimer = 15;
      this.blinkCooldown = STALKER_BLINK_COOLDOWN;
      if (typeof spawnParticlesAt !== 'undefined') spawnParticlesAt(this.x + this.width / 2, this.y + this.height / 2, '#a78bfa', 6);
    }
    this.wasDashing = player.phaseDashing;

    const sight = this.canSeePlayer(player);
    if (Math.abs(sight.dx) > ENEMY_FACING_DEADZONE) this.facing = sight.dx > 0 ? 1 : -1;
    this.vx = 0; // doesn't chase on foot — positioning is entirely via the teleport above

    if (sight.verticalOk && Math.abs(sight.dx) < ENEMY_ATTACK_RANGE && this.attackCooldown <= 0 && !this.windingUp && !this.attacking) {
      this.windingUp = true;
      this.windUpTimer = ENEMY_WINDUP_FRAMES;
    }
    if (this.windingUp) {
      this.windUpTimer -= _ts;
      if (this.windUpTimer <= 0) {
        this.windingUp = false;
        this.attacking = true;
        this.attackTimer = 20;
        this.attackCooldown = ENEMY_ATTACK_COOLDOWN;
      }
    }
    if (this.attacking) { this.attackTimer -= _ts; if (this.attackTimer <= 0) this.attacking = false; }
    if (this.attackCooldown > 0) this.attackCooldown -= _ts;
    if (this.attackCooldown < 0) this.attackCooldown = 0;

    this.grounded = false;
    this.vy += GRAVITY * _ts;
    this.y += this.vy * _ts;
    resolveEnemyPhysics(this, bounds, _ts); // shared resolver — see physics.js
    this.flashTimer++;
  }

  draw(ctx) {
    if (this.dead) ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 20);
    if (this.blinking && this.blinkTimer % 4 < 2) { ctx.globalAlpha = 1; return; }

    ctx.fillStyle = this.flashTimer < 6 ? '#ffffff' : (this.windingUp ? '#e9d5ff' : '#7c3aed');
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#0a0a0f';
    const eyeX = this.facing === 1 ? this.x + 18 : this.x + 4;
    ctx.fillRect(eyeX, this.y + 8, 8, 6);

    if (this.windingUp) {
      const progress = 1 - this.windUpTimer / ENEMY_WINDUP_FRAMES;
      ctx.fillStyle = `rgba(255, 120, 40, ${0.4 + progress * 0.6})`;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', this.x + this.width / 2, this.y - 6);
      ctx.textAlign = 'left';
    }
    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FracturedSlime — summoned miniboss by the Fractured King
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
          } else if (this.grounded) {
            this.state = 'hopping';
            this.stateTimer = 20;
            this.vy = -7;
            this.vx = this.facing * SLIME_SPEED;
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
    this.vy += GRAVITY * _ts;
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

class CrystalSentinel {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 32;
    this.height = 40;
    this.facing = -1;
    this.grounded = false;
    this.health = SENTINEL_HEALTH;
    this.maxHealth = SENTINEL_HEALTH;
    this.shieldHp = SENTINEL_SHIELD_HP;
    this.maxShieldHp = SENTINEL_SHIELD_HP;
    this.shieldRegenTimer = 0;
    this.shieldBroken = false;
    this.shieldBreakTimer = 0;
    this.vx = 0;
    this.vy = 0;
    this.flashTimer = 0;
    this.dead = false;
    this.deathTimer = 0;
    this.speed = SENTINEL_SPEED; // enemy_editor.html's Speed slider reads/writes this.speed
    this.attackCooldown = SENTINEL_ATTACK_COOLDOWN;
    this.windingUp = false;
    this.windUpTimer = 0;
    this.attacking = false;
    this.attackTimer = 0;
    this.distractionTimer = 0;
    this.distractionTarget = null;
    this.patrolCenterX = x;
    this.patrolRange = 150;
    this.stunTimer = 0; // parry stun
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }
  
  getAttackHitbox() {
    if (!this.attacking || this.attackTimer > 15) return null;
    return {
      x: this.facing === 1 ? this.x + this.width : this.x - 30,
      y: this.y + 4,
      width: 30,
      height: this.height - 8
    };
  }

  takeDamage(amount, sourceX, sourceType) {
    if (this.dead) return;

    const hitFromFront = (sourceX < this.x && this.facing === -1) ||
                         (sourceX > this.x + this.width && this.facing === 1);

    // Shield blocks melee from front; ranged pierces through
    if (!this.shieldBroken && hitFromFront && sourceType !== 'ranged') {
      let shieldDamage = 1;
      if (sourceType === 'ranged') shieldDamage = 2; // (not used here, but kept)
      this.shieldHp -= shieldDamage;
      this.flashTimer = 10;
      if (this.shieldHp <= 0) {
        this.shieldBroken = true;
        this.shieldBreakTimer = 90;
        this.shieldHp = 0;
        if (typeof spawnParticles !== 'undefined')
          spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#2dd4bf', 12);
        if (typeof SFX !== 'undefined') SFX.shardHit();
      } else {
        if (typeof SFX !== 'undefined') SFX.shardHit();
      }
      return;
    }

    // Health damage
    this.health -= amount;
    this.flashTimer = 6;
    if (sourceX !== undefined) {
      this.vx = (this.x > sourceX ? 1 : -1) * 3;
      this.vy = -2;
    }
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

    // Shield regen
    if (this.shieldBroken) {
      this.shieldBreakTimer -= _ts;
      if (this.shieldBreakTimer <= 0) {
        this.shieldBroken = false;
        this.shieldHp = this.maxShieldHp;
        if (typeof spawnParticles !== 'undefined')
          spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#67e8f9', 6);
      }
    } else if (this.shieldHp < this.maxShieldHp) {
      this.shieldRegenTimer -= _ts;
      if (this.shieldRegenTimer <= 0) {
        this.shieldHp = Math.min(this.maxShieldHp, this.shieldHp + 1);
        this.shieldRegenTimer = 180;
      }
    } else {
      this.shieldRegenTimer = 0;
    }

    // Distraction
    if (this.distractionTimer > 0) {
      this.distractionTimer -= _ts;
      if (this.distractionTimer <= 0) this.distractionTarget = null;
      this.flashTimer++;
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
      this.windingUp = false;
      this.attacking = false;
      this.flashTimer++;
      return;
    }

    const dx = player.x - this.x;
    this.facing = dx > 0 ? 1 : -1;
    const dist = Math.abs(dx);
    const idealDist = 200;

    if (dist > idealDist + 50) {
      this.vx += (this.facing * 0.05) * _ts;
    } else if (dist < idealDist - 50) {
      this.vx -= (this.facing * 0.05) * _ts;
    } else {
      this.vx *= 0.9;
    }
    const maxSpeed = this.speed * (this.shieldBroken ? 0.4 : 1.0);
    this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));

    const dy = player.y - this.y;
    if (Math.abs(dy) > 40) {
      this.vy += Math.sign(dy) * 0.04 * _ts;
    } else {
      this.vy *= 0.9;
    }
    this.vy = Math.max(-1.5, Math.min(1.5, this.vy));

    this.x += this.vx * _ts;
    this.y += this.vy * _ts;

    // Clamp with safety
    if (bounds && bounds.left !== undefined && bounds.right !== undefined) {
      this.x = Math.max(bounds.left + 10, Math.min(this.x, bounds.right - this.width - 10));
    }
    if (bounds && bounds.groundY !== undefined) {
      this.y = Math.max(20, Math.min(this.y, bounds.groundY - 40));
    }

    // Attack
    if (this.attackCooldown > 0) this.attackCooldown -= _ts;
    if (this.attackCooldown < 0) this.attackCooldown = 0;

    if (dist < 400 && this.attackCooldown <= 0 && !this.windingUp && !this.attacking && !this.shieldBroken) {
      this.windingUp = true;
      this.windUpTimer = 35;
    }

    if (this.windingUp) {
      this.windUpTimer -= _ts;
      this.vx *= 0.9;
      if (this.windUpTimer <= 0) {
        this.windingUp = false;
        this.attacking = true;
        this.attackTimer = 20;
        this.attackCooldown = SENTINEL_ATTACK_COOLDOWN;
        this.fireProjectile(player);
      }
    }

    if (this.attacking) {
      this.attackTimer -= _ts;
      if (this.attackTimer <= 0) this.attacking = false;
    }

    this.flashTimer++;
  }

  fireProjectile(player) {
    if (!CrystalSentinel.projectiles) CrystalSentinel.projectiles = [];
    const targetX = player.x + player.width / 2;
    const targetY = player.y + player.height / 2;
    const startX = this.x + this.width / 2;
    const startY = this.y + this.height / 2;

    const proj = {
      x: startX - 6,
      y: startY - 6,
      width: 12,
      height: 12,
      vx: 0,
      vy: 0,
      targetX: targetX,
      targetY: targetY,
      speed: 3.5,
      life: 120,
      alive: true,
      type: 'sentinel',
      color: '#2dd4bf',
      homingStrength: 0.03
    };
    CrystalSentinel.projectiles.push(proj);
    if (typeof SFX !== 'undefined') SFX.shardShot();
  }

  draw(ctx) {
    if (this.dead) {
      ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 30);
    }

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    const pulse = Math.sin(this.flashTimer * 0.05) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(45, 212, 191, ${0.1 * pulse})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fill();

    if (!this.shieldBroken && this.shieldHp > 0) {
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

    const color = this.flashTimer < 6 ? '#ffffff' :
                  this.shieldBroken ? '#4ade80' :
                  '#2dd4bf';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, this.y);
    ctx.lineTo(this.x + this.width, cy);
    ctx.lineTo(cx, this.y + this.height);
    ctx.lineTo(this.x, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.dead ? '#1a3a2e' : '#a7f3d0';
    ctx.beginPath();
    ctx.moveTo(cx, this.y + 12);
    ctx.lineTo(this.x + this.width - 10, cy);
    ctx.lineTo(cx, this.y + this.height - 12);
    ctx.lineTo(this.x + 10, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0a0a0f';
    const eyeX = this.facing === 1 ? cx + 4 : cx - 8;
    ctx.fillRect(eyeX, cy - 3, 6, 6);
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.facing === 1 ? eyeX + 3 : eyeX - 1, cy - 2, 2, 2);

    if (this.windingUp) {
      const progress = 1 - this.windUpTimer / 35;
      const ringRadius = 20 + progress * 40;
      ctx.strokeStyle = `rgba(251, 191, 36, ${0.3 + progress * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = `rgba(251, 191, 36, ${0.5 + progress * 0.5})`;
      ctx.font = `bold ${10 + Math.round(progress * 4)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('⚠', cx, this.y - 10);
      ctx.textAlign = 'left';
    }

    ctx.globalAlpha = 1;
  }

  static drawProjectiles(ctx) {
    if (!CrystalSentinel.projectiles) return;
    for (const p of CrystalSentinel.projectiles) {
      const alpha = p.life / 120;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#2dd4bf';
      ctx.shadowColor = '#2dd4bf';
      ctx.shadowBlur = 10;
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  static updateProjectiles(player) {
    if (!CrystalSentinel.projectiles) return;
    const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;
    for (const p of CrystalSentinel.projectiles) {
      if (!p.alive) continue;
      const dx = p.targetX - (p.x + p.width / 2);
      const dy = p.targetY - (p.y + p.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        p.vx += (dx / dist) * p.homingStrength * _ts;
        p.vy += (dy / dist) * p.homingStrength * _ts;
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > p.speed) {
          p.vx = (p.vx / speed) * p.speed;
          p.vy = (p.vy / speed) * p.speed;
        }
      }
      p.x += p.vx * _ts;
      p.y += p.vy * _ts;
      p.life -= _ts;
      if (p.life <= 0) p.alive = false;

      // ── Hit player ──
      if (p.alive && rectsOverlap(p, player) && player.invincibleTimer <= 0) {
        player.takeDamage(12);
        p.alive = false;
      }
    }
    CrystalSentinel.projectiles = CrystalSentinel.projectiles.filter(p => p.alive);
  }
}

// Initialize the static projectile array
CrystalSentinel.projectiles = [];

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

class BlitzGuard extends Enemy {
  constructor(x, y) {
    super(x, y, 'blitz_guard');
    this.health = BLITZ_HEALTH;
    this.vx = 0;
    this.vy = 0;
    // Override detection to be aggressive – wider range
    this.verticalBand = 80; // can see you from higher/lower
    // Make it fast
    this.speed = BLITZ_SPEED;
    // Short telegraph
    this.windupFrames = BLITZ_WINDUP_FRAMES;
    this.attackCooldown = BLITZ_ATTACK_COOLDOWN;
    // Extra – it sometimes dashes toward you before attacking
    this.chargeTimer = 0;
    this.charging = false;
  }

  update(player, bounds, echoes) {
    // If we're in a real fight, this runs every frame.
    // We reuse the base Enemy.update() logic for hit stun, death, etc.
    // But we override the AI portion.
    const _ts = (typeof gameTimeScale !== 'undefined') ? gameTimeScale : 1.0;

    if (this.dead) { this.deathTimer++; return; }

    // ... (copy distraction, canSeePlayer, etc. from Enemy or just call super)
    // For brevity, we'll just show the critical part – the AI decision

    const sight = this.canSeePlayer(player);
    const dx = sight.dx;
    const dist = Math.abs(dx);

    // ── Reset state if not in range ──
    if (!sight.inRange) {
      this.vx = 0;
      this.windingUp = false;
      this.attacking = false;
      this.charging = false;
      // Patrol logic from base enemy
      const atLedge = this.grounded && !hasFootingAhead(this, bounds, this.patrolDir);
      if (Math.abs(this.x - this.patrolCenter) > this.patrolRange || atLedge) {
        this.patrolDir = this.x > this.patrolCenter ? -1 : 1;
      }
      this.vx = (this.grounded && !hasFootingAhead(this, bounds, this.patrolDir))
        ? 0
        : this.patrolDir * PATROL_SPEED;
      // fall through to physics
    } else {
      // ── IN COMBAT ──
      this.facing = dx > 0 ? 1 : -1;

      // 1. If far away, CHARGE toward player (fast approach) — only if there's
      // actually footing ahead, so the fast approach doesn't dash off a ledge.
      if (dist > 200 && !this.windingUp && !this.attacking && !this.charging &&
          (!this.grounded || hasFootingAhead(this, bounds, this.facing, 40))) {
        this.charging = true;
        this.chargeTimer = 20;
        this.vx = this.facing * 7; // very fast approach
      }

      if (this.charging) {
        this.chargeTimer -= _ts;
        if (this.chargeTimer <= 0) {
          this.charging = false;
          this.vx = 0;
        }
        // Don't attack during charge – just reposition
        // fall through to physics
      } else {
        // 2. In melee range: windup → attack, but FAST
        if (dist < ENEMY_ATTACK_RANGE * 1.2 && this.attackCooldown <= 0 && !this.windingUp && !this.attacking) {
          this.windingUp = true;
          this.windUpTimer = BLITZ_WINDUP_FRAMES;
          this.vx = 0;
        }

        if (this.windingUp) {
          this.windUpTimer -= _ts;
          this.vx = 0;
          if (this.windUpTimer <= 0) {
            this.windingUp = false;
            this.attacking = true;
            this.attackTimer = 16; // active frames
            this.attackCooldown = BLITZ_ATTACK_COOLDOWN;
          }
        }

        if (this.attacking) {
          this.attackTimer -= _ts;
          if (this.attackTimer <= 0) this.attacking = false;
        }

        // 3. Chase if not winding up / attacking
        if (!this.windingUp && !this.attacking && this.attackCooldown > 0) {
          this.vx = (this.grounded && !hasFootingAhead(this, bounds, this.facing)) ? 0 : this.facing * BLITZ_SPEED;
        }
      }
    }

    // ── Physics (same as base Enemy — shared resolver, see physics.js) ──
    this.grounded = false;
    this.vy += GRAVITY * _ts;
    this.x += this.vx * _ts;
    this.y += this.vy * _ts;
    resolveEnemyPhysics(this, bounds, _ts);

    this.flashTimer++;
  }

  // Visual: red‑tinted, glowing with motion trails during charge
  draw(ctx) {
    if (this.dead) {
      ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 20);
    }

    const color = this.flashTimer < 6 ? '#ffffff' :
                  this.charging ? '#fb923c' :
                  '#ef4444'; // bright red

    ctx.fillStyle = color;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Charge effect: trail behind
    if (this.charging) {
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.4 - i * 0.1;
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(this.x - this.vx * i * 1.2, this.y, this.width, this.height);
      }
      ctx.globalAlpha = 1;
    }

    // Eye
    ctx.fillStyle = '#0a0a0f';
    const eyeX = this.facing === 1 ? this.x + 18 : this.x + 4;
    ctx.fillRect(eyeX, this.y + 8, 8, 6);

    // Windup telegraph – VERY short, so just a tiny flash
    if (this.windingUp) {
      ctx.strokeStyle = `rgba(255, 200, 200, ${0.3 + (1 - this.windUpTimer / BLITZ_WINDUP_FRAMES) * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 20, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Colossus Core — Crag of the Colossus miniboss (crag_warden). A rock-shelled
// construct that only Charged (heavy) attacks can damage — a normal hit
// bounces off with a spark, exactly like the region's destructible rubble
// walls. Single telegraphed charge attack, no phases — reskin of "The
// Fractured King's Guard" (expansion.md 4.1), chosen because it's the most
// "basic, no ability required beyond Charged Attack" fight on the miniboss
// roster, which fits a region's first miniboss. Reward: +1 Max Health,
// applied by game.js when `defeatedMinibosses['colossus_core']` flips true.
// ─────────────────────────────────────────────────────────────────────────────
const COLOSSUS_HEALTH = 20;
const COLOSSUS_SPEED = 3.5;
const COLOSSUS_DAMAGE = 2;

class ColossusCore {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 64;
    this.height = 64;
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
    this.state = 'idle';  // idle -> telegraph -> charging -> idle
    this.stateTimer = 90;
    this.attackCooldown = 0;
    this.stunTimer = 0; // parry stun
  }

  getBounds() { return { x: this.x, y: this.y, width: this.width, height: this.height }; }

  getAttackHitbox() {
    if (this.state !== 'charging') return null;
    return {
      x: this.facing === 1 ? this.x + this.width : this.x - 20,
      y: this.y + 8,
      width: 20,
      height: this.height - 16,
    };
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
        this.vx *= 0.85;
        if (this.stateTimer <= 0) {
          if (this.attackCooldown <= 0 && dist < 500 && this.grounded) {
            this.state = 'telegraph';
            this.stateTimer = 40; // visible windup before the charge — see draw()
            this.vx = 0;
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
    }

    this.grounded = false;
    this.vy += GRAVITY * _ts;
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
  }

  draw(ctx) {
    if (this.dead) {
      ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 30);
    }

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    // Body — rust/stone shell, cracks appear as health drops
    const healthFrac = this.health / this.maxHealth;
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
    params: { speed: 1.5, patrolSpeed: 0.7 }, // patrol RANGE lives in def.stats.patrolRange (ComposedEnemy ctor), not here
    run(enemy, player, bounds, _ts, sight) {
      const p = enemy.movement;
      if (sight.inRange) {
        if (enemy.grounded && !hasFootingAhead(enemy, bounds, enemy.facing)) enemy.vx = 0;
        else enemy.vx = enemy.facing * p.speed;
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
    },
  },

  // Flies, ignores gravity. Three sub-modes via `mode`:
  //   'approach'          — drifts toward the player when sighted (Anchor Wraith style)
  //   'maintain_distance' — hovers, bobs in place, nudges toward an ideal distance (Deflector Drone style)
  //   'stationary_bob'    — bobs in place only, never moves horizontally
  hover: {
    params: { mode: 'approach', speed: 0.8, idealDistance: 200, bobAmplitude: 12, bobSpeed: 0.03 },
    run(enemy, player, bounds, _ts, sight) {
      const p = enemy.movement;
      enemy._mState.bobPhase = (enemy._mState.bobPhase || Math.random() * Math.PI * 2) + p.bobSpeed * _ts;
      if (enemy._mState.baseY === undefined) enemy._mState.baseY = enemy.y;

      if (p.mode === 'approach') {
        if (sight.inRange) {
          const dist = Math.max(1, Math.hypot(sight.dx, sight.dy));
          enemy.vx = (sight.dx / dist) * p.speed;
          enemy.vy = (sight.dy / dist) * p.speed;
        } else {
          enemy.vx *= 0.9; enemy.vy *= 0.9;
        }
        enemy.x += enemy.vx * _ts;
        enemy.y += enemy.vy * _ts;
      } else if (p.mode === 'maintain_distance') {
        const dist = Math.abs(sight.dx);
        if (dist > p.idealDistance + 50) enemy.vx = enemy.facing * p.speed;
        else if (dist < p.idealDistance - 50) enemy.vx = -enemy.facing * p.speed;
        else enemy.vx *= 0.5;
        enemy.x += enemy.vx * _ts;
        enemy.y = enemy._mState.baseY + Math.sin(enemy._mState.bobPhase) * p.bobAmplitude;
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
        const behindDir = -player.facing;
        enemy.x = player.x + behindDir * (player.width + p.blinkDistance);
        enemy.y = player.y;
        enemy.x = Math.max(bounds.left, Math.min(enemy.x, bounds.right - enemy.width));
        enemy._mState.blinkCooldown = p.cooldown;
        enemy._blinkFlash = 15;
        if (typeof spawnParticlesAt !== 'undefined') spawnParticlesAt(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#a78bfa', 6);
      }
      if (enemy._blinkFlash > 0) enemy._blinkFlash -= _ts;
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

  // Telegraphed dash-lunge (generalizes Void Lancer's charge into a
  // configurable behavior). While charging, the enemy's own body becomes
  // the "hitbox" (via getHitbox returning its bounds) so the generic
  // enemy-attack-hits-player loop applies this attack's own damage/knockback
  // instead of the flat default contact damage.
  dash_charge: {
    params: { range: 260, windupFrames: 30, activeFrames: 20, cooldown: 130,
              damage: 2, chargeSpeed: 9, knockbackX: 6, knockbackY: -4, knockbackHitStun: 12 },
    onFire(enemy, player, atkDef) {
      enemy.vx = enemy.facing * atkDef.chargeSpeed;
    },
    onTick(enemy) { /* velocity already set at onFire; gravity/collision handled by ComposedEnemy's own physics step */ },
    onEnd(enemy) { enemy.vx = 0; },
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

  ranged_projectile: {
    // pattern: 'straight' | 'homing' | 'arc' | 'bounce' | 'spread' | 'piercing'
    params: { range: 350, windupFrames: 35, activeFrames: 20, cooldown: 100, damage: 1,
              projectileSpeed: 3.5, pattern: 'homing', projectileCount: 3, spreadAngle: 30,
              maxBounces: 2, color: '#2dd4bf' },
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
        enemy._aState.tick = atkDef.tickCooldown;
        return;
      }
      if (enemy._aState.tick <= 0 && player.invincibleTimer <= 0) {
        player.takeDamage(atkDef.damage);
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
};

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
  },
  shard_shot: {
    // 'reflect' doesn't need a per-frame check — it just sets
    // enemy.reflectsProjectiles = true at construction (see ComposedEnemy
    // ctor), same flag shield_reflect uses, checked by game.js's projectile
    // collision loop. Listed here for the editor's dropdown only.
    reflect: { params: {}, check() {} },
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
  // graviton_surge: not implemented — the ability itself doesn't exist in
  // the game yet (story.md/expansion.md, still unbuilt). Listed as a no-op
  // option in the editor for forward-compat only; do not wire real logic
  // here until Graviton Surge ships.
  graviton_surge: { null_field: { params: {}, check() {} } },
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

class ComposedEnemy extends Enemy {
  constructor(x, y, def) {
    super(x, y, def.id || 'composed');
    this.def = def;
    this.maxHealth = def.stats?.health ?? 4;
    this.health = this.maxHealth;
    this.patrolRange = def.stats?.patrolRange ?? 120;
    this.patrolCenter = x;
    this.verticalBand = def.stats?.verticalBand ?? null;
    this.ignoreVertical = !!def.stats?.ignoreVertical;
    this.knockbackResistance = Math.max(0, Math.min(1, def.stats?.knockbackResistance ?? 0));
    this.stunResistance = Math.max(0, Math.min(1, def.stats?.stunResistance ?? 0));
    this.color = def.color || '#f87171';

    this.movement = { ...MOVEMENT_BEHAVIORS[def.movement?.type]?.params, ...def.movement }; // per-instance clone — safe for rage to mutate
    this._movementFlies = def.movement?.type === 'hover' || def.movement?.type === 'teleport_blink';
    this._mState = {};

    // Backward compat: old single `def.attack` becomes a 1-entry list.
    const attacksInput = def.attacks || (def.attack ? [def.attack] : [{ type: 'melee_swing' }]);
    this.attacks = attacksInput.map((a) => ({ ...ATTACK_BEHAVIORS[a.type]?.params, weight: 1, minRange: 0, ...a }));
    this.attackSelection = def.attackSelection || 'weighted';
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

    this.onDeathDef = { type: 'none', ...ON_DEATH_EFFECTS[def.onDeath?.type]?.params, ...def.onDeath };
    this.rageDef = def.rage || null;
    this._raged = false;

    this._blinkFlash = 0;
    this._lastSightY = y;
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
    const parryCounter = this.counters.find((c) => c.ability === 'melee_parry' && c.effect === 'stun_and_double_damage');
    const wasStunned = parryCounter && this.stunTimer > 0;
    const finalDmg = wasStunned ? dmg * 2 : dmg;

    this.health -= finalDmg;
    this.flashTimer = 0;
    this.windingUp = false; this.windUpTimer = 0;
    this.stunTimer = 0;
    this.hitStun = Math.round(14 * (1 - this.stunResistance));
    this.registerHitForBreakout(); // anti-juggle bookkeeping (no-op without defense.breakout)

    if (sourceX !== undefined) {
      const dir = (this.x > sourceX ? 1 : -1);
      const kb = 1 - this.knockbackResistance;
      if (attackDir === 'up') { this.vx = dir * 3 * kb; this.vy = -12 * kb; this.juggling = true; }
      else if (attackDir === 'down') { this.vx = dir * 6 * kb; this.vy = 8 * kb; }
      else { this.vx = dir * 5 * kb; this.vy = -4 * kb; if (!this.grounded) this.juggling = true; }
    }
    if (this.health <= 0 && !this.dead) {
      this.health = 0; this.dead = true;
      const effect = ON_DEATH_EFFECTS[this.onDeathDef.type];
      if (effect) effect.apply(this, this.onDeathDef);
    }
  }

  _decideActiveAttack(player, sight) {
    if (!this._activeIdxList.length) return null;
    const dist = Math.abs(sight.dx);
    const ready = this._activeIdxList.filter((i) => {
      if (this._attackCooldowns[i] > 0) return false;
      if (!sight.verticalOk) return false;
      const a = this.attacks[i];
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
    const total = ready.reduce((s, i) => s + (this.attacks[i].weight || 1), 0);
    let r = Math.random() * total;
    for (const i of ready) { r -= (this.attacks[i].weight || 1); if (r <= 0) return i; }
    return ready[ready.length - 1];
  }

  _checkCounters(player) {
    for (const c of this.counters) {
      const eff = COUNTER_EFFECTS[c.ability]?.[c.effect];
      if (eff) eff.check(this, player, { ...eff.params, ...c });
    }
  }

  update(player, bounds, echoes) {
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
      return;
    }

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

    // Hit stun — same physics-during-stun pattern as the base Enemy class.
    if (this.hitStun > 0) {
      this.hitStun--;
      if (!this._movementFlies) {
        this.grounded = false;
        this.vy += GRAVITY * _ts;
      }
      this.x += this.vx * _ts;
      this.y += this.vy * _ts;
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

    this._checkCounters(player);

    // Passive attacks (contact_field, shield_reflect) run unconditionally.
    for (const i of this._passiveIdxList) {
      ATTACK_BEHAVIORS[this.attacks[i].type].run(this, player, bounds, _ts, sight, this.attacks[i]);
    }

    // Active-attack selection state machine.
    if (this._activeAttack === null) {
      const idx = this._decideActiveAttack(player, sight);
      if (idx !== null) {
        this._activeAttack = idx;
        this.windingUp = true;
        this.windUpTimer = this.attacks[idx].windupFrames ?? 20;
        this.vx = 0;
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
        behavior.onTick?.(this, player, atkDef, _ts);
        this.attackTimer -= _ts;
        if (this.attackTimer <= 0) {
          this.attacking = false;
          behavior.onEnd?.(this, player, atkDef);
          this._attackCooldowns[idx] = atkDef.cooldown ?? 60;
          this._activeAttack = null;
        }
      }
    }
    for (let i = 0; i < this._attackCooldowns.length; i++) if (this._attackCooldowns[i] > 0) this._attackCooldowns[i] -= _ts;

    // Movement only runs when no active attack is winding up/firing.
    if (this._activeAttack === null) {
      MOVEMENT_BEHAVIORS[this.def.movement?.type]?.run(this, player, bounds, _ts, sight)
        ?? MOVEMENT_BEHAVIORS.ground_chase.run(this, player, bounds, _ts, sight);
    }

    // Physics — grounded enemies use the same gravity/platform-collision
    // pattern as the base Enemy class; flying ones (hover/teleport_blink)
    // opt out entirely, since their behavior already sets this.y directly.
    if (!this._movementFlies) {
      // Zero horizontal velocity when airborne — except mid-attack (dash_charge
      // needs to keep its burst velocity even if it runs off a ledge while charging).
      if (!this.grounded && !this.juggling && this._activeAttack === null) this.vx = 0;
      this.grounded = false;
      this.vy += GRAVITY * _ts;
      this.x += this.vx * _ts;
      this.y += this.vy * _ts;
      const phys = resolveEnemyPhysics(this, bounds, _ts); // shared resolver — see physics.js

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
        gravity: atkDef.pattern === 'arc',
        bounces: atkDef.pattern === 'bounce' ? atkDef.maxBounces : 0,
        piercing: atkDef.pattern === 'piercing',
        damage: atkDef.damage, life: 120, alive: true, color: atkDef.color,
      };
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
      if (proj.gravity) proj.vy += 0.15 * _ts;
      proj.x += proj.vx * _ts;
      proj.y += proj.vy * _ts;
      proj.life -= _ts;
      if (proj.life <= 0) proj.alive = false;

      // Bounce off platforms instead of just dying on wall contact.
      if (proj.alive && proj.bounces > 0 && area) {
        for (const plat of area.platforms) {
          if (plat.destructible && plat.hp <= 0) continue;
          if (rectsOverlap(proj, { x: plat.x, y: plat.y, width: plat.w, height: plat.h })) {
            proj.vy *= -0.8; proj.vx *= 0.9;
            proj.bounces--;
            break;
          }
        }
      }

      if (proj.alive && rectsOverlap(proj, player) && player.invincibleTimer <= 0) {
        player.takeDamage(proj.damage);
        if (!proj.piercing) proj.alive = false;
      }
    }
    ComposedEnemy.projectiles = ComposedEnemy.projectiles.filter((p) => p.alive);
  }

  static drawProjectiles(ctx) {
    if (!ComposedEnemy.projectiles) return;
    for (const p of ComposedEnemy.projectiles) {
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

    if (this.reflectsProjectiles) {
      const shieldX = this.facing === -1 ? this.x - 3 : this.x + this.width - 3;
      ctx.fillStyle = 'rgba(103, 232, 249, 0.7)';
      ctx.fillRect(shieldX, this.y - 2, 6, this.height + 4);
    }

    if (this._blinkFlash > 0 && Math.floor(this._blinkFlash) % 4 < 2) { ctx.globalAlpha = 1; return; }

    const countering = this.isCountering();
    ctx.fillStyle = this.flashTimer < 6 ? '#ffffff' : (countering ? '#60a5fa' : (this.windingUp ? '#fbbf24' : this.color));
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#0a0a0f';
    const eyeX = this.facing === 1 ? this.x + 18 : this.x + 4;
    ctx.fillRect(eyeX, this.y + 8, 8, 6);

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
  composed: ComposedEnemy,
};

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