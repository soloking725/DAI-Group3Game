// roomDesignScore.js — shared SHELL/started/designed scoring logic.
//
// Extracted 2026-07-29 out of Plans/room_progress.js so that file's Node CLI
// and editor/dev_hub.html's live Progress panel can't silently drift apart
// on what counts as "designed" (the same class of bug graph_analyzer.html
// used to have vs. validateAreaGraph() — see CLAUDE.md). Pure, no fs/
// vm/DOM dependency — works as a plain <script> tag (browser) or via
// require() (Node).

const ROOM_DESIGN_DOOR_H = 72; // must match Plans/rebuild_levels_from_svg.js's FLOOR_H/DOOR_H

function analyzeRoomDesignState(r) {
  const groundY = r.groundY;
  const plats = r.platforms || [];
  const floorY = groundY;
  const defaultDoorY = groundY - ROOM_DESIGN_DOOR_H;
  const defaultPickY = groundY - 40;

  const nonFloor = plats.filter((p) => !(p.y === floorY && p.x === 0 && p.w === r.width && !p.wall && !p.ceiling && !p.hazard && !p.oneWay && !p.moving && !p.crumble));
  const specialPlats = plats.filter((p) => p.hazard || p.oneWay || p.moving || p.crumble || p.wall || p.ceiling || p.destructible);

  const enemies = (r.enemies || []).length;
  const doorsMoved = (r.transitions || []).filter((t) => t.y !== defaultDoorY).length;
  const ceilingDoors = (r.transitions || []).filter((t) => t.y <= 20).length;
  const placeables = []
    .concat(r.fracturePipRewards || [], r.loreFragments || [], r.cosmeticUpgrades || [], r.healingCrystals || []);
  const placeablesMoved = placeables.filter((o) => o.y !== defaultPickY).length;
  const anchorsMoved = (r.anchors || []).filter((a) => a.y !== groundY - 20).length;

  let score = 0;
  score += Math.min(nonFloor.length, 6);
  score += specialPlats.length ? 2 : 0;
  score += Math.min(enemies, 4);
  score += doorsMoved ? 1 : 0;
  score += ceilingDoors ? 1 : 0;
  score += placeablesMoved ? 1 : 0;
  score += anchorsMoved ? 1 : 0;

  const state = score === 0 ? 'SHELL' : score <= 3 ? 'started' : 'designed';
  return {
    id: r.id, name: r.name, region: r.region, type: r.roomType || 'room', size: `${r.width}x${r.roomHeight}`,
    nonFloor: nonFloor.length, specialPlats: specialPlats.length, enemies, doorsMoved, ceilingDoors,
    placeablesMoved, anchorsMoved, score, state,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { analyzeRoomDesignState, ROOM_DESIGN_DOOR_H };
}
if (typeof window !== 'undefined') {
  window.analyzeRoomDesignState = analyzeRoomDesignState;
}
