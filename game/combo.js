// Combo chain system (2026-07-16) — data-driven action sequences with rewards.
//
// HOW IT WORKS
//   1. Every frame, updateComboTracker(player) watches the player's existing
//      state flags (attacking, dashing, voidTetherFired, …) with rising-edge
//      detectors and turns them into named ACTION EVENTS — no changes to
//      player.js's input code were needed, and new abilities only need one
//      line in _detectActions() to become combo-able.
//   2. Each event is fed to every combo in COMBO_DEFS. A combo is an ordered
//      list of steps; each step names an action and the max gap (frames)
//      allowed since the previous step. Complete the sequence in rhythm →
//      the reward fires (popup + effect). Break the rhythm → that combo's
//      progress resets (a mismatched action that IS the combo's first step
//      restarts it at step 1 rather than 0).
//   3. COMBO_DEFS is editable data — editor/combo_editor.html builds
//      combos visually and saves overrides to localStorage (read below on
//      load, same pattern as animdata.js's overrides).
//
// ACTION NAMES emitted by the tracker (the combo editor lists these):
//   attack, attack_up, attack_down  — melee swing by direction
//   heavy                           — charged attack release
//   dash                            — dash OR phase dash (they share a button)
//   jump
//   shard_shot
//   stillpoint
//   graviton_surge                  — gravity flip or graviton ball cast
//   void_tether
//
// REWARD TYPES:
//   { type: 'damage_buff', mult: 1.5, frames: 300 }  — melee damage ×mult for a while
//   { type: 'cooldown_refresh' }                     — dash + all ability cooldowns reset
//   { type: 'fracture', amount: 1 }                  — refill Fracture meter
//   { type: 'heal', amount: 1 }                      — restore health

const COMBO_OVERRIDES_KEY = 'stillpoint_combo_overrides_v1';

let COMBO_DEFS = [
  {
    id: 'tether_slam',
    name: 'TETHER SLAM',
    // Pull an enemy in, then meet it with a down-slam as it arrives.
    steps: [
      { action: 'void_tether', maxGap: 0 },   // maxGap 0 = this step starts the chain
      { action: 'attack_down', maxGap: 60 },
    ],
    reward: { type: 'fracture', amount: 1 },
  },
  {
    id: 'phase_rush',
    name: 'PHASE RUSH',
    // Dash twice and convert the momentum into a strike.
    steps: [
      { action: 'dash', maxGap: 0 },
      { action: 'dash', maxGap: 45 },
      { action: 'attack', maxGap: 30 },
    ],
    reward: { type: 'damage_buff', mult: 1.5, frames: 240 },
  },
  {
    id: 'gravity_spike',
    name: 'GRAVITY SPIKE',
    // Launch upward off a graviton cast, then spike back down.
    steps: [
      { action: 'graviton_surge', maxGap: 0 },
      { action: 'jump', maxGap: 60 },
      { action: 'attack_down', maxGap: 60 },
    ],
    reward: { type: 'cooldown_refresh' },
  },
];

// Editor overrides — combo_editor.html saves its working set here; applied
// on load so "save → reload game → test" needs no code edits.
(function applyComboOverrides() {
  try {
    const raw = localStorage.getItem(COMBO_OVERRIDES_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length) COMBO_DEFS = list;
    }
  } catch (e) { /* private browsing / bad JSON — run with built-ins */ }
})();

// ── Runtime state ───────────────────────────────────────────────────────────
const comboState = {
  progress: {},        // combo id → { index, lastFrame } while mid-chain
  frame: 0,            // tracker's own frame counter
  damageBuff: null,    // { mult, timer } — read by playerMeleeDamage() (game.js)
  lastCompleted: null, // { name, timer } — for any HUD/debug display
  // previous-frame flags for the rising-edge detectors
  _prev: {},
};

// Melee damage multiplier from an active combo reward (1 when none).
// game.js's playerMeleeDamage() multiplies by this.
function comboDamageMultiplier() {
  return comboState.damageBuff ? comboState.damageBuff.mult : 1;
}

// ── Edge detection: player state flags → named action events ───────────────
function _detectActions(player) {
  const events = [];
  const prev = comboState._prev;

  // Melee swings, split by direction; a heavy release counts as 'heavy'.
  if (player.attacking && !prev.attacking) {
    if (player.heavy) events.push('heavy');
    else if (player.attackDirection === 'up') events.push('attack_up');
    else if (player.attackDirection === 'down') events.push('attack_down');
    else events.push('attack');
  }
  // Dash and Phase Dash share one button/binding — one action name.
  if ((player.dashing && !prev.dashing) || (player.phaseDashing && !prev.phaseDashing)) {
    events.push('dash');
  }
  if (player.vy < -8 && !(prev.vy < -8) && !player.grounded) events.push('jump'); // jump impulse
  if (player.shardShotFired) events.push('shard_shot');
  if (player.voidTetherFired) events.push('void_tether');
  if (player.stillpointActive && !prev.stillpointActive) events.push('stillpoint');
  if ((player.gravitonActive && !prev.gravitonActive) ||
      (player.gravitonBallCharging && !prev.gravitonBallCharging)) {
    events.push('graviton_surge');
  }

  prev.attacking = player.attacking;
  prev.dashing = player.dashing;
  prev.phaseDashing = player.phaseDashing;
  prev.stillpointActive = player.stillpointActive;
  prev.gravitonActive = player.gravitonActive;
  prev.gravitonBallCharging = player.gravitonBallCharging;
  prev.vy = player.vy;
  return events;
}

// ── Matching ────────────────────────────────────────────────────────────────
function _feedAction(action, player) {
  for (const combo of COMBO_DEFS) {
    if (!combo.steps || !combo.steps.length) continue;
    let p = comboState.progress[combo.id];

    if (p) {
      const step = combo.steps[p.index];
      const gap = comboState.frame - p.lastFrame;
      if (action === step.action && gap <= (step.maxGap || 60)) {
        p.index++;
        p.lastFrame = comboState.frame;
        if (p.index >= combo.steps.length) {
          delete comboState.progress[combo.id];
          _completeCombo(combo, player);
        }
        continue;
      }
      // Mismatch or too slow — drop the chain (but let this action restart it below).
      delete comboState.progress[combo.id];
      p = null;
    }

    if (!p && action === combo.steps[0].action) {
      if (combo.steps.length === 1) _completeCombo(combo, player);
      else comboState.progress[combo.id] = { index: 1, lastFrame: comboState.frame };
    }
  }
}

function _completeCombo(combo, player) {
  const r = combo.reward || {};
  switch (r.type) {
    case 'damage_buff':
      comboState.damageBuff = { mult: r.mult || 1.5, timer: r.frames || 240 };
      break;
    case 'cooldown_refresh':
      player.dashCooldown = 0;
      abilityState.phaseDashCooldown = 0;
      abilityState.shardShotCooldown = 0;
      abilityState.gravitonSurgeCooldown = 0;
      abilityState.voidTetherCooldown = 0;
      break;
    case 'fracture':
      for (let i = 0; i < (r.amount || 1); i++) {
        if (typeof player.gainFracture === 'function') player.gainFracture();
      }
      break;
    case 'heal':
      player.health = Math.min(playerMaxHealth(), player.health + (r.amount || 1));
      break;
  }
  comboState.lastCompleted = { name: combo.name || combo.id, timer: 120 };
  if (typeof addAbilityNotification === 'function') addAbilityNotification(`COMBO: ${combo.name || combo.id}`);
  if (typeof abilityPopups !== 'undefined') {
    abilityPopups.push({ text: `⚡ ${combo.name || combo.id}`, x: player.x + player.width / 2, y: player.y - 24, life: 90, color: '#fbbf24' });
  }
  if (typeof spawnParticles === 'function') {
    spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#fbbf24', 14);
  }
  if (typeof SFX !== 'undefined') SFX.abilityPickup();
}

// ── Per-frame entry point (called from game.js's playing-state update) ─────
function updateComboTracker(player) {
  comboState.frame++;

  // Expire stale chains (their next step's window has passed).
  for (const id in comboState.progress) {
    const combo = COMBO_DEFS.find((c) => c.id === id);
    const p = comboState.progress[id];
    if (!combo) { delete comboState.progress[id]; continue; }
    const step = combo.steps[p.index];
    if (comboState.frame - p.lastFrame > (step.maxGap || 60)) delete comboState.progress[id];
  }

  // Tick reward timers.
  if (comboState.damageBuff && --comboState.damageBuff.timer <= 0) comboState.damageBuff = null;
  if (comboState.lastCompleted && --comboState.lastCompleted.timer <= 0) comboState.lastCompleted = null;

  for (const action of _detectActions(player)) _feedAction(action, player);
}

// Debug-tool access (same pattern as area.js's window.AREAS)
if (typeof window !== 'undefined') {
  window.COMBO_DEFS = COMBO_DEFS;
  window.comboState = comboState;
}
