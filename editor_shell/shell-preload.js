const { contextBridge, ipcRenderer } = require('electron');

// The tab strip's own surface — deliberately separate from preload.js
// (which every tool tab gets). This page never touches game/*.js save
// targets, so it only needs tab/window-chrome control, nothing more.
contextBridge.exposeInMainWorld('shellAPI', {
  newTab: (url) => ipcRenderer.invoke('shell:newTab', url),
  closeTab: (id) => ipcRenderer.invoke('shell:closeTab', id),
  switchTab: (id) => ipcRenderer.invoke('shell:switchTab', id),
  goHome: () => ipcRenderer.invoke('shell:goHome'),
  goBack: () => ipcRenderer.invoke('shell:goBack'),
  goForward: () => ipcRenderer.invoke('shell:goForward'),
  reloadActive: () => ipcRenderer.invoke('shell:reloadActive'),
  onTabsChanged: (cb) => {
    const listener = (event, payload) => cb(payload);
    ipcRenderer.on('shell:tabsChanged', listener);
    return () => ipcRenderer.removeListener('shell:tabsChanged', listener);
  },
});
