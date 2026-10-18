<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

$host = 'localhost';
$db   = 'setland';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host={$host};dbname={$db};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Koneksi database gagal. Pastikan MySQL aktif dan database setland sudah dibuat.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Terima request JSON dari Script.js.
$raw = file_get_contents('php://input');
$in = json_decode($raw ?: '{}', true);
if (!is_array($in)) $in = [];
$a = isset($_GET['a']) ? (string)$_GET['a'] : '';

function out($d, $c = 200) { http_response_code($c); echo json_encode($d, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE); exit; }
function fail($m, $c = 400) { out(['error' => $m], $c); }
function q($sql, $p = []) { global $pdo; $s = $pdo->prepare($sql); $s->execute($p); return $s; }

// Menyesuaikan database SQL yang disertakan dengan kolom yang dipakai API.
// Data yang sudah ada dipertahankan; kolom lama disalin ke kolom kompatibilitas.
function ensureColumn(PDO $pdo, string $table, string $column, string $definition): void {
    // SHOW COLUMNS ... LIKE ? tidak didukung oleh beberapa versi MariaDB.
    // information_schema dapat diperiksa dengan prepared statement secara aman.
    $st = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $st->execute([$table, $column]);
    if ((int)$st->fetchColumn() === 0) {
        // Nama tabel/kolom berasal dari pemanggilan internal di bawah, bukan input pengguna.
        $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
    }
}
function prepareSchema(PDO $pdo): void {
    // users
    ensureColumn($pdo, 'users', 'pass_hash', 'VARCHAR(255) NULL');
    ensureColumn($pdo, 'users', 'class_name', 'VARCHAR(50) NULL');
    ensureColumn($pdo, 'users', 'nisn', 'VARCHAR(30) NULL');
    ensureColumn($pdo, 'users', 'entry_year', 'SMALLINT NULL');
    ensureColumn($pdo, 'users', 'notif_read', 'INT NOT NULL DEFAULT 0');
    ensureColumn($pdo, 'users', 'birth_place', 'VARCHAR(100) NULL');
    ensureColumn($pdo, 'users', 'archive_reason', 'VARCHAR(255) NULL');
    $pdo->exec("UPDATE users SET pass_hash=password_hash WHERE pass_hash IS NULL OR pass_hash=''");
    // Kolom status lama menggunakan nilai Indonesia; API menggunakan active/pending/graduated/expelled.
    $pdo->exec("ALTER TABLE users MODIFY status VARCHAR(20) NOT NULL DEFAULT 'active'");
    $pdo->exec("UPDATE users SET status=CASE status WHEN 'aktif' THEN 'active' WHEN 'menunggu' THEN 'pending' ELSE status END");

    // topics
    ensureColumn($pdo, 'topics', 'descr', 'VARCHAR(255) NULL');
    ensureColumn($pdo, 'topics', 'materi', 'LONGTEXT NULL');
    ensureColumn($pdo, 'topics', 'sort_order', 'INT NOT NULL DEFAULT 0');
    $pdo->exec("UPDATE topics SET descr=COALESCE(descr,description), materi=COALESCE(materi,content), sort_order=IF(sort_order=0,position,sort_order)");

    // questions
    ensureColumn($pdo, 'questions', 'q', 'LONGTEXT NULL');
    ensureColumn($pdo, 'questions', 'options', 'LONGTEXT NULL');
    ensureColumn($pdo, 'questions', 'answer', 'INT NOT NULL DEFAULT 0');
    $pdo->exec("UPDATE questions SET q=COALESCE(q,question), options=COALESCE(options,JSON_ARRAY(option_a,option_b,option_c,option_d)), answer=COALESCE(correct_option,answer,0)");

    // results
    ensureColumn($pdo, 'results', 'kind', "VARCHAR(20) NOT NULL DEFAULT 'ujian'");
    ensureColumn($pdo, 'results', 'title', 'VARCHAR(150) NULL');
    ensureColumn($pdo, 'results', 'reviewed', 'TINYINT(1) NOT NULL DEFAULT 0');
    ensureColumn($pdo, 'results', 'edited', 'TINYINT(1) NOT NULL DEFAULT 0');
    ensureColumn($pdo, 'results', 'reviewed_by', 'INT NULL');
    ensureColumn($pdo, 'results', 'reviewed_at', 'DATETIME NULL');
    ensureColumn($pdo, 'results', 'created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP');
    $pdo->exec("UPDATE results SET kind=CASE WHEN title IS NOT NULL AND topic_id IS NULL THEN 'manual' ELSE 'ujian' END, reviewed=CASE WHEN status='selesai' THEN 1 ELSE reviewed END, created_at=COALESCE(created_at,submitted_at)");

    // answers and notifications
    ensureColumn($pdo, 'answers', 'work_photo', 'LONGTEXT NULL');
    $pdo->exec("UPDATE answers SET work_photo=work_path WHERE (work_photo IS NULL OR work_photo='') AND work_path IS NOT NULL");
    // video YouTube per materi
    $pdo->exec("CREATE TABLE IF NOT EXISTS videos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        topic_id INT NOT NULL,
        title VARCHAR(150) NOT NULL,
        youtube_id VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_topic (topic_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    ensureColumn($pdo, 'notifs', 'text', 'TEXT NULL');
    $pdo->exec("UPDATE notifs SET text=COALESCE(text,message)");
}
try {
    prepareSchema($pdo);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Struktur database belum cocok. Periksa tabel pada database setland. Detail: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}
function user() {
  if (empty($_SESSION['uid'])) return null;
  $u = q('SELECT id,name,email,role,status,class_name,nisn,entry_year,notif_read,gender,dob,birth_place FROM users WHERE id=?', [$_SESSION['uid']])->fetch();
  if (!$u || $u['status'] !== 'active') { unset($_SESSION['uid']); return null; }
  return $u;
}
function need($roles = []) {
  $u = user(); if (!$u) fail('Belum login', 401);
  if ($roles && !in_array($u['role'], $roles)) fail('Tidak diizinkan', 403);
  $u['id'] = (int)$u['id'];
  return $u;
}
const STAFF = ['guru', 'admin'];
const SECS = ['lkpd', 'latihan', 'evaluasi'];

/* ---------- Data awal (hanya jika tabel masih kosong) ---------- */
function seed(PDO $p) {
  if (!$p->query('SELECT COUNT(*) FROM users')->fetchColumn()) {
    $s = $p->prepare('INSERT INTO users(name,email,pass_hash,role,status) VALUES(?,?,?,?,?)');
    $s->execute(['Administrator', 'admin@setland.id', password_hash('admin123', PASSWORD_DEFAULT), 'admin', 'active']);
    $s->execute(['Guru Matematika', 'guru@setland.id', password_hash('guru123', PASSWORD_DEFAULT), 'guru', 'active']);
  }
  if (!$p->query('SELECT COUNT(*) FROM topics')->fetchColumn()) {
    $data = [
      ['Pengertian Himpunan', 'Anggota, notasi, dan cara menyatakan himpunan.',
       'Himpunan adalah kumpulan objek yang didefinisikan dengan jelas. Dinyatakan dengan huruf kapital, anggotanya ditulis di dalam kurung kurawal, contoh A = {1, 2, 3}. Simbol ∈ berarti "anggota dari".', [
        ['Manakah yang merupakan himpunan?', ['Kumpulan siswa pintar', 'Kumpulan bilangan prima kurang dari 10', 'Kumpulan buah enak', 'Kumpulan film bagus'], 1, 'Himpunan harus didefinisikan dengan jelas, tidak boleh bergantung pada selera.'],
        ['A = {2, 4, 6}. Banyak anggota A, n(A), adalah...', ['2', '3', '4', '6'], 1, 'Hitung berapa elemen di dalam kurung kurawal.'],
        ['Jika B = {a, b, c}, pernyataan yang benar adalah...', ['d ∈ B', 'a ∈ B', 'b ∉ B', 'c ∉ B'], 1, '∈ berarti "anggota dari", ∉ berarti bukan anggota.']]],
      ['Operasi Himpunan', 'Irisan, gabungan, selisih, dan komplemen.',
       'Irisan (A ∩ B) berisi anggota yang ada di A dan B. Gabungan (A ∪ B) berisi semua anggota A atau B. Selisih (A − B) berisi anggota A yang tidak ada di B.', [
        ['A = {1,2,3}, B = {2,3,4}. A ∩ B = ...', ['{1,4}', '{2,3}', '{1,2,3,4}', '{1}'], 1, 'Irisan = anggota yang dimiliki kedua himpunan.'],
        ['A = {1,2,3}, B = {2,3,4}. A ∪ B = ...', ['{2,3}', '{1,4}', '{1,2,3,4}', '{1,2,3}'], 2, 'Gabungan = semua anggota, anggota yang sama ditulis sekali saja.'],
        ['A = {1,2,3}, B = {2,3,4}. A − B = ...', ['{1}', '{4}', '{2,3}', '{1,4}'], 0, 'Ambil anggota A yang tidak ada di B.']]],
      ['Diagram Venn', 'Menyajikan himpunan dan menyelesaikan soal cerita.',
       'Diagram Venn menyajikan himpunan dengan kurva tertutup di dalam persegi panjang (semesta S). Untuk soal cerita: n(A ∪ B) = n(A) + n(B) − n(A ∩ B).', [
        ['n(A)=10, n(B)=8, n(A∩B)=3. n(A∪B) = ...', ['21', '18', '15', '11'], 2, 'Gunakan n(A∪B) = n(A) + n(B) − n(A∩B).'],
        ['Di kelas 30 siswa, 18 suka bola, 15 suka basket, 5 tidak suka keduanya. Yang suka keduanya?', ['5', '8', '10', '13'], 1, 'Yang suka minimal satu = 30 − 5 = 25. Lalu pakai rumus gabungan.'],
        ['Persegi panjang pada diagram Venn mewakili...', ['Irisan', 'Himpunan kosong', 'Himpunan semesta', 'Komplemen'], 2, 'Ia memuat semua himpunan yang dibicarakan.']]]
    ];
    foreach ($data as $i => $t) {
      $p->prepare('INSERT INTO topics(title,descr,materi,sort_order) VALUES(?,?,?,?)')->execute([$t[0], $t[1], $t[2], $i + 1]);
      $tid = $p->lastInsertId();
      foreach ($t[3] as $x)
        $p->prepare('INSERT INTO questions(topic_id,q,options,answer,hint) VALUES(?,?,?,?,?)')
          ->execute([$tid, $x[0], json_encode($x[1], JSON_UNESCAPED_UNICODE), $x[2], $x[3]]);
    }
  }
  if (!$p->query('SELECT COUNT(*) FROM notifs')->fetchColumn())
    $p->prepare('INSERT INTO notifs(text) VALUES(?)')->execute(['Selamat datang di SETLAND! Selesaikan tugas dengan nilai ≥ 60 untuk membuka materi berikutnya.']);
}
seed($pdo);

function clean($s, $max = 255) { return mb_substr(trim((string)$s), 0, $max); }
function userRow(array $u): array {
  foreach (['id', 'notif_read'] as $k) if (isset($u[$k])) $u[$k] = (int)$u[$k];
  if (isset($u['entry_year'])) $u['entry_year'] = (int)$u['entry_year'];
  return $u;
}
/* Nama harus nama orang (bukan email); profil guru wajib: jenis kelamin, tempat & tanggal lahir */
function checkName(string $n): void {
  if (mb_strlen($n) < 3) fail('Nama lengkap minimal 3 karakter.');
  if (strpos($n, '@') !== false) fail('Nama lengkap tidak boleh berupa email. Tulis nama asli, mis. Budi Santoso.');
}
function guruProfile(array $in): array {
  $g = $in['gender'] ?? ''; if (!in_array($g, ['Laki-laki', 'Perempuan'], true)) fail('Jenis kelamin guru wajib dipilih.');
  $bp = clean($in['birth_place'] ?? '', 100); if (!$bp) fail('Tempat lahir guru wajib diisi.');
  $d = (string)($in['dob'] ?? '');
  if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $d, $m) || !checkdate((int)$m[2], (int)$m[3], (int)$m[1]) || $d > date('Y-m-d')) fail('Tanggal lahir guru tidak valid.');
  return [$g, $bp, $d];
}
const USER_COLS = 'id,name,email,role,status,class_name,nisn,entry_year,dob,gender,birth_place,archive_reason,created_at';

/* ---------- Penilaian soal ---------- */
function norm($s) { return preg_replace('/\s+/u', ' ', mb_strtolower(trim((string)$s), 'UTF-8')); }
/* 1.0 benar, 0.0 salah/kosong, null = esai yang menunggu nilai guru */
function gradeAnswer(array $k, $a) {
  $blank = ($a === null || $a === '');
  if ($k['type'] === 'esai') return $blank ? 0.0 : null;
  if ($blank) return 0.0;
  if ($k['type'] === 'pilihan') return (is_numeric($a) && (int)$a === (int)$k['answer']) ? 1.0 : 0.0;
  foreach (explode('|', (string)$k['answer_text']) as $x) if (norm($x) !== '' && norm($x) === norm($a)) return 1.0;
  return 0.0;
}
function cleanPhoto($p) {
  if (!is_string($p) || !preg_match('#^data:image/jpeg;base64,#', $p) || strlen($p) > 450000) return null;
  return $p;
}
function cleanAnswers() { q('DELETE FROM answers WHERE result_id NOT IN (SELECT id FROM results)'); }

/* ---------- Video YouTube ---------- */
function youtubeId(string $u): ?string {
  $u = trim($u);
  if (preg_match('/^[A-Za-z0-9_-]{11}$/', $u)) return $u;
  if (preg_match('~^(?:https?://)?(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)/(?:watch\?(?:.*&)?v=|embed/|shorts/|live/|v/)?([A-Za-z0-9_-]{11})~i', $u, $m)) return $m[1];
  return null;
}
function videosByTopic(): array {
  $o = [];
  foreach (q('SELECT id,topic_id,title,youtube_id FROM videos ORDER BY id') as $r)
    $o[(int)$r['topic_id']][] = ['id' => (int)$r['id'], 'title' => $r['title'], 'youtube_id' => $r['youtube_id']];
  return $o;
}

/* ---------- Status belajar siswa ----------
   Setiap bagian (LKPD → Latihan Soal → Evaluasi) harus: dikirim, DINILAI guru, dan nilainya >= nilai minimal materi.
   state: terkunci | tersedia | menunggu (menunggu dinilai guru) | ulang (nilai kurang) | lulus */
function learnState(int $uid): array {
  $topics = q('SELECT id,title,descr,materi,lkpd_text,pass_min FROM topics ORDER BY sort_order,id')->fetchAll();
  $cnt = [];
  foreach (q('SELECT topic_id,section,COUNT(*) c FROM questions GROUP BY topic_id,section') as $r) $cnt[(int)$r['topic_id']][$r['section']] = (int)$r['c'];
  $pm = []; $vids = videosByTopic();
  foreach ($topics as $t) $pm[(int)$t['id']] = (int)$t['pass_min'];
  $res = [];
  foreach (q("SELECT topic_id,section,score,reviewed FROM results WHERE user_id=? AND kind='ujian' AND section IS NOT NULL AND topic_id IS NOT NULL ORDER BY id", [$uid]) as $r) {
    $t = (int)$r['topic_id']; $s = $r['section'];
    if (!isset($res[$t][$s])) $res[$t][$s] = ['pass' => false, 'rev' => 1, 'best' => null];
    $res[$t][$s]['rev'] = (int)$r['reviewed'];                       // status percobaan terakhir
    if ((int)$r['reviewed'] === 1) {
      $res[$t][$s]['best'] = max($res[$t][$s]['best'] ?? 0, (int)$r['score']);
      if ((int)$r['score'] >= ($pm[$t] ?? 60)) $res[$t][$s]['pass'] = true;
    }
  }
  $list = []; $prevPass = true;
  foreach ($topics as $t) {
    $id = (int)$t['id']; $open = $prevPass; $secs = []; $chain = $open; $last = null;
    foreach (SECS as $s) {
      $c = $cnt[$id][$s] ?? 0; if (!$c) continue;
      $x = $res[$id][$s] ?? null;
      if ($x && $x['pass']) $st = 'lulus';
      elseif (!$x) $st = 'tersedia';
      elseif ($x['rev'] === 0) $st = 'menunggu';
      else $st = 'ulang';
      if (!$chain && $st !== 'lulus') $st = 'terkunci';
      $secs[$s] = ['count' => $c, 'state' => $st, 'best' => $x['best'] ?? null];
      $chain = $chain && $st === 'lulus';
      $last = $s;
    }
    $list[] = ['id' => $id, 'title' => $t['title'], 'descr' => $t['descr'], 'materi' => $open ? $t['materi'] : '',
               'lkpd_text' => $open ? (string)$t['lkpd_text'] : '', 'pass_min' => (int)$t['pass_min'], 'unlocked' => $open, 'sections' => $secs,
               'videos' => $open ? ($vids[$id] ?? []) : []];
    $prevPass = $last === null ? $open : ($secs[$last]['state'] === 'lulus');
  }
  return $list;
}
function sectionFor(int $uid, int $tid, string $sec): array {
  if (!in_array($sec, SECS, true)) fail('Bagian tidak valid.');
  $t = null; foreach (learnState($uid) as $x) if ($x['id'] === $tid) $t = $x;
  if (!$t) fail('Materi tidak ditemukan.', 404);
  if (!$t['unlocked']) fail('Materi ini masih terkunci.', 403);
  $s = $t['sections'][$sec] ?? null;
  if (!$s) fail('Bagian ini belum punya soal.');
  return [$t, $s];
}
function guardOpen(string $st) {
  if ($st === 'terkunci') fail('Selesaikan bagian sebelumnya dan tunggu disetujui guru.', 403);
  if ($st === 'menunggu') fail('Jawabanmu masih menunggu dinilai guru.', 403);
  if ($st === 'lulus') fail('Bagian ini sudah lulus.', 403);
}

switch ($a) {
  /* ===== AUTH ===== */
  case 'me': out(['user' => user()]);
  case 'login':
    // bisa pakai email ATAU nama lengkap
    $login = trim($in['login'] ?? $in['email'] ?? ''); $role = $in['role'] ?? ''; $pass = $in['pass'] ?? '';
    if ($login === '' || $pass === '') fail('Isi email/nama dan kata sandi.');
    $bare = trim(preg_replace('/^(bapak|ibu|pak|bu)\s+/i', '', $login));   // "Bapak Budi" -> "Budi"
    $rows = q('SELECT * FROM users WHERE (email=? OR LOWER(name)=LOWER(?) OR LOWER(name)=LOWER(?)) AND role=?', [strtolower($login), $login, $bare, $role])->fetchAll();
    $u = null;
    foreach ($rows as $r) if (password_verify($pass, $r['pass_hash'])) { $u = $r; break; }
    if (!$u) fail('Email/nama, kata sandi, atau peran salah.', 401);
    if ($u['status'] === 'pending') fail('Akun belum disetujui admin. Silakan tunggu persetujuan.', 403);
    if ($u['status'] !== 'active') fail('Akun ini sudah diarsipkan (' . ($u['status'] === 'graduated' ? 'lulus' : 'dikeluarkan') . ').', 403);
    session_regenerate_id(true); $_SESSION['uid'] = $u['id'];
    out(['user' => user()]);
  case 'register':
    $email = strtolower(trim($in['email'] ?? '')); $name = clean($in['name'] ?? '', 100);
    checkName($name);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Email tidak valid.');
    if (strlen($in['pass'] ?? '') < 6) fail('Kata sandi minimal 6 karakter.');
    if (q('SELECT 1 FROM users WHERE email=?', [$email])->fetch()) fail('Email sudah terdaftar.');
    q('INSERT INTO users(name,email,pass_hash,role,status,dob,gender) VALUES(?,?,?,?,?,?,?)',
      [$name, $email, password_hash($in['pass'], PASSWORD_DEFAULT), 'siswa', 'pending', ($in['dob'] ?? '') ?: null, clean($in['gender'] ?? '', 20)]);
    out(['ok' => true]);
  case 'logout': session_destroy(); out(['ok' => true]);

  /* ===== MATERI & SOAL ===== */
  case 'topics':
    $u = need();
    if (!in_array($u['role'], STAFF)) out(['topics' => learnState($u['id'])]);   // siswa: status saja, tanpa soal & kunci
    $t = q('SELECT id,title,descr,materi,lkpd_text,pass_min,sort_order FROM topics ORDER BY sort_order,id')->fetchAll();
    $vids = videosByTopic();
    foreach ($t as &$x) {
      $x['id'] = (int)$x['id']; $x['pass_min'] = (int)$x['pass_min']; $x['questions'] = []; $x['videos'] = $vids[$x['id']] ?? [];
      foreach (q("SELECT id,section,type,q,options,answer,answer_text,hint,work_mode FROM questions WHERE topic_id=? ORDER BY FIELD(section,'lkpd','latihan','evaluasi'),id", [$x['id']]) as $r)
        $x['questions'][] = ['id' => (int)$r['id'], 'section' => $r['section'], 'type' => $r['type'], 'q' => $r['q'],
          'options' => json_decode($r['options'] ?? '[]', true) ?: [], 'answer' => (int)$r['answer'],
          'answer_text' => $r['answer_text'], 'hint' => $r['hint'], 'work_mode' => $r['work_mode']];
    } unset($x);
    out(['topics' => $t]);
  case 'topic_save':
    need(STAFF); $title = clean($in['title'] ?? '', 150);
    if (!$title) fail('Judul materi wajib diisi.');
    $lk = clean($in['lkpd_text'] ?? '', 20000) ?: null; $pm = max(0, min(100, (int)($in['pass_min'] ?? 60)));
    if (!empty($in['id'])) {
      q('UPDATE topics SET title=?,descr=?,materi=?,lkpd_text=?,pass_min=? WHERE id=?', [$title, clean($in['descr'] ?? ''), clean($in['materi'] ?? '', 20000), $lk, $pm, (int)$in['id']]);
      out(['ok' => true, 'id' => (int)$in['id']]);
    }
    $n = (int)q('SELECT COALESCE(MAX(sort_order),0)+1 FROM topics')->fetchColumn();
    q('INSERT INTO topics(title,descr,materi,lkpd_text,pass_min,sort_order) VALUES(?,?,?,?,?,?)', [$title, clean($in['descr'] ?? ''), clean($in['materi'] ?? '', 20000), $lk, $pm, $n]);
    out(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
  case 'topic_delete': need(STAFF); $tid = (int)($in['id'] ?? 0); q('DELETE FROM videos WHERE topic_id=?', [$tid]); q('DELETE FROM topics WHERE id=?', [$tid]); cleanAnswers(); out(['ok' => true]);
  case 'video_save':
    need(STAFF); $tid = (int)($in['topic_id'] ?? 0);
    if (!q('SELECT 1 FROM topics WHERE id=?', [$tid])->fetch()) fail('Materi tidak ditemukan.', 404);
    $yt = youtubeId((string)($in['url'] ?? '')); if (!$yt) fail('Tautan YouTube tidak valid. Contoh: https://www.youtube.com/watch?v=xxxxxxxxxxx');
    if ((int)q('SELECT COUNT(*) FROM videos WHERE topic_id=?', [$tid])->fetchColumn() >= 10) fail('Maksimal 10 video per materi.');
    $title = clean($in['title'] ?? '', 150) ?: 'Video pembelajaran';
    q('INSERT INTO videos(topic_id,title,youtube_id) VALUES(?,?,?)', [$tid, $title, $yt]); out(['ok' => true]);
  case 'video_delete': need(STAFF); q('DELETE FROM videos WHERE id=?', [(int)($in['id'] ?? 0)]); out(['ok' => true]);
  case 'question_save':
    need(STAFF);
    $sec = $in['section'] ?? 'latihan'; $type = $in['type'] ?? 'pilihan'; $wm = $in['work_mode'] ?? 'off';
    if (!in_array($sec, SECS, true)) fail('Bagian soal tidak valid.');
    if (!in_array($type, ['pilihan', 'isian', 'esai'], true)) fail('Jenis soal tidak valid.');
    if (!in_array($wm, ['off', 'opsional', 'wajib'], true)) $wm = 'off';
    if ($sec === 'lkpd' && $type !== 'esai') fail('Soal LKPD harus berupa esai.');
    $qt = clean($in['q'] ?? '', 2000); if (!$qt) fail('Pertanyaan wajib diisi.');
    $opts = []; $ans = 0; $at = null;
    if ($type === 'pilihan') {
      $opts = array_values(array_filter(array_map(fn($x) => clean($x, 200), $in['options'] ?? []), fn($x) => $x !== ''));
      $ans = (int)($in['answer'] ?? 0);
      if (count($opts) < 2) fail('Minimal 2 pilihan jawaban wajib diisi.');
      if ($ans < 0 || $ans >= count($opts)) fail('Jawaban benar harus salah satu pilihan yang terisi.');
    } elseif ($type === 'isian') {
      $at = clean($in['answer_text'] ?? '', 255); if (!$at) fail('Jawaban benar untuk soal isian wajib diisi.');
    } else {
      $at = clean($in['answer_text'] ?? '', 255) ?: null;      // pedoman penilaian (opsional)
    }
    $hint = $type === 'esai' ? '' : clean($in['hint'] ?? '');
    $oj = json_encode($opts, JSON_UNESCAPED_UNICODE);
    if (!empty($in['id']))
      q('UPDATE questions SET section=?,type=?,q=?,options=?,answer=?,answer_text=?,hint=?,work_mode=? WHERE id=?', [$sec, $type, $qt, $oj, $ans, $at, $hint, $wm, (int)$in['id']]);
    else {
      if (!q('SELECT 1 FROM topics WHERE id=?', [(int)($in['topic_id'] ?? 0)])->fetch()) fail('Materi tidak ditemukan.', 404);
      q('INSERT INTO questions(topic_id,section,type,q,options,answer,answer_text,hint,work_mode) VALUES(?,?,?,?,?,?,?,?,?)', [(int)$in['topic_id'], $sec, $type, $qt, $oj, $ans, $at, $hint, $wm]);
    }
    out(['ok' => true]);
  case 'question_delete': need(STAFF); q('DELETE FROM questions WHERE id=?', [(int)($in['id'] ?? 0)]); out(['ok' => true]);

  /* ===== PENGERJAAN SISWA ===== */
  case 'start': // soal dikirim hanya jika bagian ini memang terbuka (tanpa kunci jawaban)
    $u = need(['siswa']); $tid = (int)($in['topic_id'] ?? 0); $sec = (string)($in['section'] ?? '');
    [$t, $s] = sectionFor($u['id'], $tid, $sec); guardOpen($s['state']);
    $qs = q('SELECT id,type,q,options,work_mode FROM questions WHERE topic_id=? AND section=? ORDER BY id', [$tid, $sec])->fetchAll();
    out(['topic' => ['id' => $tid, 'title' => $t['title'], 'lkpd_text' => $t['lkpd_text'], 'section' => $sec],
         'questions' => array_map(fn($r) => ['id' => (int)$r['id'], 'type' => $r['type'], 'q' => $r['q'],
           'options' => json_decode($r['options'] ?? '[]', true) ?: [], 'work_mode' => $r['work_mode']], $qs)]);
  case 'check': // petunjuk tanpa membocorkan kunci jawaban
    $u = need(['siswa']); $tid = (int)($in['topic_id'] ?? 0); $sec = (string)($in['section'] ?? '');
    [$t, $s] = sectionFor($u['id'], $tid, $sec); guardOpen($s['state']);
    $ans = $in['ans'] ?? []; $res = [];
    foreach (q('SELECT id,type,answer,answer_text,hint FROM questions WHERE topic_id=? AND section=?', [$tid, $sec]) as $r) {
      $id = (int)$r['id']; $v = $ans[$id] ?? null;
      if ($r['type'] === 'esai') $res[] = ['id' => $id, 'status' => 'esai'];
      elseif ($v === null || $v === '') $res[] = ['id' => $id, 'status' => 'empty'];
      elseif (gradeAnswer($r, $v) === 1.0) $res[] = ['id' => $id, 'status' => 'ok'];
      else $res[] = ['id' => $id, 'status' => 'wrong', 'hint' => $r['hint']];
    }
    out(['items' => $res]);
  case 'submit':
    $u = need(['siswa']); $tid = (int)($in['topic_id'] ?? 0); $sec = (string)($in['section'] ?? '');
    [$t, $s] = sectionFor($u['id'], $tid, $sec); guardOpen($s['state']);
    $qs = q('SELECT id,type,answer,answer_text,work_mode,q FROM questions WHERE topic_id=? AND section=? ORDER BY id', [$tid, $sec])->fetchAll();
    $ans = is_array($in['ans'] ?? null) ? $in['ans'] : []; $work = is_array($in['work'] ?? null) ? $in['work'] : [];
    $auto = !empty($in['auto']); $sum = 0.0; $right = 0; $items = [];
    foreach ($qs as $k) {
      $id = (int)$k['id']; $v = $ans[$id] ?? null; if (is_array($v)) $v = null;
      $v = $v === null ? null : mb_substr((string)$v, 0, 5000);
      $g = gradeAnswer($k, $v);
      if ($g !== null) { $sum += $g; if ($g === 1.0) $right++; }
      $w = cleanPhoto($work[$id] ?? null);
      if (!$auto && $k['work_mode'] === 'wajib' && !$w) fail('Soal "' . mb_substr($k['q'], 0, 50) . '" wajib melampirkan foto cara mengerjakan.');
      $items[] = [$id, $v, $g, $w];
    }
    $score = (int)round($sum / count($qs) * 100);
    $pdo->beginTransaction();
    q("INSERT INTO results(user_id,topic_id,section,kind,score,cheats,auto_submitted,reviewed) VALUES(?,?,?,'ujian',?,?,?,0)",
      [$u['id'], $tid, $sec, $score, max(0, (int)($in['cheats'] ?? 0)), $auto ? 1 : 0]);
    $rid = (int)$pdo->lastInsertId();
    foreach ($items as [$id, $v, $g, $w]) q('INSERT INTO answers(result_id,question_id,answer,awarded,work_photo) VALUES(?,?,?,?,?)', [$rid, $id, $v, $g, $w]);
    $pdo->commit();
    out(['score' => $score, 'right' => $right, 'total' => count($qs), 'pending' => true]);

  /* ===== NILAI (siswa hanya melihat miliknya sendiri) ===== */
  case 'results':
    $u = need(); $sql = 'SELECT r.id,r.user_id,u.name,u.class_name,r.topic_id,r.section,COALESCE(t.title,r.title) AS title,r.kind,r.score,r.cheats,r.auto_submitted,r.edited,r.reviewed,COALESCE(t.pass_min,60) AS pass_min,r.created_at
      FROM results r JOIN users u ON u.id=r.user_id LEFT JOIN topics t ON t.id=r.topic_id';
    $rows = $u['role'] === 'siswa' ? q($sql . ' WHERE r.user_id=? ORDER BY r.id DESC', [$u['id']])->fetchAll() : q($sql . ' ORDER BY r.id DESC')->fetchAll();
    foreach ($rows as &$r) { foreach (['id','user_id','score','cheats','pass_min'] as $k) $r[$k] = (int)$r[$k]; $r['topic_id'] = $r['topic_id'] === null ? null : (int)$r['topic_id']; foreach (['auto_submitted','edited','reviewed'] as $k) $r[$k] = (bool)$r[$k]; } unset($r);
    out(['results' => $rows]);
  case 'result_update':
    need(STAFF); $s = (int)($in['score'] ?? -1); if ($s < 0 || $s > 100) fail('Nilai harus 0–100.');
    q('UPDATE results SET score=?, edited=1 WHERE id=?', [$s, (int)$in['id']]); out(['ok' => true]);
  case 'result_delete': need(STAFF); q('DELETE FROM results WHERE id=?', [(int)($in['id'] ?? 0)]); cleanAnswers(); out(['ok' => true]);
  case 'result_detail': // guru/admin melihat jawaban siswa + foto cara mengerjakan
    need(STAFF); $id = (int)($in['id'] ?? 0);
    $r = q("SELECT r.id,r.user_id,u.name,u.class_name,r.section,r.score,r.reviewed,r.cheats,r.auto_submitted,COALESCE(t.title,r.title) AS title,COALESCE(t.pass_min,60) AS pass_min
            FROM results r JOIN users u ON u.id=r.user_id LEFT JOIN topics t ON t.id=r.topic_id WHERE r.id=? AND r.kind='ujian'", [$id])->fetch();
    if (!$r) fail('Hasil tidak ditemukan.', 404);
    $items = [];
    foreach (q('SELECT a.id,a.answer,a.awarded,a.work_photo,k.q,k.type,k.options,k.answer AS correct,k.answer_text,k.work_mode
                FROM answers a LEFT JOIN questions k ON k.id=a.question_id WHERE a.result_id=? ORDER BY a.id', [$id]) as $x) {
      $type = $x['type'] ?? 'pilihan'; $shown = $x['answer']; $key = $x['answer_text'];
      if ($type === 'pilihan') {
        $o = json_decode($x['options'] ?? '[]', true) ?: [];
        $i = ($x['answer'] !== null && $x['answer'] !== '') ? (int)$x['answer'] : null;
        $shown = ($i !== null && isset($o[$i])) ? chr(65 + $i) . '. ' . $o[$i] : null;
        $c = (int)$x['correct']; $key = chr(65 + $c) . '. ' . ($o[$c] ?? '');
      }
      $items[] = ['id' => (int)$x['id'], 'q' => $x['q'] ?? '(soal sudah dihapus)', 'type' => $type, 'work_mode' => $x['work_mode'] ?? 'off',
                  'answer' => $shown, 'key' => $key, 'awarded' => $x['awarded'] !== null ? (float)$x['awarded'] : null, 'photo' => $x['work_photo']];
    }
    foreach (['id','user_id','score','cheats','pass_min'] as $k) $r[$k] = (int)$r[$k];
    $r['reviewed'] = (bool)$r['reviewed']; $r['auto_submitted'] = (bool)$r['auto_submitted'];
    out(['result' => $r, 'items' => $items]);
  case 'result_review': // guru/admin menilai esai, menetapkan nilai akhir, dan menyetujui
    $u = need(STAFF); $id = (int)($in['id'] ?? 0);
    $r = q("SELECT r.id,COALESCE(t.pass_min,60) AS pm FROM results r LEFT JOIN topics t ON t.id=r.topic_id WHERE r.id=? AND r.kind='ujian'", [$id])->fetch();
    if (!$r) fail('Hasil tidak ditemukan.', 404);
    $grades = is_array($in['grades'] ?? null) ? $in['grades'] : [];
    foreach ($grades as $aid => $pct) {
      if (!is_numeric($pct) || $pct < 0 || $pct > 100) fail('Skor esai harus 0–100.');
      q("UPDATE answers a JOIN questions k ON k.id=a.question_id SET a.awarded=? WHERE a.id=? AND a.result_id=? AND k.type='esai'", [round($pct / 100, 2), (int)$aid, $id]);
    }
    $row = q('SELECT COUNT(*) n, COALESCE(SUM(awarded),0) s, SUM(awarded IS NULL) p FROM answers WHERE result_id=?', [$id])->fetch();
    if ((int)$row['p'] > 0) fail('Isi skor untuk semua soal esai sebelum menyimpan.');
    $autoScore = (int)round((float)$row['s'] / max(1, (int)$row['n']) * 100);
    $final = $autoScore; $edited = 0;
    if (isset($in['score']) && is_numeric($in['score'])) {
      $s = (int)round($in['score']); if ($s < 0 || $s > 100) fail('Nilai akhir harus 0–100.');
      if ($s !== $autoScore) { $final = $s; $edited = 1; }
    }
    q('UPDATE results SET score=?, reviewed=1, reviewed_by=?, reviewed_at=NOW(), edited=? WHERE id=?', [$final, $u['id'], $edited, $id]);
    out(['score' => $final, 'passed' => $final >= (int)$r['pm']]);
  case 'students': // daftar siswa aktif untuk input nilai manual
    need(STAFF); out(['students' => array_map('userRow', q("SELECT id,name,email,class_name,nisn FROM users WHERE role='siswa' AND status='active' ORDER BY class_name,name")->fetchAll())]);
  case 'grade_add': // guru mengunggah nilai manual; hanya siswa bersangkutan yang bisa melihat
    need(STAFF); $uid = (int)($in['user_id'] ?? 0); $title = clean($in['title'] ?? '', 150); $s = (int)($in['score'] ?? -1);
    if (!$title) fail('Nama penilaian wajib diisi.');
    if ($s < 0 || $s > 100) fail('Nilai harus 0–100.');
    if (!q("SELECT 1 FROM users WHERE id=? AND role='siswa' AND status='active'", [$uid])->fetch()) fail('Siswa tidak ditemukan.', 404);
    q('INSERT INTO results(user_id,topic_id,title,kind,score,reviewed) VALUES(?,NULL,?,?,?,1)', [$uid, $title, 'manual', $s]);
    out(['ok' => true]);

  /* ===== PENGUMUMAN ===== */
  case 'notifs': need(); out(['notifs' => q('SELECT id,text,created_at FROM notifs ORDER BY id DESC LIMIT 50')->fetchAll()]);
  case 'notif_add':
    need(STAFF); $t = clean($in['text'] ?? '', 1000); if (!$t) fail('Isi pengumuman kosong.');
    q('INSERT INTO notifs(text) VALUES(?)', [$t]); out(['ok' => true]);
  case 'notif_read':
    $u = need(); $m = (int)q('SELECT COALESCE(MAX(id),0) FROM notifs')->fetchColumn();
    q('UPDATE users SET notif_read=? WHERE id=?', [$m, $u['id']]); out(['read' => $m]);

  /* ===== STATISTIK ===== */
  case 'stats':
    need(STAFF);
    out(['siswa' => (int)q("SELECT COUNT(*) FROM users WHERE role='siswa' AND status='active'")->fetchColumn(),
         'guru' => (int)q("SELECT COUNT(*) FROM users WHERE role='guru'")->fetchColumn(),
         'pending' => (int)q("SELECT COUNT(*) FROM users WHERE status='pending'")->fetchColumn(),
         'arsip' => (int)q("SELECT COUNT(*) FROM users WHERE status IN ('graduated','expelled')")->fetchColumn(),
         'hasil' => (int)q('SELECT COUNT(*) FROM results')->fetchColumn(),
         'menunggu' => (int)q("SELECT COUNT(*) FROM results WHERE kind='ujian' AND reviewed=0")->fetchColumn(),
         'curang' => (int)q('SELECT COUNT(*) FROM results WHERE cheats>0')->fetchColumn(),
         'materi' => (int)q('SELECT COUNT(*) FROM topics')->fetchColumn()]);

  /* ===== ADMIN: REQUEST PENDAFTARAN ===== */
  case 'requests':
    need(['admin']); out(['requests' => array_map('userRow', q("SELECT " . USER_COLS . " FROM users WHERE status='pending' ORDER BY id")->fetchAll())]);
  case 'request_approve':
    need(['admin']); $id = (int)($in['id'] ?? 0);
    $cls = clean($in['class_name'] ?? '', 50); $nisn = clean($in['nisn'] ?? '', 30); $yr = (int)($in['entry_year'] ?? 0);
    if (!$cls || !$nisn) fail('Kelas dan NIS/NISN wajib diisi.');
    if ($yr < 2000 || $yr > 2100) fail('Tahun masuk tidak valid.');
    if (!q("SELECT 1 FROM users WHERE id=? AND status='pending'", [$id])->fetch()) fail('Request tidak ditemukan.', 404);
    q("UPDATE users SET status='active',class_name=?,nisn=?,entry_year=? WHERE id=?", [$cls, $nisn, $yr, $id]);
    out(['ok' => true]);
  case 'request_reject':
    need(['admin']); q("DELETE FROM users WHERE id=? AND status='pending'", [(int)($in['id'] ?? 0)]); out(['ok' => true]);

  /* ===== ADMIN: PENGGUNA ===== */
  case 'users': need(['admin']); out(['users' => array_map('userRow', q('SELECT ' . USER_COLS . " FROM users WHERE status<>'pending' ORDER BY FIELD(role,'admin','guru','siswa'),status,name")->fetchAll())]);
  case 'user_add':
    need(['admin']); $role = $in['role'] ?? ''; if (!in_array($role, ['guru', 'siswa'])) fail('Peran harus guru atau siswa.');
    $email = strtolower(trim($in['email'] ?? '')); $name = clean($in['name'] ?? '', 100);
    checkName($name);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Email tidak valid.');
    if (strlen($in['pass'] ?? '') < 6) fail('Kata sandi minimal 6 karakter.');
    if (q('SELECT 1 FROM users WHERE email=?', [$email])->fetch()) fail('Email sudah terdaftar.');
    $cls = $nisn = $gender = $bp = $dob = null; $yr = null;
    if ($role === 'siswa') {
      $cls = clean($in['class_name'] ?? '', 50); $nisn = clean($in['nisn'] ?? '', 30); $yr = (int)($in['entry_year'] ?? 0);
      if (!$cls || !$nisn) fail('Kelas dan NIS/NISN wajib diisi untuk siswa.');
      if ($yr < 2000 || $yr > 2100) fail('Tahun masuk tidak valid.');
    } else [$gender, $bp, $dob] = guruProfile($in);
    q("INSERT INTO users(name,email,pass_hash,role,status,class_name,nisn,entry_year,gender,birth_place,dob) VALUES(?,?,?,?,'active',?,?,?,?,?,?)",
      [$name, $email, password_hash($in['pass'], PASSWORD_DEFAULT), $role, $cls, $nisn, $yr, $gender, $bp, $dob]);
    out(['ok' => true]);
  case 'user_update': // admin mengubah data pengguna (nama, email, profil guru, kelas siswa, sandi)
    need(['admin']); $id = (int)($in['id'] ?? 0);
    $u = q('SELECT id,role FROM users WHERE id=?', [$id])->fetch(); if (!$u) fail('Pengguna tidak ditemukan.', 404);
    $name = clean($in['name'] ?? '', 100); $email = strtolower(trim($in['email'] ?? ''));
    checkName($name);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Email tidak valid.');
    if (q('SELECT 1 FROM users WHERE email=? AND id<>?', [$email, $id])->fetch()) fail('Email sudah dipakai pengguna lain.');
    q('UPDATE users SET name=?,email=? WHERE id=?', [$name, $email, $id]);
    if ($u['role'] === 'guru') {
      [$g, $bp, $d] = guruProfile($in);
      q('UPDATE users SET gender=?,birth_place=?,dob=? WHERE id=?', [$g, $bp, $d, $id]);
    } elseif ($u['role'] === 'siswa') {
      $cls = clean($in['class_name'] ?? '', 50); $nisn = clean($in['nisn'] ?? '', 30); $yr = (int)($in['entry_year'] ?? 0);
      if (!$cls || !$nisn) fail('Kelas dan NIS/NISN wajib diisi untuk siswa.');
      if ($yr < 2000 || $yr > 2100) fail('Tahun masuk tidak valid.');
      q('UPDATE users SET class_name=?,nisn=?,entry_year=? WHERE id=?', [$cls, $nisn, $yr, $id]);
    }
    if (($in['pass'] ?? '') !== '') {
      if (strlen($in['pass']) < 6) fail('Kata sandi baru minimal 6 karakter.');
      q('UPDATE users SET pass_hash=? WHERE id=?', [password_hash($in['pass'], PASSWORD_DEFAULT), $id]);
    }
    out(['ok' => true]);
  case 'user_archive': // lulus / dikeluarkan, wajib alasan
    need(['admin']); $id = (int)($in['id'] ?? 0); $st = $in['status'] ?? ''; $reason = clean($in['reason'] ?? '');
    if (!in_array($st, ['graduated', 'expelled'])) fail('Status harus lulus atau dikeluarkan.');
    if (!$reason) fail('Alasan wajib diisi.');
    if (!q("SELECT 1 FROM users WHERE id=? AND role='siswa' AND status='active'", [$id])->fetch()) fail('Siswa aktif tidak ditemukan.', 404);
    q('UPDATE users SET status=?,archive_reason=? WHERE id=?', [$st, $reason, $id]); out(['ok' => true]);
  case 'user_restore':
    need(['admin']); q("UPDATE users SET status='active',archive_reason=NULL WHERE id=? AND role='siswa' AND status IN ('graduated','expelled')", [(int)($in['id'] ?? 0)]); out(['ok' => true]);
  case 'user_delete':
    need(['admin']); $id = (int)($in['id'] ?? 0);
    q("DELETE FROM users WHERE id=? AND role<>'admin'", [$id]); cleanAnswers(); out(['ok' => true]);
  default: fail('Aksi tidak dikenal.', 404);
}