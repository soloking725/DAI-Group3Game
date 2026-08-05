const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./ipcHandlers');
const { TabManager } = require('./tabManager');

const HOME_URL = 'file://' + path.join(__dirname, '..', 'editor', 'dev_hub.html');
const SHELL_PRELOAD = path.join(__dirname, 'shell-preload.js');

let tabManager = null;

function registerTabIpc() {
  ipcMain.handle('shell:newTab', (event, url) => tabManager.createTab(url || HOME_URL));
  ipcMain.handle('shell:closeTab', (event, id) => tabManager.closeTab(id));
  ipcMain.handle('shell:switchTab', (event, id) => tabManager.switchTab(id));
  ipcMain.handle('shell:goHome', () => tabManager.navigateActive(HOME_URL));
  ipcMain.handle('shell:goBack', () => tabManager.goBack());
  ipcMain.handle('shell:goForward', () => tabManager.goForward());
  ipcMain.handle('shell:reloadActive', () => tabManager.reloadActive());
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Stillpoint Dev Hub',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: SHELL_PRELOAD,
    },
  });

  // Milestone 3: the window's own page is now just the tab-strip chrome
  // (shell.html) — real tool content lives in per-tab WebContentsViews the
  // TabManager layers on top, below the fixed-height strip. This replaces
  // Milestone 1's "one window that navigates in place" model.
  tabManager = new TabManager(win);
  registerTabIpc();

  win.loadFile(path.join(__dirname, 'shell.html'));
  win.webContents.once('did-finish-load', () => {
    tabManager.createTab(HOME_URL);
  });

  const isMac = process.platform === 'darwin';
  const menu = Menu.buildFromTemplate([
    ...(isMac ? [{
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Tab', accelerator: 'CmdOrCtrl+T', click: () => tabManager.createTab(HOME_URL) },
        { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: () => tabManager.closeActiveTab() },
        ...(isMac ? [] : [{ type: 'separator' }, { role: 'quit' }]),
      ],
    },
    {
      label: 'Navigate',
      submenu: [
        { label: 'Back', accelerator: 'CmdOrCtrl+[', click: () => tabManager.goBack() },
        { label: 'Forward', accelerator: 'CmdOrCtrl+]', click: () => tabManager.goForward() },
        { label: 'Dev Hub (Home)', accelerator: 'CmdOrCtrl+Shift+H', click: () => tabManager.navigateActive(HOME_URL) },
        { label: 'Reload Tab', accelerator: 'CmdOrCtrl+R', click: () => tabManager.reloadActive() },
        { type: 'separator' },
        { label: 'Next Tab', accelerator: 'CmdOrCtrl+Shift+]', click: () => tabManager.nextTab() },
        { label: 'Previous Tab', accelerator: 'CmdOrCtrl+Shift+[', click: () => tabManager.prevTab() },
        { type: 'separator' },
        { label: 'Toggle DevTools', accelerator: 'CmdOrCtrl+Alt+I', click: () => tabManager.toggleDevToolsActive() },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
