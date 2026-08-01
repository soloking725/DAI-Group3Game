# Stillpoint — Development Roadmap & Status

This is the living dev-status doc: what's done, what's partial, what's not
started, and implementation notes/decisions made along the way. It used to
live as an HTML comment at the top of `index.html`; it's moved here so
`index.html` stays a clean HTML file and this doc is easier to scan/edit
on its own. `expansion.md` is the forward-looking design/feature plan —
this file is the changelog-ish record of what's actually been built
against that plan.

Update the checkboxes/notes here as work happens. Legend: [x] done,
[~] partially done / done differently (see note), [ ] not started.

> **Note on Phase 2 (Enemies) below:** the Lancer/Mage/Tank items (2.2–2.4)
> predate `expansion.md`'s full 25+2 enemy roster and 13-region world. Treat
> them as superseded/absorbed — Lancer → **Void Lancer**, Mage → **Phase
> Mage**, Tank → **Null-Gravity Brute**, all now specced with counters and
> home regions in `expansion.md` Phase 2. Build against that roster, not
> this section, for new enemy work; this checklist entry stays only as a
> historical pointer.

```
═══════════════════════════════════════════════════════════════════════════
STILLPOINT — DEVELOPMENT ROADMAP & STATUS
(kept here so any session working on this repo has full context without
needing the plan re-pasted — update the checkboxes/notes as work happens)
═══════════════════════════════════════════════════════════════════════════

LEGEND: [x] done   [~] partially done / done differently, see note   [ ] not started

DESIGN DECISIONS FROM THE USER (apply to all future phases):
  See `CLAUDE.md`'s "Explicit design decisions" section for the full,
  up-to-date list (no charms, no boxed HUD panels, browser/canvas only,
  lore OFF pending redesign, no lock-and-key gating) — that file is the
  single source of truth for these; not re-listed here to avoid drift.

DESIGN NOTE (added 2026-07-15) — the game is a loop, the Sovereign should
always be stronger than the player:
  The Sovereign fused every other Stillpoint into herself, so structurally
  she should never feel like a fair fight in raw power — the player wins
  through the same toolkit-mastery loop the whole game teaches (dash,
  Phase Dash, Stillpoint, melee timing), not by out-scaling her stats.
  Two concrete implications for future boss/final-fight work:
    - The Sovereign's kit should echo the player's own abilities back at
      them (a "you vs. a stronger you" fight) rather than being a wholly
      unrelated moveset — e.g. her own Stillpoint-adjacent time tricks,
      dash-like gap closers, phase-adjacent teleports. Loosely similar
      to how `expansion.md`'s Mirror King (4.2) already copies player
      movement/reflects damage — that fight's pattern is a reasonable
      template for the Sovereign herself, not just a one-off miniboss gimmick.
    - "Stronger than you" should read as raw power/scale (more HP, harder
      hits, bigger AoE), not as a wider ability kit than the player has —
      the player should never need an ability they don't have to answer
      her (see the Charged Attack/Graviton Surge removal from The Rift's
      entry requirements, 2026-07-15 — same philosophy: minimize hard
      ability gates on critical-path content, keep difficulty as a skill
      check instead of a checklist).
  Not yet built or scoped into a phase — flagging here so it's on record
  before the actual final-boss (`boss.js`'s King/Sovereign) rework starts.

─────────────────────────────────────────────────────────────────────────────
PHASE 0 — Core UX & Quality of Life
─────────────────────────────────────────────────────────────────────────────
[x] 0.1 Full-screen Canvas UI
      - Removed dead HTML overlay DOM refs (#ui/#ability-bar/#boss-health-
        container/#controls-hint didn't exist in index.html anymore but
        game.js still wrote to them every frame -> silent TypeError that broke
        the HUD entirely). Fixed by drawing everything on canvas: drawHUD(),
        drawHealthHearts(), drawAreaLabel(), drawBossHealthBar(),
        drawControlsHint() (fades ~10s in), all in game.js.
      - Added REAL Fullscreen API support beyond what the task asked for:
        toggleFullscreen()/resizeCanvasToFit() in game.js, F key + #fullscreen-
        btn in index.html. Canvas keeps 800x450 internal resolution, CSS-scaled
        to fit viewport/monitor preserving aspect ratio.
      - Ability-icon boxes (Phase Dash/Shard Shot HUD panel) were built, then
        REMOVED per user feedback ("don't want the C/V button things on
        screen"). Replaced with drawDashCooldownRing() — small rings under the
        player's feet, one per ability, visible ONLY while on cooldown
        (violet=dash, purple=phase dash, teal=shard shot). No permanent panel.
[x] 0.2 Tutorial Intro Stage
      - Added area.tutorial_area in area.js: isolated room, 3 platforms,
        jump gap -> training dummy (area.trainingDummy) -> dash gap -> sealed
        door (requires: 'tutorial_complete').
      - tutorialState { moved, jumped, attacked, dashed } tracked in game.js
        via updateTutorial(area), called every frame while
        currentAreaId === 'tutorial_area'.
      - Door gate uses the existing trans.requires pattern (see the two
        `trans.requires === ...` blocks in update() and draw()) — added
        'tutorial_complete' alongside phase_dash/shard_shot/stillpoint/boss_gate.
      - Escape SKIPS the tutorial (skipTutorial() -> switchArea('the_fracture',
        60, 310)) instead of opening pause, ONLY while in tutorial_area; pause
        behaves normally everywhere else (verified both paths headlessly).
      - Phase Dash is NOT granted early — "demonstrate early" was interpreted
        as a one-shot non-blocking notification after the player dashes for
        the first time ("Later: Phase Dash crosses gaps like this mid-air"),
        not as literally handing them the ability.
      - Gaps are intentionally sized to be crossable by a normal running jump
        too (no physics-precise dash-only gap), so a player can NEVER get
        soft-locked — tutorialState.dashed just requires dashing ANYWHERE in
        the room, not specifically across that gap.
      - Still open / not done: no intro text before the MOVE step; feel/pacing
        hasn't been played by a human yet (only headless-simulated).
[x] 0.3 Visual Cooldown Indicators
      - Delivered as part of 0.1's redesign (drawDashCooldownRing covers
        dash/phase dash/shard shot). The "rings around ability icons" version
        is moot since the icon panel itself was removed per user feedback —
        treating this as done via the ring-based replacement.
[x] 0.4 Persistent Save / Load
      - localStorage-backed, key 'stillpoint_save_v1'. saveGame()/loadGame()/
        hasSaveGame()/deleteSave() in game.js, all localStorage access wrapped
        in try/catch (private browsing / quota / locked-down env -> silently
        no persistence, never a crash).
      - Saves: currentAreaId, player {x,y,health,fractureMeter}, abilityState
        (the 3 booleans, not cooldowns), stillpointActivated, lastStillpoint,
        discoveredAreas, collectedLore, bossDefeated, tutorialState.
      - Auto-save triggers wired at the 3 spots the plan asked for: Stillpoint
        checkpoint activation (only on an actually-new checkpoint, not every
        frame standing near one), area transitions (end of switchArea()), and
        every ability pickup. Also added on boss-defeat/victory-return since
        that path changes area without going through switchArea().
      - Menu now shows "Continue" (loads save) vs "N : New Game" when a save
        exists, otherwise just the original "Begin" prompt. startNewGame()
        holds the fresh-run setup (factored out of the old inline menu code)
        so both the menu-click path and the N-key path share it.
      - Verified headlessly: save after tutorial-skip and after a real ability
        pickup, wiped all live state, loadGame() restored area/position/
        abilities/discoveredAreas correctly, ran 60 more frames with the
        restored state with no errors, then confirmed New Game resets
        everything back to a fresh tutorial run.
[x] 0.5 Quick Respawn / Pause Menu (Resume/Return to Stillpoint/Restart Room/
        Quit to Menu — menu panel with arrow key navigation + Enter select.
        ESC to resume. Game over screen has R:Respawn and ESC:Quit to Menu.
        "Quit to Menu" explicitly preserves saves — deleteSave() calls removed.)
[x] 0.6 Accessibility Toggles (Screen Shake ON/OFF + Hitstop ON/OFF, wired
        into the pause menu. Settings persist via localStorage key
        'stillpoint_settings_v1'. Respected at both the draw (screen shake)
        and update (hitstop) call sites.)

─────────────────────────────────────────────────────────────────────────────
PHASE 1 — Movement & Combat Overhaul
─────────────────────────────────────────────────────────────────────────────
[x] 1.1 Directional Melee Attacks (forward/up/down, pogo bounce on down-slam)
[x] 1.2 Chained Dash + Phase Dash Parkour (mid-air chaining, momentum carry)
[x] 1.3 Knockback & Aerial Juggling
[x] 1.4 Combat Feedback Polish (per-attack hitstop/shake, slow-mo kill cam)
[x] 1.5 Player Parry / Deflect (tap Z during attack cooldown → 10-frame parry window.\n        Successful deflect stuns enemy 0.5s, grants player I-frames + Fracture pip.\n        Golden visual flash, dedicated SFX. Works on melee hitbox + body contact.)
[x] 1.6 Charged Heavy Attack
    - Hold Z/J to charge, release to fire. Quick tap (<5f) = normal attack.
    - Full charge (40f / ~667ms) = 2x damage, extra knockback, amplified screen shake/hitstop.
    - Charge glow (amber halo + expanding ring), pulsing when fully charged.
    - SFX: heavy attack (sawtooth + noise), charge full (ascending sine ping).
    - Partial charge scales damage/knockback proportionally (CHARGE_TAP to CHARGE_FULL).
[x] 1.7 Wall Jump / Wall Slide
    - Wall slide: hold toward wall while airborne → capped descent (WALL_SLIDE_SPEED=1.5),
      violet glow on wall-facing side + sparks. wallNormal tracked in collision block.
    - Wall jump: press jump while sliding/in coyote → perpendicular horizontal force
      (WALL_JUMP_H_SPEED=7) + upward lift (WALL_JUMP_FORCE=-10), brief I-frames.
    - Natural 1-frame coyote via wallNormal persistence across update→collision ordering.
    - SFX: wallJump() tone sweep + noise burst in audio.js. Visual: radial glow + sparks
      in player.js draw, particle burst in game.js after player.update().
[x] 1.8 Dash Refund on Hit
    - Landing a melee hit refunds 50% of the base dash cooldown, once per
      swing (`player.dashRefundedThisAttack`, reset wherever a new attack
      starts in player.js; refund applied in game.js's enemy hit loop right
      after gainFracture/hitstop). Rewards aggressive play without making
      dash spam free — a whiffed swing refunds nothing.
[~] 1.9 Future Player Upgrades — core plumbing built (2026-07-12), placeholder
      lore-pip visual effect only; real per-fragment content waits on 1.10.
    - Players will explore for more upgrades rather than be given everything at the start. 
      Everything must be collected, so the player needs an inventory. Fracture pips, 
      weapon upgrades, ability upgrades, etc. Lore bits will be remade. Instead of being text,
      lore bits will have a visual effect that stops the game, like a small shot of a city crumbling
      down, or the King walking away, and then it will be in inventory until you get enough for 
      an upgrade for like strength or something. You start with zero fracture pips and you find up to four.
    - **Resolved a naming collision found while planning**: the codebase already
      had a `fractureMeter` (0-3, combat resource filling on hits, draining on
      Stillpoint use) separate from story.md's "Fracture Pip" economy
      (collectible currency spent on Stillpoint/Graviton Surge/Void Tether).
      Per the user, these are the same resource, unified: `fractureMeter`'s
      cap (`player.fractureMax`, new field in player.js, replacing the old
      hardcoded `FRACTURE_MAX` const now renamed `FRACTURE_ABS_MAX = 4`)
      starts at **0** — Stillpoint is unusable until the player finds
      Fracture Pip pickups in the world, each raising the cap by 1 up to 4.
      The current value still fills via combat exactly as before
      (`gainFracture()`); only the cap changed. Removed the old "Stillpoint
      pickup grants 1 free pip" line in game.js — that's no longer
      compatible with starting at cap 0.
    - New `area.fracturePipRewards[]` (mirrors `abilityReward`'s shape) —
      2 placed as proof of concept (`the_fracture`'s low shelf,
      `the_vault`'s altar), reachability-checked by `validateRoomLayout()`
      the same way lore fragments are. Pickup raises `player.fractureMax`,
      shows a notification + particle burst, autosaves — same pattern as
      ability pickups.
    - Lore fragments got a second, independent pickup path (the old
      `LORE_ENABLED`-gated text-popup code stays dead/intact per CLAUDE.md,
      not flipped): touching a lore fragment now always marks it collected,
      plays a placeholder full-screen amber vignette pulse
      (`lorePipEffect`, non-blocking — player keeps moving, per the "room
      for both" cutscene-vs-overlay decision, this placeholder leans
      overlay-style since no real content exists yet), and banks toward
      `statUpgrades`. Real per-fragment cutscene content (city crumbling,
      the King walking away, etc.) is explicitly 1.10's job, not built here.
    - New Inventory screen off the pause menu (reuses `pauseMenuIndex`'s
      nav pattern as a new `gameState === 'inventory'`): shows Fracture
      Pips found/max, lore pips found/banked, and one spendable upgrade
      (Strength, +1 flat melee damage per level via `playerMeleeDamage()`,
      costs 2 banked lore pips per level, capped at level 3) to prove the
      collect-then-spend loop end to end. More upgrade types are a follow-up,
      not scoped here.
    - All new state (`player.fractureMax`, `fracturePipsFound`,
      `statUpgrades`) persists through `saveGame()`/`loadGame()`/
      `startNewGame()` alongside the existing `abilityState`/`collectedLore`
      fields — verified live (see Verification below), not just read.
    - Verified live via a headless JS harness in the browser (no human
      playtest yet): fresh game starts at fractureMax 0/Stillpoint
      unusable; walking onto a Fracture Pip raises the cap to 1 and doesn't
      re-trigger on subsequent frames; Stillpoint activation is correctly
      blocked at cap 0 and works once a pip is banked; walking onto a lore
      fragment marks it collected, fires the placeholder vignette, and
      banks 1 pip; the Inventory screen correctly blocks the Strength
      upgrade at 1 banked pip ("Not enough Lore Pips") and succeeds at 2
      pips, after which `playerMeleeDamage()` reflects the bonus (1 -> 2);
      Escape from Inventory returns to the pause menu, not straight to
      play; full save/load round-trip restores `fractureMax`,
      `fractureMeter` (correctly clamped to the restored cap), 
      `statUpgrades`, `fracturePipsFound`, and `collectedLore` exactly.
      `validateAreaGraph()`/`validateAllRoomLayouts()` still pass clean
      (27 rooms / 26 layouts) with both new Fracture Pip placements.
    - **Ability upgrade shop — design only, not built (2026-07-13)**: per
      the user, the Lore Pip shop shouldn't stop at Strength — every core
      ability should have its own upgrade line, purchasable the same way
      (banked Lore Pips, via the Inventory screen). Distinct from
      expansion.md's miniboss rewards (those are one-time, guaranteed,
      tied to a specific fight); this is a flexible economy the player
      chooses how to spend, same pattern `tryUpgradeStrength()` already
      proves out. Proposed lines (each independent, own level cap, costs
      scale per level same as Strength's `2/4/6` shape):
        - **Dash**: +1 max chain length (`DASH_CHAIN_MAX`, currently 3,
          cap the upgrade at +2 so max chain never exceeds 5 — an
          unlimited chain breaks the "chain resets on ground" tension),
          OR a flat dash-speed increase per level — pick one axis, not
          both, so the upgrade reads as one clear improvement.
        - **Phase Dash**: currently horizontal-only — `usePhaseDash()` in
          ability.js always dashes along `player.facing` (left/right), no
          vertical component. Upgrade line unlocks angled aiming (reuse
          Shard Shot's existing
          hold-to-aim pattern from `SHARD_AIM_TILT_RATE`/aim visualization
          in player.js — don't invent a second aiming scheme), tier 2
          unlocks full omnidirectional (8-way or free-aim). This is the
          one the user specifically named as an example.
        - **Shard Shot**: damage per level, OR projectile speed per level,
          OR (higher tier) pierce (passes through one extra enemy/wall
          hit) — the user's other named example ("stronger shard shots").
          Same one-axis-per-line rule as Dash above.
        - **Parry**: window (`PARRY_WINDOW`, currently 10f) +2f per level,
          capped low (this window is deliberately tight — see
          `BUG_ANALYSIS_AND_QA_PLAN.md` if a note exists on parry
          difficulty tuning before loosening it much).
        - **Stillpoint**: duration per pip (`FRACTURE_DRAIN_RATE`,
          currently 60f/pip drained) OR life-steal amount — note 4.6's
          Temporal Warden miniboss reward is ALSO "Stillpoint upgrade
          (life steal +1 per hit)" per expansion.md, so if both exist,
          make sure they stack additively rather than one silently
          overriding the other when both are implemented.
        - **Charged Attack**: charge-time reduction per level
          (`CHARGE_FULL`, currently 40f) — makes heavy attacks more
          viable in normal combat, not just as a punish tool.
        - **Strength** (built): unchanged, flat melee damage, see above.
      Implementation shape (when this gets built): generalize
      `statUpgrades = { strength: 0 }` to hold one key per line above,
      each with its own `*_UPGRADE_COST`/`*_UPGRADE_MAX` consts and a
      `tryUpgradeX()` function following `tryUpgradeStrength()`'s exact
      pattern (game.js) — and extend the Inventory screen's draw code
      (currently one hardcoded Strength row) to iterate a list of upgrade
      defs instead of hand-drawing each one. Not started; flagged here so
      the next session doesn't have to re-derive the shape.
[~] 1.10 Lore Buildout — King rewritten as a villain + all 8 planned
      minibosses' lore drafted (2026-07-12); not yet ported into `area.js`
      or displayed in-game.
    - Build out the lore of each region, and the lore bits visual effect will be decided based on that. 
      I don't like the current lore, especially considering the role of the King, so we must reconsider 
      the lore first before making a decision.
    - Brainstormed the King's role via a structured round of yes/no and
      multiple-choice questions (per the user's request to be asked
      "extensive" questions rather than pitched a single take). Locked
      answers, now written into `Plans/lore.md`: **Conqueror** who
      deliberately weaponized/fused every Stillpoint into one absolute
      one (not an accident); **still actively hunting** the one anomaly he
      can't perceive or control (the companion child from story.md);
      **arrogant/taunting**, not a brooding tragic figure; **one sharp,
      non-excusing detail** kept for depth (he genuinely believed total,
      permanent control would end all future conflict — wrong, but a real
      internal logic, not cardboard evil); most **regions' ruin is an
      independent tragedy**, not his personal doing (one explicit
      exception: Graviton Core's Fractured King's Guard, literally one of
      his own). This directly completes story.md's existing mechanic
      rather than requiring any change to it — "the only being the King
      cannot see... unless you teach her to fight" (story.md §2) is now
      explicitly the mechanical reason Training the child (making her
      fight, i.e. visible) is what puts her in his sights, per lore.md's
      new "On the child" note.
    - Full rewrite of `Plans/lore.md`'s "The Fracture" and "The King"
      sections to match (framing changed from an accidental structural
      failure to a deliberate weapon that misfired at world scale), plus a
      brand-new "Minibosses & their regions" section covering all 8
      expansion.md minibosses (Mirror King, Gravity Collapse Core,
      Temporal Warden, Fractured King's Guard, Electromagnetic Golem,
      Quantum Pursuer, The Assembler, Warden & Hollow) — each an
      independent variation on the doc's existing "built to last, and
      what happened when it couldn't" rule, none repeating the same shape.
      Crag of the Colossus's existing lore needed no changes — it was
      already an independent tragedy under the old version too.
    - Assigned the 3 previously-unpinned minibosses to regions by
      mechanical/thematic fit, confirmed with the user: Fractured King's
      Guard → Graviton Core, Quantum Pursuer → Echoing Abyss (its shadow-
      clone kit matches that region's own-echoes-as-platforms mechanic
      almost exactly), Warden & Hollow → Warp Gate Nexus (a teleport hub
      naturally wants a gatekeeper-duo trial). 5 of the 13 regions
      (Timeline Crossroads, Static Field, The Observatory, The Void
      Expanse, The Inverted Spire) intentionally have no assigned
      miniboss — not every region needs one.
    - NOT done, explicitly deferred (see lore.md's own "Notes for whoever
      builds the display system"): none of `area.js`'s existing
      `loreFragments[]` text (`lore_f1`, `lore_ur1-3`, `lore_tf1`,
      `lore_tv1-2`, `lore_ac1-2`, `lore_eb1`, `lore_cc1`, `lore_tr1`) has
      been edited yet to match the new King — lore.md proposes replacement
      quotes for all of them, but porting those into the live game data is
      a separate mechanical pass, not done here. None of the 8 miniboss
      regions exist as real `AREAS` entries yet either (only Mirror Veil,
      Event Horizon, Chrono-Space Rift are built — Phase 9), so their
      lore has nowhere to live in-game yet.
    - Lore-bit visual effects don't have to be one mode globally — room for
      both a full cutscene-style pause (for major story beats) and
      lore.md's original non-disruptive overlay sketch (for minor ones),
      decided per-fragment once the above is actually wired into a room.
    - `story.md`'s Fracture Pip table was stale (`fracturePips: 3, max 4`)
      — already fixed to `0, max 4` alongside 1.9's ship (see 1.9 above).

─────────────────────────────────────────────────────────────────────────────
PHASE 2 — Enemies & Smarter AI
─────────────────────────────────────────────────────────────────────────────
[~] 2.1 Pit Avoidance — LARGELY DONE (corrected 2026-07-17, was [ ]).
      `hasFootingAhead()` (enemy.js:57) is used by the base Enemy patrol/
      chase, BlitzGuard, and the composed-enemy system, so grounded enemies
      already stop at ledges. Verify coverage for any bespoke class that
      hand-rolls movement before calling this fully closed.
[x] 2.2 New Enemy: Lancer — built as **Void Lancer** per the expansion.md
      roster note above. `VoidLancer` class in enemy.js (6 HP, slow approach,
      34f glowing-spear-tip telegraph → 10px/f charging thrust, 2 dmg).
      Perfect parry stuns it and the next hit while stunned deals double
      damage (its designed counter). Spawnable via game.js's 'void_lancer'
      type and testable in enemy_test.html. NOT yet placed in any room's
      enemies[] — its home region (The Void Expanse) doesn't exist yet;
      place it when that region (or any suitable room) gets built.
[ ] 2.3 New Enemy: Mage
[ ] 2.4 New Enemy: Tank
[ ] 2.5 Group Coordination & Adaptive Aggression
[ ] 2.6 Enemy Health Bars (toggle, only when damaged)
[ ] 2.7 Enemy Windup "Ping" (audio cue)
[ ] 2.8 Enemy Architecture Rework (component-based behaviors) — PLANNED,
      discussed with the user 2026-07-12, not started
      **Problem this solves**: every enemy today (9 built: Fractured,
      Stutterer, Crystal Sentinel, Void Lancer, Null Sentinel, Anchor
      Wraith, Deflector Drone, Mirror Sprite, Echo Stalker) is a bespoke
      `extends Enemy` class that hand-rolls its own windup/attack/chase/
      physics loop, even when 80% of that loop is identical to every other
      enemy. Phase 10 (session 2026-07-12) added 5 more this way and
      duplicated the same boilerplate a 5th time. With ~19 more enemies
      still planned in expansion.md §2, that duplication only gets worse —
      and 2.1 (pit avoidance) has to be hand-added to every one of those
      ~28 classes individually under the current architecture, not written
      once.
      **Proposed shape**: a small composable-behavior system — movement
      behaviors (ground-chase-with-pit-avoidance, hover, teleport-on-trigger,
      stationary-drift) and attack behaviors (melee-windup-swing, ranged-
      projectile, contact-field, shield-reflect) as independent, reusable
      pieces an enemy definition picks from, instead of a full subclass.
      Existing bespoke classes (Stutterer's teleport-decoy, Crystal
      Sentinel's directional shield, Void Lancer's charge-thrust) would
      become the first behaviors extracted into this system, proving it
      works before any new enemy is required to use it.
      **Direct benefits**:
        - 2.1 (Pit Avoidance) becomes a single shared movement behavior
          instead of ~28 individual patches — the actual motivating case.
        - 2.3/2.4 (Mage, Tank) and the remaining ~19 expansion.md enemies
          become compositions of existing behaviors in most cases, not new
          full classes each time.
        - Unlocks a real visual enemy *designer* later (picking/combining
          behaviors in a UI) — the current `enemy_editor.html` only tunes
          numeric stats on pre-existing classes because there's nothing
          more granular than "a whole class" to expose yet.
        - 2.5 (Group Coordination) is a system that reads much more
          naturally as "behaviors that reference sibling enemies" than as
          logic bolted onto N unrelated classes.
      **Cost / risk — why this is its own session, not opportunistic**:
        real architecture change touching all 9 built enemy classes plus
        however boss.js's `Boss`/`ColossusCore` relate to the base `Enemy`
        pattern; meaningful regression risk across every enemy currently in
        the game. Per CLAUDE.md's standing rule, a refactor at this scale
        should be proposed and confirmed before starting, not folded into a
        content task.

─────────────────────────────────────────────────────────────────────────────
PHASE 3 — Final Boss Overhaul
─────────────────────────────────────────────────────────────────────────────
[~] 3.1 Parry Mechanic (Boss) — PARTIAL (corrected 2026-07-17, was [ ]).
      The boss already has a parry-stun state (boss.js:164 "Stunned by parry
      — skip all actions"). What's missing is the fuller mechanic/telegraphs
      described below.
[ ] 3.2 Repulsion Field
[ ] 3.3 Double Stillpoint Lunge
[~] 3.4 Phase 3 — Desperation Mode — PARTIAL (corrected 2026-07-17, was
      [ ]). A real phase 3 exists (boss.js: ultimate, faster attack/summon
      cooldowns, red tint). The "desperation" escalation beat specifically is
      what's still open.
[ ] 3.5 Telegraph Clarity (Visual + Audio)
[ ] 3.6 Anti-Facetank Pass (fixes current "just walk up and mash Z" problem)
      - PROBLEM (verified in boss.js/player.js): player ATTACK_COOLDOWN is 18
        frames vs. boss attackCooldown 35-40f in Phase 1/2, and there is no
        real punishment for standing at point-blank melee range until Phase 3
        (damage aura only checks dist < 150 in phase >= 3). Result: a player
        who just walks up and spams melee out-DPSes the intended fight for
        roughly 2/3 of it.
      - FIX: extend some form of close-range punish into Phase 1-2, not just
        Phase 3 — e.g. every N seconds spent within melee range without
        backing off, the boss gets a short "brace" state that blocks/
        no-sells the next hit and knocks the player back (telegraphed, so
        it's a rhythm to learn, not a random gotcha). This should reuse 3.1's
        parry mechanic — a boss that periodically no-sells point-blank
        spam turns melee spam into a legitimate but risky choice, not a
        free win.
      - FIX: give melee attacks measurably lower average DPS than "correct"
        play (dodge windows / parries / positioning) once 3.1/3.2/3.5 land —
        i.e. actually playtest DPS-mashing vs. DPS-playing-well and confirm
        the latter wins by a real margin, not just on paper.
[ ] 3.7 Boss Arena — Size & Verticality
      - PROBLEM: boss_arena is a flat 900px sealed room (ground + 3 small
        platforms, all roughly the same height band). There isn't really
        room for the boss OR the player to use space meaningfully — it's
        mostly a left-right dance on one lane.
      - FIX: widen the arena and add real verticality (at least 2-3 distinct
        height tiers the boss can occupy/leap between, not just cosmetic
        platforms). Let the boss actually use vertical movement as part of
        its kit (e.g. Phase 2 teleport-to-a-platform before summoning
        Slimes, Phase 3 leaping slam from a high platform) so players are
        forced to track the boss in 2D, not just left/right.
      - This also directly benefits 3.1/3.2 (parry/repulsion need room to
        mean something — a repulsion field in a cramped arena just means
        "get flung into a wall," not a real spacing decision).
[ ] 3.8 Miniboss Arena Sizing Standard (applies to Phase 4 minibosses in
        expansion.md too)
      - Every miniboss/boss room should be sized and shaped around that
        specific fight's mechanic, not reuse a generic small box. E.g. the
        Electromagnetic Golem's push/pull needs open floor to be readable;
        a chase-style miniboss needs a long room, not a square one. Treat
        arena shape as part of the boss's design spec, decided alongside its
        moveset, not an afterthought.

─────────────────────────────────────────────────────────────────────────────
PHASE 4 — World Restructure: Non-Linear Map
─────────────────────────────────────────────────────────────────────────────
[ ] 4.1 Redesign Area Layout (3 regions around The Vault hub)
[ ] 4.2 The Vault as Hub (3 ability-gated exits + merchant + fast-travel gate)
[ ] 4.3 Ability Gates & Blocked Paths (shard_shot/stillpoint/phase_dash gate
        types already exist in the trans.requires system used by 0.2's
        tutorial_complete gate — just needs new area layouts to use them)
[ ] 4.4 Shortcuts & One-Way Doors
[ ] 4.5 Fast Travel (Stillpoint Gates)
      - Proposed node locations (2026-07-13, per the user): **The Vault**
        (already the calm rest-stop on the spine, natural hub — see its
        room note in the origin-spine section); each region's
        **Sanctum/Core** room (Mirror Veil Sanctum, Chrono-Space Rift
        Sanctum, Event Horizon Core, and future regions' equivalent deepest
        room) — already the ability-reward checkpoint in each built
        region, so it's a natural node without inventing a new location
        type; and the opening **sealed starting room** from 6.7 below, once
        discovered as the other end of the map's loop (thematically strong
        — fast-traveling back to where it all started — and mechanically
        useful late-game).
      - Deliberately do NOT put a fast-travel node at the Antechamber <->
        boss_arena Phase-Dash wall crossing described in 6.7 — that
        crossing needs to stay a singular, un-mundane "aha" traversal
        moment, not a menu option. Turning it into ordinary fast travel
        would cheapen the loop reveal it exists to deliver.
[ ] 4.6 Environmental Hazards (Traps)
[ ] 4.7 Dynamic Lantern / Player Aura
[ ] 4.8 Secret Shimmer (Breakable Walls)

─────────────────────────────────────────────────────────────────────────────
PHASE 5 — Extra Depth & Polish
─────────────────────────────────────────────────────────────────────────────
[x] 5.1 Input Remapping Menu — DONE (corrected 2026-07-17, was [ ]).
      `keyBindings` + localStorage persistence in input.js, and a real
      Controls screen in game.js (~line 2033): navigate rows, Enter/click to
      rebind, last row resets to defaults.
      - NOTE (honest read on current controls, verified in input.js/player.js):
        controls are NOT currently remappable — everything is hardcoded
        e.model.code checks. Also, Z alone currently has to carry tap-attack,
        hold-charge-heavy-attack, AND tap-during-cooldown-parry — three
        distinct behaviors gated purely by timing on one key. That's a lot
        of responsibility for a single input and is worth real playtesting
        for false-triggers (e.g. wanting a quick tap-parry but accidentally
        holding 1 frame too long into a charge state) before assuming it
        feels good.
      - Canvas-drawn rebind menu (as originally scoped): list action ->
        current key, "press new key" capture flow, persisted to localStorage
        alongside existing settings key.
      - Conflict detection: warn (don't silently allow) if a person binds two
        actions to the same key.
[ ] 5.1b Gamepad/Controller Support (not in original scope — worth adding for
        a genuinely finished game)
      - This is a precision platformer/action game; most people who play that
        genre reach for a controller. Add Gamepad API polling alongside
        existing keyboard input (input.js), analog stick -> movement,
        face buttons -> attack/dash/phase-dash/shard-shot/stillpoint,
        shoulder buttons as sensible defaults for secondary actions.
      - Remapping menu (5.1) should cover gamepad bindings too, not just
        keyboard.
[ ] 5.2 Advanced Reactive Audio (spatial panning, dynamic drone, combat sting,
        boss phase music)
      - procedural synthesis via Web Audio API is just numeric parameters —
        frequencies, envelope times, filter cutoffs — that can be reasoned
        about and iterated on in code. Fix
        this by building a listening tool (5.2a below), not by trying to
        get it right blind on the first pass.
      - WHAT MAKES THE CURRENT audio.js READ AS "CHEAP BEEPS" VS. GOOD SFX,
        SPECIFICALLY (verified by reading it):
          1. No pitch/duration variance — every jump/attack/hit is byte-
             identical every single play. Repetition is what makes procedural
             audio feel cheap fastest. Add small per-play randomization
             (~±3-5% on frequency and duration) to every SFX call.
          2. Frequencies are picked arbitrarily (440, 620, 880, 900, 1400...)
             with no shared scale — this is why a pile of correct individual
             sounds can still feel like random beeping rather than music.
             Lock ALL sfx frequencies (and the drone) to notes from ONE
             scale (e.g. a minor pentatonic rooted wherever the area's drone
             sits) so everything feels intentional and belongs together.
          3. Everything is bone-dry — no shared reverb/space. For a "dark,
             atmospheric" game, a single shared algorithmic reverb bus
             (ConvolverNode with a short synthesized impulse response, or a
             cheap feedback-delay network) that every SFX sends a little
             signal into is the single highest-value addition available —
             it's what separates "toy" from "atmospheric" more than any
             individual sound's design.
          4. No mix/ducking behavior — hits/attacks and the ambient drone
             just add together on one master gain. Briefly ducking the
             drone's gain a few dB whenever a hit/attack fires makes impacts
             read as punchy instead of cluttered.
          5. Stillpoint doesn't audio-react to itself at all, which wastes
             the game's signature mechanic. Keep the existing intentional
             choice (SFX/hit-feedback timing stays un-slowed, for snappy
             combat feedback) but add a lowpass-filter sweep + slight pitch
             dip on the AMBIENT/DRONE BUS ONLY while Stillpoint is active —
             sells "time going thick" without touching combat feel.
      - KEEPING THE VIBE: lo-fi/minimal synth (which this game already is,
        matching its minimalist vector art) is not a compromise here — a
        small, scale-locked, consistent synth palette is MORE achievable
        and more coherent than chasing realism, and fits "Hollow Knight
        meets Celeste meets Hyper Light Drifter" better than trying to fake
        live instruments would.
[ ] 5.2a SFX Sandbox / Listening Tool (build this BEFORE tuning any sounds)
      - A standalone HTML page (same pattern as debug_new.html) that lists
        every SFX.* function as a button, plus sliders for whatever
        parameters that sound exposes (frequency, duration, filter cutoff,
        detune amount). Lets you trigger a sound 20 times in a row, A/B two
        parameter sets back to back, and settle on values by ear — WITHOUT
        needing synthesis expertise to know why one version sounds better.
      - This matters because neither a person without an audio background
        nor an LLM can reliably judge sound quality from a code diff alone —
        a comparison tool turns "does this sound good" from a guess into
        something you can actually test, the same way debug_new.html turned
        "is the game frozen" from a guess into a real check.
      - Reuse this tool continuously through 5.2's other sub-items — tune
        the reverb send amount, the scale choice, and the ducking depth by
        ear here, then port final values into audio.js.
      - 

        """
        TASK: Improve the procedural Web Audio SFX/ambient system in
        audio.js for a dark, minimalist, atmospheric 2D action-platformer
        (Metroidvania with a time-slow "Stillpoint" mechanic; visual style
        is minimalist vector art in purple/teal/deep-blue; tonal
        references are Hollow Knight, Celeste, and Hyper Light Drifter —
        match THEIR audio restraint and minimalism, not a cinematic/
        orchestral sound).

        Do these in order:

        1. Build a standalone SFX sandbox HTML page (same instrumentation
           pattern as debug_new.html in this repo) that lists every
           function exported from the SFX object as a clickable button,
           with sliders for that sound's exposed parameters (frequency,
           duration, filter cutoff/type, volume). This is for listening
           and comparing by ear — build this FIRST, before changing any
           actual sound values, so changes can be judged rather than
           guessed at.

        2. Pick ONE scale (e.g. a minor pentatonic) and root frequency
           tied to each area's existing per-area drone hash. Re-derive
           every SFX's tonal frequency choices (jump, land, attack, hit,
           parry, ability pickups, etc.) from notes in that scale rather
           than arbitrary Hz values, so the whole game's sound palette
           feels harmonically unified rather than randomly beepy. Show me
           the mapping table you chose (note name -> Hz) before wiring it
           through every SFX call.

        3. Add small per-play randomization to every SFX call: ±3-5% on
           frequency and ±5-10% on duration, using a seeded/deterministic
           RNG if determinism matters elsewhere in the codebase, otherwise
           Math.random() is fine. Goal: no two plays of the same sound are
           byte-identical, without making any individual sound noticeably
           different from what it was.

        4. Add ONE shared reverb send: a ConvolverNode with a short (under
           1.5s), synthesized (not sampled) impulse response appropriate
           for a small dark stone/crystal interior — not a cathedral, not
           a phone-booth. Route every SFX and the ambient drone through a
           small send to this bus (not 100% wet — subtle). Expose the
           overall reverb send level as one tunable constant so it can be
           adjusted by ear in the sandbox from step 1.

        5. Add mix ducking: when any combat SFX (attack/hit/parry/enemy
           death) fires, briefly (150-250ms) reduce the ambient drone's
           gain by a few dB with a quick attack/release envelope, so
           impacts read as punchy rather than the mix getting cluttered.

        6. Add a Stillpoint-active audio state: while Stillpoint is active,
           sweep a lowpass filter on the AMBIENT/DRONE BUS ONLY down to a
           lower cutoff and apply a slight (a few %) pitch dip, ramping
           back to normal on deactivation. Explicitly do NOT slow down or
           filter combat/hit SFX — that snappy feedback timing was an
           earlier intentional decision and should be preserved exactly.

        7. For every change, tell me which specific problem from the list
           above it's solving (repetition / disharmony / dryness / no
           ducking / no Stillpoint reactivity), so I can evaluate changes
           one at a time in the sandbox rather than all at once.

        Do NOT change gameplay-affecting code, timing, or non-audio files.
        Do NOT introduce any audio files/samples — stay fully procedural,
        matching the existing "no audio files, all Web Audio API synthesis"
        constraint.
        """

[ ] 5.3 Debug check
[ ] 5.4 Boss Rush / Radiant Mode
[ ] 5.5 NPCs & Side Quests
[~] 5.6 In-Game Bestiary / Journal — NOT built as a journal yet, but note:
        lore fragments (currently disabled, see LORE_ENABLED) were the
        original "collect text" mechanic; when redesigning lore as
        environmental storytelling, consider whether a bestiary still makes
        sense as a separate system or folds into that redesign.
[ ] 5.7 "Memory" Boss Refights (Hub)
[ ] 5.8 Options/Settings Menu Completeness (a "real good game" checklist item)
      - Volume sliders (master/SFX/ambient — currently a single hardcoded
        master gain in audio.js with no player-facing control at all).
      - Screen shake / hitstop toggles already exist (0.6) — surface them in
        a proper Options menu alongside the above, not just buried in pause.
      - A basic "how to play"/controls reference screen, generated FROM the
        current keybinding state (so it's always accurate even after
        remapping), not a separate hardcoded image/text.
[ ] 5.9 Sovereign Ending postgame — Playable-Sovereign arc (RESCOPED 2026-07-14,
        no longer aspirational/far-future — see story.md §9's revision history)
      - Full design lives in `story.md` §9 and §7, not here — roadmap.md stays
        the status/checklist doc. Summary: True Anchor is retired; the old
        "Trained her" trigger now leads to a new Sovereign Ending whose
        postgame is a real, sequenced 5-step arc — play as the Sovereign in
        the Sovereign Rooms (`floor_plan.md`'s Sovereign Room 1–4 / Sovereign's
        Observatory nodes, now committed content, not reserved placeholders),
        a narrative arc built to pull the player toward the same choice the
        Sovereign made, an intervention from the ally that turns out to BE the
        base game's own opening cinematic seen from the other side, more
        Sovereign Rooms, then a closing fight against the grown child that
        loops back into the base game (NG). Both of the old risk-list items
        (Sovereign-sympathy tension, "why does she become a threat") are
        resolved by this structure, not just flagged. Still real, unbuilt
        work — not started, no room content designed beyond the sequence
        above — but no longer "don't start without a risk-mitigation design
        pass first"; the risk mitigation IS the structure now.
      - Brainstormed, explicitly not locked: an endless boss-rush instead of a
        single closing fight (next loop's grown child just keeps coming back),
        a different kit per run, and an adaptive opponent that mirrors the
        player's own action patterns — possibly reusing `expansion.md` 5.6's
        (also unbuilt) Archive adaptive-boss spec rather than a second bespoke
        system. See story.md §9 for the full list.

─────────────────────────────────────────────────────────────────────────────
PHASE 6 — Non-Linear World & Meaningful Exploration
─────────────────────────────────────────────────────────────────────────────
CONTEXT: with only 3 regions built (per the current game) the game is a
2-3 minute straight-line speedrun. The fix isn't just "add more regions" —
a long linear game is still a linear game, just a longer one. The actual
goal is making exploration itself the content: backtracking with new
abilities should reveal real, worthwhile rewards, not just more critical
path.

[ ] 6.1 Hub-and-Spoke Structure (builds on the compass-graph fix already
        planned for the map system)
      - The Vault becomes a true hub with gated exits (Phase Dash / Shard
        Shot / Stillpoint / [new ability] each unlock one spoke). This
        already exists in Phase 4.1/4.2 above — 6.1 is the acknowledgement
        that non-linearity and the hub structure are the SAME task, not two
        separate ones. Don't build the hub gates in 4.x and then separately
        bolt on "non-linearity" — they're one design.
[ ] 6.2 Ability-Gated Backtracking (the actual Metroidvania trick)
      - Every region should contain at least 1-2 areas that are VISIBLE but
        UNREACHABLE on first pass — a ledge you can see but not reach, a
        crystal wall you can't yet break, a gap you can't yet cross — and
        are only reachable after getting an ability from a DIFFERENT region.
      - Concretely: region A gates its deepest reward behind an ability found
        in region B (not an ability found earlier in region A itself). This
        is what makes backtracking feel purposeful instead of like re-walking
        old rooms for no reason.
      - Use the map (once the compass-graph fix lands) to actually communicate
        this to the player: an already-discovered room should visibly show
        an unreachable-marked exit/item, so players remember to come back
        once they have the right tool, rather than forgetting a whole area
        exists.
[ ] 6.3 Upgrade Placement Tiers (addresses "important upgrades hidden deep")
      - Define 2-3 explicit tiers per region rather than scattering upgrades
        evenly:
          Tier 1 (critical path) — minimum needed to progress at all, placed
            on the main route, low risk.
          Tier 2 (side room, moderate risk) — visible from the main route,
            requires a small detour/optional fight/precise platforming.
          Tier 3 (deep/secret, real risk or a real puzzle) — requires an
            ability from ANOTHER region (see 6.2), placed at the true dead
            end of a branch, and should feel like the actual reward for full
            exploration (a stat upgrade, a strong optional ability upgrade,
            or a miniboss-guarded item — not just lore text).
      - This directly answers "important upgrades must be hidden deep" —
        make that a deliberate placement rule per region, not an afterthought
        added once a region's layout is already finished.
[ ] 6.4 One-Way Shortcuts Back to Earlier Regions
      - Already scoped in Phase 4.4/expansion.md's "Interconnectivity" note —
        confirming it here as part of the non-linearity pass specifically:
        every region should open at least one shortcut back toward an
        earlier hub/region once explored, so the world starts folding back
        on itself instead of only branching outward. This is what makes a
        Metroidvania map feel like a world instead of a tree of dead ends.
[ ] 6.5 Soft Sequence-Breaking (optional, do last)
      - Once 6.1-6.4 exist, consider whether 1-2 spots should be reachable
        "early" via skilled movement (e.g. a hard Phase-Dash-less route to a
        Phase-Dash-gated area) as a reward for player skill. Optional —
        only worth doing once the core non-linear structure above is solid
        and playtested, since sequence-breaking can trivialize pacing if the
        rest of the world isn't robust to it yet.
[ ] 6.6 Connective-region rooms — the actual fix for "tree, not web"
      - Direct instruction (2026-07-13): more CONNECTIVE regions specifically,
        not just more regions. This is the same problem Phase 9 already named
        (the 3 anchor regions are 3 parallel spokes, not a web) — 6.6 is the
        concrete content fix, triaged from `Plans/considerations.md`.
      - **Mirror Corridor removed 2026-07-13** per the user's instruction to
        drop the "real execution risk" triage tier — it was filed there
        because "swap lanes via portals" wasn't a finished design, only a
        sentence. Flagging explicitly: this was the flagship idea directly
        answering "more connective regions," and removing it leaves 6.6
        without a concrete cross-link content plan — Puppet Strings below
        is a dead-end optional region (Void-Tether-gated), not a cross-link,
        so it doesn't fill the same role. If the connective-regions goal is
        still live, this needs a replacement idea or Mirror Corridor's
        return once it has an actual finished design, not just a concept.
      - **Puppet Strings / Tether Region** (considerations.md, rated A) — a
        vast vertical hook-to-hook shaft, locked behind choosing Void Tether
        (story.md §4's 4th ability, itself still unbuilt). Gives Void Tether
        a purpose beyond "grappling hook" (pull enemies, use them as rams on
        crystal walls). Sequence this AFTER Void Tether itself is built —
        it's a showcase room for an ability that doesn't exist in code yet.
        **Location moved 2026-07-13**: branches directly off **Timeline
        Crossroads**, not Warp Gate Nexus — Void Tether is granted at
        Timeline Crossroads (via the Crystalline Warden, moved there per
        the miniboss-conflict resolution, see `regions.md`), so its
        showcase area belongs right where the ability is earned rather
        than clear across the map at Warp Gate Nexus.
      - See "Considerations.md triage" note below for the rest — the source
        file (`Plans/considerations.md`) has been deleted per the user's
        instruction now that every idea worth keeping has a home here.
[ ] 6.7 The spatial loop reveal — opening cinematic + antechamber twist
      - Approved 2026-07-13. Full narrative design (opening cinematic, the
        Temporal-Warden-as-ally reveal, why the child must "die," how this
        fits the existing 3-ending structure) lives in `story.md` §0/§7/§9
        and `lore.md`'s King section — not duplicated here. The engineering
        task this roadmap item actually tracks:
          1. Compass-graph rework: the sealed starting room needs to sit at
             the opposite vertical extreme from `boss_arena` (currently
             both effectively on the same `row: 0` spine) for the loop to
             read spatially, not just narratively. Re-run
             `validateAreaGraph()`/`validateAllRoomLayouts()` after.
          2. A scripted antechamber beat: a corridor wall between the
             player and part of `boss_arena`, a camera zoom-out (one-time
             scripted, not the general-purpose zoom room rejected
             elsewhere this session), crossed via a Phase-Dash-gated
             one-way transition into what turns out to be `boss_arena`
             approached from its other side.
      - Deliberately does NOT get a fast-travel node at this crossing (see
        4.5) — it needs to stay a singular moment, not a menu option.

### Considerations.md triage (2026-07-13)

Full file read; per-idea call below so the brainstorm doc doesn't have to be
re-read cold next session. Revised 2026-07-13 after direct pushback
("do you really think all of it is worth adding? will they be good to
play?") — the first pass gave uniform cost/impact ratings without being
honest about which ideas are *proven* vs. which are unproven concepts that
only sound good as a sentence. This revision separates those explicitly.

**High confidence — proven patterns, low execution risk, just build them:**
  - **Kill Reset Air-Dash** — landing a melee kill refreshes dash cooldown.
    Trivial change, directly complements `movement_feel_plan.md`'s
    dash-refill-on-landing lever (this is dash-refill-on-kill — same
    philosophy, different trigger) and turns combat into aerial-combo flow
    the way 1.8's existing Dash Refund on Hit already gestures at. This
    exact pattern is proven across the genre (Dead Cells/Hollow Knight-
    adjacent) — near-zero risk it comes out bad.
  - **Self-Placed Map Markers** — essential, not just nice: 6.2's
    "ability-gated backtracking" (visible-but-unreachable ledges) doesn't
    actually work as a promise without a way to remember where those were.
    This is the missing piece that makes 6.2 functional, not just a
    standalone QoL nicety — sequence it alongside 6.2, not after.
  - **Screen-Shatter Shortcuts** — cheap particle payoff on unlocking a
    one-way shortcut (6.4), applies to shortcuts that already exist
    (Crag Warden's, Mirror Veil's, Chrono-Rift's). Pure juice, can't
    really come out bad.
  - **Death as Erosion** — a small crack/flicker added to a room per
    respawn. Costs one overlay sprite; sells the Fracture's "the world is
    wearing thin" theme better than more lore fragments would. Low
    impact-per-player-notice, but also low risk — a safe include.
  - **King's Observatory** — reconsidered (2026-07-13), was wrongly filed
    as "just a vista" in the first pass. It actually has real functional
    teeth: "see the lights of every region you've discovered" is a direct
    visual payoff for the ALREADY-prioritized map/exploration goal
    (6.1-6.2, Self-Placed Map Markers) — every discovered region lighting
    up in the distance is a passive reward for exploring, using systems
    already being built, not a stand-alone extra. Accepted.
  - **Hollow Core** — also reconsidered. Filed as a lookout room before;
    better version is to place it as actual plot geography (where the
    Stillpoints originated, or tied to the King's true prison) rather than
    an optional side room — "the literal center of the world, pure
    Stillpoint energy" earns a spot on the critical or near-critical path,
    not just a detour. Accepted, but sequence its exact location/story tie
    alongside 1.10's lore work, not as a bare decorative room.

**Removed 2026-07-13, per the user** (dropped the "real execution risk"
tier and Fractured Horizon entirely — not deferred, not built):
  Echo's Wound, Mirror Corridor (see 6.6's note above on what this leaves
  unresolved), Camera Zoom-Out Room, Hall of Absence, Companion's Memory,
  Weight-Shift Halfway Twist, Colour-Keyed World, The Fractured Horizon.

**Contingent — can't honestly assess until a dependency exists:**
  - **Puppet Strings / Tether Region** — can't tell if it's fun
    independent of Void Tether itself (story.md §4), which isn't built.
    Sequence after Void Tether, not before.

**Not pulled in — real redundancy risk:**
  - **The Ashen Maelstrom** (downward wind, half-height jumps) — risks
    feeling redundant next to Event Horizon's lateral gravity-pull; same
    texture (a constant directional force to fight), different axis. Only
    worth it if clearly differentiated from Event Horizon in practice.

`Plans/considerations.md` itself has been deleted — every idea worth
keeping now lives in 6.6/here, and re-deriving from a deleted brainstorm
doc isn't possible, so this triage note is now the only record of what it
contained.

─────────────────────────────────────────────────────────────────────────────
EXPLICITLY OUT OF SCOPE (by user request)
─────────────────────────────────────────────────────────────────────────────
  See `CLAUDE.md`'s design-decisions section (same list: charms, a
  geo/shop economy as a main gate, procedural generation, multiplayer,
  lock-and-key gating).

CURRENTLY HERE: 0.1-0.6 done, Phase 1.1-1.8 done, 2.2 (Void Lancer) done.
See Phase 7/8 sections below for the Crag region, world-map work, and the
room verification linter.
═══════════════════════════════════════════════════════════════════════════
```

─────────────────────────────────────────────────────────────────────────────
PHASE 7 — Crag of the Colossus & the World Map (2026-07-11)
─────────────────────────────────────────────────────────────────────────────
[x] Compass-graph map system rework (area.js `connections`/`col`/`row` +
    `validateAreaGraph()`, map.js generates layout from it). Verified against
    all 10 pre-existing rooms, no regressions.
[x] Crag of the Colossus — ALL 8 original sub-tasks done and live-verified:
      1. `abilityState.hasChargedAttack` — save/load/init/startNewGame wired.
      2. Charged Attack gated in player.js — no ability = quick tap only.
      3. 4 rooms built (crag_entrance, crag_breach, crag_altar, crag_warden),
         converted to a continuous cave floor (no fall-death on the intended
         route) after the pit-death bug below was found; upper/mid routes
         stay optional detours that drop safely back to the floor.
      4. the_fracture -> crag_entrance connected (Phase Dash gated).
      5. crag_altar grants Charged Attack (tested: pickup -> hasChargedAttack).
      6. Heavy-attack-only destructible rubble walls — normal attacks bounce
         off with zero effect, heavy attacks crack them, verified exactly
         one hp decrement per swing (see per-swing dedup below).
      7. Colossus Core miniboss (enemy.js) — rock-shelled construct, only
         Charged/heavy hits connect (normal attacks bounce, no damage/
         hitstun), 12 HP, single telegraphed charge attack. Full fight
         verified live: 6 heavy hits to kill, `defeatedMinibosses` persists
         (no respawn on re-entry), full heal on defeat, no forced game-state
         change (unlike the King, this doesn't end the run).
      8. crag_warden has a one-way shortcut back to the_fracture (built,
         functional) plus a locked stub door toward Graviton Core, gated on
         `graviton_surge` (an ability that doesn't exist yet, so the door is
         safely inert — verified this can't be triggered or crash).
    Bugs found and fixed along the way (all verified live, not just read):
      - game.js's pit-death check hardcoded a 600px kill-plane for any room
        with groundY > 800, assuming every tall room is a floorless void like
        Echo Bridge/The Rift. Crag's rooms are tall WITH real floors below
        y:600, so this instantly killed the player on entry. Fixed via an
        explicit optional `pitDeathY` per room; Echo Bridge/The Rift got
        `pitDeathY: 600` to preserve their exact original behavior.
      - crag_entrance's return door was positioned inside the solid platform
        body instead of in the air where the player's standing hitbox
        actually is — physically untouchable. Fixed (`y: platform.y -
        doorHeight`, extending up into the air, not down into the ground).
      - Both floorless rooms (crag_entrance, crag_breach) converted to
        continuous cave floors per direct feedback: no fall-death on the
        intended path unless a region deliberately wants that as its hazard.
      - The King's own boss-death trigger (`gameState = 'victory'`) has the
        same class of bug my miniboss code initially copied: the whole
        update block is gated on `boss && !boss.dead`, so once `dead` flips
        true the block stops running entirely and `boss.deathTimer` (needed
        to hit exactly 1 to fire the victory transition) gets stuck at 0
        forever — confirmed live, `deathTimer` never advances past 0 once
        dead. SINCE FIXED: game.js's King block now gates on `boss` alone
        (same pattern as the miniboss), with the damage-dealing checks
        individually gated on `!boss.dead` — `deathTimer` advances and the
        `deathTimer === 1` victory trigger fires normally. My own miniboss
        code uses the correct pattern too (`if (miniboss)`, not `if (miniboss
        && !miniboss.dead)`, with individual collision checks gated on
        `!miniboss.dead` where needed).
      - Multi-hit-per-swing damage: player.getAttackHitbox() stays non-null
        for the whole swing (12-16 frames), and there was no per-swing "already
        hit this target" tracking, so a target that stayed inside the hitbox
        across multiple frames took damage every overlapping frame instead of
        once per swing. Fixed via `player.hitTargetsThisSwing` (a Set,
        cleared whenever a new attack starts), checked in the enemy hit loop,
        the boss hit loop, and the new destructible-wall loop. Final numbers,
        verified live: normal = 1 dmg, heavy = flat 2 dmg at every charge
        level from tap to full (not a gradient — `ceil(1+heavyCharge)` always
        lands in `(1,2]`, so it's always 2). Base Fractured (3 HP): 3 normal
        hits, 2 heavy hits, or any mix summing to >=3, kills it — no
        one-shots at any range anymore.
[x] Enemy targeting/detection (enemy.js) — vertical-band gating + hysteresis
    added (`Enemy.canSeePlayer()`, shared by Fractured/Stutterer), disengage
    fixed (chase velocity no longer carries into patrol; patrol now uses its
    own independent `patrolDir` and wanders continuously instead of standing
    frozen). All scenarios verified live: no windup when the player is
    overhead outside the vertical band, zero aware-state flicker across 200
    frames oscillating right at the detect-range boundary, clean patrol
    between `patrolCenter +/- patrolRange` with zero player-tracking while
    disengaged.
[ ] World map / interconnectedness — see `expansion.md` "REGION ATLAS" section
    (added this session) for the full per-region table (color, compass
    position, gating ability, connections). Known problem, called out
    explicitly by the user: the current planned graph (origin spine + Crag +
    4 clusters off the Vault/Forge/Rift) is a **tree**, not a **web** — every
    region has exactly one parent edge and, at most, one shortcut back. This
    is NOT Hollow Knight-level interconnectedness (Crossroads-style hubs have
    several direct connections to unrelated regions, creating real cycles in
    the graph, which is what makes backtracking feel like rediscovering a
    world instead of retracing a branch). The REGION ATLAS in expansion.md
    now includes a "cross-links" column with proposed cycle-forming
    connections between clusters — these are planning-only, not yet built
    into any AREA data (the 12 non-Crag regions don't exist as AREAS yet).
    Apply the cross-link pattern when any of those regions actually gets
    built, not just the single parent edge from the original tree layout.
[~] Room verification tool — the **static layout linter** half is built (the
    dynamic bot walker from the plan doc is not). `validateRoomLayout()` /
    `validateAllRoomLayouts()` in area.js: flood-fills reachable platforms
    from every real entry point using the actual physics constants (jump
    arc, dash, phase dash), runs a second all-abilities/walls-broken pass so
    legitimate gated secrets don't false-fail, and separately checks
    ability rewards/anchors/lore/enemies for reachability, door-in-geometry
    (supersedes debug_v1.html's R11), floor-gap crossability, and physical
    two-way doors. Runs automatically on page load (after `validateAreaGraph()`,
    same pattern) wrapped in try/catch, and is also Node-safe for
    export_graph.js-style tooling. Caught 3 real bugs on first run, all
    fixed: crag_breach's entire upper Tier-2 route (5 platforms + its lore
    fragment) was unreachable — a 160px rise from the entry ledge vs. a
    ~120px max jump apex, missing a step platform; crag_altar's two
    symmetrical high side ledges + a lore fragment were unreachable off the
    dais for the same reason; the_forge's right shelf (behind barrier 2)
    needed an unintended wall-jump off the barrier to reach, not a real
    route. All 14 rooms pass clean now. See
    `Plans/room_verification_tool_plan.md` for the still-unbuilt dynamic bot
    walker half — worth doing before the next big region ships, same as the
    linter was.
[x] worldmap.html — a real, git-committed, self-contained diagram tool
    (distinct from the Artifact shown mid-session, which only lived in that
    chat) generating the same graph from live `area.js` data plus a
    hand-maintained `PLANNED_REGIONS` list for the 12 unbuilt regions. Lives
    at the repo root alongside `debug_v1.html`/`levelEditor.html`.

─────────────────────────────────────────────────────────────────────────────
PHASE 8 — Core Ability Reworks (expansion.md §0) — first 2 items
─────────────────────────────────────────────────────────────────────────────
[x] 0.1 Shard Shot — Hold to Aim
      - Removed the old W+V instant-fire scheme. Press V/N to start aiming
        (player.shardAiming), hold Up/W or Down/S to smoothly tilt the
        launch angle (shardAimVy, ramped by SHARD_AIM_TILT_RATE between
        SHARD_AIM_VY_MIN/MAX in player.js), release to fire along that arc.
        A quick tap still fires an instant flat shot (aimVy stays 0).
      - Visible aiming arc: player.js's draw() steps the REAL projectile
        math (same start position/speed/gravity as game.js's
        useShardShot()/Projectile) to draw a glowing dotted parabola, so
        what you see is exactly where the shot will land, not an
        approximation.
      - Slight magnetism toward destructible crystal walls: Projectile.update()
        in game.js pulls gently (0.35/frame) toward the closest point on the
        nearest intact destructible wall within 100px, reducing wasted shots
        without turning it into a homing missile — real walls only, dead
        (hp<=0) ones are ignored.
      - Updated the in-room ability description (area.js), the pickup
        notification, and the HUD controls hint to match; no leftover
        references to the old `aimingUp`/W+V scheme anywhere in the codebase.
[x] 0.2 Stillpoint — Offensive Buff & Life Steal
      - While Stillpoint is active: melee hits deal 1.5x damage and restore
        1 health pip (capped at MAX_HEALTH), turning it from a pure
        defensive slowdown into a risk-reward recovery tool per the design
        doc. Implemented as two shared helpers in game.js
        (playerMeleeDamage(), applyStillpointLifeSteal()) called from all
        three melee-hit sites (regular enemies, the King, Colossus Core) so
        the numbers can't drift apart between them. For the miniboss, life
        steal only triggers on hits that actually connect (heavy attacks —
        normal attacks bounce off its shell without landing), matching its
        existing "only heavy attacks deal damage" rule.
      - NOT done from the design doc's audio note ("audio gets a deeper,
        resonant hum" during Stillpoint) — that's audio.js scope, left for
        the 5.2/5.2a audio pass.
      - Balance not playtested by a human yet — numbers match the design
        doc's spec exactly (1.5x / +1 hp per hit) but haven't been felt out
        in a real fight against the King or a miniboss.

NEXT SESSION SHOULD [HISTORICAL — written after Phase 8; superseded by
"WHAT'S ACTUALLY NEXT" at the end of this file. Kept for the reasoning,
not as a task list.]:
  - Doors still render as a floating trigger box, not a natural cave-mouth
    passage — the "invisible door" visual request from this session's
    feedback is not done, only the fall-death/gap-closing part is. That's a
    rendering change to game.js's transition-drawing code, touching every
    region, not just Crag — worth its own pass rather than bolting onto the
    next task.
  - Build the dynamic bot-walker half of the room verification tool per
    Plans/room_verification_tool_plan.md — the static linter half is done
    (see Phase 7 above).
  - debug_v1.html's R10 check throws "Cannot convert undefined or null to
    object" — pre-existing, not caused by this session's changes. Root
    cause: `const AREAS = {...}` in area.js is a top-level const, which
    (unlike `var`/function declarations) never becomes a `window` property,
    so `win.AREAS` from the parent frame is undefined. R09 works because it
    calls `win.validateAreaGraph()`, a function declaration, which does
    attach to `window`. [RESOLVED — `window.AREAS = AREAS` is now at the
    bottom of area.js. The related `win.abilityState is undefined` gap is
    still open; see CLAUDE.md's known debug-tool issues.]
    before the next region ships — it would have caught 3 of the 4 bugs
    found this session automatically instead of by hand.
  - ~~Decide whether to fix the King's stuck-deathTimer/victory bug~~ —
    DONE, fixed in game.js (gate on `boss` alone; see the Phase 7 note above).
  - When any of the 12 planned regions actually gets built, use the
    cross-link pattern from expansion.md §3.13b, not just a single parent
    edge — that's the whole point of this session's interconnectedness fix.

PHASE 9 — Debug Tool Fix + Map Skeleton: 3 Anchor Regions (2026-07-12)
─────────────────────────────────────────────────────────────────────────────
[x] Debug tooling: window.abilityState fix
      - Added `if (typeof window !== 'undefined') window.abilityState =
        abilityState;` at the bottom of ability.js — same guard pattern as
        area.js's `window.AREAS = AREAS`. Fixes debug_v1.html's R10 check
        ("win.abilityState is undefined"), which needs to force-grant
        abilities on the sandboxed iframe's `win` before teleporting into
        each room.
      - Also hardened debug_v1.html itself: wrapped the R10 (teleport-survival)
        and R11 (embedded-door) check bodies in their own try/catch, each
        reporting its own failure and letting the run continue instead of
        one uncaught exception aborting every later check with a bare
        "FATAL". R09–R11 now always run to completion and report
        independently.
      - Not verified live in a browser this session (see NEXT SESSION note
        below) — confirmed only that ability.js's syntax is valid and the
        pattern matches area.js's proven fix. Ask a human to hard-refresh
        debug_v1.html and click "Run Live Checks" to confirm R10/R11 both
        report green.
[x] Map skeleton: 3 anchor regions, empty rooms, ability redistribution
      - Built the first 3 of the 13 expansion.md regions as real `AREAS`
        entries: **Mirror Veil** (mirror_veil_gate/_reflection/_hollow/_sanctum,
        col 2 rows -2..-5, branches north off Upper Ruins), **Event Horizon**
        (event_horizon_gate/_pull/_drift/_core, col 5 rows -1..-4, branches
        north off The Vault, gated on `phase_dash` per expansion.md's table
        3.1), and **Chrono-Space Rift** (chrono_rift_gate/_loop/_echo/_sanctum,
        col 4 rows -1..-4, branches north off The Forge). 12 new rooms total,
        each an empty skeleton (one full-width floor platform + doors only —
        no enemies, no lore, no decoration) per this task's spec, except the
        two sanctum rooms below.
      - **Ability redistribution — deviated from the literal example in
        session_priorities.md ("Phase Dash → Event Horizon, Shard Shot →
        Mirror Veil") for a structural reason**: Event Horizon's own
        expansion.md entry requires Phase Dash to enter, so Phase Dash can't
        also be its reward (chicken-and-egg — you'd need the ability to
        reach the room that gives it to you). Actual redistribution:
        - `phase_dash` moved from The Fracture → **Mirror Veil's sanctum**
          (Mirror Veil is expansion.md's stated "no ability required, good
          first region" — and it sits earlier in the spine than Event
          Horizon, so by the time a player reaches Event Horizon's
          phase-dash-gated door, Mirror Veil is already reachable).
        - `stillpoint` moved from The Vault → **Chrono-Space Rift's
          sanctum** (branches off The Forge, one spine room before The
          Vault, so it's always obtainable before The Vault's own
          `stillpoint`-gated east door is encountered).
        - `shard_shot` was deliberately left in Crystal Cavern — that room's
          own destructible wall puzzle requires the player to find Shard
          Shot before reaching that same wall, in the same room; moving it
          out would break Crystal Cavern's internal logic. Not one of this
          session's 3 anchor regions needs it as an entry requirement, so
          there's no forced reason to relocate it yet.
        - `charged_attack` (Crag Altar) is unchanged — Crag is already a
          proper side-region, not part of the "spine-linear layout" this
          task was about.
        - The Fracture's and The Vault's own north/east ability-gated doors
          (crag_entrance, the_rift) are untouched and still carry their
          original `requires` — they're just satisfiable later now, forcing
          a deliberate backtrack once the player fetches the ability from
          its new home. This is intentional non-linear design (expansion.md
          §3.14's whole point), not a bug.
      - Validated headlessly (see NEXT SESSION note — no browser available
        this session): wrote a throwaway Node harness that loads area.js in
        a `vm` sandbox (same technique export_graph.js already uses) and
        calls `validateAreaGraph()` + `validateAllRoomLayouts()` directly.
        Both pass clean: **27 rooms, 0 graph errors, 0 layout failures**.
        The two sanctum rooms initially failed the layout linter (their
        altar platform was a 194px unbroken rise from the floor, beyond max
        jump height) until stepping-stone platforms matching The Vault's
        original altar approach were added — same shape, reused
        deliberately for consistency.
      - Updated worldmap.html's hand-maintained `PLANNED_REGIONS` /
        `PLANNED_EDGES` / `CROSS_LINKS` lists per this file's own
        documented convention ("move built regions out of the placeholder
        list"): removed the single-node `event_horizon`, `mirror_veil`, and
        `chrono_space_rift` placeholders, and re-pointed the edges/cross-links
        that referenced them at the real built room ids (e.g.
        `event_horizon_gate`/`event_horizon_core`, `mirror_veil_sanctum`,
        `chrono_rift_gate`/`chrono_rift_sanctum`) so the planner doesn't show
        stale duplicate nodes.
      - NOT done: enemies, lore, decoration, or Tier 2/3 secret rewards in
        any of the 12 new rooms (out of scope for this "empty skeleton"
        pass — that's priorities #4/#5 in session_priorities.md). No new
        ability (Graviton Surge) was added — Event Horizon's deepest room
        (event_horizon_core) has an inert locked stub door toward
        `graviton_core`, same convention as Crag Warden's existing stub.
        Non-linearity is currently just 3 parallel branches off the origin
        spine (Mirror Veil off Upper Ruins, Event Horizon off The Vault,
        Chrono-Space Rift off The Forge) — no cross-links between the new
        regions themselves yet; expansion.md §3.13b's cross-link lattice
        applies once more of the 13 regions exist.
[x] Bug fix: unrecognized `requires` values silently passed doors as unlocked
      - Found by hand-testing Event Horizon Core's stub door (`requires:
        'graviton_surge'`): walking through it froze the game. Root cause —
        game.js's transition-requires check (both the actual traversal gate
        in the update loop, and the separate locked/unlocked door-tint check
        in the draw loop) was a manual if-chain that only recognized
        `phase_dash`/`shard_shot`/`stillpoint`/`boss_gate`/`tutorial_complete`.
        Any other `requires` value (e.g. `graviton_surge`, or `charged_attack`
        on a transition) matched none of those ifs and fell through as
        *unblocked* — the opposite of "safely inert." The player then walked
        into `switchArea('graviton_core', ...)`, a room that doesn't exist in
        `AREAS`, and the next frame's read of `undefined.groundY` (etc.)
        threw an uncaught exception that silently killed the rAF loop —
        exactly what "the game just freezes" looks like from the outside;
        the debug `unstuck` command can't fix it because the loop itself is
        dead, not the player's position.
      - This bug was already latent at Crag Warden's identical
        `requires: 'graviton_surge'` stub door (pre-existing, not introduced
        this session) — just far harder to reach, so it was never hit.
      - Fix: added a single shared `hasAbilityRequirement(requires)` helper
        (game.js) used by both the traversal check and the draw-tint check,
        which explicitly returns `false` (blocked) for any unrecognized
        value instead of implicitly passing through. Re-ran the Node linter
        harness afterward — still 26/26 rooms clean, no regressions.
      - Also fixed the same silent-passthrough gap for `charged_attack` as a
        transition `requires` value (previously unhandled the same way,
        just never hit yet since no built transition uses it — Crag's
        rubble wall gates via a destructible-platform check, not a
        transition).
[x] Bug fix: Phase Dash echoes survived room transitions
      - `switchArea()` never cleared the `echoes` array (it's cleared on 6
        other reset paths — new game, load, respawn, checkpoint reset — but
        not on a plain room change), so an echo left behind before walking
        through a door reappeared in the new room at the same raw (x,y)
        coordinates, which is almost always meaningless in a different
        room's layout. Added `echoes = [];` to `switchArea()` in game.js.
[x] Cross-links between the 3 anchor regions (less linear, per direct
    feedback that 3 independent spokes off one spine still feels linear)
      - Realized while discussing this with the user that expansion.md
        §3.13b's compact 3-column cluster grid assumes each region is a
        SINGLE node — it has no room for a region's own 4-7-room depth
        without colliding with a neighboring region's reserved cell. So
        "moving the 3 anchor regions to their exact atlas col/row" isn't
        actually a coherent fix once a region has real interior rooms (Crag
        already sidesteps this the same way — a private column, not a
        shared grid cell). Repositioning them wasn't done; cross-linking
        them was, which is the concrete lever expansion.md itself names for
        "feels like a web, not a tree."
      - Added two real (not planned-only) cross-links:
        - Mirror Veil Sanctum <-> Event Horizon Gate (two-way,
          `shortcut: true`). The moment a player has Phase Dash (picked up
          in this exact room), they can walk straight into Event Horizon
          (which requires Phase Dash to enter) instead of backtracking the
          entire origin spine to The Vault.
        - Chrono-Space Rift Sanctum -> The Fracture (one-way shortcut,
          same convention as Crag Warden's existing shortcut and the
          planned Echoing Abyss -> Crystal Cavern link). Getting Stillpoint
          also earns a fast lane back to The Fracture's Crag gate,
          symmetric with the Mirror Veil link above.
      - Re-validated: still 27 rooms / 0 graph errors / 26 rooms / 0 layout
        failures after adding both.
[x] Task 4 — Room Aesthetics: generative visual identity + cave-mouth doors
      - Added `REGION_STYLES` (game.js) — a palette (primary/secondary/glow)
        keyed by `room.region`, covering the 3 built anchor regions:
        Mirror Veil (violet, reflection motif), Event Horizon (indigo,
        gravity-well motif), Chrono-Space Rift (purple, clock/loop motif).
        A region with no entry (origin, crag, any future region) just
        renders with the plain pre-existing look — no regression.
      - `decorateRoomForRegion(ctx, room, region)` — one room-wide ambient
        effect per region, drawn once per frame under the platforms: Mirror
        Veil gets a horizontal "mirror seam" with a scattered diamond
        motif; Event Horizon gets a radial gravity-well vignette anchored
        off-screen left (visual read for the region's leftward-pull
        mechanic, which isn't physically simulated yet) plus slow-pulsing
        concentric rings; Chrono-Space Rift gets a slow-rotating
        clock-spoke hub.
      - `decoratePlatformForRegion(ctx, plat, region)` — per-platform edge
        treatment, called right after the existing `drawPlatform()`: Mirror
        Veil gets a faint upside-down "reflection ghost" of the platform;
        Event Horizon gets inward-curving corner glows (lensing cue);
        Chrono-Space Rift gets ruler-style tick marks along the top edge.
        Destructible/crystal platforms are skipped — they keep their own
        dedicated crackling-crystal look everywhere, unchanged.
      - `drawDoor(ctx, trans, area, blocked)` replaces the old flat
        rectangle for every transition in every room (not just the 3
        decorated regions — this is a plain shape swap, low risk): a
        glowing portal ellipse for ability-gated doors, a one-way arrow
        in a plain frame for shortcut/oneWay doors, an arched stone
        cave-mouth (rounded top, not a rectangle) for everything else.
        Tinted per-room via `mapAccent`/`ambientColor`, red-shifted the
        same way the old blocked-door tint was. The existing direction
        arrow overlay is kept as-is on top, since none of the three new
        shapes imply direction on their own.
      - **Design decision, confirmed with the user before building**: this
        is a pure rendering layer keyed off `room.region` / `mapAccent` /
        `ambientColor` — fields that already exist on every room. It adds
        NO new fields to platforms/transitions and changes nothing about
        the saved room JSON shape, so `levelEditor.html`'s exported rooms
        get the new look automatically the moment their `region` matches a
        `REGION_STYLES` key — zero editor changes needed, by design, not
        by accident.
      - Verified: `node --check` passes, and the Node linter harness still
        reports 27/0/26/0 (no regressions — decoration is drawing-only,
        doesn't touch any data the linters read).
      - NOT done: a live visual tuning tool (level_designer.html) for
        picking region palettes/decoration parameters interactively — asked
        the user to confirm scope before starting since it's a second tool
        comparable in size to levelEditor.html itself, not a quick add-on.

NEXT SESSION SHOULD [HISTORICAL — written after Phase 10; superseded by
"WHAT'S ACTUALLY NEXT" at the end of this file. Several items here are now
done (Void Tether shipped in Phase 16/19). Kept for the reasoning.]:
  - **Highest priority — two flagged balance issues need a deliberate pass
    before more content is built on top of them**: BUG-013 (Stillpoint
    blocks attacking, so its own offensive buff can't trigger) and BAL-001
    (Phase Dash is too strong) in BUG_ANALYSIS_AND_QA_PLAN.md. Both affect
    core traversal/combat that everything else (Crag, the 3 anchor regions,
    all 9 built enemies) is tuned around, so fixing them later risks
    re-tuning multiple already-built rooms.
  - Playtest the 5 new enemies from Phase 10 in `enemy_test.html` (each
    against 2-3 loadouts) — this session validated them headlessly
    (`node --check` + the Node linter harness) but never confirmed they
    feel right or that Deflector Drone's reflection is fair.
  - Confirm debug_v1.html's R10 and R11 pass in a real browser (hard-refresh
    first — browser caching was suspected during this session). This
    session's Node-only validation confirms the underlying data is correct;
    it does not confirm the live iframe harness sees it correctly.
  - Confirm the Task 4 decoration/doors actually look good in a real
    browser (this session validated data/syntax only, not the visual
    result — genuinely can't be judged without eyes on a canvas).
  - Populate enemies/lore/Tier 2-3 rewards per session_priorities.md #5, and
    add real cross-links between Mirror Veil/Event Horizon/Chrono-Space Rift
    once more of the 13-region lattice exists (currently 3 independent
    spine branches, not yet a web).
  - See Plans/regions.md for the planned-region room/effect breakdown and
    the 25-physics-concept brainstorm for 5 additional regions beyond the
    13 — nothing there is built or wired in yet, purely a planning doc.
  - The newest ability in any design doc is **Void Tether** (`story.md`
    §4, key `T`, 1 Fracture Pip) — a grapple-hook ability (hit an enemy to
    pull them toward you; hit a wall/ceiling to pull yourself toward it),
    tied to the not-yet-built companion/story system (a miniboss dilemma in
    The Polar Shift). [STALE as of 2026-07-17 — Void Tether IS implemented:
    ability.js flag + player.js firing + combo.js action; its pickup is
    Timeline X Roads Rm 2.] Newer conceptually
    than Graviton Surge (expansion.md Phase 1), which is itself still
    unbuilt.
  - **PLANNED: `level_designer.html`** (not built yet — noted per the user's
    request, build when they're ready). Purpose: a live visual tuning tool
    for the Task 4 decoration system, so the user can adjust a region's
    look without hand-editing `REGION_STYLES`/`decorateRoomForRegion()` in
    game.js. Rough shape, to keep it consistent with this codebase's "live
    data, not a hardcoded mockup" convention (same spirit as
    `export_graph.js` reusing area.js's real functions):
      - Load `area.js` for real room data (like `worldmap.html` already
        does) plus the real `REGION_STYLES`/`decorateRoomForRegion()`/
        `decoratePlatformForRegion()`/`drawDoor()` functions from game.js
        (via a `<script>` include, same load pattern `index.html` uses —
        NOT a re-typed copy, to avoid the two drifting apart).
      - A room/region picker (dropdown), a `<canvas>` that renders the
        picked room using the REAL decoration functions (so what you see
        is exactly what the game draws, not an approximation).
      - Editable controls per region: primary/secondary/glow colors (color
        pickers), and whatever numeric knobs make sense per effect (e.g.
        Mirror Veil's diamond spacing, Event Horizon's ring count/spacing,
        Chrono-Rift's spoke count/rotation speed) — bound to a local copy
        of `REGION_STYLES` the tool mutates live, not the loaded one.
      - A door-style preview strip (all 3 door kinds side-by-side, tinted
        by the selected region) since `drawDoor()`'s shapes aren't
        parameterized per-region yet (they're purely shape/tint), but
        should be visually confirmed together with the rest of a region's
        look.
      - An "Export" button that serializes the tool's working style object
        back into a paste-ready `REGION_STYLES = {...}` JS block (matching
        `levelEditor.html`'s existing "Export JSON" pattern) — the user
        pastes it into game.js by hand, same as `levelEditor.html`'s output
        gets pasted into area.js. No live write-back to game.js itself.
      - Scope explicitly does NOT include editing room geometry (platforms/
        transitions) — that stays `levelEditor.html`'s job. This tool only
        edits the presentation layer.
    Suggested build order: do this once the user has picked their 5 new
    regions from `regions.md`'s brainstorm list, so the tool's region
    picker covers everything that'll actually need a look, not just the 3
    built so far.

PHASE 10 — Task 5: 5 New Enemies + Enemy Editor (2026-07-12)
─────────────────────────────────────────────────────────────────────────────
[x] 5 new enemies, all in enemy.js, chosen to work with abilities already
    built (Phase Dash, Shard Shot) rather than Graviton Surge [which as of
    2026-07-17 IS implemented — ability.js constants/cooldown/canActivate,
    game.js ABILITY_GRANTS + save/load, player.js graviton state]:
      - **Null Sentinel** (Phase Dash counter, expansion.md 2.3 #29) —
        extends Enemy, reuses the base chase/patrol/attack AI via
        `super.update()`. Alternates phaseable (dim, 30% alpha) / solid
        (bright) every ~1s; dashing into it while solid cancels the dash
        (`player.phaseDashing=false`), deals 1 damage, strips i-frames.
        While phaseable, no interaction at all — a free pass-through.
      - **Anchor Wraith** (Phase Dash counter, 2.3 #28) — floats
        (`ignoreVertical`), drifts slowly toward the player (doesn't chase
        aggressively), draws a visible ~120px stasis-field ring. Dashing
        anywhere inside the ring cancels the dash the same way Null
        Sentinel does. Low HP (2) and no melee attack of its own
        (`getAttackHitbox()` returns null) — meant to be killed from
        outside the field, not fought head-on, per its own design brief.
      - **Deflector Drone** (Shard Shot counter, 2.3 #31) — hovers in
        place, its directional shield always faces the player. This is the
        one enemy whose counter couldn't be made fully self-contained in
        enemy.js: reflecting a shot requires touching game.js's
        projectile/enemy collision loop (`game.js` ~line 1975) since
        `projectiles[]` lives there, not on the enemy. Added a
        `shieldFacesPoint()` check there — a shot hitting the shielded side
        gets `vx *= -1` and is tagged `reflected: true` instead of being
        destroyed; a new, separate check right after the projectile update
        loop lets a `reflected` shot hit the player back (dodgeable). This
        is the ONLY new system-level game.js change this task needed —
        confirmed no other enemy required one.
      - **Mirror Sprite** (expansion.md §2 #22, Mirror Veil flavor) — only
        tangible when the player is facing toward it (`takeDamage()`
        no-ops while intangible); attacks from behind otherwise
        (`getAttackHitbox()` stays live regardless of tangibility — that's
        the actual threat). Reuses base chase/attack AI via
        `super.update()`.
      - **Echo Stalker** (expansion.md §2 #2, Mirror Veil flavor) —
        teleports to just behind the player's current facing the instant a
        Phase Dash ends (`wasDashing && !player.phaseDashing`), on a ~0.75s
        cooldown between blinks so it can't chain-teleport every frame.
        Reuses Stutterer's decoy-blink visual convention. Doesn't chase on
        foot at all — positioning is entirely via the teleport.
      - Populated Mirror Veil's `mirror_veil_reflection` and
        `mirror_veil_hollow` rooms with one Mirror Sprite and one Echo
        Stalker respectively (previously empty `enemies: []` skeletons
        since Phase 9) — the region's first real content, and both enemies
        make direct thematic sense there ("reflection"/"echo" match the
        region's own name).
      - Registered all 5 in `spawnAreaEnemies()`'s type dispatch (game.js)
        so they're spawnable from real `AREAS` data, not just the test
        bench.
[x] `enemy_test.html` updates
      - Added the 5 new classes to `CLASS_MAP` (was missing them — without
        this the roster entries would have looked spawnable but silently
        done nothing when clicked).
      - Moved all 5 from the "Planned" roster sections to "Built" with
        updated blurbs; removed the now-stale duplicate "Planned" entries
        for the same 5 ids so the roster has exactly one entry each.
      - Added an editor-handoff mechanism: `enemy_editor.html`'s "Test"
        button writes `{enemyId, loadout, overrides}` to
        `localStorage['stillpoint_enemy_editor_test']` and opens this page;
        on load, if that key is present, it auto-selects the enemy/loadout,
        spawns it, applies the stat overrides to the live instance, then
        deletes the key so a manual reload doesn't re-trigger it.
[x] New `enemy_editor.html` (per session_priorities.md #5's spec)
      - Enemy picker (the 9 real built classes — the 4 pre-existing plus
        the 5 new ones), numeric stat overrides (Max HP, Attack Cooldown,
        Patrol Range — the three plain instance fields every enemy class
        already exposes; no new per-class fields were invented for this),
        ability-loadout picker (same 5 presets as enemy_test.html), a small
        live canvas preview (body color + size scaling with HP + patrol
        range indicator — a UI preview, not a physics simulation), a "Test
        in Arena" button using the handoff above, and a "Save JSON" export
        matching `levelEditor.html`'s existing textarea-export convention.
      - Does NOT edit enemy.js itself, room placement, or AI/geometry logic
        — scoped strictly to the numeric knobs + loadout + a hand-off to
        the real test bench, per the task's own spec ("set its stats...
        assign an ability loadout, hit Test").
[ ] NOT done: actual playtesting/balance passes. This session validated
    everything headlessly (`node --check` on all 4 touched files, plus the
    Node linter harness — still 27/0/26/0, no regressions) but could not
    play the game in a browser to confirm the 5 new enemies feel right,
    verify the Deflector Drone reflection is dodgeable/fair, or tune any of
    the placeholder stats above. This is the single biggest open item from
    this task — needs a human pass in `enemy_test.html` (each enemy against
    2-3 loadouts) before treating the balance as settled.

PHASE 11 — Critical Fix: Phase Dash Was Unobtainable (2026-07-12)
─────────────────────────────────────────────────────────────────────────────
[x] Found by the user's own playtesting (not any linter): after Phase 9
    moved Phase Dash's pickup from The Fracture to Mirror Veil, it became
    completely unreachable. Root cause: Echo Bridge's p3→p4 gap is
    explicitly designed to require Phase Dash ("160px — Phase Dash only,"
    per that room's own long-standing comment), and that gap gates the
    ONLY other path into Mirror Veil (via Upper Ruins). Result: a hard
    circular lock — Phase Dash was needed to reach the room that grants
    Phase Dash. This is exactly the class of bug the (still-skipped) task 3
    dynamic bot-walker exists to catch — `validateAreaGraph()` only checks
    door topology, and `validateRoomLayout()` only checks reachability
    *within* one room assuming a default loadout that already includes
    `phase_dash` — neither can see a cross-region ability-order softlock
    like this, so this session's Node-only validation gave false confidence
    throughout Phase 9/10.
    Fix: added a direct, always-open shortcut door between The Fracture
    (right where the Phase Dash pickup used to physically sit) and Mirror
    Veil's Gate room — two-way, `shortcut: true`, no `requires`. Verified:
    `validateAreaGraph()` and `validateAllRoomLayouts()` both pass (27
    rooms / 0 graph errors / 26 rooms / 0 layout failures).
    **This is a strong argument for actually building task 3's bot-walker
    before any further ability/region redistribution** — this exact bug
    class will keep recurring otherwise.
[x] Added a permanent design rule to CLAUDE.md per the user's explicit
    request: no lock-and-key gating, ever — only ability/toolkit gates
    (Hollow Knight's mantis-jump-ledge model, not a literal key-behind-a-
    door). Flagged a real conflict: expansion.md's Warp Gate Nexus (§3.11)
    is planned around literal "3 Keystones," which needs to be revisited
    with the user before it's ever built.
[x] Follow-up correction, same session: the user pointed out Echo Bridge's
    p3->p4 gap (165px) is actually crossable with a plain dash — it never
    needed Phase Dash at all. The room's own long-standing comment
    ("Phase Dash mandatory") and the door's `requires: 'phase_dash'` tag
    were both simply wrong, predating this session. Removed the
    `requires: 'phase_dash'` from that door (transitions + connections) and
    corrected the stale comment. This makes Echo Bridge -> Upper Ruins ->
    Mirror Veil a SECOND always-open route to Phase Dash, alongside the new
    direct shortcut from The Fracture — redundant, but harmless, and
    actually welcome given the stated preference for the map to read as a
    web rather than a single path. Re-verified: 27/0/26/0, still clean.

PLANNED (not started) — Pacing / Sequence-Break Fixes, requested 2026-07-12
─────────────────────────────────────────────────────────────────────────────
Three related pacing/critical-path concerns raised by the user in one go,
docs-only for now (nothing implemented):

[ ] Charged-Attack-only wall gating the path to the boss fight, immune to
    Phase Dash bypass. Purpose: stop a player from sequence-breaking
    straight to the King without engaging with Crag/Charged Attack content.
    Design constraints for whoever builds this:
      - Must be a genuine destructible wall (`destructible: true`, gated by
        the existing heavy-attack-only rule already used for Crag's rubble
        wall), not a `requires` flag on a transition — per the no-lock-and-
        key rule added this session, the block should be a real obstacle
        the toolkit can't get around, not an arbitrary check.
      - Must span the FULL vertical extent of whatever corridor it sits in
        (floor to ceiling, or floor to the room's practical jump-apex
        ceiling) — a partial wall that Phase Dash (14px/frame over 8
        frames = 112px of extra reach) or a jump can go over/around
        defeats the entire point.
      - Placement candidate: somewhere on the direct route The Rift ->
        Antechamber -> Boss Arena (the true, un-branching critical path to
        the King) — that route currently has zero ability gates at all, so
        a sufficiently practiced player could reach it having skipped Crag
        (and therefore Charged Attack) entirely. No specific room/position
        chosen yet; needs a look at actual room geometry in The Rift or
        Antechamber to find a spot that reads as a natural obstacle, not an
        arbitrary wall dropped into open space.
      - Validate with the Node linter harness (`validateAreaGraph()` +
        `validateAllRoomLayouts()`) after placement, same as every other
        room change this session.
[ ] Colossus Core miniboss (Crag Warden) is currently skippable and
    pointless to fight: Charged Attack is granted in Crag Altar, the room
    BEFORE the miniboss arena, so a player already has the reward Charged
    Attack exists to lead toward before ever meeting the thing it's
    balanced around fighting — nothing stops them from just turning around
    and leaving Crag once they have it. Proposed fix (not yet implemented,
    needs confirmation before building): **reverse the order** — make
    defeating Colossus Core the thing that grants Charged Attack, instead
    of a pickup in Crag Altar beforehand. That makes the miniboss a
    mandatory gate to obtain the ability (standard "boss guards the
    reward" pattern) rather than an optional fight after the reward's
    already in hand. This also directly feeds the wall above: if Charged
    Attack now comes FROM beating the miniboss, the wall gating the path to
    the King becomes a real, unavoidable checkpoint — you can't have
    Charged Attack without having fought Colossus Core, and you can't reach
    the King without Charged Attack. Needs area.js changes to crag_altar
    (remove the ability pickup) and crag_warden (add it, likely on
    Colossus Core's defeat, mirroring how the King's own defeat is handled
    in game.js) — not done, this is the plan only.
[ ] "More sparse Stillpoints" — flagged by the user, exact scope worth
    confirming next session since "Stillpoint" is both the ability name and
    could refer to Anchor checkpoints (the actual save/heal points scattered
    through nearly every room — 27 of area.js's ~28 real rooms have at
    least one `anchors[]` entry currently). Given this was raised alongside
    two other critical-path-difficulty concerns (boss-skip wall, miniboss
    being trivially avoidable), the most likely reading is: **reduce Anchor
    checkpoint density** so death/failure carries more weight and healing
    is a real resource, not a per-room guarantee — not a change to the
    Stillpoint ability's own mechanics (already covered separately by
    BUG-013/its lifesteal balance in BUG_ANALYSIS_AND_QA_PLAN.md). Confirm
    this reading with the user before touching any room's `anchors[]`.

PHASE 12 — Level Editor Real Data + Bug Fix (2026-07-12)
─────────────────────────────────────────────────────────────────────────────
Answers session_priorities.md #8 (Linter Integration into Level Editor) —
that item is DONE, see below. Also fixed a real (if latent) gameplay bug
found while auditing the enemy spawn path.

[x] `levelEditor.html` no longer runs on a hardcoded `PRESETS` copy of room
    data — it now loads `area.js`/`enemy.js` directly and edits the real
    `AREAS` object (all 27 rooms, grouped by region in the picker). Export
    is now a generic JS-literal serializer over the whole room object
    (handles `Infinity` for `pitDeathY`, preserves every field including
    ones the UI has no control for — col/row/connections/mapAccent — so
    round-tripping through the editor can't silently drop data the way the
    old fixed-field export could). This directly resolves the "Enemy
    palette is stale" / "Presets separate hardcoded copies" gaps noted in
    CLAUDE.md's Dev/debug tooling section — that note is now corrected.
[x] Added `ENEMY_REGISTRY` at the bottom of `enemy.js` (type-string → class,
    one line per enemy) as the single source of truth for which enemy
    classes exist. The editor's enemy-type dropdown reads from it (was
    hardcoded to Fractured/Stutterer only, now lists all 10 built types
    automatically). `game.js`'s `spawnAreaEnemies()` was refactored to look
    up classes from the same registry instead of a hand-written if/else
    chain.
[x] **Bug fix, found via that refactor**: the old if/else chain in
    `spawnAreaEnemies()` had no branch for `blitz_guard` — any room enemy
    with that type would have silently spawned as a generic base `Enemy`
    with none of BlitzGuard's real behavior. No room currently places one
    (so no live-game impact yet), but it's fixed now via the registry
    lookup, and any future enemy class only needs the one `ENEMY_REGISTRY`
    line to be spawnable correctly everywhere.
[x] New editor features: undo/redo (`Ctrl+Z`/`Ctrl+Y`), copy/paste
    (`Ctrl+C`/`Ctrl+V`), multi-select (Shift+click), pan (Space/middle-drag),
    mouse-wheel zoom, configurable grid snap (5/10/20/50/off), room
    width/groundY drag-resize handles, **per-object resize handles**
    (Slides/PowerPoint-style — drag any of 8 handles around a selected
    platform or transition to resize it, replacing type-the-number-only
    editing), layer front/back ordering, an object search/filter box,
    region/roomType/miniboss-ID/no-pit-death fields (all previously
    editor-invisible even though the engine already supported them), a
    "New Room" blank-template button, auto-tile "Stitch" (snaps a dragged
    platform's edges flush against neighbors within 14px), a "Test Spawn"
    reachability-envelope overlay (jump-arc + dash-reach visualization from
    a click point, using the same physics fallback constants `area.js`'s
    own linter uses), "Validate This Room" (runs the real
    `validateRoomLayout()` on in-progress edits, not just the saved room,
    and circles failures red on canvas), "Diff vs Saved" (field-level
    comparison against the pristine `area.js` copy), and "Check All Rooms"
    (batch-runs the linter over every saved room, click a failing one to
    jump straight to it).
    **session_priorities.md #8 is now satisfied** by "Validate This Room" +
    "Check All Rooms" — trimmed from that file.
[ ] NOT done: the editor still has no UI for hazards/switches/moving
    platforms/one-way platforms — those need new `game.js` runtime behavior
    first (see the "Phase 3" section of `Plans/level_editor_guide.md` for
    the per-item effort estimate and where to hook them in). Building
    editor UI for these before the engine half exists would let someone
    place objects in a room that silently do nothing in actual play.

PHASE 13 — Removed the Invisible groundY Floor: Rooms of Any Height (2026-07-12)
─────────────────────────────────────────────────────────────────────────────
User request: taller/deeper rooms, "make groundY irrelevant." Investigation
found `player.js`'s collision had an unconditional, x-independent snap —
`if (this.y + this.height > bounds.groundY) { snap to groundY }` — active in
every room regardless of real platforms. That made `groundY` a hard,
always-on floor everywhere, which meant: (1) no room could ever be deeper
than its own `groundY`, and (2) `pitDeathY` was practically dead code —
the player could never fall far enough past `groundY` to reach it, in any
room, ever. Confirmed via the room linter (`validateRoomLayout()`) that its
own reachability model already assumed gaps were real (no implicit floor) —
this was the one place actual gameplay physics disagreed with the linter's
(correct) assumptions.

[x] Removed the unconditional groundY snap from `player.js`. Standing now
    comes only from real platforms in `area.platforms`; falling past all of
    them is governed purely by `pitDeathY` (or nothing — no fall-death by
    default, confirmed with the user, matches CLAUDE.md's existing rule).
[x] Added `roomHeight` (optional number) to the room schema — the real
    total vertical extent, used by `game.js`'s `getBounds()`/
    `updateCamera()` as the camera's bottom clamp (previously hardcoded to
    `area.groundY - H + 100`, which is exactly what stopped the camera from
    following a player into a room deeper than groundY). Falls back to
    `groundY + 100` when unset, so all 27 existing rooms are pixel-identical
    in camera framing to before this change — verified via
    `validateAllRoomLayouts()`/`validateAreaGraph()` (still 27/0 graph
    errors, 26/0 layout failures) and direct browser testing (player falls
    past y:12000+ over 200 frames with no platforms below, instead of being
    caught at groundY).
[x] `pitDeathY`'s fallback (when a room doesn't set it) changed from
    `groundY + 100` (dead code — unreachable under the old floor) to
    `Infinity`. Rooms that want a real pit still set `pitDeathY` explicitly,
    same as always.
[x] Wired `roomHeight` into `assertDoorOnCorrectEdge()` in `area.js` — that
    function already had a TODO/warn-only stub for strict north/south door
    edge checks ("no room-height field yet"), waiting on exactly this
    field. Rooms with `roomHeight` set now get the same strict edge
    validation east/west doors already had; rooms without it keep the old
    warn-only behavior.
[x] `levelEditor.html`: added a `height` field + a third drag-resize handle
    (green line, independent of the red groundY line and the blue width
    line) for `roomHeight`. GroundY's line/label now says "(floor reference
    only)" so it doesn't read as a hard bound anymore. Canvas height is no
    longer capped at 900px — tall rooms scroll within the already-
    `overflow:auto` `#wrap` container instead of being squashed to fit.
[x] DONE 2026-07-17 (Phase 20): 71 of 72 rooms now set `roomHeight`, sized
    from the world board — the capability built here is fully in use (tall
    shafts like the_fracture_part1 1000x2821 and chrono_rift_loop2
    1133x5947). Still unproven in real gameplay by a human (headless
    validation only).

PHASE 14 — `ceiling: true` Platform Flag (2026-07-12)
─────────────────────────────────────────────────────────────────────────────
Follow-up to Phase 13, same session: cave-style rooms need a literal solid
ceiling (blocks the player from jumping out of the cavern), but the only
existing way to author one was a normal `platforms[]` entry — which the
room linter correctly flagged as "unreachable," since nobody stands on top
of a ceiling. Root issue: no schema distinction between "a real floor/ledge
that must be reachable" and "a boundary surface that blocks movement but
was never meant to be landed on."

[x] Added `ceiling: true`. First pass gave it asymmetric collision (skip
    landing, keep the head-bonk) — corrected same session per user
    feedback: a ceiling should be IDENTICAL to a normal platform in
    `player.js` (full collision, landable from either side), full stop.
    `ceiling` is purely a linter-exemption flag, nothing else — it carries
    no special-cased physics at all.
[x] `area.js`'s `_linterStandable()` excludes `p.ceiling`, so ceiling
    pieces are never checked for reachability — they were never a real
    floor/ledge to begin with, that's the one and only thing the flag does.
[x] `levelEditor.html`: `ceiling` checkbox next to the existing `wall`
    checkbox in the platform properties panel, plus a distinct rust-colored
    dashed style + `▽` icon on canvas so ceiling/wall pieces read
    differently from real floors at a glance. Label corrected to "Normal
    collision, exempt from reachability check."
[x] Verified in-browser: a player dropped onto a `ceiling` platform lands
    on it normally (grounded, standing) — same as any other platform.
    Re-ran `validateAllRoomLayouts()`/`validateAreaGraph()` — still 27/0
    graph errors, 26/0 layout failures (no existing room uses `ceiling`
    yet, purely additive).

PHASE 15 — Phase Dash broken by the composable enemy system (2026-07-15)
─────────────────────────────────────────────────────────────────────────────
User report: Phase Dash stopped letting the player pass through enemies to
appear on the other side, since the new `ComposedEnemy` system (see
`Plans/enemy_system_plan.md`) landed. Root cause was in `game.js`'s
per-enemy collision loop, not in `enemy.js`/`ability.js`:

[x] `separateFromEnemy(player, enemy)` (physically pushes the player out of
    an overlapping enemy) was called unconditionally on every overlapping
    frame, with no Phase Dash exemption. During a dash, this fought the
    dash's own velocity every frame and just shoved the player back out
    the way they came instead of letting them through — so the player was
    invincible during Phase Dash but still physically blocked by enemies,
    which read as "Phase Dash doesn't work anymore." Fixed by skipping the
    separation call while `player.phaseDashing` is true (still runs
    normally otherwise, so enemies remain solid outside of a dash).
[x] Separately, the "enemy attack hits player" block (the `enemyAtk`
    hitbox check, just above the body-contact block) had no
    `player.invincibleTimer <= 0 && !player.phaseDashing` gate at all —
    every other player-damage check in this file (boss body/projectiles,
    miniboss, the enemy body-contact block right below it) has this gate,
    this one just didn't. Meant an enemy's attack hitbox (as opposed to
    its body) could still land during a Phase Dash. Added the same gate
    used everywhere else for consistency.
    Not yet verified in-browser (see `CLAUDE.md`'s hard rule) — user to
    confirm Phase Dash passes through enemies cleanly again.

PHASE 16 — Ability leveling system (Lv0-4) + enemy_test.html tuning panel (2026-07-16)
─────────────────────────────────────────────────────────────────────────────
Implemented the full leveling design from `Plans/Enemy_Design.pdf`: all 6
abilities (Strength, Phase Dash, Shard Shot, Stillpoint, Graviton Surge,
Void Tether) now have real Lv0-3 numeric scaling plus a shared Lv4 "Limit
Break" Enhanced State. Graviton Surge and Void Tether did not exist in code
before this session (see `CLAUDE.md`'s "not yet built" note, now stale) —
both are built from scratch here, base ability + all levels.

[x] Lore-pip cost curve: Lv1/2/3 = 2/3/4 pips per ability (`INVENTORY_UPGRADES`
    in game.js, `costs: [2,3,4]`), matching the user's spec against the
    corrected 18-pip total (see the Rift fix below). `tryUpgrade()`/
    `totalPipsSpent()` reworked for per-level costs instead of a flat cost.
[x] Lv4 (Limit Break) is NOT lore-pip-purchasable — it's the one-time
    endgame-region unlock per the doc's Rule 0 (`grantLimitBreak()` in
    game.js, not yet wired to any room since that endgame region isn't
    built — see `floor_plan.md`'s Sovereign Room nodes). enemy_test.html
    bypasses this entirely for testing (see below).
[x] Strength: attack speed +15% Lv1 (18f->15f cooldown), damage +20%/+45%
    Lv2/3, incoming knockback -30% Lv3. Lv4: full-charge-Z release
    activates a 6s Enhanced State (+25% atk speed, +50% dmg, zero
    knockback, hazard immunity) — matches the doc's "Full Hold activates
    Limit Break on release" rule exactly. Not implemented: the Lv4 3-hit
    combo and wall-bounce bonus damage (flagged as follow-up, not blocking).
[x] Phase Dash: 8-directional dash/Phase Dash at Lv1+ (`getDashDirection()`
    reads aimUp/aimDown + moveLeft/moveRight at cast time, falls back to the
    old facing-only horizontal dash below Lv1 or with no directional input
    held — applies to both the regular Dash and Phase Dash, per the doc).
    Echo stun duration +30% at Lv2 (`ECHO_DISTRACT_DURATION` is now a `let`
    recomputed every frame off the ability level, ability.js). Lv3: the
    active echo counter-attacks once (50% player damage, AoE at its
    position) the moment the player swings, then fades — new
    `player.echoAttackPending` flag set at all 3 swing-start sites,
    consumed in game.js.
[x] Shard Shot: damage +25% Lv1 (`shardShotDamage()`), fires a 2nd shard
    with a spread at Lv2 (`useShardShot()` now returns an array). Lv3 Beam:
    holding past 1s (`BEAM_CHARGE_TIME`) with 1 Fracture Pip available fires
    a piercing beam instead of the normal aimed shot (`useShardBeam()`);
    added real multi-hit-pierce support to the projectile-vs-enemy loop
    (per-projectile `hitEnemies` Set, mirrors the melee per-swing dedup
    pattern) since it didn't exist before. Found in passing but NOT fixed
    (out of scope, pre-existing): Shard Shot's cooldown is never actually
    set after firing (`abilityState.shardShotCooldown` has a decrement and
    a UI-ring read, but nothing ever assigns it `SHARD_SHOT_COOLDOWN`) —
    worth a follow-up session.
[x] Stillpoint: rebuilt the activation model from an indefinite
    toggle-drains-a-pip-per-60-frames mechanic into the doc's tap (1 Pip,
    short fixed duration)/hold (3 Pips, long fixed duration) model — a real,
    deliberate mechanic change, not just a numbers tweak (`player.js`'s
    stillpoint block). Lv1 duration +25%, Lv2 lifesteal cap 2 HP, Lv3 slow
    90%/cap 3 HP (`stillpointLifestealCap()`, game.js). Lv4: 2s full freeze
    + 4s at 90% slow, cap 4 HP. Also fixed a real Global Rule gap: nothing
    previously stopped Fracture Pip gain during Stillpoint or Limit Break
    ("prevents infinite chaining") — `Player.gainFracture()` now gates on
    both.
[x] Graviton Surge — built from scratch (base + Lv0-4). Flip is
    player-only gravity inversion (not room-wide — see follow-up note
    below), 3s/4s duration Lv0/1, 1 dmg on landing after a flip at Lv1+
    (`gravitonSlammed` one-shot-per-flip flag on each enemy). Lv2+: holding
    the button raises a Gravity Ball that pulls nearby enemies each frame;
    releasing at Lv3+ detonates it (4 dmg/300% knockback, 6 dmg/faster pull
    at Lv4 Limit Break, which also grants true flight — zero gravity, not
    just flipped).
[x] Void Tether — built from scratch (base + Lv0-4). Tap targets the
    nearest enemy in range and reels it toward the player (game.js, since
    it needs the enemy list); Lv1 +30% range, Lv2 electrified (+1 dmg/15f
    stun on arrival), Lv3 +50% pull speed + arcs a stun to one nearby
    enemy, Lv4 0-pip/1.5s-cooldown cast + a 3s/2dps burning DoT (new
    `enemy.burning` tick handler in the main enemy-update loop).
[x] Limit Break (Lv4) shared framework: flat blue aura on the player
    (per direct instruction — no bespoke per-ability VFX yet), a HUD
    countdown bar (`drawLimitBreakBar()`), zero knockback
    (`Player.takeDamage()`) and pit-hazard immunity (`pitDeath` check),
    both gated on `limitBreak.active` rather than per-ability.
[~] Follow-ups not done this session (flagging, not blocking): Strength
    Lv4's exact 3-hit-combo/wall-bounce mechanic; a real input for
    non-Strength abilities' Lv4 activation in actual play (only Strength's
    full-charge trigger is wired — the other 5 have no in-game way to
    *start* their Limit Break yet, only enemy_test.html's force-toggle);
    the 3 combo inputs from the design doc (Tether Slam, Dash-Cancel
    Overhead, Gravity Spike) — none implemented yet; Graviton Surge's
    gravity flip is player-only, not room-wide (enemies don't fall
    upward themselves, only get slam-damaged when the player's own flip
    ends near them at ground contact) — revisit if it doesn't read right
    in a playtest; the pre-existing Shard Shot cooldown bug noted above.
[x] enemy_test.html: replaced the single ability-preset dropdown with a
    per-ability checkbox + Lv0-4 select (Lv4 forces that ability's Limit
    Break active for testing, bypassing the real cost/one-per-playthrough
    rule), plus Fracture Pip cap/current and Lore Pip inputs, all writing
    directly into the real `abilityState`/`statUpgrades`/`limitBreak`/
    `player` globals (no mock layer). Live-applies on any control change,
    plus an explicit "Apply Loadout" button — no respawn required to
    retune mid-test. Live Stats panel now also shows Fracture/Lore Pip
    counts and an active Limit Break countdown.
[x] Design decisions locked in from this session (see chat, not re-litigated
    here): loadout stays the full 8-button kit (Z/X/C/F/V/Q/E/R) rather
    than a reduced 3-ability swappable loadout — core kit (jump/attack/
    dash/phase dash) is only 4 buttons since movement is on the arrow keys,
    and Phase Dash is core-not-optional while Void Tether is the one
    genuinely optional ability, so trimming to 3 active loadout slots
    would have punished Void Tether choosers for no real gain (per
    `input.js`'s existing E/R bindings for Graviton Surge/Void Tether,
    already conflict-free against arrow-key movement).
[x] Rift fix applied everywhere: `floor_plan.md`/`floor_plan_mermaid.txt`
    node label now shows `(1 lore pip)` on The Rift, matching a new real
    `loreFragments` entry (`lore_tr2`) added to `area.js`'s `the_rift` room.
    Total lore pips 17 -> 18, confirmed via `analyze_floor_plan.js`;
    regenerated `floor_plan_report.html`/`floor_plan_simulation.html`.
[x] Memory Resonance (one-time full lore-pip reallocation) placed at The
    Vault's exit-side anchor (`area.js`, `memoryResonance: true` flag on
    that anchor entry) — chosen because every playthrough already passes
    through it late (just before The Rift), and it sits outside every
    choice-locked branch. UI/interaction for the actual respec flow is not
    built yet, just the placement decision + a marker for a future session
    to hang the UI off of.
Not yet verified in-browser (see `CLAUDE.md`'s hard rule) — needs a human
playtest, especially Stillpoint's activation-model change (a real feel
change, not just numbers) and the two brand-new abilities.

PHASE 17 — Phase 16 follow-up fixes from user playtesting feedback (2026-07-16)
─────────────────────────────────────────────────────────────────────────────
[x] Graviton Surge now flips gravity for every living enemy within
    `GRAVITON_SURGE_RANGE` (350px) of the player, not just the player
    (user report: "should apply to all enemies in range"). The engine has
    no real ceiling-collision physics for enemies (only ever checks
    landing on a floor from above — confirmed by reading every enemy
    subclass's platform-collision block), so flipped enemies float upward
    and are clamped at a synthetic ceiling line (`GRAVITON_CEILING_Y`,
    game.js) — the closest real approximation to "slams into the ceiling"
    without a full physics rewrite across every enemy subclass. Lv0 = stun
    only, Lv1+ = stun + 1 dmg, as before.
[x] Normal vs. charged attack now genuinely differ in both hitbox and
    animation (Enemy_Design.pdf's original "To Fix" note, plus user
    feedback wanting Hollow-Knight-style clarity): normal attack is a
    tight forward poke at chest height (small hitbox, quick 2-line jab
    animation, no arc); charged/heavy attack gets a new taller hitbox
    (`ATK_HEAVY_FWD_W/H`, player.js) starting above the head and keeps the
    existing big overhead-sweep arc animation. Up/down-directional attacks
    unaffected (already had their own distinct hitboxes/animations).
[x] Confirmed (no code change needed): Strength's Lv4 really can't be
    reached in real play right now, by design — `grantLimitBreak()` isn't
    called from any room since the endgame region that's supposed to grant
    it isn't built. Matches what was implemented in Phase 16.
[~] Phase Dash Lv4 (Limit Break) implemented — was a real gap flagged in
    Phase 16 (only Lv0-3 existed). The echo becomes a Stand (`standEcho`,
    game.js) that follows the player every frame instead of staying
    planted, and mirrors every melee swing at 100% damage (vs. the normal
    Lv3 echo's one-shot 50% before fading) for the Enhanced State's
    duration. Still not done: an in-game way to *activate* this Limit
    Break (same gap as the other 4 non-Strength abilities, noted in
    Phase 16) — only enemy_test.html's force-toggle can trigger it today.
[x] Shard Shot Lv3/Lv4 Beam reworked into a true continuous channel
    ("a beam as in continuous energy, like a kamehameha" — user
    clarification; the Phase 16 version fired one strong piercing
    projectile on release, which wasn't what was meant). Holding shardShot
    past 1s with a Fracture Pip in reserve now opens a channel instead of
    charging a release-shot: a straight line (no gravity/arc, angle
    live-adjustable with aimUp/aimDown while channeling) ticks damage
    every 6 frames to everything it touches, draining 1 Fracture Pip/sec,
    until released or pips run out. Lv3 = 2 dps, Limit Break = 3 dps.
    Removed the now-unused single-shot beam plumbing (`useShardBeam()`,
    the projectile `pierce`/`pierceInfinite`/`hitEnemies` dedup machinery)
    rather than leave it as dead code alongside the new channel.
[x] Beam now draws as a solid straight line while charging/channeling
    (was the same dotted-parabola aim guide as the normal shot, which the
    user found hard to aim with for something that doesn't actually arc).
[ ] Not done this pass (still open, unchanged from Phase 16's list):
    non-Strength Lv4 activation inputs (Phase Dash's is now the 2nd of 6
    built), the Tether Slam / Dash-Cancel Overhead / Gravity Spike combo
    inputs, the pre-existing unset Shard Shot cooldown bug.
Not yet verified in-browser (see `CLAUDE.md`'s hard rule) — the gravity
flip, the new attack hitbox split, the Stand echo, and the beam rework are
all real behavior changes that need a human playtest, not just a numbers
check.

PHASE 18 — Second playtesting feedback round + repo reorg (2026-07-16)
─────────────────────────────────────────────────────────────────────────────
A large batch of fixes from actually playing the Phase 16/17 build:

[x] Normal attack range widened (`ATK_FWD_W` 40->58px, poke animation reach
    26->40px to match) — user feedback: too short to reliably land.
[x] Tap-vs-charge leniency: `CHARGE_TAP` 5f->16f (was firing a barely-
    charged, wrong-looking "heavy" swing on any tap slightly slower than
    83ms) and `STILLPOINT_HOLD_THRESHOLD` 12f->20f (same issue, tap vs
    hold). "I can hardly get the normal attack" — root cause was the tap
    window being too narrow, not a targeting/hitbox bug.
[x] Variable jump height (short hop): releasing Jump early now cuts the
    current ascent by 55% once per jump (`player.jumping`/`jumpCut`,
    direction-agnostic so it also works during Graviton Surge's flipped
    gravity).
[x] Enemies "stunned" from non-parry sources (Void Tether's electrified
    stun, Graviton Surge's ceiling slam) were silently immune to their own
    knockback — root cause: they reused `enemy.stunTimer`, which is
    specifically the PARRY-freeze mechanic (zeroes vx and skips all
    physics/position updates for the frame, see enemy.js's per-type
    `update()`). Switched both to `enemy.hitStun` instead, which permits
    normal knockback physics — the correct field for "briefly can't act but
    still flies from a hit."
[x] Dash and Phase Dash merged onto one button (`dash`/KeyC) — "too many
    buttons." Phase Dash now fires automatically whenever it's unlocked and
    off its own cooldown; the same button falls back to a normal Dash
    (its own short cooldown/chain, unaffected) while Phase Dash is
    cooling down. Retired the separate `phaseDash` input action/binding
    entirely (input.js, game.js's REMAPPABLE_ACTIONS) rather than leave a
    dead remap entry. 8-directional aiming (Lv1+) already applied to both
    dash types via the shared `getDashDirection()`, so merging the trigger
    needed no extra work there.
[x] Phase Dash Lv3/4 echo swing is now visually shown even when it doesn't
    hit anything (`Echo.swingFlash`, ability.js) — was previously invisible
    unless it actually connected with an enemy.
[x] Shard Shot: removed gravity from `Projectile` entirely (only Shard Shot
    ever instantiates that class) — "too hard to aim... without holding it
    to readjust." Shots now fly perfectly straight along the aimed angle.
    2-shard spread (Lv2) changed from a velocity offset (would have
    diverged forever with no gravity to settle it) to a spawn-position
    offset. Aim-preview line updated to match (straight, not a parabola).
[x] Clarified with the user: the Lv3/4 "Beam" should be continuous energy
    ("like a kamehameha"), not the single strong piercing shot built in
    Phase 16/17. Reworked into a real continuous channel: holding past 1s
    with a pip in reserve opens a straight-line beam (angle live-
    adjustable) that ticks damage every 6 frames and drains 1 pip/sec until
    released or pips run out. Removed the now-dead single-shot-beam
    plumbing (`useShardBeam()`, the projectile `pierce`/`hitEnemies` dedup
    machinery) rather than leave it alongside the replacement.
[x] Shard Shot Lv4 Limit Break ("melee swings replaced with Shard Blasts")
    was simply never implemented in Phase 16/17 despite being documented as
    done — now actually implemented: the attack button is intercepted entirely
    while this Enhanced State is active and fires a 150%-damage blast
    instead of a melee swing.
[x] Stillpoint Lv4 was reportedly freezing the whole game (player included)
    instead of "the smallest number that still runs." Root cause not
    fully confirmed without a live repro (this may partly have been an
    unrelated runtime error — flag it if it persists), but hardened two
    ways regardless: `gameTimeScale` is now hard-floored at 0.05 (game.js)
    so it can never literally reach 0 no matter what sets it, and Lv4's own
    slow value is 0.95 (not a plan to ever hit 1.0). Confirmed pip costs
    were already correct as originally built (1 tap / 3 hold at every
    level) — no change needed there.
[x] Graviton Surge ceiling collision was completely fake — a fixed
    `y <= 40` clamp with no awareness of real platform geometry, so
    entities clipped straight through any actual ceiling platform, and the
    PLAYER had no clamp at all (flew off-screen in an open-topped room).
    Replaced with `resolveCeilingY()` (game.js): finds the real underside of
    whichever platform an entity has reached, or a synthetic room-top bound
    otherwise — applied to both enemies (existing bounce/slam logic) and,
    newly, the player (lands and sets `grounded`, so jump — already
    direction-flipped for this state — works from the ceiling too).
[x] Gravity Ball (Lv2+) visual was completely missing — the pull/damage
    logic in game.js was real, just never drawn. Added a pulsing radial
    gradient + core dot at the ball's position (Player.draw()).
[x] Void Tether's "or pulls you to walls" half (when no enemy is in range)
    was never built — likely why it looked entirely non-functional in
    testing (whiffing with no enemy nearby did nothing at all). Added: when
    no enemy target is found, grapples the player to the nearest solid
    platform edge in their facing direction instead.
[x] Added a real wall-bounce system — enemies previously had NO horizontal
    wall collision at all (confirmed by grep: zero hits across every
    subclass), so a knocked-back enemy just clipped straight through any
    wall. New post-update correction (game.js, same pattern as the
    Graviton Surge fixes) reflects an enemy's vx hard (85% retained) off
    any `wall: true` platform it's overlapping fast enough, with
    particles/screenshake — explicitly a HARD bounce per the user's
    combo-focused ask. Added a dedicated thin `wall: true` platform near
    the default spawn in `enemy_test_arena` (area.js) to test it on.
[x] Player collision margins were fixed pixel constants (4/8/10px) sized
    for slow, gravity-only motion — a fast knockback impulse, a dash, or a
    diagonal corner approach could move the player further than that in
    one frame, tunneling clean through the check before it ever triggered
    ("easy to fall through the floor," "jump into a wall and go under,"
    "enemy hits me from above and I fall through"). Margins now scale with
    how far the player actually moved this frame
    (`Math.max(8, |vy|+2)` / `Math.max(10, |vx|+2)`, player.js) — same
    discrete-collision approach, just safe across realistic speed ranges
    instead of only normal walking/falling.
[x] enemy_editor.html gained a Speed stat (+ wired through
    enemy_test.html's override handoff). Only the base `Enemy` class's own
    movement reads it so far (`this.speed`, enemy.js) — most subclasses
    fully override `update()` with their own hardcoded movement and won't
    respond to it yet; documented as a known limitation in the tool itself
    rather than silently no-op.
[x] Repo reorg (user request): moved everything except `index.html` out of
    the flat root into `game/` (the 9 runtime scripts + style.css) and
    `editor/` (every dev-tool HTML + export_graph.js). `Plans/` unchanged.
    Updated every script/fetch path accordingly, including the trickier
    ones: `debug_v1.html`/`debug_new.html`'s `srcdoc` injection (resolves
    relative paths against the tool's OWN location, not wherever the
    fetched `index.html` came from, so its rewritten content needs a second
    path rewrite pass — see the comment in `loadSandbox()`) and
    `export_graph.js`'s CLI defaults (now `__dirname`-relative so they work
    regardless of the caller's cwd). See `CLAUDE.md`'s new "File locations"
    section for the full map. Verified via `node --check` on every script
    and every tool's extracted inline `<script>` block — not live-browser-
    verified per the hard rule, but this class of change (path strings) is
    fully checkable by static inspection, unlike the gameplay changes above.
[ ] Not done this pass: non-Strength Lv4 activation inputs (still only
    Strength + Phase Dash have one), the 3 combo inputs (Tether Slam,
    Dash-Cancel Overhead, Gravity Spike), the pre-existing unset Shard Shot
    cooldown bug, per-enemy-subclass vy-based squash/stretch parity with
    the player's (deferred — would mean touching ~13 separate `draw()`
    methods for a cosmetic-only request), and normal-vs-charged-attack's
    exact 3-hit-combo/wall-bounce numeric bonuses from Strength Lv4 (the
    hitbox/animation split landed, the combo mechanics didn't).
Not yet verified in-browser (see `CLAUDE.md`'s hard rule) — this is the
largest single batch of gameplay behavior changes yet; a full playtest
pass is strongly recommended before assuming any of the above "works,"
especially Stillpoint Lv4 (unresolved root cause), Void Tether, and the
wall bounce.

────────────────────────────────────────────────────────────────────────
PHASE 19 — Systems build-out: physics, AI, cutscenes, combos, healing,
the Child, and 4 new editors (2026-07-16, same day as Phase 16)
(renumbered 2026-07-17: was a second 'PHASE 17', clashing with the
Phase 16 follow-up section above)
────────────────────────────────────────────────────────────────────────
The single largest batch of new systems yet — user green-lit "everything we
just planned" (Plans/child_companion_system_plan.md,
combat_ai_overhaul_plan.md, healing_items_plan.md, animation_editor_plan.md).
Verified via `node --check` on every script + a Node VM smoke test that
loads all 15 scripts in index.html's order and exercises each new system
(scratchpad test: enemy AI 120-frame run, Child follow, tether targeting,
motes healing, cutscene start→end→flag, TETHER SLAM combo, max-health math
— all passing). NOT browser-verified per CLAUDE.md's hard rule; manual
test steps are listed at the end of this phase.

New runtime scripts (index.html load order: audio, input, physics,
animdata, area, map, ability, cutscene, combo, healing, boss, enemy,
companion, player, game):

[x] game/physics.js — ONE shared collision resolver
    (`resolveEntityCollision`) for every non-player entity: velocity-scaled
    margins, prevBottom landing guard (kills "enemy walks into a tall wall
    and snaps to its top"), real ceiling collision for enemies, wall
    stop/bounce (the game.js wall-bounce pass moved here — game.js now just
    plays the impact VFX off `enemy.wallBouncedThisFrame`). Also
    `nudgeOutOfPlatforms()` spawn safety: enemy spawns, door destinations
    (switchArea), Stutterer teleports, and Child spawns all push out of
    overlapping geometry (console-warns on authored-position errors).
    Migrated every enemy physics tail (base Enemy both blocks, Stutterer,
    VoidLancer, EchoStalker, FracturedSlime, BlitzGuard, ColossusCore,
    ComposedEnemy) onto it — ~11 duplicated inline loops removed. Node
    test harness passes 9/9 collision cases.
[x] Enemy AI overhaul (enemy.js, all in the BASE class so every subclass
    inherits): notice delay (ENEMY_NOTICE_FRAMES alert beat with an
    eye-warm + "?" tell before `aware` flips — enemies react, not know),
    decision commit (ENEMY_DECISION_FRAMES — chase/patrol/facing only
    re-evaluate at decision points via updateMovementIntent(), which
    VoidLancer now also reuses instead of its pasted copy; ledge safety
    still checked every frame), facing-cone initial detection (front
    half-plane + ENEMY_HEARING_RADIUS omni close range; omnidirectional
    once aware — nobody forgets an attacker).
[x] Enemy defense verbs (enemy.js `this.defense` config, opt-in per enemy;
    ComposedEnemy defs pass `defense` straight through for
    enemy_designer.html JSON): block (guard arc tell; broken by heavies,
    bypassed from behind, ripped open by Void Tether pulls — incl. the
    Child's assist tether), dodge (telegraphed back-hop + i-frames +
    landing recovery, never off a ledge), breakout (anti-juggle: 4 hits in
    120f → 15f white charge flash → radial shove, minimal damage, ~10s
    cooldown — caps infinite juggles, baitable), dash-punish (2 Phase-Dash
    passes in 4s → instant turn + fast swipe), mix-ups (±25% windup
    variance on every enemy; feints — cancel at 60%, faster real swing;
    parry-respect: recently-parried enemies feint 20% more), per-attack
    player knockback overrides on the base class
    (attackDamage/attackKnockback). Assigned: VoidLancer = dodge +
    dashPunish + 15% feint; NullSentinel = block + breakout.
[x] Void Tether actually obtainable + usable: root cause of "button does
    nothing" was that NOTHING ever granted `hasVoidTether` — the pickup
    grant chain was a hand-grown if/else that silently ignored unlisted
    abilities (graviton_surge's placed pickup in graviton_core_room2 was
    equally dead, and so were all 3 max_health_upgrade_* pickups!).
    Replaced with a data-driven ABILITY_GRANTS table covering all 6
    abilities; placed an INTERIM void_tether pickup in Mirror Corridor
    (already child-choice-gated in the floor plan; move the grant into the
    real Child-choice scene when it exists). Also: whiff refund (a cast
    with no target/wall now refunds the 90f cooldown down to 20f + fizzle
    VFX instead of silently eating it), facing auto-aim (never pulls from
    behind; distance + vertical-offset scoring), and a pulsing target
    telegraph ring on whichever enemy WOULD be pulled (shared
    findVoidTetherTarget() so the ring and the pull can never disagree).
[x] game/cutscene.js — data-driven cutscene system: CUTSCENES{} step
    scripts (wait/text/cameraPan/cameraReturn/movePlayer/setFlag/call),
    gameState 'cutscene' (input locked, world rendered, letterbox + text
    overlay, HUD suppressed), hold-attack-to-skip (setFlag/call steps STILL
    execute on skip — skipping can never eat a story flag), `storyFlags{}`
    persisted in saves. Sample scene `echo_bridge_intro` plays on first
    entry to Echo Bridge part 1 — it's the wiring template for the real
    Child scenes.
[x] game/animdata.js + editor/anim_editor.html — the full animation/hitbox
    system from Plans/animation_editor_plan.md, BOTH parts: ANIM_DEFS
    frame timelines (duration, procedural pose OR uploaded drawing as a
    data-URL image, hurtbox, damage hitboxes, cancelableFrom combo
    windows), Animator playback class (world-space hitbox/hurtbox
    resolution with facing mirroring), POSE_RENDERERS procedural poses,
    localStorage override channel. The editor: frame-strip timeline,
    per-frame duration, drag/resize hitboxes+hurtbox on canvas, image
    upload per frame, onion skin, play/scrub, JSON export + save-to-game.
    NOTE: the game still draws/hits the original procedural way — starter
    defs mirror the live player attack numbers; migrating entities onto
    Animator is deliberate follow-up work, per the plan doc.
[x] game/combo.js + editor/combo_editor.html — combo chains as data:
    COMBO_DEFS sequences (action + per-step frame window) matched against
    action events detected from player state flags (rising-edge detectors
    in _detectActions() — no player.js input changes needed; new abilities
    = one line there). Rewards: damage_buff (wired into
    playerMeleeDamage()), cooldown_refresh, fracture, heal. Built-ins:
    TETHER SLAM (tether → down-slam), PHASE RUSH (dash→dash→attack),
    GRAVITY SPIKE (graviton→jump→down-slam) — the 3 combo inputs Phase 16
    left undone now exist in data form. The editor builds/edits chains
    visually with the documented action vocabulary, localStorage overrides
    + JSON export.
[x] HUD_LAYOUT (game.js) + editor/hud_editor.html — every drawHUD element's
    position/anchor/size/visibility extracted into one table
    (anchor-relative so layouts survive canvas resizes), applied by
    hudResolve(); the editor drags mock elements on a fake game frame,
    toggles visibility, saves overrides to localStorage / exports JSON.
    (DEFAULTS copy in the editor mirrors game.js — keep in sync by hand.)
[x] levelEditor.html walls/ceilings clarity: the old "Wall" tool (which
    actually made destructible crystal barriers) is now labeled "Crystal
    Barrier"; NEW dedicated "Solid Wall" (Shift+W) and "Ceiling" (C) tools
    set plat.wall / plat.ceiling directly; legend now shows all four
    platform kinds; checkbox help text updated to the physics.js-era
    semantics (walls bounce knocked-back enemies, ceilings block enemies
    too). Export already preserved the flags (generic serializer).
[x] game/companion.js + editor/companion_test.html — the Child, per
    child_companion_system_plan.md: real locomotion (runs at 3.4 vs the
    player's 4, gap-probe jumps, jump-up-to-player, mirror-jumps), catch-up
    failsafe that only blink-teleports OFF-SCREEN (or when fallen out of
    the world) — never on camera; modes follow/hiding/fighting/scripted
    (combat auto-switches: hides while any enemy is `aware`, walks back
    after — touch-heal 1 HP on ~70s cooldown with an in-world heal-ready
    pulse ring, no HUD chrome); Phase 2 (`companionState.canFight`) tether
    assist every ~9s: drags the enemy in front of the player 70px toward
    them + hitStun + guard-break (the keep-her branch's mirror of Void
    Tether, per the plan's symmetry note — she sets up YOUR combos, never
    out-damages you); call button (F, remappable 'callChild'); save data
    (companion {active, canFight}). Arena tool boots the real game into
    the test arena with her active: mode override, canFight toggle, wave/
    lancer spawners, player-teleport fuzzer, damage button, live tuning
    sliders (logged constants for hand-transfer), live stats.
[x] game/healing.js — healing economy per healing_items_plan.md (no
    potions, no consumable inventory): vitality motes (enemies drop
    2 + width/30 motes on death, +1 on a heavy kill; drift-collect within
    120px, expire 4s, 4 motes = +1 HP), max-health shards (the 3 existing
    max_health_upgrade_* pickups now actually work — +1 max HP each via
    maxHealthBonus/playerMaxHealth(), which every heal cap/full-heal/HUD
    hearts site now reads instead of the MAX_HEALTH const; persisted with
    per-id collected flags), strike-open healing crystals
    (area.healingCrystals — attack to full-heal, regrows on anchor rest or
    death; per-swing dedup via hitTargetsThisSwing per CLAUDE.md's rule;
    first placements: crag_altar + the test arena).
[x] REGRESSION FOUND & FIXED: the `enemy_test_arena` AREAS entry existed in
    the committed root area.js but was silently missing from the working
    tree's game/area.js after the folder reorg — enemy_test.html,
    enemy_designer.html (and the new companion_test.html) were all booting
    into an undefined room. Restored, with two extra platforms for the
    Child's jump/gap tests. Also updated enemy_test/enemy_designer script
    lists for the new runtime files (they'd have crashed on game.js's new
    calls otherwise).
[ ] Not done this pass / follow-ups: migrate player/enemy rendering onto
    Animator (animdata.js is live but the game still draws procedurally);
    per-frame ANIM_DEFS hitboxes driving real combat (same); block/dodge/
    breakout knobs exposed as enemy_editor.html sliders (available via
    enemy_designer JSON `defense` blocks today); the real Child-choice
    cutscene + moving the void_tether/companion grants into it; Child
    Phase-2 unlock beat ("teach her to fight" scene); mote drops from
    bosses/minibosses at phase transitions; healingCrystals UI in
    levelEditor (author by hand in area.js for now).

MANUAL TEST CHECKLIST (browser, human — the no-browser rule stands):
1. index.html console: no errors on boot; `[physics]`/`[compass graph]`
   warnings are informational.
2. Enemies: walk at a patrolling Fractured from behind — it should NOT
   react until you're very close (hearing) or in front; watch the eye warm
   + "?" before it engages; in a fight, watch for windup-timing variance.
   Knock an enemy into a wall — hard bounce + particles; enemies should
   stop at walls/ceilings, never perch on wall tops.
3. Void Tether: pickup is in Timeline X Roads Rm 2, on the "give up the
   Child" branch (moved out of Mirror Corridor 2026-07-17 — the board is the
   source of truth); R pulls the RING-marked
   enemy (always in front); R with nothing in front = quick fizzle, ~20f
   cooldown; near a wall with no enemy = grapple to the wall.
4. NullSentinel (enemy_test.html): frontal light hits clank off its guard;
   charged attack breaks it (× marker); juggle it 4 fast hits → white
   flash → get shoved. VoidLancer: back-hops your swings; phase-dash
   through it twice fast → instant punish swipe.
5. Cutscene: fresh run → first entry to Echo Bridge part 1 → letterbox,
   two text lines, camera pan; hold Z to skip; re-enter — should NOT
   replay (storyFlags persists through save/load).
6. Combos: dash→dash→attack quickly → "COMBO: PHASE RUSH" popup + damage
   buff; tether an enemy then down-slam it as it arrives → TETHER SLAM.
7. Healing: kill enemies → green motes drift in; 4 motes = +1 HP; strike
   the crystal left of crag_altar's anchor → full heal, husk until you
   rest at an anchor; the max-health pickups in echo_bridge_part1 /
   event_horizon_pull-area / the_rift now grant a 7th/8th/9th heart.
8. Child: editor/companion_test.html → Start Arena → run/jump around (she
   follows, jumps gaps, mirror-jumps); spawn a wave (she hides, cowering);
   clear it (she returns; touch her → +1 HP if hurt); toggle "can fight" +
   spawn (pink tether assists); use the fuzzer (she should only ever
   teleport while off-screen); F calls her.
9. Editors: anim_editor (make an animation, drag hitboxes, upload a PNG
   frame, Save → reload → still there), combo_editor (edit PHASE RUSH's
   window to 10f, Save, verify it's now hard to trigger; Clear overrides),
   hud_editor (drag hearts to top-center, Save, boot game → moved; Reset),
   levelEditor (draw Solid Wall + Ceiling pieces, check the legend/export).

═══════════════════════════════════════════════════════════════════════════
PHASE 20 — SVG-driven level scaffold (2026-07-17)
═══════════════════════════════════════════════════════════════════════════

[x] Rebuilt every room in `area.js` from the Whimsical board (`svg.txt`) +
    `floor_plan.md`, as a re-runnable generator: `Plans/rebuild_levels_from_svg.js`.
    - **Sizes** are board-proportional via a "ruler" (median SVG box → ~1300px;
      `K≈2.305` px per SVG unit). True 2D: both `width` and `roomHeight` scale.
      Void Expanse Rm 1 is now the giant it should be (5753×3043); tall board
      boxes became tall shafts (the_fracture_part1 1000×2821; chrono_rift_loop2
      is a vertical shaft); the Vault is very wide (8740). Teleport-gate stubs
      kept small (600w).
    - **Topology repaired.** The old graph was 544 validator errors / 222 warns
      (col/row had drifted out of sync with door directions; 54 missing reverse
      doors). Regenerated `col`/`row` via BFS spanning-tree over the authored
      directions, synthesized the 20 missing reverse doors, and marked 53
      long/non-grid-adjacent links as `shortcut` (the "fast tunnels" the board's
      long connector lines imply). Result: **0 errors, 0 warnings** from both
      `validateAreaGraph()` and `validateAllRoomLayouts()` (verified headless,
      no browser).
    - **Directions** come from the board geometry where unambiguous; the board
      is topological (couldn't draw advanced shapes), so it's authoritative for
      *which rooms connect* and *rough layout*, and directions were kept sane
      per-room. Every door is a **floor-level walk-in doorway** for now (always
      reachable → shells stay valid before any platforming exists); vertical
      (N/S) and secondary doors carry `edgeExempt` so the compass validator
      still passes. Arrival points (`toX/toY`) land you just above the target
      room's floor at the matching return doorway.
    - **Placeables** are doc-driven from `floor_plan.md` node annotations:
      **6 cosmetic upgrades**, **18 lore pips**, **4 fracture pips**, and the
      **6 ability grants** — counts taken straight off the board (annotation
      lines like "(1 Lore Pip)"; "(locked by 4 Fracture Pips and 10 Lore Pips)"
      is a GATE on that room, not a placement, and is skipped).
      - Lore pips are `loreFragments[]` entries — that array IS the live lore-pip
        system (`game.js` collects each one into `collectedLore` and banks it
        toward the Inventory stat upgrades via `lorePipsBanked()`; `LORE_ENABLED`
        only gates the *old text-popup* path, not collection). New ones carry
        `text: 'TODO: lore pip text'` to fill in. A first pass wrongly invented a
        separate `lorePipRewards[]` array — removed.
      - Ability grants: exactly **6 abilities** exist on the board — charged
        attack (Crag Altar), Phase Dash (Mirror Veil Sanctum), Shard Shot
        (Crystal Cavern), Stillpoint (Chrono Rift Sanctum), Graviton Surge
        (Graviton Core Rm 2), **Void Tether (Timeline X Roads Rm 2, on the
        "give up the Child" branch — NOT Mirror Corridor; corrected 2026-07-17)**.
        The board owns each grant, so an ability can only ever live in one room.
        The other 4 pickups in `area.js` (3 max-health upgrades + Level 4 Limit
        Break) are upgrades, not abilities, and are left where they were.
      - Cosmetic upgrades are still inert placeholders (no runtime code reads
        them) — same status as the note at the top of `area.js`.
    - **"Stillpoints" = rest/checkpoint anchors:** every room gets one near its
      entrance; wide rooms (>2600 / >5200) get a 2nd/3rd; minibosses keep an
      entrance anchor. 89 anchors total.
    - **Enemies left empty** (`enemies: []`) on purpose — encounter design is by
      hand. Platforms are just a full-width floor per room — the tall rooms are
      empty canvases above that floor, ready to build up into.
    - `enemy_test_arena` (dev room, no col/row) left untouched.
    - The minimap is unaffected: `map.js` draws from `MAP_LAYOUT_SVG` (board
      positions, already covers all rooms), not `col`/`row`, so the BFS grid's
      cell collisions are validation-only and invisible in game.

⚠️ **RE-RUNNING THE GENERATOR OVERWRITES `area.js`.** It is a one-time
scaffold. Once you start hand-designing rooms (platforms, enemies, moving
doors up into real vertical shafts, tuning arrival points), do NOT re-run
`rebuild_levels_from_svg.js` — it will blow away that work. Re-run it only if
you re-export the board and want to regenerate the scaffold from scratch. It
writes an `area.js.bak` first and the previous version is always in git.

Known items left for the human pass (not bugs — design surface):
  - Doors start at floor level; drag N/S doors up to the ceiling and build the
    platforming climb when you make a room a true vertical shaft.
  - `cosmeticUpgrades[]` exists as data but has no runtime collection/effect
    code yet (lore + fracture pips DO both work).
  - `floor_plan.md` specifies entry gates that aren't wired as door `requires`
    (e.g. Mirror Corridor's `child_choice_resolved`, and Void Tether being
    granted only if the Child was given up). These were deliberately NOT added
    as `requires:` strings — `isRequirementMet()` returns false for unknown
    requirement names, so adding one before the flag is implemented would
    silently soft-lock the door. Wire the flag in code first, then the gate.


═══════════════════════════════════════════════════════════════════════════
WHAT'S ACTUALLY NEXT  (audited against code 2026-07-17 — SINGLE SOURCE)
═══════════════════════════════════════════════════════════════════════════

This replaces the two older "NEXT SESSION SHOULD" blocks above, which are now
marked HISTORICAL. Every claim below was verified against the code, not
carried over from an older entry.

── BALANCE (NOT code bugs — corrected 2026-07-17) ─────────────────────────
Both were previously listed here as "blocking bugs". That was wrong:
[x] BUG-013 — the CODE bug is FIXED (2026-07-12): the `!this.stillpointActive`
    guards were removed from all four attack/charge/parry gates. Verified
    2026-07-17 — nothing in player.js/game.js gates attacking on
    `stillpointActive` today (the one remaining guard is in `gainFracture()`,
    which is intentional anti-chaining).
[ ] What's actually left is a BALANCE question needing a human playtest:
    Stillpoint now stacks free attacking + 1.5x damage + lifesteal + slow-time
    with only the Fracture drain as a cost. Levers if it's too strong: lower
    the 1.5x, cap lifesteal to once per swing, or shorten duration per pip.
[ ] BAL-001 — Phase Dash strength: likewise a tuning judgement, not a defect.
    Neither blocks level design. Tune whenever; rooms aren't tuned so tightly
    that a later pass invalidates them.

── LEVEL DESIGN IS UNBLOCKED, WITH THESE GAPS ─────────────────────────────
[ ] NO ENEMIES ARE PLACED ANYWHERE. All 72 rooms have `enemies: []`. This was
    already true in committed HEAD before the Phase 20 scaffold — the Phase 20
    rebuild did not remove any. (CLAUDE.md's claim that 5 enemies are "placed
    in AREAS" is FALSE; corrected 2026-07-17.) Still true 2026-07-21: 18
    enemy types are now built and spawnable (10 as of this note, +8 more
    2026-07-21 — see expansion.md Phase 2's status update) — placing them
    is the level-design work, still entirely undone.
[ ] Doors are all floor-level walk-in doorways. Rooms with big `roomHeight`
    are empty canvases above a single floor — drag N/S doors up and build the
    platforming climb to turn one into a real vertical shaft.
[ ] The Child-choice WARNING does not exist. `CLAUDE.md`'s "irreversible,
    consent-gated choices" throughline requires an explicit "are you sure"
    before a permanent commitment. Void Tether's grant (Timeline X Roads Rm 2,
    "give up the Child" branch) is permanent with NO confirmation today. The
    real Child-choice cutscene is the open item that would carry it.
[ ] `cosmeticUpgrades[]` — 6 placed as data, no runtime collection/effect code.
    (Lore pips and fracture pips DO both work.)
[ ] Entry gates named on the board (e.g. Mirror Corridor's
    `child_choice_resolved`) are NOT wired as door `requires:`. Don't add them
    until the flag exists in code — `isRequirementMet()` returns false for
    unknown requirement strings, which would silently soft-lock the door.

── VERIFIED NOT BUILT (safe to treat as real TODOs) ───────────────────────
[ ] 2.6 Enemy health bars        — no healthBar code anywhere.
[ ] 2.7 Enemy windup audio "ping" — no cue code.
[ ] 2.5 Group coordination / adaptive aggression.
[ ] 2.8 Enemy architecture rework (composable behaviors) — the motivating
    case for 2.1 and for the remaining ~19 planned enemies.
[ ] 4.5 Fast travel — no fastTravel code, though the board marks fast-travel
    rooms and Sovereign's Observatory "unlocks fast travel".
[ ] 5.1b Gamepad support — no Gamepad API usage anywhere.
[ ] 5.2 Advanced reactive audio (+ 5.2a SFX sandbox, to build first).
[ ] The remaining 10 of 13 regions, the 8 minibosses, and ~19 of the enemy
    roster in expansion.md.

── HUMAN-EYES-ONLY (cannot be closed headlessly; the no-browser rule) ─────
[x] CONFIRMED IN BROWSER 2026-07-17 by the user. Console reads:
      [compass graph] validated OK — 72 rooms
      [room linter] all 71 rooms passed layout checks
    (was 544 errors / 222 warnings before Phase 20). 72 vs 71 is correct:
    the compass graph counts every room, the layout linter skips
    enemy_test_arena, which has no col/row. The live runtime agrees with the
    headless Node validation, so the Phase 20 scaffold is verified for real.
[ ] Playtest the 5 Phase 10 enemies + BlitzGuard for feel.
[ ] Confirm the Task 4 region decoration actually looks good.
[ ] Confirm debug_v1.html R10/R11 pass in a real browser.

── DOC HYGIENE NOTE ───────────────────────────────────────────────────────
Phase numbering had two "PHASE 17" and two "PHASE 18" sections; the later two
were renumbered to 19 and 20 on 2026-07-17. Phase 2's checkboxes were stale
because the enemy work that actually happened was logged under Phases 10/16/19
and never fed back — BlitzGuard is built but appears in no Phase 2 item.
When finishing work, update the phase section AND this list.

═══════════════════════════════════════════════════════════════════════════
Phase 21 — Runtime platform behaviours: hazard/oneWay/moving/crumble (2026-07-17)
═══════════════════════════════════════════════════════════════════════════

[x] Four new platform flags, authored per-platform in area.js, wired through
    the shared collision path (physics.js), the player loop (player.js), and
    new systems in game.js. Verified with a headless physics harness (no
    browser); room linter stays 0 errors / 0 warnings.
    - `hazard: true, damage: 1` — trigger volume, NEVER solid (can sit on top
      of a real floor); damages on overlap, throttled by the player's own
      i-frames. Drawn as red spikes. Excluded from the linter's standable set.
    - `oneWay: true` — land on top from above; jump up through from below;
      down+jump while standing on it drops through (12-frame armed timer,
      player.dropThroughTimer). Drawn with a dashed top edge. Counts as
      standable in the linter.
    - `moving: { toX, toY, speed }` — oscillates between the authored (x,y)
      anchor and (toX,toY); carries whatever has standingPlat === it by the
      same per-frame delta. Runtime state is derived from _baseX/_baseY and
      reset on room entry, so re-entering never accumulates drift. Measured at
      its anchor by the linter (can't simulate motion). Bluish tint.
    - `crumble: true, crumbleDelay: 30, respawn: 120` — falls away
      crumbleDelay frames after being stood on; returns after respawn frames
      (0 = never). Counts as standable (a timing route, not absent floor).
    - New player fields: `standingPlat` (set by both collision paths) and
      `dropThroughTimer`. New game.js fns: updatePlatformSystems(),
      applyHazardDamage(), resetPlatformRuntime() (called on switchArea, both
      the leaving and entering room).
[ ] Not done: enemies don't yet respect moving-platform carry or drop-through
    (they use resolveEntityCollision, which now sets standingPlat and skips
    hazards/oneWay-sides correctly, but nothing carries a standing enemy).
    Fine for now — no enemies are placed yet.
[ ] Not verified in a browser (the no-browser rule) — headless physics sim
    only. Confirm feel (drop-through responsiveness, moving-platform carry
    smoothness, hazard i-frame cadence) in real play.

═══════════════════════════════════════════════════════════════════════════
Phase 22 — levelEditor: placeable + platform-type UI (2026-07-17)
═══════════════════════════════════════════════════════════════════════════

[x] editor/levelEditor.html now has full place/drag/select/delete/inspect for
    the placeables that were previously invisible in the editor (present in
    data, only via the generic exporter):
    - Fracture Pip (✦, key F), Healing Crystal (✚, key H), Cosmetic Upgrade
      (✿, key K) — new tools, draw markers, hit-testing, outliner entries,
      property panels, arrayFor/delete/paste wiring.
[x] Platform inspector gained checkboxes for the Phase 21 runtime flags:
    oneWay, hazard (+damage), crumble (+delay/respawn), moving (+toX/toY/
    speed). Platforms render with per-type tint + a moving-platform path ghost
    so the behaviour is visible while authoring. Toggling a flag reveals its
    sub-fields immediately.
[x] Export unaffected — the generic jsLit serializer already round-trips every
    field; verified the extracted editor script is syntax-clean (node --check).
[ ] Not done: no drag handle for a moving platform's TARGET position yet (edit
    toX/toY numerically for now). Vertical-shaft door snapping is Phase 23.

═══════════════════════════════════════════════════════════════════════════
Phase 23 — Room design-progress tracker (2026-07-17)
═══════════════════════════════════════════════════════════════════════════

[x] Plans/room_progress.js — read-only Node CLI classifying every room as
    SHELL / started / designed from design signals (platforms beyond the one
    generated floor, enemies placed, doors moved off the floor line or up to a
    ceiling = real vertical shaft, placeables/anchors moved off default Y).
    `--full` adds region/type/size, `--todo` lists only untouched rooms.
    Currently reports 71/71 SHELL (nothing hand-designed yet) — the baseline.
    Verified it flips a room to "designed" when platforms/enemies/ceiling-doors
    are added.

── STILL OPEN from the 2026-07-17 tooling batch ──
[x] Child-choice CONFIRMATION mechanism (was going to be Phase 24) — built
    2026-07-27, see Phase 24 below. The generic `choice` cutscene step
    landed, plus the two Child-specific beats it was scoped for (meeting her,
    first-fight Protect/Train). The Void-Tether give-up-the-Child cutscene
    this note also flagged is still NOT built — that's the Leave path at
    Echo Bridge (companionState.active stays false), not a separate beat;
    the actual Void Tether miniboss/grant (story.md §4) remains unbuilt.
[ ] levelEditor moving-platform target drag handle + vertical-shaft door
    snapping (snap a door to ceiling/floor, auto-drop edgeExempt when it's on
    its true edge, warn on unreachable doors). Editor polish, lower urgency.

═══════════════════════════════════════════════════════════════════════════
Status catch-up (2026-07-21) — work done 07-18 through 07-21 that landed
in other docs' own inline status updates and was never folded back here
═══════════════════════════════════════════════════════════════════════════
Per the DOC HYGIENE NOTE above (Phase 2 folding-back miss), this is the same
failure mode again — several docs got their own dated status updates but
this changelog's tail wasn't updated to match. Recording it here now;
future work should still update the relevant Phase section AND this file.

[x] `game/attackVFX.js` (2026-07-19, broadened same day) — shared player
    VFX/hitbox math extracted out of player.js/ability.js so
    `anim_editor.html`'s "Dissect from current game" button and
    `animdata.js`'s POSE_RENDERERS can reuse the exact same shapes/hitboxes
    as the legacy fallback draw path. New file, not yet listed in CLAUDE.md's
    architecture map — add it there (loads alongside player.js/ability.js).
[x] `editor/ability_tester.html` (untracked, undated) — a dev tool loading
    the real game scripts in the same order as index.html; purpose/date not
    yet documented anywhere. Add a real entry to CLAUDE.md's dev-tooling list
    once its actual scope is confirmed.
[x] Enemy Attack Vocabulary (`Plans/enemy_attack_vocabulary_plan.md`,
    2026-07-19/07-20) — Reversal, Aggro-Pull, The Catch, Tiger Knee,
    Afterimage Strike, and Mote Eater all built in `enemy.js`/`ability.js`.
    Reversal still needs the Sword-Clash interrupt-and-punish resolution
    (attack-hitbox-vs-telegraph-window check on the player side) — see that
    doc's own tail for the exact remaining scope.
[x] Animation editor bridge (`Plans/animation_editor_plan.md`, 2026-07-20) —
    `ComposedEnemy` (enemy.js) and `Boss` (boss.js) both bridged onto
    `animdata.js`'s `Animator`/`ANIM_DEFS`, same additive/fallback pattern as
    the player bridge; raster per-frame image uploads (`frame.image`) are
    fully working in `anim_editor.html`. That doc's "not built" framing is
    now wrong — see the doc itself for corrected status.
[x] 8 more enemies (`Plans/expansion.md` §Phase 2, 2026-07-21) — built as
    `ComposedEnemy` defs; see that doc's own 2026-07-21 status update for
    which ones and what's still missing (placement in `AREAS`, playtesting).
[x] Lore/story war-bunker reframe (`lore.md`, `story.md`, 2026-07-21) — the
    setting was reframed as a far-future war-bunker (sci-fi "magic is
    misunderstood tech" framing) rather than the earlier fantasy framing.
    Both docs' own revision-history entries have the full detail; nothing in
    `area.js`'s live `loreFragments[]` strings has been touched (still
    LORE_ENABLED = false, docs-only per the existing King→Sovereign
    precedent above).
[ ] NOT yet folded back into this doc: whether `regions.md`'s "3 of 13
    regions built" framing and CLAUDE.md's matching "Current status" bullet
    still hold after the Phase 20 SVG rebuild scaffolded all ~71 rooms — see
    `regions.md`'s own 2026-07-21 correction note. Reconcile next session
    rather than trusting either doc's older wording.

═══════════════════════════════════════════════════════════════════════════
Difficulty Bot v1 (2026-07-24)
═══════════════════════════════════════════════════════════════════════════
[x] `game/agentController.js` + `editor/difficulty_bot.html` — evolves a
    small fixed-topology feedforward net (weight-only, not full NEAT — see
    `Plans/difficulty_bot_and_combat_polish_plan.md`'s "Scope cut" note) to
    play the real game against a customizable enemy roster / boss / miniboss.
    Reads real `ComposedEnemy.attacks[]`/`.defense` data (the same data
    `enemy_designer.html` edits) as net inputs, not just position/HP.
    Fast-forwarded by stubbing `requestAnimationFrame` before `game.js` loads
    (so its self-starting loop never fires) and calling the real `update()`
    directly in a tight loop; the best genome of each generation is replayed
    live (real `update()`+`draw()`, paced by the real rAF captured before the
    stub) so training is fast but still watchable, per user request.
[x] `game/area.js`'s `bot_arena` — new dev-only bounded room (floor +
    ceiling platform, left/right handled by the existing `getBounds()` width
    clamp already used by every room) so the bot can't discover "run to the
    edge and kite forever" as a free fitness win. No `col`/`row`, same skip
    rule as `enemy_test_arena`.
[x] Registered in `dev_hub.html`'s Combat & Enemies group; `enemy_test.html`'s
    stale "Bot Difficulty Scorer — planned" note updated to point here.
    Verified with `node --check` on every touched file (per this repo's
    standing no-browser-testing rule) — **not yet run in-browser**, so treat
    the first real run as the actual verification pass, not this note.
[ ] Not yet done: Part 2 of the same plan doc (centralized `triggerHitImpact`,
    player attack → `Animator` migration, input buffering) — still just
    scoped, not built.

═══════════════════════════════════════════════════════════════════════════
Combat AI review follow-ups (2026-07-24)
═══════════════════════════════════════════════════════════════════════════
Two confirmed bugs fixed, plus the first "Composed Enemy Expansions" data
addition and the Graviton Surge counter-play gap flagged in the same review.

[x] **Ability-cooldown save/load bug.** `phaseDashCooldown`/
    `shardShotCooldown`/`gravitonSurgeCooldown`/`voidTetherCooldown` were
    hardcoded to `0` on every load (`game.js` `loadGame()`), so quitting
    mid-cooldown and reloading gave a free reset. Now persisted in
    `saveGame()`'s `abilityState` block and restored (clamped to each
    ability's real max, so a corrupted/old-format save can't hand out a
    stuck-forever cooldown) in `loadGame()`.
[x] **Hitstop vs. Stillpoint slow-mo bug.** `hitstopTimer` decremented one
    raw frame per real frame regardless of `gameTimeScale`, so a hit landing
    during Stillpoint read as a proportionally shorter freeze than the same
    hit at normal speed. Added `setHitstop(frames)` (scales the requested
    duration by `1/gameTimeScale`, capped at `HITSTOP_SLOWMO_MAX_MULT = 2`
    so deep slow-mo can't turn a hit into a multi-second freeze) and
    replaced all 18 `hitstopTimer = ...` call sites in `game.js` with it.
[x] **Generic attack `condition` field** (`enemy_attack_vocabulary_plan.md`'s
    "Conditional Triggers" section) — any attack def can now set
    `condition: 'player_airborne' | 'player_grounded' | 'player_low_hp' |
    'near_wall' | 'has_allies'` and `ComposedEnemy._decideActiveAttack()`
    won't offer it as a candidate unless true (`_evalCondition()`,
    `enemy.js`). `near_wall` reads `this._wallNormal`, now cached each frame
    off `resolveEnemyPhysics()`'s return value (previously discarded).
    Generalizes `requiresAirborne` (kept as-is, still Tiger Knee's own gate)
    instead of adding another one-off boolean per condition.
[x] **Graviton Surge counter-play gap fixed.** `COUNTER_EFFECTS.graviton_surge`
    was a literal no-op (`null_field`) with a stale comment claiming the
    ability "doesn't exist in the game yet" — it's been fully built since
    Phase 19. Replaced with **Ground Stomp**: an enemy carrying this counter
    is skipped by the ceiling-pin/slam loop entirely and instead fires a
    ground-level shockwave once per active flip (while in
    `GRAVITON_SURGE_RANGE`), damaging/knocking the player back regardless of
    which side of the flip they're on. Cached as `enemy.groundStomp` at
    construction (same pattern as `armored`/`reflectsProjectiles`). Exposed
    in `enemy_designer.html`'s `COUNTER_UI.graviton_surge` (was also a
    `null_field` placeholder there).
[x] **Crystal Sentinel migrated to ComposedEnemy** (2026-07-24, user request:
    "add crystal sentinel to composed enemy so that all enemies are
    composed") — the directional shield-HP system that blocked this before
    (separate HP pool, front-facing melee only, ranged bypasses, auto-regen,
    break-and-snap-back) is now a generic `def.stats.shield` trait any
    composed enemy can opt into (`ComposedEnemy` constructor/`takeDamage()`/
    `update()`/`draw()` in `enemy.js`). Two more generic additions fell out
    of the same migration: `def.stats.width/height` (every prior composed
    def used the base 28x28 default) and `MOVEMENT_BEHAVIORS.hover`'s new
    `verticalTrack` param (chases the player's y, not just a fixed-baseline
    bob — off by default, Deflector Drone unaffected). Old bespoke
    `class CrystalSentinel` + its own `updateProjectiles`/`drawProjectiles`/
    `fireProjectile` removed entirely; `game.js`'s two call sites now just
    go through `ComposedEnemy.updateProjectiles`/`drawProjectiles` (Crystal
    Sentinel's shots already flow through `ranged_projectile`/pattern:
    'homing'). Only non-composed enemies left: the two real minibosses
    (ColossusCore, FracturedSlime) — separately scoped, see the "Migrated
    legacy enemy classes" header comment in `enemy.js` for why.
[ ] Not done from the same review: the base-`Enemy` jump-to-player/jump-a-gap
    traversal capability (the actual root of the "enemies aren't mobile"
    complaint — ground enemies currently have zero active verticality, only
    ledge-stop safety — still true after the Sentinel migration, since it
    flies rather than walks), role-coordination expansion (tank actively
    shields allies), and per-attack cooldown + anti-repeat-weighted
    selection. All still just discussed, not built — good candidates for
    the next pass.
[ ] Verified with `node --check` only (per this repo's no-browser-testing
    rule) — not yet playtested. Manual test plan: (1) save mid-cooldown on
    any ability, reload, confirm the ring HUD still shows time remaining
    instead of snapping to ready; (2) land a hit during an active Stillpoint
    and compare the freeze length to a normal-speed hit — should feel
    roughly the same weight, not shorter; (3) in `enemy_designer.html`, add
    `condition: 'player_low_hp'` to an attack and confirm it never fires
    above ~30% player HP; (4) build a `graviton_surge`/`ground_stomp` enemy,
    flip gravity near it, confirm it stays grounded (never pins to the
    ceiling) and the shockwave lands once per flip, not every frame.

═══════════════════════════════════════════════════════════════════════════
Mobility/evasion pass + a real defense-verb bug (2026-07-24, same day)
═══════════════════════════════════════════════════════════════════════════
[x] **Found and fixed: `ComposedEnemy.update()` never called
    `updateDefense()`.** Block/dodge/breakout/dashPunish (`this.defense`,
    the whole Phase 19 defense-verb system) have been dead code for every
    composed enemy since the 2026-07-20 migration — `ComposedEnemy`
    completely overrides `Enemy.update()` and never calls the inherited
    method, despite `enemy_designer.html` exposing UI for all four and the
    constructor still setting `this.defense = def.defense`. Now called right
    after the `dead` check, same ordering the base class used (before the
    hit-stun early return, so anti-juggle breakout can still fire mid-juggle).
    This means every "block/dodge" balance discussion from earlier sessions
    was theoretical — nothing built on `ComposedEnemy` could have actually
    exhibited it in play until this fix.
[x] **Found and fixed while wiring the above: movement AI stomps dodge
    velocity the same frame it's set.** Every `MOVEMENT_BEHAVIORS` type
    recomputes `vx` (hover recomputes `vy` too) unconditionally whenever no
    attack is active, with no check for an in-progress dodge — so a dodge's
    push would be overwritten before it could move the enemy anywhere (only
    the vertical hop survived for grounded enemies, since `ground_chase`
    never touches `vy`). Fixed the same way Aggro-Pull's rage-charge already
    overrides normal movement: `this.dodgeIFrames > 0` now fully suspends
    movement AI for the dodge's duration, in both `ComposedEnemy.update()`
    and the base `Enemy.update()`/`updateMovementIntent()` path.
[x] **Evasion in flight.** `dodge` was hard-gated on `this.grounded`
    ([enemy.js] `updateDefense()`), so every flying enemy (Crystal Sentinel,
    Deflector Drone, Anchor Wraith, Echo Stalker) could never dodge at all.
    Now branches on `this._movementFlies`: flying gets a lateral+randomized-
    vertical jink (no ledge check needed, nothing to fall off); grounded
    keeps the original back-hop. Flying dodge also needed its own position
    integration (see next item's explanation) since normal movement — where
    integration usually happens for flying enemies — is exactly what's
    suspended during the dodge.
[x] **Jumping.** `MOVEMENT_BEHAVIORS.ground_chase` gained an opt-in
    (`canJump`, off by default — every existing placement unaffected) two
    triggers: jump a ledge/gap instead of stopping dead while chasing, and
    jump toward the player when they're detected above/below the enemy's
    normal vertical band (using `sight.dx`/`dy`/`verticalOk` directly, not
    `enemy.aware` — an enemy stuck outside the band never becomes aware in
    the first place, since that's the same band gating `aware`). This is
    the actual fix for "enemies aren't mobile" flagged two sessions ago —
    ground enemies previously had zero active verticality, only ledge-stop
    safety. Exposed in `enemy_designer.html`.
[x] **Charging in flight.** `dash_charge` gained `aerial: true`: computes a
    full 2D vector toward the player at the moment of firing (not
    mid-flight homing) instead of the ground version's horizontal-only
    `facing`. Needed two supporting fixes to actually work: (1) flying
    enemies opt out of ComposedEnemy's generic physics tail entirely and
    normally self-integrate position inside their movement type's own
    `run()` — which is skipped while an attack is active, so a flying
    charger would hold velocity and never move without `onTick` now
    integrating x/y itself when `_movementFlies`; (2) that same tail is also
    where grounded enemies get wall/edge collision for free, so the flying
    path needed its own `bounds` clamp (threaded a new `bounds` param into
    `onTick`, previously not passed). Exposed in `enemy_designer.html`. No
    current built enemy has this in its `attacks[]` yet — it's a capability,
    not yet applied to a named enemy's identity (deliberately not retrofit
    onto Crystal Sentinel/Deflector Drone/Anchor Wraith, which each have
    documented, considered movesets already).
[ ] Verified with `node --check` only (no-browser-testing rule, per
    `Plans/CLAUDE.md`) — not yet playtested, and this batch is riskier than
    most (it touches the movement/attack dispatch every composed enemy runs
    through every frame). Manual test plan: (1) in `enemy_test.html`, spawn
    any enemy with `defense.dodge` enabled, attack it, confirm it now
    actually dodges (previously it silently never would); (2) build a
    `canJump` ground enemy near a low ledge/platform gap and confirm it
    jumps instead of stopping; (3) place a `canJump` enemy below a platform
    the player stands on and confirm it jumps up toward the player instead
    of idling; (4) in `enemy_designer.html`, give a `hover`-movement enemy a
    `dash_charge` attack with `aerial: true` and confirm it charges
    diagonally and stays on-screen; (5) give a hover enemy `defense.dodge`
    and confirm it jukes instead of never triggering.

═══════════════════════════════════════════════════════════════════════════
Boss buildout — Mirror King + Fractured Sovereign's Guard (2026-07-26)
═══════════════════════════════════════════════════════════════════════════
Continues `Plans/continue_boss_buildout_prompt.md`'s roadmap (itself
continuing the architecture-proving batch that fixed the miniboss spawn bug
and built the generic phase system + The Conduit). Two more of the 12
remaining fights, following the doc's "cheapest/most-proven-pattern first,
one or two at a time" guidance — both are plain `ComposedEnemy` + `phases`
defs, no new engine work, following `CONDUIT_DEF`'s proven shape.

[x] **The Mirror King** (`hollow_guardian`, `MIRROR_KING_DEF`/`MirrorKing` in
    `enemy.js`) — Mirror Veil's miniboss. Story doc (`expansion.md` Phase 4
    #4.1 / `lore.md`'s writeup): evil-by-choice section chief who duplicates
    himself, the player, and projectiles; once "the real one" is found his
    copies turn on each other. The literal clone-swarm is scoped down per
    the plan's own outline (no new clone-entity engine work this pass) —
    the mirror theme is carried by existing mechanics instead: `counter_stance`
    (turns a landed player swing back on them), a spread `ranged_projectile`
    (duplicated shard volleys), and `defense.dodge` (vanity/elusiveness).
    Phase 2 at 50% HP speeds him up, shortens cooldowns, and thickens the
    projectile spread — "no more hiding behind tricks," not literal copies.
    Deliberately NOT knockback-resistant, matching the story doc's own
    strategy note. Room (`mirror_veil_hollow`) already had
    `roomType`/`miniboss`/`bossSpawn` authored; music
    (`BOSS_MUSIC_MAP.hollow_guardian` → `boss_mirror_king.ogg`) was already
    wired and the asset file already exists on disk — zero new area.js/
    audio.js work needed.
[x] **The Fractured Sovereign's Guard** (`graviton_sentinel`,
    `GRAVITON_GUARD_DEF`/`GravitonGuard` in `enemy.js`) — Graviton Core's
    miniboss, the one direct Sovereign-thread sympathetic fight (loyalty
    with no one left to be loyal to). Story doc (`expansion.md` Phase 4
    #4.4): phase 1 is a shield bash + melee combos, parriable/blockable
    until the shield breaks; phase 2 hits much harder with huge knockback,
    moves somewhat faster, resists the player's own knockback, and starts
    throwing ceiling rubble. Reuses `FRACTURED_KNIGHT_DEF`'s
    `defense.block` + `stats.shield` template almost directly (same
    "shield wall that breaks open" archetype) — `dash_charge` is the shield
    bash, `stats.shield` is the breakable guard, phase 2 patches the
    dash_charge's knockback way up and adds an `arc` `ranged_projectile`
    standing in for the rubble drop. Room (`graviton_core_room3`) already
    had `roomType`/`miniboss`/`bossSpawn` authored; music
    (`BOSS_MUSIC_MAP.graviton_sentinel` → `boss_graviton_guard.ogg`)
    already wired, asset already on disk.
[x] Both registered in `game.js`'s `MINIBOSS_CLASSES` registry (now 4
    entries: `colossus_core`, `static_guardian`, `hollow_guardian`,
    `graviton_sentinel`) — no other game.js changes needed, the
    generalized spawn/combat/defeat block from the earlier architecture
    pass already handles any registry entry generically.
[ ] Verified with `node --check` on `game/enemy.js` and `game/game.js`
    only — no browser testing per `Plans/CLAUDE.md`'s hard rule. Manual
    test plan: enter `mirror_veil_gate`, confirm `MirrorKing` spawns,
    fires melee/spread-shard/counter_stance, dodges on your swing startup,
    and gets faster/denser at 50% HP; enter the Graviton Core boss room,
    confirm `GravitonGuard` spawns, its shield absorbs melee hits and
    breaks after enough landed swings (ranged bypasses the shield
    entirely, per `shieldFacesPoint()`'s existing rules), block triggers
    reactively on your swing startup, and phase 2's dash bash knocks back
    much harder and starts throwing gray arc projectiles; confirm both
    defeats grant +1 Max Health, persist `defeatedMinibosses` through
    save/reload, and stop/clear their music on leaving the room mid-fight.
[ ] 7 fights remained after this entry — see the next dated section below
    for 2 more (The Assembler, The Stationmaster) built the same day.

═══════════════════════════════════════════════════════════════════════════
Boss buildout — The Assembler + The Stationmaster (2026-07-26, same day)
═══════════════════════════════════════════════════════════════════════════
Third pair in the same continuing batch. Both needed a genuinely new piece
of infrastructure the first four fights didn't — added two small, generic
extensions to `ComposedEnemy`'s existing phase system (`enemy.js`) rather
than one-off bespoke code, matching the pattern the whole batch has used
since the phase system was first built for The Conduit:

[x] **`phaseDef.movement` override** (`_applyPhase()`) — shallow-merges
    onto the enemy's per-instance `this.movement` clone, same
    non-destructive pattern `statMultipliers` already uses. A `type` change
    also recomputes `_movementFlies` so gravity/the physics-tail gating
    (previously computed once at construction, `enemy.js`'s ctor) stays
    consistent with the new movement type — this is what lets a phase
    transition move an enemy from grounded to flying (or retune an existing
    flying movement's numbers) without a bespoke subclass.
[x] **`def.spawnOnStart` / `phaseDef.spawn`** (ctor + `_applyPhase()`, via
    a new shared `_spawnAdds()` method) — pushes N fresh `ComposedEnemy`
    adds (built from a caller-supplied def, not the boss's own) into the
    current room's enemy array. Same push-to-`areaEnemies` mechanism
    `ON_DEATH_EFFECTS.split` already proved, generalized to fire at
    fight-start or on a phase threshold instead of only on death.
[x] **The Assembler** (`paradox_engine`, `ASSEMBLER_DEF`/`TheAssembler`) —
    Paradox Engine's miniboss, open moral axis (the creator herself, still
    maintaining the shelter's warp fields, per `lore.md`). Story doc
    (`expansion.md` Phase 4 #4.8): phase 1 a telegraphed slam/shockwave/
    tracking-beam pattern (`dash_charge` / a 360° spread `ranged_projectile`
    / `beam`), phase 2 adds portal-assisted flanking. Her `teleport_blink`
    "portal" runs the whole fight (not just phase 2) and gets faster/
    further via the new `phaseDef.movement` override at 50% HP, rather than
    only switching on at a threshold — reads as "always warping, gets
    worse," matching "punishing anything but patient, cooldown-timed
    openings" better than a hard on/off would.
[x] **The Stationmaster** (`timeline_keeper`, `STATIONMASTER_DEF`/
    `TheStationmaster`) — Timeline Crossroads' miniboss (proposed name,
    not locked per `lore.md`'s 2026-07-22 entry, which replaced the earlier
    "Crystalline Warden"/"human but airborne" placeholder summary in
    `Plans/continue_boss_buildout_prompt.md` with a fuller spec once
    `expansion.md`'s Phase 4 table was actually read this session). Story
    doc (#4.11): phase 1 fights via brainwashed-prisoner adds (killable by
    his own attacks too — needs no special code, they're just as
    vulnerable to his `dash_charge`/`melee_swing` hitboxes as the player
    is) while trains/locomotives sweep the arena (a long-range, high-speed
    `dash_charge`, not a new moving-hazard system); phase 2 he takes to the
    air, flying and heavily (not fully) knockback-resistant. First real use
    of `def.spawnOnStart` (3 prisoners, present from fight-start per the
    doc's own phase-1 placement — see `PRISONER_ADD_DEF`) and of
    `dash_charge`'s existing-but-previously-unused `aerial: true` mode
    (flagged unused in the 2026-07-24 mobility-pass entry above — now a
    real user).
[x] Both registered in `game.js`'s `MINIBOSS_CLASSES` (now 6 entries).
    Both rooms (`paradox_engine_room2`, `timeline_x_roads_room2`) already
    had `roomType: 'miniboss'`/`miniboss`/`bossSpawn` authored; both
    `BOSS_MUSIC_MAP` entries (`boss_assembler.ogg`, `boss_timeline_crossroads.ogg`)
    were already wired and the asset files already exist on disk — zero
    `area.js`/`audio.js` changes needed, same as every fight in this batch.
[ ] Verified with `node --check` on `game/enemy.js`/`game/game.js` only —
    no browser testing per `Plans/CLAUDE.md`'s hard rule, and this pair is
    riskier than the first four (new shared engine hooks, not just new
    defs). Manual test plan: enter Paradox Engine's boss room, confirm
    `TheAssembler` spawns and teleport-blinks behind the player
    periodically the whole fight (not just after 50% HP), confirm her slam/
    shockwave-burst/tracking-beam all fire and connect, confirm the blink
    gets visibly faster/further and her cooldowns tighten at 50% HP; enter
    Timeline Crossroads' boss room, confirm `TheStationmaster` spawns with
    3 `brainwashed_prisoner` adds already present and that the Stationmaster
    can hit and kill his own prisoners with his attacks, confirm his
    locomotive-sweep dash and melee connect, confirm at 50% HP he visibly
    lifts off the ground into hover movement and his dash_charge becomes a
    2D aerial charge, confirm he still takes knockback (just much less)
    rather than reading as fully immune; confirm both defeats grant +1 Max
    Health (or whatever `game.js`'s generic defeat block already grants —
    neither def overrides it) and persist through save/reload.
[ ] 8 fights remain (of the original 12 in `Plans/continue_boss_buildout_prompt.md`'s
    table, 4 now built): Quantum Pursuer (`abyss_guardian`, needs a real
    new delayed-player-shadow mechanic), Temporal Warden (`chrono_ally`,
    needs a new precog-dodge defense concept), Sovereign (moveset
    alignment pass only, architecture already exists — smaller than the
    rest), the two engine-mechanic outliers (Gravity Collapse Core's room
    gravity, Electromagnetic Golem's magnetize — each needs its own
    `EnterPlanMode` pass before moveset design), Warden & Hollow (duo,
    needs the small category-specific-defense addition — also smaller than
    the rest, existing `role`/`applyRoleCoordination` fits it), and the two
    unbuilt rooms (Void Expanse miniboss, Antechamber/The Child, which also
    has an unresolved design conflict with Abandoned Shell per `lore.md` —
    flag that to the user before building it).

═══════════════════════════════════════════════════════════════════════════
Boss buildout — Quantum Pursuer + Warden & Hollow (2026-07-26, same day)
═══════════════════════════════════════════════════════════════════════════
Fourth pair in the same continuing batch — 8 of the original 12 fights now
built. Both needed genuinely new mechanics the phase-system extensions
weren't enough for (unlike The Assembler/Stationmaster's pair, which reused
`phaseDef.movement`/`spawnOnStart`), so this entry adds one real subclass
and one real new defense verb, each scoped as small and isolated as
possible:

[x] **Quantum Pursuer** (`abyss_guardian`, `QUANTUM_PURSUER_DEF`/
    `QuantumPursuer` in `enemy.js`) — Echoing Abyss's miniboss, evil-by-
    choice. Story doc (`expansion.md` Phase 4 #4.6): releases a 0.5s-
    delayed shadow of the player's own soul that forces constant movement,
    while charging soul-powered ranged spells; phase 1 weak to knockback,
    phase 2 soul-charged/knockback-resistant and covers the field with
    long-range spells. The delayed-shadow half doesn't fit the existing
    phase/attack vocabulary at all, so this is a real `ComposedEnemy`
    subclass — `update()`/`draw()` overrides layered on the shared combat
    machinery (same "bespoke overlay" shape `Boss`/`ColossusCore` already
    use), not a data-only def. Mechanism: a 30-frame (~0.5s) FIFO ring
    buffer of the player's own position, pushed every `update()`; once
    full, the oldest entry is the shadow's live position, drawn as a
    translucent silhouette and dealt as real contact damage (its own
    60-frame hit cooldown, gated on `player.invincibleTimer`). NOT scaled
    by `gameTimeScale` on purpose — the delay stays roughly wall-clock even
    during Stillpoint rather than stretching with it (a judgement call, not
    verified by playtest). Ranged half is the existing `ranged_projectile`
    homing pattern, intensified to a 3-way spread at 50% HP. Base
    `knockbackResistance` set to a near-zero 0.05, not a literal 0 — phase
    2's `knockbackResistanceMult` *multiplies* the existing value
    (`_applyPhase()`), so a true 0 could never be raised by any multiplier;
    0.05 still reads as "weak to knockback" while leaving room for phase
    2's real (not full-immunity) resistance bump.
[x] **Warden & Hollow** (`warp_guardian`, `WARDEN_DEF`/`HOLLOW_DEF`/
    `WardenAndHollow` in `enemy.js`) — Warp Gate Nexus's duo miniboss,
    sympathetic (dutiful gatekeepers whose shift never technically ended,
    per `lore.md`). Story doc (#4.9): a reactive counter-pair, not fake
    prediction — Warden guarantees a parry vs. melee only with no other
    offense; Hollow guarantees a dodge/teleport vs. ranged & ability hits
    but is vulnerable to melee; strategy is melee Hollow, ranged/Phase Dash
    Warden, forcing toolkit-switching. `game.js`'s miniboss system only
    tracks one primary boss entity at a time (`MINIBOSS_CLASSES`/
    `defeatedMinibosses` are both singular, not arrays), so per this
    batch's established add-spawning pattern (the Stationmaster's
    prisoners), **Warden is the registered miniboss and Hollow spawns
    alongside him via `def.spawnOnStart`** — a second independent
    `ComposedEnemy` fighting in the same arena, not a second tracked "boss"
    (her own defeat doesn't independently grant/persist anything — only
    Warden's does, via the existing generic defeat block). Warden's
    "guaranteed parry, no other offense" needed zero new engine work:
    `defense.block` with `chance: 1.0` plus an empty `attacks: []` (already
    a sanctioned pattern — see Anchor Wraith's "deliberate zero-attack def"
    precedent) covers it exactly; the existing cooldown gap between guard
    windows is the real punish opportunity, not a new "guard break"
    concept. Hollow's half needed a real new **`defense.rangedDodge`**
    verb (`updateDefense()` in `enemy.js`) — checked every frame
    (independent of the existing melee-swing-triggered `defense.dodge`),
    scans the live player-projectile array (`game.js`'s `projectiles`,
    i.e. Shard Shot — distinct from `ComposedEnemy`'s own enemy-fired
    array) for anything within range and heading toward the enemy, then
    reuses `defense.dodge`'s exact i-frame/hop mechanics on a separate
    trigger. **Deliberately scoped to Shard Shot only** — Void Tether/
    Graviton Surge "ability hits" from the doc's own wording aren't
    detected by this verb; flagging honestly rather than over-claiming.
[x] Both registered in `game.js`'s `MINIBOSS_CLASSES` (now 8 entries).
    Both rooms (`echoing_abyss_room2`, `warp_gate_nexus_room2`) already
    had `roomType: 'miniboss'`/`miniboss`/`bossSpawn` authored; both
    `BOSS_MUSIC_MAP` entries (`boss_quantum_pursuer.ogg`,
    `boss_warden_hollow.ogg`) already wired and the asset files already
    exist on disk — zero `area.js`/`audio.js` changes needed, same as
    every fight in this batch.
[ ] Verified with `node --check` on `game/enemy.js`/`game/game.js` only —
    no browser testing per `Plans/CLAUDE.md`'s hard rule, and this pair is
    the riskiest yet (a real subclass overriding `update()`/`draw()`, plus
    a new defense verb touching the shared `updateDefense()` every
    enemy/miniboss runs through). Manual test plan: enter Echoing Abyss's
    boss room, confirm `QuantumPursuer` spawns, confirm a translucent
    player-shaped shadow appears trailing roughly half a second behind
    real movement once ~0.5s has passed, confirm it deals real contact
    damage without needing to be near the actual boss, confirm her homing
    bolt fires and that at 50% HP it becomes a 3-way spread with a longer
    range/shorter cooldown, confirm knockback still visibly moves her in
    phase 1 and is clearly reduced (not eliminated) in phase 2; enter Warp
    Gate Nexus's boss room, confirm both `WardenAndHollow` (Warden) and a
    second `Hollow` enemy are present from the start, confirm Warden raises
    guard on essentially every melee swing startup while in range/facing
    him (and that a melee swing during his cooldown gap connects normally),
    confirm Shard Shot connects on Warden normally (no ranged defense),
    confirm Hollow hops/evades when a Shard Shot is fired toward her from
    within ~260px, and confirm melee connects on Hollow normally with no
    evasion; confirm both fights' defeats behave correctly (Warden's grants
    +1 Max Health/persists as usual; confirm leaving mid-fight clears
    Hollow along with everything else in the room, not just Warden).
[ ] 6 fights remain: Temporal Warden (`chrono_ally` — re-read via
    `expansion.md`'s #4.3 row this session: NOT a `defense.dodge` variant
    as this doc's older outline guessed, it's a periodic self-health-
    rewind-unless-interrupted cycle, a real new timer-based state machine,
    plus a deliberately narrow, narratively-justified partial-Stillpoint-
    resistance exception per `expansion.md` §2 — read that section
    carefully before building, don't improvise the Stillpoint interaction),
    Sovereign (moveset alignment pass to `boss.js`'s existing 3-phase
    class — no new architecture, but a large, careful content pass across
    a ~1000-line bespoke file, deliberately not attempted casually
    alongside the additive def-only fights in this batch), the two
    engine-mechanic outliers (Gravity Collapse Core's room gravity,
    Electromagnetic Golem's magnetize — each still wants its own
    `EnterPlanMode` pass before moveset design), and the two unbuilt rooms
    (Void Expanse miniboss, Antechamber/The Child — the latter's Abandoned
    Shell conflict still unresolved).

═══════════════════════════════════════════════════════════════════════════
Boss buildout — Electromagnetic Golem + Gravity Collapse Core (2026-07-26, same day)
═══════════════════════════════════════════════════════════════════════════
Fifth pair — **10 of the original 12 fights are now built** (4 remain:
Temporal Warden, Sovereign, Void Expanse, Antechamber — see the end of this
entry). Both of this pair were the batch's "large/machine, not human-scale"
fights and
both went through a full `EnterPlanMode` scoping pass first (plan file:
`~/.claude/plans/distributed-gliding-forest.md`) before any code, per their
own long-standing flag as "new-engine-mechanic outliers." Two background
Explore agents established ground truth first (Graviton Surge is a narrow,
player-only, up/down-only `vy` sign-flip with zero room-gravity concept —
not reusable machinery; Magnet Climb, an earlier removed ability, left
zero code behind), then a Plan agent designed the gravity architecture,
which was independently spot-checked against the live code (the miniboss
null-out lifecycle, a third `resolveEntityCollision` caller in
`companion.js` the first research pass missed) before being written up and
approved.

[x] **Electromagnetic Golem** (`polar_guardian`, `ELECTROMAGNETIC_GOLEM_DEF`/
    `ElectromagneticGolem` in `enemy.js`) — The Polar Shift's miniboss,
    directed by an unnamed scientist (evil-by-choice). Story doc
    (`expansion.md` #4.5): strong hits with heavy knockback; charges walls/
    floor/the player with a magnetic charge (attract or repel); counterplay
    platforms flip the player's own charge; phase 1 repulsion pushes the
    player around, phase 2 (≤50% HP) charge-reversal slams pull them in
    hard; weak to projectiles/charged attacks. **Needed zero changes to
    `physics.js`'s shared collision resolver** — magnetism is purely an
    additive force before the existing collision pass, the same shape as
    the pre-existing gravity-well projectile pull (`enemy.js`) and the
    Graviton Ball's enemy-pull (`game.js`). New pieces: `player.magnetCharge`
    (`player.js`, null everywhere outside this fight), a `polarity` platform
    flag (`area.js`/`game.js`'s platform draw code, following the existing
    `destructible`/`crumble` precedent rather than the half-built `moving`
    flag's), and a `magnetizable` flag marking which platforms the Golem's
    own attack can charge at runtime (permanent `polarity`-authored
    platforms are separate, fixed counterplay platforms, untouched by the
    boss). The Golem itself is a real subclass (like Quantum Pursuer/The
    Stationmaster) since "charge specific platforms on a timer" is genuine
    per-frame room-state manipulation outside the phase/attack vocabulary;
    includes a defensive reset in its own constructor so a fight left
    mid-charge (room exit without defeat) can't leave stale charged
    platforms for the next attempt. `polar_shift_room2` got 4 hand-authored
    platforms (was a flat floor-only scaffold) — an early 620/480/380-height
    draft failed `validateRoomLayout()`'s reachability check outright
    (jump height caps at ~114px; the gaps were 2x that), corrected to a
    single reachable tier at y:770, re-verified at zero failures before
    commit.
[x] **Gravity Collapse Core** (`horizon_core`, `HORIZON_CORE_DEF`/
    `HorizonCore` in `enemy.js`) — Event Horizon's miniboss, no moral agent
    (a runaway mining-extraction accident, not a person, per `lore.md`).
    Story doc (`expansion.md` #4.2): a massive flying construct that
    changes the room's gravity to any of 4 directions; phase 1 debris
    projectiles + gravity shifts; phase 2 same kit, denser hazard layering;
    immune to knockback and to being juggled. The real architecture work
    this pass:
    - **`physics.js`**: `getRoomGravityDir()` (reads `miniboss.roomGravityDir`,
      defaults `'down'` — safe by construction, not convention, since
      `game.js` already nulls `miniboss` the instant a room's
      `isMinibossArena` flag goes false or on defeat), `applyRoomGravity()`
      (replaces 9 previously-scattered `vy += GRAVITY` lines across
      `enemy.js` ×6/`player.js`/`companion.js` — the `'down'` branch is
      byte-identical to the old code), and `resolveRotatedGravityCollision()`
      — a brand-new sibling function next to `resolveEntityCollision`
      (**never modified, never called differently for `'down'`**), a direct
      axis-swapped transposition of its existing two-pass floor/wall logic
      for `'up'`/`'left'`/`'right'`. `resolveEnemyPhysics` gets one dispatch
      branch at its top, so **zero changes were needed at any of the 6
      `enemy.js` call sites** — every enemy's physics tail already routes
      through that one choke point.
    - **`player.js`/`companion.js`**: the 3 other direct gravity/collision
      call sites get the same dispatch. `player.js` also gets an input-axis
      remap — walking/jumping need to target different axes once gravity
      points sideways, or "stand on a wall" degrades to "get stuck on a
      wall." Reuses the existing `aimUp`/`aimDown` input actions for
      along-the-wall movement during `'left'`/`'right'` gravity (a
      first-draft control mapping, not confirmed by playtest — flagged as a
      judgment call, easy to swap later). Wall-slide/wall-jump are
      deliberately skipped in any non-`'down'` direction — their premise
      (sliding down a vertical wall while gravity pulls straight down) has
      no clear meaning once a wall IS the floor; out of scope for v1.
    - **Verification**: `node --check` on every touched file (16 total,
      the whole game/ folder), plus a from-scratch headless Node test suite
      (12 cases: floor-landing and ceiling-bump for all 3 rotated
      directions, the perpendicular wall-pass, the `resolveEnemyPhysics`
      dispatch itself) exercising the actual collision math in isolation —
      caught and fixed several real sign/edge-case bugs in the first draft
      before they could ever reach a fight (transposing "pre-move edge
      position" reasoning across 3 different axis/direction combinations is
      exactly the kind of thing that's easy to get subtly wrong once but
      hard to verify by eye). This is the strongest verification available
      without a browser, but it is NOT a substitute for a real playtest of
      the actual boss fight — flagged clearly to the user.
    - **`enemy.js`**: the boss itself needed no gravity-architecture code at
      all — `movement.type: 'hover'` already exempts it from its own
      attack (`_movementFlies` skips `applyRoomGravity`/collision
      entirely), and a `healthPct: 1` phase reuses the existing
      `phaseFlags.knockbackImmune` hook for permanent immunity from frame
      one. A new generic `gravity_flip` `ATTACK_BEHAVIORS` entry (reusable
      by any future fight, not boss-specific) sets `enemy.roomGravityDir`
      on fire, picking any direction other than the current one.
    - **`area.js`**: `event_horizon_core` got real wall/ceiling platforms
      (was a flat floor-only scaffold) — none carry `wall: true` (that flag
      would make them permanently non-standable in every direction,
      defeating the point). Positions clear both existing transition doors
      with 60px+ margin. **Found and fixed a real linter false-positive as
      part of this**: `validateAllRoomLayouts()` (auto-runs on every page
      load) has no concept of rotated gravity, so it flagged the new
      ceiling/walls as "unreachable" under its always-down-gravity
      simulation — added a new `rotatedGravityOnly` platform flag (zero
      effect on real physics, confirmed nothing in `physics.js` reads it)
      following the exact same exemption pattern the linter's own
      `ceiling`/`hazard` flags already use, so the dev-only linter stops
      producing console noise for platforms that are only ever standable
      once the boss flips gravity. Re-verified: `event_horizon_core` and
      the full 71-room `validateAllRoomLayouts()` both pass with zero
      failures after the fix.
[x] Both registered in `game.js`'s `MINIBOSS_CLASSES` — **10 entries now
    present** (`colossus_core`, `static_guardian`, `hollow_guardian`,
    `graviton_sentinel`, `paradox_engine`, `timeline_keeper`,
    `abyss_guardian`, `warp_guardian`, `polar_guardian`, `horizon_core`).
    Both music entries (`boss_electromagnetic_golem.ogg`,
    `boss_gravity_collapse_core.ogg`) already wired and on disk — zero
    `audio.js` changes needed.
[ ] Manual playtest checklist (not run — no-browser-testing rule):
    Electromagnetic Golem — confirm platforms visibly pulse red/blue when
    charged, confirm touching a fixed counterplay platform flips your own
    charge, confirm same-charge repels and opposite-charge attracts,
    confirm phase 2's forced charge-reversal reads as a real "slam," weak
    to Shard Shot as intended. Gravity Collapse Core — confirm `gravity_flip`
    visibly rotates the room and the player can actually walk/jump on
    whichever surface is now "down," confirm the aimUp/aimDown-for-movement
    control mapping feels reasonable during sideways gravity (this is the
    one piece most likely to need a real design iteration after playtest),
    confirm debris projectiles connect, confirm the boss is fully immune to
    knockback/juggling throughout, confirm leaving the room mid-fight and
    re-entering resets gravity cleanly back to `'down'`.
[ ] **10 of the 12 fights from `Plans/continue_boss_buildout_prompt.md`'s
    original table are now built** (`colossus_core`/Crag Warden predates
    this batch and doesn't count toward the 12, but is included in the 10
    `MINIBOSS_CLASSES` entries above). 2 remain, both architecturally
    tractable with existing patterns, neither attempted this session:
    - **Temporal Warden** (`chrono_ally`) — deliberately last per the user
      ("doesn't go all out offensively on you but I haven't worked out his
      kinks yet"); needs a periodic self-health-rewind-unless-interrupted
      state machine (not the `defense.dodge` variant this doc's older
      outline guessed) plus a narrow, narratively-justified partial-
      Stillpoint-resistance exception (`expansion.md` §2) — don't build
      until the design itself is settled with the user.
    - **Sovereign** (final boss, `class Boss` in `boss.js`) — a content/
      moveset-alignment pass to the existing bespoke 3-phase class, no new
      architecture needed, but a large, careful pass across a ~1000-line
      file; deliberately not attempted casually alongside this batch's
      additive def-only fights.
    Two more were flagged from the start as needing rooms authored before
    they're even buildable, and were never strictly "the 12" in the same
    sense (no id/room exists yet): **Void Expanse miniboss** (needs a name
    and a room) and **Antechamber/The Child** (needs a room, and has an
    unresolved design conflict with the Abandoned Shell fight per
    `lore.md` — flag to the user before building). Every fight in this
    batch is verified via `node --check` and (where the risk warranted it)
    headless unit tests only — **none has been played in a real browser
    yet.**

═══════════════════════════════════════════════════════════════════════════
The Sovereign — full moveset rebuild (2026-07-26, same day)
═══════════════════════════════════════════════════════════════════════════
The final boss (`class Boss`, `boss.js`) rebuilt to actually match the
long-standing design intent from `lore.md`'s "Final fight structure" and
`expansion.md` §2: she is "the player in the future" — same ability kit,
missing only Graviton Surge, carrying a corrupted Void Tether that pulls
HER to the player. Phase 1 (>60% HP): heavy precognition, restrained real
offense. Phase 2 (<=60%): full kit except Stillpoint. Phase 3 (<=30%): adds
Stillpoint itself (literal), full immunity to the player's own Stillpoint
(pre-existing, confirmed still correct). Plan file:
`~/.claude/plans/distributed-gliding-forest.md`. Old attacks (Charge Rush,
Ground Slam, Projectile Barrage, Triple Shot, Nova, the phase-3 Ultimate
beam) are gone — Projectile Barrage has no replacement (Nova already filled
its "fill the room" role); everything else became the base for a
player-mirrored move per the plan's disposition table. Teleport is kept
unchanged as connective tissue between moves.

[x] **Damage plumbing fix** — `Boss` gets `_activeAttack`/`attackDefs`
    (mirrors `ComposedEnemy`'s shape, `enemy.js`), plus
    `getAttackHitbox()`/`getAttackDamageAndKnockback()`. `game.js` gets a
    new "Boss attack hits player" block modeled 1:1 on the existing
    miniboss consumer pattern (`game.js:3919-3937`), inserted before the
    old flat body-contact block (which stays, now the genuine low-tier
    fallback). `bossProjectiles` consumer now reads `bp.damage`/
    `bp.knockback` per-projectile with the old flat `BOSS_DAMAGE` as
    fallback only. Every hit that used to be a flat 1 damage regardless of
    attack now carries real, tuned numbers.
[x] **New moves** (`boss.js`) — Melee combo (directional forward/up/down,
    short 14f telegraph), Charged Heavy (40f telegraph, `damage: 2,
    knockback: {vx:18, vy:-9, hitStun:22}` — tuned for the explicit "flying
    into the arena wall" direction, ~2x this session's other hard-hit
    reference points), Dash-Chain (repurposes the old Charge Rush's
    slide/bounce state machinery, generalized from a single "double charge"
    boolean to N chainable legs, up to 3 total), Phase-Dash (defensive,
    short burst + 13f invincibility, no stagger — dashes away from the
    player, unlike Dash-Chain's toward-player aggression), Reversed Void
    Tether (Phase 2+, reddish corrupted telegraph, ramped pull-toward-player
    using the same ramp shape as the player's own tether arrival, lands via
    the generalized lunge motion then a punishable self-stagger), Shard Shot
    (single aimed projectile, damage/knockback set directly on the pushed
    object), Beam channel (Phase 2+, a boss.js-local per-frame overlap
    check — same self-contained shape as the pre-existing Phase 3 aura,
    not a reuse of the player's own beam code), Wall-Burst (edge-triggered
    reposition with a vertical arc, silently no-ops back to idle if she
    isn't actually near a wall when rolled — flagged as easy to cut if it
    reads as a stretch in play).
[x] **Precognition** (`readPlayerTell()`/`precogCounter()`, all phases) —
    watches the player's own already-public fields (`charging`/
    `chargeTimer`, `stillpointCharging`/`stillpointHoldTimer`,
    `shardAiming`, `attacking`) for a rising tell past `PRECOG_MIN_LEAD`
    (12f), no new `player.js` fields needed. Phase 1: reposition-only
    response (Phase-Dash or the generalized lunge), matching "restrained,
    no real offense yet." Phase 2+: the same reads feed real counter-
    attacks (Dash-Chain off a predicted Heavy, the lunge off a predicted
    Stillpoint-hold). Phase 3: keeps running on a longer cooldown (220f vs
    140f) so it doesn't compete with the Stillpoint centerpiece.
[x] **Phase 3 Stillpoint** (literal, not a reskin) — `bossStillpointActive`/
    `Timer`/`Cooldown`, `BOSS_STILLPOINT_SLOW = 0.97` (steeper than the
    player's own max, `STILLPOINT_SLOW_LV3 = 0.9`). Nova's old radial-burst
    code is repurposed into the activation VFX (cosmetic particles only
    now, not a damaging roll). `game.js`'s `gameTimeScale` assignment gets
    an OR branch — player's own Stillpoint still wins if both are somehow
    active, else her cast drives it. Her own pre-existing `myTimeScale`
    phase-3 exemption already generalized correctly to "immune to her own
    cast too" with zero changes needed (confirmed, not assumed). Her own
    projectiles/beam get a `projScale` that ignores the slow specifically
    during her own cast (the existing "boss projectiles stay slowed by the
    *player's* Stillpoint" asymmetry is untouched — only her own-cast case
    is newly exempted). **The real lift**: `player.js` gets a new
    `this.timeScale` field, set from `game.js` right before
    `player.update()` runs. Scoped deliberately (not an exhaustive rewrite
    of every ability timer in the file, which would be high-risk to get
    right without a playtest): scales position integration
    (`x += vx*timeScale`), room-gravity application, `dashCooldown`,
    `attackCooldown`, `hitStunTimer`, and `invincibleTimer` — leaves
    input-latching decision timers (`chargeTimer`, `stillpointHoldTimer`)
    and every other ability's internal timer (dash/attack/phaseDash active
    duration, Graviton/Shard/Void Tether timers) untouched, so the
    player's own choices stay legible while their resolution in the world
    slows. This is the single highest-risk edit in the whole rebuild — a
    real change to the player's core loop, not a flag — and the narrowed
    scope is a deliberate risk-reduction call, not an oversight; worth
    revisiting if a playtest shows the slow doesn't read as strongly as
    intended.
[x] `audio.js` gets `SFX.bossStillpointStart()`/`bossStillpointEnd()` —
    lower/harsher mirrors of the player's own `stillpointActivate()`/
    `stillpointEnd()`. No new music track needed (`final_boss.ogg` unchanged
    per this session's own audio research, see below).
[ ] **Out of scope, deliberately** (per the plan): `game.js:4369`'s
    hardcoded HUD label `'THE FRACTURED KING'` — user-facing, directly
    visible during this exact fight, but outside the documented
    "identifiers only" scope of the King→Sovereign rename debt; flagging
    for an explicit separate decision rather than silently changing copy.
    Migrating `Boss`'s bespoke phase system onto `enemy.js`'s generic
    `phasesDef` system — architecture-consistency-only, not requested,
    thresholds already match. Player-side balance re-tuning for a harder
    final boss — a real question eventually, a game-balance one, not a
    moveset-parity one.
[ ] Manual playtest checklist (not run — no-browser-testing rule): confirm
    each mirrored move's telegraph reads clearly (especially Charged
    Heavy's 40f windup vs. the quick 14f Melee combo — they should feel
    like different weight classes); confirm Charged Heavy's knockback
    actually carries the player into an arena wall on a clean hit as
    intended, and re-tune `attackDefs.heavy.knockback` if it under- or
    over-shoots; confirm Dash-Chain's up-to-3-leg bounce feels readable,
    not disorienting; confirm Reversed Void Tether's pull-in reads as
    "corrupted"/dangerous and its reddish telegraph is clearly distinct
    from the player's own teal tether; confirm the Beam channel's tick
    damage lands at a fair cadence (its cadence is bounded by
    `player.invincibleTimer`, same shape as the pre-existing Phase 3 aura —
    confirm that reads as intended rather than "only ticks once"); confirm
    precognition's Phase 1 reads feel like real foresight, not random
    dodges; confirm Phase 3 Stillpoint actually makes the player feel
    slowed (the narrowed `player.timeScale` scope above is the one most
    likely to need widening after a real playtest) and that ending it
    cleanly returns `gameTimeScale`/`player.timeScale` to 1.0; confirm
    Wall-Burst doesn't waste too many attack rolls silently no-op'ing back
    to idle when she's not near a wall.

═══════════════════════════════════════════════════════════════════════════
Audio research — Crag/Antechamber/Void Expanse/Final Boss/Spawn/Tutorial (2026-07-26, same day)
═══════════════════════════════════════════════════════════════════════════
Research only, nothing downloaded/wired — a background agent independently
re-verified and extended the prior pass's candidate table (all URLs/
licenses confirmed live) for the 6 areas asked about:
- **Crag**: "Loopable Dungeon Ambience" (JaggedStone, CC0) — same pick as
  before, no stronger CC0 alternative found after a fresh search.
- **Antechamber**: new recommendation — "Eye of the Storm" (Joth, CC0,
  already the source for other ambient tracks in this game) over the prior
  pick ("A New Start," Wolfgang_, CC0, kept as a hopeful-leaning backup) —
  reads closer to "melancholy but not despair" than a resolved/hopeful
  piano piece.
- **Void Expanse**: "Call of the Void" (Mega Pixel Music Lab, CC-BY
  3.0/4.0) — confirmed no CC0 equivalent exists for this specific mood;
  same pick as before, needs attribution.
- **Final Boss**: keep `final_boss.ogg` as-is (Juhani Junkala, CC0) — no
  stronger match found for "fighting your own future self."
- **Spawn Room**: "First Light Particles" (Yoiyami, CC0) — same pick,
  confirmed strongest "weighted home" candidate.
- **Tutorial Room**: new recommendation — "Where was I?" (yd, CC0) over the
  prior pick (YannZ's "Intro Loop," CC-BY 4.0) — equally fitting and drops
  a CC-BY attribution requirement entirely, leaving Void Expanse as the
  only slot needing attribution.
[ ] Execution not started (needs explicit approval — touches files): if
    approved, download each track, run through the existing
    `ffmpeg loudnorm` + fade + re-encode pipeline (`assets/audio/music/
    CREDITS.md`), rename per convention, wire new `MUSIC_MAP` entries in
    `game/audio.js` (Spawn/Tutorial need a genuine split off the shared
    `hub_living.ogg` key, not just a rename), update `CREDITS.md` with the
    new entries including attribution for the one CC-BY pick (Void
    Expanse).

═══════════════════════════════════════════════════════════════════════════
Dev-tool sync, Temporal Warden, scavenged weapons (2026-07-26, same day)
═══════════════════════════════════════════════════════════════════════════
[x] **Every `editor/*.html` gets a "← Dev Hub" back-link** — the exact
    `#back`/`<a id="back">` pattern that only `ability_utility_calculator.html`
    previously had, added to the other 16 tools (`dev_hub.html` itself
    excluded — it IS the hub). Caught and fixed a scoping miss mid-pass:
    `anim_editor.html`/`enemy_editor.html`/`levelEditor.html` only supported
    being deep-linked *from* the hub (`?anim=`/`?enemy=`/`?room=` query
    params) — no actual button *to* it — so they needed the same fix as
    every other tool, not the "already has it" pass they were first
    assumed to be part of.
[x] **`worldmap.html` — deleted**, per explicit user direction ("if it
    can't be fixed... delete it... it's kinda useless too"). Investigated
    the "so much overlap" complaint concretely first (loaded the real
    `AREAS` object via the same `vm`-sandbox pattern `export_graph.js`
    uses, not assumed): 22 of 35 occupied compass-grid cells had 2+ real
    rooms stacked on the exact same cell. Root cause isn't a rendering bug —
    `col`/`row` in `area.js` is a region-level positioning convention, not a
    per-room-unique one (region-chain helper/cutscene/corridor sub-rooms
    routinely share a cell with an unrelated region's room), so a real fix
    means redesigning the renderer to cluster/stack overlapping rooms
    instead of a flat grid — a rework, not a patch. `regions.md`'s own
    history (line ~100) shows this exact complaint was already partially
    patched once before (moving *planned*-region placeholders to clear
    columns) and it recurred anyway once *built* rooms started colliding
    too — reinforcing that the tool's core premise doesn't hold, not just
    that one column assignment was wrong. Removed the dev_hub.html card and
    updated every doc that described it as a live tool (`CLAUDE.md`,
    `OVERVIEW.md`, `performanceInstructions.md`, `regions.md`) to note the
    removal instead of silently going stale.
[x] **Two miniboss-registry bugs found and fixed while doing the above**
    (both predate this session): `polar_guardian`/`horizon_core` had been
    added to `enemy.js`'s `ENEMY_REGISTRY` in an earlier pass this same day
    — inconsistent with every other miniboss (ComposedEnemy-based or not),
    none of which are ever listed there, only in `game.js`'s
    `MINIBOSS_CLASSES` (a miniboss is a singular room-level assignment with
    its own spawn lifecycle, not a regular placeable/roster enemy — the
    two dev tools that read the roster generically would otherwise offer
    them as swarm-placeable). Reverted; added a comment at the registry to
    stop this recurring. Separately, `enemy_test.html`/`difficulty_bot.html`/
    `game/agentController.js`'s miniboss-select UI+spawn code was hardcoded
    to `colossus_core` only — generalized all three to read
    `MINIBOSS_CLASSES` directly, so any future miniboss needs zero code
    changes in those tools, just a roster/option entry.
[x] **Temporal Warden** (`chrono_ally`, `TemporalWarden` in `enemy.js`) —
    drafted from the existing design already written in `expansion.md`
    §4.3/§2.5 and `lore.md`'s Chrono-Space Rift section (a sympathetic
    precognition-driven time mage who deliberately holds back his true
    strength out of guilt). Bespoke class (like `ColossusCore`, not
    `ComposedEnemy`) since the core mechanic — rewinds his own health on a
    visible ~10s countdown unless the player deals enough damage during a
    brief flash-window tell — is real per-frame state manipulation outside
    the phase/attack vocabulary, same reasoning as the two gravity/magnetism
    fights. Also carries the one narratively-justified partial Stillpoint
    resistance in the game (`expansion.md` §2.5 explicitly flags this as a
    singular beat, "not a template to repeat elsewhere") — implemented as
    his own local blend of `gameTimeScale`, ramping in only after 3+
    Stillpoint activations against him specifically, never touching the
    shared value every other enemy reads. Restrained ranged-only kit (no
    melee, no heavy hits) matches "doesn't go all out on you." Reward on
    defeat is a Stillpoint upgrade (+1 lifesteal per hit) instead of the
    usual +1 Max Health, per his specific documented reward — implemented
    as a new separate `stillpointLifestealBonus` (game.js, saved/loaded/
    reset alongside `maxHealthBonus`) rather than bumping
    `statUpgrades.stillpoint` directly, since `totalPipsSpent()` derives
    spent-lore-pips purely from that stat's level and would have silently
    charged the player pips they never spent. Registered in
    `MINIBOSS_CLASSES` — `chrono_rift_sanctum` already had
    `miniboss: 'chrono_ally'`/`roomType: 'miniboss'` authored (from an
    earlier session) with no class to back it, so this was a real gap, not
    new scaffolding. Music (`boss_temporal_warden.ogg`) was already wired
    in `BOSS_MUSIC_MAP` — zero `audio.js` changes needed. **Not** added to
    `enemy_test.html`'s Boss/Miniboss dropdown or `difficulty_bot.html`'s —
    both already pick him up for free via the `MINIBOSS_CLASSES`
    generalization above.
[ ] Manual playtest checklist (not run): confirm the rewind countdown's
    visible tell (pulsing ring + white eyes) reads clearly enough to know
    when to commit damage; confirm `TEMPORAL_WARDEN_INTERRUPT_DAMAGE` (4)
    is a fair bar — too low trivializes the mechanic, too high makes it
    feel unfair; confirm the Stillpoint-resistance ramp (kicks in after 3
    activations) is noticeable without reading as "Stillpoint is broken
    against him"; confirm the Stillpoint-lifesteal reward notification/HUD
    reads correctly and the bonus persists through a save/reload.
[x] **Twin/duo miniboss check** — Warden & Hollow (`warp_guardian`,
    `WardenAndHollow`/`HOLLOW_DEF` in `enemy.js`) already exists as a real
    duo, built in an earlier session: Warden is the tracked miniboss
    (guaranteed parry vs. melee, `defense.block` at `chance: 1.0`, no other
    offense), Hollow is a second, independent `ComposedEnemy` spawned
    alongside him via `def.spawnOnStart` (guaranteed dodge vs. Shard Shot,
    vulnerable to melee) — not a single entity standing in for two. No new
    work needed; user asked before assuming this was a gap.
[x] **Generalized scavenged-weapon attack system** (`enemy.js`) — three new
    `ATTACK_BEHAVIORS` entries any `ComposedEnemy` def can use: `gun`
    (thin wrapper around the existing projectile pipeline, fast flat
    bullets), `flamethrower` (close-range continuous cone, ticks a burn DoT
    via `applyPlayerDot()` rather than one big hit — same `onTick`/
    `visualRect`/null-`getHitbox` shape `beam` already uses), `taser` (low
    damage, heavy hitstun — the "incapacitate, don't kill" read). Grounded
    directly in `lore.md` (§264-265, §457) and `expansion.md` #331, both of
    which already describe "tasers, flamethrowers, bombs, and guns
    scavenged" as a widespread war-weapon motif — The Child's own planned
    (unbuilt, conflicted with Abandoned Shell) kit was the reference point,
    not a target to build here. "Normal vs strong" is expressed as preset
    consts (`GUN_NORMAL`/`GUN_STRONG`, etc.) spread onto a def's own attack
    entry — the same pattern every other tunable attack in this file
    already uses (different numbers, not different type strings) — where
    "strong" reads as more dangerous per weapon's own identity (a tighter
    burst for a gun, a longer burn for a flamethrower, a longer stagger for
    a taser), not just bigger numbers across the board. Bombs (also named
    in both docs) needed no new behavior — `ranged_projectile`'s existing
    `pattern: 'mine'` already covers a thrown-charge exactly. One concrete
    example, `war_scavenger`/`WarScavenger`, ships with the gun preset and
    is spawnable via `enemy_test.html`; `enemy_designer.html`'s attack-type
    dropdown picked up all three automatically (it already derives from
    `ATTACK_BEHAVIORS` generically, no changes needed there). **Not** placed
    in any region's `AREAS` entry — general-purpose infrastructure, not a
    roster/placement decision, per the request's own framing ("so normal
    enemies CAN have" these, not "give region X this specific enemy").
[ ] Flagged, not fixed (separate background task spawned): `enemy_test.html`'s
    "Planned — Normal" enemy group has the same built-vs-planned staleness
    already found and fixed in its miniboss group earlier this session —
    several entries (Stillpoint Revenant, Shard Spitter, Timeworn Husk,
    Kinetic Striker, Pulse Warden, Fractured Knight, Void Juggernaut, Ruin
    Stalker) are real `ENEMY_REGISTRY` classes marked `built: false`. Out
    of scope for this pass (noticed in passing while adding War Scavenger),
    handed off separately.

═══════════════════════════════════════════════════════════════════════════
Scavenged-weapon SFX + Net Launcher (2026-07-26, same day)
═══════════════════════════════════════════════════════════════════════════
[x] **CC0 SFX wired for gun/taser/flamethrower + scavenged-bomb** — 4 new
    samples in `assets/audio/sfx/` (`gunShot.ogg`/`taserZap.ogg`/
    `flamethrower.ogg`/`bombExplode.ogg`), sourced/normalized/re-encoded
    same convention as the music pipeline. `game/audio.js` gets matching
    `SFX.gunShot()`/`taserZap()`/`flamethrower()`/`bombExplode()` (sample +
    procedural fallback, same shape as every other SFX entry). Wired at
    each behavior's actual trigger point in `game/enemy.js` (gun's
    `onFire`, flamethrower's `onFire`, the mine-pattern explosion) plus a
    new type-specific branch in `game.js`'s enemy-melee-hit block so a
    taser hit plays `taserZap()` instead of the generic `playerHurt()`.
    Full source/license table: `assets/audio/sfx/CREDITS.md` (new — the sfx
    folder didn't have one before, unlike music). All 4 are CC0, no
    attribution required. **Known gap, documented in that CREDITS.md**:
    flamethrower.ogg is a fireplace-crackle placeholder, not a purpose-built
    jet-flame sound — the one strong CC0 candidate found (Freesound,
    SamsterBirdies) is login-gated for download and wasn't fetchable this
    pass.
[x] **Net Launcher** (`ATTACK_BEHAVIORS.net`, `game/enemy.js`) — a fourth
    scavenged weapon alongside gun/flamethrower/taser (added on user
    request, not from either doc's named list, but same "captured guard's
    kit" reasoning). Ranged root instead of taser's close-range hitstun
    jolt: thin wrapper over the existing projectile pipeline (like `gun`)
    with near-zero knockback + a long `knockbackHitStun` (70f normal/100f
    strong via `NET_NORMAL`/`NET_STRONG`) — reuses the pre-existing
    "hitStunTimer suppresses directional input" rule in `player.js` as the
    root itself, no new player-side state needed. Required one small
    plumbing addition: `ComposedEnemy.fireProjectiles()`'s generic
    projectiles previously never carried knockback at all (`player.
    takeDamage(proj.damage)`, no `sourceX`/`knockback` args) — added an
    opt-in `proj.knockback`/`proj.sourceX` (null for every existing
    pattern, so all other `ranged_projectile` users are unaffected) so
    `player.takeDamage(proj.damage, proj.knockback ? proj.sourceX :
    undefined, proj.knockback)` can drive it. `enemy_designer.html`'s
    attack-type dropdown picks it up automatically (derives from
    `ATTACK_BEHAVIORS` generically). **No dedicated SFX yet** — placeholder
    reuses `SFX.dash()`, flagged in `sfx/CREDITS.md`.
[ ] Verified with `node --check` only (no-browser-testing rule) — not
    played. In particular: net's root duration (70f/100f) and its
    projectile speed (dodgeability) are untested balance guesses, same
    caveat as every other scavenged-weapon preset.

═══════════════════════════════════════════════════════════════════════════
Difficulty bot: aim outputs, boss-phase awareness, bigger net + sidebar fix (2026-07-26, same day)
═══════════════════════════════════════════════════════════════════════════
[x] **Correction to this session's own earlier claim**: parry is NOT a real
    player mechanic right now — `player.js` (`PARRY_STUN`/`PARRY_IFRAMES`
    comment, line ~70) says it was removed 2026-07-18 ("silently overloaded
    the attack button... read as broken timing rather than a skill window"),
    kept only as scaffolding constants for "a future clash/deflect
    mechanic." `roadmap.md`'s own Phase 1.5 checkbox above still says
    "[x] 1.5 Player Parry / Deflect... done" — that entry is stale relative
    to the actual removal and should not be trusted; flagging here rather
    than silently editing history. The bot was never missing parry as a
    gap to fix — there's nothing to add it to.
[x] **Phase Dash was already fully available to the bot** — no code change
    needed. `abilityState.hasPhaseDash` (grantable via the existing ability
    loadout panel) makes the player's own `dash` action perform Phase Dash
    automatically (`player.js`, wasActionJustPressed('dash') branch) — the
    bot's pre-existing `dash` output already covers it whenever Phase Dash
    is granted in the loadout. This session's earlier "the bot has no Phase
    Dash" claim was wrong.
[x] **aimUp/aimDown added as two real outputs** (`game/agentController.js`)
    — closes a gap the file's own comments already flagged ("the bot always
    fires level/facing-direction, never an angled shot... Phase Dash has
    the same gap"). Both map generically through the existing
    `keyBindings[action]` lookup (input.js's real `aimUp`/`aimDown`
    bindings) — one addition unlocks angled Shard Shot aiming, 8-directional
    Phase Dash, AND directional up/down melee attacks simultaneously, since
    all three real mechanics read the same two input actions.
[x] **Boss-phase/precog-window awareness** — two new net inputs: nearest
    target's `.phase` ratio (0-1, present on Boss/several bespoke
    multi-phase minibosses, 0 for plain roster fighters) and whether it's
    currently running bossStillpointActive (Phase 3 Sovereign only). Without
    these the net had no way to distinguish a restrained Phase 1 Sovereign
    from a full-kit Phase 3 one, or notice the world/its own physics are
    running slowed during her Stillpoint cast.
[x] **Net capacity bumped** (HIDDEN_SIZE 26 -> 40) alongside the new
    inputs/outputs (BASE_SIZE 17 -> 19, INPUT_SIZE 41 -> 43, OUTPUT_SIZE
    9 -> 11) for more decision capacity. Still a single-hidden-layer
    fixed-topology net (see the existing "Scope cut" note in
    `difficulty_bot_and_combat_polish_plan.md` for why this isn't full NEAT
    topology evolution) — a deliberate low-risk choice given the no-
    browser-testing rule means none of this can be visually debugged if a
    2-hidden-layer forward pass had a transposition bug.
[x] **`#side` sidebar-invisible bug fixed at the source** — `game.js`'s
    `resizeCanvasToFit()` sized the canvas against the FULL window width,
    ignoring any sidebar; since `#stage`/`#side` are flex-shrink:0 flex
    children of a `overflow:hidden` body, the oversized canvas pushed
    `#side` fully off-screen (clipped, not just squeezed) on every
    `#side`-based editor tool (`difficulty_bot.html`, `enemy_test.html`,
    `companion_test.html`, `enemy_designer.html`, `ability_tester.html`).
    4 of those 5 pages already carried their own copy of a fragile
    "register a second resize listener after game.js's, so it wins"
    workaround for this — now centralized: `resizeCanvasToFit()` itself
    subtracts `#side`'s width when present (a no-op on `index.html`, which
    has no `#side`). The 4 pages' duplicate override listeners are now
    redundant no-ops, left in place rather than touched (out of scope for
    this pass, harmless since they compute the same corrected value).
[ ] Verified with `node --check` only (no-browser-testing rule) — none of
    this has been watched replay live. In particular: whether the bigger
    net actually trains "smarter" in practice (vs. just slower to converge
    with more weights to search) and whether the sidebar fix actually
    resolves what the user saw are both real open questions a session with
    the no-browser rule lifted needs to close.

═══════════════════════════════════════════════════════════════════════════
Phase 24 — Child companion: real activation + found-weapon fighting kit (2026-07-27)
═══════════════════════════════════════════════════════════════════════════
User report: "the child's ai is simply not that good, she kind of doesn't do
anything either." Root cause found before any AI tuning: `companionState.active`
was never set `true` anywhere in real gameplay — only inside
`companion_test.html`'s arena tool and save/load round-tripping — so she never
actually spawned in a playthrough. This phase fixes that and builds the Phase 2
fighting kit `child_companion_system_plan.md` had left open, resolving a real
three-way conflict found along the way between that plan doc's tether-pull
proposal, story.md's own "she fires shard shots" line, and what got discussed/
approved this session (found weapons) — story.md is now the corrected source
of truth, see its 2026-07-27 revision-history entry.

[x] **New `choice` cutscene step type** (`game/cutscene.js`) — story.md's
    rapid-tap-repeat prompt mechanic (mash one of two actions to a tap
    threshold; first to reach it wins; times out to a default) had never been
    built, only specced. Steps register onA/onB branches that splice into the
    running script in place of the choice step on resolution — cutscene.js
    now clones a scene's `steps` array per-play (`playCutscene`) instead of
    reusing the shared `CUTSCENES` entry directly, since splicing would
    otherwise permanently mutate the master script on first play. Skip-mid-
    choice resolves via `onTimeout` first so the branch's own setFlag/call
    steps are in the flat list `endCutscene`'s skip-sweep walks.
[x] **Echo Bridge meeting-the-child cutscene is now real** (extends the
    existing `echo_bridge_intro` stub) — ends in the Leave/Save choice
    story.md §2 point 1 always specced. Save sets `companionState.active =
    true`; game.js's existing per-frame block (`if (companionState.active)`)
    then lazily spawns the real `Child` — no new spawn code needed, it was
    already there and simply never triggered.
[x] **Live first-fight Protect/Train choice** (`child_first_fight_choice`) —
    story.md §2 point 2's "actual first moment the choice becomes concrete,"
    triggered from `game.js` the first frame any enemy in the room goes
    `aware` while she's active and untaught (`storyFlags.child_fight_choice_
    resolved` gates it to once, confirming that doc's "no re-prompt after
    the first fight" assumption). Train sets `companionState.canFight = true`
    and assigns her starter weapon.
[x] **Found-weapon combat kit** (`COMPANION_WEAPONS` in companion.js:
    knuckles/taser/flamethrower) replaces the plan doc's original tether-pull-
    only proposal and story.md's stale "shard shots" line — per direct
    discussion, she's the same person as the player (§0.5's identity loop),
    so her kit should be *found*, not granted, same as the player's own
    ability pickups. `_updateTetherAssist` (kept its name, now weapon-aware)
    branches per-weapon: knuckles pulls+staggers+damages (closest to the old
    tether idea, minus the no-damage rule), taser opens guards without
    pulling, flamethrower ticks small damage over ~4 hits via a new
    `pendingTicks`/`tickTimer` pair on the Child instance. Real, modest
    damage now (`enemy.takeDamage()`, the standard API) — the old "never
    out-damages you" rule is relaxed to "assist, not a DPS race."
[x] **Enemy weapon-drop pickup** — no generic loot/item-drop system existed
    anywhere in the codebase before this (only fixed ability pickups and
    healing crystals), so a minimal one was added scoped to just this: a
    small chance (`COMPANION_WEAPON_DROP_CHANCE = 0.06`) on a player melee
    kill, only once `companionState.canFight`, to spawn a `weaponDrops`
    pickup (companion.js — same array/spawn/update/draw/clear shape as
    healing.js's vitality motes) that swaps her weapon on player touch. Only
    wired at the main melee-kill site in game.js, not every kill path (boss/
    projectile/environmental kills) — acceptable for a first pass, a real
    loot-system pass should close that gap if one ever gets built.
[x] **Authored hide-spot support** — `_hideSpot()` now prefers an optional
    `area.hideSpots: [{x, y}]` array (real cover geometry) over the original
    pure-computed "farthest point along the ground from the nearest enemy"
    fallback, when a room defines one. No rooms author this data yet — that's
    a level-design task, intentionally left to the user rather than guessed
    at here (per this file's own "user is in infra phase, content is the
    real bottleneck" framing above — same logic applies to a single room's
    hand-placed hide-spot data as to enemy placement).
[x] `story.md`, `child_companion_system_plan.md` updated to match (see each
    doc's own 2026-07-27 entries) — story.md §3's Train row corrected, §2
    point 2 confirmed-built, plan doc's two resolved open questions marked,
    Phase 2 section marked superseded by the found-weapon kit.
[ ] Not built this pass, left open: forcing Train has no explicit cost yet
    (story.md §2 point 2 flags one as TBD — HP hit / delay / reluctance
    animation); no `scripted`-mode use to park her during boss phases;
    Phase 1's self-defense swipe-if-overlapped idea; the heal-stacking
    question (plan doc's open question 3); starter weapon is fixed to
    `'knuckles'` rather than randomized/chosen; drop chance and starter
    weapon are both first-guess numbers, not tuned. All verified with
    `node --check` only per the no-browser-testing rule — the actual choice-
    prompt feel, tap-threshold tuning, and in-game weapon-drop pacing all
    need a real playtest to confirm before calling this done-done.

Phase 25 — Anim frame-events, data-driven boss phases, Colossus/Warden anim
bridges, editor polish, Construct scaffold (2026-07-27, same day)
═══════════════════════════════════════════════════════════════════════════
[x] **Frame-level events on `ANIM_DEFS`** (`game/animdata.js`) — a frame can
    now carry an `events: [{type:'spawnProjectile'|'cameraShake'|'sfx', ...}]`
    array, fired once via the new `Animator.consumeFrameEvents()` the tick a
    frame is first entered (a `_frameEntered` flag prevents a multi-tick
    frame from refiring). Hitboxes also gained a `hitStun` field (was
    hardcoded to 10 at every call site before). Purely additive — a frame
    with no `events` returns `[]`, zero behavior change for existing anims.
[x] **`boss.js` consumes frame events** — `_consumeFrameEvents()` handles
    `cameraShake` (bumps the existing `screenShake`/`screenShakeIntensity`
    globals), `sfx` (calls `SFX[name]()` if it exists), and `spawnProjectile`
    (pushes into `bossProjectiles`, with an `aimAtPlayer` option that aims at
    the player's center instead of a fixed `vx`/`vy`). Only runs when the
    current `bossAnimStateKey()` has an authored `ANIM_DEFS` entry — same
    fallback contract as every other anim-bridge hook in this file.
[x] **`ColossusCore` and `TemporalWarden` (`game/enemy.js`) gained the same
    anim-driven bridge** Boss already had: an `Animator` instance,
    `getAttackHitbox()`/`getAttackDamageAndKnockback()` read authored
    hitboxes first (falling back to the hardcoded rects), and `draw()` calls
    `this.animator.draw(ctx)` instead of the procedural body/core/eye art
    when a `colossus_<state>` / `temporal_warden_<state>` key exists.
    `TemporalWarden` only wires cameraShake/sfx events (no melee hitbox or
    projectile-spawn-via-frame — its chrono bolt is still fired by
    `telegraph.timer` code, not a frame event). No new anim keys are
    authored yet for either — procedural art/hardcoded hitboxes are still
    what actually renders until someone uses `anim_editor.html` on them.
[x] **`boss.js`'s attack-selection tables pulled out into `BOSS_PHASE_CONFIG`**
    — `pickAttack()`'s old hardcoded if/else-if probability chains (per
    phase, plus the Phase 3 Stillpoint reserved slot and the flat teleport
    roll) are now a data table (`phaseThresholds`, `reservedSlot`, `teleport`,
    `phases[n].attacks` weighted lists + `preferRangedShift`/`distanceBias`
    etc.), walked by a new pure helper `resolveWeightedAttackName()`. Same
    numbers, same fall-through-to-last-entry behavior as the old chain by
    design — this is a refactor for editor access, not a balance change.
    `BOSS_CONFIG_OVERRIDES_KEY` (`localStorage`) lets a new tool merge
    overrides in per top-level key, same pattern as `animdata.js`'s
    `ANIM_OVERRIDES_KEY`.
[x] **New tool: `editor/boss_phase_editor.html`** — tunes `BOSS_PHASE_CONFIG`
    (phase health thresholds, per-phase attack weights, distance/adaptation
    bias) without touching `boss.js`. Added to `dev_hub.html`'s Combat &
    Enemies group.
[x] **`levelEditor.html` polish** — a fixed-position minimap/overview strip
    (rooms like `echo_bridge_part1` at 8547px wide made "fit whole room"
    zoom out to an unreadable sliver; the minimap gives a sense of position
    along a very wide room that a scrollbar alone doesn't) with click/drag-
    to-jump; the canvas now sizes to the room's own content and centers via
    flexbox instead of stretching to fill the viewport; zoom is now
    Ctrl/Cmd+scroll or trackpad pinch (plain scroll/swipe just pans) —
    hint text and toolbar tooltips updated to match.
[~] **`Construct` ability — scaffolding only, NOT actually implemented.**
    `input.js` added a `construct` keybind (`KeyQ`) and, to free that key,
    **reassigned Stillpoint/Graviton Surge/Void Tether from Q/E/R to
    A/S/D** (a real rebind users need to know about, not just an internal
    refactor). `ability.js` added `CONSTRUCT_COOLDOWN = 600` and
    `abilityState.hasConstruct`; `game_state.js` added a full `ABILITY_GRANTS`
    entry (popup "CONSTRUCT", notification text "hold Q to aim and build a
    construct, tap for quickfire") and wired `hasConstruct` through both
    reset paths and save/load. **None of that notification text is backed
    by real behavior yet** — there is no aim/build/quickfire logic anywhere;
    `player.js` only has a bare, likely-accidental `this.construct` (no
    assignment, does nothing) dropped into the constructor. Treat Construct
    as "keybind + flag reserved, ability unbuilt" — needs an actual design
    pass (what does it build, what does quickfire mean, is it a new entry
    in `expansion.md`'s ability roster at all) before any further code.
    Flagging rather than guessing since intent isn't recoverable from the
    diff alone. **Confirmed 2026-07-27 by the user: an abandoned experiment,
    not finished** — no design pass has happened yet, so don't build
    against this scaffolding until one does.
[x] **`game.js` split into 6 files** (2026-07-27) — it had grown to ~5972
    lines mixing camera/rendering, HUD/menu state, save/load, the
    ~2000-line `update()`, and the ~800-line `draw()`. Split into
    `game_state.js` / `game_entities.js` / `game_boot_save.js` /
    `game_update.js` / `game_hud_menus.js` / `game_draw_loop.js` (see
    `CLAUDE.md`'s Architecture map for what's in each). This is a purely
    mechanical, **order-preserving** split, not a modularization: every
    top-level statement stayed in its original relative order, so
    concatenating the 6 files reproduces the original `game.js` byte-for-
    byte (verified with `cmp`) — global-scope semantics, load-order-
    dependent side effects (canvas setup, event-listener registration, the
    closing `init(); requestAnimationFrame(gameLoop);` bootstrap) are
    unchanged. Every `<script src="game/game.js">` tag became 6 tags in the
    same position, across `index.html` and the 5 editor tools that loaded
    it (`difficulty_bot.html`, `companion_test.html`, `enemy_test.html`,
    `ability_tester.html`, `enemy_designer.html` — trailing scripts that
    used to load after `game.js`, like `agentController.js`, still load
    after all 6). `debug_v2.html`'s SFX-call-scanner test had a hardcoded
    `files` array naming `game.js` for source-text fetching — updated to
    the 6 new filenames (would have silently lost coverage otherwise,
    since its fetch is wrapped in a try/catch that skips missing files).
    `debug_v1.html`/`debug_new.html` needed no changes — they fetch
    `../index.html` live and rebase whatever script tags are actually in
    it, so they picked up the new files automatically. State is still NOT
    modularized/encapsulated (see `CLAUDE.md`) — `enemy.js`, `boss.js`
    etc. still read `game_state.js`'s globals directly by design; a real
    modularization (actual module boundaries, explicit exports) would be
    a much bigger, separate refactor.

Phase 26 — QA pass on `debug_v2.html`'s 102-check suite (2026-07-28):
the user ran the new `debug_v2.html` (72 pass, 7 warn, 20 fail, 3 skip) and
asked for the fails to be fixed. Root-caused and fixed every one via a
headless Node `vm` harness (no browser — see the hard rule at the top of
`CLAUDE.md`) that boots the real game scripts and drives them exactly like
the test tool's own `T.*` helpers, so every fix below is verified against
actual game code, not guessed at.
═══════════════════════════════════════════════════════════════════════════
[x] **R06** — `hasAbilityRequirement()` (`game_entities.js`) had no branch
    for `graviton_surge`; doors gated on it could never unlock. Added.
[x] **C16** — attacking didn't cancel an active Void Tether. `game_update.js`
    now clears `player.tether` the instant `player.attacking` goes true,
    before either pull branch runs.
[x] **C04** — Down+Jump on a one-way platform armed `dropThroughTimer`
    correctly, but the SAME jump press also fed the jump-buffer/coyote-timer
    system added in the prior session's commit — one frame later, that
    buffered jump fired for real (coyote was still full, since `grounded`
    was true at the top of the very frame the drop-through branch later set
    it false), launching the player upward instead of letting them fall.
    Fixed by zeroing `jumpBufferTimer`/`coyoteTimer` in the drop-through
    branch itself (`player.js`).
[x] **E02** — `anchor_wraith`/`deflector_drone`/`pulse_warden` (any 'hover'
    enemy that reaches ground_chase's patrol branch) drifted to NaN x.
    Root cause: `MOVEMENT_BEHAVIORS[type]?.run(...) ?? ground_chase.run(...)`
    (`enemy.js`) combines *return values*, and `run()` never returns
    anything — so `ground_chase.run()` was executing a SECOND time on top
    of every enemy's real movement, every frame, regardless of type. Its
    patrol branch multiplies by `patrolSpeed`, which a hover-flavored
    `movement` object never has → NaN, corrupting `vx` permanently. Fixed
    to pick the fallback *behavior object*, then call `.run()` once.
[x] **A11/A12 (Stillpoint) real bug**: `gameTimeScale` was computed BEFORE
    `player.update()` (which is what actually flips `stillpointActive` on
    the activation frame), so the world-slow effect lagged a full frame
    behind activation. `computeGameTimeScale()` extracted and now also
    called again immediately after `player.update()`.
[x] **A19 — Limit Break real-input activation, redesigned per user
    direction to be HOLD-activated, not release-based** (previously only
    Strength worked, on a full-charge-attack RELEASE; the other 5 abilities
    had no real input at all — roadmap Phase 17's own follow-up note).
    `ability.js` adds `LIMIT_BREAK_HOLD_THRESHOLD` (45f) and
    `LIMIT_BREAK_HOLD_TARGETS` (ability → its own cast key). `player.js`
    tracks one independent hold-timer per ability, per-frame, watching
    whether that key is STILL held — instant-cast abilities (Dash, Void
    Tether) still fire immediately on press exactly as before; continuing
    to hold the same key afterward can additionally trigger that ability's
    Limit Break once Lv5 is owned. Strength's old release-trigger removed
    (superseded — holding attack now activates Limit Break mid-charge,
    and the eventual release still fires the now-Enhanced heavy swing).
    Verified all 6 abilities activate correctly, gated properly below Lv5,
    no pip over-deduction from continued holding, no regression to any
    ability's normal (non-Lv5) behavior.
[x] **Stale test numbers from the 2026-07-27 rebalance** — the same "new
    cheap Lv1 tier inserted below every ability's old effects, thresholds
    read `oldTier() >= N` instead of the raw level" pattern broke a cluster
    of assertions that were never updated to match: A18 (Strength Lv1
    attack-cooldown: test wanted raw Lv1 = full effect, code puts full
    effect at raw Lv2+, partial at Lv1 — test now checks both), A11
    (Stillpoint deep-slow tier moved from raw Lv3 to raw Lv4), A12
    (Stillpoint's Lv1 duration test also needed the same tap/hold `pulse`
    settle-frame fix below, plus the same Lv1-partial/Lv2-full split), A04
    (Phase Dash 8-directional aim: `T.grantAll()` only sets `hasX` flags,
    never grants ability LEVELS — the test never called
    `T.level('phase_dash', N)` at all, so it silently exercised the
    un-leveled horizontal-only fallback, not the real feature), A09 (Shard
    Shot Lv3 beam: threshold moved to raw Lv4), A15/A16 (Graviton Surge:
    ball-hold moved to raw Lv3, Lv3+ detonation-damage text now correctly
    raw Lv4; A16 additionally had the test enemy drift just outside
    `GRAVITON_BALL_PULL_RADIUS` by detonation time due to its own patrol
    AI — repositioned to the ball's own spawn point with `speed = 0`).
[x] **A01/A05 — not bugs at all**: both cooldowns are armed to the exact
    constant the instant the ability fires; the failing reads happened a
    few frames later (inside `T.pulse()`'s hold/settle steps), by which
    time the cooldown had already ticked down by design — traced frame-by-
    frame to confirm. Both assertions changed from exact equality to a
    tolerance window.
[x] **U03 — not a bug**: `hudResolve()` (`game_hud_menus.js`) already
    handles the `'bottom-center'` anchor `abilityCooldowns` uses; the
    test's own anchor whitelist just never had it added.
[x] **V04 — not a bug**: `currentSaveSlot` is correctly set by the Play
    menu whenever a real player picks a slot, and every real autosave call
    site (`switchArea()`, checkpoints, etc.) uses the bare `saveGame()`
    default — always in sync in actual play. The test called
    `saveGame(0)`/`saveGame(1)` with explicit numbers but never updated
    `currentSaveSlot` in between (a sequence no real play session can
    reach), so `switchArea()`'s own internal autosave silently re-wrote
    slot 0 with the stale default. Fixed by setting `currentSaveSlot`
    alongside each explicit save, matching what the menu actually does.
[x] **H04/S01 — debug_v2.html's own bugs, not the game's**. H04:
    `window.__lsError` was only ever assigned in the sandboxing failure
    branch, so reading it on the (normal) success path threw — now
    initialized to `null` unconditionally first. S01: its regex SFX-call
    scanner can't tell a bare call from one guarded by its own existence
    check first (`enemy.js`'s `SFX.enemyHeavyLand ? SFX.enemyHeavyLand() :
    ...` never throws even though that method doesn't exist) — added a
    small allowlist for known-guarded names.
[~] **G02, R05, B03, N04, V05, I01, E01/E10** not addressed — all
    content/design gaps or already-by-design behavior per the original
    debug run's own notes (no enemies placed in any room, 2 unreachable
    rooms, lore-pip funding shortfall, uncapped particles, Limit Break/
    Stillpoint state intentionally not saved, `construct` keybind not yet
    in `REMAPPABLE_ACTIONS`), not runtime bugs — flagging rather than
    guessing at scope the user didn't ask for.

Phase 27 — Audio mixing fix, up-attack input bug, first enemy-placement pass, two new minibosses, room-geometry sample (2026-07-28):
[x] **Audio hum + music-cutting-out fixed**: `game/audio.js`'s procedural
    ambient drone (always-on, only ducked not silenced under real music)
    was the constant low-level hum reported by the user — removed
    entirely, no procedural ambience left. Music and SFX also shared one
    `DynamicsCompressor`, so overlapping SFX (jump, attack, etc.) audibly
    ducked/cut the music — split into independent `musicBus`/`sfxBus`,
    each with its own compressor, so SFX can never gate music again.
    `setAreaAmbient()` used to bail out entirely if the drone had failed
    to init, which could silently skip starting real region music too —
    that coupling is gone.
[x] **Up-attack input bug fixed**: the charge-attack system (`player.js`)
    only sampled aim direction at the instant Attack was released, not
    when it was pressed — a quick Up+Attack tap where Up comes up a beat
    early silently resolved to a forward attack instead. Now latches
    `chargeAttackDirection` the instant Up/Down is pressed during the
    hold, used at release instead of re-sampling.
[x] **3 SFX promoted from candidates to live** (`chargedAttack`,
    `phaseDash`, `stillpoint` — all CC0, see `assets/audio/sfx/CREDITS.md`).
[x] **First enemy-placement pass**: `enemies: []` was empty in every room
    (see Phase 20/roadmap's own repeated notes) — generated and applied a
    real first pass, 333 enemies across 48 rooms, region-appropriate
    rosters drawn only from `ENEMY_REGISTRY`'s 19 implemented types,
    density scaled by room width + a rough region-depth tier. Every
    placement re-validated against `validateRoomLayout()`'s reachability
    linter (71/71 rooms pass). Explicitly NOT touched: hubs, transit
    corridors, the Pacifist Region, and existing miniboss/boss arenas.
    User feedback: still too sparse and rooms themselves too small — this
    is a first draft, not final; see the Crag sample below for the next
    direction.
[x] **Two new minibosses built** (Void Expanse and Hollow Core both had no
    miniboss/no code — see `Plans/lore.md`'s "Undertow" entry and the
    Antechamber Child/Abandoned Shell conflict flag): `UNDERTOW_DEF`
    (`void_expanse_boss`, `game/enemy.js`) wired into `void_expanse_room2`;
    `ANTECHAMBER_CHILD_DEF` (`antechamber_child`) wired into `antechamber`;
    `ABANDONED_SHELL_DEF` (`abandoned_shell`) wired into `hollow_core`. All
    three are `ComposedEnemy` defs (movement/attacks/phases), not bespoke
    classes — registered in `MINIBOSS_CLASSES`, get boss music via the
    existing `SFX.setBossMusic()` pipeline with zero new engine code.
    **Canon resolved (user direction 2026-07-28)**: the Antechamber Child
    fight replaces Abandoned Shell as the sole "lost the child" consequence
    and now carries the Absorb/Spare choice + Collapse/Loop endings
    (`cutscene.js`'s new `antechamber_child_ending` script,
    `game_update.js`'s `antechamber_child` miniboss-death branch,
    `game_draw_loop.js`'s victory-screen branch on
    `storyFlags.antechamber_ending`); Abandoned Shell was relocated from
    the final door to Hollow Core and made unconditional (every playthrough
    fights her there, decoupled from the child's fate). See `story.md` §5
    and `lore.md`'s Antechamber entry for the updated narrative status,
    including a flagged (accepted) seam: her backstory was written for one
    specific loss route but now triggers for all of them.
[x] **`enemy_designer.html` extended** to actually support building bosses
    like the three above: `STAT_UI` gained width/height/shield fields, plus
    a new "Boss Mode" section (phase toggle, face-tangible, spawn-on-start,
    and a real multi-phase list editor with statMultiplier fields + a raw-
    JSON box for attacks/movement/flags/spawn overrides) — previously all
    runtime-only, editable exclusively by hand-editing exported JSON.
[x] **Room-geometry redesign sample**: user feedback that rooms are
    "physically too small, gonna be bigger and more cavelike" — redid
    `crag_entrance` as a concrete sample (1286→2300 wide, 793→1400 tall,
    a jump-crossable floor rift plus a raised cave ledge instead of one
    flat floor), sized against the room linter's own reachability math so
    it's bigger without becoming a dash-only gauntlet. Only this one room
    — the rest of Crag (breach/altar/warden) awaits approval of the
    direction before following through, given the coupling cost of
    resizing rooms whose doors/anchors/enemies all have to move together.
[x] **Regression found and fixed same-session**: the enemy-placement
    generator script did `src.replace('const AREAS', 'global.AREAS')` on a
    copy of `area.js` for its own Node-side analysis, then accidentally
    wrote that mutated string back out as the real file — `global` doesn't
    exist in a browser, so `area.js` threw immediately on load, which
    silently blanked both `index.html` and `levelEditor.html` (everything
    downstream of `area.js`'s `<script>` tag never ran). Diagnosed by
    simulating the full `index.html` script-load order in a Node `vm`
    context with browser-global stubs (catches exactly this class of bug
    without opening a browser, per this file's hard rule) — fixed, full
    load order now verified clean end to end.

Phase 28 — Pip vision modes: overlay/cutscene/none, editor support (2026-07-29):
[x] **`loreFragments[]` entries gained a `mode` field** (`'overlay'` default /
    `'cutscene'` / `'none'`), replacing the single hardcoded `lorePipEffect`
    vignette every pip used to play unconditionally. `game/game_update.js`'s
    pip-pickup block (~line 1972) now branches: `'overlay'` (or missing
    `mode`, so every existing pip in `area.js` keeps behaving exactly as
    before) plays the same amber vignette; `'cutscene'` calls
    `playCutscene(lf.cutsceneId)` instead (a real `cutscene.js` script,
    same mechanism `echo_bridge_intro`/`antechamber_child_ending` already
    use); `'none'` plays no visual effect at all — just banks toward the
    lore-pip economy, silently. This is the code-side half of
    `regions.md`'s "Extra/Customization Pips" section (15 more pips with no
    vision, for player-chosen customization spend) — that doc's proposal is
    now buildable without new engine work, just setting `mode:'none'` on
    those pip entries once rooms are designed.
[x] **`game/game_entities.js`'s `drawLoreFragment()`** now color-codes by
    `mode` — `'none'` pips render slate (`#94a3b8`) instead of amber, and
    `'cutscene'` pips get a thin outer ring, so a pip's kind reads visually
    in-game without needing a HUD label (keeps `CLAUDE.md`'s "no boxed HUD
    panels" rule).
[x] **`editor/levelEditor.html`** — the Lore Pip side panel gained a
    `vision` dropdown (Overlay/Cutscene/None). Picking Cutscene reveals a
    `cutsceneId` field with a `<datalist>` autocomplete sourced from a real
    `CUTSCENES` object — `game/cutscene.js` is now loaded by the editor
    (previously only `physics.js`/`area.js`/`enemy.js` were) purely for this
    read-only lookup, verified side-effect-free to load standalone (defines
    `CUTSCENES`/`playCutscene`/`storyFlags` and returns — no top-level call).
    Picking None hides the flavor-text field entirely (nothing to write for
    a pip with no vision) and shows a one-line hint instead. Canvas
    placement/selection color-coding matches the in-game draw. New pips
    placed via the toolbar default to `mode:'overlay'` (unchanged behavior).
    Existing wiring (paste-clone, delete, layer buttons, search list) needed
    no changes — they already operate generically on whatever fields a
    `loreFragments` entry happens to carry.
[ ] **Not done this pass**: no existing `area.js` pip entries were converted
    to `'none'`/`'cutscene'` — this phase is the plumbing only. Placing the
    actual 15 extra/customization pips and any new plot-critical cutscene
    pips per `regions.md`'s table is still open level-design work, same
    "built but not level-designed" gap as everything else pending a real
    room-design pass (see `Plans/room_design_bible.md`, added this same
    session, for the full per-region reference to design against).
[x] **`Plans/room_design_bible.md` added**: one reference doc, organized
    per-region, for the actual hand-level-design pass — a code-derived
    room table per region (size/connections/enemies/pips, regenerable via
    a documented `vm`-based Node one-liner, same technique
    `room_progress.js` uses) plus each region's mechanic/miniboss/local-
    tragedy/Hunt-thread one-liner and hazard/puzzle ideas, cross-referenced
    back to `floor_plan.md`/`regions.md`/`lore.md`/`expansion.md`/
    `story.md` rather than duplicating them. Includes research-sourced
    notes on Metroidvania room design (Boss Keys' framework, Hollow
    Knight's own stated design choices, dedicated-2D-editor layer-thinking)
    and full built-enemy (19)/built-miniboss (14) roster references plus
    current pip-economy counts. `Plans/CLAUDE.md`'s doc list updated to
    point at it.
[x] **`Plans/room_scene_editor_plan.md` added** (planning only, not built):
    a proposed room "look" editor — background PNG/parallax layers (new
    capability; every room's backdrop is 100% procedural canvas primitives
    today, see `drawAreaBackdrop()`), the previously-planned
    `level_designer.html`'s `REGION_STYLES`-tuning scope absorbed as one
    panel rather than built as a separate tool, and a visual
    cutscene-trigger placement UI (today's 3 cutscene triggers are all
    hardcoded `if` conditions in `game_update.js`/`game_entities.js`, not
    data-driven — flagged as the concrete gap this closes). Proposes
    reusing `game/animImageStore.js`'s IndexedDB pattern (a sibling
    `roomImageStore.js`) for the new background images, to avoid re-
    hitting the `localStorage` quota bug that pattern already fixed once.
    Research-backed (Tiled/LDtk/Ogmo/GameMaker layer models, parallax
    practice, cutscene-tool conventions — sources listed in the doc).
    `Plans/CLAUDE.md`'s `level_designer.html` entry updated to point at
    this doc's superseding proposal. Has open questions for the user
    before any of it gets built (see the doc's own §7) — not started.
[x] **`Plans/production_workflow_and_tool_gaps.md` added**: audits the
    full editor suite (every tool in `editor/` + the `Plans/*.html`
    analysis pages) against what's actually needed to finish the game,
    split into closeable-by-tooling gaps (the room verification bot-walker,
    a Project Progress Dashboard) vs. inherently-creative work no tool
    removes (hazard/puzzle design content, cutscene writing, art, fun/
    pacing playtesting). Research-backed (how Team Cherry actually built
    Hollow Knight, general greybox-then-art indie practice, narrative/QA/
    audio-middleware pipeline norms) into a recommended region-by-region
    production order (not discipline-by-discipline game-wide), matched to
    this project's actual state — systems/scaffolding already built, so
    the remaining work is a content pass, not green-field production.
[x] **`Plans/room_verification_tool_plan.md` gained a third component, the
    "Spawn" button** (direct request): a dev-only `?spawnRoom=<id>` query-
    param harness that overrides `init()`'s hardcoded `currentAreaId`/
    `gameState`, grants a requested ability loadout (`all` or a room's own
    declared `expectedLoadout.onEntry` tier), and drops the player straight
    into any real room to inspect by hand — no save-slot interaction at
    all, same "never touch real save data from a dev tool" rule
    `enemy_test.html`/`companion_test.html` already follow. Explicitly the
    manual follow-up to the bot walker's automated report, not a
    replacement for it — reachable from either report's per-room rows, and
    eventually from the Project Progress Dashboard below too.
[x] **`Plans/project_progress_dashboard_plan.md` added**: plans extending
    `dev_hub.html`'s existing (thin) `renderStats()`/`runAllValidations()`
    panels into a full "what's left" dashboard — room design-state, all 3
    pip types placed-vs-target, enemy/miniboss roster coverage, and
    anim-authored-vs-procedural coverage — reusing data the page already
    loads live rather than cross-referencing `room_progress.js`/
    `room_design_bible.md`/`anim_editor.html` by hand. Flags a real gotcha
    before building (`game_state.js`'s unconditional
    `document.getElementById('game').getContext('2d')` at file-top would
    throw if included without a `<canvas id="game">` present, needed to
    reach `MINIBOSS_CLASSES`) and recommends extracting
    `room_progress.js`'s scoring function into a shared file both it and
    the dashboard include, instead of two copies drifting apart.
[x] **`Plans/cutscene_editor_plan.md` added** (direct request, planning
    only): a structured list-and-form editor over `cutscene.js`'s already-
    fully-specified `CUTSCENES` step format — deliberately not a timeline/
    node-graph UI (researched how other engines handle branching
    cutscenes; a typed step list already fits this project's format
    better than a graph would). Recommends the same sandboxed real-game-
    iframe preview `debug_v1.html` already uses, and a safe-preset-plus-
    raw-code-escape-hatch split for `call` steps (arbitrary JS), matching
    `enemy_designer.html`'s existing pattern for anything its guided UI
    can't cover. Complements (doesn't overlap) `room_scene_editor_plan.md`'s
    cutscene-trigger placement — that plans *where*, this plans *what's in
    it*. `Plans/production_workflow_and_tool_gaps.md`'s gap table and
    `Plans/CLAUDE.md`'s doc list both updated to point at it.
[~] **`Plans/room_verification_tool_plan.md` — Components 1 and 3 built**
    (Component 2, the dynamic bot walker, still not started). New shared
    pure module `game/roomVerify.js` implements the static layout linter:
    a reachability flood-fill from every anchor/transition using real
    jump/fall/dash/phase-dash kinematics (`GRAVITY`/`JUMP_FORCE`/
    `MOVE_SPEED`/`DASH_SPEED`/`DASH_DURATION`/`PHASE_DASH_SPEED`/
    `PHASE_DASH_DURATION`, not guessed ranges) rather than reimplementing
    `validateAreaGraph()`'s own connection-record checks; a `FLOOR_GAP`
    check for continuous-cave-floor rooms (no `pitDeathY` override) —
    the exact pit-death-mismatch bug class that motivated the plan doc;
    a `DOOR_EMBEDDED` check against the player's actual standing hitbox
    at a transition, not the door rect itself, upgrading `debug_v1.html`'s
    R11/`dev_hub.html`'s embedded-door AABB check; and an `ONE_SIDED_DOOR`
    check verifying physical `transitions[]` doors exist both directions
    for every non-`oneWay` `connections[]` entry (extends
    `validateAreaGraph()`'s own symmetry check, which only verifies the
    declared record). Runs against all 71 real rooms clean (69 pass, 2
    warnings-only, 0 failing) — verified via `Plans/room_verify_cli.js`
    (`node Plans/room_verify_cli.js [--full]`, mirrors `room_progress.js`'s
    vm-load-area.js pattern) and a synthetic bad-room fixture exercising
    every check type. New `editor/room_verify.html` runs the same module
    live against the real `AREAS` (loads `physics.js`/`attackVFX.js`/
    `area.js`/`ability.js`/`player.js` for the real physics constants,
    same "load the real code" principle every other editor in this family
    follows), registered in `dev_hub.html`'s Level Design tool group.
    Component 3 (the Spawn button) is a new `applyDevSpawnOverride()` in
    `game_boot_save.js`, called once right after `init()` in
    `game_draw_loop.js`'s bootstrap line: reads `?spawnRoom=<id>&loadout=
    all|none|comma,list` from the URL (no-op otherwise), lands the player
    at the room's first anchor via the same `nudgeOutOfPlatforms()` spawn-
    safety call `switchArea()` uses, grants the requested `ABILITY_GRANTS`
    loadout (default `all`), and flips `gameState` to `'playing'` —
    deliberately does **not** call `switchArea()` itself, since that
    function calls `saveGame()` and this harness must never touch real
    save data (same rule `enemy_test.html`/`companion_test.html` already
    follow). Wired as a "Spawn →" link on every room row in
    `room_verify.html`. Static-linter false positives are expected and
    intentional at the platform-reachability granularity — flagged as
    `warn`, not `error` (only unreachable *placed content*, floor gaps,
    embedded doors, and one-sided doors fail a room) — because a coarse
    per-hop physics envelope can't fully model chained jump sequences or
    ability-gated secrets; the two warnings on the real data
    (`crag_entrance`, `event_horizon_core`) are exactly this class, not
    real bugs, on a region already noted above as live-verified. This is
    the reason Component 2's dynamic bot walker remains valuable future
    work rather than redundant with Component 1.
[x] **`Plans/project_progress_dashboard_plan.md` — v1 built** (extends
    `dev_hub.html`, no new tool, per the plan's own §0 framing). Prerequisite
    refactor from the plan's §2 done first: `room_progress.js`'s `analyze()`
    scoring logic extracted into a shared, pure `game/roomDesignScore.js`
    (`analyzeRoomDesignState()`), which both the Node CLI and the new panel
    now call — no more two copies of "what counts as designed" that can
    drift apart. The plan's flagged miniboss-registry gotcha (`MINIBOSS_CLASSES`
    living in `game_state.js`, which does an unconditional
    `document.getElementById('game').getContext('2d')` at its top and would
    throw in a page with no `<canvas id="game">`) was resolved by NOT
    including `game_state.js` at all: new `game/minibossRegistry.js` is a
    small standalone id→display-name table mirroring `MINIBOSS_CLASSES`'
    keys only, hand-maintained (flagged in its own header comment, same
    caveat class as `hud_editor.html`'s `DEFAULTS` table). `dev_hub.html`'s
    old 3-card Quick Stats row is now 8 cards (rooms started+designed/total
    with a progress bar, Fracture Pips, Lore Fragments, Extra/Customization
    Pips, Cosmetic Upgrades, Enemies Built, Minibosses Built, Enemies w/
    Authored Anim), plus a new collapsible "Progress by Region" table (one
    row per region with real rooms, sorted by room count) — click a row to
    open its first room in `levelEditor.html`, same click-through pattern
    `runAllValidations()`'s failing-room rows already use. **Corrected
    2026-07-29, same session**: the first build of this panel wrongly
    reported Lore vs. Extra/Customization Pips as "not implemented" —
    a grep for `"mode *:"` in `area.js` missed the real mechanism entirely,
    and `regions.md`'s stale line was trusted over `room_design_bible.md`'s
    correct one ("Code support for all 3 modes shipped roadmap.md Phase 28,
    2026-07-29"). The split is fully live and built: `game_update.js`'s
    lore-pip pickup handler and `levelEditor.html`'s pip inspector both
    already branch on `loreFragments[].mode` (`'overlay'`/`'cutscene'` = Lore
    Pip, `'none'` = Extra/Customization Pip, unset defaults to `'overlay'`),
    including correctly skipping both the cutscene call and the placeholder
    vignette for `mode:'none'` pips, and `drawLoreFragment()`/
    `levelEditor.html`'s canvas render Extra pips in slate instead of amber
    so they're visually distinct. The dashboard now reads the real `mode`
    field live: 18/15 Lore Pips, 0/15 Extra Pips — 0 only because no room
    has placed a `mode:'none'` pip yet, not because the field is missing.
    `cosmeticUpgrades` (7, a separate rare/cosmetic-only mechanic, against a
    proposed ~4 "one per cluster" target) stays its own row, unrelated to
    the Lore/Extra split. The per-region
    "mechanical effect built?" flag (the plan's §5 open question) went with
    the hardcoded-table option, not a new `area.js` field — fastest to
    ship, flagged in a code comment as hand-maintained. Verified end-to-end
    with a `vm`-sandboxed DOM-stub harness (no browser opened, per this
    repo's standing rule) exercising the real `computeProgress()`/
    `renderStats()`/`renderRegionRollup()` functions against the live
    `area.js`/`enemy.js`/`animdata.js` data — numbers cross-checked against
    `node Plans/room_progress.js`'s own output (71 real rooms, 47
    started+designed, 24 SHELL) and match. **v2 (per-room drill-down with
    Spawn-button links, the "suggested next" heuristic line) not built** —
    deferred per the plan's own scope staging.
[x] **`Plans/room_scene_editor_plan.md` — v1 built, 2026-07-29.** New
    `editor/room_scene_editor.html`, registered in `dev_hub.html`'s Level
    Design group. Confirmed two open questions with the user before
    building (the plan's §7): fold the never-built `level_designer.html`'s
    REGION_STYLES scope in as one panel (yes), and whether custom
    background art should always layer additively on the procedural
    backdrop or be able to fully replace it (added a per-room
    `hideProceduralBackdrop` toggle rather than additive-only). Ships:
    `area.backdropLayers[]` (parallaxX/Y, x/y offset, scale, repeat
    none/x/both, tint, opacity, per-layer hidden) rendered by
    `drawAreaBackdrop()` in `game_entities.js` before the original
    procedural deep/mid nebula layers (skipped entirely when
    `hideProceduralBackdrop` is set) — the first real image-rendering
    capability for room backdrops; every room's "look" was 100% procedural
    canvas primitives before this. `REGION_STYLES` (mirror_veil/
    event_horizon/chrono_rift) gained tunable numeric knobs
    (`diamondSpacing`, `ringCount`+`ringSpacing`, `spokeCount`) alongside
    the existing primary/secondary/glow colors, both editable live.
    Uploaded images go through a new `game/roomImageStore.js` (IndexedDB,
    literally the same shape as `game/animImageStore.js` — same quota
    problem, same fix). **The center preview boots the real game, not an
    approximation**: a sandboxed iframe loads `../index.html` via the same
    fetch+srcdoc+path-rewrite technique `debug_v1.html`'s `loadSandbox()`
    already uses, room selection goes through a new
    `window.__editorSpawnRoom` global (added to `applyDevSpawnOverride()`
    in `game_boot_save.js` alongside the existing `?spawnRoom=` URL param,
    since a srcdoc document's `location` is always `about:srcdoc` with no
    query string for the URL param to reach), and every property edit
    writes directly into the running iframe's
    `win.AREAS[roomId]`/`win.REGION_STYLES[region]` — genuinely instant,
    no reload, because `draw()`/`update()` already read `getCurrentArea()`
    fresh every frame (confirmed via `game_state.js`'s `getCurrentArea()`
    and the draw-loop call sites). The parallax-preview scrubber drags the
    real `player.x` through the room rather than faking a camera offset,
    so the actual camera-follow logic in `update()` produces the motion —
    the one interaction unique to this tool, since a static frame can't
    show relative parallax speed. Non-destructive paste-ready JS export,
    plus "Save to Browser (Live)" for both the room
    (`stillpoint_area_overrides_v1`, the same key `levelEditor.html`
    already writes) and the region style (new
    `stillpoint_region_style_overrides_v1` key) — same live-override
    convention every editor in this family uses. Undo/redo is a
    clone-based history stack over `{area, currentStyle}` together, same
    pattern as `levelEditor.html`'s own. **Not built (v2, per the plan's
    own scope staging)**: `cutsceneTriggers[]` placement UI, the
    `decorationSprites[]` scattered-decal layer, ambient one-shot SFX
    trigger zones, and the live camera-bounds overlay from the plan's
    §6.5 addendum. Not tested in a browser per this repo's standing rule —
    verified via `node --check` on every changed/new file plus manual
    read-through of the live-mutation data flow; a first real editing
    session should confirm the srcdoc sandbox behaves the same way it
    already does for `debug_v1.html` in this environment.
[x] **`Plans/room_scene_editor_plan.md` — v2 (cutsceneTriggers[]) built,
    same session, 2026-07-29.** `area.cutsceneTriggers[]` is now a real,
    data-driven replacement for what used to only be hardcoded `if`
    conditions in `game_update.js`/`game_entities.js` for "does a plot
    beat fire here" — those 3 existing hardcoded call sites (
    `echo_bridge_intro`, `child_first_fight_choice`,
    `antechamber_child_ending`) are untouched, this is purely additive.
    Shape: `{id, x, y, w, h, cutsceneId, storyFlag, triggerType:
    'enter'|'onRoomLoad'}`. Real runtime wiring in two places:
    `switchArea()` (`game_entities.js`) fires the first matching
    `onRoomLoad` trigger for the room just entered (gated on `storyFlag`,
    same convention the hardcoded checks already use — skip once the
    cutscene's own `setFlag` step has run); `update()` (`game_update.js`)
    checks `'enter'`-type zones every frame against the player's rect via
    the same `rectsOverlap()` the transitions loop already uses, right
    after that loop. A new `firedTriggersThisVisit` Set (declared in
    `game_state.js`, reset in `switchArea()` and in
    `applyDevSpawnOverride()` — the dev-spawn harness bypasses
    `switchArea()` entirely, so it needed its own reset, and deliberately
    does NOT auto-fire `onRoomLoad` triggers, since a "spawn straight into
    this room" debug harness shouldn't force-start whatever cutscene
    happens to be gated there) debounces same-visit re-firing for a
    trigger whose author forgot to `setFlag` a matching gate — verified
    with standalone logic unit tests (fire-once, storyFlag-gate,
    same-visit-debounce, correctly-refires-on-a-later-visit-with-no-flag)
    since a full game boot wasn't practical to stand up in this pass.
    Editor side (`editor/room_scene_editor.html`): a new left-panel
    trigger list (click to select + jump the parallax scrubber to the
    zone's world x), a `cutsceneId` field autocompleted from the real
    `CUTSCENES` (now also loading `game/cutscene.js`, same `<datalist>`
    pattern `levelEditor.html`'s Lore Pip panel already uses), a
    `storyFlag` field with a live hint that recursively scans every
    `CUTSCENES` script — including inside `choice` branches — for a
    matching `setFlag` step (catches a typo'd flag that would otherwise
    silently never actually gate anything), and a "▶ Test Cutscene"
    button calling `win.playCutscene()` directly. The zone rectangle
    itself draws/drags/resizes on a new transparent
    `<canvas id="trigger-overlay">` stacked on top of the preview iframe
    (not inside it — trigger zones are invisible in real gameplay by
    design) — a small `requestAnimationFrame` loop mirrors the iframe's
    live `win.camera` every tick and converts each zone from world to
    screen space with the exact transform `applyCamera()` uses
    (`screen = (world - camera) * zoom`), so the rectangles track
    correctly while the parallax scrubber moves the camera around.
    **Still deferred** (lower-value/lower-urgency items from the plan's
    §6.5 addendum, not part of this pass): the `decorationSprites[]`
    scattered-decal layer and the live camera-bounds overlay. Ambient
    one-shot SFX trigger zones were left out on purpose, not as an
    oversight — `game/audio.js`'s `SAMPLE_URLS` table is combat-impact
    sounds only (attack/hit/hurt/parry/etc.); there's no existing library
    of positional ambient one-shots (a distant clang, a dripping echo) to
    point a `sampleId` field at, so that item needs new audio assets
    sourced first, which is a content task, not a code continuation of
    this one.
[x] **`Plans/cutscene_editor_plan.md` — v1 built, 2026-07-30.** A structured
    list-and-form editor (`editor/cutscene_editor.html` +
    `cutscene_editor.js`) over `cutscene.js`'s `CUTSCENES` step format —
    deliberately not a timeline/node-graph UI, per the plan's own research
    into branching-cutscene tooling patterns (§1). Left panel: the real
    `CUTSCENES` keys (add/rename/delete, working-set only — see below).
    Center: an ordered, numbered step list with ▲▼ reorder and delete per
    row; a `choice` step's row recursively renders its `onA`/`onB`
    sub-lists indented inline (arbitrary nesting depth, not just one level).
    Right: a per-type property form (`wait`/`text`/`cameraPan`/
    `cameraReturn`/`movePlayer`/`setFlag`/`call`/`choice`, all 8 — v1 was
    staged for the first 6 only, but `choice` authoring turned out cheap
    enough to include immediately since 3 of the 4 real cutscenes use it
    and a tool that can't display them wouldn't be usable on day one).
    `setFlag` gets a flag-name datalist from a static `KNOWN_STORY_FLAGS`
    snapshot (grepped `storyFlags\.\w+`/`storyFlags\[` across `game/*.js`
    once, not live-computed, per the plan's own guidance). `call` steps use
    the safe-preset-library-plus-raw-code-escape-hatch split
    `enemy_designer.html` already established (plan §3): 3 presets (grant
    ability, set companion active/canFight, increment Fracture max) as
    parameterized templates, plus a `⚠ raw code — no guardrails` textarea
    for anything else. **Preview is the plan's §7-recommended cheap
    version, not the real-game iframe** (explicitly staged for v2 in the
    plan) — a static mocked walkthrough overlay (letterbox-styled Prev/Next
    cards; a `choice` step pauses and lets you pick which branch to walk
    into) good enough to sanity-check pacing/branching without booting a
    sandboxed game instance. `cameraPan`/`movePlayer` get a genuinely real
    "pick on canvas" instead of typing coordinates blind — a schematic
    canvas draws the real platform extents of any chosen room (from the
    live `AREAS` data) to scale, click sets x/y — cheaper than the plan's
    live-iframe click-to-place idea but solves the same "don't type room
    coordinates blind" problem.
    **Data model note (the one real gotcha this session hit)**: a `call`
    step's `fn` is a live JS function — neither `structuredClone` (throws
    on functions) nor JSON (silently drops them) can touch it, so the
    working/undo-history clone helper can't be the same generic one used
    for everything else. Working steps instead always carry a JSON-safe
    `_callCode` source string (`fn.toString()` on import, or built from a
    preset's template), with a dedicated `deepCloneStepsKeepingFn()` used
    only at import time (shares the function reference — never mutates it
    — instead of cloning it) before immediately stripping `fn` down to
    `_callCode`. `cutscene.js` gained a matching `materializeCallSteps()` +
    `applyCutsceneOverrides()` (new `stillpoint_cutscene_overrides_v1`
    localStorage key, same live-override pattern `animdata.js`'s
    `ANIM_OVERRIDES_KEY` already uses) that rebuilds a real `fn` from
    `_callCode` via `new Function(...)` when a saved override loads —
    applies in `index.html` and every other tool that already loads
    `cutscene.js`, no reload dance needed beyond that one page load.
    Non-destructive "Export Paste-Ready JS" per selected cutscene, plus
    "Save to Browser (Live)". Wired into `dev_hub.html` (Level Design
    group, `currentCutsceneId`/`?cutscene=` deep-link, same convention as
    every other tool) and its Live Overrides panel. Styled with the shared
    `styles/design-system.css` per `Plans/editor_design_style_guide.md`
    (ambient blobs, `ds-topbar`/`ds-sidebar`/`ds-btn`/`ds-input` etc.), same
    as `room_scene_editor.html`. **Not tested in a browser**, per this
    repo's standing rule — verified with `node --check` on both new/changed
    files and a manual read-through of the clone/override/export data flow;
    a first real editing session should confirm the step-tree
    add/reorder/delete/branch-jump interactions feel right in practice.
    **Deferred to v2, unchanged from the plan**: the real-game-iframe
    preview (§4) and growing the `call` preset library only if new patterns
    actually show up in practice (§3/§6). Deleting a cutscene only removes
    it from this editor's working set/Live override, not a built-in
    `CUTSCENES` entry in `cutscene.js` itself — deleting real source content
    still means editing the file.
    **UI polish pass, same day**: the first cut had a real gap —
    every button was a bare unstyled `<button>` (no `ds-btn` class),
    inputs/selects/textareas weren't wired to `ds-input`/`ds-select`/
    `ds-textarea`, and step-type tags were a hand-rolled pill instead of
    `ds-badge`. Fixed across both the static HTML and every
    dynamically-generated form/row in `cutscene_editor.js` (the `field()`
    helper now auto-injects the right input class via regex so future
    fields can't forget it). Step-type badges are now color-coded for
    scannability (camera/move = accent, `setFlag` = ok, `call` = warn —
    it's still the escape-hatch step even preset-built, `choice` = teal,
    `text` = info) — a scannability aid, not a reuse of the pass/fail
    semantic vocabulary. Per `editor_redesign.md`'s "Bold Factor" signature
    elements (mouse-tracking spotlight, precision micro-interactions), the
    mocked-preview modal — the one true top-level card in this tool, not a
    per-row list — got a cursor-tracking spotlight and a quick fade+scale-in
    entrance (reduced-motion collapses this to an instant show, same global
    guard every other tool already gets from `design-system.css`'s
    `prefers-reduced-motion` block).

[x] **Visual variants system — built, 2026-08-01.** Came up in conversation:
    hazards always rendered as identical red spikes regardless of region —
    not a tracked gap in `Plans/production_workflow_and_tool_gaps.md`, just
    noticed live. Built as a generalized resolver rather than a one-off fix,
    since "functionally identical, cosmetically different" recurs (region-
    flavored enemies being the other obvious case). New `game/visualVariants.js`:
    `getVisualVariant(category, region, instanceOverride)` — instance override
    beats a `REGION_STYLES[region][category+'Variant']` entry beats `null`
    ("caller keeps its current default," so every unstyled region/instance is
    byte-for-byte unchanged). Two call sites wired: `drawPlatform()`'s hazard
    branch (`game_entities.js`) now calls `getHazardStyle(region,
    plat.hazardVariant)` — a styled region (mirror_veil/event_horizon/
    chrono_rift) gets a derived tint from its existing `primary`/`secondary`
    for free, no new colors invented; an unstyled region gets the exact old
    red. `spawnAreaEnemies()` resolves an optional tint per enemy — `eDef.tint`
    (new per-placement field, editable in `levelEditor.html`'s enemy
    inspector, a plain hex-text input next to the type dropdown) beats
    `REGION_STYLES[region].enemyVariant` beats no-op. Wired into both
    `ComposedEnemy` (already had `this.color`) and the legacy base `Enemy`
    class (`Fractured`'s hardcoded inline `#f87171` pulled into a
    `this.bodyColor` field, same convention). Verified without a browser per
    this repo's standing rule: `node --check` on every touched file, a
    standalone Node test of the resolver's priority chain (6 assertions —
    instance/region/null-fallback × hazard/enemy), and a full
    `node Plans/room_verify_cli.js` re-run confirming the exact same
    69-clean/2-warnings-only/0-failing result across all 71 rooms (none have
    opted into a variant yet, so this is provably zero-regression). Script
    tag added to `index.html` plus the 5 other tools that load
    `game_entities.js` directly (`difficulty_bot.html`, `companion_test.html`,
    `enemy_designer.html`, `enemy_test.html`, `ability_tester.html`);
    `debug_v1.html`/`debug_new.html`/`room_scene_editor.html` inherit it for
    free since they fetch and srcdoc `index.html` rather than loading their
    own script list. `drawPlatform()` also guards with
    `typeof getHazardStyle === 'function'` so a tool that somehow doesn't
    load `visualVariants.js` degrades to the old hardcoded red instead of
    throwing. **Not built this pass**: an authoring UI for
    `hazardVariant`/`enemyVariant` themselves (hand-edit `REGION_STYLES` in
    `game_entities.js` for now, same as `primary`/`secondary`/`glow` already
    require — a natural small follow-up for `room_scene_editor.html`'s
    region-style panel); shape/silhouette variants (color only, this pass);
    and applying the resolver to any category beyond hazards/enemies (it's
    generic — `getVisualVariant('destructible', region, ...)` works today —
    but no draw call site reads it yet; add on real need, not speculatively).
    See `Plans/production_workflow_and_tool_gaps.md` §1a for the full writeup.
