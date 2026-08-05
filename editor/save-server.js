// Local-only save server. Lets specific editors write straight to their
// game/*.js source file instead of the copy-paste "Export JSON" flow.
//
// Run with:  node editor/save-server.js
// Then load editors through http://localhost:8787/editor/<name>.html
// (fetch() to this server won't work if an editor is opened via file://).
//
// Each LAYOUTS route patches exactly one `const NAME = { ... };` block in one
// target file, line by line, and nothing else in the file. Every write is
// preceded by a timestamped backup copy. `/save-art-image` (below) is a
// different shape — it writes a real binary PNG file under assets/art/
// instead of patching JS source; see its own comment for detail.

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

// Real-PNG-file save route (2026-08-03) — lets anim_editor.html/
// room_scene_editor.html turn a working-draft image (currently an inline
// `data:` URL or an AnimImageStore/RoomImageStore IndexedDB id) into an
// actual checked-in file under assets/art/<category>/, instead of the
// base64-in-JS-source export path. Returns the relative path the caller
// should store as frame.image / backdropLayers[].imageId going forward —
// game/animdata.js's getAnimImage() / game/game_entities.js's
// getRoomImage() both already load any non-`data:`/non-`idb_` string as a
// real path via `new Image()`, so no other runtime change was needed.
const ART_CATEGORIES = {
  anim: path.join(REPO_ROOT, 'assets', 'art', 'anim'),
  rooms: path.join(REPO_ROOT, 'assets', 'art', 'rooms'),
};
const SAFE_FILENAME_RE = /^[A-Za-z0-9_-]+$/;

function handleSaveArtImage(req, res) {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      return respond(res, 400, { error: 'Invalid JSON body' });
    }

    const { category, filename, dataUrl } = payload || {};
    const dir = ART_CATEGORIES[category];
    if (!dir) {
      return respond(res, 400, { error: `"category" must be one of: ${Object.keys(ART_CATEGORIES).join(', ')}` });
    }
    if (typeof filename !== 'string' || !SAFE_FILENAME_RE.test(filename)) {
      return respond(res, 400, { error: '"filename" must be non-empty and contain only letters, numbers, "_", "-" (no extension, no path separators)' });
    }
    const m = typeof dataUrl === 'string' && dataUrl.match(/^data:image\/png;base64,(.+)$/s);
    if (!m) {
      return respond(res, 400, { error: '"dataUrl" must be a data:image/png;base64,... string (PNG only)' });
    }

    const targetFile = path.join(dir, `${filename}.png`);
    const bytes = Buffer.from(m[1], 'base64');

    try {
      fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(targetFile)) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        fs.copyFileSync(targetFile, `${targetFile}.${stamp}.bak`);
      }
      fs.writeFileSync(targetFile, bytes);
    } catch (e) {
      return respond(res, 500, { error: `Write failed: ${e.message}` });
    }

    const relPath = path.relative(REPO_ROOT, targetFile).split(path.sep).join('/');
    console.log(`[save-server] Wrote art image to ${relPath}`);
    respond(res, 200, { ok: true, path: relPath });
  });
}

// Audio-pick apply route (2026-08-04) — lets audio_ab_tester.html write a
// chosen A/B candidate straight to its live asset path, instead of the old
// "export picks.json, someone reads the file and updates audio.js by hand"
// dead end (picks.json was never consumed anywhere — Plans/engineering_todo.md).
// Both `candidateFile` and `liveTrack` come from assets/audio/candidates/
// manifest.json on the client side (the editor only ever sends values it
// read out of that file, never freeform text), but this route re-validates
// independently since anything hitting an HTTP endpoint should be treated
// as untrusted input, not trusted because of what the caller happens to be.
const AUDIO_ROOT = path.join(REPO_ROOT, 'assets', 'audio') + path.sep;
function handleApplyAudioPick(req, res) {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      return respond(res, 400, { error: 'Invalid JSON body' });
    }

    const { candidateFile, liveTrack } = payload || {};
    if (typeof candidateFile !== 'string' || typeof liveTrack !== 'string') {
      return respond(res, 400, { error: '"candidateFile" and "liveTrack" (relative repo paths) are required' });
    }

    const srcPath = path.resolve(REPO_ROOT, candidateFile);
    const destPath = path.resolve(REPO_ROOT, liveTrack);
    if (!srcPath.startsWith(AUDIO_ROOT) || !destPath.startsWith(AUDIO_ROOT)) {
      return respond(res, 403, { error: 'Both paths must be inside assets/audio/' });
    }
    if (!/\.(ogg|mp3|wav)$/i.test(srcPath) || !/\.(ogg|mp3|wav)$/i.test(destPath)) {
      return respond(res, 400, { error: 'Both paths must be an audio file (.ogg/.mp3/.wav)' });
    }
    if (!fs.existsSync(srcPath)) {
      return respond(res, 404, { error: `Candidate file not found: ${candidateFile}` });
    }

    try {
      if (fs.existsSync(destPath)) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        fs.copyFileSync(destPath, `${destPath}.${stamp}.bak`);
      }
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    } catch (e) {
      return respond(res, 500, { error: `Write failed: ${e.message}` });
    }

    console.log(`[save-server] Applied audio pick: ${path.relative(REPO_ROOT, srcPath)} -> ${path.relative(REPO_ROOT, destPath)}`);
    respond(res, 200, { ok: true, liveTrack });
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
  if (req.method === 'POST' && req.url === '/save-art-image') return handleSaveArtImage(req, res);
  if (req.method === 'POST' && req.url === '/apply-audio-pick') return handleApplyAudioPick(req, res);
  if (req.method === 'GET') return handleStaticFile(req, res);
  respond(res, 404, { error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[save-server] Listening on http://localhost:${PORT} (repo root: ${REPO_ROOT})`);
  console.log(`[save-server] Routes: ${Object.keys(LAYOUTS).join(', ')}, /save-art-image, /apply-audio-pick`);
  console.log(`[save-server] Open http://localhost:${PORT}/editor/hud_editor.html or /editor/inventory_editor.html to use them with disk-save enabled.`);
});
