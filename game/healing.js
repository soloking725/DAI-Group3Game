// Healing & collectibles (2026-07-16) — see Plans/healing_items_plan.md.
// Three systems, all deliberately NOT consumable-inventory items:
//
//   1. VITALITY MOTES — enemies drop small drifting motes on death; motes
//      auto-drift to the player within a short radius and heal a fraction
//      of 1 HP each (MOTES_PER_HEAL motes = 1 HP). Sustain comes from
//      fighting well and staying aggressive — combat is the point.
//   2. MAX-HEALTH SHARDS — permanent +1 max HP pickups (the existing
//      `max_health_upgrade_*` abilityReward entries in area.js, which the
//      old grant chain silently ignored — now real). Tracked per-id in
//      maxHealthShardsCollected, persisted in saves.
//   3. HEALING CRYSTALS — placed one-time in-world restores: a cracked
//      fracture-crystal you STRIKE open (attack it) for a full heal. Does
//      not respawn until the next anchor rest (Estus-flower style).
//      Authored per-room as `area.healingCrystals: [{ id, x, y }]`.
//
// Explicitly NOT here (rejected in the plan): potions, consumable
// inventory, currency, keys. Keep it that way.

// ── Max health ──────────────────────────────────────────────────────────────
// MAX_HEALTH (player.js) is the BASE. Shards add to maxHealthBonus; every
// heal-cap and full-heal site asks playerMaxHealth() instead of the const.
let maxHealthBonus = 0;
let maxHealthShardsCollected = {}; // shard id → true (persisted)

function playerMaxHealth() {
  return MAX_HEALTH + maxHealthBonus;
}

// ── Vitality motes ──────────────────────────────────────────────────────────
const MOTE_LIFETIME = 240;       // 4s before an uncollected mote fades
const MOTE_DRIFT_RADIUS = 120;   // px — starts homing to the player inside this
const MOTE_DRIFT_ACCEL = 0.45;
const MOTE_COLLECT_DIST = 14;
const MOTES_PER_HEAL = 4;        // motes needed for +1 HP

let motes = [];                  // live motes in the current room
let moteCharge = 0;              // partial-heal progress (persists across rooms, not saves)

// Call at any enemy death site. Count scales with enemy size so a colossus
// pays out more than a slime; +1 bonus mote on a heavy kill feels right but
// is the caller's choice via `bonus`.
function spawnVitalityMotes(x, y, count) {
  for (let i = 0; i < count; i++) {
    motes.push({
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 16,
      vx: (Math.random() - 0.5) * 3,
      vy: -1.5 - Math.random() * 1.5,
      life: MOTE_LIFETIME,
      alive: true,
    });
  }
}

// Standard payout for an enemy: 2 base + 1 per 30px of width (28px basic
// enemy → 2, a 64px bruiser → 4). One place so the tuning can't drift.
function moteCountForEnemy(enemy) {
  return 2 + Math.floor((enemy.width || 28) / 30);
}

function updateVitalityMotes(player, timeScale = 1) {
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;
  for (const m of motes) {
    if (!m.alive) continue;
    m.life -= timeScale;
    if (m.life <= 0) { m.alive = false; continue; }

    const dx = px - m.x, dy = py - m.y;
    const d = Math.hypot(dx, dy);
    if (d < MOTE_DRIFT_RADIUS && d > 0) {
      // Pure acceleration toward the player with no drag (user report
      // 2026-07-19: "they kind of orbit the player and don't hit them") —
      // confirmed via harness: a mote's own launch velocity plus unbounded
      // homing accel is a textbook unstable orbit (gravity with no
      // damping), so it swings past the player instead of ever settling
      // within MOTE_COLLECT_DIST. The 0.9 decay after each accel step is
      // what actually lets it converge instead of endlessly circling.
      m.vx = (m.vx + (dx / d) * MOTE_DRIFT_ACCEL * timeScale) * 0.9;
      m.vy = (m.vy + (dy / d) * MOTE_DRIFT_ACCEL * timeScale) * 0.9;
    } else {
      m.vx *= 0.96;
      m.vy = m.vy * 0.96 - 0.02; // gentle float
    }
    m.x += m.vx * timeScale;
    m.y += m.vy * timeScale;

    if (d < MOTE_COLLECT_DIST) {
      m.alive = false;
      moteCharge++;
      if (typeof SFX !== 'undefined') SFX.uiSelect();
      if (moteCharge >= MOTES_PER_HEAL) {
        moteCharge = 0;
        if (player.health < playerMaxHealth()) {
          player.health++;
          if (typeof spawnParticles === 'function') spawnParticles(px, py - 8, '#6ee7b7', 10);
        }
      }
    }
  }
  // Compact in place, back to front (no per-frame allocation of a new array)
  for (let i = motes.length - 1; i >= 0; i--) {
    if (!motes[i].alive) motes.splice(i, 1);
  }
}

function clearVitalityMotes() {
  motes.length = 0; // room change — motes are room-space
}

function drawVitalityMotes(ctx) {
  for (const m of motes) {
    const a = Math.min(1, m.life / 60);
    ctx.globalAlpha = a * (0.7 + Math.sin(m.life * 0.2) * 0.3);
    ctx.fillStyle = '#6ee7b7';
    ctx.beginPath();
    ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = a * 0.25;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── Healing crystals ────────────────────────────────────────────────────────
const HEAL_CRYSTAL_W = 26;
const HEAL_CRYSTAL_H = 34;

let consumedHealCrystals = {}; // crystal id → true; cleared on anchor rest

// Anchor rest (or respawn) regrows every struck-open crystal.
function resetHealingCrystals() {
  consumedHealCrystals = {};
}

// Strike-open check — called each frame with the player's live attack
// hitbox (null when not attacking). Uses the same per-swing dedup set as
// every other hit target, per CLAUDE.md's rule.
function updateHealingCrystals(player, area) {
  if (!area || !area.healingCrystals) return;
  const atk = player.getAttackHitbox();
  if (!atk) return;
  for (const c of area.healingCrystals) {
    if (consumedHealCrystals[c.id]) continue;
    const box = { x: c.x - HEAL_CRYSTAL_W / 2, y: c.y - HEAL_CRYSTAL_H, width: HEAL_CRYSTAL_W, height: HEAL_CRYSTAL_H };
    const dedupKey = 'heal_crystal_' + c.id;
    if (rectsOverlap(atk, box) && !player.hitTargetsThisSwing.has(dedupKey)) {
      player.hitTargetsThisSwing.add(dedupKey);
      consumedHealCrystals[c.id] = true;
      player.health = playerMaxHealth(); // full heal
      if (typeof spawnParticles === 'function') spawnParticles(c.x, c.y - HEAL_CRYSTAL_H / 2, '#6ee7b7', 22);
      if (typeof addAbilityNotification === 'function') addAbilityNotification('Fracture crystal — fully restored (regrows at an Anchor)');
      if (typeof SFX !== 'undefined') SFX.abilityPickup();
    }
  }
}

function drawHealingCrystals(ctx, area, frameCount) {
  if (!area || !area.healingCrystals) return;
  const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1;
  for (const c of area.healingCrystals) {
    if (typeof tryDrawPointObjectAnim === 'function' && tryDrawPointObjectAnim(ctx, c, _ts, 20)) continue;
    const consumed = consumedHealCrystals[c.id];
    const pulse = Math.sin(frameCount * 0.06) * 0.15;
    const baseX = c.x, baseY = c.y;
    ctx.globalAlpha = consumed ? 0.18 : 0.85 + pulse;
    // Crystal shard cluster — same visual language as destructible crystal walls
    ctx.fillStyle = consumed ? '#2a4a42' : '#6ee7b7';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY - HEAL_CRYSTAL_H);
    ctx.lineTo(baseX + HEAL_CRYSTAL_W / 2, baseY - 8);
    ctx.lineTo(baseX + 6, baseY);
    ctx.lineTo(baseX - 6, baseY);
    ctx.lineTo(baseX - HEAL_CRYSTAL_W / 2, baseY - 10);
    ctx.closePath();
    ctx.fill();
    if (!consumed) {
      ctx.strokeStyle = 'rgba(110, 231, 183, 0.5)';
      ctx.beginPath();
      ctx.moveTo(baseX - 4, baseY - HEAL_CRYSTAL_H + 8);
      ctx.lineTo(baseX + 3, baseY - 12);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

// Debug-tool access (same pattern as area.js's window.AREAS)
if (typeof window !== 'undefined') {
  window.playerMaxHealth = playerMaxHealth;
  window.spawnVitalityMotes = spawnVitalityMotes;
}
