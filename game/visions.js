// Lore Visions — Plans/plotline_editor_plan.md §2.
// A deliberately smaller step vocabulary than CUTSCENES{}: wait / cameraPan /
// imageReveal / setFlag / call, no `choice` (visions are non-interactive by
// design). Authored in editor/plotline_editor.html's Visions tab.
//
// Bare top-level `const` (per CLAUDE.md's IIFE-vs-bare convention) because
// game_update.js reads VISIONS directly at pickup time; the window mirror is
// only so tools/debug pages can reach it the same way they reach CUTSCENES.
//
// Playback is gated behind LORE_ENABLED (game_state.js) — visions REPLACE the
// disabled text-lore-fragment popup and inherit its on/off semantics until a
// deliberate decision says otherwise (plan §"No interaction with LORE_ENABLED").
// Authoring/saving is never gated; only in-game playback is.
const VISIONS = {
  // Example shape (safe to delete once real content exists):
  // origin_first_vision: {
  //   steps: [
  //     { type: 'imageReveal', image: 'assets/art/visions/origin_1.png', fadeIn: 40, hold: 120, fadeOut: 40 },
  //     { type: 'cameraPan', x: 400, y: 200, speed: 3 },
  //     { type: 'setFlag', flag: 'origin_vision_seen', value: true },
  //   ],
  // },
};

if (typeof window !== 'undefined') window.VISIONS = VISIONS;
if (typeof module !== 'undefined' && module.exports) module.exports = { VISIONS };
