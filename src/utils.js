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

/** Web Audio API 프로시저럴 효과음 */
export class SFX {
  constructor() {
    this.ctx = null;
    this._ts = {};
  }

  _ensureCtx() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  _throttle(key, ms) {
    const now = performance.now();
    if (now - (this._ts[key] || 0) < ms) return false;
    this._ts[key] = now;
    return true;
  }

  _tone(freq, type, dur, vol = 0.1, delay = 0) {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur);
  }

  _noise(dur, vol = 0.04) {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    src.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.start();
  }

  shoot() {
    if (!this._throttle('shoot', 50)) return;
    this._tone(800, 'square', 0.05, 0.04);
    this._tone(400, 'sine', 0.03, 0.03);
  }

  enemyDie() {
    if (!this._throttle('die', 40)) return;
    this._tone(400, 'square', 0.07, 0.07);
    this._tone(250, 'sawtooth', 0.1, 0.04);
    this._noise(0.04, 0.03);
  }

  playerHit() {
    this._tone(80, 'sawtooth', 0.15, 0.1);
    this._tone(120, 'square', 0.1, 0.06);
  }

  levelUp() {
    this._tone(523, 'sine', 0.2, 0.1);
    this._tone(659, 'sine', 0.2, 0.1, 0.08);
    this._tone(784, 'sine', 0.3, 0.12, 0.16);
  }

  itemPickup() {
    this._tone(1200, 'sine', 0.06, 0.06);
    this._tone(1600, 'sine', 0.06, 0.05, 0.03);
  }

  fusion() {
    this._tone(300, 'sine', 0.3, 0.07);
    this._tone(450, 'sine', 0.2, 0.07, 0.1);
    this._tone(600, 'sine', 0.3, 0.09, 0.2);
    this._noise(0.15, 0.03);
  }
}
