// Player character
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const MOVE_SPEED = 4;
const DUCK_SPEED = 2;
const DASH_SPEED = 12;
const DASH_DURATION = 8;
const DASH_COOLDOWN = 30;
const DASH_CHAIN_MAX = 3; // max consecutive dashes in a chain
const MAX_HEALTH = 6;
const INVINCIBLE_FRAMES = 90; // ~1.5s at 60fps
const COYOTE_FRAMES = 6; // 6 frames (~100ms at 60fps) – the sweet spot

// Wall Jump / Wall Slide
const WALL_SLIDE_SPEED = 1.5;     // reduced fall speed while sliding
const WALL_JUMP_FORCE = -10;      // vertical component of wall jump
const WALL_JUMP_H_SPEED = 7;      // horizontal away-from-wall component
const WALL_JUMP_COYOTE = 8;       // frames you can still wall-jump after losing contact

// Attack
const ATTACK_WIDTH = 40;
const ATTACK_HEIGHT = 30;
const ATTACK_DURATION = 12;
const ATTACK_COOLDOWN = 18;
const ATTACK_DAMAGE = 1;

// Directional attack hitbox sizes
const ATK_FWD_W = 40; const ATK_FWD_H = 28;
const ATK_UP_W  = 30; const ATK_UP_H  = 36;
const ATK_DN_W  = 40; const ATK_DN_H  = 24;
const ATK_POGO_VY = -11; // upward bounce on down-slam hit

// Charged heavy attack (hold Z/J to charge, release to fire)
const CHARGE_TAP = 5;       // frames under this counts as a tap (normal attack)
const CHARGE_FULL = 40;     // frames to reach full charge (~667ms)
const HEAVY_DAMAGE = 2;     // damage multiplier for full charge
const HEAVY_KNOCKBACK = 2.5; // knockback multiplier for full charge

// Shard Shot aiming (hold V/N to aim, release to fire — expansion §0.1)
const SHARD_AIM_TILT_RATE = 0.25;  // launch-vy change per frame while holding Up/Down
const SHARD_AIM_VY_MIN = -7;       // steepest upward launch
const SHARD_AIM_VY_MAX = 4;        // steepest downward launch (off-ledge shots)

// Parry (deflect enemy attacks with timed Z-tap during cooldown)
const PARRY_WINDOW = 10;    // frames the parry is active (~167ms)
const PARRY_COOLDOWN = 60;  // frames between parry attempts (1s)
const PARRY_STUN = 30;      // frames the enemy is stunned (0.5s)
const PARRY_IFRAMES = 20;   // player invincibility after successful parry

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
    this.attackDirection = 'forward'; // 'forward', 'up', 'down'
    // Per-swing hit tracking — cleared every time a new attack starts (see
    // the three spots that set `this.attacking = true`). Without this, an
    // enemy/wall that stays inside the (multi-frame) attack hitbox at
    // point-blank range took damage on every overlapping frame instead of
    // once per swing.
    this.hitTargetsThisSwing = new Set();
    this.dashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashChain = 0;       // consecutive dash count (resets on ground/gap)
    this.dashChainTimer = 0;  // frames since last dash (for chain reset)
    this.invincibleTimer = 0;
    this.flashTimer = 0;
    this.coyoteTimer = 0;
    this.hitStunTimer = 0;   // frames of knockback after taking damage — suppresses directional input override, mirrors Enemy's hitStun

    this.phaseDashing = false;
    this.phaseDashTimer = 0;
    this.shardShotFired = false;
    this.shardAiming = false;   // holding V/N — aiming arc visible (see draw())
    this.shardAimTimer = 0;     // frames the aim has been held
    this.shardAimVy = 0;        // vertical launch velocity of the aimed shot

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

    // Parry
    this.parrying = false;
    this.parryTimer = 0;     // frames left in parry window
    this.parryCooldown = 0;  // frames before next parry

    // Charged heavy attack
    this.charging = false;
    this.chargeTimer = 0;    // frames held (0-CHARGE_FULL)
    this.fullyCharged = false;

    // Wall jump / wall slide
    this.wallSliding = false;       // currently sliding down a wall
    this.wallNormal = 0;            // -1 = touching left wall, 1 = touching right wall, 0 = none
    this.wallJumpCoyote = 0;        // frames after losing wall contact where wall-jump still works
    this.wallJumpJustFired = false; // prevent double-wall-jump mid-air
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
      this.wallJumpJustFired = false; // can wall-jump again after landing
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer--;
    }

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
    if (!this.dashing && !this.phaseDashing && this.hitStunTimer <= 0) {
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

      // ── Wall slide: slow descent when holding toward a wall ──
      const holdingTowardWall = (this.wallNormal === 1 && (isPressed('ArrowRight') || isPressed('KeyD'))) ||
                                (this.wallNormal === -1 && (isPressed('ArrowLeft') || isPressed('KeyA')));
      if (!this.grounded && this.wallNormal !== 0 && holdingTowardWall && this.vy >= 0) {
        this.wallSliding = true;
        if (this.vy > WALL_SLIDE_SPEED) {
          this.vy = WALL_SLIDE_SPEED;
        }
      } else {
        this.wallSliding = false;
      }

      // Block jumping while ducking
      const jumpPressed = wasJustPressed('ArrowUp') || wasJustPressed('KeyW') || wasJustPressed('Space');
      if (jumpPressed && (this.grounded || this.coyoteTimer > 0)) {
        // ── Normal jump ──
        this.vy = JUMP_FORCE;
        this.grounded = false;
        this.coyoteTimer = 0;
        this.wallJumpJustFired = true;
        if (typeof SFX !== 'undefined') SFX.jump();
      } else if (jumpPressed && !this.grounded && this.coyoteTimer <= 0 &&
                 (this.wallSliding || this.wallJumpCoyote > 0) && !this.wallJumpJustFired) {
        // ── Wall jump: launch away from the wall ──
        this.vy = WALL_JUMP_FORCE;
        this.vx = -this.wallNormal * WALL_JUMP_H_SPEED;
        this.facing = -this.wallNormal; // face away from wall
        this.wallJumpCoyote = 0;        // consume coyote
        this.wallJumpJustFired = true;  // prevent double wall-jump
        this.invincibleTimer = Math.max(this.invincibleTimer, 8); // brief i-frames
        if (typeof SFX !== 'undefined') SFX.wallJump();
      }
    } else if (this.hitStunTimer > 0) {
      // Let knockback decay on its own instead of holding it or fighting stale input.
      this.vx *= 0.92;
    }

    // ── Regular Dash ────────────────────────────────────────────────────────
    if ((wasJustPressed('ShiftLeft') || wasJustPressed('ShiftRight') || wasJustPressed('KeyX')) &&
        this.dashCooldown <= 0 && !this.dashing) {
      this.dashing = true;
      this.dashTimer = DASH_DURATION;
      this.dashChain = Math.min(this.dashChain + 1, DASH_CHAIN_MAX);
      this.dashChainTimer = 0;
      // Slight cooldown increase per chain (f0.5s per extra chain)
      this.dashCooldown = DASH_COOLDOWN + (this.dashChain - 1) * 10;
      // Momentum blend: preserve some existing velocity for curving/accelerating
      const momentumBlend = 0.3 + this.dashChain * 0.1; // more momentum on higher chains
      this.vx = this.facing * DASH_SPEED * (1 - momentumBlend) + this.vx * momentumBlend;
      this.vy *= (1 - momentumBlend); // preserve some vertical momentum too
      if (typeof SFX !== 'undefined') SFX.dash();
    }

    if (this.dashing) {
      this.dashTimer--;
      if (this.dashTimer <= 0) {
        this.dashing = false;
        // Preserve more momentum when chaining (parkour flow)
        this.vx *= 0.6 + this.dashChain * 0.08;
      }
    }
    if (this.dashCooldown > 0) this.dashCooldown--;
    if (this.dashChainTimer > 0) this.dashChainTimer++;
    // Reset chain after gap (120 frames = 2s) or on ground
    if (this.dashChainTimer >= 120 || (this.grounded && this.dashChain > 0)) {
      this.dashChain = 0;
      this.dashChainTimer = 0;
    }

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

    // ── Attack input: hold to charge, release to fire — requires the Charged
    // Attack ability (crag_altar). Without it, Z/J only ever fires the quick
    // normal attack on tap; the charge/heavy-attack system doesn't exist yet.
    if (abilityState.hasChargedAttack) {
      // Press Z/J with no cooldown → start charging (don't fire yet)
      if ((wasJustPressed('KeyZ') || wasJustPressed('KeyJ')) &&
          this.attackCooldown <= 0 && !this.ducking &&
          !this.charging && !this.parrying) {
        this.charging = true;
        this.chargeTimer = 0;
        this.fullyCharged = false;
      }

      // While holding, accumulate charge
      if (this.charging && (isPressed('KeyZ') || isPressed('KeyJ'))) {
        this.chargeTimer++;
        if (this.chargeTimer >= CHARGE_FULL) {
          this.chargeTimer = CHARGE_FULL;
          if (!this.fullyCharged) {
            this.fullyCharged = true;
            if (typeof SFX !== 'undefined') SFX.chargeFull();
          }
        }
      }

      // Cancel charge if conditions no longer met
      if (this.charging && (this.ducking || this.attackCooldown > 0)) {
        this.charging = false;
        this.chargeTimer = 0;
        this.fullyCharged = false;
      }

      // Release Z/J → fire attack
      if (this.charging && !isPressed('KeyZ') && !isPressed('KeyJ')) {
        this.charging = false;

        // Directional attack based on input
        if (isPressed('ArrowUp') || isPressed('KeyW')) {
          this.attackDirection = 'up';
        } else if (isPressed('ArrowDown') || isPressed('KeyS')) {
          this.attackDirection = 'down';
        } else {
          this.attackDirection = 'forward';
        }

        if (this.chargeTimer >= CHARGE_TAP) {
          // ── Heavy attack ──
          this.attacking = true;
          this.attackTimer = ATTACK_DURATION + 4; // slightly longer animation
          this.attackCooldown = ATTACK_COOLDOWN + 8; // longer recovery
          this.heavy = true;
          this.heavyCharge = this.chargeTimer / CHARGE_FULL; // 0-1 charge ratio
          if (typeof SFX !== 'undefined') SFX.heavyAttack();
        } else {
          // ── Normal attack (quick tap) ──
          this.attacking = true;
          this.attackTimer = ATTACK_DURATION;
          this.attackCooldown = ATTACK_COOLDOWN;
          this.heavy = false;
          if (typeof SFX !== 'undefined') SFX.attack();
        }
        this.dashRefundedThisAttack = false; // Phase 1.8: one dash refund per attack
        this.hitTargetsThisSwing.clear();
        this.chargeTimer = 0;
        this.fullyCharged = false;
      }
    } else if ((wasJustPressed('KeyZ') || wasJustPressed('KeyJ')) &&
               this.attackCooldown <= 0 && !this.ducking && !this.parrying) {
      // No Charged Attack yet — Z/J always fires the quick attack immediately,
      // no charge timer, no heavy branch, no charge VFX.
      if (isPressed('ArrowUp') || isPressed('KeyW')) {
        this.attackDirection = 'up';
      } else if (isPressed('ArrowDown') || isPressed('KeyS')) {
        this.attackDirection = 'down';
      } else {
        this.attackDirection = 'forward';
      }
      this.attacking = true;
      this.attackTimer = ATTACK_DURATION;
      this.attackCooldown = ATTACK_COOLDOWN;
      this.heavy = false;
      if (typeof SFX !== 'undefined') SFX.attack();
      this.dashRefundedThisAttack = false;
      this.hitTargetsThisSwing.clear();
    }

    // ── Parry: tap Z during cooldown (instead of attacking) ────────────────
    if ((wasJustPressed('KeyZ') || wasJustPressed('KeyJ')) &&
        !this.attacking && this.attackCooldown > 0 && this.parryCooldown <= 0 &&
        !this.ducking && !this.parrying) {
      this.parrying = true;
      this.parryTimer = PARRY_WINDOW; // 10 frames to deflect
      this.parryCooldown = PARRY_COOLDOWN; // 60 frames between parries
      if (typeof SFX !== 'undefined') SFX.parry();
    }

    if (this.parrying) {
      this.parryTimer--;
      if (this.parryTimer <= 0) { this.parrying = false; }
    }
    if (this.parryCooldown > 0) this.parryCooldown--;

    if (this.attacking) {
      this.attackTimer--;
      if (this.attackTimer <= 0) {
        this.attacking = false;
        this.heavy = false; // clear heavy flag after animation
      }
    }
    if (this.attackCooldown > 0) this.attackCooldown--;

    // ── Shard Shot — hold to aim, release to fire (expansion §0.1) ─────────
    // Press V/N: start aiming; a glowing dotted arc appears (see draw()).
    // Hold R (up) or T (down) while aiming: tilt the arc smoothly.
    // Release: fire along the arc. A quick tap = instant forward shot.
    this.shardShotFired = false;
    if ((wasJustPressed('KeyV') || wasJustPressed('KeyN')) &&
        abilityState.hasShardShot && abilityState.shardShotCooldown <= 0 &&
        !this.shardAiming) {
      this.shardAiming = true;
      this.shardAimTimer = 0;
      this.shardAimVy = 0;
    }
    if (this.shardAiming) {
      if (isPressed('KeyV') || isPressed('KeyN')) {
        this.shardAimTimer++;
        if (isPressed('KeyR')) {          // R for up
          this.shardAimVy = Math.max(this.shardAimVy - SHARD_AIM_TILT_RATE, SHARD_AIM_VY_MIN);
        } else if (isPressed('KeyT')) {   // T for down
          this.shardAimVy = Math.min(this.shardAimVy + SHARD_AIM_TILT_RATE, SHARD_AIM_VY_MAX);
        }
      } else {
        this.shardAiming = false;
        this.shardShotFired = true; // game.js consumes this + shardAimVy
      }
    }

    // ── Physics ─────────────────────────────────────────────────────────────
    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;

    // Platform collision
    this.grounded = false;

    // ── Wall contact detection ──
    // Detect wall contact each frame. wallNormal is NOT zeroed here —
    // the movement block reads wallNormal from the previous frame (since
    // collision runs after movement). We only overwrite it when we detect
    // a new contact, otherwise it naturally decays (wall jump coyote).
    let wallTouchThisFrame = false;

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
        // ── Horizontal collision + wall contact detection ──
        // Detect wall when vertically overlapping the platform edge.
        // Works even when vx==0 (standing against wall / sliding down).
        if (this.y + this.height > plat.y + 4 && this.y < plat.y + plat.h) {
          // Right side of player touching left side of platform
          if (this.x + this.width >= plat.x && this.x + this.width < plat.x + 10 && this.vx >= 0) {
            this.x = plat.x - this.width;
            if (this.vx > 0) this.vx = 0;
            this.wallNormal = 1; // right side touching wall → wall is on right
            wallTouchThisFrame = true;
          }
          // Left side of player touching right side of platform
          if (this.x <= plat.x + plat.w && this.x > plat.x + plat.w - 10 && this.vx <= 0) {
            this.x = plat.x + plat.w;
            if (this.vx < 0) this.vx = 0;
            this.wallNormal = -1; // left side touching wall → wall is on left
            wallTouchThisFrame = true;
          }
        }
      }
    }

    // ── Wall jump coyote: preserve wall direction briefly after losing contact ──
    // wallNormal persists from last contact until coyote expires. The movement
    // block always reads the PREVIOUS frame's wallNormal (collision runs after
    // movement), so there's a natural 1-frame coyote even without this logic.
    // This extends it to WALL_JUMP_COYOTE frames for a forgiving window.
    if (!wallTouchThisFrame && this.wallNormal !== 0) {
      this.wallJumpCoyote--;
      if (this.wallJumpCoyote <= 0) {
        this.wallNormal = 0;
      }
    } else if (wallTouchThisFrame) {
      this.wallJumpCoyote = WALL_JUMP_COYOTE;
    }

    // `bounds.groundY` used to be an invisible, always-on floor here — caught
    // the player at that y no matter what x they were at, even over a real
    // gap with no platform underneath. That silently made every "pit" and
    // `pitDeathY` unreachable in normal play (see roadmap.md Phase 12/13 —
    // the room linter already modeled gaps as real gaps with no floor;
    // this was the one place actual gameplay disagreed with that model).
    // Standing now comes ONLY from real platforms in the loop above; falling
    // past all of them is governed by `pitDeathY` in game.js (or nothing, if
    // a room doesn't set one — matches the project's no-fall-death-by-
    // default rule).

    if (this.justLanded) {
      this.justLandedTimer++;
      if (this.justLandedTimer > 10) { this.justLanded = false; this.justLandedTimer = 0; }
    }

    if (this.x < bounds.left) this.x = bounds.left;
    if (this.x + this.width > bounds.right) this.x = bounds.right - this.width;

    if (this.invincibleTimer > 0) { this.invincibleTimer--; this.flashTimer++; }
    if (this.hitStunTimer > 0) this.hitStunTimer--;
  }

  getAttackHitbox() {
    if (!this.attacking) return null;
    const dir = this.attackDirection;
    if (dir === 'up') {
      return {
        x: this.x - 5,
        y: this.y - ATK_UP_H + 8,
        width: ATK_UP_W + 10,
        height: ATK_UP_H,
        dir: 'up'
      };
    }
    if (dir === 'down') {
      return {
        x: this.x - 5,
        y: this.y + this.height - 4,
        width: ATK_DN_W + 10,
        height: ATK_DN_H,
        dir: 'down'
      };
    }
    // forward (default)
    return {
      x: this.facing === 1 ? this.x + this.width : this.x - ATK_FWD_W,
      y: this.y + 6,
      width: ATK_FWD_W,
      height: ATK_FWD_H,
      dir: 'forward'
    };
  }

  // `sourceX` (the hitting enemy's x) is optional — when given, applies a
  // small knockback impulse + brief hitstun away from the source, mirroring
  // the convention already used by Enemy.takeDamage(dmg, sourceX, ...).
  takeDamage(dmg, sourceX) {
    if (this.invincibleTimer > 0) return;
    this.health -= dmg;
    this.invincibleTimer = INVINCIBLE_FRAMES;
    // Stillpoint breaks on taking damage
    if (this.stillpointActive) {
      this.stillpointActive = false;
      if (typeof SFX !== 'undefined') SFX.stillpointEnd();
    }
    if (sourceX !== undefined) {
      const dir = (this.x + this.width / 2 > sourceX) ? 1 : -1;
      this.vx = dir * 4;
      this.vy = -3;
      this.hitStunTimer = 10;
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

    // ── Parry flash ──────────────────────────────────────────────────────
    if (this.parrying) {
      const pPulse = this.parryTimer / PARRY_WINDOW; // 1->0 over parry window
      // Bright golden halo that fades as window closes
      ctx.fillStyle = `rgba(251, 191, 36, ${0.3 * pPulse})`;
      ctx.fillRect(this.x - 6, this.y - 6, this.width + 12, this.height + 12);
      // Sharp ring
      ctx.strokeStyle = `rgba(251, 191, 36, ${0.8 * pPulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);
      ctx.lineWidth = 1;
    }

    // ── Charge glow ──────────────────────────────────────────────────────
    if (this.charging) {
      const chargeFrac = this.chargeTimer / CHARGE_FULL; // 0->1
      const pulse = this.fullyCharged
        ? Math.sin(typeof frameCount !== 'undefined' ? frameCount * 0.3 : 0) * 0.3 + 0.7
        : 0.8;
      // Expanding amber halo proportional to charge
      const haloSize = 4 + chargeFrac * 8;
      ctx.fillStyle = `rgba(251, 146, 60, ${0.15 * chargeFrac * pulse})`;
      ctx.fillRect(this.x - haloSize, this.y - haloSize, this.width + haloSize * 2, this.height + haloSize * 2);
      // Ring that fills with charge
      ctx.strokeStyle = `rgba(251, 146, 60, ${0.5 * chargeFrac * pulse})`;
      ctx.lineWidth = 1 + chargeFrac * 2;
      ctx.strokeRect(this.x - 2 - chargeFrac * 3, this.y - 2 - chargeFrac * 3,
        this.width + 4 + chargeFrac * 6, this.height + 4 + chargeFrac * 6);
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

    // ── Dash trail (chain-aware) ───────────────────────────────────────────
    if (this.dashing) {
      const chainIntensity = this.dashChain / DASH_CHAIN_MAX; // 0-1
      const trailCount = 2 + this.dashChain; // more ghosts on higher chains
      const baseAlpha = 0.25 + chainIntensity * 0.25;
      // Color shifts from purple → cyan as chain increases
      const r = Math.round(196 - chainIntensity * 93);
      const g = Math.round(181 + chainIntensity * 51);
      const b = Math.round(253 - chainIntensity * 4);
      const color = `rgba(${r}, ${g}, ${b}`;
      for (let i = 1; i <= trailCount; i++) {
        ctx.globalAlpha = baseAlpha - i * 0.05;
        ctx.fillStyle = `${color}, ${baseAlpha - i * 0.05})`;
        ctx.fillRect(this.x - this.vx * i * 1.2, this.y, this.width, this.height);
      }
      ctx.globalAlpha = 1;
      // Chain sparkles at max chain
      if (this.dashChain >= DASH_CHAIN_MAX) {
        ctx.fillStyle = 'rgba(103, 232, 249, 0.6)';
        for (let i = 0; i < 3; i++) {
          const sx = this.x + Math.random() * this.width;
          const sy = this.y + Math.random() * this.height;
          ctx.fillRect(sx, sy, 2, 2);
        }
      }
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

    // ── Attack slash arc (directional) ────────────────────────────────────
    if (this.attacking) {
      const atk = this.getAttackHitbox();
      if (atk) {
        const progress = 1 - this.attackTimer / ATTACK_DURATION;

        if (atk.dir === 'up') {
          // ── Up-slash: vertical arc in facing direction ──
          const originX = this.x + this.width / 2;
          const originY = this.y + this.height * 0.3;
          const arcLen = 50;
          const arcSpan = Math.PI * 0.65 * Math.min(1, progress * 1.5);
          const facing = this.facing || 1;

          const leadAngle = -Math.PI / 2 + facing * arcSpan;
          ctx.strokeStyle = `rgba(255, 248, 255, ${0.9 - progress * 0.5})`;
          ctx.lineWidth = 3.5 - progress * 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(originX, originY);
          ctx.lineTo(originX + Math.cos(leadAngle) * arcLen, originY + Math.sin(leadAngle) * arcLen);
          ctx.stroke();

          for (let i = 0; i < 6; i++) {
            const t = i / 6;
            const a = -Math.PI / 2 + t * facing * arcSpan;
            const lineAlpha = (0.12 + t * 0.35) * (1 - progress * 0.6);
            ctx.strokeStyle = `rgba(224, 215, 255, ${lineAlpha})`;
            ctx.lineWidth = 1 + t * 1.5;
            ctx.beginPath();
            ctx.moveTo(originX, originY);
            ctx.lineTo(originX + Math.cos(a) * arcLen, originY + Math.sin(a) * arcLen);
            ctx.stroke();
          }

          if (progress > 0.35) {
            const flashAlpha = Math.max(0, Math.sin(progress * Math.PI) * 1.2);
            ctx.fillStyle = `rgba(255, 250, 255, ${flashAlpha * 0.9})`;
            ctx.beginPath();
            ctx.arc(originX + Math.cos(leadAngle) * arcLen, originY + Math.sin(leadAngle) * arcLen, 4 + progress * 5, 0, Math.PI * 2);
            ctx.fill();
          }

        } else if (atk.dir === 'down') {
          // ── Down-slam: impact burst below player ──
          const originX = this.x + this.width / 2;
          const originY = this.y + this.height;
          const burstRadius = 35 * Math.min(1, progress * 2);

          // Radial impact lines
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            const lineAlpha = (0.3 - progress * 0.2) * (1 - progress * 0.4);
            ctx.strokeStyle = `rgba(255, 248, 255, ${Math.max(0, lineAlpha)})`;
            ctx.lineWidth = 2 - progress;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(originX, originY);
            ctx.lineTo(originX + Math.cos(a) * burstRadius, originY + Math.sin(a) * burstRadius * 0.5);
            ctx.stroke();
          }

          // Impact flash
          if (progress < 0.6) {
            const flashAlpha = Math.max(0, 1 - progress / 0.6) * 0.7;
            ctx.fillStyle = `rgba(255, 250, 255, ${flashAlpha})`;
            ctx.beginPath();
            ctx.ellipse(originX, originY, burstRadius * 1.2, burstRadius * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
          }

        } else {
          // ── Forward slash: horizontal arc (existing) ──
          const originX = this.facing === 1 ? this.x + this.width : this.x;
          const originY = this.y + this.height * 0.42;
          const arcLen = 48;
          const arcSpan = Math.PI * 0.72 * Math.min(1, progress * 1.5);
          const startAngle = this.facing === 1 ? -Math.PI * 0.62 : -Math.PI * 0.38;

          const leadAngle = startAngle + this.facing * arcSpan;
          ctx.strokeStyle = `rgba(255, 248, 255, ${0.9 - progress * 0.5})`;
          ctx.lineWidth = 3.5 - progress * 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(originX, originY);
          ctx.lineTo(originX + Math.cos(leadAngle) * arcLen, originY + Math.sin(leadAngle) * arcLen);
          ctx.stroke();

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

          if (progress > 0.35) {
            const flashAlpha = Math.max(0, Math.sin(progress * Math.PI) * 1.2);
            ctx.fillStyle = `rgba(255, 250, 255, ${flashAlpha * 0.9})`;
            ctx.beginPath();
            ctx.arc(originX + Math.cos(leadAngle) * arcLen, originY + Math.sin(leadAngle) * arcLen, 4 + progress * 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.lineCap = 'butt';
        ctx.lineWidth = 1;
      }
    }

    // Shard Shot aiming arc — visible while holding V/N (expansion §0.1).
    // Steps the REAL projectile math (same launch position, speed, and
    // gravity as game.js's useShardShot/Projectile), so the dotted parabola
    // shows exactly where the shot will fly.
    if (this.shardAiming && abilityState.hasShardShot) {
      let sx = (this.facing === 1 ? this.x + this.width : this.x - 8) + 4;
      let sy = this.y + this.height / 2 + 4;
      const svx = 8 * (this.facing || 1);
      let svy = this.shardAimVy;
      const pulse = Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.25) * 0.2 + 0.7;
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 6;
      for (let i = 0; i < 36; i++) {
        sx += svx;
        sy += svy;
        svy += 0.15; // Projectile gravity in game.js
        if (i % 3 !== 0) continue; // dotted, not solid
        ctx.globalAlpha = pulse * (1 - i / 44);
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // ── Wall slide indicator ──────────────────────────────────────────────
    // Positioned entirely in world space using wallNormal (which side the wall
    // is on) — no translate/scale trick needed, since wallNormal already tells
    // us the correct side regardless of which way the sprite is facing.
    if (this.wallSliding && this.wallNormal !== 0) {
      // Glow on the wall-facing side of the player
      const glowPulse = Math.sin(frameCount * 0.15) * 0.15 + 0.5;
      const cx = this.x + this.width / 2;
      const gx = cx + this.wallNormal * this.width * 0.3;
      const gy = this.y + this.height * 0.3;
      const gradient = ctx.createRadialGradient(gx, gy, 0, gx, gy, this.width * 1.5);
      gradient.addColorStop(0, `rgba(196, 181, 253, ${glowPulse})`);
      gradient.addColorStop(1, 'rgba(196, 181, 253, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(cx - this.width * 1.5, this.y - this.height * 0.5, this.width * 3, this.height * 2.5);

      // Small vertical sparks along the wall contact point
      ctx.fillStyle = `rgba(203, 245, 255, ${glowPulse * 0.6})`;
      for (let i = 0; i < 3; i++) {
        const sparkX = this.x + this.width / 2 + this.wallNormal * (this.width / 2 - 1);
        const sparkY = this.y + (i + 1) * (this.height / 4) + Math.sin(frameCount * 0.3 + i) * 2;
        ctx.fillRect(sparkX - 1, sparkY, 2, 2);
      }
    }

    ctx.restore();
  }
}