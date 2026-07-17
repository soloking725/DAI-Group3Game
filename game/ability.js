// Abilities: Phase Dash, Shard Shot
// Also manages echo (Phase Dash afterimage) and projectile (Shard Shot) systems.

// Phase Dash ability
const PHASE_DASH_SPEED = 14;
const PHASE_DASH_DURATION = 8;
const PHASE_DASH_COOLDOWN = 90;
const ECHO_LIFETIME = 150; // frames the echo persists
const ECHO_DISTRACT_RADIUS = 150; // range to distract enemies
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

function updateEchoDistractDuration() {
  ECHO_DISTRACT_DURATION = abilityLevel('phase_dash') >= 2
    ? Math.round(ECHO_DISTRACT_DURATION_BASE * 1.3)
    : ECHO_DISTRACT_DURATION_BASE;
}

// Shard Shot ability
const SHARD_SHOT_SPEED = 7;
const SHARD_SHOT_COOLDOWN = 35;
const SHARD_SHOT_DAMAGE = 1;
const SHARD_SHOT_ARC = 0.12; // curvature force per frame
const BEAM_CHARGE_TIME = 60; // frames of holding shardShot before the Lv3 beam channel starts (~1s)
const BEAM_PIP_COST = 1; // Fracture Pip required in reserve to start channeling (1 more per second after, see game.js)

// Graviton Surge ability (Enemy_Design.pdf leveling doc, 2026-07-16 —
// previously reserved/unbuilt, see input.js's gravitonSurge binding)
const GRAVITON_SURGE_BASE_DURATION = 180; // 3s @ 60fps, Lv0
const GRAVITON_SURGE_COOLDOWN = 240; // 4s between casts
const GRAVITON_BALL_PULL_RADIUS = 160;
// Gravity flip affects every living enemy within this radius, not just the
// player. See game.js's resolveCeilingY() for the real platform-aware
// ceiling stop (fixed 2026-07-16 — a naive fixed clamp line let entities
// clip through any real ceiling platform instead of landing on it).
const GRAVITON_SURGE_RANGE = 350;
const GRAVITON_BALL_PULL_FORCE = 0.5;

// Void Tether ability (Enemy_Design.pdf leveling doc, 2026-07-16 —
// previously reserved/unbuilt, see input.js's voidTether binding)
const VOID_TETHER_RANGE_BASE = 260;
const VOID_TETHER_COOLDOWN = 90;
const VOID_TETHER_PULL_SPEED_BASE = 9;
// A whiffed cast (no enemy in front, no wall) refunds the cooldown down to
// this small tax instead of burning the full 90f with zero feedback
// (2026-07-16 — see game.js's whiff branch).
const VOID_TETHER_WHIFF_COOLDOWN = 20;

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

// Shared Limit Break (Lv4) state — one 6s Enhanced State, whichever ability
// was chosen as the permanent Lv4 pick (or forced on via enemy_test.html).
// Renders as a flat blue aura (per user direction, 2026-07-16) rather than
// per-ability bespoke VFX — see Player.draw()'s limitBreak glow.
const LIMIT_BREAK_DURATION = 360; // 6s @ 60fps
const LIMIT_BREAK_COST = 3; // Fracture Pips

const limitBreak = {
  active: false,
  ability: null, // which ability key is currently Enhanced
  timer: 0,
};

function canActivateLimitBreak(key, fracturePips) {
  return abilityLevel(key) >= 4 && !limitBreak.active && fracturePips >= LIMIT_BREAK_COST;
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
  }

  update() {
    this.life--;
    this.pulseTimer++;
    if (this.swingFlash > 0) this.swingFlash--;
  }

  draw(ctx) {
    const alpha = (this.life / this.maxLife) * 0.5;
    const pulse = Math.sin(this.pulseTimer * 0.3) * 0.15;
    ctx.globalAlpha = alpha + pulse;

    // Flickering body
    ctx.fillStyle = '#c4b5fd';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Distraction radius indicator (subtle)
    ctx.strokeStyle = `rgba(196, 181, 253, ${alpha * 0.3})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y + this.height / 2, ECHO_DISTRACT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 1;

    // Phase Dash Lv3/4 swing — a visible slash from the echo, hit or not
    // (user feedback 2026-07-16: was invisible unless it actually connected).
    if (this.swingFlash > 0) {
      const t = this.swingFlash / 10;
      const cx = this.x + this.width / 2, cy = this.y + this.height / 2;
      ctx.strokeStyle = `rgba(196, 181, 253, ${0.9 * t})`;
      ctx.lineWidth = 3 * t;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, this.width * 0.9, -Math.PI * 0.3, Math.PI * 0.3);
      ctx.stroke();
      ctx.lineWidth = 1;
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
  hasPhaseDash: false,
  hasShardShot: false,
  hasStillpoint: false,
  hasChargedAttack: false,
  hasGravitonSurge: false,
  hasVoidTether: false,
  notifications: [], // { text, timer }
};

function addAbilityNotification(text) {
  abilityState.notifications.push({ text, timer: 180 });
}

function canUsePhaseDash() {
  return abilityState.hasPhaseDash && abilityState.phaseDashCooldown <= 0;
}

function canUseShardShot() {
  return abilityState.hasShardShot && abilityState.shardShotCooldown <= 0;
}

function usePhaseDash(player) {
  if (!canUsePhaseDash()) return null;
  abilityState.phaseDashCooldown = PHASE_DASH_COOLDOWN;
  // Create echo at current position
  const echo = new Echo(player.x, player.y, player.facing);
  return echo;
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