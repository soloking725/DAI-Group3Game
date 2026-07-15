# Stillpoint — Lore

Status: **narrative reference doc, not yet displayed in-game** (`LORE_ENABLED = false`
in `game.js` — see `Plans/CLAUDE.md`). This is a full rewrite (2026-07-12) of the
Sovereign's characterization and a new section on miniboss/region lore — see "Revision
history" at the bottom for what changed and why. The individual fragments quoted in
`area.js`'s `loreFragments[]` predate this rewrite and are now stale (they were written
for the old sympathetic King, before the 2026-07-13 King→Sovereign rename below) —
porting them to match is tracked as follow-up work under roadmap.md 1.10, not done in
this pass. This doc is the connective tissue that makes the eventual in-game fragments
read as one story, for whenever the environmental-storytelling redesign happens.

## The pitch

Before the Fracture, the Sovereign ruled an empire built on Stillpoints — devices that
could hold a single moment in place forever. She didn't build them to protect anything.
She built them as a weapon: freeze your enemy's army mid-charge, freeze a city
mid-surrender, freeze time itself around anyone who resisted her, and just... keep it
that way. She believed total, permanent control would finally end every war, every
famine, every future conflict — that if nothing could ever change again, nothing could
ever go wrong again. She was wrong on a scale that broke the world. When she tried to
fuse every Stillpoint into one, final, absolute one — a single moment to freeze
*everything*, forever, under her — it didn't hold. Time didn't stop. It shattered. You
are a nameless Warden, carrying the one Stillpoint that wasn't consumed in that attempt,
moving through the wreckage of her ambition — not to freeze the world again, but to move
through it, and to stop her from trying a second time.

## The Fracture (the founding event — an act, not an accident)

> "She said the fusion would be clean. She said it would be the last thing she ever had
> to do to us." — `lore_f1`, *the_fracture*

The Fracture wasn't a structural failure. It was a weapon that misfired at the scale of a
world. The Sovereign fused every Stillpoint her empire held into one device, meant to
freeze all of reality under her hand permanently — no more resistance, no more war, no
more change of any kind, ever again. It didn't fail gently. Reality didn't refuse to
freeze; it refused to freeze *evenly*, and tore instead, fragmenting into disconnected
pockets, each one still locally obeying the instant it broke in, looping it forever:

> "The bridge didn't fall. It refused to hold. There is a difference, and I understand it
> now." — `lore_eb1`, *echo_bridge*

> "The crystals are made of frozen time. Her time. She didn't ask if we wanted to be
> frozen with it." — `lore_cc1`, *crystal_cavern*

> "Every gap is a small surrender." — `lore_tr1`, *the_rift*

Read together, these aren't separate hazards — they're the same weapon's blast radius,
recurring at every scale, from a bridge to a crystal to a floor. The world you're
platforming through isn't collapsing on its own; it's still failing to finish being
conquered.

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

She is a conqueror, not a cautionary tale — the Fracture was the weapon, not the
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
by force, by absorption, by control — is what keeps her fractured world from tearing
itself apart entirely. The Collapse ending proves this belief backward: taking the child
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
species of tyrant — she is the same person as the player and the companion child,
encountered at a different point in the loop. The identity claim is confirmed, not a
guess. The *mechanism* for how one person recurs as child, Warden, and Sovereign is
intentionally still open — no device or explanation (rewind-watch or otherwise) is
settled canon, and none should be assumed until the user confirms one. This doesn't
soften her — she's still the deliberate conqueror described above, responsible for her
own choices. It does mean the player, the Sovereign, and the companion child (see
`story.md` §9 for the Sovereign Ending postgame arc this enables — rescoped 2026-07-14
from far-future/unscoped to real planned content) are the same person at different
points, not three separate characters — extending this
doc's "something built to last, and what happened when it couldn't" thesis to the player
character herself, not just to NPCs and artifacts.

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

The Colossus Core (the region's miniboss) is the "heart of crystal" — a construct built to
hold the crag's structure together after whatever split it, built by people who had
nothing to do with the Sovereign's empire. It worked too well: the construct has no
off-switch, no memory of anything except "hold the shape," and it will fight forever
whether or not the crag still needs holding. It's a smaller, non-sapient echo of the
*shape* of the Sovereign's arc (something built for permanence that outlived its purpose
and can't stop) without being connected to her at all — proof the game's theme doesn't
need her personally behind it to land.

## Minibosses & their regions (new — roadmap 1.10)

Per direct instruction: **most of these are independent tragedies, not things the
Sovereign personally did.** She caused the Fracture; she did not personally cause every
region's ruin. One exception is called out explicitly below (Graviton Core), because its
miniboss is literally named after her and that connection is the point of that one fight.
The rest should read as the world's *own* wreckage — proof the Fracture broke more than
just her plan, and that plenty of smaller, unrelated permanence-attempts were already
failing on their own before she ever touched them.

Shared rule (same one `lore.md`'s original version used, kept because it still works):
each of these is a variation on **"something built to last, and what happened when it
couldn't"** — never a Sovereign-sized answer, never the same shape twice.

### Mirror Veil — The Mirror King
A minor provincial lord, one of many who ruled under the Sovereign's empire, obsessed with
outliving his own mortality the same way his ruler was obsessed with outliving change
itself — copying the boss's logic on a petty, local scale. He commissioned mirror-sorcery
that would let a perfect copy of him take the throne the instant he died, so his rule
would never actually end. The mirrors didn't stop copying when the Fracture hit; they kept
going, and now the region is full of reflections that each believe *they* are the one
true lord, fighting anyone who enters as though defending a throne none of them actually
sit on. A tragedy of vanity mistaking repetition for permanence. (His own title, "King,"
is unrelated to the Sovereign's — a minor local lord's own honorific, kept as-is; he is
not part of the Sovereign/Warden/child identity loop.)

### Event Horizon — Gravity Collapse Core
Not a palace, a mine — this region extracted raw gravitic material that fed the
Sovereign's war machine (siege engines, anti-gravity transports, the infrastructure of
conquest, though the Sovereign never set foot here herself). When the Fracture hit, the
extraction core's containment failed and it became a self-collapsing singularity,
endlessly pulling in debris — and everyone who worked it. What's left isn't malicious;
it's a resource operation that outlived the empire that ordered it and never received a
shutdown order, still "extracting" by pulling in whatever's nearby.

### Chrono-Space Rift — Temporal Warden
The monastic order that hid the player's Stillpoint from the Sovereign (see the
Stillpoint section above — this is that room) had one member assigned to guard the secret
forever: its eldest keeper, who used forbidden time-magic to keep resetting his own death
rather than ever let his watch lapse. He's still doing it, on a repeating countdown,
unaware the thing he swore to guard was already carried off successfully — his watch
ended in success long ago and he has no way to know that. A guardian who outlived his own
victory.

### Graviton Core — Fractured Sovereign's Guard *(the one direct exception)*
Explicitly one of the Sovereign's own — an elite soldier posted here specifically because
Graviton Surge's source was valuable enough to guard personally. He's still doing his
job: holding this outpost, waiting for reinforcements and orders that stopped coming the
instant the Fracture hit. Not a tragedy of vanity or overreach like the others — a
tragedy of loyalty with no one left to be loyal to. Fighting him is the closest the player
gets to fighting a piece of the Sovereign herself before the actual throne room.

### The Polar Shift — Electromagnetic Golem
A frontier mining settlement, far enough from the Sovereign's reach that its people
solved their own problems — raiders, mostly — by building a magnetic automaton to defend
the tunnels. It worked. The settlement is long gone (Fracture or otherwise, this one was
never her doing), but the golem's directive was never "defend the settlement"; it was
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
An automated constructor built to keep the Sovereign's war machine supplied — armor,
siege parts, replacement matériel, endlessly, on a directive with no stop condition
because no one expected the war to end this way. Its overseers are gone; its directive
isn't. It is still assembling, using whatever scrap is nearest, including anything that
stops moving in its reach. Not evil, not loyal even — just a process that was never given
a reason to halt.

### Warp Gate Nexus — Warden & Hollow
Two gatekeepers, stationed as a pair specifically because a single gatekeeper could be
overwhelmed and a pair could always cover each other's blind spot — one built to counter
close-range intrusion, one built to counter ranged. Their entire purpose was mid-shift
when the Fracture hit: testing travelers before letting them through to wherever this
Nexus led. The travelers stopped coming. The all-clear to finally stand down never
arrived. They are still testing whoever walks in, because from where they stand, their
shift never technically ended.

### Static Field — The Conduit *(new 2026-07-13, added by `floor_plan.md`; guards this
region's Fracture Pip, Room 2 — no ability attached, Magnet Climb was removed
2026-07-14)*
An independent settlement (not the Sovereign's, same rule as the rest of this section)
tapped the region's raw electrical discharge for power the honest way: a grounding
construct built to safely bleed dangerous current out of the air and into the earth, so
the settlement above could run on what would otherwise have arced through their homes.
It worked, for exactly as long as "safely" meant "predictably." The Fracture didn't
destroy it — it overloaded it, permanently, and grounding is still all it knows how to
do. It cannot tell a person from stray current anymore, so it treats both the same way
it always has: touch the floor near it and it discharges you back into the air, the
identical motion whether you're a person or a spark. It was also the settlement's
record-keeper, wired into whatever passed for their local archive — the same failure
that turned it into an involuntary lightning rod also means anything electronically
"connected" to it nearby (the map overlay, in-game terms) picks up its static. Not
malicious, not guarding anything anymore — just still doing the one job it has left,
indiscriminately.

## Region lore — the place itself (added 2026-07-14)

The section above covers *who* haunts each region (mostly independent tragedies, one
Sovereign exception). This section covers *what the place was* — the site itself, before
whatever happened to it. Kept short: most regions' "what it was" is already implied by
their miniboss write-up (a mine, a monastery, a mining settlement, a war-machine
assembly line) and doesn't need restating. Only regions where the place itself carries
information the miniboss section doesn't cover get a full entry below; the rest get a
one-line cross-reference so this section stays a complete index of all 13 without
repeating itself.

**The Observatory** *(no miniboss)* — Literally what it sounds like: a Sovereign
watch-post, not a military one — she has some form of perception that senses
hidden/anomalous things (see "The Sovereign's vision" above), and this is where she
stood to use it, watching her empire for exactly the kind of anomaly she couldn't
otherwise see coming. The region's low gravity isn't set-dressing; it's what's left of
whatever let her perception reach as far as it needed to from a single fixed point —
verticality as a literal metaphor for oversight. Sovereign's Observatory, its deepest
room, is that same vantage point in the game's present: she isn't watching an empire
from it anymore, she's watching for the one anomaly (the child) that was always outside
her frame — which is exactly why finding this room and its payoff lands as more than a
fast-travel unlock; it's arriving at the seat of the hunt itself.

**The Void Expanse** *(no miniboss)* — Not a mine, not a palace, not a settlement — a
site with no comparable "what it was" at all, because this is where the Fracture's blast
radius hit hardest and never stopped being felt. Read alongside `lore.md`'s Fracture
section ("the same weapon's blast radius, recurring at every scale, from a bridge to a
crystal to a floor"): here the recurrence is total. Nothing solid survived the freeze
intact — every platform is a chunk of debris still locally obeying the exact instant it
broke, which is why timing (not positioning) is the whole traversal puzzle. If Echo
Bridge and Crystal Cavern are the blast radius at small scale, this region is what it
looks like at the scale where nothing coherent was left to name.

**The Inverted Spire** *(no miniboss)* — A relay tower, built by the Sovereign's own
logistics chain specifically to keep Graviton Core (the adjacent region, same Gravity
cluster) in contact with the rest of the empire — orders in, gravitic material out. Its
foundation anchor was rated for a lot; it wasn't rated for the Fracture. It failed
catastrophically and the whole structure inverted, permanently — "up" and "down" swapped
the instant it broke, and stayed that way. The relay beacon at its heart, unlike the
tower around it, never lost power: it is still broadcasting orders into a command
structure that no longer exists, from a tower that no longer has a "top" to broadcast
from. Sovereign infrastructure, like Graviton Core, but automated rather than staffed —
no guard here, no exception to the "independent tragedy" rule; the tragedy is that it
outlived every recipient of what it still sends.

## Two threads through all 13 regions (added 2026-07-14 — direct request)

**The problem, stated plainly**: only 4 things in the whole game touch the main plot —
meeting the child (Echo Bridge), the choice about her (Timeline Crossroads), meeting the
ally (Chrono-Space Rift), and the final boss. The other regions' "independent tragedy"
framing (deliberate, 2026-07-12) reads as *disconnected* rather than *thematically
consistent* once there are 13 of them. Fix: two threads run through every region,
layered on top of each one's own local tragedy (below), not replacing it.

- **Thread 1 — The Hunt.** The Sovereign is searching her fractured domain for an
  anomaly she can't perceive (established at Upper Ruins/Antechamber). Every region now
  carries one small piece of evidence that she already searched *here* — usually evidence
  she came up empty, sometimes (2 regions, below) evidence of *why* she came up empty.
  This doesn't require new content in the regions that already ARE the hunt (Sovereign's
  Observatory, The Inverted Spire) — those two stay as written.
- **Thread 2 — One Fracture, not many.** A recurring found-object callback to the exact
  founding moment (`lore_f1`: a single point of light, then the skyline cracking outward
  from it) in each region — so every region's local disaster reads as the same weapon's
  blast radius at a different distance, not an independent coincidence. The Void Expanse
  already IS this thread at full scale and needs nothing added.

Two regions carry a **third**, heavier thread on top of the above, because their own
mechanic is already the closest sibling to the endgame's identity-loop reveal —
Chrono-Space Rift (the ally's own repeating death) and Echoing Abyss (recursive echoes),
called out below.

### Mirror Veil
*Local (unchanged, see above)*: the Mirror King's self-duplicating vanity magic never
stopped copying. **Hunt**: her search-light, refracted through thousands of mirrors,
produced thousands of false positives instead of one clean answer — the one region that
didn't just go unchecked, it actively defeated her method. She marked it unreliable and
hasn't returned. **Fracture**: one wall's mirror shows the founding skyline-crack image
correctly, un-duplicated, un-reflected — the single true origin point among endless
copies, easy to miss among everything else that's multiplying.

### Event Horizon
*Local*: a war-supply gravitic mine, containment failed, still extracting. **Hunt**:
search-probes she sent in were pulled into the collapse with everything else; their
beacon lights are still visible, falling, forever transmitting "searching" and never
"clear." **Fracture**: among the orbiting debris, one shard burns brighter than the rest,
circling the black point at the singularity's core — the same single point of light as
the founding image, still being consumed rather than having already gone out.

### Chrono-Space Rift
*Local*: the Temporal Warden, resetting his own death forever, watch already won without
knowing it. **Hunt**: this is the one region she'd search personally if she could — it's
where the stolen Stillpoint was actually hidden — but the Warden's own time-loop makes
the whole region read as noise to her perception, the same instability that's kept her
out is what's kept the theft secret. **Fracture**: the exact vault door from the Vault's
theft fragments (`lore_tv1`/`lore_tv2`) exists here too, permanently mid-swing-shut, one
frame frozen since that night. **Third thread**: the Warden's own repeating death — undo,
reset, never let it stick — is a small, mortal rehearsal of the identity loop the whole
game turns out to be about. He doesn't know he's foreshadowing it; the player, on a
second look back at this region after the ending, should be able to see that he was.

### Graviton Core
*Local*: the Fractured Sovereign's Guard, one of her own, still holding the post *(the
one direct Sovereign-thread exception — unchanged)*. **Hunt**: doesn't need invented
evidence — this is the one place her command structure never fully died, the closest
thing to her actual current reach outside the throne room itself. **Fracture**: minimal
by design; this region is already maximally connected to her without it.

### The Inverted Spire
*(unchanged from the existing entry above — its relay beacon still broadcasting search
orders IS the Hunt thread at full strength; no addition needed.)*

### The Observatory
*(unchanged from the existing entry above — this region IS her literal watch-post, the
Hunt thread's own home; no addition needed.)*

### The Void Expanse
*(unchanged from the existing entry above — this region IS the Fracture thread at full
scale; no addition needed.)*

### Warp Gate Nexus — Warden & Hollow
*Local*: two gatekeepers testing travelers, shift never technically ended. **Hunt**: what
they were built to do — test and clear travelers, one by one, methodically — is a small,
mundane ancestor of exactly what the Sovereign now does full-time across her whole
domain. The connection isn't coincidental in-fiction so much as thematic: her present
hunt is the same protocol, just with nobody left to relieve her of it either.
**Fracture**: the vault they were testing access to was one of the empire's other
fusion-storage sites — now irrelevant, everything it held went into the one, final fusion
that broke the world.

### The Polar Shift
*Local*: the Electromagnetic Golem, defending mining-settlement tunnels that outlived
their settlement. **Hunt**: the one region where the evidence is *absence of a search at
all* — this settlement solved its own problems and never drew her attention, a different
and colder kind of unseen than everywhere else she looked and found nothing. **Fracture**:
a single fused chunk of raw ore at the tunnel's deepest point holds the same light/crack
pattern as the founding image, proof the blast reached even the places she never did.

### Paradox Engine — The Assembler
*Local*: an automated war-matériel constructor with no stop condition. **Hunt**: buried in
its still-running order queue, unfinished, is a batch labeled for detection-array
components — if it ever completes its backlog, it would hand her, unknowingly, exactly
the tool she's missing to finally perceive the child. Not yet triggered; a live thread,
not a resolved one. **Fracture**: its very first assembled part, never shipped, sits
half-buried under everything built since — stamped with the same single-point-of-light
mark every Sovereign-issue Stillpoint casing carried.

### Static Field — The Conduit
*Local*: a power-grounding construct that can't tell people from stray current anymore.
**Hunt**: its map-overlay corruption doesn't just glitch the player's own map — it
scrambled her tracking data too, the same accidental sabotage as Mirror Veil's mirrors, a
second region that blinds her without meaning to. **Fracture**: the arc's discharge
point, when it fires, briefly resembles the founding skyline-crack shape at the moment
just before impact — visible only in the instant of the zap, easy to miss entirely.

### Timeline Crossroads
*(unchanged from the existing entry above — this is already the single most connected
region: home of the child-choice beat and the Crystalline Warden/Void Tether fight.
Already fulfills both threads by virtue of being load-bearing plot, not scenery.)*

### Echoing Abyss — Quantum Pursuer
*Local*: a grief-driven recursive echo, split fully autonomous, endlessly copying whoever
it meets. **Hunt**: her search parties that entered here got copied too — several of the
region's echo-copies are, per their silhouette and gait, unmistakably her own search
personnel, still moving, still searching, permanently. **Fracture**: the copies
themselves are the thread — an echo of an echo, forever, is this whole game's structure
in miniature. **Third thread**: call this out directly to the player if there's ever a
late-game or postgame text/vision moment available — this region's whole premise (a
person who didn't want to stop being themselves, copied instead of ended, now recurring
forever) is the closest single-region metaphor for the Sovereign/Warden/child identity
loop in the entire planned world. Worth a knowing nod once the ending's been seen (e.g. a
NG+ visual difference here specifically), not required for a first playthrough to land.

## Reading order

The fragments are written to be found roughly in this sequence (mirrors the intended
play order, `col`/`row` in `area.js`):

1. `lore_f1` — the_fracture — the founding act (a weapon, not an accident)
2. `lore_eb1` — echo_bridge — the weapon's blast radius, repeating at small scale
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
| `lore_f1` | the_fracture | Wide shot: a single point of light (every Stillpoint fused into one) at the center of a silhouetted city skyline, holding — then the skyline cracks outward from it like glass, freezing mid-shatter. | Cutscene (opening beat — sets the whole game's premise) |
| `lore_eb1` | echo_bridge | A bridge silhouette caught mid-collapse, frozen at the exact frame it broke, dust suspended in the air around it — camera slowly pulls back to show the same freeze-frame repeating down the whole canyon. | Overlay |
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
| `lore_ob1` | The Observatory, Room 2 | A ring of dead watch-apertures set into a low-gravity shaft, flickering alive one at a time as the player rises past — each briefly showing an unrelated, ordinary scene from elsewhere in the old empire before dying again. | Overlay |
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
- Implementation note: roadmap.md 1.9 shipped one placeholder visual (a generic amber
  vignette pulse, `lorePipEffect` in game.js) used identically for every fragment. The
  table above is the spec for replacing that generic placeholder with per-fragment
  content and adding the Cutscene mode (a full game-loop pause, which doesn't exist yet —
  `lorePipEffect` currently never blocks `update()`). Both are follow-up implementation
  work, not done in this pass.
- Core principle carried over from the previous version: lore is felt and seen, not read.
  Text pop-ups stay permanently disabled (`LORE_ENABLED = false`).

## Revision history

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
