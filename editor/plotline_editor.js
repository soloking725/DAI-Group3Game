// Plotline Editor — Plans/plotline_editor_plan.md.
// One tool, four tabs sharing the same flag/condition primitives:
//   • Flag Graph  — derived (not hand-authored) force-directed view of every
//                   story flag, colour-coded by what writes it, with cycle /
//                   dead-flag / unwritten-flag audits (game/plotlineVerify.js).
//   • Visions     — VISIONS{} authoring (wait/cameraPan/imageReveal/setFlag/call).
//   • Quests      — QUESTS{} stage authoring (requires gate + onEnter effect).
//   • Dialogue    — NPC_DIALOGUE{} entries (requires + lines + onComplete),
//                   with the talk-count preview slider from the plan's §4.
//
// Persistence follows the DOMINANT editor pattern (levelEditor/cutscene/combo):
// localStorage override for in-tool continuity + paste-ready JS export for the
// repo commit — NOT a live save-server route (the plan's own review flags that
// save-server.js has no create-a-new-file path yet; those files don't exist on
// disk until the export is committed).

function clone(o) { return typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)); }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
function ident(k) { return /^[A-Za-z_$][\w$]*$/.test(k) ? k : `[${JSON.stringify(k)}]`; }

const OVR = {
  visions: 'stillpoint_visions_overrides_v1',
  quests: 'stillpoint_quests_overrides_v1',
  dialogue: 'stillpoint_npc_dialogue_overrides_v1',
  flagMeta: 'stillpoint_flag_meta_overrides_v1',
};

// Snapshots of static data the editor can't compute live but wants for
// autocomplete — regenerate by hand if game code adds new ones (same caveat
// cutscene_editor.js documents for its own snapshots).
const COMPANION_FIELDS = ['active', 'canFight'];
const CALL_TEMPLATE = '() => {}';

// ── Working data ───────────────────────────────────────────────────────────
let workingVisions = {}, workingQuests = {}, workingDialogue = {}, workingFlagMeta = {};
let selVision = null, selVisionStep = null;
let selQuest = null, selStage = null;
let selNpc = null, selEntry = null;
let selFlag = null;
let currentTab = 'graph';
let unsavedGuard = null;

function seedFromGlobalAndOverride(globalObj, overrideKey) {
  const base = globalObj && typeof globalObj === 'object' ? clone(globalObj) : {};
  try {
    const raw = localStorage.getItem(overrideKey);
    if (raw) return JSON.parse(raw); // an override, once saved, is the working truth
  } catch (e) { /* opaque origin / corrupt — fall back to the baked-in data */ }
  return base;
}

function seedAll() {
  workingVisions = seedFromGlobalAndOverride(typeof VISIONS !== 'undefined' ? VISIONS : {}, OVR.visions);
  workingQuests = seedFromGlobalAndOverride(typeof QUESTS !== 'undefined' ? QUESTS : {}, OVR.quests);
  workingDialogue = seedFromGlobalAndOverride(typeof NPC_DIALOGUE !== 'undefined' ? NPC_DIALOGUE : {}, OVR.dialogue);
  workingFlagMeta = seedFromGlobalAndOverride(typeof STORY_FLAG_META !== 'undefined' ? STORY_FLAG_META : {}, OVR.flagMeta);
}

// ── Undo / redo (shared game/undoHistory.js) ───────────────────────────────
function snapshot() {
  return {
    v: workingVisions, q: workingQuests, d: workingDialogue, m: workingFlagMeta,
    sel: { selVision, selVisionStep, selQuest, selStage, selNpc, selEntry, selFlag },
  };
}
const historyMgr = (typeof UndoHistory !== 'undefined') ? UndoHistory.create(
  snapshot,
  (snap) => {
    workingVisions = snap.v; workingQuests = snap.q; workingDialogue = snap.d; workingFlagMeta = snap.m;
    const s = snap.sel || {};
    selVision = s.selVision; selVisionStep = s.selVisionStep; selQuest = s.selQuest; selStage = s.selStage;
    selNpc = s.selNpc; selEntry = s.selEntry; selFlag = s.selFlag;
    renderCurrentTab();
  }
) : null;
function pushHistory() { if (historyMgr) historyMgr.push(); updateUndoRedo(); }
function updateUndoRedo() {
  document.getElementById('undo-btn').disabled = !historyMgr || !historyMgr.canUndo();
  document.getElementById('redo-btn').disabled = !historyMgr || !historyMgr.canRedo();
}
document.getElementById('undo-btn').addEventListener('click', () => { if (historyMgr) historyMgr.undo(); updateUndoRedo(); });
document.getElementById('redo-btn').addEventListener('click', () => { if (historyMgr) historyMgr.redo(); updateUndoRedo(); });
document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod || /^(input|textarea|select)$/i.test(e.target.tagName)) return;
  if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); if (historyMgr) historyMgr.undo(); updateUndoRedo(); }
  else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') { e.preventDefault(); if (historyMgr) historyMgr.redo(); updateUndoRedo(); }
});

// ── Shared field builders ──────────────────────────────────────────────────
function field(label, inputHtml) {
  const styled = inputHtml
    .replace(/<input /g, '<input class="ds-input" ')
    .replace(/<select /g, '<select class="ds-select" ')
    .replace(/<textarea(\s|>)/g, '<textarea class="ds-textarea"$1');
  return `<div class="field"><label>${label}</label>${styled}</div>`;
}

// Every known flag name across everything authored + the live cutscenes, for
// datalist autocomplete on flag inputs.
function knownFlags() {
  const set = new Set(Object.keys(workingFlagMeta));
  const a = PlotlineVerify.analyze(gatherSources());
  for (const f in a.flags) set.add(f);
  return [...set].sort();
}
function flagDatalist(id) {
  return `<datalist id="${id}">${knownFlags().map((f) => `<option value="${esc(f)}">`).join('')}</datalist>`;
}

// ── Condition (`requires`) editor — shared by Quests & Dialogue ─────────────
// Types: none | stage(quests only) | flag | talkCount | companionState.
function conditionType(cond) {
  if (cond == null) return 'none';
  if (typeof cond === 'string') return 'stage';
  if (cond.flag !== undefined) return 'flag';
  if (cond.talkCount !== undefined) return 'talkCount';
  if (cond.companionState !== undefined) return 'companionState';
  return 'none';
}
function conditionSummary(cond) {
  switch (conditionType(cond)) {
    case 'none': return 'always';
    case 'stage': return `after stage "${cond}"`;
    case 'flag': return `flag ${cond.flag} == ${JSON.stringify(cond.value === undefined ? true : cond.value)}`;
    case 'talkCount': { const t = cond.talkCount; return `talkCount${t.npcId ? '(' + t.npcId + ')' : ''} ≥ ${t.gte}`; }
    case 'companionState': return `companion.${cond.companionState}`;
    default: return '';
  }
}
function conditionEditorHtml(prefix, cond, opts) {
  opts = opts || {};
  const type = conditionType(cond);
  const stageOpt = opts.stageOptions
    ? `<option value="stage"${type === 'stage' ? ' selected' : ''}>after a prior stage</option>` : '';
  let html = field('Requires', `<select id="${prefix}-type">
    <option value="none"${type === 'none' ? ' selected' : ''}>always (no gate)</option>
    ${stageOpt}
    <option value="flag"${type === 'flag' ? ' selected' : ''}>story flag</option>
    <option value="talkCount"${type === 'talkCount' ? ' selected' : ''}>talk count ≥ N</option>
    <option value="companionState"${type === 'companionState' ? ' selected' : ''}>companion state</option>
  </select>`);
  if (type === 'stage') {
    const opts2 = (opts.stageOptions || []).map((s) => `<option value="${esc(s)}"${s === cond ? ' selected' : ''}>${esc(s)}</option>`).join('');
    html += field('Prior stage', `<select id="${prefix}-stage">${opts2}</select>`);
  } else if (type === 'flag') {
    html += field('Flag', `<input type="text" id="${prefix}-flag" list="${prefix}-flags" value="${esc(cond.flag)}">${flagDatalist(prefix + '-flags')}`);
    const v = cond.value === undefined ? true : cond.value;
    html += field('Equals', `<select id="${prefix}-flagval"><option value="true"${v === true ? ' selected' : ''}>true</option><option value="false"${v === false ? ' selected' : ''}>false</option></select>`);
  } else if (type === 'talkCount') {
    const t = cond.talkCount || {};
    html += field('NPC id (blank = this NPC)', `<input type="text" id="${prefix}-tc-npc" value="${esc(t.npcId || '')}" placeholder="${esc(opts.thisNpc || '')}">`);
    html += field('At least (≥)', `<input type="number" id="${prefix}-tc-gte" value="${Number(t.gte) || 1}" min="1">`);
  } else if (type === 'companionState') {
    const opts3 = COMPANION_FIELDS.map((f) => `<option value="${f}"${f === cond.companionState ? ' selected' : ''}>${f}</option>`).join('');
    html += field('Companion field (truthy)', `<select id="${prefix}-cs">${opts3}</select>`);
  }
  return html;
}
function readCondition(prefix, opts) {
  opts = opts || {};
  const g = (id) => document.getElementById(prefix + '-' + id);
  const type = g('type') ? g('type').value : 'none';
  switch (type) {
    case 'none': return null;
    case 'stage': return g('stage') ? g('stage').value : null;
    case 'flag': return { flag: g('flag') ? g('flag').value.trim() : '', value: g('flagval') ? g('flagval').value === 'true' : true };
    case 'talkCount': {
      const npcId = g('tc-npc') ? g('tc-npc').value.trim() : '';
      const out = { talkCount: { gte: Number(g('tc-gte') ? g('tc-gte').value : 1) || 1 } };
      if (npcId) out.talkCount.npcId = npcId;
      return out;
    }
    case 'companionState': return { companionState: g('cs') ? g('cs').value : COMPANION_FIELDS[0] };
    default: return null;
  }
}

// ── Effect (`onEnter` / `onComplete`) editor — shared ──────────────────────
function effectSummary(eff) {
  if (!eff) return 'nothing';
  const parts = [];
  if (eff.setFlag) parts.push(`set ${eff.setFlag}=${JSON.stringify(eff.value === undefined ? true : eff.value)}`);
  if (eff.call) parts.push('call fn');
  return parts.length ? parts.join(', ') : 'nothing';
}
function effectEditorHtml(prefix, eff) {
  eff = eff || {};
  let html = `<div class="subhead">Effect on enter</div>`;
  html += field('Set flag (blank = none)', `<input type="text" id="${prefix}-setflag" list="${prefix}-eflags" value="${esc(eff.setFlag || '')}">${flagDatalist(prefix + '-eflags')}`);
  const v = eff.value === undefined ? true : eff.value;
  html += field('Flag value', `<select id="${prefix}-setval"><option value="true"${v === true ? ' selected' : ''}>true</option><option value="false"${v === false ? ' selected' : ''}>false</option></select>`);
  html += `<div class="warn-label">⚠ raw call (optional, no guardrails)</div>`;
  html += field('Function source (blank = none)', `<textarea id="${prefix}-call" placeholder="${esc(CALL_TEMPLATE)}">${esc(eff.call || '')}</textarea>`);
  return html;
}
function readEffect(prefix) {
  const g = (id) => document.getElementById(prefix + '-' + id);
  const out = {};
  const sf = g('setflag') ? g('setflag').value.trim() : '';
  if (sf) { out.setFlag = sf; out.value = g('setval') ? g('setval').value === 'true' : true; }
  const call = g('call') ? g('call').value.trim() : '';
  if (call) out.call = call;
  return Object.keys(out).length ? out : null;
}

// ── Small generic list-item row ────────────────────────────────────────────
function itemRow(idx, badge, summary, handlers) {
  const row = document.createElement('div');
  row.className = 'item-row' + (handlers.selected ? ' sel' : '');
  row.innerHTML = `<span class="ir-idx">${idx}</span>${badge ? `<span class="ds-badge badge-${badge}"><span class="ds-dot"></span>${badge}</span>` : ''}<span class="ir-summary">${esc(summary)}</span>
    <span class="ir-btns">
      <button data-a="up" class="ds-btn ds-btn-ghost" title="Move up">▲</button>
      <button data-a="down" class="ds-btn ds-btn-ghost" title="Move down">▼</button>
      <button data-a="del" class="ds-btn ds-btn-danger" title="Delete">✕</button>
    </span>`;
  row.addEventListener('click', (e) => { if (!e.target.closest('button')) handlers.select(); });
  row.querySelector('[data-a="up"]').addEventListener('click', () => handlers.move(-1));
  row.querySelector('[data-a="down"]').addEventListener('click', () => handlers.move(1));
  row.querySelector('[data-a="del"]').addEventListener('click', () => handlers.del());
  return row;
}
function arrMove(arr, i, dir) { const j = i + dir; if (j < 0 || j >= arr.length) return i; const [x] = arr.splice(i, 1); arr.splice(j, 0, x); return j; }

/* ════════════════════════════ VISIONS TAB ════════════════════════════════ */
const VISION_STEP_TYPES = ['wait', 'cameraPan', 'imageReveal', 'setFlag', 'call'];
function newVisionStep(type) {
  switch (type) {
    case 'wait': return { type: 'wait', frames: 60 };
    case 'cameraPan': return { type: 'cameraPan', x: 0, y: 0, speed: 3 };
    case 'imageReveal': return { type: 'imageReveal', image: '', fadeIn: 40, hold: 120, fadeOut: 40 };
    case 'setFlag': return { type: 'setFlag', flag: '', value: true };
    case 'call': return { type: 'call', call: CALL_TEMPLATE };
  }
}
function visionStepSummary(s) {
  switch (s.type) {
    case 'wait': return `${s.frames} frames`;
    case 'cameraPan': return `→ (${s.x}, ${s.y}) @ ${s.speed}`;
    case 'imageReveal': return `${s.image || '(no image)'} — in ${s.fadeIn}/hold ${s.hold}/out ${s.fadeOut}`;
    case 'setFlag': return `${s.flag || '(unset)'} = ${JSON.stringify(s.value)}`;
    case 'call': return '(raw call)';
    default: return '';
  }
}
function renderVisionList() {
  const el = document.getElementById('vision-list');
  el.innerHTML = '';
  const keys = Object.keys(workingVisions).sort();
  if (!keys.length) { el.innerHTML = '<div class="hint">No visions yet.</div>'; return; }
  for (const k of keys) {
    const row = document.createElement('div');
    row.className = 'list-row' + (k === selVision ? ' sel' : '');
    const n = (workingVisions[k].steps || []).length;
    row.innerHTML = `<span class="lr-name">${esc(k)}</span><span class="lr-sub">${n} step${n === 1 ? '' : 's'}</span>`;
    row.addEventListener('click', () => { selVision = k; selVisionStep = null; renderVisions(); });
    el.appendChild(row);
  }
}
function renderVisionSteps() {
  const wrap = document.getElementById('vision-steps');
  document.getElementById('vision-title').textContent = selVision || '—';
  ['vision-add-step', 'vision-rename', 'vision-delete'].forEach((id) => document.getElementById(id).disabled = !selVision);
  wrap.innerHTML = '';
  if (!selVision) { wrap.innerHTML = '<div class="hint">Select or create a vision.</div>'; return; }
  const steps = workingVisions[selVision].steps || (workingVisions[selVision].steps = []);
  if (!steps.length) { wrap.innerHTML = '<div class="hint">No steps yet — click "+ Add Step".</div>'; return; }
  steps.forEach((s, i) => {
    wrap.appendChild(itemRow(i + 1, s.type, visionStepSummary(s), {
      selected: selVisionStep === i,
      select: () => { selVisionStep = i; renderVisions(); },
      move: (d) => { selVisionStep = arrMove(steps, i, d); pushHistory(); renderVisions(); },
      del: () => { steps.splice(i, 1); if (selVisionStep === i) selVisionStep = null; else if (selVisionStep > i) selVisionStep--; pushHistory(); renderVisions(); },
    }));
  });
}
function renderVisionProps() {
  const el = document.getElementById('vision-props');
  if (!selVision || selVisionStep == null) { el.innerHTML = '<div class="hint">Select a step to edit its fields.</div>'; return; }
  const step = (workingVisions[selVision].steps || [])[selVisionStep];
  if (!step) { el.innerHTML = '<div class="hint">Select a step to edit its fields.</div>'; return; }
  let html = '';
  switch (step.type) {
    case 'wait': html += field('Frames', `<input type="number" id="vf-frames" value="${step.frames}">`); break;
    case 'cameraPan':
      html += `<div class="field-row">${field('X', `<input type="number" id="vf-x" value="${step.x}">`)}${field('Y', `<input type="number" id="vf-y" value="${step.y}">`)}</div>`;
      html += field('Speed', `<input type="number" id="vf-speed" value="${step.speed}">`);
      break;
    case 'imageReveal':
      html += field('Image path', `<input type="text" id="vf-image" value="${esc(step.image)}" placeholder="assets/art/visions/foo.png">`);
      html += `<div class="field-row">${field('Fade in', `<input type="number" id="vf-fadein" value="${step.fadeIn}">`)}${field('Hold', `<input type="number" id="vf-hold" value="${step.hold}">`)}${field('Fade out', `<input type="number" id="vf-fadeout" value="${step.fadeOut}">`)}</div>`;
      break;
    case 'setFlag':
      html += field('Flag', `<input type="text" id="vf-flag" list="vf-flags" value="${esc(step.flag)}">${flagDatalist('vf-flags')}`);
      html += field('Value', `<select id="vf-val"><option value="true"${step.value === true ? ' selected' : ''}>true</option><option value="false"${step.value === false ? ' selected' : ''}>false</option></select>`);
      break;
    case 'call':
      html += `<div class="warn-label">⚠ raw code</div>`;
      html += field('Function source', `<textarea id="vf-call" style="min-height:90px">${esc(step.call)}</textarea>`);
      break;
  }
  el.innerHTML = html;
  const commit = () => { pushHistory(); renderVisionSteps(); renderVisionProps(); renderVisionList(); };
  const on = (id, ev, fn) => { const e = document.getElementById(id); if (e) e.addEventListener(ev, fn); };
  on('vf-frames', 'change', (e) => { step.frames = Number(e.target.value) || 0; commit(); });
  on('vf-x', 'change', (e) => { step.x = Number(e.target.value) || 0; commit(); });
  on('vf-y', 'change', (e) => { step.y = Number(e.target.value) || 0; commit(); });
  on('vf-speed', 'change', (e) => { step.speed = Number(e.target.value) || 0; commit(); });
  on('vf-image', 'change', (e) => { step.image = e.target.value.trim(); commit(); });
  on('vf-fadein', 'change', (e) => { step.fadeIn = Number(e.target.value) || 0; commit(); });
  on('vf-hold', 'change', (e) => { step.hold = Number(e.target.value) || 0; commit(); });
  on('vf-fadeout', 'change', (e) => { step.fadeOut = Number(e.target.value) || 0; commit(); });
  on('vf-flag', 'change', (e) => { step.flag = e.target.value.trim(); commit(); });
  on('vf-val', 'change', (e) => { step.value = e.target.value === 'true'; commit(); });
  on('vf-call', 'change', (e) => { step.call = e.target.value; commit(); });
}
function renderVisions() { renderVisionList(); renderVisionSteps(); renderVisionProps(); }

document.getElementById('add-vision').addEventListener('click', () => {
  const name = prompt('New vision id (e.g. origin_first_vision):');
  if (!name) return; const k = name.trim(); if (!k) return;
  if (workingVisions[k]) { alert('That vision id already exists.'); return; }
  workingVisions[k] = { steps: [] }; selVision = k; selVisionStep = null; pushHistory(); renderVisions();
});
document.getElementById('vision-rename').addEventListener('click', () => {
  if (!selVision) return; const name = prompt('Rename vision id:', selVision);
  if (!name) return; const k = name.trim(); if (!k || k === selVision) return;
  if (workingVisions[k]) { alert('That vision id already exists.'); return; }
  workingVisions[k] = workingVisions[selVision]; delete workingVisions[selVision]; selVision = k; pushHistory(); renderVisions();
});
document.getElementById('vision-delete').addEventListener('click', () => {
  if (!selVision || !confirm(`Delete vision "${selVision}" from the working set?`)) return;
  delete workingVisions[selVision]; selVision = null; selVisionStep = null; pushHistory(); renderVisions();
});
document.getElementById('vision-add-step').addEventListener('click', () => {
  if (!selVision) return;
  const t = prompt(`Step type — one of:\n${VISION_STEP_TYPES.join(', ')}`, 'imageReveal');
  if (!t || !VISION_STEP_TYPES.includes(t.trim())) { if (t) alert('Unknown step type.'); return; }
  const steps = workingVisions[selVision].steps || (workingVisions[selVision].steps = []);
  const at = selVisionStep != null ? selVisionStep + 1 : steps.length;
  steps.splice(at, 0, newVisionStep(t.trim())); selVisionStep = at; pushHistory(); renderVisions();
});

/* ════════════════════════════ QUESTS TAB ═════════════════════════════════ */
function newStage(id) { return { id: id || 'stage_' + Date.now().toString(36).slice(-4), requires: null, onEnter: null }; }
function renderQuestList() {
  const el = document.getElementById('quest-list');
  el.innerHTML = '';
  const keys = Object.keys(workingQuests).sort();
  if (!keys.length) { el.innerHTML = '<div class="hint">No quests yet.</div>'; return; }
  for (const k of keys) {
    const row = document.createElement('div');
    row.className = 'list-row' + (k === selQuest ? ' sel' : '');
    const n = (workingQuests[k].stages || []).length;
    row.innerHTML = `<span class="lr-name">${esc(k)}</span><span class="lr-sub">${n} stage${n === 1 ? '' : 's'}</span>`;
    row.addEventListener('click', () => { selQuest = k; selStage = null; renderQuests(); });
    el.appendChild(row);
  }
}
function renderQuestMeta() {
  const el = document.getElementById('quest-meta');
  if (!selQuest) { el.innerHTML = ''; return; }
  const q = workingQuests[selQuest];
  el.innerHTML = `<div class="field-row">
    ${field('NPC id', `<input type="text" id="q-npcId" value="${esc(q.npcId || '')}" placeholder="pacifist_companion">`)}
    ${field('Region', `<input type="text" id="q-region" value="${esc(q.region || '')}" placeholder="pacifist_enclave">`)}
  </div>`;
  const on = (id, fn) => { const e = document.getElementById(id); if (e) e.addEventListener('change', fn); };
  on('q-npcId', (e) => { q.npcId = e.target.value.trim(); pushHistory(); });
  on('q-region', (e) => { q.region = e.target.value.trim(); pushHistory(); });
}
function priorStageIds(q, exceptIdx) {
  return (q.stages || []).filter((_, i) => i !== exceptIdx).map((s) => s.id);
}
function renderQuestStages() {
  const wrap = document.getElementById('quest-stages');
  document.getElementById('quest-title').textContent = selQuest || '—';
  ['quest-add-stage', 'quest-delete'].forEach((id) => document.getElementById(id).disabled = !selQuest);
  wrap.innerHTML = '';
  if (!selQuest) { wrap.innerHTML = '<div class="hint">Select or create a quest.</div>'; return; }
  const stages = workingQuests[selQuest].stages || (workingQuests[selQuest].stages = []);
  if (!stages.length) { wrap.innerHTML = '<div class="hint">No stages yet — click "+ Add Stage".</div>'; return; }
  stages.forEach((st, i) => {
    wrap.appendChild(itemRow(i + 1, null, `${st.id} — ${conditionSummary(st.requires)} ⟶ ${effectSummary(st.onEnter)}`, {
      selected: selStage === i,
      select: () => { selStage = i; renderQuests(); },
      move: (d) => { selStage = arrMove(stages, i, d); pushHistory(); renderQuests(); },
      del: () => { stages.splice(i, 1); if (selStage === i) selStage = null; else if (selStage > i) selStage--; pushHistory(); renderQuests(); },
    }));
  });
}
function renderQuestProps() {
  const el = document.getElementById('quest-props');
  if (!selQuest || selStage == null) { el.innerHTML = '<div class="hint">Select a stage.</div>'; return; }
  const q = workingQuests[selQuest];
  const st = (q.stages || [])[selStage];
  if (!st) { el.innerHTML = '<div class="hint">Select a stage.</div>'; return; }
  let html = field('Stage id', `<input type="text" id="qs-id" value="${esc(st.id)}">`);
  html += conditionEditorHtml('qs', st.requires, { stageOptions: priorStageIds(q, selStage), thisNpc: q.npcId });
  html += effectEditorHtml('qs', st.onEnter);
  el.innerHTML = html;
  const commit = () => { pushHistory(); renderQuestStages(); renderQuestList(); };
  const rebuildReq = () => { st.requires = readCondition('qs', { stageOptions: priorStageIds(q, selStage), thisNpc: q.npcId }); commit(); renderQuestProps(); };
  const idEl = document.getElementById('qs-id');
  if (idEl) idEl.addEventListener('change', (e) => { st.id = e.target.value.trim() || st.id; commit(); renderQuestProps(); });
  const typeEl = document.getElementById('qs-type');
  if (typeEl) typeEl.addEventListener('change', rebuildReq);
  ['qs-stage', 'qs-flag', 'qs-flagval', 'qs-tc-npc', 'qs-tc-gte', 'qs-cs'].forEach((id) => {
    const e = document.getElementById(id); if (e) e.addEventListener('change', () => { st.requires = readCondition('qs', { stageOptions: priorStageIds(q, selStage), thisNpc: q.npcId }); commit(); });
  });
  ['qs-setflag', 'qs-setval', 'qs-call'].forEach((id) => {
    const e = document.getElementById(id); if (e) e.addEventListener('change', () => { st.onEnter = readEffect('qs'); commit(); });
  });
}
function renderQuests() { renderQuestList(); renderQuestMeta(); renderQuestStages(); renderQuestProps(); }

document.getElementById('add-quest').addEventListener('click', () => {
  const name = prompt('New quest id (e.g. pacifist_ally_arc):');
  if (!name) return; const k = name.trim(); if (!k) return;
  if (workingQuests[k]) { alert('That quest id already exists.'); return; }
  workingQuests[k] = { id: k, npcId: '', region: '', stages: [] }; selQuest = k; selStage = null; pushHistory(); renderQuests();
});
document.getElementById('quest-delete').addEventListener('click', () => {
  if (!selQuest || !confirm(`Delete quest "${selQuest}"?`)) return;
  delete workingQuests[selQuest]; selQuest = null; selStage = null; pushHistory(); renderQuests();
});
document.getElementById('quest-add-stage').addEventListener('click', () => {
  if (!selQuest) return;
  const stages = workingQuests[selQuest].stages || (workingQuests[selQuest].stages = []);
  const id = prompt('Stage id:', 'stage_' + (stages.length + 1));
  if (!id) return;
  const at = selStage != null ? selStage + 1 : stages.length;
  stages.splice(at, 0, newStage(id.trim())); selStage = at; pushHistory(); renderQuests();
});

/* ════════════════════════════ DIALOGUE TAB ═══════════════════════════════ */
let simTalkCount = 0;
function newDialogueEntry() { return { id: 'entry_' + Date.now().toString(36).slice(-4), requires: null, lines: [''], onComplete: null }; }
function renderNpcList() {
  const el = document.getElementById('npc-list');
  el.innerHTML = '';
  const keys = Object.keys(workingDialogue).sort();
  if (!keys.length) { el.innerHTML = '<div class="hint">No NPCs yet.</div>'; return; }
  for (const k of keys) {
    const row = document.createElement('div');
    row.className = 'list-row' + (k === selNpc ? ' sel' : '');
    const n = (workingDialogue[k] || []).length;
    row.innerHTML = `<span class="lr-name">${esc(k)}</span><span class="lr-sub">${n} entr${n === 1 ? 'y' : 'ies'}</span>`;
    row.addEventListener('click', () => { selNpc = k; selEntry = null; renderDialogue(); });
    el.appendChild(row);
  }
}
// Preview which entry fires at a given talk-count. talkCount conditions are
// evaluated against the slider; flag/companion/stage gates are treated as
// SATISFIED for this preview (the slider is specifically about talk-count
// gating, per plan §4) — clearly labelled so it isn't mistaken for a full sim.
function firingEntryIndex(entries, count) {
  for (let i = 0; i < entries.length; i++) {
    const c = entries[i].requires;
    const t = conditionType(c);
    if (t === 'none') return i;
    if (t === 'talkCount') { if (count >= (c.talkCount.gte || 0)) return i; }
    else return i; // flag/companion/stage assumed satisfied for the preview
  }
  return -1;
}
function renderDlgSim() {
  const el = document.getElementById('dlg-sim');
  if (!selNpc) { el.innerHTML = ''; return; }
  const entries = workingDialogue[selNpc] || [];
  const fire = firingEntryIndex(entries, simTalkCount);
  el.innerHTML = `<div class="field" style="margin-bottom:6px">
    <label>Preview: talk count = <strong style="color:var(--accent-bright)">${simTalkCount}</strong> → fires entry ${fire < 0 ? '<span style="color:var(--warn)">none</span>' : '#' + (fire + 1)}
      <span style="color:var(--fg-faint)">(flag/companion gates assumed met)</span></label>
    <input type="range" id="dlg-slider" min="0" max="20" value="${simTalkCount}" style="width:100%">
  </div>`;
  const s = document.getElementById('dlg-slider');
  if (s) s.addEventListener('input', (e) => { simTalkCount = Number(e.target.value); renderDlgSim(); renderDlgEntries(); });
}
function renderDlgEntries() {
  const wrap = document.getElementById('dlg-entries');
  document.getElementById('npc-title').textContent = selNpc || '—';
  ['dlg-add-entry', 'npc-delete'].forEach((id) => document.getElementById(id).disabled = !selNpc);
  wrap.innerHTML = '';
  if (!selNpc) { wrap.innerHTML = '<div class="hint">Select or create an NPC.</div>'; return; }
  const entries = workingDialogue[selNpc] || (workingDialogue[selNpc] = []);
  if (!entries.length) { wrap.innerHTML = '<div class="hint">No entries yet — click "+ Add Entry".</div>'; return; }
  const fire = firingEntryIndex(entries, simTalkCount);
  entries.forEach((en, i) => {
    const first = (en.lines && en.lines[0]) || '(no lines)';
    const mark = i === fire ? '▶ ' : '';
    wrap.appendChild(itemRow(i + 1, null, `${mark}[${conditionSummary(en.requires)}] "${first.slice(0, 40)}"`, {
      selected: selEntry === i,
      select: () => { selEntry = i; renderDialogue(); },
      move: (d) => { selEntry = arrMove(entries, i, d); pushHistory(); renderDialogue(); },
      del: () => { entries.splice(i, 1); if (selEntry === i) selEntry = null; else if (selEntry > i) selEntry--; pushHistory(); renderDialogue(); },
    }));
  });
}
function renderDlgProps() {
  const el = document.getElementById('dlg-props');
  if (!selNpc || selEntry == null) { el.innerHTML = '<div class="hint">Select an entry.</div>'; return; }
  const en = (workingDialogue[selNpc] || [])[selEntry];
  if (!en) { el.innerHTML = '<div class="hint">Select an entry.</div>'; return; }
  let html = field('Entry id', `<input type="text" id="de-id" value="${esc(en.id)}">`);
  html += conditionEditorHtml('de', en.requires, { thisNpc: selNpc });
  html += `<div class="subhead">Lines (one per line)</div>`;
  html += field('', `<textarea id="de-lines" style="min-height:100px">${esc((en.lines || []).join('\n'))}</textarea>`);
  html += effectEditorHtml('de', en.onComplete).replace('Effect on enter', 'Effect on complete');
  el.innerHTML = html;
  const commit = () => { pushHistory(); renderDlgEntries(); renderNpcList(); renderDlgSim(); };
  const idEl = document.getElementById('de-id');
  if (idEl) idEl.addEventListener('change', (e) => { en.id = e.target.value.trim() || en.id; commit(); });
  const typeEl = document.getElementById('de-type');
  if (typeEl) typeEl.addEventListener('change', () => { en.requires = readCondition('de', { thisNpc: selNpc }); commit(); renderDlgProps(); });
  ['de-stage', 'de-flag', 'de-flagval', 'de-tc-npc', 'de-tc-gte', 'de-cs'].forEach((id) => {
    const e = document.getElementById(id); if (e) e.addEventListener('change', () => { en.requires = readCondition('de', { thisNpc: selNpc }); commit(); });
  });
  const linesEl = document.getElementById('de-lines');
  if (linesEl) linesEl.addEventListener('change', (e) => { en.lines = e.target.value.split('\n').map((l) => l).filter((l, idx, a) => !(l === '' && idx === a.length - 1)); commit(); });
  ['de-setflag', 'de-setval', 'de-call'].forEach((id) => {
    const e = document.getElementById(id); if (e) e.addEventListener('change', () => { en.onComplete = readEffect('de'); commit(); });
  });
}
function renderDialogue() { renderNpcList(); renderDlgSim(); renderDlgEntries(); renderDlgProps(); }

document.getElementById('add-npc').addEventListener('click', () => {
  const name = prompt('New NPC id (e.g. pacifist_companion):');
  if (!name) return; const k = name.trim(); if (!k) return;
  if (workingDialogue[k]) { alert('That NPC id already exists.'); return; }
  workingDialogue[k] = []; selNpc = k; selEntry = null; pushHistory(); renderDialogue();
});
document.getElementById('npc-delete').addEventListener('click', () => {
  if (!selNpc || !confirm(`Delete NPC "${selNpc}" and all its dialogue?`)) return;
  delete workingDialogue[selNpc]; selNpc = null; selEntry = null; pushHistory(); renderDialogue();
});
document.getElementById('dlg-add-entry').addEventListener('click', () => {
  if (!selNpc) return;
  const entries = workingDialogue[selNpc] || (workingDialogue[selNpc] = []);
  const at = selEntry != null ? selEntry + 1 : entries.length;
  entries.splice(at, 0, newDialogueEntry()); selEntry = at; pushHistory(); renderDialogue();
});

/* ════════════════════════ FLAG GRAPH TAB ═════════════════════════════════ */
function gatherSources() {
  return {
    cutscenes: typeof CUTSCENES !== 'undefined' ? CUTSCENES : {},
    quests: workingQuests, dialogue: workingDialogue, visions: workingVisions,
  };
}
let graphNodes = [], graphEdges = [], graphAnalysis = null, graphRAF = null, graphColors = null;
function resolveColors() {
  if (graphColors) return graphColors;
  const cs = getComputedStyle(document.documentElement);
  const c = (n, fb) => (cs.getPropertyValue(n).trim() || fb);
  graphColors = {
    cutscene: c('--info', '#60a5fa'), quest: c('--ok', '#34d399'),
    dialogue: c('--teal', '#2dd4bf'), vision: c('--accent-bright', '#f9a8d4'),
    danger: c('--danger', '#f87171'), edge: 'rgba(255,255,255,0.14)',
    fg: c('--fg', '#e2e8f0'), faint: c('--fg-faint', '#64748b'),
  };
  return graphColors;
}
function nodeColor(flag) {
  const src = (flag.writers[0] || flag.readers[0] || '');
  const col = resolveColors();
  if (src.startsWith('cutscene:')) return col.cutscene;
  if (src.startsWith('quest:')) return col.quest;
  if (src.startsWith('dialogue:')) return col.dialogue;
  if (src.startsWith('vision:')) return col.vision;
  return col.faint;
}
function buildGraph(relayout) {
  graphAnalysis = PlotlineVerify.analyze(gatherSources());
  const canvas = document.getElementById('graph-canvas');
  const W = canvas.width || 600, H = canvas.height || 400;
  const prev = {};
  for (const n of graphNodes) prev[n.name] = n;
  const problemFlags = new Set();
  for (const iss of graphAnalysis.issues) if (iss.severity !== 'info') (iss.flags || []).forEach((f) => problemFlags.add(f));
  graphNodes = Object.keys(graphAnalysis.flags).map((name, i, arr) => {
    const p = !relayout && prev[name];
    const ang = (i / Math.max(1, arr.length)) * Math.PI * 2;
    return {
      name,
      x: p ? p.x : W / 2 + Math.cos(ang) * Math.min(W, H) * 0.32 + (Math.random() - 0.5) * 20,
      y: p ? p.y : H / 2 + Math.sin(ang) * Math.min(W, H) * 0.32 + (Math.random() - 0.5) * 20,
      vx: 0, vy: 0, pinned: p ? p.pinned : false,
      flag: graphAnalysis.flags[name], problem: problemFlags.has(name),
    };
  });
  const idx = {}; graphNodes.forEach((n, i) => idx[n.name] = i);
  graphEdges = graphAnalysis.edges.filter((e) => idx[e.from] != null && idx[e.to] != null).map((e) => ({ a: idx[e.from], b: idx[e.to] }));
  renderGraphSummary();
  renderIssues();
  startGraphSim();
}
function renderGraphSummary() {
  const c = graphAnalysis.counts;
  document.getElementById('graph-summary').textContent =
    `${c.flags} flags · ${c.writes} writes · ${c.reads} reads · ${c.errors} error(s) · ${c.warnings} warning(s)`;
}
function renderIssues() {
  const el = document.getElementById('issues');
  const issues = graphAnalysis.issues;
  if (!issues.length) { el.innerHTML = '<div class="iss ok">✓ no cycles, dead flags, or unwritten gates</div>'; return; }
  el.innerHTML = issues.map((iss) =>
    `<div class="iss ${iss.severity}" data-flags="${esc((iss.flags || []).join(','))}">${esc(iss.type)}: ${esc(iss.detail)}</div>`
  ).join('');
  el.querySelectorAll('.iss[data-flags]').forEach((d) => d.addEventListener('click', () => {
    const first = (d.dataset.flags || '').split(',')[0];
    if (first) { selFlag = first; renderFlagDetail(); flashNode(first); }
  }));
}
let flashName = null, flashUntil = 0;
function flashNode(name) { flashName = name; flashUntil = performance.now() + 1500; startGraphSim(); }
function renderFlagDetail() {
  const el = document.getElementById('flag-detail');
  if (!selFlag || !graphAnalysis || !graphAnalysis.flags[selFlag]) {
    el.innerHTML = '<div class="hint">Click a flag node to annotate it and see its writers/readers.</div>'; return;
  }
  const f = graphAnalysis.flags[selFlag];
  const meta = workingFlagMeta[selFlag] || {};
  let html = `<div class="field"><label>Flag</label><div class="mono-small" style="color:var(--fg)">${esc(selFlag)}</div></div>`;
  html += field('Description', `<textarea id="fm-desc" placeholder="What does this flag mean?">${esc(meta.description || '')}</textarea>`);
  html += field('Added by (note)', `<input type="text" id="fm-by" value="${esc(meta.addedBy || '')}" placeholder="cutscene:foo / quest:bar">`);
  html += `<div class="subhead">Written by (${f.writers.length})</div>`;
  html += f.writers.length ? `<div class="mono-small">${f.writers.map(esc).join('<br>')}</div>` : '<div class="hint" style="padding:0">nothing — unwritten gate</div>';
  html += `<div class="subhead">Read by (${f.readers.length})</div>`;
  html += f.readers.length ? `<div class="mono-small">${f.readers.map(esc).join('<br>')}</div>` : '<div class="hint" style="padding:0">no data gate reads it (may be read in game code)</div>';
  el.innerHTML = html;
  const desc = document.getElementById('fm-desc');
  const by = document.getElementById('fm-by');
  const save = () => {
    const m = workingFlagMeta[selFlag] || (workingFlagMeta[selFlag] = {});
    m.description = desc.value; m.addedBy = by.value.trim();
    if (!m.description && !m.addedBy) delete workingFlagMeta[selFlag];
    pushHistory();
  };
  if (desc) desc.addEventListener('change', save);
  if (by) by.addEventListener('change', save);
}
// Force sim
function sizeGraphCanvas() {
  const canvas = document.getElementById('graph-canvas');
  const r = canvas.getBoundingClientRect();
  if (r.width && r.height && (canvas.width !== Math.floor(r.width) || canvas.height !== Math.floor(r.height))) {
    canvas.width = Math.floor(r.width); canvas.height = Math.floor(r.height);
  }
}
let simSettleTicks = 0;
function startGraphSim() { simSettleTicks = 200; if (!graphRAF) graphRAF = requestAnimationFrame(graphTick); }
function graphTick() {
  graphRAF = null;
  if (currentTab !== 'graph') return;
  sizeGraphCanvas();
  stepForces();
  drawGraph();
  const active = simSettleTicks-- > 0 || (flashName && performance.now() < flashUntil) || draggingNode;
  if (active) graphRAF = requestAnimationFrame(graphTick);
}
function stepForces() {
  const canvas = document.getElementById('graph-canvas');
  const W = canvas.width, H = canvas.height;
  const N = graphNodes.length;
  for (let i = 0; i < N; i++) {
    const a = graphNodes[i];
    if (a.pinned || a === draggingNode) continue;
    let fx = 0, fy = 0;
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      const b = graphNodes[j];
      let dx = a.x - b.x, dy = a.y - b.y;
      let d2 = dx * dx + dy * dy; if (d2 < 1) { d2 = 1; dx = Math.random(); dy = Math.random(); }
      const rep = 5200 / d2;
      const d = Math.sqrt(d2);
      fx += (dx / d) * rep; fy += (dy / d) * rep;
    }
    fx += (W / 2 - a.x) * 0.008; fy += (H / 2 - a.y) * 0.008;
    a.vx = (a.vx + fx) * 0.82; a.vy = (a.vy + fy) * 0.82;
  }
  for (const e of graphEdges) {
    const a = graphNodes[e.a], b = graphNodes[e.b];
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const k = (d - 120) * 0.02;
    const ux = dx / d, uy = dy / d;
    if (!a.pinned && a !== draggingNode) { a.vx += ux * k; a.vy += uy * k; }
    if (!b.pinned && b !== draggingNode) { b.vx -= ux * k; b.vy -= uy * k; }
  }
  for (const n of graphNodes) {
    if (n.pinned || n === draggingNode) continue;
    n.x += Math.max(-8, Math.min(8, n.vx)); n.y += Math.max(-8, Math.min(8, n.vy));
    n.x = Math.max(30, Math.min(W - 30, n.x)); n.y = Math.max(24, Math.min(H - 24, n.y));
  }
}
function drawGraph() {
  const canvas = document.getElementById('graph-canvas');
  const ctx = canvas.getContext('2d');
  const col = resolveColors();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // edges
  ctx.lineWidth = 1;
  for (const e of graphEdges) {
    const a = graphNodes[e.a], b = graphNodes[e.b];
    ctx.strokeStyle = col.edge;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    // arrowhead toward b
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const hx = b.x - Math.cos(ang) * 16, hy = b.y - Math.sin(ang) * 16;
    ctx.fillStyle = col.edge;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx - Math.cos(ang - 0.4) * 6, hy - Math.sin(ang - 0.4) * 6);
    ctx.lineTo(hx - Math.cos(ang + 0.4) * 6, hy - Math.sin(ang + 0.4) * 6);
    ctx.fill();
  }
  // nodes
  ctx.font = '10px ui-monospace, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const now = performance.now();
  for (const n of graphNodes) {
    const r = 7 + Math.min(6, (n.flag.writers.length + n.flag.readers.length));
    const flashing = flashName === n.name && now < flashUntil;
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = nodeColor(n.flag); ctx.fill();
    if (n.problem || flashing || n.name === selFlag) {
      ctx.lineWidth = flashing ? 3 : 2;
      ctx.strokeStyle = n.problem ? col.danger : col.fg;
      ctx.stroke();
    }
    ctx.fillStyle = col.fg;
    ctx.fillText(n.name.length > 22 ? n.name.slice(0, 21) + '…' : n.name, n.x, n.y - r - 8);
  }
}
// interaction
let draggingNode = null, dragMoved = false;
function nodeAt(mx, my) {
  for (let i = graphNodes.length - 1; i >= 0; i--) {
    const n = graphNodes[i];
    const r = 9 + Math.min(6, (n.flag.writers.length + n.flag.readers.length));
    if ((mx - n.x) ** 2 + (my - n.y) ** 2 <= r * r) return n;
  }
  return null;
}
function canvasPos(e) {
  const canvas = document.getElementById('graph-canvas');
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) * (canvas.width / r.width), (e.clientY - r.top) * (canvas.height / r.height)];
}
(function wireGraphCanvas() {
  const canvas = document.getElementById('graph-canvas');
  canvas.addEventListener('mousedown', (e) => {
    const [mx, my] = canvasPos(e);
    const n = nodeAt(mx, my);
    if (n) { draggingNode = n; dragMoved = false; n.pinned = true; canvas.style.cursor = 'grabbing'; startGraphSim(); }
  });
  window.addEventListener('mousemove', (e) => {
    if (!draggingNode) return;
    const [mx, my] = canvasPos(e);
    draggingNode.x = mx; draggingNode.y = my; draggingNode.vx = 0; draggingNode.vy = 0; dragMoved = true;
    startGraphSim();
  });
  window.addEventListener('mouseup', () => {
    if (draggingNode) {
      if (!dragMoved) { selFlag = draggingNode.name; draggingNode.pinned = false; renderFlagDetail(); }
      draggingNode = null; document.getElementById('graph-canvas').style.cursor = 'grab';
      startGraphSim();
    }
  });
})();
function renderGraph() { sizeGraphCanvas(); buildGraph(false); renderFlagDetail(); }
document.getElementById('graph-refresh').addEventListener('click', () => buildGraph(false));
document.getElementById('graph-relayout').addEventListener('click', () => buildGraph(true));
window.addEventListener('resize', () => { if (currentTab === 'graph') startGraphSim(); });

/* ════════════════════════ EXPORT / SAVE ══════════════════════════════════ */
function jsValue(v) { return JSON.stringify(v); }
function exportVisions() {
  let body = '';
  for (const k of Object.keys(workingVisions).sort()) {
    const steps = (workingVisions[k].steps || []).map((s) => {
      if (s.type === 'call') return `      { type: 'call', fn: ${s.call || CALL_TEMPLATE} },`;
      const parts = Object.keys(s).filter((kk) => kk !== 'type').map((kk) => `${kk}: ${jsValue(s[kk])}`);
      return `      { type: '${s.type}'${parts.length ? ', ' + parts.join(', ') : ''} },`;
    }).join('\n');
    body += `  ${ident(k)}: {\n    steps: [\n${steps}\n    ],\n  },\n`;
  }
  return `const VISIONS = {\n${body}};\n\nif (typeof window !== 'undefined') window.VISIONS = VISIONS;\nif (typeof module !== 'undefined' && module.exports) module.exports = { VISIONS };\n`;
}
function exportConditionJs(c) {
  if (c == null) return 'null';
  if (typeof c === 'string') return jsValue(c);
  return jsValue(c);
}
function exportEffectJs(eff) {
  if (!eff) return 'null';
  if (eff.call && !eff.setFlag) return `{ call: ${eff.call} }`;
  const parts = [];
  if (eff.setFlag) parts.push(`setFlag: ${jsValue(eff.setFlag)}, value: ${jsValue(eff.value === undefined ? true : eff.value)}`);
  if (eff.call) parts.push(`call: ${eff.call}`);
  return `{ ${parts.join(', ')} }`;
}
function exportQuests() {
  let body = '';
  for (const k of Object.keys(workingQuests).sort()) {
    const q = workingQuests[k];
    const stages = (q.stages || []).map((st) =>
      `      { id: ${jsValue(st.id)}, requires: ${exportConditionJs(st.requires)}, onEnter: ${exportEffectJs(st.onEnter)} },`
    ).join('\n');
    body += `  ${ident(k)}: {\n    id: ${jsValue(q.id || k)}, npcId: ${jsValue(q.npcId || '')}, region: ${jsValue(q.region || '')},\n    stages: [\n${stages}\n    ],\n  },\n`;
  }
  return `const QUESTS = {\n${body}};\n\nif (typeof window !== 'undefined') window.QUESTS = QUESTS;\nif (typeof module !== 'undefined' && module.exports) module.exports = { QUESTS };\n`;
}
function exportDialogue() {
  let body = '';
  for (const k of Object.keys(workingDialogue).sort()) {
    const entries = (workingDialogue[k] || []).map((en) => {
      const lines = (en.lines || []).map((l) => `        ${jsValue(l)}`).join(',\n');
      return `      {\n        id: ${jsValue(en.id)},\n        requires: ${exportConditionJs(en.requires)},\n        lines: [\n${lines}\n        ],\n        onComplete: ${exportEffectJs(en.onComplete)},\n      },`;
    }).join('\n');
    body += `  ${ident(k)}: [\n${entries}\n  ],\n`;
  }
  return `const NPC_DIALOGUE = {\n${body}};\n\nif (typeof window !== 'undefined') window.NPC_DIALOGUE = NPC_DIALOGUE;\nif (typeof module !== 'undefined' && module.exports) module.exports = { NPC_DIALOGUE };\n`;
}
function exportFlagMeta() {
  let body = '';
  for (const k of Object.keys(workingFlagMeta).sort()) {
    const m = workingFlagMeta[k];
    body += `  ${ident(k)}: { description: ${jsValue(m.description || '')}, addedBy: ${jsValue(m.addedBy || '')} },\n`;
  }
  return `const STORY_FLAG_META = {\n${body}};\n\nif (typeof window !== 'undefined') window.STORY_FLAG_META = STORY_FLAG_META;\nif (typeof module !== 'undefined' && module.exports) module.exports = { STORY_FLAG_META };\n`;
}
document.getElementById('exp-visions').addEventListener('click', () => document.getElementById('export-out').value = exportVisions());
document.getElementById('exp-quests').addEventListener('click', () => document.getElementById('export-out').value = exportQuests());
document.getElementById('exp-dialogue').addEventListener('click', () => document.getElementById('export-out').value = exportDialogue());
document.getElementById('exp-flagmeta').addEventListener('click', () => document.getElementById('export-out').value = exportFlagMeta());

document.getElementById('save-live-btn').addEventListener('click', () => {
  const status = document.getElementById('save-status');
  try {
    localStorage.setItem(OVR.visions, JSON.stringify(workingVisions));
    localStorage.setItem(OVR.quests, JSON.stringify(workingQuests));
    localStorage.setItem(OVR.dialogue, JSON.stringify(workingDialogue));
    localStorage.setItem(OVR.flagMeta, JSON.stringify(workingFlagMeta));
    if (unsavedGuard) unsavedGuard.checkpoint();
    if (typeof DevContext !== 'undefined') DevContext.log('Plotline Editor', 'Saved live overrides', `${Object.keys(workingQuests).length} quest(s), ${Object.keys(workingDialogue).length} NPC(s)`);
    status.innerHTML = '<span class="ok">✓ saved to browser (localStorage overrides)</span>';
  } catch (e) {
    status.innerHTML = `<span class="bad">✗ ${esc(e.message)}</span>`;
  }
  setTimeout(() => { status.innerHTML = ''; }, 4000);
});

/* ════════════════════════ TABS / BOOT ════════════════════════════════════ */
function renderCurrentTab() {
  updateUndoRedo();
  if (currentTab === 'graph') renderGraph();
  else if (currentTab === 'visions') renderVisions();
  else if (currentTab === 'quests') renderQuests();
  else if (currentTab === 'dialogue') renderDialogue();
}
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === 'panel-' + tab));
  renderCurrentTab();
}
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));
document.getElementById('back').addEventListener('click', () => {
  if (typeof DevContext !== 'undefined' && selQuest) DevContext.set({ currentQuestId: selQuest });
});

seedAll();
if (historyMgr) historyMgr.reset();
updateUndoRedo();
switchTab('graph');
if (typeof UnsavedGuard !== 'undefined') unsavedGuard = UnsavedGuard.watch(() => ({ workingVisions, workingQuests, workingDialogue, workingFlagMeta }));
