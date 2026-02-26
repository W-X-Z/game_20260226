// ============================================================
// MenuScene.js - 메인 메뉴 화면
// ============================================================
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a1e');

    // ── 배경 별 ──
    for (let i = 0; i < 60; i++) {
      const star = this.add.circle(
        Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT,
        Math.random() * 2 + 0.5, 0xffffff, Math.random() * 0.4
      );
      this.tweens.add({
        targets: star, alpha: 0, duration: 1000 + Math.random() * 2000,
        yoyo: true, repeat: -1
      });
    }

    // ── 타이틀 ──
    const title = this.add.text(GAME_WIDTH / 2, 160, '⚔️ ELEMENTAL SURVIVOR ⚔️', {
      fontSize: '40px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#4488ff', strokeThickness: 4
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title, alpha: 0.7, duration: 1500,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // ── 부제 ──
    this.add.text(GAME_WIDTH / 2, 215, '주문을 설계하고, 메커니즘을 조합하라', {
      fontSize: '16px', fontFamily: 'monospace', color: '#8888cc'
    }).setOrigin(0.5);

    // ── 핵심 메커니즘 설명 ──
    const features = [
      '🔥❄️⚡🧪💨🪨  6가지 기본 주문',
      '🔱🗡️🎯⛓️🔀💥🌀🪃  12가지 모디파이어',
      '주문 + 모디파이어 조합으로 무한한 빌드를 설계하세요!'
    ];
    features.forEach((text, i) => {
      this.add.text(GAME_WIDTH / 2, 280 + i * 28, text, {
        fontSize: '13px', fontFamily: 'monospace', color: '#aaaacc'
      }).setOrigin(0.5);
    });

    // ── 조작법 ──
    const controls = [
      'WASD / 방향키 ─ 이동',
      '마우스 좌클릭 ─ 주문 발사',
      '레벨업 시 ─ 새 주문 / 모디파이어 선택'
    ];
    controls.forEach((text, i) => {
      this.add.text(GAME_WIDTH / 2, 400 + i * 24, text, {
        fontSize: '13px', fontFamily: 'monospace', color: '#888888'
      }).setOrigin(0.5);
    });

    // ── 예시 빌드 ──
    this.add.text(GAME_WIDTH / 2, 500, '예) 화염구 + 다중발사 + 유도 + 폭발 = 유도 화염 폭격', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffdd44'
    }).setOrigin(0.5);

    // ── 시작 버튼 ──
    const btnBg = this.add.rectangle(GAME_WIDTH / 2, 570, 240, 55, 0x4488ff, 0.85)
      .setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH / 2, 570, '▶  게임 시작', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => btnBg.setFillStyle(0x66aaff, 1));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x4488ff, 0.85));
    btnBg.on('pointerdown', () => this.scene.start('GameScene'));
  }
}
