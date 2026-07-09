// Enemies: Fractured (basic) and Stutterer (teleporting)

const ENEMY_SPEED = 2;
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
    if (this.dead) { this.deathTimer++; return; }

    // Echo distraction
    if (this.distractionTimer > 0) {
      this.distractionTimer--;
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
      this.distractionTimer = 60;
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
      this.windUpTimer--;
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
      this.attackTimer--;
      if (this.attackTimer <= 0) this.attacking = false;
    }

    if (this.attackCooldown > 0) this.attackCooldown--;

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
    const _ts = (typeof gameTimeScale !== 'undefined') ? gameTimeScale : 1.0;
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

    this.flashTimer++;
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
    if (this.dead) { this.deathTimer++; return; }

    // Distraction
    if (this.distractionTimer > 0) {
      this.distractionTimer--;
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

    this.teleportTimer++;

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
      this.blinkTimer--;
      if (this.blinkTimer <= 0) this.blinking = false;
    }

    for (let i = this.decoys.length - 1; i >= 0; i--) {
      this.decoys[i].life--;
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
      this.windUpTimer--;
      if (this.windUpTimer <= 0) {
        this.windingUp = false;
        this.attacking = true;
        this.attackTimer = 20;
        this.attackCooldown = ENEMY_ATTACK_COOLDOWN + 30;
      }
    }

    if (this.attacking) {
      this.attackTimer--;
      if (this.attackTimer <= 0) this.attacking = false;
    }

    if (this.attackCooldown > 0) this.attackCooldown--;

    const _tsS = (typeof gameTimeScale !== 'undefined') ? gameTimeScale : 1.0;
    // Stop horizontal movement when airborne — prevents falling off platforms sideways in void areas
    if (!this.grounded) this.vx = 0;
    this.vy += GRAVITY * _tsS;
    this.y += this.vy * _tsS;

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
    this.flashTimer++;
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
    if (this.dead) { this.deathTimer++; return; }

    const area = getCurrentArea();
    this.facing = player.x > this.x ? 1 : -1;
    this.flashTimer = Math.max(0, this.flashTimer - 1);
    if (this.attackCooldown > 0) this.attackCooldown--;
    this.stateTimer--;

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

    this.vy += GRAVITY;
    this.y += this.vy;
    this.x += this.vx;

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