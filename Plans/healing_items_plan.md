# Healing & Collectibles — Plan (built 2026-07-16, see roadmap Phase 19)

Status: **built 2026-07-16** (roadmap.md Phase 19) — `game/healing.js`
implements the recommendation below: vitality motes (combat-earned),
max-health shards, and healing crystals, plus `maxHealthBonus`/
`playerMaxHealth()`. The Child's touch-heal (if kept) also shipped
alongside this, per `child_companion_system_plan.md`. Originally written
2026-07-16 in response to: healing currently comes only from Stillpoint,
anchors, and dying — should health potions be lying around? What other
collectible types should exist?

## Recommendation: no consumable potions

Classic pick-up-and-carry potions are the wrong fit for this game:

- They need inventory/quickslot UI — against the "no boxed HUD panels /
  minimal in-world feedback" rule in `CLAUDE.md`.
- Hoarding psychology: players save them forever and effectively never
  have healing anyway, while balance has to assume they *might* chug five
  mid-boss.
- They dilute anchor placement as the game's difficulty rhythm — anchor
  spacing stops mattering if healing is bankable.

Instead, spread healing across sources that each reinforce something the
game already wants to be about:

## Healing economy (proposed)

1. **Vitality motes — combat-earned healing (the main new source).**
   Enemies drop small drifting motes on death (bigger enemies → more;
   occasional mote on a heavy/charged hit). Motes auto-drift to the player
   within ~120px, expire in ~4s, heal a fraction of 1 HP each (e.g. 4
   motes = 1 HP, tune per enemy tier). Effect: sustain comes from
   *fighting well and staying aggressive* — exactly right for a game where
   "combat is the point." Bosses/minibosses emit a mote burst at phase
   transitions (a paced mid-fight breather, like Hollow Knight's staggers).
   Implementation: a lightweight particle-like entity in `game.js` (pooled,
   no per-frame allocation per `performanceInstructions.md`), rendered
   procedurally.
2. **The Child's heal (keep-her branch).** Touch-heal after combat ends,
   1 HP on a 60–90s cooldown — the reliable, scheduled source; see
   `child_companion_system_plan.md`. Stacks with motes: motes reward
   aggression *during* the fight, she restores you *after* it. The
   gave-her-up branch doesn't get this — Void Tether's aggression
   (pull → punish faster, generating motes sooner) is the compensating
   sustain, which keeps the irreversible choice a real build choice.
3. **Anchors** — unchanged, full restore, the rhythm anchor (literally).
4. **Placed one-time health restores in exploration nooks.** Not potions:
   a cracked fracture-crystal you strike open (in-world, no inventory) —
   full heal on the spot, does not respawn until the next anchor rest
   (Estus-flower style). Rewards exploration without being farmable.
   Sparse: 0–2 per region, placed via `levelEditor.html` like any other
   room object.
5. **Fallback flagged, not planned**: if playtests show attrition between
   anchors is still too punishing, the standard fix is a single
   anchor-refilled emergency heal charge (Souls-style flask, one charge).
   Needs a button + a HUD pip, so it's deliberately *not* in v1 — revisit
   with playtest data.

## Collectible taxonomy (keep it lean)

Already exists — unchanged:
- **Fracture Pips** — ability fuel / Limit Break cost.
- **Lore Pips** — ability leveling currency (2/3/4 per level).

Add:
- **Max-health shards** — permanent +1 max HP, rare, hidden in hard
  optional spots (precedented: meeting the Child grants +1). These are the
  big exploration prize. Suggest 4–6 across the 13 regions, tracked in
  save data.
- **Vitality motes** — the combat drops above (transient, not saved).

Explicitly recommend **against** adding:
- Currency/shop economy — already out of scope per `CLAUDE.md`.
- Keys or quest items — the no-lock-and-key rule.
- Equipment/charm-likes — rejected design decision.
- Consumable inventory of any kind — see top of this doc.

That leaves exactly four collectible types a player ever sees (pips ×2,
shards, motes), each with one clear meaning — legible without any HUD
explanation, which is the bar `CLAUDE.md` sets.

## Save data

`maxHealthShardsCollected` (per-room flags, same pattern as existing
pickups), placed-restore "consumed since last rest" flags (transient,
reset on anchor rest — decide whether they persist in saves or reset on
load; recommend reset-on-load, generous is fine here). Update
`saveGame()`/`loadGame()`/`startNewGame()` together per `CLAUDE.md`.

## Tuning venue

`enemy_test.html` already spawns arbitrary enemies — add a "drops motes"
toggle there when motes are built, so mote-per-enemy-tier numbers get
tuned in the arena, not in real rooms.
