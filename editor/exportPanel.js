// Shared "write paste-ready text into #exportBox, select it, log it" shell
// (2026-08-02), lifted out of anim_editor.html/combo_editor.html/
// hud_editor.html/inventory_editor.html's four identical exportJSON()
// bodies — same pattern as game/undoHistory.js and editor/anchoredDrag.js.
// Each caller keeps its own header comment + JSON.stringify wrapping (those
// genuinely differ per editor's target file/shape); only the DOM shell was
// actually duplicated.
(function () {
  window.ExportPanel = {
    // boxId: the <textarea> to fill. text: the full paste-ready string
    // (header comment + code). logSource/logMsg/logDetail: passed straight
    // to DevContext.log() if it's loaded; omit logSource to skip logging
    // (anim_editor.html's original didn't log).
    write(boxId, text, logSource, logMsg, logDetail) {
      const box = document.getElementById(boxId);
      box.value = text;
      box.select();
      if (logSource && typeof DevContext !== 'undefined') {
        DevContext.log(logSource, logMsg, logDetail || '');
      }
    },

    // Reverse of write() (2026-08-04) — every exportJSON() here wraps its
    // JSON.stringify output in a header comment + a source-file-shaped
    // assignment ("COMBO_DEFS = {...};", "Object.assign(ANIM_DEFS, {...});",
    // etc.), specifically so the export is paste-ready for the real source
    // file. That wrapping differs per caller, so rather than parsing the
    // whole text as one shape, this finds the first top-level {...} or
    // [...] block (string-literal-aware, so braces inside JSON string
    // values don't desync the depth count) and JSON.parses just that —
    // works unmodified against a previously-exported block OR a bare JSON
    // paste with no wrapper at all. Throws with a message meant to be shown
    // to the user directly (caller should catch and alert/status it).
    read(boxId) {
      const box = document.getElementById(boxId);
      const text = box.value;
      const start = text.search(/[[{]/);
      if (start === -1) throw new Error('No JSON object/array found in the pasted text.');
      const openChar = text[start];
      const closeChar = openChar === '{' ? '}' : ']';
      let depth = 0, inStr = false, esc = false, end = -1;
      for (let i = start; i < text.length; i++) {
        const c = text[i];
        if (inStr) {
          if (esc) esc = false;
          else if (c === '\\') esc = true;
          else if (c === '"') inStr = false;
          continue;
        }
        if (c === '"') { inStr = true; continue; }
        if (c === openChar) depth++;
        else if (c === closeChar) { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end === -1) throw new Error('Unbalanced brackets — could not find the matching close for the JSON block.');
      return JSON.parse(text.slice(start, end + 1));
    },
  };
})();
