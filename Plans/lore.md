# Stillpoint — Lore

Status: **narrative reference doc, not yet displayed in-game** (`LORE_ENABLED = false`
in `game.js` — see `CLAUDE.md`). This is a full rewrite (2026-07-12) of the
Sovereign's characterization and a new section on miniboss/region lore — see "Revision
history" at the bottom for what changed and why. The individual fragments quoted in
`area.js`'s `loreFragments[]` predate this rewrite and are now stale (they were written
for the old sympathetic King, before the 2026-07-13 King→Sovereign rename below) —
porting them to match is tracked as follow-up work under roadmap.md 1.10, not done in
this pass. This doc is the connective tissue that makes the eventual in-game fragments
read as one story, for whenever the environmental-storytelling redesign happens.

## The pitch (reframed 2026-07-21 — the war-bunker setting, confirmed direction)

Hundreds of years after a war burned the surface, what's left of humanity holds one
sealed shelter inside a mountain, still fighting a war nobody left alive actually
remembers starting. Nobody knows for certain the war outside is still real — it doesn't
matter; the shelter has run on that belief so long it can't stop without admitting
everything it's already done might have been for nothing. "Magic" in this world is
undiscovered science: the Stillpoint isn't a spell, it's a device — a way to hold one
moment of time in place, discovered and weaponized by the shelter's war-research program,
directed by the Sovereign. She believed total temporal control would end the war
permanently: freeze the front line, freeze it there forever, and nothing could ever go
wrong again because nothing could ever change again. When she tried to fuse every
Stillpoint the program held into one final, absolute device, it didn't hold. Time didn't
stop. The device didn't break the world — it broke *her*: her own life came loose from
its own continuity, caught in a private loop that snaps back to childhood every time the
attempt fails. The world around her is only ordinary war-torn — the wreckage is the long
war's, not the device's. You are a nameless Warden, carrying the one Stillpoint her own
people stole back before the fusion, moving through the wreckage of her program — not to
finish what she started, but to stop her from trying it a second time.

**What carries over unchanged from the pre-reframe version below**: the fusion attempt as
a weapon, not an accident; the Sovereign's "certainty, not cruelty"; the "built to last,
and what happened when it couldn't" thesis; the identity loop (now understood as one
person's life, not tiered/compounding memory across separate iterations — see Revision
history). Only the words around them change — empire → war program, ruled → directed, her
people → her scientists/soldiers. **Removed, this revision**: the world-spanning
"Fracture" as a founding cosmic event and the pocket-dimension/spacetime-separation
framing — see the new section below.

## "The fracture" — not a founding event, just what the fight ends with

**Removed as world lore (this revision).** There is no single cosmic catastrophe behind
the state of the world — the ruin, the war damage, the "built to last and what happened
when it couldn't" wreckage everywhere are all just the ordinary result of the long war
described in "The pitch" above, plus each region's own local device outliving its purpose
(see the miniboss section below — none of them need a bigger event behind them, they
already explain themselves). Nothing in the world needs to be "explained" by a
spacetime-tearing accident, because there wasn't one, and the world was never literally
split into disconnected pockets — it's one mountain, worn down by one long war, over one
person's one lifetime.

The word "fracture," if it's used at all, names one specific, small, personal moment: the
instant the fusion attempt fails at the end of the final fight and the person — child,
player, Sovereign, all one continuous life — snaps back to being the child again. It's the
loop's reset beat, not a myth. It doesn't need region-by-region lore, found-object echoes,
or a "founding" framing, and shouldn't be treated as one going forward.

## The Sovereign

> "She didn't lose control of the Stillpoints. She fused them on purpose, to end every
> war at once by ending the possibility of anything ever changing again." — `lore_ur1`,
> *upper_ruins*

> "She told us it was for our own good. That a world which could never change again could
> never be hurt again. She believed it. That's what made her dangerous — not cruelty,
> certainty." — `lore_ur2`, *upper_ruins*

> "She is still in there. Not trapped — waiting. Rebuilding what she can reach. She has
> not stopped ruling; she has just run out of subjects who can still see her coming." —
> `lore_ur3`, *upper_ruins*

> "Every barrier she built was meant to never be crossed. She is the reason nothing here
> was ever allowed to bend — so now everything only knows how to break." — `lore_tf1`,
> *the_forge*

> "She knows something is moving through her ruins that she didn't authorize. She is
> looking for it. She is very good at looking." — `lore_ac1`, *antechamber*

> "There is a child she cannot see. She knows there is something she cannot see, which is
> worse, to her, than knowing what it is. She will not stop until there is nothing left
> she cannot account for." — `lore_ac2`, *antechamber*

She is a conqueror, not a cautionary tale — the failed fusion was a weapon, not an
accident. She still believes she was right: a world frozen under one hand, forever, is a
world that can never again be hurt by change. That belief is the one honest thing about
her, and it does not make her sympathetic; it's the reasoning of someone who has never
once had to answer for the cost. In the game's present, she isn't trapped so much as
*reduced* — still ruling, still absolutely certain, just down to the fragment she's stuck
holding together and whatever she can still reach from it. What she can reach right now
is the one thing her old control never accounted for: an anomaly she can't see or
predict, somewhere in her own ruins. She is actively hunting it. She talks like she's
still winning, because as far as she's concerned, she still is — she just hasn't finished
mopping up.

**The tragic irony (added 2026-07-14) — she is wrong, provably, by the game's own ending
logic, not just monstrous:** she hunts the child believing that resolving the anomaly —
by force, by absorption, by control — is what finally ends the loop for good. The
Collapse ending proves this belief backward: taking the child
by force (absorbing her) is exactly what ends the world (`story.md` §7 — "the loop is
annihilated... save file deleted"). Her own method, the one thing she's certain would
stabilize things, is demonstrably the thing that destroys them. This isn't "she's right
about the stakes, wrong about the method" — she's wrong on the object level too, and the
game can show this rather than assert it, since the player can go verify it by taking her
own approach and watching the world end. Keep both halves in view: the fear behind her
certainty is real (something is precarious, something could genuinely end), but the
solution she's built her whole reign on is self-defeating, not just cruel. That's the
sharp, non-excusing detail — not "she had a point," but "she had real fear and answered
it with exactly the wrong tool, and never once checked."

**On the child (ties directly to `story.md` §2-3):** the Sovereign cannot perceive her at
all while she stays hidden — she's outside the frame of everything the Sovereign fused,
which is why she's the one true blind spot in the Sovereign's otherwise-total control.
The moment she fights (the Train path — visible shard shots, real damage, real
presence), she becomes something the Sovereign *can* see, which is exactly what makes her
a target instead of a rumor. That's the mechanical reason Training her carries the risk
story.md describes: it doesn't just make her useful in a fight, it makes her findable by
the one entity in the world whose entire identity is finding and controlling things.
Protecting her (never letting her fight) keeps her permanently outside the Sovereign's
notice — safer, but it's also the reason the Protect path never lets her contribute to
actually stopping her.

**Tone in the fight and in fragments:** arrogant, not menacing-silent — she talks to the
player like a ruler addressing a minor uprising, not a monster addressing prey. She's
condescending about the player's effort ("still walking" energy, not "still breathing"),
because from her frame of reference she already won; you're a loose thread, not a rival.
That arrogance is the throughline for however boss dialogue/telegraphs eventually get
written (per 3.5's "Telegraph Clarity" — her windups should read as *performances*, not
just wind-ups).

**Final fight structure (added 2026-07-22, matches `boss.js`'s existing 3-phase build):**
she's "the player in the future" (see "Who the Sovereign actually is" below) — weighed
down but stronger, using much of the player's own moveset, notably **missing Graviton
Surge** (she never collected it in her own time as the player — her kit is fixed/
canonical, not a mirror of whatever the current save has collected). Carries a corrupted
Void Tether that pulls her straight to the player rather than the other way around. Phase
1: heavy precognition — she reads and counters the player's next move before it lands.
Phase 2 (roughly ≤60% HP): opens up with every ability except Stillpoint. Phase 3
(roughly ≤30% HP): finally uses Stillpoint itself, on top of full immunity to the
player's own — the one moment she plays the exact tool the player has relied on the whole
game, against them.

**The Sovereign's vision, and why the game opens the way it does (added 2026-07-13):**
she has some form of perception that senses hidden/anomalous things — "nowhere normal"
isn't hidden from her. This is the clean answer to why the player's opening cinematic has
an ally seal them away **in time**, specifically, rather than just a secret room: a
secret room isn't secret from her. See `story.md` §0 for the full opening beat (the
Sovereign nearly kills the player, the ally intervenes, the player wakes with only that
memory) and its late-game payoff (the antechamber's spatial-loop reveal — the boss arena
and the sealed starting room are the same place, seen from opposite ends of the world).
This is also what makes the ally identifiable later: **the ally is the Temporal Warden**
(Chrono-Space Rift's miniboss, see "Minibosses & their regions" below) — his existing
write-up ("used forbidden time-magic to keep resetting his own death rather than ever
let his watch lapse... a guardian who outlived his own victory") already fits "sealed you
away in time to save you" without needing new lore invented for it. Reaching his fight
becomes a second reveal, separate from the antechamber twist, using characterization
that already exists.

**Who the Sovereign actually is — confirmed directly by the user (see `story.md` §0.5 for
the full writeup and the exact quote confirming it):** she is not a separate lineage or
species of tyrant — she is the same person as the player and the companion child, at a
different point in that one person's one life. **Corrected this revision**: this isn't
three separate iterations with different memory access — it's one continuous life
(child, then the player-era Warden, then Sovereign), with ordinary memory of one's own
past, the same as anyone aging. What still needs no invented mechanism: *why* that life
snaps back to childhood instead of just continuing to old age and ending — see the
"fracture" note above (it's tied to the fusion attempt failing at the fight's end), and
treat anything more specific than that as still open, not settled canon. This doesn't
soften her — she's still the deliberate conqueror described above, responsible for her
own choices. It does extend this doc's "something built to last, and what happened when
it couldn't" thesis to the player character herself, not just to NPCs and artifacts.

**"Stabilize the world" means ending the loop, not rejoining a lost "real world"
(revised this pass — no pocket-dimension framing).** There's no separate true-continuity
reality the shelter tore loose from; this is one person's one life, replaying, snapping
back to childhood every time the fusion attempt fails at the end of the fight. The
Sovereign believes the child — the one Stillpoint she can't sense, the one piece of her
own program that got away — is the missing variable that would finally let the fusion
hold and end the loop for good. She isn't wrong that something like that could end it.
She's wrong about the cost: the Collapse ending (`story.md` §7) is what happens when she
gets her way — taking the child by force doesn't complete anything, it ends the loop by
ending everything in it. "Ending the loop" and "the world ending" turn out to be the same
event when it's done her way; she's never let herself see that.

## Stillpoint (the ability, the artifact, the word)

> "We stole one Stillpoint back before she fused the rest. She doesn't know it exists.
> Keep it. Keep it hidden. Give it to whoever comes looking for a way to move, not a way
> to stop." — `lore_tv1`, *the_vault*

> "She thinks she accounted for everything that could ever move against her. She is very
> nearly right. Go be the exception." — `lore_tv2`, *the_vault*

The Sovereign's Stillpoints were confiscated, requisitioned, or built directly under her
authority — every one of them, until this last one, which her own people managed to hide
from her before the fusion. It's not an inheritance left out of hope the way the old
framing had it; it's a single act of theft against a tyrant, the one thing that slipped
past a ruler who prided herself on nothing slipping past her. The player's Stillpoint
existing at all is proof her control was never as total as she believed — which is
exactly why finding it, and the anomaly she can't see, both threaten her the same way.

**Abilities are this loop's inventions, not eternal constants (confirmed 2026-07-21).**
The loop doesn't accumulate — nothing carries forward between iterations — but it isn't
identical either: each cycle, the program's scientists (the minibosses) end up building
something a little different under the same pressure, same shortage, same war. Stillpoint,
Phase Dash, Shard Shot, Void Tether, and Graviton Surge are what *this* loop produced; a
different iteration could plausibly produce different, thematically-adjacent tools instead
(a different time-trick instead of Stillpoint, say). This stays background flavor for the
base game — only one set of abilities ever needs to actually exist in the shipped game —
but it directly answers a previously-open design question (`roadmap.md`'s 2026-07-15
note that the Sovereign's boss kit "should echo the player's own abilities... loosely
Stillpoint-adjacent," without ever specifying what that means): **proposed, not yet
locked** — give her **Time Reversal** rather than literal Stillpoint. Not slowing time
around her (that would just be the player's own tool in her hands) — rewinding a few
seconds of her *own* recent state instead: undoing damage just taken, snapping back to a
position before a punish landed. Mechanically distinct from the player's Stillpoint,
thematically twinned, and now explained in-fiction rather than arbitrary: an earlier
loop's version of the same idea, in a Sovereign old enough to remember inventing it.

## The Crag of the Colossus

A side region, spatially and narratively separate from the Sovereign's story — an
independent tragedy, not one of her doing, with its own small shape. **"Side" describes
its story, not its importance to progression** (clarified 2026-07-14, see
`regions.md`'s Side-branches section) — Charged Attack, its reward, is intended to be
mandatory. The player is meant to face this region's own unrelated tragedy as a required
stop, not skip straight to the Sovereign's — a deliberate structural choice, not an
oversight:

> "The crag does not yield to a light hand. Strike as though you mean to end something." —
> `lore_ce1`, *crag_entrance*

> "Something split this stone in one blow. We have been trying to understand the blow ever
> since." — `lore_cb1`, *crag_breach*

> "We gave the crag a heart of crystal so it would remember how to stand. It remembers too
> well." — `lore_ca1`, *crag_altar*

**Revised 2026-07-22 — the miniboss is a person, not a construct; renamed Crag Warden
(display/lore name only — the built code class stays `ColossusCore`, no code rename
needed).** He was the ruthless, merciless head of the crag's mining operation — evil-by-
choice, not a tragedy, placed on the moral axis alongside The Mirror King and Quantum
Pursuer. Obsessed with total control over his operation, he fused himself with the crag's
own "heart of crystal" tech (the same crystal referenced in the fragments below) to make
himself physically unstoppable — which is where his fight's existing "super armor,
Charged-Attack-only vulnerability" comes from: not a construct's design spec, a person's
deliberate self-augmentation. It worked too well, the same "built to last" thesis as
everywhere else in this section, just chosen for himself instead of built for someone
else. He'll drive the player into the ground hard enough to require a mash-to-escape
prompt if it lands.

## The guards (confirmed 2026-07-21)

The rank-and-file enemies outside miniboss chambers are the shelter's remaining security
staff and constructs, running standing orders to repel intrusions into a resource-starved
system with nothing to spare on strangers. Deliberately **not signaled as sympathetic or
evil, either direction, by default** — the player shouldn't read every fight as a small
tragedy, that doesn't survive 26+ enemy types at scale and would flatten into wallpaper.
They're ambiguous by design. Real information about who they were comes only through
occasional, specific environmental moments (a found recording, a half-written note near a
body) — not through how the fights themselves are staged. Weapon variety is the enemy
roster's actual difficulty axis going forward: base guards carry whatever the shelter can
mass-produce (sidearms, tasers, thrown charges); the closer to a given scientist's own
lab, the more that scientist's specific weapons research shows up in what's defending it.

## Minibosses & their regions (rewritten 2026-07-22 — see revision history for what changed)

**Reframed 2026-07-21, moral axis resolved 2026-07-22**: each of these is a senior figure
from the shelter's war program. Per direct instruction, **not all of them are victims of
circumstance** — desperation under an endless war explains some of them, but several
*chose* cruelty when they didn't have to, and that's worse, not more sympathetic. Full
placement:

- **Willing / evil-by-choice** (played as antagonists, not tragedies — cruelty was a
  choice, not just a consequence of the war): **The Mirror King** (hierarchy-obsessed,
  treats even his own copies as disposable labor to stay on top), **Quantum Pursuer**
  (uses the shelter's own lower-class citizens as disposable soul-fodder for her own
  power, not survival), **Electromagnetic Golem's controlling scientist** (actively
  sabotages outside communication — that's obstruction, not desperation), the new
  Timeline Crossroads figure (see below — wanted the child to fail, weaponizes a whole
  prison system against the player), **Crag Warden** (see the Crag section further down
  — ruthless and merciless by the region's own words, not tragic).
- **Genuinely sympathetic**: **Temporal Warden** (guilt-driven; becomes the ally),
  **Fractured Sovereign's Guard** (loyalty with no one left to be loyal to).
- **Open — not yet placed, deliberately**: The Assembler, The Conduit, the new Void
  Expanse figure. Don't default any of these to sympathetic or evil without a direct call.

**Scope, revised 2026-07-22**: previously capped at two moveset instances per miniboss
(base game + Sovereign postgame). **Raised to three, confirmed acceptable** — a third,
Loop-ending (child NG+) variant is now in scope, since once a miniboss's base kit exists,
producing a reskinned/reflavored variant is cheap. Still never a randomized/per-run
system — exactly three fixed, canonical instances, no more.

Per direct instruction: **most of these are independent tragedies (or independent
villainies), not things the Sovereign personally did.** She fought her own war; she did
not personally cause every region's ruin. One exception is called out explicitly below
(Graviton Core), because its miniboss is literally named after her and that connection is
the point of that one fight. The rest are the world's *own* wreckage, or the world's own
cruelty — proof the long war produced both kinds on its own, without her personally
touching either.

Shared rule where it still applies (evil-by-choice entries below are a deliberate
exception to it, not a failure to apply it): each sympathetic entry is a variation on
**"something built to last, and what happened when it couldn't"** — never a
Sovereign-sized answer, never the same shape twice.

### Mirror Veil — The Mirror King *(evil-by-choice)*
A section chief in the shelter's command hierarchy — one of many mid-tier officers who
ran their own wing with total authority and answered to nobody but the Sovereign. He uses
duplicated copies of himself for weapons research and combat both, and enforces a strict
hierarchy that keeps the "original" him at the apex over every copy — vanity and control,
not survival necessity; other officers ran labs without doing this. To enter it at all,
you have to fight and beat a mirror copy of *yourself* first, which is very much the
point: this is a boss who makes you prove you can out-compete a version of you before
he'll bother taking you seriously. Once the real him goes down, his surviving copies don't
mourn him — they immediately turn on each other for what's left of his authority, which
is where Phase Dash comes from (see `regions.md`'s ability-grant table — Mirror Veil
Sanctum has granted Phase Dash for a long time; this was never a new change, just
clarified). (His own title, "King," is a self-styled affectation, unrelated to the
Sovereign's — he is not part of the Sovereign/Warden/child identity loop.)

### Event Horizon — Gravity Collapse Core *(accident, no moral agent — stays as-is)*
Not a command wing, a mine — this sub-level extracted raw gravitic material that fed the
Sovereign's war effort (siege engines, anti-gravity transports, the infrastructure of the
war program, though the Sovereign never set foot here herself). Late in the war, the
extraction core's containment failed and it became a self-collapsing singularity,
endlessly pulling in debris — and everyone who worked it. What's left isn't malicious;
it's a resource operation that outlived the chain of command that ordered it and never
received a shutdown order, still "extracting" by pulling in whatever's nearby. Now a
massive flying construct that changes the room's gravity in any of the four directions
and generates its own moving-platform constructs to fight from.

### Chrono-Space Rift — Temporal Warden *(sympathetic)*
The monastic order that hid the player's Stillpoint from the Sovereign (see the
Stillpoint section above — this is that room) had one member assigned to guard the secret
forever: its eldest keeper. **Expanded 2026-07-22**: he's also the one who gave the
player their own respawn mechanism — the "rewind clock" behind the game's whole
checkpoint/anchor system (you never really die, you rewind to the last checkpoint) is his
doing, not an abstract game-system convenience. He uses the same forbidden time-magic on
himself, on a repeating countdown, to keep resetting this small closed world and buy more
time for it and for himself — driven by guilt, not ambition, and he deliberately spares
the player his true strength rather than fight at full power. His own love was taken by
the new Void Expanse figure (below); once the player frees her, he owes the player a real
favor — the closest thing to an ally in this world. A guardian who outlived his own
victory, still paying a debt he doesn't need to.

### Graviton Core — Fractured Sovereign's Guard *(sympathetic — the one direct exception)*
Explicitly one of the Sovereign's own — an elite soldier posted here specifically because
Graviton Surge's source was valuable enough to guard personally. He's still doing his
job: holding this outpost, waiting for reinforcements and orders that stopped coming when
the command chain above him finally went dark. He seems aware, on some level, that
something looped — his own dialogue can gesture at it without ever being direct about
what he means. Not a tragedy of vanity or overreach like the evil-by-choice entries above
— a tragedy of loyalty with no one left to be loyal to. Fighting him is the closest the
player gets to fighting a piece of the Sovereign herself before the actual throne room.

### The Polar Shift — Electromagnetic Golem, directed by an unnamed scientist *(scientist: evil-by-choice)*
A remote mining wing, far enough down the shelter's tunnel network that it fell outside
the Sovereign's routine oversight — its own small crew solved their own problems
(collapses, scavenger intrusions from other under-supplied wings) by building a magnetic
automaton to defend the tunnels. **Revised 2026-07-22**: that automaton isn't
unattended — a scientist still directs it personally, from above, during the fight
itself. She supplies a significant share of the shelter's weapon tech, which the war
alone would explain — what doesn't is that she also actively jams outside communication
for anyone trying to reach this closed world from beyond it. That's sabotage, a choice,
not a desperate wartime measure, which is why she's placed as evil-by-choice rather than
tragic. The golem itself still reads as a tool of hers rather than a tragedy in its own
right.

### Echoing Abyss — Quantum Pursuer *(evil-by-choice)*
This region's whole mechanic is that your own dashes and attacks leave lingering echoes
you can stand on — so its miniboss is what happens when someone weaponized that idea
against other people. **Revised 2026-07-22**: not a lone griever trying to preserve
someone lost — a scientist who used the shelter's own lower-class citizens as
experimental bait, collecting their souls to fuel her own power, trying to ascend past
limits no one else's soul was ever meant to survive. She releases a delayed, half-second
shadow of the player's own soul to force constant movement, while charging
soul-powered weaponry from range. This is exploitation of people who couldn't refuse her,
for her own ends — not desperation, not grief. Placed as evil-by-choice, not tragic.

### Paradox Engine — The Assembler *(open — not yet placed)*
**Revised 2026-07-22**: not an abandoned automaton running on a directive nobody
remembers — the creator herself is still here, still actively maintaining every warp
field and portal gate in the shelter, and she's who you actually fight. Whether that's
someone trapped by her own usefulness to the war machine, or someone who's simply kept
doing this because it's what she's good at and never questioned it, is left open on
purpose. She fights with real warp speed and portal openings, punishing anything but
patient, cooldown-timed openings — and drops a Warp Key on defeat, real postgame utility,
not just a trophy.

### Warp Gate Nexus — Warden & Hollow *(sympathetic — dutiful, not cruel)*
Two gatekeepers, stationed as a pair specifically because a single gatekeeper could be
overwhelmed and a pair could always cover each other's blind spot — one built to counter
close-range intrusion, one built to counter ranged. Their entire purpose was mid-shift
when the war finally reached this far: testing travelers before letting them through to
wherever this Nexus led. The travelers stopped coming. The all-clear to finally stand
down never arrived. They are still testing whoever walks in, because from where they
stand, their shift never technically ended. Read as faithful rather than cruel — this is
diligence outliving its purpose, not malice.

### Static Field — The Conduit *(new 2026-07-13, added by `floor_plan.md`; open — not yet
placed; guards this region's Fracture Pip, Room 2 — no ability attached, Magnet Climb was
removed 2026-07-14)*
A self-sufficient utility wing (not under the Sovereign's direct command, same rule as
the rest of this section) tapped the level's raw electrical discharge for power the
honest way: a grounding construct built to safely bleed dangerous current out of the air
and into the earth, so the wing above could run on what would otherwise have arced
through its own quarters. **Revised 2026-07-22**: like The Assembler, this isn't an
abandoned directive — the creator (a scientist responsible for much of the shelter's
weaponry and electronics) is still here and still working, fighting with raw electricity;
a second phase weaponizes the electroweak interaction itself, slowly decaying the player
over time. Whether she's a victim of her own usefulness or someone who chose to keep
building weapons regardless is left open, same as The Assembler.

### Timeline Crossroads — proposed name **"The Stationmaster"** *(new 2026-07-22,
replaces the earlier Crystalline Warden assignment — evil-by-choice; name is a proposal,
not locked)*
One of the scientists who ordered the child's creation in the first place — and wanted
her to be a failure even then. He controls most of the shelter's internal transit routes
and runs a large prison at Echo Bridge. The moment the player is found with the child, he
has the player arrested specifically so he can take her — this is a real, staged plot
beat (a prison-break sequence), not a metaphor. He also stole the Void Tether from the
Void Expanse's own guardian (below), wrongly convinced it's unusable — which is exactly
why he still went through with the theft rather than leaving it alone; he wanted it
regardless of whether he understood it. Fights using trains, locomotives, and
brainwashed prisoners (who can be killed by his own other attacks, not just the player's)
— flying, knockback-resistant vehicles tearing through the arena. Defeating him grants a
real, working (if limited) Void Tether on the spot — see `story.md` §4 for the corrected,
no-longer-two-stage-gated mechanism.

### The Void Expanse — proposed name **"The Undertow"** *(new 2026-07-21/22 — open, not
yet placed on the moral axis)*
The child of a scientist obsessed with darkness, now merged with it. Took over the Void
Expanse and steals what people hold dearest — it's the one who took the Temporal Warden's
love, and will take the player's own companion (or ally) too, if brought here. Fights
with void attacks and projectiles, and can teleport/fast-travel through the void itself
at will. If the player already holds the limited Void Tether from The Stationmaster,
defeating this figure completes it (full range, no charge limit) and opens a one-time
opportunity to reassign lore pips. Deliberately left off the moral axis for now — "merged
with darkness" reads as closer to tragic/corrupted than willingly cruel, but it's
someone's stolen loved ones on the line, so don't default to sympathy either.

### Sovereign's Army Reserve — The Sovereign's Army *(not an individual — a horde
gauntlet, new 2026-07-22)*
Not a named miniboss — a large room of dangerous guards, the same guard cloned over and
over, frozen in time many loops ago by a much earlier Sovereign. They have no will left
but to fight; there's no one here to place on a moral axis, they're closer to a hazard
than a character. The player has to clear a long horde of them, mixed ranged and melee, to
reach the Limit Break beyond.

### The Antechamber — The Child *(new 2026-07-22 — status: BUILT 2026-07-28,
now the sole "lost the child" consequence — see resolution below)*
The Stationmaster's prison-break sequence (above) is a fixed story beat that happens
regardless of how she's eventually lost — so by the time the player permanently loses
her, whichever way that happens (the final door, Void Tether abandonment, or the break
itself), the same escaped prisoners are already out there to take her in. She isn't lost
the way she is everywhere else in the game: they protect her, and by the time the player
reaches the Antechamber she's grown up among them, their de facto leader, fighting with
tasers, flamethrowers, bombs, and guns scavenged and stolen from guards over the years.
Three phases: alone; then calling other former prisoners to her aid and occasionally
healing them; then a rage-boosted final phase.
**Resolved 2026-07-28 (user direction), option (a) below:** this fight *replaces*
Abandoned Shell entirely as the one canonical "lost the child" consequence — it now
carries the Absorb/Spare choice and Collapse/Loop endings (`game_update.js`'s
`antechamber_child` miniboss-death branch, `cutscene.js`'s `antechamber_child_ending`).
Abandoned Shell itself wasn't deleted — it was relocated to Hollow Core and made
unconditional (every playthrough fights it there now, regardless of the child's fate;
see `story.md` §5's updated status). Built as `ANTECHAMBER_CHILD_DEF`/`TheChild` in
`game/enemy.js`, wired into the `antechamber` room. The two options that used to be open
here, for the record: (a) this fight *replaces* Abandoned Shell entirely — **picked** —
or (b) they're two different consequences for two different ways of losing her — Void
Tether/final-door abandonment still leads to Abandoned Shell, while being specifically
separated from her during the Stationmaster's prison break leads to this fight instead —
**not picked**.

## Region lore — the place itself (added 2026-07-14)

The section above covers *who* haunts each region (mostly independent tragedies, one
Sovereign exception). This section covers *what the place was* — the site itself, before
whatever happened to it. Kept short: most regions' "what it was" is already implied by
their miniboss write-up (a mine, a monastery, a mining wing, a war-machine
assembly line) and doesn't need restating. Only regions where the place itself carries
information the miniboss section doesn't cover get a full entry below; the rest get a
one-line cross-reference so this section stays a complete index of all 13 without
repeating itself.

**The Observatory** *(no miniboss)* — Literally what it sounds like: a Sovereign
watch-post, not a military one — she has some form of perception that senses
hidden/anomalous things (see "The Sovereign's vision" above), and this is where she
stood to use it, watching the shelter for exactly the kind of anomaly she couldn't
otherwise see coming. The region's low gravity isn't set-dressing; it's what's left of
whatever let her perception reach as far as it needed to from a single fixed point —
verticality as a literal metaphor for oversight. Sovereign's Observatory, its deepest
room, is that same vantage point in the game's present: she isn't watching the whole
shelter from it anymore, she's watching for the one anomaly (the child) that was always outside
her frame — which is exactly why finding this room and its payoff lands as more than a
fast-travel unlock; it's arriving at the seat of the hunt itself.

**The Void Expanse** *(no miniboss)* — Not a mine, not a command wing, not a barracks — a
site that took the worst of the war's late-stage weapons testing and never stopped
showing it. Nothing solid survived the shelling intact — every platform is a chunk of
debris still frozen mid-collapse, which is why timing (not positioning) is the whole
traversal puzzle. The single most damaged place in the shelter, full stop — no bigger
event needed behind it than "this is where the fighting was worst."

**The Inverted Spire** *(no miniboss)* — A relay tower, built by the Sovereign's own
logistics chain specifically to keep Graviton Core (the adjacent region, same Gravity
cluster) in contact with the rest of the shelter's command chain — orders in, gravitic
material out. Its
foundation anchor was rated for a lot; it wasn't rated for a direct hit. It failed
catastrophically and the whole structure inverted, permanently — "up" and "down" swapped
the instant it broke, and stayed that way. The relay beacon at its heart, unlike the
tower around it, never lost power: it is still broadcasting orders into a command
structure that no longer exists, from a tower that no longer has a "top" to broadcast
from. Sovereign infrastructure, like Graviton Core, but automated rather than staffed —
no guard here, no exception to the "independent tragedy" rule; the tragedy is that it
outlived every recipient of what it still sends.

## A thread through all 13 regions (added 2026-07-14 — direct request; trimmed this pass)

**The problem, stated plainly**: only 4 things in the whole game touch the main plot —
meeting the child (Echo Bridge), the choice about her (Timeline Crossroads), meeting the
ally (Chrono-Space Rift), and the final boss. The other regions' "independent tragedy"
framing (deliberate, 2026-07-12) reads as *disconnected* rather than *thematically
consistent* once there are 13 of them. Fix: one thread runs through every region, layered
on top of each one's own local tragedy (below), not replacing it. **Removed this pass**:
the old second thread ("One Fracture, not many," a found-object callback to a founding
event) — there's no founding event for it to call back to anymore, see the "fracture"
section near the top of this doc.

- **The Hunt.** The Sovereign is searching the shelter for an
  anomaly she can't perceive (established at Upper Ruins/Antechamber). Every region now
  carries one small piece of evidence that she already searched *here* — usually evidence
  she came up empty, sometimes (2 regions, below) evidence of *why* she came up empty.
  This doesn't require new content in the regions that already ARE the hunt (Sovereign's
  Observatory, The Inverted Spire) — those two stay as written.

Two regions carry a **second**, heavier thread on top of the above, because their own
mechanic is already the closest sibling to the endgame's identity-loop reveal —
Chrono-Space Rift (the ally's own repeating death) and Echoing Abyss (recursive echoes),
called out below.

### Mirror Veil
*Local (unchanged, see above)*: the Mirror King's self-duplicating vanity magic never
stopped copying. **Hunt**: her search-light, refracted through thousands of mirrors,
produced thousands of false positives instead of one clean answer — the one region that
didn't just go unchecked, it actively defeated her method. She marked it unreliable and
hasn't returned.

### Event Horizon
*Local*: a war-supply gravitic mine, containment failed, still extracting. **Hunt**:
search-probes she sent in were pulled into the collapse with everything else; their
beacon lights are still visible, falling, forever transmitting "searching" and never
"clear."

### Chrono-Space Rift
*Local*: the Temporal Warden, resetting his own death forever, watch already won without
knowing it. **Hunt**: this is the one region she'd search personally if she could — it's
where the stolen Stillpoint was actually hidden — but the Warden's own time-loop makes
the whole region read as noise to her perception, the same instability that's kept her
out is what's kept the theft secret. **Second thread**: the Warden's own repeating death — undo,
reset, never let it stick — is a small, mortal rehearsal of the identity loop the whole
game turns out to be about. He doesn't know he's foreshadowing it; the player, on a
second look back at this region after the ending, should be able to see that he was.

### Graviton Core
*Local*: the Fractured Sovereign's Guard, one of her own, still holding the post *(the
one direct Sovereign-thread exception — unchanged)*. **Hunt**: doesn't need invented
evidence — this is the one place her command structure never fully died, the closest
thing to her actual current reach outside the throne room itself.

### The Inverted Spire
*(unchanged from the existing entry above — its relay beacon still broadcasting search
orders IS the Hunt thread at full strength; no addition needed.)*

### The Observatory
*(unchanged from the existing entry above — this region IS her literal watch-post, the
Hunt thread's own home; no addition needed.)*

### The Void Expanse
*(unchanged from the existing entry above — the war's worst-hit site, self-explanatory;
no addition needed.)*

### Warp Gate Nexus — Warden & Hollow
*Local*: two gatekeepers testing travelers, shift never technically ended. **Hunt**: what
they were built to do — test and clear travelers, one by one, methodically — is a small,
mundane ancestor of exactly what the Sovereign now does full-time across her whole
domain. The connection isn't coincidental in-fiction so much as thematic: her present
hunt is the same protocol, just with nobody left to relieve her of it either.

### The Polar Shift
*Local*: the Electromagnetic Golem, defending mining-tunnels that outlived
their crew. **Hunt**: the one region where the evidence is *absence of a search at
all* — this crew solved their own problems and never drew her attention, a different
and colder kind of unseen than everywhere else she looked and found nothing.

### Paradox Engine — The Assembler
*Local*: an automated war-matériel constructor with no stop condition. **Hunt**: buried in
its still-running order queue, unfinished, is a batch labeled for detection-array
components — if it ever completes its backlog, it would hand her, unknowingly, exactly
the tool she's missing to finally perceive the child. Not yet triggered; a live thread,
not a resolved one.

### Static Field — The Conduit
*Local*: a power-grounding construct that can't tell people from stray current anymore.
**Hunt**: its map-overlay corruption doesn't just glitch the player's own map — it
scrambled her tracking data too, the same accidental sabotage as Mirror Veil's mirrors, a
second region that blinds her without meaning to.

### Timeline Crossroads
*(otherwise unchanged from the existing entry above — this is already the single most
connected region: home of the child-choice beat and (updated 2026-07-22) The
Stationmaster/Void Tether fight, replacing the earlier Crystalline Warden. Already
fulfills the thread by virtue of being load-bearing plot, not scenery.)*

### Echoing Abyss — Quantum Pursuer
*Local*: a grief-driven recursive echo, split fully autonomous, endlessly copying whoever
it meets. **Hunt**: her search parties that entered here got copied too — several of the
region's echo-copies are, per their silhouette and gait, unmistakably her own search
personnel, still moving, still searching, permanently. **Second thread**: call this out directly to the player if there's ever a
late-game or postgame text/vision moment available — this region's whole premise (a
person who didn't want to stop being themselves, copied instead of ended, now recurring
forever) is the closest single-region metaphor for the Sovereign/Warden/child identity
loop in the entire planned world. Worth a knowing nod once the ending's been seen (e.g. a
NG+ visual difference here specifically), not required for a first playthrough to land.

## Reading order

The fragments are written to be found roughly in this sequence (mirrors the intended
play order, `col`/`row` in `area.js`):

1. `lore_f1` — the_fracture — a war memorial mural, meaning unclear until the ending
2. `lore_eb1` — echo_bridge — an ordinary war-collapse, frozen mid-fall
3. `lore_ur1`, `lore_ur2`, `lore_ur3` — upper_ruins *(optional branch)* — who the
   Sovereign is, and why her own certainty is the thing to fear
4. `lore_cc1` — crystal_cavern — the blast radius, repeating again, differently
5. `lore_tf1` — the_forge — her arc stated directly (nothing here was ever allowed to bend)
6. `lore_tv1`, `lore_tv2` — the_vault — the one Stillpoint that was stolen back from her
7. `lore_tr1` — the_rift — thesis restated as a platforming beat
8. `lore_ac1`, `lore_ac2` — antechamber — she knows something is loose in her ruins, and
   she is hunting it
9. `lore_ce1` (crag_entrance), `lore_cb1` (crag_breach), `lore_ca1` (crag_altar)
   *(optional branch, any order)* — the Crag's self-contained echo of the main theme,
   deliberately unconnected to her

Miniboss/region lore (see section above) is read on arrival at each region rather than in
a fixed sequence — none of it is plot-critical the way the Sovereign's own thread is, so
no ordering constraint applies beyond "found when that region is found."

## Visual effects per fragment (roadmap 1.9/1.10 — replaces the old text quotes)

Per direct instruction: **fragments are not displayed as text at all, ever** — the
paragraphs above are internal scripts for what each beat *means*, not what the player
reads. What the player gets on pickup is a specific visual, placed at the location the
fragment already occupies in `area.js`. Ignore the old quoted lines entirely; this table
is the actual spec. `Mode` is which of roadmap 1.10's two available treatments it gets:

- **Cutscene** — full stop, ~2-3s, screen-filling image/silhouette, game resumes after.
  Reserved for plot-critical Sovereign-thread beats (her own motive/actions) — the ones
  that can't be missed or half-seen without losing the throughline.
- **Overlay** — roadmap 1.9's existing non-blocking treatment (player keeps moving),
  used for everything that's texture/world-building rather than plot-critical.

| id | Region | Visual (what actually plays) | Mode |
|---|---|---|---|
| `lore_f1` | the_fracture | Wide shot: a mural or memorial carved into the room, a single point of light at the center of a silhouetted skyline, holding — then the skyline cracks outward from it like glass. No caption, no explanation offered — it reads as war-memorial art until the ending recontextualizes it as the exact shape of the loop's reset. | Cutscene (unexplained on first sight; its real meaning only lands in hindsight, after the ending) |
| `lore_eb1` | echo_bridge | A bridge silhouette caught mid-collapse, frozen at the exact frame it broke, dust suspended in the air around it — an ordinary casualty of the war, not a cosmic one. | Overlay |
| `lore_ur1` | upper_ruins | A throne room, seen from behind rows of kneeling silhouettes, the Sovereign's silhouette raising a single glowing Stillpoint shard overhead. | Overlay |
| `lore_ur2` | upper_ruins | Close on the Sovereign's silhouette addressing a crowd — the crowd's silhouettes nodding, agreeing, some visibly relieved — before the frame freezes and cracks like `lore_f1`'s skyline. | Overlay |
| `lore_ur3` | upper_ruins | The Sovereign's silhouette alone in a fragment of the throne room, turning slowly as if scanning — the "camera" (player's implied POV) is the thing being scanned for. | Cutscene (first direct sense that she's looking for *you*) |
| `lore_tf1` | the_forge | Rows of identical barrier-silhouettes being stamped out on a forge line, each one glowing then going rigid/dark — ending on one specific barrier cracking under stress it was never designed to flex under. | Overlay |
| `lore_tv1` | the_vault | A hooded silhouette pocketing a single glowing shard from a table full of identical shards moments before armored silhouettes seize the rest — the pocketed one is never found. | Cutscene (the player's own Stillpoint's origin — plot-critical) |
| `lore_tv2` | the_vault | The same hooded silhouette, now alone, setting the shard down gently in what becomes this exact room, then walking away into darkness. | Overlay |
| `lore_ac1` | antechamber | The Sovereign's silhouette standing over a fragment of a broken map, one hand slowly closing over a region that has no light left in it — searching. | Overlay |
| `lore_ac2` | antechamber | A small silhouette (the child) slipping between two of the Sovereign's searching light-beams untouched — the beams sweep back, missing her by inches, again. | Cutscene (establishes the hunt that pays off in story.md's endings) |
| `lore_ce1` | crag_entrance | A single crystalline heartbeat-pulse deep inside solid rock, faint, rhythmic — no Sovereign imagery at all (Crag is intentionally disconnected from her thread). | Overlay |
| `lore_cb1` | crag_breach | The moment of the crag splitting: one clean, sourceless line of light bisecting the stone, then the pulse from `lore_ce1` flooding into the new crack. | Overlay |
| `lore_ca1` | crag_altar | The crystal heart being lowered into the crag's core by unarmored, non-military silhouettes (contrast with `lore_tf1`'s military forge line — this was builders, not soldiers), the crag visibly straightening/healing around it. | Overlay |

Two more fragments referenced in earlier drafts of this doc (`lore_cc1` in crystal_cavern,
`lore_tr1` in the_rift) are **not yet real `area.js` entries** — `crystal_cavern`/`the_rift`
currently have empty `loreFragments: []`. Proposed for whenever they're added:

| id (proposed) | Region | Visual | Mode |
|---|---|---|---|
| `lore_cc1` | crystal_cavern | A field of identical crystals, each one holding a frozen instant of ordinary life (a hand mid-reach, water mid-drip) — camera drifts past dozens before settling on one that's empty, its instant already gone. | Overlay |
| `lore_tr1` | the_rift | A single figure's silhouette walking forward across a gap that keeps widening one step ahead of them, never closing, never quite failing either. | Overlay |

## Lore Pip visuals — the 13 planned regions + Vault Room 2 + Hollow Core (added 2026-07-14)

Per your request: derived from the region lore and miniboss lore above, not invented
independently — each visual either restates that region's write-up in one image or
shows the specific moment that write-up describes. Locations and pip counts per
`floor_plan.md`/`regions.md`'s superseded Lore Pip table (15 total: 13 in the planned
regions — Static Field carries none — plus 2 more on the origin spine/endgame). None of
these rooms are built yet (see roadmap.md Phase 9/10), so these ids are proposed, same
status as `lore_cc1`/`lore_tr1` above — write the actual visual-effect code from this
table once each room exists. Same two-mode system as the built fragments: Overlay by
default, Cutscene reserved for plot-critical Sovereign-thread beats.

| id (proposed) | Location | Visual | Mode |
|---|---|---|---|
| `lore_mv1` | Mirror Veil, Reflection | A hall of mirrors, each reflection performing an ordinary motion (bowing, working, laughing) as though still serving a court — except one mirror, which shows only an empty room, one frame before it too fills with a reflection certain it's the true one. | Overlay |
| `lore_eh1` | Event Horizon, Drift | Rows of siege-engine and transport-husk silhouettes drifting slowly toward a single point of absolute black at the frame's center, each losing its outline the closer it gets. | Overlay |
| `lore_csr1` | Chrono-Space Rift, Loop, Part 2 | A hooded silhouette kneeling before a sealed vault door, rising, then the frame cuts an instant before whatever happens next — and restarts from the kneel. Doesn't resolve here; pairs with the Temporal Warden fight in the Sanctum, this region's miniboss. | Cutscene (foreshadows the ally reveal — see "The Sovereign's vision" above) |
| `lore_ob1` | The Observatory, Room 2 | A ring of dead watch-apertures set into a low-gravity shaft, flickering alive one at a time as the player rises past — each briefly showing an unrelated, ordinary scene from elsewhere in the shelter before dying again. | Overlay |
| `lore_so1` | Sovereign's Observatory *(the region's capstone payoff)* | The Sovereign's silhouette alone in a vast chamber ringed floor-to-ceiling with identical watching apertures, all turned outward except one — small, at the room's exact center, turned inward on herself — and she has not noticed it's there. | Cutscene (plot-critical Sovereign-thread beat — where and how she watches) |
| `lore_ve1` | The Void Expanse, Room 1 | A field of debris tumbling in total silence, each chunk holding one frozen mundane instant (a falling cup, a hand mid-reach for a door) — camera drifts through; nothing ever completes its motion. | Overlay |
| `lore_wgn1` | Warp Gate Nexus, Room 2 | Two silhouettes flanking an empty gate frame, checking a device between them that should have run out counting down a shift, and hasn't — still waiting for a stand-down signal. | Overlay |
| `lore_is1` | The Inverted Spire | A relay beacon pulsing outward from the tip of an inverted tower, on schedule — the "camera" follows the pulse into empty silhouetted sky, reaching nothing, and firing again anyway. | Overlay |
| `lore_pe1` | Paradox Engine, Room 2 | An assembly line of half-finished siege-part silhouettes rolling past empty overseer stations, each part completed and added to an already-towering, purposeless stack. | Overlay |
| `lore_ps1` | The Polar Shift, Room 2 | A mining camp under raid; a magnetic automaton silhouette rises between camp and raiders, the raiders scatter, the camp cheers — then the frame ages forward fast, camp silhouettes fading out one by one while the automaton keeps standing guard over tunnels with no one left in them. | Overlay |
| `lore_gc1` | Graviton Core, Room 3 | An armored silhouette rigid at his post, a horizon behind him where reinforcement silhouettes never arrive, a console beside him frozen mid-sentence on an order he's still, technically, waiting to finish reading. | Cutscene (the one direct Sovereign-thread miniboss — same reservation rule as the built fragments) |
| `lore_tc1` | Timeline X Roads, Room 2 (Timeline Crossroads) | Two overlapping images of the same corridor sliding past each other like a slipping film reel — one crumbling silhouette, one gold-tinted and intact — never quite aligning. | Overlay |
| `lore_ea1` | Echoing Abyss, Room 2 | A silhouette walking forward, leaving a trailing copy at every step; the copies keep walking after the original stops, overtaking and surrounding it, all reaching for each other, none quite arriving. | Overlay |
| `lore_tv3` | The Vault, Room 2 | The same hooded silhouette from `lore_tv1`/`lore_tv2`, returning once, much later, to check the hidden shard is undisturbed — finding it exactly as left, and walking away without taking it back. | Overlay |
| `lore_hc1` | Hollow Core | A vast cavity at the world's own spatial center, walls lined with every fused Stillpoint she ever took, each still dimly holding its frozen instant — and at the center, one socket, dark, empty, sized for exactly one more. | Cutscene (plot-critical — the Sovereign's true prison, ties to the Antechamber/Boss Arena loop reveal) |

## Notes for whoever builds the display system

- Don't dump these as dialogue boxes — nothing here is text/inscriptions anymore; it's
  all silhouette/still-image visual per the table above. Match `cave_design_plan.md`'s
  "background landmarks" approach for placement (found near the location, not shoved in
  front of the player), but the payload itself is now purely visual.
- `upper_ruins` and the Crag fragments are the only ones gated behind an optional branch —
  they're allowed to go unread by a player who beelines the spine. Don't gate anything
  plot-critical (the Sovereign's motive and current goal, the Stillpoint's origin, the
  hunt for the child) behind 100%-optional content — per the table above, exactly those
  beats (`lore_ur3`, `lore_tv1`, `lore_ac2`) are marked Cutscene specifically so they
  can't be missed or half-seen the way an Overlay could be while running past.
- The 8 planned-region miniboss write-ups above are NOT yet backed by real `AREAS`
  entries (only Mirror Veil, Event Horizon, and Chrono-Space Rift exist as built rooms —
  see roadmap.md Phase 9) — treat this section as the content to write actual
  visual-effect beats FROM, once each region gets built, not as fragments that already
  exist anywhere. Same two-mode system applies: default to Overlay, reserve Cutscene for
  Graviton Core's Fractured Sovereign's Guard (the one direct Sovereign-thread miniboss).
  Now 9 minibosses, not 8 — Static Field's Conduit was added 2026-07-13 by `floor_plan.md`
  — see "Region lore" and the Lore Pip table above for its content.
- Implementation note, updated 2026-07-29 (roadmap.md Phase 28): the plumbing for this
  table now exists. Each `loreFragments[]` entry has a `mode` field —
  `'overlay'` (default, the original generic amber vignette pulse, `lorePipEffect` in
  `game_update.js`), `'cutscene'` (calls a real `playCutscene(lf.cutsceneId)` script —
  the "full game-loop pause" this note used to flag as unbuilt already exists via
  `cutscene.js`'s existing `gameState = 'cutscene'` input-lock, so no new engine work was
  needed there), or `'none'` (no visual effect — the Extra/Customization Pips from
  `regions.md`). `editor/levelEditor.html`'s Lore Pip panel can set all three. **Still not
  done**: writing the actual per-fragment `text`/`cutsceneId` content from this table into
  `area.js`'s real pip entries once each room is built — this table is still the content
  spec, the code now just has somewhere to put it.
- Core principle carried over from the previous version: lore is felt and seen, not read.
  Text pop-ups stay permanently disabled (`LORE_ENABLED = false`).

## Revision history

- **2026-07-22 — full miniboss redesign pass from the user's own redone spec (a table
  covering every miniboss's core tragedy, style of attack, and abilities).** Style-of-
  attack/abilities detail lives in `expansion.md`'s Phase 4 table, not duplicated here in
  full — this doc keeps the tragedy/moral-axis framing, `expansion.md` keeps the fight
  spec. Summary of what changed: (1) **Moral axis resolved** — Mirror King, Quantum
  Pursuer, Electromagnetic Golem's scientist, the new Timeline Crossroads figure, and Crag
  Warden are now explicitly evil-by-choice, not tragic; Temporal Warden and Fractured
  Sovereign's Guard stay sympathetic; The Assembler, The Conduit, and the new Void Expanse
  figure stay deliberately open. (2) **Assembler and Conduit are now live people**, not
  automatons whose creators are gone — both still actively work the systems they built.
  (3) **Crag of the Colossus's miniboss is a person** (renamed, display-only, "Crag
  Warden"), not a non-sapient construct — he fused himself with the crag's own crystal-
  heart tech for control, not survival. (4) **Timeline Crossroads gets a new miniboss**
  (proposed name "The Stationmaster"), replacing the earlier Crystalline Warden
  assignment — ties the child's origin, a prison at Echo Bridge, and the Void Tether theft
  together. (5) **Void Expanse finally has a miniboss** (proposed name "The Undertow"),
  resolving what was previously a "no miniboss" region — holds the Temporal Warden's
  stolen love and the real, completable Void Tether. (6) **Void Tether is no longer a
  single-fight grant** — see `story.md` §4's matching update: the Stationmaster's defeat
  grants a real, working, limited version immediately (so the permanent-sacrifice choice
  is rewarded on the spot, per direct user concern about disappointing that choice); The
  Undertow's defeat completes it. (7) **Scope raised from two to three moveset instances
  per miniboss** (base game, Sovereign postgame, and now a Loop-ending/child-NG+ variant)
  — confirmed acceptable since a base kit makes variants cheap. (8) Added Sovereign's Army
  Reserve as a horde gauntlet (not an individual) and a new Antechamber "grown Child"
  fight, whose conflict with the existing Abandoned Shell fight was **resolved
  2026-07-28**: the Child fight replaces Abandoned Shell as the canonical "lost the
  child" consequence; Abandoned Shell was relocated to Hollow Core as its own
  unconditional fight instead. (9) Documented the final
  boss's actual phase structure (precog phase 1, full-kit-minus-Stillpoint phase 2,
  Stillpoint-plus-immunity phase 3, missing Graviton Surge, corrupted Void-Tether pull)
  matching what's already built in `boss.js`.
- **2026-07-21 (later still) — removed "the Fracture" as a founding cosmic event, per
  direct user pushback.** Three problems, raised directly: (1) a "founding event" doesn't
  cohere with a loop that has no first iteration; (2) the postgame was on track to require
  the player to literally re-cause it, which is awkward to build; (3) it no longer matched
  the rest of the lore once the world was corrected to "one mountain shelter," not a
  spacetime-fragmented multiverse. Also corrected an error made mid-discussion: the
  player/child/Sovereign identity loop is **one continuous life** with ordinary memory of
  its own past (like anyone aging) — not three iterations with tiered/compounding memory,
  which was wrongly proposed and rejected. Net changes: the Fracture no longer explains
  the world's ruined/war-torn state (the ordinary long war from "The pitch" already does
  that, unassisted); there's no pocket-dimension/spacetime-separation and nothing was ever
  literally split apart; "stabilizing the world" now means ending the loop, not re-fusing
  scattered reality; every region's "Fracture:" found-object callback and the "One
  Fracture, not many" thread were deleted (they existed only to support the old founding-
  event framing); "when the Fracture hit" phrasing across the miniboss section became
  ordinary war causes (a command chain going dark, a war-era power surge, etc). What's
  kept: the word "fracture," lowercase, now names one small, personal thing only — the
  moment the fusion attempt fails at the end of the final fight and resets the person back
  to childhood. The `the_fracture` room in `area.js` and its `lore_f1` fragment are
  unchanged structurally (out of scope to rename/move) but reframed as unexplained war-
  memorial art whose real meaning only lands after the ending, not an opening-beat premise-
  setter. Mechanism for *why* the reset happens at all is intentionally still open, same as
  before — not treated as solved by this pass.
- **2026-07-21 (later same day) — finished the empire→shelter wording pass.** The
  2026-07-21 reframe above rewrote the pitch and Sovereign sections but left the
  minibosses/regions sections using pre-reframe empire-scale language ("provincial lord,"
  "the Sovereign's empire," "conquest," "frontier mining settlement") — inconsistent with
  "one sealed shelter inside a mountain" being the entire world the game and postgame take
  place in. Fixed by request: Mirror King is now a section chief over a command wing (not
  a lord over a province), Event Horizon and Static Field's "settlement" language became
  "mining wing"/"utility wing," Polar Shift's "frontier mining settlement" became a remote
  tunnel wing of the same shelter, and every remaining "empire" reference (Observatory,
  Inverted Spire, Warp Gate Nexus's Fracture thread, the Observatory lore fragment)
  became "the shelter"/"the shelter's command chain." No character motivations, tragedies,
  or the Sovereign-exception rule changed — this was wording only, scale correction, not a
  plot rewrite.
- **2026-07-21**: reframed the setting as a far-future war-bunker (sci-fi: "magic is
  undiscovered science") without changing the underlying structure — see the new "The
  pitch" opening, the "Stabilize the world" note under the Sovereign section, the guards'
  new section, the minibosses' war-scientist reframe, and the per-loop-abilities note
  under Stillpoint (which also proposes, not yet locked, Time Reversal as the Sovereign's
  boss-kit answer to the still-open "Stillpoint-adjacent" design note). Confirmed the
  identity loop's in-fiction mechanism for the first time (see `story.md` §0.5/§9 for the
  full writeup) — the child ends up sealed in the spawn room during the final fight
  regardless of the Antechamber choice, and the Sovereign postgame closes the loop
  spatially (a guard posted in the tutorial room, a Temporal Warden rematch, waiting for
  the next iteration). Also confirmed: Collapse is the loop's first-ever taken "out," not
  the first *available* one — every prior iteration had the same option and always
  declined it, because the option is genuinely bad, not because it was hidden.
- **2026-07-14**: added "Two threads through all 13 regions" — per direct feedback that
  only 4 things in the whole game touched the main plot (meeting the child, the
  Timeline Crossroads choice, meeting the ally, the final boss), every region now
  carries evidence of the Sovereign's ongoing hunt and a found-object echo of the
  founding Fracture event, on top of (not replacing) each region's own "independent
  tragedy." Chrono-Space Rift and Echoing Abyss additionally get a third thread tying
  their own mechanic to the identity-loop reveal. Supersedes the narrower "Region lore —
  the place itself" section's partial coverage (Observatory/Void Expanse/Inverted
  Spire/Timeline Crossroads entries kept as written; the other 9 regions filled in).
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
- **2026-07-13 (later same day)**: added "Who the King actually is" to the King section,
  proposing the King was a past Warden who held the checkpoint-respawn watch too long
  and never let a death stick, and confirming the identity loop (player/King/child are
  the same person). **Retracted the same day, next revision below**: the "held the watch
  too long" mechanism was the user's own idea being tested, not confirmed — the user
  asked for it removed once the actual quote was checked (see `story.md` §0.5's "Source"
  note). The identity-loop claim itself remained confirmed; only the "held the watch too
  long" *mechanism* for why was retracted, and no replacement mechanism has been chosen.
- **2026-07-13 (King → Sovereign rename)**: renamed "the King" to "the Sovereign"
  throughout, and flipped pronouns referring to her from he/him/his to she/her,
  throughout this document. Reason: with the identity loop confirmed (Sovereign, Warden,
  and companion child are the same person, per `story.md` §0.5), and the Warden/child
  both established as female, "King" no longer fits — it isn't a neutral office, it's a
  specific claim about who occupies the role, and that claim now contradicts the
  established identity. "The Mirror King" (a separate, unrelated minor lord — see his own
  section above) keeps his own title; he isn't part of the Sovereign/Warden/child loop
  and his gender was never in question. Follow-up not yet done: `story.md`,
  `expansion.md`, `regions.md`, `roadmap.md`, `CLAUDE.md`, and the actual JS
  (`boss.js`/`game.js`, ~15 references to "King") all still say "King" — this file was
  renamed first per the user's request; the rest are pending a follow-up pass.
- **2026-07-13 (rename follow-up completed for docs)**: `story.md` and this file were
  already done. `expansion.md`, `regions.md`, `CLAUDE.md`, and `floor_plan.md` (new) now
  also say "Sovereign" throughout their forward-looking content. `roadmap.md`'s changelog
  entries were deliberately left saying "King" — they're a historical record of what was
  true at the time, not a current claim. The actual JS (`boss.js`/`game.js`/`area.js`/
  `enemy.js`) still uses `King` identifiers/text — flagged, not touched, since it's a code
  refactor rather than a docs fix.
- **2026-07-14**: added "Region lore — the place itself" (what each of the 13 regions
  physically was, distinct from who haunts it) and a full Lore Pip visual-effects table
  covering all 15 planned pip locations from `floor_plan.md` (13 in the planned regions +
  Vault Room 2 + Hollow Core), per direct request, once `floor_plan.md` was adopted as the
  official room-connection graph. Also added Static Field's new miniboss, **The Conduit**
  (`floor_plan.md` gave that region a miniboss it didn't have before — see `regions.md`'s
  Fracture Pip/miniboss reconciliation notes for why).
