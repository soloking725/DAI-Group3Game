// Shared dev-tool state (2026-07-23). Each editor used to track "what am I
// working on" independently, so switching tools meant re-finding your place
// every time. This is the shared piece: one localStorage-backed object any
// editor can read/write via a plain <script> tag (same convention as every
// other game/*.js global — no bundler, no modules).
(function () {
  const STORAGE_KEY = 'stillpoint_dev_context';
  const ACTIVITY_MAX = 30;

  function load() {
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

  const state = load();

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* quota/full — activity log just won't persist this entry */ }
  }

  window.DevContext = {
    get() { return state; },

    // Merge-patch the "what am I working on" fields (currentRoomId, etc).
    set(patch) {
      Object.assign(state, patch);
      save();
    },

    // Record a line in the cross-tool activity feed. `tool` should match a
    // TOOLS entry's short label in dev_hub.html so the feed reads cleanly.
    log(tool, action, detail) {
      state.activity.unshift({ tool, action, detail: detail || '', ts: Date.now() });
      if (state.activity.length > ACTIVITY_MAX) state.activity.length = ACTIVITY_MAX;
      save();
    },

    recent(n) {
      return state.activity.slice(0, n || ACTIVITY_MAX);
    },
  };
})();
