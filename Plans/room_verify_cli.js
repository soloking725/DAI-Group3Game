#!/usr/bin/env node
// =====================================================================
// room_verify_cli.js — Node CLI for game/roomVerify.js's static linter
// =====================================================================
// Implements Plans/room_verification_tool_plan.md's "Component 1" as a
// pre-commit/CI-friendly check, same spirit as room_progress.js. Read-only,
// no browser (per the repo rule) — pure Node.
//
//   node Plans/room_verify_cli.js            # pass/fail summary per room
//   node Plans/room_verify_cli.js --full     # + every issue's coordinates
//
// Physics numbers come from game/roomVerify.js's hand-synced PHYSICS_DEFAULTS
// (this CLI doesn't load player.js/ability.js — those files pull in Player-
// class dependencies far beyond the 6 constants this check needs). The
// browser tool (editor/room_verify.html) loads the real files and is exact;
// this CLI is a close approximation for fast/CI use — see roomVerify.js's
// header comment.
// =====================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const AREA_PATH = path.join(__dirname, '..', 'game', 'area.js');
const args = process.argv.slice(2);
const FULL = args.includes('--full');

const ctx = { window: { addEventListener() {} }, console: { log() {}, warn() {}, error() {} }, readOverrideJSON() { return null; } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(AREA_PATH, 'utf8'), ctx, { filename: 'area.js' });
const AREAS = ctx.window.AREAS;

const RoomVerify = require(path.join(__dirname, '..', 'game', 'roomVerify.js'));

const results = RoomVerify.verifyAllRooms(AREAS);
results.sort((a, b) => (a.ok === b.ok ? a.id.localeCompare(b.id) : a.ok ? 1 : -1));

const failCount = results.filter((r) => !r.ok).length;
const warnOnlyCount = results.filter((r) => r.ok && r.issues.length > 0).length;
const cleanCount = results.length - failCount - warnOnlyCount;

console.log(`\nSTILLPOINT — room verification (static linter)  (${results.length} rooms checked)`);
console.log(`  clean:         ${cleanCount}`);
console.log(`  warnings only: ${warnOnlyCount}`);
console.log(`  FAILING:       ${failCount}`);
console.log('');

for (const r of results) {
  const errorCount = r.issues.filter((i) => i.severity === 'error').length;
  const warnCount = r.issues.length - errorCount;
  const tag = !r.ok ? 'FAIL' : r.issues.length ? 'warn' : 'pass';
  console.log(`${tag}  ${r.id}${errorCount ? `  (${errorCount} error${errorCount === 1 ? '' : 's'})` : ''}${warnCount ? `  (${warnCount} warning${warnCount === 1 ? '' : 's'})` : ''}`);
  if (FULL || !r.ok) {
    for (const issue of r.issues) {
      console.log(`    [${issue.severity}] ${issue.type} — ${issue.detail}`);
    }
  }
}
console.log('');

process.exitCode = failCount > 0 ? 1 : 0;
