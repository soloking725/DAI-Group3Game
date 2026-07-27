// Shared player VFX + hitbox math (2026-07-19, broadened 2026-07-19).
//
// Extracted out of game/player.js (and game/ability.js's Echo) so the exact
// same geometry/drawing code can be reused by three completely different
// callers:
//   1. player.js's/ability.js's own draw() methods — the legacy fallback
//      path, used whenever no game/animdata.js ANIM_DEFS entry exists for
//      the current attack/state/ability. World-space params (x/y/facing
//      passed explicitly, never implicit `this.*`).
//   2. editor/anim_editor.html's "Dissect from current game" button, which
//      drives this directly (it does NOT load player.js/ability.js) to
//      auto-generate faithful frame-by-frame ANIM_DEFS entries — same
//      shapes, same positions, same hitboxes — as a starting point for
//      hand-editing.
//   3. game/animdata.js's generic POSE_RENDERERS entries (attack_swing,
//      dash_trail, echo_idle, etc.), so any dissected animation renders
//      pixel-identically to the legacy fallback until individual frames are
//      overridden with real art.
//
// Covers: melee attack swings + hitboxes, the player body (idle look),
// Dash/Phase-Dash trails, the wall-slide glow, Echo (Phase Dash afterimage),
// the Stillpoint halo, Shard Shot's aim line + Lv3 beam, and the Graviton
// Surge Gravity Ball. NOT covered (see game/animdata.js's FRAME SHAPE
// comment for why): Void Tether's beam, which is a two-point line to a
// separate target entity rather than a single-entity-relative effect.
//
// Self-contained by design: only takes plain numbers/ctx, no dependency on
// ability.js/physics.js/input.js/etc., so editor/anim_editor.html can load
// just this one extra file instead of the whole game script stack.
//
// Load order: before player.js (index.html / editor/ability_tester.html /
// editor/enemy_test.html / editor/companion_test.html /
// editor/enemy_designer.html), and as anim_editor.html's second script
// (right after animdata.js).

// ── Timing ───────────────────────────────────────────────────────────────
// Single source of truth for the attack swing's frame count — player.js's
// ATTACK_DURATION reads this instead of redefining it, so the editor's
// dissection (which has no access to player.js) always matches.
var ATTACK_VFX_FRAME_COUNT = 12;
var ATTACK_VFX_HEAVY_EXTRA = 4; // heavy attacks run FRAME_COUNT + this, slightly longer
// Same pattern for Dash/Phase Dash — player.js's DASH_DURATION and
// ability.js's PHASE_DASH_DURATION read these instead of redefining them.
// Still `var`, so editor/ability_tester.html's existing live-tuning sliders
// (which poke window.DASH_DURATION/window.PHASE_DASH_DURATION directly)
// keep working exactly as before.
var DASH_VFX_DURATION = 8;
var PHASE_DASH_VFX_DURATION = 8;

// Same clamped formula player.js's draw() already used (2026-07-19 fix for
// a negative-radius canvas crash on heavy attacks, where attackTimer starts
// above ATTACK_VFX_FRAME_COUNT) — heavy attacks get a few frames "frozen"
// at progress 0 (extra windup) before the same 0→1 ramp plays out.
function attackVFXProgress(attackTimer) {
  return Math.max(0, Math.min(1, 1 - attackTimer / ATTACK_VFX_FRAME_COUNT));
}

// ── Hitbox geometry ──────────────────────────────────────────────────────
// Entity-relative, authored for facing === 1 — same convention animdata.js
// already documents for ANIM_DEFS hitboxes ("+x = facing direction;
// mirrored automatically"). Up/down are facing-INDEPENDENT in the original
// game (attacking straight up/down doesn't care which way you're facing),
// so callers must NOT run these through a facing-mirror for those two
// directions — only 'forward' (heavy or not) actually differs by facing.
var ATK_FWD_W = 58, ATK_FWD_H = 28; // widened 2026-07-16 — user feedback: normal attack range felt too short
var ATK_UP_W = 30, ATK_UP_H = 36;
var ATK_DN_W = 40, ATK_DN_H = 24;
var ATK_HEAVY_FWD_W = 44, ATK_HEAVY_FWD_H = 50;

function ATTACK_VFX_HITBOX(dir, heavy, entityWidth, entityHeight) {
  if (dir === 'up') {
    return { x: -5, y: -ATK_UP_H + 8, w: ATK_UP_W + 10, h: ATK_UP_H };
  }
  if (dir === 'down') {
    return { x: -5, y: entityHeight - 4, w: ATK_DN_W + 10, h: ATK_DN_H };
  }
  // forward (default) — heavy (charged) attack gets a taller hitbox
  // starting above the head to match its overhead swing; normal attack
  // stays a tight chest-height poke in front (Enemy_Design.pdf's "To Fix"
  // note, addressed 2026-07-16).
  if (heavy) {
    return { x: entityWidth - 6, y: -ATK_HEAVY_FWD_H + 24, w: ATK_HEAVY_FWD_W, h: ATK_HEAVY_FWD_H };
  }
  return { x: entityWidth, y: 6, w: ATK_FWD_W, h: ATK_FWD_H };
}

// World-space version for the legacy (no-ANIM_DEFS) fallback path — mirrors
// by facing only for 'forward', matching the original hand-coded behavior
// exactly (up/down never depended on facing).
function ATTACK_VFX_WORLD_HITBOX(dir, heavy, x, y, width, height, facing) {
  const hb = ATTACK_VFX_HITBOX(dir, heavy, width, height);
  const worldX = (dir === 'forward')
    ? (facing === 1 ? x + hb.x : x + width - hb.x - hb.w)
    : x + hb.x;
  return { x: worldX, y: y + hb.y, width: hb.w, height: hb.h, dir };
}

// ── Swing VFX ────────────────────────────────────────────────────────────
// The exact hand-tuned drawing code that used to live inline in
// player.js's draw(), parameterized instead of reading `this.*`. Because
// position/facing are explicit args rather than assumed from a
// pre-translated ctx, this works unmodified whether the caller draws in
// world space (player.js, ctx untouched) or entity-local space (a pose
// renderer where ctx is already translated/mirrored by Animator/the
// editor, called with x=0, y=0, facing=1).
function drawAttackVFX(ctx, dir, heavy, progress, x, y, width, height, facing) {
  if (dir === 'up') {
    // ── Up-slash: vertical arc in facing direction ──
    const originX = x + width / 2;
    const originY = y + height * 0.3;
    const arcLen = 50;
    const arcSpan = Math.PI * 0.65 * Math.min(1, progress * 1.5);
    const f = facing || 1;

    const leadAngle = -Math.PI / 2 + f * arcSpan;
    ctx.strokeStyle = `rgba(255, 248, 255, ${0.9 - progress * 0.5})`;
    ctx.lineWidth = 3.5 - progress * 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX + Math.cos(leadAngle) * arcLen, originY + Math.sin(leadAngle) * arcLen);
    ctx.stroke();

    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      const a = -Math.PI / 2 + t * f * arcSpan;
      const lineAlpha = (0.12 + t * 0.35) * (1 - progress * 0.6);
      ctx.strokeStyle = `rgba(224, 215, 255, ${lineAlpha})`;
      ctx.lineWidth = 1 + t * 1.5;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX + Math.cos(a) * arcLen, originY + Math.sin(a) * arcLen);
      ctx.stroke();
    }

    if (progress > 0.35) {
      const flashAlpha = Math.max(0, Math.sin(progress * Math.PI) * 1.2);
      ctx.fillStyle = `rgba(255, 250, 255, ${flashAlpha * 0.9})`;
      ctx.beginPath();
      ctx.arc(originX + Math.cos(leadAngle) * arcLen, originY + Math.sin(leadAngle) * arcLen, 4 + progress * 5, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (dir === 'down') {
    // ── Down-slam: impact burst below player ──
    const originX = x + width / 2;
    const originY = y + height;
    const burstRadius = 35 * Math.min(1, progress * 2);

    // Radial impact lines
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const lineAlpha = (0.3 - progress * 0.2) * (1 - progress * 0.4);
      ctx.strokeStyle = `rgba(255, 248, 255, ${Math.max(0, lineAlpha)})`;
      ctx.lineWidth = 2 - progress;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX + Math.cos(a) * burstRadius, originY + Math.sin(a) * burstRadius * 0.5);
      ctx.stroke();
    }

    // Impact flash
    if (progress < 0.6) {
      const flashAlpha = Math.max(0, 1 - progress / 0.6) * 0.7;
      ctx.fillStyle = `rgba(255, 250, 255, ${flashAlpha})`;
      ctx.beginPath();
      ctx.ellipse(originX, originY, burstRadius * 1.2, burstRadius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (!heavy) {
    // ── Normal attack: tight forward poke, chest height, minimal arc
    // (Hollow-Knight-style — in front of you, not overhead). Matches
    // the "To Fix" note in Enemy_Design.pdf, addressed 2026-07-16.
    const originX = facing === 1 ? x + width : x;
    const originY = y + height * 0.42;
    const reach = 40 * Math.min(1, progress * 2); // matches the widened ATK_FWD_W
    const tipX = originX + facing * reach;
    ctx.strokeStyle = `rgba(255, 248, 255, ${0.9 - progress * 0.5})`;
    ctx.lineWidth = 3 - progress * 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(originX, originY - 3);
    ctx.lineTo(tipX, originY);
    ctx.moveTo(originX, originY + 3);
    ctx.lineTo(tipX, originY);
    ctx.stroke();

    if (progress > 0.25) {
      const flashAlpha = Math.max(0, Math.sin(progress * Math.PI) * 1.1);
      ctx.fillStyle = `rgba(255, 250, 255, ${flashAlpha * 0.85})`;
      ctx.beginPath();
      ctx.arc(tipX, originY, 3 + progress * 3, 0, Math.PI * 2);
      ctx.fill();
    }

  } else {
    // ── Charged (heavy) attack: overhead swing arc ──
    const originX = facing === 1 ? x + width : x;
    const originY = y + height * 0.42;
    const arcLen = 48;
    const arcSpan = Math.PI * 0.72 * Math.min(1, progress * 1.5);
    const startAngle = facing === 1 ? -Math.PI * 0.62 : -Math.PI * 0.38;

    const leadAngle = startAngle + facing * arcSpan;
    ctx.strokeStyle = `rgba(255, 248, 255, ${0.9 - progress * 0.5})`;
    ctx.lineWidth = 3.5 - progress * 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX + Math.cos(leadAngle) * arcLen, originY + Math.sin(leadAngle) * arcLen);
    ctx.stroke();

    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      const a = startAngle + t * facing * arcSpan;
      const lineAlpha = (0.12 + t * 0.35) * (1 - progress * 0.6);
      ctx.strokeStyle = `rgba(224, 215, 255, ${lineAlpha})`;
      ctx.lineWidth = 1 + t * 1.5;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX + Math.cos(a) * arcLen, originY + Math.sin(a) * arcLen);
      ctx.stroke();
    }

    ctx.strokeStyle = `rgba(196, 181, 253, ${0.3 * (1 - progress)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const a = startAngle + t * facing * arcSpan;
      const len = arcLen * (0.7 + t * 0.3);
      const px = originX + Math.cos(a) * len;
      const py = originY + Math.sin(a) * len;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    if (progress > 0.35) {
      const flashAlpha = Math.max(0, Math.sin(progress * Math.PI) * 1.2);
      ctx.fillStyle = `rgba(255, 250, 255, ${flashAlpha * 0.9})`;
      ctx.beginPath();
      ctx.arc(originX + Math.cos(leadAngle) * arcLen, originY + Math.sin(leadAngle) * arcLen, 4 + progress * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.lineCap = 'butt';
  ctx.lineWidth = 1;
}

// ── Player body (idle look) ─────────────────────────────────────────────
// From player.js's draw() "── Body ──" block — the base rect + chest core +
// eyes drawn every frame regardless of state. Movement-state poses
// (dash/phasedash/wallslide) call this first, then layer their own effect
// on top, faithfully reproducing what the legacy code always did (the body
// was never hidden during those states, just had something extra drawn
// alongside it).
function drawPlayerBody(ctx, x, y, width, height, facing, ducking, stillpointActive) {
  const bodyColor = stillpointActive ? '#a5f3fc' : '#c4b5fd';
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x, y, width, height);

  // Glowing chest core (always present, brighter during Stillpoint)
  const coreAlpha = stillpointActive ? 0.95 : 0.55;
  const coreY = ducking ? y + 4 : y + 12;
  ctx.fillStyle = `rgba(${stillpointActive ? '103,232,249' : '224,215,255'},${coreAlpha})`;
  ctx.fillRect(x + 8, coreY, 8, 8);

  // Eyes
  ctx.fillStyle = '#0a0a0f';
  const eyeX = facing === 1 ? x + 14 : x + 4;
  const eyeY = ducking ? y + 4 : y + 8;
  ctx.fillRect(eyeX, eyeY, 6, 6);
}

// ── Dash trail (chain-aware) ────────────────────────────────────────────
// From player.js:930-955. `chainTier` replaces `this.dashChain` (1 to
// DASH_VFX_CHAIN_MAX). player.js's DASH_CHAIN_MAX reads this constant
// instead of redefining it, same single-source-of-truth pattern as
// ATTACK_VFX_FRAME_COUNT/ATTACK_DURATION.
var DASH_VFX_CHAIN_MAX = 3;
function drawDashTrail(ctx, chainTier, vx, x, y, width, height) {
  const chainIntensity = chainTier / DASH_VFX_CHAIN_MAX; // 0-1
  const trailCount = 2 + chainTier; // more ghosts on higher chains
  const baseAlpha = 0.25 + chainIntensity * 0.25;
  // Color shifts from purple → cyan as chain increases
  const r = Math.round(196 - chainIntensity * 93);
  const g = Math.round(181 + chainIntensity * 51);
  const b = Math.round(253 - chainIntensity * 4);
  const color = `rgba(${r}, ${g}, ${b}`;
  for (let i = 1; i <= trailCount; i++) {
    ctx.globalAlpha = baseAlpha - i * 0.05;
    ctx.fillStyle = `${color}, ${baseAlpha - i * 0.05})`;
    ctx.fillRect(x - vx * i * 1.2, y, width, height);
  }
  ctx.globalAlpha = 1;
  // Chain sparkles at max chain
  if (chainTier >= DASH_VFX_CHAIN_MAX) {
    ctx.fillStyle = 'rgba(103, 232, 249, 0.6)';
    for (let i = 0; i < 3; i++) {
      const sx = x + Math.random() * width;
      const sy = y + Math.random() * height;
      ctx.fillRect(sx, sy, 2, 2);
    }
  }
}

// ── Phase Dash trail ─────────────────────────────────────────────────────
// From player.js:957-967. Level-invariant (no chainTier — the Echo, not
// this trail, is what changes by Phase Dash level).
function drawPhaseDashTrail(ctx, vx, x, y, width, height) {
  for (let i = 1; i <= 4; i++) {
    ctx.globalAlpha = 0.45 - i * 0.09;
    ctx.fillStyle = '#a78bfa';
    ctx.fillRect(x - vx * i * 1.8, y, width, height);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(196, 181, 253, 0.18)';
  ctx.fillRect(x - 5, y - 5, width + 10, height + 10);
}

// ── Wall slide glow ──────────────────────────────────────────────────────
// From player.js:1034-1057. `phase` replaces the live `frameCount * 0.15`
// sine input — the real game passes that in at call time; the dissector
// fabricates a synthetic sweep across a full cycle. Positioned by
// `wallNormal` (which side the wall is on), NOT `facing` — see the
// mirroring caveat in this file's header/attack hitbox section; the
// dissected/anim-driven path can only mirror by facing, so a wall-slide
// where facing != wallNormal will position slightly differently than the
// legacy fallback. Rare in practice (you almost always face the wall
// you're sliding on) and not worth a bespoke mirror axis for.
function drawWallSlideGlow(ctx, wallNormal, x, y, width, height, phase) {
  const glowPulse = Math.sin(phase) * 0.15 + 0.5;
  const cx = x + width / 2;
  const gx = cx + wallNormal * width * 0.3;
  const gy = y + height * 0.3;
  const gradient = ctx.createRadialGradient(gx, gy, 0, gx, gy, width * 1.5);
  gradient.addColorStop(0, `rgba(196, 181, 253, ${glowPulse})`);
  gradient.addColorStop(1, 'rgba(196, 181, 253, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(cx - width * 1.5, y - height * 0.5, width * 3, height * 2.5);

  ctx.fillStyle = `rgba(203, 245, 255, ${glowPulse * 0.6})`;
  for (let i = 0; i < 3; i++) {
    const sparkX = x + width / 2 + wallNormal * (width / 2 - 1);
    const sparkY = y + (i + 1) * (height / 4) + Math.sin(phase * 2 + i) * 2;
    ctx.fillRect(sparkX - 1, sparkY, 2, 2);
  }
}

// ── Echo (Phase Dash afterimage) ────────────────────────────────────────
// From ability.js:140-170's Echo.draw(), split at the swingFlash>0 branch.
// `alpha`/`pulse` replace the live life/maxLife/pulseTimer-derived values;
// `t` replaces the live swingFlash/10 countdown fraction.
var ECHO_VFX_DISTRACT_RADIUS = 150; // ability.js's ECHO_DISTRACT_RADIUS reads this — single source of truth
function drawEchoIdle(ctx, x, y, width, height, alpha, pulse) {
  ctx.globalAlpha = alpha + pulse;
  ctx.fillStyle = '#c4b5fd';
  ctx.fillRect(x, y, width, height);

  ctx.strokeStyle = `rgba(196, 181, 253, ${alpha * 0.3})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + width / 2, y + height / 2, ECHO_VFX_DISTRACT_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 1;
}
function drawEchoSwing(ctx, x, y, width, height, t) {
  const cx = x + width / 2, cy = y + height / 2;
  ctx.strokeStyle = `rgba(196, 181, 253, ${0.9 * t})`;
  ctx.lineWidth = 3 * t;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, width * 0.9, -Math.PI * 0.3, Math.PI * 0.3);
  ctx.stroke();
  ctx.lineWidth = 1;
}

// ── Stillpoint halo ──────────────────────────────────────────────────────
// From player.js:847-859. Level-invariant (radius/color/pulse identical at
// every abilityLevel('stillpoint')). The legacy code's `pipFrac` local was
// computed but never actually used in the drawing math — dropped here.
function drawStillpointHalo(ctx, x, y, width, height, pulse) {
  ctx.fillStyle = `rgba(103, 232, 249, ${0.12 * pulse})`;
  ctx.fillRect(x - 8, y - 8, width + 16, height + 16);
  ctx.strokeStyle = `rgba(103, 232, 249, ${0.55 * pulse})`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 3, y - 3, width + 6, height + 6);
  ctx.lineWidth = 1;
}

// ── Shard Shot aim line ──────────────────────────────────────────────────
// From player.js:993-1013. A dotted straight trajectory line, stepped by a
// fixed horizontal speed (mirrored by facing) and `aimVy` (the live
// vertical launch velocity, tiltable by holding Up/Down — see
// SHARD_AIM_TILT_RATE in ability.js). Not an "arc" despite drawing radial
// dots — each dot just marks a step along a straight line.
function drawShardAimLine(ctx, x, y, width, height, facing, aimVy, pulse) {
  let sx = (facing === 1 ? x + width : x - 8) + 4;
  let sy = y + height / 2 + 4;
  const svx = 8 * (facing || 1);
  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 6;
  for (let i = 0; i < 36; i++) {
    sx += svx;
    sy += aimVy;
    if (i % 3 !== 0) continue; // dotted, not solid
    ctx.globalAlpha = pulse * (1 - i / 44);
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

// ── Shard Shot Lv3 beam ──────────────────────────────────────────────────
// From player.js:1019-1032. Takes explicit endpoints — the real game
// resolves them via game.js's getBeamSegment(player) (player position +
// facing + the live beamAngle tilt); this function only draws the line.
function drawShardBeam(ctx, x1, y1, x2, y2, pulse) {
  ctx.strokeStyle = `rgba(103, 232, 249, ${0.85 * pulse})`;
  ctx.lineWidth = 4;
  ctx.shadowColor = '#67e8f9';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;
}

// ── Graviton Surge Gravity Ball ──────────────────────────────────────────
// From player.js:861-878. Drawn centered on the ball's OWN position
// (gravitonBallX/Y), not the player's — the ball is a detached, self-moving
// entity (see game/animdata.js's `player_gravball` for how it gets its own
// Animator instead of reusing the player's).
function drawGravityBall(ctx, x, y, pullRadius, coreRadius, pulse) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, pullRadius);
  grad.addColorStop(0, `rgba(244, 114, 182, ${0.5 * pulse})`);
  grad.addColorStop(0.15, `rgba(244, 114, 182, ${0.12 * pulse})`);
  grad.addColorStop(1, 'rgba(244, 114, 182, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x - pullRadius, y - pullRadius, pullRadius * 2, pullRadius * 2);
  ctx.fillStyle = `rgba(244, 114, 182, ${0.9 * pulse})`;
  ctx.beginPath();
  ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
  ctx.fill();
}

// Debug-tool access (same pattern as animdata.js's window.ANIM_DEFS)
if (typeof window !== 'undefined') {
  window.ATTACK_VFX_FRAME_COUNT = ATTACK_VFX_FRAME_COUNT;
  window.ATTACK_VFX_HEAVY_EXTRA = ATTACK_VFX_HEAVY_EXTRA;
  window.DASH_VFX_DURATION = DASH_VFX_DURATION;
  window.PHASE_DASH_VFX_DURATION = PHASE_DASH_VFX_DURATION;
  window.attackVFXProgress = attackVFXProgress;
  window.ATTACK_VFX_HITBOX = ATTACK_VFX_HITBOX;
  window.ATTACK_VFX_WORLD_HITBOX = ATTACK_VFX_WORLD_HITBOX;
  window.drawAttackVFX = drawAttackVFX;
  window.drawPlayerBody = drawPlayerBody;
  window.DASH_VFX_CHAIN_MAX = DASH_VFX_CHAIN_MAX;
  window.drawDashTrail = drawDashTrail;
  window.drawPhaseDashTrail = drawPhaseDashTrail;
  window.drawWallSlideGlow = drawWallSlideGlow;
  window.ECHO_VFX_DISTRACT_RADIUS = ECHO_VFX_DISTRACT_RADIUS;
  window.drawEchoIdle = drawEchoIdle;
  window.drawEchoSwing = drawEchoSwing;
  window.drawStillpointHalo = drawStillpointHalo;
  window.drawShardAimLine = drawShardAimLine;
  window.drawShardBeam = drawShardBeam;
  window.drawGravityBall = drawGravityBall;
}
