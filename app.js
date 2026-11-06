const $ = id => document.getElementById(id);
let session = localStorage.getItem('fb_session'), U = null, tab = 'learn', L = null;

// ---------- "Database": browser localStorage ----------
const loadUsers = () => JSON.parse(localStorage.getItem('fb_users') || '{}');
const save = () => { const u = loadUsers(); u[session] = U; localStorage.setItem('fb_users', JSON.stringify(u)); };
async function hash(n, p) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(n + ':' + p));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
function speak(t) {
  if (!('speechSynthesis' in window)) return;
  const s = new SpeechSynthesisUtterance(t); s.lang = 'fr-FR'; s.rate = .85;
  speechSynthesis.cancel(); speechSynthesis.speak(s);
}

// ---------- Auth ----------
async function authenticate(kind) {
  const name = $('username').value.trim(), pw = $('password').value, users = loadUsers();
  if (!name || pw.length < 4) return $('authMsg').textContent = 'Username and a password (4+ characters) required';
  const h = await hash(name, pw);
  if (kind === 'register') {
    if (users[name]) return $('authMsg').textContent = 'Username already taken';
    users[name] = { hash: h, xp: 0, streak: 0, last: '', stats: {} };
    localStorage.setItem('fb_users', JSON.stringify(users));
  } else if (!users[name] || users[name].hash !== h) return $('authMsg').textContent = 'Wrong username or password';
  session = name; localStorage.setItem('fb_session', name); $('authMsg').textContent = ''; showApp();
}
$('loginBtn').onclick = () => authenticate('login');
$('registerBtn').onclick = () => authenticate('register');
$('logout').onclick = () => { localStorage.removeItem('fb_session'); session = null; $('app').hidden = $('userbar').hidden = true; $('auth').hidden = false; };

// ---------- App shell ----------
const TABS = [['learn', '📚 Learn'], ['sim', '🎭 Role-play'], ['book', '📖 Phrasebook']];
function showApp() {
  U = loadUsers()[session];
  if (!U) { localStorage.removeItem('fb_session'); return; }
  U.stats = U.stats || {}; U.xp = U.xp || 0;
  $('auth').hidden = true; $('app').hidden = $('userbar').hidden = false;
  $('who').textContent = session; render();
}
function streakNow() {
  const t = new Date().toDateString(), y = new Date(Date.now() - 864e5).toDateString();
  return (U.last === t || U.last === y) ? U.streak : 0;
}
function touchStreak() {
  const t = new Date().toDateString(), y = new Date(Date.now() - 864e5).toDateString();
  if (U.last !== t) { U.streak = U.last === y ? (U.streak || 0) + 1 : 1; U.last = t; }
}
function render() {
  $('stats').innerHTML = `<span class="flame">🔥 ${streakNow()}</span><span>⭐ ${U.xp} XP</span><span>🏅 Lv ${Math.floor(U.xp / 100) + 1}</span>`;
  $('nav').hidden = false;
  $('nav').innerHTML = TABS.map(([k, n]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${n}</button>`).join('');
  $('nav').querySelectorAll('button').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
  ({ learn: viewLearn, sim: viewSim, book: viewBook })[tab]();
}
const mastered = list => list.filter(p => (U.stats[p[0]] || {}).ok >= 2).length;

// ---------- Learn ----------
function viewLearn() {
  const weak = ALL.filter(p => (U.stats[p[0]] || {}).bad).sort((a, b) => U.stats[b[0]].bad - U.stats[a[0]].bad).slice(0, 3);
  const hi = [`Bonjour ${session} ! Ready to serve some French?`, 'Allez, one small lesson today!', streakNow() ? `🔥 ${streakNow()}-day streak, magnifique !` : 'Start a streak today, it only takes 2 minutes!'];
  $('view').innerHTML = `
    <div class="card mascot-card"><div class="mascot">👨‍🍳</div><div class="speech">${hi[Math.floor(Math.random() * hi.length)]}<div class="bar"><div style="width:${U.xp % 100}%"></div></div><small>Level ${Math.floor(U.xp / 100) + 1} · ${100 - U.xp % 100} XP to next level</small></div></div>
    <div class="card tutor"><h2>🤖 AI Tutor</h2>
      <p>${weak.length ? 'I noticed you struggle with: <b>' + weak.map(p => p[1]).join(', ') + '</b>. I will ask these more often.' : 'I adapt to you: the more you miss a phrase, the more often I ask it. Start a smart practice!'}</p>
      <button class="btn pulse" id="smart">Smart practice</button></div>
    <div class="grid">${Object.entries(DATA).map(([n, l]) => `
      <div class="card unit"><div class="ic">${ICONS[n] || '📘'}</div><h3>${n}</h3>
      <div class="bar"><div style="width:${mastered(l) / l.length * 100}%"></div></div>
      <small>${mastered(l)} / ${l.length} mastered</small><br><br>
      <button class="btn" data-c="${n}">Start</button></div>`).join('')}</div>`;
  $('smart').onclick = () => lesson(null);
  $('view').querySelectorAll('[data-c]').forEach(b => b.onclick = () => lesson(b.dataset.c));
}

// AI tutor: adaptive sampling – weak phrases are picked more often
function lesson(cat) {
  const pool = cat ? DATA[cat] : ALL, bag = [...pool], picks = [];
  const w = p => { const s = U.stats[p[0]] || { ok: 0, bad: 0 }; return Math.max(.3, 1 + 3 * s.bad - .4 * s.ok); };
  while (picks.length < Math.min(8, pool.length)) {
    let r = Math.random() * bag.reduce((a, p) => a + w(p), 0), i = 0;
    for (; i < bag.length - 1; i++) { r -= w(bag[i]); if (r <= 0) break; }
    picks.push(bag.splice(i, 1)[0]);
  }
  L = { qs: picks.map(makeQ), i: 0, hearts: 5, ok: 0, total: picks.length, cat };
  $('nav').hidden = true; q();
}
const clean = fr => fr.replace(/[?!…,]/g, '').trim().split(/\s+/);
function makeQ(p) {
  const orderable = !/[\/(]/.test(p[1]) && clean(p[1]).length >= 3 && clean(p[1]).length <= 7;
  const types = ['fr2en', 'en2fr', 'listen', ...(orderable ? ['order', 'order'] : [])];
  const others = ALL.filter(x => x[0] !== p[0]).sort(() => Math.random() - .5).slice(0, 3);
  return { p, type: types[Math.floor(Math.random() * types.length)], opts: [p, ...others].sort(() => Math.random() - .5) };
}
function q() {
  const Q = L.qs[L.i]; if (!Q) return done();
  const p = Q.p, v = $('view'); let body;
  if (Q.type === 'order') {
    body = `<h2>Translate this sentence</h2><p class="big">${p[3]}</p><div id="ans" class="ans"></div><div id="bank" class="bank"></div><button id="chk" class="btn" disabled>Check</button>`;
  } else {
    const t = { fr2en: ['What does this mean?', p[1] + ' <button class="spk">🔊</button>'], en2fr: ['How do you say…', p[3]], listen: ['Tap what you hear', '<button class="spk">🔊</button>'] }[Q.type];
    body = `<h2>${t[0]}</h2><p class="big">${t[1]}</p><div class="opts">${Q.opts.map((o, i) => `<button class="opt" data-i="${i}">${Q.type === 'en2fr' ? o[1] : o[3]}</button>`).join('')}</div>`;
  }
  v.innerHTML = `<div class="card lesson"><div class="top"><button class="x" id="quit">✕</button><div class="progress"><div style="width:${L.ok / L.total * 100}%"></div></div><span class="hearts">❤️ ${L.hearts}</span></div>${body}<div id="fb"></div></div>`;
  $('quit').onclick = render;
  v.querySelectorAll('.spk').forEach(b => b.onclick = () => speak(p[1]));
  if (Q.type === 'listen') speak(p[1]);
  v.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    const ok = Q.opts[b.dataset.i][0] === p[0];
    v.querySelectorAll('.opt').forEach(x => x.disabled = true);
    b.classList.add(ok ? 'right' : 'wrong'); answer(Q, ok, Q.type === 'en2fr' ? p[1] : p[3]);
  });
  if (Q.type === 'order') {
    const words = clean(p[1]), bank = [...words.keys()].sort(() => Math.random() - .5); let sel = [], locked = false;
    const draw = () => {
      const chip = i => `<button class="chip" data-i="${i}">${words[i]}</button>`;
      $('ans').innerHTML = sel.map(chip).join(''); $('bank').innerHTML = bank.filter(i => !sel.includes(i)).map(chip).join('');
      v.querySelectorAll('.chip').forEach(c => c.onclick = () => { if (locked) return; const i = +c.dataset.i; sel = sel.includes(i) ? sel.filter(x => x !== i) : [...sel, i]; draw(); });
      $('chk').disabled = !sel.length;
    };
    draw();
    $('chk').onclick = () => { locked = true; $('chk').hidden = true; answer(Q, sel.map(i => words[i]).join(' ') === words.join(' '), p[1]); };
  }
}
function answer(Q, ok, sol) {
  const s = U.stats[Q.p[0]] = U.stats[Q.p[0]] || { ok: 0, bad: 0 };
  if (ok) { s.ok++; L.ok++; } else { s.bad++; L.hearts--; L.qs.push(Q); }
  $('fb').innerHTML = `<div class="fb ${ok ? 'good' : 'bad'}"><div><b>${ok ? 'Bien joué ! 🎉' : 'Correct answer:'}</b><br>${ok ? '' : sol}</div><button class="btn" id="next">Continue</button></div>`;
  $('next').onclick = () => { L.i++; save(); L.hearts <= 0 ? fail() : q(); };
  fxAnswer(ok);
}
function fail() {
  $('view').innerHTML = `<div class="card center"><div class="score">💔</div><h2>Out of hearts</h2><p>Don't worry, mistakes are how you learn. The tutor will repeat these phrases.</p><button class="btn" id="again">Try again</button> <button class="btn alt" id="home">Back</button></div>`;
  $('again').onclick = () => lesson(L.cat); $('home').onclick = render;
}
function done() {
  const gain = 10 + L.total * 2; touchStreak(); U.xp += gain; save();
  $('view').innerHTML = `<div class="card center"><div class="score">🏆</div><h2>Lesson complete!</h2><p>+${gain} XP · ❤️ ${L.hearts} left</p><button class="btn" id="home">Continue</button></div>`;
  $('home').onclick = render; fxWin();
}

// ---------- Role-play simulation ----------
function viewSim() {
  $('view').innerHTML = `<div class="card"><h2>🎭 Restaurant role-play</h2><p>You are the waiter. A guest speaks French: choose the best reply.</p></div>
    <div class="grid">${SIM.map((s, i) => `<div class="card unit"><div class="ic">${s.emoji}</div><h3>${s.title}</h3><button class="btn" data-s="${i}">Play</button></div>`).join('')}</div>`;
  $('view').querySelectorAll('[data-s]').forEach(b => b.onclick = () => sim(+b.dataset.s));
}
function sim(si) {
  const S = SIM[si]; let i = 0, score = 0;
  const step = () => {
    if (i >= S.steps.length) {
      const gain = 5 + score * 5; touchStreak(); U.xp += gain; save();
      $('view').innerHTML = `<div class="card center"><div class="score">${score === S.steps.length ? '🌟' : '👍'}</div><h2>${score} / ${S.steps.length} perfect replies</h2><p>+${gain} XP</p><button class="btn" id="home">Back</button></div>`;
      fxWin(); return $('home').onclick = render;
    }
    const [cf, ce, opts, tip] = S.steps[i], o = opts.map((x, k) => [x, k]).sort(() => Math.random() - .5);
    $('view').innerHTML = `<div class="card"><small>${S.title} · step ${i + 1}/${S.steps.length}</small>
      <div><div class="bubble">🧑 ${cf}</div> <button class="spk" id="spk">🔊</button></div>
      <div class="opts">${o.map(([x, k]) => `<button class="opt" data-k="${k}">${x[0]}</button>`).join('')}</div><div id="fb"></div></div>`;
    $('spk').onclick = () => speak(cf); speak(cf);
    $('view').querySelectorAll('.opt').forEach(b => b.onclick = () => {
      const k = +b.dataset.k, ok = k === 0; if (ok) score++;
      $('view').querySelectorAll('.opt').forEach(x => { x.disabled = true; const kk = +x.dataset.k; x.classList.add(kk === 0 ? 'right' : (x === b ? 'wrong' : 'opt')); x.innerHTML += `<br><small>${opts[kk][1]}</small>`; });
      $('fb').innerHTML = `<div class="tip">🇬🇧 Guest said: “${ce}”<br>💡 ${tip}</div><br><button class="btn" id="nx">Continue</button>`;
      $('nx').onclick = () => { i++; step(); };
      fxAnswer(ok);
    });
  };
  step();
}

// ---------- Phrasebook ----------
function viewBook() {
  $('view').innerHTML = `<div class="card"><input id="search" placeholder="🔍 Search French or English…"><div id="plist"></div></div>`;
  const draw = () => {
    const t = $('search').value.toLowerCase();
    $('plist').innerHTML = ALL.filter(p => p.slice(1).join(' ').toLowerCase().includes(t)).map(p =>
      `<div class="phrase"><div><div class="fr">${p[1]}</div><div class="say">${p[2]}</div><div class="en">${p[3]}</div></div><button class="spk" data-f="${p[0]}">🔊</button></div>`).join('') || '<p>No result</p>';
    $('plist').querySelectorAll('.spk').forEach(b => b.onclick = () => speak(ALL.find(p => p[0] === b.dataset.f)[1]));
  };
  $('search').oninput = draw; draw();
}

if (session) showApp();
