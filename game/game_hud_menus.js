// NOTE: The HUD (health, boss health, ability cooldowns, area name, checkpoint
// indicator) is drawn directly on the canvas by drawHUD() inside draw() — see
// the "CANVAS HUD (Phase 0.1)" section near the bottom of this file. There is
// no DOM-based UI left to update per-frame, so updateUI() has been removed.

// ═══════════════════════════════════════════════════════════════════════
// CANVAS HUD (Phase 0.1) — health, ability icons + cooldown rings, area
// name, checkpoint indicator, boss health bar, and the fading controls hint.
// Everything used to live in HTML overlays (#ui, #ability-bar,
// #boss-health-container, #controls-hint); those elements no longer exist
// in index.html, so all of it is drawn straight onto the canvas here.
// ═══════════════════════════════════════════════════════════════════════

// ── HUD layout data (2026-07-16) ────────────────────────────────────────
// Positions/sizes/visibility of every HUD element, extracted from the
// hardcoded numbers the draw functions below used to carry inline, so
// editor/hud_editor.html can move/toggle them visually. `anchor` says which
// screen edge x/y are measured from — the draw code resolves it via
// hudResolve(), so layouts survive any canvas size:
//   'top-left'      x from left,  y from top
//   'top-center'    x offset from W/2 (usually 0), y from top
//   'bottom-left'   x from left,  y from BOTTOM (positive = up)
//   'bottom-right'  x from RIGHT, y from BOTTOM
// Saved overrides (the editor's 💾) load from localStorage below.
const HUD_LAYOUT_KEY = 'stillpoint_hud_layout_v1';
const HUD_LAYOUT = {
  healthHearts:  { anchor: 'top-left',     x: 16, y: 14, size: 16, gap: 3,  visible: true },
  areaLabel:     { anchor: 'top-left',     x: 16, y: 42,                    visible: true },
  bossBar:       { anchor: 'top-center',   x: 0,  y: 18, w: 320, h: 12,    visible: true },
  limitBreakBar: { anchor: 'top-center',   x: 0,  y: 40, w: 160, h: 8,     visible: true },
  controlsHint:  { anchor: 'bottom-right', x: 16, y: 12,                    visible: true },
  fracturePips:  { anchor: 'bottom-left',  x: 14, y: 58, gap: 22,          visible: true },
  abilityCooldowns: { anchor: 'bottom-center', x: 0, y: 34, size: 20, gap: 6, visible: true },
};

(function applyHudLayoutOverrides() {
  try {
    const raw = localStorage.getItem(HUD_LAYOUT_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    for (const key in saved) {
      if (HUD_LAYOUT[key]) Object.assign(HUD_LAYOUT[key], saved[key]);
    }
  } catch (e) { /* private browsing / bad JSON — use defaults */ }
})();

// Resolve a layout entry to absolute screen coordinates for the current
// canvas size. Returns {x, y} of the element's reference point.
function hudResolve(el) {
  switch (el.anchor) {
    case 'top-center':    return { x: W / 2 + el.x, y: el.y };
    case 'bottom-left':   return { x: el.x, y: H - el.y };
    case 'bottom-right':  return { x: W - el.x, y: H - el.y };
    case 'bottom-center': return { x: W / 2 + el.x, y: H - el.y };
    default:              return { x: el.x, y: el.y }; // top-left
  }
}

// ── HUD rendering ───────────────────────────────────────────────────────

function drawHUD(ctx) {
  if (!hudVisible || !player) return;

  if (HUD_LAYOUT.healthHearts.visible) drawHealthHearts(ctx);
  if (HUD_LAYOUT.areaLabel.visible) drawAreaLabel(ctx);
  if (HUD_LAYOUT.bossBar.visible && boss && !boss.dead && gameState === 'playing') {
    drawBossHealthBar(ctx);
  }
  if (currentAreaId === 'tutorial_area') {
    drawTutorialBanner(ctx);
  }
  if (HUD_LAYOUT.controlsHint.visible) drawControlsHint(ctx);
  if (HUD_LAYOUT.limitBreakBar.visible) drawLimitBreakBar(ctx);
  if (HUD_LAYOUT.abilityCooldowns.visible) drawAbilityCooldownHUD(ctx);
}

// Fixed-position ability cooldown strip (bottom-center, Dead Cells-style) —
// 2026-07-27, replacing Phase Dash/Shard Shot/Parry's old world-space rings
// (drawDashCooldownRing below), which nested concentrically under the
// player's feet and turned into an unreadable bullseye once 2+ were
// cooling at once. Unlike a permanent skill bar, a slot only EXISTS while
// that ability is actually cooling: nothing is drawn when everything's
// ready, so a short cooldown just flashes briefly instead of sitting on
// screen the whole game — same "quiet, only when it matters" rule the old
// rings followed, just legible with more than one ability going at once.
// Base Dash keeps its own single ring (still drawn by drawDashCooldownRing)
// since it's core movement everyone has from frame one, not a "special."
function drawAbilityCooldownHUD(ctx) {
  const slots = [];
  if (abilityState.hasPhaseDash && abilityState.phaseDashCooldown > 0) {
    slots.push({ label: 'PD', frac: 1 - abilityState.phaseDashCooldown / PHASE_DASH_COOLDOWN, color: '167, 139, 250' });
  }
  if (abilityState.hasShardShot && abilityState.shardShotCooldown > 0) {
    slots.push({ label: 'SS', frac: 1 - abilityState.shardShotCooldown / SHARD_SHOT_COOLDOWN, color: '45, 212, 191' });
  }
  if (abilityState.hasParry && abilityState.parryCooldown > 0) {
    slots.push({ label: 'PA', frac: 1 - abilityState.parryCooldown / PARRY_COOLDOWN, color: '251, 191, 36' });
  }
  if (slots.length === 0) return;

  const lay = HUD_LAYOUT.abilityCooldowns;
  const pos = hudResolve(lay);
  const r = lay.size / 2;
  const totalW = slots.length * lay.size + (slots.length - 1) * lay.gap;
  let cx = pos.x - totalW / 2 + r;
  const cy = pos.y - r;

  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(lay.size * 0.4)}px "Courier New", monospace`;
  for (const s of slots) {
    ctx.fillStyle = 'rgba(10, 10, 20, 0.7)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(${s.color}, 0.9)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, -Math.PI / 2, -Math.PI / 2 + s.frac * Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(${s.color}, 0.9)`;
    ctx.fillText(s.label, cx, cy + lay.size * 0.14);

    cx += lay.size + lay.gap;
  }
  ctx.textAlign = 'left';
}

// Limit Break (Lv4) 6s countdown bar — "To add" list in Enemy_Design.pdf.
// Flat blue to match the player's aura; no per-ability art yet.
function drawLimitBreakBar(ctx) {
  if (!limitBreak.active) return;
  const lay = HUD_LAYOUT.limitBreakBar;
  const pos = hudResolve(lay);
  const barW = lay.w, barH = lay.h;
  const x = pos.x - barW / 2, y = pos.y;
  const frac = limitBreak.timer / LIMIT_BREAK_DURATION;
  ctx.fillStyle = 'rgba(10, 20, 40, 0.6)';
  ctx.fillRect(x, y, barW, barH);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(x, y, barW * frac, barH);
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, barW, barH);
  ctx.textAlign = 'center';
  ctx.font = '9px "Courier New", monospace';
  ctx.fillStyle = '#93c5fd';
  ctx.fillText('LIMIT BREAK', pos.x, y - 3);
  ctx.textAlign = 'left';
}

// Top-center checklist banner for the tutorial room: current objective
// highlighted, completed ones checked off, plus a skip hint.
function drawTutorialBanner(ctx) {
  const steps = [
    { done: tutorialState.moved, label: 'MOVE \u2190\u2192' },
    { done: tutorialState.jumped, label: 'JUMP \u2191/SPACE' },
    { done: tutorialState.attacked, label: 'ATTACK Z (hit the dummy)' },
    { done: tutorialState.dashed, label: 'DASH X (cross the gap)' },
  ];
  // First not-yet-done step is the active one
  let activeIndex = steps.findIndex(s => !s.done);

  ctx.textAlign = 'center';
  ctx.font = '9px "Courier New", monospace';
  ctx.fillStyle = '#4a4a6e';
  ctx.fillText('THRESHOLD', W / 2, 58);

  ctx.font = '13px "Courier New", monospace';
  if (activeIndex === -1) {
    ctx.fillStyle = '#c4b5fd';
    ctx.fillText('Door unlocked \u2014 head right', W / 2, 78);
  } else {
    ctx.fillStyle = '#e0d7ff';
    ctx.fillText(steps[activeIndex].label, W / 2, 78);
  }

  // Small checklist row of dots beneath
  const dotGap = 20;
  const startX = W / 2 - ((steps.length - 1) * dotGap) / 2;
  for (let i = 0; i < steps.length; i++) {
    const x = startX + i * dotGap;
    ctx.beginPath();
    ctx.arc(x, 90, 3, 0, Math.PI * 2);
    ctx.fillStyle = steps[i].done ? '#c4b5fd' : (i === activeIndex ? '#67e8f9' : '#3a3a5e');
    ctx.fill();
  }

  ctx.font = '9px "Courier New", monospace';
  ctx.fillStyle = '#3a3a5e';
  ctx.fillText('ESC to skip', W / 2, 106);
  ctx.textAlign = 'left';
}

// Top-left: one heart glyph per point of MAX_HEALTH.
function drawHealthHearts(ctx) {
  const lay = HUD_LAYOUT.healthHearts;
  const pos = hudResolve(lay);
  const size = lay.size;
  const gap = lay.gap;
  const startX = pos.x;
  const startY = pos.y;

  ctx.font = `${size}px "Courier New", monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Colour shifts as health drops, mirroring the old CSS health-bar behavior.
  const heartColor = player.health <= 2 ? '#f87171' : player.health <= 4 ? '#fbbf24' : '#c4b5fd';

  for (let i = 0; i < playerMaxHealth(); i++) {
    const x = startX + i * (size + gap);
    const filled = i < player.health;
    // Faint drop-shadow so hearts stay readable over any background.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText(filled ? '\u2665' : '\u2661', x + 1, startY + 1);
    ctx.fillStyle = filled ? heartColor : '#3a3a5e';
    ctx.fillText(filled ? '\u2665' : '\u2661', x, startY);
  }
  ctx.textBaseline = 'alphabetic';
}

// Area name + checkpoint indicator, just under the health hearts.
function drawAreaLabel(ctx) {
  const area = getCurrentArea();
  const pos = hudResolve(HUD_LAYOUT.areaLabel);
  ctx.font = '11px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#6a6a8e';
  ctx.fillText(area.name, pos.x, pos.y);

  const nameWidth = ctx.measureText(area.name).width;
  ctx.fillStyle = lastAnchor ? '#c4b5fd' : '#4a4a6e';
  ctx.fillText(lastAnchor ? '\u25cf' : '\u25cb', pos.x + nameWidth + 8, pos.y);
}

// Top-center: boss health bar (drawn only while a boss is alive & active).
function drawBossHealthBar(ctx) {
  const lay = HUD_LAYOUT.bossBar;
  const pos = hudResolve(lay);
  const barW = lay.w;
  const barH = lay.h;
  const x = pos.x - barW / 2;
  const y = pos.y;
  const maxHp = boss.maxHealth || BOSS_MAX_HEALTH;
  const percent = Math.max(0, boss.health / maxHp);

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(x, y, barW, barH);
  const grad = ctx.createLinearGradient(x, y, x + barW, y);
  grad.addColorStop(0, '#dc2626');
  grad.addColorStop(1, '#f87171');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, barW * percent, barH);
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, barW, barH);

  ctx.font = '12px "Courier New", monospace';
  ctx.fillStyle = '#f87171';
  ctx.textAlign = 'center';
  ctx.fillText('THE FRACTURED KING', pos.x, y + barH + 15);
  ctx.textAlign = 'left';
}

// Bottom-right: control reminders, fading out ~10s after the run starts.
function drawControlsHint(ctx) {
  if (playStartFrame < 0) return;
  const elapsed = frameCount - playStartFrame;
  if (elapsed >= CONTROLS_HINT_FADE_END) return;

  let alpha = 1;
  if (elapsed > CONTROLS_HINT_FADE_START) {
    alpha = 1 - (elapsed - CONTROLS_HINT_FADE_START) / (CONTROLS_HINT_FADE_END - CONTROLS_HINT_FADE_START);
  }
  alpha = Math.max(0, Math.min(1, alpha));
  if (alpha <= 0) return;

  const lines = ['MOVE \u2190\u2192  JUMP SPACE  DASH X  ATTACK Z', 'SHARD: V + R(up)/T(down)  MAP M  PAUSE ESC'];
  const pos = hudResolve(HUD_LAYOUT.controlsHint);
  ctx.globalAlpha = alpha;
  ctx.font = '10px "Courier New", monospace';
  ctx.fillStyle = '#2a2a3e';
  ctx.textAlign = 'right';
  let ly = pos.y - (lines.length - 1) * 13;
  for (const line of lines) {
    ctx.fillText(line, pos.x, ly);
    ly += 13;
  }
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}




// Small recharge ring around the player's feet for base Dash only (world
// space, drawn while the camera transform is still active) — Phase Dash,
// Shard Shot, and Parry moved to the fixed-position bottom-center HUD strip
// (drawAbilityCooldownHUD above, 2026-07-27) so multiple cooldowns overlap
// legibly instead of nesting into a bullseye. Dash stays here: it's core
// movement from frame one, not a "special," and there's only ever the one
// ring so nesting was never the problem for it.
function drawDashCooldownRing(ctx) {
  if (!player) return;
  const cx = player.x + player.width / 2;
  const cy = player.y + player.height + 3;

  const rings = [];
  if (player.dashCooldown > 0) {
    rings.push({ frac: 1 - player.dashCooldown / DASH_COOLDOWN, color: '196, 181, 253' }); // violet
  }
  if (rings.length === 0) return;

  let r = 7;
  for (const ring of rings) {
    ctx.strokeStyle = `rgba(90, 90, 130, 0.35)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(${ring.color}, 0.85)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + ring.frac * Math.PI * 2);
    ctx.stroke();

    r += 4; // stack additional rings a little further out
  }
}

// Shared menu background (particles, grid, title glow, footer)
function drawMenuBackground() {
  // Background
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, W, H);

  // Ambient particles
  for (const p of menuParticles) {
    const pulse = Math.sin(p.pulse) * 0.15 + 0.85;
    ctx.globalAlpha = p.alpha * pulse;
    ctx.fillStyle = '#c4b5fd';
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // Subtle grid
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 0.5;
  const gridOffset = Math.round(frameCount * 0.1);
  for (let x = -gridOffset % 40; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Title glow
  const titlePulse = Math.sin(frameCount * 0.025) * 0.3 + 0.7;
  const gradient = ctx.createRadialGradient(W / 2, H / 2 - 40, 0, W / 2, H / 2 - 40, 250);
  gradient.addColorStop(0, `rgba(196, 181, 253, ${titlePulse * 0.12})`);
  gradient.addColorStop(1, 'rgba(196, 181, 253, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  return titlePulse;
}

// ── Main Menu: Play, Controls, Settings ──────────────────────────────────
function drawMainMenu() {
  const titlePulse = drawMenuBackground();

  ctx.textAlign = 'center';

  // Title
  ctx.fillStyle = `rgba(196, 181, 253, ${titlePulse})`;
  ctx.font = 'bold 64px "Courier New", monospace';
  ctx.fillText('STILLPOINT', W / 2, H / 2 - 80);

  // Subtitle
  ctx.fillStyle = `rgba(103, 232, 249, ${titlePulse * 0.7})`;
  ctx.font = '14px "Courier New", monospace';
  ctx.fillText('A world fractured in time', W / 2, H / 2 - 55);

  // Menu items
  const items = ['Play', 'Controls', 'Settings'];
  const itemY = H / 2 - 10;
  const itemHeight = 40;
  const itemWidth = 220;
  const itemX = W / 2 - itemWidth / 2;

  for (let i = 0; i < items.length; i++) {
    const y = itemY + i * (itemHeight + 6);
    const isSelected = i === menuSelection;

    // Item background
    ctx.fillStyle = isSelected
      ? 'rgba(196, 181, 253, 0.15)'
      : 'rgba(30, 30, 50, 0.3)';
    ctx.fillRect(itemX, y, itemWidth, itemHeight);

    // Item border
    ctx.strokeStyle = isSelected
      ? 'rgba(196, 181, 253, 0.8)'
      : 'rgba(58, 58, 94, 0.3)';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeRect(itemX, y, itemWidth, itemHeight);

    // Item text
    ctx.fillStyle = isSelected ? '#c4b5fd' : '#6a6a8e';
    ctx.font = `${isSelected ? 'bold ' : ''}16px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(items[i], W / 2, y + 26);

    // Selection arrow
    if (isSelected) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#c4b5fd';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('▶', itemX - 4, y + 26);
    }
  }

  // Hint
  const promptAlpha = Math.sin(frameCount * 0.05) * 0.4 + 0.6;
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(203, 245, 255, ${promptAlpha})`;
  ctx.font = '12px "Courier New", monospace';
  ctx.fillText('↑↓ / WS : Select   |   Space / Enter : Choose', W / 2, itemY + items.length * (itemHeight + 6) + 16);

  // Footer
  ctx.fillStyle = 'rgba(58, 58, 94, 0.5)';
  ctx.font = '10px "Courier New", monospace';
  ctx.fillText('Stillpoint — Phase 2', W / 2, H - 20);
  ctx.textAlign = 'left';
}

// ── Play Menu: Save Slot Selection ────────────────────────────────────────
function drawPlayMenu() {
  const titlePulse = drawMenuBackground();

  ctx.textAlign = 'center';

  // Screen title
  ctx.fillStyle = `rgba(196, 181, 253, ${titlePulse})`;
  ctx.font = 'bold 36px "Courier New", monospace';
  ctx.fillText('SELECT SAVE', W / 2, H / 2 - 90);

  // Save slot selection
  const slotY = H / 2 - 40;
  const slotHeight = 38;
  const slotWidth = 280;
  const slotX = W / 2 - slotWidth / 2;

  for (let i = 0; i < SAVE_SLOTS; i++) {
    const y = slotY + i * (slotHeight + 8);
    const isSelected = i === menuSelectionPlay;
    const info = getSlotInfo(i);

    // Slot background
    ctx.fillStyle = isSelected
      ? 'rgba(196, 181, 253, 0.15)'
      : 'rgba(30, 30, 50, 0.5)';
    ctx.fillRect(slotX, y, slotWidth, slotHeight);

    // Slot border
    ctx.strokeStyle = isSelected
      ? 'rgba(196, 181, 253, 0.8)'
      : 'rgba(58, 58, 94, 0.3)';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeRect(slotX, y, slotWidth, slotHeight);

    // Slot number + label
    ctx.textAlign = 'left';
    ctx.fillStyle = isSelected ? '#c4b5fd' : '#6a6a8e';
    ctx.font = `${isSelected ? 'bold ' : ''}13px "Courier New", monospace`;
    ctx.fillText(`Slot ${i + 1}`, slotX + 12, y + 23);

    // Slot info
    ctx.textAlign = 'right';
    if (info.empty) {
      ctx.fillStyle = isSelected ? 'rgba(106, 106, 142, 0.8)' : 'rgba(58, 58, 94, 0.6)';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText('[ Empty ]', slotX + slotWidth - 12, y + 23);
    } else {
      ctx.fillStyle = isSelected ? '#86efac' : '#4ade80';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText(getAreaDisplayName(info.areaId), slotX + slotWidth - 12, y + 23);
    }

    // Selection arrow
    if (isSelected) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#c4b5fd';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('▶', slotX - 4, y + 24);
    }
  }

  // Prompt hints
  const promptAlpha = Math.sin(frameCount * 0.05) * 0.4 + 0.6;
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(203, 245, 255, ${promptAlpha})`;
  ctx.font = '13px "Courier New", monospace';
  ctx.fillText('↑↓ / WS : Select Slot   |   Space / Enter : Load / New Game', W / 2, slotY + SAVE_SLOTS * (slotHeight + 8) + 16);
  ctx.fillStyle = 'rgba(106, 106, 142, 0.7)';
  ctx.font = '11px "Courier New", monospace';
  ctx.fillText('N : New   |   D : Delete   |   E : Export   |   I : Import   |   ESC : Back', W / 2, slotY + SAVE_SLOTS * (slotHeight + 8) + 34);

  // Transient feedback (e.g. "Save copied to clipboard!")
  if (saveSlotMessage) {
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = `rgba(134, 239, 172, ${Math.min(1, saveSlotMessage.timer / 30)})`;
    ctx.fillText(saveSlotMessage.text, W / 2, slotY + SAVE_SLOTS * (slotHeight + 8) + 54);
  }

  // Footer
  ctx.fillStyle = 'rgba(58, 58, 94, 0.5)';
  ctx.font = '10px "Courier New", monospace';
  ctx.fillText('Stillpoint — Phase 2', W / 2, H - 20);
  ctx.textAlign = 'left';
}

// ── Confirm Delete Overlay ──────────────────────────────────────────────
function drawConfirmDeleteScreen() {
  // Draw the play screen underneath
  drawPlayMenu();

  // Dim overlay
  ctx.fillStyle = 'rgba(10, 10, 20, 0.7)';
  ctx.fillRect(0, 0, W, H);

  // Confirmation box
  const boxW = 340;
  const boxH = 100;
  const boxX = W / 2 - boxW / 2;
  const boxY = H / 2 - boxH / 2;

  ctx.fillStyle = 'rgba(15, 15, 30, 0.95)';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = 'rgba(248, 113, 113, 0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f87171';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillText('DELETE SAVE?', W / 2, boxY + 32);

  ctx.fillStyle = '#6a6a8e';
  ctx.font = '13px "Courier New", monospace';
  ctx.fillText(`Slot ${menuSelectionPlay + 1}`, W / 2, boxY + 54);

  const promptAlpha = Math.sin(frameCount * 0.06) * 0.4 + 0.6;
  ctx.fillStyle = `rgba(248, 113, 113, ${promptAlpha})`;
  ctx.font = '13px "Courier New", monospace';
  ctx.fillText('D : Confirm Delete', W / 2, boxY + 82);
  ctx.fillStyle = `rgba(106, 106, 142, ${promptAlpha})`;
  ctx.fillText('ESC : Cancel', W / 2, boxY + 96);

  ctx.textAlign = 'left';
}

// ── Controls Screen (remappable — roadmap 2026-07-14) ──────────────────────
function drawControlsScreen() {
  const titlePulse = drawMenuBackground();

  ctx.textAlign = 'center';

  // Screen title
  ctx.fillStyle = `rgba(196, 181, 253, ${titlePulse})`;
  ctx.font = 'bold 36px "Courier New", monospace';
  ctx.fillText('CONTROLS', W / 2, 50);

  const rowCount = REMAPPABLE_ACTIONS.length + 1; // +1 for Reset row
  const panelX = W / 2 - 220;
  const panelY = 68;
  const panelW = 440;
  const lineH = 21;
  const panelH = rowCount * lineH + 20;

  ctx.fillStyle = 'rgba(15, 15, 30, 0.85)';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = 'rgba(196, 181, 253, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.textAlign = 'left';
  const labelW = 260;
  let cy = panelY + 24;

  for (let i = 0; i < REMAPPABLE_ACTIONS.length; i++) {
    const action = REMAPPABLE_ACTIONS[i];
    const selected = controlsMenuIndex === i;
    const listening = selected && rebindingAction === action;

    if (selected) {
      ctx.fillStyle = 'rgba(196, 181, 253, 0.12)';
      ctx.fillRect(panelX + 8, cy - 15, panelW - 16, lineH);
    }

    ctx.fillStyle = selected ? '#e9d5ff' : '#c4b5fd';
    ctx.font = (selected ? 'bold ' : '') + '13px "Courier New", monospace';
    ctx.fillText(ACTION_LABELS[action] || action, panelX + 20, cy);

    if (listening) {
      const pulse = Math.sin(frameCount * 0.15) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 214, 102, ${pulse})`;
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.fillText('PRESS A KEY…', panelX + 20 + labelW, cy);
    } else {
      ctx.fillStyle = '#67e8f9';
      ctx.font = '13px "Courier New", monospace';
      ctx.fillText(formatKeyLabel(getBinding(action)), panelX + 20 + labelW, cy);
    }

    cy += lineH;
  }

  // Reset to Defaults row
  const resetSelected = controlsMenuIndex === REMAPPABLE_ACTIONS.length;
  if (resetSelected) {
    ctx.fillStyle = 'rgba(248, 113, 113, 0.12)';
    ctx.fillRect(panelX + 8, cy - 15, panelW - 16, lineH);
  }
  ctx.fillStyle = resetSelected ? '#fca5a5' : '#f87171';
  ctx.font = (resetSelected ? 'bold ' : '') + '13px "Courier New", monospace';
  ctx.fillText('Reset to Defaults', panelX + 20, cy);

  // Hint
  const promptAlpha = Math.sin(frameCount * 0.05) * 0.4 + 0.6;
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(203, 245, 255, ${promptAlpha})`;
  ctx.font = '12px "Courier New", monospace';
  ctx.fillText(
    rebindingAction
      ? 'Press any key to bind — ESC to cancel'
      : '↑↓ / WS : Select   |   Space / Enter : Rebind   |   ESC : Back',
    W / 2, panelY + panelH + 24
  );

  // Footer
  ctx.fillStyle = 'rgba(58, 58, 94, 0.5)';
  ctx.font = '10px "Courier New", monospace';
  ctx.fillText('Stillpoint — Phase 2', W / 2, H - 20);
  ctx.textAlign = 'left';
}

// ── Settings Screen ───────────────────────────────────────────────────────
function drawSettingsScreen() {
  const titlePulse = drawMenuBackground();

  ctx.textAlign = 'center';

  // Screen title
  ctx.fillStyle = `rgba(196, 181, 253, ${titlePulse})`;
  ctx.font = 'bold 36px "Courier New", monospace';
  ctx.fillText('SETTINGS', W / 2, 60);

  // Settings panel
  const panelX = W / 2 - 200;
  const panelY = 80;
  const panelW = 400;
  const itemH = 50;

  const settings = [
    { label: 'Screen Shake', kind: 'toggle', value: screenShakeEnabled },
    { label: 'Hitstop', kind: 'toggle', value: hitstopEnabled },
    { label: 'Music Volume', kind: 'slider', value: musicVolume },
    { label: 'SFX Volume', kind: 'slider', value: sfxVolume },
  ];

  ctx.fillStyle = 'rgba(15, 15, 30, 0.8)';
  ctx.fillRect(panelX, panelY, panelW, settings.length * itemH + 20);
  ctx.strokeStyle = 'rgba(196, 181, 253, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelW, settings.length * itemH + 20);

  ctx.textAlign = 'left';
  for (let i = 0; i < settings.length; i++) {
    const y = panelY + 10 + i * itemH;
    const isSelected = i === menuSelectionSettings;

    // Highlight
    if (isSelected) {
      ctx.fillStyle = 'rgba(196, 181, 253, 0.1)';
      ctx.fillRect(panelX + 2, y, panelW - 4, itemH - 4);
    }

    // Label
    ctx.fillStyle = isSelected ? '#c4b5fd' : '#6a6a8e';
    ctx.font = `${isSelected ? 'bold ' : ''}16px "Courier New", monospace`;
    ctx.fillText(settings[i].label, panelX + 20, y + 30);

    // Value: ON/OFF for toggles, a percentage for volume sliders
    ctx.textAlign = 'right';
    if (settings[i].kind === 'toggle') {
      ctx.fillStyle = settings[i].value ? '#4ade80' : '#ef4444';
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.fillText(settings[i].value ? '[ ON ]' : '[ OFF ]', panelX + panelW - 20, y + 30);
    } else {
      ctx.fillStyle = '#67e8f9';
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.fillText(`${Math.round(settings[i].value * 100)}%`, panelX + panelW - 20, y + 30);
    }
    ctx.textAlign = 'left';

    // Selection arrow
    if (isSelected) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#c4b5fd';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('▶', panelX - 4, y + 26);
      ctx.textAlign = 'left';
    }
  }

  // Hint
  const promptAlpha = Math.sin(frameCount * 0.05) * 0.4 + 0.6;
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(203, 245, 255, ${promptAlpha})`;
  ctx.font = '13px "Courier New", monospace';
  ctx.fillText('↑↓ / WS : Select   |   ← → : Adjust   |   Space / Enter : Toggle', W / 2, panelY + settings.length * itemH + 50);
  ctx.fillStyle = 'rgba(106, 106, 142, 0.7)';
  ctx.font = '11px "Courier New", monospace';
  ctx.fillText('ESC : Back to Menu', W / 2, panelY + settings.length * itemH + 68);

  // Footer
  ctx.fillStyle = 'rgba(58, 58, 94, 0.5)';
  ctx.font = '10px "Courier New", monospace';
  ctx.fillText('Stillpoint — Phase 2', W / 2, H - 20);
  ctx.textAlign = 'left';
}

// Draw the start menu — routes to the active sub-screen
function drawMenu() {
  switch (menuScreen) {
    case 'main': drawMainMenu(); break;
    case 'play': drawPlayMenu(); break;
    case 'confirm_delete': drawConfirmDeleteScreen(); break;
    case 'controls': drawControlsScreen(); break;
    case 'settings': drawSettingsScreen(); break;
    default: drawMainMenu(); break;
  }
}

