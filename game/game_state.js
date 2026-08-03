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
  // whole window the wxay index.html does. Sizing against the full window
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
  // Same live-getter reasoning as player/gameState above — added for
  // game/runtimeDebugger.js's variable watch + frame profiler, which need
  // to read whatever the current binding holds every frame, not a stale
  // snapshot from whenever the debugger script happened to load.
  Object.defineProperty(window, 'currentAreaId', { get: () => currentAreaId, configurable: true });
  Object.defineProperty(window, 'frameCount', { get: () => frameCount, configurable: true });
  Object.defineProperty(window, 'projectiles', { get: () => projectiles, configurable: true });
  Object.defineProperty(window, 'particles', { get: () => particles, configurable: true });
  Object.defineProperty(window, 'echoes', { get: () => echoes, configurable: true });
  Object.defineProperty(window, 'currentEnemies', { get: () => areaEnemies[currentAreaId] || [], configurable: true });
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
// Audio volume sliders (0..1 each, independent buses — see audio.js)
let musicVolume = 1.0;
let sfxVolume = 1.0;
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

// Miniboss fight state — separate from `boss` (the Sovereign), which is tied to
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
  void_expanse_boss: Undertow,
  antechamber_child: TheChild,
  abandoned_shell: AbandonedShell,
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
  construct:      { flag: 'hasConstruct',     color: '#fbbf24', popup: 'CONSTRUCT',
                    notification: 'ABILITY: Construct - hold Q to aim and build a construct, tap for quickfire'},
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

// area.cutsceneTriggers[] (Plans/room_scene_editor_plan.md §3/v2) same-visit
// debounce — NOT save-persisted on purpose, unlike storyFlags (the real
// "don't replay this ever again" gate a trigger's own storyFlag field
// checks). This just stops an 'enter'-type zone trigger from immediately
// re-firing the instant its cutscene ends and gameState returns to
// 'playing' while the player is still standing in the same zone, for a
// cutscene whose author forgot to setFlag a matching storyFlag. Reset on
// every room entry (switchArea()/applyDevSpawnOverride()) since it's scoped
// to "this particular visit," not "ever."
let firedTriggersThisVisit = new Set();
let loreOverlay = null; // { text, timer, maxTimer }
let lorePipEffect = null; // { timer, maxTimer } — placeholder screen effect on lore pip pickup, see drawLorePipEffect()

// ── Fracture Pips / stat upgrades (roadmap 1.9) ──────────────────────────
let fracturePipsFound = {};    // pip id -> true, world pickups that raise player.fractureMax
let statUpgrades = { strength: 0 }; // spent-upgrade levels per INVENTORY_UPGRADES key, funded by banked lore pips
let inventoryMessage = null; // { text, timer } — transient feedback line in the inventory screen
let inventorySelection = 0;  // selected row in the Inventory screen's upgrade list
let inventoryReturnState = 'paused'; // gameState to restore on exit — 'paused' (via pause menu) or 'playing' (via direct I shortcut)

// ── Multi-page Inventory (2026-08-01 redesign, see Plans/inventory_redesign.md) ──
// Page 0 = Map (world map + player-placed pins), 1 = Character (abilities/
// stats/story items/companion), 2 = Upgrades (the old single-page inventory
// content, unchanged), 3 = Customization (idle anims/taunts/fashion, starts
// with an empty catalog — filled in via editor/inventory_editor.html).
// Layout/content of each page lives in inventory_ui.js; this file only owns
// the persisted/session state that isn't view-layer.
let inventoryPage = 1; // which of the 4 pages is showing
const INVENTORY_PAGE_NAMES = ['MAP', 'CHARACTER', 'UPGRADES', 'CUSTOMIZATION'];

// Page 0 (Map) — player-placed pins, freeform in map-canvas logical space
// (same pre pan/zoom coordinate space drawMap() uses). Not tied to a room —
// "scratched together from all sources" per the design brief, so pins can
// land anywhere on the board, not just room centers.
let mapPins = []; // { id, x, y, icon, note }
let mapCursor = { x: W / 2, y: H / 2 }; // keyboard crosshair used to place/remove pins
let nextMapPinId = 1;

// Page 3 (Customization) — per-save unlock/equip state. The catalog of
// *available* cosmetics (COSMETICS_CATALOG) lives in customization.js and
// starts empty; it's authored content filled in via the editor, not game
// state, so it isn't saved here — only which ones this save has
// unlocked/equipped is.
let unlockedCosmetics = {}; // cosmetic id -> true
let equippedCosmetics = { idle_anim: null, taunt: null, fashion: null };
let cosmeticsSlotIndex = 0; // which slot tab (idle_anim/taunt/fashion) is active
let cosmeticsSelection = 0; // selected cell within that slot's grid

// Transient feedback lines (same {text, timer} pattern as inventoryMessage above)
let pauseMenuMessage = null;  // pause menu — Export Save feedback
let saveSlotMessage = null;   // main menu "Select Save" screen — Export/Import feedback
let pausedSettingsIndex = 0;  // selected row in the pause menu's "Settings" sub-screen

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
