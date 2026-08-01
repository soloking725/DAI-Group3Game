// ── Visual variants — generic "same behavior, different look" resolver ──────
// Added 2026-08-01 (Plans/production_workflow_and_tool_gaps.md addendum).
// The concrete trigger was hazards always rendering identical red spikes
// regardless of region, but the mechanism is deliberately generic — the same
// resolver backs enemy re-skins (a Fractured that looks frostbitten in one
// region and the same enemy unchanged elsewhere) and is meant to be reused
// for any future "reskin without duplicating logic" case (destructibles,
// pickups, etc.) rather than writing a bespoke lookup per category.
//
// Priority, cheapest/most-specific first:
//   1. an explicit per-instance override (authored on the placement itself,
//      e.g. an enemy's `tint` field in area.js/levelEditor.html)
//   2. a REGION_STYLES[region][`${category}Variant`] entry (opt-in per
//      region, edited the same way primary/secondary/glow already are)
//   3. null — caller falls back to its own hardcoded default, unchanged
//      from today's behavior for every region that hasn't opted in.
//
// Reads REGION_STYLES as a loosely-coupled global (same convention
// game_entities.js already uses for it) rather than importing it, so this
// file has no hard load-order dependency on where REGION_STYLES is defined.

function getVisualVariant(category, region, instanceOverride) {
  if (instanceOverride) return instanceOverride;
  const style = (typeof REGION_STYLES !== 'undefined') ? REGION_STYLES[region] : null;
  if (!style) return null;
  return style[category + 'Variant'] || null;
}

// Hazard convenience wrapper — always returns a usable {fill, stroke} pair.
// A region with no hand-authored hazardVariant still gets *something*
// distinct from the plain-red default for free, derived from its existing
// primary/secondary colors (no new creative color choices invented here —
// just reusing data REGION_STYLES already has).
const HAZARD_DEFAULT_STYLE = { fill: 'rgba(248,113,113,0.18)', stroke: '#f87171' };
function getHazardStyle(region, instanceOverride) {
  const variant = getVisualVariant('hazard', region, instanceOverride);
  if (variant) return variant;
  const style = (typeof REGION_STYLES !== 'undefined') ? REGION_STYLES[region] : null;
  if (style && style.primary) {
    const fill = (typeof hexToRgba === 'function') ? hexToRgba(style.primary, 0.18) : HAZARD_DEFAULT_STYLE.fill;
    return { fill, stroke: style.secondary || style.primary };
  }
  return HAZARD_DEFAULT_STYLE;
}

// Enemy convenience wrapper — returns a hex color string or null. null means
// "use the enemy's own def.color, unchanged" (today's behavior everywhere
// this isn't opted into). `instanceOverride` is the placement's own `tint`
// field (area.js's `enemies[]` entries, editable in levelEditor.html).
function getEnemyTint(region, instanceOverride) {
  return getVisualVariant('enemy', region, instanceOverride);
}

if (typeof window !== 'undefined') {
  window.getVisualVariant = getVisualVariant;
  window.getHazardStyle = getHazardStyle;
  window.getEnemyTint = getEnemyTint;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getVisualVariant, getHazardStyle, getEnemyTint, HAZARD_DEFAULT_STYLE };
}
