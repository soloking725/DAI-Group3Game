// Animation / hitbox data model + runtime (2026-07-16).
// See Plans/animation_editor_plan.md — this is "part 1 + part 2" of that
// plan: the timeline/hitbox data model AND raster-image frame support.
//
// WHAT THIS IS
//   ANIM_DEFS — every animation as pure data: a list of frames, each with a
//   duration, a visual (procedural pose OR uploaded image), an optional
//   hurtbox, optional damage hitboxes, and an optional combo-cancel window.
//   The Animator class plays them back. editor/anim_editor.html edits this
//   data visually and exports paste-ready JSON.
//
// WHAT THIS COVERS (2026-07-19)
//   Bridged into the real game: player melee attacks (all 4 directions +
//   heavy), idle/run/jump/fall/duck (hook only — no built-in art, author
//   these from scratch), Dash (chain-aware), Phase Dash's trail, Wall
//   Slide's glow, Echo (Phase Dash's afterimage — idle look + Lv3+ swing),
//   Stillpoint's halo, Shard Shot's aim line + Lv3 beam, and the Graviton
//   Surge Gravity Ball. Every one of these is additive: with no matching key
//   in ANIM_DEFS, the game falls back to its original hardcoded draw
//   (game/attackVFX.js's extracted functions) with zero behavior change.
//   editor/anim_editor.html's "Dissect from current game" button
//   auto-generates a faithful starting ANIM_DEFS entry for most of these
//   directly from that same fallback code — see its own comments for which.
//
// WHAT THIS DOESN'T COVER
//   Enemies (a separate, unrelated data-driven system — ComposedEnemy in
//   enemy.js/area.js). The gravity FLIP itself (Graviton Surge) has no VFX
//   in the game at all to bridge. Void Tether's beam is a two-point line to
//   a *different* entity (not the player), so it doesn't fit this
//   single-entity model — see `void_tether_beam` below for its lighter,
//   style-only (not position) authoring surface instead.
//
// FRAME SHAPE
//   {
//     duration: 4,              // frames at 60fps
//     pose: 'idle',             // key into POSE_RENDERERS (procedural draw) …
//     image: 'data:image/…',    // … OR an uploaded drawing (data URL; wins over pose)
//     imageScale: 1,            // optional draw scale for the image
//     hurtbox: {x,y,w,h},       // where THIS entity can be hit (entity-relative,
//                               //   +x = facing direction; mirrored automatically)
//     hitboxes: [{x,y,w,h, damage, knockbackX, knockbackY, hitStun}], // damage boxes
//     cancelableFrom: false,    // true = a queued next-action may start during
//                               //   this frame (the combo-chain window)
//     events: [{type:'spawnProjectile'|'cameraShake'|'sfx', ...params}],
//                               // side effects that fire once, the tick this
//                               //   frame is FIRST entered (2026-07-27) — see
//                               //   Animator.consumeFrameEvents() below. Read
//                               //   by boss.js's frame-event consumer; opt-in
//                               //   per entity/attack, nothing else changes
//                               //   behavior if a frame has none.
//
//     // Pose-specific fields (2026-07-19) — only read by the matching pose
//     // function in POSE_RENDERERS below; irrelevant/ignored otherwise:
//     swingDir: 'forward',      // attack_swing: 'forward' | 'up' | 'down'
//     swingHeavy: false,        // attack_swing: charged-attack variant?
//     progress: 0.5,            // attack_swing: 0-1 through the swing
//     chainTier: 1,             // dash_trail: 1-3, dash chain intensity
//     wallNormal: 1,            // wallslide_glow: which side the wall is on
//     phase: 0,                 // wallslide_glow: sine phase (radians)
//     alpha: 0.4, pulse: 0,     // echo_idle: life-based fade + flicker
//     t: 1,                     // echo_swing: swingFlash/10 countdown fraction
//     aimVy: 0,                 // shard_aim: vertical aim tilt
//     beamX: 40, beamY: 0,      // shard_beam: endpoint offset (entity-relative)
//     pullRadius: 160,          // gravity_ball: pull-field radius
//     coreRadius: 10,           // gravity_ball: core dot radius
//   }
//
// STYLE-ONLY DEFS (not entity-based) — Void Tether's beam
//   `ANIM_DEFS.void_tether_beam` doesn't have `entity`/hitboxes/hurtbox at
//   all — its frames are just `{ duration, color, lineWidth }`. game.js's
//   beam-draw block (the only place that knows the live target) reads this
//   for STYLE only; the two endpoints stay fully live/dynamic regardless of
//   what's authored. Played back via a small standalone Animator with no
//   real entity (position is meaningless for style playback).
//
// COORDINATES: hitboxes/hurtboxes are relative to the entity's top-left,
// authored for facing === 1 (right). The Animator mirrors x for facing -1
// using the entity's width, so one authored side covers both.

const ANIM_OVERRIDES_KEY = 'stillpoint_anim_overrides_v1';

const ANIM_DEFS = {
  // ── Starter defs — mirror the live player attack constants so the editor
  // opens with real data. Durations sum to player.js's ATTACK_DURATION (12)
  // and the hitbox matches ATK_FWD_W/H relative to a 24x32 player. Poses use
  // 'attack_swing' (not 'attack_windup'/'attack_strike'/'attack_recover' —
  // those three draw a plain solid-color box, meant for a full-body pose
  // system, not this slash-arc overlay) so the visual stays pixel-matched to
  // the legacy drawAttackVFX() fallback per the comment in player.js's
  // draw(). `progress` is each frame's midpoint through the swing (0-1,
  // matching attackVFXProgress()) since a pose is static for its frame's
  // whole duration, not continuously interpolated.
  player_attack_forward: {
    entity: 'player',
    loop: false,
    frames: [
      { duration: 3, pose: 'attack_swing', swingDir: 'forward', progress: 0.1, hurtbox: { x: 0, y: 0, w: 24, h: 32 } },
      { duration: 5, pose: 'attack_swing', swingDir: 'forward', progress: 0.45, hurtbox: { x: 0, y: 0, w: 24, h: 32 },
        hitboxes: [{ x: 24, y: 6, w: 58, h: 28, damage: 1, knockbackX: 5, knockbackY: -4 }] },
      { duration: 4, pose: 'attack_swing', swingDir: 'forward', progress: 0.8, hurtbox: { x: 0, y: 0, w: 24, h: 32 }, cancelableFrom: true },
    ],
  },
  player_attack_up: {
    entity: 'player',
    loop: false,
    frames: [
      { duration: 3, pose: 'attack_swing', swingDir: 'up', progress: 0.1, hurtbox: { x: 0, y: 0, w: 24, h: 32 } },
      { duration: 5, pose: 'attack_swing', swingDir: 'up', progress: 0.45, hurtbox: { x: 0, y: 0, w: 24, h: 32 },
        hitboxes: [{ x: -5, y: -28, w: 40, h: 36, damage: 1, knockbackX: 3, knockbackY: -12, noMirror: true }] },
      { duration: 4, pose: 'attack_swing', swingDir: 'up', progress: 0.8, hurtbox: { x: 0, y: 0, w: 24, h: 32 }, cancelableFrom: true },
    ],
  },
};

// ── Procedural poses ─────────────────────────────────────────────────────────
// A pose is just a draw function: (ctx, entity, frame) with the canvas
// already translated to the entity's top-left and flipped for facing. This
// is how animations work WITHOUT raster art — add a named function here,
// reference it from a frame's `pose`. If/when a drawing is uploaded for
// that frame, the image simply wins and the pose is ignored.
const POSE_RENDERERS = {
  idle(ctx, e) {
    ctx.fillStyle = e.color || '#c4b5fd';
    ctx.fillRect(0, 0, e.width, e.height);
  },
  attack_windup(ctx, e) {
    ctx.fillStyle = e.color || '#c4b5fd';
    ctx.fillRect(-2, 2, e.width, e.height - 2); // slight crouch-back
  },
  attack_strike(ctx, e) {
    ctx.fillStyle = e.color || '#c4b5fd';
    ctx.fillRect(2, 0, e.width, e.height);      // lunge forward
  },
  attack_recover(ctx, e) {
    ctx.fillStyle = e.color || '#c4b5fd';
    ctx.fillRect(0, 1, e.width, e.height - 1);
  },
  // Renders any attack_forward/up/down(/heavy) swing frame using the exact
  // same drawing code as the legacy fallback (game/attackVFX.js's
  // drawAttackVFX) — so a dissected animation looks pixel-identical to the
  // real game until a frame is given custom art, at which point
  // Animator.draw()'s frame.image-wins-over-pose rule takes over
  // automatically. ctx is already translated to the entity's top-left and
  // mirrored for facing (Animator's contract), hence x=0, y=0, facing=1.
  attack_swing(ctx, e, frame) {
    if (typeof drawAttackVFX !== 'function') return;
    drawAttackVFX(ctx, frame.swingDir, !!frame.swingHeavy, frame.progress || 0, 0, 0, e.width, e.height, 1);
  },
  // Movement-state poses (2026-07-19) — each draws the base body first
  // (matching the legacy code, which never hid the body during these
  // states, just added an effect alongside it), then its own overlay.
  dash_trail(ctx, e, frame) {
    if (typeof drawPlayerBody !== 'function') return;
    drawPlayerBody(ctx, 0, 0, e.width, e.height, 1, false, false);
    drawDashTrail(ctx, frame.chainTier || 1, 0, 0, 0, e.width, e.height);
  },
  phasedash_trail(ctx, e, frame) {
    if (typeof drawPlayerBody !== 'function') return;
    drawPlayerBody(ctx, 0, 0, e.width, e.height, 1, false, false);
    drawPhaseDashTrail(ctx, 0, 0, 0, e.width, e.height);
  },
  wallslide_glow(ctx, e, frame) {
    if (typeof drawPlayerBody !== 'function') return;
    drawPlayerBody(ctx, 0, 0, e.width, e.height, 1, false, false);
    drawWallSlideGlow(ctx, frame.wallNormal || 1, 0, 0, e.width, e.height, frame.phase || 0);
  },
  // Echo poses (2026-07-19) — self-contained, no drawPlayerBody call (Echo
  // isn't the player).
  echo_idle(ctx, e, frame) {
    if (typeof drawEchoIdle !== 'function') return;
    drawEchoIdle(ctx, 0, 0, e.width, e.height, frame.alpha ?? 0.4, frame.pulse ?? 0);
  },
  echo_swing(ctx, e, frame) {
    if (typeof drawEchoSwing !== 'function') return;
    drawEchoSwing(ctx, 0, 0, e.width, e.height, frame.t ?? 1);
  },
  // Overlay poses (2026-07-19) — Stillpoint halo / Shard Shot aim+beam draw
  // ALONGSIDE whatever body/attack pose is already active, never instead of
  // it, so these deliberately don't call drawPlayerBody.
  stillpoint_halo(ctx, e, frame) {
    if (typeof drawStillpointHalo !== 'function') return;
    drawStillpointHalo(ctx, 0, 0, e.width, e.height, frame.pulse ?? 1);
  },
  shard_aim(ctx, e, frame) {
    if (typeof drawShardAimLine !== 'function') return;
    drawShardAimLine(ctx, 0, 0, e.width, e.height, 1, frame.aimVy ?? 0, frame.pulse ?? 1);
  },
  shard_beam(ctx, e, frame) {
    if (typeof drawShardBeam !== 'function') return;
    drawShardBeam(ctx, 0, 0, frame.beamX ?? 40, frame.beamY ?? 0, frame.pulse ?? 1);
  },
  // Gravity Ball (2026-07-19) — its own detached entity (see player.js's
  // gravBallEntity/gravBallAnimator), drawn centered on itself.
  gravity_ball(ctx, e, frame) {
    if (typeof drawGravityBall !== 'function') return;
    drawGravityBall(ctx, e.width / 2, e.height / 2, frame.pullRadius || e.width / 2, frame.coreRadius ?? 10, frame.pulse ?? 1);
  },
};

// ── Raster frame cache ───────────────────────────────────────────────────────
// Uploaded drawings live in frame.image as either a raw `data:` URL
// (self-contained — what a paste-into-source export produces, and what
// legacy saved frames still have) or an IndexedDB id from
// game/animImageStore.js (what anim_editor.html now saves live overrides
// as, to avoid the old base64-in-localStorage quota crash). Decoded Image
// objects are cached here either way so draw never constructs one per
// frame, and callers never need to know or care which form a given frame
// used — this always hands back an Image synchronously (possibly still
// mid-load for the IndexedDB case; callers already check
// img.complete/naturalWidth before drawing, same as any other image).
const _animImageCache = {};
function getAnimImage(ref) {
  let img = _animImageCache[ref];
  if (img) return img;
  img = new Image();
  _animImageCache[ref] = img;
  if (ref.startsWith('data:')) {
    img.src = ref;
  } else if (typeof AnimImageStore !== 'undefined') {
    AnimImageStore.get(ref).then((dataUrl) => { if (dataUrl) img.src = dataUrl; })
      .catch(() => {}); // IndexedDB unavailable/blocked — frame just stays blank, same as a 404'd image
  }
  return img;
}
// anim_editor.html calls this right after a fresh upload so the editor's
// own preview shows the image instantly, instead of round-tripping through
// IndexedDB (write, then immediately read back) before it can draw anything.
function primeAnimImage(id, dataUrl) {
  const img = new Image();
  img.src = dataUrl;
  _animImageCache[id] = img;
  return img;
}

// ── Editor overrides ─────────────────────────────────────────────────────────
// anim_editor.html saves work-in-progress to localStorage; the game (and
// enemy_test.html) applies it on load, so "Test in Arena" needs no reload
// dance and no code edits. Overrides merge per-key (whole animation
// replaced), never per-frame.
function applyAnimOverrides() {
  try {
    const raw = localStorage.getItem(ANIM_OVERRIDES_KEY);
    if (!raw) return;
    const overrides = JSON.parse(raw);
    for (const key in overrides) ANIM_DEFS[key] = overrides[key];
  } catch (e) { /* private browsing / bad JSON — run with built-ins */ }
}
applyAnimOverrides();

// ── Animator ─────────────────────────────────────────────────────────────────
// One per entity (player, an enemy, the Child). Usage:
//   this.animator = new Animator(this);
//   this.animator.play('player_attack_forward');   // restarts unless already playing
//   this.animator.update(timeScale);               // once per frame
//   this.animator.draw(ctx);                       // translated+mirrored pose/image
//   this.animator.currentHitboxes();               // world-space damage boxes (or [])
//   this.animator.canCancel();                     // inside a combo-cancel window?
//   this.animator.consumeFrameEvents();             // authored side effects for the frame
//                                                    //   just entered (or [] most ticks)
//   this.animator.done                             // non-looping anim finished?
class Animator {
  constructor(entity) {
    this.entity = entity;
    this.key = null;
    this.def = null;
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.done = false;
    this._frameEntered = false; // see consumeFrameEvents() below
  }

  play(key, restart = false) {
    if (this.key === key && !restart && !this.done) return;
    this.key = key;
    this.def = ANIM_DEFS[key] || null;
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.done = !this.def;
    this._frameEntered = true; // frame 0 counts as "just entered" too
    if (!this.def) console.warn(`[animdata] no animation named "${key}"`);
  }

  update(timeScale = 1) {
    if (!this.def || this.done) return;
    this.frameTimer += timeScale;
    const frame = this.def.frames[this.frameIndex];
    if (this.frameTimer >= (frame.duration || 4)) {
      this.frameTimer = 0;
      this.frameIndex++;
      if (this.frameIndex >= this.def.frames.length) {
        if (this.def.loop) this.frameIndex = 0;
        else { this.frameIndex = this.def.frames.length - 1; this.done = true; }
      }
      this._frameEntered = true;
    }
  }

  // Authored side effects (spawn projectile / camera shake / sfx — see the
  // FRAME SHAPE comment up top) for whichever frame was JUST entered this
  // tick. Returns [] on every other tick so a multi-frame-duration frame
  // doesn't refire its events once per tick it sits on. Consumers (boss.js)
  // call this once per their own update(), same cadence as currentHitboxes().
  consumeFrameEvents() {
    if (!this._frameEntered) return [];
    this._frameEntered = false;
    const frame = this.currentFrame();
    return (frame && frame.events) || [];
  }

  currentFrame() {
    return this.def ? this.def.frames[this.frameIndex] : null;
  }

  // World-space damage hitboxes for the current frame (empty array if none).
  // Mirrors authored-facing-right boxes across the entity for facing -1,
  // unless the hitbox is flagged `noMirror` (up/down swings — facing-
  // independent, matching attackVFX.js's ATTACK_VFX_HITBOX contract).
  currentHitboxes() {
    const frame = this.currentFrame();
    if (!frame || !frame.hitboxes) return [];
    const e = this.entity;
    return frame.hitboxes.map((hb) => ({
      x: (e.facing === 1 || hb.noMirror) ? e.x + hb.x : e.x + e.width - hb.x - hb.w,
      y: e.y + hb.y,
      width: hb.w,
      height: hb.h,
      damage: hb.damage ?? 1,
      knockbackX: hb.knockbackX ?? 4,
      knockbackY: hb.knockbackY ?? -3,
      hitStun: hb.hitStun ?? 10,
    }));
  }

  // World-space hurtbox (falls back to the entity's own AABB).
  currentHurtbox() {
    const frame = this.currentFrame();
    const e = this.entity;
    if (!frame || !frame.hurtbox) return { x: e.x, y: e.y, width: e.width, height: e.height };
    const hb = frame.hurtbox;
    return {
      x: e.facing === 1 ? e.x + hb.x : e.x + e.width - hb.x - hb.w,
      y: e.y + hb.y,
      width: hb.w,
      height: hb.h,
    };
  }

  canCancel() {
    const frame = this.currentFrame();
    return !!(frame && frame.cancelableFrom);
  }

  // Draws the current frame at the entity's position, mirrored for facing.
  draw(ctx) {
    const frame = this.currentFrame();
    if (!frame) return;
    const e = this.entity;
    ctx.save();
    ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
    if (e.facing === -1) ctx.scale(-1, 1);
    ctx.translate(-e.width / 2, -e.height / 2);
    if (frame.image) {
      const img = getAnimImage(frame.image);
      if (img.complete && img.naturalWidth > 0) {
        const scale = frame.imageScale || 1;
        const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
        // Anchor the drawing's bottom-center to the entity's bottom-center,
        // so art larger than the collision box sits on the ground correctly.
        ctx.drawImage(img, e.width / 2 - w / 2, e.height - h, w, h);
      }
    } else if (frame.pose && POSE_RENDERERS[frame.pose]) {
      POSE_RENDERERS[frame.pose](ctx, e, frame);
    }
    ctx.restore();
  }
}

// Debug-tool access (same pattern as area.js's window.AREAS)
if (typeof window !== 'undefined') {
  window.ANIM_DEFS = ANIM_DEFS;
  window.POSE_RENDERERS = POSE_RENDERERS;
  window.Animator = Animator;
}
