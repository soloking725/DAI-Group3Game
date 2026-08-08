const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { REPO_ROOT, TARGETS } = require('./targets');
const { patchPathInFile, syncTopLevelObjectKeys, patchConstInFile, patchArrayElementByKey, readConstSourceFromFile, appendConstToFile } = require('./constPatcher');
const devContextStore = require('./devContextStore');

function backup(targetFile) {
  const original = fs.readFileSync(targetFile, 'utf8');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${targetFile}.${stamp}.bak`;
  fs.writeFileSync(backupPath, original, 'utf8');
  return path.relative(REPO_ROOT, backupPath);
}

function resolveTarget(targetId) {
  const target = TARGETS[targetId];
  if (!target) throw new Error(`Unknown save target "${targetId}"`);
  return target;
}

// Real-PNG-file save (ported from editor/save-server.js's handleSaveArtImage).
const ART_CATEGORIES = {
  anim: path.join(REPO_ROOT, 'assets', 'art', 'anim'),
  rooms: path.join(REPO_ROOT, 'assets', 'art', 'rooms'),
};
const SAFE_FILENAME_RE = /^[A-Za-z0-9_-]+$/;

// Audio-pick apply (ported from editor/save-server.js's handleApplyAudioPick).
const AUDIO_ROOT = path.join(REPO_ROOT, 'assets', 'audio') + path.sep;

function registerIpcHandlers() {
  ipcMain.handle('stillpoint:syncTopLevelKeys', (event, { targetId, valueSources }) => {
    const target = resolveTarget(targetId);
    if (target.mode !== 'sync') throw new Error(`Target "${targetId}" is not a "sync"-mode target`);

    if (target.requiredKeys) {
      const missing = target.requiredKeys.filter((k) => !(k in valueSources));
      if (missing.length) {
        throw new Error(
          `Refusing to save: payload is missing expected keys: ${missing.join(', ')}. ` +
          `This looks like a partial/empty payload, not a real layout — aborting to avoid wiping the file.`
        );
      }
    }

    const backupPath = backup(target.targetFile);
    syncTopLevelObjectKeys(target.targetFile, target.declName, valueSources);
    return { ok: true, backup: backupPath };
  });

  ipcMain.handle('stillpoint:patchPath', (event, { targetId, path: pathStr, valueSource, allowCreate }) => {
    const target = resolveTarget(targetId);
    if (target.mode !== 'path') throw new Error(`Target "${targetId}" is not a "path"-mode target`);

    const backupPath = backup(target.targetFile);
    patchPathInFile(target.targetFile, target.declName, pathStr, valueSource, { allowCreate: !!allowCreate });
    return { ok: true, backup: backupPath };
  });

  ipcMain.handle('stillpoint:writeWhole', (event, { targetId, valueSource }) => {
    const target = resolveTarget(targetId);
    if (target.mode !== 'whole') throw new Error(`Target "${targetId}" is not a "whole"-mode target`);

    const backupPath = backup(target.targetFile);
    patchConstInFile(target.targetFile, target.declName, valueSource);
    return { ok: true, backup: backupPath };
  });

  ipcMain.handle('stillpoint:patchArrayElement', (event, { targetId, idValue, valueSource, allowCreate }) => {
    const target = resolveTarget(targetId);
    if (target.mode !== 'arrayByKey') throw new Error(`Target "${targetId}" is not an "arrayByKey"-mode target`);

    const backupPath = backup(target.targetFile);
    patchArrayElementByKey(target.targetFile, target.declName, target.idField, idValue, valueSource, { allowCreate: !!allowCreate });
    return { ok: true, backup: backupPath };
  });

  ipcMain.handle('stillpoint:writeNamedVar', (event, { targetId, varName, valueSource }) => {
    const target = resolveTarget(targetId);
    if (target.mode !== 'rawVar') throw new Error(`Target "${targetId}" is not a "rawVar"-mode target`);
    if (!target.allowedVars.includes(varName)) {
      throw new Error(`"${varName}" is not in the allowed variable list for "${targetId}"`);
    }

    const backupPath = backup(target.targetFile);
    patchConstInFile(target.targetFile, varName, valueSource);
    return { ok: true, backup: backupPath };
  });

  ipcMain.handle('stillpoint:appendNamedConst', (event, { targetId, varName, valueSource }) => {
    const target = resolveTarget(targetId);
    if (target.mode !== 'appendConst') throw new Error(`Target "${targetId}" is not an "appendConst"-mode target`);
    if (target.varNamePattern && !target.varNamePattern.test(varName)) {
      throw new Error(`"${varName}" doesn't match the required naming pattern for "${targetId}" (${target.varNamePattern})`);
    }

    const backupPath = backup(target.targetFile);
    appendConstToFile(target.targetFile, varName, valueSource);
    return { ok: true, backup: backupPath };
  });

  ipcMain.handle('stillpoint:readConst', (event, { targetId }) => {
    const target = resolveTarget(targetId);
    return { source: readConstSourceFromFile(target.targetFile, target.declName) };
  });

  // Runs asset_index.js exactly like `node editor/asset_index.js --json`
  // would from a terminal — read-only (the script itself never writes
  // anything), just saves asset_browser.html's user the manual
  // run-then-load-the-file round trip. Deliberately does NOT expose
  // rename_asset.js's --write mode here — that's a project-wide rewrite
  // across game/ and editor/ plus a `git mv` on the backing asset file,
  // and asset_browser.html's own hint text already frames "this page
  // never writes to disk itself" as intentional, not a gap to close
  // silently.
  ipcMain.handle('stillpoint:generateAssetIndex', () => {
    const scriptPath = path.join(REPO_ROOT, 'editor', 'asset_index.js');
    const stdout = execFileSync('node', [scriptPath, '--json'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 30000,
      maxBuffer: 32 * 1024 * 1024,
    });
    return { index: JSON.parse(stdout) };
  });

  ipcMain.handle('stillpoint:saveArtImage', (event, { category, filename, dataUrl }) => {
    const dir = ART_CATEGORIES[category];
    if (!dir) throw new Error(`"category" must be one of: ${Object.keys(ART_CATEGORIES).join(', ')}`);
    if (typeof filename !== 'string' || !SAFE_FILENAME_RE.test(filename)) {
      throw new Error('"filename" must be non-empty and contain only letters, numbers, "_", "-" (no extension, no path separators)');
    }
    const m = typeof dataUrl === 'string' && dataUrl.match(/^data:image\/png;base64,(.+)$/s);
    if (!m) throw new Error('"dataUrl" must be a data:image/png;base64,... string (PNG only)');

    const targetFile = path.join(dir, `${filename}.png`);
    const bytes = Buffer.from(m[1], 'base64');

    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(targetFile)) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync(targetFile, `${targetFile}.${stamp}.bak`);
    }
    fs.writeFileSync(targetFile, bytes);

    return { ok: true, path: path.relative(REPO_ROOT, targetFile).split(path.sep).join('/') };
  });

  ipcMain.handle('stillpoint:applyAudioPick', (event, { candidateFile, liveTrack }) => {
    if (typeof candidateFile !== 'string' || typeof liveTrack !== 'string') {
      throw new Error('"candidateFile" and "liveTrack" (relative repo paths) are required');
    }

    const srcPath = path.resolve(REPO_ROOT, candidateFile);
    const destPath = path.resolve(REPO_ROOT, liveTrack);
    if (!srcPath.startsWith(AUDIO_ROOT) || !destPath.startsWith(AUDIO_ROOT)) {
      throw new Error('Both paths must be inside assets/audio/');
    }
    if (!/\.(ogg|mp3|wav)$/i.test(srcPath) || !/\.(ogg|mp3|wav)$/i.test(destPath)) {
      throw new Error('Both paths must be an audio file (.ogg/.mp3/.wav)');
    }
    if (!fs.existsSync(srcPath)) throw new Error(`Candidate file not found: ${candidateFile}`);

    if (fs.existsSync(destPath)) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync(destPath, `${destPath}.${stamp}.bak`);
    }
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);

    return { ok: true, liveTrack };
  });

  // Milestone 3 — DevContext shared state. See devContextStore.js: main
  // process holds the one authoritative copy, persisted to disk and pushed
  // live to every open tab, rather than each tool independently reading/
  // writing localStorage. game/devContext.js is the renderer-side client.
  ipcMain.handle('stillpoint:devContextGet', () => devContextStore.get());
  ipcMain.handle('stillpoint:devContextSet', (event, patch) => devContextStore.set(patch));
  ipcMain.handle('stillpoint:devContextLog', (event, { tool, action, detail }) => devContextStore.log(tool, action, detail));
  ipcMain.handle('stillpoint:devContextRecent', (event, n) => devContextStore.recent(n));
}

module.exports = { registerIpcHandlers };
