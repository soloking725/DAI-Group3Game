// Input handling
const keys = {};
const justPressed = {};

window.addEventListener('keydown', (e) => {
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