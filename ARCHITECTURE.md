# Elemental Survivor — 아키텍처 문서

## 개요

**Elemental Survivor**는 Phaser 3 기반 웹 브라우저 게임입니다.  
PoE(Path of Exile)의 서포트 젬 / Noita의 주문 개조 시스템에서 영감을 받은 **메커니즘 조합**이 핵심이며,  
뱀파이어 서바이벌 스타일의 웨이브 생존 장르를 결합했습니다.

---

## 핵심 게임 메커니즘

### 주문 슬롯 시스템 (Spell Slot System)

```
SpellSlot = 기본 주문(Base Spell) + 모디파이어(Modifier)[]
```

| 개념 | PoE 대응 | Noita 대응 | 본 게임 |
|------|---------|-----------|---------|
| 기본 능력 | 액티브 스킬 젬 | 기본 주문 | `BASE_SPELLS` |
| 메커니즘 변형 | 서포트 젬 | 주문 개조 | `MODIFIERS` |
| 장착 구조 | 링크 소켓 | 지팡이 슬롯 | `SpellSlot` |

**플레이어는 최대 4개의 주문 슬롯을 보유하며, 각 슬롯에 최대 4개의 모디파이어를 장착합니다.**  
마우스 클릭 시 모든 준비된 주문 슬롯이 동시에 발사됩니다.

### 모디파이어 적용 단계

모디파이어는 투사체 생명주기의 3단계에 영향을 줍니다:

```
[CAST] ────→ [FLIGHT] ────→ [HIT]
 │              │              │
 ├ multi_shot   ├ homing       ├ pierce
 ├ rapid        ├ orbit        ├ chain
 └ heavy        ├ boomerang    ├ fork
                └ trail        ├ explode
                               └ trigger
```

### 조합 예시 (빌드 시너지)

| 빌드 | 구성 | 결과 |
|------|------|------|
| 유도 폭격기 | 화염구 + 다중발사 + 유도 + 폭발 | 3발의 유도 화염구가 각각 폭발 |
| 분열 번개 | 전격 + 분열 + 분열 + 연쇄 | 2→4 분열 후 각각 연쇄 |
| 궤도 방패 | 빙결탄 + 궤도 + 다중발사 | 5개 빙결구가 플레이어 주위 공전 |
| 기관총 | 전격 + 속사 + 속사 + 관통 | 초고속 연사 + 관통 |
| 지뢰 세팅 | 독액 + 폭발 + 궤적 + 강화 | 경로에 독 지대 + 착탄 시 대폭발 |

---

## 프로젝트 구조

```
Game/
├── index.html                # HTML 엔트리 (Phaser CDN + ES 모듈)
├── ARCHITECTURE.md           # 이 문서
└── src/
    ├── main.js               # Phaser 게임 설정 & 시작
    ├── config.js             # 모든 상수/데이터 정의
    ├── utils.js              # 유틸리티 함수 (dist, angle, lerp 등)
    ├── scenes/
    │   ├── BootScene.js      # 프로시저럴 텍스처 생성
    │   ├── MenuScene.js      # 메인 메뉴 화면
    │   ├── GameScene.js      # 메인 게임 루프 (플레이어, 입력, 레벨업)
    │   └── UIScene.js        # HUD 오버레이 (HP, XP, 슬롯, 레벨업 UI)
    └── systems/
        ├── SpellSystem.js    # 주문 발사/비행/명중 엔진 + SpellSlot 클래스
        └── EnemySystem.js    # 적 스폰/AI/웨이브 관리
```

### 파일별 역할

| 파일 | 책임 | 주요 export |
|------|------|------------|
| `config.js` | 게임 밸런스 상수, 주문/모디파이어/적/웨이브 데이터 | `GAME_WIDTH`, `BASE_SPELLS`, `MODIFIERS`, `ENEMY_TYPES`, `WAVE_CONFIG` |
| `utils.js` | 거리/각도 계산, 셔플 등 순수 함수 | `dist`, `angleTo`, `lerp`, `shuffle` |
| `SpellSystem.js` | **핵심 엔진** — 모디파이어 적용, 투사체 생성/비행 업데이트/명중 처리 | `SpellSlot`, `SpellSystem` |
| `EnemySystem.js` | 웨이브 기반 적 스폰, 추적 AI, 원거리 공격 | `EnemySystem` |
| `GameScene.js` | 게임 루프 오케스트레이션, 플레이어 이동, 마우스 입력, 레벨업 선택 | `GameScene` |
| `UIScene.js` | 모든 HUD 요소 렌더링, 레벨업 카드 UI, 게임오버 화면 | `UIScene` |

---

## 데이터 모델

### BASE_SPELLS (기본 주문)

```javascript
{
  id: string,           // 고유 식별자
  name: string,         // 표시 이름
  icon: string,         // 이모지 아이콘
  color: number,        // 0xRRGGBB 색상
  damage: number,       // 기본 피해량
  speed: number,        // 투사체 속도 (px/s)
  size: number,         // 투사체 크기
  cooldown: number,     // 발사 간격 (ms)
  lifetime: number,     // 투사체 수명 (ms)
  onHit: string|null,   // 고유 명중 효과 ('slow', 'knockback', 'poison_zone')
  desc: string          // 설명 텍스트
}
```

### MODIFIERS (모디파이어)

```javascript
{
  id: string,           // 고유 식별자
  name: string,         // 표시 이름
  icon: string,         // 이모지 아이콘
  desc: string,         // 설명
  color: number,        // UI 색상
  maxStack: number      // 같은 슬롯에 중복 장착 가능 횟수
}
```

### SpellSlot (주문 빌드)

```javascript
class SpellSlot {
  baseSpell: BASE_SPELL     // 기본 주문 참조
  modifiers: string[]       // 장착된 모디파이어 id 배열 (중복 = 스택)
  lastCastTime: number      // 마지막 발사 시각

  computeParams(level)      // 모디파이어 반영 최종 파라미터 계산
  canAddModifier(id)        // 장착 가능 여부 확인
  addModifier(id)           // 모디파이어 추가
  describe()                // 빌드 요약 문자열
}
```

---

## 투사체 명중 처리 흐름 (SpellSystem.onHit)

```
적에게 명중
  │
  ├─ 1. 데미지 적용
  ├─ 2. 기본 주문 고유 효과 (slow / knockback / poison_zone)
  ├─ 3. [폭발 모디파이어] → AoE 폭발 생성
  ├─ 4. [연발 모디파이어 + 적 사망] → 해당 위치에서 재발사
  │
  └─ 5. 투사체 운명 결정 (우선순위):
       ├─ fork  있음? → 2갈래 분열, 원본 소멸
       ├─ chain 있음? → 인근 적으로 방향 전환
       ├─ pierce 있음? → 관통하여 비행 계속
       └─ 없음 → 소멸
```

---

## 웨이브 시스템

시간 기반으로 적 종류/스폰 속도/최대 수가 증가합니다.  
`WAVE_CONFIG`의 `time` 필드(초)에 도달하면 자동 전환됩니다.  
보스 웨이브 진입 시 화면 흔들림 + 경고 텍스트가 표시됩니다.

### 적 스케일링

적의 HP는 `basHP × (1 + 경과시간 × 0.004)`로 시간에 따라 증가합니다.

---

## 레벨업 시스템

적 처치 → XP 오브 드롭 → 수집 → XP 바 충전 → 레벨업

레벨업 시 3가지 선택지 중 하나를 고릅니다:

| 유형 | 설명 |
|------|------|
| 모디파이어 추가 | 기존 주문 슬롯에 모디파이어 장착 |
| 새 주문 | 새로운 기본 주문 슬롯 추가 (최대 4개) |
| 패시브 | HP/이속/자석/회복/방어 스탯 강화 |

선택 카드에는 **미리보기**가 표시되어 조합 결과를 확인할 수 있습니다.

---

## 확장 가이드

### 새 기본 주문 추가

1. `config.js`의 `BASE_SPELLS`에 새 항목 추가
2. 특수 `onHit` 효과가 있다면 `SpellSystem.onHit()`에 처리 로직 추가
3. `BootScene.js`에서 별도 텍스처가 필요하면 추가 (기본은 `bullet` 공용)

### 새 모디파이어 추가

1. `config.js`의 `MODIFIERS`에 새 항목 추가
2. `SpellSlot.computeParams()`에 해당 modifier의 파라미터 변형 로직 추가
3. `SpellSystem`에서 해당 동작이 발생하는 단계(cast/flight/hit)에 구현:
   - **cast 단계**: `SpellSystem.cast()` 내부
   - **flight 단계**: `SpellSystem.update()` 내부
   - **hit 단계**: `SpellSystem.onHit()` 내부

### 새 적 유형 추가

1. `config.js`의 `ENEMY_TYPES`에 새 항목 추가
2. `BootScene.js`에서 해당 키로 텍스처 자동 생성됨
3. `WAVE_CONFIG`의 `types` 배열에 추가하여 웨이브에 등장시킴
4. 특수 AI가 필요하면 `EnemySystem._updateAI()`에 분기 추가

---

## 기술 스택

| 기술 | 버전 | 용도 |
|------|------|------|
| Phaser 3 | 3.60.0 (CDN) | 게임 엔진 (렌더링, 물리, 입력) |
| ES Modules | native | 모듈 시스템 |
| 그래픽 | 프로시저럴 | 모든 텍스처를 코드로 생성 (외부 에셋 없음) |

### 실행 방법

```bash
# 로컬 서버 실행 (ES 모듈은 file:// 에서 동작하지 않음)
cd Game
python3 -m http.server 8080
# → http://localhost:8080 접속
```

---

## 조작법

| 입력 | 동작 |
|------|------|
| WASD / 방향키 | 플레이어 이동 |
| 마우스 좌클릭 | 주문 발사 (커서 방향) |
| 레벨업 시 카드 클릭 | 강화 선택 |
