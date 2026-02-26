// ============================================================
// UIScene.js - HUD + 크래프팅 UI + 레벨업
// ============================================================
import {
  GAME_WIDTH, GAME_HEIGHT,
  BASE_SPELLS, MODIFIERS, ENEMY_TYPES
} from '../config.js';
import { computeParams } from '../systems/SpellSystem.js';

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

    // 지팡이 미니 슬롯 (HUD 하단)
    this.slotEls = [];

    // 보스 HP
    this.bossHpBg  = this._rect(GAME_WIDTH / 2, GAME_HEIGHT - 30, 360, 8, 0x222, 0.8, 100).setVisible(false);
    this.bossHpBar = this._rect(GAME_WIDTH / 2, GAME_HEIGHT - 30, 360, 8, 0xff2222, 0.9, 101).setVisible(false);
    this.bossTxt   = this._txt(GAME_WIDTH / 2, GAME_HEIGHT - 42, '', 10, '#ff4444', 102).setVisible(false);

    // 오버레이 배열
    this._luEls = [];     // 레벨업 UI
    this._crEls = [];     // 크래프팅 UI
    this._crSelected = null; // 크래프팅 선택 중인 인벤토리 인덱스
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

      // 지팡이 이름
      const nm = this.add.text(14, baseY, `${wand.name}:`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#888'
      }).setDepth(102);
      this.slotEls.push(nm);

      // 슬롯 아이콘
      wand.slots.forEach((slot, si) => {
        const sx = 100 + si * 22;
        let icon = '·';
        let color = '#444';
        if (slot) {
          if (slot.type === 'modifier') { icon = MODIFIERS[slot.id]?.icon || '?'; color = '#aaccff'; }
          else { icon = BASE_SPELLS[slot.id]?.icon || '?'; color = '#fff'; }
        }
        const t = this.add.text(sx, baseY, icon, { fontSize: '13px', color }).setOrigin(0.5, 0).setDepth(102);
        this.slotEls.push(t);
      });

      // 리차지 표시
      if (wand.isRecharging) {
        const rc = this.add.text(100 + wand.slotCount * 22 + 5, baseY, '♻️', {
          fontSize: '10px'
        }).setDepth(102);
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
  // 크래프팅 UI (TAB)
  // ════════════════════════════════════════════
  showCrafting(game) {
    this._clearCR();
    this._crSelected = null;

    // 딤 배경
    const dim = this._rect(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65, 200);
    dim.setInteractive(); // 뒤 클릭 방지
    this._crEls.push(dim);

    // 타이틀
    this._crEls.push(this._txt(GAME_WIDTH / 2, 30, '⚔️ 지팡이 편집', 22, '#fff', 201));
    this._crEls.push(this._txt(GAME_WIDTH / 2, 55, 'TAB으로 닫기  |  슬롯에 아이템을 배치하세요', 11, '#888', 201));

    // ── 지팡이 영역 ──
    let wy = 90;
    game.wands.forEach((wand, wi) => {
      this._crEls.push(this._txt(60, wy, `${wand.name}`, 13, '#aaa', 201).setOrigin(0, 0.5));
      this._crEls.push(this._txt(200, wy, `⏱${wand.castDelay}ms  ♻️${wand.rechargeTime}ms`, 10, '#666', 201).setOrigin(0, 0.5));

      wy += 22;

      // 슬롯
      wand.slots.forEach((slot, si) => {
        const sx = 60 + si * 60;
        // 슬롯 배경
        const bg = this._rect(sx, wy, 50, 50, 0x1a1a33, 0.9, 201);
        bg.setStrokeStyle(1.5, slot ? (slot.type === 'modifier' ? 0x5588cc : 0xcc8844) : 0x333366);
        bg.setInteractive({ useHandCursor: true });
        this._crEls.push(bg);

        if (slot) {
          const info = slot.type === 'modifier' ? MODIFIERS[slot.id] : BASE_SPELLS[slot.id];
          const icon = this._txt(sx, wy - 5, info?.icon || '?', 20, '#fff', 202);
          const label = this._txt(sx, wy + 18, info?.name?.slice(0, 4) || '', 8, '#aaa', 202);
          this._crEls.push(icon, label);

          // 클릭: 슬롯 → 인벤토리로 회수
          bg.on('pointerdown', () => {
            game.removeSlotItem(wi, si);
            this.showCrafting(game); // 리프레시
          });
        } else {
          const dot = this._txt(sx, wy, '·', 16, '#444', 202);
          this._crEls.push(dot);

          // 클릭: 인벤토리 선택 아이템 배치
          bg.on('pointerdown', () => {
            if (this._crSelected !== null) {
              game.placeItem(wi, si, this._crSelected);
              this._crSelected = null;
              this.showCrafting(game);
            }
          });
        }

        // 호버
        bg.on('pointerover', () => bg.setStrokeStyle(2, 0xffffff));
        bg.on('pointerout', () => {
          bg.setStrokeStyle(1.5, slot ? (slot.type === 'modifier' ? 0x5588cc : 0xcc8844) : 0x333366);
        });
      });

      // 실행 순서 미리보기
      wy += 32;
      this._crEls.push(this._txt(60, wy, `실행: ${wand.preview()}`, 10, '#ffdd44', 201).setOrigin(0, 0.5));

      wy += 30;
    });

    // ── 인벤토리 영역 ──
    const invY = Math.max(wy + 20, 320);
    this._crEls.push(this._rect(GAME_WIDTH / 2, invY - 10, GAME_WIDTH - 60, 1, 0x333366, 0.5, 201));
    this._crEls.push(this._txt(60, invY + 5, `📦 인벤토리 (${game.inventory.length})`, 13, '#aaa', 201).setOrigin(0, 0.5));

    const cols = 8;
    game.inventory.forEach((item, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const ix = 80 + col * 60;
      const iy = invY + 30 + row * 60;

      const isSelected = this._crSelected === idx;
      const info = item.type === 'modifier' ? MODIFIERS[item.id] : BASE_SPELLS[item.id];
      const borderColor = isSelected ? 0xffffff : (item.type === 'modifier' ? 0x5588cc : 0xcc8844);

      const bg = this._rect(ix, iy, 50, 50, isSelected ? 0x2a2a55 : 0x1a1a33, 0.9, 201);
      bg.setStrokeStyle(isSelected ? 2.5 : 1.5, borderColor);
      bg.setInteractive({ useHandCursor: true });
      this._crEls.push(bg);

      const icon = this._txt(ix, iy - 5, info?.icon || '?', 20, '#fff', 202);
      const label = this._txt(ix, iy + 18, info?.name?.slice(0, 4) || '', 8, '#aaa', 202);
      this._crEls.push(icon, label);

      bg.on('pointerdown', () => {
        this._crSelected = isSelected ? null : idx;
        this.showCrafting(game); // 리프레시
      });

      bg.on('pointerover', () => bg.setStrokeStyle(2, 0xffffff));
      bg.on('pointerout', () => bg.setStrokeStyle(isSelected ? 2.5 : 1.5, borderColor));
    });

    // ── 선택 아이템 정보 ──
    if (this._crSelected !== null && game.inventory[this._crSelected]) {
      const sel = game.inventory[this._crSelected];
      const info = sel.type === 'modifier' ? MODIFIERS[sel.id] : BASE_SPELLS[sel.id];
      const infoY = invY + 30 + Math.ceil(game.inventory.length / cols) * 60 + 10;

      const badge = sel.type === 'modifier' ? '[모디파이어]' : '[주문]';
      this._crEls.push(this._txt(GAME_WIDTH / 2, infoY, `${info?.icon} ${info?.name}  ${badge}`, 14, '#fff', 201));
      this._crEls.push(this._txt(GAME_WIDTH / 2, infoY + 20, info?.desc || '', 11, '#aaa', 201));
      this._crEls.push(this._txt(GAME_WIDTH / 2, infoY + 38, '↑ 위의 빈 슬롯을 클릭하여 배치', 10, '#ffdd44', 201));
    }
  }

  hideCrafting() {
    this._clearCR();
    this._crSelected = null;
  }

  _clearCR() {
    this._crEls.forEach(e => e.destroy());
    this._crEls = [];
  }

  // ════════════════════════════════════════════
  // 레벨업 선택 UI
  // ════════════════════════════════════════════
  showLevelUp(choices, game) {
    this._clearLU();
    const dim = this._rect(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55, 200);
    this._luEls.push(dim);

    this._luEls.push(this._txt(GAME_WIDTH / 2, 100, `⬆️ 레벨 ${game.playerLevel}!`, 28, '#ffff44', 201));
    this._luEls.push(this._txt(GAME_WIDTH / 2, 132, '인벤토리에 추가할 아이템을 선택하세요', 12, '#999', 201));

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

      // 타입 뱃지
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
