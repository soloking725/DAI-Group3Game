// Cutscene system (2026-07-16) — scripted, input-locked sequences.
//
// A cutscene is DATA (an entry in CUTSCENES below): an ordered list of
// steps the runner executes one at a time while gameState === 'cutscene'.
// The world keeps rendering (the current room, enemies frozen, particles
// alive) with letterbox bars + optional text on top — no separate "cutscene
// screen". Player input is locked for the duration except hold-to-skip.
//
// HOW TO ADD A CUTSCENE
//   1. Add an entry to CUTSCENES with a unique key and a steps[] list.
//   2. Call playCutscene('your_key') from wherever it should trigger
//      (a room transition, a pickup, a boss death — anywhere in game.js).
//   3. That's it — the runner handles letterbox, skipping, and restoring
//      gameState when the script ends.
//
// STEP TYPES (each step runs until it finishes, then the next starts):
//   { type: 'wait',    frames: 60 }
//       Hold for N frames.
//   { type: 'text',    text: 'line to show', frames: 150 }
//       Show a dialogue/narration line at the bottom of the screen for N
//       frames (or until skipped). Multiple text steps = multiple lines.
//   { type: 'cameraPan', x: 800, y: 300, speed: 4 }
//       Glide the camera toward world point (x, y). Finishes on arrival.
//       The camera stays where panned until the next pan or 'cameraReturn'.
//   { type: 'cameraReturn', speed: 5 }
//       Glide the camera back to its normal follow position.
//   { type: 'movePlayer', x: 600, speed: 2 }
//       Walk the player horizontally to world x (auto-faces the direction,
//       no physics — intended for flat ground in authored scenes).
//   { type: 'setFlag',  flag: 'child_choice_resolved', value: true }
//       Set a global story flag (storyFlags[flag] = value). Instant.
//   { type: 'call',    fn: () => { ... } }
//       Run arbitrary code (spawn something, switch area, grant an
//       ability). Instant. Keep these small — big logic belongs in game.js.
//
// SKIPPING: holding the attack key for SKIP_HOLD_FRAMES skips the whole
// scene — every remaining setFlag/call step still executes (skipping must
// never eat a story flag or a grant), everything else is dropped.

// ── Story flags ─────────────────────────────────────────────────────────────
// Global narrative switches set by cutscenes ('setFlag') and read by
// anything that gates on story progress. Persisted via save/load (game.js).
let storyFlags = {};

const CUTSCENE_LETTERBOX_H = 60;   // px height of each cinematic bar
const SKIP_HOLD_FRAMES = 45;       // ~0.75s of holding attack to skip

// ── The scripts ─────────────────────────────────────────────────────────────
const CUTSCENES = {
  // Sample/reference scene — plays the first time the player enters Echo
  // Bridge part 1 (wired in game.js's switchArea pickup block; also
  // playable from anywhere via playCutscene('echo_bridge_intro')). Doubles
  // as the template to copy for the real Child-meeting scene later.
  echo_bridge_intro: {
    steps: [
      { type: 'wait', frames: 30 },
      { type: 'text', text: 'The bridge hums with a frequency you almost remember.', frames: 150 },
      { type: 'cameraPan', x: 900, y: 300, speed: 4 },
      { type: 'text', text: 'Something small moves between the pillars ahead.', frames: 150 },
      { type: 'cameraReturn', speed: 5 },
      { type: 'setFlag', flag: 'echo_bridge_intro_seen', value: true },
    ],
  },
};

// ── Runner state ────────────────────────────────────────────────────────────
const cutsceneState = {
  active: null,      // the CUTSCENES entry being played, or null
  id: null,
  stepIndex: 0,
  stepTimer: 0,      // frames elapsed inside the current step
  returnState: 'playing',
  skipHold: 0,       // frames the skip key has been held
  camOverride: null, // {x, y} camera target while panned away, null = follow player
  barSlide: 0,       // 0→1 letterbox slide-in animation
};

function playCutscene(id) {
  const scene = CUTSCENES[id];
  if (!scene) { console.warn(`[cutscene] no cutscene named "${id}"`); return; }
  cutsceneState.active = scene;
  cutsceneState.id = id;
  cutsceneState.stepIndex = 0;
  cutsceneState.stepTimer = 0;
  cutsceneState.returnState = gameState === 'cutscene' ? cutsceneState.returnState : gameState;
  cutsceneState.skipHold = 0;
  cutsceneState.camOverride = null;
  cutsceneState.barSlide = 0;
  gameState = 'cutscene';
}

function endCutscene(skipped) {
  // Flags and calls must fire even on skip — a skipped scene that forgot to
  // set child_choice_resolved would be a progression bug, not a shortcut.
  if (skipped && cutsceneState.active) {
    const steps = cutsceneState.active.steps;
    for (let i = cutsceneState.stepIndex; i < steps.length; i++) {
      const s = steps[i];
      if (s.type === 'setFlag') storyFlags[s.flag] = s.value;
      if (s.type === 'call' && typeof s.fn === 'function') s.fn();
    }
  }
  cutsceneState.active = null;
  cutsceneState.id = null;
  cutsceneState.camOverride = null;
  gameState = cutsceneState.returnState || 'playing';
}

// Called once per frame from game.js's update loop while gameState === 'cutscene'.
function updateCutscene() {
  const cs = cutsceneState;
  if (!cs.active) { gameState = 'playing'; return; }

  // Letterbox slide-in
  if (cs.barSlide < 1) cs.barSlide = Math.min(1, cs.barSlide + 0.08);

  // Hold-attack-to-skip
  if (isActionPressed('attack')) {
    cs.skipHold++;
    if (cs.skipHold >= SKIP_HOLD_FRAMES) { endCutscene(true); return; }
  } else {
    cs.skipHold = 0;
  }

  const step = cs.active.steps[cs.stepIndex];
  if (!step) { endCutscene(false); return; }
  cs.stepTimer++;

  let done = false;
  switch (step.type) {
    case 'wait':
      done = cs.stepTimer >= (step.frames || 60);
      break;

    case 'text':
      // Rendering happens in drawCutsceneOverlay; this just times the line.
      done = cs.stepTimer >= (step.frames || 150);
      break;

    case 'cameraPan': {
      const speed = step.speed || 4;
      const targetX = step.x - W / 2, targetY = step.y - H / 2;
      cs.camOverride = cs.camOverride || { x: camera.x, y: camera.y };
      const dx = targetX - cs.camOverride.x, dy = targetY - cs.camOverride.y;
      const d = Math.hypot(dx, dy);
      if (d <= speed) { cs.camOverride.x = targetX; cs.camOverride.y = targetY; done = true; }
      else { cs.camOverride.x += (dx / d) * speed; cs.camOverride.y += (dy / d) * speed; }
      camera.x = cs.camOverride.x; camera.y = cs.camOverride.y;
      break;
    }

    case 'cameraReturn': {
      if (!cs.camOverride) { done = true; break; }
      const speed = step.speed || 5;
      const targetX = player.x + player.width / 2 - W / 2;
      const targetY = player.y + player.height / 2 - H / 2;
      const dx = targetX - cs.camOverride.x, dy = targetY - cs.camOverride.y;
      const d = Math.hypot(dx, dy);
      if (d <= speed) { cs.camOverride = null; done = true; }
      else {
        cs.camOverride.x += (dx / d) * speed; cs.camOverride.y += (dy / d) * speed;
        camera.x = cs.camOverride.x; camera.y = cs.camOverride.y;
      }
      break;
    }

    case 'movePlayer': {
      const speed = step.speed || 2;
      const dx = step.x - player.x;
      if (Math.abs(dx) <= speed) { player.x = step.x; player.vx = 0; done = true; }
      else {
        player.facing = dx > 0 ? 1 : -1;
        player.x += Math.sign(dx) * speed;
      }
      break;
    }

    case 'setFlag':
      storyFlags[step.flag] = step.value;
      done = true;
      break;

    case 'call':
      if (typeof step.fn === 'function') step.fn();
      done = true;
      break;

    default:
      console.warn(`[cutscene] unknown step type "${step.type}" in "${cs.id}" — skipping`);
      done = true;
  }

  if (done) { cs.stepIndex++; cs.stepTimer = 0; }

  // Camera follows the player normally unless a pan owns it.
  if (!cs.camOverride) updateCamera(player, getCurrentArea());

  // Keep ambient particles alive so the world doesn't freeze dead.
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
}

// Called from game.js's draw() after the world renders, while in a cutscene.
// Screen-space (after camera transform is popped).
function drawCutsceneOverlay(ctx) {
  const cs = cutsceneState;
  if (!cs.active) return;

  // Letterbox bars
  const barH = CUTSCENE_LETTERBOX_H * cs.barSlide;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, barH);
  ctx.fillRect(0, H - barH, W, barH);

  // Current text line (if the active step is a text step)
  const step = cs.active.steps[cs.stepIndex];
  if (step && step.type === 'text') {
    const fadeIn = Math.min(1, cs.stepTimer / 20);
    const total = step.frames || 150;
    const fadeOut = Math.min(1, (total - cs.stepTimer) / 20);
    ctx.globalAlpha = Math.max(0, Math.min(fadeIn, fadeOut));
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(step.text, W / 2, H - barH - 28);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // Skip prompt (bottom-right, brightens as the hold progresses)
  const holdFrac = cs.skipHold / SKIP_HOLD_FRAMES;
  ctx.globalAlpha = 0.4 + holdFrac * 0.6;
  ctx.fillStyle = holdFrac > 0 ? '#fbbf24' : '#64748b';
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(holdFrac > 0 ? `skipping… ${Math.round(holdFrac * 100)}%` : 'hold attack to skip', W - 16, H - 10);
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}

// Debug-tool access (same pattern as area.js's window.AREAS)
if (typeof window !== 'undefined') {
  window.CUTSCENES = CUTSCENES;
  window.playCutscene = playCutscene;
  window.storyFlags = storyFlags;
}
