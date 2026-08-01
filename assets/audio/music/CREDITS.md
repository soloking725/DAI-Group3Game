# Music credits

Region/hub tracks below were sourced as CC0 (public domain) from OpenGameArt.org, downloaded as
MP3/OGG/WAV, then processed with `ffmpeg` (loudness-normalized to ~-18 LUFS via the `loudnorm`
filter, 0.4s fade-in / 0.6s fade-out to kill loop clicks/pops, re-encoded to Ogg Vorbis at
44.1kHz/~160kbps-equivalent quality) and renamed to match the region/boss they're assigned to in
`game/audio.js` (`MUSIC_MAP` / `BOSS_MUSIC_MAP`). No CC-BY tracks were used in that first pass —
CC0 supply was sufficient, so no attribution requirements applied there.

A second pass (below, `boss_*.ogg`) gave every named miniboss/boss its own unique theme instead
of sharing the old two-tier `miniboss_a`/`miniboss_b` pool. Processing was identical (ffmpeg
`loudnorm` to ~-18 LUFS, 0.4s fade-in / 0.6s fade-out, re-encoded to Ogg Vorbis, 44.1kHz) so these
sit at the same perceived loudness as everything else. Two of the eleven had no CC0 fit and use
CC-BY tracks instead — attribution for those is included in the table below.

| File | Source track | Author | License | Source URL | Used for |
|---|---|---|---|---|---|
| mirror_veil.ogg | "Sector" (Dark Sci-Fi Audio Pack) | SRG774 | CC0 | https://opengameart.org/content/dark-sci-fi-audio-pack | Mirror Veil region (gate/reflection/hollow/sanctum/corridor) |
| observatory_spire.ogg | "Airy" (Dark Sci-Fi Audio Pack) | SRG774 | CC0 | https://opengameart.org/content/dark-sci-fi-audio-pack | Observatory region + Inverted Spire (floaty, vertiginous, vast) |
| event_horizon.ogg | "Pulse" (Dark Sci-Fi Audio Pack) | SRG774 | CC0 | https://opengameart.org/content/dark-sci-fi-audio-pack | Event Horizon region (gate/pull/drift/core) |
| polar_paradox.ogg | "Urgent" (Dark Sci-Fi Audio Pack) | SRG774 | CC0 | https://opengameart.org/content/dark-sci-fi-audio-pack | Polar Shift + Paradox Engine (driving/urgent, magnetic push-pull & chase tension) |
| chrono_fracture.ogg | "Transmission" (Dark Sci-Fi Audio Pack) | SRG774 | CC0 | https://opengameart.org/content/dark-sci-fi-audio-pack | Chrono-Space Rift region + The Fracture parts 1-4 (looping/temporal, ties to the loop-reset ending) |
| timeline_crossroads.ogg | "The Surreal Truth" | Joth | CC0 | https://opengameart.org/content/ambience-pack-1-sci-fi-horror | Timeline Crossroads + Puppet Strings/Tether region (past/present overlap, ghostly) |
| graviton_static.ogg | "Infestation in the Control Room" | Joth | CC0 | https://opengameart.org/content/ambience-pack-1-sci-fi-horror | Graviton Core + Static Field (oppressive mechanical / glitchy corrupting) |
| crag.ogg | "Final Captain's Log" | Joth | CC0 | https://opengameart.org/content/ambience-pack-1-sci-fi-horror | Crag region (Entrance/Breach/Altar/Warden) — closest CC0 fit for "rocky, primal, collapsing"; flagged as an imperfect placeholder below |
| vault_void_expanse.ogg | "The Depths of Hell" | Joth | CC0 | https://opengameart.org/content/ambience-pack-1-sci-fi-horror | The Vault / Hollow Core / The Rift (late-game vault cluster) + The Void Expanse + Sovereign Rooms 1-3 approach corridor |
| echoing_abyss.ogg | "Cage of the Cryptid" | Joth | CC0 | https://opengameart.org/content/ambience-pack-1-sci-fi-horror | Echoing Abyss region + The Antechamber (closest available fit for "intimate, sad, unresolved" — flagged below) |
| hub_living.ogg | "Heavenly Loop" | isaiah658 | CC0 | https://opengameart.org/content/heavenly-loop | All living/hub areas: Spawn Area, Tutorial Area, Warp Gate Nexus, one-way teleport connector rooms, Sanctums, King Rooms 1-4, `try_out_region` |
| miniboss_a.ogg | "Hard Boss Battle 1" (bpm200) | MintoDog | CC0 | https://opengameart.org/content/hard-boss-battle-1 | Lighter-weight minibosses: Colossus Core, Hollow Guardian, Timeline Keeper, Chrono Ally, Polar Guardian, Static Guardian, Sovereign Army Reserve horde |
| miniboss_b.ogg | "Hard Boss Battle 2" (bpm210) | MintoDog | CC0 | https://opengameart.org/content/hard-boss-battle-2 | Heavier/more dangerous minibosses: Abyss Guardian (Quantum Pursuer), Gravity Collapse Core, Warp Guardian, Fractured Sovereign's Guard (Graviton Sentinel), The Assembler (Paradox Engine) |
| final_boss.ogg | "Epic Boss Battle [Seamlessly Looping]" | Juhani Junkala (via SubspaceAudio's "400 Indie Game Music Loops") | CC0 | https://opengameart.org/content/boss-battle-music | The Sovereign — final boss fight (unchanged, still the best fit for "fighting your own future self") |

### Per-boss unique themes (second pass — replaces the miniboss_a/miniboss_b sharing below)

| File | Source track | Author | License | Source URL | Assigned to |
|---|---|---|---|---|---|
| boss_crag_warden.ogg | "Hard Battle 1" (bpm170) | MintoDog | CC0 | https://opengameart.org/content/hard-battle-1 | Crag of the Colossus — Crag Warden (`colossus_core`) |
| boss_mirror_king.ogg | "Dark Shrine Loop" | qubodup | CC0 | https://opengameart.org/content/dark-shrine-loop | Mirror Veil — The Mirror King (`hollow_guardian`) |
| boss_gravity_collapse_core.ogg | "Technological Menace" | Umplix | CC0 | https://opengameart.org/content/technological-menace | Event Horizon — Gravity Collapse Core (`horizon_core`) |
| boss_temporal_warden.ogg | "Aftermath" | Indieteur | CC0 | https://opengameart.org/content/aftermath | Chrono-Space Rift — Temporal Warden (`chrono_ally`) |
| boss_graviton_guard.ogg | "Hard Dungeon" (bpm140) | MintoDog | CC0 | https://opengameart.org/content/hard-dungeon | Graviton Core — Fractured Sovereign's Guard (`graviton_sentinel`) |
| boss_electromagnetic_golem.ogg | "Heat Boss Battle" (bpm165) | MintoDog | CC0 | https://opengameart.org/content/heat-boss-battle | The Polar Shift — Electromagnetic Golem (`polar_guardian`) |
| boss_quantum_pursuer.ogg | "Sinister Abode" | Zane Little Music | CC0 | https://opengameart.org/content/sinister-abode | Echoing Abyss — Quantum Pursuer (`abyss_guardian`) |
| boss_warden_hollow.ogg | "Hard Battle 2" (bpm140) | MintoDog | CC0 | https://opengameart.org/content/hard-battle-2 | Warp Gate Nexus — Warden & Hollow duo (`warp_guardian`) |
| boss_conduit.ogg | "Heavy Boss Battle 1" (bpm200) | MintoDog | CC0 | https://opengameart.org/content/heavy-boss-battle-1 | Static Field — The Conduit (`static_guardian`) |
| boss_assembler.ogg | "Caustic Chip" | Jan125 | **CC-BY 4.0** — attribution required: "Caustic Chip" by Jan125, https://opengameart.org/content/caustic-chip | https://opengameart.org/content/caustic-chip | Paradox Engine — The Assembler (`paradox_engine`) |
| boss_timeline_crossroads.ogg | "Chuggin' Through Columbia (Looping)" | Eric Matyas (soundimage.org) | **CC-BY 3.0** — attribution required: music by Eric Matyas, www.soundimage.org | https://opengameart.org/content/chuggin-through-columbia-looping | Timeline Crossroads — unnamed scientist miniboss (`timeline_keeper`) |
| boss_void_expanse.ogg | "Dark Ambience Loop" | Iwan "qubodup" Gabovitch | **CC-BY 3.0** — attribution required: music by Iwan "qubodup" Gabovitch | https://opengameart.org/content/dark-ambience-loop | Void Expanse — The Undertow (`void_expanse_boss`), added 2026-07-28. Promoted from the candidate pool over the CC0 alternates (`sinister_boss_appears.ogg` etc.) because it's an actual ambience loop matching the fight's void-chase tone — the CC0 picks were either a one-shot "boss appears" stinger (wrong shape for a track that has to loop the whole fight) or generic boss-battle loops with no thematic fit. |
| boss_antechamber_child.ogg | "Regret - Short Emotional Piano" | Wolfgang_ | CC0 | https://opengameart.org/content/regret-short-emotional-piano | The Antechamber — The Child (`antechamber_child`), added 2026-07-28 once the Abandoned Shell/Antechamber Child canon conflict was resolved (this fight now replaces Abandoned Shell as the sole "lost the child" consequence, per user direction — see game_update.js's Absorb/Spare choice). Matches the fight's intimate/tragic tone, not an industrial final-boss loop. |
| boss_abandoned_shell.ogg | "Horror Theme 1" | Lasse Bührmann (embedded file metadata; candidate manifest listed "EmoPreben" as an OGA page attribution — flagging the discrepancy rather than picking silently) | CC0 | https://opengameart.org/content/oldschool-horror-theme | Hollow Core — Abandoned Shell (`abandoned_shell`), added 2026-07-28, relocated from the final door per user direction and made unconditional (fights every playthrough). Trimmed to a 75s loop (`ffmpeg -t 75`, same loudnorm/fade convention as every other live track) from the original ~3:18 candidate file. |

No CC0 track was found for a "trains/industrial transit" theme (Timeline Crossroads) or a fast
glitchy chiptune theme (The Assembler) — those two use CC-BY tracks with attribution above, per
the exception in the brief. Every other named miniboss/boss got a unique CC0 track; **zero**
named bosses had to share a track this pass.

## Notes / corners cut due to CC0 scarcity

- No good CC0 track was found that's a precise fit for **Crag** region ambience (as opposed to
  the Crag Warden boss fight itself, which now has its own unique `boss_crag_warden.ogg`) or
  **The Antechamber** (intimate, sad, unresolved Child fight — region ambience only; the Child
  fight itself has no `area.miniboss`/boss-music hook in the code yet, so it isn't in
  `BOSS_MUSIC_MAP` — see flag below). Both region tracks use the closest mood match from Joth's
  sci-fi horror ambience pack (`crag.ogg`, `echoing_abyss.ogg`) as a placeholder.
- Several distinct regions intentionally share one region/hub track because their moods are close
  enough to read as cohesive rather than jarring: Observatory + Inverted Spire (both
  floaty/vertiginous), Polar Shift + Paradox Engine (both driving/urgent), Graviton Core + Static
  Field (both oppressive/mechanical), and the late Vault cluster + Void Expanse + Sovereign
  approach rooms (all heavy, isolating, "closing in on the end" mood). This is about
  *region/ambient* music (`AREA_MUSIC_MAP`), separate from the now-unique boss fight themes above.
- All hub/living areas share one warm/calm bed (`hub_living.ogg`) by design — see the
  `// LIVING_AREA` comments in `game/audio.js` for the future ambient-life hook.
- `miniboss_a`/`miniboss_b` (the old two-tier boss pool) are no longer used by any named miniboss;
  they're kept only as the horde track for `sovereign_army_reserve` (Sovereign's Army Reserve —
  a repeated-clone horde, not a single named miniboss, via `AREA_MUSIC_MAP`).
- **The Void Expanse's miniboss, The Undertow** (`void_expanse_boss`), was built 2026-07-28 as a
  `ComposedEnemy` def (`game/enemy.js`) and wired into `void_expanse_room2` (now `roomType:
  'miniboss'`) — see `boss_void_expanse.ogg` above for its now-live track.
- **The Antechamber Child vs. Abandoned Shell conflict is resolved** (2026-07-28, user
  direction): the Child fight replaces Abandoned Shell as the sole "lost the child"
  consequence (carries the Absorb/Spare choice and Collapse/Loop endings); Abandoned Shell
  itself was relocated to Hollow Core and made unconditional (every playthrough fights it
  there, decoupled from the child's fate). Both now have live tracks, see the table above.
