// IndexedDB-backed storage for anim_editor.html's uploaded sprite images
// (2026-07-23). frame.image used to hold the raw base64 data URL directly,
// which then got included whole every time ANIM_DEFS was JSON.stringify'd
// into localStorage (saveOverrides()) — a single 512x512 upload is already
// ~2MB as base64, and localStorage has a 5-10MB hard quota, so two or three
// uploads made "Save" fail silently with QuotaExceededError.
//
// Fix: frame.image now holds a short id (see generateId()) instead of the
// data URL; the actual bytes live here in IndexedDB, which has no such
// practical size limit. getAnimImage() in game/animdata.js resolves either
// form — legacy exported ANIM_DEFS entries with a raw `data:` URL baked in
// still work unchanged, since that's what a paste-into-source export
// produces (self-contained on purpose, no IndexedDB dependency at runtime
// for shipped content).
(function () {
  const DB_NAME = 'stillpoint_anim_images';
  const STORE_NAME = 'images';
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  window.AnimImageStore = {
    async put(id, dataUrl) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(dataUrl, id);
        tx.oncomplete = () => resolve(id);
        tx.onerror = () => reject(tx.error);
      });
    },
    async get(id) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    },
    async delete(id) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
    // Every key referencing this store is prefixed so getAnimImage() can
    // tell "IndexedDB id" apart from a legacy inline `data:` URL at a
    // glance, with no ambiguity.
    generateId() {
      return 'idb_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    },
  };
})();
