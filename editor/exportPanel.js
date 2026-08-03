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
  };
})();
