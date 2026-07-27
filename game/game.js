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
  // Several editor/*.html dev tools (difficulty_bot.html, enemy_test.html,
  // companion_test.html, enemy_designer.html, ability_tester.html) lay the
  // canvas out next to a fixed-width `#side` sidebar instead of filling the
  // whole window the way index.html does. Sizing against the full window
  // here (ignoring the sidebar) makes the canvas wider than the space
  // actually left for it, and since #stage/#side are flex-shrink:0 flex
  // items, the overflow gets clipped by body's `overflow:hidden` — the
  // sidebar renders fully off-screen to the right, invisible, not just
  // squeezed. Each of those pages used to carry its own copy of this exact
  // sidebar-aware calc as a second 'resize' listener registered after this
  // one specifically to override it — four duplicated, order-dependent
  // copies of the same fix. Centralizing it here (index.html has no #side,
  // so this is a no-op there) means every current and future #side-based
  // tool gets it for free with no override needed.
  const sideEl = document.getElementById('side');
  const sideWidth = (sideEl && sideEl.offsetParent !== null) ? sideEl.offsetWidth : 0;
  const availW = window.innerWidth - sideWidth;
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

// ── Game state & globals ────────────────────────────────────────────────
let player;
let currentAreaId = 'spawn_area_1';
let echoes = [];
let standEcho = null; // Phase Dash Lv4 Limit Break — a persistent Echo that follows the player and mirrors every swing
// Style-only playback for the Void Tether beam's 'void_tether_beam'
// ANIM_DEFS entry (2026-07-19) — see game/animdata.js's FRAME SHAPE comment.
// The mock entity is never actually used (style frames carry no
// position/pose), Animator just needs something non-null to construct.
let tetherBeamAnimator = new Animator({ x: 0, y: 0, width: 0, height: 0, facing: 1 });
let projectiles = [];
let particles = [];
// Afterimage Strike hazards (enemy_attack_vocabulary_plan.md, phase_dash
// counter "afterimage_strike") — { x, y, timer, radius, damage, def } —
// armed where the player lands after dashing through a marked enemy, then
// explodes once `timer` runs out. See the phase_dash overlap check in the
// main enemy loop below for where these get pushed, and the update/draw
// passes near the projectile ones for how they tick and render.
let afterimageHazards = [];
let menuParticles = []; // ambient particles for start screen
let menuClick = false; // canvas click for menu
let gameRunning = true;
let gameState = 'menu'; // 'menu', 'playing', 'gameover', 'paused', 'paused_controls', 'reviving', 'inventory', 'victory', 'cutscene'

// `let player`/`let gameState` above are top-level script-scope bindings,
// not `window` properties — same class of bug as the AREAS fix in area.js
// (see the comment there): debug_v1.html reaches into a sandboxed iframe
// via `win.player`/`win.gameState` (R10) and got `undefined`, so the check
// threw immediately on the first room instead of ever running. Both are
// reassigned throughout this file (not just here), so a one-time
// `window.player = player` would go stale the moment a new game starts —
// live getters keep external readers in sync with whatever the current
// binding actually holds.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'player', { get: () => player, configurable: true });
  Object.defineProperty(window, 'gameState', { get: () => gameState, configurable: true });
}
let frameCount = 0;
let transitionAlpha = 0;
let transitioning = false;
// Grace period after switchArea() during which the transitions-check loop
// is skipped (2026-07-19 audit: 149/195 authored door pairs land the player
// inside the destination room's own return-door trigger — e.g. tutorial's
// south door lands at (455,896), which sits inside the_fracture_part1's own
// door back to tutorial at (425,864,60x72)). With no debounce, that overlap
// re-fires switchArea() on the very next tick, which flips right back into
// an equally-overlapping trigger on the other side — an every-tick infinite
// ping-pong that also pins transitionAlpha at 1 forever (switchArea() resets
// it to 1 each call, so it never gets a tick to count down), which is why
// this reads as the screen going solid black rather than merely flickering.
// A short cooldown is the fix for the whole class at once, rather than
// hand-recomputing ~150 authored toX/toY pairs across the world map.
let doorCooldown = 0;
const DOOR_COOLDOWN_FRAMES = 20; // ~330ms — well under normal reaction time to walk back through a door on purpose

// Death/respawn FX
let screenShake = 0; // frames of shake remaining
let screenShakeIntensity = 0;
// Accessibility toggles (Phase 0.6)
let screenShakeEnabled = true;
let hitstopEnabled = true;
// Kill cam slow-mo
let slowMoTimer = 0;    // frames remaining in slow-mo
let slowMoSkip = 0;     // frame counter for skipping (0 = render, 1 = skip)
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
let lastAnchor = null; // { areaId, x, y }
let anchorActivated = {}; // track activated anchors per area

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

// Miniboss fight state — separate from `boss` (the King), which is tied to
// isBossArena and the victory-cinematic flow. Minibosses use `isMinibossArena`
// + `area.miniboss` (an id string) instead, and just persist a defeated flag
// per id (keyed in `defeatedMinibosses`) rather than ending the run.
let miniboss = null;
let defeatedMinibosses = {};

// id (area.miniboss) -> class. One entry per miniboss; adding a new one
// never touches the spawn-check block below. Ids with no entry here yet
// (the other 10 already-wired rooms) simply don't spawn anything — see
// the `if (spawn && MinibossClass)` guard.
const MINIBOSS_CLASSES = {
  colossus_core: ColossusCore,
  static_guardian: TheConduit,
  hollow_guardian: MirrorKing,
  graviton_sentinel: GravitonGuard,
  paradox_engine: TheAssembler,
  timeline_keeper: TheStationmaster,
  abyss_guardian: QuantumPursuer,
  warp_guardian: WardenAndHollow,
  polar_guardian: ElectromagneticGolem,
  horizon_core: HorizonCore,
  chrono_ally: TemporalWarden,
};

// The Child companion (companion.js) — exists only while
// companionState.active (the keep-the-Child branch, or the arena tool).
let child = null;

// Camera
// zoom 1 = original fixed W x H framing; >1 zooms in (smaller world slice
// visible, entities read bigger), <1 zooms out. Live-adjustable in-game via
// BracketLeft/BracketRight (see the 'playing' input block) so it's easy to
// fiddle with while testing enemy/arena scale — not just a hardcoded const.
let camera = { x: 0, y: 0, zoom: 1 };

// Debug overlay (F3 toggles) — shows each enemy's current AI
// state/attack/role above its head, for tuning ComposedEnemy behavior
// without guessing from animation alone. Not Backquote — that's already
// bound to fullscreen (input.js's 'fullscreen' action).
let DEBUG_MODE = false;

// Builds the F3 debug-overlay label for one enemy. Handles both the older
// bespoke enemy classes (a plain this.state string) and ComposedEnemy
// (windingUp/attacking/_activeAttack — no single state string) since both
// kinds can be on screen at once.
function debugLabelForEnemy(enemy) {
  const parts = [];
  if (enemy.role) parts.push(enemy.role);
  if (typeof enemy.attacks !== 'undefined') {
    // ComposedEnemy
    if (enemy.attacking && enemy._activeAttack != null) {
      parts.push('atk:' + enemy.attacks[enemy._activeAttack].type);
    } else if (enemy.windingUp && enemy._activeAttack != null) {
      parts.push('wind:' + enemy.attacks[enemy._activeAttack].type);
    } else if (enemy.aware) {
      parts.push('chase');
    } else {
      parts.push('idle');
    }
  } else if (enemy.state) {
    parts.push(enemy.state);
  }
  if (enemy.blocking > 0) parts.push('block');
  if (enemy.dodgeIFrames > 0) parts.push('dodge');
  if (enemy.breakoutCharge > 0) parts.push('breakout');
  parts.push(Math.max(0, Math.round(enemy.health)) + '/' + (enemy.maxHealth ?? '?'));
  return parts.join(' ');
}

// Hitstop (freeze frames on impacts for game feel)
let hitstopTimer = 0;

// Time-scale for Stillpoint slow-world effect (1.0 = normal, ~0.15 = slow)
let gameTimeScale = 1.0;

// hitstopTimer decrements one raw frame per real frame (unaffected by
// gameTimeScale), so a hit landing during Stillpoint's slow-mo reads as a
// proportionally SHORTER freeze than the same hit at normal speed (the rest
// of the world is already crawling, so a fixed-length freeze barely
// registers against it). setHitstop() scales the requested duration up by
// how slow the world currently is, capped at HITSTOP_SLOWMO_MAX_MULT so deep
// slow-mo (gameTimeScale near its 0.05 floor) can't turn a hit into a
// multi-second freeze. Always takes the max against any hitstop already in
// flight, same as every call site's prior `Math.max(hitstopTimer, N)` usage.
const HITSTOP_SLOWMO_MAX_MULT = 2;
function setHitstop(frames) {
  const mult = Math.min(HITSTOP_SLOWMO_MAX_MULT, 1 / Math.max(gameTimeScale, 0.001));
  hitstopTimer = Math.max(hitstopTimer, Math.round(frames * mult));
}

// Wall bounce (2026-07-16, user feedback) — a HARD bounce (85% speed
// retained) so a wall-adjacent knockback hit is a real combo opener, not a
// soft stop. The bounce itself now lives in physics.js's shared resolver
// (PHYS_WALL_BOUNCE_*); these aliases are kept so older references/tools
// that read the game.js names keep working.
const WALL_BOUNCE_MULT = PHYS_WALL_BOUNCE_MULT;
const WALL_BOUNCE_MIN_SPEED = PHYS_WALL_BOUNCE_MIN_SPEED;

// Map system
let discoveredAreas = {};
let mapOpen = false;

// ── Pause menu (Phase 0.5) ──────────────────────────────────────────────
let pauseMenuIndex = 0;
let pauseMenuItems = [];
// ── Multi-screen menu navigation ─────────────────────────────────────────
let menuScreen = 'main';       // 'main' | 'play' | 'controls' | 'settings'
let menuSelection = 0;         // unified selection index per screen
let menuSelectionPlay = 0;     // save slot selection
let menuSelectionSettings = 0; // settings option index
let controlsMenuIndex = 0;     // controls/keybind menu row index

// Remappable actions, in the order they're listed on the Controls screen —
// see input.js's DEFAULT_KEYBINDS/ACTION_LABELS for the actual bindings.
// 'phaseDash' removed 2026-07-16 — Phase Dash and Dash are now the same
// button (see player.js's merged dash/phase-dash trigger); the separate
// binding would just be a dead remap entry now.
const REMAPPABLE_ACTIONS = [
  'moveLeft', 'moveRight', 'aimUp', 'aimDown', 'jump', 'attack', 'dash',
  'shardShot', 'stillpoint', 'gravitonSurge', 'voidTether', 'callChild',
  'map', 'pause', 'inventory', 'fullscreen',
];

// Human-readable label for a KeyboardEvent.code, for the Controls screen.
function formatKeyLabel(code) {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const named = {
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
    Space: 'SPACE', Escape: 'ESC', Tab: 'TAB', Backquote: '`',
    ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT',
    ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL',
    Enter: 'ENTER',
  };
  return named[code] || code;
}

// ── Ability pickup grants ────────────────────────────────────────────────
// One entry per grantable ability: which abilityState flag it sets and how
// the pickup announces itself. Add new abilities HERE (one line) — the
// pickup check in updateGame() is generic over this table. (Replaces an
// if/else chain that silently ignored unlisted abilities: graviton_surge's
// placed pickup and void_tether granted nothing at all — the "Void Tether
// button does nothing" root cause, fixed 2026-07-16.)
const ABILITY_GRANTS = {
  phase_dash:     { flag: 'hasPhaseDash',     color: '#a78bfa', popup: 'PHASE DASH',
                    notification: 'ABILITY: Phase Dash — Tap C to dash' },
  shard_shot:     { flag: 'hasShardShot',     color: '#67e8f9', popup: 'SHARD SHOT',
                    notification: 'ABILITY: Shard Shot — hold V to aim, release to fire' },
  stillpoint:     { flag: 'hasStillpoint',    color: '#67e8f9', popup: 'STILLPOINT',
                    particles: 28, flash: 16, popupLife: 120,
                    // No free pip: fractureMax starts at 0 (roadmap 1.9) — Stillpoint
                    // stays unusable until Fracture Pips raise the cap.
                    notification: 'STILLPOINT — Q to slow time. Find Fracture Pips to power it.' },
  charged_attack: { flag: 'hasChargedAttack', color: '#fbbf24', popup: 'CHARGED ATTACK',
                    notification: 'ABILITY: Charged Attack — Hold Z/J to charge a heavy strike!' },
  graviton_surge: { flag: 'hasGravitonSurge', color: '#4BCA61', popup: 'GRAVITON SURGE',
                    notification: 'ABILITY: Graviton Surge — E to flip gravity / conjure a graviton ball' },
  void_tether:    { flag: 'hasVoidTether',    color: '#34d399', popup: 'VOID TETHER',
                    notification: 'ABILITY: Void Tether — R pulls the enemy you face to you (or you to a wall)' },
  parry:          { flag: 'hasParry',         color: '#fbbf24', popup: 'PARRY',
                    notification: 'ABILITY: Parry — tap Down to deflect an attack (hold Down to duck/crawl)' },
};

// Parry deflect — player.parryTimer (opened by a quick Down-tap, see
// player.js's Duck/Parry block) is a brief window during which a regular
// enemy's melee hit or body contact gets deflected instead of landing:
// the enemy is stunned (reusing its stunTimer field — same mechanic the
// enemy-side counter tech in enemy.js already drives) and the player keeps
// their i-frames instead of taking damage. One deflect per window (consumed
// on success). Boss/miniboss hits are intentionally untouched for now.
function tryParryDeflect(enemy) {
  if (!(player.parryTimer > 0)) return false;
  enemy.stunTimer = PARRY_STUN;
  player.invincibleTimer = Math.max(player.invincibleTimer, PARRY_IFRAMES);
  player.parryTimer = 0;
  spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#fbbf24', 10);
  screenShake = Math.max(screenShake, 6);
  if (typeof SFX !== 'undefined' && SFX.parry) SFX.parry();
  return true;
}

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
let collectedLore = {};        // lore pip ids collected — drives the new visual-effect pickup flow (1.9), independent of LORE_ENABLED's old text-popup path
let loreOverlay = null; // { text, timer, maxTimer }
let lorePipEffect = null; // { timer, maxTimer } — placeholder screen effect on lore pip pickup, see drawLorePipEffect()

// ── Fracture Pips / stat upgrades (roadmap 1.9) ──────────────────────────
let fracturePipsFound = {};    // pip id -> true, world pickups that raise player.fractureMax
let statUpgrades = { strength: 0 }; // spent-upgrade levels per INVENTORY_UPGRADES key, funded by banked lore pips
let inventoryMessage = null; // { text, timer } — transient feedback line in the inventory screen
let inventorySelection = 0;  // selected row in the Inventory screen's upgrade list
let inventoryReturnState = 'paused'; // gameState to restore on exit — 'paused' (via pause menu) or 'playing' (via direct I shortcut)

// Data-driven upgrade list — the Inventory screen's draw/nav code iterates
// this instead of hand-drawing each stat, so adding a new Lore-Pip-funded
// upgrade line only means adding an entry here, not touching the screen
// itself. Per-level costs (Lv1/Lv2/Lv3/Lv4 = 1/2/3/4 lore pips, 2026-07-27
// rebalance — Lv1 is deliberately cheap, "just a small boost" per user
// direction) — `max: 4` is the lore-pip-purchasable ceiling; Lv5 (Limit
// Break) is a separate one-time endgame unlock, see `grantLimitBreak()`.
const INVENTORY_UPGRADES = [
  { key: 'strength', label: 'Strength', desc: 'Small damage boost, then attack speed, more damage, and knockback resistance per level.', color: '#c4b5fd', costs: [1, 2, 3, 4], max: 4 },
  { key: 'phase_dash', label: 'Phase Dash', desc: 'Slightly longer echo stun, then 8-directional aim, longer echo stun, echo counter-attack.', color: '#a78bfa', costs: [1, 2, 3, 4], max: 4 },
  { key: 'shard_shot', label: 'Shard Shot', desc: 'Small damage boost, then more damage, a second shard, then a piercing beam.', color: '#fbbf24', costs: [1, 2, 3, 4], max: 4 },
  { key: 'stillpoint', label: 'Stillpoint', desc: 'Slightly longer slow, then longer slow, deeper slow, higher lifesteal cap.', color: '#67e8f9', costs: [1, 2, 3, 4], max: 4 },
  { key: 'graviton_surge', label: 'Graviton Surge', desc: 'Slightly longer flip, then longer flip, slam damage, Gravity Ball pull + explosion.', color: '#f472b6', costs: [1, 2, 3, 4], max: 4 },
  { key: 'void_tether', label: 'Void Tether', desc: 'Slightly longer range, then longer range, electrified stun, chained arc stun.', color: '#34d399', costs: [1, 2, 3, 4], max: 4 },
];

// Cumulative lore-pip cost to own `level` levels of a given upgrade def.
function upgradeCostToLevel(def, level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += def.costs[i] || def.costs[def.costs.length - 1];
  return total;
}

function totalPipsSpent() {
  let spent = 0;
  for (const def of INVENTORY_UPGRADES) spent += upgradeCostToLevel(def, Math.min(statUpgrades[def.key] || 0, def.max));
  return spent;
}

// Lore pips collected but not yet spent on any upgrade.
function lorePipsBanked() {
  return Object.keys(collectedLore).length - totalPipsSpent();
}

// Lifetime lore pips ever collected, regardless of how many have since been
// spent — for gates like 'ten_lore_pips' that mean "found this many over the
// course of the game," not "currently holding this many unspent." Spending
// pips on upgrades is the whole point of collecting them; a gate that
// effectively forced players to hoard 10 unspent would fight that.
function lorePipsCollectedTotal() {
  return Object.keys(collectedLore).length;
}

// Spends a line's next lore-pip cost for +1 level. Returns true on success.
function tryUpgrade(key) {
  const def = INVENTORY_UPGRADES.find(d => d.key === key);
  if (!def) return false;
  const current = statUpgrades[key] || 0;
  if (current >= def.max) return false;
  const cost = def.costs[current];
  if (lorePipsBanked() < cost) return false;
  statUpgrades[key] = current + 1;
  saveGame();
  return true;
}

// ── Limit Break (Lv4) — one-time endgame unlock, Rule 0 in the design doc:
// only ONE ability may ever reach Lv4 per playthrough. Not wired to any
// room yet (the planned endgame region isn't built — see roadmap.md), but
// enemy_test.html calls this directly to test Lv4 behavior in isolation.
let limitBreakChosen = null; // ability key, or null

function grantLimitBreak(key) {
  if (limitBreakChosen) return false; // already spent the one Lv5 slot
  if (!INVENTORY_UPGRADES.find(d => d.key === key)) return false;
  limitBreakChosen = key;
  statUpgrades[key] = 5;
  saveGame();
  return true;
}

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
  // Was 'the_fracture', which doesn't exist in AREAS (the room is
  // 'the_fracture_part1') — every Escape-to-skip press in the tutorial hit
  // switchArea() with a bad id and produced the same black-screen symptom
  // as the door self-retrigger bug, just via a different path. Let the door
  // spawn itself the same way a real door walk-through does now.
  const spawn = computeDoorSpawn('the_fracture_part1', 'tutorial_area');
  switchArea('the_fracture_part1', spawn.x, spawn.y);
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
    pitDeathY: area.pitDeathY,
    // Camera/canvas vertical extent — independent of groundY (which is just
    // the nominal floor reference, not a real bound anymore). Rooms that
    // don't set this explicitly fall back to the old groundY+100 behavior,
    // so every existing room's camera framing is unchanged.
    roomHeight: typeof area.roomHeight === 'number' ? area.roomHeight : area.groundY + 100,
  };
}

// Get current area reference
function getCurrentArea() {
  return AREAS[currentAreaId];
}

// getArea(id) lives in area.js (used here by spawnAreaEnemies)

// Reset camera to origin
function resetCamera() {
  camera.x = 0;
  camera.y = 0;
}

// Smooth follow camera with bounds clamping
function updateCamera(player, area) {
  // Visible world slice shrinks as zoom increases (zoomed in = less world
  // visible, same W x H screen), so centering has to divide by zoom too —
  // otherwise the player drifts off-center any time zoom != 1.
  const viewW = W / camera.zoom;
  const viewH = H / camera.zoom;
  const targetX = player.x - viewW / 2 + player.width / 2;
  const targetY = player.y - viewH / 2 + player.height / 2;

  // Lerp toward target (camera smoothing)
  camera.x += (targetX - camera.x) * 0.1;
  camera.y += (targetY - camera.y) * 0.1;

  // Clamp to area bounds. Vertical bound uses `roomHeight` (an explicit,
  // author-controlled field — same convention as `width`) instead of
  // `groundY`, so the camera can follow the player into rooms that go
  // deeper/taller than the nominal floor line. Falls back to the old
  // groundY+100 behavior for rooms that don't set roomHeight.
  const roomBottom = typeof area.roomHeight === 'number' ? area.roomHeight : area.groundY + 100;
  camera.x = Math.max(0, Math.min(camera.x, Math.max(0, area.width - viewW)));
  camera.y = Math.max(0, Math.min(camera.y, Math.max(0, roomBottom - viewH + 100)));
}

// Apply camera transform to canvas — scale first so the translate below is
// expressed in world units; screen = zoom * (world - camera.xy), which is
// why updateCamera() above divides its framing math by zoom too.
function applyCamera(ctx) {
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
}

// addAbilityNotification(text) lives in ability.js (consumed by draw())

// Fire shard shot projectile along the aimed arc (expansion §0.1 — aimVy
// comes from player.shardAimVy, set by the hold-to-aim input in player.js;
// 0 = flat forward shot, the quick-tap default).
// Shard Shot damage per level (Enemy_Design.pdf): Lv0 = 1, Lv2 (old Lv1) =
// +25% (1.25). Lv1 (2026-07-27, the new cheap entry tier) is a smaller +10%
// partial step. Lv5 Enhanced State (if Shard Shot is the chosen Limit
// Break) replaces melee with 150%-damage blasts — handled by the
// melee-swing override in game.js's attack loop, not here.
function shardShotDamage() {
  const raw = statUpgrades.shard_shot || 0;
  if (oldTier('shard_shot') >= 1) return 1.25;
  return raw >= 1 ? 1.1 : 1;
}

// Returns an array of 1 or 2 Projectiles — Lv2+ fires a second shard with a
// slight spread (Enemy_Design.pdf). The spread is a spawn-position offset,
// not a velocity offset — since shots no longer have gravity (see
// Projectile.update()), two shots with different vy would just be two
// permanently-diverging straight lines instead of a tight parallel spread.
function useShardShot(player, aimVy) {
  const speed = 8;
  const vx = speed * (player.facing || 1);
  const startX = (player.facing || 1) > 0 ? player.x + player.width : player.x - 8;
  const startY = player.y + player.height / 2;
  const dmg = shardShotDamage();
  const shots = [new Projectile(startX, startY, vx, aimVy || 0, dmg, '#fbbf24')];
  if (oldTier('shard_shot') >= 2) {
    shots.push(new Projectile(startX, startY + 10, vx, aimVy || 0, dmg, '#fbbf24'));
  }
  for (const s of shots) s.seekWalls = true; // slight magnetism toward destructible crystal walls
  return shots;
}

// Lv3 Beam Attack — continuous straight-line channel ("a beam as in
// continuous energy, like a kamehameha" — user clarification 2026-07-16,
// replacing the earlier single-fired-projectile version). Ticks damage to
// every enemy the line currently touches, no projectile object involved.
const BEAM_RANGE = 500;
const BEAM_TICK_INTERVAL = 6; // frames between damage ticks
const BEAM_DPS = 2; // Lv3 base; Limit Break bumps this, see beamDamagePerTick()

function beamDamagePerTick() {
  const dps = (limitBreak.active && limitBreak.ability === 'shard_shot') ? 3 : BEAM_DPS;
  return dps * (BEAM_TICK_INTERVAL / 60);
}

// Returns { x1, y1, x2, y2 } — the beam's current line segment, from the
// player's shard-shot muzzle point out to BEAM_RANGE along player.beamAngle.
function getBeamSegment(p) {
  const x1 = (p.facing === 1 ? p.x + p.width : p.x - 8) + 4;
  const y1 = p.y + p.height / 2;
  const dirAngle = p.facing === 1 ? p.beamAngle : Math.PI - p.beamAngle; // mirror the tilt when facing left
  return { x1, y1, x2: x1 + Math.cos(dirAngle) * BEAM_RANGE, y2: y1 + Math.sin(dirAngle) * BEAM_RANGE };
}

// Graviton Surge ceiling collision (2026-07-16 fix): the engine has no real
// ceiling-collision physics anywhere (every enemy subclass, and the player's
// own platform loop, only ever checks landing on a floor from above) — so
// a naive fixed clamp line let entities clip straight through any real
// platform positioned above them instead of stopping at its underside. This
// finds the correct stop line: the underside of the nearest platform the
// entity has reached (if any), or a synthetic top-of-room bound otherwise
// (so a flipped entity in a room with an open top still "lands" instead of
// flying off-screen forever).
const GRAVITON_ROOM_TOP = 20;
function resolveCeilingY(entity, area) {
  let stopY = GRAVITON_ROOM_TOP;
  if (area && area.platforms) {
    for (const plat of area.platforms) {
      if (plat.destructible && plat.hp <= 0) continue;
      if (plat.wall) continue;
      if (entity.x + entity.width > plat.x && entity.x < plat.x + plat.w) {
        const bottom = plat.y + plat.h;
        // Was `entity.y <= bottom` — true for almost every platform in the
        // room, including the main FLOOR (its bottom edge, e.g. groundY+60,
        // is a huge y value that's "below" the entity from practically any
        // normal standing position), so the floor routinely won this
        // "biggest qualifying bottom" comparison and got treated as the
        // ceiling to stop at. Confirmed via harness (user report
        // 2026-07-19: "when I press E I teleport beneath the floor") — the
        // player was snapped straight to the floor's OWN underside. A
        // genuine ceiling is a platform whose bottom edge is AT OR ABOVE
        // the entity right now (`bottom <= entity.y`); among those, the one
        // with the largest bottom is the nearest one overhead.
        if (bottom <= entity.y && bottom > stopY) stopY = bottom;
      }
    }
  }
  return stopY;
}

// Does the segment (x1,y1)-(x2,y2) cross the rect [rx,rx+rw] x [ry,ry+rh]?
// Liang-Barsky clip test — used to keep Void Tether from locking onto a
// target with a solid wall in the way (user request 2026-07-19: "make sure
// it autoaims if there are no platforms in between").
function segmentIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
  let tmin = 0, tmax = 1;
  const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - rx, (rx + rw) - x1, y1 - ry, (ry + rh) - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false; // parallel to this edge and outside it
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) { if (t > tmax) return false; if (t > tmin) tmin = t; }
      else { if (t < tmin) return false; if (t < tmax) tmax = t; }
    }
  }
  return true;
}

// True if nothing solid sits on the straight line between the player and
// the enemy. Hazards/one-way platforms/dead destructibles don't block a
// pull the same way they don't block normal movement through them.
function voidTetherLineClear(player, enemy, platforms) {
  if (!platforms) return true;
  const px = player.x + player.width / 2, py = player.y + player.height / 2;
  const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
  for (const plat of platforms) {
    if (plat.destructible && plat.hp <= 0) continue;
    if (plat.hazard) continue;
    if (plat.oneWay) continue;
    if (plat.crumble && plat.crumbleGone) continue;
    // The platform either of them is currently standing ON doesn't count
    // as "in the way" — any line from the player's center down to a target
    // below necessarily grazes whatever they're standing on, so without
    // this a tether on an elevated platform could never target anything
    // below it at all (found while testing the Void Lancer report — every
    // downward tether whiffed as blocked).
    if (plat === player.standingPlat || plat === enemy.standingPlat) continue;
    if (segmentIntersectsRect(px, py, ex, ey, plat.x, plat.y, plat.w, plat.h)) return false;
  }
  return true;
}

// ── Void Tether targeting (2026-07-16 — facing auto-aim, user spec) ────────
// The enemy the tether would pull: nearest living enemy IN FRONT of the
// player (facing half-plane — never pulls from behind), scored by distance
// plus a vertical-offset penalty so a level enemy beats a diagonal one at
// similar range. Shared by the R-press handler and the target-telegraph
// draw so what's highlighted is always exactly what would be pulled.
function findVoidTetherTarget(player, range) {
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;
  const enemiesHere = areaEnemies[currentAreaId] || [];
  const platforms = (typeof getCurrentArea === 'function' && getCurrentArea()) ? getCurrentArea().platforms : null;
  let target = null, bestScore = range;
  for (const enemy of enemiesHere) {
    if (enemy.dead) continue;
    const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
    if ((ex - px) * player.facing <= 0) continue; // behind the player — never eligible
    const d = Math.hypot(ex - px, ey - py);
    if (d > range) continue;
    if (!voidTetherLineClear(player, enemy, platforms)) continue; // a wall's in the way — not a valid pull
    const score = d + Math.abs(ey - py) * 0.5; // prefer enemies near the facing line
    if (score < bestScore) { bestScore = score; target = enemy; }
  }
  return target;
}

// Shortest distance from `point` to the line segment (x1,y1)-(x2,y2).
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((px - x1) * dx + (py - y1) * dy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
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
    // Slight magnetism toward the nearest intact destructible wall
    // (expansion §0.1 — reduces wasted shots at crystal barriers without
    // turning the shot into a homing missile; gentle pull, short radius).
    if (this.seekWalls) {
      const area = getCurrentArea();
      if (area) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        let pullX = 0, pullY = 0, bestD = 100; // seek radius in px
        for (const plat of area.platforms) {
          if (!plat.destructible || plat.hp === undefined || plat.hp <= 0) continue;
          // Closest point on the wall's rect, not its centre — tall walls
          // would otherwise pull shots toward their midpoint.
          const px = Math.max(plat.x, Math.min(cx, plat.x + plat.w));
          const py = Math.max(plat.y, Math.min(cy, plat.y + plat.h));
          const d = Math.hypot(px - cx, py - cy);
          if (d > 0 && d < bestD) { bestD = d; pullX = (px - cx) / d; pullY = (py - cy) / d; }
        }
        this.vx += pullX * 0.35;
        this.vy += pullY * 0.35;
      }
    }
    this.x += this.vx;
    this.y += this.vy;
    // No gravity (removed 2026-07-16, user feedback: shard shots were too
    // hard to aim since where they landed depended on gravity pulling the
    // arc down over the shot's flight, not just the initial aim angle —
    // now they fly perfectly straight along whatever angle was aimed).
    // Only Shard Shot ever instantiates this class (enemy projectiles use
    // their own separate systems), so this is safe to remove unconditionally.
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

// ── Stillpoint offensive buff (expansion §0.2) ─────────────────────────────
// While Stillpoint is active, melee turns into a risk-reward recovery tool
// instead of a purely defensive slowdown: hits deal 1.5x damage and every
// landed melee hit restores 1 health pip (capped at MAX_HEALTH). Shared by
// all three melee hit loops (enemies, the King, minibosses) so the numbers
// can never drift apart between them.
// Strength Lv3/Lv4 damage multipliers (Enemy_Design.pdf, old Lv2/Lv3): Lv3
// +20%, Lv4 an additional +25% (total +45% over base). Lv1 (2026-07-27, the
// new cheap entry tier) adds a small +10% of its own, stacking underneath.
// Limit Break (Lv5, when active and Strength is the chosen ability) adds
// another +50%.
function strengthDamageMultiplier() {
  const raw = statUpgrades.strength || 0;
  const tier = oldTier('strength');
  let mult = 1;
  if (raw >= 1) mult += 0.1;
  if (tier >= 2) mult += 0.2;
  if (tier >= 3) mult += 0.25;
  if (limitBreak.active && limitBreak.ability === 'strength') mult += 0.5;
  return mult;
}

function playerMeleeDamage() {
  let dmg = player.heavy ? Math.ceil(ATTACK_DAMAGE * (1 + player.heavyCharge)) : ATTACK_DAMAGE;
  dmg *= strengthDamageMultiplier();
  if (player.stillpointActive && abilityState.hasStillpoint) dmg *= 1.5;
  dmg *= comboDamageMultiplier(); // combo.js damage_buff reward (1 when none active)
  return dmg;
}

// Stillpoint lifesteal cap by level (Enemy_Design.pdf): Lv0/1 = 1 HP,
// Lv2 = 2 HP, Lv3 = 3 HP, Lv4 Limit Break = 4 HP — per Stillpoint
// *activation*, tracked on the player instance and reset each time
// Stillpoint (re)activates (see Player.update()'s tap/hold block).
// Temporal Warden's defeat reward (2026-07-26) — "Stillpoint upgrade,
// +1 lifesteal per hit" — additive on top of the lore-pip-purchased level,
// mirroring maxHealthBonus's exact shape (healing.js) rather than bumping
// statUpgrades.stillpoint directly: totalPipsSpent() derives spent-pips
// purely from statUpgrades[key] levels, so mutating that would silently
// make the game think the player spent 2-4 lore pips they never actually
// spent. A separate additive bonus avoids that entirely. Saved/loaded/reset
// alongside maxHealthBonus — see saveGame()/loadGame()/startNewGame().
let stillpointLifestealBonus = 0;

function stillpointLifestealCap() {
  const tier = oldTier('stillpoint');
  if (limitBreak.active && limitBreak.ability === 'stillpoint') return 4 + stillpointLifestealBonus;
  if (tier >= 3) return 3 + stillpointLifestealBonus;
  if (tier >= 2) return 2 + stillpointLifestealBonus;
  return 1 + stillpointLifestealBonus;
}

function applyStillpointLifeSteal() {
  if (!player.stillpointActive || !abilityState.hasStillpoint) return;
  if (player.stillpointHealed >= stillpointLifestealCap()) return;
  if (player.health >= playerMaxHealth()) return;
  player.health = Math.min(playerMaxHealth(), player.health + 1);
  player.stillpointHealed = (player.stillpointHealed || 0) + 1;
  spawnParticles(player.x + player.width / 2, player.y + 4, '#2dd4bf', 6);
}

// ComposedEnemy phase system's `dotOnHit` flag (enemy.js) lands here — a hit
// from an enemy/boss/miniboss in a DoT-flagged phase applies this instead of
// (or alongside) its normal damage. Re-applying while already dotted just
// refreshes the duration/tick rate rather than stacking multiple timers.
function applyPlayerDot(player, dotDef) {
  player.dot = {
    damagePerTick: dotDef.damagePerTick ?? 1,
    tickInterval: dotDef.tickInterval ?? 30,
    tickTimer: dotDef.tickInterval ?? 30,
    timer: dotDef.duration ?? 180,
  };
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

// ── Particles, collision, area enemy management ─────────────────────────

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

// Push the player out of an overlapping enemy along the shallower penetration
// axis (classic AABB minimum-translation-vector), away from the enemy's
// center. Runs unconditionally on overlap — independent of invincibility/
// damage — so the two boxes never sit inside each other.
function separateFromEnemy(player, enemy) {
  const pCenterX = player.x + player.width / 2;
  const pCenterY = player.y + player.height / 2;
  const eCenterX = enemy.x + enemy.width / 2;
  const eCenterY = enemy.y + enemy.height / 2;

  const overlapX = (player.width + enemy.width) / 2 - Math.abs(pCenterX - eCenterX);
  const overlapY = (player.height + enemy.height) / 2 - Math.abs(pCenterY - eCenterY);
  if (overlapX <= 0 || overlapY <= 0) return;

  if (overlapX < overlapY) {
    const pushDir = (pCenterX < eCenterX) ? -1 : 1;
    // Same class of bug as the pushDown/floor clamp below (2026-07-19):
    // shoving the player straight through a wall they're already pinned
    // against — with zero regard for what's on the other side — used to
    // read as "an enemy bumps you at a wall and you fall through the
    // floor," since the far side of a wall is very often a pit or a lower
    // area with nothing underneath at that x. Clamp the same way: don't
    // push the player past a wall they're currently (or very recently, via
    // wall-jump coyote) touching on that exact side — shove the enemy
    // instead by simply not moving the player.
    if (player.wallNormal === pushDir) {
      // no-op: player stays put, enemy's own separation (if any) absorbs it
    } else {
      // The `wallNormal` guard above only covers a wall the player is
      // ALREADY registered as touching — it does nothing the first frame a
      // big enemy (or a lunge/charge overlapping heavily) shoves the player
      // INTO a wall they weren't flagged against yet, and overlapX has no
      // upper bound (it's just "however much the two boxes overlap"). That
      // could — and, confirmed via harness, did — push the player fully
      // through a wall's near face and out the other side, or deep enough
      // inside it that the shared collision resolver's margin-based wall
      // check (physics.js resolveEntityCollision) can no longer recognize
      // the overlap as "approaching from outside" on any later frame. Once
      // that happens, a wall flush with the floor (the common case — a wall
      // built rising off the ground) reads the embedded player's vertical
      // position as "bumping its underside," which snaps them to exactly
      // the floor's own surface with vy=0 — one frame later they're already
      // past the floor's own landing margin too, and gravity carries them
      // through it forever with grounded never recovering. Clamp the push
      // the same way the Y-branch below already clamps to the floor: never
      // move the player past the near edge of a solid platform in the push
      // direction, so the wall stops the shove instead of the player
      // tunneling into (or through) it.
      let pushAmount = overlapX;
      const area = typeof getCurrentArea === 'function' ? getCurrentArea() : null;
      if (area && area.platforms) {
        for (const plat of area.platforms) {
          if (plat.destructible && plat.hp <= 0) continue;
          if (plat.hazard) continue;
          if (plat.oneWay) continue; // never a side wall
          if (plat.crumble && plat.crumbleGone) continue;
          // Same vertical-overlap band the resolver's own wall pass uses.
          if (!(player.y + player.height > plat.y + 4 && player.y < plat.y + plat.h)) continue;
          if (pushDir > 0 && player.x + player.width <= plat.x) {
            pushAmount = Math.min(pushAmount, plat.x - (player.x + player.width));
          } else if (pushDir < 0 && player.x >= plat.x + plat.w) {
            pushAmount = Math.min(pushAmount, player.x - (plat.x + plat.w));
          }
        }
      }
      player.x += pushDir * Math.max(0, pushAmount);
    }
  } else {
    const pushDown = pCenterY >= eCenterY;
    // A grounded player being pushed DOWN by an enemy above them (a
    // divebomb, a jump-attack landing on top, two enemies stacking) used to
    // just add overlapY straight into player.y with zero regard for the
    // floor underneath — confirmed via harness test: a single call could
    // embed the player ~20px into their own standing platform, and because
    // the embed was deeper than the platform collision's landing margin,
    // the very next tick's landing check no longer saw them as "approaching
    // from above" and they fell straight through into the void, forever
    // (grounded never recovered). Clamp the push so it can never cross the
    // surface the player is actually standing on — shove the enemy instead
    // by simply not moving the player past ground level.
    if (pushDown && player.grounded && player.standingPlat) {
      const floorY = player.standingPlat.y - player.height;
      player.y = Math.min(player.y + overlapY, floorY);
    } else {
      player.y += pushDown ? overlapY : -overlapY;
    }
  }
}

// Spawn enemies for an area
function spawnAreaEnemies(areaId) {
  if (areaEnemiesSpawned[areaId]) return;
  areaEnemiesSpawned[areaId] = true;

  const area = getArea(areaId);
  areaEnemies[areaId] = [];

  // Looked up from ENEMY_REGISTRY (enemy.js) rather than a hand-maintained
  // if/else chain — that chain used to silently miss classes (blitz_guard
  // fell through to a generic base Enemy with none of its real behavior)
  // whenever a new enemy class was added here but not also added there.
  for (const eDef of area.enemies) {
    // ComposedEnemy (enemy_designer.html, roadmap.md 2.8) takes a required
    // 3rd constructor arg — special-cased here, same way ColossusCore's
    // miniboss spawn path is separate from this generic loop.
    if (eDef.type === 'composed' && eDef.def) {
      areaEnemies[areaId].push(new ComposedEnemy(eDef.x, eDef.y, eDef.def));
      continue;
    }
    const Cls = (typeof ENEMY_REGISTRY !== 'undefined') ? ENEMY_REGISTRY[eDef.type] : undefined;
    if (Cls && Cls !== Enemy) {
      areaEnemies[areaId].push(new Cls(eDef.x, eDef.y));
    } else {
      areaEnemies[areaId].push(new Enemy(eDef.x, eDef.y, eDef.type));
    }
  }

  // Spawn safety (physics.js): an authored spawn point inside a platform
  // used to just... spawn there (then get snapped somewhere wrong by the
  // old landing check). Now it's pushed out along the shortest axis with a
  // console warning naming the offending position, so bad room data
  // surfaces the same way validateAreaGraph() errors do.
  for (const enemy of areaEnemies[areaId]) {
    nudgeOutOfPlatforms(enemy, area.platforms, `${enemy.type || 'enemy'} in "${areaId}"`);
  }
}

// Clear enemies when leaving an area
function clearAreaEnemies(areaId) {
  areaEnemiesSpawned[areaId] = false;
  areaEnemies[areaId] = [];
}

// Switch area
// ═══════════════════════════════════════════════════════════════════════
// PLATFORM BEHAVIOURS — hazard / oneWay / moving / crumble
// ═══════════════════════════════════════════════════════════════════════
// Authoring (per platform in area.js):
//   hazard: true, damage: 1       — trigger volume, never solid; damages on
//                                   overlap. Lay it on top of a real floor.
//   oneWay: true                  — jump up through it, land on top;
//                                   down+jump drops through.
//   moving: { toX, toY, speed }   — oscillates between the authored x/y and
//                                   toX/toY; carries whatever stands on it.
//   crumble: true, crumbleDelay:30, respawn: 120
//                                 — falls away `crumbleDelay` frames after
//                                   being stood on; comes back after
//                                   `respawn` frames (0 = never).
//
// Runtime state lives in underscore fields on the platform object. AREAS is
// otherwise static data, so every one of these is derived from an authored
// anchor (`_baseX`/`_baseY`) and reset on room entry — re-entering a room
// recomputes rather than accumulating drift.
function resetPlatformRuntime(area) {
  if (!area || !area.platforms) return;
  for (const p of area.platforms) {
    if (p._baseX !== undefined) { p.x = p._baseX; p.y = p._baseY; }
    p._t = 0;
    p._dir = 1;
    p._crumbleT = -1;
    p.crumbleGone = false;
  }
}

function updatePlatformSystems(area) {
  if (!area || !area.platforms) return;
  const ts = (typeof gameTimeScale === 'number') ? gameTimeScale : 1;
  for (const p of area.platforms) {
    // ── moving ──
    if (p.moving) {
      if (p._baseX === undefined) { p._baseX = p.x; p._baseY = p.y; }
      const dx = (p.moving.toX !== undefined ? p.moving.toX : p._baseX) - p._baseX;
      const dy = (p.moving.toY !== undefined ? p.moving.toY : p._baseY) - p._baseY;
      const span = Math.hypot(dx, dy) || 1;
      const step = ((p.moving.speed || 1) * ts) / span; // normalised 0..1 per frame
      if (p._t === undefined) { p._t = 0; p._dir = 1; }
      p._t += step * (p._dir || 1);
      if (p._t >= 1) { p._t = 1; p._dir = -1; }
      else if (p._t <= 0) { p._t = 0; p._dir = 1; }
      const nx = p._baseX + dx * p._t;
      const ny = p._baseY + dy * p._t;
      // Carry anything standing on this platform by the same delta.
      if (player && player.standingPlat === p) {
        player.x += nx - p.x;
        player.y += ny - p.y;
      }
      p.x = nx; p.y = ny;
    }
    // ── crumble ──
    if (p.crumble) {
      if (p._crumbleT === undefined) p._crumbleT = -1;
      if (!p.crumbleGone) {
        if (player && player.standingPlat === p && p._crumbleT < 0) {
          p._crumbleT = (p.crumbleDelay !== undefined ? p.crumbleDelay : 30);
        }
        if (p._crumbleT >= 0) {
          p._crumbleT -= ts;
          if (p._crumbleT <= 0) {
            p.crumbleGone = true;
            p._crumbleT = (p.respawn !== undefined ? p.respawn : 120);
            spawnParticles(p.x + p.w / 2, p.y, '#9ca3af', 14);
          }
        }
      } else if (p._crumbleT > 0) {
        p._crumbleT -= ts;
        if (p._crumbleT <= 0) { p.crumbleGone = false; p._crumbleT = -1; }
      }
    }
  }
}

function applyHazardDamage(area) {
  if (!area || !area.platforms || !player || player.dead) return;
  if (player.invincibleTimer > 0) return; // i-frames already throttle this
  const px = player.x, py = player.y, pw = player.width, ph = player.height;
  for (const p of area.platforms) {
    if (!p.hazard) continue;
    if (px + pw > p.x && px < p.x + p.w && py + ph > p.y && py < p.y + p.h) {
      player.takeDamage(p.damage !== undefined ? p.damage : 1, p.x + p.w / 2);
      return; // one hazard hit per frame is enough
    }
  }
}

// Hollow Knight-style door spawn (2026-07-19): a transition that omits
// toX/toY no longer needs a hand-authored landing point — this finds the
// door in the destination room that leads back to where the player came
// from, and stands them just clear of it. `requires`-gated levelEditor doors
// still take an explicit toX/toY if the level designer wants one (e.g. a
// warp/teleport with no reciprocal door to anchor off of); this is only the
// fallback when those are left unset.
function computeDoorSpawn(targetId, fromId) {
  const dest = AREAS[targetId];
  if (!dest) return { x: 100, y: 400 }; // switchArea()'s own missing-area guard handles logging; just don't throw here
  const doorTrans = (dest.transitions || []).find(t => t.to === fromId);
  if (!doorTrans) {
    // No door in the destination leads back where we came from (a one-way
    // link, e.g. the teleport gates) — fall back to the room's first anchor,
    // or a generic safe spot near its floor.
    const anchor = dest.anchors && dest.anchors[0];
    if (anchor) return { x: anchor.x, y: anchor.y };
    return { x: 100, y: (dest.groundY || 500) - 60 };
  }
  // Clearance so the player doesn't land back inside the door's own
  // trigger box — the exact mechanism behind the black-screen door loop
  // this replaces. Spawn is centered vertically on the door and pushed
  // horizontally toward whichever side of the room has more space, so it
  // works for doors on either wall without needing a `direction` lookup.
  const margin = 40;
  const roomMid = (dest.width || 1000) / 2;
  const doorCenterX = doorTrans.x + doorTrans.w / 2;
  const spawnY = doorTrans.y + doorTrans.h / 2 - (player ? player.height / 2 : 16);
  if (doorCenterX < roomMid) {
    return { x: doorTrans.x + doorTrans.w + margin, y: spawnY }; // door on the west side — enter moving east
  } else {
    return { x: doorTrans.x - margin - (player ? player.width : 24), y: spawnY }; // door on the east side — enter moving west
  }
}

function switchArea(targetId, targetX, targetY) {
  // Clear current area enemies
  clearAreaEnemies(currentAreaId);
  resetPlatformRuntime(getCurrentArea());

  // Echoes are world-space (x,y) snapshots of the room being left — carrying
  // them into a new room's coordinate space puts them at a meaningless
  // position (a different layout entirely), so they must not survive a
  // room transition, unlike echoes surviving a plain respawn-in-place.
  echoes = [];
  standEcho = null;
  clearVitalityMotes(); // motes are room-space too (healing.js)
  child = null; // the Child re-enters at the player's side (companion.js recreates her)
  // Phase Dash pass-through immunity is keyed by enemy reference (see the
  // fix note by phasedThroughEnemies below) — those enemies don't exist in
  // the new room, so drop any stale references rather than holding them.
  if (player && player.phasedThroughEnemies) player.phasedThroughEnemies.clear();

  // Switch
  currentAreaId = targetId;
  discoveredAreas[targetId] = true;
  resetPlatformRuntime(getCurrentArea()); // moving/crumble state starts fresh
  SFX.setAreaAmbient(targetId);

  // Teleport player
  player.x = targetX;
  player.y = targetY;
  player.vx = 0;
  player.vy = 0;

  // Spawn safety (physics.js): a door's authored target position embedded
  // in a platform pushed the player inside geometry (user report
  // 2026-07-16: "you can spawn inside a platform").
  const targetArea = getArea(targetId);
  if (targetArea) nudgeOutOfPlatforms(player, targetArea.platforms, `player entering "${targetId}"`);

  // Reset camera
  resetCamera();

  // Spawn enemies in new area
  spawnAreaEnemies(targetId);

  // Clear ambient particles for new area
  areaAmbient = [];

  // Transition effect
  transitioning = true;
  transitionAlpha = 1;

  // See doorCooldown's declaration up top — suppresses the transitions-check
  // loop for a few frames so a landing spot inside the destination's own
  // return-door trigger can't bounce the player right back this same tick.
  doorCooldown = DOOR_COOLDOWN_FRAMES;

  saveGame();

  // Sample cutscene (cutscene.js) — first entry to Echo Bridge part 1.
  // Doubles as the wiring reference for future scenes: gate on a story
  // flag, play after the room is fully set up, let the scene set the flag.
  if (targetId === 'echo_bridge_part1' && !storyFlags.echo_bridge_intro_seen) {
    playCutscene('echo_bridge_intro');
  }
}

// Is `plat`'s given edge ('top' or 'bottom') flush against another
// platform's opposite edge, with x-overlap? If so, that edge is an internal
// seam between two authored platform pieces meant to read as one continuous
// surface (e.g. a tall wall or ceiling built from several stacked segments)
// — not a real exposed surface the player would see light hit. Used by
// drawPlatform() to skip the highlight/shadow strip there, so adjacent
// flush platforms "snap together" visually instead of showing a repeating
// light/dark band at every segment boundary (the "wall glitching" look).
function platformEdgeCovered(plat, edge, allPlatforms) {
  if (!allPlatforms) return false;
  const targetY = edge === 'top' ? plat.y : plat.y + plat.h;
  for (const other of allPlatforms) {
    if (other === plat || other.destructible) continue;
    const otherEdgeY = edge === 'top' ? other.y + other.h : other.y;
    if (Math.abs(otherEdgeY - targetY) > 1) continue; // not flush (within 1px rounding)
    const xOverlap = plat.x < other.x + other.w && plat.x + plat.w > other.x;
    if (xOverlap) return true;
  }
  return false;
}

// Draw a platform
function drawPlatform(ctx, plat, allPlatforms) {
  if (plat.destructible && plat.hp <= 0) return;
  if (plat.crumble && plat.crumbleGone) return; // fallen away this frame

  // ── hazard — spikes/energy field, red; never a solid surface ──
  if (plat.hazard) {
    ctx.fillStyle = 'rgba(248,113,113,0.18)';
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const teeth = Math.max(1, Math.floor(plat.w / 12));
    for (let i = 0; i < teeth; i++) {
      const x0 = plat.x + (i * plat.w) / teeth;
      ctx.moveTo(x0, plat.y + plat.h);
      ctx.lineTo(x0 + plat.w / teeth / 2, plat.y);
      ctx.lineTo(x0 + plat.w / teeth, plat.y + plat.h);
    }
    ctx.stroke();
    return;
  }

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

  // Regular platform. Moving/crumble/oneWay/polarity tint so they read as
  // special while designing (and in play). Polarity (Electromagnetic
  // Golem, The Polar Shift) wins over moving/crumble since a charged
  // surface is the more urgent read mid-fight; pulses like the destructible
  // block above so a live charge reads as "active," not static decor.
  const crumbling = plat.crumble && plat._crumbleT >= 0 && !plat.crumbleGone;
  if (plat.polarity) {
    const pulse = Math.sin(frameCount * 0.08) * 0.15 + 0.75;
    ctx.fillStyle = plat.polarity === 'positive' ? `rgba(248, 113, 113, ${pulse})` : `rgba(96, 165, 250, ${pulse})`;
  } else {
    ctx.fillStyle = crumbling ? '#2e211a' : (plat.moving ? '#1a2436' : '#1a1a2e');
  }
  ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
  if (plat.oneWay) {
    // dashed top only — signals "pass up through me"
    ctx.strokeStyle = '#8b9dc3';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(plat.x, plat.y + 1);
    ctx.lineTo(plat.x + plat.w, plat.y + 1);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Top highlight — skipped where another platform sits flush above (an
  // internal seam, not a real top surface facing open air).
  if (!platformEdgeCovered(plat, 'top', allPlatforms)) {
    ctx.fillStyle = '#2a2a4e';
    ctx.fillRect(plat.x, plat.y, plat.w, 2);
  }

  // Bottom edge — same idea, skipped where another platform sits flush below.
  if (!platformEdgeCovered(plat, 'bottom', allPlatforms)) {
    ctx.fillStyle = '#12122a';
    ctx.fillRect(plat.x, plat.y + plat.h - 1, plat.w, 1);
  }

  // Decorative dots
  ctx.fillStyle = '#222244';
  for (let dx = plat.x + 10; dx < plat.x + plat.w - 10; dx += 20) {
    ctx.fillRect(dx, plat.y + plat.h / 2 - 1, 2, 2);
  }
}

// Draw Anchor checkpoint
function drawAnchor(ctx, sp, area, activated) {
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

// Draw a Fracture Pip pickup (violet diamond, echoes the HUD fracture-pip glyph)
function drawFracturePip(ctx, fp) {
  const pulse = Math.sin(frameCount * 0.07) * 0.3 + 0.7;
  const x = fp.x, y = fp.y;

  const glowSize = 30;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
  gradient.addColorStop(0, `rgba(196, 181, 253, ${pulse * 0.4})`);
  gradient.addColorStop(1, 'rgba(196, 181, 253, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x - glowSize, y - glowSize, glowSize * 2, glowSize * 2);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4 + Math.sin(frameCount * 0.03) * 0.15);
  ctx.fillStyle = `rgba(196, 181, 253, ${pulse})`;
  ctx.fillRect(-7, -7, 14, 14);
  ctx.strokeStyle = 'rgba(233, 213, 255, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-7, -7, 14, 14);
  ctx.restore();
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

// Single source of truth for "does the player satisfy this transition's
// `requires` gate" — used both to actually block traversal (update loop)
// and to draw the locked/unlocked door tint (draw loop). Any `requires`
// value not listed here (e.g. `graviton_surge`, or any other ability not
// implemented yet) returns false — a deliberately-inert stub door must
// never be treated as open just because its ability doesn't exist yet.
// A comma-joined `requires` (e.g. 'stillpoint,phase_dash,timeline_x_roads_2_visited')
// is an AND of each sub-condition, checked recursively below.
function hasAbilityRequirement(requires) {
  if (requires.indexOf(',') !== -1) {
    return requires.split(',').every(part => hasAbilityRequirement(part));
  }
  if (requires === 'phase_dash') return abilityState.hasPhaseDash;
  if (requires === 'shard_shot') return abilityState.hasShardShot;
  if (requires === 'stillpoint') return abilityState.hasStillpoint;
  if (requires === 'charged_attack') return abilityState.hasChargedAttack;
  if (requires === 'void_tether') return abilityState.hasVoidTether;
  if (requires === 'boss_gate') return abilityState.hasPhaseDash && abilityState.hasShardShot && abilityState.hasStillpoint;
  if (requires === 'tutorial_complete') return isTutorialComplete();
  // "post-game" locks (Sovereign Rooms) — unlocked once the Sovereign is defeated.
  if (requires === 'post_game') return bossDefeated;
  // "requires Timeline X Roads, Room 2" — implemented as a room-visited flag.
  if (requires === 'timeline_x_roads_2_visited') return !!discoveredAreas['timeline_x_roads_room2'];
  // Echo Bridge prison shortcut — unlocked once the mandatory prison path
  // has actually been walked through to its far end (Void Expanse, Room 1).
  if (requires === 'prison_sequence_finished') return !!discoveredAreas['void_expanse_room1'];
  if (requires === 'four_fracture_pips') return player.fractureMax >= 4;
  if (requires === 'ten_lore_pips') return lorePipsCollectedTotal() >= 10;
  return false;
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

// ═══════════════════════════════════════════════════════════════════════
// REGION VISUAL IDENTITY (Task 4, session_priorities.md #4) — pure
// rendering, derived entirely from `room.region`. No new fields on
// platforms/transitions and nothing the level editor needs to author —
// this is a presentation layer on top of the existing geometry data, not
// part of the saved room shape. A region with no entry in REGION_STYLES
// (origin, crag, or any future region not decorated yet) just renders with
// the plain look it always had.
// ═══════════════════════════════════════════════════════════════════════
const REGION_STYLES = {
  mirror_veil:   { primary: '#c084fc', secondary: '#7c3aed', glow: '#e9d5ff' },
  event_horizon: { primary: '#818cf8', secondary: '#4338ca', glow: '#c7d2fe' },
  chrono_rift:   { primary: '#a78bfa', secondary: '#6d28d9', glow: '#ddd6fe' },
};

// Room-wide ambient effect — called once per frame, drawn under the
// platforms (before the platforms loop in draw()) so it reads as
// background depth, not an overlay on top of the player.
function decorateRoomForRegion(ctx, room, region) {
  const style = REGION_STYLES[region];
  if (!style) return;

  ctx.save();
  if (region === 'mirror_veil') {
    // Reflection seam — a soft horizontal mirror line at room mid-height,
    // with a scattered diamond motif along it (upside-down-world cue).
    const midY = room.groundY - 140;
    ctx.strokeStyle = hexToRgba(style.glow, 0.08);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(room.width, midY);
    ctx.stroke();
    ctx.fillStyle = hexToRgba(style.primary, 0.06);
    for (let x = 40; x < room.width; x += 140) {
      ctx.save();
      ctx.translate(x, midY);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    }
  } else if (region === 'event_horizon') {
    // Gravitational pull vignette — radial glow anchored off-screen left
    // (visual read for the region's "constant leftward pull" mechanic),
    // plus slow-pulsing concentric event-horizon rings.
    const midY = room.groundY / 2;
    const grad = ctx.createRadialGradient(-200, midY, 50, -200, midY, 700);
    grad.addColorStop(0, hexToRgba(style.primary, 0.10));
    grad.addColorStop(1, hexToRgba(style.primary, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, room.width, room.groundY);
    ctx.strokeStyle = hexToRgba(style.glow, 0.06);
    ctx.lineWidth = 1.5;
    for (let r = 80; r < 500; r += 90) {
      const pulseR = r + Math.sin(frameCount * 0.01 + r) * 6;
      ctx.beginPath();
      ctx.arc(-200, midY, pulseR, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
  } else if (region === 'chrono_rift') {
    // Clock-face ghost — slow-rotating spokes from a fixed hub, evoking
    // the region's looping/wrap-around time mechanic.
    const hubX = room.width / 2, hubY = room.groundY - 160;
    ctx.strokeStyle = hexToRgba(style.glow, 0.06);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(hubX, hubY, 90, 0, Math.PI * 2);
    ctx.stroke();
    const spokeCount = 8;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2 + frameCount * 0.003;
      ctx.beginPath();
      ctx.moveTo(hubX, hubY);
      ctx.lineTo(hubX + Math.cos(angle) * 90, hubY + Math.sin(angle) * 90);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Per-platform edge decoration — called after drawPlatform() for each
// platform. No geometry change, purely a visual layer on top.
function decoratePlatformForRegion(ctx, plat, region) {
  const style = REGION_STYLES[region];
  if (!style || plat.destructible) return; // crystal walls keep their own dedicated look

  ctx.save();
  if (region === 'mirror_veil') {
    // Reflection ghost — a faint upside-down copy of the platform below it.
    ctx.fillStyle = hexToRgba(style.primary, 0.12);
    ctx.fillRect(plat.x, plat.y + plat.h + 4, plat.w, plat.h);
  } else if (region === 'event_horizon') {
    // Inward-curving corner glows, suggesting gravitational lensing at the edges.
    ctx.strokeStyle = hexToRgba(style.glow, 0.35);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(plat.x, plat.y, 10, 0, Math.PI / 2);
    ctx.arc(plat.x + plat.w, plat.y, 10, Math.PI / 2, Math.PI);
    ctx.stroke();
  } else if (region === 'chrono_rift') {
    // Tick marks along the top edge, like a timeline ruler.
    ctx.strokeStyle = hexToRgba(style.glow, 0.3);
    ctx.lineWidth = 1;
    for (let tx = plat.x + 8; tx < plat.x + plat.w - 4; tx += 16) {
      ctx.beginPath();
      ctx.moveTo(tx, plat.y);
      ctx.lineTo(tx, plat.y - 4);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Cave-mouth door rendering, replacing the old flat rectangle for every
// transition in every room (region-agnostic shape logic — tinted per-room
// via mapAccent/ambientColor so undecorated regions still look distinct
// from each other, just without the extra ambient/platform treatment
// above). Three shapes: glowing portal (ability-gated), one-way arrow
// (shortcut/oneWay), arched stone entrance (everything else).
function drawDoor(ctx, trans, area, blocked) {
  // Edge exit (2026-07-27) — Hollow Knight-style "no floating door," just
  // open space at the room's own boundary: the camera clamp already stops
  // panning once the player's within one screen-width of the edge (see
  // updateCamera()), so the player visually walks past the edge of the
  // SCREEN, not through a decorated portal/arch sitting mid-room. An
  // ability gate still needs to communicate "locked" somehow even on an
  // edge exit, so that one case keeps the glowing-portal treatment; a
  // plain or shortcut edge exit draws nothing at all.
  if (trans.edgeExit && !trans.requires) return;

  const tint = area.mapAccent || area.ambientColor || '#c4b5fd';
  const color = blocked ? '#946060' : tint;
  const cx = trans.x + trans.w / 2, cy = trans.y + trans.h / 2;
  const pulse = Math.sin(frameCount * 0.03) * 0.15 + 0.15;

  ctx.save();
  if (trans.requires) {
    // Ability gate — glowing portal.
    ctx.fillStyle = hexToRgba(color, blocked ? pulse * 0.6 : pulse + 0.15);
    ctx.beginPath();
    ctx.ellipse(cx, cy, trans.w / 2, trans.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(color, 0.6);
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (trans.shortcut || trans.oneWay) {
    // Shortcut — a one-way arrow set inside a plain frame.
    ctx.strokeStyle = hexToRgba(color, 0.5);
    ctx.lineWidth = 2;
    ctx.strokeRect(trans.x, trans.y, trans.w, trans.h);
    ctx.fillStyle = hexToRgba(color, pulse + 0.2);
    ctx.beginPath();
    const dir = trans.toX > trans.x + trans.w ? 1 : -1;
    ctx.moveTo(cx - dir * 6, cy - 8);
    ctx.lineTo(cx + dir * 8, cy);
    ctx.lineTo(cx - dir * 6, cy + 8);
    ctx.closePath();
    ctx.fill();
  } else {
    // Regular door — arched stone entrance (rounded top, not a rectangle).
    const archTop = trans.y;
    const radius = Math.min(trans.w / 2, 18);
    ctx.fillStyle = hexToRgba(color, pulse + 0.12);
    ctx.beginPath();
    ctx.moveTo(trans.x, trans.y + trans.h);
    ctx.lineTo(trans.x, archTop + radius);
    ctx.arcTo(trans.x, archTop, trans.x + radius, archTop, radius);
    ctx.lineTo(trans.x + trans.w - radius, archTop);
    ctx.arcTo(trans.x + trans.w, archTop, trans.x + trans.w, archTop + radius, radius);
    ctx.lineTo(trans.x + trans.w, trans.y + trans.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexToRgba(color, 0.4);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
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

  if (lastAnchor && lastAnchor.areaId === currentAreaId) {
    // Teleport to last stillpoint in current area
    player.x = lastAnchor.x;
    player.y = lastAnchor.y - player.height;
  } else if (lastAnchor) {
    // Switch back to the stillpoint's area
    currentAreaId = lastAnchor.areaId;
    player.x = lastAnchor.x;
    player.y = lastAnchor.y - player.height;
    resetCamera();
    spawnAreaEnemies(currentAreaId);
    SFX.setAreaAmbient(currentAreaId);
  } else {
    // Fallback: find first safe platform or stillpoint in current area
    const sp = area.anchors && area.anchors[0];
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

// Unstuck button click (if present)
const unstuckBtn = document.getElementById('unstuck-btn');
if (unstuckBtn) unstuckBtn.addEventListener('click', unstuckPlayer);

// Keyboard shortcut: U key
function handleUnstuckKey() {
  if (wasJustPressed('KeyU') && gameState === 'playing') {
    unstuckPlayer();
  }
}

// Keyboard shortcut: toggle fullscreen (works in any state, like pause) —
// bound to Backquote (F was Phase Dash's key until 2026-07-16, when it
// merged onto the Dash button; F is unbound now, Backquote is unchanged).
function handleFullscreenKey() {
  if (wasActionJustPressed('fullscreen')) {
    toggleFullscreen();
  }
}

// Initialize game
function init() {
  const area = getCurrentArea();
  player = new Player(100, area.groundY - 60);
  echoes = [];
  standEcho = null;
  projectiles = [];
  afterimageHazards = [];
  particles = [];
  gameState = 'menu';
  menuScreen = 'main';
  menuSelection = 0;
  menuSelectionPlay = 0;
  menuSelectionSettings = 0;
  currentAreaId = 'spawn_area_1';
  areaEnemiesSpawned = {};
  discoveredAreas = { spawn_area_1: true };
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
  abilityState.gravitonSurgeCooldown = 0;
  abilityState.voidTetherCooldown = 0;
  abilityState.parryCooldown = 0;
  abilityState.hasPhaseDash = false;
  abilityState.hasShardShot = false;
  abilityState.hasStillpoint = false;
  abilityState.hasChargedAttack = false;
  abilityState.hasGravitonSurge = false;
  abilityState.hasVoidTether = false;
  abilityState.hasParry = false;
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

  // Load accessibility settings (Phase 0.6)
  loadSettings();
}

// ── Settings persistence (Phase 0.6) ──────────────────────────────────
const SETTINGS_KEY = 'stillpoint_settings_v1';

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      screenShakeEnabled = s.screenShake !== undefined ? s.screenShake : true;
      hitstopEnabled = s.hitstop !== undefined ? s.hitstop : true;
    }
  } catch (e) { /* degrade silently */ }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      screenShake: screenShakeEnabled,
      hitstop: hitstopEnabled,
    }));
  } catch (e) { /* degrade silently */ }
}

// Rebuild pause menu items (used after toggling a setting to update labels)
function buildPauseMenu() {
  pauseMenuItems = [
    { label: 'Resume', action: () => { /* just close the menu */ } },
    { label: 'Inventory', action: () => { inventoryReturnState = 'paused'; gameState = 'inventory'; } },
    { label: 'Return to Anchor', action: () => returnToAnchor(), disabled: !lastAnchor },
    { label: 'Restart Room', action: () => restartRoom() },
    { label: 'Controls', action: () => { gameState = 'paused_controls'; controlsMenuIndex = 0; } },
    { label: `Screen Shake: ${screenShakeEnabled ? 'ON' : 'OFF'}`, action: () => {
      screenShakeEnabled = !screenShakeEnabled;
      saveSettings();
      buildPauseMenu();
    }},
    { label: `Hitstop: ${hitstopEnabled ? 'ON' : 'OFF'}`, action: () => {
      hitstopEnabled = !hitstopEnabled;
      saveSettings();
      buildPauseMenu();
    }},
    { label: 'Quit to Menu', action: () => { init(); } },
  ];
}

// Respawn at checkpoint
// ═══════════════════════════════════════════════════════════════════════
// SAVE / LOAD (Phase 0.4) — localStorage-backed persistence.
// Auto-saves on: Anchor checkpoint activation, area transitions, and
// ability pickups (see call sites: the Anchor-checkpoint block, the end
// of switchArea(), and each branch of the ability-reward pickup logic).
// All localStorage access is wrapped in try/catch — private browsing, quota
// limits, or a locked-down environment should degrade to "no persistence"
// rather than crash the game.
// ═══════════════════════════════════════════════════════════════════════
const SAVE_SLOTS = 3;
let currentSaveSlot = 0; // active slot index (0-based)

function getSaveKey(slot) {
  return `stillpoint_save_v1_slot_${slot}`;
}

function hasSaveGame(slot) {
  try {
    return localStorage.getItem(getSaveKey(slot)) !== null;
  } catch (e) {
    return false;
  }
}

// Check if ANY slot has a save (for menu "Continue" prompt)
function hasAnySave() {
  for (let i = 0; i < SAVE_SLOTS; i++) {
    if (hasSaveGame(i)) return true;
  }
  return false;
}

function saveGame(slot) {
  if (!player) return;
  const s = slot !== undefined ? slot : currentSaveSlot;
  try {
    const data = {
      version: 1,
      currentAreaId,
      player: {
        x: player.x,
        y: player.y,
        health: player.health,
        fractureMeter: player.fractureMeter,
        fractureMax: player.fractureMax,
      },
      fracturePipsFound,
      statUpgrades,
      limitBreakChosen,
      abilityState: {
        hasPhaseDash: abilityState.hasPhaseDash,
        hasShardShot: abilityState.hasShardShot,
        hasStillpoint: abilityState.hasStillpoint,
        hasChargedAttack: abilityState.hasChargedAttack,
        hasGravitonSurge: abilityState.hasGravitonSurge,
        hasVoidTether: abilityState.hasVoidTether,
        hasParry: abilityState.hasParry,
        // Cooldowns persisted (2026-07-24 fix) so quitting/reloading mid-fight
        // can't be used to reset an ability early — see BUG list.
        phaseDashCooldown: abilityState.phaseDashCooldown,
        shardShotCooldown: abilityState.shardShotCooldown,
        gravitonSurgeCooldown: abilityState.gravitonSurgeCooldown,
        voidTetherCooldown: abilityState.voidTetherCooldown,
        parryCooldown: abilityState.parryCooldown,
      },
      anchorActivated,
      lastAnchor,
      discoveredAreas,
      collectedLore,
      bossDefeated,
      defeatedMinibosses,
      tutorialState,
      storyFlags, // cutscene.js narrative switches (e.g. child_choice_resolved)
      companion: { active: companionState.active, canFight: companionState.canFight },
      maxHealthBonus,           // healing.js — max-health shards
      maxHealthShardsCollected,
      stillpointLifestealBonus, // Temporal Warden's defeat reward
    };
    localStorage.setItem(getSaveKey(s), JSON.stringify(data));
  } catch (e) {
    // Storage unavailable — fail silently; the run just won't persist.
  }
}

// Returns true on success. Caller is responsible for setting gameState etc.
function loadGame(slot) {
  const s = slot !== undefined ? slot : currentSaveSlot;
  try {
    const raw = localStorage.getItem(getSaveKey(s));
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || !data.currentAreaId || !AREAS[data.currentAreaId] || !data.player) return false;

    currentAreaId = data.currentAreaId;
    player = new Player(data.player.x || 100, data.player.y || 0);
    player.health = typeof data.player.health === 'number' ? data.player.health : playerMaxHealth();
    player.fractureMax = typeof data.player.fractureMax === 'number' ? data.player.fractureMax : 0;
    player.fractureMeter = typeof data.player.fractureMeter === 'number' ? Math.min(data.player.fractureMeter, player.fractureMax) : 0;
    fracturePipsFound = data.fracturePipsFound || {};
    statUpgrades = data.statUpgrades || { strength: 0 };
    limitBreakChosen = data.limitBreakChosen || null;

    abilityState.hasPhaseDash = !!(data.abilityState && data.abilityState.hasPhaseDash);
    abilityState.hasShardShot = !!(data.abilityState && data.abilityState.hasShardShot);
    abilityState.hasStillpoint = !!(data.abilityState && data.abilityState.hasStillpoint);
    abilityState.hasChargedAttack = !!(data.abilityState && data.abilityState.hasChargedAttack);
    abilityState.hasGravitonSurge = !!(data.abilityState && data.abilityState.hasGravitonSurge);
    abilityState.hasVoidTether = !!(data.abilityState && data.abilityState.hasVoidTether);
    abilityState.hasParry = !!(data.abilityState && data.abilityState.hasParry);
    // Cooldowns persisted (2026-07-24 fix) — clamp to the real max so a
    // hand-edited/corrupted save can't hand the player a stuck-forever
    // cooldown; missing/old-format saves fall back to 0 (ready), same as
    // before this fix.
    const savedCd = data.abilityState || {};
    abilityState.phaseDashCooldown = Math.min(Math.max(0, savedCd.phaseDashCooldown || 0), PHASE_DASH_COOLDOWN);
    abilityState.shardShotCooldown = Math.min(Math.max(0, savedCd.shardShotCooldown || 0), SHARD_SHOT_COOLDOWN);
    abilityState.gravitonSurgeCooldown = Math.min(Math.max(0, savedCd.gravitonSurgeCooldown || 0), GRAVITON_SURGE_COOLDOWN);
    abilityState.voidTetherCooldown = Math.min(Math.max(0, savedCd.voidTetherCooldown || 0), VOID_TETHER_COOLDOWN);
    abilityState.parryCooldown = Math.min(Math.max(0, savedCd.parryCooldown || 0), PARRY_COOLDOWN);
    abilityState.notifications = [];

    anchorActivated = data.anchorActivated || {};
    lastAnchor = data.lastAnchor || null;
    discoveredAreas = data.discoveredAreas || { [currentAreaId]: true };
    collectedLore = data.collectedLore || {};
    bossDefeated = !!data.bossDefeated;
    defeatedMinibosses = data.defeatedMinibosses || {};
    tutorialState = data.tutorialState || { moved: true, jumped: true, attacked: true, dashed: true };
    storyFlags = data.storyFlags || {};
    companionState.active = !!(data.companion && data.companion.active);
    companionState.canFight = !!(data.companion && data.companion.canFight);
    companionState.mode = 'follow';
    companionState.healCooldown = 0;
    child = null; // recreated lazily next frame if active
    maxHealthBonus = typeof data.maxHealthBonus === 'number' ? data.maxHealthBonus : 0;
    maxHealthShardsCollected = data.maxHealthShardsCollected || {};
    stillpointLifestealBonus = typeof data.stillpointLifestealBonus === 'number' ? data.stillpointLifestealBonus : 0;
    clearVitalityMotes();
    resetHealingCrystals();

    echoes = [];
    standEcho = null;
    projectiles = [];
    afterimageHazards = [];
    particles = [];
    bossProjectiles = [];
    boss = null;
    miniboss = null;
    areaEnemiesSpawned = {};
    spawnAreaEnemies(currentAreaId);
    resetCamera();
    SFX.setAreaAmbient(currentAreaId);
    return true;
  } catch (e) {
    return false;
  }
}

function deleteSave(slot) {
  const s = slot !== undefined ? slot : currentSaveSlot;
  try {
    localStorage.removeItem(getSaveKey(s));
  } catch (e) {
    // ignore
  }
}

// Get save slot info for menu display
function getSlotInfo(slot) {
  if (!hasSaveGame(slot)) return { empty: true };
  try {
    const raw = localStorage.getItem(getSaveKey(slot));
    const data = JSON.parse(raw);
    return {
      empty: false,
      areaId: data.currentAreaId,
      health: data.player?.health,
      hasPhaseDash: !!(data.abilityState && data.abilityState.hasPhaseDash),
      hasShardShot: !!(data.abilityState && data.abilityState.hasShardShot),
      hasStillpoint: !!(data.abilityState && data.abilityState.hasStillpoint),
      hasChargedAttack: !!(data.abilityState && data.abilityState.hasChargedAttack),
      bossDefeated: !!data.bossDefeated,
    };
  } catch (e) {
    return { empty: true };
  }
}

// Friendly area name for save slot display
function getAreaDisplayName(areaId) {
  const names = {
    'tutorial_area': 'Tutorial',
    'the_fracture': 'The Fracture',
    'echoing_halls': 'Echoing Halls',
    'shard_caverns': 'Shard Caverns',
    'fractured_core': 'Fractured Core',
  };
  return names[areaId] || areaId;
}

// Fresh-run setup — used by the menu when there's no save, or when the
// player explicitly presses N to start over with an existing one.
function startNewGame() {
  gameState = 'playing';
  SFX.init();
  currentAreaId = 'spawn_area_1';
  SFX.setAreaAmbient('spawn_area_1');
  const area = getCurrentArea();
  player = new Player(100, area.groundY - 60);
  echoes = [];
  standEcho = null;
  projectiles = [];
  afterimageHazards = [];
  particles = [];
  bossProjectiles = [];
  boss = null;
  miniboss = null;
  defeatedMinibosses = {};
  areaEnemiesSpawned = {};
  discoveredAreas = { spawn_area_1: true };
  anchorActivated = {};
  lastAnchor = null;
  collectedLore = {};
  fracturePipsFound = {};
  statUpgrades = { strength: 0 };
  limitBreakChosen = null;
  bossDefeated = false;
  storyFlags = {};
  companionState.active = false;
  companionState.canFight = false;
  companionState.mode = 'follow';
  companionState.healCooldown = 0;
  child = null;
  maxHealthBonus = 0;
  maxHealthShardsCollected = {};
  stillpointLifestealBonus = 0;
  clearVitalityMotes();
  resetHealingCrystals();
  abilityState.hasPhaseDash = false;
  abilityState.hasShardShot = false;
  abilityState.hasStillpoint = false;
  abilityState.hasChargedAttack = false;
  abilityState.hasGravitonSurge = false;
  abilityState.hasVoidTether = false;
  abilityState.hasParry = false;
  abilityState.phaseDashCooldown = 0;
  abilityState.shardShotCooldown = 0;
  abilityState.gravitonSurgeCooldown = 0;
  abilityState.voidTetherCooldown = 0;
  abilityState.parryCooldown = 0;
  abilityState.notifications = [];
  resetTutorial();
  spawnAreaEnemies('spawn_area_1');
  resetCamera();
  showUI(true);
}

function respawnPlayer() {
  // Set fade state FIRST so the fade-in always starts, even if later ops fail
  gameState = 'reviving';
  deathFadeDir = 1;
  deathFadeAlpha = 1;
  player.invincibleTimer = INVINCIBLE_FRAMES;
  clearVitalityMotes();
  resetHealingCrystals(); // dying counts as a rest — crystals regrow (healing.js)

  if (lastAnchor) {
    currentAreaId = lastAnchor.areaId;
    player.x = lastAnchor.x;
    player.y = lastAnchor.y - player.height;
    player.vx = 0;
    player.vy = 0;
    player.health = playerMaxHealth();
    clearAreaEnemies(currentAreaId);
    spawnAreaEnemies(currentAreaId);
    resetCamera();
  } else {
    // No checkpoint yet — respawn at the start of the CURRENT area rather
    // than hard-coding a specific room, so this works correctly whether
    // that's the tutorial or the_fracture (both are pre-Anchor).
    player.health = playerMaxHealth();
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
  standEcho = null;
  projectiles = [];
  afterimageHazards = [];
}

// Teleport to the most recent Anchor checkpoint (full health).
// Used by the pause menu — does NOT trigger a fade if there's no checkpoint.
function returnToAnchor() {
  if (!lastAnchor) {
    addAbilityNotification('No Anchor activated yet');
    return;
  }
  // Safety: verify the checkpoint's area still exists (corrupt save or area removed)
  if (!AREAS[lastAnchor.areaId]) {
    addAbilityNotification('Anchor area missing — respawning at room start');
    restartRoom();
    return;
  }
  currentAreaId = lastAnchor.areaId;
  player.x = lastAnchor.x;
  player.y = lastAnchor.y - player.height;
  player.vx = 0;
  player.vy = 0;
  player.health = playerMaxHealth();
  player.invincibleTimer = 30;
  clearAreaEnemies(currentAreaId);
  spawnAreaEnemies(currentAreaId);
  resetCamera();
  SFX.setAreaAmbient(currentAreaId);
  echoes = [];
  standEcho = null;
  projectiles = [];
  afterimageHazards = [];
  spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#c4b5fd', 12);
  SFX.stillpoint();
}

// Reset the current room: player to area spawn, enemies respawn, destructibles heal.
// Used by the pause menu — the player keeps their health/abilities.
function restartRoom() {
  const area = getCurrentArea();
  player.x = 100;
  player.y = area.groundY - 60;
  player.vx = 0;
  player.vy = 0;
  player.invincibleTimer = 30;
  // Heal the room's destructible platforms
  for (const plat of area.platforms) {
    if (plat.destructible && plat.hp !== undefined) {
      plat.hp = plat.maxHp || 3;
    }
  }
  // Respawn all enemies
  clearAreaEnemies(currentAreaId);
  spawnAreaEnemies(currentAreaId);
  // Clear transient entities
  echoes = [];
  standEcho = null;
  projectiles = [];
  afterimageHazards = [];
  boss = null;
  miniboss = null;
  bossProjectiles = [];
  resetCamera();
  spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#67e8f9', 10);
}

// Update game state
function update() {
  frameCount++;

  // Debug overlay toggle — runs in every state, mirrors the FX updates below.
  if (wasJustPressed('F3')) DEBUG_MODE = !DEBUG_MODE;

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

  // Hitstop - freeze frame for impact feel (respect accessibility toggle)
  // Landing a hit triggers this every time (see setHitstop() call sites), so
  // during any combo it fires constantly. clearJustPressed() here used to
  // wipe out any jump/dash/attack press that happened to land during the
  // freeze before player.update() (below, after hitstop ends) ever got a
  // chance to read it — a press during those frames was simply gone,
  // reported by users as "keys feel unresponsive, like jumping" since jump
  // has no input buffer of its own to fall back on. Leaving justPressed
  // untouched lets it survive across frozen ticks and fire on the first real
  // tick once the freeze ends, instead of being silently eaten.
  if (hitstopEnabled && hitstopTimer > 0) {
    hitstopTimer--;
    return;
  }

  // Slow-mo kill cam - skip frames for dramatic effect
  if (slowMoTimer > 0) {
    slowMoSkip++;
    if (slowMoSkip >= 2) { // 0.5x speed (skip every other frame)
      slowMoSkip = 0;
      slowMoTimer--;
    } else {
      // Still render, but skip game logic. Same reasoning as the hitstop
      // branch above: don't clear justPressed here, or a press during the
      // skipped frame never reaches any real update tick.
      draw();
      return;
    }
  }

  // Unstuck key, fullscreen key, and direct inventory shortcut — only during
  // active gameplay
  if (gameState === 'playing') {
    handleUnstuckKey();
    handleFullscreenKey();
    if (wasActionJustPressed('inventory')) {
      inventoryReturnState = 'playing';
      gameState = 'inventory';
      SFX.uiSelect();
      // Must return here: without it, the gameState==='inventory' dispatch
      // further down runs in this SAME frame and re-reads this same
      // still-true wasActionJustPressed('inventory') as "close it," bouncing
      // straight back to 'playing' before a single frame is ever drawn —
      // the inventory screen would open and close invisibly on every press.
      clearJustPressed();
      return;
    }
  }

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

    if (menuScreen === 'main') {
      // Main menu: Play, Controls, Settings
      const mainItems = 3;
      if (wasJustPressed('ArrowUp') || wasJustPressed('KeyW')) {
        menuSelection = (menuSelection - 1 + mainItems) % mainItems;
        SFX.uiSelect();
      } else if (wasJustPressed('ArrowDown') || wasJustPressed('KeyS')) {
        menuSelection = (menuSelection + 1) % mainItems;
        SFX.uiSelect();
      } else if (wasJustPressed('Space') || wasJustPressed('Enter') || menuClick) {
        menuClick = false;
        if (menuSelection === 0) {
          menuScreen = 'play'; // menuSelectionPlay untouched — slot selection persists
          SFX.uiSelect();
        } else if (menuSelection === 1) {
          menuScreen = 'controls';
          controlsMenuIndex = 0;
          SFX.uiSelect();
        } else if (menuSelection === 2) {
          menuScreen = 'settings';
          SFX.uiSelect();
        }
      }
    } else if (menuScreen === 'play') {
      // Play screen: navigate save slots, press N for new game, D to delete, Enter to load
      // NOTE: Do NOT check menuClick here — a canvas click should attempt to load the
      // selected slot (handled below with Enter), not blindly return to main menu.
      if (wasJustPressed('Escape')) {
          menuScreen = 'main';
          menuSelection = 0;
          SFX.uiSelect();
        } else if (wasJustPressed('ArrowUp') || wasJustPressed('KeyW')) {
          menuSelectionPlay = (menuSelectionPlay - 1 + SAVE_SLOTS) % SAVE_SLOTS;
          SFX.uiSelect();
        } else if (wasJustPressed('ArrowDown') || wasJustPressed('KeyS')) {
          menuSelectionPlay = (menuSelectionPlay + 1) % SAVE_SLOTS;
          SFX.uiSelect();
        } else if (wasJustPressed('KeyN')) {
          currentSaveSlot = menuSelectionPlay;
          startNewGame();
        } else if (wasJustPressed('KeyD')) {
          if (hasSaveGame(menuSelectionPlay)) {
            // Ask for confirmation — press D again to confirm, ESC to cancel
            menuScreen = 'confirm_delete';
            SFX.uiSelect();
          }
        } else if (wasJustPressed('Space') || wasJustPressed('Enter') || menuClick) {
          menuClick = false;
          currentSaveSlot = menuSelectionPlay;
          if (hasSaveGame(menuSelectionPlay) && loadGame(menuSelectionPlay)) {
            gameState = 'playing';
            SFX.init();
            SFX.setAreaAmbient(currentAreaId);
            showUI(true);
          } else {
            startNewGame();
          }
        }
      } else if (menuScreen === 'confirm_delete') {
        if (wasJustPressed('KeyD')) {
          deleteSave(menuSelectionPlay);
          menuScreen = 'play';
          SFX.uiSelect();
        } else if (wasJustPressed('Escape')) {
          menuScreen = 'play';
          SFX.uiSelect();
        }
      } else if (menuScreen === 'controls') {
      // Controls screen: navigate rows, Enter/Space/click a row to rebind it,
      // last row resets all bindings to defaults. While rebindingAction is
      // set, input.js's own keydown listener is intercepting the next key
      // press to capture it (or Escape to cancel) — nothing to poll here.
      const totalRows = REMAPPABLE_ACTIONS.length + 1; // +1 for Reset to Defaults
      if (rebindingAction) {
        // waiting on input.js to capture the next keydown
      } else if (wasJustPressed('Escape')) {
        menuScreen = 'main';
        SFX.uiSelect();
      } else if (wasJustPressed('ArrowUp') || wasJustPressed('KeyW')) {
        controlsMenuIndex = (controlsMenuIndex - 1 + totalRows) % totalRows;
        SFX.uiSelect();
      } else if (wasJustPressed('ArrowDown') || wasJustPressed('KeyS')) {
        controlsMenuIndex = (controlsMenuIndex + 1) % totalRows;
        SFX.uiSelect();
      } else if (wasJustPressed('Space') || wasJustPressed('Enter') || menuClick) {
        menuClick = false;
        if (controlsMenuIndex === REMAPPABLE_ACTIONS.length) {
          resetKeyBindings();
        } else {
          startRebind(REMAPPABLE_ACTIONS[controlsMenuIndex]);
        }
        SFX.uiSelect();
      }
    } else if (menuScreen === 'settings') {
      // Settings screen: Screen Shake, Hitstop
      const settingsItems = 2;
      if (wasJustPressed('Escape')) {
        menuScreen = 'main';
        SFX.uiSelect();
      } else if (wasJustPressed('ArrowUp') || wasJustPressed('KeyW')) {
        menuSelectionSettings = (menuSelectionSettings - 1 + settingsItems) % settingsItems;
        SFX.uiSelect();
      } else if (wasJustPressed('ArrowDown') || wasJustPressed('KeyS')) {
        menuSelectionSettings = (menuSelectionSettings + 1) % settingsItems;
        SFX.uiSelect();
      } else if (wasJustPressed('Space') || wasJustPressed('Enter') || menuClick) {
        menuClick = false;
        if (menuSelectionSettings === 0) {
          screenShakeEnabled = !screenShakeEnabled;
          saveSettings();
        } else if (menuSelectionSettings === 1) {
          hitstopEnabled = !hitstopEnabled;
          saveSettings();
        }
        SFX.uiSelect();
      }
    }
    clearJustPressed();
    return;
  }

  // Game over state
  if (gameState === 'gameover') {
    if (wasJustPressed('KeyR')) {
      respawnPlayer();
    } else if (wasJustPressed('Escape')) {
      // Quit to menu (don't delete save!)
      init();
    }
    clearJustPressed();
    return;
  }

  // Pause state — menu navigation (Phase 0.5)
  if (gameState === 'paused') {
    if (wasJustPressed('Escape')) {
      // Close menu → resume
      gameState = 'playing';
    } else if (wasJustPressed('ArrowUp')) {
      pauseMenuIndex = (pauseMenuIndex - 1 + pauseMenuItems.length) % pauseMenuItems.length;
      SFX.uiSelect();
    } else if (wasJustPressed('ArrowDown')) {
      pauseMenuIndex = (pauseMenuIndex + 1) % pauseMenuItems.length;
      SFX.uiSelect();
    } else if (wasJustPressed('Enter') || wasJustPressed('Space')) {
      const action = pauseMenuItems[pauseMenuIndex].action;
      if (action) {
        action();
        // Only resume if the action didn't change the game state (e.g. Quit to Menu calls init())
        if (gameState === 'paused') {
          gameState = 'playing';
        }
      }
    }
    clearJustPressed();
    return;
  }

  // Controls screen reached from the pause menu's "Controls" item — same
  // rebind logic as the main menu's version (menuScreen === 'controls'
  // above), just with Escape returning to the pause menu instead of main.
  if (gameState === 'paused_controls') {
    const totalRows = REMAPPABLE_ACTIONS.length + 1; // +1 for Reset to Defaults
    if (rebindingAction) {
      // waiting on input.js to capture the next keydown
    } else if (wasJustPressed('Escape')) {
      gameState = 'paused';
      buildPauseMenu();
      SFX.uiSelect();
    } else if (wasJustPressed('ArrowUp') || wasJustPressed('KeyW')) {
      controlsMenuIndex = (controlsMenuIndex - 1 + totalRows) % totalRows;
      SFX.uiSelect();
    } else if (wasJustPressed('ArrowDown') || wasJustPressed('KeyS')) {
      controlsMenuIndex = (controlsMenuIndex + 1) % totalRows;
      SFX.uiSelect();
    } else if (wasJustPressed('Space') || wasJustPressed('Enter') || menuClick) {
      menuClick = false;
      if (controlsMenuIndex === REMAPPABLE_ACTIONS.length) {
        resetKeyBindings();
      } else {
        startRebind(REMAPPABLE_ACTIONS[controlsMenuIndex]);
      }
      SFX.uiSelect();
    }
    clearJustPressed();
    return;
  }

  // Inventory screen (roadmap 1.9) — sub-menu off pause. Navigate the
  // upgrade list (data-driven, see INVENTORY_UPGRADES) and spend banked
  // Lore Pips on the selected row; everything else is display-only.
  if (gameState === 'inventory') {
    if (inventoryMessage) {
      inventoryMessage.timer--;
      if (inventoryMessage.timer <= 0) inventoryMessage = null;
    }
    if (wasJustPressed('Escape') || wasActionJustPressed('inventory')) {
      gameState = inventoryReturnState;
      if (gameState === 'paused') buildPauseMenu();
      SFX.uiSelect();
    } else if (wasJustPressed('ArrowUp')) {
      inventorySelection = (inventorySelection - 1 + INVENTORY_UPGRADES.length) % INVENTORY_UPGRADES.length;
      SFX.uiSelect();
    } else if (wasJustPressed('ArrowDown')) {
      inventorySelection = (inventorySelection + 1) % INVENTORY_UPGRADES.length;
      SFX.uiSelect();
    } else if (wasJustPressed('Enter') || wasJustPressed('Space')) {
      const def = INVENTORY_UPGRADES[inventorySelection];
      if (tryUpgrade(def.key)) {
        SFX.abilityPickup();
        inventoryMessage = { text: `${def.label} upgraded!`, timer: 90 };
      } else {
        SFX.uiSelect();
        inventoryMessage = { text: 'Not enough Lore Pips', timer: 90 };
      }
    }
    clearJustPressed();
    return;
  }

  // Reviving state (fade-in from black) — skip all gameplay until fade completes
  if (gameState === 'reviving') {
    clearJustPressed();
    return;
  }

  // Cutscene state — the script runner (cutscene.js) owns the frame:
  // input locked (except hold-attack-to-skip), enemies/boss frozen, world
  // still rendered by draw() with the letterbox overlay on top.
  if (gameState === 'cutscene') {
    updateCutscene();
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
      player.health = playerMaxHealth();
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
  if (wasActionJustPressed('map')) {
    mapOpen = !mapOpen;
    if (mapOpen) resetMapView(); // fresh centered view every time it's opened
    SFX.uiSelect();
  }
  if (mapOpen) {
    // Pan/zoom the full map view (map.js's mapView — drawMap() just applies
    // whatever this sets). Held-key panning/zooming, not one-shot, so
    // holding a direction actually scrolls smoothly.
    const MAP_PAN_SPEED = 8, MAP_ZOOM_SPEED = 0.03;
    if (keys['ArrowLeft'] || keys['KeyA']) mapView.panX += MAP_PAN_SPEED;
    if (keys['ArrowRight'] || keys['KeyD']) mapView.panX -= MAP_PAN_SPEED;
    if (keys['ArrowUp'] || keys['KeyW']) mapView.panY += MAP_PAN_SPEED;
    if (keys['ArrowDown'] || keys['KeyS']) mapView.panY -= MAP_PAN_SPEED;
    if (keys['Equal'] || keys['NumpadAdd']) mapView.zoom = Math.min(3, mapView.zoom + MAP_ZOOM_SPEED);
    if (keys['Minus'] || keys['NumpadSubtract']) mapView.zoom = Math.max(0.4, mapView.zoom - MAP_ZOOM_SPEED);
    if (wasJustPressed('Digit0')) resetMapView();
    clearJustPressed();
    return;
  }

  // Live camera zoom (dev/tuning control, 2026-07-27) — BracketRight/Left
  // zoom in/out around the player, Backslash resets to 1. Distinct keys
  // from the map's own Equal/Minus zoom above (mutually exclusive anyway
  // since that block returns early) so the two never read as the same
  // control conceptually.
  const CAMERA_ZOOM_SPEED = 0.02;
  if (keys['BracketRight']) camera.zoom = Math.min(2.5, camera.zoom + CAMERA_ZOOM_SPEED);
  if (keys['BracketLeft']) camera.zoom = Math.max(0.5, camera.zoom - CAMERA_ZOOM_SPEED);
  if (wasJustPressed('Backslash')) camera.zoom = 1;

  // Toggle pause during gameplay — except in the tutorial room, where the
  // pause action skips straight to The Fracture instead (tutorial is meant
  // to be skippable).
  if (wasActionJustPressed('pause')) {
    if (currentAreaId === 'tutorial_area') {
      skipTutorial();
    } else {
      gameState = 'paused';
      pauseMenuIndex = 0;
      buildPauseMenu();
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
      SFX.setBossMusic('sovereign');
    }
  }
  // Clear boss when leaving boss arena
  if (!area.isBossArena && boss) {
    boss = null;
    bossProjectiles = [];
    SFX.setBossMusic(null);
  }

  // Spawn miniboss when entering a miniboss arena (Colossus Core, etc.) —
  // parallel to the King's spawn above but keyed by `area.miniboss` (an id
  // string) rather than tied to isBossArena, so multiple future minibosses
  // in different regions can each persist their own defeated flag.
  if (area.isMinibossArena && !miniboss && !defeatedMinibosses[area.miniboss]) {
    const spawn = area.bossSpawn;
    const MinibossClass = MINIBOSS_CLASSES[area.miniboss];
    if (spawn && MinibossClass) {
      miniboss = new MinibossClass(spawn.x, spawn.y);
      screenShake = 30;
      screenShakeIntensity = 4;
      spawnParticles(spawn.x + 32, spawn.y + 32, '#d97757', 20);
      spawnParticles(spawn.x + 32, spawn.y + 32, '#fb923c', 12);
      SFX.setBossMusic(area.miniboss);
    }
  }
  // Clear miniboss when leaving its arena
  if (!area.isMinibossArena && miniboss) {
    miniboss = null;
    SFX.setBossMusic(null);
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
  // Update gameTimeScale — everything except the player and Phase-3 boss
  // reads this. Hard-floored at 0.05 (user feedback 2026-07-16: it must
  // never actually reach 0 — that reads as the whole game freezing, not
  // an intentional near-stop) regardless of what stillpointSlow requests.
  // The player is deliberately never scaled by this at all (Stillpoint
  // moves at 100% speed per the design doc) — if the player ever looks
  // frozen during Stillpoint, that's a different bug, not this line.
  // Sovereign's Phase 3 Stillpoint (2026-07-26) also drives this — a real,
  // room-wide cast mirroring the player's own ability, just steeper
  // (BOSS_STILLPOINT_SLOW, boss.js). Player's own Stillpoint still wins if
  // both are somehow active; else her own cast drives it.
  gameTimeScale = (player.stillpointActive && abilityState.hasStillpoint)
    ? Math.max(0.05, 1 - player.stillpointSlow)
    : (typeof boss !== 'undefined' && boss && boss.bossStillpointActive)
      ? Math.max(0.05, 1 - BOSS_STILLPOINT_SLOW)
      : 1.0;

  if (abilityState.phaseDashCooldown > 0) abilityState.phaseDashCooldown -= player.timeScale;
  if (abilityState.shardShotCooldown > 0) abilityState.shardShotCooldown -= player.timeScale;
  if (abilityState.gravitonSurgeCooldown > 0) abilityState.gravitonSurgeCooldown -= player.timeScale;
  if (abilityState.voidTetherCooldown > 0) abilityState.voidTetherCooldown -= player.timeScale;
  if (abilityState.parryCooldown > 0) abilityState.parryCooldown -= player.timeScale;

  // Player DoT (ComposedEnemy phase system's `dotOnHit` flag — see
  // applyPlayerDot() below) — same un-scaled-by-gameTimeScale, plain
  // per-frame countdown shape as `enemy.burning`'s tick (game.js:3424-3432),
  // deliberate since the player is never Stillpoint-scaled either.
  if (player.dot) {
    player.dot.tickTimer--;
    if (player.dot.tickTimer <= 0) {
      player.dot.tickTimer = player.dot.tickInterval;
      player.takeDamage(player.dot.damagePerTick); // no sourceX -> no knockback, just chip damage
    }
    player.dot.timer--;
    if (player.dot.timer <= 0) player.dot = null;
  }

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

  // Moving/crumbling platforms run BEFORE the player so a moving platform
  // carries them with it, and so a crumbled piece is already gone when
  // collision runs this frame.
  updatePlatformSystems(area);

  // Sovereign's Phase 3 Stillpoint (2026-07-26) — the reversed version of
  // the player's own Stillpoint: slows the PLAYER's own world-resolution,
  // the same way gameTimeScale normally slows enemies. A separate field
  // from gameTimeScale on purpose — the player deliberately never reads
  // gameTimeScale itself (see the comment above), so this is the one
  // mechanism that can ever slow the player.
  player.timeScale = (typeof boss !== 'undefined' && boss && boss.bossStillpointActive)
    ? Math.max(0.05, 1 - BOSS_STILLPOINT_SLOW)
    : 1.0;

  // Update player
  player.update(bounds, area.platforms);

  // Hazards are trigger volumes (never solid) — damage on overlap. The
  // player's own i-frames throttle repeat contact, so no per-hazard timer.
  applyHazardDamage(area);

  // Combo chains (combo.js) — watches player state flags for action events
  // and matches them against COMBO_DEFS; rewards fire on completion.
  updateComboTracker(player);

  // Healing systems (healing.js) — vitality mote drift/collection and
  // strike-open healing crystals.
  updateVitalityMotes(player, gameTimeScale);
  updateHealingCrystals(player, area);

  // The Child (companion.js) — follows, hides during combat, heals after,
  // and (once taught) tether-assists. Created lazily so saves/branches that
  // never activate her pay no cost.
  if (companionState.active) {
    if (!child) {
      child = new Child(player.x - player.facing * 50, player.y);
      nudgeOutOfPlatforms(child, area.platforms, 'Child spawn', true);
    }
    child.update(player, area, bounds, areaEnemies[currentAreaId] || [], gameTimeScale);
    if (wasActionJustPressed('callChild')) child.call(player);
  } else if (child) {
    child = null;
  }

  // ── Wall slide particles ──────────────────────────────────────────────
  if (player.wallSliding && player.wallNormal !== 0) {
    // Sparks at wall contact point
    const sparkX = player.x + player.width / 2 + player.wallNormal * (player.width / 2);
    const sparkY = player.y + player.height * (0.3 + Math.random() * 0.5);
    spawnParticles(sparkX, sparkY, '#c4b5fd', 1);
  }
  // ── Wall jump burst ───────────────────────────────────────────────────
  if (player.wallJumpJustFired) {
    const burstX = player.x + player.width / 2 + player.wallNormal * (player.width / 2);
    const burstY = player.y + player.height / 2;
    spawnParticles(burstX, burstY, '#c4b5fd', 10);
    spawnParticles(burstX, burstY, '#67e8f9', 6);
    SFX.wallJump();
    player.wallJumpJustFired = false;
  }

  // Check player death or pit death (fell off the map)
  // Note: death at 0 HP should trigger regardless of invincibility timer
  const playerDead = player.health <= 0;
  // Explicit per-room override. Used to fall back to `groundY + 100` when
  // unset, but that relied on player.js's old invisible groundY floor to
  // ever be reachable in the first place — now that falling is governed
  // purely by real platforms, the correct no-op default is "never die,"
  // per the project's no-fall-death-by-default rule (CLAUDE.md). Rooms
  // that want a real pit set `pitDeathY` explicitly, same as always.
  const pitDeathY = typeof bounds.pitDeathY === 'number' ? bounds.pitDeathY : Infinity;
  // Limit Break (Lv4, any ability): "immunity to environmental hazards
  // (spikes, pits, lava) for the duration" — see Enemy_Design.pdf Rule 0.
  const pitDeath = player.y > pitDeathY && !limitBreak.active;
  // Combat i-frames are irrelevant to falling off the map — a player who
  // got knocked into a pit while still invincible from that same hit
  // should still die, not fall forever/clip below the room. Only real
  // health-death (playerDead) and pit-death itself gate this; invincibility
  // never blocks either.
  if (playerDead || pitDeath) {
    screenShake = 15;
    screenShakeIntensity = 6;
    deathFadeDir = -1;
    deathFadeAlpha = 0;
    SFX.playerHurt();
    if (player.y > pitDeathY) {
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

  // Phase Dash Lv4 Limit Break — "the echo becomes similar to a Stand
  // (follows you)" (Enemy_Design.pdf). Lives/dies with the Enhanced State,
  // tracks the player every frame instead of staying planted like the
  // normal dash-echo.
  if (limitBreak.active && limitBreak.ability === 'phase_dash') {
    if (!standEcho) { standEcho = new Echo(player.x, player.y, player.facing); standEcho.life = standEcho.maxLife = 999999; }
    standEcho.x = player.x - player.facing * 30;
    standEcho.y = player.y;
    standEcho.facing = player.facing;
  } else if (standEcho) {
    standEcho = null;
  }

  // Shard Shot firing
  if (player.shardShotFired) {
    const shots = useShardShot(player, player.shardAimVy);
    for (const proj of shots) {
      projectiles.push(proj);
      spawnParticles(proj.x + 5, proj.y + 3, '#67e8f9', 4);
    }
    SFX.shardShot();
    // Cooldown was declared, decremented, gated on, and even drawn in the
    // HUD ring — but never actually set on fire (user report 2026-07-19:
    // "does shard shot cooldown actually work?"). canUseShardShot() was
    // permanently reading 0, so Shard Shot had zero real cooldown.
    abilityState.shardShotCooldown = SHARD_SHOT_COOLDOWN;
  }
  // Shard Shot Lv4 Limit Break — "your melee swings are replaced with Shard
  // Blasts (glowing projectiles, 150% damage)" (Enemy_Design.pdf). Was not
  // implemented at all before (user report 2026-07-16) — player.js now
  // intercepts the attack button into `shardBlastFired` while this
  // Enhanced State is active; this fires the actual projectile.
  if (player.shardBlastFired) {
    const speed = 12;
    const vx = speed * (player.facing || 1);
    const startX = (player.facing || 1) > 0 ? player.x + player.width : player.x - 8;
    const startY = player.y + player.height / 2;
    const proj = new Projectile(startX, startY, vx, 0, shardShotDamage() * 1.5, '#67e8f9');
    proj.width = 12; proj.height = 12;
    projectiles.push(proj);
    spawnParticles(proj.x + 6, proj.y + 6, '#67e8f9', 8);
    screenShake = 4; screenShakeIntensity = 2; setHitstop(3);
    SFX.attack();
  }
  // Lv3 Beam Attack — continuous channel, ticks damage every BEAM_TICK_INTERVAL
  // frames to every enemy currently touching the line (Enemy_Design.pdf,
  // reworked 2026-07-16 into a real continuous beam per user clarification).
  if (player.beaming) {
    player.beamTickTimer = (player.beamTickTimer || 0) + 1;
    if (player.beamTickTimer >= BEAM_TICK_INTERVAL) {
      player.beamTickTimer = 0;
      const seg = getBeamSegment(player);
      const dmg = beamDamagePerTick();
      const enemiesHere = areaEnemies[currentAreaId] || [];
      for (const enemy of enemiesHere) {
        if (enemy.dead) continue;
        const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
        if (distToSegment(ex, ey, seg.x1, seg.y1, seg.x2, seg.y2) <= (enemy.width / 2 + 6)) {
          enemy.takeDamage(dmg, seg.x1);
        }
      }
      spawnParticles(seg.x1 + 5, seg.y1, '#67e8f9', 2);
    }
  }

  // Phase Dash Lv4 (old Lv3) — "when you swing your sword, the echo attacks
  // once from its position (deals 50% of your normal damage), then fades"
  // (Enemy_Design.pdf). Lv5 Limit Break: the Stand echo (standEcho, spawned
  // above) mirrors every swing at 100% damage instead, and never fades
  // while the Enhanced State is active.
  if (player.echoAttackPending) {
    player.echoAttackPending = false;
    const isStand = limitBreak.active && limitBreak.ability === 'phase_dash' && standEcho;
    if (isStand || (oldTier('phase_dash') >= 3 && echoes.length > 0)) {
      const echo = isStand ? standEcho : echoes[0];
      const echoDmg = playerMeleeDamage() * (isStand ? 1.0 : 0.5);
      // Always show the swing, hit or not (user feedback 2026-07-16 — the
      // attack was invisible unless it actually connected).
      echo.swingFlash = 10;
      spawnParticles(echo.x + echo.width / 2, echo.y + echo.height / 2, '#c4b5fd', 8);
      const enemiesHere = areaEnemies[currentAreaId] || [];
      for (const enemy of enemiesHere) {
        if (enemy.dead) continue;
        const d = Math.hypot((enemy.x + enemy.width / 2) - (echo.x + echo.width / 2), (enemy.y + enemy.height / 2) - (echo.y + echo.height / 2));
        if (d <= ECHO_DISTRACT_RADIUS) {
          enemy.takeDamage(echoDmg, echo.x);
          spawnParticles(echo.x + echo.width / 2, echo.y + echo.height / 2, '#c4b5fd', 6);
        }
      }
      if (!isStand) echo.life = 0; // fades immediately after attacking, per the design doc — the Stand doesn't
    }
  }

  // ── Void Tether (base ability built 2026-07-16, Enemy_Design.pdf) ───────
  // Lv0: pulls the nearest enemy in range to the player, no bonus effect.
  // Lv1 (2026-07-27, the new cheap entry tier): +15% range, a smaller
  // partial step. Lv2 (old Lv1): +30% range. Lv3 (old Lv2): electrified —
  // +1 dmg & 15f stun on arrival. Lv4 (old Lv3): +50% pull speed, arc-stuns
  // 1 other nearby enemy too. Lv5 Limit Break: 0-pip/1.5s-cooldown cast + a
  // 3s/2dps burning DoT on arrival.
  if (player.voidTetherFired) {
    const rawTether = abilityLevel('void_tether');
    const range = VOID_TETHER_RANGE_BASE * (oldTier('void_tether') >= 1 ? 1.3 : (rawTether >= 1 ? 1.15 : 1));
    // Facing auto-aim (user spec 2026-07-16): target the nearest enemy IN
    // THE DIRECTION THE PLAYER FACES — never yank something in from behind.
    // findVoidTetherTarget scores by distance + vertical offset so a level
    // enemy beats a diagonal one at similar range.
    const target = findVoidTetherTarget(player, range);
    const speed = VOID_TETHER_PULL_SPEED_BASE * (oldTier('void_tether') >= 3 ? 1.5 : 1);
    if (target) {
      // The Catch (enemy_attack_vocabulary_plan.md, priority #3 —
      // 2026-07-20): a target carrying void_tether/the_catch reverses the
      // pull direction (player flies to them instead) — the "or pulls you
      // to walls" half of the ability repurposed onto a Heavy enemy instead
      // of a wall. `armored` (def.stats.armored) additionally catches +
      // grapple-throws the player on arrival, see the arrival block below.
      const catchCounter = target.counters && target.counters.find((c) => c.ability === 'void_tether' && c.effect === 'the_catch');
      player.tether = {
        targetEnemy: target, speed, pullTimer: 0,
        pullPlayerToEnemy: !!catchCounter,
        catchOnArrival: !!(catchCounter && target.armored),
        catchParams: catchCounter ? { ...COUNTER_EFFECTS.void_tether.the_catch.params, ...catchCounter } : null,
      };
      // A beat of hitstop right as the tether latches on — user feedback
      // 2026-07-20: the pull used to start moving the same instant it
      // fired, with nothing marking the moment it connected, so there was
      // no window to register "it grabbed something" before the target was
      // already in motion. This is the same freeze-frame convention every
      // other big hit in the game already uses (see the heavy-attack and
      // guard-break hitstop above) — just applied to the cast itself.
      setHitstop(6);
      SFX.dash();
    } else {
      // "Pulls enemies to you, OR pulls you to walls" (Enemy_Design.pdf) —
      // this half was missing entirely (user report 2026-07-16: "void
      // tether is not built at all", likely hit when no enemy was in
      // range, which silently did nothing). Finds the nearest solid
      // platform edge in front of the player and grapples the player to it.
      const area = getCurrentArea();
      const facing = player.facing || 1;
      let wallTargetX = null, bestWallD = range;
      if (area) {
        for (const plat of area.platforms) {
          if (plat.destructible && plat.hp <= 0) continue;
          if (player.y + player.height <= plat.y || player.y >= plat.y + plat.h) continue; // no vertical overlap
          const edgeX = facing === 1 ? plat.x : plat.x + plat.w;
          const d = (edgeX - (player.x + player.width / 2)) * facing;
          if (d > 0 && d <= bestWallD) { bestWallD = d; wallTargetX = facing === 1 ? edgeX - player.width - 2 : edgeX + 2; }
        }
      }
      if (wallTargetX !== null) {
        player.tether = { targetPoint: { x: wallTargetX, y: player.y }, speed, pullTimer: 0 };
        setHitstop(6);
        SFX.dash();
      } else {
        // WHIFF — nothing in front to pull and no wall to grapple. The old
        // code silently burned the full cooldown here with zero feedback
        // (a big part of why the ability read as "does nothing"). Refund
        // the cooldown down to a small tax + a visible/audible fizzle.
        abilityState.voidTetherCooldown = Math.min(abilityState.voidTetherCooldown, VOID_TETHER_WHIFF_COOLDOWN);
        const fx = player.x + player.width / 2 + player.facing * 30;
        spawnParticles(fx, player.y + player.height / 2, '#34d399', 5);
        SFX.parry(); // short fizzle "tick" — reuse until a dedicated SFX exists
      }
    }
  }
  if (player.tether && player.tether.targetPoint) {
    const tp = player.tether.targetPoint;
    const dx = tp.x - player.x, dy = tp.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d <= player.tether.speed + 4) {
      player.x = tp.x; player.y = tp.y; player.vx = 0; player.vy = 0;
      player.tether = null;
    } else {
      player.tether.pullTimer++;
      // Accelerates into the pull instead of an instant fixed speed (user
      // feedback 2026-07-20: "so hard to respond in time" — ramping up
      // buys a beat of reaction window right at the start, and reads as a
      // yank building up rather than a teleport).
      const rampedSpeed = player.tether.speed * Math.min(1, 0.35 + player.tether.pullTimer * 0.08);
      player.vx = (dx / d) * rampedSpeed;
      player.vy = (dy / d) * rampedSpeed;
      // player.update() already ran earlier this frame and will run again
      // BEFORE this code next frame — its own input-driven movement block
      // (`if (!this.dashing && !this.phaseDashing && this.hitStunTimer<=0)`)
      // would stomp the velocity just set above with whatever the arrow
      // keys say before it's ever used to move. hitStunTimer already exists
      // as exactly this "my velocity is externally driven, don't touch it"
      // gate (used for knockback) — reusing it here, refreshed every frame
      // the grapple is active, keeps the pull actually moving the player.
      player.hitStunTimer = Math.max(player.hitStunTimer, 2);
    }
  }
  if (player.tether && player.tether.targetEnemy) {
    const enemy = player.tether.targetEnemy;
    // Attacking cancels the pull (user request 2026-07-20: "attacking the
    // enemy should end the tether, which will encourage combos") — swing
    // instead of waiting out the yank, and the attack's own hitbox check
    // (already running elsewhere this same frame) lands normally against
    // wherever the target currently is instead of fighting the tether's
    // velocity override for it.
    if (player.attacking) {
      player.tether = null;
    } else if (enemy.dead) {
      player.tether = null;
    } else {
      const px = player.x + player.width / 2, py = player.y + player.height / 2;
      const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
      const d = Math.hypot(px - ex, py - ey);
      if (d <= player.tether.speed + 4) {
        // Arrival
        // The Catch, Armored branch — the enemy catches the incoming player
        // and grapple-throws them instead of the usual "enemy takes
        // damage" arrival: the real risk/reward payoff of Void Tether-ing a
        // Heavy target. No guard-break/damage/hitstun for the enemy here —
        // this is the punish landing on the PLAYER, not the other way
        // around.
        if (player.tether.catchOnArrival) {
          const cp = player.tether.catchParams;
          const dir = ex >= px ? 1 : -1;
          player.vx = dir * cp.throwKnockbackX;
          player.vy = cp.throwKnockbackY;
          player.hitStunTimer = cp.throwHitStun;
          if (player.invincibleTimer <= 0) player.takeDamage(cp.damage, ex);
          spawnParticles(px, py, '#f87171', 12);
          screenShake = Math.max(screenShake, 10); screenShakeIntensity = Math.max(screenShakeIntensity, 5);
          setHitstop(8);
          SFX.playerHurt();
          player.tether = null;
        } else {
          // A tether yank rips a raised guard open (defense-verb counterplay:
          // block is beaten by heavies, backstabs, and THIS — deliberate
          // synergy: tether → guard broken → punish).
          if (enemy.blocking > 0) {
            enemy.blocking = 0;
            enemy.guardBroken = 40;
            spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#e2e8f0', 10);
          }
          const tetherTier = oldTier('void_tether');
          if (tetherTier >= 2 || (limitBreak.active && limitBreak.ability === 'void_tether')) {
            enemy.takeDamage(1, px);
            // hitStun, not stunTimer — stunTimer is the parry-freeze mechanic
            // (zeroes vx and skips physics entirely, see enemy.js's per-type
            // update()); a "stunned" enemy from a non-parry source should
            // still take knockback normally (user feedback 2026-07-16).
            enemy.hitStun = Math.max(enemy.hitStun || 0, 15);
          }
          if (tetherTier >= 3) {
            // Arc: stun (no damage) the next-nearest enemy too
            let arcTarget = null, arcD = 120;
            for (const other of (areaEnemies[currentAreaId] || [])) {
              if (other === enemy || other.dead) continue;
              const od = Math.hypot((other.x + other.width / 2) - ex, (other.y + other.height / 2) - ey);
              if (od < arcD) { arcD = od; arcTarget = other; }
            }
            if (arcTarget) arcTarget.hitStun = Math.max(arcTarget.hitStun || 0, 15);
          }
          if (limitBreak.active && limitBreak.ability === 'void_tether') {
            enemy.burning = { timer: 180, tickTimer: 0 }; // 3s @ 2dmg/s (game.js's enemy-update tick applies this)
          }
          spawnParticles(ex, ey, '#34d399', 10);
          screenShake = Math.max(screenShake, 6); screenShakeIntensity = Math.max(screenShakeIntensity, 3);
          setHitstop(6);
          player.tether = null;
        }
      } else if (!player.tether.pullPlayerToEnemy && player.tether.hitStunSetLastFrame !== undefined && enemy.hitStun >= player.tether.hitStunSetLastFrame) {
        // Resisted pull (user report 2026-07-20: Void Lancer, and any other
        // enemy type whose own update() never checks hitStun — confirmed
        // several exist: Stutterer, EchoStalker, BlitzGuard, FracturedSlime,
        // CrystalSentinel, ColossusCore — silently overwrite the velocity
        // set below with their own AI's vx every frame, same as this file's
        // comment above already explains for the general case).
        //
        // Was detected by "distance to target stopped shrinking," but that
        // missed the actual reported symptom: a target resisting on ONE
        // axis (Void Lancer never moves horizontally without sight/aggro)
        // still has its OVERALL distance shrink from the other axis alone
        // (the vy leak this whole check exists to catch), so distance-stall
        // didn't fire until the enemy physically hit a ceiling — 20+ frames
        // of visible vertical drift first. hitStun is a much sharper
        // signal: an enemy that actually respects it decrements it by 1 in
        // its own update() every frame (see enemy.js's `if (hitStun>0) {
        // hitStun--; ...}` gate); one that doesn't (never even reads the
        // property) leaves it exactly where this block last set it. Compare
        // this frame's value to what was set last frame — if it didn't
        // drop, the enemy never took the suppression, and we bail within a
        // frame or two instead of tens of frames of leak.
        spawnParticles(ex, ey, '#94a3b8', 6);
        SFX.parry(); // reuse the fizzle tick, matches the whiff-cast SFX
        player.tether = null;
      } else if (player.tether.pullPlayerToEnemy) {
        // The Catch — reversed pull: the PLAYER flies toward the (possibly
        // still-moving) enemy instead of the other way around. Same accel
        // ramp/hitStunTimer-as-external-velocity-gate trick as the
        // targetPoint wall-grapple case above, just tracking a moving
        // target each frame instead of a fixed point.
        player.tether.pullTimer++;
        const rampedSpeed = player.tether.speed * Math.min(1, 0.35 + player.tether.pullTimer * 0.08);
        player.vx = ((ex - px) / d) * rampedSpeed;
        player.vy = ((ey - py) / d) * rampedSpeed;
        player.hitStunTimer = Math.max(player.hitStunTimer, 2);
      } else {
        player.tether.pullTimer++;
        // Same accel ramp as the wall-grapple case above.
        const rampedSpeed = player.tether.speed * Math.min(1, 0.35 + player.tether.pullTimer * 0.08);
        enemy.vx = ((px - ex) / d) * rampedSpeed;
        enemy.vy = ((py - ey) / d) * rampedSpeed;
        // Confirmed via harness (user report 2026-07-19: "void tether
        // still doesn't even work" / "enemies float at your level"): the
        // velocity set above did nothing — enemy.update() runs LATER this
        // same frame (see the main enemy loop below) and, unless the enemy
        // is already in hitStun, its own chase/patrol AI recomputes vx/vy
        // from scratch and overwrites this every single frame before any
        // movement ever uses it. The pull target sat frozen in place while
        // `player.tether` stayed set indefinitely — which also explains
        // "shard shot after void tether pulls the enemy closer": the tether
        // never actually resolved, so it kept running in the background and
        // stomped the shard hit's own (correct, outward) knockback on the
        // very next frame. hitStun already exists as an AI-suppression
        // gate (enemy.js's update() early-returns and just runs physics
        // with whatever vx/vy is already set) — reusing it here, refreshed
        // every frame while the pull is active, is the same pattern the
        // player-side fix above uses.
        enemy.hitStun = Math.max(enemy.hitStun || 0, 3);
        player.tether.hitStunSetLastFrame = enemy.hitStun;
      }
    }
  }

  // ── Graviton Surge Gravity Ball (Lv2+, built 2026-07-16) ─────────────────
  // Pulls while anchored (charging) AND while it's flying forward+upward
  // after release, right up until it explodes (2026-07-19).
  if (player.gravitonBallCharging || player.gravitonBallFlying) {
    const enemiesHere = areaEnemies[currentAreaId] || [];
    for (const enemy of enemiesHere) {
      if (enemy.dead) continue;
      const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
      const d = Math.hypot(ex - player.gravitonBallX, ey - player.gravitonBallY);
      if (d > 0 && d <= GRAVITON_BALL_PULL_RADIUS) {
        const pullSpeed = GRAVITON_BALL_PULL_FORCE * (limitBreak.active && limitBreak.ability === 'graviton_surge' ? 1.5 : 1);
        enemy.vx += ((player.gravitonBallX - ex) / d) * pullSpeed;
        enemy.vy += ((player.gravitonBallY - ey) / d) * pullSpeed;
      }
    }
  }
  if (player.gravitonBallPop) {
    player.gravitonBallPop = false;
    if (oldTier('graviton_surge') >= 3 || (limitBreak.active && limitBreak.ability === 'graviton_surge')) {
      const dmg = limitBreak.active && limitBreak.ability === 'graviton_surge' ? GRAVITON_BALL_EXPLODE_DAMAGE * 1.5 : GRAVITON_BALL_EXPLODE_DAMAGE;
      const kb = limitBreak.active && limitBreak.ability === 'graviton_surge' ? GRAVITON_BALL_EXPLODE_KB * 2 : GRAVITON_BALL_EXPLODE_KB; // 300%/200% knockback multiplier on a base of ~2-4
      const enemiesHere = areaEnemies[currentAreaId] || [];
      for (const enemy of enemiesHere) {
        if (enemy.dead) continue;
        const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
        const d = Math.hypot(ex - player.gravitonBallX, ey - player.gravitonBallY);
        if (d <= GRAVITON_BALL_PULL_RADIUS) {
          enemy.takeDamage(dmg, player.gravitonBallX);
          enemy.vx = ((ex - player.gravitonBallX) / (d || 1)) * kb;
          enemy.vy = -kb * 0.5;
        }
      }
      spawnParticles(player.gravitonBallX, player.gravitonBallY, '#f472b6', 20);
      screenShake = 14; screenShakeIntensity = 8; setHitstop(8);
    }
  }

  // ── Graviton Surge: flips gravity for every enemy in range, not just the
  // player (fixed 2026-07-16 — was player-only). Uses resolveCeilingY()
  // (real platform-aware ceiling collision, see its comment above) instead
  // of a fixed clamp line, so enemies stop at the underside of an actual
  // ceiling platform instead of clipping through it. Lv0: stun only, 0
  // damage. Lv1+: stun + 1 damage (Enemy_Design.pdf). Uses hitStun, not
  // stunTimer, for the stun — stunTimer is the parry-freeze mechanic (skips
  // physics entirely), which was silently making these "stunned" enemies
  // immune to their own slam knockback (user feedback 2026-07-16).
  if (player.gravitonActive) {
    const dealsDamage = oldTier('graviton_surge') >= 1 || (limitBreak.active && limitBreak.ability === 'graviton_surge');
    const px = player.x + player.width / 2, py = player.y + player.height / 2;
    const area = getCurrentArea();
    const enemiesHere = areaEnemies[currentAreaId] || [];
    for (const enemy of enemiesHere) {
      if (enemy.dead) continue;
      // Flying enemies (ComposedEnemy's hover/teleport_blink movement —
      // Crystal Sentinel included since its 2026-07-24 ComposedEnemy
      // migration — plus any remaining bespoke class's own isFlying flag)
      // ignore gravity entirely already, so a gravity flip has nothing to
      // grab onto — they
      // stay fully immune to both the ceiling pin and the slam damage
      // instead of getting yanked upward like grounded enemies (user
      // clarification 2026-07-24: this is intended, not the "flies through
      // the ceiling" bug — the pin/damage just shouldn't apply to them).
      if (enemy._movementFlies || enemy.isFlying) continue;
      const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
      if (Math.hypot(ex - px, ey - py) > GRAVITON_SURGE_RANGE) {
        enemy.gravitonSlammed = false; enemy.gravitonBounceTimer = 0; enemy._groundStompFired = false;
        continue;
      }
      // Ground Stomp counter (enemy_attack_vocabulary_plan.md — fixed
      // 2026-07-24, see COUNTER_EFFECTS.graviton_surge in enemy.js): this
      // enemy stands its ground instead of getting pinned to the ceiling —
      // "Surge isn't a free wail-on-them window" for enemies that carry it.
      // Fires once per active flip while the enemy is in Graviton Surge
      // range, regardless of which side of the flip the player ends up on
      // — the enemy itself never leaves the ground to care which way is down.
      if (enemy.groundStomp) {
        if (!enemy._groundStompFired) {
          enemy._groundStompFired = true;
          const gs = enemy.groundStomp;
          if (Math.hypot(px - ex, py - ey) <= gs.shockwaveRadius && player.invincibleTimer <= 0) {
            player.takeDamage(gs.damage, enemy.x);
            player.vy = Math.min(player.vy, gs.knockbackY);
          }
          spawnParticles(ex, enemy.y + enemy.height, '#f472b6', 16);
          if (typeof screenShake !== 'undefined') { screenShake = Math.max(screenShake, 10); screenShakeIntensity = Math.max(screenShakeIntensity, 5); }
          setHitstop(6);
        }
        continue;
      }

      // Bounce grace window (user report 2026-07-19: "still turn white and
      // frozen on the ceiling" — the bounce added below was being undone
      // one frame later. Two compounding bugs: (1) the anti-gravity force
      // and the `enemy.y <= ceilingY` re-pin ran unconditionally every
      // frame for every enemy still in range, so a bounce's downward vy=2
      // got overwritten right back to pinned-at-ceiling before it could
      // move the entity anywhere; (2) `hitStun = max(hitStun, 20)` was
      // ALSO refreshed every one of those frames, so hitStun never
      // actually counted down — the enemy sat in its hit-stun branch
      // indefinitely, which is what reads as "frozen" and, since that
      // branch only decrements flashTimer (see e.g. line ~1020's
      // `flashTimer = max(0, flashTimer - 1)`), kept it perpetually under
      // the <6 threshold that draws white. Now a bounce starts a short
      // countdown during which this loop leaves the enemy alone — gravity
      // stays flipped (still inside graviton range) but the anti-gravity
      // PUSH and the re-pin are skipped, so vx/vy from the bounce actually
      // carries it off the ceiling — and hitStun is only set once per
      // slam, not refreshed every frame, so it counts down normally.
      if (enemy.gravitonBounceTimer > 0) {
        enemy.gravitonBounceTimer--;
        continue;
      }

      enemy.vy -= 2 * GRAVITY; // cancels this frame's own +GRAVITY and replaces it with -GRAVITY
      const ceilingY = resolveCeilingY(enemy, area);
      if (enemy.y <= ceilingY) {
        // A hard hit bounces off (mirrors physics.js's wall-bounce: reverse
        // + dampen vx, plus a downward kick so it actually leaves the
        // ceiling and falls to land/take damage) instead of freezing there;
        // anything slower sticks but decays via the same 0.8 ground-friction
        // factor physics.js uses for landed knockback, so it settles
        // instead of sliding.
        enemy.y = ceilingY;
        if (Math.abs(enemy.vx) >= WALL_BOUNCE_MIN_SPEED) {
          enemy.vx = -enemy.vx * WALL_BOUNCE_MULT;
          enemy.vy = 3;
          enemy.gravitonBounceTimer = 15; // ~0.25s to actually leave the ceiling
        } else {
          enemy.vy = 0;
          enemy.vx *= 0.8;
        }
        if (!enemy.gravitonSlammed) {
          enemy.gravitonSlammed = true;
          enemy.hitStun = Math.max(enemy.hitStun || 0, 20);
          if (dealsDamage) enemy.takeDamage(1, enemy.x);
          // A kill lands here mid-air (pinned at the ceiling) — every
          // enemy class's own update() early-returns once `dead` is true
          // (`if (this.dead) { this.deathTimer++; return; }`, enemy.js),
          // which is correct for a normal ground death (the corpse just
          // fades in place, already resting on the floor) but leaves an
          // aerial death frozen wherever it died forever, since nothing
          // ever applies gravity to it again (user report 2026-07-24:
          // "sometimes they stay on the ceiling"). Snapping straight to
          // the floor on the kill frame isn't a real fall animation, but
          // it's a small, contained fix scoped to this one code path
          // rather than touching the ~9 duplicated dead-early-return sites
          // across enemy.js's classes — a real animated fall would need
          // that broader change instead.
          if (enemy.dead) {
            enemy.y = area.groundY - enemy.height;
            enemy.vx = 0; enemy.vy = 0;
            enemy.gravitonSlammed = false;
            enemy.gravitonBounceTimer = 0;
          }
        }
      }
    }
  } else {
    for (const enemy of (areaEnemies[currentAreaId] || [])) { enemy.gravitonSlammed = false; enemy.gravitonBounceTimer = 0; enemy._groundStompFired = false; }
  }

  // ── Graviton Surge: player ceiling landing ───────────────────────────────
  // player.js's own platform collision already stops the player when moving
  // up into a real platform's underside (the existing "hit head" branch),
  // but nothing previously stopped them in an open-topped room — they just
  // flew off-screen (user-reported bug 2026-07-16). This is the player-side
  // equivalent of the enemy clamp above: land them on whichever ceiling
  // resolveCeilingY() finds, and mark `grounded` so jump (already flipped
  // to push "away from the ceiling" in player.js) works again.
  if (player.gravitonActive) {
    const ceilingY = resolveCeilingY(player, getCurrentArea());
    if (player.y <= ceilingY) {
      player.y = ceilingY;
      player.vy = 0;
      player.grounded = true;
      player.coyoteTimer = COYOTE_FRAMES;
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

  // Reflected Shard Shots (Deflector Drone, expansion.md 2.3 #31) can hit
  // the player back — dodgeable, but punishes reflexive spam-firing. Only
  // player projectiles ever reach `projectiles[]` (enemy-fired shots use
  // separate arrays — see ComposedEnemy.updateProjectiles/bossProjectiles),
  // so `reflected` is the only thing gating this from being a self-damage
  // bug on every normal shot.
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    if (proj.reflected && player.invincibleTimer <= 0 && rectsOverlap(proj.getBounds(), player)) {
      player.takeDamage(proj.damage);
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#67e8f9', 6);
      SFX.playerHurt();
      projectiles.splice(i, 1);
    }
  }

  // Afterimage Strike hazards (enemy_attack_vocabulary_plan.md) — count
  // down the arm delay, then explode: damage the player if they lingered
  // in the blast radius, always show the tell (particles/shake), always
  // remove. No dodge-the-spawn window is needed since the hazard already
  // rode a real delay after the dash ended — "keep moving after" is the
  // whole point, not "react to a projectile."
  for (let i = afterimageHazards.length - 1; i >= 0; i--) {
    const h = afterimageHazards[i];
    h.timer -= (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;
    if (h.timer <= 0) {
      const pcx = player.x + player.width / 2, pcy = player.y + player.height / 2;
      if (player.invincibleTimer <= 0 && Math.hypot(pcx - h.x, pcy - h.y) <= h.radius) {
        player.takeDamage(h.damage, h.x);
        SFX.playerHurt();
      }
      spawnParticles(h.x, h.y, '#c084fc', 12);
      if (typeof screenShake !== 'undefined') { screenShake = Math.max(screenShake, 8); screenShakeIntensity = Math.max(screenShakeIntensity, 4); }
      afterimageHazards.splice(i, 1);
    }
  }

  // ── ComposedEnemy projectiles (Crystal Sentinel's shots included since
  // its 2026-07-24 ComposedEnemy migration — enemy_designer.html "ranged_projectile") ──
  ComposedEnemy.updateProjectiles(player);

  // Update enemies
  const enemies = areaEnemies[currentAreaId] || [];
  for (const enemy of enemies) {
    enemy.update(player, bounds, echoes, enemies);

    // ── Wall bounce impact VFX (2026-07-16, combo-focused: a knocked-back
    // enemy bounces hard off walls — a wall-adjacent hit opens a follow-up
    // combo window). The actual position/velocity bounce now happens inside
    // resolveEnemyPhysics (physics.js, shared by every enemy subclass —
    // replacing the detection loop that used to live here); the resolver
    // flags `wallBouncedThisFrame` and this block just plays the impact.
    if (!enemy.dead && enemy.wallBouncedThisFrame) {
      enemy.wallBouncedThisFrame = false;
      spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#f87171', 10);
      screenShake = Math.max(screenShake, 8); screenShakeIntensity = Math.max(screenShakeIntensity, 4);
      setHitstop(5);
    }

    // ── Anti-juggle breakout burst (defense verbs, enemy.js) ──────────────
    // The enemy finished its 15f charge flash mid-juggle: radial shove on
    // the player (big knockback, minimal damage) that caps infinite juggles
    // without deleting the combo system — bait it by stopping one hit short.
    if (!enemy.dead && enemy.breakoutBurstPending) {
      enemy.breakoutBurstPending = false;
      const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
      const px = player.x + player.width / 2, py = player.y + player.height / 2;
      const d = Math.hypot(px - ex, py - ey);
      if (d < 110 && player.invincibleTimer <= 0 && !player.phaseDashing) {
        const nx = d > 0 ? (px - ex) / d : 1, ny = d > 0 ? (py - ey) / d : 0;
        // Shove only — the burst's job is escape + repositioning, not damage.
        player.vx = nx * 12;
        player.vy = Math.min(-6, ny * 10);
        player.hitStunTimer = 14;
        player.grounded = false;
      }
      spawnParticles(ex, ey, '#ffffff', 16);
      screenShake = Math.max(screenShake, 12); screenShakeIntensity = Math.max(screenShakeIntensity, 6);
      setHitstop(6);
      SFX.enemyDeath(); // deep burst thump — reuse until a dedicated SFX exists
    }

    // Void Tether Lv4 Limit Break burning DoT (2dmg/s for 3s) — see the
    // Void Tether arrival block above, which sets `enemy.burning`.
    if (enemy.burning && !enemy.dead) {
      enemy.burning.timer--;
      enemy.burning.tickTimer--;
      if (enemy.burning.tickTimer <= 0) {
        enemy.burning.tickTimer = 30; // every 0.5s = 2dmg/s
        enemy.takeDamage(1, enemy.x);
        spawnParticles(enemy.x + enemy.width / 2, enemy.y, '#fb923c', 3);
      }
      if (enemy.burning.timer <= 0) enemy.burning = null;
    }

    // Player attack hits enemy — gated to once per swing (see
    // player.hitTargetsThisSwing) so an enemy that stays inside a multi-frame
    // attack hitbox at point-blank range doesn't take damage/knockback/
    // hitstop on every overlapping frame, only once per swing.
    const playerAtk = player.getAttackHitbox();
    if (playerAtk && !enemy.dead && rectsOverlap(playerAtk, enemy) && !player.hitTargetsThisSwing.has(enemy)) {
      player.hitTargetsThisSwing.add(enemy);

      // ComposedEnemy counter_stance (enemy_designer.html) — a hit landed
      // while the enemy is actively countering negates the player's damage
      // entirely and lands a counter-hit on the player instead. Still counts
      // as "swung at" (hitTargetsThisSwing above) so it doesn't retry mid-swing.
      if (enemy.isCountering && enemy.isCountering()) {
        enemy.onCountered(player);
        SFX.parry();
        continue;
      }

      // ── Defense verbs (2026-07-16 combat overhaul, enemy.js's
      // updateDefense/defense config) ──
      // Dodge i-frames: the enemy already hopped clear — the swing whiffs.
      if (enemy.dodgeIFrames > 0) {
        spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#94a3b8', 4);
        continue;
      }
      // Guard: blocks damage from the FRONT. Counterplay (must all work or
      // blocking is just annoying): heavy/charged attacks BREAK the guard
      // (stagger, no re-guard for 40f), and hits from behind bypass it
      // entirely. (Void Tether pulls also break guard — see the tether
      // arrival block.)
      if (enemy.blocking > 0) {
        const fromFront = ((player.x + player.width / 2) - (enemy.x + enemy.width / 2)) * enemy.facing > 0;
        if (fromFront && !player.heavy) {
          // Clank — no damage, small player recoil, distinct feedback.
          enemy.blocking = Math.max(enemy.blocking, 6);
          player.vx = -player.facing * 3;
          spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#cbd5e1', 8);
          screenShake = Math.max(screenShake, 3); screenShakeIntensity = Math.max(screenShakeIntensity, 2);
          setHitstop(4);
          SFX.parry(); // metallic clank — reuse until a dedicated SFX exists
          continue;
        }
        if (fromFront && player.heavy) {
          // GUARD BREAK — the charged attack smashes through: stagger and
          // a vulnerability window, then the hit resolves as normal below.
          enemy.blocking = 0;
          enemy.guardBroken = 40;
          enemy.hitStun = Math.max(enemy.hitStun, 20);
          spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#e2e8f0', 14);
          screenShake = Math.max(screenShake, 10); screenShakeIntensity = Math.max(screenShakeIntensity, 5);
          setHitstop(8);
        }
        // From behind: guard does nothing — fall through to normal damage.
      }

      const dmg = playerMeleeDamage();
      enemy.takeDamage(dmg, player.x, playerAtk.dir);
      applyStillpointLifeSteal();
      spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#f87171', player.heavy ? 10 : 6);
      player.gainFracture(); // melee hit recharges Fracture meter

      // Phase 1.8: Dash Refund on Hit — refund 50% of base dash cooldown (once per attack)
      if (!player.dashRefundedThisAttack && player.dashCooldown > 0) {
        player.dashCooldown = Math.max(0, player.dashCooldown - Math.floor(DASH_COOLDOWN * 0.5));
        player.dashRefundedThisAttack = true;
      }

      // Per-attack hitstop/shake variation (heavy = amplified)
      if (playerAtk.dir === 'down') {
        player.vy = ATK_POGO_VY;
        player.grounded = false;
        screenShake = player.heavy ? 16 : 10; screenShakeIntensity = player.heavy ? 8 : 5;
        setHitstop(player.heavy ? 12 : 7);
      } else if (playerAtk.dir === 'up') {
        screenShake = player.heavy ? 10 : 5; screenShakeIntensity = player.heavy ? 6 : 3;
        setHitstop(player.heavy ? 9 : 5);
      } else {
        screenShake = player.heavy ? 12 : 6; screenShakeIntensity = player.heavy ? 6 : 3;
        setHitstop(player.heavy ? 8 : 4);
      }

      // Extra knockback on heavy hit
      if (player.heavy) {
        const kb = player.facing * HEAVY_KNOCKBACK * 3;
        enemy.vx = kb;
        if (playerAtk.dir === 'down') enemy.vy = -6;
        if (playerAtk.dir === 'up') enemy.vy = 6;
      }

      // Kill cam slow-mo — only on the LAST living enemy in the room (per design doc:
      // "0.3x speed for 8 frames on the last enemy kill in a group"). Previously this
      // fired on every single kill at 30 frames/0.5x, which is why combat felt like it
      // lagged on almost every hit (most basic enemies die in 1-2 hits).
      if (enemy.dead) {
        SFX.enemyDeath();
        // Vitality motes (healing.js) — combat-earned healing drops
        spawnVitalityMotes(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2,
          moteCountForEnemy(enemy) + (player.heavy ? 1 : 0));
        const anyAlive = enemies.some((e) => e !== enemy && !e.dead);
        if (!anyAlive) {
          slowMoTimer = 8; slowMoSkip = 0; // ~0.3x for 8 frames, last-enemy-in-group only
          screenShake = Math.max(screenShake, 12);
          screenShakeIntensity = Math.max(screenShakeIntensity, 6);
          setHitstop(8);
        }
      } else {
        SFX.attackHit();
      }
    }

        // Projectile hits enemy
    for (let j = projectiles.length - 1; j >= 0; j--) {
      const proj = projectiles[j];
      const projBounds = proj.getBounds();
      if (!enemy.dead && rectsOverlap(projBounds, enemy)) {
        // Deflector Drone (expansion.md 2.3 #31) — a shot hitting its
        // currently-shielded side is reflected back instead of damaging it,
        // punishing reflexive spam-firing from safe range. Doesn't consume
        // the shot; it keeps flying, now able to hit the player (see the
        // reflected-projectile-vs-player check below).
        if ((enemy instanceof DeflectorDrone || enemy.reflectsProjectiles) && !proj.reflected && enemy.shieldFacesPoint(proj.x)) {
          proj.vx *= -1;
          proj.reflected = true;
          spawnParticles(proj.x + 5, proj.y + 3, '#67e8f9', 8);
          SFX.shardHit();
          continue;
        }
        // takeDamage()'s knockback direction is `this.x > sourceX ? 1 : -1`
        // — reliable for melee (sourceX is the attacker's position, always
        // outside the target's body at hit time) but not for a projectile:
        // at close range (Void Tether pulls a target adjacent before you
        // can even fire — user report 2026-07-19: "shard shot after void
        // tether, the enemy comes closer") proj.x can land INSIDE the
        // enemy's own hitbox by the frame the hit registers, and the sign
        // of that comparison becomes arbitrary — confirmed via harness: it
        // occasionally flips knockback from "away from the shot" to
        // "toward the player." A point synthesized far back along the
        // projectile's own travel direction is guaranteed outside the
        // target's body regardless of hit distance, and degrades to the
        // same direction as plain proj.x for any normal (non-point-blank) hit.
        const knockSourceX = proj.x - Math.sign(proj.vx || 1) * 200;
        // 'ranged' — was Crystal Sentinel-only (its shield takes double
        // damage from it), now passed universally so ComposedEnemy's
        // shard_shot counters (Aggro-Pull, Mote Eater — enemy_attack_
        // vocabulary_plan.md) can tell a projectile hit from a melee one.
        // Harmless for every other class: their takeDamage() only branches
        // on 'up'/'down', so 'ranged' falls into the same default/forward
        // knockback path an omitted 3rd arg already used.
        enemy.takeDamage(proj.damage, knockSourceX, 'ranged');
        spawnParticles(proj.x + 5, proj.y + 3, '#67e8f9', 6);
        projectiles.splice(j, 1);
        screenShake = 4;
        screenShakeIntensity = 2;
        setHitstop(3);
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

    // Enemy attack hits player — gated on invincibility/Phase Dash like every
    // other player-damage check (boss body/projectiles, miniboss, enemy body
    // contact below). This block was missing that gate: an enemy's attack
    // hitbox could still land during a Phase Dash even though body contact
    // couldn't, since the two checks weren't kept consistent with each other.
    const enemyAtk = enemy.getAttackHitbox();
    if (enemyAtk && rectsOverlap(enemyAtk, player) && player.invincibleTimer <= 0 && !player.phaseDashing && !tryParryDeflect(enemy)) {
      // ComposedEnemy attacks (enemy.js) can define their own damage/
      // knockback per attack (e.g. a grab-throw or a heavy dash_charge
      // that should send the player flying) instead of the flat default.
      const custom = enemy.getAttackDamageAndKnockback && enemy.getAttackDamageAndKnockback();
      if (custom) {
        player.takeDamage(custom.damage, enemy.x + enemy.width / 2, custom.knockback);
        if (custom.dotOnHit) applyPlayerDot(player, custom.dotOnHit);
      } else {
        player.takeDamage(ENEMY_DAMAGE, enemy.x + enemy.width / 2);
      }
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#c4b5fd', 4);
      // Scavenged-weapon melee hits (taser) get their own zap instead of the
      // generic hurt grunt — every other attack type keeps playerHurt().
      const hitType = (enemy._activeAttack !== null && enemy.attacks) ? enemy.attacks[enemy._activeAttack]?.type : null;
      if (hitType === 'taser' && SFX.taserZap) SFX.taserZap();
      else SFX.playerHurt();
    }

    // Enemy body contact with player — push apart every frame there's overlap
    // (regardless of invincibility) so the two boxes never sit inside each
    // other; damage/parry are still gated the same as before. EXCEPT during
    // Phase Dash: the whole point of the ability is passing through enemies
    // to appear on the other side, so skip the physical separation then too
    // — otherwise this push-apart fought the dash's velocity every frame and
    // just shoved the player back out instead of letting them through.
    // Also skip for the enemy actively being Void Tether-pulled: confirmed
    // via harness that without this, the tether's approach and this
    // push-apart fight every single frame once the two hitboxes touch (the
    // tether pulls center-to-center, so contact happens before its own
    // arrival-distance check fires) — the player got shoved backward the
    // length of the room, with the enemy in tow, before arrival could ever
    // trigger. Same fix shape as the Phase Dash case above.
    const isTetherTarget = player.tether && player.tether.targetEnemy === enemy;
    // Per-enemy pass-through immunity (2026-07-25 fix — see player.js's
    // dash-start reset for the full story): a dash whose total travel
    // (PHASE_DASH_SPEED * PHASE_DASH_DURATION) ends before the player fully
    // clears the far edge of an enemy used to result in a normal hit the
    // instant phaseDashing flipped false, even with no counter involved —
    // the opposite of "the whole point of the ability." An enemy touched
    // while phaseDashing was true stays immune here until the overlap
    // itself clears, regardless of the dash timer. Enemy-specific counters
    // (cancel_and_damage, afterimage_strike below) are untouched — both key
    // off `player.phaseDashing`/overlap directly, so they still fire on the
    // original contact exactly as before this set was added.
    const phasedThrough = player.phasedThroughEnemies && player.phasedThroughEnemies.has(enemy);
    if (!enemy.dead && rectsOverlap(player, enemy)) {
      // Afterimage Strike (enemy_attack_vocabulary_plan.md) — arm right on
      // the dash-through contact itself, the same moment/overlap this block
      // already detects for the separation skip below. Only the first
      // qualifying enemy touched per dash arms it (player._afterimageArmed
      // guards that, see player.js's dash-start reset) — the actual hazard
      // is pushed once the dash ends, in player.js, so it lands where the
      // player actually stops, not mid-dash.
      if (player.phaseDashing && !player._afterimageArmed && enemy.counters) {
        const c = enemy.counters.find((c) => c.ability === 'phase_dash' && c.effect === 'afterimage_strike');
        if (c) {
          player._afterimageArmed = true;
          player._afterimageParams = { ...COUNTER_EFFECTS.phase_dash.afterimage_strike.params, ...c };
        }
      }
      if (player.phaseDashing && player.phasedThroughEnemies) player.phasedThroughEnemies.add(enemy);

      if (!player.phaseDashing && !isTetherTarget && !phasedThrough) separateFromEnemy(player, enemy);

      if (player.invincibleTimer <= 0 && !player.phaseDashing && !phasedThrough && !tryParryDeflect(enemy)) {
        player.takeDamage(ENEMY_DAMAGE, enemy.x + enemy.width / 2);
        spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#c4b5fd', 4);
        SFX.playerHurt();
      }
    } else if (phasedThrough) {
      // Overlap cleared — release the immunity so a LATER, unrelated touch
      // (this same enemy again, a different dash entirely) deals damage normally.
      player.phasedThroughEnemies.delete(enemy);
    }
  }

  // Remove dead enemies after animation
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].dead && enemies[i].deathTimer >= 20) {
      enemies.splice(i, 1);
    }
  }

  // Player heavy attack cracks destructible walls (rubble walls in Crag of
  // the Colossus, and any future heavy-attack-only wall). A normal attack
  // does nothing — only `player.heavy === true` chips away hp. Same
  // once-per-swing dedup as the enemy/boss hit loops above, so holding the
  // hitbox against a wall across multiple frames doesn't multi-tick it.
  const wallAtk = player.getAttackHitbox();
  if (wallAtk && player.heavy) {
    for (const plat of area.platforms) {
      if (!plat.destructible || plat.hp === undefined || plat.hp <= 0) continue;
      if (player.hitTargetsThisSwing.has(plat)) continue;
      if (rectsOverlap(wallAtk, { x: plat.x, y: plat.y, width: plat.w, height: plat.h })) {
        player.hitTargetsThisSwing.add(plat);
        plat.hp--;
        spawnParticles(plat.x + plat.w / 2, plat.y + plat.h / 2, '#2dd4bf', plat.hp <= 0 ? 16 : 8);
        screenShake = Math.max(screenShake, 6);
        screenShakeIntensity = Math.max(screenShakeIntensity, 3);
        setHitstop(5);
        SFX.shardHit();
      }
    }
  }

  // === BOSS UPDATE ===
  // Gate on `boss` alone, NOT `boss && !boss.dead` — that used to mean once
  // `dead` flipped true, this whole block (including the `boss.update()`
  // call that increments `deathTimer`) stopped running on every subsequent
  // frame, so `deathTimer` got stuck at 0 forever and `deathTimer === 1`
  // (required below to trigger victory) could never become true. Confirmed
  // live: defeating the King could not end the game through this path.
  // Boss.update() already early-returns after incrementing deathTimer when
  // `this.dead`, so calling it unconditionally here is safe — same pattern
  // already used for the miniboss's equivalent block.
  if (boss) {
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

    // Player melee attack hits boss — same once-per-swing dedup as the
    // regular enemy hit loop above (see player.hitTargetsThisSwing).
    const playerAtk = player.getAttackHitbox();
    if (playerAtk && !boss.dead && rectsOverlap(playerAtk, boss) && !player.hitTargetsThisSwing.has(boss)) {
      player.hitTargetsThisSwing.add(boss);
      const dmg = playerMeleeDamage();
      boss.takeDamage(dmg, player.x, 'melee');
      applyStillpointLifeSteal();
      spawnParticles(boss.x + boss.width / 2, boss.y + boss.height / 2, '#f87171', player.heavy ? 12 : 6);
      player.gainFracture();
      SFX.bossHit();
      if (player.heavy) {
        screenShake = 14; screenShakeIntensity = 7;
        setHitstop(10);
      }
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

    // Boss projectiles hit player — per-projectile damage/knockback
    // (Shard Shot sets these explicitly) with a flat-constant fallback for
    // anything that omits them (2026-07-26 damage-plumbing fix).
    for (let j = bossProjectiles.length - 1; j >= 0; j--) {
      const bp = bossProjectiles[j];
      const bpBounds = { x: bp.x, y: bp.y, width: bp.width, height: bp.height };
      if (rectsOverlap(bpBounds, player) && player.invincibleTimer <= 0 && !player.phaseDashing) {
        if (bp.damage !== undefined) {
          player.takeDamage(bp.damage, bp.x, bp.knockback);
        } else {
          player.takeDamage(BOSS_DAMAGE);
        }
        spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#f87171', 4);
        SFX.playerHurt();
        bossProjectiles.splice(j, 1);
      }
    }

    // Boss attack hits player — per-attack damage/knockback via
    // getAttackHitbox()/getAttackDamageAndKnockback() (2026-07-26 moveset
    // rebuild), modeled 1:1 on the miniboss pattern below, falling back to
    // the flat body-contact block underneath (the "just bumped into her
    // passively" low tier) when no real attack is active.
    const bossAtk = !boss.dead ? boss.getAttackHitbox() : null;
    if (bossAtk && rectsOverlap(bossAtk, player) && player.invincibleTimer <= 0 && !player.phaseDashing) {
      const custom = boss.getAttackDamageAndKnockback && boss.getAttackDamageAndKnockback();
      if (custom) {
        player.takeDamage(custom.damage, boss.x + boss.width / 2, custom.knockback);
      } else {
        player.takeDamage(BOSS_DAMAGE);
      }
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#f87171', 4);
      SFX.playerHurt();
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
      SFX.setBossMusic(null); // final boss down — let region music (or silence, in victory state) take over
    }
  }

  // === MINIBOSS UPDATE (Colossus Core, etc.) ===
  // NOTE: gate on `miniboss` alone, NOT `miniboss && !miniboss.dead` — the
  // King's equivalent block uses that pattern and it has a real bug: once
  // `dead` flips true, the outer `!boss.dead` check fails on every
  // subsequent frame, so `boss.update()` (which increments `deathTimer`)
  // never runs again and `deathTimer === 1` can never become true — the
  // victory trigger is dead code. Confirmed live (deathTimer stays stuck at
  // 0 forever once dead). Not fixing boss.js's copy here since it's a
  // separate, bigger change to the King's win-condition flow outside this
  // task's scope — flagging it in the summary instead. My own code below
  // must not repeat it, so `miniboss.update()` always runs, and only the
  // damage-dealing collision checks are individually gated on `!miniboss.dead`.
  if (miniboss) {
    miniboss.update(player, bounds, echoes);

    // Player attack hits miniboss — pass `player.heavy` through as a 4th
    // arg so ColossusCore.takeDamage() can enforce "only heavy attacks
    // connect" (other classes simply ignore the extra argument). Whether
    // the hit actually "connects" (for life-steal/fracture-gain purposes)
    // is asked via willConnect() instead of hardcoding `player.heavy` —
    // ColossusCore defines it (only heavy connects, unchanged behavior);
    // anything without it (every ComposedEnemy miniboss) always connects.
    const playerAtk = player.getAttackHitbox();
    if (playerAtk && !miniboss.dead && rectsOverlap(playerAtk, miniboss) && !player.hitTargetsThisSwing.has(miniboss)) {
      player.hitTargetsThisSwing.add(miniboss);
      const dmg = playerMeleeDamage();
      miniboss.takeDamage(dmg, player.x, 'melee', player.heavy);
      const connected = miniboss.willConnect ? miniboss.willConnect(player.heavy) : true;
      if (connected) {
        applyStillpointLifeSteal();
        spawnParticles(miniboss.x + miniboss.width / 2, miniboss.y + miniboss.height / 2, '#fb923c', 10);
        player.gainFracture();
        screenShake = 10; screenShakeIntensity = 5;
        setHitstop(8);
      } else {
        spawnParticles(miniboss.x + miniboss.width / 2, miniboss.y + miniboss.height / 2, '#d97757', 4);
      }
    }

    // Player projectiles (Shard Shot) hit miniboss — mirrors the King's own
    // block above; minibosses previously had no ranged interaction at all,
    // so a Shard Shot silently passed through every one of them.
    for (let j = projectiles.length - 1; j >= 0; j--) {
      const proj = projectiles[j];
      const projBounds = proj.getBounds();
      if (!miniboss.dead && rectsOverlap(projBounds, miniboss)) {
        miniboss.takeDamage(proj.damage, proj.x, 'ranged');
        spawnParticles(proj.x + 5, proj.y + 3, '#67e8f9', 6);
        projectiles.splice(j, 1);
        SFX.bossHit();
      }
    }

    // Miniboss attack hits player — per-attack damage/knockback via
    // getAttackDamageAndKnockback() when the class defines it (every
    // ComposedEnemy does), falling back to the old flat constant for
    // bespoke classes that don't. Also now gated on invincibility/Phase
    // Dash like every other player-damage check in this file, including
    // the body-contact check three lines below — this block was the one
    // exception, letting a miniboss's attack hitbox land mid-dash.
    const mbAtk = !miniboss.dead ? miniboss.getAttackHitbox() : null;
    if (mbAtk && rectsOverlap(mbAtk, player) && player.invincibleTimer <= 0 && !player.phaseDashing) {
      const custom = miniboss.getAttackDamageAndKnockback && miniboss.getAttackDamageAndKnockback();
      if (custom) {
        player.takeDamage(custom.damage, miniboss.x + miniboss.width / 2, custom.knockback);
        if (custom.dotOnHit) applyPlayerDot(player, custom.dotOnHit);
      } else {
        player.takeDamage(COLOSSUS_DAMAGE);
      }
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#d97757', 4);
      SFX.playerHurt();
    }

    // Miniboss body contact with player (its charge attack is the real threat, but guard against a plain collide too)
    if (!miniboss.dead && rectsOverlap(player, miniboss) && player.invincibleTimer <= 0 && !player.phaseDashing) {
      player.takeDamage(1);
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#d97757', 4);
      SFX.playerHurt();
    }

    // Miniboss death — no victory cinematic, just persist the defeat, heal
    // the player, and grant a reward. maxHealthBonus/playerMaxHealth() is
    // the exact generic, save-persisted mechanism healing.js's max-health
    // shards already use — this used to be flagged as "out of scope," which
    // was stale the moment that system existed for another reward path.
    // Temporal Warden (`chrono_ally`, 2026-07-26) is the one documented
    // exception — his reward is a Stillpoint upgrade (+1 lifesteal per
    // hit), not +1 Max Health, per expansion.md's own per-fight reward
    // table — see stillpointLifestealBonus above for why that's a separate
    // additive bonus rather than a direct statUpgrades.stillpoint bump.
    if (miniboss.dead && miniboss.deathTimer === 1) {
      defeatedMinibosses[area.miniboss] = true;
      SFX.setBossMusic(null); // fight's over — drop back to region music even though still in the arena
      screenShake = 40;
      screenShakeIntensity = 5;
      spawnParticles(miniboss.x + miniboss.width / 2, miniboss.y + miniboss.height / 2, '#fbbf24', 24);
      spawnParticles(miniboss.x + miniboss.width / 2, miniboss.y + miniboss.height / 2, '#fb923c', 18);
      player.health = playerMaxHealth();
      const name = (miniboss.displayName || area.miniboss).toUpperCase();
      if (area.miniboss === 'chrono_ally') {
        stillpointLifestealBonus++;
        addAbilityNotification(`${name} DEFEATED — STILLPOINT LIFESTEAL +1 (${stillpointLifestealCap()}/ACTIVATION)`);
      } else {
        maxHealthBonus++;
        addAbilityNotification(`${name} DEFEATED — MAX HEALTH +1 (${playerMaxHealth()})`);
      }
      SFX.bossDeath();
      saveGame();
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }
  }

  // Check transitions — skipped during doorCooldown (see its declaration),
  // which prevents a same-tick bounce back through the door the player just
  // used when the authored landing spot overlaps the destination's own
  // return trigger.
  if (doorCooldown > 0) doorCooldown--;
  for (const trans of (doorCooldown > 0 ? [] : area.transitions)) {
    // Check ability requirement. Any `requires` value not recognized below
    // (e.g. `graviton_surge` on inert stub doors toward not-yet-built
    // regions — see Crag Warden / Event Horizon Core) is treated as an
    // always-fail gate, not a no-op. Without this, an unrecognized
    // `requires` silently passed through as unlocked and let the player
    // walk into `switchArea()` for a target that doesn't exist in AREAS,
    // crashing the game loop (uncaught exception on the next frame reading
    // properties off `undefined` — looks exactly like a freeze).
    if (trans.requires && !hasAbilityRequirement(trans.requires)) continue;

    if (rectsOverlap(
      { x: player.x, y: player.y, width: player.width, height: player.height },
      { x: trans.x, y: trans.y, width: trans.w, height: trans.h }
    )) {
      // Hollow Knight-style auto spawn (see computeDoorSpawn) when the
      // level designer left toX/toY unset — no more per-door coordinate
      // authoring required for a standard two-way door.
      const spawn = (trans.toX !== undefined && trans.toY !== undefined)
        ? { x: trans.toX, y: trans.toY }
        : computeDoorSpawn(trans.to, currentAreaId);
      switchArea(trans.to, spawn.x, spawn.y);
      break;
    }
  }

  // Check Anchor checkpoints
  const spKey = currentAreaId;
  for (const sp of area.anchors) {
    const dist = Math.abs(player.x - sp.x);
    if (dist < 40) {
      if (!anchorActivated[spKey]) {
        anchorActivated[spKey] = true;
        // Anchor rest regrows every struck-open healing crystal (healing.js)
        resetHealingCrystals();
        // Heal 1 pip on first activation — the Anchor restores you
        if (player.health < playerMaxHealth()) {
          player.health = Math.min(playerMaxHealth(), player.health + 1);
          addAbilityNotification('ANCHOR ACTIVATED — health restored');
        } else {
          addAbilityNotification('ANCHOR ACTIVATED');
        }
        spawnParticles(sp.x, sp.y - 30, '#c4b5fd', 12);
        SFX.stillpoint();
      }
      // Save checkpoint position (only write if it's actually a new checkpoint —
      // avoids hammering localStorage every frame while standing near one)
      const isNewCheckpoint = !lastAnchor || lastAnchor.areaId !== currentAreaId || lastAnchor.x !== sp.x || lastAnchor.y !== sp.y;
      lastAnchor = {
        areaId: currentAreaId,
        x: sp.x,
        y: sp.y,
      };
      if (isNewCheckpoint) saveGame();
    }
  }

  // Check ability rewards — data-driven over ABILITY_GRANTS (below) instead
  // of a hand-grown if/else chain. The old chain silently ignored any
  // ability it didn't list: graviton_surge's pickup (graviton_core_room2)
  // and void_tether granted NOTHING on touch — the root cause of "the Void
  // Tether button does nothing" (hasVoidTether was never set anywhere).
  if (area.abilityReward) {
    const ab = area.abilityReward;
    // Max-health shards (healing.js) — the max_health_upgrade_* pickups.
    // Not in ABILITY_GRANTS (they set no abilityState flag); tracked per-id
    // so a collected shard never re-grants on room re-entry.
    if (ab.id && ab.id.startsWith('max_health_upgrade') && !maxHealthShardsCollected[ab.id]) {
      const dist = Math.abs((player.x + player.width / 2) - ab.x) +
                   Math.abs((player.y + player.height / 2) - ab.y);
      if (dist < 30) {
        maxHealthShardsCollected[ab.id] = true;
        maxHealthBonus++;
        player.health = Math.min(playerMaxHealth(), player.health + 1); // the new heart arrives filled
        addAbilityNotification(`MAX HEALTH +1 (${playerMaxHealth()})`);
        spawnParticles(ab.x, ab.y, '#f9a8d4', 24);
        abilityFlash = 14;
        abilityFlashColor = '#f9a8d4';
        abilityPopups.push({ text: '♥ MAX HEALTH +1', x: ab.x, y: ab.y - 20, life: 110, color: '#f9a8d4' });
        SFX.abilityPickup();
        saveGame();
      }
    }
    const grant = ABILITY_GRANTS[ab.id];
    if (grant && !abilityState[grant.flag]) {
      const dist = Math.abs((player.x + player.width / 2) - ab.x) +
                   Math.abs((player.y + player.height / 2) - ab.y);
      if (dist < 30) {
        abilityState[grant.flag] = true;
        addAbilityNotification(grant.notification);
        spawnParticles(ab.x, ab.y, grant.color, grant.particles || 20);
        abilityFlash = grant.flash || 12;
        abilityFlashColor = grant.color;
        abilityPopups.push({ text: `★ ${grant.popup}`, x: ab.x, y: ab.y - 20, life: grant.popupLife || 90, color: grant.color });
        SFX.abilityPickup();
        saveGame();
      }
    }
  }

  // Check Fracture Pip pickups (roadmap 1.9 — raise player.fractureMax, up to FRACTURE_ABS_MAX)
  if (area.fracturePipRewards) {
    for (const fp of area.fracturePipRewards) {
      if (fracturePipsFound[fp.id]) continue;
      const dist = Math.abs((player.x + player.width / 2) - fp.x) +
                   Math.abs((player.y + player.height / 2) - fp.y);
      if (dist < 30) {
        fracturePipsFound[fp.id] = true;
        player.gainFractureMax();
        SFX.abilityPickup();
        spawnParticles(fp.x, fp.y, '#c4b5fd', 18);
        abilityFlash = 10;
        abilityFlashColor = '#c4b5fd';
        abilityPopups.push({ text: `♦ FRACTURE PIP (${player.fractureMax}/4)`, x: fp.x, y: fp.y - 20, life: 90, color: '#c4b5fd' });
        addAbilityNotification(`Fracture Pip found — max ${player.fractureMax}/4`);
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

  // Lore pips (roadmap 1.9 — the new non-text pickup flow). Independent of
  // LORE_ENABLED/loreOverlay above (the old text-popup path stays dead but
  // intact per CLAUDE.md — not flipped here, this is a separate path).
  // Placeholder visual effect (a brief screen-space burst) plays on pickup;
  // swap in real per-fragment cutscenes once roadmap 1.10 decides content.
  // Each pip also banks toward statUpgrades — see spendableLorePips()/
  // tryUpgrade() below.
  if (area.loreFragments) {
    for (const lf of area.loreFragments) {
      if (collectedLore[lf.id]) continue;
      const dist = Math.abs((player.x + player.width / 2) - lf.x) +
                   Math.abs((player.y + player.height / 2) - lf.y);
      if (dist < 30) {
        collectedLore[lf.id] = true;
        SFX.lorePickup();
        spawnParticles(lf.x, lf.y, '#fbbf24', 24);
        lorePipEffect = { timer: 90, maxTimer: 90 };
        addAbilityNotification('Lore Pip found — check Inventory to spend');
        saveGame();
      }
    }
  }

  // Update lore overlay timer
  if (loreOverlay) {
    loreOverlay.timer--;
    if (loreOverlay.timer <= 0) loreOverlay = null;
  }

  // Update lore pip placeholder effect timer
  if (lorePipEffect) {
    lorePipEffect.timer--;
    if (lorePipEffect.timer <= 0) lorePipEffect = null;
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

// ── HUD layout data (2026-07-16) ────────────────────────────────────────
// Positions/sizes/visibility of every HUD element, extracted from the
// hardcoded numbers the draw functions below used to carry inline, so
// editor/hud_editor.html can move/toggle them visually. `anchor` says which
// screen edge x/y are measured from — the draw code resolves it via
// hudResolve(), so layouts survive any canvas size:
//   'top-left'      x from left,  y from top
//   'top-center'    x offset from W/2 (usually 0), y from top
//   'bottom-left'   x from left,  y from BOTTOM (positive = up)
//   'bottom-right'  x from RIGHT, y from BOTTOM
// Saved overrides (the editor's 💾) load from localStorage below.
const HUD_LAYOUT_KEY = 'stillpoint_hud_layout_v1';
const HUD_LAYOUT = {
  healthHearts:  { anchor: 'top-left',     x: 16, y: 14, size: 16, gap: 3,  visible: true },
  areaLabel:     { anchor: 'top-left',     x: 16, y: 42,                    visible: true },
  bossBar:       { anchor: 'top-center',   x: 0,  y: 18, w: 320, h: 12,    visible: true },
  limitBreakBar: { anchor: 'top-center',   x: 0,  y: 40, w: 160, h: 8,     visible: true },
  controlsHint:  { anchor: 'bottom-right', x: 16, y: 12,                    visible: true },
  fracturePips:  { anchor: 'bottom-left',  x: 14, y: 58, gap: 22,          visible: true },
  abilityCooldowns: { anchor: 'bottom-center', x: 0, y: 34, size: 20, gap: 6, visible: true },
};

(function applyHudLayoutOverrides() {
  try {
    const raw = localStorage.getItem(HUD_LAYOUT_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    for (const key in saved) {
      if (HUD_LAYOUT[key]) Object.assign(HUD_LAYOUT[key], saved[key]);
    }
  } catch (e) { /* private browsing / bad JSON — use defaults */ }
})();

// Resolve a layout entry to absolute screen coordinates for the current
// canvas size. Returns {x, y} of the element's reference point.
function hudResolve(el) {
  switch (el.anchor) {
    case 'top-center':    return { x: W / 2 + el.x, y: el.y };
    case 'bottom-left':   return { x: el.x, y: H - el.y };
    case 'bottom-right':  return { x: W - el.x, y: H - el.y };
    case 'bottom-center': return { x: W / 2 + el.x, y: H - el.y };
    default:              return { x: el.x, y: el.y }; // top-left
  }
}

// ── HUD rendering ───────────────────────────────────────────────────────

function drawHUD(ctx) {
  if (!hudVisible || !player) return;

  if (HUD_LAYOUT.healthHearts.visible) drawHealthHearts(ctx);
  if (HUD_LAYOUT.areaLabel.visible) drawAreaLabel(ctx);
  if (HUD_LAYOUT.bossBar.visible && boss && !boss.dead && gameState === 'playing') {
    drawBossHealthBar(ctx);
  }
  if (currentAreaId === 'tutorial_area') {
    drawTutorialBanner(ctx);
  }
  if (HUD_LAYOUT.controlsHint.visible) drawControlsHint(ctx);
  if (HUD_LAYOUT.limitBreakBar.visible) drawLimitBreakBar(ctx);
  if (HUD_LAYOUT.abilityCooldowns.visible) drawAbilityCooldownHUD(ctx);
}

// Fixed-position ability cooldown strip (bottom-center, Dead Cells-style) —
// 2026-07-27, replacing Phase Dash/Shard Shot/Parry's old world-space rings
// (drawDashCooldownRing below), which nested concentrically under the
// player's feet and turned into an unreadable bullseye once 2+ were
// cooling at once. Unlike a permanent skill bar, a slot only EXISTS while
// that ability is actually cooling: nothing is drawn when everything's
// ready, so a short cooldown just flashes briefly instead of sitting on
// screen the whole game — same "quiet, only when it matters" rule the old
// rings followed, just legible with more than one ability going at once.
// Base Dash keeps its own single ring (still drawn by drawDashCooldownRing)
// since it's core movement everyone has from frame one, not a "special."
function drawAbilityCooldownHUD(ctx) {
  const slots = [];
  if (abilityState.hasPhaseDash && abilityState.phaseDashCooldown > 0) {
    slots.push({ label: 'PD', frac: 1 - abilityState.phaseDashCooldown / PHASE_DASH_COOLDOWN, color: '167, 139, 250' });
  }
  if (abilityState.hasShardShot && abilityState.shardShotCooldown > 0) {
    slots.push({ label: 'SS', frac: 1 - abilityState.shardShotCooldown / SHARD_SHOT_COOLDOWN, color: '45, 212, 191' });
  }
  if (abilityState.hasParry && abilityState.parryCooldown > 0) {
    slots.push({ label: 'PA', frac: 1 - abilityState.parryCooldown / PARRY_COOLDOWN, color: '251, 191, 36' });
  }
  if (slots.length === 0) return;

  const lay = HUD_LAYOUT.abilityCooldowns;
  const pos = hudResolve(lay);
  const r = lay.size / 2;
  const totalW = slots.length * lay.size + (slots.length - 1) * lay.gap;
  let cx = pos.x - totalW / 2 + r;
  const cy = pos.y - r;

  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(lay.size * 0.4)}px "Courier New", monospace`;
  for (const s of slots) {
    ctx.fillStyle = 'rgba(10, 10, 20, 0.7)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(${s.color}, 0.9)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, -Math.PI / 2, -Math.PI / 2 + s.frac * Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(${s.color}, 0.9)`;
    ctx.fillText(s.label, cx, cy + lay.size * 0.14);

    cx += lay.size + lay.gap;
  }
  ctx.textAlign = 'left';
}

// Limit Break (Lv4) 6s countdown bar — "To add" list in Enemy_Design.pdf.
// Flat blue to match the player's aura; no per-ability art yet.
function drawLimitBreakBar(ctx) {
  if (!limitBreak.active) return;
  const lay = HUD_LAYOUT.limitBreakBar;
  const pos = hudResolve(lay);
  const barW = lay.w, barH = lay.h;
  const x = pos.x - barW / 2, y = pos.y;
  const frac = limitBreak.timer / LIMIT_BREAK_DURATION;
  ctx.fillStyle = 'rgba(10, 20, 40, 0.6)';
  ctx.fillRect(x, y, barW, barH);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(x, y, barW * frac, barH);
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, barW, barH);
  ctx.textAlign = 'center';
  ctx.font = '9px "Courier New", monospace';
  ctx.fillStyle = '#93c5fd';
  ctx.fillText('LIMIT BREAK', pos.x, y - 3);
  ctx.textAlign = 'left';
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
  const lay = HUD_LAYOUT.healthHearts;
  const pos = hudResolve(lay);
  const size = lay.size;
  const gap = lay.gap;
  const startX = pos.x;
  const startY = pos.y;

  ctx.font = `${size}px "Courier New", monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Colour shifts as health drops, mirroring the old CSS health-bar behavior.
  const heartColor = player.health <= 2 ? '#f87171' : player.health <= 4 ? '#fbbf24' : '#c4b5fd';

  for (let i = 0; i < playerMaxHealth(); i++) {
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
  const pos = hudResolve(HUD_LAYOUT.areaLabel);
  ctx.font = '11px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#6a6a8e';
  ctx.fillText(area.name, pos.x, pos.y);

  const nameWidth = ctx.measureText(area.name).width;
  ctx.fillStyle = lastAnchor ? '#c4b5fd' : '#4a4a6e';
  ctx.fillText(lastAnchor ? '\u25cf' : '\u25cb', pos.x + nameWidth + 8, pos.y);
}

// Top-center: boss health bar (drawn only while a boss is alive & active).
function drawBossHealthBar(ctx) {
  const lay = HUD_LAYOUT.bossBar;
  const pos = hudResolve(lay);
  const barW = lay.w;
  const barH = lay.h;
  const x = pos.x - barW / 2;
  const y = pos.y;
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
  ctx.fillText('THE FRACTURED KING', pos.x, y + barH + 15);
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

  const lines = ['MOVE \u2190\u2192  JUMP SPACE  DASH X  ATTACK Z', 'SHARD: V + R(up)/T(down)  MAP M  PAUSE ESC'];
  const pos = hudResolve(HUD_LAYOUT.controlsHint);
  ctx.globalAlpha = alpha;
  ctx.font = '10px "Courier New", monospace';
  ctx.fillStyle = '#2a2a3e';
  ctx.textAlign = 'right';
  let ly = pos.y - (lines.length - 1) * 13;
  for (const line of lines) {
    ctx.fillText(line, pos.x, ly);
    ly += 13;
  }
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}




// Small recharge ring around the player's feet for base Dash only (world
// space, drawn while the camera transform is still active) — Phase Dash,
// Shard Shot, and Parry moved to the fixed-position bottom-center HUD strip
// (drawAbilityCooldownHUD above, 2026-07-27) so multiple cooldowns overlap
// legibly instead of nesting into a bullseye. Dash stays here: it's core
// movement from frame one, not a "special," and there's only ever the one
// ring so nesting was never the problem for it.
function drawDashCooldownRing(ctx) {
  if (!player) return;
  const cx = player.x + player.width / 2;
  const cy = player.y + player.height + 3;

  const rings = [];
  if (player.dashCooldown > 0) {
    rings.push({ frac: 1 - player.dashCooldown / DASH_COOLDOWN, color: '196, 181, 253' }); // violet
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

// Shared menu background (particles, grid, title glow, footer)
function drawMenuBackground() {
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

  return titlePulse;
}

// ── Main Menu: Play, Controls, Settings ──────────────────────────────────
function drawMainMenu() {
  const titlePulse = drawMenuBackground();

  ctx.textAlign = 'center';

  // Title
  ctx.fillStyle = `rgba(196, 181, 253, ${titlePulse})`;
  ctx.font = 'bold 64px "Courier New", monospace';
  ctx.fillText('STILLPOINT', W / 2, H / 2 - 80);

  // Subtitle
  ctx.fillStyle = `rgba(103, 232, 249, ${titlePulse * 0.7})`;
  ctx.font = '14px "Courier New", monospace';
  ctx.fillText('A world fractured in time', W / 2, H / 2 - 55);

  // Menu items
  const items = ['Play', 'Controls', 'Settings'];
  const itemY = H / 2 - 10;
  const itemHeight = 40;
  const itemWidth = 220;
  const itemX = W / 2 - itemWidth / 2;

  for (let i = 0; i < items.length; i++) {
    const y = itemY + i * (itemHeight + 6);
    const isSelected = i === menuSelection;

    // Item background
    ctx.fillStyle = isSelected
      ? 'rgba(196, 181, 253, 0.15)'
      : 'rgba(30, 30, 50, 0.3)';
    ctx.fillRect(itemX, y, itemWidth, itemHeight);

    // Item border
    ctx.strokeStyle = isSelected
      ? 'rgba(196, 181, 253, 0.8)'
      : 'rgba(58, 58, 94, 0.3)';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeRect(itemX, y, itemWidth, itemHeight);

    // Item text
    ctx.fillStyle = isSelected ? '#c4b5fd' : '#6a6a8e';
    ctx.font = `${isSelected ? 'bold ' : ''}16px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(items[i], W / 2, y + 26);

    // Selection arrow
    if (isSelected) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#c4b5fd';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('▶', itemX - 4, y + 26);
    }
  }

  // Hint
  const promptAlpha = Math.sin(frameCount * 0.05) * 0.4 + 0.6;
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(203, 245, 255, ${promptAlpha})`;
  ctx.font = '12px "Courier New", monospace';
  ctx.fillText('↑↓ / WS : Select   |   Space / Enter : Choose', W / 2, itemY + items.length * (itemHeight + 6) + 16);

  // Footer
  ctx.fillStyle = 'rgba(58, 58, 94, 0.5)';
  ctx.font = '10px "Courier New", monospace';
  ctx.fillText('Stillpoint — Phase 2', W / 2, H - 20);
  ctx.textAlign = 'left';
}

// ── Play Menu: Save Slot Selection ────────────────────────────────────────
function drawPlayMenu() {
  const titlePulse = drawMenuBackground();

  ctx.textAlign = 'center';

  // Screen title
  ctx.fillStyle = `rgba(196, 181, 253, ${titlePulse})`;
  ctx.font = 'bold 36px "Courier New", monospace';
  ctx.fillText('SELECT SAVE', W / 2, H / 2 - 90);

  // Save slot selection
  const slotY = H / 2 - 40;
  const slotHeight = 38;
  const slotWidth = 280;
  const slotX = W / 2 - slotWidth / 2;

  for (let i = 0; i < SAVE_SLOTS; i++) {
    const y = slotY + i * (slotHeight + 8);
    const isSelected = i === menuSelectionPlay;
    const info = getSlotInfo(i);

    // Slot background
    ctx.fillStyle = isSelected
      ? 'rgba(196, 181, 253, 0.15)'
      : 'rgba(30, 30, 50, 0.5)';
    ctx.fillRect(slotX, y, slotWidth, slotHeight);

    // Slot border
    ctx.strokeStyle = isSelected
      ? 'rgba(196, 181, 253, 0.8)'
      : 'rgba(58, 58, 94, 0.3)';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeRect(slotX, y, slotWidth, slotHeight);

    // Slot number + label
    ctx.textAlign = 'left';
    ctx.fillStyle = isSelected ? '#c4b5fd' : '#6a6a8e';
    ctx.font = `${isSelected ? 'bold ' : ''}13px "Courier New", monospace`;
    ctx.fillText(`Slot ${i + 1}`, slotX + 12, y + 23);

    // Slot info
    ctx.textAlign = 'right';
    if (info.empty) {
      ctx.fillStyle = isSelected ? 'rgba(106, 106, 142, 0.8)' : 'rgba(58, 58, 94, 0.6)';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText('[ Empty ]', slotX + slotWidth - 12, y + 23);
    } else {
      ctx.fillStyle = isSelected ? '#86efac' : '#4ade80';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText(getAreaDisplayName(info.areaId), slotX + slotWidth - 12, y + 23);
    }

    // Selection arrow
    if (isSelected) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#c4b5fd';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('▶', slotX - 4, y + 24);
    }
  }

  // Prompt hints
  const promptAlpha = Math.sin(frameCount * 0.05) * 0.4 + 0.6;
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(203, 245, 255, ${promptAlpha})`;
  ctx.font = '13px "Courier New", monospace';
  ctx.fillText('↑↓ / WS : Select Slot   |   Space / Enter : Load / New Game', W / 2, slotY + SAVE_SLOTS * (slotHeight + 8) + 16);
  ctx.fillStyle = 'rgba(106, 106, 142, 0.7)';
  ctx.font = '11px "Courier New", monospace';
  ctx.fillText('N : New Game   |   D : Delete Save   |   ESC : Back', W / 2, slotY + SAVE_SLOTS * (slotHeight + 8) + 34);

  // Footer
  ctx.fillStyle = 'rgba(58, 58, 94, 0.5)';
  ctx.font = '10px "Courier New", monospace';
  ctx.fillText('Stillpoint — Phase 2', W / 2, H - 20);
  ctx.textAlign = 'left';
}

// ── Confirm Delete Overlay ──────────────────────────────────────────────
function drawConfirmDeleteScreen() {
  // Draw the play screen underneath
  drawPlayMenu();

  // Dim overlay
  ctx.fillStyle = 'rgba(10, 10, 20, 0.7)';
  ctx.fillRect(0, 0, W, H);

  // Confirmation box
  const boxW = 340;
  const boxH = 100;
  const boxX = W / 2 - boxW / 2;
  const boxY = H / 2 - boxH / 2;

  ctx.fillStyle = 'rgba(15, 15, 30, 0.95)';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = 'rgba(248, 113, 113, 0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f87171';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillText('DELETE SAVE?', W / 2, boxY + 32);

  ctx.fillStyle = '#6a6a8e';
  ctx.font = '13px "Courier New", monospace';
  ctx.fillText(`Slot ${menuSelectionPlay + 1}`, W / 2, boxY + 54);

  const promptAlpha = Math.sin(frameCount * 0.06) * 0.4 + 0.6;
  ctx.fillStyle = `rgba(248, 113, 113, ${promptAlpha})`;
  ctx.font = '13px "Courier New", monospace';
  ctx.fillText('D : Confirm Delete', W / 2, boxY + 82);
  ctx.fillStyle = `rgba(106, 106, 142, ${promptAlpha})`;
  ctx.fillText('ESC : Cancel', W / 2, boxY + 96);

  ctx.textAlign = 'left';
}

// ── Controls Screen (remappable — roadmap 2026-07-14) ──────────────────────
function drawControlsScreen() {
  const titlePulse = drawMenuBackground();

  ctx.textAlign = 'center';

  // Screen title
  ctx.fillStyle = `rgba(196, 181, 253, ${titlePulse})`;
  ctx.font = 'bold 36px "Courier New", monospace';
  ctx.fillText('CONTROLS', W / 2, 50);

  const rowCount = REMAPPABLE_ACTIONS.length + 1; // +1 for Reset row
  const panelX = W / 2 - 220;
  const panelY = 68;
  const panelW = 440;
  const lineH = 21;
  const panelH = rowCount * lineH + 20;

  ctx.fillStyle = 'rgba(15, 15, 30, 0.85)';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = 'rgba(196, 181, 253, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.textAlign = 'left';
  const labelW = 260;
  let cy = panelY + 24;

  for (let i = 0; i < REMAPPABLE_ACTIONS.length; i++) {
    const action = REMAPPABLE_ACTIONS[i];
    const selected = controlsMenuIndex === i;
    const listening = selected && rebindingAction === action;

    if (selected) {
      ctx.fillStyle = 'rgba(196, 181, 253, 0.12)';
      ctx.fillRect(panelX + 8, cy - 15, panelW - 16, lineH);
    }

    ctx.fillStyle = selected ? '#e9d5ff' : '#c4b5fd';
    ctx.font = (selected ? 'bold ' : '') + '13px "Courier New", monospace';
    ctx.fillText(ACTION_LABELS[action] || action, panelX + 20, cy);

    if (listening) {
      const pulse = Math.sin(frameCount * 0.15) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 214, 102, ${pulse})`;
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.fillText('PRESS A KEY…', panelX + 20 + labelW, cy);
    } else {
      ctx.fillStyle = '#67e8f9';
      ctx.font = '13px "Courier New", monospace';
      ctx.fillText(formatKeyLabel(getBinding(action)), panelX + 20 + labelW, cy);
    }

    cy += lineH;
  }

  // Reset to Defaults row
  const resetSelected = controlsMenuIndex === REMAPPABLE_ACTIONS.length;
  if (resetSelected) {
    ctx.fillStyle = 'rgba(248, 113, 113, 0.12)';
    ctx.fillRect(panelX + 8, cy - 15, panelW - 16, lineH);
  }
  ctx.fillStyle = resetSelected ? '#fca5a5' : '#f87171';
  ctx.font = (resetSelected ? 'bold ' : '') + '13px "Courier New", monospace';
  ctx.fillText('Reset to Defaults', panelX + 20, cy);

  // Hint
  const promptAlpha = Math.sin(frameCount * 0.05) * 0.4 + 0.6;
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(203, 245, 255, ${promptAlpha})`;
  ctx.font = '12px "Courier New", monospace';
  ctx.fillText(
    rebindingAction
      ? 'Press any key to bind — ESC to cancel'
      : '↑↓ / WS : Select   |   Space / Enter : Rebind   |   ESC : Back',
    W / 2, panelY + panelH + 24
  );

  // Footer
  ctx.fillStyle = 'rgba(58, 58, 94, 0.5)';
  ctx.font = '10px "Courier New", monospace';
  ctx.fillText('Stillpoint — Phase 2', W / 2, H - 20);
  ctx.textAlign = 'left';
}

// ── Settings Screen ───────────────────────────────────────────────────────
function drawSettingsScreen() {
  const titlePulse = drawMenuBackground();

  ctx.textAlign = 'center';

  // Screen title
  ctx.fillStyle = `rgba(196, 181, 253, ${titlePulse})`;
  ctx.font = 'bold 36px "Courier New", monospace';
  ctx.fillText('SETTINGS', W / 2, 60);

  // Settings panel
  const panelX = W / 2 - 200;
  const panelY = 80;
  const panelW = 400;
  const itemH = 50;

  ctx.fillStyle = 'rgba(15, 15, 30, 0.8)';
  ctx.fillRect(panelX, panelY, panelW, 2 * itemH + 20);
  ctx.strokeStyle = 'rgba(196, 181, 253, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelW, 2 * itemH + 20);

  const settings = [
    { label: 'Screen Shake', value: screenShakeEnabled },
    { label: 'Hitstop', value: hitstopEnabled },
  ];

  ctx.textAlign = 'left';
  for (let i = 0; i < settings.length; i++) {
    const y = panelY + 10 + i * itemH;
    const isSelected = i === menuSelectionSettings;

    // Highlight
    if (isSelected) {
      ctx.fillStyle = 'rgba(196, 181, 253, 0.1)';
      ctx.fillRect(panelX + 2, y, panelW - 4, itemH - 4);
    }

    // Label
    ctx.fillStyle = isSelected ? '#c4b5fd' : '#6a6a8e';
    ctx.font = `${isSelected ? 'bold ' : ''}16px "Courier New", monospace`;
    ctx.fillText(settings[i].label, panelX + 20, y + 30);

    // Toggle state
    ctx.textAlign = 'right';
    ctx.fillStyle = settings[i].value ? '#4ade80' : '#ef4444';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText(settings[i].value ? '[ ON ]' : '[ OFF ]', panelX + panelW - 20, y + 30);

    // Selection arrow
    if (isSelected) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#c4b5fd';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('▶', panelX - 4, y + 26);
    }
  }

  // Hint
  const promptAlpha = Math.sin(frameCount * 0.05) * 0.4 + 0.6;
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(203, 245, 255, ${promptAlpha})`;
  ctx.font = '13px "Courier New", monospace';
  ctx.fillText('↑↓ / WS : Select   |   Space / Enter : Toggle', W / 2, panelY + 2 * itemH + 50);
  ctx.fillStyle = 'rgba(106, 106, 142, 0.7)';
  ctx.font = '11px "Courier New", monospace';
  ctx.fillText('ESC : Back to Menu', W / 2, panelY + 2 * itemH + 68);

  // Footer
  ctx.fillStyle = 'rgba(58, 58, 94, 0.5)';
  ctx.font = '10px "Courier New", monospace';
  ctx.fillText('Stillpoint — Phase 2', W / 2, H - 20);
  ctx.textAlign = 'left';
}

// Draw the start menu — routes to the active sub-screen
function drawMenu() {
  switch (menuScreen) {
    case 'main': drawMainMenu(); break;
    case 'play': drawPlayMenu(); break;
    case 'confirm_delete': drawConfirmDeleteScreen(); break;
    case 'controls': drawControlsScreen(); break;
    case 'settings': drawSettingsScreen(); break;
    default: drawMainMenu(); break;
  }
}

// ── Main draw function ──────────────────────────────────────────────────

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

  // Screen shake (respect accessibility toggle)
  if (screenShakeEnabled && screenShake > 0) {
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

  // Region-wide ambient decoration (Task 4) — drawn under the platforms so
  // it reads as background depth. No-op for regions without a REGION_STYLES
  // entry (origin, crag, dev rooms).
  decorateRoomForRegion(ctx, area, area.region);

  // Platforms
  for (const plat of area.platforms) {
    drawPlatform(ctx, plat, area.platforms);
    decoratePlatformForRegion(ctx, plat, area.region);
  }

  // Transitions — cave-mouth doors (Task 4), tinted per-room, shaped by
  // door kind (portal/shortcut-arrow/arch). See drawDoor().
  for (const trans of area.transitions) {
    const blocked = !!trans.requires && !hasAbilityRequirement(trans.requires);
    drawDoor(ctx, trans, area, blocked);

    // Arrow indicator (kept from the original flat-door rendering — the
    // arch/portal shapes above don't imply direction on their own).
    if (!blocked) {
      const pulse = Math.sin(frameCount * 0.03) * 0.15 + 0.15;
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

  // Anchors (checkpoints)
  for (const sp of area.anchors) {
    const activated = anchorActivated[currentAreaId] || false;
    drawAnchor(ctx, sp, area, activated);
  }

  // Ability rewards
  if (area.abilityReward) {
    drawAbilityReward(ctx, area.abilityReward);
  }

  // Fracture Pip pickups (roadmap 1.9)
  if (area.fracturePipRewards) {
    for (const fp of area.fracturePipRewards) {
      if (!fracturePipsFound[fp.id]) drawFracturePip(ctx, fp);
    }
  }

  // Lore pips (sparse environmental storytelling pickups — roadmap 1.9's
  // non-text flow, always visible; independent of LORE_ENABLED's old
  // text-popup path, see the pickup-check block above)
  if (area.loreFragments) {
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

  // Debug overlay (F3) — per-enemy AI status label, world-space so it
  // tracks the sprite through the camera transform like everything else here.
  if (DEBUG_MODE) {
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      ctx.save();
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      const label = debugLabelForEnemy(enemy);
      const labelX = enemy.x + enemy.width / 2;
      const labelY = enemy.y - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(labelX - textWidth / 2 - 3, labelY - 10, textWidth + 6, 13);
      ctx.fillStyle = '#7dffb3';
      ctx.fillText(label, labelX, labelY);
      ctx.restore();
    }
  }

  // Void Tether target telegraph — a faint ring on the enemy that WOULD be
  // pulled if R were pressed right now (only while the ability is held,
  // off cooldown, and not already mid-pull). Makes the facing auto-aim
  // legible without HUD chrome, per the in-world-feedback design rule.
  if (abilityState.hasVoidTether && abilityState.voidTetherCooldown <= 0 && !player.tether) {
    const rawTetherTelegraph = abilityLevel('void_tether');
    const range = VOID_TETHER_RANGE_BASE * (oldTier('void_tether') >= 1 ? 1.3 : (rawTetherTelegraph >= 1 ? 1.15 : 1));
    const tgt = findVoidTetherTarget(player, range);
    if (tgt) {
      const pulse = Math.sin(frameCount * 0.15) * 0.15;
      ctx.strokeStyle = `rgba(52, 211, 153, ${0.35 + pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2, Math.max(tgt.width, tgt.height) * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  // Void Tether beam — the actual pull had NO visual while active (user
  // report 2026-07-19: "please make my void tether visible"); the ring
  // above is only the pre-cast preview and disappears the instant
  // player.tether is set. Modeled on the Child's tetherBeam convention
  // (companion.js) — a glowing line from the player to whatever's being
  // pulled, plus a small burst at the target end.
  // Style-only ANIM_DEFS bridge (2026-07-19) — the beam's two endpoints
  // (bx,by,tx,ty) are ALWAYS computed live here regardless of authoring,
  // since the target is only known in this loop; only color/lineWidth come
  // from 'void_tether_beam' when it exists. See animdata.js's FRAME SHAPE
  // comment for why this doesn't use the entity/Animator.draw() model every
  // other dissected animation in this game uses.
  if (player.tether) {
    const bx = player.x + player.width / 2, by = player.y + player.height / 2;
    let tx, ty;
    if (player.tether.targetEnemy) { tx = player.tether.targetEnemy.x + player.tether.targetEnemy.width / 2; ty = player.tether.targetEnemy.y + player.tether.targetEnemy.height / 2; }
    else { tx = player.tether.targetPoint.x + player.width / 2; ty = player.tether.targetPoint.y + player.height / 2; }
    const pulse = 0.7 + Math.sin(frameCount * 0.6) * 0.3;
    const styleDef = ANIM_DEFS['void_tether_beam'];
    let color, lineWidth;
    if (styleDef) {
      tetherBeamAnimator.play('void_tether_beam');
      tetherBeamAnimator.update();
      const styleFrame = tetherBeamAnimator.currentFrame();
      color = (styleFrame && styleFrame.color) || `rgba(52, 211, 153, ${0.8 * pulse})`;
      lineWidth = (styleFrame && styleFrame.lineWidth) ?? 2.5;
    } else {
      color = `rgba(52, 211, 153, ${0.8 * pulse})`;
      lineWidth = 2.5;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = `rgba(52, 211, 153, ${0.6 * pulse})`;
    ctx.beginPath();
    ctx.arc(tx, ty, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Echoes
  for (const echo of echoes) {
    echo.draw(ctx);
  }
  if (standEcho) standEcho.draw(ctx); // Phase Dash Lv4 Stand

  // Projectiles
  for (const proj of projectiles) {
    proj.draw(ctx);
  }

  // Afterimage Strike hazards — a growing/pulsing telegraph ring so the
  // "delayed explosive drop" reads as a real tell, not an ambush (see
  // update() above for the arm/explode logic).
  for (const h of afterimageHazards) {
    const frac = 1 - Math.max(0, h.timer) / (h.armDelay || 45);
    ctx.strokeStyle = `rgba(192, 132, 252, ${0.4 + 0.4 * frac})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.radius * (0.3 + 0.7 * frac), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Healing pickups (healing.js) — strike-open crystals + drifting motes
  drawHealingCrystals(ctx, area, frameCount);
  drawVitalityMotes(ctx);

  // The Child (companion.js) — drawn just before the player so she reads
  // as slightly behind them.
  if (child && companionState.active) child.draw(ctx);

  // Player
  player.draw(ctx);
  drawDashCooldownRing(ctx);

  // Boss
  if (boss) {
    boss.draw(ctx);
    boss.drawTelegraphs(ctx);
    drawBossProjectiles(ctx, bossProjectiles);
  }

  // Miniboss
  if (miniboss) {
    miniboss.draw(ctx);
  }

  ComposedEnemy.drawProjectiles(ctx);

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
  // Shown whenever the player has found at least one Fracture Pip, even
  // before Stillpoint itself is unlocked — otherwise a pip found early
  // (roadmap 1.9: The Fracture/The Vault) raises fractureMax with no visible
  // confirmation on the HUD at all (fixed 2026-07-14).
  if (player.fractureMax > 0 && HUD_LAYOUT.fracturePips.visible) {
    const fpLay = HUD_LAYOUT.fracturePips;
    const fpPos = hudResolve(fpLay);
    ctx.font = '9px "Courier New", monospace';
    ctx.fillStyle = 'rgba(103, 232, 249, 0.45)';
    ctx.fillText('FRACTURE', fpPos.x, fpPos.y);
    for (let i = 0; i < player.fractureMax; i++) {
      const px = fpPos.x + i * fpLay.gap;
      const py = fpPos.y + 10;
      const filled = i < player.fractureMeter;
      const isLastDraining = filled && i === player.fractureMeter - 1 && player.stillpointActive;
      ctx.save();
      ctx.translate(px + 7, py + 7);
      ctx.rotate(Math.PI / 4);
      if (filled) {
        const alpha = isLastDraining ? (player.stillpointTimer / Math.max(1, player.stillpointDuration)) * 0.9 + 0.1 : 1;
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
  // Suppressed during cutscenes (letterbox + text own the screen edges).
  if (gameState !== 'cutscene') drawHUD(ctx);

  // Cutscene letterbox/text/skip overlay (cutscene.js)
  if (gameState === 'cutscene') drawCutsceneOverlay(ctx);

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
    ctx.fillText('TIME COLLAPSED', W / 2, H / 2 - 80);

    // Menu items
    const gameOverItems = [
      { label: 'R  Respawn', action: () => respawnPlayer() },
      { label: 'ESC  Quit to Menu', action: () => { init(); } },
    ];

    const itemGap = 28;
    let iy = H / 2 - 20;
    for (let i = 0; i < gameOverItems.length; i++) {
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = '#e0d7ff';
      ctx.fillText(gameOverItems[i].label, W / 2, iy);
      iy += itemGap;
    }

    // Controls reminder
    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = '#3a3a5e';
    ctx.fillText('← → / A D: Move | ↑ / Space: Jump | X: Dash', W / 2, iy + 10);
    ctx.fillText('Z / J: Attack', W / 2, iy + 28);
    if (abilityState.hasPhaseDash || abilityState.hasShardShot) {
      const abilities = [];
      if (abilityState.hasPhaseDash) abilities.push('C: Phase Dash');
      if (abilityState.hasShardShot) abilities.push('V (hold): Aim Shard Shot | ↑/↓: Tilt');
      ctx.fillText(abilities.join('  |  '), W / 2, iy + 46);
    }

    ctx.textAlign = 'left';
  }

  // ── Pause menu overlay (Phase 0.5) ──────────────────────────────────────
  if (gameState === 'paused') {
    // Dim background
    ctx.fillStyle = 'rgba(10, 10, 15, 0.75)';
    ctx.fillRect(0, 0, W, H);

    const menuItems = pauseMenuItems;

    // Panel background
    const panelW = 300;
    const panelH = menuItems.length * 40 + 50;
    const px = W / 2 - panelW / 2;
    const py = H / 2 - panelH / 2;

    ctx.fillStyle = 'rgba(10, 10, 18, 0.92)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, panelW, panelH);

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillText('PAUSED', W / 2, py + 32);

    // Menu items
    ctx.font = '13px "Courier New", monospace';
    for (let i = 0; i < menuItems.length; i++) {
      const my = py + 54 + i * 40;
      const isHover = i === pauseMenuIndex;

      if (menuItems[i].disabled) {
        ctx.fillStyle = '#3a3a5e';
      } else if (isHover) {
        // Highlight bar
        ctx.fillStyle = 'rgba(196, 181, 253, 0.12)';
        ctx.fillRect(px + 12, my - 14, panelW - 24, 24);
        ctx.fillStyle = '#e0d7ff';
      } else {
        ctx.fillStyle = '#8a8aae';
      }

      // Arrow indicator on hover
      if (isHover && !menuItems[i].disabled) {
        ctx.fillStyle = '#c4b5fd';
        ctx.fillText('▸', W / 2 - (ctx.measureText(menuItems[i].label).width / 2) - 14, my);
      }

      ctx.fillText(menuItems[i].label, W / 2, my);
    }

    // Footer hint
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = '#4a4a6e';
    ctx.fillText('↑↓ Navigate  ·  ENTER Select  ·  ESC Resume', W / 2, py + panelH - 14);

    ctx.textAlign = 'left';
  }

  // ── Inventory screen (roadmap 1.9) ──────────────────────────────────────
  if (gameState === 'inventory') {
    // Dim + subtle vignette behind the panel (matches lorePipEffect's radial style)
    ctx.fillStyle = 'rgba(10, 10, 15, 0.88)';
    ctx.fillRect(0, 0, W, H);
    const bgGlow = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, H * 0.7);
    bgGlow.addColorStop(0, 'rgba(103, 232, 249, 0.05)');
    bgGlow.addColorStop(1, 'rgba(103, 232, 249, 0)');
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, W, H);

    const panelW = 560;
    const panelH = 380;
    const px = W / 2 - panelW / 2;
    const py = H / 2 - panelH / 2;

    ctx.fillStyle = 'rgba(9, 9, 16, 0.95)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = '#3a3a6e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px, py, panelW, panelH);
    // Corner accents (small flourish, echoes the diamond pip motif used elsewhere)
    ctx.strokeStyle = 'rgba(196, 181, 253, 0.5)';
    ctx.lineWidth = 2;
    for (const [cx, cy, dx, dy] of [[px, py, 1, 1], [px + panelW, py, -1, 1], [px, py + panelH, 1, -1], [px + panelW, py + panelH, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + dy * 16);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + dx * 16, cy);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#e0d7ff';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillText('INVENTORY', W / 2, py + 38);
    ctx.strokeStyle = 'rgba(196, 181, 253, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 40, py + 52);
    ctx.lineTo(px + panelW - 40, py + 52);
    ctx.stroke();

    // ── Left column: Fracture Pips + Lore Pips, as diamond glyphs (echoes drawFracturePip/HUD) ──
    const colX = px + 34;
    let iy = py + 90;

    ctx.textAlign = 'left';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillStyle = '#67e8f9';
    ctx.fillText('FRACTURE PIPS', colX, iy);
    iy += 26;
    for (let i = 0; i < 4; i++) {
      const dx = colX + 10 + i * 26, dy = iy;
      const filled = i < player.fractureMax;
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = filled ? '#67e8f9' : 'rgba(103, 232, 249, 0.08)';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.strokeStyle = filled ? '#cffafe' : '#2a2a4e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-8, -8, 16, 16);
      ctx.restore();
    }
    iy += 44;

    const totalLorePips = Object.keys(collectedLore).length;
    const banked = Math.max(0, lorePipsBanked());
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('LORE PIPS', colX, iy);
    iy += 22;
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = '#c9b98a';
    ctx.fillText(`Found:  ${totalLorePips}`, colX, iy);
    iy += 20;
    ctx.fillStyle = banked > 0 ? '#fde68a' : '#8a8060';
    ctx.fillText(`Banked: ${banked}`, colX, iy);
    iy += 30;

    // Small flavor line — keeps the panel from reading as a bare spreadsheet
    ctx.font = 'italic 10px "Courier New", monospace';
    ctx.fillStyle = '#5a5a7e';
    wrapText(ctx, 'Lore Pips are spent below on lasting upgrades.', colX, iy, panelW / 2 - 50, 13);

    // ── Right column: upgrade list (data-driven, INVENTORY_UPGRADES) ──
    const listX = px + panelW / 2 + 10;
    const listW = panelW / 2 - 44;
    let ly = py + 90;
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillStyle = '#c4b5fd';
    ctx.fillText('UPGRADES', listX, ly);
    ly += 24;

    for (let i = 0; i < INVENTORY_UPGRADES.length; i++) {
      const def = INVENTORY_UPGRADES[i];
      const level = statUpgrades[def.key] || 0;
      const maxed = level >= def.max;
      const canAfford = banked >= def.cost;
      const selected = i === inventorySelection;
      const rowH = 48;

      if (selected) {
        ctx.fillStyle = 'rgba(196, 181, 253, 0.14)';
        ctx.fillRect(listX - 10, ly - 18, listW + 10, rowH);
        ctx.strokeStyle = 'rgba(196, 181, 253, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(listX - 10, ly - 18, listW + 10, rowH);
      }

      ctx.textAlign = 'left';
      ctx.font = '13px "Courier New", monospace';
      ctx.fillStyle = maxed ? '#8a8aae' : (selected ? '#e0d7ff' : '#b0a8d0');
      ctx.fillText(`${selected ? '▸ ' : '  '}${def.label}`, listX, ly);

      // Level pips (small diamonds, one per max level)
      const pipStartX = listX + 4;
      const pipY = ly + 16;
      for (let l = 0; l < def.max; l++) {
        const ppx = pipStartX + l * 16;
        ctx.save();
        ctx.translate(ppx, pipY);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = l < level ? def.color : 'rgba(255,255,255,0.06)';
        ctx.fillRect(-5, -5, 10, 10);
        ctx.strokeStyle = l < level ? def.color : '#2a2a4e';
        ctx.lineWidth = 1;
        ctx.strokeRect(-5, -5, 10, 10);
        ctx.restore();
      }

      ctx.font = '10px "Courier New", monospace';
      ctx.fillStyle = maxed ? '#6a6a8e' : (canAfford ? '#8a8aae' : '#5a5a7e');
      ctx.fillText(maxed ? 'MAXED' : `Cost: ${def.cost} pips`, pipStartX + def.max * 16 + 10, pipY + 4);

      ly += rowH;
    }

    // Description of the currently selected upgrade
    const activeDef = INVENTORY_UPGRADES[inventorySelection];
    if (activeDef) {
      ctx.font = 'italic 10px "Courier New", monospace';
      ctx.fillStyle = '#7a7a9e';
      wrapText(ctx, activeDef.desc, listX, ly + 8, listW, 13);
    }

    // Transient feedback
    if (inventoryMessage) {
      ctx.textAlign = 'center';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillStyle = 'rgba(224, 215, 255, 0.85)';
      ctx.fillText(inventoryMessage.text, W / 2, py + panelH - 44);
    }

    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = '#4a4a6e';
    ctx.textAlign = 'center';
    ctx.fillText('↑↓ Select  ·  ENTER Upgrade  ·  ESC Back', W / 2, py + panelH - 16);
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
    const screenX = (pop.x - camera.x) * camera.zoom;
    const screenY = (pop.y - camera.y) * camera.zoom;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText(pop.text, screenX + 1, screenY + 1);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, screenX, screenY);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';

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

  // Lore pip placeholder visual effect (roadmap 1.9) — non-disruptive,
  // player keeps moving. A brief screen-edge amber vignette pulse; swap for
  // real per-fragment cutscenes once roadmap 1.10 decides content.
  if (lorePipEffect) {
    const fadeIn = lorePipEffect.maxTimer - lorePipEffect.timer;
    const alpha = (fadeIn < 15 ? fadeIn / 15 : Math.min(1, lorePipEffect.timer / 30)) * 0.35;
    const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
    grad.addColorStop(0, 'rgba(251, 191, 36, 0)');
    grad.addColorStop(1, `rgba(251, 191, 36, ${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // Full-screen map overlay
  if (mapOpen) {
    drawMap(ctx, currentAreaId, discoveredAreas, anchorActivated);
  }

  // Controls screen reached from the pause menu (Controls item) — reuses
  // the exact same menu-styled screen the main menu uses, opaque background
  // and all, so it looks identical regardless of entry point.
  if (gameState === 'paused_controls') {
    drawControlsScreen();
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

// Main loop — fixed-timestep accumulator (60 Hz simulation, decoupled from display refresh)
const FIXED_DT = 1000 / 60; // ms per simulation tick — matches all existing "N frames" tuning
const MAX_ACCUMULATOR = 250; // cap elapsed to avoid spiral-of-death after tab throttle
const MAX_TICKS_PER_FRAME = 5; // second safety net

let lastTime = performance.now();
let accumulator = 0;

// rAF doesn't fire while a tab is hidden, so `now - lastTime` on the first
// callback after switching back can be seconds long. MAX_ACCUMULATOR only
// caps how much of that gets added in ONE call (250ms) — the leftover
// still drains at up to MAX_TICKS_PER_FRAME ticks every subsequent
// rendered frame until it's gone, which compresses a few hundred
// milliseconds of game logic into a handful of real frames right after
// refocusing (user report 2026-07-20: "leave a tab open and come back the
// game is super sped up"). Discarding the backlog outright on
// visibilitychange, instead of trying to catch it up, is the standard fix
// — the game just resumes from where it was with no burst at all.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    lastTime = performance.now();
    accumulator = 0;
  }
});

function gameLoop(now) {
  const elapsed = Math.min(now - lastTime, MAX_ACCUMULATOR);
  lastTime = now;
  accumulator += elapsed;

  let ticks = 0;
  while (accumulator >= FIXED_DT && ticks < MAX_TICKS_PER_FRAME) {
    update();
    accumulator -= FIXED_DT;
    ticks++;
  }

  draw();
  requestAnimationFrame(gameLoop);
}

// ── Entry point ─────────────────────────────────────────────────────────

init();
requestAnimationFrame(gameLoop);