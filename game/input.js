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
  // Phase Dash and Dash share this one binding as of 2026-07-16 (user
  // feedback: "too many buttons") — see player.js's merged trigger. Phase
  // Dash fires automatically whenever it's unlocked and off cooldown;
  // otherwise this gives a normal Dash. KeyF is free again (no longer bound
  // to anything) since the separate phaseDash action was retired.
  dash:          'KeyC',
  shardShot:     'KeyV',
  stillpoint:    'KeyQ',
  gravitonSurge: 'KeyE',
  voidTether:    'KeyR',
  callChild:     'KeyF', // companion.js — call the Child to you (KeyF freed 2026-07-16 when phaseDash merged into dash)
  map:           'Tab',
  pause:         'Escape',
  fullscreen:    'Backquote',
  inventory:     'KeyI',
};

const ACTION_LABELS = {
  moveLeft: 'Move Left',
  moveRight: 'Move Right',
  aimUp: 'Aim / Move Up',
  aimDown: 'Aim / Move Down',
  jump: 'Jump',
  attack: 'Attack',
  dash: 'Dash / Phase Dash',
  shardShot: 'Shard Shot (hold)',
  stillpoint: 'Stillpoint',
  gravitonSurge: 'Graviton Surge',
  voidTether: 'Void Tether',
  callChild: 'Call the Child',
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

// Every dev tool (enemy_test.html, difficulty_bot.html, etc.) loads this
// file alongside real form controls in its own sidebar — number inputs for
// roster counts, population size, and so on. This listener used to call
// preventDefault() unconditionally on every keydown/keyup regardless of
// focus, which blocks a text field's own default behavior too (typing a
// digit, arrow-key cursor movement) since preventDefault cancels the
// default action for the whole dispatch, not just "the game's" interest in
// the key. A native number input's up/down SPIN arrows are a separate
// browser behavior from typing and weren't affected the same way, which is
// what made this read as "arrows work, typing doesn't" (user report
// 2026-07-24) rather than "nothing works." Skip entirely when focus is on
// an actual editable control — the game canvas is never a text field, so
// this never affects real gameplay input.
function isTypingIntoControl() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

window.addEventListener('keydown', (e) => {
  if (isTypingIntoControl()) return;
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
  if (isTypingIntoControl()) return;
  keys[e.code] = false;
  e.preventDefault();
});

// If the tab/window loses focus while a key is held (alt-tab, clicking
// outside the canvas, opening devtools), the browser never delivers a
// matching keyup — without this, `keys[code]` stays stuck true and the
// game keeps reading that key as held after refocus.
function clearAllKeys() {
  for (const code in keys) keys[code] = false;
}
window.addEventListener('blur', clearAllKeys);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearAllKeys();
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
