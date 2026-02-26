// ============================================================
// UIScene.js - HUD & 레벨업 선택 UI
// ============================================================
import {
  GAME_WIDTH, GAME_HEIGHT,
  BASE_SPELLS, MODIFIERS, ENEMY_TYPES
} from '../config.js';

export class UIScene extends Phaser.Scene {
  constructor() { super('UIScene'); }

  create() {
    // ── HP 바 ──
    this.hpBg  = this.add.rectangle(GAME_WIDTH / 2, 28, 300, 18, 0x333333, 0.8).setDepth(100);
    this.hpBar = this.add.rectangle(GAME_WIDTH / 2, 28, 300, 18, 0xff4444, 0.9).setDepth(101);
    this.hpTxt = this.add.text(GAME_WIDTH / 2, 28, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#fff'
    }).setOrigin(0.5).setDepth(102);

    // ── XP 바 ──
    this.xpBg  = this.add.rectangle(GAME_WIDTH / 2, 50, 300, 8, 0x333333, 0.8).setDepth(100);
    this.xpBar = this.add.rectangle(GAME_WIDTH / 2 - 150, 50, 0, 8, 0x44ff88, 0.9).setDepth(101).setOrigin(0, 0.5);

    // ── 레벨 ──
    this.lvlTxt = this.add.text(GAME_WIDTH / 2 - 158, 28, 'Lv.1', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffff44',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(1, 0.5).setDepth(102);

    // ── 타이머 ──
    this.timeTxt = this.add.text(GAME_WIDTH / 2, 68, '00:00', {
      fontSize: '16px', fontFamily: 'monospace', color: '#fff',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(102);

    // ── 킬 카운트 ──
    this.killTxt = this.add.text(GAME_WIDTH - 16, 16, '처치: 0', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ff8888',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(1, 0).setDepth(102);

    // ── 웨이브 ──
    this.waveTxt = this.add.text(16, 16, 'Wave 1', {
      fontSize: '13px', fontFamily: 'monospace', color: '#88aaff',
      stroke: '#000', strokeThickness: 2
    }).setDepth(102);

    // ── 주문 슬롯 UI (하단 왼쪽) ──
    this.slotElements = [];
    this.slotLabel = this.add.text(16, GAME_HEIGHT - 110, '주문 슬롯:', {
      fontSize: '11px', fontFamily: 'monospace', color: '#aaa'
    }).setDepth(102);

    // ── 보스 HP ──
    this.bossHpBg  = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 12, 400, 10, 0x333, 0.8).setDepth(100).setVisible(false);
    this.bossHpBar = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 12, 400, 10, 0xff2222, 0.9).setDepth(101).setVisible(false);
    this.bossTxt   = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 26, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#ff4444', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(102).setVisible(false);

    // 레벨업 UI 요소 배열
    this._luEls = [];
  }

  // ════════════════════════════════════════════
  // 매 프레임 갱신
  // ════════════════════════════════════════════
  refresh(game) {
    // HP
    const hpR = game.playerHP / game.playerMaxHP;
    this.hpBar.width = 300 * hpR;
    this.hpBar.x = GAME_WIDTH / 2 - (300 - this.hpBar.width) / 2;
    this.hpTxt.setText(`${Math.ceil(game.playerHP)} / ${game.playerMaxHP}`);
    this.hpBar.setFillStyle(hpR > 0.5 ? 0xff4444 : hpR > 0.25 ? 0xff8844 : 0xff2222);

    // XP
    const xpR = game.playerXP / game.xpToNext;
    this.xpBar.width = 300 * xpR;

    // 레벨
    this.lvlTxt.setText(`Lv.${game.playerLevel}`);

    // 타이머
    const t = game.enemySystem.elapsed;
    this.timeTxt.setText(
      `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`
    );

    // 킬
    this.killTxt.setText(`처치: ${game.killCount}`);

    // 웨이브
    this.waveTxt.setText(`Wave ${game.enemySystem.currentWave + 1}`);

    // 주문 슬롯
    this._refreshSlots(game);

    // 보스
    this._refreshBoss(game);
  }

  _refreshSlots(game) {
    // 기존 아이콘 정리
    this.slotElements.forEach(e => e.destroy());
    this.slotElements = [];

    game.spellSlots.forEach((slot, si) => {
      const y = GAME_HEIGHT - 90 + si * 28;

      // 슬롯 배경
      const bg = this.add.rectangle(16, y, 240, 24, 0x000000, 0.5).setOrigin(0, 0.5).setDepth(100);
      this.slotElements.push(bg);

      // 기본 주문 아이콘+이름
      const base = this.add.text(22, y, `${slot.baseSpell.icon} ${slot.baseSpell.name}`, {
        fontSize: '12px', fontFamily: 'monospace', color: '#fff'
      }).setOrigin(0, 0.5).setDepth(101);
      this.slotElements.push(base);

      // 쿨다운 표시
      const now = game.time.now;
      const params = slot.computeParams(game.playerLevel);
      const cdLeft = Math.max(0, params.cooldown - (now - slot.lastCastTime));
      if (cdLeft > 0) {
        const cdBar = this.add.rectangle(16, y, 240 * (cdLeft / params.cooldown), 24, 0x000000, 0.4)
          .setOrigin(0, 0.5).setDepth(102);
        this.slotElements.push(cdBar);
      }

      // 모디파이어 아이콘
      slot.modifiers.forEach((modId, mi) => {
        const mod = MODIFIERS[modId];
        if (!mod) return;
        const mx = 130 + mi * 22;
        const icon = this.add.text(mx, y, mod.icon, {
          fontSize: '13px'
        }).setOrigin(0.5).setDepth(103);
        this.slotElements.push(icon);
      });

      // 빈 슬롯 표시
      for (let i = slot.modifiers.length; i < 4; i++) {
        const mx = 130 + i * 22;
        const empty = this.add.text(mx, y, '·', {
          fontSize: '13px', color: '#444'
        }).setOrigin(0.5).setDepth(103);
        this.slotElements.push(empty);
      }
    });
  }

  _refreshBoss(game) {
    const boss = game.enemies.getChildren().find(e => e.active && e.boss);
    if (boss) {
      this.bossHpBg.setVisible(true);
      this.bossHpBar.setVisible(true);
      this.bossTxt.setVisible(true);
      this.bossTxt.setText(ENEMY_TYPES[boss.eType]?.name || 'BOSS');
      const r = boss.hp / boss.maxHp;
      this.bossHpBar.width = 400 * r;
      this.bossHpBar.x = GAME_WIDTH / 2 - (400 - this.bossHpBar.width) / 2;
    } else {
      this.bossHpBg.setVisible(false);
      this.bossHpBar.setVisible(false);
      this.bossTxt.setVisible(false);
    }
  }

  // ════════════════════════════════════════════
  // 레벨업 선택 UI
  // ════════════════════════════════════════════
  showLevelUp(choices, game) {
    this._clearLU();

    // 딤 배경
    const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setDepth(200);
    this._luEls.push(dim);

    // 타이틀
    const title = this.add.text(GAME_WIDTH / 2, 100, `⬆️ 레벨 ${game.playerLevel}!`, {
      fontSize: '30px', fontFamily: 'monospace', color: '#ffff44',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(201);
    this._luEls.push(title);

    const sub = this.add.text(GAME_WIDTH / 2, 138, '강화를 선택하세요', {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaa'
    }).setOrigin(0.5).setDepth(201);
    this._luEls.push(sub);

    // 카드
    const cw = 260, ch = 200, gap = 24;
    const total = choices.length * cw + (choices.length - 1) * gap;
    const startX = (GAME_WIDTH - total) / 2 + cw / 2;

    choices.forEach((c, i) => {
      const cx = startX + i * (cw + gap);
      const cy = GAME_HEIGHT / 2 + 20;

      // 카드 배경
      const card = this.add.rectangle(cx, cy, cw, ch, 0x12122a, 0.95)
        .setStrokeStyle(2, c.color || 0x4488ff).setDepth(201)
        .setInteractive({ useHandCursor: true });
      this._luEls.push(card);

      // 타입 뱃지
      const badge = c.type === 'modifier' ? '[모디파이어]' : c.type === 'new_spell' ? '[새 주문]' : '[패시브]';
      const badgeColor = c.type === 'modifier' ? '#88ddff' : c.type === 'new_spell' ? '#88ff88' : '#ffaa88';
      const bt = this.add.text(cx, cy - 70, badge, {
        fontSize: '10px', fontFamily: 'monospace', color: badgeColor
      }).setOrigin(0.5).setDepth(202);
      this._luEls.push(bt);

      // 이름
      const nt = this.add.text(cx, cy - 45, c.name, {
        fontSize: '16px', fontFamily: 'monospace', color: '#fff',
        stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(202);
      this._luEls.push(nt);

      // 설명
      const dt = this.add.text(cx, cy + 0, c.desc, {
        fontSize: '11px', fontFamily: 'monospace', color: '#ccc',
        wordWrap: { width: cw - 24 }, align: 'center', lineSpacing: 4
      }).setOrigin(0.5).setDepth(202);
      this._luEls.push(dt);

      // 미리보기
      if (c.preview) {
        const pt = this.add.text(cx, cy + 55, `→ ${c.preview}`, {
          fontSize: '10px', fontFamily: 'monospace', color: '#ffdd44',
          wordWrap: { width: cw - 24 }, align: 'center'
        }).setOrigin(0.5).setDepth(202);
        this._luEls.push(pt);
      }

      // 호버
      card.on('pointerover', () => {
        card.setFillStyle(0x22224a, 1);
        card.setStrokeStyle(3, 0xffffff);
      });
      card.on('pointerout', () => {
        card.setFillStyle(0x12122a, 0.95);
        card.setStrokeStyle(2, c.color || 0x4488ff);
      });
      card.on('pointerdown', () => {
        game.applyChoice(c);
        this._clearLU();
      });
    });
  }

  _clearLU() {
    this._luEls.forEach(e => e.destroy());
    this._luEls = [];
  }

  // ════════════════════════════════════════════
  // 게임 오버 화면
  // ════════════════════════════════════════════
  showGameOver(time, kills, level, slots) {
    const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8).setDepth(300);

    this.add.text(GAME_WIDTH / 2, 130, '💀 GAME OVER 💀', {
      fontSize: '40px', fontFamily: 'monospace', color: '#ff4444',
      stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(301);

    // 빌드 요약
    const buildStr = slots.map(s => s.describe()).join('\n');

    const stats = [
      `⏱️ 생존: ${time}`,
      `⚔️ 처치: ${kills}`,
      `📊 레벨: ${level}`,
      '',
      '── 최종 빌드 ──',
      buildStr
    ];

    stats.forEach((s, i) => {
      this.add.text(GAME_WIDTH / 2, 210 + i * 28, s, {
        fontSize: '14px', fontFamily: 'monospace', color: '#ccc'
      }).setOrigin(0.5).setDepth(301);
    });

    // 버튼
    const makeBtn = (y, label, color, cb) => {
      const bg = this.add.rectangle(GAME_WIDTH / 2, y, 220, 48, color, 0.8)
        .setDepth(301).setInteractive({ useHandCursor: true });
      this.add.text(GAME_WIDTH / 2, y, label, {
        fontSize: '18px', fontFamily: 'monospace', color: '#fff'
      }).setOrigin(0.5).setDepth(302);
      bg.on('pointerover', () => bg.setAlpha(1));
      bg.on('pointerout', () => bg.setAlpha(0.8));
      bg.on('pointerdown', cb);
    };

    makeBtn(500, '🔄 다시 시작', 0x4488ff, () => {
      this.scene.stop('GameScene');
      this.scene.stop('UIScene');
      this.scene.start('GameScene');
    });
    makeBtn(560, '🏠 메인 메뉴', 0x444444, () => {
      this.scene.stop('GameScene');
      this.scene.stop('UIScene');
      this.scene.start('MenuScene');
    });
  }
}
