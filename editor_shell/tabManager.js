// Milestone 3 — real tabs instead of one window that navigates in place.
// Each tab is its own WebContentsView (same webPreferences/preload as the
// old single window had — contextIsolation on, nodeIntegration off, the
// stillpointAPI save/DevContext bridge available), layered on top of the
// BrowserWindow's own contentView below a fixed-height tab-strip region
// that the window's own page (shell.html) renders into.
const { WebContentsView } = require('electron');
const path = require('path');

const TOOL_PRELOAD = path.join(__dirname, 'preload.js');
const TAB_BAR_HEIGHT = 40;

class TabManager {
  constructor(win) {
    this.win = win;
    this.tabs = [];
    this.activeId = null;
    this.nextId = 1;

    win.on('resize', () => this._layoutActive());
  }

  createTab(url, { activate = true } = {}) {
    const id = this.nextId++;
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: TOOL_PRELOAD,
      },
    });
    const tab = { id, view, title: 'Loading…', url };
    this.tabs.push(tab);

    view.webContents.on('page-title-updated', (event, title) => {
      tab.title = title;
      this._broadcastTabs();
    });
    view.webContents.on('did-navigate', (event, navUrl) => {
      tab.url = navUrl;
      this._broadcastTabs();
    });
    view.webContents.on('did-navigate-in-page', (event, navUrl) => {
      tab.url = navUrl;
      this._broadcastTabs();
    });
    // Every editor/*.html tool link is target="_blank" (built for opening in
    // a plain browser tab). Instead of navigating this same view away from
    // the tool the user had open, open the link as a new tab in the shell —
    // this is the behavior that actually makes it feel like a multi-doc IDE
    // rather than one window with back/forward history.
    view.webContents.setWindowOpenHandler(({ url: openUrl }) => {
      this.createTab(openUrl);
      return { action: 'deny' };
    });

    view.webContents.loadURL(url);

    if (activate) this.switchTab(id);
    this._broadcastTabs();
    return id;
  }

  closeTab(id) {
    const idx = this.tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const [tab] = this.tabs.splice(idx, 1);
    if (this.win.contentView.children.includes(tab.view)) {
      this.win.contentView.removeChildView(tab.view);
    }
    if (!tab.view.webContents.isDestroyed()) tab.view.webContents.close();

    if (this.activeId === id) {
      const fallback = this.tabs[idx] || this.tabs[idx - 1];
      if (fallback) this.switchTab(fallback.id);
      else this.activeId = null;
    }
    this._broadcastTabs();
  }

  switchTab(id) {
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;

    for (const t of this.tabs) {
      if (t.id !== id && this.win.contentView.children.includes(t.view)) {
        this.win.contentView.removeChildView(t.view);
      }
    }
    if (!this.win.contentView.children.includes(tab.view)) {
      this.win.contentView.addChildView(tab.view);
    }
    this.activeId = id;
    this._layoutActive();
    this._broadcastTabs();
  }

  closeActiveTab() {
    if (this.activeId != null) this.closeTab(this.activeId);
  }

  navigateActive(url) {
    const tab = this._active();
    if (tab) tab.view.webContents.loadURL(url);
  }

  goBack() {
    const tab = this._active();
    if (tab && tab.view.webContents.navigationHistory.canGoBack()) {
      tab.view.webContents.navigationHistory.goBack();
    }
  }

  goForward() {
    const tab = this._active();
    if (tab && tab.view.webContents.navigationHistory.canGoForward()) {
      tab.view.webContents.navigationHistory.goForward();
    }
  }

  reloadActive() {
    const tab = this._active();
    if (tab) tab.view.webContents.reload();
  }

  toggleDevToolsActive() {
    const tab = this._active();
    if (tab) tab.view.webContents.toggleDevTools();
  }

  nextTab() {
    if (this.tabs.length < 2) return;
    const idx = this.tabs.findIndex((t) => t.id === this.activeId);
    const next = this.tabs[(idx + 1) % this.tabs.length];
    this.switchTab(next.id);
  }

  prevTab() {
    if (this.tabs.length < 2) return;
    const idx = this.tabs.findIndex((t) => t.id === this.activeId);
    const prev = this.tabs[(idx - 1 + this.tabs.length) % this.tabs.length];
    this.switchTab(prev.id);
  }

  _active() {
    return this.tabs.find((t) => t.id === this.activeId);
  }

  _layoutActive() {
    const tab = this._active();
    if (!tab) return;
    const bounds = this.win.getContentBounds();
    tab.view.setBounds({
      x: 0,
      y: TAB_BAR_HEIGHT,
      width: bounds.width,
      height: Math.max(0, bounds.height - TAB_BAR_HEIGHT),
    });
  }

  _broadcastTabs() {
    const payload = {
      activeId: this.activeId,
      tabs: this.tabs.map((t) => ({ id: t.id, title: t.title, url: t.url })),
    };
    if (!this.win.webContents.isDestroyed()) {
      this.win.webContents.send('shell:tabsChanged', payload);
    }
  }
}

module.exports = { TabManager, TAB_BAR_HEIGHT };
