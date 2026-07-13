# Stillpoint — Lore

Status: **narrative reference doc, not yet displayed in-game** (`LORE_ENABLED = false`
in `game.js` — see `Plans/CLAUDE.md`). This is a full rewrite (2026-07-12) of the King's
characterization and a new section on miniboss/region lore — see "Revision history" at
the bottom for what changed and why. The individual fragments quoted in `area.js`'s
`loreFragments[]` predate this rewrite and are now stale (they were written for the old
sympathetic King) — porting them to match is tracked as follow-up work under roadmap.md
1.10, not done in this pass. This doc is the connective tissue that makes the eventual
in-game fragments read as one story, for whenever the environmental-storytelling redesign
happens.

## The pitch

Before the Fracture, the King ruled an empire built on Stillpoints — devices that could
hold a single moment in place forever. He didn't build them to protect anything. He built
them as a weapon: freeze your enemy's army mid-charge, freeze a city mid-surrender, freeze
time itself around anyone who resisted him, and just... keep it that way. He believed
total, permanent control would finally end every war, every famine, every future
conflict — that if nothing could ever change again, nothing could ever go wrong again. He
was wrong on a scale that broke the world. When he tried to fuse every Stillpoint into one,
final, absolute one — a single moment to freeze *everything*, forever, under him — it
didn't hold. Time didn't stop. It shattered. You are a nameless Warden, carrying the one
Stillpoint that wasn't consumed in that attempt, moving through the wreckage of his
ambition — not to freeze the world again, but to move through it, and to stop him from
trying a second time.

## The Fracture (the founding event — an act, not an accident)

> "He said the fusion would be clean. He said it would be the last thing he ever had to
> do to us." — `lore_f1`, *the_fracture*

The Fracture wasn't a structural failure. It was a weapon that misfired at the scale of a
world. The King fused every Stillpoint his empire held into one device, meant to freeze
all of reality under his hand permanently — no more resistance, no more war, no more
change of any kind, ever again. It didn't fail gently. Reality didn't refuse to freeze; it
refused to freeze *evenly*, and tore instead, fragmenting into disconnected pockets, each
one still locally obeying the instant it broke in, looping it forever:

> "The bridge didn't fall. It refused to hold. There is a difference, and I understand it
> now." — `lore_eb1`, *echo_bridge*

> "The crystals are made of frozen time. His time. He didn't ask if we wanted to be
> frozen with it." — `lore_cc1`, *crystal_cavern*

> "Every gap is a small surrender." — `lore_tr1`, *the_rift*

Read together, these aren't separate hazards — they're the same weapon's blast radius,
recurring at every scale, from a bridge to a crystal to a floor. The world you're
platforming through isn't collapsing on its own; it's still failing to finish being
conquered.

## The King

> "He didn't lose control of the Stillpoints. He fused them on purpose, to end every war
> at once by ending the possibility of anything ever changing again." — `lore_ur1`,
> *upper_ruins*

> "He told us it was for our own good. That a world which could never change again could
> never be hurt again. He believed it. That's what made him dangerous — not cruelty,
> certainty." — `lore_ur2`, *upper_ruins*

> "He is still in there. Not trapped — waiting. Rebuilding what he can reach. He has not
> stopped ruling; he has just run out of subjects who can still see him coming." —
> `lore_ur3`, *upper_ruins*

> "Every barrier he built was meant to never be crossed. He is the reason nothing here was
> ever allowed to bend — so now everything only knows how to break." — `lore_tf1`,
> *the_forge*

> "He knows something is moving through his ruins that he didn't authorize. He is looking
> for it. He is very good at looking." — `lore_ac1`, *antechamber*

> "There is a child he cannot see. He knows there is something he cannot see, which is
> worse, to him, than knowing what it is. He will not stop until there is nothing left he
> cannot account for." — `lore_ac2`, *antechamber*

He is a conqueror, not a cautionary tale — the Fracture was the weapon, not the accident.
He still believes he was right: a world frozen under one hand, forever, is a world that
can never again be hurt by change. That belief is the one honest thing about him, and it
does not make him sympathetic; it's the reasoning of someone who has never once had to
answer for the cost. In the game's present, he isn't trapped so much as *reduced* — still
ruling, still absolutely certain, just down to the fragment he's stuck holding together
and whatever he can still reach from it. What he can reach right now is the one thing his
old control never accounted for: an anomaly he can't see or predict, somewhere in his own
ruins. He is actively hunting it. He talks like he's still winning, because as far as he's
concerned, he still is — he just hasn't finished mopping up.

**On the child (ties directly to `story.md` §2-3):** the King cannot perceive her at
all while she stays hidden — she's outside the frame of everything he fused, which is why
she's the one true blind spot in his otherwise-total control. The moment she fights
(the Train path — visible shard shots, real damage, real presence), she becomes something
he *can* see, which is exactly what makes her a target instead of a rumor. That's the
mechanical reason Training her carries the risk story.md describes: it doesn't just make
her useful in a fight, it makes her findable by the one entity in the world whose entire
identity is finding and controlling things. Protecting her (never letting her fight) keeps
her permanently outside his notice — safer, but it's also the reason the Protect path
never lets her contribute to actually stopping him.

**Tone in the fight and in fragments:** arrogant, not menacing-silent — he talks to the
player like a ruler addressing a minor uprising, not a monster addressing prey. He's
condescending about the player's effort ("still walking" energy, not "still breathing"),
because from his frame of reference he already won; you're a loose thread, not a rival.
That arrogance is the throughline for however boss dialogue/telegraphs eventually get
written (per 3.5's "Telegraph Clarity" — his windups should read as *performances*, not
just wind-ups).

**The King's vision, and why the game opens the way it does (added 2026-07-13):** he has
some form of perception that senses hidden/anomalous things — "nowhere normal" isn't
hidden from him. This is the clean answer to why the player's opening cinematic has an
ally seal them away **in time**, specifically, rather than just a secret room: a secret
room isn't secret from him. See `story.md` §0 for the full opening beat (the King nearly
kills the player, the ally intervenes, the player wakes with only that memory) and its
late-game payoff (the antechamber's spatial-loop reveal — the boss arena and the sealed
starting room are the same place, seen from opposite ends of the world). This is also
what makes the ally identifiable later: **the ally is the Temporal Warden**
(Chrono-Space Rift's miniboss, see "Minibosses & their regions" below) — his existing
write-up ("used forbidden time-magic to keep resetting his own death rather than ever
let his watch lapse... a guardian who outlived his own victory") already fits "sealed you
away in time to save you" without needing new lore invented for it. Reaching his fight
becomes a second reveal, separate from the antechamber twist, using characterization
that already exists.

## Stillpoint (the ability, the artifact, the word)

> "We stole one Stillpoint back before he fused the rest. He doesn't know it exists. Keep
> it. Keep it hidden. Give it to whoever comes looking for a way to move, not a way to
> stop." — `lore_tv1`, *the_vault*

> "He thinks he accounted for everything that could ever move against him. He is very
> nearly right. Go be the exception." — `lore_tv2`, *the_vault*

The King's Stillpoints were confiscated, requisitioned, or built directly under his
authority — every one of them, until this last one, which his own people managed to hide
from him before the fusion. It's not an inheritance left out of hope the way the old
framing had it; it's a single act of theft against a tyrant, the one thing that slipped
past a ruler who prided himself on nothing slipping past him. The player's Stillpoint
existing at all is proof his control was never as total as he believed — which is exactly
why finding it, and the anomaly he can't see, both threaten him the same way.

## The Crag of the Colossus

A side region, spatially and narratively separate from the King's story — an independent
tragedy, not one of his doing, with its own small shape:

> "The crag does not yield to a light hand. Strike as though you mean to end something." —
> `lore_ce1`, *crag_entrance*

> "Something split this stone in one blow. We have been trying to understand the blow ever
> since." — `lore_cb1`, *crag_breach*

> "We gave the crag a heart of crystal so it would remember how to stand. It remembers too
> well." — `lore_ca1`, *crag_altar*

The Colossus Core (the region's miniboss) is the "heart of crystal" — a construct built to
hold the crag's structure together after whatever split it, built by people who had
nothing to do with the King's empire. It worked too well: the construct has no off-switch,
no memory of anything except "hold the shape," and it will fight forever whether or not
the crag still needs holding. It's a smaller, non-sapient echo of the *shape* of the
King's arc (something built for permanence that outlived its purpose and can't stop)
without being connected to him at all — proof the game's theme doesn't need him personally
behind it to land.

## Minibosses & their regions (new — roadmap 1.10)

Per direct instruction: **most of these are independent tragedies, not things the King
personally did.** He caused the Fracture; he did not personally cause every region's ruin.
One exception is called out explicitly below (Graviton Core), because its miniboss is
literally named after him and that connection is the point of that one fight. The rest
should read as the world's *own* wreckage — proof the Fracture broke more than just his
plan, and that plenty of smaller, unrelated permanence-attempts were already failing on
their own before he ever touched them.

Shared rule (same one `lore.md`'s original version used, kept because it still works):
each of these is a variation on **"something built to last, and what happened when it
couldn't"** — never a King-sized answer, never the same shape twice.

### Mirror Veil — The Mirror King
A minor provincial lord, one of many who ruled under the King's empire, obsessed with
outliving his own mortality the same way his emperor was obsessed with outliving change
itself — copying the boss's logic on a petty, local scale. He commissioned mirror-sorcery
that would let a perfect copy of him take the throne the instant he died, so his rule
would never actually end. The mirrors didn't stop copying when the Fracture hit; they kept
going, and now the region is full of reflections that each believe *they* are the one
true lord, fighting anyone who enters as though defending a throne none of them actually
sit on. A tragedy of vanity mistaking repetition for permanence.

### Event Horizon — Gravity Collapse Core
Not a palace, a mine — this region extracted raw gravitic material that fed the King's
war machine (siege engines, anti-gravity transports, the infrastructure of conquest,
though the King never set foot here himself). When the Fracture hit, the extraction
core's containment failed and it became a self-collapsing singularity, endlessly pulling
in debris — and everyone who worked it. What's left isn't malicious; it's a resource
operation that outlived the empire that ordered it and never received a shutdown order,
still "extracting" by pulling in whatever's nearby.

### Chrono-Space Rift — Temporal Warden
The monastic order that hid the player's Stillpoint from the King (see the Stillpoint
section above — this is that room) had one member assigned to guard the secret forever:
its eldest keeper, who used forbidden time-magic to keep resetting his own death rather
than ever let his watch lapse. He's still doing it, on a repeating countdown, unaware the
thing he swore to guard was already carried off successfully — his watch ended in success
long ago and he has no way to know that. A guardian who outlived his own victory.

### Graviton Core — Fractured King's Guard *(the one direct exception)*
Explicitly one of the King's own — an elite soldier posted here specifically because
Graviton Surge's source was valuable enough to guard personally. He's still doing his
job: holding this outpost, waiting for reinforcements and orders that stopped coming the
instant the Fracture hit. Not a tragedy of vanity or overreach like the others — a
tragedy of loyalty with no one left to be loyal to. Fighting him is the closest the player
gets to fighting a piece of the King himself before the actual throne room.

### The Polar Shift — Electromagnetic Golem
A frontier mining settlement, far enough from the King's reach that its people solved
their own problems — raiders, mostly — by building a magnetic automaton to defend the
tunnels. It worked. The settlement is long gone (Fracture or otherwise, this one was
never his doing), but the golem's directive was never "defend the settlement"; it was
"defend the tunnels," and the tunnels are still here. It has nothing left to protect and
protects it anyway.

### Echoing Abyss — Quantum Pursuer
This region's whole mechanic is that your own dashes and attacks leave lingering echoes
you can stand on — so its miniboss is what happens when someone tried to make that
permanent. Someone here didn't want to lose themself (or someone they'd lost) and built a
recursive echo of a person, meant to persist after the original was gone. It worked too
well in the other direction: the echo split fully autonomous, and now endlessly chases
and copies whoever it meets, always half a beat behind, forever trying to become whoever
is in front of it because it was never taught how to become only itself.

### Paradox Engine — The Assembler
An automated constructor built to keep the King's war machine supplied — armor, siege
parts, replacement matériel, endlessly, on a directive with no stop condition because no
one expected the war to end this way. Its overseers are gone; its directive isn't. It is
still assembling, using whatever scrap is nearest, including anything that stops moving
in its reach. Not evil, not loyal even — just a process that was never given a reason to
halt.

### Warp Gate Nexus — Warden & Hollow
Two gatekeepers, stationed as a pair specifically because a single gatekeeper could be
overwhelmed and a pair could always cover each other's blind spot — one built to counter
close-range intrusion, one built to counter ranged. Their entire purpose was mid-shift
when the Fracture hit: testing travelers before letting them through to wherever this
Nexus led. The travelers stopped coming. The all-clear to finally stand down never
arrived. They are still testing whoever walks in, because from where they stand, their
shift never technically ended.

## Reading order

The fragments are written to be found roughly in this sequence (mirrors the intended
play order, `col`/`row` in `area.js`):

1. `lore_f1` — the_fracture — the founding act (a weapon, not an accident)
2. `lore_eb1` — echo_bridge — the weapon's blast radius, repeating at small scale
3. `lore_ur1`, `lore_ur2`, `lore_ur3` — upper_ruins *(optional branch)* — who the King is,
   and why his own certainty is the thing to fear
4. `lore_cc1` — crystal_cavern — the blast radius, repeating again, differently
5. `lore_tf1` — the_forge — his arc stated directly (nothing here was ever allowed to bend)
6. `lore_tv1`, `lore_tv2` — the_vault — the one Stillpoint that was stolen back from him
7. `lore_tr1` — the_rift — thesis restated as a platforming beat
8. `lore_ac1`, `lore_ac2` — antechamber — he knows something is loose in his ruins, and
   he is hunting it
9. `lore_ce1` (crag_entrance), `lore_cb1` (crag_breach), `lore_ca1` (crag_altar)
   *(optional branch, any order)* — the Crag's self-contained echo of the main theme,
   deliberately unconnected to him

Miniboss/region lore (see section above) is read on arrival at each region rather than in
a fixed sequence — none of it is plot-critical the way the King's own thread is, so no
ordering constraint applies beyond "found when that region is found."

## Visual effects per fragment (roadmap 1.9/1.10 — replaces the old text quotes)

Per direct instruction: **fragments are not displayed as text at all, ever** — the
paragraphs above are internal scripts for what each beat *means*, not what the player
reads. What the player gets on pickup is a specific visual, placed at the location the
fragment already occupies in `area.js`. Ignore the old quoted lines entirely; this table
is the actual spec. `Mode` is which of roadmap 1.10's two available treatments it gets:

- **Cutscene** — full stop, ~2-3s, screen-filling image/silhouette, game resumes after.
  Reserved for plot-critical King-thread beats (his own motive/actions) — the ones that
  can't be missed or half-seen without losing the throughline.
- **Overlay** — roadmap 1.9's existing non-blocking treatment (player keeps moving),
  used for everything that's texture/world-building rather than plot-critical.

| id | Region | Visual (what actually plays) | Mode |
|---|---|---|---|
| `lore_f1` | the_fracture | Wide shot: a single point of light (every Stillpoint fused into one) at the center of a silhouetted city skyline, holding — then the skyline cracks outward from it like glass, freezing mid-shatter. | Cutscene (opening beat — sets the whole game's premise) |
| `lore_eb1` | echo_bridge | A bridge silhouette caught mid-collapse, frozen at the exact frame it broke, dust suspended in the air around it — camera slowly pulls back to show the same freeze-frame repeating down the whole canyon. | Overlay |
| `lore_ur1` | upper_ruins | A throne room, seen from behind rows of kneeling silhouettes, the King's silhouette raising a single glowing Stillpoint shard overhead. | Overlay |
| `lore_ur2` | upper_ruins | Close on the King's silhouette addressing a crowd — the crowd's silhouettes nodding, agreeing, some visibly relieved — before the frame freezes and cracks like `lore_f1`'s skyline. | Overlay |
| `lore_ur3` | upper_ruins | The King's silhouette alone in a fragment of the throne room, turning slowly as if scanning — the "camera" (player's implied POV) is the thing being scanned for. | Cutscene (first direct sense that he's looking for *you*) |
| `lore_tf1` | the_forge | Rows of identical barrier-silhouettes being stamped out on a forge line, each one glowing then going rigid/dark — ending on one specific barrier cracking under stress it was never designed to flex under. | Overlay |
| `lore_tv1` | the_vault | A hooded silhouette pocketing a single glowing shard from a table full of identical shards moments before armored silhouettes seize the rest — the pocketed one is never found. | Cutscene (the player's own Stillpoint's origin — plot-critical) |
| `lore_tv2` | the_vault | The same hooded silhouette, now alone, setting the shard down gently in what becomes this exact room, then walking away into darkness. | Overlay |
| `lore_ac1` | antechamber | The King's silhouette standing over a fragment of a broken map, one hand slowly closing over a region that has no light left in it — searching. | Overlay |
| `lore_ac2` | antechamber | A small silhouette (the child) slipping between two of the King's searching light-beams untouched — the beams sweep back, missing her by inches, again. | Cutscene (establishes the hunt that pays off in story.md's endings) |
| `lore_ce1` | crag_entrance | A single crystalline heartbeat-pulse deep inside solid rock, faint, rhythmic — no King imagery at all (Crag is intentionally disconnected from his thread). | Overlay |
| `lore_cb1` | crag_breach | The moment of the crag splitting: one clean, sourceless line of light bisecting the stone, then the pulse from `lore_ce1` flooding into the new crack. | Overlay |
| `lore_ca1` | crag_altar | The crystal heart being lowered into the crag's core by unarmored, non-military silhouettes (contrast with `lore_tf1`'s military forge line — this was builders, not soldiers), the crag visibly straightening/healing around it. | Overlay |

Two more fragments referenced in earlier drafts of this doc (`lore_cc1` in crystal_cavern,
`lore_tr1` in the_rift) are **not yet real `area.js` entries** — `crystal_cavern`/`the_rift`
currently have empty `loreFragments: []`. Proposed for whenever they're added:

| id (proposed) | Region | Visual | Mode |
|---|---|---|---|
| `lore_cc1` | crystal_cavern | A field of identical crystals, each one holding a frozen instant of ordinary life (a hand mid-reach, water mid-drip) — camera drifts past dozens before settling on one that's empty, its instant already gone. | Overlay |
| `lore_tr1` | the_rift | A single figure's silhouette walking forward across a gap that keeps widening one step ahead of them, never closing, never quite failing either. | Overlay |

## Notes for whoever builds the display system

- Don't dump these as dialogue boxes — nothing here is text/inscriptions anymore; it's
  all silhouette/still-image visual per the table above. Match `cave_design_plan.md`'s
  "background landmarks" approach for placement (found near the location, not shoved in
  front of the player), but the payload itself is now purely visual.
- `upper_ruins` and the Crag fragments are the only ones gated behind an optional branch —
  they're allowed to go unread by a player who beelines the spine. Don't gate anything
  plot-critical (the King's motive and current goal, the Stillpoint's origin, the hunt for
  the child) behind 100%-optional content — per the table above, exactly those beats
  (`lore_ur3`, `lore_tv1`, `lore_ac2`) are marked Cutscene specifically so they can't be
  missed or half-seen the way an Overlay could be while running past.
- The 8 planned-region miniboss write-ups above are NOT yet backed by real `AREAS`
  entries (only Mirror Veil, Event Horizon, and Chrono-Space Rift exist as built rooms —
  see roadmap.md Phase 9) — treat this section as the content to write actual
  visual-effect beats FROM, once each region gets built, not as fragments that already
  exist anywhere. Same two-mode system applies: default to Overlay, reserve Cutscene for
  Graviton Core's Fractured King's Guard (the one direct King-thread miniboss).
- Implementation note: roadmap.md 1.9 shipped one placeholder visual (a generic amber
  vignette pulse, `lorePipEffect` in game.js) used identically for every fragment. The
  table above is the spec for replacing that generic placeholder with per-fragment
  content and adding the Cutscene mode (a full game-loop pause, which doesn't exist yet —
  `lorePipEffect` currently never blocks `update()`). Both are follow-up implementation
  work, not done in this pass.
- Core principle carried over from the previous version: lore is felt and seen, not read.
  Text pop-ups stay permanently disabled (`LORE_ENABLED = false`).

## Revision history

- **2026-07-12 (this rewrite)**: King changed from a sympathetic, tragic figure ("not a
  villain... the fight isn't punishment") to a deliberate conqueror-villain, per direct
  user request ("the final boss should be an opponent," "I don't think the lore is
  good... build out lore where the king is a villain"). Added the Minibosses & Regions
  section (new). The Fracture's framing changed from an accidental structural failure to
  a deliberate weapon that misfired at world scale. Crag of the Colossus section
  unchanged — it was already an "independent tragedy" under the old version and needed no
  revision under the new one.
- **2026-07-13**: added the King's-vision detail and the Temporal-Warden-as-opening-ally
  reveal to the King section, tying into a new spatial-loop story structure (see
  `story.md` §0/§9 for the narrative side, `roadmap.md` 6.7 for the engineering side).
