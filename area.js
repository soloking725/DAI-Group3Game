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
  // ROOM 1 — The Fracture  (tutorial, Phase Dash pickup)
  // Player enters from left. Phase Dash is on the high right platform.
  // One gap (70px) teaches jumping. Exit right leads to Echo Bridge.
  // ─────────────────────────────────────────────────────────────────────────
  the_fracture: {
    id: 'the_fracture',
    name: 'The Fracture',
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
    width: 1000,
    groundY: 900,   // no floor — fall = pit death
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
    width: 1200,
    groundY: 700,
    bgColor: '#080810',
    bgTint: 'rgba(45, 212, 191, 0.05)',
    ambientColor: '#2dd4bf',
    platforms: [
      { x: 30,   y: 130, w: 160, h: 14 },   // entry platform (spawn here)
      { x: 280,  y: 218, w: 120, h: 14 },   // descent step 1
      { x: 100,  y: 318, w: 130, h: 14 },   // descent step 2
      { x: 370,  y: 398, w: 160, h: 14 },   // Shard Shot platform (central)
      // Crystal wall — full-height barrier, blocks right passage until shot
      { x: 680, y: 330, w: 24, h: 370, destructible: true, hp: 3 },
      // Platforms right of wall (reachable after breaking it)
      { x: 720,  y: 420, w: 160, h: 14 },
      { x: 940,  y: 360, w: 140, h: 14 },
      { x: 1060, y: 460, w: 140, h: 14 },
      // Floor
      { x: 0, y: 700, w: 1200, h: 60 },
    ],
    abilityReward: {
      id: 'shard_shot',
      x: 415,
      y: 376,   // 22px above platform at y:398
      name: 'Shard Shot',
      desc: 'V to fire a curved shard. W+V to aim upward. Shatters crystal barriers.',
    },
    transitions: [
      { x: 0,    y: 68, w: 35, h: 82, to: 'echo_bridge', toX: 928, toY: 268 },
      { x: 1165, y: 418, w: 35, h: 60, to: 'the_forge',  toX: 60,  toY: 348 },
    ],
    enemies: [
      { type: 'fractured', x: 308, y: 190 },   // descent step 1: 218-28=190
      { type: 'stutterer', x: 490, y: 370 },   // Shard Shot platform: 398-28=370
      { type: 'fractured', x: 990, y: 332 },   // right of wall: 360-28=332
    ],
    stillpoints: [
      { x: 80, y: 680, index: 0 },   // floor bottom-left, safe respawn: 700-20=680
    ],
    loreFragments: [
      { id: 'lore_cc1', x: 415, y: 358,
        text: '"The crystals grew after the fracture. They are made of frozen time — not metaphor. Shoot one. Listen to what you hear."' },
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
    enemies: [
      { type: 'fractured', x: 250,  y: 362 },   // left zone (ground)
      { type: 'stutterer', x: 620,  y: 362 },   // mid zone (ground, between barriers)
      { type: 'fractured', x: 960,  y: 362 },   // right zone (ground)
      { type: 'stutterer', x: 1100, y: 227 },   // right shelf: 255-28=227
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
    width: 1960,
    groundY: 900,   // no floor — fall = death
    bgColor: '#060610',
    bgTint: 'rgba(80, 40, 160, 0.07)',
    ambientColor: '#7c3aed',
    platforms: [
      // === ENTRY (wide, safe spawn) ===
      { x: 30,   y: 320, w: 200, h: 14 },

      // === SECTION 1: rhythm gaps ~70px, normal jump ===
      { x: 300,  y: 300, w: 100, h: 14 },
      { x: 470,  y: 278, w: 100, h: 14 },   // enemy here
      { x: 640,  y: 298, w: 100, h: 14 },

      // === SECTION 2: Phase Dash mandatory (140px gap) ===
      { x: 820,  y: 268, w: 160, h: 14 },   // wider so patrol enemy doesn't fall off
      { x: 1060, y: 246, w: 100, h: 14 },   // gap 80 (Phase Dash recommended)
      { x: 1220, y: 264, w: 120, h: 14 },

      // === REST PLATFORM — Stillpoint, wide and isolated ===
      { x: 1380, y: 246, w: 220, h: 14 },   // 40px gap from s2 p3 right edge (1340)

      // === SECTION 3: two enemies block passage, use Stillpoint + Phase Dash ===
      // 30px gap from rest platform right edge (1600) → enemies can't walk across
      { x: 1630, y: 258, w: 260, h: 14 },   // 260px wide so patrol stays on platform

      // === EXIT LEDGE — wide enough to actually land on ===
      { x: 1900, y: 225, w: 120, h: 14 },   // 10px gap from s3 right (1890)
    ],
    transitions: [
      { x: 0,    y: 258, w: 35, h: 80, to: 'the_vault',   toX: 828, toY: 348 },
      { x: 1960, y: 158, w: 35, h: 80, to: 'antechamber', toX: 60,  toY: 348 },
    ],
    enemies: [
      { type: 'fractured', x: 490,  y: 250 },   // s1 p2
      { type: 'fractured', x: 880,  y: 240 },   // s2 p1 (Fractured, not Stutterer — no teleporting into void)
      { type: 'fractured', x: 1700, y: 230 },   // s3 left: 258-28=230
      { type: 'fractured', x: 1810, y: 230 },   // s3 right
    ],
    stillpoints: [
      { x: 1450, y: 226, index: 0 },   // rest platform centre: 246-20=226
    ],
    loreFragments: [
      { id: 'lore_tr1', x: 1450, y: 212,
        text: '"The rift does not want to be crossed. It wants you to learn what crossing means. Every gap is a small surrender."' },
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ROOM 7 — Antechamber  (pre-boss rest, final lore, no enemies ever)
  // Stillpoint heals. Final two lore fragments reveal what the King is.
  // ─────────────────────────────────────────────────────────────────────────
  antechamber: {
    id: 'antechamber',
    name: 'Antechamber',
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
    width: 900,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(200, 40, 40, 0.06)',
    ambientColor: '#f87171',
    isBossArena: true,
    platforms: [
      { x: 0,   y: 390, w: 900, h: 60 },   // ground
      { x: 0,   y: 0,   w: 16,  h: 390 },  // left wall (sealed during fight)
      { x: 884, y: 0,   w: 16,  h: 390 },  // right wall
      { x: 130, y: 295, w: 130, h: 14 },   // left platform
      { x: 640, y: 295, w: 130, h: 14 },   // right platform
      { x: 350, y: 210, w: 200, h: 14 },   // centre-high platform
    ],
    // Victory exit — handled by the gameState='victory' flow, no physical door during fight
    transitions: [],
    enemies: [],
    stillpoints: [
      { x: 430, y: 370, index: 0 },   // centre ground, last checkpoint: 390-20=370
    ],
    loreFragments: [],
    abilityReward: null,
    bossSpawn: { x: 400, y: 334 },   // BOSS_Y = groundY - BOSS_HEIGHT = 390-56=334 ✓
  },

};

function getArea(id) {
  return AREAS[id];
}