#!/usr/bin/env node
// Stillpoint — Room Difficulty Calculator
//
// Companion to analyze_floor_plan.js's --simulate mode, but instead of
// always walking to the Final Boss, you pick ANY room and it tells you
// the average loadout (abilities, Fracture Pips, Lore Pips, max health
// ups) a player is likely to have BY THE TIME they first reach that
// room — via a batch of random weighted-walk playthroughs, same engine
// family as floor_plan_simulation.html, run live in the browser.
//
// New on top of the base engine: models the Echo Bridge / Timeline X
// Roads Room 2 "give up the Child vs. keep the Child" choice as a real
// per-run coin flip (not the base engine's "always grants Void Tether"
// simplification) — see CHOICE MODEL below.
//
// Usage:
//   node Plans/room_difficulty_calculator.js --html [outPath]
//     Writes editor/room_difficulty_calculator.html (default path) — an
//     interactive page: pick a room from a dropdown, set run count /
//     keep-the-child odds, click Run, see averaged loadout + a rough
//     difficulty-tier suggestion. All simulation happens client-side in
//     the browser (same graph data baked in once at generation time) —
//     re-run this script only when floor_plan.md's graph changes.
//
// CHOICE MODEL (why this needed its own tool, not just a flag on the
// base engine): the base engine parses Timeline X Roads Room 2's label
// as an unconditional "unlocks Void Tether" grant, because the mermaid
// text describes both outcomes in one node and the parser has no
// concept of "player choice." This tool special-cases that one node:
// on first visit, each simulated run rolls keepChildProb to decide
// keep-the-Child (no Void Tether, child_choice_resolved still sets) vs.
// give-up-the-Child (grants Void Tether, child_choice_resolved sets).
// Per the user's stated intent: keeping the Child gives a small global
// difficulty reduction (a "the world is a little gentler with you"
// read — tune DIFFICULTY_KEEP_CHILD_MULT below), Void Tether opens more
// routes (this falls out naturally from the ability-gated edges it
// unlocks, no extra multiplier needed).

const fs = require('fs');
const path = require('path');
const {
  extractMermaidBlock, buildGraph, findStart, ALL_ABILITIES, ALL_FLAGS,
  TIME_WEIGHTS, serializeGraphForClient, loadDifficultyConfig, MD_PATH, PLANS_DIR,
} = require('./analyze_floor_plan.js');

const DIFFICULTY_KEEP_CHILD_MULT = 0.9; // tune here — see CHOICE MODEL above

function findChildChoiceNode(graph) {
  for (const n of graph.nodes.values()) {
    if (/unlocks void tether if you give up the child/i.test(n.label)) return n.id;
  }
  return null;
}

function getArgValue(args, flag) {
  const i = args.indexOf(flag);
  return i === -1 ? null : args[i + 1];
}

function buildDifficultyCalculatorHtml(graph, startId, difficultyConfig) {
  const childChoiceNodeId = findChildChoiceNode(graph);
  const clientGraph = serializeGraphForClient(graph, startId, startId, difficultyConfig);
  clientGraph.childChoiceNodeId = childChoiceNodeId;
  clientGraph.keepChildDifficultyMult = DIFFICULTY_KEEP_CHILD_MULT;
  const roomOptions = [...graph.nodes.values()]
    .filter((n) => n.id !== startId)
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((n) => ({ id: n.id, label: n.label }));
  const graphJson = JSON.stringify(clientGraph).replace(/</g, '\\u003c');
  const roomsJson = JSON.stringify(roomOptions).replace(/</g, '\\u003c');
  const abilitiesJson = JSON.stringify(ALL_ABILITIES);

  return `<style>
  :root { --bg:#0b0d14; --panel:#12141d; --panel-border:#262b3a; --text:#e7e9f2; --muted:#8890a6; --teal:#2fe0c8; --amber:#f0b25a; --rose:#ef6a8f; --violet:#8a6bff; }
  @media (prefers-color-scheme: light) { :root { --bg:#f4f5fa; --panel:#fff; --panel-border:#dcdfe8; --text:#1a1c26; --muted:#5c6178; } }
  :root[data-theme="light"] { --bg:#f4f5fa; --panel:#fff; --panel-border:#dcdfe8; --text:#1a1c26; --muted:#5c6178; }
  :root[data-theme="dark"] { --bg:#0b0d14; --panel:#12141d; --panel-border:#262b3a; --text:#e7e9f2; --muted:#8890a6; }
  * { box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 24px; max-width: 980px; }
  h1 { font-size: 1.3rem; margin: 0 0 4px; }
  h2 { font-size: 1rem; margin: 0 0 10px; }
  .sub { color: var(--muted); font-size: 0.85rem; margin-bottom: 18px; line-height: 1.5; }
  .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; background: var(--panel); border: 1px solid var(--panel-border); border-radius: 10px; padding: 14px 16px; }
  .toolbar label { font-size: 0.8rem; color: var(--muted); display: flex; align-items: center; gap: 6px; }
  select, input[type=number] { background: var(--bg); border: 1px solid var(--panel-border); color: var(--text); border-radius: 6px; padding: 6px 8px; font-size: 0.85rem; }
  select#roomSelect { min-width: 320px; }
  input[type=number] { width: 64px; }
  input[type=range] { width: 120px; }
  button { background: var(--violet); color: #fff; border: none; border-radius: 8px; padding: 9px 16px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
  button:hover { opacity: 0.9; }
  .panel { background: var(--panel); border: 1px solid var(--panel-border); border-radius: 10px; padding: 16px 18px; margin-bottom: 18px; }
  .stats { display: flex; flex-wrap: wrap; gap: 10px; margin: 8px 0; }
  .stat { background: var(--bg); border: 1px solid var(--panel-border); border-radius: 8px; padding: 8px 12px; min-width: 96px; }
  .stat .n { font-size: 1.15rem; font-weight: 700; color: var(--teal); }
  .stat .l { font-size: 0.66rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em; }
  .stat .range { font-size: 0.62rem; color: var(--muted); margin-top: 2px; }
  .gate-check { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
  .gate-check .pill.ok { border-color: var(--teal); }
  .gate-check .pill.warn { border-color: var(--rose); }
  .ability-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
  .pill { border: 1px solid var(--panel-border); border-radius: 999px; padding: 4px 10px; font-size: 0.75rem; background: var(--bg); }
  .pill .pct { color: var(--teal); font-weight: 700; margin-left: 4px; }
  .split-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }
  .branch-h { font-size: 0.8rem; color: var(--amber); text-transform: uppercase; letter-spacing: 0.03em; margin: 0 0 6px; }
  .tier { font-size: 1.4rem; font-weight: 800; }
  .tier-desc { color: var(--muted); font-size: 0.8rem; margin-top: 4px; }
  .note { color: var(--muted); font-size: 0.78rem; line-height: 1.5; margin-top: 10px; }
  .fail-note { color: var(--rose); font-size: 0.82rem; margin-top: 8px; }
</style>
<h1>Stillpoint — Room Difficulty Calculator</h1>
<div class="sub">
  Pick a room. Runs a batch of random weighted-walk playthroughs (same
  engine family as <code>floor_plan_simulation.html</code>) from Spawn to
  that room, rolling the "keep the Child vs. Void Tether" choice per run,
  and averages what a player is actually carrying (abilities, Fracture
  Pips, Lore Pips, max health) the first time they arrive. Use that to
  gut-check how hard the room should hit back. Regenerate this file
  (<code>node Plans/room_difficulty_calculator.js --html</code>) after any
  <code>floor_plan.md</code> graph change.
</div>
<div class="toolbar">
  <label>Room <select id="roomSelect"></select></label>
  <label>Runs <input type="number" id="runsInput" value="200" min="10" max="2000"></label>
  <label>Keep-the-Child odds <input type="range" id="keepProbInput" min="0" max="100" value="50"><span id="keepProbLabel">50%</span></label>
  <label>Walk style <select id="modeSelect">
    <option value="explore">Thorough explorer (wanders, backtracks for fun)</option>
    <option value="direct">Direct (only backtracks when actually stuck)</option>
  </select></label>
  <button id="runBtn">Run</button>
</div>
<div id="results"></div>
<script src="../game/floorPlanWalkEngine.js"></script>
<script>
const GRAPH = ${graphJson};
const ALL_ROOMS = ${roomsJson};
const ALL_ABILITIES = ${abilitiesJson};
const ABILITY_LABELS = { phase_dash:'Phase Dash', shard_shot:'Shard Shot', charged_attack:'Charged Attack', graviton_surge:'Graviton Surge', stillpoint:'Stillpoint', void_tether:'Void Tether' };

const roomSelect = document.getElementById('roomSelect');
for (const r of ALL_ROOMS) {
  const opt = document.createElement('option');
  opt.value = r.id; opt.textContent = r.label;
  roomSelect.appendChild(opt);
}

const keepProbInput = document.getElementById('keepProbInput');
const keepProbLabel = document.getElementById('keepProbLabel');
keepProbInput.addEventListener('input', () => { keepProbLabel.textContent = keepProbInput.value + '%'; });

// mulberry32/weightedPick/maskToSet/requirementSatisfied/unexploredReach/
// getFastTravelIndex/chooseNextMove come from game/floorPlanWalkEngine.js —
// shared with analyze_floor_plan.js's own engine and the one it generates
// into floor_plan_simulation.html (this used to be a third hand-ported copy
// of the whole thing).
function nodeWeight(n) {
  const tw = GRAPH.timeWeights;
  let w = tw.baseRoom;
  if (n.miniboss) w += tw.miniboss;
  if (n.finalBoss) w += tw.finalBoss;
  w += n.fracturePips * tw.fracturePip;
  w += n.lorePips * tw.lorePip;
  w += n.cosmeticUpgrades * tw.cosmeticUpgrade;
  w += n.maxHealth * tw.maxHealth;
  if (n.grants.length) w += tw.abilityGrant;
  return w;
}
function difficultyMultiplier(node) {
  const config = GRAPH.difficultyConfig;
  const label = node.label.toLowerCase();
  for (const key of Object.keys(config.rooms)) if (key.toLowerCase() === label) return config.rooms[key];
  let best = null, bestLen = -1;
  for (const key of Object.keys(config.rooms)) {
    const k = key.toLowerCase();
    if (k === 'miniboss' || k === 'finalboss') continue;
    if (label.includes(k) && k.length > bestLen) { best = config.rooms[key]; bestLen = k.length; }
  }
  if (best !== null) return best;
  if (node.miniboss && config.rooms.miniboss !== undefined) return config.rooms.miniboss;
  if (node.finalBoss && config.rooms.finalBoss !== undefined) return config.rooms.finalBoss;
  return config.default;
}

// Simulates ONE playthrough up to (and including) first arrival at
// targetId, or until the step cap / a genuine dead end. Mirrors the
// server-side simulateRandomPlaythrough's move-selection logic, plus the
// Child-choice branch this tool adds on top.
// mode: 'explore' (default) — occasional deliberate random backtrack, same
// curiosity-weighted wandering as the base engine. 'direct' — never
// deliberately backtrack; only retreat when a dead end or an oscillating
// pocket genuinely forces it. Gives a "thorough explorer" vs. "beeline
// player" pair of estimates for the same room.
function simulateToRoom(targetId, keepChildProb, seed, maxSteps, mode) {
  const nodesById = new Map(GRAPH.nodes.map((n) => [n.id, n]));
  const byFrom = new Map();
  for (const e of GRAPH.edges) { if (!byFrom.has(e.from)) byFrom.set(e.from, []); byFrom.get(e.from).push(e); }
  const { list: ftList, indexOf: ftIndex } = getFastTravelIndex(nodesById);

  const rng = mulberry32(seed);
  const backtrackChance = mode === 'direct' ? 0 : 0.12;
  let am = 0, fm = 0, ft = 0;
  let childChoice = null; // 'keep' | 'give' | null (not reached yet)

  function grant(n) {
    for (const a of n.grants) {
      if (n.id === GRAPH.childChoiceNodeId && a === 'void_tether') continue; // handled by the coin flip below
      am |= (1 << ALL_ABILITIES.indexOf(a));
    }
    for (const f of n.grantsFlags) fm |= (1 << GRAPH.allFlags.indexOf(f));
    if (ftIndex.has(n.id)) ft |= (1 << ftIndex.get(n.id));
    if (n.id === GRAPH.childChoiceNodeId && childChoice === null) {
      childChoice = rng() < keepChildProb ? 'keep' : 'give';
      if (childChoice === 'give') am |= (1 << ALL_ABILITIES.indexOf('void_tether'));
    }
  }

  const startId = GRAPH.startId;
  let cur = startId;
  grant(nodesById.get(startId));
  const visitCounts = new Map([[startId, 1]]);
  const history = [startId];
  let fracturePips = 0, lorePips = 0, cosmeticUpgrades = 0, maxHealth = 0, minibosses = 0;
  const tally = (n) => { fracturePips += n.fracturePips; lorePips += n.lorePips; cosmeticUpgrades += n.cosmeticUpgrades; maxHealth += n.maxHealth; if (n.miniboss) minibosses++; };
  tally(nodesById.get(startId));

  let stepsTaken = 0;
  for (let step = 0; step < maxSteps && cur !== targetId; step++) {
    stepsTaken = step + 1;
    const abilitiesSet = maskToSet(am, ALL_ABILITIES);
    const flagsSet = maskToSet(fm, GRAPH.allFlags);
    const candidates = [];
    for (const e of byFrom.get(cur) || []) {
      if (!requirementSatisfied(e, abilitiesSet, flagsSet)) continue;
      const targetNode = nodesById.get(e.to);
      if (!requirementSatisfied(targetNode, abilitiesSet, flagsSet)) continue;
      if (targetNode.requiresFracturePips && fracturePips < targetNode.requiresFracturePips) continue;
      if (targetNode.requiresLorePips && lorePips < targetNode.requiresLorePips) continue;
      candidates.push({ to: e.to, edge: e });
    }
    if (flagsSet.has('fast_travel_unlocked') && ftIndex.has(cur)) {
      for (const otherId of ftList) { if (otherId !== cur && (ft & (1 << ftIndex.get(otherId)))) candidates.push({ to: otherId, edge: null }); }
    }

    // Candidate selection (endgame rush, deliberate/dead-end/oscillation
    // backtracking, curiosity-weighted pick) is the shared engine — see
    // game/floorPlanWalkEngine.js's chooseNextMove.
    const choice = chooseNextMove({
      cur, candidates, byFrom, nodesById, visitCounts,
      abilitiesSet, flagsSet, history, rng, backtrackChance,
      endgameRush: GRAPH.endgameRush,
      getDifficultyMult: (n) => difficultyMultiplier(n) * (childChoice === 'keep' ? GRAPH.keepChildDifficultyMult : 1),
    });
    if (!choice) return { reached: false, stuck: 'dead-end', childChoice, fracturePips, lorePips, cosmeticUpgrades, maxHealth, minibosses, abilities: [...abilitiesSet], flags: [...flagsSet], steps: stepsTaken };

    cur = choice.to;
    visitCounts.set(cur, (visitCounts.get(cur) || 0) + 1);
    history.push(cur);
    const n = nodesById.get(cur);
    grant(n);
    if (visitCounts.get(cur) === 1) tally(n);
  }

  return { reached: cur === targetId, stuck: cur === targetId ? null : 'step-cap', childChoice, fracturePips, lorePips, cosmeticUpgrades, maxHealth, minibosses, abilities: [...maskToSet(am, ALL_ABILITIES)], flags: [...maskToSet(fm, GRAPH.allFlags)], steps: stepsTaken };
}

function tierFor(score) {
  if (score < 2) return { tier: 1, label: 'Early game', hp: 1.0, dmg: 1.0 };
  if (score < 4) return { tier: 2, label: 'Early-mid game', hp: 1.3, dmg: 1.15 };
  if (score < 6) return { tier: 3, label: 'Mid game', hp: 1.7, dmg: 1.3 };
  if (score < 8) return { tier: 4, label: 'Late-mid game', hp: 2.2, dmg: 1.5 };
  return { tier: 5, label: 'Late / end game', hp: 2.8, dmg: 1.75 };
}

function renderBranch(container, label, runs) {
  const box = document.createElement('div');
  if (!runs.length) { box.innerHTML = '<p class="branch-h">' + label + '</p><p class="note">No runs took this branch.</p>'; container.appendChild(box); return; }
  const avg = (key) => (runs.reduce((s, r) => s + r[key], 0) / runs.length);
  const range = (key) => { const vals = runs.map((r) => r[key]); return [Math.min(...vals), Math.max(...vals)]; };
  const abilityPct = {};
  for (const a of ALL_ABILITIES) abilityPct[a] = Math.round(100 * runs.filter((r) => r.abilities.includes(a)).length / runs.length);
  const score = avg('fracturePips') * 0.5 + runs.reduce((s, r) => s + r.abilities.length, 0) / runs.length * 1.0 + avg('maxHealth') * 0.75;
  const tier = tierFor(score);

  const h = document.createElement('p'); h.className = 'branch-h'; h.textContent = label + ' (' + runs.length + ' runs)'; box.appendChild(h);
  const stats = document.createElement('div'); stats.className = 'stats';
  // Averages hide swings that matter more than the mean for a small sample
  // (e.g. "1.8 avg cosmetic upgrades" could mean everyone got ~2, or half
  // got 0 and half got 4) — show the observed min–max range under each.
  const mk = (key, l) => {
    const [lo, hi] = range(key);
    const d = document.createElement('div'); d.className = 'stat';
    d.innerHTML = '<div class="n">' + avg(key).toFixed(1) + '</div><div class="l">' + l + '</div><div class="range">range ' + lo + '–' + hi + '</div>';
    return d;
  };
  stats.appendChild(mk('fracturePips', 'avg Fracture Pips'));
  stats.appendChild(mk('lorePips', 'avg Lore Pips'));
  stats.appendChild(mk('cosmeticUpgrades', 'avg cosmetic upgrades'));
  stats.appendChild(mk('maxHealth', 'avg max health ups'));
  stats.appendChild(mk('minibosses', 'avg minibosses beaten'));
  stats.appendChild(mk('steps', 'avg rooms visited'));
  box.appendChild(stats);

  const abilRow = document.createElement('div'); abilRow.className = 'ability-row';
  for (const a of ALL_ABILITIES) {
    const p = document.createElement('span'); p.className = 'pill';
    p.innerHTML = ABILITY_LABELS[a] + '<span class="pct">' + abilityPct[a] + '%</span>';
    abilRow.appendChild(p);
  }
  box.appendChild(abilRow);

  const tierBox = document.createElement('div'); tierBox.style.marginTop = '10px';
  tierBox.innerHTML = '<div class="tier">Tier ' + tier.tier + ' — ' + tier.label + '</div>' +
    '<div class="tier-desc">Rough suggestion: enemy HP &times;' + tier.hp.toFixed(2) + ', damage &times;' + tier.dmg.toFixed(2) +
    ' relative to a Tier-1 baseline enemy. Derived from a simple power score (abilities held &times;1.0 + avg Fracture Pips &times;0.5 + avg max health ups &times;0.75) — a heuristic to sanity-check room design against, not a formula to build blindly from. Always tune by playtest.</div>';
  box.appendChild(tierBox);
  container.appendChild(box);
}

document.getElementById('runBtn').addEventListener('click', () => {
  const targetId = roomSelect.value;
  if (!GRAPH.nodes.find((n) => n.id === targetId)) {
    document.getElementById('results').innerHTML = '<div class="panel">No room selected (or the selection is stale — reload and pick a room again).</div>';
    return;
  }
  const runsN = Math.max(1, parseInt(document.getElementById('runsInput').value, 10) || 200);
  const keepChildProb = parseInt(keepProbInput.value, 10) / 100;
  const mode = document.getElementById('modeSelect').value;
  const results = [];
  const baseSeed = Date.now() & 0xffffffff;
  for (let i = 0; i < runsN; i++) results.push(simulateToRoom(targetId, keepChildProb, baseSeed + i, 500, mode));

  const el = document.getElementById('results');
  el.innerHTML = '';
  const reached = results.filter((r) => r.reached);
  const failed = results.filter((r) => !r.reached);

  const summary = document.createElement('div'); summary.className = 'panel';
  const roomLabel = (ALL_ROOMS.find((r) => r.id === targetId) || {}).label || targetId;
  summary.innerHTML = '<h2>' + roomLabel + '</h2><div class="sub" style="margin-bottom:0">' + (mode === 'direct' ? 'Direct walk (only backtracks when stuck)' : 'Thorough explorer walk') + ' — ' + runsN + ' runs</div>';
  const overallStats = document.createElement('div'); overallStats.className = 'stats';
  const mk2 = (n, l) => { const d = document.createElement('div'); d.className = 'stat'; d.innerHTML = '<div class="n">' + n + '</div><div class="l">' + l + '</div>'; return d; };
  overallStats.appendChild(mk2(Math.round(100 * reached.length / results.length) + '%', 'runs reached this room'));
  overallStats.appendChild(mk2(reached.filter((r) => r.childChoice === 'keep').length, 'reached via keep-the-Child'));
  overallStats.appendChild(mk2(reached.filter((r) => r.childChoice === 'give').length, 'reached via Void Tether'));
  overallStats.appendChild(mk2(reached.filter((r) => r.childChoice === null).length, 'reached before the choice'));
  summary.appendChild(overallStats);
  if (failed.length) summary.appendChild(Object.assign(document.createElement('div'), { className: 'fail-note', textContent: failed.length + ' run(s) never reached this room (step cap or dead end) — excluded from the averages below.' }));

  // Gate-check: what does this room itself actually require to enter, and
  // what % of the runs that reached it were holding that ability/flag?
  // Should read ~100% by construction (you can't be here otherwise) — a
  // sanity check that the graph's stated requirement matches what the
  // engine is actually enforcing, not a difficulty signal on its own.
  const targetNode = GRAPH.nodes.find((n) => n.id === targetId);
  const gateReqs = [];
  for (const a of targetNode.requires || []) gateReqs.push({ type: 'ability', id: a, label: ABILITY_LABELS[a] || a });
  for (const f of targetNode.requiresFlags || []) gateReqs.push({ type: 'flag', id: f, label: f });
  if (targetNode.requiresOr && targetNode.requiresOr.length) {
    targetNode.requiresOr.forEach((group, i) => gateReqs.push({ type: 'or', id: group, label: 'any of: ' + group.map((a) => ABILITY_LABELS[a] || a).join(', ') }));
  }
  if (targetNode.requiresFracturePips) gateReqs.push({ type: 'fracturePips', id: targetNode.requiresFracturePips, label: targetNode.requiresFracturePips + '+ Fracture Pips' });
  if (targetNode.requiresLorePips) gateReqs.push({ type: 'lorePips', id: targetNode.requiresLorePips, label: targetNode.requiresLorePips + '+ Lore Pips' });
  const holdsReq = (r, req) => {
    if (req.type === 'ability') return r.abilities.includes(req.id);
    if (req.type === 'flag') return r.flags.includes(req.id);
    if (req.type === 'fracturePips') return r.fracturePips >= req.id;
    if (req.type === 'lorePips') return r.lorePips >= req.id;
    return req.id.every((a) => r.abilities.includes(a));
  };
  if (gateReqs.length && reached.length) {
    const gateP = document.createElement('p'); gateP.className = 'branch-h'; gateP.textContent = 'This room requires';
    summary.appendChild(gateP);
    const gateRow = document.createElement('div'); gateRow.className = 'gate-check';
    for (const req of gateReqs) {
      const holding = reached.filter((r) => holdsReq(r, req)).length;
      const pct = Math.round(100 * holding / reached.length);
      const pill = document.createElement('span'); pill.className = 'pill ' + (pct === 100 ? 'ok' : 'warn');
      pill.innerHTML = req.label + '<span class="pct">' + pct + '%</span>';
      gateRow.appendChild(pill);
    }
    summary.appendChild(gateRow);
    if (gateReqs.some((req) => reached.filter((r) => holdsReq(r, req)).length !== reached.length)) {
      summary.appendChild(Object.assign(document.createElement('div'), { className: 'fail-note', textContent: 'A requirement below is under 100% among runs that reached this room — that means the requirement is not actually being enforced on this room/edge, or fast travel let a run in sideways. Worth checking the graph.' }));
    }
  } else if (reached.length) {
    const gateP = document.createElement('p'); gateP.className = 'note'; gateP.textContent = 'This room has no ability/flag requirement of its own — anything gating it is upstream (an earlier room/edge on the only path in).';
    summary.appendChild(gateP);
  }
  el.appendChild(summary);

  // Show every group that actually has runs in it, not either/or — a room
  // reachable both before AND after the choice (or via both choice
  // outcomes) should show all applicable columns side by side, since a
  // real player could arrive via any of them.
  const cols = document.createElement('div'); cols.className = 'split-cols';
  const allBox = document.createElement('div'); allBox.className = 'panel';
  renderBranch(allBox, 'All runs that reached it', reached);
  cols.appendChild(allBox);

  const groups = [
    ['Reached before the Child choice', reached.filter((r) => r.childChoice === null)],
    ['Kept the Child', reached.filter((r) => r.childChoice === 'keep')],
    ['Gave up the Child (Void Tether)', reached.filter((r) => r.childChoice === 'give')],
  ];
  for (const [label, runs] of groups) {
    if (!runs.length) continue;
    const box = document.createElement('div'); box.className = 'panel';
    renderBranch(box, label, runs);
    cols.appendChild(box);
  }
  el.appendChild(cols);
});

roomSelect.value = ALL_ROOMS.find((r) => /final boss/i.test(r.label)) ? ALL_ROOMS.find((r) => /final boss/i.test(r.label)).id : ALL_ROOMS[0].id;
</script>`;
}

function main() {
  const args = process.argv.slice(2);
  const text = fs.readFileSync(MD_PATH, 'utf8');
  const graph = buildGraph(extractMermaidBlock(text));
  const startId = findStart(graph.nodes);
  const difficultyConfig = loadDifficultyConfig();

  const html = buildDifficultyCalculatorHtml(graph, startId, difficultyConfig);
  const htmlIdx = args.indexOf('--html');
  const outArg = htmlIdx !== -1 && args[htmlIdx + 1] && !args[htmlIdx + 1].startsWith('--') ? args[htmlIdx + 1] : null;
  const outPath = outArg ? path.resolve(outArg) : path.join(PLANS_DIR, '..', 'editor', 'room_difficulty_calculator.html');
  const fullDoc = `<!doctype html>\n<html><head><meta charset="utf-8"><title>Stillpoint — Room Difficulty Calculator</title></head><body>\n${html}\n</body></html>\n`;
  fs.writeFileSync(outPath, fullDoc);
  console.log(`Wrote room difficulty calculator to: ${path.relative(process.cwd(), outPath)}`);
}

main();
