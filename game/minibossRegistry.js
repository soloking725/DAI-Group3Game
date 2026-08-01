// minibossRegistry.js — id -> display name for every built miniboss.
//
// Mirrors game_state.js's MINIBOSS_CLASSES *keys* only (not the classes
// themselves) so tools that just need the built-miniboss count/roster (e.g.
// editor/dev_hub.html's Progress panel) don't have to load boss.js/enemy.js/
// player.js/game_state.js's full dependency chain just to read a table size —
// game_state.js does `document.getElementById('game').getContext('2d')`
// unconditionally at its top, which throws in any page without a live
// <canvas id="game"> (see Plans/project_progress_dashboard_plan.md §0).
//
// Hand-maintained — keep in sync with game_state.js's MINIBOSS_CLASSES
// whenever a miniboss is added/renamed. Same manual-sync caveat as
// hud_editor.html's DEFAULTS table vs. game_hud_menus.js's HUD_LAYOUT.
const MINIBOSS_REGISTRY = {
  colossus_core: 'Colossus Core',
  static_guardian: 'The Conduit',
  hollow_guardian: 'Mirror King',
  graviton_sentinel: 'Graviton Guard',
  paradox_engine: 'The Assembler',
  timeline_keeper: 'The Stationmaster',
  abyss_guardian: 'Quantum Pursuer',
  warp_guardian: 'Warden and Hollow',
  polar_guardian: 'Electromagnetic Golem',
  horizon_core: 'Horizon Core',
  chrono_ally: 'Temporal Warden',
  void_expanse_boss: 'Undertow',
  antechamber_child: 'The Child',
  abandoned_shell: 'Abandoned Shell',
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MINIBOSS_REGISTRY };
}
if (typeof window !== 'undefined') {
  window.MINIBOSS_REGISTRY = MINIBOSS_REGISTRY;
}
