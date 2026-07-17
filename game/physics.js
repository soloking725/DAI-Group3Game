// Shared entity physics — ONE collision resolver for every moving thing
// that isn't the player (enemies, the Child companion, future entities).
//
// Why this exists (2026-07-16): enemy platform collision used to be
// duplicated inline in ~11 places across enemy.js subclasses, each a
// slightly different copy of "land on top of a platform from above" with
// none of the fixes the player's collision block accumulated. Concrete
// user-visible bugs that pattern caused:
//   - enemies walking into a tall wall got snapped to its TOP (no
//     prevBottom guard — the landing check can't tell "falling onto the
//     top" from "walking into the side"),
//   - enemies ignored ceilings entirely (no vy<0 check anywhere),
//   - enemies clipped through wall sides at low speed (the game.js
//     wall-bounce pass only catches |vx| >= WALL_BOUNCE_MIN_SPEED, and
//     only for plat.wall-flagged platforms).
// The player's block in player.js stays as-is (it's correct, and has
// player-only concerns: wall-jump coyote, justLanded SFX). This module is
// the same *logic* generalized: velocity-scaled margins, prevBottom
// landing guard, plat.wall / plat.ceiling / destructible handling.
//
// Load order: after input.js, before enemy.js (see index.html) — enemy.js
// and companion.js call these at update time.

// Retained speed after a hard wall bounce, and the minimum speed that
// counts as "hard" — mirrors game.js's original wall-bounce pass
// (deliberately hard: a wall-adjacent knockback is a combo opener).
// Kept as physics.js's own constants so the resolver has no load-order
// dependency on game.js; game.js's copies now just alias these.
const PHYS_WALL_BOUNCE_MULT = 0.85;
const PHYS_WALL_BOUNCE_MIN_SPEED = 3;

// ── The resolver ────────────────────────────────────────────────────────────
// Mutates entity.x/y/vx/vy and entity.grounded. Call AFTER applying velocity
// to position for the frame.
//
//   entity    — needs x, y, width, height, vx, vy, grounded
//   platforms — the room's platform list (area.platforms); may be null/empty
//   opts:
//     movedX/movedY — how far the entity ACTUALLY moved this frame (defaults
//                     to vx/vy; pass vx*timeScale etc. when movement is
//                     time-scaled, so the tunneling margins stay correct)
//     groundY       — world floor y (bounds.groundY) or undefined for rooms
//                     with no implicit floor
//     bounds        — {left, right} world clamp, or undefined
//     floors        — resolve top-landing (default true)
//     ceilings      — resolve head-bump on platform undersides (default true)
//     walls         — resolve side collision (default true)
//     bounce        — on a side hit at >= PHYS_WALL_BOUNCE_MIN_SPEED,
//                     reverse vx at PHYS_WALL_BOUNCE_MULT instead of
//                     stopping (default false; enemies pass true). The
//                     caller reads result.bounced for impact VFX.
//
// Returns { landed, hitCeiling, wallNormal, bounced }:
//   landed     — true if the entity was placed on a floor this call
//   hitCeiling — true if an upward move was stopped by a platform underside
//   wallNormal — 0 none, 1 wall on entity's right, -1 wall on entity's left
//   bounced    — true if a hard side hit reversed vx (bounce mode only)
function resolveEntityCollision(entity, platforms, opts = {}) {
  const movedX = opts.movedX !== undefined ? opts.movedX : entity.vx;
  const movedY = opts.movedY !== undefined ? opts.movedY : entity.vy;
  const doFloors = opts.floors !== false;
  const doCeilings = opts.ceilings !== false;
  const doWalls = opts.walls !== false;

  const result = { landed: false, hitCeiling: false, wallNormal: 0, bounced: false };

  // Velocity-scaled margins (same fix as player.js 2026-07-16): fixed
  // margins tunnel at knockback/dash speeds, so the tolerance scales with
  // how far the entity actually moved this frame.
  const landingMargin = Math.max(8, Math.abs(movedY) + 2);
  const wallMargin = Math.max(10, Math.abs(movedX) + 2);

  if (platforms) {
    // Position before this frame's vertical movement — the landing check
    // uses it so an entity moving into a tall platform's SIDE (whose bottom
    // edge is already below the platform top) never gets snapped up to the
    // top surface. This guard is exactly what the old inline enemy loops
    // were missing.
    const prevBottom = (entity.y + entity.height) - movedY;

    for (const plat of platforms) {
      if (plat.destructible && plat.hp <= 0) continue;

      const overlapsH = entity.x + entity.width > plat.x && entity.x < plat.x + plat.w;

      if (overlapsH) {
        // Floor landing — skipped for plat.wall (side-wall pieces are not
        // standable, matching the player's rule).
        if (doFloors && !plat.wall &&
            prevBottom <= plat.y + landingMargin &&
            entity.y + entity.height > plat.y &&
            entity.y + entity.height < plat.y + plat.h + landingMargin &&
            entity.vy >= 0) {
          entity.y = plat.y - entity.height;
          entity.vy = 0;
          entity.grounded = true;
          result.landed = true;
        } else if (doCeilings && !plat.wall &&
                   entity.y < plat.y + plat.h && entity.y > plat.y - landingMargin &&
                   entity.vy < 0) {
          // Head bump on the platform's underside.
          entity.y = plat.y + plat.h;
          entity.vy = 0;
          result.hitCeiling = true;
        }
      }

      // Side collision — vertical overlap with the platform's edge band.
      // The +4 matches the player's block: ignore hairline overlap at the
      // very top so walking onto a platform's surface doesn't read as
      // hitting its side.
      if (doWalls &&
          entity.y + entity.height > plat.y + 4 && entity.y < plat.y + plat.h) {
        const hardHit = opts.bounce && Math.abs(entity.vx) >= PHYS_WALL_BOUNCE_MIN_SPEED;
        // Right side of entity into left side of platform
        if (entity.x + entity.width >= plat.x && entity.x + entity.width < plat.x + wallMargin && entity.vx >= 0) {
          entity.x = plat.x - entity.width;
          if (hardHit) { entity.vx = -entity.vx * PHYS_WALL_BOUNCE_MULT; result.bounced = true; }
          else if (entity.vx > 0) entity.vx = 0;
          result.wallNormal = 1;
        }
        // Left side of entity into right side of platform
        else if (entity.x <= plat.x + plat.w && entity.x > plat.x + plat.w - wallMargin && entity.vx <= 0) {
          entity.x = plat.x + plat.w;
          if (hardHit) { entity.vx = -entity.vx * PHYS_WALL_BOUNCE_MULT; result.bounced = true; }
          else if (entity.vx < 0) entity.vx = 0;
          result.wallNormal = -1;
        }
      }
    }
  }

  // World floor (rooms that define one) — the player deliberately has no
  // such fallback (pits are real, see player.js), but enemies/companion
  // keep it: an enemy should never fall out of the world.
  if (doFloors && opts.groundY !== undefined && entity.y + entity.height > opts.groundY) {
    entity.y = opts.groundY - entity.height;
    entity.vy = 0;
    entity.grounded = true;
    result.landed = true;
  }

  // World side bounds
  if (opts.bounds) {
    if (entity.x < opts.bounds.left) entity.x = opts.bounds.left;
    if (entity.x + entity.width > opts.bounds.right) entity.x = opts.bounds.right - entity.width;
  }

  return result;
}

// ── Enemy convenience wrapper ───────────────────────────────────────────────
// What every ground enemy's physics tail should call instead of its own
// inline platform loop. Applies the full resolver (floors + walls with
// bounce + ceilings) against the current room, handles the juggle-landing
// rule, and flags hard bounces for game.js's impact VFX pass
// (enemy.wallBouncedThisFrame — consumed and cleared there).
//
// timeScale: the same _ts the enemy scaled its movement by this frame.
function resolveEnemyPhysics(enemy, bounds, timeScale = 1) {
  const area = (typeof getCurrentArea === 'function') ? getCurrentArea() : null;
  const result = resolveEntityCollision(enemy, area ? area.platforms : null, {
    movedX: enemy.vx * timeScale,
    movedY: enemy.vy * timeScale,
    groundY: bounds ? bounds.groundY : undefined,
    bounds: bounds,
    bounce: true,
  });
  if (result.landed) enemy.juggling = false; // landing ends juggle state
  if (result.bounced) enemy.wallBouncedThisFrame = true;
  return result;
}

// ── Spawn safety ────────────────────────────────────────────────────────────
// Nothing used to verify a spawn point wasn't inside a platform (user
// report 2026-07-16: "you can spawn inside a platform"). If the entity's
// AABB overlaps any solid platform, push it out along the smallest
// penetration axis (preferring UP — embedded-in-the-floor is by far the
// most common authoring error), repeating a few times in case the push
// lands it in a neighbor. console.warns so bad authored positions surface
// in the console the same way validateAreaGraph() errors do.
// `quiet` suppresses the console.warn — pass true for runtime relocations
// (e.g. a Stutterer teleport landing in a wall) where the overlap is not an
// authoring error, just a roll that needs correcting.
function nudgeOutOfPlatforms(entity, platforms, label = 'entity', quiet = false) {
  if (!platforms) return false;
  let moved = false;
  for (let pass = 0; pass < 4; pass++) {
    let overlapping = null;
    for (const plat of platforms) {
      if (plat.destructible && plat.hp <= 0) continue;
      if (entity.x + entity.width > plat.x && entity.x < plat.x + plat.w &&
          entity.y + entity.height > plat.y && entity.y < plat.y + plat.h) {
        overlapping = plat;
        break;
      }
    }
    if (!overlapping) break;

    const upDist = (entity.y + entity.height) - overlapping.y;
    const downDist = (overlapping.y + overlapping.h) - entity.y;
    const leftDist = (entity.x + entity.width) - overlapping.x;
    const rightDist = (overlapping.x + overlapping.w) - entity.x;
    const min = Math.min(upDist * 0.75 /* prefer up */, downDist, leftDist, rightDist);

    if (min === upDist * 0.75) entity.y = overlapping.y - entity.height;
    else if (min === downDist) entity.y = overlapping.y + overlapping.h;
    else if (min === leftDist) entity.x = overlapping.x - entity.width;
    else entity.x = overlapping.x + overlapping.w;
    moved = true;
  }
  if (moved && !quiet) {
    console.warn(`[physics] ${label} spawned inside a platform — nudged to (${Math.round(entity.x)}, ${Math.round(entity.y)}). Fix the authored spawn position.`);
  }
  return moved;
}

// Debug-tool access (same pattern as area.js's window.AREAS)
if (typeof window !== 'undefined') {
  window.resolveEntityCollision = resolveEntityCollision;
  window.nudgeOutOfPlatforms = nudgeOutOfPlatforms;
}
