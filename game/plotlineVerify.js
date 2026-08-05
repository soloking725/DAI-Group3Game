// Plotline / story-flag static analyzer — Plans/plotline_editor_plan.md §1
// (+ the "cycle detection", "dead-flag audit", "debug tool integration" gaps
// resolved in that plan's review section). One canonical implementation, the
// same "linter over hand-authored" philosophy as game/roomVerify.js — the
// Flag Graph tab of editor/plotline_editor.html and (future) debug_v1.html
// both call PlotlineVerify.analyze() rather than each re-deriving the graph.
//
// Reads the four narrative data sources — CUTSCENES, QUESTS, NPC_DIALOGUE,
// VISIONS — as PLAIN DATA (never executes their `call`/`fn`), extracts every
// story-flag write and read, builds the directed dependency graph, and runs:
//   • DFS cycle detection      (a "need X to produce Y and Y to produce X"
//                               deadlock — the top structural bug class in
//                               branching narrative)
//   • dead-flag audit          (written, never read: wasted authoring)
//   • unwritten-flag audit      (read/required, never written: a real bug —
//                               something gates on state nothing ever sets)
//
// UMD-ish dual export (browser <script> global + Node require), same pattern
// as roomVerify.js / minibossRegistry.js, so a Node CLI could wrap it too.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.PlotlineVerify = api;
  if (typeof root !== 'undefined' && root && !root.PlotlineVerify) root.PlotlineVerify = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ── Flag extraction ─────────────────────────────────────────────────────
  // A "write" records (flag, nodeId). A "read" records (flag, nodeId). nodeId
  // is a stable human-readable source label used in issue reports and as the
  // graph's edge provenance.

  function walkCutsceneSteps(steps, nodeId, writes) {
    for (const step of (steps || [])) {
      if (!step || typeof step !== 'object') continue;
      if (step.type === 'setFlag' && step.flag) writes.push({ flag: step.flag, node: nodeId });
      if (step.type === 'choice') {
        walkCutsceneSteps(step.onA, nodeId, writes);
        walkCutsceneSteps(step.onB, nodeId, writes);
      }
    }
  }

  function walkVisionSteps(steps, nodeId, writes) {
    for (const step of (steps || [])) {
      if (step && step.type === 'setFlag' && step.flag) writes.push({ flag: step.flag, node: nodeId });
    }
  }

  // A `requires`/effect condition may reference a flag. Returns the flag name
  // it reads, or null. talkCount / companionState conditions read no flag.
  function requiresFlag(requires) {
    if (requires && typeof requires === 'object' && requires.flag) return requires.flag;
    return null;
  }
  function effectFlag(effect) {
    if (effect && typeof effect === 'object' && effect.setFlag) return effect.setFlag;
    return null;
  }

  function extract(sources) {
    const cutscenes = sources.cutscenes || {};
    const quests = sources.quests || {};
    const dialogue = sources.dialogue || {};
    const visions = sources.visions || {};

    const writes = []; // { flag, node }
    const reads = [];  // { flag, node }
    // A "gate" pairs a required flag with a flag the same node produces — the
    // raw material for the dependency graph / cycle check.
    const gates = [];  // { need: flag, produce: flag, node }

    for (const key in cutscenes) {
      walkCutsceneSteps(cutscenes[key].steps, 'cutscene:' + key, writes);
    }

    for (const key in visions) {
      walkVisionSteps(visions[key].steps, 'vision:' + key, writes);
    }

    for (const qid in quests) {
      const q = quests[qid];
      for (const stage of (q.stages || [])) {
        const node = 'quest:' + qid + '/' + (stage.id || '?');
        const need = requiresFlag(stage.requires);
        const produce = effectFlag(stage.onEnter);
        if (need) reads.push({ flag: need, node });
        if (produce) writes.push({ flag: produce, node });
        if (need && produce) gates.push({ need, produce, node });
      }
    }

    for (const npcId in dialogue) {
      const entries = dialogue[npcId] || [];
      entries.forEach((entry, i) => {
        const node = 'dialogue:' + npcId + '#' + (entry.id || i);
        const need = requiresFlag(entry.requires);
        const produce = effectFlag(entry.onComplete);
        if (need) reads.push({ flag: need, node });
        if (produce) writes.push({ flag: produce, node });
        if (need && produce) gates.push({ need, produce, node });
      });
    }

    return { writes, reads, gates };
  }

  // ── Graph assembly ──────────────────────────────────────────────────────
  function buildFlags(writes, reads) {
    const flags = {};
    const ensure = (name) => (flags[name] || (flags[name] = { name, writers: [], readers: [] }));
    for (const w of writes) if (!ensure(w.flag).writers.includes(w.node)) flags[w.flag].writers.push(w.node);
    for (const r of reads) if (!ensure(r.flag).readers.includes(r.node)) flags[r.flag].readers.push(r.node);
    return flags;
  }

  // ── DFS cycle detection over the gate-derived flag dependency graph ───────
  // Edge need → produce ("to produce `produce` you must first hold `need`").
  // Standard white/gray/black three-colour marking; records one representative
  // node cycle per back-edge found.
  function findCycles(gates) {
    const adj = {};
    for (const g of gates) (adj[g.need] || (adj[g.need] = [])).push(g.produce);
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = {};
    const stack = [];
    const cycles = [];
    const seen = new Set();

    function dfs(u) {
      color[u] = GRAY;
      stack.push(u);
      for (const v of (adj[u] || [])) {
        if (color[v] === GRAY) {
          // back-edge → cycle from v..u then back to v
          const from = stack.indexOf(v);
          const cyc = stack.slice(from).concat(v);
          const sig = cyc.slice().sort().join('|');
          if (!seen.has(sig)) { seen.add(sig); cycles.push(cyc); }
        } else if (color[v] !== BLACK && color[v] !== GRAY) {
          dfs(v);
        }
      }
      stack.pop();
      color[u] = BLACK;
    }
    for (const u in adj) if (color[u] !== BLACK) dfs(u);
    return cycles;
  }

  // ── Public: full analysis ────────────────────────────────────────────────
  function analyze(sources) {
    const { writes, reads, gates } = extract(sources || {});
    const flags = buildFlags(writes, reads);
    const cycles = findCycles(gates);

    const issues = [];
    for (const cyc of cycles) {
      issues.push({
        severity: 'error', type: 'FLAG_CYCLE',
        flags: cyc,
        detail: 'Dependency cycle (softlock): ' + cyc.join(' → '),
      });
    }
    for (const name in flags) {
      const f = flags[name];
      if (f.writers.length && !f.readers.length) {
        // Cutscenes read flags in game code, not in data — so a cutscene-only
        // writer with no data reader is expected, not necessarily dead. Only
        // downgrade; don't hide it.
        const onlyCutsceneWriters = f.writers.every((w) => w.startsWith('cutscene:'));
        issues.push({
          severity: onlyCutsceneWriters ? 'info' : 'warn', type: 'DEAD_FLAG',
          flags: [name],
          detail: onlyCutsceneWriters
            ? `"${name}" is written (${f.writers.join(', ')}) but read only in game code, if at all — verify a reader exists.`
            : `"${name}" is written (${f.writers.join(', ')}) but never read by any quest/dialogue gate — likely wasted authoring.`,
        });
      }
      if (f.readers.length && !f.writers.length) {
        issues.push({
          severity: 'error', type: 'UNWRITTEN_FLAG',
          flags: [name],
          detail: `"${name}" is required by ${f.readers.join(', ')} but never set by any cutscene/quest/dialogue/vision — that gate can never open.`,
        });
      }
    }

    return {
      flags,                       // { name: {name, writers[], readers[]} }
      edges: gates.map((g) => ({ from: g.need, to: g.produce, via: g.node })),
      cycles,
      issues,                      // typed list, same shape family as roomVerify
      counts: {
        flags: Object.keys(flags).length,
        writes: writes.length,
        reads: reads.length,
        errors: issues.filter((i) => i.severity === 'error').length,
        warnings: issues.filter((i) => i.severity === 'warn').length,
      },
    };
  }

  // Convenience wrapper for debug_v1.html-style callers: returns just the
  // issue list (empty === clean), same call ergonomics as RoomVerify.verifyRoom.
  function verify(sources) { return analyze(sources).issues; }

  return { analyze, verify };
});
