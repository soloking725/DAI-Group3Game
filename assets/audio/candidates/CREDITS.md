# Candidate-pool audio credits

Everything under `assets/audio/candidates/` is an UNCHOSEN alternate for A/B testing in
`editor/audio_ab_tester.html` — none of it is live in `game/audio.js`. Nothing here
replaces or overwrites the tracks documented in `assets/audio/music/CREDITS.md` or
`assets/audio/sfx/`.

## Region / boss music alternates (`regions/_shared/`, `bosses/_shared/`)

All CC0. Processed the same way as the live tracks: `ffmpeg` loudness-normalized to
~-18 LUFS, short fade in/out, re-encoded to Ogg Vorbis 44.1kHz.

| File | Source track | Author | License | Source URL |
|---|---|---|---|---|
| regions/_shared/cosmic_navigation.ogg | "Cosmic Navigation" | rezoner | CC0 | https://opengameart.org/content/cosmic-navigation |
| regions/_shared/outer_space_1.ogg | "Outer Space Loop" | cynicmusic | CC0 | https://opengameart.org/content/outer-space-loop |
| regions/_shared/dead_ship.ogg | "Background space track" ("MyVeryOwnDeadShip") | yd | CC0 | https://opengameart.org/content/background-space-track |
| regions/_shared/busy_cyberworld.ogg | "Scifi City - Ambient Loop" | Iwan Gabovitch (qubodup) | CC0 | https://opengameart.org/content/scifi-city-ambient-loop |
| regions/_shared/dungeon_ambient_1.ogg | "Loopable Dungeon Ambience" | Fantozzi | CC0 | https://opengameart.org/content/loopable-dungeon-ambience |
| bosses/_shared/heavy_boss_battle_1.ogg | "Heavy Boss Battle 1" | MintoDog | CC0 | https://opengameart.org/content/heavy-boss-battle-1 |
| bosses/_shared/urban_boss_battle.ogg | "Urban Boss Battle" | MintoDog | CC0 | https://opengameart.org/content/urban-boss-battle |
| bosses/_shared/trance_boss_battle.ogg | "Trance Boss Battle" | MintoDog | CC0 | https://opengameart.org/content/trance-boss-battle |
| regions/_shared2/horror_1.ogg | "Oldschool Horror Theme" | EmoPreben | CC0 | https://opengameart.org/content/oldschool-horror-theme |
| regions/_shared2/derelict.ogg | "Derelict" (dark ambient) | unattributed on OGA collection page | CC0 | https://opengameart.org/content/cc0-dark-music |
| regions/_shared2/observing_the_star.ogg | "Observing the Star" | yd | CC0 | https://opengameart.org/content/cc0-space-music |
| regions/_shared2/out_there.ogg | "Space Music: Out There" | yd | CC0 | https://opengameart.org/content/space-music-out-there |
| bosses/_shared2/oh_boss.ogg | "Oh! boss!" | haruta | CC0 | https://opengameart.org/content/oh-boss |
| bosses/_shared2/jrpg_battle_loop.ogg | "JRPG Epic Rock Battle Theme #1" (loop) | HydroGene | CC0 | https://opengameart.org/content/jrpg-epic-rock-battle-theme-1 |
| bosses/_shared2/cleytonrx_battle_theme.ogg | "Battle RPG Theme (Var)" | CleytonKauffman | CC0 | https://opengameart.org/content/boss-battle-theme |

Assignment to specific regions/bosses is in `manifest.json` — regions/bosses can share
alternate files (same approach the live system already uses when moods overlap), but
every region and every boss is now its OWN entity in the manifest (Observatory and
Inverted Spire split apart, Polar Shift and Paradox Engine split apart, etc.) so each
can end up with a genuinely different pick even where they currently share a candidate
pool. `void_expanse_boss` and `antechamber_child` were added as boss entities even
though neither has a live track — those two fights (from the user's latest miniboss
doc) have no `area.miniboss`/spawn code in `game/boss.js` yet, so their candidates are
ready but not wireable until the encounter exists.

`derelict.ogg`'s exact individual author couldn't be confirmed — it came from OGA's
"CC0 - Dark Music" collection page, which aggregates several CC0 works and only
auto-generates full attribution for the first; the collection page itself is CC0, cited
as the source until a more precise per-track credit turns up.

**Known gaps**: still no alternate for `hub_living` (warm/calm hub mood) — CC0
"cozy/warm" ambient remains scarce relative to dark/tense.

## Story-fitted picks for the two newest bosses (`bosses/_shared3/`)

The generic boss-battle tracks (heavy/urban/trance/oh_boss/etc.) don't actually suit
these two fights' tone, so these are targeted finds, listed first in their entity's
candidate list:

| File | Source track | Author | License | Source URL | Why it fits |
|---|---|---|---|---|---|
| bosses/_shared3/dark_ambience_loop.ogg | "Dark Ambience Loop" | Iwan Gabovitch (qubodup) | **CC-BY 3.0 — attribution required if used** | https://opengameart.org/content/dark-ambience-loop | Built for "horror, chase, or hiding" — matches the Void Expanse miniboss's void-teleport chase and consuming-darkness theft/loss theme. |
| bosses/_shared3/sinister_boss_appears.ogg | "Sinister Boss Appears!" | cynicmusic | CC0 | https://opengameart.org/content/sinister-boss-appears | An "evil boss introduction" cue — works as an escalation layered over/into the Dark Ambience Loop bed for this fight. |
| bosses/_shared3/piano_nostalgia.ogg | "Regret - Short Emotional Piano" | Wolfgang_ | CC0 | https://opengameart.org/content/regret-short-emotional-piano | Matches the Antechamber fight's intimate/tragic tone — the Child fighting with scavenged weapons, not an industrial final boss. |
| bosses/_shared3/emotional_piano_loop.ogg | "Emotional Piano Loop" | extenz | CC0 | https://opengameart.org/content/emotional-piano-loop | Tagged sad/emotional/scary — has enough underlying tension to still read as a fight, not just a cutscene. |

**Caveat**: the boss-music system (`SFX.setBossMusic` in `game/audio.js`) plays one
looping track for a whole fight — it doesn't crossfade between sub-tracks per phase.
Both piano picks are calmer than a typical boss loop, which suits Antechamber's phase 1
(solo, sad) but may feel too quiet for phase 3's rage boost; worth reassessing once the
fight is actually implemented and you can hear it against real phase pacing, rather than
assuming one track has to cover all three phases.

## Enemy hit-sound variants (`enemy_sfx/<slot>/`)

Two source families now, since the user specifically asked for non-Kenney options:

**Kenney "Impact Sounds" / "Interface Sounds"** (CC0, same packs the live SFX in
`assets/audio/sfx/` already use — see `assets/audio/sfx/LICENSE_kenney_*.txt`). Each
slot includes every numbered variant Kenney shipped (typically `_000`-`_004`),
including the one currently live, so it can be compared directly against alternates.

| Slot | Kenney category | Variants included |
|---|---|---|
| attack | impactPunch_medium | 000-004 |
| attackHit | impactMetal_medium | 000-004 |
| heavyAttack | impactMetal_heavy | 000-004 |
| bossHit | impactPlate_heavy | 000-004 |
| enemyDeath | impactSoft_heavy | 000-004 |
| playerHurt | impactPunch_heavy | 000-004 |
| shardHit | impactGlass_light | 000-004 |
| parry | impactBell_heavy | 000-004 |
| uiSelect | click + select | click_001-005, select_001-008 |

Source: https://kenney.nl/assets/impact-sounds and https://kenney.nl/assets/interface-sounds.

**New, non-Kenney sources** — added because the current Kenney hit sounds weren't
landing for the user:

| File | Source pack | Author | License | Source URL | Used for |
|---|---|---|---|---|---|
| enemy_sfx/attack/rpgpack_swing.ogg, swing2.ogg, swing3.ogg | "RPG Sound Pack" | artisticdude | CC0 | https://opengameart.org/content/rpg-sound-pack | attack (3 sword-swing variants) |
| enemy_sfx/attackHit/rpgsfx80_blade_01/02/03.ogg | "80 CC0 RPG SFX" | Fupi | CC0 | https://opengameart.org/content/80-cc0-rpg-sfx | attackHit |
| enemy_sfx/heavyAttack/rpgsfx80_metal_01/02.ogg | "80 CC0 RPG SFX" | Fupi | CC0 | https://opengameart.org/content/80-cc0-rpg-sfx | heavyAttack |
| enemy_sfx/bossHit/rpgsfx80_metal_03.ogg, creature_monster_02.ogg, creature_roar_01.ogg | "80 CC0 RPG SFX" | Fupi | CC0 | https://opengameart.org/content/80-cc0-rpg-sfx | bossHit |
| enemy_sfx/enemyDeath/rpgsfx80_creature_die_01.ogg, creature_monster_01.ogg, creature_roar_02.ogg | "80 CC0 RPG SFX" | Fupi | CC0 | https://opengameart.org/content/80-cc0-rpg-sfx | enemyDeath |
| enemy_sfx/playerHurt/rpgsfx80_creature_hurt_01/02.ogg | "80 CC0 RPG SFX" | Fupi | CC0 | https://opengameart.org/content/80-cc0-rpg-sfx | playerHurt |
| enemy_sfx/shardHit/rpgsfx80_stones_01/02.ogg | "80 CC0 RPG SFX" | Fupi | CC0 | https://opengameart.org/content/80-cc0-rpg-sfx | shardHit |
| enemy_sfx/parry/rpgsfx80_chain_01/02.ogg | "80 CC0 RPG SFX" | Fupi | CC0 | https://opengameart.org/content/80-cc0-rpg-sfx | parry |

(`RPG Sound Pack`'s zip download was partially corrupted on fetch — only `swing`/`swing2`/
`swing3`/`magic1`/`spell` extracted cleanly; only the swing variants were used here since
they're the only ones relevant to these slots. Worth re-fetching later if `magic1`/`spell`
turn out useful elsewhere, e.g. an ability-cast sound.)

**Still no non-Kenney alternative found for `uiSelect`** — flagged for a follow-up
search rather than filled with a weaker fit.

## Second pass (2026-07-27) — attack/parry alternates + new ability slots

The user didn't like any of the existing `attack`/`heavyAttack`/`parry`/`shardHit`
candidates, so this pass adds a second, differently-sourced batch to each, plus four
brand-new candidate-only slots (`liveTrack: null`) for abilities that have no SFX hook
yet: `phaseDash`, `stillpoint`, `chargedAttack`, `electricAbility` (the last for an
unbuilt electromagnetic ability, e.g. roadmap's `graviton_surge`, or Polar
Shift/Static Field/Conduit stingers).

| Slot | New files | Source pack | Author | License | Source URL |
|---|---|---|---|---|---|
| attack | swish_1..13.ogg | "Swishes Sound Pack" | Summoning Wars team | CC0 | https://opengameart.org/content/swishes-sound-pack |
| attack | sword_swing_1..10.ogg | "20 Sword Sound Effects (Attacks and Clashes)" | StarNinjas | CC0 | https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes |
| heavyAttack | sword_clash_1..10.ogg | "20 Sword Sound Effects (Attacks and Clashes)" | StarNinjas | CC0 | https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes |
| parry | cast_iron_clang_1/6/12/18/24/30.ogg (6 of 33) | "33 Metal Clang Sounds from Cast Iron Pans" | bart | CC0 | https://opengameart.org/content/33-metal-clang-sounds-cast-iron-pans |
| parry | metal_bing1/bong1/clink1/clink2/clink3/thud2/thud3.ogg | "Metal Impact Sounds" | unknown (OGA page) | CC0 | https://opengameart.org/content/metal-impact-sounds |
| shardHit | ice_shatter_1..5.ogg | "Ice Breaking/Shattering" | LedasLuzta | CC0 | https://opengameart.org/content/ice-breakingshattering |
| phaseDash (new) | teleport_summoningwars.ogg | "Teleport Spell" | Summoning Wars team | CC0 | https://opengameart.org/content/teleport-spell |
| phaseDash (new) | teleport_electricity.ogg | "Electricity Game Sound Pack" | faxcorp | CC0 | https://opengameart.org/content/electricity-game-sound-pack |
| stillpoint (new) | time_stop.ogg | "Time Slow" | unknown (OGA page) | CC0 | https://opengameart.org/content/time-slow |
| stillpoint (new) | freeze_spell.ogg | "Freeze Spell" | artisticdude | CC0 | https://opengameart.org/content/freeze-spell-0 |
| stillpoint (new) | qubodup_ice_damage_01/02/03/03b/03c/03d/03e/03f.ogg | "Ice & Electricity Magic" | Iwan 'qubodup' Gabovitch | **CC-BY 3.0 — attribution required** | https://opengameart.org/content/ice-electricity-magic |
| chargedAttack (new) | power_up_v1/v2/v3.ogg | "Power-Up Sound Effects" | Spring Spring | CC0 | https://opengameart.org/content/power-up-sound-effects |
| chargedAttack (new) | charge.ogg, chargestart.ogg | "Electricity Game Sound Pack" | faxcorp | CC0 | https://opengameart.org/content/electricity-game-sound-pack |
| electricAbility (new) | crackle_electricity_loop.ogg, deathboom.ogg, powerup.ogg, shieldhit.ogg | "Electricity Game Sound Pack" | faxcorp | CC0 | https://opengameart.org/content/electricity-game-sound-pack |
| electricAbility (new) | qubodup_electricity_damage_01/02.ogg | "Ice & Electricity Magic" | Iwan 'qubodup' Gabovitch | **CC-BY 3.0 — attribution required** | https://opengameart.org/content/ice-electricity-magic |

All files were re-encoded the same way as the rest of the pool: `ffmpeg` loudness-
normalized to -18 LUFS (TP -1.5, LRA 11), resampled to 44.1kHz, encoded to Ogg
Vorbis. `cast_iron_clang` picked 6 of the pack's 33 near-identical markers spaced
across the set rather than all 33, to avoid near-duplicate clutter in the tester.

**License note**: everything above is CC0 except the two `qubodup` sources (ice and
electricity), which are CC-BY 3.0 — attribution to Iwan 'qubodup' Gabovitch is
required if either ends up live.
