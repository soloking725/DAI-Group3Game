// Runtime debugger overlay (2026-08-02). Zero-cost in normal play — only
// activates behind `?debug=1` (same URL-flag convention as
// game_boot_save.js's `?spawnRoom=`). Built on the live `window.player`/
// `window.gameState`/etc getters in game_state.js, and hooks the fixed-
// timestep loop in game_draw_loop.js for pause/step + a frame-time profiler,
// operationalizing the "profile before optimizing" rule in
// Plans/performanceInstructions.md instead of leaving it as a manual
// DevTools step.
//
// Public API (window.RuntimeDebugger):
//   enabled            - true if ?debug=1 was present
//   shouldRunUpdate()  - called once per tick by gameLoop; false = skip update()
//   step()             - advance exactly one tick while paused
//   onTickTimed(ms)    - record one update()'s duration (called by gameLoop)
//   onDrawTimed(ms)    - record one draw()'s duration (called by gameLoop)
//   addWatch(label, fn)- register a value to show in the live watch panel
//   setBreak(label, fn)- register a condition; game auto-pauses the instant
//                        fn() returns true (checked once per tick)
(function () {
  const enabled = typeof location !== 'undefined'
    && new URLSearchParams(location.search).get('debug') === '1';

  window.RuntimeDebugger = { enabled };
  if (!enabled) return;

  let paused = false;
  let stepOnce = false;
  const FRAME_HISTORY = 120;
  const updateTimes = [];
  const drawTimes = [];
  const watches = []; // { label, fn }
  const breakpoints = []; // { label, fn }

  function pushTiming(arr, ms) {
    arr.push(ms);
    if (arr.length > FRAME_HISTORY) arr.shift();
  }
  function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
  function max(arr) { return arr.length ? Math.max(...arr) : 0; }

  window.RuntimeDebugger.shouldRunUpdate = function () {
    for (const bp of breakpoints) {
      try { if (bp.fn()) { paused = true; log(`Auto-paused: ${bp.label}`); } } catch (e) { /* bad watch expr — ignore this tick */ }
    }
    if (!paused) return true;
    if (stepOnce) { stepOnce = false; return true; }
    return false;
  };
  window.RuntimeDebugger.step = function () { stepOnce = true; };
  window.RuntimeDebugger.togglePause = function () { paused = !paused; };
  window.RuntimeDebugger.onTickTimed = function (ms) { pushTiming(updateTimes, ms); };
  window.RuntimeDebugger.onDrawTimed = function (ms) { pushTiming(drawTimes, ms); };
  window.RuntimeDebugger.addWatch = function (label, fn) { watches.push({ label, fn }); };
  window.RuntimeDebugger.setBreak = function (label, fn) { breakpoints.push({ label, fn }); };

  function log(msg) {
    if (typeof DevContext !== 'undefined') DevContext.log('Runtime Debugger', msg, '');
    console.log('[debugger] ' + msg);
  }

  // Built-in watches over the live getters game_state.js exposes.
  window.RuntimeDebugger.addWatch('gameState', () => window.gameState);
  window.RuntimeDebugger.addWatch('currentAreaId', () => window.currentAreaId);
  window.RuntimeDebugger.addWatch('player.health', () => window.player ? window.player.health : '—');
  window.RuntimeDebugger.addWatch('enemies', () => (window.currentEnemies || []).length);
  window.RuntimeDebugger.addWatch('projectiles', () => (window.projectiles || []).length);
  window.RuntimeDebugger.addWatch('particles', () => (window.particles || []).length);
  window.RuntimeDebugger.addWatch('frameCount', () => window.frameCount);

  // ── Overlay UI ────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;top:8px;right:8px;z-index:99999;'
    + 'font:11px/1.4 monospace;background:rgba(10,10,15,0.88);color:#ddd;'
    + 'border:1px solid #444;border-radius:6px;padding:8px 10px;min-width:190px;'
    + 'pointer-events:auto;white-space:pre;';
  document.body.appendChild(panel);

  const controls = document.createElement('div');
  controls.style.cssText = 'margin-bottom:6px;display:flex;gap:6px;';
  const pauseBtn = document.createElement('button');
  const stepBtn = document.createElement('button');
  [pauseBtn, stepBtn].forEach((b) => {
    b.style.cssText = 'font:11px monospace;background:#222;color:#ddd;border:1px solid #555;border-radius:3px;cursor:pointer;padding:2px 6px;';
  });
  pauseBtn.textContent = 'Pause';
  pauseBtn.onclick = () => { window.RuntimeDebugger.togglePause(); };
  stepBtn.textContent = 'Step';
  stepBtn.onclick = () => { window.RuntimeDebugger.step(); };
  controls.appendChild(pauseBtn);
  controls.appendChild(stepBtn);
  panel.appendChild(controls);

  const body = document.createElement('div');
  panel.appendChild(body);

  function render() {
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    pauseBtn.style.borderColor = paused ? '#c66' : '#555';
    const updMs = avg(updateTimes), drawMs = avg(drawTimes);
    const lines = [
      `update: ${updMs.toFixed(2)}ms avg / ${max(updateTimes).toFixed(2)}ms max`,
      `draw:   ${drawMs.toFixed(2)}ms avg / ${max(drawTimes).toFixed(2)}ms max`,
      `frame:  ${(updMs + drawMs).toFixed(2)}ms  (~${(1000 / Math.max(0.01, updMs + drawMs)).toFixed(0)} fps ceiling)`,
      '',
    ];
    for (const w of watches) {
      let v;
      try { v = w.fn(); } catch (e) { v = 'err'; }
      lines.push(`${w.label}: ${v}`);
    }
    body.textContent = lines.join('\n');
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  Object.defineProperty(window.RuntimeDebugger, 'paused', { get: () => paused });

  log('Runtime debugger active (?debug=1). Pause/Step in the top-right panel; Ctrl+Shift+P toggles pause.');
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      window.RuntimeDebugger.togglePause();
    }
  });
})();
