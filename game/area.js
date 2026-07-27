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
    spawn_area_1: {
      id: 'spawn_area_1',
      name: 'Spawn Area',
      region: 'origin',
      col: 0,
      row: 0,
      width: 1000,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(196,181,253,0.02)',
      ambientColor: '#6a6a8e',
      platforms: [
        { x: 0, y: 500, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 940, y: 428, w: 60, h: 72, to: 'tutorial_area', toX: 60, toY: 730 }
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
        { x: 100, y: 480, index: 0 }
      ],
      abilityReward: null,
      cosmeticUpgrades: [
        { id: 'cu_sa11_1', x: 280, y: 460, name: 'Cosmetic Upgrade' }
      ]
    },

    tutorial_area: {
      id: 'tutorial_area',
      name: 'Tutorial Area',
      region: 'origin',
      col: 1,
      row: 0,
      width: 1577,
      roomHeight: 830,
      groundY: 770,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(196,181,253,0.02)',
      ambientColor: '#6a6a8e',
      platforms: [
        { x: 0, y: 770, w: 1577, h: 60 }
      ],
      transitions: [
        { x: 771, y: 698, w: 60, h: 72, to: 'the_fracture_part1', toX: 455, toY: 896 },
        { x: 0, y: 698, w: 60, h: 72, to: 'spawn_area_1', toX: 940, toY: 460 }
      ],
      connections: [
        {
          direction: 'south',
          to: 'the_fracture_part1',
          requires: null,
          oneWay: true,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'west',
          to: 'spawn_area_1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 750, index: 0 }
      ],
      abilityReward: null,
      // Read by updateTutorial()/drawTrainingDummy() in game.js — dropped
      // during the 2026-07-17 bulk SVG regeneration (not part of the SVG
      // schema, so it was silently lost) and never restored, leaving the
      // ATTACK step of the tutorial permanently unsatisfiable. Placed
      // between the entry door (spawn_area_1, lands at x:60) and the exit
      // door (the_fracture_part1, at x:771) so the player walks past it
      // either way; groundY is 770, dummy sits flush on the floor.
      trainingDummy: { x: 400, y: 714, w: 36, h: 56 }
    },

    the_fracture_part1: {
      id: 'the_fracture_part1',
      name: 'The Fracture, part 1',
      region: 'origin',
      col: 1,
      row: 1,
      width: 1000,
      roomHeight: 996,
      groundY: 936,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(100,60,150,0.03)',
      ambientColor: '#c4b5fd',
      platforms: [
        { x: 0, y: 936, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 425, y: 864, w: 60, h: 72, to: 'tutorial_area', toX: 801, toY: 730 },
        { x: 0, y: 864, w: 60, h: 72, to: 'the_fracture_part3', toX: 940, toY: 460 },
        { x: 940, y: 864, w: 60, h: 72, to: 'the_fracture_part2', toX: 60, toY: 460 },
        {
          x: 826,
          y: 864,
          w: 60,
          h: 72,
          to: 'crag_entrance',
          toX: 60,
          toY: 693,
          requires: 'phase_dash'
        }
      ],
      connections: [
        {
          direction: 'north',
          to: 'tutorial_area',
          requires: null,
          oneWay: true,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'west',
          to: 'the_fracture_part3',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        },
        {
          direction: 'east',
          to: 'the_fracture_part2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 2
        },
        {
          direction: 'east',
          to: 'crag_entrance',
          requires: 'phase_dash',
          oneWay: false,
          order: 1,
          doorIndex: 3,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 916, index: 0 }
      ],
      abilityReward: null
    },

    the_fracture_part2: {
      id: 'the_fracture_part2',
      name: 'The Fracture, part 2',
      region: 'origin',
      col: 2,
      row: 1,
      width: 2462,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(100,60,150,0.03)',
      ambientColor: '#c4b5fd',
      platforms: [
        { x: 0, y: 500, w: 2462, h: 60 }
      ],
      transitions: [
        { x: 0, y: 428, w: 60, h: 72, to: 'the_fracture_part1', toX: 940, toY: 896 },
        { x: 1201, y: 428, w: 60, h: 72, to: 'mirror_veil_gate', toX: 150, toY: 3855 },
        {
          x: 2402,
          y: 428,
          w: 60,
          h: 72,
          to: 'sovereign_room1',
          toX: 60,
          toY: 460,
          requires: 'post_game'
        }
      ],
      connections: [
        {
          direction: 'west',
          to: 'the_fracture_part1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'south',
          to: 'mirror_veil_gate',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'sovereign_room1',
          requires: 'post_game',
          oneWay: false,
          order: 0,
          doorIndex: 2
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 480, index: 0 }
      ],
      abilityReward: null
    },

    the_fracture_part3: {
      id: 'the_fracture_part3',
      name: 'The Fracture, part 3',
      region: 'origin',
      col: 0,
      row: 1,
      width: 1000,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(100,60,150,0.03)',
      ambientColor: '#c4b5fd',
      platforms: [
        { x: 0, y: 500, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 940, y: 428, w: 60, h: 72, to: 'the_fracture_part1', toX: 60, toY: 896 },
        { x: 470, y: 428, w: 60, h: 72, to: 'the_fracture_part4', toX: 150, toY: 2721 },
        {
          x: 0,
          y: 428,
          w: 60,
          h: 72,
          to: 'chrono_rift_echo',
          toX: 4447,
          toY: 460,
          requires: 'void_tether'
        }
      ],
      connections: [
        {
          direction: 'east',
          to: 'the_fracture_part1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'south',
          to: 'the_fracture_part4',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'west',
          to: 'chrono_rift_echo',
          requires: 'void_tether',
          oneWay: false,
          order: 0,
          doorIndex: 2
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 480, index: 0 }
      ],
      abilityReward: null
    },

    the_fracture_part4: {
      id: 'the_fracture_part4',
      name: 'The Fracture, part 4',
      region: 'origin',
      col: 0,
      row: 2,
      width: 1000,
      roomHeight: 2821,
      groundY: 2761,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(100,60,150,0.03)',
      ambientColor: '#c4b5fd',
      platforms: [
        { x: 0, y: 2761, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 120, y: 2689, w: 60, h: 72, to: 'the_fracture_part3', toX: 500, toY: 460 },
        { x: 820, y: 2689, w: 60, h: 72, to: 'echo_bridge_part1', toX: 4229, toY: 460 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'the_fracture_part3',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'south',
          to: 'echo_bridge_part1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 2741, index: 0 }
      ],
      abilityReward: null
    },

    crag_entrance: {
      id: 'crag_entrance',
      name: 'Crag Entrance',
      region: 'crag',
      mapAccent: '#d97757',
      col: 2,
      row: 1,
      width: 1286,
      roomHeight: 793,
      groundY: 733,
      bgColor: '#120a06',
      bgTint: 'rgba(180,90,40,0.05)',
      ambientColor: '#d97757',
      platforms: [
        { x: 0, y: 733, w: 1286, h: 60 }
      ],
      transitions: [
        { x: 0, y: 661, w: 60, h: 72, to: 'the_fracture_part1', toX: 856, toY: 896 },
        { x: 1226, y: 661, w: 60, h: 72, to: 'crag_breach', toX: 60, toY: 1283 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'the_fracture_part1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'east',
          to: 'crag_breach',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        }
      ],
      enemies: [],
      anchors: [
        { x: 129, y: 713, index: 0 }
      ],
      abilityReward: null
    },

    crag_breach: {
      id: 'crag_breach',
      name: 'Crag Breach',
      region: 'crag',
      mapAccent: '#d97757',
      col: 3,
      row: 1,
      width: 1000,
      roomHeight: 1383,
      groundY: 1323,
      bgColor: '#0f0805',
      bgTint: 'rgba(160,70,30,0.06)',
      ambientColor: '#c2703d',
      platforms: [
        { x: 0, y: 1323, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 0, y: 1251, w: 60, h: 72, to: 'crag_entrance', toX: 1226, toY: 693 },
        { x: 114, y: 1251, w: 60, h: 72, to: 'crag_altar', toX: 991, toY: 1283 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'crag_entrance',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'west',
          to: 'crag_altar',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 1303, index: 0 }
      ],
      abilityReward: null
    },

    crag_altar: {
      id: 'crag_altar',
      name: 'Crag Altar',
      region: 'crag',
      mapAccent: '#d97757',
      col: 2,
      row: 1,
      width: 1051,
      roomHeight: 1383,
      groundY: 1323,
      bgColor: '#0d0704',
      bgTint: 'rgba(217,119,87,0.08)',
      ambientColor: '#fb923c',
      platforms: [
        { x: 0, y: 1323, w: 1051, h: 60 }
      ],
      transitions: [
        { x: 991, y: 1251, w: 60, h: 72, to: 'crag_breach', toX: 144, toY: 1283 },
        { x: 484, y: 1251, w: 60, h: 72, to: 'crag_warden', toX: 583, toY: 460 }
      ],
      connections: [
        {
          direction: 'east',
          to: 'crag_breach',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'south',
          to: 'crag_warden',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 105, y: 1303, index: 0 }
      ],
      abilityReward: {
        id: 'charged_attack',
        x: 526,
        y: 1263,
        name: 'Charged Attack',
        desc: 'Hold Z/J to charge a heavy strike.'
      },
      healingCrystals: [
        { id: 'hc_crag_altar_1', x: 294, y: 1283 }
      ]
    },

    crag_warden: {
      id: 'crag_warden',
      name: 'Crag Warden',
      region: 'crag',
      roomType: 'miniboss',
      mapAccent: '#d97757',
      col: 2,
      row: 2,
      width: 1051,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0503',
      bgTint: 'rgba(217,119,87,0.1)',
      ambientColor: '#fb923c',
      platforms: [
        { x: 0, y: 500, w: 1051, h: 60 }
      ],
      transitions: [
        { x: 553, y: 428, w: 60, h: 72, to: 'crag_altar', toX: 514, toY: 1283 },
        { x: 0, y: 428, w: 60, h: 72, to: 'echo_bridge_part1', toX: 4274, toY: 460 },
        {
          x: 114,
          y: 428,
          w: 60,
          h: 72,
          to: 'sovereign_room3',
          toX: 940,
          toY: 965,
          requires: 'post_game'
        }
      ],
      connections: [
        {
          direction: 'north',
          to: 'crag_altar',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'west',
          to: 'echo_bridge_part1',
          requires: null,
          oneWay: true,
          order: 0,
          doorIndex: 1,
          shortcut: true
        },
        {
          direction: 'west',
          to: 'sovereign_room3',
          requires: 'post_game',
          oneWay: false,
          order: 1,
          doorIndex: 2,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 105, y: 480, index: 0 }
      ],
      abilityReward: null,
      loreFragments: [
        { id: 'lore_cw1', x: 294, y: 460, text: 'A heart doesn\'t ask what it\'s protecting.' }
      ],
      miniboss: 'colossus_core',
      bossSpawn: { x: 600, y: 334 }
    },

    mirror_veil_gate: {
      id: 'mirror_veil_gate',
      name: 'Mirror Veil — Gate',
      region: 'mirror_veil',
      mapAccent: '#c084fc',
      col: 2,
      row: 2,
      width: 1000,
      roomHeight: 3955,
      groundY: 3895,
      bgColor: '#0a0a12',
      bgTint: 'rgba(192,132,252,0.05)',
      ambientColor: '#c084fc',
      platforms: [
        { x: 0, y: 3895, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 940, y: 3823, w: 60, h: 72, to: 'mirror_veil_reflection', toX: 60, toY: 591 },
        { x: 120, y: 3823, w: 60, h: 72, to: 'the_fracture_part2', toX: 1231, toY: 460 },
        { x: 796, y: 3823, w: 60, h: 72, to: 'timeline_x_roads_room1', toX: 264, toY: 460 }
      ],
      connections: [
        {
          direction: 'east',
          to: 'mirror_veil_reflection',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'north',
          to: 'the_fracture_part2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'south',
          to: 'timeline_x_roads_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 2,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 3875, index: 0 }
      ],
      abilityReward: null
    },

    mirror_veil_reflection: {
      id: 'mirror_veil_reflection',
      name: 'Mirror Veil — Reflection',
      region: 'mirror_veil',
      mapAccent: '#c084fc',
      col: 3,
      row: 2,
      width: 2102,
      roomHeight: 691,
      groundY: 631,
      bgColor: '#0a0a12',
      bgTint: 'rgba(192,132,252,0.06)',
      ambientColor: '#c084fc',
      platforms: [
        { x: 0, y: 631, w: 2102, h: 60 }
      ],
      transitions: [
        { x: 0, y: 559, w: 60, h: 72, to: 'mirror_veil_gate', toX: 940, toY: 3855 },
        { x: 1033, y: 559, w: 60, h: 72, to: 'mirror_veil_hollow', toX: 512, toY: 591 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'mirror_veil_gate',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'south',
          to: 'mirror_veil_hollow',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 611, index: 0 }
      ],
      abilityReward: null,
      loreFragments: [
        { id: 'lore_mvr1', x: 589, y: 591, text: 'The reflection knows what you will become.' }
      ]
    },

    mirror_veil_hollow: {
      id: 'mirror_veil_hollow',
      name: 'Mirror Veil — Hollow',
      region: 'mirror_veil',
      roomType: 'miniboss',
      mapAccent: '#c084fc',
      col: 3,
      row: 3,
      width: 1000,
      roomHeight: 691,
      groundY: 631,
      bgColor: '#0a0a12',
      bgTint: 'rgba(192,132,252,0.07)',
      ambientColor: '#c084fc',
      platforms: [
        { x: 0, y: 631, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 482, y: 559, w: 60, h: 72, to: 'mirror_veil_reflection', toX: 1063, toY: 591 },
        { x: 0, y: 559, w: 60, h: 72, to: 'mirror_veil_sanctum', toX: 940, toY: 591 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'mirror_veil_reflection',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'west',
          to: 'mirror_veil_sanctum',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 611, index: 0 }
      ],
      abilityReward: null,
      miniboss: 'hollow_guardian',
      bossSpawn: { x: 450, y: 334 }
    },

    mirror_veil_sanctum: {
      id: 'mirror_veil_sanctum',
      name: 'Mirror Veil — Sanctum',
      region: 'mirror_veil',
      mapAccent: '#c084fc',
      col: 2,
      row: 3,
      width: 1000,
      roomHeight: 691,
      groundY: 631,
      bgColor: '#0a0a12',
      bgTint: 'rgba(192,132,252,0.08)',
      ambientColor: '#c084fc',
      platforms: [
        { x: 0, y: 631, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 940, y: 559, w: 60, h: 72, to: 'mirror_veil_hollow', toX: 60, toY: 591 },
        { x: 458, y: 559, w: 60, h: 72, to: 'mirror_corridor', toX: 488, toY: 1919 }
      ],
      connections: [
        {
          direction: 'east',
          to: 'mirror_veil_hollow',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'south',
          to: 'mirror_corridor',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 611, index: 0 }
      ],
      abilityReward: { id: 'phase_dash', x: 500, y: 571, name: 'Phase Dash', desc: 'C – dash through space.' }
    },

    mirror_corridor: {
      id: 'mirror_corridor',
      name: 'Mirror Corridor',
      region: 'mirror_veil',
      mapAccent: '#c084fc',
      col: -3,
      row: 1,
      width: 1000,
      roomHeight: 2019,
      groundY: 1959,
      bgColor: '#0a0a12',
      bgTint: 'rgba(192,132,252,0.05)',
      ambientColor: '#c084fc',
      platforms: [
        { x: 0, y: 1959, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 458, y: 1887, w: 60, h: 72, to: 'mirror_veil_sanctum', toX: 488, toY: 591 },
        { x: 940, y: 1887, w: 60, h: 72, to: 'event_horizon_gate', toX: 60, toY: 591 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'mirror_veil_sanctum',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          shortcut: true
        },
        {
          direction: 'east',
          to: 'event_horizon_gate',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 1939, index: 0 }
      ],
      abilityReward: null
    },

    echo_bridge_part1: {
      id: 'echo_bridge_part1',
      name: 'Echo Bridge, part 1',
      region: 'origin',
      col: 0,
      row: 3,
      width: 8547,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(140,80,200,0.04)',
      ambientColor: '#8b5cf6',
      platforms: [
        { x: 0, y: 500, w: 8547, h: 60 }
      ],
      transitions: [
        { x: 4199, y: 428, w: 60, h: 72, to: 'the_fracture_part4', toX: 850, toY: 2721 },
        { x: 8487, y: 428, w: 60, h: 72, to: 'upper_ruins', toX: 60, toY: 923 },
        {
          x: 0,
          y: 428,
          w: 60,
          h: 72,
          to: 'void_expanse_room1',
          toX: 5693,
          toY: 2943,
          requires: 'prison_sequence_finished'
        },
        {
          x: 114,
          y: 428,
          w: 60,
          h: 72,
          to: 'observatory_room2',
          toX: 2125,
          toY: 1034,
          requires: 'void_tether'
        },
        { x: 8373, y: 428, w: 60, h: 72, to: 'crystal_cavern', toX: 60, toY: 1034 },
        { x: 8283, y: 428, w: 60, h: 72, to: 'timeline_x_roads_room1', toX: 144, toY: 460 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'the_fracture_part4',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'upper_ruins',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        },
        {
          direction: 'west',
          to: 'void_expanse_room1',
          requires: 'prison_sequence_finished',
          oneWay: false,
          order: 0,
          doorIndex: 2,
          shortcut: true
        },
        {
          direction: 'west',
          to: 'observatory_room2',
          requires: 'void_tether',
          oneWay: false,
          order: 1,
          doorIndex: 3,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'crystal_cavern',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 4,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'timeline_x_roads_room1',
          requires: null,
          oneWay: false,
          order: 2,
          doorIndex: 5,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 480, index: 0 },
        { x: 4274, y: 480, index: 1 },
        { x: 8347, y: 480, index: 2 }
      ],
      abilityReward: {
        id: 'max_health_upgrade_1',
        x: 4274,
        y: 440,
        name: 'Max Health +1',
        desc: 'Increases max health by 1.'
      }
    },

    echo_bridge_prison: {
      id: 'echo_bridge_prison',
      name: 'Echo Bridge Prison',
      region: 'origin',
      col: 3,
      row: 3,
      width: 1715,
      roomHeight: 682,
      groundY: 622,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(140,80,200,0.04)',
      ambientColor: '#8b5cf6',
      platforms: [
        { x: 0, y: 622, w: 1715, h: 60 }
      ],
      transitions: [
        { x: 828, y: 550, w: 60, h: 72, to: 'timeline_x_roads_room2', toX: 3601, toY: 2113 },
        { x: 1655, y: 550, w: 60, h: 72, to: 'event_horizon_pull', toX: 144, toY: 2472 },
        { x: 0, y: 550, w: 60, h: 72, to: 'timeline_x_roads_room1', toX: 940, toY: 460 }
      ],
      connections: [
        {
          direction: 'south',
          to: 'timeline_x_roads_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          shortcut: true
        },
        {
          direction: 'east',
          to: 'event_horizon_pull',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          shortcut: true
        },
        {
          direction: 'west',
          to: 'timeline_x_roads_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 2
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 602, index: 0 }
      ],
      abilityReward: { id: 'parry', x: 900, y: 582, name: 'Parry',
        desc: 'Tap Down to deflect an attack. Hold Down to duck/crawl instead.' },
      cosmeticUpgrades: [
        { id: 'cu_ebp_1', x: 480, y: 582, name: 'Cosmetic Upgrade' }
      ]
    },

    upper_ruins: {
      id: 'upper_ruins',
      name: 'Upper Ruins',
      region: 'origin',
      mapAccent: '#fbbf24',
      col: 1,
      row: 3,
      width: 1023,
      roomHeight: 1023,
      groundY: 963,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(160,120,80,0.04)',
      ambientColor: '#fbbf24',
      platforms: [
        { x: 0, y: 963, w: 1023, h: 60 }
      ],
      transitions: [
        { x: 0, y: 891, w: 60, h: 72, to: 'echo_bridge_part1', toX: 8487, toY: 460 },
        { x: 494, y: 891, w: 60, h: 72, to: 'pacifist_region', toX: 500, toY: 460 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'echo_bridge_part1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'north',
          to: 'pacifist_region',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 102, y: 943, index: 0 }
      ],
      abilityReward: null
    },

    pacifist_region: {
      id: 'pacifist_region',
      name: 'Pacifist Region',
      region: 'origin',
      col: 1,
      row: 2,
      width: 1000,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(160,120,80,0.04)',
      ambientColor: '#fbbf24',
      platforms: [
        { x: 0, y: 500, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 470, y: 428, w: 60, h: 72, to: 'upper_ruins', toX: 524, toY: 923 }
      ],
      connections: [
        {
          direction: 'south',
          to: 'upper_ruins',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 480, index: 0 }
      ],
      abilityReward: null,
      loreFragments: [
        { id: 'lore_pr1', x: 280, y: 460, text: 'Peace is a choice, not a victory.' }
      ]
    },

    crystal_cavern: {
      id: 'crystal_cavern',
      name: 'Crystal Cavern',
      region: 'origin',
      col: 1,
      row: 3,
      width: 1798,
      roomHeight: 1134,
      groundY: 1074,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(45,212,191,0.05)',
      ambientColor: '#2dd4bf',
      platforms: [
        { x: 0, y: 1074, w: 1798, h: 60 }
      ],
      transitions: [
        { x: 0, y: 1002, w: 60, h: 72, to: 'echo_bridge_part1', toX: 8403, toY: 460 },
        { x: 114, y: 1002, w: 60, h: 72, to: 'echoing_abyss_room1', toX: 1157, toY: 460 },
        {
          x: 914,
          y: 1002,
          w: 60,
          h: 72,
          to: 'timeline_x_roads_room3',
          toX: 826,
          toY: 460,
          requires: 'void_tether'
        },
        { x: 1738, y: 1002, w: 60, h: 72, to: 'timeline_x_roads_room1', toX: 60, toY: 460 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'echo_bridge_part1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'west',
          to: 'echoing_abyss_room1',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'south',
          to: 'timeline_x_roads_room3',
          requires: 'void_tether',
          oneWay: false,
          order: 0,
          doorIndex: 2,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'timeline_x_roads_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 3,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 1054, index: 0 }
      ],
      abilityReward: {
        id: 'shard_shot',
        x: 899,
        y: 1014,
        name: 'Shard Shot',
        desc: 'Hold V to aim, release to fire.'
      }
    },

    echoing_abyss_room1: {
      id: 'echoing_abyss_room1',
      name: 'Echoing Abyss Room 1',
      region: 'abyss',
      mapAccent: '#0CFFD3',
      col: 0,
      row: 3,
      width: 1217,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(12,255,211,0.05)',
      ambientColor: '#0CFFD3',
      platforms: [
        { x: 0, y: 500, w: 1217, h: 60 }
      ],
      transitions: [
        { x: 1157, y: 428, w: 60, h: 72, to: 'crystal_cavern', toX: 144, toY: 1034 },
        { x: 567, y: 428, w: 60, h: 72, to: 'echoing_abyss_room2', toX: 609, toY: 460 }
      ],
      connections: [
        {
          direction: 'east',
          to: 'crystal_cavern',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'south',
          to: 'echoing_abyss_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 122, y: 480, index: 0 }
      ],
      abilityReward: null
    },

    echoing_abyss_room2: {
      id: 'echoing_abyss_room2',
      name: 'Echoing Abyss Room 2',
      region: 'abyss',
      roomType: 'miniboss',
      mapAccent: '#0CFFD3',
      col: 0,
      row: 4,
      width: 1217,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(12,255,211,0.07)',
      ambientColor: '#0CFFD3',
      platforms: [
        { x: 0, y: 500, w: 1217, h: 60 }
      ],
      transitions: [
        { x: 579, y: 428, w: 60, h: 72, to: 'echoing_abyss_room1', toX: 597, toY: 460 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'echoing_abyss_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 122, y: 480, index: 0 }
      ],
      abilityReward: null,
      loreFragments: [
        { id: 'lore_ea2_1', x: 341, y: 460, text: 'The abyss echoes back only what you bring.' }
      ],
      miniboss: 'abyss_guardian',
      bossSpawn: { x: 500, y: 334 }
    },

    timeline_x_roads_room1: {
      id: 'timeline_x_roads_room1',
      name: 'Timeline X Roads, Room 1',
      region: 'timeline',
      mapAccent: '#8E00FF',
      col: 2,
      row: 3,
      width: 1000,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(142,0,255,0.05)',
      ambientColor: '#8E00FF',
      platforms: [
        { x: 0, y: 500, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 234, y: 428, w: 60, h: 72, to: 'mirror_veil_gate', toX: 826, toY: 3855 },
        { x: 796, y: 428, w: 60, h: 72, to: 'timeline_x_roads_room2', toX: 354, toY: 2113 },
        { x: 940, y: 428, w: 60, h: 72, to: 'echo_bridge_prison', toX: 60, toY: 582 },
        { x: 0, y: 428, w: 60, h: 72, to: 'crystal_cavern', toX: 1738, toY: 1034 },
        { x: 114, y: 428, w: 60, h: 72, to: 'echo_bridge_part1', toX: 8313, toY: 460 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'mirror_veil_gate',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'south',
          to: 'timeline_x_roads_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'echo_bridge_prison',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 2
        },
        {
          direction: 'west',
          to: 'crystal_cavern',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 3,
          shortcut: true
        },
        {
          direction: 'west',
          to: 'echo_bridge_part1',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 4,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 480, index: 0 }
      ],
      abilityReward: null
    },

    timeline_x_roads_room2: {
      id: 'timeline_x_roads_room2',
      name: 'Timeline X Roads, Room 2',
      region: 'timeline',
      roomType: 'miniboss',
      mapAccent: '#8E00FF',
      col: 2,
      row: 4,
      width: 3955,
      roomHeight: 2213,
      groundY: 2153,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(142,0,255,0.07)',
      ambientColor: '#8E00FF',
      platforms: [
        { x: 0, y: 2153, w: 3955, h: 60 }
      ],
      transitions: [
        { x: 324, y: 2081, w: 60, h: 72, to: 'timeline_x_roads_room1', toX: 826, toY: 460 },
        { x: 0, y: 2081, w: 60, h: 72, to: 'timeline_x_roads_room3', toX: 940, toY: 460 },
        {
          x: 3895,
          y: 2081,
          w: 60,
          h: 72,
          to: 'puppet_strings_part1',
          toX: 60,
          toY: 730,
          requires: 'void_tether'
        },
        {
          x: 114,
          y: 2081,
          w: 60,
          h: 72,
          to: 'observatory_room1',
          toX: 1987,
          toY: 1034,
          requires: 'charged_attack'
        },
        {
          x: 1406,
          y: 2081,
          w: 60,
          h: 72,
          to: 'sovereign_room2',
          toX: 500,
          toY: 702,
          requires: 'post_game'
        },
        {
          x: 2489,
          y: 2081,
          w: 60,
          h: 72,
          to: 'graviton_core_room1',
          toX: 1369,
          toY: 1034,
          requires: 'shard_shot'
        },
        {
          x: 204,
          y: 2081,
          w: 60,
          h: 72,
          to: 'the_rift',
          toX: 4171,
          toY: 840,
          requires: 'stillpoint,phase_dash,timeline_x_roads_2_visited'
        },
        { x: 3571, y: 2081, w: 60, h: 72, to: 'echo_bridge_prison', toX: 858, toY: 582 },
        { x: 3781, y: 2081, w: 60, h: 72, to: 'puppet_strings_part2', toX: 60, toY: 730 },
        { x: 3691, y: 2081, w: 60, h: 72, to: 'inverted_spire', toX: 60, toY: 1214 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'timeline_x_roads_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'west',
          to: 'timeline_x_roads_room3',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          shortcut: true
        },
        {
          direction: 'east',
          to: 'puppet_strings_part1',
          requires: 'void_tether',
          oneWay: false,
          order: 0,
          doorIndex: 2
        },
        {
          direction: 'west',
          to: 'observatory_room1',
          requires: 'charged_attack',
          oneWay: false,
          order: 1,
          doorIndex: 3,
          shortcut: true
        },
        {
          direction: 'south',
          to: 'sovereign_room2',
          requires: 'post_game',
          oneWay: false,
          order: 0,
          doorIndex: 4,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'south',
          to: 'graviton_core_room1',
          requires: 'shard_shot',
          oneWay: false,
          order: 1,
          doorIndex: 5,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'west',
          to: 'the_rift',
          requires: 'stillpoint,phase_dash,timeline_x_roads_2_visited',
          oneWay: false,
          order: 2,
          doorIndex: 6,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'north',
          to: 'echo_bridge_prison',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 7,
          shortcut: true
        },
        {
          direction: 'east',
          to: 'puppet_strings_part2',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 8,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'inverted_spire',
          requires: null,
          oneWay: false,
          order: 2,
          doorIndex: 9,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 2133, index: 0 },
        { x: 1978, y: 2133, index: 1 }
      ],
      abilityReward: {
        id: 'void_tether',
        name: 'Void Tether',
        desc: 'R pulls the enemy you face to you — or you to a wall.',
        x: 1978,
        y: 2093
      },
      loreFragments: [
        {
          id: 'lore_txr2_1',
          x: 1107,
          y: 2113,
          text: 'The crossroads bend to those who have walked them.'
        }
      ],
      miniboss: 'timeline_keeper',
      bossSpawn: { x: 600, y: 334 }
    },

    timeline_x_roads_room3: {
      id: 'timeline_x_roads_room3',
      name: 'Timeline X Roads, Room 3',
      region: 'timeline',
      mapAccent: '#8E00FF',
      col: 1,
      row: 4,
      width: 1000,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(142,0,255,0.06)',
      ambientColor: '#8E00FF',
      platforms: [
        { x: 0, y: 500, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 940, y: 428, w: 60, h: 72, to: 'timeline_x_roads_room2', toX: 60, toY: 2113 },
        { x: 0, y: 428, w: 60, h: 72, to: 'chrono_rift_gate', toX: 1709, toY: 1089 },
        {
          x: 144,
          y: 428,
          w: 60,
          h: 72,
          to: 'the_forge',
          toX: 264,
          toY: 1034,
          requires: 'stillpoint'
        },
        { x: 796, y: 428, w: 60, h: 72, to: 'crystal_cavern', toX: 944, toY: 1034 }
      ],
      connections: [
        {
          direction: 'east',
          to: 'timeline_x_roads_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          shortcut: true
        },
        {
          direction: 'west',
          to: 'chrono_rift_gate',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          shortcut: true
        },
        {
          direction: 'south',
          to: 'the_forge',
          requires: 'stillpoint',
          oneWay: false,
          order: 0,
          doorIndex: 2,
          shortcut: true
        },
        {
          direction: 'north',
          to: 'crystal_cavern',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 3,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 480, index: 0 }
      ],
      abilityReward: null
    },

    puppet_strings_part1: {
      id: 'puppet_strings_part1',
      name: 'Puppet Strings / Tether Part 1',
      region: 'timeline',
      mapAccent: '#BD34D1',
      col: 3,
      row: 4,
      width: 1936,
      roomHeight: 830,
      groundY: 770,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(189,52,209,0.05)',
      ambientColor: '#BD34D1',
      platforms: [
        { x: 0, y: 770, w: 1936, h: 60 }
      ],
      transitions: [
        { x: 0, y: 698, w: 60, h: 72, to: 'timeline_x_roads_room2', toX: 3895, toY: 2113 },
        { x: 950, y: 698, w: 60, h: 72, to: 'puppet_strings_part2', toX: 980, toY: 730 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'timeline_x_roads_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'south',
          to: 'puppet_strings_part2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 750, index: 0 }
      ],
      abilityReward: null
    },

    puppet_strings_part2: {
      id: 'puppet_strings_part2',
      name: 'Puppet Strings / Tether Part 2',
      region: 'timeline',
      mapAccent: '#BD34D1',
      col: 3,
      row: 4,
      width: 1936,
      roomHeight: 830,
      groundY: 770,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(189,52,209,0.06)',
      ambientColor: '#BD34D1',
      platforms: [
        { x: 0, y: 770, w: 1936, h: 60 }
      ],
      transitions: [
        { x: 950, y: 698, w: 60, h: 72, to: 'puppet_strings_part1', toX: 980, toY: 730 },
        { x: 0, y: 698, w: 60, h: 72, to: 'timeline_x_roads_room2', toX: 3811, toY: 2113 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'puppet_strings_part1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          shortcut: true
        },
        {
          direction: 'west',
          to: 'timeline_x_roads_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 750, index: 0 }
      ],
      abilityReward: {
        id: 'max_health_upgrade_2',
        x: 968,
        y: 710,
        name: 'Max Health +1',
        desc: 'Increases max health by 1.'
      }
    },

    observatory_room1: {
      id: 'observatory_room1',
      name: 'Observatory, Room 1',
      region: 'observatory',
      mapAccent: '#F7C325',
      col: -1,
      row: 4,
      width: 2047,
      roomHeight: 1134,
      groundY: 1074,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(247,195,37,0.05)',
      ambientColor: '#F7C325',
      platforms: [
        { x: 0, y: 1074, w: 2047, h: 60 }
      ],
      transitions: [
        { x: 1987, y: 1002, w: 60, h: 72, to: 'timeline_x_roads_room2', toX: 144, toY: 2113 },
        { x: 937, y: 1002, w: 60, h: 72, to: 'observatory_room2', toX: 1093, toY: 1034 },
        { x: 1873, y: 1002, w: 60, h: 72, to: 'the_forge', toX: 144, toY: 1034 }
      ],
      connections: [
        {
          direction: 'east',
          to: 'timeline_x_roads_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          shortcut: true
        },
        {
          direction: 'north',
          to: 'observatory_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'the_forge',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 2,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 1054, index: 0 }
      ],
      abilityReward: null
    },

    observatory_room2: {
      id: 'observatory_room2',
      name: 'Observatory, Room 2',
      region: 'observatory',
      mapAccent: '#F7C325',
      col: -1,
      row: 3,
      width: 2185,
      roomHeight: 1134,
      groundY: 1074,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(247,195,37,0.06)',
      ambientColor: '#F7C325',
      platforms: [
        { x: 0, y: 1074, w: 2185, h: 60 }
      ],
      transitions: [
        { x: 1063, y: 1002, w: 60, h: 72, to: 'observatory_room1', toX: 967, toY: 1034 },
        { x: 0, y: 1002, w: 60, h: 72, to: 'observatory_room3', toX: 1738, toY: 1034 },
        { x: 2125, y: 1002, w: 60, h: 72, to: 'echo_bridge_part1', toX: 144, toY: 460 }
      ],
      connections: [
        {
          direction: 'south',
          to: 'observatory_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'west',
          to: 'observatory_room3',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        },
        {
          direction: 'east',
          to: 'echo_bridge_part1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 2
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 1054, index: 0 }
      ],
      abilityReward: null,
      loreFragments: [
        {
          id: 'lore_obs2_1',
          x: 612,
          y: 1034,
          text: 'The stars align only for those who look up.'
        }
      ]
    },

    observatory_room3: {
      id: 'observatory_room3',
      name: 'Observatory, Room 3',
      region: 'observatory',
      mapAccent: '#F7C325',
      col: -2,
      row: 3,
      width: 1798,
      roomHeight: 1134,
      groundY: 1074,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(247,195,37,0.07)',
      ambientColor: '#F7C325',
      platforms: [
        { x: 0, y: 1074, w: 1798, h: 60 }
      ],
      transitions: [
        { x: 1738, y: 1002, w: 60, h: 72, to: 'observatory_room2', toX: 60, toY: 1034 },
        {
          x: 0,
          y: 1002,
          w: 60,
          h: 72,
          to: 'sovereign_observatory',
          toX: 1987,
          toY: 1034,
          requires: 'graviton_surge'
        }
      ],
      connections: [
        {
          direction: 'east',
          to: 'observatory_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'west',
          to: 'sovereign_observatory',
          requires: 'graviton_surge',
          oneWay: false,
          order: 0,
          doorIndex: 1,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 1054, index: 0 }
      ],
      abilityReward: null
    },

    sovereign_observatory: {
      id: 'sovereign_observatory',
      name: 'Sovereign’s Observatory',
      region: 'observatory',
      mapAccent: '#F7C325',
      col: -1,
      row: 3,
      width: 2047,
      roomHeight: 1134,
      groundY: 1074,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(247,195,37,0.08)',
      ambientColor: '#F7C325',
      platforms: [
        { x: 0, y: 1074, w: 2047, h: 60 }
      ],
      transitions: [
        { x: 1987, y: 1002, w: 60, h: 72, to: 'observatory_room3', toX: 60, toY: 1034 },
        { x: 982, y: 1002, w: 60, h: 72, to: 'void_expanse_room1', toX: 2820, toY: 2943 }
      ],
      connections: [
        {
          direction: 'east',
          to: 'observatory_room3',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          shortcut: true
        },
        {
          direction: 'north',
          to: 'void_expanse_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 1054, index: 0 }
      ],
      abilityReward: null,
      loreFragments: [
        { id: 'lore_so_1', x: 573, y: 1034, text: 'The Sovereign sees all, but watches nothing.' }
      ]
    },

    the_forge: {
      id: 'the_forge',
      name: 'The Forge',
      region: 'origin',
      col: 0,
      row: 4,
      width: 2047,
      roomHeight: 1134,
      groundY: 1074,
      bgColor: '#080812',
      bgTint: 'rgba(45,130,180,0.04)',
      ambientColor: '#67e8f9',
      platforms: [
        { x: 0, y: 1074, w: 2047, h: 60 }
      ],
      transitions: [
        { x: 234, y: 1002, w: 60, h: 72, to: 'timeline_x_roads_room3', toX: 174, toY: 460 },
        { x: 0, y: 1002, w: 60, h: 72, to: 'chrono_rift_gate', toX: 1793, toY: 1089 },
        { x: 1867, y: 1002, w: 60, h: 72, to: 'the_vault_room1', toX: 264, toY: 1034 },
        { x: 114, y: 1002, w: 60, h: 72, to: 'observatory_room1', toX: 1903, toY: 1034 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'timeline_x_roads_room3',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          shortcut: true
        },
        {
          direction: 'west',
          to: 'chrono_rift_gate',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          shortcut: true
        },
        {
          direction: 'south',
          to: 'the_vault_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 2,
          shortcut: true
        },
        {
          direction: 'west',
          to: 'observatory_room1',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 3,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 1054, index: 0 }
      ],
      abilityReward: null,
      fracturePipRewards: [
        { id: 'fp_tf_1', x: 573, y: 1034 }
      ]
    },

    chrono_rift_gate: {
      id: 'chrono_rift_gate',
      name: 'Chrono Space Rift, Gate',
      region: 'chrono_rift',
      mapAccent: '#a78bfa',
      col: -1,
      row: 2,
      width: 1853,
      roomHeight: 1189,
      groundY: 1129,
      bgColor: '#0a0a10',
      bgTint: 'rgba(167,139,250,0.05)',
      ambientColor: '#a78bfa',
      platforms: [
        { x: 0, y: 1129, w: 1853, h: 60 }
      ],
      transitions: [
        { x: 1793, y: 1057, w: 60, h: 72, to: 'the_forge', toX: 60, toY: 1034 },
        { x: 0, y: 1057, w: 60, h: 72, to: 'chrono_rift_loop1', toX: 7102, toY: 1089 },
        { x: 1679, y: 1057, w: 60, h: 72, to: 'timeline_x_roads_room3', toX: 60, toY: 460 }
      ],
      connections: [
        {
          direction: 'east',
          to: 'the_forge',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          shortcut: true
        },
        {
          direction: 'west',
          to: 'chrono_rift_loop1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        },
        {
          direction: 'east',
          to: 'timeline_x_roads_room3',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 2,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 1109, index: 0 }
      ],
      abilityReward: null
    },

    chrono_rift_loop1: {
      id: 'chrono_rift_loop1',
      name: 'Chrono Space Rift, Loop, Part 1',
      region: 'chrono_rift',
      mapAccent: '#a78bfa',
      col: -2,
      row: 2,
      width: 7162,
      roomHeight: 1189,
      groundY: 1129,
      bgColor: '#0a0a10',
      bgTint: 'rgba(167,139,250,0.06)',
      ambientColor: '#a78bfa',
      platforms: [
        { x: 0, y: 1129, w: 7162, h: 60 }
      ],
      transitions: [
        { x: 7102, y: 1057, w: 60, h: 72, to: 'chrono_rift_gate', toX: 60, toY: 1089 },
        { x: 120, y: 1057, w: 60, h: 72, to: 'chrono_rift_loop2', toX: 510, toY: 5847 },
        {
          x: 6868,
          y: 1057,
          w: 60,
          h: 72,
          to: 'void_expanse_room1',
          toX: 150,
          toY: 2943,
          requires: 'void_tether'
        },
        {
          x: 6988,
          y: 1057,
          w: 60,
          h: 72,
          to: 'sovereign_room4',
          toX: 60,
          toY: 1089,
          requires: 'post_game'
        }
      ],
      connections: [
        {
          direction: 'east',
          to: 'chrono_rift_gate',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'north',
          to: 'chrono_rift_loop2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'north',
          to: 'void_expanse_room1',
          requires: 'void_tether',
          oneWay: false,
          order: 1,
          doorIndex: 2,
          shortcut: true
        },
        {
          direction: 'east',
          to: 'sovereign_room4',
          requires: 'post_game',
          oneWay: false,
          order: 1,
          doorIndex: 3,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 1109, index: 0 },
        { x: 3581, y: 1109, index: 1 },
        { x: 6962, y: 1109, index: 2 }
      ],
      abilityReward: null,
      cosmeticUpgrades: [
        { id: 'cu_crl1_1', x: 2005, y: 1089, name: 'Cosmetic Upgrade' }
      ]
    },

    chrono_rift_loop2: {
      id: 'chrono_rift_loop2',
      name: 'Chrono Space Rift, Loop, Part 2',
      region: 'chrono_rift',
      mapAccent: '#a78bfa',
      col: -2,
      row: 1,
      width: 1133,
      roomHeight: 5947,
      groundY: 5887,
      bgColor: '#0a0a10',
      bgTint: 'rgba(167,139,250,0.07)',
      ambientColor: '#a78bfa',
      platforms: [
        { x: 0, y: 5887, w: 1133, h: 60 }
      ],
      transitions: [
        { x: 480, y: 5815, w: 60, h: 72, to: 'chrono_rift_loop1', toX: 150, toY: 1089 },
        { x: 1073, y: 5815, w: 60, h: 72, to: 'chrono_rift_echo', toX: 60, toY: 460 },
        {
          x: 959,
          y: 5815,
          w: 60,
          h: 72,
          to: 'event_horizon_pull',
          toX: 234,
          toY: 2472,
          requires: 'void_tether'
        }
      ],
      connections: [
        {
          direction: 'south',
          to: 'chrono_rift_loop1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'chrono_rift_echo',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        },
        {
          direction: 'east',
          to: 'event_horizon_pull',
          requires: 'void_tether',
          oneWay: false,
          order: 1,
          doorIndex: 2,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 113, y: 5867, index: 0 }
      ],
      abilityReward: null,
      loreFragments: [
        { id: 'lore_crl2_1', x: 317, y: 5847, text: 'Time loops, but we do not.' }
      ]
    },

    chrono_rift_echo: {
      id: 'chrono_rift_echo',
      name: 'Chrono Space Rift, Echo',
      region: 'chrono_rift',
      mapAccent: '#a78bfa',
      col: -1,
      row: 1,
      width: 4591,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a10',
      bgTint: 'rgba(167,139,250,0.08)',
      ambientColor: '#a78bfa',
      platforms: [
        { x: 0, y: 500, w: 4591, h: 60 }
      ],
      transitions: [
        { x: 0, y: 428, w: 60, h: 72, to: 'chrono_rift_loop2', toX: 1073, toY: 5847 },
        { x: 4531, y: 428, w: 60, h: 72, to: 'chrono_rift_sanctum', toX: 60, toY: 887 },
        { x: 2221, y: 428, w: 60, h: 72, to: 'void_expanse_room1', toX: 5489, toY: 2943 },
        { x: 4417, y: 428, w: 60, h: 72, to: 'the_fracture_part3', toX: 60, toY: 460 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'chrono_rift_loop2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'east',
          to: 'chrono_rift_sanctum',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        },
        {
          direction: 'south',
          to: 'void_expanse_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 2,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'the_fracture_part3',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 3,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 480, index: 0 },
        { x: 2296, y: 480, index: 1 }
      ],
      abilityReward: null
    },

    chrono_rift_sanctum: {
      id: 'chrono_rift_sanctum',
      name: 'Chrono Space Rift, Sanctum',
      region: 'chrono_rift',
      roomType: 'miniboss',
      mapAccent: '#a78bfa',
      col: 0,
      row: 1,
      width: 1000,
      roomHeight: 987,
      groundY: 927,
      bgColor: '#0a0a10',
      bgTint: 'rgba(167,139,250,0.09)',
      ambientColor: '#a78bfa',
      platforms: [
        { x: 0, y: 927, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 0, y: 855, w: 60, h: 72, to: 'chrono_rift_echo', toX: 4531, toY: 460 },
        { x: 482, y: 855, w: 60, h: 72, to: 'echoing_abyss_room1', toX: 609, toY: 460 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'chrono_rift_echo',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'south',
          to: 'echoing_abyss_room1',
          requires: null,
          oneWay: true,
          order: 0,
          doorIndex: 1,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 907, index: 0 }
      ],
      abilityReward: {
        id: 'stillpoint',
        name: 'Stillpoint',
        desc: 'Q – slow the world to 15% speed.',
        x: 500,
        y: 867
      },
      fracturePipRewards: [
        { id: 'fp_crs_1', x: 280, y: 887 }
      ],
      miniboss: 'chrono_ally',
      bossSpawn: { x: 500, y: 334 }
    },

    event_horizon_gate: {
      id: 'event_horizon_gate',
      name: 'Event Horizon - Gate',
      region: 'event_horizon',
      mapAccent: '#818cf8',
      col: -2,
      row: 1,
      width: 1000,
      roomHeight: 691,
      groundY: 631,
      bgColor: '#07070f',
      bgTint: 'rgba(129,140,248,0.06)',
      ambientColor: '#818cf8',
      platforms: [
        { x: 0, y: 631, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 0, y: 559, w: 60, h: 72, to: 'mirror_corridor', toX: 940, toY: 1919 },
        { x: 940, y: 559, w: 60, h: 72, to: 'event_horizon_pull', toX: 60, toY: 2472 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'mirror_corridor',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'east',
          to: 'event_horizon_pull',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 611, index: 0 }
      ],
      abilityReward: null
    },

    event_horizon_pull: {
      id: 'event_horizon_pull',
      name: 'Event Horizon - Pull',
      region: 'event_horizon',
      mapAccent: '#818cf8',
      col: -1,
      row: 1,
      width: 1383,
      roomHeight: 2572,
      groundY: 2512,
      bgColor: '#07070f',
      bgTint: 'rgba(129,140,248,0.07)',
      ambientColor: '#818cf8',
      platforms: [
        { x: 0, y: 2512, w: 1383, h: 60 }
      ],
      transitions: [
        { x: 0, y: 2440, w: 60, h: 72, to: 'event_horizon_gate', toX: 940, toY: 591 },
        { x: 1323, y: 2440, w: 60, h: 72, to: 'event_horizon_drift', toX: 60, toY: 591 },
        { x: 114, y: 2440, w: 60, h: 72, to: 'echo_bridge_prison', toX: 1655, toY: 582 },
        { x: 204, y: 2440, w: 60, h: 72, to: 'chrono_rift_loop2', toX: 989, toY: 5847 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'event_horizon_gate',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'east',
          to: 'event_horizon_drift',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        },
        {
          direction: 'west',
          to: 'echo_bridge_prison',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 2,
          shortcut: true
        },
        {
          direction: 'west',
          to: 'chrono_rift_loop2',
          requires: null,
          oneWay: false,
          order: 2,
          doorIndex: 3,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 138, y: 2492, index: 0 }
      ],
      abilityReward: null
    },

    event_horizon_drift: {
      id: 'event_horizon_drift',
      name: 'Event Horizon - Drift',
      region: 'event_horizon',
      mapAccent: '#818cf8',
      col: 0,
      row: 1,
      width: 1000,
      roomHeight: 691,
      groundY: 631,
      bgColor: '#07070f',
      bgTint: 'rgba(129,140,248,0.08)',
      ambientColor: '#818cf8',
      platforms: [
        { x: 0, y: 631, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 0, y: 559, w: 60, h: 72, to: 'event_horizon_pull', toX: 1323, toY: 2472 },
        { x: 482, y: 559, w: 60, h: 72, to: 'event_horizon_core', toX: 150, toY: 1214 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'event_horizon_pull',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'south',
          to: 'event_horizon_core',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 611, index: 0 }
      ],
      abilityReward: null,
      loreFragments: [
        {
          id: 'lore_ehd_1',
          x: 280,
          y: 591,
          text: 'Drifting between moments, you find the truth.'
        }
      ]
    },

    event_horizon_core: {
      id: 'event_horizon_core',
      name: 'Event Horizon - Core',
      region: 'event_horizon',
      roomType: 'miniboss',
      mapAccent: '#818cf8',
      col: 0,
      row: 2,
      width: 1383,
      roomHeight: 1314,
      groundY: 1254,
      bgColor: '#07070f',
      bgTint: 'rgba(129,140,248,0.09)',
      ambientColor: '#818cf8',
      // Hand-authored 2026-07-26 for Gravity Collapse Core (was a flat
      // SVG-scaffold floor-only box, same as every other miniboss room
      // before its own fight got built) — sanctioned hand-editing, not
      // something `rebuild_levels_from_svg.js` should ever regenerate.
      // Real platforms on all 4 sides so there's something to land on
      // whichever direction `roomGravityDir` currently points (see
      // `physics.js`'s `resolveRotatedGravityCollision`) — none carry
      // `wall: true`, since that would make them permanently non-standable
      // in every direction, defeating the point. Left/right walls (x:0-60,
      // x:1323-1383) and the ceiling (y:0-60) clear both existing
      // transition doors (x:120 and x:1203, both y:1182-1254) with a clean
      // 60px+ margin either side. No `pitDeathY` — a sealed 4-wall arena
      // needs no down-axis-specific fall-death override. Verified
      // reachable under ordinary down-gravity via a headless
      // `validateRoomLayout(AREAS.event_horizon_core)` run (zero
      // failures) before commit.
      platforms: [
        { x: 0, y: 1254, w: 1383, h: 60 },   // floor — always standable
        { x: 0, y: 0, w: 1383, h: 60, rotatedGravityOnly: true },    // ceiling
        { x: 0, y: 0, w: 60, h: 1314, rotatedGravityOnly: true },    // left wall
        { x: 1323, y: 0, w: 60, h: 1314, rotatedGravityOnly: true }  // right wall
      ],
      transitions: [
        { x: 120, y: 1182, w: 60, h: 72, to: 'event_horizon_drift', toX: 512, toY: 591 },
        {
          x: 1203,
          y: 1182,
          w: 60,
          h: 72,
          to: 'inverted_spire',
          toX: 749,
          toY: 1214,
          requires: 'graviton_surge'
        }
      ],
      connections: [
        {
          direction: 'north',
          to: 'event_horizon_drift',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'south',
          to: 'inverted_spire',
          requires: 'graviton_surge',
          oneWay: false,
          order: 0,
          doorIndex: 1,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 138, y: 1234, index: 0 }
      ],
      abilityReward: null,
      miniboss: 'horizon_core',
      bossSpawn: { x: 450, y: 334 }
    },

    void_expanse_room1: {
      id: 'void_expanse_room1',
      name: 'The Void Expanse, Room 1',
      region: 'void_expanse',
      mapAccent: '#E100BB',
      col: -1,
      row: 2,
      width: 5753,
      roomHeight: 3043,
      groundY: 2983,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(225,0,187,0.05)',
      ambientColor: '#E100BB',
      platforms: [
        { x: 0, y: 2983, w: 5753, h: 60 }
      ],
      transitions: [
        { x: 5693, y: 2911, w: 60, h: 72, to: 'echo_bridge_part1', toX: 60, toY: 460 },
        {
          x: 5579,
          y: 2911,
          w: 60,
          h: 72,
          to: 'void_expanse_room2',
          toX: 60,
          toY: 460,
          requires: 'shard_shot'
        },
        { x: 120, y: 2911, w: 60, h: 72, to: 'chrono_rift_loop1', toX: 6898, toY: 1089 },
        { x: 2790, y: 2911, w: 60, h: 72, to: 'sovereign_observatory', toX: 1012, toY: 1034 },
        { x: 5459, y: 2911, w: 60, h: 72, to: 'chrono_rift_echo', toX: 2251, toY: 460 }
      ],
      connections: [
        {
          direction: 'east',
          to: 'echo_bridge_part1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          shortcut: true
        },
        {
          direction: 'east',
          to: 'void_expanse_room2',
          requires: 'shard_shot',
          oneWay: false,
          order: 1,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'south',
          to: 'chrono_rift_loop1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 2,
          shortcut: true
        },
        {
          direction: 'south',
          to: 'sovereign_observatory',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 3,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'north',
          to: 'chrono_rift_echo',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 4,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 2963, index: 0 },
        { x: 2877, y: 2963, index: 1 },
        { x: 5553, y: 2963, index: 2 }
      ],
      abilityReward: null,
      cosmeticUpgrades: [
        { id: 'cu_ver1_1', x: 1611, y: 2943, name: 'Cosmetic Upgrade' }
      ],
      loreFragments: [
        {
          id: 'lore_ve1_1',
          x: 1791,
          y: 2943,
          text: 'The void is not empty; it is full of absence.'
        }
      ]
    },

    void_expanse_room2: {
      id: 'void_expanse_room2',
      name: 'The Void Expanse, Room 2',
      region: 'void_expanse',
      mapAccent: '#E100BB',
      col: 0,
      row: 2,
      width: 1000,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(225,0,187,0.06)',
      ambientColor: '#E100BB',
      platforms: [
        { x: 0, y: 500, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 0, y: 428, w: 60, h: 72, to: 'void_expanse_room1', toX: 5609, toY: 2943 },
        {
          x: 144,
          y: 428,
          w: 60,
          h: 72,
          to: 'one_way_teleport_gate_to_paradox_engine',
          toX: 150,
          toY: 460
        },
        { x: 820, y: 428, w: 60, h: 72, to: 'warp_gate_nexus_room1', toX: 150, toY: 460 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'void_expanse_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'north',
          to: 'one_way_teleport_gate_to_paradox_engine',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'south',
          to: 'warp_gate_nexus_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 2,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 480, index: 0 }
      ],
      abilityReward: null
    },

    one_way_teleport_gate_to_paradox_engine: {
      id: 'one_way_teleport_gate_to_paradox_engine',
      name: 'One Way Teleport Gate to Paradox Engine',
      region: 'teleport',
      col: 0,
      row: 1,
      width: 600,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(255,255,255,0.01)',
      ambientColor: '#aaaaaa',
      platforms: [
        { x: 0, y: 500, w: 600, h: 60 }
      ],
      transitions: [
        { x: 120, y: 428, w: 60, h: 72, to: 'void_expanse_room2', toX: 174, toY: 460 },
        { x: 420, y: 428, w: 60, h: 72, to: 'paradox_engine_room1', toX: 150, toY: 1186 }
      ],
      connections: [
        {
          direction: 'south',
          to: 'void_expanse_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'south',
          to: 'paradox_engine_room1',
          requires: null,
          oneWay: true,
          order: 1,
          doorIndex: 1,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 60, y: 480, index: 0 }
      ],
      abilityReward: null,
      cosmeticUpgrades: [
        { id: 'cu_owtgtpe_1', x: 180, y: 460, name: 'Cosmetic Upgrade' }
      ]
    },

    warp_gate_nexus_room1: {
      id: 'warp_gate_nexus_room1',
      name: 'Warp Gate Nexus Room 1',
      region: 'warp',
      mapAccent: '#AC6363',
      col: 0,
      row: 3,
      width: 1000,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(172,99,99,0.05)',
      ambientColor: '#AC6363',
      platforms: [
        { x: 0, y: 500, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 120, y: 428, w: 60, h: 72, to: 'void_expanse_room2', toX: 850, toY: 460 },
        { x: 820, y: 428, w: 60, h: 72, to: 'warp_gate_nexus_room2', toX: 150, toY: 460 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'void_expanse_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'south',
          to: 'warp_gate_nexus_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 480, index: 0 }
      ],
      abilityReward: null
    },

    warp_gate_nexus_room2: {
      id: 'warp_gate_nexus_room2',
      name: 'Warp Gate Nexus Room 2',
      region: 'warp',
      roomType: 'miniboss',
      mapAccent: '#AC6363',
      col: 0,
      row: 4,
      width: 1000,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(172,99,99,0.07)',
      ambientColor: '#AC6363',
      platforms: [
        { x: 0, y: 500, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 120, y: 428, w: 60, h: 72, to: 'warp_gate_nexus_room1', toX: 850, toY: 460 },
        {
          x: 820,
          y: 428,
          w: 60,
          h: 72,
          to: 'one_way_warp_gate_to_inverted_spire',
          toX: 288,
          toY: 460
        }
      ],
      connections: [
        {
          direction: 'north',
          to: 'warp_gate_nexus_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'south',
          to: 'one_way_warp_gate_to_inverted_spire',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 480, index: 0 }
      ],
      abilityReward: null,
      loreFragments: [
        { id: 'lore_wgn2_1', x: 280, y: 460, text: 'The gates remember every traveller.' }
      ],
      miniboss: 'warp_guardian',
      bossSpawn: { x: 500, y: 334 }
    },

    one_way_warp_gate_to_inverted_spire: {
      id: 'one_way_warp_gate_to_inverted_spire',
      name: 'One Way Warp Gate to Inverted Spire',
      region: 'teleport',
      col: 0,
      row: 5,
      width: 600,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(255,255,255,0.01)',
      ambientColor: '#aaaaaa',
      platforms: [
        { x: 0, y: 500, w: 600, h: 60 }
      ],
      transitions: [
        { x: 258, y: 428, w: 60, h: 72, to: 'warp_gate_nexus_room2', toX: 850, toY: 460 },
        { x: 540, y: 428, w: 60, h: 72, to: 'inverted_spire', toX: 692, toY: 1214 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'warp_gate_nexus_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'inverted_spire',
          requires: null,
          oneWay: true,
          order: 0,
          doorIndex: 1,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 60, y: 480, index: 0 }
      ],
      abilityReward: null
    },

    inverted_spire: {
      id: 'inverted_spire',
      name: 'Inverted Spire',
      region: 'spire',
      mapAccent: '#0088FF',
      col: 3,
      row: 4,
      width: 1383,
      roomHeight: 1314,
      groundY: 1254,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(0,136,255,0.05)',
      ambientColor: '#0088FF',
      platforms: [
        { x: 0, y: 1254, w: 1383, h: 60 }
      ],
      transitions: [
        { x: 719, y: 1182, w: 60, h: 72, to: 'event_horizon_core', toX: 1233, toY: 1214 },
        { x: 0, y: 1182, w: 60, h: 72, to: 'timeline_x_roads_room2', toX: 3721, toY: 2113 },
        { x: 114, y: 1182, w: 60, h: 72, to: 'graviton_core_room2', toX: 1766, toY: 1034 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'event_horizon_core',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          shortcut: true
        },
        {
          direction: 'west',
          to: 'timeline_x_roads_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        },
        {
          direction: 'west',
          to: 'graviton_core_room2',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 2,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 138, y: 1234, index: 0 }
      ],
      abilityReward: null,
      loreFragments: [
        { id: 'lore_is_1', x: 387, y: 1214, text: 'The spire points inward, not upward.' }
      ]
    },

    graviton_core_room1: {
      id: 'graviton_core_room1',
      name: 'Graviton Core, Room 1',
      region: 'graviton',
      mapAccent: '#4BCA61',
      col: 2,
      row: 5,
      width: 2738,
      roomHeight: 1134,
      groundY: 1074,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(75,202,97,0.05)',
      ambientColor: '#4BCA61',
      platforms: [
        { x: 0, y: 1074, w: 2738, h: 60 }
      ],
      transitions: [
        { x: 1339, y: 1002, w: 60, h: 72, to: 'timeline_x_roads_room2', toX: 2519, toY: 2113 },
        {
          x: 2678,
          y: 1002,
          w: 60,
          h: 72,
          to: 'graviton_core_room2',
          toX: 60,
          toY: 1034,
          requires: 'shard_shot'
        },
        { x: 0, y: 1002, w: 60, h: 72, to: 'the_vault_room1', toX: 8680, toY: 1034 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'timeline_x_roads_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'graviton_core_room2',
          requires: 'shard_shot',
          oneWay: false,
          order: 0,
          doorIndex: 1
        },
        {
          direction: 'west',
          to: 'the_vault_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 2
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 1054, index: 0 },
        { x: 1369, y: 1054, index: 1 }
      ],
      abilityReward: null
    },

    graviton_core_room2: {
      id: 'graviton_core_room2',
      name: 'Graviton Core, Room 2',
      region: 'graviton',
      mapAccent: '#4BCA61',
      col: 3,
      row: 5,
      width: 1826,
      roomHeight: 1134,
      groundY: 1074,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(75,202,97,0.07)',
      ambientColor: '#4BCA61',
      platforms: [
        { x: 0, y: 1074, w: 1826, h: 60 }
      ],
      transitions: [
        { x: 0, y: 1002, w: 60, h: 72, to: 'graviton_core_room1', toX: 2678, toY: 1034 },
        {
          x: 883,
          y: 1002,
          w: 60,
          h: 72,
          to: 'graviton_core_room3',
          toX: 778,
          toY: 1573,
          requires: 'shard_shot'
        },
        { x: 1766, y: 1002, w: 60, h: 72, to: 'inverted_spire', toX: 144, toY: 1214 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'graviton_core_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'south',
          to: 'graviton_core_room3',
          requires: 'shard_shot',
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'inverted_spire',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 2,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 1054, index: 0 }
      ],
      abilityReward: {
        id: 'graviton_surge',
        x: 913,
        y: 1014,
        name: 'Graviton Surge',
        desc: 'Unlocks heavy gravity abilities.'
      },
      fracturePipRewards: [
        { id: 'fp_gcr2_1', x: 511, y: 1034 }
      ]
    },

    graviton_core_room3: {
      id: 'graviton_core_room3',
      name: 'Graviton Core, Room 3',
      region: 'graviton',
      roomType: 'miniboss',
      mapAccent: '#4BCA61',
      col: 3,
      row: 6,
      width: 1466,
      roomHeight: 1673,
      groundY: 1613,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(75,202,97,0.08)',
      ambientColor: '#4BCA61',
      platforms: [
        { x: 0, y: 1613, w: 1466, h: 60 }
      ],
      transitions: [
        { x: 748, y: 1541, w: 60, h: 72, to: 'graviton_core_room2', toX: 913, toY: 1034 },
        { x: 0, y: 1541, w: 60, h: 72, to: 'the_vault_room1', toX: 8596, toY: 1034 },
        {
          x: 114,
          y: 1541,
          w: 60,
          h: 72,
          to: 'the_vault_room2',
          toX: 1779,
          toY: 460,
          requires: 'void_tether'
        },
        {
          x: 1406,
          y: 1541,
          w: 60,
          h: 72,
          to: 'sovereign_army_reserve',
          toX: 60,
          toY: 633,
          requires: 'four_fracture_pips,ten_lore_pips'
        }
      ],
      connections: [
        {
          direction: 'north',
          to: 'graviton_core_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'west',
          to: 'the_vault_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          shortcut: true
        },
        {
          direction: 'west',
          to: 'the_vault_room2',
          requires: 'void_tether',
          oneWay: false,
          order: 1,
          doorIndex: 2,
          shortcut: true
        },
        {
          direction: 'east',
          to: 'sovereign_army_reserve',
          requires: 'four_fracture_pips,ten_lore_pips',
          oneWay: false,
          order: 0,
          doorIndex: 3
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 1593, index: 0 }
      ],
      abilityReward: null,
      loreFragments: [
        { id: 'lore_gc3_1', x: 410, y: 1573, text: 'Gravity bends to the will of the core.' }
      ],
      miniboss: 'graviton_sentinel',
      bossSpawn: { x: 500, y: 334 }
    },

    the_vault_room1: {
      id: 'the_vault_room1',
      name: 'The Vault, Room 1',
      region: 'origin',
      mapAccent: '#897A5F',
      col: 1,
      row: 5,
      width: 8740,
      roomHeight: 1134,
      groundY: 1074,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(137,122,95,0.05)',
      ambientColor: '#897A5F',
      platforms: [
        { x: 0, y: 1074, w: 8740, h: 60 }
      ],
      transitions: [
        { x: 234, y: 1002, w: 60, h: 72, to: 'the_forge', toX: 1897, toY: 1034 },
        { x: 0, y: 1002, w: 60, h: 72, to: 'polar_shift_room1', toX: 1876, toY: 1809 },
        { x: 8680, y: 1002, w: 60, h: 72, to: 'graviton_core_room1', toX: 60, toY: 1034 },
        {
          x: 114,
          y: 1002,
          w: 60,
          h: 72,
          to: 'the_rift',
          toX: 4081,
          toY: 840,
          requires: 'timeline_x_roads_2_visited'
        },
        { x: 8446, y: 1002, w: 60, h: 72, to: 'the_vault_room2', toX: 920, toY: 460 },
        { x: 8566, y: 1002, w: 60, h: 72, to: 'graviton_core_room3', toX: 60, toY: 1573 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'the_forge',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          shortcut: true
        },
        {
          direction: 'west',
          to: 'polar_shift_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          shortcut: true
        },
        {
          direction: 'east',
          to: 'graviton_core_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 2
        },
        {
          direction: 'west',
          to: 'the_rift',
          requires: 'timeline_x_roads_2_visited',
          oneWay: false,
          order: 1,
          doorIndex: 3,
          shortcut: true
        },
        {
          direction: 'south',
          to: 'the_vault_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 4,
          shortcut: true
        },
        {
          direction: 'east',
          to: 'graviton_core_room3',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 5,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 1054, index: 0 },
        { x: 4370, y: 1054, index: 1 },
        { x: 8540, y: 1054, index: 2 }
      ],
      abilityReward: null
    },

    the_vault_room2: {
      id: 'the_vault_room2',
      name: 'The Vault, Room 2',
      region: 'origin',
      mapAccent: '#897A5F',
      col: 2,
      row: 4,
      width: 1839,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(137,122,95,0.06)',
      ambientColor: '#897A5F',
      platforms: [
        { x: 0, y: 500, w: 1839, h: 60 }
      ],
      transitions: [
        { x: 890, y: 428, w: 60, h: 72, to: 'the_vault_room1', toX: 8476, toY: 1034 },
        { x: 0, y: 428, w: 60, h: 72, to: 'the_rift', toX: 4255, toY: 840 },
        { x: 1779, y: 428, w: 60, h: 72, to: 'graviton_core_room3', toX: 144, toY: 1573 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'the_vault_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          shortcut: true
        },
        {
          direction: 'west',
          to: 'the_rift',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        },
        {
          direction: 'east',
          to: 'graviton_core_room3',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 2,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 480, index: 0 }
      ],
      abilityReward: null,
      loreFragments: [
        {
          id: 'lore_tv2_1',
          x: 515,
          y: 460,
          text: 'The vault holds memories of a world that never was.'
        }
      ]
    },

    the_rift: {
      id: 'the_rift',
      name: 'The Rift',
      region: 'origin',
      col: 1,
      row: 4,
      width: 4315,
      roomHeight: 940,
      groundY: 880,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(80,40,160,0.07)',
      ambientColor: '#7c3aed',
      platforms: [
        { x: 0, y: 880, w: 4315, h: 60 }
      ],
      transitions: [
        { x: 4255, y: 808, w: 60, h: 72, to: 'the_vault_room2', toX: 60, toY: 460 },
        { x: 0, y: 808, w: 60, h: 72, to: 'polar_shift_room1', toX: 1792, toY: 1809 },
        { x: 2083, y: 808, w: 60, h: 72, to: 'antechamber', toX: 150, toY: 1532 },
        { x: 4141, y: 808, w: 60, h: 72, to: 'timeline_x_roads_room2', toX: 234, toY: 2113 },
        { x: 4051, y: 808, w: 60, h: 72, to: 'the_vault_room1', toX: 144, toY: 1034 },
        { x: 114, y: 808, w: 60, h: 72, to: 'static_field_room2', toX: 1240, toY: 1186 }
      ],
      connections: [
        {
          direction: 'east',
          to: 'the_vault_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'west',
          to: 'polar_shift_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        },
        {
          direction: 'south',
          to: 'antechamber',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 2,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'timeline_x_roads_room2',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 3,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'the_vault_room1',
          requires: null,
          oneWay: false,
          order: 2,
          doorIndex: 4,
          shortcut: true
        },
        {
          direction: 'west',
          to: 'static_field_room2',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 5,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 860, index: 0 },
        { x: 2158, y: 860, index: 1 }
      ],
      abilityReward: null,
      loreFragments: [
        {
          id: 'lore_tr_1',
          x: 1208,
          y: 840,
          text: 'The rift is the seam between what is and what could be.'
        }
      ]
    },

    polar_shift_room1: {
      id: 'polar_shift_room1',
      name: 'Polar Shift, Room 1',
      region: 'polar',
      mapAccent: '#F7E600',
      col: 0,
      row: 4,
      width: 1936,
      roomHeight: 1909,
      groundY: 1849,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(247,230,0,0.05)',
      ambientColor: '#F7E600',
      platforms: [
        { x: 0, y: 1849, w: 1936, h: 60 }
      ],
      transitions: [
        { x: 1876, y: 1777, w: 60, h: 72, to: 'the_vault_room1', toX: 60, toY: 1034 },
        { x: 0, y: 1777, w: 60, h: 72, to: 'polar_shift_room2', toX: 1351, toY: 813 },
        { x: 1762, y: 1777, w: 60, h: 72, to: 'the_rift', toX: 60, toY: 840 }
      ],
      connections: [
        {
          direction: 'east',
          to: 'the_vault_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          shortcut: true
        },
        {
          direction: 'west',
          to: 'polar_shift_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        },
        {
          direction: 'east',
          to: 'the_rift',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 2,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 1829, index: 0 }
      ],
      abilityReward: {
        id: 'max_health_upgrade_3',
        x: 968,
        y: 1789,
        name: 'Max Health +1',
        desc: 'Increases max health by 1.'
      }
    },

    polar_shift_room2: {
      id: 'polar_shift_room2',
      name: 'Polar Shift, Room 2',
      region: 'polar',
      roomType: 'miniboss',
      mapAccent: '#F7E600',
      col: -1,
      row: 4,
      width: 1411,
      roomHeight: 913,
      groundY: 853,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(247,230,0,0.07)',
      ambientColor: '#F7E600',
      // Hand-authored 2026-07-26 for the Electromagnetic Golem fight (was a
      // flat SVG-scaffold floor-only box) — per project convention this is
      // sanctioned hand-editing, not something `rebuild_levels_from_svg.js`
      // should ever regenerate. `magnetizable: true` surfaces are what the
      // Golem's own attack charges at runtime (sets/clears `polarity`
      // directly on these objects); the two `polarity`-authored platforms
      // are permanent counterplay platforms the player touches to flip
      // their own charge (see the `polarity` force loop in
      // `player.js`'s physics block). All four sit at y:770 — a single
      // ~83px rise from the floor (jump height caps at ~114px per
      // `validateRoomLayout`'s own linter physics), each independently
      // reachable straight from the floor with no dash needed, verified via
      // `node -e` headlessly (`validateRoomLayout(AREAS.polar_shift_room2)`
      // returns zero failures — an earlier 620/480/380 draft didn't and was
      // corrected before commit). Positions clear both transition doors
      // (x:664 and x:1351, both y:781) and the anchor (x:140,y:833).
      platforms: [
        { x: 0, y: 853, w: 1411, h: 60 },
        { x: 150, y: 770, w: 200, h: 24, magnetizable: true },
        { x: 950, y: 770, w: 200, h: 24, magnetizable: true },
        { x: 420, y: 770, w: 90, h: 20, polarity: 'positive' },
        { x: 800, y: 770, w: 90, h: 20, polarity: 'negative' }
      ],
      transitions: [
        { x: 1351, y: 781, w: 60, h: 72, to: 'polar_shift_room1', toX: 60, toY: 1809 },
        { x: 664, y: 781, w: 60, h: 72, to: 'paradox_engine_room1', toX: 1126, toY: 1186 }
      ],
      connections: [
        {
          direction: 'east',
          to: 'polar_shift_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'south',
          to: 'paradox_engine_room1',
          requires: null,
          oneWay: true,
          order: 0,
          doorIndex: 1,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 833, index: 0 }
      ],
      abilityReward: null,
      loreFragments: [
        { id: 'lore_ps2_1', x: 395, y: 813, text: 'The poles shift, but the axis stays true.' }
      ],
      miniboss: 'polar_guardian',
      bossSpawn: { x: 500, y: 334 }
    },

    paradox_engine_room1: {
      id: 'paradox_engine_room1',
      name: 'Paradox Engine, Room 1',
      region: 'paradox',
      mapAccent: '#4BCA61',
      col: -2,
      row: 3,
      width: 1300,
      roomHeight: 1286,
      groundY: 1226,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(75,202,97,0.06)',
      ambientColor: '#4BCA61',
      platforms: [
        { x: 0, y: 1226, w: 1300, h: 60 }
      ],
      transitions: [
        {
          x: 120,
          y: 1154,
          w: 60,
          h: 72,
          to: 'one_way_teleport_gate_to_paradox_engine',
          toX: 450,
          toY: 460
        },
        {
          x: 1240,
          y: 1154,
          w: 60,
          h: 72,
          to: 'paradox_engine_room2',
          toX: 60,
          toY: 1186,
          requires: 'shard_shot'
        },
        { x: 1096, y: 1154, w: 60, h: 72, to: 'polar_shift_room2', toX: 694, toY: 813 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'one_way_teleport_gate_to_paradox_engine',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          shortcut: true
        },
        {
          direction: 'east',
          to: 'paradox_engine_room2',
          requires: 'shard_shot',
          oneWay: false,
          order: 0,
          doorIndex: 1
        },
        {
          direction: 'north',
          to: 'polar_shift_room2',
          requires: null,
          oneWay: false,
          order: 1,
          doorIndex: 2,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 130, y: 1206, index: 0 }
      ],
      abilityReward: null
    },

    paradox_engine_room2: {
      id: 'paradox_engine_room2',
      name: 'Paradox Engine, Room 2',
      region: 'paradox',
      roomType: 'miniboss',
      mapAccent: '#4BCA61',
      col: -1,
      row: 3,
      width: 1300,
      roomHeight: 1286,
      groundY: 1226,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(75,202,97,0.08)',
      ambientColor: '#4BCA61',
      platforms: [
        { x: 0, y: 1226, w: 1300, h: 60 }
      ],
      transitions: [
        { x: 0, y: 1154, w: 60, h: 72, to: 'paradox_engine_room1', toX: 1240, toY: 1186 },
        {
          x: 144,
          y: 1154,
          w: 60,
          h: 72,
          to: 'teleport_from_paradox_engine_to_upper_ruins_1',
          toX: 288,
          toY: 502
        },
        { x: 1120, y: 1154, w: 60, h: 72, to: 'static_field_room1', toX: 150, toY: 1186 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'paradox_engine_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'north',
          to: 'teleport_from_paradox_engine_to_upper_ruins_1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'south',
          to: 'static_field_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 2,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 130, y: 1206, index: 0 }
      ],
      abilityReward: null,
      loreFragments: [
        { id: 'lore_pe2_1', x: 364, y: 1186, text: 'The engine runs on contradictions.' }
      ],
      miniboss: 'paradox_engine',
      bossSpawn: { x: 500, y: 334 }
    },

    teleport_from_paradox_engine_to_upper_ruins_1: {
      id: 'teleport_from_paradox_engine_to_upper_ruins_1',
      name: 'Teleport from Paradox Engine to Upper Ruins',
      region: 'teleport',
      col: -1,
      row: 2,
      width: 600,
      roomHeight: 602,
      groundY: 542,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(255,255,255,0.01)',
      ambientColor: '#aaaaaa',
      platforms: [
        { x: 0, y: 542, w: 600, h: 60 }
      ],
      transitions: [
        { x: 258, y: 470, w: 60, h: 72, to: 'paradox_engine_room2', toX: 174, toY: 1186 },
        {
          x: 540,
          y: 470,
          w: 60,
          h: 72,
          to: 'pacifist_region',
          toX: 500,
          toY: 460,
          requires: 'shard_shot'
        }
      ],
      connections: [
        {
          direction: 'south',
          to: 'paradox_engine_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'pacifist_region',
          requires: 'shard_shot',
          oneWay: true,
          order: 0,
          doorIndex: 1,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 60, y: 522, index: 0 }
      ],
      abilityReward: null
    },

    static_field_room1: {
      id: 'static_field_room1',
      name: 'Static Field, Room 1',
      region: 'static',
      mapAccent: '#6558F5',
      col: -1,
      row: 4,
      width: 1300,
      roomHeight: 1286,
      groundY: 1226,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(101,88,245,0.05)',
      ambientColor: '#6558F5',
      platforms: [
        { x: 0, y: 1226, w: 1300, h: 60 }
      ],
      transitions: [
        { x: 120, y: 1154, w: 60, h: 72, to: 'paradox_engine_room2', toX: 1150, toY: 1186 },
        {
          x: 1240,
          y: 1154,
          w: 60,
          h: 72,
          to: 'static_field_room2',
          toX: 60,
          toY: 1186,
          requires: 'phase_dash'
        },
        { x: 1006, y: 1154, w: 60, h: 72, to: 'void_expanse_room2', toX: 500, toY: 460 },
        { x: 1126, y: 1154, w: 60, h: 72, to: 'graviton_core_room1', toX: 1369, toY: 1034 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'paradox_engine_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'static_field_room2',
          requires: 'phase_dash',
          oneWay: false,
          order: 0,
          doorIndex: 1
        },
        {
          direction: 'north',
          to: 'void_expanse_room2',
          requires: null,
          oneWay: true,
          order: 1,
          doorIndex: 2,
          shortcut: true
        },
        {
          direction: 'east',
          to: 'graviton_core_room1',
          requires: null,
          oneWay: true,
          order: 1,
          doorIndex: 3,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 130, y: 1206, index: 0 }
      ],
      abilityReward: null
    },

    static_field_room2: {
      id: 'static_field_room2',
      name: 'Static Field, Room 2',
      region: 'static',
      roomType: 'miniboss',
      mapAccent: '#6558F5',
      col: 0,
      row: 4,
      width: 1300,
      roomHeight: 1286,
      groundY: 1226,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(101,88,245,0.07)',
      ambientColor: '#6558F5',
      platforms: [
        { x: 0, y: 1226, w: 1300, h: 60 }
      ],
      transitions: [
        { x: 0, y: 1154, w: 60, h: 72, to: 'static_field_room1', toX: 1240, toY: 1186 },
        { x: 1240, y: 1154, w: 60, h: 72, to: 'the_rift', toX: 144, toY: 840 },
        { x: 1126, y: 1154, w: 60, h: 72, to: 'graviton_core_room1', toX: 1369, toY: 1034 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'static_field_room1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'east',
          to: 'the_rift',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        },
        {
          direction: 'east',
          to: 'graviton_core_room1',
          requires: null,
          oneWay: true,
          order: 1,
          doorIndex: 2,
          shortcut: true
        }
      ],
      enemies: [],
      anchors: [
        { x: 130, y: 1206, index: 0 }
      ],
      abilityReward: null,
      fracturePipRewards: [
        { id: 'fp_sfr2_1', x: 364, y: 1186 }
      ],
      miniboss: 'static_guardian',
      bossSpawn: { x: 500, y: 334 }
    },

    antechamber: {
      id: 'antechamber',
      name: 'The Antechamber',
      region: 'origin',
      col: 1,
      row: 5,
      width: 2462,
      roomHeight: 1632,
      groundY: 1572,
      bgColor: '#08080e',
      bgTint: 'rgba(200,40,40,0.04)',
      ambientColor: '#f87171',
      platforms: [
        { x: 0, y: 1572, w: 2462, h: 60 }
      ],
      transitions: [
        { x: 120, y: 1500, w: 60, h: 72, to: 'the_rift', toX: 2113, toY: 840 },
        { x: 2402, y: 1500, w: 60, h: 72, to: 'hollow_core', toX: 60, toY: 481 },
        {
          x: 2258,
          y: 1500,
          w: 60,
          h: 72,
          to: 'spawn_area_2',
          toX: 488,
          toY: 460,
          requires: 'phase_dash'
        }
      ],
      connections: [
        {
          direction: 'north',
          to: 'the_rift',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'hollow_core',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        },
        {
          direction: 'south',
          to: 'spawn_area_2',
          requires: 'phase_dash',
          oneWay: false,
          order: 0,
          doorIndex: 2,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 1552, index: 0 }
      ],
      abilityReward: null
    },

    hollow_core: {
      id: 'hollow_core',
      name: 'Hollow Core',
      region: 'origin',
      mapAccent: '#C08CEA',
      col: 2,
      row: 5,
      width: 1162,
      roomHeight: 581,
      groundY: 521,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(192,140,234,0.05)',
      ambientColor: '#C08CEA',
      platforms: [
        { x: 0, y: 521, w: 1162, h: 60 }
      ],
      transitions: [
        { x: 0, y: 449, w: 60, h: 72, to: 'antechamber', toX: 2402, toY: 1532 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'antechamber',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        }
      ],
      enemies: [],
      anchors: [
        { x: 116, y: 501, index: 0 }
      ],
      abilityReward: null,
      loreFragments: [
        {
          id: 'lore_hc_1',
          x: 325,
          y: 481,
          text: 'The core is hollow because it has already given everything.'
        }
      ]
    },

    spawn_area_2: {
      id: 'spawn_area_2',
      name: 'Spawn Area?',
      region: 'origin',
      col: 1,
      row: 6,
      width: 1000,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(196,181,253,0.02)',
      ambientColor: '#6a6a8e',
      platforms: [
        { x: 0, y: 500, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 458, y: 428, w: 60, h: 72, to: 'antechamber', toX: 2288, toY: 1532 },
        { x: 940, y: 428, w: 60, h: 72, to: 'tutorial_final', toX: 60, toY: 730 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'antechamber',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        },
        {
          direction: 'east',
          to: 'tutorial_final',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 480, index: 0 }
      ],
      abilityReward: null,
      cosmeticUpgrades: [
        { id: 'cu_sa22_1', x: 280, y: 460, name: 'Cosmetic Upgrade' }
      ]
    },

    tutorial_final: {
      id: 'tutorial_final',
      name: 'Tutorial Area? Final Boss Fight',
      region: 'origin',
      roomType: 'boss',
      col: 2,
      row: 6,
      width: 1577,
      roomHeight: 830,
      groundY: 770,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(200,40,40,0.06)',
      ambientColor: '#f87171',
      platforms: [
        { x: 0, y: 770, w: 1577, h: 60 }
      ],
      transitions: [
        { x: 0, y: 698, w: 60, h: 72, to: 'spawn_area_2', toX: 940, toY: 460 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'spawn_area_2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 750, index: 0 }
      ],
      abilityReward: null,
      bossSpawn: { x: 400, y: 334 }
    },

    sovereign_room1: {
      id: 'sovereign_room1',
      name: 'Sovereign Room 1',
      region: 'sovereign',
      mapAccent: '#D3455B',
      col: 3,
      row: 1,
      width: 1106,
      roomHeight: 560,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(211,69,91,0.05)',
      ambientColor: '#D3455B',
      platforms: [
        { x: 0, y: 500, w: 1106, h: 60 }
      ],
      transitions: [
        { x: 0, y: 428, w: 60, h: 72, to: 'the_fracture_part2', toX: 2402, toY: 460 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'the_fracture_part2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        }
      ],
      enemies: [],
      anchors: [
        { x: 111, y: 480, index: 0 }
      ],
      abilityReward: null
    },

    sovereign_room2: {
      id: 'sovereign_room2',
      name: 'Sovereign Room 2',
      region: 'sovereign',
      mapAccent: '#D3455B',
      col: 2,
      row: 5,
      width: 1000,
      roomHeight: 802,
      groundY: 742,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(211,69,91,0.05)',
      ambientColor: '#D3455B',
      platforms: [
        { x: 0, y: 742, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 470, y: 670, w: 60, h: 72, to: 'timeline_x_roads_room2', toX: 1436, toY: 2113 }
      ],
      connections: [
        {
          direction: 'north',
          to: 'timeline_x_roads_room2',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0,
          edgeExempt: true,
          edgeExemptReason: 'vertical/secondary link rendered as a floor-level doorway (side-scroller)'
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 722, index: 0 }
      ],
      abilityReward: null
    },

    sovereign_room3: {
      id: 'sovereign_room3',
      name: 'Sovereign Room 3',
      region: 'sovereign',
      mapAccent: '#D3455B',
      col: 1,
      row: 2,
      width: 1000,
      roomHeight: 1065,
      groundY: 1005,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(211,69,91,0.05)',
      ambientColor: '#D3455B',
      platforms: [
        { x: 0, y: 1005, w: 1000, h: 60 }
      ],
      transitions: [
        { x: 940, y: 933, w: 60, h: 72, to: 'crag_warden', toX: 144, toY: 460 }
      ],
      connections: [
        {
          direction: 'east',
          to: 'crag_warden',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        }
      ],
      enemies: [],
      anchors: [
        { x: 100, y: 985, index: 0 }
      ],
      abilityReward: null
    },

    sovereign_room4: {
      id: 'sovereign_room4',
      name: 'Sovereign Room 4',
      region: 'sovereign',
      mapAccent: '#D3455B',
      col: -1,
      row: 2,
      width: 7162,
      roomHeight: 1189,
      groundY: 1129,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(211,69,91,0.05)',
      ambientColor: '#D3455B',
      platforms: [
        { x: 0, y: 1129, w: 7162, h: 60 }
      ],
      transitions: [
        { x: 0, y: 1057, w: 60, h: 72, to: 'chrono_rift_loop1', toX: 7018, toY: 1089 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'chrono_rift_loop1',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 1109, index: 0 },
        { x: 3581, y: 1109, index: 1 },
        { x: 6962, y: 1109, index: 2 }
      ],
      abilityReward: null
    },

    sovereign_army_reserve: {
      id: 'sovereign_army_reserve',
      name: 'Sovereign Army Reserve',
      region: 'sovereign',
      mapAccent: '#D3455B',
      col: 4,
      row: 6,
      width: 6998,
      roomHeight: 733,
      groundY: 673,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(211,69,91,0.06)',
      ambientColor: '#D3455B',
      platforms: [
        { x: 0, y: 673, w: 6998, h: 60 }
      ],
      transitions: [
        { x: 0, y: 601, w: 60, h: 72, to: 'graviton_core_room3', toX: 1406, toY: 1573 },
        { x: 6938, y: 601, w: 60, h: 72, to: 'try_out_region', toX: 60, toY: 633 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'graviton_core_room3',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        },
        {
          direction: 'east',
          to: 'try_out_region',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 1
        }
      ],
      enemies: [],
      anchors: [
        { x: 140, y: 653, index: 0 },
        { x: 3499, y: 653, index: 1 },
        { x: 6798, y: 653, index: 2 }
      ],
      abilityReward: null
    },

    try_out_region: {
      id: 'try_out_region',
      name: 'Try out region',
      region: 'sovereign',
      mapAccent: '#D3455B',
      col: 5,
      row: 6,
      width: 1079,
      roomHeight: 733,
      groundY: 673,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(211,69,91,0.07)',
      ambientColor: '#D3455B',
      platforms: [
        { x: 0, y: 673, w: 1079, h: 60 }
      ],
      transitions: [
        { x: 0, y: 601, w: 60, h: 72, to: 'sovereign_army_reserve', toX: 6938, toY: 633 }
      ],
      connections: [
        {
          direction: 'west',
          to: 'sovereign_army_reserve',
          requires: null,
          oneWay: false,
          order: 0,
          doorIndex: 0
        }
      ],
      enemies: [],
      anchors: [
        { x: 108, y: 653, index: 0 }
      ],
      abilityReward: {
        id: 'level_4_limit_break',
        x: 540,
        y: 613,
        name: 'Level 4 Limit Break',
        desc: 'Unlocks ultimate ability.'
      }
    },

    enemy_test_arena: {
      id: 'enemy_test_arena',
      name: 'Test Arena',
      width: 2000,
      groundY: 500,
      bgColor: '#0a0a0f',
      bgTint: 'rgba(120, 120, 140, 0.04)',
      ambientColor: '#8888aa',
      platforms: [
        {
          x: 0,
          y: 500,
          w: 2000,
          h: 60
        },
        {
          x: 400,
          y: 380,
          w: 200,
          h: 14
        },
        {
          x: 1400,
          y: 380,
          w: 200,
          h: 14
        },
        {
          x: 800,
          y: 440,
          w: 120,
          h: 14
        },
        {
          x: 1050,
          y: 380,
          w: 120,
          h: 14
        },
        {
          x: 1710,
          y: 310,
          w: 120,
          h: 200
        },
        {
          x: -10,
          y: 80,
          w: 2000,
          h: 60,
          destructible: false,
          ceiling: true
        }
      ],
      transitions: [],
      connections: [],
      enemies: [],
      anchors: [],
      abilityReward: null,
      healingCrystals: [
        {
          id: 'hc_test_arena_1',
          x: 120,
          y: 500
        }
      ],
      loreFragments: []
    },
    // Bounded box for editor/difficulty_bot.html's evolved-agent training —
    // deliberately small and walled (unlike enemy_test_arena's 2000px open
    // runway) so an evolving agent can't discover "run to the edge and kite
    // forever" as a free fitness win. Left/right are already hard-walled by
    // getBounds()'s area.width clamp (game.js) with no platforms needed;
    // floor + a real ceiling platform close the box vertically. Dev-only —
    // no col/row, same skip rule as enemy_test_arena.
    bot_arena: {
      id: 'bot_arena',
      name: 'Difficulty Bot Arena (dev only)',
      width: 700,
      groundY: 500,
      roomHeight: 460,
      pitDeathY: Infinity,
      bgColor: '#06060e',
      bgTint: 'rgba(140, 120, 200, 0.05)',
      ambientColor: '#8888aa',
      platforms: [
        { x: 0, y: 500, w: 700, h: 60 },
        { x: -10, y: 100, w: 720, h: 40, destructible: false, ceiling: true },
        // Real wall geometry (added 2026-07-24, was missing) — the room's
        // horizontal bound was assumed to come from getBounds()'s numeric
        // area.width clamp in physics.js, but that clamp only lives inside
        // resolveEnemyPhysics (enemies); the player goes through
        // resolveEntityCollision, which only resolves against actual
        // platform geometry and has no numeric-bounds fallback. With no
        // real wall here, a knockback hit could shove the player past
        // x:0/x:700 into empty space with no floor there either (the floor
        // above only spans that same range) — reported as "enemies push
        // the player out of bounds." wallMargin in physics.js scales with
        // how far the entity moved this frame specifically so a hard
        // knockback can't tunnel through, so plain wall platforms (no
        // special flag needed) are the actual fix, not a bigger numeric
        // clamp.
        { x: -20, y: 100, w: 20, h: 460 },
        { x: 700, y: 100, w: 20, h: 460 },
      ],
      transitions: [],
      connections: [],
      enemies: [],
      anchors: [],
      abilityReward: null,
      healingCrystals: [],
      loreFragments: []
    },
};

// ── Editor overrides ─────────────────────────────────────────────────────
// levelEditor.html's "💾 Save to Browser (Live)" button saves the working
// room here; applied on load so testing a room in index.html needs no
// copy-paste into this file. Same pattern as animdata.js's
// applyAnimOverrides() / game.js's applyHudLayoutOverrides() — one room
// replaced per key, not merged field-by-field, since a room is one
// linter-checked unit (see validateAreaGraph() below, which runs on the
// post-override AREAS so a bad saved room still gets caught).
const AREA_OVERRIDES_KEY = 'stillpoint_area_overrides_v1';
(function applyAreaOverrides() {
  try {
    const raw = localStorage.getItem(AREA_OVERRIDES_KEY);
    if (!raw) return;
    const overrides = JSON.parse(raw);
    for (const id in overrides) AREAS[id] = overrides[id];
  } catch (e) { /* private browsing / bad JSON — run with built-ins */ }
})();

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
// `roomType` doubles as map-styling metadata ('boss' gets drawMap()'s red
// border) AND the source of truth for the boss/miniboss spawn gates game.js
// actually checks (`isBossArena`/`isMinibossArena`) — the derivation loop
// right before validateAreaGraph() below sets those flags from roomType, so
// a new boss/miniboss room only ever needs roomType + miniboss + bossSpawn,
// never the flags themselves by hand (they used to require manual setting,
// which nothing in the real room data ever did — see the loop's own comment).
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

// Derive the spawn-gating flags game.js's per-frame update loop actually
// reads (isMinibossArena/isBossArena) from the authored roomType. These
// were two separate fields meant to always agree, but isMinibossArena/
// isBossArena were never set on any real room here (only in dev tools —
// levelEditor.html, enemy_test.html, agentController.js) — so no boss or
// miniboss has ever spawned in real gameplay despite 11 miniboss rooms +
// the final boss room already having roomType/miniboss/bossSpawn authored.
// Deriving instead of duplicating means a new boss/miniboss room only ever
// needs one field kept correct, not three.
for (const roomId in AREAS) {
  const room = AREAS[roomId];
  if (room.roomType === 'miniboss') room.isMinibossArena = true;
  if (room.roomType === 'boss') room.isBossArena = true;
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
// Standable = something the player can actually come to rest on.
//   • wall / ceiling / destructible — excluded (pre-existing rules).
//   • hazard — excluded: it's a trigger volume, never solid, and treating it
//     as ground would let the linter "prove" a route that actually damages
//     you or drops you into a pit.
//   • oneWay — INCLUDED: you land on top of it normally.
//   • crumble — INCLUDED: it holds you long enough to be a real route (it's
//     a timing challenge, not an absence of floor).
// Moving platforms are measured at their authored anchor position, which is
// the conservative choice — the linter can't simulate them over time.
// `rotatedGravityOnly` (2026-07-26, Gravity Collapse Core): a platform only
// ever standable once `roomGravityDir` points somewhere other than 'down'
// (a ceiling or side wall meant to become a floor when the boss flips
// gravity) — real, ordinary, fully-standable platform data at runtime
// (nothing in physics.js reads this flag; it has zero gameplay effect),
// excluded here for the same reason `ceiling`/`hazard` already are: this
// linter has no concept of rotated gravity, so under its own
// always-down-gravity simulation these platforms are genuinely unreachable
// and would otherwise read as a false-positive bug on every page load.
function _linterStandable(room) {
  return (room.platforms || []).filter((p) => !p.wall && !p.destructible && !p.ceiling && !p.hazard && !p.rotatedGravityOnly);
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