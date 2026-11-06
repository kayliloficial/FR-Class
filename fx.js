// ===== VFX + sound: confetti, floating food, sound effects, mute button =====
const cv = document.getElementById('fx'), cx = cv.getContext('2d'); let parts = [];
const fit = () => { cv.width = innerWidth; cv.height = innerHeight; }; fit(); addEventListener('resize', fit);
function confetti(x, y, n = 60) {
  const c = ['#e4572e', '#ffc800', '#58cc02', '#1cb0f6', '#ff86d0', '#ffffff'];
  for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 13, vy: Math.random() * -13 - 3, s: 6 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: c[i % c.length], l: 90 + Math.random() * 40 });
}
(function loop() {
  cx.clearRect(0, 0, cv.width, cv.height); parts = parts.filter(p => p.l > 0);
  for (const p of parts) {
    p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.l--;
    cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.globalAlpha = Math.min(1, p.l / 30);
    cx.fillStyle = p.c; cx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s / 1.6); cx.restore();
  }
  requestAnimationFrame(loop);
})();

let ac, muted = localStorage.getItem('fb_mute') === '1';
function tone(f, t, d, type = 'sine', v = .15) {
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  const o = ac.createOscillator(), g = ac.createGain(), T = ac.currentTime + t;
  o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, T); g.gain.exponentialRampToValueAtTime(.001, T + d);
  o.connect(g); g.connect(ac.destination); o.start(T); o.stop(T + d);
}
const SFX = {
  good: () => { tone(660, 0, .12); tone(880, .1, .2); },
  bad: () => { tone(220, 0, .2, 'sawtooth', .07); tone(160, .15, .25, 'sawtooth', .07); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .12, .3)),
};
function sfx(k) { if (!muted) try { SFX[k](); } catch {} }

function fxAnswer(ok) {
  sfx(ok ? 'good' : 'bad');
  if (ok) { const r = (document.getElementById('fb') || document.body).getBoundingClientRect(); confetti(r.left + r.width / 2, r.top, 35); }
  else { const e = document.querySelector('.lesson,.card'); if (e) { e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); } }
}
function fxWin() {
  sfx('win');
  [[.3, .4], [.7, .4], [.5, .3]].forEach(([a, b], i) => setTimeout(() => confetti(innerWidth * a, innerHeight * b, 90), i * 250));
}

// floating food background
['🥐', '🍷', '🥖', '🧀', '☕', '🍰', '🥗', '🍽️'].forEach((e, i) => {
  const s = document.createElement('span'); s.textContent = e;
  s.style.cssText = `left:${i * 13 + 3}%;animation-duration:${16 + i * 2}s;animation-delay:${-i * 3}s;font-size:${26 + i % 3 * 10}px`;
  document.getElementById('bg').appendChild(s);
});

const mb = document.getElementById('mute');
const paintMute = () => mb.textContent = muted ? '🔇' : '🔊';
mb.onclick = () => { muted = !muted; localStorage.setItem('fb_mute', muted ? '1' : '0'); paintMute(); sfx('good'); };
paintMute();
