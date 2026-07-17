# Child Companion System — Plan (not built)

Status: **planning only.** Revised 2026-07-16 (same day as v1) per user
direction: the Child follows you **like Neva** — a real, physically present
companion you grow attached to, not a leash-teleporting ghost (v1 of this
doc recommended no real locomotion; that recommendation is **overruled and
withdrawn**). Combat is part of her kit: she either fights alongside you or
hides and heals you.

Cross-check against `story.md` (narrative source of truth for the Child)
and `CLAUDE.md`'s confirmation that no companion code exists yet (only an
unrelated `child`/`childDef` var in `enemy.js`'s `ComposedEnemy`
split-on-death logic — do not confuse the two).

## Why this is the highest-priority structural gap

The Child is a mandatory story beat (Echo Bridge) and the game's central
irreversible choice (`child_choice_resolved`, keep-her vs. Void Tether).
Right now she exists only as dialogue/flags. If you keep her, she travels
with you for the rest of the game — she needs real code before that branch
means anything.

## Design pillars (Neva as the reference)

What makes Neva's companion work, translated to Stillpoint:

1. **She is physically real.** She runs, jumps, hesitates at gaps, catches
   up. You see her *effort*. (Neva's companion has real locomotion with an
   invisible teleport failsafe — so does this plan.)
2. **She grows.** Neva's arc is baby wolf → grown wolf that fights beside
   you. Stillpoint's mirror: she starts scared (hides during combat, heals
   you after) and — per story.md's own line, "unless you teach her to
   fight" — later **learns to fight alongside you**. This resolves the
   user's "either she fights or she hides and heals" as a *progression*,
   not an either/or: **both, in sequence.** Early game: hide-and-heal.
   After a story beat (teaching scene / mid-game trigger): fights.
3. **You interact with her, not just near her.** A call button, her calling
   *you* when scared, idle behaviors (she looks at lore spots, sits at
   anchors with you, flinches at boss roars). These are cheap procedural
   animations with outsized emotional return — see "Attachment behaviors."
4. **She can never be a burden mechanically.** She cannot die, cannot fall
   in pits permanently, cannot block your movement, cannot soft-lock a
   room. Frustration kills attachment faster than absence.

### The balance idea worth stealing (recommended)

The Child choice is keep-her vs. gain-Void-Tether. Proposed symmetry: when
she learns to fight, **her combat kit IS a tether** — she pulls/stuns
enemies on her own AI timing, the ability you gave up made flesh. Neither
branch is strictly stronger: give her up → *you* control the tether;
keep her → the tether exists but acts on its own (plus healing, plus her).
This makes the irreversible choice a genuine build choice, on-theme with
the game's consent-gated-permanence throughline. Flag for user approval
before building — it touches ability balance.

## Locomotion / following AI

New file: `game/companion.js` (10th runtime script, loaded after
`enemy.js`, before `player.js` in `index.html`).

- **Physics**: same gravity + platform-collision treatment as the player
  (ideally via the shared collision resolver proposed in
  `combat_ai_overhaul_plan.md` — build that first and she gets correct
  walls/ceilings/floors for free).
- **Follow target**: a point ~60–90px behind the player (opposite facing),
  recomputed each frame. She runs toward its X at slightly below player
  run speed (so you visibly outpace her in sprints — she has to catch up,
  which reads as effort).
- **Jumping heuristics** (checked in order):
  1. Gap probe: a short lookahead ray at her feet finds no floor within
     ~1.5 tiles → jump.
  2. Player is ≥60px above and there's a platform edge within jump reach →
     jump toward it.
  3. Player jumped within the last ~20 frames and is airborne above her →
     mirror-jump (makes traversal feel duet-like).
- **Catch-up failsafe** (the Neva trick): if she's off-screen OR has made
  no X-progress toward the target for ~90 frames, she blink-teleports to a
  valid point near the player — *only when off-screen or occluded*, so the
  illusion of real traversal is never broken on camera. On-screen stuck →
  a short scripted "scramble" hop first; teleport is the last resort.
- **Room transitions**: she doesn't path through doors — on area change she
  spawns at the player's entry anchor with a small run-in animation.
- **Hazards**: she never takes environmental damage. Spikes/AoE near her →
  yelp + flinch + short retreat hop (pure presentation). During platforming
  setpieces where following would be absurd, `mode: 'scripted'` (below)
  parks her at a waypoint and she rejoins after.

## Combat behavior — two modes, unlocked in sequence

`companionState.mode`: `'follow' | 'hiding' | 'healing' | 'fighting' | 'scripted'`
(flat-flags style, matching `abilityState`'s existing convention).

### Phase 1 — Hide & Heal (from the moment you keep her)

- **Combat starts** (any enemy `aware` of the player in the room): she runs
  to the farthest safe point from the nearest enemy (corner, ledge behind
  the player) and cowers — visible, vulnerable-*looking* (but untouchable),
  which motivates protecting her emotionally without a real escort-mission
  failure state. Enemies never target her (she's an anomaly outside the
  fracture — story-consistent).
- **Combat ends** (no aware enemies): she runs *to you* and heals on touch
  — 1 HP, on a real cooldown (propose 60–90s, tune in the arena). Making
  the heal touch-based means you walk back to her, a deliberate small
  reunion every fight — this is the core attachment loop, and it's also
  the healing-economy role `healing_items_plan.md` assigns her.
- Optional mid-fight panic beat: if the player drops to 1 HP she cries out
  (audio cue) — costs nothing, lands hard.

### Phase 2 — She fights (post-"teach her" story beat)

- She keeps follow behavior but engages enemies within ~200px:
  - **Tether pull** (if the recommendation above is approved): every ~8–10s
    she tethers the enemy nearest the *player's facing direction* and drags
    it 60–80px toward the player + brief `hitStun` — she sets up *your*
    combos rather than dealing damage herself. This keeps the player the
    damage-dealer (combat stays the point) and makes her feel like a combo
    partner, which plugs directly into the combo-system plans.
  - Small self-defense swipe if an enemy overlaps her (low damage, mostly
    animation).
- She still heals between fights (Phase 1 behavior persists).
- She disengages and retreats to hiding during boss phase transitions or
  when a `scripted` sequence says so.

## Attachment behaviors (cheap, high-return — build alongside Phase 1)

- **Call button** (one new `keyBindings` action): she runs to you, chirps.
  If pressed while she's healing-ready, she comes heal you.
- She idles: sits at anchors when you save, looks toward lore-fragment
  locations (a free environmental-storytelling pointer once lore returns),
  startles at miniboss intro roars.
- At anchors, resting together is the visual (she sits beside you) —
  reinforces anchors as safety.

## Save data

`companionKept` (bool), `companionCanFight` (bool, the taught flag),
`companionHealCooldown` — added to `saveGame()`/`loadGame()`/
`startNewGame()` per `CLAUDE.md`'s rule (update all three).

## Editor: `editor/companion_test.html` (arena, per user request)

Modeled on `enemy_test.html`'s spawn-in-isolated-arena pattern. The user
will build the test room; the tool needs:

- Arena with varied platform gaps/heights (tests every jump heuristic) and
  a pit (tests the failsafe, never-dies rule).
- Mode override dropdown (follow / hiding / healing / fighting / scripted).
- Enemy wave spawner (reuse `enemy_test.html`'s spawn code) — watch her
  hide, then heal after the wave; toggle `companionCanFight` live to watch
  Phase 2 tether behavior.
- Sliders: follow distance, catch-up threshold frames, heal cooldown,
  tether interval — JSON export of tuned values, paste-ready
  (same safe-handoff philosophy as `enemy_editor.html`).
- Stuck-fuzzer: button that teleports *the player* somewhere random in the
  arena, to hammer the catch-up logic.

## Build order (proposed)

1. Shared collision resolver (from `combat_ai_overhaul_plan.md`) — she
   depends on it.
2. `Child` class: locomotion + follow + failsafe + `follow`/`scripted`.
3. `companion_test.html` arena tool (validate 2 before adding combat).
4. Hide & Heal mode + attachment behaviors + save data.
5. Phase 2 fighting mode (needs the tether-kit decision approved, and
   ideally the animation-editor data model from
   `animation_editor_plan.md` for her attack timing).

## Open questions for the user

1. Approve the "her combat kit is a tether" symmetry? (Changes ability
   balance; alternative is a plain melee swipe kit.)
2. When does "teach her to fight" happen — a fixed story beat, or
   player-initiated at an anchor?
3. Should her heal be the *only* out-of-anchor healing on the keep-her
   branch, or stack with enemy healing drops? (See
   `healing_items_plan.md` — recommendation there is they stack, hers
   being the reliable one.)
