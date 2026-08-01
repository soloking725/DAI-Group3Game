# SFX Credits

Existing `attack`/`attackHit`/`heavyAttack`/`bossHit`/`enemyDeath`/`playerHurt`/
`shardHit`/`parry`/`uiSelect` samples are Kenney "Impact Sounds" / "Interface
Sounds" (CC0) — see `LICENSE_kenney_impact.txt` / `LICENSE_kenney_interface.txt`
in this folder. Not re-listed below; this table only covers the scavenged
war-weapon SFX added 2026-07-26.

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
untouched procedural SFX (jump, land, dash, wall-jump/slide, telegraphs,
pickups, boss phase/death, teleport) have no matching candidate yet and stay
procedural.

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
