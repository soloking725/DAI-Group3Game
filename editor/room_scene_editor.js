// Room Scene Editor — Plans/room_scene_editor_plan.md v1 (2026-07-29).
// Edits a room's backdropLayers[]/hideProceduralBackdrop and its region's
// REGION_STYLES entry (absorbing the never-built level_designer.html's
// scope, per §0 of that plan). The center preview is NOT a reimplemented
// approximation — it boots the real game (fetch+srcdoc+path-rewrite, same
// pattern as debug_v1.html's loadSandbox()) into the exact room being
// edited, then every property edit writes directly into the running
// iframe's win.AREAS[roomId] / win.REGION_STYLES[region] objects. This
// works with no reload needed because draw()/update() read getCurrentArea()
// (== AREAS[currentAreaId]) fresh every frame — see game_state.js — so a
// live mutation is visible on the very next frame, exactly like a real
// physics/rendering change would be.

function clone(o) { return typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)); }

// ── Region style numeric-knob metadata (authoring UI only — the real
// default VALUES always come from the live preview's own REGION_STYLES,
// never duplicated here, so this can't drift out of sync with
// game_entities.js). Same acceptable-duplication precedent as
// hud_editor.html's DEFAULTS copy (see Plans/CLAUDE.md's dev-tooling notes).
const REGION_STYLE_FIELDS = {
  mirror_veil: [
    { key: 'diamondSpacing', label: 'Diamond Spacing', min: 40, max: 400, step: 10 },
  ],
  event_horizon: [
    { key: 'ringCount', label: 'Ring Count', min: 1, max: 12, step: 1 },
    { key: 'ringSpacing', label: 'Ring Spacing', min: 20, max: 200, step: 5 },
  ],
  chrono_rift: [
    { key: 'spokeCount', label: 'Spoke Count', min: 2, max: 24, step: 1 },
  ],
};

// ── State ────────────────────────────────────────────────────────────────
const ALL_ROOM_IDS = Object.keys(AREAS).filter((id) => typeof AREAS[id].col === 'number'); // real rooms only, same skip rule area.js's own linter uses
let area = null;               // working clone of the current room
let currentStyle = null;       // working clone of REGION_STYLES[area.region], or null if none exists yet
let selMode = 'none';          // 'none' | 'layer' | 'region' | 'trigger' | 'audioZone'
let selLayerIndex = -1;
let selTriggerIndex = -1;
let selAudioZoneIndex = -1;
let win = null;                // the sandboxed preview iframe's contentWindow, once loaded
let previewGeneration = 0;     // guards against a stale async loadPreview() resolving after a newer one started
let liveCamera = { x: 0, y: 0, zoom: 1 }; // mirrors win.camera every frame, for the trigger-overlay's world<->screen math

function stripPreview(layers) {
  return (layers || []).map((l) => {
    const copy = Object.assign({}, l);
    delete copy._previewDataUrl;
    // Animated layers (layer.frames[], 2026-08-01) carry the same
    // live-preview-only _previewDataUrl per frame as the single-image case
    // above — strip it here too so it never leaks into export/save, same
    // reason as the layer-level delete just above.
    if (Array.isArray(copy.frames)) {
      copy.frames = copy.frames.map((f) => {
        const fc = Object.assign({}, f);
        delete fc._previewDataUrl;
        return fc;
      });
    }
    return copy;
  });
}

function newLayer() {
  return {
    id: 'bl_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    imageId: null,
    parallaxX: 0.3,
    parallaxY: 0,
    x: 0, y: 0,
    scale: 1,
    repeat: 'none',
    tint: null,
    opacity: 1,
    hidden: false,
  };
}

function newTrigger(centerX, groundY) {
  return {
    id: 'ct_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    x: Math.max(0, centerX - 50), y: Math.max(0, (groundY || 400) - 150),
    w: 100, h: 100,
    cutsceneId: '',
    storyFlag: '',
    triggerType: 'enter', // 'enter' | 'onRoomLoad'
  };
}

// area.audioZones[] — sub-room ambient override (game/audio.js's
// SFX.setAudioZone(), checked every frame in game_update.js). Lets part of
// a room play a different track than the whole-room AREA_MUSIC_MAP default
// (e.g. a quiet corner of an otherwise-hub_living room) — same zone-rectangle
// shape as a cutscene trigger, just with a trackKey instead of a cutsceneId
// and no triggerType/storyFlag (a zone is just "while standing here, play
// this instead," no one-shot/gating semantics to track).
function newAudioZone(centerX, groundY) {
  return {
    id: 'az_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    x: Math.max(0, centerX - 60), y: Math.max(0, (groundY || 400) - 180),
    w: 120, h: 120,
    trackKey: '',
  };
}

// Recursively checks whether any CUTSCENES script (including inside a
// 'choice' step's onA/onB branches) sets the given story flag — used for
// the trigger inspector's "will this ever actually gate itself?" hint.
function findCutsceneSettingFlag(flag) {
  if (typeof CUTSCENES === 'undefined' || !flag) return null;
  const stepsSetFlag = (steps) => {
    for (const s of (steps || [])) {
      if (s.type === 'setFlag' && s.flag === flag) return true;
      if (s.type === 'choice' && (stepsSetFlag(s.onA) || stepsSetFlag(s.onB))) return true;
    }
    return false;
  };
  for (const id in CUTSCENES) {
    if (stepsSetFlag(CUTSCENES[id].steps)) return id;
  }
  return null;
}

// ── History (undo/redo) ─────────────────────────────────────────────────
// Shared with levelEditor.html/anim_editor.html/etc — see game/undoHistory.js.
// State spans two variables (area/currentStyle), so the snapshot bundles both.
function snapshot() { return { area, style: currentStyle }; }
const historyMgr = (typeof UndoHistory !== 'undefined') ? UndoHistory.create(
  snapshot,
  (snap) => {
    area = snap.area;
    if (!area.backdropLayers) area.backdropLayers = [];
    if (!area.cutsceneTriggers) area.cutsceneTriggers = [];
    if (!area.audioZones) area.audioZones = [];
    currentStyle = snap.style;
    selMode = 'none'; selLayerIndex = -1; selTriggerIndex = -1; selAudioZoneIndex = -1;
    renderAll();
    pushFullLiveState();
  }
) : null;
function pushHistory() {
  if (historyMgr) historyMgr.push();
  updateUndoRedoButtons();
  // baseline (unsavedGuard) stays at load/save time on purpose — this only enables the undo/redo buttons
}
function resetHistory() { if (historyMgr) historyMgr.reset(); updateUndoRedoButtons(); }
function undo() { if (historyMgr) historyMgr.undo(); updateUndoRedoButtons(); }
function redo() { if (historyMgr) historyMgr.redo(); updateUndoRedoButtons(); }
function updateUndoRedoButtons() {
  document.getElementById('undo-btn').disabled = !historyMgr || !historyMgr.canUndo();
  document.getElementById('redo-btn').disabled = !historyMgr || !historyMgr.canRedo();
}

// ── Live preview (sandboxed iframe booting the real game) ───────────────
// Same fetch+srcdoc+rewrite technique as editor/debug_v1.html's
// loadSandbox() — see that file's own comment for why srcdoc (path
// rebasing) is needed. Room selection can't go through `?spawnRoom=` (a
// srcdoc document's location is always "about:srcdoc", no query string),
// so a tiny injected patch sets `window.__editorSpawnRoom` instead — see
// the matching comment on applyDevSpawnOverride() in game_boot_save.js.
async function loadSandboxFor(roomId) {
  const iframe = document.getElementById('sandbox');
  const html = await fetch('../index.html').then((r) => r.text());
  const rebased = html.replace(/src="game\//g, 'src="../game/');
  const patch = `<script>window.__editorSpawnRoom = ${JSON.stringify(roomId)};<\/script>`;
  const patched = rebased.replace('<script src="../game/audio.js">', patch + '<script src="../game/audio.js">');
  return new Promise((resolve, reject) => {
    iframe.onload = () => resolve(iframe);
    iframe.onerror = reject;
    iframe.srcdoc = patched;
  });
}

async function refreshPreview() {
  const gen = ++previewGeneration;
  const statusEl = document.getElementById('preview-status');
  win = null;
  statusEl.className = '';
  statusEl.textContent = 'preview: booting…';
  try {
    const iframe = await loadSandboxFor(area.id);
    await new Promise((r) => setTimeout(r, 350)); // let applyDevSpawnOverride()/init() settle, same delay debug_v1.html uses
    if (gen !== previewGeneration) return; // a newer room switch/reload superseded this one
    win = iframe.contentWindow;
    statusEl.className = 'ready';
    statusEl.textContent = 'preview: ready — "' + area.id + '"';
    syncStyleFromPreview();
    pushFullLiveState();
  } catch (e) {
    if (gen !== previewGeneration) return;
    statusEl.className = 'err';
    statusEl.textContent = 'preview failed to load: ' + e.message;
  }
}

// Reads REGION_STYLES[region] from the just-booted preview as the source of
// truth for "what's the current style" (never duplicated/hardcoded here —
// see the REGION_STYLE_FIELDS comment above), so any prior live-saved
// override already shows correctly instead of a stale default.
function syncStyleFromPreview() {
  if (!win || !win.REGION_STYLES || !area.region) { currentStyle = null; return; }
  const style = win.REGION_STYLES[area.region];
  currentStyle = style ? clone(style) : null;
  renderRegionPanel();
  if (selMode === 'region') renderInspector();
}

// Pushes the entire working state into the live preview in one shot — cheap
// enough (a handful of small objects) to call on every keystroke/slider
// tick rather than tracking granular diffs.
function pushFullLiveState() {
  if (!win || !win.AREAS) return;
  const room = win.AREAS[area.id];
  if (room) {
    room.backdropLayers = stripPreview(clone(area.backdropLayers));
    room.hideProceduralBackdrop = !!area.hideProceduralBackdrop;
    // area.cutsceneTriggers[] (Plans/room_scene_editor_plan.md §3/v2) — pushed
    // live so walking the real player (via the parallax scrubber) into an
    // 'enter' zone actually fires the real trigger check in game_update.js,
    // not just an editor-only preview of the rectangle.
    room.cutsceneTriggers = clone(area.cutsceneTriggers || []);
    // area.audioZones[] (see newAudioZone() above) — pushed live so walking
    // the real player (via the parallax scrubber) into a zone actually
    // exercises the real SFX.setAudioZone() check in game_update.js, not
    // just an editor-only preview of the rectangle.
    room.audioZones = clone(area.audioZones || []);
  }
  if (area.region && win.REGION_STYLES && currentStyle) {
    win.REGION_STYLES[area.region] = clone(currentStyle);
  }
  // Re-prime any already-uploaded images in case the iframe was just
  // (re)booted after the upload — avoids waiting on an IndexedDB round trip
  // for art the user already saw once this session.
  if (typeof win.primeRoomImage === 'function') {
    for (const layer of area.backdropLayers) {
      if (layer.imageId && layer._previewDataUrl) win.primeRoomImage(layer.imageId, layer._previewDataUrl);
      if (Array.isArray(layer.frames)) {
        for (const f of layer.frames) {
          if (f.imageId && f._previewDataUrl) win.primeRoomImage(f.imageId, f._previewDataUrl);
        }
      }
    }
  }
}

function onLiveEdit() { pushFullLiveState(); }

// ── Room loading ─────────────────────────────────────────────────────────
function loadRoom(id) {
  area = clone(AREAS[id]);
  if (!area.backdropLayers) area.backdropLayers = [];
  if (!area.cutsceneTriggers) area.cutsceneTriggers = [];
  if (!area.audioZones) area.audioZones = [];
  selMode = 'none'; selLayerIndex = -1; selTriggerIndex = -1; selAudioZoneIndex = -1;
  currentStyle = null;
  resetHistory();
  document.getElementById('scrub').max = area.width;
  document.getElementById('scrub').value = 0;
  renderAll();
  refreshPreview();
  if (typeof DevContext !== 'undefined') DevContext.set({ currentRoomId: id });
  if (unsavedGuard) unsavedGuard.checkpoint();
}

function renderAll() {
  renderLayerList();
  renderRegionPanel();
  renderInspector();
  renderTriggerList();
  renderAudioZoneList();
}

// ── Layer list (left panel) ─────────────────────────────────────────────
function renderLayerList() {
  const listEl = document.getElementById('layer-list');
  listEl.innerHTML = '';
  area.backdropLayers.forEach((layer, i) => {
    const row = document.createElement('div');
    row.className = 'layer-row' + (selMode === 'layer' && selLayerIndex === i ? ' sel' : '');
    row.draggable = true;

    const thumb = document.createElement('img');
    thumb.className = 'thumb';
    if (layer._previewDataUrl) thumb.src = layer._previewDataUrl;
    else thumb.style.visibility = 'hidden';

    const info = document.createElement('div');
    info.className = 'layer-info';
    const name = document.createElement('div');
    name.className = 'layer-name';
    name.textContent = layer.imageId ? ('Layer ' + (i + 1)) : ('Layer ' + (i + 1) + ' (no image)');
    const badge = document.createElement('div');
    badge.className = 'layer-badge';
    badge.textContent = (layer.parallaxX ?? 0).toFixed(2) + 'x / ' + (layer.parallaxY ?? 0).toFixed(2) + 'y';
    info.appendChild(name); info.appendChild(badge);

    const vis = document.createElement('input');
    vis.type = 'checkbox';
    vis.className = 'vis-toggle';
    vis.checked = !layer.hidden;
    vis.title = 'Visible';
    vis.addEventListener('change', () => {
      layer.hidden = !vis.checked;
      onLiveEdit(); pushHistory(); renderLayerList();
    });

    row.appendChild(thumb); row.appendChild(info); row.appendChild(vis);

    row.addEventListener('click', (e) => {
      if (e.target === vis) return;
      selMode = 'layer'; selLayerIndex = i;
      renderLayerList(); renderInspector();
    });
    row.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(i)); });
    row.addEventListener('dragover', (e) => e.preventDefault());
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = Number(e.dataTransfer.getData('text/plain'));
      if (from === i) return;
      const [moved] = area.backdropLayers.splice(from, 1);
      area.backdropLayers.splice(i, 0, moved);
      if (selMode === 'layer') selLayerIndex = area.backdropLayers.indexOf(moved);
      onLiveEdit(); pushHistory(); renderLayerList();
    });

    listEl.appendChild(row);
  });
}

document.getElementById('add-layer-btn').addEventListener('click', () => {
  area.backdropLayers.push(newLayer());
  selMode = 'layer'; selLayerIndex = area.backdropLayers.length - 1;
  onLiveEdit(); pushHistory();
  renderLayerList(); renderInspector();
});

// ── Region style panel (left panel summary + selection) ──────────────────
function renderRegionPanel() {
  const el = document.getElementById('region-panel');
  el.innerHTML = '';
  if (!area.region) {
    el.innerHTML = '<div class="hint">This room has no region set.</div>';
    return;
  }
  const row = document.createElement('div');
  row.className = 'region-row';
  const nameEl = document.createElement('div');
  nameEl.className = 'region-name';
  nameEl.textContent = area.region;
  row.appendChild(nameEl);

  const btn = document.createElement('button');
  btn.className = 'region-btn' + (selMode === 'region' ? ' sel' : '');
  btn.textContent = currentStyle ? '✎ Edit Region Style' : '+ Create Region Style';
  btn.addEventListener('click', () => {
    if (!currentStyle) {
      currentStyle = {
        primary: area.ambientColor || area.mapAccent || '#c4b5fd',
        secondary: '#4338ca',
        glow: '#e9d5ff',
      };
      onLiveEdit(); pushHistory();
    }
    selMode = 'region'; selLayerIndex = -1;
    renderRegionPanel(); renderInspector();
  });
  row.appendChild(btn);

  if (!REGION_STYLE_FIELDS[area.region]) {
    const note = document.createElement('div');
    note.className = 'hint';
    note.style.padding = '6px 0 0';
    note.textContent = 'No decoration code exists yet for this region (only mirror_veil/event_horizon/chrono_rift are wired in decorateRoomForRegion()) — colors are still saved, but won\'t visibly change anything until that code exists.';
    row.appendChild(note);
  }

  el.appendChild(row);
}

// ── Right panel — properties inspector ───────────────────────────────────
function renderInspector() {
  const el = document.getElementById('props');
  el.innerHTML = '';
  if (selMode === 'layer' && area.backdropLayers[selLayerIndex]) {
    renderLayerInspector(el, area.backdropLayers[selLayerIndex]);
  } else if (selMode === 'region' && currentStyle) {
    renderRegionInspector(el);
  } else if (selMode === 'trigger' && area.cutsceneTriggers[selTriggerIndex]) {
    renderTriggerInspector(el, area.cutsceneTriggers[selTriggerIndex]);
  } else if (selMode === 'audioZone' && area.audioZones[selAudioZoneIndex]) {
    renderAudioZoneInspector(el, area.audioZones[selAudioZoneIndex]);
  } else {
    el.innerHTML = '<div class="hint">Select a backdrop layer, the Region Style panel, a cutscene trigger, or an audio zone to edit its properties.</div>';
  }
}

function addRow(parent, labelText, inputEl, readoutEl) {
  const row = document.createElement('div');
  row.className = 'row';
  const label = document.createElement('label');
  label.textContent = labelText;
  row.appendChild(label);
  row.appendChild(inputEl);
  if (readoutEl) row.appendChild(readoutEl);
  parent.appendChild(row);
  return row;
}

// Animated backdrop layer authoring (2026-08-01) — layer.frames[], a small
// flipbook (frame.imageId + frame.duration in ticks) cycled by
// game_entities.js's pickBackdropFrame(), same {imageId, duration} shape
// anim_editor.html's ANIM_DEFS frames use, kept separate from that system
// (not routed through Animator) since a backdrop layer has no entity
// x/y/width/height/facing — it's screen-space parallax art, not something
// attached to a game object. Empty/absent frames[] (every layer before this
// feature, and any layer that never adds one) means "static," handled
// entirely by the single-image path above — this section is purely
// additive.
function renderLayerFramesSection(el, layer) {
  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Animation (optional)';
  el.appendChild(title);

  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = (layer.frames && layer.frames.length)
    ? 'Cycles through the frames below, in order, looping — the single image above is ignored while any frames exist.'
    : 'No frames yet — this layer is a plain static image (the one above). Add a frame to make it a flipbook.';
  el.appendChild(hint);

  (layer.frames || []).forEach((f, i) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.style.alignItems = 'center';

    if (f._previewDataUrl) {
      const thumb = document.createElement('img');
      thumb.src = f._previewDataUrl;
      thumb.style.width = '32px';
      thumb.style.height = '32px';
      thumb.style.objectFit = 'cover';
      thumb.style.border = '1px solid #2a2a4e';
      thumb.style.borderRadius = '3px';
      row.appendChild(thumb);
    }

    const durLabel = document.createElement('label');
    durLabel.textContent = 'Frame ' + (i + 1) + ' dur';
    durLabel.style.marginLeft = '6px';
    const durInput = document.createElement('input');
    durInput.type = 'number';
    durInput.min = '1';
    durInput.style.width = '50px';
    durInput.value = f.duration || 8;
    durInput.addEventListener('change', () => {
      f.duration = Math.max(1, Number(durInput.value) || 8);
      onLiveEdit(); pushHistory();
    });

    const upBtn = document.createElement('button');
    upBtn.textContent = '↑';
    upBtn.disabled = i === 0;
    upBtn.addEventListener('click', () => {
      [layer.frames[i - 1], layer.frames[i]] = [layer.frames[i], layer.frames[i - 1]];
      onLiveEdit(); pushHistory(); renderInspector();
    });
    const downBtn = document.createElement('button');
    downBtn.textContent = '↓';
    downBtn.disabled = i === layer.frames.length - 1;
    downBtn.addEventListener('click', () => {
      [layer.frames[i + 1], layer.frames[i]] = [layer.frames[i], layer.frames[i + 1]];
      onLiveEdit(); pushHistory(); renderInspector();
    });
    const delBtn = document.createElement('button');
    delBtn.className = 'del';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => {
      layer.frames.splice(i, 1);
      onLiveEdit(); pushHistory(); renderInspector();
    });

    row.appendChild(durLabel); row.appendChild(durInput);
    row.appendChild(upBtn); row.appendChild(downBtn); row.appendChild(delBtn);
    el.appendChild(row);
  });

  const addRow = document.createElement('div');
  addRow.className = 'row';
  const addLabel = document.createElement('label');
  addLabel.textContent = '+ Add Frame';
  const addInput = document.createElement('input');
  addInput.type = 'file';
  addInput.accept = 'image/*';
  addInput.style.flex = '1';
  addInput.addEventListener('change', async () => {
    const file = addInput.files[0];
    if (!file) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const id = RoomImageStore.generateId();
    if (!Array.isArray(layer.frames)) layer.frames = [];
    layer.frames.push({ imageId: id, duration: 8, _previewDataUrl: dataUrl });
    try { await RoomImageStore.put(id, dataUrl); } catch (e) { /* IndexedDB unavailable — still primed live below */ }
    addInput.value = '';
    onLiveEdit(); pushHistory();
    renderLayerList(); renderInspector();
  });
  addRow.appendChild(addLabel); addRow.appendChild(addInput);
  el.appendChild(addRow);
}

function renderLayerInspector(el, layer) {
  el.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Layer ' + (selLayerIndex + 1);
  el.appendChild(title);

  // Image upload
  const uploadRow = document.createElement('div');
  uploadRow.className = 'row';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.flex = '1';
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const id = RoomImageStore.generateId();
    layer.imageId = id;
    layer._previewDataUrl = dataUrl;
    try { await RoomImageStore.put(id, dataUrl); } catch (e) { /* IndexedDB unavailable — still primed live below */ }
    onLiveEdit(); pushHistory();
    renderLayerList(); renderInspector();
  });
  uploadRow.appendChild(fileInput);
  el.appendChild(uploadRow);

  if (layer._previewDataUrl) {
    const prevRow = document.createElement('div');
    prevRow.className = 'row';
    const img = document.createElement('img');
    img.src = layer._previewDataUrl;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '90px';
    img.style.border = '1px solid #2a2a4e';
    img.style.borderRadius = '3px';
    prevRow.appendChild(img);
    el.appendChild(prevRow);
  }

  renderLayerFramesSection(el, layer);

  // ParallaxX
  addRangeField(el, 'Parallax X', layer, 'parallaxX', -1, 1, 0.01);
  // ParallaxY
  addRangeField(el, 'Parallax Y', layer, 'parallaxY', -1, 1, 0.01);

  // X / Y offset
  addNumberField(el, 'Offset X', layer, 'x', 10);
  addNumberField(el, 'Offset Y', layer, 'y', 10);

  // Scale
  addRangeField(el, 'Scale', layer, 'scale', 0.1, 5, 0.05);

  // Opacity
  addRangeField(el, 'Opacity', layer, 'opacity', 0, 1, 0.01);

  // Repeat
  const repeatRow = document.createElement('div');
  repeatRow.className = 'row';
  const repeatLabel = document.createElement('label');
  repeatLabel.textContent = 'Repeat';
  const repeatSelect = document.createElement('select');
  ['none', 'x', 'both'].forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = v;
    if ((layer.repeat || 'none') === v) opt.selected = true;
    repeatSelect.appendChild(opt);
  });
  repeatSelect.addEventListener('change', () => {
    layer.repeat = repeatSelect.value;
    onLiveEdit(); pushHistory();
  });
  repeatRow.appendChild(repeatLabel); repeatRow.appendChild(repeatSelect);
  el.appendChild(repeatRow);

  // Tint
  const tintRow = document.createElement('div');
  tintRow.className = 'row';
  const tintLabel = document.createElement('label');
  tintLabel.textContent = 'Tint';
  const tintInput = document.createElement('input');
  tintInput.type = 'color';
  tintInput.value = layer.tint || '#000000';
  tintInput.addEventListener('input', () => { layer.tint = tintInput.value; onLiveEdit(); });
  tintInput.addEventListener('change', () => pushHistory());
  const tintClear = document.createElement('button');
  tintClear.textContent = 'Clear';
  tintClear.addEventListener('click', () => { layer.tint = null; onLiveEdit(); pushHistory(); renderInspector(); });
  tintRow.appendChild(tintLabel); tintRow.appendChild(tintInput); tintRow.appendChild(tintClear);
  el.appendChild(tintRow);

  // Delete
  const delRow = document.createElement('div');
  delRow.className = 'row';
  const delBtn = document.createElement('button');
  delBtn.className = 'del';
  delBtn.textContent = '✕ Delete Layer';
  delBtn.addEventListener('click', () => {
    area.backdropLayers.splice(selLayerIndex, 1);
    selMode = 'none'; selLayerIndex = -1;
    onLiveEdit(); pushHistory();
    renderLayerList(); renderInspector();
  });
  delRow.appendChild(delBtn);
  el.appendChild(delRow);
}

function addRangeField(parent, labelText, obj, key, min, max, step) {
  const row = document.createElement('div');
  row.className = 'row';
  const label = document.createElement('label');
  label.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = min; input.max = max; input.step = step;
  input.value = obj[key] ?? 0;
  const readout = document.createElement('span');
  readout.className = 'readout';
  readout.textContent = Number(input.value).toFixed(2);
  input.addEventListener('input', () => {
    obj[key] = parseFloat(input.value);
    readout.textContent = obj[key].toFixed(2);
    onLiveEdit();
    if (selMode === 'layer') renderLayerList(); // keep the parallax badge in sync
  });
  input.addEventListener('change', () => pushHistory());
  row.appendChild(label); row.appendChild(input); row.appendChild(readout);
  parent.appendChild(row);
}

function addNumberField(parent, labelText, obj, key, step) {
  const row = document.createElement('div');
  row.className = 'row';
  const label = document.createElement('label');
  label.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'number';
  input.step = step || 1;
  input.value = obj[key] ?? 0;
  input.addEventListener('input', () => { obj[key] = parseFloat(input.value) || 0; onLiveEdit(); });
  input.addEventListener('change', () => pushHistory());
  row.appendChild(label); row.appendChild(input);
  parent.appendChild(row);
}

function renderRegionInspector(el) {
  el.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Region Style — ' + area.region;
  el.appendChild(title);

  const note = document.createElement('div');
  note.className = 'hint';
  note.textContent = 'Applies to every room in this region, not just this one.';
  el.appendChild(note);

  ['primary', 'secondary', 'glow'].forEach((key) => {
    const row = document.createElement('div');
    row.className = 'row';
    const label = document.createElement('label');
    label.textContent = key;
    const input = document.createElement('input');
    input.type = 'color';
    input.value = currentStyle[key] || '#c4b5fd';
    input.addEventListener('input', () => { currentStyle[key] = input.value; onLiveEdit(); });
    input.addEventListener('change', () => pushHistory());
    row.appendChild(label); row.appendChild(input);
    el.appendChild(row);
  });

  const fields = REGION_STYLE_FIELDS[area.region] || [];
  for (const f of fields) {
    if (currentStyle[f.key] === undefined) currentStyle[f.key] = Math.round((f.min + f.max) / 2);
    addRangeField(el, f.label, currentStyle, f.key, f.min, f.max, f.step);
  }

  const delRow = document.createElement('div');
  delRow.className = 'row';
  const delBtn = document.createElement('button');
  delBtn.className = 'del';
  delBtn.textContent = '✕ Remove Region Style';
  delBtn.addEventListener('click', () => {
    currentStyle = null;
    if (win && win.REGION_STYLES) delete win.REGION_STYLES[area.region];
    selMode = 'none';
    pushHistory();
    renderRegionPanel(); renderInspector();
  });
  delRow.appendChild(delBtn);
  el.appendChild(delRow);
}

// ── Camera-pan scrubber (Plans/room_scene_editor_plan.md §4) ─────────────
const scrubEl = document.getElementById('scrub');
scrubEl.addEventListener('input', () => {
  if (!win || !win.player) return;
  win.player.x = Number(scrubEl.value);
  win.player.vx = 0;
});
function jumpScrubTo(worldX) {
  scrubEl.value = Math.max(0, Math.min(area.width, worldX));
  scrubEl.dispatchEvent(new Event('input'));
}

// ── Cutscene trigger list (left panel) — v2, Plans/room_scene_editor_plan.md
// §3/§4. cutsceneTriggers[] is data-driven room-entry/on-load plot triggers,
// closing the gap the plan describes: today's 3 hardcoded `if` conditions in
// game_update.js/game_entities.js aren't visible or movable without editing
// JS. ─────────────────────────────────────────────────────────────────────
function renderTriggerList() {
  const listEl = document.getElementById('trigger-list');
  listEl.innerHTML = '';
  area.cutsceneTriggers.forEach((trig, i) => {
    const row = document.createElement('div');
    row.className = 'layer-row' + (selMode === 'trigger' && selTriggerIndex === i ? ' sel' : '');
    const info = document.createElement('div');
    info.className = 'layer-info';
    const name = document.createElement('div');
    name.className = 'layer-name';
    name.textContent = trig.cutsceneId || '(no cutsceneId)';
    const badge = document.createElement('div');
    badge.className = 'layer-badge';
    badge.textContent = trig.triggerType === 'onRoomLoad' ? '⚑ on room load' : '▣ enter zone';
    info.appendChild(name); info.appendChild(badge);
    row.appendChild(info);
    row.addEventListener('click', () => {
      selMode = 'trigger'; selTriggerIndex = i;
      jumpScrubTo(trig.x + trig.w / 2);
      renderTriggerList(); renderInspector();
    });
    listEl.appendChild(row);
  });
}

document.getElementById('add-trigger-btn').addEventListener('click', () => {
  const centerX = Number(scrubEl.value) || area.width / 2;
  area.cutsceneTriggers.push(newTrigger(centerX, area.groundY));
  selMode = 'trigger'; selTriggerIndex = area.cutsceneTriggers.length - 1;
  onLiveEdit(); pushHistory();
  renderTriggerList(); renderInspector();
});

function renderTriggerInspector(el, trig) {
  el.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Cutscene Trigger';
  el.appendChild(title);

  // Trigger type
  const typeRow = document.createElement('div');
  typeRow.className = 'row';
  const typeLabel = document.createElement('label');
  typeLabel.textContent = 'Type';
  const typeSelect = document.createElement('select');
  [['enter', 'Enter Zone'], ['onRoomLoad', 'On Room Load']].forEach(([v, label]) => {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = label;
    if ((trig.triggerType || 'enter') === v) opt.selected = true;
    typeSelect.appendChild(opt);
  });
  typeSelect.addEventListener('change', () => {
    trig.triggerType = typeSelect.value;
    onLiveEdit(); pushHistory(); renderTriggerList();
  });
  typeRow.appendChild(typeLabel); typeRow.appendChild(typeSelect);
  el.appendChild(typeRow);
  if (trig.triggerType === 'onRoomLoad') {
    const note = document.createElement('div');
    note.className = 'hint';
    note.textContent = 'Fires once when this room is entered via a door (switchArea()) — the zone below is ignored for this type.';
    el.appendChild(note);
  }

  // cutsceneId (datalist-autocompleted from the real CUTSCENES, same pattern
  // levelEditor.html's Lore Pip panel uses)
  const csRow = document.createElement('div');
  csRow.className = 'row';
  const csLabel = document.createElement('label');
  csLabel.textContent = 'cutsceneId';
  const csInput = document.createElement('input');
  csInput.type = 'text';
  csInput.setAttribute('list', 'cutscene-ids-datalist');
  csInput.value = trig.cutsceneId || '';
  csInput.addEventListener('input', () => { trig.cutsceneId = csInput.value; onLiveEdit(); renderTriggerList(); });
  csInput.addEventListener('change', () => pushHistory());
  csRow.appendChild(csLabel); csRow.appendChild(csInput);
  el.appendChild(csRow);
  if (typeof CUTSCENES === 'undefined' || !Object.keys(CUTSCENES).length) {
    const warn = document.createElement('div');
    warn.className = 'hint';
    warn.style.color = '#e0a458';
    warn.textContent = 'No CUTSCENES found (game/cutscene.js not loaded) — type the id anyway, it just won\'t autocomplete.';
    el.appendChild(warn);
  }

  // storyFlag, with a live hint on whether any known cutscene actually sets it
  const flagRow = document.createElement('div');
  flagRow.className = 'row';
  const flagLabel = document.createElement('label');
  flagLabel.textContent = 'storyFlag';
  const flagInput = document.createElement('input');
  flagInput.type = 'text';
  flagInput.value = trig.storyFlag || '';
  const flagHint = document.createElement('div');
  flagHint.className = 'hint';
  function renderFlagHint() {
    if (!trig.storyFlag) {
      flagHint.innerHTML = 'No storyFlag set — this trigger has no permanent "already played" gate (only a same-visit debounce, so it won\'t refire while you\'re standing in the zone, but it will fire again on a later visit).';
      return;
    }
    const setter = findCutsceneSettingFlag(trig.storyFlag);
    flagHint.innerHTML = setter
      ? `<span class="ok">✓ set by cutscene '${setter}' via setFlag — this trigger will correctly skip itself for good once that scene plays.</span>`
      : `<span class="bad">⚠ no known CUTSCENES script sets this flag via setFlag — double check '${trig.cutsceneId || "this trigger's cutscene"}' actually sets it, or this will refire on later visits.</span>`;
  }
  flagInput.addEventListener('input', () => { trig.storyFlag = flagInput.value; onLiveEdit(); renderFlagHint(); });
  flagInput.addEventListener('change', () => pushHistory());
  flagRow.appendChild(flagLabel); flagRow.appendChild(flagInput);
  el.appendChild(flagRow);
  el.appendChild(flagHint);
  renderFlagHint();

  // Zone geometry — precise numeric editing alongside dragging the overlay
  if (trig.triggerType !== 'onRoomLoad') {
    addNumberField(el, 'X', trig, 'x', 10);
    addNumberField(el, 'Y', trig, 'y', 10);
    addNumberField(el, 'Width', trig, 'w', 10);
    addNumberField(el, 'Height', trig, 'h', 10);
  }

  // Test button — plays the cutscene directly in the live preview, bypassing
  // the zone/storyFlag checks entirely (a dedicated "does this scene even
  // play" check, same spirit as enemy_editor.html's "Test in Arena" handoff).
  const testRow = document.createElement('div');
  testRow.className = 'row';
  const testBtn = document.createElement('button');
  testBtn.textContent = '▶ Test Cutscene';
  testBtn.addEventListener('click', () => {
    if (win && typeof win.playCutscene === 'function' && trig.cutsceneId) win.playCutscene(trig.cutsceneId);
  });
  testRow.appendChild(testBtn);
  el.appendChild(testRow);

  // Delete
  const delRow = document.createElement('div');
  delRow.className = 'row';
  const delBtn = document.createElement('button');
  delBtn.className = 'del';
  delBtn.textContent = '✕ Delete Trigger';
  delBtn.addEventListener('click', () => {
    area.cutsceneTriggers.splice(selTriggerIndex, 1);
    selMode = 'none'; selTriggerIndex = -1;
    onLiveEdit(); pushHistory();
    renderTriggerList(); renderInspector();
  });
  delRow.appendChild(delBtn);
  el.appendChild(delRow);
}

function populateCutsceneDatalist() {
  let dl = document.getElementById('cutscene-ids-datalist');
  if (!dl) {
    dl = document.createElement('datalist');
    dl.id = 'cutscene-ids-datalist';
    document.body.appendChild(dl);
  }
  dl.innerHTML = '';
  if (typeof CUTSCENES === 'undefined') return;
  for (const id in CUTSCENES) {
    const opt = document.createElement('option');
    opt.value = id;
    dl.appendChild(opt);
  }
}
populateCutsceneDatalist();

// ── Audio zone list (left panel) — mirrors the cutscene trigger list above.
function renderAudioZoneList() {
  const listEl = document.getElementById('audiozone-list');
  listEl.innerHTML = '';
  area.audioZones.forEach((zone, i) => {
    const row = document.createElement('div');
    row.className = 'layer-row' + (selMode === 'audioZone' && selAudioZoneIndex === i ? ' sel' : '');
    const info = document.createElement('div');
    info.className = 'layer-info';
    const name = document.createElement('div');
    name.className = 'layer-name';
    name.textContent = zone.trackKey || '(no trackKey)';
    const badge = document.createElement('div');
    badge.className = 'layer-badge';
    badge.textContent = '♪ zone';
    info.appendChild(name); info.appendChild(badge);
    row.appendChild(info);
    row.addEventListener('click', () => {
      selMode = 'audioZone'; selAudioZoneIndex = i;
      jumpScrubTo(zone.x + zone.w / 2);
      renderAudioZoneList(); renderInspector();
    });
    listEl.appendChild(row);
  });
}

document.getElementById('add-audiozone-btn').addEventListener('click', () => {
  const centerX = Number(scrubEl.value) || area.width / 2;
  area.audioZones.push(newAudioZone(centerX, area.groundY));
  selMode = 'audioZone'; selAudioZoneIndex = area.audioZones.length - 1;
  onLiveEdit(); pushHistory();
  renderAudioZoneList(); renderInspector();
});

function renderAudioZoneInspector(el, zone) {
  el.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Audio Zone';
  el.appendChild(title);

  const note = document.createElement('div');
  note.className = 'hint';
  note.textContent = 'While the player is standing inside this zone, the room\'s music crossfades to trackKey instead of its normal AREA_MUSIC_MAP track — reverts automatically on leaving the zone.';
  el.appendChild(note);

  // trackKey — datalist-autocompleted from the real SFX.getMusicKeys()
  // (same pattern the cutscene trigger's cutsceneId field uses for CUTSCENES).
  const tkRow = document.createElement('div');
  tkRow.className = 'row';
  const tkLabel = document.createElement('label');
  tkLabel.textContent = 'trackKey';
  const tkInput = document.createElement('input');
  tkInput.type = 'text';
  tkInput.setAttribute('list', 'music-keys-datalist');
  tkInput.value = zone.trackKey || '';
  tkInput.addEventListener('input', () => { zone.trackKey = tkInput.value; onLiveEdit(); renderAudioZoneList(); });
  tkInput.addEventListener('change', () => pushHistory());
  tkRow.appendChild(tkLabel); tkRow.appendChild(tkInput);
  el.appendChild(tkRow);
  if (typeof SFX === 'undefined' || !SFX.getMusicKeys || !SFX.getMusicKeys().length) {
    const warn = document.createElement('div');
    warn.className = 'hint';
    warn.style.color = '#e0a458';
    warn.textContent = 'No music tracks found (game/audio.js not loaded) — type the key anyway, it just won\'t autocomplete.';
    el.appendChild(warn);
  }

  // Zone geometry — precise numeric editing alongside dragging the overlay
  addNumberField(el, 'X', zone, 'x', 10);
  addNumberField(el, 'Y', zone, 'y', 10);
  addNumberField(el, 'Width', zone, 'w', 10);
  addNumberField(el, 'Height', zone, 'h', 10);

  // Delete
  const delRow = document.createElement('div');
  delRow.className = 'row';
  const delBtn = document.createElement('button');
  delBtn.className = 'del';
  delBtn.textContent = '✕ Delete Audio Zone';
  delBtn.addEventListener('click', () => {
    area.audioZones.splice(selAudioZoneIndex, 1);
    selMode = 'none'; selAudioZoneIndex = -1;
    onLiveEdit(); pushHistory();
    renderAudioZoneList(); renderInspector();
  });
  delRow.appendChild(delBtn);
  el.appendChild(delRow);
}

function populateMusicKeysDatalist() {
  let dl = document.getElementById('music-keys-datalist');
  if (!dl) {
    dl = document.createElement('datalist');
    dl.id = 'music-keys-datalist';
    document.body.appendChild(dl);
  }
  dl.innerHTML = '';
  if (typeof SFX === 'undefined' || !SFX.getMusicKeys) return;
  for (const key of SFX.getMusicKeys()) {
    const opt = document.createElement('option');
    opt.value = key;
    dl.appendChild(opt);
  }
}
populateMusicKeysDatalist();

// ── Trigger-zone overlay (center pane) — a transparent canvas stacked on
// top of the live preview iframe, redrawn every frame from a small rAF loop
// that mirrors the iframe's real win.camera so zone rectangles track the
// camera scrubber/parallax preview exactly (screen = (world - camera) *
// zoom, same transform applyCamera() uses in game_state.js). Trigger zones
// are otherwise invisible in real gameplay by design, so this overlay is
// purely an editor affordance — it never touches the iframe's own canvas.
const overlayCanvas = document.getElementById('trigger-overlay');
const overlayCtx = overlayCanvas.getContext('2d');
const HANDLE_HIT = 7;   // screen px — corner-handle hit-test radius
const MIN_TRIGGER_SIZE = 20; // world units — floor on drag-resize

function worldToScreenX(wx) { return (wx - liveCamera.x) * liveCamera.zoom; }
function worldToScreenY(wy) { return (wy - liveCamera.y) * liveCamera.zoom; }

function drawTriggerOverlay() {
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  if (!area) return;
  area.cutsceneTriggers.forEach((trig, i) => {
    if (trig.triggerType === 'onRoomLoad') return; // no zone to draw — whole-room trigger
    const x = worldToScreenX(trig.x), y = worldToScreenY(trig.y);
    const w = trig.w * liveCamera.zoom, h = trig.h * liveCamera.zoom;
    const isSel = selMode === 'trigger' && selTriggerIndex === i;
    overlayCtx.save();
    overlayCtx.strokeStyle = isSel ? '#fbbf24' : '#67e8f9';
    overlayCtx.fillStyle = isSel ? 'rgba(251,191,36,0.12)' : 'rgba(103,232,249,0.08)';
    overlayCtx.lineWidth = isSel ? 2 : 1.5;
    overlayCtx.setLineDash([6, 4]);
    overlayCtx.fillRect(x, y, w, h);
    overlayCtx.strokeRect(x, y, w, h);
    overlayCtx.setLineDash([]);
    overlayCtx.fillStyle = isSel ? '#fbbf24' : '#67e8f9';
    overlayCtx.font = '10px monospace';
    overlayCtx.fillText('▣ ' + (i + 1), x + 3, y + 11);
    if (isSel) {
      const hs = 4;
      [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([hx, hy]) => {
        overlayCtx.fillRect(hx - hs, hy - hs, hs * 2, hs * 2);
      });
    }
    overlayCtx.restore();
  });
  area.audioZones.forEach((zone, i) => {
    const x = worldToScreenX(zone.x), y = worldToScreenY(zone.y);
    const w = zone.w * liveCamera.zoom, h = zone.h * liveCamera.zoom;
    const isSel = selMode === 'audioZone' && selAudioZoneIndex === i;
    overlayCtx.save();
    overlayCtx.strokeStyle = isSel ? '#fbbf24' : '#a78bfa';
    overlayCtx.fillStyle = isSel ? 'rgba(251,191,36,0.12)' : 'rgba(167,139,250,0.08)';
    overlayCtx.lineWidth = isSel ? 2 : 1.5;
    overlayCtx.setLineDash([2, 3]); // dotted, vs. the cutscene triggers' dashed [6,4] — visually distinct at a glance
    overlayCtx.fillRect(x, y, w, h);
    overlayCtx.strokeRect(x, y, w, h);
    overlayCtx.setLineDash([]);
    overlayCtx.fillStyle = isSel ? '#fbbf24' : '#a78bfa';
    overlayCtx.font = '10px monospace';
    overlayCtx.fillText('♪ ' + (i + 1), x + 3, y + 11);
    if (isSel) {
      const hs = 4;
      [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([hx, hy]) => {
        overlayCtx.fillRect(hx - hs, hy - hs, hs * 2, hs * 2);
      });
    }
    overlayCtx.restore();
  });
}

function overlayTick() {
  requestAnimationFrame(overlayTick);
  if (win && win.camera) {
    liveCamera.x = win.camera.x; liveCamera.y = win.camera.y; liveCamera.zoom = win.camera.zoom || 1;
  }
  drawTriggerOverlay();
}
overlayTick();

function overlayMousePos(e) {
  const rect = overlayCanvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}
function triggerScreenRect(trig) {
  return { x: worldToScreenX(trig.x), y: worldToScreenY(trig.y), w: trig.w * liveCamera.zoom, h: trig.h * liveCamera.zoom };
}
function hitTestTriggerHandle(trig, mx, my) {
  const r = triggerScreenRect(trig);
  const corners = { nw: [r.x, r.y], ne: [r.x + r.w, r.y], sw: [r.x, r.y + r.h], se: [r.x + r.w, r.y + r.h] };
  for (const key in corners) {
    const [cx, cy] = corners[key];
    if (Math.abs(mx - cx) <= HANDLE_HIT && Math.abs(my - cy) <= HANDLE_HIT) return key;
  }
  return null;
}
function hitTestTriggerBody(trig, mx, my) {
  const r = triggerScreenRect(trig);
  return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
}
// Audio zones are the same {x,y,w,h} rect shape as a trigger — reuse the
// exact same screen-rect/handle/body math via triggerScreenRect() etc.,
// just aliased so the drag-handling code below stays symmetrical to read.
const audioZoneScreenRect = triggerScreenRect;
const hitTestAudioZoneHandle = hitTestTriggerHandle;
const hitTestAudioZoneBody = hitTestTriggerBody;

let triggerDrag = null; // {mode:'move'|'resize', corner, startMouseX, startMouseY, orig:{x,y,w,h}}
let audioZoneDrag = null; // same shape, for area.audioZones instead

overlayCanvas.addEventListener('mousedown', (e) => {
  if (!area) return;
  const { x: mx, y: my } = overlayMousePos(e);
  const triggers = area.cutsceneTriggers;
  const zones = area.audioZones;

  if (selMode === 'trigger' && triggers[selTriggerIndex] && triggers[selTriggerIndex].triggerType !== 'onRoomLoad') {
    const corner = hitTestTriggerHandle(triggers[selTriggerIndex], mx, my);
    if (corner) {
      const t = triggers[selTriggerIndex];
      triggerDrag = { mode: 'resize', corner, startMouseX: mx, startMouseY: my, orig: { x: t.x, y: t.y, w: t.w, h: t.h } };
      return;
    }
  }
  if (selMode === 'audioZone' && zones[selAudioZoneIndex]) {
    const corner = hitTestAudioZoneHandle(zones[selAudioZoneIndex], mx, my);
    if (corner) {
      const z = zones[selAudioZoneIndex];
      audioZoneDrag = { mode: 'resize', corner, startMouseX: mx, startMouseY: my, orig: { x: z.x, y: z.y, w: z.w, h: z.h } };
      return;
    }
  }
  for (let i = triggers.length - 1; i >= 0; i--) {
    if (triggers[i].triggerType === 'onRoomLoad') continue;
    if (hitTestTriggerBody(triggers[i], mx, my)) {
      selMode = 'trigger'; selTriggerIndex = i;
      const t = triggers[i];
      triggerDrag = { mode: 'move', startMouseX: mx, startMouseY: my, orig: { x: t.x, y: t.y, w: t.w, h: t.h } };
      renderTriggerList(); renderInspector();
      return;
    }
  }
  for (let i = zones.length - 1; i >= 0; i--) {
    if (hitTestAudioZoneBody(zones[i], mx, my)) {
      selMode = 'audioZone'; selAudioZoneIndex = i;
      const z = zones[i];
      audioZoneDrag = { mode: 'move', startMouseX: mx, startMouseY: my, orig: { x: z.x, y: z.y, w: z.w, h: z.h } };
      renderAudioZoneList(); renderInspector();
      return;
    }
  }
  if (selMode === 'trigger') { selMode = 'none'; selTriggerIndex = -1; renderTriggerList(); renderInspector(); }
  else if (selMode === 'audioZone') { selMode = 'none'; selAudioZoneIndex = -1; renderAudioZoneList(); renderInspector(); }
});

window.addEventListener('mousemove', (e) => {
  if (!area) return;
  const { x: mx, y: my } = overlayMousePos(e);
  if (triggerDrag) {
    const dxWorld = (mx - triggerDrag.startMouseX) / liveCamera.zoom;
    const dyWorld = (my - triggerDrag.startMouseY) / liveCamera.zoom;
    const t = area.cutsceneTriggers[selTriggerIndex];
    if (!t) { triggerDrag = null; return; }
    const o = triggerDrag.orig;
    if (triggerDrag.mode === 'move') {
      t.x = Math.max(0, o.x + dxWorld);
      t.y = Math.max(0, o.y + dyWorld);
    } else {
      const r = resizeRectByCorner(o, triggerDrag.corner, dxWorld, dyWorld, MIN_TRIGGER_SIZE);
      t.x = r.x; t.y = r.y; t.w = r.w; t.h = r.h;
    }
    if (selMode === 'trigger') renderInspector(); // keep the numeric x/y/w/h fields live in sync while dragging
  }
  if (audioZoneDrag) {
    const dxWorld = (mx - audioZoneDrag.startMouseX) / liveCamera.zoom;
    const dyWorld = (my - audioZoneDrag.startMouseY) / liveCamera.zoom;
    const z = area.audioZones[selAudioZoneIndex];
    if (!z) { audioZoneDrag = null; return; }
    const o = audioZoneDrag.orig;
    if (audioZoneDrag.mode === 'move') {
      z.x = Math.max(0, o.x + dxWorld);
      z.y = Math.max(0, o.y + dyWorld);
    } else {
      const r = resizeRectByCorner(o, audioZoneDrag.corner, dxWorld, dyWorld, MIN_TRIGGER_SIZE);
      z.x = r.x; z.y = r.y; z.w = r.w; z.h = r.h;
    }
    if (selMode === 'audioZone') renderInspector();
  }
});

window.addEventListener('mouseup', () => {
  if (!triggerDrag && !audioZoneDrag) return;
  triggerDrag = null;
  audioZoneDrag = null;
  onLiveEdit(); pushHistory();
});

// ── Export / Save-live ────────────────────────────────────────────────────
document.getElementById('exp-btn').addEventListener('click', () => {
  const layers = stripPreview(area.backdropLayers);
  let out = `// Paste into AREAS['${area.id}'] (add/replace these fields):\n`
    + `backdropLayers: ${JSON.stringify(layers, null, 2)},\n`
    + `hideProceduralBackdrop: ${!!area.hideProceduralBackdrop},\n`
    + `cutsceneTriggers: ${JSON.stringify(area.cutsceneTriggers, null, 2)},\n`
    + `audioZones: ${JSON.stringify(area.audioZones, null, 2)},`;
  if (currentStyle) {
    out += `\n\n// Paste into REGION_STYLES in game/game_entities.js:\n`
      + `${area.region}: ${JSON.stringify(currentStyle, null, 2)},`;
  }
  document.getElementById('exp-out').value = out;
});

document.getElementById('save-room-live-btn').addEventListener('click', () => {
  const statusEl = document.getElementById('live-status');
  let overrides = {};
  try { overrides = JSON.parse(localStorage.getItem('stillpoint_area_overrides_v1') || '{}'); } catch (e) { overrides = {}; }
  const toSave = clone(area);
  toSave.backdropLayers = stripPreview(toSave.backdropLayers);
  overrides[area.id] = toSave;
  try {
    localStorage.setItem('stillpoint_area_overrides_v1', JSON.stringify(overrides));
    statusEl.innerHTML = `<span class="ok">✓ saved live override for "${area.id}" — reload index.html/enemy_test.html to see it there</span>`;
    if (typeof DevContext !== 'undefined') DevContext.log('Room Scene Editor', 'Saved room live override', area.id);
    if (unsavedGuard) unsavedGuard.checkpoint();
  } catch (e) {
    statusEl.innerHTML = `<span class="bad">✗ save failed: ${e.message} (localStorage full? clear old overrides)</span>`;
  }
});

document.getElementById('save-style-live-btn').addEventListener('click', () => {
  const statusEl = document.getElementById('live-status');
  if (!currentStyle || !area.region) {
    statusEl.innerHTML = `<span class="bad">✗ no region style to save — create one first</span>`;
    return;
  }
  let overrides = {};
  try { overrides = JSON.parse(localStorage.getItem('stillpoint_region_style_overrides_v1') || '{}'); } catch (e) { overrides = {}; }
  overrides[area.region] = clone(currentStyle);
  try {
    localStorage.setItem('stillpoint_region_style_overrides_v1', JSON.stringify(overrides));
    statusEl.innerHTML = `<span class="ok">✓ saved live override for region "${area.region}"</span>`;
    if (typeof DevContext !== 'undefined') DevContext.log('Room Scene Editor', 'Saved region style live override', area.region);
  } catch (e) {
    statusEl.innerHTML = `<span class="bad">✗ save failed: ${e.message}</span>`;
  }
});

// ── Undo/redo keys + buttons ──────────────────────────────────────────────
document.getElementById('undo-btn').addEventListener('click', undo);
document.getElementById('redo-btn').addEventListener('click', redo);
document.getElementById('reload-preview-btn').addEventListener('click', refreshPreview);
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
});

// ── Room picker ───────────────────────────────────────────────────────────
const roomSelect = document.getElementById('room-select');
ALL_ROOM_IDS.sort().forEach((id) => {
  const opt = document.createElement('option');
  opt.value = id;
  opt.textContent = `${AREAS[id].name || id} (${id})`;
  roomSelect.appendChild(opt);
});
roomSelect.addEventListener('change', () => loadRoom(roomSelect.value));

// ── Init ──────────────────────────────────────────────────────────────────
// Declared before the first loadRoom() call below — loadRoom()/pushHistory()
// both reference `unsavedGuard`, and a `const` binding is in its temporal
// dead zone until this line actually runs.
const unsavedGuard = (typeof UnsavedGuard !== 'undefined')
  ? UnsavedGuard.watch(() => ({ area, currentStyle }))
  : null;

const deepLinkRoom = new URLSearchParams(location.search).get('room');
const initialRoom = (deepLinkRoom && AREAS[deepLinkRoom]) ? deepLinkRoom : ALL_ROOM_IDS.sort()[0];
roomSelect.value = initialRoom;
loadRoom(initialRoom);
