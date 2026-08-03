// Local-only save server. Lets specific editors write straight to their
// game/*.js source file instead of the copy-paste "Export JSON" flow.
//
// Run with:  node editor/save-server.js
// Then load editors through http://localhost:8787/editor/<name>.html
// (fetch() to this server won't work if an editor is opened via file://).
//
// Each route below patches exactly one `const NAME = { ... };` block in one
// target file, line by line, and nothing else in the file. Every write is
// preceded by a timestamped backup copy.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8787;
const REPO_ROOT = path.resolve(__dirname, '..');

// One entry per editor wired up to disk-save. `endpoint` is the POST path
// the editor's saveToFile() calls; `declName` is the exact `const X = {`
// this route is allowed to touch; `requiredKeys` guards against writing a
// partial/empty payload over real data.
const LAYOUTS = {
  '/save-hud-layout': {
    targetFile: path.join(REPO_ROOT, 'game', 'game_hud_menus.js'),
    declName: 'HUD_LAYOUT',
    requiredKeys: [
      'healthHearts', 'areaLabel', 'bossBar', 'limitBreakBar',
      'controlsHint', 'fracturePips', 'abilityCooldowns',
    ],
  },
  '/save-inventory-layout': {
    targetFile: path.join(REPO_ROOT, 'game', 'inventory_ui.js'),
    declName: 'INVENTORY_LAYOUT',
    requiredKeys: [
      'panel', 'tabStrip', 'portrait', 'healthLabel', 'fracturePipsRow',
      'abilityGrid', 'companionPortrait', 'storyListHeader', 'storyList',
      'storyDetail', 'pipsHeader', 'pipsRow2', 'lorePipsInfo', 'upgradesList',
      'slotTabs', 'cosmeticsGrid', 'cosmeticsDetail',
    ],
  },
};

const KEY_LINE_RE = /^(\s*)([A-Za-z_$][\w$]*)(\s*:\s*)(\{.*\})(\s*,?)(\s*(\/\/.*)?)$/;

// JS-object-literal style to match the hand-written files: unquoted keys,
// single-quoted strings, spaces inside braces — not JSON.stringify's
// double-quoted-key compact form.
function serializeValue(val) {
  const entries = Object.entries(val).map(([k, v]) => {
    const rendered = typeof v === 'string' ? `'${v.replace(/'/g, "\\'")}'` : JSON.stringify(v);
    return `${k}: ${rendered}`;
  });
  return `{ ${entries.join(', ')} }`;
}

// Rewrites only the keys that changed, line by line, so any line this
// function doesn't recognize (comments, blank lines, keys not present in
// the new layout) passes through completely untouched. This is what keeps
// a file's original column alignment and any inline/standalone comments
// intact — a full stringify-and-rebuild would silently discard both.
function patchLayoutBlock(blockText, declName, newLayout) {
  const lines = blockText.split('\n');
  const openLineIdx = lines.findIndex((l) => l.includes(`const ${declName} = {`));
  const closeLineIdx = lines.length - 1; // block always ends with the `};` line
  if (openLineIdx === -1) throw new Error(`Could not find "const ${declName} = {" opening line`);

  const seenKeys = new Set();
  const indentUnit = '  ';
  let sampleIndent = null;

  const patched = lines.map((line, i) => {
    if (i <= openLineIdx || i >= closeLineIdx) return line;
    const m = line.match(KEY_LINE_RE);
    if (!m) return line; // comment-only or blank line — leave completely alone
    const [, indent, key, sep] = m;
    if (sampleIndent === null) sampleIndent = indent;
    seenKeys.add(key);
    if (!(key in newLayout)) return null; // key removed in the editor — drop the line
    const [, , , , , comma, trailing] = m;
    return `${indent}${key}${sep}${serializeValue(newLayout[key])}${comma || ','}${trailing || ''}`;
  }).filter((l) => l !== null);

  const newKeys = Object.keys(newLayout).filter((k) => !seenKeys.has(k));
  if (newKeys.length) {
    const insertAt = patched.length - 1; // just before the closing `};` line
    const added = newKeys.map((k) => `${sampleIndent || indentUnit}${k}: ${serializeValue(newLayout[k])},`);
    patched.splice(insertAt, 0, ...added);
  }

  return patched.join('\n');
}

function handleSave(route, req, res) {
  const { targetFile, declName, requiredKeys } = route;
  const blockRe = new RegExp(`const ${declName} = \\{[\\s\\S]*?\\n\\};`);

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      return respond(res, 400, { error: 'Invalid JSON body' });
    }

    const layout = payload && payload.layout;
    if (!layout || typeof layout !== 'object' || Array.isArray(layout)) {
      return respond(res, 400, { error: 'Missing or invalid "layout" object' });
    }

    const missing = requiredKeys.filter((k) => !(k in layout));
    if (missing.length) {
      return respond(res, 400, {
        error: `Refusing to save: layout is missing expected keys: ${missing.join(', ')}. ` +
          `This looks like a partial/empty payload, not a real layout — aborting to avoid wiping the file.`,
      });
    }

    let original;
    try {
      original = fs.readFileSync(targetFile, 'utf8');
    } catch (e) {
      return respond(res, 500, { error: `Could not read ${targetFile}: ${e.message}` });
    }

    const matches = original.match(new RegExp(blockRe, 'g'));
    if (!matches || matches.length !== 1) {
      return respond(res, 500, {
        error: `Expected exactly one ${declName} block in ${path.basename(targetFile)}, found ${matches ? matches.length : 0}. ` +
          `Aborting — file may have been restructured since this tool was written.`,
      });
    }

    const oldBlock = matches[0];
    let newBlock;
    try {
      newBlock = patchLayoutBlock(oldBlock, declName, layout);
    } catch (e) {
      return respond(res, 500, { error: `Failed to patch ${declName} block: ${e.message}` });
    }
    const updated = original.replace(blockRe, newBlock);

    // Timestamped backup, kept alongside the target file, before any write.
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${targetFile}.${stamp}.bak`;
    try {
      fs.writeFileSync(backupPath, original, 'utf8');
      fs.writeFileSync(targetFile, updated, 'utf8');
    } catch (e) {
      return respond(res, 500, { error: `Write failed: ${e.message}` });
    }

    console.log(`[save-server] Wrote ${declName} to ${path.relative(REPO_ROOT, targetFile)}`);
    console.log(`[save-server] Backup saved to ${path.relative(REPO_ROOT, backupPath)}`);
    respond(res, 200, { ok: true, backup: path.relative(REPO_ROOT, backupPath) });
  });
}

function respond(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(obj));
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

function handleStaticFile(req, res) {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const filePath = path.join(REPO_ROOT, urlPath === '/' ? '/index.html' : urlPath);
  if (!filePath.startsWith(REPO_ROOT)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return respond(res, 204, {});
  if (req.method === 'POST' && LAYOUTS[req.url]) return handleSave(LAYOUTS[req.url], req, res);
  if (req.method === 'GET') return handleStaticFile(req, res);
  respond(res, 404, { error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[save-server] Listening on http://localhost:${PORT} (repo root: ${REPO_ROOT})`);
  console.log(`[save-server] Routes: ${Object.keys(LAYOUTS).join(', ')}`);
  console.log(`[save-server] Open http://localhost:${PORT}/editor/hud_editor.html or /editor/inventory_editor.html to use them with disk-save enabled.`);
});
