// ── Shared transient-entity reset ────────────────────────────────────────
// Every path that resets the game world (init, startNewGame, loadGame,
// respawnPlayer, returnToAnchor, restartRoom, switchArea) needs to clear
// the same set of frame-scoped entities. Centralizing the list here means
// adding a new transient entity type is a one-line change instead of a
// hunt through 7 call sites.
function resetTransientEntities() {
  echoes = [];
  standEcho = null;
  projectiles = [];
  afterimageHazards = [];
  particles = [];
  bossProjectiles = [];
  areaAmbient = [];
  if (player && player.phasedThroughEnemies) player.phasedThroughEnemies.clear();
}

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
  resetTransientEntities();
  boss = null;
  miniboss = null;
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
  mapPins = [];
  nextMapPinId = 1;
  unlockedCosmetics = {};
  equippedCosmetics = { idle_anim: null, taunt: null, fashion: null };
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
  abilityState.hasReach = false;
  abilityState.hasConstruct = false;
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

// ── Dev-only "Spawn" harness (Plans/room_verification_tool_plan.md §3) ────
// ?spawnRoom=<roomId>&loadout=all|none|comma,separated,ability,keys
// Called once, right after init(), from game_draw_loop.js's bootstrap line.
// Overrides the two things init() hardcodes (currentAreaId, gameState) so a
// dev tool (editor/room_verify.html) can link straight into an arbitrary
// room instead of the player navigating the whole menu to get there. A
// no-op with zero effect on normal play whenever `spawnRoom` isn't present
// or doesn't name a real room. Never touches save data — no saveGame() call
// anywhere in this path, same "don't corrupt real progress" rule
// enemy_test.html/companion_test.html already follow for their own harnesses.
// `window.__editorSpawnRoom` is an additional, non-URL source for the same
// override — editor/room_scene_editor.html boots its preview via a
// srcdoc'd iframe (same fetch+rewrite pattern as debug_v1.html's
// loadSandbox()), and a srcdoc document's `location` is always
// "about:srcdoc" with no query string, so `?spawnRoom=` can't reach it.
// The editor instead injects a small patch script that sets this global
// before the game scripts run. Checked first so the URL param (real
// navigation, e.g. room_verify.html's Spawn button) still works unchanged.
function applyDevSpawnOverride() {
  const spawnRoomId = window.__editorSpawnRoom
    || (typeof location !== 'undefined' && location.search && new URLSearchParams(location.search).get('spawnRoom'));
  if (!spawnRoomId || !AREAS[spawnRoomId]) return;

  const room = AREAS[spawnRoomId];
  currentAreaId = spawnRoomId;
  discoveredAreas[spawnRoomId] = true;

  // Land at the room's first anchor, same fallback switchArea()'s callers
  // already use — never the hardcoded (100, groundY-60) init() default,
  // which may sit inside geometry in an arbitrary room.
  const anchor = room.anchors && room.anchors[0];
  player.x = anchor ? anchor.x : 100;
  player.y = anchor ? anchor.y - player.height : room.groundY - 60;
  player.vx = 0;
  player.vy = 0;
  nudgeOutOfPlatforms(player, room.platforms, `dev spawn into "${spawnRoomId}"`);

  // Grant the requested loadout. Defaults to "all" — inspecting an
  // ability-gated room with zero abilities makes every gated path in it
  // look broken when it isn't. `loadout=none` skips granting anything;
  // a comma list grants exactly those ABILITY_GRANTS keys (e.g.
  // `loadout=phase_dash,charged_attack`) for a truer "what does a
  // first-time player see" check.
  // No URL query in a srcdoc'd preview (see spawnRoomId above) — defaults to
  // 'all' there, same as a bare ?spawnRoom= with no &loadout= today.
  const params = (typeof location !== 'undefined' && location.search) ? new URLSearchParams(location.search) : null;
  const loadoutParam = (params && params.get('loadout')) || 'all';
  if (loadoutParam === 'all') {
    for (const key in ABILITY_GRANTS) abilityState[ABILITY_GRANTS[key].flag] = true;
    player.fractureMax = FRACTURE_ABS_MAX;
  } else if (loadoutParam !== 'none') {
    for (const rawKey of loadoutParam.split(',')) {
      const grant = ABILITY_GRANTS[rawKey.trim()];
      if (grant) abilityState[grant.flag] = true;
    }
  }

  resetCamera();
  // room_scene_editor.html's preview is about backdrop art/parallax/cutscene
  // triggers, not combat — live enemies attacking the player while someone's
  // just trying to tune a parallax layer is pure noise, so skip the spawn
  // for that path specifically. room_verify.html's Spawn button (the
  // URL-based ?spawnRoom= path) is unaffected — it wants real enemies
  // present for its own reachability/safety checks.
  if (!window.__editorSpawnRoom) spawnAreaEnemies(spawnRoomId);
  SFX.setAreaAmbient(spawnRoomId);
  showUI(true);
  gameState = 'playing';
  // Same same-visit debounce reset switchArea() does for
  // area.cutsceneTriggers[] 'enter' zones — this harness bypasses
  // switchArea() entirely (see the "never touches save data" note above),
  // so it needs its own reset. Deliberately does NOT fire 'onRoomLoad'
  // triggers the way switchArea() does — a dev "spawn straight into this
  // room" harness inspecting a mid-game room shouldn't force-start whatever
  // plot cutscene happens to be gated there.
  firedTriggersThisVisit = new Set();
}

// ── Settings persistence (Phase 0.6) ──────────────────────────────────
const SETTINGS_KEY = 'stillpoint_settings_v1';

function loadSettings() {
  // readOverrideJSON (overrideStore.js) already owns the shared
  // getItem→JSON.parse→try/catch shell; this keeps its own field-by-field
  // default-application on top, same as every applyXOverrides() does.
  const s = (typeof readOverrideJSON === 'function') ? readOverrideJSON(SETTINGS_KEY) : null;
  if (s) {
    screenShakeEnabled = s.screenShake !== undefined ? s.screenShake : true;
    hitstopEnabled = s.hitstop !== undefined ? s.hitstop : true;
    musicVolume = typeof s.musicVolume === 'number' ? Math.max(0, Math.min(1, s.musicVolume)) : 1.0;
    sfxVolume = typeof s.sfxVolume === 'number' ? Math.max(0, Math.min(1, s.sfxVolume)) : 1.0;
  }
  // Apply regardless of whether a save existed (defaults still need to reach
  // the audio buses) — safe to call before SFX.init()/ctx exists, see audio.js.
  SFX.setMusicVolume(musicVolume);
  SFX.setSfxVolume(sfxVolume);
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      screenShake: screenShakeEnabled,
      hitstop: hitstopEnabled,
      musicVolume,
      sfxVolume,
    }));
  } catch (e) { /* degrade silently */ }
}

// Nudge a 0..1 volume by +/-10%, clamped, rounded to avoid float drift
// (0.1 + 0.2 = 0.30000000000000004 etc.) — always land on a clean 10% step.
function adjustVolume(current, delta) {
  return Math.round(Math.max(0, Math.min(1, current + delta)) * 10) / 10;
}

// Rebuild pause menu items (used after toggling a setting to update labels).
// Kept short (7 rows) so the panel fits the 800x450 canvas — Screen Shake/
// Hitstop/volume/Export all live one level down in the "Settings" sub-screen
// (gameState 'paused_settings', see getPausedSettingsItems()), the same
// pattern the existing Controls sub-screen already uses.
function buildPauseMenu() {
  pauseMenuItems = [
    { label: 'Resume', action: () => { /* just close the menu */ } },
    { label: 'Inventory', action: () => { inventoryReturnState = 'paused'; gameState = 'inventory'; } },
    { label: 'Return to Anchor', action: () => returnToAnchor(), disabled: !lastAnchor },
    { label: 'Restart Room', action: () => restartRoom() },
    { label: 'Controls', action: () => { gameState = 'paused_controls'; controlsMenuIndex = 0; } },
    { label: 'Settings', action: () => { gameState = 'paused_settings'; pausedSettingsIndex = 0; } },
    { label: 'Quit to Menu', action: () => { init(); } },
  ];
}

// Items for the pause menu's "Settings" sub-screen. Built fresh each time
// (not cached like pauseMenuItems) since it's only read while that screen is
// active — no rebuild-after-mutation bookkeeping needed.
function getPausedSettingsItems() {
  return [
    { label: `Screen Shake: ${screenShakeEnabled ? 'ON' : 'OFF'}`, action: () => {
      screenShakeEnabled = !screenShakeEnabled;
      saveSettings();
    }},
    { label: `Hitstop: ${hitstopEnabled ? 'ON' : 'OFF'}`, action: () => {
      hitstopEnabled = !hitstopEnabled;
      saveSettings();
    }},
    // Enter/Space cycles +10% (wraps); ← → adjusts by 10% without wrapping.
    { label: `Music Volume: ${Math.round(musicVolume * 100)}%`, action: () => {
      musicVolume = musicVolume >= 1 ? 0 : adjustVolume(musicVolume, 0.1);
      SFX.setMusicVolume(musicVolume);
      saveSettings();
    }, onLeft: () => {
      musicVolume = adjustVolume(musicVolume, -0.1);
      SFX.setMusicVolume(musicVolume);
      saveSettings();
    }, onRight: () => {
      musicVolume = adjustVolume(musicVolume, 0.1);
      SFX.setMusicVolume(musicVolume);
      saveSettings();
    }},
    { label: `SFX Volume: ${Math.round(sfxVolume * 100)}%`, action: () => {
      sfxVolume = sfxVolume >= 1 ? 0 : adjustVolume(sfxVolume, 0.1);
      SFX.setSfxVolume(sfxVolume);
      saveSettings();
    }, onLeft: () => {
      sfxVolume = adjustVolume(sfxVolume, -0.1);
      SFX.setSfxVolume(sfxVolume);
      saveSettings();
    }, onRight: () => {
      sfxVolume = adjustVolume(sfxVolume, 0.1);
      SFX.setSfxVolume(sfxVolume);
      saveSettings();
    }},
    { label: 'Export Save (Copy to Clipboard)', action: () => {
      copySaveToClipboard(currentSaveSlot, (ok) => {
        pauseMenuMessage = { text: ok ? 'Save copied to clipboard!' : 'Copy failed — see console', timer: 120 };
      });
    }},
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

function getBackupKey(slot) {
  return `${getSaveKey(slot)}_backup`;
}

// ── Save schema versioning ───────────────────────────────────────────────
// Bump CURRENT_SAVE_VERSION whenever a save-shape change isn't safely
// representable by loadGame()'s per-field `data.foo || default` fallbacks
// (e.g. renaming/restructuring a field, not just adding a new optional one).
// Add the matching entry to SAVE_MIGRATIONS keyed by the version being
// migrated FROM: `2: (data) => { ...transform data...; return data; }`.
// migrateSaveData() walks a loaded save forward one step at a time so a
// save written years ago still loads today. No migrations are needed yet —
// this is the scaffold, wired in now so the first real migration is a
// one-function change instead of a from-scratch retrofit.
const CURRENT_SAVE_VERSION = 1;
const SAVE_MIGRATIONS = {
  // 1: (data) => { ...; data.version = 2; return data; },
};

function migrateSaveData(data) {
  let guard = 0; // safety net against an accidentally-cyclic migration chain
  while (data.version < CURRENT_SAVE_VERSION && guard++ < 50) {
    const step = SAVE_MIGRATIONS[data.version];
    if (!step) break; // no migration registered — leave at whatever version it's at
    data = step(data);
  }
  return data;
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
    // Roll the existing save into a one-deep backup before overwriting it,
    // so a bad write (corrupt JSON mid-write, a buggy future migration, a
    // browser crash) never destroys the only copy of this slot's progress.
    const existing = localStorage.getItem(getSaveKey(s));
    if (existing) localStorage.setItem(getBackupKey(s), existing);

    const data = {
      version: CURRENT_SAVE_VERSION,
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
        hasReach: abilityState.hasReach,
        // Cooldowns persisted (2026-07-24 fix) so quitting/reloading mid-fight
        // can't be used to reset an ability early — see BUG list.
        phaseDashCooldown: abilityState.phaseDashCooldown,
        shardShotCooldown: abilityState.shardShotCooldown,
        gravitonSurgeCooldown: abilityState.gravitonSurgeCooldown,
        voidTetherCooldown: abilityState.voidTetherCooldown,
        parryCooldown: abilityState.parryCooldown,
        hasConstruct: abilityState.hasConstruct,
      },
      anchorActivated,
      lastAnchor,
      discoveredAreas,
      collectedLore,
      mapPins,                // Page 0 (Map) — player-placed pins, see inventory_ui.js
      unlockedCosmetics,      // Page 3 (Customization) — per-save unlocks; catalog itself is authored data (customization.js)
      equippedCosmetics,
      bossDefeated,
      defeatedMinibosses,
      tutorialState,
      storyFlags, // cutscene.js narrative switches (e.g. child_choice_resolved)
      companion: { active: companionState.active, canFight: companionState.canFight, weapon: companionState.weapon },
      maxHealthBonus,           // healing.js — max-health shards
      maxHealthShardsCollected,
      stillpointLifestealBonus, // Temporal Warden's defeat reward
    };
    localStorage.setItem(getSaveKey(s), JSON.stringify(data));
  } catch (e) {
    // Storage unavailable — fail silently; the run just won't persist.
  }
}

// A save is only trusted if it parses AND names a real area + player block —
// same shape check loadGame() used inline before, now shared with the
// corrupt-save recovery path below.
function isValidSaveJson(raw) {
  try {
    const data = JSON.parse(raw);
    return !!(data && data.currentAreaId && AREAS[data.currentAreaId] && data.player);
  } catch (e) {
    return false;
  }
}

// Reads slot `s`, falling back to its one-deep backup (see saveGame()) if
// the primary copy is missing, unparseable, or fails the shape check —
// e.g. corrupted by a browser crash mid-write, or a bad manual edit.
function readSaveRaw(s) {
  try {
    const raw = localStorage.getItem(getSaveKey(s));
    if (raw && isValidSaveJson(raw)) return raw;
    const backup = localStorage.getItem(getBackupKey(s));
    if (backup && isValidSaveJson(backup)) {
      console.warn(`Stillpoint: save slot ${s} was corrupt or unreadable — recovered from backup.`);
      return backup;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Returns true on success. Caller is responsible for setting gameState etc.
function loadGame(slot) {
  const s = slot !== undefined ? slot : currentSaveSlot;
  try {
    const raw = readSaveRaw(s);
    if (!raw) return false;
    let data = JSON.parse(raw);
    if (!data || !data.currentAreaId || !AREAS[data.currentAreaId] || !data.player) return false;
    data.version = typeof data.version === 'number' ? data.version : 1; // pre-versioning saves
    data = migrateSaveData(data);

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
    abilityState.hasReach = !!(data.abilityState && data.abilityState.hasReach);
    abilityState.hasConstruct = !!(data.abilityState && data.abilityState.hasConstruct);
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
    mapPins = Array.isArray(data.mapPins) ? data.mapPins : [];
    nextMapPinId = mapPins.reduce((max, p) => Math.max(max, (p.id || 0) + 1), 1);
    unlockedCosmetics = data.unlockedCosmetics || {};
    equippedCosmetics = data.equippedCosmetics || { idle_anim: null, taunt: null, fashion: null };
    bossDefeated = !!data.bossDefeated;
    defeatedMinibosses = data.defeatedMinibosses || {};
    tutorialState = data.tutorialState || { moved: true, jumped: true, attacked: true, dashed: true };
    storyFlags = data.storyFlags || {};
    companionState.active = !!(data.companion && data.companion.active);
    companionState.canFight = !!(data.companion && data.companion.canFight);
    companionState.weapon = (data.companion && data.companion.weapon) || null;
    companionState.mode = 'follow';
    companionState.healCooldown = 0;
    child = null; // recreated lazily next frame if active
    maxHealthBonus = typeof data.maxHealthBonus === 'number' ? data.maxHealthBonus : 0;
    maxHealthShardsCollected = data.maxHealthShardsCollected || {};
    stillpointLifestealBonus = typeof data.stillpointLifestealBonus === 'number' ? data.stillpointLifestealBonus : 0;
    clearVitalityMotes();
    clearWeaponDrops();
    resetHealingCrystals();

    resetTransientEntities();
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
    localStorage.removeItem(getBackupKey(s)); // otherwise a "deleted" slot could resurrect via readSaveRaw()'s backup fallback
  } catch (e) {
    // ignore
  }
}

// ── Manual export/import ─────────────────────────────────────────────────
// localStorage has no built-in backup — a browser cache clear, private-mode
// session, or (once shipped) an Electron reinstall wipes it with no recovery
// path. Export/import gives the player a manual copy independent of the
// browser's storage, base64-wrapped so a paste into a text field can't be
// mangled by stray whitespace/newlines the way raw JSON sometimes is.

function exportSaveString(slot) {
  const s = slot !== undefined ? slot : currentSaveSlot;
  try {
    const raw = localStorage.getItem(getSaveKey(s));
    if (!raw || !isValidSaveJson(raw)) return null;
    return `STILLPOINT_SAVE:${btoa(unescape(encodeURIComponent(raw)))}`;
  } catch (e) {
    return null;
  }
}

// Copies slot `s`'s save to the clipboard. `cb(ok)` fires with the result —
// clipboard access is async and (in some embeds) permission-gated, so this
// can't return a plain boolean the way the rest of this file's helpers do.
function copySaveToClipboard(slot, cb) {
  const text = exportSaveString(slot);
  if (!text) { cb && cb(false); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => cb && cb(true),
      (e) => { console.warn('Stillpoint: clipboard write failed', e); cb && cb(false); }
    );
    return;
  }
  // Fallback for embeds/older browsers without the async Clipboard API.
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    cb && cb(ok);
  } catch (e) {
    console.warn('Stillpoint: clipboard fallback failed', e);
    cb && cb(false);
  }
}

// Validates and writes an exported string (from exportSaveString) into slot
// `s`. Returns true on success — does NOT load it into the live game, the
// caller decides whether/when to call loadGame() after.
function importSaveString(slot, text) {
  const s = slot !== undefined ? slot : currentSaveSlot;
  try {
    if (typeof text !== 'string') return false;
    const trimmed = text.trim();
    const prefix = 'STILLPOINT_SAVE:';
    if (!trimmed.startsWith(prefix)) return false;
    const raw = decodeURIComponent(escape(atob(trimmed.slice(prefix.length))));
    if (!isValidSaveJson(raw)) return false;
    // Back up whatever was already in the slot before overwriting — an
    // accidental import over the wrong slot is recoverable the same way a
    // bad saveGame() write is (see saveGame()'s backup-before-overwrite).
    const existing = localStorage.getItem(getSaveKey(s));
    if (existing) localStorage.setItem(getBackupKey(s), existing);
    localStorage.setItem(getSaveKey(s), raw);
    return true;
  } catch (e) {
    return false;
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
  resetTransientEntities();
  boss = null;
  miniboss = null;
  defeatedMinibosses = {};
  areaEnemiesSpawned = {};
  discoveredAreas = { spawn_area_1: true };
  anchorActivated = {};
  lastAnchor = null;
  collectedLore = {};
  mapPins = [];
  nextMapPinId = 1;
  unlockedCosmetics = {};
  equippedCosmetics = { idle_anim: null, taunt: null, fashion: null };
  fracturePipsFound = {};
  statUpgrades = { strength: 0 };
  limitBreakChosen = null;
  bossDefeated = false;
  storyFlags = {};
  companionState.active = false;
  companionState.canFight = false;
  companionState.weapon = null;
  companionState.mode = 'follow';
  companionState.healCooldown = 0;
  child = null;
  maxHealthBonus = 0;
  maxHealthShardsCollected = {};
  stillpointLifestealBonus = 0;
  clearVitalityMotes();
  clearWeaponDrops();
  resetHealingCrystals();
  abilityState.hasPhaseDash = false;
  abilityState.hasShardShot = false;
  abilityState.hasStillpoint = false;
  abilityState.hasChargedAttack = false;
  abilityState.hasGravitonSurge = false;
  abilityState.hasVoidTether = false;
  abilityState.hasParry = false;
  abilityState.hasReach = false;
  abilityState.hasConstruct = false;
  abilityState.phaseDashCooldown = 0;
  abilityState.shardShotCooldown = 0;
  abilityState.gravitonSurgeCooldown = 0;
  abilityState.voidTetherCooldown = 0;
  abilityState.parryCooldown = 0;
  abilityState.notifications = [];
  gameTimeScale = 1.0;
  limitBreak.active = false;
  limitBreak.ability = null;
  limitBreak.timer = 0;
  hitstopTimer = 0;
  slowMoTimer = 0;
  slowMoSkip = 0;
  screenShake = 0;
  screenShakeIntensity = 0;
  deathFadeAlpha = 0;
  deathFadeDir = 0;
  transitionAlpha = 0;
  transitioning = false;
  doorCooldown = 0;
  abilityFlash = 0;
  abilityPopups = [];
  moteCharge = 0;
  comboState.progress = {};
  comboState.damageBuff = null;
  comboState.lastCompleted = null;
  comboState._prev = {};
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
  clearWeaponDrops();
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

  resetTransientEntities();
  boss = null;
  miniboss = null;
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
  resetTransientEntities();
  boss = null;
  miniboss = null;
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
  resetTransientEntities();
  boss = null;
  miniboss = null;
  resetCamera();
  spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#67e8f9', 10);
}

