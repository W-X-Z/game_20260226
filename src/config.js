// ============================================================
// config.js - 게임 전체 상수 및 데이터 정의
// ============================================================

// ===== 게임 설정 =====
export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 768;
export const WORLD_SIZE = 4000;
export const PLAYER_SPEED = 200;
export const PLAYER_MAX_HP = 100;
export const XP_PER_LEVEL_BASE = 20;
export const XP_LEVEL_SCALE = 1.3;
export const MAX_INVENTORY = 16;

// ===== 아이템 드롭 =====
export const DROP_RATE_NORMAL = 0.08;
export const DROP_RATE_BOSS = 1.0;
export const BOSS_DROP_COUNT = 3;
export const DROP_LIFETIME = 12000;

// ===== 지팡이 템플릿 =====
// Noita 스타일: 슬롯 수, 캐스트 딜레이, 리차지 타임
export const WAND_TEMPLATES = {
  starter: { id: 'starter', name: '견습 지팡이', slots: 4, castDelay: 200, recharge: 500, color: 0x8888aa },
  quick:   { id: 'quick',   name: '신속 지팡이', slots: 3, castDelay: 100, recharge: 300, color: 0x44ccff },
  heavy:   { id: 'heavy',   name: '중량 지팡이', slots: 6, castDelay: 350, recharge: 800, color: 0xcc8844 },
  arcane:  { id: 'arcane',  name: '비전 지팡이', slots: 8, castDelay: 180, recharge: 600, color: 0xcc44ff }
};

// ===== 기본 주문 (Base Spells) =====
// 지팡이 슬롯에 배치하는 발사체 스킬
export const BASE_SPELLS = {
  fireball: {
    id: 'fireball', name: '화염구', icon: '🔥',
    color: 0xff4422, damage: 14, speed: 300, size: 8,
    lifetime: 1800, texKey: 'proj_fire',
    desc: '불덩이를 발사합니다'
  },
  ice_shard: {
    id: 'ice_shard', name: '빙결탄', icon: '❄️',
    color: 0x44ccff, damage: 9, speed: 260, size: 6,
    lifetime: 1600, texKey: 'proj_ice',
    onHit: 'slow',
    desc: '적을 둔화시키는 얼음 파편'
  },
  lightning: {
    id: 'lightning', name: '전격', icon: '⚡',
    color: 0xffff44, damage: 6, speed: 550, size: 4,
    lifetime: 700, texKey: 'proj_bolt',
    desc: '빠르고 관통력 있는 전격'
  },
  poison_glob: {
    id: 'poison_glob', name: '독액', icon: '🧪',
    color: 0x44ff44, damage: 5, speed: 200, size: 12,
    lifetime: 1200, texKey: 'proj_poison',
    onHit: 'poison_zone',
    desc: '착탄 시 독 지대 생성'
  },
  wind_blade: {
    id: 'wind_blade', name: '바람칼', icon: '💨',
    color: 0xccccff, damage: 7, speed: 350, size: 14,
    lifetime: 900, texKey: 'proj_wind',
    onHit: 'knockback',
    desc: '넓은 범위의 바람칼'
  },
  rock_shot: {
    id: 'rock_shot', name: '암석탄', icon: '🪨',
    color: 0xccaa44, damage: 30, speed: 170, size: 16,
    lifetime: 2200, texKey: 'proj_rock',
    desc: '느리지만 강력한 바위'
  },
  spark_bolt: {
    id: 'spark_bolt', name: '마력탄', icon: '✴️',
    color: 0xcc88ff, damage: 4, speed: 500, size: 4,
    lifetime: 400, texKey: 'proj_spark',
    desc: '초고속 소형 마력탄 — 속사 빌드용'
  },
  void_orb: {
    id: 'void_orb', name: '공허구', icon: '🌑',
    color: 0x6622aa, damage: 12, speed: 80, size: 18,
    lifetime: 3000, texKey: 'proj_void',
    gravity: true,
    desc: '주변 적을 끌어당기는 느린 구체'
  },
  nova: {
    id: 'nova', name: '노바', icon: '💫',
    color: 0xff88ff, damage: 8, speed: 250, size: 6,
    lifetime: 600, texKey: 'proj_nova',
    castPattern: 'radial',
    desc: '전방위 8발 방사형 발사'
  }
};

// ===== 모디파이어 =====
// Noita 스타일: 지팡이 슬롯에서 다음 주문에 효과 적용
export const MODIFIERS = {
  multi_shot: {
    id: 'multi_shot', name: '다중 발사', icon: '🔱',
    desc: '투사체 +2개 (부채꼴)', color: 0xff8844, maxStack: 3
  },
  pierce: {
    id: 'pierce', name: '관통', icon: '🗡️',
    desc: '적 1체 관통', color: 0xaaaaff, maxStack: 5
  },
  homing: {
    id: 'homing', name: '유도', icon: '🎯',
    desc: '가까운 적을 추적', color: 0xff44ff, maxStack: 3
  },
  chain: {
    id: 'chain', name: '연쇄', icon: '⛓️',
    desc: '명중 시 인근 적에게 튕김', color: 0xffaa44, maxStack: 4
  },
  fork: {
    id: 'fork', name: '분열', icon: '🔀',
    desc: '명중 시 2갈래 분열', color: 0x44ffaa, maxStack: 2
  },
  explode: {
    id: 'explode', name: '폭발', icon: '💥',
    desc: '명중 시 범위 폭발', color: 0xff4444, maxStack: 3
  },
  orbit: {
    id: 'orbit', name: '궤도', icon: '🌀',
    desc: '플레이어 주위를 공전', color: 0x8888ff, maxStack: 1
  },
  boomerang: {
    id: 'boomerang', name: '부메랑', icon: '🪃',
    desc: '되돌아오는 투사체', color: 0x88ff88, maxStack: 1
  },
  rapid: {
    id: 'rapid', name: '가속', icon: '⏩',
    desc: '투사체 속도 +50%', color: 0xffff88, maxStack: 2
  },
  heavy: {
    id: 'heavy', name: '강화', icon: '🔨',
    desc: '피해 +60%, 속도 -25%', color: 0xcc8844, maxStack: 3
  },
  trail: {
    id: 'trail', name: '궤적', icon: '✨',
    desc: '비행 경로에 데미지 지대', color: 0xff88ff, maxStack: 1
  },
  trigger: {
    id: 'trigger', name: '연발', icon: '🔄',
    desc: '처치 시 해당 위치에서 재발사', color: 0x44ff44, maxStack: 1
  },
  leech: {
    id: 'leech', name: '흡혈', icon: '🩸',
    desc: '명중 시 피해의 15% 회복', color: 0xcc2244, maxStack: 3
  },
  gravity_well: {
    id: 'gravity_well', name: '중력장', icon: '🕳️',
    desc: '투사체가 주변 적을 끌어당김', color: 0x4422aa, maxStack: 2
  },
  double_cast: {
    id: 'double_cast', name: '이중시전', icon: '🔁',
    desc: '투사체 +1개 (집중)', color: 0xff88ff, maxStack: 2
  },
  timer_split: {
    id: 'timer_split', name: '시한분열', icon: '⏰',
    desc: '0.4초 후 3갈래로 분열', color: 0xffaa22, maxStack: 1
  },
  bounce: {
    id: 'bounce', name: '반사', icon: '🔲',
    desc: '원거리에서 2회 반사, 재명중 가능', color: 0x44aaff, maxStack: 3
  },
  enlarge: {
    id: 'enlarge', name: '거대화', icon: '🔍',
    desc: '시간에 따라 크기·위력 증가', color: 0xeeaa44, maxStack: 2
  }
};

// ===== 적 유형 =====
export const ENEMY_TYPES = {
  slime:    { name: '슬라임',  color: 0x33bb33, hp: 20,  speed: 55,  damage: 5,  size: 14, xp: 5,  shape: 'circle' },
  bat:      { name: '박쥐',    color: 0x9944aa, hp: 10,  speed: 135, damage: 3,  size: 10, xp: 4,  shape: 'triangle' },
  skeleton: { name: '해골',    color: 0xccccaa, hp: 35,  speed: 75,  damage: 8,  size: 16, xp: 8,  shape: 'rect' },
  ghost:    { name: '유령',    color: 0x7777ee, hp: 25,  speed: 95,  damage: 6,  size: 15, xp: 7,  shape: 'diamond' },
  golem:    { name: '골렘',    color: 0x886644, hp: 100, speed: 32,  damage: 15, size: 24, xp: 20, shape: 'rect' },
  swarm:    { name: '벌레',    color: 0xaaaa22, hp: 5,   speed: 155, damage: 2,  size: 6,  xp: 2,  shape: 'circle' },
  mage:     { name: '마법사',  color: 0xcc44cc, hp: 30,  speed: 48,  damage: 10, size: 14, xp: 12, shape: 'diamond', ranged: true },
  boss:     { name: '오우거',  color: 0xdd2222, hp: 500, speed: 42,  damage: 25, size: 38, xp: 100, shape: 'rect', boss: true }
};

// ===== 웨이브 설정 =====
export const WAVE_CONFIG = [
  { time: 0,   types: ['slime'],                              rate: 1500, max: 15 },
  { time: 30,  types: ['slime', 'bat'],                       rate: 1300, max: 20 },
  { time: 60,  types: ['slime', 'bat', 'skeleton'],           rate: 1100, max: 25 },
  { time: 90,  types: ['bat', 'skeleton', 'ghost'],           rate: 1000, max: 30, boss: true },
  { time: 120, types: ['skeleton', 'ghost', 'swarm'],         rate: 900,  max: 35 },
  { time: 150, types: ['ghost', 'swarm', 'mage'],             rate: 800,  max: 40 },
  { time: 180, types: ['skeleton', 'golem', 'mage'],          rate: 700,  max: 40, boss: true },
  { time: 210, types: ['golem', 'mage', 'swarm', 'ghost'],    rate: 600,  max: 50 },
  { time: 240, types: ['golem', 'mage', 'swarm', 'skeleton'], rate: 500,  max: 60, boss: true },
  { time: 300, types: ['golem', 'mage', 'swarm', 'ghost'],    rate: 400,  max: 80, boss: true },
  { time: 360, types: ['golem', 'mage', 'swarm', 'skeleton', 'ghost'], rate: 350, max: 100, boss: true },
  { time: 420, types: ['golem', 'mage', 'swarm', 'skeleton', 'ghost'], rate: 300, max: 120, boss: true },
  { time: 480, types: ['golem', 'mage', 'swarm', 'skeleton', 'ghost'], rate: 250, max: 150, boss: true },
  { time: 540, types: ['golem', 'mage', 'swarm', 'skeleton', 'ghost'], rate: 200, max: 180, boss: true }
];
