# STILLPOINT — LORE & NARRATIVE SYSTEM (REFINED)

> **Design Principle**: Story is told through *mechanics, visuals, and audio* — not text.  
> Text is limited to menu prompts (`[E]`, `[Q]`, `F`) and optional lore fragments (disabled by default).  
> The player's *choices* across 13 regions determine the ending.

---

## 1. THE WORLD

The Fractured Sovereign broke the center of time (the **Stillpoint**). You are a nameless **Warden** — resurrected in a time loop to fix what was shattered.  

You are not alone. A **child** — an anomaly outside the fracture — hides in the ruins after the first region. She is the only being the Sovereign cannot see... unless you teach her to fight.

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
   Sovereign can perceive (`lore.md`'s "On the child" section). Every fight after this
   first one presumably just uses whichever path was chosen, without re-prompting —
   confirm that assumption before implementing.

---

## 3. THE THREE CORE PATHS (Mechanical Choice)

At any point, you can **leave her behind** by pressing `F`. She sits and waits.  
- **If you leave the room without her**: a prompt appears (`[F] Leave Her?` / `[E] Take Her`).
- **Leaving her permanently** gives you **+15% Move Speed** & **+15% Attack Damage** (unburdened).  
- You can always return to pick her up (unless you abandon her at the final door).

| Path | Key Mechanic | Advantage | Emotional Cost |
| :--- | :--- | :--- | :--- |
| **Protect** (Keep her safe) | Passive HP regen (scales). She finds secrets (flashes near breakable walls). | Survivability + Exploration aid. | You die at the final boss; she loops. |
| **Train** (Teach her to fight) | She fires shard shots. Deals visible damage. | Extra DPS (makes fights easier). | **Corrected 2026-07-14 — she does NOT take a fatal blow.** You beat the Sovereign together, same as any other route. The cost lands after the fight, not during it — see §7's Sovereign Ending and §9. |
| **Leave** (Abandon her) | +15% speed/damage. No companion. | Raw power for speedruns. | She dies off-screen OR becomes the penultimate boss (see below). |

---

## 4. THE 4TH ABILITY — VOID TETHER (The Sacrifice)

**Miniboss**: *The Crystalline Warden* (Timeline Crossroads — moved here 2026-07-13
from The Polar Shift to resolve a conflict with expansion.md's Electromagnetic Golem,
which is the better mechanical fit for The Polar Shift's push/pull magnetism; the
Warden's "freezes in terror, encases itself in crystal" imagery fits Timeline
Crossroads' Past/Present frozen-vs-safe mechanic instead — see `Plans/regions.md`).

- **If you bring the child**: The Warden freezes in terror, encases itself in crystal. You cannot fight it. The ability is lost forever.
- **If you leave the child at the entrance**: You fight the Warden alone. Defeating it grants:

| Ability | Key | Fracture Cost | Effect |
| :--- | :--- | :--- | :--- |
| **Void Tether** | `T` | 1 Pip | Hit enemy → pull them toward you. Hit wall/ceiling → pull *you* toward it (grappling hook). |

**The Dilemma (corrected 2026-07-14 — leaving her here is PERMANENT, not temporary)**:
Keep the child → lose a major traversal tool, forever (the Warden won't fight while she's
present, and this is the only chance at Void Tether). Leave her at the entrance → gain
the Tether, but she's gone for good — not "until you backtrack," she does not return.
This is now the same weight of choice as permanently abandoning her at the final door
(§5), just earlier and easier to stumble into without realizing the cost — raises the
stakes of this choice considerably, intentional. **Downstream consequence**: losing her
here counts as the same "permanently lost the child" state that triggers The Abandoned
Shell (§5) and the Collapse/Loop-via-Shell branch in §7 — you don't need to reach the
final door specifically to trigger that branch anymore, losing her at Void Tether does
it just as surely, just sooner.

---

## 5. THE PENULTIMATE BOSS — THE ABANDONED SHELL

**Trigger (broadened 2026-07-14)**: Permanently lose the child — either by abandoning
her at the final door (Region 13 entrance), or by leaving her behind for the Void Tether
(§4) and never returning, which is now itself permanent. Either route counts as the same
"lost her for good" state.

**What happens**: The Sovereign's fracture energy corrupts her empty body — regardless of
where she was actually lost, what's left of her surfaces here, at the final door, claimed
by the fracture rather than by distance. She rises as a ghostly, red-eyed boss that
*copies your moves* (dashes, shard shots, attack patterns). HP = ~60% of the Sovereign.

**After defeating her**, two choices appear (canvas icons):

| Choice | Key | Effect | Leads To |
| :--- | :--- | :--- | :--- |
| **Absorb Her** | `[E]` | Gain +1 Fracture Pip (max 4). She is consumed. | **Collapse Ending** (world ends). |
| **Spare Her** | `[Q]` | She dissipates into peaceful light. You proceed to the Sovereign. | **Loop Ending** (you die, she loops). |

> **Note**: If you never abandoned her, you skip this boss entirely and go straight to the Sovereign.

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
| **1. Collapse** | **Destroyed.** The loop is annihilated along with everything that depended on it — this is punishment, not resolution: power taken (absorbing her) instead of the loop being allowed to resolve on its own terms. | Permanently lost the child (final-door abandonment, or lost her forever at the Void Tether choice — §4) → Absorbed the Shell. | You kill the Sovereign. The fracture implodes. Screen fades white. Save file deleted. | **Nothing** (punishment). |
| **2. Loop** | **Continues, unchanged.** The same person begins again as the child, will grow into the Warden — this is the "nothing broke, nothing was learned" outcome. **Mechanism, corrected 2026-07-14 — see the note below the table**: you don't defeat the Sovereign here. You lose to her, and your last act is getting the child to safety. | Protected her (never trained), brought her to the end. Or permanently lost her, then Spared the Shell. | You fall. She's already safe, pushed clear before the end. The fracture takes you instead of her. She wakes up in the Tutorial area. | **New Game+** (Play as the child). Per §0.5: she IS the Warden of the run that just ended. |
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
