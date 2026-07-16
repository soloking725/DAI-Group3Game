# Floor Plan — full-game room connection graph (official, 2026-07-13)

Source of truth for room-to-room topology across the whole game: the 9-room
origin spine, the 3 built regions (Mirror Veil, Event Horizon, Chrono-Space
Rift), and all 10 planned `expansion.md` regions, in one connected graph.
Adopted as official over the older placeholder-only view in `worldmap.html`'s
`PLANNED_REGIONS` (single node per unbuilt region, no internal room detail)
and ahead of `regions.md`'s cluster table, which stays the reference for
*mechanical effect, miniboss assignment, and reward placement* per region —
this doc is topology only, `regions.md` is everything else. Keep the two in
sync by hand; neither replaces the other.

Originally authored as a Whimsical board; `floor_plan.svg` is that board's
raw export (365KB, embedded font, not machine-parseable) and is kept only as
a visual reference — **the mermaid source below is canonical**. Diff/grep it
like any other doc; render it with any mermaid-compatible viewer (GitHub,
mermaid.live, the mermaid CLI) when you want the picture.

Corrections made when adopting this as official:
- "Tether Shot" (3 occurrences) was a mislabel for the existing **Void
  Tether** ability (`story.md` §4) — fixed, not a new ability.
- **Magnet Climb removed entirely (2026-07-14, direct instruction)**. It had
  briefly existed as a genuinely new planned ability gating the Antechamber
  alongside Void Tether (XOR). Static Field, Room 2 keeps its Fracture Pip
  and its new miniboss (see `lore.md`'s "The Conduit") but no longer grants
  an ability. The Antechamber's entry requirement (previously "Magnet Climb
  OR Void Tether but not both") is also removed — entry from The Rift is
  now ungated beyond what The Rift itself already requires (Charged Attack,
  Graviton Surge).
- **Sovereign Room 1–4** and **Sovereign's Observatory** are the planned
  Sovereign Ending postgame's actual content nodes (`story.md` §9, rescoped
  2026-07-14 from "far-future, unscoped" to a real 5-step sequenced arc —
  see roadmap.md 5.9). Still not part of the critical path (postgame,
  reached only via the Sovereign Ending) and still no room-by-room content
  designed beyond the sequence in story.md §9, but no longer "not committed"
  — this is real planned work now, not a reserved slot that might never be
  used.
- This graph brings back **Mirror Corridor** (Mirror Veil Sanctum → Event
  Horizon Gate) as a real room. `regions.md` had flagged Mirror Corridor as
  "the flagship idea" for the game's tree-vs-web connectivity problem,
  removed 2026-07-13 with nothing yet replacing it — this plan replaces it.
- **Two new side-branches added 2026-07-14**, both off the existing spine,
  neither part of the 13 spacetime regions or the critical path:
  - **Pacifist Enclave**, off Upper Ruins — an early, optional, explicitly
    not-under-Sovereign-rule pocket. Peaceful play unlocks 5 minigames
    leading to 1 lore pip; fighting even once forfeits the reward
    permanently (per the irreversible-consent-gated-choice throughline,
    `CLAUDE.md`). Placed off Upper Ruins rather than The Vault (an earlier
    draft) since The Vault is comparatively late-game.
  - **Sovereign's Army Reserve**, off Graviton Core Room 3 — an extremely
    difficult horde gauntlet (per the placement logic: Graviton Core is
    the one region still under live contact with the Sovereign's command
    structure, see `lore.md`'s Graviton Core entry). Dead-ends into
    **Limit Breaker Trial**, which unlocks a 4th ability-upgrade tier
    beyond the standard 3 (see the not-yet-finalized ability upgrade tree
    discussion) — a high-difficulty, high-reward optional cap for players
    who want more than the standard progression offers.
- **2026-07-15 sync from a Whimsical re-export**: `Mirror_Veil_Gate ->
  Mirror_Veil_Reflection` was accidentally dropped in an intermediate edit
  (an LLM pass reformatting quotes for stricter mermaid parsing wasn't the
  cause — the edge was already missing in the source pasted back in) —
  restored, since without it Phase Dash was only reachable via a long
  detour through Echo Bridge/Timeline Crossroads/Event Horizon and a
  backwards walk, not the intended early unlock right off Mirror Veil
  Gate. The one-way teleport connections (Void Expanse → Paradox Engine,
  Warp Gate Nexus → Inverted Spire, Static Field → Graviton Core, Chrono
  Space Rift Sanctum → Echoing Abyss) are now real edges instead of
  text-only implied connections. **King Room 1–4 / King's Observatory
  renamed to Sovereign Room 1–4 / Sovereign's Observatory** for
  consistency with the rest of the docs (the King→Sovereign lore rename
  was 2026-07-13; this file had reverted to "King" in the interim).
- **`Plans/analyze_floor_plan.js`** (added 2026-07-15) parses this doc's
  mermaid block directly and runs an ability-gated reachability + critical
  path / "speedrun" path search — run it after any edit to this graph:
  `node Plans/analyze_floor_plan.js`. `--diff` cross-checks this doc
  against `floor_plan.svg`/`floor_plan_mermaid.txt` for drift. `--html`
  generates `Plans/floor_plan_report.html`, a visual path/backtracking
  viewer.

```mermaid
flowchart TD
    Spawn_Area_1_cosmeti_b7f53544(["Spawn Area<br>(1 cosmetic upgrade)"]) -->|One way Spawn → Tutorial| Tutorial_Area_42b6730d([Tutorial Area])
    Tutorial_Area_42b6730d -->|One way Tutorial → Fracture| The_Fracture_part_1__4aadc34d["The Fracture, part 1<br>(fast travel)"]
    The_Fracture_part_1__4aadc34d --> The_Fracture_part_3_13a81420[The Fracture, part 3]
    The_Fracture_part_1__4aadc34d --> The_Fracture_part_2_e041db7b[The Fracture, part 2]
    The_Fracture_part_1__4aadc34d --> Crag_Entrance_fast_t_14519efb["Crag Entrance<br>(fast travel)<br>(entry requires phase dash)"]
    The_Fracture_part_3_13a81420 --> The_Fracture_part_4_30b30796[The Fracture, part 4]
    The_Fracture_part_3_13a81420 -->|Void Tether is required for this path| Chrono_Space_Rift_re_05e19d7f["Chrono Space Rift, Echo<br>(requires Void Tether to enter from the Fracture)"]
    The_Fracture_part_2_e041db7b --> Sovereign_Room_1_0df4fb23["Sovereign Room 1<br>(post-game)"]
    The_Fracture_part_2_e041db7b --> Mirror_Veil_Gate_fas_8d5ae934["Mirror Veil, Gate<br>(fast travel)"]
    Mirror_Veil_Reflecti_886306b6["Mirror Veil, Reflection<br>(1 Lore Pip)"] --> Mirror_Veil_Hollow_m_991cd9fc["Mirror Veil, Hollow<br>(miniboss)"]
    The_Fracture_part_4_30b30796 --> Echo_Bridge_part_1_m_99e4e301["Echo Bridge, part 1<br>(meet the Child)<br>(+1 max health)<br>(on first entry, mandatory to go to Echo Bridge, prison)"]
    Crag_Entrance_fast_t_14519efb --> Crag_Breach_part_1_3184f872[Crag Breach part 1]
    Crag_Breach_part_1_3184f872 --> Crag_Altar_unlocks_c_37825bdb["Crag Altar<br>(unlocks charged attack, floor collapses and you must fight  Crag warden)"]
    Crag_Altar_unlocks_c_37825bdb --> Crag_Warden_miniboss_72af253f["Crag Warden<br>(miniboss)<br>(1 lore pip)"]
    Crag_Warden_miniboss_72af253f --> Echo_Bridge_part_1_m_99e4e301
    Crag_Warden_miniboss_72af253f --> Sovereign_Room_3_f4051da9["Sovereign Room 3<br>(post-game)"]
    Echo_Bridge_part_1_m_99e4e301 -->|One way — teleported here immediately after meeting the Child (mandatory, first entry only)| Echo_Bridge_Prison_1_8f7c5e40
    Echo_Bridge_part_1_m_99e4e301 --> Crystal_Cavern_unloc_04f4af71["Crystal Cavern<br>(unlocks Shard Shot)<br>(shard shot required to leave)<br>(entry requires child_choice_resolved)"]
    Echo_Bridge_part_1_m_99e4e301 --> Upper_Ruins_bfebb55e[Upper Ruins]
    Echo_Bridge_part_1_m_99e4e301 --> Timeline_X_Roads_Roo_6da4d1dd["Timeline X Roads, Room 1<br>(fast travel)"]
    Echo_Bridge_part_1_m_99e4e301 -->|entry blocked until prison sequence is finished| The_Void_Expanse_Roo_c32cb52f["The Void Expanse,<br>Room 1<br>(1 lore pip)<br>(1 cosmetic upgrade)"]
    Echo_Bridge_part_1_m_99e4e301 -->|Void Tether is required for this path| Observatory_Room_2_e_b28df5db["Observatory, Room 2<br>(entry requires Graviton Surge)<br>(1 lore pip)"]
    Crystal_Cavern_unloc_04f4af71 --> Timeline_X_Roads_Roo_6da4d1dd
    Crystal_Cavern_unloc_04f4af71 --> Echoing_Abyss_Room_1_e4aea011["Echoing Abyss, Room 1<br>(fast travel)<br>(entry requires Phase Dash)"]
    Crystal_Cavern_unloc_04f4af71 -->|Void Tether is Required for this path| Timeline_X_Roads_Roo_6813cf57[Timeline X Roads, Room 3]
    Upper_Ruins_bfebb55e --> Pacifist_Region_1_lo_d8b63f32["Pacifist Region<br>(1 lore pip)"]
    Mirror_Veil_Gate_fas_8d5ae934 --> Timeline_X_Roads_Roo_6da4d1dd
    Timeline_X_Roads_Roo_6da4d1dd --> Timeline_X_Roads_Roo_65253a78["Timeline X Roads, Room 2<br>(Unlocks Void Tether if you give up the Child, if you don't permanently no Void Tether)<br>(locked by Echo Bridge part 1)<br>(unlocks child_choice_resolved)<br>(miniboss)<br>(1 lore pip)"]
    Timeline_X_Roads_Roo_6da4d1dd --> Echo_Bridge_Prison_1_8f7c5e40["Echo Bridge, Prison<br>(1 cosmetic upgrade)<br>(no way back to X Roads Room 1 from here — the only way out is forward to Room 2)"]
    Mirror_Veil_Hollow_m_991cd9fc --> Mirror_Veil_Sanctum__31d7793f["Mirror Veil, Sanctum<br>(unlocks Phase Dash)"]
    Mirror_Veil_Sanctum__31d7793f --> Mirror_Corridor_c9be7338["Mirror Corridor<br>(entry requires child_choice_resolved)"]
    Mirror_Corridor_c9be7338 --> Event_Horizon_Gate_f_7819cf8d["Event Horizon - Gate<br>(fast travel)"]
    Event_Horizon_Gate_f_7819cf8d --> Event_Horizon_Pull_1ff0db5e[Event Horizon - Pull]
    Chrono_Space_Rift_re_05e19d7f --> Chrono_Space_Rift_Sa_3690e358["Chrono Space Rift, Sanctum<br>(Miniboss) “Ally”<br>(unlocks Stillpoint)<br>(1 Fracture Pip)"]
    Chrono_Space_Rift_re_05e19d7f --> The_Void_Expanse_Roo_c32cb52f
    Chrono_Space_Rift_Sa_3690e358 --> One_way_teleport_to__db4ed8e2[One way teleport to Echoing Abyss]
    One_way_teleport_to__db4ed8e2 --> Teleport_from_Chrono_156a5d63[Teleport from Chrono Space Rift - Sanctum]
    Chrono_Space_Rift_Lo_3715e812["Chrono Space Rift, Loop, Part 2<br>(1 Lore Pip)"] --> Chrono_Space_Rift_re_05e19d7f
    Chrono_Space_Rift_Lo_3715e812 -->|Void Tether is required for this path| Event_Horizon_Pull_1ff0db5e
    Chrono_Space_Rift_Lo_337af3b7["Chrono Space Rift, Loop, Part 1<br>(1 cosmetic upgrade)"] --> Chrono_Space_Rift_Lo_3715e812
    Chrono_Space_Rift_Lo_337af3b7 -->|Void Tether is required for this path| Teleport_Gate_from_T_155e9b50[Teleport Gate from The Void Expanse to Paradox Engine]
    Chrono_Space_Rift_Lo_337af3b7 --> Sovereign_Room_4_8d99727d["Sovereign Room 4<br>(post-game)"]
    The_Void_Expanse_Roo_c32cb52f --> Chrono_Space_Rift_Lo_337af3b7
    The_Void_Expanse_Roo_c32cb52f --> The_Void_Expanse_Roo_d1706789["The Void Expanse, Room 2<br>(requires Shard Shot)"]
    Sovereign_s_Observatory_u_cf918d3c["Sovereign’s Observatory <br>(unlocks fast travel)<br>(entry requires Graviton Surge)<br>(1 lore pip)"] --> The_Void_Expanse_Roo_c32cb52f
    Observatory_Room_3_bcb4aee1[Observatory, Room 3] --> Sovereign_s_Observatory_u_cf918d3c
    Observatory_Room_2_e_b28df5db --> Observatory_Room_3_bcb4aee1
    One_Way_Teleport_Gat_af1e0060[One Way Teleport Gate to  Paradox Engine] -->|One Way Teleport| Teleport_Gate_from_T_155e9b50
    One_Way_Warp_Gate_to_2a80d338[One Way Warp Gate to Inverted Spire] -->|One Way Teleport| Teleport_from_Warp_G_5ff08337[Teleport from Warp Gate Nexus]
    The_Void_Expanse_Roo_d1706789 --> One_Way_Teleport_Gat_af1e0060
    The_Void_Expanse_Roo_d1706789 --> Warp_Gate_Nexus_Room_2362c429[Warp Gate Nexus<br>Room 1]
    Warp_Gate_Nexus_Room_2362c429 --> Warp_Gate_Nexus_Room_f2a1c66e["Warp Gate Nexus<br>Room 2<br>(miniboss)<br>(1 lore pip)"]
    Warp_Gate_Nexus_Room_f2a1c66e --> One_Way_Warp_Gate_to_2a80d338
    Echoing_Abyss_Room_1_e4aea011 --> Echoing_Abyss_Room_2_4333a718["Echoing Abyss Room 2<br>(miniboss)<br>(1 lore pip)"]
    Chrono_Space_Rift_Ga_df218195["Chrono Space Rift. Gate<br>(fast travel)"] --> Chrono_Space_Rift_Lo_337af3b7
    Teleport_from_Chrono_156a5d63 --> Echoing_Abyss_Room_1_e4aea011
    Timeline_X_Roads_Roo_6813cf57 --> Chrono_Space_Rift_Ga_df218195
    Timeline_X_Roads_Roo_6813cf57 --> The_Forge_entry_requ_f5b88350["The Forge<br>(entry requires Stillpoint)<br>(1 fracture pip)"]
    Teleport_from_Parado_7511174d["Teleport from Paradox Engine to Upper Ruins<br>(blocked by Shard Shot)"] --> Pacifist_Region_1_lo_d8b63f32
    Timeline_X_Roads_Roo_65253a78 --> Crystal_Cavern_unloc_04f4af71
    Timeline_X_Roads_Roo_65253a78 --> Timeline_X_Roads_Roo_6813cf57
    Timeline_X_Roads_Roo_65253a78 --> Puppet_Strings_Tethe_c5f2dee9["Puppet Strings / Tether  Region Part 1<br>(locked by Void Tether)"]
    Timeline_X_Roads_Roo_65253a78 --> The_Observatory_Room_18d031aa["The Observatory, Room 1<br>(entry requires charged attack)"]
    Timeline_X_Roads_Roo_65253a78 --> Sovereign_Room_2_7d22bac7["Sovereign Room 2<br>(post-game)"]
    Timeline_X_Roads_Roo_65253a78 --> Graviton_Core_Room_1_7aa0f207["Graviton Core, Room 1<br>(entry requires Shard Shot)"]
    Timeline_X_Roads_Roo_65253a78 -->|Phase Dash is required for this path| The_Rift_entry_requi_c828e742
    Echo_Bridge_Prison_1_8f7c5e40 --> Timeline_X_Roads_Roo_65253a78
    Event_Horizon_Pull_1ff0db5e --> Echo_Bridge_Prison_1_8f7c5e40
    Event_Horizon_Pull_1ff0db5e --> Event_Horizon_Drift__41409fad["Event Horizon - Drift<br>(1 Lore Pip)"]
    Puppet_Strings_Tethe_c3c782bb["Puppet Strings / Tether Region Part 2<br>(locked by Void Tether)<br>(+1 max health)"] --> Timeline_X_Roads_Roo_65253a78
    Puppet_Strings_Tethe_c5f2dee9 --> Puppet_Strings_Tethe_c3c782bb
    Event_Horizon_Drift__41409fad --> Event_Horizon_Core_m_dcce3acd["Event Horizon - Core<br>(miniboss)"]
    Teleport_from_Warp_G_5ff08337 --> Inverted_Spire_entry_73199bc7["Inverted Spire<br>(entry requires Gravition Surge)<br>(1 lore pip)"]
    Event_Horizon_Core_m_dcce3acd --> Inverted_Spire_entry_73199bc7
    Inverted_Spire_entry_73199bc7 --> Timeline_X_Roads_Roo_65253a78
    Teleport_Gate_from_T_155e9b50 --> Paradox_Engine_Room__e57e2854[Paradox Engine, Room 1]
    Polar_Shift_Room_2_m_bb762f9a["Polar Shift, Room 2<br>(miniboss)<br>(1 lore pip)"] -->|One way Polar Shift → Paradox Engine| Paradox_Engine_Room__e57e2854
    Paradox_Engine_Room__e57e2854 --> Paradox_Engine_Room__739c76e5["Paradox Engine, Room 2<br>(miniboss)<br>(entry requires Shard Shot)<br>(1 lore pip)"]
    Polar_Shift_Room_1_f_dbd9a683["Polar Shift, Room 1<br>(fast travel)<br>(+1 max health)"] --> Polar_Shift_Room_2_m_bb762f9a
    The_Rift_entry_requi_c828e742["The Rift<br>(entry requires Stillpoint)<br>(entry requires child_choice_resolved)<br>(entry requires Phase Dash)<br>(1 lore pip)"] --> Polar_Shift_Room_1_f_dbd9a683
    The_Rift_entry_requi_c828e742 --> The_Antechamber_1b52237e[The Antechamber]
    The_Vault_Room_1_fas_bb32ea0e["The Vault, Room 1<br>(fast travel)"] --> Polar_Shift_Room_1_f_dbd9a683
    The_Vault_Room_1_fas_bb32ea0e --> The_Vault_Room_2_1_l_2e5b94d7["The Vault, Room 2<br>(1 lore pip)"]
    The_Vault_Room_1_fas_bb32ea0e --> Graviton_Core_Room_1_7aa0f207
    The_Vault_Room_1_fas_bb32ea0e --> The_Rift_entry_requi_c828e742
    The_Observatory_Room_18d031aa --> Observatory_Room_2_e_b28df5db
    The_Vault_Room_2_1_l_2e5b94d7 --> The_Rift_entry_requi_c828e742
    The_Forge_entry_requ_f5b88350 --> Chrono_Space_Rift_Ga_df218195
    The_Forge_entry_requ_f5b88350 --> The_Vault_Room_1_fas_bb32ea0e
    The_Forge_entry_requ_f5b88350 --> The_Observatory_Room_18d031aa
    Graviton_Core_Room_1_7aa0f207 --> Graviton_Core_Room_2_77e3c3ea["Graviton Core, Room 2<br>(entry requires Shard Shot)<br>(unlocks Graviton Surge)<br>(1 Fracture Pip here)"]
    Teleport_from_Static_8c56de9c[Teleport from Static Field] --> Graviton_Core_Room_1_7aa0f207
    Graviton_Core_Room_3_57a669f0["Graviton Core, Room 3<br>(entry requires Shard Shot)<br>(miniboss)<br>(1 Lore Pip)"] --> The_Vault_Room_1_fas_bb32ea0e
    Graviton_Core_Room_3_57a669f0 -->|Void Tether is required for this path| The_Vault_Room_2_1_l_2e5b94d7
    Graviton_Core_Room_3_57a669f0 --> Sovereign_Army_Reser_dbc2b23d["Sovereign Army Reserve<br>(locked by 4 Fracture Pips and 10 Lore Pips)"]
    Graviton_Core_Room_3_57a669f0 --> Inverted_Spire_entry_73199bc7
    Graviton_Core_Room_2_77e3c3ea --> Inverted_Spire_entry_73199bc7
    Graviton_Core_Room_2_77e3c3ea --> Graviton_Core_Room_3_57a669f0
    Paradox_Engine_Room__739c76e5 --> Teleport_from_Parado_7f586d4d[Teleport from Paradox Engine Room 2 to Upper Ruins]
    Teleport_from_Parado_7f586d4d --> Teleport_from_Parado_7511174d
    Paradox_Engine_Room__739c76e5 --> Static_Field_Room_1_1a1e1c6e[Static Field, Room 1]
    Static_Field_Room_1_1a1e1c6e --> Static_Field_Room_2__e865794e["Static Field, Room 2<br>(new miniboss)<br>(entry requires Phase Dash)<br>(1 Fracture Pip)"]
    Static_Field_Room_1_1a1e1c6e --> One_Way_Teleport_to__40607331[One Way Teleport to the Void Expanse , Room 2]
    Static_Field_Room_1_1a1e1c6e --> One_Way_Teleport_to__edbbb037["One Way Teleport to Graviton Core<br>(1 cosmetic upgrade)"]
    Static_Field_Room_2__e865794e --> The_Rift_entry_requi_c828e742
    Static_Field_Room_2__e865794e --> One_Way_Teleport_to__edbbb037
    The_Antechamber_1b52237e --> Hollow_Core_1_lore_p_5006a1d2["Hollow Core<br>(1 lore pip)"]
    The_Antechamber_1b52237e -->|One way (entry requires phase dash)| Spawn_Area_1_cosmeti_e4e44b1f(["“Spawn Area”<br>(1 cosmetic upgrade)"])
    Sovereign_Army_Reser_dbc2b23d --> Try_out_region_Level_bbb1ae72["Try out region<br>(Level 4 Limit Break Unlock here)"]
    One_Way_Teleport_to__40607331 --> The_Void_Expanse_Roo_d1706789
    One_Way_Teleport_to__edbbb037 -->|One Way Teleport| Teleport_from_Static_8c56de9c
    Spawn_Area_1_cosmeti_e4e44b1f --> Tutorial_Area_Final__89ceb24c([“Tutorial Area”<br>Final Boss Fight])
classDef style0 stroke:#207868,fill:#207868
class Chrono_Space_Rift_Ga_df218195,Chrono_Space_Rift_Lo_337af3b7,Chrono_Space_Rift_Lo_3715e812,Chrono_Space_Rift_Sa_3690e358,Chrono_Space_Rift_re_05e19d7f,One_way_teleport_to__db4ed8e2,Teleport_from_Chrono_156a5d63 style0
classDef style1 stroke:#E8833A,fill:#E8833A
class Crag_Altar_unlocks_c_37825bdb,Crag_Breach_part_1_3184f872,Crag_Entrance_fast_t_14519efb,Crag_Warden_miniboss_72af253f style1
classDef style2 stroke:#0CFFD3,fill:#0CFFD3
class Crystal_Cavern_unloc_04f4af71,Echoing_Abyss_Room_1_e4aea011,Echoing_Abyss_Room_2_4333a718,The_Forge_entry_requ_f5b88350 style2
classDef style3 stroke:#1AAE9F,fill:#1AAE9F
class Event_Horizon_Core_m_dcce3acd,Event_Horizon_Drift__41409fad,Event_Horizon_Gate_f_7819cf8d,Event_Horizon_Pull_1ff0db5e style3
style Inverted_Spire_entry_73199bc7 stroke:#0088FF,fill:#0088FF
classDef style4 stroke:#D3455B,fill:#D3455B
class Sovereign_Room_1_0df4fb23,Sovereign_Room_2_7d22bac7,Sovereign_Room_3_f4051da9,Sovereign_Room_4_8d99727d,Sovereign_Army_Reser_dbc2b23d,Try_out_region_Level_bbb1ae72 style4
classDef style5 stroke:#F7C325,fill:#F7C325
class Sovereign_s_Observatory_u_cf918d3c,Observatory_Room_2_e_b28df5db,Observatory_Room_3_bcb4aee1,The_Observatory_Room_18d031aa style5
classDef style6 stroke:#BD34D1,fill:#BD34D1
class Mirror_Veil_Gate_fas_8d5ae934,Mirror_Veil_Hollow_m_991cd9fc,Mirror_Veil_Reflecti_886306b6,Mirror_Veil_Sanctum__31d7793f,Puppet_Strings_Tethe_c3c782bb,Puppet_Strings_Tethe_c5f2dee9 style6
classDef style7 stroke:#AC6363,fill:#AC6363
class One_Way_Warp_Gate_to_2a80d338,Teleport_from_Warp_G_5ff08337,Warp_Gate_Nexus_Room_2362c429,Warp_Gate_Nexus_Room_f2a1c66e style7
style Polar_Shift_Room_2_m_bb762f9a stroke:#F7E600,fill:#F7E600
style Polar_Shift_Room_1_f_dbd9a683 stroke:#F7E600,fill:#F7E600
classDef style8 stroke:#9EADBA,fill:#788896
class Mirror_Corridor_c9be7338,Pacifist_Region_1_lo_d8b63f32,Spawn_Area_1_cosmeti_b7f53544,Spawn_Area_1_cosmeti_e4e44b1f,Tutorial_Area_42b6730d,Tutorial_Area_Final__89ceb24c,Upper_Ruins_bfebb55e style8
classDef style9 stroke:#6558F5,fill:#6558F5
class One_Way_Teleport_to__40607331,One_Way_Teleport_to__edbbb037,Static_Field_Room_1_1a1e1c6e,Static_Field_Room_2__e865794e style9
classDef style10 stroke:#4BCA61,fill:#4BCA61
class Graviton_Core_Room_1_7aa0f207,Graviton_Core_Room_2_77e3c3ea,Graviton_Core_Room_3_57a669f0,Paradox_Engine_Room__739c76e5,Paradox_Engine_Room__e57e2854,Teleport_Gate_from_T_155e9b50,Teleport_from_Parado_7511174d,Teleport_from_Parado_7f586d4d,Teleport_from_Static_8c56de9c style10
classDef style11 stroke:#730FC3,fill:#730FC3
class Echo_Bridge_Prison_1_8f7c5e40,Echo_Bridge_part_1_m_99e4e301,The_Fracture_part_1__4aadc34d,The_Fracture_part_2_e041db7b,The_Fracture_part_3_13a81420,The_Fracture_part_4_30b30796 style11
classDef style12 stroke:#C08CEA,fill:#C08CEA
class Hollow_Core_1_lore_p_5006a1d2,The_Antechamber_1b52237e,The_Rift_entry_requi_c828e742 style12
style The_Vault_Room_1_fas_bb32ea0e stroke:#897A5F,fill:#897A5F
style The_Vault_Room_2_1_l_2e5b94d7 stroke:#897A5F,fill:#897A5F
classDef style13 stroke:#E100BB,fill:#E100BB
class One_Way_Teleport_Gat_af1e0060,The_Void_Expanse_Roo_c32cb52f,The_Void_Expanse_Roo_d1706789 style13
classDef style14 stroke:#8E00FF,fill:#8E00FF
class Timeline_X_Roads_Roo_65253a78,Timeline_X_Roads_Roo_6813cf57,Timeline_X_Roads_Roo_6da4d1dd style14
linkStyle 0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107 stroke:#788896
```

## Open items (not resolved by this doc)

- **Inverted Spire entry**: labeled here as requiring "Gravition Surge"
  (typo for **Graviton Surge**) in two places — read as Graviton Surge,
  the already-documented planned ability, not a new one.
- **Reachability bug fixed 2026-07-14**: `The_Fracture_part_2 →
  Mirror_Veil_Gate → Timeline X Roads, Room 1` was a route into Timeline
  Crossroads that completely bypassed Echo Bridge (where the player meets
  the child) — `Crystal_Cavern`'s route into the same room already required
  Echo Bridge first, but this second edge didn't. Fixed by gating that edge
  on having met the child. Worth a `validateAreaGraph()`-style reachability
  check once this region is actually built, not just a one-time manual fix.
- **Sovereign Room 1–4 / Sovereign's Observatory**: names and door topology
  only, still no actual room content designed. Now real planned postgame
  work (`story.md` §9, roadmap.md 5.9), not unscoped speculation — but the
  5-step arc in story.md §9 doesn't yet say what happens room-by-room, so
  still don't build against these without a fuller design pass first.
- ~~Magnet Climb~~ — removed 2026-07-14, see the corrections note above.
  Kept here only so this list's history reads coherently; nothing to design
  for it anymore. Same "not a final lock" caveat as the rest of `regions.md`'s reward
  placement section.
