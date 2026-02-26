// ============================================================
// SpellSystem.js - Noita 스타일 지팡이 실행 엔진
// ============================================================
//
// 지팡이 슬롯 실행 규칙:
//   슬롯을 왼쪽→오른쪽 순서로 실행
//   [모디파이어]는 누적되어 다음 [주문]에 적용
//   [주문]을 만나면 누적된 모디파이어로 발사 → 누적 초기화
//   모든 주문 발사 후 rechargeTime 대기 → 처음부터 반복
//
//   예: [다중] [폭발] [화염구] [유도] [빙결탄]
//       → 화염구: 다중+폭발 적용
//       → 빙결탄: 유도 적용
// ============================================================
import { BASE_SPELLS, MODIFIERS } from '../config.js';
import { dist, angleTo } from '../utils.js';

// ── Wand 클래스 ──────────────────────────────
export class Wand {
  constructor(template) {
    this.id = template.id;
    this.name = template.name;
    this.slotCount = template.slots;
    this.castDelay = template.castDelay;     // ms: 주문 간 딜레이
    this.rechargeTime = template.recharge;   // ms: 전체 사이클 후 대기
    this.color = template.color;
    this.slots = new Array(template.slots).fill(null);
    // 각 slot: null | { type: 'spell', id: 'fireball' } | { type: 'modifier', id: 'multi_shot' }

    // 실행 상태
    this.execIdx = 0;
    this.lastStepTime = 0;
    this.isRecharging = false;
    this.rechargeStart = 0;
  }

  /** 실행 순서 미리보기 문자열 (크래프팅 UI용) */
  preview() {
    const parts = [];
    let mods = [];
    for (const slot of this.slots) {
      if (!slot) continue;
      if (slot.type === 'modifier') {
        mods.push(MODIFIERS[slot.id]?.icon || '?');
      } else {
        const sp = BASE_SPELLS[slot.id];
        const modStr = mods.length ? mods.join('') + '→' : '';
        parts.push(`${modStr}${sp?.icon || '?'}${sp?.name || slot.id}`);
        mods = [];
      }
    }
    if (mods.length) parts.push(mods.join('') + '→(없음)');
    return parts.join('  ┃  ') || '(비어 있음)';
  }

  /** 아이콘 요약 */
  describe() {
    return this.slots.map(s => {
      if (!s) return '·';
      if (s.type === 'modifier') return MODIFIERS[s.id]?.icon || '?';
      return BASE_SPELLS[s.id]?.icon || '?';
    }).join(' ');
  }

  reset() {
    this.execIdx = 0;
    this.isRecharging = false;
  }
}

// ── 모디파이어 → 파라미터 계산 ───────────────
export function computeParams(spellId, modifiers, level) {
  const b = BASE_SPELLS[spellId];
  if (!b) return null;
  const p = {
    damage: b.damage + level * 0.4,
    speed: b.speed, size: b.size,
    lifetime: b.lifetime || 2000,
    color: b.color, texKey: b.texKey || 'bullet',
    count: 1, spread: 0,
    pierce: 0, chain: 0, fork: 0,
    homing: false, homingStr: 0,
    orbit: false, boomerang: false,
    trail: false, trigger: false,
    explode: false, explodeR: 0,
    rapid: false, rapidMul: 1,
    onHit: b.onHit,
  };

  // 모디파이어 스택 수 세기 (같은 모디파이어 여러개)
  for (const id of modifiers) {
    switch (id) {
      case 'multi_shot': p.count += 2; p.spread = Math.min(p.spread + 0.2, 1.2); p.damage *= 0.85; break;
      case 'pierce':     p.pierce += 1; break;
      case 'homing':     p.homing = true; p.homingStr = Math.min(p.homingStr + 2.5, 10); break;
      case 'chain':      p.chain += 1; break;
      case 'fork':       p.fork += 1; break;
      case 'explode':    p.explode = true; p.explodeR = Math.min(p.explodeR + 55, 200); break;
      case 'orbit':      p.orbit = true; p.lifetime = 4500; break;
      case 'boomerang':  p.boomerang = true; p.lifetime += 800; break;
      case 'rapid':      p.speed *= 1.5; break;
      case 'heavy':      p.damage *= 1.6; p.speed *= 0.75; p.size *= 1.3; break;
      case 'trail':      p.trail = true; break;
      case 'trigger':    p.trigger = true; break;
    }
  }
  return p;
}

// ── SpellSystem: 투사체 관리 ─────────────────
export class SpellSystem {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
    this.damageZones = [];
    this.projGroup = scene.physics.add.group();
  }

  // ── 지팡이 한 스텝 실행 ──────────────────
  stepWand(wand, px, py, tx, ty, level, time) {
    // 리차지 중
    if (wand.isRecharging) {
      if (time - wand.rechargeStart >= wand.rechargeTime) {
        wand.isRecharging = false;
        wand.execIdx = 0;
      }
      return false;
    }
    // 캐스트 딜레이
    if (time - wand.lastStepTime < wand.castDelay) return false;

    // 현재 인덱스부터 모디파이어 수집 → 다음 주문 찾기
    let mods = [];
    let spellId = null;
    let idx = wand.execIdx;

    while (idx < wand.slotCount) {
      const slot = wand.slots[idx];
      idx++;
      if (!slot) continue;
      if (slot.type === 'modifier') {
        mods.push(slot.id);
      } else if (slot.type === 'spell') {
        spellId = slot.id;
        break;
      }
    }
    wand.execIdx = idx;

    if (!spellId) {
      // 더 이상 주문 없음 → 리차지
      wand.isRecharging = true;
      wand.rechargeStart = time;
      return false;
    }

    // 파라미터 계산 & 발사
    const params = computeParams(spellId, mods, level);
    if (!params) return false;

    const baseAngle = Math.atan2(ty - py, tx - px);

    if (params.orbit) {
      this._spawnOrbit(params, px, py);
    } else {
      for (let i = 0; i < params.count; i++) {
        let a = baseAngle;
        if (params.count > 1) a += (i - (params.count - 1) / 2) * params.spread;
        this._spawnProj(params, px, py, a);
      }
    }
    this._castFX(px, py, params.color);
    wand.lastStepTime = time;

    // 마지막 주문이었는지 체크
    if (!this._hasMoreSpells(wand, idx)) {
      wand.isRecharging = true;
      wand.rechargeStart = time;
    }
    return true;
  }

  _hasMoreSpells(wand, fromIdx) {
    for (let i = fromIdx; i < wand.slotCount; i++) {
      const s = wand.slots[i];
      if (s && s.type === 'spell') return true;
    }
    return false;
  }

  // ── 투사체 생성 ──────────────────────────
  _spawnProj(params, x, y, angle) {
    const sprite = this.scene.physics.add.sprite(x, y, params.texKey);
    sprite.setDepth(8);
    this.projGroup.add(sprite);

    const proj = {
      sprite,
      params: { ...params },
      angle,
      createdAt: this.scene.time.now,
      hitEnemies: new Set(),
      lastTrailTime: 0,
      boomerangPhase: 0,
      originX: x, originY: y,
    };
    sprite.projData = proj;
    sprite.setVelocity(Math.cos(angle) * params.speed, Math.sin(angle) * params.speed);

    // 회전 (바람칼, 암석탄)
    if (params.texKey === 'proj_wind' || params.texKey === 'proj_rock') {
      sprite.setRotation(angle);
    }

    // 트레일
    const trail = this.scene.add.particles(0, 0, 'particle', {
      follow: sprite,
      scale: { start: 0.35, end: 0 },
      alpha: { start: 0.55, end: 0 },
      speed: 5, lifespan: 130, frequency: 35, tint: params.color
    }).setDepth(7);
    proj.trail = trail;

    this.projectiles.push(proj);
    return proj;
  }

  // ── 궤도 투사체 ──────────────────────────
  _spawnOrbit(params, px, py) {
    const count = Math.max(params.count, 3);
    for (let i = 0; i < count; i++) {
      const startA = (Math.PI * 2 / count) * i;
      const orb = this.scene.add.circle(px, py, params.size * 0.8, params.color, 0.8).setDepth(8);
      orb.setStrokeStyle(1, 0xffffff, 0.3);
      const proj = {
        sprite: orb, params: { ...params },
        isOrbit: true, orbitAngle: startA, orbitRadius: 85 + params.size * 2.5,
        createdAt: this.scene.time.now, hitEnemies: new Set(), lastDmgTime: 0,
      };
      this.projectiles.push(proj);
    }
  }

  // ── 비행 업데이트 ────────────────────────
  update(time, delta) {
    const player = this.scene.player;

    this.projectiles = this.projectiles.filter(proj => {
      const elapsed = time - proj.createdAt;
      if (elapsed > proj.params.lifetime) { this._destroy(proj); return false; }

      // 궤도
      if (proj.isOrbit) {
        proj.orbitAngle += delta * 0.003;
        proj.sprite.x = player.x + Math.cos(proj.orbitAngle) * proj.orbitRadius;
        proj.sprite.y = player.y + Math.sin(proj.orbitAngle) * proj.orbitRadius;
        if (time - proj.lastDmgTime > 180) {
          this.scene.enemies.getChildren().forEach(e => {
            if (!e.active) return;
            if (dist(proj.sprite, e) < proj.params.size + e.displayWidth * 0.4) {
              this.scene.damageEnemy(e, proj.params.damage * 0.25);
              proj.lastDmgTime = time;
            }
          });
        }
        return true;
      }

      if (!proj.sprite.active) { if (proj.trail) proj.trail.destroy(); return false; }

      // 유도
      if (proj.params.homing) {
        const near = this._nearest(proj.sprite.x, proj.sprite.y, proj.hitEnemies);
        if (near) {
          const desired = angleTo(proj.sprite, near);
          const cur = Math.atan2(proj.sprite.body.velocity.y, proj.sprite.body.velocity.x);
          let diff = desired - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const newA = cur + diff * proj.params.homingStr * (delta / 1000);
          proj.sprite.setVelocity(Math.cos(newA) * proj.params.speed, Math.sin(newA) * proj.params.speed);
          if (proj.params.texKey === 'proj_wind' || proj.params.texKey === 'proj_rock')
            proj.sprite.setRotation(newA);
        }
      }

      // 부메랑
      if (proj.params.boomerang) {
        if (elapsed > proj.params.lifetime / 2 && proj.boomerangPhase === 0) {
          proj.boomerangPhase = 1;
          proj.hitEnemies.clear();
        }
        if (proj.boomerangPhase === 1 && player) {
          const a = angleTo(proj.sprite, player);
          proj.sprite.setVelocity(Math.cos(a) * proj.params.speed * 1.2, Math.sin(a) * proj.params.speed * 1.2);
        }
      }

      // 궤적
      if (proj.params.trail && time - proj.lastTrailTime > 140) {
        proj.lastTrailTime = time;
        this._createZone(proj.sprite.x, proj.sprite.y, 18, proj.params.damage * 0.2, 1000, proj.params.color, null);
      }

      // 화면 밖
      if (player && dist(player, proj.sprite) > 850) { this._destroy(proj); return false; }
      return true;
    });

    // 데미지 존 업데이트
    this.damageZones = this.damageZones.filter(z => {
      if (time - z.createdAt > z.duration) return false;
      if (time - z.lastHit > 350) {
        z.lastHit = time;
        this.scene.enemies.getChildren().forEach(e => {
          if (!e.active) return;
          if (dist(z, e) < z.radius) {
            this.scene.damageEnemy(e, z.damage);
            if (z.effect === 'slow') e.slowUntil = time + 1000;
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
    proj.hitEnemies.add(enemy);
    const p = proj.params;

    // 1) 데미지
    this.scene.damageEnemy(enemy, p.damage);

    // 2) 고유 효과
    if (p.onHit === 'slow') {
      enemy.slowUntil = this.scene.time.now + 1500;
      enemy.setTint(0x88ccff);
      this.scene.time.delayedCall(1500, () => { if (enemy.active) enemy.clearTint(); });
    }
    if (p.onHit === 'knockback') {
      const a = angleTo(proj.sprite, enemy);
      enemy.body.velocity.x += Math.cos(a) * 220;
      enemy.body.velocity.y += Math.sin(a) * 220;
    }
    if (p.onHit === 'poison_zone') {
      this._createZone(enemy.x, enemy.y, 42, p.damage * 0.5, 2500, 0x44ff44, 'slow');
    }

    // 3) 폭발
    if (p.explode) this._explode(enemy.x, enemy.y, p.explodeR, p.damage * 0.5, p.color);

    // 4) 연발 (처치 시 재발사)
    if (p.trigger && enemy.hp <= 0) {
      const next = this._nearest(enemy.x, enemy.y, new Set([enemy]));
      if (next) {
        const tp = { ...p, trigger: false, fork: 0, chain: 0, damage: p.damage * 0.6 };
        this._spawnProj(tp, enemy.x, enemy.y, angleTo(enemy, next));
      }
    }

    // 5) 투사체 운명: 분열 > 연쇄 > 관통 > 소멸
    if (p.fork > 0) {
      const ba = angleTo(proj.sprite, enemy);
      for (let i = 0; i < 2; i++) {
        const fp = { ...p, fork: p.fork - 1, damage: p.damage * 0.6 };
        this._spawnProj(fp, enemy.x, enemy.y, ba + (i === 0 ? -0.5 : 0.5));
      }
      this._destroy(proj);
    } else if (p.chain > 0) {
      const next = this._nearest(enemy.x, enemy.y, proj.hitEnemies);
      if (next) {
        const a = angleTo(proj.sprite, next);
        proj.sprite.setPosition(enemy.x, enemy.y);
        proj.sprite.setVelocity(Math.cos(a) * p.speed, Math.sin(a) * p.speed);
        proj.params = { ...p, chain: p.chain - 1 };
        this._chainFX(enemy.x, enemy.y, next.x, next.y, p.color);
      } else { this._destroy(proj); }
    } else if (p.pierce > 0) {
      proj.params = { ...p, pierce: p.pierce - 1 };
    } else {
      this._destroy(proj);
    }
  }

  // ── 이펙트 헬퍼 ──────────────────────────
  _castFX(x, y, color) {
    const r = this.scene.add.circle(x, y, 8, color, 0.35).setDepth(12);
    this.scene.tweens.add({ targets: r, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 180, onComplete: () => r.destroy() });
  }

  _explode(x, y, radius, damage, color) {
    const c = this.scene.add.circle(x, y, radius, color, 0.4).setDepth(15);
    c.setStrokeStyle(2, 0xffffff, 0.5);
    this.scene.tweens.add({ targets: c, scaleX: 1.3, scaleY: 1.3, alpha: 0, duration: 300, onComplete: () => c.destroy() });
    for (let i = 0; i < 8; i++) {
      const p = this.scene.add.circle(x, y, 3, color, 1).setDepth(15);
      const a = (Math.PI * 2 / 8) * i;
      this.scene.tweens.add({
        targets: p, x: x + Math.cos(a) * radius * 1.3, y: y + Math.sin(a) * radius * 1.3,
        alpha: 0, duration: 280, onComplete: () => p.destroy()
      });
    }
    this.scene.enemies.getChildren().forEach(e => {
      if (e.active && dist({ x, y }, e) < radius) this.scene.damageEnemy(e, damage);
    });
    this.scene.cameras.main.shake(70, 0.005);
  }

  _createZone(x, y, radius, damage, duration, color, effect) {
    const vis = this.scene.add.circle(x, y, radius, color, 0.18).setDepth(3);
    vis.setStrokeStyle(1.5, color, 0.4);
    this.scene.tweens.add({ targets: vis, alpha: 0, duration, onComplete: () => vis.destroy() });
    this.damageZones.push({ x, y, radius, damage, effect, createdAt: this.scene.time.now, duration, lastHit: 0 });
  }

  _chainFX(x1, y1, x2, y2, color) {
    const g = this.scene.add.graphics().setDepth(15);
    g.lineStyle(2.5, color, 0.8);
    g.beginPath(); g.moveTo(x1, y1);
    const segs = 5;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const mx = x1 + (x2 - x1) * t + (i < segs ? (Math.random() - 0.5) * 22 : 0);
      const my = y1 + (y2 - y1) * t + (i < segs ? (Math.random() - 0.5) * 22 : 0);
      g.lineTo(mx, my);
    }
    g.strokePath();
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  _destroy(proj) {
    if (proj.trail?.destroy) proj.trail.destroy();
    if (proj.sprite?.destroy) proj.sprite.destroy();
  }

  _nearest(x, y, exclude, range = 300) {
    let best = null, bestD = range;
    this.scene.enemies.getChildren().forEach(e => {
      if (!e.active || exclude?.has(e)) return;
      const d = dist({ x, y }, e);
      if (d < bestD) { best = e; bestD = d; }
    });
    return best;
  }

  cleanup() {
    this.projectiles.forEach(p => this._destroy(p));
    this.projectiles = [];
    this.damageZones = [];
  }
}
