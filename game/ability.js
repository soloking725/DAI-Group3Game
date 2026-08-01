// Abilities: Phase Dash, Shard Shot
// Also manages echo (Phase Dash afterimage) and projectile (Shard Shot) systems.

// Phase Dash ability
// `var`, not `const`, on the tunables below — a no-op for normal play
// (nothing ever reassigns them) but it's what lets ability_tester.html
// (editor/) poke live values via window.X for in-arena testing, the same
// way enemy.js's own constants are already read via window[name].
var PHASE_DASH_SPEED = 14;
// Sourced from game/attackVFX.js (2026-07-19) — single source of truth with
// editor/anim_editor.html's Phase Dash Trail dissection. Still `var`, so
// ability_tester.html's slider still live-tunes it.
var PHASE_DASH_DURATION = PHASE_DASH_VFX_DURATION;
var PHASE_DASH_COOLDOWN = 90;
const ECHO_LIFETIME = 150; // frames the echo persists
// Sourced from game/attackVFX.js (loaded before this file) — single source
// of truth with drawEchoIdle()'s distraction-radius circle (2026-07-19).
const ECHO_DISTRACT_RADIUS = ECHO_VFX_DISTRACT_RADIUS;
// Balance pass 2026-07-12 (BAL-001, flagged by the user as "too strong,
// too useful as a crutch"): was 60 frames (1s) of a distracted enemy fully
// frozen (no movement, no attack) — closer to a group panic-button than a
// traversal tool. Halved rather than removed, so the echo still does its
// intended job (buy a moment to slip past one enemy).
// `let`, not `const` — Phase Dash Lv2 scales this +30% (30f -> 40f) at
// runtime, see updateEchoDistractDuration() below, called once per frame
// from player.js's update() alongside the rest of the ability-level reads.
let ECHO_DISTRACT_DURATION = 30;
const ECHO_DISTRACT_DURATION_BASE = 30;

// Lv3 (old Lv2): stun +30%. Lv1 (2026-07-27, the new cheap entry tier): a
// smaller +15% partial step toward that.
function updateEchoDistractDuration() {
  const raw = abilityLevel('phase_dash');
  ECHO_DISTRACT_DURATION = oldTier('phase_dash') >= 2
    ? Math.round(ECHO_DISTRACT_DURATION_BASE * 1.3)
    : raw >= 1
      ? Math.round(ECHO_DISTRACT_DURATION_BASE * 1.15)
      : ECHO_DISTRACT_DURATION_BASE;
}

// Shard Shot ability
var SHARD_SHOT_SPEED = 7;
var SHARD_SHOT_COOLDOWN = 35;
var SHARD_SHOT_DAMAGE = 1;
const SHARD_SHOT_ARC = 0.12; // curvature force per frame
const BEAM_CHARGE_TIME = 60; // frames of holding shardShot before the Lv3 beam channel starts (~1s)
const BEAM_PIP_COST = 1; // Fracture Pip required in reserve to start channeling (1 more per second after, see game.js)

// Graviton Surge ability (Enemy_Design.pdf leveling doc, 2026-07-16 —
// previously reserved/unbuilt, see input.js's gravitonSurge binding)
var GRAVITON_SURGE_BASE_DURATION = 180; // 3s @ 60fps, Lv0
var GRAVITON_SURGE_COOLDOWN = 240; // 4s between casts — already the longest cooldown of any ability
// Fracture Pip cost (added 2026-07-24 — previously free, unlike every other
// ability of comparable power: Stillpoint has no separate cooldown at all
// and is gated purely by these same pips, while Graviton Surge got a CC
// flip *and* an explosive AoE for zero resource cost). Mirrors Stillpoint's
// tap/hold cost split (player.js's STILLPOINT_TAP_COST/HOLD_COST, 1/3) —
// the Ball is the strictly stronger variant (explosive AoE vs. a CC pin),
// so it costs more.
var GRAVITON_SURGE_TAP_COST = 1;
var GRAVITON_SURGE_BALL_COST = 2;
// Lv2+ tap/hold decision window (2026-07-19) — release within this many
// frames of the initial press counts as a Tap (flip gravity); held past it
// commits to the Gravity Ball instead. Mirrors STILLPOINT_HOLD_THRESHOLD's
// press/decide-on-release shape (player.js), just inverted: here the HOLD
// path needs to visibly start (the ball has to appear and begin pulling)
// before you let go, so the decision fires as soon as the threshold is
// crossed rather than waiting for release.
var GRAVITON_SURGE_TAP_THRESHOLD = 10;
var GRAVITON_BALL_PULL_RADIUS = 160;
// Gravity flip affects every living enemy within this radius, not just the
// player. See game.js's resolveCeilingY() for the real platform-aware
// ceiling stop (fixed 2026-07-16 — a naive fixed clamp line let entities
// clip through any real ceiling platform instead of landing on it).
var GRAVITON_SURGE_RANGE = 350;
var GRAVITON_BALL_PULL_FORCE = 0.5;
// Lv2+ hold variant: the ball spawns this far in front of the player the
// moment charging starts and sits there (pulling enemies) — not tracked to
// the player each frame — until release. It acts as a standalone
// attractor — no gravity flip involved at all.
var GRAVITON_BALL_SPAWN_DIST = 180;
// On release, the ball launches forward+upward and flies for this many
// frames before it explodes at wherever it ends up (2026-07-19: previously
// exploded in place at the spawn point with no travel).
var GRAVITON_BALL_LAUNCH_SPEED_X = 6;
var GRAVITON_BALL_LAUNCH_SPEED_Y = 4; // upward (subtracted from y)
var GRAVITON_BALL_FLIGHT_DURATION = 20;
// Lv3+ release detonation — base values; Lv4 Limit Break scales these
// (1.5x damage, 2x knockback) rather than having its own separate pair.
var GRAVITON_BALL_EXPLODE_DAMAGE = 4;
var GRAVITON_BALL_EXPLODE_KB = 4;

// Reach ability (mini-plot unlock, pacifist region, 2026-07-19) — no new
// moveset: it auto-redirects a tap-attack into the existing
// player_attack_up/down swing (see player.js's findReachDirection()) when
// an enemy sits diagonally in front, so a juggle combo doesn't need a
// separate up/down input. Up-Reach works grounded or airborne (continuing a
// combo you already started often begins from the ground); down-Reach is
// airborne-only — there's nothing below you to hit while standing on the
// ground, so a grounded down-Reach just wouldn't make sense.
var REACH_RANGE = 130;
var REACH_MIN_FORWARD = 10; // enemy must be meaningfully in front, not directly overhead/underfoot (that's up-attack/pogo's job)
var REACH_CONE_MIN_DEG = 20; // degrees off vertical — excludes near-vertical (dedicated up-attack/pogo territory)
var REACH_CONE_MAX_DEG = 70; // degrees off vertical — excludes near-horizontal (that's just the normal forward swing)

// Parry ability (re-added 2026-07-27, see player.js's Duck/Parry block) —
// cooldown is deliberately long: a full deflect (stun the attacker, keep
// your own i-frames) with only an 8-frame tap window to land it would be
// free defense if spammable. 5s keeps it a clutch reaction, not a shield.
var PARRY_COOLDOWN = 300;

// Void Tether ability (Enemy_Design.pdf leveling doc, 2026-07-16 —
// previously reserved/unbuilt, see input.js's voidTether binding)
var VOID_TETHER_RANGE_BASE = 260;
var VOID_TETHER_COOLDOWN = 90;
var VOID_TETHER_PULL_SPEED_BASE = 9;
// A whiffed cast (no enemy in front, no wall) refunds the cooldown down to
// this small tax instead of burning the full 90f with zero feedback
// (2026-07-16 — see game.js's whiff branch).
const VOID_TETHER_WHIFF_COOLDOWN = 20;


var CONSTRUCT_COOLDOWN = 600;


// ── Ability levels (Lv0-4) ────────────────────────────────────────────────
// Lv0-3 are lore-pip-funded via statUpgrades/INVENTORY_UPGRADES (game.js).
// Lv4 (Limit Break) is the one-time endgame-region unlock (Rule 0 in the
// design doc) — see game.js's `limitBreakChosen`/`grantLimitBreak()`. This
// helper is the single place every ability reads its own level from, so
// enemy_test.html's per-ability level dropdowns just need to poke
// `statUpgrades[key]` before spawning — no other plumbing required.
function abilityLevel(key) {
  return (typeof statUpgrades !== 'undefined' && statUpgrades[key]) || 0;
}

// 2026-07-27 rebalance: inserted a new, cheap Lv1 ("just a small boost") below
// every ability's old Lv1-3 effects, shifting all of those up one slot
// (old Lv1 -> new Lv2, old Lv2 -> new Lv3, old Lv3 -> new Lv4) — Lv0 and
// Limit Break's relative position (now Lv5, still the one-time exclusive
// slot) are unchanged in spirit. Every one of those old effect thresholds
// still reads as ">= 1/2/3" in the code, completely unchanged — they just
// read this (the raw level minus one) instead of the raw level directly, so
// the actual threshold NUMBERS never had to be hunted down and incremented
// at each of the ~20 call sites, only this one function.
function oldTier(key) {
  return Math.max(0, abilityLevel(key) - 1);
}

// Shared Limit Break (Lv4) state — one 6s Enhanced State, whichever ability
// was chosen as the permanent Lv4 pick (or forced on via enemy_test.html).
// Renders as a flat blue aura (per user direction, 2026-07-16) rather than
// per-ability bespoke VFX — see Player.draw()'s limitBreak glow.
const LIMIT_BREAK_DURATION = 360; // 6s @ 60fps
const LIMIT_BREAK_COST = 3; // Fracture Pips

// Real-input activation (added 2026-07-27, user direction): hold the
// ability's OWN button — the same one that casts it — for this many frames
// once its Lv5 (Limit Break) unlock is owned. Hold-activated, not
// release-based: this replaces Strength's previous full-charge-attack-
// RELEASE trigger, and is the first real input for the other 5 abilities,
// which previously had no way to start their Limit Break outside
// enemy_test.html's force-toggle (roadmap.md's Phase 17 follow-up note).
// A player below Lv5 for a given ability never reaches this at all —
// canActivateLimitBreak() below still gates on the real level/cost, so
// holding a button has zero effect for anyone who hasn't unlocked it.
const LIMIT_BREAK_HOLD_THRESHOLD = 45; // 0.75s @ 60fps
const LIMIT_BREAK_HOLD_TARGETS = [
  ['strength', 'attack'],
  ['phase_dash', 'dash'],
  ['shard_shot', 'shardShot'],
  ['stillpoint', 'stillpoint'],
  ['graviton_surge', 'gravitonSurge'],
  ['void_tether', 'voidTether'],
];

const limitBreak = {
  active: false,
  ability: null, // which ability key is currently Enhanced
  timer: 0,
};

function canActivateLimitBreak(key, fracturePips) {
  return abilityLevel(key) >= 5 && !limitBreak.active && fracturePips >= LIMIT_BREAK_COST;
}

function startLimitBreak(key) {
  limitBreak.active = true;
  limitBreak.ability = key;
  limitBreak.timer = LIMIT_BREAK_DURATION;
  if (typeof addAbilityNotification === 'function') addAbilityNotification('LIMIT BREAK');
}

function updateLimitBreak() {
  if (!limitBreak.active) return;
  limitBreak.timer--;
  if (limitBreak.timer <= 0) {
    limitBreak.active = false;
    limitBreak.ability = null;
  }
}

// Echo — flicker left behind by Phase Dash
class Echo {
  constructor(x, y, facing) {
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 32;
    this.facing = facing;
    this.life = ECHO_LIFETIME;
    this.maxLife = ECHO_LIFETIME;
    this.pulseTimer = 0;
    this.swingFlash = 0; // Phase Dash Lv3/4 — frames left in the "just swung" visual, set by game.js
    // Bridges to game/animdata.js (2026-07-19) — a detached entity, own
    // Animators, same pattern as the player's overlay effects (separate
    // instances since idle and swing can be visible simultaneously — the
    // swing arc draws ON TOP of the idle flicker, never instead of it).
    // Two keys: 'echo_idle' (always — below Lv3 that's ALL you ever see)
    // and 'echo_swing' (only when swingFlash > 0, set by game.js only at
    // Phase Dash Lv3+/Stand). This preserves the existing level-gating with
    // no per-level data needed — the game already only ever plays
    // echo_swing at higher levels.
    this.idleAnimator = new Animator(this);
    this.swingAnimator = new Animator(this);
  }

  update() {
    this.life--;
    this.pulseTimer++;
    if (this.swingFlash > 0) this.swingFlash--;
    if (ANIM_DEFS['echo_idle']) { this.idleAnimator.play('echo_idle'); this.idleAnimator.update(); }
    if (this.swingFlash > 0 && ANIM_DEFS['echo_swing']) { this.swingAnimator.play('echo_swing'); this.swingAnimator.update(); }
  }

  draw(ctx) {
    const alpha = (this.life / this.maxLife) * 0.5;
    const pulse = Math.sin(this.pulseTimer * 0.3) * 0.15;

    if (ANIM_DEFS['echo_idle']) {
      this.idleAnimator.draw(ctx);
    } else {
      drawEchoIdle(ctx, this.x, this.y, this.width, this.height, alpha, pulse);
    }

    // Phase Dash Lv3/4 swing — a visible slash from the echo, hit or not
    // (user feedback 2026-07-16: was invisible unless it actually connected).
    if (this.swingFlash > 0) {
      const t = this.swingFlash / 10;
      if (ANIM_DEFS['echo_swing']) {
        this.swingAnimator.draw(ctx);
      } else {
        drawEchoSwing(ctx, this.x, this.y, this.width, this.height, t);
      }
    }
  }

  get alive() {
    return this.life > 0;
  }
}


const abilityState = {
  phaseDashCooldown: 0,
  shardShotCooldown: 0,
  gravitonSurgeCooldown: 0,
  voidTetherCooldown: 0,
  parryCooldown: 0,
  hasPhaseDash: false,
  hasShardShot: false,
  hasStillpoint: false,
  hasChargedAttack: false,
  hasGravitonSurge: false,
  hasVoidTether: false,
  hasReach: false,
  hasParry: false,
  hasConstruct: false,
  notifications: [], // { text, timer }
};

function addAbilityNotification(text) {
  abilityState.notifications.push({ text, timer: 180 });
}

function canUseShardShot() {
  return abilityState.hasShardShot && abilityState.shardShotCooldown <= 0;
}

function canUseGravitonSurge() {
  return abilityState.hasGravitonSurge && abilityState.gravitonSurgeCooldown <= 0;
}

function canUseVoidTether() {
  return abilityState.hasVoidTether && abilityState.voidTetherCooldown <= 0;
}

// Note: useShardShot is defined in game.js (it builds a game.js Projectile,
// not the old ShardProjectile), so it isn't duplicated here.

if (typeof window !== 'undefined') window.abilityState = abilityState;