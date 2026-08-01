// roomVerify.js — static room-layout linter (pure data analysis, no simulation)
// ===========================================================================
// Implements Plans/room_verification_tool_plan.md's "Component 1: Static
// layout linter". Pure function of a room object + the sibling AREAS map —
// no DOM, no fs — so it runs both as a plain <script> tag (editor/room_verify.html,
// picks up the real GRAVITY/JUMP_FORCE/etc. globals from player.js/ability.js
// once those are loaded first) and as a Node `require()` (Plans/room_verify_cli.js,
// which has no reason to load the whole player.js class just for 6 numbers —
// see PHYSICS_DEFAULTS below).
//
// Checks implemented, each producing typed issues with coordinates:
//   - Reachability: flood-fill from every anchor/transition, using real jump/
//     dash/phase-dash arcs (not guessed ranges) to build the traversal graph.
//     Flags platforms AND anything placed on one (enemies, pips, lore,
//     ability reward, healing crystals) that the flood-fill never reaches.
//   - FLOOR_GAP: for rooms with no pitDeathY hazard override (the "continuous
//     cave floor, no fall-death" default per Plans/CLAUDE.md), any gap in the
//     main floor band wider than jump/dash range reads as an unintended pit,
//     not a designed hazard — this is the exact bug class that motivated
//     this tool (see the plan doc's opening pit-death story).
//   - DOOR_EMBEDDED: a transition whose player-standing hitbox (platformTop -
//     playerHeight to platformTop, not the door's own rect) overlaps a
//     different platform's solid body.
//   - ONE_SIDED_DOOR: a two-way connections[] entry where one side's
//     transitions[] array has no door back — extends validateAreaGraph()'s
//     own symmetry check (which only verifies the *declared* connection
//     record) to the physical doors themselves.
// ===========================================================================

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RoomVerify = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Hand-synced fallback for callers that haven't loaded player.js/ability.js/
  // attackVFX.js (i.e. the Node CLI) — keep these in sync with those files'
  // own `var GRAVITY = ...` etc. if they ever change. Same hand-maintained-
  // constant tradeoff Plans/project_progress_dashboard_plan.md already
  // accepts for its pip/enemy-roster targets. When this module runs as a
  // <script> tag after the real files, resolvePhysics() below prefers the
  // live globals over these defaults, so the browser tool is always exact.
  var PHYSICS_DEFAULTS = {
    GRAVITY: 0.6, JUMP_FORCE: -12, MOVE_SPEED: 4,
    DASH_SPEED: 12, DASH_DURATION: 8,
    PHASE_DASH_SPEED: 14, PHASE_DASH_DURATION: 8,
    PLAYER_W: 24, PLAYER_H: 32, // game/player.js Player constructor
  };

  function resolvePhysics(overrides) {
    var out = {};
    for (var key in PHYSICS_DEFAULTS) {
      if (overrides && overrides[key] !== undefined) out[key] = overrides[key];
      else if (typeof globalThis !== 'undefined' && typeof globalThis[key] !== 'undefined') out[key] = globalThis[key];
      else out[key] = PHYSICS_DEFAULTS[key];
    }
    return out;
  }

  // Real jump/fall/dash kinematics — not guessed numbers. dx is the
  // horizontal gap (>=0), dy is destination.y - origin.y (positive = lower).
  function reachEnvelope(dx, dy, physics) {
    dx = Math.abs(dx);
    var g = physics.GRAVITY, v0 = -physics.JUMP_FORCE, mv = physics.MOVE_SPEED;
    var results = [];

    // Walking off a ledge and falling under gravity, no jump input — covers
    // both "gap in a flat floor" and "step down onto a lower platform."
    if (dy >= 0) {
      var fallT = Math.sqrt(2 * dy / g);
      results.push({ method: 'walk/fall', budget: mv * fallT });
    }

    var maxRise = (v0 * v0) / (2 * g);
    if (-dy <= maxRise) {
      var t;
      if (dy <= 0) {
        var rise = -dy;
        var discUp = Math.max(0, v0 * v0 - 2 * g * rise);
        t = (v0 - Math.sqrt(discUp)) / g; // ascending arc first crosses `rise` here
      } else {
        var discDown = v0 * v0 + 2 * g * dy;
        t = (v0 + Math.sqrt(discDown)) / g; // full arc down to dy below launch
      }
      results.push({ method: 'jump', budget: mv * t });
      results.push({ method: 'jump+dash', budget: mv * t + physics.DASH_SPEED * physics.DASH_DURATION });
    }

    // Phase Dash: near-flat, ability-gated straight shot. Kept as its own
    // labeled method so callers can tell "reachable with nothing" apart from
    // "reachable, but only once phase_dash is unlocked."
    if (Math.abs(dy) <= 48) {
      results.push({
        method: 'phase_dash',
        budget: physics.PHASE_DASH_SPEED * physics.PHASE_DASH_DURATION,
        requiresAbility: 'phase_dash',
      });
    }

    var free = results.filter(function (r) { return !r.requiresAbility && dx <= r.budget; })
      .sort(function (a, b) { return a.budget - b.budget; })[0];
    if (free) return { ok: true, method: free.method };

    var gated = results.filter(function (r) { return r.requiresAbility && dx <= r.budget; })
      .sort(function (a, b) { return a.budget - b.budget; })[0];
    if (gated) return { ok: true, method: gated.method, requiresAbility: gated.requiresAbility };

    return { ok: false };
  }

  function platformGapDx(a, b) {
    var aLeft = a.x, aRight = a.x + a.w, bLeft = b.x, bRight = b.x + b.w;
    if (aRight < bLeft) return bLeft - aRight;
    if (bRight < aLeft) return aLeft - bRight;
    return 0; // horizontally overlapping — trivial in x
  }

  // Nearest standable platform to a world point, biased hard toward
  // platforms the point's x actually falls over (an anchor/pickup is always
  // authored to sit on the platform below it, so x-alignment matters far
  // more than raw distance).
  function snapToPlatformIndex(point, platforms) {
    var best = -1, bestDist = Infinity;
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      var withinX = point.x >= p.x - 40 && point.x <= p.x + p.w + 40;
      var dy = Math.abs(point.y - p.y);
      var dist = withinX ? dy : dy + 1000;
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    return best;
  }

  function verifyRoom(room, allAreas, physicsOverrides) {
    var physics = resolvePhysics(physicsOverrides);
    var issues = [];
    var platforms = (room.platforms || []).filter(function (p) { return !p.wall && !p.ceiling; });

    if (platforms.length === 0) {
      return { id: room.id, name: room.name, ok: true, issues: [] };
    }

    // ---- adjacency + flood fill ----
    var n = platforms.length;
    var adj = [];
    for (var i = 0; i < n; i++) {
      adj.push([]);
      for (var j = 0; j < n; j++) {
        if (i === j) continue;
        var dx = platformGapDx(platforms[i], platforms[j]);
        var dy = platforms[j].y - platforms[i].y;
        var r = reachEnvelope(dx, dy, physics);
        if (r.ok) adj[i].push(j);
      }
    }

    var entryPoints = []
      .concat((room.anchors || []).map(function (a) { return { x: a.x, y: a.y }; }))
      .concat((room.transitions || []).map(function (t) { return { x: t.x + t.w / 2, y: t.y + t.h }; }));

    var startIdx = {};
    for (var e = 0; e < entryPoints.length; e++) {
      var snap = snapToPlatformIndex(entryPoints[e], platforms);
      if (snap !== -1) startIdx[snap] = true;
    }
    if (Object.keys(startIdx).length === 0) startIdx[0] = true; // isolated dev room fallback

    var reached = {};
    var queue = [];
    for (var s in startIdx) { reached[s] = true; queue.push(Number(s)); }
    while (queue.length) {
      var cur = queue.shift();
      var neighbors = adj[cur];
      for (var k = 0; k < neighbors.length; k++) {
        var to = neighbors[k];
        if (!reached[to]) { reached[to] = true; queue.push(to); }
      }
    }

    for (var pi = 0; pi < n; pi++) {
      if (!reached[pi]) {
        issues.push({
          type: 'UNREACHABLE_PLATFORM', severity: 'warn',
          x: platforms[pi].x, y: platforms[pi].y,
          detail: 'platform at (' + platforms[pi].x + ', ' + platforms[pi].y + ') is not reachable from any anchor/transition via jump/dash/fall',
        });
      }
    }

    var objectGroups = [
      ['enemies', room.enemies], ['anchors', room.anchors],
      ['fracturePipRewards', room.fracturePipRewards], ['loreFragments', room.loreFragments],
      ['healingCrystals', room.healingCrystals],
    ];
    if (room.abilityReward) objectGroups.push(['abilityReward', [room.abilityReward]]);
    for (var g2 = 0; g2 < objectGroups.length; g2++) {
      var label = objectGroups[g2][0], list = objectGroups[g2][1] || [];
      for (var oi = 0; oi < list.length; oi++) {
        var obj = list[oi];
        var idx = snapToPlatformIndex({ x: obj.x, y: obj.y }, platforms);
        if (idx !== -1 && !reached[idx]) {
          issues.push({
            type: 'UNREACHABLE_' + label.toUpperCase(), severity: 'error',
            x: obj.x, y: obj.y,
            detail: label + ' item at (' + obj.x + ', ' + obj.y + ') sits on an unreachable platform',
          });
        }
      }
    }

    // ---- floor-gap check (continuous-cave-floor rooms only) ----
    if (room.pitDeathY === Infinity || room.pitDeathY === undefined) {
      var floorTier = platforms.filter(function (p) { return Math.abs(p.y - room.groundY) < 4; })
        .sort(function (a, b) { return a.x - b.x; });
      for (var fi = 0; fi < floorTier.length - 1; fi++) {
        var gapDx = floorTier[fi + 1].x - (floorTier[fi].x + floorTier[fi].w);
        if (gapDx <= 0) continue;
        var fr = reachEnvelope(gapDx, 0, physics);
        if (!fr.ok) {
          issues.push({
            type: 'FLOOR_GAP', severity: 'error',
            x: floorTier[fi].x + floorTier[fi].w, y: floorTier[fi].y,
            detail: 'gap of ' + gapDx + 'px in the main floor band at x=' + (floorTier[fi].x + floorTier[fi].w) +
              ' exceeds jump/dash range — room has no pitDeathY hazard override, so this reads as an unintended fall trap',
          });
        }
      }
    }

    // ---- door-in-geometry check ----
    var transitions = room.transitions || [];
    for (var ti = 0; ti < transitions.length; ti++) {
      var t = transitions[ti];
      var standBox = { x: t.x, y: t.y + t.h - physics.PLAYER_H, w: t.w, h: physics.PLAYER_H };
      for (var pj = 0; pj < platforms.length; pj++) {
        var p2 = platforms[pj];
        if (p2.destructible) continue;
        var overlaps = standBox.x < p2.x + p2.w && standBox.x + standBox.w > p2.x &&
          standBox.y < p2.y + p2.h && standBox.y + standBox.h > p2.y;
        // A door cut into the platform it stands on isn't a bug — only flag
        // overlap that goes meaningfully deeper than that threshold.
        if (overlaps && (p2.y + 2 < t.y + t.h)) {
          issues.push({
            type: 'DOOR_EMBEDDED', severity: 'error',
            x: t.x, y: t.y,
            detail: 'door to "' + t.to + '" at (' + t.x + ', ' + t.y + ') — the player\'s standing hitbox there overlaps solid platform at (' + p2.x + ', ' + p2.y + ')',
          });
        }
      }
    }

    // ---- two-way walkability: physical doors, not just declared connections[] ----
    if (allAreas) {
      var conns = room.connections || [];
      for (var ci = 0; ci < conns.length; ci++) {
        var conn = conns[ci];
        if (conn.oneWay) continue;
        var destRoom = allAreas[conn.to];
        if (!destRoom) continue; // validateAreaGraph() already flags missing targets
        var hasOutbound = transitions.some(function (t2) { return t2.to === conn.to; });
        var hasReturn = (destRoom.transitions || []).some(function (t3) { return t3.to === room.id; });
        if (!hasOutbound || !hasReturn) {
          issues.push({
            type: 'ONE_SIDED_DOOR', severity: 'error',
            x: 0, y: 0,
            detail: 'connections[] declares a two-way link ' + room.id + ' <-> ' + conn.to +
              ', but ' + (!hasOutbound ? room.id : conn.to) + ' has no matching transitions[] entry back',
          });
        }
      }
    }

    return {
      id: room.id, name: room.name,
      ok: issues.every(function (iss) { return iss.severity !== 'error'; }),
      issues: issues,
    };
  }

  function verifyAllRooms(allAreas, physicsOverrides) {
    return Object.keys(allAreas)
      // Same dev-room skip convention as validateAreaGraph()/dev_hub.html —
      // enemy_test_arena/bot_arena have no col/row on purpose.
      .filter(function (id) { return typeof allAreas[id].col === 'number'; })
      .map(function (id) { return verifyRoom(allAreas[id], allAreas, physicsOverrides); });
  }

  return { verifyRoom: verifyRoom, verifyAllRooms: verifyAllRooms, reachEnvelope: reachEnvelope, resolvePhysics: resolvePhysics };
});
