// Local-only save server (proof of concept, HUD editor only).
//
// Run with:  node editor/save-server.js
// Then load editor/hud_editor.html through http://localhost:8787/editor/hud_editor.html
// (fetch() to this server won't work if the editor is opened via file://).
//
// It does exactly one thing: replace the `const HUD_LAYOUT = { ... };` block
// in game/game_hud_menus.js with a new object, and nothing else in the file.
// Every write is preceded by a timestamped backup copy.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8787;
const REPO_ROOT = path.resolve(__dirname, '..');
const TARGET_FILE = path.join(REPO_ROOT, 'game', 'game_hud_menus.js');
const BLOCK_RE = /const HUD_LAYOUT = \{[\s\S]*?\n\};/;

const REQUIRED_KEYS = [
  'healthHearts', 'areaLabel', 'bossBar', 'limitBreakBar',
  'controlsHint', 'fracturePips', 'abilityCooldowns',
];

function jsonStringifyLayout(layout) {
  // Pretty-print with 2-space indent, one entry per line, matching the
  // existing file's style closely enough to keep diffs readable.
  const lines = Object.entries(layout).map(([key, val]) => {
    return `  ${key}: ${JSON.stringify(val)},`;
  });
  return `const HUD_LAYOUT = {\n${lines.join('\n')}\n};`;
}

function handleSave(req, res) {
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

    const missing = REQUIRED_KEYS.filter((k) => !(k in layout));
    if (missing.length) {
      return respond(res, 400, {
        error: `Refusing to save: layout is missing expected keys: ${missing.join(', ')}. ` +
          `This looks like a partial/empty payload, not a real layout — aborting to avoid wiping the file.`,
      });
    }

    let original;
    try {
      original = fs.readFileSync(TARGET_FILE, 'utf8');
    } catch (e) {
      return respond(res, 500, { error: `Could not read ${TARGET_FILE}: ${e.message}` });
    }

    const matches = original.match(new RegExp(BLOCK_RE, 'g'));
    if (!matches || matches.length !== 1) {
      return respond(res, 500, {
        error: `Expected exactly one HUD_LAYOUT block in game_hud_menus.js, found ${matches ? matches.length : 0}. ` +
          `Aborting — file may have been restructured since this tool was written.`,
      });
    }

    const newBlock = jsonStringifyLayout(layout);
    const updated = original.replace(BLOCK_RE, newBlock);

    // Timestamped backup, kept alongside the target file, before any write.
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${TARGET_FILE}.${stamp}.bak`;
    try {
      fs.writeFileSync(backupPath, original, 'utf8');
      fs.writeFileSync(TARGET_FILE, updated, 'utf8');
    } catch (e) {
      return respond(res, 500, { error: `Write failed: ${e.message}` });
    }

    console.log(`[save-server] Wrote HUD_LAYOUT to ${path.relative(REPO_ROOT, TARGET_FILE)}`);
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
  if (req.method === 'POST' && req.url === '/save-hud-layout') return handleSave(req, res);
  if (req.method === 'GET') return handleStaticFile(req, res);
  respond(res, 404, { error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[save-server] Listening on http://localhost:${PORT} (repo root: ${REPO_ROOT})`);
  console.log(`[save-server] Open http://localhost:${PORT}/editor/hud_editor.html to use the HUD editor with disk-save enabled.`);
});
