// ── Main draw function ──────────────────────────────────────────────────

function draw() {
  // Menu screen
  if (gameState === 'menu') {
    drawMenu();
    return;
  }

  const area = getCurrentArea();

  // Background
  ctx.fillStyle = area.bgColor;
  ctx.fillRect(0, 0, W, H);

  // Area-specific background tint
  ctx.fillStyle = area.bgTint;
  ctx.fillRect(0, 0, W, H);

  // Parallax backdrop — deep nebulae + area-specific silhouettes (screen space, not camera-transformed)
  drawAreaBackdrop(ctx, area, camera);

  // Camera transform
  ctx.save();
  applyCamera(ctx);

  // Screen shake (respect accessibility toggle)
  if (screenShakeEnabled && screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * screenShakeIntensity;
    const shakeY = (Math.random() - 0.5) * screenShakeIntensity;
    ctx.translate(shakeX, shakeY);
    // Decay intensity
    screenShakeIntensity *= 0.9;
  }

  // Background details - subtle grid (parallax-ish)
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 0.5;
  const gridOffset = Math.round(camera.x * 0.3);
  for (let x = -gridOffset % 40; x < area.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(area.width, y);
    ctx.stroke();
  }

  // Ground line
  ctx.strokeStyle = '#2a2a3e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, area.groundY);
  ctx.lineTo(area.width, area.groundY);
  ctx.stroke();

  // Region-wide ambient decoration (Task 4) — drawn under the platforms so
  // it reads as background depth. No-op for regions without a REGION_STYLES
  // entry (origin, crag, dev rooms).
  decorateRoomForRegion(ctx, area, area.region);

  // Platforms
  for (const plat of area.platforms) {
    drawPlatform(ctx, plat, area.platforms, area.region);
    decoratePlatformForRegion(ctx, plat, area.region);
  }

  // Transitions — cave-mouth doors (Task 4), tinted per-room, shaped by
  // door kind (portal/shortcut-arrow/arch). See drawDoor().
  for (const trans of area.transitions) {
    const blocked = !!trans.requires && !hasAbilityRequirement(trans.requires);
    drawDoor(ctx, trans, area, blocked);

    // Arrow indicator (kept from the original flat-door rendering — the
    // arch/portal shapes above don't imply direction on their own).
    if (!blocked) {
      const pulse = Math.sin(frameCount * 0.03) * 0.15 + 0.15;
      ctx.fillStyle = `rgba(196, 181, 253, ${pulse + 0.1})`;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      if (trans.toX > trans.x + trans.w) {
        ctx.fillText('→', trans.x + trans.w / 2, trans.y + trans.h / 2 + 4);
      } else {
        ctx.fillText('←', trans.x + trans.w / 2, trans.y + trans.h / 2 + 4);
      }
      ctx.textAlign = 'left';
    }
  }

  // Anchors (checkpoints)
  for (const sp of area.anchors) {
    const activated = anchorActivated[currentAreaId] || false;
    drawAnchor(ctx, sp, area, activated);
  }

  // Ability rewards
  if (area.abilityReward) {
    drawAbilityReward(ctx, area.abilityReward);
  }

  // Fracture Pip pickups (roadmap 1.9)
  if (area.fracturePipRewards) {
    for (const fp of area.fracturePipRewards) {
      if (!fracturePipsFound[fp.id]) drawFracturePip(ctx, fp);
    }
  }

  // Lore pips (sparse environmental storytelling pickups — roadmap 1.9's
  // non-text flow, always visible; independent of LORE_ENABLED's old
  // text-popup path, see the pickup-check block above)
  if (area.loreFragments) {
    for (const lf of area.loreFragments) {
      if (!collectedLore[lf.id]) drawLoreFragment(ctx, lf);
    }
  }

  // Training dummy (tutorial room only)
  if (area.trainingDummy) {
    drawTrainingDummy(ctx, area.trainingDummy, tutorialState.attacked);
  }

  // Enemies
  const enemies = areaEnemies[currentAreaId] || [];
  for (const enemy of enemies) {
    enemy.draw(ctx);
  }

  // Debug overlay (F3) — per-enemy AI status label, world-space so it
  // tracks the sprite through the camera transform like everything else here.
  if (DEBUG_MODE) {
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      ctx.save();
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      const label = debugLabelForEnemy(enemy);
      const labelX = enemy.x + enemy.width / 2;
      const labelY = enemy.y - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(labelX - textWidth / 2 - 3, labelY - 10, textWidth + 6, 13);
      ctx.fillStyle = '#7dffb3';
      ctx.fillText(label, labelX, labelY);
      ctx.restore();
    }
  }

  // Void Tether target telegraph — a faint ring on the enemy that WOULD be
  // pulled if R were pressed right now (only while the ability is held,
  // off cooldown, and not already mid-pull). Makes the facing auto-aim
  // legible without HUD chrome, per the in-world-feedback design rule.
  if (abilityState.hasVoidTether && abilityState.voidTetherCooldown <= 0 && !player.tether) {
    const rawTetherTelegraph = abilityLevel('void_tether');
    const range = VOID_TETHER_RANGE_BASE * (oldTier('void_tether') >= 1 ? 1.3 : (rawTetherTelegraph >= 1 ? 1.15 : 1));
    const tgt = findVoidTetherTarget(player, range);
    if (tgt) {
      const pulse = Math.sin(frameCount * 0.15) * 0.15;
      ctx.strokeStyle = `rgba(52, 211, 153, ${0.35 + pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2, Math.max(tgt.width, tgt.height) * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  // Void Tether beam — the actual pull had NO visual while active (user
  // report 2026-07-19: "please make my void tether visible"); the ring
  // above is only the pre-cast preview and disappears the instant
  // player.tether is set. Modeled on the Child's tetherBeam convention
  // (companion.js) — a glowing line from the player to whatever's being
  // pulled, plus a small burst at the target end.
  // Style-only ANIM_DEFS bridge (2026-07-19) — the beam's two endpoints
  // (bx,by,tx,ty) are ALWAYS computed live here regardless of authoring,
  // since the target is only known in this loop; only color/lineWidth come
  // from 'void_tether_beam' when it exists. See animdata.js's FRAME SHAPE
  // comment for why this doesn't use the entity/Animator.draw() model every
  // other dissected animation in this game uses.
  if (player.tether) {
    const bx = player.x + player.width / 2, by = player.y + player.height / 2;
    let tx, ty;
    if (player.tether.targetEnemy) { tx = player.tether.targetEnemy.x + player.tether.targetEnemy.width / 2; ty = player.tether.targetEnemy.y + player.tether.targetEnemy.height / 2; }
    else { tx = player.tether.targetPoint.x + player.width / 2; ty = player.tether.targetPoint.y + player.height / 2; }
    const pulse = 0.7 + Math.sin(frameCount * 0.6) * 0.3;
    const styleDef = ANIM_DEFS['void_tether_beam'];
    let color, lineWidth;
    if (styleDef) {
      tetherBeamAnimator.play('void_tether_beam');
      tetherBeamAnimator.update();
      const styleFrame = tetherBeamAnimator.currentFrame();
      color = (styleFrame && styleFrame.color) || `rgba(52, 211, 153, ${0.8 * pulse})`;
      lineWidth = (styleFrame && styleFrame.lineWidth) ?? 2.5;
    } else {
      color = `rgba(52, 211, 153, ${0.8 * pulse})`;
      lineWidth = 2.5;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = `rgba(52, 211, 153, ${0.6 * pulse})`;
    ctx.beginPath();
    ctx.arc(tx, ty, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Echoes
  for (const echo of echoes) {
    echo.draw(ctx);
  }
  if (standEcho) standEcho.draw(ctx); // Phase Dash Lv4 Stand

  // Projectiles
  for (const proj of projectiles) {
    proj.draw(ctx);
  }

  // Afterimage Strike hazards — a growing/pulsing telegraph ring so the
  // "delayed explosive drop" reads as a real tell, not an ambush (see
  // update() above for the arm/explode logic).
  for (const h of afterimageHazards) {
    const frac = 1 - Math.max(0, h.timer) / (h.armDelay || 45);
    ctx.strokeStyle = `rgba(192, 132, 252, ${0.4 + 0.4 * frac})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.radius * (0.3 + 0.7 * frac), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Healing pickups (healing.js) — strike-open crystals + drifting motes
  drawHealingCrystals(ctx, area, frameCount);
  drawVitalityMotes(ctx);
  drawWeaponDrops(ctx); // companion.js — found-weapon pickups

  // The Child (companion.js) — drawn just before the player so she reads
  // as slightly behind them.
  if (child && companionState.active) child.draw(ctx);

  // Player
  player.draw(ctx);
  drawDashCooldownRing(ctx);

  // Boss
  if (boss) {
    boss.draw(ctx);
    boss.drawTelegraphs(ctx);
    drawBossProjectiles(ctx, bossProjectiles);
  }

  // Miniboss
  if (miniboss) {
    miniboss.draw(ctx);
  }

  ComposedEnemy.drawProjectiles(ctx);

  // Particles
  for (const p of particles) {
    p.draw(ctx);
  }

  // Ambient area particles
  for (const p of areaAmbient) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // Subtle vignette — darkens edges, focuses attention on the player
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // ── Stillpoint slow-world overlay ────────────────────────────────────────
  if (player.stillpointActive && abilityState.hasStillpoint) {
    // Cool blue edge frost
    ctx.fillStyle = 'rgba(103, 232, 249, 0.07)';
    ctx.fillRect(0, 0, W, H);
    const frostGrad = ctx.createRadialGradient(W/2, H/2, H*0.28, W/2, H/2, H*0.75);
    frostGrad.addColorStop(0, 'rgba(103, 232, 249, 0)');
    frostGrad.addColorStop(1, 'rgba(10, 40, 80, 0.28)');
    ctx.fillStyle = frostGrad;
    ctx.fillRect(0, 0, W, H);
    // Corner pillars
    const c = 'rgba(103, 232, 249, 0.14)';
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 5, H);
    ctx.fillRect(W - 5, 0, 5, H);
    ctx.fillRect(0, 0, W, 5);
    ctx.fillRect(0, H - 5, W, 5);
    // Label
    ctx.fillStyle = 'rgba(103, 232, 249, 0.6)';
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('STILLPOINT', W - 14, 26);
    ctx.textAlign = 'left';
  }

  // ── Fracture meter pips ───────────────────────────────────────────────────
  // Shown whenever the player has found at least one Fracture Pip, even
  // before Stillpoint itself is unlocked — otherwise a pip found early
  // (roadmap 1.9: The Fracture/The Vault) raises fractureMax with no visible
  // confirmation on the HUD at all (fixed 2026-07-14).
  if (player.fractureMax > 0 && HUD_LAYOUT.fracturePips.visible) {
    const fpLay = HUD_LAYOUT.fracturePips;
    const fpPos = hudResolve(fpLay);
    ctx.font = '9px "Courier New", monospace';
    ctx.fillStyle = 'rgba(103, 232, 249, 0.45)';
    ctx.fillText('FRACTURE', fpPos.x, fpPos.y);
    for (let i = 0; i < player.fractureMax; i++) {
      const px = fpPos.x + i * fpLay.gap;
      const py = fpPos.y + 10;
      const filled = i < player.fractureMeter;
      const isLastDraining = filled && i === player.fractureMeter - 1 && player.stillpointActive;
      ctx.save();
      ctx.translate(px + 7, py + 7);
      ctx.rotate(Math.PI / 4);
      if (filled) {
        const alpha = isLastDraining ? (player.stillpointTimer / Math.max(1, player.stillpointDuration)) * 0.9 + 0.1 : 1;
        ctx.fillStyle = player.stillpointActive ? `rgba(103, 232, 249, ${alpha})` : `rgba(196, 181, 253, ${alpha})`;
        ctx.fillRect(-6, -6, 12, 12);
      }
      ctx.strokeStyle = filled ? (player.stillpointActive ? '#67e8f9' : '#c4b5fd') : '#3a3a5e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-6, -6, 12, 12);
      ctx.restore();
    }
  }

  // ── HUD: health, ability icons, area name, boss bar, controls hint ───────
  // Suppressed during cutscenes (letterbox + text own the screen edges).
  if (gameState !== 'cutscene') drawHUD(ctx);

  // Cutscene letterbox/text/skip overlay (cutscene.js)
  if (gameState === 'cutscene') drawCutsceneOverlay(ctx);

  // Transition overlay
  if (transitioning && transitionAlpha > 0) {
    ctx.fillStyle = `rgba(10, 10, 15, ${transitionAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Ability notifications
  for (let i = 0; i < abilityState.notifications.length; i++) {
    const n = abilityState.notifications[i];
    const alpha = Math.min(1, n.timer / 30);
    const offsetY = i * 25;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#67e8f9';
    ctx.font = '14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(n.text, W / 2, 100 + offsetY);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // Game over screen
  if (gameState === 'gameover') {
    ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#f87171';
    ctx.font = '48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TIME COLLAPSED', W / 2, H / 2 - 80);

    // Menu items
    const gameOverItems = [
      { label: 'R  Respawn', action: () => respawnPlayer() },
      { label: 'ESC  Quit to Menu', action: () => { init(); } },
    ];

    const itemGap = 28;
    let iy = H / 2 - 20;
    for (let i = 0; i < gameOverItems.length; i++) {
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = '#e0d7ff';
      ctx.fillText(gameOverItems[i].label, W / 2, iy);
      iy += itemGap;
    }

    // Controls reminder
    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = '#3a3a5e';
    ctx.fillText('← → / A D: Move | ↑ / Space: Jump | X: Dash', W / 2, iy + 10);
    ctx.fillText('Z / J: Attack', W / 2, iy + 28);
    if (abilityState.hasPhaseDash || abilityState.hasShardShot) {
      const abilities = [];
      if (abilityState.hasPhaseDash) abilities.push('C: Phase Dash');
      if (abilityState.hasShardShot) abilities.push('V (hold): Aim Shard Shot | ↑/↓: Tilt');
      ctx.fillText(abilities.join('  |  '), W / 2, iy + 46);
    }

    ctx.textAlign = 'left';
  }

  // ── Pause menu overlay (Phase 0.5) ──────────────────────────────────────
  if (gameState === 'paused') {
    // Dim background
    ctx.fillStyle = 'rgba(10, 10, 15, 0.75)';
    ctx.fillRect(0, 0, W, H);

    const menuItems = pauseMenuItems;

    // Panel background
    const panelW = 300;
    const panelH = menuItems.length * 40 + 50;
    const px = W / 2 - panelW / 2;
    const py = H / 2 - panelH / 2;

    ctx.fillStyle = 'rgba(10, 10, 18, 0.92)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, panelW, panelH);

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillText('PAUSED', W / 2, py + 32);

    // Menu items
    ctx.font = '13px "Courier New", monospace';
    for (let i = 0; i < menuItems.length; i++) {
      const my = py + 54 + i * 40;
      const isHover = i === pauseMenuIndex;

      if (menuItems[i].disabled) {
        ctx.fillStyle = '#3a3a5e';
      } else if (isHover) {
        // Highlight bar
        ctx.fillStyle = 'rgba(196, 181, 253, 0.12)';
        ctx.fillRect(px + 12, my - 14, panelW - 24, 24);
        ctx.fillStyle = '#e0d7ff';
      } else {
        ctx.fillStyle = '#8a8aae';
      }

      // Arrow indicator on hover
      if (isHover && !menuItems[i].disabled) {
        ctx.fillStyle = '#c4b5fd';
        ctx.fillText('▸', W / 2 - (ctx.measureText(menuItems[i].label).width / 2) - 14, my);
      }

      ctx.fillText(menuItems[i].label, W / 2, my);
    }

    // Footer hint
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = '#4a4a6e';
    ctx.fillText('↑↓ Navigate  ·  ENTER Select  ·  ESC Resume', W / 2, py + panelH - 14);

    ctx.textAlign = 'left';
  }

  // ── Pause menu "Settings" sub-screen ─────────────────────────────────────
  if (gameState === 'paused_settings') {
    ctx.fillStyle = 'rgba(10, 10, 15, 0.75)';
    ctx.fillRect(0, 0, W, H);

    const items = getPausedSettingsItems();
    const panelW = 340;
    const panelH = items.length * 36 + 50;
    const px = W / 2 - panelW / 2;
    const py = H / 2 - panelH / 2;

    ctx.fillStyle = 'rgba(10, 10, 18, 0.92)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, panelW, panelH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText('SETTINGS', W / 2, py + 30);

    ctx.font = '13px "Courier New", monospace';
    for (let i = 0; i < items.length; i++) {
      const my = py + 52 + i * 36;
      const isHover = i === pausedSettingsIndex;

      if (isHover) {
        ctx.fillStyle = 'rgba(196, 181, 253, 0.12)';
        ctx.fillRect(px + 12, my - 14, panelW - 24, 24);
        ctx.fillStyle = '#e0d7ff';
      } else {
        ctx.fillStyle = '#8a8aae';
      }

      if (isHover) {
        ctx.fillStyle = '#c4b5fd';
        ctx.fillText('▸', W / 2 - (ctx.measureText(items[i].label).width / 2) - 14, my);
        ctx.fillStyle = '#e0d7ff';
      }

      ctx.fillText(items[i].label, W / 2, my);
    }

    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = '#4a4a6e';
    ctx.fillText('↑↓ Navigate  ·  ← → Adjust  ·  ENTER Select  ·  ESC Back', W / 2, py + panelH - 14);

    // Transient feedback (e.g. "Save copied to clipboard!")
    if (pauseMenuMessage) {
      ctx.font = '11px "Courier New", monospace';
      ctx.fillStyle = `rgba(134, 239, 172, ${Math.min(1, pauseMenuMessage.timer / 30)})`;
      ctx.fillText(pauseMenuMessage.text, W / 2, py + panelH + 16);
    }

    ctx.textAlign = 'left';
  }

  // ── Inventory screen (2026-08-01 multi-page redesign) ────────────────────
  // Drawing moved to inventory_ui.js's drawInventoryScreen() — see
  // Plans/inventory_redesign.md. Kept as a one-line dispatch here so this
  // file doesn't also own 4 pages' worth of canvas drawing.
  if (gameState === 'inventory') {
    drawInventoryScreen(ctx);
  }

  // Victory screen
  if (gameState === 'victory') {
    const progress = 1 - Math.min(1, victoryTimer / 180);
    ctx.fillStyle = `rgba(10, 10, 15, ${Math.min(0.7, progress * 0.8)})`;
    ctx.fillRect(0, 0, W, H);

    if (victoryTimer <= 0) {
      // Collapse/Loop branch (story.md §5's Absorb/Spare choice, now
      // attached to the Antechamber Child fight — see cutscene.js's
      // 'antechamber_child_ending' and game_update.js's miniboss-death
      // branch for antechamber_child). storyFlags.antechamber_ending is
      // only ever set if that fight happened at all — a playthrough that
      // never lost the child skips it entirely and keeps the original
      // ending text below, per story.md's own note.
      const ending = (typeof storyFlags !== 'undefined') ? storyFlags.antechamber_ending : undefined;
      ctx.font = 'bold 32px "Courier New", monospace';
      ctx.textAlign = 'center';
      if (ending === 'collapse') {
        ctx.fillStyle = '#f87171';
        ctx.fillText('THE COLLAPSE', W / 2, H / 2 - 40);
        ctx.font = '14px "Courier New", monospace';
        ctx.fillStyle = '#e0d4ff';
        ctx.fillText('You took everything the Fracture had left to give. The world ends with you.', W / 2, H / 2);
      } else if (ending === 'loop') {
        ctx.fillStyle = '#c4b5fd';
        ctx.fillText('THE LOOP', W / 2, H / 2 - 40);
        ctx.font = '14px "Courier New", monospace';
        ctx.fillStyle = '#e0d4ff';
        ctx.fillText('You let her go. You will not remember this. She will.', W / 2, H / 2);
      } else {
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('STILLPOINT RESTORED', W / 2, H / 2 - 40);
        ctx.font = '14px "Courier New", monospace';
        ctx.fillStyle = '#e0d4ff';
        ctx.fillText('The Fracture has been healed.', W / 2, H / 2);
      }

      ctx.font = '12px "Courier New", monospace';
      ctx.fillStyle = '#6a6a8e';
      ctx.fillText('Press R to return to the Core', W / 2, H / 2 + 40);
    }
    ctx.textAlign = 'left';
  }

  // Ability flash overlay
  if (abilityFlash > 0) {
    const flashAlpha = (abilityFlash / 12) * 0.25;
    ctx.fillStyle = abilityFlashColor.replace(')', `, ${flashAlpha})`).replace('rgb', 'rgba');
    // Fallback for hex colors
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = abilityFlashColor;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // Death/respawn fade overlay (cap opacity during gameover so text is visible)
  if (deathFadeAlpha > 0) {
    const fadeAlpha = gameState === 'gameover' ? Math.min(deathFadeAlpha, 0.6) : deathFadeAlpha;
    ctx.globalAlpha = fadeAlpha;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // Ability popups (floating text, screen space)
  ctx.textAlign = 'center';
  for (const pop of abilityPopups) {
    const alpha = Math.min(1, pop.life / 30);
    const screenX = (pop.x - camera.x) * camera.zoom;
    const screenY = (pop.y - camera.y) * camera.zoom;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText(pop.text, screenX + 1, screenY + 1);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, screenX, screenY);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';

  // Lore reading overlay
  if (loreOverlay) {
    const fadeIn = loreOverlay.maxTimer - loreOverlay.timer;
    const alpha = fadeIn < 20 ? fadeIn / 20 : Math.min(1, loreOverlay.timer / 40);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
    ctx.fillRect(W / 2 - 230, H - 116, 460, 76);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(W / 2 - 230, H - 116, 460, 76);
    ctx.fillStyle = '#fde68a';
    ctx.font = 'italic 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    wrapText(ctx, loreOverlay.text, W / 2, H - 96, 420, 15);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // Lore pip placeholder visual effect (roadmap 1.9) — non-disruptive,
  // player keeps moving. A brief screen-edge amber vignette pulse; swap for
  // real per-fragment cutscenes once roadmap 1.10 decides content.
  if (lorePipEffect) {
    const fadeIn = lorePipEffect.maxTimer - lorePipEffect.timer;
    const alpha = (fadeIn < 15 ? fadeIn / 15 : Math.min(1, lorePipEffect.timer / 30)) * 0.35;
    const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
    grad.addColorStop(0, 'rgba(251, 191, 36, 0)');
    grad.addColorStop(1, `rgba(251, 191, 36, ${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // Full-screen map overlay
  if (mapOpen) {
    drawMap(ctx, currentAreaId, discoveredAreas, anchorActivated);
  }

  // Controls screen reached from the pause menu (Controls item) — reuses
  // the exact same menu-styled screen the main menu uses, opaque background
  // and all, so it looks identical regardless of entry point.
  if (gameState === 'paused_controls') {
    drawControlsScreen();
  }
}

// Wrap and draw multi-line centered text (used for lore overlay)
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, yy);
      line = w + ' ';
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, yy);
}

// Main loop — fixed-timestep accumulator (60 Hz simulation, decoupled from display refresh)
const FIXED_DT = 1000 / 60; // ms per simulation tick — matches all existing "N frames" tuning
const MAX_ACCUMULATOR = 250; // cap elapsed to avoid spiral-of-death after tab throttle
const MAX_TICKS_PER_FRAME = 5; // second safety net

let lastTime = performance.now();
let accumulator = 0;

// rAF doesn't fire while a tab is hidden, so `now - lastTime` on the first
// callback after switching back can be seconds long. MAX_ACCUMULATOR only
// caps how much of that gets added in ONE call (250ms) — the leftover
// still drains at up to MAX_TICKS_PER_FRAME ticks every subsequent
// rendered frame until it's gone, which compresses a few hundred
// milliseconds of game logic into a handful of real frames right after
// refocusing (user report 2026-07-20: "leave a tab open and come back the
// game is super sped up"). Discarding the backlog outright on
// visibilitychange, instead of trying to catch it up, is the standard fix
// — the game just resumes from where it was with no burst at all.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    lastTime = performance.now();
    accumulator = 0;
  }
});

function gameLoop(now) {
  const elapsed = Math.min(now - lastTime, MAX_ACCUMULATOR);
  lastTime = now;
  accumulator += elapsed;

  let ticks = 0;
  while (accumulator >= FIXED_DT && ticks < MAX_TICKS_PER_FRAME) {
    update();
    accumulator -= FIXED_DT;
    ticks++;
  }

  draw();
  requestAnimationFrame(gameLoop);
}

// ── Entry point ─────────────────────────────────────────────────────────

init();
applyDevSpawnOverride(); // no-op unless ?spawnRoom=<id> is in the URL
requestAnimationFrame(gameLoop);