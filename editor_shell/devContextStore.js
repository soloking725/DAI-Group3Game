// Milestone 3 — DevContext as real shared app state instead of a
// localStorage-polling pattern. This module is the main process's single
// authoritative copy: persisted to a JSON file in Electron's userData dir
// (survives cache clears, works even if a renderer's localStorage is
// unreliable) and pushed live to every open tab via IPC on every change —
// no tab has to poll or wait for a 'storage' event to notice an update.
//
// Plain-browser usage (a tool opened outside this shell, via
// save-server.js) is untouched — this module only exists inside the
// Electron main process; game/devContext.js falls back to its original
// localStorage-only behavior whenever window.stillpointAPI isn't present.
const fs = require('fs');
const path = require('path');
const { app, webContents } = require('electron');

const ACTIVITY_MAX = 30;

function defaultState() {
  return { currentRoomId: null, currentEnemyId: null, currentAnimationKey: null, activity: [] };
}

let storeFile = null;
let state = null;

function ensureInit() {
  if (state) return;
  storeFile = path.join(app.getPath('userData'), 'dev_context.json');
  try {
    const raw = fs.readFileSync(storeFile, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.activity)) parsed.activity = [];
    state = { ...defaultState(), ...parsed };
  } catch (e) {
    state = defaultState();
  }
}

function persist() {
  try {
    fs.mkdirSync(path.dirname(storeFile), { recursive: true });
    fs.writeFileSync(storeFile, JSON.stringify(state), 'utf8');
  } catch (e) { /* best-effort — dev-tool convenience state, never fatal */ }
}

function broadcast() {
  for (const wc of webContents.getAllWebContents()) {
    if (!wc.isDestroyed()) wc.send('devcontext:changed', state);
  }
}

function get() {
  ensureInit();
  return state;
}

function set(patch) {
  ensureInit();
  state = { ...state, ...(patch || {}) };
  persist();
  broadcast();
  return state;
}

function log(tool, action, detail) {
  ensureInit();
  state.activity.unshift({ tool, action, detail: detail || '', ts: Date.now() });
  if (state.activity.length > ACTIVITY_MAX) state.activity.length = ACTIVITY_MAX;
  persist();
  broadcast();
  return state;
}

function recent(n) {
  ensureInit();
  return state.activity.slice(0, n || ACTIVITY_MAX);
}

module.exports = { get, set, log, recent };
