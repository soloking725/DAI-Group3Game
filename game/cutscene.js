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
//   { type: 'choice',  actionA: 'moveLeft', actionB: 'moveRight',
//     promptA: 'Leave', promptB: 'Save her', taps: 8, window: 90,
//     onTimeout: 'A', onA: [...steps], onB: [...steps] }
//       story.md's rapid-tap-repeat choice prompt: mash actionA vs actionB,
//       first to `taps` presses within `window` frames wins. Neither side
//       reaching the threshold in time resolves to `onTimeout` ('A' or
//       'B'). The winning branch's steps are spliced into the running
//       script in place of the choice step, so setFlag/call steps inside
//       onA/onB are ordinary steps once a winner is picked — including for
//       skip-sweep purposes (see endCutscene below).
//
// SKIPPING: holding the attack key for SKIP_HOLD_FRAMES skips the whole
// scene — every remaining setFlag/call step still executes (skipping must
// never eat a story flag or a grant), everything else is dropped. If the
// skip lands mid-choice, the choice resolves via onTimeout first (so its
// branch's own setFlag/call steps are in the flat list the sweep walks),
// then the sweep runs as usual.

// ── Story flags ─────────────────────────────────────────────────────────────
// Global narrative switches set by cutscenes ('setFlag') and read by
// anything that gates on story progress. Persisted via save/load (game.js).
let storyFlags = {};

const CUTSCENE_LETTERBOX_H = 60;   // px height of each cinematic bar
const SKIP_HOLD_FRAMES = 45;       // ~0.75s of holding attack to skip

// ── The scripts ─────────────────────────────────────────────────────────────
const CUTSCENES = {
  // Plays the first time the player enters Echo Bridge part 1 (wired in
  // game.js's switchArea pickup block). Ends in story.md §2's rapid-tap
  // meeting-the-child choice: mash moveLeft to walk away (she plays a sad
  // reaction, meant to make the choice feel costly) vs. mash moveRight to
  // go to her and keep her (companionState.active = true — game.js's own
  // per-frame block then lazily spawns the real Child).
  echo_bridge_intro: {
    steps: [
      { type: 'wait', frames: 30 },
      { type: 'text', text: 'The bridge hums with a frequency you almost remember.', frames: 150 },
      { type: 'cameraPan', x: 900, y: 300, speed: 4 },
      { type: 'text', text: 'Something small moves between the pillars ahead.', frames: 150 },
      { type: 'cameraReturn', speed: 5 },
      { type: 'text', text: 'A child. Watching you. Waiting to see what you do.', frames: 150 },
      {
        type: 'choice',
        actionA: 'moveLeft', actionB: 'moveRight',
        promptA: 'Walk away', promptB: 'Go to her',
        taps: 8, window: 100, onTimeout: 'A',
        onA: [
          { type: 'text', text: 'She watches you go. She does not follow.', frames: 150 },
          { type: 'setFlag', flag: 'child_choice_resolved', value: true },
        ],
        onB: [
          { type: 'text', text: 'She takes your hand like she already knew you would.', frames: 150 },
          { type: 'call', fn: () => { companionState.active = true; } },
          { type: 'setFlag', flag: 'child_choice_resolved', value: true },
        ],
      },
      { type: 'setFlag', flag: 'echo_bridge_intro_seen', value: true },
    ],
  },

  // story.md §2 point 2: "the actual first moment the Protect/Train choice
  // becomes concrete" — triggered live (game.js) the first time an enemy
  // goes aware while the Child is active and untaught. Protect keeps her on
  // the existing hide-and-heal kit; Train unlocks companionState.canFight
  // and assigns her starter found weapon (companion.js's weapon kit).
  child_first_fight_choice: {
    steps: [
      { type: 'text', text: 'She sees them too. What do you want her to do?', frames: 90 },
      {
        type: 'choice',
        actionA: 'jump', actionB: 'attack',
        promptA: 'Protect her', promptB: 'Let her fight',
        taps: 8, window: 110, onTimeout: 'A',
        onA: [
          { type: 'text', text: 'Stay back. Stay hidden. That is the deal.', frames: 120 },
          { type: 'setFlag', flag: 'child_fight_choice_resolved', value: true },
        ],
        onB: [
          { type: 'text', text: 'She grits her teeth and steps up beside you.', frames: 120 },
          { type: 'call', fn: () => { companionState.canFight = true; if (!companionState.weapon) companionState.weapon = 'knuckles'; } },
          { type: 'setFlag', flag: 'child_fight_choice_resolved', value: true },
        ],
      },
    ],
  },

  // story.md §5's Absorb/Spare choice, now attached to the Antechamber
  // Child fight instead of Abandoned Shell (user direction 2026-07-28 —
  // this fight replaces it as the sole "lost the child" consequence; see
  // game_update.js's miniboss-death branch for antechamber_child, which
  // calls this instead of the usual +1 Max Health reward). Absorb grants
  // +1 Fracture Pip and locks in the Collapse ending; Spare locks in the
  // Loop ending — both read by the Sovereign's own victory screen
  // (game_draw_loop.js) via storyFlags.antechamber_ending.
  antechamber_child_ending: {
    steps: [
      { type: 'text', text: 'She lies still. Whatever she was, whatever she became — this is what is left.', frames: 150 },
      {
        type: 'choice',
        actionA: 'aimDown', actionB: 'attack',
        promptA: 'Spare her', promptB: 'Absorb her',
        taps: 8, window: 110, onTimeout: 'A',
        onA: [
          { type: 'text', text: 'She dissipates into peaceful light.', frames: 150 },
          { type: 'setFlag', flag: 'antechamber_ending', value: 'loop' },
        ],
        onB: [
          { type: 'text', text: 'You take what is left of her. One more piece of the Fracture, yours now.', frames: 150 },
          { type: 'call', fn: () => { player.fractureMax = Math.min(FRACTURE_ABS_MAX, player.fractureMax + 1); } },
          { type: 'setFlag', flag: 'antechamber_ending', value: 'collapse' },
        ],
      },
    ],
  },
};

// ── Editor overrides ─────────────────────────────────────────────────────────
// editor/cutscene_editor.html saves work-in-progress here; applied on load,
// same pattern as animdata.js's ANIM_OVERRIDES_KEY (see that file's own
// comment). A saved cutscene's 'call' steps carry a JSON-safe `_callCode`
// source string instead of a live `fn` (functions can't survive
// JSON.stringify/structuredClone) — materializeCallSteps() below rebuilds
// the real `fn` from that string. Overrides merge per-key (whole cutscene
// replaced), never per-step.
const CUTSCENE_OVERRIDES_KEY = 'stillpoint_cutscene_overrides_v1';

function materializeCallSteps(steps) {
  for (const step of (steps || [])) {
    if (step.type === 'call' && !step.fn && step._callCode) {
      try { step.fn = new Function('return (' + step._callCode + ')')(); }
      catch (e) { console.warn(`[cutscene] bad _callCode, step becomes a no-op:`, e); step.fn = () => {}; }
    }
    if (step.type === 'choice') {
      materializeCallSteps(step.onA);
      materializeCallSteps(step.onB);
    }
  }
}

function applyCutsceneOverrides() {
  const overrides = readOverrideJSON(CUTSCENE_OVERRIDES_KEY);
  if (!overrides) return;
  for (const key in overrides) {
    materializeCallSteps(overrides[key].steps);
    CUTSCENES[key] = overrides[key];
  }
}
applyCutsceneOverrides();

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
  // Shallow-clone the steps array (not the CUTSCENES entry itself) — a
  // 'choice' step splices its winning branch into this array in place, and
  // without cloning that would permanently mutate the shared script on its
  // first play.
  cutsceneState.active = { steps: scene.steps.slice() };
  cutsceneState.id = id;
  cutsceneState.stepIndex = 0;
  cutsceneState.stepTimer = 0;
  cutsceneState.returnState = gameState === 'cutscene' ? cutsceneState.returnState : gameState;
  cutsceneState.skipHold = 0;
  cutsceneState.camOverride = null;
  cutsceneState.barSlide = 0;
  cutsceneState.choiceTapsA = 0;
  cutsceneState.choiceTapsB = 0;
  gameState = 'cutscene';
}

// Resolves the 'choice' step currently at cs.stepIndex by splicing the
// winning branch's steps into the running script in its place. Shared by
// the tap-threshold win path and the timeout/skip fallback path.
function resolveChoice(cs, step, winner) {
  const branch = (winner === 'A' ? step.onA : step.onB) || [];
  cs.active.steps.splice(cs.stepIndex, 1, ...branch);
  cs.stepTimer = 0;
  cs.choiceTapsA = 0;
  cs.choiceTapsB = 0;
}

function endCutscene(skipped) {
  // Flags and calls must fire even on skip — a skipped scene that forgot to
  // set child_choice_resolved would be a progression bug, not a shortcut.
  if (skipped && cutsceneState.active) {
    const cs = cutsceneState;
    // A choice step mid-resolution needs its branch spliced in first (via
    // onTimeout) so the branch's own setFlag/call steps are in the flat
    // list the sweep below walks — otherwise skipping mid-choice would
    // silently drop whichever setFlag the winning branch would have set.
    const pending = cs.active.steps[cs.stepIndex];
    if (pending && pending.type === 'choice') {
      resolveChoice(cs, pending, pending.onTimeout === 'B' ? 'B' : 'A');
    }
    const steps = cs.active.steps;
    for (let i = cs.stepIndex; i < steps.length; i++) {
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

    case 'choice': {
      const taps = step.taps || 8;
      const winFrames = step.window || 90;
      if (wasActionJustPressed(step.actionA)) cs.choiceTapsA++;
      if (wasActionJustPressed(step.actionB)) cs.choiceTapsB++;
      if (cs.choiceTapsA >= taps) resolveChoice(cs, step, 'A');
      else if (cs.choiceTapsB >= taps) resolveChoice(cs, step, 'B');
      else if (cs.stepTimer >= winFrames) resolveChoice(cs, step, step.onTimeout === 'B' ? 'B' : 'A');
      // done stays false either way — resolveChoice (if it ran) already
      // spliced the winning branch's first step into cs.stepIndex and reset
      // stepTimer, so next frame picks it up naturally without an index bump.
      break;
    }

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

  // Choice prompt — two racing tap-meters, story.md's rapid-tap-repeat UI.
  if (step && step.type === 'choice') {
    const taps = step.taps || 8;
    const barW = 180, barH2 = 10, gap = 40;
    const cy = H / 2 + 40;
    const drawBar = (x, label, count, color) => {
      const frac = Math.min(1, count / taps);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, cy, barW, barH2);
      ctx.fillStyle = color;
      ctx.fillRect(x, cy, barW * frac, barH2);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(x, cy, barW, barH2);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + barW / 2, cy - 8);
      ctx.textAlign = 'left';
    };
    drawBar(W / 2 - barW - gap / 2, step.promptA || 'A', cs.choiceTapsA || 0, '#64748b');
    drawBar(W / 2 + gap / 2, step.promptB || 'B', cs.choiceTapsB || 0, '#f9a8d4');
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
