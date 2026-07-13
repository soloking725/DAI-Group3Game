# Stillpoint — Lore

Status: **narrative reference doc, not yet displayed in-game** (`LORE_ENABLED = false`
in `game.js` — see `Plans/CLAUDE.md`). The individual fragments quoted below already
exist as `loreFragments[]` entries in `area.js`; this doc is the connective tissue that
makes them read as one story instead of scattered flavor text, for whenever the
environmental-storytelling redesign happens.

## The pitch

Before the fracture, a people who could not accept that anything they built might end
anchored their world with Stillpoints — devices that held single moments in place
forever. One Stillpoint broke. Time did not stop; it *shattered*. The world split into
disconnected fragments, each one stuck replaying the moment it broke in. The King who
built the Stillpoints is still in there, trapped in the fragment he made to seal the
damage, unable to finish what he started. You are carrying the one Stillpoint that
wasn't stolen — not to freeze the world again, but to move through it.

## The Fracture (the founding event)

> "We built the Stillpoints to anchor time itself. We never imagined what it would
> mean for one of them to break." — `lore_f1`, *the_fracture*

The Stillpoints were built for permanence, not resilience — nothing about them was
designed to fail gracefully. When one broke, the world didn't end; it fragmented into
disconnected pockets, each still locally obeying the anchor that used to hold it,
looping the instant of its own breaking:

> "The bridge didn't fall. It refused to hold. There is a difference, and I understand
> it now." — `lore_eb1`, *echo_bridge*

> "The crystals are made of frozen time." — `lore_cc1`, *crystal_cavern*

> "Every gap is a small surrender." — `lore_tr1`, *the_rift*

Read together, these aren't separate hazards — they're the same event (a structure
losing its ability to stay whole) recurring at every scale, from a bridge to a
crystal to a floor. That's the shape of the world: everything you're platforming
through is mid-collapse, held together only by momentum.

## The King

> "Before the fracture, these halls echoed with our voices. Now only the fracture
> echoes back." — `lore_ur1`, *upper_ruins*

> "The King built this place. He was proud of it. He said permanence was the highest
> art." — `lore_ur2`, *upper_ruins*

> "He was wrong. Nothing permanent survives time. Permanence just means you suffer
> longer when it ends." — `lore_ur3`, *upper_ruins*

> "He forged his own prison here. Every barrier he built was one more thing that could
> not bend — and so had to break." — `lore_tf1`, *the_forge*

> "He was the first of us to step into the fracture. He did it to seal it. He is still
> there. He is still trying." — `lore_ac1`, *antechamber*

> "The Fractured King does not want your death. He wants someone to finally stop him.
> He cannot stop himself." — `lore_ac2`, *antechamber*

He isn't a villain in the conventional sense — he's the origin of the game's whole
theme, taken to its endpoint. He tried to make something that could never end, it
ended anyway, and now he's the one thing in the world that can't stop repeating its
own breaking. The fight with him isn't a punishment; per the last fragment, it's the
only way he ever finishes.

## Stillpoint (the ability, the artifact, the word)

> "Stillpoint: the moment between moments. He stole ours. We kept one hidden here —
> for whoever came next." — `lore_tv1`, *the_vault*

> "Go. He is waiting. He has always been waiting. Since the fracture he cannot do
> anything else." — `lore_tv2`, *the_vault*

The King's Stillpoint is the one that broke and caused the fracture. The player's
Stillpoint (picked up in *the_vault*, the last calm room before *the_rift*) is a
second one, deliberately hidden by whoever wrote these fragments, specifically so it
would outlast them and reach someone able to use it. It's framed as inheritance, not
loot — the game's only ability pickup with an explicit "this was left *for you*."

## The Crag of the Colossus

A side region, spatially and narratively separate from the King's story — it's about
someone else's attempt to hold something together, with its own small tragedy:

> "The crag does not yield to a light hand. Strike as though you mean to end
> something." — `lore_ce1`, *crag_entrance*

> "Something split this stone in one blow. We have been trying to understand the blow
> ever since." — `lore_cb1`, *crag_breach*

> "We gave the crag a heart of crystal so it would remember how to stand. It
> remembers too well." — `lore_ca1`, *crag_altar*

The Colossus Core (the region's miniboss) is the "heart of crystal" — a construct
built to hold the crag's structure together after whatever split it. It worked too
well: the construct has no off-switch, no memory of anything except "hold the shape,"
and it will fight forever whether or not the crag still needs holding. It's a smaller,
non-sapient echo of the King's own arc (something built for permanence that outlived
its purpose and can't stop) — intentionally not resolved or explained further; the
Crag doesn't need its own King-sized answer.

## Reading order

The fragments are written to be found roughly in this sequence (mirrors the intended
play order, `col`/`row` in `area.js`):

1. `lore_f1` — the_fracture — the founding event
2. `lore_eb1` — echo_bridge — the event repeating at small scale
3. `lore_ur1`, `lore_ur2`, `lore_ur3` — upper_ruins *(optional branch)* — who the King
   was, and the game's thesis statement
4. `lore_cc1` — crystal_cavern — the event repeating again, differently
5. `lore_tf1` — the_forge — the King's arc stated directly
6. `lore_tv1`, `lore_tv2` — the_vault — the Stillpoint's origin and why it was hidden
7. `lore_tr1` — the_rift — thesis restated as a platforming beat
8. `lore_ac1`, `lore_ac2` — antechamber — who the King is now, and why the fight happens
9. `lore_ce1` (crag_entrance), `lore_cb1` (crag_breach), `lore_ca1` (crag_altar)
   *(optional branch, any order)* — the Crag's self-contained echo of the main theme

## Notes for whoever builds the display system

- Don't dump these as dialogue boxes — the existing fragments are written as found
  text/inscriptions, not speech. Match `cave_design_plan.md`'s "background landmarks"
  approach: legible from a distance, optional to read closely.
- `upper_ruins` and the Crag fragments are the only ones gated behind an optional
  branch — they're allowed to go unread by a player who beelines the spine. Don't
  gate anything plot-critical (the King's motive, the Stillpoint's origin) behind
  100%-optional content; those already sit on the mandatory path.
- Future regions (per `expansion.md`) should keep the same rule this doc reverse-
  engineered from the existing text: each region's lore is a self-contained variation
  on "something built to be permanent, and what happened when it couldn't be" — not a
  new theme per region.


Core Principle: Lore is never read. It is felt and seen. Text pop-ups are permanently disabled.

Mechanics:

    Collectibles: Scattered throughout the world are Echo Shards (glowing, fragmented geometric shapes).

    Progression: Collecting a Shard does not reveal text. Instead, it fills a meter for one of 3 Aspects of your choice:

        Amplify (Increases melee/projectile damage over time).

        Resilience (Increases damage-over-time resistance and reduces hitstun).

        Flux (Increases movement speed and dash distance over time).

    Visual Feedback (The "Lore"):

        On Collection: The screen does not pause. Instead, a brief, ghostly flashback overlays the background for 1.5 seconds (e.g., a city crumbling, the King forging a chain, a Stillpoint activating). The player can keep moving during this—it’s atmospheric, not disruptive.

        Permanent Environment Change: As you collect more Shards, the world geometry subtly alters:


    Why this works: It ties exploration to tangible stat upgrades, makes the world react to your specific playstyle (damage vs. speed vs. tank), and delivers the King's backstory without a single line of mandatory reading. The inscriptions and flashbacks are environmental paintings, not homework.