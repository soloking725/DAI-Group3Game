// =====================================================================
// bootDependencyCheck.js — loud, specific boot-time sanity check
// =====================================================================
// Load order in index.html *is* the dependency graph (see CLAUDE.md's
// Architecture map) — nothing enforces it. A missing/misordered <script>
// tag today fails as a cryptic ReferenceError wherever the missing global
// first gets touched, which can be several files and several seconds
// away from the actual cause. This file is the last <script> tag loaded
// (after game_draw_loop.js) and checks a small, hand-picked set of
// high-fanout globals actually exist by the time boot finishes, so a bad
// tag reads as one clear line naming exactly what's missing instead.
//
// Deliberately NOT exhaustive — game_state.js alone has 100+ top-level
// bindings; checking all of them would be noise, not signal. This list
// is the ones that are either depended on by many other files, or have
// already caused a real incident (readOverrideJSON — see
// Plans/engineering_todo.md §7, duplication item 10's tail, where 3 Node
// CLI tools silently broke for a while after overrideStore.js was added).
//
// Same "console-log a clear verdict on load" convention
// validateAreaGraph()/roomVerify.js's auto-run already use. Never throws
// — a bug in this file must not be able to break the game itself, same
// reasoning readOverrideJSON's fail-to-null design already applies.
//
// This does NOT replace Plans/check_script_order.js (the static linter
// counterpart) — that one catches a bad order before the game ever runs;
// this one is the runtime fallback for whatever it doesn't cover.
(function () {
  const CHECKS = [
    { what: 'AREAS', ownerFile: 'area.js', test: () => typeof AREAS !== 'undefined' },
    { what: 'RoomVerify', ownerFile: 'roomVerify.js', test: () => typeof RoomVerify !== 'undefined' },
    { what: 'readOverrideJSON', ownerFile: 'overrideStore.js', test: () => typeof readOverrideJSON === 'function' },
    { what: 'ANIM_DEFS', ownerFile: 'animdata.js', test: () => typeof ANIM_DEFS !== 'undefined' },
    { what: 'abilityState', ownerFile: 'ability.js', test: () => typeof abilityState !== 'undefined' },
    { what: 'COMBO_DEFS', ownerFile: 'combo.js', test: () => typeof COMBO_DEFS !== 'undefined' },
    { what: 'CUTSCENES', ownerFile: 'cutscene.js', test: () => typeof CUTSCENES !== 'undefined' },
    { what: 'SFX', ownerFile: 'audio.js', test: () => typeof SFX !== 'undefined' },
    { what: 'keys', ownerFile: 'input.js', test: () => typeof keys !== 'undefined' },
    { what: 'Player', ownerFile: 'player.js', test: () => typeof Player === 'function' },
    { what: 'Boss', ownerFile: 'boss.js', test: () => typeof Boss === 'function' },
    { what: 'ComposedEnemy', ownerFile: 'enemy.js', test: () => typeof ComposedEnemy === 'function' },
    { what: 'HUD_LAYOUT', ownerFile: 'game_hud_menus.js', test: () => typeof HUD_LAYOUT !== 'undefined' },
  ];

  let failCount = 0;
  for (const c of CHECKS) {
    let ok = false;
    try { ok = !!c.test(); } catch (e) { ok = false; }
    if (!ok) {
      failCount++;
      console.error(
        `[boot-check] MISSING: ${c.what} — expected from ${c.ownerFile}. ` +
        `A <script> tag may be missing, out of order, or ${c.ownerFile} failed to parse — ` +
        `check the console above for the real error.`
      );
    }
  }

  if (failCount === 0) {
    console.log(`[boot-check] OK — ${CHECKS.length}/${CHECKS.length} core globals present`);
  } else {
    console.error(`[boot-check] ${failCount}/${CHECKS.length} FAILED — see above`);
  }
})();
