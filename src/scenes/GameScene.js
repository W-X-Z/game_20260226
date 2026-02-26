// ============================================================
// GameScene.js - 메인 게임 루프
// ============================================================
import {
  GAME_WIDTH, GAME_HEIGHT, WORLD_SIZE,
  PLAYER_SPEED, PLAYER_MAX_HP,
  XP_PER_LEVEL_BASE, XP_LEVEL_SCALE,
  BASE_SPELLS, MODIFIERS, WAND_TEMPLATES,
  MAX_INVENTORY
} from '../config.js';
import { dist, angleTo, shuffle } from '../utils.js';
import { SpellSystem, Wand } from '../systems/SpellSystem.js';
import { EnemySystem } from '../systems/EnemySystem.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  // ════════════════════════════════════════════
  // 초기화
  // ════════════════════════════════════════════
  create() {
    this.physics.world.setBounds(-WORLD_SIZE / 2, -WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE);
    this.cameras.main.setBounds(-WORLD_SIZE / 2, -WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE);

    // 배경
    this.add.tileSprite(0, 0, WORLD_SIZE, WORLD_SIZE, 'ground_tile').setDepth(-1);
    const border = this.add.graphics().setDepth(-1);
    border.lineStyle(4, 0xff4444, 0.5);
    border.strokeRect(-WORLD_SIZE / 2, -WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE);

    // 그룹
    this.enemies = this.physics.add.group();
    this.xpOrbs  = this.physics.add.group();

    // 플레이어
    this._createPlayer();
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // 크로스헤어
    this.crosshair = this.add.image(0, 0, 'crosshair').setDepth(100).setScrollFactor(0);
    this.input.setDefaultCursor('none');

    // 입력
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard.addKey('W'), A: this.input.keyboard.addKey('A'),
      S: this.input.keyboard.addKey('S'), D: this.input.keyboard.addKey('D')
    };
    this.tabKey = this.input.keyboard.addKey('TAB');
    this.tabKey.on('down', () => this.toggleCrafting());

    // 게임 상태
    this.playerHP      = PLAYER_MAX_HP;
    this.playerMaxHP   = PLAYER_MAX_HP;
    this.playerLevel   = 1;
    this.playerXP      = 0;
    this.xpToNext      = XP_PER_LEVEL_BASE;
    this.killCount     = 0;
    this.speedMult     = 1;
    this.magnetRange   = 80;
    this.armorMult     = 1;
    this.invincUntil   = 0;
    this.isPaused      = false;
    this.isGameOver    = false;
    this.isCrafting    = false;

    // ── 지팡이 & 인벤토리 ──
    // 시작: 견습 지팡이 + 화염구 1개 장착
    this.wands = [new Wand(WAND_TEMPLATES.starter)];
    this.wands[0].slots[0] = { type: 'spell', id: 'fireball' };

    // 인벤토리: 여기에 아이템이 쌓임
    this.inventory = [
      { type: 'spell', id: 'ice_shard' },
      { type: 'modifier', id: 'multi_shot' }
    ];

    // 시스템
    this.spellSystem = new SpellSystem(this);
    this.enemySystem = new EnemySystem(this);

    // 충돌
    this.physics.add.overlap(this.spellSystem.projGroup, this.enemies, (projSprite, enemy) => {
      const proj = projSprite.projData;
      if (proj) this.spellSystem.onHit(proj, enemy);
    }, null, this);
    this.physics.add.overlap(this.player, this.enemies, (_p, enemy) => {
      if (enemy.active) this.damagePlayer(enemy.damage);
    }, null, this);
    this.physics.add.overlap(this.player, this.xpOrbs, (_p, orb) => {
      if (orb.active) this._collectXP(orb);
    }, null, this);

    // UI 씬
    this.scene.launch('UIScene');
    this.uiScene = this.scene.get('UIScene');

    this._showHint('🖱️ 클릭으로 공격  |  TAB으로 지팡이 편집', 4000);

    this.events.on('shutdown', () => {
      this.spellSystem.cleanup();
      this.scene.stop('UIScene');
      this.input.setDefaultCursor('default');
    });
  }

  // ════════════════════════════════════════════
  // 메인 루프
  // ════════════════════════════════════════════
  update(time, delta) {
    if (this.isGameOver) return;

    // 크래프팅 모드
    if (this.isCrafting) {
      this.crosshair.setPosition(this.input.activePointer.x, this.input.activePointer.y);
      return;
    }
    if (this.isPaused) return;

    this._handleMovement();
    this._handleShooting(time);
    this.enemySystem.update(time, delta);
    this.spellSystem.update(time, delta);
    this._magnetXP();
    this._drawEnemyHP();

    this.crosshair.setPosition(this.input.activePointer.x, this.input.activePointer.y);
    if (this.uiScene?.scene.isActive()) this.uiScene.refresh(this);
  }

  // ════════════════════════════════════════════
  // 플레이어
  // ════════════════════════════════════════════
  _createPlayer() {
    this.player = this.physics.add.sprite(0, 0, 'player');
    this.player.setCollideWorldBounds(true).setDepth(10).setDamping(true).setDrag(0.9);
    this.playerTrail = this.add.particles(0, 0, 'particle', {
      follow: this.player, scale: { start: 0.2, end: 0 },
      alpha: { start: 0.2, end: 0 }, speed: 6, lifespan: 200, frequency: 100, tint: 0x3366cc
    }).setDepth(9);
  }

  _handleMovement() {
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown  || this.wasd.A.isDown) vx = -1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx =  1;
    if (this.cursors.up.isDown    || this.wasd.W.isDown) vy = -1;
    if (this.cursors.down.isDown  || this.wasd.S.isDown) vy =  1;
    const speed = PLAYER_SPEED * this.speedMult;
    if (vx || vy) {
      const len = Math.sqrt(vx * vx + vy * vy);
      this.player.setVelocity((vx / len) * speed, (vy / len) * speed);
      if (vx) this.player.setFlipX(vx < 0);
    } else {
      this.player.setVelocity(0, 0);
    }
  }

  // ════════════════════════════════════════════
  // 마우스 → 지팡이 발사
  // ════════════════════════════════════════════
  _handleShooting(time) {
    if (!this.input.activePointer.isDown) return;
    const wp = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
    this.wands.forEach(wand => {
      this.spellSystem.stepWand(wand, this.player.x, this.player.y, wp.x, wp.y, this.playerLevel, time);
    });
  }

  // ════════════════════════════════════════════
  // 크래프팅 (TAB)
  // ════════════════════════════════════════════
  toggleCrafting() {
    if (this.isGameOver) return;
    if (this.isPaused && !this.isCrafting) return; // 레벨업 중에는 안 열림

    this.isCrafting = !this.isCrafting;
    if (this.isCrafting) {
      this.physics.pause();
      this.isPaused = true;
    } else {
      this.physics.resume();
      this.isPaused = false;
    }

    if (this.uiScene?.scene.isActive()) {
      if (this.isCrafting) this.uiScene.showCrafting(this);
      else this.uiScene.hideCrafting();
    }
  }

  /** 인벤토리 아이템을 지팡이 슬롯에 배치 */
  placeItem(wandIdx, slotIdx, invIdx) {
    const wand = this.wands[wandIdx];
    const item = this.inventory[invIdx];
    if (!wand || !item || slotIdx >= wand.slotCount) return;

    // 기존 슬롯에 아이템이 있으면 인벤토리로 돌려보냄
    if (wand.slots[slotIdx]) {
      this.inventory.push(wand.slots[slotIdx]);
    }
    wand.slots[slotIdx] = item;
    this.inventory.splice(invIdx, 1);
    wand.reset();
  }

  /** 지팡이 슬롯에서 인벤토리로 회수 */
  removeSlotItem(wandIdx, slotIdx) {
    const wand = this.wands[wandIdx];
    if (!wand || !wand.slots[slotIdx]) return;
    this.inventory.push(wand.slots[slotIdx]);
    wand.slots[slotIdx] = null;
    wand.reset();
  }

  // ════════════════════════════════════════════
  // 데미지 처리
  // ════════════════════════════════════════════
  damageEnemy(enemy, amount) {
    if (!enemy.active) return;
    enemy.hp -= amount;
    const txt = this.add.text(enemy.x + (Math.random() - 0.5) * 10, enemy.y - 14, String(Math.floor(amount)), {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffcc44', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: txt, y: txt.y - 22, alpha: 0, duration: 450, onComplete: () => txt.destroy() });
    enemy.setTintFill(0xffffff);
    this.time.delayedCall(35, () => { if (enemy.active) enemy.clearTint(); });
    if (enemy.hp <= 0) this._killEnemy(enemy);
  }

  damagePlayer(amount) {
    const now = this.time.now;
    if (now < this.invincUntil) return;
    this.invincUntil = now + 400;
    this.playerHP -= amount * this.armorMult;
    this.cameras.main.shake(70, 0.01);
    this.player.setTintFill(0xff0000);
    this.time.delayedCall(70, () => this.player.clearTint());
    if (this.playerHP <= 0) this._gameOver();
  }

  _killEnemy(enemy) {
    const count = enemy.boss ? 10 : 1;
    const totalXP = enemy.xpValue || 5;
    for (let i = 0; i < count; i++) {
      const orb = this.physics.add.sprite(
        enemy.x + (Math.random() - 0.5) * 20, enemy.y + (Math.random() - 0.5) * 20, 'xp_orb'
      ).setDepth(4);
      orb.xpValue = Math.ceil(totalXP / count);
      this.xpOrbs.add(orb);
      const a = Math.random() * Math.PI * 2;
      orb.setVelocity(Math.cos(a) * 60, Math.sin(a) * 60);
      this.time.delayedCall(220, () => { if (orb.active) orb.setVelocity(0, 0); });
    }
    // 사망 파티클
    for (let i = 0; i < 5; i++) {
      const p = this.add.circle(enemy.x, enemy.y, 3, enemy.tintTopLeft || 0xffffff, 1).setDepth(15);
      const a = (Math.PI * 2 / 5) * i;
      this.tweens.add({
        targets: p, x: enemy.x + Math.cos(a) * 22, y: enemy.y + Math.sin(a) * 22,
        alpha: 0, scaleX: 0, scaleY: 0, duration: 220, onComplete: () => p.destroy()
      });
    }
    this.killCount++;
    enemy.destroy();
  }

  // ── 적 머리 위 HP 바 ──
  _drawEnemyHP() {
    // 기존 HP 바 정리
    if (this._hpBars) this._hpBars.forEach(b => b.destroy());
    this._hpBars = [];
    this.enemies.getChildren().forEach(e => {
      if (!e.active || e.hp >= e.maxHp) return;
      const ratio = e.hp / e.maxHp;
      const w = e.boss ? 50 : 22;
      const bg = this.add.rectangle(e.x, e.y - e.displayHeight / 2 - 5, w, 3, 0x333333, 0.8).setDepth(20);
      const bar = this.add.rectangle(
        e.x - w / 2 + (w * ratio) / 2,
        e.y - e.displayHeight / 2 - 5,
        w * ratio, 3, e.boss ? 0xff2222 : 0x44ff44, 0.9
      ).setDepth(21);
      this._hpBars.push(bg, bar);
    });
  }

  // ════════════════════════════════════════════
  // XP & 레벨업
  // ════════════════════════════════════════════
  _collectXP(orb) {
    this.playerXP += orb.xpValue || 5;
    orb.destroy();
    while (this.playerXP >= this.xpToNext) {
      this.playerXP -= this.xpToNext;
      this.playerLevel++;
      this.xpToNext = Math.floor(XP_PER_LEVEL_BASE * Math.pow(XP_LEVEL_SCALE, this.playerLevel - 1));
      this._levelUp();
    }
  }

  _magnetXP() {
    this.xpOrbs.getChildren().forEach(orb => {
      if (!orb.active) return;
      const d = dist(this.player, orb);
      if (d < this.magnetRange) {
        const a = angleTo(orb, this.player);
        orb.setVelocity(Math.cos(a) * 350 * (1 - d / this.magnetRange), Math.sin(a) * 350 * (1 - d / this.magnetRange));
      }
    });
  }

  _levelUp() {
    this.isPaused = true;
    this.physics.pause();
    const ring = this.add.circle(this.player.x, this.player.y, 12, 0xffff44, 0.4).setDepth(50);
    this.tweens.add({ targets: ring, scaleX: 4, scaleY: 4, alpha: 0, duration: 450, onComplete: () => ring.destroy() });
    this.playerHP = Math.min(this.playerHP + 8, this.playerMaxHP);

    // 아이템 3개 선택지 생성 (인벤토리에 추가)
    const choices = this._generateRewards();
    if (this.uiScene?.scene.isActive()) {
      this.uiScene.showLevelUp(choices, this);
    }
  }

  /** 레벨업 보상 생성: 주문/모디파이어/특수 중 3개 */
  _generateRewards() {
    const pool = [];

    // 주문 아이템
    const spells = Object.values(BASE_SPELLS);
    shuffle(spells).slice(0, 2).forEach(sp => {
      pool.push({
        type: 'spell', id: sp.id,
        name: `${sp.icon} ${sp.name}`, desc: sp.desc, color: sp.color
      });
    });

    // 모디파이어 아이템
    const mods = Object.values(MODIFIERS);
    shuffle(mods).slice(0, 3).forEach(mod => {
      pool.push({
        type: 'modifier', id: mod.id,
        name: `${mod.icon} ${mod.name}`, desc: mod.desc, color: mod.color
      });
    });

    // 특수 보상 (레벨 5마다 지팡이)
    if (this.playerLevel % 5 === 0 && this.wands.length < 3) {
      const wandKeys = Object.keys(WAND_TEMPLATES).filter(k =>
        !this.wands.find(w => w.id === k)
      );
      if (wandKeys.length) {
        const wt = WAND_TEMPLATES[Phaser.Utils.Array.GetRandom(wandKeys)];
        pool.push({
          type: 'wand', id: wt.id,
          name: `🪄 ${wt.name}`, desc: `슬롯 ${wt.slots}개 | 딜레이 ${wt.castDelay}ms | 리차지 ${wt.recharge}ms`,
          color: wt.color
        });
      }
    }

    // 패시브 (항상 1개)
    const passives = [
      { type: 'passive', id: 'hp_up', name: '❤️ 체력 +20', desc: '최대 HP 증가', color: 0xff4444 },
      { type: 'passive', id: 'speed_up', name: '👟 이속 +15%', desc: '이동속도 증가', color: 0x44ff44 },
      { type: 'passive', id: 'magnet_up', name: '🧲 자석 +30', desc: 'XP 수집 범위 확대', color: 0x44ffff },
      { type: 'passive', id: 'armor', name: '🛡️ 방어 +10%', desc: '피해 감소', color: 0x8888aa },
    ];
    pool.push(Phaser.Utils.Array.GetRandom(passives));

    return shuffle(pool).slice(0, 3);
  }

  /** 레벨업 보상 적용: 아이템은 인벤토리로, 패시브/지팡이는 즉시 적용 */
  applyReward(choice) {
    if (choice.type === 'spell' || choice.type === 'modifier') {
      // 인벤토리에 추가
      if (this.inventory.length < MAX_INVENTORY) {
        this.inventory.push({ type: choice.type, id: choice.id });
        this._showHint(`${choice.name} → 인벤토리!  TAB으로 지팡이에 배치`, 3000);
      } else {
        this._showHint('⚠️ 인벤토리가 가득 참!', 2000);
      }
    } else if (choice.type === 'wand') {
      this.wands.push(new Wand(WAND_TEMPLATES[choice.id]));
      this._showHint(`🪄 ${choice.name} 획득!  TAB으로 확인`, 3000);
    } else if (choice.type === 'passive') {
      switch (choice.id) {
        case 'hp_up':     this.playerMaxHP += 20; this.playerHP += 20; break;
        case 'speed_up':  this.speedMult += 0.15; break;
        case 'magnet_up': this.magnetRange += 30; break;
        case 'armor':     this.armorMult = Math.max(this.armorMult - 0.1, 0.3); break;
      }
    }
    this.isPaused = false;
    this.physics.resume();
  }

  // ════════════════════════════════════════════
  // 게임오버
  // ════════════════════════════════════════════
  _gameOver() {
    this.isGameOver = true;
    this.physics.pause();
    this.cameras.main.shake(500, 0.03);
    const t = this.enemySystem.elapsed;
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(Math.floor(t % 60)).padStart(2, '0');
    if (this.uiScene?.scene.isActive()) {
      this.uiScene.showGameOver(`${mm}:${ss}`, this.killCount, this.playerLevel, this.wands);
    }
  }

  _showHint(msg, dur) {
    const txt = this.add.text(this.player.x, this.player.y - 50, msg, {
      fontSize: '13px', fontFamily: 'monospace', color: '#fff', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(80);
    this.tweens.add({ targets: txt, alpha: 0, y: txt.y - 35, duration: dur, onComplete: () => txt.destroy() });
  }
}
