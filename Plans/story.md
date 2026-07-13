# STILLPOINT — LORE & NARRATIVE SYSTEM (REFINED)

> **Design Principle**: Story is told through *mechanics, visuals, and audio* — not text.  
> Text is limited to menu prompts (`[E]`, `[Q]`, `F`) and optional lore fragments (disabled by default).  
> The player's *choices* across 13 regions determine the ending.

---

## 1. THE WORLD

The Fractured King broke the center of time (the **Stillpoint**). You are a nameless **Warden** — resurrected in a time loop to fix what was shattered.  

You are not alone. A **child** — an anomaly outside the fracture — hides in the ruins after the first region. She is the only being the King cannot see... unless you teach her to fight.

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

---

## 3. THE THREE CORE PATHS (Mechanical Choice)

At any point, you can **leave her behind** by pressing `F`. She sits and waits.  
- **If you leave the room without her**: a prompt appears (`[F] Leave Her?` / `[E] Take Her`).
- **Leaving her permanently** gives you **+15% Move Speed** & **+15% Attack Damage** (unburdened).  
- You can always return to pick her up (unless you abandon her at the final door).

| Path | Key Mechanic | Advantage | Emotional Cost |
| :--- | :--- | :--- | :--- |
| **Protect** (Keep her safe) | Passive HP regen (scales). She finds secrets (flashes near breakable walls). | Survivability + Exploration aid. | You die at the final boss; she loops. |
| **Train** (Teach her to fight) | She fires shard shots. Deals visible damage. | Extra DPS (makes fights easier). | She takes a fatal blow for you at the King. |
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

**The Dilemma**: Keep the child → lose a major traversal tool. Leave her (temporarily) → gain the Tether, but lose her regen/DPS until you backtrack to pick her up.

---

## 5. THE PENULTIMATE BOSS — THE ABANDONED SHELL

**Trigger**: Permanently abandon the child at the final door (Region 13 entrance).

**What happens**: The King's fracture energy corrupts her empty body. She rises as a ghostly, red-eyed boss that *copies your moves* (dashes, shard shots, attack patterns). HP = ~60% of the King.

**After defeating her**, two choices appear (canvas icons):

| Choice | Key | Effect | Leads To |
| :--- | :--- | :--- | :--- |
| **Absorb Her** | `[E]` | Gain +1 Fracture Pip (max 4). She is consumed. | **Collapse Ending** (world ends). |
| **Spare Her** | `[Q]` | She dissipates into peaceful light. You proceed to the King. | **Loop Ending** (you die, she loops). |

> **Note**: If you never abandoned her, you skip this boss entirely and go straight to the King.

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

Wordless cold open, per the "felt and seen, not read" lore principle: the King nearly
kills the player; an ally seals the player away **in time** (not just hidden — see
lore.md's King section for why time-sealing specifically was necessary) to save them.
This is the player's only memory at game start — the King, and their own fear. The player
finds an outfit in the sealed room and climbs out into the tutorial area; the game then
plays normally. **The ally is the Temporal Warden** (a miniboss met much later, in
Chrono-Space Rift) — see lore.md for why his existing characterization already fits this
role without needing new lore invented for it.

Late-game payoff: in the Antechamber, a long corridor ends at a wall separating the
player from part of the boss arena; crossing it (Phase Dash required) reveals that the
boss arena IS the sealed starting room, reached from its opposite end — the whole map is
a loop, not a line. This makes the premise below ("resurrected in a time loop") something
the player *discovers spatially* rather than something only stated in this doc. See
`Plans/roadmap.md` 6.7 for the engineering side of this (compass-graph rework, the
Phase-Dash wall mechanic) — this section is the narrative side only.

## 7. THE THREE ENDINGS & POST-GAME UNLOCKS

**Framing update (2026-07-13):** treat the King-fight → forced-choice-to-end-the-child →
ally-intervenes → loop-back sequence (see §0 above) as the **default outcome** — what
happens absent a deliberate Train or permanent-Abandon divergence. Collapse and True
Anchor below are the two ways a player breaks *out* of that default loop, not three
co-equal branches; Loop (ending 2) IS that default outcome, just given weight and a
cinematic instead of being one option among equals. Same mechanism (the ally, the
loop-back) resolves differently depending on which path the player took — "breaking the
loop works the same way for the other endings," per the instruction that produced this
framing.

**Why the child must "die" — a real mechanism, not left as a shrug:** ties to the
already-written Vault lore ("we kept one hidden here — for whoever came next") — the
hidden Stillpoint isn't just an item, it's bonded to the child, or she IS it, given form.
That's why the King can't perceive her (same reason his fused Stillpoints can't sense the
one that got away), and why ending him for real — not just his body — requires that
Stillpoint being spent, which looks like killing a child. This is the mechanism the
ending should be written around, not an unmotivated twist.

| Ending | Trigger | Cinematic (No Text) | Post-Game Unlock |
| :--- | :--- | :--- | :--- |
| **1. Collapse** | Left her permanently → Absorbed her at the Shell. | You kill the King. The fracture implodes. Screen fades white. Save file deleted. | **Nothing** (punishment). |
| **2. Loop** (the default outcome, see framing note above) | Protected her (never trained). Or Spared her at the Shell. | You push her to safety. You step into the fracture and dissolve. She wakes up in the Tutorial area. | **New Game+** (Play as the child — smaller model, 0 abilities, all dialogues treat you as the new Warden). See §9 for a far-future alternative take on this slot. |
| **3. True Anchor** | Trained her (she fought). She saved you. | She takes the King's fatal blow. Her shards seal the fracture. You kneel alone in the empty arena. | **Boss Rush & Memory Refights** (Her ghost appears in The Vault — interact to refight any boss). |

> **Radiant Mode** (1-hit death) unlocks after either Ending 2 or 3.

---

## 9. FAR-FUTURE, NOT SCOPED: Playable-King NG+2 + grown-child NG+3 (2026-07-13)

Explicitly aspirational per the user — not a commitment, see `Plans/roadmap.md` 5.9 for
the scope/risk breakdown (this is close to a second game's worth of work). The pitch: the
Loop ending's postgame becomes, instead of/in addition to playing as the child, a second
New Game+ playing AS the King — inhabiting his side of events, presumably discovering why
he became this way — followed by a third act fighting the child, now grown up, as a new
threat. Collapse and True Anchor keep their current postgame content unchanged.

**Why it's compelling:** lore.md's whole thesis (something built to be permanent, and
what happens when it can't stay that way) would go from being narrated to being
literally *played* — the player becoming the next iteration of the exact pattern the
King represents.

**Two real risks to solve before writing any of this, not after:**
1. Playing AS the King for an extended campaign pulls hard toward sympathizing with him
   almost automatically — in tension with lore.md's deliberate "one sharp non-excusing
   detail, not fully sympathetic" characterization. Needs its own design answer for
   keeping his wrongness legible while playable.
2. "The child, now grown, becomes the final threat" needs a real earned reason or it
   reads as a cheap heel-turn. Candidate throughline: if the cycle isn't broken in the
   King arc, she grows up carrying the Stillpoint-bond alone, unsupported, and becomes
   what happens to anyone who holds something like that too long — the pattern, a third
   time. Usable, but still a real writing task.

**Small detail worth keeping regardless of this item's fate:** the King has some form of
perception that senses hidden/anomalous things — "nowhere normal" isn't hidden from him.
This is why the ally in §0 had to seal the player in time specifically, not just a secret
room (a secret room isn't secret from him).

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
    anchored: false
  }
}