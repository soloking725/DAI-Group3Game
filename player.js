// Player character
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const MOVE_SPEED = 4;
const DUCK_SPEED = 2;
const DASH_SPEED = 12;
const DASH_DURATION = 8;
const DASH_COOLDOWN = 30;
const MAX_HEALTH = 6;
const INVINCIBLE_FRAMES = 150;
const COYOTE_FRAMES = 6; // 6 frames (~100ms at 60fps) – the sweet spot

// Attack
const ATTACK_WIDTH = 40;
const ATTACK_HEIGHT = 30;
const ATTACK_DURATION = 12;
const ATTACK_COOLDOWN = 18;
const ATTACK_DAMAGE = 1;

// Stillpoint (time-slow)
const FRACTURE_MAX = 3;
const FRACTURE_DRAIN_RATE = 60; // frames per pip drained while active

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 32;
    this.vx = 0;
    this.vy = 0;
    this.health = MAX_HEALTH;
    this.facing = 1;
    this.grounded = false;
    this.attacking = false;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.dashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.invincibleTimer = 0;
    this.flashTimer = 0;
    this.coyoteTimer = 0;

    this.phaseDashing = false;
    this.phaseDashTimer = 0;
    this.aimingUp = false;
    this.shardShotFired = false;

    // Duck / crouch
    this.ducking = false;
    this.normalHeight = 32;
    this.duckHeight = 16;

    // Stillpoint / Fracture meter
    this.fractureMeter = 0;        // 0-3 pips
    this.fractureDrain = 0;        // sub-pip drain counter
    this.stillpointActive = false;

    // Squash/stretch
    this.justLanded = false;
    this.justLandedTimer = 0;
  }

  // Called by game.js when a melee hit lands
  gainFracture() {
    if (this.fractureMeter < FRACTURE_MAX) {
      this.fractureMeter++;
      if (typeof SFX !== 'undefined') SFX.fractureGain();
    }
  }

  update(bounds, platforms) {
    // ── Coyote Timer ────────────────────────────────────────────────────────
    if (this.grounded) {
      this.coyoteTimer = COYOTE_FRAMES;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer--;
    }

    this.aimingUp = isPressed('ArrowUp') || isPressed('KeyW');

    // ── Stillpoint toggle (Q) ──────────────────────────────────────────────
    if ((wasJustPressed('KeyQ') || wasJustPressed('KeyU')) && abilityState.hasStillpoint) {
      if (!this.stillpointActive && this.fractureMeter > 0) {
        this.stillpointActive = true;
        if (typeof SFX !== 'undefined') SFX.stillpointActivate();
      } else if (this.stillpointActive) {
        this.stillpointActive = false;
        if (typeof SFX !== 'undefined') SFX.stillpointEnd();
      }
    }

    // Drain fracture meter while Stillpoint is active
    if (this.stillpointActive) {
      this.fractureDrain++;
      if (this.fractureDrain >= FRACTURE_DRAIN_RATE) {
        this.fractureDrain = 0;
        this.fractureMeter = Math.max(0, this.fractureMeter - 1);
        if (this.fractureMeter === 0) {
          this.stillpointActive = false;
          if (typeof SFX !== 'undefined') SFX.stillpointEnd();
        }
      }
    } else {
      this.fractureDrain = 0; // reset sub-pip counter when idle
    }

    // ── Duck / Crouch ─────────────────────────────────────────────────────
    const wantsDuck = (isPressed('ArrowDown') || isPressed('KeyS')) && this.grounded;
    if (wantsDuck && !this.ducking) {
      // Start ducking: shift y down so feet stay planted
      this.y += this.normalHeight - this.duckHeight;
      this.height = this.duckHeight;
      this.ducking = true;
    } else if (!wantsDuck && this.ducking) {
      // Stand up: shift y up
      this.y -= this.normalHeight - this.duckHeight;
      this.height = this.normalHeight;
      this.ducking = false;
    }

    // ── Movement ───────────────────────────────────────────────────────────
    if (!this.dashing && !this.phaseDashing) {
      const speed = this.ducking ? DUCK_SPEED : MOVE_SPEED;
      if (isPressed('ArrowLeft') || isPressed('KeyA')) {
        this.vx = -speed;
        this.facing = -1;
      } else if (isPressed('ArrowRight') || isPressed('KeyD')) {
        this.vx = speed;
        this.facing = 1;
      } else {
        this.vx *= 0.7;
      }

      // Block jumping while ducking
      if ((wasJustPressed('ArrowUp') || wasJustPressed('KeyW') || wasJustPressed('Space')) && (this.grounded || this.coyoteTimer > 0)) {
        this.vy = JUMP_FORCE;
        this.grounded = false;
        this.coyoteTimer = 0;
        if (typeof SFX !== 'undefined') SFX.jump();
      }
    }

    // ── Regular Dash ────────────────────────────────────────────────────────
    if ((wasJustPressed('ShiftLeft') || wasJustPressed('ShiftRight') || wasJustPressed('KeyX')) &&
        this.dashCooldown <= 0 && !this.dashing) {
      this.dashing = true;
      this.dashTimer = DASH_DURATION;
      this.dashCooldown = DASH_COOLDOWN;
      this.vx = this.facing * DASH_SPEED;
      this.vy = 0;
      if (typeof SFX !== 'undefined') SFX.dash();
    }

    if (this.dashing) {
      this.dashTimer--;
      if (this.dashTimer <= 0) { this.dashing = false; this.vx *= 0.5; }
    }
    if (this.dashCooldown > 0) this.dashCooldown--;

    // ── Phase Dash ──────────────────────────────────────────────────────────
    if ((wasJustPressed('KeyC') || wasJustPressed('KeyK')) &&
        abilityState.hasPhaseDash && abilityState.phaseDashCooldown <= 0 && !this.phaseDashing) {
      this.phaseDashing = true;
      this.phaseDashTimer = PHASE_DASH_DURATION;
      abilityState.phaseDashCooldown = PHASE_DASH_COOLDOWN;
      this.vx = this.facing * PHASE_DASH_SPEED;
      this.vy = 0;
      this.invincibleTimer = PHASE_DASH_DURATION + 5;
      if (typeof SFX !== 'undefined') SFX.phaseDash();
      if (typeof boss !== 'undefined' && boss) boss.notifyPlayerDash();
    }

    if (this.phaseDashing) {
      this.phaseDashTimer--;
      if (this.phaseDashTimer <= 0) { this.phaseDashing = false; this.vx *= 0.4; }
    }

    // ── Attack (blocked during Stillpoint and ducking) ─────────────────────
    if ((wasJustPressed('KeyZ') || wasJustPressed('KeyJ')) &&
        this.attackCooldown <= 0 && !this.stillpointActive && !this.ducking) {
      this.attacking = true;
      this.attackTimer = ATTACK_DURATION;
      this.attackCooldown = ATTACK_COOLDOWN;
      // Attacking cancels Stillpoint (handled above — stillpoint already blocks attack,
      // but if player mashes Z the moment they toggle off, guard here)
      if (typeof SFX !== 'undefined') SFX.attack();
    }

    if (this.attacking) {
      this.attackTimer--;
      if (this.attackTimer <= 0) this.attacking = false;
    }
    if (this.attackCooldown > 0) this.attackCooldown--;

    // ── Shard Shot ─────────────────────────────────────────────────────────
    if ((wasJustPressed('KeyV') || wasJustPressed('KeyN')) &&
        abilityState.hasShardShot && abilityState.shardShotCooldown <= 0) {
      this.shardShotFired = true;
    } else {
      this.shardShotFired = false;
    }

    // ── Physics ─────────────────────────────────────────────────────────────
    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;

    // Platform collision
    this.grounded = false;
    if (platforms) {
      for (const plat of platforms) {
        if (plat.destructible && plat.hp <= 0) continue;
        // Skip top-landing for platforms flagged as walls (e.g. boss arena side walls).
        // Also use prevBottom (position before velocity applied) so a player running
        // into a tall wall never gets snapped to its top surface.
        const prevBottom = (this.y + this.height) - this.vy;
        if (this.x + this.width > plat.x && this.x < plat.x + plat.w) {
          if (!plat.wall &&
              prevBottom <= plat.y + 4 &&
              this.y + this.height > plat.y &&
              this.y + this.height < plat.y + plat.h + 8 &&
              this.vy >= 0) {
            this.y = plat.y - this.height;
            this.vy = 0;
            if (!this.grounded) { this.justLanded = true; this.justLandedTimer = 0; if (typeof SFX !== 'undefined') SFX.land(); }
            this.grounded = true;
          } else if (!plat.wall && this.y < plat.y + plat.h && this.y > plat.y && this.vy < 0) {
            this.y = plat.y + plat.h; this.vy = 0;
          }
        }
        if (this.y + this.height > plat.y + 4 && this.y < plat.y + plat.h) {
          if (this.x + this.width > plat.x && this.x + this.width < plat.x + 10 && this.vx > 0) {
            this.x = plat.x - this.width; this.vx = 0;
          }
          if (this.x < plat.x + plat.w && this.x > plat.x + plat.w - 10 && this.vx < 0) {
            this.x = plat.x + plat.w; this.vx = 0;
          }
        }
      }
    }

    if (this.y + this.height > bounds.groundY) {
      this.y = bounds.groundY - this.height;
      this.vy = 0;
      if (!this.grounded) { this.justLanded = true; this.justLandedTimer = 0; if (typeof SFX !== 'undefined') SFX.land(); }
      this.grounded = true;
    }

    if (this.justLanded) {
      this.justLandedTimer++;
      if (this.justLandedTimer > 10) { this.justLanded = false; this.justLandedTimer = 0; }
    }

    if (this.x < bounds.left) this.x = bounds.left;
    if (this.x + this.width > bounds.right) this.x = bounds.right - this.width;

    if (this.invincibleTimer > 0) { this.invincibleTimer--; this.flashTimer++; }
  }

  getAttackHitbox() {
    if (!this.attacking) return null;
    return {
      x: this.facing === 1 ? this.x + this.width : this.x - ATTACK_WIDTH,
      y: this.y + 4,
      width: ATTACK_WIDTH,
      height: ATTACK_HEIGHT
    };
  }

  takeDamage(dmg) {
    if (this.invincibleTimer > 0) return;
    this.health -= dmg;
    this.invincibleTimer = INVINCIBLE_FRAMES;
    // Stillpoint breaks on taking damage
    if (this.stillpointActive) {
      this.stillpointActive = false;
      if (typeof SFX !== 'undefined') SFX.stillpointEnd();
    }
  }

  draw(ctx) {
    // Invincibility flash — BEFORE any ctx.save() to avoid orphaned saves
    if (this.invincibleTimer > 0 && this.flashTimer % 4 < 2) return;

    ctx.save();
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    ctx.translate(cx, cy);

    if (!this.grounded) {
      const stretch = 1 + Math.min(Math.abs(this.vy) * 0.01, 0.15);
      ctx.scale(1 / stretch, stretch);
    } else if (this.justLanded) {
      const squash = 1 + Math.min(this.justLandedTimer * 0.02, 0.2);
      ctx.scale(squash, 1 / squash);
    } else if (this.ducking) {
      // Slight horizontal stretch when crouching to emphasize low profile
      ctx.scale(1.15, 1);
    }
    ctx.translate(-cx, -cy);

    // ── Stillpoint glow on player body ────────────────────────────────────
    if (this.stillpointActive) {
      const pipFrac = this.fractureMeter / FRACTURE_MAX;
      const pulse = Math.sin(typeof frameCount !== 'undefined' ? frameCount * 0.15 : 0) * 0.2 + 0.8;
      // Outer halo
      ctx.fillStyle = `rgba(103, 232, 249, ${0.12 * pulse})`;
      ctx.fillRect(this.x - 8, this.y - 8, this.width + 16, this.height + 16);
      // Inner ring
      ctx.strokeStyle = `rgba(103, 232, 249, ${0.55 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(this.x - 3, this.y - 3, this.width + 6, this.height + 6);
      ctx.lineWidth = 1;
    }

    // ── Body ─────────────────────────────────────────────────────────────
    const bodyColor = this.stillpointActive ? '#a5f3fc' : '#c4b5fd';
    ctx.fillStyle = bodyColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Glowing chest core (always present, brighter during Stillpoint)
    const coreAlpha = this.stillpointActive ? 0.95 : 0.55;
    const coreColor = this.stillpointActive ? '#67e8f9' : '#e0d7ff';
    const coreY = this.ducking ? this.y + 4 : this.y + 12;
    ctx.fillStyle = `rgba(${this.stillpointActive ? '103,232,249' : '224,215,255'},${coreAlpha})`;
    ctx.fillRect(this.x + 8, coreY, 8, 8);

    // Eyes
    ctx.fillStyle = '#0a0a0f';
    const eyeX = this.facing === 1 ? this.x + 14 : this.x + 4;
    const eyeY = this.ducking ? this.y + 4 : this.y + 8;
    ctx.fillRect(eyeX, eyeY, 6, 6);

    // ── Dash trail ────────────────────────────────────────────────────────
    if (this.dashing) {
      ctx.fillStyle = 'rgba(196, 181, 253, 0.3)';
      ctx.fillRect(this.x - this.vx * 2, this.y, this.width, this.height);
    }

    // ── Phase Dash trail ──────────────────────────────────────────────────
    if (this.phaseDashing) {
      for (let i = 1; i <= 4; i++) {
        ctx.globalAlpha = 0.45 - i * 0.09;
        ctx.fillStyle = '#a78bfa';
        ctx.fillRect(this.x - this.vx * i * 1.8, this.y, this.width, this.height);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(196, 181, 253, 0.18)';
      ctx.fillRect(this.x - 5, this.y - 5, this.width + 10, this.height + 10);
    }

    // ── Attack slash arc ─────────────────────────────────────────────────
    if (this.attacking) {
      const atk = this.getAttackHitbox();
      if (atk) {
        const progress = 1 - this.attackTimer / ATTACK_DURATION;
        const originX = this.facing === 1 ? this.x + this.width : this.x;
        const originY = this.y + this.height * 0.42;
        const arcLen = 48;
        const arcSpan = Math.PI * 0.72 * Math.min(1, progress * 1.5);
        const startAngle = this.facing === 1 ? -Math.PI * 0.62 : -Math.PI * 0.38;

        // Bright leading-edge line (fattest, most opaque)
        const leadAngle = startAngle + this.facing * arcSpan;
        ctx.strokeStyle = `rgba(255, 248, 255, ${0.9 - progress * 0.5})`;
        ctx.lineWidth = 3.5 - progress * 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX + Math.cos(leadAngle) * arcLen, originY + Math.sin(leadAngle) * arcLen);
        ctx.stroke();

        // Fan of trailing lines — fade off toward the origin
        for (let i = 0; i < 6; i++) {
          const t = i / 6;
          const a = startAngle + t * this.facing * arcSpan;
          const lineAlpha = (0.12 + t * 0.35) * (1 - progress * 0.6);
          ctx.strokeStyle = `rgba(224, 215, 255, ${lineAlpha})`;
          ctx.lineWidth = 1 + t * 1.5;
          ctx.beginPath();
          ctx.moveTo(originX, originY);
          ctx.lineTo(originX + Math.cos(a) * arcLen, originY + Math.sin(a) * arcLen);
          ctx.stroke();
        }

        // Arc connecting the tips — curved trail
        ctx.strokeStyle = `rgba(196, 181, 253, ${0.3 * (1 - progress)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= 14; i++) {
          const t = i / 14;
          const a = startAngle + t * this.facing * arcSpan;
          const len = arcLen * (0.7 + t * 0.3);
          const px = originX + Math.cos(a) * len;
          const py = originY + Math.sin(a) * len;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Impact flash at tip
        if (progress > 0.35) {
          const flashAlpha = Math.max(0, Math.sin(progress * Math.PI) * 1.2);
          ctx.fillStyle = `rgba(255, 250, 255, ${flashAlpha * 0.9})`;
          ctx.beginPath();
          ctx.arc(
            originX + Math.cos(leadAngle) * arcLen,
            originY + Math.sin(leadAngle) * arcLen,
            4 + progress * 5, 0, Math.PI * 2
          );
          ctx.fill();
        }

        ctx.lineCap = 'butt';
        ctx.lineWidth = 1;
      }
    }

    // Aiming indicator
    if (this.aimingUp && abilityState.hasShardShot && !this.attacking) {
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      if (this.facing === 1) {
        ctx.moveTo(this.x + this.width, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width + 40, this.y - 10);
      } else {
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - 40, this.y - 10);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
}