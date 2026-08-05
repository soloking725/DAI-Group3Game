# Fight Ambience — per-fight room shading + ambient particles (design proposal, not started)

Status: proposed 2026-08-04, from a room_scene_editor.html gap-finding session
(see `Plans/engineering_todo.md` for that session's other findings). Nothing
in this doc is built. Read alongside `Plans/room_verification_tool_plan.md`'s
neighbor doc for the editor side, and `CLAUDE.md`'s Architecture map for
where the touched files sit.

## The idea

Some boss/miniboss fights should visually shift the room while the fight is
active — a tint, an intensity change, maybe drifting ambient particles —
distinct from the room's normal look. Right now nothing like this exists as
an authorable system; this doc scopes what it would take.

## What already exists (read from the actual code, not guessed)

- **`area.bgTint`** (`game/area.js`, e.g. `'rgba(196,181,253,0.02)'`) is a
  static per-room screen-space tint, drawn unconditionally every frame in
  `draw()` (`game/game_draw_loop.js:17-18`), regardless of combat state. It's
  baked in at room-authoring time (from the original SVG import) and is
  **not exposed in any editor today** — `levelEditor.html`'s room-properties
  panel only exposes `ambientColor` (map/UI accent), not `bgTint` or
  `bgColor` (`editor/levelEditor.html:159`, `:1087`, `:1105`).
- **`REGION_STYLES` / `decorateRoomForRegion()`** (`game/game_entities.js:988-1074`,
  authored via `room_scene_editor.html`) is whole-*region* ambient decoration
  (diamond motif / gravity rings / clock spokes), applied to every room in a
  region alike, for 3 of 13 regions. It has no per-room override and no
  combat-state awareness — it's the same every frame whether a fight is
  happening or not. This is the closest existing system, but it answers a
  different question ("what does this region look like") than the one this
  doc is asking ("what does THIS fight look like").
- **`Particle` / `spawnParticles()`** (`game/game_entities.js:140-176`) is a
  short-lived (20-30 frame) burst emitter with randomized outward velocity
  and friction decay — built for combat/event bursts (hit sparks, deaths,
  pickups), not slow ambient drift. It's the right rendering primitive to
  reuse (same `particles` array, same update/draw loop already running every
  frame) but the class's own physics (friction-decaying burst velocity, ~0.5s
  life) doesn't suit a continuous ambient effect without new tuning knobs or
  a sibling class.
- **Screen tinting elsewhere** is a single fixed vignette
  (`game/game_draw_loop.js:281-285`) — no per-boss, per-phase, or per-room
  variation anywhere in the draw loop.
- **The boss/miniboss alive check already exists** and is exactly the signal
  this feature would gate on: `game/game_update.js:541` (`area.isBossArena
  && !boss && !bossDefeated`) and `:563` (`area.isMinibossArena && !miniboss
  && !defeatedMinibosses[area.miniboss]`) spawn on entry; `boss`/`miniboss`
  are non-null and `!boss.dead`/`!miniboss.dead` while the fight is live.
- **`room_scene_editor.html`'s live preview already exercises this signal
  for real** — its sandboxed iframe runs the actual game loop
  (`editor/room_scene_editor.js`'s `refreshPreview()`), so entering a
  boss/miniboss room there already triggers the real spawn-on-entry check
  above; the boss/miniboss genuinely spawns and is alive in the preview.
  Combined with the preview-safety patch already in that file
  (`applyPreviewSafety()`, pins `player.invincibleTimer`), authoring this
  feature could get real live feedback in the existing preview pane with no
  new preview infrastructure — a fight-ambient tint would visibly apply the
  moment the boss spawns in the iframe.

## Proposed runtime concept

**1. New optional per-room field**, present only on boss/miniboss rooms:

```js
fightAmbient: {
  tint: 'rgba(180, 40, 40, 0.06)',   // additive on top of area.bgTint, not a replacement
  intensity: 0.6,                     // 0-1, scales tint alpha — lets the editor slider feel continuous
  particles: {                        // optional — omit for tint-only rooms
    color: '#f87171',
    rate: 6,                          // frames between spawns
    drift: { x: 0, y: -0.3 },         // slow directional bias, not a burst
  },
}
```

Absent on all 71 existing rooms — zero risk to current content, this is
additive-only.

**2. Draw hook** (`game/game_draw_loop.js`, right after the existing
`bgTint` fillRect at line 18):

```js
if ((boss && !boss.dead || miniboss && !miniboss.dead) && area.fightAmbient) {
  ctx.fillStyle = area.fightAmbient.tint;
  ctx.globalAlpha = area.fightAmbient.intensity ?? 1;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}
```

Same simple full-rect approach `bgTint` already uses — no new rendering
primitive, no perf concern (one extra `fillRect` per frame, only while a
fight is active).

**3. Ambient particle spawner** — a small per-frame counter in `update()`
(`game/game_update.js`, near the existing boss/miniboss alive checks) that
spawns one particle every `fightAmbient.particles.rate` frames at a random
point within the room's screen-space bounds while the fight is active.
Given `Particle`'s existing burst-velocity/friction model doesn't suit slow
ambient drift, this needs either new optional constructor params (a `drift`
override that replaces the randomized `vx`/`vy` with a fixed slow vector and
a much longer `life`) or a small sibling class — decide during
implementation, not this doc; either is a handful of lines given the
existing class is already this small.

**4. Cleanup** — no explicit teardown needed for the tint (it's just gated
on `boss`/`miniboss` being alive, same as every other per-frame check
already in the file); ambient particles age out via their own `life` timer
same as combat particles already do, so no new despawn logic either.

## Editor UI (`room_scene_editor.html`)

New inspector section, shown only when `area.roomType === 'boss'` or
`'miniboss'` (mirrors the existing `bossSpawn` inspector's own gating, see
`editor/levelEditor.html:1267`):

- Tint color picker + intensity slider — same `addRangeField()`/tint-input
  pattern the layer inspector already uses
  (`editor/room_scene_editor.js:660-674`), just targeting `area.fightAmbient`
  instead of a backdrop layer.
- Particle toggle: color picker, rate slider, drift-direction control
  (simple 2-axis slider or 8-way compass picker, doesn't need to be
  continuous).
- Live preview reads directly from the sandboxed iframe already booted for
  this room, same as every other property in this editor
  (`pushFullLiveState()`).

## Open questions (answer before implementing)

1. **Per-room custom, or a small palette of named presets?** ("Rage red",
   "Void purple", ...) — a palette is faster to author consistently across
   fights but less flexible; fully custom matches how `bgTint`/backdrop
   layers already work per-room.
2. **Phase-tied variation** (e.g. shifts as boss HP drops, tied to
   `boss.phase`/`BOSS_PHASE_CONFIG`) — meaningfully bigger scope (needs a
   `fightAmbient` per phase, or an interpolation rule) — v1 or deferred?
3. **Particle visual identity** — dust motes / embers / geometric shards,
   fixed per-region or fully authorable per-room?
4. **Accessibility** — screen shake already has a settings toggle
   (`screenShakeEnabled`, `game/game_draw_loop.js:28`) for players sensitive
   to that kind of effect. Should tint intensity/particle rate respect a
   similar toggle, given this is also a continuous visual effect during
   already-intense moments (a boss fight)?

## Suggested minimal v1 (if the answers above are "keep it small")

Tint + intensity only, no particles, no phase variation, fully custom color
per room. That's the 3-field `fightAmbient: { tint, intensity }` shape, the
draw-loop hook above, and a 2-control inspector section — small enough to
build and verify in one session once the open questions are answered.
