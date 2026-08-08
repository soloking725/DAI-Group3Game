# Editor Design System — Style Guide & Application Checklist

Companion doc to `Plans/archive/editor_redesign.md` (the original design
brief, archived 2026-08-03) and
`styles/design-system.css` (the implementation). Read this before touching
any file in `editor/` — it's the repeatable recipe, applied identically to
all ~21 editor tools so the whole suite reads as one system instead of one
redesigned file plus twenty untouched ones.

## Why this exists

`editor_redesign.md` specifies a "Linear/Modern" marketing-site design
system (hero sections, bento grids, scroll parallax). The editor suite is
not a marketing site — it's ~21 always-open developer tools used for hours
at a stretch, several with dense tables, 100+ row lists, or real-time
canvases. This doc is the **adaptation**: same DNA (deep-space palette,
ambient indigo light, multi-layer shadows, precision micro-interactions),
scaled for information density instead of scroll storytelling.

Deliberate departures from the marketing-site brief, and why:
- **No hero/bento/scroll-parallax sections.** Nothing in these tools scrolls
  as a narrative; there's no hero to have.
- **Ambient ~~blobs~~ blobs kept, but smaller (380–560px vs 900–1400px) and
  lower-opacity (~0.5 vs 0.25 pre-blur, further reduced by mask/position).**
  A `1400px` blob behind a dense data table reads as visual noise, not
  atmosphere. `.ds-ambient`/`.ds-blob-*` in the CSS are the toned-down
  version — present in every redesigned tool for the signature look, but
  never fighting the content.
- **Mono/UI type split.** The brief specifies Inter throughout. These tools
  already lean on monospace for data (stat values, IDs, JSON export, log
  lines) — a real, useful convention (tabular alignment, "this is data not
  prose"), not legacy cruft to remove. Kept: `--font-ui` (Inter) for nav,
  labels, buttons, headings; `--font-mono` (JetBrains Mono → Courier New
  fallback) for anything numeric/code/export. This is the one place this
  system diverges from the literal brief on purpose — it's a better fit for
  "developer tool" than an Inter monoculture would be, and it's applied
  the same way in every file.
- **Mouse-tracking spotlights**: applied to top-level cards/panels only
  (sidebars, stat tiles on hover), never per-row in a 100-row list — that
  would mean 100 mousemove listeners for zero perceptible benefit.
- **Canvas rendering is off-limits.** Per `editor_redesign.md`'s own canvas
  constraint: only the canvas's base/ambient `fillStyle` may change (to
  `#050506` / `var(--bg-base)`, matching the new palette). All entity,
  hitbox, platform, sprite, and grid-line colors inside a canvas draw loop
  are functional signal for the tool — untouched, always.

## Token reference

All tokens live in `styles/design-system.css` under `:root`. Full palette,
type scale, radius/shadow/spacing scale, and motion timing are documented
inline there as comments — this doc doesn't duplicate the values, only the
*usage rules*:

- Never hardcode a hex/rgba color in a file's internal `<style>` block if a
  token already means that color. `#c4b5fd` body text → `var(--fg-subtle)`
  or `var(--fg)` depending on emphasis; `#06060e` backgrounds → `var(--bg-
  base)`; a bespoke `#2e2e5e` border → `var(--border-hover)`. Search-review
  every hex literal before calling a file done.
- Status colors are semantic, not decorative: `--ok`/`--warn`/`--danger`/
  `--info` map to pass/warning/fail-or-error/informational everywhere,
  matching what the existing tools already used (teal/emerald=pass,
  amber=warn, rose=fail) — the redesign changes *how* these render
  (badges, glows, borders) not *what they mean*.
- Spacing: use `var(--space-*)` for new/replaced padding-margin values.
  Don't chase down every `6px`/`10px` in a file if it's not being touched
  anyway — prioritize structural containers (topbar, sidebar, panel,
  button, input, card) over incidental one-off gaps.

## Per-file application checklist

Work through every file in `editor/` in this order. For each:

1. **Link the stylesheet.** Add
   `<link rel="stylesheet" href="../styles/design-system.css">`
   as the *first* thing in `<head>`, before the file's own `<style>` block,
   so internal rules can still win if a tool genuinely needs a one-off
   override (per `editor_redesign.md`'s instruction).
2. **Tag the root.** Add `class="ds-root ds-ambient"` to `<body>` (or the
   outermost flex container if `<body>` itself isn't styled) and drop in
   the three `.ds-blob` divs (`ds-blob-a/b/c`) right after the opening tag,
   `aria-hidden="true"`, so screen readers skip them.
3. **Re-home structural containers onto utility classes**, keeping every
   existing `id` (JS depends on them — never rename an id or remove an
   event-listener target):
   - Top bar → add `class="ds-topbar"` alongside its existing id.
   - Sidebar/side panel → add `class="ds-sidebar ds-scroll"` (or
     `ds-sidebar-left` if it sits on the left edge).
   - Section headers (`h2`, `.section-title`, etc.) → `class="ds-section-
     title"`.
   - Buttons → `class="ds-btn"` plus a variant (`ds-btn-primary` for the
     one primary action per view, `ds-btn-danger` for reset/delete,
     `ds-btn-ghost` for low-emphasis, `ds-btn-block` for full-width). Toggle/
     filter buttons get `ds-btn ds-btn-toggle` + `is-active` swapped by the
     existing JS (same pattern as the old `.active` class — just rename the
     class the JS toggles, don't change the toggling logic).
   - Text/number inputs, selects, textareas → `ds-input`/`ds-select`/
     `ds-textarea`.
   - Row wrappers (`label` + `input` pairs) → `ds-row`.
   - Card-like containers (stat tiles, list rows) → `ds-stat`/`ds-list-row`
     (+`ds-list-row-head` for the clickable header part) as structurally
     appropriate.
   - Status/type tags (`pass`/`warn`/`fail`/`built`/etc.) → `ds-badge` +
     `is-ok`/`is-warn`/`is-danger`/`is-info`/`is-accent`.
   - "← Back to Dev Hub" links → `ds-back`.
   - Canvas wrapper → `ds-stage` on the container, canvas itself gets the
     `ds-stage canvas` shadow/radius treatment automatically.
4. **Replace hardcoded values in the internal `<style>` block** with
   `var(--token)` per the token reference above. Do a full pass over every
   color literal in the block, not just the ones inside newly-classed
   elements.
5. **Canvas constraint check** (only for levelEditor/enemy_designer/
   anim_editor/enemy_test/companion_test/difficulty_bot): grep the file's
   `<script>` for `fillStyle = '#0` or similar background-clear calls at
   the top of the draw loop; change only that literal to `#050506`. Leave
   every other `fillStyle`/`strokeStyle` inside the loop exactly as-is.
6. **Functionality diff.** Before/after, confirm:
   - Every `id` referenced by `getElementById`/`querySelector` in the
     file's `<script>` still exists with the same id.
   - Every class an event listener adds/removes/toggles/checks
     (`classList.add/remove/toggle/contains`) still exists with the same
     name, or the JS was updated in lockstep (e.g. the toggle-group
     `active`→`is-active` rename above — rename in *both* places together).
   - No `<script src>` tags, keyboard listeners, drag handlers, or
     undo/redo logic were touched.
7. **Update `Plans/roadmap.md`** (or this doc's own status list below) once
   a file is done, same convention as the rest of the repo.

## Suggested shared spotlight snippet

For a top-level panel/card that should track the cursor (sidebar, stat
row, a tool's single hero canvas frame), reuse this exact snippet rather
than hand-rolling a new one per file — keeps the interaction identical
suite-wide:

```html
<script>
document.querySelectorAll('.ds-card-interactive').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});
</script>
```

Paired with (add to the file's internal `<style>` if that file uses the
spotlight): a `::before` on `.ds-card-interactive` with `background:
radial-gradient(300px circle at var(--mx) var(--my), var(--accent-glow-
soft), transparent 70%); opacity: 0; transition: opacity var(--dur-med)
var(--ease-out-expo);` and `opacity: 1` on `:hover`.

## Status

Pilot file (proves no functionality lost): `editor/room_verify.html`.
Full rollout status tracked in this session's task list / `roadmap.md` —
see there for which of the ~21 files are done vs. pending as of the last
session that touched this doc.

As of 2026-08-05: 26 of 26 `editor/*.html` files link the stylesheet.
`editor/asset_browser.html` was the last holdout (a later, small file that
never got swept in) — migrated per the checklist above (link added first
in `<head>`, `ds-root ds-ambient` body + 3 blobs, `ds-btn`/`ds-input`
classes on its button/inputs, hardcoded colors in its internal `<style>`
block replaced with tokens). No ids/classes touched by its `<script>`
changed, so no JS changes were needed.
