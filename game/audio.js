// Sound design: recorded music/SFX samples where we have them, with procedural
// Web Audio synthesis as a fallback for one-shot SFX that have no sample yet.
// Browsers block audio until a user gesture, so SFX.init() must be called from a
// click/keydown handler (game.js calls it when the player starts the game).
//
// Signal chain: two independent buses, each with its own gain + limiter, so a
// burst of overlapping SFX (attack + hit + hurt in one frame) can never duck or
// gate the music playing on the other bus:
//   music/boss tracks -> musicBus gain -> musicCompressor -> destination
//   one-shot SFX/samples -> sfxBus gain -> sfxCompressor -> destination
// setMusicVolume()/setSfxVolume()/BASE_LEVEL scale each bus independently, so
// the options menu can offer separate Music/SFX sliders (each 0..1).
const SFX = (() => {
  let ctx = null;
  let musicBus = null;    // music-bus volume knob (musicVolumeMultiplier)
  let sfxBus = null;      // sfx-bus volume knob (sfxVolumeMultiplier)
  let musicCompressor = null; // safety limiter for the music bus only
  let sfxCompressor = null;   // safety limiter for the sfx bus only
  let currentAreaId = null;
  let unlocked = false;
  let musicVolumeMultiplier = 1.0; // 0..1, exposed via setMusicVolume()
  let sfxVolumeMultiplier = 1.0;   // 0..1, exposed via setSfxVolume()

  const BASE_LEVEL = 0.5; // bus gain before the user multiplier; keeps headroom for compressors

  // Recorded hits/impacts/UI clicks (CC0, Kenney "Impact Sounds" / "Interface Sounds").
  // Loaded once as decoded AudioBuffers; each name below has a matching procedural
  // fallback further down, used automatically until the buffer finishes loading
  // (or if decoding/fetch ever fails).
  const SAMPLE_URLS = {
    // attack/heavyAttack/parry are arrays — round-robin picked in playSample()
    // instead of always playing the same buffer, so a repeated attack doesn't
    // read as thin/identical after a few swings. All three variants per slot
    // are the same Kenney sub-pack as the original (_001/_002 alongside the
    // original _000), so they stay tonally consistent — see CREDITS.md.
    attack: ['assets/audio/sfx/attack.ogg', 'assets/audio/sfx/attack_2.ogg', 'assets/audio/sfx/attack_3.ogg'],
    attackHit: 'assets/audio/sfx/attackHit.ogg',
    heavyAttack: ['assets/audio/sfx/heavyAttack.ogg', 'assets/audio/sfx/heavyAttack_2.ogg', 'assets/audio/sfx/heavyAttack_3.ogg'],
    bossHit: 'assets/audio/sfx/bossHit.ogg',
    enemyDeath: 'assets/audio/sfx/enemyDeath.ogg',
    playerHurt: 'assets/audio/sfx/playerHurt.ogg',
    shardHit: 'assets/audio/sfx/shardHit.ogg',
    parry: ['assets/audio/sfx/parry.ogg', 'assets/audio/sfx/parry_2.ogg', 'assets/audio/sfx/parry_3.ogg'],
    uiSelect: 'assets/audio/sfx/uiSelect.ogg',
    // Scavenged war weapons (2026-07-26) — see assets/audio/sfx/CREDITS.md
    // for source/license/author of each. All CC0, no attribution required.
    gunShot: 'assets/audio/sfx/gunShot.ogg',
    taserZap: 'assets/audio/sfx/taserZap.ogg',
    flamethrower: 'assets/audio/sfx/flamethrower.ogg',
    bombExplode: 'assets/audio/sfx/bombExplode.ogg',
    // CC0, reviewed from assets/audio/candidates/enemy_sfx/ (2026-07-28) —
    // see assets/audio/sfx/CREDITS.md.
    chargedAttack: 'assets/audio/sfx/chargedAttack.ogg',
    phaseDash: 'assets/audio/sfx/phaseDash.ogg',
    stillpoint: 'assets/audio/sfx/stillpoint.ogg',
    // Void Tether, added 2026-08-02 — was silent (cast/latch reused SFX.dash(),
    // arrival had nothing at all). Three distinct stages matching the three
    // real moments in game_update.js's tether code: cast (the instant it
    // latches onto a target or grapples a wall), pull (the sustained travel),
    // hit (arrival/impact — pitch-scaled by target size, see SFX.voidTetherHit()).
    voidTetherCast: 'assets/audio/sfx/voidTetherCast.ogg',
    voidTetherPull: 'assets/audio/sfx/voidTetherPull.ogg',
    voidTetherHit: 'assets/audio/sfx/voidTetherHit.ogg',
  };
  const sampleBuffers = {}; // name -> decoded AudioBuffer, once loaded

  // --- music layer (recorded tracks, CC0 — see assets/audio/music/CREDITS.md) ---
  // Parallel to the procedural drone above: the drone keeps running (ducked
  // quieter) as a textural bed, while a looping recorded track per
  // region/boss sits on top. Single lookup table below — this is the one
  // place to edit to change a region's or boss's track assignment.
  const MUSIC_URLS = {
    mirror_veil: 'assets/audio/music/mirror_veil.ogg',
    observatory_spire: 'assets/audio/music/observatory_spire.ogg',
    event_horizon: 'assets/audio/music/event_horizon.ogg',
    polar_paradox: 'assets/audio/music/polar_paradox.ogg',
    chrono_fracture: 'assets/audio/music/chrono_fracture.ogg',
    timeline_crossroads: 'assets/audio/music/timeline_crossroads.ogg',
    graviton_static: 'assets/audio/music/graviton_static.ogg',
    crag: 'assets/audio/music/crag.ogg',
    vault_void_expanse: 'assets/audio/music/vault_void_expanse.ogg',
    echoing_abyss: 'assets/audio/music/echoing_abyss.ogg',
    hub_living: 'assets/audio/music/hub_living.ogg',   // LIVING_AREA — see setAreaAmbient below
    miniboss_a: 'assets/audio/music/miniboss_a.ogg',
    miniboss_b: 'assets/audio/music/miniboss_b.ogg',
    final_boss: 'assets/audio/music/final_boss.ogg',

    // Unique per-boss/miniboss themes (see assets/audio/music/CREDITS.md).
    // miniboss_a/miniboss_b above are kept only for sovereign_army_reserve
    // (horde, not a single named miniboss) — every named miniboss below now
    // has its own track instead of sharing one of the two old tiers.
    boss_crag_warden: 'assets/audio/music/boss_crag_warden.ogg',
    boss_mirror_king: 'assets/audio/music/boss_mirror_king.ogg',
    boss_gravity_collapse_core: 'assets/audio/music/boss_gravity_collapse_core.ogg',
    boss_temporal_warden: 'assets/audio/music/boss_temporal_warden.ogg',
    boss_graviton_guard: 'assets/audio/music/boss_graviton_guard.ogg',
    boss_electromagnetic_golem: 'assets/audio/music/boss_electromagnetic_golem.ogg',
    boss_quantum_pursuer: 'assets/audio/music/boss_quantum_pursuer.ogg',
    boss_assembler: 'assets/audio/music/boss_assembler.ogg',
    boss_warden_hollow: 'assets/audio/music/boss_warden_hollow.ogg',
    boss_timeline_crossroads: 'assets/audio/music/boss_timeline_crossroads.ogg',
    boss_conduit: 'assets/audio/music/boss_conduit.ogg',
    boss_void_expanse: 'assets/audio/music/boss_void_expanse.ogg', // The Undertow — see BOSS_MUSIC_MAP
    boss_antechamber_child: 'assets/audio/music/boss_antechamber_child.ogg', // The Child — see BOSS_MUSIC_MAP
    boss_abandoned_shell: 'assets/audio/music/boss_abandoned_shell.ogg',     // Abandoned Shell — see BOSS_MUSIC_MAP
  };
  const musicBuffers = {}; // trackKey -> decoded AudioBuffer, once loaded

  // area.js area-id -> music track key. Every AREAS id in game/area.js should
  // resolve here (directly or via the default below); unmapped ids fall back
  // to the closest-mood shared track rather than silence. See
  // assets/audio/music/CREDITS.md for why several regions intentionally
  // share a track (CC0 supply didn't have a unique fit for every mood).
  const AREA_MUSIC_MAP = {
    // Living/hub areas — LIVING_AREA: future ambient-life hook (NPC chatter,
    // idle sound cues, etc.) can key off this same track set.
    spawn_area_1: 'hub_living', spawn_area_2: 'hub_living', tutorial_area: 'hub_living',
    warp_gate_nexus_room1: 'hub_living', warp_gate_nexus_room2: 'hub_living',
    mirror_veil_sanctum: 'hub_living', chrono_rift_sanctum: 'hub_living',
    try_out_region: 'hub_living',
    sovereign_room1: 'hub_living', sovereign_room2: 'hub_living', sovereign_room3: 'hub_living', sovereign_room4: 'hub_living',
    one_way_teleport_gate_to_paradox_engine: 'hub_living',
    one_way_warp_gate_to_inverted_spire: 'hub_living',
    teleport_from_paradox_engine_to_upper_ruins_1: 'hub_living',

    // Mirror Veil
    mirror_veil_gate: 'mirror_veil', mirror_veil_reflection: 'mirror_veil',
    mirror_veil_hollow: 'mirror_veil', mirror_corridor: 'mirror_veil',

    // Observatory + Inverted Spire (shared — both floaty/vertiginous)
    observatory_room1: 'observatory_spire', observatory_room2: 'observatory_spire',
    observatory_room3: 'observatory_spire', sovereign_observatory: 'observatory_spire',
    inverted_spire: 'observatory_spire',

    // Event Horizon
    event_horizon_gate: 'event_horizon', event_horizon_pull: 'event_horizon',
    event_horizon_drift: 'event_horizon', event_horizon_core: 'event_horizon',

    // Polar Shift + Paradox Engine (shared — both driving/urgent)
    polar_shift_room1: 'polar_paradox', polar_shift_room2: 'polar_paradox',
    paradox_engine_room1: 'polar_paradox', paradox_engine_room2: 'polar_paradox',

    // Chrono-Space Rift + The Fracture (shared — looping/temporal)
    chrono_rift_gate: 'chrono_fracture', chrono_rift_loop1: 'chrono_fracture',
    chrono_rift_loop2: 'chrono_fracture', chrono_rift_echo: 'chrono_fracture',
    the_fracture_part1: 'chrono_fracture', the_fracture_part2: 'chrono_fracture',
    the_fracture_part3: 'chrono_fracture', the_fracture_part4: 'chrono_fracture',

    // Timeline Crossroads + Puppet Strings/Tether
    timeline_x_roads_room1: 'timeline_crossroads', timeline_x_roads_room2: 'timeline_crossroads',
    timeline_x_roads_room3: 'timeline_crossroads',
    puppet_strings_part1: 'timeline_crossroads', puppet_strings_part2: 'timeline_crossroads',

    // Graviton Core + Static Field (shared — both oppressive/mechanical)
    graviton_core_room1: 'graviton_static', graviton_core_room2: 'graviton_static',
    graviton_core_room3: 'graviton_static',
    static_field_room1: 'graviton_static', static_field_room2: 'graviton_static',

    // Crag
    crag_entrance: 'crag', crag_breach: 'crag', crag_altar: 'crag', crag_warden: 'crag',

    // Late vault cluster + Void Expanse + Sovereign approach (shared — heavy/isolating)
    the_vault_room1: 'vault_void_expanse', the_vault_room2: 'vault_void_expanse',
    the_rift: 'vault_void_expanse', hollow_core: 'vault_void_expanse',
    void_expanse_room1: 'vault_void_expanse', void_expanse_room2: 'vault_void_expanse',
    sovereign_room1: 'vault_void_expanse', sovereign_room2: 'vault_void_expanse',
    sovereign_room3: 'vault_void_expanse',

    // Echoing Abyss + The Antechamber (placeholder fit — see CREDITS.md)
    echoing_abyss_room1: 'echoing_abyss', echoing_abyss_room2: 'echoing_abyss',
    antechamber: 'echoing_abyss',

    // Final boss room
    sovereign_room4: 'final_boss', tutorial_final: 'final_boss',

    // Horde encounter — treated as a miniboss-tier martial track
    sovereign_army_reserve: 'miniboss_a',
  };
  const DEFAULT_MUSIC_KEY = 'hub_living';

  // Miniboss id (area.miniboss / area.js) -> music track key. Each named
  // miniboss now gets its own unique CC0/CC-BY theme (see CREDITS.md) rather
  // than sharing one of the old two intensity tiers — miniboss_a/miniboss_b
  // survive only as the horde track for sovereign_army_reserve (AREA_MUSIC_MAP
  // above), which isn't a single named miniboss.
  const BOSS_MUSIC_MAP = {
    colossus_core: 'boss_crag_warden',           // Crag of the Colossus — Crag Warden
    hollow_guardian: 'boss_mirror_king',          // Mirror Veil — The Mirror King
    timeline_keeper: 'boss_timeline_crossroads',  // Timeline Crossroads — unnamed scientist miniboss
    chrono_ally: 'boss_temporal_warden',          // Chrono-Space Rift — Temporal Warden
    polar_guardian: 'boss_electromagnetic_golem', // The Polar Shift — Electromagnetic Golem
    static_guardian: 'boss_conduit',              // Static Field — The Conduit
    abyss_guardian: 'boss_quantum_pursuer',        // Echoing Abyss — Quantum Pursuer
    horizon_core: 'boss_gravity_collapse_core',   // Event Horizon — Gravity Collapse Core
    warp_guardian: 'boss_warden_hollow',          // Warp Gate Nexus — Warden & Hollow (duo)
    graviton_sentinel: 'boss_graviton_guard',     // Graviton Core — Fractured Sovereign's Guard
    paradox_engine: 'boss_assembler',             // Paradox Engine — The Assembler
    sovereign: 'final_boss', // the Boss class (boss.js) — final Sovereign fight
    void_expanse_boss: 'boss_void_expanse',       // Void Expanse — The Undertow
    antechamber_child: 'boss_antechamber_child',  // The Antechamber — The Child
    abandoned_shell: 'boss_abandoned_shell',      // Hollow Core — Abandoned Shell
  };

  let musicGainNode = null;     // region/hub track gain
  let bossMusicGainNode = null; // boss/miniboss track gain (layered on top, louder)
  let musicSource = null;
  let bossMusicSource = null;
  let currentMusicKey = null;
  let currentBossMusicKey = null;
  let zoneOverrideKey = null; // MUSIC_URLS key from an area.audioZones[] zone the player is
                              // currently standing in, or null — see setAudioZone() below.
  const MUSIC_CROSSFADE = 2.0; // seconds, matches the drone's own ramp style

  function loadMusic() {
    const c = ctx;
    if (!c) return;
    Object.keys(MUSIC_URLS).forEach((key) => {
      if (musicBuffers[key]) return;
      fetch(MUSIC_URLS[key])
        .then((res) => res.arrayBuffer())
        .then((data) => c.decodeAudioData(data))
        .then((buf) => { musicBuffers[key] = buf; })
        .catch(() => { /* region just stays silent on the music layer if this fails */ });
    });
  }

  function ensureMusicGains() {
    const c = ctx;
    if (!c || musicGainNode) return;
    musicGainNode = c.createGain();
    musicGainNode.gain.value = 0;
    musicGainNode.connect(musicBus);
    bossMusicGainNode = c.createGain();
    bossMusicGainNode.gain.value = 0;
    bossMusicGainNode.connect(musicBus);
  }

  // Starts a looping BufferSource on the given gain node, crossfading out
  // whatever was already playing there. `targetVolume` lets boss tracks run
  // a bit hotter than region ambience without touching the master chain.
  function playLoopingTrack(key, gainNode, prevSourceRef, targetVolume) {
    const c = ensureCtx();
    if (!c || !key || !musicBuffers[key]) return null;
    const src = c.createBufferSource();
    src.buffer = musicBuffers[key];
    src.loop = true;
    const g = c.createGain();
    g.gain.value = 0;
    src.connect(g);
    g.connect(gainNode);
    const t = c.currentTime;
    g.gain.linearRampToValueAtTime(targetVolume, t + MUSIC_CROSSFADE);
    src.start();
    if (prevSourceRef && prevSourceRef.gainNode) {
      prevSourceRef.gainNode.gain.cancelScheduledValues(t);
      prevSourceRef.gainNode.gain.linearRampToValueAtTime(0, t + MUSIC_CROSSFADE);
      const staleSrc = prevSourceRef.src;
      setTimeout(() => { try { staleSrc.stop(); } catch (e) { /* already stopped */ } }, (MUSIC_CROSSFADE + 0.2) * 1000);
    }
    return { src, gainNode: g };
  }

  // Region/hub music track, keyed by area.js area id. Lives on its own music
  // bus/compressor (see top of file) so one-shot SFX on the sfx bus never
  // duck or gate it, no matter how many overlap in a frame.
  function setRegionMusic(areaId) {
    if (!unlocked) return;
    const key = AREA_MUSIC_MAP[areaId] || DEFAULT_MUSIC_KEY;
    if (key === currentMusicKey) return;
    currentMusicKey = key;
    const c = ensureCtx();
    if (!c) return;
    ensureMusicGains();
    if (!musicBuffers[key]) return; // still loading — next call once it lands will pick it up
    musicSource = playLoopingTrack(key, musicGainNode, musicSource, 0.35);
  }

  // Sub-room ambient override — area.audioZones[] (room_scene_editor.html)
  // lets part of a room play a different track than the rest (e.g. a quiet
  // corner of an otherwise-hub_living room). Call every frame with the
  // MUSIC_URLS key of whichever zone the player is currently standing in
  // (or null if none), plus the room's own area id as the fallback to
  // revert to. Reuses setRegionMusic's own gain node/crossfade — a zone is
  // just "temporarily pretend the room's music key is this instead."
  function setAudioZone(trackKey, fallbackAreaId) {
    if (!unlocked) return;
    const key = trackKey || null;
    if (key === zoneOverrideKey) return;
    zoneOverrideKey = key;
    const c = ensureCtx();
    if (!c) return;
    ensureMusicGains();
    const effectiveKey = key || (AREA_MUSIC_MAP[fallbackAreaId] || DEFAULT_MUSIC_KEY);
    if (effectiveKey === currentMusicKey) return; // already playing (zone track matches room track)
    if (!musicBuffers[effectiveKey]) return; // still loading
    currentMusicKey = effectiveKey;
    musicSource = playLoopingTrack(effectiveKey, musicGainNode, musicSource, 0.35);
  }

  // Editor-only accessor (room_scene_editor.html's audio-zone track-key
  // dropdown) — same purpose as exposing the real CUTSCENES object for the
  // cutscene-trigger id autocomplete, just for music track keys instead.
  function getMusicKeys() {
    return Object.keys(MUSIC_URLS);
  }

  // Boss/miniboss track, layered on top of (louder than) the region track —
  // call at fight start with the miniboss id (or 'sovereign' for the final
  // boss) and again with null when the fight ends to fall back to region music.
  function setBossMusic(bossKey) {
    if (!unlocked) return;
    const key = bossKey ? (BOSS_MUSIC_MAP[bossKey] || null) : null;
    if (key === currentBossMusicKey) return;
    currentBossMusicKey = key;
    const c = ensureCtx();
    if (!c) return;
    ensureMusicGains();
    if (key && !musicBuffers[key]) return;
    if (!key) {
      // Fade out boss track, let region music alone carry on.
      if (bossMusicSource && bossMusicSource.gainNode) {
        const t = c.currentTime;
        bossMusicSource.gainNode.gain.cancelScheduledValues(t);
        bossMusicSource.gainNode.gain.linearRampToValueAtTime(0, t + MUSIC_CROSSFADE);
        const staleSrc = bossMusicSource.src;
        setTimeout(() => { try { staleSrc.stop(); } catch (e) { /* already stopped */ } }, (MUSIC_CROSSFADE + 0.2) * 1000);
      }
      bossMusicSource = null;
      // Bring region music back up to its normal level.
      if (musicGainNode) {
        const t = c.currentTime;
        musicGainNode.gain.cancelScheduledValues(t);
        musicGainNode.gain.linearRampToValueAtTime(0.35, t + MUSIC_CROSSFADE);
      }
      return;
    }
    bossMusicSource = playLoopingTrack(key, bossMusicGainNode, bossMusicSource, 0.42);
    // Duck region music (and drone) under the boss track rather than cutting it dead.
    if (musicGainNode) {
      const t = c.currentTime;
      musicGainNode.gain.cancelScheduledValues(t);
      musicGainNode.gain.linearRampToValueAtTime(0.12, t + MUSIC_CROSSFADE);
    }
  }

  function loadSamples() {
    const c = ctx;
    if (!c) return;
    Object.keys(SAMPLE_URLS).forEach((name) => {
      if (sampleBuffers[name]) return;
      const urls = Array.isArray(SAMPLE_URLS[name]) ? SAMPLE_URLS[name] : [SAMPLE_URLS[name]];
      const isArray = Array.isArray(SAMPLE_URLS[name]);
      const loaded = []; // sparse-safe: only fully-decoded variants get used
      urls.forEach((url, i) => {
        fetch(url)
          .then((res) => res.arrayBuffer())
          .then((data) => c.decodeAudioData(data))
          .then((buf) => {
            loaded[i] = buf;
            sampleBuffers[name] = isArray ? loaded.filter(Boolean) : buf;
          })
          .catch(() => { /* leave this variant unset — round-robin skips it */ });
      });
    });
  }

  // Plays a decoded sample with a per-call gain (and slight pitch jitter for
  // variety), through the same master -> compressor safety chain as everything
  // else. Returns true if it actually played, so callers can fall back.
  function playSample(name, volume, pitchVariance, pitchCenter) {
    const c = ctx;
    const entry = sampleBuffers[name];
    if (!c || !ready() || !entry) return false;
    // Round-robin: an array (attack/heavyAttack/parry) picks a random loaded
    // variant each call instead of always the same buffer, so repeated hits
    // don't sound identical. A plain buffer (every other slot) is unchanged.
    const buf = Array.isArray(entry) ? entry[Math.floor(Math.random() * entry.length)] : entry;
    if (!buf) return false;
    const src = c.createBufferSource();
    src.buffer = buf;
    // pitchCenter shifts the base rate before jitter — e.g. voidTetherHit()
    // uses it so a bigger target genuinely plays lower, not just "randomly
    // different" (pitchVariance alone is symmetric jitter, no directional bias).
    src.playbackRate.value = jitter(pitchCenter !== undefined ? pitchCenter : 1, pitchVariance !== undefined ? pitchVariance : 0.03);
    const gain = c.createGain();
    gain.gain.value = Math.min(0.5, volume !== undefined ? volume : 0.3);
    src.connect(gain);
    gain.connect(sfxBus);
    src.start();
    return true;
  }

  function ensureCtx() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();

      musicCompressor = ctx.createDynamicsCompressor();
      musicCompressor.threshold.value = -18;
      musicCompressor.knee.value = 24;
      musicCompressor.ratio.value = 6;
      musicCompressor.attack.value = 0.003;
      musicCompressor.release.value = 0.25;
      musicCompressor.connect(ctx.destination);

      sfxCompressor = ctx.createDynamicsCompressor();
      sfxCompressor.threshold.value = -18;
      sfxCompressor.knee.value = 24;
      sfxCompressor.ratio.value = 6;
      sfxCompressor.attack.value = 0.003;
      sfxCompressor.release.value = 0.25;
      sfxCompressor.connect(ctx.destination);

      musicBus = ctx.createGain();
      musicBus.gain.value = BASE_LEVEL * musicVolumeMultiplier;
      musicBus.connect(musicCompressor);

      sfxBus = ctx.createGain();
      sfxBus.gain.value = BASE_LEVEL * sfxVolumeMultiplier;
      sfxBus.connect(sfxCompressor);
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function init() {
    const c = ensureCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    if (!unlocked) {
      unlocked = true;
      loadSamples();
      loadMusic();
    }
  }

  // Independent Music/SFX volume controls, each 0..1. Ramped to avoid clicks.
  // Safe to call before ctx exists (e.g. applying saved settings on boot,
  // before the first user-gesture unlock) — the multiplier is remembered
  // and applied to the bus once ensureCtx() creates it.
  function setMusicVolume(v) {
    musicVolumeMultiplier = Math.max(0, Math.min(1, v));
    const c = ctx;
    if (!c || !musicBus) return;
    const t = c.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.linearRampToValueAtTime(BASE_LEVEL * musicVolumeMultiplier, t + 0.05);
  }

  function setSfxVolume(v) {
    sfxVolumeMultiplier = Math.max(0, Math.min(1, v));
    const c = ctx;
    if (!c || !sfxBus) return;
    const t = c.currentTime;
    sfxBus.gain.cancelScheduledValues(t);
    sfxBus.gain.linearRampToValueAtTime(BASE_LEVEL * sfxVolumeMultiplier, t + 0.05);
  }

  function ready() {
    return !!(ctx && unlocked && sfxBus);
  }

  // Small helper: randomize a value by +/- percent for per-call variety.
  function jitter(value, percent) {
    return value * (1 + (Math.random() * 2 - 1) * percent);
  }

  // --- low-level synth helpers ---
  // Clamps gain envelopes to sane values and always ramps to/from silence
  // (never a hard jump) so nothing clicks or pops.
  function tone(freq, duration, opts) {
    const c = ensureCtx();
    if (!c || !ready()) return;
    opts = opts || {};
    const t0 = c.currentTime;
    const detune = opts.detune !== undefined ? opts.detune : (Math.random() * 10 - 5);
    const f = jitter(freq, opts.pitchVariance !== undefined ? opts.pitchVariance : 0.02);

    const osc = c.createOscillator();
    osc.type = opts.type || 'sine';
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(f, t0);
    if (opts.sweepTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.sweepTo), t0 + duration);
    }

    // Optional gentle low-pass to soften harsh waveforms (sawtooth/square).
    let node = osc;
    if (opts.filterFreq) {
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = opts.filterFreq;
      filter.Q.value = opts.filterQ !== undefined ? opts.filterQ : 0.7;
      osc.connect(filter);
      node = filter;
    }

    const gain = c.createGain();
    const vol = Math.min(0.4, opts.volume !== undefined ? opts.volume : 0.2);
    const attack = opts.attack !== undefined ? opts.attack : 0.01;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    node.connect(gain);
    gain.connect(sfxBus);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  // Filtered noise burst, used for impacts/whooshes. Envelope always ramps
  // from and to near-silence, so it never clicks even when cut short.
  function noiseBurst(duration, opts) {
    const c = ensureCtx();
    if (!c || !ready()) return;
    opts = opts || {};
    const t0 = c.currentTime;
    const bufferSize = Math.max(1, Math.floor(c.sampleRate * duration));
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Linear fade-out baked into the buffer prevents any trailing click.
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = c.createBufferSource();
    src.buffer = buffer;

    const filter = c.createBiquadFilter();
    filter.type = opts.filterType || 'lowpass';
    filter.frequency.value = jitter(opts.filterFreq || 2000, 0.08);
    filter.Q.value = opts.filterQ !== undefined ? opts.filterQ : 0.9;

    const gain = c.createGain();
    const vol = Math.min(0.35, opts.volume !== undefined ? opts.volume : 0.2);
    const attack = opts.attack !== undefined ? opts.attack : 0.004;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(sfxBus);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }

  // Sub-bass "weight" layer for heavy hits — a very short, very low sine
  // with a near-instant attack, meant to be layered UNDER an existing
  // sample/tone (not played alone). Adds felt punch without a new recorded
  // asset: most speakers barely reproduce 45-60Hz as a distinct pitch, so
  // it reads as a thump rather than a tone. Call alongside (same frame as)
  // whatever sets hitstopTimer for a given hit, so the transient and the
  // freeze-frame land together.
  function subThump(volume) {
    const c = ensureCtx();
    if (!c || !ready()) return;
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    osc.type = 'sine';
    const f = jitter(50, 0.1);
    osc.frequency.setValueAtTime(f, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f * 0.6), t0 + 0.09);

    const gain = c.createGain();
    const vol = Math.min(0.3, volume !== undefined ? volume : 0.18);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.003); // near-instant attack
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);

    osc.connect(gain);
    gain.connect(sfxBus);
    osc.start(t0);
    osc.stop(t0 + 0.12);
  }

  // Called on spawn/area-transition to switch the recorded region track.
  // No procedural ambient bed anymore — recorded music (setRegionMusic) is
  // the only ambience layer now.
  function setAreaAmbient(areaId) {
    if (areaId === currentAreaId) return;
    if (!unlocked) return;
    currentAreaId = areaId;
    setRegionMusic(areaId);
  }

  return {
    init,
    setAreaAmbient,
    setRegionMusic,
    setBossMusic,
    setAudioZone,
    getMusicKeys,
    setMusicVolume,
    setSfxVolume,

    jump() { tone(420, 0.12, { type: 'sine', sweepTo: 620, volume: 0.16, filterFreq: 3000 }); },
    land() { noiseBurst(0.08, { filterFreq: 500, volume: 0.14 }); },
    dash() {
      noiseBurst(0.15, { filterFreq: 3000, volume: 0.14 });
      tone(200, 0.12, { type: 'sawtooth', sweepTo: 60, volume: 0.1, filterFreq: 1200 });
    },
    phaseDash() {
      if (playSample('phaseDash', 0.28)) return;
      noiseBurst(0.2, { filterFreq: 4000, volume: 0.16 });
      tone(800, 0.2, { type: 'sine', sweepTo: 200, volume: 0.12 });
    },
    // Void Tether's three stages — cast (latch), pull (sustained travel),
    // hit (arrival). See game_update.js's `player.voidTetherFired` block for
    // where each fires. `sizeFactor` (0..1, default 0.5) lets the arrival hit
    // read heavier for a big target and lighter for a small one — see
    // voidTetherHit()'s call site for how it's derived from target dimensions.
    voidTetherCast() {
      if (playSample('voidTetherCast', 0.24)) return;
      tone(700, 0.1, { type: 'sine', sweepTo: 1400, volume: 0.14, attack: 0.005 });
      noiseBurst(0.06, { filterType: 'highpass', filterFreq: 3500, volume: 0.1 });
    },
    voidTetherPull() {
      if (playSample('voidTetherPull', 0.16)) return;
      noiseBurst(0.5, { filterFreq: 1800, volume: 0.1, attack: 0.05 });
      tone(200, 0.5, { type: 'sawtooth', sweepTo: 500, volume: 0.08, filterFreq: 1200, attack: 0.05 });
    },
    voidTetherHit(sizeFactor) {
      const sf = sizeFactor !== undefined ? Math.max(0, Math.min(1, sizeFactor)) : 0.5;
      // Bigger target (sf near 1) = lower pitch + more sub-thump weight;
      // smaller (sf near 0) = higher/lighter. pitchCenter ranges ~1.25 (small)
      // down to ~0.75 (large) around the sample's natural pitch.
      const pitchCenter = 1.25 - sf * 0.5;
      subThump(0.1 + sf * 0.14);
      if (playSample('voidTetherHit', 0.2 + sf * 0.08, 0.03, pitchCenter)) return;
      tone(500 - sf * 260, 0.12, { type: 'triangle', sweepTo: 120 - sf * 60, volume: 0.16, filterFreq: 1400, attack: 0.004 });
      noiseBurst(0.1, { filterFreq: 1500 - sf * 700, volume: 0.14, attack: 0.003 });
    },
    attack() {
      if (playSample('attack', 0.22)) return;
      tone(180, 0.08, { type: 'triangle', sweepTo: 90, volume: 0.16, filterFreq: 1500 });
    },
    heavyAttack() {
      subThump(0.16); // felt weight under the sample or the procedural fallback either way
      if (playSample('heavyAttack', 0.32)) return;
      tone(100, 0.15, { type: 'sawtooth', sweepTo: 40, volume: 0.22, filterFreq: 900, attack: 0.006 });
      noiseBurst(0.12, { filterFreq: 800, volume: 0.2, attack: 0.003 });
    },
    chargeFull() {
      if (playSample('chargedAttack', 0.26)) return;
      tone(440, 0.12, { type: 'sine', sweepTo: 880, volume: 0.14 });
    },
    attackHit() {
      if (playSample('attackHit', 0.3)) return;
      noiseBurst(0.1, { filterFreq: 1200, volume: 0.2 });
      tone(120, 0.08, { type: 'triangle', sweepTo: 40, volume: 0.14, filterFreq: 1000 });
    },
    playerHurt() {
      if (playSample('playerHurt', 0.32)) return;
      tone(220, 0.25, { type: 'sawtooth', sweepTo: 80, volume: 0.18, filterFreq: 1100 });
    },
    parry() {
      if (playSample('parry', 0.3)) return;
      tone(880, 0.15, { type: 'sine', sweepTo: 1760, volume: 0.2 });
      noiseBurst(0.1, { filterType: 'highpass', filterFreq: 4000, volume: 0.12 });
    },
    shardShot() { tone(900, 0.1, { type: 'sine', sweepTo: 1400, volume: 0.12 }); },
    shardHit() {
      if (playSample('shardHit', 0.26)) return;
      noiseBurst(0.08, { filterFreq: 2500, volume: 0.14 });
    },
    enemyDeath() {
      if (playSample('enemyDeath', 0.3)) return;
      noiseBurst(0.2, { filterFreq: 1500, volume: 0.18 });
      tone(300, 0.2, { type: 'sawtooth', sweepTo: 50, volume: 0.14, filterFreq: 1000 });
    },
    fractureGain() { tone(880, 0.12, { type: 'sine', sweepTo: 1100, volume: 0.1 }); },
    stillpointActivate() {
      if (playSample('stillpoint', 0.3)) return;
      tone(440, 0.8, { type: 'sine', sweepTo: 880, volume: 0.16, attack: 0.05 });
      noiseBurst(0.3, { filterType: 'bandpass', filterFreq: 3000, volume: 0.08 });
    },
    stillpointEnd() { tone(220, 0.3, { type: 'sine', sweepTo: 110, volume: 0.12 }); },
    stillpoint() { tone(660, 0.5, { type: 'sine', sweepTo: 1320, volume: 0.16, attack: 0.03 }); }, // checkpoint ping
    abilityPickup() {
      tone(440, 0.4, { type: 'sine', sweepTo: 880, volume: 0.18, attack: 0.02 });
      setTimeout(() => tone(660, 0.4, { type: 'sine', sweepTo: 1320, volume: 0.15, attack: 0.02 }), 90);
    },
    lorePickup() { tone(300, 0.6, { type: 'sine', sweepTo: 500, volume: 0.12, attack: 0.03 }); },
    bossHit() {
      // Also the impact for Charged Heavy (see bossTelegraphSlam) and every
      // boss/miniboss's landed attack — the sub-thump gives every one of
      // those a consistent felt weight regardless of source.
      subThump(0.14);
      if (playSample('bossHit', 0.3)) return;
      noiseBurst(0.1, { filterFreq: 1800, volume: 0.18, attack: 0.003 });
    },
    wallJump() {
      tone(500, 0.1, { type: 'sine', sweepTo: 750, volume: 0.13, filterFreq: 2500 });
      noiseBurst(0.08, { filterFreq: 2500, volume: 0.1 });
    },
    wallSlide() { noiseBurst(0.04, { filterFreq: 600, volume: 0.05 }); },
    bossPhase() {
      tone(80, 1.0, { type: 'sawtooth', sweepTo: 40, volume: 0.24, filterFreq: 700, attack: 0.05 });
      noiseBurst(0.6, { filterFreq: 2000, volume: 0.16 });
    },
    bossDeath() {
      subThump(0.2);
      tone(100, 1.5, { type: 'sawtooth', sweepTo: 20, volume: 0.24, filterFreq: 700, attack: 0.08 });
      noiseBurst(1.0, { filterFreq: 1500, volume: 0.18 });
    },
    uiSelect() {
      if (playSample('uiSelect', 0.22, 0.01)) return;
      tone(500, 0.08, { type: 'triangle', volume: 0.12, filterFreq: 3000 });
    },

    // Scavenged war weapons (2026-07-26) — gun/taser/net share this
    // sample-with-procedural-fallback pattern; flamethrower/bombExplode are
    // one-shot triggers (ignite whoosh / detonation), same convention.
    gunShot() {
      if (playSample('gunShot', 0.2, 0.03)) return;
      noiseBurst(0.05, { filterFreq: 3500, volume: 0.16 });
      tone(150, 0.06, { type: 'square', sweepTo: 60, volume: 0.14, filterFreq: 1800 });
    },
    taserZap() {
      if (playSample('taserZap', 0.24, 0.05)) return;
      noiseBurst(0.15, { filterType: 'highpass', filterFreq: 5000, volume: 0.18 });
      tone(1400, 0.12, { type: 'sawtooth', sweepTo: 300, volume: 0.14, filterFreq: 3000 });
    },
    flamethrower() {
      if (playSample('flamethrower', 0.22)) return;
      noiseBurst(0.4, { filterFreq: 900, volume: 0.16 });
      tone(140, 0.3, { type: 'sawtooth', sweepTo: 90, volume: 0.12, filterFreq: 700 });
    },
    bombExplode() {
      subThump(0.22);
      if (playSample('bombExplode', 0.32)) return;
      noiseBurst(0.5, { filterFreq: 1200, volume: 0.22, attack: 0.003 });
      tone(90, 0.6, { type: 'sawtooth', sweepTo: 30, volume: 0.2, filterFreq: 600, attack: 0.008 });
    },

    // --- telegraphs: the audible "tell" before an enemy/boss attack lands,
    // played once at the moment the windup/telegraph state is entered (not
    // repeated per frame). Kept short and quiet relative to hits/impacts so
    // a room full of enemies winding up at once doesn't wall-of-noise.
    enemyTelegraph() {
      tone(260, 0.18, { type: 'triangle', sweepTo: 420, volume: 0.09, filterFreq: 1400, attack: 0.03 });
    },
    enemyTelegraphHeavy() {
      tone(140, 0.35, { type: 'sawtooth', sweepTo: 260, volume: 0.15, filterFreq: 900, attack: 0.05 });
      noiseBurst(0.2, { filterFreq: 700, volume: 0.08, attack: 0.03 });
    },
    enemyHop() { tone(300, 0.08, { type: 'sine', sweepTo: 450, volume: 0.08 }); },
    bossTelegraph() {
      tone(200, 0.3, { type: 'triangle', sweepTo: 320, volume: 0.14, filterFreq: 1200, attack: 0.04 });
    },
    bossTelegraphHeavy() {
      tone(90, 0.55, { type: 'sawtooth', sweepTo: 200, volume: 0.2, filterFreq: 800, attack: 0.08 });
      noiseBurst(0.4, { filterFreq: 600, volume: 0.12, attack: 0.05 });
    },
    // --- per-attack-type boss telegraphs, each with a distinct sonic shape
    // hinting at what's coming, replacing the two generic calls above for
    // boss.js's start*() methods (bossTelegraph()/bossTelegraphHeavy() stay
    // defined above for any other/legacy callers, but boss.js no longer
    // calls them directly).
    bossTelegraphCharge() {
      // Driving rising rumble — a low sawtooth sweeping steadily upward,
      // like an engine winding up before a dash.
      tone(70, 0.5, { type: 'sawtooth', sweepTo: 260, volume: 0.2, filterFreq: 1000, attack: 0.05 });
      noiseBurst(0.35, { filterFreq: 900, volume: 0.09, attack: 0.08 });
    },
    bossTelegraphSlam() {
      // Falling/impact-anticipating low tone — pitch drops as if gathering
      // weight before crashing down.
      tone(260, 0.4, { type: 'sawtooth', sweepTo: 60, volume: 0.22, filterFreq: 700, attack: 0.02 });
      noiseBurst(0.3, { filterFreq: 500, volume: 0.14, attack: 0.15 });
    },
    bossTelegraphBarrage() {
      // Multiple quick ticks hinting at a volley of projectiles about to fire.
      for (let i = 0; i < 5; i++) {
        setTimeout(() => tone(500, 0.06, { type: 'square', sweepTo: 650, volume: 0.11, filterFreq: 2200, attack: 0.005 }), i * 60);
      }
    },
    bossTelegraphTriple() {
      // Three quick ticks — same shape as the barrage tick but fewer/slower,
      // reading as "three" rather than "many".
      for (let i = 0; i < 3; i++) {
        setTimeout(() => tone(420, 0.08, { type: 'square', sweepTo: 560, volume: 0.13, filterFreq: 2000, attack: 0.006 }), i * 110);
      }
    },
    bossTelegraphNova() {
      // Swelling radial/rising texture — a slow upward sweep plus a growing
      // bandpass noise swell, like pressure building outward before release.
      tone(150, 0.7, { type: 'sine', sweepTo: 900, volume: 0.16, attack: 0.15 });
      noiseBurst(0.65, { filterType: 'bandpass', filterFreq: 1200, volume: 0.14, attack: 0.2 });
    },
    bossTelegraphUltimate() {
      // The biggest/longest/most ominous tell — a long low rumble under a
      // slow rising tone, longer and heavier than every other telegraph.
      tone(55, 1.1, { type: 'sawtooth', sweepTo: 180, volume: 0.24, filterFreq: 650, attack: 0.15 });
      tone(660, 1.0, { type: 'sine', sweepTo: 1320, volume: 0.1, attack: 0.3 });
      noiseBurst(0.9, { filterFreq: 500, volume: 0.16, attack: 0.2 });
    },
    bossTeleportOut() {
      tone(700, 0.2, { type: 'sine', sweepTo: 1600, volume: 0.12, attack: 0.01 });
      noiseBurst(0.15, { filterType: 'highpass', filterFreq: 3500, volume: 0.08 });
    },

    // The Sovereign's own Phase 3 Stillpoint (2026-07-26) — lower/harsher
    // mirrors of the player's own stillpointActivate()/stillpointEnd(),
    // reading as a corrupted, weightier version of the same ability.
    bossStillpointStart() {
      tone(220, 1.0, { type: 'sine', sweepTo: 440, volume: 0.2, attack: 0.08 });
      noiseBurst(0.5, { filterType: 'bandpass', filterFreq: 1200, volume: 0.14 });
    },
    bossStillpointEnd() { tone(160, 0.4, { type: 'sawtooth', sweepTo: 60, volume: 0.16 }); },
  };
})();
