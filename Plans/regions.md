# Regions — existence, room counts, and effects

Scope of this doc: which regions exist (built or planned), roughly how many
rooms each has/will have, and what each room's *special effect* (the
physics/mechanic that makes it feel distinct) is meant to be. Deliberately
NOT covered here: door topology, connections[], cross-links, ability
gating — that's area.js's compass graph and expansion.md §3.13b/§3.14. This
is a "what exists and what it feels like," not a "how it connects" doc.

---

## Built (3 anchor regions — see roadmap.md Phase 9)

All three are currently empty skeletons (flat floor + doors only) — no
special effect is implemented yet. Task 4 (cave-aesthetic pass) gives them
a first visual identity; none of them have their *mechanical* effect (the
thing that makes traversal feel different, not just look different) built.

| Region | Rooms | Planned mechanical effect (not yet built) |
|---|---|---|
| Mirror Veil | 4 (gate, reflection, hollow, sanctum) | Background is inverted; secret paths exist only in the reflected version of the room, not the "real" one — per expansion.md §3.2. |
| Event Horizon | 4 (gate, pull, drift, core) | Constant gravitational pull toward one side of the room (leftward per §3.1) — platforming against a steady lateral force, not just gaps. |
| Chrono-Space Rift | 4 (gate, loop, echo, sanctum) | Looping room — anything (player, projectile, enemy) that exits one side reappears on the other (wrap-around), per §3.6. |

---

## Planned (10 remaining of the 13 expansion.md regions)

None of these exist as real `AREAS` entries yet — `worldmap.html` shows
each as a single placeholder node. Room counts below are estimates (the
task 2 convention of 4-7 rooms/region), not committed layouts.

| Region | Cluster | Est. rooms | Special effect |
|---|---|---|---|
| Graviton Core | Gravity (col 5) | 4-6 | Levers that flip gravity for the room; grants Graviton Surge. |
| The Inverted Spire | Gravity (col 5) | 4-6 | Gravity permanently inverted — "up" and "down" are swapped from the moment you enter. |
| The Observatory | Void/Sky (col 4) | 4-6 | Low gravity — floaty jumps, long hang time, heavy verticality. |
| The Void Expanse | Void/Sky (col 4) | 5-7 | No solid ground at all — every platform is a moving "time-stopped debris" chunk; timing, not positioning, is the whole puzzle. |
| Warp Gate Nexus | Void/Sky (col 4) | 5-7 (hub + 3-4 vaults) | Teleporter hub — a central room branching into 3-4 small self-contained challenge vaults. |
| The Polar Shift | Magnetic (col 6) | 4-6 | Blue walls push, red walls pull — traversal is bouncing between magnetic surfaces like a pinball, not jumping. |
| Paradox Engine | Magnetic (col 6) | 5-7 | Chase zone — a giant machine actively hunts the player through a maze while normal enemies still need fighting. |
| Static Field | Magnetic (col 6) | 4-6 | Electromagnetic arcs chain across the room; touching the floor zaps you upward (must stay airborne). Also corrupts the map overlay while inside (and briefly after) — a presentational glitch only, `discoveredAreas` is never actually altered. |
| Timeline Crossroads | Time/Mirror (col 5, south) | 4-6 | Two overlapping time states, Past (crumbling) and Present (safe); enemies phase in/out, only vulnerable when "Present" (gold tint). |
| Echoing Abyss | Time/Mirror (col 5, south) | 4-6 | Your own dashes/attacks leave lingering echoes (2s) that double as real platforms — you can jump on your own echo. |

---

## Future — 25 physics/paradox concepts for 5 more regions (brainstorm only)

You asked to think beyond the 13 already planned. These are NOT assigned to
any region, NOT added to `area.js`/`worldmap.html`/`expansion.md`, and
carry no col/row, room count, or gating — pure raw material for picking 5
new regions from. Grouped loosely by category so related ideas sit near
each other; pick freely across groups.

### Fundamental forces
1. **Strong Force** — extreme short-range attraction that flips to violent repulsion just past a threshold distance; platforms/enemies snap together then fling apart, teaching players to respect a very narrow "safe band."
2. **Weak Force / Radioactive Decay** — platforms "decay" on an unpredictable per-platform timer (visibly ticking down, but the exact moment is randomized within a window), forcing players to commit before they're fully sure.
3. **Electromagnetic Induction** — moving through a coil-shaped room/loop generates a charge that powers a door elsewhere; traversal *is* the power source, not a separate switch.
4. **Casimir Effect** — two very close parallel walls pull the player toward the gap between them (vacuum pressure); a "squeeze" traversal challenge rather than a gap-to-cross.

### Quantum phenomena
5. **Quantum Superposition** — a platform is simultaneously in two positions until the player looks directly at it (camera/facing check), at which point it "collapses" to one — reward for looking away vs. straight-on.
6. **Quantum Tunneling** — thin walls have a real (not scripted) chance to let a fast-enough dash pass through; encourages speed as its own traversal tool, distinct from Phase Dash's guaranteed pass.
7. **Heisenberg Uncertainty** — the room can show you the player's true position OR true velocity/trajectory, never both at once (HUD/visual toggle tied to player speed) — a puzzle about acting on incomplete information.
8. **Schrödinger's Door** — a door is simultaneously locked and open until the player commits to an approach vector; approaching from one side "decides" its state.
9. **Entanglement** — two platforms/switches in different parts of the room (or even a different room) are paired; acting on one instantly mirrors on the other, including from off-screen.

### Thermodynamics & entropy
10. **Entropy (2nd Law)** — a room that only ever becomes more disordered over time (platforms drift/scatter, never on their own reassemble) unless the player actively "resets" it via an anchor — a room that punishes hesitation structurally, not just with enemies.
11. **Hawking Radiation** — near a black-hole feature, platforms slowly "evaporate" from the edges inward — a soft timer that's visual/gradual rather than a hard countdown.
12. **Maxwell's Demon** — a sorting gate that only lets certain "kinds" of things through one way (e.g., only slow-moving vs. fast-moving projectiles/objects) — a filtering puzzle, not a binary lock.
13. **Standing Waves / Resonance** — platforms only solidify when the player's movement rhythm matches a visible/audible pulse — traversal gated by timing-to-a-beat, not raw platforming skill.

### Relativity & motion
14. **Time Dilation** — deep in a gravity well, the player's own actions play out in slow motion *from an outside observer's frame* — used for a puzzle where you have to predict how your slowed actions look to something outside the well.
15. **Twin Paradox** — two parallel routes of equal physical distance where one visibly takes "longer" in relative time than the other, and only the slower route lets a timed hazard elsewhere resolve safely.
16. **Length Contraction** — platforms visually compress or stretch based on the player's current dash speed — an illusion-based puzzle where the "safe" jump distance isn't what it looks like until you slow down.
17. **Conservation of Momentum** — long frictionless (ice-like) stretches where the player keeps momentum instead of stopping on release — inertia management as the core challenge, not gaps.
18. **Doppler Shift** — audio/visual cues (enemy telegraphs, hazard warnings) shift pitch/color based on relative velocity toward or away from the player — rewards using motion itself to "read" the room.

### Paradoxes (logic, not physics, but same design texture as "Paradox Engine")
19. **Zeno's Paradox** — a stretch where each jump only closes half the remaining distance to the goal (diminishing returns) until the player finds the specific action that breaks the halving pattern (e.g., a dash that isn't subject to it).
20. **Grandfather Paradox** — damaging or interacting with your own Echo (already a real mechanic via Phase Dash) retroactively alters the room's present-state layout — ties directly into the game's existing Echo system rather than inventing a new one.
21. **Bootstrap Paradox** — a loop room whose exit is also its own entrance, with no discernible "first cause" — a traversal puzzle about finding the one point where the loop can be broken rather than followed.
22. **Ship of Theseus** — platforms are replaced one at a time as the player crosses a long room, until none of the original platforms remain — tests whether the player notices, and rewards backtracking to check.
23. **Ontological Paradox** — an item found at the region's end is required to enter the region in the first place (via a one-way loop back to the start with the item already "always having been there") — a structural loop unique to a Tier 3 secret, not the main path.
24. **The Ship That Isn't There / Sorites Paradox** — a floor made of many small platform fragments that individually seem solid but collectively vanish past a threshold count remaining — a room that erodes by *quantity*, not by a timer.
25. **Simulation/Nested Reality** — a room that is revealed to be a smaller copy of an earlier room (same layout, different scale/palette), raising the question of which one is "real" — reuses existing room geometry cheaply while feeling new.
