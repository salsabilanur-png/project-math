/* SETLAND - script.js (v5, MySQL/PHP). Satu folder dengan index.html, style.css, api.php, config.php */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tgl = s => s ? new Date(String(s).replace(' ', 'T')).toLocaleString('id-ID') : '-';
const tglPendek = s => s ? new Date(String(s).replace(' ', 'T')).toLocaleDateString('id-ID') : '-';
const STATUS = { active: 'Aktif', graduated: 'Lulus', expelled: 'Dikeluarkan', pending: 'Menunggu' };
const SECS = ['lkpd', 'latihan', 'evaluasi'];
const SEC_LABEL = { lkpd: 'LKPD', latihan: 'Latihan Soal', evaluasi: 'Evaluasi' };
const TYPE_LABEL = { pilihan: 'Pilihan ganda', isian: 'Isian singkat', esai: 'Esai' };
const WORK_LABEL = { off: 'Foto nonaktif', opsional: 'Foto opsional', wajib: 'Foto wajib' };
const STATE_LABEL = { terkunci: 'Terkunci', tersedia: 'Tersedia', menunggu: 'Menunggu dinilai guru', ulang: 'Perlu diulang', lulus: 'Lulus' };
const STATE_CLS = { terkunci: 'lock', tersedia: '', menunggu: 'wait', ulang: 'redo', lulus: 'pass' };

let me = null, role = 'siswa', view = 'home', topics = [], results = [], notifs = [], stats = {}, usersList = [], requests = [];
let task = null, chart = null, formSave = null, manageId = null, soalTab = 'lkpd', nilaiFilter = 'semua';
let rvItems = [], rvMin = 60, rvManual = false;

/* ---------- API ---------- */
async function api(a, data = {}, opt = {}) {
  try {
    const body = JSON.stringify(data);
    const r = await fetch('api.php?a=' + a, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body, credentials: 'same-origin', keepalive: !!opt.keepalive && body.length < 60000
    });
    const j = await r.json();
    if (!r.ok) {
      if (r.status === 401 && me) { if (!opt.silent) alert('Sesi berakhir, silakan masuk lagi.'); showLogin(); return null; }
      if (opt.onError) opt.onError(j.error || 'Terjadi kesalahan.');
      else if (!opt.silent) alert(j.error || 'Terjadi kesalahan.');
      return null;
    }
    return j;
  } catch (e) {
    const m = 'Tidak dapat terhubung ke server. Pastikan Apache & MySQL di XAMPP aktif dan halaman dibuka lewat http://localhost/setland/';
    if (opt.onError) opt.onError(m); else if (!opt.silent) alert(m);
    return null;
  }
}
async function loadAll() {
  const [t, r, n] = await Promise.all([api('topics'), api('results'), api('notifs')]);
  if (t) topics = t.topics; if (r) results = r.results; if (n) notifs = n.notifs;
  if (me && me.role === 'admin') { const q = await api('requests', {}, { silent: true }); if (q) requests = q.requests; }
}
function showErr(id, msg) { const el = $(id); el.textContent = msg || ''; el.classList.toggle('hidden', !msg); }

/* ---------- AUTH ---------- */
function selectRole(r) {
  role = r;
  ['Siswa', 'Guru', 'Admin'].forEach(n => $('roleBtn' + n).classList.toggle('active', n.toLowerCase() === r));
  $('regHelpText').classList.toggle('hidden', r !== 'siswa');
  toggleAuthMode('login');
}
function toggleAuthMode(m) {
  $('loginForm').classList.toggle('hidden', m !== 'login');
  $('registerForm').classList.toggle('hidden', m !== 'register');
  showErr('loginError', ''); showErr('registerError', '');
}
async function handleLogin(e) {
  e.preventDefault(); showErr('loginError', '');
  const j = await api('login', { login: $('loginUser').value, pass: $('loginPassword').value, role }, { onError: m => showErr('loginError', m) });
  if (j) start(j.user);
}
async function handleRegister(e) {
  e.preventDefault(); showErr('registerError', '');
  if ($('regPassword').value !== $('regPasswordConfirm').value) return showErr('registerError', 'Konfirmasi kata sandi tidak cocok.');
  const email = $('regEmail').value.trim().toLowerCase();
  const j = await api('register', { name: $('regName').value, dob: $('regDob').value, gender: $('regGender').value, email, pass: $('regPassword').value }, { onError: m => showErr('registerError', m) });
  if (!j) return;
  alert('Pendaftaran terkirim! Akunmu akan aktif setelah disetujui admin (admin akan melengkapi kelas, NIS/NISN, dan tahun masuk).');
  $('registerForm').reset(); toggleAuthMode('login'); $('loginUser').value = email;
}
function showLogin() {
  stopTracking(); stopSiren(); me = null; task = null;
  ['navRight', 'appLayout'].forEach(i => $(i).style.display = 'none');
  $('authOverlay').classList.remove('hidden'); $('authOverlay').style.display = 'flex';
  $('loginForm').reset();
}
async function logout() { await api('logout', {}, { silent: true }); showLogin(); }
async function start(u) {
  me = u; view = 'home'; task = null;
  $('authOverlay').style.display = 'none';
  $('navRight').style.display = 'flex'; $('appLayout').style.display = 'flex';
  $('userNameDisplay').textContent = u.name + ' (' + u.role + (u.class_name ? ' · ' + u.class_name : '') + ')';
  $('notifWrapper').classList.remove('hidden');
  await loadAll(); render();
}

/* ---------- NOTIFIKASI ---------- */
const maxNotif = () => notifs.length ? Math.max(...notifs.map(n => +n.id)) : 0;
function updateBell() {
  $('bellDot').classList.toggle('read', +me.notif_read >= maxNotif());
  $('notifList').innerHTML = notifs.map(n => `<div class="notif-item">${esc(n.text)}<br><small class="muted">${esc(tgl(n.created_at))}</small></div>`).join('') || '<div class="notif-item">Belum ada pengumuman.</div>';
}
function toggleNotifications() { $('notifDropdown').classList.toggle('active'); }
async function clearNotifDot(e) { e.stopPropagation(); const j = await api('notif_read'); if (j) { me.notif_read = j.read; updateBell(); } }
document.addEventListener('click', e => { if (!$('notifWrapper').contains(e.target)) $('notifDropdown').classList.remove('active'); });

/* ---------- NAVIGASI ---------- */
const MENUS = {
  siswa: [['home', 'fa-house', 'Beranda'], ['lkpd', 'fa-file-pen', 'LKPD'], ['latihan', 'fa-pen-to-square', 'Latihan Soal'], ['evaluasi', 'fa-clipboard-check', 'Evaluasi'], ['nilai', 'fa-chart-line', 'Nilai Saya']],
  guru: [['home', 'fa-house', 'Beranda'], ['materi', 'fa-book-open', 'LKPD'], ['soal', 'fa-list-check', 'Soal'], ['evaluasiGuru', 'fa-clipboard-check', 'Evaluasi'], ['nilai', 'fa-table', 'Nilai Siswa'], ['info', 'fa-bullhorn', 'Buat Pengumuman']],
  admin: [['home', 'fa-house', 'Beranda'], ['request', 'fa-user-clock', 'Request Siswa'], ['users', 'fa-users', 'Kelola Pengguna'], ['materi', 'fa-book-open', 'LKPD'], ['soal', 'fa-list-check', 'Soal'], ['evaluasiGuru', 'fa-clipboard-check', 'Evaluasi'], ['nilai', 'fa-table', 'Nilai Siswa'], ['info', 'fa-bullhorn', 'Buat Pengumuman']]
};
async function go(v) {
  if (task && !task.done) {
    task.paused = true;                       // dialog konfirmasi tidak dihitung sebagai meninggalkan halaman
    const ok = confirm('Keluar dari tugas? Jawaban belum tersimpan.');
    task.paused = false;
    if (!ok) return;
  }
  stopTracking(); stopSiren(); task = null; view = v; manageId = null;
  await loadAll(); render();
}
const pendingCount = () => results.filter(r => r.kind === 'ujian' && !r.reviewed).length;
async function render() {
  const badge = k => {
    if (k === 'request' && requests.length) return `<span class="count" data-testid="request-count">${requests.length}</span>`;
    if (k === 'nilai' && me.role !== 'siswa' && pendingCount()) return `<span class="count" data-testid="pending-count">${pendingCount()}</span>`;
    return '';
  };
  $('sidebarNav').innerHTML = '<div class="sidebar-section-title">Menu ' + me.role + '</div>' +
    MENUS[me.role].map(m => `<button class="nav-btn ${view === m[0] || (view === 'soal' && m[0] === 'soal') ? 'active' : ''}" data-testid="nav-${m[0]}" onclick="go('${m[0]}')"><i class="fa-solid ${m[1]}"></i> ${m[2]}${badge(m[0])}</button>`).join('');
  updateBell();
  if (chart) { chart.destroy(); chart = null; }
  const v = $('mainView');
  if (task) return renderTask(v);
  const fn = {
    home: viewHome, lkpd: v => viewSection(v, 'lkpd'), latihan: v => viewSection(v, 'latihan'), evaluasi: v => viewSection(v, 'evaluasi'),
    nilai: viewNilai, info: viewInfo, users: viewUsers, request: viewRequest, materi: viewMateri, soal: viewSoal, evaluasiGuru: viewEvaluasiGuru
  }[view];
  await fn(v);
}
function welcome(v, extra = '') {
  v.innerHTML = `<div class="welcome-card"><div><h2>Halo, ${esc(me.name)}!</h2><p>${esc(extra)}</p></div><i class="fa-solid fa-shapes"></i></div>`;
}

/* ---------- FORM MODAL GENERIK ---------- */
function openForm(title, body, onSave, saveLabel = 'Simpan') {
  $('formTitle').textContent = title; $('formBody').innerHTML = body; formSave = onSave; showErr('formError', '');
  $('formSaveBtn').textContent = saveLabel;
  $('formSaveBtn').classList.toggle('hidden', !onSave); $('formModal').classList.add('active');
}
function closeForm() { $('formModal').classList.remove('active'); formSave = null; }
async function saveForm() { if (formSave) await formSave(); }
const formErr = m => showErr('formError', m);
async function refresh() { await loadAll(); render(); }
function closeModal(id) { $(id).classList.remove('active'); }

/* ================= BERANDA ================= */
const stateChip = (s, st) => `<span class="chip ${STATE_CLS[st]}">${SEC_LABEL[s]} · ${STATE_LABEL[st]}</span>`;

async function viewHome(v) {
  if (me.role !== 'siswa') {
    const s = await api('stats'); stats = s || {};
    welcome(v, 'Selamat datang di panel ' + me.role + '.');
    v.innerHTML += `<div class="cards-grid">
      <div class="card stat-card"><h3 data-testid="stat-siswa">${stats.siswa ?? 0}</h3><p>Siswa aktif</p></div>
      <div class="card stat-card warn"><h3 data-testid="stat-menunggu">${stats.menunggu ?? 0}</h3><p>Hasil menunggu dinilai</p></div>
      ${me.role === 'admin' ? `<div class="card stat-card warn"><h3 data-testid="stat-pending">${stats.pending ?? 0}</h3><p>Request menunggu persetujuan</p></div>
      <div class="card stat-card"><h3 data-testid="stat-guru">${stats.guru ?? 0}</h3><p>Guru</p></div>
      <div class="card stat-card"><h3 data-testid="stat-arsip">${stats.arsip ?? 0}</h3><p>Siswa diarsipkan</p></div>` : ''}
      <div class="card stat-card"><h3 data-testid="stat-materi">${stats.materi ?? 0}</h3><p>Materi</p></div>
      <div class="card stat-card"><h3 data-testid="stat-hasil">${stats.hasil ?? 0}</h3><p>Nilai tercatat</p></div>
      <div class="card stat-card warn"><h3 data-testid="stat-curang">${stats.curang ?? 0}</h3><p>Terindikasi keluar halaman</p></div></div>`;
    return;
  }
  welcome(v, 'Belajar berurutan: LKPD, Latihan Soal, lalu Evaluasi. Setiap bagian dinilai guru dulu sebelum bagian berikutnya terbuka.');
  let total = 0, passed = 0;
  topics.forEach(t => SECS.forEach(s => { const x = t.sections[s]; if (!x) return; total++; if (x.state === 'lulus') passed++; }));
  const pct = total ? Math.round(passed / total * 100) : 0;
  let h = `<div class="card progress-card" data-testid="progress-card"><b>Progres belajar</b><div class="bar"><span style="width:${pct}%"></span></div>
    <small class="muted">${passed} dari ${total} bagian lulus (${pct}%)</small></div><div class="cards-grid">`;
  topics.forEach((t, i) => {
    const secs = SECS.filter(s => t.sections[s]);
    const next = secs.find(s => ['tersedia', 'ulang'].includes(t.sections[s].state));
    h += `<div class="card" data-testid="topic-card-${t.id}"><div class="card-header"><div class="card-icon ${i % 2 ? 'icon-pink' : 'icon-green'}"><i class="fa-solid fa-circle-nodes"></i></div>
      ${t.unlocked ? '<span class="unlock-badge">Terbuka</span>' : '<span class="lock-badge"><i class="fa-solid fa-lock"></i> Terkunci</span>'}</div>
      <h3>${esc(t.title)}</h3><p class="muted" style="margin:6px 0">${esc(t.descr)}</p>
      ${t.unlocked ? `<p style="font-size:.85rem;margin:8px 0;white-space:pre-line">${esc(t.materi)}</p>` : '<p class="sec-note warn">Selesaikan materi sebelumnya sampai lulus dan disetujui guru.</p>'}
      <p>${secs.map(s => stateChip(s, t.sections[s].state)).join('') || '<span class="muted">Belum ada soal</span>'}</p>
      ${next ? `<button class="btn btn-primary btn-sm" data-testid="continue-${t.id}" onclick="go('${next}')"><i class="fa-solid fa-play"></i> Lanjut: ${SEC_LABEL[next]}</button>` : ''}</div>`;
  });
  v.innerHTML += h + '</div>';
}

/* ---------- Halaman LKPD / Latihan Soal / Evaluasi (siswa) ---------- */
const SEC_DESC = {
  lkpd: 'Kerjakan kegiatan LKPD. Guru akan menilainya; kalau nilaimu cukup dan disetujui, Latihan Soal terbuka.',
  latihan: 'Kerjakan Latihan Soal. Setelah dinilai dan disetujui guru, Evaluasi terbuka.',
  evaluasi: 'Evaluasi akhir materi. Setelah dinilai dan disetujui guru, materi berikutnya terbuka.'
};
function viewSection(v, sec) {
  welcome(v, SEC_DESC[sec]);
  const list = topics.filter(t => t.sections[sec]);
  if (!list.length) { v.innerHTML += `<div class="card empty">Belum ada ${SEC_LABEL[sec]} dari guru.</div>`; return; }
  v.innerHTML += '<div class="cards-grid">' + list.map((t, i) => {
    const s = t.sections[sec], prev = SECS.slice(0, SECS.indexOf(sec)).reverse().find(x => t.sections[x]);
    let note = '', btn;
    if (s.state === 'tersedia') btn = `<button class="btn btn-primary" data-testid="start-${sec}-${t.id}" onclick="openTask(${t.id},'${sec}')"><i class="fa-solid fa-pen"></i> Kerjakan</button>`;
    else if (s.state === 'ulang') {
      note = `<p class="sec-note warn">Nilaimu ${s.best ?? '-'} belum mencapai minimal ${t.pass_min}. Silakan ulangi.</p>`;
      btn = `<button class="btn btn-primary" data-testid="start-${sec}-${t.id}" onclick="openTask(${t.id},'${sec}')"><i class="fa-solid fa-rotate-right"></i> Ulangi</button>`;
    } else if (s.state === 'menunggu') {
      note = '<p class="sec-note">Jawabanmu sudah terkirim dan sedang menunggu dinilai guru.</p>';
      btn = '<button class="btn btn-outline" disabled>Menunggu dinilai</button>';
    } else if (s.state === 'lulus') {
      note = `<p class="sec-note">Nilaimu ${s.best} (minimal ${t.pass_min}). Sudah disetujui guru.</p>`;
      btn = '<button class="btn btn-outline" disabled><i class="fa-solid fa-check"></i> Lulus</button>';
    } else {
      note = `<p class="sec-note warn">${t.unlocked ? `Selesaikan ${SEC_LABEL[prev]} dan tunggu disetujui guru.` : 'Selesaikan materi sebelumnya sampai lulus dan disetujui guru.'}</p>`;
      btn = '<button class="btn btn-outline" disabled><i class="fa-solid fa-lock"></i> Terkunci</button>';
    }
    return `<div class="card" data-testid="${sec}-card-${t.id}"><div class="card-header"><div class="card-icon ${i % 2 ? 'icon-pink' : 'icon-green'}"><i class="fa-solid fa-circle-nodes"></i></div>
      <span class="st st-${STATE_CLS[s.state] || 'open'}">${STATE_LABEL[s.state]}</span></div>
      <h3>${esc(t.title)}</h3><p class="muted" style="margin:6px 0">${s.count} soal · nilai minimal ${t.pass_min}</p>
      ${sec === 'lkpd' && t.unlocked && s.state !== 'terkunci' ? `<div class="lkpd-box">${esc(t.lkpd_text || 'Kerjakan kegiatan yang diminta, lalu jawab pertanyaan.')}</div>` : ''}
      ${note}${btn}</div>`;
  }).join('') + '</div>';
}

/* ---------- ALARM ---------- */
let audioCtx = null, siren = null;
function prepAudio() {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) {}
}
function startSiren() {
  if (!audioCtx || siren) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain(), lfo = audioCtx.createOscillator(), lg = audioCtx.createGain();
  o.type = 'square'; o.frequency.value = 900; lfo.frequency.value = 3; lg.gain.value = 350; g.gain.value = 0.5;
  lfo.connect(lg); lg.connect(o.frequency); o.connect(g); g.connect(audioCtx.destination);
  o.start(); lfo.start(); siren = { o, lfo };
  if (navigator.vibrate) navigator.vibrate([600, 200, 600, 200, 600]);
}
function stopSiren() {
  if (!siren) return;
  try { siren.o.stop(); siren.lfo.stop(); } catch (e) {}
  siren = null; if (navigator.vibrate) navigator.vibrate(0);
}

/* ---------- TUGAS + ANTI CURANG (peringatan 1x, pelanggaran ke-2 auto-submit) ---------- */
async function openTask(tid, sec) {
  prepAudio();
  const j = await api('start', { topic_id: tid, section: sec }); if (!j) return;
  task = { tid, sec, title: j.topic.title, lkpd: j.topic.lkpd_text, qs: j.questions, ans: {}, work: {}, cheats: 0,
           away: false, done: false, pending: null, picking: false, paused: false, pickT: null, result: null };
  startTracking(); render();
}
function leave() {
  if (!task || task.done || task.away || task.picking || task.paused) return;
  task.away = true; task.cheats++;
  startSiren();                       // alarm berbunyi di setiap pelanggaran
  if (task.cheats >= 2) autoSubmit(); // pelanggaran ke-2: kirim jawaban otomatis
  updateCheatBar();
}
async function back() {
  if (task && task.picking) pickEnd();
  if (!task || !task.away || document.hidden) return;
  task.away = false; stopSiren();
  if (task.cheats < 2) { $('warnModal').classList.add('active'); return; } // peringatan pertama
  const j = await task.pending;
  $('cheatModalText').textContent = j
    ? `Kamu meninggalkan halaman ujian untuk kedua kalinya, sehingga jawaban dikirim otomatis. Nilai sementara: ${j.score}. Jawabanmu menunggu dinilai guru, dan kejadian ini dilaporkan ke guru.`
    : 'Kamu meninggalkan halaman ujian untuk kedua kalinya. Jawaban gagal dikirim otomatis; hubungi gurumu.';
  $('cheatModal').classList.add('active');
}
function closeCheat() { closeModal('cheatModal'); const s = task ? task.sec : 'nilai'; stopTracking(); task = null; view = 'nilai'; refresh(); }
function onVis() { document.hidden ? leave() : back(); }
function startTracking() {
  stopTracking();
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('blur', leave); window.addEventListener('focus', back); window.addEventListener('pagehide', leave);
}
function stopTracking() {
  document.removeEventListener('visibilitychange', onVis);
  window.removeEventListener('blur', leave); window.removeEventListener('focus', back); window.removeEventListener('pagehide', leave);
}
function updateCheatBar() {
  const el = $('cheatBar'); if (!el || !task) return;
  el.innerHTML = task.cheats ? `<div class="cheat-alert" data-testid="cheat-bar"><i class="fa-solid fa-triangle-exclamation"></i> Pelanggaran tercatat: ${task.cheats} dari 2${task.cheats >= 2 ? ' — jawaban dikirim otomatis.' : '. Satu kali lagi, jawaban dikirim otomatis!'}</div>` : '';
}
function payload(auto) {
  return { topic_id: task.tid, section: task.sec, ans: task.ans, work: task.work, cheats: task.cheats, auto: auto ? 1 : 0 };
}
function autoSubmit() {
  task.done = true;
  task.pending = api('submit', payload(true), { keepalive: true, silent: true });
}
const answered = q => task.ans[q.id] !== undefined && String(task.ans[q.id]).trim() !== '';

function renderTask(v) {
  if (task.result) {
    const t = topics.find(x => x.id === task.tid), pm = t ? t.pass_min : 60, r = task.result;
    v.innerHTML = `<div class="card result-card" data-testid="task-result"><h2 class="task-title">${SEC_LABEL[task.sec]} terkirim</h2>
      <div class="big" data-testid="provisional-score">${r.score}</div><p class="muted">Nilai sementara (otomatis)</p>
      <p style="margin:12px auto;max-width:48ch">Jawabanmu sedang menunggu dinilai guru. Bagian berikutnya terbuka setelah guru menyetujui dan nilai akhirmu mencapai minimal <b>${pm}</b>.</p>
      <div class="actions" style="justify-content:center"><button class="btn btn-primary" onclick="closeTask()" data-testid="task-back">Kembali</button></div></div>`;
    return;
  }
  let h = `<h2 class="task-title" data-testid="task-title">${SEC_LABEL[task.sec]}: ${esc(task.title)}</h2>
    <div class="exam-note"><i class="fa-solid fa-shield-halved"></i> Mode ujian aktif: pindah tab/aplikasi pertama kali = peringatan + alarm. Pelanggaran kedua = jawaban langsung dikirim otomatis. Memilih foto cara mengerjakan tidak dihitung pelanggaran.</div><div id="cheatBar"></div>`;
  if (task.sec === 'lkpd' && task.lkpd) h += `<div class="lkpd-box"><b>Petunjuk kegiatan</b><br>${esc(task.lkpd)}</div>`;
  task.qs.forEach((q, qi) => {
    h += `<div class="card" style="margin:14px 0" data-testid="question-${q.id}"><p><b>${qi + 1}.</b> ${esc(q.q)} <span class="chip">${TYPE_LABEL[q.type]}</span></p>`;
    if (q.type === 'pilihan')
      h += q.options.map((o, oi) => `<label style="display:block;margin:6px 0;cursor:pointer"><input type="radio" name="q${q.id}" data-testid="answer-${q.id}-${oi}" ${task.ans[q.id] === oi ? 'checked' : ''} onchange="task.ans[${q.id}]=${oi}"> ${esc(o)}</label>`).join('');
    else if (q.type === 'isian')
      h += `<input type="text" class="form-control" maxlength="255" placeholder="Tulis jawabanmu" data-testid="answer-${q.id}" value="${esc(task.ans[q.id] ?? '')}" oninput="task.ans[${q.id}]=this.value">`;
    else
      h += `<textarea class="form-control" rows="5" placeholder="Tulis jawabanmu di sini" data-testid="answer-${q.id}" oninput="task.ans[${q.id}]=this.value">${esc(task.ans[q.id] ?? '')}</textarea>`;
    if (q.work_mode !== 'off') h += workBox(q);
    h += `<div id="sc${q.id}"></div></div>`;
  });
  h += `<div style="display:flex;gap:10px;flex-wrap:wrap">
    <button class="btn btn-outline" onclick="crosscheck()" data-testid="check-answers"><i class="fa-solid fa-lightbulb"></i> Cek Jawaban (Petunjuk)</button>
    <button class="btn btn-primary" onclick="askSubmit()" data-testid="submit-task"><i class="fa-solid fa-paper-plane"></i> Kirim</button></div>`;
  v.innerHTML = h; updateCheatBar();
}
function closeTask() { const s = task.sec; stopTracking(); stopSiren(); task = null; view = s; refresh(); }
async function crosscheck() {
  const j = await api('check', { topic_id: task.tid, section: task.sec, ans: task.ans }); if (!j) return;
  j.items.forEach(it => {
    const el = $('sc' + it.id); if (!el) return;
    if (it.status === 'esai') el.innerHTML = '<div class="scaffold-box">Soal esai dinilai oleh guru.</div>';
    else if (it.status === 'empty') el.innerHTML = '<div class="scaffold-box error-scaffold">Soal ini belum dijawab.</div>';
    else if (it.status === 'ok') el.innerHTML = '<div class="scaffold-box"><i class="fa-solid fa-check"></i> Jawabanmu sudah tepat, lanjutkan!</div>';
    else el.innerHTML = `<div class="scaffold-box error-scaffold"><i class="fa-solid fa-lightbulb"></i> Petunjuk: ${esc(it.hint || 'Coba pelajari materinya lagi.')}</div>`;
  });
}
function askSubmit() {
  const rows = task.qs.map((q, i) => ({ n: i + 1, q, ans: answered(q), work: !!task.work[q.id] }));
  const empty = rows.filter(r => !r.ans), missing = rows.filter(r => r.q.work_mode === 'wajib' && !r.work);
  let h = `<p>Kamu menjawab <b>${rows.length - empty.length}</b> dari <b>${rows.length}</b> soal.</p>`;
  if (empty.length) h += `<p class="confirm-warn">Belum dijawab: soal ${empty.map(r => r.n).join(', ')}.</p>`;
  if (rows.some(r => r.q.work_mode !== 'off')) h += `<p>Foto cara mengerjakan terlampir: <b>${rows.filter(r => r.work).length}</b>.</p>`;
  if (missing.length) h += `<p class="confirm-warn">Soal ${missing.map(r => r.n).join(', ')} wajib melampirkan foto cara mengerjakan. Lengkapi dulu sebelum mengirim.</p>`;
  h += '<p style="margin-top:10px"><b>Apakah kamu sudah yakin dengan jawabanmu?</b> Setelah dikirim, jawaban tidak bisa diubah.</p>';
  $('confirmModalText').innerHTML = h;
  $('confirmSendBtn').disabled = missing.length > 0;
  $('confirmModal').classList.add('active');
}
async function submitTaskFinal() {
  closeModal('confirmModal');
  if (!task || task.done) return;
  task.done = true;
  const j = await api('submit', payload(false));
  if (!j) { task.done = false; return; }
  stopTracking(); stopSiren();
  task.result = j; render();
}

/* ---------- FOTO CARA MENGERJAKAN (per soal; diatur guru: nonaktif / opsional / wajib) ---------- */
function pickStart() {
  if (!task) return;
  task.picking = true;
  clearTimeout(task.pickT);
  task.pickT = setTimeout(() => {          // batas 90 detik memilih file, lalu aturan keluar halaman berlaku lagi
    if (!task) return;
    task.picking = false;
    if (document.hidden || !document.hasFocus()) leave();
  }, 90000);
}
function pickEnd() {
  if (!task) return;
  clearTimeout(task.pickT);
  setTimeout(() => { if (task) task.picking = false; }, 700);
}
function shrinkImage(file, max = 900) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('File itu bukan gambar yang valid.')); };
    img.src = url;
  });
}
async function onWorkPick(qid, input) {
  const f = input.files && input.files[0];
  pickEnd();
  if (!f || !task) return;
  try { task.work[qid] = await shrinkImage(f); refreshWork(qid); } catch (e) { alert(e.message); }
  input.value = '';
}
function workPreview(qid) {
  return task.work[qid]
    ? `<img class="work-thumb" src="${task.work[qid]}" alt="Foto cara mengerjakan" data-testid="work-preview-${qid}"><button class="btn btn-outline btn-sm" onclick="removeWork(${qid})">Hapus foto</button>`
    : '<p class="muted">Belum ada foto.</p>';
}
function refreshWork(qid) { const el = $('wk' + qid); if (el) el.innerHTML = workPreview(qid); }
function removeWork(qid) { delete task.work[qid]; refreshWork(qid); }
function workBox(q) {
  return `<div class="work-box"><div class="work-head"><b><i class="fa-solid fa-pencil"></i> Cara mengerjakan</b>
    <span class="chip ${q.work_mode === 'wajib' ? 'redo' : ''}">${q.work_mode === 'wajib' ? 'Wajib' : 'Opsional'}</span></div>
    <p class="muted">Foto coretan atau langkah pengerjaanmu di buku, lalu unggah di sini.</p>
    <div id="wk${q.id}">${workPreview(q.id)}</div>
    <label class="btn btn-outline btn-sm" onclick="pickStart()"><i class="fa-solid fa-image"></i> Pilih / ambil foto
      <input type="file" accept="image/*" class="hidden" data-testid="work-input-${q.id}" onchange="onWorkPick(${q.id}, this)"></label></div>`;
}

/* ================= NILAI ================= */
function resStatus(r) {
  if (r.kind === 'manual') return '<span class="badge manual">nilai guru</span>';
  if (!r.reviewed) return '<span class="st st-wait">Menunggu dinilai</span>';
  return r.score >= r.pass_min ? '<span class="st st-pass">Lulus</span>' : '<span class="st st-redo">Belum lulus (ulang)</span>';
}
async function viewNilai(v) {
  const isS = me.role === 'siswa';
  welcome(v, isS ? 'Riwayat nilaimu. Hanya kamu yang dapat melihat halaman ini.' : 'Hasil pengerjaan seluruh siswa. Buka "Jawaban" untuk melihat jawaban, menilai esai, dan menyetujui.');
  const list = !isS && nilaiFilter === 'menunggu' ? results.filter(r => r.kind === 'ujian' && !r.reviewed) : results;
  const head = isS ? '' : '<th>Siswa</th>';
  v.innerHTML += (isS ? '' : `<div class="toolbar"><div><select class="form-control" style="width:auto" onchange="nilaiFilter=this.value;render()" data-testid="grade-filter">
      <option value="semua" ${nilaiFilter === 'semua' ? 'selected' : ''}>Semua hasil</option><option value="menunggu" ${nilaiFilter === 'menunggu' ? 'selected' : ''}>Menunggu dinilai (${pendingCount()})</option></select></div>
      <button class="btn btn-primary" onclick="gradeForm()" data-testid="add-grade"><i class="fa-solid fa-upload"></i> Unggah Nilai Manual</button></div>`) +
    `<div class="card"><canvas id="chart" height="90"></canvas></div>
    <div style="overflow-x:auto"><table class="data-table" data-testid="grades-table"><tr>${head}<th>Materi / Penilaian</th><th>Bagian</th><th>Nilai</th><th>Status</th><th>Keluar Halaman</th><th>Waktu</th>${isS ? '' : '<th>Aksi</th>'}</tr>` +
    (list.map(r => `<tr data-testid="grade-row-${r.id}">${isS ? '' : `<td>${esc(r.name)}<br><small class="muted">${esc(r.class_name || '-')}</small></td>`}<td>${esc(r.title)}</td>
      <td>${r.section ? esc(SEC_LABEL[r.section]) : '-'}</td>
      <td><b>${r.score}</b> ${r.kind === 'ujian' && !r.reviewed ? '<small class="muted">sementara</small>' : ''} ${r.edited ? '<span class="badge edit">diubah guru</span>' : ''}</td>
      <td>${resStatus(r)}</td>
      <td>${r.kind === 'manual' ? '-' : r.cheats ? `<span style="color:var(--danger)">${r.cheats}x</span> ${r.auto_submitted ? '<span class="badge warn">auto-submit</span>' : ''}` : '0'}</td>
      <td>${esc(tgl(r.created_at))}</td>
      ${isS ? '' : `<td><div class="actions" style="margin-top:0">${r.kind === 'ujian' ? `<button class="btn ${r.reviewed ? 'btn-outline' : 'btn-primary'} btn-sm" onclick="reviewResult(${r.id})" data-testid="review-${r.id}"><i class="fa-solid fa-eye"></i> ${r.reviewed ? 'Jawaban' : 'Nilai'}</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="editScore(${r.id})" data-testid="edit-grade-${r.id}"><i class="fa-solid fa-pen"></i> Ubah</button>
        <button class="btn btn-danger btn-sm" onclick="delResult(${r.id})" data-testid="delete-grade-${r.id}"><i class="fa-solid fa-trash"></i></button></div></td>`}</tr>`).join('')
      || `<tr><td colspan="${isS ? 6 : 8}" class="empty">Belum ada data.</td></tr>`) + '</table></div>';
  const avg = topics.map(t => { const s = results.filter(r => r.topic_id === t.id && r.kind === 'ujian' && r.reviewed).map(r => r.score); return s.length ? Math.round(s.reduce((a, b) => a + b) / s.length) : 0; });
  if (window.Chart) chart = new Chart($('chart'), { type: 'bar', data: { labels: topics.map(t => t.title), datasets: [{ label: 'Rata-rata nilai (sudah dinilai guru)', data: avg, backgroundColor: ['#CC2454', '#EC646C', '#81142C', '#BDB7B9', '#B0D19A'] }] }, options: { scales: { y: { min: 0, max: 100 } } } });
}
function editScore(id) {
  const r = results.find(x => x.id === id);
  openForm('Ubah nilai: ' + r.name + ' – ' + r.title,
    `<div class="form-group"><label>Nilai (0–100)</label><input type="number" id="fScore" class="form-control" min="0" max="100" value="${r.score}" data-testid="grade-score"></div>`,
    async () => {
      const s = +$('fScore').value;
      if (!(s >= 0 && s <= 100)) return formErr('Nilai harus 0–100.');
      if (await api('result_update', { id, score: s }, { onError: formErr })) { closeForm(); refresh(); }
    });
}

/* ---------- Guru/admin: lihat jawaban, nilai esai, setujui ---------- */
async function reviewResult(id) {
  const j = await api('result_detail', { id }); if (!j) return;
  const R = j.result; rvItems = j.items; rvMin = R.pass_min; rvManual = false;
  const body = `<div class="rv-info"><span class="chip">${esc(R.name)}${R.class_name ? ' · ' + esc(R.class_name) : ''}</span><span class="chip">${esc(SEC_LABEL[R.section] || '')}</span>
      <span class="chip">Nilai minimal ${R.pass_min}</span>${R.cheats ? `<span class="chip redo">Keluar halaman ${R.cheats}x${R.auto_submitted ? ' · auto-submit' : ''}</span>` : ''}</div>` +
    (rvItems.map((it, n) => `<div class="rv-item" data-testid="rv-item-${it.id}"><p><b>${n + 1}.</b> ${esc(it.q)} <span class="chip">${TYPE_LABEL[it.type] || it.type}</span></p>
      <div class="answer-box">${esc(it.answer || '(tidak dijawab)')}</div>
      ${it.key ? `<p class="muted"><i>${it.type === 'esai' ? 'Pedoman' : 'Kunci'}:</i> ${esc(it.key)}</p>` : ''}
      ${it.type === 'esai'
        ? `<label class="muted">Skor soal ini (0–100)</label><input type="number" class="form-control rv-esai" data-id="${it.id}" min="0" max="100" value="${it.awarded === null ? '' : Math.round(it.awarded * 100)}" oninput="recalcReview()" data-testid="rv-score-${it.id}">`
        : `<span class="st ${it.awarded === 1 ? 'st-pass' : 'st-redo'}">${it.awarded === 1 ? 'Benar' : 'Salah'}</span>`}
      ${it.photo ? `<img class="photo-thumb" src="${esc(it.photo)}" alt="Foto cara mengerjakan" onclick="this.classList.toggle('zoom')" data-testid="rv-photo-${it.id}">`
        : it.work_mode === 'wajib' ? '<p class="confirm-warn">Tidak melampirkan foto cara mengerjakan (wajib).</p>' : ''}</div>`).join('') || '<p class="muted">Tidak ada data jawaban.</p>') +
    `<div class="rv-final"><p>Nilai otomatis: <b id="rvAuto">-</b></p>
      <div class="form-group" style="margin:8px 0"><label>Nilai akhir (boleh diubah guru)</label><input type="number" id="rvFinal" class="form-control" min="0" max="100" value="${R.score}" oninput="rvManual=true;recalcReview()" data-testid="rv-final"></div>
      <p id="rvDecision" data-testid="rv-decision"></p></div>`;
  openForm(`Jawaban: ${R.title}`, body, async () => {
    const grades = {};
    for (const el of document.querySelectorAll('.rv-esai')) {
      if (el.value === '') return formErr('Isi skor untuk semua soal esai.');
      grades[el.dataset.id] = Number(el.value);
    }
    const f = $('rvFinal').value;
    if (f === '' || !(+f >= 0 && +f <= 100)) return formErr('Nilai akhir harus 0–100.');
    const r = await api('result_review', { id, grades, score: +f }, { onError: formErr });
    if (r) { closeForm(); refresh(); }
  }, R.reviewed ? 'Simpan Perubahan' : 'Setujui & Simpan Nilai');
  recalcReview();
}
function recalcReview() {
  let sum = 0, incomplete = false;
  rvItems.forEach(it => {
    if (it.type === 'esai') {
      const el = document.querySelector(`.rv-esai[data-id="${it.id}"]`);
      if (!el || el.value === '') { incomplete = true; return; }
      sum += Math.min(100, Math.max(0, Number(el.value))) / 100;
    } else sum += it.awarded || 0;
  });
  const sc = rvItems.length ? Math.round(sum / rvItems.length * 100) : 0;
  $('rvAuto').textContent = incomplete ? '(isi semua skor esai)' : sc;
  if (!rvManual && !incomplete) $('rvFinal').value = sc;
  const fin = Number($('rvFinal').value);
  $('rvDecision').innerHTML = fin >= rvMin
    ? `<span class="st st-pass">Lulus</span> Siswa bisa lanjut ke bagian berikutnya setelah kamu menyimpan.`
    : `<span class="st st-redo">Belum lulus</span> Nilai di bawah ${rvMin}; siswa harus mengulang bagian ini.`;
}
async function gradeForm() {
  const j = await api('students'); const students = j ? j.students : [];
  if (!students.length) return alert('Belum ada siswa aktif.');
  openForm('Unggah nilai manual (hanya terlihat oleh siswa bersangkutan)', `
    <div class="form-group"><label>Siswa</label><select id="fStudent" class="form-control" data-testid="grade-student">${students.map(s => `<option value="${s.id}">${esc(s.name)}${s.class_name ? ' — ' + esc(s.class_name) : ''}</option>`).join('')}</select></div>
    <div class="form-group"><label>Nama penilaian (mis. Ulangan Harian 1)</label><input id="fGTitle" class="form-control" data-testid="grade-title"></div>
    <div class="form-group"><label>Nilai (0–100)</label><input type="number" id="fGScore" class="form-control" min="0" max="100" data-testid="grade-score"></div>`,
    async () => {
      const s = +$('fGScore').value;
      if (!$('fGTitle').value.trim()) return formErr('Nama penilaian wajib diisi.');
      if (!(s >= 0 && s <= 100) || $('fGScore').value === '') return formErr('Nilai harus 0–100.');
      if (await api('grade_add', { user_id: +$('fStudent').value, title: $('fGTitle').value, score: s }, { onError: formErr })) { closeForm(); refresh(); }
    });
}
async function delResult(id) { if (confirm('Hapus hasil ini?') && await api('result_delete', { id })) refresh(); }

/* ================= GURU / ADMIN ================= */
function viewInfo(v) {
  welcome(v, 'Kirim pengumuman ke semua siswa.');
  v.innerHTML += `<div class="card"><div class="form-group"><label>Isi pengumuman</label><textarea id="infoText" class="form-control" rows="3" data-testid="notif-text"></textarea></div><button class="btn btn-secondary" onclick="sendInfo()" data-testid="notif-send"><i class="fa-solid fa-paper-plane"></i> Kirim</button></div>`;
}
async function sendInfo() {
  const t = $('infoText').value.trim(); if (!t) return;
  if (await api('notif_add', { text: t })) { $('infoText').value = ''; alert('Pengumuman terkirim.'); await loadAll(); updateBell(); }
}

/* ---------- Request pendaftaran siswa ---------- */
async function viewRequest(v) {
  const j = await api('requests'); requests = j ? j.requests : [];
  welcome(v, 'Tinjau pendaftaran siswa baru. Lengkapi kelas, NIS/NISN, dan tahun masuk saat menyetujui.');
  v.innerHTML += `<div style="overflow-x:auto"><table class="data-table" data-testid="requests-table"><tr><th>Nama</th><th>Email</th><th>Tgl lahir</th><th>JK</th><th>Diajukan</th><th>Aksi</th></tr>` +
    (requests.map(r => `<tr data-testid="request-row-${r.id}"><td><b>${esc(r.name)}</b></td><td>${esc(r.email)}</td><td>${esc(tglPendek(r.dob))}</td><td>${esc(r.gender || '-')}</td><td>${esc(tgl(r.created_at))}</td>
      <td><div class="actions"><button class="btn btn-primary btn-sm" onclick="approveForm(${r.id})" data-testid="approve-request-${r.id}"><i class="fa-solid fa-check"></i> Setujui</button>
      <button class="btn btn-danger btn-sm" onclick="rejectRequest(${r.id})" data-testid="reject-request-${r.id}"><i class="fa-solid fa-xmark"></i> Tolak</button></div></td></tr>`).join('')
      || '<tr><td colspan="6" class="empty">Tidak ada request pendaftaran.</td></tr>') + '</table></div>';
}
function approveForm(id) {
  const r = requests.find(x => x.id === id);
  openForm('Setujui akun: ' + r.name, `
    <p class="muted" style="margin-bottom:12px">${esc(r.email)}</p>
    <div class="form-group"><label>Kelas</label><input id="fClass" class="form-control" placeholder="mis. 7A" data-testid="approve-class"></div>
    <div class="form-row">
      <div class="form-group"><label>NIS/NISN</label><input id="fNisn" class="form-control" data-testid="approve-nisn"></div>
      <div class="form-group"><label>Tahun masuk</label><input id="fYear" type="number" class="form-control" value="${new Date().getFullYear()}" data-testid="approve-year"></div>
    </div>`,
    async () => {
      if (!$('fClass').value.trim() || !$('fNisn').value.trim()) return formErr('Kelas dan NIS/NISN wajib diisi.');
      if (await api('request_approve', { id, class_name: $('fClass').value, nisn: $('fNisn').value, entry_year: +$('fYear').value }, { onError: formErr })) { closeForm(); refresh(); }
    });
}
async function rejectRequest(id) { if (confirm('Tolak dan hapus request ini?') && await api('request_reject', { id })) refresh(); }

/* ---------- Kelola pengguna ---------- */
async function viewUsers(v) {
  const j = await api('users'); usersList = j ? j.users : [];
  welcome(v, 'Kelola akun guru dan siswa. Siswa dapat diarsipkan (lulus/dikeluarkan) dengan alasan.');
  v.innerHTML += `<div class="toolbar"><span class="muted">${usersList.length} pengguna</span><button class="btn btn-primary" onclick="userForm()" data-testid="add-user"><i class="fa-solid fa-user-plus"></i> Tambah Pengguna</button></div>
    <div style="overflow-x:auto"><table class="data-table" data-testid="users-table"><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Kelas / NIS</th><th>Status</th><th>Aksi</th></tr>` +
    usersList.map(u => `<tr data-testid="user-row-${u.id}"><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td>${esc(u.role)}</td>
      <td>${u.role === 'siswa' ? `${esc(u.class_name || '-')}<br><small class="muted">${esc(u.nisn || '-')}${u.entry_year ? ' · ' + u.entry_year : ''}</small>` : '-'}</td>
      <td><span class="badge status-${u.status}">${STATUS[u.status] || u.status}</span>${u.archive_reason ? `<br><small class="muted">${esc(u.archive_reason)}</small>` : ''}</td>
      <td>${u.role === 'admin' ? '-' : `<div class="actions">
        ${u.role === 'siswa' && u.status === 'active' ? `<button class="btn btn-outline btn-sm" onclick="archiveForm(${u.id})" data-testid="archive-user-${u.id}"><i class="fa-solid fa-box-archive"></i> Arsipkan</button>` : ''}
        ${u.role === 'siswa' && u.status !== 'active' ? `<button class="btn btn-outline btn-sm" onclick="restoreUser(${u.id})" data-testid="restore-user-${u.id}"><i class="fa-solid fa-rotate-left"></i> Aktifkan</button>` : ''}
        <button class="btn btn-danger btn-sm" onclick="delUser(${u.id})" data-testid="delete-user-${u.id}"><i class="fa-solid fa-trash"></i> Hapus</button></div>`}</td></tr>`).join('') + '</table></div>';
}
function userForm() {
  openForm('Tambah pengguna', `
    <div class="form-group"><label>Peran</label><select id="fRole" class="form-control" data-testid="user-role" onchange="$('fSiswa').classList.toggle('hidden', this.value!=='siswa')"><option value="guru">Guru</option><option value="siswa">Siswa</option></select></div>
    <div class="form-group"><label>Nama lengkap</label><input id="fName" class="form-control" data-testid="user-name"></div>
    <div class="form-group"><label>Email</label><input id="fEmail" type="email" class="form-control" data-testid="user-email"></div>
    <div class="form-group"><label>Kata sandi (min. 6 karakter)</label><input id="fPass" type="password" class="form-control" data-testid="user-password"></div>
    <div id="fSiswa" class="hidden">
      <div class="form-group"><label>Kelas</label><input id="fClass" class="form-control" placeholder="mis. 7A" data-testid="user-class"></div>
      <div class="form-row">
        <div class="form-group"><label>NIS/NISN</label><input id="fNisn" class="form-control" data-testid="user-nisn"></div>
        <div class="form-group"><label>Tahun masuk</label><input id="fYear" type="number" class="form-control" value="${new Date().getFullYear()}" data-testid="user-year"></div>
      </div>
    </div>`,
    async () => {
      const d = { role: $('fRole').value, name: $('fName').value, email: $('fEmail').value, pass: $('fPass').value };
      if (!d.name.trim() || !d.email.trim()) return formErr('Nama dan email wajib diisi.');
      if (d.pass.length < 6) return formErr('Kata sandi minimal 6 karakter.');
      if (d.role === 'siswa') {
        Object.assign(d, { class_name: $('fClass').value, nisn: $('fNisn').value, entry_year: +$('fYear').value });
        if (!d.class_name.trim() || !d.nisn.trim()) return formErr('Kelas dan NIS/NISN wajib diisi untuk siswa.');
      }
      if (await api('user_add', d, { onError: formErr })) { closeForm(); render(); }
    });
}
function archiveForm(id) {
  const u = usersList.find(x => x.id === id);
  openForm('Arsipkan siswa: ' + u.name, `
    <div class="form-group"><label>Status</label><select id="fStatus" class="form-control" data-testid="archive-status"><option value="graduated">Lulus</option><option value="expelled">Dikeluarkan</option></select></div>
    <div class="form-group"><label>Alasan (wajib)</label><textarea id="fReason" class="form-control" rows="3" data-testid="archive-reason"></textarea></div>
    <p class="muted">Siswa yang diarsipkan tidak bisa login lagi, tetapi data nilainya tetap tersimpan.</p>`,
    async () => {
      if (!$('fReason').value.trim()) return formErr('Alasan wajib diisi.');
      if (await api('user_archive', { id, status: $('fStatus').value, reason: $('fReason').value }, { onError: formErr })) { closeForm(); render(); }
    });
}
async function restoreUser(id) { if (confirm('Aktifkan kembali siswa ini?') && await api('user_restore', { id })) render(); }
async function delUser(id) { if (confirm('Hapus pengguna ini secara permanen beserta nilainya?') && await api('user_delete', { id })) render(); }

/* ---------- Materi ---------- */
const countSec = (t, s) => t.questions.filter(q => q.section === s).length;
function viewMateri(v) {
  welcome(v, 'Kelola konten dan petunjuk kegiatan LKPD untuk setiap materi.');
  v.innerHTML += `<div class="toolbar"><span class="muted">${topics.length} LKPD / materi</span><button class="btn btn-primary" onclick="topicForm()" data-testid="add-topic"><i class="fa-solid fa-plus"></i> Tambah LKPD</button></div><div class="cards-grid">` +
    topics.map(t => `<div class="card" data-testid="topic-card-${t.id}"><h3>${esc(t.title)}</h3><p class="muted" style="margin:6px 0">${esc(t.descr)}</p>
      <p style="font-size:.85rem">${esc(t.materi.slice(0, 120))}${t.materi.length > 120 ? '…' : ''}</p>
      <p style="margin-top:8px">${SECS.map(s => `<span class="chip">${SEC_LABEL[s]} ${countSec(t, s)}</span>`).join('')}<span class="chip">Minimal ${t.pass_min}</span></p>
      <div class="actions"><button class="btn btn-primary btn-sm" onclick="openSoal(${t.id})" data-testid="manage-questions-${t.id}"><i class="fa-solid fa-list-check"></i> Kelola Soal</button>
      <button class="btn btn-outline btn-sm" onclick="topicForm(${t.id})" data-testid="edit-topic-${t.id}"><i class="fa-solid fa-pen"></i> Ubah LKPD</button>
      <button class="btn btn-danger btn-sm" onclick="delTopic(${t.id})" data-testid="delete-topic-${t.id}"><i class="fa-solid fa-trash"></i></button></div></div>`).join('') + '</div>';
}
function topicForm(id) {
  const t = topics.find(x => x.id === id) || { title: '', descr: '', materi: '', lkpd_text: '', pass_min: 60 };
  openForm(id ? 'Ubah LKPD / materi' : 'Tambah LKPD / materi', `
    <div class="form-group"><label>Judul</label><input id="fTitle" class="form-control" value="${esc(t.title)}" data-testid="topic-title"></div>
    <div class="form-group"><label>Deskripsi singkat</label><input id="fDescr" class="form-control" value="${esc(t.descr)}" data-testid="topic-descr"></div>
    <div class="form-group"><label>Isi materi</label><textarea id="fMateri" class="form-control" rows="6" data-testid="topic-materi">${esc(t.materi)}</textarea></div>
    <div class="form-group"><label>Petunjuk kegiatan LKPD</label><textarea id="fLkpd" class="form-control" rows="4" data-testid="topic-lkpd" placeholder="Langkah kegiatan yang harus dilakukan siswa pada LKPD">${esc(t.lkpd_text || '')}</textarea></div>
    <div class="form-group"><label>Nilai minimal lulus tiap bagian (0–100)</label><input id="fPass" type="number" min="0" max="100" class="form-control" value="${t.pass_min}" data-testid="topic-pass"></div>
    <p class="muted">Bagian berikutnya baru terbuka jika guru sudah menilai dan nilai siswa mencapai minimal ini.</p>`,
    async () => {
      if (!$('fTitle').value.trim()) return formErr('Judul wajib diisi.');
      if (await api('topic_save', { id, title: $('fTitle').value, descr: $('fDescr').value, materi: $('fMateri').value, lkpd_text: $('fLkpd').value, pass_min: +$('fPass').value }, { onError: formErr })) { closeForm(); refresh(); }
    });
}
async function delTopic(id) { if (confirm('Hapus materi beserta semua soal dan nilainya?') && await api('topic_delete', { id })) refresh(); }

/* ---------- Soal (subtab LKPD / Latihan Soal / Evaluasi) ---------- */
function openSoal(id) { manageId = id; view = 'soal'; render(); }
function viewEvaluasiGuru(v) {
  if (!manageId) {
    welcome(v, 'Pilih materi untuk mengelola soal evaluasi akhir.');
    v.innerHTML += `<div class="toolbar"><span class="muted">${topics.length} materi</span></div><div class="cards-grid">` +
      topics.map(t => `<div class="card"><h3>${esc(t.title)}</h3><p class="muted">${esc(t.descr)}</p><p class="muted">${countSec(t, 'evaluasi')} soal evaluasi</p><div class="actions"><button class="btn btn-primary btn-sm" onclick="openEvaluasi(${t.id})"><i class="fa-solid fa-clipboard-check"></i> Kelola Evaluasi</button></div></div>`).join('') + '</div>';
    return;
  }
  viewSoal(v);
}
function openEvaluasi(id) { manageId = id; soalTab = 'evaluasi'; view = 'evaluasiGuru'; render(); }
function setSoalTab(s) { soalTab = s; render(); }
function viewSoal(v) {
  if (!manageId) {
    welcome(v, 'Pilih materi untuk menambah, mengubah, atau menghapus soal latihan.');
    v.innerHTML += `<div class="toolbar"><span class="muted">${topics.length} materi</span></div><div class="cards-grid">` +
      topics.map(t => `<div class="card"><h3>${esc(t.title)}</h3><p class="muted">${esc(t.descr)}</p><p class="muted">${countSec(t, 'latihan')} soal latihan</p><div class="actions"><button class="btn btn-primary btn-sm" onclick="openSoal(${t.id}); setSoalTab('latihan')"><i class="fa-solid fa-list-check"></i> Kelola Soal</button></div></div>`).join('') + '</div>';
    return;
  }
  const t = topics.find(x => x.id === manageId); if (!t) { manageId = null; return viewSoal(v); }
  welcome(v, 'Kelola soal: ' + t.title);
  const list = t.questions.filter(q => q.section === soalTab);
  v.innerHTML += `<div class="toolbar"><button class="btn btn-outline" onclick="go('soal')" data-testid="back-to-topics"><i class="fa-solid fa-arrow-left"></i> Kembali</button>
    <button class="btn btn-primary" onclick="questionForm()" data-testid="add-question"><i class="fa-solid fa-plus"></i> Tambah Soal ${SEC_LABEL[soalTab]}</button></div>
    <div class="subtabs">${SECS.map(s => `<button class="subtab ${soalTab === s ? 'active' : ''}" onclick="setSoalTab('${s}')" data-testid="soal-tab-${s}">${SEC_LABEL[s]} <span class="n">${countSec(t, s)}</span></button>`).join('')}</div>` +
    (soalTab === 'lkpd' ? `<div class="lkpd-box"><b>Petunjuk kegiatan LKPD</b><br>${esc(t.lkpd_text || '(belum diisi — isi lewat tombol Ubah di daftar materi)')}</div>` : '') +
    (list.map((q, i) => `<div class="q-item" data-testid="question-item-${q.id}"><b>${i + 1}.</b> ${esc(q.q)}
      <p style="margin-top:4px"><span class="chip">${TYPE_LABEL[q.type]}</span><span class="chip ${q.work_mode === 'wajib' ? 'redo' : ''}">${WORK_LABEL[q.work_mode]}</span></p>
      ${q.type === 'pilihan' ? `<ol type="A">${q.options.map((o, oi) => `<li class="${oi === q.answer ? 'correct' : ''}">${esc(o)}${oi === q.answer ? ' ✔' : ''}</li>`).join('')}</ol>`
        : q.type === 'isian' ? `<p class="muted" style="margin-top:6px">Jawaban benar: <b>${esc(q.answer_text)}</b></p>`
        : `<p class="muted" style="margin-top:6px">Pedoman: ${esc(q.answer_text || '-')} (dinilai guru)</p>`}
      ${q.hint ? `<p class="muted" style="margin-top:6px">Petunjuk: ${esc(q.hint)}</p>` : ''}
      <div class="actions"><button class="btn btn-outline btn-sm" onclick="questionForm(${q.id})" data-testid="edit-question-${q.id}"><i class="fa-solid fa-pen"></i> Ubah</button>
      <button class="btn btn-danger btn-sm" onclick="delQuestion(${q.id})" data-testid="delete-question-${q.id}"><i class="fa-solid fa-trash"></i></button></div></div>`).join('') || `<p class="muted">Belum ada soal ${SEC_LABEL[soalTab]}.</p>`);
}
function qfSection() {
  const lk = $('fSec').value === 'lkpd';
  if (lk) $('fType').value = 'esai';
  $('fType').disabled = lk; qfType();
}
function qfType() {
  const t = $('fType').value;
  $('qfPilihan').classList.toggle('hidden', t !== 'pilihan'); $('qfIsian').classList.toggle('hidden', t !== 'isian');
  $('qfEsai').classList.toggle('hidden', t !== 'esai'); $('qfHint').classList.toggle('hidden', t === 'esai');
}
function questionForm(id) {
  const t = topics.find(x => x.id === manageId);
  const q = t.questions.find(x => x.id === id) || { section: soalTab, type: soalTab === 'lkpd' ? 'esai' : 'pilihan', q: '', options: ['', '', '', ''], answer: 0, answer_text: '', hint: '', work_mode: 'off' };
  const opts = [...q.options]; while (opts.length < 4) opts.push('');
  openForm(id ? 'Ubah soal' : 'Tambah soal', `
    <div class="form-row">
      <div class="form-group"><label>Bagian</label><select id="fSec" class="form-control" onchange="qfSection()" data-testid="question-section">${SECS.map(s => `<option value="${s}" ${q.section === s ? 'selected' : ''}>${SEC_LABEL[s]}</option>`).join('')}</select></div>
      <div class="form-group"><label>Jenis soal</label><select id="fType" class="form-control" onchange="qfType()" ${q.section === 'lkpd' ? 'disabled' : ''} data-testid="question-type">${Object.keys(TYPE_LABEL).map(k => `<option value="${k}" ${q.type === k ? 'selected' : ''}>${TYPE_LABEL[k]}</option>`).join('')}</select></div>
    </div>
    <div class="form-group"><label>Pertanyaan</label><textarea id="fQ" class="form-control" rows="3" data-testid="question-text">${esc(q.q)}</textarea></div>
    <div id="qfPilihan" class="${q.type === 'pilihan' ? '' : 'hidden'}">
      ${opts.map((o, i) => `<div class="form-group"><label>Pilihan ${'ABCD'[i] || i + 1}</label><input class="form-control fOpt" value="${esc(o)}" data-testid="question-option-${i}"></div>`).join('')}
      <div class="form-group"><label>Jawaban benar</label><select id="fAns" class="form-control" data-testid="question-answer">${opts.map((_, i) => `<option value="${i}" ${i === q.answer ? 'selected' : ''}>${'ABCD'[i] || i + 1}</option>`).join('')}</select></div></div>
    <div id="qfIsian" class="form-group ${q.type === 'isian' ? '' : 'hidden'}"><label>Jawaban yang benar</label>
      <input id="fAnsText" class="form-control" value="${esc(q.type === 'isian' ? q.answer_text : '')}" placeholder="mis. 5   (beberapa jawaban diterima: lima|5)" data-testid="question-anstext">
      <p class="muted">Huruf besar/kecil dan spasi berlebih diabaikan.</p></div>
    <div id="qfEsai" class="form-group ${q.type === 'esai' ? '' : 'hidden'}"><label>Pedoman penilaian (opsional, hanya dilihat guru)</label>
      <textarea id="fPedoman" class="form-control" rows="2" data-testid="question-pedoman">${esc(q.type === 'esai' ? q.answer_text || '' : '')}</textarea></div>
    <div id="qfHint" class="form-group ${q.type === 'esai' ? 'hidden' : ''}"><label>Petunjuk (muncul jika siswa salah)</label><input id="fHint" class="form-control" value="${esc(q.hint)}" data-testid="question-hint"></div>
    <div class="form-group"><label>Cara mengerjakan (foto coretan siswa)</label>
      <select id="fWork" class="form-control" data-testid="question-work">
        <option value="off" ${q.work_mode === 'off' ? 'selected' : ''}>Nonaktif</option>
        <option value="opsional" ${q.work_mode === 'opsional' ? 'selected' : ''}>Aktif, boleh dikosongkan (opsional)</option>
        <option value="wajib" ${q.work_mode === 'wajib' ? 'selected' : ''}>Wajib melampirkan foto</option></select></div>`,
    async () => {
      const sec = $('fSec').value, type = sec === 'lkpd' ? 'esai' : $('fType').value;
      if (!$('fQ').value.trim()) return formErr('Pertanyaan wajib diisi.');
      const d = { id, topic_id: manageId, section: sec, type, q: $('fQ').value, work_mode: $('fWork').value, hint: $('fHint').value };
      if (type === 'pilihan') {
        const options = [...document.querySelectorAll('.fOpt')].map(i => i.value);
        if (options.filter(o => o.trim()).length < 2) return formErr('Isi minimal 2 pilihan.');
        if (!options[+$('fAns').value].trim()) return formErr('Jawaban benar menunjuk pilihan yang kosong.');
        const idx = options.map((o, i) => o.trim() ? i : -1).filter(i => i >= 0);   // rapatkan indeks jawaban
        d.options = idx.map(i => options[i]); d.answer = idx.indexOf(+$('fAns').value);
      } else if (type === 'isian') {
        d.answer_text = $('fAnsText').value; if (!d.answer_text.trim()) return formErr('Jawaban yang benar wajib diisi.');
      } else d.answer_text = $('fPedoman').value;
      if (await api('question_save', d, { onError: formErr })) { soalTab = sec; closeForm(); refresh(); }
    });
}
async function delQuestion(id) { if (confirm('Hapus soal ini?') && await api('question_delete', { id })) refresh(); }

/* ---------- INIT ---------- */
(async function init() {
  selectRole('siswa');
  const j = await api('me', {}, { silent: true });
  if (j && j.user) start(j.user);
})();