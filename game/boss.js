// Final Boss: The Fractured King
// A corrupted Stillpoint entity — 3-phase arena fight

const BOSS_MAX_HEALTH = 80;
const BOSS_DAMAGE = 1;
const BOSS_WIDTH = 48;
const BOSS_HEIGHT = 56;
const BOSS_X = 426;  // centered in 900px arena
const BOSS_Y = 334;  // groundY (390) - BOSS_HEIGHT (56)

class Boss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = BOSS_WIDTH;
    this.height = BOSS_HEIGHT;
    this.health = BOSS_MAX_HEALTH;
    this.maxHealth = BOSS_MAX_HEALTH;
    this.vx = 0;
    this.vy = 0;
    this.facing = -1;
    this.dead = false;
    this.deathTimer = 0;

    // State machine
    this.state = 'entering';
    this.stateTimer = 0;
    this.phase = 1;
    this.phaseTransitionTimer = 0;
    this.invulnerable = false;

    // Attack system
    this.attackCooldown = 0;
    this.attackTimer = 0;
    this.currentAttack = null;
    this.telegraph = null;
    this.hitEffects = [];

    // Consecutive hit tracking (for punish burst)
    this.consecutiveHits = 0;
    this.lastHitTimer = 0;

    // Teleport
    this.teleportTarget = { x: 0, y: 0 };
    this.teleportFlash = 0;

    // Shield (phase 2+)
    this.shieldActive = false;
    this.shieldHealth = 0;
    this.shieldMaxHealth = 2;
    this.shieldCooldown = 0;

    // Parry stun
    this.stunTimer = 0;

    // Summon timer (phase 2+)
    this.summonCooldown = 0;

    // Ultimate (phase 3)
    this.ultimateCharge = 0;
    this.ultimateActive = false;
    this.ultimateTimer = 0;
    this.ultimateDir = 1;

    // ── Adaptation system ─────────────────────────────────────────────────
    // Silently tracks how the player fights and biases attack selection.
    this.adapt = {
      meleeHits: 0,       // times player landed melee
      rangedHits: 0,      // times player landed projectile
      dashCount: 0,       // times player phase-dashed during fight
      stillpointUses: 0,  // times player activated Stillpoint against boss
      adaptNotified: false, // whether we've shown the first adaptation cue
    };

    // Phase 3 Stillpoint counter-lunge
    this.lunging = false;
    this.lungeVx = 0;
    this.lungeTimer = 0;
    this.stillpointWasActive = false; // tracks previous frame for edge detection
    this.surgeCooldown = 0; // prevent lunge spam
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  // Called from game.js when player hits boss
  notifyHit(sourceType) {
    if (sourceType === 'melee') this.adapt.meleeHits++;
    else this.adapt.rangedHits++;
    this.consecutiveHits++;
    this.lastHitTimer = 90;
    const total = this.adapt.meleeHits + this.adapt.rangedHits;
    if (total === 6 && !this.adapt.adaptNotified) {
      this.adapt.adaptNotified = true;
      this.hitEffects.push({ x: this.x + this.width / 2, y: this.y - 30,
        text: '— ADAPTING —', life: 80, color: '#c4b5fd' });
    }
    // 5 consecutive hits in Phase 2+: boss retaliates immediately
    if (this.consecutiveHits >= 5 && this.phase >= 2 && this.state === 'idle') {
      this.hitEffects.push({ x: this.x + this.width / 2, y: this.y - 22,
        text: 'ENOUGH', life: 50, color: '#fde68a' });
      this.consecutiveHits = 0;
      this.startProjectileBarrage();
    }
  }

  notifyPlayerDash() { this.adapt.dashCount++; }

  notifyStillpoint() {
    this.adapt.stillpointUses++;
    // Phase 2+: telegraph the surge each time player uses Stillpoint
    if (this.phase >= 2 && this.surgeCooldown <= 0 && !this.dead) {
      this.hitEffects.push({ x: this.x + this.width / 2, y: this.y - 18,
        text: this.phase >= 3 ? 'I SEE YOU' : '...', life: 50, color: '#f87171' });
    }
  }

  takeDamage(amount, fromX, sourceType) {
    if (this.dead || this.invulnerable) return;
    // Track adaptation
    if (sourceType) this.notifyHit(sourceType);
    // Shield blocks frontal damage
    if (this.shieldActive) {
      const shieldSide = this.facing; // 1 = shield on right, -1 = shield on left
      const hitFromFront = (fromX > this.x && shieldSide === 1) || (fromX < this.x && shieldSide === -1);
      if (hitFromFront) {
        this.shieldHealth--;
        // Spark particles
        const shieldX = shieldSide === 1 ? this.x + this.width : this.x - 12;
        this.hitEffects.push({ x: shieldX + 6, y: this.y + this.height / 2, text: '!', life: 30, color: '#67e8f9' });
        if (this.shieldHealth <= 0) {
          this.shieldActive = false;
          this.hitEffects.push({ x: this.x + this.width / 2, y: this.y - 10, text: 'SHIELD BROKEN', life: 60, color: '#2dd4bf' });
        }
        return;
      }
    }
    this.health -= amount;
    this.hitEffects.push({
      x: this.x + this.width / 2 + (Math.random() - 0.5) * 20,
      y: this.y - 10,
      text: '-' + amount,
      life: 40,
      color: '#f87171'
    });
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      this.state = 'dead';
    }
  }

  update(player, bossProjectiles, arenaWidth) {
    this.arenaWidth = arenaWidth;
    if (this.dead) {
      this.deathTimer++;
      return;
    }

    // ── Time scale (must be defined before stun check below) ─────────────
    const _globalTS = (typeof gameTimeScale !== 'undefined') ? gameTimeScale : 1.0;

    // Stunned by parry — skip all actions
    if (this.stunTimer > 0) {
      this.stunTimer -= _globalTS;
      return;
    }

    // ── Boss is ALWAYS immune to player Stillpoint in Phase 3 ────────────
    // In Phases 1-2 the boss IS slowed (gives player a good tool).
    // In Phase 3 the King "sees through" Stillpoint and responds with a lunge.
    const myTimeScale = (this.phase >= 3) ? 1.0 : _globalTS;

    // ── Detect player activating Stillpoint — trigger lunge in Phase 3 ────
    const spNow = (typeof player !== 'undefined') && player.stillpointActive;
    if (spNow && !this.stillpointWasActive) {
      this.notifyStillpoint();
      if (this.phase >= 3 && this.surgeCooldown <= 0 && !this.dead && this.state !== 'lunging') {
        this._startLunge(player);
      }
    }
    this.stillpointWasActive = spNow;
    if (this.surgeCooldown > 0) this.surgeCooldown--;

    // Phase detection
    const healthPct = this.health / this.maxHealth;
    const newPhase = healthPct > 0.6 ? 1 : healthPct > 0.3 ? 2 : 3;
    if (newPhase !== this.phase) {
      this.phase = newPhase;
      this.phaseTransitionTimer = 90;
      this.invulnerable = true;
      this.state = 'recovering';
      this.stateTimer = 90;
      this.telegraph = null;
      this.currentAttack = null;
      this.ultimateActive = false;
      this.ultimateCharge = 0;
      this.hitEffects.push({
        x: this.x + this.width / 2,
        y: this.y - 20,
        text: '── PHASE ' + ['I', 'II', 'III'][this.phase - 1] + ' ──',
        life: 90,
        color: this.phase === 3 ? '#f87171' : '#c4b5fd'
      });
      if (typeof SFX !== 'undefined') SFX.bossPhase();
      // Phase 3 announcement
      if (this.phase === 3) {
        setTimeout(() => {
          if (this.hitEffects) this.hitEffects.push({
            x: this.x + this.width / 2, y: this.y - 40,
            text: '"You think stillness belongs to you?"',
            life: 140, color: '#fde68a'
          });
        }, 1200);
      }
    }

    if (this.phaseTransitionTimer > 0) {
      this.phaseTransitionTimer--;
      if (this.phaseTransitionTimer <= 0) this.invulnerable = false;
    }

    // Hit effects
    for (let i = this.hitEffects.length - 1; i >= 0; i--) {
      this.hitEffects[i].y -= 0.5;
      this.hitEffects[i].life--;
      if (this.hitEffects[i].life <= 0) this.hitEffects.splice(i, 1);
    }

    // Telegraph timer (scaled by myTimeScale)
    if (this.telegraph) {
      this.telegraph.timer -= myTimeScale;
      if (this.telegraph.timer <= 0) {
        this.executeAttack();
        this.telegraph = null;
      }
    }

    // Boss projectiles — slowed by player Stillpoint even in Phase 3
    // (dodging his shots is still useful, only the KING himself is immune)
    for (let i = bossProjectiles.length - 1; i >= 0; i--) {
      const p = bossProjectiles[i];
      p.x += p.vx * _globalTS;
      p.y += p.vy * _globalTS;
      if (p.gravity) p.vy += 0.15 * _globalTS;
      p.life -= _globalTS;
      if (p.life <= 0 || p.x < -50 || p.x > arenaWidth + 50 || p.y > H + 50) {
        bossProjectiles.splice(i, 1);
      }
    }

    // State machine (uses myTimeScale for boss own timers)
    this.stateTimer -= myTimeScale;

    switch (this.state) {
      case 'entering':
        if (this.stateTimer <= 40) this.y = BOSS_Y;
        if (this.stateTimer <= 0) { this.state = 'idle'; this.stateTimer = 60; }
        break;

      case 'recovering':
        this.y = BOSS_Y + Math.sin(frameCount * 0.1) * 5;
        if (this.stateTimer <= 0) { this.state = 'idle'; this.stateTimer = 45; }
        break;

      case 'lunging':
        // Phase 3 counter-Stillpoint lunge — boss surges at player position
        this.x += this.lungeVx * myTimeScale;
        this.x = Math.max(20, Math.min(this.x, (arenaWidth || 900) - this.width - 20));
        this.lungeTimer -= myTimeScale;
        if (this.lungeTimer <= 0) {
          this.lungeVx = 0;
          this.state = 'idle';
          this.stateTimer = 35;
        }
        break;

      case 'idle':
        this.y = BOSS_Y;
        this.facing = player.x > this.x ? 1 : -1;

        // ── Continuous drift — boss always moves toward preferred distance ────
        {
          const preferredDist = 220;
          const bossCX = this.x + this.width / 2;
          const playerCX = player.x + player.width / 2;
          const dx = playerCX - bossCX;
          const dist = Math.abs(dx);
          const driftSpeed = [0, 1.2, 2.0, 3.2][this.phase] || 1.2;
          if (dist > preferredDist + 40) {
            this.vx = Math.sign(dx) * driftSpeed;  // too far → chase
          } else if (dist < preferredDist - 40) {
            this.vx = -Math.sign(dx) * driftSpeed; // too close → back off
          } else {
            this.vx *= 0.88; // in sweet spot → decelerate
          }
          this.x += this.vx * myTimeScale;
          this.x = Math.max(20, Math.min(this.x, (this.arenaWidth || 900) - this.width - 20));
        }

        // Track consecutive hit reset timer
        if (this.lastHitTimer > 0) {
          this.lastHitTimer -= myTimeScale;
          if (this.lastHitTimer <= 0) this.consecutiveHits = 0;
        }

        if (this.phase >= 2 && !this.shieldActive && this.shieldCooldown <= 0 && Math.random() < 0.015) {
          this.shieldActive = true;
          this.shieldHealth = this.shieldMaxHealth;
          this.shieldCooldown = 300;
        }
        if (this.shieldCooldown > 0) this.shieldCooldown -= myTimeScale;

        if (this.phase >= 2) {
          this.summonCooldown -= myTimeScale;
          if (this.summonCooldown <= 0) {
            this.doSummon();
            this.summonCooldown = this.phase === 3 ? 300 : 480;
          }
        }

        if (this.stateTimer <= 0) this.pickAttack();
        break;

      case 'teleporting':
        if (this.stateTimer === 10) {
          // Arrival flash
          this.teleportFlash = 15;
        }
        if (this.teleportFlash > 0) this.teleportFlash--;
        if (this.stateTimer <= 0) {
          this.state = 'idle';
          this.stateTimer = 30;
        }
        break;

      // Charge Rush — boss slides across arena, contact damages player
      case 'charging':
        this.x += this.chargeVx * myTimeScale;
        this.x = Math.max(20, Math.min(this.x, (this.arenaWidth || 900) - this.width - 20));
        if (this.x <= 20 || this.x >= (this.arenaWidth || 900) - this.width - 20) {
          if (this._pendingDoubleCharge) {
            // Phase 2+ double charge — reverse and charge back once
            this._pendingDoubleCharge = false;
            this.chargeVx = -this.chargeVx;
            this.stateTimer = 28; // shorter second charge
          } else {
            this.chargeVx = 0;
            this.state = 'staggered';
            this.stateTimer = 35;
          }
        }
        if (this.stateTimer <= 0) {
          this._pendingDoubleCharge = false;
          this.chargeVx = 0;
          this.state = 'staggered';
          this.stateTimer = 35;
        }
        break;

      // Stagger — brief vulnerable window after attack, player should capitalise
      case 'staggered':
        this.vx *= 0.85;
        this.x += this.vx * myTimeScale;
        if (this.stateTimer <= 0) {
          this.state = 'idle';
          this.stateTimer = 40;
          this.attackCooldown = this.phase === 3 ? 20 : 35;
        }
        break;

      // Attacking — telegraph is ticking; boss slowly tracks player while winding up
      case 'attacking':
        this.y = BOSS_Y;
        this.facing = player.x > this.x ? 1 : -1;
        // Slow drift during wind-up so the boss isn't a stationary punching bag
        {
          const bossCX = this.x + this.width / 2;
          const playerCX = player.x + player.width / 2;
          const dx = playerCX - bossCX;
          const dist = Math.abs(dx);
          const trackSpeed = [0, 0.8, 1.4, 2.0][this.phase] || 0.8;
          if (dist > 250) this.x += Math.sign(dx) * trackSpeed * myTimeScale;
          this.x = Math.max(20, Math.min(this.x, (this.arenaWidth || 900) - this.width - 20));
        }
        if (this.stateTimer <= 0) {
          this.state = 'idle';
          this.stateTimer = 30;
        }
        break;

      case 'dead':
        break;
    }

    // Phase 3 damage aura
    if (this.phase === 3 && !this.dead && this.state !== 'entering') {
      const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
      const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150 && player.invincibleTimer <= 0 && !player.phaseDashing) {
        // Tick damage every 30 frames
        if (!this.auraTick || this.auraTick <= 0) {
          this.auraTick = 30;
        }
        this.auraTick--;
        if (this.auraTick <= 0) {
          player.takeDamage(1);
          this.auraTick = 30;
        }
      } else {
        this.auraTick = 0;
      }
    }
  }

  startCharge() {
    // Telegraph: crouch for 40 frames, then rush
    const dir = (player.x > this.x + this.width / 2) ? 1 : -1;
    this.chargeVx = dir * 10;
    this.telegraph = {
      type: 'charge',
      dir,
      timer: 40,
      duration: 40,
    };
    this.state = 'attacking';
    this.stateTimer = 45;
    this.attackCooldown = this.phase === 3 ? 20 : 35;
  }

  pickAttack() {
    if (this.attackCooldown > 0) {
      this.attackCooldown--;
      this.state = 'idle';
      this.stateTimer = 30;
      return;
    }

    // ── Adaptation bias ──────────────────────────────────────────────────
    const prefersRange = this.adapt.rangedHits > this.adapt.meleeHits + 4;
    const prefersMelee = this.adapt.meleeHits > this.adapt.rangedHits + 4;

    let wCharge  = 0.18;
    let wSlam    = 0.38;
    let wBarrage = 0.60;
    let wNova    = 0.78;

    if (prefersRange)  { wCharge += 0.10; wSlam += 0.06; }
    if (prefersMelee)  { wCharge -= 0.06; wSlam -= 0.06; wBarrage -= 0.06; }
    if (this.phase === 3) { wCharge += 0.06; wBarrage -= 0.06; }

    const roll = Math.random();

    if (this.phase === 3 && roll < 0.13 && !this.ultimateActive) {
      this.startUltimate();
      return;
    }

    const teleportThresh = (prefersRange || this.adapt.dashCount > 8) ? 0.26 : 0.18;
    if (this.phase >= 2 && roll < teleportThresh) {
      this.startTeleport(this.arenaWidth);
      return;
    }

    if (roll < wCharge) {
      this.startCharge();
    } else if (roll < wSlam) {
      this.startGroundSlam();
    } else if (roll < wBarrage) {
      this.startProjectileBarrage();
    } else if (roll < wNova && this.phase >= 2) {
      this.startNova();
    } else {
      this.startTripleShot();
    }
  }

  _startLunge(player) {
    // Short telegraph then a fast surge — occurs in Phase 3 when player uses Stillpoint
    this.teleportFlash = 12;
    const dir = player.x > this.x ? 1 : -1;
    this.lungeVx = dir * 11;
    this.state = 'lunging';
    this.stateTimer = 30;
    this.lungeTimer = 28;
    this.surgeCooldown = 180;
  }

  // NOTE: pickAttack() is defined above (line ~394) and must NOT be redefined here.
  // The version above includes: charge rush, Stillpoint surge tracking, adaptation
  // weighting, and Phase 3 escalation. This comment replaces the old duplicate
  // that was accidentally shadowing it.

  startGroundSlam() {
    const slamX = player.x + player.width / 2 - 60;
    this.telegraph = {
      type: 'slam',
      x: Math.max(20, Math.min(slamX, 760)),
      y: 370,
      w: 120,
      h: 20,
      timer: 45,
      duration: 45
    };
    this.state = 'attacking';
    this.stateTimer = 50;
    this.attackCooldown = this.phase === 3 ? 25 : 40;
  }

  startProjectileBarrage() {
    const count = this.phase === 3 ? 6 : this.phase === 2 ? 5 : 4;
    this.telegraph = {
      type: 'barrage',
      targets: [],
      timer: 50,
      duration: 50
    };
    // Aim projectiles at player position with spread
    for (let i = 0; i < count; i++) {
      const angle = (i / (count - 1)) * Math.PI - Math.PI / 2;
      const tx = this.x + this.width / 2 + Math.cos(angle) * 100 - 10;
      const ty = this.y + this.height / 2 + Math.sin(angle) * 80 - 10;
      this.telegraph.targets.push({ x: tx, y: ty, w: 20, h: 20 });
    }
    this.state = 'attacking';
    this.stateTimer = 60;
    this.attackCooldown = this.phase === 3 ? 35 : 50;
  }

  startTripleShot() {
    this.telegraph = {
      type: 'triple',
      targets: [
        { x: this.x + this.width / 2 - 80, y: this.y + 20, w: 50, h: 20 },
        { x: this.x + this.width / 2 - 10, y: this.y, w: 50, h: 20 },
        { x: this.x + this.width / 2 + 30, y: this.y + 20, w: 50, h: 20 }
      ],
      timer: 40,
      duration: 40
    };
    this.state = 'attacking';
    this.stateTimer = 50;
    this.attackCooldown = 35;
  }

  startTeleport(arenaWidth) {
    this.teleportTarget = {
      x: 40 + Math.random() * ((arenaWidth || 900) - 80),
      y: BOSS_Y
    };
    this.state = 'teleporting';
    this.stateTimer = 25;
    this.attackCooldown = 40;
    // Vanish
    this.x = -200;
  }

  startNova() {
    this.telegraph = {
      type: 'nova',
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
      radius: 120,
      timer: 55,
      duration: 55
    };
    this.state = 'attacking';
    this.stateTimer = 65;
    this.attackCooldown = this.phase === 3 ? 50 : 70;
  }

  startUltimate() {
    this.ultimateActive = true;
    this.ultimateCharge = 60;
    this.ultimateDir = this.facing;
    this.telegraph = {
      type: 'ultimate_charge',
      x: this.x,
      y: this.y - 10,
      w: this.width,
      h: this.height + 20,
      timer: 60,
      duration: 60
    };
    this.state = 'attacking';
    this.stateTimer = 130;
    this.attackCooldown = 120;
  }

  executeAttack() {
    if (!this.telegraph) return;
    const t = this.telegraph;

    if (t.type === 'slam') {
      // Fire a wide projectile that hits the slam zone
      bossProjectiles.push({
        x: t.x, y: t.y,
        vx: 0, vy: 0,
        width: t.w, height: t.h,
        life: 20, gravity: false,
        type: 'slam'
      });
      // Bounce effect
      this.y = BOSS_Y - 15;
      setTimeout(() => { this.y = BOSS_Y; }, 100);
    }

    if (t.type === 'barrage') {
      for (const target of t.targets) {
        const dx = target.x + 10 - (this.x + this.width / 2);
        const dy = target.y + 10 - (this.y + this.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        bossProjectiles.push({
          x: this.x + this.width / 2 - 6,
          y: this.y + this.height / 2 - 6,
          vx: (dx / dist) * 4,
          vy: (dy / dist) * 4,
          width: 12, height: 12,
          life: 180, gravity: false,
          type: 'orb'
        });
      }
    }

    if (t.type === 'triple') {
      for (const target of t.targets) {
        const dx = target.x + 25 - (this.x + this.width / 2);
        const dy = target.y + 10 - (this.y + this.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        bossProjectiles.push({
          x: this.x + this.width / 2 - 5,
          y: this.y + this.height / 2 - 5,
          vx: (dx / dist) * 3.5,
          vy: (dy / dist) * 3.5,
          width: 10, height: 10,
          life: 150, gravity: false,
          type: 'orb'
        });
      }
    }

    if (t.type === 'nova') {
      const count = 12;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        bossProjectiles.push({
          x: this.x + this.width / 2 - 6,
          y: this.y + this.height / 2 - 6,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          width: 12, height: 12,
          life: 150, gravity: false,
          type: 'nova'
        });
      }
    }

    if (t.type === 'ultimate_charge') {
      // Transition to firing
      this.ultimateCharge = 0;
      // Fire the beam as a wide projectile
      const beamX = this.ultimateDir === 1 ? this.x + this.width : this.x - 200;
      bossProjectiles.push({
        x: beamX,
        y: this.y - 5,
        vx: this.ultimateDir * 5,
        vy: 0,
        width: 200,
        height: this.height + 10,
        life: 100,
        gravity: false,
        type: 'beam'
      });
    }

    if (t.type === 'charge') {
      // Launch the charge — boss slides into 'charging' state
      this.state = 'charging';
      this.stateTimer = 38; // max frames for charge (stops at wall edge automatically)
      this.vx = this.chargeVx;
      // Double charge in Phase 2+
      if (this.phase >= 2) {
        this._pendingDoubleCharge = true;
      }
      if (typeof SFX !== 'undefined') SFX.bossHit();
      return; // state already set, don't fall through to idle below
    }

    // After non-charge attacks, enter a short stagger (vulnerable window)
    if (t.type === 'slam' || t.type === 'barrage' || t.type === 'nova') {
      setTimeout(() => {
        if (!this.dead && this.state === 'attacking') {
          this.state = 'staggered';
          this.stateTimer = 28;
        }
      }, 200);
    }

    // Teleport arrival
    if (this.state === 'teleporting') {
      this.x = this.teleportTarget.x;
      this.y = this.teleportTarget.y;
    }
  }

  doSummon() {
    // Signal game.js to spawn enemies
    this.summonData = {
      left: { x: 60, y: 334 },
      right: { x: 740, y: 334 }
    };
  }

  draw(ctx) {
    if (this.dead && this.deathTimer > 60) return;

    // Dead fade + dissipation
    if (this.dead) {
      const deathProgress = this.deathTimer / 60;
      ctx.globalAlpha = Math.max(0, 1 - deathProgress);
      
      // Fragment body on death - draw scattered pieces
      if (this.deathTimer > 0) {
        const fragmentCount = Math.min(12, Math.floor(this.deathTimer / 3));
        ctx.fillStyle = this.phase === 3 ? '#f87171' : this.phase === 2 ? '#c084fc' : '#8b5cf6';
        for (let i = 0; i < fragmentCount; i++) {
          const angle = (i / fragmentCount) * Math.PI * 2 + this.deathTimer * 0.05;
          const distance = this.deathTimer * 1.5;
          const fx = this.x + this.width / 2 + Math.cos(angle) * distance;
          const fy = this.y + this.height / 2 + Math.sin(angle) * distance;
          const size = Math.max(2, 8 - this.deathTimer * 0.1);
          ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 60);
          ctx.fillRect(fx - size / 2, fy - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
        return;
      }
    }

    // Teleport flash (vanish)
    if (this.state === 'teleporting' && this.stateTimer > 10) {
      ctx.globalAlpha *= 0.3;
    }

    // Phase transition flash
    if (this.phaseTransitionTimer > 0 && this.phaseTransitionTimer % 6 < 3) {
      ctx.globalAlpha *= 0.5;
    }

    // Invulnerability flash
    if (this.invulnerable) {
      ctx.globalAlpha *= (Math.sin(frameCount * 0.4) * 0.4 + 0.5);
    }

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    // Teleport vortex effect
    if (this.state === 'teleporting') {
      const vortexAlpha = this.stateTimer < 10 ? this.stateTimer / 10 : Math.max(0, 1 - (this.stateTimer - 10) / 10);
      for (let i = 0; i < 3; i++) {
        const radius = 20 + i * 15 + Math.sin(frameCount * 0.15 + i) * 10;
        ctx.strokeStyle = `rgba(196, 181, 253, ${vortexAlpha * (0.5 - i * 0.15)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, frameCount * 0.1 * (i % 2 === 0 ? 1 : -1), frameCount * 0.1 * (i % 2 === 0 ? 1 : -1) + Math.PI * 1.5);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    }

    // Aura glow (phase 3)
    if (this.phase === 3 && !this.dead) {
      const auraPulse = Math.sin(frameCount * 0.08) * 0.15 + 0.2;
      ctx.fillStyle = `rgba(248, 113, 113, ${auraPulse})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 100 + Math.sin(frameCount * 0.1) * 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ultimate charge glow
    if (this.ultimateActive && this.ultimateCharge > 0) {
      const chargePulse = Math.sin(frameCount * 0.2) * 0.3 + 0.5;
      ctx.fillStyle = `rgba(255, 50, 50, ${chargePulse})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 40 + Math.sin(frameCount * 0.15) * 15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Idle bob animation
    const idleBob = this.state === 'idle' ? Math.sin(frameCount * 0.04) * 2 : 0;

    // Body
    const bodyColor = this.phase === 3 ? '#f87171' : this.phase === 2 ? '#c084fc' : '#8b5cf6';
    ctx.fillStyle = bodyColor;
    ctx.fillRect(this.x + 4, this.y + 4 + idleBob, this.width - 8, this.height - 8);

    // Core
    ctx.fillStyle = '#e0d4ff';
    ctx.fillRect(this.x + 12, this.y + 12 + idleBob, this.width - 24, this.height - 24);

    // Eyes — white during lunge (Stillpoint counter-lunge tell), red otherwise
    const eyeIsWhite = this.state === 'lunging' || this.teleportFlash > 0;
    ctx.fillStyle = eyeIsWhite ? '#ffffff' : '#ff3333';
    const eyeY = this.y + 18 + idleBob;
    ctx.fillRect(this.x + 14, eyeY, 6, 4);
    ctx.fillRect(this.x + this.width - 20, eyeY, 6, 4);

    // Phase 3: faint shimmer outline showing Stillpoint immunity
    if (this.phase >= 3) {
      const shimmer = Math.sin(frameCount * 0.12) * 0.15 + 0.25;
      ctx.strokeStyle = `rgba(255, 100, 100, ${shimmer})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x - 3, this.y - 3 + idleBob, this.width + 6, this.height + 6);
      ctx.lineWidth = 1;
    }

    // Lunge trail — motion blur effect
    if (this.state === 'lunging') {
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.35 - i * 0.1;
        ctx.fillStyle = '#f87171';
        ctx.fillRect(this.x - this.lungeVx * i * 1.5, this.y + idleBob, this.width, this.height);
      }
      ctx.globalAlpha = 1;
    }

    // Shield
    if (this.shieldActive) {
      const shieldX = this.facing === 1 ? this.x + this.width - 2 : this.x - 10;
      const shieldPulse = Math.sin(frameCount * 0.1) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(103, 232, 249, ${shieldPulse})`;
      ctx.fillRect(shieldX, this.y - 4 + idleBob, 12, this.height + 8);
      ctx.strokeStyle = `rgba(103, 232, 249, ${shieldPulse * 0.5})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(shieldX - 2, this.y - 6 + idleBob, 16, this.height + 12);
      ctx.lineWidth = 1;
    }

    ctx.globalAlpha = 1;

    // Hit effects
    for (const eff of this.hitEffects) {
      const alpha = Math.min(1, eff.life / 15);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = eff.color;
      ctx.font = eff.text.length > 8 ? 'bold 11px monospace' : eff.text.length > 5 ? 'bold 14px monospace' : 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(eff.text, eff.x, eff.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  drawTelegraphs(ctx) {
    if (!this.telegraph || this.dead) return;
    const t = this.telegraph;
    const progress = 1 - t.timer / t.duration;

    if (t.type === 'slam') {
      const alpha = progress < 0.7 ? 0.3 : 0.6;
      const flash = progress >= 0.7 ? (Math.sin(frameCount * 0.5) * 0.3 + 0.3) : 0;
      ctx.fillStyle = `rgba(248, 113, 113, ${alpha + flash})`;
      ctx.fillRect(t.x, t.y, t.w, t.h);
      // Warning symbol
      if (progress >= 0.7) {
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', t.x + t.w / 2, t.y - 5);
      }
    }

    if (t.type === 'barrage' || t.type === 'triple') {
      for (const target of t.targets) {
        const alpha = progress < 0.7 ? 0.2 : 0.5;
        ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
        ctx.beginPath();
        ctx.arc(target.x + target.w / 2, target.y + target.h / 2, target.w / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (t.type === 'nova') {
      const alpha = progress < 0.7 ? 0.15 : 0.4;
      ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius * progress, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    if (t.type === 'charge') {
      // Red horizontal arrow showing the charge direction, growing as timer runs
      const arrowLen = 80 + progress * 120;
      const arrowX = t.dir === 1 ? this.x + this.width + 8 : this.x - 8 - arrowLen;
      const arrowY = this.y + this.height / 2;
      const alpha = 0.3 + progress * 0.6;
      ctx.fillStyle = `rgba(248, 50, 50, ${alpha})`;
      // Arrow body
      ctx.fillRect(arrowX, arrowY - 5, arrowLen, 10);
      // Arrowhead
      ctx.beginPath();
      if (t.dir === 1) {
        ctx.moveTo(arrowX + arrowLen,     arrowY);
        ctx.lineTo(arrowX + arrowLen - 14, arrowY - 12);
        ctx.lineTo(arrowX + arrowLen - 14, arrowY + 12);
      } else {
        ctx.moveTo(arrowX,     arrowY);
        ctx.lineTo(arrowX + 14, arrowY - 12);
        ctx.lineTo(arrowX + 14, arrowY + 12);
      }
      ctx.fill();
      // Warning text on final frames
      if (progress > 0.75) {
        ctx.fillStyle = `rgba(255, 80, 80, ${(progress - 0.75) * 4})`;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CHARGE', this.x + this.width / 2, this.y - 12);
      }
    }

    if (t.type === 'ultimate_charge') {
      const alpha = 0.4 + Math.sin(frameCount * 0.3) * 0.2;
      ctx.fillStyle = `rgba(255, 30, 30, ${alpha})`;
      ctx.fillRect(t.x - 10, t.y, t.w + 20, t.h);
      // Charge bar
      const chargePct = 1 - this.ultimateCharge / 60;
      ctx.fillStyle = '#ff2020';
      ctx.fillRect(t.x, t.y - 8, t.w * chargePct, 4);
      // Arrow
      ctx.fillStyle = '#ff4040';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.ultimateDir === 1 ? '>>> DANGER <<<' : '<<< DANGER >>>', t.x + t.w / 2, t.y - 14);
    }

    ctx.textAlign = 'left';
  }
}

// Draw boss projectiles
function drawBossProjectiles(ctx, projectiles) {
  for (const p of projectiles) {
    if (p.type === 'beam') {
      ctx.fillStyle = `rgba(255, 40, 40, 0.8)`;
      ctx.fillRect(p.x, p.y, p.width, p.height);
      // Beam core
      ctx.fillStyle = `rgba(255, 200, 200, 0.9)`;
      ctx.fillRect(p.x, p.y + p.height * 0.3, p.width, p.height * 0.4);
    } else if (p.type === 'slam') {
      ctx.fillStyle = `rgba(248, 113, 113, 0.7)`;
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.fillStyle = `rgba(255, 200, 200, 0.5)`;
      ctx.fillRect(p.x + 10, p.y + 2, p.width - 20, p.height - 4);
    } else {
      ctx.fillStyle = p.type === 'nova' ? '#fbbf24' : '#c4b5fd';
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}