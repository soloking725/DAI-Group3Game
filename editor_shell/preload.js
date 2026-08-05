const { contextBridge, ipcRenderer } = require('electron');

// The renderer-facing surface. Kept intentionally small and specific
// (no generic "run this IPC channel" passthrough) so a page can't be
// tricked into invoking something outside this exact API.
contextBridge.exposeInMainWorld('stillpointAPI', {
  isElectron: true,
  syncTopLevelKeys: (targetId, valueSources) =>
    ipcRenderer.invoke('stillpoint:syncTopLevelKeys', { targetId, valueSources }),
  patchPath: (targetId, path, valueSource, allowCreate) =>
    ipcRenderer.invoke('stillpoint:patchPath', { targetId, path, valueSource, allowCreate }),
  writeWhole: (targetId, valueSource) =>
    ipcRenderer.invoke('stillpoint:writeWhole', { targetId, valueSource }),
  patchArrayElement: (targetId, idValue, valueSource, allowCreate) =>
    ipcRenderer.invoke('stillpoint:patchArrayElement', { targetId, idValue, valueSource, allowCreate }),
  writeNamedVar: (targetId, varName, valueSource) =>
    ipcRenderer.invoke('stillpoint:writeNamedVar', { targetId, varName, valueSource }),
  generateAssetIndex: () =>
    ipcRenderer.invoke('stillpoint:generateAssetIndex'),
  readConst: (targetId) =>
    ipcRenderer.invoke('stillpoint:readConst', { targetId }),
  saveArtImage: (category, filename, dataUrl) =>
    ipcRenderer.invoke('stillpoint:saveArtImage', { category, filename, dataUrl }),
  applyAudioPick: (candidateFile, liveTrack) =>
    ipcRenderer.invoke('stillpoint:applyAudioPick', { candidateFile, liveTrack }),
  devContext: {
    get: () => ipcRenderer.invoke('stillpoint:devContextGet'),
    set: (patch) => ipcRenderer.invoke('stillpoint:devContextSet', patch),
    log: (tool, action, detail) => ipcRenderer.invoke('stillpoint:devContextLog', { tool, action, detail }),
    recent: (n) => ipcRenderer.invoke('stillpoint:devContextRecent', n),
    // Returns an unsubscribe function, mirroring the ipcRenderer.on contract
    // callers would otherwise have to hand-roll themselves.
    onChanged: (cb) => {
      const listener = (event, state) => cb(state);
      ipcRenderer.on('devcontext:changed', listener);
      return () => ipcRenderer.removeListener('devcontext:changed', listener);
    },
  },
});
