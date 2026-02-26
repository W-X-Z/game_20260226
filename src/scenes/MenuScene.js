// ============================================================
// MenuScene.js - 메인 메뉴
// ============================================================
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    this.cameras.main.setBackgroundColor('#060612');

    // 배경 별
    for (let i = 0; i < 60; i++) {
      const s = this.add.circle(
        Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT,
        Math.random() * 1.5 + 0.5, 0xffffff, Math.random() * 0.4
      );
      this.tweens.add({ targets: s, alpha: 0, duration: 800 + Math.random() * 2000, yoyo: true, repeat: -1 });
    }

    // 타이틀
    const title = this.add.text(GAME_WIDTH / 2, 140, '⚔️ ELEMENTAL SURVIVOR ⚔️', {
      fontSize: '38px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#3366cc', strokeThickness: 4
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, alpha: 0.7, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.text(GAME_WIDTH / 2, 195, '지팡이를 설계하고, 주문을 조합하라', {
      fontSize: '15px', fontFamily: 'monospace', color: '#7777bb'
    }).setOrigin(0.5);

    // 핵심 메커니즘 설명
    const lines = [
      '',
      '[ 지팡이 시스템 — Noita 스타일 ]',
      '',
      '슬롯에 모디파이어와 주문을 배치합니다',
      '모디파이어는 바로 다음 주문에 적용됩니다',
      '',
      '예) 🔱다중 → 💥폭발 → 🔥화염구',
      '  = 3발의 화염구가 각각 폭발!',
      '',
      '예) 🎯유도 → ⛓️연쇄 → ❄️빙결탄',
      '  = 유도+연쇄 빙결탄!',
    ];
    lines.forEach((txt, i) => {
      const c = txt.startsWith('[') ? '#88aaff' : txt.startsWith('예)') ? '#ffdd44' : '#888899';
      this.add.text(GAME_WIDTH / 2, 240 + i * 22, txt, {
        fontSize: '12px', fontFamily: 'monospace', color: c
      }).setOrigin(0.5);
    });

    // 조작법
    const ctrls = [
      'WASD ─ 이동    마우스 좌클릭 ─ 주문 발사',
      'TAB ─ 지팡이 편집 (인벤토리 ↔ 슬롯 배치)'
    ];
    ctrls.forEach((t, i) => {
      this.add.text(GAME_WIDTH / 2, 510 + i * 22, t, {
        fontSize: '12px', fontFamily: 'monospace', color: '#666677'
      }).setOrigin(0.5);
    });

    // 시작 버튼
    const btn = this.add.rectangle(GAME_WIDTH / 2, 590, 230, 52, 0x3366cc, 0.85)
      .setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH / 2, 590, '▶  게임 시작', {
      fontSize: '20px', fontFamily: 'monospace', color: '#fff', fontStyle: 'bold'
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x5588ee, 1));
    btn.on('pointerout', () => btn.setFillStyle(0x3366cc, 0.85));
    btn.on('pointerdown', () => this.scene.start('GameScene'));
  }
}
