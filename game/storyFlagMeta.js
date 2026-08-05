// Story-flag metadata sidecar — Plans/plotline_editor_plan.md §1.
// Descriptions/notes ONLY — never the flags themselves, which stay wherever
// they're actually set in game code (cutscene setFlag steps, quest onEnter,
// dialogue onComplete, etc). The flag graph is derived, not hand-authored;
// this file just lets a human annotate what a derived flag MEANS.
//
//   STORY_FLAG_META[flagName] = { description, addedBy }
//
// Authored in editor/plotline_editor.html's Flag Graph tab.
const STORY_FLAG_META = {
  child_choice_resolved:      { description: 'Player made the Echo Bridge companion-meeting choice.', addedBy: 'cutscene:echo_bridge_intro' },
  echo_bridge_intro_seen:     { description: 'Echo Bridge intro cutscene has played.', addedBy: 'cutscene:echo_bridge_intro' },
  child_fight_choice_resolved:{ description: "Player resolved the Child's first-fight assist choice.", addedBy: 'cutscene:child_first_fight_choice' },
  antechamber_ending:         { description: 'Antechamber / child-ending branch taken.', addedBy: 'cutscene:antechamber_child_ending' },
};

if (typeof window !== 'undefined') window.STORY_FLAG_META = STORY_FLAG_META;
if (typeof module !== 'undefined' && module.exports) module.exports = { STORY_FLAG_META };
