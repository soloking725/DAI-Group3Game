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

**Miniboss**: *The Crystalline Warden* (Region 7 — The Polar Shift).

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

## 7. THE THREE ENDINGS & POST-GAME UNLOCKS

| Ending | Trigger | Cinematic (No Text) | Post-Game Unlock |
| :--- | :--- | :--- | :--- |
| **1. Collapse** | Left her permanently → Absorbed her at the Shell. | You kill the King. The fracture implodes. Screen fades white. Save file deleted. | **Nothing** (punishment). |
| **2. Loop** | Protected her (never trained). Or Spared her at the Shell. | You push her to safety. You step into the fracture and dissolve. She wakes up in the Tutorial area. | **New Game+** (Play as the child — smaller model, 0 abilities, all dialogues treat you as the new Warden). |
| **3. True Anchor** | Trained her (she fought). She saved you. | She takes the King's fatal blow. Her shards seal the fracture. You kneel alone in the empty arena. | **Boss Rush & Memory Refights** (Her ghost appears in The Vault — interact to refight any boss). |

> **Radiant Mode** (1-hit death) unlocks after either Ending 2 or 3.

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
  fracturePips: 3,      // max 4
  endings: {
    collapsed: false,
    looped: false,
    anchored: false
  }
}