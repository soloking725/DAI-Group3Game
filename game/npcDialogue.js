// NPC branching dialogue — Plans/plotline_editor_plan.md §4.
// Re-enterable, talk-count-gated conversations (the one genuinely new
// interaction primitive vs. cutscene.js's single race-to-tap choice).
// Authored in editor/plotline_editor.html's Dialogue tab.
//
// Shape:
//   NPC_DIALOGUE[npcId] = [
//     { id, requires, lines: [ '...', '...' ], onComplete }
//   ]
// Entries are ordered by match-priority: the FIRST entry whose `requires`
// passes plays, and playing it increments npcState[npcId].talkCount.
// `requires` reuses the exact condition shape as quest stages (see quests.js):
//   null | { flag, value } | { talkCount: { gte } } | { companionState }
//   (a bare talkCount.gte with no npcId means "this NPC's own count").
// `onComplete` reuses the effect shape: { setFlag, value } and/or { call }.
//
// npcState (the live counters) persists in save data alongside storyFlags —
// see the plan's §4 + save-migration notes for the required save/load/reset
// paths. This file is only the authored content, never the runtime counters.
//
// Bare top-level `const` per CLAUDE.md's IIFE-vs-bare convention.
const NPC_DIALOGUE = {};

if (typeof window !== 'undefined') window.NPC_DIALOGUE = NPC_DIALOGUE;
if (typeof module !== 'undefined' && module.exports) module.exports = { NPC_DIALOGUE };
