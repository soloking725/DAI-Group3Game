#!/usr/bin/env node
/**
 * Floor plan analyzer for Stillpoint.
 *
 * Parses the canonical mermaid graph embedded in Plans/floor_plan.md (the
 * doc's own designated source of truth — see its header note and
 * Plans/CLAUDE.md), builds an ability-gated traversal graph, then:
 *
 *   1. Runs a fixpoint reachability search (same idea as a metroidvania
 *      randomizer's logic solver) to find everything reachable from Spawn
 *      given the abilities/story-flags earned along the way.
 *   2. Runs a state-space shortest-path search (BFS over (room, abilities,
 *      flags) triples — equivalent to A* with unit edge costs and zero
 *      heuristic) to find the critical path from Spawn to the Final Boss:
 *      the shortest sequence of rooms a player who does nothing optional
 *      could take.
 *   3. Reports which abilities/flags gate which edges, in acquisition
 *      order, plus fracture pips / lore pips / cosmetic upgrades / max
 *      health upgrades tallied both on the critical path and across the
 *      whole reachable map.
 *   4. Flags nodes the fixpoint search never reaches at all (dead
 *      content, or a genuine design gap worth checking by hand).
 *
 * Run whenever floor_plan.md's mermaid block changes:
 *   node Plans/analyze_floor_plan.js
 *
 * Add --diff to additionally cross-check floor_plan.md's node/edge text
 * against Plans/floor_plan.svg and Plans/floor_plan_mermaid.txt (the raw
 * Whimsical export + its text dump) and report phrases that only appear
 * in one source — the fast way to tell whether the visual board and the
 * corrected doc have drifted apart again.
 */

'use strict';
const fs = require('fs');
const path = require('path');

const PLANS_DIR = __dirname;
const MD_PATH = path.join(PLANS_DIR, 'floor_plan.md');
const SVG_PATH = path.join(PLANS_DIR, 'floor_plan.svg');
const TXT_PATH = path.join(PLANS_DIR, 'floor_plan_mermaid.txt');
const DIFFICULTY_PATH = path.join(PLANS_DIR, 'floor_plan_difficulty.json');

// ---------------------------------------------------------------------
// 1. Extract the mermaid source block
// ---------------------------------------------------------------------

function extractMermaidBlock(text) {
  const m = text.match(/```mermaid\s*([\s\S]*?)```/);
  if (m) return m[1];
  // floor_plan_mermaid.txt has no fences, the whole file (minus the
  // classDef/legend tail) is already mermaid.
  return text;
}

// ---------------------------------------------------------------------
// 2. Parse mermaid flowchart into nodes + edges
// ---------------------------------------------------------------------

function stripLabelShell(raw) {
  let rest = raw.trim();
  for (let i = 0; i < 3; i++) {
    rest = rest.replace(/^\(\[/, '').replace(/\]\)$/, '');
    rest = rest.replace(/^\[/, '').replace(/\]$/, '');
    rest = rest.replace(/^\(/, '').replace(/\)$/, '');
    rest = rest.trim();
  }
  rest = rest.replace(/^"/, '').replace(/"$/, '');
  return rest;
}

function parseToken(token) {
  const m = token.trim().match(/^([A-Za-z0-9_]+)([\s\S]*)$/);
  if (!m) return null;
  const id = m[1];
  const rest = m[2].trim();
  const label = rest ? stripLabelShell(rest) : null;
  return { id, label };
}

function cleanLabelText(label) {
  return label
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMermaid(source) {
  const nodes = new Map(); // id -> { id, label, rawLabelParts: [] }
  const edges = []; // { from, to, label }

  const lines = source.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^flowchart\s/i.test(line)) continue;
    if (/^classDef/i.test(line)) continue;
    if (/^class\s/i.test(line)) continue;
    if (/^style\s/i.test(line)) continue;
    if (/^linkStyle/i.test(line)) continue;

    const arrowMatch = line.match(/^(.*?)-{2,3}>(?:\|(.*?)\|)?(.*)$/);
    if (arrowMatch) {
      const [, leftRaw, edgeLabelRaw, rightRaw] = arrowMatch;
      const left = parseToken(leftRaw);
      const right = parseToken(rightRaw);
      if (!left || !right) continue;
      registerNode(nodes, left);
      registerNode(nodes, right);
      edges.push({
        from: left.id,
        to: right.id,
        label: edgeLabelRaw ? cleanLabelText(edgeLabelRaw) : null,
      });
      continue;
    }

    // standalone node declaration, e.g. `Foo_bar123[Some Label]`
    const tok = parseToken(line);
    if (tok && tok.label) {
      registerNode(nodes, tok);
    }
  }
  return { nodes, edges };
}

function registerNode(nodes, tok) {
  if (!nodes.has(tok.id)) {
    nodes.set(tok.id, { id: tok.id, label: tok.label ? cleanLabelText(tok.label) : tok.id });
  } else if (tok.label) {
    const existing = nodes.get(tok.id);
    if (!existing.label || existing.label === existing.id) {
      existing.label = cleanLabelText(tok.label);
    }
  }
}

// ---------------------------------------------------------------------
// 3. Metadata extraction (rewards, ability grants, requirements)
// ---------------------------------------------------------------------

// Longest-alias-first so "void tether" matches before "tether".
const ABILITY_ALIASES = [
  ['void tether', 'void_tether'],
  ['tether shot', 'void_tether'], // documented mislabel, see floor_plan.md corrections
  ['phase dash', 'phase_dash'],
  ['shard shot', 'shard_shot'],
  ['charged attack', 'charged_attack'],
  ['graviton surge', 'graviton_surge'],
  ['gravition surge', 'graviton_surge'], // typo in source docs
  ['stillpoint', 'stillpoint'],
  ['magnet climb', 'magnet_climb'], // removed 2026-07-14; kept for raw/svg compatibility
];

function findAbilities(text) {
  const found = [];
  for (const [alias, key] of ABILITY_ALIASES) {
    if (text.includes(alias) && !found.includes(key)) found.push(key);
  }
  return found;
}

function extractNumber(text, re) {
  const m = text.match(re);
  return m ? parseInt(m[1], 10) : 0;
}

function splitSegments(label) {
  // Each fact in these docs lives in its own "(...)" parenthetical, joined
  // by <br>/spaces after cleanLabelText. Recover them individually so an
  // "unlocks X" grant segment doesn't get confused with a "requires Y"
  // segment sitting right next to it in the same node label.
  const segments = [];
  const parenRe = /\(([^()]*)\)/g;
  let m;
  let consumed = '';
  while ((m = parenRe.exec(label))) {
    segments.push(m[1]);
    consumed += m[0];
  }
  const remainder = label.replace(parenRe, '').trim();
  if (remainder) segments.push(remainder);
  return segments;
}

function analyzeSegment(seg, node, warnings, context, discoveredFlags) {
  const low = seg.toLowerCase();

  // "Conditionally unlocks X — grants it only if Y is already held": a real
  // optional/story-gated pickup, not an entry gate. The room stays enterable
  // regardless; only the ability grant itself depends on already holding Y.
  const condMatch = low.match(/conditionally unlocks ([a-z][a-z ]*?)\s*(?:—|-|:)\s*grants it only if ([a-z][a-z ]*?) is already held/);
  if (condMatch) {
    const grantedAbility = findAbilities(condMatch[1])[0];
    const conditionAbilities = findAbilities(condMatch[2]);
    if (grantedAbility && conditionAbilities.length) {
      node.conditionalGrants.push({ ability: grantedAbility, conditionOn: conditionAbilities });
    } else {
      warnings.push(`${context}: "${seg}" — couldn't resolve ability names in conditional grant, ignored.`);
    }
    return;
  }

  if (/\bunlocks\b/.test(low)) {
    // "unlocks fast travel" is a location property, not an ability — but it
    // does gate the fast-travel *mechanic itself*: no warp is usable at all
    // until this flag is set, regardless of which waypoints are visited.
    if (/unlocks fast travel/.test(low)) {
      node.fastTravelGrant = true;
      node.grantsFlags.push('fast_travel_unlocked');
      return;
    }
    const abilities = findAbilities(low);
    if (abilities.length) {
      for (const a of abilities) {
        if (!node.grants.includes(a)) node.grants.push(a);
      }
      if (/conditionally/.test(low)) {
        warnings.push(
          `${context}: "${seg}" — conditional ability grant with an unrecognized condition clause; treated as unconditional once the room is reached. Use "Conditionally unlocks X — grants it only if Y is already held" so this tool can model the condition. Verify by hand.`
        );
      }
    } else {
      // e.g. "unlocks charged attack, floor collapses and you must fight Crag warden"
      const chargedMatch = low.match(/unlocks charged attack/);
      if (chargedMatch && !node.grants.includes('charged_attack')) { node.grants.push('charged_attack'); return; }
      // Generic custom story-flag grant, e.g. "unlocks prison_resolved" —
      // a single already-snake_case token that isn't a known ability.
      const flagMatch = low.match(/^unlocks ([a-z][a-z_]*)$/);
      if (flagMatch) {
        node.grantsFlags.push(flagMatch[1]);
        if (discoveredFlags) discoveredFlags.add(flagMatch[1]);
      } else if (!chargedMatch) {
        warnings.push(`${context}: unrecognized "unlocks" segment: "${seg}"`);
      }
    }
    return;
  }

  // Resource-count entry gate, e.g. "locked by 4 Fracture Pips and 10 Lore
  // Pips" — must be checked BEFORE the generic reward-count parsing below,
  // since that regex (`/(\d+)\s*fracture pip/`) also matches this text and
  // was silently misreading a REQUIREMENT as a REWARD (adding 4 bogus
  // Fracture Pips to the pool, then returning before ever looking at the
  // "10 Lore Pips" half — the room ended up with no real requirement at
  // all). Order here matters.
  if (/locked by/.test(low) && /pip/.test(low)) {
    let matched = false;
    const fpMatch = low.match(/(\d+)\s*fracture pips?/);
    if (fpMatch) { node.requiresFracturePips = parseInt(fpMatch[1], 10); matched = true; }
    const lpMatch = low.match(/(\d+)\s*lore pips?/);
    if (lpMatch) { node.requiresLorePips = parseInt(lpMatch[1], 10); matched = true; }
    if (matched) return;
    warnings.push(`${context}: "${seg}" — "locked by ... pip(s)" segment didn't match the expected "N Fracture Pips"/"N Lore Pips" shape, treated as unrecognized.`);
  }

  let n;
  if ((n = extractNumber(low, /(\d+)\s*fracture pip/))) { node.fracturePips += n; return; }
  if ((n = extractNumber(low, /(\d+)\s*lore pip/))) { node.lorePips += n; return; }
  if ((n = extractNumber(low, /(\d+)\s*cosmetic upgrade/))) { node.cosmeticUpgrades += n; return; }
  if (/max health/.test(low)) { node.maxHealth += 1; return; }
  if (/new miniboss|\bminiboss\b/.test(low)) { node.miniboss = true; return; }
  if (/final boss/.test(low)) { node.finalBoss = true; return; }
  // "(post-game)" rooms (the 4 Sovereign Rooms) aren't gated by anything
  // else in the graph text, so nothing stopped the reachability/simulation
  // tools from wandering into them during a normal pre-victory playthrough
  // walk. Gate them behind a flag nothing in the graph ever grants, so
  // they're provably unreachable until the game actually models a
  // post-game unlock — matches their intent without inventing content.
  if (/post-?game/.test(low)) {
    node.requiresFlags.push('postgame_unlocked');
    if (discoveredFlags) discoveredFlags.add('postgame_unlocked');
    return;
  }
  if (/^fast travel$/.test(low.trim())) { node.fastTravelWaypoint = true; return; }

  if (/meet the child|met the child|met child/.test(low)) {
    if (/requires|required/.test(low)) node.requiresFlags.push('met_child');
    else node.grantsFlags.push('met_child');
    return;
  }

  // "locked by Echo Bridge part 1" is shorthand for the same met_child
  // flag — Echo Bridge part 1 is where the Child is met (see above).
  if (/locked by echo bridge part 1|requires echo bridge part 1/.test(low)) {
    node.requiresFlags.push('met_child');
    return;
  }

  if (/required to leave|required to exit/.test(low)) {
    // Gates the exit, not the entry — doesn't block reachability into the
    // room itself, so don't add it as an entry requirement. Surfaced as a
    // note instead so it's still visible in the report.
    node.notes.push(seg + ' [exit-gate, not entry-gate — not enforced by this tool]');
    return;
  }

  if (/requires|required|locked by|entry requires/.test(low)) {
    if (/\bor\b/.test(low) && /not both/.test(low)) {
      const abilities = findAbilities(low);
      if (abilities.length >= 2) {
        node.requiresOr.push(abilities);
        warnings.push(
          `${context}: "${seg}" — parsed as "either ability suffices to enter" for reachability, but the "not both" mutual-exclusion is NOT enforced by this tool (it isn't a reachability constraint). Check by hand if that exclusivity matters.`
        );
        return;
      }
    }
    const abilities = findAbilities(low);
    if (abilities.length) {
      for (const a of abilities) if (!node.requires.includes(a)) node.requires.push(a);
      return;
    }
    // Generic custom story-flag requirement, e.g. "requires prison_resolved"
    // or "entry requires prison_resolved" — a single snake_case token that
    // isn't a known ability.
    const flagMatch = low.match(/^(?:entry )?requires ([a-z][a-z_]*)$/);
    if (flagMatch) {
      node.requiresFlags.push(flagMatch[1]);
      if (discoveredFlags) discoveredFlags.add(flagMatch[1]);
    } else {
      warnings.push(`${context}: requirement segment with no recognized ability: "${seg}"`);
    }
    return;
  }

  if (/one way/.test(low)) { node.oneWayNote = seg; return; }
  if (/fast travel/.test(low)) { node.fastTravelWaypoint = true; return; }

  node.notes.push(seg);
}

function newNodeMeta(id, label) {
  return {
    id,
    label,
    fracturePips: 0,
    lorePips: 0,
    cosmeticUpgrades: 0,
    maxHealth: 0,
    miniboss: false,
    finalBoss: false,
    fastTravelWaypoint: false,
    fastTravelGrant: false,
    grants: [],
    grantsFlags: [],
    conditionalGrants: [], // [{ ability, conditionOn: [abilities] }]
    requires: [],
    requiresOr: [], // array of ability-arrays; any one full array satisfies
    requiresFlags: [],
    requiresFracturePips: 0, // minimum cumulative Fracture Pips collected so far to enter
    requiresLorePips: 0,     // minimum cumulative Lore Pips collected so far to enter
    oneWayNote: null,
    notes: [],
  };
}

function buildGraph(source) {
  const { nodes, edges } = parseMermaid(source);
  const warnings = [];
  const graphNodes = new Map();
  const discoveredFlags = new Set();

  for (const [id, n] of nodes) {
    const meta = newNodeMeta(id, n.label);
    for (const seg of splitSegments(n.label)) {
      analyzeSegment(seg, meta, warnings, `node "${n.label}"`, discoveredFlags);
    }
    graphNodes.set(id, meta);
  }

  const graphEdges = edges.map((e) => {
    const meta = {
      from: e.from,
      to: e.to,
      label: e.label,
      requires: [],
      requiresOr: [],
      requiresFlags: [],
      oneWay: false,
    };
    if (e.label) {
      for (const seg of splitSegments(e.label).length ? splitSegments(e.label) : [e.label]) {
        const tmp = newNodeMeta('__edge__', '');
        analyzeSegment(seg, tmp, warnings, `edge ${e.from} -> ${e.to} ("${e.label}")`, discoveredFlags);
        meta.requires.push(...tmp.requires);
        meta.requiresOr.push(...tmp.requiresOr);
        meta.requiresFlags.push(...tmp.requiresFlags);
        if (tmp.oneWayNote) meta.oneWay = true;
      }
    }
    return meta;
  });

  for (const f of discoveredFlags) {
    if (!ALL_FLAGS.includes(f)) ALL_FLAGS.push(f);
  }

  // The mermaid diagram draws one arrow per door in the "forward"
  // narrative direction, but per floor_plan.md's own convention only one
  // edge in the whole graph is explicitly called out as one-way (Tutorial
  // -> Fracture) — normal metroidvania doors are two-way, and the diagram
  // just doesn't bother drawing the backtrack arrow. So: infer a reverse
  // edge for every connection UNLESS it's flagged one-way.
  //
  // Design decision (2026-07-16): scripted teleporters/warp gates ("One
  // Way Teleport ...", "Warp Gate ...", "Teleport from/gate from ...") are
  // one-way only the FIRST time — the device activates a return trip once
  // you've used it once. Since the only way to ever be standing on the far
  // side of one of these is to have already ridden it there, "always
  // bidirectional" and "one-way-then-two-way" are equivalent for every
  // reachability/path/route-count search in this file — no extra state
  // tracking needed. So these get a reverse edge unconditionally, even
  // overriding an explicit "One Way ..." label on the edge itself (that
  // label describes the FIRST trip, not a permanent restriction). True
  // narrative one-way beats between ordinary rooms (Tutorial -> Fracture,
  // Spawn -> Tutorial, ... -> "Spawn Area" final-boss door, Polar Shift ->
  // Paradox Engine) are NOT teleporters and stay one-way forever.
  const isTeleporterNode = (nodeId) => /teleport|warp gate/i.test(graphNodes.get(nodeId).label);
  const existingPairs = new Set(graphEdges.map((e) => `${e.from}->${e.to}`));
  const reverseEdges = [];
  for (const e of graphEdges) {
    const isTeleporterEdge = isTeleporterNode(e.from) || isTeleporterNode(e.to);
    if (!isTeleporterEdge && e.oneWay) continue;
    const reverseKey = `${e.to}->${e.from}`;
    if (existingPairs.has(reverseKey)) continue;
    reverseEdges.push({
      from: e.to,
      to: e.from,
      label: e.label,
      requires: e.requires,
      requiresOr: e.requiresOr,
      requiresFlags: e.requiresFlags,
      oneWay: false,
      inferredReverse: true,
      teleporterReturn: isTeleporterEdge,
    });
    existingPairs.add(reverseKey);
  }

  return { nodes: graphNodes, edges: graphEdges.concat(reverseEdges), warnings };
}

// ---------------------------------------------------------------------
// 4. Reachability fixpoint + critical-path state-space search
// ---------------------------------------------------------------------

// magnet_climb intentionally excluded: removed from the design 2026-07-14
// (see floor_plan.md's corrections note). Left in ABILITY_ALIASES only so
// --diff can still flag it if it lingers in a stale source (svg/txt).
const ALL_ABILITIES = ['phase_dash', 'shard_shot', 'charged_attack', 'graviton_surge', 'stillpoint', 'void_tether'];
// Mutable: buildGraph() appends any custom snake_case flag names it
// discovers via the generic "requires X" / "unlocks X" fallback below, so
// ad-hoc story flags (e.g. a plot-point lock) work without new hardcoded
// special-casing every time.
let ALL_FLAGS = ['met_child', 'fast_travel_unlocked'];

// Rough time-cost estimates per room feature, in approximate minutes —
// tune against real playtests once you have them. Reasoning, not just
// guesses: a *passive pickup* sitting in a room you already have to pass
// through costs almost no extra time (you walk over it), so pips/upgrades
// are weighted far below combat encounters, not comparably to them as in
// the original placeholder scale. Room traversal is weighted above a
// "quick corridor" baseline because CLAUDE.md's room-sizing philosophy is
// "few large, multi-tier rooms with internal branching," not small single-
// gimmick rooms — so a typical room here takes longer to cross than in a
// tighter metroidvania. Miniboss numbers assume a first-time player who
// still has to learn the pattern; finalBoss assumes boss.js's real
// 3-phase fight.
const TIME_WEIGHTS = {
  baseRoom: 1.5, // traversal/platforming through a normal multi-tier room
  miniboss: 3, // a real fight, but shorter than the final boss
  finalBoss: 6, // 3-phase fight (see boss.js)
  fracturePip: 0.2, // passive pickup, near-zero detour if on the mandatory route
  lorePip: 0.2,
  cosmeticUpgrade: 0.2,
  maxHealth: 0.2,
  abilityGrant: 0.5, // unlock cutscene / move-tutorial prompt
  fastTravelWarp: 0.3, // menu warp between two already-visited waypoints
};

// Fast travel isn't a shortcut into unexplored content — it only connects
// waypoints you've already physically stood in at least once. Modeled as:
// from a fast-travel-tagged room, you may warp to any OTHER fast-travel-
// tagged room the current path has already physically visited. (Assumes
// warps launch FROM a waypoint, not from anywhere via a menu — flag if the
// real design allows the latter, it's a one-line change below.)
function getFastTravelIndex(nodes) {
  const list = [...nodes.values()].filter((n) => n.fastTravelWaypoint).map((n) => n.id);
  const indexOf = new Map(list.map((id, i) => [id, i]));
  return { list, indexOf };
}

function nodeWeight(n) {
  let w = TIME_WEIGHTS.baseRoom;
  if (n.miniboss) w += TIME_WEIGHTS.miniboss;
  if (n.finalBoss) w += TIME_WEIGHTS.finalBoss;
  w += n.fracturePips * TIME_WEIGHTS.fracturePip;
  w += n.lorePips * TIME_WEIGHTS.lorePip;
  w += n.cosmeticUpgrades * TIME_WEIGHTS.cosmeticUpgrade;
  w += n.maxHealth * TIME_WEIGHTS.maxHealth;
  if (n.grants.length) w += TIME_WEIGHTS.abilityGrant;
  return w;
}

// ---------------------------------------------------------------------
// 4b. Per-room difficulty config (Plans/floor_plan_difficulty.json)
// ---------------------------------------------------------------------
//
// Optional, hand-authored file, NOT auto-generated — lets a designer say
// "this room is harder/easier than the flat TIME_WEIGHTS guess" without
// touching this script. Shape:
//
//   {
//     "default": 1,
//     "rooms": {
//       "miniboss": 2,        // fallback multiplier for any node with a miniboss
//       "finalBoss": 3,       // fallback multiplier for the final boss node
//       "Crag Warden": 2.5,   // exact label match wins over the fallbacks above
//       "Static Field": 1.6   // substring match against the label (case-insensitive)
//     }
//   }
//
// A multiplier > 1 means "takes longer / more retries than a normal room
// of its kind" (used by --simulate to model deaths/retries); < 1 means
// "trivial, a player blows through it." Missing file / missing entries
// fall back to 1 (no change from the flat TIME_WEIGHTS model).
function loadDifficultyConfig() {
  if (!fs.existsSync(DIFFICULTY_PATH)) return { default: 1, rooms: {} };
  try {
    const raw = JSON.parse(fs.readFileSync(DIFFICULTY_PATH, 'utf8'));
    return { default: typeof raw.default === 'number' ? raw.default : 1, rooms: raw.rooms || {} };
  } catch (err) {
    console.error(`! Couldn't parse ${path.relative(process.cwd(), DIFFICULTY_PATH)}: ${err.message} — using flat difficulty 1 for everything.`);
    return { default: 1, rooms: {} };
  }
}

function difficultyMultiplier(node, config) {
  const label = node.label.toLowerCase();
  // Exact label match wins, then longest substring match, then the
  // miniboss/finalBoss fallback keys, then the file's global default.
  for (const key of Object.keys(config.rooms)) {
    if (key.toLowerCase() === label) return config.rooms[key];
  }
  let best = null, bestLen = -1;
  for (const key of Object.keys(config.rooms)) {
    const k = key.toLowerCase();
    if (k === 'miniboss' || k === 'finalboss') continue;
    if (label.includes(k) && k.length > bestLen) { best = config.rooms[key]; bestLen = k.length; }
  }
  if (best !== null) return best;
  if (node.miniboss && config.rooms.miniboss !== undefined) return config.rooms.miniboss;
  if (node.finalBoss && config.rooms.finalBoss !== undefined) return config.rooms.finalBoss;
  return config.default;
}

// ---------------------------------------------------------------------
// 4c. Random-playthrough simulator ("what does a player who wanders and
// backtracks actually experience?" as opposed to the critical/speedrun
// paths above, which both assume a player doing nothing optional).
// ---------------------------------------------------------------------
//
// A simple weighted random walk over the same (room, abilities, flags,
// fast-travel-visited) state used by the path searches: at each step it
// gathers every currently-legal move (including fast travel warps once
// unlocked), weights unvisited rooms higher than ones already seen
// (curiosity) and harder rooms lower (a player avoids backtracking into
// something that keeps killing them, per floor_plan_difficulty.json),
// occasionally forces a deliberate backtrack even when new content is
// available (models "player got turned around"), and simulates extra
// retries/time on hard rooms. Stops at the Final Boss or a step cap.
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

// Counts unvisited rooms within `maxDepth` hops of `startId` that are
// actually enterable with the abilities/flags currently held — a player's
// "there's more map that way" sense is bounded by what they can actually
// walk through right now, not by rooms sitting behind a door they haven't
// unlocked yet (an earlier version ignored gating entirely and it made the
// walk orbit locked doors, chasing unreachable "unexplored" territory it
// could see but not enter). Bounded-radius BFS, cheap enough to run
// per-candidate per-step on a ~80-room graph.
function unexploredReach(startId, byFrom, nodes, visitCounts, abilitiesSet, flagsSet, maxDepth) {
  const seen = new Set([startId]);
  let frontier = [startId];
  let count = 0;
  for (let d = 0; d < maxDepth && frontier.length; d++) {
    const next = [];
    for (const id of frontier) {
      for (const e of byFrom.get(id) || []) {
        if (seen.has(e.to)) continue;
        if (!requirementSatisfied(e, abilitiesSet, flagsSet)) continue;
        if (!requirementSatisfied(nodes.get(e.to), abilitiesSet, flagsSet)) continue;
        seen.add(e.to);
        if (!visitCounts.has(e.to)) count++;
        next.push(e.to);
      }
    }
    frontier = next;
  }
  return count;
}

function simulateRandomPlaythrough(graph, startId, goalId, difficultyConfig, opts) {
  const { nodes, edges } = graph;
  const rng = mulberry32(opts.seed);
  const backtrackChance = opts.backtrackChance !== undefined ? opts.backtrackChance : 0.12;
  const maxSteps = opts.maxSteps || 500;

  const byFrom = new Map();
  for (const e of edges) {
    if (!byFrom.has(e.from)) byFrom.set(e.from, []);
    byFrom.get(e.from).push(e);
  }
  const { list: ftList, indexOf: ftIndex } = getFastTravelIndex(nodes);
  const ftBit = (nodeId, mask) => (ftIndex.has(nodeId) ? mask | (1 << ftIndex.get(nodeId)) : mask);
  const endgameRush = findEndgameRush(graph);

  let [am, fm] = applyNodeGrants(startId, 0, 0, nodes);
  let ft = ftBit(startId, 0);
  let cur = startId;
  const visitCounts = new Map([[startId, 1]]);
  const history = [startId]; // room-visit order, for the "deliberate backtrack" move
  const log = [];
  let totalTime = 0;
  let totalRetries = 0;
  // Running pip totals, for resource-count entry gates (e.g. Sovereign Army
  // Reserve's "locked by 4 Fracture Pips and 10 Lore Pips") — only counted
  // once per room, on first visit (see the apply-move step below), same as
  // a real pickup.
  let heldFracturePips = nodes.get(startId).fracturePips;
  let heldLorePips = nodes.get(startId).lorePips;

  const logStep = (nodeId, viaLabel, extra) => {
    const n = nodes.get(nodeId);
    const mult = difficultyMultiplier(n, difficultyConfig);
    let retries = 0;
    if (mult > 1) {
      // Rough "died and retried" model: each retry has a shrinking chance,
      // scaled by how much harder than baseline (1.0) this room is.
      let p = Math.min(0.85, (mult - 1) / mult + 0.05);
      while (rng() < p && retries < 6) { retries++; p *= 0.6; }
    }
    const cost = nodeWeight(n) * mult + retries * nodeWeight(n) * 0.5 * mult;
    totalTime += cost;
    totalRetries += retries;
    log.push({
      node: nodeId, label: n.label, via: viaLabel || null, isRevisit: (visitCounts.get(nodeId) || 0) > 1,
      visitNumber: visitCounts.get(nodeId) || 1, difficulty: mult, retries, cost, note: extra || null,
      miniboss: n.miniboss, finalBoss: n.finalBoss, fastTravel: n.fastTravelWaypoint,
    });
  };
  logStep(startId, null);

  for (let step = 0; step < maxSteps && cur !== goalId; step++) {
    const abilitiesSet = maskToSet(am, ALL_ABILITIES);
    const flagsSet = maskToSet(fm, ALL_FLAGS);
    const candidates = [];
    for (const e of byFrom.get(cur) || []) {
      if (!requirementSatisfied(e, abilitiesSet, flagsSet)) continue;
      const targetNode = nodes.get(e.to);
      if (!requirementSatisfied(targetNode, abilitiesSet, flagsSet)) continue;
      if (targetNode.requiresFracturePips && heldFracturePips < targetNode.requiresFracturePips) continue;
      if (targetNode.requiresLorePips && heldLorePips < targetNode.requiresLorePips) continue;
      candidates.push({ to: e.to, edge: e });
    }
    if (flagsSet.has('fast_travel_unlocked') && ftIndex.has(cur)) {
      for (const otherId of ftList) {
        if (otherId === cur) continue;
        if (ft & (1 << ftIndex.get(otherId))) candidates.push({ to: otherId, edge: WARP_EDGE });
      }
    }

    // Endgame rush: once a run has been back to the Antechamber more than
    // once (i.e. already bounced off Hollow Core at least one retry) with
    // Phase Dash in hand, stop rolling the dice — a real player who's
    // already poked at the optional lore room would just go finish it.
    let choice = null;
    if (endgameRush && cur === endgameRush.antechamberId && (visitCounts.get(cur) || 0) > 1 && abilitiesSet.has('phase_dash')) {
      const rush = candidates.find((c) => c.to === endgameRush.rushTargetId);
      if (rush) choice = rush;
    }

    // Deliberate backtrack: sometimes retreat to an earlier room instead of
    // taking a "forward" option, even if forward options exist — but only
    // if we actually have somewhere to retreat to.
    const canDeliberateBacktrack = !choice && history.length > 1 && rng() < backtrackChance;
    if (choice) {
      // handled above — fall through to the apply-move step at the bottom of the loop
    } else if (!candidates.length) {
      // A true dead end (e.g. the "Teleport from Static Field" trap this
      // caught): don't just hop to the immediately-previous room, since if
      // THAT room's only way forward is back into this dead end, we'd
      // ping-pong forever. Walk backward through history for the nearest
      // room that still has at least one legal move other than back into
      // here, and jump straight there.
      let backTo = null;
      for (let i = history.length - 2; i >= 0; i--) {
        const candId = history[i];
        const hasOption = (byFrom.get(candId) || []).some((e) => {
          if (e.to === cur) return false;
          if (!requirementSatisfied(e, abilitiesSet, flagsSet)) return false;
          return requirementSatisfied(nodes.get(e.to), abilitiesSet, flagsSet);
        });
        if (hasOption) { backTo = candId; break; }
      }
      if (backTo === null) break; // genuinely nowhere left to go — real design bug, not a simulator artifact
      choice = { to: backTo, edge: null, forcedBacktrack: true };
    } else if (canDeliberateBacktrack) {
      const backIdx = Math.max(0, history.length - 2 - Math.floor(rng() * Math.min(3, history.length - 1)));
      const backTo = history[backIdx];
      choice = { to: backTo, edge: null, forcedBacktrack: false };
    } else {
      // Detect a small pocket with no missing-ability escape (e.g. Static
      // Field Room 1 <-> Paradox Engine Room 2 when Phase Dash hasn't been
      // picked up yet, so Static Field Room 2's requirement can never be
      // met from here): every legal move from `cur` leads only to rooms
      // that are themselves already-seen AND don't lead anywhere fresh
      // either, and the last few steps have only bounced between 1-2
      // rooms. A real player would eventually give up and backtrack much
      // further looking for the ability/route they're missing, rather
      // than coin-flipping the same two doors forever — so do that:
      // search the WHOLE history (not just the immediate neighborhood)
      // for the nearest room with a currently-legal move into unvisited
      // territory, and jump straight there.
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
            return requirementSatisfied(nodes.get(e2.to), abilitiesSet, flagsSet);
          });
          if (hasFreshOption) { escapedTo = candId; break; }
        }
      }
      if (escapedTo !== null) {
        choice = { to: escapedTo, edge: null, forcedBacktrack: true, note: 'stuck bouncing with no new options nearby (likely missing an ability held further back) — backtracking further to find one' };
      } else {
        const weighted = candidates.map((c) => {
          const n = nodes.get(c.to);
          const visits = visitCounts.get(c.to) || 0;
          // Curiosity: strong pull if this room itself is new. If it's
          // already-seen, weight it by how much unexplored territory sits
          // within a few hops of it (a bounded-radius sense of "there's
          // still a whole unexplored region that way" — a player who's
          // played a while has a rough mental map of where they haven't
          // been, without knowing the exact route or which doors are
          // locked). Flat low weight for a dead-end-into-known-territory
          // option so pure backtracking still happens but can't out-
          // compete real unexplored pulls.
          let curiosity;
          if (visits === 0) {
            curiosity = 8;
          } else {
            // Keep the original 1-hop "leads somewhere new" as the primary
            // signal (it's what actually kept the walk from stalling), and
            // add a small bonus for sensing more unexplored territory a
            // few hops out — a nudge toward the right general direction,
            // not a score that can outweigh a real fresh-room option.
            const leadsSomewhereNew = (byFrom.get(c.to) || []).some((e2) => !visitCounts.has(e2.to));
            const unexploredNearby = unexploredReach(c.to, byFrom, nodes, visitCounts, abilitiesSet, flagsSet, 3);
            // Diminishing returns on revisits — see room_difficulty_calculator.js's
            // matching comment. A hub node gatekeeping a whole unexplored
            // cluster kept scoring the same full bonus on every pass through
            // forever, so the walker looped back through it dozens of times
            // per run instead of treating repeat traffic as routine.
            curiosity = ((leadsSomewhereNew ? 3 : 1) + Math.min(unexploredNearby, 4) * 0.5) / Math.min(visits, 5);
          }
          const mult = difficultyMultiplier(n, difficultyConfig);
          const wariness = mult > 1 ? 1 / mult : 1; // avoid re-entering known-hard rooms, doesn't block mandatory ones since they're often the only candidate
          return { ...c, weight: Math.max(0.05, curiosity * wariness) };
        });
        choice = weightedPick(weighted, rng);
      }
    }

    const viaLabel = choice.edge && choice.edge.label ? choice.edge.label : null;
    if (choice.to !== cur) {
      [am, fm] = applyNodeGrants(choice.to, am, fm, nodes);
      ft = ftBit(choice.to, ft);
      cur = choice.to;
      const isFirstVisit = !visitCounts.has(cur);
      visitCounts.set(cur, (visitCounts.get(cur) || 0) + 1);
      if (isFirstVisit) {
        heldFracturePips += nodes.get(cur).fracturePips;
        heldLorePips += nodes.get(cur).lorePips;
      }
      history.push(cur);
      logStep(cur, viaLabel, choice.note || (choice.forcedBacktrack ? 'dead end — forced backtrack' : null));
    }
  }

  return {
    log, totalTime, totalRetries,
    reachedGoal: cur === goalId,
    uniqueRooms: visitCounts.size,
    totalVisits: log.length,
    backtrackSteps: log.filter((s) => s.isRevisit).length,
  };
}

// Applies a node's unconditional grants plus any conditional grants (e.g.
// "conditionally unlocks Void Tether, but only if Stillpoint is already
// held") whose condition is satisfied by the abilities/flags already held
// on arrival. Shared by the fixpoint search and both path searches so the
// three don't drift out of sync on how conditional grants resolve.
function applyNodeGrants(nodeId, abilityMask, flagMask, nodes) {
  const n = nodes.get(nodeId);
  let am = abilityMask, fm = flagMask;
  for (const a of n.grants) am |= (1 << ALL_ABILITIES.indexOf(a));
  for (const f of n.grantsFlags) fm |= (1 << ALL_FLAGS.indexOf(f));
  for (const cg of n.conditionalGrants) {
    const condMask = cg.conditionOn.reduce((m, a) => m | (1 << ALL_ABILITIES.indexOf(a)), 0);
    if ((am & condMask) === condMask) am |= (1 << ALL_ABILITIES.indexOf(cg.ability));
  }
  return [am, fm];
}

function abilityDelta(oldMask, newMask) {
  return ALL_ABILITIES.filter((a, i) => (newMask & (1 << i)) && !(oldMask & (1 << i)));
}
function flagDelta(oldMask, newMask) {
  return ALL_FLAGS.filter((f, i) => (newMask & (1 << i)) && !(oldMask & (1 << i)));
}

function requirementSatisfied(node_or_edge, abilities, flags) {
  for (const a of node_or_edge.requires) if (!abilities.has(a)) return false;
  for (const f of node_or_edge.requiresFlags) if (!flags.has(f)) return false;
  if (node_or_edge.requiresOr && node_or_edge.requiresOr.length) {
    for (const group of node_or_edge.requiresOr) {
      if (group.every((a) => abilities.has(a))) return true;
    }
    return false;
  }
  return true;
}

function findStart(nodes) {
  for (const n of nodes.values()) {
    if (/^spawn area/i.test(n.label)) return n.id;
  }
  throw new Error('Could not find a "Spawn Area" node to start from.');
}

function findFinalBoss(nodes) {
  for (const n of nodes.values()) {
    if (n.finalBoss) return n.id;
  }
  throw new Error('Could not find a node flagged as the Final Boss.');
}

// Finds "The Antechamber" and its one-way, phase-dash-gated edge toward the
// Final Boss push (currently -> "Spawn Area" -> Tutorial Area Final Boss).
// Used by the random-walk simulator to force a deliberate "I'm done
// exploring, go finish it" move once a run has been back to the Antechamber
// more than once with Phase Dash in hand — a real player who's already
// poked at Hollow Core wouldn't keep randomly wandering this close to the
// end. Returns null if the graph doesn't have this shape (renamed rooms,
// requirement changed, etc.) so callers can just skip the override.
function findEndgameRush(graph) {
  const ante = [...graph.nodes.values()].find((n) => /^the antechamber$/i.test(n.label));
  if (!ante) return null;
  const edge = graph.edges.find((e) => e.from === ante.id && e.requires && e.requires.includes('phase_dash'));
  if (!edge) return null;
  return { antechamberId: ante.id, rushTargetId: edge.to };
}

function fixpointReachability(graph, startId, seedAbilities, seedFlags) {
  const { nodes, edges } = graph;
  const reached = new Set([startId]);
  const abilities = new Set(seedAbilities || []);
  const flags = new Set(seedFlags || []);
  const grantSource = {}; // ability/flag -> node id that granted it

  const applyGrants = (nodeId) => {
    const n = nodes.get(nodeId);
    let changed = false;
    for (const a of n.grants) {
      if (!abilities.has(a)) { abilities.add(a); grantSource[a] = nodeId; changed = true; }
    }
    for (const f of n.grantsFlags) {
      if (!flags.has(f)) { flags.add(f); grantSource[f] = nodeId; changed = true; }
    }
    for (const cg of n.conditionalGrants) {
      if (abilities.has(cg.ability)) continue;
      if (cg.conditionOn.every((a) => abilities.has(a))) {
        abilities.add(cg.ability); grantSource[cg.ability] = nodeId; changed = true;
      }
    }
    return changed;
  };

  let changed = true;
  applyGrants(startId);
  while (changed) {
    changed = false;
    for (const e of edges) {
      if (!reached.has(e.from)) continue;
      if (reached.has(e.to)) continue;
      const targetNode = nodes.get(e.to);
      if (!requirementSatisfied(e, abilities, flags)) continue;
      if (!requirementSatisfied(targetNode, abilities, flags)) continue;
      reached.add(e.to);
      changed = true;
    }
    for (const id of reached) {
      if (applyGrants(id)) changed = true;
    }
  }

  return { reached, abilities, flags, grantSource };
}

function abilityBitmask(set) {
  let mask = 0;
  ALL_ABILITIES.forEach((a, i) => { if (set.has(a)) mask |= (1 << i); });
  return mask;
}
function flagBitmask(set) {
  let mask = 0;
  ALL_FLAGS.forEach((f, i) => { if (set.has(f)) mask |= (1 << i); });
  return mask;
}
function maskToSet(mask, list) {
  const s = new Set();
  list.forEach((x, i) => { if (mask & (1 << i)) s.add(x); });
  return s;
}

const WARP_EDGE = { label: 'fast travel warp', requires: [], requiresOr: [], requiresFlags: [], oneWay: false, isWarp: true };

function criticalPathSearch(graph, startId, goalId) {
  const { nodes, edges } = graph;
  const byFrom = new Map();
  for (const e of edges) {
    if (!byFrom.has(e.from)) byFrom.set(e.from, []);
    byFrom.get(e.from).push(e);
  }
  const { list: ftList, indexOf: ftIndex } = getFastTravelIndex(nodes);
  const ftBit = (nodeId, mask) => (ftIndex.has(nodeId) ? mask | (1 << ftIndex.get(nodeId)) : mask);

  const [startAm, startFm] = applyNodeGrants(startId, 0, 0, nodes);
  const startFt = ftBit(startId, 0);
  const startKey = `${startId}|${startAm}|${startFm}|${startFt}`;
  const visited = new Set([startKey]);
  const queue = [{ node: startId, am: startAm, fm: startFm, ft: startFt }];
  const parent = new Map(); // key -> { prevKey, edge, grantedAbilities, grantedFlags }

  while (queue.length) {
    const cur = queue.shift();
    if (cur.node === goalId) {
      // reconstruct path
      const path = [];
      let key = `${cur.node}|${cur.am}|${cur.fm}|${cur.ft}`;
      while (key) {
        const p = parent.get(key);
        if (!p) { path.unshift({ node: key.split('|')[0], viaEdge: null, grantedAbilities: abilityDelta(0, startAm), grantedFlags: flagDelta(0, startFm) }); break; }
        path.unshift({ node: key.split('|')[0], viaEdge: p.edge, grantedAbilities: p.grantedAbilities, grantedFlags: p.grantedFlags });
        key = p.prevKey;
      }
      return path;
    }
    const abilitiesSet = maskToSet(cur.am, ALL_ABILITIES);
    const flagsSet = maskToSet(cur.fm, ALL_FLAGS);
    const candidates = [];
    for (const e of byFrom.get(cur.node) || []) candidates.push({ to: e.to, edge: e });
    // Fast-travel warps: only once the fast-travel mechanic itself has been
    // unlocked (Sovereign's Observatory), only from a waypoint room, only to
    // another waypoint this path has already physically visited.
    if (flagsSet.has('fast_travel_unlocked') && ftIndex.has(cur.node)) {
      for (const otherId of ftList) {
        if (otherId === cur.node) continue;
        if (cur.ft & (1 << ftIndex.get(otherId))) candidates.push({ to: otherId, edge: WARP_EDGE });
      }
    }
    for (const { to, edge: e } of candidates) {
      if (!requirementSatisfied(e, abilitiesSet, flagsSet)) continue;
      const targetNode = nodes.get(to);
      if (!requirementSatisfied(targetNode, abilitiesSet, flagsSet)) continue;
      const [nam, nfm] = applyNodeGrants(to, cur.am, cur.fm, nodes);
      const nft = ftBit(to, cur.ft);
      const key = `${to}|${nam}|${nfm}|${nft}`;
      if (visited.has(key)) continue;
      visited.add(key);
      parent.set(key, { prevKey: `${cur.node}|${cur.am}|${cur.fm}|${cur.ft}`, edge: e, grantedAbilities: abilityDelta(cur.am, nam), grantedFlags: flagDelta(cur.fm, nfm) });
      queue.push({ node: to, am: nam, fm: nfm, ft: nft });
    }
  }
  return null; // unreachable
}

// Dijkstra over the same (room, abilities, flags, visited-fast-travel)
// state space as criticalPathSearch, but minimizing cumulative
// nodeWeight() instead of hop count — an estimate of the *fastest*
// mandatory route (what a speedrunner who skips every non-mandatory room
// would take), not just the one with the fewest rooms.
function speedrunPathSearch(graph, startId, goalId) {
  const { nodes, edges } = graph;
  const byFrom = new Map();
  for (const e of edges) {
    if (!byFrom.has(e.from)) byFrom.set(e.from, []);
    byFrom.get(e.from).push(e);
  }
  const { list: ftList, indexOf: ftIndex } = getFastTravelIndex(nodes);
  const ftBit = (nodeId, mask) => (ftIndex.has(nodeId) ? mask | (1 << ftIndex.get(nodeId)) : mask);

  const [startAm, startFm] = applyNodeGrants(startId, 0, 0, nodes);
  const startFt = ftBit(startId, 0);
  const startKey = `${startId}|${startAm}|${startFm}|${startFt}`;
  const dist = new Map([[startKey, nodeWeight(nodes.get(startId))]]);
  const parent = new Map();
  // Simple array-based priority queue — state space here is small
  // (rooms * 2^abilities * 2^waypoints), no need for a binary heap.
  let frontier = [{ key: startKey, node: startId, am: startAm, fm: startFm, ft: startFt, cost: dist.get(startKey) }];

  while (frontier.length) {
    frontier.sort((a, b) => a.cost - b.cost);
    const cur = frontier.shift();
    if (cur.cost > dist.get(cur.key)) continue; // stale entry
    if (cur.node === goalId) {
      const path = [];
      let key = cur.key;
      while (key) {
        const p = parent.get(key);
        if (!p) { path.unshift({ node: key.split('|')[0], viaEdge: null, cost: dist.get(key), grantedAbilities: abilityDelta(0, startAm), grantedFlags: flagDelta(0, startFm) }); break; }
        path.unshift({ node: key.split('|')[0], viaEdge: p.edge, cost: dist.get(key), grantedAbilities: p.grantedAbilities, grantedFlags: p.grantedFlags });
        key = p.prevKey;
      }
      return path;
    }
    const abilitiesSet = maskToSet(cur.am, ALL_ABILITIES);
    const flagsSet = maskToSet(cur.fm, ALL_FLAGS);
    const candidates = [];
    for (const e of byFrom.get(cur.node) || []) candidates.push({ to: e.to, edge: e, cost: null });
    if (flagsSet.has('fast_travel_unlocked') && ftIndex.has(cur.node)) {
      for (const otherId of ftList) {
        if (otherId === cur.node) continue;
        if (cur.ft & (1 << ftIndex.get(otherId))) candidates.push({ to: otherId, edge: WARP_EDGE, cost: TIME_WEIGHTS.fastTravelWarp });
      }
    }
    for (const { to, edge: e, cost: warpCost } of candidates) {
      if (!requirementSatisfied(e, abilitiesSet, flagsSet)) continue;
      const targetNode = nodes.get(to);
      if (!requirementSatisfied(targetNode, abilitiesSet, flagsSet)) continue;
      const [nam, nfm] = applyNodeGrants(to, cur.am, cur.fm, nodes);
      const nft = ftBit(to, cur.ft);
      const key = `${to}|${nam}|${nfm}|${nft}`;
      const newCost = cur.cost + (warpCost !== null ? warpCost : nodeWeight(targetNode));
      if (!dist.has(key) || newCost < dist.get(key)) {
        dist.set(key, newCost);
        parent.set(key, { prevKey: cur.key, edge: e, grantedAbilities: abilityDelta(cur.am, nam), grantedFlags: flagDelta(cur.fm, nfm) });
        frontier.push({ key, node: to, am: nam, fm: nfm, ft: nft, cost: newCost });
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------
// 5b. Mandatory-room analysis, soft-lock risk detection, route counting
// ---------------------------------------------------------------------

// A room is "mandatory" if removing it from the graph entirely makes the
// final boss unreachable — a much stronger (and only reliable) test than
// "does the shortest path happen to pass through it," since a shortest
// path can prefer a room that a longer alternate route bypasses entirely.
function computeMandatoryNodes(graph, startId, goalId) {
  const { nodes, edges } = graph;
  const mandatory = new Map(); // nodeId -> boolean
  for (const id of nodes.keys()) {
    if (id === startId || id === goalId) { mandatory.set(id, true); continue; }
    const trimmedEdges = edges.filter((e) => e.from !== id && e.to !== id);
    const { reached } = fixpointReachability({ nodes, edges: trimmedEdges }, startId);
    mandatory.set(id, !reached.has(goalId));
  }
  return mandatory;
}

// Soft-lock heuristic: for every connection that doesn't reverse (a true
// one-way door, or a scripted teleport with no way back the way you came),
// check whether the far side can still finish the game in the best case
// (arriving with every ability in the game already) and in the worst case
// (arriving with nothing at all, only what's obtainable onward from there).
//   - reachable even with nothing  -> safe, no risk
//   - unreachable even with everything -> definite trap
//   - in between -> depends on what you actually hold when you take it
function findSoftlockRisks(graph, startId, goalId) {
  const { nodes, edges } = graph;
  const hasReturn = (u, v) => edges.some((e2) => e2.from === v && e2.to === u);
  const oneWayConnections = edges.filter((e) => e.from !== e.to && !hasReturn(e.from, e.to));

  const allAbilities = new Set(ALL_ABILITIES);
  const allFlags = new Set(ALL_FLAGS);

  const risks = [];
  const seen = new Set();
  for (const e of oneWayConnections) {
    const key = `${e.from}->${e.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const bestCase = fixpointReachability(graph, e.to, allAbilities, allFlags);
    if (!bestCase.reached.has(goalId)) {
      risks.push({ from: e.from, to: e.to, label: e.label, severity: 'DEFINITE TRAP' });
      continue;
    }
    const worstCase = fixpointReachability(graph, e.to, new Set(), new Set());
    if (!worstCase.reached.has(goalId)) {
      risks.push({ from: e.from, to: e.to, label: e.label, severity: 'DEPENDS ON LOADOUT' });
    }
  }
  return risks;
}

// Counts distinct routes to victory as distinct paths through the
// (room, abilities, flags, fast-travel-visited) state graph — the same
// state space the path searches explore. This allows revisiting a room
// (common — backtracking for an ability is normal here) while still being
// a finite count, because a state can't be revisited once already visited
// (abilities/flags only ever grow, so re-entering a room in a genuinely
// new state is allowed, but looping forever in an unchanging state is
// not). Capped for performance on large state spaces; reports whether it
// hit the cap.
function countRoutesToGoal(graph, startId, goalId, cap) {
  const { nodes, edges } = graph;
  const byFrom = new Map();
  for (const e of edges) {
    if (!byFrom.has(e.from)) byFrom.set(e.from, []);
    byFrom.get(e.from).push(e);
  }
  const { list: ftList, indexOf: ftIndex } = getFastTravelIndex(nodes);
  const ftBit = (nodeId, mask) => (ftIndex.has(nodeId) ? mask | (1 << ftIndex.get(nodeId)) : mask);

  const memo = new Map(); // stateKey -> count (or null while in progress, unused here since DAG)
  let statesVisited = 0;
  let capped = false;

  function countFrom(nodeId, am, fm, ft) {
    if (nodeId === goalId) return 1n;
    const key = `${nodeId}|${am}|${fm}|${ft}`;
    if (memo.has(key)) return memo.get(key);
    if (statesVisited > cap) { capped = true; return 0n; }
    statesVisited++;
    memo.set(key, 0n); // guard against pathological cycles in state graph (shouldn't occur, abilities/flags monotonic)
    const abilitiesSet = maskToSet(am, ALL_ABILITIES);
    const flagsSet = maskToSet(fm, ALL_FLAGS);
    const candidates = [];
    for (const e of byFrom.get(nodeId) || []) candidates.push({ to: e.to, edge: e });
    if (flagsSet.has('fast_travel_unlocked') && ftIndex.has(nodeId)) {
      for (const otherId of ftList) {
        if (otherId === nodeId) continue;
        if (ft & (1 << ftIndex.get(otherId))) candidates.push({ to: otherId, edge: WARP_EDGE });
      }
    }
    let total = 0n;
    for (const { to, edge: e } of candidates) {
      if (!requirementSatisfied(e, abilitiesSet, flagsSet)) continue;
      const targetNode = nodes.get(to);
      if (!requirementSatisfied(targetNode, abilitiesSet, flagsSet)) continue;
      const [nam, nfm] = applyNodeGrants(to, am, fm, nodes);
      const nft = ftBit(to, ft);
      total += countFrom(to, nam, nfm, nft);
      if (capped) break;
    }
    memo.set(key, total);
    return total;
  }

  const [startAm, startFm] = applyNodeGrants(startId, 0, 0, nodes);
  const startFt = ftBit(startId, 0);
  const total = countFrom(startId, startAm, startFm, startFt);
  return { count: total, capped, statesVisited };
}

// ---------------------------------------------------------------------
// 5. Report rendering
// ---------------------------------------------------------------------

function tally(nodeIds, nodes) {
  const t = { fracturePips: 0, lorePips: 0, cosmeticUpgrades: 0, maxHealth: 0 };
  for (const id of nodeIds) {
    const n = nodes.get(id);
    t.fracturePips += n.fracturePips;
    t.lorePips += n.lorePips;
    t.cosmeticUpgrades += n.cosmeticUpgrades;
    t.maxHealth += n.maxHealth;
  }
  return t;
}

function printPath(path, nodes) {
  if (!path) {
    console.log('  No path found even though fixpoint says reachable — check requiresOr logic.');
    return;
  }
  let step = 1;
  for (const hop of path) {
    const n = nodes.get(hop.node);
    const via = hop.viaEdge && hop.viaEdge.label ? `  [via: ${hop.viaEdge.label}]` : '';
    const newGrants = hop.grantedAbilities || [];
    const newFlags = hop.grantedFlags || [];
    const grantNote = newGrants.length ? `  ==> grants ${newGrants.join(', ')}` : '';
    const flagNote = newFlags.length ? `  ==> sets flag ${newFlags.join(', ')}` : '';
    console.log(`  ${String(step).padStart(2)}. ${n.label}${via}${grantNote}${flagNote}`);
    step++;
  }
  const pathIds = path.map((h) => h.node);
  const pathTally = tally(pathIds, nodes);
  console.log('');
  console.log(`  Path length: ${path.length} rooms.`);
  console.log(`  Pips collected if a player takes exactly this path:`);
  console.log(`    Fracture pips:     ${pathTally.fracturePips}`);
  console.log(`    Lore pips:         ${pathTally.lorePips}`);
  console.log(`    Cosmetic upgrades: ${pathTally.cosmeticUpgrades}`);
  console.log(`    Max health ups:    ${pathTally.maxHealth}`);
}

function printReport(graph) {
  const { nodes, edges, warnings } = graph;
  const startId = findStart(nodes);
  const goalId = findFinalBoss(nodes);

  console.log('='.repeat(72));
  console.log('STILLPOINT — floor plan reachability & critical-path report');
  console.log('='.repeat(72));
  console.log(`Parsed ${nodes.size} rooms / ${edges.length} connections.`);
  console.log(`Start:  ${nodes.get(startId).label}  (${startId})`);
  console.log(`Goal:   ${nodes.get(goalId).label}  (${goalId})`);
  console.log('');

  const { reached, abilities, flags, grantSource } = fixpointReachability(graph, startId);

  console.log('-- Ability / flag acquisition (first room that unlocks each) --');
  for (const a of ALL_ABILITIES) {
    if (abilities.has(a)) {
      console.log(`  [x] ${a.padEnd(16)} <- ${nodes.get(grantSource[a]).label}`);
    } else {
      console.log(`  [ ] ${a.padEnd(16)} never granted anywhere reachable`);
    }
  }
  for (const f of ALL_FLAGS) {
    if (flags.has(f)) console.log(`  [x] flag:${f.padEnd(11)} <- ${nodes.get(grantSource[f]).label}`);
  }
  console.log('');

  console.log(`-- Reachability: ${reached.size}/${nodes.size} rooms reachable from Spawn --`);
  if (reached.has(goalId)) {
    console.log('  Final boss IS reachable. Good.');
  } else {
    console.log('  *** FINAL BOSS IS NOT REACHABLE — the game cannot be completed as graphed. ***');
  }
  const unreached = [...nodes.keys()].filter((id) => !reached.has(id));
  if (unreached.length) {
    console.log(`\n  Unreached rooms (${unreached.length}) — dead content, postgame-only, or a graph bug:`);
    for (const id of unreached) console.log(`    - ${nodes.get(id).label}`);
  }
  console.log('');

  console.log('-- Critical path A: fewest rooms (respecting ability order) --');
  const path = criticalPathSearch(graph, startId, goalId);
  printPath(path, nodes);
  console.log('');

  console.log('-- Critical path B: fastest / "speedrun" route (weighted by TIME_WEIGHTS) --');
  console.log('  (rough estimates only — see TIME_WEIGHTS at the top of this file to tune them)');
  const speedPath = speedrunPathSearch(graph, startId, goalId);
  printPath(speedPath, nodes);
  if (speedPath) {
    console.log(`  Estimated total: ${speedPath[speedPath.length - 1].cost} time units.`);
  }
  console.log('');

  const fullTally = tally(reached, nodes);
  console.log('-- Totals across everything reachable from Spawn --');
  console.log(`    Fracture pips:     ${fullTally.fracturePips}`);
  console.log(`    Lore pips:         ${fullTally.lorePips}`);
  console.log(`    Cosmetic upgrades: ${fullTally.cosmeticUpgrades}`);
  console.log(`    Max health ups:    ${fullTally.maxHealth}`);
  const minibosses = [...reached].filter((id) => nodes.get(id).miniboss);
  console.log(`    Minibosses on the way: ${minibosses.length}`);
  for (const id of minibosses) console.log(`      - ${nodes.get(id).label}`);
  console.log('');

  console.log('-- Mandatory rooms (removing this room alone makes the final boss unreachable) --');
  const mandatoryMap = computeMandatoryNodes(graph, startId, goalId);
  const mandatoryList = [...mandatoryMap.entries()].filter(([id, m]) => m && id !== startId && id !== goalId);
  console.log(`  ${mandatoryList.length} rooms (of ${nodes.size}) are mandatory:`);
  for (const [id] of mandatoryList) console.log(`    - ${nodes.get(id).label}`);
  console.log('');

  console.log('-- Soft-lock risk scan (one-way connections that might strand the player) --');
  const risks = findSoftlockRisks(graph, startId, goalId);
  if (!risks.length) {
    console.log('  None found: every one-way/scripted connection can still reach the final boss.');
  } else {
    for (const r of risks) {
      console.log(`  [${r.severity}] ${nodes.get(r.from).label}  ->  ${nodes.get(r.to).label}${r.label ? `  (${r.label})` : ''}`);
    }
    console.log('  DEFINITE TRAP = unreachable even with every ability in the game — a real bug.');
    console.log('  DEPENDS ON LOADOUT = fine in the best case, but could strand an underleveled player — check by hand.');
  }
  console.log('');

  console.log('-- How many ways are there to beat the game? --');
  const routeCount = countRoutesToGoal(graph, startId, goalId, 200000);
  if (routeCount.capped) {
    console.log(`  At least ${routeCount.count.toLocaleString()} distinct routes found (search capped after ${routeCount.statesVisited.toLocaleString()} states — the true count is higher).`);
  } else {
    console.log(`  ${routeCount.count.toLocaleString()} distinct routes from Spawn to the Final Boss.`);
  }
  console.log('  ("Distinct" = a different sequence of rooms/ability-pickups, including optional detours and backtracks — not just the mandatory skeleton.)');
  console.log('');

  console.log('-- What gates what (edges/rooms with an ability or flag requirement) --');
  for (const e of edges) {
    if (e.requires.length || e.requiresFlags.length || e.requiresOr.length) {
      console.log(`  ${nodes.get(e.from).label}  ->  ${nodes.get(e.to).label}`);
      if (e.requires.length) console.log(`      requires: ${e.requires.join(' AND ')}`);
      if (e.requiresOr.length) console.log(`      requires (any one group): ${e.requiresOr.map((g) => g.join('+')).join(' OR ')}`);
      if (e.requiresFlags.length) console.log(`      requires flag: ${e.requiresFlags.join(', ')}`);
    }
  }
  for (const n of nodes.values()) {
    if (n.requires.length || n.requiresFlags.length || n.requiresOr.length) {
      console.log(`  [room itself] ${n.label}`);
      if (n.requires.length) console.log(`      requires: ${n.requires.join(' AND ')}`);
      if (n.requiresOr.length) console.log(`      requires (any one group): ${n.requiresOr.map((g) => g.join('+')).join(' OR ')}`);
      if (n.requiresFlags.length) console.log(`      requires flag: ${n.requiresFlags.join(', ')}`);
    }
  }
  console.log('');

  if (warnings.length) {
    console.log(`-- Parser warnings (${warnings.length}) — text the parser couldn't classify --`);
    for (const w of warnings) console.log(`  ! ${w}`);
    console.log('');
  }
}

// ---------------------------------------------------------------------
// 5b. --html mode: a visual path/backtracking viewer
// ---------------------------------------------------------------------

function buildPathSteps(path, nodes) {
  if (!path) return null;
  const seen = new Set();
  let backtrackCount = 0;
  const steps = path.map((hop, i) => {
    const n = nodes.get(hop.node);
    const isRevisit = seen.has(hop.node);
    if (isRevisit) backtrackCount++;
    seen.add(hop.node);
    const newGrants = hop.grantedAbilities || [];
    const newFlags = hop.grantedFlags || [];
    return {
      index: i + 1,
      id: n.id,
      label: n.label,
      isRevisit,
      viaLabel: hop.viaEdge && hop.viaEdge.label ? hop.viaEdge.label : null,
      cost: hop.cost !== undefined ? hop.cost : null,
      miniboss: n.miniboss,
      finalBoss: n.finalBoss,
      fastTravel: n.fastTravelWaypoint,
      fracturePips: n.fracturePips,
      lorePips: n.lorePips,
      cosmeticUpgrades: n.cosmeticUpgrades,
      maxHealth: n.maxHealth,
      newGrants,
      newFlags,
    };
  });
  const uniqueRooms = new Set(path.map((h) => h.node)).size;
  return { steps, uniqueRooms, backtrackCount, totalRooms: path.length };
}

function findDivergenceIndex(pathA, pathB) {
  const n = Math.min(pathA.length, pathB.length);
  for (let i = 0; i < n; i++) {
    if (pathA[i].node !== pathB[i].node) return i;
  }
  return pathA.length === pathB.length ? -1 : n;
}

function generateHtmlReport(graph, startId, goalId, normalPath, speedPath) {
  const { nodes } = graph;
  const normalData = buildPathSteps(normalPath, nodes);
  const speedData = buildPathSteps(speedPath, nodes);
  const divergenceIndex = normalPath && speedPath ? findDivergenceIndex(normalPath, speedPath) : -1;
  const speedTotal = speedPath ? speedPath[speedPath.length - 1].cost : null;

  const mandatoryMap = computeMandatoryNodes(graph, startId, goalId);
  const mandatoryRooms = [...mandatoryMap.entries()]
    .filter(([id, m]) => m && id !== startId && id !== goalId)
    .map(([id]) => nodes.get(id).label);

  const softlockRisks = findSoftlockRisks(graph, startId, goalId).map((r) => ({
    from: nodes.get(r.from).label,
    to: nodes.get(r.to).label,
    label: r.label,
    severity: r.severity,
  }));

  const routeCount = countRoutesToGoal(graph, startId, goalId, 200000);

  const payload = {
    generatedNote: 'Regenerate with: node Plans/analyze_floor_plan.js --html',
    startLabel: nodes.get(startId).label,
    goalLabel: nodes.get(goalId).label,
    roomCount: nodes.size,
    normal: normalData,
    speed: speedData,
    speedTotal,
    divergenceIndex,
    timeWeights: TIME_WEIGHTS,
    mandatoryRooms,
    softlockRisks,
    routeCount: { count: routeCount.count.toString(), capped: routeCount.capped, statesVisited: routeCount.statesVisited },
  };

  const dataJson = JSON.stringify(payload).replace(/</g, '\\u003c');

  return `<style>
  :root {
    --bg: #0b0d14;
    --panel: #12141d;
    --panel-border: #262b3a;
    --text: #e7e9f2;
    --muted: #8890a6;
    --violet: #8a6bff;
    --teal: #2fe0c8;
    --amber: #f0b25a;
    --rose: #ef6a8f;
  }
  @media (prefers-color-scheme: light) {
    :root { --bg:#f4f5fa; --panel:#ffffff; --panel-border:#dcdfe8; --text:#1a1c26; --muted:#5c6178; }
  }
  :root[data-theme="light"] { --bg:#f4f5fa; --panel:#ffffff; --panel-border:#dcdfe8; --text:#1a1c26; --muted:#5c6178; }
  :root[data-theme="dark"] { --bg:#0b0d14; --panel:#12141d; --panel-border:#262b3a; --text:#e7e9f2; --muted:#8890a6; }
  * { box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 24px; }
  h1 { font-size: 1.3rem; margin: 0 0 4px; }
  .sub { color: var(--muted); font-size: 0.85rem; margin-bottom: 20px; }
  .stats { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
  .stat { background: var(--panel); border: 1px solid var(--panel-border); border-radius: 10px; padding: 10px 14px; min-width: 120px; }
  .stat .n { font-size: 1.3rem; font-weight: 700; color: var(--teal); }
  .stat .l { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  @media (max-width: 860px) { .columns { grid-template-columns: 1fr; } }
  .col h2 { font-size: 1rem; margin: 0 0 4px; }
  .col .col-sub { color: var(--muted); font-size: 0.78rem; margin-bottom: 12px; }
  .step { position: relative; background: var(--panel); border: 1px solid var(--panel-border); border-radius: 10px; padding: 10px 12px; margin-bottom: 4px; }
  .step.revisit { opacity: 0.6; border-style: dashed; }
  .step-head { display: flex; align-items: baseline; gap: 8px; }
  .step-num { color: var(--muted); font-size: 0.75rem; min-width: 22px; }
  .step-label { font-weight: 600; font-size: 0.92rem; }
  .badges { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
  .badge { font-size: 0.68rem; padding: 2px 7px; border-radius: 999px; border: 1px solid var(--panel-border); color: var(--muted); }
  .badge.miniboss { color: var(--rose); border-color: var(--rose); }
  .badge.final { color: var(--rose); border-color: var(--rose); font-weight: 700; }
  .badge.grant { color: var(--violet); border-color: var(--violet); }
  .badge.flag { color: var(--amber); border-color: var(--amber); }
  .via { font-size: 0.7rem; color: var(--muted); margin: 2px 0 2px 4px; padding-left: 10px; border-left: 2px solid var(--panel-border); }
  .revisit-tag { font-size: 0.68rem; color: var(--amber); margin-left: 6px; }
  .connector { height: 12px; width: 2px; background: var(--panel-border); margin: 0 0 0 20px; }
  .divergence { margin-top: 28px; background: var(--panel); border: 1px solid var(--panel-border); border-radius: 10px; padding: 14px 16px; }
  .divergence h2 { font-size: 1rem; margin: 0 0 6px; }
  .legend { margin-top: 20px; font-size: 0.75rem; color: var(--muted); }
  .checks { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  @media (max-width: 860px) { .checks { grid-template-columns: 1fr; } }
  .check-panel { background: var(--panel); border: 1px solid var(--panel-border); border-radius: 10px; padding: 14px 16px; }
  .check-panel h2 { font-size: 1rem; margin: 0 0 4px; }
  .check-panel .check-sub { color: var(--muted); font-size: 0.78rem; margin-bottom: 10px; }
  .check-panel ul { margin: 0; padding-left: 18px; font-size: 0.85rem; }
  .check-panel li { margin-bottom: 4px; }
  .risk-trap { color: var(--rose); font-weight: 700; }
  .risk-loadout { color: var(--amber); }
  .route-count { font-size: 1.6rem; font-weight: 700; color: var(--teal); margin: 4px 0; }
</style>
<h1>Stillpoint — Floor Plan Path Viewer</h1>
<div class="sub" id="subhead"></div>
<div class="stats" id="stats"></div>
<div class="columns">
  <div class="col">
    <h2>Normal player (fewest rooms)</h2>
    <div class="col-sub">Shortest ability-respecting route from Spawn to the Final Boss.</div>
    <div id="normalSteps"></div>
  </div>
  <div class="col">
    <h2>Speedrunner (fastest, weighted)</h2>
    <div class="col-sub" id="speedSub">Minimizes estimated time, not room count — see legend for the per-feature time guesses.</div>
    <div id="speedSteps"></div>
  </div>
</div>
<div class="divergence" id="divergence"></div>
<div class="legend">
  ⚔ miniboss · 🏆 final boss · ✨ ability unlock · 🚩 story flag · ◆ fracture pip · 📖 lore pip · 🎨 cosmetic upgrade · ❤ max health ·
  dashed/faded card = backtracking through a room already visited on this same path.
</div>
<div class="checks">
  <div class="check-panel">
    <h2>Mandatory rooms</h2>
    <div class="check-sub">Removing this room alone (any incoming/outgoing door) makes the Final Boss unreachable. This is a stronger test than "is it on the shortest path" — it proves no alternate route exists.</div>
    <div id="mandatoryList"></div>
  </div>
  <div class="check-panel">
    <h2>Soft-lock risk scan</h2>
    <div class="check-sub">Checks every one-way / scripted-teleport connection: can the far side still reach the Final Boss? <span class="risk-trap">DEFINITE TRAP</span> = unreachable even with every ability in the game, a real bug. <span class="risk-loadout">DEPENDS ON LOADOUT</span> = fine in the best case, worth a manual check for an underleveled player.</div>
    <div id="softlockList"></div>
  </div>
  <div class="check-panel" style="grid-column: 1 / -1;">
    <h2>How many ways to beat the game?</h2>
    <div class="check-sub">Counts distinct room/ability-pickup sequences from Spawn to the Final Boss, including optional detours and backtracks — not just the mandatory skeleton. A huge number mostly reflects how many optional side-rooms and orderings exist, not "meaningfully different strategies"; the mandatory-rooms list above is the more useful measure of the game's actual shape.</div>
    <div class="route-count" id="routeCount"></div>
  </div>
</div>
<script>
const DATA = ${dataJson};

function badge(cls, text) {
  const span = document.createElement('span');
  span.className = 'badge ' + cls;
  span.textContent = text;
  return span;
}

function renderSteps(container, pathData) {
  container.innerHTML = '';
  if (!pathData) {
    container.textContent = 'No path found.';
    return;
  }
  pathData.steps.forEach((s, i) => {
    if (i > 0) {
      const c = document.createElement('div');
      c.className = 'connector';
      container.appendChild(c);
    }
    if (s.viaLabel) {
      const via = document.createElement('div');
      via.className = 'via';
      via.textContent = 'via: ' + s.viaLabel;
      container.appendChild(via);
    }
    const card = document.createElement('div');
    card.className = 'step' + (s.isRevisit ? ' revisit' : '');
    const head = document.createElement('div');
    head.className = 'step-head';
    const num = document.createElement('span');
    num.className = 'step-num';
    num.textContent = s.index + '.';
    const label = document.createElement('span');
    label.className = 'step-label';
    label.textContent = s.label;
    head.appendChild(num);
    head.appendChild(label);
    if (s.isRevisit) {
      const tag = document.createElement('span');
      tag.className = 'revisit-tag';
      tag.textContent = '↩ backtrack';
      head.appendChild(tag);
    }
    card.appendChild(head);
    const badges = document.createElement('div');
    badges.className = 'badges';
    if (s.miniboss) badges.appendChild(badge('miniboss', '⚔ miniboss'));
    if (s.finalBoss) badges.appendChild(badge('final', '🏆 final boss'));
    if (s.fastTravel) badges.appendChild(badge('', '⇄ fast travel'));
    s.newGrants.forEach((a) => badges.appendChild(badge('grant', '✨ ' + a)));
    s.newFlags.forEach((f) => badges.appendChild(badge('flag', '🚩 ' + f)));
    if (s.fracturePips) badges.appendChild(badge('', '◆ fracture x' + s.fracturePips));
    if (s.lorePips) badges.appendChild(badge('', '📖 lore x' + s.lorePips));
    if (s.cosmeticUpgrades) badges.appendChild(badge('', '🎨 cosmetic x' + s.cosmeticUpgrades));
    if (s.maxHealth) badges.appendChild(badge('', '❤ max hp x' + s.maxHealth));
    if (badges.children.length) card.appendChild(badges);
    container.appendChild(card);
  });
}

function renderStats() {
  const statsEl = document.getElementById('stats');
  const items = [
    [DATA.normal ? DATA.normal.totalRooms : '-', 'normal: rooms visited'],
    [DATA.normal ? DATA.normal.backtrackCount : '-', 'normal: backtrack steps'],
    [DATA.speed ? DATA.speed.totalRooms : '-', 'speedrun: rooms visited'],
    [DATA.speed ? DATA.speed.backtrackCount : '-', 'speedrun: backtrack steps'],
    [DATA.speedTotal !== null ? Math.round(DATA.speedTotal * 10) / 10 : '-', 'speedrun: est. minutes'],
  ];
  items.forEach(([n, l]) => {
    const el = document.createElement('div');
    el.className = 'stat';
    const nEl = document.createElement('div'); nEl.className = 'n'; nEl.textContent = n;
    const lEl = document.createElement('div'); lEl.className = 'l'; lEl.textContent = l;
    el.appendChild(nEl); el.appendChild(lEl);
    statsEl.appendChild(el);
  });
}

function renderDivergence() {
  const el = document.getElementById('divergence');
  if (!DATA.normal || !DATA.speed) { el.style.display = 'none'; return; }
  const h = document.createElement('h2');
  h.textContent = 'Where the two routes differ';
  el.appendChild(h);
  const p = document.createElement('div');
  if (DATA.divergenceIndex === -1) {
    p.textContent = 'The normal and speedrun routes are identical — there is currently no meaningfully faster alternative route through the game.';
  } else {
    const roomAtSplit = DATA.normal.steps[DATA.divergenceIndex] ? DATA.normal.steps[DATA.divergenceIndex - 1] : null;
    p.textContent = 'Both routes match through step ' + DATA.divergenceIndex + (roomAtSplit ? (' (' + roomAtSplit.label + ')') : '') + ', then diverge: the normal route heads to "' + (DATA.normal.steps[DATA.divergenceIndex] ? DATA.normal.steps[DATA.divergenceIndex].label : '?') + '" while the speedrun route heads to "' + (DATA.speed.steps[DATA.divergenceIndex] ? DATA.speed.steps[DATA.divergenceIndex].label : '?') + '" — see the two columns above from that point on.';
  }
  el.appendChild(p);
}

function renderMandatoryList() {
  const el = document.getElementById('mandatoryList');
  const p = document.createElement('div');
  p.style.marginBottom = '8px';
  p.textContent = DATA.mandatoryRooms.length + ' of ' + DATA.roomCount + ' rooms are mandatory:';
  el.appendChild(p);
  const ul = document.createElement('ul');
  DATA.mandatoryRooms.forEach((label) => {
    const li = document.createElement('li');
    li.textContent = label;
    ul.appendChild(li);
  });
  el.appendChild(ul);
}

function renderSoftlockList() {
  const el = document.getElementById('softlockList');
  if (!DATA.softlockRisks.length) {
    el.textContent = 'None found: every one-way/scripted connection can still reach the Final Boss.';
    return;
  }
  const ul = document.createElement('ul');
  DATA.softlockRisks.forEach((r) => {
    const li = document.createElement('li');
    const sev = document.createElement('span');
    sev.className = r.severity === 'DEFINITE TRAP' ? 'risk-trap' : 'risk-loadout';
    sev.textContent = '[' + r.severity + '] ';
    li.appendChild(sev);
    li.appendChild(document.createTextNode(r.from + ' → ' + r.to + (r.label ? ' (' + r.label + ')' : '')));
    ul.appendChild(li);
  });
  el.appendChild(ul);
}

function renderRouteCount() {
  const el = document.getElementById('routeCount');
  // DATA.routeCount.count arrives as a digit string (can exceed Number
  // precision), so comma-group it manually rather than via toLocaleString.
  const n = DATA.routeCount.count.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  el.textContent = (DATA.routeCount.capped ? 'At least ' + n + ' (search capped)' : n) + ' distinct routes';
}

document.getElementById('subhead').textContent =
  DATA.startLabel + ' → ' + DATA.goalLabel + '  ·  ' + DATA.roomCount + ' rooms in the full graph  ·  ' + DATA.generatedNote;
renderStats();
renderSteps(document.getElementById('normalSteps'), DATA.normal);
renderSteps(document.getElementById('speedSteps'), DATA.speed);
renderDivergence();
renderMandatoryList();
renderSoftlockList();
renderRouteCount();
</script>`;
}

// ---------------------------------------------------------------------
// 6. --diff mode: cross-check floor_plan.md text against the SVG + txt
// ---------------------------------------------------------------------

function factsFromMermaidGraph(graph) {
  const facts = new Set();
  for (const n of graph.nodes.values()) {
    for (const seg of n.label.split(/(?= )/).length ? [n.label] : [n.label]) {
      // split on parentheticals AND the plain title, matching how the SVG
      // exports one <text> per visual line
      splitSegments(n.label).forEach((s) => facts.add(s.toLowerCase().trim()));
      facts.add(n.label.replace(/\(.*?\)/g, '').trim().toLowerCase());
    }
  }
  for (const e of graph.edges) {
    if (e.label) facts.add(e.label.toLowerCase().trim());
  }
  facts.delete('');
  return facts;
}

function factsFromSvg(svgPath) {
  const content = fs.readFileSync(svgPath, 'utf8');
  const texts = [...content.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1]);
  const facts = new Set();
  for (const t of texts) {
    const clean = t
      .replace(/<[^>]+>/g, ' ')
      .replace(/[“”]/g, '"')
      .replace(/[’]/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    if (clean) facts.add(clean);
  }
  return facts;
}

function runDiff() {
  const mdText = fs.readFileSync(MD_PATH, 'utf8');
  const mdGraph = buildGraph(extractMermaidBlock(mdText));
  const mdFacts = factsFromMermaidGraph(mdGraph);

  console.log('='.repeat(72));
  console.log('DIFF: floor_plan.md (canonical) vs floor_plan.svg (visual board export)');
  console.log('='.repeat(72));

  if (fs.existsSync(SVG_PATH)) {
    const svgFacts = factsFromSvg(SVG_PATH);
    const onlyInMd = [...mdFacts].filter((f) => !svgFacts.has(f)).sort();
    const onlyInSvg = [...svgFacts].filter((f) => !mdFacts.has(f)).sort();
    console.log(`\nPhrases in floor_plan.md but not found in floor_plan.svg (${onlyInMd.length}):`);
    onlyInMd.forEach((f) => console.log(`  + ${f}`));
    console.log(`\nPhrases in floor_plan.svg but not found in floor_plan.md (${onlyInSvg.length}):`);
    onlyInSvg.forEach((f) => console.log(`  - ${f}`));
  } else {
    console.log('\n(floor_plan.svg not found, skipping)');
  }

  if (fs.existsSync(TXT_PATH)) {
    const txtText = fs.readFileSync(TXT_PATH, 'utf8');
    const txtGraph = buildGraph(extractMermaidBlock(txtText));
    const txtFacts = factsFromMermaidGraph(txtGraph);
    const onlyInMd = [...mdFacts].filter((f) => !txtFacts.has(f)).sort();
    const onlyInTxt = [...txtFacts].filter((f) => !mdFacts.has(f)).sort();
    console.log('\n' + '='.repeat(72));
    console.log('DIFF: floor_plan.md (canonical) vs floor_plan_mermaid.txt (raw export text)');
    console.log('='.repeat(72));
    console.log(`\nPhrases in floor_plan.md but not in floor_plan_mermaid.txt (${onlyInMd.length}):`);
    onlyInMd.forEach((f) => console.log(`  + ${f}`));
    console.log(`\nPhrases in floor_plan_mermaid.txt but not in floor_plan.md (${onlyInTxt.length}):`);
    onlyInTxt.forEach((f) => console.log(`  - ${f}`));
  } else {
    console.log('\n(floor_plan_mermaid.txt not found, skipping)');
  }
}

// ---------------------------------------------------------------------
// main
// ---------------------------------------------------------------------

function getArgValue(args, flag) {
  const i = args.indexOf(flag);
  if (i === -1) return null;
  const v = args[i + 1];
  return v && !v.startsWith('--') ? v : null;
}

function printSimulationReport(sim, runs) {
  console.log('='.repeat(72));
  console.log('STILLPOINT — random-playthrough simulation');
  console.log('='.repeat(72));
  console.log(`(difficulty config: ${fs.existsSync(DIFFICULTY_PATH) ? path.relative(process.cwd(), DIFFICULTY_PATH) : 'none found — every room defaulted to difficulty 1. Create Plans/floor_plan_difficulty.json to customize.'})`);
  console.log('');
  runs.forEach((sim, i) => {
    console.log(`-- Run ${i + 1} ${sim.reachedGoal ? '(reached the Final Boss)' : '(DID NOT FINISH — hit the step cap, likely stuck in a loop)'} --`);
    let step = 1;
    for (const s of sim.log) {
      const tag = s.isRevisit ? `  [revisit #${s.visitNumber}]` : '';
      const via = s.via ? `  [via: ${s.via}]` : '';
      const retryNote = s.retries ? `  (${s.retries} retr${s.retries === 1 ? 'y' : 'ies'}, difficulty x${s.difficulty})` : '';
      const noteText = s.note ? `  -- ${s.note}` : '';
      console.log(`  ${String(step).padStart(3)}. ${s.label}${tag}${via}${retryNote}${noteText}`);
      step++;
    }
    console.log('');
    console.log(`  Rooms visited (with revisits): ${sim.totalVisits}   Unique rooms: ${sim.uniqueRooms}   Backtrack steps: ${sim.backtrackSteps}   Retries: ${sim.totalRetries}`);
    console.log(`  Estimated total time: ${Math.round(sim.totalTime * 10) / 10} time units (see TIME_WEIGHTS + floor_plan_difficulty.json).`);
    console.log('');
  });
}

// Serializes just what the client-side simulator needs to re-run the walk
// entirely in the browser (see the embedded <script> below) — so
// "Run another simulation" doesn't require re-invoking Node/re-running the
// CLI (which needs shell permission the user may not have granted).
function serializeGraphForClient(graph, startId, goalId, difficultyConfig) {
  return {
    startId,
    goalId,
    allAbilities: ALL_ABILITIES,
    allFlags: ALL_FLAGS,
    timeWeights: TIME_WEIGHTS,
    difficultyConfig,
    endgameRush: findEndgameRush(graph),
    nodes: [...graph.nodes.values()].map((n) => ({
      id: n.id, label: n.label, fracturePips: n.fracturePips, lorePips: n.lorePips,
      cosmeticUpgrades: n.cosmeticUpgrades, maxHealth: n.maxHealth, miniboss: n.miniboss,
      finalBoss: n.finalBoss, fastTravelWaypoint: n.fastTravelWaypoint, grants: n.grants,
      grantsFlags: n.grantsFlags, conditionalGrants: n.conditionalGrants, requires: n.requires,
      requiresOr: n.requiresOr, requiresFlags: n.requiresFlags,
      requiresFracturePips: n.requiresFracturePips, requiresLorePips: n.requiresLorePips,
    })),
    edges: graph.edges.map((e) => ({
      from: e.from, to: e.to, label: e.label, requires: e.requires,
      requiresOr: e.requiresOr, requiresFlags: e.requiresFlags,
    })),
  };
}

function buildSimulationHtml(runs, graph, startId, goalId, difficultyConfig) {
  const payload = { runs: runs.map((s) => ({ ...s, log: s.log })) };
  const dataJson = JSON.stringify(payload).replace(/</g, '\\u003c');
  const graphJson = JSON.stringify(serializeGraphForClient(graph, startId, goalId, difficultyConfig)).replace(/</g, '\\u003c');
  return `<style>
  :root { --bg:#0b0d14; --panel:#12141d; --panel-border:#262b3a; --text:#e7e9f2; --muted:#8890a6; --teal:#2fe0c8; --amber:#f0b25a; --rose:#ef6a8f; --violet:#8a6bff; }
  @media (prefers-color-scheme: light) { :root { --bg:#f4f5fa; --panel:#fff; --panel-border:#dcdfe8; --text:#1a1c26; --muted:#5c6178; } }
  :root[data-theme="light"] { --bg:#f4f5fa; --panel:#fff; --panel-border:#dcdfe8; --text:#1a1c26; --muted:#5c6178; }
  :root[data-theme="dark"] { --bg:#0b0d14; --panel:#12141d; --panel-border:#262b3a; --text:#e7e9f2; --muted:#8890a6; }
  * { box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 24px; }
  h1 { font-size: 1.3rem; margin: 0 0 4px; }
  .sub { color: var(--muted); font-size: 0.85rem; margin-bottom: 14px; }
  .toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
  button { background: var(--violet); color: #fff; border: none; border-radius: 8px; padding: 9px 16px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
  button:hover { opacity: 0.9; }
  button:disabled { opacity: 0.5; cursor: default; }
  button.secondary { background: transparent; border: 1px solid var(--panel-border); color: var(--text); }
  .toolbar label { font-size: 0.8rem; color: var(--muted); display: flex; align-items: center; gap: 6px; }
  .toolbar input[type=number] { width: 60px; background: var(--panel); border: 1px solid var(--panel-border); color: var(--text); border-radius: 6px; padding: 5px 6px; }
  .run { background: var(--panel); border: 1px solid var(--panel-border); border-radius: 10px; padding: 14px 16px; margin-bottom: 20px; }
  .run h2 { font-size: 1rem; margin: 0 0 4px; display: flex; align-items: center; gap: 8px; }
  .run .fail { color: var(--rose); }
  .run .new-tag { font-size: 0.65rem; color: var(--teal); border: 1px solid var(--teal); border-radius: 999px; padding: 1px 8px; }
  .stats { display: flex; flex-wrap: wrap; gap: 10px; margin: 8px 0 14px; }
  .stat { background: var(--bg); border: 1px solid var(--panel-border); border-radius: 8px; padding: 8px 12px; }
  .stat .n { font-size: 1.1rem; font-weight: 700; color: var(--teal); }
  .stat .l { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em; }
  .step { display: flex; align-items: baseline; gap: 8px; padding: 4px 0; border-bottom: 1px dashed var(--panel-border); font-size: 0.85rem; }
  .step.revisit { opacity: 0.65; }
  .step .n { color: var(--muted); min-width: 30px; font-size: 0.75rem; }
  .step .via { color: var(--muted); font-size: 0.72rem; }
  .step .note { color: var(--amber); font-size: 0.72rem; }
  .step .retry { color: var(--rose); font-size: 0.72rem; }
  details.run > summary { cursor: pointer; }
  .summary { background: var(--panel); border: 1px solid var(--panel-border); border-radius: 10px; padding: 14px 16px; margin-bottom: 20px; }
  .summary h2 { font-size: 1rem; margin: 0 0 10px; }
  .summary .split { display: flex; gap: 24px; flex-wrap: wrap; }
  .summary .pct { font-size: 1.6rem; font-weight: 700; }
  .summary .pct.finish { color: var(--teal); }
  .summary .pct.fail { color: var(--rose); }
  .summary .pct-label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em; }
</style>
<h1>Stillpoint — random playthrough simulation</h1>
<div class="sub" id="subhead"></div>
<div class="toolbar">
  <button id="runBtn">🎲 Run another simulation</button>
  <label>seed <input type="number" id="seedInput" placeholder="random"></label>
  <label>walk style <select id="modeSelect">
    <option value="explore">Thorough explorer (wanders, backtracks for fun)</option>
    <option value="direct">Direct (only backtracks when actually stuck)</option>
  </select></label>
  <button id="batchBtn">📊 Run 100 &amp; show stats</button>
  <button class="secondary" id="clearBtn">Clear runs</button>
</div>
<div id="batchSummary"></div>
<div id="runs"></div>
<script>
const DATA = ${dataJson};
const GRAPH = ${graphJson};

// ---- ported simulation engine (mirrors analyze_floor_plan.js server-side) ----
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
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
function weightedPick(candidates, rng) {
  const total = candidates.reduce((s, c) => s + c.weight, 0);
  let r = rng() * total;
  for (const c of candidates) { r -= c.weight; if (r <= 0) return c; }
  return candidates[candidates.length - 1];
}
function requirementSatisfied(thing, abilities, flags) {
  for (const a of thing.requires) if (!abilities.has(a)) return false;
  for (const f of thing.requiresFlags) if (!flags.has(f)) return false;
  if (thing.requiresOr && thing.requiresOr.length) {
    for (const group of thing.requiresOr) if (group.every((a) => abilities.has(a))) return true;
    return false;
  }
  return true;
}
function applyNodeGrants(nodeId, am, fm, nodesById) {
  const n = nodesById.get(nodeId);
  for (const a of n.grants) am |= (1 << GRAPH.allAbilities.indexOf(a));
  for (const f of n.grantsFlags) fm |= (1 << GRAPH.allFlags.indexOf(f));
  for (const cg of n.conditionalGrants) {
    const condMask = cg.conditionOn.reduce((m, a) => m | (1 << GRAPH.allAbilities.indexOf(a)), 0);
    if ((am & condMask) === condMask) am |= (1 << GRAPH.allAbilities.indexOf(cg.ability));
  }
  return [am, fm];
}
function maskToSet(mask, list) { const s = new Set(); list.forEach((x, i) => { if (mask & (1 << i)) s.add(x); }); return s; }
function nodeWeight(n) {
  const tw = GRAPH.timeWeights;
  let w = tw.baseRoom;
  if (n.miniboss) w += tw.miniboss;
  if (n.finalBoss) w += tw.finalBoss;
  w += n.fracturePips * tw.fracturePip;
  w += n.lorePips * tw.lorePip;
  w += n.cosmeticUpgrades * tw.cosmeticUpgrade;
  w += n.maxHealth * tw.maxHealth;
  if (n.grants.length) w += tw.abilityGrant;
  return w;
}
function difficultyMultiplier(node) {
  const config = GRAPH.difficultyConfig;
  const label = node.label.toLowerCase();
  for (const key of Object.keys(config.rooms)) if (key.toLowerCase() === label) return config.rooms[key];
  let best = null, bestLen = -1;
  for (const key of Object.keys(config.rooms)) {
    const k = key.toLowerCase();
    if (k === 'miniboss' || k === 'finalboss') continue;
    if (label.includes(k) && k.length > bestLen) { best = config.rooms[key]; bestLen = k.length; }
  }
  if (best !== null) return best;
  if (node.miniboss && config.rooms.miniboss !== undefined) return config.rooms.miniboss;
  if (node.finalBoss && config.rooms.finalBoss !== undefined) return config.rooms.finalBoss;
  return config.default;
}
function getFastTravelIndex(nodesById) {
  const list = [...nodesById.values()].filter((n) => n.fastTravelWaypoint).map((n) => n.id);
  const indexOf = new Map(list.map((id, i) => [id, i]));
  return { list, indexOf };
}
function runSimulation(seed, mode) {
  const nodesById = new Map(GRAPH.nodes.map((n) => [n.id, n]));
  const byFrom = new Map();
  for (const e of GRAPH.edges) { if (!byFrom.has(e.from)) byFrom.set(e.from, []); byFrom.get(e.from).push(e); }
  const { list: ftList, indexOf: ftIndex } = getFastTravelIndex(nodesById);
  const ftBit = (nodeId, mask) => (ftIndex.has(nodeId) ? mask | (1 << ftIndex.get(nodeId)) : mask);
  const WARP_EDGE = { label: 'fast travel warp', requires: [], requiresOr: [], requiresFlags: [] };
  const rng = mulberry32(seed);
  const backtrackChance = mode === 'direct' ? 0 : 0.12, maxSteps = 500;

  let [am, fm] = applyNodeGrants(GRAPH.startId, 0, 0, nodesById);
  let ft = ftBit(GRAPH.startId, 0);
  let cur = GRAPH.startId;
  const visitCounts = new Map([[GRAPH.startId, 1]]);
  const history = [GRAPH.startId];
  const log = [];
  let totalTime = 0, totalRetries = 0;
  let heldFracturePips = nodesById.get(GRAPH.startId).fracturePips;
  let heldLorePips = nodesById.get(GRAPH.startId).lorePips;

  const logStep = (nodeId, viaLabel, note) => {
    const n = nodesById.get(nodeId);
    const mult = difficultyMultiplier(n);
    let retries = 0;
    if (mult > 1) {
      let p = Math.min(0.85, (mult - 1) / mult + 0.05);
      while (rng() < p && retries < 6) { retries++; p *= 0.6; }
    }
    const cost = nodeWeight(n) * mult + retries * nodeWeight(n) * 0.5 * mult;
    totalTime += cost; totalRetries += retries;
    log.push({ node: nodeId, label: n.label, via: viaLabel || null, isRevisit: (visitCounts.get(nodeId) || 0) > 1,
      visitNumber: visitCounts.get(nodeId) || 1, difficulty: mult, retries, cost, note: note || null,
      miniboss: n.miniboss, finalBoss: n.finalBoss, fastTravel: n.fastTravelWaypoint });
  };
  logStep(GRAPH.startId, null);

  for (let step = 0; step < maxSteps && cur !== GRAPH.goalId; step++) {
    const abilitiesSet = maskToSet(am, GRAPH.allAbilities);
    const flagsSet = maskToSet(fm, GRAPH.allFlags);
    const candidates = [];
    for (const e of byFrom.get(cur) || []) {
      if (!requirementSatisfied(e, abilitiesSet, flagsSet)) continue;
      const targetNode = nodesById.get(e.to);
      if (!requirementSatisfied(targetNode, abilitiesSet, flagsSet)) continue;
      if (targetNode.requiresFracturePips && heldFracturePips < targetNode.requiresFracturePips) continue;
      if (targetNode.requiresLorePips && heldLorePips < targetNode.requiresLorePips) continue;
      candidates.push({ to: e.to, edge: e });
    }
    if (flagsSet.has('fast_travel_unlocked') && ftIndex.has(cur)) {
      for (const otherId of ftList) {
        if (otherId === cur) continue;
        if (ft & (1 << ftIndex.get(otherId))) candidates.push({ to: otherId, edge: WARP_EDGE });
      }
    }

    let choice = null;
    if (GRAPH.endgameRush && cur === GRAPH.endgameRush.antechamberId && (visitCounts.get(cur) || 0) > 1 && abilitiesSet.has('phase_dash')) {
      const rush = candidates.find((c) => c.to === GRAPH.endgameRush.rushTargetId);
      if (rush) choice = rush;
    }
    const canDeliberateBacktrack = !choice && history.length > 1 && rng() < backtrackChance;
    if (choice) {
      // handled above — fall through to the apply-move step below
    } else if (!candidates.length) {
      let backTo = null;
      for (let i = history.length - 2; i >= 0; i--) {
        const candId = history[i];
        const hasOption = (byFrom.get(candId) || []).some((e2) => {
          if (e2.to === cur) return false;
          if (!requirementSatisfied(e2, abilitiesSet, flagsSet)) return false;
          return requirementSatisfied(nodesById.get(e2.to), abilitiesSet, flagsSet);
        });
        if (hasOption) { backTo = candId; break; }
      }
      if (backTo === null) break;
      choice = { to: backTo, edge: null, forcedBacktrack: true };
    } else if (canDeliberateBacktrack) {
      const backIdx = Math.max(0, history.length - 2 - Math.floor(rng() * Math.min(3, history.length - 1)));
      choice = { to: history[backIdx], edge: null, forcedBacktrack: false };
    } else {
      // Oscillation escape: a small pocket (e.g. two rooms connected only
      // to each other, the rest of the world locked behind a missing
      // ability) has no legal move that's fresh or leads to fresh
      // territory. Rather than coin-flip the same two doors forever,
      // search the whole history for the nearest room with a currently-
      // legal move into unvisited territory and jump straight there.
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
        choice = { to: escapedTo, edge: null, forcedBacktrack: true, note: 'stuck bouncing with no new options nearby — backtracking further to find one' };
      } else {
        const weighted = candidates.map((c) => {
          const n = nodesById.get(c.to);
          const visits = visitCounts.get(c.to) || 0;
          let curiosity;
          if (visits === 0) curiosity = 8;
          else {
            const leadsSomewhereNew = (byFrom.get(c.to) || []).some((e2) => !visitCounts.has(e2.to));
            const unexploredNearby = unexploredReach(c.to, byFrom, nodesById, visitCounts, abilitiesSet, flagsSet, 3);
            // Diminishing returns on revisits — see the server-side engine's
            // matching comment (a hub node was scoring the same full bonus
            // forever, causing dozens of redundant passes through it).
            curiosity = ((leadsSomewhereNew ? 3 : 1) + Math.min(unexploredNearby, 4) * 0.5) / Math.min(visits, 5);
          }
          const mult = difficultyMultiplier(n);
          const wariness = mult > 1 ? 1 / mult : 1;
          return { ...c, weight: Math.max(0.05, curiosity * wariness) };
        });
        choice = weightedPick(weighted, rng);
      }
    }

    const viaLabel = choice.edge && choice.edge.label ? choice.edge.label : null;
    if (choice.to !== cur) {
      [am, fm] = applyNodeGrants(choice.to, am, fm, nodesById);
      ft = ftBit(choice.to, ft);
      cur = choice.to;
      const isFirstVisit = !visitCounts.has(cur);
      visitCounts.set(cur, (visitCounts.get(cur) || 0) + 1);
      if (isFirstVisit) {
        heldFracturePips += nodesById.get(cur).fracturePips;
        heldLorePips += nodesById.get(cur).lorePips;
      }
      history.push(cur);
      logStep(cur, viaLabel, choice.note || (choice.forcedBacktrack ? 'dead end — forced backtrack' : null));
    }
  }

  return { log, totalTime, totalRetries, reachedGoal: cur === GRAPH.goalId,
    uniqueRooms: visitCounts.size, totalVisits: log.length,
    backtrackSteps: log.filter((s) => s.isRevisit).length };
}
// ---- end ported engine ----

function stat(n, l) {
  const d = document.createElement('div'); d.className = 'stat';
  const nEl = document.createElement('div'); nEl.className = 'n'; nEl.textContent = n;
  const lEl = document.createElement('div'); lEl.className = 'l'; lEl.textContent = l;
  d.appendChild(nEl); d.appendChild(lEl); return d;
}
function renderRun(run, label, isNew) {
  const box = document.createElement('div'); box.className = 'run';
  const h = document.createElement('h2');
  const titleSpan = document.createElement('span');
  titleSpan.textContent = label + (run.reachedGoal ? '' : ' — did not finish');
  if (!run.reachedGoal) titleSpan.classList.add('fail');
  h.appendChild(titleSpan);
  if (isNew) { const tag = document.createElement('span'); tag.className = 'new-tag'; tag.textContent = 'new'; h.appendChild(tag); }
  box.appendChild(h);
  const stats = document.createElement('div'); stats.className = 'stats';
  stats.appendChild(stat(run.totalVisits, 'rooms visited'));
  stats.appendChild(stat(run.uniqueRooms, 'unique rooms'));
  stats.appendChild(stat(run.backtrackSteps, 'backtrack steps'));
  stats.appendChild(stat(run.totalRetries, 'retries'));
  stats.appendChild(stat(Math.round(run.totalTime * 10) / 10, 'est. time units'));
  box.appendChild(stats);
  run.log.forEach((s, idx) => {
    const row = document.createElement('div'); row.className = 'step' + (s.isRevisit ? ' revisit' : '');
    const n = document.createElement('span'); n.className = 'n'; n.textContent = (idx + 1) + '.';
    const lbl = document.createElement('span'); lbl.textContent = s.label + (s.isRevisit ? ' (revisit #' + s.visitNumber + ')' : '');
    row.appendChild(n); row.appendChild(lbl);
    if (s.via) { const v = document.createElement('span'); v.className = 'via'; v.textContent = 'via: ' + s.via; row.appendChild(v); }
    if (s.retries) { const r = document.createElement('span'); r.className = 'retry'; r.textContent = s.retries + ' retries (x' + s.difficulty + ')'; row.appendChild(r); }
    if (s.note) { const nt = document.createElement('span'); nt.className = 'note'; nt.textContent = s.note; row.appendChild(nt); }
    box.appendChild(row);
  });
  return box;
}

const runsEl = document.getElementById('runs');
let runCounter = 0;
DATA.runs.forEach((run) => { runCounter++; runsEl.appendChild(renderRun(run, 'Run ' + runCounter, false)); });

document.getElementById('runBtn').addEventListener('click', () => {
  const seedField = document.getElementById('seedInput');
  const seed = seedField.value ? parseInt(seedField.value, 10) : (Date.now() & 0xffffffff);
  const mode = document.getElementById('modeSelect').value;
  const run = runSimulation(seed, mode);
  runCounter++;
  runsEl.insertBefore(renderRun(run, 'Run ' + runCounter + ' (seed ' + seed + ')', true), runsEl.firstChild);
});
document.getElementById('clearBtn').addEventListener('click', () => { runsEl.innerHTML = ''; runCounter = 0; document.getElementById('batchSummary').innerHTML = ''; });

document.getElementById('batchBtn').addEventListener('click', () => {
  const btn = document.getElementById('batchBtn');
  btn.disabled = true; btn.textContent = 'Running 100...';
  // Runs are cheap (a few ms each) but 100 back-to-back can still jank a
  // frame — defer to let the "Running..." label paint first.
  setTimeout(() => {
    const N = 100;
    const mode = document.getElementById('modeSelect').value;
    const results = [];
    for (let i = 0; i < N; i++) results.push(runSimulation((Date.now() & 0xffffffff) + i * 7919, mode));
    const finished = results.filter((r) => r.reachedGoal);
    const failed = results.filter((r) => !r.reachedGoal);
    const avg = (arr, key) => arr.length ? Math.round((arr.reduce((s, r) => s + r[key], 0) / arr.length) * 10) / 10 : 0;

    const el = document.getElementById('batchSummary');
    el.innerHTML = '';
    const box = document.createElement('div'); box.className = 'summary';
    const h = document.createElement('h2'); h.textContent = 'Batch of ' + N + ' random playthroughs';
    box.appendChild(h);
    const split = document.createElement('div'); split.className = 'split';
    const mk = (pct, label, cls) => {
      const d = document.createElement('div');
      const p = document.createElement('div'); p.className = 'pct' + (cls ? ' ' + cls : ''); p.textContent = pct;
      const l = document.createElement('div'); l.className = 'pct-label'; l.textContent = label;
      d.appendChild(p); d.appendChild(l); return d;
    };
    split.appendChild(mk(finished.length + '%', 'reached the Final Boss', 'finish'));
    split.appendChild(mk(failed.length + '%', 'got stuck (step cap hit)', 'fail'));
    split.appendChild(mk(avg(finished, 'totalVisits'), 'avg rooms visited (finished runs)'));
    split.appendChild(mk(avg(finished, 'uniqueRooms'), 'avg unique rooms (finished runs)'));
    split.appendChild(mk(avg(finished, 'backtrackSteps'), 'avg backtrack steps (finished runs)'));
    split.appendChild(mk(avg(finished, 'totalRetries'), 'avg retries (finished runs)'));
    split.appendChild(mk(avg(finished, 'totalTime'), 'avg est. time units (finished runs)'));
    box.appendChild(split);
    el.appendChild(box);
    btn.disabled = false; btn.textContent = '📊 Run 100 & show stats';
  }, 20);
});

document.getElementById('subhead').textContent = DATA.runs.length + ' simulated run(s) generated at build time — click "Run another simulation" for more, or "Run 100 & show stats" for aggregate odds, entirely in-browser, no regeneration needed.';
</script>`;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--diff')) {
    runDiff();
    return;
  }
  const fileArg = args.find((a) => !a.startsWith('--') && a !== getArgValue(args, '--simulate') && a !== getArgValue(args, '--runs') && a !== getArgValue(args, '--seed') && a !== getArgValue(args, '--html'));
  const inputPath = fileArg ? path.resolve(fileArg) : MD_PATH;
  const text = fs.readFileSync(inputPath, 'utf8');
  const graph = buildGraph(extractMermaidBlock(text));
  console.log(`(reading: ${path.relative(process.cwd(), inputPath)})\n`);

  if (args.includes('--simulate')) {
    const startId = findStart(graph.nodes);
    const goalId = findFinalBoss(graph.nodes);
    const difficultyConfig = loadDifficultyConfig();
    const runCount = parseInt(getArgValue(args, '--runs') || '1', 10);
    const seedArg = getArgValue(args, '--seed');
    const baseSeed = seedArg ? parseInt(seedArg, 10) : Date.now() & 0xffffffff;
    const directMode = args.includes('--direct');
    const runs = [];
    for (let i = 0; i < runCount; i++) {
      runs.push(simulateRandomPlaythrough(graph, startId, goalId, difficultyConfig, { seed: baseSeed + i, backtrackChance: directMode ? 0 : undefined }));
    }
    printSimulationReport(null, runs);
    if (args.includes('--html')) {
      const html = buildSimulationHtml(runs, graph, startId, goalId, difficultyConfig);
      const outArgIndex = args.indexOf('--html');
      const outArg = args[outArgIndex + 1] && !args[outArgIndex + 1].startsWith('--') ? args[outArgIndex + 1] : null;
      const outPath = outArg ? path.resolve(outArg) : path.join(PLANS_DIR, '..', 'editor', 'floor_plan_simulation.html');
      const fullDoc = `<!doctype html>\n<html><head><meta charset="utf-8"><title>Stillpoint — Playthrough Simulation</title></head><body>\n${html}\n</body></html>\n`;
      fs.writeFileSync(outPath, fullDoc);
      console.log(`Wrote HTML simulation viewer to: ${path.relative(process.cwd(), outPath)}`);
    }
    return;
  }

  printReport(graph);

  if (args.includes('--html')) {
    const startId = findStart(graph.nodes);
    const goalId = findFinalBoss(graph.nodes);
    const normalPath = criticalPathSearch(graph, startId, goalId);
    const speedPath = speedrunPathSearch(graph, startId, goalId);
    const html = generateHtmlReport(graph, startId, goalId, normalPath, speedPath);
    const outArgIndex = args.indexOf('--html');
    const outArg = args[outArgIndex + 1] && !args[outArgIndex + 1].startsWith('--') ? args[outArgIndex + 1] : null;
    const outPath = outArg ? path.resolve(outArg) : path.join(PLANS_DIR, '..', 'editor', 'floor_plan_report.html');
    const fullDoc = `<!doctype html>\n<html><head><meta charset="utf-8"><title>Stillpoint — Floor Plan Path Viewer</title></head><body>\n${html}\n</body></html>\n`;
    fs.writeFileSync(outPath, fullDoc);
    console.log(`\nWrote HTML path viewer to: ${path.relative(process.cwd(), outPath)}`);
  }
}

// Exported for reuse by other Plans/ tools (e.g. room_difficulty_calculator.js)
// so they share the exact same graph parser/simulation engine instead of a
// second copy drifting out of sync. Purely additive — doesn't change CLI
// behavior, which still runs via the require.main guard below.
module.exports = {
  extractMermaidBlock, buildGraph, findStart, findFinalBoss,
  applyNodeGrants, requirementSatisfied, getFastTravelIndex,
  mulberry32, weightedPick, unexploredReach, nodeWeight,
  difficultyMultiplier, loadDifficultyConfig,
  abilityBitmask, flagBitmask, maskToSet, serializeGraphForClient, findEndgameRush,
  ALL_ABILITIES, get ALL_FLAGS() { return ALL_FLAGS; }, TIME_WEIGHTS,
  MD_PATH, PLANS_DIR,
};

if (require.main === module) main();
