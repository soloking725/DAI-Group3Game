// Quest / side-objective data model — Plans/plotline_editor_plan.md §3.
// First-class multi-stage tracked arcs. Authored in
// editor/plotline_editor.html's Quests tab.
//
// Shape:
//   QUESTS[id] = {
//     id, npcId, region,
//     stages: [ { id, requires, onEnter } ]
//   }
// `requires` is one of:
//   null                              — no gate (usually the first stage)
//   'someStageId'                     — linear gate on a prior stage
//   { flag: 'x', value: true }        — gate on a story flag
//   { talkCount: { npcId, gte } }     — repeatable-conversation threshold
//   { companionState: 'active'|... }  — a companion-state field truthiness
// `onEnter` is a small effect (same vocabulary as CUTSCENES / VISIONS):
//   { setFlag: 'x', value: true }   and/or   { call: '() => {...}' }
//
// Bare top-level `const` per CLAUDE.md's IIFE-vs-bare convention (game code
// reads QUESTS directly). See plan §3 for the pacifist_ally_arc worked example
// and the companion-restriction / recruit hooks it reserves but does not build.
const QUESTS = {};

if (typeof window !== 'undefined') window.QUESTS = QUESTS;
if (typeof module !== 'undefined' && module.exports) module.exports = { QUESTS };
