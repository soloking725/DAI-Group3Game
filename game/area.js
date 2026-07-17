// =====================================================================
// area.js – Metroidvania world map (updated from mermaid diagram)
// =====================================================================
// Notes on items not yet fully implemented:
//   - "cosmetic upgrades" are placeholders (no game effect yet)
//   - "post-game" locks (Sovereign Rooms) require a postGame flag
//   - Void Tether choice (Timeline X Roads, Room 2) is represented as
//     an ability reward, but the "give up the Child" branch is omitted
//     for now; you can extend it later with a flag.
//   - Some requirements like "requires Timeline X Roads, Room 2" are
//     implemented as ability flags (timeline_x_roads_2_visited)
//   - Minibosses use roomType: 'miniboss' and a miniboss id; the actual
//     boss logic is not defined here – they are placeholders.
// =====================================================================

const AREAS = {

  // ─────────────────────────────────────────────────────────────────────
  // SPAWN AREA 1 (cosmetic upgrade only)
  // ─────────────────────────────────────────────────────────────────────
    spawn_area_1: {
    id: 'spawn_area_1',
    name: 'Spawn Area',
    region: 'origin',
    col: -1,
    row: 0,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(196,181,253,0.02)',
    ambientColor: '#6a6a8e',
    platforms: [
      {
        x: 0,
        y: 390,
        w: 900,
        h: 60
      },
      {
        x: 0,
        y: 280,
        w: 80,
        h: 20,
        destructible: false
      }
    ],
    transitions: [
      {
        x: 865,
        y: 326,
        w: 35,
        h: 64,
        to: 'tutorial_area',
        toX: 60,
        toY: 310
      }
    ],
    connections: [
      {
        direction: 'east',
        to: 'tutorial_area',
        requires: null,
        oneWay: false,
        order: 0,
        doorIndex: 0
      }
    ],
    enemies: [],
    anchors: [
      {
        x: 30,
        y: 240,
        index: 0
      }
    ],
    abilityReward: null,
    loreFragments: [],
    fracturePipRewards: []
  },

  // ─────────────────────────────────────────────────────────────────────
  // TUTORIAL AREA
  // ─────────────────────────────────────────────────────────────────────
    tutorial_area: {
    id: 'tutorial_area',
    name: 'Tutorial Area',
    region: 'origin',
    col: 0,
    row: 0,
    width: 1520,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(196,181,253,0.02)',
    ambientColor: '#6a6a8e',
    platforms: [
      {
        x: 0,
        y: 390,
        w: 1520,
        h: 60
      },
      {
        x: 380,
        y: 300,
        w: 140,
        h: 14
      }
    ],
    transitions: [
      {
        x: 1480,
        y: 320,
        w: 35,
        h: 64,
        to: 'the_fracture_part1',
        toX: 60,
        toY: 310
      }
    ],
    connections: [
      {
        direction: 'east',
        to: 'the_fracture_part1',
        requires: null,
        oneWay: true,
        order: 0,
        doorIndex: 0
      }
    ],
    enemies: [],
    anchors: [
      {
        x: 140,
        y: 370,
        index: 0
      }
    ],
    loreFragments: [],
    abilityReward: null
  },

  // ─────────────────────────────────────────────────────────────────────
  // THE FRACTURE – PART 1 (fast travel)
  // ─────────────────────────────────────────────────────────────────────
   the_fracture_part1: {
    id: 'the_fracture_part1',
    name: 'The Fracture, part 1',
    region: 'origin',
    col: 1,
    row: 0,
    width: 1200,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(100,60,150,0.03)',
    ambientColor: '#c4b5fd',
    platforms: [
      {
        x: 0,
        y: 390,
        w: 1200,
        h: 60
      },
      {
        x: 500,
        y: 300,
        w: 200,
        h: 14
      }
    ],
    transitions: [
      {
        x: 0,
        y: 326,
        w: 35,
        h: 64,
        to: 'tutorial_area',
        toX: 830,
        toY: 310
      },
      {
        x: 1165,
        y: 326,
        w: 35,
        h: 64,
        to: 'the_fracture_part3',
        toX: 60,
        toY: 310
      },
      {
        x: 640,
        y: 250,
        w: 40,
        h: 40,
        to: 'the_fracture_part2',
        toX: 580,
        toY: 60
      },
      {
        x: 510,
        y: 250,
        w: 40,
        h: 40,
        to: 'crag_entrance',
        toX: 60,
        toY: 450,
        requires: 'phase_dash'
      }
    ],
    connections: [
      {
        direction: 'west',
        to: 'tutorial_area',
        requires: null,
        oneWay: true,
        order: 0,
        doorIndex: 0
      },
      {
        direction: 'east',
        to: 'the_fracture_part3',
        requires: null,
        oneWay: false,
        order: 0,
        doorIndex: 1
      },
      {
        direction: 'south',
        to: 'the_fracture_part2',
        requires: null,
        oneWay: false,
        order: 0,
        doorIndex: 2
      },
      {
        direction: 'north',
        to: 'crag_entrance',
        requires: 'phase_dash',
        oneWay: false,
        order: 0,
        doorIndex: 3
      }
    ],
    enemies: [],
    anchors: [
      {
        x: 140,
        y: 370,
        index: 0
      }
    ],
    loreFragments: [],
    abilityReward: null
  },

  // ─────────────────────────────────────────────────────────────────────
  // THE FRACTURE – PART 2
  // ─────────────────────────────────────────────────────────────────────
  the_fracture_part2: {
    id: 'the_fracture_part2',
    name: 'The Fracture, part 2',
    region: 'origin',
    col: 1, row: 1,
    width: 1200,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(100,60,150,0.03)',
    ambientColor: '#c4b5fd',
    platforms: [
      { x: 0, y: 390, w: 1200, h: 60 },
    ],
    transitions: [
      // North → part 1
      { x: 580, y: 0, w: 40, h: 40, to: 'the_fracture_part1', toX: 580, toY: 450 },
      // South → Mirror Veil Gate (fast travel)
      { x: 580, y: 450, w: 40, h: 40, to: 'mirror_veil_gate', toX: 580, toY: 60 },
      // East → Sovereign Room 1 (post‑game locked)
      { x: 1165, y: 326, w: 35, h: 64, to: 'sovereign_room1', toX: 60, toY: 310, requires: 'post_game' },
    ],
    connections: [
      { direction: 'north', to: 'the_fracture_part1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'south', to: 'mirror_veil_gate', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'east', to: 'sovereign_room1', requires: 'post_game', oneWay: false, order: 0, doorIndex: 2 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // THE FRACTURE – PART 3
  // ─────────────────────────────────────────────────────────────────────
  the_fracture_part3: {
    id: 'the_fracture_part3',
    name: 'The Fracture, part 3',
    region: 'origin',
    col: 2, row: 0,
    width: 1200,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(100,60,150,0.03)',
    ambientColor: '#c4b5fd',
    platforms: [
      { x: 0, y: 390, w: 1200, h: 60 },
    ],
    transitions: [
      // West → part 1
      { x: 0, y: 326, w: 35, h: 64, to: 'the_fracture_part1', toX: 1130, toY: 310 },
      // East → part 4
      { x: 1165, y: 326, w: 35, h: 64, to: 'the_fracture_part4', toX: 60, toY: 310 },
      // North → Chrono Space Rift Echo (requires Void Tether)
      { x: 580, y: 0, w: 40, h: 40, to: 'chrono_rift_echo', toX: 60, toY: 450, requires: 'void_tether' },
    ],
    connections: [
      { direction: 'west', to: 'the_fracture_part1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'the_fracture_part4', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'north', to: 'chrono_rift_echo', requires: 'void_tether', oneWay: false, order: 0, doorIndex: 2 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // THE FRACTURE – PART 4
  // ─────────────────────────────────────────────────────────────────────
  the_fracture_part4: {
    id: 'the_fracture_part4',
    name: 'The Fracture, part 4',
    region: 'origin',
    col: 3, row: 0,
    width: 1200,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(100,60,150,0.03)',
    ambientColor: '#c4b5fd',
    platforms: [
      { x: 0, y: 390, w: 1200, h: 60 },
    ],
    transitions: [
      // West → part 3
      { x: 0, y: 326, w: 35, h: 64, to: 'the_fracture_part3', toX: 1130, toY: 310 },
      // East → Echo Bridge part 1
      { x: 1165, y: 326, w: 35, h: 64, to: 'echo_bridge_part1', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'west', to: 'the_fracture_part3', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'echo_bridge_part1', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // CRAG ENTRANCE (fast travel, entry requires phase dash)
  // ─────────────────────────────────────────────────────────────────────
  crag_entrance: {
    id: 'crag_entrance',
    name: 'Crag Entrance',
    region: 'crag',
    col: 1, row: -1,
    mapAccent: '#d97757',
    width: 1200,
    groundY: 390,
    bgColor: '#120a06',
    bgTint: 'rgba(180,90,40,0.05)',
    ambientColor: '#d97757',
    platforms: [
      { x: 0, y: 390, w: 1200, h: 60 },
    ],
    transitions: [
      // South → The Fracture part1 (back)
      { x: 580, y: 450, w: 40, h: 40, to: 'the_fracture_part1', toX: 580, toY: 0 },
      // North → Crag Breach
      { x: 580, y: 0, w: 40, h: 40, to: 'crag_breach', toX: 60, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'the_fracture_part1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'crag_breach', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // CRAG BREACH
  // ─────────────────────────────────────────────────────────────────────
  crag_breach: {
    id: 'crag_breach',
    name: 'Crag Breach',
    region: 'crag',
    col: 1, row: -2,
    mapAccent: '#d97757',
    width: 1200,
    groundY: 390,
    bgColor: '#0f0805',
    bgTint: 'rgba(160,70,30,0.06)',
    ambientColor: '#c2703d',
    platforms: [
      { x: 0, y: 390, w: 1200, h: 60 },
    ],
    transitions: [
      // South → Crag Entrance
      { x: 580, y: 450, w: 40, h: 40, to: 'crag_entrance', toX: 580, toY: 0 },
      // North → Crag Altar
      { x: 580, y: 0, w: 40, h: 40, to: 'crag_altar', toX: 60, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'crag_entrance', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'crag_altar', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // CRAG ALTAR (unlocks charged attack)
  // ─────────────────────────────────────────────────────────────────────
  crag_altar: {
    id: 'crag_altar',
    name: 'Crag Altar',
    region: 'crag',
    col: 1, row: -3,
    mapAccent: '#d97757',
    width: 1200,
    groundY: 390,
    bgColor: '#0d0704',
    bgTint: 'rgba(217,119,87,0.08)',
    ambientColor: '#fb923c',
    platforms: [
      { x: 0, y: 390, w: 1200, h: 60 },
      { x: 480, y: 280, w: 240, h: 14 }, // altar platform
    ],
    abilityReward: {
      id: 'charged_attack',
      x: 600,
      y: 258, // above platform
      name: 'Charged Attack',
      desc: 'Hold Z/J to charge a heavy strike.',
    },
    // Strike-open healing crystal (healing.js, 2026-07-16) — full heal,
    // regrows on the next anchor rest. First placement; keep these SPARSE
    // (0–2 per region, exploration nooks) per Plans/healing_items_plan.md.
    healingCrystals: [
      { id: 'hc_crag_altar_1', x: 80, y: 390 },
    ],
    transitions: [
      // South → Crag Breach
      { x: 580, y: 450, w: 40, h: 40, to: 'crag_breach', toX: 580, toY: 0 },
      // North → Crag Warden (miniboss)
      { x: 580, y: 0, w: 40, h: 40, to: 'crag_warden', toX: 60, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'crag_breach', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'crag_warden', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    fracturePipRewards: [],
  },

  // ─────────────────────────────────────────────────────────────────────
  // CRAG WARDEN (miniboss)
  // ─────────────────────────────────────────────────────────────────────
  crag_warden: {
    id: 'crag_warden',
    name: 'Crag Warden',
    region: 'crag',
    col: 1, row: -4,
    mapAccent: '#d97757',
    roomType: 'miniboss',
    miniboss: 'colossus_core',
    width: 1200,
    groundY: 390,
    bgColor: '#0a0503',
    bgTint: 'rgba(217,119,87,0.1)',
    ambientColor: '#fb923c',
    platforms: [
      { x: 0, y: 390, w: 1200, h: 60 },
      { x: 500, y: 300, w: 200, h: 14 }, // reposition platform
    ],
    transitions: [
      // South → Crag Altar
      { x: 580, y: 450, w: 40, h: 40, to: 'crag_altar', toX: 580, toY: 0 },
      // One‑way shortcut to Echo Bridge part 1 (reward)
      { x: 1100, y: 326, w: 35, h: 64, to: 'echo_bridge_part1', toX: 60, toY: 310, requires: null, oneWay: true },
      // East → Sovereign Room 3 (post‑game)
      { x: 1165, y: 326, w: 35, h: 64, to: 'sovereign_room3', toX: 60, toY: 310, requires: 'post_game' },
    ],
    connections: [
      { direction: 'south', to: 'crag_altar', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'echo_bridge_part1', requires: null, oneWay: true, order: 1, doorIndex: 1, shortcut: true },
      { direction: 'east', to: 'sovereign_room3', requires: 'post_game', oneWay: false, order: 2, doorIndex: 2 },
    ],
    enemies: [],
    anchors: [],
    loreFragments: [
      { id: 'lore_cw1', x: 600, y: 360, text: 'A heart doesn\'t ask what it\'s protecting.' }
    ],
    abilityReward: null,
    bossSpawn: { x: 600, y: 334 },
  },

  // ─────────────────────────────────────────────────────────────────────
  // MIRROR VEIL – GATE (fast travel)
  // ─────────────────────────────────────────────────────────────────────
  mirror_veil_gate: {
    id: 'mirror_veil_gate',
    name: 'Mirror Veil — Gate',
    region: 'mirror_veil',
    mapAccent: '#c084fc',
    col: 2, row: -2,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a12',
    bgTint: 'rgba(192,132,252,0.05)',
    ambientColor: '#c084fc',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
    ],
    transitions: [
      // North → Reflection
      { x: 420, y: 0, w: 60, h: 40, to: 'mirror_veil_reflection', toX: 420, toY: 450 },
      // South → The Fracture part2 (back)
      { x: 420, y: 450, w: 60, h: 40, to: 'the_fracture_part2', toX: 420, toY: 0 },
      // East → Timeline X Roads Room 1 (fast travel)
      { x: 865, y: 326, w: 35, h: 64, to: 'timeline_x_roads_room1', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'north', to: 'mirror_veil_reflection', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'south', to: 'the_fracture_part2', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'east', to: 'timeline_x_roads_room1', requires: null, oneWay: false, order: 0, doorIndex: 2 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // MIRROR VEIL – REFLECTION (1 lore pip)
  // ─────────────────────────────────────────────────────────────────────
  mirror_veil_reflection: {
    id: 'mirror_veil_reflection',
    name: 'Mirror Veil — Reflection',
    region: 'mirror_veil',
    mapAccent: '#c084fc',
    col: 2, row: -3,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a12',
    bgTint: 'rgba(192,132,252,0.06)',
    ambientColor: '#c084fc',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
      { x: 380, y: 300, w: 140, h: 14 }, // for lore fragment
    ],
    transitions: [
      // South → Gate
      { x: 420, y: 450, w: 60, h: 40, to: 'mirror_veil_gate', toX: 420, toY: 0 },
      // North → Hollow
      { x: 420, y: 0, w: 60, h: 40, to: 'mirror_veil_hollow', toX: 420, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'mirror_veil_gate', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'mirror_veil_hollow', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [
      { id: 'lore_mvr1', x: 450, y: 276, text: 'The reflection knows what you will become.' }
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // MIRROR VEIL – HOLLOW (miniboss)
  // ─────────────────────────────────────────────────────────────────────
  mirror_veil_hollow: {
    id: 'mirror_veil_hollow',
    name: 'Mirror Veil — Hollow',
    region: 'mirror_veil',
    mapAccent: '#c084fc',
    col: 2, row: -4,
    roomType: 'miniboss',
    miniboss: 'hollow_guardian',
    width: 900,
    groundY: 390,
    bgColor: '#0a0a12',
    bgTint: 'rgba(192,132,252,0.07)',
    ambientColor: '#c084fc',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
      { x: 380, y: 300, w: 140, h: 14 },
    ],
    transitions: [
      // South → Reflection
      { x: 420, y: 450, w: 60, h: 40, to: 'mirror_veil_reflection', toX: 420, toY: 0 },
      // North → Sanctum
      { x: 420, y: 0, w: 60, h: 40, to: 'mirror_veil_sanctum', toX: 420, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'mirror_veil_reflection', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'mirror_veil_sanctum', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
    bossSpawn: { x: 450, y: 334 },
  },

  // ─────────────────────────────────────────────────────────────────────
  // MIRROR VEIL – SANCTUM (unlocks Phase Dash)
  // ─────────────────────────────────────────────────────────────────────
  mirror_veil_sanctum: {
    id: 'mirror_veil_sanctum',
    name: 'Mirror Veil — Sanctum',
    region: 'mirror_veil',
    mapAccent: '#c084fc',
    col: 2, row: -5,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a12',
    bgTint: 'rgba(192,132,252,0.08)',
    ambientColor: '#c084fc',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
      { x: 380, y: 280, w: 140, h: 14 }, // altar
    ],
    abilityReward: {
      id: 'phase_dash',
      x: 450,
      y: 258,
      name: 'Phase Dash',
      desc: 'C – dash through space.',
    },
    transitions: [
      // South → Hollow
      { x: 420, y: 450, w: 60, h: 40, to: 'mirror_veil_hollow', toX: 420, toY: 0 },
      // North → Mirror Corridor
      { x: 420, y: 0, w: 60, h: 40, to: 'mirror_corridor', toX: 420, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'mirror_veil_hollow', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'mirror_corridor', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
  },

  // ─────────────────────────────────────────────────────────────────────
  // MIRROR CORRIDOR
  // ─────────────────────────────────────────────────────────────────────
  mirror_corridor: {
    id: 'mirror_corridor',
    name: 'Mirror Corridor',
    region: 'mirror_veil',
    mapAccent: '#c084fc',
    col: 2, row: -6,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a12',
    bgTint: 'rgba(192,132,252,0.05)',
    ambientColor: '#c084fc',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
    ],
    transitions: [
      // South → Sanctum
      { x: 420, y: 450, w: 60, h: 40, to: 'mirror_veil_sanctum', toX: 420, toY: 0 },
      // North → Event Horizon Gate (fast travel)
      { x: 420, y: 0, w: 60, h: 40, to: 'event_horizon_gate', toX: 420, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'mirror_veil_sanctum', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'event_horizon_gate', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    // INTERIM placement (2026-07-16, see Plans/combat_ai_overhaul_plan.md §A):
    // story-wise Void Tether comes from the give-up-the-Child choice, which
    // needs the cutscene/choice sequence — until that's built, this pickup
    // makes the ability reachable in normal play (Mirror Corridor is already
    // gated behind child_choice_resolved in the floor plan, so the location
    // is at least thematically post-choice). Move the grant into the Child
    // choice when that scene exists.
    abilityReward: {
      id: 'void_tether',
      x: 700,
      y: 340,
      name: 'Void Tether',
      desc: 'R pulls the enemy you face to you — or you to a wall.',
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // ECHO BRIDGE – PART 1 (meet the Child, +1 max health)
  // ─────────────────────────────────────────────────────────────────────
  echo_bridge_part1: {
    id: 'echo_bridge_part1',
    name: 'Echo Bridge, part 1',
    region: 'origin',
    col: 4, row: 0,
    width: 1200,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(140,80,200,0.04)',
    ambientColor: '#8b5cf6',
    platforms: [
      { x: 0, y: 390, w: 1200, h: 60 },
      { x: 500, y: 300, w: 200, h: 14 }, // platform for max health pickup
    ],
    abilityReward: {
      id: 'max_health_upgrade_1',
      x: 600,
      y: 278,
      name: 'Max Health +1',
      desc: 'Increases max health by 1.',
    },
    transitions: [
      // West → The Fracture part4
      { x: 0, y: 326, w: 35, h: 64, to: 'the_fracture_part4', toX: 1130, toY: 310 },
      // East → Upper Ruins
      { x: 1165, y: 326, w: 35, h: 64, to: 'upper_ruins', toX: 60, toY: 310 },
      // North → The Void Expanse Room 1 (locked until prison sequence finished)
      { x: 580, y: 0, w: 40, h: 40, to: 'void_expanse_room1', toX: 60, toY: 450, requires: 'prison_sequence_finished' },
      // North (another) → Observatory Room 2 (requires Void Tether? Actually diagram: requires Void Tether? It says "entry requires Graviton Surge" for Observatory Room 2, but from Echo Bridge part1 it goes to Observatory Room 2 with Graviton Surge? The edge says: Echo_Bridge_part_1_m_99e4e301 -->|Void Tether is required for this path| Observatory_Room_2_e_b28df5db. So requires void_tether.
      { x: 600, y: 0, w: 40, h: 40, to: 'observatory_room2', toX: 60, toY: 450, requires: 'void_tether' },
      // East → Crystal Cavern
      { x: 1165, y: 326, w: 35, h: 64, to: 'crystal_cavern', toX: 60, toY: 310 },
      // East → Timeline X Roads Room 1 (fast travel) – but diagram shows Echo Bridge part1 -> Timeline X Roads Room 1, so add another door
      { x: 1100, y: 326, w: 35, h: 64, to: 'timeline_x_roads_room1', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'west', to: 'the_fracture_part4', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'upper_ruins', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'north', to: 'void_expanse_room1', requires: 'prison_sequence_finished', oneWay: false, order: 0, doorIndex: 2 },
      { direction: 'north', to: 'observatory_room2', requires: 'void_tether', oneWay: false, order: 1, doorIndex: 3 },
      { direction: 'east', to: 'crystal_cavern', requires: null, oneWay: false, order: 1, doorIndex: 4 },
      { direction: 'east', to: 'timeline_x_roads_room1', requires: null, oneWay: false, order: 2, doorIndex: 5 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    fracturePipRewards: [],
  },

  // ─────────────────────────────────────────────────────────────────────
  // ECHO BRIDGE PRISON (1 cosmetic upgrade)
  // ─────────────────────────────────────────────────────────────────────
  echo_bridge_prison: {
    id: 'echo_bridge_prison',
    name: 'Echo Bridge Prison',
    region: 'origin',
    col: 5, row: 1,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(140,80,200,0.04)',
    ambientColor: '#8b5cf6',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
      { x: 380, y: 300, w: 140, h: 14 }, // cosmetic placeholder
    ],
    transitions: [
      // West → Timeline X Roads Room 2 (after prison)
      { x: 0, y: 326, w: 35, h: 64, to: 'timeline_x_roads_room2', toX: 830, toY: 310 },
      // East → Event Horizon Pull (or other)
      { x: 865, y: 326, w: 35, h: 64, to: 'event_horizon_pull', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'west', to: 'timeline_x_roads_room2', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'event_horizon_pull', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null, // cosmetic only, ignore
  },

  // ─────────────────────────────────────────────────────────────────────
  // UPPER RUINS
  // ─────────────────────────────────────────────────────────────────────
  upper_ruins: {
    id: 'upper_ruins',
    name: 'Upper Ruins',
    region: 'origin',
    col: 5, row: 0,
    mapAccent: '#fbbf24',
    width: 800,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(160,120,80,0.04)',
    ambientColor: '#fbbf24',
    platforms: [
      { x: 0, y: 390, w: 800, h: 60 },
    ],
    transitions: [
      // West → Echo Bridge part1
      { x: 0, y: 326, w: 35, h: 64, to: 'echo_bridge_part1', toX: 1130, toY: 310 },
      // North → Pacifist Region
      { x: 380, y: 0, w: 40, h: 40, to: 'pacifist_region', toX: 380, toY: 450 },
    ],
    connections: [
      { direction: 'west', to: 'echo_bridge_part1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'pacifist_region', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // PACIFIST REGION (1 lore pip)
  // ─────────────────────────────────────────────────────────────────────
  pacifist_region: {
    id: 'pacifist_region',
    name: 'Pacifist Region',
    region: 'origin',
    col: 5, row: -1,
    width: 800,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(160,120,80,0.04)',
    ambientColor: '#fbbf24',
    platforms: [
      { x: 0, y: 390, w: 800, h: 60 },
      { x: 340, y: 300, w: 120, h: 14 },
    ],
    transitions: [
      // South → Upper Ruins
      { x: 380, y: 450, w: 40, h: 40, to: 'upper_ruins', toX: 380, toY: 0 },
    ],
    connections: [
      { direction: 'south', to: 'upper_ruins', requires: null, oneWay: false, order: 0, doorIndex: 0 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [
      { id: 'lore_pr1', x: 400, y: 276, text: 'Peace is a choice, not a victory.' }
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // CRYSTAL CAVERN (unlocks Shard Shot)
  // ─────────────────────────────────────────────────────────────────────
  crystal_cavern: {
    id: 'crystal_cavern',
    name: 'Crystal Cavern',
    region: 'origin',
    col: 6, row: 0,
    width: 1200,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(45,212,191,0.05)',
    ambientColor: '#2dd4bf',
    platforms: [
      { x: 0, y: 390, w: 1200, h: 60 },
      { x: 500, y: 280, w: 200, h: 14 }, // altar
    ],
    abilityReward: {
      id: 'shard_shot',
      x: 600,
      y: 258,
      name: 'Shard Shot',
      desc: 'Hold V to aim, release to fire.',
    },
    transitions: [
      // West → Echo Bridge part1
      { x: 0, y: 326, w: 35, h: 64, to: 'echo_bridge_part1', toX: 1130, toY: 310 },
      // East → Echoing Abyss Room 1
      { x: 1165, y: 326, w: 35, h: 64, to: 'echoing_abyss_room1', toX: 60, toY: 310 },
      // North → Timeline X Roads Room 3 (requires Void Tether)
      { x: 580, y: 0, w: 40, h: 40, to: 'timeline_x_roads_room3', toX: 60, toY: 450, requires: 'void_tether' },
      // East (another) → Timeline X Roads Room 1 (fast travel)
      { x: 1100, y: 326, w: 35, h: 64, to: 'timeline_x_roads_room1', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'west', to: 'echo_bridge_part1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'echoing_abyss_room1', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'north', to: 'timeline_x_roads_room3', requires: 'void_tether', oneWay: false, order: 0, doorIndex: 2 },
      { direction: 'east', to: 'timeline_x_roads_room1', requires: null, oneWay: false, order: 1, doorIndex: 3 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    fracturePipRewards: [],
  },

  // ─────────────────────────────────────────────────────────────────────
  // ECHOING ABYSS ROOM 1 (fast travel, entry requires Phase Dash)
  // ─────────────────────────────────────────────────────────────────────
  echoing_abyss_room1: {
    id: 'echoing_abyss_room1',
    name: 'Echoing Abyss Room 1',
    region: 'abyss',
    col: 7, row: 0,
    mapAccent: '#0CFFD3',
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(12,255,211,0.05)',
    ambientColor: '#0CFFD3',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
    ],
    transitions: [
      // West → Crystal Cavern
      { x: 0, y: 326, w: 35, h: 64, to: 'crystal_cavern', toX: 1130, toY: 310 },
      // East → Echoing Abyss Room 2
      { x: 965, y: 326, w: 35, h: 64, to: 'echoing_abyss_room2', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'west', to: 'crystal_cavern', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'echoing_abyss_room2', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // ECHOING ABYSS ROOM 2 (miniboss, 1 lore pip)
  // ─────────────────────────────────────────────────────────────────────
  echoing_abyss_room2: {
    id: 'echoing_abyss_room2',
    name: 'Echoing Abyss Room 2',
    region: 'abyss',
    col: 8, row: 0,
    mapAccent: '#0CFFD3',
    roomType: 'miniboss',
    miniboss: 'abyss_guardian',
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(12,255,211,0.07)',
    ambientColor: '#0CFFD3',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
      { x: 400, y: 300, w: 200, h: 14 },
    ],
    transitions: [
      // West → Echoing Abyss Room 1
      { x: 0, y: 326, w: 35, h: 64, to: 'echoing_abyss_room1', toX: 930, toY: 310 },
    ],
    connections: [
      { direction: 'west', to: 'echoing_abyss_room1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [
      { id: 'lore_ea2_1', x: 500, y: 276, text: 'The abyss echoes back only what you bring.' }
    ],
    abilityReward: null,
    bossSpawn: { x: 500, y: 334 },
  },

  // ─────────────────────────────────────────────────────────────────────
  // TIMELINE X ROADS – ROOM 1 (fast travel)
  // ─────────────────────────────────────────────────────────────────────
  timeline_x_roads_room1: {
    id: 'timeline_x_roads_room1',
    name: 'Timeline X Roads, Room 1',
    region: 'timeline',
    mapAccent: '#8E00FF',
    col: 3, row: 1,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(142,0,255,0.05)',
    ambientColor: '#8E00FF',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
    ],
    transitions: [
      // West → Mirror Veil Gate
      { x: 0, y: 326, w: 35, h: 64, to: 'mirror_veil_gate', toX: 830, toY: 310 },
      // East → Timeline X Roads Room 2
      { x: 965, y: 326, w: 35, h: 64, to: 'timeline_x_roads_room2', toX: 60, toY: 310 },
      // East → Echo Bridge Prison (conditional: cannot go if coming from mandatory order? We'll simplify: allow)
      { x: 900, y: 326, w: 35, h: 64, to: 'echo_bridge_prison', toX: 60, toY: 310 },
      // North → Crystal Cavern (back)
      { x: 500, y: 0, w: 40, h: 40, to: 'crystal_cavern', toX: 500, toY: 450 },
    ],
    connections: [
      { direction: 'west', to: 'mirror_veil_gate', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'timeline_x_roads_room2', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'east', to: 'echo_bridge_prison', requires: null, oneWay: false, order: 1, doorIndex: 2 },
      { direction: 'north', to: 'crystal_cavern', requires: null, oneWay: false, order: 0, doorIndex: 3 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // TIMELINE X ROADS – ROOM 2 (unlocks Void Tether, miniboss, 1 lore pip)
  // ─────────────────────────────────────────────────────────────────────
  timeline_x_roads_room2: {
    id: 'timeline_x_roads_room2',
    name: 'Timeline X Roads, Room 2',
    region: 'timeline',
    mapAccent: '#8E00FF',
    col: 4, row: 1,
    roomType: 'miniboss',
    miniboss: 'timeline_keeper',
    width: 1200,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(142,0,255,0.07)',
    ambientColor: '#8E00FF',
    platforms: [
      { x: 0, y: 390, w: 1200, h: 60 },
      { x: 500, y: 280, w: 200, h: 14 }, // altar for Void Tether
    ],
    abilityReward: {
      id: 'void_tether',
      x: 600,
      y: 258,
      name: 'Void Tether',
      desc: 'Unlocks new pathways.',
    },
    transitions: [
      // West → Timeline X Roads Room 1
      { x: 0, y: 326, w: 35, h: 64, to: 'timeline_x_roads_room1', toX: 930, toY: 310 },
      // East → Timeline X Roads Room 3
      { x: 1165, y: 326, w: 35, h: 64, to: 'timeline_x_roads_room3', toX: 60, toY: 310 },
      // North → Puppet Strings Part 1 (requires Void Tether)
      { x: 580, y: 0, w: 40, h: 40, to: 'puppet_strings_part1', toX: 60, toY: 450, requires: 'void_tether' },
      // North → Observatory Room 1 (requires charged attack)
      { x: 600, y: 0, w: 40, h: 40, to: 'observatory_room1', toX: 60, toY: 450, requires: 'charged_attack' },
      // East → Sovereign Room 2 (post-game)
      { x: 1165, y: 326, w: 35, h: 64, to: 'sovereign_room2', toX: 60, toY: 310, requires: 'post_game' },
      // East → Graviton Core Room 1 (requires Shard Shot)
      { x: 1100, y: 326, w: 35, h: 64, to: 'graviton_core_room1', toX: 60, toY: 310, requires: 'shard_shot' },
      // North → The Rift (requires Stillpoint, Phase Dash, and timeline_x_roads_2_visited)
      { x: 620, y: 0, w: 40, h: 40, to: 'the_rift', toX: 60, toY: 450, requires: 'stillpoint,phase_dash,timeline_x_roads_2_visited' },
      // East → Echo Bridge Prison (back) - from prison to room2 is already handled
    ],
    connections: [
      { direction: 'west', to: 'timeline_x_roads_room1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'timeline_x_roads_room3', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'north', to: 'puppet_strings_part1', requires: 'void_tether', oneWay: false, order: 0, doorIndex: 2 },
      { direction: 'north', to: 'observatory_room1', requires: 'charged_attack', oneWay: false, order: 1, doorIndex: 3 },
      { direction: 'east', to: 'sovereign_room2', requires: 'post_game', oneWay: false, order: 1, doorIndex: 4 },
      { direction: 'east', to: 'graviton_core_room1', requires: 'shard_shot', oneWay: false, order: 2, doorIndex: 5 },
      { direction: 'north', to: 'the_rift', requires: 'stillpoint,phase_dash,timeline_x_roads_2_visited', oneWay: false, order: 2, doorIndex: 6 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [
      { id: 'lore_txr2_1', x: 700, y: 360, text: 'The crossroads bend to those who have walked them.' }
    ],
    abilityReward: null, // actual ability is in abilityReward above
    bossSpawn: { x: 600, y: 334 },
  },

  // ─────────────────────────────────────────────────────────────────────
  // TIMELINE X ROADS – ROOM 3
  // ─────────────────────────────────────────────────────────────────────
  timeline_x_roads_room3: {
    id: 'timeline_x_roads_room3',
    name: 'Timeline X Roads, Room 3',
    region: 'timeline',
    mapAccent: '#8E00FF',
    col: 5, row: 1,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(142,0,255,0.06)',
    ambientColor: '#8E00FF',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
    ],
    transitions: [
      // West → Timeline X Roads Room 2
      { x: 0, y: 326, w: 35, h: 64, to: 'timeline_x_roads_room2', toX: 1130, toY: 310 },
      // South → Chrono Space Rift Gate
      { x: 500, y: 450, w: 40, h: 40, to: 'chrono_rift_gate', toX: 500, toY: 0 },
      // South → The Forge (requires Stillpoint)
      { x: 520, y: 450, w: 40, h: 40, to: 'the_forge', toX: 520, toY: 0, requires: 'stillpoint' },
    ],
    connections: [
      { direction: 'west', to: 'timeline_x_roads_room2', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'south', to: 'chrono_rift_gate', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'south', to: 'the_forge', requires: 'stillpoint', oneWay: false, order: 1, doorIndex: 2 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // PUPPET STRINGS / TETHER – PART 1 (locked by Void Tether)
  // ─────────────────────────────────────────────────────────────────────
  puppet_strings_part1: {
    id: 'puppet_strings_part1',
    name: 'Puppet Strings / Tether Part 1',
    region: 'timeline',
    mapAccent: '#BD34D1',
    col: 4, row: 0, // placed above room2
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(189,52,209,0.05)',
    ambientColor: '#BD34D1',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
    ],
    transitions: [
      // South → Timeline X Roads Room 2
      { x: 500, y: 450, w: 40, h: 40, to: 'timeline_x_roads_room2', toX: 500, toY: 0 },
      // North → Puppet Strings Part 2
      { x: 500, y: 0, w: 40, h: 40, to: 'puppet_strings_part2', toX: 500, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'timeline_x_roads_room2', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'puppet_strings_part2', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // PUPPET STRINGS / TETHER – PART 2 (+1 max health)
  // ─────────────────────────────────────────────────────────────────────
  puppet_strings_part2: {
    id: 'puppet_strings_part2',
    name: 'Puppet Strings / Tether Part 2',
    region: 'timeline',
    mapAccent: '#BD34D1',
    col: 4, row: -1,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(189,52,209,0.06)',
    ambientColor: '#BD34D1',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
      { x: 420, y: 300, w: 160, h: 14 },
    ],
    abilityReward: {
      id: 'max_health_upgrade_2',
      x: 500,
      y: 278,
      name: 'Max Health +1',
      desc: 'Increases max health by 1.',
    },
    transitions: [
      // South → Puppet Strings Part 1
      { x: 500, y: 450, w: 40, h: 40, to: 'puppet_strings_part1', toX: 500, toY: 0 },
      // South (another) → Timeline X Roads Room 2 (shortcut back)
      { x: 520, y: 450, w: 40, h: 40, to: 'timeline_x_roads_room2', toX: 520, toY: 0 },
    ],
    connections: [
      { direction: 'south', to: 'puppet_strings_part1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'south', to: 'timeline_x_roads_room2', requires: null, oneWay: false, order: 1, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    fracturePipRewards: [],
  },

  // ─────────────────────────────────────────────────────────────────────
  // OBSERVATORY – ROOM 1 (entry requires charged attack)
  // ─────────────────────────────────────────────────────────────────────
  observatory_room1: {
    id: 'observatory_room1',
    name: 'Observatory, Room 1',
    region: 'observatory',
    mapAccent: '#F7C325',
    col: 5, row: 0, // placed near timeline
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(247,195,37,0.05)',
    ambientColor: '#F7C325',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
    ],
    transitions: [
      // South → Timeline X Roads Room 2
      { x: 500, y: 450, w: 40, h: 40, to: 'timeline_x_roads_room2', toX: 500, toY: 0 },
      // North → Observatory Room 2
      { x: 500, y: 0, w: 40, h: 40, to: 'observatory_room2', toX: 500, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'timeline_x_roads_room2', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'observatory_room2', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // OBSERVATORY – ROOM 2 (entry requires Graviton Surge, 1 lore pip)
  // ─────────────────────────────────────────────────────────────────────
  observatory_room2: {
    id: 'observatory_room2',
    name: 'Observatory, Room 2',
    region: 'observatory',
    mapAccent: '#F7C325',
    col: 5, row: -1,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(247,195,37,0.06)',
    ambientColor: '#F7C325',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
      { x: 420, y: 300, w: 160, h: 14 },
    ],
    transitions: [
      // South → Observatory Room 1
      { x: 500, y: 450, w: 40, h: 40, to: 'observatory_room1', toX: 500, toY: 0 },
      // North → Observatory Room 3
      { x: 500, y: 0, w: 40, h: 40, to: 'observatory_room3', toX: 500, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'observatory_room1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'observatory_room3', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [
      { id: 'lore_obs2_1', x: 500, y: 276, text: 'The stars align only for those who look up.' }
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // OBSERVATORY – ROOM 3
  // ─────────────────────────────────────────────────────────────────────
  observatory_room3: {
    id: 'observatory_room3',
    name: 'Observatory, Room 3',
    region: 'observatory',
    mapAccent: '#F7C325',
    col: 5, row: -2,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(247,195,37,0.07)',
    ambientColor: '#F7C325',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
    ],
    transitions: [
      // South → Observatory Room 2
      { x: 500, y: 450, w: 40, h: 40, to: 'observatory_room2', toX: 500, toY: 0 },
      // North → Sovereign Observatory (requires Graviton Surge)
      { x: 500, y: 0, w: 40, h: 40, to: 'sovereign_observatory', toX: 500, toY: 450, requires: 'graviton_surge' },
    ],
    connections: [
      { direction: 'south', to: 'observatory_room2', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'sovereign_observatory', requires: 'graviton_surge', oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // SOVEREIGN OBSERVATORY (unlocks fast travel, 1 lore pip)
  // ─────────────────────────────────────────────────────────────────────
  sovereign_observatory: {
    id: 'sovereign_observatory',
    name: 'Sovereign’s Observatory',
    region: 'observatory',
    mapAccent: '#F7C325',
    col: 5, row: -3,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(247,195,37,0.08)',
    ambientColor: '#F7C325',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
      { x: 420, y: 300, w: 160, h: 14 },
    ],
    transitions: [
      // South → Observatory Room 3
      { x: 500, y: 450, w: 40, h: 40, to: 'observatory_room3', toX: 500, toY: 0 },
      // South → Void Expanse Room 1 (shortcut)
      { x: 520, y: 450, w: 40, h: 40, to: 'void_expanse_room1', toX: 520, toY: 0 },
    ],
    connections: [
      { direction: 'south', to: 'observatory_room3', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'south', to: 'void_expanse_room1', requires: null, oneWay: false, order: 1, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [
      { id: 'lore_so_1', x: 500, y: 276, text: 'The Sovereign sees all, but watches nothing.' }
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // THE FORGE (entry requires Stillpoint, 1 fracture pip)
  // ─────────────────────────────────────────────────────────────────────
  the_forge: {
    id: 'the_forge',
    name: 'The Forge',
    region: 'origin',
    col: 6, row: 1,
    width: 1200,
    groundY: 390,
    bgColor: '#080812',
    bgTint: 'rgba(45,130,180,0.04)',
    ambientColor: '#67e8f9',
    platforms: [
      { x: 0, y: 390, w: 1200, h: 60 },
      { x: 500, y: 280, w: 200, h: 14 }, // fracture pip
    ],
    transitions: [
      // North → Timeline X Roads Room 3
      { x: 580, y: 0, w: 40, h: 40, to: 'timeline_x_roads_room3', toX: 580, toY: 450 },
      // East → Chrono Space Rift Gate
      { x: 1165, y: 326, w: 35, h: 64, to: 'chrono_rift_gate', toX: 60, toY: 310 },
      // East → The Vault Room 1
      { x: 1100, y: 326, w: 35, h: 64, to: 'the_vault_room1', toX: 60, toY: 310 },
      // East → Observatory Room 1
      { x: 1130, y: 326, w: 35, h: 64, to: 'observatory_room1', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'north', to: 'timeline_x_roads_room3', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'chrono_rift_gate', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'east', to: 'the_vault_room1', requires: null, oneWay: false, order: 1, doorIndex: 2 },
      { direction: 'east', to: 'observatory_room1', requires: null, oneWay: false, order: 2, doorIndex: 3 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    fracturePipRewards: [
      { id: 'fp_forge_1', x: 600, y: 258 }
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // CHRONO SPACE RIFT – GATE (fast travel)
  // ─────────────────────────────────────────────────────────────────────
  chrono_rift_gate: {
    id: 'chrono_rift_gate',
    name: 'Chrono Space Rift, Gate',
    region: 'chrono_rift',
    mapAccent: '#a78bfa',
    col: 6, row: 2,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a10',
    bgTint: 'rgba(167,139,250,0.05)',
    ambientColor: '#a78bfa',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
    ],
    transitions: [
      // West → The Forge
      { x: 0, y: 326, w: 35, h: 64, to: 'the_forge', toX: 1130, toY: 310 },
      // North → Chrono Space Rift Loop Part 1
      { x: 500, y: 0, w: 40, h: 40, to: 'chrono_rift_loop1', toX: 500, toY: 450 },
    ],
    connections: [
      { direction: 'west', to: 'the_forge', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'chrono_rift_loop1', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // CHRONO SPACE RIFT – LOOP PART 1 (1 cosmetic upgrade)
  // ─────────────────────────────────────────────────────────────────────
  chrono_rift_loop1: {
    id: 'chrono_rift_loop1',
    name: 'Chrono Space Rift, Loop, Part 1',
    region: 'chrono_rift',
    mapAccent: '#a78bfa',
    col: 6, row: 3,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a10',
    bgTint: 'rgba(167,139,250,0.06)',
    ambientColor: '#a78bfa',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
      { x: 420, y: 300, w: 160, h: 14 }, // cosmetic placeholder
    ],
    transitions: [
      // South → Chrono Rift Gate
      { x: 500, y: 450, w: 40, h: 40, to: 'chrono_rift_gate', toX: 500, toY: 0 },
      // North → Chrono Rift Loop Part 2
      { x: 500, y: 0, w: 40, h: 40, to: 'chrono_rift_loop2', toX: 500, toY: 450 },
      // North (teleport) → Void Expanse Room 1 (requires Void Tether) — reverse
      // side of void_expanse_room1's own 'south' shortcut back to this room.
      { x: 520, y: 0, w: 40, h: 40, to: 'void_expanse_room1', toX: 520, toY: 450, requires: 'void_tether' },
      // East → Sovereign Room 4 (post-game)
      { x: 965, y: 326, w: 35, h: 64, to: 'sovereign_room4', toX: 60, toY: 310, requires: 'post_game' },
    ],
    connections: [
      { direction: 'south', to: 'chrono_rift_gate', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'chrono_rift_loop2', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'north', to: 'void_expanse_room1', requires: 'void_tether', oneWay: false, order: 1, doorIndex: 2, shortcut: true },
      { direction: 'east', to: 'sovereign_room4', requires: 'post_game', oneWay: false, order: 0, doorIndex: 3 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // CHRONO SPACE RIFT – LOOP PART 2 (1 lore pip)
  // ─────────────────────────────────────────────────────────────────────
  chrono_rift_loop2: {
    id: 'chrono_rift_loop2',
    name: 'Chrono Space Rift, Loop, Part 2',
    region: 'chrono_rift',
    mapAccent: '#a78bfa',
    col: 6, row: 4,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a10',
    bgTint: 'rgba(167,139,250,0.07)',
    ambientColor: '#a78bfa',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
      { x: 420, y: 300, w: 160, h: 14 },
    ],
    transitions: [
      // South → Chrono Rift Loop Part 1
      { x: 500, y: 450, w: 40, h: 40, to: 'chrono_rift_loop1', toX: 500, toY: 0 },
      // North → Chrono Rift Echo
      { x: 500, y: 0, w: 40, h: 40, to: 'chrono_rift_echo', toX: 500, toY: 450 },
      // North → Event Horizon Pull (requires Void Tether)
      { x: 520, y: 0, w: 40, h: 40, to: 'event_horizon_pull', toX: 520, toY: 450, requires: 'void_tether' },
    ],
    connections: [
      { direction: 'south', to: 'chrono_rift_loop1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'chrono_rift_echo', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'north', to: 'event_horizon_pull', requires: 'void_tether', oneWay: false, order: 1, doorIndex: 2 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [
      { id: 'lore_crl2_1', x: 500, y: 276, text: 'Time loops, but we do not.' }
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // CHRONO SPACE RIFT – ECHO (entry from Fracture part3, requires Void Tether)
  // ─────────────────────────────────────────────────────────────────────
  chrono_rift_echo: {
    id: 'chrono_rift_echo',
    name: 'Chrono Space Rift, Echo',
    region: 'chrono_rift',
    mapAccent: '#a78bfa',
    col: 6, row: 5,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a10',
    bgTint: 'rgba(167,139,250,0.08)',
    ambientColor: '#a78bfa',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
    ],
    transitions: [
      // South → Chrono Rift Loop Part 2
      { x: 500, y: 450, w: 40, h: 40, to: 'chrono_rift_loop2', toX: 500, toY: 0 },
      // North → Chrono Rift Sanctum
      { x: 500, y: 0, w: 40, h: 40, to: 'chrono_rift_sanctum', toX: 500, toY: 450 },
      // South → Void Expanse Room 1 (shortcut)
      { x: 520, y: 450, w: 40, h: 40, to: 'void_expanse_room1', toX: 520, toY: 0 },
    ],
    connections: [
      { direction: 'south', to: 'chrono_rift_loop2', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'chrono_rift_sanctum', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'south', to: 'void_expanse_room1', requires: null, oneWay: false, order: 1, doorIndex: 2 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // CHRONO SPACE RIFT – SANCTUM (miniboss, unlocks Stillpoint, 1 fracture pip)
  // ─────────────────────────────────────────────────────────────────────
  chrono_rift_sanctum: {
    id: 'chrono_rift_sanctum',
    name: 'Chrono Space Rift, Sanctum',
    region: 'chrono_rift',
    mapAccent: '#a78bfa',
    col: 6, row: 6,
    roomType: 'miniboss',
    miniboss: 'chrono_ally',
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a10',
    bgTint: 'rgba(167,139,250,0.09)',
    ambientColor: '#a78bfa',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
      { x: 400, y: 280, w: 200, h: 14 }, // altar
    ],
    abilityReward: {
      id: 'stillpoint',
      x: 500,
      y: 258,
      name: 'Stillpoint',
      desc: 'Q – slow the world to 15% speed.',
    },
    transitions: [
      // South → Chrono Rift Echo
      { x: 500, y: 450, w: 40, h: 40, to: 'chrono_rift_echo', toX: 500, toY: 0 },
      // One‑way teleport to Echoing Abyss Room 1
      { x: 965, y: 326, w: 35, h: 64, to: 'echoing_abyss_room1', toX: 60, toY: 310, oneWay: true },
    ],
    connections: [
      { direction: 'south', to: 'chrono_rift_echo', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'echoing_abyss_room1', requires: null, oneWay: true, order: 0, doorIndex: 1, shortcut: true },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    fracturePipRewards: [
      { id: 'fp_crs_1', x: 600, y: 258 }
    ],
    bossSpawn: { x: 500, y: 334 },
  },

  // ─────────────────────────────────────────────────────────────────────
  // EVENT HORIZON – GATE (fast travel)
  // ─────────────────────────────────────────────────────────────────────
  event_horizon_gate: {
    id: 'event_horizon_gate',
    name: 'Event Horizon - Gate',
    region: 'event_horizon',
    mapAccent: '#818cf8',
    col: 3, row: -1,
    width: 900,
    groundY: 390,
    bgColor: '#07070f',
    bgTint: 'rgba(129,140,248,0.06)',
    ambientColor: '#818cf8',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
    ],
    transitions: [
      // South → Mirror Corridor
      { x: 420, y: 450, w: 60, h: 40, to: 'mirror_corridor', toX: 420, toY: 0 },
      // North → Event Horizon Pull
      { x: 420, y: 0, w: 60, h: 40, to: 'event_horizon_pull', toX: 420, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'mirror_corridor', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'event_horizon_pull', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // EVENT HORIZON – PULL
  // ─────────────────────────────────────────────────────────────────────
  event_horizon_pull: {
    id: 'event_horizon_pull',
    name: 'Event Horizon - Pull',
    region: 'event_horizon',
    mapAccent: '#818cf8',
    col: 3, row: -2,
    width: 900,
    groundY: 390,
    bgColor: '#07070f',
    bgTint: 'rgba(129,140,248,0.07)',
    ambientColor: '#818cf8',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
    ],
    transitions: [
      // South → Gate
      { x: 420, y: 450, w: 60, h: 40, to: 'event_horizon_gate', toX: 420, toY: 0 },
      // North → Event Horizon Drift
      { x: 420, y: 0, w: 60, h: 40, to: 'event_horizon_drift', toX: 420, toY: 450 },
      // East → Echo Bridge Prison (shortcut)
      { x: 865, y: 326, w: 35, h: 64, to: 'echo_bridge_prison', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'south', to: 'event_horizon_gate', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'event_horizon_drift', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'east', to: 'echo_bridge_prison', requires: null, oneWay: false, order: 0, doorIndex: 2 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // EVENT HORIZON – DRIFT (1 lore pip)
  // ─────────────────────────────────────────────────────────────────────
  event_horizon_drift: {
    id: 'event_horizon_drift',
    name: 'Event Horizon - Drift',
    region: 'event_horizon',
    mapAccent: '#818cf8',
    col: 3, row: -3,
    width: 900,
    groundY: 390,
    bgColor: '#07070f',
    bgTint: 'rgba(129,140,248,0.08)',
    ambientColor: '#818cf8',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
      { x: 380, y: 300, w: 140, h: 14 },
    ],
    transitions: [
      // South → Pull
      { x: 420, y: 450, w: 60, h: 40, to: 'event_horizon_pull', toX: 420, toY: 0 },
      // North → Event Horizon Core
      { x: 420, y: 0, w: 60, h: 40, to: 'event_horizon_core', toX: 420, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'event_horizon_pull', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'event_horizon_core', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [
      { id: 'lore_ehd_1', x: 450, y: 276, text: 'Drifting between moments, you find the truth.' }
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // EVENT HORIZON – CORE (miniboss)
  // ─────────────────────────────────────────────────────────────────────
  event_horizon_core: {
    id: 'event_horizon_core',
    name: 'Event Horizon - Core',
    region: 'event_horizon',
    mapAccent: '#818cf8',
    col: 3, row: -4,
    roomType: 'miniboss',
    miniboss: 'horizon_core',
    width: 900,
    groundY: 390,
    bgColor: '#07070f',
    bgTint: 'rgba(129,140,248,0.09)',
    ambientColor: '#818cf8',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
      { x: 380, y: 300, w: 140, h: 14 },
    ],
    transitions: [
      // South → Drift
      { x: 420, y: 450, w: 60, h: 40, to: 'event_horizon_drift', toX: 420, toY: 0 },
      // North → Inverted Spire (requires Graviton Surge)
      { x: 420, y: 0, w: 60, h: 40, to: 'inverted_spire', toX: 420, toY: 450, requires: 'graviton_surge' },
    ],
    connections: [
      { direction: 'south', to: 'event_horizon_drift', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'inverted_spire', requires: 'graviton_surge', oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
    bossSpawn: { x: 450, y: 334 },
  },

  // ─────────────────────────────────────────────────────────────────────
  // VOID EXPANSE – ROOM 1 (1 lore pip, 1 cosmetic upgrade)
  // ─────────────────────────────────────────────────────────────────────
  void_expanse_room1: {
    id: 'void_expanse_room1',
    name: 'The Void Expanse, Room 1',
    region: 'void_expanse',
    mapAccent: '#E100BB',
    col: 7, row: 1,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(225,0,187,0.05)',
    ambientColor: '#E100BB',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
      { x: 420, y: 300, w: 160, h: 14 },
    ],
    transitions: [
      // South → Echo Bridge part1 (back)
      { x: 500, y: 450, w: 40, h: 40, to: 'echo_bridge_part1', toX: 500, toY: 0 },
      // North → Void Expanse Room 2 (requires Shard Shot)
      { x: 500, y: 0, w: 40, h: 40, to: 'void_expanse_room2', toX: 500, toY: 450, requires: 'shard_shot' },
      // South → Chrono Rift Loop Part 1 (shortcut)
      { x: 520, y: 450, w: 40, h: 40, to: 'chrono_rift_loop1', toX: 520, toY: 0 },
    ],
    connections: [
      { direction: 'south', to: 'echo_bridge_part1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'void_expanse_room2', requires: 'shard_shot', oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'south', to: 'chrono_rift_loop1', requires: null, oneWay: false, order: 1, doorIndex: 2, shortcut: true },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [
      { id: 'lore_ve1_1', x: 500, y: 276, text: 'The void is not empty; it is full of absence.' }
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // VOID EXPANSE – ROOM 2 (requires Shard Shot)
  // ─────────────────────────────────────────────────────────────────────
  void_expanse_room2: {
    id: 'void_expanse_room2',
    name: 'The Void Expanse, Room 2',
    region: 'void_expanse',
    mapAccent: '#E100BB',
    col: 7, row: 2,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(225,0,187,0.06)',
    ambientColor: '#E100BB',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
    ],
    transitions: [
      // South → Void Expanse Room 1
      { x: 500, y: 450, w: 40, h: 40, to: 'void_expanse_room1', toX: 500, toY: 0 },
      // North → One Way Teleport Gate to Paradox Engine
      { x: 500, y: 0, w: 40, h: 40, to: 'one_way_teleport_gate_to_paradox_engine', toX: 500, toY: 450 },
      // North → Warp Gate Nexus Room 1
      { x: 520, y: 0, w: 40, h: 40, to: 'warp_gate_nexus_room1', toX: 520, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'void_expanse_room1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'one_way_teleport_gate_to_paradox_engine', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'north', to: 'warp_gate_nexus_room1', requires: null, oneWay: false, order: 1, doorIndex: 2 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // ONE WAY TELEPORT GATE TO PARADOX ENGINE (teleport node)
  // ─────────────────────────────────────────────────────────────────────
  one_way_teleport_gate_to_paradox_engine: {
    id: 'one_way_teleport_gate_to_paradox_engine',
    name: 'One Way Teleport Gate to Paradox Engine',
    region: 'teleport',
    col: 7, row: 3,
    width: 400,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(255,255,255,0.01)',
    ambientColor: '#aaaaaa',
    platforms: [
      { x: 0, y: 390, w: 400, h: 60 },
    ],
    transitions: [
      // South → Void Expanse Room 2
      { x: 200, y: 450, w: 40, h: 40, to: 'void_expanse_room2', toX: 200, toY: 0 },
      // One‑way to Paradox Engine Room 1
      { x: 365, y: 326, w: 35, h: 64, to: 'paradox_engine_room1', toX: 60, toY: 310, oneWay: true },
    ],
    connections: [
      { direction: 'south', to: 'void_expanse_room2', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'paradox_engine_room1', requires: null, oneWay: true, order: 0, doorIndex: 1, shortcut: true },
    ],
    enemies: [],
    anchors: [],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // WARP GATE NEXUS – ROOM 1
  // ─────────────────────────────────────────────────────────────────────
  warp_gate_nexus_room1: {
    id: 'warp_gate_nexus_room1',
    name: 'Warp Gate Nexus Room 1',
    region: 'warp',
    mapAccent: '#AC6363',
    col: 7, row: 4,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(172,99,99,0.05)',
    ambientColor: '#AC6363',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
    ],
    transitions: [
      // South → Void Expanse Room 2
      { x: 500, y: 450, w: 40, h: 40, to: 'void_expanse_room2', toX: 500, toY: 0 },
      // North → Warp Gate Nexus Room 2
      { x: 500, y: 0, w: 40, h: 40, to: 'warp_gate_nexus_room2', toX: 500, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'void_expanse_room2', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'warp_gate_nexus_room2', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // WARP GATE NEXUS – ROOM 2 (miniboss, 1 lore pip)
  // ─────────────────────────────────────────────────────────────────────
  warp_gate_nexus_room2: {
    id: 'warp_gate_nexus_room2',
    name: 'Warp Gate Nexus Room 2',
    region: 'warp',
    mapAccent: '#AC6363',
    col: 7, row: 5,
    roomType: 'miniboss',
    miniboss: 'warp_guardian',
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(172,99,99,0.07)',
    ambientColor: '#AC6363',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
      { x: 400, y: 300, w: 200, h: 14 },
    ],
    transitions: [
      // South → Warp Gate Nexus Room 1
      { x: 500, y: 450, w: 40, h: 40, to: 'warp_gate_nexus_room1', toX: 500, toY: 0 },
      // North → One Way Warp Gate to Inverted Spire
      { x: 500, y: 0, w: 40, h: 40, to: 'one_way_warp_gate_to_inverted_spire', toX: 500, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'warp_gate_nexus_room1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'one_way_warp_gate_to_inverted_spire', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [
      { id: 'lore_wgn2_1', x: 500, y: 276, text: 'The gates remember every traveller.' }
    ],
    abilityReward: null,
    bossSpawn: { x: 500, y: 334 },
  },

  // ─────────────────────────────────────────────────────────────────────
  // ONE WAY WARP GATE TO INVERTED SPIRE (teleport node)
  // ─────────────────────────────────────────────────────────────────────
  one_way_warp_gate_to_inverted_spire: {
    id: 'one_way_warp_gate_to_inverted_spire',
    name: 'One Way Warp Gate to Inverted Spire',
    region: 'teleport',
    col: 7, row: 6,
    width: 400,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(255,255,255,0.01)',
    ambientColor: '#aaaaaa',
    platforms: [
      { x: 0, y: 390, w: 400, h: 60 },
    ],
    transitions: [
      // South → Warp Gate Nexus Room 2
      { x: 200, y: 450, w: 40, h: 40, to: 'warp_gate_nexus_room2', toX: 200, toY: 0 },
      // One‑way to Inverted Spire
      { x: 365, y: 326, w: 35, h: 64, to: 'inverted_spire', toX: 60, toY: 310, oneWay: true },
    ],
    connections: [
      { direction: 'south', to: 'warp_gate_nexus_room2', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'inverted_spire', requires: null, oneWay: true, order: 0, doorIndex: 1, shortcut: true },
    ],
    enemies: [],
    anchors: [],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // INVERTED SPIRE (entry requires Graviton Surge, 1 lore pip)
  // ─────────────────────────────────────────────────────────────────────
  inverted_spire: {
    id: 'inverted_spire',
    name: 'Inverted Spire',
    region: 'spire',
    mapAccent: '#0088FF',
    col: 3, row: -5, // placed near event horizon
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(0,136,255,0.05)',
    ambientColor: '#0088FF',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
      { x: 420, y: 300, w: 160, h: 14 },
    ],
    transitions: [
      // South → Event Horizon Core (back)
      { x: 500, y: 450, w: 40, h: 40, to: 'event_horizon_core', toX: 500, toY: 0 },
      // South → Timeline X Roads Room 2 (shortcut)
      { x: 520, y: 450, w: 40, h: 40, to: 'timeline_x_roads_room2', toX: 520, toY: 0 },
    ],
    connections: [
      { direction: 'south', to: 'event_horizon_core', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'south', to: 'timeline_x_roads_room2', requires: null, oneWay: false, order: 1, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [
      { id: 'lore_is_1', x: 500, y: 276, text: 'The spire points inward, not upward.' }
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // GRAVITON CORE – ROOM 1 (entry requires Shard Shot)
  // ─────────────────────────────────────────────────────────────────────
  graviton_core_room1: {
    id: 'graviton_core_room1',
    name: 'Graviton Core, Room 1',
    region: 'graviton',
    mapAccent: '#4BCA61',
    col: 8, row: 1,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(75,202,97,0.05)',
    ambientColor: '#4BCA61',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
    ],
    transitions: [
      // West → Timeline X Roads Room 2
      { x: 0, y: 326, w: 35, h: 64, to: 'timeline_x_roads_room2', toX: 930, toY: 310 },
      // North → Graviton Core Room 2 (requires Shard Shot)
      { x: 500, y: 0, w: 40, h: 40, to: 'graviton_core_room2', toX: 500, toY: 450, requires: 'shard_shot' },
      // South → The Vault Room 1 (shortcut)
      { x: 500, y: 450, w: 40, h: 40, to: 'the_vault_room1', toX: 500, toY: 0 },
    ],
    connections: [
      { direction: 'west', to: 'timeline_x_roads_room2', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'graviton_core_room2', requires: 'shard_shot', oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'south', to: 'the_vault_room1', requires: null, oneWay: false, order: 0, doorIndex: 2 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // GRAVITON CORE – ROOM 2 (unlocks Graviton Surge, 1 fracture pip)
  // ─────────────────────────────────────────────────────────────────────
  graviton_core_room2: {
    id: 'graviton_core_room2',
    name: 'Graviton Core, Room 2',
    region: 'graviton',
    mapAccent: '#4BCA61',
    col: 8, row: 2,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(75,202,97,0.07)',
    ambientColor: '#4BCA61',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
      { x: 400, y: 280, w: 200, h: 14 },
    ],
    abilityReward: {
      id: 'graviton_surge',
      x: 500,
      y: 258,
      name: 'Graviton Surge',
      desc: 'Unlocks heavy gravity abilities.',
    },
    transitions: [
      // South → Graviton Core Room 1
      { x: 500, y: 450, w: 40, h: 40, to: 'graviton_core_room1', toX: 500, toY: 0 },
      // North → Graviton Core Room 3 (requires Shard Shot)
      { x: 500, y: 0, w: 40, h: 40, to: 'graviton_core_room3', toX: 500, toY: 450, requires: 'shard_shot' },
      // North → Inverted Spire (shortcut)
      { x: 520, y: 0, w: 40, h: 40, to: 'inverted_spire', toX: 520, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'graviton_core_room1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'graviton_core_room3', requires: 'shard_shot', oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'north', to: 'inverted_spire', requires: null, oneWay: false, order: 1, doorIndex: 2 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    fracturePipRewards: [
      { id: 'fp_gc2_1', x: 600, y: 258 }
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // GRAVITON CORE – ROOM 3 (miniboss, 1 lore pip)
  // ─────────────────────────────────────────────────────────────────────
  graviton_core_room3: {
    id: 'graviton_core_room3',
    name: 'Graviton Core, Room 3',
    region: 'graviton',
    mapAccent: '#4BCA61',
    col: 8, row: 3,
    roomType: 'miniboss',
    miniboss: 'graviton_sentinel',
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(75,202,97,0.08)',
    ambientColor: '#4BCA61',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
      { x: 400, y: 300, w: 200, h: 14 },
    ],
    transitions: [
      // South → Graviton Core Room 2
      { x: 500, y: 450, w: 40, h: 40, to: 'graviton_core_room2', toX: 500, toY: 0 },
      // South → The Vault Room 1 (shortcut)
      { x: 520, y: 450, w: 40, h: 40, to: 'the_vault_room1', toX: 520, toY: 0 },
      // North → The Vault Room 2 (requires Void Tether)
      { x: 500, y: 0, w: 40, h: 40, to: 'the_vault_room2', toX: 500, toY: 450, requires: 'void_tether' },
      // North → Sovereign Army Reserve (locked by pips)
      { x: 520, y: 0, w: 40, h: 40, to: 'sovereign_army_reserve', toX: 520, toY: 450, requires: 'four_fracture_pips,ten_lore_pips' },
    ],
    connections: [
      { direction: 'south', to: 'graviton_core_room2', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'south', to: 'the_vault_room1', requires: null, oneWay: false, order: 1, doorIndex: 1 },
      { direction: 'north', to: 'the_vault_room2', requires: 'void_tether', oneWay: false, order: 0, doorIndex: 2 },
      { direction: 'north', to: 'sovereign_army_reserve', requires: 'four_fracture_pips,ten_lore_pips', oneWay: false, order: 1, doorIndex: 3 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [
      { id: 'lore_gc3_1', x: 500, y: 276, text: 'Gravity bends to the will of the core.' }
    ],
    abilityReward: null,
    bossSpawn: { x: 500, y: 334 },
  },

  // ─────────────────────────────────────────────────────────────────────
  // THE VAULT – ROOM 1 (Memory Resonance, fast travel)
  // ─────────────────────────────────────────────────────────────────────
  the_vault_room1: {
    id: 'the_vault_room1',
    name: 'The Vault, Room 1',
    region: 'origin',
    col: 8, row: 0,
    mapAccent: '#897A5F',
    width: 900,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(137,122,95,0.05)',
    ambientColor: '#897A5F',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
      { x: 380, y: 300, w: 140, h: 14 },
    ],
    transitions: [
      // West → The Forge
      { x: 0, y: 326, w: 35, h: 64, to: 'the_forge', toX: 1130, toY: 310 },
      // North → Polar Shift Room 1
      { x: 420, y: 0, w: 60, h: 40, to: 'polar_shift_room1', toX: 420, toY: 450 },
      // North → Graviton Core Room 1 (shortcut)
      { x: 440, y: 0, w: 60, h: 40, to: 'graviton_core_room1', toX: 440, toY: 450 },
      // North → The Rift (via timeline condition)
      { x: 460, y: 0, w: 60, h: 40, to: 'the_rift', toX: 460, toY: 450, requires: 'timeline_x_roads_2_visited' },
      // North → The Vault Room 2 (lore pip)
      { x: 480, y: 0, w: 60, h: 40, to: 'the_vault_room2', toX: 480, toY: 450 },
    ],
    connections: [
      { direction: 'west', to: 'the_forge', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'polar_shift_room1', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'north', to: 'graviton_core_room1', requires: null, oneWay: false, order: 1, doorIndex: 2 },
      { direction: 'north', to: 'the_rift', requires: 'timeline_x_roads_2_visited', oneWay: false, order: 2, doorIndex: 3 },
      { direction: 'north', to: 'the_vault_room2', requires: null, oneWay: false, order: 3, doorIndex: 4 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // THE VAULT – ROOM 2 (1 lore pip)
  // ─────────────────────────────────────────────────────────────────────
  the_vault_room2: {
    id: 'the_vault_room2',
    name: 'The Vault, Room 2',
    region: 'origin',
    mapAccent: '#897A5F',
    col: 8, row: -1,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(137,122,95,0.06)',
    ambientColor: '#897A5F',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
      { x: 380, y: 300, w: 140, h: 14 },
    ],
    transitions: [
      // South → The Vault Room 1
      { x: 420, y: 450, w: 60, h: 40, to: 'the_vault_room1', toX: 420, toY: 0 },
      // North → The Rift
      { x: 420, y: 0, w: 60, h: 40, to: 'the_rift', toX: 420, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'the_vault_room1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'the_rift', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [
      { id: 'lore_tv2_1', x: 450, y: 276, text: 'The vault holds memories of a world that never was.' }
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // THE RIFT (entry requires Stillpoint, Phase Dash, and timeline_x_roads_2_visited)
  // ─────────────────────────────────────────────────────────────────────
  the_rift: {
    id: 'the_rift',
    name: 'The Rift',
    region: 'origin',
    col: 9, row: 0,
    width: 1200,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(80,40,160,0.07)',
    ambientColor: '#7c3aed',
    platforms: [
      { x: 0, y: 390, w: 1200, h: 60 },
    ],
    transitions: [
      // South → The Vault Room 2
      { x: 580, y: 450, w: 40, h: 40, to: 'the_vault_room2', toX: 580, toY: 0 },
      // South → Polar Shift Room 1
      { x: 600, y: 450, w: 40, h: 40, to: 'polar_shift_room1', toX: 600, toY: 0 },
      // East → The Antechamber
      { x: 1165, y: 326, w: 35, h: 64, to: 'antechamber', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'south', to: 'the_vault_room2', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'south', to: 'polar_shift_room1', requires: null, oneWay: false, order: 1, doorIndex: 1 },
      { direction: 'east', to: 'antechamber', requires: null, oneWay: false, order: 0, doorIndex: 2 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [
      { id: 'lore_tr_1', x: 600, y: 360, text: 'The rift is the seam between what is and what could be.' }
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // POLAR SHIFT – ROOM 1 (fast travel, +1 max health)
  // ─────────────────────────────────────────────────────────────────────
  polar_shift_room1: {
    id: 'polar_shift_room1',
    name: 'Polar Shift, Room 1',
    region: 'polar',
    mapAccent: '#F7E600',
    col: 9, row: 1,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(247,230,0,0.05)',
    ambientColor: '#F7E600',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
      { x: 420, y: 300, w: 160, h: 14 },
    ],
    abilityReward: {
      id: 'max_health_upgrade_3',
      x: 500,
      y: 278,
      name: 'Max Health +1',
      desc: 'Increases max health by 1.',
    },
    transitions: [
      // South → The Vault Room 1
      { x: 500, y: 450, w: 40, h: 40, to: 'the_vault_room1', toX: 500, toY: 0 },
      // North → Polar Shift Room 2
      { x: 500, y: 0, w: 40, h: 40, to: 'polar_shift_room2', toX: 500, toY: 450 },
      // North → The Rift
      { x: 520, y: 0, w: 40, h: 40, to: 'the_rift', toX: 520, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'the_vault_room1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'polar_shift_room2', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'north', to: 'the_rift', requires: null, oneWay: false, order: 1, doorIndex: 2 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    fracturePipRewards: [],
  },

  // ─────────────────────────────────────────────────────────────────────
  // POLAR SHIFT – ROOM 2 (miniboss, 1 lore pip)
  // ─────────────────────────────────────────────────────────────────────
  polar_shift_room2: {
    id: 'polar_shift_room2',
    name: 'Polar Shift, Room 2',
    region: 'polar',
    mapAccent: '#F7E600',
    col: 9, row: 2,
    roomType: 'miniboss',
    miniboss: 'polar_guardian',
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(247,230,0,0.07)',
    ambientColor: '#F7E600',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
      { x: 400, y: 300, w: 200, h: 14 },
    ],
    transitions: [
      // South → Polar Shift Room 1
      { x: 500, y: 450, w: 40, h: 40, to: 'polar_shift_room1', toX: 500, toY: 0 },
      // One‑way to Paradox Engine Room 1
      { x: 965, y: 326, w: 35, h: 64, to: 'paradox_engine_room1', toX: 60, toY: 310, oneWay: true },
    ],
    connections: [
      { direction: 'south', to: 'polar_shift_room1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'paradox_engine_room1', requires: null, oneWay: true, order: 0, doorIndex: 1, shortcut: true },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [
      { id: 'lore_ps2_1', x: 500, y: 276, text: 'The poles shift, but the axis stays true.' }
    ],
    abilityReward: null,
    bossSpawn: { x: 500, y: 334 },
  },

  // ─────────────────────────────────────────────────────────────────────
  // PARADOX ENGINE – ROOM 1
  // ─────────────────────────────────────────────────────────────────────
  paradox_engine_room1: {
    id: 'paradox_engine_room1',
    name: 'Paradox Engine, Room 1',
    region: 'paradox',
    mapAccent: '#4BCA61',
    col: 10, row: 0,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(75,202,97,0.06)',
    ambientColor: '#4BCA61',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
    ],
    transitions: [
      // West → One Way Teleport Gate to Paradox Engine (from Void Expanse)
      { x: 0, y: 326, w: 35, h: 64, to: 'one_way_teleport_gate_to_paradox_engine', toX: 330, toY: 310 },
      // North → Paradox Engine Room 2 (requires Shard Shot)
      { x: 500, y: 0, w: 40, h: 40, to: 'paradox_engine_room2', toX: 500, toY: 450, requires: 'shard_shot' },
      // South → Polar Shift Room 2 (one-way back)
      { x: 500, y: 450, w: 40, h: 40, to: 'polar_shift_room2', toX: 500, toY: 0 },
    ],
    connections: [
      { direction: 'west', to: 'one_way_teleport_gate_to_paradox_engine', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'paradox_engine_room2', requires: 'shard_shot', oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'south', to: 'polar_shift_room2', requires: null, oneWay: false, order: 0, doorIndex: 2 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // PARADOX ENGINE – ROOM 2 (miniboss, 1 lore pip)
  // ─────────────────────────────────────────────────────────────────────
  paradox_engine_room2: {
    id: 'paradox_engine_room2',
    name: 'Paradox Engine, Room 2',
    region: 'paradox',
    mapAccent: '#4BCA61',
    col: 10, row: 1,
    roomType: 'miniboss',
    miniboss: 'paradox_engine',
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(75,202,97,0.08)',
    ambientColor: '#4BCA61',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
      { x: 400, y: 300, w: 200, h: 14 },
    ],
    transitions: [
      // South → Paradox Engine Room 1
      { x: 500, y: 450, w: 40, h: 40, to: 'paradox_engine_room1', toX: 500, toY: 0 },
      // East → Teleport to Upper Ruins (first)
      { x: 965, y: 326, w: 35, h: 64, to: 'teleport_from_paradox_engine_to_upper_ruins_1', toX: 60, toY: 310 },
      // East → Static Field Room 1
      { x: 900, y: 326, w: 35, h: 64, to: 'static_field_room1', toX: 60, toY: 310 },
    ],
    connections: [
      { direction: 'south', to: 'paradox_engine_room1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'teleport_from_paradox_engine_to_upper_ruins_1', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'east', to: 'static_field_room1', requires: null, oneWay: false, order: 1, doorIndex: 2 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [
      { id: 'lore_pe2_1', x: 500, y: 276, text: 'The engine runs on contradictions.' }
    ],
    abilityReward: null,
    bossSpawn: { x: 500, y: 334 },
  },

  // ─────────────────────────────────────────────────────────────────────
  // TELEPORT FROM PARADOX ENGINE TO UPPER RUINS (blocked by Shard Shot)
  // ─────────────────────────────────────────────────────────────────────
  teleport_from_paradox_engine_to_upper_ruins_1: {
    id: 'teleport_from_paradox_engine_to_upper_ruins_1',
    name: 'Teleport from Paradox Engine to Upper Ruins',
    region: 'teleport',
    col: 10, row: 2,
    width: 400,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(255,255,255,0.01)',
    ambientColor: '#aaaaaa',
    platforms: [
      { x: 0, y: 390, w: 400, h: 60 },
    ],
    transitions: [
      // West → Paradox Engine Room 2
      { x: 0, y: 326, w: 35, h: 64, to: 'paradox_engine_room2', toX: 930, toY: 310 },
      // One‑way to Pacifist Region (blocked by Shard Shot? Actually it says blocked by Shard Shot, meaning you need Shard Shot to pass? But it's a one-way teleport that requires shard shot to use? We'll add requires: 'shard_shot')
      { x: 365, y: 326, w: 35, h: 64, to: 'pacifist_region', toX: 60, toY: 310, requires: 'shard_shot', oneWay: true },
    ],
    connections: [
      { direction: 'west', to: 'paradox_engine_room2', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'pacifist_region', requires: 'shard_shot', oneWay: true, order: 0, doorIndex: 1, shortcut: true },
    ],
    enemies: [],
    anchors: [],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // STATIC FIELD – ROOM 1
  // ─────────────────────────────────────────────────────────────────────
  static_field_room1: {
    id: 'static_field_room1',
    name: 'Static Field, Room 1',
    region: 'static',
    mapAccent: '#6558F5',
    col: 11, row: 0,
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(101,88,245,0.05)',
    ambientColor: '#6558F5',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
    ],
    transitions: [
      // West → Paradox Engine Room 2
      { x: 0, y: 326, w: 35, h: 64, to: 'paradox_engine_room2', toX: 930, toY: 310 },
      // North → Static Field Room 2 (requires Phase Dash)
      { x: 500, y: 0, w: 40, h: 40, to: 'static_field_room2', toX: 500, toY: 450, requires: 'phase_dash' },
      // One‑way teleport to Void Expanse Room 2
      { x: 965, y: 326, w: 35, h: 64, to: 'void_expanse_room2', toX: 60, toY: 310, oneWay: true },
      // One‑way teleport to Graviton Core Room 1 (with cosmetic upgrade)
      { x: 900, y: 326, w: 35, h: 64, to: 'graviton_core_room1', toX: 60, toY: 310, oneWay: true },
    ],
    connections: [
      { direction: 'west', to: 'paradox_engine_room2', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'static_field_room2', requires: 'phase_dash', oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'east', to: 'void_expanse_room2', requires: null, oneWay: true, order: 0, doorIndex: 2, shortcut: true },
      { direction: 'east', to: 'graviton_core_room1', requires: null, oneWay: true, order: 1, doorIndex: 3, shortcut: true },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // STATIC FIELD – ROOM 2 (miniboss, 1 fracture pip)
  // ─────────────────────────────────────────────────────────────────────
  static_field_room2: {
    id: 'static_field_room2',
    name: 'Static Field, Room 2',
    region: 'static',
    mapAccent: '#6558F5',
    col: 11, row: 1,
    roomType: 'miniboss',
    miniboss: 'static_guardian',
    width: 1000,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(101,88,245,0.07)',
    ambientColor: '#6558F5',
    platforms: [
      { x: 0, y: 390, w: 1000, h: 60 },
      { x: 400, y: 300, w: 200, h: 14 },
    ],
    transitions: [
      // South → Static Field Room 1
      { x: 500, y: 450, w: 40, h: 40, to: 'static_field_room1', toX: 500, toY: 0 },
      // South → The Rift (shortcut)
      { x: 520, y: 450, w: 40, h: 40, to: 'the_rift', toX: 520, toY: 0 },
      // One‑way teleport to Graviton Core Room 1 (with cosmetic upgrade)
      { x: 965, y: 326, w: 35, h: 64, to: 'graviton_core_room1', toX: 60, toY: 310, oneWay: true },
    ],
    connections: [
      { direction: 'south', to: 'static_field_room1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'south', to: 'the_rift', requires: null, oneWay: false, order: 1, doorIndex: 1 },
      { direction: 'east', to: 'graviton_core_room1', requires: null, oneWay: true, order: 0, doorIndex: 2, shortcut: true },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    fracturePipRewards: [
      { id: 'fp_sf2_1', x: 500, y: 258 }
    ],
    abilityReward: null,
    bossSpawn: { x: 500, y: 334 },
  },

  // ─────────────────────────────────────────────────────────────────────
  // ANTECHAMBER
  // ─────────────────────────────────────────────────────────────────────
  antechamber: {
    id: 'antechamber',
    name: 'The Antechamber',
    region: 'origin',
    col: 10, row: -1,
    width: 900,
    groundY: 390,
    bgColor: '#08080e',
    bgTint: 'rgba(200,40,40,0.04)',
    ambientColor: '#f87171',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
      { x: 380, y: 300, w: 140, h: 14 },
    ],
    transitions: [
      // West → The Rift
      { x: 0, y: 326, w: 35, h: 64, to: 'the_rift', toX: 1130, toY: 310 },
      // East → Hollow Core
      { x: 865, y: 326, w: 35, h: 64, to: 'hollow_core', toX: 60, toY: 310 },
      // North → Spawn Area 2 (requires phase dash)
      { x: 420, y: 0, w: 60, h: 40, to: 'spawn_area_2', toX: 420, toY: 450, requires: 'phase_dash' },
    ],
    connections: [
      { direction: 'west', to: 'the_rift', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'east', to: 'hollow_core', requires: null, oneWay: false, order: 0, doorIndex: 1 },
      { direction: 'north', to: 'spawn_area_2', requires: 'phase_dash', oneWay: false, order: 0, doorIndex: 2 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // HOLLOW CORE (1 lore pip)
  // ─────────────────────────────────────────────────────────────────────
  hollow_core: {
    id: 'hollow_core',
    name: 'Hollow Core',
    region: 'origin',
    mapAccent: '#C08CEA',
    col: 11, row: -1,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(192,140,234,0.05)',
    ambientColor: '#C08CEA',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
      { x: 380, y: 300, w: 140, h: 14 },
    ],
    transitions: [
      // West → Antechamber
      { x: 0, y: 326, w: 35, h: 64, to: 'antechamber', toX: 830, toY: 310 },
    ],
    connections: [
      { direction: 'west', to: 'antechamber', requires: null, oneWay: false, order: 0, doorIndex: 0 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [
      { id: 'lore_hc_1', x: 450, y: 276, text: 'The core is hollow because it has already given everything.' }
    ],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // SPAWN AREA 2 (cosmetic upgrade)
  // ─────────────────────────────────────────────────────────────────────
  spawn_area_2: {
    id: 'spawn_area_2',
    name: 'Spawn Area?',
    region: 'origin',
    col: 0, row: -1,
    width: 900,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(196,181,253,0.02)',
    ambientColor: '#6a6a8e',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
      { x: 380, y: 300, w: 140, h: 14 },
    ],
    transitions: [
      // South → Antechamber
      { x: 420, y: 450, w: 60, h: 40, to: 'antechamber', toX: 420, toY: 0 },
      // South → Tutorial Area Final (boss)
      { x: 440, y: 450, w: 60, h: 40, to: 'tutorial_final', toX: 440, toY: 0 },
    ],
    connections: [
      { direction: 'south', to: 'antechamber', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'south', to: 'tutorial_final', requires: null, oneWay: false, order: 1, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [
      { x: 140, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // TUTORIAL FINAL – final boss fight
  // ─────────────────────────────────────────────────────────────────────
  tutorial_final: {
    id: 'tutorial_final',
    name: 'Tutorial Area? Final Boss Fight',
    region: 'origin',
    col: 0, row: -2,
    roomType: 'boss',
    width: 900,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(200,40,40,0.06)',
    ambientColor: '#f87171',
    platforms: [
      { x: 0, y: 390, w: 900, h: 60 },
      { x: 130, y: 295, w: 130, h: 14 },
      { x: 640, y: 295, w: 130, h: 14 },
      { x: 350, y: 210, w: 200, h: 14 },
    ],
    transitions: [
      // North → Spawn Area 2
      { x: 420, y: 0, w: 60, h: 40, to: 'spawn_area_2', toX: 420, toY: 450 },
    ],
    connections: [
      { direction: 'north', to: 'spawn_area_2', requires: null, oneWay: false, order: 0, doorIndex: 0 },
    ],
    enemies: [],
    anchors: [
      { x: 430, y: 370, index: 0 }
    ],
    loreFragments: [],
    abilityReward: null,
    bossSpawn: { x: 400, y: 334 },
  },

  // ─────────────────────────────────────────────────────────────────────
  // SOVEREIGN ROOMS 1–4 (post-game locked)
  // ─────────────────────────────────────────────────────────────────────
  sovereign_room1: {
    id: 'sovereign_room1',
    name: 'Sovereign Room 1',
    region: 'sovereign',
    mapAccent: '#D3455B',
    col: 2, row: 2,
    width: 600,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(211,69,91,0.05)',
    ambientColor: '#D3455B',
    platforms: [
      { x: 0, y: 390, w: 600, h: 60 },
    ],
    transitions: [
      // West → The Fracture part2
      { x: 0, y: 326, w: 35, h: 64, to: 'the_fracture_part2', toX: 1130, toY: 310 },
    ],
    connections: [
      { direction: 'west', to: 'the_fracture_part2', requires: null, oneWay: false, order: 0, doorIndex: 0 },
    ],
    enemies: [],
    anchors: [],
    loreFragments: [],
    abilityReward: null,
  },
  sovereign_room2: {
    id: 'sovereign_room2',
    name: 'Sovereign Room 2',
    region: 'sovereign',
    mapAccent: '#D3455B',
    col: 5, row: 2,
    width: 600,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(211,69,91,0.05)',
    ambientColor: '#D3455B',
    platforms: [
      { x: 0, y: 390, w: 600, h: 60 },
    ],
    transitions: [
      // West → Timeline X Roads Room 2
      { x: 0, y: 326, w: 35, h: 64, to: 'timeline_x_roads_room2', toX: 1130, toY: 310 },
    ],
    connections: [
      { direction: 'west', to: 'timeline_x_roads_room2', requires: null, oneWay: false, order: 0, doorIndex: 0 },
    ],
    enemies: [],
    anchors: [],
    loreFragments: [],
    abilityReward: null,
  },
  sovereign_room3: {
    id: 'sovereign_room3',
    name: 'Sovereign Room 3',
    region: 'sovereign',
    mapAccent: '#D3455B',
    col: 2, row: -5, // near crag
    width: 600,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(211,69,91,0.05)',
    ambientColor: '#D3455B',
    platforms: [
      { x: 0, y: 390, w: 600, h: 60 },
    ],
    transitions: [
      // West → Crag Warden
      { x: 0, y: 326, w: 35, h: 64, to: 'crag_warden', toX: 1130, toY: 310 },
    ],
    connections: [
      { direction: 'west', to: 'crag_warden', requires: null, oneWay: false, order: 0, doorIndex: 0 },
    ],
    enemies: [],
    anchors: [],
    loreFragments: [],
    abilityReward: null,
  },
  sovereign_room4: {
    id: 'sovereign_room4',
    name: 'Sovereign Room 4',
    region: 'sovereign',
    mapAccent: '#D3455B',
    col: 7, row: 7,
    width: 600,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(211,69,91,0.05)',
    ambientColor: '#D3455B',
    platforms: [
      { x: 0, y: 390, w: 600, h: 60 },
    ],
    transitions: [
      // West → Chrono Rift Loop Part 1
      { x: 0, y: 326, w: 35, h: 64, to: 'chrono_rift_loop1', toX: 930, toY: 310 },
    ],
    connections: [
      { direction: 'west', to: 'chrono_rift_loop1', requires: null, oneWay: false, order: 0, doorIndex: 0 },
    ],
    enemies: [],
    anchors: [],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // SOVEREIGN ARMY RESERVE (locked by pips)
  // ─────────────────────────────────────────────────────────────────────
  sovereign_army_reserve: {
    id: 'sovereign_army_reserve',
    name: 'Sovereign Army Reserve',
    region: 'sovereign',
    mapAccent: '#D3455B',
    col: 9, row: 3,
    width: 800,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(211,69,91,0.06)',
    ambientColor: '#D3455B',
    platforms: [
      { x: 0, y: 390, w: 800, h: 60 },
    ],
    transitions: [
      // South → Graviton Core Room 3
      { x: 400, y: 450, w: 40, h: 40, to: 'graviton_core_room3', toX: 400, toY: 0 },
      // North → Try out region
      { x: 400, y: 0, w: 40, h: 40, to: 'try_out_region', toX: 400, toY: 450 },
    ],
    connections: [
      { direction: 'south', to: 'graviton_core_room3', requires: null, oneWay: false, order: 0, doorIndex: 0 },
      { direction: 'north', to: 'try_out_region', requires: null, oneWay: false, order: 0, doorIndex: 1 },
    ],
    enemies: [],
    anchors: [],
    loreFragments: [],
    abilityReward: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // TRY OUT REGION (Level 4 Limit Break Unlock)
  // ─────────────────────────────────────────────────────────────────────
  try_out_region: {
    id: 'try_out_region',
    name: 'Try out region',
    region: 'sovereign',
    mapAccent: '#D3455B',
    col: 9, row: 4,
    width: 600,
    groundY: 390,
    bgColor: '#0a0a0f',
    bgTint: 'rgba(211,69,91,0.07)',
    ambientColor: '#D3455B',
    platforms: [
      { x: 0, y: 390, w: 600, h: 60 },
      { x: 240, y: 280, w: 120, h: 14 },
    ],
    abilityReward: {
      id: 'level_4_limit_break',
      x: 300,
      y: 258,
      name: 'Level 4 Limit Break',
      desc: 'Unlocks ultimate ability.',
    },
    transitions: [
      // South → Sovereign Army Reserve
      { x: 300, y: 450, w: 40, h: 40, to: 'sovereign_army_reserve', toX: 300, toY: 0 },
    ],
    connections: [
      { direction: 'south', to: 'sovereign_army_reserve', requires: null, oneWay: false, order: 0, doorIndex: 0 },
    ],
    enemies: [],
    anchors: [],
    loreFragments: [],
    fracturePipRewards: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DEV-ONLY — Enemy Test Arena. Not reachable via normal play (no
  // transitions in or out, no col/row so validateAreaGraph() skips it).
  // Used by enemy_test.html / enemy_designer.html / companion_test.html to
  // spawn any enemy/miniboss (or the Child) in a flat, generous, standard
  // room for isolated testing. Enemies are spawned dynamically by the
  // tools, not listed here.
  // (Restored 2026-07-16 — this entry existed in the committed area.js but
  // was silently lost from the working tree during the game/ folder reorg,
  // which broke all three arena tools.)
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
      // Companion-test additions (2026-07-16): a jump-height step and a wide
      // gap-with-island, exercising the Child's gap-probe/mirror-jump and
      // catch-up logic. Harmless to enemy tests (off to the right side).
      { x: 800, y: 440, w: 120, h: 14 },
      { x: 1050, y: 380, w: 120, h: 14 },
    ],
    transitions: [],
    connections: [],
    enemies: [],
    anchors: [],
    loreFragments: [],
    abilityReward: null,
    // One healing crystal so motes/crystal healing are testable in the arena
    healingCrystals: [
      { id: 'hc_test_arena_1', x: 120, y: 500 },
    ],
  },

};

// =====================================================================
// Existing helper functions (unchanged)
// =====================================================================
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