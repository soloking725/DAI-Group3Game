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
// **2026-08-02**: merged in the feature set of area.js's own independent
// `_linter*` linter (see Plans/engineering_todo.md item 10) — the two had
// evolved separately with each catching real bugs the other missed. This is
// now the single canonical implementation; area.js's copy is deleted and its
// auto-run-on-load hook calls into this module instead (see area.js's own
// "ROOM LAYOUT LINTER" section). Merge specifics:
//   - Ported from area.js: entry points are now real cross-room transition
//     landing coordinates (any other room's transitions[] that targets this
//     one, via `allAreas`) rather than this room's OWN anchors/doors — using
//     a room's own door as a free "you can definitely stand here" seed was
//     circular and caused a real miss (crag_entrance's return door, anchor,
//     and a cosmetic pickup sit behind an ~1200px gap nothing in the room
//     bridges — old roomVerify passed it, area.js correctly failed it).
//     Also ported: ENTRY_VOID (an entry landing in the void), the two-pass
//     ability-loadout model (pass 1 = the room's declared/default loadout
//     with all walls solid, so first-visit softlocks are caught; pass 2 =
//     phase_dash+void_tether with only permanent walls solid, so a
//     legitimately-gated secret doesn't false-fail), the stricter
//     first-pass-reachability requirement for `abilityReward` (critical
//     path — everything else only needs to be reachable in *some* pass),
//     the wall-obstruction check on direct jumps (a solid wall standing in
//     the corridor between two platforms that's too tall to clear and too
//     low to walk under blocks the edge — previously unmodeled here), and
//     the `rotatedGravityOnly`/`hazard`/`destructible` exclusions from the
//     standable-platform set.
//   - Kept from the old roomVerify.js (area.js had no equivalent): wall-jump
//     chaining (a `wall` platform spanning an otherwise-too-tall vertical
//     gap removes the single-jump height cap), Void Tether reach as its own
//     ability-gated method, `healingCrystals` coverage, and the symmetric
//     ONE_SIDED_DOOR check (verifies both directions have a physical door,
//     not just the return direction).
//   - FLOOR_GAP broadened from "gaps in the groundY-aligned tier only" to
//     area.js's more general check: any x-gap in the full standable-platform
//     coverage (any height) that no reachable platform pair can bridge.
//   - New, not present in either old implementation: DOOR_UNREACHABLE (area
//     .js checked door touchability but not embedding; roomVerify checked
//     embedding but not touchability — each had exactly the other's gap).
//   - Bug fix surfaced by re-testing after the entry-seeding change: this
//     file's own `reachEnvelope()` gated Phase Dash's reach bonus to
//     near-flat gaps only (`|dy| <= 48`), but Phase Dash is 8-directional
//     (player.js's `getDashDirection`) and should stack onto any in-flight
//     jump the way area.js's `_linterReach` already correctly modeled. The
//     old restriction went unnoticed because the old entry-seeding bug was
//     masking most real climbs (seeding reachability from a room's own
//     high-up door/anchor let flood-fill reach everything below via easy
//     downward hops, never actually exercising the upward-climb formula) —
//     fixing entry-seeding alone, without this, made crag_entrance briefly
//     regress to ~20 false-positive UNREACHABLE_PLATFORM issues before this
//     was caught and fixed. Verified against all 71 real rooms after each
//     change (`node Plans/room_verify_cli.js`): final state matches area.js's
//     original assessment exactly (crag_entrance's real bug — 2 unreachable
//     platforms, 1 unreachable anchor, 1 unreachable door — still the only
//     failure; all 70 other rooms clean, same as both pre-merge versions).
//
// Checks implemented, each producing typed issues with coordinates:
//   - Reachability: two-pass flood-fill from real entry points, using real
//     jump/dash/phase-dash/void-tether/wall-jump arcs (not guessed ranges).
//     Flags platforms AND anything placed on one (enemies, pips, lore,
//     ability reward, healing crystals) that the flood-fill never reaches in
//     EITHER pass; `abilityReward` additionally must be pass-1 reachable
//     (critical path, can't be a gated secret).
//   - ENTRY_VOID: a real entry (from another room's transitions[], or this
//     room's own anchors for isolated dev rooms) lands with no platform
//     beneath it.
//   - FLOOR_GAP: for rooms with no pitDeathY hazard override (the "continuous
//     cave floor, no fall-death" default per Plans/CLAUDE.md), any gap in the
//     standable-platform coverage wider than jump/dash/wall-jump range reads
//     as an unintended pit, not a designed hazard.
//   - DOOR_EMBEDDED: a transition whose player-standing hitbox (platformTop -
//     playerHeight to platformTop, not the door's own rect) overlaps a
//     different platform's solid body.
//   - DOOR_UNREACHABLE: a transition (not already DOOR_EMBEDDED) that no
//     reachable platform, in either pass, is close enough to touch.
//   - ONE_SIDED_DOOR: a two-way connections[] entry where either side's
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
    WALL_JUMP_FORCE: -10, WALL_JUMP_H_SPEED: 7, // game/player.js WALL_JUMP_*
    VOID_TETHER_RANGE_BASE: 260, // game/ability.js — Lv0 kit, not talent-scaled range
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

  // Movement abilities assumed on a first pass through a room that doesn't
  // declare its own `expectedLoadout: { onEntry: [...] }` — matches
  // area.js's former ROOM_LINTER_DEFAULT_LOADOUT. Pass 2 (below) always uses
  // a fixed full-kit loadout regardless of this, representing "eventually,
  // with everything unlocked and every destructible wall broken."
  var DEFAULT_LOADOUT = ['phase_dash'];
  var PASS2_LOADOUT = ['phase_dash', 'void_tether'];

  // Apex height of a full jump: v^2 / 2g, minus a few px of clearance so the
  // linter never approves a pixel-perfect-only ascent.
  function jumpHeight(physics) {
    var v0 = Math.abs(physics.JUMP_FORCE);
    return (v0 * v0) / (2 * physics.GRAVITY) - 6;
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
      var jumpBudget = mv * t;
      results.push({ method: 'jump', budget: jumpBudget });
      var dashBudget = jumpBudget + physics.DASH_SPEED * physics.DASH_DURATION;
      results.push({ method: 'jump+dash', budget: dashBudget });
      // Phase Dash is 8-directional (player.js's getDashDirection), not a
      // flat-only straight shot — it's a mid-air burst on top of whatever
      // jump arc is already in flight, same as the dash bonus above, so its
      // budget stacks onto the jump+dash number rather than gating on a
      // near-flat dy. Ported from area.js's `_linterReach`, which got this
      // right; the old near-flat-only version here (`|dy| <= 48`) was wrong
      // and only went unnoticed because a since-fixed entry-seeding bug (see
      // this file's header) was seeding reachability from high-up points
      // that made most real climbs never get exercised.
      results.push({
        method: 'jump+dash+phase_dash',
        budget: dashBudget + physics.PHASE_DASH_SPEED * physics.PHASE_DASH_DURATION,
        requiresAbility: 'phase_dash',
      });
    }

    // Void Tether's wall-grapple half: same near-flat straight shot as
    // phase_dash (game_update.js requires vertical overlap with the target
    // platform's edge, i.e. dy roughly within the player's own height), but
    // its own range and its own ability gate — was previously indistinguishable
    // from a plain unreachable gap.
    if (Math.abs(dy) <= physics.PLAYER_H) {
      results.push({
        method: 'void_tether',
        budget: physics.VOID_TETHER_RANGE_BASE,
        requiresAbility: 'void_tether',
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

  // Is there a solid wall sitting in the horizontal corridor between `a` and
  // `b` that's too tall to jump over from the takeoff side and too low to
  // walk under? Ported from area.js's `_linterEdge` — roomVerify's own
  // reachEnvelope() only ever checked the dx/dy budget, never whether
  // something physically blocks that straight-line path.
  function edgeBlocked(a, b, blockers, physics) {
    var jumpH = jumpHeight(physics);
    var corridorLo = Math.min(a.x + a.w / 2, b.x + b.w / 2);
    var corridorHi = Math.max(a.x + a.w / 2, b.x + b.w / 2);
    for (var i = 0; i < blockers.length; i++) {
      var w = blockers[i];
      if (w.x + w.w < corridorLo || w.x > corridorHi) continue;
      var riseOverWall = a.y - w.y; // feet must gain this much, from the takeoff side
      var clearable = riseOverWall <= jumpH;
      var walkUnder = (w.y + w.h) <= Math.min(a.y, b.y) - physics.PLAYER_H;
      if (!clearable && !walkUnder) return true;
    }
    return false;
  }

  // Wall-jump chaining: player.js's WALL_JUMP_FORCE/WALL_JUMP_H_SPEED bounce
  // off a `wall: true` platform and re-grab it (or an opposing wall) to gain
  // height indefinitely, so a vertical gap next to a tall enough wall is not
  // capped by a single jump's maxRise the way reachEnvelope() otherwise
  // assumes. Room `platforms` filters walls out entirely before this runs
  // (they're not standable floors), so they need their own pass here rather
  // than folding into the main adjacency loop's dx/dy budget check. Not
  // ability-gated (wall jump is core kit, unlike phase_dash/void_tether) and
  // not subject to edgeBlocked() — the wall IS the path, not an obstruction.
  function wallSpansGap(pa, pb, walls) {
    var yTop = Math.min(pa.y, pb.y), yBottom = Math.max(pa.y, pb.y);
    if (yBottom - yTop <= 0) return false;
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      // Landing tolerance at each end — the wall doesn't need to reach the
      // exact platform surface, just close enough to grab on the way past.
      var covers = w.y <= yTop + 24 && (w.y + w.h) >= yBottom - 24;
      if (!covers) continue;
      var nearA = w.x < pa.x + pa.w + 60 && w.x + w.w > pa.x - 60;
      var nearB = w.x < pb.x + pb.w + 60 && w.x + w.w > pb.x - 60;
      if (nearA || nearB) return true;
    }
    return false;
  }

  // Can the player get from standing on platform `a` to standing on `b`,
  // given this pass's loadout (ability gate) and which walls are solid
  // blockers this pass? The one place both "is it in reach" (reachEnvelope)
  // and "is the reach blocked" (edgeBlocked) and "does a wall bridge it
  // anyway" (wallSpansGap) combine — shared by the adjacency graph and the
  // floor-gap crossability check below, so those two can't drift apart on
  // what "reachable" means the way the old two-implementation split did.
  function edgeOk(a, b, blockingWalls, wallJumpWalls, loadout, physics) {
    var dx = platformGapDx(a, b);
    var dy = b.y - a.y;
    var r = reachEnvelope(dx, dy, physics);
    if (r.ok && !edgeBlocked(a, b, blockingWalls, physics)) {
      if (!r.requiresAbility || loadout.indexOf(r.requiresAbility) !== -1) return true;
    }
    if (dy < 0 && wallJumpWalls.length && wallSpansGap(a, b, wallJumpWalls)) return true;
    return false;
  }

  function buildAdjacency(platforms, blockingWalls, wallJumpWalls, loadout, physics) {
    var n = platforms.length;
    var adj = [];
    for (var i = 0; i < n; i++) {
      adj.push([]);
      for (var j = 0; j < n; j++) {
        if (i === j) continue;
        if (edgeOk(platforms[i], platforms[j], blockingWalls, wallJumpWalls, loadout, physics)) adj[i].push(j);
      }
    }
    return adj;
  }

  function floodFill(adj, startIdxSet) {
    var reached = {};
    var queue = [];
    for (var s in startIdxSet) { reached[s] = true; queue.push(Number(s)); }
    while (queue.length) {
      var cur = queue.shift();
      var neighbors = adj[cur];
      for (var k = 0; k < neighbors.length; k++) {
        var to = neighbors[k];
        if (!reached[to]) { reached[to] = true; queue.push(to); }
      }
    }
    return reached;
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

  // The platform a body dropped at (cx, fromY) lands on, or null (= void).
  // Ported from area.js's `_linterDropTo` — used for entry points, where
  // "nearest platform" isn't right (a spawn point falls straight down under
  // gravity, it doesn't snap sideways to the closest ledge).
  function dropTo(platforms, cx, fromY) {
    var best = null;
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      if (cx < p.x || cx > p.x + p.w) continue;
      if (p.y < fromY - 2) continue; // platform is above the drop point
      if (!best || p.y < best.y) best = p;
    }
    return best;
  }

  // Is point (px, py) touchable from standing on / jumping off platform `p`?
  // Used for doors, pickups, and lore positions. `h` extends the point into
  // a rect (0 for true points). Expressed via reachEnvelope (rather than a
  // second hand-rolled reach formula, the way area.js's `_linterReach` was)
  // so there's exactly one physics model in this file.
  function pointReachable(physics, p, px, py, w, h, loadout) {
    var jumpH = jumpHeight(physics);
    var bottom = py + h;
    if (bottom < p.y - physics.PLAYER_H - jumpH) return false; // too high above
    if (py > p.y + 4) return false; // entirely below the standing surface
    var dx = platformGapDx(p, { x: px, w: w });
    if (dx === 0) return true;
    var r = reachEnvelope(dx, py - p.y, physics);
    if (!r.ok) return false;
    return !r.requiresAbility || loadout.indexOf(r.requiresAbility) !== -1;
  }

  // Entry points into `room`: every transition anywhere in `allAreas` that
  // targets it (toX/toY), tagged with where it comes from. A room's OWN
  // doors/anchors are deliberately NOT included here — assuming your own
  // exit is reachable just because it exists is exactly the bug this
  // replaced (see this file's header). `allAreas` is optional (falls
  // through to the isolated-room fallback in verifyRoom) so a lone
  // `verifyRoom(room)` call still degrades gracefully.
  function realEntryPoints(room, allAreas) {
    var entries = [];
    if (!allAreas) return entries;
    for (var otherId in allAreas) {
      var trs = allAreas[otherId].transitions || [];
      for (var i = 0; i < trs.length; i++) {
        if (trs[i].to === room.id) entries.push({ x: trs[i].toX, y: trs[i].toY, from: otherId });
      }
    }
    return entries;
  }

  function verifyRoom(room, allAreas, physicsOverrides) {
    var physics = resolvePhysics(physicsOverrides);
    var issues = [];
    var platforms = (room.platforms || []).filter(function (p) {
      return !p.wall && !p.ceiling && !p.destructible && !p.hazard && !p.rotatedGravityOnly;
    });
    var wallsAll = (room.platforms || []).filter(function (p) { return p.wall || p.destructible; });
    var wallsPermanent = (room.platforms || []).filter(function (p) { return p.wall && !p.destructible; });

    if (platforms.length === 0) {
      return { id: room.id, name: room.name, ok: true, issues: [] };
    }

    var loadout = (room.expectedLoadout && room.expectedLoadout.onEntry) ? room.expectedLoadout.onEntry : DEFAULT_LOADOUT;

    // ---- entry points (real cross-room landings; ENTRY_VOID if one lands nowhere) ----
    var entries = realEntryPoints(room, allAreas);
    var startIdx = {};
    for (var e = 0; e < entries.length; e++) {
      var landing = dropTo(platforms, entries[e].x + physics.PLAYER_W / 2, entries[e].y);
      if (!landing) {
        issues.push({
          type: 'ENTRY_VOID', severity: 'error', x: entries[e].x, y: entries[e].y,
          detail: 'entry from "' + entries[e].from + '" spawns at (' + entries[e].x + ', ' + entries[e].y + ') with no platform beneath — player falls into the void on arrival',
        });
      } else {
        startIdx[platforms.indexOf(landing)] = true;
      }
    }
    // Isolated dev room (no real cross-room entries at all): fall back to
    // anchors, then the first platform — same convention area.js's linter
    // used. Deliberately NOT triggered when entries exist but all of them
    // are voids (see this file's header note on that edge case).
    if (Object.keys(startIdx).length === 0 && entries.length === 0) {
      var anchorsForFallback = room.anchors || [];
      for (var ai = 0; ai < anchorsForFallback.length; ai++) {
        var aLanding = dropTo(platforms, anchorsForFallback[ai].x, anchorsForFallback[ai].y);
        if (aLanding) startIdx[platforms.indexOf(aLanding)] = true;
      }
      if (Object.keys(startIdx).length === 0) startIdx[0] = true;
    }

    // ---- two-pass reachability flood fill ----
    // Pass 1: the room's declared/default loadout, every wall (incl.
    // destructible) solid — "can you get everywhere on a normal first visit."
    // Pass 2: full kit, only permanent walls solid — "is it EVER reachable,
    // including legitimately gated secrets behind a destructible wall."
    // Unreachable in both = a real bug; unreachable in pass 1 only = a
    // legitimate gated secret (fine, except for abilityReward — see below).
    var pass1Adj = buildAdjacency(platforms, wallsAll, wallsPermanent, loadout, physics);
    var pass2Adj = buildAdjacency(platforms, wallsPermanent, wallsPermanent, PASS2_LOADOUT, physics);
    var pass1Reached = floodFill(pass1Adj, startIdx);
    var pass2Reached = floodFill(pass2Adj, startIdx);

    for (var pi = 0; pi < platforms.length; pi++) {
      if (!pass1Reached[pi] && !pass2Reached[pi]) {
        issues.push({
          type: 'UNREACHABLE_PLATFORM', severity: 'warn',
          x: platforms[pi].x, y: platforms[pi].y,
          detail: 'platform at (' + platforms[pi].x + ', ' + platforms[pi].y + ') is not reachable from any entry via jump/dash/wall-jump, even with all abilities and destructible walls broken',
        });
      }
    }

    // Things that must sit on/above a reachable platform. `anyPass` = fine
    // in either pass (a legit gated secret is not a bug); `firstPass` = only
    // true if touchable using the room's OWN declared/default loadout from a
    // pass-1-reached platform — required for abilityReward (critical path;
    // an ability can't be gated behind itself), informational for everything
    // else.
    function checkPointCoverage(px, py, w, h) {
      var anyPass = false, firstPass = false;
      for (var idx = 0; idx < platforms.length; idx++) {
        var p = platforms[idx];
        if (pass2Reached[idx] && pointReachable(physics, p, px, py, w, h, PASS2_LOADOUT)) anyPass = true;
        if (pass1Reached[idx] && pointReachable(physics, p, px, py, w, h, loadout)) firstPass = true;
      }
      return { anyPass: anyPass, firstPass: firstPass };
    }

    var objectGroups = [
      ['enemies', room.enemies], ['anchors', room.anchors],
      ['fracturePipRewards', room.fracturePipRewards], ['loreFragments', room.loreFragments],
      ['healingCrystals', room.healingCrystals],
    ];
    for (var g2 = 0; g2 < objectGroups.length; g2++) {
      var label = objectGroups[g2][0], list = objectGroups[g2][1] || [];
      for (var oi = 0; oi < list.length; oi++) {
        var obj = list[oi];
        var cov = checkPointCoverage(obj.x, obj.y, 0, 0);
        if (!cov.anyPass) {
          issues.push({
            type: 'UNREACHABLE_' + label.toUpperCase(), severity: 'error',
            x: obj.x, y: obj.y,
            detail: label + ' item at (' + obj.x + ', ' + obj.y + ') is unreachable even with all abilities and destructible walls broken',
          });
        }
      }
    }
    if (room.abilityReward) {
      var arCov = checkPointCoverage(room.abilityReward.x, room.abilityReward.y, 0, 0);
      if (!arCov.anyPass) {
        issues.push({
          type: 'UNREACHABLE_ABILITYREWARD', severity: 'error',
          x: room.abilityReward.x, y: room.abilityReward.y,
          detail: 'ability reward "' + room.abilityReward.id + '" at (' + room.abilityReward.x + ', ' + room.abilityReward.y + ') is unreachable even with all abilities and destructible walls broken',
        });
      } else if (!arCov.firstPass) {
        issues.push({
          type: 'ABILITY_REWARD_GATED', severity: 'error',
          x: room.abilityReward.x, y: room.abilityReward.y,
          detail: 'ability reward "' + room.abilityReward.id + '" at (' + room.abilityReward.x + ', ' + room.abilityReward.y + ') is not reachable with the room\'s first-pass loadout [' + loadout.join(', ') + '] — an ability pickup can\'t be gated behind itself',
        });
      }
    }

    // ---- floor-gap check (continuous-cave-floor rooms only) ----
    // Any x-gap in the full standable-platform coverage (any height, not
    // just the groundY-aligned tier) that no reachable platform pair can
    // bridge — broadened from the old groundY-tier-only check to area.js's
    // more general version.
    if (room.pitDeathY === Infinity || room.pitDeathY === undefined) {
      var byX = platforms.slice().sort(function (a, b) { return a.x - b.x; });
      var coveredTo = byX[0].x + byX[0].w;
      for (var fi = 0; fi < byX.length; fi++) {
        var p3 = byX[fi];
        if (p3.x > coveredTo) {
          var g0 = coveredTo, g1 = p3.x;
          var crossable = false;
          for (var la = 0; la < byX.length && !crossable; la++) {
            var a3 = byX[la];
            if (a3.x + a3.w < g0 - 1 || a3.x + a3.w > g0 + 1) continue; // touches gap's left lip
            for (var lb = 0; lb < byX.length; lb++) {
              var b3 = byX[lb];
              if (b3.x < g1 - 1 || b3.x > g1 + 1) continue; // touches gap's right lip
              if (edgeOk(a3, b3, wallsAll, wallsPermanent, loadout, physics) || edgeOk(b3, a3, wallsAll, wallsPermanent, loadout, physics)) { crossable = true; break; }
            }
          }
          if (!crossable) {
            issues.push({
              type: 'FLOOR_GAP', severity: 'error',
              x: g0, y: p3.y,
              detail: 'floor gap x:' + g0 + '-' + g1 + ' (' + (g1 - g0) + 'px) has zero platform coverage and no platform pair can cross it with loadout [' + loadout.join(', ') + ']',
            });
          }
        }
        coveredTo = Math.max(coveredTo, p3.x + p3.w);
      }
    }

    // ---- door-in-geometry check, and door-out-of-reach check ----
    // (the latter is ported from area.js — neither implementation's old
    // version had it: area.js checked touchability but not embedding,
    // roomVerify checked embedding but not touchability.)
    var transitions = room.transitions || [];
    for (var ti = 0; ti < transitions.length; ti++) {
      var t = transitions[ti];
      var standBox = { x: t.x, y: t.y + t.h - physics.PLAYER_H, w: t.w, h: physics.PLAYER_H };
      var embedded = false;
      for (var pj = 0; pj < (room.platforms || []).length; pj++) {
        var p2 = (room.platforms || [])[pj];
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
          embedded = true;
          break;
        }
      }
      // Touchable = reachable in either pass (a door behind a legit gated
      // secret is fine; this is about doors nothing can ever physically
      // stand next to). Skip if already flagged embedded — that's the more
      // specific, more actionable issue for the same door.
      if (!embedded && !checkPointCoverage(t.x, t.y, t.w, t.h).anyPass) {
        issues.push({
          type: 'DOOR_UNREACHABLE', severity: 'error',
          x: t.x, y: t.y,
          detail: 'door to "' + t.to + '" at (' + t.x + ', ' + t.y + ') doesn\'t overlap any reachable player standing box and is beyond jump/dash reach — physically untouchable',
        });
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
