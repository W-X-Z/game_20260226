// ============================================================
// BootScene.js - 프로시저럴 텍스처 생성 & 에셋 준비
// ============================================================
import { ENEMY_TYPES } from '../config.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    this.generateTextures();
    this.scene.start('MenuScene');
  }

  generateTextures() {
    // ── 플레이어 ──
    const pg = this.make.graphics({ add: false });
    pg.fillStyle(0x4488ff);
    pg.fillCircle(16, 16, 14);
    pg.fillStyle(0x66aaff);
    pg.fillCircle(16, 13, 10);
    pg.fillStyle(0xffffff);
    pg.fillCircle(11, 11, 3);
    pg.fillCircle(21, 11, 3);
    pg.fillStyle(0x2266cc);
    pg.fillCircle(12, 11, 1.5);
    pg.fillCircle(22, 11, 1.5);
    pg.generateTexture('player', 32, 32);

    // ── 투사체 ──
    const bl = this.make.graphics({ add: false });
    bl.fillStyle(0xffffff);
    bl.fillCircle(4, 4, 4);
    bl.generateTexture('bullet', 8, 8);

    // ── 파티클 ──
    const pt = this.make.graphics({ add: false });
    pt.fillStyle(0xffffff);
    pt.fillCircle(3, 3, 3);
    pt.generateTexture('particle', 6, 6);

    // ── XP 오브 ──
    const xp = this.make.graphics({ add: false });
    xp.fillStyle(0x44ff88);
    xp.fillCircle(4, 4, 4);
    xp.fillStyle(0x88ffaa);
    xp.fillCircle(3, 3, 2);
    xp.generateTexture('xp_orb', 8, 8);

    // ── 바닥 타일 ──
    const tl = this.make.graphics({ add: false });
    tl.fillStyle(0x1a1a2e);
    tl.fillRect(0, 0, 64, 64);
    tl.lineStyle(1, 0x222244, 0.3);
    tl.strokeRect(0, 0, 64, 64);
    for (let i = 0; i < 6; i++) {
      tl.fillStyle(0x222244, 0.4);
      tl.fillCircle(Math.random() * 64, Math.random() * 64, 1);
    }
    tl.generateTexture('ground_tile', 64, 64);

    // ── 크로스헤어 ──
    const ch = this.make.graphics({ add: false });
    ch.lineStyle(2, 0xffffff, 0.7);
    ch.lineBetween(8, 0, 8, 5);
    ch.lineBetween(8, 11, 8, 16);
    ch.lineBetween(0, 8, 5, 8);
    ch.lineBetween(11, 8, 16, 8);
    ch.strokeCircle(8, 8, 6);
    ch.generateTexture('crosshair', 16, 16);

    // ── 적 텍스처 ──
    Object.entries(ENEMY_TYPES).forEach(([key, e]) => {
      const g = this.make.graphics({ add: false });
      const s = e.size;
      g.fillStyle(e.color);

      if (e.shape === 'circle') {
        g.fillCircle(s, s, s);
        g.fillStyle(0xffffff, 0.15);
        g.fillCircle(s - 3, s - 3, s * 0.5);
      } else if (e.shape === 'rect') {
        g.fillRect(0, 0, s * 2, s * 2);
        g.fillStyle(0xffffff, 0.1);
        g.fillRect(2, 2, s * 2 - 4, s - 2);
      } else if (e.shape === 'triangle') {
        g.fillTriangle(s, 0, 0, s * 2, s * 2, s * 2);
      } else if (e.shape === 'diamond') {
        g.fillTriangle(s, 0, 0, s, s, s * 2);
        g.fillTriangle(s, 0, s * 2, s, s, s * 2);
      }

      // 눈
      if (!e.boss) {
        g.fillStyle(0xffffff);
        g.fillCircle(s - 3, s - 2, 2);
        g.fillCircle(s + 3, s - 2, 2);
        g.fillStyle(0x111111);
        g.fillCircle(s - 2, s - 2, 1);
        g.fillCircle(s + 4, s - 2, 1);
      }

      g.generateTexture('enemy_' + key, s * 2, s * 2);
    });
  }
}
