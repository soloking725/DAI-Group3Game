// Abilities: Phase Dash, Shard Shot
// Also manages echo (Phase Dash afterimage) and projectile (Shard Shot) systems.

// Phase Dash ability
const PHASE_DASH_SPEED = 14;
const PHASE_DASH_DURATION = 8;
const PHASE_DASH_COOLDOWN = 90;
const ECHO_LIFETIME = 150; // frames the echo persists
const ECHO_DISTRACT_RADIUS = 150; // range to distract enemies

// Shard Shot ability
const SHARD_SHOT_SPEED = 7;
const SHARD_SHOT_COOLDOWN = 35;
const SHARD_SHOT_DAMAGE = 1;
const SHARD_SHOT_ARC = 0.12; // curvature force per frame

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
  }

  update() {
    this.life--;
    this.pulseTimer++;
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
  }

  get alive() {
    return this.life > 0;
  }
}


const abilityState = {
  phaseDashCooldown: 0,
  shardShotCooldown: 0,
  hasPhaseDash: false,
  hasShardShot: false,
  hasStillpoint: false,
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

// Note: useShardShot is defined in game.js (it builds a game.js Projectile,
// not the old ShardProjectile), so it isn't duplicated here.