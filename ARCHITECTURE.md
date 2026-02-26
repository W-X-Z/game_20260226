# Elemental Survivor — 아키텍처 문서

## 개요

Phaser 3 기반 웹 브라우저 게임. Noita의 **지팡이(Wand) 시스템**과 PoE의 **서포트 젬** 메커니즘에서 영감을 받은 **주문 조합 크래프팅**이 핵심입니다. 뱀파이어 서바이벌 스타일의 웨이브 생존 장르를 결합했습니다.

---

## 핵심 메커니즘: 지팡이 시스템

### Noita 스타일 슬롯 실행

```
지팡이 슬롯: [모디A] [모디B] [주문1] [모디C] [주문2]
                                ↑                 ↑
                      모디A+모디B 적용      모디C 적용
```

**규칙:**
1. 슬롯을 왼쪽→오른쪽 순서대로 실행
2. **모디파이어**를 만나면 누적 스택에 추가
3. **주문**을 만나면 누적된 모디파이어를 적용하여 발사 → 스택 초기화
4. 모든 주문 발사 후 `rechargeTime`만큼 대기 → 처음부터 반복
5. 지팡이의 `castDelay`가 주문 간 딜레이를 결정

### 플레이어 조합 루프

```
적 처치 → XP → 레벨업 → 아이템 획득 (인벤토리)
                                    ↓
                          TAB → 지팡이 편집 UI
                                    ↓
                        슬롯에 수동 배치 → 빌드 완성
```

**핵심: 아이템은 자동 적용되지 않습니다. 플레이어가 직접 배치합니다.**

### 빌드 예시

| 빌드 | 지팡이 구성 | 결과 |
|------|-----------|------|
| 유도 폭격기 | `[🔱다중] [💥폭발] [🔥화염구]` | 3발 화염구, 각각 폭발 |
| 분열 번개 | `[🔀분열] [🔀분열] [⚡전격]` | 전격이 2→4갈래 분열 |
| 연쇄 냉기 | `[🎯유도] [⛓️연쇄] [⛓️연쇄] [❄️빙결탄]` | 유도 빙결탄이 3회 연쇄 |
| 궤도 방패 | `[🌀궤도] [🔱다중] [🪨암석탄]` | 5개 바위가 플레이어 주위 공전 |
| 독 기관총 | `[⏩가속] [⏩가속] [🗡️관통] [🧪독액]` | 초고속 관통 독액 |
| 부메랑 폭발 | `[🪃부메랑] [💥폭발] [💨바람칼]` | 돌아오는 바람칼 + 명중 시 폭발 |

---

## 프로젝트 구조

```
Game/
├── index.html                # HTML 엔트리 (Phaser CDN + ES 모듈)
├── ARCHITECTURE.md           # 이 문서
├── README.md                 # 사용자용 문서
└── src/
    ├── main.js               # Phaser 설정 & 시작
    ├── config.js             # 상수/데이터 정의
    ├── utils.js              # 유틸리티 함수
    ├── scenes/
    │   ├── BootScene.js      # 프로시저럴 텍스처 생성
    │   ├── MenuScene.js      # 메인 메뉴
    │   ├── GameScene.js      # 메인 게임 (플레이어, 입력, 인벤토리, 레벨업)
    │   └── UIScene.js        # HUD + 크래프팅 UI + 레벨업 카드
    └── systems/
        ├── SpellSystem.js    # Wand 클래스 + 지팡이 실행 엔진 + 투사체 물리
        └── EnemySystem.js    # 적 스폰/AI/웨이브 관리
```

---

## 데이터 모델

### Wand (지팡이)

```javascript
class Wand {
  id: string              // 템플릿 ID
  name: string            // 표시 이름
  slotCount: number       // 슬롯 수 (3~8)
  castDelay: number       // 주문 간 딜레이 (ms)
  rechargeTime: number    // 전체 사이클 후 대기 (ms)
  slots: (SlotItem|null)[] // 슬롯 배열

  // 실행 상태
  execIdx: number         // 현재 실행 위치
  isRecharging: boolean   // 리차지 중 여부
}

// SlotItem = { type: 'spell'|'modifier', id: string }
```

### 투사체 파라미터 계산

`computeParams(spellId, modifiers[], level)` 함수가 모디파이어 스택을 기본 주문에 적용하여 최종 투사체 파라미터를 계산합니다.

### 인벤토리

`GameScene.inventory: SlotItem[]` — 최대 16개 아이템. 레벨업 보상으로 획득하고, TAB UI에서 지팡이 슬롯에 수동 배치합니다.

---

## 투사체 명중 흐름

```
적에게 명중
  │
  ├─ 1. 데미지 적용
  ├─ 2. 기본 주문 고유 효과 (slow / knockback / poison_zone)
  ├─ 3. [폭발] → AoE 폭발
  ├─ 4. [연발 + 적 사망] → 재발사
  │
  └─ 5. 투사체 운명 (우선순위):
       ├─ fork → 2갈래 분열, 원본 소멸
       ├─ chain → 인근 적으로 전환
       ├─ pierce → 관통 비행 계속
       └─ 없음 → 소멸
```

---

## 시각 체계

### 투사체 텍스처 차별화

각 주문은 고유한 프로시저럴 텍스처를 가집니다:

| 주문 | 텍스처 | 특징 |
|------|--------|------|
| 화염구 | `proj_fire` | 빛나는 오렌지 원 + 코어 |
| 빙결탄 | `proj_ice` | 파란 다이아몬드 |
| 전격 | `proj_bolt` | 노란 볼트 |
| 독액 | `proj_poison` | 녹색 불규칙 원 |
| 바람칼 | `proj_wind` | 흰 초승달 |
| 암석탄 | `proj_rock` | 갈색 큰 사각형 |

### 적 시각 구분

- 고유 실루엣 (원, 사각, 삼각, 다이아몬드)
- 반투명 흰색 외곽선
- 그림자 효과
- 체력 바 (피해 시 표시)
- 보스는 2배 크기 + 붉은 눈

### 배경

- 매우 어두운 바닥 (`0x0e0e1e`)
- 미세한 격자 패턴
- 밝은 투사체와 높은 대비

---

## 확장 가이드

### 새 기본 주문

1. `config.js`의 `BASE_SPELLS`에 추가
2. `BootScene.js`의 `_makeProjectiles()`에 텍스처 추가
3. 특수 `onHit`이 있으면 `SpellSystem.onHit()`에 처리 추가

### 새 모디파이어

1. `config.js`의 `MODIFIERS`에 추가
2. `SpellSystem.js`의 `computeParams()`에 파라미터 변형 추가
3. 비행/명중 단계 동작이 필요하면 `SpellSystem.update()`나 `onHit()`에 구현

### 새 지팡이 타입

1. `config.js`의 `WAND_TEMPLATES`에 추가
2. 자동으로 레벨업 보상 풀에 포함됨

### 새 적

1. `config.js`의 `ENEMY_TYPES`에 추가 → 텍스처 자동 생성
2. `WAVE_CONFIG`의 `types`에 추가

---

## 실행 방법

```bash
cd Game
python3 -m http.server 8080
# → http://localhost:8080
```

## 조작법

| 입력 | 동작 |
|------|------|
| WASD / 방향키 | 이동 |
| 마우스 좌클릭 | 주문 발사 (커서 방향) |
| TAB | 지팡이 편집 UI 열기/닫기 |
