// ============================================================
// BootScene.js - 프로시저럴 텍스처 생성 (시각 개선 버전)
// ============================================================
import { ENEMY_TYPES } from '../config.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    this.generateTextures();
    this.scene.start('MenuScene');
  }

  generateTextures() {
    this._makePlayer();
    this._makeProjectiles();
    this._makeParticles();
    this._makeEnemies();
    this._makeUI();
  }

  _makePlayer() {
    const g = this.make.graphics({ add: false });
    // 몸통
    g.fillStyle(0x3366cc); g.fillCircle(16, 16, 14);
    g.fillStyle(0x4488ee); g.fillCircle(16, 13, 10);
    // 눈
    g.fillStyle(0xffffff); g.fillCircle(11, 11, 3.5); g.fillCircle(21, 11, 3.5);
    g.fillStyle(0x1a1a44); g.fillCircle(12, 11, 1.8); g.fillCircle(22, 11, 1.8);
    // 외곽선
    g.lineStyle(1.5, 0xffffff, 0.4); g.strokeCircle(16, 16, 14);
    g.generateTexture('player', 32, 32);
  }

  _makeProjectiles() {
    // 🔥 화염구 - 빛나는 오렌지 원 + 코어
    this._drawProj('proj_fire', 10, (g, s) => {
      g.fillStyle(0xff2200, 0.4); g.fillCircle(s, s, s);
      g.fillStyle(0xff6622); g.fillCircle(s, s, s * 0.7);
      g.fillStyle(0xffcc44); g.fillCircle(s, s, s * 0.35);
    });
    // ❄️ 빙결탄 - 다이아몬드
    this._drawProj('proj_ice', 8, (g, s) => {
      g.fillStyle(0x44ccff);
      g.fillTriangle(s, 0, 0, s, s, s * 2);
      g.fillTriangle(s, 0, s * 2, s, s, s * 2);
      g.fillStyle(0xaaeeff); g.fillCircle(s, s, 2);
    });
    // ⚡ 전격 - 작은 번개
    this._drawProj('proj_bolt', 6, (g, s) => {
      g.fillStyle(0xffff44); g.fillRect(s - 1, 0, 2, s * 2);
      g.fillStyle(0xffffff); g.fillRect(s - 0.5, s * 0.3, 1, s * 0.4);
    });
    // 🧪 독액 - 거친 원
    this._drawProj('proj_poison', 14, (g, s) => {
      g.fillStyle(0x33cc33, 0.6); g.fillCircle(s, s, s);
      g.fillStyle(0x55ee55, 0.4); g.fillCircle(s - 3, s - 2, s * 0.5);
      g.fillStyle(0x228822); g.fillCircle(s + 2, s + 3, s * 0.3);
    });
    // 💨 바람칼 - 초승달
    this._drawProj('proj_wind', 16, (g, s) => {
      g.fillStyle(0xccccff, 0.7);
      g.beginPath();
      g.arc(s, s, s, -0.8, 0.8, false);
      g.arc(s + 3, s, s * 0.7, 0.8, -0.8, true);
      g.closePath(); g.fillPath();
    });
    // 🪨 암석탄 - 큰 사각형
    this._drawProj('proj_rock', 18, (g, s) => {
      g.fillStyle(0xaa8833); g.fillRect(2, 2, s * 2 - 4, s * 2 - 4);
      g.fillStyle(0xccaa44); g.fillRect(4, 4, s - 2, s - 2);
      g.lineStyle(1.5, 0x886622); g.strokeRect(2, 2, s * 2 - 4, s * 2 - 4);
    });
    // 범용 투사체
    const bl = this.make.graphics({ add: false });
    bl.fillStyle(0xffffff); bl.fillCircle(4, 4, 4);
    bl.generateTexture('bullet', 8, 8);
  }

  _drawProj(key, halfSize, drawFn) {
    const g = this.make.graphics({ add: false });
    drawFn(g, halfSize);
    g.generateTexture(key, halfSize * 2, halfSize * 2);
  }

  _makeParticles() {
    const pt = this.make.graphics({ add: false });
    pt.fillStyle(0xffffff); pt.fillCircle(3, 3, 3);
    pt.generateTexture('particle', 6, 6);

    const xp = this.make.graphics({ add: false });
    xp.fillStyle(0x44ffaa); xp.fillCircle(5, 5, 5);
    xp.fillStyle(0xaaffcc); xp.fillCircle(4, 3, 2.5);
    xp.lineStyle(1, 0xffffff, 0.3); xp.strokeCircle(5, 5, 5);
    xp.generateTexture('xp_orb', 10, 10);
  }

  _makeEnemies() {
    Object.entries(ENEMY_TYPES).forEach(([key, e]) => {
      const g = this.make.graphics({ add: false });
      const s = e.size;
      const bright = Phaser.Display.Color.IntegerToColor(e.color).brighten(15).color;

      // 그림자 (시각적 깊이)
      g.fillStyle(0x000000, 0.3); g.fillCircle(s + 2, s + 2, s * 0.9);

      // 몸통
      g.fillStyle(e.color);
      if (e.shape === 'circle') {
        g.fillCircle(s, s, s);
        g.fillStyle(bright, 0.3); g.fillCircle(s - 3, s - 3, s * 0.5);
      } else if (e.shape === 'rect') {
        g.fillRect(1, 1, s * 2 - 2, s * 2 - 2);
        g.fillStyle(bright, 0.2); g.fillRect(3, 3, s * 2 - 6, s - 2);
      } else if (e.shape === 'triangle') {
        g.fillTriangle(s, 1, 1, s * 2 - 1, s * 2 - 1, s * 2 - 1);
      } else if (e.shape === 'diamond') {
        g.fillTriangle(s, 1, 1, s, s, s * 2 - 1);
        g.fillTriangle(s, 1, s * 2 - 1, s, s, s * 2 - 1);
      }

      // 외곽선 (시각 구분 핵심)
      g.lineStyle(1.5, 0xffffff, 0.35);
      if (e.shape === 'circle') g.strokeCircle(s, s, s);
      else g.strokeRect(1, 1, s * 2 - 2, s * 2 - 2);

      // 눈
      if (!e.boss) {
        g.fillStyle(0xffffff); g.fillCircle(s - 3, s - 3, 2.5); g.fillCircle(s + 3, s - 3, 2.5);
        g.fillStyle(0x111111); g.fillCircle(s - 2, s - 3, 1.2); g.fillCircle(s + 4, s - 3, 1.2);
      } else {
        // 보스: 붉은 눈
        g.fillStyle(0xff0000); g.fillCircle(s - 6, s - 6, 4); g.fillCircle(s + 6, s - 6, 4);
        g.fillStyle(0xffff00); g.fillCircle(s - 5, s - 6, 2); g.fillCircle(s + 7, s - 6, 2);
      }

      g.generateTexture('enemy_' + key, s * 2 + 4, s * 2 + 4);
    });
  }

  _makeUI() {
    // 크로스헤어
    const ch = this.make.graphics({ add: false });
    ch.lineStyle(2, 0xffffff, 0.8);
    ch.lineBetween(10, 0, 10, 6);
    ch.lineBetween(10, 14, 10, 20);
    ch.lineBetween(0, 10, 6, 10);
    ch.lineBetween(14, 10, 20, 10);
    ch.lineStyle(1, 0xff4444, 0.6);
    ch.strokeCircle(10, 10, 4);
    ch.generateTexture('crosshair', 20, 20);

    // 바닥 타일 (더 어둡게)
    const tl = this.make.graphics({ add: false });
    tl.fillStyle(0x0e0e1e); tl.fillRect(0, 0, 64, 64);
    tl.lineStyle(1, 0x1a1a33, 0.4); tl.strokeRect(0, 0, 64, 64);
    // 미세한 격자
    tl.lineStyle(0.5, 0x161630, 0.3);
    tl.lineBetween(32, 0, 32, 64);
    tl.lineBetween(0, 32, 64, 32);
    tl.generateTexture('ground_tile', 64, 64);
  }
}
