#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// export_graph.js — generates a GraphML file (yEd-compatible) directly from
// area.js's live AREAS/connections[] data. No hand-maintained copy of the
// world graph: this script loads and executes the real area.js in a Node vm
// sandbox and reads AREAS back out, so the export can never drift from the
// code the game actually runs (the same "single source of truth" convention
// map.js's buildMapGraph() and area.js's validateAreaGraph() already use).
//
// Usage (run from this editor/ folder — 2026-07-16 reorg moved this file
// alongside the other dev tools, one level below area.js and the repo root):
//   node export_graph.js [path/to/area.js] [output.graphml]
//   node export_graph.js                      # defaults: ../game/area.js -> ../world_map.graphml
//
// Open the output file in yEd (Layout > One-Click layouts, or just drag
// nodes around — initial positions are seeded from col/row so it opens
// already laid out like the in-game compass map).
//
// What's in the file:
//   - One node per AREAS entry. Position from col/row (dev-only rooms with
//     no col/row, e.g. enemy_test_arena, are placed in a side column so they
//     don't collide with the real map). Fill color: red = boss arena,
//     orange = miniboss arena, otherwise a color per `region` (stable across
//     runs — same region always gets the same color).
//   - Every node also carries plain <data> fields (region, roomType,
//     abilityReward, enemies, miniboss) visible in yEd's Properties/Data
//     panel when you click a node — a lightweight stand-in for "tooltips."
//   - One edge per room.connections[] entry (the same array
//     validateAreaGraph() treats as the single source of truth for door
//     topology — not the raw `transitions[]` hitboxes). Symmetric two-way
//     doors between the same pair of rooms are merged into a single
//     undirected edge; asymmetric doors (one-way, shortcuts, or a locked
//     door with no reverse) are drawn as directed edges.
//   - Edge color by `requires` (ability gate): green = open, orange =
//     phase_dash, blue = shard_shot, purple = stillpoint, gold =
//     charged_attack, teal = tutorial_complete, red = anything else
//     (covers graviton_surge and any future ability). Shortcuts/one-way
//     doors are dashed.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const areaJsPath = path.resolve(process.argv[2] || path.join(__dirname, '../game/area.js'));
const outPath = path.resolve(process.argv[3] || path.join(__dirname, '../world_map.graphml'));

// ── Load the real AREAS object by actually running area.js ──────────────────
function loadAreas(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const sandbox = { console, readOverrideJSON() { return null; } };
  vm.createContext(sandbox);
  // Run area.js itself (defines `const AREAS = {...}` + calls validateAreaGraph()
  // at the bottom, which just console.logs/warns — harmless here).
  vm.runInContext(code, sandbox, { filename: filePath });
  // `const` top-level declarations aren't copied onto the sandbox object, but
  // they DO live in the context's persistent lexical environment, so a second
  // script run in the same context can read them straight back out.
  return vm.runInContext('AREAS', sandbox);
}

// ── XML escaping ─────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── Deterministic color per region string (so any future region gets a
// stable, distinct color without needing this script updated by hand) ──────
const REGION_PALETTE = ['#C4B5FD', '#5DCAA5', '#85B7EB', '#F0997B', '#ED93B1', '#FAC775', '#97C459'];
function colorForRegion(region) {
  let hash = 0;
  for (let i = 0; i < region.length; i++) hash = (hash * 31 + region.charCodeAt(i)) >>> 0;
  return REGION_PALETTE[hash % REGION_PALETTE.length];
}

const REQUIRES_COLOR = {
  null: '#639922',            // open — green
  phase_dash: '#BA7517',      // orange
  shard_shot: '#378ADD',      // blue
  stillpoint: '#7F77DD',      // purple
  charged_attack: '#EF9F27',  // gold
  tutorial_complete: '#5DCAA5', // teal
};
function colorForRequires(requires) {
  return REQUIRES_COLOR[requires || 'null'] || '#E24B4A'; // red fallback — covers graviton_surge & anything future
}

// ── Build nodes ───────────────────────────────────────────────────────────
function buildNodes(AREAS) {
  const nodes = [];
  let devCol = 0;
  const GRID = 220; // px spacing to match yEd's default zoom reasonably
  for (const id in AREAS) {
    const room = AREAS[id];
    const hasGrid = typeof room.col === 'number' && typeof room.row === 'number';
    const x = hasGrid ? room.col * GRID : -3 * GRID;
    const y = hasGrid ? room.row * GRID : (devCol++ ) * GRID;

    let fill = colorForRegion(room.region || 'unassigned');
    if (room.roomType === 'boss' || room.isBossArena) fill = '#E24B4A';
    else if (room.roomType === 'miniboss' || room.isMinibossArena) fill = '#EF9F27';

    const enemyTypes = Array.from(new Set((room.enemies || []).map(e => e.type)));
    nodes.push({
      id,
      label: room.name || id,
      x, y,
      fill,
      region: room.region || 'unassigned',
      roomType: room.roomType || (room.isBossArena ? 'boss' : (room.isMinibossArena ? 'miniboss' : 'room')),
      abilityReward: room.abilityReward ? room.abilityReward.name : '',
      miniboss: room.miniboss || '',
      enemies: enemyTypes.join(', '),
      devOnly: !hasGrid,
    });
  }
  return nodes;
}

// ── Build edges from connections[] — merge symmetric two-way pairs into one
// undirected edge, keep asymmetric/one-way/shortcut doors directed ─────────
function buildEdges(AREAS) {
  const doors = []; // { from, to, direction, requires, oneWay, shortcut }
  for (const id in AREAS) {
    const room = AREAS[id];
    if (!room.connections) continue;
    for (const conn of room.connections) {
      doors.push({ from: id, to: conn.to, direction: conn.direction, requires: conn.requires || null, oneWay: !!conn.oneWay, shortcut: !!conn.shortcut });
    }
  }

  const byPair = new Map(); // 'a|b' sorted -> [door, ...]
  for (const d of doors) {
    const key = [d.from, d.to].sort().join('|');
    if (!byPair.has(key)) byPair.set(key, []);
    byPair.get(key).push(d);
  }

  const edges = [];
  let edgeId = 0;
  for (const [key, group] of byPair) {
    if (group.length === 2) {
      const [a, b] = group;
      const symmetric = !a.oneWay && !b.oneWay && !a.shortcut && !b.shortcut && a.requires === b.requires;
      if (symmetric) {
        edges.push({
          id: `e${edgeId++}`, source: a.from, target: a.to,
          directed: false, requires: a.requires, oneWay: false, shortcut: false,
          label: a.direction + ' <-> ' + b.direction,
        });
        continue;
      }
      // Asymmetric pair (e.g. differing requires each way) — emit both as directed.
      for (const d of group) {
        edges.push({
          id: `e${edgeId++}`, source: d.from, target: d.to,
          directed: true, requires: d.requires, oneWay: d.oneWay, shortcut: d.shortcut, label: d.direction,
        });
      }
    } else {
      // Single-sided (one-way, shortcut, or a door with no reverse yet)
      for (const d of group) {
        edges.push({
          id: `e${edgeId++}`, source: d.from, target: d.to,
          directed: true, requires: d.requires, oneWay: d.oneWay, shortcut: d.shortcut, label: d.direction,
        });
      }
    }
  }
  return edges;
}

// ── GraphML (yFiles-flavored, so yEd renders shapes/colors/labels directly) ─
function toGraphML(nodes, edges) {
  const nodeKeys = `
    <key id="d_label" for="node" attr.name="label" attr.type="string"/>
    <key id="d_region" for="node" attr.name="region" attr.type="string"/>
    <key id="d_roomType" for="node" attr.name="roomType" attr.type="string"/>
    <key id="d_ability" for="node" attr.name="abilityReward" attr.type="string"/>
    <key id="d_miniboss" for="node" attr.name="miniboss" attr.type="string"/>
    <key id="d_enemies" for="node" attr.name="enemies" attr.type="string"/>
    <key id="d_ngraphics" for="node" yfiles.type="nodegraphics"/>
    <key id="d_erequires" for="edge" attr.name="requires" attr.type="string"/>
    <key id="d_oneway" for="edge" attr.name="oneWay" attr.type="boolean"/>
    <key id="d_shortcut" for="edge" attr.name="shortcut" attr.type="boolean"/>
    <key id="d_egraphics" for="edge" yfiles.type="edgegraphics"/>`;

  const nodeXml = nodes.map(n => {
    const shape = n.devOnly ? 'roundrectangle' : (n.roomType === 'boss' ? 'octagon' : (n.roomType === 'miniboss' ? 'diamond' : 'rectangle'));
    return `
    <node id="${esc(n.id)}">
      <data key="d_label">${esc(n.label)}</data>
      <data key="d_region">${esc(n.region)}</data>
      <data key="d_roomType">${esc(n.roomType)}</data>
      <data key="d_ability">${esc(n.abilityReward)}</data>
      <data key="d_miniboss">${esc(n.miniboss)}</data>
      <data key="d_enemies">${esc(n.enemies)}</data>
      <data key="d_ngraphics">
        <y:ShapeNode>
          <y:Geometry height="60" width="140" x="${n.x}" y="${n.y}"/>
          <y:Fill color="${n.fill}" transparent="false"/>
          <y:BorderStyle color="#2C2C2A" type="line" width="1.0"/>
          <y:NodeLabel alignment="center" fontSize="11" modelName="internal" modelPosition="c">${esc(n.label)}</y:NodeLabel>
          <y:Shape type="${shape}"/>
        </y:ShapeNode>
      </data>
    </node>`;
  }).join('');

  const edgeXml = edges.map(e => {
    const color = colorForRequires(e.requires);
    const lineType = (e.oneWay || e.shortcut) ? 'dashed' : 'line';
    const targetArrow = 'standard';
    const sourceArrow = e.directed ? 'none' : 'none';
    const label = e.requires ? e.requires : (e.shortcut ? 'shortcut' : 'open');
    return `
    <edge id="${esc(e.id)}" source="${esc(e.source)}" target="${esc(e.target)}" directed="${e.directed}">
      <data key="d_erequires">${esc(e.requires || '')}</data>
      <data key="d_oneway">${e.oneWay}</data>
      <data key="d_shortcut">${e.shortcut}</data>
      <data key="d_egraphics">
        <y:PolyLineEdge>
          <y:LineStyle color="${color}" type="${lineType}" width="1.5"/>
          <y:Arrows source="${sourceArrow}" target="${e.directed ? targetArrow : 'none'}"/>
          <y:EdgeLabel alignment="center" fontSize="9">${esc(label)}</y:EdgeLabel>
        </y:PolyLineEdge>
      </data>
    </edge>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xmlns:y="http://www.yworks.com/xml/graphml"
         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://www.yworks.com/xml/schema/graphml/1.1/ygraphml.xsd">
  ${nodeKeys}
  <graph id="stillpoint_world" edgedefault="directed">${nodeXml}${edgeXml}
  </graph>
</graphml>
`;
}

function main() {
  const AREAS = loadAreas(areaJsPath);
  const nodes = buildNodes(AREAS);
  const edges = buildEdges(AREAS);
  const xml = toGraphML(nodes, edges);
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log(`Wrote ${nodes.length} rooms, ${edges.length} edges -> ${outPath}`);
}

main();
