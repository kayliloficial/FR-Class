// ===== VFX engine: confetti (rect/circle/star), glowing fireworks, shockwave rings, sparkles,
// floating texts, edge flash, synthesized sounds, haptics. Reads settings from window.CFG =====
const cv = document.getElementById('fx'), cx = cv.getContext('2d');
let P = [], R = [], on = false;
const COLS = ['#007aff', '#34c759', '#ff9500', '#ff2d55', '#af52de', '#ffcc00', '#5ac8fa'];
const lvlFx = () => (window.CFG || {}).vfx ?? 1;
function fit() { const d = devicePixelRatio || 1; cv.width = innerWidth * d; cv.height = innerHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); }
fit(); addEventListener('resize', fit);
const kick = () => { if (!on) { on = true; requestAnimationFrame(loop); } };

function confetti(x, y, n = 60, spread = 1) {
  const k = lvlFx(); if (!k) return; n = Math.round(n * (k === 2 ? 1.8 : 1));
  for (let i = 0; i < n; i++) P.push({ x, y, vx: (Math.random() - .5) * 14 * spread, vy: Math.random() * -14 - 3, g: .35, d: .99, s: 6 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - .5) * .5, c: COLS[i % 7], t: 'rcs'[i % 3], l: 100 + Math.random() * 50 });
  kick();
}
function fireworks(x, y, c) {
  const k = lvlFx(); if (!k) return; const col = c || COLS[Math.random() * 7 | 0], n = k === 2 ? 70 : 44;
  for (let i = 0; i < n; i++) { const a = Math.PI * 2 * i / n, s = 3 + Math.random() * 4; P.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: .06, d: .96, s: 3 + Math.random() * 2.5, r: 0, vr: 0, c: col, t: 'c', glow: 1, l: 55 + Math.random() * 25 }); }
  ring(x, y, col); kick();
}
function sparkle(x, y) {
  if (!lvlFx()) return;
  for (let i = 0; i < 14; i++) P.push({ x: x + (Math.random() - .5) * 80, y, vx: (Math.random() - .5) * 2, vy: -1 - Math.random() * 3, g: -.02, d: .98, s: 7 + Math.random() * 6, r: 0, vr: .1, c: '#ffd60a', t: 's', glow: 1, l: 45 + Math.random() * 20 });
  kick();
}
function ring(x, y, c) { if (!lvlFx()) return; R.push({ x, y, r: 6, m: 90, c, l: 1 }); kick(); }
function loop() {
  cx.clearRect(0, 0, innerWidth, innerHeight);
  P = P.filter(p => p.l > 0);
  for (const p of P) {
    p.vy += p.g; p.vx *= p.d; p.vy *= p.d; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.l--;
    cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.globalAlpha = Math.max(0, Math.min(1, p.l / 25));
    cx.globalCompositeOperation = p.glow ? 'lighter' : 'source-over'; cx.fillStyle = p.c;
    if (p.t === 'c') { cx.beginPath(); cx.arc(0, 0, p.s / 2, 0, 7); cx.fill(); }
    else if (p.t === 's') { cx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, r = i % 2 ? p.s * .25 : p.s * .6; cx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } cx.fill(); }
    else cx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s / 1.6);
    cx.restore();
  }
  R = R.filter(r => r.l > 0);
  for (const r of R) { cx.globalAlpha = Math.max(0, r.l); cx.strokeStyle = r.c; cx.lineWidth = 3; cx.beginPath(); cx.arc(r.x, r.y, r.r, 0, 7); cx.stroke(); r.r += (r.m - r.r) * .12; r.l -= .035; }
  cx.globalAlpha = 1;
  if (P.length || R.length) requestAnimationFrame(loop); else on = false;
}
function floatText(t, x, y, c = '#fff') {
  if (!lvlFx()) return; const e = document.createElement('div'); e.className = 'pop-text'; e.textContent = t;
  e.style.cssText = `left:${x}px;top:${y}px;background:${c}`; document.body.appendChild(e); setTimeout(() => e.remove(), 1300);
}
function flash(c) { if (!lvlFx()) return; const e = document.createElement('div'); e.className = 'flash'; e.style.setProperty('--c', c); document.body.appendChild(e); setTimeout(() => e.remove(), 520); }

// ---- sound + haptics ----
let ac;
function tone(f, t = 0, d = .2, type = 'sine', v = .12) {
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  const o = ac.createOscillator(), g = ac.createGain(), T = ac.currentTime + t;
  o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, T); g.gain.exponentialRampToValueAtTime(v, T + .015); g.gain.exponentialRampToValueAtTime(.001, T + d);
  o.connect(g); g.connect(ac.destination); o.start(T); o.stop(T + d + .02);
}
function sfx(k, n = 0) {
  if ((window.CFG || {}).sound === false) return;
  try {
    ({ good: () => { tone(660 + n * 55, 0, .14, 'triangle'); tone(880 + n * 70, .09, .24, 'triangle'); },
       bad: () => { tone(200, 0, .22, 'sawtooth', .06); tone(150, .14, .28, 'sawtooth', .06); },
       win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .11, .32, 'triangle')),
       lvl: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * .09, .4, 'triangle', .1)),
       tap: () => tone(1300, 0, .04, 'sine', .04) })[k]();
  } catch {}
}
function buzz(p) { if ((window.CFG || {}).haptics !== false && navigator.vibrate) navigator.vibrate(p); }

// ---- high-level effects used by the app ----
function fxAnswer(ok, combo = 0) {
  sfx(ok ? 'good' : 'bad', Math.min(combo, 8)); buzz(ok ? 12 : [30, 40, 30]);
  const r = (document.getElementById('fb') || document.body).getBoundingClientRect(), x = r.left + r.width / 2, y = Math.max(80, r.top);
  if (ok) {
    ring(x, y, '#34c759'); confetti(x, y, combo >= 3 ? 60 : 28, .8); sparkle(x, y);
    if (combo >= 3) { floatText(`Combo ×${combo} 🔥`, x, y - 40, '#ff9500'); fireworks(x, y - 70); }
  } else {
    flash('#ff3b30');
    const e = document.querySelector('.lesson,.card'); if (e) { e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }
  }
}
function fxWin() {
  sfx('win'); buzz([20, 30, 20, 30, 60]);
  [[.3, .35], [.7, .35], [.5, .25]].forEach(([a, b], i) => setTimeout(() => { confetti(innerWidth * a, innerHeight * b, 80); fireworks(innerWidth * a, innerHeight * (b - .1)); }, i * 260));
}
function fxLevelUp() {
  sfx('lvl'); buzz([40, 40, 40, 40, 120]);
  for (let i = 0; i < 6; i++) setTimeout(() => fireworks(innerWidth * (.15 + Math.random() * .7), innerHeight * (.15 + Math.random() * .4)), i * 220);
  setTimeout(() => confetti(innerWidth / 2, innerHeight * .6, 140, 1.6), 300);
}
function fxXP(t) { floatText(t, innerWidth / 2, innerHeight * .4, '#007aff'); }