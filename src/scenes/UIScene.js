// ============================================================
// UIScene.js - HUD + 드래그 앤 드롭 크래프팅 UI + 레벨업
// ============================================================
import {
  GAME_WIDTH, GAME_HEIGHT,
  BASE_SPELLS, MODIFIERS, ENEMY_TYPES
} from '../config.js';

export class UIScene extends Phaser.Scene {
  constructor() { super('UIScene'); }

  create() {
    // ── HUD 요소 ──
    this.hpBg  = this._rect(GAME_WIDTH / 2, 26, 280, 16, 0x222222, 0.8, 100);
    this.hpBar = this._rect(GAME_WIDTH / 2, 26, 280, 16, 0xff4444, 0.9, 101);
    this.hpTxt = this._txt(GAME_WIDTH / 2, 26, '', 10, '#fff', 102);
    this.xpBg  = this._rect(GAME_WIDTH / 2, 46, 280, 6, 0x222222, 0.8, 100);
    this.xpBar = this._rect(GAME_WIDTH / 2 - 140, 46, 0, 6, 0x44ffaa, 0.9, 101).setOrigin(0, 0.5);
    this.lvlTxt  = this._txt(GAME_WIDTH / 2 - 150, 26, 'Lv.1', 13, '#ffff44', 102).setOrigin(1, 0.5);
    this.timeTxt = this._txt(GAME_WIDTH / 2, 62, '00:00', 14, '#ddd', 102);
    this.killTxt = this._txt(GAME_WIDTH - 14, 14, '처치: 0', 12, '#ff8888', 102).setOrigin(1, 0);
    this.waveTxt = this._txt(14, 14, 'Wave 1', 12, '#88aaff', 102).setOrigin(0, 0);
    this.hintTxt = this._txt(GAME_WIDTH / 2, GAME_HEIGHT - 10, 'TAB: 지팡이 편집', 10, '#555', 102);

    this.slotEls = [];

    // 보스 HP
    this.bossHpBg  = this._rect(GAME_WIDTH / 2, GAME_HEIGHT - 30, 360, 8, 0x222, 0.8, 100).setVisible(false);
    this.bossHpBar = this._rect(GAME_WIDTH / 2, GAME_HEIGHT - 30, 360, 8, 0xff2222, 0.9, 101).setVisible(false);
    this.bossTxt   = this._txt(GAME_WIDTH / 2, GAME_HEIGHT - 42, '', 10, '#ff4444', 102).setVisible(false);

    // 오버레이 배열
    this._luEls = [];
    this._crEls = [];

    // ── 드래그 상태 ──
    this._dragGhost = null;       // 드래그 중 표시되는 고스트 아이콘
    this._dragSource = null;      // { from: 'inv'|'slot', invIdx?, wandIdx?, slotIdx?, item }
    this._dropTargets = [];       // 드롭 가능 영역 배열
    this._gameRef = null;         // 크래프팅 중 GameScene 참조
    this._dragListenersActive = false;
  }

  // ── 매 프레임 HUD 갱신 ──
  refresh(game) {
    const hr = game.playerHP / game.playerMaxHP;
    this.hpBar.width = 280 * hr;
    this.hpBar.x = GAME_WIDTH / 2 - (280 - this.hpBar.width) / 2;
    this.hpTxt.setText(`${Math.ceil(game.playerHP)}/${game.playerMaxHP}`);
    this.hpBar.setFillStyle(hr > 0.5 ? 0xff4444 : hr > 0.25 ? 0xff8844 : 0xff2222);

    this.xpBar.width = 280 * (game.playerXP / game.xpToNext);
    this.lvlTxt.setText(`Lv.${game.playerLevel}`);

    const t = game.enemySystem.elapsed;
    this.timeTxt.setText(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`);
    this.killTxt.setText(`처치: ${game.killCount}`);
    this.waveTxt.setText(`Wave ${game.enemySystem.currentWave + 1}`);

    this._refreshSlotsMini(game);
    this._refreshBoss(game);
  }

  _refreshSlotsMini(game) {
    this.slotEls.forEach(e => e.destroy());
    this.slotEls = [];
    game.wands.forEach((wand, wi) => {
      const baseY = GAME_HEIGHT - 82 + wi * 30;
      const nm = this.add.text(14, baseY, `${wand.name}:`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#888'
      }).setDepth(102);
      this.slotEls.push(nm);
      wand.slots.forEach((slot, si) => {
        const sx = 100 + si * 22;
        let icon = '·', color = '#444';
        if (slot) {
          if (slot.type === 'modifier') { icon = MODIFIERS[slot.id]?.icon || '?'; color = '#aaccff'; }
          else { icon = BASE_SPELLS[slot.id]?.icon || '?'; color = '#fff'; }
        }
        const t = this.add.text(sx, baseY, icon, { fontSize: '13px', color }).setOrigin(0.5, 0).setDepth(102);
        this.slotEls.push(t);
      });
      if (wand.isRecharging) {
        const rc = this.add.text(100 + wand.slotCount * 22 + 5, baseY, '♻️', { fontSize: '10px' }).setDepth(102);
        this.slotEls.push(rc);
      }
    });
  }

  _refreshBoss(game) {
    const boss = game.enemies.getChildren().find(e => e.active && e.boss);
    if (boss) {
      this.bossHpBg.setVisible(true); this.bossHpBar.setVisible(true); this.bossTxt.setVisible(true);
      this.bossTxt.setText(ENEMY_TYPES[boss.eType]?.name || 'BOSS');
      const r = boss.hp / boss.maxHp;
      this.bossHpBar.width = 360 * r;
      this.bossHpBar.x = GAME_WIDTH / 2 - (360 - this.bossHpBar.width) / 2;
    } else {
      this.bossHpBg.setVisible(false); this.bossHpBar.setVisible(false); this.bossTxt.setVisible(false);
    }
  }

  // ════════════════════════════════════════════
  // 크래프팅 UI — 드래그 앤 드롭
  // ════════════════════════════════════════════
  showCrafting(game) {
    this._clearCR();
    this._gameRef = game;
    this._dragSource = null;
    this._dropTargets = [];
    if (this._dragGhost) { this._dragGhost.destroy(); this._dragGhost = null; }

    // 딤 배경
    const dim = this._rect(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7, 200);
    dim.setInteractive();
    this._crEls.push(dim);

    // 타이틀
    this._crEls.push(this._txt(GAME_WIDTH / 2, 28, '⚔️ 지팡이 편집', 22, '#fff', 201));
    this._crEls.push(this._txt(GAME_WIDTH / 2, 53, '아이템을 드래그하여 슬롯에 배치  |  TAB으로 닫기', 11, '#888', 201));

    // ── 지팡이 영역 ──
    let wy = 82;
    game.wands.forEach((wand, wi) => {
      // 지팡이 제목
      this._crEls.push(this._txt(60, wy, `${wand.name}`, 13, '#aaa', 201).setOrigin(0, 0.5));
      this._crEls.push(this._txt(220, wy, `캐스트 ⏱${wand.castDelay}ms   리차지 ♻️${wand.rechargeTime}ms`, 9, '#666', 201).setOrigin(0, 0.5));
      wy += 24;

      // 슬롯 칸들
      const slotSize = 52;
      const slotGap = 6;
      wand.slots.forEach((slot, si) => {
        const sx = 60 + si * (slotSize + slotGap);

        // 슬롯 배경 (드롭 타겟)
        const borderColor = slot
          ? (slot.type === 'modifier' ? 0x5588cc : 0xcc8844)
          : 0x2a2a55;
        const bg = this._rect(sx, wy, slotSize, slotSize, 0x111128, 0.95, 201);
        bg.setStrokeStyle(1.5, borderColor);
        this._crEls.push(bg);

        // 순서 번호
        this._crEls.push(this._txt(sx - slotSize / 2 + 7, wy - slotSize / 2 + 7, `${si + 1}`, 8, '#333', 202).setOrigin(0.5));

        // 드롭 타겟 등록
        this._dropTargets.push({
          type: 'slot', wandIdx: wi, slotIdx: si,
          x: sx, y: wy, w: slotSize, h: slotSize, bg
        });

        if (slot) {
          const info = slot.type === 'modifier' ? MODIFIERS[slot.id] : BASE_SPELLS[slot.id];
          const icon = this._txt(sx, wy - 4, info?.icon || '?', 22, '#fff', 203);
          const label = this._txt(sx, wy + 18, info?.name?.slice(0, 5) || '', 8, '#aaa', 203);
          this._crEls.push(icon, label);

          // 드래그 가능하게
          this._makeDraggable(bg, {
            from: 'slot', wandIdx: wi, slotIdx: si,
            item: slot, icon: info?.icon || '?', color: borderColor
          });
        } else {
          this._crEls.push(this._txt(sx, wy, '·', 18, '#333', 202));
        }
      });

      // 실행 미리보기
      wy += slotSize / 2 + 6;
      const preview = wand.preview();
      this._crEls.push(this._txt(60, wy, `▶ ${preview}`, 10, '#ffdd44', 201).setOrigin(0, 0.5));
      wy += 28;
    });

    // ── 구분선 ──
    const sepY = Math.max(wy + 8, 290);
    this._crEls.push(this._rect(GAME_WIDTH / 2, sepY, GAME_WIDTH - 80, 1, 0x333366, 0.6, 201));

    // ── 인벤토리 영역 ──
    const invLabelY = sepY + 16;
    this._crEls.push(this._txt(60, invLabelY, `📦 인벤토리 (${game.inventory.length}/${16})`, 13, '#aaa', 201).setOrigin(0, 0.5));
    this._crEls.push(this._txt(GAME_WIDTH - 60, invLabelY, '드래그하여 슬롯에 배치', 9, '#555', 201).setOrigin(1, 0.5));

    // 인벤토리 아이템 그리드
    const cols = 8;
    const itemSize = 52;
    const itemGap = 6;
    const invStartY = invLabelY + 22;

    // 인벤토리 영역 배경 (드롭 타겟: 슬롯→인벤토리 회수용)
    const invRows = Math.max(Math.ceil(game.inventory.length / cols), 2);
    const invAreaH = invRows * (itemSize + itemGap) + 10;
    const invAreaBg = this._rect(GAME_WIDTH / 2, invStartY + invAreaH / 2, GAME_WIDTH - 60, invAreaH, 0x0a0a18, 0.5, 200);
    invAreaBg.setStrokeStyle(1, 0x222244, 0.3);
    this._crEls.push(invAreaBg);
    this._dropTargets.push({
      type: 'inventory',
      x: GAME_WIDTH / 2, y: invStartY + invAreaH / 2,
      w: GAME_WIDTH - 60, h: invAreaH, bg: invAreaBg
    });

    game.inventory.forEach((item, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const ix = 60 + col * (itemSize + itemGap);
      const iy = invStartY + row * (itemSize + itemGap) + itemSize / 2;

      const info = item.type === 'modifier' ? MODIFIERS[item.id] : BASE_SPELLS[item.id];
      const borderColor = item.type === 'modifier' ? 0x5588cc : 0xcc8844;

      const bg = this._rect(ix, iy, itemSize, itemSize, 0x111128, 0.95, 201);
      bg.setStrokeStyle(1.5, borderColor);
      this._crEls.push(bg);

      const icon = this._txt(ix, iy - 4, info?.icon || '?', 22, '#fff', 203);
      const label = this._txt(ix, iy + 18, info?.name?.slice(0, 5) || '', 8, '#aaa', 203);
      this._crEls.push(icon, label);

      // 드래그 가능하게
      this._makeDraggable(bg, {
        from: 'inv', invIdx: idx,
        item: item, icon: info?.icon || '?', color: borderColor
      });
    });

    // 빈 인벤토리 안내
    if (game.inventory.length === 0) {
      this._crEls.push(this._txt(GAME_WIDTH / 2, invStartY + 30, '인벤토리가 비어 있습니다', 12, '#444', 201));
      this._crEls.push(this._txt(GAME_WIDTH / 2, invStartY + 50, '적을 처치하여 아이템을 획득하세요', 10, '#333', 201));
    }

    // ── 조합 영역 ──
    const fusionSepY = invStartY + invAreaH + 12;
    this._crEls.push(this._rect(GAME_WIDTH / 2, fusionSepY, GAME_WIDTH - 80, 1, 0x333366, 0.6, 201));

    const fusionLabelY = fusionSepY + 18;
    this._crEls.push(this._txt(60, fusionLabelY, '🔮 아이템 조합 (3개 → 1개)', 13, '#aaa', 201).setOrigin(0, 0.5));
    this._crEls.push(this._txt(GAME_WIDTH - 60, fusionLabelY, '같은 아이템 3개 = 다른 종류 확정', 9, '#555', 201).setOrigin(1, 0.5));

    const fusionSlotY = fusionLabelY + 36;
    const fusionGap = 6;

    game.fusionSlots.forEach((slot, fi) => {
      const fx = 60 + fi * (itemSize + fusionGap);
      const borderColor = slot ? 0xaa44ff : 0x2a2a55;
      const bg = this._rect(fx, fusionSlotY, itemSize, itemSize, 0x111128, 0.95, 201);
      bg.setStrokeStyle(1.5, borderColor);
      this._crEls.push(bg);

      this._dropTargets.push({
        type: 'fusion', fusionIdx: fi,
        x: fx, y: fusionSlotY, w: itemSize, h: itemSize, bg
      });

      if (slot) {
        const info = slot.type === 'modifier' ? MODIFIERS[slot.id] : BASE_SPELLS[slot.id];
        this._crEls.push(this._txt(fx, fusionSlotY - 4, info?.icon || '?', 22, '#fff', 203));
        this._crEls.push(this._txt(fx, fusionSlotY + 18, info?.name?.slice(0, 5) || '', 8, '#aaa', 203));
        this._makeDraggable(bg, {
          from: 'fusion', fusionIdx: fi,
          item: slot, icon: info?.icon || '?', color: 0xaa44ff
        });
      }
    });

    const arrowX = 60 + 3 * (itemSize + fusionGap);
    this._crEls.push(this._txt(arrowX, fusionSlotY, '→', 22, '#666', 201));

    const resultX = arrowX + 40;
    const resultBg = this._rect(resultX, fusionSlotY, itemSize, itemSize, 0x111128, 0.95, 201);
    resultBg.setStrokeStyle(1.5, 0x333355);
    this._crEls.push(resultBg);
    this._crEls.push(this._txt(resultX, fusionSlotY, '?', 24, '#444', 202));

    const allFusionFilled = game.fusionSlots.every(s => s !== null);
    const btnX = resultX + itemSize / 2 + 50;
    const btnColor = allFusionFilled ? 0x6644aa : 0x333333;
    const fusionBtn = this._rect(btnX, fusionSlotY, 80, 40, btnColor, 0.9, 201);
    fusionBtn.setStrokeStyle(1, allFusionFilled ? 0xaa88ff : 0x444444);
    this._crEls.push(fusionBtn);
    this._crEls.push(this._txt(btnX, fusionSlotY, '조합!', 14, allFusionFilled ? '#fff' : '#555', 202));

    if (allFusionFilled) {
      fusionBtn.setInteractive({ useHandCursor: true });
      fusionBtn.on('pointerover', () => { fusionBtn.setFillStyle(0x8855cc); fusionBtn.setStrokeStyle(2, 0xffffff); });
      fusionBtn.on('pointerout', () => { fusionBtn.setFillStyle(0x6644aa); fusionBtn.setStrokeStyle(1, 0xaa88ff); });
      fusionBtn.on('pointerdown', () => {
        const result = game.executeFusion();
        if (result) {
          if (game.inventory.length < 16) {
            game.inventory.push(result);
          }
          const info = result.type === 'modifier' ? MODIFIERS[result.id] : BASE_SPELLS[result.id];
          game.sfx?.fusion();
          const flash = this._rect(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xaa44ff, 0.3, 250);
          this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
        }
        this.showCrafting(game);
      });
    }

    // ── 툴팁 영역 ──
    this._tooltipEl = null;
  }

  /** 아이템에 드래그 기능 부착 */
  _makeDraggable(bg, sourceData) {
    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerdown', (pointer) => {
      this._dragSource = sourceData;

      // 고스트 생성
      if (this._dragGhost) this._dragGhost.destroy();
      this._dragGhost = this.add.text(pointer.x, pointer.y, sourceData.icon, {
        fontSize: '28px'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(400).setAlpha(0.85);

      // 드롭 타겟 하이라이트
      this._dropTargets.forEach(dt => {
        if (dt.type === 'slot' || dt.type === 'fusion') {
          dt.bg.setStrokeStyle(2, 0x44ff44, 0.6);
        } else if (dt.type === 'inventory' && (sourceData.from === 'slot' || sourceData.from === 'fusion')) {
          dt.bg.setStrokeStyle(2, 0x44ff44, 0.3);
        }
      });
    });

    bg.on('pointerover', () => {
      if (!this._dragSource) {
        bg.setStrokeStyle(2, 0xffffff);
        // 툴팁
        this._showTooltip(sourceData);
      }
    });
    bg.on('pointerout', () => {
      if (!this._dragSource) {
        const c = sourceData.item.type === 'modifier' ? 0x5588cc : 0xcc8844;
        bg.setStrokeStyle(1.5, c);
        this._hideTooltip();
      }
    });
  }

  /** 씬 생성 후 글로벌 포인터 이벤트 (showCrafting 호출 시 등록) */
  _setupDragListeners() {
    // 이미 등록되어있으면 스킵
    if (this._dragListenersActive) return;
    this._dragListenersActive = true;

    this.input.on('pointermove', (pointer) => {
      if (this._dragGhost && this._dragSource) {
        this._dragGhost.setPosition(pointer.x, pointer.y);

        // 드롭 타겟 호버 하이라이트
        this._dropTargets.forEach(dt => {
          const inTarget = this._isInRect(pointer.x, pointer.y, dt);
          if (dt.type === 'slot' || dt.type === 'fusion') {
            dt.bg.setStrokeStyle(2, inTarget ? 0xffffff : 0x44ff44, inTarget ? 1 : 0.6);
          }
        });
      }
    });

    this.input.on('pointerup', (pointer) => {
      if (!this._dragSource || !this._dragGhost) return;

      const source = this._dragSource;
      let dropped = false;

      // 어느 드롭 타겟 위에 놓았는지 확인
      for (const dt of this._dropTargets) {
        if (!this._isInRect(pointer.x, pointer.y, dt)) continue;

        if (dt.type === 'slot' && source.from === 'inv') {
          this._gameRef.placeItem(dt.wandIdx, dt.slotIdx, source.invIdx);
          dropped = true; break;
        }
        if (dt.type === 'slot' && source.from === 'slot') {
          this._swapSlots(source.wandIdx, source.slotIdx, dt.wandIdx, dt.slotIdx);
          dropped = true; break;
        }
        if (dt.type === 'inventory' && source.from === 'slot') {
          this._gameRef.removeSlotItem(source.wandIdx, source.slotIdx);
          dropped = true; break;
        }
        if (dt.type === 'fusion' && source.from === 'inv') {
          this._gameRef.placeFusionItem(dt.fusionIdx, source.invIdx);
          dropped = true; break;
        }
        if (dt.type === 'fusion' && source.from === 'fusion') {
          this._swapFusion(source.fusionIdx, dt.fusionIdx);
          dropped = true; break;
        }
        if (dt.type === 'inventory' && source.from === 'fusion') {
          this._gameRef.removeFusionItem(source.fusionIdx);
          dropped = true; break;
        }
      }

      // 정리
      this._dragGhost.destroy();
      this._dragGhost = null;
      this._dragSource = null;

      // UI 리프레시
      if (dropped && this._gameRef) {
        this.showCrafting(this._gameRef);
      } else {
        // 드롭 안 된 경우 하이라이트 리셋
        this._dropTargets.forEach(dt => {
          if (dt.type === 'slot') {
            const wand = this._gameRef.wands[dt.wandIdx];
            const slot = wand?.slots[dt.slotIdx];
            dt.bg.setStrokeStyle(1.5, slot
              ? (slot.type === 'modifier' ? 0x5588cc : 0xcc8844)
              : 0x2a2a55);
          } else if (dt.type === 'inventory') {
            dt.bg.setStrokeStyle(1, 0x222244, 0.3);
          } else if (dt.type === 'fusion') {
            const fSlot = this._gameRef?.fusionSlots[dt.fusionIdx];
            dt.bg.setStrokeStyle(1.5, fSlot ? 0xaa44ff : 0x2a2a55);
          }
        });
      }
    });
  }

  _swapSlots(fromWandIdx, fromSlotIdx, toWandIdx, toSlotIdx) {
    const game = this._gameRef;
    const fromWand = game.wands[fromWandIdx];
    const toWand = game.wands[toWandIdx];
    if (!fromWand || !toWand) return;

    const temp = fromWand.slots[fromSlotIdx];
    fromWand.slots[fromSlotIdx] = toWand.slots[toSlotIdx];
    toWand.slots[toSlotIdx] = temp;
    fromWand.reset();
    toWand.reset();
  }

  _swapFusion(fromIdx, toIdx) {
    const game = this._gameRef;
    const temp = game.fusionSlots[fromIdx];
    game.fusionSlots[fromIdx] = game.fusionSlots[toIdx];
    game.fusionSlots[toIdx] = temp;
  }

  _isInRect(px, py, dt) {
    return px >= dt.x - dt.w / 2 && px <= dt.x + dt.w / 2 &&
           py >= dt.y - dt.h / 2 && py <= dt.y + dt.h / 2;
  }

  // ── 툴팁 ──
  _showTooltip(sourceData) {
    this._hideTooltip();
    const item = sourceData.item;
    const info = item.type === 'modifier' ? MODIFIERS[item.id] : BASE_SPELLS[item.id];
    if (!info) return;

    const badge = item.type === 'modifier' ? '[모디파이어]' : '[주문]';
    const tipText = `${info.icon} ${info.name}  ${badge}\n${info.desc || ''}`;

    this._tooltipEl = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, tipText, {
      fontSize: '11px', fontFamily: 'monospace', color: '#ddd',
      backgroundColor: '#111128', padding: { x: 10, y: 6 },
      align: 'center', stroke: '#000', strokeThickness: 1
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
  }

  _hideTooltip() {
    if (this._tooltipEl) { this._tooltipEl.destroy(); this._tooltipEl = null; }
  }

  hideCrafting() {
    this._clearCR();
    this._dragSource = null;
    this._dropTargets = [];
    if (this._dragGhost) { this._dragGhost.destroy(); this._dragGhost = null; }
    this._hideTooltip();
  }

  _clearCR() {
    this._crEls.forEach(e => e.destroy());
    this._crEls = [];
  }

  // showCrafting을 호출할 때 드래그 리스너도 등록
  showCraftingFull(game) {
    this._setupDragListeners();
    this.showCrafting(game);
  }

  // ════════════════════════════════════════════
  // 레벨업 선택 UI
  // ════════════════════════════════════════════
  showLevelUp(choices, game) {
    this._clearLU();
    const dim = this._rect(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55, 200);
    this._luEls.push(dim);

    this._luEls.push(this._txt(GAME_WIDTH / 2, 100, `⬆️ 레벨 ${game.playerLevel}!`, 28, '#ffff44', 201));
    this._luEls.push(this._txt(GAME_WIDTH / 2, 132, '패시브를 선택하세요', 12, '#999', 201));

    const cw = 240, ch = 190, gap = 22;
    const total = choices.length * cw + (choices.length - 1) * gap;
    const sx = (GAME_WIDTH - total) / 2 + cw / 2;

    choices.forEach((c, i) => {
      const cx = sx + i * (cw + gap);
      const cy = GAME_HEIGHT / 2 + 10;

      const card = this._rect(cx, cy, cw, ch, 0x10102a, 0.95, 201);
      card.setStrokeStyle(2, c.color || 0x4488ff);
      card.setInteractive({ useHandCursor: true });
      this._luEls.push(card);

      const badges = { spell: '[주문]', modifier: '[모디파이어]', wand: '[지팡이]', passive: '[패시브]' };
      const bColors = { spell: '#88ff88', modifier: '#88ccff', wand: '#ffaa44', passive: '#ff8888' };
      this._luEls.push(this._txt(cx, cy - 65, badges[c.type] || '', 10, bColors[c.type] || '#aaa', 202));
      this._luEls.push(this._txt(cx, cy - 40, c.name, 15, '#fff', 202));

      const desc = this.add.text(cx, cy + 5, c.desc, {
        fontSize: '11px', fontFamily: 'monospace', color: '#bbb',
        wordWrap: { width: cw - 24 }, align: 'center', lineSpacing: 3
      }).setOrigin(0.5).setScrollFactor(0).setDepth(202);
      this._luEls.push(desc);

      if (c.type === 'spell' || c.type === 'modifier') {
        this._luEls.push(this._txt(cx, cy + 55, '→ 인벤토리에 추가됨', 9, '#ffdd44', 202));
      }

      card.on('pointerover', () => { card.setFillStyle(0x1a1a44); card.setStrokeStyle(3, 0xffffff); });
      card.on('pointerout', () => { card.setFillStyle(0x10102a, 0.95); card.setStrokeStyle(2, c.color || 0x4488ff); });
      card.on('pointerdown', () => { game.applyReward(c); this._clearLU(); });
    });
  }

  _clearLU() { this._luEls.forEach(e => e.destroy()); this._luEls = []; }

  // ════════════════════════════════════════════
  // 게임오버
  // ════════════════════════════════════════════
  showGameOver(time, kills, level, wands) {
    this._rect(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8, 300);
    this._txt(GAME_WIDTH / 2, 120, '💀 GAME OVER 💀', 38, '#ff4444', 301);

    const buildStr = wands.map(w => `${w.name}: ${w.describe()}`).join('\n');
    const stats = [`⏱️ 생존: ${time}`, `⚔️ 처치: ${kills}`, `📊 레벨: ${level}`, '', '── 최종 빌드 ──', buildStr];
    stats.forEach((s, i) => this._txt(GAME_WIDTH / 2, 200 + i * 26, s, 13, '#ccc', 301));

    const makeBtn = (y, label, color, cb) => {
      const bg = this._rect(GAME_WIDTH / 2, y, 200, 44, color, 0.8, 301);
      bg.setInteractive({ useHandCursor: true });
      this._txt(GAME_WIDTH / 2, y, label, 16, '#fff', 302);
      bg.on('pointerover', () => bg.setAlpha(1));
      bg.on('pointerout', () => bg.setAlpha(0.8));
      bg.on('pointerdown', cb);
    };
    makeBtn(460, '🔄 다시 시작', 0x3366cc, () => {
      this.scene.stop('GameScene'); this.scene.stop('UIScene'); this.scene.start('GameScene');
    });
    makeBtn(515, '🏠 메인 메뉴', 0x444444, () => {
      this.scene.stop('GameScene'); this.scene.stop('UIScene'); this.scene.start('MenuScene');
    });
  }

  // ── 유틸 ──
  _rect(x, y, w, h, color, alpha, depth) {
    return this.add.rectangle(x, y, w, h, color, alpha).setScrollFactor(0).setDepth(depth);
  }
  _txt(x, y, text, size, color, depth) {
    return this.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: 'monospace', color,
      stroke: '#000', strokeThickness: size > 12 ? 3 : 1
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth);
  }
}
