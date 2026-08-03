#!/usr/bin/env node
// Asset browser (indexer half). Scans the plain-script codebase for the five
// identifier namespaces that matter for a rename (audio sample/music keys,
// AREAS room ids, ANIM_DEFS keys, COMBO_DEFS ids, ability-requirement
// strings) and counts every quoted reference to each across game/ and
// editor/. No AST, no npm deps — matches how export_graph.js already reads
// this repo (plain text/regex over the real source files).
//
// Usage:
//   node editor/asset_index.js                 # print a summary report
//   node editor/asset_index.js --json          # dump the full index as JSON
//   node editor/asset_index.js --key attack    # show every reference site for one key
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['game', 'editor'].map((d) => path.join(ROOT, d));

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
const FILES = SCAN_DIRS.flatMap((d) => walk(d, ['.js', '.html'])).filter((f) => !SELF.has(f));
const SOURCES = FILES.map((f) => ({ file: f, text: fs.readFileSync(f, 'utf8') }));

// --- extract key sets from their defining files (regex, not eval — these
// files depend on globals/other modules that don't exist outside the browser) ---

function extractObjectKeys(text, headerRe) {
  const m = headerRe.exec(text);
  if (!m) return [];
  const start = m.index + m[0].length;
  let depth = 1;
  let i = start;
  for (; i < text.length && depth > 0; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
  }
  const body = text.slice(start, i);
  const keys = new Set();
  // Only capture keys sitting directly at the object's top level (depth 0
  // within `body`) — nested room/frame fields like `requires`/`to`/`id`
  // must NOT be picked up as if they were room/anim ids themselves.
  const keyRe = /(?<=^|[{,])\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*:/gm;
  let km;
  while ((km = keyRe.exec(body))) {
    // recompute depth of everything before this match to confirm depth===0
    const before = body.slice(0, km.index);
    let d = 0;
    for (const ch of before) {
      if (ch === '{' || ch === '[') d++;
      else if (ch === '}' || ch === ']') d--;
    }
    if (d === 0) keys.add(km[1] || km[2] || km[3]);
  }
  return [...keys];
}

function fileText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const audioText = fileText('game/audio.js');
const sampleKeys = extractObjectKeys(audioText, /const SAMPLE_URLS\s*=\s*\{/);
const musicKeys = extractObjectKeys(audioText, /const MUSIC_URLS\s*=\s*\{/);
const areaKeys = extractObjectKeys(fileText('game/area.js'), /const AREAS\s*=\s*\{/);
// ANIM_DEFS's literal in animdata.js only ships 2 starter poses — most anim
// keys used by the game are added at runtime from localStorage overrides
// saved by anim_editor.html (ANIM_OVERRIDES_KEY), so they don't exist on
// disk at all. The only reliable source of the real key set is every place
// code does `ANIM_DEFS['key']` / `ANIM_DEFS.key` — collect those instead of
// trusting the const literal.
function extractAnimUsageKeys() {
  const keys = new Set(extractObjectKeys(fileText('game/animdata.js'), /const ANIM_DEFS\s*=\s*\{/));
  const usageRe = /ANIM_DEFS(?:\[\s*['"]([\w$]+)['"]\s*\]|\.([A-Za-z_$][\w$]*))/g;
  for (const { text } of SOURCES) {
    let m;
    usageRe.lastIndex = 0;
    while ((m = usageRe.exec(text))) keys.add(m[1] || m[2]);
  }
  return [...keys];
}
const animKeys = extractAnimUsageKeys();

// COMBO_DEFS is an array of {id: '...'} objects, not a keyed object — pull ids differently.
function extractComboIds(text) {
  const m = /let COMBO_DEFS\s*=\s*\[/.exec(text);
  if (!m) return [];
  const start = m.index + m[0].length - 1;
  let depth = 1, i = start + 1;
  for (; i < text.length && depth > 0; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') depth--;
  }
  const body = text.slice(start, i);
  const ids = new Set();
  const idRe = /id\s*:\s*(?:'([^']+)'|"([^"]+)")/g;
  let im;
  while ((im = idRe.exec(body))) ids.add(im[1] || im[2]);
  return [...ids];
}
const comboIds = extractComboIds(fileText('game/combo.js'));

// Ability keys have no central def object (per prior audit) — hardcode the
// known set from door `requires` usage / ability_utility_calculator.html.
// Update this list if new abilities are added.
const abilityKeys = ['phase_dash', 'shard_shot', 'stillpoint', 'charged_attack', 'graviton_surge', 'void_tether'];

const NAMESPACES = {
  audioSample: sampleKeys,
  audioMusic: musicKeys,
  areaId: areaKeys,
  animKey: animKeys,
  comboId: comboIds,
  abilityKey: abilityKeys,
};

// --- count references: every quoted occurrence of `key` across all scanned files ---

function countRefs(key) {
  const quoted = new RegExp(`['"]${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
  const sites = [];
  for (const { file, text } of SOURCES) {
    let count = 0;
    let m;
    quoted.lastIndex = 0;
    const lines = null;
    while ((m = quoted.exec(text))) count++;
    if (count > 0) {
      sites.push({ file: path.relative(ROOT, file), count });
    }
  }
  return sites;
}

function buildIndex() {
  const index = {};
  for (const [ns, keys] of Object.entries(NAMESPACES)) {
    index[ns] = keys.map((key) => {
      const sites = countRefs(key);
      const total = sites.reduce((s, x) => s + x.count, 0);
      return { key, totalRefs: total, files: sites };
    });
  }
  return index;
}

// --- CLI ---

const args = process.argv.slice(2);
const index = buildIndex();

if (args.includes('--json')) {
  process.stdout.write(JSON.stringify(index, null, 2) + '\n');
} else if (args.includes('--key')) {
  const key = args[args.indexOf('--key') + 1];
  let found = false;
  for (const [ns, entries] of Object.entries(index)) {
    const hit = entries.find((e) => e.key === key);
    if (hit) {
      found = true;
      console.log(`${key}  [${ns}]  ${hit.totalRefs} reference(s):`);
      hit.files.forEach((f) => console.log(`  ${f.file}  (${f.count}x)`));
    }
  }
  if (!found) console.log(`"${key}" not found in any namespace.`);
} else {
  console.log('Asset index summary (namespace: key -> reference count across game/+editor/)\n');
  for (const [ns, entries] of Object.entries(index)) {
    console.log(`## ${ns}  (${entries.length} keys)`);
    entries
      .sort((a, b) => b.totalRefs - a.totalRefs)
      .forEach((e) => console.log(`  ${String(e.totalRefs).padStart(4)}  ${e.key}`));
    console.log('');
  }
  console.log('Run with --json to dump full index, or --key <name> to see reference sites for one key.');
}
