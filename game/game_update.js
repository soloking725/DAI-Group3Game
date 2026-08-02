// Stillpoint/boss-Stillpoint world-slow — see update()'s call sites below
// (computed both before AND right after player.update() each frame, since
// player.update() is what actually flips player.stillpointActive on the
// activation frame itself; enemies/platforms read the global gameTimeScale
// directly, so without the second call they'd see it a frame late).
function computeGameTimeScale() {
  return (player.stillpointActive && abilityState.hasStillpoint)
    ? Math.max(0.05, 1 - player.stillpointSlow)
    : (typeof boss !== 'undefined' && boss && boss.bossStillpointActive)
      ? Math.max(0.05, 1 - BOSS_STILLPOINT_SLOW)
      : 1.0;
}

// Update game state
function update() {
  frameCount++;

  // Debug overlay toggle — runs in every state, mirrors the FX updates below.
  if (wasJustPressed('F3')) DEBUG_MODE = !DEBUG_MODE;

  // FX updates (run in all states)
  if (screenShake > 0) screenShake--;
  if (abilityFlash > 0) abilityFlash--;
  if (deathFadeDir !== 0) {
    // -1 = fade out (alpha 0→1, screen goes black)
    // +1 = fade in  (alpha 1→0, screen clears)
    deathFadeAlpha += (-deathFadeDir) * 0.08;
    if (deathFadeAlpha >= 1 && deathFadeDir < 0) {
      deathFadeAlpha = 1;
      deathFadeDir = 0;
    }
    if (deathFadeAlpha <= 0 && deathFadeDir > 0) {
      deathFadeAlpha = 0;
      deathFadeDir = 0;
      // Fade-in complete — switch from reviving to playing
      if (gameState === 'reviving') {
        gameState = 'playing';
      }
    }
  }

  // Hitstop - freeze frame for impact feel (respect accessibility toggle)
  // Landing a hit triggers this every time (see setHitstop() call sites), so
  // during any combo it fires constantly. clearJustPressed() here used to
  // wipe out any jump/dash/attack press that happened to land during the
  // freeze before player.update() (below, after hitstop ends) ever got a
  // chance to read it — a press during those frames was simply gone,
  // reported by users as "keys feel unresponsive, like jumping" since jump
  // has no input buffer of its own to fall back on. Leaving justPressed
  // untouched lets it survive across frozen ticks and fire on the first real
  // tick once the freeze ends, instead of being silently eaten.
  if (hitstopEnabled && hitstopTimer > 0) {
    hitstopTimer--;
    return;
  }

  // Slow-mo kill cam - skip frames for dramatic effect
  if (slowMoTimer > 0) {
    slowMoSkip++;
    if (slowMoSkip >= 2) { // 0.5x speed (skip every other frame)
      slowMoSkip = 0;
      slowMoTimer--;
    } else {
      // Still render, but skip game logic. Same reasoning as the hitstop
      // branch above: don't clear justPressed here, or a press during the
      // skipped frame never reaches any real update tick.
      draw();
      return;
    }
  }

  // Unstuck key, fullscreen key, and direct inventory shortcut — only during
  // active gameplay
  if (gameState === 'playing') {
    handleUnstuckKey();
    handleFullscreenKey();
    if (wasActionJustPressed('inventory')) {
      inventoryReturnState = 'playing';
      gameState = 'inventory';
      SFX.uiSelect();
      // Must return here: without it, the gameState==='inventory' dispatch
      // further down runs in this SAME frame and re-reads this same
      // still-true wasActionJustPressed('inventory') as "close it," bouncing
      // straight back to 'playing' before a single frame is ever drawn —
      // the inventory screen would open and close invisibly on every press.
      clearJustPressed();
      return;
    }
  }

  // Menu state
  if (gameState === 'menu') {
    // Animate menu particles
    for (const p of menuParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += 0.02;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
    }

    if (menuScreen === 'main') {
      // Main menu: Play, Controls, Settings
      const mainItems = 3;
      if (wasJustPressed('ArrowUp') || wasJustPressed('KeyW')) {
        menuSelection = (menuSelection - 1 + mainItems) % mainItems;
        SFX.uiSelect();
      } else if (wasJustPressed('ArrowDown') || wasJustPressed('KeyS')) {
        menuSelection = (menuSelection + 1) % mainItems;
        SFX.uiSelect();
      } else if (wasJustPressed('Space') || wasJustPressed('Enter') || menuClick) {
        menuClick = false;
        if (menuSelection === 0) {
          menuScreen = 'play'; // menuSelectionPlay untouched — slot selection persists
          SFX.uiSelect();
        } else if (menuSelection === 1) {
          menuScreen = 'controls';
          controlsMenuIndex = 0;
          SFX.uiSelect();
        } else if (menuSelection === 2) {
          menuScreen = 'settings';
          SFX.uiSelect();
        }
      }
    } else if (menuScreen === 'play') {
      // Play screen: navigate save slots, press N for new game, D to delete, Enter to load
      // NOTE: Do NOT check menuClick here — a canvas click should attempt to load the
      // selected slot (handled below with Enter), not blindly return to main menu.
      if (saveSlotMessage) {
        saveSlotMessage.timer--;
        if (saveSlotMessage.timer <= 0) saveSlotMessage = null;
      }
      if (wasJustPressed('Escape')) {
          menuScreen = 'main';
          menuSelection = 0;
          SFX.uiSelect();
        } else if (wasJustPressed('ArrowUp') || wasJustPressed('KeyW')) {
          menuSelectionPlay = (menuSelectionPlay - 1 + SAVE_SLOTS) % SAVE_SLOTS;
          SFX.uiSelect();
        } else if (wasJustPressed('ArrowDown') || wasJustPressed('KeyS')) {
          menuSelectionPlay = (menuSelectionPlay + 1) % SAVE_SLOTS;
          SFX.uiSelect();
        } else if (wasJustPressed('KeyN')) {
          currentSaveSlot = menuSelectionPlay;
          startNewGame();
        } else if (wasJustPressed('KeyD')) {
          if (hasSaveGame(menuSelectionPlay)) {
            // Ask for confirmation — press D again to confirm, ESC to cancel
            menuScreen = 'confirm_delete';
            SFX.uiSelect();
          }
        } else if (wasJustPressed('KeyE')) {
          // Export the highlighted slot to the clipboard as a manual backup —
          // localStorage has no recovery path of its own (cache clear, private
          // mode, reinstall all wipe it silently).
          if (hasSaveGame(menuSelectionPlay)) {
            copySaveToClipboard(menuSelectionPlay, (ok) => {
              saveSlotMessage = { text: ok ? 'Save copied to clipboard!' : 'Copy failed — see console', timer: 150 };
            });
          } else {
            saveSlotMessage = { text: 'Slot is empty — nothing to export', timer: 120 };
          }
          SFX.uiSelect();
        } else if (wasJustPressed('KeyI')) {
          // Import overwrites the highlighted slot — window.prompt() is a
          // pragmatic choice here (no text-input widget exists in this
          // canvas-only UI) and it's a rare, deliberate action, not something
          // that needs a bespoke on-canvas text field.
          const pasted = window.prompt('Paste exported save data:');
          if (pasted) {
            const ok = importSaveString(menuSelectionPlay, pasted);
            saveSlotMessage = { text: ok ? 'Save imported!' : 'Invalid save data — import failed', timer: 150 };
          }
          SFX.uiSelect();
        } else if (wasJustPressed('Space') || wasJustPressed('Enter') || menuClick) {
          menuClick = false;
          currentSaveSlot = menuSelectionPlay;
          if (hasSaveGame(menuSelectionPlay) && loadGame(menuSelectionPlay)) {
            gameState = 'playing';
            SFX.init();
            SFX.setAreaAmbient(currentAreaId);
            showUI(true);
          } else {
            startNewGame();
          }
        }
      } else if (menuScreen === 'confirm_delete') {
        if (wasJustPressed('KeyD')) {
          deleteSave(menuSelectionPlay);
          menuScreen = 'play';
          SFX.uiSelect();
        } else if (wasJustPressed('Escape')) {
          menuScreen = 'play';
          SFX.uiSelect();
        }
      } else if (menuScreen === 'controls') {
      // Controls screen: navigate rows, Enter/Space/click a row to rebind it,
      // last row resets all bindings to defaults. While rebindingAction is
      // set, input.js's own keydown listener is intercepting the next key
      // press to capture it (or Escape to cancel) — nothing to poll here.
      const totalRows = REMAPPABLE_ACTIONS.length + 1; // +1 for Reset to Defaults
      if (rebindingAction) {
        // waiting on input.js to capture the next keydown
      } else if (wasJustPressed('Escape')) {
        menuScreen = 'main';
        SFX.uiSelect();
      } else if (wasJustPressed('ArrowUp') || wasJustPressed('KeyW')) {
        controlsMenuIndex = (controlsMenuIndex - 1 + totalRows) % totalRows;
        SFX.uiSelect();
      } else if (wasJustPressed('ArrowDown') || wasJustPressed('KeyS')) {
        controlsMenuIndex = (controlsMenuIndex + 1) % totalRows;
        SFX.uiSelect();
      } else if (wasJustPressed('Space') || wasJustPressed('Enter') || menuClick) {
        menuClick = false;
        if (controlsMenuIndex === REMAPPABLE_ACTIONS.length) {
          resetKeyBindings();
        } else {
          startRebind(REMAPPABLE_ACTIONS[controlsMenuIndex]);
        }
        SFX.uiSelect();
      }
    } else if (menuScreen === 'settings') {
      // Settings screen: Screen Shake, Hitstop, Music Volume, SFX Volume
      const settingsItems = 4;
      if (wasJustPressed('Escape')) {
        menuScreen = 'main';
        SFX.uiSelect();
      } else if (wasJustPressed('ArrowUp') || wasJustPressed('KeyW')) {
        menuSelectionSettings = (menuSelectionSettings - 1 + settingsItems) % settingsItems;
        SFX.uiSelect();
      } else if (wasJustPressed('ArrowDown') || wasJustPressed('KeyS')) {
        menuSelectionSettings = (menuSelectionSettings + 1) % settingsItems;
        SFX.uiSelect();
      } else if ((wasJustPressed('ArrowLeft') || wasJustPressed('ArrowRight')) && menuSelectionSettings >= 2) {
        const delta = wasJustPressed('ArrowLeft') ? -0.1 : 0.1;
        if (menuSelectionSettings === 2) {
          musicVolume = adjustVolume(musicVolume, delta);
          SFX.setMusicVolume(musicVolume);
        } else {
          sfxVolume = adjustVolume(sfxVolume, delta);
          SFX.setSfxVolume(sfxVolume);
        }
        saveSettings();
        SFX.uiSelect();
      } else if (wasJustPressed('Space') || wasJustPressed('Enter') || menuClick) {
        menuClick = false;
        if (menuSelectionSettings === 0) {
          screenShakeEnabled = !screenShakeEnabled;
          saveSettings();
        } else if (menuSelectionSettings === 1) {
          hitstopEnabled = !hitstopEnabled;
          saveSettings();
        } else if (menuSelectionSettings === 2) {
          musicVolume = musicVolume >= 1 ? 0 : adjustVolume(musicVolume, 0.1);
          SFX.setMusicVolume(musicVolume);
          saveSettings();
        } else if (menuSelectionSettings === 3) {
          sfxVolume = sfxVolume >= 1 ? 0 : adjustVolume(sfxVolume, 0.1);
          SFX.setSfxVolume(sfxVolume);
          saveSettings();
        }
        SFX.uiSelect();
      }
    }
    clearJustPressed();
    return;
  }

  // Game over state
  if (gameState === 'gameover') {
    if (wasJustPressed('KeyR')) {
      respawnPlayer();
    } else if (wasJustPressed('Escape')) {
      // Quit to menu (don't delete save!)
      init();
    }
    clearJustPressed();
    return;
  }

  // Pause state — menu navigation (Phase 0.5)
  if (gameState === 'paused') {
    if (pauseMenuMessage) {
      pauseMenuMessage.timer--;
      if (pauseMenuMessage.timer <= 0) pauseMenuMessage = null;
    }
    if (wasJustPressed('Escape')) {
      // Close menu → resume
      gameState = 'playing';
    } else if (wasJustPressed('ArrowUp')) {
      pauseMenuIndex = (pauseMenuIndex - 1 + pauseMenuItems.length) % pauseMenuItems.length;
      SFX.uiSelect();
    } else if (wasJustPressed('ArrowDown')) {
      pauseMenuIndex = (pauseMenuIndex + 1) % pauseMenuItems.length;
      SFX.uiSelect();
    } else if (wasJustPressed('ArrowLeft') && pauseMenuItems[pauseMenuIndex].onLeft) {
      // Fine-grained adjust (e.g. volume sliders) — doesn't close the menu
      pauseMenuItems[pauseMenuIndex].onLeft();
      SFX.uiSelect();
    } else if (wasJustPressed('ArrowRight') && pauseMenuItems[pauseMenuIndex].onRight) {
      pauseMenuItems[pauseMenuIndex].onRight();
      SFX.uiSelect();
    } else if (wasJustPressed('Enter') || wasJustPressed('Space')) {
      const action = pauseMenuItems[pauseMenuIndex].action;
      if (action) {
        action();
        // Only resume if the action didn't change the game state (e.g. Quit to Menu calls init())
        if (gameState === 'paused') {
          gameState = 'playing';
        }
      }
    }
    clearJustPressed();
    return;
  }

  // Controls screen reached from the pause menu's "Controls" item — same
  // rebind logic as the main menu's version (menuScreen === 'controls'
  // above), just with Escape returning to the pause menu instead of main.
  if (gameState === 'paused_controls') {
    const totalRows = REMAPPABLE_ACTIONS.length + 1; // +1 for Reset to Defaults
    if (rebindingAction) {
      // waiting on input.js to capture the next keydown
    } else if (wasJustPressed('Escape')) {
      gameState = 'paused';
      buildPauseMenu();
      SFX.uiSelect();
    } else if (wasJustPressed('ArrowUp') || wasJustPressed('KeyW')) {
      controlsMenuIndex = (controlsMenuIndex - 1 + totalRows) % totalRows;
      SFX.uiSelect();
    } else if (wasJustPressed('ArrowDown') || wasJustPressed('KeyS')) {
      controlsMenuIndex = (controlsMenuIndex + 1) % totalRows;
      SFX.uiSelect();
    } else if (wasJustPressed('Space') || wasJustPressed('Enter') || menuClick) {
      menuClick = false;
      if (controlsMenuIndex === REMAPPABLE_ACTIONS.length) {
        resetKeyBindings();
      } else {
        startRebind(REMAPPABLE_ACTIONS[controlsMenuIndex]);
      }
      SFX.uiSelect();
    }
    clearJustPressed();
    return;
  }

  // Settings screen reached from the pause menu's "Settings" item — Screen
  // Shake/Hitstop toggles + Music/SFX volume sliders + Export Save, kept one
  // level down from the top-level pause menu so that panel stays short
  // enough to fit the 800x450 canvas (see buildPauseMenu()'s comment).
  if (gameState === 'paused_settings') {
    if (pauseMenuMessage) {
      pauseMenuMessage.timer--;
      if (pauseMenuMessage.timer <= 0) pauseMenuMessage = null;
    }
    const items = getPausedSettingsItems();
    if (wasJustPressed('Escape')) {
      gameState = 'paused';
      SFX.uiSelect();
    } else if (wasJustPressed('ArrowUp')) {
      pausedSettingsIndex = (pausedSettingsIndex - 1 + items.length) % items.length;
      SFX.uiSelect();
    } else if (wasJustPressed('ArrowDown')) {
      pausedSettingsIndex = (pausedSettingsIndex + 1) % items.length;
      SFX.uiSelect();
    } else if (wasJustPressed('ArrowLeft') && items[pausedSettingsIndex].onLeft) {
      items[pausedSettingsIndex].onLeft();
      SFX.uiSelect();
    } else if (wasJustPressed('ArrowRight') && items[pausedSettingsIndex].onRight) {
      items[pausedSettingsIndex].onRight();
      SFX.uiSelect();
    } else if (wasJustPressed('Space') || wasJustPressed('Enter')) {
      const action = items[pausedSettingsIndex].action;
      if (action) action();
      SFX.uiSelect();
    }
    clearJustPressed();
    return;
  }

  // Inventory screen (2026-08-01 multi-page redesign, see
  // Plans/inventory_redesign.md and inventory_ui.js) — sub-menu off pause.
  // Q/E cycle the 4 pages; each page owns its own ↑↓/Enter handling below.
  if (gameState === 'inventory') {
    if (inventoryMessage) {
      inventoryMessage.timer--;
      if (inventoryMessage.timer <= 0) inventoryMessage = null;
    }
    if (wasJustPressed('Escape') || wasActionJustPressed('inventory')) {
      gameState = inventoryReturnState;
      if (gameState === 'paused') buildPauseMenu();
      SFX.uiSelect();
    } else if (wasJustPressed('KeyQ')) {
      inventoryPage = (inventoryPage + INVENTORY_PAGE_NAMES.length - 1) % INVENTORY_PAGE_NAMES.length;
      inventorySelection = 0; cosmeticsSelection = 0;
      SFX.uiSelect();
    } else if (wasJustPressed('KeyE')) {
      inventoryPage = (inventoryPage + 1) % INVENTORY_PAGE_NAMES.length;
      inventorySelection = 0; cosmeticsSelection = 0;
      SFX.uiSelect();
    } else if (inventoryPage === 0) {
      updateInventoryMapPage();
    } else if (inventoryPage === 1) {
      // Character page: ↑↓ browse the re-readable Lore & Story list.
      const entries = collectedLoreEntries();
      if (entries.length && wasJustPressed('ArrowUp')) {
        inventorySelection = (inventorySelection - 1 + entries.length) % entries.length;
        SFX.uiSelect();
      } else if (entries.length && wasJustPressed('ArrowDown')) {
        inventorySelection = (inventorySelection + 1) % entries.length;
        SFX.uiSelect();
      }
    } else if (inventoryPage === 2) {
      // Upgrades page: unchanged behavior from the old single-page inventory.
      if (wasJustPressed('ArrowUp')) {
        inventorySelection = (inventorySelection - 1 + INVENTORY_UPGRADES.length) % INVENTORY_UPGRADES.length;
        SFX.uiSelect();
      } else if (wasJustPressed('ArrowDown')) {
        inventorySelection = (inventorySelection + 1) % INVENTORY_UPGRADES.length;
        SFX.uiSelect();
      } else if (wasJustPressed('Enter') || wasJustPressed('Space')) {
        const def = INVENTORY_UPGRADES[inventorySelection];
        if (tryUpgrade(def.key)) {
          SFX.abilityPickup();
          inventoryMessage = { text: `${def.label} upgraded!`, timer: 90 };
        } else {
          SFX.uiSelect();
          inventoryMessage = { text: 'Not enough Lore Pips', timer: 90 };
        }
      }
    } else if (inventoryPage === 3) {
      updateInventoryCustomizationPage();
    }
    clearJustPressed();
    return;
  }

  // Reviving state (fade-in from black) — skip all gameplay until fade completes
  if (gameState === 'reviving') {
    clearJustPressed();
    return;
  }

  // Cutscene state — the script runner (cutscene.js) owns the frame:
  // input locked (except hold-attack-to-skip), enemies/boss frozen, world
  // still rendered by draw() with the letterbox overlay on top.
  if (gameState === 'cutscene') {
    updateCutscene();
    clearJustPressed();
    return;
  }

  // Victory state — boss defeated cinematic
  if (gameState === 'victory') {
    victoryTimer--;
    // Spawn celebration particles
    if (victoryTimer % 8 === 0 && victoryTimer > 60) {
      const colors = ['#fbbf24', '#c4b5fd', '#2dd4bf', '#f87171'];
      spawnParticles(Math.random() * W, Math.random() * H, colors[Math.floor(Math.random() * colors.length)], 5);
    }
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      if (particles[i].life <= 0) particles.splice(i, 1);
    }
    updateCamera(player, getCurrentArea());
    // After cinematic, allow return
    if (victoryTimer <= 0 && wasJustPressed('KeyR')) {
      gameState = 'playing';
      currentAreaId = 'antechamber';
      player.x = 300;
      player.y = 334;
      player.vx = 0;
      player.vy = 0;
      player.health = playerMaxHealth();
      boss = null;
      bossProjectiles = [];
      bossDefeated = true;
      victoryTimer = 0;
      areaAmbient = [];
      resetCamera();
      saveGame();
    }
    clearJustPressed();
    return;
  }

  // Toggle map during gameplay
  if (wasActionJustPressed('map')) {
    mapOpen = !mapOpen;
    if (mapOpen) resetMapView(); // fresh centered view every time it's opened
    SFX.uiSelect();
  }
  if (mapOpen) {
    // Pan/zoom the full map view (map.js's mapView — drawMap() just applies
    // whatever this sets). Held-key panning/zooming, not one-shot, so
    // holding a direction actually scrolls smoothly.
    const MAP_PAN_SPEED = 8, MAP_ZOOM_SPEED = 0.03;
    if (keys['ArrowLeft'] || keys['KeyA']) mapView.panX += MAP_PAN_SPEED;
    if (keys['ArrowRight'] || keys['KeyD']) mapView.panX -= MAP_PAN_SPEED;
    if (keys['ArrowUp'] || keys['KeyW']) mapView.panY += MAP_PAN_SPEED;
    if (keys['ArrowDown'] || keys['KeyS']) mapView.panY -= MAP_PAN_SPEED;
    if (keys['Equal'] || keys['NumpadAdd']) mapView.zoom = Math.min(3, mapView.zoom + MAP_ZOOM_SPEED);
    if (keys['Minus'] || keys['NumpadSubtract']) mapView.zoom = Math.max(0.4, mapView.zoom - MAP_ZOOM_SPEED);
    if (wasJustPressed('Digit0')) resetMapView();
    clearJustPressed();
    return;
  }

  // Live camera zoom (dev/tuning control, 2026-07-27) — BracketRight/Left
  // zoom in/out around the player, Backslash resets to 1. Distinct keys
  // from the map's own Equal/Minus zoom above (mutually exclusive anyway
  // since that block returns early) so the two never read as the same
  // control conceptually.
  const CAMERA_ZOOM_SPEED = 0.02;
  if (keys['BracketRight']) camera.zoom = Math.min(2.5, camera.zoom + CAMERA_ZOOM_SPEED);
  if (keys['BracketLeft']) camera.zoom = Math.max(0.5, camera.zoom - CAMERA_ZOOM_SPEED);
  if (wasJustPressed('Backslash')) camera.zoom = 1;

  // Toggle pause during gameplay — except in the tutorial room, where the
  // pause action skips straight to The Fracture instead (tutorial is meant
  // to be skippable).
  if (wasActionJustPressed('pause')) {
    if (currentAreaId === 'tutorial_area') {
      skipTutorial();
    } else {
      gameState = 'paused';
      pauseMenuIndex = 0;
      buildPauseMenu();
    }
    clearJustPressed();
    return;
  }

  // Playing state
  const area = getCurrentArea();
  const bounds = getBounds(area);

  // Spawn boss when entering boss arena
  if (area.isBossArena && !boss && !bossDefeated) {
    const spawn = area.bossSpawn;
    if (spawn) {
      boss = new Boss(spawn.x, spawn.y);
      screenShake = 40;
      screenShakeIntensity = 4;
      spawnParticles(spawn.x + BOSS_WIDTH / 2, spawn.y + BOSS_HEIGHT / 2, '#f87171', 20);
      spawnParticles(spawn.x + BOSS_WIDTH / 2, spawn.y + BOSS_HEIGHT / 2, '#c4b5fd', 15);
      SFX.setBossMusic('sovereign');
    }
  }
  // Clear boss when leaving boss arena
  if (!area.isBossArena && boss) {
    boss = null;
    bossProjectiles = [];
    SFX.setBossMusic(null);
  }

  // Spawn miniboss when entering a miniboss arena (Colossus Core, etc.) —
  // parallel to the King's spawn above but keyed by `area.miniboss` (an id
  // string) rather than tied to isBossArena, so multiple future minibosses
  // in different regions can each persist their own defeated flag.
  if (area.isMinibossArena && !miniboss && !defeatedMinibosses[area.miniboss]) {
    const spawn = area.bossSpawn;
    const MinibossClass = MINIBOSS_CLASSES[area.miniboss];
    // The Child only ever grows up among the escaped prisoners — and only
    // ever fights you here — if you didn't keep her (story.md §5): kept
    // her (companionState.active) means she's been at your side the whole
    // game, never separated, never raised by anyone else. Every other
    // miniboss (including the relocated, now-unconditional Abandoned
    // Shell) has no such gate.
    const childKeptSkipsFight = area.miniboss === 'antechamber_child' && companionState.active;
    if (spawn && MinibossClass && !childKeptSkipsFight) {
      miniboss = new MinibossClass(spawn.x, spawn.y);
      screenShake = 30;
      screenShakeIntensity = 4;
      spawnParticles(spawn.x + 32, spawn.y + 32, '#d97757', 20);
      spawnParticles(spawn.x + 32, spawn.y + 32, '#fb923c', 12);
      SFX.setBossMusic(area.miniboss);
    }
  }
  // Clear miniboss when leaving its arena
  if (!area.isMinibossArena && miniboss) {
    miniboss = null;
    SFX.setBossMusic(null);
  }

  // Tutorial room: track move/jump/attack/dash steps, hit-test the dummy
  if (currentAreaId === 'tutorial_area') {
    updateTutorial(area);
  }

  // Transition effect
  if (transitioning) {
    transitionAlpha -= 0.05;
    if (transitionAlpha <= 0) {
      transitioning = false;
      transitionAlpha = 0;
    }
  }

  // Cooldowns
  // ── Stillpoint world-slow ───────────────────────────────────────────────
  // Update gameTimeScale — everything except the player and Phase-3 boss
  // reads this. Hard-floored at 0.05 (user feedback 2026-07-16: it must
  // never actually reach 0 — that reads as the whole game freezing, not
  // an intentional near-stop) regardless of what stillpointSlow requests.
  // The player is deliberately never scaled by this at all (Stillpoint
  // moves at 100% speed per the design doc) — if the player ever looks
  // frozen during Stillpoint, that's a different bug, not this line.
  // Sovereign's Phase 3 Stillpoint (2026-07-26) also drives this — a real,
  // room-wide cast mirroring the player's own ability, just steeper
  // (BOSS_STILLPOINT_SLOW, boss.js). Player's own Stillpoint still wins if
  // both are somehow active; else her own cast drives it.
  gameTimeScale = computeGameTimeScale();

  if (abilityState.phaseDashCooldown > 0) abilityState.phaseDashCooldown -= player.timeScale;
  if (abilityState.shardShotCooldown > 0) abilityState.shardShotCooldown -= player.timeScale;
  if (abilityState.gravitonSurgeCooldown > 0) abilityState.gravitonSurgeCooldown -= player.timeScale;
  if (abilityState.voidTetherCooldown > 0) abilityState.voidTetherCooldown -= player.timeScale;
  if (abilityState.parryCooldown > 0) abilityState.parryCooldown -= player.timeScale;

  // Player DoT (ComposedEnemy phase system's `dotOnHit` flag — see
  // applyPlayerDot() below) — same un-scaled-by-gameTimeScale, plain
  // per-frame countdown shape as `enemy.burning`'s tick (game.js:3424-3432),
  // deliberate since the player is never Stillpoint-scaled either.
  if (player.dot) {
    player.dot.tickTimer--;
    if (player.dot.tickTimer <= 0) {
      player.dot.tickTimer = player.dot.tickInterval;
      player.takeDamage(player.dot.damagePerTick); // no sourceX -> no knockback, just chip damage
    }
    player.dot.timer--;
    if (player.dot.timer <= 0) player.dot = null;
  }

  // Ambient area particles
  ambientTimer++;
  if (ambientTimer >= 12) {
    ambientTimer = 0;
    areaAmbient.push({
      x: camera.x + Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.5 - 0.1,
      size: Math.random() * 2 + 1,
      alpha: Math.random() * 0.3 + 0.05,
      color: area.ambientColor || '#c4b5fd',
      life: 120 + Math.random() * 60,
    });
  }
  for (let i = areaAmbient.length - 1; i >= 0; i--) {
    const p = areaAmbient[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) areaAmbient.splice(i, 1);
  }

  // Ability popups
  for (let i = abilityPopups.length - 1; i >= 0; i--) {
    const pop = abilityPopups[i];
    pop.y -= 0.5;
    pop.life--;
    if (pop.life <= 0) abilityPopups.splice(i, 1);
  }

  // Moving/crumbling platforms run BEFORE the player so a moving platform
  // carries them with it, and so a crumbled piece is already gone when
  // collision runs this frame.
  updatePlatformSystems(area);

  // Sovereign's Phase 3 Stillpoint (2026-07-26) — the reversed version of
  // the player's own Stillpoint: slows the PLAYER's own world-resolution,
  // the same way gameTimeScale normally slows enemies. A separate field
  // from gameTimeScale on purpose — the player deliberately never reads
  // gameTimeScale itself (see the comment above), so this is the one
  // mechanism that can ever slow the player.
  player.timeScale = (typeof boss !== 'undefined' && boss && boss.bossStillpointActive)
    ? Math.max(0.05, 1 - BOSS_STILLPOINT_SLOW)
    : 1.0;

  // Update player
  player.update(bounds, area.platforms);
  // Recompute now that player.update() may have just flipped
  // stillpointActive THIS frame — see computeGameTimeScale()'s comment.
  gameTimeScale = computeGameTimeScale();

  // Hazards are trigger volumes (never solid) — damage on overlap. The
  // player's own i-frames throttle repeat contact, so no per-hazard timer.
  applyHazardDamage(area);

  // Combo chains (combo.js) — watches player state flags for action events
  // and matches them against COMBO_DEFS; rewards fire on completion.
  updateComboTracker(player);

  // Healing systems (healing.js) — vitality mote drift/collection and
  // strike-open healing crystals.
  updateVitalityMotes(player, gameTimeScale);
  updateHealingCrystals(player, area);
  updateWeaponDrops(player, gameTimeScale); // companion.js — found-weapon pickups

  // The Child (companion.js) — follows, hides during combat, heals after,
  // and (once taught) tether-assists. Created lazily so saves/branches that
  // never activate her pay no cost.
  if (companionState.active) {
    if (!child) {
      child = new Child(player.x - player.facing * 50, player.y);
      nudgeOutOfPlatforms(child, area.platforms, 'Child spawn', true);
    }
    // story.md §2 point 2 — the Protect/Train choice is dramatized live, at
    // the first real fight after meeting her, not pre-decided at Echo
    // Bridge. Fires once (child_fight_choice_resolved), the first frame any
    // enemy in the room goes aware.
    if (!storyFlags.child_fight_choice_resolved &&
        (areaEnemies[currentAreaId] || []).some((e) => !e.dead && e.aware)) {
      playCutscene('child_first_fight_choice');
    }
    child.update(player, area, bounds, areaEnemies[currentAreaId] || [], gameTimeScale);
    if (wasActionJustPressed('callChild')) child.call(player);
  } else if (child) {
    child = null;
  }

  // ── Wall slide particles ──────────────────────────────────────────────
  if (player.wallSliding && player.wallNormal !== 0) {
    // Sparks at wall contact point
    const sparkX = player.x + player.width / 2 + player.wallNormal * (player.width / 2);
    const sparkY = player.y + player.height * (0.3 + Math.random() * 0.5);
    spawnParticles(sparkX, sparkY, '#c4b5fd', 1);
  }
  // ── Wall jump burst ───────────────────────────────────────────────────
  if (player.wallJumpJustFired) {
    const burstX = player.x + player.width / 2 + player.wallNormal * (player.width / 2);
    const burstY = player.y + player.height / 2;
    spawnParticles(burstX, burstY, '#c4b5fd', 10);
    spawnParticles(burstX, burstY, '#67e8f9', 6);
    SFX.wallJump();
    player.wallJumpJustFired = false;
  }

  // Check player death or pit death (fell off the map)
  // Note: death at 0 HP should trigger regardless of invincibility timer
  const playerDead = player.health <= 0;
  // Explicit per-room override. Used to fall back to `groundY + 100` when
  // unset, but that relied on player.js's old invisible groundY floor to
  // ever be reachable in the first place — now that falling is governed
  // purely by real platforms, the correct no-op default is "never die,"
  // per the project's no-fall-death-by-default rule (CLAUDE.md). Rooms
  // that want a real pit set `pitDeathY` explicitly, same as always.
  const pitDeathY = typeof bounds.pitDeathY === 'number' ? bounds.pitDeathY : Infinity;
  // Limit Break (Lv4, any ability): "immunity to environmental hazards
  // (spikes, pits, lava) for the duration" — see Enemy_Design.pdf Rule 0.
  const pitDeath = player.y > pitDeathY && !limitBreak.active;
  // Combat i-frames are irrelevant to falling off the map — a player who
  // got knocked into a pit while still invincible from that same hit
  // should still die, not fall forever/clip below the room. Only real
  // health-death (playerDead) and pit-death itself gate this; invincibility
  // never blocks either.
  if (playerDead || pitDeath) {
    screenShake = 15;
    screenShakeIntensity = 6;
    deathFadeDir = -1;
    deathFadeAlpha = 0;
    SFX.playerHurt();
    if (player.y > pitDeathY) {
      // Pit death — respawn at checkpoint or start
      spawnParticles(player.x + player.width / 2, H - 20, '#c4b5fd', 12);
    } else {
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#c4b5fd', 16);
    }
    gameState = 'gameover';
  }

  // Phase Dash echo spawning
  if (player.phaseDashing && player.phaseDashTimer === PHASE_DASH_DURATION - 1) {
    // Spawn echo at the start of the dash
    const echoX = player.x - player.vx * 2;
    const echoY = player.y;
    echoes.push(new Echo(echoX, echoY, player.facing));
  }

  // Phase Dash Lv4 Limit Break — "the echo becomes similar to a Stand
  // (follows you)" (Enemy_Design.pdf). Lives/dies with the Enhanced State,
  // tracks the player every frame instead of staying planted like the
  // normal dash-echo.
  if (limitBreak.active && limitBreak.ability === 'phase_dash') {
    if (!standEcho) { standEcho = new Echo(player.x, player.y, player.facing); standEcho.life = standEcho.maxLife = 999999; }
    standEcho.x = player.x - player.facing * 30;
    standEcho.y = player.y;
    standEcho.facing = player.facing;
  } else if (standEcho) {
    standEcho = null;
  }

  // Shard Shot firing
  if (player.shardShotFired) {
    const shots = useShardShot(player, player.shardAimVy);
    for (const proj of shots) {
      projectiles.push(proj);
      spawnParticles(proj.x + 5, proj.y + 3, '#67e8f9', 4);
    }
    SFX.shardShot();
    // Cooldown was declared, decremented, gated on, and even drawn in the
    // HUD ring — but never actually set on fire (user report 2026-07-19:
    // "does shard shot cooldown actually work?"). canUseShardShot() was
    // permanently reading 0, so Shard Shot had zero real cooldown.
    abilityState.shardShotCooldown = SHARD_SHOT_COOLDOWN;
  }
  // Shard Shot Lv4 Limit Break — "your melee swings are replaced with Shard
  // Blasts (glowing projectiles, 150% damage)" (Enemy_Design.pdf). Was not
  // implemented at all before (user report 2026-07-16) — player.js now
  // intercepts the attack button into `shardBlastFired` while this
  // Enhanced State is active; this fires the actual projectile.
  if (player.shardBlastFired) {
    const speed = 12;
    const vx = speed * (player.facing || 1);
    const startX = (player.facing || 1) > 0 ? player.x + player.width : player.x - 8;
    const startY = player.y + player.height / 2;
    const proj = new Projectile(startX, startY, vx, 0, shardShotDamage() * 1.5, '#67e8f9');
    proj.width = 12; proj.height = 12;
    projectiles.push(proj);
    spawnParticles(proj.x + 6, proj.y + 6, '#67e8f9', 8);
    screenShake = 4; screenShakeIntensity = 2; setHitstop(3);
    SFX.attack();
  }
  // Lv3 Beam Attack — continuous channel, ticks damage every BEAM_TICK_INTERVAL
  // frames to every enemy currently touching the line (Enemy_Design.pdf,
  // reworked 2026-07-16 into a real continuous beam per user clarification).
  if (player.beaming) {
    player.beamTickTimer = (player.beamTickTimer || 0) + 1;
    if (player.beamTickTimer >= BEAM_TICK_INTERVAL) {
      player.beamTickTimer = 0;
      const seg = getBeamSegment(player);
      const dmg = beamDamagePerTick();
      const enemiesHere = areaEnemies[currentAreaId] || [];
      for (const enemy of enemiesHere) {
        if (enemy.dead) continue;
        const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
        if (distToSegment(ex, ey, seg.x1, seg.y1, seg.x2, seg.y2) <= (enemy.width / 2 + 6)) {
          enemy.takeDamage(dmg, seg.x1);
        }
      }
      spawnParticles(seg.x1 + 5, seg.y1, '#67e8f9', 2);
    }
  }

  // Phase Dash Lv4 (old Lv3) — "when you swing your sword, the echo attacks
  // once from its position (deals 50% of your normal damage), then fades"
  // (Enemy_Design.pdf). Lv5 Limit Break: the Stand echo (standEcho, spawned
  // above) mirrors every swing at 100% damage instead, and never fades
  // while the Enhanced State is active.
  if (player.echoAttackPending) {
    player.echoAttackPending = false;
    const isStand = limitBreak.active && limitBreak.ability === 'phase_dash' && standEcho;
    if (isStand || (oldTier('phase_dash') >= 3 && echoes.length > 0)) {
      const echo = isStand ? standEcho : echoes[0];
      const echoDmg = playerMeleeDamage() * (isStand ? 1.0 : 0.5);
      // Always show the swing, hit or not (user feedback 2026-07-16 — the
      // attack was invisible unless it actually connected).
      echo.swingFlash = 10;
      spawnParticles(echo.x + echo.width / 2, echo.y + echo.height / 2, '#c4b5fd', 8);
      const enemiesHere = areaEnemies[currentAreaId] || [];
      for (const enemy of enemiesHere) {
        if (enemy.dead) continue;
        const d = Math.hypot((enemy.x + enemy.width / 2) - (echo.x + echo.width / 2), (enemy.y + enemy.height / 2) - (echo.y + echo.height / 2));
        if (d <= ECHO_DISTRACT_RADIUS) {
          enemy.takeDamage(echoDmg, echo.x);
          spawnParticles(echo.x + echo.width / 2, echo.y + echo.height / 2, '#c4b5fd', 6);
        }
      }
      if (!isStand) echo.life = 0; // fades immediately after attacking, per the design doc — the Stand doesn't
    }
  }

  // ── Void Tether (base ability built 2026-07-16, Enemy_Design.pdf) ───────
  // Lv0: pulls the nearest enemy in range to the player, no bonus effect.
  // Lv1 (2026-07-27, the new cheap entry tier): +15% range, a smaller
  // partial step. Lv2 (old Lv1): +30% range. Lv3 (old Lv2): electrified —
  // +1 dmg & 15f stun on arrival. Lv4 (old Lv3): +50% pull speed, arc-stuns
  // 1 other nearby enemy too. Lv5 Limit Break: 0-pip/1.5s-cooldown cast + a
  // 3s/2dps burning DoT on arrival.
  if (player.voidTetherFired) {
    const rawTether = abilityLevel('void_tether');
    const range = VOID_TETHER_RANGE_BASE * (oldTier('void_tether') >= 1 ? 1.3 : (rawTether >= 1 ? 1.15 : 1));
    // Facing auto-aim (user spec 2026-07-16): target the nearest enemy IN
    // THE DIRECTION THE PLAYER FACES — never yank something in from behind.
    // findVoidTetherTarget scores by distance + vertical offset so a level
    // enemy beats a diagonal one at similar range.
    const target = findVoidTetherTarget(player, range);
    const speed = VOID_TETHER_PULL_SPEED_BASE * (oldTier('void_tether') >= 3 ? 1.5 : 1);
    if (target) {
      // The Catch (enemy_attack_vocabulary_plan.md, priority #3 —
      // 2026-07-20): a target carrying void_tether/the_catch reverses the
      // pull direction (player flies to them instead) — the "or pulls you
      // to walls" half of the ability repurposed onto a Heavy enemy instead
      // of a wall. `armored` (def.stats.armored) additionally catches +
      // grapple-throws the player on arrival, see the arrival block below.
      const catchCounter = target.counters && target.counters.find((c) => c.ability === 'void_tether' && c.effect === 'the_catch');
      player.tether = {
        targetEnemy: target, speed, pullTimer: 0,
        pullPlayerToEnemy: !!catchCounter,
        catchOnArrival: !!(catchCounter && target.armored),
        catchParams: catchCounter ? { ...COUNTER_EFFECTS.void_tether.the_catch.params, ...catchCounter } : null,
      };
      // A beat of hitstop right as the tether latches on — user feedback
      // 2026-07-20: the pull used to start moving the same instant it
      // fired, with nothing marking the moment it connected, so there was
      // no window to register "it grabbed something" before the target was
      // already in motion. This is the same freeze-frame convention every
      // other big hit in the game already uses (see the heavy-attack and
      // guard-break hitstop above) — just applied to the cast itself.
      setHitstop(6);
      SFX.dash();
    } else {
      // "Pulls enemies to you, OR pulls you to walls" (Enemy_Design.pdf) —
      // this half was missing entirely (user report 2026-07-16: "void
      // tether is not built at all", likely hit when no enemy was in
      // range, which silently did nothing). Finds the nearest solid
      // platform edge in front of the player and grapples the player to it.
      const area = getCurrentArea();
      const facing = player.facing || 1;
      let wallTargetX = null, bestWallD = range;
      if (area) {
        for (const plat of area.platforms) {
          if (plat.destructible && plat.hp <= 0) continue;
          if (player.y + player.height <= plat.y || player.y >= plat.y + plat.h) continue; // no vertical overlap
          const edgeX = facing === 1 ? plat.x : plat.x + plat.w;
          const d = (edgeX - (player.x + player.width / 2)) * facing;
          if (d > 0 && d <= bestWallD) { bestWallD = d; wallTargetX = facing === 1 ? edgeX - player.width - 2 : edgeX + 2; }
        }
      }
      if (wallTargetX !== null) {
        player.tether = { targetPoint: { x: wallTargetX, y: player.y }, speed, pullTimer: 0 };
        setHitstop(6);
        SFX.dash();
      } else {
        // WHIFF — nothing in front to pull and no wall to grapple. The old
        // code silently burned the full cooldown here with zero feedback
        // (a big part of why the ability read as "does nothing"). Refund
        // the cooldown down to a small tax + a visible/audible fizzle.
        abilityState.voidTetherCooldown = Math.min(abilityState.voidTetherCooldown, VOID_TETHER_WHIFF_COOLDOWN);
        const fx = player.x + player.width / 2 + player.facing * 30;
        spawnParticles(fx, player.y + player.height / 2, '#34d399', 5);
        SFX.parry(); // short fizzle "tick" — reuse until a dedicated SFX exists
      }
    }
  }
  // Attacking cancels an active tether (mid-pull is not a legal window to
  // swing) — checked before either pull branch below consumes it.
  if (player.tether && player.attacking) player.tether = null;
  if (player.tether && player.tether.targetPoint) {
    const tp = player.tether.targetPoint;
    const dx = tp.x - player.x, dy = tp.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d <= player.tether.speed + 4) {
      player.x = tp.x; player.y = tp.y; player.vx = 0; player.vy = 0;
      player.tether = null;
    } else {
      player.tether.pullTimer++;
      // Accelerates into the pull instead of an instant fixed speed (user
      // feedback 2026-07-20: "so hard to respond in time" — ramping up
      // buys a beat of reaction window right at the start, and reads as a
      // yank building up rather than a teleport).
      const rampedSpeed = player.tether.speed * Math.min(1, 0.35 + player.tether.pullTimer * 0.08);
      player.vx = (dx / d) * rampedSpeed;
      player.vy = (dy / d) * rampedSpeed;
      // player.update() already ran earlier this frame and will run again
      // BEFORE this code next frame — its own input-driven movement block
      // (`if (!this.dashing && !this.phaseDashing && this.hitStunTimer<=0)`)
      // would stomp the velocity just set above with whatever the arrow
      // keys say before it's ever used to move. hitStunTimer already exists
      // as exactly this "my velocity is externally driven, don't touch it"
      // gate (used for knockback) — reusing it here, refreshed every frame
      // the grapple is active, keeps the pull actually moving the player.
      player.hitStunTimer = Math.max(player.hitStunTimer, 2);
    }
  }
  if (player.tether && player.tether.targetEnemy) {
    const enemy = player.tether.targetEnemy;
    // Attacking cancels the pull (user request 2026-07-20: "attacking the
    // enemy should end the tether, which will encourage combos") — swing
    // instead of waiting out the yank, and the attack's own hitbox check
    // (already running elsewhere this same frame) lands normally against
    // wherever the target currently is instead of fighting the tether's
    // velocity override for it.
    if (player.attacking) {
      player.tether = null;
    } else if (enemy.dead) {
      player.tether = null;
    } else {
      const px = player.x + player.width / 2, py = player.y + player.height / 2;
      const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
      const d = Math.hypot(px - ex, py - ey);
      if (d <= player.tether.speed + 4) {
        // Arrival
        // The Catch, Armored branch — the enemy catches the incoming player
        // and grapple-throws them instead of the usual "enemy takes
        // damage" arrival: the real risk/reward payoff of Void Tether-ing a
        // Heavy target. No guard-break/damage/hitstun for the enemy here —
        // this is the punish landing on the PLAYER, not the other way
        // around.
        if (player.tether.catchOnArrival) {
          const cp = player.tether.catchParams;
          const dir = ex >= px ? 1 : -1;
          player.vx = dir * cp.throwKnockbackX;
          player.vy = cp.throwKnockbackY;
          player.hitStunTimer = cp.throwHitStun;
          if (player.invincibleTimer <= 0) player.takeDamage(cp.damage, ex);
          spawnParticles(px, py, '#f87171', 12);
          screenShake = Math.max(screenShake, 10); screenShakeIntensity = Math.max(screenShakeIntensity, 5);
          setHitstop(8);
          SFX.playerHurt();
          player.tether = null;
        } else {
          // A tether yank rips a raised guard open (defense-verb counterplay:
          // block is beaten by heavies, backstabs, and THIS — deliberate
          // synergy: tether → guard broken → punish).
          if (enemy.blocking > 0) {
            enemy.blocking = 0;
            enemy.guardBroken = 40;
            spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#e2e8f0', 10);
          }
          const tetherTier = oldTier('void_tether');
          if (tetherTier >= 2 || (limitBreak.active && limitBreak.ability === 'void_tether')) {
            enemy.takeDamage(1, px);
            // hitStun, not stunTimer — stunTimer is the parry-freeze mechanic
            // (zeroes vx and skips physics entirely, see enemy.js's per-type
            // update()); a "stunned" enemy from a non-parry source should
            // still take knockback normally (user feedback 2026-07-16).
            enemy.hitStun = Math.max(enemy.hitStun || 0, 15);
          }
          if (tetherTier >= 3) {
            // Arc: stun (no damage) the next-nearest enemy too
            let arcTarget = null, arcD = 120;
            for (const other of (areaEnemies[currentAreaId] || [])) {
              if (other === enemy || other.dead) continue;
              const od = Math.hypot((other.x + other.width / 2) - ex, (other.y + other.height / 2) - ey);
              if (od < arcD) { arcD = od; arcTarget = other; }
            }
            if (arcTarget) arcTarget.hitStun = Math.max(arcTarget.hitStun || 0, 15);
          }
          if (limitBreak.active && limitBreak.ability === 'void_tether') {
            enemy.burning = { timer: 180, tickTimer: 0 }; // 3s @ 2dmg/s (game.js's enemy-update tick applies this)
          }
          spawnParticles(ex, ey, '#34d399', 10);
          screenShake = Math.max(screenShake, 6); screenShakeIntensity = Math.max(screenShakeIntensity, 3);
          setHitstop(6);
          player.tether = null;
        }
      } else if (!player.tether.pullPlayerToEnemy && player.tether.hitStunSetLastFrame !== undefined && enemy.hitStun >= player.tether.hitStunSetLastFrame) {
        // Resisted pull (user report 2026-07-20: Void Lancer, and any other
        // enemy type whose own update() never checks hitStun — confirmed
        // several exist: Stutterer, EchoStalker, BlitzGuard, FracturedSlime,
        // CrystalSentinel, ColossusCore — silently overwrite the velocity
        // set below with their own AI's vx every frame, same as this file's
        // comment above already explains for the general case).
        //
        // Was detected by "distance to target stopped shrinking," but that
        // missed the actual reported symptom: a target resisting on ONE
        // axis (Void Lancer never moves horizontally without sight/aggro)
        // still has its OVERALL distance shrink from the other axis alone
        // (the vy leak this whole check exists to catch), so distance-stall
        // didn't fire until the enemy physically hit a ceiling — 20+ frames
        // of visible vertical drift first. hitStun is a much sharper
        // signal: an enemy that actually respects it decrements it by 1 in
        // its own update() every frame (see enemy.js's `if (hitStun>0) {
        // hitStun--; ...}` gate); one that doesn't (never even reads the
        // property) leaves it exactly where this block last set it. Compare
        // this frame's value to what was set last frame — if it didn't
        // drop, the enemy never took the suppression, and we bail within a
        // frame or two instead of tens of frames of leak.
        spawnParticles(ex, ey, '#94a3b8', 6);
        SFX.parry(); // reuse the fizzle tick, matches the whiff-cast SFX
        player.tether = null;
      } else if (player.tether.pullPlayerToEnemy) {
        // The Catch — reversed pull: the PLAYER flies toward the (possibly
        // still-moving) enemy instead of the other way around. Same accel
        // ramp/hitStunTimer-as-external-velocity-gate trick as the
        // targetPoint wall-grapple case above, just tracking a moving
        // target each frame instead of a fixed point.
        player.tether.pullTimer++;
        const rampedSpeed = player.tether.speed * Math.min(1, 0.35 + player.tether.pullTimer * 0.08);
        player.vx = ((ex - px) / d) * rampedSpeed;
        player.vy = ((ey - py) / d) * rampedSpeed;
        player.hitStunTimer = Math.max(player.hitStunTimer, 2);
      } else {
        player.tether.pullTimer++;
        // Same accel ramp as the wall-grapple case above.
        const rampedSpeed = player.tether.speed * Math.min(1, 0.35 + player.tether.pullTimer * 0.08);
        enemy.vx = ((px - ex) / d) * rampedSpeed;
        enemy.vy = ((py - ey) / d) * rampedSpeed;
        // Confirmed via harness (user report 2026-07-19: "void tether
        // still doesn't even work" / "enemies float at your level"): the
        // velocity set above did nothing — enemy.update() runs LATER this
        // same frame (see the main enemy loop below) and, unless the enemy
        // is already in hitStun, its own chase/patrol AI recomputes vx/vy
        // from scratch and overwrites this every single frame before any
        // movement ever uses it. The pull target sat frozen in place while
        // `player.tether` stayed set indefinitely — which also explains
        // "shard shot after void tether pulls the enemy closer": the tether
        // never actually resolved, so it kept running in the background and
        // stomped the shard hit's own (correct, outward) knockback on the
        // very next frame. hitStun already exists as an AI-suppression
        // gate (enemy.js's update() early-returns and just runs physics
        // with whatever vx/vy is already set) — reusing it here, refreshed
        // every frame while the pull is active, is the same pattern the
        // player-side fix above uses.
        enemy.hitStun = Math.max(enemy.hitStun || 0, 3);
        player.tether.hitStunSetLastFrame = enemy.hitStun;
      }
    }
  }

  // ── Graviton Surge Gravity Ball (Lv2+, built 2026-07-16) ─────────────────
  // Pulls while anchored (charging) AND while it's flying forward+upward
  // after release, right up until it explodes (2026-07-19).
  if (player.gravitonBallCharging || player.gravitonBallFlying) {
    const enemiesHere = areaEnemies[currentAreaId] || [];
    for (const enemy of enemiesHere) {
      if (enemy.dead) continue;
      const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
      const d = Math.hypot(ex - player.gravitonBallX, ey - player.gravitonBallY);
      if (d > 0 && d <= GRAVITON_BALL_PULL_RADIUS) {
        const pullSpeed = GRAVITON_BALL_PULL_FORCE * (limitBreak.active && limitBreak.ability === 'graviton_surge' ? 1.5 : 1);
        enemy.vx += ((player.gravitonBallX - ex) / d) * pullSpeed;
        enemy.vy += ((player.gravitonBallY - ey) / d) * pullSpeed;
      }
    }
  }
  if (player.gravitonBallPop) {
    player.gravitonBallPop = false;
    if (oldTier('graviton_surge') >= 3 || (limitBreak.active && limitBreak.ability === 'graviton_surge')) {
      const dmg = limitBreak.active && limitBreak.ability === 'graviton_surge' ? GRAVITON_BALL_EXPLODE_DAMAGE * 1.5 : GRAVITON_BALL_EXPLODE_DAMAGE;
      const kb = limitBreak.active && limitBreak.ability === 'graviton_surge' ? GRAVITON_BALL_EXPLODE_KB * 2 : GRAVITON_BALL_EXPLODE_KB; // 300%/200% knockback multiplier on a base of ~2-4
      const enemiesHere = areaEnemies[currentAreaId] || [];
      for (const enemy of enemiesHere) {
        if (enemy.dead) continue;
        const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
        const d = Math.hypot(ex - player.gravitonBallX, ey - player.gravitonBallY);
        if (d <= GRAVITON_BALL_PULL_RADIUS) {
          enemy.takeDamage(dmg, player.gravitonBallX);
          enemy.vx = ((ex - player.gravitonBallX) / (d || 1)) * kb;
          enemy.vy = -kb * 0.5;
        }
      }
      spawnParticles(player.gravitonBallX, player.gravitonBallY, '#f472b6', 20);
      screenShake = 14; screenShakeIntensity = 8; setHitstop(8);
    }
  }

  // ── Graviton Surge: flips gravity for every enemy in range, not just the
  // player (fixed 2026-07-16 — was player-only). Uses resolveCeilingY()
  // (real platform-aware ceiling collision, see its comment above) instead
  // of a fixed clamp line, so enemies stop at the underside of an actual
  // ceiling platform instead of clipping through it. Lv0: stun only, 0
  // damage. Lv1+: stun + 1 damage (Enemy_Design.pdf). Uses hitStun, not
  // stunTimer, for the stun — stunTimer is the parry-freeze mechanic (skips
  // physics entirely), which was silently making these "stunned" enemies
  // immune to their own slam knockback (user feedback 2026-07-16).
  if (player.gravitonActive) {
    const dealsDamage = oldTier('graviton_surge') >= 1 || (limitBreak.active && limitBreak.ability === 'graviton_surge');
    const px = player.x + player.width / 2, py = player.y + player.height / 2;
    const area = getCurrentArea();
    const enemiesHere = areaEnemies[currentAreaId] || [];
    for (const enemy of enemiesHere) {
      if (enemy.dead) continue;
      // Flying enemies (ComposedEnemy's hover/teleport_blink movement —
      // Crystal Sentinel included since its 2026-07-24 ComposedEnemy
      // migration — plus any remaining bespoke class's own isFlying flag)
      // ignore gravity entirely already, so a gravity flip has nothing to
      // grab onto — they
      // stay fully immune to both the ceiling pin and the slam damage
      // instead of getting yanked upward like grounded enemies (user
      // clarification 2026-07-24: this is intended, not the "flies through
      // the ceiling" bug — the pin/damage just shouldn't apply to them).
      if (enemy._movementFlies || enemy.isFlying) continue;
      const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
      if (Math.hypot(ex - px, ey - py) > GRAVITON_SURGE_RANGE) {
        enemy.gravitonSlammed = false; enemy.gravitonBounceTimer = 0; enemy._groundStompFired = false;
        continue;
      }
      // Ground Stomp counter (enemy_attack_vocabulary_plan.md — fixed
      // 2026-07-24, see COUNTER_EFFECTS.graviton_surge in enemy.js): this
      // enemy stands its ground instead of getting pinned to the ceiling —
      // "Surge isn't a free wail-on-them window" for enemies that carry it.
      // Fires once per active flip while the enemy is in Graviton Surge
      // range, regardless of which side of the flip the player ends up on
      // — the enemy itself never leaves the ground to care which way is down.
      if (enemy.groundStomp) {
        if (!enemy._groundStompFired) {
          enemy._groundStompFired = true;
          const gs = enemy.groundStomp;
          if (Math.hypot(px - ex, py - ey) <= gs.shockwaveRadius && player.invincibleTimer <= 0) {
            player.takeDamage(gs.damage, enemy.x);
            player.vy = Math.min(player.vy, gs.knockbackY);
          }
          spawnParticles(ex, enemy.y + enemy.height, '#f472b6', 16);
          if (typeof screenShake !== 'undefined') { screenShake = Math.max(screenShake, 10); screenShakeIntensity = Math.max(screenShakeIntensity, 5); }
          setHitstop(6);
        }
        continue;
      }

      // Bounce grace window (user report 2026-07-19: "still turn white and
      // frozen on the ceiling" — the bounce added below was being undone
      // one frame later. Two compounding bugs: (1) the anti-gravity force
      // and the `enemy.y <= ceilingY` re-pin ran unconditionally every
      // frame for every enemy still in range, so a bounce's downward vy=2
      // got overwritten right back to pinned-at-ceiling before it could
      // move the entity anywhere; (2) `hitStun = max(hitStun, 20)` was
      // ALSO refreshed every one of those frames, so hitStun never
      // actually counted down — the enemy sat in its hit-stun branch
      // indefinitely, which is what reads as "frozen" and, since that
      // branch only decrements flashTimer (see e.g. line ~1020's
      // `flashTimer = max(0, flashTimer - 1)`), kept it perpetually under
      // the <6 threshold that draws white. Now a bounce starts a short
      // countdown during which this loop leaves the enemy alone — gravity
      // stays flipped (still inside graviton range) but the anti-gravity
      // PUSH and the re-pin are skipped, so vx/vy from the bounce actually
      // carries it off the ceiling — and hitStun is only set once per
      // slam, not refreshed every frame, so it counts down normally.
      if (enemy.gravitonBounceTimer > 0) {
        enemy.gravitonBounceTimer--;
        continue;
      }

      enemy.vy -= 2 * GRAVITY; // cancels this frame's own +GRAVITY and replaces it with -GRAVITY
      const ceilingY = resolveCeilingY(enemy, area);
      if (enemy.y <= ceilingY) {
        // A hard hit bounces off (mirrors physics.js's wall-bounce: reverse
        // + dampen vx, plus a downward kick so it actually leaves the
        // ceiling and falls to land/take damage) instead of freezing there;
        // anything slower sticks but decays via the same 0.8 ground-friction
        // factor physics.js uses for landed knockback, so it settles
        // instead of sliding.
        enemy.y = ceilingY;
        if (Math.abs(enemy.vx) >= WALL_BOUNCE_MIN_SPEED) {
          enemy.vx = -enemy.vx * WALL_BOUNCE_MULT;
          enemy.vy = 3;
          enemy.gravitonBounceTimer = 15; // ~0.25s to actually leave the ceiling
        } else {
          enemy.vy = 0;
          enemy.vx *= 0.8;
        }
        if (!enemy.gravitonSlammed) {
          enemy.gravitonSlammed = true;
          enemy.hitStun = Math.max(enemy.hitStun || 0, 20);
          if (dealsDamage) enemy.takeDamage(1, enemy.x);
          // A kill lands here mid-air (pinned at the ceiling) — every
          // enemy class's own update() early-returns once `dead` is true
          // (`if (this.dead) { this.deathTimer++; return; }`, enemy.js),
          // which is correct for a normal ground death (the corpse just
          // fades in place, already resting on the floor) but leaves an
          // aerial death frozen wherever it died forever, since nothing
          // ever applies gravity to it again (user report 2026-07-24:
          // "sometimes they stay on the ceiling"). Snapping straight to
          // the floor on the kill frame isn't a real fall animation, but
          // it's a small, contained fix scoped to this one code path
          // rather than touching the ~9 duplicated dead-early-return sites
          // across enemy.js's classes — a real animated fall would need
          // that broader change instead.
          if (enemy.dead) {
            enemy.y = area.groundY - enemy.height;
            enemy.vx = 0; enemy.vy = 0;
            enemy.gravitonSlammed = false;
            enemy.gravitonBounceTimer = 0;
          }
        }
      }
    }
  } else {
    for (const enemy of (areaEnemies[currentAreaId] || [])) { enemy.gravitonSlammed = false; enemy.gravitonBounceTimer = 0; enemy._groundStompFired = false; }
  }

  // ── Graviton Surge: player ceiling landing ───────────────────────────────
  // player.js's own platform collision already stops the player when moving
  // up into a real platform's underside (the existing "hit head" branch),
  // but nothing previously stopped them in an open-topped room — they just
  // flew off-screen (user-reported bug 2026-07-16). This is the player-side
  // equivalent of the enemy clamp above: land them on whichever ceiling
  // resolveCeilingY() finds, and mark `grounded` so jump (already flipped
  // to push "away from the ceiling" in player.js) works again.
  if (player.gravitonActive) {
    const ceilingY = resolveCeilingY(player, getCurrentArea());
    if (player.y <= ceilingY) {
      player.y = ceilingY;
      player.vy = 0;
      player.grounded = true;
      player.coyoteTimer = COYOTE_FRAMES;
    }
  }

  // Update echoes
  for (let i = echoes.length - 1; i >= 0; i--) {
    echoes[i].update();
    if (!echoes[i].alive) {
      echoes.splice(i, 1);
    }
  }

  // Update projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    projectiles[i].update();
    if (!projectiles[i].alive) {
      projectiles.splice(i, 1);
    }
  }

  // Reflected Shard Shots (Deflector Drone, expansion.md 2.3 #31) can hit
  // the player back — dodgeable, but punishes reflexive spam-firing. Only
  // player projectiles ever reach `projectiles[]` (enemy-fired shots use
  // separate arrays — see ComposedEnemy.updateProjectiles/bossProjectiles),
  // so `reflected` is the only thing gating this from being a self-damage
  // bug on every normal shot.
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    if (proj.reflected && player.invincibleTimer <= 0 && rectsOverlap(proj.getBounds(), player)) {
      player.takeDamage(proj.damage);
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#67e8f9', 6);
      SFX.playerHurt();
      projectiles.splice(i, 1);
    }
  }

  // Afterimage Strike hazards (enemy_attack_vocabulary_plan.md) — count
  // down the arm delay, then explode: damage the player if they lingered
  // in the blast radius, always show the tell (particles/shake), always
  // remove. No dodge-the-spawn window is needed since the hazard already
  // rode a real delay after the dash ended — "keep moving after" is the
  // whole point, not "react to a projectile."
  for (let i = afterimageHazards.length - 1; i >= 0; i--) {
    const h = afterimageHazards[i];
    h.timer -= (typeof gameTimeScale !== 'undefined' && !isNaN(gameTimeScale)) ? gameTimeScale : 1.0;
    if (h.timer <= 0) {
      const pcx = player.x + player.width / 2, pcy = player.y + player.height / 2;
      if (player.invincibleTimer <= 0 && Math.hypot(pcx - h.x, pcy - h.y) <= h.radius) {
        player.takeDamage(h.damage, h.x);
        SFX.playerHurt();
      }
      spawnParticles(h.x, h.y, '#c084fc', 12);
      if (typeof screenShake !== 'undefined') { screenShake = Math.max(screenShake, 8); screenShakeIntensity = Math.max(screenShakeIntensity, 4); }
      afterimageHazards.splice(i, 1);
    }
  }

  // ── ComposedEnemy projectiles (Crystal Sentinel's shots included since
  // its 2026-07-24 ComposedEnemy migration — enemy_designer.html "ranged_projectile") ──
  ComposedEnemy.updateProjectiles(player);

  // Update enemies
  const enemies = areaEnemies[currentAreaId] || [];
  for (const enemy of enemies) {
    enemy.update(player, bounds, echoes, enemies);

    // ── Wall bounce impact VFX (2026-07-16, combo-focused: a knocked-back
    // enemy bounces hard off walls — a wall-adjacent hit opens a follow-up
    // combo window). The actual position/velocity bounce now happens inside
    // resolveEnemyPhysics (physics.js, shared by every enemy subclass —
    // replacing the detection loop that used to live here); the resolver
    // flags `wallBouncedThisFrame` and this block just plays the impact.
    if (!enemy.dead && enemy.wallBouncedThisFrame) {
      enemy.wallBouncedThisFrame = false;
      spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#f87171', 10);
      screenShake = Math.max(screenShake, 8); screenShakeIntensity = Math.max(screenShakeIntensity, 4);
      setHitstop(5);
    }

    // ── Anti-juggle breakout burst (defense verbs, enemy.js) ──────────────
    // The enemy finished its 15f charge flash mid-juggle: radial shove on
    // the player (big knockback, minimal damage) that caps infinite juggles
    // without deleting the combo system — bait it by stopping one hit short.
    if (!enemy.dead && enemy.breakoutBurstPending) {
      enemy.breakoutBurstPending = false;
      const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
      const px = player.x + player.width / 2, py = player.y + player.height / 2;
      const d = Math.hypot(px - ex, py - ey);
      if (d < 110 && player.invincibleTimer <= 0 && !player.phaseDashing) {
        const nx = d > 0 ? (px - ex) / d : 1, ny = d > 0 ? (py - ey) / d : 0;
        // Shove only — the burst's job is escape + repositioning, not damage.
        player.vx = nx * 12;
        player.vy = Math.min(-6, ny * 10);
        player.hitStunTimer = 14;
        player.grounded = false;
      }
      spawnParticles(ex, ey, '#ffffff', 16);
      screenShake = Math.max(screenShake, 12); screenShakeIntensity = Math.max(screenShakeIntensity, 6);
      setHitstop(6);
      SFX.enemyDeath(); // deep burst thump — reuse until a dedicated SFX exists
    }

    // Void Tether Lv4 Limit Break burning DoT (2dmg/s for 3s) — see the
    // Void Tether arrival block above, which sets `enemy.burning`.
    if (enemy.burning && !enemy.dead) {
      enemy.burning.timer--;
      enemy.burning.tickTimer--;
      if (enemy.burning.tickTimer <= 0) {
        enemy.burning.tickTimer = 30; // every 0.5s = 2dmg/s
        enemy.takeDamage(1, enemy.x);
        spawnParticles(enemy.x + enemy.width / 2, enemy.y, '#fb923c', 3);
      }
      if (enemy.burning.timer <= 0) enemy.burning = null;
    }

    // Player attack hits enemy — gated to once per swing (see
    // player.hitTargetsThisSwing) so an enemy that stays inside a multi-frame
    // attack hitbox at point-blank range doesn't take damage/knockback/
    // hitstop on every overlapping frame, only once per swing.
    const playerAtk = player.getAttackHitbox();
    if (playerAtk && !enemy.dead && rectsOverlap(playerAtk, enemy) && !player.hitTargetsThisSwing.has(enemy)) {
      player.hitTargetsThisSwing.add(enemy);

      // ComposedEnemy counter_stance (enemy_designer.html) — a hit landed
      // while the enemy is actively countering negates the player's damage
      // entirely and lands a counter-hit on the player instead. Still counts
      // as "swung at" (hitTargetsThisSwing above) so it doesn't retry mid-swing.
      if (enemy.isCountering && enemy.isCountering()) {
        enemy.onCountered(player);
        SFX.parry();
        continue;
      }

      // ── Defense verbs (2026-07-16 combat overhaul, enemy.js's
      // updateDefense/defense config) ──
      // Dodge i-frames: the enemy already hopped clear — the swing whiffs.
      if (enemy.dodgeIFrames > 0) {
        spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#94a3b8', 4);
        continue;
      }
      // Guard: blocks damage from the FRONT. Counterplay (must all work or
      // blocking is just annoying): heavy/charged attacks BREAK the guard
      // (stagger, no re-guard for 40f), and hits from behind bypass it
      // entirely. (Void Tether pulls also break guard — see the tether
      // arrival block.)
      if (enemy.blocking > 0) {
        const fromFront = ((player.x + player.width / 2) - (enemy.x + enemy.width / 2)) * enemy.facing > 0;
        if (fromFront && !player.heavy) {
          // Clank — no damage, small player recoil, distinct feedback.
          enemy.blocking = Math.max(enemy.blocking, 6);
          player.vx = -player.facing * 3;
          spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#cbd5e1', 8);
          screenShake = Math.max(screenShake, 3); screenShakeIntensity = Math.max(screenShakeIntensity, 2);
          setHitstop(4);
          SFX.parry(); // metallic clank — reuse until a dedicated SFX exists
          continue;
        }
        if (fromFront && player.heavy) {
          // GUARD BREAK — the charged attack smashes through: stagger and
          // a vulnerability window, then the hit resolves as normal below.
          enemy.blocking = 0;
          enemy.guardBroken = 40;
          enemy.hitStun = Math.max(enemy.hitStun, 20);
          spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#e2e8f0', 14);
          screenShake = Math.max(screenShake, 10); screenShakeIntensity = Math.max(screenShakeIntensity, 5);
          setHitstop(8);
        }
        // From behind: guard does nothing — fall through to normal damage.
      }

      const dmg = playerMeleeDamage();
      enemy.takeDamage(dmg, player.x, playerAtk.dir);
      applyStillpointLifeSteal();
      spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#f87171', player.heavy ? 10 : 6);
      player.gainFracture(); // melee hit recharges Fracture meter

      // Phase 1.8: Dash Refund on Hit — refund 50% of base dash cooldown (once per attack)
      if (!player.dashRefundedThisAttack && player.dashCooldown > 0) {
        player.dashCooldown = Math.max(0, player.dashCooldown - Math.floor(DASH_COOLDOWN * 0.5));
        player.dashRefundedThisAttack = true;
      }

      // Per-attack hitstop/shake variation (heavy = amplified)
      if (playerAtk.dir === 'down') {
        player.vy = ATK_POGO_VY;
        player.grounded = false;
        screenShake = player.heavy ? 16 : 10; screenShakeIntensity = player.heavy ? 8 : 5;
        setHitstop(player.heavy ? 12 : 7);
      } else if (playerAtk.dir === 'up') {
        screenShake = player.heavy ? 10 : 5; screenShakeIntensity = player.heavy ? 6 : 3;
        setHitstop(player.heavy ? 9 : 5);
      } else {
        screenShake = player.heavy ? 12 : 6; screenShakeIntensity = player.heavy ? 6 : 3;
        setHitstop(player.heavy ? 8 : 4);
      }

      // Extra knockback on heavy hit
      if (player.heavy) {
        const kb = player.facing * HEAVY_KNOCKBACK * 3;
        enemy.vx = kb;
        if (playerAtk.dir === 'down') enemy.vy = -6;
        if (playerAtk.dir === 'up') enemy.vy = 6;
      }

      // Kill cam slow-mo — only on the LAST living enemy in the room (per design doc:
      // "0.3x speed for 8 frames on the last enemy kill in a group"). Previously this
      // fired on every single kill at 30 frames/0.5x, which is why combat felt like it
      // lagged on almost every hit (most basic enemies die in 1-2 hits).
      if (enemy.dead) {
        SFX.enemyDeath();
        // Vitality motes (healing.js) — combat-earned healing drops
        spawnVitalityMotes(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2,
          moteCountForEnemy(enemy) + (player.heavy ? 1 : 0));
        // Companion weapon drops (companion.js) — she finds a different
        // found weapon the same way the player finds abilities; only once
        // she's actually fighting, and rare enough to feel like a find.
        if (companionState.canFight && Math.random() < COMPANION_WEAPON_DROP_CHANCE) {
          spawnWeaponDrop(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        }
        const anyAlive = enemies.some((e) => e !== enemy && !e.dead);
        if (!anyAlive) {
          slowMoTimer = 8; slowMoSkip = 0; // ~0.3x for 8 frames, last-enemy-in-group only
          screenShake = Math.max(screenShake, 12);
          screenShakeIntensity = Math.max(screenShakeIntensity, 6);
          setHitstop(8);
        }
      } else {
        SFX.attackHit();
      }
    }

        // Projectile hits enemy
    for (let j = projectiles.length - 1; j >= 0; j--) {
      const proj = projectiles[j];
      const projBounds = proj.getBounds();
      if (!enemy.dead && rectsOverlap(projBounds, enemy)) {
        // Deflector Drone (expansion.md 2.3 #31) — a shot hitting its
        // currently-shielded side is reflected back instead of damaging it,
        // punishing reflexive spam-firing from safe range. Doesn't consume
        // the shot; it keeps flying, now able to hit the player (see the
        // reflected-projectile-vs-player check below).
        if ((enemy instanceof DeflectorDrone || enemy.reflectsProjectiles) && !proj.reflected && enemy.shieldFacesPoint(proj.x)) {
          proj.vx *= -1;
          proj.reflected = true;
          spawnParticles(proj.x + 5, proj.y + 3, '#67e8f9', 8);
          SFX.shardHit();
          continue;
        }
        // takeDamage()'s knockback direction is `this.x > sourceX ? 1 : -1`
        // — reliable for melee (sourceX is the attacker's position, always
        // outside the target's body at hit time) but not for a projectile:
        // at close range (Void Tether pulls a target adjacent before you
        // can even fire — user report 2026-07-19: "shard shot after void
        // tether, the enemy comes closer") proj.x can land INSIDE the
        // enemy's own hitbox by the frame the hit registers, and the sign
        // of that comparison becomes arbitrary — confirmed via harness: it
        // occasionally flips knockback from "away from the shot" to
        // "toward the player." A point synthesized far back along the
        // projectile's own travel direction is guaranteed outside the
        // target's body regardless of hit distance, and degrades to the
        // same direction as plain proj.x for any normal (non-point-blank) hit.
        const knockSourceX = proj.x - Math.sign(proj.vx || 1) * 200;
        // 'ranged' — was Crystal Sentinel-only (its shield takes double
        // damage from it), now passed universally so ComposedEnemy's
        // shard_shot counters (Aggro-Pull, Mote Eater — enemy_attack_
        // vocabulary_plan.md) can tell a projectile hit from a melee one.
        // Harmless for every other class: their takeDamage() only branches
        // on 'up'/'down', so 'ranged' falls into the same default/forward
        // knockback path an omitted 3rd arg already used.
        enemy.takeDamage(proj.damage, knockSourceX, 'ranged');
        spawnParticles(proj.x + 5, proj.y + 3, '#67e8f9', 6);
        projectiles.splice(j, 1);
        screenShake = 4;
        screenShakeIntensity = 2;
        setHitstop(3);
        if (enemy.dead) SFX.enemyDeath(); else SFX.shardHit();
        break;
      }
    }

    // Projectile hits platform
    for (let j = projectiles.length - 1; j >= 0; j--) {
      const proj = projectiles[j];
      const projBounds = proj.getBounds();
      for (const plat of area.platforms) {
        if (plat.destructible && plat.hp > 0) {
          if (rectsOverlap(projBounds, { x: plat.x, y: plat.y, width: plat.w, height: plat.h })) {
            plat.hp--;
            spawnParticles(proj.x + 5, proj.y + 3, '#2dd4bf', 8);
            if (plat.hp <= 0) {
              spawnParticles(plat.x + plat.w / 2, plat.y + plat.h / 2, '#2dd4bf', 16);
            }
            projectiles.splice(j, 1);
            break;
          }
        } else if (!plat.destructible) {
          if (rectsOverlap(projBounds, { x: plat.x, y: plat.y, width: plat.w, height: plat.h })) {
            spawnParticles(proj.x + 5, proj.y + 3, '#67e8f9', 3);
            projectiles.splice(j, 1);
            break;
          }
        }
      }
    }

    // Enemy attack hits player — gated on invincibility/Phase Dash like every
    // other player-damage check (boss body/projectiles, miniboss, enemy body
    // contact below). This block was missing that gate: an enemy's attack
    // hitbox could still land during a Phase Dash even though body contact
    // couldn't, since the two checks weren't kept consistent with each other.
    const enemyAtk = enemy.getAttackHitbox();
    if (enemyAtk && rectsOverlap(enemyAtk, player) && player.invincibleTimer <= 0 && !player.phaseDashing && !tryParryDeflect(enemy)) {
      // ComposedEnemy attacks (enemy.js) can define their own damage/
      // knockback per attack (e.g. a grab-throw or a heavy dash_charge
      // that should send the player flying) instead of the flat default.
      const custom = enemy.getAttackDamageAndKnockback && enemy.getAttackDamageAndKnockback();
      if (custom) {
        player.takeDamage(custom.damage, enemy.x + enemy.width / 2, custom.knockback);
        if (custom.dotOnHit) applyPlayerDot(player, custom.dotOnHit);
      } else {
        player.takeDamage(ENEMY_DAMAGE, enemy.x + enemy.width / 2);
      }
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#c4b5fd', 4);
      // Scavenged-weapon melee hits (taser) get their own zap instead of the
      // generic hurt grunt — every other attack type keeps playerHurt().
      const hitType = (enemy._activeAttack !== null && enemy.attacks) ? enemy.attacks[enemy._activeAttack]?.type : null;
      if (hitType === 'taser' && SFX.taserZap) SFX.taserZap();
      else SFX.playerHurt();
    }

    // Enemy body contact with player — push apart every frame there's overlap
    // (regardless of invincibility) so the two boxes never sit inside each
    // other; damage/parry are still gated the same as before. EXCEPT during
    // Phase Dash: the whole point of the ability is passing through enemies
    // to appear on the other side, so skip the physical separation then too
    // — otherwise this push-apart fought the dash's velocity every frame and
    // just shoved the player back out instead of letting them through.
    // Also skip for the enemy actively being Void Tether-pulled: confirmed
    // via harness that without this, the tether's approach and this
    // push-apart fight every single frame once the two hitboxes touch (the
    // tether pulls center-to-center, so contact happens before its own
    // arrival-distance check fires) — the player got shoved backward the
    // length of the room, with the enemy in tow, before arrival could ever
    // trigger. Same fix shape as the Phase Dash case above.
    const isTetherTarget = player.tether && player.tether.targetEnemy === enemy;
    // Per-enemy pass-through immunity (2026-07-25 fix — see player.js's
    // dash-start reset for the full story): a dash whose total travel
    // (PHASE_DASH_SPEED * PHASE_DASH_DURATION) ends before the player fully
    // clears the far edge of an enemy used to result in a normal hit the
    // instant phaseDashing flipped false, even with no counter involved —
    // the opposite of "the whole point of the ability." An enemy touched
    // while phaseDashing was true stays immune here until the overlap
    // itself clears, regardless of the dash timer. Enemy-specific counters
    // (cancel_and_damage, afterimage_strike below) are untouched — both key
    // off `player.phaseDashing`/overlap directly, so they still fire on the
    // original contact exactly as before this set was added.
    const phasedThrough = player.phasedThroughEnemies && player.phasedThroughEnemies.has(enemy);
    if (!enemy.dead && rectsOverlap(player, enemy)) {
      // Afterimage Strike (enemy_attack_vocabulary_plan.md) — arm right on
      // the dash-through contact itself, the same moment/overlap this block
      // already detects for the separation skip below. Only the first
      // qualifying enemy touched per dash arms it (player._afterimageArmed
      // guards that, see player.js's dash-start reset) — the actual hazard
      // is pushed once the dash ends, in player.js, so it lands where the
      // player actually stops, not mid-dash.
      if (player.phaseDashing && !player._afterimageArmed && enemy.counters) {
        const c = enemy.counters.find((c) => c.ability === 'phase_dash' && c.effect === 'afterimage_strike');
        if (c) {
          player._afterimageArmed = true;
          player._afterimageParams = { ...COUNTER_EFFECTS.phase_dash.afterimage_strike.params, ...c };
        }
      }
      if (player.phaseDashing && player.phasedThroughEnemies) player.phasedThroughEnemies.add(enemy);

      if (!player.phaseDashing && !isTetherTarget && !phasedThrough) separateFromEnemy(player, enemy);

      if (player.invincibleTimer <= 0 && !player.phaseDashing && !phasedThrough && !tryParryDeflect(enemy)) {
        player.takeDamage(ENEMY_DAMAGE, enemy.x + enemy.width / 2);
        spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#c4b5fd', 4);
        SFX.playerHurt();
      }
    } else if (phasedThrough) {
      // Overlap cleared — release the immunity so a LATER, unrelated touch
      // (this same enemy again, a different dash entirely) deals damage normally.
      player.phasedThroughEnemies.delete(enemy);
    }
  }

  // Remove dead enemies after animation
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].dead && enemies[i].deathTimer >= 20) {
      enemies.splice(i, 1);
    }
  }

  // Player heavy attack cracks destructible walls (rubble walls in Crag of
  // the Colossus, and any future heavy-attack-only wall). A normal attack
  // does nothing — only `player.heavy === true` chips away hp. Same
  // once-per-swing dedup as the enemy/boss hit loops above, so holding the
  // hitbox against a wall across multiple frames doesn't multi-tick it.
  const wallAtk = player.getAttackHitbox();
  if (wallAtk && player.heavy) {
    for (const plat of area.platforms) {
      if (!plat.destructible || plat.hp === undefined || plat.hp <= 0) continue;
      if (player.hitTargetsThisSwing.has(plat)) continue;
      if (rectsOverlap(wallAtk, { x: plat.x, y: plat.y, width: plat.w, height: plat.h })) {
        player.hitTargetsThisSwing.add(plat);
        plat.hp--;
        spawnParticles(plat.x + plat.w / 2, plat.y + plat.h / 2, '#2dd4bf', plat.hp <= 0 ? 16 : 8);
        screenShake = Math.max(screenShake, 6);
        screenShakeIntensity = Math.max(screenShakeIntensity, 3);
        setHitstop(5);
        SFX.shardHit();
      }
    }
  }

  // === BOSS UPDATE ===
  // Gate on `boss` alone, NOT `boss && !boss.dead` — that used to mean once
  // `dead` flipped true, this whole block (including the `boss.update()`
  // call that increments `deathTimer`) stopped running on every subsequent
  // frame, so `deathTimer` got stuck at 0 forever and `deathTimer === 1`
  // (required below to trigger victory) could never become true. Confirmed
  // live: defeating the King could not end the game through this path.
  // Boss.update() already early-returns after incrementing deathTimer when
  // `this.dead`, so calling it unconditionally here is safe — same pattern
  // already used for the miniboss's equivalent block.
  if (boss) {
    boss.update(player, bossProjectiles, area.width);

    // Handle boss summon requests
    if (boss.summonData) {
      const enemies = areaEnemies[currentAreaId] || [];
      const spawnPos = [boss.summonData.left, boss.summonData.right];
      for (const pos of spawnPos) {
        enemies.push(new FracturedSlime(pos.x, pos.y));
        spawnParticles(pos.x + 15, pos.y + 15, '#c4b5fd', 8);
      }
      boss.summonData = null;
    }

    // Player melee attack hits boss — same once-per-swing dedup as the
    // regular enemy hit loop above (see player.hitTargetsThisSwing).
    const playerAtk = player.getAttackHitbox();
    if (playerAtk && !boss.dead && rectsOverlap(playerAtk, boss) && !player.hitTargetsThisSwing.has(boss)) {
      player.hitTargetsThisSwing.add(boss);
      const dmg = playerMeleeDamage();
      boss.takeDamage(dmg, player.x, 'melee');
      applyStillpointLifeSteal();
      spawnParticles(boss.x + boss.width / 2, boss.y + boss.height / 2, '#f87171', player.heavy ? 12 : 6);
      player.gainFracture();
      SFX.bossHit();
      if (player.heavy) {
        screenShake = 14; screenShakeIntensity = 7;
        setHitstop(10);
      }
    }

    // Player projectiles hit boss
    for (let j = projectiles.length - 1; j >= 0; j--) {
      const proj = projectiles[j];
      const projBounds = proj.getBounds();
      if (!boss.dead && rectsOverlap(projBounds, boss)) {
        boss.takeDamage(proj.damage, proj.x, 'ranged');
        spawnParticles(proj.x + 5, proj.y + 3, '#67e8f9', 6);
        projectiles.splice(j, 1);
        SFX.bossHit();
      }
    }

    // Boss projectiles hit player — per-projectile damage/knockback
    // (Shard Shot sets these explicitly) with a flat-constant fallback for
    // anything that omits them (2026-07-26 damage-plumbing fix).
    for (let j = bossProjectiles.length - 1; j >= 0; j--) {
      const bp = bossProjectiles[j];
      const bpBounds = { x: bp.x, y: bp.y, width: bp.width, height: bp.height };
      if (rectsOverlap(bpBounds, player) && player.invincibleTimer <= 0 && !player.phaseDashing) {
        if (bp.damage !== undefined) {
          player.takeDamage(bp.damage, bp.x, bp.knockback);
        } else {
          player.takeDamage(BOSS_DAMAGE);
        }
        spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#f87171', 4);
        SFX.playerHurt();
        bossProjectiles.splice(j, 1);
      }
    }

    // Boss attack hits player — per-attack damage/knockback via
    // getAttackHitbox()/getAttackDamageAndKnockback() (2026-07-26 moveset
    // rebuild), modeled 1:1 on the miniboss pattern below, falling back to
    // the flat body-contact block underneath (the "just bumped into her
    // passively" low tier) when no real attack is active.
    const bossAtk = !boss.dead ? boss.getAttackHitbox() : null;
    if (bossAtk && rectsOverlap(bossAtk, player) && player.invincibleTimer <= 0 && !player.phaseDashing) {
      const custom = boss.getAttackDamageAndKnockback && boss.getAttackDamageAndKnockback();
      if (custom) {
        player.takeDamage(custom.damage, boss.x + boss.width / 2, custom.knockback);
      } else {
        player.takeDamage(BOSS_DAMAGE);
      }
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#f87171', 4);
      SFX.playerHurt();
    }

    // Boss body contact with player
    if (!boss.dead && rectsOverlap(player, boss) && player.invincibleTimer <= 0 && !player.phaseDashing) {
      player.takeDamage(BOSS_DAMAGE);
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#f87171', 4);
      SFX.playerHurt();
    }

    // Boss death — trigger victory!
    if (boss.dead && boss.deathTimer === 1) {
      screenShake = 60;
      screenShakeIntensity = 5;
      spawnParticles(boss.x + boss.width / 2, boss.y + boss.height / 2, '#fbbf24', 30);
      spawnParticles(boss.x + boss.width / 2, boss.y + boss.height / 2, '#c4b5fd', 20);
      spawnParticles(boss.x + boss.width / 2, boss.y + boss.height / 2, '#2dd4bf', 15);
      victoryTimer = 180;
      gameState = 'victory';
      SFX.bossDeath();
      SFX.setBossMusic(null); // final boss down — let region music (or silence, in victory state) take over
    }
  }

  // === MINIBOSS UPDATE (Colossus Core, etc.) ===
  // NOTE: gate on `miniboss` alone, NOT `miniboss && !miniboss.dead` — the
  // King's equivalent block uses that pattern and it has a real bug: once
  // `dead` flips true, the outer `!boss.dead` check fails on every
  // subsequent frame, so `boss.update()` (which increments `deathTimer`)
  // never runs again and `deathTimer === 1` can never become true — the
  // victory trigger is dead code. Confirmed live (deathTimer stays stuck at
  // 0 forever once dead). Not fixing boss.js's copy here since it's a
  // separate, bigger change to the King's win-condition flow outside this
  // task's scope — flagging it in the summary instead. My own code below
  // must not repeat it, so `miniboss.update()` always runs, and only the
  // damage-dealing collision checks are individually gated on `!miniboss.dead`.
  if (miniboss) {
    miniboss.update(player, bounds, echoes);

    // Player attack hits miniboss — pass `player.heavy` through as a 4th
    // arg so ColossusCore.takeDamage() can enforce "only heavy attacks
    // connect" (other classes simply ignore the extra argument). Whether
    // the hit actually "connects" (for life-steal/fracture-gain purposes)
    // is asked via willConnect() instead of hardcoding `player.heavy` —
    // ColossusCore defines it (only heavy connects, unchanged behavior);
    // anything without it (every ComposedEnemy miniboss) always connects.
    const playerAtk = player.getAttackHitbox();
    if (playerAtk && !miniboss.dead && rectsOverlap(playerAtk, miniboss) && !player.hitTargetsThisSwing.has(miniboss)) {
      player.hitTargetsThisSwing.add(miniboss);
      const dmg = playerMeleeDamage();
      miniboss.takeDamage(dmg, player.x, 'melee', player.heavy);
      const connected = miniboss.willConnect ? miniboss.willConnect(player.heavy) : true;
      if (connected) {
        applyStillpointLifeSteal();
        spawnParticles(miniboss.x + miniboss.width / 2, miniboss.y + miniboss.height / 2, '#fb923c', 10);
        player.gainFracture();
        screenShake = 10; screenShakeIntensity = 5;
        setHitstop(8);
      } else {
        spawnParticles(miniboss.x + miniboss.width / 2, miniboss.y + miniboss.height / 2, '#d97757', 4);
      }
    }

    // Player projectiles (Shard Shot) hit miniboss — mirrors the King's own
    // block above; minibosses previously had no ranged interaction at all,
    // so a Shard Shot silently passed through every one of them.
    for (let j = projectiles.length - 1; j >= 0; j--) {
      const proj = projectiles[j];
      const projBounds = proj.getBounds();
      if (!miniboss.dead && rectsOverlap(projBounds, miniboss)) {
        miniboss.takeDamage(proj.damage, proj.x, 'ranged');
        spawnParticles(proj.x + 5, proj.y + 3, '#67e8f9', 6);
        projectiles.splice(j, 1);
        SFX.bossHit();
      }
    }

    // Miniboss attack hits player — per-attack damage/knockback via
    // getAttackDamageAndKnockback() when the class defines it (every
    // ComposedEnemy does), falling back to the old flat constant for
    // bespoke classes that don't. Also now gated on invincibility/Phase
    // Dash like every other player-damage check in this file, including
    // the body-contact check three lines below — this block was the one
    // exception, letting a miniboss's attack hitbox land mid-dash.
    const mbAtk = !miniboss.dead ? miniboss.getAttackHitbox() : null;
    if (mbAtk && rectsOverlap(mbAtk, player) && player.invincibleTimer <= 0 && !player.phaseDashing) {
      const custom = miniboss.getAttackDamageAndKnockback && miniboss.getAttackDamageAndKnockback();
      if (custom) {
        player.takeDamage(custom.damage, miniboss.x + miniboss.width / 2, custom.knockback);
        if (custom.dotOnHit) applyPlayerDot(player, custom.dotOnHit);
      } else {
        player.takeDamage(COLOSSUS_DAMAGE);
      }
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#d97757', 4);
      SFX.playerHurt();
    }

    // Miniboss body contact with player (its charge attack is the real threat, but guard against a plain collide too)
    if (!miniboss.dead && rectsOverlap(player, miniboss) && player.invincibleTimer <= 0 && !player.phaseDashing) {
      player.takeDamage(1);
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#d97757', 4);
      SFX.playerHurt();
    }

    // Miniboss death — no victory cinematic, just persist the defeat, heal
    // the player, and grant a reward. maxHealthBonus/playerMaxHealth() is
    // the exact generic, save-persisted mechanism healing.js's max-health
    // shards already use — this used to be flagged as "out of scope," which
    // was stale the moment that system existed for another reward path.
    // Temporal Warden (`chrono_ally`, 2026-07-26) is the one documented
    // exception — his reward is a Stillpoint upgrade (+1 lifesteal per
    // hit), not +1 Max Health, per expansion.md's own per-fight reward
    // table — see stillpointLifestealBonus above for why that's a separate
    // additive bonus rather than a direct statUpgrades.stillpoint bump.
    if (miniboss.dead && miniboss.deathTimer === 1) {
      defeatedMinibosses[area.miniboss] = true;
      SFX.setBossMusic(null); // fight's over — drop back to region music even though still in the arena
      screenShake = 40;
      screenShakeIntensity = 5;
      spawnParticles(miniboss.x + miniboss.width / 2, miniboss.y + miniboss.height / 2, '#fbbf24', 24);
      spawnParticles(miniboss.x + miniboss.width / 2, miniboss.y + miniboss.height / 2, '#fb923c', 18);
      player.health = playerMaxHealth();
      const name = (miniboss.displayName || area.miniboss).toUpperCase();
      if (area.miniboss === 'chrono_ally') {
        stillpointLifestealBonus++;
        addAbilityNotification(`${name} DEFEATED — STILLPOINT LIFESTEAL +1 (${stillpointLifestealCap()}/ACTIVATION)`);
      } else if (area.miniboss === 'antechamber_child') {
        // The Child's defeat IS the reward — the Absorb/Spare choice below,
        // not the usual +1 Max Health (see cutscene.js's
        // 'antechamber_child_ending' script and story.md §5's Absorb/Spare
        // table, now attached to this fight per user direction 2026-07-28).
        playCutscene('antechamber_child_ending');
      } else {
        maxHealthBonus++;
        addAbilityNotification(`${name} DEFEATED — MAX HEALTH +1 (${playerMaxHealth()})`);
      }
      SFX.bossDeath();
      saveGame();
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }
  }

  // Check transitions — skipped during doorCooldown (see its declaration),
  // which prevents a same-tick bounce back through the door the player just
  // used when the authored landing spot overlaps the destination's own
  // return trigger.
  if (doorCooldown > 0) doorCooldown--;
  for (const trans of (doorCooldown > 0 ? [] : area.transitions)) {
    // Check ability requirement. Any `requires` value not recognized below
    // (e.g. `graviton_surge` on inert stub doors toward not-yet-built
    // regions — see Crag Warden / Event Horizon Core) is treated as an
    // always-fail gate, not a no-op. Without this, an unrecognized
    // `requires` silently passed through as unlocked and let the player
    // walk into `switchArea()` for a target that doesn't exist in AREAS,
    // crashing the game loop (uncaught exception on the next frame reading
    // properties off `undefined` — looks exactly like a freeze).
    if (trans.requires && !hasAbilityRequirement(trans.requires)) continue;

    if (rectsOverlap(
      { x: player.x, y: player.y, width: player.width, height: player.height },
      { x: trans.x, y: trans.y, width: trans.w, height: trans.h }
    )) {
      // Hollow Knight-style auto spawn (see computeDoorSpawn) when the
      // level designer left toX/toY unset — no more per-door coordinate
      // authoring required for a standard two-way door.
      const spawn = (trans.toX !== undefined && trans.toY !== undefined)
        ? { x: trans.toX, y: trans.toY }
        : computeDoorSpawn(trans.to, currentAreaId);
      switchArea(trans.to, spawn.x, spawn.y);
      break;
    }
  }

  // Cutscene trigger zones (area.cutsceneTriggers[], 'enter' type — the
  // 'onRoomLoad' type instead fires once from switchArea() in
  // game_entities.js, no zone check needed). Plans/room_scene_editor_plan.md
  // §3/v2 — this is the data-driven replacement for what used to only be
  // hardcoded `if` conditions scattered across this file/game_entities.js;
  // those existing hardcoded checks are untouched, this is additive. Gated
  // on gameState still being 'playing' after the transitions loop above,
  // since switchArea() (called from that loop) can itself have started an
  // onRoomLoad cutscene this same tick.
  if (gameState === 'playing') {
    for (const trig of (area.cutsceneTriggers || [])) {
      if (trig.triggerType !== 'enter') continue;
      if (firedTriggersThisVisit.has(trig.id)) continue;
      if (trig.storyFlag && storyFlags[trig.storyFlag]) continue;
      if (rectsOverlap(
        { x: player.x, y: player.y, width: player.width, height: player.height },
        { x: trig.x, y: trig.y, width: trig.w, height: trig.h }
      )) {
        firedTriggersThisVisit.add(trig.id);
        playCutscene(trig.cutsceneId);
        break;
      }
    }
  }

  // Check Anchor checkpoints
  const spKey = currentAreaId;
  for (const sp of area.anchors) {
    const dist = Math.abs(player.x - sp.x);
    if (dist < 40) {
      if (!anchorActivated[spKey]) {
        anchorActivated[spKey] = true;
        // Anchor rest regrows every struck-open healing crystal (healing.js)
        resetHealingCrystals();
        // Heal 1 pip on first activation — the Anchor restores you
        if (player.health < playerMaxHealth()) {
          player.health = Math.min(playerMaxHealth(), player.health + 1);
          addAbilityNotification('ANCHOR ACTIVATED — health restored');
        } else {
          addAbilityNotification('ANCHOR ACTIVATED');
        }
        spawnParticles(sp.x, sp.y - 30, '#c4b5fd', 12);
        SFX.stillpoint();
      }
      // Save checkpoint position (only write if it's actually a new checkpoint —
      // avoids hammering localStorage every frame while standing near one)
      const isNewCheckpoint = !lastAnchor || lastAnchor.areaId !== currentAreaId || lastAnchor.x !== sp.x || lastAnchor.y !== sp.y;
      lastAnchor = {
        areaId: currentAreaId,
        x: sp.x,
        y: sp.y,
      };
      if (isNewCheckpoint) saveGame();
    }
  }

  // Check ability rewards — data-driven over ABILITY_GRANTS (below) instead
  // of a hand-grown if/else chain. The old chain silently ignored any
  // ability it didn't list: graviton_surge's pickup (graviton_core_room2)
  // and void_tether granted NOTHING on touch — the root cause of "the Void
  // Tether button does nothing" (hasVoidTether was never set anywhere).
  if (area.abilityReward) {
    const ab = area.abilityReward;
    // Max-health shards (healing.js) — the max_health_upgrade_* pickups.
    // Not in ABILITY_GRANTS (they set no abilityState flag); tracked per-id
    // so a collected shard never re-grants on room re-entry.
    if (ab.id && ab.id.startsWith('max_health_upgrade') && !maxHealthShardsCollected[ab.id]) {
      const dist = Math.abs((player.x + player.width / 2) - ab.x) +
                   Math.abs((player.y + player.height / 2) - ab.y);
      if (dist < 30) {
        maxHealthShardsCollected[ab.id] = true;
        maxHealthBonus++;
        player.health = Math.min(playerMaxHealth(), player.health + 1); // the new heart arrives filled
        addAbilityNotification(`MAX HEALTH +1 (${playerMaxHealth()})`);
        spawnParticles(ab.x, ab.y, '#f9a8d4', 24);
        abilityFlash = 14;
        abilityFlashColor = '#f9a8d4';
        abilityPopups.push({ text: '♥ MAX HEALTH +1', x: ab.x, y: ab.y - 20, life: 110, color: '#f9a8d4' });
        SFX.abilityPickup();
        saveGame();
      }
    }
    const grant = ABILITY_GRANTS[ab.id];
    if (grant && !abilityState[grant.flag]) {
      const dist = Math.abs((player.x + player.width / 2) - ab.x) +
                   Math.abs((player.y + player.height / 2) - ab.y);
      if (dist < 30) {
        abilityState[grant.flag] = true;
        addAbilityNotification(grant.notification);
        spawnParticles(ab.x, ab.y, grant.color, grant.particles || 20);
        abilityFlash = grant.flash || 12;
        abilityFlashColor = grant.color;
        abilityPopups.push({ text: `★ ${grant.popup}`, x: ab.x, y: ab.y - 20, life: grant.popupLife || 90, color: grant.color });
        SFX.abilityPickup();
        saveGame();
      }
    }
  }

  // Check Fracture Pip pickups (roadmap 1.9 — raise player.fractureMax, up to FRACTURE_ABS_MAX)
  if (area.fracturePipRewards) {
    for (const fp of area.fracturePipRewards) {
      if (fracturePipsFound[fp.id]) continue;
      const dist = Math.abs((player.x + player.width / 2) - fp.x) +
                   Math.abs((player.y + player.height / 2) - fp.y);
      if (dist < 30) {
        fracturePipsFound[fp.id] = true;
        player.gainFractureMax();
        SFX.abilityPickup();
        spawnParticles(fp.x, fp.y, '#c4b5fd', 18);
        abilityFlash = 10;
        abilityFlashColor = '#c4b5fd';
        abilityPopups.push({ text: `♦ FRACTURE PIP (${player.fractureMax}/4)`, x: fp.x, y: fp.y - 20, life: 90, color: '#c4b5fd' });
        addAbilityNotification(`Fracture Pip found — max ${player.fractureMax}/4`);
        saveGame();
      }
    }
  }

  // Check lore fragments (sparse environmental storytelling pickups)
  if (LORE_ENABLED && area.loreFragments) {
    for (const lf of area.loreFragments) {
      if (collectedLore[lf.id]) continue;
      const dist = Math.abs((player.x + player.width / 2) - lf.x) +
                   Math.abs((player.y + player.height / 2) - lf.y);
      if (dist < 30) {
        collectedLore[lf.id] = true;
        SFX.lorePickup();
        spawnParticles(lf.x, lf.y, '#fbbf24', 14);
        loreOverlay = { text: lf.text, timer: 280, maxTimer: 280 };
      }
    }
  }

  // Lore pips (roadmap 1.9 — the new non-text pickup flow). Independent of
  // LORE_ENABLED/loreOverlay above (the old text-popup path stays dead but
  // intact per CLAUDE.md — not flipped here, this is a separate path).
  // Each pip also banks toward statUpgrades — see spendableLorePips()/
  // tryUpgrade() below.
  //
  // `lf.mode` (added 2026-07-29, set per-pip in levelEditor.html) picks what
  // plays on pickup — undefined/'overlay' keeps the original placeholder
  // vignette (lorePipEffect), 'cutscene' hands off to a real playCutscene()
  // script (lf.cutsceneId), and 'none' is a plain customization/extra pip
  // with no vision at all (see regions.md's Extra/Customization Pips table).
  if (area.loreFragments) {
    for (const lf of area.loreFragments) {
      if (collectedLore[lf.id]) continue;
      const dist = Math.abs((player.x + player.width / 2) - lf.x) +
                   Math.abs((player.y + player.height / 2) - lf.y);
      if (dist < 30) {
        collectedLore[lf.id] = true;
        const mode = lf.mode || 'overlay';
        SFX.lorePickup();
        spawnParticles(lf.x, lf.y, mode === 'none' ? '#94a3b8' : '#fbbf24', 24);
        if (mode === 'cutscene' && lf.cutsceneId) {
          playCutscene(lf.cutsceneId);
        } else if (mode !== 'none') {
          lorePipEffect = { timer: 90, maxTimer: 90 };
        }
        addAbilityNotification(mode === 'none' ? 'Pip found — check Inventory to spend' : 'Lore Pip found — check Inventory to spend');
        saveGame();
      }
    }
  }

  // Update lore overlay timer
  if (loreOverlay) {
    loreOverlay.timer--;
    if (loreOverlay.timer <= 0) loreOverlay = null;
  }

  // Update lore pip placeholder effect timer
  if (lorePipEffect) {
    lorePipEffect.timer--;
    if (lorePipEffect.timer <= 0) lorePipEffect = null;
  }

  // Update notifications
  for (let i = abilityState.notifications.length - 1; i >= 0; i--) {
    abilityState.notifications[i].timer--;
    if (abilityState.notifications[i].timer <= 0) {
      abilityState.notifications.splice(i, 1);
    }
  }

  // Update camera
  updateCamera(player, area);

  clearJustPressed();
}
