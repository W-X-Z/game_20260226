// ============================================================
// GameScene.js - 메인 게임 루프
// ============================================================
import {
  GAME_WIDTH, GAME_HEIGHT, WORLD_SIZE,
  PLAYER_SPEED, PLAYER_MAX_HP,
  XP_PER_LEVEL_BASE, XP_LEVEL_SCALE,
  BASE_SPELLS, MODIFIERS, PASSIVES,
  MAX_SPELL_SLOTS, MAX_MODIFIERS_PER_SLOT
} from '../config.js';
import { dist, angleTo, shuffle } from '../utils.js';
import { SpellSystem, SpellSlot } from '../systems/SpellSystem.js';
import { EnemySystem } from '../systems/EnemySystem.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  // ════════════════════════════════════════════
  // 초기화
  // ════════════════════════════════════════════
  create() {
    // 월드
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

    // 카메라
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // 크로스헤어
    this.crosshair = this.add.image(0, 0, 'crosshair').setDepth(100).setScrollFactor(0);

    // 입력
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard.addKey('W'),
      A: this.input.keyboard.addKey('A'),
      S: this.input.keyboard.addKey('S'),
      D: this.input.keyboard.addKey('D')
    };
    // 마우스 커서 숨기기
    this.input.setDefaultCursor('none');

    // 게임 상태
    this.playerHP      = PLAYER_MAX_HP;
    this.playerMaxHP   = PLAYER_MAX_HP;
    this.playerLevel   = 1;
    this.playerXP      = 0;
    this.xpToNext      = XP_PER_LEVEL_BASE;
    this.killCount     = 0;
    this.speedMult     = 1;
    this.magnetRange   = 80;
    this.armorMult     = 1;      // 피해 감소 배율
    this.invincUntil   = 0;
    this.isPaused      = false;
    this.isGameOver    = false;

    // ── 주문 슬롯: 시작 시 화염구 기본 장착 ──
    this.spellSlots = [new SpellSlot(BASE_SPELLS.fireball)];

    // 시스템
    this.spellSystem = new SpellSystem(this);
    this.enemySystem = new EnemySystem(this);

    // 충돌: 투사체 ↔ 적
    this.physics.add.overlap(
      this.spellSystem.projGroup, this.enemies,
      (projSprite, enemy) => {
        const proj = projSprite.projData;
        if (proj) this.spellSystem.onHit(proj, enemy);
      }, null, this
    );
    // 충돌: 플레이어 ↔ 적
    this.physics.add.overlap(this.player, this.enemies, (_p, enemy) => {
      if (enemy.active) this.damagePlayer(enemy.damage);
    }, null, this);
    // 충돌: 플레이어 ↔ XP
    this.physics.add.overlap(this.player, this.xpOrbs, (_p, orb) => {
      if (orb.active) this._collectXP(orb);
    }, null, this);

    // UI 씬
    this.scene.launch('UIScene');
    this.uiScene = this.scene.get('UIScene');

    // 튜토리얼 힌트
    this._showHint('🖱️ 클릭하여 공격!  WASD로 이동', 3000);

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
    if (this.isGameOver || this.isPaused) return;

    this._handleMovement();
    this._handleShooting(time);
    this.enemySystem.update(time, delta);
    this.spellSystem.update(time, delta);
    this._magnetXP();

    // 크로스헤어 위치
    this.crosshair.setPosition(this.input.activePointer.x, this.input.activePointer.y);

    // UI
    if (this.uiScene?.scene.isActive()) this.uiScene.refresh(this);
  }

  // ════════════════════════════════════════════
  // 플레이어
  // ════════════════════════════════════════════
  _createPlayer() {
    this.player = this.physics.add.sprite(0, 0, 'player');
    this.player.setCollideWorldBounds(true).setDepth(10).setDamping(true).setDrag(0.9);

    this.playerTrail = this.add.particles(0, 0, 'particle', {
      follow: this.player,
      scale: { start: 0.25, end: 0 },
      alpha: { start: 0.25, end: 0 },
      speed: 8, lifespan: 250, frequency: 90, tint: 0x4488ff
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
  // 마우스 클릭 → 주문 발사
  // ════════════════════════════════════════════
  _handleShooting(time) {
    if (!this.input.activePointer.isDown) return;

    // 마우스 월드 좌표
    const worldPoint = this.cameras.main.getWorldPoint(
      this.input.activePointer.x, this.input.activePointer.y
    );

    this.spellSlots.forEach(slot => {
      this.spellSystem.cast(
        slot,
        this.player.x, this.player.y,
        worldPoint.x, worldPoint.y,
        this.playerLevel
      );
    });
  }

  // ════════════════════════════════════════════
  // 데미지 처리
  // ════════════════════════════════════════════
  damageEnemy(enemy, amount) {
    if (!enemy.active) return;
    enemy.hp -= amount;

    // 데미지 숫자
    const txt = this.add.text(enemy.x, enemy.y - 12, String(Math.floor(amount)), {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffcc44',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: txt, y: txt.y - 25, alpha: 0, duration: 500, onComplete: () => txt.destroy() });

    // 히트 플래시
    enemy.setTintFill(0xffffff);
    this.time.delayedCall(40, () => { if (enemy.active) enemy.clearTint(); });

    if (enemy.hp <= 0) this._killEnemy(enemy);
  }

  damagePlayer(amount) {
    const now = this.time.now;
    if (now < this.invincUntil) return;
    this.invincUntil = now + 400;

    this.playerHP -= amount * this.armorMult;
    this.cameras.main.shake(80, 0.01);
    this.player.setTintFill(0xff0000);
    this.time.delayedCall(80, () => this.player.clearTint());

    if (this.playerHP <= 0) this._gameOver();
  }

  _killEnemy(enemy) {
    // XP 드롭
    const count = enemy.boss ? 10 : 1;
    const totalXP = enemy.xpValue || 5;
    for (let i = 0; i < count; i++) {
      const orb = this.physics.add.sprite(
        enemy.x + (Math.random() - 0.5) * 20,
        enemy.y + (Math.random() - 0.5) * 20,
        'xp_orb'
      ).setDepth(4);
      orb.xpValue = Math.ceil(totalXP / count);
      this.xpOrbs.add(orb);
      const a = Math.random() * Math.PI * 2;
      orb.setVelocity(Math.cos(a) * 70, Math.sin(a) * 70);
      this.time.delayedCall(250, () => { if (orb.active) orb.setVelocity(0, 0); });
    }

    // 사망 이펙트
    for (let i = 0; i < 5; i++) {
      const p = this.add.circle(enemy.x, enemy.y, 3, enemy.tintTopLeft || 0xffffff, 1).setDepth(15);
      const a = (Math.PI * 2 / 5) * i;
      this.tweens.add({
        targets: p,
        x: enemy.x + Math.cos(a) * 25, y: enemy.y + Math.sin(a) * 25,
        alpha: 0, scaleX: 0, scaleY: 0, duration: 250,
        onComplete: () => p.destroy()
      });
    }

    this.killCount++;
    enemy.destroy();
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
        const spd = 350 * (1 - d / this.magnetRange);
        orb.setVelocity(Math.cos(a) * spd, Math.sin(a) * spd);
      }
    });
  }

  _levelUp() {
    this.isPaused = true;
    this.physics.pause();

    // 레벨업 이펙트
    const ring = this.add.circle(this.player.x, this.player.y, 15, 0xffff44, 0.5).setDepth(50);
    this.tweens.add({
      targets: ring, scaleX: 4, scaleY: 4, alpha: 0,
      duration: 500, onComplete: () => ring.destroy()
    });

    this.playerHP = Math.min(this.playerHP + 10, this.playerMaxHP);

    const choices = this._generateChoices();
    if (this.uiScene?.scene.isActive()) {
      this.uiScene.showLevelUp(choices, this);
    }
  }

  // ── 레벨업 선택지 생성 ──
  _generateChoices() {
    const pool = [];

    // 1) 기존 슬롯에 모디파이어 추가
    this.spellSlots.forEach((slot, idx) => {
      if (slot.isFull) return;
      const availMods = Object.values(MODIFIERS).filter(m => slot.canAddModifier(m.id));
      const picked = shuffle(availMods).slice(0, 2);
      picked.forEach(mod => {
        pool.push({
          type: 'modifier',
          modId: mod.id,
          slotIdx: idx,
          name: `${mod.icon} ${mod.name}`,
          desc: `${slot.baseSpell.icon} ${slot.baseSpell.name}에 추가\n${mod.desc}`,
          color: mod.color,
          preview: this._previewSlot(slot, mod.id)
        });
      });
    });

    // 2) 새 주문 슬롯
    if (this.spellSlots.length < MAX_SPELL_SLOTS) {
      const owned = new Set(this.spellSlots.map(s => s.baseSpell.id));
      const avail = Object.values(BASE_SPELLS).filter(s => !owned.has(s.id));
      shuffle(avail).slice(0, 2).forEach(spell => {
        pool.push({
          type: 'new_spell',
          spellId: spell.id,
          name: `${spell.icon} 새 주문: ${spell.name}`,
          desc: spell.desc,
          color: spell.color
        });
      });
    }

    // 3) 패시브
    shuffle([...PASSIVES]).slice(0, 1).forEach(p => {
      pool.push({ type: 'passive', passiveId: p.id, name: p.name, desc: p.desc, color: p.color });
    });

    return shuffle(pool).slice(0, 3);
  }

  /** 모디파이어 추가 시 미리보기 문자열 */
  _previewSlot(slot, modId) {
    const testSlot = new SpellSlot(slot.baseSpell);
    testSlot.modifiers = [...slot.modifiers, modId];
    const p = testSlot.computeParams(this.playerLevel);
    const parts = [];
    if (p.count > 1) parts.push(`투사체 ×${p.count}`);
    if (p.pierce) parts.push(`관통 ${p.pierce}`);
    if (p.chain) parts.push(`연쇄 ${p.chain}`);
    if (p.fork) parts.push(`분열 ${p.fork}`);
    if (p.homing) parts.push('유도');
    if (p.explode) parts.push(`폭발 R${Math.floor(p.explodeR)}`);
    if (p.orbit) parts.push('궤도');
    if (p.boomerang) parts.push('부메랑');
    if (p.trail) parts.push('궤적');
    if (p.trigger) parts.push('연발');
    return parts.length ? parts.join(' · ') : '';
  }

  // ── 선택 적용 ──
  applyChoice(choice) {
    switch (choice.type) {
      case 'modifier':
        this.spellSlots[choice.slotIdx].addModifier(choice.modId);
        break;
      case 'new_spell':
        this.spellSlots.push(new SpellSlot(BASE_SPELLS[choice.spellId]));
        break;
      case 'passive':
        this._applyPassive(choice.passiveId);
        break;
    }
    this.isPaused = false;
    this.physics.resume();
  }

  _applyPassive(id) {
    switch (id) {
      case 'hp_up':     this.playerMaxHP += 20; this.playerHP += 20; break;
      case 'speed_up':  this.speedMult += 0.15; break;
      case 'magnet_up': this.magnetRange += 30; break;
      case 'heal':      this.playerHP = Math.min(this.playerHP + this.playerMaxHP * 0.5, this.playerMaxHP); break;
      case 'armor':     this.armorMult = Math.max(this.armorMult - 0.1, 0.3); break;
    }
  }

  // ════════════════════════════════════════════
  // 게임 오버
  // ════════════════════════════════════════════
  _gameOver() {
    this.isGameOver = true;
    this.physics.pause();
    this.cameras.main.shake(500, 0.03);

    const t = this.enemySystem.elapsed;
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(Math.floor(t % 60)).padStart(2, '0');

    if (this.uiScene?.scene.isActive()) {
      this.uiScene.showGameOver(`${mm}:${ss}`, this.killCount, this.playerLevel, this.spellSlots);
    }
  }

  // ── 힌트 텍스트 ──
  _showHint(msg, duration) {
    const txt = this.add.text(this.player.x, this.player.y - 50, msg, {
      fontSize: '15px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(80);
    this.tweens.add({
      targets: txt, alpha: 0, y: txt.y - 40,
      duration, onComplete: () => txt.destroy()
    });
  }
}
