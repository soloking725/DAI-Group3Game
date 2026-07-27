#!/usr/bin/env node
// =====================================================================
// rebuild_levels_from_svg.js  —  re-runnable level scaffolder
// =====================================================================
// Rebuilds every room's GEOMETRY, TOPOLOGY, DOORS and PLACEABLES in
// game/area.js from two authoritative sources:
//
//   • svg.txt             — the Whimsical world board (relative sizes +
//                           spatial layout). Drives room width/roomHeight
//                           (a "ruler" scale), door DIRECTIONS, and the
//                           compass grid seed.
//   • Plans/floor_plan.md — the placement spec (per-room lore pips, fracture
//                           pips, rare cosmetic upgrades, ability unlocks,
//                           fast-travel, minibosses).
//
// It surgically replaces ONLY the `const AREAS = { ... };` literal and
// leaves every validator/helper/export below it untouched.
//
//   node Plans/rebuild_levels_from_svg.js --dry   # diagnostics + in-memory
//                                                  # validation, no write
//   node Plans/rebuild_levels_from_svg.js         # writes game/area.js
//
// Confirmed design (2026-07-17): true-2D sizing (width AND roomHeight from
// the board), enemies left empty, "stillpoints" = rest/checkpoint anchors,
// full SVG-driven rebuild of col/row + door directions. Every door is a
// FLOOR-LEVEL walk-in doorway (a side-scroller renders up/down as a doorway,
// not a literal ceiling hole) — so all doors stay physically reachable;
// vertical (N/S) doors carry edgeExempt so the compass validator still
// passes, and non-grid-adjacent links carry shortcut:true.
// =====================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const AREA_PATH = path.join(ROOT, 'game', 'area.js');
const SVG_PATH = path.join(ROOT, 'svg.txt');
const FLOOR_PLAN_PATH = path.join(ROOT, 'Plans', 'floor_plan.md');
const DRY = process.argv.includes('--dry');

// ── Ruler / layout constants ─────────────────────────────────────────
const TARGET_MEDIAN_WIDTH = 1300;
const MIN_WIDTH = 1000, MIN_WIDTH_STUB = 600, MAX_WIDTH = 12000;
const MIN_ROOM_HEIGHT = 560, MAX_ROOM_HEIGHT = 8000;
const FLOOR_H = 60;
const DOOR_W = 60, DOOR_H = 72;
const DOOR_MARGIN = 24;      // px inset from a side edge for the edge door
const DOOR_GAP = 90;         // min horizontal spacing between doorways
const STUB_ROOMS = new Set([
  'one_way_teleport_gate_to_paradox_engine',
  'one_way_warp_gate_to_inverted_spire',
  'teleport_from_paradox_engine_to_upper_ruins_1',
]);
const SKIP_ROOMS = new Set(['enemy_test_arena']); // dev-only, left as-is

const OPP = (d) => ({ north: 'south', south: 'north', east: 'west', west: 'east' }[d]);
const DELTA = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };

// ── 1. Load live AREAS ───────────────────────────────────────────────
const areaSrc = fs.readFileSync(AREA_PATH, 'utf8');
const sandbox = { window: { addEventListener() {} }, console: { log() {}, warn() {}, error() {} } };
vm.createContext(sandbox);
vm.runInContext(areaSrc, sandbox, { filename: 'area.js' });
const AREAS = sandbox.window.AREAS;
if (!AREAS) { console.error('Could not load AREAS'); process.exit(1); }
const roomIds = Object.keys(AREAS);
console.log(`Loaded ${roomIds.length} rooms`);

// ── 2. Parse svg.txt → boxes matched to room ids (topmost line = title) ─
function parseSvgBoxes() {
  const svg = fs.readFileSync(SVG_PATH, 'utf8');
  const rects = [];
  let rm; const rectRe = /<rect ([^>]*)\/>/g;
  while ((rm = rectRe.exec(svg))) {
    const a = rm[1];
    const num = (n) => { const m = a.match(new RegExp(n + '="([\\-\\d.]+)"')); return m ? parseFloat(m[1]) : null; };
    const x = num('x'), y = num('y'), w = num('width'), h = num('height');
    if (x === null || y === null || w === null || h === null) continue;
    rects.push({ x, y, w, h, area: w * h });
  }
  const textLines = [];
  let tm; const textRe = /<text[^>]*><tspan x="([\-\d.]+)" y="([\-\d.]+)"[^>]*>([^<]*)<\/tspan><\/text>/g;
  while ((tm = textRe.exec(svg))) {
    const x = parseFloat(tm[1]), y = parseFloat(tm[2]), content = tm[3].trim();
    if (content) textLines.push({ x, y, content });
  }
  const idxOf = new Map(); rects.forEach((r, i) => idxOf.set(r, i));
  const encl = (t) => { let b = null; for (const r of rects) { if (t.x >= r.x && t.x <= r.x + r.w && t.y >= r.y - 40 && t.y <= r.y + r.h) { if (!b || r.area < b.area) b = r; } } return b; };
  const groups = new Map();
  for (const t of textLines) { const r = encl(t); if (!r) continue; const k = idxOf.get(r); if (!groups.has(k)) groups.set(k, { rect: r, lines: [] }); groups.get(k).lines.push(t); }
  const candidates = [];
  // A room's NAME can wrap across several tspans ("Chrono Space Rift," +
  // "Sanctum"); annotation lines always start with "(". So the title is every
  // leading line up to the first annotation — using only lines[0] truncates the
  // name and fuzzy-matches the wrong room.
  for (const { rect, lines } of groups.values()) {
    lines.sort((a, b) => a.y - b.y);
    const all = lines.map((l) => l.content);
    const nameLines = [];
    for (const l of all) { if (/^[("“]/.test(l.trim())) break; nameLines.push(l); }
    candidates.push({ rect, title: (nameLines.length ? nameLines : [all[0]]).join(' '), all });
  }
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const byNorm = roomIds.map((id) => ({ id, norm: norm(AREAS[id].name || id) }));
  const boxes = {}; const taken = new Set();
  const put = (id, c) => {
    taken.add(id);
    boxes[id] = { x: c.rect.x, y: c.rect.y, w: c.rect.w, h: c.rect.h, cx: c.rect.x + c.rect.w / 2, cy: c.rect.y + c.rect.h / 2, lines: c.all };
  };
  const free = () => byNorm.filter((r) => !taken.has(r.id));
  // Phased matching. EXACT normalized names must all be claimed before any
  // fuzzy pass runs — otherwise a connector-annotation box ("Teleport from
  // Chrono Space Rift - Sanctum") word-overlap-steals the real room and the
  // actual "Chrono Space Rift, Sanctum" box cascades onto the wrong room.
  const rest = [];
  for (const c of candidates) {
    const nt = norm(c.title);
    const hit = nt && free().find((r) => r.norm === nt);
    if (hit) put(hit.id, c); else rest.push(c);
  }
  const rest2 = [];
  for (const c of rest) {
    const nt = norm(c.title);
    const hit = nt && free().find((r) => r.norm.startsWith(nt) || nt.startsWith(r.norm));
    if (hit) put(hit.id, c); else rest2.push(c);
  }
  for (const c of rest2) {
    const nt = norm(c.title);
    if (!nt) continue;
    // Connector/annotation boxes describe a LINK, not a room — don't let them
    // fuzzy-claim a real room (the exact passes above already caught the
    // teleport/warp boxes that genuinely ARE rooms).
    if (/^(teleport|one way|entry|locked)/i.test(c.title.trim())) continue;
    const words = new Set(nt.split(' ')); let bb = null, bs = 0;
    for (const r of free()) { const rw = new Set(r.norm.split(' ')); let ov = 0; for (const w of words) if (rw.has(w)) ov++; const sc = ov / Math.max(words.size, rw.size); if (sc > bs) { bs = sc; bb = r; } }
    if (bb && bs >= 0.6) put(bb.id, c);
  }
  return boxes;
}
const boxes = parseSvgBoxes();
const matched = roomIds.filter((id) => boxes[id]);
const unmatched = roomIds.filter((id) => !boxes[id] && !SKIP_ROOMS.has(id));
console.log(`Matched ${matched.length} to SVG; inferring ${unmatched.length}: ${unmatched.join(', ')}`);

// ── 3. Infer boxes for unmatched rooms from a matched neighbour ──────
const STEP = 600;
const declaredDir = (a, b) => { const c = (AREAS[a].connections || []).find((c) => c.to === b); return c ? c.direction : null; };
for (let pass = 0; pass < 5; pass++) {
  for (const id of unmatched) {
    if (boxes[id]) continue;
    for (const c of (AREAS[id].connections || [])) {
      if (!boxes[c.to]) continue;
      const nb = boxes[c.to];
      const dToward = declaredDir(c.to, id) || (c.direction ? OPP(c.direction) : 'south');
      const v = DELTA[dToward] || [0, 1];
      boxes[id] = { w: nb.w, h: nb.h, cx: nb.cx + v[0] * STEP, cy: nb.cy + v[1] * STEP, x: nb.cx + v[0] * STEP - nb.w / 2, y: nb.cy + v[1] * STEP - nb.h / 2, inferred: true };
      break;
    }
  }
}
const laidOut = roomIds.filter((id) => boxes[id]);

// ── 4. Ruler ─────────────────────────────────────────────────────────
const sortedW = matched.map((id) => boxes[id].w).sort((a, b) => a - b);
const medianW = sortedW[Math.floor(sortedW.length / 2)];
const K = TARGET_MEDIAN_WIDTH / medianW;
function sizeOf(id) {
  const b = boxes[id];
  if (!b) { const g = AREAS[id].groundY || 390; return { width: AREAS[id].width || 1000, roomHeight: g + 100 }; }
  const minW = STUB_ROOMS.has(id) ? MIN_WIDTH_STUB : MIN_WIDTH;
  return {
    width: Math.max(minW, Math.min(MAX_WIDTH, Math.round(b.w * K))),
    roomHeight: Math.max(MIN_ROOM_HEIGHT, Math.min(MAX_ROOM_HEIGHT, Math.round(b.h * K))),
  };
}

// ── 5. Direction per ordered connection, from SVG geometry ───────────
function svgDir(a, b, fallback) {
  const A = boxes[a], B = boxes[b];
  if (!A || !B) return fallback;
  const dx = B.cx - A.cx, dy = B.cy - A.cy;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return fallback;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'east' : 'west';
  return dy >= 0 ? 'south' : 'north';
}

// ── 6. Build the connection set: keep flags, fix directions, add reverses ─
// conns[id] = [{ to, direction, requires, oneWay, shortcut(pending) }]
// The board is the source of truth for connectivity + layout (per the user).
// Directions come from the board geometry (svgDir); genuinely long links fall
// out as fast tunnels (shortcut) via the BFS-adjacency test below. We keep the
// authored requires/oneWay flags and the set of connections (which mirrors the
// board's lines), repair col/row, add missing reverses, and reposition doors.
const conns = {};
for (const id of roomIds) conns[id] = [];
const seen = new Set();
for (const id of roomIds) {
  for (const c of (AREAS[id].connections || [])) {
    conns[id].push({ to: c.to, direction: svgDir(id, c.to, c.direction), requires: c.requires || null, oneWay: !!c.oneWay, shortcut: !!c.shortcut });
    seen.add(id + '>' + c.to);
  }
}
// Synthesize the reverse of every two-way connection that lacks one.
for (const id of roomIds) {
  for (const c of AREAS[id].connections || []) {
    if (c.oneWay) continue;
    if (!seen.has(c.to + '>' + id) && AREAS[c.to] && !SKIP_ROOMS.has(c.to)) {
      const dir = svgDir(c.to, id, OPP(svgDir(id, c.to, c.direction)));
      conns[c.to].push({ to: id, direction: dir, requires: null, oneWay: false, shortcut: !!c.shortcut });
      seen.add(c.to + '>' + id);
    }
  }
}
// Keep reverse pairs on opposite compass axes: if A->B is 'east' but B->A also
// resolved to 'east' (board diagonal noise), flip the reverse to the opposite.
for (const id of roomIds) {
  for (const c of conns[id]) {
    const back = (conns[c.to] || []).find((r) => r.to === id);
    if (back && back.direction === c.direction) back.direction = OPP(c.direction);
  }
}
// De-dup exact duplicate connections (same to+direction) keeping the first.
for (const id of roomIds) {
  const kept = []; const s = new Set();
  for (const c of conns[id]) { const k = c.to + '|' + c.direction; if (s.has(k)) continue; s.add(k); kept.push(c); }
  conns[id] = kept;
}

// ── 7. col/row via BFS spanning tree using the SVG directions ────────
const gridPos = {};
const root = AREAS.spawn_area_1 ? 'spawn_area_1' : laidOut[0];
gridPos[root] = { col: 0, row: 0 };
const q = [root]; const tree = new Set();
while (q.length) {
  const id = q.shift();
  for (const c of conns[id]) {
    if (SKIP_ROOMS.has(c.to)) continue;
    if (c.shortcut) continue;         // deliberate non-adjacent link; not a tree edge
    if (gridPos[c.to]) continue;
    const d = DELTA[c.direction];
    gridPos[c.to] = { col: gridPos[id].col + d[0], row: gridPos[id].row + d[1] };
    tree.add(id + '>' + c.to); tree.add(c.to + '>' + id);
    q.push(c.to);
  }
}
// Any room the BFS didn't reach (disconnected) — seed from SVG-quantized pos.
for (const id of roomIds) {
  if (gridPos[id] || SKIP_ROOMS.has(id)) continue;
  gridPos[id] = { col: Math.round((boxes[id]?.cx || 0) / (medianW || 1)), row: Math.round((boxes[id]?.cy || 0) / (medianW || 1)) };
}
// Mark a connection shortcut when its endpoints aren't 1 grid-cell apart in
// its direction (i.e. it's not a clean spanning-tree edge).
function isAdjacent(id, c) {
  const g = gridPos[id], t = gridPos[c.to];
  if (!g || !t) return false;
  const d = DELTA[c.direction];
  return t.col === g.col + d[0] && t.row === g.row + d[1];
}

// ── 8. Assign door x-slots per room (all doors are floor-level) ──────
// west→left, east→right (first of each on the true side edge, not exempt),
// north/south→spread across the middle (edgeExempt). Distinct x, no overlap.
function assignDoors(id) {
  const size = sizeOf(id);
  const W = size.width, groundY = size.roomHeight - FLOOR_H;
  const list = conns[id];
  const doorY = groundY - DOOR_H;
  const wests = list.filter((c) => c.direction === 'west');
  const easts = list.filter((c) => c.direction === 'east');
  const mids = list.filter((c) => c.direction === 'north' || c.direction === 'south');
  const placed = new Map(); // conn -> {x, edgeExempt}
  wests.forEach((c, i) => placed.set(c, { x: i === 0 ? 0 : DOOR_MARGIN + i * DOOR_GAP, exempt: i !== 0 }));
  easts.forEach((c, i) => placed.set(c, { x: i === 0 ? W - DOOR_W : W - DOOR_W - DOOR_MARGIN - i * DOOR_GAP, exempt: i !== 0 }));
  // middle band, kept clear of the side clusters
  const leftBound = Math.max(DOOR_GAP, (wests.length ? DOOR_MARGIN + wests.length * DOOR_GAP : DOOR_GAP)) + 30;
  const rightBound = W - DOOR_W - (easts.length ? DOOR_MARGIN + easts.length * DOOR_GAP : DOOR_GAP) - 30;
  const span = Math.max(0, rightBound - leftBound);
  mids.forEach((c, i) => {
    const t = mids.length === 1 ? 0.5 : i / (mids.length - 1);
    placed.set(c, { x: Math.round(leftBound + span * t), exempt: true });
  });
  return { placed, size, groundY };
}
const doorPlan = {};
for (const id of roomIds) if (!SKIP_ROOMS.has(id)) doorPlan[id] = assignDoors(id);

// ── 9. Placeable spec from floor_plan.md node annotations ────────────
const ABILITY_CATALOG = {
  charged_attack: { name: 'Charged Attack', desc: 'Hold attack to charge a heavy strike.' },
  shard_shot: { name: 'Shard Shot', desc: 'Fire a ranged shard projectile.' },
  phase_dash: { name: 'Phase Dash', desc: 'Invulnerable dash through hazards and gates.' },
  stillpoint: { name: 'Stillpoint', desc: 'Slow the world to a crawl.' },
  graviton_surge: { name: 'Graviton Surge', desc: 'Reverse gravity briefly.' },
  void_tether: { name: 'Void Tether', desc: 'Tether-assisted traversal.' },
};
const UNLOCK_RE = [
  [/charged attack/i, 'charged_attack'], [/shard shot/i, 'shard_shot'],
  [/phase dash/i, 'phase_dash'], [/stillpoint/i, 'stillpoint'],
  [/grav[it]+on surge/i, 'graviton_surge'], [/void tether/i, 'void_tether'],
];
// The BOARD is the source of truth for placeables: each room box carries its
// own annotation lines, e.g. "(1 Lore Pip)", "(1 cosmetic upgrade)",
// "(unlocks Shard Shot)". Lines like "(locked by 4 Fracture Pips and 10 Lore
// Pips)" are a GATE on that room, not a placement, and are skipped.
function parseBoardPlaceables() {
  const spec = {};
  const amount = (line, noun) => {
    const re = new RegExp('(\\d+)?\\s*' + noun, 'gi');
    let m, total = 0;
    while ((m = re.exec(line))) total += m[1] ? parseInt(m[1], 10) : 1;
    return total;
  };
  for (const id of roomIds) {
    const b = boxes[id];
    if (!b || !b.lines) continue;
    const s = { cosmetic: 0, lorePip: 0, fracturePip: 0, unlocks: new Set(), miniboss: false, fastTravel: false, gate: null };
    for (const raw of b.lines) {
      const line = raw.trim();
      if (/locked by/i.test(line)) { s.gate = line; continue; } // a gate, not a placement
      s.lorePip += amount(line, 'lore\\s*pips?');
      s.fracturePip += amount(line, 'fracture\\s*pips?');
      s.cosmetic += amount(line, 'cosmetic\\s*upgrades?');
      if (/miniboss/i.test(line)) s.miniboss = true;
      if (/fast travel/i.test(line)) s.fastTravel = true;
      if (/unlocks?\b/i.test(line)) {
        for (const [rx, aid] of UNLOCK_RE) if (rx.test(line)) s.unlocks.add(aid);
      }
    }
    spec[id] = s;
  }
  return spec;
}

function parseFloorPlan() {
  const md = fs.readFileSync(FLOOR_PLAN_PATH, 'utf8');
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const byNorm = roomIds.map((id) => ({ id, norm: norm(AREAS[id].name || id) }));
  const matchName = (label) => {
    const nt = norm(label.replace(/["“”]/g, '')); if (!nt) return null;
    let h = byNorm.find((r) => r.norm === nt); if (h) return h.id;
    h = byNorm.find((r) => r.norm.startsWith(nt) || nt.startsWith(r.norm)); if (h) return h.id;
    const words = new Set(nt.split(' ')); let bb = null, bs = 0;
    for (const r of byNorm) { const rw = new Set(r.norm.split(' ')); let ov = 0; for (const w of words) if (rw.has(w)) ov++; const sc = ov / Math.max(words.size, rw.size); if (sc > bs) { bs = sc; bb = r; } }
    return bb && bs >= 0.55 ? bb.id : null;
  };
  const spec = {};
  const re = /\(?\["([^"]+)"\]\)?/g; let m;
  while ((m = re.exec(md))) {
    const parts = m[1].split(/<br>/i).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) continue;
    // some labels span 2 segments (e.g. "The Void Expanse," + "Room 1")
    let label = parts[0], rest = parts.slice(1);
    let id = matchName(label);
    if (!id && parts[1] && !/^\(/.test(parts[1])) { id = matchName(label + ' ' + parts[1]); rest = parts.slice(2); }
    if (!id) continue;
    const text = m[1];
    const s = spec[id] || (spec[id] = { cosmetic: 0, lorePip: 0, fracturePip: 0, unlocks: new Set(), fastTravel: false, miniboss: false });
    s.cosmetic = Math.max(s.cosmetic, (text.match(/cosmetic upgrade/gi) || []).length);
    s.lorePip = Math.max(s.lorePip, (text.match(/lore pip/gi) || []).length);
    s.fracturePip = Math.max(s.fracturePip, (text.match(/fracture pip/gi) || []).length);
    if (/fast travel/i.test(text)) s.fastTravel = true;
    if (/miniboss/i.test(text)) s.miniboss = true;
    // Only read the ability out of a segment that actually says "unlocks X" —
    // NOT one that says "entry requires X" (that's a gate, not a grant).
    for (const seg of parts) {
      if (!/unlocks?\b/i.test(seg)) continue;
      if (/entry requires|requires? /i.test(seg) && !/unlocks?\b/i.test(seg.split(/requires/i)[0])) continue;
      for (const [rx, aid] of UNLOCK_RE) if (rx.test(seg)) s.unlocks.add(aid);
    }
  }
  return spec;
}
const GENERATED_LORE_TEXT = 'TODO: lore pip text';
const boardSpec = parseBoardPlaceables();
const fpSpec = parseFloorPlan(); // fallback only, for rooms whose board box didn't match
const placeSpec = {};
for (const id of roomIds) {
  placeSpec[id] = (boxes[id] && boxes[id].lines) ? boardSpec[id] : (fpSpec[id] || boardSpec[id]);
}
// Which room the BOARD says owns each ability grant. An ability named on the
// board belongs to exactly that room — if some other room currently carries an
// authored pickup for it, that pickup is dropped (e.g. Void Tether was authored
// in Mirror Corridor but the board grants it in Timeline X Roads Rm 2, on the
// "give up the Child" branch).
const ABILITY_OWNER = {};
for (const id of roomIds) for (const aid of (placeSpec[id]?.unlocks || [])) if (!ABILITY_OWNER[aid]) ABILITY_OWNER[aid] = id;
// Reuse the nicest authored name/desc for an ability wherever it ends up.
const ABILITY_AUTHORED_TEXT = {};
for (const id of roomIds) { const a = AREAS[id].abilityReward; if (a && a.name) ABILITY_AUTHORED_TEXT[a.id] = { name: a.name, desc: a.desc }; }

// ── 10. Build one rebuilt room object ────────────────────────────────
const abbr = (id) => id.split('_').map((w) => w[0]).join('') + (id.match(/\d+/) ? id.match(/\d+/)[0] : '');
// Abilities already granted by a hand-authored pickup — never duplicate these
// from floor_plan.md's annotations.
const AUTHORED_ABILITIES = new Set(
  roomIds.map((id) => AREAS[id].abilityReward && AREAS[id].abilityReward.id).filter(Boolean)
);
// Explicit corrections to floor_plan.md-derived grants. Void Tether's real
// pickup is Mirror Corridor, granted only if you gave up the Child (or already
// had); Timeline X Roads Rm 2 is where that CHOICE happens, not a 2nd pickup.
// Kept as a named override so re-running the generator stays idempotent.
// Rooms that must NOT carry an ability pickup, because floor_plan.md names an
// ability there as an ENTRY GATE (or as a narrative choice), not a grant:
//   timeline_x_roads_room2 — where the Child choice happens; the Void Tether
//                            pickup itself is Mirror Corridor.
//   sovereign_observatory  — "entry requires Graviton Surge" (gate); its actual
//                            unlock is fast travel, and Graviton Surge's real
//                            pickup is graviton_core_room2.
const ABILITY_REWARD_REMOVALS = new Set(['timeline_x_roads_room2', 'sovereign_observatory']);
function markShortcut(id, c) {
  return c.shortcut || (!isAdjacent(id, c) && !tree.has(id + '>' + c.to));
}
function buildRoom(id) {
  const src = AREAS[id];
  if (SKIP_ROOMS.has(id)) return src; // dev room untouched
  const plan = doorPlan[id];
  const W = plan.size.width, H = plan.size.roomHeight, groundY = plan.groundY;
  const out = { ...src };
  delete out.lorePipRewards; // lore pips live in loreFragments (see below)
  out.width = W;
  out.roomHeight = H;
  out.groundY = groundY;
  if (gridPos[id]) { out.col = gridPos[id].col; out.row = gridPos[id].row; }
  out.platforms = [{ x: 0, y: groundY, w: W, h: FLOOR_H }];

  // transitions + connections, doorIndex aligned, order per-direction
  const list = conns[id];
  const orderCounter = {};
  out.transitions = [];
  out.connections = [];
  list.forEach((c, i) => {
    const p = plan.placed.get(c);
    const doorX = Math.max(0, Math.min(W - DOOR_W, Math.round(p.x)));
    const sc = markShortcut(id, c);
    const exempt = p.exempt && !sc; // shortcut already skips the edge check
    const tr = { x: doorX, y: groundY - DOOR_H, w: DOOR_W, h: DOOR_H, to: c.to, toX: 0, toY: 0 };
    if (c.requires) tr.requires = c.requires;
    out.transitions.push(tr);
    const ord = (orderCounter[c.direction] = (orderCounter[c.direction] || 0)); orderCounter[c.direction]++;
    const conn = { direction: c.direction, to: c.to, requires: c.requires || null, oneWay: !!c.oneWay, order: ord, doorIndex: i };
    if (sc) conn.shortcut = true;
    if (exempt) { conn.edgeExempt = true; conn.edgeExemptReason = 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'; }
    out.connections.push(conn);
  });

  // anchors (rest / checkpoint "stillpoints")
  const anchors = [{ x: Math.min(140, Math.round(W * 0.1)), y: groundY - 20, index: 0 }];
  if (W > 2600) anchors.push({ x: Math.round(W / 2), y: groundY - 20, index: anchors.length });
  if (W > 5200) anchors.push({ x: W - 200, y: groundY - 20, index: anchors.length });
  out.anchors = anchors;

  out.enemies = []; // encounter design done by hand later

  // ── placeables ──
  const spec = placeSpec[id] || {};
  const py = groundY - 40;
  let slot = 0; const nextX = () => { const x = Math.round(W * 0.28 + slot * 180); slot++; return Math.max(180, Math.min(W - 180, x)); };

  // ability reward: keep existing; only create a doc-driven one if that
  // ability isn't already granted by an authored room (Void Tether's real
  // pickup is Mirror Corridor, gated on the child choice — floor_plan.md also
  // mentions it on Timeline X Roads Rm 2, which is where the CHOICE happens,
  // not a second pickup).
  let reward = src.abilityReward ? { ...src.abilityReward } : null;
  // Drop an authored pickup the board assigns to a DIFFERENT room.
  if (reward && ABILITY_OWNER[reward.id] && ABILITY_OWNER[reward.id] !== id) reward = null;
  // Grant whatever the board says this room unlocks.
  const owned = Object.keys(ABILITY_OWNER).find((a) => ABILITY_OWNER[a] === id);
  if (owned && (!reward || reward.id !== owned)) {
    const t = ABILITY_AUTHORED_TEXT[owned] || ABILITY_CATALOG[owned];
    reward = { id: owned, name: t.name, desc: t.desc };
  }
  if (reward) { reward.x = Math.round(W * 0.5); reward.y = groundY - 60; }
  out.abilityReward = reward;

  // healing crystals: keep existing, reposition to the floor
  if ((src.healingCrystals || []).length) {
    out.healingCrystals = src.healingCrystals.map((h, n) => ({ id: h.id || `hc_${abbr(id)}_${n + 1}`, x: nextX(), y: py }));
  }
  // fracture pips
  // Board count is authoritative (pips carry no authored content to preserve).
  const fpN = spec.fracturePip || 0;
  if (fpN) out.fracturePipRewards = Array.from({ length: fpN }, (_, n) => ({ id: `fp_${abbr(id)}_${n + 1}`, x: nextX(), y: py }));
  else delete out.fracturePipRewards;
  // cosmetic upgrades (rare, doc-placed). No runtime code reads these yet —
  // they're placeholders, same status as area.js's header note.
  if (spec.cosmetic) out.cosmeticUpgrades = Array.from({ length: spec.cosmetic }, (_, n) => ({ id: `cu_${abbr(id)}_${n + 1}`, x: nextX(), y: py, name: 'Cosmetic Upgrade' }));
  // LORE PIPS **are** `loreFragments` — game.js collects each entry as a pip
  // that banks toward the Inventory stat upgrades (independent of
  // LORE_ENABLED, which only gates the old text-popup path). So doc-specified
  // lore pips are added here, NOT as a separate array.
  // Board count is authoritative, but never delete a fragment with real
  // authored text (only the generated TODO placeholders are re-derived).
  const authoredLore = (src.loreFragments || []).filter((l) => l.text !== GENERATED_LORE_TEXT);
  const loreTarget = Math.max(authoredLore.length, spec.lorePip || 0);
  if (loreTarget) {
    const lore = authoredLore.map((l) => ({ ...l, x: nextX(), y: py }));
    for (let n = lore.length; n < loreTarget; n++) {
      lore.push({ id: `lore_${abbr(id)}_${n + 1}`, x: nextX(), y: py, text: GENERATED_LORE_TEXT });
    }
    out.loreFragments = lore;
  } else delete out.loreFragments;

  return out;
}

// ── 11. Serialize to a JS object literal ─────────────────────────────
const KEY_ORDER = ['id', 'name', 'region', 'roomType', 'mapAccent', 'col', 'row', 'width', 'roomHeight', 'groundY', 'pitDeathY', 'bgColor', 'bgTint', 'ambientColor', 'expectedLoadout', 'platforms', 'transitions', 'connections', 'enemies', 'anchors', 'abilityReward', 'healingCrystals', 'fracturePipRewards', 'lorePipRewards', 'cosmeticUpgrades', 'loreFragments', 'fracturePipRewards'];
function serVal(v, ind) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : (v > 0 ? 'Infinity' : '-Infinity');
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'string') return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    const simple = v.every((e) => typeof e !== 'object' || e === null);
    if (simple) return '[' + v.map((e) => serVal(e, ind)).join(', ') + ']';
    const ni = ind + '  ';
    return '[\n' + v.map((e) => ni + serVal(e, ni)).join(',\n') + '\n' + ind + ']';
  }
  // object — one line if short
  const keys = Object.keys(v);
  const oneLine = '{ ' + keys.map((k) => `${k}: ${serVal(v[k], ind)}`).join(', ') + ' }';
  if (oneLine.length <= 90 && !oneLine.includes('\n')) return oneLine;
  const ni = ind + '  ';
  return '{\n' + keys.map((k) => ni + k + ': ' + serVal(v[k], ni)).join(',\n') + '\n' + ind + '}';
}
function serRoom(id, room) {
  const ind = '    ';
  const keys = [...new Set([...KEY_ORDER.filter((k) => k in room), ...Object.keys(room).filter((k) => !KEY_ORDER.includes(k))])];
  const body = keys.map((k) => ind + '  ' + k + ': ' + serVal(room[k], ind + '  ')).join(',\n');
  return `${ind}${id}: {\n${body}\n${ind}}`;
}
const rebuilt = {};
for (const id of roomIds) rebuilt[id] = buildRoom(id);

// Arrival points: land the player just above the TARGET room's floor, at the
// x of the door that leads back here (so you emerge at the matching doorway).
for (const id of roomIds) {
  if (SKIP_ROOMS.has(id)) continue;
  const room = rebuilt[id];
  for (const tr of room.transitions) {
    const tgt = rebuilt[tr.to];
    if (!tgt || SKIP_ROOMS.has(tr.to)) { tr.toX = 60; tr.toY = (tgt ? tgt.groundY : room.groundY) - 40; continue; }
    const back = (tgt.transitions || []).find((t) => t.to === id);
    tr.toX = back ? Math.max(60, Math.min(tgt.width - 60, back.x + DOOR_W / 2)) : Math.round(tgt.width / 2);
    tr.toY = tgt.groundY - 40;
  }
}
const literal = 'const AREAS = {\n' + roomIds.map((id) => serRoom(id, rebuilt[id])).join(',\n\n') + '\n};';

// ── 12. Splice into area.js (dynamic brace-matched span) ─────────────
function findAreasSpan(src) {
  const start = src.indexOf('const AREAS = {');
  if (start < 0) throw new Error('const AREAS not found');
  let i = src.indexOf('{', start), depth = 0, q = null;
  for (; i < src.length; i++) {
    const ch = src[i], prev = src[i - 1];
    if (q) { if (ch === q && prev !== '\\') q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  while (src[i] === ';') i++;
  return [start, i];
}
const [s0, s1] = findAreasSpan(areaSrc);
const newSrc = areaSrc.slice(0, s0) + literal + areaSrc.slice(s1);

// ── 13. In-memory validation ─────────────────────────────────────────
function validate(src, label) {
  const logs = [];
  const ctx = { window: { addEventListener() {} }, console: { log() {}, warn: (...a) => logs.push(['W', a.join(' ')]), error: (...a) => logs.push(['E', a.join(' ')]) } };
  vm.createContext(ctx);
  try { vm.runInContext(src, ctx, { filename: 'area.js' }); } catch (e) { console.log(`${label}: PARSE ERROR ${e.message}`); return; }
  try { vm.runInContext('validateAreaGraph();', ctx); } catch (e) { logs.push(['X', 'graph crash ' + e.message]); }
  try { vm.runInContext('validateAllRoomLayouts();', ctx); } catch (e) { logs.push(['X', 'layout crash ' + e.message]); }
  const E = logs.filter((l) => l[0] === 'E'), W = logs.filter((l) => l[0] === 'W');
  console.log(`${label}: ${E.length} errors, ${W.length} warnings`);
  const cls = {};
  for (const e of E) { const k = e[1].replace(/'[^']*'/g, "'X'").replace(/\([\-\d, ]+\)/g, '()').replace(/[0-9]+/g, 'N').slice(0, 70); cls[k] = (cls[k] || 0) + 1; }
  Object.entries(cls).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, n]) => console.log(`   ${String(n).padStart(3)}  ${k}`));
  return E.length;
}

module.exports = { AREAS, boxes, sizeOf, gridPos, conns, doorPlan, rebuilt, buildRoom, matched, unmatched, isAdjacent, K, medianW, placeSpec };

if (require.main === module) {
  console.log(`Ruler: medianW(svg)=${medianW.toFixed(0)} K=${K.toFixed(4)}`);
  let sc = 0, rev = 0, tot = 0;
  for (const id of roomIds) for (const c of conns[id]) { tot++; if (markShortcut(id, c)) sc++; }
  rev = tot - roomIds.reduce((n, id) => n + (AREAS[id].connections || []).length, 0);
  console.log(`Connections: ${tot} (+${rev} reverses), ${sc} tunnels/shortcuts`);
  console.log(`Void Expanse Rm1: ${JSON.stringify(sizeOf('void_expanse_room1'))}`);
  console.log(`Placeables from board: ${Object.keys(placeSpec).length} rooms tagged`);
  validate(areaSrc, 'BEFORE (current area.js)');
  validate(newSrc, 'AFTER  (rebuilt)');
  if (!DRY) {
    fs.copyFileSync(AREA_PATH, AREA_PATH + '.bak');
    fs.writeFileSync(AREA_PATH, newSrc);
    console.log(`\nWROTE ${AREA_PATH} (backup at area.js.bak)`);
  } else {
    console.log('\n(dry run — no file written)');
  }
}
