const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

// One entry per const an editor is allowed to write to disk. Renderers
// never send a raw file path — only one of these symbolic ids — so a typo
// or a compromised renderer can't be pointed at an arbitrary file. Mirrors
// (and extends) editor/save-server.js's old `LAYOUTS` registry.
//
// `mode: 'sync'` = whole flat object, keys added/updated/removed to match
//   (same semantics as the old patchLayoutBlock — use for small, flat
//   consts with no meaningful internal structure to preserve beyond
//   per-key comments).
// `mode: 'path'` = single nested value patched via a dot/bracket path,
//   leaving every other entry in the const completely untouched — use
//   for large hand-annotated consts (AREAS, CUTSCENES, ...) where a
//   whole-object rewrite would blow away unrelated comments.
// `mode: 'whole'` = replace the entire const value in one shot — only
//   safe for consts with zero hand-written comments inside them
//   (verified per-target below, not assumed).
const TARGETS = {
  hudLayout: {
    mode: 'sync',
    targetFile: path.join(REPO_ROOT, 'game', 'game_hud_menus.js'),
    declName: 'HUD_LAYOUT',
    requiredKeys: [
      'healthHearts', 'areaLabel', 'bossBar', 'limitBreakBar',
      'controlsHint', 'fracturePips', 'abilityCooldowns',
    ],
  },
  inventoryLayout: {
    mode: 'sync',
    targetFile: path.join(REPO_ROOT, 'game', 'inventory_ui.js'),
    declName: 'INVENTORY_LAYOUT',
    requiredKeys: [
      'panel', 'tabStrip', 'portrait', 'healthLabel', 'fracturePipsRow',
      'abilityGrid', 'companionPortrait', 'storyListHeader', 'storyList',
      'storyDetail', 'pipsHeader', 'pipsRow2', 'lorePipsInfo', 'upgradesList',
      'slotTabs', 'cosmeticsGrid', 'cosmeticsDetail',
    ],
  },
  areas: {
    mode: 'path',
    targetFile: path.join(REPO_ROOT, 'game', 'area.js'),
    declName: 'AREAS',
  },
  animDefs: {
    mode: 'path',
    targetFile: path.join(REPO_ROOT, 'game', 'animdata.js'),
    declName: 'ANIM_DEFS',
  },
  bossPhaseConfig: {
    // Verified zero comments inside BOSS_PHASE_CONFIG in game/boss.js —
    // whole-object replacement is safe here (nothing to lose).
    mode: 'whole',
    targetFile: path.join(REPO_ROOT, 'game', 'boss.js'),
    declName: 'BOSS_PHASE_CONFIG',
  },
  // One entry per ComposedEnemy miniboss def in game/enemy.js, for
  // boss_phase_editor.html's miniboss branch. `mode: 'path'` patches only
  // the `.phases` sub-key of each named `*_DEF` const — unlike
  // BOSS_PHASE_CONFIG, these defs carry hand-written comments elsewhere in
  // the same object (base attacks, movement, defense notes), so a whole-
  // object replace would destroy them; only `.phases` is safe to blanket-
  // replace (miniboss phase lists are short enough that add/remove/
  // reorder is common, so per-index merging isn't worth it either).
  // Bespoke-class minibosses (ColossusCore, TemporalWarden — not built on
  // ComposedEnemy, no `.phases` array) intentionally have no entry here.
  minibossPhases_colossus_core: { mode: 'path', targetFile: path.join(REPO_ROOT, 'game', 'enemy.js'), declName: 'COLOSSUS_CORE_DEF' },
  minibossPhases_static_guardian: { mode: 'path', targetFile: path.join(REPO_ROOT, 'game', 'enemy.js'), declName: 'CONDUIT_DEF' },
  minibossPhases_hollow_guardian: { mode: 'path', targetFile: path.join(REPO_ROOT, 'game', 'enemy.js'), declName: 'MIRROR_KING_DEF' },
  minibossPhases_graviton_sentinel: { mode: 'path', targetFile: path.join(REPO_ROOT, 'game', 'enemy.js'), declName: 'GRAVITON_GUARD_DEF' },
  minibossPhases_paradox_engine: { mode: 'path', targetFile: path.join(REPO_ROOT, 'game', 'enemy.js'), declName: 'ASSEMBLER_DEF' },
  minibossPhases_timeline_keeper: { mode: 'path', targetFile: path.join(REPO_ROOT, 'game', 'enemy.js'), declName: 'STATIONMASTER_DEF' },
  minibossPhases_abyss_guardian: { mode: 'path', targetFile: path.join(REPO_ROOT, 'game', 'enemy.js'), declName: 'QUANTUM_PURSUER_DEF' },
  minibossPhases_warp_guardian: { mode: 'path', targetFile: path.join(REPO_ROOT, 'game', 'enemy.js'), declName: 'WARDEN_DEF' },
  minibossPhases_polar_guardian: { mode: 'path', targetFile: path.join(REPO_ROOT, 'game', 'enemy.js'), declName: 'ELECTROMAGNETIC_GOLEM_DEF' },
  minibossPhases_horizon_core: { mode: 'path', targetFile: path.join(REPO_ROOT, 'game', 'enemy.js'), declName: 'HORIZON_CORE_DEF' },
  minibossPhases_void_expanse_boss: { mode: 'path', targetFile: path.join(REPO_ROOT, 'game', 'enemy.js'), declName: 'UNDERTOW_DEF' },
  minibossPhases_antechamber_child: { mode: 'path', targetFile: path.join(REPO_ROOT, 'game', 'enemy.js'), declName: 'ANTECHAMBER_CHILD_DEF' },
  minibossPhases_abandoned_shell: { mode: 'path', targetFile: path.join(REPO_ROOT, 'game', 'enemy.js'), declName: 'ABANDONED_SHELL_DEF' },
  temporalWardenStatVar: {
    // Temporal Warden (chrono_ally) is the one remaining bespoke miniboss
    // class — its rewind/Stillpoint-resistance mechanics are an
    // intentional one-off, not generalized into ComposedEnemy's phase/
    // attack vocabulary (see game/enemy.js's comment above the class).
    // These are its plain top-level tunable scalar consts, addressable the
    // same way enemy_editor.html's `enemyStatVar` target already handles
    // other enemies' stat consts — a separate target (not folded into
    // `enemyStatVar`) since it's a different tool's own allowlist scope.
    mode: 'rawVar',
    targetFile: path.join(REPO_ROOT, 'game', 'enemy.js'),
    allowedVars: [
      'TEMPORAL_WARDEN_HEALTH',
      'TEMPORAL_WARDEN_REWIND_CYCLE', 'TEMPORAL_WARDEN_FLASH_WINDOW', 'TEMPORAL_WARDEN_INTERRUPT_DAMAGE',
      'TEMPORAL_WARDEN_RESIST_CAP', 'TEMPORAL_WARDEN_RESIST_STILLPOINT_USES',
      'TEMPORAL_WARDEN_BOLT_TELEGRAPH_FRAMES', 'TEMPORAL_WARDEN_BOLT_COOLDOWN', 'TEMPORAL_WARDEN_BOLT_SPEED', 'TEMPORAL_WARDEN_BOLT_DAMAGE',
      'TEMPORAL_WARDEN_KITE_DISTANCE', 'TEMPORAL_WARDEN_KITE_DEADZONE', 'TEMPORAL_WARDEN_KITE_SPEED',
    ],
  },
  regionStyles: {
    mode: 'path',
    targetFile: path.join(REPO_ROOT, 'game', 'game_entities.js'),
    declName: 'REGION_STYLES',
  },
  cutscenes: {
    mode: 'path',
    targetFile: path.join(REPO_ROOT, 'game', 'cutscene.js'),
    declName: 'CUTSCENES',
  },
  comboDefs: {
    // COMBO_DEFS is an array (`let COMBO_DEFS = [...]`), not an object —
    // elements are addressed by their stable `id` field, not array index
    // (index shifts whenever an earlier combo is added/removed/reordered).
    mode: 'arrayByKey',
    targetFile: path.join(REPO_ROOT, 'game', 'combo.js'),
    declName: 'COMBO_DEFS',
    idField: 'id',
  },
  enemyStatVar: {
    // enemy_editor.html's per-enemy stats aren't a single data const —
    // each one is a plain top-level `const NAME = N;` scalar in enemy.js
    // (e.g. `const LANCER_HEALTH = 10;`). Several enemy TYPES share the
    // same backing variable (e.g. ENEMY_ATTACK_COOLDOWN backs 7 different
    // enemies' attack cooldowns) — the editor is responsible for warning
    // about that before writing, this registry only enforces that the
    // renderer can never name an arbitrary variable, only one of these.
    mode: 'rawVar',
    targetFile: path.join(REPO_ROOT, 'game', 'enemy.js'),
    allowedVars: [
      'ENEMY_HEALTH', 'ENEMY_ATTACK_COOLDOWN', 'ENEMY_SPEED', 'ENEMY_PATROL_RANGE',
      'SENTINEL_HEALTH', 'SENTINEL_ATTACK_COOLDOWN', 'SENTINEL_SPEED', 'SENTINEL_PATROL_RANGE',
      'LANCER_HEALTH', 'LANCER_CHARGE_COOLDOWN', 'LANCER_SPEED',
      'ANCHOR_WRAITH_HEALTH', 'WRAITH_DRIFT_SPEED', 'ANCHOR_WRAITH_PATROL_RANGE',
      'DEFLECTOR_HEALTH', 'DEFLECTOR_HOVER_SPEED', 'DEFLECTOR_PATROL_RANGE',
      'SPRITE_HEALTH', 'STALKER_HEALTH',
    ],
  },
  composedEnemyDefNew: {
    // enemy_designer.html composes brand-new ComposedEnemy defs from
    // scratch (no "load an existing enemy" feature exists) — this target
    // only ever APPENDS a new `const <ID>_DEF = {...};` to enemy.js, never
    // overwrites one of the existing hand-tuned _DEF consts. That's
    // deliberate: several existing defs reference other named tunables
    // (e.g. `speed: LANCER_SPEED`) that enemy_editor.html's `enemyStatVar`
    // target writes to independently — a whole-object overwrite from this
    // designer would silently replace those references with hardcoded
    // literals and sever that link. Appending a new, never-before-seen
    // const name carries none of that risk. Note this only persists the
    // *data* — wiring a new class + spawn-registry entry for it is still
    // manual, same as before.
    mode: 'appendConst',
    targetFile: path.join(REPO_ROOT, 'game', 'enemy.js'),
    varNamePattern: /^[A-Z][A-Z0-9_]*_DEF$/,
  },
};

module.exports = { REPO_ROOT, TARGETS };
