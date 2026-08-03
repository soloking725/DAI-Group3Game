# Human-Scale Proportions — Design Exploration (NOT started, not decided)

Status: **proposal / discussion doc only**, written at the user's request to
answer "how would this change the game?" No code has been touched for this.
Nothing here is scoped for implementation until the open questions at the
bottom are actually answered — this is closer in spirit to
`movement_feel_plan.md` (a live proposal, not a status doc) than to
`roadmap.md`.

## The ask, restated

Right now the player (and by extension most of the cast) reads on-screen as
an abstract, compact shape — a 24×32px rectangle, no visible limbs by
default (see "What exists today" below). The user's mental image of the
protagonist, though, is closer to **Ike from Super Smash Bros. Ultimate**:
a tall, broad-shouldered, heavily-built adult human silhouette — not a
stylized blob, not a chibi/cute proportion set, an actual person-shaped
person, on the bulky/imposing end of "person-shaped." The question is what
adopting that changes, mechanically and tonally, across the rest of the
game — not just "can the sprite look different."

## What exists today (the actual starting point)

- **Player hurtbox**: 24×32px (`player.js`). Width:height ≈ 0.75:1 — wider
  relative to its height than a real human silhouette would ever be (a
  standing adult is roughly 1:4 to 1:6 width:height, not 3:4). Ducking
  halves the height to 16px by shifting `y`, not by reshaping a rig.
- **Default rendering**: literally `ctx.fillRect(0, 0, width, height)` — a
  flat solid-color rectangle, no limbs, no head, no silhouette detail at
  all (`animdata.js`'s `POSE_RENDERERS.idle`). The "legacy" procedural body
  draw (`drawPlayerBody`, referenced from several pose renderers) adds a
  bit more shape, but the ceiling on procedural-rectangle art is low by
  construction — it was never meant to read as an anatomically real body,
  just a bold, fast-to-read game piece.
- **Real art pipeline already exists and is proportion-agnostic**: the
  animation system (`animdata.js`'s `ANIM_DEFS`/`Animator`, edited via
  `editor/anim_editor.html`) supports per-frame raster image uploads
  (`animImageStore.js`, IndexedDB-backed) that override the procedural
  draw entirely, frame by frame, per animation state. This matters a lot
  for scoping below: **the engine does not need to change to support a
  human-proportioned character** — only the art does, and only where art
  has been authored (nothing has been authored yet; every animation state
  today either has no art or falls back to the flat-rectangle/legacy draw).
- **Canvas**: 800×450 internal resolution (`game.js`), so today's player is
  ≈3% of screen width, ≈7% of screen height — a small, iconic silhouette,
  typical of tight-camera 2D action-platformers.
- **Declared visual style** (`CLAUDE.md`): *"minimalist vector art,
  dark background, violet/teal/deep-blue palette. Tonal references: Hollow
  Knight, Celeste, Hyper Light Drifter."* All three references are
  deliberately **small, simplified, non-realistic humanoid or non-human
  silhouettes** relative to their environments (Hollow Knight's insect
  people, Celeste's blocky small human, Hyper Light Drifter's small cloaked
  figure dwarfed by ruins) — this is a real, load-bearing design decision
  already on record, not an accident of "we haven't drawn better art yet."
  Ike-from-Smash proportions sit stylistically much closer to a modern
  fighting-game character model (realistic anatomy, heavy musculature,
  weighty per-frame detail) than to any of the three named references.
  **This is the single biggest tension in the whole ask** — it's not just
  "bigger," it's a different genre of character art entirely.
- **Design-doc precedent for "build" as a meaningful signal**: `story.md`
  §0.5 already treats character proportions as deliberate narrative
  information — a planned NG+ avatar swap is described as "a visibly
  smaller build than the base game's player (reference given: proportioned
  more like Mekk Knight Crusadia than the base Warden)." That line implies
  the *base* Warden already has *some* build in mind distinct from the
  NG+ swap's, but no doc anywhere actually pins down what it is — this
  would be the first time it's decided, not a contradiction of anything
  already written.

## Ripple effects, by area

### 1. Art production (the real cost center)

This is not a code task, it's an asset-production task, and it's the
biggest line item by far:

- Every existing animation state needs new art: idle, run, jump, fall,
  duck, dash (per chain tier), phase dash, wall-slide, all 3 attack
  directions ×2 (normal/heavy), Stillpoint halo, Shard Shot aim/beam,
  Graviton Ball, Void Tether pose, hurt/knockback, death — and that's the
  *player alone*. A human-proportioned rig reads mistakes far more
  harshly than a rectangle does: a slightly-off knee bend or an
  inconsistent shoulder width across frames is immediately visible in a way
  a resized rectangle never was.
- A believable heavily-built human character generally needs *more*
  frames per action to read well (weight, follow-through, recovery) than a
  minimal/abstract character does, not fewer — abstraction is partly a
  budget tool as much as a style choice.
- The existing tools (`anim_editor.html`, `animImageStore.js`) can carry
  this workload technically — no new tooling is required to *support*
  richer art — but they don't reduce how much art has to be drawn.

### 2. Hurtbox / hitbox geometry — not cosmetic, load-bearing

The 24×32 hurtbox isn't just a visual stand-in — it's the actual collision
rectangle every room, gap, and attack range in the game was hand-tuned
against:

- A real human silhouette is much taller relative to its width than 24×32.
  Match the visual proportions honestly (say, roughly 20 wide × 48-56 tall,
  Ike-style broad-but-tall) and the hurtbox changes shape, not just size.
  That changes: how narrow a gap the player can slip through, how tight a
  corridor reads, wall-jump geometry (a taller body changes where the wall-
  contact point and post-jump arc visually sit relative to the sprite),
  and duck height's proportions (halving 56 is a much bigger relative
  crouch than halving 32).
- **`validateAllRoomLayouts()` — the linter that runs on every page load —
  simulates jump arcs and gap distances against the exact current physics
  constants and (implicitly) the current hurtbox.** `movement_feel_plan.md`
  already flags this exact class of risk for a *smaller* change (raising
  move speed): "requires a full `validateAllRoomLayouts()` re-run" before
  trusting any existing room. A hurtbox *shape* change is a bigger version
  of the same problem — every one of the 71 rooms, most already hand-placed
  with platforms/gaps/one-ways tuned around the current 24×32 box, would
  need re-validation, and likely real re-design wherever the new box no
  longer fits a passage the old one did (or trivializes a gap the old one
  found tight).
- Every hardcoded attack hitbox (`attackVFX.js`'s `ATK_FWD_W/H` etc.,
  every enemy's `melee_swing`/`dash_charge`/etc. hitbox math in `enemy.js`)
  is dimensioned relative to the *current* player/enemy sizes. A broader,
  taller player changes what "natural reach" looks like for a swing, and
  every enemy attack tuned to feel "fair" against the old hurtbox would
  need a pass to confirm it still reads as fair against the new one (a
  wider standing target is easier to hit at the same telegraph timing,
  which either needs to be compensated for or is an intentional difficulty
  shift worth deciding on purpose, not by accident).

### 3. Movement feel

Physics *constants* (gravity, jump force, dash speed, etc.) don't have to
change numerically — but they'll almost certainly need to, because a
visually bigger, heavier-looking character moving at exactly the same
pixel-speeds as the current small one will read as **weightless or
cartoonish** (a big Ike-proportioned body snapping into a dash at the same
speed a small abstract shape does breaks the "big and heavy" read the
proportions themselves are trying to sell). This is the same territory
`movement_feel_plan.md` is already navigating for unrelated reasons
(pushing movement toward "late Celeste" fluidity) — the two efforts would
directly interact and should not be planned independently of each other.

### 4. Enemy/world scale — the asymmetry problem

This is the least obvious but possibly most important ripple:

- If the player becomes visually large and imposing (Ike reads as *strong*,
  not vulnerable), every enemy and boss either has to scale up to match
  (a full re-pass on every existing enemy's dimensions, hitboxes, and
  attack geometry — 15+ enemy classes, 11 minibosses, the final boss) or
  the player will simply look like the biggest, strongest thing in every
  room by default, regardless of what the numbers say.
- That directly cuts against an explicit, already-written design
  principle (`roadmap.md`'s 2026-07-15 design note): *"the game is a loop,
  the Sovereign should always be stronger than the player... 'Stronger
  than you' should read as raw power/scale... not as a wider ability
  kit."* That note is specifically about the *final boss* needing to read
  as bigger/stronger than the player — a design built around the assumption
  that the player character does **not** already read as the strongest
  thing on screen. A visually massive, muscular protagonist narrows or
  erases the headroom that note depends on: the Sovereign (and every other
  "you are the underdog here" beat the docs lean on) has less visual room
  to read as more imposing than an already-imposing player.
- More broadly: metroidvania power fantasies usually run on *contrast* —
  a small, vulnerable-looking character growing more capable over the
  run, set against a world/bosses that dwarf them. Hollow Knight, Celeste,
  and Hyper Light Drifter (the game's own named references) all use this
  contrast deliberately. An Ike-scale protagonist flips the starting
  point: the character *already* looks physically dominant before a
  single ability is unlocked, which is a different, valid, but genuinely
  different power fantasy (a Souls-like "you're already strong, the world
  is just harder" read, more than a "small creature growing into a bigger
  world" read).

### 5. Camera / UI

- A taller, wider character eats more of a fixed 800×450 view — either
  the camera needs to pull back (shrinking everything else on screen,
  partially undoing the size increase's visual impact) or vertical
  platforming headroom gets tighter by feel even where the raw numbers
  didn't change.
- Health hearts, cooldown rings, and other under-the-feet/near-player HUD
  elements (`drawHealthHearts()`, `drawDashCooldownRing()`) are positioned
  relative to player width/height — all need a repositioning pass, not a
  rewrite, but a real pass.

### 6. Tone / narrative fit

- Nothing in `lore.md`/`story.md` explicitly pins the base Warden's build,
  so this wouldn't contradict established lore — but it would be making a
  real characterization decision, and the game's own docs treat build as
  meaningful (see the NG+ contrast above), so it's worth treating as a
  narrative decision worth writing down, not just an art style pick.
- The "abandoned-as-a-child, spent her whole life in the spawn room"
  framing (surfaced earlier this session for the spawn-room music pick)
  reads differently against a small, worn-down survivor silhouette than
  against an Ike-scale, physically imposing one — worth a deliberate
  gut-check on whether "hardened but not physically dominant" or
  "physically formidable" is the intended read for who she became.

## What does NOT need to change

To be clear about what this proposal *isn't*: none of the underlying
systems need architectural changes to support this. The animation system
is already asset-driven and proportion-agnostic; the physics system reads
whatever `width`/`height` the entity currently has; the room/collision
system doesn't hardcode 24×32 anywhere structural (it hardcodes it as
*data*, in individual room layouts, which is exactly the part that would
need re-tuning, not the engine code that reads that data). This is a
content and tuning effort layered on existing infrastructure, not a
rewrite.

## Rough scope if pursued (for later planning, not a commitment)

1. **Decide the actual target proportions** (exact hurtbox W×H, not just
   "Ike-like") and get one full character turnaround/idle pose approved
   before touching anything else — this is the highest-leverage single
   decision, since everything else scales off it.
2. **Re-tune movement constants** for the new visual weight (paired with
   `movement_feel_plan.md`, not separate from it).
3. **Re-run `validateAllRoomLayouts()`** against the new hurtbox and
   triage every room it flags — expect this to be the single largest
   chunk of engineering time, likely larger than the art itself for a
   71-room game.
4. **Decide the enemy-scale question explicitly** (do enemies/bosses scale
   up too, and if so by how much, region by region) before authoring any
   new enemy art, to avoid redoing it twice.
5. **Art production**, prioritized by what's actually visible most often
   (idle/run/jump/attack) before secondary states (ability VFX poses).
6. Re-tune attack hitbox geometry (`attackVFX.js`, every enemy's melee/
   dash attack dimensions) against the new player size.

Steps 1 and 4 are pure design decisions with no art or code dependency —
they're the right place to start if this moves forward, since every later
step's cost depends on their answers.

## Open questions (for the user, not guessed at here)

- Exact target hurtbox dimensions, or is "look like Ike, mechanically stay
  close to today's feel" the actual goal (in which case the *visual*
  character could be taller/broader while the *hurtbox* stays close to
  today's footprint — a cheaper, lower-risk middle path worth naming
  explicitly: bulk up the art, keep the collision box conservative)?
- Does this apply to the player only, or to the whole cast (enemies,
  minibosses, the Sovereign, the Child)? The asymmetry problem in §4 above
  is much smaller if it's everyone, much bigger if it's the player alone.
- Is the intended power fantasy shifting on purpose (underdog-grows-strong
  → already-strong-protagonist), or is the goal "look more like a real
  person" while keeping the current vulnerable-underdog tone? These pull
  in different visual directions even before art begins.
- Given the scale of art production, is a phased rollout acceptable
  (player first, then bosses, then regular enemies), or does it need to
  land as one consistent pass?
