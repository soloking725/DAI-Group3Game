# SFX Credits

Existing `attack`/`attackHit`/`heavyAttack`/`bossHit`/`enemyDeath`/`playerHurt`/
`shardHit`/`parry`/`uiSelect` samples are Kenney "Impact Sounds" / "Interface
Sounds" (CC0) — see `LICENSE_kenney_impact.txt` / `LICENSE_kenney_interface.txt`
in this folder. Not re-listed below; this table only covers the scavenged
war-weapon SFX added 2026-07-26.

**Void Tether wired 2026-08-02** — was completely silent (cast/latch reused
`SFX.dash()`, arrival had no sound at all). Three new dedicated cues matching
the three real moments in `game/game_update.js`'s tether code:
`voidTetherCast.ogg` ("going out" — plays the instant the tether latches onto
a target or grapples a wall), `voidTetherPull.ogg` (the sustained travel),
`voidTetherHit.ogg` (arrival/impact — `SFX.voidTetherHit(sizeFactor)` shifts
its pitch center by target size, so a big enemy lands lower/heavier and a
small one lands higher/lighter, not just randomly different each time).

| File | Source track | Author | License | Source URL |
|---|---|---|---|---|
| voidTetherCast.ogg | "laserRetro_002" (Sci-Fi Sounds) | Kenney | CC0 | https://kenney.nl/assets/sci-fi-sounds |
| voidTetherPull.ogg | "thrusterFire_002" (Sci-Fi Sounds) | Kenney | CC0 | https://kenney.nl/assets/sci-fi-sounds |
| voidTetherHit.ogg | "impactMetal_003" (Sci-Fi Sounds) | Kenney | CC0 | https://kenney.nl/assets/sci-fi-sounds |

Same `ffmpeg` loudnorm (I=-16 LUFS)/fade/Ogg Vorbis pipeline as everything
else here.

**Round-robin variants added 2026-08-02** (`game/audio.js`'s `playSample()` now
picks randomly among an array when `SAMPLE_URLS[name]` is an array, instead of
always the same buffer — reduces repeated-hit fatigue on the three most
frequently-triggered cues): `attack_2.ogg`/`attack_3.ogg`,
`heavyAttack_2.ogg`/`heavyAttack_3.ogg`, `parry_2.ogg`/`parry_3.ogg`. Same
Kenney "Impact Sounds" pack as the originals (`impactPunch_medium_001/002`,
`impactMetal_heavy_001/002`, `impactBell_heavy_001/002` — the originals are
`_000`), pulled from the already-downloaded `assets/audio/candidates/enemy_sfx/`
pool and re-encoded with the same `loudnorm` (I=-16 LUFS)/fade/Ogg Vorbis
pipeline as everything else here. CC0, same license file as the originals.

| File | Source track | Author | License | Source URL | Notes |
|---|---|---|---|---|---|
| gunShot.ogg | "gunshot_0.mp3" (Basic Sound Effects) | n4 | CC0 | https://opengameart.org/content/basic-sound-effects | Gun (`ATTACK_BEHAVIORS.gun`, enemy.js) |
| taserZap.ogg | "spark.wav" (Electricity Sound Effects) | Brian MacIntosh (BMacZero) | CC0 | https://opengameart.org/content/electricity-sound-effects-0 | Taser (`ATTACK_BEHAVIORS.taser`) — optional attribution per author, not required |
| flamethrower.ogg | "fire-1.wav" (Fire Crackling) | AntumDeluge | CC0 | https://opengameart.org/content/fire-crackling | Flamethrower (`ATTACK_BEHAVIORS.flamethrower`) — closest available CC0 fit ("popping/crackling fireplace" rather than a jet-flame recording); flagged as an imperfect placeholder, same convention as the music CREDITS.md's Crag/Antechamber notes |
| bombExplode.ogg | "Dynamite with sensor.wav" (Dynamite sound effect) | Listener | CC0 | https://opengameart.org/content/dynamite-sound-effect | Scavenged bomb/mine detonation (`ranged_projectile` `pattern: 'mine'`) |

All four downloaded as WAV/MP3, run through `loudnorm` (I=-16 LUFS, -18 for
flamethrower) + a short fade-in/out, re-encoded to OGG Vorbis 44.1kHz stereo —
same pipeline convention as `assets/audio/music/CREDITS.md`. None require
attribution, but author names are kept in each file's `ARTIST`/`COMMENTS`
metadata and in this table regardless.

| chargedAttack.ogg | "Power-Up Sound v2" | Spring Spring | CC0 | https://opengameart.org/content/power-up-sound (via candidates/enemy_sfx/chargedAttack) | `SFX.chargeFull()` — charged-attack ready cue |
| phaseDash.ogg | "Teleport Spell" (Summoning Wars) | Summoning Wars team | CC0 | https://opengameart.org/content/summoning-wars-sounds (via candidates/enemy_sfx/phaseDash) | `SFX.phaseDash()` |
| stillpoint.ogg | "Time Slow" ("time_stop") | unknown (OGA "Time Slow") | CC0 | via candidates/enemy_sfx/stillpoint | `SFX.stillpointActivate()` |

Promoted 2026-07-28 from the reviewed `assets/audio/candidates/enemy_sfx/`
pool (CC0-only picks) to replace procedural fallbacks for those three cues;
untouched procedural SFX (wall-jump/slide, telegraphs, pickups, boss
phase/death, teleport) have no matching candidate yet and stay procedural.

| jump.ogg | "Jump Landing Sound" | MentalSanityOff (via qubodup) | CC0 | https://opengameart.org/content/jump-landing-sound | `SFX.jump()` |
| land.ogg | "landing.ogg" (yd's Platformer Sounds) | yd | CC0 | https://opengameart.org/content/platformer-sounds-terminal-interaction-door-shots-bang-and-footsteps | `SFX.land()` — "blunt landing of a metal spaceship / cyborg on the floor," good sci-fi fit |
| dash.ogg | "Swosh swoosh whoosh air sound" | qubodup (Iwan Gabovitch) | CC0 | https://freesound.org/people/qubodup/sounds/60026/ | `SFX.dash()` |

Added 2026-08-02, same `loudnorm` (I=-16 LUFS) + short fade + OGG Vorbis
44.1kHz re-encode pipeline as above.

## Known gaps

- **Net launcher** (`ATTACK_BEHAVIORS.net`, added 2026-07-26 alongside these)
  has no dedicated SFX yet — its `onFire` currently reuses `SFX.dash()` as a
  placeholder "thrown object" whoosh. No CC0 "net throw"/"whoosh with cloth"
  sound was sourced this pass; worth a dedicated search before shipping.
- **Flamethrower** is a fireplace-crackle placeholder, not a jet-flame sound —
  see the table note above. A purpose-built CC0 flamethrower/blowtorch SFX
  wasn't found without a Freesound login-gated download (a strong candidate,
  "Flamethrower" by SamsterBirdies, exists there but requires account login
  to fetch the actual file — not usable without the user creating/using an
  account).
