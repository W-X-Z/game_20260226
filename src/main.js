// ============================================================
// main.js - 엔트리 포인트
// ============================================================
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { BootScene }  from './scenes/BootScene.js';
import { MenuScene }  from './scenes/MenuScene.js';
import { GameScene }  from './scenes/GameScene.js';
import { UIScene }    from './scenes/UIScene.js';

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#0a0a1e',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: [BootScene, MenuScene, GameScene, UIScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    pixelArt: true,
    antialias: false
  }
};

new Phaser.Game(config);
