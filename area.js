// Interconnected Metroidvania world — 8 rooms + 1 optional branch
// Progression spine: The Fracture → Echo Bridge → Crystal Cavern → The Forge
//                   → The Vault → The Rift → Antechamber → Boss Arena
//
// COORDINATE RULES (verified per room):
//   Enemy on ground:   y = groundY - 28              (28 = enemy height)
//   Enemy on platform: y = platformY - 28
//   Anchor:            y = groundY - 20              (well above floor surface)
//   Ability pickup:    y = platformY - 22            (floats just above platform)
//   Spawn on ground:   toY = groundY - 80            (falls gently to ground)
//   Spawn on platform: toY = platformY - 40          (falls onto platform)

const AREAS = {

  // ─────────────────────────────────────────────────────────────────────────
  // ROOM 0 — Threshold (tutorial)
  // Small isolated room, guided prompts: move, jump, attack (dummy), dash.
  // Door at the end stays sealed until all four are done. Skippable via Escape.
  // ─────────────────────────────────────────────────────────────────────────
  tutorial_area: {
    id: 'tutorial_area',
    name: 'Threshold',
    region: 'origin',
    col: 0, row: 0,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(196, 181, 253, 0.02)',
    ambientColor: '#6a6a8e',
    platforms: [
      { x: 0,   y: 390, w: 260, h: 60 },  // start platform — MOVE
      { x: 320, y: 390, w: 200, h: 60 },  // across a small jump gap — JUMP; dummy stands here — ATTACK
      { x: 600, y: 390, w: 300, h: 60 },  // across a dash-width gap — DASH; door at the far right
    ],
    transitions: [
      // Sealed until isTutorialComplete() — see game.js switchArea()/draw().
      { x: 865, y: 320, w: 35, h: 70, to: 'the_fracture', toX: 60, toY: 310, requires: 'tutorial_complete' },
    ],
    // Compass graph — see COMPASS GRAPH section at the bottom of this file.
    connections: [
      { direction: 'east', to: 'the_fracture', requires: 'tutorial_complete', oneWay: true, order: 0, doorIndex: 0 },
    ],
    trainingDummy: { x: 400, y: 362, w: 28, h: 28 },
    enemies: [],
    anchors: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ROOM 1 — The Fracture  (tutorial, Phase Dash pickup)
  // Player enters from left. Phase Dash is on the high right platform.
  // One gap (70px) teaches jumping. Exit right leads to Echo Bridge.
  // ─────────────────────────────────────────────────────────────────────────
  the_fracture: {
    id: 'the_fracture',
    name: 'The Fracture',
    region: 'origin',
    col: 1, row: 0,
    width: 1400,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(100, 60, 150, 0.03)',
    ambientColor: '#c4b5fd',
    platforms: [
      { x: 0,   y: 390, w: 490, h: 60 },   // left ground
      { x: 560, y: 390, w: 840, h: 60 },   // right ground (gap 490-560, 70px)
      { x: 130, y: 315, w: 150, h: 14 },   // low shelf — first jump
      { x: 400, y: 245, w: 140, h: 14 },   // mid platform (moved closer to Phase Dash)
      { x: 650, y: 195, w: 160, h: 14 },   // Phase Dash platform — 110px gap from mid, 50px higher
    ],
    // Phase Dash used to be picked up on this room's high platform — moved to
    // Mirror Veil (see Plans/roadmap.md Phase 9) per expansion.md's non-linear
    // redistribution. The platform stays (decorative/traversal), the crag
    // door below still gates on `phase_dash`, so Crag stays locked here until
    // the player finds it in Mirror Veil and backtracks — intentional.
    abilityReward: null,
    transitions: [
      // Exit right → Echo Bridge
      { x: 1365, y: 320, w: 35, h: 70, to: 'echo_bridge', toX: 60, toY: 312 },
      // North branch → Crag of the Colossus, reached from the same high
      // platform Phase Dash used to sit on (placed at the far end of it so
      // it doesn't overlap that old pickup spot at x:695).
      { x: 760, y: 173, w: 40, h: 22, to: 'crag_entrance', toX: 60, toY: 480, requires: 'phase_dash' },
      // BUGFIX 2026-07-12: direct shortcut to Mirror Veil, right where the
      // Phase Dash pickup used to sit. Without this, Phase Dash was
      // completely unobtainable — Echo Bridge's own p3->p4 gap ("160px —
      // Phase Dash only," see that room's comment) gates the ONLY other
      // path to Mirror Veil (via Upper Ruins), creating a hard circular
      // lock: you needed Phase Dash to reach the room that gives you Phase
      // Dash. Found by the user's own playtesting — no linter catches
      // cross-region ability-order softlocks like this (that's exactly
      // what the not-yet-built dynamic bot-walker, task 3, is for).
      { x: 670, y: 173, w: 40, h: 22, to: 'mirror_veil_gate', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'east', to: 'echo_bridge', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'crag_entrance', requires: 'phase_dash', oneWay: false, order: 0, doorIndex: 1,
        edgeExempt: true, edgeExemptReason: 'Reached via a jump to the high mid-room Phase Dash platform, not a side-edge door — same convention as Echo Bridge → Upper Ruins.' },
      { direction: 'south', to: 'mirror_veil_gate', requires: null, oneWay: false, order: 0, doorIndex: 2, shortcut: true },
    ],
    enemies: [
      { type: 'fractured', x: 700,  y: 362 },   // on right ground
      { type: 'fractured', x: 1150, y: 362 },   // near exit, teaches combat
    ],
    anchors: [
      { x: 220, y: 370, index: 0 },   // left ground, safe spawn area
    ],
    loreFragments: [
      { id: 'lore_f1', x: 995, y: 150,
        text: '"She said the fusion would be clean. She said it would be the last thing she ever had to do to us."' },
    ],
    fracturePipRewards: [
      { id: 'fp_fracture_1', x: 200, y: 295 },   // low shelf platform
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ROOM 2 — Echo Bridge  (Phase Dash gauntlet, no floor)
  // Five floating platforms. Gap between p3 and p4 is 160px — Phase Dash only.
  // Optional exit up from p4 leads to Upper Ruins (lore).
  // ─────────────────────────────────────────────────────────────────────────
  echo_bridge: {
    id: 'echo_bridge',
    name: 'Echo Bridge',
    region: 'origin',
    col: 2, row: 0,
    width: 1000,
    groundY: 900,   // no floor — fall = pit death
    pitDeathY: 600, // real platforms all sit above y:600 — preserves the previous behavior now that game.js no longer infers this from groundY
    bgColor: '#0a0a0f',
    bgTint: 'rgba(140, 80, 200, 0.04)',
    ambientColor: '#8b5cf6',
    platforms: [
      { x: 30,  y: 350, w: 200, h: 14 },   // p1 — entry (wide, safe)
      { x: 295, y: 328, w: 110, h: 14 },   // p2 — gap 65, normal jump
      { x: 465, y: 306, w: 100, h: 14 },   // p3 — gap 60, enemy here
      //   GAP 165px (x:565 → x:730) — crossable with a plain dash (jump +
      //   dash reach covers it); corrected 2026-07-12, this comment used to
      //   say "Phase Dash mandatory" but that was never actually true —
      //   confirmed by the user's own playtesting, not a physics recalc.
      { x: 730, y: 322, w: 140, h: 14 },   // p4 — landing pad post-dash
      { x: 915, y: 298, w: 85,  h: 14 },   // p5 — exit platform
    ],
    transitions: [
      { x: 0,   y: 284, w: 35, h: 82, to: 'the_fracture', toX: 1330, toY: 348 },
      { x: 965, y: 233, w: 35, h: 80, to: 'crystal_cavern', toX: 60, toY: 92 },
      // Optional — Upper Ruins, from p4. Was gated `requires: 'phase_dash'`;
      // removed 2026-07-12 — the jump to reach p4 doesn't actually need
      // Phase Dash (a plain dash covers the gap, confirmed by the user's
      // playtesting), so the requirement was gating on nothing real. This
      // also makes it a second, always-open route into Mirror Veil
      // alongside the direct shortcut added in The Fracture — consistent
      // with wanting the map to read as a web, not a single path.
      { x: 740, y: 258, w: 80, h: 30, to: 'upper_ruins', toX: 100, toY: 348 },
    ],
    connections: [
      { direction: 'west', to: 'the_fracture', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'crystal_cavern', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'north', to: 'upper_ruins', requires: null, oneWay: false, order: 0, doorIndex: 2,
        edgeExempt: true, edgeExemptReason: 'Reached by jumping up from a mid-air platform (room has no floor, groundY=900) — not a side-edge door.' },
    ],
    enemies: [
      { type: 'fractured', x: 530, y: 278 },   // p3: 306-28=278 (Fractured, not Stutterer — Stutterers teleport into void)
    ],
    anchors: [
      { x: 90, y: 330, index: 0 },   // p1: 350-20=330
    ],
    loreFragments: [
      { id: 'lore_eb1', x: 330, y: 302,
        text: '"The bridge didn\'t fall. It refused to hold. There is a difference, and I understand it now."' },
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ROOM A — Upper Ruins  (optional, lore only, dead end)
  // Three lore tablets and one easy enemy. No ability rewards.
  // ─────────────────────────────────────────────────────────────────────────
  upper_ruins: {
    id: 'upper_ruins',
    name: 'Upper Ruins',
    region: 'origin',
    col: 2, row: -1,
    mapAccent: '#fbbf24', // lore-only optional branch — distinct map color
    width: 800,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(160, 120, 80, 0.04)',
    ambientColor: '#fbbf24',
    platforms: [
      { x: 0,   y: 390, w: 800, h: 60 },
      { x: 100, y: 302, w: 120, h: 14 },
      { x: 300, y: 242, w: 120, h: 14 },
      { x: 500, y: 302, w: 120, h: 14 },
      { x: 650, y: 232, w: 130, h: 14 },
    ],
    transitions: [
      { x: 0, y: 326, w: 35, h: 64, to: 'echo_bridge', toX: 750, toY: 292 },
      // North branch → Mirror Veil, reached from the highest platform here.
      { x: 700, y: 210, w: 40, h: 22, to: 'mirror_veil_gate', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'south', to: 'echo_bridge', requires: null, oneWay: false, order: 0, doorIndex: 0,
        edgeExempt: true, edgeExemptReason: 'Drops back down to Echo Bridge; placed on the west wall for level-design convenience — this room has its own floor, not a literal bottom edge.' },
      { direction: 'north', to: 'mirror_veil_gate', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [
      { type: 'fractured', x: 390, y: 362 },
    ],
    anchors: [],
    loreFragments: [
      { id: 'lore_ur1', x: 150, y: 276,
        text: '"She didn\'t lose control of the Stillpoints. She fused them on purpose, to end every war at once by ending the possibility of anything ever changing again."' },
      { id: 'lore_ur2', x: 340, y: 216,
        text: '"She told us it was for our own good. That a world which could never change again could never be hurt again. She believed it. That\'s what made her dangerous — not cruelty, certainty."' },
      { id: 'lore_ur3', x: 695, y: 206,
        text: '"She is still in there. Not trapped — waiting. Rebuilding what she can reach. She has not stopped ruling; she has just run out of subjects who can still see her coming."' },
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ROOM 3 — Crystal Cavern  (Shard Shot pickup, vertical descent)
  // Player enters from top-left. Descends through crystal formations.
  // A tall destructible crystal wall at x:680 blocks the right exit.
  // Shard Shot on the mid-left platform; player shoots wall to proceed.
  // ─────────────────────────────────────────────────────────────────────────
  crystal_cavern: {
    id: 'crystal_cavern',
    name: 'Crystal Cavern',
    region: 'origin',
    col: 3, row: 0,
    width: 1200,
    groundY: 700,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(45,212,191,0.05)',
    ambientColor: '#2dd4bf',
    platforms: [
      { x:30, y:130, w:160, h:14 },
      { x:280, y:218, w:120, h:14 },
      { x:100, y:318, w:130, h:14 },
      { x:370, y:398, w:160, h:14 },
      { x:680, y:330, w:24, h:370, destructible:true, hp:3, wall:true },
      { x:720, y:420, w:160, h:14 },
      { x:940, y:360, w:140, h:14 },
      { x:1060, y:460, w:140, h:14 },
      { x:0, y:700, w:1200, h:60 }
    ],
    abilityReward: { id:'shard_shot', x:415, y:376, name:'Shard Shot', desc:"Hold V to aim, release to fire. Up/Down tilts the arc. Shatters crystal walls." },
    transitions: [
      { x:0, y:68, w:35, h:82, to:'echo_bridge', toX:928, toY:268 },
      { x:1165, y:418, w:35, h:60, to:'the_forge', toX:60, toY:348 }
    ],
    connections: [
      { direction: 'west', to: 'echo_bridge', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'the_forge', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [
      { type:'fractured', x:308, y:190 },
      { type:'stutterer', x:490, y:370 },
      { type:'fractured', x:990, y:332 }
    ],
    anchors: [
      { x:60, y:100, index:0 }
    ],
    loreFragments: [
      { id:'lore_cc1', x:415, y:358, text:"\"The crystals are made of frozen time. Her time. She didn't ask if we wanted to be frozen with it.\"" }
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ROOM 4 — The Forge  (Shard Shot puzzle room, two crystal barrier pairs)
  // Continuous floor. Two double-wide crystal barriers block progress.
  // Player shoots each barrier from a nearby platform to proceed right.
  // ─────────────────────────────────────────────────────────────────────────
  the_forge: {
    id: 'the_forge',
    name: 'The Forge',
    region: 'origin',
    col: 4, row: 0,
    width: 1300,
    groundY: 390,
    bgColor: '#080812',
    bgTint: 'rgba(45, 130, 180, 0.04)',
    ambientColor: '#67e8f9',
    platforms: [
      { x: 0, y: 390, w: 1300, h: 60 },    // full floor
      { x: 150,  y: 300, w: 120, h: 14 },  // left shelf — shooting angle for barrier 1
      { x: 560,  y: 270, w: 140, h: 14 },  // mid shelf — between barriers
      { x: 1060, y: 255, w: 140, h: 14 },  // right shelf — behind barrier 2
      // Step up to the right shelf — it's a 135px rise straight off the
      // floor (max jump apex is 120px) and was only reachable via an
      // unintended wall-jump off barrier 2; found by the room layout linter.
      { x: 980,  y: 330, w: 70,  h: 14 },
      // Barrier 1 — double-wide crystal wall (left of centre)
      { x: 430, y: 218, w: 22, h: 172, destructible: true, hp: 2 },
      { x: 452, y: 218, w: 22, h: 172, destructible: true, hp: 2 },
      // Barrier 2 — double-wide crystal wall (right of centre)
      { x: 850, y: 198, w: 22, h: 192, destructible: true, hp: 2 },
      { x: 872, y: 198, w: 22, h: 192, destructible: true, hp: 2 },
    ],
    transitions: [
      { x: 0,    y: 325, w: 35, h: 65, to: 'crystal_cavern', toX: 1130, toY: 428 },
      { x: 1265, y: 325, w: 35, h: 65, to: 'the_vault',      toX: 60,   toY: 348 },
      // North branch → Chrono-Space Rift, reached from the left shelf.
      { x: 190, y: 278, w: 40, h: 22, to: 'chrono_rift_gate', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'west', to: 'crystal_cavern', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'the_vault', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'north', to: 'chrono_rift_gate', requires: null, oneWay: false, order: 0, doorIndex: 2 },
    ],
    enemies: [
      { type: 'fractured', x: 250,  y: 362 },   // left zone (ground)
      { type: 'stutterer', x: 620,  y: 362 },   // mid zone (ground, between barriers)
      { type: 'fractured', x: 960,  y: 362 },   // right zone (ground)
      { type: 'stutterer', x: 1100, y: 227 },   // right shelf: 255-28=227
      { type: 'crystal_sentinel', x: 600, y: 320 },
    ],
    anchors: [
      { x: 180, y: 370, index: 0 },   // left of barrier 1, safe entry zone: 390-20=370
    ],
    loreFragments: [
      { id: 'lore_tf1', x: 600, y: 244,
        text: '"Every barrier she built was meant to never be crossed. She is the reason nothing here was ever allowed to bend — so now everything only knows how to break."' },
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ROOM 5 — The Vault  (Stillpoint pickup, rest room, no enemies)
  // Two Anchors — each heals 1 health when first activated.
  // Ability altar at centre-high platform. Exit right requires Stillpoint.
  // ─────────────────────────────────────────────────────────────────────────
  the_vault: {
    id: 'the_vault',
    name: 'The Vault',
    region: 'origin',
    col: 5, row: 0,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(180, 160, 255, 0.07)',
    ambientColor: '#e0d4ff',
    platforms: [
      { x: 0,   y: 390, w: 900, h: 60 },   // full floor
      { x: 190, y: 290, w: 130, h: 14 },   // left elevated
      { x: 570, y: 290, w: 130, h: 14 },   // right elevated
      { x: 360, y: 196, w: 180, h: 14 },   // altar (centre-high)
    ],
    // Stillpoint used to be picked up on the altar here — moved to Chrono-Space
    // Rift (branches off The Forge, reached BEFORE this room) per expansion.md's
    // non-linear redistribution — see Plans/roadmap.md Phase 9. The east door
    // below still gates on `stillpoint`, so a player who skipped that branch
    // hits a locked door here and has to backtrack — intentional.
    abilityReward: null,
    transitions: [
      { x: 0,   y: 325, w: 35, h: 65, to: 'the_forge', toX: 1230, toY: 348 },
      // Exit requires Stillpoint — the door is locked until you pick it up
      { x: 865, y: 325, w: 35, h: 65, to: 'the_rift',  toX: 60,   toY: 282, requires: 'stillpoint' },
      // North branch → Event Horizon, gated on Phase Dash per expansion.md
      // §3 (table 3.1) — Mirror Veil (reached earlier, off Upper Ruins)
      // grants Phase Dash, so it's always available by the time a player
      // reaches this door.
      { x: 610, y: 268, w: 40, h: 22, to: 'event_horizon_gate', toX: 60, toY: 310, requires: 'phase_dash' },
    ],
    connections: [
      { direction: 'west', to: 'the_forge', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'the_rift', requires: 'stillpoint', oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'north', to: 'event_horizon_gate', requires: 'phase_dash', oneWay: false, order: 0, doorIndex: 2 },
    ],
    enemies: [],   // rest room — no combat
    anchors: [
      { x: 140, y: 370, index: 0 },   // entry side: 390-20=370
      { x: 730, y: 370, index: 1, memoryResonance: true },   // exit side (heals before The Rift) — also the one-time full lore-pip reallocation, per Enemy_Design.pdf; UI/interaction not yet built, see roadmap.md
    ],
    loreFragments: [
      { id: 'lore_tv1', x: 260, y: 265,
        text: '"We stole one Stillpoint back before she fused the rest. She doesn\'t know it exists. Keep it. Keep it hidden. Give it to whoever comes looking for a way to move, not a way to stop."' },
      { id: 'lore_tv2', x: 620, y: 265,
        text: '"She thinks she accounted for everything that could ever move against her. She is very nearly right. Go be the exception."' },
    ],
    fracturePipRewards: [
      { id: 'fp_vault_1', x: 450, y: 176 },   // altar platform
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ROOM 6 — The Rift  (all-ability gauntlet, no floor)
  // Three sections: rhythm gaps → Phase Dash gaps → enemy-blocked platforms.
  // Section 3 has two enemies on the only platforms — use Stillpoint to
  // slow them, dash through, then attack.
  // ─────────────────────────────────────────────────────────────────────────
    the_rift: {
    id: 'the_rift',
    name: 'The Rift',
    region: 'origin',
    col: 6, row: 0,
    width: 1960,
    groundY: 900,
    pitDeathY: 600, // real platforms all sit above y:600 — preserves the previous behavior now that game.js no longer infers this from groundY
    bgColor: '#0a0a0f',
    bgTint: 'rgba(80,40,160,0.07)',
    ambientColor: '#7c3aed',
    platforms: [
      { x:30, y:320, w:200, h:14 },
      { x:300, y:300, w:100, h:14 },
      { x:470, y:278, w:100, h:14 },
      { x:640, y:298, w:100, h:14 },
      { x:820, y:268, w:160, h:14 },
      { x:1060, y:246, w:100, h:14 },
      { x:1220, y:264, w:120, h:14 },
      { x:1380, y:246, w:220, h:14 },
      { x:1630, y:258, w:260, h:14 },
      { x:1900, y:225, w:120, h:14 }
    ],
    abilityReward: null,
    transitions: [
      { x:0, y:258, w:35, h:80, to:'the_vault', toX:828, toY:348 },
      { x:1910, y:160, w:35, h:80, to:'antechamber', toX:60, toY:348 }
    ],
    connections: [
      { direction: 'west', to: 'the_vault', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'antechamber', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [
      { type:'fractured', x:490, y:250 },
      { type:'fractured', x:880, y:240 },
      { type:'fractured', x:1700, y:230 },
      { type:'fractured', x:1810, y:230 }
    ],
    anchors: [
      { x:1450, y:226, index:0 }
    ],
    loreFragments: [
      { id:'lore_tr1', x:1450, y:212, text:"\"Every gap is a small surrender.\"" },
      { id:'lore_tr2', x:1000, y:230, text:"\"She never doubted. Doubt is a Stillpoint she never let herself feel.\"" }
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ROOM 7 — Antechamber  (pre-boss rest, final lore, no enemies ever)
  // Anchor heals. Final two lore fragments reveal what the King is.
  // ─────────────────────────────────────────────────────────────────────────
  antechamber: {
    id: 'antechamber',
    name: 'Antechamber',
    region: 'origin',
    col: 7, row: 0,
    width: 700,
    groundY: 390,
    bgColor: '#08080e',
    bgTint: 'rgba(200, 40, 40, 0.04)',
    ambientColor: '#f87171',
    platforms: [
      { x: 0,   y: 390, w: 700, h: 60 },
      { x: 185, y: 292, w: 150, h: 14 },
      { x: 365, y: 225, w: 150, h: 14 },
    ],
    transitions: [
      { x: 0,   y: 326, w: 35, h: 64, to: 'the_rift',   toX: 1920, toY: 190 },
      { x: 665, y: 326, w: 35, h: 64, to: 'boss_arena', toX: 420,  toY: 310 },
    ],
    connections: [
      { direction: 'west', to: 'the_rift', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'boss_arena', requires: null, oneWay: true, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 330, y: 370, index: 0 },   // centre ground, full heal
    ],
    loreFragments: [
      { id: 'lore_ac1', x: 220, y: 268,
        text: '"She knows something is moving through her ruins that she didn\'t authorize. She is looking for it. She is very good at looking."' },
      { id: 'lore_ac2', x: 395, y: 202,
        text: '"There is a child she cannot see. She knows there is something she cannot see, which is worse, to her, than knowing what it is. She will not stop until there is nothing left she cannot account for."' },
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ROOM 8 — Boss Arena  (The Fractured King)
  // Sealed walls. Three platforms for vertical mobility.
  // Anchor in safe corner. No exit during fight.
  // ─────────────────────────────────────────────────────────────────────────
  boss_arena: {
    id: 'boss_arena',
    name: 'The Fractured King',
    region: 'origin',
    col: 8, row: 0,
    roomType: 'boss',
    width: 900,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(200, 40, 40, 0.06)',
    ambientColor: '#f87171',
    isBossArena: true,
    platforms: [
      { x: 0,   y: 390, w: 900, h: 60 },   // ground
      { x: 0,   y: 0,   w: 16,  h: 390, wall: true },  // left wall (sealed during fight)
      { x: 884, y: 0,   w: 16,  h: 390, wall: true },  // right wall
      { x: 130, y: 295, w: 130, h: 14 },   // left platform
      { x: 640, y: 295, w: 130, h: 14 },   // right platform
      { x: 350, y: 210, w: 200, h: 14 },   // centre-high platform
    ],
    // Victory exit — handled by the gameState='victory' flow, no physical door during fight
    transitions: [],
    connections: [],   // sealed arena — reached one-way from antechamber, no doors of its own
    enemies: [],
    anchors: [
      { x: 430, y: 370, index: 0 },   // centre ground, last checkpoint: 390-20=370
    ],
    loreFragments: [],
    abilityReward: null,
    bossSpawn: { x: 400, y: 334 },   // BOSS_Y = groundY - BOSS_HEIGHT = 390-56=334 ✓
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CRAG OF THE COLOSSUS — new starting expansion region.
  // Branches off The Fracture's Phase Dash platform (requires phase_dash to
  // enter). Grants the Charged Attack ability at crag_altar; the miniboss
  // Colossus Core (crag_warden) requires it to defeat. Compass position:
  // col 1, rows -1..-4 — a vertical column climbing "up the crag" directly
  // north of The Fracture, per the full-world layout plan.
  //
  // Each room is large and multi-tier (per expansion.md §3.15 — few big
  // rooms, not many small ones) with internal branching rather than a
  // single critical-path corridor. Destructible walls are heavy-attack-only
  // (hp 2-5) and gate Tier 3 secrets that are visible on the first pass but
  // can't be broken until the player has been to crag_altar and back.
  // ═══════════════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────────────────
  // CRAG 1 — Crag Entrance
  // Enter from The Fracture's high platform (west side, mid-height landing).
  // Three internal routes converge on the east exit: a lower critical path
  // (segmented platforms over pits, matches Echo Bridge's no-floor pattern),
  // a parallel mid-height route that avoids most enemies, and an optional
  // upper climb that dead-ends at a Tier 3 secret behind two heavy-attack
  // rubble walls — visible and reachable now, but unbreakable until the
  // player has Charged Attack (from crag_altar, deeper in this region).
  // ─────────────────────────────────────────────────────────────────────────
  crag_entrance: {
    id: 'crag_entrance',
    name: 'Crag Entrance',
    region: 'crag',
    col: 1, row: -1,
    mapAccent: '#d97757',
    width: 2800,
    groundY: 900,
    pitDeathY: 1050, // generous fallback net only — the cave floor below is continuous, this should never trigger on the intended route
    bgColor: '#120a06',
    bgTint: 'rgba(180, 90, 40, 0.05)',
    ambientColor: '#d97757',
    platforms: [
      { x: 0,    y: 520, w: 340, h: 60 },   // entry ledge — player lands here from The Fracture; width reaches the first lower-route platform's x-start so the drop off its edge has no horizontal gap beneath it

      // Lower route (critical path, tier 1) — a continuous cave floor. Each
      // platform's width reaches exactly to the start of the next one, so
      // height changes read as steps to hop between, never as a gap you can
      // fall through — no fall-death is possible along this route.
      { x: 340,  y: 860, w: 320, h: 40 },
      { x: 660,  y: 860, w: 280, h: 40 },
      { x: 940,  y: 800, w: 260, h: 40 },   // step up
      { x: 1200, y: 860, w: 340, h: 40 },   // step down
      { x: 1540, y: 800, w: 300, h: 40 },   // step up
      { x: 1840, y: 860, w: 340, h: 40 },   // step down
      { x: 2180, y: 800, w: 300, h: 40 },   // step up
      { x: 2480, y: 740, w: 280, h: 40 },   // step up, reaching the exit door

      // Mid route (parallel, avoids most ground enemies) — rejoins lower route near x:1540
      { x: 300,  y: 660, w: 180, h: 20 },
      { x: 560,  y: 610, w: 160, h: 20 },
      { x: 820,  y: 650, w: 160, h: 20 },
      { x: 1100, y: 600, w: 180, h: 20 },
      { x: 1380, y: 640, w: 160, h: 20 },

      // Upper climb (optional, harder) — dead-ends at the Tier 3 secret
      { x: 60,   y: 430, w: 160, h: 20 },
      { x: 300,  y: 360, w: 140, h: 20 },
      { x: 520,  y: 300, w: 140, h: 20 },
      { x: 750,  y: 340, w: 140, h: 20 },
      { x: 960,  y: 300, w: 200, h: 20 },   // last platform before the sealed alcove
      // Rubble wall — heavy-attack-only, visible from the first pass, needs Charged Attack
      { x: 1150, y: 140, w: 24, h: 210, destructible: true, hp: 3, wall: true },
      { x: 1180, y: 300, w: 160, h: 20 },   // alcove floor, beyond the wall
    ],
    transitions: [
      // BUGFIX: this door used to be `y: 520, h: 60` (520-580) — that's INSIDE
      // the solid platform body (platform spans y:520-580), below the player's
      // actual standing hitbox (~488-520), so it was physically untouchable.
      // Doors need to extend UP from the platform surface into the air the
      // player's body occupies, not down into the ground.
      { x: 0,    y: 450, w: 35, h: 70, to: 'the_fracture', toX: 720, toY: 155 },
      { x: 2740, y: 690, w: 40, h: 60, to: 'crag_breach',  toX: 60,  toY: 380 },
    ],
    connections: [
      { direction: 'south', to: 'the_fracture', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      // 'north' here is the world-map compass direction (deeper into the
      // region), not the physical in-room travel direction — the door
      // itself is a normal east-edge door, matching the room-to-room visual
      // continuity convention (exit right, enter left) used everywhere else.
      { direction: 'north', to: 'crag_breach', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [
      { type: 'fractured', x: 380,  y: 832 },
      { type: 'fractured', x: 1240, y: 832 },
      { type: 'stutterer',  x: 1880, y: 832 },
      { type: 'fractured', x: 2220, y: 772 },
    ],
    anchors: [
      { x: 100, y: 500, index: 0 },   // entry ledge, safe first checkpoint in the region
    ],
    loreFragments: [
      { id: 'lore_ce1', x: 1260, y: 280,
        text: '"The crag does not yield to a light hand. Strike as though you mean to end something."' },
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CRAG 2 — Crag Breach
  // A tall fissure. Lower route (safe, wide platforms) vs. upper route
  // (harder platforming, rewards a Tier 2 fracture-pip pickup) — both
  // converge at the east exit. One heavy-attack wall gates a small Tier 3
  // alcove, same "visible now, breakable later" rule as Crag Entrance.
  // ─────────────────────────────────────────────────────────────────────────
  crag_breach: {
    id: 'crag_breach',
    name: 'Crag Breach',
    region: 'crag',
    col: 1, row: -2,
    mapAccent: '#d97757',
    width: 3000,
    groundY: 1100,
    pitDeathY: 1250, // generous fallback net only — same continuous-cave-floor rule as Crag Entrance
    bgColor: '#0f0805',
    bgTint: 'rgba(160, 70, 30, 0.06)',
    ambientColor: '#c2703d',
    platforms: [
      { x: 0,    y: 420, w: 300, h: 40 },   // entry, from Crag Entrance

      // Lower route (critical path) — continuous cave floor, same rule as
      // Crag Entrance: each platform's width reaches the next one's x-start.
      { x: 300,  y: 500, w: 300, h: 30 },
      { x: 600,  y: 580, w: 280, h: 30 },
      { x: 880,  y: 660, w: 280, h: 30 },
      { x: 1160, y: 600, w: 320, h: 30 },
      { x: 1480, y: 660, w: 300, h: 30 },
      { x: 1780, y: 580, w: 300, h: 30 },
      { x: 2080, y: 500, w: 320, h: 30 },
      { x: 2400, y: 560, w: 300, h: 30 },
      { x: 2700, y: 500, w: 260, h: 30 },   // leads to exit

      // Upper route (optional, harder) — Tier 2 reward. Falling off any of
      // these just drops the player back onto the continuous lower floor,
      // never into a pit — the "optional detour, not a precision gauntlet"
      // rule from Crag Entrance applies here too.
      // Step onto the upper route from the entry ledge — without it the
      // first upper platform is a 160px rise (max jump apex is 120px) and
      // the whole route was unreachable; found by the room layout linter.
      { x: 120,  y: 330, w: 120, h: 20 },
      { x: 260,  y: 260, w: 180, h: 20 },
      { x: 560,  y: 200, w: 160, h: 20 },
      { x: 900,  y: 240, w: 160, h: 20 },
      { x: 1220, y: 190, w: 160, h: 20 },
      { x: 1560, y: 230, w: 160, h: 20 },   // Tier 2 pickup platform (fracture pip)

      // Heavy-attack wall gating a Tier 3 secret — dead-ends the upper route
      // beyond the Tier 2 platform, same pattern as Crag Entrance's alcove
      // (a sealed ledge past a rubble wall, not a fall-through pocket).
      { x: 1780, y: 230, w: 24, h: 170, destructible: true, hp: 4, wall: true },
      { x: 1810, y: 190, w: 160, h: 20 },   // secret ledge, beyond the wall
    ],
    transitions: [
      { x: 0,    y: 400, w: 35, h: 60, to: 'crag_entrance', toX: 2700, toY: 700 },
      { x: 2940, y: 440, w: 40, h: 60, to: 'crag_altar',    toX: 60,   toY: 660 },
    ],
    connections: [
      { direction: 'south', to: 'crag_entrance', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'crag_altar', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [
      { type: 'fractured', x: 630,  y: 552 },
      { type: 'stutterer',  x: 1190, y: 572 },
      { type: 'crystal_sentinel', x: 1810, y: 552 },
      { type: 'fractured', x: 2430, y: 532 },
    ],
    anchors: [
      { x: 60, y: 400, index: 0 },
    ],
    loreFragments: [
      { id: 'lore_cb1', x: 1600, y: 206,
        text: '"Something split this stone in one blow. We have been trying to understand the blow ever since."' },
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CRAG 3 — Crag Altar
  // Cathedral-like open chamber. Charged Attack sits on a central dais
  // (Tier 1 — can't be missed). Anchor checkpoint before the exit to
  // Crag Warden, per the "checkpoint before a miniboss" door-use rule.
  // ─────────────────────────────────────────────────────────────────────────
  crag_altar: {
    id: 'crag_altar',
    name: 'Crag Altar',
    region: 'crag',
    col: 1, row: -3,
    mapAccent: '#d97757',
    width: 2200,
    groundY: 1000,
    bgColor: '#0d0704',
    bgTint: 'rgba(217, 119, 87, 0.08)',
    ambientColor: '#fb923c',
    platforms: [
      { x: 0, y: 1000, w: 2200, h: 60 },   // full safety floor — this room is a rest/reveal chamber, not a precision-pit room like Crag Entrance/Breach
      { x: 0,    y: 700, w: 260, h: 40 },   // entry, from Crag Breach
      { x: 340,  y: 780, w: 220, h: 30 },
      { x: 640,  y: 700, w: 200, h: 30 },
      { x: 920,  y: 620, w: 260, h: 30 },   // approach to the dais
      { x: 1000, y: 520, w: 220, h: 30 },   // central dais — Charged Attack sits above this
      { x: 1300, y: 620, w: 200, h: 30 },
      { x: 1580, y: 700, w: 220, h: 30 },
      { x: 1880, y: 780, w: 260, h: 30 },   // approach to exit, past checkpoint

      // Symmetrical high side ledges — decorative verticality + optional lore.
      // The two y:440 steps make them climbable from the dais — the ledges
      // are a 180px rise from it (max jump apex is 120px) and were
      // unreachable without them; found by the room layout linter.
      { x: 700,  y: 440, w: 120, h: 20 },
      { x: 700,  y: 340, w: 160, h: 20 },
      { x: 1420, y: 440, w: 120, h: 20 },
      { x: 1400, y: 340, w: 160, h: 20 },
    ],
    abilityReward: {
      id: 'charged_attack',
      x: 1110,
      y: 498,   // 22px above the dais at y:520
      name: 'Charged Attack',
      desc: 'Hold Z/J — charge a heavy strike. Cracks rubble walls, staggers armored foes.',
    },
    transitions: [
      { x: 0,    y: 680, w: 35, h: 60, to: 'crag_breach', toX: 2900, toY: 460 },
      { x: 2140, y: 720, w: 40, h: 60, to: 'crag_warden', toX: 60,   toY: 420 },
    ],
    connections: [
      { direction: 'south', to: 'crag_breach', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'crag_warden', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [
      { type: 'fractured', x: 660,  y: 672 },
      { type: 'fractured', x: 1600, y: 672 },
    ],
    anchors: [
      { x: 1940, y: 758, index: 0 },   // last checkpoint before the miniboss
    ],
    loreFragments: [
      { id: 'lore_ca1', x: 800, y: 316,
        text: '"We gave the crag a heart of crystal so it would remember how to stand. It remembers too well."' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CRAG 4 — Crag Warden (Colossus Core miniboss arena)
  // Mostly open, flat floor — this fight is about spacing and heavy-attack
  // timing (Fractured King's Guard-style shield bash, reskinned as a rock
  // shell only Charged Attack can crack), not verticality. Two low
  // platforms for repositioning only. Two exits open after the fight:
  // a one-way shortcut back to The Fracture (folds the region back into
  // the world per §6.4), and a Graviton-Surge-gated door toward the next
  // planned region — see the raw `transitions` entry below for why that
  // one isn't in `connections` yet.
  // ─────────────────────────────────────────────────────────────────────────
  crag_warden: {
    id: 'crag_warden',
    name: 'Crag Warden',
    region: 'crag',
    col: 1, row: -4,
    mapAccent: '#d97757',
    roomType: 'miniboss',
    width: 2000,
    groundY: 500,
    bgColor: '#0a0503',
    bgTint: 'rgba(217, 119, 87, 0.1)',
    ambientColor: '#fb923c',
    isMinibossArena: true,   // distinct from isBossArena (King-specific spawn logic in game.js) —
                             // Colossus Core has its own parallel spawn/defeat-persistence path.
    miniboss: 'colossus_core',
    platforms: [
      { x: 0,    y: 500, w: 2000, h: 60 },   // open floor — the fight needs room to read
      { x: 500,  y: 400, w: 180, h: 14 },    // low reposition platform
      { x: 1320, y: 400, w: 180, h: 14 },    // low reposition platform
    ],
    transitions: [
      { x: 0,    y: 434, w: 35, h: 66, to: 'crag_altar', toX: 2100, toY: 740 },
      // One-way reward shortcut straight back to the region's entry point —
      // not spatially adjacent (row -4 to row 0), hence `shortcut: true`.
      { x: 1000, y: 440, w: 60, h: 60, to: 'the_fracture', toX: 700, toY: 155 },
      // Locked door toward the next planned region (Graviton Core cluster).
      // Deliberately NOT in `connections[]` yet — that region doesn't exist
      // in AREAS, and the compass validator requires connection targets to
      // exist. `requires: 'graviton_surge'` is safe on its own: the ability
      // doesn't exist yet either, so abilityState.hasGravitonSurge is always
      // falsy and this transition can never actually fire (see game.js's
      // `requires` filtering) — it just sits here inert until both the
      // ability and the target region are built, at which point add a
      // matching `connections[]` entry too.
      { x: 1940, y: 440, w: 35, h: 60, to: 'graviton_core', toX: 60, toY: 400, requires: 'graviton_surge' },
    ],
    connections: [
      { direction: 'south', to: 'crag_altar', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'south', to: 'the_fracture', requires: null, oneWay: true, order: 1, doorIndex: 1, shortcut: true },
    ],
    enemies: [],   // Colossus Core is spawned via bossSpawn/miniboss, not the generic enemies array
    anchors: [],
    loreFragments: [
      // Continues the crag_entrance/crag_breach/crag_altar sequence (see
      // Plans/lore.md's "Crag of the Colossus" section) — the payoff after
      // the miniboss fight, reflecting on what was actually lowered into
      // the crag at crag_altar. Placed above the left reposition platform.
      { id: 'lore_cw1', x: 590, y: 378,
        text: '"A heart doesn\'t ask what it\'s protecting. That was the point — build something that would hold the line long after everyone who remembered why was gone."' },
    ],
    abilityReward: null,
    bossSpawn: { x: 950, y: 440 },   // groundY(500) - miniboss height
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MIRROR VEIL — anchor region #1 of the 13-region expansion (see
  // Plans/expansion.md §3.2, §3.13b). Branches north off Upper Ruins
  // (col 2, row -1). Open — no ability required to enter, per expansion.md's
  // "good first region" note. Empty room skeletons only (flat floor + doors,
  // no enemies/pickups yet) except the sanctum, which now holds the Phase
  // Dash reward relocated from The Fracture — see Plans/roadmap.md Phase 9.
  // ═══════════════════════════════════════════════════════════════════════
  mirror_veil_gate: {
    id: 'mirror_veil_gate',
    name: 'Mirror Veil — Gate',
    region: 'mirror_veil',
    mapAccent: '#c084fc',
    col: 2, row: -2,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a12',
    bgTint: 'rgba(192, 132, 252, 0.05)',
    ambientColor: '#c084fc',
    platforms: [
      { x: 0,   y: 390, w: 900, h: 60 },
      { x: 380, y: 300, w: 140, h: 14 },   // mid ledge — holds the direct shortcut door back to The Fracture
    ],
    transitions: [
      { x: 0,   y: 326, w: 35, h: 64, to: 'upper_ruins',        toX: 700, toY: 310 },
      { x: 865, y: 326, w: 35, h: 64, to: 'mirror_veil_reflection', toX: 60, toY: 310 },
      // BUGFIX 2026-07-12 — see the matching note in the_fracture's
      // transitions[]: this is the real, always-open entry point into
      // Mirror Veil (the old south-via-Upper-Ruins route is gated behind
      // Phase Dash at Echo Bridge, which is circular since Phase Dash lives
      // here now).
      { x: 420, y: 278, w: 60, h: 22, to: 'the_fracture', toX: 690, toY: 150 },
    ],
    connections: [
      { direction: 'south', to: 'upper_ruins', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'mirror_veil_reflection', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'north', to: 'the_fracture', requires: null, oneWay: false, order: 1, doorIndex: 2, shortcut: true },
    ],
    enemies: [],
    anchors: [ { x: 140, y: 370, index: 0 } ],
    loreFragments: [],
    abilityReward: null,
  },

  mirror_veil_reflection: {
    id: 'mirror_veil_reflection',
    name: 'Mirror Veil — Reflection',
    region: 'mirror_veil',
    mapAccent: '#c084fc',
    col: 2, row: -3,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a12',
    bgTint: 'rgba(192, 132, 252, 0.06)',
    ambientColor: '#c084fc',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
    ],
    transitions: [
      { x: 0,   y: 326, w: 35, h: 64, to: 'mirror_veil_gate',  toX: 830, toY: 310 },
      { x: 865, y: 326, w: 35, h: 64, to: 'mirror_veil_hollow', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'south', to: 'mirror_veil_gate', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'mirror_veil_hollow', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [
      { type: 'mirror_sprite', x: 450, y: 362 },
    ],
    anchors: [ { x: 140, y: 370, index: 0 } ],
    loreFragments: [],
    abilityReward: null,
  },

  mirror_veil_hollow: {
    id: 'mirror_veil_hollow',
    name: 'Mirror Veil — Hollow',
    region: 'mirror_veil',
    mapAccent: '#c084fc',
    col: 2, row: -4,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a12',
    bgTint: 'rgba(192, 132, 252, 0.07)',
    ambientColor: '#c084fc',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
    ],
    transitions: [
      { x: 0,   y: 326, w: 35, h: 64, to: 'mirror_veil_reflection', toX: 830, toY: 310 },
      { x: 865, y: 326, w: 35, h: 64, to: 'mirror_veil_sanctum',    toX: 60,  toY: 310 },
    ],
    connections: [
      { direction: 'south', to: 'mirror_veil_reflection', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'mirror_veil_sanctum', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [
      { type: 'echo_stalker', x: 450, y: 362 },
    ],
    anchors: [ { x: 140, y: 370, index: 0 } ],
    loreFragments: [],
    abilityReward: null,
  },

  mirror_veil_sanctum: {
    id: 'mirror_veil_sanctum',
    name: 'Mirror Veil — Sanctum',
    region: 'mirror_veil',
    mapAccent: '#c084fc',
    col: 2, row: -5,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a12',
    bgTint: 'rgba(192, 132, 252, 0.08)',
    ambientColor: '#c084fc',
    platforms: [
      { x: 0,   y: 390, w: 900, h: 60 },
      { x: 190, y: 290, w: 130, h: 14 },   // left elevated — same stepping-stone shape as The Vault's former altar approach
      { x: 570, y: 290, w: 130, h: 14 },   // right elevated
      { x: 360, y: 196, w: 180, h: 14 },   // altar (centre-high)
    ],
    abilityReward: {
      id: 'phase_dash',
      x: 420,
      y: 174,   // 22px above altar at y:196
      name: 'Phase Dash',
      desc: 'C — dash through space. Leaves an echo that distracts enemies.',
    },
    transitions: [
      { x: 0,   y: 326, w: 35, h: 64, to: 'mirror_veil_hollow', toX: 830, toY: 310 },
      // Cross-link (expansion.md §3.13b lattice pattern) — the moment the
      // player has Phase Dash, a direct route opens into Event Horizon
      // (which requires Phase Dash to enter) instead of forcing a full
      // backtrack across the whole origin spine to The Vault. Non-adjacent
      // on the compass grid, so `shortcut: true` skips the col/row check —
      // same mechanism as the atlas's Echoing Abyss -> Crystal Cavern link.
      { x: 865, y: 326, w: 35, h: 64, to: 'event_horizon_gate', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'south', to: 'mirror_veil_hollow', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'event_horizon_gate', requires: null, oneWay: false, order: 0, doorIndex: 1, shortcut: true },
    ],
    enemies: [],
    anchors: [ { x: 140, y: 370, index: 0 } ],
    loreFragments: [],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // EVENT HORIZON — anchor region #2 (Plans/expansion.md §3.1, §3.13b,
  // gravity cluster). Branches north off The Vault (col 5, row 0). Gated on
  // Phase Dash to enter (per expansion.md's table) — always satisfiable by
  // this point since Mirror Veil (reached earlier, off Upper Ruins) grants
  // it. Empty room skeletons only. No ability reward here (none listed for
  // this region in expansion.md — Graviton Surge belongs to Graviton Core,
  // not yet built); the deepest room ends in an inert locked stub door
  // toward that future region, same convention as Crag Warden's stub toward
  // Graviton Core.
  // ═══════════════════════════════════════════════════════════════════════
  event_horizon_gate: {
    id: 'event_horizon_gate',
    name: 'Event Horizon — Gate',
    region: 'event_horizon',
    mapAccent: '#818cf8',
    col: 5, row: -1,
    width: 900,
    groundY: 390,
    bgColor: '#07070f',
    bgTint: 'rgba(129, 140, 248, 0.06)',
    ambientColor: '#818cf8',
    platforms: [
      { x: 0,   y: 390, w: 900, h: 60 },
      { x: 380, y: 300, w: 140, h: 14 },   // mid ledge — holds the Mirror Veil cross-link door
    ],
    transitions: [
      { x: 0,   y: 326, w: 35, h: 64, to: 'the_vault', toX: 630, toY: 310 },
      { x: 865, y: 326, w: 35, h: 64, to: 'event_horizon_pull', toX: 60, toY: 310 },
      // Cross-link back to Mirror Veil's Sanctum — see the note there.
      { x: 420, y: 278, w: 60, h: 22, to: 'mirror_veil_sanctum', toX: 830, toY: 310 },
    ],
    connections: [
      { direction: 'south', to: 'the_vault', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'event_horizon_pull', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'west', to: 'mirror_veil_sanctum', requires: null, oneWay: false, order: 0, doorIndex: 2, shortcut: true },
    ],
    enemies: [],
    anchors: [ { x: 140, y: 370, index: 0 } ],
    loreFragments: [],
    abilityReward: null,
  },

  event_horizon_pull: {
    id: 'event_horizon_pull',
    name: 'Event Horizon — Pull',
    region: 'event_horizon',
    mapAccent: '#818cf8',
    col: 5, row: -2,
    width: 900,
    groundY: 390,
    bgColor: '#07070f',
    bgTint: 'rgba(129, 140, 248, 0.07)',
    ambientColor: '#818cf8',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
    ],
    transitions: [
      { x: 0,   y: 326, w: 35, h: 64, to: 'event_horizon_gate', toX: 830, toY: 310 },
      { x: 865, y: 326, w: 35, h: 64, to: 'event_horizon_drift', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'south', to: 'event_horizon_gate', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'event_horizon_drift', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [ { x: 140, y: 370, index: 0 } ],
    loreFragments: [],
    abilityReward: null,
  },

  event_horizon_drift: {
    id: 'event_horizon_drift',
    name: 'Event Horizon — Drift',
    region: 'event_horizon',
    mapAccent: '#818cf8',
    col: 5, row: -3,
    width: 900,
    groundY: 390,
    bgColor: '#07070f',
    bgTint: 'rgba(129, 140, 248, 0.08)',
    ambientColor: '#818cf8',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
    ],
    transitions: [
      { x: 0,   y: 326, w: 35, h: 64, to: 'event_horizon_pull', toX: 830, toY: 310 },
      { x: 865, y: 326, w: 35, h: 64, to: 'event_horizon_core', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'south', to: 'event_horizon_pull', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'event_horizon_core', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [ { x: 140, y: 370, index: 0 } ],
    loreFragments: [],
    abilityReward: null,
  },

  event_horizon_core: {
    id: 'event_horizon_core',
    name: 'Event Horizon — Core',
    region: 'event_horizon',
    mapAccent: '#818cf8',
    col: 5, row: -4,
    width: 900,
    groundY: 390,
    bgColor: '#07070f',
    bgTint: 'rgba(129, 140, 248, 0.09)',
    ambientColor: '#818cf8',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
    ],
    transitions: [
      { x: 0, y: 326, w: 35, h: 64, to: 'event_horizon_drift', toX: 830, toY: 310 },
      // Locked door toward the next planned region (Graviton Core cluster).
      // Deliberately NOT in `connections[]` — that region doesn't exist yet
      // and the compass validator requires connection targets to exist.
      // Inert until both Graviton Surge and Graviton Core are built, same
      // convention as Crag Warden's stub door.
      { x: 865, y: 326, w: 35, h: 64, to: 'graviton_core', toX: 60, toY: 310, requires: 'graviton_surge' },
    ],
    connections: [
      { direction: 'south', to: 'event_horizon_drift', requires: null, oneWay: false, order: 0, doorIndex: 0 },
    ],
    enemies: [],
    anchors: [ { x: 140, y: 370, index: 0 } ],
    loreFragments: [],
    abilityReward: null,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CHRONO-SPACE RIFT — anchor region #3 (Plans/expansion.md §3.6). Branches
  // north off The Forge (col 4, row 0), reached before The Vault. Open — no
  // ability required to enter. Empty room skeletons only, except the
  // sanctum, which now holds the Stillpoint reward relocated from The Vault
  // — see Plans/roadmap.md Phase 9. The Vault's own `stillpoint`-gated east
  // door stays satisfiable because this branch is reached earlier in the
  // spine.
  // ═══════════════════════════════════════════════════════════════════════
  chrono_rift_gate: {
    id: 'chrono_rift_gate',
    name: 'Chrono-Space Rift — Gate',
    region: 'chrono_rift',
    mapAccent: '#a78bfa',
    col: 4, row: -1,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a10',
    bgTint: 'rgba(167, 139, 250, 0.05)',
    ambientColor: '#a78bfa',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
    ],
    transitions: [
      { x: 0,   y: 326, w: 35, h: 64, to: 'the_forge', toX: 210, toY: 310 },
      { x: 865, y: 326, w: 35, h: 64, to: 'chrono_rift_loop', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'south', to: 'the_forge', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'chrono_rift_loop', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [ { x: 140, y: 370, index: 0 } ],
    loreFragments: [],
    abilityReward: null,
  },

  chrono_rift_loop: {
    id: 'chrono_rift_loop',
    name: 'Chrono-Space Rift — Loop',
    region: 'chrono_rift',
    mapAccent: '#a78bfa',
    col: 4, row: -2,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a10',
    bgTint: 'rgba(167, 139, 250, 0.06)',
    ambientColor: '#a78bfa',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
    ],
    transitions: [
      { x: 0,   y: 326, w: 35, h: 64, to: 'chrono_rift_gate', toX: 830, toY: 310 },
      { x: 865, y: 326, w: 35, h: 64, to: 'chrono_rift_echo', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'south', to: 'chrono_rift_gate', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'chrono_rift_echo', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [ { x: 140, y: 370, index: 0 } ],
    loreFragments: [],
    abilityReward: null,
  },

  chrono_rift_echo: {
    id: 'chrono_rift_echo',
    name: 'Chrono-Space Rift — Echo',
    region: 'chrono_rift',
    mapAccent: '#a78bfa',
    col: 4, row: -3,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a10',
    bgTint: 'rgba(167, 139, 250, 0.07)',
    ambientColor: '#a78bfa',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
    ],
    transitions: [
      { x: 0,   y: 326, w: 35, h: 64, to: 'chrono_rift_loop', toX: 830, toY: 310 },
      { x: 865, y: 326, w: 35, h: 64, to: 'chrono_rift_sanctum', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'south', to: 'chrono_rift_loop', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'chrono_rift_sanctum', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [ { x: 140, y: 370, index: 0 } ],
    loreFragments: [],
    abilityReward: null,
  },

  chrono_rift_sanctum: {
    id: 'chrono_rift_sanctum',
    name: 'Chrono-Space Rift — Sanctum',
    region: 'chrono_rift',
    mapAccent: '#a78bfa',
    col: 4, row: -4,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a10',
    bgTint: 'rgba(167, 139, 250, 0.08)',
    ambientColor: '#a78bfa',
    platforms: [
      { x: 0,   y: 390, w: 900, h: 60 },
      { x: 190, y: 290, w: 130, h: 14 },   // left elevated — same stepping-stone shape as The Vault's former altar approach
      { x: 570, y: 290, w: 130, h: 14 },   // right elevated
      { x: 360, y: 196, w: 180, h: 14 },   // altar (centre-high)
    ],
    abilityReward: {
      id: 'stillpoint',
      x: 420,
      y: 174,   // 22px above altar at y:196
      name: 'Stillpoint',
      desc: 'Q — slow the world to 15% speed. Recharges by hitting enemies.',
    },
    transitions: [
      { x: 0,   y: 326, w: 35, h: 64, to: 'chrono_rift_echo', toX: 830, toY: 310 },
      // One-way reward shortcut straight back to the origin spine, same
      // convention as Crag Warden's shortcut to The Fracture and the
      // atlas's planned Echoing Abyss -> Crystal Cavern link: getting
      // Stillpoint also earns a fast lane back to The Fracture's Crag gate,
      // symmetric with Mirror Veil's Phase Dash cross-link into Event
      // Horizon above.
      { x: 865, y: 326, w: 35, h: 64, to: 'the_fracture', toX: 220, toY: 310 },
    ],
    connections: [
      { direction: 'south', to: 'chrono_rift_echo', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'the_fracture', requires: null, oneWay: true, order: 0, doorIndex: 1, shortcut: true },
    ],
    enemies: [],
    anchors: [ { x: 140, y: 370, index: 0 } ],
    loreFragments: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DEV-ONLY — Enemy Test Arena. Not reachable via normal play (no
  // transitions in or out, no col/row so validateAreaGraph() skips it).
  // Used exclusively by enemy_test.html to spawn any enemy/miniboss in a
  // flat, generous, standard room for isolated testing. Enemies are spawned
  // dynamically by the tool, not listed here.
  // ─────────────────────────────────────────────────────────────────────────
  enemy_test_arena: {
    id: 'enemy_test_arena',
    name: 'Test Arena',
    width: 2000,
    groundY: 500,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(120, 120, 140, 0.04)',
    ambientColor: '#8888aa',
    platforms: [
      { x: 0, y: 500, w: 2000, h: 60 },   // full flat floor — enough room for a charge-attack miniboss too
      { x: 400, y: 380, w: 200, h: 14 },  // a couple of low platforms, for enemies/tests that care about verticality
      { x: 1400, y: 380, w: 200, h: 14 },
    ],
    transitions: [],
    connections: [],
    enemies: [],
    anchors: [],
    loreFragments: [],
    abilityReward: null,
  },

};

function getArea(id) {
  return AREAS[id];
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPASS GRAPH — single source of truth for room connectivity.
//
// Each room declares `col`/`row` (its position on the world map grid) and a
// `connections` array — the ONLY place door topology is authored. map.js
// generates its layout/connection-line data FROM this at runtime; nothing
// hand-authors the map separately anymore, so the map can't drift out of
// sync with the actual doors in `transitions`.
//
// Connection record shape:
//   {
//     direction:  'north' | 'south' | 'east' | 'west',
//     to:         <area id>,
//     requires:   <ability string> | null,
//     oneWay:     bool,   // true if the target room has no connection back
//     order:      number, // disambiguates multiple doors on the same side
//     doorIndex:  number, // index into this room's `transitions` array —
//                         // the physical hitbox this connection corresponds to
//     edgeExempt: bool,   // (optional) skip the physical edge-position check —
//                         // for vertical/drop connections that aren't a real
//                         // north/south edge door (mid-room jumps, etc.); see
//                         // `roomHeight` below for rooms that DO want a real
//                         // strict north/south edge check
//     edgeExemptReason: string, // required if edgeExempt is true
//   }
//
// A room can have any number of connections (0, 1, or many), including
// several on the same direction (e.g. two east doors at different heights) —
// `order` + the doorIndex hitbox positions disambiguate those.
//
// `region` is a forward-looking tag (not yet used for rendering) so that once
// 10+ regions exist, the map can group/zoom by region instead of rendering
// one flat grid — see the TODO on buildMapGraph() in map.js.
//
// `roomType` is optional metadata for map styling — 'boss' is already used
// by drawMap() (red border). Future miniboss rooms should set
// roomType: 'miniboss' so the map can style them distinctly without touching
// the boss-spawn logic in game.js, which keys off `isBossArena` specifically.
//
// `roomHeight` (optional number) — the room's real total vertical extent,
// used by game.js's getBounds()/updateCamera() as the camera's bottom
// clamp and by assertDoorOnCorrectEdge() above for strict north/south door
// checks. Falls back to `groundY + 100` when unset (every room built
// before this field existed). Added when the invisible always-on floor at
// `groundY` was removed from player.js's collision — `groundY` is now just
// the nominal floor reference line for rendering/spawn defaults, not a
// hard bound, so rooms that want to be deeper/taller than groundY (a real
// pit, a tall vertical shaft) need this field to tell the camera/map how
// far the room actually goes. Falling past all real platforms is governed
// by `pitDeathY` (or nothing, if unset — no fall-death by default).
// ═══════════════════════════════════════════════════════════════════════════

const EDGE_TOLERANCE = 20; // px — allows near-edge doors authored by hand

function assertDoorOnCorrectEdge(room, connection, hitbox) {
  if (connection.edgeExempt || connection.shortcut) return true;
  if (!hitbox) {
    console.error(`[compass graph] ${room.id}: connection to '${connection.to}' has no matching transitions[${connection.doorIndex}]`);
    return false;
  }
  if (connection.direction === 'east') {
    if (hitbox.x + hitbox.w < room.width - EDGE_TOLERANCE) {
      console.error(`[compass graph] ${room.id}: 'east' door to '${connection.to}' (doorIndex ${connection.doorIndex}) is not on the east edge (x+w=${hitbox.x + hitbox.w}, room.width=${room.width})`);
      return false;
    }
  } else if (connection.direction === 'west') {
    if (hitbox.x > EDGE_TOLERANCE) {
      console.error(`[compass graph] ${room.id}: 'west' door to '${connection.to}' (doorIndex ${connection.doorIndex}) is not on the west edge (x=${hitbox.x})`);
      return false;
    }
  } else if (connection.direction === 'north' || connection.direction === 'south') {
    // `roomHeight` (added when the invisible-groundY-floor was removed from
    // player.js so rooms could go deeper/taller than groundY — see
    // roadmap.md Phase 13) is the formal total-vertical-extent field this
    // check was waiting on. Rooms that don't set it (every room built
    // before this) fall back to the old warn-only behavior.
    if (typeof room.roomHeight === 'number') {
      if (connection.direction === 'south') {
        if (hitbox.y + hitbox.h < room.roomHeight - EDGE_TOLERANCE) {
          console.error(`[compass graph] ${room.id}: 'south' door to '${connection.to}' (doorIndex ${connection.doorIndex}) is not on the south edge (y+h=${hitbox.y + hitbox.h}, room.roomHeight=${room.roomHeight})`);
          return false;
        }
      } else {
        if (hitbox.y > EDGE_TOLERANCE) {
          console.error(`[compass graph] ${room.id}: 'north' door to '${connection.to}' (doorIndex ${connection.doorIndex}) is not on the north edge (y=${hitbox.y})`);
          return false;
        }
      }
    } else {
      console.warn(`[compass graph] ${room.id}: '${connection.direction}' door to '${connection.to}' skipped strict edge check (no room-height field yet) — consider edgeExempt:true with a reason if this is intentional.`);
    }
  }
  return true;
}

const OPPOSITE_DIRECTION = { north: 'south', south: 'north', east: 'west', west: 'east' };
const DIRECTION_DELTA = {
  north: { col: 0, row: -1 },
  south: { col: 0, row: 1 },
  east:  { col: 1, row: 0 },
  west:  { col: -1, row: 0 },
};

function validateAreaGraph() {
  let ok = true;

  for (const roomId in AREAS) {
    const room = AREAS[roomId];
    if (!room.connections) continue; // not yet migrated — skip rather than crash

    // Group by direction to catch duplicate `order` values / overlapping doors.
    const byDirection = {};
    for (const conn of room.connections) {
      (byDirection[conn.direction] = byDirection[conn.direction] || []).push(conn);
    }

    for (const dir in byDirection) {
      const group = byDirection[dir];
      const seenOrders = new Set();
      for (const conn of group) {
        if (seenOrders.has(conn.order)) {
          console.error(`[compass graph] ${roomId}: duplicate order ${conn.order} on direction '${dir}'`);
          ok = false;
        }
        seenOrders.add(conn.order);
      }
    }

    for (const conn of room.connections) {
      // 1. Door hitbox is on the correct edge (or explicitly exempted).
      const hitbox = room.transitions && room.transitions[conn.doorIndex];
      if (!assertDoorOnCorrectEdge(room, conn, hitbox)) ok = false;

      // 2. Target room exists.
      const target = AREAS[conn.to];
      if (!target) {
        console.error(`[compass graph] ${roomId}: connection to unknown area '${conn.to}'`);
        ok = false;
        continue;
      }

      // 3. col/row adjacency matches the declared direction — skipped for
      // `shortcut: true` connections (one-way elevators/drops/loops that
      // deliberately don't respect local compass adjacency, e.g. a miniboss
      // arena's reward shortcut straight back to an early hub room).
      if (!conn.shortcut &&
          typeof room.col === 'number' && typeof room.row === 'number' &&
          typeof target.col === 'number' && typeof target.row === 'number') {
        const delta = DIRECTION_DELTA[conn.direction];
        const expectedCol = room.col + delta.col;
        const expectedRow = room.row + delta.row;
        if (target.col !== expectedCol || target.row !== expectedRow) {
          console.error(`[compass graph] ${roomId} -> '${conn.to}' direction '${conn.direction}' implies grid position (${expectedCol},${expectedRow}) but '${conn.to}' is at (${target.col},${target.row})`);
          ok = false;
        }
      }

      // 4. Non-one-way connections must have a matching reverse connection.
      if (!conn.oneWay) {
        const expectedReverseDir = OPPOSITE_DIRECTION[conn.direction];
        const hasReverse = (target.connections || []).some(
          (rc) => rc.to === roomId && rc.direction === expectedReverseDir
        );
        if (!hasReverse) {
          console.error(`[compass graph] ${roomId} -> '${conn.to}' (${conn.direction}) is not marked oneWay but '${conn.to}' has no matching '${expectedReverseDir}' connection back to '${roomId}'`);
          ok = false;
        }
      }
    }
  }

  if (ok) {
    console.log('[compass graph] validated OK — ' + Object.keys(AREAS).length + ' rooms');
  }
  return ok;
}

validateAreaGraph();

// `const AREAS = {...}` above is a top-level script-scope binding, not a
// `window` property (unlike `var`/function declarations) — every in-page
// script can still read it directly by name, but debug/tooling pages that
// reach into a sandboxed iframe via `win.AREAS` (debug_v1.html's R10 check,
// worldmap.html, etc.) got `undefined` and crashed with "Cannot convert
// undefined or null to object". Attach it explicitly so that external
// access keeps working; guarded for Node (export_graph.js's vm sandbox has
// no `window`).
if (typeof window !== 'undefined') window.AREAS = AREAS;

// ═══════════════════════════════════════════════════════════════════════════
// ROOM LAYOUT LINTER — static reachability/safety checks per room.
// See Plans/room_verification_tool_plan.md ("static layout linter"). This is
// the tool that catches the Crag bug class BEFORE a human plays the room:
// unreachable platforms/pickups, uncrossable gaps, doors embedded in solid
// geometry or floating out of reach, and missing physical return doors.
//
// Pure data analysis: no DOM, no simulation — callable from Node (see
// export_graph.js's vm sandbox) and from any of the debug pages. It runs
// automatically once per page load (window 'load' hook at the bottom, AFTER
// player.js has defined the real physics constants), wrapped in try/catch so
// a linter bug can never take the game down with it.
//
// Known model limitations (under-flagging, never false-crashing):
//   - Wall jumps aren't modeled. A room that REQUIRES wall-jumping to
//     traverse will show false "unreachable" failures — none exist today;
//     if one is built, extend _linterReach() rather than ignoring the report.
//   - A wall standing ON a platform doesn't split that platform into two
//     nodes, so items behind an on-floor barrier (the_forge) count as
//     reachable on the first pass. Gated-secret verification still works via
//     the second (all-abilities, walls-broken) pass.
// ═══════════════════════════════════════════════════════════════════════════

// Movement abilities assumed on a first pass through a room that doesn't
// declare its own `expectedLoadout: { onEntry: [...] }`. Default = the full
// current movement kit, so rooms built before the field existed don't
// false-fail; declare the field on new rooms to lint them strictly.
const ROOM_LINTER_DEFAULT_LOADOUT = ['phase_dash'];

// Physics constants come from player.js/ability.js, which load AFTER area.js
// — read them lazily with fallbacks matching those files' current values, so
// standalone tools that only load area.js (worldmap.html, export_graph.js)
// still get correct-enough numbers.
function _linterPhysics() {
  return {
    gravity: (typeof GRAVITY !== 'undefined') ? GRAVITY : 0.6,
    jump: Math.abs((typeof JUMP_FORCE !== 'undefined') ? JUMP_FORCE : -12),
    moveSpeed: (typeof MOVE_SPEED !== 'undefined') ? MOVE_SPEED : 4,
    dashSpeed: (typeof DASH_SPEED !== 'undefined') ? DASH_SPEED : 12,
    dashFrames: (typeof DASH_DURATION !== 'undefined') ? DASH_DURATION : 8,
    phaseDashSpeed: (typeof PHASE_DASH_SPEED !== 'undefined') ? PHASE_DASH_SPEED : 14,
    phaseDashFrames: (typeof PHASE_DASH_DURATION !== 'undefined') ? PHASE_DASH_DURATION : 8,
    playerW: 24,
    playerH: 32,
  };
}

function _linterJumpHeight(phys) {
  // Apex height of a full jump: v^2 / 2g, minus a few px of clearance so the
  // linter never approves a pixel-perfect-only ascent.
  return (phys.jump * phys.jump) / (2 * phys.gravity) - 6;
}

// Max horizontal distance coverable while changing height by `dy`
// (dy = targetTop - sourceTop; negative = climbing). Returns -1 if the rise
// is beyond jump height. Adds the extra distance of one mid-air dash (core
// kit) and one phase dash when the loadout has it.
function _linterReach(phys, dy, loadout) {
  const disc = phys.jump * phys.jump + 2 * phys.gravity * dy;
  if (disc < 0) return -1; // target higher than a full jump can reach
  const airFrames = (phys.jump + Math.sqrt(disc)) / phys.gravity;
  let reach = phys.moveSpeed * airFrames;
  reach += (phys.dashSpeed - phys.moveSpeed) * phys.dashFrames;
  if (loadout.indexOf('phase_dash') !== -1) {
    reach += (phys.phaseDashSpeed - phys.moveSpeed) * phys.phaseDashFrames;
  }
  return reach;
}

// Horizontal distance between two x-intervals (0 when they overlap).
function _linterXGap(ax, aw, bx, bw) {
  if (bx >= ax + aw) return bx - (ax + aw);
  if (ax >= bx + bw) return ax - (bx + bw);
  return 0;
}

// Can the player travel from standing on platform `a` to standing on `b`?
// `blockers` = wall platforms that are solid on this pass.
function _linterEdge(phys, a, b, loadout, blockers) {
  const dy = b.y - a.y;
  const reach = _linterReach(phys, dy, loadout);
  if (reach < 0) return false;
  const gap = _linterXGap(a.x, a.w, b.x, b.w);
  if (gap > reach) return false;

  // Wall in the corridor between the two platforms that can't be jumped
  // over from the takeoff side and can't be walked under?
  const jumpH = _linterJumpHeight(phys);
  const corridorLo = Math.min(a.x + a.w / 2, b.x + b.w / 2);
  const corridorHi = Math.max(a.x + a.w / 2, b.x + b.w / 2);
  for (const w of blockers) {
    if (w.x + w.w < corridorLo || w.x > corridorHi) continue;
    const riseOverWall = a.y - w.y;              // feet must gain this much
    const clearable = riseOverWall <= jumpH;
    const walkUnder = (w.y + w.h) <= Math.min(a.y, b.y) - phys.playerH;
    if (!clearable && !walkUnder) return false;
  }
  return true;
}

// Standable platforms only — walls and destructible panels aren't floors the
// route may rely on (destructibles can be gone; thin walls aren't routes),
// and ceiling pieces (`ceiling: true` — a cave-top boundary that blocks
// upward jumps but is never meant to be landed on, see player.js) aren't
// real standable surfaces either, so they shouldn't be checked for
// reachability the way an actual floor/ledge is.
function _linterStandable(room) {
  return (room.platforms || []).filter((p) => !p.wall && !p.destructible && !p.ceiling);
}

// The platform a body dropped at (cx, fromY) lands on, or null (= void).
function _linterDropTo(platforms, cx, fromY) {
  let best = null;
  for (const p of platforms) {
    if (cx < p.x || cx > p.x + p.w) continue;
    if (p.y < fromY - 2) continue; // platform is above the drop point
    if (!best || p.y < best.y) best = p;
  }
  return best;
}

// Is point (px, py) touchable from standing on / jumping off platform `p`?
// Used for doors, pickups, and lore positions. `h` extends the point into a
// rect (0 for true points).
function _linterPointReachable(phys, p, px, py, w, h, loadout) {
  const bottom = py + h;
  if (bottom < p.y - phys.playerH - _linterJumpHeight(phys)) return false; // too high above
  if (py > p.y + 4) return false; // entirely below the standing surface
  const dx = _linterXGap(p.x, p.w, px, w);
  if (dx === 0) return true;
  const reach = _linterReach(phys, Math.max(py - p.y, -_linterJumpHeight(phys)), loadout);
  return reach >= 0 && dx <= reach;
}

// Flood-fill the set of reachable standable platforms from the given entry
// platforms. O(n^2) over a room's platforms, run once — fine at 10-25
// platforms/room; revisit with an x-sorted sweep if rooms ever get huge.
function _linterFloodFill(phys, platforms, entrySet, loadout, blockers) {
  const reachable = new Set(entrySet);
  let grew = true;
  while (grew) {
    grew = false;
    for (const a of platforms) {
      if (!reachable.has(a)) continue;
      for (const b of platforms) {
        if (reachable.has(b)) continue;
        if (_linterEdge(phys, a, b, loadout, blockers)) {
          reachable.add(b);
          grew = true;
        }
      }
    }
  }
  return reachable;
}

// Entry points into `room`: every transition anywhere in AREAS that targets
// it (toX/toY), tagged with where it comes from for readable reports.
function _linterEntryPoints(roomId) {
  const entries = [];
  for (const otherId in AREAS) {
    for (const t of (AREAS[otherId].transitions || [])) {
      if (t.to === roomId) entries.push({ x: t.toX, y: t.toY, from: otherId });
    }
  }
  return entries;
}

function validateRoomLayout(room) {
  const phys = _linterPhysics();
  const failures = [];
  const loadout = (room.expectedLoadout && room.expectedLoadout.onEntry)
    ? room.expectedLoadout.onEntry
    : ROOM_LINTER_DEFAULT_LOADOUT;

  const standable = _linterStandable(room);
  const walls = (room.platforms || []).filter((p) => p.wall || p.destructible);
  const permanentWalls = walls.filter((p) => !p.destructible);

  // ── 1. Entry points land on real ground ────────────────────────────────
  const entries = _linterEntryPoints(room.id);
  const entryPlatforms = new Set();
  for (const e of entries) {
    const landing = _linterDropTo(standable, e.x + phys.playerW / 2, e.y);
    if (!landing) {
      failures.push(`entry from '${e.from}' spawns at (${e.x},${e.y}) with NO platform beneath — player falls into the void on arrival`);
    } else {
      entryPlatforms.add(landing);
    }
  }
  // Start room / dev rooms: fall back to anchors, then the first platform.
  if (entryPlatforms.size === 0 && entries.length === 0) {
    for (const a of (room.anchors || [])) {
      const landing = _linterDropTo(standable, a.x, a.y);
      if (landing) entryPlatforms.add(landing);
    }
    if (entryPlatforms.size === 0 && standable.length) entryPlatforms.add(standable[0]);
  }

  // ── 2. Reachability flood fill — two passes ─────────────────────────────
  // Pass 1: declared first-pass loadout, walls solid. Pass 2: everything
  // unlocked, destructible walls broken. Unreachable in pass 1 but reachable
  // in pass 2 = a legitimate gated secret; unreachable in BOTH = a bug.
  const pass1 = _linterFloodFill(phys, standable, entryPlatforms, loadout, walls);
  const pass2 = _linterFloodFill(phys, standable, entryPlatforms, ['phase_dash'], permanentWalls);

  for (const p of standable) {
    if (!pass1.has(p) && !pass2.has(p)) {
      failures.push(`platform at (${p.x},${p.y}) ${p.w}x${p.h} is unreachable even with all abilities and destructible walls broken`);
    }
  }

  // Things that must sit on/above a reachable platform.
  const checkPoint = (label, px, py, w, h) => {
    let firstPass = false, anyPass = false;
    for (const p of standable) {
      if (!_linterPointReachable(phys, p, px, py, w, h, ['phase_dash'])) continue;
      if (pass2.has(p)) anyPass = true;
      if (pass1.has(p) && _linterPointReachable(phys, p, px, py, w, h, loadout)) firstPass = true;
      if (firstPass) break;
    }
    if (!anyPass) failures.push(`${label} at (${px},${py}) is unreachable even with all abilities and destructible walls broken`);
    return firstPass;
  };

  if (room.abilityReward) {
    // Ability pickups are critical-path — must be reachable on the FIRST pass.
    const ok = checkPoint(`ability reward '${room.abilityReward.id}'`, room.abilityReward.x, room.abilityReward.y, 0, 0);
    if (!ok && !failures[failures.length - 1]?.startsWith('ability reward')) {
      failures.push(`ability reward '${room.abilityReward.id}' at (${room.abilityReward.x},${room.abilityReward.y}) is not reachable with the room's first-pass loadout [${loadout.join(', ')}]`);
    }
  }
  for (const a of (room.anchors || [])) checkPoint(`anchor #${a.index}`, a.x, a.y, 0, 0);
  for (const l of (room.loreFragments || [])) checkPoint(`lore fragment '${l.id}'`, l.x, l.y, 0, 0);
  for (const fp of (room.fracturePipRewards || [])) checkPoint(`fracture pip '${fp.id}'`, fp.x, fp.y, 0, 0);
  for (const e of (room.enemies || [])) checkPoint(`enemy '${e.type}'`, e.x, e.y, 28, 28);

  // ── 3. Door checks: embedded in geometry / floating out of reach ───────
  (room.transitions || []).forEach((t, i) => {
    // Embedded: the door's entire vertical span sits at/below a solid
    // platform's top surface (the exact Crag Entrance bug — see
    // debug_v1.html R11, which this check supersedes but keeps passing).
    for (const p of (room.platforms || [])) {
      if (p.destructible) continue;
      const xOverlap = t.x < p.x + p.w && t.x + t.w > p.x;
      if (xOverlap && t.y >= p.y - 2 && t.y + t.h > p.y + 5 && t.y < p.y + p.h) {
        failures.push(`transitions[${i}] (to '${t.to}') at (${t.x},${t.y}) ${t.w}x${t.h} is embedded inside the solid platform at (${p.x},${p.y}) — move it up so it overlaps the player's standing box (y: platformTop-${phys.playerH} to platformTop)`);
        return;
      }
    }
    // Touchable: overlaps the standing box of, or is jump-reachable from,
    // at least one platform that is itself reachable.
    let touchable = false;
    for (const p of standable) {
      if (pass2.has(p) && _linterPointReachable(phys, p, t.x, t.y, t.w, t.h, ['phase_dash'])) { touchable = true; break; }
    }
    if (!touchable) {
      failures.push(`transitions[${i}] (to '${t.to}') at (${t.x},${t.y}) ${t.w}x${t.h} doesn't overlap any reachable player standing box and is beyond jump reach — physically untouchable`);
    }
  });

  // ── 4. Gap coverage along the floor — every hole must be crossable ─────
  // Union the standable platforms' x-intervals; every interior gap in that
  // union is a column of pure void, which is only OK if some platform pair
  // spans it within jump/dash range. In rooms without an explicit hazard
  // (pitDeathY < groundY) this is exactly the fall-death class of bug.
  if (standable.length > 1) {
    const byX = standable.slice().sort((a, b) => a.x - b.x);
    let coveredTo = byX[0].x + byX[0].w;
    for (const p of byX) {
      if (p.x > coveredTo) {
        const g0 = coveredTo, g1 = p.x;
        let crossable = false;
        for (const a of byX) {
          if (a.x + a.w < g0 - 1 || a.x + a.w > g0 + 1) continue; // touches gap's left lip
          for (const b of byX) {
            if (b.x < g1 - 1 || b.x > g1 + 1) continue;           // touches gap's right lip
            if (_linterEdge(phys, a, b, loadout, walls) || _linterEdge(phys, b, a, loadout, walls)) { crossable = true; break; }
          }
          if (crossable) break;
        }
        if (!crossable) {
          failures.push(`floor gap x:${g0}-${g1} (${g1 - g0}px) has zero platform coverage and no platform pair can cross it with loadout [${loadout.join(', ')}]`);
        }
      }
      coveredTo = Math.max(coveredTo, p.x + p.w);
    }
  }

  // ── 5. Two-way connections have a physical door back ────────────────────
  // validateAreaGraph() checks the declared connection records; this checks
  // the actual door hitboxes, which is what the player touches.
  for (const conn of (room.connections || [])) {
    if (conn.oneWay) continue;
    const target = AREAS[conn.to];
    if (!target) continue; // validateAreaGraph already errors on this
    const hasBack = (target.transitions || []).some((t) => t.to === room.id);
    if (!hasBack) {
      failures.push(`two-way connection '${conn.direction}' to '${conn.to}' has no physical return door — '${conn.to}' has no transitions[] entry back to '${room.id}'`);
    }
  }

  return { id: room.id, failures };
}

// Lint every real room (dev-only rooms without a compass position are
// skipped, same rule the graph validator and debug tools use). Logs a plain
// per-room report; returns true when every room passes.
function validateAllRoomLayouts() {
  let clean = 0, dirty = 0;
  for (const roomId in AREAS) {
    const room = AREAS[roomId];
    if (typeof room.col !== 'number') continue;
    const result = validateRoomLayout(room);
    if (result.failures.length === 0) {
      clean++;
    } else {
      dirty++;
      console.error(`[room linter] ${roomId}: ${result.failures.length} issue(s)`);
      for (const f of result.failures) console.error(`[room linter]   ✗ ${f}`);
    }
  }
  if (dirty === 0) {
    console.log(`[room linter] all ${clean} rooms passed layout checks`);
  } else {
    console.error(`[room linter] ${dirty} room(s) with layout issues, ${clean} clean`);
  }
  return dirty === 0;
}

// Auto-run once per page load, AFTER every script has loaded so the real
// physics constants from player.js/ability.js are in scope. try/catch so a
// linter defect can never crash the game; guarded for Node (export_graph.js
// runs this file in a vm sandbox with no window).
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    try {
      validateAllRoomLayouts();
    } catch (e) {
      console.error('[room linter] crashed (game unaffected):', e);
    }
  });
}