// Shared entity physics — ONE collision resolver for every moving thing,
// including the player (player.js calls in too as of 2026-07-19 — see
// below).
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
//
// 2026-07-19: rewritten to resolve X (walls) and Y (floors/ceilings) in two
// separate passes instead of one combined guess-from-position-margins pass
// — modeled on the standard approach most solid 2D platformers use
// (Hollow Knight included), after a user report that jumping into a plain
// tall platform (no `wall` flag — what the level editor's basic plat tool
// produces) fell straight through the floor. The single-pass version could
// get a diagonal jump arc's ceiling-bump branch to fire against an
// un-flagged tall platform and snap `y` to that platform's bottom edge,
// which for a wall built rising off the floor sits flush with the floor's
// own y — putting the whole body inside/below it with no recovery. See the
// resolver's own comment block for the full mechanism. Player.js's
// previously-separate, hand-duplicated collision block had the identical
// flaw (same heuristic, same bug), so it now calls this resolver too
// instead of carrying its own copy — player-only concerns (wall-jump
// coyote, justLanded SFX, one-way drop-through) are layered on top of the
// returned result, the same pattern resolveEnemyPhysics already used.
//
// Load order: after input.js, before player.js/enemy.js (see index.html).

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
//     skipOneWay    — ignore all `oneWay` platforms entirely this call
//                     (player: holding Down while grounded on one, i.e.
//                     dropThroughTimer > 0 — the drop-through window).
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
  const skipOneWay = !!opts.skipOneWay; // player: dropThroughTimer > 0 (holding Down on a one-way platform)

  const result = { landed: false, hitCeiling: false, wallNormal: 0, bounced: false };

  // Velocity-scaled margins (same fix as player.js 2026-07-16): fixed
  // margins tunnel at knockback/dash speeds, so the tolerance scales with
  // how far the entity actually moved this frame.
  const landingMargin = Math.max(8, Math.abs(movedY) + 2);
  const wallMargin = Math.max(10, Math.abs(movedX) + 2);

  if (platforms) {
    // Axis-separated resolution (2026-07-19 rewrite, modeled on the
    // standard "resolve X, then resolve Y" approach most solid platformer
    // engines use, Hollow Knight included) — user report: jumping into a
    // plain tall platform (no `wall` flag — exactly what you get from the
    // level editor's basic plat tool) fell straight through the floor.
    // Root cause: the old single combined-move pass tried to guess "is
    // this a landing or a head-bump" from position margins alone. A jump
    // arc's diagonal motion could get its ceiling-bump branch to fire
    // against a tall un-flagged platform, snapping `y` to that platform's
    // BOTTOM edge — which, for a wall built rising off the main floor (the
    // natural way to place one), sits flush with the floor's own y. That
    // single snap put the entire body inside/below the floor with
    // `grounded` never set true, and the next frame's landing check was
    // already past its margin — the entity fell through into the void
    // forever, no different platform or flag ever catching it.
    //
    // Resolving X first — using the position BEFORE this frame's Y
    // movement — means a platform hit purely from the side gets the
    // entity's x clamped fully outside its horizontal span before the
    // floor/ceiling pass ever runs. That pass's overlapsH check then
    // naturally excludes that platform (no horizontal overlap left), so it
    // can never be misread as a ceiling or floor no matter the approach
    // angle — the ambiguity is structural, not a case a flag has to opt
    // out of. `plat.wall` is still honored (some pieces should never be
    // standable even when not approached diagonally), but correctness no
    // longer depends on remembering to set it.
    const preY = entity.y - movedY;
    const actualY = entity.y;

    // ── Pass 1: X axis (walls) — vertical overlap band uses preY ──────────
    entity.y = preY;
    if (doWalls) {
      for (const plat of platforms) {
        if (plat.destructible && plat.hp <= 0) continue;
        if (plat.hazard) continue;
        if (plat.crumble && plat.crumbleGone) continue;
        if (plat.oneWay) continue; // never a side-wall, matches original rule
        if (skipOneWay && plat.oneWay) continue;

        // The +4 matches the original: ignore hairline overlap at the very
        // top so walking onto a platform's surface doesn't read as hitting
        // its side.
        if (!(entity.y + entity.height > plat.y + 4 && entity.y < plat.y + plat.h)) continue;

        const hardHit = opts.bounce && Math.abs(entity.vx) >= PHYS_WALL_BOUNCE_MIN_SPEED;
        if (entity.x + entity.width >= plat.x && entity.x + entity.width < plat.x + wallMargin && entity.vx >= 0) {
          entity.x = plat.x - entity.width;
          if (hardHit) { entity.vx = -entity.vx * PHYS_WALL_BOUNCE_MULT; result.bounced = true; }
          else if (entity.vx > 0) entity.vx = 0;
          result.wallNormal = 1;
        } else if (entity.x <= plat.x + plat.w && entity.x > plat.x + plat.w - wallMargin && entity.vx <= 0) {
          entity.x = plat.x + plat.w;
          if (hardHit) { entity.vx = -entity.vx * PHYS_WALL_BOUNCE_MULT; result.bounced = true; }
          else if (entity.vx < 0) entity.vx = 0;
          result.wallNormal = -1;
        }
      }
    }

    // ── Pass 2: Y axis (floor/ceiling) — uses the now-corrected x, actual y ──
    entity.y = actualY;
    const prevBottom = (entity.y + entity.height) - movedY;
    if (doFloors || doCeilings) {
      for (const plat of platforms) {
        if (plat.destructible && plat.hp <= 0) continue;
        if (plat.hazard) continue;
        if (plat.crumble && plat.crumbleGone) continue;
        if (skipOneWay && plat.oneWay) continue;

        const overlapsH = entity.x + entity.width > plat.x && entity.x < plat.x + plat.w;
        if (!overlapsH) continue;

        // Floor landing — skipped for plat.wall (side-wall pieces are not
        // standable). `oneWay` pieces DO land normally; they only skip the
        // wall pass above so you can jump up through them.
        if (doFloors && !plat.wall &&
            prevBottom <= plat.y + landingMargin &&
            entity.y + entity.height > plat.y &&
            entity.y + entity.height < plat.y + plat.h + landingMargin &&
            entity.vy >= 0) {
          entity.y = plat.y - entity.height;
          entity.vy = 0;
          entity.grounded = true;
          entity.standingPlat = plat;
          result.landed = true;
        } else if (doCeilings && !plat.wall && !plat.oneWay &&
                   entity.y < plat.y + plat.h && entity.y > plat.y - landingMargin &&
                   entity.vy < 0) {
          // Head bump on the platform's underside.
          entity.y = plat.y + plat.h;
          entity.vy = 0;
          result.hitCeiling = true;
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

// ── Room-wide gravity direction (Gravity Collapse Core, 2026-07-26) ────────
// Boss-local, not general room-gravity infrastructure — lives on the live
// `miniboss` instance (`miniboss.roomGravityDir`), never on `area`. A
// different, simpler, unbuilt "constant lateral pull" mechanic is
// separately documented for this same region (Plans/regions.md) — keeping
// this boss-local avoids guessing the wrong general shape for a system
// whose second real use case doesn't exist yet.
//
// `game.js`'s existing spawn/despawn block already nulls `miniboss` the
// instant a room's `isMinibossArena` flag goes false (room exit) or on
// defeat — so `getRoomGravityDir()` returns 'down' (today's exact
// behavior) for every other room, and for this room whenever Gravity
// Collapse Core's own instance doesn't exist, BY CONSTRUCTION (there is
// structurally nothing else that could ever set `roomGravityDir`
// non-default), not because every call site remembers to check.
function getRoomGravityDir() {
  return (typeof miniboss !== 'undefined' && miniboss && miniboss.roomGravityDir) || 'down';
}

// Replaces 9 previously-scattered `entity.vy += GRAVITY * ts` call sites
// (enemy.js x6, player.js, companion.js). The 'down' branch is
// byte-identical to what every one of those lines already did — every
// other room's per-frame numeric output is provably unchanged, since the
// code that runs for them is this exact line, just behind one `if` now.
function applyRoomGravity(entity, ts) {
  const dir = getRoomGravityDir();
  if (dir === 'down') entity.vy += GRAVITY * ts;
  else if (dir === 'up') entity.vy -= GRAVITY * ts;
  else if (dir === 'right') entity.vx += GRAVITY * ts;
  else /* 'left' */ entity.vx -= GRAVITY * ts;
}

// ── Rotated-gravity collision (Gravity Collapse Core only) ─────────────────
// `resolveEntityCollision` above is NEVER modified or called differently
// for 'down' — this is a separate sibling function, only ever reached via
// the `dir !== 'down'` branch the 3 call-site dispatches add (see
// `resolveEnemyPhysics` below, and the matching inline dispatch added to
// `player.js`/`companion.js`). A direct axis-swapped transposition of
// `resolveEntityCollision`'s existing two-pass structure — copying an
// already-correct structure with x/y, width/height, vx/vy swapped per
// direction, not new collision math from scratch. `'up'` only needs the
// Y-pass mirrored (X stays the perpendicular/wall axis, reused verbatim);
// `'left'`/`'right'` swap which axis is "gravity" entirely, so both passes
// are mirrored.
function resolveRotatedGravityCollision(entity, platforms, dir, opts = {}) {
  const movedX = opts.movedX !== undefined ? opts.movedX : entity.vx;
  const movedY = opts.movedY !== undefined ? opts.movedY : entity.vy;
  const doFloors = opts.floors !== false;
  const doCeilings = opts.ceilings !== false;
  const doWalls = opts.walls !== false;
  const skipOneWay = !!opts.skipOneWay;
  const result = { landed: false, hitCeiling: false, wallNormal: 0, bounced: false };

  if (platforms) {
    if (dir === 'up') {
      // Perpendicular (wall) axis is still X — identical to
      // resolveEntityCollision's Pass 1, verbatim (gravity direction never
      // changes which axis walls block on when flipping only up/down).
      const wallMargin = Math.max(10, Math.abs(movedX) + 2);
      const preY = entity.y - movedY;
      const actualY = entity.y;
      entity.y = preY;
      if (doWalls) {
        for (const plat of platforms) {
          if (plat.destructible && plat.hp <= 0) continue;
          if (plat.hazard) continue;
          if (plat.crumble && plat.crumbleGone) continue;
          if (plat.oneWay) continue;
          if (skipOneWay && plat.oneWay) continue;
          if (!(entity.y + entity.height > plat.y + 4 && entity.y < plat.y + plat.h)) continue;
          const hardHit = opts.bounce && Math.abs(entity.vx) >= PHYS_WALL_BOUNCE_MIN_SPEED;
          if (entity.x + entity.width >= plat.x && entity.x + entity.width < plat.x + wallMargin && entity.vx >= 0) {
            entity.x = plat.x - entity.width;
            if (hardHit) { entity.vx = -entity.vx * PHYS_WALL_BOUNCE_MULT; result.bounced = true; }
            else if (entity.vx > 0) entity.vx = 0;
            result.wallNormal = 1;
          } else if (entity.x <= plat.x + plat.w && entity.x > plat.x + plat.w - wallMargin && entity.vx <= 0) {
            entity.x = plat.x + plat.w;
            if (hardHit) { entity.vx = -entity.vx * PHYS_WALL_BOUNCE_MULT; result.bounced = true; }
            else if (entity.vx < 0) entity.vx = 0;
            result.wallNormal = -1;
          }
        }
      }
      entity.y = actualY;

      // Gravity (Y) pass, mirrored: "floor" is now a platform's UNDERSIDE
      // (entity's top edge lands against it while moving up, vy<=0);
      // "ceiling" is now a platform's TOP (entity's bottom edge bumps it
      // while moving down, vy>0) — the exact opposite roles of down-gravity.
      const landingMargin = Math.max(8, Math.abs(movedY) + 2);
      const prevTop = entity.y - movedY;
      if (doFloors || doCeilings) {
        for (const plat of platforms) {
          if (plat.destructible && plat.hp <= 0) continue;
          if (plat.hazard) continue;
          if (plat.crumble && plat.crumbleGone) continue;
          if (skipOneWay && plat.oneWay) continue;
          const overlapsH = entity.x + entity.width > plat.x && entity.x < plat.x + plat.w;
          if (!overlapsH) continue;

          if (doFloors && !plat.wall &&
              prevTop >= plat.y + plat.h - landingMargin &&
              entity.y < plat.y + plat.h &&
              entity.y > plat.y - landingMargin &&
              entity.vy <= 0) {
            entity.y = plat.y + plat.h;
            entity.vy = 0;
            entity.grounded = true;
            entity.standingPlat = plat;
            result.landed = true;
          } else if (doCeilings && !plat.wall && !plat.oneWay &&
                     entity.y + entity.height > plat.y &&
                     entity.y + entity.height < plat.y + landingMargin &&
                     entity.vy > 0) {
            entity.y = plat.y - entity.height;
            entity.vy = 0;
            result.hitCeiling = true;
          }
        }
      }
    } else {
      // dir === 'left' or 'right' — gravity axis is now X, perpendicular
      // (wall) axis is now Y. Both passes mirrored (x<->y, width<->height,
      // vx<->vy throughout).
      const landingMargin = Math.max(8, Math.abs(movedX) + 2);
      const wallMargin = Math.max(10, Math.abs(movedY) + 2);

      const preX = entity.x - movedX;
      const actualX = entity.x;
      entity.x = preX;
      if (doWalls) {
        for (const plat of platforms) {
          if (plat.destructible && plat.hp <= 0) continue;
          if (plat.hazard) continue;
          if (plat.crumble && plat.crumbleGone) continue;
          if (plat.oneWay) continue;
          if (skipOneWay && plat.oneWay) continue;
          if (!(entity.x + entity.width > plat.x + 4 && entity.x < plat.x + plat.w)) continue;
          const hardHit = opts.bounce && Math.abs(entity.vy) >= PHYS_WALL_BOUNCE_MIN_SPEED;
          if (entity.y + entity.height >= plat.y && entity.y + entity.height < plat.y + wallMargin && entity.vy >= 0) {
            entity.y = plat.y - entity.height;
            if (hardHit) { entity.vy = -entity.vy * PHYS_WALL_BOUNCE_MULT; result.bounced = true; }
            else if (entity.vy > 0) entity.vy = 0;
            result.wallNormal = 1;
          } else if (entity.y <= plat.y + plat.h && entity.y > plat.y + plat.h - wallMargin && entity.vy <= 0) {
            entity.y = plat.y + plat.h;
            if (hardHit) { entity.vy = -entity.vy * PHYS_WALL_BOUNCE_MULT; result.bounced = true; }
            else if (entity.vy < 0) entity.vy = 0;
            result.wallNormal = -1;
          }
        }
      }
      entity.x = actualX;

      const overlapsV_check = (plat) => entity.y + entity.height > plat.y && entity.y < plat.y + plat.h;
      if (doFloors || doCeilings) {
        if (dir === 'right') {
          const prevRight = (entity.x + entity.width) - movedX;
          for (const plat of platforms) {
            if (plat.destructible && plat.hp <= 0) continue;
            if (plat.hazard) continue;
            if (plat.crumble && plat.crumbleGone) continue;
            if (skipOneWay && plat.oneWay) continue;
            if (!overlapsV_check(plat)) continue;
            if (doFloors && !plat.wall &&
                prevRight <= plat.x + landingMargin &&
                entity.x + entity.width > plat.x &&
                entity.x + entity.width < plat.x + plat.w + landingMargin &&
                entity.vx >= 0) {
              entity.x = plat.x - entity.width;
              entity.vx = 0;
              entity.grounded = true;
              entity.standingPlat = plat;
              result.landed = true;
            } else if (doCeilings && !plat.wall && !plat.oneWay &&
                       entity.x < plat.x + plat.w && entity.x > plat.x - landingMargin &&
                       entity.vx < 0) {
              entity.x = plat.x + plat.w;
              entity.vx = 0;
              result.hitCeiling = true;
            }
          }
        } else { // dir === 'left'
          const prevLeft = entity.x - movedX;
          for (const plat of platforms) {
            if (plat.destructible && plat.hp <= 0) continue;
            if (plat.hazard) continue;
            if (plat.crumble && plat.crumbleGone) continue;
            if (skipOneWay && plat.oneWay) continue;
            if (!overlapsV_check(plat)) continue;
            if (doFloors && !plat.wall &&
                prevLeft >= plat.x + plat.w - landingMargin &&
                entity.x < plat.x + plat.w &&
                entity.x > plat.x - landingMargin &&
                entity.vx <= 0) {
              entity.x = plat.x + plat.w;
              entity.vx = 0;
              entity.grounded = true;
              entity.standingPlat = plat;
              result.landed = true;
            } else if (doCeilings && !plat.wall && !plat.oneWay &&
                       entity.x + entity.width > plat.x &&
                       entity.x + entity.width < plat.x + landingMargin &&
                       entity.vx > 0) {
              entity.x = plat.x - entity.width;
              entity.vx = 0;
              result.hitCeiling = true;
            }
          }
        }
      }
    }
  }

  // No world-floor fallback (opts.groundY) in any rotated mode — that's a
  // down-axis-specific concept (bounds.groundY), and per the room-authoring
  // rule this arena is a sealed 4-wall box precisely so no rotated mode
  // ever needs one.
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
  // Dispatch on room gravity direction (Gravity Collapse Core, 2026-07-26).
  // The 'down' branch is the function's original body, verbatim — every
  // enemy's physics tail already routes through this one choke point, so
  // this is the ONLY change needed anywhere in enemy.js for correct
  // rotated-gravity collision; no per-call-site changes required.
  const dir = getRoomGravityDir();
  const result = dir === 'down'
    ? resolveEntityCollision(enemy, area ? area.platforms : null, {
        movedX: enemy.vx * timeScale,
        movedY: enemy.vy * timeScale,
        groundY: bounds ? bounds.groundY : undefined,
        bounds: bounds,
        bounce: true,
      })
    : resolveRotatedGravityCollision(enemy, area ? area.platforms : null, dir, {
        movedX: enemy.vx * timeScale,
        movedY: enemy.vy * timeScale,
        bounds: bounds,
        bounce: true,
      });
  if (result.landed) enemy.juggling = false; // landing ends juggle state
  if (result.bounced) enemy.wallBouncedThisFrame = true;

  // Ground friction on landed knockback (user report 2026-07-19: "an enemy
  // just keeps sliding away and doesn't stop"). enemy.js's hit-stun branch
  // sets vx/vy once on the hit and never touches vx again — a landed
  // enemy held that exact velocity for the rest of the stun window with
  // zero decay, which reads as ice-skating rather than a hit that lands
  // and settles. Worst case confirmed via harness: a downward-angled hit
  // gives almost no hang time (positive vy), so it's grounded within a
  // frame and then slides the ENTIRE ~14-frame stun at constant speed —
  // ~84px of dead-straight sliding. Gated on hitStun (undefined for
  // enemies with no knockback concept, e.g. FracturedSlime, so this is a
  // no-op for them) so it only touches the actual knockback-recoil state,
  // not normal AI-driven ground movement.
  if (enemy.grounded && enemy.hitStun > 0) {
    enemy.vx *= 0.8;
  }

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
  window.getRoomGravityDir = getRoomGravityDir;
  window.applyRoomGravity = applyRoomGravity;
  window.resolveRotatedGravityCollision = resolveRotatedGravityCollision;
}
