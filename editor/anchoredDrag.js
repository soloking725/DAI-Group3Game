// Shared "click-and-drag an anchor-positioned layout element on a canvas"
// logic. hud_editor.html and inventory_editor.html each independently
// implemented byte-identical anchor resolution and mousedown/mousemove/
// mouseup drag handlers for dragging their layout elements (HUD_LAYOUT /
// INVENTORY_LAYOUT entries) — differing only in which keys are draggable
// and how each key's on-screen bounds are computed, both of which stay
// per-file callbacks here.
//
// Anchor vocabulary: 'top-left' (default) / 'top-center' / 'bottom-left' /
// 'bottom-right' / 'bottom-center' — resolves an element's stored
// {x, y, anchor} into an absolute on-screen {x, y} against a W x H canvas.
function resolveAnchored(el, W, H) {
  switch (el.anchor) {
    case 'top-center':    return { x: W / 2 + el.x, y: el.y };
    case 'bottom-left':   return { x: el.x, y: H - el.y };
    case 'bottom-right':  return { x: W - el.x, y: H - el.y };
    case 'bottom-center': return { x: W / 2 + el.x, y: H - el.y };
    default:              return { x: el.x, y: el.y };
  }
}

// opts:
//   canvas          — element to listen for mousedown/mousemove on
//   getDraggableKeys() -> string[]   hit-test order, topmost/frontmost first
//   getElement(key) -> { x, y, anchor, visible? }   the mutable layout entry
//   boundsFor(key) -> { x, y, w, h }   on-screen hit-test rect for that key
//   onSelect(key|null)   called on mousedown (hit or empty-space click)
//   onChange()           called on every mousemove while dragging (redraw)
//   onDragEnd()           called once when the drag finishes (commit undo)
function makeAnchoredDragController(opts) {
  const { canvas, getDraggableKeys, getElement, boundsFor, onSelect, onChange, onDragEnd } = opts;
  let drag = null;
  canvas.addEventListener('mousedown', (e) => {
    const mx = e.offsetX, my = e.offsetY;
    for (const key of getDraggableKeys()) {
      const el = getElement(key);
      if (el.visible === false) continue;
      const b = boundsFor(key);
      if (mx >= b.x - 4 && mx <= b.x + b.w + 4 && my >= b.y - 4 && my <= b.y + b.h + 4) {
        drag = { key, startMx: mx, startMy: my, origX: el.x, origY: el.y };
        onSelect(key);
        return;
      }
    }
    onSelect(null);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (!drag) return;
    const el = getElement(drag.key);
    const dx = e.offsetX - drag.startMx, dy = e.offsetY - drag.startMy;
    // convert screen delta into the element's anchored coordinate space
    el.x = Math.round(drag.origX + (el.anchor === 'bottom-right' ? -dx : dx));
    el.y = Math.round(drag.origY + (el.anchor && el.anchor.startsWith('bottom') ? -dy : dy));
    onChange();
  });
  window.addEventListener('mouseup', () => {
    if (!drag) return;
    drag = null;
    onDragEnd();
  });
}
