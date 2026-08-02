// Shared "weighted random walk over an ability-gated room graph" engine.
//
// This exact algorithm (mulberry32 PRNG, curiosity-weighted candidate pick,
// dead-end backtrack, oscillation-escape for small ability-locked pockets)
// used to be hand-ported into 3 separate places: Plans/analyze_floor_plan.js's
// own simulateRandomPlaythrough(), a second copy analyze_floor_plan.js
// generates inline into editor/floor_plan_simulation.html's <script> (see
// buildSimulationHtml()), and a third independent copy in
// editor/room_difficulty_calculator.html's simulateToRoom(). Any fix to the
// walk logic (e.g. the oscillation-escape fix) had to be manually re-applied
// in all 3. This is that logic, written once.
//
// Deliberately does NOT include nodeWeight()/difficultyMultiplier()/
// applyNodeGrants() — those three read a config table (time weights,
// difficulty config, ability/flag lists) that each caller sources
// differently (a `GRAPH.*` global in the two HTML tools vs. a module-level
// const in analyze_floor_plan.js), so they stay small per-file copies rather
// than forcing every caller onto one config shape.
//
// Works as a plain browser global (loaded via <script src>, same convention
// as every other game/*.js file) and as a Node CommonJS module (no 'use
// strict' here on purpose — top-level `function` declarations need to land
// on `window` unqualified in the browser, matching e.g. rectsOverlap()).

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick(candidates, rng) {
  const total = candidates.reduce((s, c) => s + c.weight, 0);
  let r = rng() * total;
  for (const c of candidates) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return candidates[candidates.length - 1];
}

function maskToSet(mask, list) {
  const s = new Set();
  list.forEach((x, i) => { if (mask & (1 << i)) s.add(x); });
  return s;
}

function requirementSatisfied(node_or_edge, abilities, flags) {
  if (!node_or_edge) return false;
  for (const a of node_or_edge.requires || []) if (!abilities.has(a)) return false;
  for (const f of node_or_edge.requiresFlags || []) if (!flags.has(f)) return false;
  if (node_or_edge.requiresOr && node_or_edge.requiresOr.length) {
    for (const group of node_or_edge.requiresOr) {
      if (group.every((a) => abilities.has(a))) return true;
    }
    return false;
  }
  return true;
}

// Counts unvisited-but-enterable rooms within `maxDepth` hops of `startId` —
// a bounded-radius "there's more map that way" sense, gated by the
// abilities/flags currently held so it doesn't chase territory behind a
// door that isn't unlocked yet.
function unexploredReach(startId, byFrom, nodesById, visitCounts, abilitiesSet, flagsSet, maxDepth) {
  const seen = new Set([startId]);
  let frontier = [startId];
  let count = 0;
  for (let d = 0; d < maxDepth && frontier.length; d++) {
    const next = [];
    for (const id of frontier) {
      for (const e of byFrom.get(id) || []) {
        if (seen.has(e.to)) continue;
        if (!requirementSatisfied(e, abilitiesSet, flagsSet)) continue;
        if (!requirementSatisfied(nodesById.get(e.to), abilitiesSet, flagsSet)) continue;
        seen.add(e.to);
        if (!visitCounts.has(e.to)) count++;
        next.push(e.to);
      }
    }
    frontier = next;
  }
  return count;
}

function getFastTravelIndex(nodesById) {
  const list = [...nodesById.values()].filter((n) => n.fastTravelWaypoint).map((n) => n.id);
  const indexOf = new Map(list.map((id, i) => [id, i]));
  return { list, indexOf };
}

// Picks the next room for a simulated random playthrough, given the legal
// `candidates` from the current room. Handles, in order: an optional
// "endgame rush" override (stop wandering and head for the final push once
// the walk has revisited a designated hub with the right ability), a
// deliberate random backtrack, a true dead-end (no legal candidates at all —
// backtracks through history to the nearest room with another option), an
// oscillation escape (stuck bouncing in a small ability-locked pocket —
// backtracks further to the nearest room with a fresh option), and
// otherwise a curiosity-weighted random pick among the candidates.
//
// Returns `{ to, edge, forcedBacktrack, note }`, or `null` if there is
// truly nowhere left to go (not even a backtrack option) — the caller
// decides what that means for it (early-return a "stuck" result, or just
// stop the walk).
//
// opts: { cur, candidates, byFrom, nodesById, visitCounts, abilitiesSet,
//         flagsSet, history, rng, backtrackChance, endgameRush,
//         getDifficultyMult(node) -> number }
function chooseNextMove(opts) {
  const {
    cur, candidates, byFrom, nodesById, visitCounts,
    abilitiesSet, flagsSet, history, rng,
    backtrackChance, endgameRush, getDifficultyMult,
  } = opts;

  let choice = null;
  if (endgameRush && cur === endgameRush.antechamberId && (visitCounts.get(cur) || 0) > 1 && abilitiesSet.has('phase_dash')) {
    const rush = candidates.find((c) => c.to === endgameRush.rushTargetId);
    if (rush) choice = rush;
  }
  const canDeliberateBacktrack = !choice && history.length > 1 && rng() < backtrackChance;

  if (choice) {
    // handled above — fall through to return
  } else if (!candidates.length) {
    let backTo = null;
    for (let i = history.length - 2; i >= 0; i--) {
      const candId = history[i];
      const hasOption = (byFrom.get(candId) || []).some((e) => {
        if (e.to === cur) return false;
        if (!requirementSatisfied(e, abilitiesSet, flagsSet)) return false;
        return requirementSatisfied(nodesById.get(e.to), abilitiesSet, flagsSet);
      });
      if (hasOption) { backTo = candId; break; }
    }
    if (backTo === null) return null; // genuinely nowhere left to go
    choice = { to: backTo, edge: null, forcedBacktrack: true };
  } else if (canDeliberateBacktrack) {
    const backIdx = Math.max(0, history.length - 2 - Math.floor(rng() * Math.min(3, history.length - 1)));
    choice = { to: history[backIdx], edge: null, forcedBacktrack: false };
  } else {
    // Oscillation escape: a small pocket (e.g. two rooms connected only to
    // each other, the rest of the world locked behind a missing ability)
    // has no legal move that's fresh or leads to fresh territory. Rather
    // than coin-flip the same doors forever, search the whole history for
    // the nearest room with a currently-legal move into unvisited
    // territory and jump straight there.
    const noProgressHere = candidates.every((c) => {
      if ((visitCounts.get(c.to) || 0) === 0) return false;
      return !(byFrom.get(c.to) || []).some((e2) => !visitCounts.has(e2.to));
    });
    const recentWindow = history.slice(-6);
    const isOscillating = noProgressHere && history.length > 6 && new Set(recentWindow).size <= 2;
    let escapedTo = null;
    if (isOscillating) {
      for (let i = history.length - 2; i >= 0; i--) {
        const candId = history[i];
        const hasFreshOption = (byFrom.get(candId) || []).some((e2) => {
          if (visitCounts.has(e2.to)) return false;
          if (!requirementSatisfied(e2, abilitiesSet, flagsSet)) return false;
          return requirementSatisfied(nodesById.get(e2.to), abilitiesSet, flagsSet);
        });
        if (hasFreshOption) { escapedTo = candId; break; }
      }
    }
    if (escapedTo !== null) {
      choice = {
        to: escapedTo, edge: null, forcedBacktrack: true,
        note: 'stuck bouncing with no new options nearby (likely missing an ability held further back) — backtracking further to find one',
      };
    } else {
      const weighted = candidates.map((c) => {
        const n = nodesById.get(c.to);
        const visits = visitCounts.get(c.to) || 0;
        let curiosity;
        if (visits === 0) {
          curiosity = 8;
        } else {
          const leadsSomewhereNew = (byFrom.get(c.to) || []).some((e2) => !visitCounts.has(e2.to));
          const unexploredNearby = unexploredReach(c.to, byFrom, nodesById, visitCounts, abilitiesSet, flagsSet, 3);
          // Diminishing returns on revisits — a hub room gatekeeping a whole
          // unexplored cluster kept scoring the same full bonus on every
          // pass through forever, looping the walker through it dozens of
          // times per run instead of treating repeat traffic as routine.
          curiosity = ((leadsSomewhereNew ? 3 : 1) + Math.min(unexploredNearby, 4) * 0.5) / Math.min(visits, 5);
        }
        const mult = getDifficultyMult(n);
        const wariness = mult > 1 ? 1 / mult : 1; // avoid re-entering known-hard rooms
        return { ...c, weight: Math.max(0.05, curiosity * wariness) };
      });
      choice = weightedPick(weighted, rng);
    }
  }
  return choice;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mulberry32, weightedPick, maskToSet, requirementSatisfied,
    unexploredReach, getFastTravelIndex, chooseNextMove,
  };
}
