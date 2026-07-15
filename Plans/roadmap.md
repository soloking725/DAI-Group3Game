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
[ ] 2.1 Pit Avoidance (extend to all enemy types)
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
[ ] 3.1 Parry Mechanic (Boss)
[ ] 3.2 Repulsion Field
[ ] 3.3 Double Stillpoint Lunge
[ ] 3.4 Phase 3 — Desperation Mode
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
[ ] 5.1 Input Remapping Menu
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

[ ] 5.3 Currency System (Fractured Essence)
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

NEXT SESSION SHOULD:
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
    attach to `window`. Fix would be adding `window.AREAS = AREAS;` (or
    similar) at the bottom of area.js, or having debug_v1.html read AREAS
    some other way — not done this session since it's a debug-tool-only
    issue, not a gameplay bug.
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

NEXT SESSION SHOULD (updated after Phase 10 — see that section for detail):
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
    The Polar Shift). Not implemented anywhere in code; newer conceptually
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
    built (Phase Dash, Shard Shot) rather than the unbuilt Graviton Surge:
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
[ ] NOT done: no existing room actually uses `roomHeight` yet (all 27 stay
    on the groundY+100 fallback) — this phase only builds the capability.
    Building an actual deep/tall room to prove it out in real gameplay
    (not just the editor/Node-linter level) is still open.

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
