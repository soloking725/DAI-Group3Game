#!/usr/bin/env node
// Parses svg.txt (a Whimsical board export — the hand-laid-out world map
// the user built, with proper spacing/clusters/no overlaps) and produces a
// best-effort MAP_LAYOUT table: { areaId: { x, y } } in map.js's coordinate
// space, by matching each SVG room box to a real AREAS[] room name.
//
// This is NOT a fully-automatic, trust-blindly tool — Whimsical board text
// doesn't always match area.js's `name` field exactly (abbreviations,
// hyphens, missing "Part N" suffixes, annotation-only boxes that aren't
// rooms at all). It prints match/no-match reports so a human can sanity-
// check and hand-fix the misses, per CLAUDE.md's "don't try to make this
// fully automatic" guidance — re-run this after any board re-export instead
// of hand-copying coordinates again.
//
// Usage: node Plans/parse_worldmap_svg.js [--out=Plans/map_layout.json]

const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'svg.txt');
const areaPath = path.join(__dirname, '..', 'game', 'area.js');

const svg = fs.readFileSync(svgPath, 'utf8');

// ── 1. Pull real room ids/names out of area.js (regex, not eval — area.js
// has runtime dependencies we don't want to load here). ──
const areaSrc = fs.readFileSync(areaPath, 'utf8');
const rooms = []; // { id, name }
{
  const re = /^\s{2}([a-zA-Z0-9_]+):\s*\{\s*$/gm;
  let m;
  const idPositions = [];
  while ((m = re.exec(areaSrc))) idPositions.push({ id: m[1], idx: m.index });
  for (let i = 0; i < idPositions.length; i++) {
    const start = idPositions[i].idx;
    const end = i + 1 < idPositions.length ? idPositions[i + 1].idx : areaSrc.length;
    const block = areaSrc.slice(start, end);
    const nameMatch = block.match(/name:\s*'([^']+)'/);
    if (nameMatch) rooms.push({ id: idPositions[i].id, name: nameMatch[1] });
  }
}
console.log(`Parsed ${rooms.length} rooms from area.js`);

// ── 2. Parse <rect> boxes (x,y,w,h) ──
const rectRe = /<rect ([^>]*)\/>/g;
const rects = [];
let rm;
while ((rm = rectRe.exec(svg))) {
  const attrs = rm[1];
  const num = (name) => {
    const mm = attrs.match(new RegExp(name + '="([\\-\\d.]+)"'));
    return mm ? parseFloat(mm[1]) : null;
  };
  const x = num('x'), y = num('y'), w = num('width'), h = num('height');
  if (x === null || y === null || w === null || h === null) continue;
  rects.push({ x, y, w, h, area: w * h });
}
console.log(`Parsed ${rects.length} rects`);

// ── 3. Parse <text><tspan x=.. y=..>content</tspan></text> lines ──
const textRe = /<text[^>]*><tspan x="([\-\d.]+)" y="([\-\d.]+)"[^>]*>([^<]*)<\/tspan><\/text>/g;
const textLines = [];
let tm;
while ((tm = textRe.exec(svg))) {
  const x = parseFloat(tm[1]), y = parseFloat(tm[2]), content = tm[3].trim();
  if (!content) continue;
  textLines.push({ x, y, content });
}
console.log(`Parsed ${textLines.length} non-empty text lines`);

// ── 4. For each text line, find the smallest rect whose box contains it ──
function enclosingRect(t) {
  let best = null;
  for (const r of rects) {
    if (t.x >= r.x && t.x <= r.x + r.w && t.y >= r.y - 40 && t.y <= r.y + r.h) {
      if (!best || r.area < best.area) best = r;
    }
  }
  return best;
}

// Group text lines by their enclosing rect; the topmost (smallest y) line
// in each group is treated as the room's title.
const rectGroups = new Map(); // rect (by identity via index) -> lines[]
const rectIndexOf = new Map();
rects.forEach((r, i) => rectIndexOf.set(r, i));

for (const t of textLines) {
  const r = enclosingRect(t);
  if (!r) continue;
  const key = rectIndexOf.get(r);
  if (!rectGroups.has(key)) rectGroups.set(key, { rect: r, lines: [] });
  rectGroups.get(key).lines.push(t);
}

const candidates = [];
for (const { rect, lines } of rectGroups.values()) {
  lines.sort((a, b) => a.y - b.y);
  const title = lines[0].content;
  candidates.push({ rect, title, allLines: lines.map((l) => l.content) });
}
console.log(`Grouped into ${candidates.length} labeled boxes`);

// ── 5. Fuzzy-match candidate titles against real room names ──
function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
const roomsByNorm = rooms.map((r) => ({ ...r, norm: normalize(r.name) }));

function bestMatch(title) {
  const nt = normalize(title);
  if (!nt) return null;
  // Exact normalized match first.
  let hit = roomsByNorm.find((r) => r.norm === nt);
  if (hit) return { room: hit, score: 1 };
  // Substring match (title is a prefix/abbreviation of the real name, or vice versa).
  hit = roomsByNorm.find((r) => r.norm.startsWith(nt) || nt.startsWith(r.norm));
  if (hit) return { room: hit, score: 0.8 };
  // Word-overlap score.
  const words = new Set(nt.split(' '));
  let best = null, bestScore = 0;
  for (const r of roomsByNorm) {
    const rw = new Set(r.norm.split(' '));
    let overlap = 0;
    for (const w of words) if (rw.has(w)) overlap++;
    const score = overlap / Math.max(words.size, rw.size);
    if (score > bestScore) { bestScore = score; best = r; }
  }
  if (best && bestScore >= 0.6) return { room: best, score: bestScore };
  return null;
}

const matched = {}; // areaId -> { x, y, w, h, title, score }
const unmatchedCandidates = [];
const matchedRoomIds = new Set();

for (const c of candidates) {
  const m = bestMatch(c.title);
  if (m && !matchedRoomIds.has(m.room.id)) {
    matchedRoomIds.add(m.room.id);
    matched[m.room.id] = {
      x: c.rect.x + c.rect.w / 2,
      y: c.rect.y + c.rect.h / 2,
      w: c.rect.w,
      h: c.rect.h,
      title: c.title,
      score: m.score,
    };
  } else {
    unmatchedCandidates.push(c.title);
  }
}

const unmatchedRooms = rooms.filter((r) => !matchedRoomIds.has(r.id));

console.log(`\nMatched ${Object.keys(matched).length}/${rooms.length} real rooms.`);
console.log(`\n${unmatchedRooms.length} real rooms with NO matching SVG box (need manual placement or aren't on the board):`);
unmatchedRooms.forEach((r) => console.log(`  - ${r.id} ("${r.name}")`));
console.log(`\n${unmatchedCandidates.length} SVG boxes that didn't match any real room (likely annotations/cluster labels, not rooms):`);
unmatchedCandidates.slice(0, 40).forEach((t) => console.log(`  - "${t}"`));
if (unmatchedCandidates.length > 40) console.log(`  ... and ${unmatchedCandidates.length - 40} more`);

// ── 6. Scale into map.js's coordinate space and write output ──
// SVG board is 10196x7148 (viewBox). Scale down to a friendly coordinate
// range; map.js can use these as direct pixel offsets (with its own
// centering/zoom logic) instead of the col/row grid, when present.
const SVG_W = 10196, SVG_H = 7148;
const TARGET_W = 1600, TARGET_H = 1200; // arbitrary friendly space; map.js normalizes at draw time
const scaleX = TARGET_W / SVG_W, scaleY = TARGET_H / SVG_H;

const MAP_LAYOUT = {};
for (const id in matched) {
  const m = matched[id];
  MAP_LAYOUT[id] = {
    x: Math.round(m.x * scaleX),
    y: Math.round(m.y * scaleY),
  };
}

const outArg = process.argv.find((a) => a.startsWith('--out='));
const outPath = outArg ? outArg.slice('--out='.length) : path.join(__dirname, 'map_layout.json');
fs.writeFileSync(outPath, JSON.stringify(MAP_LAYOUT, null, 2));
console.log(`\nWrote ${Object.keys(MAP_LAYOUT).length} positions to ${outPath}`);

// Full-fidelity version (keeps each matched box's real w/h, not just its
// center point) — used by the standalone world-map preview, which has room
// to actually render proportional box sizes the way the original board
// looks, unlike the in-game overlay's fixed 800x450 canvas.
const MAP_LAYOUT_FULL = {};
for (const id in matched) {
  const m = matched[id];
  MAP_LAYOUT_FULL[id] = {
    x: Math.round(m.x * scaleX), y: Math.round(m.y * scaleY),
    w: Math.round(m.w * scaleX), h: Math.round(m.h * scaleY),
  };
}
const fullOutPath = path.join(path.dirname(outPath), path.basename(outPath, '.json') + '_full.json');
fs.writeFileSync(fullOutPath, JSON.stringify(MAP_LAYOUT_FULL, null, 2));
console.log(`Wrote ${Object.keys(MAP_LAYOUT_FULL).length} full (x,y,w,h) boxes to ${fullOutPath}`);
