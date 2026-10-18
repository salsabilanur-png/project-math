-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 18, 2026 at 04:58 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `setland`
--

-- --------------------------------------------------------

--
-- Table structure for table `answers`
--

CREATE TABLE `answers` (
  `id` int(10) UNSIGNED NOT NULL,
  `result_id` int(10) UNSIGNED NOT NULL,
  `question_id` int(10) UNSIGNED DEFAULT NULL,
  `answer` text DEFAULT NULL,
  `awarded` decimal(5,2) DEFAULT NULL,
  `work_path` varchar(255) DEFAULT NULL,
  `work_photo` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `answers`
--

INSERT INTO `answers` (`id`, `result_id`, `question_id`, `answer`, `awarded`, `work_path`, `work_photo`) VALUES
(1, 1, 12, NULL, 0.00, NULL, NULL),
(2, 2, 12, NULL, 0.00, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` int(10) UNSIGNED NOT NULL,
  `to_user_id` int(10) UNSIGNED NOT NULL,
  `from_user_id` int(10) UNSIGNED DEFAULT NULL,
  `result_id` int(10) UNSIGNED DEFAULT NULL,
  `body` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifs`
--

CREATE TABLE `notifs` (
  `id` int(10) UNSIGNED NOT NULL,
  `message` text NOT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `text` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifs`
--

INSERT INTO `notifs` (`id`, `message`, `created_by`, `created_at`, `text`) VALUES
(1, 'Selamat datang di SETLAND! Selesaikan tugas dengan nilai ≥ 60 untuk membuka materi berikutnya.', 1, '2026-10-18 10:39:18', 'Selamat datang di SETLAND! Selesaikan tugas dengan nilai ≥ 60 untuk membuka materi berikutnya.');

-- --------------------------------------------------------

--
-- Table structure for table `notif_reads`
--

CREATE TABLE `notif_reads` (
  `user_id` int(10) UNSIGNED NOT NULL,
  `notif_id` int(10) UNSIGNED NOT NULL,
  `read_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `questions`
--

CREATE TABLE `questions` (
  `id` int(10) UNSIGNED NOT NULL,
  `topic_id` int(10) UNSIGNED NOT NULL,
  `section` enum('lkpd','latihan','evaluasi') NOT NULL DEFAULT 'latihan',
  `type` enum('pilihan','isian','esai') NOT NULL DEFAULT 'pilihan',
  `question` text NOT NULL,
  `option_a` varchar(255) DEFAULT NULL,
  `option_b` varchar(255) DEFAULT NULL,
  `option_c` varchar(255) DEFAULT NULL,
  `option_d` varchar(255) DEFAULT NULL,
  `correct_option` tinyint(3) UNSIGNED DEFAULT NULL,
  `answer_text` varchar(255) DEFAULT NULL,
  `hint` varchar(255) DEFAULT NULL,
  `work_mode` enum('off','opsional','wajib') NOT NULL DEFAULT 'off',
  `position` int(11) NOT NULL DEFAULT 0,
  `q` longtext DEFAULT NULL,
  `options` longtext DEFAULT NULL,
  `answer` int(11) NOT NULL DEFAULT 0
) ;

--
-- Dumping data for table `questions`
--

INSERT INTO `questions` (`id`, `topic_id`, `section`, `type`, `question`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_option`, `answer_text`, `hint`, `work_mode`, `position`, `q`, `options`, `answer`) VALUES
(1, 1, 'latihan', 'pilihan', 'Manakah yang merupakan himpunan?', 'Kumpulan siswa pintar', 'Kumpulan bilangan prima kurang dari 10', 'Kumpulan buah enak', 'Kumpulan film bagus', 1, NULL, 'Himpunan harus didefinisikan dengan jelas, tidak boleh bergantung pada selera.', 'off', 1, 'Manakah yang merupakan himpunan?', '[\"Kumpulan siswa pintar\", \"Kumpulan bilangan prima kurang dari 10\", \"Kumpulan buah enak\", \"Kumpulan film bagus\"]', 1),
(2, 1, 'latihan', 'pilihan', 'A = {2, 4, 6}. Banyak anggota A, n(A), adalah...', '2', '3', '4', '6', 1, NULL, 'Hitung berapa elemen di dalam kurung kurawal.', 'off', 2, 'A = {2, 4, 6}. Banyak anggota A, n(A), adalah...', '[\"2\", \"3\", \"4\", \"6\"]', 1),
(3, 1, 'latihan', 'pilihan', 'Jika B = {a, b, c}, pernyataan yang benar adalah...', 'd ∈ B', 'a ∈ B', 'b ∉ B', 'c ∉ B', 1, NULL, '∈ berarti \"anggota dari\", ∉ berarti bukan anggota.', 'off', 3, 'Jika B = {a, b, c}, pernyataan yang benar adalah...', '[\"d ∈ B\", \"a ∈ B\", \"b ∉ B\", \"c ∉ B\"]', 1),
(4, 1, 'latihan', 'isian', 'Banyak anggota himpunan C = {a, b, c, d, e} adalah ... (tulis angkanya saja)', NULL, NULL, NULL, NULL, NULL, '5', 'Hitung semua huruf di dalam kurung kurawal.', 'off', 4, 'Banyak anggota himpunan C = {a, b, c, d, e} adalah ... (tulis angkanya saja)', '[null, null, null, null]', 0),
(5, 2, 'latihan', 'pilihan', 'A = {1,2,3}, B = {2,3,4}. A ∩ B = ...', '{1,4}', '{2,3}', '{1,2,3,4}', '{1}', 1, NULL, 'Irisan = anggota yang dimiliki kedua himpunan.', 'off', 1, 'A = {1,2,3}, B = {2,3,4}. A ∩ B = ...', '[\"{1,4}\", \"{2,3}\", \"{1,2,3,4}\", \"{1}\"]', 1),
(6, 2, 'latihan', 'pilihan', 'A = {1,2,3}, B = {2,3,4}. A ∪ B = ...', '{2,3}', '{1,4}', '{1,2,3,4}', '{1,2,3}', 2, NULL, 'Gabungan = semua anggota, anggota yang sama cukup ditulis satu kali.', 'off', 2, 'A = {1,2,3}, B = {2,3,4}. A ∪ B = ...', '[\"{2,3}\", \"{1,4}\", \"{1,2,3,4}\", \"{1,2,3}\"]', 2),
(7, 2, 'latihan', 'pilihan', 'A = {1,2,3}, B = {2,3,4}. A − B = ...', '{1}', '{4}', '{2,3}', '{1,4}', 0, NULL, 'Ambil anggota A yang tidak ada di B.', 'off', 3, 'A = {1,2,3}, B = {2,3,4}. A − B = ...', '[\"{1}\", \"{4}\", \"{2,3}\", \"{1,4}\"]', 0),
(8, 3, 'latihan', 'pilihan', 'n(A)=10, n(B)=8, n(A∩B)=3. n(A∪B) = ...', '21', '18', '15', '11', 2, NULL, 'Gunakan n(A∪B) = n(A) + n(B) − n(A∩B).', 'off', 1, 'n(A)=10, n(B)=8, n(A∩B)=3. n(A∪B) = ...', '[\"21\", \"18\", \"15\", \"11\"]', 2),
(9, 3, 'latihan', 'pilihan', 'Di kelas 30 siswa, 18 suka bola, 15 suka basket, 5 tidak suka keduanya. Yang suka keduanya?', '5', '8', '10', '13', 1, NULL, 'Yang suka minimal satu = 30 − 5 = 25. Lalu pakai rumus gabungan.', 'off', 2, 'Di kelas 30 siswa, 18 suka bola, 15 suka basket, 5 tidak suka keduanya. Yang suka keduanya?', '[\"5\", \"8\", \"10\", \"13\"]', 1),
(10, 3, 'latihan', 'pilihan', 'Persegi panjang pada diagram Venn mewakili...', 'Irisan', 'Himpunan kosong', 'Himpunan semesta', 'Komplemen', 2, NULL, 'Ia memuat semua himpunan yang dibicarakan.', 'off', 3, 'Persegi panjang pada diagram Venn mewakili...', '[\"Irisan\", \"Himpunan kosong\", \"Himpunan semesta\", \"Komplemen\"]', 2),
(11, 3, 'latihan', 'esai', 'Jelaskan dengan kata-katamu sendiri apa yang dimaksud dengan irisan dua himpunan, lalu berikan satu contoh.', NULL, NULL, NULL, NULL, NULL, 'Irisan = anggota yang dimiliki kedua himpunan. Contoh bebas asalkan benar.', NULL, 'off', 4, 'Jelaskan dengan kata-katamu sendiri apa yang dimaksud dengan irisan dua himpunan, lalu berikan satu contoh.', '[null, null, null, null]', 0),
(12, 1, 'lkpd', 'esai', 'Tuliskan jawaban kegiatan di atas beserta alasanmu.', NULL, NULL, NULL, NULL, NULL, 'Contoh himpunan harus jelas batasannya (bukan \"pintar\" atau \"enak\").', NULL, 'off', 1, 'Tuliskan jawaban kegiatan di atas beserta alasanmu.', '[null, null, null, null]', 0),
(13, 2, 'lkpd', 'esai', 'Tuliskan irisan dan gabungan kedua kelompokmu, lalu jelaskan caramu menentukannya.', NULL, NULL, NULL, NULL, NULL, 'Irisan = anggota di kedua kelompok; gabungan = semua anggota.', NULL, 'off', 1, 'Tuliskan irisan dan gabungan kedua kelompokmu, lalu jelaskan caramu menentukannya.', '[null, null, null, null]', 0),
(14, 3, 'lkpd', 'esai', 'Gambarkan diagram Venn-mu (jelaskan dengan kata-kata) dan sebutkan arti daerah irisannya.', NULL, NULL, NULL, NULL, NULL, 'Irisan = siswa yang menyukai kedua pelajaran.', NULL, 'off', 1, 'Gambarkan diagram Venn-mu (jelaskan dengan kata-kata) dan sebutkan arti daerah irisannya.', '[null, null, null, null]', 0),
(15, 1, 'evaluasi', 'pilihan', 'Simbol yang menyatakan \"anggota dari\" adalah...', '∈', '∉', '∪', '∩', 0, NULL, 'Ingat simbol anggota pada materi.', 'off', 1, 'Simbol yang menyatakan \"anggota dari\" adalah...', '[\"∈\", \"∉\", \"∪\", \"∩\"]', 0),
(16, 2, 'evaluasi', 'pilihan', 'Jika A = {1,2} dan B = {2,3}, maka A ∪ B = ...', '{2}', '{1,3}', '{1,2,3}', '{1,2}', 2, NULL, 'Gabungan memuat semua anggota kedua himpunan.', 'off', 1, 'Jika A = {1,2} dan B = {2,3}, maka A ∪ B = ...', '[\"{2}\", \"{1,3}\", \"{1,2,3}\", \"{1,2}\"]', 2),
(17, 3, 'evaluasi', 'pilihan', 'Jika n(A)=6, n(B)=5, dan n(A∩B)=2, maka n(A∪B) = ...', '13', '9', '11', '8', 1, NULL, 'n(A∪B) = n(A) + n(B) − n(A∩B).', 'off', 1, 'Jika n(A)=6, n(B)=5, dan n(A∩B)=2, maka n(A∪B) = ...', '[\"13\", \"9\", \"11\", \"8\"]', 1);

-- --------------------------------------------------------

--
-- Table structure for table `results`
--

CREATE TABLE `results` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `topic_id` int(10) UNSIGNED DEFAULT NULL,
  `section` enum('lkpd','latihan','evaluasi') NOT NULL DEFAULT 'latihan',
  `score` tinyint(3) UNSIGNED NOT NULL,
  `status` enum('selesai','menunggu') NOT NULL DEFAULT 'selesai',
  `answered` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `cheats` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `auto_submitted` tinyint(1) NOT NULL DEFAULT 0,
  `late` tinyint(1) NOT NULL DEFAULT 0,
  `abandoned` tinyint(1) NOT NULL DEFAULT 0,
  `has_photo` tinyint(1) NOT NULL DEFAULT 0,
  `photo_path` varchar(255) DEFAULT NULL,
  `duration_sec` int(10) UNSIGNED DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `edited_by` int(10) UNSIGNED DEFAULT NULL,
  `edited_at` timestamp NULL DEFAULT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `kind` varchar(20) NOT NULL DEFAULT 'ujian',
  `title` varchar(150) DEFAULT NULL,
  `reviewed` tinyint(1) NOT NULL DEFAULT 0,
  `edited` tinyint(1) NOT NULL DEFAULT 0,
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ;

--
-- Dumping data for table `results`
--

INSERT INTO `results` (`id`, `user_id`, `topic_id`, `section`, `score`, `status`, `answered`, `cheats`, `auto_submitted`, `late`, `abandoned`, `has_photo`, `photo_path`, `duration_sec`, `note`, `edited_by`, `edited_at`, `submitted_at`, `kind`, `title`, `reviewed`, `edited`, `reviewed_by`, `reviewed_at`, `created_at`) VALUES
(1, 3, 1, 'lkpd', 0, 'selesai', 0, 2, 1, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-10-18 14:06:21', 'ujian', NULL, 1, 0, NULL, NULL, '2026-10-18 14:06:21'),
(2, 3, 1, 'lkpd', 0, 'selesai', 0, 2, 1, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-10-18 14:13:56', 'ujian', NULL, 1, 0, NULL, NULL, '2026-10-18 14:13:56');

-- --------------------------------------------------------

--
-- Table structure for table `schedules`
--

CREATE TABLE `schedules` (
  `id` int(10) UNSIGNED NOT NULL,
  `title` varchar(150) NOT NULL,
  `kind` enum('materi','lkpd','latihan','evaluasi','lainnya') NOT NULL DEFAULT 'lainnya',
  `topic_id` int(10) UNSIGNED DEFAULT NULL,
  `start_at` datetime DEFAULT NULL,
  `due_at` datetime NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `schedules`
--

INSERT INTO `schedules` (`id`, `title`, `kind`, `topic_id`, `start_at`, `due_at`, `note`, `created_by`, `created_at`) VALUES
(1, 'Pelajari modul Pengertian Himpunan', 'materi', 1, '2026-10-18 17:39:19', '2026-10-20 08:00:00', 'Baca sampai selesai sebelum mengerjakan LKPD.', NULL, '2026-10-18 10:39:19'),
(2, 'LKPD 1: Kegiatan Himpunan', 'lkpd', 1, '2026-10-18 17:39:19', '2026-10-22 23:59:00', NULL, NULL, '2026-10-18 10:39:19'),
(3, 'Latihan Soal Pengertian Himpunan', 'latihan', 1, NULL, '2026-10-24 16:00:00', NULL, NULL, '2026-10-18 10:39:19'),
(4, 'Evaluasi Pengertian Himpunan', 'evaluasi', 1, NULL, '2026-10-26 12:00:00', 'Kerjakan sendiri tanpa membuka aplikasi lain.', NULL, '2026-10-18 10:39:19');

-- --------------------------------------------------------

--
-- Table structure for table `topics`
--

CREATE TABLE `topics` (
  `id` int(10) UNSIGNED NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `content` text NOT NULL,
  `lkpd_text` text DEFAULT NULL,
  `pass_min` tinyint(3) UNSIGNED NOT NULL DEFAULT 60,
  `time_lkpd` smallint(5) UNSIGNED DEFAULT NULL,
  `time_latihan` smallint(5) UNSIGNED DEFAULT NULL,
  `time_evaluasi` smallint(5) UNSIGNED DEFAULT NULL,
  `position` int(11) NOT NULL DEFAULT 0,
  `shuffle` tinyint(1) NOT NULL DEFAULT 1,
  `prereq_topic_id` int(10) UNSIGNED DEFAULT NULL,
  `prereq_min` tinyint(3) UNSIGNED NOT NULL DEFAULT 60,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `descr` varchar(255) DEFAULT NULL,
  `materi` longtext DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `topics`
--

INSERT INTO `topics` (`id`, `title`, `description`, `content`, `lkpd_text`, `pass_min`, `time_lkpd`, `time_latihan`, `time_evaluasi`, `position`, `shuffle`, `prereq_topic_id`, `prereq_min`, `created_by`, `created_at`, `descr`, `materi`, `sort_order`) VALUES
(1, 'Pengertian Himpunan', 'Anggota, notasi, dan cara menyatakan himpunan.', 'Himpunan adalah kumpulan objek yang didefinisikan dengan jelas. Dinyatakan dengan huruf kapital, anggotanya ditulis di dalam kurung kurawal, contoh A = {1, 2, 3}. Simbol ∈ berarti \"anggota dari\".', 'Kegiatan: 1) Tuliskan 3 contoh kumpulan benda di sekitarmu yang dapat disebut himpunan dan 3 contoh yang bukan himpunan. 2) Nyatakan salah satu himpunanmu dengan notasi kurung kurawal.', 60, NULL, 10, 10, 1, 1, NULL, 60, 2, '2026-10-18 10:39:18', 'Anggota, notasi, dan cara menyatakan himpunan.', 'Himpunan adalah kumpulan objek yang didefinisikan dengan jelas. Dinyatakan dengan huruf kapital, anggotanya ditulis di dalam kurung kurawal, contoh A = {1, 2, 3}. Simbol ∈ berarti \"anggota dari\".', 1),
(2, 'Operasi Himpunan', 'Irisan, gabungan, selisih, dan komplemen.', 'Irisan (A ∩ B) berisi anggota yang ada di A dan B. Gabungan (A ∪ B) berisi semua anggota A atau B. Selisih (A − B) berisi anggota A yang tidak ada di B.', 'Kegiatan: Pilih dua kelompok teman di kelasmu (misalnya yang suka bola dan yang suka basket). Tentukan siapa saja yang masuk irisan dan gabungan kedua kelompok itu.', 60, NULL, 10, 10, 2, 1, 1, 60, 2, '2026-10-18 10:39:18', 'Irisan, gabungan, selisih, dan komplemen.', 'Irisan (A ∩ B) berisi anggota yang ada di A dan B. Gabungan (A ∪ B) berisi semua anggota A atau B. Selisih (A − B) berisi anggota A yang tidak ada di B.', 2),
(3, 'Diagram Venn', 'Menyajikan himpunan dan menyelesaikan soal cerita.', 'Diagram Venn menyajikan himpunan dengan kurva tertutup di dalam persegi panjang (semesta S). Untuk soal cerita: n(A ∪ B) = n(A) + n(B) − n(A ∩ B).', 'Kegiatan: Buat diagram Venn dari data kelasmu (misalnya siswa yang suka Matematika dan IPA), lalu jelaskan arti daerah irisannya.', 60, NULL, 15, 15, 3, 1, 2, 60, 2, '2026-10-18 10:39:18', 'Menyajikan himpunan dan menyelesaikan soal cerita.', 'Diagram Venn menyajikan himpunan dengan kurva tertutup di dalam persegi panjang (semesta S). Untuk soal cerita: n(A ∪ B) = n(A) + n(B) − n(A ∩ B).', 3);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('siswa','guru','admin') NOT NULL DEFAULT 'siswa',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `dob` date DEFAULT NULL,
  `gender` enum('Laki-laki','Perempuan') DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `pass_hash` varchar(255) DEFAULT NULL,
  `class_name` varchar(50) DEFAULT NULL,
  `nisn` varchar(30) DEFAULT NULL,
  `entry_year` smallint(6) DEFAULT NULL,
  `notif_read` int(11) NOT NULL DEFAULT 0,
  `archive_reason` varchar(255) DEFAULT NULL,
  `birth_place` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `status`, `dob`, `gender`, `created_at`, `pass_hash`, `class_name`, `nisn`, `entry_year`, `notif_read`, `archive_reason`, `birth_place`) VALUES
(1, 'Administrator', 'admin@setland.id', '$2y$12$5/eNtXDhZ7z8vEWjR9qRVutML87RjTY2S/Fc4S9erBXU5iKMDnxr2', 'admin', 'active', NULL, NULL, '2026-10-18 10:39:18', '$2y$12$5/eNtXDhZ7z8vEWjR9qRVutML87RjTY2S/Fc4S9erBXU5iKMDnxr2', NULL, NULL, NULL, 0, NULL, NULL),
(2, 'Guru Matematika', 'guru@setland.id', '$2y$12$WnWIL3xmxsP5gtpFHKIW3.s6AfmkbEH2dA5AoQcPRtunu22zUTqRC', 'guru', 'active', NULL, NULL, '2026-10-18 10:39:18', '$2y$12$WnWIL3xmxsP5gtpFHKIW3.s6AfmkbEH2dA5AoQcPRtunu22zUTqRC', NULL, NULL, NULL, 0, NULL, NULL),
(3, 'zafran@gmail.com', 'zafran@gmail.com', '', 'siswa', 'active', '2017-12-05', 'Laki-laki', '2026-10-18 14:04:07', '$2y$10$j6Gw2tik/Mnqq5BA3OGOSO./czh0hrjIWCnX9g8rSavWy3l9febOW', '7A', '12345', 2026, 0, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `videos`
--

CREATE TABLE `videos` (
  `id` int(11) NOT NULL,
  `topic_id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `youtube_id` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_nilai_siswa`
-- (See below for the actual view)
--
CREATE TABLE `v_nilai_siswa` (
`id` int(10) unsigned
,`siswa` varchar(100)
,`email` varchar(150)
,`materi` varchar(150)
,`bagian` enum('lkpd','latihan','evaluasi')
,`nilai` tinyint(3) unsigned
,`status` enum('selesai','menunggu')
,`keluar_halaman` int(10) unsigned
,`terkirim_otomatis` varchar(2)
,`terlambat` varchar(2)
,`waktu` timestamp
);

-- --------------------------------------------------------

--
-- Structure for view `v_nilai_siswa`
--
DROP TABLE IF EXISTS `v_nilai_siswa`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_nilai_siswa`  AS SELECT `r`.`id` AS `id`, `u`.`name` AS `siswa`, `u`.`email` AS `email`, coalesce(`t`.`title`,'(materi dihapus)') AS `materi`, `r`.`section` AS `bagian`, `r`.`score` AS `nilai`, `r`.`status` AS `status`, `r`.`cheats` AS `keluar_halaman`, if(`r`.`auto_submitted`,'Ya','-') AS `terkirim_otomatis`, if(`r`.`late`,'Ya','-') AS `terlambat`, `r`.`submitted_at` AS `waktu` FROM ((`results` `r` join `users` `u` on(`u`.`id` = `r`.`user_id`)) left join `topics` `t` on(`t`.`id` = `r`.`topic_id`)) ORDER BY `r`.`submitted_at` DESC ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `answers`
--
ALTER TABLE `answers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_answers_result` (`result_id`),
  ADD KEY `fk_answers_question` (`question_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_messages_to` (`to_user_id`,`is_read`),
  ADD KEY `fk_msg_from` (`from_user_id`),
  ADD KEY `fk_msg_result` (`result_id`);

--
-- Indexes for table `notifs`
--
ALTER TABLE `notifs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_notifs_user` (`created_by`);

--
-- Indexes for table `notif_reads`
--
ALTER TABLE `notif_reads`
  ADD PRIMARY KEY (`user_id`,`notif_id`),
  ADD KEY `fk_reads_notif` (`notif_id`);

--
-- Indexes for table `questions`
--
ALTER TABLE `questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_questions_topic` (`topic_id`),
  ADD KEY `idx_questions_section` (`topic_id`,`section`);

--
-- Indexes for table `results`
--
ALTER TABLE `results`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_results_user_topic` (`user_id`,`topic_id`),
  ADD KEY `fk_results_topic` (`topic_id`),
  ADD KEY `fk_results_edit` (`edited_by`);

--
-- Indexes for table `schedules`
--
ALTER TABLE `schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_schedules_due` (`due_at`),
  ADD KEY `fk_sched_topic` (`topic_id`),
  ADD KEY `fk_sched_user` (`created_by`);

--
-- Indexes for table `topics`
--
ALTER TABLE `topics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_topics_position` (`position`),
  ADD KEY `fk_topics_user` (`created_by`),
  ADD KEY `fk_topics_prereq` (`prereq_topic_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_email` (`email`);

--
-- Indexes for table `videos`
--
ALTER TABLE `videos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_topic` (`topic_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `answers`
--
ALTER TABLE `answers`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifs`
--
ALTER TABLE `notifs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `questions`
--
ALTER TABLE `questions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `results`
--
ALTER TABLE `results`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `schedules`
--
ALTER TABLE `schedules`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `topics`
--
ALTER TABLE `topics`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `videos`
--
ALTER TABLE `videos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `answers`
--
ALTER TABLE `answers`
  ADD CONSTRAINT `fk_answers_question` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_answers_result` FOREIGN KEY (`result_id`) REFERENCES `results` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `fk_msg_from` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_msg_result` FOREIGN KEY (`result_id`) REFERENCES `results` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_msg_to` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifs`
--
ALTER TABLE `notifs`
  ADD CONSTRAINT `fk_notifs_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `notif_reads`
--
ALTER TABLE `notif_reads`
  ADD CONSTRAINT `fk_reads_notif` FOREIGN KEY (`notif_id`) REFERENCES `notifs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_reads_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `questions`
--
ALTER TABLE `questions`
  ADD CONSTRAINT `fk_questions_topic` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `results`
--
ALTER TABLE `results`
  ADD CONSTRAINT `fk_results_edit` FOREIGN KEY (`edited_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_results_topic` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_results_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `schedules`
--
ALTER TABLE `schedules`
  ADD CONSTRAINT `fk_sched_topic` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_sched_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `topics`
--
ALTER TABLE `topics`
  ADD CONSTRAINT `fk_topics_prereq` FOREIGN KEY (`prereq_topic_id`) REFERENCES `topics` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_topics_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
