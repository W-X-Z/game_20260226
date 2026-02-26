// ============================================================
// EnemySystem.js - 적 스폰·AI·웨이브 관리
// ============================================================
import { ENEMY_TYPES, WAVE_CONFIG, WORLD_SIZE } from '../config.js';
import { dist, angleTo } from '../utils.js';

export class EnemySystem {
  constructor(scene) {
    this.scene = scene;
    this.waveIndex = 0;
    this.lastSpawn = 0;
    this.gameTime = 0;
  }

  // ── 웨이브 진행 & 스폰 ────────────────────
  update(time, delta) {
    this.gameTime += delta / 1000;

    // 현재 웨이브 결정
    let newIdx = 0;
    for (let i = WAVE_CONFIG.length - 1; i >= 0; i--) {
      if (this.gameTime >= WAVE_CONFIG[i].time) { newIdx = i; break; }
    }

    // 웨이브 전환 시 보스 스폰
    if (newIdx > this.waveIndex) {
      this.waveIndex = newIdx;
      if (WAVE_CONFIG[newIdx].boss) this._spawnBoss();
    }

    const wave = WAVE_CONFIG[this.waveIndex];
    const alive = this.scene.enemies.getChildren().filter(e => e.active).length;

    if (alive < wave.max && time - this.lastSpawn > wave.rate) {
      this._spawnEnemy(wave.types);
      this.lastSpawn = time;
    }

    // 적 AI
    this._updateAI(time);
  }

  // ── 일반 적 스폰 ──────────────────────────
  _spawnEnemy(types) {
    const key = Phaser.Utils.Array.GetRandom(types);
    const def = ENEMY_TYPES[key];
    const player = this.scene.player;

    const a = Math.random() * Math.PI * 2;
    const d = 500 + Math.random() * 200;
    const x = player.x + Math.cos(a) * d;
    const y = player.y + Math.sin(a) * d;

    const half = WORLD_SIZE / 2;
    if (Math.abs(x) > half || Math.abs(y) > half) return;

    const enemy = this.scene.physics.add.sprite(x, y, 'enemy_' + key);
    enemy.setDepth(5);
    this.scene.enemies.add(enemy);

    const scale = 1 + this.gameTime * 0.004;   // 시간별 스케일링
    enemy.eType     = key;
    enemy.hp        = def.hp * scale;
    enemy.maxHp     = enemy.hp;
    enemy.speed     = def.speed;
    enemy.damage    = def.damage;
    enemy.xpValue   = def.xp;
    enemy.boss      = !!def.boss;
    enemy.ranged    = !!def.ranged;
    enemy.lastShot  = 0;
    enemy.slowUntil = 0;
    enemy.rootUntil = 0;
  }

  // ── 보스 스폰 ─────────────────────────────
  _spawnBoss() {
    const def = ENEMY_TYPES.boss;
    const player = this.scene.player;
    const a = Math.random() * Math.PI * 2;
    const x = player.x + Math.cos(a) * 600;
    const y = player.y + Math.sin(a) * 600;

    const enemy = this.scene.physics.add.sprite(x, y, 'enemy_boss');
    enemy.setDepth(5).setScale(2);
    this.scene.enemies.add(enemy);

    const mul = 1 + this.waveIndex * 0.5;
    enemy.eType     = 'boss';
    enemy.hp        = def.hp * mul;
    enemy.maxHp     = enemy.hp;
    enemy.speed     = def.speed;
    enemy.damage    = def.damage;
    enemy.xpValue   = def.xp * (1 + this.waveIndex);
    enemy.boss      = true;
    enemy.ranged    = false;
    enemy.lastShot  = 0;
    enemy.slowUntil = 0;
    enemy.rootUntil = 0;

    // 보스 경고
    const warn = this.scene.add.text(player.x, player.y - 100, '⚠️ BOSS ⚠️', {
      fontSize: '36px', fontFamily: 'monospace', color: '#ff4444',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(100);
    this.scene.tweens.add({
      targets: warn, alpha: 0, scaleX: 2, scaleY: 2,
      duration: 2000, onComplete: () => warn.destroy()
    });
    this.scene.cameras.main.shake(300, 0.012);
  }

  // ── 적 AI ──────────────────────────────────
  _updateAI(time) {
    const player = this.scene.player;

    this.scene.enemies.getChildren().forEach(enemy => {
      if (!enemy.active) return;

      let speedMul = 1;
      if (enemy.slowUntil > time) speedMul = 0.35;
      if (enemy.rootUntil > time) speedMul = 0;

      if (speedMul > 0) {
        const a = angleTo(enemy, player);
        enemy.setVelocity(
          Math.cos(a) * enemy.speed * speedMul,
          Math.sin(a) * enemy.speed * speedMul
        );
        enemy.setFlipX(enemy.body.velocity.x < 0);
      } else {
        enemy.setVelocity(0, 0);
      }

      // 원거리 적 공격
      if (enemy.ranged && time - enemy.lastShot > 2500) {
        if (dist(enemy, player) < 300) {
          this._rangedAttack(enemy);
          enemy.lastShot = time;
        }
      }
    });
  }

  _rangedAttack(enemy) {
    const player = this.scene.player;
    const a = angleTo(enemy, player);
    const bullet = this.scene.physics.add.sprite(enemy.x, enemy.y, 'particle');
    bullet.setTint(0xff44ff).setScale(1.5).setDepth(6);
    bullet.setVelocity(Math.cos(a) * 200, Math.sin(a) * 200);

    this.scene.time.delayedCall(2500, () => { if (bullet.active) bullet.destroy(); });
    this.scene.physics.add.overlap(player, bullet, () => {
      this.scene.damagePlayer(enemy.damage);
      bullet.destroy();
    });
  }

  get currentWave() { return this.waveIndex; }
  get elapsed() { return this.gameTime; }
}
