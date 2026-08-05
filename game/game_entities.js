class Projectile {
  constructor(x, y, vx, vy, damage, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.width = 8;
    this.height = 8;
    this.damage = damage;
    this.life = 60;
    this.alive = true;
    this.color = color || '#fbbf24';
  }

  update() {
    // Slight magnetism toward the nearest intact destructible wall
    // (expansion §0.1 — reduces wasted shots at crystal barriers without
    // turning the shot into a homing missile; gentle pull, short radius).
    if (this.seekWalls) {
      const area = getCurrentArea();
      if (area) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        let pullX = 0, pullY = 0, bestD = 100; // seek radius in px
        for (const plat of area.platforms) {
          if (!plat.destructible || plat.hp === undefined || plat.hp <= 0) continue;
          // Closest point on the wall's rect, not its centre — tall walls
          // would otherwise pull shots toward their midpoint.
          const px = Math.max(plat.x, Math.min(cx, plat.x + plat.w));
          const py = Math.max(plat.y, Math.min(cy, plat.y + plat.h));
          const d = Math.hypot(px - cx, py - cy);
          if (d > 0 && d < bestD) { bestD = d; pullX = (px - cx) / d; pullY = (py - cy) / d; }
        }
        this.vx += pullX * 0.35;
        this.vy += pullY * 0.35;
      }
    }
    this.x += this.vx;
    this.y += this.vy;
    // No gravity (removed 2026-07-16, user feedback: shard shots were too
    // hard to aim since where they landed depended on gravity pulling the
    // arc down over the shot's flight, not just the initial aim angle —
    // now they fly perfectly straight along whatever angle was aimed).
    // Only Shard Shot ever instantiates this class (enemy projectiles use
    // their own separate systems), so this is safe to remove unconditionally.
    this.life--;
    if (this.life <= 0) {
      this.alive = false;
    }
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.shadowBlur = 0;
  }
}

// ── Stillpoint offensive buff (expansion §0.2) ─────────────────────────────
// While Stillpoint is active, melee turns into a risk-reward recovery tool
// instead of a purely defensive slowdown: hits deal 1.5x damage and every
// landed melee hit restores 1 health pip (capped at MAX_HEALTH). Shared by
// all three melee hit loops (enemies, the Sovereign, minibosses) so the numbers
// can never drift apart between them.
// Strength Lv3/Lv4 damage multipliers (Enemy_Design.pdf, old Lv2/Lv3): Lv3
// +20%, Lv4 an additional +25% (total +45% over base). Lv1 (2026-07-27, the
// new cheap entry tier) adds a small +10% of its own, stacking underneath.
// Limit Break (Lv5, when active and Strength is the chosen ability) adds
// another +50%.
function strengthDamageMultiplier() {
  const raw = statUpgrades.strength || 0;
  const tier = oldTier('strength');
  let mult = 1;
  if (raw >= 1) mult += 0.1;
  if (tier >= 2) mult += 0.2;
  if (tier >= 3) mult += 0.25;
  if (limitBreak.active && limitBreak.ability === 'strength') mult += 0.5;
  return mult;
}

function playerMeleeDamage() {
  let dmg = player.heavy ? Math.ceil(ATTACK_DAMAGE * (1 + player.heavyCharge)) : ATTACK_DAMAGE;
  dmg *= strengthDamageMultiplier();
  if (player.stillpointActive && abilityState.hasStillpoint) dmg *= 1.5;
  dmg *= comboDamageMultiplier(); // combo.js damage_buff reward (1 when none active)
  return dmg;
}

// Stillpoint lifesteal cap by level (Enemy_Design.pdf): Lv0/1 = 1 HP,
// Lv2 = 2 HP, Lv3 = 3 HP, Lv4 Limit Break = 4 HP — per Stillpoint
// *activation*, tracked on the player instance and reset each time
// Stillpoint (re)activates (see Player.update()'s tap/hold block).
// Temporal Warden's defeat reward (2026-07-26) — "Stillpoint upgrade,
// +1 lifesteal per hit" — additive on top of the lore-pip-purchased level,
// mirroring maxHealthBonus's exact shape (healing.js) rather than bumping
// statUpgrades.stillpoint directly: totalPipsSpent() derives spent-pips
// purely from statUpgrades[key] levels, so mutating that would silently
// make the game think the player spent 2-4 lore pips they never actually
// spent. A separate additive bonus avoids that entirely. Saved/loaded/reset
// alongside maxHealthBonus — see saveGame()/loadGame()/startNewGame().
let stillpointLifestealBonus = 0;

function stillpointLifestealCap() {
  const tier = oldTier('stillpoint');
  if (limitBreak.active && limitBreak.ability === 'stillpoint') return 4 + stillpointLifestealBonus;
  if (tier >= 3) return 3 + stillpointLifestealBonus;
  if (tier >= 2) return 2 + stillpointLifestealBonus;
  return 1 + stillpointLifestealBonus;
}

function applyStillpointLifeSteal() {
  if (!player.stillpointActive || !abilityState.hasStillpoint) return;
  if (player.stillpointHealed >= stillpointLifestealCap()) return;
  if (player.health >= playerMaxHealth()) return;
  player.health = Math.min(playerMaxHealth(), player.health + 1);
  player.stillpointHealed = (player.stillpointHealed || 0) + 1;
  spawnParticles(player.x + player.width / 2, player.y + 4, '#2dd4bf', 6);
}

// ComposedEnemy phase system's `dotOnHit` flag (enemy.js) lands here — a hit
// from an enemy/boss/miniboss in a DoT-flagged phase applies this instead of
// (or alongside) its normal damage. Re-applying while already dotted just
// refreshes the duration/tick rate rather than stacking multiple timers.
function applyPlayerDot(player, dotDef) {
  player.dot = {
    damagePerTick: dotDef.damagePerTick ?? 1,
    tickInterval: dotDef.tickInterval ?? 30,
    tickTimer: dotDef.tickInterval ?? 30,
    timer: dotDef.duration ?? 180,
  };
}

// Particle system
class Particle {
  constructor(x, y, color, size) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = (Math.random() - 0.5) * 6;
    this.life = 20 + Math.random() * 10;
    this.maxLife = this.life;
    this.color = color;
    this.size = size || 4;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.life--;
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

// ── Particles, collision, area enemy management ─────────────────────────

function spawnParticles(x, y, color, count) {
  count = count || 8;
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
}

// Called from enemy.js for Stutterer teleport particles
function spawnParticlesAt(x, y, color, count) {
  spawnParticles(x, y, color, count);
}

// Collision detection
function rectsOverlap(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

// Push the player out of an overlapping enemy along the shallower penetration
// axis (classic AABB minimum-translation-vector), away from the enemy's
// center. Runs unconditionally on overlap — independent of invincibility/
// damage — so the two boxes never sit inside each other.
function separateFromEnemy(player, enemy) {
  const pCenterX = player.x + player.width / 2;
  const pCenterY = player.y + player.height / 2;
  const eCenterX = enemy.x + enemy.width / 2;
  const eCenterY = enemy.y + enemy.height / 2;

  const overlapX = (player.width + enemy.width) / 2 - Math.abs(pCenterX - eCenterX);
  const overlapY = (player.height + enemy.height) / 2 - Math.abs(pCenterY - eCenterY);
  if (overlapX <= 0 || overlapY <= 0) return;

  if (overlapX < overlapY) {
    const pushDir = (pCenterX < eCenterX) ? -1 : 1;
    // Same class of bug as the pushDown/floor clamp below (2026-07-19):
    // shoving the player straight through a wall they're already pinned
    // against — with zero regard for what's on the other side — used to
    // read as "an enemy bumps you at a wall and you fall through the
    // floor," since the far side of a wall is very often a pit or a lower
    // area with nothing underneath at that x. Clamp the same way: don't
    // push the player past a wall they're currently (or very recently, via
    // wall-jump coyote) touching on that exact side — shove the enemy
    // instead by simply not moving the player.
    if (player.wallNormal === pushDir) {
      // no-op: player stays put, enemy's own separation (if any) absorbs it
    } else {
      // The `wallNormal` guard above only covers a wall the player is
      // ALREADY registered as touching — it does nothing the first frame a
      // big enemy (or a lunge/charge overlapping heavily) shoves the player
      // INTO a wall they weren't flagged against yet, and overlapX has no
      // upper bound (it's just "however much the two boxes overlap"). That
      // could — and, confirmed via harness, did — push the player fully
      // through a wall's near face and out the other side, or deep enough
      // inside it that the shared collision resolver's margin-based wall
      // check (physics.js resolveEntityCollision) can no longer recognize
      // the overlap as "approaching from outside" on any later frame. Once
      // that happens, a wall flush with the floor (the common case — a wall
      // built rising off the ground) reads the embedded player's vertical
      // position as "bumping its underside," which snaps them to exactly
      // the floor's own surface with vy=0 — one frame later they're already
      // past the floor's own landing margin too, and gravity carries them
      // through it forever with grounded never recovering. Clamp the push
      // the same way the Y-branch below already clamps to the floor: never
      // move the player past the near edge of a solid platform in the push
      // direction, so the wall stops the shove instead of the player
      // tunneling into (or through) it.
      let pushAmount = overlapX;
      const area = typeof getCurrentArea === 'function' ? getCurrentArea() : null;
      if (area && area.platforms) {
        for (const plat of area.platforms) {
          if (plat.destructible && plat.hp <= 0) continue;
          if (plat.hazard) continue;
          if (plat.oneWay) continue; // never a side wall
          if (plat.crumble && plat.crumbleGone) continue;
          // Same vertical-overlap band the resolver's own wall pass uses.
          if (!(player.y + player.height > plat.y + 4 && player.y < plat.y + plat.h)) continue;
          if (pushDir > 0 && player.x + player.width <= plat.x) {
            pushAmount = Math.min(pushAmount, plat.x - (player.x + player.width));
          } else if (pushDir < 0 && player.x >= plat.x + plat.w) {
            pushAmount = Math.min(pushAmount, player.x - (plat.x + plat.w));
          }
        }
      }
      player.x += pushDir * Math.max(0, pushAmount);
    }
  } else {
    const pushDown = pCenterY >= eCenterY;
    // A grounded player being pushed DOWN by an enemy above them (a
    // divebomb, a jump-attack landing on top, two enemies stacking) used to
    // just add overlapY straight into player.y with zero regard for the
    // floor underneath — confirmed via harness test: a single call could
    // embed the player ~20px into their own standing platform, and because
    // the embed was deeper than the platform collision's landing margin,
    // the very next tick's landing check no longer saw them as "approaching
    // from above" and they fell straight through into the void, forever
    // (grounded never recovered). Clamp the push so it can never cross the
    // surface the player is actually standing on — shove the enemy instead
    // by simply not moving the player past ground level.
    if (pushDown && player.grounded && player.standingPlat) {
      const floorY = player.standingPlat.y - player.height;
      player.y = Math.min(player.y + overlapY, floorY);
    } else {
      player.y += pushDown ? overlapY : -overlapY;
    }
  }
}

// Spawn enemies for an area
function spawnAreaEnemies(areaId) {
  if (areaEnemiesSpawned[areaId]) return;
  areaEnemiesSpawned[areaId] = true;

  const area = getArea(areaId);
  areaEnemies[areaId] = [];

  // Looked up from ENEMY_REGISTRY (enemy.js) rather than a hand-maintained
  // if/else chain — that chain used to silently miss classes (blitz_guard
  // fell through to a generic base Enemy with none of its real behavior)
  // whenever a new enemy class was added here but not also added there.
  for (const eDef of area.enemies) {
    let enemy;
    // ComposedEnemy (enemy_designer.html, roadmap.md 2.8) takes a required
    // 3rd constructor arg — special-cased here, same way ColossusCore's
    // miniboss spawn path is separate from this generic loop.
    if (eDef.type === 'composed' && eDef.def) {
      enemy = new ComposedEnemy(eDef.x, eDef.y, eDef.def);
    } else {
      const Cls = (typeof ENEMY_REGISTRY !== 'undefined') ? ENEMY_REGISTRY[eDef.type] : undefined;
      enemy = (Cls && Cls !== Enemy) ? new Cls(eDef.x, eDef.y) : new Enemy(eDef.x, eDef.y, eDef.type);
    }
    // Visual variant (visualVariants.js) — same "functionally identical,
    // region- or instance-reskinned" pattern as drawPlatform()'s hazard
    // styling above. `eDef.tint` is an explicit per-placement override
    // (levelEditor.html's enemy inspector); with no override, a region can
    // still opt in via REGION_STYLES[region].enemyVariant. No-op (enemy
    // keeps its own def.color) when neither is set — every enemy today.
    const tint = (typeof getEnemyTint === 'function') ? getEnemyTint(area.region, eDef.tint) : null;
    if (tint) {
      if (enemy.def) enemy.color = tint; // ComposedEnemy reads this.color
      else enemy.bodyColor = tint;       // legacy base Enemy class
    }
    areaEnemies[areaId].push(enemy);
  }

  // Spawn safety (physics.js): an authored spawn point inside a platform
  // used to just... spawn there (then get snapped somewhere wrong by the
  // old landing check). Now it's pushed out along the shortest axis with a
  // console warning naming the offending position, so bad room data
  // surfaces the same way validateAreaGraph() errors do.
  for (const enemy of areaEnemies[areaId]) {
    nudgeOutOfPlatforms(enemy, area.platforms, `${enemy.type || 'enemy'} in "${areaId}"`);
  }
}

// Clear enemies when leaving an area
function clearAreaEnemies(areaId) {
  areaEnemiesSpawned[areaId] = false;
  areaEnemies[areaId] = [];
}

// Switch area
// ═══════════════════════════════════════════════════════════════════════
// PLATFORM BEHAVIOURS — hazard / oneWay / moving / crumble
// ═══════════════════════════════════════════════════════════════════════
// Authoring (per platform in area.js):
//   hazard: true, damage: 1       — trigger volume, never solid; damages on
//                                   overlap. Lay it on top of a real floor.
//   oneWay: true                  — jump up through it, land on top;
//                                   down+jump drops through.
//   moving: { toX, toY, speed }   — oscillates between the authored x/y and
//                                   toX/toY; carries whatever stands on it.
//   crumble: true, crumbleDelay:30, respawn: 120
//                                 — falls away `crumbleDelay` frames after
//                                   being stood on; comes back after
//                                   `respawn` frames (0 = never).
//
// Runtime state lives in underscore fields on the platform object. AREAS is
// otherwise static data, so every one of these is derived from an authored
// anchor (`_baseX`/`_baseY`) and reset on room entry — re-entering a room
// recomputes rather than accumulating drift.
function resetPlatformRuntime(area) {
  if (!area || !area.platforms) return;
  for (const p of area.platforms) {
    if (p._baseX !== undefined) { p.x = p._baseX; p.y = p._baseY; }
    p._t = 0;
    p._dir = 1;
    p._crumbleT = -1;
    p.crumbleGone = false;
  }
}

function updatePlatformSystems(area) {
  if (!area || !area.platforms) return;
  const ts = (typeof gameTimeScale === 'number') ? gameTimeScale : 1;
  for (const p of area.platforms) {
    // ── moving ──
    if (p.moving) {
      if (p._baseX === undefined) { p._baseX = p.x; p._baseY = p.y; }
      const dx = (p.moving.toX !== undefined ? p.moving.toX : p._baseX) - p._baseX;
      const dy = (p.moving.toY !== undefined ? p.moving.toY : p._baseY) - p._baseY;
      const span = Math.hypot(dx, dy) || 1;
      const step = ((p.moving.speed || 1) * ts) / span; // normalised 0..1 per frame
      if (p._t === undefined) { p._t = 0; p._dir = 1; }
      p._t += step * (p._dir || 1);
      if (p._t >= 1) { p._t = 1; p._dir = -1; }
      else if (p._t <= 0) { p._t = 0; p._dir = 1; }
      const nx = p._baseX + dx * p._t;
      const ny = p._baseY + dy * p._t;
      // Carry anything standing on this platform by the same delta.
      if (player && player.standingPlat === p) {
        player.x += nx - p.x;
        player.y += ny - p.y;
      }
      p.x = nx; p.y = ny;
    }
    // ── crumble ──
    if (p.crumble) {
      if (p._crumbleT === undefined) p._crumbleT = -1;
      if (!p.crumbleGone) {
        if (player && player.standingPlat === p && p._crumbleT < 0) {
          p._crumbleT = (p.crumbleDelay !== undefined ? p.crumbleDelay : 30);
        }
        if (p._crumbleT >= 0) {
          p._crumbleT -= ts;
          if (p._crumbleT <= 0) {
            p.crumbleGone = true;
            p._crumbleT = (p.respawn !== undefined ? p.respawn : 120);
            spawnParticles(p.x + p.w / 2, p.y, '#9ca3af', 14);
          }
        }
      } else if (p._crumbleT > 0) {
        p._crumbleT -= ts;
        if (p._crumbleT <= 0) { p.crumbleGone = false; p._crumbleT = -1; }
      }
    }
  }
}

function applyHazardDamage(area) {
  if (!area || !area.platforms || !player || player.dead) return;
  if (player.invincibleTimer > 0) return; // i-frames already throttle this
  const px = player.x, py = player.y, pw = player.width, ph = player.height;
  for (const p of area.platforms) {
    if (!p.hazard) continue;
    if (px + pw > p.x && px < p.x + p.w && py + ph > p.y && py < p.y + p.h) {
      player.takeDamage(p.damage !== undefined ? p.damage : 1, p.x + p.w / 2);
      return; // one hazard hit per frame is enough
    }
  }
}

// Hollow Knight-style door spawn (2026-07-19): a transition that omits
// toX/toY no longer needs a hand-authored landing point — this finds the
// door in the destination room that leads back to where the player came
// from, and stands them just clear of it. `requires`-gated levelEditor doors
// still take an explicit toX/toY if the level designer wants one (e.g. a
// warp/teleport with no reciprocal door to anchor off of); this is only the
// fallback when those are left unset.
function computeDoorSpawn(targetId, fromId) {
  const dest = AREAS[targetId];
  if (!dest) return { x: 100, y: 400 }; // switchArea()'s own missing-area guard handles logging; just don't throw here
  const doorTrans = (dest.transitions || []).find(t => t.to === fromId);
  if (!doorTrans) {
    // No door in the destination leads back where we came from (a one-way
    // link, e.g. the teleport gates) — fall back to the room's first anchor,
    // or a generic safe spot near its floor.
    const anchor = dest.anchors && dest.anchors[0];
    if (anchor) return { x: anchor.x, y: anchor.y };
    return { x: 100, y: (dest.groundY || 500) - 60 };
  }
  // Clearance so the player doesn't land back inside the door's own
  // trigger box — the exact mechanism behind the black-screen door loop
  // this replaces. Spawn is centered vertically on the door and pushed
  // horizontally toward whichever side of the room has more space, so it
  // works for doors on either wall without needing a `direction` lookup.
  const margin = 40;
  const roomMid = (dest.width || 1000) / 2;
  const doorCenterX = doorTrans.x + doorTrans.w / 2;
  const spawnY = doorTrans.y + doorTrans.h / 2 - (player ? player.height / 2 : 16);
  if (doorCenterX < roomMid) {
    return { x: doorTrans.x + doorTrans.w + margin, y: spawnY }; // door on the west side — enter moving east
  } else {
    return { x: doorTrans.x - margin - (player ? player.width : 24), y: spawnY }; // door on the east side — enter moving west
  }
}

function switchArea(targetId, targetX, targetY) {
  // Clear current area enemies
  clearAreaEnemies(currentAreaId);
  resetPlatformRuntime(getCurrentArea());

  // Echoes are world-space (x,y) snapshots of the room being left — carrying
  // them into a new room's coordinate space puts them at a meaningless
  // position (a different layout entirely), so they must not survive a
  // room transition, unlike echoes surviving a plain respawn-in-place.
  resetTransientEntities();
  clearVitalityMotes(); // motes are room-space too (healing.js)
  clearWeaponDrops(); // companion.js — same room-space lifetime as motes
  child = null; // the Child re-enters at the player's side (companion.js recreates her)

  // Switch
  currentAreaId = targetId;
  discoveredAreas[targetId] = true;
  resetPlatformRuntime(getCurrentArea()); // moving/crumble state starts fresh
  SFX.setAreaAmbient(targetId);

  // Teleport player
  player.x = targetX;
  player.y = targetY;
  player.vx = 0;
  player.vy = 0;

  // Spawn safety (physics.js): a door's authored target position embedded
  // in a platform pushed the player inside geometry (user report
  // 2026-07-16: "you can spawn inside a platform").
  const targetArea = getArea(targetId);
  if (targetArea) nudgeOutOfPlatforms(player, targetArea.platforms, `player entering "${targetId}"`);

  // Reset camera
  resetCamera();

  // Spawn enemies in new area
  spawnAreaEnemies(targetId);

  // Transition effect
  transitioning = true;
  transitionAlpha = 1;

  // See doorCooldown's declaration up top — suppresses the transitions-check
  // loop for a few frames so a landing spot inside the destination's own
  // return-door trigger can't bounce the player right back this same tick.
  doorCooldown = DOOR_COOLDOWN_FRAMES;

  saveGame();

  // Sample cutscene (cutscene.js) — first entry to Echo Bridge part 1.
  // Doubles as the wiring reference for future scenes: gate on a story
  // flag, play after the room is fully set up, let the scene set the flag.
  if (targetId === 'echo_bridge_part1' && !storyFlags.echo_bridge_intro_seen) {
    playCutscene('echo_bridge_intro');
  }

  // Data-driven room-load cutscene triggers (area.cutsceneTriggers[],
  // Plans/archive/room_scene_editor_plan.md §3/v2 — the editor UI is
  // editor/room_scene_editor.html) — additive alongside the hardcoded call
  // site right above; a room with no cutsceneTriggers[] behaves exactly as
  // it did before this feature existed. Fires at most one (same "only one
  // cutscene can be active" assumption playCutscene() already has — a
  // second call would just overwrite the first's steps, not queue it), and
  // only if the hardcoded check above didn't already start one this call.
  firedTriggersThisVisit = new Set();
  if (gameState !== 'cutscene') {
    for (const trig of (getArea(targetId).cutsceneTriggers || [])) {
      if (trig.triggerType !== 'onRoomLoad') continue;
      if (trig.storyFlag && storyFlags[trig.storyFlag]) continue;
      playCutscene(trig.cutsceneId);
      firedTriggersThisVisit.add(trig.id);
      break;
    }
  }
}

// Is `plat`'s given edge ('top' or 'bottom') flush against another
// platform's opposite edge, with x-overlap? If so, that edge is an internal
// seam between two authored platform pieces meant to read as one continuous
// surface (e.g. a tall wall or ceiling built from several stacked segments)
// — not a real exposed surface the player would see light hit. Used by
// drawPlatform() to skip the highlight/shadow strip there, so adjacent
// flush platforms "snap together" visually instead of showing a repeating
// light/dark band at every segment boundary (the "wall glitching" look).
function platformEdgeCovered(plat, edge, allPlatforms) {
  if (!allPlatforms) return false;
  const targetY = edge === 'top' ? plat.y : plat.y + plat.h;
  for (const other of allPlatforms) {
    if (other === plat || other.destructible) continue;
    const otherEdgeY = edge === 'top' ? other.y + other.h : other.y;
    if (Math.abs(otherEdgeY - targetY) > 1) continue; // not flush (within 1px rounding)
    const xOverlap = plat.x < other.x + other.w && plat.x + plat.w > other.x;
    if (xOverlap) return true;
  }
  return false;
}

// Shared adapter (2026-08-01) letting Animator — built for entities with
// `width`/`height`/`facing` (player/enemy/Child) — drive plain room objects
// that use area.js's `w`/`h` convention instead (platforms, hazards, doors).
// Cached on the object itself and mutated in place every call rather than
// reallocated (performanceInstructions.md's no-per-frame-allocation rule) —
// safe because a room object's own x/y/w/h are themselves already mutated
// in place elsewhere (e.g. a `moving` platform), never replaced wholesale.
// `obj.animKey` (optional, editable in levelEditor.html next to that
// object's other fields) is what a level designer actually authors; nothing
// set means the caller never uses this at all — the object's usual
// procedural draw stays exactly as before this existed.
function getRoomObjectAnimator(obj) {
  if (!obj._roomObjAnimator) {
    obj._animAdapter = { x: obj.x, y: obj.y, width: obj.w, height: obj.h, facing: 1 };
    obj._roomObjAnimator = new Animator(obj._animAdapter);
  }
  const adapter = obj._animAdapter;
  adapter.x = obj.x; adapter.y = obj.y; adapter.width = obj.w; adapter.height = obj.h;
  return obj._roomObjAnimator;
}

// True + draws the current frame if `obj.animKey` names a real ANIM_DEFS
// entry; false (draws nothing) otherwise, so every call site's existing
// procedural drawing stays an untouched fallback — same "additive, opt-in,
// zero regression until authored" contract as every other animdata.js bridge
// in this codebase (enemy.js's ComposedEnemy, companion.js's Child).
function tryDrawRoomObjectAnim(ctx, obj, timeScale) {
  if (!obj.animKey || typeof ANIM_DEFS === 'undefined' || !ANIM_DEFS[obj.animKey]) return false;
  const animator = getRoomObjectAnimator(obj);
  animator.play(obj.animKey);
  animator.update(timeScale);
  animator.draw(ctx);
  return true;
}

// Point-anchored sibling of tryDrawRoomObjectAnim (2026-08-01) — for pickups/
// markers authored as a bare `{x, y}` with no `w`/`h` of their own (anchors,
// ability rewards, Fracture/Lore pips, healing crystals). Builds a square
// box (`obj.animSize` if set, else `defaultSize`) horizontally centered on
// x with its BOTTOM at y — matches how the anchor/healing-crystal procedural
// art already treats y (a base point the art extends upward from). Ability
// reward/Fracture pip/Lore fragment procedural art instead centers ON y, so
// authored art here sits slightly higher than those exact orbs would — one
// shared, simple convention across 5 differently-anchored procedural
// styles is a deliberate simplification, not a precision guarantee; a
// level designer can compensate with `animSize` or padding in the art
// itself. Same rule as drawPlatform()'s animKey check: an authored key
// overrides the ENTIRE procedural look (activated/consumed/mode tinting
// included) rather than blending with it — consistent with that precedent,
// not a partial per-state override system.
function tryDrawPointObjectAnim(ctx, obj, timeScale, defaultSize) {
  if (!obj.animKey || typeof ANIM_DEFS === 'undefined' || !ANIM_DEFS[obj.animKey]) return false;
  const size = obj.animSize || defaultSize || 24;
  if (!obj._roomObjAnimator) {
    obj._animAdapter = { x: obj.x - size / 2, y: obj.y - size, width: size, height: size, facing: 1 };
    obj._roomObjAnimator = new Animator(obj._animAdapter);
  }
  const adapter = obj._animAdapter;
  adapter.x = obj.x - size / 2; adapter.y = obj.y - size; adapter.width = size; adapter.height = size;
  const animator = obj._roomObjAnimator;
  animator.play(obj.animKey);
  animator.update(timeScale);
  animator.draw(ctx);
  return true;
}

// Draw a platform
function drawPlatform(ctx, plat, allPlatforms, region) {
  if (plat.destructible && plat.hp <= 0) return;
  if (plat.crumble && plat.crumbleGone) return; // fallen away this frame

  // Authored animation (levelEditor.html's `animKey` field, anim_editor.html's
  // "Room Objects" category) overrides EVERY procedural variant below —
  // hazard, destructible, and the regular/crumble/moving/oneWay/polarity
  // tint branch alike — one check up front instead of patching each branch,
  // since a platform is exactly one visual thing at a time regardless of
  // which behavior flags it also carries. No-op (falls through to the
  // existing procedural draw) for every platform that doesn't set animKey —
  // every platform in the game today.
  const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1;
  if (tryDrawRoomObjectAnim(ctx, plat, _ts)) return;

  // ── hazard — spikes/energy field; color resolved via visualVariants.js
  // so a region can opt into its own look (REGION_STYLES[region].hazardVariant,
  // or a free derived tint from primary/secondary) without touching this
  // draw code — falls back to the original plain red if the resolver isn't
  // loaded (some standalone tools don't load visualVariants.js) or the
  // region has no styling of its own yet. Never a solid surface.
  if (plat.hazard) {
    const style = (typeof getHazardStyle === 'function')
      ? getHazardStyle(region, plat.hazardVariant)
      : { fill: 'rgba(248,113,113,0.18)', stroke: '#f87171' };
    ctx.fillStyle = style.fill;
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const teeth = Math.max(1, Math.floor(plat.w / 12));
    for (let i = 0; i < teeth; i++) {
      const x0 = plat.x + (i * plat.w) / teeth;
      ctx.moveTo(x0, plat.y + plat.h);
      ctx.lineTo(x0 + plat.w / teeth / 2, plat.y);
      ctx.lineTo(x0 + plat.w / teeth, plat.y + plat.h);
    }
    ctx.stroke();
    return;
  }

  if (plat.destructible) {
    // Crystal block — teal, glowing, crackling
    const pulse = Math.sin(frameCount * 0.05) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(45, 212, 191, ${pulse})`;
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 1;
    ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    // Crack lines
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.5)';
    ctx.beginPath();
    ctx.moveTo(plat.x + plat.w * 0.3, plat.y);
    ctx.lineTo(plat.x + plat.w * 0.6, plat.y + plat.h * 0.5);
    ctx.lineTo(plat.x + plat.w * 0.4, plat.y + plat.h);
    ctx.stroke();
    return;
  }

  // Regular platform. Moving/crumble/oneWay/polarity tint so they read as
  // special while designing (and in play). Polarity (Electromagnetic
  // Golem, The Polar Shift) wins over moving/crumble since a charged
  // surface is the more urgent read mid-fight; pulses like the destructible
  // block above so a live charge reads as "active," not static decor.
  const crumbling = plat.crumble && plat._crumbleT >= 0 && !plat.crumbleGone;
  if (plat.polarity) {
    const pulse = Math.sin(frameCount * 0.08) * 0.15 + 0.75;
    ctx.fillStyle = plat.polarity === 'positive' ? `rgba(248, 113, 113, ${pulse})` : `rgba(96, 165, 250, ${pulse})`;
  } else {
    ctx.fillStyle = crumbling ? '#2e211a' : (plat.moving ? '#1a2436' : '#1a1a2e');
  }
  ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
  if (plat.oneWay) {
    // dashed top only — signals "pass up through me"
    ctx.strokeStyle = '#8b9dc3';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(plat.x, plat.y + 1);
    ctx.lineTo(plat.x + plat.w, plat.y + 1);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Top highlight — skipped where another platform sits flush above (an
  // internal seam, not a real top surface facing open air).
  if (!platformEdgeCovered(plat, 'top', allPlatforms)) {
    ctx.fillStyle = '#2a2a4e';
    ctx.fillRect(plat.x, plat.y, plat.w, 2);
  }

  // Bottom edge — same idea, skipped where another platform sits flush below.
  if (!platformEdgeCovered(plat, 'bottom', allPlatforms)) {
    ctx.fillStyle = '#12122a';
    ctx.fillRect(plat.x, plat.y + plat.h - 1, plat.w, 1);
  }

  // Decorative dots
  ctx.fillStyle = '#222244';
  for (let dx = plat.x + 10; dx < plat.x + plat.w - 10; dx += 20) {
    ctx.fillRect(dx, plat.y + plat.h / 2 - 1, 2, 2);
  }
}

// Draw Anchor checkpoint
function drawAnchor(ctx, sp, area, activated) {
  const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1;
  if (tryDrawPointObjectAnim(ctx, sp, _ts, 32)) return;

  const pulse = Math.sin(frameCount * 0.04) * 0.3 + 0.7;
  const x = sp.x;
  const y = sp.y;

  // Glow
  const glowSize = activated ? 40 : 20;
  const gradient = ctx.createRadialGradient(x, y - 20, 0, x, y - 20, glowSize);
  if (activated) {
    gradient.addColorStop(0, `rgba(196, 181, 253, ${pulse * 0.4})`);
    gradient.addColorStop(1, 'rgba(196, 181, 253, 0)');
  } else {
    gradient.addColorStop(0, `rgba(100, 80, 140, ${pulse * 0.2})`);
    gradient.addColorStop(1, 'rgba(100, 80, 140, 0)');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(x - glowSize, y - 20 - glowSize, glowSize * 2, glowSize * 2);

  // Marker pole
  ctx.fillStyle = activated ? '#c4b5fd' : '#4a4a6e';
  ctx.fillRect(x - 2, y - 40, 4, 40);

  // Diamond top
  ctx.fillStyle = activated ? '#e0d7ff' : '#3a3a5e';
  ctx.beginPath();
  ctx.moveTo(x, y - 50);
  ctx.lineTo(x + 8, y - 40);
  ctx.lineTo(x, y - 30);
  ctx.lineTo(x - 8, y - 40);
  ctx.closePath();
  ctx.fill();

  // Sparkle particles when activated
  if (activated && frameCount % 15 === 0) {
    particles.push(new Particle(
      x + (Math.random() - 0.5) * 20,
      y - 40 + (Math.random() - 0.5) * 20,
      '#c4b5fd',
      2
    ));
  }

  // Interaction hint when nearby
  if (activated) {
    const playerDist = Math.abs(player.x - x);
    if (playerDist < 60) {
      ctx.fillStyle = `rgba(196, 181, 253, ${pulse})`;
      ctx.font = '10px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('STILLPOINT', x, y - 55);
      ctx.textAlign = 'left';
    }
  }
}

// Draw ability reward
function drawAbilityReward(ctx, ability) {
  if (ability.id === 'phase_dash' && abilityState.hasPhaseDash) return;
  if (ability.id === 'shard_shot' && abilityState.hasShardShot) return;

  const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1;
  if (tryDrawPointObjectAnim(ctx, ability, _ts, 28)) return;

  const pulse = Math.sin(frameCount * 0.06) * 0.3 + 0.7;
  const x = ability.x;
  const y = ability.y;

  // Glow
  const glowSize = 35;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
  gradient.addColorStop(0, `rgba(103, 232, 249, ${pulse * 0.4})`);
  gradient.addColorStop(1, 'rgba(103, 232, 249, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x - glowSize, y - glowSize, glowSize * 2, glowSize * 2);

  // Orb
  ctx.fillStyle = `rgba(103, 232, 249, ${pulse})`;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();

  // Inner
  ctx.fillStyle = '#cffafe';
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();

  // Floating symbols around orb
  const symbols = ['◆', '◇', '○'];
  ctx.fillStyle = `rgba(103, 232, 249, ${pulse * 0.6})`;
  ctx.font = '10px monospace';
  for (let i = 0; i < 3; i++) {
    const angle = frameCount * 0.02 + (i * Math.PI * 2 / 3);
    const sx = x + Math.cos(angle) * 20;
    const sy = y + Math.sin(angle) * 20;
    ctx.fillText(symbols[i], sx - 3, sy + 3);
  }

  // Name
  ctx.fillStyle = `rgba(203, 245, 255, ${pulse})`;
  ctx.font = '10px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(ability.name, x, y - 22);
  ctx.textAlign = 'left';
}

// Draw a lore fragment pickup (amber memory shard). `lf.mode` ('overlay'
// default / 'cutscene' / 'none') picks the pickup behavior in game_update.js;
// the visual here echoes that choice so a 'none' (extra/customization) pip
// reads as slate instead of amber, and a 'cutscene' pip gets a thin outer
// ring marking it as plot-critical.
function drawLoreFragment(ctx, lf) {
  const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1;
  if (tryDrawPointObjectAnim(ctx, lf, _ts, 22)) return;

  const pulse = Math.sin(frameCount * 0.05) * 0.3 + 0.7;
  const x = lf.x, y = lf.y;
  const mode = lf.mode || 'overlay';
  const rgb = mode === 'none' ? '148, 163, 184' : '251, 191, 36';

  const glowSize = 26;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
  gradient.addColorStop(0, `rgba(${rgb}, ${pulse * 0.35})`);
  gradient.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(x - glowSize, y - glowSize, glowSize * 2, glowSize * 2);

  // Diamond shard
  ctx.fillStyle = `rgba(${rgb}, ${pulse})`;
  ctx.beginPath();
  ctx.moveTo(x, y - 9);
  ctx.lineTo(x + 6, y);
  ctx.lineTo(x, y + 9);
  ctx.lineTo(x - 6, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = mode === 'none' ? 'rgba(226, 232, 240, 0.6)' : 'rgba(253, 230, 138, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (mode === 'cutscene') {
    ctx.strokeStyle = `rgba(${rgb}, ${pulse * 0.8})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Draw a Fracture Pip pickup (violet diamond, echoes the HUD fracture-pip glyph)
function drawFracturePip(ctx, fp) {
  const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1;
  if (tryDrawPointObjectAnim(ctx, fp, _ts, 26)) return;

  const pulse = Math.sin(frameCount * 0.07) * 0.3 + 0.7;
  const x = fp.x, y = fp.y;

  const glowSize = 30;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
  gradient.addColorStop(0, `rgba(196, 181, 253, ${pulse * 0.4})`);
  gradient.addColorStop(1, 'rgba(196, 181, 253, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x - glowSize, y - glowSize, glowSize * 2, glowSize * 2);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4 + Math.sin(frameCount * 0.03) * 0.15);
  ctx.fillStyle = `rgba(196, 181, 253, ${pulse})`;
  ctx.fillRect(-7, -7, 14, 14);
  ctx.strokeStyle = 'rgba(233, 213, 255, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-7, -7, 14, 14);
  ctx.restore();
}

// --- Area-specific parallax backdrop (deep nebulae + silhouette shapes) ---
// Cheap deterministic pseudo-random number generator (no dependency needed)
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Single source of truth for "does the player satisfy this transition's
// `requires` gate" — used both to actually block traversal (update loop)
// and to draw the locked/unlocked door tint (draw loop). Any `requires`
// value not listed here (e.g. `graviton_surge`, or any other ability not
// implemented yet) returns false — a deliberately-inert stub door must
// never be treated as open just because its ability doesn't exist yet.
// A comma-joined `requires` (e.g. 'stillpoint,phase_dash,timeline_x_roads_2_visited')
// is an AND of each sub-condition, checked recursively below.
function hasAbilityRequirement(requires) {
  if (requires.indexOf(',') !== -1) {
    return requires.split(',').every(part => hasAbilityRequirement(part));
  }
  if (requires === 'phase_dash') return abilityState.hasPhaseDash;
  if (requires === 'shard_shot') return abilityState.hasShardShot;
  if (requires === 'stillpoint') return abilityState.hasStillpoint;
  if (requires === 'charged_attack') return abilityState.hasChargedAttack;
  if (requires === 'void_tether') return abilityState.hasVoidTether;
  if (requires === 'graviton_surge') return abilityState.hasGravitonSurge;
  if (requires === 'boss_gate') return abilityState.hasPhaseDash && abilityState.hasShardShot && abilityState.hasStillpoint;
  if (requires === 'tutorial_complete') return isTutorialComplete();
  // "post-game" locks (Sovereign Rooms) — unlocked once the Sovereign is defeated.
  if (requires === 'post_game') return bossDefeated;
  // "requires Timeline X Roads, Room 2" — implemented as a room-visited flag.
  if (requires === 'timeline_x_roads_2_visited') return !!discoveredAreas['timeline_x_roads_room2'];
  // Echo Bridge prison shortcut — unlocked once the mandatory prison path
  // has actually been walked through to its far end (Void Expanse, Room 1).
  if (requires === 'prison_sequence_finished') return !!discoveredAreas['void_expanse_room1'];
  if (requires === 'four_fracture_pips') return player.fractureMax >= 4;
  if (requires === 'ten_lore_pips') return lorePipsCollectedTotal() >= 10;
  return false;
}

function areaSeed(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h || 1;
}

function midKindFor(id) {
  if (id === 'echo_bridge' || id === 'upper_ruins' || id === 'the_vault' || id === 'antechamber') return 'ruins';
  if (id === 'crystal_cavern' || id === 'the_forge') return 'crystals';
  if (id === 'the_rift' || id === 'boss_arena') return 'debris';
  return 'shards'; // the_fracture and fallback
}

function hexToRgba(hex, alpha) {
  let h = (hex || '#c4b5fd').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.substr(0, 2), 16) || 0;
  const g = parseInt(h.substr(2, 2), 16) || 0;
  const b = parseInt(h.substr(4, 2), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ═══════════════════════════════════════════════════════════════════════
// REGION VISUAL IDENTITY (Task 4, session_priorities.md #4) — pure
// rendering, derived entirely from `room.region`. No new fields on
// platforms/transitions and nothing the level editor needs to author —
// this is a presentation layer on top of the existing geometry data, not
// part of the saved room shape. A region with no entry in REGION_STYLES
// (origin, crag, or any future region not decorated yet) just renders with
// the plain look it always had.
// ═══════════════════════════════════════════════════════════════════════
// Numeric knobs (diamondSpacing/ringCount/ringSpacing/spokeCount) are
// optional per-region tuning read by decorateRoomForRegion() below, each
// falling back to the original hardcoded constant when unset — added so
// editor/room_scene_editor.html (absorbing the never-built
// level_designer.html's scope, Plans/archive/room_scene_editor_plan.md §0) has real
// numbers to expose sliders for, without changing look for any room that
// doesn't go through that editor.
const REGION_STYLES = {
  mirror_veil:   { primary: '#c084fc', secondary: '#7c3aed', glow: '#e9d5ff', diamondSpacing: 140 },
  event_horizon: { primary: '#818cf8', secondary: '#4338ca', glow: '#c7d2fe', ringCount: 5, ringSpacing: 90 },
  chrono_rift:   { primary: '#a78bfa', secondary: '#6d28d9', glow: '#ddd6fe', spokeCount: 8 },
};
if (typeof window !== 'undefined') window.REGION_STYLES = REGION_STYLES;

// editor/room_scene_editor.html's region-style color/numeric tuning panel
// live-saves here (whole-style replace per region, same one-key-per-unit
// convention as AREA_OVERRIDES_KEY in area.js) — applied once at load so
// index.html/enemy_test.html/etc. pick up in-progress tuning without a
// copy-paste round trip.
const REGION_STYLE_OVERRIDES_KEY = 'stillpoint_region_style_overrides_v1';
(function applyRegionStyleOverrides() {
  const overrides = readOverrideJSON(REGION_STYLE_OVERRIDES_KEY, OverrideShape.object);
  if (!overrides) return;
  for (const region in overrides) REGION_STYLES[region] = overrides[region];
})();

// Room-wide ambient effect — called once per frame, drawn under the
// platforms (before the platforms loop in draw()) so it reads as
// background depth, not an overlay on top of the player.
function decorateRoomForRegion(ctx, room, region) {
  const style = REGION_STYLES[region];
  if (!style) return;

  ctx.save();
  if (region === 'mirror_veil') {
    // Reflection seam — a soft horizontal mirror line at room mid-height,
    // with a scattered diamond motif along it (upside-down-world cue).
    const midY = room.groundY - 140;
    ctx.strokeStyle = hexToRgba(style.glow, 0.08);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(room.width, midY);
    ctx.stroke();
    ctx.fillStyle = hexToRgba(style.primary, 0.06);
    const diamondSpacing = style.diamondSpacing || 140;
    for (let x = 40; x < room.width; x += diamondSpacing) {
      ctx.save();
      ctx.translate(x, midY);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    }
  } else if (region === 'event_horizon') {
    // Gravitational pull vignette — radial glow anchored off-screen left
    // (visual read for the region's "constant leftward pull" mechanic),
    // plus slow-pulsing concentric event-horizon rings.
    const midY = room.groundY / 2;
    const grad = ctx.createRadialGradient(-200, midY, 50, -200, midY, 700);
    grad.addColorStop(0, hexToRgba(style.primary, 0.10));
    grad.addColorStop(1, hexToRgba(style.primary, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, room.width, room.groundY);
    ctx.strokeStyle = hexToRgba(style.glow, 0.06);
    ctx.lineWidth = 1.5;
    const ringSpacing = style.ringSpacing || 90;
    const ringCount = style.ringCount || 5;
    for (let i = 0; i < ringCount; i++) {
      const r = 80 + i * ringSpacing;
      const pulseR = r + Math.sin(frameCount * 0.01 + r) * 6;
      ctx.beginPath();
      ctx.arc(-200, midY, pulseR, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
  } else if (region === 'chrono_rift') {
    // Clock-face ghost — slow-rotating spokes from a fixed hub, evoking
    // the region's looping/wrap-around time mechanic.
    const hubX = room.width / 2, hubY = room.groundY - 160;
    ctx.strokeStyle = hexToRgba(style.glow, 0.06);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(hubX, hubY, 90, 0, Math.PI * 2);
    ctx.stroke();
    const spokeCount = style.spokeCount || 8;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2 + frameCount * 0.003;
      ctx.beginPath();
      ctx.moveTo(hubX, hubY);
      ctx.lineTo(hubX + Math.cos(angle) * 90, hubY + Math.sin(angle) * 90);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Per-platform edge decoration — called after drawPlatform() for each
// platform. No geometry change, purely a visual layer on top.
function decoratePlatformForRegion(ctx, plat, region) {
  const style = REGION_STYLES[region];
  if (!style || plat.destructible) return; // crystal walls keep their own dedicated look

  ctx.save();
  if (region === 'mirror_veil') {
    // Reflection ghost — a faint upside-down copy of the platform below it.
    ctx.fillStyle = hexToRgba(style.primary, 0.12);
    ctx.fillRect(plat.x, plat.y + plat.h + 4, plat.w, plat.h);
  } else if (region === 'event_horizon') {
    // Inward-curving corner glows, suggesting gravitational lensing at the edges.
    ctx.strokeStyle = hexToRgba(style.glow, 0.35);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(plat.x, plat.y, 10, 0, Math.PI / 2);
    ctx.arc(plat.x + plat.w, plat.y, 10, Math.PI / 2, Math.PI);
    ctx.stroke();
  } else if (region === 'chrono_rift') {
    // Tick marks along the top edge, like a timeline ruler.
    ctx.strokeStyle = hexToRgba(style.glow, 0.3);
    ctx.lineWidth = 1;
    for (let tx = plat.x + 8; tx < plat.x + plat.w - 4; tx += 16) {
      ctx.beginPath();
      ctx.moveTo(tx, plat.y);
      ctx.lineTo(tx, plat.y - 4);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Cave-mouth door rendering, replacing the old flat rectangle for every
// transition in every room (region-agnostic shape logic — tinted per-room
// via mapAccent/ambientColor so undecorated regions still look distinct
// from each other, just without the extra ambient/platform treatment
// above). Three shapes: glowing portal (ability-gated), one-way arrow
// (shortcut/oneWay), arched stone entrance (everything else).
function drawDoor(ctx, trans, area, blocked) {
  // Edge exit (2026-07-27) — Hollow Knight-style "no floating door," just
  // open space at the room's own boundary: the camera clamp already stops
  // panning once the player's within one screen-width of the edge (see
  // updateCamera()), so the player visually walks past the edge of the
  // SCREEN, not through a decorated portal/arch sitting mid-room. An
  // ability gate still needs to communicate "locked" somehow even on an
  // edge exit, so that one case keeps the glowing-portal treatment; a
  // plain or shortcut edge exit draws nothing at all.
  if (trans.edgeExit && !trans.requires) return;

  // Authored animation (same tryDrawRoomObjectAnim() bridge drawPlatform()
  // uses) overrides the procedural arch/portal/shortcut-arrow shapes below.
  // Checked after the edgeExit guard above, not before — an edge exit's
  // "draw nothing" is a deliberate design invariant (Hollow Knight-style,
  // see the comment above), not something a custom animKey should be able
  // to silently defeat.
  const _ts = (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1;
  if (tryDrawRoomObjectAnim(ctx, trans, _ts)) return;

  const tint = area.mapAccent || area.ambientColor || '#c4b5fd';
  const color = blocked ? '#946060' : tint;
  const cx = trans.x + trans.w / 2, cy = trans.y + trans.h / 2;
  const pulse = Math.sin(frameCount * 0.03) * 0.15 + 0.15;

  ctx.save();
  if (trans.requires) {
    // Ability gate — glowing portal.
    ctx.fillStyle = hexToRgba(color, blocked ? pulse * 0.6 : pulse + 0.15);
    ctx.beginPath();
    ctx.ellipse(cx, cy, trans.w / 2, trans.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(color, 0.6);
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (trans.shortcut || trans.oneWay) {
    // Shortcut — a one-way arrow set inside a plain frame.
    ctx.strokeStyle = hexToRgba(color, 0.5);
    ctx.lineWidth = 2;
    ctx.strokeRect(trans.x, trans.y, trans.w, trans.h);
    ctx.fillStyle = hexToRgba(color, pulse + 0.2);
    ctx.beginPath();
    const dir = trans.toX > trans.x + trans.w ? 1 : -1;
    ctx.moveTo(cx - dir * 6, cy - 8);
    ctx.lineTo(cx + dir * 8, cy);
    ctx.lineTo(cx - dir * 6, cy + 8);
    ctx.closePath();
    ctx.fill();
  } else {
    // Regular door — arched stone entrance (rounded top, not a rectangle).
    const archTop = trans.y;
    const radius = Math.min(trans.w / 2, 18);
    ctx.fillStyle = hexToRgba(color, pulse + 0.12);
    ctx.beginPath();
    ctx.moveTo(trans.x, trans.y + trans.h);
    ctx.lineTo(trans.x, archTop + radius);
    ctx.arcTo(trans.x, archTop, trans.x + radius, archTop, radius);
    ctx.lineTo(trans.x + trans.w - radius, archTop);
    ctx.arcTo(trans.x + trans.w, archTop, trans.x + trans.w, archTop + radius, radius);
    ctx.lineTo(trans.x + trans.w, trans.y + trans.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexToRgba(color, 0.4);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

// Backdrop elements are generated once per area and cached on the area object
function getAreaBackdrop(area) {
  if (area._backdrop) return area._backdrop;
  const rng = mulberry32(areaSeed(area.id));
  const deep = [];
  for (let i = 0; i < 6; i++) {
    deep.push({ x: rng() * area.width, y: rng() * H * 0.6, r: 60 + rng() * 90 });
  }
  const kind = midKindFor(area.id);
  const mid = [];
  const count = kind === 'gears' ? 4 : 7;
  for (let i = 0; i < count; i++) {
    mid.push({
      x: rng() * area.width,
      y: area.groundY - 40 - rng() * Math.min(area.groundY * 0.5, 260),
      size: 30 + rng() * 50,
      rot: rng() * Math.PI,
    });
  }
  area._backdrop = { deep, mid, kind };
  return area._backdrop;
}

function drawMidShape(ctx, kind, x, y, size, rot, color) {
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'ruins') {
    // Broken marble pillar silhouette
    ctx.fillStyle = 'rgba(10, 10, 18, 0.5)';
    ctx.fillRect(-size * 0.15, -size, size * 0.3, size);
    ctx.fillStyle = hexToRgba(color, 0.1);
    ctx.fillRect(-size * 0.22, -size - 6, size * 0.44, 8);
  } else if (kind === 'crystals') {
    // Sharp jagged geode
    ctx.fillStyle = hexToRgba(color, 0.14);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.4, -size * 0.1);
    ctx.lineTo(0, size * 0.35);
    ctx.lineTo(-size * 0.4, -size * 0.1);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'gears') {
    // Slowly rotating clockwork gear
    ctx.rotate(rot + frameCount * 0.0015 * (size > 50 ? 1 : -1));
    ctx.strokeStyle = hexToRgba(color, 0.18);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * size * 0.4, Math.sin(a) * size * 0.4);
      ctx.lineTo(Math.cos(a) * size * 0.58, Math.sin(a) * size * 0.58);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  } else if (kind === 'debris') {
    // Drifting void debris
    ctx.rotate(rot);
    ctx.fillStyle = hexToRgba(color, 0.1);
    ctx.fillRect(-size * 0.3, -size * 0.1, size * 0.6, size * 0.18);
  } else {
    // Generic fractured shard silhouette
    ctx.fillStyle = hexToRgba(color, 0.08);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.lineTo(size * 0.3, size * 0.2);
    ctx.lineTo(-size * 0.2, size * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ── Uploaded room-art image cache (Plans/archive/room_scene_editor_plan.md §2/§5) ──
// area.backdropLayers[].imageId holds one of three forms: a RoomImageStore
// (IndexedDB, `idb_...`) id — browser-local working-draft storage — a raw
// `data:` URL (self-contained legacy/exported content), or — added
// 2026-08-03 — a real path under assets/art/rooms/ (a checked-in PNG file,
// what "💾 Save as PNG file" in room_scene_editor.html now produces). Same
// dual/triple-form convention animdata.js's getAnimImage() established for
// character sprites, copied here rather than reinvented. Decoded Image
// objects are cached so drawAreaBackdrop() never constructs one per frame;
// draw() call sites already tolerate an image that's still mid-load
// (checked via naturalWidth below), same as everywhere else in this file.
const _roomImageCache = {};
function getRoomImage(ref) {
  let img = _roomImageCache[ref];
  if (img) return img;
  img = new Image();
  _roomImageCache[ref] = img;
  if (ref.startsWith('data:')) {
    img.src = ref;
  } else if (ref.startsWith('idb_') && typeof RoomImageStore !== 'undefined') {
    RoomImageStore.get(ref).then((dataUrl) => { if (dataUrl) img.src = dataUrl; })
      .catch(() => {}); // IndexedDB unavailable/blocked — layer just stays blank
  } else {
    // Real file path (assets/art/rooms/...) — load directly, no IndexedDB round-trip.
    img.src = ref;
  }
  return img;
}
// editor/room_scene_editor.html calls this right after a fresh upload so its
// own preview shows the image instantly instead of round-tripping through
// IndexedDB first (write, then immediately read back) — same reason
// animdata.js has primeAnimImage().
function primeRoomImage(id, dataUrl) {
  const img = new Image();
  img.src = dataUrl;
  _roomImageCache[id] = img;
  return img;
}

// Optional per-layer animation (2026-08-01) — `layer.frames`, an array of
// `{imageId, duration}` (duration in ticks, same unit as animdata.js's
// ANIM_DEFS frames), always loops (no one-shot backdrop makes sense — a
// waterfall, a torch, a pulsing rift don't "finish"). Deliberately stateless
// (derived purely from the global `frameCount`, same convention as this
// file's other frameCount-driven pulses) rather than mutating per-layer
// timer state during draw — draw() staying read-only keeps this safe to
// call from anywhere (including editor previews) without a matching
// update() tick to drive it. A layer with no `frames` (every layer today)
// isn't touched by this at all — drawBackdropLayer() falls straight back to
// its original single `imageId` path below.
function pickBackdropFrame(layer) {
  const frames = layer.frames;
  if (!frames || !frames.length) return null;
  if (frames.length === 1) return frames[0];
  const total = frames.reduce((sum, f) => sum + (f.duration || 8), 0);
  let t = frameCount % total;
  for (const f of frames) {
    const d = f.duration || 8;
    if (t < d) return f;
    t -= d;
  }
  return frames[frames.length - 1];
}

// Draw one backdropLayers[] entry (see the schema comment on AREAS in
// area.js) — parallax offset, base position, uniform scale, optional
// horizontal/both-axis tiling for seamless scroll art, a tint overlay, and
// opacity. Screen-space, same manual-offset approach as the procedural
// deep/mid layers below.
function drawBackdropLayer(ctx, layer, cam) {
  if (layer.hidden) return;
  const frame = pickBackdropFrame(layer);
  const imageId = frame ? frame.imageId : layer.imageId;
  if (!imageId) return;
  const img = getRoomImage(imageId);
  if (!img.complete || !img.naturalWidth) return;

  const scale = layer.scale || 1;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const offX = cam.x * (layer.parallaxX ?? 0) - (layer.x || 0);
  const offY = cam.y * (layer.parallaxY ?? 0) - (layer.y || 0);
  const opacity = layer.opacity ?? 1;

  ctx.save();
  ctx.globalAlpha = opacity;

  const drawAt = (x, y) => {
    ctx.drawImage(img, x, y, w, h);
    if (layer.tint) {
      ctx.fillStyle = hexToRgba(layer.tint, 1);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  if (layer.repeat === 'x' || layer.repeat === 'both') {
    const startX = -offX % w - w;
    for (let x = startX; x < W + w; x += w) {
      if (layer.repeat === 'both') {
        const startY = -offY % h - h;
        for (let y = startY; y < H + h; y += h) drawAt(x, y);
      } else {
        drawAt(x, -offY);
      }
    }
  } else {
    drawAt(-offX, -offY);
  }
  ctx.restore();
}

// Draw the parallax backdrop for an area (screen space, manual offset).
// area.backdropLayers[] (hand-authored/uploaded art, drawn back-to-front in
// array order) always draws first; the original procedural deep/mid nebula
// layers draw on top of that unless area.hideProceduralBackdrop is set, for
// a room whose custom art fully replaces them (Plans/archive/room_scene_editor_plan.md
// §7 Q2). Neither field existing on a room is the common case — that room
// renders exactly as before this feature.
function drawAreaBackdrop(ctx, area, cam) {
  if (area.backdropLayers) {
    for (const layer of area.backdropLayers) drawBackdropLayer(ctx, layer, cam);
  }
  if (area.hideProceduralBackdrop) return;

  const bd = getAreaBackdrop(area);
  const color = area.ambientColor || '#c4b5fd';

  // Deep layer — slow drifting nebulae
  const deepOffset = cam.x * 0.04;
  for (const n of bd.deep) {
    const x = n.x - deepOffset;
    if (x < -200 || x > W + 200) continue;
    const grad = ctx.createRadialGradient(x, n.y, 0, x, n.y, n.r);
    grad.addColorStop(0, hexToRgba(color, 0.06));
    grad.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mid layer — area-specific silhouettes, faster parallax
  const midOffset = cam.x * 0.3;
  for (const m of bd.mid) {
    const x = m.x - midOffset;
    if (x < -150 || x > W + 150) continue;
    drawMidShape(ctx, bd.kind, x, m.y, m.size, m.rot, color);
  }
}

// Show/hide HUD (health, ability icons, area name, controls hint) — all HUD
// elements are now drawn directly on the canvas, so this just toggles a flag.
function showUI(show) {
  hudVisible = show;
  if (show) {
    playStartFrame = frameCount; // restart the controls-hint fade timer
  }
}

// Canvas click for menu
canvas.addEventListener('click', () => {
  if (gameState === 'menu') {
    menuClick = true;
  }
});

