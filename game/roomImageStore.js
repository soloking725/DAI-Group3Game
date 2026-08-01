// IndexedDB-backed storage for editor/room_scene_editor.html's uploaded room
// background/decoration images (2026-07-29). Identical shape to
// game/animImageStore.js (see that file's own header comment for the full
// rationale — a single uploaded image is easily 1-2MB as base64, and
// localStorage's ~5-10MB quota fails silently after 2-3 uploads). A sibling
// store rather than reusing AnimImageStore's DB so the two editors' uploaded
// assets don't share one object store (no reason for a background PNG and a
// character sprite frame to collide on id namespace, and either editor can
// clear its own store independently).
(function () {
  const DB_NAME = 'stillpoint_room_images';
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

  window.RoomImageStore = {
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
    // Same prefix convention as AnimImageStore.generateId() so a value's
    // origin (IndexedDB id vs. a legacy/shipped inline `data:` URL) is
    // unambiguous at a glance wherever a backdropLayers[].imageId is read.
    generateId() {
      return 'idb_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    },
  };
})();
