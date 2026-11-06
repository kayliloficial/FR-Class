const $ = id => document.getElementById(id);
const today = () => new Date().toDateString();
let session = localStorage.getItem('fb_session'), U = null, tab = 'learn', L = null;
const DEF = { sound: true, haptics: true, vfx: 1, theme: 'auto', accent: '#007aff', speed: .9, voice: '', autoplay: true, len: 8, goal: 30, avatar: '👨‍🍳' };

// ---------- "Database": browser localStorage ----------
const loadUsers = () => JSON.parse(localStorage.getItem('fb_users') || '{}');
const save = () => { const u = loadUsers(); u[session] = U; localStorage.setItem('fb_users', JSON.stringify(u)); };
async function hash(n, p) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(n + ':' + p));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
const lvl = () => Math.floor(U.xp / 100) + 1, pct = () => U.xp % 100;
function addXP(n) {
  const before = lvl(); U.xp += n;
  if (U.daily.d !== today()) U.daily = { d: today(), xp: 0 };
  U.daily.xp += n; save(); paintStats(); return lvl() > before;
}
function streakNow() {
  const y = new Date(Date.now() - 864e5).toDateString();
  return (U.last === today() || U.last === y) ? U.streak : 0;
}
function touchStreak() {
  const y = new Date(Date.now() - 864e5).toDateString();
  if (U.last !== today()) { U.streak = U.last === y ? (U.streak || 0) + 1 : 1; U.last = today(); }
}

// ---------- Voice (picks the best French voice available) ----------
let VOICES = [];
function loadVoices() { VOICES = ('speechSynthesis' in window ? speechSynthesis.getVoices() : []).filter(v => v.lang.toLowerCase().startsWith('fr')); }
loadVoices(); if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { loadVoices(); if (U && tab === 'set') viewSet(); };
function bestVoice() {
  const pick = VOICES.find(v => v.name === U.settings.voice); if (pick) return pick;
  const sc = v => (/premium|enhanced|neural|natural|siri/i.test(v.name) ? 5 : 0) + (/google|amélie|amelie|thomas|audrey|aurélie|marie|jacques|denise|henri/i.test(v.name) ? 3 : 0) + (v.lang === 'fr-FR' ? 1 : 0);
  return [...VOICES].sort((a, b) => sc(b) - sc(a))[0];
}
function speak(t, slow) {
  if (!('speechSynthesis' in window)) return toast('Speech is not supported in this browser');
  const clean = t.replace(/\(e\)/g, 'e').replace(/\s*\/\s*/g, ', ').replace(/…/g, '...');
  const u = new SpeechSynthesisUtterance(clean), v = bestVoice();
  if (v) u.voice = v; u.lang = v ? v.lang : 'fr-FR'; u.rate = slow ? .55 : U.settings.speed; u.pitch = 1;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
const norm = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
const matchPct = (heard, target) => { const h = norm(heard), t = norm(target.replace(/\(e\)/g, '')); return t.length ? Math.round(t.filter(w => h.includes(w)).length / t.length * 100) : 0; };
function sayIt(p, btn) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast('Speech recognition needs Chrome or Safari');
  const r = new SR(); r.lang = 'fr-FR'; r.maxAlternatives = 3; btn.classList.add('rec'); toast('🎤 Listening… say it in French');
  r.onresult = e => {
    let best = 0, said = '';
    for (const a of e.results[0]) { const m = matchPct(a.transcript, p[1]); if (m >= best) { best = m; said = a.transcript; } }
    toast(`You said “${said}” · ${best}%${best >= 80 ? ' 🎉' : ''}`);
    if (best >= 80) { const b = btn.getBoundingClientRect(); fireworks(b.left, b.top); sfx('good', 3); }
  };
  r.onerror = () => toast('Could not hear you, try again'); r.onend = () => btn.classList.remove('rec'); r.start();
}

// ---------- UI helpers ----------
let tt; function toast(m) { const e = $('toast'); e.textContent = m; e.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => e.classList.remove('on'), 2800); }
function openSheet(html) {
  const s = $('sheet'); s.innerHTML = `<div class="dim"></div><div class="panel">${html}</div>`; s.hidden = false;
  requestAnimationFrame(() => s.classList.add('open'));
  const close = () => { s.classList.remove('open'); setTimeout(() => s.hidden = true, 300); };
  s.querySelector('.dim').onclick = close; s.querySelectorAll('[data-close]').forEach(b => b.onclick = close);
}
function celebrate(up) {
  if (!up) return;
  setTimeout(() => { fxLevelUp(); openSheet(`<div class="score">🏅</div><h2>Level ${lvl()}!</h2><p>Magnifique ! You levelled up.</p><button class="btn full" data-close>Continue</button>`); }, 900);
}
function applySettings() {
  const s = U.settings; window.CFG = s; const r = document.documentElement;
  s.theme === 'auto' ? r.removeAttribute('data-theme') : r.setAttribute('data-theme', s.theme);
  r.style.setProperty('--blue', s.accent);
}
function paintStats() {
  if (!$('sk')) $('stats').innerHTML = `<span class="chip">🔥 <b id="sk"></b></span><span class="chip lvl">Lv <b id="lv"></b><i class="xpbar"><u id="xpf"></u></i></span>`;
  $('sk').textContent = streakNow(); $('lv').textContent = lvl(); $('xpf').style.width = pct() + '%';
}
addEventListener('scroll', () => document.querySelector('header').classList.toggle('scrolled', scrollY > 50), { passive: true });

// ---------- Auth ----------
async function authenticate(kind) {
  const name = $('username').value.trim(), pw = $('password').value, users = loadUsers();
  if (!name || pw.length < 4) return $('authMsg').textContent = 'Username and a password (4+ characters) required';
  const h = await hash(name, pw);
  if (kind === 'register') {
    if (users[name]) return $('authMsg').textContent = 'Username already taken';
    users[name] = { hash: h, xp: 0, streak: 0, last: '', stats: {}, mistakes: {}, daily: { d: '', xp: 0 }, settings: { ...DEF } };
    localStorage.setItem('fb_users', JSON.stringify(users));
  } else if (!users[name] || users[name].hash !== h) return $('authMsg').textContent = 'Wrong username or password';
  session = name; localStorage.setItem('fb_session', name); $('authMsg').textContent = ''; showApp();
}
$('loginBtn').onclick = () => authenticate('login');
$('registerBtn').onclick = () => authenticate('register');
function logout() { localStorage.removeItem('fb_session'); session = null; U = null; window.CFG = null; $('app').hidden = $('userbar').hidden = true; $('auth').hidden = false; document.querySelector('header').classList.remove('app'); }
$('logout').onclick = logout;

// ---------- App shell ----------
const SV = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const TABS = [
  ['learn', 'Learn', SV('<path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v14"/>')],
  ['sim', 'Role-play', SV('<path d="M21 12a8 8 0 0 1-11.6 7.1L3 20l1-4.6A8 8 0 1 1 21 12z"/>')],
  ['mist', 'Mistakes', SV('<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>')],
  ['book', 'Phrasebook', SV('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>')],
  ['set', 'Settings', SV('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>')],
];
const COL = ['#007aff', '#ff9500', '#34c759', '#af52de', '#ff2d55', '#5ac8fa'];
const icon = (e, i) => `<div class="ic" style="background:linear-gradient(145deg,${COL[i % 6]},${COL[i % 6]}bb)">${e}</div>`;
const mistList = () => ALL.filter(p => U.mistakes[p[0]]);
const mastered = list => list.filter(p => (U.stats[p[0]] || {}).ok >= 2).length;

function showApp() {
  U = loadUsers()[session];
  if (!U) { localStorage.removeItem('fb_session'); return; }
  U.stats = U.stats || {}; U.mistakes = U.mistakes || {}; U.xp = U.xp || 0; U.daily = U.daily || { d: '', xp: 0 };
  U.settings = { ...DEF, ...(U.settings || {}) }; applySettings();
  $('auth').hidden = true; $('app').hidden = $('userbar').hidden = false; $('who').textContent = session;
  document.querySelector('header').classList.add('app'); render();
}
function render(keep) {
  paintStats(); $('nav').hidden = $('ltitle').hidden = false;
  $('ltitle').textContent = TABS.find(t => t[0] === tab)[1];
  const m = mistList().length;
  $('nav').innerHTML = TABS.map(([k, n, svg]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${svg}<span>${n}</span>${k === 'mist' && m ? `<em class="badge">${m}</em>` : ''}</button>`).join('');
  $('nav').querySelectorAll('button').forEach(b => b.onclick = () => { tab = b.dataset.t; sfx('tap'); buzz(6); scrollTo(0, 0); render(); });
  $('view').classList.toggle('noanim', !!keep);
  ({ learn: viewLearn, sim: viewSim, mist: viewMist, book: viewBook, set: viewSet })[tab]();
}

// ---------- Learn ----------
function viewLearn() {
  const m = mistList().length, g = U.settings.goal, d = U.daily.d === today() ? U.daily.xp : 0, C = 2 * Math.PI * 30;
  const weak = [...mistList()].slice(0, 3);
  const hi = [`Bonjour ${session} ! Ready to serve some French?`, 'Allez, one small lesson today!', streakNow() ? `🔥 ${streakNow()}-day streak, magnifique !` : 'Start a streak today, it only takes 2 minutes!'];
  $('view').innerHTML = `
    <div class="card mascot-card"><div class="mascot">${U.settings.avatar}</div><div class="speech">${hi[Math.floor(Math.random() * 3)]}
      <div class="bar big"><div id="xb" style="width:0"></div></div><small>Level ${lvl()} · ${pct()} / 100 XP</small></div></div>
    <div class="grid">
      <div class="card center"><svg class="ring" viewBox="0 0 72 72"><circle class="rb" cx="36" cy="36" r="30"/><circle id="rf" class="rf" cx="36" cy="36" r="30" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
        <h3>Daily goal</h3><small>${Math.min(d, g)} / ${g} XP today</small></div>
      <div class="card center ${m ? 'warn' : ''}"><div class="ic" style="background:${m ? 'linear-gradient(145deg,#ff9500,#ff3b30)' : 'linear-gradient(145deg,#34c759,#30b0c7)'}">${m ? '🧠' : '✅'}</div>
        <h3>${m ? m + ' to review' : 'No mistakes'}</h3>${m ? '<button class="btn" id="pm">Practice mistakes</button>' : '<small>Keep it up!</small>'}</div>
    </div>
    <div class="card tutor"><h2>🤖 AI Tutor</h2>
      <p>${weak.length ? 'I am focusing on your mistakes: <b>' + weak.map(p => p[1]).join(', ') + '</b>. They are mixed into every lesson until you master them.' : 'I adapt to you: phrases you miss come back more often until you master them.'}</p>
      <button class="btn" id="smart">Smart practice</button></div>
    <div class="grid">${Object.entries(DATA).map(([n, l], k) => `
      <div class="card unit">${icon(ICONS[n] || '📘', k)}<h3>${n}</h3>
      <div class="bar"><div style="width:${mastered(l) / l.length * 100}%"></div></div>
      <small>${mastered(l)} / ${l.length} mastered</small><br><br>
      <button class="btn" data-c="${n}">Start</button></div>`).join('')}</div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => { $('xb').style.width = pct() + '%'; $('rf').style.strokeDashoffset = C * (1 - Math.min(1, d / g)); }));
  $('smart').onclick = () => lesson(null);
  if ($('pm')) $('pm').onclick = () => lesson('__m');
  $('view').querySelectorAll('[data-c]').forEach(b => b.onclick = () => lesson(b.dataset.c));
}

// ---------- Lessons (AI tutor = weighted sampling that favours mistakes) ----------
function lesson(cat) {
  const mist = mistList(), pool = cat === '__m' ? mist : cat ? DATA[cat] : ALL;
  if (!pool.length) return toast('Nothing to practise yet');
  const w = p => { const s = U.stats[p[0]] || { ok: 0, bad: 0 }; return Math.max(.3, 1 + 3 * s.bad - .4 * s.ok + (U.mistakes[p[0]] ? 5 : 0)); };
  const bag = [...pool], picks = [], n = Math.min(U.settings.len, pool.length);
  while (picks.length < n) {
    let r = Math.random() * bag.reduce((a, p) => a + w(p), 0), i = 0;
    for (; i < bag.length - 1; i++) { r -= w(bag[i]); if (r <= 0) break; }
    picks.push(bag.splice(i, 1)[0]);
  }
  if (cat && cat !== '__m') mist.filter(p => !picks.includes(p)).slice(0, 2).forEach((p, i) => { if (picks.length > 3) picks[picks.length - 1 - i] = p; });
  L = { qs: picks.map(p => makeQ(p, !!U.mistakes[p[0]])), i: 0, hearts: 5, ok: 0, total: picks.length, cat, combo: 0 };
  $('nav').hidden = $('ltitle').hidden = true; scrollTo(0, 0); q();
}
const clean = fr => fr.replace(/[?!…,]/g, '').trim().split(/\s+/);
function makeQ(p, review) {
  const orderable = !/[\/(]/.test(p[1]) && clean(p[1]).length >= 3 && clean(p[1]).length <= 7;
  const types = ['fr2en', 'en2fr', 'listen', ...(orderable ? ['order', 'order'] : [])];
  const others = ALL.filter(x => x[0] !== p[0]).sort(() => Math.random() - .5).slice(0, 3);
  return { p, review, type: types[Math.floor(Math.random() * types.length)], opts: [p, ...others].sort(() => Math.random() - .5) };
}
function q() {
  const Q = L.qs[L.i]; if (!Q) return done();
  const p = Q.p, v = $('view'); let body;
  const sp = '<button class="spk">🔊</button><button class="spk slow" title="Slow">🐢</button>';
  if (Q.type === 'order') body = `<h2>Translate this sentence</h2><p class="big">${p[3]}</p><div id="ans" class="ans"></div><div id="bank" class="bank"></div><button id="chk" class="btn" disabled>Check</button>`;
  else {
    const t = { fr2en: ['What does this mean?', p[1] + ' ' + sp], en2fr: ['How do you say…', p[3]], listen: ['Tap what you hear', sp] }[Q.type];
    body = `<h2>${t[0]}</h2><p class="big">${t[1]}</p><div class="opts">${Q.opts.map((o, i) => `<button class="opt" data-i="${i}">${Q.type === 'en2fr' ? o[1] : o[3]}</button>`).join('')}</div>`;
  }
  v.innerHTML = `<div class="card lesson"><div class="top"><button class="x" id="quit">✕</button><div class="progress"><div style="width:${L.ok / L.total * 100}%"></div></div><span class="hearts">❤️ ${L.hearts}</span></div>${Q.review ? '<span class="tag">↻ Review</span>' : ''}${body}<div id="fb"></div></div>`;
  $('quit').onclick = () => render();
  v.querySelectorAll('.spk').forEach(b => b.onclick = () => speak(p[1], b.classList.contains('slow')));
  if (Q.type === 'listen' || (Q.type === 'fr2en' && U.settings.autoplay)) speak(p[1]);
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
      v.querySelectorAll('.chip').forEach(c => c.onclick = () => { if (locked) return; sfx('tap'); const i = +c.dataset.i; sel = sel.includes(i) ? sel.filter(x => x !== i) : [...sel, i]; draw(); });
      $('chk').disabled = !sel.length;
    };
    draw();
    $('chk').onclick = () => { locked = true; $('chk').hidden = true; answer(Q, sel.map(i => words[i]).join(' ') === words.join(' '), p[1]); };
  }
}
function answer(Q, ok, sol) {
  const id = Q.p[0], s = U.stats[id] = U.stats[id] || { ok: 0, bad: 0 };
  if (ok) { s.ok++; L.ok++; L.combo++; if (U.mistakes[id] && --U.mistakes[id] <= 0) delete U.mistakes[id]; }
  else { s.bad++; L.hearts--; L.combo = 0; U.mistakes[id] = 2; L.qs.push(Q); }   // wrong -> goes to the mistakes notebook
  $('fb').innerHTML = `<div class="fb ${ok ? 'good' : 'bad'}"><div><b>${ok ? (L.combo >= 3 ? `Combo ×${L.combo} 🔥` : 'Bien joué ! 🎉') : 'Correct answer:'}</b><br>${ok ? '' : sol + '<br><small>Saved to your Mistakes</small>'}</div><button class="btn" id="next">Continue</button></div>`;
  $('next').onclick = () => { L.i++; save(); L.hearts <= 0 ? fail() : q(); };
  fxAnswer(ok, L.combo);
  if (U.settings.autoplay && (Q.type === 'en2fr' || Q.type === 'order')) speak(Q.p[1]);
}
function fail() {
  $('view').innerHTML = `<div class="card center"><div class="score">💔</div><h2>Out of hearts</h2><p>Mistakes are how you learn. They are saved so the tutor can drill them.</p><button class="btn" id="again">Try again</button> <button class="btn alt" id="home">Back</button></div>`;
  $('again').onclick = () => lesson(L.cat); $('home').onclick = () => render();
}
function done() {
  const gain = 10 + L.total * 2 + L.hearts; touchStreak(); const old = pct(), up = addXP(gain);
  $('view').innerHTML = `<div class="card center"><div class="score">🏆</div><h2>Lesson complete!</h2><p>+<b id="gain">0</b> XP · ❤️ ${L.hearts} left</p>
    <div class="bar big"><div id="xb" style="width:${old}%"></div></div><small>Level ${up ? lvl() - 1 : lvl()}</small><br><br><button class="btn" id="home">Continue</button></div>`;
  $('home').onclick = () => render(); fxWin(); fxXP(`+${gain} XP`);
  requestAnimationFrame(() => requestAnimationFrame(() => { $('xb').style.width = (up ? 100 : pct()) + '%'; }));
  let n = 0; const t = setInterval(() => { n = Math.min(gain, n + 2); if ($('gain')) $('gain').textContent = n; if (n >= gain) clearInterval(t); }, 30);
  celebrate(up);
}

// ---------- Role-play ----------
function viewSim() {
  $('view').innerHTML = `<div class="card"><h2>Restaurant role-play</h2><p>You are the waiter. A guest speaks French: choose the best reply.</p></div>
    <div class="grid">${SIM.map((s, i) => `<div class="card unit">${icon(s.emoji, i + 2)}<h3>${s.title}</h3><button class="btn" data-s="${i}">Play</button></div>`).join('')}</div>`;
  $('view').querySelectorAll('[data-s]').forEach(b => b.onclick = () => sim(+b.dataset.s));
}
function sim(si) {
  const S = SIM[si]; let i = 0, score = 0;
  const step = () => {
    if (i >= S.steps.length) {
      const gain = 5 + score * 5; touchStreak(); const up = addXP(gain);
      $('view').innerHTML = `<div class="card center"><div class="score">${score === S.steps.length ? '🌟' : '👍'}</div><h2>${score} / ${S.steps.length} perfect replies</h2><p>+${gain} XP</p><button class="btn" id="home">Back</button></div>`;
      $('home').onclick = () => render(); fxWin(); fxXP(`+${gain} XP`); return celebrate(up);
    }
    const [cf, ce, opts, tip] = S.steps[i], o = opts.map((x, k) => [x, k]).sort(() => Math.random() - .5);
    $('view').innerHTML = `<div class="card"><small>${S.title} · step ${i + 1}/${S.steps.length}</small>
      <div><div class="bubble">🧑 ${cf}</div> <button class="spk" id="spk">🔊</button></div>
      <div class="opts">${o.map(([x, k]) => `<button class="opt" data-k="${k}">${x[0]}</button>`).join('')}</div><div id="fb"></div></div>`;
    $('spk').onclick = () => speak(cf); if (U.settings.autoplay) speak(cf);
    $('view').querySelectorAll('.opt').forEach(b => b.onclick = () => {
      const k = +b.dataset.k, ok = k === 0; if (ok) score++;
      $('view').querySelectorAll('.opt').forEach(x => { x.disabled = true; const kk = +x.dataset.k; x.classList.add(kk === 0 ? 'right' : (x === b ? 'wrong' : 'opt')); x.innerHTML += `<br><small>${opts[kk][1]}</small>`; });
      $('fb').innerHTML = `<div class="tip">🇬🇧 Guest said: “${ce}”<br>💡 ${tip}</div><br><button class="btn" id="nx">Continue</button>`;
      $('nx').onclick = () => { i++; step(); }; fxAnswer(ok, ok ? score : 0);
    });
  };
  step();
}

// ---------- Mistakes notebook ----------
function viewMist() {
  const l = mistList();
  if (!l.length) { $('view').innerHTML = `<div class="card center"><div class="score">🎉</div><h2>No mistakes!</h2><p>Phrases you get wrong are saved here so you can focus on them.</p></div>`; return; }
  $('view').innerHTML = `<div class="card"><p>Answer each phrase correctly <b>2 times</b> to clear it. The tutor also mixes these into every lesson.</p><button class="btn full" id="pm">Practice mistakes (${l.length})</button></div>
    <div class="card">${l.map(p => `<div class="phrase"><div><div class="fr">${p[1]}</div><div class="say">${p[2]}</div><div class="en">${p[3]}</div></div>
      <div class="dots">${'●'.repeat(2 - U.mistakes[p[0]])}${'○'.repeat(U.mistakes[p[0]])}</div><button class="spk" data-f="${p[0]}">🔊</button></div>`).join('')}</div>`;
  $('pm').onclick = () => lesson('__m');
  $('view').querySelectorAll('.spk').forEach(b => b.onclick = () => speak(ALL.find(p => p[0] === b.dataset.f)[1]));
}

// ---------- Phrasebook ----------
function viewBook() {
  $('view').innerHTML = `<input id="search" placeholder="🔍 Search French or English…"><div class="card"><div id="plist"></div></div>`;
  const draw = () => {
    const t = $('search').value.toLowerCase();
    $('plist').innerHTML = ALL.filter(p => p.slice(1).join(' ').toLowerCase().includes(t)).map(p =>
      `<div class="phrase"><div><div class="fr">${p[1]}</div><div class="say">${p[2]}</div><div class="en">${p[3]}</div></div>
      <div class="acts"><button class="spk" data-f="${p[0]}" data-a="n">🔊</button><button class="spk" data-f="${p[0]}" data-a="s">🐢</button><button class="spk" data-f="${p[0]}" data-a="m">🎤</button></div></div>`).join('') || '<p>No result</p>';
    $('plist').querySelectorAll('.spk').forEach(b => b.onclick = () => {
      const p = ALL.find(x => x[0] === b.dataset.f), a = b.dataset.a;
      a === 'm' ? sayIt(p, b) : speak(p[1], a === 's');
    });
  };
  $('search').oninput = draw; draw();
}

// ---------- Settings ----------
function viewSet() {
  const S = U.settings;
  const sw = (k, l, sub) => `<div class="row"><span>${l}${sub ? `<small>${sub}</small>` : ''}</span><label class="sw"><input type="checkbox" data-k="${k}" ${S[k] ? 'checked' : ''}><i></i></label></div>`;
  const seg = (k, l, opts) => `<div class="row col"><span>${l}</span><div class="seg" data-k="${k}">${opts.map(([v, t]) => `<button data-v="${v}" class="${S[k] == v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`;
  $('view').innerHTML = `
    <h4 class="sec">Profile</h4><div class="list">
      <div class="row"><span>${session}<small>Level ${lvl()} · ${U.xp} XP</small></span><span class="big-av">${S.avatar}</span></div>
      <div class="row col"><span>Avatar</span><div class="avs">${['👨‍🍳', '👩‍🍳', '🦊', '🐻', '🐱', '🐼', '🦉'].map(a => `<button data-av="${a}" class="${S.avatar === a ? 'on' : ''}">${a}</button>`).join('')}</div></div></div>
    <h4 class="sec">Appearance</h4><div class="list">
      ${seg('theme', 'Theme', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']])}
      <div class="row col"><span>Accent colour</span><div class="avs">${['#007aff', '#ff9500', '#34c759', '#af52de', '#ff2d55', '#5856d6', '#00c7be'].map(c => `<button class="swatch ${S.accent === c ? 'on' : ''}" data-ac="${c}" style="background:${c}"></button>`).join('')}</div></div>
      ${seg('vfx', 'Visual effects', [[0, 'Off'], [1, 'Normal'], [2, 'Max']])}</div>
    <h4 class="sec">Sound &amp; voice</h4><div class="list">
      ${sw('sound', 'Sound effects')}${sw('haptics', 'Haptics', 'Vibration on phones')}${sw('autoplay', 'Auto-play French audio')}
      <div class="row col"><span>French voice<small>${VOICES.length ? VOICES.length + ' voices on this device' : 'No French voice found on this device'}</small></span>
        <select id="voice"><option value="">Automatic (best available)</option>${VOICES.map(v => `<option value="${v.name}" ${v.name === S.voice ? 'selected' : ''}>${v.name} (${v.lang})</option>`).join('')}</select></div>
      <div class="row col"><span>Speaking speed<small id="spv">${S.speed.toFixed(2)}×</small></span><input type="range" id="speed" min=".5" max="1.1" step=".05" value="${S.speed}"></div>
      <div class="row"><span>Test voice</span><button class="btn small" id="test">▶ Bonjour !</button></div></div>
    <h4 class="sec">Learning</h4><div class="list">
      ${seg('len', 'Questions per lesson', [[5, '5'], [8, '8'], [12, '12']])}
      ${seg('goal', 'Daily XP goal', [[20, 'Easy 20'], [30, '30'], [50, '50'], [100, 'Pro 100']])}</div>
    <h4 class="sec">Data</h4><div class="list">
      <div class="row link" id="exp"><span>Export progress</span><span>›</span></div>
      <div class="row link" id="impb"><span>Import progress</span><span>›</span></div><input type="file" id="imp" accept=".json" hidden>
      <div class="row link red" id="rst"><span>Reset progress</span><span>›</span></div>
      <div class="row link red" id="lo"><span>Log out</span><span>›</span></div></div>
    <p class="foot">Progress is stored in this browser only.</p>`;
  const again = () => { const y = scrollY; render(true); scrollTo(0, y); };
  const set = (k, v, re = true) => { U.settings[k] = v; save(); applySettings(); if (re) again(); };
  const v = $('view');
  v.querySelectorAll('input[data-k]').forEach(i => i.onchange = () => { set(i.dataset.k, i.checked, false); if (i.dataset.k === 'sound') sfx('good'); if (i.dataset.k === 'haptics') buzz(30); });
  v.querySelectorAll('.seg button').forEach(b => b.onclick = () => { const val = isNaN(b.dataset.v) ? b.dataset.v : +b.dataset.v; set(b.parentNode.dataset.k, val); sfx('tap'); if (b.parentNode.dataset.k === 'vfx') confetti(innerWidth / 2, innerHeight / 2, 40); });
  v.querySelectorAll('[data-av]').forEach(b => b.onclick = () => set('avatar', b.dataset.av));
  v.querySelectorAll('[data-ac]').forEach(b => b.onclick = () => { set('accent', b.dataset.ac); ring(b.getBoundingClientRect().left + 14, b.getBoundingClientRect().top + 14, b.dataset.ac); });
  $('voice').onchange = e => set('voice', e.target.value, false);
  $('speed').oninput = e => { U.settings.speed = +e.target.value; $('spv').textContent = (+e.target.value).toFixed(2) + '×'; };
  $('speed').onchange = () => save();
  $('test').onclick = () => speak('Bonjour ! Bienvenue au Petit Bistro.');
  $('exp').onclick = () => { const d = { ...U }; delete d.hash; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })); a.download = `bistro-${session}.json`; a.click(); };
  $('impb').onclick = () => $('imp').click();
  $('imp').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const d = JSON.parse(t); Object.assign(U, { xp: d.xp || 0, streak: d.streak || 0, last: d.last || '', stats: d.stats || {}, mistakes: d.mistakes || {}, daily: d.daily || U.daily, settings: { ...DEF, ...(d.settings || {}) } }); save(); applySettings(); render(); toast('Progress imported ✅'); } catch { toast('Invalid file'); } }); };
  $('rst').onclick = () => { if (confirm('Reset all XP, streak and mistakes?')) { Object.assign(U, { xp: 0, streak: 0, last: '', stats: {}, mistakes: {}, daily: { d: '', xp: 0 } }); save(); render(); toast('Progress reset'); } };
  $('lo').onclick = logout;
}

if (session) showApp();