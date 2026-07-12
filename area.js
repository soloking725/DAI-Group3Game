// Interconnected Metroidvania world — 8 rooms + 1 optional branch
// Progression spine: The Fracture → Echo Bridge → Crystal Cavern → The Forge
//                   → The Vault → The Rift → Antechamber → Boss Arena
//
// COORDINATE RULES (verified per room):
//   Enemy on ground:   y = groundY - 28              (28 = enemy height)
//   Enemy on platform: y = platformY - 28
//   Stillpoint:        y = groundY - 20              (well above floor surface)
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
    stillpoints: [],
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
    abilityReward: {
      id: 'phase_dash',
      x: 695,
      y: 173,   // 22px above platform at y:195
      name: 'Phase Dash',
      desc: 'C — dash through space. Leaves an echo that distracts enemies.',
    },
    transitions: [
      // Exit right → Echo Bridge
      { x: 1365, y: 320, w: 35, h: 70, to: 'echo_bridge', toX: 60, toY: 312 },
      // North branch → Crag of the Colossus, reached from the same high
      // platform as the Phase Dash pickup (placed at the far end of it so
      // it doesn't overlap the pickup's own trigger radius at x:695).
      { x: 760, y: 173, w: 40, h: 22, to: 'crag_entrance', toX: 60, toY: 480, requires: 'phase_dash' },
    ],
    connections: [
      { direction: 'east', to: 'echo_bridge', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'crag_entrance', requires: 'phase_dash', oneWay: false, order: 0, doorIndex: 1,
        edgeExempt: true, edgeExemptReason: 'Reached via a jump to the high mid-room Phase Dash platform, not a side-edge door — same convention as Echo Bridge → Upper Ruins.' },
    ],
    enemies: [
      { type: 'fractured', x: 700,  y: 362 },   // on right ground
      { type: 'fractured', x: 1150, y: 362 },   // near exit, teaches combat
    ],
    stillpoints: [
      { x: 220, y: 370, index: 0 },   // left ground, safe spawn area
    ],
    loreFragments: [
      { id: 'lore_f1', x: 995, y: 150,
        text: '"We built the Stillpoints to anchor time itself. We never imagined what it would mean for one of them to break."' },
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
      //   GAP 165px (x:565 → x:730) — Phase Dash mandatory
      { x: 730, y: 322, w: 140, h: 14 },   // p4 — landing pad post-dash
      { x: 915, y: 298, w: 85,  h: 14 },   // p5 — exit platform
    ],
    transitions: [
      { x: 0,   y: 284, w: 35, h: 82, to: 'the_fracture', toX: 1330, toY: 348 },
      { x: 965, y: 233, w: 35, h: 80, to: 'crystal_cavern', toX: 60, toY: 92 },
      // Optional — Upper Ruins (Phase Dash required, from p4)
      { x: 740, y: 258, w: 80, h: 30, to: 'upper_ruins', toX: 100, toY: 348, requires: 'phase_dash' },
    ],
    connections: [
      { direction: 'west', to: 'the_fracture', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'crystal_cavern', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'north', to: 'upper_ruins', requires: 'phase_dash', oneWay: false, order: 0, doorIndex: 2,
        edgeExempt: true, edgeExemptReason: 'Reached by jumping up from a mid-air platform (room has no floor, groundY=900) — not a side-edge door.' },
    ],
    enemies: [
      { type: 'fractured', x: 530, y: 278 },   // p3: 306-28=278 (Fractured, not Stutterer — Stutterers teleport into void)
    ],
    stillpoints: [
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
    ],
    connections: [
      { direction: 'south', to: 'echo_bridge', requires: null, oneWay: false, order: 0, doorIndex: 0,
        edgeExempt: true, edgeExemptReason: 'Drops back down to Echo Bridge; placed on the west wall for level-design convenience — this room has its own floor, not a literal bottom edge.' },
    ],
    enemies: [
      { type: 'fractured', x: 390, y: 362 },
    ],
    stillpoints: [],
    loreFragments: [
      { id: 'lore_ur1', x: 150, y: 276,
        text: '"Before the fracture, these halls echoed with our voices. Now only the fracture echoes back."' },
      { id: 'lore_ur2', x: 340, y: 216,
        text: '"The King built this place. He was proud of it. He said permanence was the highest art."' },
      { id: 'lore_ur3', x: 695, y: 206,
        text: '"He was wrong. Nothing permanent survives time. Permanence just means you suffer longer when it ends."' },
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
    abilityReward: { id:'shard_shot', x:415, y:376, name:'Shard Shot', desc:"V to fire. W+V upward. Shatters crystal walls." },
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
    stillpoints: [
      { x:60, y:100, index:0 }
    ],
    loreFragments: [
      { id:'lore_cc1', x:415, y:358, text:"\"The crystals are made of frozen time.\"" }
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
    ],
    connections: [
      { direction: 'west', to: 'crystal_cavern', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'the_vault', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [
      { type: 'fractured', x: 250,  y: 362 },   // left zone (ground)
      { type: 'stutterer', x: 620,  y: 362 },   // mid zone (ground, between barriers)
      { type: 'fractured', x: 960,  y: 362 },   // right zone (ground)
      { type: 'stutterer', x: 1100, y: 227 },   // right shelf: 255-28=227
      { type: 'crystal_sentinel', x: 600, y: 320 },
    ],
    stillpoints: [
      { x: 180, y: 370, index: 0 },   // left of barrier 1, safe entry zone: 390-20=370
    ],
    loreFragments: [
      { id: 'lore_tf1', x: 600, y: 244,
        text: '"He forged his own prison here. Every barrier he built was one more thing that could not bend — and so had to break."' },
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ROOM 5 — The Vault  (Stillpoint pickup, rest room, no enemies)
  // Two Stillpoints — each heals 1 health when first activated.
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
    abilityReward: {
      id: 'stillpoint',
      x: 420,
      y: 174,   // 22px above altar at y:196
      name: 'Stillpoint',
      desc: 'Q — slow the world to 15% speed. Recharges by hitting enemies.',
    },
    transitions: [
      { x: 0,   y: 325, w: 35, h: 65, to: 'the_forge', toX: 1230, toY: 348 },
      // Exit requires Stillpoint — the door is locked until you pick it up
      { x: 865, y: 325, w: 35, h: 65, to: 'the_rift',  toX: 60,   toY: 282, requires: 'stillpoint' },
    ],
    connections: [
      { direction: 'west', to: 'the_forge', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'the_rift', requires: 'stillpoint', oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],   // rest room — no combat
    stillpoints: [
      { x: 140, y: 370, index: 0 },   // entry side: 390-20=370
      { x: 730, y: 370, index: 1 },   // exit side (heals before The Rift)
    ],
    loreFragments: [
      { id: 'lore_tv1', x: 260, y: 265,
        text: '"Stillpoint: the moment between moments. He stole ours. We kept one hidden here — for whoever came next."' },
      { id: 'lore_tv2', x: 620, y: 265,
        text: '"Go. He is waiting. He has always been waiting. Since the fracture he cannot do anything else."' },
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
    stillpoints: [
      { x:1450, y:226, index:0 }
    ],
    loreFragments: [
      { id:'lore_tr1', x:1450, y:212, text:"\"Every gap is a small surrender.\"" }
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ROOM 7 — Antechamber  (pre-boss rest, final lore, no enemies ever)
  // Stillpoint heals. Final two lore fragments reveal what the King is.
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
    stillpoints: [
      { x: 330, y: 370, index: 0 },   // centre ground, full heal
    ],
    loreFragments: [
      { id: 'lore_ac1', x: 220, y: 268,
        text: '"He was the first of us to step into the fracture. He did it to seal it. He is still there. He is still trying."' },
      { id: 'lore_ac2', x: 395, y: 202,
        text: '"The Fractured King does not want your death. He wants someone to finally stop him. He cannot stop himself."' },
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ROOM 8 — Boss Arena  (The Fractured King)
  // Sealed walls. Three platforms for vertical mobility.
  // Stillpoint in safe corner. No exit during fight.
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
    stillpoints: [
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
    stillpoints: [
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
    stillpoints: [
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
  // (Tier 1 — can't be missed). Stillpoint checkpoint before the exit to
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

      // Symmetrical high side ledges — decorative verticality + optional lore
      { x: 700,  y: 340, w: 160, h: 20 },
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
    stillpoints: [
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
                             // Colossus Core's own spawn/seal logic is Task 7, not wired up yet.
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
    enemies: [],   // Colossus Core is spawned via bossSpawn/miniboss, not the generic enemies array — see Task 7
    stillpoints: [],
    loreFragments: [],
    abilityReward: null,
    bossSpawn: { x: 950, y: 440 },   // groundY(500) - miniboss height, refine once Colossus Core's class exists (Task 7)
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
//                         // for vertical/drop connections that don't have a
//                         // formal room-height field to validate against yet
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
    // No formal room-height field exists yet to validate against — rooms only
    // declare groundY, not a total vertical extent. Warn rather than fail so
    // north/south connections aren't forced into edgeExempt unnecessarily,
    // but don't block on it. Revisit once rooms carry explicit height data.
    console.warn(`[compass graph] ${room.id}: '${connection.direction}' door to '${connection.to}' skipped strict edge check (no room-height field yet) — consider edgeExempt:true with a reason if this is intentional.`);
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