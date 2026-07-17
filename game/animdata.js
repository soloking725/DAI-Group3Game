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
// WHAT THIS IS NOT (yet)
//   The player/enemies still draw and hit-check the original procedural way
//   (player.js's getAttackHitbox() etc. stay authoritative). Migrating an
//   entity to ANIM_DEFS is deliberate per-animation work, not a flip: give
//   it an Animator, play the right key from its update(), and read
//   hitboxes from animator.currentHitboxes() instead of the hardcoded
//   constants. The two starter defs below mirror the CURRENT player attack
//   values as a reference (and so the editor opens with something real).
//
// FRAME SHAPE
//   {
//     duration: 4,              // frames at 60fps
//     pose: 'idle',             // key into POSE_RENDERERS (procedural draw) …
//     image: 'data:image/…',    // … OR an uploaded drawing (data URL; wins over pose)
//     imageScale: 1,            // optional draw scale for the image
//     hurtbox: {x,y,w,h},       // where THIS entity can be hit (entity-relative,
//                               //   +x = facing direction; mirrored automatically)
//     hitboxes: [{x,y,w,h, damage, knockbackX, knockbackY}], // damage-dealing boxes
//     cancelableFrom: false,    // true = a queued next-action may start during
//                               //   this frame (the combo-chain window)
//   }
//
// COORDINATES: hitboxes/hurtboxes are relative to the entity's top-left,
// authored for facing === 1 (right). The Animator mirrors x for facing -1
// using the entity's width, so one authored side covers both.

const ANIM_OVERRIDES_KEY = 'stillpoint_anim_overrides_v1';

const ANIM_DEFS = {
  // ── Starter defs — mirror the live player attack constants so the editor
  // opens with real data. Durations sum to player.js's ATTACK_DURATION (12)
  // and the hitbox matches ATK_FWD_W/H relative to a 24x32 player.
  player_attack_forward: {
    entity: 'player',
    loop: false,
    frames: [
      { duration: 3, pose: 'attack_windup', hurtbox: { x: 0, y: 0, w: 24, h: 32 } },
      { duration: 5, pose: 'attack_strike', hurtbox: { x: 0, y: 0, w: 24, h: 32 },
        hitboxes: [{ x: 24, y: 2, w: 58, h: 28, damage: 1, knockbackX: 5, knockbackY: -4 }] },
      { duration: 4, pose: 'attack_recover', hurtbox: { x: 0, y: 0, w: 24, h: 32 }, cancelableFrom: true },
    ],
  },
  player_attack_up: {
    entity: 'player',
    loop: false,
    frames: [
      { duration: 3, pose: 'attack_windup', hurtbox: { x: 0, y: 0, w: 24, h: 32 } },
      { duration: 5, pose: 'attack_strike', hurtbox: { x: 0, y: 0, w: 24, h: 32 },
        hitboxes: [{ x: -5, y: -28, w: 40, h: 36, damage: 1, knockbackX: 3, knockbackY: -12 }] },
      { duration: 4, pose: 'attack_recover', hurtbox: { x: 0, y: 0, w: 24, h: 32 }, cancelableFrom: true },
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
};

// ── Raster frame cache ───────────────────────────────────────────────────────
// Uploaded drawings live in frame.image as data URLs (self-contained in the
// exported JSON — no asset files, no load-order problems). Decoded Image
// objects are cached here so draw never constructs one per frame.
const _animImageCache = {};
function getAnimImage(dataUrl) {
  let img = _animImageCache[dataUrl];
  if (!img) {
    img = new Image();
    img.src = dataUrl;
    _animImageCache[dataUrl] = img;
  }
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
//   this.animator.done                             // non-looping anim finished?
class Animator {
  constructor(entity) {
    this.entity = entity;
    this.key = null;
    this.def = null;
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.done = false;
  }

  play(key, restart = false) {
    if (this.key === key && !restart && !this.done) return;
    this.key = key;
    this.def = ANIM_DEFS[key] || null;
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.done = !this.def;
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
    }
  }

  currentFrame() {
    return this.def ? this.def.frames[this.frameIndex] : null;
  }

  // World-space damage hitboxes for the current frame (empty array if none).
  // Mirrors authored-facing-right boxes across the entity for facing -1.
  currentHitboxes() {
    const frame = this.currentFrame();
    if (!frame || !frame.hitboxes) return [];
    const e = this.entity;
    return frame.hitboxes.map((hb) => ({
      x: e.facing === 1 ? e.x + hb.x : e.x + e.width - hb.x - hb.w,
      y: e.y + hb.y,
      width: hb.w,
      height: hb.h,
      damage: hb.damage ?? 1,
      knockbackX: hb.knockbackX ?? 4,
      knockbackY: hb.knockbackY ?? -3,
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
