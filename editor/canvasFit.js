// Shared "scale the game canvas to fill the space beside the sidebar"
// helper. ability_tester.html/companion_test.html/enemy_test.html/
// enemy_designer.html each boot a live game canvas next to a #side panel
// and used to hand-roll this identically. Assumes a #side element and the
// game's own globals canvas/W/H (logical pixel size, from game_state.js) —
// same assumption each of the 4 original copies already made. Callers still
// own their own `window.addEventListener('resize', fitCanvasToStage)` +
// initial `fitCanvasToStage()` call, since that's just wiring, not logic.
function fitCanvasToStage() {
  const sideWidth = document.getElementById('side').offsetWidth;
  const availW = window.innerWidth - sideWidth;
  const availH = window.innerHeight;
  const scale = Math.min(availW / W, availH / H);
  canvas.style.width = Math.floor(W * scale) + 'px';
  canvas.style.height = Math.floor(H * scale) + 'px';
}
