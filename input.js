// Input handling
const keys = {};
const justPressed = {};

// ── Remappable keybinds (roadmap: control menu remap, 2026-07-14) ──────────
// Every gameplay action is looked up by name through keyBindings, never by a
// hardcoded key code, so the whole game is remappable from one place. Add a
// new action here (with a label for the control menu) before wiring it into
// player.js/game.js — don't reach for isPressed('KeyX') directly in gameplay
// code, use isActionPressed('actionName') instead.
const DEFAULT_KEYBINDS = {
  moveLeft:      'ArrowLeft',
  moveRight:     'ArrowRight',
  aimUp:         'ArrowUp',    // also attack-direction / duck-release / shard-shot tilt
  aimDown:       'ArrowDown',  // also attack-direction / duck / shard-shot tilt
  jump:          'KeyZ',
  attack:        'KeyX',
  dash:          'KeyC',
  phaseDash:     'KeyF',
  shardShot:     'KeyV',
  stillpoint:    'KeyQ',
  gravitonSurge: 'KeyE',       // reserved — ability not implemented yet (expansion.md Phase 1)
  voidTether:    'KeyR',       // reserved — ability not implemented yet (story.md §4)
  map:           'Tab',
  pause:         'Escape',
  fullscreen:    'Backquote', // moved off KeyF 2026-07-14 — F is now Phase Dash
  inventory:     'KeyI',
};

const ACTION_LABELS = {
  moveLeft: 'Move Left',
  moveRight: 'Move Right',
  aimUp: 'Aim / Move Up',
  aimDown: 'Aim / Move Down',
  jump: 'Jump',
  attack: 'Attack / Parry',
  dash: 'Dash',
  phaseDash: 'Phase Dash',
  shardShot: 'Shard Shot (hold)',
  stillpoint: 'Stillpoint',
  gravitonSurge: 'Graviton Surge (not yet built)',
  voidTether: 'Void Tether (not yet built)',
  map: 'Map',
  pause: 'Pause',
  fullscreen: 'Toggle Fullscreen',
  inventory: 'Inventory',
};

const KEYBINDS_STORAGE_KEY = 'stillpoint_keybinds_v1';

function loadKeyBindings() {
  try {
    const raw = localStorage.getItem(KEYBINDS_STORAGE_KEY);
    if (raw) return Object.assign({}, DEFAULT_KEYBINDS, JSON.parse(raw));
  } catch (e) { /* private browsing / quota — fall back to defaults */ }
  return Object.assign({}, DEFAULT_KEYBINDS);
}

function saveKeyBindings() {
  try { localStorage.setItem(KEYBINDS_STORAGE_KEY, JSON.stringify(keyBindings)); }
  catch (e) { /* degrade to no-persistence, never crash */ }
}

let keyBindings = loadKeyBindings();

function getBinding(action) {
  return keyBindings[action];
}

// Returns the action name currently bound to `code`, if any (used by the
// control menu to warn about/clear conflicts when rebinding).
function actionForCode(code) {
  for (const action in keyBindings) {
    if (keyBindings[action] === code) return action;
  }
  return null;
}

function setBinding(action, code) {
  if (!(action in DEFAULT_KEYBINDS)) return;
  keyBindings[action] = code;
  saveKeyBindings();
}

function resetKeyBindings() {
  keyBindings = Object.assign({}, DEFAULT_KEYBINDS);
  saveKeyBindings();
}

// While set, the next keydown is captured as a rebind instead of being
// treated as gameplay input. Set via startRebind(action) from the control
// menu UI; cleared automatically once a key is captured (or on Escape,
// which cancels without changing the binding).
let rebindingAction = null;

function startRebind(action) {
  rebindingAction = action;
}

function cancelRebind() {
  rebindingAction = null;
}

window.addEventListener('keydown', (e) => {
  if (rebindingAction) {
    if (e.code !== 'Escape') {
      setBinding(rebindingAction, e.code);
    }
    rebindingAction = null;
    e.preventDefault();
    return;
  }
  if (!keys[e.code]) {
    justPressed[e.code] = true;
  }
  keys[e.code] = true;
  e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  e.preventDefault();
});

function clearJustPressed() {
  for (const key in justPressed) {
    justPressed[key] = false;
  }
}

function isPressed(code) {
  return keys[code] === true;
}

function wasJustPressed(code) {
  return justPressed[code] === true;
}

function isActionPressed(action) {
  return isPressed(keyBindings[action]);
}

function wasActionJustPressed(action) {
  return wasJustPressed(keyBindings[action]);
}
