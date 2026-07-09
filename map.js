// Map overlay — press M during play to toggle full-screen map.
// Logical grid layout mirrors the new linear world spine.

const MAP_LAYOUT = {
  the_fracture:    { col: 0, row: 1, label: 'The Fracture' },
  echo_bridge:     { col: 1, row: 1, label: 'Echo Bridge' },
  upper_ruins:     { col: 2, row: 0, label: 'Upper Ruins' },
  crystal_cavern:  { col: 2, row: 1, label: 'Crystal Cavern' },
  the_forge:       { col: 2, row: 2, label: 'The Forge' },
  the_vault:       { col: 2, row: 3, label: 'The Vault' },
  the_rift:        { col: 2, row: 4, label: 'The Rift' },
  antechamber:     { col: 2, row: 5, label: 'Antechamber' },
  boss_arena:      { col: 2, row: 6, label: 'The Fractured King' },
};

const MAP_CONNECTIONS = [
  ['the_fracture',   'echo_bridge'],
  ['echo_bridge',    'upper_ruins'],
  ['echo_bridge',    'crystal_cavern'],
  ['crystal_cavern', 'the_forge'],
  ['the_forge',      'the_vault'],
  ['the_vault',      'the_rift'],
  ['the_rift',       'antechamber'],
  ['antechamber',    'boss_arena'],
];

function drawMap(ctx, currentAreaId, discoveredAreas, stillpointActivated) {
  ctx.fillStyle = 'rgba(8, 8, 14, 0.94)';
  ctx.fillRect(0, 0, W, H);

  const cellW = 120, cellH = 70;
  const originX = W / 2 - 1.5 * cellW;
  const originY = 30;

  function cellCenter(id) {
    const l = MAP_LAYOUT[id];
    if (!l) return null;
    return {
      x: originX + l.col * cellW + cellW / 2,
      y: originY + l.row * cellH + cellH / 2,
    };
  }

  // Connection lines (only between two discovered rooms)
  ctx.strokeStyle = 'rgba(106, 106, 142, 0.4)';
  ctx.lineWidth = 2;
  for (const [a, b] of MAP_CONNECTIONS) {
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
  for (const id in MAP_LAYOUT) {
    if (!discoveredAreas[id]) continue;
    const l = MAP_LAYOUT[id];
    const cx = originX + l.col * cellW + cellW / 2;
    const cy = originY + l.row * cellH + cellH / 2;
    const rw = cellW - 18;
    const rh = cellH - 16;
    const isCurrent = id === currentAreaId;
    const area = AREAS[id];

    ctx.fillStyle = isCurrent ? 'rgba(196, 181, 253, 0.22)' : 'rgba(38, 38, 58, 0.6)';
    ctx.strokeStyle = isCurrent ? '#c4b5fd'
      : (area && area.isBossArena) ? '#f87171'
      : (id === 'upper_ruins') ? '#fbbf24'
      : '#4a4a6e';
    ctx.lineWidth = isCurrent ? 2 : 1;
    ctx.fillRect(cx - rw / 2, cy - rh / 2, rw, rh);
    ctx.strokeRect(cx - rw / 2, cy - rh / 2, rw, rh);

    // Stillpoint pip inside room box
    const spKey = id;
    if (stillpointActivated[spKey]) {
      ctx.fillStyle = '#c4b5fd';
      ctx.beginPath();
      ctx.arc(cx - rw / 2 + 10, cy - rh / 2 + 10, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = isCurrent ? '#e0d7ff' : '#8888aa';
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText(l.label, cx, cy + 4);

    // You-are-here marker
    if (isCurrent) {
      ctx.fillStyle = '#67e8f9';
      ctx.font = '12px monospace';
      ctx.fillText('▲', cx, cy + rh / 2 - 5);
    }
  }

  // "?" markers on undiscovered rooms adjacent to known ones
  ctx.font = '15px monospace';
  for (const [a, b] of MAP_CONNECTIONS) {
    let unknown = null;
    if (discoveredAreas[a] && !discoveredAreas[b]) unknown = b;
    else if (discoveredAreas[b] && !discoveredAreas[a]) unknown = a;
    if (!unknown) continue;
    const cu = cellCenter(unknown);
    if (!cu) continue;
    ctx.fillStyle = 'rgba(106, 106, 142, 0.38)';
    ctx.fillText('?', cu.x, cu.y + 5);
  }

  ctx.fillStyle = '#8a8ab0';
  ctx.font = '12px "Courier New", monospace';
  ctx.fillText('STILLPOINT  —  MAP', W / 2, 18);
  ctx.font = '10px "Courier New", monospace';
  ctx.fillStyle = '#4a4a6e';
  ctx.fillText('M or ESC to close', W / 2, H - 16);
  ctx.textAlign = 'left';
}