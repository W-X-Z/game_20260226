// ============================================================
// utils.js - 유틸리티 함수
// ============================================================

/** 두 오브젝트 사이의 거리 */
export function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** a에서 b로의 각도 (라디안) */
export function angleTo(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** 선형 보간 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** 배열 셔플 (Fisher-Yates) */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 정수 컬러를 CSS 문자열로 변환 */
export function colorToStr(c) {
  return '#' + c.toString(16).padStart(6, '0');
}
