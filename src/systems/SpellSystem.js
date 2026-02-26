// ============================================================
// SpellSystem.js - 주문 슬롯 & 모디파이어 조합 엔진
// ============================================================
// PoE 서포트 젬 / Noita 주문 개조 스타일:
//   SpellSlot = 기본 주문 + 모디파이어[]
//   모디파이어가 발사·비행·명중 각 단계의 메커니즘을 변형
// ============================================================
import { MODIFIERS, MAX_MODIFIERS_PER_SLOT } from '../config.js';
import { dist, angleTo } from '../utils.js';

// ──────────────────────────────────────────
// SpellSlot: 하나의 주문 빌드 (기본 주문 + 모디파이어)
// ──────────────────────────────────────────
export class SpellSlot {
  constructor(baseSpell) {
    this.baseSpell = baseSpell;
    this.modifiers = [];      // 장착된 모디파이어 id 배열 (중복=스택)
    this.lastCastTime = 0;
  }

  get isFull() { return this.modifiers.length >= MAX_MODIFIERS_PER_SLOT; }

  canAddModifier(modId) {
    if (this.isFull) return false;
    const mod = MODIFIERS[modId];
    if (!mod) return false;
    const count = this.modifiers.filter(m => m === modId).length;
    return count < mod.maxStack;
  }

  addModifier(modId) {
    if (this.canAddModifier(modId)) {
      this.modifiers.push(modId);
      return true;
    }
    return false;
  }

  /** 모디파이어를 반영한 최종 주문 파라미터 계산 */
  computeParams(playerLevel) {
    const b = this.baseSpell;
    const p = {
      damage:     b.damage + playerLevel * 0.5,
      speed:      b.speed,
      size:       b.size,
      cooldown:   b.cooldown,
      lifetime:   b.lifetime || 2000,
      color:      b.color,
      count:      1,            // 투사체 수
      spread:     0,            // 부채꼴 각도
      pierce:     0,
      chain:      0,
      fork:       0,
      homing:     false,
      homingStr:  0,
      orbit:      false,
      boomerang:  false,
      trail:      false,
      explode:    false,
      explodeR:   0,
      trigger:    false,
      // 기본 주문 고유 효과
      onHit:      b.onHit,
    };

    for (const id of this.modifiers) {
      switch (id) {
        case 'multi_shot':
          p.count += 2;
          p.spread = Math.min(p.spread + 0.2, 1.2);
          p.damage *= 0.9;
          break;
        case 'pierce':     p.pierce += 1;                              break;
        case 'homing':     p.homing = true; p.homingStr = Math.min(p.homingStr + 2.5, 10); break;
        case 'chain':      p.chain += 1;                               break;
        case 'fork':       p.fork += 1;                                break;
        case 'explode':    p.explode = true; p.explodeR = Math.min(p.explodeR + 55, 200); break;
        case 'orbit':      p.orbit = true; p.lifetime = 4000;          break;
        case 'boomerang':  p.boomerang = true; p.lifetime += 800;      break;
        case 'rapid':      p.cooldown = Math.max(p.cooldown * 0.7, 80);break;
        case 'heavy':      p.damage *= 1.5; p.speed *= 0.8; p.size *= 1.3; break;
        case 'trail':      p.trail = true;                             break;
        case 'trigger':    p.trigger = true;                           break;
      }
    }
    return p;
  }

  /** 슬롯 설명 문자열 생성 */
  describe() {
    const mods = this.modifiers.map(id => MODIFIERS[id]?.icon || '?').join('');
    return `${this.baseSpell.icon} ${this.baseSpell.name} ${mods}`;
  }
}

// ──────────────────────────────────────────
// SpellSystem: 발사·비행·명중 전체 관리
// ──────────────────────────────────────────
export class SpellSystem {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];        // 활성 투사체 래퍼
    this.damageZones = [];        // 지속 데미지 지대
    this.projGroup = scene.physics.add.group();  // Phaser 물리 그룹
  }

  // ── 발사 (Cast) ──────────────────────────
  cast(slot, px, py, tx, ty, level) {
    const now = this.scene.time.now;
    const params = slot.computeParams(level);
    if (now - slot.lastCastTime < params.cooldown) return false;
    slot.lastCastTime = now;

    const baseAngle = Math.atan2(ty - py, tx - px);

    // 궤도 모디파이어: 별도 처리
    if (params.orbit) {
      this._spawnOrbitGroup(params, px, py);
      return true;
    }

    // 투사체 생성
    for (let i = 0; i < params.count; i++) {
      let a = baseAngle;
      if (params.count > 1) {
        a += (i - (params.count - 1) / 2) * params.spread;
      }
      this._spawnProjectile(params, px, py, a);
    }

    // 캐스트 이펙트
    this._castFX(px, py, params.color);
    return true;
  }

  // ── 투사체 생성 ──────────────────────────
  _spawnProjectile(params, x, y, angle) {
    const sprite = this.scene.physics.add.sprite(x, y, 'bullet');
    sprite.setTint(params.color);
    sprite.setScale(Math.max(params.size / 4, 0.5));
    sprite.setDepth(8);
    this.projGroup.add(sprite);

    const proj = {
      sprite,
      params: { ...params },
      angle,
      createdAt: this.scene.time.now,
      hitEnemies: new Set(),
      lastTrailTime: 0,
      boomerangPhase: 0,       // 0=전진, 1=복귀
      originX: x, originY: y,
    };
    sprite.projData = proj;

    // 속도 설정
    sprite.setVelocity(
      Math.cos(angle) * params.speed,
      Math.sin(angle) * params.speed
    );

    // 트레일 파티클
    const trail = this.scene.add.particles(0, 0, 'particle', {
      follow: sprite,
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.5, end: 0 },
      speed: 5,
      lifespan: 150,
      frequency: 40,
      tint: params.color
    }).setDepth(7);
    proj.trail = trail;

    this.projectiles.push(proj);
    return proj;
  }

  // ── 궤도 투사체 ──────────────────────────
  _spawnOrbitGroup(params, px, py) {
    const count = Math.max(params.count, 3);
    for (let i = 0; i < count; i++) {
      const startAngle = (Math.PI * 2 / count) * i;
      const orb = this.scene.add.circle(px, py, params.size, params.color, 0.8).setDepth(8);
      const radius = 90 + params.size * 3;

      const proj = {
        sprite: orb,
        params: { ...params },
        isOrbit: true,
        orbitAngle: startAngle,
        orbitRadius: radius,
        createdAt: this.scene.time.now,
        hitEnemies: new Set(),
        lastDmgTime: 0,
      };
      this.projectiles.push(proj);
    }
  }

  // ── 비행 업데이트 (매 프레임) ────────────
  update(time, delta) {
    const player = this.scene.player;

    this.projectiles = this.projectiles.filter(proj => {
      // 수명 체크
      const elapsed = time - proj.createdAt;
      if (elapsed > proj.params.lifetime) {
        this._destroyProj(proj);
        return false;
      }

      // ── 궤도 ──
      if (proj.isOrbit) {
        proj.orbitAngle += delta * 0.003;
        proj.sprite.x = player.x + Math.cos(proj.orbitAngle) * proj.orbitRadius;
        proj.sprite.y = player.y + Math.sin(proj.orbitAngle) * proj.orbitRadius;

        // 적과 충돌
        if (time - proj.lastDmgTime > 200) {
          this.scene.enemies.getChildren().forEach(e => {
            if (!e.active) return;
            if (dist(proj.sprite, e) < proj.params.size + e.displayWidth / 2) {
              this.scene.damageEnemy(e, proj.params.damage * 0.3);
              proj.lastDmgTime = time;
            }
          });
        }
        return true;
      }

      // 스프라이트가 사라졌으면 제거
      if (!proj.sprite.active) {
        if (proj.trail) proj.trail.destroy();
        return false;
      }

      // ── 유도 (Homing) ──
      if (proj.params.homing) {
        const nearest = this._nearestEnemyFrom(proj.sprite.x, proj.sprite.y, proj.hitEnemies);
        if (nearest) {
          const desired = angleTo(proj.sprite, nearest);
          const current = Math.atan2(proj.sprite.body.velocity.y, proj.sprite.body.velocity.x);
          let diff = desired - current;
          // 각도 정규화
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const turn = diff * proj.params.homingStr * (delta / 1000);
          const newAngle = current + turn;
          const spd = proj.params.speed;
          proj.sprite.setVelocity(Math.cos(newAngle) * spd, Math.sin(newAngle) * spd);
        }
      }

      // ── 부메랑 ──
      if (proj.params.boomerang) {
        const halfLife = proj.params.lifetime / 2;
        if (elapsed > halfLife && proj.boomerangPhase === 0) {
          proj.boomerangPhase = 1;
          proj.hitEnemies.clear();   // 복귀 시 다시 히트 가능
        }
        if (proj.boomerangPhase === 1 && player) {
          const a = angleTo(proj.sprite, player);
          const spd = proj.params.speed * 1.2;
          proj.sprite.setVelocity(Math.cos(a) * spd, Math.sin(a) * spd);
        }
      }

      // ── 궤적 (Trail) ──
      if (proj.params.trail && time - proj.lastTrailTime > 150) {
        proj.lastTrailTime = time;
        this._createZone(
          proj.sprite.x, proj.sprite.y,
          20, proj.params.damage * 0.2, 1200, proj.params.color, null
        );
      }

      // ── 화면 밖 정리 ──
      if (player && dist(player, proj.sprite) > 900) {
        this._destroyProj(proj);
        return false;
      }

      return true;
    });

    // ── 데미지 존 업데이트 ──
    this.damageZones = this.damageZones.filter(zone => {
      if (time - zone.createdAt > zone.duration) return false;
      if (time - zone.lastHit > 400) {
        zone.lastHit = time;
        this.scene.enemies.getChildren().forEach(e => {
          if (!e.active) return;
          if (dist(zone, e) < zone.radius) {
            this.scene.damageEnemy(e, zone.damage);
            if (zone.effect === 'slow') e.slowUntil = time + 1000;
          }
        });
      }
      return true;
    });
  }

  // ── 명중 처리 ────────────────────────────
  onHit(proj, enemy) {
    if (!proj || !enemy.active) return;
    if (proj.hitEnemies.has(enemy)) return;

    const p = proj.params;
    proj.hitEnemies.add(enemy);

    // 1) 데미지
    this.scene.damageEnemy(enemy, p.damage);

    // 2) 기본 주문 고유 효과
    if (p.onHit === 'slow') {
      enemy.slowUntil = this.scene.time.now + 1500;
      enemy.setTint(0x88ccff);
      this.scene.time.delayedCall(1500, () => { if (enemy.active) enemy.clearTint(); });
    }
    if (p.onHit === 'knockback') {
      const a = angleTo(proj.sprite, enemy);
      enemy.body.velocity.x += Math.cos(a) * 200;
      enemy.body.velocity.y += Math.sin(a) * 200;
    }
    if (p.onHit === 'poison_zone') {
      this._createZone(enemy.x, enemy.y, 45, p.damage * 0.5, 2500, 0x44ff44, 'slow');
    }

    // 3) 폭발 모디파이어
    if (p.explode) {
      this._createExplosion(enemy.x, enemy.y, p.explodeR, p.damage * 0.5, p.color);
    }

    // 4) 연발(trigger) - 적 처치 시 재발사
    if (p.trigger && enemy.hp <= 0) {
      const next = this._nearestEnemyFrom(enemy.x, enemy.y, new Set([enemy]));
      if (next) {
        const a = angleTo(enemy, next);
        const tp = { ...p, trigger: false, fork: 0, chain: 0, damage: p.damage * 0.6 };
        this._spawnProjectile(tp, enemy.x, enemy.y, a);
      }
    }

    // 5) 투사체 운명 결정: 분열 > 연쇄 > 관통 > 소멸
    if (p.fork > 0) {
      const baseA = angleTo(proj.sprite, enemy);
      for (let i = 0; i < 2; i++) {
        const fa = baseA + (i === 0 ? -0.5 : 0.5);
        const fp = { ...p, fork: p.fork - 1, damage: p.damage * 0.65 };
        this._spawnProjectile(fp, enemy.x, enemy.y, fa);
      }
      this._destroyProj(proj);
    } else if (p.chain > 0) {
      const next = this._nearestEnemyFrom(enemy.x, enemy.y, proj.hitEnemies);
      if (next) {
        const a = angleTo(proj.sprite, next);
        proj.sprite.setPosition(enemy.x, enemy.y);
        proj.sprite.setVelocity(Math.cos(a) * p.speed, Math.sin(a) * p.speed);
        proj.params = { ...p, chain: p.chain - 1 };
        // 체인 시각효과
        this._drawChain(enemy.x, enemy.y, next.x, next.y, p.color);
      } else {
        this._destroyProj(proj);
      }
    } else if (p.pierce > 0) {
      proj.params = { ...p, pierce: p.pierce - 1 };
      // 계속 비행 (소멸 안 함)
    } else {
      this._destroyProj(proj);
    }
  }

  // ── 헬퍼 ─────────────────────────────────
  _destroyProj(proj) {
    if (proj.trail && proj.trail.destroy) proj.trail.destroy();
    if (proj.sprite && proj.sprite.destroy) proj.sprite.destroy();
  }

  _castFX(x, y, color) {
    const ring = this.scene.add.circle(x, y, 10, color, 0.4).setDepth(12);
    this.scene.tweens.add({
      targets: ring, scaleX: 2.5, scaleY: 2.5, alpha: 0,
      duration: 200, onComplete: () => ring.destroy()
    });
  }

  _createExplosion(x, y, radius, damage, color) {
    // 시각 효과
    const c = this.scene.add.circle(x, y, radius, color, 0.45).setDepth(15);
    this.scene.tweens.add({
      targets: c, scaleX: 1.4, scaleY: 1.4, alpha: 0,
      duration: 350, onComplete: () => c.destroy()
    });
    for (let i = 0; i < 10; i++) {
      const p = this.scene.add.circle(x, y, 3, color, 1).setDepth(15);
      const a = (Math.PI * 2 / 10) * i;
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(a) * radius * 1.4,
        y: y + Math.sin(a) * radius * 1.4,
        alpha: 0, duration: 300, onComplete: () => p.destroy()
      });
    }
    // AoE 데미지
    this.scene.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      if (dist({ x, y }, e) < radius) {
        this.scene.damageEnemy(e, damage);
      }
    });
    this.scene.cameras.main.shake(80, 0.006);
  }

  _createZone(x, y, radius, damage, duration, color, effect) {
    const vis = this.scene.add.circle(x, y, radius, color, 0.2).setDepth(3);
    const border = this.scene.add.circle(x, y, radius).setDepth(3).setStrokeStyle(1.5, color, 0.4);
    this.scene.tweens.add({
      targets: [vis, border], alpha: 0, duration,
      onComplete: () => { vis.destroy(); border.destroy(); }
    });
    this.damageZones.push({
      x, y, radius, damage, effect,
      createdAt: this.scene.time.now, duration, lastHit: 0
    });
  }

  _drawChain(x1, y1, x2, y2, color) {
    const g = this.scene.add.graphics().setDepth(15);
    g.lineStyle(3, color, 0.8);
    // 지그재그 번개
    const segs = 5;
    g.beginPath(); g.moveTo(x1, y1);
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const mx = x1 + (x2 - x1) * t + (i < segs ? (Math.random() - 0.5) * 25 : 0);
      const my = y1 + (y2 - y1) * t + (i < segs ? (Math.random() - 0.5) * 25 : 0);
      g.lineTo(mx, my);
    }
    g.strokePath();
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
  }

  _nearestEnemyFrom(x, y, exclude, range = 300) {
    let best = null, bestD = range;
    this.scene.enemies.getChildren().forEach(e => {
      if (!e.active || (exclude && exclude.has(e))) return;
      const d = dist({ x, y }, e);
      if (d < bestD) { best = e; bestD = d; }
    });
    return best;
  }

  /** 모든 투사체 정리 (씬 종료 시) */
  cleanup() {
    this.projectiles.forEach(p => this._destroyProj(p));
    this.projectiles = [];
    this.damageZones = [];
  }
}
