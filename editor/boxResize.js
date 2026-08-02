// Shared "resize a {x,y,w,h} box by dragging one of its corners, opposite
// corner stays fixed" math. anim_editor.html's hitbox/hurtbox resize
// (single 'se' handle only) and room_scene_editor.js's cutscene-trigger
// resize (all 4 corners) independently hand-rolled this — same formula,
// anim_editor's case is just what you get calling this with corner='se'.
//
// orig: the box's {x, y, w, h} at drag-start. dx/dy: mouse delta since
// drag-start, in the same coordinate space as orig (screen or world —
// caller's job to convert). minSize: floor on w/h so a box can't be
// dragged to zero/negative size.
function resizeRectByCorner(orig, corner, dx, dy, minSize) {
  let { x, y, w, h } = orig;
  if (corner === 'se') {
    w = Math.max(minSize, orig.w + dx);
    h = Math.max(minSize, orig.h + dy);
  } else if (corner === 'nw') {
    w = Math.max(minSize, orig.w - dx);
    h = Math.max(minSize, orig.h - dy);
    x = orig.x + (orig.w - w);
    y = orig.y + (orig.h - h);
  } else if (corner === 'ne') {
    w = Math.max(minSize, orig.w + dx);
    h = Math.max(minSize, orig.h - dy);
    y = orig.y + (orig.h - h);
  } else if (corner === 'sw') {
    w = Math.max(minSize, orig.w - dx);
    h = Math.max(minSize, orig.h + dy);
    x = orig.x + (orig.w - w);
  }
  return { x, y, w, h };
}
