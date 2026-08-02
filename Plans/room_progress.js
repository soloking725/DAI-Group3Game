#!/usr/bin/env node
// =====================================================================
// room_progress.js — level-design progress report over game/area.js
// =====================================================================
// Read-only. Classifies every room as a bare Phase-20 scaffold vs. actually
// designed, so across months of level work you can see what's done and spot
// untouched rooms at a glance. No browser (per the repo rule) — pure Node.
//
//   node Plans/room_progress.js            # summary table, least-done first
//   node Plans/room_progress.js --full     # + per-room detail lines
//   node Plans/room_progress.js --todo     # only rooms still untouched
//
// "Designed signals" (each nudges a room from shell → in-progress → done):
//   • platforms beyond the single generated full-width floor
//   • enemies placed
//   • a door moved off the default floor line (or up to a ceiling = a real
//     vertical shaft)
//   • placeables/anchors moved off their generated default Y
// A room with none of these is still a scaffold.
// =====================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { analyzeRoomDesignState } = require('../game/roomDesignScore.js');

const AREA_PATH = path.join(__dirname, '..', 'game', 'area.js');
const args = process.argv.slice(2);
const FULL = args.includes('--full');
const TODO = args.includes('--todo');

const ctx = { window: { addEventListener() {} }, console: { log() {}, warn() {}, error() {} }, readOverrideJSON() { return null; } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(AREA_PATH, 'utf8'), ctx, { filename: 'area.js' });
const AREAS = ctx.window.AREAS;

const SKIP = new Set(['enemy_test_arena']);

function analyze(id) {
  return analyzeRoomDesignState({ id, ...AREAS[id] });
}

const rows = Object.keys(AREAS).filter((id) => !SKIP.has(id)).map(analyze);
rows.sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));

const counts = { SHELL: 0, started: 0, designed: 0 };
for (const r of rows) counts[r.state]++;
const pct = (n) => `${n} (${Math.round((100 * n) / rows.length)}%)`;

console.log(`\nSTILLPOINT — room design progress  (${rows.length} rooms, enemy_test_arena excluded)`);
console.log(`  SHELL (untouched): ${pct(counts.SHELL)}`);
console.log(`  started:           ${pct(counts.started)}`);
console.log(`  designed:          ${pct(counts.designed)}`);
const bar = (s) => { const w = 40; const f = Math.round((w * s) / rows.length); return '█'.repeat(f) + '░'.repeat(w - f); };
console.log(`  progress (started+designed): ${bar(counts.started + counts.designed)}`);

const show = TODO ? rows.filter((r) => r.state === 'SHELL') : rows;
console.log('\n%s', 'state    score  plats en door↕ shaft  room');
for (const r of show) {
  const tag = r.state === 'SHELL' ? 'SHELL  ' : r.state === 'started' ? 'started' : 'DONE   ';
  console.log(`${tag}  ${String(r.score).padStart(3)}   ${String(r.nonFloor).padStart(4)} ${String(r.enemies).padStart(2)}  ${r.doorsMoved ? 'y' : '·'}${r.ceilingDoors ? '↑' : ' '}   ${r.ceilingDoors ? 'y' : '·'}    ${r.id}${FULL ? `  [${r.region}/${r.type} ${r.size}]` : ''}`);
}
console.log('');
