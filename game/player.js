// Player character
// `var` on the core movement feel constants too — same live-tuning
// convention as the dash/ability constants below (see ability_tester.html's
// "Movement Feel" section).
var GRAVITY = 0.6;
var JUMP_FORCE = -12;
var MOVE_SPEED = 4;
var DUCK_SPEED = 2;
// `var` on the dash tunables — no-op for normal play, lets
// editor/ability_tester.html poke live values via window.X for testing
// (same convention as ability.js's var'd constants).
var DASH_SPEED = 12;
// Sourced from game/attackVFX.js (2026-07-19) — single source of truth with
// editor/anim_editor.html's Dash dissection, which has no access to this
// file. Still `var`, so ability_tester.html's slider still live-tunes it.
var DASH_DURATION = DASH_VFX_DURATION;
var DASH_COOLDOWN = 30;
// Sourced from game/attackVFX.js (loaded before this file) — single source
// of truth with drawDashTrail()'s chain-tier math (2026-07-19).
const DASH_CHAIN_MAX = DASH_VFX_CHAIN_MAX;
const MAX_HEALTH = 6;
const INVINCIBLE_FRAMES = 90; // ~1.5s at 60fps
const COYOTE_FRAMES = 6; // 6 frames (~100ms at 60fps) – the sweet spot
const JUMP_BUFFER_FRAMES = 9; // ~150ms at 60fps — a jump pressed just before landing still fires on touchdown

// Wall Jump / Wall Slide
const WALL_SLIDE_SPEED = 1.5;     // reduced fall speed while sliding
const WALL_JUMP_FORCE = -10;      // vertical component of wall jump
const WALL_JUMP_H_SPEED = 7;      // horizontal away-from-wall component
const WALL_JUMP_COYOTE = 8;       // frames you can still wall-jump after losing contact
const WALL_JUMP_SAME_WALL_LOCK = 22; // frames a just-jumped-off wall stays un-grabbable

// Electromagnetic Golem's magnetism (The Polar Shift) — see the `polarity`
// platform-force loop in the physics block below. No effect anywhere a
// platform never sets `polarity`, so tuning these only matters for that
// one boss room.
const MAGNET_PULL_RANGE = 260;
const MAGNET_PULL_STRENGTH = 0.35;

// Attack
const ATTACK_WIDTH = 40;
const ATTACK_HEIGHT = 30;
// Sourced from game/attackVFX.js (loaded before this file) so the editor's
// "Dissect from current game" tool — which has no access to player.js — and
// the real game always agree on the swing's frame count (2026-07-19).
const ATTACK_DURATION = ATTACK_VFX_FRAME_COUNT;
const ATTACK_COOLDOWN = 18;
const ATTACK_DAMAGE = 1;

const ATK_POGO_VY = -11; // upward bounce on down-slam hit
// Directional attack hitbox sizes (ATK_FWD_W etc.) and the swing VFX
// drawing code used to live here — moved to game/attackVFX.js (2026-07-19)
// so editor/anim_editor.html can reuse the exact same math without loading
// this whole file. See getAttackHitbox()/draw()'s attack-VFX block below.

// Charged heavy attack (hold Z/J to charge, release to fire)
// CHARGE_TAP widened 5f -> 16f (2026-07-16, user feedback): 5f gave almost no
// margin for a normal tap — anything slightly slow released as a barely-
// charged "heavy" attack (wrong animation/hitbox, near-zero heavyCharge).
// 16f (~267ms) is still well short of a real charge attempt (CHARGE_FULL is
// 40f) but forgiving enough that a normal tap reliably reads as a tap.
const CHARGE_TAP = 16;      // frames under this counts as a tap (normal attack)
const CHARGE_FULL = 40;     // frames to reach full charge (~667ms)
var HEAVY_DAMAGE = 2;     // damage multiplier for full charge
var HEAVY_KNOCKBACK = 2.5; // knockback multiplier for full charge

// Shard Shot aiming (hold V/N to aim, release to fire — expansion §0.1)
const SHARD_AIM_TILT_RATE = 0.25;  // launch-vy change per frame while holding Up/Down
const SHARD_AIM_VY_MIN = -7;       // steepest upward launch
const SHARD_AIM_VY_MAX = 4;        // steepest downward launch (off-ledge shots)

// Parry — re-added 2026-07-27 as its own ability (abilityState.hasParry,
// mini-plot unlock like Reach) instead of overloading the attack button the
// way the original 2026-07-18-removed version did. Down is now tap/hold:
// hold past PARRY_TAP_MAX_HOLD frames = Duck/Crawl (unchanged), release
// before that = a timed Parry attempt (PARRY_WINDOW frames of deflect). See
// the Duck/Parry input block in update() and the collision gate in game.js.
const PARRY_STUN = 30;          // frames an enemy is stunned by a successful deflect
const PARRY_IFRAMES = 20;       // i-frames granted by a successful deflect
const PARRY_TAP_MAX_HOLD = 8;   // frames under this on release = a Parry tap, not a Duck hold
const PARRY_WINDOW = 10;        // frames the deflect window stays open after a tap

// Stillpoint (time-slow) — tap/hold timed model (Enemy_Design.pdf, replaces
// the old indefinite-toggle-drains-a-pip-per-60f mechanic 2026-07-16)
const FRACTURE_ABS_MAX = 4; // absolute ceiling on fractureMax, reached by finding all Fracture Pips
var STILLPOINT_HOLD_THRESHOLD = 20; // frames held before release counts as "Hold" not "Tap" (widened alongside CHARGE_TAP, same leniency fix)
const STILLPOINT_TAP_COST = 1;
const STILLPOINT_HOLD_COST = 3;
var STILLPOINT_TAP_DURATION_BASE = 25;   // 0.4s
var STILLPOINT_HOLD_DURATION_BASE = 90;  // 1.5s
var STILLPOINT_SLOW_BASE = 0.6;   // Lv0-2: 60% slow (gameTimeScale = 1 - this)
var STILLPOINT_SLOW_LV3 = 0.9;    // Lv3+: 90% slow (near-complete stop)

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
    // Bridges to game/animdata.js's data-driven attack system (2026-07-19).
    // Only takes effect for attacks that have a matching ANIM_DEFS entry —
    // see animKeyForAttack()/getAttackHitbox() below. Directions with no
    // entry keep using the hardcoded hitbox/VFX path exactly as before.
    this.animator = new Animator(this);
    // Second animator for movement/ability states (2026-07-19) — separate
    // from the attack animator above since an attack can play at the same
    // time as any of these (e.g. attacking mid-air). Covers idle/run/jump/
    // fall/duck/dash/phasedash/wallslide via playerBodyStateKey() below.
    this.bodyAnimator = new Animator(this);
    // Overlay animators — these draw ALONGSIDE the body/attack layers, not
    // instead of them (you can be idle AND have Stillpoint up, or running
    // AND aiming Shard Shot), so each gets tracked independently.
    this.stillpointAnimator = new Animator(this);
    this.shardAimAnimator = new Animator(this);
    this.shardBeamAnimator = new Animator(this);
    // The Gravity Ball is a detached, self-moving entity (its own
    // gravitonBallX/Y, not the player's x/y) — gets a synthetic mock entity
    // instead of `this`, matching how Echo (ability.js) already has its own
    // position separate from the player.
    // width/height re-synced each frame from GRAVITON_BALL_PULL_RADIUS
    // (ability.js — a live-tunable `var`, see editor/ability_tester.html)
    // right before drawing, so it stays correct even if that's poked live.
    this.gravBallEntity = { x: 0, y: 0, width: GRAVITON_BALL_PULL_RADIUS * 2, height: GRAVITON_BALL_PULL_RADIUS * 2, facing: 1 };
    this.gravBallAnimator = new Animator(this.gravBallEntity);
    // Per-swing hit tracking — cleared every time a new attack starts (see
    // the three spots that set `this.attacking = true`). Without this, an
    // enemy/wall that stays inside the (multi-frame) attack hitbox at
    // point-blank range took damage on every overlapping frame instead of
    // once per swing.
    this.hitTargetsThisSwing = new Set();
    this.echoAttackPending = false; // Phase Dash Lv3 — set true at swing start, consumed by game.js
    this.dashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashChain = 0;       // consecutive dash count (resets on ground/gap)
    this.dashChainTimer = 0;  // frames since last dash (for chain reset)
    this.invincibleTimer = 0;
    this.flashTimer = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.hitStunTimer = 0;   // frames of knockback after taking damage — suppresses directional input override, mirrors Enemy's hitStun

    this.phaseDashing = false;
    this.phaseDashTimer = 0;
    // Afterimage Strike (enemy_attack_vocabulary_plan.md) — set true the
    // moment this dash grazes an enemy carrying the phase_dash/
    // afterimage_strike counter, so game.js's overlap check only arms one
    // hazard per dash even if the dash clips several such enemies or stays
    // overlapped for multiple frames. Reset on every new dash start below.
    this._afterimageArmed = false;
    // Enemies touched during the current dash — see the dash-start reset
    // above for why this exists. Empty set outside of a dash; game.js only
    // ever reads it while non-empty entries could matter (post-dash overlap).
    this.phasedThroughEnemies = new Set();

    // Graviton Surge (Enemy_Design.pdf, built 2026-07-16)
    this.gravitonActive = false;
    this.gravitonTimer = 0;
    // Lv2+ tap/hold decision pending (2026-07-19 fix — see below) — true
    // from the moment the button is pressed until either the tap threshold
    // is crossed (commits to the Gravity Ball) or the button is released
    // first (commits to the tap flip).
    this.gravitonSurgeCharging = false;
    this.gravitonHoldTimer = 0;
    this.gravitonBallCharging = false;
    this.gravitonBallTimer = 0;
    this.gravitonBallPop = false;
    this.gravitonBallX = 0;
    this.gravitonBallY = 0;
    this.gravitonBallFlying = false; // travelling forward+upward after release, before it explodes
    this.gravitonBallFlightTimer = 0;
    this.gravitonBallVx = 0;
    this.gravitonBallVy = 0;

    // Void Tether (Enemy_Design.pdf, built 2026-07-16)
    this.voidTetherFired = false;
    this.tether = null; // { targetEnemy | targetPoint, timer } while a pull is in flight — see game.js

    this.shardShotFired = false;
    this.shardAiming = false;   // holding V/N — aiming arc visible (see draw())
    this.shardAimTimer = 0;     // frames the aim has been held
    this.shardAimVy = 0;        // vertical launch velocity of the aimed shot

    // Shard Shot Lv3 Beam — continuous channel, not a fired projectile
    // (Enemy_Design.pdf, reworked 2026-07-16 per user clarification)
    this.beaming = false;
    this.beamAngle = 0;      // radians, 0 = straight along facing
    this.beamDrainTimer = 0; // frames since last 1-pip drain tick

    // Duck / crouch — Down is tap/hold: see the Duck/Parry block in update()
    this.ducking = false;
    this.normalHeight = 32;
    this.duckHeight = 16;
    this.downHoldTimer = 0;   // frames Down has been held this press
    this.downHeld = false;    // was Down held last frame (tap/hold decision)
    this.parryTimer = 0;      // frames left in an active Parry deflect window

    // Stillpoint / Fracture meter
    this.fractureMeter = 0;        // current pips, 0-fractureMax
    this.fractureMax = 0;          // cap on fractureMeter; starts at 0 (unusable) until Fracture Pips are found, up to FRACTURE_ABS_MAX
    // Which platform we're standing on this frame — set by the collision
    // loop. Used to carry the player on `moving` platforms and to know
    // whether a drop-through is legal.
    this.standingPlat = null;
    this.dropThroughTimer = 0;     // frames the oneWay drop-through stays armed
    this.stillpointActive = false;
    this.stillpointCharging = false; // holding the button, deciding tap vs hold
    this.stillpointHoldTimer = 0;
    this.stillpointTimer = 0;      // frames left in the current activation (fixed duration, not meter-drain-based)
    this.stillpointDuration = 1;   // full length of the current activation (HUD pip fade divisor)
    this.stillpointSlow = 0;       // 0-1, how much enemies/projectiles are slowed this activation
    this.stillpointHealed = 0;     // HP healed via lifesteal this activation, capped by stillpointLifestealCap()

    // Squash/stretch
    this.justLanded = false;
    this.justLandedTimer = 0;

    // Charged heavy attack
    this.charging = false;
    this.chargeTimer = 0;    // frames held (0-CHARGE_FULL)
    this.fullyCharged = false;

    // Wall jump / wall slide
    this.wallSliding = false;       // currently sliding down a wall
    this.wallNormal = 0;            // -1 = touching left wall, 1 = touching right wall, 0 = none
    this.wallJumpCoyote = 0;        // frames after losing wall contact where wall-jump still works
    this.wallJumpJustFired = false; // prevent double-wall-jump mid-air
    // Same-wall re-grab lock (2026-07-27) — without this, wall-jumping off a
    // wall and just drifting straight back into it lets you climb ANY single
    // wall indefinitely by spamming wall-jump in place, which would trivialize
    // any vertical shaft a level is trying to gate behind a real traversal
    // ability. Jumping off a wall with a given normal locks THAT normal out
    // for a short window (or until grounded) — legitimate ping-pong climbing
    // between two FACING walls (a real, skill-based Super Metroid-style tech)
    // is untouched, since the opposite wall has the opposite normal.
    this._wallJumpLockNormal = 0;
    this._wallJumpLockTimer = 0;

    // Variable jump height / short hop (user feedback 2026-07-16): releasing
    // jump early cuts the ascent short exactly once per jump.
    this.jumping = false;
    this.jumpCut = false;

    // Electromagnetic Golem's magnetism (2026-07-26) — null everywhere
    // except The Polar Shift's boss room, where `polarity`-carrying
    // platforms (see the physics block below) can set it via contact.
    this.magnetCharge = null;

    // Sovereign's Phase 3 Stillpoint (2026-07-26) — set from game.js right
    // before update() runs, to the same slow value whenever
    // boss.bossStillpointActive. Multiplies position integration and
    // per-frame countdown timers below (cooldowns, hitStun, invincibility)
    // — mirrors exactly how gameTimeScale already scales enemies (enemy.js's
    // `_ts` pattern), just for the player instead. Deliberately does NOT
    // scale input-latching decision state (chargeTimer, stillpointHoldTimer)
    // so the player's own choices stay legible even while their resolution
    // in the world is slowed, the same way a slowed enemy in the player's
    // own Stillpoint still "decides" instantly but moves slowly.
    this.timeScale = 1;
  }

  // Strength Lv2+ (old Lv1+): attack speed +15% (18f cooldown -> 15f). Lv1
  // (2026-07-27, the new cheap entry tier) is a smaller partial step, 18f ->
  // 17f. Lv5 Limit Break: an additional +25% on top (Enemy_Design.pdf).
  getAttackCooldown() {
    const raw = (typeof statUpgrades !== 'undefined' && statUpgrades.strength) || 0;
    let cd = oldTier('strength') >= 1 ? 15 : (raw >= 1 ? 17 : ATTACK_COOLDOWN);
    if (typeof limitBreak !== 'undefined' && limitBreak.active && limitBreak.ability === 'strength') cd = Math.round(cd * 0.75);
    return cd;
  }

  // Phase Dash Lv1+: "Dash becomes 8-directional (aim with WASD/arrows).
  // Applies to the regular dash (C) too." (Enemy_Design.pdf). Below Lv1,
  // or with no directional input held, falls back to the old
  // facing-only horizontal dash. Returns null (no override) below Lv1.
  getDashDirection(speed) {
    if (oldTier('phase_dash') < 1) return null;
    let dx = (isActionPressed('moveLeft') ? -1 : 0) + (isActionPressed('moveRight') ? 1 : 0);
    let dy = (isActionPressed('aimUp') ? -1 : 0) + (isActionPressed('aimDown') ? 1 : 0);
    if (dx === 0 && dy === 0) return null;
    const len = Math.hypot(dx, dy);
    return { vx: (dx / len) * speed, vy: (dy / len) * speed };
  }

  // Called by game.js when a melee hit lands. Blocked during Stillpoint or
  // Limit Break — "prevents infinite chaining" (Global Rules, Enemy_Design.pdf).
  gainFracture() {
    if (this.stillpointActive) return;
    if (typeof limitBreak !== 'undefined' && limitBreak.active) return;
    if (this.fractureMeter < this.fractureMax) {
      this.fractureMeter++;
      if (typeof SFX !== 'undefined') SFX.fractureGain();
    }
  }

  // Called on Fracture Pip pickup — raises the cap, never the current value
  gainFractureMax() {
    this.fractureMax = Math.min(FRACTURE_ABS_MAX, this.fractureMax + 1);
  }

  // Whether a dash/dodge input right now may cancel out of an in-progress
  // attack. Data-driven attacks (player_attack_forward/up, animdata.js) use
  // their authored cancelableFrom frame flag — recovery frames only, so you
  // can't cancel a swing before its hit resolves but can bail into a dodge
  // once it has. Attacks without ANIM_DEFS data yet (down, heavy) fall back
  // to the same recovery-window shape by time instead: cancelable once under
  // 30% of the swing's total duration remains.
  attackCancelable() {
    if (!this.attacking) return true;
    if (this.animator.def) return this.animator.canCancel();
    const total = this.heavy ? ATTACK_DURATION + 4 : ATTACK_DURATION;
    return this.attackTimer <= total * 0.3;
  }

  update(bounds, platforms) {
    if (typeof updateEchoDistractDuration === 'function') updateEchoDistractDuration();
    if (typeof updateLimitBreak === 'function') updateLimitBreak();

    // ── Coyote Timer ────────────────────────────────────────────────────────
    if (this.grounded) {
      this.coyoteTimer = COYOTE_FRAMES;
      this.wallJumpJustFired = false; // can wall-jump again after landing
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer--;
    }

    // ── Jump Buffer ──────────────────────────────────────────────────────────
    // Runs every frame regardless of dashing/hitstun/etc, same as the coyote
    // timer above — a jump pressed slightly early (mid-dash, right before
    // landing) still counts down and fires the instant the grounded/coyote
    // branches below become eligible again.
    if (wasActionJustPressed('jump')) {
      this.jumpBufferTimer = JUMP_BUFFER_FRAMES;
    } else if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer--;
    }

    // ── Stillpoint — tap (1 Pip, short) / hold (3 Pips, long) ──────────────
    // Press-and-release quickly (Tap) or hold past STILLPOINT_HOLD_THRESHOLD
    // (Hold) to decide which variant fires, same press/decide-on-release
    // shape as the charged attack below (Enemy_Design.pdf Rule 2).
    if (wasActionJustPressed('stillpoint') && abilityState.hasStillpoint && !this.stillpointActive && !this.stillpointCharging) {
      this.stillpointCharging = true;
      this.stillpointHoldTimer = 0;
    }
    if (this.stillpointCharging) {
      if (isActionPressed('stillpoint')) {
        this.stillpointHoldTimer++;
      } else {
        this.stillpointCharging = false;
        const isHold = this.stillpointHoldTimer >= STILLPOINT_HOLD_THRESHOLD;
        const cost = isHold ? STILLPOINT_HOLD_COST : STILLPOINT_TAP_COST;
        if (this.fractureMeter >= cost) {
          this.fractureMeter -= cost;
          const rawStillpoint = (typeof statUpgrades !== 'undefined' && statUpgrades.stillpoint) || 0;
          // Lv2+ (old Lv1+): duration +25%. Lv1 (2026-07-27, the new cheap
          // entry tier): a smaller +10% partial step toward that.
          const durationMult = oldTier('stillpoint') >= 1 ? 1.25 : (rawStillpoint >= 1 ? 1.1 : 1);
          const baseDuration = isHold ? STILLPOINT_HOLD_DURATION_BASE : STILLPOINT_TAP_DURATION_BASE;
          this.stillpointTimer = Math.round(baseDuration * durationMult);
          this.stillpointDuration = this.stillpointTimer; // full length, for the HUD pip fade
          // Lv4 Limit Break reads as "time stops" but must never actually
          // reach 0 (user feedback 2026-07-16: a literal stop froze
          // everything, player included, instead of the intended "as close
          // to stopped as possible while everything keeps running"). See
          // also the Math.max floor on gameTimeScale itself in game.js as
          // a hard safety net regardless of this value.
          const isLimitBreak = limitBreak.active && limitBreak.ability === 'stillpoint';
          // Lv4 (old Lv3): slow increases to 90%.
          this.stillpointSlow = isLimitBreak ? 0.95 : (oldTier('stillpoint') >= 3 ? STILLPOINT_SLOW_LV3 : STILLPOINT_SLOW_BASE);
          this.stillpointActive = true;
          this.stillpointHealed = 0;
          if (typeof SFX !== 'undefined') SFX.stillpointActivate();
        }
      }
    }

    if (this.stillpointActive) {
      this.stillpointTimer -= this.timeScale;
      if (this.stillpointTimer <= 0) {
        this.stillpointActive = false;
        if (typeof SFX !== 'undefined') SFX.stillpointEnd();
      }
    }

    // ── Duck / Crouch + Parry — Down is tap/hold, same press/decide-on-
    // release shape as Stillpoint above. Holding past PARRY_TAP_MAX_HOLD
    // frames commits to Duck/Crawl; releasing before that instead opens a
    // timed Parry window (deflect check lives in game.js's collision pass —
    // see tryParryDeflect()). Gated on hasParry, grounded, and
    // parryCooldown (long — see PARRY_COOLDOWN in ability.js): without the
    // ability, mid-air, or still cooling down, a quick tap just does
    // nothing (no accidental duck-flicker, no free parry spam).
    // Timer tracks the raw key (not grounded) so jumping mid-hold can't be
    // misread as a "release" and fire a spurious parry.
    const downKey = isActionPressed('aimDown');
    if (downKey) {
      this.downHoldTimer++;
      if (!this.ducking && this.grounded && this.downHoldTimer >= PARRY_TAP_MAX_HOLD) {
        this.y += this.normalHeight - this.duckHeight;
        this.height = this.duckHeight;
        this.ducking = true;
      }
    } else {
      if (this.downHeld && !this.ducking && this.grounded && abilityState.hasParry &&
          abilityState.parryCooldown <= 0 &&
          this.downHoldTimer > 0 && this.downHoldTimer < PARRY_TAP_MAX_HOLD) {
        this.parryTimer = PARRY_WINDOW;
        abilityState.parryCooldown = PARRY_COOLDOWN;
      }
      this.downHoldTimer = 0;
    }
    if (this.ducking && (!this.grounded || !downKey)) {
      this.y -= this.normalHeight - this.duckHeight;
      this.height = this.normalHeight;
      this.ducking = false;
    }
    this.downHeld = downKey;
    if (this.parryTimer > 0) this.parryTimer -= this.timeScale;

    // ── Movement ───────────────────────────────────────────────────────────
    const _roomGravDirForMove = typeof getRoomGravityDir === 'function' ? getRoomGravityDir() : 'down';
    if (!this.dashing && !this.phaseDashing && this.hitStunTimer <= 0 &&
        (_roomGravDirForMove === 'left' || _roomGravDirForMove === 'right')) {
      // Gravity Collapse Core (2026-07-26): once gravity points sideways,
      // the current floor is a vertical surface — moveLeft/moveRight would
      // read as "toward/away from it," not "along it," so walking instead
      // reads off the existing aimUp/aimDown input actions (already real,
      // otherwise-unclaimed input during normal ground movement — see the
      // Shard Shot aim/beam-angle code above), and `jump` pushes directly
      // away from the current gravity direction instead of always "up."
      // FIRST-DRAFT control mapping, not confirmed by playtest — flagged
      // as a judgment call in the boss-buildout plan, easy to swap for a
      // different axis if it doesn't feel right in play. Wall-slide/
      // wall-jump are skipped entirely here (and for 'up' gravity below)
      // — their whole premise, sliding down a vertical wall while gravity
      // pulls straight down, has no clear meaning once a wall IS the
      // floor; deliberately out of scope for v1.
      const speed = this.ducking ? DUCK_SPEED : MOVE_SPEED;
      if (isActionPressed('aimUp')) {
        this.vy = -speed;
      } else if (isActionPressed('aimDown')) {
        this.vy = speed;
      } else {
        this.vy *= 0.7;
      }
      const jumpPressed = wasActionJustPressed('jump');
      if ((jumpPressed || this.jumpBufferTimer > 0) && (this.grounded || this.coyoteTimer > 0)) {
        this.vx = _roomGravDirForMove === 'right' ? -JUMP_FORCE : JUMP_FORCE; // away from gravity
        this.facing = _roomGravDirForMove === 'right' ? -1 : 1;
        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.jumping = true;
        this.jumpCut = false;
        if (typeof SFX !== 'undefined') SFX.jump();
      }
      if (this.jumping && !this.jumpCut && !isActionPressed('jump')) {
        this.jumpCut = true;
        this.vx *= 0.45;
      }
      if (this.grounded) this.jumping = false;
    } else if (!this.dashing && !this.phaseDashing && this.hitStunTimer <= 0) {
      const speed = this.ducking ? DUCK_SPEED : MOVE_SPEED;
      if (isActionPressed('moveLeft')) {
        this.vx = -speed;
        this.facing = -1;
      } else if (isActionPressed('moveRight')) {
        this.vx = speed;
        this.facing = 1;
      } else {
        this.vx *= 0.7;
      }

      // ── Wall slide: slow descent when holding toward a wall ── (skipped
      // during Gravity Collapse Core's 'up' room-gravity too — see the
      // scope note in the sideways-gravity branch above)
      const holdingTowardWall = _roomGravDirForMove === 'down' &&
                                ((this.wallNormal === 1 && isActionPressed('moveRight')) ||
                                 (this.wallNormal === -1 && isActionPressed('moveLeft')));
      const sameWallLocked = this._wallJumpLockTimer > 0 && this.wallNormal === this._wallJumpLockNormal;
      if (!this.grounded && this.wallNormal !== 0 && holdingTowardWall && this.vy >= 0 && !sameWallLocked) {
        this.wallSliding = true;
        if (this.vy > WALL_SLIDE_SPEED) {
          this.vy = WALL_SLIDE_SPEED;
        }
      } else {
        this.wallSliding = false;
      }

      // Block jumping while ducking
      const jumpPressed = wasActionJustPressed('jump');
      // ── Drop through a oneWay platform: hold down + jump while standing
      // on one. Arms a short timer the collision loop uses to ignore that
      // platform, so you fall clear instead of instantly re-landing.
      if (this.dropThroughTimer > 0) this.dropThroughTimer--;
      if (jumpPressed && this.grounded && isActionPressed('aimDown') &&
          this.standingPlat && this.standingPlat.oneWay) {
        this.dropThroughTimer = 12;
        this.grounded = false;
        this.standingPlat = null;
      } else if ((jumpPressed || this.jumpBufferTimer > 0) && (this.grounded || this.coyoteTimer > 0)) {
        // ── Normal jump ── (flipped during Graviton Surge, or while
        // Gravity Collapse Core's room gravity points 'up' — both mean
        // "away from the floor" is the +y direction, not -y)
        this.vy = (this.gravitonActive || _roomGravDirForMove === 'up') ? -JUMP_FORCE : JUMP_FORCE;
        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.wallJumpJustFired = true;
        this.jumping = true;
        this.jumpCut = false;
        if (typeof SFX !== 'undefined') SFX.jump();
      } else if (_roomGravDirForMove === 'down' && jumpPressed && !this.grounded && this.coyoteTimer <= 0 &&
                 (this.wallSliding || this.wallJumpCoyote > 0) && !this.wallJumpJustFired) {
        // ── Wall jump: launch away from the wall ──
        this.vy = WALL_JUMP_FORCE;
        this.vx = -this.wallNormal * WALL_JUMP_H_SPEED;
        this.facing = -this.wallNormal; // face away from wall
        this._wallJumpLockNormal = this.wallNormal; // this exact wall un-grabbable for a bit
        this._wallJumpLockTimer = WALL_JUMP_SAME_WALL_LOCK;
        this.wallJumpCoyote = 0;        // consume coyote
        this.wallJumpJustFired = true;  // prevent double wall-jump
        this.jumping = true;
        this.jumpCut = false;
        this.invincibleTimer = Math.max(this.invincibleTimer, 8); // brief i-frames
        if (typeof SFX !== 'undefined') SFX.wallJump();
      }

      // ── Variable jump height (short hop) ─────────────────────────────────
      // Releasing jump early cuts the ascent short exactly once per jump —
      // works regardless of gravity direction since it just scales the
      // current vy toward zero, not a hardcoded sign (user feedback 2026-07-16).
      if (this.jumping && !this.jumpCut && !isActionPressed('jump')) {
        this.jumpCut = true;
        this.vy *= 0.45;
      }
      if (this.grounded) this.jumping = false;
    } else if (this.hitStunTimer > 0) {
      // Let knockback decay on its own instead of holding it or fighting stale input.
      this.vx *= 0.92;
    }

    // ── Dash / Phase Dash — merged onto one button (2026-07-16, user
    // feedback: "too many buttons... it just upgrades your first dash to a
    // phase dash, and during cooldown you only have the normal dash").
    // Phase Dash fires whenever it's unlocked and off its own (long)
    // cooldown; otherwise the same button falls back to a normal Dash on
    // its own (short, chainable) cooldown. Both still track their cooldowns
    // independently in the background — only the trigger is unified.
    if (wasActionJustPressed('dash') && !this.dashing && !this.phaseDashing && this.attackCancelable()) {
      if (abilityState.hasPhaseDash && abilityState.phaseDashCooldown <= 0) {
        // ── Phase Dash ──
        this.phaseDashing = true;
        this.phaseDashTimer = PHASE_DASH_DURATION;
        this._afterimageArmed = false;
        // Enemies actually touched during this dash (game.js's enemy-overlap
        // loop populates this) stay damage/push-immune even after
        // phaseDashTimer runs out, as long as the player is still
        // overlapping them — see the fix note by isTetherTarget in game.js.
        // Without this, a dash that reaches an enemy but doesn't fully
        // clear its far edge before PHASE_DASH_DURATION expires ends with
        // the player still inside the enemy: separateFromEnemy() then
        // shoves them back out (not through), and once phaseDashing flips
        // false the very next contact-damage check lands a normal hit —
        // "Phase Dash passes through enemies" silently failing for any
        // enemy near the edge of the dash's total travel distance
        // (PHASE_DASH_SPEED * PHASE_DASH_DURATION). A per-enemy immunity
        // that only clears once the overlap itself clears (not on a timer)
        // guarantees the promised pass-through regardless of dash range,
        // while enemy-specific counters (cancel_and_damage, afterimage_
        // strike) still fire exactly as before — they're keyed off
        // `player.phaseDashing`/overlap directly, not this set.
        this.phasedThroughEnemies = new Set();
        abilityState.phaseDashCooldown = PHASE_DASH_COOLDOWN;
        const phaseDashDir = this.getDashDirection(PHASE_DASH_SPEED);
        this.vx = phaseDashDir ? phaseDashDir.vx : this.facing * PHASE_DASH_SPEED;
        this.vy = phaseDashDir ? phaseDashDir.vy : 0;
        this.invincibleTimer = PHASE_DASH_DURATION + 5;
        if (typeof SFX !== 'undefined') SFX.phaseDash();
        if (typeof boss !== 'undefined' && boss) boss.notifyPlayerDash();
      } else if (this.dashCooldown <= 0) {
        // ── Normal Dash ──
        this.dashing = true;
        this.dashTimer = DASH_DURATION;
        this.dashChain = Math.min(this.dashChain + 1, DASH_CHAIN_MAX);
        this.dashChainTimer = 0;
        // Slight cooldown increase per chain (0.5s per extra chain)
        this.dashCooldown = DASH_COOLDOWN + (this.dashChain - 1) * 10;
        // Momentum blend: preserve some existing velocity for curving/accelerating
        const momentumBlend = 0.3 + this.dashChain * 0.1; // more momentum on higher chains
        const dashDir = this.getDashDirection(DASH_SPEED);
        if (dashDir) {
          this.vx = dashDir.vx * (1 - momentumBlend) + this.vx * momentumBlend;
          this.vy = dashDir.vy * (1 - momentumBlend) + this.vy * momentumBlend;
        } else {
          this.vx = this.facing * DASH_SPEED * (1 - momentumBlend) + this.vx * momentumBlend;
          this.vy *= (1 - momentumBlend); // preserve some vertical momentum too
        }
        if (typeof SFX !== 'undefined') SFX.dash();
      }
    }

    if (this.dashing) {
      this.dashTimer -= this.timeScale;
      if (this.dashTimer <= 0) {
        this.dashing = false;
        // Preserve more momentum when chaining (parkour flow)
        this.vx *= 0.6 + this.dashChain * 0.08;
      }
    }
    if (this.dashCooldown > 0) this.dashCooldown -= this.timeScale;
    if (this.dashChain > 0) this.dashChainTimer += this.timeScale;
    // Reset chain after gap (120 frames = 2s) or on ground
    if (this.dashChainTimer >= 120 || (this.grounded && this.dashChain > 0)) {
      this.dashChain = 0;
      this.dashChainTimer = 0;
    }

    if (this.phaseDashing) {
      this.phaseDashTimer -= this.timeScale;
      if (this.phaseDashTimer <= 0) {
        this.phaseDashing = false;
        this.vx *= 0.4;
        // Afterimage Strike payoff — arms a delayed explosive hazard right
        // where the dash actually ended, not where it grazed the enemy
        // (see the "dashing isn't automatically safe" note in the
        // vocabulary plan: keep moving after, don't stand in the landing
        // spot). game.js owns the hazard array/update/draw; this file just
        // pushes one when the armed flag (set on dash-through contact,
        // enemy.js's game.js-side overlap check) is still set.
        if (this._afterimageArmed && typeof afterimageHazards !== 'undefined') {
          const p = this._afterimageParams || { armDelay: 45, radius: 46, damage: 2 };
          afterimageHazards.push({
            x: this.x + this.width / 2, y: this.y + this.height / 2,
            timer: p.armDelay, armDelay: p.armDelay, radius: p.radius, damage: p.damage,
          });
          this._afterimageArmed = false;
        }
      }
    }

    // ── Graviton Surge (base ability built 2026-07-16, Enemy_Design.pdf) ────
    // Lv0: tap to flip gravity 3s. Lv1: 4s. Lv2+: tap STILL flips gravity —
    // holding instead spawns a Gravity Ball a fixed distance in front of the
    // player (game.js pulls nearby enemies while it's up); releasing it
    // launches it forward+upward to fly for a short duration, then it
    // explodes wherever it ends up (Lv3+ — see game.js's gravitonBallPop
    // handling). The ball variant is a standalone attractor, entirely
    // separate from the tap gravity flip — releasing it does NOT also flip
    // gravity. Actual gravity flip / ball pull-and-damage happens in
    // game.js (needs the enemy list); this block only tracks input+timers.
    //
    // 2026-07-19 fix: Lv2+ used to commit to the Gravity Ball on the very
    // first frame of any press (`gravitonBallCharging = lvl >= 2`), so even
    // a quick tap always went through the ball's release-to-launch flow —
    // the plain flip was completely unreachable at Lv2+. Now the decision
    // is deferred, same tap/hold shape as Stillpoint (see
    // STILLPOINT_HOLD_THRESHOLD above): press starts `gravitonSurgeCharging`
    // (undecided), and only commits to the Gravity Ball once held past
    // GRAVITON_SURGE_TAP_THRESHOLD; released before that, it's a tap → flip.
    if (wasActionJustPressed('gravitonSurge') && abilityState.hasGravitonSurge &&
        abilityState.gravitonSurgeCooldown <= 0 && !this.gravitonActive &&
        !this.gravitonBallFlying && !this.gravitonSurgeCharging && !this.gravitonBallCharging) {
      const rawGraviton = abilityLevel('graviton_surge');
      if (oldTier('graviton_surge') >= 2) {
        this.gravitonSurgeCharging = true;
        this.gravitonHoldTimer = 0;
      } else if (this.fractureMeter >= GRAVITON_SURGE_TAP_COST) {
        // Lv0/Lv1(new)/Lv1(old) never had a hold variant — fire the flip
        // immediately, same as always. Pip cost checked here (not at the
        // outer `if`) so an unaffordable press is a silent no-op — same
        // shape as Stillpoint below: no cooldown burned, nothing charges,
        // just doesn't fire.
        this.fractureMeter -= GRAVITON_SURGE_TAP_COST;
        this.gravitonActive = true;
        // Lv2 (old Lv1): duration +1s (60f). Lv1 (2026-07-27, the new cheap
        // entry tier): a smaller +0.3s (18f) partial step toward that.
        this.gravitonTimer = GRAVITON_SURGE_BASE_DURATION + (oldTier('graviton_surge') >= 1 ? 60 : (rawGraviton >= 1 ? 18 : 0));
        abilityState.gravitonSurgeCooldown = GRAVITON_SURGE_COOLDOWN;
        if (typeof SFX !== 'undefined') SFX.phaseDash();
      }
    }
    if (this.gravitonSurgeCharging) {
      if (isActionPressed('gravitonSurge')) {
        this.gravitonHoldTimer++;
        if (this.gravitonHoldTimer >= GRAVITON_SURGE_TAP_THRESHOLD) {
          // Held long enough — commit to the Gravity Ball. No pip check
          // here either — same as Stillpoint's hold path, the cost is
          // charged at activation (ball release / tap release), not at
          // the moment of committing to which variant this will be.
          this.gravitonSurgeCharging = false;
          this.gravitonBallCharging = true;
          this.gravitonBallTimer = 0;
        }
      } else {
        // Released before the threshold — this was a tap. Flip gravity,
        // if affordable; if not, this is a silent no-op like the Lv0/1
        // branch above (still consumes the press/charge cycle, but nothing
        // happens and the cooldown is never set).
        this.gravitonSurgeCharging = false;
        if (this.fractureMeter >= GRAVITON_SURGE_TAP_COST) {
          this.fractureMeter -= GRAVITON_SURGE_TAP_COST;
          const rawGraviton2 = abilityLevel('graviton_surge');
          this.gravitonActive = true;
          this.gravitonTimer = GRAVITON_SURGE_BASE_DURATION + (oldTier('graviton_surge') >= 1 ? 60 : (rawGraviton2 >= 1 ? 18 : 0));
          abilityState.gravitonSurgeCooldown = GRAVITON_SURGE_COOLDOWN;
          if (typeof SFX !== 'undefined') SFX.phaseDash();
        }
      }
    }
    if (this.gravitonBallCharging) {
      // Held out in front, moving with the player (like holding it in
      // hand) — re-anchored every frame while charging, not just on press.
      this.gravitonBallX = this.x + this.width / 2 + this.facing * GRAVITON_BALL_SPAWN_DIST;
      this.gravitonBallY = this.y + this.height / 2;
      if (isActionPressed('gravitonSurge')) {
        this.gravitonBallTimer++;
      } else {
        // Release: launch the ball, if affordable — same silent-no-op
        // shape as the tap variant if the player went broke mid-charge
        // (the charge itself is free; only the actual launch costs pips).
        this.gravitonBallCharging = false;
        if (this.fractureMeter >= GRAVITON_SURGE_BALL_COST) {
          this.fractureMeter -= GRAVITON_SURGE_BALL_COST;
          // Launch forward+upward. It keeps pulling nearby enemies in
          // flight (game.js) and explodes when it lands (Lv3+; see
          // gravitonBallPop). No gravity flip — the hold variant is a pure
          // ball attractor.
          this.gravitonBallFlying = true;
          this.gravitonBallFlightTimer = GRAVITON_BALL_FLIGHT_DURATION;
          this.gravitonBallVx = this.facing * GRAVITON_BALL_LAUNCH_SPEED_X;
          this.gravitonBallVy = -GRAVITON_BALL_LAUNCH_SPEED_Y;
          abilityState.gravitonSurgeCooldown = GRAVITON_SURGE_COOLDOWN;
        }
      }
    }
    if (this.gravitonBallFlying) {
      this.gravitonBallX += this.gravitonBallVx * this.timeScale;
      this.gravitonBallY += this.gravitonBallVy * this.timeScale;
      this.gravitonBallFlightTimer -= this.timeScale;
      if (this.gravitonBallFlightTimer <= 0) {
        this.gravitonBallFlying = false;
        this.gravitonBallPop = true; // one-shot flag, consumed by game.js
      }
    }
    if (this.gravitonActive) {
      this.gravitonTimer -= this.timeScale;
      if (this.gravitonTimer <= 0) this.gravitonActive = false;
    }

    // ── Void Tether (base ability built 2026-07-16, Enemy_Design.pdf) ───────
    // Targeting/pull/arrival effects live in game.js (needs the enemy list);
    // this just fires the one-shot flag on tap, gated by cooldown.
    this.voidTetherFired = false;
    if (wasActionJustPressed('voidTether') && abilityState.hasVoidTether &&
        abilityState.voidTetherCooldown <= 0) {
      const lvl = abilityLevel('void_tether');
      abilityState.voidTetherCooldown = (limitBreak.active && limitBreak.ability === 'void_tether') ? 90 : VOID_TETHER_COOLDOWN;
      this.voidTetherFired = true;
    }

    // ── Shard Shot Lv4 Limit Break: "your melee swings are replaced with
    // Shard Blasts" (Enemy_Design.pdf) — was not implemented at all before
    // (user report 2026-07-16). Intercepts the attack button entirely
    // while this Enhanced State is active, bypassing the charge system.
    this.shardBlastFired = false;
    if (limitBreak.active && limitBreak.ability === 'shard_shot' &&
        wasActionJustPressed('attack') && this.attackCooldown <= 0 && !this.ducking) {
      this.shardBlastFired = true;
      this.attackCooldown = this.getAttackCooldown();
    } else if (!(limitBreak.active && limitBreak.ability === 'shard_shot')) {
    // ── Attack input: hold to charge, release to fire — requires the Charged
    // Attack ability (crag_altar). Without it, the attack action only ever
    // fires the quick normal attack on tap; the charge/heavy-attack system
    // doesn't exist yet.
    if (abilityState.hasChargedAttack) {
      // Press attack with no cooldown → start charging (don't fire yet)
      if (wasActionJustPressed('attack') &&
          this.attackCooldown <= 0 && !this.ducking &&
          !this.charging) {
        this.charging = true;
        this.chargeTimer = 0;
        this.fullyCharged = false;
      }

      // While holding, accumulate charge
      if (this.charging && isActionPressed('attack')) {
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

      // Release attack → fire
      if (this.charging && !isActionPressed('attack')) {
        this.charging = false;

        // Directional attack based on input
        if (isActionPressed('aimUp')) {
          this.attackDirection = 'up';
        } else if (isActionPressed('aimDown')) {
          this.attackDirection = 'down';
        } else {
          this.attackDirection = this.findReachDirection() || 'forward';
        }

        if (this.chargeTimer >= CHARGE_TAP) {
          // ── Heavy attack ──
          // Strength Lv4 Limit Break: a full-charge release activates the
          // Enhanced State instead of just a bigger swing, per Rule 1's
          // "Full Hold: if you have the Lv4 Strength unlock, this activates
          // your Limit Break on release" (Enemy_Design.pdf).
          if (this.fullyCharged && canActivateLimitBreak('strength', this.fractureMeter)) {
            this.fractureMeter -= LIMIT_BREAK_COST;
            startLimitBreak('strength');
          }
          this.attacking = true;
          this.attackTimer = ATTACK_DURATION + 4; // slightly longer animation
          this.attackCooldown = this.getAttackCooldown() + 8; // longer recovery
          this.heavy = true;
          this.heavyCharge = this.chargeTimer / CHARGE_FULL; // 0-1 charge ratio
          if (typeof SFX !== 'undefined') SFX.heavyAttack();
        } else {
          // ── Normal attack (quick tap) ──
          this.attacking = true;
          this.attackTimer = ATTACK_DURATION;
          this.attackCooldown = this.getAttackCooldown();
          this.heavy = false;
          if (typeof SFX !== 'undefined') SFX.attack();
        }
        this.animator.play(this.animKeyForAttack(this.attackDirection, this.heavy), true);
        this.dashRefundedThisAttack = false; // Phase 1.8: one dash refund per attack
        this.hitTargetsThisSwing.clear();
        this.echoAttackPending = true; // Phase Dash Lv3 — consumed in game.js
        this.chargeTimer = 0;
        this.fullyCharged = false;
      }
    } else if (wasActionJustPressed('attack') &&
               this.attackCooldown <= 0 && !this.ducking) {
      // No Charged Attack yet — attack always fires the quick hit immediately,
      // no charge timer, no heavy branch, no charge VFX.
      if (isActionPressed('aimUp')) {
        this.attackDirection = 'up';
      } else if (isActionPressed('aimDown')) {
        this.attackDirection = 'down';
      } else {
        this.attackDirection = this.findReachDirection() || 'forward';
      }
      this.attacking = true;
      this.attackTimer = ATTACK_DURATION;
      this.attackCooldown = this.getAttackCooldown();
      this.heavy = false;
      if (typeof SFX !== 'undefined') SFX.attack();
      this.animator.play(this.animKeyForAttack(this.attackDirection, this.heavy), true);
      this.dashRefundedThisAttack = false;
      this.hitTargetsThisSwing.clear();
      this.echoAttackPending = true; // Phase Dash Lv3 — consumed in game.js
    }
    } // end Shard Shot Lv4 melee-replacement guard

    if (this.attacking) {
      this.attackTimer -= this.timeScale;
      this.animator.update();
      if (this.attackTimer <= 0) {
        this.attacking = false;
        this.heavy = false; // clear heavy flag after animation
      }
    }
    if (this.attackCooldown > 0) this.attackCooldown -= this.timeScale;

    // ── Movement/ability animators (2026-07-19) ─────────────────────────────
    // play() is cheap to call every frame — it no-ops unless the key
    // actually changed (see Animator.play() in animdata.js).
    const bodyKey = this.playerBodyStateKey();
    if (ANIM_DEFS[bodyKey]) { this.bodyAnimator.play(bodyKey); this.bodyAnimator.update(); }
    if (this.stillpointActive && ANIM_DEFS['player_stillpoint']) { this.stillpointAnimator.play('player_stillpoint'); this.stillpointAnimator.update(); }
    if (this.shardAiming && ANIM_DEFS['player_shardshot_aim']) { this.shardAimAnimator.play('player_shardshot_aim'); this.shardAimAnimator.update(); }
    if (this.beaming && ANIM_DEFS['player_shardshot_beam']) { this.shardBeamAnimator.play('player_shardshot_beam'); this.shardBeamAnimator.update(); }
    if ((this.gravitonBallCharging || this.gravitonBallFlying) && ANIM_DEFS['player_gravball']) { this.gravBallAnimator.play('player_gravball'); this.gravBallAnimator.update(); }

    // ── Shard Shot — hold to aim, release to fire (expansion §0.1) ─────────
    // Press shardShot: start aiming; a glowing dotted arc appears (see draw()).
    // Hold aimUp/aimDown while aiming: tilt the arc smoothly.
    // Release: fire along the arc. A quick tap = instant forward shot.
    this.shardShotFired = false;
    if (wasActionJustPressed('shardShot') &&
        abilityState.hasShardShot && abilityState.shardShotCooldown <= 0 &&
        !this.shardAiming && !this.beaming) {
      this.shardAiming = true;
      this.shardAimTimer = 0;
      this.shardAimVy = 0;
    }
    if (this.shardAiming) {
      if (isActionPressed('shardShot')) {
        this.shardAimTimer++;
        if (isActionPressed('aimUp')) {
          this.shardAimVy = Math.max(this.shardAimVy - SHARD_AIM_TILT_RATE, SHARD_AIM_VY_MIN);
        } else if (isActionPressed('aimDown')) {
          this.shardAimVy = Math.min(this.shardAimVy + SHARD_AIM_TILT_RATE, SHARD_AIM_VY_MAX);
        }
        // Lv4 Beam Attack (old Lv3) — "a beam as in continuous energy, like
        // a kamehameha" (user clarification 2026-07-16): held past
        // BEAM_CHARGE_TIME with a Fracture Pip in reserve starts a
        // continuous straight-line channel instead of firing a single
        // shot on release. Aim (angle) stays live-adjustable while
        // beaming — see the angle calc below and game.js's per-frame
        // beam-tick update.
        if (!this.beaming && oldTier('shard_shot') >= 3 && this.shardAimTimer >= BEAM_CHARGE_TIME && this.fractureMeter >= BEAM_PIP_COST) {
          this.beaming = true;
          this.beamDrainTimer = 0;
          this.shardAiming = false; // beam replaces the aim-then-release flow entirely
        }
      } else {
        this.shardAiming = false;
        this.shardShotFired = true; // game.js consumes this + shardAimVy
      }
    }
    if (this.beaming) {
      // Live angle: same tilt controls as aiming, expressed as a real
      // straight-line angle (no gravity/arc) instead of a launch velocity.
      if (isActionPressed('aimUp')) {
        this.beamAngle = Math.max(this.beamAngle - 0.04, -Math.PI * 0.4);
      } else if (isActionPressed('aimDown')) {
        this.beamAngle = Math.min(this.beamAngle + 0.04, Math.PI * 0.4);
      }
      if (!isActionPressed('shardShot')) {
        this.beaming = false;
      } else {
        this.beamDrainTimer++;
        if (this.beamDrainTimer >= 60) { // 1 Fracture Pip per second while channeling
          this.beamDrainTimer = 0;
          this.fractureMeter -= 1;
          if (this.fractureMeter <= 0) { this.fractureMeter = 0; this.beaming = false; }
        }
      }
    }

    // ── Physics ─────────────────────────────────────────────────────────────
    // Electromagnetic Golem's magnetism (2026-07-26) — any platform carrying
    // a `polarity` field ('positive'|'negative'; either hand-authored as a
    // permanent counterplay platform, or set/cleared at runtime by the
    // Golem's own charging attack) does two things: touching it sets
    // `this.magnetCharge` to match (this is the whole "counterplay
    // platforms flip your own charge" mechanic — no separate system), and
    // if the player currently holds a charge, it exerts a force — opposite
    // charges pull in, same charges push away. Additive, before gravity/
    // collision, same shape as the gravity-well projectile pull
    // (`enemy.js`) and the Graviton Ball's enemy-pull (`game.js`) — no
    // changes to the shared collision resolver needed. A no-op everywhere
    // else in the game since no platform outside Polar Shift's boss room
    // ever sets `polarity`.
    if (typeof rectsOverlap === 'function') {
      for (const plat of platforms) {
        if (!plat.polarity) continue;
        const pcx = this.x + this.width / 2, pcy = this.y + this.height / 2;
        const cx = plat.x + plat.w / 2, cy = plat.y + plat.h / 2;
        if (this.standingPlat === plat ||
            rectsOverlap(this, { x: plat.x, y: plat.y, width: plat.w, height: plat.h })) {
          this.magnetCharge = plat.polarity;
        }
        const dist = Math.hypot(pcx - cx, pcy - cy);
        if (this.magnetCharge && dist > 1 && dist < MAGNET_PULL_RANGE) {
          const sign = this.magnetCharge === plat.polarity ? -1 : 1; // same repels, opposite attracts
          this.vx += ((cx - pcx) / dist) * MAGNET_PULL_STRENGTH * sign;
          this.vy += ((cy - pcy) / dist) * MAGNET_PULL_STRENGTH * sign;
        }
      }
    }

    // Graviton Surge: flips the player's own gravity for its duration. Lv4
    // Limit Break replaces this with true flight (no gravity at all) — see
    // Rule 0's Lv4 Enhanced State. Room gravity (Gravity Collapse Core,
    // below) only applies in the final `else` — using Graviton Surge mid-
    // fight against that boss layers oddly (ordinary up/down flip on top
    // of whatever room direction is active) rather than composing
    // correctly; accepted v1 behavior, not a blocker, per the boss-buildout
    // plan.
    if (this.gravitonActive && limitBreak.active && limitBreak.ability === 'graviton_surge') {
      // Flight — ignore gravity entirely, vy only changes from player input/knockback.
    } else if (this.gravitonActive) {
      this.vy -= GRAVITY * this.timeScale;
    } else if (typeof applyRoomGravity === 'function') {
      applyRoomGravity(this, this.timeScale); // 'down' everywhere except Gravity Collapse Core's own room; scaled by the Sovereign's Phase 3 Stillpoint like everything else here
    } else {
      this.vy += GRAVITY * this.timeScale;
    }
    this.x += this.vx * this.timeScale;
    this.y += this.vy * this.timeScale;

    // Platform collision — routed through physics.js's shared resolver as
    // of 2026-07-19 (was a hand-duplicated copy of the same logic with the
    // same bug: jumping into a plain, un-flagged tall platform could fall
    // straight through the floor — see the resolver's own comment for the
    // full mechanism and the axis-separated fix). Player-only concerns
    // (wall-jump coyote, justLanded SFX, one-way drop-through) are layered
    // on the returned result exactly like resolveEnemyPhysics already does
    // for enemies. Dispatches on room gravity direction (Gravity Collapse
    // Core, 2026-07-26) the same way resolveEnemyPhysics does — 'down' is
    // this exact call, unchanged.
    this.grounded = false;
    this.standingPlat = null;
    let wallTouchThisFrame = false;

    const _roomGravityDir = typeof getRoomGravityDir === 'function' ? getRoomGravityDir() : 'down';
    if (_roomGravityDir === 'down' && typeof resolveEntityCollision === 'function') {
      const result = resolveEntityCollision(this, platforms, {
        movedX: this.vx * this.timeScale,
        movedY: this.vy * this.timeScale,
        skipOneWay: this.dropThroughTimer > 0,
      });
      if (result.landed) {
        this.justLanded = true;
        this.justLandedTimer = 0;
        if (typeof SFX !== 'undefined') SFX.land();
      }
      if (result.wallNormal !== 0) {
        this.wallNormal = result.wallNormal;
        wallTouchThisFrame = true;
      }
    } else if (_roomGravityDir !== 'down' && typeof resolveRotatedGravityCollision === 'function') {
      const result = resolveRotatedGravityCollision(this, platforms, _roomGravityDir, {
        movedX: this.vx * this.timeScale,
        movedY: this.vy * this.timeScale,
        skipOneWay: this.dropThroughTimer > 0,
      });
      if (result.landed) {
        this.justLanded = true;
        this.justLandedTimer = 0;
        if (typeof SFX !== 'undefined') SFX.land();
      }
      if (result.wallNormal !== 0) {
        this.wallNormal = result.wallNormal;
        wallTouchThisFrame = true;
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

    // Same-wall lock: ticks down regardless of contact, and clears outright
    // on landing — touching real ground is a genuine "you got somewhere"
    // checkpoint, no reason to keep denying that wall after that.
    if (this._wallJumpLockTimer > 0) this._wallJumpLockTimer--;
    if (this.grounded) this._wallJumpLockTimer = 0;

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

    if (this.invincibleTimer > 0) { this.invincibleTimer -= this.timeScale; this.flashTimer++; }
    if (this.hitStunTimer > 0) this.hitStunTimer -= this.timeScale;
  }

  // Reach (mini-plot unlock, pacifist region, 2026-07-19). Up-Reach works
  // grounded or airborne (user direction 2026-07-19: it's the "continue a
  // combo I already started" tool and juggles often begin from the
  // ground); down-Reach is airborne-only (there's nothing below you to hit
  // while standing on the ground, and it's the pogo-adjacent case). Scans
  // the current area's enemies for the nearest one diagonally in front
  // within a cone measured off vertical (REACH_CONE_MIN/MAX_DEG), excluding
  // both near-overhead (dedicated up-attack/pogo's job) and near-horizontal
  // (the plain forward swing already covers that). Returns 'up'/'down' or
  // null — callers only use this when no explicit aimUp/aimDown was held,
  // so it never overrides a deliberate directional input, and it's only
  // ever checked once at the moment an attack is thrown (not every frame of
  // an active swing), so it can't retarget mid-animation.
  findReachDirection() {
    if (!abilityState.hasReach) return null;
    if (typeof areaEnemies === 'undefined' || typeof currentAreaId === 'undefined') return null;
    const enemies = areaEnemies[currentAreaId] || [];
    const px = this.x + this.width / 2, py = this.y + this.height / 2;
    let bestDir = null, bestDist = REACH_RANGE;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
      const dx = (ex - px) * this.facing; // positive = in front, given facing
      if (dx < REACH_MIN_FORWARD) continue;
      const dy = ey - py;
      if (dy === 0) continue; // level with the player — not up or down
      if (dy > 0 && this.grounded) continue; // down-Reach is airborne-only
      const dist = Math.hypot(dx, dy);
      if (dist > bestDist) continue;
      const angleOffVertical = Math.atan2(Math.abs(dx), Math.abs(dy)) * 180 / Math.PI;
      if (angleOffVertical < REACH_CONE_MIN_DEG || angleOffVertical > REACH_CONE_MAX_DEG) continue;
      bestDist = dist;
      bestDir = dy < 0 ? 'up' : 'down';
    }
    return bestDir;
  }

  // Maps the current swing to an ANIM_DEFS key (game/animdata.js), e.g.
  // 'player_attack_forward' / 'player_attack_forward_heavy'. Centralized
  // here so getAttackHitbox()/the attack-start blocks/draw() all agree on
  // the same key without re-deriving it.
  animKeyForAttack(direction, heavy) {
    return `player_attack_${direction}${heavy ? '_heavy' : ''}`;
  }

  // Maps the player's current movement/dash/wallslide state to an
  // ANIM_DEFS key (2026-07-19) — checked once per frame by update()/draw()
  // to drive `bodyAnimator`. States are mutually exclusive (only one is
  // ever "current"), unlike the overlay abilities (Stillpoint, Shard Shot
  // aim/beam) which are tracked separately since they can coexist with any
  // of these. Falls back to the legacy static body (+ dash/phasedash/
  // wallslide overlay) draw when no matching key has been authored.
  playerBodyStateKey() {
    if (this.phaseDashing) return 'player_phasedash';
    if (this.dashing) return `player_dash_chain${this.dashChain}`;
    if (this.wallSliding && this.wallNormal !== 0) return 'player_wallslide';
    if (this.ducking) return 'player_duck';
    if (!this.grounded && this.vy < 0) return 'player_jump';
    if (!this.grounded) return 'player_fall';
    if (Math.abs(this.vx) > 0.5) return 'player_run';
    return 'player_idle';
  }

  getAttackHitbox() {
    if (!this.attacking) return null;
    const dir = this.attackDirection;

    // ── Anim-driven path (2026-07-19) — only for directions that actually
    // have an authored ANIM_DEFS entry (game/animdata.js, edited live via
    // editor/anim_editor.html). Everything else falls through to the
    // hardcoded hitboxes below unchanged, so this is purely additive.
    const animDef = (typeof ANIM_DEFS !== 'undefined') ? ANIM_DEFS[this.animKeyForAttack(dir, this.heavy)] : null;
    if (animDef) {
      const hitboxes = this.animator.currentHitboxes();
      if (hitboxes.length === 0) return null; // windup/recover frame — no active hitbox yet
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const hb of hitboxes) {
        minX = Math.min(minX, hb.x);
        minY = Math.min(minY, hb.y);
        maxX = Math.max(maxX, hb.x + hb.width);
        maxY = Math.max(maxY, hb.y + hb.height);
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, dir };
    }

    // Legacy fallback — shared with editor/anim_editor.html's dissection
    // tool via game/attackVFX.js, so both stay numerically identical.
    return ATTACK_VFX_WORLD_HITBOX(dir, this.heavy, this.x, this.y, this.width, this.height, this.facing);
  }

  // `sourceX` (the hitting enemy's x) is optional — when given, applies a
  // small knockback impulse + brief hitstun away from the source, mirroring
  // the convention already used by Enemy.takeDamage(dmg, sourceX, ...).
  // `knockback` (optional 3rd arg, {vx, vy, hitStun}) overrides the default
  // impulse — added for ComposedEnemy attacks (enemy.js) that want a
  // specific, configurable knockback (e.g. a grab-throw sending the player
  // into a wall) instead of the generic small pop-up every other hit uses.
  // `vx` here is a magnitude — direction (away from sourceX) is still
  // applied automatically, same as the default case.
  takeDamage(dmg, sourceX, knockback) {
    if (this.invincibleTimer > 0) return;
    this.health = Math.max(0, this.health - dmg);
    this.invincibleTimer = INVINCIBLE_FRAMES;
    // Stillpoint breaks on taking damage
    if (this.stillpointActive) {
      this.stillpointActive = false;
      if (typeof SFX !== 'undefined') SFX.stillpointEnd();
    }
    if (sourceX !== undefined) {
      // Limit Break (any ability, Enemy_Design.pdf): "complete immunity to
      // knockback" for the Enhanced State's 6s window.
      if (typeof limitBreak !== 'undefined' && limitBreak.active) return;
      // Strength Lv4 (old Lv3): incoming knockback -30%.
      const kbMult = (typeof oldTier === 'function' && oldTier('strength') >= 3) ? 0.7 : 1;
      const dir = (this.x + this.width / 2 > sourceX) ? 1 : -1;
      this.vx = dir * (knockback?.vx ?? 4) * kbMult;
      this.vy = (knockback?.vy ?? -3) * kbMult;
      this.hitStunTimer = knockback?.hitStun ?? 10;
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

    // ── Stillpoint glow on player body (2026-07-19: anim-driven when a
    // 'player_stillpoint' ANIM_DEFS entry exists, else the legacy halo) ────
    if (this.stillpointActive) {
      if (ANIM_DEFS['player_stillpoint']) {
        this.stillpointAnimator.draw(ctx);
      } else {
        const pulse = Math.sin(typeof frameCount !== 'undefined' ? frameCount * 0.15 : 0) * 0.2 + 0.8;
        drawStillpointHalo(ctx, this.x, this.y, this.width, this.height, pulse);
      }
    }

    // ── Graviton Surge Gravity Ball (Lv2+) — was never actually drawn
    // before (user report 2026-07-16: "the ball never appears"); the pull
    // logic in game.js was real, just invisible. Also drawn while flying
    // (2026-07-19) so it doesn't vanish the instant you release. Anim-driven
    // (2026-07-19) when 'player_gravball' exists — the ball is its own
    // detached entity (gravBallEntity), not the player, see constructor.
    if (this.gravitonBallCharging || this.gravitonBallFlying) {
      const pulse = Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.35) * 0.2 + 0.8;
      if (ANIM_DEFS['player_gravball']) {
        this.gravBallEntity.width = this.gravBallEntity.height = GRAVITON_BALL_PULL_RADIUS * 2;
        ctx.save();
        ctx.translate(this.gravitonBallX - GRAVITON_BALL_PULL_RADIUS, this.gravitonBallY - GRAVITON_BALL_PULL_RADIUS);
        this.gravBallAnimator.draw(ctx);
        ctx.restore();
      } else {
        const r = 10 + Math.min(this.gravitonBallTimer * 0.15, 10);
        drawGravityBall(ctx, this.gravitonBallX, this.gravitonBallY, GRAVITON_BALL_PULL_RADIUS, r, pulse);
      }
    }

    // ── Limit Break (Lv4) aura — flat blue glow, per user direction
    // 2026-07-16 (no bespoke per-ability VFX yet). Drawn over everything
    // else, including Stillpoint's own cyan halo, so it reads as the
    // dominant state while active.
    if (typeof limitBreak !== 'undefined' && limitBreak.active) {
      const pulse = Math.sin(typeof frameCount !== 'undefined' ? frameCount * 0.3 : 0) * 0.15 + 0.85;
      ctx.fillStyle = `rgba(59, 130, 246, ${0.22 * pulse})`;
      ctx.fillRect(this.x - 12, this.y - 12, this.width + 24, this.height + 24);
      ctx.strokeStyle = `rgba(96, 165, 250, ${0.8 * pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x - 6, this.y - 6, this.width + 12, this.height + 12);
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

    // ── Body / Dash / Phase Dash / Wall Slide (2026-07-19) ──────────────────
    // Anim-driven via bodyAnimator when playerBodyStateKey() has a matching
    // ANIM_DEFS entry; otherwise the legacy static body + dash/phase-dash/
    // wall-slide overlays, unchanged. See playerBodyStateKey() for the state
    // → key mapping.
    const bodyDef = ANIM_DEFS[this.playerBodyStateKey()];
    if (bodyDef) {
      this.bodyAnimator.draw(ctx);
    } else {
      drawPlayerBody(ctx, this.x, this.y, this.width, this.height, this.facing, this.ducking, this.stillpointActive);
      if (this.dashing) drawDashTrail(ctx, this.dashChain, this.vx, this.x, this.y, this.width, this.height);
      if (this.phaseDashing) drawPhaseDashTrail(ctx, this.vx, this.x, this.y, this.width, this.height);
      if (this.wallSliding && this.wallNormal !== 0) {
        drawWallSlideGlow(ctx, this.wallNormal, this.x, this.y, this.width, this.height, (typeof frameCount !== 'undefined' ? frameCount : 0) * 0.15);
      }
    }

    // ── Attack slash arc (directional) ────────────────────────────────────
    // Anim-driven (2026-07-19): if an ANIM_DEFS entry exists for the current
    // swing, always render through the animator — its 'attack_swing' pose
    // (game/animdata.js) calls the exact same drawAttackVFX() as the legacy
    // fallback below (game/attackVFX.js), so this is pixel-identical unless
    // a frame has been given custom art in editor/anim_editor.html, in which
    // case that art takes over automatically (Animator.draw()'s own
    // frame.image-wins-over-pose rule). No def → the raw legacy call.
    if (this.attacking) {
      const animDef = (typeof ANIM_DEFS !== 'undefined')
        ? ANIM_DEFS[this.animKeyForAttack(this.attackDirection, this.heavy)] : null;
      if (animDef) {
        this.animator.draw(ctx);
      } else {
        const progress = attackVFXProgress(this.attackTimer);
        drawAttackVFX(ctx, this.attackDirection, this.heavy, progress, this.x, this.y, this.width, this.height, this.facing);
      }
    }

    // Shard Shot aiming line — visible while holding V/N (expansion §0.1).
    // Straight, not a parabola (2026-07-16, user feedback: shots no longer
    // have gravity in game.js's Projectile, so a straight dotted line now
    // shows exactly where the shot will fly, and doubles as the "prepared"
    // aim guide while charging toward the Lv3 beam threshold). Anim-driven
    // (2026-07-19) when 'player_shardshot_aim' exists.
    if (this.shardAiming && abilityState.hasShardShot) {
      if (ANIM_DEFS['player_shardshot_aim']) {
        this.shardAimAnimator.draw(ctx);
      } else {
        const pulse = Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.25) * 0.2 + 0.7;
        drawShardAimLine(ctx, this.x, this.y, this.width, this.height, this.facing, this.shardAimVy, pulse);
      }
    }

    // ── Shard Shot Lv3 Beam — solid straight line, no arc ("show a straight
    // line for the blue one" — user feedback 2026-07-16, since the parabola
    // above was confusing to aim with; a beam has no gravity so a straight
    // line is also just literally where it goes). Anim-driven (2026-07-19)
    // when 'player_shardshot_beam' exists. ──────────────────────────────────
    if (this.beaming && typeof getBeamSegment === 'function') {
      if (ANIM_DEFS['player_shardshot_beam']) {
        this.shardBeamAnimator.draw(ctx);
      } else {
        const seg = getBeamSegment(this);
        const pulse = Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.4) * 0.15 + 0.85;
        drawShardBeam(ctx, seg.x1, seg.y1, seg.x2, seg.y2, pulse);
      }
    }

    ctx.restore();
  }
}