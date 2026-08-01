# STILLPOINT — LORE & NARRATIVE SYSTEM (REFINED)

> **Design Principle**: Story is told through *mechanics, visuals, and audio* — not text.  
> Text is limited to menu prompts (`[E]`, `[Q]`, `F`) and optional lore fragments (disabled by default).  
> The player's *choices* across 13 regions determine the ending.

---

## 1. THE WORLD

The Sovereign's attempt to fuse every Stillpoint into one absolute device didn't hold. It
didn't tear the world apart — the world's damage is just the ordinary long war (see
`lore.md`'s "the fracture" section). What it did instead ties into who she is: the
Sovereign, the nameless **Warden** the player controls, and the companion child are **the
same person**, met at different points in one real, continuous, un-reset timeline (see
§0.5) — no one gets reset, no one relives anything; each stage is a full life lived once.
You are that Warden.

You are not alone. A **child** — an anomaly the Sovereign cannot perceive — hides in the ruins after the first region. She is the only being the Sovereign cannot see... unless you teach her to fight.

**Her origin (revised 2026-07-21 — the Sovereign ordered it):** the Sovereign herself commissioned the research collaboration that made her — several of the shelter's scientists, working under her authority, cut her loose when the project didn't produce whatever they needed. None of them knew, and neither did the Sovereign, that she'd bond with, or become, the one Stillpoint stolen back before the fusion (`lore.md`'s Vault entry — "keep it hidden, give it to whoever comes looking"). Per §0.5 below, she is also, later in the same life, the Sovereign herself — meaning, read forward, the Sovereign orders the creation of her own earlier self without knowing it.

---

## 2. THE COMPANION (THE CHILD)

She follows you through all 13 regions. Her abilities scale with **Region Level** (1–13, tied to how many regions you've explored together).

| Level | Protect (Regen) | Train (Shard Shot DPS) | Visual |
| :--- | :--- | :--- | :--- |
| 1–4 | 1 HP / 3s | 3 dmg/shot | Dim glow |
| 5–9 | 1 HP / 1.5s | 6 dmg/shot | Steady pulse |
| 10–12 | 1 HP / 1s | 9 dmg/shot | Bright aura |
| 13 (Final) | 1 HP / 0.7s | 12 dmg/shot | Full radiant corona |

- **Protect path**: She phases out during combat (invincible). Regenerates your health slowly.
- **Train path**: She fires shard shots (visible projectiles). She has HP — if she dies, burn 1 Fracture Pip to revive her (`[E] Revive`).

**Quick-tap decision moments (added 2026-07-14, proposed UX)**: at major narrative
choice beats, replace a single keypress (easy to misclick under pressure) with a **rapid
tap-repeat prompt** — hold/mash a key within a short window to commit to that choice; the
other option's prompt sits on a different key, so you can't accidentally confirm the
wrong one with one stray tap. Two confirmed uses:
1. **Meeting the child** (Echo Bridge) — tap quickly to slowly walk away (she plays a sad
   reaction animation, meant to make the choice feel costly in the moment) vs. tap
   quickly to save her.
2. **The first fight after meeting her** — this is the actual first moment the
   Protect/Train choice above becomes concrete and dramatized, not a one-time locked
   decision: tap quickly to let her hide (Protect, safe) vs. tap quickly to convince/force
   her to fight alongside you (Train) — and forcing her here has an explicit cost (not
   yet specced — a small HP hit, a delay, a visible reluctance animation, TBD), matching
   the already-established mechanic that the moment she fights, she becomes something the
   Sovereign can perceive (`lore.md`'s "On the child" section). **Built 2026-07-27**
   (`child_first_fight_choice` in `game/cutscene.js`, triggered from `game.js`): confirmed
   — every fight after this first one uses whichever path was chosen, no re-prompt
   (`storyFlags.child_fight_choice_resolved` gates it to once). The explicit Train cost
   above is still TBD/not built — flag before adding it, since it touches the same choice
   step this section's cutscene wiring now depends on.

---

## 3. THE THREE CORE PATHS (Mechanical Choice)

At any point, you can **leave her behind** by pressing `F`. She sits and waits.  
- **If you leave the room without her**: a prompt appears (`[F] Leave Her?` / `[E] Take Her`).
- **Leaving her permanently** gives you **+15% Move Speed** & **+15% Attack Damage** (unburdened).  
- You can always return to pick her up (unless you abandon her at the final door).

| Path | Key Mechanic | Advantage | Emotional Cost |
| :--- | :--- | :--- | :--- |
| **Protect** (Keep her safe) | Passive HP regen (scales). She finds secrets (flashes near breakable walls). | Survivability + Exploration aid. | You die at the final boss; she loops. |
| **Train** (Teach her to fight) | **Corrected 2026-07-27 — replaces "she fires shard shots" (never built that way; see `game/companion.js`).** She fights with a FOUND weapon — same as the player finds abilities, not a fixed kit. Starts with one weapon assigned at the Train choice (§2 point 2); enemies can rarely drop a different one later, so her kit can change over a run. Deals real, modest damage (an assist, not a DPS race with the player). | Extra DPS (makes fights easier). | **Corrected 2026-07-14 — she does NOT take a fatal blow.** You beat the Sovereign together, same as any other route. The cost lands after the fight, not during it — see §7's Sovereign Ending and §9. |
| **Leave** (Abandon her) | +15% speed/damage. No companion. | Raw power for speedruns. | She dies off-screen OR becomes the penultimate boss (see below). |

---

## 4. THE 4TH ABILITY — VOID TETHER (The Sacrifice)

**Miniboss — replaced 2026-07-22**: *The Stationmaster* (proposed name, not locked;
Timeline Crossroads — replaces the earlier Crystalline Warden assignment, a full
identity/moveset swap, not a rename, per `lore.md`'s redone miniboss spec). One of the
scientists who ordered the child's creation in the first place, and wanted her to be a
failure even then. He controls most of the shelter's internal transit routes and runs a
prison at Echo Bridge. He stole this ability from **The Undertow** (Void Expanse's own
miniboss, proposed name), wrongly convinced it's unusable — which is why he took it at
all rather than leaving it alone.

- **If you bring the child**: **Retired framing** ("the Warden freezes in terror,
  encases itself in crystal") — doesn't fit a human antagonist. **New, per the redone
  spec**: he has the player arrested on sight specifically to take her, opening into a
  forced prison-break sequence at Echo Bridge. **Open, not decided**: whether this
  replaces "the ability is simply lost" outright, or whether the player can still reach
  and fight him for the Tether after resolving the prison break — needs a direct call
  before it's built. What IS decided: if the child is left behind specifically during
  this break (as opposed to lost some other way), escaped prisoners protect and raise
  her — this is the trigger for the Antechamber's grown **Child** fight (see
  `lore.md`/`expansion.md` — **status: BUILT 2026-07-28**, now the sole "lost the child"
  consequence and the one that carries the Absorb/Spare choice below — see §5's updated
  status for what happened to Abandoned Shell).
- **If you leave the child at the entrance**: unchanged — you fight The Stationmaster
  alone, without triggering the arrest.

**Grant corrected 2026-07-22 — no longer a single flat unlock:** defeating him this way
grants a real, immediately usable Void Tether, just a **limited** one (exact limitation —
shorter range, a single charge before recharge, something along those lines — still
TBD). This was changed on direct request: the old version risked leaving a player who
just made an irreversible, painful sacrifice with nothing to show for it if the ability
were gated behind a second fight elsewhere. Later reaching the Void Expanse and
defeating The Undertow **completes** it (full range, no charge limit) — an optional
upgrade quest, not a prerequisite. Doing so also frees the Temporal Warden's own love,
who The Undertow had taken — this is what turns the Warden into a real ally (a "favor"
owed), on top of whatever the Tether itself grants.

| Ability | Key | Fracture Cost | Effect (base, limited version from The Stationmaster) |
| :--- | :--- | :--- | :--- |
| **Void Tether** | `T` | 1 Pip | Hit enemy → pull them toward you. Hit wall/ceiling → pull *you* toward it (grappling hook). **Limited** until completed at the Void Expanse — exact restriction not yet decided. |

**The Dilemma (corrected 2026-07-14 — leaving her here is PERMANENT, not temporary)**:
Keep the child → risk the arrest/prison-break branch above instead of simply losing the
ability outright (open question, see above). Leave her at the entrance → gain
the Tether on the spot, but she's gone for good — not "until you backtrack," she does not return.
This is the same weight of choice as permanently abandoning her at the final door
(§5), just earlier and easier to stumble into without realizing the cost — raises the
stakes of this choice considerably, intentional. **Downstream consequence**: losing her
here counts as the same "permanently lost the child" state that triggers the Antechamber
Child fight (§5, resolved 2026-07-28 — that fight now covers every route to losing her,
not just the prison break) and the Collapse/Loop-via-Child branch in §7 — you don't need
to reach the final door specifically to trigger it anymore, losing her at Void Tether
does it just as surely, just sooner.

---

## 5. THE PENULTIMATE BOSS — THE ANTECHAMBER CHILD (formerly THE ABANDONED SHELL)

**Resolved 2026-07-28 (user direction)**: the Antechamber Child fight (`lore.md`'s
"grown Child," §4 above) now REPLACES Abandoned Shell as the sole "lost the child"
consequence, however she was lost (final door, Void Tether abandonment, or the
Stationmaster's prison break — all three routes lead here now, one rule, no more
three-way collision). She carries the Absorb/Spare choice and the Collapse/Loop endings
below, in place of what Abandoned Shell used to grant. Built as `ANTECHAMBER_CHILD_DEF`/
`TheChild` in `game/enemy.js`, fought at the Antechamber itself (not the final door) —
`game_update.js`'s miniboss-death branch for `antechamber_child` triggers the choice
cutscene (`cutscene.js`'s `antechamber_child_ending`) instead of the usual +1 Max Health
miniboss reward.

**After defeating her**, a choice plays out (rapid-tap cutscene prompt):

| Choice | Effect | Leads To |
| :--- | :--- | :--- |
| **Absorb Her** | Gain +1 Fracture Pip (max 4). She is consumed. | **Collapse Ending** (world ends). |
| **Spare Her** | She dissipates into peaceful light. You proceed to the Sovereign. | **Loop Ending** (you die, she loops). |

> **Note**: If you never lost her, you skip this fight entirely and go straight to the Sovereign.

> **Correction (2026-07-28)**: not actually a seam — the Stationmaster's prison-break
> scene (§4) is a fixed story beat that happens regardless of how the player eventually
> loses the child. The escaped prisoners are already out there by the time any permanent
> loss occurs, whichever route causes it (final door, Void Tether abandonment, or the
> break itself), so she ends up raised by the same group either way. She grows up among
> escaped prisoners *because of* the prison break happening in the story's timeline, not
> because of the specific circumstances of how she and the player got separated. No
> rework needed.

**Abandoned Shell didn't disappear** — relocated to Hollow Core (2026-07-28, user
direction) and made **unconditional**: every playthrough fights her there now,
regardless of the child's fate, fully decoupled from the losing-the-child narrative.
Same original concept — a ghostly, red-eyed boss that *copies your moves* (dashes, shard
shots, attack patterns), HP ~60% of the Sovereign (48 of 80) — built as
`ABANDONED_SHELL_DEF`/`AbandonedShell` in `game/enemy.js`. No Absorb/Spare choice
attaches to her anymore; she's just a real fight with a normal miniboss reward.

---

## 6. FRACTURE PIP ECONOMY

| Pip Cap | Ability | Cost |
| :--- | :--- | :--- |
| **Max 4** (find upgrades across regions) | **Stillpoint** | 3 Pips |
| | **Graviton Surge** | 1 Pip |
| | **Void Tether** | 1 Pip |

**Combo potential**:  
- Stillpoint (3) + Graviton Surge (1) = slow time + flipped gravity.  
- Stillpoint (3) + Tether (1) = pull enemies into slowed time.  
- 4 Tethers = extreme mobility (costly but rewarding).

**Lore pips, reframed (confirmed 2026-07-21):** when lore fragments get their
environmental-storytelling pass (roadmap 1.9/1.10 — still `LORE_ENABLED = false` today),
frame them diegetically as visions the Sovereign herself pushes toward the player as they
grow stronger — not neutral worldbuilding, an active persuasion campaign meant to make
giving up the child feel reasonable, even responsible, by the time it matters. Answers the
previously-open "how should lore-bit visual effects work" question: they should read as
*her* voice intruding, not the world's.

---

## 10. THE PACIFIST WING & THE COMPANION NPC (confirmed 2026-07-21)

The pacifist region (existing design — fighting even once forfeits its reward
permanently, per `Plans/CLAUDE.md`'s consent-gated-choices note) is reframed as a ward for
shelter staff discarded as no longer useful — injured, aged, retired from weapons work.
One resident, a genuinely warm presence in an otherwise grim shelter, offers the player a
place to sleep (the game's first real home-base beat) and can teach a skill over repeat
visits. Mid-late game, a miniboss takes him as leverage — a deliberate "your princess is
in another castle" beat, with a romance track possible. **Not yet decided**: whether the
kidnap is a forced detour or optional-but-permanent-cost (recommended, to match the
project's existing irreversible-consent-gated-choice pattern, but not locked). Scope note:
skip a full relationship-meter system — a handful of one-time, gated affection scenes
(triggered after major story beats, occasional binary "warmth" choices) delivers this
without a new UI subsystem, consistent with the project's no-boxed-HUD-panel philosophy.

## 11. THE OUTSIDE (confirmed 2026-07-21)

A known movement-tech sequence break leads outside, onto the snowy mountainside —
reachable, not intended, framed as a discovery rather than a puzzle. This is the same
location and outcome as the Collapse ending's epilogue (§7) — a player who finds this
early and later reaches Collapse should recognize exactly where they are. **Corrected
2026-07-21, per direct request: survivable.** No radiation timer, no forced death — she
gets to actually see the outside world, the first time anyone from the shelter has. Found
early (before Collapse), it should read as a strange, quiet, unexplained discovery — its
full weight only lands in hindsight once the player has also seen it as the Collapse
ending's epilogue. **Corrected same day: still fatal without protection, not freely
survivable** — the radiation timer stays, and it still kills her, but per direct request
there's now a real window before it does: long enough to actually take in the outside
world first, not an instant death the moment she steps out. **Expanded 2026-07-22**:
staying inside (not stepping out at all) is the actual baseline-survivable option — the
spawn room itself is safe. Stepping out is only survivable long-term with both the Warp
Key (The Assembler) and a radiation shield (source not yet decided) — see §7's Collapse
row for the full breakdown of all three outcomes (stay and survive; leave unprotected and
see it before dying; leave protected and actually explore it).

---

## 0. THE OPENING & THE LOOP REVEAL (added 2026-07-13)

Wordless cold open, per the "felt and seen, not read" lore principle: the Sovereign
nearly kills the player; an ally seals the player away **in time** (not just hidden — see
lore.md's Sovereign section for why time-sealing specifically was necessary) to save
them. This is the player's only memory at game start — the Sovereign, and their own fear.
The player finds an outfit in the sealed room and climbs out into the tutorial area; the
game then plays normally. **The ally is the Temporal Warden** (a miniboss met much later,
in Chrono-Space Rift) — see lore.md for why his existing characterization already fits
this role without needing new lore invented for it.

**Spatially** (per the original instruction): the sealed starting room should sit at the
top or center of the world; the boss arena is perceived by the player, until the reveal,
as being at the bottom — opposite ends of the map that turn out to be the same place. See
`Plans/roadmap.md` 6.7 for the actual compass-graph rework this requires.

Late-game payoff: in the Antechamber, a long corridor ends at a wall separating the
player from part of the boss arena; crossing it (Phase Dash required) reveals that the
boss arena IS the sealed starting room, reached from its opposite end — the whole map is
a loop, not a line. This makes the premise below ("resurrected in a time loop") something
the player *discovers spatially* rather than something only stated in this doc. See
`Plans/roadmap.md` 6.7 for the engineering side of this (compass-graph rework, the
Phase-Dash wall mechanic) — this section is the narrative side only. See §0.5 (below) for
what the loop actually IS mechanically/narratively (the Sovereign/Warden/child identity
loop) — this section only covers the spatial reveal.

**The fight itself**: losing sends the player back to the Antechamber (ordinary
checkpoint/anchor behavior, not special-cased). Winning leads into §7's ending logic below
— per the original framing, beating the Sovereign leads to a forced realization that the
child must be dealt with, the ally intervenes, and the loop closes; see §7 for how this
maps onto the existing 3-ending structure, and the "what happens to the loop" mechanism
there.

## 0.5 THE IDENTITY LOOP — CONFIRMED CANON (2026-07-13)

**Source**: directly confirmed by the user after an earlier session guessed at this
without confirmation and a later session couldn't verify it either. The user's own
words (preserved verbatim — written before the King→Sovereign rename below, so "King"
in the quote means what this doc now calls "the Sovereign"): *"the indication was its a
loop because they are all you. future versions will allow you to play as the King
because you are the King, and in the ending where it loops, you can continue as the
child, because you are the child."* This is the core idea §0's loop reveal was always
building toward — not a spatial trick alone, an identity one.

**The core claim**: the Sovereign, the nameless Warden the player controls, and the
companion child are **the same person**, encountered at different points in the loop.
This is why it's a *loop* and not just a repeating structure — the cast doesn't repeat
because history rhymes, it repeats because there is, in a real sense, only ever been one
person in this story, meeting herself at different ages and in different states.

**What this means for §9 (far-future, still unscoped)**: the playable-Sovereign NG+2
isn't "play as a different character to understand her" — it's playable **because the
player already is her**. Same logic for the Loop ending's postgame: continuing as the
child isn't a fresh perspective character, it's a continuation **because the player
already is her**. §9's two open risks (sympathy-tension from playing as the Sovereign;
needing a real reason the grown child becomes a threat) are unchanged by this
clarification and still need solving before that content gets built — but the *reason*
NG+2/NG+3 exist at all is now this, not a vaguer "become the pattern" theme statement.

**A mechanism is still needed for how the identity-loop actually works in-fiction** (why
the same person keeps recurring as Sovereign/Warden/child rather than just narrating
"they're all you" as an assertion) — this is intentionally left open. An earlier draft of
this section proposed the Sovereign having simply held the checkpoint-respawn watch too
long as that mechanism; the user asked for that removed, so it is not a candidate
anymore. No replacement mechanism is settled canon yet — don't assume one. If/when a
mechanism is chosen, only this "how" needs writing; the "that" (the identity claim
itself) is already confirmed above and shouldn't need to change to accommodate it.

**The mechanism — confirmed 2026-07-21, spatial rather than expository:**

- Regardless of the Antechamber/Void Tether choice (fought her there, or brought her
  along), the child ends up in the spawn room during the final fight, and the fight
  itself happens in the tutorial room. Walking into the spawn room mid-fight is a
  recognition beat, not new information — this is where the player grew up. See §0 above:
  the fight happens in the same two rooms the opening cinematic already showed the player,
  which is what lets this land as recognition instead of exposition.
- At the fight's end, the child is sealed there — in space and time — the same mechanism
  the ally used on the player at the very start of the game.
- The Sovereign Ending's postgame (§9) is this mechanism completing itself, not a separate
  event: the "corrupting knowledge" the ally gives the player IS the memory of the loop —
  winning and receiving it means the player now remembers being her, because she already
  was, some number of iterations back. "Becoming" the Sovereign is a recognition arriving
  late, not a turn. See §9 for the postgame sequence this produces.

**Why this doesn't read as arbitrary**: this game's stated thesis (`lore.md`'s "something
built to last, and what happened when it couldn't") already applies to the Stillpoint
device, the Crag's crystal heart, and several minibosses. Making the player's own identity
the same category of thing — the same person recurring across the loop instead of
resolving into one ending — extends the theme to the protagonist instead of only NPCs and
artifacts, which fits a time-loop premise better than an unrelated cast of characters
would.

---

## 7. THE THREE ENDINGS & POST-GAME UNLOCKS

**Restructured 2026-07-14 — True Anchor removed, Sovereign Ending added in its place.**
Per direct instruction: rather than sequence the Sovereign arc after/alongside the
existing Loop postgame, split what used to be one ending's two trigger paths (Protect vs.
Train) into two separate endings, each with its own distinct postgame — and cut True
Anchor, whose "reward for the Train path" framing never actually said what it meant for
the loop itself (see the retired framing below the table). The three endings still each
answer one question — *what happens to the loop* — but the axis that used to just pick a
postgame flavor (Protect/Spare vs. Train) now picks which of two real endings you get.

| Ending | What happens to the loop | Trigger | Cinematic (No Text) | Post-Game Unlock |
| :--- | :--- | :--- | :--- | :--- |
| **1. Collapse** | **Destroyed.** The loop is annihilated along with everything that depended on it — this is punishment, not resolution: power taken (absorbing her) instead of the loop being allowed to resolve on its own terms. This is also, per `lore.md`'s Sovereign section, "ending the loop" achieved the wrong way — force instead of resolution — at the cost of everything the loop was protecting. | Permanently lost the child (final-door abandonment, or lost her forever at the Void Tether choice — §4) → Absorbed the Shell. | You kill the Sovereign. Screen fades white. **Corrected 2026-07-21 (fixes a contradiction — the epilogue can't feature the child, since this ending's own trigger requires her to already be permanently lost):** before deletion, a short real epilogue about the player *alone* — the mountain has collapsed to a single small remaining room. **Baseline (no special items): she survives, in the spawn room** (confirmed 2026-07-22) — safe, but that's the whole ending, alone in the one room left. **If she leaves through the ruin without protection**: stepping out onto the snowy mountainside still starts the radiation timer, and it still kills her — but not instantly; there's a real window, long enough for an actual look at the outside world, before the timer runs out. **If she has both the Warp Key (dropped by The Assembler) and a radiation shield (source TBD — proposed candidate: a drop from one of the still-open-moral-axis minibosses, not yet picked)**: she can survive the trip out and actually explore the irradiated wasteland — open content, exact scope/discoveries not yet decided (see the open design discussion on what's actually out there: leaning toward "the war's been over for a long time and nobody knew," recontextualizing every miniboss's sacrifice, but not locked). Bittersweet either way: she won, alone, at the cost of everyone the loop was protecting — but for the first time, survival and actually seeing what she fought for are both on the table, not just one or the other. This is also the first time in this life's entire history this "out" has ever actually been taken — every prior attempt at the fusion-weapon ended differently; this is the first time anyone chose to end it by force instead. The same hidden area (a movement-tech sequence break) exists earlier in the base game as an optional secret — a player who finds it early and then reaches this ending should recognize the room. | **Nothing** (punishment), unless the Warp Key + shield path is taken, in which case the wasteland content itself (still being designed). |
| **2. Loop** | **Continues, unchanged.** The same person begins again as the child, will grow into the Warden — this is the "nothing broke, nothing was learned" outcome. **Mechanism, corrected 2026-07-14 — see the note below the table**: you don't defeat the Sovereign here. You lose to her, and your last act is getting the child to safety. | Protected her (never trained), brought her to the end. Or permanently lost her, then Spared the Shell. | You fall. She's already safe, pushed clear before the end. **Corrected 2026-07-21: no reset event** — she simply lives her life onward from there, ordinary and un-magical, same as anyone. NG+ picks up her story where it continues. | **New Game+** (Play as the child). Per §0.5: she IS the Warden of the run that just ended. **Confirmed 2026-07-21**: the loop does NOT accumulate, so this is not "replay with map knowledge" — she doesn't know the world any better than a fresh Warden would. **Expanded 2026-07-22, per direct request**: this is a gameplay perspective switch only — the player isn't narratively "becoming" the child, just controlling her for this run, same as any other NG+ avatar swap. "The loop doesn't progress, but it does change" — each iteration's version of her differs a little: a visibly smaller build than the base game's player (reference given: proportioned more like Mekk Knight Crusadia than the base Warden), fighting with a rapier instead of the base kit's default weapon. Confirmed: **Stillpoint itself becomes a full time-rewind** in this iteration rather than a slow — consistent with `lore.md`'s existing "abilities are this loop's inventions, not eternal constants" note, now actually used rather than just flagged as possible. Each miniboss's own granted ability is also reflavored to a same-vibe, different-execution version this loop (see `lore.md`'s scope note — three fixed instances per miniboss: base game, Sovereign postgame, and this Loop-ending variant — draft ideas not yet finalized, only Stillpoint→rewind is locked). |
| **3. Sovereign Ending** | **Continues, as you.** **Mechanism, corrected 2026-07-14 — the child does NOT die here.** You Trained her, brought her to the end, and this time you actually beat the Sovereign — a real win. Afterward, the ally appears and gives you something (knowledge of the loop, of what she knew) framed as necessary for a choice about the child's fate. Whether that's a real choice you make or a corruption that happens regardless is left deliberately unresolved to the player (see note below) — either way, the ally acts to keep the child safe from what you're becoming, and what you're becoming is her. | Trained her (she fought). You won the fight. | You stand over the Sovereign's body. The ally arrives — not in time to stop what's about to start, only in time to make sure the child survives it. | **Playable-Sovereign postgame** — see §9, now a real (if unbuilt) scoped feature, not aspirational. |

> **Radiant Mode** (1-hit death) unlocks after either Ending 2 or 3.

**On Loop's corrected mechanism — pulled from §3's own Protect-path row, which already
said "you die at the final boss," not a clean win:** this actually gives Loop the
distinct, separate-from-the-other-two mechanism the endings needed. You fight the
Sovereign in every ending — what differs is the outcome: Collapse skips the fight
entirely (already lost her, fight The Shell instead), the Sovereign Ending is a real win
with a cost that lands after, and Loop is a real *loss* whose one saving grace is that
she's safe before it happens. **Confirm this reading is right before it's treated as
locked** — it resolves "you beat the final boss and then you lose somehow" by having you
not-beat her at all, only save the child in the process of losing, which is a different
answer than "you win and then something else goes wrong."

**On the Sovereign Ending's "choice or corruption" ambiguity**: left unresolved to the
player on purpose rather than picked, unless you'd rather it be one clean answer — the
real Sovereign never doubts she chose rightly (`lore.md`: "her certainty is what makes
her dangerous, not cruelty"), so denying the player a clean "was this forced on me or did
I choose it" answer keeps that same quality intact rather than letting the player
comfortably distance themselves from her with "I was corrupted, it wasn't really me."

**Why the child's fate differs across Collapse and the Sovereign Ending — the actual
mechanism, not left as a shrug:** ties to the already-written Vault lore ("we kept one
hidden here — for whoever came next") — the hidden Stillpoint isn't just an item, it's
bonded to the child, or she IS it, given form. That's why the Sovereign can't perceive
her (same reason her own fused Stillpoints can't sense the one that got away). In
Collapse, that bond is severed by force (absorbing the Shell) — an ending, violently. In
the Sovereign Ending, the bond isn't severed at all — the child survives, protected by
the ally, precisely because *you* are the one who changes instead. Neither ending breaks
the cycle; only Loop's own repetition holds open the chance that a *future* iteration
might, per §0.5's own caveat.

**Possible mechanism for §0.5's still-open "how" question**: the Sovereign Ending above —
Warden defeats Sovereign, receives corrupting knowledge from the ally, becomes the new
Sovereign — is now a concrete candidate for *half* of the identity loop's in-fiction
mechanism (the Warden→Sovereign leg specifically). It doesn't cover the child→Warden leg
(currently just "she wakes up and grows up," no special mechanism implied or needed
there). Flagging as a candidate, not marking §0.5's open question fully resolved — confirm
whether this should be treated as settled canon for that half of the loop.

**Retired framing (kept for the record, not current):** the old True Anchor read as "she
takes a fatal blow, shards seal the fracture, boss rush unlocks" — a mechanically
identical trigger (Trained her, she took the fatal blow) to the new Sovereign Ending
above, but with a "the loop ends on purpose" meaning that never actually followed from
anything else in the doc. Same trigger, different — now actually-earned — payoff.

---

## 9. THE SOVEREIGN ENDING'S POSTGAME (2026-07-14 — now scoped, not aspirational)

**Status change from the previous revision**: this was filed as "far-future, not scoped"
with two open risks. Per direct instruction, it's now a committed part of the design —
not built yet (still real, sequenced work), but no longer aspirational, and the two old
risks are resolved by the structure below rather than left open. `floor_plan.md`'s
**Sovereign Room 1–4** and **Sovereign's Observatory** placeholder nodes are this arc's
actual planned content, not reserved-but-uncommitted slots — update that doc's framing to
match.

**The arc, in sequence:**

1. **Trigger**: the Sovereign Ending (§7) — you Trained her, brought her to the end, and
   actually beat the Sovereign. She does NOT die here (corrected 2026-07-14 — the old
   "fatal blow" framing was wrong). Instead of a stopping-point cinematic, the ally's
   arrival opens directly into a new postgame campaign: you're playing as the Sovereign
   now, in the Sovereign Rooms.
   **Playable kit (2026-07-14)**: she uses the base game's actual final-boss moveset
   (`boss.js`) rather than a new player kit — mechanically slower than the Warden
   (weighed down by what she knows/carries), but hits harder and has more health,
   trading mobility for power. Reinforces the arc's own point: this is what the pattern
   costs, played as a tradeoff the player directly feels, not just told about.
2. **The pull.** This act's whole design job is making the player *feel* the same
   reasoning the Sovereign always had — not villain monologuing, actually earning it, the
   same way lore.md's "her certainty is what makes her dangerous, not cruelty" already
   frames her. The narrative should build convincingly enough that the player, playing as
   her, is drawn toward moving against the child — the same anomaly-hunt the base game
   already established her doing, now played from the hunter's side instead of narrated
   about her.
3. **The intervention — this arc's structural payoff.** At the moment the player-as-
   Sovereign is in position to act on that pull, the ally (the Temporal Warden) seals the
   child away in time to save her. **This is the base game's own opening cinematic** (§0),
   witnessed this time from the other side. The player should be able to recognize it:
   the moment they just lived through as the Sovereign is the exact moment the game they
   already finished began with. The loop isn't just narrated as real at this point — the
   player has now played both ends of the same event.
4. **More Sovereign Rooms.** After the intervention, the arc continues — further
   Sovereign-side content, still using the reserved room nodes in `floor_plan.md`. Not
   yet designed room-by-room; sequenced after the intervention beat, before the closing
   fight.
5. **Closing fight**: the player, still as the Sovereign, fights the child — now grown up
   (see the resolved risk below for why). Per direct instruction, this **loops back into
   the base game (NG)** rather than ending on its own standalone cinematic — winning or
   losing this fight is what puts the world back into the state the base game's opening
   found it in, closing the loop mechanically, not just narratively.

**The two old risks, resolved by this structure rather than left open:**
1. *"Playing as the Sovereign risks uncritical sympathy."* Resolved by making that pull
   the explicit point of Act 2 above, not a side effect to guard against — the player is
   *supposed* to feel it, the same way the real Sovereign did, and then be pulled back
   from it by the same intervention that saved the base game's protagonist. Sympathy
   with a corrective built into the structure, not sympathy left unchecked.
2. *"Why does the grown child become a threat?"* **Reframed 2026-07-14, and cleaner now
   that she doesn't die at the Sovereign fight**: she isn't a threat in the villain sense
   at all — she grows up into the next **Warden**, the same role the player held in the
   base game, and comes to stop you the same way you once stopped the Sovereign. The
   closing fight is a direct mirror of the base game's final boss fight with the roles
   reversed: the player is now on the side they spent the whole base game opposing.
   Not a heel-turn for her — a heel-turn for *you*, which the whole arc has been building
   toward since Act 2's "the pull." Confirm this reframing lands before it's locked; it's
   a direct consequence of fixing the fatal-blow error, not something separately decided.

**The closing sequence — confirmed 2026-07-21, refines/replaces steps 3 and 5's staging
above (the "intervention" and "closing fight" beats specifically; steps 1-2 and the two
resolved risks above are unchanged):**

- Partway through the postgame run, the player-as-Sovereign sends a guard ahead to the
  tutorial room to wait for the child. That guard **is** the base game's tutorial
  enemy — the first thing every new player ever fights is a soldier the Sovereign
  personally posted there, some number of loops later, wearing standard-issue Sovereign
  colors, guarding the room where the loop always begins. (This also
  retroactively answers why the tutorial's first enemy is the plainest one in the whole
  roster — it's a standing order from a future iteration of the player, not a placeholder.)
- Continuing down toward the tutorial room, the player-as-Sovereign is intercepted by the
  Temporal Warden (the ally) — a rematch of the same character. This time, the player
  beats him.
- Arriving at the tutorial room, the player-as-Sovereign has just missed the child
  leaving — the same beat that opened the base game, now seen from the other side — and
  waits there, with a future iteration of the child either hiding behind her or fighting
  alongside her (still explicitly undecided which; changes whether this postgame ends
  isolated or newly companioned — pick before building it). This is what "loops back into
  the base game (NG)" in step 5 above actually looks like in-world: the Sovereign waiting
  in the tutorial room *is* the ominous presence a new playthrough begins under.

**Open tension flagged, not resolved:** steps 2 and 4 above describe dedicated new
"Sovereign Rooms" content. The confirmed framing above ("you go through the game again...
harder boss fights") reads more like a harder difficulty pass across the *same* 13
regions than bespoke new rooms. Given the project's own current tracking (essentially none of the 13 regions have real
content built yet), reusing existing region geometry for a harder antagonist run is dramatically cheaper than
also designing a parallel set of Sovereign-only rooms — and it's the same "only ever build
two instances" scoping principle already confirmed for miniboss weapon variance (§ below /
`lore.md`'s per-loop-abilities note). Recommend resolving this in favor of reuse, but not
overwritten here without confirmation — the dedicated-rooms text above is left as-is
pending that decision.

**Why the player becomes her — mechanism confirmed above, motive still proposed, not
locked:** one candidate, consistent with lore.md's existing "certainty, not cruelty"
characterization — the pull isn't ambition, it's the same impulse as an overprotective
parent taken to its worst extreme: having just watched the child nearly die, the player
concludes the only way to guarantee it never happens again is removing every variable
that could let it happen. Escalating postgame difficulty would then be *in-fiction*
motivated too — not "the game gets harder," but "she's decided losing again is
unacceptable, and that decision is the tyranny." Flagging as the strongest available
reading, not yet confirmed by the user.

**Brainstormed ideas for the closing fight — not locked, worth prototyping before
committing:**
- Instead of a single closing fight, an **endless boss rush**: winning doesn't end the
  postgame, the next child (grown, from the next loop iteration) just comes back and you
  fight again — matches the loop's own "the same person, recurring" logic better than a
  one-time final fight would.
- **A different kit each run**, to keep repeat fights interesting for players good enough
  to loop the boss rush many times.
- **The opponent learns from the player's own actions**, the same adaptive-stat-biasing
  approach already speced for the (separate, currently unbuilt) Archive postgame boss
  proposal (`expansion.md` 5.6) — reinforces the identity-loop theme mechanically (you're
  fighting a reflection of your own patterns), not just narratively. Worth building on
  that existing spec rather than a second bespoke adaptive system.
- Possibly **emotes the opponent mirrors back at the player** — unshaped idea, noted for
  whenever this gets prototyped, not designed yet.

---

## 8. IMPLEMENTATION NOTES (For Coders)

### Save Data Flags
this is just a suggestion
```js
{
  companion: {
    level: 1,          // 1–13
    isFollowing: true,
    isCorrupted: false, // for Shell boss
    path: 'protect' | 'train' | 'left'
  },
  tetherUnlocked: false,
  fracturePips: 0,      // starts at 0 (unusable), cap grows to max 4 via found Fracture Pip pickups — see roadmap.md 1.9
  endings: {
    collapsed: false,
    looped: false,
    becameSovereign: false // renamed from 'anchored' 2026-07-14 — True Anchor retired, see §7
  }
}
```

## Revision history (most recent first)

- **2026-07-27 — Child companion system actually built (`game/companion.js`,
  `game/cutscene.js`); §2/§3 corrected to match.** The companion existed only as this
  design doc and dialogue/flags before now — `companionState.active` was never set true
  anywhere in real gameplay (only the `companion_test.html` arena tool), so she never
  appeared in an actual playthrough. Fixed: (1) §2 point 1 (meeting her, Echo Bridge) is
  now a real cutscene (`CUTSCENES.echo_bridge_intro`) ending in the rapid-tap Leave/Save
  choice this doc always specced — a new reusable `choice` cutscene step type was added
  to support it (mash one of two actions to a tap threshold, first to reach it wins,
  times out to a default). (2) §2 point 2 (the first-fight Protect/Train choice) is now a
  live trigger (`child_first_fight_choice`, `game.js`) firing the first time an enemy goes
  `aware` after she's active — same `choice` mechanic, not pre-decided at Echo Bridge.
  (3) §3's Train row is corrected — see the table above — from "she fires shard shots"
  (never built that way) to a found-weapon kit (knuckles/taser/flamethrower,
  `COMPANION_WEAPONS` in `companion.js`), matching the discussion that produced this: the
  companion IS the player (§0.5's identity loop), so her kit should be *found*, not
  granted, same as the player's own abilities — including a rare enemy-drop that swaps
  her weapon mid-run. Cross-check `Plans/child_companion_system_plan.md` for the fuller
  build log (hide-and-heal Phase 1, locomotion) — this doc only tracks what changed here.

- **2026-07-22 — miniboss redesign fallout: Void Tether reworked, Loop-ending NG+ detail,
  Collapse ending's outside-world options expanded.** Matches `lore.md`/`expansion.md`'s
  same-day miniboss overhaul. (1) **§4 Void Tether**: miniboss replaced (Crystalline
  Warden → "The Stationmaster," proposed name, full identity swap) with a new
  arrest/prison-break story beat when the child is brought along (open, not fully
  decided); the grant itself is corrected from a single flat unlock to an immediate,
  real, limited version, completed later at the Void Expanse ("The Undertow," proposed
  name) as an optional upgrade rather than a mandatory second gate — direct request,
  motivated by not wanting to leave a player who just made a permanent sacrifice with
  nothing to show for it. Also ties in the Temporal Warden's stolen love, freed by the
  same Undertow fight. (2) **§5 flagged, not resolved**: the new prison-break branch's
  "leave her behind" outcome is supposed to lead to a different fight (the Antechamber's
  grown Child, see `lore.md`) than the existing Abandoned Shell — no rule yet for how
  these coexist. (3) **§7 Loop ending**: clarified the NG+ child-perspective switch is
  gameplay-only, not a narrative "becoming"; per direct description, her build/weapon
  differ slightly this loop (smaller build, rapier) and Stillpoint itself becomes a full
  rewind rather than a slow, consistent with the already-existing "abilities aren't
  eternal constants" note. (4) **§7 Collapse ending / §11 The Outside**: three-way outcome
  now, per direct request — stay in the spawn room and survive (the actual baseline); leave
  unprotected and die to radiation, but only after a real window to see the outside world
  first; or leave with both the Warp Key (The Assembler's drop) and a not-yet-sourced
  radiation shield and actually survive the wasteland — content scope still open.
- **2026-07-21 (later still) — removed the Fracture as a founding cosmic event; fixed the
  Collapse ending's internal contradiction; made the outside world survivable.** Three
  direct requests, all applied: (1) matches `lore.md`'s removal of "the Fracture" as a
  world-spanning event — §1's pitch and the child's origin no longer reference a
  spacetime-tearing accident, and "no one gets reset" is now explicit (child/Warden/
  Sovereign are one continuous, un-looped life, not tiered/repeating iterations). (2) The
  child's origin (§1) changed from "not the Sovereign's own project" to **the Sovereign
  ordered the collaboration that made her** — she unknowingly commissioned her own earlier
  self into existence. (3) Audited all three ending triggers (§3→§4→§5→§7) for coherence —
  the trigger *logic* was already consistent (Protect→Loop, Train→Sovereign,
  abandon/lost-at-Void-Tether→Abandoned Shell→Absorb/Collapse or Spare/Loop) — but found
  Collapse's epilogue text contradicted its own trigger (described the child as "saved,
  now alone" despite the trigger requiring her to already be permanently lost). Fixed: the
  Collapse epilogue is now about the player alone. Per direct request, the Collapse
  epilogue and §11's matching secret-area exit still end in death by radiation, but no
  longer instantly — there's now a real window for the player to actually see the outside
  world before the timer runs out.
  Loop ending's "the fracture takes you... wakes up in the Tutorial area" reset-language
  also removed — she simply lives on from where she was left safe, no magic event needed.
- **2026-07-21**: war-bunker setting reframe (see `lore.md`'s matching entry — no
  structural change here, only framing). Confirmed the child's origin (§2, a discarded
  program experiment). Confirmed §0.5's previously-open identity-loop mechanism: the child
  is sealed in the spawn room during the final fight regardless of the Antechamber choice,
  and §9's postgame closes the loop spatially (a guard planted in the tutorial room who
  becomes the base game's first enemy, a Temporal Warden rematch, waiting in the tutorial
  room for the next iteration) — flagged an open tension between this and §9's existing
  "dedicated Sovereign Rooms" framing, not resolved. Proposed (not locked) a motive for why
  the player becomes the Sovereign: love turned to control, escalating difficulty as an
  in-fiction refusal to risk losing the child again. Reworked §7's Collapse ending from
  "nothing, punishment" into a short real epilogue (alone, collapsed shelter, optional walk
  outside to die of radiation) and confirmed Collapse is the loop's first-ever *taken* out,
  not the first *available* one. Proposed (not locked) a distinct NG+ identity for the Loop
  ending (trained-kit carryover, explicitly NOT map knowledge, since the loop doesn't
  accumulate). Added §10 (pacifist-wing companion NPC) and §11 (the outside/radiation
  secret) as new sections. Reframed lore pips (§6) as the Sovereign's own persuasion
  campaign rather than neutral worldbuilding.
- **2026-07-14 (later same day) — plot-hole fixes to the same-day Sovereign Ending
  rewrite**: (1) the child does NOT die/take a fatal blow in the Sovereign Ending — you
  actually beat the Sovereign, then the ally gives you corrupting knowledge and you
  become the new Sovereign while the ally keeps the child safe; fixed everywhere this was
  wrong (§3's Train row, §7's table, §9 step 1, §9's risk-2 resolution, which is now
  reframed around the grown child becoming the *next Warden* coming to stop you, not a
  villain). (2) Leaving the child at the Void Tether choice (§4) is now PERMANENT, not
  temporary — broadened §5's Abandoned Shell trigger to fire from either permanent-loss
  route. (3) Loop's own mechanism is now distinct and explicit: you don't beat the
  Sovereign in this ending, you lose to her, saving the child in the process (pulled from
  §3's own pre-existing "you die at the final boss" line) — flagged for confirmation, not
  assumed locked. (4) Noted the Sovereign Ending as a candidate partial mechanism for
  §0.5's still-open "how does the identity loop work" question (the Warden→Sovereign
  leg specifically). (5) Fixed a `floor_plan.md` reachability bug found while checking
  this: Mirror Veil Gate had a route into Timeline Crossroads that skipped Echo Bridge
  (meeting the child) entirely — gated that edge on having met her.
- **2026-07-14 — True Anchor retired, Sovereign Ending added, §9 un-flagged as
  aspirational**: per direct instruction. §7's three endings restructured — Collapse
  unchanged, Loop narrowed to just the Protect/Spare-without-training trigger, and a new
  Sovereign Ending takes over the Train trigger (previously True Anchor's). §9 rewritten
  from "far-future, not scoped, 2 open risks" into a real 5-step sequenced arc (trigger →
  the pull → the ally's intervention, revealed as the base game's own opening cinematic →
  more Sovereign Rooms → closing fight against the grown child → loops back into NG),
  with both old risks resolved by the structure itself rather than left open. Added a
  "brainstormed, not locked" subsection for the endless-boss-rush/adaptive-opponent/
  per-run-kit ideas floated alongside this — explicitly not decided, noted for later.
  `floor_plan.md`'s Sovereign Room placeholder nodes are now this arc's real (if unbuilt)
  planned content, not "not committed" — that doc needs a matching update.

## Revision history (King → Sovereign rename, 2026-07-13)

Renamed "the King" to "the Sovereign" throughout this document and flipped pronouns
referring to her from he/him/his to she/her. Reason: with the identity loop confirmed
(§0.5) and the Warden/child both established as female, "King" contradicted the
established identity of the person it names. See `lore.md`'s own revision history for the
same rename and the fuller reasoning. Follow-up not yet done: `expansion.md`,
`regions.md`, `roadmap.md`, `CLAUDE.md`, and the actual JS (`boss.js`/`game.js`, ~15
references) still say "King" — pending a follow-up pass.
