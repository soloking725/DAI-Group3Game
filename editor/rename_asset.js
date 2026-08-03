#!/usr/bin/env node
// Project-wide rename for the identifier namespaces asset_index.js knows
// about (audio sample/music keys, area ids, anim keys, combo ids, ability
// keys). Rewrites every quoted occurrence of the old key across game/ and
// editor/, and — for audio sample/music keys — offers to `git mv` the
// backing asset file too, since those keys double as filenames
// (assets/audio/sfx/<key>.ogg / assets/audio/music/<key>.ogg).
//
// Usage:
//   node editor/rename_asset.js <namespace> <oldKey> <newKey> [--write]
//
// Without --write it only prints a dry-run diff of what would change.
// Namespaces: audioSample | audioMusic | areaId | animKey | comboId | abilityKey
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const [namespace, oldKey, newKey, ...flags] = process.argv.slice(2);
const WRITE = flags.includes('--write');

const VALID_NS = ['audioSample', 'audioMusic', 'areaId', 'animKey', 'comboId', 'abilityKey'];

if (!namespace || !oldKey || !newKey) {
  console.error('Usage: node editor/rename_asset.js <namespace> <oldKey> <newKey> [--write]');
  console.error(`Namespaces: ${VALID_NS.join(', ')}`);
  process.exit(1);
}
if (!VALID_NS.includes(namespace)) {
  console.error(`Unknown namespace "${namespace}". Valid: ${VALID_NS.join(', ')}`);
  process.exit(1);
}
if (!/^[A-Za-z_$][\w$]*$/.test(newKey)) {
  console.error(`"${newKey}" is not a safe bare identifier/key (letters, digits, _, $ only, not starting with a digit). Refusing.`);
  process.exit(1);
}

function walk(dir, exts) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'archive' || entry.name === 'node_modules') continue;
      out.push(...walk(full, exts));
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

const SELF = new Set(['asset_index.js', 'rename_asset.js'].map((f) => path.join(ROOT, 'editor', f)));
const FILES = ['game', 'editor']
  .flatMap((d) => walk(path.join(ROOT, d), ['.js', '.html']))
  .filter((f) => !SELF.has(f));

// Two reference shapes to rewrite:
//  1. Quoted string occurrences — 'land', "land" — the common case, and
//     what asset_index.js counts for its reference totals.
//  2. Bare unquoted object-literal keys — `land: 'assets/...'` inside
//     SAMPLE_URLS/MUSIC_URLS/AREAS — easy to miss since they don't look
//     like the string-literal references everywhere else, but renaming
//     only the quoted uses while leaving the defining key stale would
//     silently break the lookup (code would reference a key SAMPLE_URLS
//     no longer has).
const escaped = oldKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const quoted = new RegExp(`(['"])${escaped}\\1`, 'g');
const bareKey = new RegExp(`(?<=[{,]\\s*)${escaped}(?=\\s*:)`, 'g');

let totalRefs = 0;
const changes = [];
for (const file of FILES) {
  const text = fs.readFileSync(file, 'utf8');
  quoted.lastIndex = 0;
  bareKey.lastIndex = 0;
  const quotedCount = (text.match(quoted) || []).length;
  const bareCount = (text.match(bareKey) || []).length;
  if (quotedCount === 0 && bareCount === 0) continue;
  totalRefs += quotedCount + bareCount;
  const rewritten = text
    .replace(quoted, (m, q) => `${q}${newKey}${q}`)
    .replace(bareKey, newKey);
  changes.push({ file, count: quotedCount + bareCount, rewritten });
}

if (changes.length === 0) {
  console.log(`No quoted references to "${oldKey}" found under game/ or editor/. Nothing to do.`);
  process.exit(0);
}

console.log(`${namespace}: "${oldKey}" -> "${newKey}"`);
changes.forEach((c) => console.log(`  ${path.relative(ROOT, c.file)}  (${c.count}x)`));
console.log(`Total: ${totalRefs} reference(s) across ${changes.length} file(s).`);

// Audio keys double as on-disk filenames — offer the matching asset move too.
let assetMove = null;
if (namespace === 'audioSample' || namespace === 'audioMusic') {
  const dir = namespace === 'audioSample' ? 'assets/audio/sfx' : 'assets/audio/music';
  const oldPath = path.join(ROOT, dir, `${oldKey}.ogg`);
  const newPath = path.join(ROOT, dir, `${newKey}.ogg`);
  if (fs.existsSync(oldPath)) {
    assetMove = { oldPath, newPath, rel: `${dir}/${oldKey}.ogg -> ${dir}/${newKey}.ogg` };
    console.log(`Asset file: ${assetMove.rel}`);
  }
}

if (!WRITE) {
  console.log('\nDry run only — pass --write to apply.');
  process.exit(0);
}

for (const c of changes) {
  fs.writeFileSync(c.file, c.rewritten, 'utf8');
}
if (assetMove) {
  try {
    execSync(`git mv ${JSON.stringify(assetMove.oldPath)} ${JSON.stringify(assetMove.newPath)}`, { cwd: ROOT });
    console.log(`Moved (git mv): ${assetMove.rel}`);
  } catch (e) {
    fs.renameSync(assetMove.oldPath, assetMove.newPath);
    console.log(`Moved (not git-tracked, plain rename): ${assetMove.rel}`);
  }
}
console.log(`\nDone. ${changes.length} file(s) rewritten${assetMove ? ' + 1 asset moved' : ''}.`);
console.log('Re-run `node editor/asset_index.js --key ' + newKey + '` to confirm.');
