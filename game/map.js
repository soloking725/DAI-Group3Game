// Map overlay — press M during play to toggle full-screen map.
//
// Layout and connections are GENERATED from area.js's compass graph
// (room.col/row + room.connections) — see the "COMPASS GRAPH" section at the
// bottom of area.js. Nothing here is hand-authored anymore; editing a room's
// connections in area.js is the only place that needs to change for the map
// to stay correct.

// Hand-laid-out positions from the user's Whimsical world-map board
// (svg.txt), extracted via Plans/parse_worldmap_svg.js — matches room boxes
// in the SVG export to real AREAS[] rooms by name, so the in-game map
// reflects the actual planned spatial layout/clusters instead of a rigid
// col/row grid (which forces 13 regions into squares and produces overlaps).
// Re-run that script after any board re-export to regenerate Plans/map_layout.json,
// then paste the result back in here — this is intentionally hardcoded data,
// not fetched at runtime (see CLAUDE.md: "don't try to make this fully
// automatic," a couple of rooms needed a manual nudge after the script's
// first pass). Rooms with no entry here (currently just the dev-only
// enemy_test_arena, which has no col/row and never reaches buildMapGraph
// anyway) fall back to the old col/row grid below.
const MAP_LAYOUT_SVG = {
  the_fracture_part1: { x: 30, y: 136 },
  the_fracture_part3: { x: -26, y: 115 }, the_fracture_part2: { x: -3, y: 266 },
  chrono_rift_gate: { x: -107, y: 66 }, mirror_veil_reflection: { x: 427, y: 98 },
  mirror_veil_sanctum: { x: 382, y: 164 }, event_horizon_pull: { x: 563, y: 287 },
  event_horizon_drift: { x: 659, y: 386 }, inverted_spire: { x: 717, y: 606 },
  event_horizon_core: { x: 717, y: 493 }, event_horizon_gate: { x: 461, y: 287 },
  mirror_corridor: { x: 382, y: 287 }, mirror_veil_hollow: { x: 461, y: 164 },
  timeline_x_roads_room2: { x: 356, y: 526 }, timeline_x_roads_room1: { x: 161, y: 577 },
  puppet_strings_part2: { x: 589, y: 538 }, puppet_strings_part1: { x: 589, y: 461 },
  mirror_veil_gate: { x: 307, y: 217 }, echo_bridge_prison: { x: 441, y: 402 },
  crystal_cavern: { x: 142, y: 478 }, observatory_room1: { x: -26, y: 679 },
  observatory_room2: { x: -114, y: 478 }, observatory_room3: { x: -257, y: 480 },
  void_expanse_room1: { x: -282, y: 258 }, sovereign_observatory: { x: -395, y: 452 },
  the_vault_room2: { x: 143, y: 861 }, antechamber: { x: -33, y: 984 },
  hollow_core: { x: 128, y: 984 }, the_rift: { x: -96, y: 861 },
  graviton_core_room3: { x: 515, y: 843 }, try_out_region: { x: 971, y: 979 },
  sovereign_army_reserve: { x: 681, y: 979 }, graviton_core_room2: { x: 565, y: 695 },
  graviton_core_room1: { x: 397, y: 668 }, the_vault_room1: { x: 63, y: 767 },
  the_forge: { x: 143, y: 668 }, echo_bridge_part1: { x: -26, y: 401 },
  upper_ruins: { x: 227, y: 323 }, pacifist_region: { x: 221, y: 255 },
  tutorial_area: { x: 16, y: 16 }, spawn_area_1: { x: -70, y: 16 },
  crag_entrance: { x: 132, y: 146 }, crag_breach: { x: 213, y: 179 },
  crag_altar: { x: 124, y: 248 }, crag_warden: { x: 124, y: 344 },
  sovereign_room1: { x: 221, y: 109 }, chrono_rift_loop1: { x: -311, y: 577 },
  chrono_rift_echo: { x: -313, y: 91 }, chrono_rift_loop2: { x: -526, y: 289 },
  warp_gate_nexus_room1: { x: -55, y: 274 }, one_way_warp_gate_to_inverted_spire: { x: -55, y: 371 },
  one_way_teleport_gate_to_paradox_engine: { x: -42, y: 170 }, sovereign_room2: { x: 252, y: 668 },
  echoing_abyss_room2: { x: 15, y: 515 }, echoing_abyss_room1: { x: 11, y: 472 },
  sovereign_room3: { x: 48, y: 290 }, static_field_room1: { x: -376, y: 981 },
  static_field_room2: { x: -272, y: 981 }, paradox_engine_room2: { x: -376, y: 871 },
  teleport_from_paradox_engine_to_upper_ruins_1: { x: 173, y: 260 }, paradox_engine_room1: { x: -479, y: 826 },
  polar_shift_room1: { x: -311, y: 710 }, polar_shift_room2: { x: -440, y: 700 },
  sovereign_room4: { x: -156, y: 671 }, the_fracture_part4: { x: 54, y: 232 },
  timeline_x_roads_room3: { x: 245, y: 450 }, chrono_rift_sanctum: { x: 161, y: 284 },
  void_expanse_room2: { x: -214, y: 382 }, warp_gate_nexus_room2: { x: 202, y: 417 },
  spawn_area_2: { x: -33, y: 900 }, tutorial_final: { x: 107, y: 592 },
};

let _mapGraphCache = null;

// Builds { layout, connections, doors } from AREAS. Cached — AREAS is static
// data, never mutated at runtime, so this only needs to run once.
function buildMapGraph() {
  if (_mapGraphCache) return _mapGraphCache;

  const layout = {};
  const connectionPairs = new Map(); // 'a|b' (sorted) -> [a, b], deduped
  const doors = []; // per-direction door records, used for lock/'?' markers

  for (const id in AREAS) {
    const room = AREAS[id];
    if (typeof room.col !== 'number' || typeof room.row !== 'number') continue; // not yet migrated
    layout[id] = {
      col: room.col,
      row: room.row,
      label: room.name,
      region: room.region || 'origin',
      roomType: room.roomType || (room.isBossArena ? 'boss' : 'room'),
      mapAccent: room.mapAccent || null,
    };
  }

  for (const id in AREAS) {
    const room = AREAS[id];
    if (!room.connections) continue;
    for (const conn of room.connections) {
      doors.push({ from: id, to: conn.to, direction: conn.direction, requires: conn.requires, oneWay: conn.oneWay });
      const key = [id, conn.to].sort().join('|');
      if (!connectionPairs.has(key)) connectionPairs.set(key, [id, conn.to]);
    }
  }

  _mapGraphCache = { layout, connections: Array.from(connectionPairs.values()), doors };
  return _mapGraphCache;
}

// Mirrors the `requires` gate checks in game.js (switchArea/draw transition
// filtering). Kept here too since the map needs to know lock state without
// depending on game.js's internals. Ability ids not yet implemented (e.g.
// graviton_surge) simply read as always-locked until they're added — safe,
// no crash, and the door just stays a visible "locked" hint until then.
function isRequirementMet(requires) {
  if (!requires) return true;
  if (requires === 'phase_dash') return !!abilityState.hasPhaseDash;
  if (requires === 'shard_shot') return !!abilityState.hasShardShot;
  if (requires === 'stillpoint') return !!abilityState.hasStillpoint;
  if (requires === 'charged_attack') return !!abilityState.hasChargedAttack;
  if (requires === 'graviton_surge') return !!abilityState.hasGravitonSurge; // future ability
  if (requires === 'boss_gate') return !!(abilityState.hasPhaseDash && abilityState.hasShardShot && abilityState.hasStillpoint);
  if (requires === 'tutorial_complete') return typeof isTutorialComplete === 'function' ? isTutorialComplete() : true;
  return false; // unknown requirement string — treat as locked, not silently open
}

// Pan/zoom state for the full map view (game.js owns input handling — see
// the 'mapOpen' block there — this module just applies whatever it sets).
// Lets ~70 rooms actually be seen without everything clamping to a
// minimum-readable-size floor and crowding together (see the "needs
// scrollable/zoomable" comments below, now addressed for real).
const mapView = { zoom: 1, panX: 0, panY: 0 };
function resetMapView() { mapView.zoom = 1; mapView.panX = 0; mapView.panY = 0; }

function drawMap(ctx, currentAreaId, discoveredAreas, anchorActivated) {
  ctx.fillStyle = 'rgba(8, 8, 14, 0.94)';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(W / 2 + mapView.panX, H / 2 + mapView.panY);
  ctx.scale(mapView.zoom, mapView.zoom);
  ctx.translate(-W / 2, -H / 2);

  const graph = buildMapGraph();
  const layout = graph.layout;

  // Bounding box of the graph, so the grid centers itself regardless of how
  // many regions/rows exist — no hardcoded column count.
  let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
  for (const id in layout) {
    const l = layout[id];
    minCol = Math.min(minCol, l.col); maxCol = Math.max(maxCol, l.col);
    minRow = Math.min(minRow, l.row); maxRow = Math.max(maxRow, l.row);
  }
  const colSpan = Math.max(1, maxCol - minCol + 1);
  const rowSpan = Math.max(1, maxRow - minRow + 1);

  // Cell size shrinks to fit the canvas as more regions are added. Once the
  // graph is wide/tall enough that cells hit the readability floor, this
  // grid needs to become scrollable/zoomable instead — flagging that now as
  // a known limitation for whenever the 10+ region plan lands, not solved here.
  const PADDING = 40;
  const MIN_CELL_W = 46, MIN_CELL_H = 34;
  const cellW = Math.max(MIN_CELL_W, Math.min(120, Math.floor((W - PADDING) / colSpan)));
  const cellH = Math.max(MIN_CELL_H, Math.min(70, Math.floor((H - 80) / rowSpan)));

  const originX = W / 2 - (colSpan / 2) * cellW;
  const originY = 30 - minRow * cellH;

  // Bounding box of MAP_LAYOUT_SVG's hand-laid-out positions, scaled/
  // translated to fit the same canvas region the grid uses above. At ~70
  // rooms on an 800x450 canvas, room boxes clamp to a small minimum size and
  // a handful of tightly-clustered rooms (e.g. inside Chrono-Space Rift)
  // still crowd/lightly overlap — same "needs scrollable/zoomable" ceiling
  // already flagged for the old grid mode above, not something this fixes.
  let svgMinX = Infinity, svgMaxX = -Infinity, svgMinY = Infinity, svgMaxY = -Infinity;
  for (const id in layout) {
    const p = MAP_LAYOUT_SVG[id];
    if (!p) continue;
    svgMinX = Math.min(svgMinX, p.x); svgMaxX = Math.max(svgMaxX, p.x);
    svgMinY = Math.min(svgMinY, p.y); svgMaxY = Math.max(svgMaxY, p.y);
  }
  const svgSpanX = Math.max(1, svgMaxX - svgMinX);
  const svgSpanY = Math.max(1, svgMaxY - svgMinY);
  const svgScale = Math.min((W - PADDING * 2) / svgSpanX, (H - 100) / svgSpanY);
  const svgOriginX = PADDING + (W - PADDING * 2 - svgSpanX * svgScale) / 2;
  const svgOriginY = 40 + (H - 100 - svgSpanY * svgScale) / 2;

  function cellCenter(id) {
    const p = MAP_LAYOUT_SVG[id];
    if (p) {
      return {
        x: svgOriginX + (p.x - svgMinX) * svgScale,
        y: svgOriginY + (p.y - svgMinY) * svgScale,
      };
    }
    const l = layout[id];
    if (!l) return null;
    return {
      x: originX + (l.col - minCol) * cellW + cellW / 2,
      y: originY + l.row * cellH + cellH / 2,
    };
  }

  // Connection lines (only between two discovered rooms)
  ctx.strokeStyle = 'rgba(106, 106, 142, 0.4)';
  ctx.lineWidth = 2;
  for (const [a, b] of graph.connections) {
    if (!discoveredAreas[a] || !discoveredAreas[b]) continue;
    const ca = cellCenter(a), cb = cellCenter(b);
    if (!ca || !cb) continue;
    ctx.beginPath();
    ctx.moveTo(ca.x, ca.y);
    ctx.lineTo(cb.x, cb.y);
    ctx.stroke();
  }

  // Room box size in SVG-layout mode is decoupled from the grid's cellW/H
  // (a different coordinate system entirely) — derived from the same scale
  // factor instead, clamped to stay readable at this board's density.
  const svgRoomW = Math.max(30, Math.min(80, svgScale * 90));
  const svgRoomH = Math.max(20, Math.min(50, svgScale * 60));

  // Rooms
  ctx.textAlign = 'center';
  for (const id in layout) {
    if (!discoveredAreas[id]) continue;
    const l = layout[id];
    const center = cellCenter(id);
    if (!center) continue;
    const cx = center.x, cy = center.y;
    const usingSvgLayout = !!MAP_LAYOUT_SVG[id];
    const rw = usingSvgLayout ? svgRoomW : cellW - 18;
    const rh = usingSvgLayout ? svgRoomH : cellH - 16;
    const isCurrent = id === currentAreaId;

    ctx.fillStyle = isCurrent ? 'rgba(196, 181, 253, 0.22)' : 'rgba(38, 38, 58, 0.6)';
    ctx.strokeStyle = isCurrent ? '#c4b5fd'
      : (l.roomType === 'boss') ? '#f87171'
      : (l.roomType === 'miniboss') ? '#fb923c'
      : l.mapAccent ? l.mapAccent
      : '#4a4a6e';
    ctx.lineWidth = isCurrent ? 2 : 1;
    ctx.fillRect(cx - rw / 2, cy - rh / 2, rw, rh);
    ctx.strokeRect(cx - rw / 2, cy - rh / 2, rw, rh);

    // Stillpoint pip inside room box
    if (anchorActivated[id]) {
      ctx.fillStyle = '#c4b5fd';
      ctx.beginPath();
      ctx.arc(cx - rw / 2 + 10, cy - rh / 2 + 10, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = isCurrent ? '#e0d7ff' : '#8888aa';
    const labelSize = rw < 90 ? 8 : 10;
    ctx.font = `${labelSize}px "Courier New", monospace`;
    let label = l.label;
    while (ctx.measureText(label).width > rw - 4 && label.length > 3) {
      label = label.slice(0, -2) + '…';
    }
    ctx.fillText(label, cx, cy + 4);

    // You-are-here marker
    if (isCurrent) {
      ctx.fillStyle = '#67e8f9';
      ctx.font = '12px monospace';
      ctx.fillText('▲', cx, cy + rh / 2 - 5);
    }
  }

  // Markers on undiscovered rooms adjacent to a discovered one: '?' if the
  // door to reach them is currently usable, a lock glyph if it's gated
  // behind an ability the player doesn't have yet (discovered-but-locked,
  // per the non-linear-exploration design note in expansion.md §3.14).
  const pending = {}; // undiscovered room id -> { open: bool, locked: bool }
  for (const door of graph.doors) {
    if (discoveredAreas[door.from] && !discoveredAreas[door.to]) {
      const rec = pending[door.to] || (pending[door.to] = { open: false, locked: false });
      if (isRequirementMet(door.requires)) rec.open = true; else rec.locked = true;
    }
  }
  for (const targetId in pending) {
    const cu = cellCenter(targetId);
    if (!cu) continue;
    const rec = pending[targetId];
    if (rec.open) {
      ctx.font = '15px monospace';
      ctx.fillStyle = 'rgba(106, 106, 142, 0.38)';
      ctx.fillText('?', cu.x, cu.y + 5);
    } else if (rec.locked) {
      ctx.font = '13px monospace';
      ctx.fillStyle = 'rgba(248, 113, 113, 0.55)';
      ctx.fillText('\u{1F512}', cu.x, cu.y + 5); // 🔒
    }
  }

  ctx.restore();

  // Title/hint bar drawn OUTSIDE the pan/zoom transform so it stays fixed
  // and readable regardless of view state.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a8ab0';
  ctx.font = '12px "Courier New", monospace';
  ctx.fillText('STILLPOINT  —  MAP', W / 2, 18);
  ctx.font = '10px "Courier New", monospace';
  ctx.fillStyle = '#4a4a6e';
  ctx.fillText('Arrows/WASD pan   +/- zoom   0 reset   M or ESC to close', W / 2, H - 16);
  ctx.textAlign = 'left';
}
