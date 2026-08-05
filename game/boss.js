// Final Boss: The Sovereign. `class Boss` was always generically named (no
// actual `King`-prefixed identifiers existed to rename — only prose
// comments referred to "the King"); those comments are now updated to
// "the Sovereign" throughout game/*.js, per the 2026-08-02 rename.
//
// Moveset rebuilt 2026-07-26 (~/.claude/plans/distributed-gliding-forest.md)
// for full parity with the player's own ability kit — she is explicitly
// "the player in the future" (lore.md's Final fight structure section,
// expansion.md §2): same kit minus Graviton Surge (never collected it in
// her own timeline), a corrupted Void Tether that pulls HER to the player
// instead of the reverse. Phase 1 (>60% HP): heavy precognition, reads and
// counters the player's next move, restrained real offense. Phase 2 (<=60%):
// full kit except Stillpoint. Phase 3 (<=30%): adds Stillpoint itself
// (literal, not a reskin), full immunity to the player's own Stillpoint
// (pre-existing `myTimeScale` exemption below, confirmed still correct).
const BOSS_MAX_HEALTH = 80;
const BOSS_DAMAGE = 1; // fallback only now — see getAttackDamageAndKnockback()/attackDefs below for real per-attack numbers
const BOSS_WIDTH = 48;
const BOSS_HEIGHT = 56;
const BOSS_X = 426;  // centered in 900px arena
const BOSS_Y = 334;  // groundY (390) - BOSS_HEIGHT (56)

// Phase 3 Stillpoint — deliberately steeper than the player's own max
// (STILLPOINT_SLOW_LV3=0.9, 0.95 under Limit Break, player.js) — "stronger
// than you" reads as raw power here, not a wider kit. Read by game.js's
// gameTimeScale assignment and by the new player.timeScale mechanism.
const BOSS_STILLPOINT_SLOW = 0.97;
// Precognition: how many frames of lead time in a player "tell" (charge/
// stillpoint-hold/shard-aim/attack-startup) count as caught early enough to
// react to. See readPlayerTell()/precogCounter() below.
const PRECOG_MIN_LEAD = 12;

// ── Data-driven phase / attack-selection config (2026-07-27) ────────────────
// Extracted from pickAttack()'s prior hardcoded probability bands so
// editor/boss_phase_editor.html can tune phase thresholds and per-phase
// attack weights without touching this file. Same numbers as before by
// default — the weighted-table walk below reproduces the old if/else-if
// cumulative-threshold chain exactly (including its fall-through-to-last-
// entry behavior when a bias shift pushes the roll past 1 or below 0).
//   phaseThresholds: health% cutoffs, descending. health% > thresholds[0] is
//     phase 1, > thresholds[1] is phase 2, else the next phase, etc.
//   reservedSlot: a single always-checked-first special move (only Phase 3's
//     Stillpoint uses this — it has its own active/cooldown fields, not a
//     plain attackCooldown, so it doesn't fit the weighted table below).
//   teleport: a flat chance rolled before the weighted table, phase-gated.
//   phases[n].attacks: ordered {method, weight} pool for that phase — order
//     matches the old if/else-if chain's order exactly.
//   phases[n].preferRangedShift/preferMeleeShift/preferMargin: reproduces
//     the old adaptation nudge (adapt.rangedHits/meleeHits comparison shifts
//     the roll by a flat amount before the table walk).
//   phases[n].distanceBias/distanceFar/distanceNear: reproduces the old
//     "far → bias toward ranged end of table, close → bias toward melee end"
//     spacing read.
const BOSS_PHASE_CONFIG = {
  phaseThresholds: [0.6, 0.3],
  reservedSlot: {
    phase: 3, chance: 0.4,
    activeField: 'bossStillpointActive', cooldownField: 'bossStillpointCooldown',
    startMethod: 'startBossStillpoint',
  },
  teleport: { minPhase: 2, chance: 0.12, startMethod: 'startTeleport' },
  phases: {
    1: {
      preferRangedShift: -0.15, preferMeleeShift: 0, preferMargin: 4,
      distanceBias: 0.14, distanceFar: 320, distanceNear: 150,
      attacks: [
        { method: 'startMeleeSwing', weight: 0.35 },
        { method: 'startShardShot', weight: 0.40 },
        { method: 'startPhaseDash', weight: 0.25 },
      ],
    },
    2: {
      preferRangedShift: -0.08, preferMeleeShift: 0.08, preferMargin: 4,
      distanceBias: 0.14, distanceFar: 320, distanceNear: 150,
      attacks: [
        { method: 'startMeleeSwing', weight: 0.18 },
        { method: 'startChargedHeavy', weight: 0.18 },
        { method: 'startDashChain', weight: 0.14 },
        { method: 'startReversedVoidTether', weight: 0.14 },
        { method: 'startShardShot', weight: 0.18 },
        { method: 'startBeamChannel', weight: 0.10 },
        { method: 'startWallBurst', weight: 0.08 },
      ],
    },
  },
};
BOSS_PHASE_CONFIG.phases[3] = BOSS_PHASE_CONFIG.phases[2]; // Phase 3 reuses Phase 2's table — Stillpoint is the reserved slot above, not a table entry.

// Pure — no `this`, so boss_phase_editor.html / tests can exercise it
// directly. Walks the cumulative-weight table exactly like the old
// if/else-if chain: falls through to the last entry if `r` (after bias
// shifts) lands below 0 or at/above the summed weight, same as the old
// chain's unconditional trailing `else`.
function resolveWeightedAttackName(attacks, r) {
  let acc = 0;
  for (const entry of attacks) {
    acc += entry.weight;
    if (r < acc) return entry.method;
  }
  return attacks[attacks.length - 1].method;
}

// ── Editor overrides ─────────────────────────────────────────────────────
// boss_phase_editor.html saves work-in-progress here; same pattern as
// animdata.js's ANIM_OVERRIDES_KEY. Merges per top-level key (phases merge
// per-phase-number), never a wholesale replace of BOSS_PHASE_CONFIG.
const BOSS_CONFIG_OVERRIDES_KEY = 'stillpoint_boss_phase_overrides_v1';
function applyBossConfigOverrides() {
  const overrides = readOverrideJSON(BOSS_CONFIG_OVERRIDES_KEY, OverrideShape.object);
  if (!overrides) return;
  if (overrides.phaseThresholds) BOSS_PHASE_CONFIG.phaseThresholds = overrides.phaseThresholds;
  if (overrides.reservedSlot) Object.assign(BOSS_PHASE_CONFIG.reservedSlot, overrides.reservedSlot);
  if (overrides.teleport) Object.assign(BOSS_PHASE_CONFIG.teleport, overrides.teleport);
  if (overrides.phases) {
    for (const key in overrides.phases) BOSS_PHASE_CONFIG.phases[key] = overrides.phases[key];
  }
}
applyBossConfigOverrides();

class Boss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = BOSS_WIDTH;
    this.height = BOSS_HEIGHT;
    this.health = BOSS_MAX_HEALTH;
    this.maxHealth = BOSS_MAX_HEALTH;
    this.vx = 0;
    this.vy = 0;
    this.facing = -1;
    this.dead = false;
    this.deathTimer = 0;

    // State machine
    this.state = 'entering';
    this.stateTimer = 0;
    this.phase = 1;
    this.phaseTransitionTimer = 0;
    this.invulnerable = false;

    // Attack system
    this.attackCooldown = 0;
    this.attackTimer = 0;
    this.currentAttack = null;
    this.telegraph = null;
    this.hitEffects = [];
    this.flashTimer = 0;

    // Consecutive hit tracking (for punish burst)
    this.consecutiveHits = 0;
    this.lastHitTimer = 0;

    // Post-attack stagger delay (see executeAttack()/update()) — frame
    // counter, not setTimeout.
    this._staggerDelayTimer = 0;
    this._heavyDipTimer = 0;

    // Idle spacing jitter — re-rolled occasionally (see the 'idle' case in
    // update()) so her preferred distance isn't a perfectly fixed 220px
    // leash every single fight; keeps the drift from reading as robotic.
    this._preferredDistJitter = 0;

    // Teleport
    this.teleportTarget = { x: 0, y: 0 };
    this.teleportFlash = 0;

    // Shield (phase 2+)
    this.shieldActive = false;
    this.shieldHealth = 0;
    this.shieldMaxHealth = 2;
    this.shieldCooldown = 0;

    // Parry stun
    this.stunTimer = 0;

    // Visual bridge to game/animdata.js — see update()'s hook comment.
    this.animator = new Animator(this);

    // Summon timer (phase 2+)
    this.summonCooldown = 0;

    // ── Adaptation system ─────────────────────────────────────────────────
    // Silently tracks how the player fights and biases attack selection.
    this.adapt = {
      meleeHits: 0,       // times player landed melee
      rangedHits: 0,      // times player landed projectile
      dashCount: 0,       // times player phase-dashed during fight
      stillpointUses: 0,  // times player activated Stillpoint against boss
      adaptNotified: false, // whether we've shown the first adaptation cue
    };

    // Phase 3 Stillpoint counter-lunge — generalized (2026-07-26) into the
    // shared landing motion for BOTH the predictive precognition system
    // (any phase) and the Reversed Void Tether's arrival (Phase 2+), not
    // just a reactive Phase-3-only counter anymore. Existing visual tells
    // (white eyes, motion-blur trail) kept as-is.
    this.lunging = false;
    this.lungeVx = 0;
    this.lungeTimer = 0;
    this.stillpointWasActive = false; // tracks previous frame for edge detection
    this.surgeCooldown = 0; // prevent lunge spam

    // ── Damage plumbing fix (2026-07-26) ────────────────────────────────
    // Mirrors ComposedEnemy's `_activeAttack`/`attacks[]` shape (enemy.js)
    // so game.js's existing miniboss-attack consumer pattern
    // (getAttackHitbox()/getAttackDamageAndKnockback(), game.js:3919-3937)
    // can drive real per-attack damage/knockback for Boss too, instead of
    // one flat BOSS_DAMAGE for every contact regardless of attack. Boss is
    // a fully separate class/code path from ComposedEnemy, so this is a
    // parallel implementation of the same shape, not literal reuse.
    this._activeAttack = null;     // string key while an attack's hitbox is live, else null
    this._activeAttackTimer = 0;   // frames left in the active window for timer-cleared attacks (melee/heavy) — dash_chain/tether_arrival clear explicitly instead, see their state-exit points
    this.attackDefs = {
      melee_forward: { damage: 1, knockback: { vx: 7, vy: -4, hitStun: 10 } },
      melee_up:      { damage: 1, knockback: { vx: 5, vy: -8, hitStun: 10 } },
      melee_down:    { damage: 1, knockback: { vx: 5, vy: 4, hitStun: 10 } },
      // Charged Heavy — tuned for real, dramatic knockback per explicit user
      // direction ("enough to send the player flying into the arena wall"):
      // roughly 2x the vx of this session's other "hard hit" reference
      // points (Warden & Hollow's dash_charge: knockbackX 10-11;
      // Electromagnetic Golem's: 9-10), plus a longer hitStun so the launch
      // reads before recovery. Arena is ~860px playable width, boss
      // centered — should carry the player from mid-arena into a wall on a
      // clean hit; exact numbers need a playtest pass to confirm.
      heavy:          { damage: 2, knockback: { vx: 18, vy: -9, hitStun: 22 } },
      // Dash-Chain — a real hit, not wall-launching-tier (that's Heavy's
      // job, so the two read as different weight classes).
      dash_chain:     { damage: 1, knockback: { vx: 10, vy: -5, hitStun: 12 } },
      // Reversed Void Tether arrival — a second heavy hit, matching
      // "corrupted" reading as genuinely dangerous, not a gentle pull.
      tether_arrival: { damage: 2, knockback: { vx: 14, vy: -8, hitStun: 18 } },
    };

    // Melee combo
    this.meleeDir = 'forward';

    // Dash-Chain (offensive) — repurposes the old Charge Rush's slide/bounce
    // state machinery ('charging' state below), generalized from a single
    // "double charge" boolean to N chainable legs.
    this.chargeVx = 0;
    this._chainLegsRemaining = 0;

    // Phase-Dash (defensive reposition) / Wall-Burst (edge-triggered
    // reposition) — both grant brief i-frames via this shared field, same
    // shape as the player's own invincibleTimer.
    this.phaseDashInvuln = 0;
    this.wallBurstArcTimer = 0;

    // Reversed Void Tether (Phase 2+)
    this._tetherPullTimer = 0;

    // Shard Shot / Beam channel
    this.beamTick = 0;
    this._beamRect = null; // read by draw()/drawTelegraphs() for the channel's visual

    // ── Precognition (all phases) ───────────────────────────────────────
    // Watches the player's own real, already-public "committing to a move"
    // fields — no new player.js fields needed. See readPlayerTell()/
    // precogCounter() below.
    this.precogCooldown = 0;
    this._precogReacted = { heavy: false, stillpoint: false, shard: false, attack: false };

    // ── Phase 3 Stillpoint (literal, not a reskin) ──────────────────────
    this.bossStillpointActive = false;
    this.bossStillpointTimer = 0;
    this.bossStillpointCooldown = 0;
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  // Called from game.js when player hits boss
  notifyHit(sourceType) {
    if (sourceType === 'melee') this.adapt.meleeHits++;
    else this.adapt.rangedHits++;
    this.consecutiveHits++;
    this.lastHitTimer = 90;
    const total = this.adapt.meleeHits + this.adapt.rangedHits;
    if (total === 6 && !this.adapt.adaptNotified) {
      this.adapt.adaptNotified = true;
      this.hitEffects.push({ x: this.x + this.width / 2, y: this.y - 30,
        text: '— ADAPTING —', life: 80, color: '#c4b5fd' });
    }
    // 5 consecutive hits in Phase 2+: boss retaliates immediately with real
    // offense (Charged Heavy) — Phase 1 keeps it to a Melee Swing, matching
    // "restrained" real offense in Phase 1 generally.
    if (this.consecutiveHits >= 5 && this.phase >= 2 && this.state === 'idle') {
      this.hitEffects.push({ x: this.x + this.width / 2, y: this.y - 22,
        text: 'ENOUGH', life: 50, color: '#fde68a' });
      this.consecutiveHits = 0;
      this.startChargedHeavy(); // this.phase >= 2 is already guaranteed by the outer condition above
    }
  }

  notifyPlayerDash() { this.adapt.dashCount++; }

  notifyStillpoint() {
    this.adapt.stillpointUses++;
    // Phase 2+: telegraph the surge each time player uses Stillpoint
    if (this.phase >= 2 && this.surgeCooldown <= 0 && !this.dead) {
      this.hitEffects.push({ x: this.x + this.width / 2, y: this.y - 18,
        text: this.phase >= 3 ? 'I SEE YOU' : '...', life: 50, color: '#f87171' });
    }
  }

  // New in the moveset rebuild — mirrors ComposedEnemy.getAttackHitbox()
  // (enemy.js:2868-2872) so game.js's existing consumer pattern can drive
  // Boss identically. Melee/Heavy return a real rect; Dash-Chain/Reversed
  // Void Tether use her own body as the hitbox while active (same "body IS
  // the hazard" shape the old Charge Rush already used implicitly via body
  // contact). Shard Shot/Beam channel are NOT here — Shard Shot sets damage
  // directly on the pushed projectile object, Beam channel is a self-
  // contained boss.js-local overlap check (see the 'beam_channel' state) —
  // neither goes through the generic melee-hitbox consumer.
  getAttackHitbox() {
    if (!this._activeAttack) return null;

    // ── Anim-driven path (2026-07-27) — mirrors player.js's own
    // getAttackHitbox() anim bridge exactly: only for active-attack keys
    // that actually have an authored ANIM_DEFS entry (editor/anim_editor.html,
    // `boss_active_<attack>` keys — see bossAnimStateKey()). Additive: falls
    // through to the hardcoded rects below when unauthored, zero behavior
    // change. `this._animKey` was already set to this tick's correct value
    // by update() before game.js calls this.
    if (typeof ANIM_DEFS !== 'undefined' && ANIM_DEFS[this._animKey]) {
      const hitboxes = this.animator.currentHitboxes();
      if (hitboxes.length === 0) return null; // this frame of the active window has no live box yet
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const hb of hitboxes) {
        minX = Math.min(minX, hb.x);
        minY = Math.min(minY, hb.y);
        maxX = Math.max(maxX, hb.x + hb.width);
        maxY = Math.max(maxY, hb.y + hb.height);
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    switch (this._activeAttack) {
      case 'melee_forward': {
        const w = 86, h = 50;
        const x = this.facing === 1 ? this.x + this.width : this.x - w;
        return { x, y: this.y + 3, width: w, height: h };
      }
      case 'melee_up':
        return { x: this.x - 10, y: this.y - 60, width: this.width + 20, height: 64 };
      case 'melee_down':
        return { x: this.x - 10, y: this.y + this.height - 8, width: this.width + 20, height: 64 };
      case 'heavy': {
        const w = 120, h = this.height + 20;
        const x = this.facing === 1 ? this.x + this.width - 10 : this.x - w + 10;
        return { x, y: this.y - 10, width: w, height: h };
      }
      case 'dash_chain':
      case 'tether_arrival':
        return this.getBounds();
      default:
        return null;
    }
  }

  // Custom knockback for whichever attack is currently active — read by
  // game.js's generic boss-attack-hits-player loop instead of the flat
  // BOSS_DAMAGE every contact used before this pass.
  getAttackDamageAndKnockback() {
    if (!this._activeAttack) return null;

    // Anim-driven path — same authored-frame source as getAttackHitbox()
    // above. First authored hitbox on the frame wins (this attack shape
    // only ever authors one live box per frame in practice); falls through
    // to attackDefs below when unauthored.
    if (typeof ANIM_DEFS !== 'undefined' && ANIM_DEFS[this._animKey]) {
      const hitboxes = this.animator.currentHitboxes();
      if (hitboxes.length > 0) {
        const hb = hitboxes[0];
        return { damage: hb.damage, knockback: { vx: hb.knockbackX, vy: hb.knockbackY, hitStun: hb.hitStun } };
      }
    }

    const def = this.attackDefs[this._activeAttack];
    return def ? { damage: def.damage, knockback: def.knockback } : null;
  }

  // ── Precognition ─────────────────────────────────────────────────────
  // Called every frame before the state machine switch. Watches the
  // player's own real fields for "committing to a move" tells — no new
  // player.js fields needed. Only reacts while she's free to act (idle/
  // recovering), so a read never interrupts an attack already in flight.
  readPlayerTell(player) {
    if (this.dead || this.state === 'entering' || this.precogCooldown > 0) return;
    if (this.state !== 'idle' && this.state !== 'recovering') return;

    // Reset each tell's "already reacted" flag once the player lets go of it.
    if (!player.charging) this._precogReacted.heavy = false;
    if (!player.stillpointCharging) this._precogReacted.stillpoint = false;
    if (!player.shardAiming) this._precogReacted.shard = false;
    if (!player.attacking) this._precogReacted.attack = false;

    if (player.charging && player.chargeTimer >= PRECOG_MIN_LEAD && !this._precogReacted.heavy) {
      this._precogReacted.heavy = true;
      this.precogCounter(player, 'heavy');
    } else if (player.stillpointCharging && player.stillpointHoldTimer >= PRECOG_MIN_LEAD && !this._precogReacted.stillpoint) {
      this._precogReacted.stillpoint = true;
      this.precogCounter(player, 'stillpoint');
    } else if (player.shardAiming && player.shardAimTimer >= PRECOG_MIN_LEAD && !this._precogReacted.shard) {
      this._precogReacted.shard = true;
      this.precogCounter(player, 'shard');
    } else if (player.attacking && player.attackTimer >= 8 && !this._precogReacted.attack) {
      // Early frames of even a quick tap still give a few frames of lead
      // (attackTimer counts down from ATTACK_DURATION, so a high remaining
      // value means the swing just started).
      this._precogReacted.attack = true;
      this.precogCounter(player, 'attack');
    }
  }

  // A visible "read" cue, then a phase-appropriate response. Phase 1:
  // reposition-only, restrained/no real offense yet (matching the design
  // doc — precog carries Phase 1's threat, not raw damage). Phase 2+: the
  // same reads now feed real counter-attacks. Phase 3: keeps running
  // underneath Stillpoint on a longer cooldown so it doesn't compete with
  // the Stillpoint centerpiece.
  precogCounter(player, tellType) {
    this.hitEffects.push({
      x: this.x + this.width / 2, y: this.y - 30,
      text: this.phase === 1 ? 'I SEE IT COMING' : 'READ.',
      life: 50, color: '#93c5fd',
    });
    this.precogCooldown = this.phase === 3 ? 220 : 140;
    if (typeof SFX !== 'undefined' && SFX.bossTelegraph) SFX.bossTelegraph();

    if (this.phase === 1) {
      if (tellType === 'stillpoint') this._startLunge(player);
      else this.startPhaseDash();
      return;
    }

    // Phase 2+ (including Phase 3, on the longer cooldown above).
    if (tellType === 'heavy') this.startDashChain();
    else if (tellType === 'stillpoint') this._startLunge(player);
    else if (tellType === 'shard') this.startPhaseDash();
    else this.startMeleeSwing();
  }

  takeDamage(amount, fromX, sourceType) {
    if (this.dead || this.invulnerable || this.phaseDashInvuln > 0) return;
    // Track adaptation
    if (sourceType) this.notifyHit(sourceType);
    // Shield blocks frontal damage
    if (this.shieldActive) {
      const shieldSide = this.facing; // 1 = shield on right, -1 = shield on left
      const hitFromFront = (fromX > this.x && shieldSide === 1) || (fromX < this.x && shieldSide === -1);
      if (hitFromFront) {
        this.shieldHealth--;
        // Spark particles
        const shieldX = shieldSide === 1 ? this.x + this.width : this.x - 12;
        this.hitEffects.push({ x: shieldX + 6, y: this.y + this.height / 2, text: '!', life: 30, color: '#67e8f9' });
        if (this.shieldHealth <= 0) {
          this.shieldActive = false;
          this.hitEffects.push({ x: this.x + this.width / 2, y: this.y - 10, text: 'SHIELD BROKEN', life: 60, color: '#2dd4bf' });
        }
        return;
      }
    }
    this.health -= amount;
    this.flashTimer = 8; // matches ComposedEnemy's default flash duration
    this.hitEffects.push({
      x: this.x + this.width / 2 + (Math.random() - 0.5) * 20,
      y: this.y - 10,
      text: '-' + amount,
      life: 40,
      color: '#f87171'
    });
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      this.state = 'dead';
    }
  }

  update(player, bossProjectiles, arenaWidth) {
    this.arenaWidth = arenaWidth;
    if (this.dead) {
      this.deathTimer++;
      this._animKey = this.bossAnimStateKey();
      if (typeof ANIM_DEFS !== 'undefined' && ANIM_DEFS[this._animKey]) {
        this.animator.play(this._animKey);
        this.animator.update();
      }
      return;
    }

    // ── Time scale (must be defined before stun check below) ─────────────
    const _globalTS = (typeof gameTimeScale !== 'undefined') ? gameTimeScale : 1.0;

    // Hit-flash — unscaled and ticks even while stunned/dead-gated above,
    // same convention every other enemy's flashTimer uses (see enemy.js),
    // so a hit landing right before a stun doesn't leave the flash stuck on.
    if (this.flashTimer > 0) this.flashTimer--;

    // Stunned by parry — skip all actions
    if (this.stunTimer > 0) {
      this.stunTimer -= _globalTS;
      return;
    }

    // ── Boss is ALWAYS immune to player Stillpoint in Phase 3 ────────────
    // In Phases 1-2 the boss IS slowed (gives player a good tool).
    // In Phase 3 she "sees through" Stillpoint — this exemption already
    // generalizes correctly to "immune to her OWN Phase 3 Stillpoint cast
    // too" for free (confirmed, no change needed for that half).
    const myTimeScale = (this.phase >= 3) ? 1.0 : _globalTS;

    // ── Phase 3 Stillpoint bookkeeping — ticks in real/global time (not
    // her own possibly-1.0 myTimeScale), since it's the source of the slow,
    // not a thing being slowed. ──────────────────────────────────────────
    if (this.bossStillpointActive) {
      this.bossStillpointTimer -= _globalTS;
      if (this.bossStillpointTimer <= 0) {
        this.bossStillpointActive = false;
        if (typeof SFX !== 'undefined' && SFX.bossStillpointEnd) SFX.bossStillpointEnd();
      }
    }
    if (this.bossStillpointCooldown > 0) this.bossStillpointCooldown -= _globalTS;

    // ── Detect player activating Stillpoint — trigger lunge in Phase 3 ────
    const spNow = (typeof player !== 'undefined') && player.stillpointActive;
    if (spNow && !this.stillpointWasActive) {
      this.notifyStillpoint();
      if (this.phase >= 3 && this.surgeCooldown <= 0 && !this.dead && this.state !== 'lunging') {
        this._startLunge(player);
      }
    }
    this.stillpointWasActive = spNow;
    if (this.surgeCooldown > 0) this.surgeCooldown--;

    // ── Precognition — checked before the state machine, any phase ───────
    this.readPlayerTell(player);
    if (this.precogCooldown > 0) this.precogCooldown -= myTimeScale;

    // Phase detection — thresholds from BOSS_PHASE_CONFIG (see its comment above).
    const healthPct = this.health / this.maxHealth;
    let newPhase = BOSS_PHASE_CONFIG.phaseThresholds.length + 1;
    for (let i = 0; i < BOSS_PHASE_CONFIG.phaseThresholds.length; i++) {
      if (healthPct > BOSS_PHASE_CONFIG.phaseThresholds[i]) { newPhase = i + 1; break; }
    }
    if (newPhase !== this.phase) {
      this.phase = newPhase;
      this.phaseTransitionTimer = 90;
      this.invulnerable = true;
      this.state = 'recovering';
      this.stateTimer = 90;
      this.telegraph = null;
      this.currentAttack = null;
      this._activeAttack = null;
      this.hitEffects.push({
        x: this.x + this.width / 2,
        y: this.y - 20,
        text: '── PHASE ' + ['I', 'II', 'III'][this.phase - 1] + ' ──',
        life: 90,
        color: this.phase === 3 ? '#f87171' : '#c4b5fd'
      });
      if (typeof SFX !== 'undefined') SFX.bossPhase();
      // Phase 3 announcement
      if (this.phase === 3) {
        setTimeout(() => {
          if (this.hitEffects) this.hitEffects.push({
            x: this.x + this.width / 2, y: this.y - 40,
            text: '"You think stillness belongs to you?"',
            life: 140, color: '#fde68a'
          });
        }, 1200);
      }
    }

    if (this.phaseTransitionTimer > 0) {
      this.phaseTransitionTimer--;
      if (this.phaseTransitionTimer <= 0) this.invulnerable = false;
    }

    // Hit effects
    for (let i = this.hitEffects.length - 1; i >= 0; i--) {
      this.hitEffects[i].y -= 0.5;
      this.hitEffects[i].life--;
      if (this.hitEffects[i].life <= 0) this.hitEffects.splice(i, 1);
    }

    // Telegraph timer (scaled by myTimeScale)
    if (this.telegraph) {
      this.telegraph.timer -= myTimeScale;
      if (this.telegraph.timer <= 0) {
        this.executeAttack(player, bossProjectiles);
        this.telegraph = null;
      }
    }

    // Active-attack window for timer-cleared attacks (melee/heavy) —
    // dash_chain/tether_arrival clear `_activeAttack` explicitly at their
    // own state-exit points instead of using this timer.
    if (this._activeAttack === 'melee_forward' || this._activeAttack === 'melee_up' ||
        this._activeAttack === 'melee_down' || this._activeAttack === 'heavy') {
      this._activeAttackTimer -= myTimeScale;
      if (this._activeAttackTimer <= 0) this._activeAttack = null;
    }
    if (this._heavyDipTimer > 0) {
      this._heavyDipTimer -= myTimeScale;
      if (this._heavyDipTimer <= 0) this.y = BOSS_Y;
    }

    // Post-melee/heavy/shard stagger delay — a frame counter (not
    // setTimeout, which fires on wall-clock time regardless of pause/
    // hitstop/tab-visibility and could desync the boss's state from the
    // game loop). Set by executeAttack() below.
    if (this._staggerDelayTimer > 0) {
      this._staggerDelayTimer -= myTimeScale;
      if (this._staggerDelayTimer <= 0 && this.state === 'attacking') {
        this.state = 'staggered';
        this.stateTimer = 28;
      }
    }

    // Boss projectiles — normally slowed by player Stillpoint even in
    // Phase 3 (dodging her shots is still useful, only SHE is immune to
    // that one), but her own Phase 3 Stillpoint cast exempts her own
    // projectiles/beam from the slow it causes (mirrors how the player's
    // own projectiles already ignore gameTimeScale entirely) — narrower
    // than it sounds: only her own-cast case is newly exempted, the
    // player-cast asymmetry above is untouched.
    const projScale = this.bossStillpointActive ? 1.0 : _globalTS;
    for (let i = bossProjectiles.length - 1; i >= 0; i--) {
      const p = bossProjectiles[i];
      p.x += p.vx * projScale;
      p.y += p.vy * projScale;
      if (p.gravity) p.vy += 0.15 * projScale;
      p.life -= projScale;
      if (p.life <= 0 || p.x < -50 || p.x > arenaWidth + 50 || p.y > H + 50) {
        bossProjectiles.splice(i, 1);
      }
    }

    // State machine (uses myTimeScale for boss own timers)
    this.stateTimer -= myTimeScale;

    switch (this.state) {
      case 'entering':
        if (this.stateTimer <= 40) this.y = BOSS_Y;
        if (this.stateTimer <= 0) { this.state = 'idle'; this.stateTimer = 60; }
        break;

      case 'recovering':
        this.y = BOSS_Y + Math.sin(frameCount * 0.1) * 5;
        if (this.stateTimer <= 0) { this.state = 'idle'; this.stateTimer = 45; }
        break;

      case 'lunging':
        // Counter-Stillpoint / precognition lunge — surges at player position.
        this.x += this.lungeVx * myTimeScale;
        this.x = Math.max(20, Math.min(this.x, (arenaWidth || 900) - this.width - 20));
        this.lungeTimer -= myTimeScale;
        if (this.lungeTimer <= 0) {
          this.lungeVx = 0;
          this.state = 'idle';
          this.stateTimer = 35;
        }
        break;

      case 'idle':
        this.y = BOSS_Y;
        this.facing = player.x > this.x ? 1 : -1;

        // ── Continuous drift — boss always moves toward preferred distance ────
        {
          if (Math.random() < 0.01) this._preferredDistJitter = (Math.random() - 0.5) * 120;
          const preferredDist = 220 + this._preferredDistJitter;
          const bossCX = this.x + this.width / 2;
          const playerCX = player.x + player.width / 2;
          const dx = playerCX - bossCX;
          const dist = Math.abs(dx);
          const driftSpeed = [0, 1.2, 2.0, 3.2][this.phase] || 1.2;
          if (dist > preferredDist + 40) {
            this.vx = Math.sign(dx) * driftSpeed;  // too far → chase
          } else if (dist < preferredDist - 40) {
            this.vx = -Math.sign(dx) * driftSpeed; // too close → back off
          } else {
            this.vx *= 0.88; // in sweet spot → decelerate
          }
          this.x += this.vx * myTimeScale;
          this.x = Math.max(20, Math.min(this.x, (this.arenaWidth || 900) - this.width - 20));
        }

        // Track consecutive hit reset timer
        if (this.lastHitTimer > 0) {
          this.lastHitTimer -= myTimeScale;
          if (this.lastHitTimer <= 0) this.consecutiveHits = 0;
        }

        if (this.phase >= 2 && !this.shieldActive && this.shieldCooldown <= 0 && Math.random() < 0.015) {
          this.shieldActive = true;
          this.shieldHealth = this.shieldMaxHealth;
          this.shieldCooldown = 300;
        }
        if (this.shieldCooldown > 0) this.shieldCooldown -= myTimeScale;

        if (this.phase >= 2) {
          this.summonCooldown -= myTimeScale;
          if (this.summonCooldown <= 0) {
            this.doSummon();
            this.summonCooldown = this.phase === 3 ? 300 : 480;
          }
        }

        if (this.stateTimer <= 0) this.pickAttack();
        break;

      case 'teleporting':
        if (this.stateTimer === 10) {
          // Arrival flash — also where she actually reappears
          this.teleportFlash = 15;
          this.x = this.teleportTarget.x;
          this.y = this.teleportTarget.y;
        }
        if (this.teleportFlash > 0) this.teleportFlash--;
        if (this.stateTimer <= 0) {
          this.state = 'idle';
          this.stateTimer = 30;
        }
        break;

      // Dash-Chain — repurposed from the old Charge Rush: boss slides
      // across arena, her body is the hitbox, bounces off a wall into up
      // to 2 more legs (3 total) before staggering.
      case 'charging':
        this.x += this.chargeVx * myTimeScale;
        this.x = Math.max(20, Math.min(this.x, (this.arenaWidth || 900) - this.width - 20));
        if (this.x <= 20 || this.x >= (this.arenaWidth || 900) - this.width - 20) {
          if (this._chainLegsRemaining > 0) {
            this._chainLegsRemaining--;
            this.chargeVx = -this.chargeVx;
            this.stateTimer = 24; // shorter for chained legs — snappier than a single Charge Rush
          } else {
            this.chargeVx = 0;
            this._activeAttack = null;
            this.state = 'staggered';
            this.stateTimer = 35;
          }
        }
        if (this.stateTimer <= 0) {
          this._chainLegsRemaining = 0;
          this.chargeVx = 0;
          this._activeAttack = null;
          this.state = 'staggered';
          this.stateTimer = 35;
        }
        break;

      // Stagger — brief vulnerable window after attack, player should capitalise
      case 'staggered':
        this.vx *= 0.85;
        this.x += this.vx * myTimeScale;
        if (this.stateTimer <= 0) {
          this.state = 'idle';
          this.stateTimer = 40;
          this.attackCooldown = this.phase === 3 ? 20 : 35;
        }
        break;

      // Attacking — telegraph is ticking; boss slowly tracks player while winding up
      case 'attacking':
        this.y = BOSS_Y;
        this.facing = player.x > this.x ? 1 : -1;
        // Slow drift during wind-up so the boss isn't a stationary punching bag
        {
          const bossCX = this.x + this.width / 2;
          const playerCX = player.x + player.width / 2;
          const dx = playerCX - bossCX;
          const dist = Math.abs(dx);
          const trackSpeed = [0, 0.8, 1.4, 2.0][this.phase] || 0.8;
          if (dist > 250) this.x += Math.sign(dx) * trackSpeed * myTimeScale;
          this.x = Math.max(20, Math.min(this.x, (this.arenaWidth || 900) - this.width - 20));
        }
        if (this.stateTimer <= 0) {
          this.state = 'idle';
          this.stateTimer = 30;
        }
        break;

      // Phase-Dash / Wall-Burst — defensive reposition tools, no stagger
      // after (an escape, not an attack).
      case 'phase_dash':
        this.x += this.vx * myTimeScale;
        this.x = Math.max(20, Math.min(this.x, (this.arenaWidth || 900) - this.width - 20));
        if (this.phaseDashInvuln > 0) this.phaseDashInvuln -= myTimeScale;
        if (this.stateTimer <= 0) {
          this.vx *= 0.3;
          this.state = 'idle';
          this.stateTimer = 25;
        }
        break;

      case 'wall_burst':
        this.x += this.vx * myTimeScale;
        this.x = Math.max(20, Math.min(this.x, (this.arenaWidth || 900) - this.width - 20));
        if (this.wallBurstArcTimer > 0) {
          this.y = BOSS_Y - Math.sin(Math.max(0, (20 - this.wallBurstArcTimer) / 20) * Math.PI) * 30;
          this.wallBurstArcTimer -= myTimeScale;
        } else {
          this.y = BOSS_Y;
        }
        if (this.phaseDashInvuln > 0) this.phaseDashInvuln -= myTimeScale;
        if (this.stateTimer <= 0) {
          this.vx *= 0.3;
          this.y = BOSS_Y;
          this.state = 'idle';
          this.stateTimer = 25;
        }
        break;

      // Reversed Void Tether arrival — accelerates toward the player using
      // the same ramp formula the player's own tether-arrival uses
      // (game.js), lands via the generalized lunge-style motion (just a
      // direct arrival here, not a separate lunge call), then a brief
      // self-stagger so a whiff is punishable.
      case 'tether_arrival': {
        const bossCX = this.x + this.width / 2, bossCY = this.y + this.height / 2;
        const playerCX = player.x + player.width / 2, playerCY = player.y + player.height / 2;
        const dx = playerCX - bossCX, dy = playerCY - bossCY;
        const dist = Math.hypot(dx, dy) || 1;
        this._tetherPullTimer += myTimeScale;
        const rampedSpeed = 9 * Math.min(1, 0.35 + this._tetherPullTimer * 0.08);
        if (dist <= rampedSpeed + this.width / 2 || this.stateTimer <= 0) {
          this.x = Math.max(20, Math.min(playerCX - this.width / 2, (this.arenaWidth || 900) - this.width - 20));
          this.y = playerCY - this.height / 2;
          this._activeAttack = null;
          this.state = 'staggered';
          this.stateTimer = 30;
        } else {
          this.x += (dx / dist) * rampedSpeed * myTimeScale;
          this.y += (dy / dist) * rampedSpeed * myTimeScale;
        }
        break;
      }

      // Beam channel — continuous line-segment toward the player, tick
      // damage every ~6 frames, implemented as a boss.js-local per-frame
      // overlap check (not reusing the player's own beam function) —
      // self-contained, same shape as the Phase 3 aura below.
      case 'beam_channel': {
        this.y = BOSS_Y;
        this.facing = player.x > this.x ? 1 : -1;
        const beamW = 700;
        const beamRect = {
          x: this.facing === 1 ? this.x + this.width : this.x - beamW,
          y: this.y - 4, width: beamW, height: this.height + 8,
        };
        this._beamRect = beamRect;
        this.beamTick -= myTimeScale;
        if (this.beamTick <= 0 && typeof rectsOverlap === 'function' && rectsOverlap(beamRect, player) &&
            player.invincibleTimer <= 0 && !player.phaseDashing) {
          player.takeDamage(1);
          this.beamTick = 6;
        }
        if (this.stateTimer <= 0) {
          this._beamRect = null;
          this.state = 'staggered';
          this.stateTimer = 32;
        }
        break;
      }

      case 'dead':
        break;
    }

    // Phase 3 damage aura
    if (this.phase === 3 && !this.dead && this.state !== 'entering') {
      const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
      const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150 && player.invincibleTimer <= 0 && !player.phaseDashing) {
        // Tick damage every 30 frames
        if (!this.auraTick || this.auraTick <= 0) {
          this.auraTick = 30;
        }
        this.auraTick--;
        if (this.auraTick <= 0) {
          player.takeDamage(1);
          this.auraTick = 30;
        }
      } else {
        this.auraTick = 0;
      }
    }

    // Visual bridge to game/animdata.js (2026-07-20, enemy_attack_
    // vocabulary_plan.md's anim_editor bridging) — additive, same
    // fallback rule as the player/ComposedEnemy: an ANIM_DEFS key drawn in
    // editor/anim_editor.html under `boss_<state>` (see bossAnimStateKey()
    // below) overrides the procedural draw() below it; nothing authored
    // means zero behavior change. Guarded exactly like ComposedEnemy's own
    // hook so an unauthored boss costs nothing and never spams Animator's
    // no-animation-named console.warn.
    this._animKey = this.bossAnimStateKey();
    if (typeof ANIM_DEFS !== 'undefined' && ANIM_DEFS[this._animKey]) {
      this.animator.play(this._animKey);
      this.animator.update(_globalTS);
      this._consumeFrameEvents(bossProjectiles);
    }
  }

  // ── Frame events (2026-07-27) ────────────────────────────────────────
  // Authored per-frame side effects (editor/anim_editor.html's "Frame
  // Events" list, game/animdata.js's Animator.consumeFrameEvents()) —
  // fires once, the tick a frame is first entered. Additive: only runs at
  // all when an ANIM_DEFS key is authored for the current bossAnimStateKey()
  // (see the call site above), same fallback contract as every other
  // anim-bridge hook in this file. Unknown event types are silently
  // ignored so an editor-side typo can't throw mid-fight.
  _consumeFrameEvents(bossProjectiles) {
    const events = this.animator.consumeFrameEvents();
    for (const ev of events) {
      if (ev.type === 'cameraShake') {
        if (typeof screenShake !== 'undefined') {
          screenShake = Math.max(screenShake, ev.shake ?? 10);
          screenShakeIntensity = Math.max(screenShakeIntensity, ev.intensity ?? 5);
        }
      } else if (ev.type === 'sfx') {
        if (typeof SFX !== 'undefined' && typeof SFX[ev.name] === 'function') SFX[ev.name]();
      } else if (ev.type === 'spawnProjectile') {
        let vx, vy;
        if (ev.aimAtPlayer) {
          const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
          const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
          const dist = Math.hypot(dx, dy) || 1;
          const speed = ev.speed ?? 5;
          vx = (dx / dist) * speed;
          vy = (dy / dist) * speed;
        } else {
          vx = (ev.vx ?? 0) * this.facing;
          vy = ev.vy ?? 0;
        }
        const w = ev.width ?? 12, h = ev.height ?? 12;
        bossProjectiles.push({
          x: this.x + this.width / 2 - w / 2,
          y: this.y + this.height / 2 - h / 2,
          vx, vy, width: w, height: h,
          life: ev.life ?? 160, gravity: !!ev.gravity,
          type: ev.projType || 'orb',
          damage: ev.damage ?? 1,
          knockback: { vx: ev.knockbackX ?? 4, vy: ev.knockbackY ?? -3, hitStun: ev.hitStun ?? 10 },
        });
      }
    }
  }

  // `boss_<attack-or-state>` convention. Three tiers, most specific first:
  // telegraph (windup) > active-attack (hitbox-live window, 2026-07-27,
  // see getAttackHitbox()'s anim-driven path below) > this.state (idle/
  // recovering/etc). Same fallback rule as everywhere else in this bridge:
  // an unauthored key at any tier just means the caller's ANIM_DEFS lookup
  // misses and procedural draw/hardcoded hitboxes take over unchanged.
  bossAnimStateKey() {
    if (this.dead) return 'boss_dead';
    if (this.telegraph) return `boss_${this.telegraph.type}`;
    if (this._activeAttack) return `boss_active_${this._activeAttack}`;
    return `boss_${this.state}`;
  }

  // ── Attack selection ─────────────────────────────────────────────────
  // Phase 1: restrained kit — precognition (readPlayerTell/precogCounter)
  // carries most of the real threat; this roll is baseline pressure between
  // reads. Phase 2+: full kit except Stillpoint (Phase 3 reserves its own
  // high-priority slot below). Adaptation bias (existing system) nudges the
  // roll toward whichever approach the player under-uses.
  pickAttack() {
    if (this.attackCooldown > 0) {
      this.attackCooldown--;
      this.state = 'idle';
      this.stateTimer = 30;
      return;
    }

    // Reserved slot (Phase 3's Stillpoint) — checked first, on its own
    // active/cooldown fields, a centerpiece move rather than a table entry.
    const rs = BOSS_PHASE_CONFIG.reservedSlot;
    if (this.phase === rs.phase && !this[rs.activeField] && this[rs.cooldownField] <= 0 && Math.random() < rs.chance) {
      this[rs.startMethod]();
      return;
    }

    const tp = BOSS_PHASE_CONFIG.teleport;
    if (this.phase >= tp.minPhase && Math.random() < tp.chance) {
      this[tp.startMethod](this.arenaWidth);
      return;
    }

    const cfg = BOSS_PHASE_CONFIG.phases[this.phase];
    const prefersRange = this.adapt.rangedHits > this.adapt.meleeHits + cfg.preferMargin;
    const prefersMelee = this.adapt.meleeHits > this.adapt.rangedHits + cfg.preferMargin;

    // Current spacing to the player, on top of the style-adaptation above —
    // she reads the fight moment-to-moment as well as the long-run pattern.
    // Positive bias pushes the roll toward the ranged end of the table
    // (she's far, no reason to walk into melee range this cycle); negative
    // pushes toward the close end (she's already on top of the player).
    const bossCX = this.x + this.width / 2;
    const distNow = Math.abs((player.x + player.width / 2) - bossCX);
    const distBias = distNow > cfg.distanceFar ? cfg.distanceBias : distNow < cfg.distanceNear ? -cfg.distanceBias : 0;

    let r = Math.random();
    if (prefersRange) r += cfg.preferRangedShift;
    if (prefersMelee) r += cfg.preferMeleeShift;
    r += distBias;

    this[resolveWeightedAttackName(cfg.attacks, r)]();
  }

  // Generalized landing motion — short telegraph then a fast surge. Reused
  // by the counter-Stillpoint response (any phase, via precogCounter) and
  // by the old Phase-3-only reactive trigger above (update()'s spNow check).
  _startLunge(player) {
    this.teleportFlash = 12;
    const dir = player.x > this.x ? 1 : -1;
    this.lungeVx = dir * 11;
    this.state = 'lunging';
    this.stateTimer = 30;
    this.lungeTimer = 28;
    this.surgeCooldown = 180;
  }

  // ── Melee combo — short telegraph (~14f, an arrogant flourish, not
  // silence), directional hitbox (forward/up/down) scaled ~1.8x off the
  // player's own attackVFX boxes for her size. ─────────────────────────
  startMeleeSwing() {
    const cy = this.y + this.height / 2;
    const above = player.y + player.height / 2 < cy - 40;
    const below = player.y + player.height / 2 > cy + 40;
    this.meleeDir = above ? 'up' : below ? 'down' : 'forward';
    this.facing = player.x > this.x ? 1 : -1;
    this.telegraph = { type: 'melee', dir: this.meleeDir, timer: 14, duration: 14 };
    this.state = 'attacking';
    this.stateTimer = 20;
    this.attackCooldown = this.phase === 1 ? 55 : 30;
    if (typeof SFX !== 'undefined') SFX.bossTelegraph();
  }

  // ── Charged Heavy — long telegraph (~40f, escalating glow), big hitbox
  // on release. See attackDefs.heavy for the tuned knockback. ──────────
  startChargedHeavy() {
    this.facing = player.x > this.x ? 1 : -1;
    this.telegraph = { type: 'heavy', timer: 40, duration: 40 };
    this.state = 'attacking';
    this.stateTimer = 46;
    this.attackCooldown = this.phase === 3 ? 55 : 80;
    if (typeof SFX !== 'undefined') SFX.bossTelegraphSlam();
  }

  // ── Dash-Chain (offensive) — burst velocity, chainable up to 3 legs,
  // ends in the existing punishable staggered state. ───────────────────
  startDashChain() {
    const dir = (player.x > this.x + this.width / 2) ? 1 : -1;
    this.chargeVx = dir * 11;
    this.telegraph = { type: 'dash_chain', dir, timer: 26, duration: 26 };
    this.state = 'attacking';
    this.stateTimer = 32;
    this.attackCooldown = this.phase === 3 ? 20 : 40;
    this._chainLegsRemaining = 2; // up to 2 more legs after this one = 3 total
    if (typeof SFX !== 'undefined') SFX.bossTelegraphCharge();
  }

  // ── Phase-Dash (defensive) — short burst + brief invincibility, no
  // stagger after. Dashes AWAY from the player (reposition/escape, unlike
  // Dash-Chain's toward-player aggression). ────────────────────────────
  startPhaseDash() {
    const dir = (player.x > this.x + this.width / 2) ? -1 : 1;
    this.phaseDashInvuln = 13;
    this.vx = dir * 13;
    this.state = 'phase_dash';
    this.stateTimer = 16;
    this.attackCooldown = 20; // short — an escape tool, shouldn't lock her out of acting
    this._activeAttack = null;
    if (typeof SFX !== 'undefined' && SFX.bossTeleportOut) SFX.bossTeleportOut();
  }

  // ── Wall-Burst — edge-triggered reposition with a vertical arc, only
  // fires when actually near an arena wall (retreat-driven); silently
  // falls back to idle otherwise so pickAttack() never wastes the roll on
  // an impossible activation. ───────────────────────────────────────────
  startWallBurst() {
    const nearLeftWall = this.x <= 60;
    const nearRightWall = this.x >= (this.arenaWidth || 900) - this.width - 60;
    if (!nearLeftWall && !nearRightWall) {
      this.state = 'idle';
      this.stateTimer = 20;
      return;
    }
    const dir = nearLeftWall ? 1 : -1;
    this.vx = dir * 11;
    this.wallBurstArcTimer = 20;
    this.phaseDashInvuln = 10;
    this.state = 'wall_burst';
    this.stateTimer = 26;
    this.attackCooldown = 40;
    if (typeof SFX !== 'undefined' && SFX.wallJump) SFX.wallJump();
  }

  // ── Reversed Void Tether (Phase 2+) — visible corrupted-tether telegraph
  // (reddish, not the player's teal) for a fair warning window, then
  // accelerates toward the player (see 'tether_arrival' state above).
  startReversedVoidTether() {
    this.telegraph = { type: 'tether', timer: 35, duration: 35 };
    this.state = 'attacking';
    this.stateTimer = 40;
    this.attackCooldown = this.phase === 3 ? 70 : 100;
    if (typeof SFX !== 'undefined') SFX.bossTelegraphCharge();
  }

  // ── Shard Shot — short aim-beat telegraph, one aimed projectile.
  // damage/knockback set directly on the pushed object — the concrete case
  // the damage-plumbing fix exists for on the projectile side. ─────────
  startShardShot() {
    this.telegraph = { type: 'shard', timer: 22, duration: 22 };
    this.state = 'attacking';
    this.stateTimer = 30;
    this.attackCooldown = this.phase === 1 ? 90 : 55; // restrained cadence Phase 1, full cadence Phase 2+
    if (typeof SFX !== 'undefined') SFX.bossTelegraphTriple();
  }

  // ── Beam channel (Phase 2+) — repurposes the old Ultimate beam's
  // telegraph shape; the actual channel is the 'beam_channel' state above.
  startBeamChannel() {
    this.telegraph = { type: 'beam_telegraph', timer: 45, duration: 45 };
    this.state = 'attacking';
    this.stateTimer = 50;
    this.attackCooldown = this.phase === 3 ? 90 : 130;
    if (typeof SFX !== 'undefined') SFX.bossTelegraphUltimate();
  }

  // ── Phase 3 Stillpoint — the real centerpiece. Nova's old radial-burst
  // VFX becomes the activation burst (cosmetic particles only now, not a
  // damaging attack roll); the actual slow is driven by
  // bossStillpointActive/Timer, read by game.js's gameTimeScale assignment
  // and by player.timeScale. ────────────────────────────────────────────
  startBossStillpoint() {
    this.telegraph = { type: 'stillpoint_burst', timer: 55, duration: 55 };
    this.state = 'attacking';
    this.stateTimer = 65;
    this.attackCooldown = 40; // her own post-burst acting cooldown — the slow itself runs on bossStillpointTimer/Cooldown separately
    if (typeof SFX !== 'undefined' && SFX.bossTelegraphNova) SFX.bossTelegraphNova();
  }

  startTeleport(arenaWidth) {
    this.teleportTarget = {
      x: 40 + Math.random() * ((arenaWidth || 900) - 80),
      y: BOSS_Y
    };
    this.state = 'teleporting';
    this.stateTimer = 25;
    this.attackCooldown = 40;
    if (typeof SFX !== 'undefined') SFX.bossTeleportOut();
    // Vanish
    this.x = -200;
  }

  doSummon() {
    // Signal game.js to spawn enemies
    this.summonData = {
      left: { x: 60, y: 334 },
      right: { x: 740, y: 334 }
    };
  }

  executeAttack(player, bossProjectiles) {
    if (!this.telegraph) return;
    const t = this.telegraph;

    if (t.type === 'melee') {
      this._activeAttack = 'melee_' + t.dir;
      this._activeAttackTimer = 10;
      if (typeof SFX !== 'undefined') SFX.bossHit();
    }

    if (t.type === 'heavy') {
      this._activeAttack = 'heavy';
      this._activeAttackTimer = 14;
      this.y = BOSS_Y - 15;
      this._heavyDipTimer = 7; // ~120ms at 60fps — frame counter, not setTimeout (see update())
      if (typeof screenShake !== 'undefined') {
        screenShake = Math.max(screenShake, 16);
        screenShakeIntensity = Math.max(screenShakeIntensity, 8);
      }
      if (typeof SFX !== 'undefined') SFX.bossHit();
    }

    if (t.type === 'shard') {
      const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
      const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      bossProjectiles.push({
        x: this.x + this.width / 2 - 6,
        y: this.y + this.height / 2 - 6,
        vx: (dx / dist) * 5,
        vy: (dy / dist) * 5,
        width: 12, height: 12,
        life: 160, gravity: false,
        type: 'orb',
        damage: 1,
        knockback: { vx: 4, vy: -3, hitStun: 10 },
      });
    }

    if (t.type === 'stillpoint_burst') {
      if (typeof spawnParticles !== 'undefined') {
        spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#f87171', 18);
        spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#fde68a', 12);
      }
      if (typeof screenShake !== 'undefined') {
        screenShake = Math.max(screenShake, 30);
        screenShakeIntensity = Math.max(screenShakeIntensity, 8);
      }
      this.bossStillpointActive = true;
      this.bossStillpointTimer = 150; // ~2.5s — a real centerpiece window
      this.bossStillpointCooldown = 420;
      this.hitEffects.push({
        x: this.x + this.width / 2, y: this.y - 40,
        text: '"You think stillness belongs to you?"',
        life: 140, color: '#fde68a',
      });
      if (typeof SFX !== 'undefined' && SFX.bossStillpointStart) SFX.bossStillpointStart();
    }

    if (t.type === 'dash_chain') {
      this.state = 'charging';
      this.stateTimer = 34;
      this.vx = this.chargeVx;
      this._activeAttack = 'dash_chain';
      if (typeof SFX !== 'undefined') SFX.bossHit();
      return; // state already set, don't fall through to idle below
    }

    if (t.type === 'tether') {
      this.state = 'tether_arrival';
      this.stateTimer = 90; // safety cap — normal arrival resolves well before this via distance check
      this._tetherPullTimer = 0;
      this._activeAttack = 'tether_arrival';
      return;
    }

    if (t.type === 'beam_telegraph') {
      this.state = 'beam_channel';
      this.stateTimer = 90; // ~1.5s channel
      this.beamTick = 0;
      return;
    }

    // After melee/heavy/shard, enter a short stagger (vulnerable window) —
    // ~200ms at 60fps, driven by the frame counter in update() above.
    if (t.type === 'melee' || t.type === 'heavy' || t.type === 'shard') {
      this._staggerDelayTimer = 12;
    }

  }

  draw(ctx) {
    if (this.dead && this.deathTimer > 60) return;

    // Dead fade + dissipation
    if (this.dead) {
      const deathProgress = this.deathTimer / 60;
      ctx.globalAlpha = Math.max(0, 1 - deathProgress);

      // Fragment body on death - draw scattered pieces
      if (this.deathTimer > 0) {
        const fragmentCount = Math.min(12, Math.floor(this.deathTimer / 3));
        ctx.fillStyle = this.phase === 3 ? '#f87171' : this.phase === 2 ? '#c084fc' : '#8b5cf6';
        for (let i = 0; i < fragmentCount; i++) {
          const angle = (i / fragmentCount) * Math.PI * 2 + this.deathTimer * 0.05;
          const distance = this.deathTimer * 1.5;
          const fx = this.x + this.width / 2 + Math.cos(angle) * distance;
          const fy = this.y + this.height / 2 + Math.sin(angle) * distance;
          const size = Math.max(2, 8 - this.deathTimer * 0.1);
          ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 60);
          ctx.fillRect(fx - size / 2, fy - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
        return;
      }
    }

    // Teleport flash (vanish)
    if (this.state === 'teleporting' && this.stateTimer > 10) {
      ctx.globalAlpha *= 0.3;
    }

    // Phase transition flash
    if (this.phaseTransitionTimer > 0 && this.phaseTransitionTimer % 6 < 3) {
      ctx.globalAlpha *= 0.5;
    }

    // Invulnerability flash (parry-stun invuln + the new Phase-Dash/
    // Wall-Burst i-frames both read as the same visual tell)
    if (this.invulnerable || this.phaseDashInvuln > 0) {
      ctx.globalAlpha *= (Math.sin(frameCount * 0.4) * 0.4 + 0.5);
    }

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    // Teleport vortex effect
    if (this.state === 'teleporting') {
      const vortexAlpha = this.stateTimer < 10 ? this.stateTimer / 10 : Math.max(0, 1 - (this.stateTimer - 10) / 10);
      for (let i = 0; i < 3; i++) {
        const radius = 20 + i * 15 + Math.sin(frameCount * 0.15 + i) * 10;
        ctx.strokeStyle = `rgba(196, 181, 253, ${vortexAlpha * (0.5 - i * 0.15)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, frameCount * 0.1 * (i % 2 === 0 ? 1 : -1), frameCount * 0.1 * (i % 2 === 0 ? 1 : -1) + Math.PI * 1.5);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    }

    // Aura glow (phase 3)
    if (this.phase === 3 && !this.dead) {
      const auraPulse = Math.sin(frameCount * 0.08) * 0.15 + 0.2;
      ctx.fillStyle = `rgba(248, 113, 113, ${auraPulse})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 100 + Math.sin(frameCount * 0.1) * 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Phase 3 Stillpoint activation — escalated presentation, a harsher/
    // bigger pulse than the ordinary phase-3 aura above.
    if (this.bossStillpointActive) {
      const pulse = Math.sin(frameCount * 0.25) * 0.2 + 0.35;
      ctx.strokeStyle = `rgba(248, 113, 113, ${pulse})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, 140 + Math.sin(frameCount * 0.12) * 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Beam channel — continuous line-segment visual
    if (this.state === 'beam_channel' && this._beamRect) {
      const b = this._beamRect;
      ctx.fillStyle = 'rgba(255, 40, 40, 0.75)';
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.fillStyle = 'rgba(255, 200, 200, 0.85)';
      ctx.fillRect(b.x, b.y + b.height * 0.3, b.width, b.height * 0.4);
    }

    // Idle bob animation
    const idleBob = this.state === 'idle' ? Math.sin(frameCount * 0.04) * 2 : 0;

    // Body/Core/Eyes — visual bridge to game/animdata.js (see update()'s
    // hook comment). Additive: falls back to the original procedural
    // body/core/eyes draw exactly as before when no `boss_<state>` key is
    // authored. Every overlay above and below this block (aura, teleport
    // vortex, phase shimmer, lunge trail) still draws regardless — same
    // "overlays are separate from body art" rule the player/ComposedEnemy
    // bridges already use.
    if (typeof ANIM_DEFS !== 'undefined' && ANIM_DEFS[this._animKey]) {
      this.animator.draw(ctx);
    } else {
      const bodyColor = this.flashTimer > 0 ? '#ffffff' : this.phase === 3 ? '#f87171' : this.phase === 2 ? '#c084fc' : '#8b5cf6';
      ctx.fillStyle = bodyColor;
      ctx.fillRect(this.x + 4, this.y + 4 + idleBob, this.width - 8, this.height - 8);

      // Core
      ctx.fillStyle = '#e0d4ff';
      ctx.fillRect(this.x + 12, this.y + 12 + idleBob, this.width - 24, this.height - 24);

      // Eyes — white during lunge (Stillpoint counter-lunge tell), red otherwise
      const eyeIsWhite = this.state === 'lunging' || this.teleportFlash > 0;
      ctx.fillStyle = eyeIsWhite ? '#ffffff' : '#ff3333';
      const eyeY = this.y + 18 + idleBob;
      ctx.fillRect(this.x + 14, eyeY, 6, 4);
      ctx.fillRect(this.x + this.width - 20, eyeY, 6, 4);
    }

    // Phase 3: faint shimmer outline showing Stillpoint immunity
    if (this.phase >= 3) {
      const shimmer = Math.sin(frameCount * 0.12) * 0.15 + 0.25;
      ctx.strokeStyle = `rgba(255, 100, 100, ${shimmer})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x - 3, this.y - 3 + idleBob, this.width + 6, this.height + 6);
      ctx.lineWidth = 1;
    }

    // Lunge trail — motion blur effect
    if (this.state === 'lunging') {
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.35 - i * 0.1;
        ctx.fillStyle = '#f87171';
        ctx.fillRect(this.x - this.lungeVx * i * 1.5, this.y + idleBob, this.width, this.height);
      }
      ctx.globalAlpha = 1;
    }

    // Shield
    if (this.shieldActive) {
      const shieldX = this.facing === 1 ? this.x + this.width - 2 : this.x - 10;
      const shieldPulse = Math.sin(frameCount * 0.1) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(103, 232, 249, ${shieldPulse})`;
      ctx.fillRect(shieldX, this.y - 4 + idleBob, 12, this.height + 8);
      ctx.strokeStyle = `rgba(103, 232, 249, ${shieldPulse * 0.5})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(shieldX - 2, this.y - 6 + idleBob, 16, this.height + 12);
      ctx.lineWidth = 1;
    }

    ctx.globalAlpha = 1;

    // Hit effects
    for (const eff of this.hitEffects) {
      const alpha = Math.min(1, eff.life / 15);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = eff.color;
      ctx.font = eff.text.length > 8 ? 'bold 11px monospace' : eff.text.length > 5 ? 'bold 14px monospace' : 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(eff.text, eff.x, eff.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  drawTelegraphs(ctx) {
    if (!this.telegraph || this.dead) return;
    const t = this.telegraph;
    const progress = 1 - t.timer / t.duration;

    if (t.type === 'melee') {
      const alpha = 0.2 + progress * 0.4;
      ctx.fillStyle = `rgba(196, 181, 253, ${alpha})`;
      const cx = this.x + this.width / 2, cy = this.y + this.height / 2;
      const r = 14 + progress * 24;
      const ox = t.dir === 'up' ? 0 : t.dir === 'down' ? 0 : this.facing * 40;
      const oy = t.dir === 'up' ? -40 : t.dir === 'down' ? 40 : 0;
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (t.type === 'heavy') {
      // Escalating glow — grows and brightens across the full 40f windup.
      const cx = this.x + this.width / 2, cy = this.y + this.height / 2;
      const pulse = Math.sin(frameCount * 0.3) * 0.15 + 0.25;
      ctx.fillStyle = `rgba(255, 80, 80, ${pulse + progress * 0.4})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 20 + progress * 60, 0, Math.PI * 2);
      ctx.fill();
      if (progress > 0.75) {
        ctx.fillStyle = `rgba(255, 80, 80, ${(progress - 0.75) * 4})`;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('HEAVY', cx, this.y - 14);
      }
    }

    if (t.type === 'shard') {
      const alpha = progress < 0.6 ? 0.2 : 0.5;
      ctx.fillStyle = `rgba(103, 232, 249, ${alpha})`;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 8 + progress * 6, 0, Math.PI * 2);
      ctx.fill();
    }

    if (t.type === 'tether') {
      // Corrupted (reddish, not the player's teal) tether warning line.
      const cx = this.x + this.width / 2, cy = this.y + this.height / 2;
      const pcx = player.x + player.width / 2, pcy = player.y + player.height / 2;
      const alpha = 0.15 + progress * 0.35;
      ctx.strokeStyle = `rgba(248, 113, 113, ${alpha})`;
      ctx.lineWidth = 2 + progress * 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(pcx, pcy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
      if (progress > 0.7) {
        ctx.fillStyle = `rgba(248, 113, 113, ${(progress - 0.7) * 3})`;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TETHER', cx, this.y - 14);
      }
    }

    if (t.type === 'beam_telegraph') {
      const alpha = 0.3 + Math.sin(frameCount * 0.3) * 0.15;
      const w = 60 + progress * 100;
      const x = this.facing === 1 ? this.x + this.width : this.x - w;
      ctx.fillStyle = `rgba(255, 30, 30, ${alpha})`;
      ctx.fillRect(x, this.y - 6, w, this.height + 12);
      ctx.fillStyle = '#ff4040';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BEAM', this.x + this.width / 2, this.y - 14);
    }

    if (t.type === 'dash_chain') {
      // Red horizontal arrow showing the dash direction, growing as timer runs.
      const arrowLen = 80 + progress * 120;
      const arrowX = t.dir === 1 ? this.x + this.width + 8 : this.x - 8 - arrowLen;
      const arrowY = this.y + this.height / 2;
      const alpha = 0.3 + progress * 0.6;
      ctx.fillStyle = `rgba(248, 50, 50, ${alpha})`;
      ctx.fillRect(arrowX, arrowY - 5, arrowLen, 10);
      ctx.beginPath();
      if (t.dir === 1) {
        ctx.moveTo(arrowX + arrowLen,     arrowY);
        ctx.lineTo(arrowX + arrowLen - 14, arrowY - 12);
        ctx.lineTo(arrowX + arrowLen - 14, arrowY + 12);
      } else {
        ctx.moveTo(arrowX,     arrowY);
        ctx.lineTo(arrowX + 14, arrowY - 12);
        ctx.lineTo(arrowX + 14, arrowY + 12);
      }
      ctx.fill();
      if (progress > 0.75) {
        ctx.fillStyle = `rgba(255, 80, 80, ${(progress - 0.75) * 4})`;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DASH', this.x + this.width / 2, this.y - 12);
      }
    }

    if (t.type === 'stillpoint_burst') {
      const alpha = 0.15 + Math.sin(frameCount * 0.3) * 0.1;
      ctx.strokeStyle = `rgba(251, 191, 36, ${alpha + progress * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 120 * progress, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    ctx.textAlign = 'left';
  }
}

// Draw boss projectiles
function drawBossProjectiles(ctx, projectiles) {
  for (const p of projectiles) {
    if (p.type === 'beam') {
      ctx.fillStyle = `rgba(255, 40, 40, 0.8)`;
      ctx.fillRect(p.x, p.y, p.width, p.height);
      // Beam core
      ctx.fillStyle = `rgba(255, 200, 200, 0.9)`;
      ctx.fillRect(p.x, p.y + p.height * 0.3, p.width, p.height * 0.4);
    } else if (p.type === 'slam') {
      ctx.fillStyle = `rgba(248, 113, 113, 0.7)`;
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.fillStyle = `rgba(255, 200, 200, 0.5)`;
      ctx.fillRect(p.x + 10, p.y + 2, p.width - 20, p.height - 4);
    } else {
      ctx.fillStyle = p.type === 'nova' ? '#fbbf24' : '#c4b5fd';
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
