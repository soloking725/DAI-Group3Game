// Enemies: Fractured (basic) and Stutterer (teleporting)

const ENEMY_SPEED = 1.5;
const ENEMY_HEALTH = 3;
const ENEMY_DAMAGE = 1;
const ENEMY_ATTACK_RANGE = 40;
const ENEMY_ATTACK_COOLDOWN = 90;

// Windup (pre-attack telegraph) duration in frames
// Player has this many frames to react and dodge before the hit lands.
const ENEMY_WINDUP_FRAMES = 28;

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
    this.vx = ENEMY_SPEED;
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
    this.patrolCenter = x;
    this.patrolRange = 120;

    // Distraction state (for echo decoys)
    this.distractionTimer = 0;
    this.distractionTarget = null;
  }

  update(player, bounds, echoes) {
    const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;

    if (this.dead) { this.deathTimer++; return; }

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
      this.distractionTimer = 60; // fixed duration (will be scaled down by _ts above)
      return;
    }

    const dx = player.x - this.x;
    const dist = Math.abs(dx);
    this.facing = dx > 0 ? 1 : -1;

    // ── Windup telegraph ─────────────────────────────────────────────────────
    // Begin windup when in range and not already winding / attacking
    if (dist < ENEMY_ATTACK_RANGE && this.attackCooldown <= 0 && !this.windingUp && !this.attacking) {
      this.windingUp = true;
      this.windUpTimer = ENEMY_WINDUP_FRAMES;
      this.vx = 0;
    }

    if (this.windingUp) {
      this.windUpTimer -= _ts;
      this.vx = 0; // freeze during windup
      if (this.windUpTimer <= 0) {
        this.windingUp = false;
        this.attacking = true;
        this.attackTimer = 20;
        this.attackCooldown = ENEMY_ATTACK_COOLDOWN;
      }
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
    if (!this.windingUp && !this.attacking) {
      if (dist < ENEMY_ATTACK_RANGE * 2) {
        this.vx = this.facing * ENEMY_SPEED;
      } else {
        if (Math.abs(this.x - this.patrolCenter) > this.patrolRange) {
          this.vx = -Math.sign(this.vx) * ENEMY_SPEED;
        }
      }
    }

    // Physics
    // If airborne, stop horizontal movement — prevents enemies walking off platform edges into void
    if (!this.grounded) this.vx = 0;
    this.vy += GRAVITY * _ts;
    this.x += this.vx * _ts;
    this.y += this.vy * _ts;

    if (this.y + this.height > bounds.groundY) {
      this.y = bounds.groundY - this.height; this.vy = 0; this.grounded = true;
    }

    const area = getCurrentArea();
    if (area) {
      for (const plat of area.platforms) {
        if (plat.destructible && plat.hp <= 0) continue;
        if (this.x + this.width > plat.x && this.x < plat.x + plat.w) {
          if (this.y + this.height > plat.y && this.y + this.height < plat.y + plat.h + 10 && this.vy >= 0) {
            this.y = plat.y - this.height; this.vy = 0; this.grounded = true;
          }
        }
      }
    }

    if (this.x < bounds.left) this.x = bounds.left;
    if (this.x + this.width > bounds.right) this.x = bounds.right - this.width;

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

  takeDamage(dmg, sourceX) {
    this.health -= dmg;
    this.flashTimer = 0;
    this.windingUp = false; // interrupt windup on hit — gives player a punish window
    this.windUpTimer = 0;
    if (sourceX !== undefined) {
      this.vx = (this.x > sourceX ? 1 : -1) * 4;
      this.vy = -3;
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

    // Eye
    ctx.fillStyle = '#0a0a0f';
    const eyeX = this.facing === 1 ? this.x + 18 : this.x + 4;
    ctx.fillRect(eyeX, this.y + 8, 8, 6);

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
    if (nearestEcho) { this.distractionTarget = nearestEcho; this.distractionTimer = 60; return; }

    this.teleportTimer += _ts;

    if (this.teleportTimer >= this.teleportInterval) {
      this.teleportTimer = 0;
      this.decoys.push({ x: this.x, y: this.y, life: 60 });
      const dx = player.x - this.x;
      const jumpDist = 80 + Math.random() * 60;
      this.x += Math.sign(dx) * jumpDist;
      this.x = Math.max(bounds.left, Math.min(this.x, bounds.right - this.width));
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

    const dist = Math.abs(player.x - this.x);
    this.facing = (player.x - this.x) > 0 ? 1 : -1;
    this.vx = 0;

    // Windup before attack
    if (dist < ENEMY_ATTACK_RANGE * 2.5 && this.attackCooldown <= 0 && !this.windingUp && !this.attacking) {
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
    this.vy += GRAVITY * _ts;
    this.y += this.vy * _ts;

    if (this.y + this.height > bounds.groundY) {
      this.y = bounds.groundY - this.height; this.vy = 0; this.grounded = true;
    }

    const area = getCurrentArea();
    if (area) {
      for (const plat of area.platforms) {
        if (plat.destructible && plat.hp <= 0) continue;
        if (this.x + this.width > plat.x && this.x < plat.x + plat.w) {
          if (this.y + this.height > plat.y && this.y + this.height < plat.y + plat.h + 10 && this.vy >= 0) {
            this.y = plat.y - this.height; this.vy = 0; this.grounded = true;
          }
        }
      }
    }

    this.x = Math.max(bounds.left, Math.min(this.x, bounds.right - this.width));
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
// FracturedSlime — summoned miniboss by the Fractured King
// ─────────────────────────────────────────────────────────────────────────────
const SLIME_SPEED = 2.5;
const SLIME_HEALTH = 5;
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

    this.vy += GRAVITY * _ts;
    this.y += this.vy * _ts;
    this.x += this.vx * _ts;

    if (this.y + this.height > bounds.groundY) {
      this.y = bounds.groundY - this.height; this.vy = 0; this.grounded = true;
    }

    if (area) {
      for (const plat of area.platforms) {
        if (plat.destructible && plat.hp <= 0) continue;
        if (this.x + this.width > plat.x && this.x < plat.x + plat.w) {
          if (this.y + this.height > plat.y && this.y + this.height < plat.y + plat.h + 10 && this.vy >= 0) {
            this.y = plat.y - this.height; this.vy = 0; this.grounded = true;
          }
        }
      }
    }

    this.x = Math.max(bounds.left, Math.min(this.x, bounds.right - this.width));
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
const SENTINEL_HEALTH = 6;
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
    this.attackCooldown = SENTINEL_ATTACK_COOLDOWN;
    this.windingUp = false;
    this.windUpTimer = 0;
    this.attacking = false;
    this.attackTimer = 0;
    this.distractionTimer = 0;
    this.distractionTarget = null;
    this.patrolCenterX = x;
    this.patrolRange = 150;
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
      this.distractionTimer = 60;
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
    const maxSpeed = SENTINEL_SPEED * (this.shieldBroken ? 0.4 : 1.0);
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
    }
    CrystalSentinel.projectiles = CrystalSentinel.projectiles.filter(p => p.alive);
  }
}

// Initialize the static projectile array
CrystalSentinel.projectiles = [];