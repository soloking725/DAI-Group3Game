// Shared undo/redo (2026-07-23), lifted out of levelEditor.html's own
// history stack (clone-on-push, index into a capped array) so the other
// editors don't each reinvent it. Coarse-grained by design: call push()
// after a structural change (add/remove/type change), not on every
// keystroke/drag-pixel — same convention levelEditor already uses (it
// debounces nudges before pushing, for the same reason).
(function () {
  function clone(o) {
    return typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o));
  }

  window.UndoHistory = {
    // getState/setState: () => data / (data) => void — read & write the
    // tool's working data. limit: max entries kept (default 60).
    create(getState, setState, limit) {
      limit = limit || 60;
      let history = [clone(getState())];
      let index = 0;
      return {
        push() {
          history = history.slice(0, index + 1);
          history.push(clone(getState()));
          if (history.length > limit) history.shift();
          index = history.length - 1;
        },
        undo() {
          if (index <= 0) return false;
          index--;
          setState(clone(history[index]));
          return true;
        },
        redo() {
          if (index >= history.length - 1) return false;
          index++;
          setState(clone(history[index]));
          return true;
        },
        reset() { history = [clone(getState())]; index = 0; },
        canUndo() { return index > 0; },
        canRedo() { return index < history.length - 1; },
      };
    },
  };
})();
