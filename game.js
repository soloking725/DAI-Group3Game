// Main game loop — multi-area Metroidvania
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');



// Canvas size
const W = 800;
const H = 450;
canvas.width = W;
canvas.height = H;

// ── Fullscreen / responsive scaling ─────────────────────────────────────
// Internal render resolution always stays 800x450 (all game-logic coords
// assume this). We only scale the canvas's on-screen CSS size to fill the
// window/monitor, letterboxing to preserve aspect ratio. This works the
// same whether the browser is windowed or the page is in real Fullscreen
// API mode (F key or the ⛶ button).
function resizeCanvasToFit() {
  const availW = window.innerWidth;
  const availH = window.innerHeight;
  const scale = Math.min(availW / W, availH / H);
  canvas.style.width = Math.floor(W * scale) + 'px';
  canvas.style.height = Math.floor(H * scale) + 'px';
}

function isFullscreen() {
  return !!document.fullscreenElement;
}

function toggleFullscreen() {
  if (isFullscreen()) {
    document.exitFullscreen();
  } else {
    // Fullscreen the whole page (not just the canvas) so the unstuck/fullscreen
    // buttons stay usable while fullscreened.
    document.documentElement.requestFullscreen().catch(() => {
      // Some browsers/contexts (e.g. iframes without allow="fullscreen")
      // reject this silently — nothing more we can do here.
    });
  }
}

window.addEventListener('resize', resizeCanvasToFit);
document.addEventListener('fullscreenchange', resizeCanvasToFit);
resizeCanvasToFit();

const fullscreenBtn = document.getElementById('fullscreen-btn');
if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);

// Game state
let player;
let currentAreaId = 'tutorial_area';
let echoes = [];
let projectiles = [];
let particles = [];
let menuParticles = []; // ambient particles for start screen
let menuClick = false; // canvas click for menu
let gameRunning = true;
let gameState = 'menu'; // 'menu', 'playing', 'gameover', 'paused', 'reviving'
let frameCount = 0;
let transitionAlpha = 0;
let transitioning = false;

// Death/respawn FX
let screenShake = 0; // frames of shake remaining
let screenShakeIntensity = 0;
let deathFadeAlpha = 0; // fade overlay during death/respawn transition
let deathFadeDir = 0; // -1 = fade out, 1 = fade in, 0 = none

// Ambient area particles
let areaAmbient = []; // floating particles per area
let ambientTimer = 0; // spawn timer

// Ability pickup FX
let abilityFlash = 0; // frames of screen flash on ability pickup
let abilityFlashColor = '#c4b5fd';
let abilityPopups = []; // floating text popups

// Checkpoint system
let lastStillpoint = null; // { areaId, x, y }
let stillpointActivated = {}; // track activated stillpoints per area

// Spawned enemies (per area, reset on re-entry)
let areaEnemies = {};
let areaEnemiesSpawned = {};

// Destructible platforms state
let destructibleState = {}; // track destroyed platforms per area

// Boss fight state
let boss = null;
let bossProjectiles = [];
let victoryTimer = 0;
let bossDefeated = false;

// Camera
let camera = { x: 0, y: 0 };

// Hitstop (freeze frames on impacts for game feel)
let hitstopTimer = 0;

// Time-scale for Stillpoint slow-world effect (1.0 = normal, ~0.15 = slow)
let gameTimeScale = 1.0;

// Map system
let discoveredAreas = {};
let mapOpen = false;

// ── Canvas HUD state (Phase 0.1) ────────────────────────────────────────
let hudVisible = false;       // whether the HUD should be drawn at all
let playStartFrame = -1;      // frameCount when the run began, for the controls-hint fade
const CONTROLS_HINT_FADE_START = 600;  // ~10s @ 60fps: hint begins fading
const CONTROLS_HINT_FADE_END = 660;    // ~11s @ 60fps: hint fully gone

// Lore fragments
// Temporarily disabled — the literal "read a text popup" pickups didn't fit
// the feel wanted (more environmental storytelling, less exposition dump).
// The area data (area.loreFragments) and all the code that consumes it is
// left intact; flip this back to true to bring pickups back while a more
// environmental version is designed.
const LORE_ENABLED = false;
let collectedLore = {};
let loreOverlay = null; // { text, timer, maxTimer }

// ── Tutorial (Phase 0.2) ─────────────────────────────────────────────────
let tutorialState = { moved: false, jumped: false, attacked: false, dashed: false };
let tutorialDummyHp = 1; // resets each run; one hit is enough to teach the move
let tutorialPhaseDashHintShown = false;

function resetTutorial() {
  tutorialState = { moved: false, jumped: false, attacked: false, dashed: false };
  tutorialDummyHp = 1;
  tutorialPhaseDashHintShown = false;
}

function isTutorialComplete() {
  return tutorialState.moved && tutorialState.jumped && tutorialState.attacked && tutorialState.dashed;
}

// Escape in the tutorial room jumps straight to The Fracture, matching the
// door's own destination coordinates so it feels the same as walking through.
function skipTutorial() {
  tutorialState = { moved: true, jumped: true, attacked: true, dashed: true };
  switchArea('the_fracture', 60, 310);
}

// Per-frame tutorial bookkeeping — called only while currentAreaId === 'tutorial_area'.
function updateTutorial(area) {
  if (!player) return;

  // MOVE — any real horizontal movement
  if (!tutorialState.moved && Math.abs(player.vx) > 0.5) {
    tutorialState.moved = true;
  }

  // JUMP — airborne with upward velocity, i.e. an actual jump (not just falling)
  if (!tutorialState.jumped && !player.grounded && player.vy < -1) {
    tutorialState.jumped = true;
  }

  // DASH — the normal dash (X) used at least once
  if (!tutorialState.dashed && player.dashing) {
    tutorialState.dashed = true;
  }
  if (tutorialState.dashed && !tutorialPhaseDashHintShown) {
    tutorialPhaseDashHintShown = true;
    addAbilityNotification('Later: Phase Dash crosses gaps like this mid-air');
  }

  // ATTACK — land a hit on the training dummy
  if (!tutorialState.attacked && area.trainingDummy && tutorialDummyHp > 0) {
    const dummy = area.trainingDummy;
    const dummyRect = { x: dummy.x, y: dummy.y, width: dummy.w, height: dummy.h };
    const playerAtk = player.getAttackHitbox();
    if (playerAtk && rectsOverlap(playerAtk, dummyRect)) {
      tutorialDummyHp = 0;
      tutorialState.attacked = true;
      spawnParticles(dummy.x + dummy.w / 2, dummy.y + dummy.h / 2, '#c4b5fd', 10);
      screenShake = 4;
      screenShakeIntensity = 2;
      SFX.attackHit();
    }
  }
}

// A simple training dummy — a still, harmless practice target. Flashes and
// shows a checkmark once the player has landed the tutorial's one required hit.
function drawTrainingDummy(ctx, dummy, defeated) {
  ctx.save();
  ctx.translate(dummy.x, dummy.y);

  ctx.fillStyle = defeated ? 'rgba(196, 181, 253, 0.35)' : 'rgba(106, 106, 142, 0.6)';
  ctx.strokeStyle = defeated ? '#c4b5fd' : '#4a4a6e';
  ctx.lineWidth = 1.5;
  ctx.fillRect(0, 0, dummy.w, dummy.h);
  ctx.strokeRect(0, 0, dummy.w, dummy.h);

  // Simple crossed-post "practice dummy" silhouette
  ctx.strokeStyle = defeated ? 'rgba(196, 181, 253, 0.6)' : 'rgba(74, 74, 110, 0.8)';
  ctx.beginPath();
  ctx.moveTo(dummy.w / 2, 2);
  ctx.lineTo(dummy.w / 2, dummy.h - 2);
  ctx.moveTo(4, dummy.h * 0.35);
  ctx.lineTo(dummy.w - 4, dummy.h * 0.35);
  ctx.stroke();

  ctx.restore();

  if (defeated) {
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = '#c4b5fd';
    ctx.textAlign = 'center';
    ctx.fillText('\u2713', dummy.x + dummy.w / 2, dummy.y - 8);
    ctx.textAlign = 'left';
  }
}

// Default bounds (will be overridden per area)
function getBounds(area) {
  return {
    left: 0,
    right: area.width,
    groundY: area.groundY,
  };
}

// Get current area reference
function getCurrentArea() {
  return AREAS[currentAreaId];
}

// Get area by ID (used by spawnAreaEnemies)
function getArea(areaId) {
  return AREAS[areaId];
}

// Reset camera to origin
function resetCamera() {
  camera.x = 0;
  camera.y = 0;
}

// Smooth follow camera with bounds clamping
function updateCamera(player, area) {
  const targetX = player.x - W / 2 + player.width / 2;
  const targetY = player.y - H / 2 + player.height / 2;

  // Lerp toward target (camera smoothing)
  camera.x += (targetX - camera.x) * 0.1;
  camera.y += (targetY - camera.y) * 0.1;

  // Clamp to area bounds
  camera.x = Math.max(0, Math.min(camera.x, area.width - W));
  camera.y = Math.max(0, Math.min(camera.y, area.groundY - H + 100));
}

// Apply camera transform to canvas
function applyCamera(ctx) {
  ctx.translate(-camera.x, -camera.y);
}

// Add notification to queue (consumed by draw(), which reads abilityState.notifications)
function addAbilityNotification(text) {
  abilityState.notifications.push({ text: text, timer: 180 });
}

// Fire shard shot projectile
function useShardShot(player, aimingUp) {
  const speed = 8;
  const vx = speed * (player.facing || 1);
  const vy = aimingUp ? -6 : 0;
  const startX = (player.facing || 1) > 0 ? player.x + player.width : player.x - 8;
  const startY = aimingUp ? player.y - 4 : player.y + player.height / 2;
  const proj = new Projectile(startX, startY, vx, vy, 1, '#fbbf24');
  projectiles.push(proj);
  return proj;
}

// Simple projectile class
class Projectile {
  constructor(x, y, vx, vy, damage, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.width = 8;
    this.height = 8;
    this.damage = damage;
    this.life = 60;
    this.alive = true;
    this.color = color || '#fbbf24';
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.15; // gravity
    this.life--;
    if (this.life <= 0) {
      this.alive = false;
    }
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.shadowBlur = 0;
  }
}

// Particle system
class Particle {
  constructor(x, y, color, size) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = (Math.random() - 0.5) * 6;
    this.life = 20 + Math.random() * 10;
    this.maxLife = this.life;
    this.color = color;
    this.size = size || 4;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.life--;
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

function spawnParticles(x, y, color, count) {
  count = count || 8;
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
}

// Called from enemy.js for Stutterer teleport particles
function spawnParticlesAt(x, y, color, count) {
  spawnParticles(x, y, color, count);
}

// Collision detection
function rectsOverlap(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

// Spawn enemies for an area
function spawnAreaEnemies(areaId) {
  if (areaEnemiesSpawned[areaId]) return;
  areaEnemiesSpawned[areaId] = true;

  const area = getArea(areaId);
  areaEnemies[areaId] = [];

  for (const eDef of area.enemies) {
    if (eDef.type === 'stutterer') {
      areaEnemies[areaId].push(new Stutterer(eDef.x, eDef.y));
    } else if (eDef.type === 'crystal_sentinel') {
    areaEnemies[areaId].push(new CrystalSentinel(eDef.x, eDef.y));
    } else {
      areaEnemies[areaId].push(new Enemy(eDef.x, eDef.y, eDef.type));
    } 
  }
}

// Clear enemies when leaving an area
function clearAreaEnemies(areaId) {
  areaEnemiesSpawned[areaId] = false;
  areaEnemies[areaId] = [];
}

// Switch area
function switchArea(targetId, targetX, targetY) {
  // Clear current area enemies
  clearAreaEnemies(currentAreaId);

  // Switch
  currentAreaId = targetId;
  discoveredAreas[targetId] = true;
  SFX.setAreaAmbient(targetId);

  // Teleport player
  player.x = targetX;
  player.y = targetY;
  player.vx = 0;
  player.vy = 0;

  // Reset camera
  resetCamera();

  // Spawn enemies in new area
  spawnAreaEnemies(targetId);

  // Clear ambient particles for new area
  areaAmbient = [];

  // Transition effect
  transitioning = true;
  transitionAlpha = 1;

  saveGame();
}

// Draw a platform
function drawPlatform(ctx, plat) {
  if (plat.destructible && plat.hp <= 0) return;

  if (plat.destructible) {
    // Crystal block — teal, glowing, crackling
    const pulse = Math.sin(frameCount * 0.05) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(45, 212, 191, ${pulse})`;
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 1;
    ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    // Crack lines
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.5)';
    ctx.beginPath();
    ctx.moveTo(plat.x + plat.w * 0.3, plat.y);
    ctx.lineTo(plat.x + plat.w * 0.6, plat.y + plat.h * 0.5);
    ctx.lineTo(plat.x + plat.w * 0.4, plat.y + plat.h);
    ctx.stroke();
    return;
  }

  // Regular platform
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

  // Top highlight
  ctx.fillStyle = '#2a2a4e';
  ctx.fillRect(plat.x, plat.y, plat.w, 2);

  // Bottom edge
  ctx.fillStyle = '#12122a';
  ctx.fillRect(plat.x, plat.y + plat.h - 1, plat.w, 1);

  // Decorative dots
  ctx.fillStyle = '#222244';
  for (let dx = plat.x + 10; dx < plat.x + plat.w - 10; dx += 20) {
    ctx.fillRect(dx, plat.y + plat.h / 2 - 1, 2, 2);
  }
}

// Draw Stillpoint checkpoint
function drawStillpoint(ctx, sp, area, activated) {
  const pulse = Math.sin(frameCount * 0.04) * 0.3 + 0.7;
  const x = sp.x;
  const y = sp.y;

  // Glow
  const glowSize = activated ? 40 : 20;
  const gradient = ctx.createRadialGradient(x, y - 20, 0, x, y - 20, glowSize);
  if (activated) {
    gradient.addColorStop(0, `rgba(196, 181, 253, ${pulse * 0.4})`);
    gradient.addColorStop(1, 'rgba(196, 181, 253, 0)');
  } else {
    gradient.addColorStop(0, `rgba(100, 80, 140, ${pulse * 0.2})`);
    gradient.addColorStop(1, 'rgba(100, 80, 140, 0)');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(x - glowSize, y - 20 - glowSize, glowSize * 2, glowSize * 2);

  // Marker pole
  ctx.fillStyle = activated ? '#c4b5fd' : '#4a4a6e';
  ctx.fillRect(x - 2, y - 40, 4, 40);

  // Diamond top
  ctx.fillStyle = activated ? '#e0d7ff' : '#3a3a5e';
  ctx.beginPath();
  ctx.moveTo(x, y - 50);
  ctx.lineTo(x + 8, y - 40);
  ctx.lineTo(x, y - 30);
  ctx.lineTo(x - 8, y - 40);
  ctx.closePath();
  ctx.fill();

  // Sparkle particles when activated
  if (activated && frameCount % 15 === 0) {
    particles.push(new Particle(
      x + (Math.random() - 0.5) * 20,
      y - 40 + (Math.random() - 0.5) * 20,
      '#c4b5fd',
      2
    ));
  }

  // Interaction hint when nearby
  if (activated) {
    const playerDist = Math.abs(player.x - x);
    if (playerDist < 60) {
      ctx.fillStyle = `rgba(196, 181, 253, ${pulse})`;
      ctx.font = '10px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('STILLPOINT', x, y - 55);
      ctx.textAlign = 'left';
    }
  }
}

// Draw ability reward
function drawAbilityReward(ctx, ability) {
  if (ability.id === 'phase_dash' && abilityState.hasPhaseDash) return;
  if (ability.id === 'shard_shot' && abilityState.hasShardShot) return;

  const pulse = Math.sin(frameCount * 0.06) * 0.3 + 0.7;
  const x = ability.x;
  const y = ability.y;

  // Glow
  const glowSize = 35;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
  gradient.addColorStop(0, `rgba(103, 232, 249, ${pulse * 0.4})`);
  gradient.addColorStop(1, 'rgba(103, 232, 249, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x - glowSize, y - glowSize, glowSize * 2, glowSize * 2);

  // Orb
  ctx.fillStyle = `rgba(103, 232, 249, ${pulse})`;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();

  // Inner
  ctx.fillStyle = '#cffafe';
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();

  // Floating symbols around orb
  const symbols = ['◆', '◇', '○'];
  ctx.fillStyle = `rgba(103, 232, 249, ${pulse * 0.6})`;
  ctx.font = '10px monospace';
  for (let i = 0; i < 3; i++) {
    const angle = frameCount * 0.02 + (i * Math.PI * 2 / 3);
    const sx = x + Math.cos(angle) * 20;
    const sy = y + Math.sin(angle) * 20;
    ctx.fillText(symbols[i], sx - 3, sy + 3);
  }

  // Name
  ctx.fillStyle = `rgba(203, 245, 255, ${pulse})`;
  ctx.font = '10px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(ability.name, x, y - 22);
  ctx.textAlign = 'left';
}

// Draw a lore fragment pickup (amber memory shard)
function drawLoreFragment(ctx, lf) {
  const pulse = Math.sin(frameCount * 0.05) * 0.3 + 0.7;
  const x = lf.x, y = lf.y;

  const glowSize = 26;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
  gradient.addColorStop(0, `rgba(251, 191, 36, ${pulse * 0.35})`);
  gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x - glowSize, y - glowSize, glowSize * 2, glowSize * 2);

  // Diamond shard
  ctx.fillStyle = `rgba(251, 191, 36, ${pulse})`;
  ctx.beginPath();
  ctx.moveTo(x, y - 9);
  ctx.lineTo(x + 6, y);
  ctx.lineTo(x, y + 9);
  ctx.lineTo(x - 6, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(253, 230, 138, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// --- Area-specific parallax backdrop (deep nebulae + silhouette shapes) ---
// Cheap deterministic pseudo-random number generator (no dependency needed)
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function areaSeed(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h || 1;
}

function midKindFor(id) {
  if (id === 'echo_bridge' || id === 'upper_ruins' || id === 'the_vault' || id === 'antechamber') return 'ruins';
  if (id === 'crystal_cavern' || id === 'the_forge') return 'crystals';
  if (id === 'the_rift' || id === 'boss_arena') return 'debris';
  return 'shards'; // the_fracture and fallback
}

function hexToRgba(hex, alpha) {
  let h = (hex || '#c4b5fd').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.substr(0, 2), 16) || 0;
  const g = parseInt(h.substr(2, 2), 16) || 0;
  const b = parseInt(h.substr(4, 2), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Backdrop elements are generated once per area and cached on the area object
function getAreaBackdrop(area) {
  if (area._backdrop) return area._backdrop;
  const rng = mulberry32(areaSeed(area.id));
  const deep = [];
  for (let i = 0; i < 6; i++) {
    deep.push({ x: rng() * area.width, y: rng() * H * 0.6, r: 60 + rng() * 90 });
  }
  const kind = midKindFor(area.id);
  const mid = [];
  const count = kind === 'gears' ? 4 : 7;
  for (let i = 0; i < count; i++) {
    mid.push({
      x: rng() * area.width,
      y: area.groundY - 40 - rng() * Math.min(area.groundY * 0.5, 260),
      size: 30 + rng() * 50,
      rot: rng() * Math.PI,
    });
  }
  area._backdrop = { deep, mid, kind };
  return area._backdrop;
}

function drawMidShape(ctx, kind, x, y, size, rot, color) {
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'ruins') {
    // Broken marble pillar silhouette
    ctx.fillStyle = 'rgba(10, 10, 18, 0.5)';
    ctx.fillRect(-size * 0.15, -size, size * 0.3, size);
    ctx.fillStyle = hexToRgba(color, 0.1);
    ctx.fillRect(-size * 0.22, -size - 6, size * 0.44, 8);
  } else if (kind === 'crystals') {
    // Sharp jagged geode
    ctx.fillStyle = hexToRgba(color, 0.14);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.4, -size * 0.1);
    ctx.lineTo(0, size * 0.35);
    ctx.lineTo(-size * 0.4, -size * 0.1);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'gears') {
    // Slowly rotating clockwork gear
    ctx.rotate(rot + frameCount * 0.0015 * (size > 50 ? 1 : -1));
    ctx.strokeStyle = hexToRgba(color, 0.18);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * size * 0.4, Math.sin(a) * size * 0.4);
      ctx.lineTo(Math.cos(a) * size * 0.58, Math.sin(a) * size * 0.58);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  } else if (kind === 'debris') {
    // Drifting void debris
    ctx.rotate(rot);
    ctx.fillStyle = hexToRgba(color, 0.1);
    ctx.fillRect(-size * 0.3, -size * 0.1, size * 0.6, size * 0.18);
  } else {
    // Generic fractured shard silhouette
    ctx.fillStyle = hexToRgba(color, 0.08);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.lineTo(size * 0.3, size * 0.2);
    ctx.lineTo(-size * 0.2, size * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Draw the 2-layer parallax backdrop for an area (screen space, manual offset)
function drawAreaBackdrop(ctx, area, cam) {
  const bd = getAreaBackdrop(area);
  const color = area.ambientColor || '#c4b5fd';

  // Deep layer — slow drifting nebulae
  const deepOffset = cam.x * 0.04;
  for (const n of bd.deep) {
    const x = n.x - deepOffset;
    if (x < -200 || x > W + 200) continue;
    const grad = ctx.createRadialGradient(x, n.y, 0, x, n.y, n.r);
    grad.addColorStop(0, hexToRgba(color, 0.06));
    grad.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mid layer — area-specific silhouettes, faster parallax
  const midOffset = cam.x * 0.3;
  for (const m of bd.mid) {
    const x = m.x - midOffset;
    if (x < -150 || x > W + 150) continue;
    drawMidShape(ctx, bd.kind, x, m.y, m.size, m.rot, color);
  }
}

// Show/hide HUD (health, ability icons, area name, controls hint) — all HUD
// elements are now drawn directly on the canvas, so this just toggles a flag.
function showUI(show) {
  hudVisible = show;
  if (show) {
    playStartFrame = frameCount; // restart the controls-hint fade timer
  }
}

// Canvas click for menu
canvas.addEventListener('click', () => {
  if (gameState === 'menu') {
    menuClick = true;
  }
});

// Unstuck button — teleport player to last stillpoint or area spawn
function unstuckPlayer() {
  if (gameState !== 'playing' || !player) return;

  const area = getCurrentArea();

  if (lastStillpoint && lastStillpoint.areaId === currentAreaId) {
    // Teleport to last stillpoint in current area
    player.x = lastStillpoint.x;
    player.y = lastStillpoint.y - player.height;
  } else if (lastStillpoint) {
    // Switch back to the stillpoint's area
    currentAreaId = lastStillpoint.areaId;
    player.x = lastStillpoint.x;
    player.y = lastStillpoint.y - player.height;
    resetCamera();
    spawnAreaEnemies(currentAreaId);
    SFX.setAreaAmbient(currentAreaId);
  } else {
    // Fallback: find first safe platform or stillpoint in current area
    const sp = area.stillpoints && area.stillpoints[0];
    if (sp) {
      player.x = sp.x;
      player.y = sp.y - player.height;
    } else if (area.platforms && area.platforms.length > 0) {
      const plat = area.platforms[0];
      player.x = plat.x + plat.w / 2 - player.width / 2;
      player.y = plat.y - player.height - 2;
    } else {
      player.x = 100;
      player.y = area.groundY - 60;
    }
  }

  // Reset velocities and clear any stuck states
  player.vx = 0;
  player.vy = 0;
  player.ducking = false;
  player.height = player.normalHeight;
  player.invincibleTimer = 30; // brief invincibility on teleport
  spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#c4b5fd', 12);
}

// Unstuck button click
document.getElementById('unstuck-btn').addEventListener('click', unstuckPlayer);

// Keyboard shortcut: U key
function handleUnstuckKey() {
  if (wasJustPressed('KeyU') && gameState === 'playing') {
    unstuckPlayer();
  }
}

// Keyboard shortcut: F key — toggle fullscreen (works in any state, like Escape)
function handleFullscreenKey() {
  if (wasJustPressed('KeyF')) {
    toggleFullscreen();
  }
}

// Initialize game
function init() {
  const area = getCurrentArea();
  player = new Player(100, area.groundY - 60);
  echoes = [];
  projectiles = [];
  particles = [];
  gameState = 'menu';
  currentAreaId = 'tutorial_area';
  areaEnemiesSpawned = {};
  discoveredAreas = { tutorial_area: true };
  mapOpen = false;
  collectedLore = {};
  loreOverlay = null;
  resetTutorial();

  // Reset destructible platforms in all areas
  for (const areaId in AREAS) {
    for (const plat of AREAS[areaId].platforms) {
      if (plat.destructible && plat.hp !== undefined) {
        plat.hp = plat.maxHp || 3;
      }
    }
  }

  // Reset ability state
  abilityState.phaseDashCooldown = 0;
  abilityState.shardShotCooldown = 0;
  abilityState.hasPhaseDash = false;
  abilityState.hasShardShot = false;
  abilityState.hasStillpoint = false;
  gameTimeScale = 1.0;

  // Spawn menu particles
  menuParticles = [];
  for (let i = 0; i < 40; i++) {
    menuParticles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -Math.random() * 0.8 - 0.2,
      size: Math.random() * 3 + 1,
      alpha: Math.random() * 0.4 + 0.1,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  showUI(false); // hide HUD until the player actually starts the game
}

// Respawn at checkpoint
// ═══════════════════════════════════════════════════════════════════════
// SAVE / LOAD (Phase 0.4) — localStorage-backed persistence.
// Auto-saves on: Stillpoint checkpoint activation, area transitions, and
// ability pickups (see call sites: the Stillpoint-checkpoint block, the end
// of switchArea(), and each branch of the ability-reward pickup logic).
// All localStorage access is wrapped in try/catch — private browsing, quota
// limits, or a locked-down environment should degrade to "no persistence"
// rather than crash the game.
// ═══════════════════════════════════════════════════════════════════════
const SAVE_KEY = 'stillpoint_save_v1';

function hasSaveGame() {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch (e) {
    return false;
  }
}

function saveGame() {
  if (!player) return;
  try {
    const data = {
      version: 1,
      currentAreaId,
      player: {
        x: player.x,
        y: player.y,
        health: player.health,
        fractureMeter: player.fractureMeter,
      },
      abilityState: {
        hasPhaseDash: abilityState.hasPhaseDash,
        hasShardShot: abilityState.hasShardShot,
        hasStillpoint: abilityState.hasStillpoint,
      },
      stillpointActivated,
      lastStillpoint,
      discoveredAreas,
      collectedLore,
      bossDefeated,
      tutorialState,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    // Storage unavailable — fail silently; the run just won't persist.
  }
}

// Returns true on success. Caller is responsible for setting gameState etc.
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || !data.currentAreaId || !AREAS[data.currentAreaId] || !data.player) return false;

    currentAreaId = data.currentAreaId;
    player = new Player(data.player.x || 100, data.player.y || 0);
    player.health = typeof data.player.health === 'number' ? data.player.health : MAX_HEALTH;
    player.fractureMeter = typeof data.player.fractureMeter === 'number' ? data.player.fractureMeter : 0;

    abilityState.hasPhaseDash = !!(data.abilityState && data.abilityState.hasPhaseDash);
    abilityState.hasShardShot = !!(data.abilityState && data.abilityState.hasShardShot);
    abilityState.hasStillpoint = !!(data.abilityState && data.abilityState.hasStillpoint);
    abilityState.phaseDashCooldown = 0;
    abilityState.shardShotCooldown = 0;
    abilityState.notifications = [];

    stillpointActivated = data.stillpointActivated || {};
    lastStillpoint = data.lastStillpoint || null;
    discoveredAreas = data.discoveredAreas || { [currentAreaId]: true };
    collectedLore = data.collectedLore || {};
    bossDefeated = !!data.bossDefeated;
    tutorialState = data.tutorialState || { moved: true, jumped: true, attacked: true, dashed: true };

    echoes = [];
    projectiles = [];
    particles = [];
    bossProjectiles = [];
    boss = null;
    areaEnemiesSpawned = {};
    spawnAreaEnemies(currentAreaId);
    resetCamera();
    SFX.setAreaAmbient(currentAreaId);
    return true;
  } catch (e) {
    return false;
  }
}

function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    // ignore
  }
}

// Fresh-run setup — used by the menu when there's no save, or when the
// player explicitly presses N to start over with an existing one.
function startNewGame() {
  gameState = 'playing';
  SFX.init();
  currentAreaId = 'tutorial_area';
  SFX.setAreaAmbient('tutorial_area');
  const area = getCurrentArea();
  player = new Player(100, area.groundY - 60);
  echoes = [];
  projectiles = [];
  particles = [];
  bossProjectiles = [];
  boss = null;
  areaEnemiesSpawned = {};
  discoveredAreas = { tutorial_area: true };
  stillpointActivated = {};
  lastStillpoint = null;
  collectedLore = {};
  bossDefeated = false;
  abilityState.hasPhaseDash = false;
  abilityState.hasShardShot = false;
  abilityState.hasStillpoint = false;
  abilityState.phaseDashCooldown = 0;
  abilityState.shardShotCooldown = 0;
  abilityState.notifications = [];
  resetTutorial();
  spawnAreaEnemies('tutorial_area');
  resetCamera();
  showUI(true);
}

function respawnPlayer() {
  // Set fade state FIRST so the fade-in always starts, even if later ops fail
  gameState = 'reviving';
  deathFadeDir = 1;
  deathFadeAlpha = 1;
  player.invincibleTimer = INVINCIBLE_FRAMES;

  if (lastStillpoint) {
    currentAreaId = lastStillpoint.areaId;
    player.x = lastStillpoint.x;
    player.y = lastStillpoint.y - player.height;
    player.vx = 0;
    player.vy = 0;
    player.health = MAX_HEALTH;
    clearAreaEnemies(currentAreaId);
    spawnAreaEnemies(currentAreaId);
    resetCamera();
  } else {
    // No checkpoint yet — respawn at the start of the CURRENT area rather
    // than hard-coding a specific room, so this works correctly whether
    // that's the tutorial or the_fracture (both are pre-Stillpoint).
    player.health = MAX_HEALTH;
    player.x = 100;
    player.y = getCurrentArea().groundY - 60;
    player.vx = 0;
    player.vy = 0;
    areaEnemiesSpawned = {};
    clearAreaEnemies(currentAreaId);
    spawnAreaEnemies(currentAreaId);
    resetCamera();
  }

  echoes = [];
  projectiles = [];
}

// Update game state
function update() {
  frameCount++;

  // FX updates (run in all states)
  if (screenShake > 0) screenShake--;
  if (abilityFlash > 0) abilityFlash--;
  if (deathFadeDir !== 0) {
    // -1 = fade out (alpha 0→1, screen goes black)
    // +1 = fade in  (alpha 1→0, screen clears)
    deathFadeAlpha += (-deathFadeDir) * 0.08;
    if (deathFadeAlpha >= 1 && deathFadeDir < 0) {
      deathFadeAlpha = 1;
      deathFadeDir = 0;
    }
    if (deathFadeAlpha <= 0 && deathFadeDir > 0) {
      deathFadeAlpha = 0;
      deathFadeDir = 0;
      // Fade-in complete — switch from reviving to playing
      if (gameState === 'reviving') {
        gameState = 'playing';
      }
    }
  }

  // Hitstop - freeze frame for impact feel
  if (hitstopTimer > 0) {
    hitstopTimer--;
    clearJustPressed();
    return;
  }

  // Unstuck key (U)
  handleUnstuckKey();
  handleFullscreenKey();

  // Menu state
  if (gameState === 'menu') {
    // Animate menu particles
    for (const p of menuParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += 0.02;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
    }

    // Check for start input
    const saveExists = hasSaveGame();
    if (saveExists && wasJustPressed('KeyN')) {
      startNewGame();
    } else if (wasJustPressed('Space') || wasJustPressed('Enter') || menuClick) {
      menuClick = false;
      if (saveExists && loadGame()) {
        gameState = 'playing';
        SFX.init();
        SFX.setAreaAmbient(currentAreaId);
        showUI(true);
      } else {
        startNewGame();
      }
    }
    clearJustPressed();
    return;
  }

  // Game over state
  if (gameState === 'gameover') {
    if (wasJustPressed('KeyR')) {
      respawnPlayer();
    }
    clearJustPressed();
    return;
  }

  // Pause state
  if (gameState === 'paused') {
    if (wasJustPressed('Escape')) {
      gameState = 'playing';
    }
    clearJustPressed();
    return;
  }

  // Reviving state (fade-in from black) — skip all gameplay until fade completes
  if (gameState === 'reviving') {
    clearJustPressed();
    return;
  }

  // Victory state — boss defeated cinematic
  if (gameState === 'victory') {
    victoryTimer--;
    // Spawn celebration particles
    if (victoryTimer % 8 === 0 && victoryTimer > 60) {
      const colors = ['#fbbf24', '#c4b5fd', '#2dd4bf', '#f87171'];
      spawnParticles(Math.random() * W, Math.random() * H, colors[Math.floor(Math.random() * colors.length)], 5);
    }
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      if (particles[i].life <= 0) particles.splice(i, 1);
    }
    updateCamera(player, getCurrentArea());
    // After cinematic, allow return
    if (victoryTimer <= 0 && wasJustPressed('KeyR')) {
      gameState = 'playing';
      currentAreaId = 'antechamber';
      player.x = 300;
      player.y = 334;
      player.vx = 0;
      player.vy = 0;
      player.health = MAX_HEALTH;
      boss = null;
      bossProjectiles = [];
      bossDefeated = true;
      victoryTimer = 0;
      areaAmbient = [];
      resetCamera();
      saveGame();
    }
    clearJustPressed();
    return;
  }

  // Toggle map during gameplay
  if (wasJustPressed('KeyM')) {
    mapOpen = !mapOpen;
    SFX.uiSelect();
  }
  if (mapOpen) {
    clearJustPressed();
    return;
  }

  // Toggle pause during gameplay — except in the tutorial room, where Escape
  // skips straight to The Fracture instead (tutorial is meant to be skippable).
  if (wasJustPressed('Escape')) {
    if (currentAreaId === 'tutorial_area') {
      skipTutorial();
    } else {
      gameState = 'paused';
    }
    clearJustPressed();
    return;
  }

  // Playing state
  const area = getCurrentArea();
  const bounds = getBounds(area);

  // Spawn boss when entering boss arena
  if (area.isBossArena && !boss && !bossDefeated) {
    const spawn = area.bossSpawn;
    if (spawn) {
      boss = new Boss(spawn.x, spawn.y);
      screenShake = 40;
      screenShakeIntensity = 4;
      spawnParticles(spawn.x + BOSS_WIDTH / 2, spawn.y + BOSS_HEIGHT / 2, '#f87171', 20);
      spawnParticles(spawn.x + BOSS_WIDTH / 2, spawn.y + BOSS_HEIGHT / 2, '#c4b5fd', 15);
    }
  }
  // Clear boss when leaving boss arena
  if (!area.isBossArena && boss) {
    boss = null;
    bossProjectiles = [];
  }

  // Tutorial room: track move/jump/attack/dash steps, hit-test the dummy
  if (currentAreaId === 'tutorial_area') {
    updateTutorial(area);
  }

  // Transition effect
  if (transitioning) {
    transitionAlpha -= 0.05;
    if (transitionAlpha <= 0) {
      transitioning = false;
      transitionAlpha = 0;
    }
  }

  // Cooldowns
  // ── Stillpoint world-slow ───────────────────────────────────────────────
  // Update gameTimeScale — everything except the player and Phase-3 boss reads this.
  gameTimeScale = (player.stillpointActive && abilityState.hasStillpoint) ? 0.15 : 1.0;

  if (abilityState.phaseDashCooldown > 0) abilityState.phaseDashCooldown--;
  if (abilityState.shardShotCooldown > 0) abilityState.shardShotCooldown--;

  // Ambient area particles
  ambientTimer++;
  if (ambientTimer >= 12) {
    ambientTimer = 0;
    areaAmbient.push({
      x: camera.x + Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.5 - 0.1,
      size: Math.random() * 2 + 1,
      alpha: Math.random() * 0.3 + 0.05,
      color: area.ambientColor || '#c4b5fd',
      life: 120 + Math.random() * 60,
    });
  }
  for (let i = areaAmbient.length - 1; i >= 0; i--) {
    const p = areaAmbient[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) areaAmbient.splice(i, 1);
  }

  // Ability popups
  for (let i = abilityPopups.length - 1; i >= 0; i--) {
    const pop = abilityPopups[i];
    pop.y -= 0.5;
    pop.life--;
    if (pop.life <= 0) abilityPopups.splice(i, 1);
  }

  // Update player
  player.update(bounds, area.platforms);

  // Check player death or pit death (fell off the map)
  // Note: death at 0 HP should trigger regardless of invincibility timer
  const playerDead = player.health <= 0;
  const pitDeath = player.y > 600;
  if ((playerDead || pitDeath) && (playerDead || player.invincibleTimer <= 0)) {
    screenShake = 15;
    screenShakeIntensity = 6;
    deathFadeDir = -1;
    deathFadeAlpha = 0;
    SFX.playerHurt();
    if (player.y > 600) {
      // Pit death — respawn at checkpoint or start
      spawnParticles(player.x + player.width / 2, H - 20, '#c4b5fd', 12);
    } else {
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#c4b5fd', 16);
    }
    gameState = 'gameover';
  }

  // Phase Dash echo spawning
  if (player.phaseDashing && player.phaseDashTimer === PHASE_DASH_DURATION - 1) {
    // Spawn echo at the start of the dash
    const echoX = player.x - player.vx * 2;
    const echoY = player.y;
    echoes.push(new Echo(echoX, echoY, player.facing));
  }

  // Shard Shot firing
  if (player.shardShotFired) {
    const proj = useShardShot(player, player.aimingUp);
    if (proj) {
      projectiles.push(proj);
      spawnParticles(proj.x + 5, proj.y + 3, '#67e8f9', 4);
      SFX.shardShot();
    }
  }

  // Update echoes
  for (let i = echoes.length - 1; i >= 0; i--) {
    echoes[i].update();
    if (!echoes[i].alive) {
      echoes.splice(i, 1);
    }
  }

  // Update projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    projectiles[i].update();
    if (!projectiles[i].alive) {
      projectiles.splice(i, 1);
    }
  }

  // ── Crystal Sentinel projectiles ──────────────────────────────────────
  CrystalSentinel.updateProjectiles(player);

  // Update enemies
  const enemies = areaEnemies[currentAreaId] || [];
  for (const enemy of enemies) {
    enemy.update(player, bounds, echoes);

    // Player attack hits enemy
    const playerAtk = player.getAttackHitbox();
    if (playerAtk && !enemy.dead && rectsOverlap(playerAtk, enemy)) {
      enemy.takeDamage(ATTACK_DAMAGE, player.x);
      spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#f87171', 6);
      screenShake = 6;
      screenShakeIntensity = 3;
      hitstopTimer = 4;
      player.gainFracture(); // melee hit recharges Fracture meter
      if (enemy.dead) SFX.enemyDeath(); else SFX.attackHit();
    }

        // Projectile hits enemy
    for (let j = projectiles.length - 1; j >= 0; j--) {
      const proj = projectiles[j];
      const projBounds = proj.getBounds();
      if (!enemy.dead && rectsOverlap(projBounds, enemy)) {
        // If it's a Crystal Sentinel, pass 'ranged' so the shield takes double damage
        if (enemy instanceof CrystalSentinel) {
          enemy.takeDamage(proj.damage, proj.x, 'ranged');
        } else {
          enemy.takeDamage(proj.damage, proj.x);
        }
        spawnParticles(proj.x + 5, proj.y + 3, '#67e8f9', 6);
        projectiles.splice(j, 1);
        screenShake = 4;
        screenShakeIntensity = 2;
        hitstopTimer = 3;
        if (enemy.dead) SFX.enemyDeath(); else SFX.shardHit();
        break;
      }
    }

    // Projectile hits platform
    for (let j = projectiles.length - 1; j >= 0; j--) {
      const proj = projectiles[j];
      const projBounds = proj.getBounds();
      for (const plat of area.platforms) {
        if (plat.destructible && plat.hp > 0) {
          if (rectsOverlap(projBounds, { x: plat.x, y: plat.y, width: plat.w, height: plat.h })) {
            plat.hp--;
            spawnParticles(proj.x + 5, proj.y + 3, '#2dd4bf', 8);
            if (plat.hp <= 0) {
              spawnParticles(plat.x + plat.w / 2, plat.y + plat.h / 2, '#2dd4bf', 16);
            }
            projectiles.splice(j, 1);
            break;
          }
        } else if (!plat.destructible) {
          if (rectsOverlap(projBounds, { x: plat.x, y: plat.y, width: plat.w, height: plat.h })) {
            spawnParticles(proj.x + 5, proj.y + 3, '#67e8f9', 3);
            projectiles.splice(j, 1);
            break;
          }
        }
      }
    }

    // Enemy attack hits player
    const enemyAtk = enemy.getAttackHitbox();
    if (enemyAtk && rectsOverlap(enemyAtk, player)) {
      player.takeDamage(ENEMY_DAMAGE);
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#c4b5fd', 4);
      SFX.playerHurt();
    }

    // Enemy body contact with player
    if (!enemy.dead && rectsOverlap(player, enemy) && player.invincibleTimer <= 0 && !player.phaseDashing) {
      player.takeDamage(ENEMY_DAMAGE);
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#c4b5fd', 4);
      SFX.playerHurt();
    }
  }

  // Remove dead enemies after animation
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].dead && enemies[i].deathTimer >= 20) {
      enemies.splice(i, 1);
    }
  }

  // === BOSS UPDATE ===
  if (boss && !boss.dead) {
    boss.update(player, bossProjectiles, area.width);

    // Handle boss summon requests
    if (boss.summonData) {
      const enemies = areaEnemies[currentAreaId] || [];
      const spawnPos = [boss.summonData.left, boss.summonData.right];
      for (const pos of spawnPos) {
        enemies.push(new FracturedSlime(pos.x, pos.y));
        spawnParticles(pos.x + 15, pos.y + 15, '#c4b5fd', 8);
      }
      boss.summonData = null;
    }

    // Player melee attack hits boss
    const playerAtk = player.getAttackHitbox();
    if (playerAtk && !boss.dead && rectsOverlap(playerAtk, boss)) {
      boss.takeDamage(ATTACK_DAMAGE, player.x, 'melee');
      spawnParticles(boss.x + boss.width / 2, boss.y + boss.height / 2, '#f87171', 6);
      player.gainFracture();
      SFX.bossHit();
    }

    // Player projectiles hit boss
    for (let j = projectiles.length - 1; j >= 0; j--) {
      const proj = projectiles[j];
      const projBounds = proj.getBounds();
      if (!boss.dead && rectsOverlap(projBounds, boss)) {
        boss.takeDamage(proj.damage, proj.x, 'ranged');
        spawnParticles(proj.x + 5, proj.y + 3, '#67e8f9', 6);
        projectiles.splice(j, 1);
        SFX.bossHit();
      }
    }

    // Boss projectiles hit player
    for (let j = bossProjectiles.length - 1; j >= 0; j--) {
      const bp = bossProjectiles[j];
      const bpBounds = { x: bp.x, y: bp.y, width: bp.width, height: bp.height };
      if (rectsOverlap(bpBounds, player) && player.invincibleTimer <= 0 && !player.phaseDashing) {
        player.takeDamage(BOSS_DAMAGE);
        spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#f87171', 4);
        bossProjectiles.splice(j, 1);
        SFX.playerHurt();
      }
    }

    // Boss body contact with player
    if (!boss.dead && rectsOverlap(player, boss) && player.invincibleTimer <= 0 && !player.phaseDashing) {
      player.takeDamage(BOSS_DAMAGE);
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#f87171', 4);
      SFX.playerHurt();
    }

    // Boss death — trigger victory!
    if (boss.dead && boss.deathTimer === 1) {
      screenShake = 60;
      screenShakeIntensity = 5;
      spawnParticles(boss.x + boss.width / 2, boss.y + boss.height / 2, '#fbbf24', 30);
      spawnParticles(boss.x + boss.width / 2, boss.y + boss.height / 2, '#c4b5fd', 20);
      spawnParticles(boss.x + boss.width / 2, boss.y + boss.height / 2, '#2dd4bf', 15);
      victoryTimer = 180;
      gameState = 'victory';
      SFX.bossDeath();
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }
  }

  // Check transitions
  for (const trans of area.transitions) {
    // Check ability requirement
    if (trans.requires) {
      if (trans.requires === 'phase_dash' && !abilityState.hasPhaseDash) continue;
      if (trans.requires === 'shard_shot' && !abilityState.hasShardShot) continue;
      if (trans.requires === 'stillpoint' && !abilityState.hasStillpoint) continue;
      if (trans.requires === 'boss_gate' && (!abilityState.hasPhaseDash || !abilityState.hasShardShot || !abilityState.hasStillpoint)) continue;
      if (trans.requires === 'tutorial_complete' && !isTutorialComplete()) continue;
    }

    if (rectsOverlap(
      { x: player.x, y: player.y, width: player.width, height: player.height },
      { x: trans.x, y: trans.y, width: trans.w, height: trans.h }
    )) {
      switchArea(trans.to, trans.toX, trans.toY);
      break;
    }
  }

  // Check Stillpoint checkpoints
  const spKey = currentAreaId;
  for (const sp of area.stillpoints) {
    const dist = Math.abs(player.x - sp.x);
    if (dist < 40) {
      if (!stillpointActivated[spKey]) {
        stillpointActivated[spKey] = true;
        // Heal 1 pip on first activation — the Stillpoint restores you
        if (player.health < MAX_HEALTH) {
          player.health = Math.min(MAX_HEALTH, player.health + 1);
          addAbilityNotification('STILLPOINT ACTIVATED — health restored');
        } else {
          addAbilityNotification('STILLPOINT ACTIVATED');
        }
        spawnParticles(sp.x, sp.y - 30, '#c4b5fd', 12);
        SFX.stillpoint();
      }
      // Save checkpoint position (only write if it's actually a new checkpoint —
      // avoids hammering localStorage every frame while standing near one)
      const isNewCheckpoint = !lastStillpoint || lastStillpoint.areaId !== currentAreaId || lastStillpoint.x !== sp.x || lastStillpoint.y !== sp.y;
      lastStillpoint = {
        areaId: currentAreaId,
        x: sp.x,
        y: sp.y,
      };
      if (isNewCheckpoint) saveGame();
    }
  }

  // Check ability rewards
  if (area.abilityReward) {
    const ab = area.abilityReward;
    const dist = Math.abs((player.x + player.width / 2) - ab.x) +
                 Math.abs((player.y + player.height / 2) - ab.y);
    if (dist < 30) {
      if (ab.id === 'phase_dash' && !abilityState.hasPhaseDash) {
        abilityState.hasPhaseDash = true;
        addAbilityNotification('ABILITY: Phase Dash — Tap C to dash');
        spawnParticles(ab.x, ab.y, '#a78bfa', 20);
        abilityFlash = 12;
        abilityFlashColor = '#a78bfa';
        abilityPopups.push({ text: '★ PHASE DASH', x: ab.x, y: ab.y - 20, life: 90, color: '#a78bfa' });
        SFX.abilityPickup();
        saveGame();
      } else if (ab.id === 'shard_shot' && !abilityState.hasShardShot) {
        abilityState.hasShardShot = true;
        addAbilityNotification('ABILITY: Shard Shot — V to fire, W+V to tilt');
        spawnParticles(ab.x, ab.y, '#67e8f9', 20);
        abilityFlash = 12;
        abilityFlashColor = '#67e8f9';
        abilityPopups.push({ text: '★ SHARD SHOT', x: ab.x, y: ab.y - 20, life: 90, color: '#67e8f9' });
        SFX.abilityPickup();
        saveGame();
      } else if (ab.id === 'stillpoint' && !abilityState.hasStillpoint) {
        abilityState.hasStillpoint = true;
        player.fractureMeter = 1; // start with 1 pip so player can immediately try it
        addAbilityNotification('STILLPOINT — Q to slow time. Recharge by hitting enemies.');
        spawnParticles(ab.x, ab.y, '#67e8f9', 28);
        abilityFlash = 16;
        abilityFlashColor = '#67e8f9';
        abilityPopups.push({ text: '★ STILLPOINT', x: ab.x, y: ab.y - 20, life: 120, color: '#67e8f9' });
        SFX.abilityPickup();
        saveGame();
      }
    }
  }

  // Check lore fragments (sparse environmental storytelling pickups)
  if (LORE_ENABLED && area.loreFragments) {
    for (const lf of area.loreFragments) {
      if (collectedLore[lf.id]) continue;
      const dist = Math.abs((player.x + player.width / 2) - lf.x) +
                   Math.abs((player.y + player.height / 2) - lf.y);
      if (dist < 30) {
        collectedLore[lf.id] = true;
        SFX.lorePickup();
        spawnParticles(lf.x, lf.y, '#fbbf24', 14);
        loreOverlay = { text: lf.text, timer: 280, maxTimer: 280 };
      }
    }
  }

  // Update lore overlay timer
  if (loreOverlay) {
    loreOverlay.timer--;
    if (loreOverlay.timer <= 0) loreOverlay = null;
  }

  // Update notifications
  for (let i = abilityState.notifications.length - 1; i >= 0; i--) {
    abilityState.notifications[i].timer--;
    if (abilityState.notifications[i].timer <= 0) {
      abilityState.notifications.splice(i, 1);
    }
  }

  // Update camera
  updateCamera(player, area);

  clearJustPressed();
}

// NOTE: The HUD (health, boss health, ability cooldowns, area name, checkpoint
// indicator) is drawn directly on the canvas by drawHUD() inside draw() — see
// the "CANVAS HUD (Phase 0.1)" section near the bottom of this file. There is
// no DOM-based UI left to update per-frame, so updateUI() has been removed.

// ═══════════════════════════════════════════════════════════════════════
// CANVAS HUD (Phase 0.1) — health, ability icons + cooldown rings, area
// name, checkpoint indicator, boss health bar, and the fading controls hint.
// Everything used to live in HTML overlays (#ui, #ability-bar,
// #boss-health-container, #controls-hint); those elements no longer exist
// in index.html, so all of it is drawn straight onto the canvas here.
// ═══════════════════════════════════════════════════════════════════════

function drawHUD(ctx) {
  if (!hudVisible || !player) return;

  drawHealthHearts(ctx);
  drawAreaLabel(ctx);
  if (boss && !boss.dead && gameState === 'playing') {
    drawBossHealthBar(ctx);
  }
  if (currentAreaId === 'tutorial_area') {
    drawTutorialBanner(ctx);
  }
  drawControlsHint(ctx);
}

// Top-center checklist banner for the tutorial room: current objective
// highlighted, completed ones checked off, plus a skip hint.
function drawTutorialBanner(ctx) {
  const steps = [
    { done: tutorialState.moved, label: 'MOVE \u2190\u2192' },
    { done: tutorialState.jumped, label: 'JUMP \u2191/SPACE' },
    { done: tutorialState.attacked, label: 'ATTACK Z (hit the dummy)' },
    { done: tutorialState.dashed, label: 'DASH X (cross the gap)' },
  ];
  // First not-yet-done step is the active one
  let activeIndex = steps.findIndex(s => !s.done);

  ctx.textAlign = 'center';
  ctx.font = '9px "Courier New", monospace';
  ctx.fillStyle = '#4a4a6e';
  ctx.fillText('THRESHOLD', W / 2, 58);

  ctx.font = '13px "Courier New", monospace';
  if (activeIndex === -1) {
    ctx.fillStyle = '#c4b5fd';
    ctx.fillText('Door unlocked \u2014 head right', W / 2, 78);
  } else {
    ctx.fillStyle = '#e0d7ff';
    ctx.fillText(steps[activeIndex].label, W / 2, 78);
  }

  // Small checklist row of dots beneath
  const dotGap = 20;
  const startX = W / 2 - ((steps.length - 1) * dotGap) / 2;
  for (let i = 0; i < steps.length; i++) {
    const x = startX + i * dotGap;
    ctx.beginPath();
    ctx.arc(x, 90, 3, 0, Math.PI * 2);
    ctx.fillStyle = steps[i].done ? '#c4b5fd' : (i === activeIndex ? '#67e8f9' : '#3a3a5e');
    ctx.fill();
  }

  ctx.font = '9px "Courier New", monospace';
  ctx.fillStyle = '#3a3a5e';
  ctx.fillText('ESC to skip', W / 2, 106);
  ctx.textAlign = 'left';
}

// Top-left: one heart glyph per point of MAX_HEALTH.
function drawHealthHearts(ctx) {
  const size = 16;
  const gap = 3;
  const startX = 16;
  const startY = 14;

  ctx.font = `${size}px "Courier New", monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Colour shifts as health drops, mirroring the old CSS health-bar behavior.
  const heartColor = player.health <= 2 ? '#f87171' : player.health <= 4 ? '#fbbf24' : '#c4b5fd';

  for (let i = 0; i < MAX_HEALTH; i++) {
    const x = startX + i * (size + gap);
    const filled = i < player.health;
    // Faint drop-shadow so hearts stay readable over any background.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText(filled ? '\u2665' : '\u2661', x + 1, startY + 1);
    ctx.fillStyle = filled ? heartColor : '#3a3a5e';
    ctx.fillText(filled ? '\u2665' : '\u2661', x, startY);
  }
  ctx.textBaseline = 'alphabetic';
}

// Area name + checkpoint indicator, just under the health hearts.
function drawAreaLabel(ctx) {
  const area = getCurrentArea();
  ctx.font = '11px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#6a6a8e';
  ctx.fillText(area.name, 16, 42);

  const nameWidth = ctx.measureText(area.name).width;
  ctx.fillStyle = lastStillpoint ? '#c4b5fd' : '#4a4a6e';
  ctx.fillText(lastStillpoint ? '\u25cf' : '\u25cb', 16 + nameWidth + 8, 42);
}

// Top-center: boss health bar (drawn only while a boss is alive & active).
function drawBossHealthBar(ctx) {
  const barW = 320;
  const barH = 12;
  const x = W / 2 - barW / 2;
  const y = 18;
  const maxHp = boss.maxHealth || BOSS_MAX_HEALTH;
  const percent = Math.max(0, boss.health / maxHp);

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(x, y, barW, barH);
  const grad = ctx.createLinearGradient(x, y, x + barW, y);
  grad.addColorStop(0, '#dc2626');
  grad.addColorStop(1, '#f87171');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, barW * percent, barH);
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, barW, barH);

  ctx.font = '12px "Courier New", monospace';
  ctx.fillStyle = '#f87171';
  ctx.textAlign = 'center';
  ctx.fillText('THE FRACTURED KING', W / 2, y + barH + 15);
  ctx.textAlign = 'left';
}

// Bottom-right: control reminders, fading out ~10s after the run starts.
function drawControlsHint(ctx) {
  if (playStartFrame < 0) return;
  const elapsed = frameCount - playStartFrame;
  if (elapsed >= CONTROLS_HINT_FADE_END) return;

  let alpha = 1;
  if (elapsed > CONTROLS_HINT_FADE_START) {
    alpha = 1 - (elapsed - CONTROLS_HINT_FADE_START) / (CONTROLS_HINT_FADE_END - CONTROLS_HINT_FADE_START);
  }
  alpha = Math.max(0, Math.min(1, alpha));
  if (alpha <= 0) return;

  const lines = ['MOVE \u2190\u2192  JUMP SPACE  DASH X  ATTACK Z', 'MAP M  PAUSE ESC  FULLSCREEN F'];
  ctx.globalAlpha = alpha;
  ctx.font = '10px "Courier New", monospace';
  ctx.fillStyle = '#2a2a3e';
  ctx.textAlign = 'right';
  let ly = H - 12 - (lines.length - 1) * 13;
  for (const line of lines) {
    ctx.fillText(line, W - 16, ly);
    ly += 13;
  }
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}

// Small recharge rings around the player's feet — one per ability that's
// actually cooling down (world space, drawn while the camera transform is
// still active). Nothing is shown for abilities that are ready or not yet
// unlocked, so there's no permanent panel on screen — just a quiet pulse
// under the player exactly when it matters.
function drawDashCooldownRing(ctx) {
  if (!player) return;
  const cx = player.x + player.width / 2;
  const cy = player.y + player.height + 3;

  const rings = [];
  if (player.dashCooldown > 0) {
    rings.push({ frac: 1 - player.dashCooldown / DASH_COOLDOWN, color: '196, 181, 253' }); // violet
  }
  if (abilityState.hasPhaseDash && abilityState.phaseDashCooldown > 0) {
    rings.push({ frac: 1 - abilityState.phaseDashCooldown / PHASE_DASH_COOLDOWN, color: '167, 139, 250' }); // purple
  }
  if (abilityState.hasShardShot && abilityState.shardShotCooldown > 0) {
    rings.push({ frac: 1 - abilityState.shardShotCooldown / SHARD_SHOT_COOLDOWN, color: '45, 212, 191' }); // teal
  }
  if (rings.length === 0) return;

  let r = 7;
  for (const ring of rings) {
    ctx.strokeStyle = `rgba(90, 90, 130, 0.35)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(${ring.color}, 0.85)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + ring.frac * Math.PI * 2);
    ctx.stroke();

    r += 4; // stack additional rings a little further out
  }
}

// Draw the start menu
function drawMenu() {
  // Background
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, W, H);

  // Ambient particles
  for (const p of menuParticles) {
    const pulse = Math.sin(p.pulse) * 0.15 + 0.85;
    ctx.globalAlpha = p.alpha * pulse;
    ctx.fillStyle = '#c4b5fd';
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // Subtle grid
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 0.5;
  const gridOffset = Math.round(frameCount * 0.1);
  for (let x = -gridOffset % 40; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Title glow
  const titlePulse = Math.sin(frameCount * 0.025) * 0.3 + 0.7;
  const gradient = ctx.createRadialGradient(W / 2, H / 2 - 40, 0, W / 2, H / 2 - 40, 250);
  gradient.addColorStop(0, `rgba(196, 181, 253, ${titlePulse * 0.12})`);
  gradient.addColorStop(1, 'rgba(196, 181, 253, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.textAlign = 'center';

  // Title text
  ctx.fillStyle = `rgba(196, 181, 253, ${titlePulse})`;
  ctx.font = 'bold 64px "Courier New", monospace';
  ctx.fillText('STILLPOINT', W / 2, H / 2 - 50);

  // Subtitle
  ctx.fillStyle = `rgba(103, 232, 249, ${titlePulse * 0.7})`;
  ctx.font = '14px "Courier New", monospace';
  ctx.fillText('A world fractured in time', W / 2, H / 2 - 20);

  // Prompt
  const promptAlpha = Math.sin(frameCount * 0.05) * 0.4 + 0.6;
  ctx.fillStyle = `rgba(203, 245, 255, ${promptAlpha})`;
  ctx.font = '16px "Courier New", monospace';
  if (hasSaveGame()) {
    ctx.fillText('[ Space / Click to Continue ]', W / 2, H / 2 + 30);
    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = 'rgba(106, 106, 142, 0.7)';
    ctx.fillText('N : New Game', W / 2, H / 2 + 50);
  } else {
    ctx.fillText('[ Space / Click to Begin ]', W / 2, H / 2 + 30);
  }

  // Controls
  ctx.fillStyle = 'rgba(106, 106, 142, 0.6)';
  ctx.font = '11px "Courier New", monospace';
  ctx.fillText('\u2190 \u2192 / A D : Move  |  \u2191 / Space : Jump  |  X : Dash', W / 2, H / 2 + 75);
  ctx.fillText('Z / J : Attack  |  C : Phase Dash  |  V : Shard Shot  |  W+V : Tilt', W / 2, H / 2 + 93);
  ctx.fillText('M : Map', W / 2, H / 2 + 111);

  // Footer
  ctx.fillStyle = 'rgba(58, 58, 94, 0.5)';
  ctx.font = '10px "Courier New", monospace';
  ctx.fillText('Stillpoint \u2014 Phase 2', W / 2, H - 20);

  ctx.textAlign = 'left';
}

// Render
function draw() {
  // Menu screen
  if (gameState === 'menu') {
    drawMenu();
    return;
  }

  const area = getCurrentArea();

  // Background
  ctx.fillStyle = area.bgColor;
  ctx.fillRect(0, 0, W, H);

  // Area-specific background tint
  ctx.fillStyle = area.bgTint;
  ctx.fillRect(0, 0, W, H);

  // Parallax backdrop — deep nebulae + area-specific silhouettes (screen space, not camera-transformed)
  drawAreaBackdrop(ctx, area, camera);

  // Camera transform
  ctx.save();
  applyCamera(ctx);

  // Screen shake
  if (screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * screenShakeIntensity;
    const shakeY = (Math.random() - 0.5) * screenShakeIntensity;
    ctx.translate(shakeX, shakeY);
    // Decay intensity
    screenShakeIntensity *= 0.9;
  }

  // Background details - subtle grid (parallax-ish)
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 0.5;
  const gridOffset = Math.round(camera.x * 0.3);
  for (let x = -gridOffset % 40; x < area.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(area.width, y);
    ctx.stroke();
  }

  // Ground line
  ctx.strokeStyle = '#2a2a3e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, area.groundY);
  ctx.lineTo(area.width, area.groundY);
  ctx.stroke();

  // Platforms
  for (const plat of area.platforms) {
    drawPlatform(ctx, plat);
  }

  // Transitions (subtle indicators)
  for (const trans of area.transitions) {
    // Check if player can access this transition
    let blocked = false;
    if (trans.requires === 'phase_dash' && !abilityState.hasPhaseDash) blocked = true;
    if (trans.requires === 'shard_shot' && !abilityState.hasShardShot) blocked = true;
    if (trans.requires === 'stillpoint' && !abilityState.hasStillpoint) blocked = true;
    if (trans.requires === 'tutorial_complete' && !isTutorialComplete()) blocked = true;

    const pulse = Math.sin(frameCount * 0.03) * 0.15 + 0.15;
    if (blocked) {
      ctx.fillStyle = `rgba(100, 60, 60, ${pulse})`;
      ctx.strokeStyle = 'rgba(150, 80, 80, 0.3)';
    } else {
      ctx.fillStyle = `rgba(196, 181, 253, ${pulse})`;
      ctx.strokeStyle = 'rgba(196, 181, 253, 0.3)';
    }
    ctx.fillRect(trans.x, trans.y, trans.w, trans.h);
    ctx.lineWidth = 1;
    ctx.strokeRect(trans.x, trans.y, trans.w, trans.h);

    // Arrow indicator
    if (!blocked) {
      ctx.fillStyle = `rgba(196, 181, 253, ${pulse + 0.1})`;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      if (trans.toX > trans.x + trans.w) {
        ctx.fillText('→', trans.x + trans.w / 2, trans.y + trans.h / 2 + 4);
      } else {
        ctx.fillText('←', trans.x + trans.w / 2, trans.y + trans.h / 2 + 4);
      }
      ctx.textAlign = 'left';
    }
  }

  // Stillpoints (checkpoints)
  for (const sp of area.stillpoints) {
    const activated = stillpointActivated[currentAreaId] || false;
    drawStillpoint(ctx, sp, area, activated);
  }

  // Ability rewards
  if (area.abilityReward) {
    drawAbilityReward(ctx, area.abilityReward);
  }

  // Lore fragments (sparse environmental storytelling pickups)
  if (LORE_ENABLED && area.loreFragments) {
    for (const lf of area.loreFragments) {
      if (!collectedLore[lf.id]) drawLoreFragment(ctx, lf);
    }
  }

  // Training dummy (tutorial room only)
  if (area.trainingDummy) {
    drawTrainingDummy(ctx, area.trainingDummy, tutorialState.attacked);
  }

  // Enemies
  const enemies = areaEnemies[currentAreaId] || [];
  for (const enemy of enemies) {
    enemy.draw(ctx);
  }

  // Echoes
  for (const echo of echoes) {
    echo.draw(ctx);
  }

  // Projectiles
  for (const proj of projectiles) {
    proj.draw(ctx);
  }

  // Player
  player.draw(ctx);
  drawDashCooldownRing(ctx);

  // Boss
  if (boss) {
    boss.draw(ctx);
    boss.drawTelegraphs(ctx);
    drawBossProjectiles(ctx, bossProjectiles);
  }

   // ── Crystal Sentinel projectiles ──────────────────────────────────────
  CrystalSentinel.drawProjectiles(ctx);

  // Particles
  for (const p of particles) {
    p.draw(ctx);
  }

  // Ambient area particles
  for (const p of areaAmbient) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // Subtle vignette — darkens edges, focuses attention on the player
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // ── Stillpoint slow-world overlay ────────────────────────────────────────
  if (player.stillpointActive && abilityState.hasStillpoint) {
    // Cool blue edge frost
    ctx.fillStyle = 'rgba(103, 232, 249, 0.07)';
    ctx.fillRect(0, 0, W, H);
    const frostGrad = ctx.createRadialGradient(W/2, H/2, H*0.28, W/2, H/2, H*0.75);
    frostGrad.addColorStop(0, 'rgba(103, 232, 249, 0)');
    frostGrad.addColorStop(1, 'rgba(10, 40, 80, 0.28)');
    ctx.fillStyle = frostGrad;
    ctx.fillRect(0, 0, W, H);
    // Corner pillars
    const c = 'rgba(103, 232, 249, 0.14)';
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 5, H);
    ctx.fillRect(W - 5, 0, 5, H);
    ctx.fillRect(0, 0, W, 5);
    ctx.fillRect(0, H - 5, W, 5);
    // Label
    ctx.fillStyle = 'rgba(103, 232, 249, 0.6)';
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('STILLPOINT', W - 14, 26);
    ctx.textAlign = 'left';
  }

  // ── Fracture meter pips ───────────────────────────────────────────────────
  if (abilityState.hasStillpoint) {
    ctx.font = '9px "Courier New", monospace';
    ctx.fillStyle = 'rgba(103, 232, 249, 0.45)';
    ctx.fillText('FRACTURE', 14, H - 58);
    for (let i = 0; i < FRACTURE_MAX; i++) {
      const px = 14 + i * 22;
      const py = H - 48;
      const filled = i < player.fractureMeter;
      const isLastDraining = filled && i === player.fractureMeter - 1 && player.stillpointActive;
      ctx.save();
      ctx.translate(px + 7, py + 7);
      ctx.rotate(Math.PI / 4);
      if (filled) {
        const alpha = isLastDraining ? (1 - player.fractureDrain / FRACTURE_DRAIN_RATE) * 0.9 + 0.1 : 1;
        ctx.fillStyle = player.stillpointActive ? `rgba(103, 232, 249, ${alpha})` : `rgba(196, 181, 253, ${alpha})`;
        ctx.fillRect(-6, -6, 12, 12);
      }
      ctx.strokeStyle = filled ? (player.stillpointActive ? '#67e8f9' : '#c4b5fd') : '#3a3a5e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-6, -6, 12, 12);
      ctx.restore();
    }
  }

  // ── HUD: health, ability icons, area name, boss bar, controls hint ───────
  drawHUD(ctx);

  // Transition overlay
  if (transitioning && transitionAlpha > 0) {
    ctx.fillStyle = `rgba(10, 10, 15, ${transitionAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Ability notifications
  for (let i = 0; i < abilityState.notifications.length; i++) {
    const n = abilityState.notifications[i];
    const alpha = Math.min(1, n.timer / 30);
    const offsetY = i * 25;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#67e8f9';
    ctx.font = '14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(n.text, W / 2, 100 + offsetY);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // Game over screen
  if (gameState === 'gameover') {
    ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#f87171';
    ctx.font = '48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TIME COLLAPSED', W / 2, H / 2 - 60);

    ctx.font = '16px "Courier New", monospace';
    ctx.fillStyle = '#6a6a8e';
    if (lastStillpoint) {
      ctx.fillText('Press R to return to Stillpoint', W / 2, H / 2 - 10);
    } else {
      ctx.fillText('Press R to restart', W / 2, H / 2 - 10);
    }

    // Controls reminder
    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = '#3a3a5e';
    ctx.fillText('← → / A D: Move | ↑ / Space: Jump | X: Dash', W / 2, H / 2 + 30);
    ctx.fillText('Z / J: Attack', W / 2, H / 2 + 48);
    if (abilityState.hasPhaseDash || abilityState.hasShardShot) {
      const abilities = [];
      if (abilityState.hasPhaseDash) abilities.push('C: Phase Dash');
      if (abilityState.hasShardShot) abilities.push('V: Shard Shot | W+V: Tilt');
      ctx.fillText(abilities.join('  |  '), W / 2, H / 2 + 66);
    }

    ctx.textAlign = 'left';
  }

  // Victory screen
  if (gameState === 'victory') {
    const progress = 1 - Math.min(1, victoryTimer / 180);
    ctx.fillStyle = `rgba(10, 10, 15, ${Math.min(0.7, progress * 0.8)})`;
    ctx.fillRect(0, 0, W, H);

    if (victoryTimer <= 0) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 32px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('STILLPOINT RESTORED', W / 2, H / 2 - 40);

      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = '#e0d4ff';
      ctx.fillText('The Fracture has been healed.', W / 2, H / 2);

      ctx.font = '12px "Courier New", monospace';
      ctx.fillStyle = '#6a6a8e';
      ctx.fillText('Press R to return to the Core', W / 2, H / 2 + 40);
    }
    ctx.textAlign = 'left';
  }

  // Ability flash overlay
  if (abilityFlash > 0) {
    const flashAlpha = (abilityFlash / 12) * 0.25;
    ctx.fillStyle = abilityFlashColor.replace(')', `, ${flashAlpha})`).replace('rgb', 'rgba');
    // Fallback for hex colors
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = abilityFlashColor;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // Death/respawn fade overlay (cap opacity during gameover so text is visible)
  if (deathFadeAlpha > 0) {
    const fadeAlpha = gameState === 'gameover' ? Math.min(deathFadeAlpha, 0.6) : deathFadeAlpha;
    ctx.globalAlpha = fadeAlpha;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // Ability popups (floating text, screen space)
  ctx.textAlign = 'center';
  for (const pop of abilityPopups) {
    const alpha = Math.min(1, pop.life / 30);
    const screenX = pop.x - camera.x;
    const screenY = pop.y - camera.y;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText(pop.text, screenX + 1, screenY + 1);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, screenX, screenY);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';

  // Pause overlay
  if (gameState === 'paused') {
    ctx.fillStyle = 'rgba(10, 10, 15, 0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.fillText('PAUSED', W / 2, H / 2 - 20);

    ctx.fillStyle = '#6a6a8e';
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText('Press ESC to resume', W / 2, H / 2 + 20);
    ctx.textAlign = 'left';
  }

  // Lore reading overlay
  if (loreOverlay) {
    const fadeIn = loreOverlay.maxTimer - loreOverlay.timer;
    const alpha = fadeIn < 20 ? fadeIn / 20 : Math.min(1, loreOverlay.timer / 40);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
    ctx.fillRect(W / 2 - 230, H - 116, 460, 76);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(W / 2 - 230, H - 116, 460, 76);
    ctx.fillStyle = '#fde68a';
    ctx.font = 'italic 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    wrapText(ctx, loreOverlay.text, W / 2, H - 96, 420, 15);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // Full-screen map overlay
  if (mapOpen) {
    drawMap(ctx, currentAreaId, discoveredAreas, stillpointActivated);
  }
}

// Wrap and draw multi-line centered text (used for lore overlay)
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, yy);
      line = w + ' ';
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, yy);
}

// Main loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start
init();
gameLoop();