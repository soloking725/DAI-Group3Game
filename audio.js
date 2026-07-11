// Procedural sound design — synthesized entirely via Web Audio API, no audio files.
// Browsers block audio until a user gesture, so SFX.init() must be called from a
// click/keydown handler (game.js calls it when the player starts the game).
const SFX = (() => {
  let ctx = null;
  let master = null;
  let droneOsc1 = null, droneOsc2 = null, droneFilter = null, droneGain = null;
  let currentAreaId = null;
  let unlocked = false;

  function ensureCtx() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function init() {
    if (unlocked) return;
    const c = ensureCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    unlocked = true;
    startDrone();
  }

  // --- low-level synth helpers ---
  function tone(freq, duration, opts) {
    const c = ensureCtx();
    if (!c || !unlocked) return;
    opts = opts || {};
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (opts.sweepTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.sweepTo), c.currentTime + duration);
    }
    const vol = opts.volume !== undefined ? opts.volume : 0.3;
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(vol, c.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(c.currentTime + duration + 0.03);
  }

  function noiseBurst(duration, opts) {
    const c = ensureCtx();
    if (!c || !unlocked) return;
    opts = opts || {};
    const bufferSize = Math.max(1, Math.floor(c.sampleRate * duration));
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = opts.filterType || 'lowpass';
    filter.frequency.value = opts.filterFreq || 2000;
    const gain = c.createGain();
    gain.gain.setValueAtTime(opts.volume !== undefined ? opts.volume : 0.25, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  // --- ambient drone, shifts per area ---
  function startDrone() {
    const c = ensureCtx();
    if (!c) return;
    droneOsc1 = c.createOscillator();
    droneOsc2 = c.createOscillator();
    droneFilter = c.createBiquadFilter();
    droneGain = c.createGain();
    droneOsc1.type = 'sine';
    droneOsc2.type = 'triangle';
    droneOsc1.frequency.value = 60;
    droneOsc2.frequency.value = 90.3;
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 400;
    droneGain.gain.value = 0.06;
    droneOsc1.connect(droneFilter);
    droneOsc2.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(master);
    droneOsc1.start();
    droneOsc2.start();
  }

  // Deterministic hash from area id -> stable per-area tone
  function areaHash(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h;
  }

  function setAreaAmbient(areaId) {
    if (areaId === currentAreaId) return;
    currentAreaId = areaId;
    if (!unlocked || !droneOsc1) return;
    const h = areaHash(areaId);
    const base = 48 + (h % 40); // 48-88 Hz drone root
    const c = ensureCtx();
    const t = c.currentTime;
    droneOsc1.frequency.cancelScheduledValues(t);
    droneOsc1.frequency.linearRampToValueAtTime(base, t + 2);
    droneOsc2.frequency.cancelScheduledValues(t);
    droneOsc2.frequency.linearRampToValueAtTime(base * 1.5 + 2, t + 2);
    const cutoff = 250 + ((h >> 3) % 500);
    droneFilter.frequency.cancelScheduledValues(t);
    droneFilter.frequency.linearRampToValueAtTime(cutoff, t + 2);
  }

  return {
    init,
    setAreaAmbient,
    jump() { tone(420, 0.12, { type: 'square', sweepTo: 620, volume: 0.18 }); },
    land() { noiseBurst(0.08, { filterFreq: 500, volume: 0.2 }); },
    dash() { noiseBurst(0.15, { filterFreq: 3000, volume: 0.2 }); tone(200, 0.12, { type: 'sawtooth', sweepTo: 60, volume: 0.12 }); },
    phaseDash() { noiseBurst(0.2, { filterFreq: 4000, volume: 0.25 }); tone(800, 0.2, { type: 'sine', sweepTo: 200, volume: 0.15 }); },
    attack() { tone(180, 0.08, { type: 'square', sweepTo: 90, volume: 0.2 }); },
    heavyAttack() {
      tone(100, 0.15, { type: 'sawtooth', sweepTo: 40, volume: 0.3 });
      noiseBurst(0.12, { filterFreq: 800, volume: 0.35 });
    },
    chargeFull() { tone(440, 0.12, { type: 'sine', sweepTo: 880, volume: 0.15 }); },
    attackHit() { noiseBurst(0.1, { filterFreq: 1200, volume: 0.3 }); tone(120, 0.08, { type: 'square', sweepTo: 40, volume: 0.2 }); },
    playerHurt() { tone(220, 0.25, { type: 'sawtooth', sweepTo: 80, volume: 0.25 }); },
    parry() {
      tone(880, 0.15, { type: 'sine', sweepTo: 1760, volume: 0.28 });
      noiseBurst(0.1, { filterFreq: 5000, volume: 0.2 });
    },
    shardShot() { tone(900, 0.1, { type: 'sine', sweepTo: 1400, volume: 0.15 }); },
    shardHit() { noiseBurst(0.08, { filterFreq: 2500, volume: 0.2 }); },
    enemyDeath() { noiseBurst(0.2, { filterFreq: 1500, volume: 0.25 }); tone(300, 0.2, { type: 'sawtooth', sweepTo: 50, volume: 0.18 }); },
    fractureGain() { tone(880, 0.12, { type: 'sine', sweepTo: 1100, volume: 0.12 }); },
    stillpointActivate() {
      tone(440, 0.8, { type: 'sine', sweepTo: 880, volume: 0.18 });
      noiseBurst(0.3, { filterType: 'bandpass', filterFreq: 3000, volume: 0.1 });
    },
    stillpointEnd() { tone(220, 0.3, { type: 'sine', sweepTo: 110, volume: 0.15 }); },
    stillpoint() { tone(660, 0.5, { type: 'sine', sweepTo: 1320, volume: 0.2 }); }, // checkpoint ping
    abilityPickup() {
      tone(440, 0.4, { type: 'sine', sweepTo: 880, volume: 0.22 });
      setTimeout(() => tone(660, 0.4, { type: 'sine', sweepTo: 1320, volume: 0.18 }), 90);
    },
    lorePickup() { tone(300, 0.6, { type: 'sine', sweepTo: 500, volume: 0.15 }); },
    bossHit() { noiseBurst(0.1, { filterFreq: 1800, volume: 0.25 }); },
    wallJump() {
      tone(500, 0.1, { type: 'square', sweepTo: 750, volume: 0.15 });
      noiseBurst(0.08, { filterFreq: 2500, volume: 0.12 });
    },
    wallSlide() { noiseBurst(0.04, { filterFreq: 600, volume: 0.06 }); },
    bossPhase() { tone(80, 1.0, { type: 'sawtooth', sweepTo: 40, volume: 0.3 }); noiseBurst(0.6, { filterFreq: 2000, volume: 0.2 }); },
    bossDeath() { tone(100, 1.5, { type: 'sawtooth', sweepTo: 20, volume: 0.3 }); noiseBurst(1.0, { filterFreq: 1500, volume: 0.25 }); },
    uiSelect() { tone(500, 0.08, { type: 'square', volume: 0.15 }); },
  };
})();