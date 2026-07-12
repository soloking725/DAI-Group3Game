// Map overlay — press M during play to toggle full-screen map.
//
// Layout and connections are GENERATED from area.js's compass graph
// (room.col/row + room.connections) — see the "COMPASS GRAPH" section at the
// bottom of area.js. Nothing here is hand-authored anymore; editing a room's
// connections in area.js is the only place that needs to change for the map
// to stay correct.

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

function drawMap(ctx, currentAreaId, discoveredAreas, stillpointActivated) {
  ctx.fillStyle = 'rgba(8, 8, 14, 0.94)';
  ctx.fillRect(0, 0, W, H);

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

  function cellCenter(id) {
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

  // Rooms
  ctx.textAlign = 'center';
  for (const id in layout) {
    if (!discoveredAreas[id]) continue;
    const l = layout[id];
    const cx = originX + (l.col - minCol) * cellW + cellW / 2;
    const cy = originY + l.row * cellH + cellH / 2;
    const rw = cellW - 18;
    const rh = cellH - 16;
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
    if (stillpointActivated[id]) {
      ctx.fillStyle = '#c4b5fd';
      ctx.beginPath();
      ctx.arc(cx - rw / 2 + 10, cy - rh / 2 + 10, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = isCurrent ? '#e0d7ff' : '#8888aa';
    const labelSize = cellW < 90 ? 8 : 10;
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

  ctx.fillStyle = '#8a8ab0';
  ctx.font = '12px "Courier New", monospace';
  ctx.fillText('STILLPOINT  —  MAP', W / 2, 18);
  ctx.font = '10px "Courier New", monospace';
  ctx.fillStyle = '#4a4a6e';
  ctx.fillText('M or ESC to close', W / 2, H - 16);
  ctx.textAlign = 'left';
}
