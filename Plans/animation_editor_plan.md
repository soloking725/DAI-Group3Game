# Universal Animation/Hitbox Editor — Plan (mostly built, see 2026-07-20 status update)

Status: editor + `Animator` runtime shipped 2026-07-16 through 2026-07-20
(player/enemy/boss bridges, raster frames). Originally planning-only per
user request 2026-07-16.

## Status update, 2026-07-20 — player bridge done, enemy/boss bridge done, raster frames live

Since this doc was written: `game/animdata.js` (`ANIM_DEFS`/`Animator`/
`POSE_RENDERERS`) shipped and is bridged into the **player** (melee swings,
Dash, Phase Dash, Wall Slide, Echo, Stillpoint, Shard Shot aim/beam,
Gravity Ball) — additive/fallback: an authored key overrides the
procedural draw, nothing authored means zero behavior change. Raster
per-frame drawings (`frame.image`, a data URL, wins over `pose`) are fully
built and working in `editor/anim_editor.html` (upload button, scale
field) and `game/animdata.js`'s `Animator.draw()` — this was the "optional
raster-image frames" phase this doc originally deferred; it's done, not
deferred anymore.

**2026-07-20: `ComposedEnemy` (`game/enemy.js`) and `Boss` (`game/boss.js`)
are now bridged too**, same additive pattern, no editor changes needed —
the editor's existing free-form key names + "Entity mock" W/H fields
already supported arbitrary entities (see its own hint text: "convention
is entity_action"), so drawing enemy/boss art was always just a matter of
authoring the right keys once the game actually consumed them:
- `ComposedEnemy.animStateKey()` → `enemy_<def.id>_<state>`, where state is
  `idle` / `walk` / `windup_<attackType>` / `attack_<attackType>` /
  `death`. Wired via a guarded `if (ANIM_DEFS[key])` check (mirrors
  player.js's own `bodyAnimator` guard) so an unauthored composed enemy
  costs nothing and never spams `Animator`'s "no animation named" warning.
- `Boss.bossAnimStateKey()` → `boss_<telegraph.type>` while an attack is
  telegraphed (`charge`/`slam`/`barrage`/`triple`/`nova`/
  `ultimate_charge` — the real per-attack identifiers, read off
  `this.telegraph.type`; `this.currentAttack` is dead scaffolding, always
  null, deliberately not used) or `boss_<state>` otherwise
  (`idle`/`entering`/`recovering`/`teleporting`/`lunging`). Only the
  Body/Core/Eyes block is overridable — the death sequence's
  fragment-scatter VFX and the aura/vortex/charge-glow overlays stay
  bespoke procedural code, same "overlays are separate from body art"
  rule the player bridge already uses.
- The older 9 hand-coded `Enemy` subclasses (Stutterer, VoidLancer, etc.)
  are **not** bridged — deliberately deprioritized per the earlier
  discussion (each already has a working procedural `draw()`; bridging all
  of them is real per-class art-authoring time for something that already
  reads fine). Revisit per-type if/when there's a reason to draw one.

Draw art for enemies/bosses now: open `anim_editor.html`, set "Entity
mock" W/H to match the enemy/boss you're drawing for (composed enemies:
whatever `def.width`/`height` you gave them; Boss: 48×56, `BOSS_WIDTH`/
`BOSS_HEIGHT`), create a key using the conventions above, author frames,
Save to game (localStorage) or Export JSON. No code changes needed per
animation — the fallback rule means it just starts rendering.

## Reality check first

Today there is **no sprite or image-frame system anywhere in the codebase**
— player, enemies, bosses, VFX are all drawn with live canvas primitives
(`ctx.arc`/`fillRect`/etc.) recomputed every frame from procedural math, not
frame-by-frame drawings. Building "upload a drawing per frame" support is a
bigger step than an editor — it's a new rendering pipeline that needs to
sit alongside (not replace) the procedural renderer, since the vector art
style is an intentional decision in `CLAUDE.md`. Recommend treating this as
two separable pieces:

1. **Data model + editor** (this doc) — timelines, hitbox/hurtbox
   rectangles, per-frame duration, projectile behavior — usable
   immediately even while frames are still drawn procedurally (frames can
   reference a *procedural pose* instead of an image, see below).
2. **Optional raster-image frames** — layered on top later, only if you
   actually want hand-drawn frames instead of continuing procedural art.
   Not required to get combo/hitbox tooling value.

This split means you get the actually-important part (tunable hitbox
timing for combos, projectiles, phase dash, Void Tether, etc. — directly
answers your combo-feel question, #7) without first solving "how does a
vanilla-canvas game load and animate raster sprites," which is a real
scope increase (asset pipeline, sprite atlasing, load-time budget).

## Proposed data model

New file: `game/animdata.js`, loaded early (after `input.js`, before
`ability.js`) since enemies/player/abilities will read from it.

```js
ANIM_DEFS = {
  player_run: {
    frames: [
      { duration: 4, pose: 'run_0', hitboxes: [], hurtbox: {x,y,w,h} },
      { duration: 4, pose: 'run_1', ... },
    ],
    loop: true
  },
  player_attack_light1: {
    frames: [
      { duration: 3, pose: 'wind0', hurtbox },
      { duration: 2, pose: 'strike', hurtbox, hitboxes: [{x,y,w,h,damage,knockback}] },
      { duration: 4, pose: 'recover', hurtbox },
    ],
    loop: false,
    cancelableFrom: 2   // earliest frame index a combo input can chain from
  },
  ...
}
```

- `pose` is a string key into a small lookup of procedural-draw functions
  (`POSE_RENDERERS['run_0'] = (ctx, entity) => {...}`) — this is how you get
  "an animation for every state" without needing raster art yet. If/when
  you add drawings, `pose` swaps to point at an image frame instead — the
  timeline/hitbox data format doesn't change, only what `pose` resolves to.
- `hitboxes`/`hurtbox` are the literal rectangles used by the existing
  per-swing dedup pattern (`hitTargetsThisSwing`) already in the codebase —
  this editor is choosing *where that data lives*, not inventing new combat
  math.
- `cancelableFrom` is exactly the field a combo system needs (see below) —
  the editor becomes the tool that defines chain windows, instead of hand-
  tuned magic frame numbers buried in `player.js`.

## Editor: `editor/anim_editor.html` (plan)

Modeled on the existing editor family (`enemy_editor.html`'s live-preview +
JSON export pattern, `levelEditor.html`'s drag/handle UI):

- Left panel: pick any entity type (player or any `ENEMY_REGISTRY` class)
  and any animation key on it (walk, run, jump, dash/phase-dash, each
  attack, Stillpoint activation, Void Tether cast, Graviton Surge, hurt/
  death) — a flat list generated from `ANIM_DEFS`, so adding a new entry
  there automatically shows up here (same auto-registry pattern
  `levelEditor.html` already uses for enemy types).
- Center: frame-strip timeline (like a video editor) — add/remove/reorder
  frames, drag each frame's duration.
- Canvas: live preview of the current frame's pose, with draggable-resize
  handles for hurtbox and each hitbox rectangle (reuse `levelEditor.html`'s
  existing drag-resize-handle code — it already solves exactly this
  interaction for platforms/enemies).
- Right panel: per-hitbox damage/knockback/duration fields, and
  `cancelableFrom` for attack-type animations.
- Scrub bar + play/pause to preview timing at real game speed.
- "Test in Arena" button — same handoff pattern as
  `enemy_editor.html → enemy_test.html`: writes the edited `ANIM_DEFS`
  entry to `localStorage`, opens `enemy_test.html` (or a player-focused
  arena) which reads the override on load. No code risk to the shipped
  game files.
- Export: JSON blob matching `ANIM_DEFS`' shape, paste-ready into
  `animdata.js` (same "safe, non-coder-usable" philosophy as
  `enemy_editor.html` — it never writes files directly).

## Why this unlocks the combo work directly (ties to your question 7)

Your example combo (grav ball → dash → up-attack → dash-up → charge →
explode → tether-pull → Stillpoint → release) is really a *chain of
`cancelableFrom` windows* strung together: each ability's animation needs a
frame range where the next input is accepted and a frame range where it
isn't (recovery lock). Once every ability's timing lives in `ANIM_DEFS`
instead of scattered cooldown consts, a combo is just "does ability B's
input arrive while ability A is inside its cancel window" — a single
generic check in `player.js`'s input-handling, not bespoke code per combo.
That's the actual mechanism that makes deep combo trees maintainable as you
keep adding abilities — see the separate note in the roadmap answer below
about whether your example combo is "too much."

## Scope for v1 (recommend)

- Player animations + hitbox editing (biggest combo-feel payoff).
- Reuse for the 10 built enemy classes (their attack tell/windup timing is
  exactly the "think timer" + "telegraph" material for AI question 6).
- Skip raster image upload entirely for v1 — procedural `pose` functions
  only. Revisit only if you decide you want to move off vector art.
