// Cutscene Step Editor — Plans/archive/cutscene_editor_plan.md v1 (2026-07-30).
// A structured list-and-form editor over cutscene.js's already-fully-specified
// CUTSCENES step format (wait/text/cameraPan/cameraReturn/movePlayer/setFlag/
// call/choice) — deliberately NOT a timeline/node-graph UI, per the plan's
// research into branching-cutscene tooling (§1). Ships v1's staged scope
// (list authoring for all step types, incl. choice-branch nesting) plus the
// plan's §7-recommended CHEAP preview (a mocked static walkthrough) instead
// of the real-game-iframe preview, which the plan explicitly stages for v2.
//
// 'call' steps use the safe-preset-library + raw-code-escape-hatch split
// enemy_designer.html already established for anything a guided UI can't
// cover (plan §3). Working step data always carries a JSON-safe `_callCode`
// source string (never a live `fn`, which JSON.stringify/structuredClone
// can't survive) — cutscene.js's materializeCallSteps() rebuilds the real
// `fn` from that string when overrides are applied or a paste-ready export
// is used.

function clone(o) { return typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)); }

const CUTSCENE_OVERRIDES_KEY = 'stillpoint_cutscene_overrides_v1';

// Known storyFlags — a static snapshot (grepped `storyFlags\.\w+`/`storyFlags\[`
// across game/*.js once), not live-computed every load, per the plan's own
// guidance (§2's setFlag autocomplete note). Regenerate by hand if new flags
// show up in game code that this list hasn't caught up to yet.
const KNOWN_STORY_FLAGS = [
  'child_choice_resolved', 'echo_bridge_intro_seen',
  'child_fight_choice_resolved', 'antechamber_ending',
];

const ACTION_NAMES = [
  'moveLeft', 'moveRight', 'aimUp', 'aimDown', 'jump', 'attack', 'dash',
  'shardShot', 'stillpoint', 'gravitonSurge', 'voidTether', 'callChild',
];

// game_state.js's ABILITY_GRANTS key→abilityState-flag map, snapshotted here
// (not loaded live — game_state.js can't load in this editor without a
// canvas#game element, same reason minibossRegistry.js avoids it, see
// CLAUDE.md). Regenerate by hand if a new grantable ability is added.
const ABILITY_FLAG_MAP = {
  phase_dash: 'hasPhaseDash',
  shard_shot: 'hasShardShot',
  stillpoint: 'hasStillpoint',
  charged_attack: 'hasChargedAttack',
  graviton_surge: 'hasGravitonSurge',
  void_tether: 'hasVoidTether',
};

// 'call' step preset library — the 3 patterns already used by the real
// cutscenes (plan §3/§7 point 2), each a parameterized template, not free code.
const CALL_PRESETS = {
  grantAbility: {
    label: 'Grant ability',
    fields: [{ key: 'ability', label: 'Ability', type: 'select', options: () => Object.keys(ABILITY_FLAG_MAP) }],
    build: (a) => `() => { abilityState.${ABILITY_FLAG_MAP[a.ability] || 'hasUnknown'} = true; }`,
  },
  companionActive: {
    label: 'Set companion active',
    fields: [{ key: 'value', label: 'Active', type: 'bool', default: true }],
    build: (a) => `() => { companionState.active = ${!!a.value}; }`,
  },
  companionCanFight: {
    label: 'Set companion canFight',
    fields: [
      { key: 'value', label: 'Can Fight', type: 'bool', default: true },
      { key: 'weapon', label: 'Weapon (if not already set)', type: 'text', placeholder: 'knuckles' },
    ],
    build: (a) => `() => { companionState.canFight = ${!!a.value};${a.weapon ? ` if (!companionState.weapon) companionState.weapon = '${a.weapon.replace(/'/g, "\\'")}';` : ''} }`,
  },
  fractureMaxIncrement: {
    label: 'Increment Fracture Max',
    fields: [{ key: 'amount', label: 'Amount', type: 'number', default: 1 }],
    build: (a) => `() => { player.fractureMax = Math.min(FRACTURE_ABS_MAX, player.fractureMax + ${Number(a.amount) || 1}); }`,
  },
  custom: {
    label: '⚠ Raw code (escape hatch)',
    fields: [],
    build: (a) => a.rawCode || '() => {}',
  },
};

// ── Working data ─────────────────────────────────────────────────────────
// { [key]: { steps: [...] } } — steps' 'call' entries carry _callPreset/
// _callArgs/_callCode instead of a live fn. Seeded from the real CUTSCENES.
let workingCutscenes = {};
let selectedKey = null;
let selection = null; // { path: [{index, branch}...], index } or null
let unsavedGuard = null;

function importCallStep(step) {
  // Real CUTSCENES steps have a live fn; convert to the editable string form.
  // fn.toString() reproduces real source for both arrow and function-expr
  // syntax — good enough to show back in the raw-code box for re-editing.
  if (step.fn && !step._callCode) {
    step._callCode = step.fn.toString();
    step._callPreset = 'custom';
    delete step.fn;
  }
}

function importSteps(steps) {
  for (const step of (steps || [])) {
    if (step.type === 'call') importCallStep(step);
    if (step.type === 'choice') {
      step.onA = step.onA || [];
      step.onB = step.onB || [];
      importSteps(step.onA);
      importSteps(step.onB);
    }
  }
  return steps;
}

// Deep-copies a step list WITHOUT going through structuredClone/JSON — real
// CUTSCENES 'call' steps carry a live `fn`, and structuredClone throws on
// functions (JSON.stringify would just silently drop it, which is nearly as
// bad — either way it can't be the general clone() helper). Object identity
// of `fn` itself is fine to share (we never mutate a function value, only
// replace it with a new one), so this only needs new step/array objects.
function deepCloneStepsKeepingFn(steps) {
  return (steps || []).map((step) => {
    const copy = {};
    for (const k in step) { if (k !== 'fn') copy[k] = step[k]; }
    if (step.fn) copy.fn = step.fn;
    if (step.type === 'choice') {
      copy.onA = deepCloneStepsKeepingFn(step.onA);
      copy.onB = deepCloneStepsKeepingFn(step.onB);
    }
    return copy;
  });
}

function seedWorkingData() {
  const src = (typeof CUTSCENES !== 'undefined') ? CUTSCENES : {};
  workingCutscenes = {};
  for (const key in src) {
    const steps = deepCloneStepsKeepingFn(src[key].steps || []);
    importSteps(steps);
    workingCutscenes[key] = Object.assign({}, src[key], { steps });
  }
}

// ── History (undo/redo) ─────────────────────────────────────────────────
// Shared with levelEditor.html/anim_editor.html/etc — see game/undoHistory.js.
// This editor's state spans three variables (workingCutscenes/selectedKey/
// selection), not just one, so the snapshot is a plain object bundling all
// three; setState restores each and re-renders.
function snapshot() { return { data: workingCutscenes, selectedKey, selection }; }
const historyMgr = (typeof UndoHistory !== 'undefined') ? UndoHistory.create(
  snapshot,
  (snap) => {
    workingCutscenes = snap.data;
    selectedKey = snap.selectedKey;
    selection = snap.selection;
    renderAll();
  }
) : null;
function pushHistory() { if (historyMgr) historyMgr.push(); updateUndoRedoButtons(); }
function resetHistory() { if (historyMgr) historyMgr.reset(); updateUndoRedoButtons(); }
function undo() { if (historyMgr) historyMgr.undo(); updateUndoRedoButtons(); }
function redo() { if (historyMgr) historyMgr.redo(); updateUndoRedoButtons(); }
function updateUndoRedoButtons() {
  document.getElementById('undo-btn').disabled = !historyMgr || !historyMgr.canUndo();
  document.getElementById('redo-btn').disabled = !historyMgr || !historyMgr.canRedo();
}

document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;
  if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
});

// ── Step tree helpers ───────────────────────────────────────────────────
// A "path" addresses a nested branch list: [] = the cutscene's own steps[];
// [{index:3, branch:'onA'}] = the onA[] of the choice step at steps[3]; can
// nest arbitrarily deep for a choice-inside-a-choice.
function resolveList(rootSteps, path) {
  let list = rootSteps;
  for (const seg of path) list = list[seg.index][seg.branch];
  return list;
}

function newStep(type) {
  switch (type) {
    case 'wait': return { type: 'wait', frames: 60 };
    case 'text': return { type: 'text', text: '', frames: 150 };
    case 'cameraPan': return { type: 'cameraPan', x: 0, y: 0, speed: 4 };
    case 'cameraReturn': return { type: 'cameraReturn', speed: 5 };
    case 'movePlayer': return { type: 'movePlayer', x: 0, speed: 2 };
    case 'setFlag': return { type: 'setFlag', flag: '', value: true };
    case 'call': return { type: 'call', _callPreset: 'custom', _callArgs: {}, _callCode: '() => {}' };
    case 'choice': return {
      type: 'choice', actionA: 'moveLeft', actionB: 'moveRight',
      promptA: 'Option A', promptB: 'Option B', taps: 8, window: 100, onTimeout: 'A',
      onA: [], onB: [],
    };
  }
}

const STEP_TYPES = ['wait', 'text', 'cameraPan', 'cameraReturn', 'movePlayer', 'setFlag', 'call', 'choice'];

function stepSummary(step) {
  switch (step.type) {
    case 'wait': return `${step.frames || 0} frames`;
    case 'text': return `"${(step.text || '').slice(0, 60)}"`;
    case 'cameraPan': return `→ (${step.x}, ${step.y}) @ ${step.speed}`;
    case 'cameraReturn': return `speed ${step.speed}`;
    case 'movePlayer': return `→ x:${step.x} @ ${step.speed}`;
    case 'setFlag': return `${step.flag || '(unset)'} = ${JSON.stringify(step.value)}`;
    case 'call': return step._callPreset && CALL_PRESETS[step._callPreset] ? CALL_PRESETS[step._callPreset].label : '(raw code)';
    case 'choice': return `${step.promptA || step.actionA} vs ${step.promptB || step.actionB} (${step.taps} taps / ${step.window}f)`;
    default: return '';
  }
}

// ── Cutscene list (left panel) ──────────────────────────────────────────
function renderCutsceneList() {
  const el = document.getElementById('cutscene-list');
  el.innerHTML = '';
  const keys = Object.keys(workingCutscenes).sort();
  if (!keys.length) { el.innerHTML = '<div class="hint">No cutscenes yet — create one.</div>'; }
  for (const key of keys) {
    const row = document.createElement('div');
    row.className = 'cs-row' + (key === selectedKey ? ' sel' : '');
    const count = (workingCutscenes[key].steps || []).length;
    row.innerHTML = `<span class="cs-name">${key}</span><span class="cs-count">${count} step${count === 1 ? '' : 's'}</span>`;
    row.addEventListener('click', () => { selectedKey = key; selection = null; renderAll(); });
    el.appendChild(row);
  }
}

document.getElementById('add-cutscene-btn').addEventListener('click', () => {
  const name = prompt('New cutscene key (e.g. crag_intro):');
  if (!name) return;
  const key = name.trim();
  if (!key) return;
  if (workingCutscenes[key]) { alert('A cutscene with that key already exists.'); return; }
  workingCutscenes[key] = { steps: [] };
  selectedKey = key;
  selection = null;
  pushHistory();
  renderAll();
});

document.getElementById('rename-cs-btn').addEventListener('click', () => {
  if (!selectedKey) return;
  const name = prompt('Rename cutscene key:', selectedKey);
  if (!name) return;
  const key = name.trim();
  if (!key || key === selectedKey) return;
  if (workingCutscenes[key]) { alert('A cutscene with that key already exists.'); return; }
  workingCutscenes[key] = workingCutscenes[selectedKey];
  delete workingCutscenes[selectedKey];
  selectedKey = key;
  pushHistory();
  renderAll();
});

document.getElementById('delete-cs-btn').addEventListener('click', () => {
  if (!selectedKey) return;
  if (!confirm(`Delete "${selectedKey}" from the editor's working set?\n\nThis only affects THIS editor session and its Live override — it can't remove a built-in CUTSCENES entry from cutscene.js itself.`)) return;
  delete workingCutscenes[selectedKey];
  selectedKey = null;
  selection = null;
  pushHistory();
  renderAll();
});

// ── Step list (center panel) ────────────────────────────────────────────
function currentSteps() {
  return selectedKey ? workingCutscenes[selectedKey].steps : null;
}

function addStepAt(path, index, type) {
  const list = resolveList(currentSteps(), path);
  list.splice(index, 0, newStep(type));
  selection = { path, index };
  pushHistory();
  renderAll();
}

function deleteStep(path, index) {
  const list = resolveList(currentSteps(), path);
  list.splice(index, 1);
  if (selection && samePath(selection.path, path)) {
    if (selection.index === index) selection = null;
    else if (selection.index > index) selection.index -= 1;
  }
  pushHistory();
  renderAll();
}

function moveStep(path, index, dir) {
  const list = resolveList(currentSteps(), path);
  const j = index + dir;
  if (j < 0 || j >= list.length) return;
  const [s] = list.splice(index, 1);
  list.splice(j, 0, s);
  if (selection && samePath(selection.path, path)) {
    if (selection.index === index) selection.index = j;
    else if (dir > 0 && selection.index > index && selection.index <= j) selection.index -= 1;
    else if (dir < 0 && selection.index < index && selection.index >= j) selection.index += 1;
  }
  pushHistory();
  renderAll();
}

function samePath(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i].index !== b[i].index || a[i].branch !== b[i].branch) return false;
  return true;
}

function renderStepList(container, list, path) {
  list.forEach((step, i) => {
    const row = document.createElement('div');
    const isSel = !!(selection && selection.index === i && samePath(selection.path, path));
    row.className = 'step-row' + (isSel ? ' sel' : '');
    row.innerHTML = `
      <span class="step-idx">${i + 1}</span>
      <span class="ds-badge badge-${step.type}"><span class="ds-dot"></span>${step.type}</span>
      <span class="step-summary">${stepSummary(step).replace(/</g, '&lt;')}</span>
      <span class="step-btns">
        <button data-act="up" class="ds-btn ds-btn-ghost" title="Move up">▲</button>
        <button data-act="down" class="ds-btn ds-btn-ghost" title="Move down">▼</button>
        <button data-act="del" class="ds-btn ds-btn-danger" title="Delete">✕</button>
      </span>`;
    row.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      selection = { path, index: i };
      renderAll();
    });
    row.querySelector('[data-act="up"]').addEventListener('click', () => moveStep(path, i, -1));
    row.querySelector('[data-act="down"]').addEventListener('click', () => moveStep(path, i, 1));
    row.querySelector('[data-act="del"]').addEventListener('click', () => deleteStep(path, i));
    container.appendChild(row);

    if (step.type === 'choice') {
      const blockA = document.createElement('div');
      blockA.className = 'branch-block';
      blockA.innerHTML = `<div class="branch-label">If A (${step.promptA || step.actionA}):</div>`;
      const listElA = document.createElement('div');
      blockA.appendChild(listElA);
      renderStepList(listElA, step.onA, path.concat([{ index: i, branch: 'onA' }]));
      const addA = document.createElement('button');
      addA.className = 'ds-btn ds-btn-ghost ds-btn-block add-step-inline';
      addA.textContent = '+ Add Step to Branch A';
      addA.addEventListener('click', () => openTypePicker((t) => addStepAt(path.concat([{ index: i, branch: 'onA' }]), step.onA.length, t)));
      blockA.appendChild(addA);
      container.appendChild(blockA);

      const blockB = document.createElement('div');
      blockB.className = 'branch-block';
      blockB.innerHTML = `<div class="branch-label">If B (${step.promptB || step.actionB}):</div>`;
      const listElB = document.createElement('div');
      blockB.appendChild(listElB);
      renderStepList(listElB, step.onB, path.concat([{ index: i, branch: 'onB' }]));
      const addB = document.createElement('button');
      addB.className = 'ds-btn ds-btn-ghost ds-btn-block add-step-inline';
      addB.textContent = '+ Add Step to Branch B';
      addB.addEventListener('click', () => openTypePicker((t) => addStepAt(path.concat([{ index: i, branch: 'onB' }]), step.onB.length, t)));
      blockB.appendChild(addB);
      container.appendChild(blockB);
    }
  });
}

function renderStepsPanel() {
  const wrap = document.getElementById('step-list-wrap');
  wrap.innerHTML = '';
  const addBtn = document.getElementById('add-step-btn');
  const renameBtn = document.getElementById('rename-cs-btn');
  const delBtn = document.getElementById('delete-cs-btn');
  addBtn.disabled = renameBtn.disabled = delBtn.disabled = !selectedKey;
  document.getElementById('cs-title').textContent = selectedKey || '—';
  if (!selectedKey) {
    wrap.innerHTML = '<div class="hint">Select or create a cutscene on the left to author its step list.</div>';
    return;
  }
  const steps = currentSteps();
  if (!steps.length) wrap.innerHTML = '<div class="hint">No steps yet — click "+ Add Step" above.</div>';
  renderStepList(wrap, steps, []);
}

document.getElementById('add-step-btn').addEventListener('click', () => {
  if (!selectedKey) return;
  const path = selection ? selection.path : [];
  const list = resolveList(currentSteps(), path);
  const index = selection ? selection.index + 1 : list.length;
  openTypePicker((t) => addStepAt(path, index, t));
});

// ── Type picker (tiny inline modal via prompt-style select) ─────────────
function openTypePicker(cb) {
  const choice = prompt(`Step type — one of:\n${STEP_TYPES.join(', ')}`, 'text');
  if (!choice) return;
  const t = choice.trim();
  if (!STEP_TYPES.includes(t)) { alert(`Unknown step type "${t}".`); return; }
  cb(t);
}

// ── Properties panel (right) ────────────────────────────────────────────
function field(label, inputHtml) {
  // Auto-apply the design system's input classes so every dynamically-built
  // field picks up ds-input/ds-select/ds-textarea's focus glow/border
  // treatment without every call site having to remember to add it.
  const styled = inputHtml
    .replace(/<input /g, '<input class="ds-input" ')
    .replace(/<select /g, '<select class="ds-select" ')
    .replace(/<textarea(\s|>)/g, '<textarea class="ds-textarea"$1');
  return `<div class="field"><label>${label}</label>${styled}</div>`;
}

function renderProps() {
  const el = document.getElementById('props');
  if (!selectedKey || !selection) {
    el.innerHTML = '<div class="hint">Select a step to edit its fields.</div>';
    return;
  }
  const list = resolveList(currentSteps(), selection.path);
  const step = list[selection.index];
  if (!step) { el.innerHTML = '<div class="hint">Select a step to edit its fields.</div>'; return; }

  let html = '';
  switch (step.type) {
    case 'wait':
      html += field('Frames', `<input type="number" id="f-frames" value="${step.frames}">`);
      break;
    case 'text':
      html += field('Text', `<textarea id="f-text">${(step.text || '').replace(/</g, '&lt;')}</textarea>`);
      html += field('Frames (auto-suggested from length, editable)', `<input type="number" id="f-frames" value="${step.frames}">`);
      html += `<button id="f-suggest-frames" class="ds-btn ds-btn-ghost ds-btn-block" style="margin-bottom:10px">Suggest frames from text length</button>`;
      break;
    case 'cameraPan':
      html += pickCanvasHtml();
      html += `<div class="field-row">${field('X', `<input type="number" id="f-x" value="${step.x}">`)}${field('Y', `<input type="number" id="f-y" value="${step.y}">`)}</div>`;
      html += field('Speed', `<input type="number" id="f-speed" value="${step.speed}">`);
      break;
    case 'cameraReturn':
      html += field('Speed', `<input type="number" id="f-speed" value="${step.speed}">`);
      break;
    case 'movePlayer':
      html += pickCanvasHtml();
      html += field('Target X', `<input type="number" id="f-x" value="${step.x}">`);
      html += field('Speed', `<input type="number" id="f-speed" value="${step.speed}">`);
      break;
    case 'setFlag': {
      const dl = KNOWN_STORY_FLAGS.map((f) => `<option value="${f}">`).join('');
      html += field('Flag', `<input type="text" id="f-flag" list="flag-list" value="${(step.flag || '').replace(/"/g, '&quot;')}"><datalist id="flag-list">${dl}</datalist>`);
      const valType = typeof step.value;
      html += field('Value type', `<select id="f-valtype"><option value="boolean"${valType === 'boolean' ? ' selected' : ''}>boolean</option><option value="string"${valType === 'string' ? ' selected' : ''}>string</option><option value="number"${valType === 'number' ? ' selected' : ''}>number</option></select>`);
      if (valType === 'boolean') {
        html += field('Value', `<select id="f-val"><option value="true"${step.value === true ? ' selected' : ''}>true</option><option value="false"${step.value === false ? ' selected' : ''}>false</option></select>`);
      } else {
        html += field('Value', `<input type="text" id="f-val" value="${String(step.value).replace(/"/g, '&quot;')}">`);
      }
      break;
    }
    case 'choice': {
      const optsA = ACTION_NAMES.map((a) => `<option value="${a}"${a === step.actionA ? ' selected' : ''}>${a}</option>`).join('');
      const optsB = ACTION_NAMES.map((a) => `<option value="${a}"${a === step.actionB ? ' selected' : ''}>${a}</option>`).join('');
      html += field('Action A', `<select id="f-actionA">${optsA}</select>`);
      html += field('Prompt A', `<input type="text" id="f-promptA" value="${(step.promptA || '').replace(/"/g, '&quot;')}">`);
      html += field('Action B', `<select id="f-actionB">${optsB}</select>`);
      html += field('Prompt B', `<input type="text" id="f-promptB" value="${(step.promptB || '').replace(/"/g, '&quot;')}">`);
      html += `<div class="field-row">${field('Taps to win', `<input type="number" id="f-taps" value="${step.taps}">`)}${field('Window (frames)', `<input type="number" id="f-window" value="${step.window}">`)}</div>`;
      html += field('On timeout', `<select id="f-timeout"><option value="A"${step.onTimeout === 'A' ? ' selected' : ''}>A</option><option value="B"${step.onTimeout === 'B' ? ' selected' : ''}>B</option></select>`);
      html += `<button id="jump-a" class="ds-btn ds-btn-ghost ds-btn-block" style="margin-bottom:6px">Edit Branch A → (${step.onA.length} steps)</button>`;
      html += `<button id="jump-b" class="ds-btn ds-btn-ghost ds-btn-block">Edit Branch B → (${step.onB.length} steps)</button>`;
      break;
    }
    case 'call': {
      const preset = step._callPreset && CALL_PRESETS[step._callPreset] ? step._callPreset : 'custom';
      const opts = Object.keys(CALL_PRESETS).map((k) => `<option value="${k}"${k === preset ? ' selected' : ''}>${CALL_PRESETS[k].label}</option>`).join('');
      html += field('Preset', `<select id="f-preset">${opts}</select>`);
      const def = CALL_PRESETS[preset];
      const args = step._callArgs || {};
      for (const f of def.fields) {
        const val = args[f.key] !== undefined ? args[f.key] : f.default;
        if (f.type === 'select') {
          const options = f.options().map((o) => `<option value="${o}"${o === val ? ' selected' : ''}>${o}</option>`).join('');
          html += field(f.label, `<select data-arg="${f.key}">${options}</select>`);
        } else if (f.type === 'bool') {
          html += field(f.label, `<select data-arg="${f.key}"><option value="true"${val ? ' selected' : ''}>true</option><option value="false"${!val ? ' selected' : ''}>false</option></select>`);
        } else if (f.type === 'number') {
          html += field(f.label, `<input type="number" data-arg="${f.key}" value="${val || 0}">`);
        } else {
          html += field(f.label, `<input type="text" data-arg="${f.key}" placeholder="${f.placeholder || ''}" value="${val || ''}">`);
        }
      }
      if (preset === 'custom') {
        html += `<div class="warn-label">⚠ raw code — no guardrails</div>`;
        html += field('Function source', `<textarea id="f-rawcode" style="min-height:100px">${(step._callCode || '() => {}').replace(/</g, '&lt;')}</textarea>`);
      } else {
        html += `<div class="hint" style="padding:0 0 8px">Generated code: <code style="color:var(--info)">${(def.build(args) || '').replace(/</g, '&lt;')}</code></div>`;
      }
      break;
    }
  }
  el.innerHTML = html;
  wireProps(step);
}

function wireProps(step) {
  const g = (id) => document.getElementById(id);
  const commit = () => {
    pushHistory(); renderStepsPanel(); renderProps(); renderCutsceneList();
    if (step.type === 'cameraPan' || step.type === 'movePlayer') drawPickCanvas(step);
  };

  if (g('f-frames')) g('f-frames').addEventListener('change', (e) => { step.frames = Number(e.target.value) || 0; commit(); });
  if (g('f-text')) g('f-text').addEventListener('change', (e) => { step.text = e.target.value; commit(); });
  if (g('f-suggest-frames')) g('f-suggest-frames').addEventListener('click', () => {
    const len = (g('f-text') ? g('f-text').value : step.text || '').length;
    step.frames = Math.max(90, Math.min(400, len * 4));
    commit();
  });
  if (g('f-x')) g('f-x').addEventListener('change', (e) => { step.x = Number(e.target.value) || 0; commit(); });
  if (g('f-y')) g('f-y').addEventListener('change', (e) => { step.y = Number(e.target.value) || 0; commit(); });
  if (g('f-speed')) g('f-speed').addEventListener('change', (e) => { step.speed = Number(e.target.value) || 0; commit(); });

  if (g('f-flag')) g('f-flag').addEventListener('change', (e) => { step.flag = e.target.value; commit(); });
  if (g('f-valtype')) g('f-valtype').addEventListener('change', (e) => {
    const t = e.target.value;
    step.value = t === 'boolean' ? true : t === 'number' ? 0 : '';
    commit();
  });
  if (g('f-val')) g('f-val').addEventListener('change', (e) => {
    const cur = document.getElementById('f-valtype') ? document.getElementById('f-valtype').value : typeof step.value;
    if (cur === 'boolean') step.value = e.target.value === 'true';
    else if (cur === 'number') step.value = Number(e.target.value) || 0;
    else step.value = e.target.value;
    commit();
  });

  if (g('f-actionA')) g('f-actionA').addEventListener('change', (e) => { step.actionA = e.target.value; commit(); });
  if (g('f-actionB')) g('f-actionB').addEventListener('change', (e) => { step.actionB = e.target.value; commit(); });
  if (g('f-promptA')) g('f-promptA').addEventListener('change', (e) => { step.promptA = e.target.value; commit(); });
  if (g('f-promptB')) g('f-promptB').addEventListener('change', (e) => { step.promptB = e.target.value; commit(); });
  if (g('f-taps')) g('f-taps').addEventListener('change', (e) => { step.taps = Number(e.target.value) || 1; commit(); });
  if (g('f-window')) g('f-window').addEventListener('change', (e) => { step.window = Number(e.target.value) || 1; commit(); });
  if (g('f-timeout')) g('f-timeout').addEventListener('change', (e) => { step.onTimeout = e.target.value; commit(); });
  if (g('jump-a')) g('jump-a').addEventListener('click', () => {
    selection = { path: selection.path.concat([{ index: selection.index, branch: 'onA' }]), index: 0 };
    if (!step.onA.length) selection = null;
    renderAll();
  });
  if (g('jump-b')) g('jump-b').addEventListener('click', () => {
    selection = { path: selection.path.concat([{ index: selection.index, branch: 'onB' }]), index: 0 };
    if (!step.onB.length) selection = null;
    renderAll();
  });

  if (g('f-preset')) g('f-preset').addEventListener('change', (e) => {
    step._callPreset = e.target.value;
    const def = CALL_PRESETS[step._callPreset];
    // Populate real defaults now — a <select>'s visual first-option default
    // doesn't fire a change event, so without this the generated-code
    // preview would silently disagree with what the dropdown shows.
    const args = {};
    for (const f of def.fields) {
      if (f.type === 'select') args[f.key] = f.options()[0];
      else if (f.type === 'bool') args[f.key] = f.default !== undefined ? f.default : true;
      else if (f.type === 'number') args[f.key] = f.default !== undefined ? f.default : 0;
      else args[f.key] = f.default !== undefined ? f.default : '';
    }
    step._callArgs = args;
    if (step._callPreset !== 'custom') step._callCode = def.build(step._callArgs);
    commit();
  });
  document.querySelectorAll('[data-arg]').forEach((elArg) => {
    elArg.addEventListener('change', (e) => {
      step._callArgs = step._callArgs || {};
      const key = e.target.getAttribute('data-arg');
      const def = CALL_PRESETS[step._callPreset];
      const fieldDef = def.fields.find((f) => f.key === key);
      step._callArgs[key] = fieldDef && fieldDef.type === 'bool' ? e.target.value === 'true'
        : fieldDef && fieldDef.type === 'number' ? Number(e.target.value) || 0
        : e.target.value;
      step._callCode = def.build(step._callArgs);
      commit();
    });
  });
  if (g('f-rawcode')) g('f-rawcode').addEventListener('change', (e) => { step._callCode = e.target.value; commit(); });
}

// ── Pick-on-canvas — a schematic room map (not the real game) for
// cameraPan/movePlayer coordinates, so these aren't typed in blind (plan
// §2's "pick on canvas" note, adapted for the cheap-preview v1 without an
// iframe: a real room's platform extents drawn to scale). ─────────────────
let pickRoomId = null;
function roomOptionsHtml() {
  if (typeof AREAS === 'undefined') return '';
  const ids = Object.keys(AREAS).filter((id) => typeof AREAS[id].col === 'number').sort();
  if (!pickRoomId || !AREAS[pickRoomId]) pickRoomId = ids[0];
  return ids.map((id) => `<option value="${id}"${id === pickRoomId ? ' selected' : ''}>${id}</option>`).join('');
}
function pickCanvasHtml() {
  return `<div id="pick-canvas-wrap">
    <div class="field"><label>Reference room (for the picker below)</label><select id="pick-room" class="ds-select">${roomOptionsHtml()}</select></div>
    <canvas id="pick-canvas" width="280" height="140"></canvas>
    <div id="pick-hint">Click inside the room outline to set X/Y from a world position. Reference only — cutscenes aren't tied to a room by data, this just helps eyeball coordinates.</div>
  </div>`;
}
function roomExtents(room) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of (room.platforms || [])) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.w); maxY = Math.max(maxY, p.y + p.h);
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 450; }
  return { minX, minY, maxX, maxY };
}
function drawPickCanvas(step) {
  const canvas = document.getElementById('pick-canvas');
  if (!canvas || typeof AREAS === 'undefined') return;
  const room = AREAS[pickRoomId];
  if (!room) return;
  const ctx = canvas.getContext('2d');
  const { minX, minY, maxX, maxY } = roomExtents(room);
  const pad = 10;
  const sx = (canvas.width - pad * 2) / Math.max(1, maxX - minX);
  const sy = (canvas.height - pad * 2) / Math.max(1, maxY - minY);
  const s = Math.min(sx, sy);
  const toScreen = (wx, wy) => [pad + (wx - minX) * s, pad + (wy - minY) * s];

  ctx.fillStyle = '#050506';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (const p of (room.platforms || [])) {
    const [x1, y1] = toScreen(p.x, p.y);
    ctx.fillRect(x1, y1, p.w * s, p.h * s);
    ctx.strokeRect(x1, y1, p.w * s, p.h * s);
  }
  if (typeof step.x === 'number' && typeof step.y === 'number') {
    const [px, py] = toScreen(step.x, step.y);
    ctx.fillStyle = '#f9a8d4';
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
  } else if (typeof step.x === 'number') {
    const [px] = toScreen(step.x, minY);
    ctx.strokeStyle = '#f9a8d4';
    ctx.beginPath(); ctx.moveTo(px, pad); ctx.lineTo(px, canvas.height - pad); ctx.stroke();
  }
  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    const wx = Math.round(minX + (cx - pad) / s);
    const wy = Math.round(minY + (cy - pad) / s);
    step.x = wx;
    if (typeof step.y === 'number') step.y = wy;
    if (document.getElementById('f-x')) document.getElementById('f-x').value = step.x;
    if (document.getElementById('f-y')) document.getElementById('f-y').value = step.y;
    pushHistory();
    renderStepsPanel();
    drawPickCanvas(step);
  };
  const roomSel = document.getElementById('pick-room');
  if (roomSel) roomSel.onchange = (e) => { pickRoomId = e.target.value; drawPickCanvas(step); };
}

// ── Preview — a cheap mocked-up walkthrough (plan §7's staged recommendation:
// read the step list back as a simulated sequence, not a real game boot). ──
let previewFlat = null, previewIndex = 0;
function flattenForPreview(steps) {
  // Flattens wait/text/cameraPan/cameraReturn/movePlayer/setFlag/call into a
  // linear list for Prev/Next; a 'choice' step pauses the walk and lets the
  // user pick which branch to explore (mirrors the real runner's splice).
  return steps; // choice handled specially at render time, not flattened
}
function openPreview() {
  if (!selectedKey) return;
  previewFlat = currentSteps();
  previewIndex = 0;
  document.getElementById('preview-overlay').classList.add('open');
  renderPreviewStep();
}
function closePreview() { document.getElementById('preview-overlay').classList.remove('open'); }
function renderPreviewStep() {
  const step = previewFlat[previewIndex];
  const textEl = document.getElementById('preview-text');
  const choiceEl = document.getElementById('preview-choice');
  const badge = document.getElementById('preview-step-badge');
  document.getElementById('preview-pos').textContent = previewFlat.length ? `${previewIndex + 1} / ${previewFlat.length}` : '0 / 0';
  choiceEl.style.display = 'none';
  textEl.textContent = '';
  if (!step) { badge.textContent = 'END OF CUTSCENE'; textEl.textContent = '— cutscene ends —'; return; }
  badge.textContent = step.type;
  switch (step.type) {
    case 'text': textEl.textContent = step.text; break;
    case 'wait': textEl.textContent = `(hold ${step.frames} frames)`; break;
    case 'cameraPan': textEl.textContent = `[camera pans to (${step.x}, ${step.y})]`; break;
    case 'cameraReturn': textEl.textContent = `[camera returns to follow]`; break;
    case 'movePlayer': textEl.textContent = `[player walks to x:${step.x}]`; break;
    case 'setFlag': textEl.textContent = `[storyFlags.${step.flag} = ${JSON.stringify(step.value)}]`; break;
    case 'call': textEl.textContent = `[runs: ${step._callCode}]`; break;
    case 'choice': {
      choiceEl.style.display = 'flex';
      document.getElementById('preview-choice-a').textContent = step.promptA || 'A';
      document.getElementById('preview-choice-b').textContent = step.promptB || 'B';
      textEl.textContent = `Mash ${step.actionA} vs ${step.actionB} — first to ${step.taps} within ${step.window}f wins (timeout → ${step.onTimeout})`;
      break;
    }
  }
}
// Mouse-tracking spotlight on the preview modal only — a single top-level
// surface, not a per-row treatment (design-system.css's own guidance: never
// wire this to every row of a list).
document.getElementById('preview-card').addEventListener('mousemove', (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
});

document.getElementById('preview-btn').addEventListener('click', openPreview);
document.getElementById('preview-close').addEventListener('click', closePreview);
document.getElementById('preview-next').addEventListener('click', () => { if (previewIndex < previewFlat.length) previewIndex++; renderPreviewStep(); });
document.getElementById('preview-prev').addEventListener('click', () => { if (previewIndex > 0) previewIndex--; renderPreviewStep(); });
document.getElementById('preview-choice-a').addEventListener('click', () => {
  const step = previewFlat[previewIndex];
  previewFlat = previewFlat.slice(0, previewIndex).concat(step.onA, previewFlat.slice(previewIndex + 1));
  renderPreviewStep();
});
document.getElementById('preview-choice-b').addEventListener('click', () => {
  const step = previewFlat[previewIndex];
  previewFlat = previewFlat.slice(0, previewIndex).concat(step.onB, previewFlat.slice(previewIndex + 1));
  renderPreviewStep();
});

// ── Live preview — boots the real game in a sandboxed iframe and runs the
// working (possibly unsaved) step list through the actual playCutscene()
// engine, so camera pans/call-step side effects/timing are the REAL thing,
// not the mocked walkthrough above. Complements it rather than replacing
// it — the mocked one is instant and needs no boot, this one is for
// verifying the runtime behavior actually works. Same fetch+srcdoc+rewrite
// technique as room_scene_editor.js's loadSandboxFor()/refreshPreview().
let liveWin = null;
let livePreviewGeneration = 0;

async function loadLiveSandbox() {
  const iframe = document.getElementById('live-sandbox');
  const html = await fetch('../index.html').then((r) => r.text());
  const rebased = html.replace(/src="game\//g, 'src="../game/');
  // enemy_test_arena is the same flat, isolated dev room ability_tester.html/
  // companion_test.html boot into — a neutral stage so the cutscene's own
  // cameraPan/movePlayer steps are the only camera motion visible.
  const patch = `<script>window.__editorSpawnRoom = 'enemy_test_arena';<\/script>`;
  const patched = rebased.replace('<script src="../game/audio.js">', patch + '<script src="../game/audio.js">');
  return new Promise((resolve, reject) => {
    iframe.onload = () => resolve(iframe);
    iframe.onerror = reject;
    iframe.srcdoc = patched;
  });
}

async function openLivePreview() {
  if (!selectedKey) return;
  const gen = ++livePreviewGeneration;
  const statusEl = document.getElementById('live-preview-status');
  document.getElementById('live-preview-overlay').classList.add('open');
  liveWin = null;
  statusEl.textContent = 'booting…';
  try {
    const iframe = await loadLiveSandbox();
    await new Promise((r) => setTimeout(r, 350)); // let applyDevSpawnOverride()/init() settle, same delay room_scene_editor.js uses
    if (gen !== livePreviewGeneration) return; // closed/reopened before boot finished
    liveWin = iframe.contentWindow;
    // Preview safety, same reasoning as room_scene_editor.js's
    // applyPreviewSafety(): this is for testing cutscene CONTENT, not
    // combat — a `call` step that spawns something shouldn't be able to
    // end the session mid-story-test.
    if (liveWin.player) liveWin.player.invincibleTimer = 999999;
    // Push the working (possibly unsaved) cutscene data into the sandbox so
    // Play tests exactly what's on screen right now, not the last save.
    if (liveWin.CUTSCENES) Object.assign(liveWin.CUTSCENES, clone(workingCutscenes));
    if (typeof liveWin.playCutscene === 'function') {
      liveWin.playCutscene(selectedKey);
      statusEl.textContent = 'playing "' + selectedKey + '"';
    } else {
      statusEl.textContent = 'error: playCutscene() not found in sandbox';
    }
  } catch (e) {
    if (gen !== livePreviewGeneration) return;
    statusEl.textContent = 'failed to load: ' + e.message;
  }
}
function closeLivePreview() {
  livePreviewGeneration++; // invalidate any in-flight boot so a stale one can't resolve into a closed overlay
  document.getElementById('live-preview-overlay').classList.remove('open');
  liveWin = null;
}
document.getElementById('live-preview-btn').addEventListener('click', openLivePreview);
document.getElementById('live-preview-close').addEventListener('click', closeLivePreview);

// ── Export / Save ────────────────────────────────────────────────────────
function stepsToJs(steps, indent) {
  const pad = '  '.repeat(indent);
  const lines = steps.map((step) => {
    switch (step.type) {
      case 'wait': return `${pad}{ type: 'wait', frames: ${step.frames} },`;
      case 'text': return `${pad}{ type: 'text', text: ${JSON.stringify(step.text)}, frames: ${step.frames} },`;
      case 'cameraPan': return `${pad}{ type: 'cameraPan', x: ${step.x}, y: ${step.y}, speed: ${step.speed} },`;
      case 'cameraReturn': return `${pad}{ type: 'cameraReturn', speed: ${step.speed} },`;
      case 'movePlayer': return `${pad}{ type: 'movePlayer', x: ${step.x}, speed: ${step.speed} },`;
      case 'setFlag': return `${pad}{ type: 'setFlag', flag: ${JSON.stringify(step.flag)}, value: ${JSON.stringify(step.value)} },`;
      case 'call': return `${pad}{ type: 'call', fn: ${step._callCode} },`;
      case 'choice':
        return `${pad}{\n${pad}  type: 'choice',\n${pad}  actionA: ${JSON.stringify(step.actionA)}, actionB: ${JSON.stringify(step.actionB)},\n${pad}  promptA: ${JSON.stringify(step.promptA)}, promptB: ${JSON.stringify(step.promptB)},\n${pad}  taps: ${step.taps}, window: ${step.window}, onTimeout: ${JSON.stringify(step.onTimeout)},\n${pad}  onA: [\n${stepsToJs(step.onA, indent + 2)}\n${pad}  ],\n${pad}  onB: [\n${stepsToJs(step.onB, indent + 2)}\n${pad}  ],\n${pad}},`;
      default: return '';
    }
  });
  return lines.join('\n');
}

document.getElementById('exp-btn').addEventListener('click', () => {
  if (!selectedKey) { alert('Select a cutscene first.'); return; }
  const steps = currentSteps();
  const js = `CUTSCENES.${/^[A-Za-z_$][\w$]*$/.test(selectedKey) ? selectedKey : `[${JSON.stringify(selectedKey)}]`} = {\n  steps: [\n${stepsToJs(steps, 2)}\n  ],\n};`;
  document.getElementById('exp-out').value = js;
});

document.getElementById('save-live-btn').addEventListener('click', () => {
  try {
    const overrides = clone(workingCutscenes); // JSON-safe: _callCode strings only, no live fn
    localStorage.setItem(CUTSCENE_OVERRIDES_KEY, JSON.stringify(overrides));
    if (unsavedGuard) unsavedGuard.checkpoint();
    document.getElementById('live-status').innerHTML = `<span class="ok">✓ Saved ${Object.keys(overrides).length} cutscene(s) to the Live override. index.html and other tools will pick these up on next load.</span>`;
  } catch (e) {
    document.getElementById('live-status').innerHTML = `<span class="bad">✗ Failed to save: ${e.message}</span>`;
  }
});

// ─── WRITE TO cutscene.js (Electron only) — patches only
// CUTSCENES[selectedKey] via the AST-based patcher, so every other
// cutscene's data and hand-written comments are left untouched. Reuses
// stepsToJs() (same serializer "Export Paste-Ready JS" uses) rather than
// JSON.stringify, since `call` steps carry a raw `_callCode` function
// expression that must land as real executable JS, not a quoted string.
document.getElementById('write-file-btn').addEventListener('click', async () => {
  const statusEl = document.getElementById('live-status');
  if (!selectedKey) { statusEl.innerHTML = '<span class="bad">✗ Select a cutscene first.</span>'; return; }
  if (!window.stillpointAPI) {
    statusEl.innerHTML = '<span class="bad">✗ Only available in the unified editor desktop app (npm start) — not in a plain browser tab.</span>';
    return;
  }
  const steps = currentSteps();
  const badPath = findNonFiniteNumber(steps);
  if (badPath) {
    statusEl.innerHTML = `<span class="bad">✗ Refusing to write: "${badPath}" is not a valid number. Fix the input field(s) and try again.</span>`;
    return;
  }
  if (!confirm(`Write cutscene "${selectedKey}" to game/cutscene.js on disk? (a .bak is made first)`)) return;

  try {
    const valueSource = `{\n  steps: [\n${stepsToJs(steps, 2)}\n  ],\n}`;
    const data = await window.stillpointAPI.patchPath('cutscenes', selectedKey, valueSource, true);
    statusEl.innerHTML = `<span class="ok">✓ Saved! Written to game/cutscene.js. Backup: ${data.backup}</span>`;
    if (typeof DevContext !== 'undefined') DevContext.log('Cutscene Editor', 'Wrote cutscene to disk', selectedKey);
    if (unsavedGuard) unsavedGuard.checkpoint();
  } catch (e) {
    statusEl.innerHTML = `<span class="bad">✗ Could not write to disk: ${e.message}</span>`;
  }
});

// ── Boot ─────────────────────────────────────────────────────────────────
function renderAll() {
  renderCutsceneList();
  renderStepsPanel();
  renderProps();
  const stepEl = selection ? resolveList(currentSteps(), selection.path)[selection.index] : null;
  if (stepEl && (stepEl.type === 'cameraPan' || stepEl.type === 'movePlayer')) drawPickCanvas(stepEl);
}

seedWorkingData();
const deepLinkCutscene = new URLSearchParams(location.search).get('cutscene');
if (deepLinkCutscene && workingCutscenes[deepLinkCutscene]) {
  selectedKey = deepLinkCutscene;
} else if (typeof DevContext !== 'undefined') {
  const ctx = DevContext.get();
  if (ctx.currentCutsceneId && workingCutscenes[ctx.currentCutsceneId]) selectedKey = ctx.currentCutsceneId;
}
resetHistory();
renderAll();
if (typeof UnsavedGuard !== 'undefined') unsavedGuard = UnsavedGuard.watch(() => workingCutscenes);

document.getElementById('back').addEventListener('click', () => {
  if (typeof DevContext !== 'undefined' && selectedKey) DevContext.set({ currentCutsceneId: selectedKey });
});
