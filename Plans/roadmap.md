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
  - No charms/badge system — explicitly rejected. Keep Stillpoint's own identity
    (time-fracture + dashes + Stillpoint), borrow only structural lessons from
    metroidvanias, not mechanics.
  - No boxed HUD panels (e.g. the old ability-icon boxes). Prefers minimal,
    in-world feedback (rings around the player, glyphs) over persistent panels.
  - Browser/canvas is the agreed platform — no engine rewrite. An Electron/Tauri
    wrap is the agreed path later if an offline/desktop build is wanted.
  - Lore is temporarily OFF (LORE_ENABLED = false in game.js). Wants it redone
    as environmental storytelling (visual/world detail) instead of text popups
    before re-enabling. Data + code paths are intentionally left intact.

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

─────────────────────────────────────────────────────────────────────────────
EXPLICITLY OUT OF SCOPE (by user request)
─────────────────────────────────────────────────────────────────────────────
  - Charms / badge system
  - Geo/shop economy as a main progression gate (5.3 stays minimal/optional)
  - Procedural generation — all rooms hand-crafted
  - Multiplayer / online features

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
[ ] Room verification tool — planned, not built. See
    `Plans/room_verification_tool_plan.md` for the full design (a headless
    bot-driven room walker + static layout linter, meant to catch exactly
    the class of bug found in Crag above — unreachable platforms, pits with
    no safety net, doors embedded in solid geometry — before a human ever
    plays the room).
[x] worldmap.html — a real, git-committed, self-contained diagram tool
    (distinct from the Artifact shown mid-session, which only lived in that
    chat) generating the same graph from live `area.js` data plus a
    hand-maintained `PLANNED_REGIONS` list for the 12 unbuilt regions. Lives
    at the repo root alongside `debug_v1.html`/`levelEditor.html`.

NEXT SESSION SHOULD:
  - Doors still render as a floating trigger box, not a natural cave-mouth
    passage — the "invisible door" visual request from this session's
    feedback is not done, only the fall-death/gap-closing part is. That's a
    rendering change to game.js's transition-drawing code, touching every
    region, not just Crag — worth its own pass rather than bolting onto the
    next task.
  - Build the room verification tool per Plans/room_verification_tool_plan.md
    before the next region ships — it would have caught 3 of the 4 bugs
    found this session automatically instead of by hand.
  - ~~Decide whether to fix the King's stuck-deathTimer/victory bug~~ —
    DONE, fixed in game.js (gate on `boss` alone; see the Phase 7 note above).
  - When any of the 12 planned regions actually gets built, use the
    cross-link pattern from expansion.md §3.13b, not just a single parent
    edge — that's the whole point of this session's interconnectedness fix.
