// ============================================================
// config.js - 게임 전체 상수 및 데이터 정의
// ============================================================

// ===== 게임 설정 =====
export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 768;
export const WORLD_SIZE = 4000;
export const PLAYER_SPEED = 200;
export const PLAYER_MAX_HP = 100;
export const XP_PER_LEVEL_BASE = 12;
export const XP_LEVEL_SCALE = 1.25;
export const MAX_SPELL_SLOTS = 4;
export const MAX_MODIFIERS_PER_SLOT = 4;

// ===== 기본 주문 (Base Spells) =====
// PoE의 액티브 스킬 젬에 해당
// 각 주문은 고유한 발사체 특성을 가짐
export const BASE_SPELLS = {
  fireball: {
    id: 'fireball', name: '화염구', icon: '🔥',
    color: 0xff4422, damage: 12, speed: 320, size: 6,
    cooldown: 450, lifetime: 1500,
    onHit: null,
    desc: '불덩이를 발사합니다'
  },
  ice_shard: {
    id: 'ice_shard', name: '빙결탄', icon: '❄️',
    color: 0x44ccff, damage: 8, speed: 280, size: 5,
    cooldown: 550, lifetime: 1400,
    onHit: 'slow',
    desc: '적을 둔화시키는 얼음 파편'
  },
  lightning: {
    id: 'lightning', name: '전격', icon: '⚡',
    color: 0xffff44, damage: 6, speed: 600, size: 3,
    cooldown: 250, lifetime: 600,
    onHit: null,
    desc: '매우 빠르고 연사가 빠른 전격'
  },
  poison_glob: {
    id: 'poison_glob', name: '독액', icon: '🧪',
    color: 0x44ff44, damage: 4, speed: 200, size: 9,
    cooldown: 900, lifetime: 1200,
    onHit: 'poison_zone',
    desc: '착탄 지점에 독 지대를 생성'
  },
  wind_blade: {
    id: 'wind_blade', name: '바람칼', icon: '💨',
    color: 0xccccff, damage: 6, speed: 380, size: 10,
    cooldown: 350, lifetime: 800,
    onHit: 'knockback',
    desc: '넓은 범위의 바람칼, 밀어내기'
  },
  rock_shot: {
    id: 'rock_shot', name: '암석탄', icon: '🪨',
    color: 0xaa8844, damage: 28, speed: 180, size: 14,
    cooldown: 1100, lifetime: 2000,
    onHit: null,
    desc: '느리지만 강력한 바위 발사체'
  }
};

// ===== 모디파이어 (Modifiers) =====
// PoE의 서포트 젬 / Noita의 주문 개조에 해당
// 기본 주문에 장착하여 메커니즘을 변형
export const MODIFIERS = {
  multi_shot: {
    id: 'multi_shot', name: '다중 발사', icon: '🔱',
    desc: '투사체 +2개 (부채꼴)',
    color: 0xff8844, maxStack: 3
  },
  pierce: {
    id: 'pierce', name: '관통', icon: '🗡️',
    desc: '적 1체 관통 (스택당 +1)',
    color: 0xaaaaff, maxStack: 5
  },
  homing: {
    id: 'homing', name: '유도', icon: '🎯',
    desc: '가까운 적을 향해 유도',
    color: 0xff44ff, maxStack: 3
  },
  chain: {
    id: 'chain', name: '연쇄', icon: '⛓️',
    desc: '명중 시 인근 적에게 튕김 +1',
    color: 0xffaa44, maxStack: 4
  },
  fork: {
    id: 'fork', name: '분열', icon: '🔀',
    desc: '명중 시 2갈래로 분열',
    color: 0x44ffaa, maxStack: 2
  },
  explode: {
    id: 'explode', name: '폭발', icon: '💥',
    desc: '명중 시 범위 폭발 (스택=반경↑)',
    color: 0xff4444, maxStack: 3
  },
  orbit: {
    id: 'orbit', name: '궤도', icon: '🌀',
    desc: '플레이어 주위를 공전',
    color: 0x8888ff, maxStack: 1
  },
  boomerang: {
    id: 'boomerang', name: '부메랑', icon: '🪃',
    desc: '투사체가 되돌아옴',
    color: 0x88ff88, maxStack: 1
  },
  rapid: {
    id: 'rapid', name: '속사', icon: '⏩',
    desc: '쿨다운 30% 감소',
    color: 0xffff88, maxStack: 3
  },
  heavy: {
    id: 'heavy', name: '강화', icon: '🔨',
    desc: '피해 +50%, 속도 -20%',
    color: 0xcc8844, maxStack: 3
  },
  trail: {
    id: 'trail', name: '궤적', icon: '✨',
    desc: '비행 경로에 데미지 지대 생성',
    color: 0xff88ff, maxStack: 1
  },
  trigger: {
    id: 'trigger', name: '연발', icon: '🔄',
    desc: '적 처치 시 해당 위치에서 재발사',
    color: 0x44ff44, maxStack: 1
  }
};

// ===== 패시브 업그레이드 =====
export const PASSIVES = [
  { id: 'hp_up', name: '❤️ 체력 증가', desc: '최대 HP +20', color: 0xff4444 },
  { id: 'speed_up', name: '👟 이동속도', desc: '이동속도 +15%', color: 0x44ff44 },
  { id: 'magnet_up', name: '🧲 자석 범위', desc: 'XP 수집 범위 +30', color: 0x44ffff },
  { id: 'heal', name: '💚 즉시 회복', desc: 'HP 50% 회복', color: 0x44ff88 },
  { id: 'armor', name: '🛡️ 방어력', desc: '받는 피해 -10%', color: 0x8888aa }
];

// ===== 적 유형 =====
export const ENEMY_TYPES = {
  slime:    { name: '슬라임',   color: 0x44cc44, hp: 20,  speed: 60,  damage: 5,  size: 12, xp: 5,  shape: 'circle' },
  bat:      { name: '박쥐',     color: 0x884488, hp: 10,  speed: 140, damage: 3,  size: 8,  xp: 4,  shape: 'triangle' },
  skeleton: { name: '해골',     color: 0xccccaa, hp: 35,  speed: 80,  damage: 8,  size: 14, xp: 8,  shape: 'rect' },
  ghost:    { name: '유령',     color: 0x8888ff, hp: 25,  speed: 100, damage: 6,  size: 13, xp: 7,  shape: 'diamond' },
  golem:    { name: '골렘',     color: 0x886644, hp: 100, speed: 35,  damage: 15, size: 22, xp: 20, shape: 'rect' },
  swarm:    { name: '벌레',     color: 0xaaaa22, hp: 5,   speed: 160, damage: 2,  size: 5,  xp: 2,  shape: 'circle' },
  mage:     { name: '마법사',   color: 0xcc44cc, hp: 30,  speed: 50,  damage: 10, size: 12, xp: 12, shape: 'diamond', ranged: true },
  boss:     { name: '오우거',   color: 0xcc2222, hp: 500, speed: 45,  damage: 25, size: 35, xp: 100, shape: 'rect', boss: true }
};

// ===== 웨이브 설정 =====
export const WAVE_CONFIG = [
  { time: 0,   types: ['slime'],                             rate: 1500, max: 15 },
  { time: 30,  types: ['slime', 'bat'],                      rate: 1300, max: 20 },
  { time: 60,  types: ['slime', 'bat', 'skeleton'],          rate: 1100, max: 25 },
  { time: 90,  types: ['bat', 'skeleton', 'ghost'],          rate: 1000, max: 30, boss: true },
  { time: 120, types: ['skeleton', 'ghost', 'swarm'],        rate: 900,  max: 35 },
  { time: 150, types: ['ghost', 'swarm', 'mage'],            rate: 800,  max: 40 },
  { time: 180, types: ['skeleton', 'golem', 'mage'],         rate: 700,  max: 40, boss: true },
  { time: 210, types: ['golem', 'mage', 'swarm', 'ghost'],   rate: 600,  max: 50 },
  { time: 240, types: ['golem', 'mage', 'swarm', 'skeleton'],rate: 500,  max: 60, boss: true },
  { time: 300, types: ['golem', 'mage', 'swarm', 'ghost'],   rate: 400,  max: 80, boss: true }
];
