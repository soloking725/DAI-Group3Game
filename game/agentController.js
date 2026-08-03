// Difficulty-scoring bot — evolves a small neural net to play the real game
// against a chosen enemy/boss roster inside the bounded `bot_arena` room
// (game/area.js), producing a quantitative difficulty score instead of a
// guess. Loaded only by editor/difficulty_bot.html, never by index.html.
//
// Non-module <script> tag, same as every other game/*.js file — reads and
// writes the real top-level `let`/`const` globals (player, areaEnemies,
// boss, miniboss, keys, justPressed, update, draw, abilityState,
// statUpgrades) directly, the same shared-scope pattern editor/enemy_test.html
// already relies on. No engine changes, no mock layer.
//
// Fast-forward works by taking over the game's own frame pump: game.js's
// gameLoop is normally driven by requestAnimationFrame at real wall-clock
// speed (game/game.js's "Main loop" section). editor/difficulty_bot.html
// stubs window.requestAnimationFrame to a no-op *before* loading game.js,
// so game.js's self-starting `requestAnimationFrame(gameLoop)` call at the
// bottom of the file never actually fires — nothing free-runs in the
// background. This controller then calls the real global `update()` (and,
// only when replaying, `draw()`) directly in a plain loop, as many times
// per real millisecond as the JS engine allows.
(function () {
  const ARENA_ID = 'bot_arena';
  const NEAREST_SLOTS = 3; // was 2 — bumped per user report ("can't handle multiple fractured"); see buildInputs()
  // 19 base inputs (10 general + 6 hold/charge-state + 1 heavy-required flag
  // + 2 boss-phase-awareness, see buildInputs()) + 3 nearest-target blocks
  // of 8 = 43. Fixed size so the net's weight shape never has to change;
  // roster composition varies, this doesn't.
  const BASE_SIZE = 19; // was 17 — +2 boss-phase/precog-window awareness (2026-07-26), see buildInputs()
  const INPUT_SIZE = BASE_SIZE + NEAREST_SLOTS * 8;
  const HIDDEN_SIZE = 40; // was 26 — bumped alongside the aim outputs/phase inputs below for more decision capacity
  // shardShot and gravitonSurge both have real tap-vs-hold behavior in the
  // live game (see buildInputs()'s charge-state block) — both are wired as
  // ordinary hold-able outputs the same way attack/dash/stillpoint are.
  // voidTether added 2026-07-24 (user report: "do all the abilities work
  // properly?" — this one didn't, at all: it was never in this list, so
  // granting it in the loadout did nothing regardless of what the net
  // output, since there was no button for it to press). It's a plain tap
  // (wasActionJustPressed('voidTether') in player.js) with auto-targeting
  // (findVoidTetherTarget() in game.js picks the nearest valid target in
  // line of sight) — no aim/hold logic needed, so it's a simple threshold
  // output like attack/dash.
  // aimUp/aimDown (2026-07-26) — were a documented simplification ("the bot
  // always fires level/facing-direction, never an angled shot... Phase Dash
  // has the same gap"). Both are real player.js input actions
  // (isActionPressed('aimUp')/('aimDown'), input.js's ArrowUp/ArrowDown) used
  // for THREE real mechanics at once: Shard Shot's aim-then-release tilt,
  // Phase Dash/dash's 8-directional aim (getDashDirection()), and directional
  // up/down melee attacks — wiring them as two more held outputs (same
  // threshold pattern as every other action) gives the net access to all
  // three simultaneously, no separate per-mechanic output needed.
  const OUTPUT_ACTIONS = ['moveLeft', 'moveRight', 'jump', 'attack', 'dash', 'stillpoint', 'shardShot', 'gravitonSurge', 'voidTether', 'aimUp', 'aimDown'];
  const OUTPUT_SIZE = OUTPUT_ACTIONS.length;

  function randNormal() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ─── Fixed-topology feedforward net (weight-only evolution — see the
  // "Scope cut" note in Plans/difficulty_bot_and_combat_polish_plan.md for
  // why this isn't full NEAT topology evolution) ────────────────────────
  class NeuralNet {
    constructor(weights) {
      this.weights = weights || NeuralNet.randomWeights();
    }
    static get totalWeights() {
      return INPUT_SIZE * HIDDEN_SIZE + HIDDEN_SIZE + HIDDEN_SIZE * OUTPUT_SIZE + OUTPUT_SIZE;
    }
    static randomWeights() {
      const n = NeuralNet.totalWeights;
      const w = new Float32Array(n);
      for (let i = 0; i < n; i++) w[i] = randNormal() * 0.5;
      return w;
    }
    forward(inputs) {
      const w = this.weights;
      let o = 0;
      const w1 = w.subarray(o, o += INPUT_SIZE * HIDDEN_SIZE);
      const b1 = w.subarray(o, o += HIDDEN_SIZE);
      const w2 = w.subarray(o, o += HIDDEN_SIZE * OUTPUT_SIZE);
      const b2 = w.subarray(o, o += OUTPUT_SIZE);
      const hidden = new Float32Array(HIDDEN_SIZE);
      for (let h = 0; h < HIDDEN_SIZE; h++) {
        let sum = b1[h];
        for (let i = 0; i < INPUT_SIZE; i++) sum += inputs[i] * w1[h * INPUT_SIZE + i];
        hidden[h] = Math.tanh(sum);
      }
      const out = new Float32Array(OUTPUT_SIZE);
      for (let j = 0; j < OUTPUT_SIZE; j++) {
        let sum = b2[j];
        for (let h = 0; h < HIDDEN_SIZE; h++) sum += hidden[h] * w2[j * HIDDEN_SIZE + h];
        out[j] = Math.tanh(sum);
      }
      return out;
    }
  }

  // ─── Scripted baseline — not learned, a fixed reactive rule set (approach
  // if far, retreat+jump if a telegraphed hit is imminent and close, attack
  // if close and off cooldown). Not a search algorithm at all, but it's the
  // third option worth having alongside the two evolution strategies below:
  // a difficulty *floor* to sanity-check evolved results against — if this
  // dumb, un-evolved bot already clears a room, the room is probably too
  // easy regardless of what a trained genome scores. Reads the same input
  // vector buildInputs() produces, at the known nearest-target offsets.
  class ScriptedBaselinePolicy {
    forward(inputs) {
      const out = new Float32Array(OUTPUT_SIZE);
      const NEAREST = BASE_SIZE; // see buildInputs()'s layout comment
      const present = inputs[NEAREST + 7] > 0.5;
      if (!present) return out;
      const dx = inputs[NEAREST + 0]; // -1..1, positive = target is to the right
      const windingUp = inputs[NEAREST + 4] > 0.5;
      const closeRange = Math.abs(dx) < 0.06;
      const attackReady = inputs[1] < 0.05; // player.attackCooldown ratio
      if (windingUp && closeRange) {
        out[dx >= 0 ? 0 : 1] = 1; // step away from the telegraph
        out[2] = 1; // and hop
      } else if (!closeRange) {
        out[dx >= 0 ? 1 : 0] = 1; // close the distance
      } else if (attackReady) {
        out[3] = 1; // attack
      }
      return out;
    }
  }

  function randomGenome() { return { weights: NeuralNet.randomWeights(), fitness: 0, stats: null }; }
  function cloneGenome(g) { return { weights: g.weights.slice(), fitness: 0, stats: null }; }
  function mutate(genome, rate, amount) {
    const w = genome.weights;
    for (let i = 0; i < w.length; i++) if (Math.random() < rate) w[i] += randNormal() * amount;
  }
  function crossover(a, b) {
    const n = a.weights.length;
    const child = new Float32Array(n);
    for (let i = 0; i < n; i++) child[i] = Math.random() < 0.5 ? a.weights[i] : b.weights[i];
    return { weights: child, fitness: 0, stats: null };
  }

  // Per-ability config, same key/flag pairing enemy_test.html's loadout
  // panel already uses — exported below so editor/difficulty_bot.html can
  // build its UI off this single source of truth instead of a second
  // hardcoded list that could drift. Level 4 = Limit Break: the real system
  // caps normal stat levels at 3 (game.js's INVENTORY_UPGRADES table) and
  // Lv4 only exists through the separate `limitBreak.active/ability` flag,
  // one ability at a time (the real one-per-playthrough rule) — see
  // applyAbilityConfig() below for where that's actually wired up. An
  // earlier version of this file used flat "tiers" that silently wrote an
  // invalid `4` into statUpgrades with no Limit Break flag ever set, which
  // is a real bug this replaces (see roadmap.md's 2026-07-24 entries).
  const ABILITY_DEFS = [
    { key: 'strength', flag: 'hasChargedAttack', label: 'Charged Attack (Strength)' },
    { key: 'phase_dash', flag: 'hasPhaseDash', label: 'Phase Dash' },
    { key: 'shard_shot', flag: 'hasShardShot', label: 'Shard Shot' },
    { key: 'stillpoint', flag: 'hasStillpoint', label: 'Stillpoint' },
    { key: 'graviton_surge', flag: 'hasGravitonSurge', label: 'Graviton Surge' },
    { key: 'void_tether', flag: 'hasVoidTether', label: 'Void Tether' },
  ];

  class DifficultyBotEngine {
    constructor(cfg) {
      // cfg: { roster: [{type,count}], bossType: null|'boss'|'colossus_core',
      //        abilityTier: 1|2|3, populationSize, generations, maxTicks,
      //        mutationRate, mutationAmount, elitism, watchBest, watchEveryN,
      //        onGeneration(evt), onLog(msg) }
      this.cfg = cfg;
      this.population = [];
      this.generation = 0;
      this.history = [];
      this.prevKeys = {};
      this.running = false;
      this.stopRequested = false;
      this.stopReplayRequested = false;
      this._allTargets = [];
      this._initialHealthTotal = 0;
      this._cachedOutputs = null;
      this._moveDir = 0; // -1 left, 0 idle, 1 right — see applyOutputs()'s hysteresis
    }

    static get inputSize() { return INPUT_SIZE; }
    static get outputActions() { return OUTPUT_ACTIONS; }
    static get abilityDefs() { return ABILITY_DEFS; }

    initPopulation() {
      this.population = Array.from({ length: this.cfg.populationSize }, () => randomGenome());
      this.generation = 0;
      this.history = [];
    }

    // cfg.abilityConfig: [{key, granted, level}] — one row per ABILITY_DEFS
    // entry. Validation (at most one row at level 4) is the UI's job, same
    // as enemy_test.html's "last Lv4 checked wins" convention — this just
    // defensively takes the first one it sees if that's somehow violated.
    applyAbilityConfig(rows) {
      statUpgrades = {};
      let limitBreakKey = null;
      for (const def of ABILITY_DEFS) {
        const row = (rows || []).find(r => r.key === def.key);
        const granted = !!(row && row.granted);
        const level = granted ? Math.max(0, Math.min(4, row.level || 0)) : 0;
        abilityState[def.flag] = granted;
        statUpgrades[def.key] = level;
        if (granted && level >= 4 && !limitBreakKey) limitBreakKey = def.key;
      }
      if (limitBreakKey) {
        limitBreak.active = true;
        limitBreak.ability = limitBreakKey;
        limitBreak.timer = LIMIT_BREAK_DURATION;
      } else {
        limitBreak.active = false;
        limitBreak.ability = null;
        limitBreak.timer = 0;
      }
      if (player) {
        const fmax = this.cfg.fractureMax != null ? this.cfg.fractureMax : 4;
        player.fractureMax = fmax;
        player.fractureMeter = this.cfg.fractureMeter != null ? this.cfg.fractureMeter : fmax;
        player.health = MAX_HEALTH;
      }
    }

    resetArena() {
      const area = AREAS[ARENA_ID];
      gameState = 'playing';
      currentAreaId = ARENA_ID;
      player = new Player(area.width / 2, area.groundY - 60);
      echoes = []; projectiles = []; particles = []; bossProjectiles = [];
      boss = null; miniboss = null; defeatedMinibosses = {};
      area.isMinibossArena = false; area.miniboss = null;
      areaEnemies[ARENA_ID] = []; areaEnemiesSpawned = {};
      discoveredAreas = { [ARENA_ID]: true };
      anchorActivated = {}; lastAnchor = null; collectedLore = {};
      this.applyAbilityConfig(this.cfg.abilityConfig);
      this.spawnRoster();
      resetCamera();
      this.prevKeys = {};
      this._cachedOutputs = null; // force a fresh decision on tick 0 of the new run
      this._moveDir = 0;
    }

    spawnRoster() {
      const area = AREAS[ARENA_ID];
      const targets = [];

      // Boss/miniboss: single dedicated global slot each — game.js's own
      // loop drives boss.update()/miniboss.update() separately from the
      // areaEnemies array (see Plans/CLAUDE.md's "Boss/miniboss death
      // pattern" note), so these aren't pushed into areaEnemies.
      area.isBossArena = false;
      if (this.cfg.bossType === 'boss') {
        // game.js's own update() has a "clear boss when leaving boss arena"
        // guard — `if (!area.isBossArena && boss) { boss = null; ... }` —
        // that runs unconditionally every tick. bot_arena never set this
        // flag, so the boss got nulled on the very first update() call
        // after spawning (same bug class the miniboss branch below already
        // avoids via area.isMinibossArena — missed the Sovereign's equivalent).
        area.isBossArena = true;
        bossDefeated = false; // stale true from an earlier run in this tab would suppress the fight entirely
        boss = new Boss(area.width / 2, area.groundY - 140);
        targets.push(boss);
      } else if (typeof MINIBOSS_CLASSES !== 'undefined' && MINIBOSS_CLASSES[this.cfg.bossType]) {
        // Any id in game.js's MINIBOSS_CLASSES spawns generically here — no
        // per-boss special-casing needed (2026-07-26, added alongside
        // polar_guardian/horizon_core so new minibosses need zero changes
        // in this file, only a new <option> in difficulty_bot.html).
        area.isMinibossArena = true;
        area.miniboss = this.cfg.bossType;
        miniboss = new MINIBOSS_CLASSES[this.cfg.bossType](area.width / 2, area.groundY - 84);
        targets.push(miniboss);
      }

      const roster = this.cfg.roster || [];
      const total = roster.reduce((s, r) => s + r.count, 0);
      const margin = 70;
      const usableW = Math.max(1, area.width - margin * 2);
      let i = 0;
      for (const entry of roster) {
        const Cls = ENEMY_REGISTRY[entry.type];
        if (!Cls) continue;
        for (let c = 0; c < entry.count; c++) {
          const t = total <= 1 ? 0.5 : i / (total - 1);
          const x = margin + usableW * t;
          const inst = new Cls(x, area.groundY - 48);
          areaEnemies[ARENA_ID].push(inst);
          targets.push(inst);
          i++;
        }
      }

      for (const t of targets) t.__initialHealth = t.health;
      this._allTargets = targets;
      this._initialHealthTotal = targets.reduce((s, t) => s + Math.max(0, t.health), 0);
    }

    getLiveTargets() {
      return this._allTargets.filter(t => t && t.health > 0 && !t.dead);
    }

    currentTargetHealthTotal() {
      return this._allTargets.reduce((s, t) => s + Math.max(0, t.health), 0);
    }

    // ── Net inputs (43) ───────────────────────────────────────────────
    // 0-9   base: player HP/cooldowns/position/velocity/wall-distance/target-ratio
    // 10-15 hold/charge state: charging+chargeTimer, gravitonActive+holdTimer,
    //       shardAiming+aimTimer (all ratios 0-1) — see the block below
    // 16    nearest target requires a heavy (fully-charged) hit to damage at
    //       all (Colossus Core) — without this the net has to rediscover
    //       "normal attacks do nothing here" purely from a reward signal
    //       that's otherwise identical to "haven't found the enemy yet"
    //       (both score 0 damage), which is a very weak/slow way to learn
    //       it. Detected via `instanceof ColossusCore` — the real class,
    //       not a duck-typed guess — since it's the only enemy with this
    //       rule right now (mirrors the destructible-wall rule elsewhere,
    //       per enemy.js's own comment on ColossusCore.takeDamage).
    // 17    nearest target's phase ratio (0 if it has no `.phase` field —
    //       plain ComposedEnemy roster fighters don't). The Sovereign
    //       (`boss.js`) and several bespoke multi-phase minibosses gate
    //       their entire moveset/precognition on `this.phase` (1-3) — a
    //       genome that can't tell Phase 1 (restrained) from Phase 3 (full
    //       kit + her own Stillpoint) has to relearn the fight's threat
    //       level from scratch off attack-shape alone every phase
    //       transition, the same slow-signal problem input 16 already
    //       solves for Colossus Core's heavy-only rule.
    // 18    nearest target is currently running ITS OWN Stillpoint
    //       (`boss.bossStillpointActive`, Phase 3 only) — the world (and the
    //       player's own physics via `player.timeScale`) is slowed, but nothing
    //       else in this input vector reflects that; without this flag a
    //       velocity/cooldown-ratio reading during her cast looks identical
    //       to a normal-speed one even though it resolves far slower.
    // 19-26 nearest target block (dx, dy, hp%, attacking, windingUp, hyperArmor,
    //        minRange, present)
    // 27-34 2nd-nearest target block, same layout
    // 35-42 3rd-nearest target block, same layout — a 3rd slot (was 2) so the
    //       bot isn't blind to a 3rd attacker flanking from off-window,
    //       which is exactly what "can't handle multiple enemies" looks like
    // The attack-shape fields (hyperArmor/minRange, read off the live
    // ComposedEnemy `.attacks[._activeAttack]` entry — the same structured
    // data editor/enemy_designer.html edits) are what make this "aware of
    // enemy attack data" rather than reacting to raw pixels alone.
    buildInputs() {
      const area = AREAS[ARENA_ID];
      const targets = this.getLiveTargets();
      const px = player.x + player.width / 2, py = player.y + player.height / 2;
      targets.sort((a, b) => {
        const da = Math.hypot((a.x + a.width / 2) - px, (a.y + a.height / 2) - py);
        const db = Math.hypot((b.x + b.width / 2) - px, (b.y + b.height / 2) - py);
        return da - db;
      });
      const inputs = new Float32Array(INPUT_SIZE);
      let o = 0;
      inputs[o++] = player.health / MAX_HEALTH;
      inputs[o++] = Math.min(1, player.attackCooldown / 40);
      inputs[o++] = Math.min(1, player.dashCooldown / 40);
      inputs[o++] = px / area.width;
      inputs[o++] = Math.max(0, Math.min(1, (py - 100) / (area.groundY - 100)));
      inputs[o++] = Math.max(-1, Math.min(1, player.vx / 8));
      inputs[o++] = Math.max(-1, Math.min(1, player.vy / 14));
      inputs[o++] = Math.max(0, Math.min(1, px / 150));
      inputs[o++] = Math.max(0, Math.min(1, (area.width - px) / 150));
      inputs[o++] = this._allTargets.length ? targets.length / this._allTargets.length : 0;
      // Hold/charge-state block — without these the net has no way to learn
      // "I've held long enough, release now" for any of the three hold-to-
      // charge mechanics; it would only ever see the button-press decision,
      // never the in-progress state. player.charging/chargeTimer (heavy
      // attack), gravitonActive/gravitonHoldTimer (tap-vs-hold flip), and
      // shardAiming/shardAimTimer (aim-then-release, Lv3+ beam channel) are
      // all real Player fields; CHARGE_FULL/GRAVITON_SURGE_TAP_THRESHOLD/
      // BEAM_CHARGE_TIME are the real thresholds from player.js/ability.js.
      inputs[o++] = player.charging ? 1 : 0;
      inputs[o++] = Math.max(0, Math.min(1, player.chargeTimer / CHARGE_FULL));
      inputs[o++] = player.gravitonActive ? 1 : 0;
      inputs[o++] = Math.max(0, Math.min(1, player.gravitonHoldTimer / GRAVITON_SURGE_TAP_THRESHOLD));
      inputs[o++] = player.shardAiming ? 1 : 0;
      inputs[o++] = Math.max(0, Math.min(1, player.shardAimTimer / BEAM_CHARGE_TIME));
      const nearest = targets[0];
      inputs[o++] = (nearest && typeof ColossusCore !== 'undefined' && nearest instanceof ColossusCore) ? 1 : 0;
      // Boss-phase/precog-window awareness (2026-07-26) — `.phase` is a
      // plain 1-3 int on Boss/most bespoke multi-phase minibosses, absent
      // (undefined) on every ComposedEnemy roster fighter; normalize
      // against 3 (the real max phase count everywhere it exists) rather
      // than hardcoding a per-class max.
      inputs[o++] = (nearest && typeof nearest.phase === 'number') ? Math.max(0, Math.min(1, nearest.phase / 3)) : 0;
      inputs[o++] = (nearest && nearest.bossStillpointActive) ? 1 : 0;
      for (let slot = 0; slot < NEAREST_SLOTS; slot++) {
        const t = targets[slot];
        if (t) {
          const tx = t.x + t.width / 2, ty = t.y + t.height / 2;
          inputs[o++] = Math.max(-1, Math.min(1, (tx - px) / area.width));
          inputs[o++] = Math.max(-1, Math.min(1, (ty - py) / 300));
          inputs[o++] = Math.max(0, Math.min(1, t.health / (t.__initialHealth || t.health || 1)));
          inputs[o++] = t.attacking ? 1 : 0;
          inputs[o++] = t.windingUp ? 1 : 0;
          let hyperArmor = 0, minRange = 0;
          if (t.attacks && t._activeAttack != null && t.attacks[t._activeAttack]) {
            const atk = t.attacks[t._activeAttack];
            hyperArmor = atk.hyperArmor ? 1 : 0;
            minRange = Math.min(1, (atk.minRange || 0) / 300);
          }
          inputs[o++] = hyperArmor;
          inputs[o++] = minRange;
          inputs[o++] = 1;
        } else {
          o += 8;
        }
      }
      return inputs;
    }

    // Every output is re-evaluated fresh every tick and just becomes the
    // held/not-held state of a key — there's no artificial "you can't move
    // while charging" coupling anywhere here (the real player.js doesn't
    // gate movement on this.charging either, only on dashing/phaseDashing/
    // hitstun — see the Movement block in player.js). So moving while
    // charging a heavy attack, or holding Graviton Surge past the tap
    // threshold while walking, are already possible outcomes of evolution
    // without any special-casing — the net just has to learn to output both
    // at once, same as a human holding two keys.
    applyOutputs(out) {
      // Movement direction gets a deadzone + margin, everything else stays a
      // plain per-tick threshold. Two different needs: direction should have
      // inertia (a human doesn't reverse on a coinflip-close signal — this
      // was the "turns around really quickly" report), but nothing here
      // should stop the bot from combining actions that are legitimately
      // simultaneous in the real game (move + charge attack, move + dash,
      // move + hold Graviton Surge — see the big comment below). Only
      // moveLeft/moveRight go through this; jump/attack/dash/etc. are still
      // decided fresh each decision tick with no artificial commitment.
      const MOVE_LOW = 0.15;   // below this on both sides = stand still
      const MOVE_MARGIN = 0.15; // how much stronger the *other* direction has to be to flip
      const leftS = out[0], rightS = out[1];
      let dir = this._moveDir;
      if (Math.max(leftS, rightS) < MOVE_LOW) {
        dir = 0;
      } else if (leftS - rightS > MOVE_MARGIN) {
        dir = -1;
      } else if (rightS - leftS > MOVE_MARGIN) {
        dir = 1;
      } // else: ambiguous this tick — keep whatever direction was already committed
      this._moveDir = dir;

      const wants = {
        moveLeft: dir === -1,
        moveRight: dir === 1,
        jump: out[2] > 0.3,
        attack: out[3] > 0.3,
        dash: out[4] > 0.3,
        stillpoint: out[5] > 0.3,
        shardShot: out[6] > 0.3,
        gravitonSurge: out[7] > 0.3,
        voidTether: out[8] > 0.3,
        aimUp: out[9] > 0.3,
        aimDown: out[10] > 0.3,
      };
      for (const action of OUTPUT_ACTIONS) {
        const code = keyBindings[action];
        const want = !!wants[action];
        const prev = !!this.prevKeys[code];
        justPressed[code] = want && !prev;
        keys[code] = want;
        this.prevKeys[code] = want;
      }
    }

    // cfg.algorithm picks the search/policy: 'ga' (crossover + mutation,
    // default), 'es' (mutation-only — see the reproduction step in run()),
    // or 'baseline' (no learning at all, see ScriptedBaselinePolicy above).
    makeBrain(genome) {
      return this.cfg.algorithm === 'baseline' ? new ScriptedBaselinePolicy() : new NeuralNet(genome.weights);
    }

    // Re-deciding from a fresh forward pass every single tick (16ms) reads
    // as robotic — a feedforward net has no memory, so a nearest-target dx
    // that oscillates near zero (circling at close range) flips movement
    // output every frame, and a hold-to-charge output (attack/shardShot/
    // gravitonSurge) that dips below threshold for even one tick breaks the
    // hold and restarts it, which is very likely why Graviton Surge's
    // tap-vs-hold flip wasn't landing reliably. Real reaction time is
    // ~100-200ms, not 16ms — this throttles *decision-making* to
    // cfg.decisionIntervalTicks (default 6 ≈ 100ms @60fps) while the game
    // itself still simulates every tick; the bot just holds its last
    // decision in between, the same way a human doesn't re-aim every frame.
    decide(brain, tickIndex) {
      const interval = Math.max(1, this.cfg.decisionIntervalTicks || 1);
      if (!this._cachedOutputs || tickIndex % interval === 0) {
        this._cachedOutputs = brain.forward(this.buildInputs());
      }
      return this._cachedOutputs;
    }

    // ── Fast eval: no draw(), no rAF — just plain update() calls back to
    // back, as many as the JS engine can do in this synchronous stretch.
    evaluateGenome(genome) {
      this.resetArena();
      const net = this.makeBrain(genome);
      let damageDealt = 0;
      let prevTotal = this._initialHealthTotal;
      let ticks = 0;
      let peakCharge = 0; // best chargeTimer/CHARGE_FULL reached this run — see the shaping-reward note below
      const maxTicks = this.cfg.maxTicks;
      while (ticks < maxTicks) {
        if (!player || player.health <= 0) break;
        if (this.getLiveTargets().length === 0) break;
        const out = this.decide(net, ticks);
        this.applyOutputs(out);
        update();
        if (player.charging) peakCharge = Math.max(peakCharge, player.chargeTimer / CHARGE_FULL);
        const curTotal = this.currentTargetHealthTotal();
        if (curTotal < prevTotal) damageDealt += (prevTotal - curTotal);
        prevTotal = curTotal;
        ticks++;
      }
      const cleared = this.getLiveTargets().length === 0;
      const damageTaken = MAX_HEALTH - Math.max(0, player ? player.health : 0);
      // Fitness (v1.2) — split by outcome, tune the multipliers if a run
      // converges on the wrong behavior.
      //
      // v1 bug (fixed): a flat `+ticks` term rewarded raw survival time
      // unconditionally, so a genome that cleared in 900 ticks scored the
      // same base credit as one that stalled and won at tick 10. Per user
      // request ("the faster you kill it the better"): a clear is now
      // scored by ticks SAVED off the budget, not ticks survived.
      //
      // v1.2 fix (user report, gen 280 vs. Colossus Core still at fitness
      // 885 and "just running away"): two compounding problems specific to
      // targets that need a full heavy-attack charge to damage at all
      // (ATTACK_DAMAGE=1, a max-charge heavy hit ≈2, Colossus Core has 20
      // HP — ~10 successful full charges needed).
      //   1. `damageDealt` was weighted far too low relative to passive
      //      survival — old weight (20) meant even a landed heavy hit was
      //      worth less than a few seconds of doing nothing, so kiting for
      //      the full ticks budget was a perfectly competitive strategy.
      //      damageDealt is now the dominant term, and ticks is down to a
      //      minor tie-breaker (0.3x) instead of the main reward.
      //   2. There was no reward gradient AT ALL between "never tried to
      //      charge" and "held for 39/40 frames and got interrupted" — both
      //      score 0 damage, identically. `peakCharge` (tracked above, the
      //      best charge ratio reached even if it never fired) gives partial
      //      credit for getting closer to a full charge, so evolution has
      //      something to climb before it stumbles onto an actual landed
      //      hit — a genome that reliably reaches an 80% charge is a better
      //      mutation base than one that never holds attack at all, and now
      //      that's reflected in fitness instead of both reading as "0
      //      damage, may as well not have tried."
      //
      // v1.3 fix (user report: "the player has no incentive to dodge
      // apparently"): correct — damageTaken's -15/point was calibrated
      // against the OLD damage-dealt weight (20), not the v1.2 rebalance
      // (300/50). At -15, trading a full 6 HP to land one heavy hit was a
      // straight profit (-90 vs +300), so nothing pushed evolution toward
      // dodging at all — it was rational to just tank hits while attacking.
      // Raised to actually matter at the new scale, plus a flat "flawless"
      // bonus (separate from the per-point penalty) so a genome that
      // avoids damage entirely is rewarded for that specifically, not just
      // for "losing less" on a continuous scale.
      let fitness;
      if (cleared) {
        const ticksSaved = Math.max(0, maxTicks - ticks);
        fitness = 5000 + ticksSaved * 5 + damageDealt * 50 - damageTaken * 80 + (damageTaken === 0 ? 500 : 0);
      } else {
        fitness = ticks * 0.3 + peakCharge * 80 + damageDealt * 300 - damageTaken * 80 + (damageTaken === 0 ? 100 : 0);
      }
      genome.fitness = fitness;
      genome.stats = {
        ticks, damageDealt, damageTaken, cleared, peakCharge,
        playerHealth: Math.max(0, player ? player.health : 0),
        playerMaxHealth: MAX_HEALTH,
        targets: this.snapshotTargets(),
      };
      return genome;
    }

    // Read the same health numbers the UI shows during replay, plus a label
    // per target — used both for the post-eval summary (fast mode) and the
    // per-frame callback during a live replay.
    snapshotTargets() {
      return this._allTargets.map(t => ({
        label: (t.constructor && t.constructor.name) || 'target',
        health: Math.max(0, t.health),
        maxHealth: t.__initialHealth || t.health || 1,
        dead: !!t.dead,
      }));
    }

    // ── Watch replay: real update()+draw() paced by the real
    // requestAnimationFrame (captured before it was stubbed — see
    // editor/difficulty_bot.html), so this genome's run is actually watchable
    // instead of a fast-forward blur. Re-simulates the genome fresh rather
    // than replaying recorded inputs — the game has its own internal
    // randomness (enemy AI variance etc.), so a frame-for-frame recording
    // wouldn't reproduce identically anyway; re-running the same net against
    // a fresh reset is the simpler and equally honest way to "watch the best."
    replayGenome(genome, onDone) {
      this.resetArena();
      const net = this.makeBrain(genome);
      let ticks = 0;
      const maxTicks = this.cfg.maxTicks;
      const realRAF = window.__realRAF || window.requestAnimationFrame;
      const self = this;
      const reportHealth = () => {
        if (self.cfg.onReplayTick) {
          self.cfg.onReplayTick({
            playerHealth: Math.max(0, player.health),
            playerMaxHealth: MAX_HEALTH,
            targets: self.snapshotTargets(),
          });
        }
      };
      reportHealth(); // starting numbers, before the first tick
      function frame() {
        if (self.stopReplayRequested) { self.stopReplayRequested = false; onDone && onDone(); return; }
        if (!player || player.health <= 0 || ticks >= maxTicks || self.getLiveTargets().length === 0) {
          reportHealth();
          onDone && onDone();
          return;
        }
        const out = self.decide(net, ticks);
        self.applyOutputs(out);
        update();
        draw();
        reportHealth();
        ticks++;
        realRAF(frame);
      }
      realRAF(frame);
    }

    // cfg.throttleMs (default 0 = max speed) — a real setTimeout delay, not
    // just a 0ms yield-to-event-loop. Fast-forward evaluation is one
    // long-running synchronous stretch of update() calls with nothing to
    // stop it pegging a CPU core; a 0ms yield keeps the tab responsive but
    // doesn't actually give the core a break. This does, at the cost of
    // wall-clock training time — the "reasonable pace / my laptop's getting
    // hot" lever.
    _yield() { return new Promise(resolve => setTimeout(resolve, this.cfg.throttleMs || 0)); }

    // Baseline isn't a search algorithm — one eval of the fixed policy, one
    // optional replay, done. No population, no generations.
    async runBaselineOnly() {
      const genome = { weights: null, fitness: 0, stats: null };
      this.evaluateGenome(genome);
      this.generation = 0;
      this.history = [{ gen: 0, best: genome.fitness, avg: genome.fitness, stats: genome.stats }];
      if (this.cfg.onGeneration) this.cfg.onGeneration({ gen: 0, best: genome, avg: genome.fitness, history: this.history.slice() });
      if (this.cfg.watchBest && !this.stopRequested) {
        await new Promise(resolve => this.replayGenome(genome, resolve));
      }
    }

    async run() {
      this.running = true;
      this.stopRequested = false;
      if (this.cfg.algorithm === 'baseline') {
        await this.runBaselineOnly();
        this.running = false;
        return;
      }
      this.initPopulation();
      for (let gen = 0; gen < this.cfg.generations && !this.stopRequested; gen++) {
        this.generation = gen;
        const yieldEvery = this.cfg.throttleMs > 0 ? 1 : 4; // throttled: breathe after every genome, not just every 4th
        for (let i = 0; i < this.population.length; i++) {
          if (this.stopRequested) break;
          this.evaluateGenome(this.population[i]);
          if (i % yieldEvery === yieldEvery - 1) await this._yield();
        }
        if (this.stopRequested) break;

        this.population.sort((a, b) => b.fitness - a.fitness);
        const best = this.population[0];
        const avg = this.population.reduce((s, g) => s + g.fitness, 0) / this.population.length;
        this.history.push({ gen, best: best.fitness, avg, stats: best.stats, weights: best.weights.slice() });
        if (this.cfg.onGeneration) this.cfg.onGeneration({ gen, best, avg, history: this.history.slice() });

        if (this.cfg.watchBest && !this.stopRequested) {
          const every = Math.max(1, this.cfg.watchEveryN || 1);
          if (gen % every === 0) {
            await new Promise(resolve => this.replayGenome(best, resolve));
          }
        }
        if (this.stopRequested) break;

        // Reproduction — 'es' (Evolution Strategy): mutation-only, each
        // child is a mutated clone of a single elite parent, no gene mixing.
        // Simpler search, sometimes smoother convergence on a small net like
        // this since there's no crossover discontinuity to fight through.
        // 'ga' (default): real crossover between two pool members first,
        // then mutation — more exploratory, can escape local optima crossover
        // alone can't reach.
        const elitism = Math.max(1, this.cfg.elitism || 2);
        const next = this.population.slice(0, elitism).map(cloneGenome);
        const poolSize = Math.max(2, Math.ceil(this.population.length / 2));
        const pool = this.population.slice(0, poolSize);
        while (next.length < this.population.length) {
          let child;
          if (this.cfg.algorithm === 'es') {
            const parent = pool[Math.floor(Math.random() * pool.length)];
            child = cloneGenome(parent);
          } else {
            const a = pool[Math.floor(Math.random() * pool.length)];
            const b = pool[Math.floor(Math.random() * pool.length)];
            child = crossover(a, b);
          }
          mutate(child, this.cfg.mutationRate, this.cfg.mutationAmount);
          next.push(child);
        }
        this.population = next;
      }
      this.running = false;
    }

    stop() { this.stopRequested = true; }
    stopReplay() { this.stopReplayRequested = true; }
  }

  window.NeuralNet = NeuralNet;
  window.DifficultyBotEngine = DifficultyBotEngine;
})();
