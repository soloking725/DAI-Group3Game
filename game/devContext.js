// Shared dev-tool state (2026-07-23, made Electron-shared 2026-08-04). Each
// editor used to track "what am I working on" independently, so switching
// tools meant re-finding your place every time. This is the shared piece:
// any editor can read/write it via a plain <script> tag (same convention as
// every other game/*.js global — no bundler, no modules).
//
// Milestone 3 (Plans/unified_editor_ide_plan.md): under the Electron shell,
// window.stillpointAPI.devContext (editor_shell/preload.js +
// editor_shell/devContextStore.js) is the real source of truth — one copy
// in the main process, persisted to disk, pushed live to every open tab.
// Outside Electron (a tool opened in a plain browser tab against
// save-server.js, still a fully supported path per the plan doc), this
// falls back to the original localStorage + 'storage'-event behavior,
// unchanged. Either way, DevContext.get()/.set()/.log()/.recent() stay
// synchronous — callers across ~22 editor files never had to change.
(function () {
  const STORAGE_KEY = 'stillpoint_dev_context';
  const ACTIVITY_MAX = 30;
  const isElectron = !!(window.stillpointAPI && window.stillpointAPI.isElectron && window.stillpointAPI.devContext);

  function loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.activity)) parsed.activity = [];
        return parsed;
      }
    } catch (e) { /* corrupt or inaccessible — fall through to a fresh state */ }
    return { currentRoomId: null, currentEnemyId: null, currentAnimationKey: null, activity: [] };
  }

  const state = loadLocal();

  function saveLocal() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* quota/full — this tab's cache just won't persist */ }
  }

  // Fired whenever `state` changes for a reason this tab didn't cause
  // directly (a push from the main process, or another browser tab's
  // localStorage write) — pages that want to live-update beyond the next
  // user interaction can listen for this instead of polling.
  function notifyChanged() {
    window.dispatchEvent(new CustomEvent('devcontext:changed', { detail: state }));
  }

  function applyRemote(remoteState) {
    if (!remoteState) return;
    Object.assign(state, remoteState);
    saveLocal();
    notifyChanged();
  }

  if (isElectron) {
    window.stillpointAPI.devContext.get().then(applyRemote).catch(() => { /* main process not ready yet — local cache stands until the next push */ });
    window.stillpointAPI.devContext.onChanged(applyRemote);
  } else {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) applyRemote(loadLocal());
    });
  }

  window.DevContext = {
    get() { return state; },

    // Merge-patch the "what am I working on" fields (currentRoomId, etc).
    set(patch) {
      Object.assign(state, patch);
      saveLocal();
      if (isElectron) window.stillpointAPI.devContext.set(patch).catch(() => {});
    },

    // Record a line in the cross-tool activity feed. `tool` should match a
    // TOOLS entry's short label in dev_hub.html so the feed reads cleanly.
    log(tool, action, detail) {
      state.activity.unshift({ tool, action, detail: detail || '', ts: Date.now() });
      if (state.activity.length > ACTIVITY_MAX) state.activity.length = ACTIVITY_MAX;
      saveLocal();
      if (isElectron) window.stillpointAPI.devContext.log(tool, action, detail).catch(() => {});
    },

    recent(n) {
      return state.activity.slice(0, n || ACTIVITY_MAX);
    },
  };
})();
